import { createRequire } from "node:module";
import { getFrontmatterScalar, mergeFrontmatterBlocks, upsertYamlScalarLine } from "./yaml-frontmatter.js";
import { readFileHandler } from "./workspace-fs-tools.js";
import { hashText, readTextWindow } from "./content-read-window.js";
import { applyBodyEdit, assertExpectedHash, ContentConflictError } from "./content-write-edit.js";
import { planMergeFile, planSplitFiles } from "./content-merge-split.js";

const FULL_TEXT_READ_MAX_BYTES = 10_000_000;

const require = createRequire(import.meta.url);
const {
  resolveContentAddress,
  resolveSlotsListAddress,
  splitContentUploadRef,
  isStoragePageLikeKind,
  formatPublicPlacement,
  logicalPathFromManifest
} = require("../../lib/config/content-placement.js");
const {
  slotKeyToStorageFolder,
  isExternalMemorySlot,
  isMediaSlotKey,
  isInternalBundleSlot,
  buildSectionCreateRequest,
  listSectionCapableSlotKeys,
  normalizeStorageSlotKey
} = require("../../lib/config/storage-slot-routing.js");
const { isRepositoryCloneRootSlot } = require("../../lib/config/repository-clone-placement.js");
const { assertMcpBinaryBase64UploadWithinLimit } = require("../../lib/media/base64-upload.js");

export function absolutizeCmsUrl(client, urlPath) {
  const raw = String(urlPath || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return new URL(raw.startsWith("/") ? raw : `/${raw}`, `${client.baseUrl}/`).href;
}

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
  return client.get("/api/memory/internal", { path: manifestPath });
}

async function writeInternalContent(client, manifestPath, slot, content, file) {
  if (slot === "main-single-csv") {
    return client.post("/api/memory/tabular", { path: manifestPath, content, file });
  }
  if (slot === "todo-single" || slot === "todo") return client.post("/api/todo", { path: manifestPath, content });
  return client.post("/api/memory/internal", { path: manifestPath, content });
}

function resolveArgs(args) {
  return resolveContentAddress(args);
}

function isDatabaseDataSlot(address) {
  return address.kind === "database" && String(address.slot || "").trim() === "data";
}

function databaseRecordRefFromRef(ref) {
  const raw = String(ref || "").trim().replace(/\\/g, "/");
  if (!raw) throw new Error("placement.ref is required");
  return raw.toLowerCase().endsWith(".md") ? raw.slice(0, -3) : raw;
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
    throw new Error(`${operation} is not supported for placement.kind=root (use read_content / write_content)`);
  }
}

function requireRef(address, operation) {
  if (!address.ref) {
    throw new Error(`${operation}: placement.ref is required (file in slot, e.g. folder/note.md)`);
  }
}

function assertMarkdownNoteSlot(address, operation) {
  rejectRootLifecycle(address, operation);
  if (isInternalBundleSlot(address.slot)) {
    throw new Error(`${operation} is not supported for internal slot "${address.slot}".`);
  }
  if (isDatabaseDataSlot(address)) {
    throw new Error(`${operation} is not supported for database data slot.`);
  }
}

function assertBinaryContentAddress(address, operation) {
  if (isInternalBundleSlot(address.slot)) {
    throw new Error(`${operation} is not supported for internal slot "${address.slot}".`);
  }
  if (address.kind !== "root") {
    requireRef(address, operation);
    const ref = String(address.ref || "").toLowerCase();
    if (ref.endsWith(".md")) {
      throw new Error(
        `${operation}: .md is text — use read_content / write_content. Example ref: assets/pasted/photo.png`
      );
    }
  }
}

function requireMdRef(ref, operation) {
  const name = String(ref || "").trim();
  if (!name.toLowerCase().endsWith(".md")) {
    throw new Error(`${operation}: only .md markdown files are supported (${name || "missing ref"})`);
  }
}

async function readMarkdownFileParts(client, address) {
  const { manifestPath, slot, ref } = address;
  requireRef(address, "read");
  const payload = await readMarkdownFull(client, manifestPath, slot, ref);
  const { properties, description } = splitMarkdownFrontmatter(payload.content || "");
  return {
    ref,
    file: payload.file,
    properties,
    body: description,
    raw: payload.content ?? ""
  };
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

function usesWorkspaceFsContentPath(address) {
  if (address.kind === "root") return Boolean(address.workspaceFilePath);
  return (
    address.kind === "repository" &&
    isRepositoryCloneRootSlot(address.slot) &&
    Boolean(address.workspaceFilePath)
  );
}

export async function contentExists(client, args) {
  const address = resolveArgs(args);
  if (usesWorkspaceFsContentPath(address)) {
    try {
      await client.get("/api/workspace/fs/read", { path: address.workspaceFilePath, maxBytes: "1" });
      return {
        placement: address.placement,
        exists: true,
        driver: address.kind === "repository" ? "repository-clone" : "root"
      };
    } catch {
      return {
        placement: address.placement,
        exists: false,
        driver: address.kind === "repository" ? "repository-clone" : "root"
      };
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

  const canReadProperties = usesWorkspaceFsContentPath(address)
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
  if (usesWorkspaceFsContentPath(address)) {
    const payload = await readRootWorkspaceFile(client, { maxBytes: 1 }, address.workspaceFilePath);
    return {
      placement: address.placement,
      driver: address.kind === "repository" ? "repository-clone" : "root",
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

export async function readContentBinary(client, args) {
  const address = resolveArgs(args);
  assertBinaryContentAddress(address, "read_content_binary");
  const result = await readContentBody(client, {
    ...args,
    part: "body",
    format: "base64",
    full: true
  });
  if (result.format === "base64" && typeof result.data === "string") {
    return {
      placement: result.placement,
      ...(result.file ? { file: result.file } : {}),
      ...(result.path ? { path: result.path } : {}),
      ...result
    };
  }
  throw new Error(
    "read_content_binary: could not read as binary (check ref/path). Text markdown → read_content."
  );
}

export async function writeContentBinary(client, args) {
  const address = resolveArgs(args);
  assertBinaryContentAddress(address, "write_content_binary");
  const { manifestPath, slot, ref, kind, placement, workspaceFilePath } = address;
  const data = String(args.data || "").trim();
  if (!data) throw new Error("data (base64) is required for write_content_binary");
  assertMcpBinaryBase64UploadWithinLimit(data);
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
  const libraryFolder = isStoragePageLikeKind(kind)
    ? slotKeyToStorageFolder(slot)
    : ["files", "assets"].includes(slot)
      ? slot
      : slotKeyToStorageFolder(slot);

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

function isNotFoundError(error) {
  return /\((404)\)/.test(String(error?.message || error));
}

/** Raw text + saver for one content file; raw=null when a workspace file does not exist yet. */
async function openContentText(client, address) {
  const { manifestPath, slot, ref, workspaceFilePath, kind } = address;
  if (kind === "root" || workspaceFilePath) {
    let raw = null;
    try {
      const payload = await readFileHandler(client, { path: workspaceFilePath, maxBytes: FULL_TEXT_READ_MAX_BYTES });
      if (payload?.exists === false) raw = null;
      else if (typeof payload?.content !== "string") throw new Error(`Not a text file: ${workspaceFilePath}`);
      else if (payload.truncated) throw new Error(`File too large to edit as text: ${workspaceFilePath}`);
      else raw = payload.content;
    } catch (error) {
      if (!isNotFoundError(error)) throw error;
    }
    return {
      raw,
      markdownBody: workspaceFilePath.toLowerCase().endsWith(".md"),
      save: (text) => client.post("/api/workspace/fs/write", { path: workspaceFilePath, content: text })
    };
  }
  if (isInternalBundleSlot(slot)) {
    const payload = await readInternalContent(client, manifestPath, slot);
    return {
      raw: payload?.content ?? "",
      markdownBody: false,
      save: (text) => writeInternalContent(client, manifestPath, slot, text)
    };
  }
  if (!ref) throw new Error("ref is required for external slots");
  const payload = await readMarkdownFull(client, manifestPath, slot, ref);
  return {
    raw: payload.content ?? "",
    markdownBody: ref.toLowerCase().endsWith(".md"),
    save: (text) => writeMarkdownFull(client, manifestPath, slot, ref, text)
  };
}

export async function writeContentBody(client, args) {
  if (args.data) return writeContentBinary(client, args);
  const address = resolveArgs(args);
  const mode = args.mode || "replace";
  if (args.content == null && mode !== "patch") throw new Error("content or data (base64) is required");

  const file = await openContentText(client, address);
  if (file.raw == null && !["replace", "append", "prepend"].includes(mode)) {
    throw new Error(`File does not exist: ${address.workspaceFilePath} (mode=${mode} needs an existing file)`);
  }
  const previousHash = file.raw == null ? null : assertExpectedHash(file.raw, args);
  if (file.raw == null && args.expectedHash) throw new ContentConflictError(args.expectedHash, "none (file missing)");

  const edit = applyBodyEdit(file.raw ?? "", { ...args, mode }, { markdownBody: file.markdownBody });
  await file.save(edit.text);
  const saved = await openContentText(client, address).catch(() => null);
  return {
    placement: address.placement,
    ...(address.ref ? { file: address.ref } : {}),
    ...(address.kind === "root" ? { path: address.workspaceFilePath } : {}),
    ok: true,
    mode,
    created: file.raw == null,
    startLine: edit.startLine,
    endLine: edit.endLine,
    totalLines: edit.totalLines,
    previousHash,
    hash: hashText(saved?.raw ?? edit.text)
  };
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

async function assertRootFileMissing(client, workspaceFilePath) {
  try {
    const payload = await readFileHandler(client, { path: workspaceFilePath, maxBytes: 1 });
    if (payload?.exists === false) return;
    throw new Error(`content_create: file already exists: ${workspaceFilePath} (use content_write)`);
  } catch (error) {
    if (isNotFoundError(error)) return;
    throw error;
  }
}

export async function createContent(client, args) {
  const address = resolveArgs(args);
  if (address.kind === "root") {
    const relPath = address.workspaceFilePath;
    if (!relPath) throw new Error("content_create: placement.path is required for kind=root");
    await assertRootFileMissing(client, relPath);
    const text = args.body ?? args.content ?? "";
    return writeContentBody(client, {
      ...args,
      placement: address.placement,
      part: "body",
      mode: "replace",
      content: text
    });
  }
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
  const isCategory = awnType === "awn.content.category" || awnType === "awn.content.record.category";
  if (isDatabaseDataSlot(address)) {
    const isSection = Boolean(args.isSection) || isCategory;
    return client.post("/api/awn-databases/records", {
      store: address.logicalPath,
      name: displayName || title,
      title: title || displayName,
      slug,
      id: slug,
      parent,
      body,
      fileExtension,
      extension: fileExtension,
      isSection
    });
  }
  const folder = slotToFolder(slot);
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
  const result = await client.post("/api/storage/file/create", {
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
  const refFile = result?.file ? String(result.file).replace(/\\/g, "/") : "";
  const refName = refFile ? refFile.split("/").pop() : "";
  const canonicalSlot = normalizeStorageSlotKey(slot);
  return {
    ...result,
    placement: {
      ...address.placement,
      slot: canonicalSlot,
      ...(refName ? { ref: refName } : {})
    }
  };
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
    throw new Error(`Cannot write_content_binary_from_url to internal slot "${slot}". Use write_content for text slots.`);
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

export async function getContentBinaryUrl(client, args) {
  const address = resolveArgs(args);
  assertBinaryContentAddress(address, "get_content_binary_url");
  const workspaceFilePath = address.workspaceFilePath;
  if (!workspaceFilePath) {
    throw new Error("get_content_binary_url: could not resolve workspace path from placement");
  }
  const payload = await readFileHandler(client, {
    path: workspaceFilePath,
    format: "base64",
    maxBytes: 4096,
    offsetBytes: 0
  });
  if (payload?.format !== "base64") {
    throw new Error("get_content_binary_url: not a binary file (use get_workspace_url_page_preview for .md pages)");
  }
  let previewPath = payload.previewUrl;
  if (previewPath && args.thumb !== false && String(previewPath).includes("/api/workspace/folder/file")) {
    const parsed = new URL(previewPath, `${client.baseUrl}/`);
    parsed.searchParams.set("thumb", "1");
    if (args.max != null) parsed.searchParams.set("max", String(args.max));
    previewPath = `${parsed.pathname}?${parsed.searchParams.toString()}`;
  }
  return {
    placement: address.placement,
    path: workspaceFilePath,
    url: absolutizeCmsUrl(client, previewPath),
    previewPath,
    mimeType: payload.mimeType,
    size: payload.size,
    name: payload.name
  };
}

function resolveWorkspaceMarkdownPath(args) {
  const direct = String(args.path || "").trim();
  if (direct) {
    if (!direct.toLowerCase().endsWith(".md")) {
      throw new Error("get_workspace_url_page_preview: path must be a .md file");
    }
    return direct.replace(/\\/g, "/");
  }
  const address = resolveArgs(args);
  const workspaceFilePath = address.workspaceFilePath;
  if (!workspaceFilePath) {
    throw new Error("get_workspace_url_page_preview: provide path or placement with .md ref");
  }
  if (!workspaceFilePath.toLowerCase().endsWith(".md")) {
    throw new Error("get_workspace_url_page_preview: only .md pages (manifest, slot notes, records)");
  }
  return workspaceFilePath;
}

export async function getWorkspaceUrlPagePreview(client, args) {
  const wsPath = resolveWorkspaceMarkdownPath(args);
  const payload = await client.get("/api/workspace/folder/page", { file: wsPath });
  const page = payload?.page || {};
  const openPayload = await client.get("/api/agent/page-url", {
    path: wsPath,
    view: args.view || undefined,
    forceView: args.forceView ? true : undefined
  });
  let placement;
  if (!args.path) {
    placement = resolveArgs(args).placement;
  }
  return {
    path: wsPath,
    ...(placement ? { placement } : {}),
    title: page.title ?? null,
    excerpt: page.excerpt ?? "",
    previewUrl: absolutizeCmsUrl(client, page.previewUrl),
    previewPath: page.previewUrl ?? null,
    openUrl: openPayload.url ?? null,
    pathname: openPayload.pathname ?? null,
    status: page.status ?? null,
    tags: page.tags ?? null,
    updatedAt: page.updatedAt ?? null,
    isManifest: page.isManifest ?? false
  };
}

export async function writeContentBinaryFromUrl(client, args) {
  const address = resolveArgs(args);
  if (address.kind === "root") {
    throw new Error(
      "write_content_binary_from_url: use placement (kind + path + slot + ref), not placement.kind=root"
    );
  }
  const ref = String(address.ref || args.fileName || "").trim();
  if (!ref) {
    throw new Error("write_content_binary_from_url: placement.ref or fileName is required (e.g. assets/pasted/photo.png)");
  }
  assertBinaryContentAddress({ ...address, ref }, "write_content_binary_from_url");
  if (!args.url) throw new Error("url is required");
  return importContentFromUrl(client, { ...args, fileName: args.fileName || ref });
}

export async function renameContent(client, args) {
  const address = resolveArgs(args);
  if (address.kind === "root") {
    const relPath = address.workspaceFilePath;
    const newName = args.displayName || args.title || args.newName;
    if (!relPath) throw new Error("rename_content: placement.path is required");
    if (!newName) throw new Error("displayName, title, or newName is required");
    return client.post("/api/workspace/folder/rename", { path: relPath, newName });
  }
  const { manifestPath, slot, ref } = address;
  const { displayName, title } = args;
  if (isInternalBundleSlot(slot)) throw new Error("rename_content is not supported for internal slots.");
  requireRef(address, "rename_content");
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
  if (address.kind === "root") {
    const relPath = address.workspaceFilePath;
    if (!relPath) throw new Error("move_content: placement.path is required");
    const parentPath = args.targetParent ?? args.targetPath ?? args.targetFolder;
    if (parentPath === undefined || parentPath === null) {
      throw new Error("move_content: targetParent or targetPath is required for placement.kind=root");
    }
    return client.post("/api/workspace/folder/move", { path: relPath, parentPath });
  }
  const { manifestPath, slot, ref } = address;
  const { targetPath, targetRef, targetParent } = args;
  if (isInternalBundleSlot(slot)) throw new Error("move_content is not supported for internal slots.");
  requireRef(address, "move_content");
  if (isDatabaseDataSlot(address)) {
    const record = databaseRecordRefFromRef(ref);
    const payload = { store: address.logicalPath, record };
    if (args.slug) payload.slug = args.slug;
    if (targetParent !== undefined) payload.parent = targetParent;
    else if (targetRef) payload.slug = databaseRecordRefFromRef(targetRef);
    return client.post("/api/awn-databases/records/rename", payload);
  }
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
  const folder = slotToFolder(slot);
  const targetFolder = String(args.targetFolder || folder).trim() || folder;
  return client.post("/api/storage/file/move", {
    path: manifestPath,
    folder,
    file: ref,
    targetFolder,
    targetFile: targetRef || targetParent
  });
}

export {
  listContentItems,
  listContentEntries,
  countContentEntries,
  listContentSections,
  listContentTree,
  listContentPreview,
  listContentItemsFull
} from "./content-list.js";

export async function deleteContent(client, args) {
  const address = resolveArgs(args);
  if (address.kind === "root") {
    const relPath = address.workspaceFilePath;
    if (!relPath) throw new Error("delete_content: placement.path is required");
    return client.post("/api/workspace/folder/delete", { paths: [relPath] });
  }
  const { manifestPath, slot, ref } = address;
  if (isInternalBundleSlot(slot)) throw new Error("delete_content is not supported for internal slots.");
  requireRef(address, "delete_content");
  if (isDatabaseDataSlot(address)) {
    const record = databaseRecordRefFromRef(ref);
    return client.delete("/api/awn-databases/records", { store: address.logicalPath, record });
  }
  if (isExternalMemorySlot(slot)) return client.delete("/api/external/file", { path: manifestPath, file: ref });
  if (isMediaSlotKey(slot)) return client.delete("/api/media/file", { path: manifestPath, file: ref });
  return client.delete("/api/storage/file", { path: manifestPath, folder: slotToFolder(slot), file: ref });
}

export async function splitContent(client, args) {
  const address = resolveArgs(args);
  assertMarkdownNoteSlot(address, "split_content");
  requireRef(address, "split_content");
  requireMdRef(address.ref, "split_content");

  const { properties, body } = await readMarkdownFileParts(client, address);
  const includePreamble = args.includePreamble !== false;
  const planned = planSplitFiles({
    properties,
    sourceRef: address.ref,
    body,
    includePreamble
  });

  for (const file of planned) {
    const exists = await contentExists(client, {
      ...args,
      placement: { ...address.placement, ref: file.ref }
    });
    if (exists?.exists) {
      throw new Error(`split_content: target already exists: ${file.ref}`);
    }
  }

  const created = [];
  for (const file of planned) {
    await writeMarkdownFull(client, address.manifestPath, address.slot, file.ref, file.fullMarkdown);
    created.push({ ref: file.ref, title: file.title });
  }

  const deleteSource = args.deleteSource !== false;
  if (deleteSource) {
    await deleteContent(client, args);
  }

  return {
    placement: address.placement,
    sourceRef: address.ref,
    splitBy: "h1",
    created,
    deletedSource: deleteSource
  };
}

export async function mergeContent(client, args) {
  const refs = [...new Set((args.refs || []).map((ref) => String(ref).trim()).filter(Boolean))];
  if (refs.length < 2) {
    throw new Error("merge_content: refs must list at least 2 distinct .md files");
  }

  const baseAddress = resolveArgs(args);
  assertMarkdownNoteSlot(baseAddress, "merge_content");

  const targetRef = String(args.targetRef || refs[0]).trim();
  if (!targetRef) throw new Error("merge_content: targetRef is required");
  if (!refs.includes(targetRef)) {
    throw new Error("merge_content: targetRef must be one of refs (merged note keeps target frontmatter)");
  }

  for (const ref of refs) requireMdRef(ref, "merge_content");

  const records = [];
  for (const ref of refs) {
    const itemAddress = resolveArgs({
      ...args,
      placement: { ...baseAddress.placement, ref }
    });
    records.push(await readMarkdownFileParts(client, itemAddress));
  }

  const targetRecord = records.find((row) => row.ref === targetRef);
  const bodies = refs.map((ref) => records.find((row) => row.ref === ref).body);
  const otherProperties = records.filter((row) => row.ref !== targetRef).map((row) => row.properties);
  const { fullMarkdown } = planMergeFile({
    targetProperties: targetRecord.properties,
    bodies,
    mergeTags: args.mergeTags !== false,
    otherPropertiesList: otherProperties
  });

  await writeMarkdownFull(client, baseAddress.manifestPath, baseAddress.slot, targetRef, fullMarkdown);

  const deletedSources = [];
  if (args.deleteSources) {
    for (const ref of refs) {
      if (ref === targetRef) continue;
      await deleteContent(client, {
        ...args,
        placement: { ...baseAddress.placement, ref }
      });
      deletedSources.push(ref);
    }
  }

  return {
    placement: baseAddress.placement,
    targetRef,
    mergedRefs: refs,
    mergeTags: args.mergeTags !== false,
    deletedSources
  };
}

export { listSectionCapableSlotKeys };
