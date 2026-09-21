const fs = require("fs/promises");
const path = require("path");
const { extractFrontmatter } = require("./frontmatter");
const { getRecordFieldValue } = require("./field-utils");
const { buildSchemaRegistry, createSchemaResolver, fieldCatalogMetaToArray } = require("./schema-enrichment");
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
    const value = getRecordFieldValue(record, field);
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
  const { getAgentRoot, getProjectRoot, collectSearchableFiles, resolvePathAbsolute, getIndexPolicy } = deps;
  const rebuildLocks = new Map();

  async function isPathIndexable(relPath) {
    if (typeof getIndexPolicy === "function") {
      const policy = await getIndexPolicy();
      return policy.isIndexable(relPath);
    }
    return isIndexableTextFile(path.basename(relPath));
  }

  function flatFieldsToQuickRecordFields(flatFields) {
    const fields = {};
    for (const [key, value] of Object.entries(flatFields || {})) {
      fields[key] = { value };
    }
    return fields;
  }

  async function collectRecordsQuick(agentRoot, { reportProgress = false, preserveFieldCatalogMeta = [] } = {}) {
    const relFiles = await collectSearchableFiles(agentRoot);
    const eligible = [];
    for (const relPath of relFiles) {
      if (await isPathIndexable(relPath)) eligible.push(relPath);
    }

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
      const flatFields = extractFrontmatter(content);
      if (!Object.keys(flatFields).length) continue;
      const fields = flatFieldsToQuickRecordFields(flatFields);
      for (const key of Object.keys(fields)) fieldSet.add(key);
      records.push({
        path: relPath.replace(/\\/g, "/"),
        schemaContext: null,
        schemaTarget: null,
        manifestRel: null,
        fields
      });
    }

    return {
      records,
      fieldCatalog: Array.from(fieldSet).sort((a, b) => a.localeCompare(b, "ru")),
      fieldCatalogMeta: Array.isArray(preserveFieldCatalogMeta) ? preserveFieldCatalogMeta : []
    };
  }

  async function collectRecords(agentRoot, projectRoot, { reportProgress = false } = {}) {
    const relFiles = await collectSearchableFiles(agentRoot);
    const eligible = [];
    for (const relPath of relFiles) {
      if (await isPathIndexable(relPath)) eligible.push(relPath);
    }

    if (reportProgress) {
      startWorkspaceIndexProgress(agentRoot, "storage", eligible.length);
    }

    const registry = await buildSchemaRegistry({ agentRoot, projectRoot, relFiles });
    const resolver = createSchemaResolver({ agentRoot, projectRoot, registry });

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
      const flatFields = extractFrontmatter(content);
      if (!Object.keys(flatFields).length) continue;

      const schemaCtx = await resolver.resolveMergedFieldsForPath(relPath);
      if (schemaCtx) schemaCtx.samplePath = relPath.replace(/\\/g, "/");
      const fields = resolver.enrichFlatFields(flatFields, schemaCtx);

      for (const key of Object.keys(fields)) fieldSet.add(key);
      records.push({
        path: relPath.replace(/\\/g, "/"),
        schemaContext: schemaCtx?.schemaContext || null,
        schemaTarget: schemaCtx?.schemaTarget || null,
        manifestRel: schemaCtx?.manifestRel || null,
        fields
      });
    }

    return {
      records,
      fieldCatalog: Array.from(fieldSet).sort((a, b) => a.localeCompare(b, "ru")),
      fieldCatalogMeta: fieldCatalogMetaToArray(registry.fieldCatalogMeta)
    };
  }

  function rebuildFieldCatalog(records) {
    const fieldSet = new Set();
    for (const record of records) {
      for (const key of Object.keys(record.fields || {})) fieldSet.add(key);
    }
    return Array.from(fieldSet).sort((a, b) => a.localeCompare(b, "ru"));
  }

  async function enrichSingleRecord(agentRoot, projectRoot, relPath, flatFields) {
    const resolver = createSchemaResolver({
      agentRoot,
      projectRoot,
      registry: { fieldCatalogMeta: new Map() }
    });
    const schemaCtx = await resolver.resolveMergedFieldsForPath(relPath);
    if (schemaCtx) schemaCtx.samplePath = relPath.replace(/\\/g, "/");
    return {
      fields: resolver.enrichFlatFields(flatFields, schemaCtx),
      schemaContext: schemaCtx?.schemaContext || null,
      schemaTarget: schemaCtx?.schemaTarget || null,
      manifestRel: schemaCtx?.manifestRel || null
    };
  }

  async function updateFile(relPath) {
    const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const agentRoot = getAgentRoot();
    const projectRoot = typeof getProjectRoot === "function" ? getProjectRoot() : "";
    if (!agentRoot) throw new Error("Agent not selected");
    if (!normalized) throw new Error("Path is required");

    const index = await loadIndex(agentRoot);
    if (!index?.records) {
      return { ok: false, skipped: true, reason: "no_index", path: normalized };
    }

    index.records = index.records.filter((record) => record.path !== normalized);

    if (await isPathIndexable(normalized)) {
      const absolute = resolvePathAbsolute(normalized);
      if (absolute) {
        let content = "";
        try {
          content = await fs.readFile(absolute, "utf-8");
        } catch {
          content = "";
        }
        const flatFields = extractFrontmatter(content);
        if (Object.keys(flatFields).length) {
          const enriched = await enrichSingleRecord(agentRoot, projectRoot, normalized, flatFields);
          index.records.push({
            path: normalized,
            schemaContext: enriched.schemaContext,
            schemaTarget: enriched.schemaTarget,
            manifestRel: enriched.manifestRel,
            fields: enriched.fields
          });
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

  async function rebuildIndex({ agentId = "", mode = "full" } = {}) {
    const agentRoot = getAgentRoot();
    const projectRoot = typeof getProjectRoot === "function" ? getProjectRoot() : "";
    if (!agentRoot) throw new Error("Agent not selected");
    const rebuildMode = String(mode || "full").trim().toLowerCase() === "quick" ? "quick" : "full";

    const lockKey = agentRoot;
    if (rebuildLocks.get(lockKey)) return rebuildLocks.get(lockKey);

    const job = (async () => {
      const started = Date.now();
      let records = [];
      let fieldCatalog = [];
      let fieldCatalogMeta = [];
      const existingIndex = await loadIndex(agentRoot);
      try {
        if (rebuildMode === "quick") {
          const collected = await collectRecordsQuick(agentRoot, {
            reportProgress: true,
            preserveFieldCatalogMeta: existingIndex?.fieldCatalogMeta || []
          });
          records = collected.records;
          fieldCatalog = collected.fieldCatalog;
          fieldCatalogMeta = collected.fieldCatalogMeta;
        } else {
          const collected = await collectRecords(agentRoot, projectRoot, { reportProgress: true });
          records = collected.records;
          fieldCatalog = collected.fieldCatalog;
          fieldCatalogMeta = collected.fieldCatalogMeta;
        }
      } finally {
        finishWorkspaceIndexProgress(agentRoot);
      }
      const index = {
        version: 2,
        model: rebuildMode === "quick" ? "workspace-field-index-v2-quick" : "workspace-field-index-v2",
        enrichmentMode: rebuildMode,
        offline: true,
        scope: "workspace",
        builtAt: new Date().toISOString(),
        lastRebuildMs: Date.now() - started,
        agentId: agentId || null,
        recordCount: records.length,
        fieldCount: fieldCatalog.length,
        fieldCatalog,
        fieldCatalogMeta,
        records
      };
      await saveIndex(agentRoot, index);
      return {
        ok: true,
        mode: rebuildMode,
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

  async function getFieldCatalog() {
    const agentRoot = getAgentRoot();
    if (!agentRoot) return { ready: false, reason: "Agent not selected" };

    const index = await loadIndex(agentRoot);
    if (!index) {
      return {
        ready: false,
        scope: "workspace",
        recordCount: 0,
        fieldCount: 0,
        fieldCatalog: [],
        fieldCatalogMeta: [],
        hint: "Каталог полей не построен"
      };
    }

    return {
      ready: (index.recordCount || 0) > 0,
      model: index.model,
      enrichmentMode: index.enrichmentMode || (String(index.model || "").includes("quick") ? "quick" : "full"),
      scope: index.scope,
      builtAt: index.builtAt,
      lastRebuildMs: index.lastRebuildMs ?? null,
      recordCount: index.recordCount || 0,
      fieldCount: index.fieldCount || 0,
      fieldCatalog: index.fieldCatalog || [],
      fieldCatalogMeta: index.fieldCatalogMeta || []
    };
  }

  async function getStatus() {
    const payload = await getFieldCatalog();
    if (!payload.ready && !payload.builtAt) {
      return {
        ...payload,
        model: "workspace-field-index-v2",
        offline: true,
        hint: payload.hint || "Каталог полей не построен"
      };
    }
    return {
      ...payload,
      offline: true,
      fieldCatalog: payload.fieldCatalog?.slice(0, 40) || [],
      fieldCatalogMeta: payload.fieldCatalogMeta?.slice(0, 20) || []
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
      rows = rows.slice().sort(
        (a, b) => dir * compareValues(getRecordFieldValue(a, sort.field), getRecordFieldValue(b, sort.field))
      );
    }

    const total = rows.length;
    rows = rows.slice(0, limit).map((record) => {
      if (!select?.length) return record;
      const fields = {};
      for (const key of select) {
        if (key === "path") continue;
        const value = getRecordFieldValue(record, key);
        if (value != null) {
          const entry = record.fields?.[key];
          fields[key] =
            entry != null && typeof entry === "object" && "value" in entry
              ? { ...entry, value }
              : value;
        }
      }
      return { path: record.path, schemaContext: record.schemaContext || null, fields };
    });

    return {
      mode: "field-query",
      scope: "workspace",
      model: index.model,
      builtAt: index.builtAt,
      pathPrefix: pathPrefix || null,
      fieldCatalog: index.fieldCatalog,
      fieldCatalogMeta: index.fieldCatalogMeta || [],
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
        fieldCatalogMeta: [],
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
        return Object.entries(row.fields || {}).some(([key, entry]) => {
          const value = getRecordFieldValue({ fields: { [key]: entry } }, key);
          const title = entry && typeof entry === "object" ? entry.title : "";
          const type = entry && typeof entry === "object" ? entry.type : "";
          return (
            key.toLowerCase().includes(needle) ||
            String(value).toLowerCase().includes(needle) ||
            String(title || "").toLowerCase().includes(needle) ||
            String(type || "").toLowerCase().includes(needle)
          );
        });
      });
    }

    const total = rows.length;
    const start = Math.max(Number(offset) || 0, 0);
    const take = Math.min(Math.max(Number(limit) || 40, 1), 200);
    const items = rows.slice(start, start + take).map((row) => ({
      path: row.path,
      schemaContext: row.schemaContext || null,
      schemaTarget: row.schemaTarget || null,
      manifestRel: row.manifestRel || null,
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
      fieldCatalogMeta: index.fieldCatalogMeta || [],
      total,
      offset: start,
      limit: take,
      pathPrefix: prefix || null,
      query: needle || null,
      field: fieldNeedle || null,
      items
    };
  }

  async function getFieldValues({ field = "", q = "", limit = 60, pathPrefix = "" } = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");

    const fieldKey = String(field || "").trim();
    if (!fieldKey) {
      return { ready: false, field: null, values: [], total: 0, hint: "field is required" };
    }

    const index = await loadIndex(agentRoot);
    if (!index?.records?.length) {
      return {
        ready: false,
        field: fieldKey,
        values: [],
        total: 0,
        hint: "Каталог полей не построен"
      };
    }

    const prefix = String(pathPrefix || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const needle = String(q || "").trim().toLowerCase();
    const take = Math.min(Math.max(Number(limit) || 60, 1), 200);
    const counts = new Map();

    for (const record of index.records) {
      if (prefix && !record.path.startsWith(prefix)) continue;
      if (!Object.prototype.hasOwnProperty.call(record.fields || {}, fieldKey)) continue;
      const value = getRecordFieldValue(record, fieldKey);
      if (value == null || value === "") continue;
      const text =
        typeof value === "object" ? JSON.stringify(value) : Array.isArray(value) ? value.join(", ") : String(value);
      if (needle && !text.toLowerCase().includes(needle)) continue;
      counts.set(text, (counts.get(text) || 0) + 1);
    }

    const values = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
      .map(([value]) => value);

    return {
      ready: true,
      field: fieldKey,
      pathPrefix: prefix || null,
      query: needle || null,
      values: values.slice(0, take),
      total: values.length
    };
  }

  return { rebuildIndex, getStatus, getFieldCatalog, getFieldValues, query, catalog, updateFile };
}

module.exports = { createStorageIndexService };
