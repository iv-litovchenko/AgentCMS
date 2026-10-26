const { parseListPagination, paginateItems, filterItemsByQuery } = require("./contents-list-pagination.js");

function rootFolderToItems(browse) {
  const items = [];
  for (const folder of browse.folders || []) {
    items.push({
      kind: "section",
      id: folder.name,
      title: folder.name,
      ref: folder.folderPath || folder.name,
      parent: null,
      itemCount: folder.itemCount || 0
    });
  }
  const appendFiles = (list, fileKind) => {
    for (const item of list || []) {
      items.push({
        kind: "entry",
        id: item.name,
        title: item.name,
        ref: item.path || item.name,
        parent: null,
        fileKind,
        size: item.size ?? null
      });
    }
  };
  appendFiles(browse.pages, "page");
  appendFiles(browse.images, "image");
  appendFiles(browse.videos, "video");
  appendFiles(browse.audio, "audio");
  appendFiles(browse.other, "file");
  return items;
}

function scanItemsToListItems(scanItems) {
  if (!Array.isArray(scanItems)) return [];
  return scanItems.map((item) => ({
    kind: item.kind === "folder" ? "section" : "entry",
    id: item.name || item.path,
    title: item.name || item.path,
    ref: item.path || item.name,
    parent: item.parent ?? null,
    fileKind: item.fileKind || item.kind
  }));
}

function applyWorkspaceRootListQuery(data, rawQuery = {}) {
  if (!data || rawQuery.legacyFull || rawQuery.listMode === "all") return data;

  const listMode = String(rawQuery.listMode || "entries").trim();
  let items = [];
  if (Array.isArray(data.entries)) {
    items = data.entries.map((entry) => ({
      kind: entry.kind === "folder" ? "section" : "entry",
      id: entry.name,
      title: entry.name,
      ref: entry.path || entry.name,
      parent: null,
      fileKind: entry.fileKind || entry.kind,
      size: entry.size ?? null
    }));
  } else if (Array.isArray(data.items)) {
    items = scanItemsToListItems(data.items);
  }

  if (listMode === "sections") items = items.filter((i) => i.kind === "section");
  else if (listMode === "entries") items = items.filter((i) => i.kind === "entry");

  items = filterItemsByQuery(items, rawQuery);
  const page = paginateItems(items, parseListPagination(rawQuery));

  return {
    exists: data.exists,
    path: data.path,
    depth: data.depth,
    listMode,
    ...page,
    hint: "Use depth=1 default; next page via cursor/offset. Deeper scan: depth=2|all (may be heavy)."
  };
}

module.exports = {
  applyWorkspaceRootListQuery,
  rootFolderToItems
};
