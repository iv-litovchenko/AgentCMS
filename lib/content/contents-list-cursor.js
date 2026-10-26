const { parseSortMode } = require("./contents-list-sort.js");

function sortKeyForItem(item) {
  return String(item.id || item.name || item.title || item.ref || "")
    .trim()
    .toLowerCase();
}

function cursorPayloadFromItem(item, sort) {
  if (!item) return null;
  if (sort === "updated") {
    return {
      id: item.id,
      updatedAt: item.updatedAt || item.createdAt || null,
      title: item.title || null
    };
  }
  return { id: item.id, title: item.title || null, ref: item.ref || null };
}

function encodeListCursor(payload) {
  return Buffer.from(JSON.stringify({ v: 1, ...payload })).toString("base64url");
}

function decodeListCursor(cursor) {
  const raw = String(cursor || "").trim();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (parsed && parsed.v === 1) return parsed;
    if (Number.isFinite(parsed?.offset)) return { v: 0, offset: parsed.offset };
  } catch {
    return null;
  }
  return null;
}

function compareItemsForSort(a, b, sort) {
  if (sort === "updated") {
    const ta = Date.parse(a.updatedAt || a.createdAt || "") || 0;
    const tb = Date.parse(b.updatedAt || b.createdAt || "") || 0;
    if (ta !== tb) return ta - tb;
  }
  const ka = sortKeyForItem(a);
  const kb = sortKeyForItem(b);
  return ka.localeCompare(kb, "ru", { sensitivity: "base", numeric: true });
}

function findStartIndexAfter(items, after, sort) {
  if (!after || !items.length) return 0;
  if (after.id) {
    const idx = items.findIndex((item) => item.id === after.id);
    if (idx >= 0) return idx + 1;
  }
  for (let i = 0; i < items.length; i++) {
    if (compareItemsForSort(items[i], after, sort) > 0) return i;
  }
  return items.length;
}

function resolvePaginationStart(items, rawQuery, pagination) {
  let start = pagination.offset;
  const decoded = decodeListCursor(pagination.cursor);
  const sort = parseSortMode(rawQuery);
  if (decoded?.v === 1 && decoded.sort === sort && decoded.after) {
    start = findStartIndexAfter(items, decoded.after, sort);
  } else if (decoded?.v === 0 && Number.isFinite(decoded.offset)) {
    start = Math.max(0, decoded.offset);
  }
  return { start, sort };
}

function buildNextCursor(items, start, limit, sort) {
  const nextOffset = start + limit;
  if (nextOffset >= items.length) return { nextOffset: null, nextCursor: null };
  const last = items[Math.min(nextOffset - 1, items.length - 1)];
  return {
    nextOffset,
    nextCursor: encodeListCursor({ sort, after: cursorPayloadFromItem(last, sort), offset: nextOffset })
  };
}

module.exports = {
  encodeListCursor,
  decodeListCursor,
  resolvePaginationStart,
  buildNextCursor,
  cursorPayloadFromItem
};
