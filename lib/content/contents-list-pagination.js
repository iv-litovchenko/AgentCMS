const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 100;
const DEFAULT_LIST_MAX_DEPTH = 3;

function getDefaultListLimit() {
  const fromEnv = Number(process.env.AGENT_CMS_LIST_DEFAULT_LIMIT);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return Math.min(Math.floor(fromEnv), MAX_LIST_LIMIT);
  return DEFAULT_LIST_LIMIT;
}

function getDefaultListMaxDepth() {
  const fromEnv = Number(process.env.AGENT_CMS_LIST_DEFAULT_MAX_DEPTH);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return Math.min(Math.floor(fromEnv), 10);
  return DEFAULT_LIST_MAX_DEPTH;
}

function isListPreviewAllowed() {
  const v = String(process.env.AGENT_CMS_LIST_ALLOW_PREVIEW ?? "1")
    .trim()
    .toLowerCase();
  return v !== "0" && v !== "false" && v !== "no";
}

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
  if (!Number.isFinite(limit) || limit < 1) limit = getDefaultListLimit();
  limit = Math.min(Math.floor(limit), MAX_LIST_LIMIT);
  return { limit, offset };
}

function paginateItems(items, pagination, rawQuery = {}) {
  const { limit } = pagination;
  const list = Array.isArray(items) ? items : [];
  const total = list.length;
  const { resolvePaginationStart, buildNextCursor } = require("./contents-list-cursor.js");
  const { start, sort } = resolvePaginationStart(list, rawQuery, pagination);
  const slice = list.slice(start, start + limit);
  const { nextOffset, nextCursor } = buildNextCursor(list, start, limit, sort);
  return {
    items: slice,
    total,
    limit,
    offset: start,
    sort,
    hasMore: nextOffset != null,
    nextOffset,
    nextCursor
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
    sort: raw("sort"),
    ext: raw("ext"),
    status: raw("status"),
    tags: raw("tags"),
    entryType: raw("entryType"),
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
    sort: args.sort,
    ext: args.ext,
    status: args.status,
    tags: args.tags,
    entryType: args.entryType,
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
  if (query.sort) params.sort = String(query.sort);
  if (query.ext) params.ext = String(query.ext);
  if (query.status) params.status = String(query.status);
  if (query.tags) params.tags = String(query.tags);
  if (query.entryType) params.entryType = String(query.entryType);
  if (query.includeBody) params.includeBody = "true";
  if (query.maxBodyChars != null) params.maxBodyChars = String(query.maxBodyChars);
  return params;
}

function filterItemsByQuery(items, rawQuery = {}) {
  const { filterItemsByAdvancedQuery } = require("./contents-list-filters.js");
  return filterItemsByAdvancedQuery(items, rawQuery);
}

function shouldApplyContentsListQuery(rawQuery, searchParams) {
  if (rawQuery?.legacyFull || rawQuery?.listMode === "all") return false;
  const sp = searchParams && typeof searchParams.get === "function" ? searchParams : null;
  const keys = [
    "listMode",
    "mode",
    "limit",
    "offset",
    "cursor",
    "parent",
    "maxDepth",
    "q",
    "sort",
    "ext",
    "status",
    "tags",
    "entryType",
    "includeBody"
  ];
  if (keys.some((k) => (sp ? sp.get(k) : rawQuery?.[k] != null && rawQuery[k] !== ""))) return true;
  return false;
}

module.exports = {
  DEFAULT_LIST_LIMIT,
  MAX_LIST_LIMIT,
  DEFAULT_LIST_MAX_DEPTH,
  getDefaultListLimit,
  getDefaultListMaxDepth,
  isListPreviewAllowed,
  parseListPagination,
  paginateItems,
  normalizeParentValue,
  parseListQueryFromSearchParams,
  parseListQueryFromArgs,
  listQueryToHttpParams,
  filterItemsByQuery,
  shouldApplyContentsListQuery
};
