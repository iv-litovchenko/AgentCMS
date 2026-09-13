const fs = require("fs/promises");
const path = require("path");
const { extractFrontmatter } = require("./frontmatter");
const {
  startWorkspaceIndexProgress,
  tickWorkspaceIndexProgress,
  finishWorkspaceIndexProgress
} = require("../workspace-index/progress");
const { loadIndex, saveIndex } = require("./store");

function isIndexableTextFile(name) {
  const lower = String(name || "").toLowerCase();
  return (
    lower.endsWith(".md") ||
    lower.endsWith(".sidecar.md") ||
    lower.endsWith(".yml") ||
    lower.endsWith(".yaml")
  );
}

function compareValues(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a || "").localeCompare(String(b || ""), "ru");
}

function recordMatchesFilters(record, filters = []) {
  for (const filter of filters) {
    const field = String(filter.field || "").trim();
    if (!field) continue;
    const value = record.fields?.[field];
    if (value == null || value === "") {
      if (filter.exists === false) continue;
      return false;
    }
    if (filter.eq != null && String(value) !== String(filter.eq)) return false;
    if (filter.contains != null && !String(value).toLowerCase().includes(String(filter.contains).toLowerCase())) {
      return false;
    }
    if (filter.gte != null && compareValues(value, filter.gte) < 0) return false;
    if (filter.lte != null && compareValues(value, filter.lte) > 0) return false;
    if (filter.gt != null && compareValues(value, filter.gt) <= 0) return false;
    if (filter.lt != null && compareValues(value, filter.lt) >= 0) return false;
  }
  return true;
}

function createStorageIndexService(deps) {
  const { getAgentRoot, collectSearchableFiles, resolvePathAbsolute } = deps;
  const rebuildLocks = new Map();

  async function collectRecords(agentRoot, { reportProgress = false } = {}) {
    const relFiles = await collectSearchableFiles(agentRoot);
    const eligible = relFiles.filter((relPath) => isIndexableTextFile(path.basename(relPath)));

    if (reportProgress) {
      startWorkspaceIndexProgress(agentRoot, "storage", eligible.length);
    }

    const records = [];
    const fieldSet = new Set();
    let index = 0;

    for (const relPath of eligible) {
      index += 1;
      if (reportProgress) {
        tickWorkspaceIndexProgress(agentRoot, index, eligible.length, relPath);
      }
      const absolute = resolvePathAbsolute(relPath);
      if (!absolute) continue;
      let content = "";
      try {
        content = await fs.readFile(absolute, "utf-8");
      } catch {
        continue;
      }
      const fields = extractFrontmatter(content);
      if (!Object.keys(fields).length) continue;
      for (const key of Object.keys(fields)) fieldSet.add(key);
      records.push({
        path: relPath.replace(/\\/g, "/"),
        fields
      });
    }

    return { records, fieldCatalog: Array.from(fieldSet).sort((a, b) => a.localeCompare(b, "ru")) };
  }

  function rebuildFieldCatalog(records) {
    const fieldSet = new Set();
    for (const record of records) {
      for (const key of Object.keys(record.fields || {})) fieldSet.add(key);
    }
    return Array.from(fieldSet).sort((a, b) => a.localeCompare(b, "ru"));
  }

  async function updateFile(relPath) {
    const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    if (!normalized) throw new Error("Path is required");

    const index = await loadIndex(agentRoot);
    if (!index?.records) {
      return { ok: false, skipped: true, reason: "no_index", path: normalized };
    }

    index.records = index.records.filter((record) => record.path !== normalized);

    if (isIndexableTextFile(path.basename(normalized))) {
      const absolute = resolvePathAbsolute(normalized);
      if (absolute) {
        let content = "";
        try {
          content = await fs.readFile(absolute, "utf-8");
        } catch {
          content = "";
        }
        const fields = extractFrontmatter(content);
        if (Object.keys(fields).length) {
          index.records.push({ path: normalized, fields });
        }
      }
    }

    index.fieldCatalog = rebuildFieldCatalog(index.records);
    index.recordCount = index.records.length;
    index.fieldCount = index.fieldCatalog.length;
    index.builtAt = new Date().toISOString();
    await saveIndex(agentRoot, index);

    return {
      ok: true,
      mode: "incremental",
      path: normalized,
      recordCount: index.recordCount,
      fieldCount: index.fieldCount,
      hasRecord: index.records.some((record) => record.path === normalized)
    };
  }

  async function rebuildIndex({ agentId = "" } = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");

    const lockKey = agentRoot;
    if (rebuildLocks.get(lockKey)) return rebuildLocks.get(lockKey);

    const job = (async () => {
      const started = Date.now();
      let records = [];
      let fieldCatalog = [];
      try {
        const collected = await collectRecords(agentRoot, { reportProgress: true });
        records = collected.records;
        fieldCatalog = collected.fieldCatalog;
      } finally {
        finishWorkspaceIndexProgress(agentRoot);
      }
      const index = {
        version: 1,
        model: "workspace-field-index-v1",
        offline: true,
        scope: "workspace",
        builtAt: new Date().toISOString(),
        lastRebuildMs: Date.now() - started,
        agentId: agentId || null,
        recordCount: records.length,
        fieldCount: fieldCatalog.length,
        fieldCatalog,
        records
      };
      await saveIndex(agentRoot, index);
      return {
        ok: true,
        builtAt: index.builtAt,
        recordCount: index.recordCount,
        fieldCount: index.fieldCount,
        model: index.model,
        lastRebuildMs: index.lastRebuildMs
      };
    })();

    rebuildLocks.set(lockKey, job);
    try {
      return await job;
    } finally {
      rebuildLocks.delete(lockKey);
    }
  }

  async function getStatus() {
    const agentRoot = getAgentRoot();
    if (!agentRoot) return { ready: false, reason: "Agent not selected" };

    const index = await loadIndex(agentRoot);
    if (!index) {
      return {
        ready: false,
        model: "workspace-field-index-v1",
        scope: "workspace",
        offline: true,
        recordCount: 0,
        fieldCount: 0,
        hint: "Каталог полей не построен"
      };
    }

    return {
      ready: index.recordCount > 0,
      model: index.model,
      scope: index.scope,
      offline: true,
      builtAt: index.builtAt,
      lastRebuildMs: index.lastRebuildMs ?? null,
      recordCount: index.recordCount,
      fieldCount: index.fieldCount,
      fieldCatalog: index.fieldCatalog?.slice(0, 40) || []
    };
  }

  async function query(payload = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");

    let index = await loadIndex(agentRoot);
    if (!index?.records?.length) {
      await rebuildIndex();
      index = await loadIndex(agentRoot);
    }
    if (!index?.records?.length) {
      return { mode: "field-query", scope: "workspace", results: [], total: 0, fieldCatalog: [] };
    }

    const pathPrefix = String(payload.pathPrefix || payload.path || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const filters = Array.isArray(payload.where) ? payload.where : Array.isArray(payload.filters) ? payload.filters : [];
    const limitRaw = Number(payload.limit ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 50;
    const select = Array.isArray(payload.fields) ? payload.fields : null;
    const sort = payload.sort && typeof payload.sort === "object" ? payload.sort : null;

    let rows = index.records.filter((record) => {
      if (pathPrefix && !record.path.startsWith(pathPrefix)) return false;
      return recordMatchesFilters(record, filters);
    });

    if (sort?.field) {
      const dir = sort.dir === "asc" ? 1 : -1;
      rows = rows.slice().sort((a, b) => dir * compareValues(a.fields?.[sort.field], b.fields?.[sort.field]));
    }

    const total = rows.length;
    rows = rows.slice(0, limit).map((record) => {
      if (!select?.length) return record;
      const fields = {};
      for (const key of select) {
        if (key === "path") continue;
        if (record.fields?.[key] != null) fields[key] = record.fields[key];
      }
      return { path: record.path, fields };
    });

    return {
      mode: "field-query",
      scope: "workspace",
      model: index.model,
      builtAt: index.builtAt,
      pathPrefix: pathPrefix || null,
      fieldCatalog: index.fieldCatalog,
      results: rows,
      total
    };
  }

  async function catalog({ limit = 40, offset = 0, pathPrefix = "", q = "", field = "" } = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");

    const index = await loadIndex(agentRoot);
    if (!index?.records?.length) {
      return {
        mode: "field-catalog",
        scope: "workspace",
        ready: false,
        total: 0,
        offset: 0,
        limit,
        items: [],
        fieldCatalog: [],
        hint: "Каталог полей не построен"
      };
    }

    const prefix = String(pathPrefix || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const needle = String(q || "").trim().toLowerCase();
    const fieldNeedle = String(field || "").trim();

    let rows = index.records;
    if (prefix) rows = rows.filter((row) => row.path.startsWith(prefix));
    if (fieldNeedle) {
      rows = rows.filter((row) => Object.prototype.hasOwnProperty.call(row.fields || {}, fieldNeedle));
    }
    if (needle) {
      rows = rows.filter((row) => {
        if (row.path.toLowerCase().includes(needle)) return true;
        return Object.entries(row.fields || {}).some(
          ([key, value]) =>
            key.toLowerCase().includes(needle) || String(value).toLowerCase().includes(needle)
        );
      });
    }

    const total = rows.length;
    const start = Math.max(Number(offset) || 0, 0);
    const take = Math.min(Math.max(Number(limit) || 40, 1), 200);
    const items = rows.slice(start, start + take).map((row) => ({
      path: row.path,
      fields: row.fields
    }));

    return {
      mode: "field-catalog",
      scope: "workspace",
      model: index.model,
      ready: true,
      builtAt: index.builtAt,
      recordCount: index.recordCount,
      fieldCount: index.fieldCount,
      fieldCatalog: index.fieldCatalog || [],
      total,
      offset: start,
      limit: take,
      pathPrefix: prefix || null,
      query: needle || null,
      field: fieldNeedle || null,
      items
    };
  }

  return { rebuildIndex, getStatus, query, catalog, updateFile };
}

module.exports = { createStorageIndexService };
