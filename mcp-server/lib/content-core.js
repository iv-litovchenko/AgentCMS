import { createRequire } from "node:module";
import { getFrontmatterScalar, mergeFrontmatterBlocks, upsertYamlScalarLine } from "./yaml-frontmatter.js";
import { readFileHandler } from "./workspace-fs-tools.js";
import { readTextWindow } from "./content-read-window.js";

const FULL_TEXT_READ_MAX_BYTES = 10_000_000;

const require = createRequire(import.meta.url);
const {
  resolveContentAddress,
  resolveSlotsListAddress,
  splitContentUploadRef
} = require("../../lib/config/content-placement.js");
const {
  slotKeyToStorageFolder,
  isExternalMemorySlot,
  isMediaSlotKey,
  isInternalBundleSlot,
  buildSectionCreateRequest,
  listSectionCapableSlotKeys
} = require("../../lib/config/storage-slot-routing.js");

function slotToFolder(slot) {
  return slotKeyToStorageFolder(slot);
}

function splitMarkdownFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/);
  if (!match) return { properties: "", description: text };
  return {
    properties: match[1] || "",
    description: match[2] || ""
  };
}

function mergeMarkdownFrontmatter(properties, description) {
  const props = String(properties || "").trim();
  const body = String(description || "");
  if (!props) return body;
  return `---\n${props}\n---\n${body}`;
}

async function readMarkdownFull(client, manifestPath, slot, ref) {
  const folder = slotToFolder(slot);
  if (isExternalMemorySlot(slot)) {
    return client.get("/api/external/file", { path: manifestPath, file: ref });
  }
  return client.get("/api/storage/markdown", { path: manifestPath, folder, file: ref });
}

async function writeMarkdownFull(client, manifestPath, slot, ref, content) {
  const folder = slotToFolder(slot);
  if (isExternalMemorySlot(slot)) {
    return client.post("/api/external/file", { path: manifestPath, file: ref, content });
  }
  return client.post("/api/storage/markdown", { path: manifestPath, folder, file: ref, content });
}

async function readInternalContent(client, manifestPath, slot, file) {
  if (slot === "main-single-csv") return client.get("/api/memory/tabular", { path: manifestPath, file });
  if (slot === "todo-single" || slot === "todo") return client.get("/api/todo", { path: manifestPath });
  if (slot === "roadmap-single" || slot === "roadmap") return client.get("/api/roadmap", { path: manifestPath });
  return client.get("/api/memory/internal", { path: manifestPath });
}

async function writeInternalContent(client, manifestPath, slot, content, file) {
  if (slot === "main-single-csv") {
    return client.post("/api/memory/tabular", { path: manifestPath, content, file });
  }
  if (slot === "todo-single" || slot === "todo") return client.post("/api/todo", { path: manifestPath, content });
  if (slot === "roadmap-single" || slot === "roadmap") {
    return client.post("/api/roadmap", { path: manifestPath, content });
  }
  return client.post("/api/memory/internal", { path: manifestPath, content });
}

function resolveArgs(args) {
  return resolveContentAddress(args);
}

function argsWithMdRef(args) {
  const ref = args?.placement ? args.placement.ref : args?.ref;
  if (!ref || args?.placement?.kind === "root") return null;
  const baseName = String(ref).replace(/\/+$/, "").split("/").pop();
  if (!baseName || baseName.includes(".")) return null;
  const mdRef = `${String(ref).replace(/\/+$/, "")}.md`;
  return args.placement ? { ...args, placement: { ...args.placement, ref: mdRef } } : { ...args, ref: mdRef };
}

function isMissingResult(result) {
  return result?.exists === false || result?.meta?.exists === false;
}

/** Agents often pass ref without extension; slot files are addressed with it (note.md). */
export async function withMdRefFallback(args, read) {
  const mdArgs = argsWithMdRef(args);
  if (!mdArgs) return read(args);
  let first;
  let firstError;
  try {
    first = await read(args);
    if (!isMissingResult(first)) return first;
  } catch (error) {
    firstError = error;
  }
  try {
    const second = await read(mdArgs);
    if (isMissingResult(second)) return first ?? second;
    const resolvedRef = mdArgs.placement ? mdArgs.placement.ref : mdArgs.ref;
    return { ...second, refResolved: resolvedRef };
  } catch {
    if (firstError) throw firstError;
    return first;
  }
}

function rejectRootLifecycle(address, operation) {
  if (address.kind === "root") {
    throw new Error(`${operation} is not supported for placement.kind=root (use write_content / read_file tools)`);
  }
}

async function readRootWorkspaceFile(client, args, workspaceFilePath) {
  return readFileHandler(client, {
    path: workspaceFilePath,
    format: args.format,
    maxBytes: args.maxBytes,
    startLine: args.startLine,
    limitLines: args.limitLines,
    offsetBytes: args.offsetBytes
  });
}

async function readRootMarkdownText(client, args, workspaceFilePath) {
  const payload = await readRootWorkspaceFile(client, args, workspaceFilePath);
  const text = typeof payload?.content === "string" ? payload.content : "";
  return { payload, text };
}

export async function contentExists(client, args) {
  const address = resolveArgs(args);
  if (address.kind === "root") {
    try {
      await client.get("/api/workspace/fs/read", { path: address.workspaceFilePath, maxBytes: "1" });
      return { placement: address.placement, exists: true, driver: "root" };
    } catch {
      return { placement: address.placement, exists: false, driver: "root" };
    }
  }
  const { manifestPath, slot, ref } = address;
  return client.get("/api/content/exists", { path: manifestPath, slot, ...(ref ? { ref } : {}) });
}

export async function readContentMeta(client, args) {
  const payload = await getContentMeta(client, args);
  return { part: "meta", ...payload };
}

export async function readContentAll(client, args) {
  const meta = await getContentMeta(client, args);
  const placement = meta.placement ?? resolveArgs(args).placement;
  const address = resolveArgs(args);
  const result = {
    part: "all",
    placement,
    meta
  };

  if (meta.exists === false) {
    return { ...result, body: null, properties: null, schema: null };
  }

  try {
    const bodyPayload = await readContentBody(client, args);
    if (bodyPayload.content !== undefined) {
      const { content, file, placement: _placement, ...bodyWindow } = bodyPayload;
      result.body = content;
      if (file) result.file = file;
      if (bodyWindow.totalLines != null) result.bodyWindow = bodyWindow;
    } else {
      result.body = bodyPayload;
    }
  } catch (error) {
    result.body = null;
    result.bodyError = String(error.message || error);
  }

  const canReadProperties =
    address.kind === "root"
      ? String(address.workspaceFilePath || "").toLowerCase().endsWith(".md")
      : Boolean(address.ref) || isInternalBundleSlot(address.slot);

  if (canReadProperties) {
    try {
      const propsPayload = await readContentProperties(client, args);
      result.properties = propsPayload.content ?? "";
    } catch (error) {
      result.properties = null;
      result.propertiesError = String(error.message || error);
    }
  } else {
    result.properties = null;
  }

  if (address.kind !== "root" && address.ref) {
    try {
      result.schema = await readContentSchema(client, args);
    } catch (error) {
      result.schema = null;
      result.schemaError = String(error.message || error);
    }
  } else {
    result.schema = null;
  }

  return result;
}

export async function getContentMeta(client, args) {
  const address = resolveArgs(args);
  if (address.kind === "root") {
    const payload = await readRootWorkspaceFile(client, { maxBytes: 1 }, address.workspaceFilePath);
    return {
      placement: address.placement,
      driver: "root",
      exists: true,
      file: payload
    };
  }
  const { manifestPath, slot, ref } = address;
  return client.get("/api/content/meta", { path: manifestPath, slot, ...(ref ? { ref } : {}) });
}

function windowArgs(args, fileName) {
  return {
    startLine: args.startLine,
    limitLines: args.limitLines,
    full: args.full === true,
    markdownBody: String(fileName || "").toLowerCase().endsWith(".md")
  };
}

async function readWorkspaceFileWindow(client, args, workspaceFilePath) {
  if (args.format === "base64" || args.offsetBytes != null) {
    return readRootWorkspaceFile(client, args, workspaceFilePath);
  }
  const payload = await readFileHandler(client, { path: workspaceFilePath, maxBytes: FULL_TEXT_READ_MAX_BYTES });
  if (typeof payload?.content !== "string") return payload;
  if (payload.truncated) return readRootWorkspaceFile(client, args, workspaceFilePath);
  return {
    path: workspaceFilePath,
    size: payload.size,
    ...readTextWindow(payload.content, windowArgs(args, workspaceFilePath))
  };
}

export async function readContentBody(client, args) {
  const address = resolveArgs(args);
  const { manifestPath, slot, ref, workspaceFilePath, placement, kind } = address;
  if (kind === "root") {
    const payload = await readWorkspaceFileWindow(client, args, workspaceFilePath);
    return { placement, file: workspaceFilePath, ...payload };
  }
  if (workspaceFilePath) {
    const payload = await readWorkspaceFileWindow(client, args, workspaceFilePath);
    return { placement, file: ref, ...payload };
  }
  if (isInternalBundleSlot(slot)) {
    const payload = await readInternalContent(client, manifestPath, slot);
    return { placement, slot, content: payload?.content ?? "" };
  }
  if (!ref) throw new Error("ref is required for external slots");
  const payload = await readMarkdownFull(client, manifestPath, slot, ref);
  return { placement, file: payload.file, ...readTextWindow(payload.content, windowArgs(args, ref)) };
}

export async function writeContentBinary(client, args) {
  const address = resolveArgs(args);
  const { manifestPath, slot, ref, kind, placement, workspaceFilePath } = address;
  const data = String(args.data || "").trim();
  if (!data) throw new Error("data (base64) is required for binary upload");
  if (kind === "root") {
    return client.post("/api/workspace/fs/upload", {
      path: workspaceFilePath,
      data,
      mimeType: args.mimeType
    });
  }
  if (!ref) throw new Error("placement.ref is required for upload");
  const { fileName, subdir } = splitContentUploadRef(ref);
  const mimeType = args.mimeType;
  const createSubdir = args.createSubdir !== false;
  const libraryFolder =
    kind === "page" ? slotKeyToStorageFolder(slot) : ["files", "assets"].includes(slot) ? slot : slotKeyToStorageFolder(slot);

  if (kind === "channel") {
    return client.post("/api/agent/channels/file", {
      path: manifestPath,
      contextPath: manifestPath,
      fileName,
      data,
      mimeType,
      folder: libraryFolder,
      libraryFolder,
      subdir,
      createSubdir
    });
  }
  if (kind === "media") {
    return client.post("/api/media/file", {
      path: manifestPath,
      contextPath: manifestPath,
      fileName,
      data,
      mimeType,
      folder: libraryFolder,
      libraryFolder,
      subdir,
      createSubdir
    });
  }
  return client.post("/api/media/file", {
    path: manifestPath,
    contextPath: manifestPath,
    fileName,
    data,
    mimeType,
    folder: libraryFolder,
    libraryFolder,
    subdir,
    createSubdir
  });
}

export async function writeContentBody(client, args) {
  if (args.data) return writeContentBinary(client, args);
  const address = resolveArgs(args);
  const { manifestPath, slot, ref, workspaceFilePath, placement, kind } = address;
  const content = args.content;
  if (content == null) throw new Error("content or data (base64) is required");
  if (kind === "root") {
    const mode = args.mode;
    let body = content;
    if (workspaceFilePath.toLowerCase().endsWith(".md")) {
      const { text } = await readRootMarkdownText(client, {}, workspaceFilePath).catch(() => ({ text: "" }));
      const { properties } = splitMarkdownFrontmatter(text);
      body = mergeMarkdownFrontmatter(properties, content);
    }
    await client.post("/api/workspace/fs/write", {
      path: workspaceFilePath,
      content: body,
      ...(mode ? { mode } : {})
    });
    return { placement, path: workspaceFilePath, ok: true };
  }
  if (workspaceFilePath) {
    await client.post("/api/workspace/fs/write", { path: workspaceFilePath, content });
    return { placement, file: ref, ok: true };
  }
  if (isInternalBundleSlot(slot)) {
    return writeInternalContent(client, manifestPath, slot, content);
  }
  if (!ref) throw new Error("ref is required for external slots");
  const existing = await readMarkdownFull(client, manifestPath, slot, ref);
  if (!ref.toLowerCase().endsWith(".md")) {
    return writeMarkdownFull(client, manifestPath, slot, ref, content);
  }
  const { properties } = splitMarkdownFrontmatter(existing.content);
  const merged = mergeMarkdownFrontmatter(properties, content);
  return writeMarkdownFull(client, manifestPath, slot, ref, merged);
}

export async function readContentProperties(client, args) {
  const address = resolveArgs(args);
  const { manifestPath, slot, ref, placement, kind, workspaceFilePath } = address;
  if (kind === "root") {
    const { text } = await readRootMarkdownText(client, args, workspaceFilePath);
    const { properties } = splitMarkdownFrontmatter(text);
    return { placement, content: properties };
  }
  if (isInternalBundleSlot(slot)) {
    const payload = await readInternalContent(client, manifestPath, slot);
    const { properties } = splitMarkdownFrontmatter(payload?.content || "");
    return { placement, slot, content: properties };
  }
  if (!ref) throw new Error("ref is required for external slots");
  const payload = await readMarkdownFull(client, manifestPath, slot, ref);
  const { properties } = splitMarkdownFrontmatter(payload.content || "");
  return { placement, file: payload.file, content: properties };
}

export async function writeContentProperties(client, args) {
  const address = resolveArgs(args);
  const { manifestPath, slot, ref, placement, kind, workspaceFilePath } = address;
  const content = args.content;
  if (kind === "root") {
    const { text } = await readRootMarkdownText(client, {}, workspaceFilePath).catch(() => ({ text: "" }));
    const { properties, description } = splitMarkdownFrontmatter(text);
    const merged = mergeMarkdownFrontmatter(mergeFrontmatterBlocks(properties, content), description);
    await client.post("/api/workspace/fs/write", { path: workspaceFilePath, content: merged });
    return { placement, path: workspaceFilePath, ok: true };
  }
  if (isInternalBundleSlot(slot)) {
    const payload = await readInternalContent(client, manifestPath, slot);
    const { properties, description } = splitMarkdownFrontmatter(payload?.content || "");
    const mergedProps = mergeFrontmatterBlocks(properties, content);
    const merged = mergeMarkdownFrontmatter(mergedProps, description);
    return writeInternalContent(client, manifestPath, slot, merged);
  }
  if (!ref) throw new Error("ref is required for external slots");
  const existing = await readMarkdownFull(client, manifestPath, slot, ref);
  const { properties, description } = splitMarkdownFrontmatter(existing.content || "");
  const mergedProps = mergeFrontmatterBlocks(properties, content);
  const merged = mergeMarkdownFrontmatter(mergedProps, description);
  return writeMarkdownFull(client, manifestPath, slot, ref, merged);
}

export async function readContentProperty(client, args) {
  const address = resolveArgs(args);
  const { manifestPath, slot, ref, placement, kind, workspaceFilePath } = address;
  const key = args.key;
  if (kind === "root") {
    const { text } = await readRootMarkdownText(client, args, workspaceFilePath);
    const { properties } = splitMarkdownFrontmatter(text);
    const { value, exists } = getFrontmatterScalar(properties, key);
    return { placement, key, value, exists };
  }
  if (isInternalBundleSlot(slot)) {
    const payload = await readInternalContent(client, manifestPath, slot);
    const { properties } = splitMarkdownFrontmatter(payload?.content || "");
    const { value, exists } = getFrontmatterScalar(properties, key);
    return { placement, slot, key, value, exists };
  }
  if (!ref) throw new Error("ref is required for external slots");
  const payload = await readMarkdownFull(client, manifestPath, slot, ref);
  const { properties } = splitMarkdownFrontmatter(payload.content || "");
  const { value, exists } = getFrontmatterScalar(properties, key);
  return { placement, file: payload.file, key, value, exists };
}

export async function writeContentProperty(client, args) {
  const address = resolveArgs(args);
  const { manifestPath, slot, ref, kind, workspaceFilePath } = address;
  const { key, value } = args;
  const patchOne = (properties, description) =>
    mergeMarkdownFrontmatter(upsertYamlScalarLine(properties, key, value), description);
  if (kind === "root") {
    const { text } = await readRootMarkdownText(client, {}, workspaceFilePath).catch(() => ({ text: "" }));
    const { properties, description } = splitMarkdownFrontmatter(text);
    const merged = patchOne(properties, description);
    await client.post("/api/workspace/fs/write", { path: workspaceFilePath, content: merged });
    return { placement: address.placement, path: workspaceFilePath, ok: true };
  }
  if (isInternalBundleSlot(slot)) {
    const payload = await readInternalContent(client, manifestPath, slot);
    const { properties, description } = splitMarkdownFrontmatter(payload?.content || "");
    return writeInternalContent(client, manifestPath, slot, patchOne(properties, description));
  }
  if (!ref) throw new Error("ref is required for external slots");
  const existing = await readMarkdownFull(client, manifestPath, slot, ref);
  const { properties, description } = splitMarkdownFrontmatter(existing.content || "");
  return writeMarkdownFull(client, manifestPath, slot, ref, patchOne(properties, description));
}

export async function readContentSchema(client, args) {
  const address = resolveArgs(args);
  rejectRootLifecycle(address, "read_content_schema");
  const { manifestPath, slot, ref } = address;
  const mode = args.mode;
  return client.get("/api/content/schema", { path: manifestPath, slot, ref, ...(mode ? { mode } : {}) });
}

export async function writeContentSchema(client, args) {
  const address = resolveArgs(args);
  rejectRootLifecycle(address, "write_content_schema");
  const { manifestPath, slot, ref } = address;
  return client.post("/api/content/schema", { path: manifestPath, slot, ref, content: args.content });
}

export async function createContent(client, args) {
  const address = resolveArgs(args);
  rejectRootLifecycle(address, "create_content");
  const { manifestPath, slot } = address;
  const {
    awnType,
    title,
    displayName,
    slug,
    parent,
    body,
    fileExtension,
    fileMask,
    fields,
    source,
    author,
    status
  } = args;
  if (isInternalBundleSlot(slot)) {
    throw new Error(`Cannot create_content in internal slot "${slot}". Use write_content.`);
  }
  const folder = slotToFolder(slot);
  const isCategory = awnType === "awn.content.category" || awnType === "awn.content.record.category";
  if (isCategory) {
    const { endpoint, body: requestBody } = buildSectionCreateRequest(slot, {
      path: manifestPath,
      title: title || displayName,
      displayName: displayName || title,
      slug,
      parent
    });
    return client.post(endpoint, requestBody);
  }
  return client.post("/api/storage/file/create", {
    path: manifestPath,
    folder,
    title: title || displayName,
    displayName: displayName || title,
    slug,
    parent,
    body,
    fileExtension,
    extension: fileExtension,
    fileMask,
    mask: fileMask,
    fields,
    source,
    author,
    status
  });
}

export async function importContentFromUrl(client, args) {
  const address = resolveArgs(args);
  const { url } = args;
  if (address.kind === "root") {
    return client.post("/api/workspace/fs/import", { path: address.workspaceFilePath, url });
  }
  const { manifestPath, slot } = address;
  const { fileName, mimeType, parent, createSubdir } = args;
  if (isInternalBundleSlot(slot)) {
    throw new Error(`Cannot import_content_from_url to internal slot "${slot}". Use write_content for text slots.`);
  }
  return client.post("/api/media/file/import", {
    path: manifestPath,
    url,
    fileName,
    mimeType,
    slot: slotToFolder(slot),
    libraryFolder: slotToFolder(slot),
    folder: slotToFolder(slot),
    parent: parent || "",
    subdir: parent || "",
    createSubdir: Boolean(createSubdir)
  });
}

export async function renameContent(client, args) {
  const address = resolveArgs(args);
  rejectRootLifecycle(address, "rename_content");
  const { manifestPath, slot, ref } = address;
  const { displayName, title } = args;
  if (isInternalBundleSlot(slot)) throw new Error("rename_content is not supported for internal slots.");
  const name = displayName || title;
  if (!name) throw new Error("displayName or title is required");
  if (isExternalMemorySlot(slot)) {
    return client.post("/api/external/file/rename", { path: manifestPath, file: ref, title: name });
  }
  if (isMediaSlotKey(slot)) {
    return client.post("/api/media/file/rename", { path: manifestPath, file: ref, title: name });
  }
  return client.post("/api/storage/file/rename", {
    path: manifestPath,
    folder: slotToFolder(slot),
    file: ref,
    title: name
  });
}

export async function moveContent(client, args) {
  const address = resolveArgs(args);
  rejectRootLifecycle(address, "move_content");
  const { manifestPath, slot, ref } = address;
  const { targetPath, targetRef, targetParent } = args;
  if (isInternalBundleSlot(slot)) throw new Error("move_content is not supported for internal slots.");
  if (isExternalMemorySlot(slot)) {
    return client.post("/api/external/file/move", {
      path: manifestPath,
      file: ref,
      targetPath,
      targetFile: targetRef || targetParent
    });
  }
  if (isMediaSlotKey(slot)) {
    return client.post("/api/media/file/move", {
      path: manifestPath,
      file: ref,
      targetPath,
      targetFile: targetRef
    });
  }
  throw new Error(`move_content for slot "${slot}" is not supported yet. Supported: memory/main, media, assets.`);
}

export async function listContentItems(client, args) {
  if (args.placement?.kind === "root") {
    const rawPath = String(args.placement.path || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const slash = rawPath.lastIndexOf("/");
    const folder = slash === -1 ? "" : rawPath.slice(0, slash);
    const depth = args.depth != null ? String(args.depth) : "1";
    const data = await client.get("/api/workspace/fs/list", { path: folder, depth });
    return {
      placement: { kind: "root", path: folder || "." },
      ...data,
      hint: "Directory listing; open files with placement.kind=root and path=<file>."
    };
  }
  const slot = String(args.slot || args.placement?.slot || "inbox").trim();
  const listAddr = args.placement
    ? resolveSlotsListAddress({ placement: { kind: args.placement.kind, path: args.placement.path } })
    : resolveSlotsListAddress({ path: args.path });
  const { manifestPath, kind } = listAddr;
  const folder =
    kind === "page"
      ? slotKeyToStorageFolder(slot)
      : ["files", "assets"].includes(slot)
        ? slot
        : slotKeyToStorageFolder(slot);

  if (kind === "channel") {
    if (slot === "files" || slot === "assets") {
      const data = await client.get("/api/agent/channels/items", { path: manifestPath, folder });
      return { placement: { kind, path: manifestPath, slot }, ...data };
    }
    const data = await client.get("/api/storage/files", { path: manifestPath, folder });
    return { placement: { kind, path: manifestPath, slot }, ...data };
  }
  if (kind === "media") {
    const data = await client.get("/api/media", { path: manifestPath, folder });
    const { content, ...lean } = data || {};
    return { placement: { kind, path: manifestPath, slot }, ...lean };
  }
  const data = await client.get("/api/storage/files", { path: manifestPath, folder });
  return { placement: { kind, path: manifestPath, slot }, ...data };
}

export async function deleteContent(client, args) {
  const address = resolveArgs(args);
  rejectRootLifecycle(address, "delete_content");
  const { manifestPath, slot, ref } = address;
  if (isInternalBundleSlot(slot)) throw new Error("delete_content is not supported for internal slots.");
  if (isExternalMemorySlot(slot)) return client.delete("/api/external/file", { path: manifestPath, file: ref });
  if (isMediaSlotKey(slot)) return client.delete("/api/media/file", { path: manifestPath, file: ref });
  return client.delete("/api/storage/file", { path: manifestPath, folder: slotToFolder(slot), file: ref });
}

export { listSectionCapableSlotKeys };
