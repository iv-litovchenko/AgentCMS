const fs = require("fs/promises");
const path = require("path");
const {
  startWorkspaceIndexProgress,
  tickWorkspaceIndexProgress,
  finishWorkspaceIndexProgress
} = require("../workspace-index/progress");
const {
  getStatusFromDb,
  replaceAllEdges,
  replaceEdgesForPath,
  queryEdges,
  MODEL
} = require("./store");
const {
  buildWikilinkIndex,
  extractEdgesFromContent,
  isIndexableFile,
  normalizePath
} = require("./extract");

function createLinkIndexService(deps) {
  const { getAgentRoot, collectSearchableFiles, resolvePathAbsolute, getIndexPolicy } = deps;
  const rebuildLocks = new Map();

  async function isPathIndexable(relPath) {
    if (typeof getIndexPolicy === "function") {
      const policy = await getIndexPolicy();
      return policy.isIndexable(relPath) && isIndexableFile(path.basename(relPath));
    }
    return isIndexableFile(path.basename(relPath));
  }

  async function rebuildIndex({ agentId } = {}) {
    void agentId;
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    if (rebuildLocks.get(agentRoot)) {
      return { ok: false, busy: true, message: "Link index rebuild already running" };
    }

    rebuildLocks.set(agentRoot, true);
    const started = Date.now();

    try {
      const relFiles = await collectSearchableFiles(agentRoot);
      const mdFiles = [];
      for (const relPath of relFiles) {
        if (await isPathIndexable(relPath)) mdFiles.push(relPath);
      }
      const wikiIndex = buildWikilinkIndex(mdFiles);

      startWorkspaceIndexProgress(agentRoot, "link", mdFiles.length);

      const allEdges = [];
      let index = 0;
      for (const relPath of mdFiles) {
        index += 1;
        tickWorkspaceIndexProgress(agentRoot, index, mdFiles.length, relPath);
        const absolute = resolvePathAbsolute(relPath);
        if (!absolute) continue;
        let content = "";
        try {
          content = await fs.readFile(absolute, "utf-8");
        } catch {
          continue;
        }
        allEdges.push(...extractEdgesFromContent(content, relPath, wikiIndex));
      }

      const builtAt = new Date().toISOString();
      const lastRebuildMs = Date.now() - started;
      replaceAllEdges(agentRoot, allEdges, {
        builtAt,
        lastRebuildMs,
        fileCount: mdFiles.length,
        model: MODEL
      });

      return {
        ok: true,
        model: MODEL,
        builtAt,
        lastRebuildMs,
        edgeCount: allEdges.length,
        fileCount: mdFiles.length
      };
    } finally {
      finishWorkspaceIndexProgress(agentRoot);
      rebuildLocks.delete(agentRoot);
    }
  }

  async function updateFile(relPath) {
    const normalized = normalizePath(relPath);
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    if (!normalized) throw new Error("Path is required");

    const status = getStatusFromDb(agentRoot);
    if (!status.ready) {
      return { ok: false, skipped: true, reason: "no_index", path: normalized };
    }

    if (!(await isPathIndexable(normalized))) {
      replaceEdgesForPath(agentRoot, normalized, []);
      return { ok: true, path: normalized, edgeCount: 0, cleared: true };
    }

    const relFiles = await collectSearchableFiles(agentRoot);
    const mdFiles = [];
    for (const relPath of relFiles) {
      if (await isPathIndexable(relPath)) mdFiles.push(relPath);
    }
    const wikiIndex = buildWikilinkIndex(mdFiles);

    const absolute = resolvePathAbsolute(normalized);
    if (!absolute) {
      replaceEdgesForPath(agentRoot, normalized, []);
      return { ok: true, path: normalized, edgeCount: 0, cleared: true };
    }

    let content = "";
    try {
      content = await fs.readFile(absolute, "utf-8");
    } catch {
      replaceEdgesForPath(agentRoot, normalized, []);
      return { ok: true, path: normalized, edgeCount: 0, cleared: true };
    }

    const edges = extractEdgesFromContent(content, normalized, wikiIndex);
    replaceEdgesForPath(agentRoot, normalized, edges);
    return { ok: true, path: normalized, edgeCount: edges.length };
  }

  async function getStatus() {
    const agentRoot = getAgentRoot();
    if (!agentRoot) return { ready: false, reason: "Agent not selected" };
    return getStatusFromDb(agentRoot);
  }

  function normalizeQueryPath(value) {
    return normalizePath(value);
  }

  function matchPathPrefix(pathValue, prefix) {
    const p = normalizeQueryPath(prefix);
    if (!p) return true;
    const v = normalizeQueryPath(pathValue);
    return v === p || v.startsWith(`${p}/`);
  }

  async function query(payload = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");

    const status = getStatusFromDb(agentRoot);
    if (!status.ready) {
      return { ok: false, ready: false, hint: "Rebuild link index first", items: [] };
    }

    const mode = String(payload.mode || payload.query || "neighbors").trim().toLowerCase();
    const pathValue = normalizeQueryPath(payload.path || payload.from || "");
    if (!pathValue) throw new Error("path is required");

    const limitRaw = Number(payload.limit);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
    const depthRaw = Number(payload.depth);
    const depth = Number.isFinite(depthRaw) ? Math.min(Math.max(depthRaw, 1), 3) : 1;
    const pathPrefix = normalizeQueryPath(payload.pathPrefix || "");

    if (mode === "backlinks" || mode === "inbound") {
      const rows = queryEdges(
        agentRoot,
        `SELECT from_path, to_target, to_resolved, kind
         FROM edges
         WHERE to_resolved = ? OR lower(to_target) = lower(?)
         ORDER BY from_path
         LIMIT ?`,
        [pathValue, pathValue, limit]
      );
      const items = rows
        .filter((row) => matchPathPrefix(row.from_path, pathPrefix))
        .map((row) => ({
          from: row.from_path,
          to: row.to_resolved || row.to_target,
          target: row.to_target,
          kind: row.kind,
          direction: "inbound"
        }));
      return { ok: true, mode: "backlinks", path: pathValue, count: items.length, items };
    }

    if (mode === "outbound") {
      const rows = queryEdges(
        agentRoot,
        `SELECT from_path, to_target, to_resolved, kind
         FROM edges
         WHERE from_path = ?
         ORDER BY kind, to_target
         LIMIT ?`,
        [pathValue, limit]
      );
      const items = rows.map((row) => ({
        from: row.from_path,
        to: row.to_resolved || row.to_target,
        target: row.to_target,
        kind: row.kind,
        direction: "outbound"
      }));
      return { ok: true, mode: "outbound", path: pathValue, count: items.length, items };
    }

    const visited = new Set([pathValue]);
    const frontier = [{ path: pathValue, depth: 0 }];
    const items = [];

    while (frontier.length && items.length < limit) {
      const node = frontier.shift();
      if (node.depth >= depth) continue;

      const outbound = queryEdges(
        agentRoot,
        `SELECT from_path, to_target, to_resolved, kind FROM edges WHERE from_path = ? LIMIT 100`,
        [node.path]
      );
      const inbound = queryEdges(
        agentRoot,
        `SELECT from_path, to_target, to_resolved, kind
         FROM edges
         WHERE to_resolved = ? OR lower(to_target) = lower(?)
         LIMIT 100`,
        [node.path, node.path]
      );

      for (const row of [...outbound, ...inbound]) {
        const other =
          row.from_path === node.path ? row.to_resolved || row.to_target : row.from_path;
        const normalizedOther = normalizeQueryPath(other);
        if (!normalizedOther || visited.has(normalizedOther)) continue;
        if (!matchPathPrefix(normalizedOther, pathPrefix)) continue;
        visited.add(normalizedOther);
        items.push({
          from: row.from_path,
          to: row.to_resolved || row.to_target,
          target: row.to_target,
          kind: row.kind,
          direction: row.from_path === node.path ? "outbound" : "inbound",
          hop: node.depth + 1
        });
        if (items.length >= limit) break;
        if (node.depth + 1 < depth) {
          frontier.push({ path: normalizedOther, depth: node.depth + 1 });
        }
      }
    }

    return {
      ok: true,
      mode: "neighbors",
      path: pathValue,
      depth,
      count: items.length,
      items
    };
  }

  async function catalog({ limit = 40, offset = 0, pathPrefix = "", q = "", kind = "" } = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");

    const status = getStatusFromDb(agentRoot);
    if (!status.ready) {
      return {
        mode: "link-graph",
        scope: "workspace",
        ready: false,
        total: 0,
        offset: 0,
        limit,
        items: [],
        kindCatalog: [],
        hint: status.hint || "Граф связей не построен"
      };
    }

    const prefix = normalizeQueryPath(pathPrefix);
    const needle = String(q || "").trim().toLowerCase();
    const kindFilter = String(kind || "").trim().toLowerCase();

    let rows = queryEdges(
      agentRoot,
      "SELECT from_path, to_target, to_resolved, kind FROM edges ORDER BY from_path, kind, to_target"
    );

    if (prefix) {
      rows = rows.filter((row) => {
        const from = row.from_path || "";
        const to = row.to_resolved || row.to_target || "";
        return (
          from === prefix ||
          to === prefix ||
          from.startsWith(`${prefix}/`) ||
          to.startsWith(`${prefix}/`)
        );
      });
    }
    if (kindFilter) {
      rows = rows.filter((row) => String(row.kind || "").toLowerCase() === kindFilter);
    }
    if (needle) {
      rows = rows.filter((row) =>
        [row.from_path, row.to_target, row.to_resolved, row.kind].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(needle)
        )
      );
    }

    const kindCatalog = queryEdges(agentRoot, "SELECT DISTINCT kind FROM edges ORDER BY kind").map(
      (row) => row.kind
    );

    const total = rows.length;
    const start = Math.max(Number(offset) || 0, 0);
    const take = Math.min(Math.max(Number(limit) || 40, 1), 200);
    const items = rows.slice(start, start + take).map((row) => ({
      from: row.from_path,
      toTarget: row.to_target,
      toResolved: row.to_resolved,
      to: row.to_resolved || row.to_target,
      kind: row.kind,
      unresolved: Boolean(row.to_target && !row.to_resolved)
    }));

    return {
      mode: "link-graph",
      scope: "workspace",
      model: status.model,
      ready: true,
      builtAt: status.builtAt,
      edgeCount: status.edgeCount,
      nodeCount: status.nodeCount,
      fileCount: status.fileCount,
      kindCatalog,
      total,
      offset: start,
      limit: take,
      pathPrefix: prefix || null,
      query: needle || null,
      kind: kindFilter || null,
      items
    };
  }

  return { rebuildIndex, updateFile, getStatus, query, catalog };
}

module.exports = { createLinkIndexService };
