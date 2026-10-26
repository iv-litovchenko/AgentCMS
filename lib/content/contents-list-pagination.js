const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;

function parseListPagination(input = {}) {
  let offset = Math.max(0, Number(input.offset) || 0);
  const cursor = String(input.cursor || "").trim();
  if (cursor) {
    try {
      const parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
      if (Number.isFinite(parsed.offset)) offset = Math.max(0, Math.floor(parsed.offset));
    } catch {
      // ignore bad cursor
    }
  }
  let limit = Number(input.limit);
  if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIST_LIMIT;
  limit = Math.min(Math.floor(limit), MAX_LIST_LIMIT);
  return { limit, offset };
}

function paginateItems(items, pagination) {
  const { limit, offset } = pagination;
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const slice = list.slice(offset, offset + limit);
  const nextOffset = offset + limit < total ? offset + limit : null;
  return {
    items: slice,
    total,
    limit,
    offset,
    hasMore: nextOffset != null,
    nextOffset,
    nextCursor:
      nextOffset != null
        ? Buffer.from(JSON.stringify({ offset: nextOffset })).toString("base64url")
        : null
  };
}

function normalizeParentValue(parent) {
  const s = String(parent ?? "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!s || s === ".") return null;
  return s;
}

function parseListQueryFromSearchParams(searchParams) {
  const sp = searchParams && typeof searchParams.get === "function" ? searchParams : null;
  const raw = (key) => (sp ? sp.get(key) : searchParams?.[key]) || undefined;
  const listMode = String(raw("listMode") || raw("mode") || "entries").trim() || "entries";
  return {
    listMode,
    parent: raw("parent"),
    limit: raw("limit"),
    offset: raw("offset"),
    cursor: raw("cursor"),
    maxDepth: raw("maxDepth"),
    q: raw("q"),
    includeBody: raw("includeBody") === "true" || raw("includeBody") === true,
    maxBodyChars: raw("maxBodyChars")
  };
}

function parseListQueryFromArgs(args = {}) {
  return {
    listMode: args.listMode || args.mode || "entries",
    parent: args.parent,
    limit: args.limit,
    offset: args.offset,
    cursor: args.cursor,
    maxDepth: args.maxDepth,
    q: args.q,
    includeBody: args.includeBody === true,
    maxBodyChars: args.maxBodyChars
  };
}

function listQueryToHttpParams(query) {
  const params = {};
  if (query.listMode) params.listMode = String(query.listMode);
  if (query.parent != null && String(query.parent).trim()) params.parent = String(query.parent).trim();
  if (query.limit != null) params.limit = String(query.limit);
  if (query.offset != null) params.offset = String(query.offset);
  if (query.cursor) params.cursor = String(query.cursor);
  if (query.maxDepth != null) params.maxDepth = String(query.maxDepth);
  if (query.q) params.q = String(query.q);
  if (query.includeBody) params.includeBody = "true";
  if (query.maxBodyChars != null) params.maxBodyChars = String(query.maxBodyChars);
  return params;
}

function filterItemsByQuery(items, { q, parent }) {
  let out = items;
  const parentNorm = normalizeParentValue(parent);
  if (parentNorm !== null || parent === "" || parent === ".") {
    out = out.filter((item) => {
      const itemParent = normalizeParentValue(item.parent);
      if (parentNorm === null) return itemParent === null;
      return itemParent === parentNorm || item.parent === parentNorm || item.parentId === parentNorm;
    });
  }
  const needle = String(q || "")
    .trim()
    .toLowerCase();
  if (needle) {
    out = out.filter((item) => {
      const hay = `${item.title || ""} ${item.id || ""} ${item.ref || ""} ${item.name || ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }
  return out;
}

function shouldApplyContentsListQuery(rawQuery, searchParams) {
  if (rawQuery?.legacyFull || rawQuery?.listMode === "all") return false;
  const sp = searchParams && typeof searchParams.get === "function" ? searchParams : null;
  const keys = ["listMode", "mode", "limit", "offset", "cursor", "parent", "maxDepth", "q", "includeBody"];
  if (keys.some((k) => (sp ? sp.get(k) : rawQuery?.[k] != null && rawQuery[k] !== ""))) return true;
  return false;
}

module.exports = {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  parseListPagination,
  paginateItems,
  normalizeParentValue,
  parseListQueryFromSearchParams,
  parseListQueryFromArgs,
  listQueryToHttpParams,
  filterItemsByQuery,
  shouldApplyContentsListQuery
};
