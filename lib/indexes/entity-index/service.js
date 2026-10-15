const fs = require("fs/promises");
const path = require("path");
const {
  startWorkspaceIndexProgress,
  tickWorkspaceIndexProgress,
  finishWorkspaceIndexProgress
} = require("../workspace-index/progress");
const {
  getStatusFromDb,
  replaceAllMentions,
  replaceMentionsForPath,
  queryDb,
  MODEL
} = require("./store");
const { extractMentionsFromContent, isIndexableFile, normalizePath } = require("./extract");
const { loadEntityRegistry, buildRegistryIndex, addEntityAlias } = require("./entity-registry");

function createEntityIndexService(deps) {
  const {
    getAgentRoot,
    collectSearchableFiles,
    resolvePathAbsolute,
    getIndexPolicy,
    isEntityIndexExcluded,
    getProjectRoot,
    isEntityGlinerEnabled
  } = deps;
  const rebuildLocks = new Map();

  async function getExtractionOptions(agentRoot) {
    const projectRoot = typeof getProjectRoot === "function" ? getProjectRoot() : process.cwd();
    const registry = await loadEntityRegistry(agentRoot);
    const registryIndex = buildRegistryIndex(registry);
    let useGliner = false;
    if (typeof isEntityGlinerEnabled === "function") {
      useGliner = Boolean(await isEntityGlinerEnabled());
    }
    return { agentRoot, projectRoot, registryIndex, useGliner };
  }

  function pathsForEntityId(agentRoot, entityId) {
    return queryDb(agentRoot, "SELECT DISTINCT path FROM mentions WHERE entity_id = ?", [entityId])
      .map((row) => row.path)
      .filter(Boolean);
  }

  async function isPathIndexable(relPath) {
    if (typeof isEntityIndexExcluded === "function" && (await isEntityIndexExcluded(relPath))) {
      return false;
    }
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
      return { ok: false, busy: true, message: "Entity index rebuild already running" };
    }

    rebuildLocks.set(agentRoot, true);
    const started = Date.now();
    let useGliner = false;

    try {
      const extractOpts = await getExtractionOptions(agentRoot);
      useGliner = extractOpts.useGliner;
      const relFiles = await collectSearchableFiles(agentRoot);
      const mdFiles = [];
      for (const relPath of relFiles) {
        if (await isPathIndexable(relPath)) mdFiles.push(relPath);
      }

      startWorkspaceIndexProgress(agentRoot, "entity", mdFiles.length);

      const allMentions = [];
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
        allMentions.push(
          ...(await extractMentionsFromContent(content, relPath, extractOpts))
        );
      }

      const builtAt = new Date().toISOString();
      const lastRebuildMs = Date.now() - started;
      replaceAllMentions(agentRoot, allMentions, {
        builtAt,
        lastRebuildMs,
        fileCount: mdFiles.length,
        model: MODEL,
        gliner: useGliner ? "on" : "off"
      });

      const status = getStatusFromDb(agentRoot);
      return {
        ok: true,
        model: MODEL,
        builtAt,
        lastRebuildMs,
        fileCount: mdFiles.length,
        entityCount: status.entityCount,
        mentionCount: status.mentionCount,
        typeCounts: status.typeCounts,
        gliner: useGliner
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
      replaceMentionsForPath(agentRoot, normalized, []);
      return { ok: true, path: normalized, mentionCount: 0, cleared: true };
    }

    const absolute = resolvePathAbsolute(normalized);
    if (!absolute) {
      replaceMentionsForPath(agentRoot, normalized, []);
      return { ok: true, path: normalized, mentionCount: 0, cleared: true };
    }

    let content = "";
    try {
      content = await fs.readFile(absolute, "utf-8");
    } catch {
      replaceMentionsForPath(agentRoot, normalized, []);
      return { ok: true, path: normalized, mentionCount: 0, cleared: true };
    }

    const extractOpts = await getExtractionOptions(agentRoot);
    const mentions = await extractMentionsFromContent(content, normalized, extractOpts);
    replaceMentionsForPath(agentRoot, normalized, mentions);
    return { ok: true, path: normalized, mentionCount: mentions.length };
  }

  async function resolveFilterPaths(options = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");

    const status = getStatusFromDb(agentRoot);
    if (!status.ready) {
      return {
        ready: false,
        paths: new Set(),
        pathCount: 0,
        hint: status.hint || "Rebuild entity index first"
      };
    }

    const pathPrefix = normalizePath(options.pathPrefix || "");
    const entityIds = Array.isArray(options.entityIds)
      ? options.entityIds.map((item) => String(item || "").trim()).filter(Boolean)
      : options.entityId
        ? [String(options.entityId).trim()].filter(Boolean)
        : [];

    let pathSet = null;

    if (entityIds.length) {
      for (const entityId of entityIds) {
        const paths = pathsForEntityId(agentRoot, entityId).filter((p) => matchPathPrefix(p, pathPrefix));
        const current = new Set(paths);
        if (!pathSet) pathSet = current;
        else pathSet = new Set([...pathSet].filter((p) => current.has(p)));
      }
    } else {
      const filter = options.entityWhere || options.entityFilter;
      if (filter && typeof filter === "object") {
        const type = String(filter.type || "").trim().toLowerCase();
        const q = String(filter.q || filter.label || "").trim().toLowerCase();
        let entities = queryDb(agentRoot, "SELECT id, type, label FROM entities", []);
        if (type) entities = entities.filter((row) => String(row.type).toLowerCase() === type);
        if (q) {
          entities = entities.filter((row) => String(row.label || "").toLowerCase().includes(q));
        }
        pathSet = new Set();
        for (const entity of entities) {
          for (const p of pathsForEntityId(agentRoot, entity.id)) {
            if (matchPathPrefix(p, pathPrefix)) pathSet.add(p);
          }
        }
      }
    }

    if (!pathSet) {
      return { ready: true, paths: null, pathCount: null, unconstrained: true };
    }

    return {
      ready: true,
      paths: pathSet,
      pathCount: pathSet.size,
      entityIds: entityIds.length ? entityIds : undefined
    };
  }

  async function mergeEntityAlias(payload = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    const saved = await addEntityAlias(agentRoot, payload);
    return { ok: true, registry: saved };
  }

  async function getStatus() {
    const agentRoot = getAgentRoot();
    if (!agentRoot) return { ready: false, reason: "Agent not selected" };
    return getStatusFromDb(agentRoot);
  }

  function matchPathPrefix(pathValue, prefix) {
    const p = normalizePath(prefix);
    if (!p) return true;
    const v = normalizePath(pathValue);
    return v === p || v.startsWith(`${p}/`);
  }

  async function query(payload = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");

    const status = getStatusFromDb(agentRoot);
    if (!status.ready) {
      return { ok: false, ready: false, hint: "Rebuild entity index first", items: [] };
    }

    const mode = String(payload.mode || payload.query || "entities").trim().toLowerCase();
    const limitRaw = Number(payload.limit);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
    const pathPrefix = normalizePath(payload.pathPrefix || "");
    const typeFilter = String(payload.type || "").trim().toLowerCase();
    const needle = String(payload.q || payload.label || "").trim().toLowerCase();

    if (mode === "mentions" || mode === "by_entity") {
      const entityId = String(payload.entityId || payload.id || "").trim();
      if (!entityId) throw new Error("entityId is required");
      let rows = queryDb(
        agentRoot,
        `SELECT m.path, m.line, m.col_start, m.col_end, m.snippet, m.source, e.type, e.label, e.id AS entity_id
         FROM mentions m
         JOIN entities e ON e.id = m.entity_id
         WHERE m.entity_id = ?
         ORDER BY m.path, m.line, m.col_start
         LIMIT ?`,
        [entityId, limit]
      );
      rows = rows.filter((row) => matchPathPrefix(row.path, pathPrefix));
      return { ok: true, mode: "mentions", entityId, count: rows.length, items: rows };
    }

    if (mode === "by_path" || mode === "path") {
      const pathValue = normalizePath(payload.path || "");
      if (!pathValue) throw new Error("path is required");
      const rows = queryDb(
        agentRoot,
        `SELECT e.id AS entity_id, e.type, e.label, m.line, m.col_start, m.snippet, m.source
         FROM mentions m
         JOIN entities e ON e.id = m.entity_id
         WHERE m.path = ?
         ORDER BY e.type, e.label, m.line
         LIMIT ?`,
        [pathValue, limit]
      );
      return { ok: true, mode: "by_path", path: pathValue, count: rows.length, items: rows };
    }

    let rows = queryDb(
      agentRoot,
      `SELECT id AS entity_id, type, label, mention_count
       FROM entities
       ORDER BY mention_count DESC, label COLLATE NOCASE
       LIMIT 5000`
    );

    if (typeFilter) rows = rows.filter((row) => String(row.type).toLowerCase() === typeFilter);
    if (needle) {
      rows = rows.filter((row) => String(row.label || "").toLowerCase().includes(needle));
    }
    if (pathPrefix) {
      const paths = queryDb(
        agentRoot,
        "SELECT DISTINCT entity_id, path FROM mentions",
        []
      );
      const allowed = new Set(
        paths.filter((row) => matchPathPrefix(row.path, pathPrefix)).map((row) => row.entity_id)
      );
      rows = rows.filter((row) => allowed.has(row.entity_id));
    }

    const items = rows.slice(0, limit);
    return { ok: true, mode: "entities", count: items.length, total: rows.length, items };
  }

  async function catalog({ limit = 40, offset = 0, pathPrefix = "", q = "", type = "" } = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");

    const status = getStatusFromDb(agentRoot);
    if (!status.ready) {
      return {
        mode: "entity-registry",
        scope: "workspace",
        ready: false,
        total: 0,
        offset: 0,
        limit,
        items: [],
        typeCatalog: [],
        hint: status.hint || "Реестр сущностей не построен"
      };
    }

    const typeCatalog = queryDb(agentRoot, "SELECT DISTINCT type FROM entities ORDER BY type").map(
      (row) => row.type
    );

    const start = Math.max(Number(offset) || 0, 0);
    const take = Math.min(Math.max(Number(limit) || 40, 1), 200);
    const fullList = await query({ mode: "entities", limit: 5000, pathPrefix, q, type });
    const items = (fullList.items || []).slice(start, start + take);

    return {
      mode: "entity-registry",
      scope: "workspace",
      model: status.model,
      ready: true,
      builtAt: status.builtAt,
      entityCount: status.entityCount,
      mentionCount: status.mentionCount,
      fileCount: status.fileCount,
      typeCatalog,
      total: fullList.total ?? items.length,
      offset: start,
      limit: take,
      pathPrefix: pathPrefix || null,
      query: q || null,
      type: type || null,
      items: items.map((row) => ({
        entityId: row.entity_id,
        type: row.type,
        label: row.label,
        mentionCount: row.mention_count
      }))
    };
  }

  return {
    rebuildIndex,
    updateFile,
    getStatus,
    query,
    catalog,
    resolveFilterPaths,
    mergeEntityAlias,
    loadEntityRegistry: async () => {
      const root = getAgentRoot();
      if (!root) throw new Error("Agent not selected");
      const { saveEntityRegistry, emptyRegistry } = require("./entity-registry");
      const registry = await loadEntityRegistry(root);
      if (!(registry.aliases?.length || registry.reject?.length)) {
        await saveEntityRegistry(root, emptyRegistry());
        return loadEntityRegistry(root);
      }
      return registry;
    }
  };
}

module.exports = { createEntityIndexService };
