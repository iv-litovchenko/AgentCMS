import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { resolveContentHistoryQuery } = require("../../lib/content/content-history-query.js");

function historyParams(args) {
  return resolveContentHistoryQuery(args);
}

async function fetchHistoryList(client, args) {
  const q = historyParams(args);
  const data = await client.get("/api/file/history", {
    path: q.manifestRelPath,
    mode: q.mode,
    file: q.file,
    name: q.systemName
  });
  return { query: q, data };
}

export async function contentHistoryVersionCount(client, args) {
  const { query, data } = await fetchHistoryList(client, args);
  const versions = Array.isArray(data.versions) ? data.versions : [];
  return {
    placement: query.placement,
    target: data.target || query.targetRelPath,
    total: versions.length,
    hint: "Versions are .mdback snapshots on save. List: content_history_version_list."
  };
}

export async function contentHistoryVersionList(client, args) {
  const limit = args.limit != null ? Math.min(Math.max(Number(args.limit) || 50, 1), 100) : 50;
  const { query, data } = await fetchHistoryList(client, args);
  const versions = Array.isArray(data.versions) ? data.versions : [];
  const slice = versions.slice(0, limit);
  return {
    placement: query.placement,
    target: data.target || query.targetRelPath,
    manifestPath: data.manifestPath || query.manifestRelPath,
    total: versions.length,
    limit,
    hasMore: versions.length > limit,
    versions: slice
  };
}

export async function contentHistoryVersionRead(client, args) {
  const version = String(args.version || "").trim();
  if (!version) throw new Error("version is required (.mdback file name)");
  const q = historyParams(args);
  const data = await client.get("/api/file/history/content", {
    path: q.manifestRelPath,
    mode: q.mode,
    file: q.file,
    name: q.systemName,
    version
  });
  return {
    placement: q.placement,
    version: data.version,
    label: data.label,
    target: data.target,
    relPath: data.relPath,
    content: data.content
  };
}

export async function contentHistoryVersionDiff(client, args) {
  const version = String(args.version || "").trim();
  if (!version) throw new Error("version is required");
  const q = historyParams(args);
  const oldPayload = await client.get("/api/file/history/content", {
    path: q.manifestRelPath,
    mode: q.mode,
    file: q.file,
    name: q.systemName,
    version
  });
  const diffPayload = await client.post("/api/file/diff", {
    path: q.targetRelPath,
    oldContent: oldPayload.content ?? ""
  });
  return {
    placement: q.placement,
    version,
    path: diffPayload.path,
    changed: diffPayload.changed,
    diff: diffPayload.diff,
    hint: "Diff: selected version (old) vs current file on disk (new)."
  };
}

export async function contentHistoryRestore(client, args) {
  const version = String(args.version || "").trim();
  if (!version) throw new Error("version is required");
  const q = historyParams(args);
  const data = await client.post("/api/file/history/restore", {
    path: q.manifestRelPath,
    mode: q.mode,
    file: q.file,
    name: q.systemName,
    version
  });
  return {
    placement: q.placement,
    restored: true,
    version: data.version,
    label: data.label,
    target: data.target,
    hint: "Current file overwritten from history version (new snapshot of previous content may be created on next save)."
  };
}
