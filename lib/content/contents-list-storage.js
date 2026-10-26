const {
  parseListPagination,
  paginateItems,
  normalizeParentValue,
  filterItemsByQuery
} = require("./contents-list-pagination.js");

function folderDepthUnderParent(folderPath, parentNorm) {
  const p = String(folderPath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!parentNorm) return p.includes("/") ? -1 : 0;
  if (!p.startsWith(`${parentNorm}/`)) return -1;
  const rest = p.slice(parentNorm.length + 1);
  if (!rest || rest.includes("/")) return -1;
  return 1;
}

function fileMatchesParent(file, parentNorm) {
  const fileParent = String(file.parent || ".")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!parentNorm) return !fileParent || fileParent === ".";
  return fileParent === parentNorm;
}

function storagePayloadToItems(payload, listMode) {
  const files = Array.isArray(payload.files) ? payload.files : [];
  const folders = Array.isArray(payload.folders) ? payload.folders : [];
  const nonMarkdown = Array.isArray(payload.nonMarkdownFiles) ? payload.nonMarkdownFiles : [];

  const sections = folders.map((folder) => ({
    kind: "section",
    id: folder.name || folder.path,
    title: folder.name || folder.path,
    ref: folder.path || folder.name,
    parent: (() => {
      const p = String(folder.path || "").replace(/\\/g, "/");
      const idx = p.lastIndexOf("/");
      if (idx <= 0) return null;
      return p.slice(0, idx);
    })()
  }));

  const mdEntries = files.map((file) => ({
    kind: "entry",
    id: file.name?.replace(/\.md$/i, "") || file.relativePath,
    title: file.title || file.name,
    ref: file.relativePath || file.name,
    parent: normalizeParentValue(file.parent) || null,
    updatedAt: file.updatedAt,
    createdAt: file.createdAt
  }));

  const otherEntries = nonMarkdown.map((file) => ({
    kind: "entry",
    id: file.name || file.relativePath,
    title: file.name,
    ref: file.relativePath || file.name,
    parent: normalizeParentValue(file.parent) || null,
    fileKind: "file"
  }));

  if (listMode === "sections") return sections;
  if (listMode === "entries") return [...mdEntries, ...otherEntries];
  return [...sections, ...mdEntries, ...otherEntries];
}

function filterStorageItemsByLevel(items, parentNorm, listMode) {
  return items.filter((item) => {
    if (item.kind === "section") {
      const ref = String(item.ref || "").replace(/\\/g, "/");
      if (!parentNorm) return !ref.includes("/");
      return folderDepthUnderParent(ref, parentNorm) >= 0;
    }
    return fileMatchesParent({ parent: item.parent }, parentNorm);
  });
}

function applyStorageFilesListQuery(payload, rawQuery = {}) {
  if (!payload || rawQuery.listMode === "all" || rawQuery.legacyFull) {
    return payload;
  }

  const listMode = String(rawQuery.listMode || "entries").trim();
  const parentNorm = normalizeParentValue(rawQuery.parent);
  let items = storagePayloadToItems(payload, listMode);
  items = filterStorageItemsByLevel(items, parentNorm, listMode);

  if (listMode === "tree") {
    const { buildTreeItems } = require("./contents-list-records.js");
    const pseudoRecords = items.map((item) => ({
      id: item.id,
      title: item.title,
      relPath: item.ref,
      parent: item.parent,
      isSection: item.kind === "section",
      fileName: item.ref
    }));
    items = buildTreeItems(pseudoRecords, rawQuery);
  } else {
    items = filterItemsByQuery(items, rawQuery);
  }

  const page = paginateItems(items, parseListPagination(rawQuery));

  return {
    exists: payload.exists,
    listMode,
    parent: parentNorm,
    ...page,
    hint: "Paginated slot listing. Full dump: contents_list_full (listMode=all)."
  };
}

async function attachEntryBodySnippets(items, folderAbsolute, maxBodyChars = 800) {
  const cap = Math.max(200, Math.min(20000, Number(maxBodyChars) || 800));
  const fs = require("node:fs/promises");
  const path = require("node:path");
  for (const item of items) {
    if (item.kind !== "entry") continue;
    const rel = String(item.ref || "").replace(/\\/g, "/");
    if (!rel.toLowerCase().endsWith(".md")) continue;
    try {
      const abs = path.join(folderAbsolute, rel);
      const raw = await fs.readFile(abs, "utf-8");
      const match = /^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/m.exec(raw);
      const text = String(match ? match[1] : raw).trim();
      item.bodySnippet = text.length > cap ? `${text.slice(0, cap)}…` : text;
    } catch {
      item.bodySnippet = null;
    }
  }
  return items;
}

module.exports = {
  applyStorageFilesListQuery,
  storagePayloadToItems,
  attachEntryBodySnippets
};
