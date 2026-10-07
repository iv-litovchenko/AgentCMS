const fs = require("fs/promises");
const path = require("path");
const yaml = require("js-yaml");
const { parseTypeYaml } = require("../awn/awn-yaml-utils");
const { rel } = require("../paths/agent-cms");

const REGISTRY_QUERIES_MODEL = "workspace-registry-queries-v1";
const REGISTRY_QUERIES_REL = `${rel.settings.dir}/registry-queries.yml`;
const REGISTRY_QUERIES_PRESETS_KEY = "registry-query-presets";

const VALID_SOURCES = new Set([
  "storage-index",
  "runtime-always-context",
  "runtime-cron",
  "runtime-heartbeat",
  "runtime-topic",
  "nav-focus",
  "nav-main"
]);

const DEFAULT_REGISTRY_QUERIES = [
  {
    id: "always-context",
    name: "Всегда в контексте",
    comment: "Записи с awn-runtime-load-always (storage-index). Системные MD — отдельно через list_workspace_always_context.",
    source: "storage-index",
    query: {
      where: [{ field: "awn-runtime-load-always", eq: true }],
      fields: ["path", "awn-name", "awn-description", "awn-type"],
      sort: { field: "path", dir: "asc" },
      limit: 500
    }
  },
  {
    id: "cron",
    name: "Cron",
    comment: "Темы и записи с awn-runtime-cron (расписание в awn-runtime-cron-schedule).",
    source: "storage-index",
    query: {
      where: [{ field: "awn-runtime-cron", eq: true }],
      fields: ["path", "awn-name", "awn-description", "awn-runtime-cron-schedule"],
      sort: { field: "path", dir: "asc" },
      limit: 500
    }
  },
  {
    id: "heartbeat",
    name: "Сердцебиение",
    comment: "Записи с awn-runtime-heartbeat — периодическая проверка агентом.",
    source: "storage-index",
    query: {
      where: [{ field: "awn-runtime-heartbeat", eq: true }],
      fields: ["path", "awn-name", "awn-description"],
      sort: { field: "path", dir: "asc" },
      limit: 500
    }
  },
  {
    id: "nav-main",
    name: "На главной",
    comment: "awn-main в frontmatter (SQL-like через storage-index).",
    source: "storage-index",
    query: {
      where: [{ field: "awn-main", eq: true }],
      fields: ["path", "awn-name", "awn-description"],
      sort: { field: "path", dir: "asc" },
      limit: 500
    }
  },
  {
    id: "nav-focus",
    name: "В фокусе",
    comment: "awn-focus в frontmatter. Альтернатива: source nav-focus (кэш .agent-cms/state/nav-registry).",
    source: "storage-index",
    query: {
      where: [{ field: "awn-focus", eq: true }],
      fields: ["path", "awn-name", "awn-description"],
      sort: { field: "path", dir: "asc" },
      limit: 500
    }
  },
  {
    id: "topics",
    name: "Темы",
    comment: "Манифесты тем (awn-type awn.page.topic), storage-index.",
    source: "storage-index",
    query: {
      where: [{ field: "awn-type", eq: "awn.page.topic" }],
      fields: ["path", "awn-name", "awn-description"],
      sort: { field: "path", dir: "asc" },
      limit: 500
    }
  },
  {
    id: "recent-records",
    name: "Последние записи",
    comment:
      "Записи с awn-id, сортировка по убыванию id (недавно присвоенные). Опционально pathPrefix — только внутри темы.",
    source: "storage-index",
    query: {
      where: [{ field: "awn-id", gte: 1 }],
      fields: ["path", "awn-name", "awn-type", "awn-id"],
      sort: { field: "awn-id", dir: "desc" },
      limit: 50
    }
  },
  {
    id: "updated-last-7-days",
    name: "Изменены за 7 дней",
    comment:
      "Поле awn-update (ISO) не старше 7 суток. relativeDays пересчитывается при run_workspace_registry_query.",
    source: "storage-index",
    query: {
      relativeDays: 7,
      fields: ["path", "awn-name", "awn-update", "awn-create"],
      sort: { field: "awn-update", dir: "desc" },
      limit: 100
    }
  }
];

function registryQueriesAbs(agentRoot) {
  return path.join(agentRoot, REGISTRY_QUERIES_REL);
}

function normalizeQueryEntry(raw, index = 0) {
  const entry = raw && typeof raw === "object" ? raw : {};
  const id = String(entry.id || `query-${index + 1}`)
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  const source = String(entry.source || "storage-index").trim();
  if (!VALID_SOURCES.has(source)) {
    throw new Error(`Invalid registry query source "${source}" for id "${id}"`);
  }
  return {
    id,
    name: String(entry.name || id).trim() || id,
    comment: String(entry.comment || "").trim(),
    source,
    query: entry.query && typeof entry.query === "object" ? entry.query : undefined
  };
}

function buildDefaultCatalogDoc() {
  return {
    version: 1,
    model: REGISTRY_QUERIES_MODEL,
    description:
      "Именованные выборки для агента: storage-index (SQL-like) или готовые runtime-сборки. MCP: list_workspace_registry_queries, run_workspace_registry_query.",
    queries: DEFAULT_REGISTRY_QUERIES.map((q) => ({ ...q }))
  };
}

function mergeWithDefaultQueries(queries) {
  const list = Array.isArray(queries) ? queries : [];
  const byId = new Map(DEFAULT_REGISTRY_QUERIES.map((q) => [q.id, { ...q }]));
  for (const raw of list) {
    try {
      const normalized = normalizeQueryEntry(raw);
      byId.set(normalized.id, { ...byId.get(normalized.id), ...normalized });
    } catch {
      // skip invalid custom rows when merging file over defaults
    }
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "ru"));
}

function parseCatalogDoc(parsed) {
  const doc = parsed && typeof parsed === "object" ? parsed : {};
  const queries = mergeWithDefaultQueries(doc.queries);
  return {
    version: Number(doc.version) || 1,
    model: String(doc.model || REGISTRY_QUERIES_MODEL),
    description: String(doc.description || buildDefaultCatalogDoc().description).trim(),
    queries
  };
}

async function readRegistryQueriesFile(agentRoot) {
  const abs = registryQueriesAbs(agentRoot);
  try {
    const content = await fs.readFile(abs, "utf-8");
    const parsed = parseTypeYaml(content);
    return { exists: true, path: REGISTRY_QUERIES_REL, content, catalog: parseCatalogDoc(parsed) };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      const catalog = buildDefaultCatalogDoc();
      return { exists: false, path: REGISTRY_QUERIES_REL, content: "", catalog };
    }
    throw error;
  }
}

async function loadRegistryQueriesCatalog(agentRoot) {
  const file = await readRegistryQueriesFile(agentRoot);
  return file.catalog;
}

function catalogToYaml(catalog) {
  const doc = {
    version: catalog.version || 1,
    model: catalog.model || REGISTRY_QUERIES_MODEL,
    description: catalog.description || "",
    queries: (catalog.queries || []).map((q) => {
      const row = {
        id: q.id,
        name: q.name,
        comment: q.comment || undefined,
        source: q.source
      };
      if (q.query && Object.keys(q.query).length) row.query = q.query;
      return row;
    })
  };
  return yaml.dump(doc, { lineWidth: 120, noRefs: true });
}

async function writeRegistryQueriesYaml(agentRoot, yamlText) {
  const abs = registryQueriesAbs(agentRoot);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const text = String(yamlText ?? "").trim();
  let catalog;
  if (!text) {
    catalog = buildDefaultCatalogDoc();
  } else {
    const parsed = parseTypeYaml(text);
    catalog = parseCatalogDoc(parsed);
  }
  const content = `${catalogToYaml(catalog)}\n`;
  await fs.writeFile(abs, content, "utf-8");
  return { path: REGISTRY_QUERIES_REL, catalog, content };
}

function queryObjectToPresetText(query) {
  if (!query || typeof query !== "object" || !Object.keys(query).length) return "";
  return yaml.dump(query, { lineWidth: 120, noRefs: true }).trim();
}

function parsePresetQueryText(text) {
  const raw = String(text ?? "").trim();
  if (!raw) return undefined;
  const parsed = parseTypeYaml(raw);
  return parsed && typeof parsed === "object" ? parsed : undefined;
}

function catalogQueryToPresetItem(entry) {
  return {
    id: entry.id,
    name: entry.name,
    comment: String(entry.comment || "").trim(),
    query: queryObjectToPresetText(entry.query)
  };
}

function getBuiltinRegistryQueryPresetsUi() {
  return DEFAULT_REGISTRY_QUERIES.map((entry) => catalogQueryToPresetItem(entry));
}

function catalogToPresetItems(catalog) {
  const queries = Array.isArray(catalog?.queries) ? catalog.queries : DEFAULT_REGISTRY_QUERIES;
  return queries.map((q) => catalogQueryToPresetItem(q));
}

function defaultQueryForBuiltinId(id) {
  const builtin = DEFAULT_REGISTRY_QUERIES.find((q) => q.id === id);
  return builtin?.query && typeof builtin.query === "object" ? { ...builtin.query } : undefined;
}

function presetItemToCatalogQuery(raw, index = 0) {
  const item = raw && typeof raw === "object" ? raw : {};
  const id = String(item.id || `query-${index + 1}`)
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
  const legacySource = String(item.source || "").trim();
  const query = parsePresetQueryText(item.query) || defaultQueryForBuiltinId(id);
  const builtin = DEFAULT_REGISTRY_QUERIES.find((q) => q.id === id);
  const source =
    legacySource && VALID_SOURCES.has(legacySource)
      ? legacySource
      : builtin?.source || "storage-index";
  const base = {
    id,
    name: String(item.name || builtin?.name || id).trim() || id,
    comment: String(item.description || item.comment || builtin?.comment || "").trim(),
    source
  };
  if (query) base.query = query;
  return normalizeQueryEntry(base, index);
}

function presetsToCatalogDoc(presets) {
  const list = Array.isArray(presets) ? presets : [];
  const queries = list.length
    ? list.map((item, index) => presetItemToCatalogQuery(item, index))
    : DEFAULT_REGISTRY_QUERIES.map((q) => ({ ...q }));
  return {
    version: 1,
    model: REGISTRY_QUERIES_MODEL,
    description: buildDefaultCatalogDoc().description,
    queries
  };
}

async function writeRegistryQueriesFromPresets(agentRoot, presets) {
  const catalog = presetsToCatalogDoc(presets);
  const content = `${catalogToYaml(catalog)}\n`;
  const abs = registryQueriesAbs(agentRoot);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, content, "utf-8");
  return { path: REGISTRY_QUERIES_REL, catalog, content };
}

function findRegistryQuery(catalog, id) {
  const key = String(id || "").trim();
  if (!key) return null;
  return (catalog.queries || []).find((q) => q.id === key) || null;
}

function navRegistryToRows(registry, kind) {
  const items = Array.isArray(registry?.items) ? registry.items : [];
  return {
    model: registry?.model || kind,
    total: items.length,
    rows: items.map((item) => ({
      path: item.path || item.ref || item.manifestPath || item.displayPath || "",
      fields: {
        label: item.label,
        description: item.description,
        entityKind: item.entityKind,
        slot: item.slot,
        ref: item.ref
      }
    }))
  };
}

function runtimeRegistryToRows(registry) {
  const items = Array.isArray(registry?.items) ? registry.items : registry?.topics ? registry.topics : [];
  return {
    model: registry?.model || "runtime-registry",
    total: items.length,
    rows: items.map((item) => ({
      path: item.manifestPath || item.ref || item.displayPath || "",
      fields: {
        label: item.label,
        description: item.description,
        entityKind: item.entityKind,
        runtimeCronSchedule: item.runtimeCronSchedule,
        runtimeHeartbeat: item.runtimeHeartbeat,
        awnType: item.awnType
      }
    }))
  };
}

function resolveStorageQueryPayload(query) {
  const base = query && typeof query === "object" ? { ...query } : {};
  const days = Number(base.relativeDays);
  if (Number.isFinite(days) && days > 0) {
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const where = Array.isArray(base.where) ? [...base.where] : [];
    if (!where.some((row) => String(row?.field || "").trim() === "awn-update")) {
      where.push({ field: "awn-update", gte: since });
    }
    base.where = where;
  }
  delete base.relativeDays;
  return base;
}

/**
 * @param {object} entry - catalog query entry
 * @param {object} runners - injected from server
 */
async function runRegistryQuery(entry, runners) {
  const source = entry.source;
  if (source === "storage-index") {
    const payload = resolveStorageQueryPayload(
      entry.query && typeof entry.query === "object" ? entry.query : {}
    );
    const result = await runners.queryStorage(payload);
    return {
      source,
      storage: result,
      total: result?.total ?? result?.results?.length ?? 0,
      rows: result?.results || []
    };
  }

  if (source === "runtime-cron") {
    const registry = await runners.getCronRegistry();
    const shaped = runtimeRegistryToRows(registry);
    return { source, registry, ...shaped };
  }

  if (source === "runtime-heartbeat") {
    const registry = await runners.getHeartbeatRegistry();
    const shaped = runtimeRegistryToRows(registry);
    return { source, registry, ...shaped };
  }

  if (source === "runtime-always-context") {
    const registry = await runners.getAlwaysContextRegistry();
    const shaped = runtimeRegistryToRows(registry);
    return { source, registry, ...shaped };
  }

  if (source === "runtime-topic") {
    const registry = await runners.getTopicRegistry();
    const shaped = runtimeRegistryToRows(registry);
    return { source, registry, ...shaped };
  }

  if (source === "nav-focus") {
    const registry = await runners.getNavFocusRegistry();
    const shaped = navRegistryToRows(registry, "nav-focus");
    return { source, registry, ...shaped };
  }

  if (source === "nav-main") {
    const registry = await runners.getNavMainRegistry();
    const shaped = navRegistryToRows(registry, "nav-main");
    return { source, registry, ...shaped };
  }

  throw new Error(`Unsupported registry query source: ${source}`);
}

async function runRegistryQueryById(agentRoot, id, runners) {
  const catalog = await loadRegistryQueriesCatalog(agentRoot);
  const entry = findRegistryQuery(catalog, id);
  if (!entry) {
    throw new Error(`Unknown registry query id "${id}"`);
  }
  const data = await runRegistryQuery(entry, runners);
  return {
    ok: true,
    registryId: entry.id,
    name: entry.name,
    comment: entry.comment,
    source: entry.source,
    ...data
  };
}

module.exports = {
  REGISTRY_QUERIES_MODEL,
  REGISTRY_QUERIES_REL,
  REGISTRY_QUERIES_PRESETS_KEY,
  DEFAULT_REGISTRY_QUERIES,
  VALID_SOURCES,
  buildDefaultCatalogDoc,
  loadRegistryQueriesCatalog,
  readRegistryQueriesFile,
  writeRegistryQueriesYaml,
  writeRegistryQueriesFromPresets,
  catalogToYaml,
  catalogToPresetItems,
  presetsToCatalogDoc,
  getBuiltinRegistryQueryPresetsUi,
  defaultQueryForBuiltinId,
  queryObjectToPresetText,
  parsePresetQueryText,
  findRegistryQuery,
  runRegistryQuery,
  runRegistryQueryById
};
