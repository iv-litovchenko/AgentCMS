const {
  parseListPagination,
  paginateItems,
  normalizeParentValue,
  filterItemsByQuery
} = require("./contents-list-pagination.js");

function recordToListItem(record) {
  return {
    kind: record.isSection ? "section" : "entry",
    id: record.id,
    title: record.title || record.id,
    ref: record.relPath || record.fileName || record.id,
    parent: record.parent ?? null,
    isSection: Boolean(record.isSection),
    missingManifest: Boolean(record.missingManifest),
    fileName: record.fileName,
    fileExtension: record.fileExtension
  };
}

function recordsUnderParent(records, parentNorm) {
  return records.filter((record) => {
    const p = normalizeParentValue(record.parent);
    if (parentNorm === null) return p === null;
    return p === parentNorm || record.parent === parentNorm;
  });
}

function buildTreeItems(records, { parent, maxDepth }) {
  const depthCap = Math.max(1, Math.min(10, Number(maxDepth) || 3));
  const parentNorm = normalizeParentValue(parent);
  const all = records.map(recordToListItem);
  const byParent = new Map();
  for (const item of all) {
    const key = normalizeParentValue(item.parent) || "";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(item);
  }

  const roots = parentNorm
    ? all.filter((item) => item.id === parentNorm || item.ref === parentNorm)
    : byParent.get("") || byParent.get(null) || [];

  const startNodes = parentNorm
    ? recordsUnderParent(
        records.map((r, i) => ({ ...r, ...all[i] })),
        parentNorm
      ).map(recordToListItem)
    : (byParent.get("") || []).concat(
        all.filter((item) => item.kind === "section" && normalizeParentValue(item.parent) === null)
      );

  const uniqueStart = [];
  const seen = new Set();
  for (const n of startNodes.length ? startNodes : roots) {
    const k = n.ref || n.id;
    if (seen.has(k)) continue;
    seen.add(k);
    uniqueStart.push(n);
  }

  const nodes = [];
  const walk = (items, depth, parentId) => {
    if (depth > depthCap) return;
    for (const item of items) {
      nodes.push({
        ...item,
        depth,
        parent: parentId ?? item.parent
      });
      if (item.kind === "section") {
        const childKey = item.id;
        const children = all.filter(
          (c) => normalizeParentValue(c.parent) === childKey || c.parent === childKey
        );
        walk(children, depth + 1, item.id);
      }
    }
  };
  walk(uniqueStart.length ? uniqueStart : all.filter((i) => !normalizeParentValue(i.parent)), 1, parentNorm);

  return nodes;
}

function applyDatabaseRecordsListQuery(payload, rawQuery = {}) {
  if (!payload || rawQuery.listMode === "all" || rawQuery.legacyFull) {
    return payload;
  }

  const listMode = String(rawQuery.listMode || "entries").trim();
  const pagination = parseListPagination(rawQuery);
  const records = Array.isArray(payload.records) ? payload.records : [];
  let items = records.map(recordToListItem);

  if (listMode === "sections") {
    items = items.filter((item) => item.kind === "section");
  } else if (listMode === "entries") {
    items = items.filter((item) => item.kind === "entry");
  } else if (listMode === "tree") {
    items = buildTreeItems(records, rawQuery);
  }

  items = filterItemsByQuery(items, rawQuery);
  const page = paginateItems(items, pagination);

  const result = {
    store: payload.store,
    kind: payload.kind,
    listMode,
    parent: normalizeParentValue(rawQuery.parent),
    ...page,
    hint:
      listMode === "tree"
        ? "Tree skeleton (maxDepth). Full record: content_read placement database/data + ref."
        : "Paginated list. Next page: cursor or offset. Full catalog: listMode=all (contents_list_full)."
  };

  if (rawQuery.includeBody && listMode === "entries") {
    result.previewNote = "Body snippets are not loaded in records API; use contents_list_preview or content_read.";
  }

  return result;
}

module.exports = {
  applyDatabaseRecordsListQuery,
  recordToListItem,
  buildTreeItems
};
