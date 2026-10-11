import { createRequire } from "node:module";
import { getFrontmatterScalar, mergeFrontmatterBlocks, upsertYamlScalarLine } from "./yaml-frontmatter.js";
import { readFileHandler } from "./workspace-fs-tools.js";

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

export async function contentExists(client, args) {
  const { manifestPath, slot, ref } = resolveArgs(args);
  return client.get("/api/content/exists", { path: manifestPath, slot, ...(ref ? { ref } : {}) });
}

export async function getContentMeta(client, args) {
  const { manifestPath, slot, ref } = resolveArgs(args);
  return client.get("/api/content/meta", { path: manifestPath, slot, ...(ref ? { ref } : {}) });
}

export async function readContentBody(client, args) {
  const address = resolveArgs(args);
  const { manifestPath, slot, ref, workspaceFilePath, placement } = address;
  if (workspaceFilePath) {
    const payload = await readFileHandler(client, { path: workspaceFilePath });
    return { placement, file: ref, content: payload?.content ?? payload?.text ?? "" };
  }
  if (isInternalBundleSlot(slot)) {
    const payload = await readInternalContent(client, manifestPath, slot);
    return { placement, slot, content: payload?.content ?? "" };
  }
  if (!ref) throw new Error("ref is required for external slots");
  const payload = await readMarkdownFull(client, manifestPath, slot, ref);
  if (!ref.toLowerCase().endsWith(".md")) return { placement, file: payload.file, content: payload.content };
  const { description } = splitMarkdownFrontmatter(payload.content);
  return { placement, file: payload.file, content: description };
}

export async function writeContentBinary(client, args) {
  const address = resolveArgs(args);
  const { manifestPath, slot, ref, kind, placement } = address;
  const data = String(args.data || "").trim();
  if (!data) throw new Error("data (base64) is required for binary upload");
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
  const { manifestPath, slot, ref, workspaceFilePath, placement } = address;
  const content = args.content;
  if (content == null) throw new Error("content or data (base64) is required");
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
  const { manifestPath, slot, ref, placement } = address;
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
  const { manifestPath, slot, ref, placement } = address;
  const content = args.content;
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
  const { manifestPath, slot, ref, placement } = address;
  const key = args.key;
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
  const { manifestPath, slot, ref } = address;
  const { key, value } = args;
  const patchOne = (properties, description) =>
    mergeMarkdownFrontmatter(upsertYamlScalarLine(properties, key, value), description);
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
  const { manifestPath, slot, ref } = resolveArgs(args);
  const mode = args.mode;
  return client.get("/api/content/schema", { path: manifestPath, slot, ref, ...(mode ? { mode } : {}) });
}

export async function writeContentSchema(client, args) {
  const { manifestPath, slot, ref } = resolveArgs(args);
  return client.post("/api/content/schema", { path: manifestPath, slot, ref, content: args.content });
}

export async function createContent(client, args) {
  const { manifestPath, slot } = resolveArgs(args);
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
  const { manifestPath, slot } = resolveArgs(args);
  const { url, fileName, mimeType, parent, createSubdir } = args;
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
  const { manifestPath, slot, ref } = resolveArgs(args);
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
  const { manifestPath, slot, ref } = resolveArgs(args);
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
  const { manifestPath, slot, ref } = resolveArgs(args);
  if (isInternalBundleSlot(slot)) throw new Error("delete_content is not supported for internal slots.");
  if (isExternalMemorySlot(slot)) return client.delete("/api/external/file", { path: manifestPath, file: ref });
  if (isMediaSlotKey(slot)) return client.delete("/api/media/file", { path: manifestPath, file: ref });
  return client.delete("/api/storage/file", { path: manifestPath, folder: slotToFolder(slot), file: ref });
}

export { listSectionCapableSlotKeys };
