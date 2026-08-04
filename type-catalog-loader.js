const fs = require("fs");
const path = require("path");
const { loadYamlFileSync } = require("./awn-yaml-utils");
const {
  getAgentCmsCoreAbsolute,
  getCmsConfigAbsolute,
  TYPE_DOMAINS,
  AGENT_TYPE_DOMAINS,
  CMS_CONFIG_REL
} = require("./platform-sources");
const {
  editingFieldsStoreHasRecords,
  ingestFieldsIntoCatalog
} = require("./awn-data-fields-bridge");
const {
  DOMAIN_TYPE_STORES,
  ingestDomainTypesFromAwnData,
  cmsConfigExists
} = require("./awn-data-types-bridge");

const WORKSPACE_STATUS_ACTIVE = "🟢 Открыта";

const ACTIVE_STATUS = new Set(["active", "deprecated"]);

/** Legacy id → canonical id (манifests могут ещё использовать старые awn-type). */
const TYPE_ID_ALIASES = {
  // Page aliases
  "awn.page": "awn.page.base",
  "awn.entity": "awn.table.base",
  "awn.workspace": "awn.page.ws",
  "awn.area": "awn.page.area",
  "awn.topic": "awn.page.topic",
  // Legacy page ids → section / agent-kit topics
  "awn.page.area": "awn.page.section",
  "awn.page.topic.agent": "awn.page.topic.agent-kit.agent",
  "awn.page.topic.user": "awn.page.topic.agent-kit.user",
  "awn.page.topic.users": "awn.page.topic.agent-kit.users",
  "awn.page.topic.rules": "awn.page.topic.agent-kit.rules",
  "awn.page.topic.voice-tts": "awn.page.topic.agent-kit.voice-tts",
  "awn.page.topic.voice-sst": "awn.page.topic.agent-kit.voice-sst",
  "awn.record": "awn.content.record",
  "awn.sidecar": "awn.content.sidecar",
  "awn.record.category": "awn.content.category",
  "awn.content.record.category": "awn.content.category",
  "awn.media.category": "awn.content.category",
  "awn.dialog": "awn.content.dialog",
  "awn.comment": "awn.content.comment",
  "awn.page.service-doc": "awn.page.topic",
  // Taxonomy field aliases (awn.taxonomy.* → agent.taxonomy.*)
  "awn.taxonomy.categories": "agent.taxonomy.categories",
  "awn.taxonomy.colors": "agent.taxonomy.colors",
  "awn.taxonomy.priorities": "agent.taxonomy.priorities",
  "awn.taxonomy.statuses": "agent.taxonomy.statuses",
  "awn.taxonomy.tags": "agent.taxonomy.tags",
  "awn.taxonomy.tax": "agent.taxonomy.tax",
  // Field type aliases (old → new namespace awn.field.*)
  "awn.field-def": "awn.field.base",
  "awn.string": "awn.field.string",
  "awn.text": "awn.field.text",
  "awn.boolean": "awn.field.boolean",
  "awn.integer": "awn.field.integer",
  "awn.number": "awn.field.number",
  "awn.date": "awn.field.date",
  "awn.datetime": "awn.field.datetime",
  "awn.color": "awn.field.color",
  "awn.url": "awn.field.url",
  "awn.link": "awn.field.link",
  "awn.file": "awn.field.file",
  "awn.enum": "awn.field.enum",
  "awn.enum-select": "awn.field.enum",
  "awn.enum-radio": "awn.field.enum",
  "awn.array": "awn.field.array",
  "awn.array-checkbox": "awn.field.array",
  "awn.array-select-multiple": "awn.field.array",
  "awn.null": "awn.field.base",
  // Slot aliases
  "awn.slot.scripts": "awn.slot.script",
  "awn.slot.todo": "awn.slot.todo-single",
  "awn.slot.log": "awn.slot.log-single",
  "awn.slot.thread": "awn.slot.dialogs",
  "awn.slot.quick-notes": "awn.slot.note"
};

function normalizeLegacyCatalogPath(catalogPath) {
  let normalized = String(catalogPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return "";

  if (normalized.startsWith("awn-system/types/")) {
    const rest = normalized.slice("awn-system/types/".length).replace(/\.ya?ml$/i, ".md");
    const domain = rest.split("/")[0];
    const store = DOMAIN_TYPE_STORES[domain];
    if (store) return `awn-data/${store}/${rest.slice(domain.length + 1)}`;
  }

  normalized = normalized.replace(
    /^awn-data\/(pages|content|slots|base|mixins|settings)\/types\//,
    "awn-data/$1/"
  );

  const legacyPlatform = normalized.match(
    /^types\/([^/]+)\/awn-storage\/configuration\/types\/(.+)\.ya?ml$/i
  );
  if (legacyPlatform) {
    const store = DOMAIN_TYPE_STORES[legacyPlatform[1]];
    if (store) return `awn-data/${store}/${legacyPlatform[2]}.md`;
  }

  return normalized;
}

function resolveAgentRootAbsolute(agentRoot, projectRoot) {
  const raw = String(agentRoot || "").trim();
  if (!raw) return "";
  return path.isAbsolute(raw) ? raw : path.join(projectRoot || process.cwd(), raw);
}

// Метаданные встроенных доменов (label + kind нового типа). registry.yml может
// переопределять их и добавлять свои домены («пакеты»).
const BUILTIN_DOMAIN_META = {
  base: { label: "Base", kind: "base" },
  pages: { label: "Pages", kind: "type" },
  content: { label: "Content", kind: "type" },
  slots: { label: "Slots", kind: "slot" },
  fields: { label: "Fields", kind: "field" },
  "md-blocks": { label: "Markdown blocks", kind: "block" },
  taxonomies: { label: "Taxonomies", kind: "taxonomy" },
  mixins: { label: "Mixins", kind: "mixin" }
};

function normalizeDomainEntry(raw) {
  if (typeof raw === "string") {
    const id = raw.trim();
    return id ? { id } : null;
  }
  if (raw && typeof raw === "object" && raw.id) {
    const id = String(raw.id).trim();
    if (!id) return null;
    const out = { id };
    if (raw.label) out.label = String(raw.label);
    if (raw.kind) out.kind = String(raw.kind);
    if (raw.icon) out.icon = String(raw.icon);
    if (raw.extends) out.extends = String(raw.extends);
    if (raw.prefix) out.prefix = String(raw.prefix);
    return out;
  }
  return null;
}

/**
 * Единый источник правды для списка доменов агента: встроенные (в коде) +
 * объявленные в awn-system/registry.yml (domains:). registry может добавлять
 * новые домены-«пакеты» и переопределять label/kind встроенных.
 * Формат domains: список строк ["base", ...] ИЛИ объектов {id,label,kind,icon}.
 */
function resolveAgentDomainManifest(cmsConfigRoot) {
  const map = new Map();
  for (const id of AGENT_TYPE_DOMAINS) {
    const meta = BUILTIN_DOMAIN_META[id] || {};
    map.set(id, { id, label: meta.label || id, kind: meta.kind || "type", builtin: true });
  }
  if (cmsConfigRoot) {
    try {
      const registry = loadYamlFileSync(path.join(cmsConfigRoot, "registry.yml"), {});
      const declared = Array.isArray(registry?.domains) ? registry.domains : [];
      for (const raw of declared) {
        const entry = normalizeDomainEntry(raw);
        if (!entry) continue;
        const existing = map.get(entry.id);
        if (existing) {
          if (entry.label) existing.label = entry.label;
          if (entry.kind) existing.kind = entry.kind;
          if (entry.icon) existing.icon = entry.icon;
          if (entry.extends) existing.extends = entry.extends;
          if (entry.prefix) existing.prefix = entry.prefix;
        } else {
          map.set(entry.id, {
            id: entry.id,
            label: entry.label || entry.id,
            kind: entry.kind || "type",
            icon: entry.icon,
            extends: entry.extends,
            prefix: entry.prefix,
            builtin: false
          });
        }
      }
    } catch {}
  }
  return [...map.values()];
}

function resolveAgentDomainIds(cmsConfigRoot) {
  return resolveAgentDomainManifest(cmsConfigRoot).map((d) => d.id);
}

function loadTypeCatalog(projectRoot = process.cwd(), agentRoot = "") {
  const coreRoot = getAgentCmsCoreAbsolute(projectRoot);
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot, projectRoot);
  const coreConfigRoot = path.join(coreRoot, CMS_CONFIG_REL);
  const agentConfigRoot = agentRootAbs ? getCmsConfigAbsolute(agentRootAbs) : "";
  const byId = new Map();
  const byDomain = {};
  const sources = ["platform:agent-cms-core/awn-data"];
  const useAwnDataFields = editingFieldsStoreHasRecords(projectRoot);

  for (const domain of TYPE_DOMAINS) {
    if (domain === "fields" && useAwnDataFields) continue;
    ingestDomainTypesFromAwnData(projectRoot, domain, "platform", byId, byDomain, coreRoot);
  }

  for (const domain of ["mixins", "settings"]) {
    ingestDomainTypesFromAwnData(projectRoot, domain, "platform", byId, byDomain, coreRoot);
  }

  const isCoreAgent =
    agentConfigRoot &&
    cmsConfigExists(agentRootAbs, projectRoot) &&
    path.resolve(agentConfigRoot) !== path.resolve(coreConfigRoot);

  if (isCoreAgent) {
    sources.push(`${CMS_CONFIG_REL}:agent`);
    for (const domain of resolveAgentDomainIds(agentConfigRoot)) {
      if (domain === "fields" && useAwnDataFields) continue;
      ingestDomainTypesFromAwnData(projectRoot, domain, "agent", byId, byDomain, agentRootAbs);
    }
  }

  if (useAwnDataFields) {
    ingestFieldsIntoCatalog(projectRoot, byId, byDomain);
    sources.push("platform:awn-data/editing-fields");
  }

  applyTypeAliases(byId);

  return {
    coreRoot,
    agentRoot: agentRootAbs,
    agentSystemRoot: agentConfigRoot || coreConfigRoot,
    sources,
    byId,
    byDomain
  };
}

function applyTypeAliases(byId) {
  for (const [aliasId, canonicalId] of Object.entries(TYPE_ID_ALIASES)) {
    if (byId.has(aliasId)) continue;
    const canonical = byId.get(canonicalId);
    if (!canonical) continue;
    byId.set(aliasId, {
      ...canonical,
      id: aliasId,
      aliasOf: canonicalId,
      schema: canonical.schema ? { ...canonical.schema, id: aliasId } : canonical.schema
    });
  }
}

function resolveCanonicalTypeId(typeId, byId) {
  const raw = String(typeId || "").trim();
  if (!raw) return "";
  if (byId.has(raw)) {
    const entry = byId.get(raw);
    return entry?.aliasOf || raw;
  }
  return TYPE_ID_ALIASES[raw] || raw;
}

function mergeTypeSchema(entry, byId, visited = new Set()) {
  if (!entry || visited.has(entry.id)) return {};
  visited.add(entry.id);

  let merged = {};
  if (entry.extends) {
    const parent = byId.get(entry.extends);
    if (parent) merged = { ...mergeTypeSchema(parent, byId, visited), ...merged };
  }

  const schema = entry.schema && typeof entry.schema === "object" ? { ...entry.schema } : {};
  if (schema.fields && typeof schema.fields === "object") {
    merged.fields = { ...(merged.fields || {}), ...schema.fields };
  }
  if (schema.properties && typeof schema.properties === "object") {
    merged.properties = { ...(merged.properties || {}), ...schema.properties };
  }
  if (Array.isArray(schema.mixins)) {
    merged.mixins = [...new Set([...(merged.mixins || []), ...schema.mixins])];
  }
  for (const [key, value] of Object.entries(schema)) {
    if (["fields", "properties", "mixins", "extends", "status"].includes(key)) continue;
    merged[key] = value;
  }
  return merged;
}

function isTypeActive(entry) {
  if (!entry) return false;
  return ACTIVE_STATUS.has(String(entry.status || "active").trim());
}

function isCatalogType(entry) {
  if (!entry || !isTypeActive(entry)) return false;
  const baseNames = new Set(["_base", "base", "table.base", "row.base"]);
  if (baseNames.has(entry.fileName)) return false;
  if (entry.kind === "entity" || entry.kind === "base" || entry.kind === "table" || entry.kind === "row" || entry.kind === "component") return false;
  return true;
}

function inheritsFrom(typeId, ancestorId, byId) {
  const seen = new Set();
  let current = byId.get(typeId);
  while (current && !seen.has(current.id)) {
    if (current.id === ancestorId) return true;
    seen.add(current.id);
    if (!current.extends) break;
    current = byId.get(current.extends);
  }
  return false;
}

function getPageTreeRootId(byId) {
  if (byId.has("awn.page.base")) return "awn.page.base";
  if (byId.has("awn.row.base")) return "awn.row.base";
  if (byId.has("awn.base")) return "awn.base";
  if (byId.has("awn.page")) return "awn.page";
  return null;
}

function isPageTreeType(typeId, byId) {
  const root = getPageTreeRootId(byId);
  if (!root || !typeId) return false;
  if (typeId === root) return true;
  return inheritsFrom(typeId, root, byId);
}

function getActiveTypes(projectRoot, domain = null, kind = null, agentRoot = "") {
  const { byId, byDomain } = loadTypeCatalog(projectRoot, agentRoot);
  const pool = domain ? byDomain[domain] || [] : [...byId.values()];
  return pool.filter((entry) => {
    if (!isCatalogType(entry)) return false;
    if (kind && entry.kind !== kind) return false;
    return true;
  });
}

function toTypeBrowseEntry(entry, byId, pageRoot) {
  if (!entry || !isTypeActive(entry)) return null;
  return {
    id: entry.id,
    domain: entry.domain,
    fileName: entry.fileName,
    catalogFile:
      entry.catalogFile ||
      `awn-data/${DOMAIN_TYPE_STORES[entry.domain] || entry.domain}/${entry.relPath || entry.fileName}.md`,
    source: entry.source || "platform",
    kind: entry.kind || entry.schema?.kind || null,
    status: entry.status,
    extends: entry.extends,
    name: entry.schema?.name || entry.id,
    description: entry.schema?.description || "",
    relPath: entry.relPath,
    registrable: isCatalogType(entry),
    inPageTree: pageRoot ? inheritsFrom(entry.id, pageRoot, byId) : false
  };
}

function getTypeCatalogPayload(projectRoot = process.cwd(), agentRoot = "") {
  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  const { byId, byDomain, coreRoot, agentSystemRoot, sources } = catalog;
  const pageRoot = getPageTreeRootId(byId);

  const browseTypes = [];
  const types = [];
  for (const entry of byId.values()) {
    if (entry.aliasOf) continue;
    const browseEntry = toTypeBrowseEntry(entry, byId, pageRoot);
    if (browseEntry) browseTypes.push(browseEntry);
    if (!isCatalogType(entry)) continue;
    types.push({
      ...browseEntry,
      schema: mergeTypeSchema(entry, byId)
    });
  }

  const byKind = {};
  for (const t of types) {
    const k = t.kind || "unknown";
    if (!byKind[k]) byKind[k] = [];
    byKind[k].push(t.id);
  }

  const domains = {};
  for (const [domain, entries] of Object.entries(byDomain)) {
    domains[domain] = entries.map((e) => ({
      id: e.id,
      fileName: e.fileName,
      status: e.status,
      active: isCatalogType(e)
    }));
  }

  return {
    specVersion: "1.1",
    model: "type-catalog",
    coreRoot: coreRoot.replace(/\\/g, "/"),
    agentSystemRoot: agentSystemRoot ? agentSystemRoot.replace(/\\/g, "/") : null,
    sources,
    pageTreeRoot: pageRoot,
    domains,
    types,
    browseTypes,
    foundationTypes: collectFoundationTypes(byId, pageRoot),
    byKind
  };
}

function isFoundationType(entry) {
  if (!entry || !isTypeActive(entry)) return false;
  if (entry.kind === "entity" || entry.kind === "base" || entry.kind === "table" || entry.kind === "row") return true;
  const baseNames = new Set(["_base", "base", "table.base", "row.base"]);
  return baseNames.has(entry.fileName);
}

function collectFoundationTypes(byId, pageRoot) {
  const out = [];
  for (const entry of byId.values()) {
    if (entry.aliasOf || !isFoundationType(entry)) continue;
    const browseEntry = toTypeBrowseEntry(entry, byId, pageRoot);
    if (!browseEntry) continue;
    const merged = mergeTypeSchema(entry, byId);
    out.push({
      ...browseEntry,
      kind: entry.kind || merged.kind || "base",
      fieldCount: merged.fields ? Object.keys(merged.fields).length : 0
    });
  }
  return out.sort((a, b) => String(a.id).localeCompare(String(b.id), "ru"));
}

function findTypeEntryByCatalogPath(byId, catalogPath) {
  const normalized = normalizeLegacyCatalogPath(catalogPath);
  if (!normalized) return null;
  for (const entry of byId.values()) {
    if (entry.catalogFile === normalized) return entry;
  }
  return null;
}

function buildInheritanceChain(entry, byId) {
  const chain = [];
  const seen = new Set();
  let current = entry;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.push({
      id: current.id,
      name: current.schema?.name || current.id,
      kind: current.kind || current.schema?.kind || null,
      catalogFile: current.catalogFile || null
    });
    if (!current.extends) break;
    current = byId.get(current.extends);
  }
  return chain;
}

function splitOwnAndInheritedFields(entry, byId) {
  const merged = mergeTypeSchema(entry, byId);
  const mergedFields =
    merged.fields && typeof merged.fields === "object" ? { ...merged.fields } : {};
  const ownFields =
    entry.schema?.fields && typeof entry.schema.fields === "object" ? { ...entry.schema.fields } : {};
  const inheritedFields = {};

  const assignInheritedFrom = (typeId) => {
    const typeEntry = byId.get(typeId);
    if (!typeEntry) return;
    const own =
      typeEntry.schema?.fields && typeof typeEntry.schema.fields === "object"
        ? typeEntry.schema.fields
        : {};
    for (const [key, def] of Object.entries(own)) {
      if (ownFields[key] || inheritedFields[key]) continue;
      inheritedFields[key] = { ...def, fromType: typeId };
    }
    if (typeEntry.extends) assignInheritedFrom(typeEntry.extends);
  };

  if (entry.extends) assignInheritedFrom(entry.extends);

  return { mergedFields, ownFields, inheritedFields };
}

/**
 * Что в рантайме РЕАЛЬНО читает этот тип: список потребителей + флаг wired.
 * Отвечает на вопрос «влияет он на систему или это просто данные для агента».
 */
function getTypeUsage(entry, merged, byId) {
  const consumers = [];
  let wired = false;
  let note = "";

  if (isFoundationType(entry)) {
    let children = 0;
    for (const e of byId.values()) {
      if (!e.aliasOf && e.extends === entry.id) children += 1;
    }
    if (children > 0) {
      consumers.push(`фундамент — наследуется типами (${children})`);
      wired = true;
    } else {
      note = "фундамент, но никто от него не наследует";
    }
    return { wired, consumers, note };
  }

  switch (entry.domain) {
    case "fields": {
      if (merged.widget) {
        consumers.push(`формы (виджет «${merged.widget}»)`);
        wired = true;
      } else {
        note = "нет widget — получит дефолтный ввод";
      }
      break;
    }
    case "slots": {
      // Реальность: набор слотов в дереве фиксирован рантаймом (скан папок
      // awn-storage). Тип слота — декларация/документация: словарь драйвера
      // (internal/external/tabular) совпадает с формами памяти в счётчике узла,
      // но сам тип рантайм в дерево не подставляет.
      const driver = merged["storage-driver"];
      if (driver) {
        const ru = { internal: "Однофайловая", external: "Многофайловая", tabular: "Табличная" };
        note = `декларирует драйвер «${driver}» (${ru[driver] || driver}); набор слотов в дереве фиксирован рантаймом`;
      } else {
        note = "набор слотов в дереве фиксирован рантаймом — тип слота пока декларация";
      }
      break;
    }
    case "md-blocks": {
      const render = merged.render || "template";
      if (merged.template || merged.text) {
        consumers.push("палитра блоков редактора");
        wired = true;
      } else note = "нет template — нечего вставлять";
      if (render === "fence") {
        if (merged.renderer) consumers.push(`JS-рендер (${merged.renderer})`);
        else note = (note ? note + "; " : "") + "render: fence без renderer";
      }
      break;
    }
    case "taxonomies": {
      if (merged["props-field"]) {
        consumers.push(`поле темы «${merged["props-field"]}»`);
        wired = true;
      }
      if (merged["data-path"]) consumers.push("справочник (awn-data)");
      if (merged["create-node-group"]) consumers.push("меню «создать»");
      if (!consumers.length) note = "нет props-field/data-path — ни к чему не привязан";
      break;
    }
    case "pages":
    case "content": {
      consumers.push("узлы дерева / формы (по полям типа)");
      wired = true;
      if (merged["create-node-group"]) consumers.push("меню «создать»");
      break;
    }
    case "mixins": {
      let users = 0;
      for (const e of byId.values()) {
        if (e.aliasOf) continue;
        const m = e.schema && e.schema.mixins;
        if (Array.isArray(m) && m.includes(entry.id)) users += 1;
      }
      if (users > 0) {
        consumers.push(`подмешивается в типы (${users})`);
        wired = true;
      } else note = "никакой тип не подключает этот миксин";
      break;
    }
    default:
      note = "данные для агента (рантайм CMS их не читает)";
  }

  if (!consumers.length && !note) {
    note = "данные для агента (рантайм CMS их не читает)";
  }
  return { wired, consumers, note };
}

function getTypeDetailByCatalogPath(projectRoot = process.cwd(), agentRoot = "", catalogPath = "") {
  const { byId } = loadTypeCatalog(projectRoot, agentRoot);
  const entry = findTypeEntryByCatalogPath(byId, catalogPath);
  if (!entry) return null;

  const merged = mergeTypeSchema(entry, byId);
  const { mergedFields, ownFields, inheritedFields } = splitOwnAndInheritedFields(entry, byId);
  const chain = buildInheritanceChain(entry, byId);

  return {
    path: String(catalogPath || "").replace(/\\/g, "/"),
    id: entry.id,
    name: merged.name || entry.id,
    kind: merged.kind || entry.kind || null,
    domain: entry.domain,
    status: entry.status,
    extends: entry.extends || merged.extends || null,
    mixins: Array.isArray(merged.mixins) ? [...merged.mixins] : [],
    description: merged.description || "",
    catalogFile: entry.catalogFile,
    source: entry.source || "platform",
    isFoundation: isFoundationType(entry),
    inheritanceChain: chain,
    // Собственные (не унаследованные) скаляры типа — для доменных контролов формы
    // (contentMode, widget, template, data-path…). Показывают реальные значения.
    schema: entry.schema && typeof entry.schema === "object" ? { ...entry.schema } : {},
    mergedSchema: merged,
    ownFields,
    inheritedFields,
    mergedFields,
    fieldCount: Object.keys(mergedFields).length,
    ownFieldCount: Object.keys(ownFields).length,
    storageSlots: Array.isArray(merged["storage-slots"]) ? [...merged["storage-slots"]] : [],
    manifestPattern: merged["manifest-pattern"] || null,
    usage: getTypeUsage(entry, merged, byId)
  };
}

function toRecordTypeDef(entry, byId) {
  const merged = mergeTypeSchema(entry, byId);
  return {
    id: entry.id,
    name: merged.name || entry.id,
    kind: merged.kind || "type",
    extends: entry.extends || merged.extends || null,
    mixins: Array.isArray(merged.mixins) ? [...merged.mixins] : [],
    description: merged.description || "",
    fieldGroups: Array.isArray(merged["field-groups"]) ? [...merged["field-groups"]] : null,
    fields: merged.fields && typeof merged.fields === "object" ? { ...merged.fields } : {}
  };
}

function loadPageTypesFromCatalog(projectRoot, agentRoot = "") {
  const { byId, byDomain } = loadTypeCatalog(projectRoot, agentRoot);
  const types = {};

  for (const domain of ["pages", "content"]) {
    for (const entry of byDomain[domain] || []) {
      if (!isTypeActive(entry)) continue;
      const def = toRecordTypeDef(entry, byId);
      if (def.id) types[def.id] = def;
    }
  }

  // Lean core base (awn.base) — включаем явно, чтобы downstream-загрузчик
  // не подменял его полным awn.page.base через свой fallback.
  const leanBase = byId.get("awn.base");
  if (leanBase && isTypeActive(leanBase)) {
    types[leanBase.id] = toRecordTypeDef(leanBase, byId);
  }

  const base = byId.get("awn.page.base") || byId.get("awn.base") || byId.get("awn.page");
  if (base && isTypeActive(base)) {
    types[base.id] = toRecordTypeDef(base, byId);
  }

  for (const [aliasId, canonicalId] of Object.entries(TYPE_ID_ALIASES)) {
    if (types[aliasId] || !types[canonicalId]) continue;
    types[aliasId] = { ...types[canonicalId], id: aliasId };
  }

  const mixinEntries = [...byId.values()].filter((e) => e.kind === "mixin" && isTypeActive(e));
  for (const entry of mixinEntries) {
    types[entry.id] = toRecordTypeDef(entry, byId);
  }

  return types;
}

function loadFieldTypesFromCatalog(projectRoot, agentRoot = "") {
  const { byId, byDomain } = loadTypeCatalog(projectRoot, agentRoot);
  const registry = {};
  for (const entry of byDomain.fields || []) {
    if (!isCatalogType(entry) || entry.kind !== "field") continue;
    const merged = mergeTypeSchema(entry, byId);
    registry[entry.id] = {
      id: entry.id,
      name: merged.name || entry.id,
      kind: "field",
      storage: merged.storage || "string",
      mdbase: merged.mdbase || entry.id.replace(/^awn\./, ""),
      widget: merged.widget || "input",
      description: merged.description || "",
      settings: Array.isArray(merged.settings) ? [...merged.settings] : undefined,
      format: merged.format,
      catalogDomain: "fields",
      catalogPath: entry.relPath
    };
  }
  return registry;
}

function loadFieldDefFromCatalog(projectRoot, agentRoot = "") {
  const { byId } = loadTypeCatalog(projectRoot, agentRoot);
  const base = byId.get("awn.field-def");
  if (!base) return null;
  const merged = mergeTypeSchema(base, byId);
  if (!merged.properties) return null;
  return {
    id: "awn.field-def",
    name: merged.name || "Мета-свойства поля",
    description: merged.description || "",
    properties: merged.properties
  };
}

function loadBlocksFromCatalog(projectRoot, agentRoot = "") {
  const { byId, byDomain } = loadTypeCatalog(projectRoot, agentRoot);
  const blocksById = {};

  for (const entry of byDomain["md-blocks"] || []) {
    if (!isCatalogType(entry) || entry.kind !== "block") continue;
    const merged = mergeTypeSchema(entry, byId);
    const template = String(merged.template || merged.text || "")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t");
    if (!template) continue;
    blocksById[entry.id] = {
      id: entry.id,
      name: merged.name || entry.id,
      kind: "block",
      group: merged.group || "misc",
      sort: Number(merged.sort) || 0,
      description: merged.description || "",
      icon: String(merged.icon || merged.emoji || "").trim(),
      template,
      render: String(merged.render || "template").trim(),
      fenceTag: String(merged["fence-tag"] || merged.fenceTag || "").trim(),
      renderer: String(merged.renderer || "").trim(),
      catalogPath: entry.relPath
    };
  }

  return blocksById;
}

function loadBlockGroupsFromCatalog(projectRoot, agentRoot = "") {
  const { byId } = loadTypeCatalog(projectRoot, agentRoot);
  const groupsEntry = byId.get("awn.block.groups");
  const meta = groupsEntry?.schema || {};
  return {
    groupOrder: Array.isArray(meta.groupOrder) ? meta.groupOrder : [],
    groupNames: meta.groupNames && typeof meta.groupNames === "object" ? meta.groupNames : {}
  };
}

/**
 * Проверка «здоровья» типов агента: битые extends, блоки без template,
 * блоки без template, поля без widget, несоответствие domain и т.п.
 * Используется UI (бейджи в дереве типов) и MCP (get_type_health).
 */
function getTypeHealth(projectRoot = process.cwd(), agentRoot = "") {
  const { byId } = loadTypeCatalog(projectRoot, agentRoot);
  const issues = [];
  const add = (severity, entry, code, message) => {
    issues.push({
      severity,
      id: entry.id,
      domain: entry.domain,
      code,
      message,
      catalogFile: entry.catalogFile || null
    });
  };

  for (const entry of byId.values()) {
    if (entry.aliasOf) continue;
    const schema = entry.schema || {};
    const foundation = isFoundationType(entry);

    if (entry.extends && !byId.has(entry.extends)) {
      add("error", entry, "broken-extends", `extends «${entry.extends}» не найден — тип не наследует поля`);
    }
    if (schema.domain && String(schema.domain) !== entry.domain) {
      add("warn", entry, "domain-mismatch", `domain «${schema.domain}» ≠ папке «${entry.domain}»`);
    }
    if (!schema.name) {
      add("info", entry, "no-name", "нет человекочитаемого name");
    }

    if (foundation) continue;

    const isBlockConfig = schema.groupOrder || schema.groupNames;
    if (entry.domain === "md-blocks" && !isBlockConfig && !(schema.template || schema.text)) {
      add("warn", entry, "block-no-template", "блок без template ничего не вставит в редактор");
    }
    if (entry.domain === "fields" && !schema.widget) {
      add("info", entry, "field-no-widget", "поле без widget получит дефолтный ввод");
    }
    if (entry.domain === "slots" && !schema.path) {
      add("warn", entry, "slot-no-path", "слот без path не привязан к папке");
    }
  }

  issues.sort((a, b) => {
    const rank = { error: 0, warn: 1, info: 2 };
    return (rank[a.severity] - rank[b.severity]) || String(a.id).localeCompare(String(b.id), "ru");
  });

  const total = [...byId.values()].filter((e) => !e.aliasOf).length;
  const summary = {
    total,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warn").length,
    info: issues.filter((i) => i.severity === "info").length,
    healthy: issues.filter((i) => i.severity === "error").length === 0
  };
  return { specVersion: "1.0", model: "type-health", summary, issues };
}

function getCreateNodeTypesPayload(projectRoot = process.cwd(), agentRoot = "") {
  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  const byGroup = new Map();
  for (const entry of catalog.byId.values()) {
    if (entry.aliasOf || !isTypeActive(entry)) continue;
    const schema = entry.schema || {};
    const group = schema["create-node-group"];
    if (!group) continue;
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group).push({
      id: entry.id,
      name: schema["create-node-label"] || schema.name || entry.id,
      description: schema.description || "",
      slug: schema["create-node-slug"] || null,
      preset: schema["create-node-preset"] || null,
      order: typeof schema["create-node-order"] === "number" ? schema["create-node-order"] : 99,
      source: entry.source || "platform"
    });
  }
  const groups = [];
  for (const [groupId, types] of byGroup.entries()) {
    types.sort((a, b) => a.order - b.order || String(a.name).localeCompare(String(b.name), "ru"));
    groups.push({ id: groupId, types });
  }
  return { groups };
}

module.exports = {
  TYPE_ID_ALIASES,
  loadTypeCatalog,
  resolveAgentDomainManifest,
  resolveAgentDomainIds,
  mergeTypeSchema,
  isTypeActive,
  isCatalogType,
  inheritsFrom,
  isPageTreeType,
  getActiveTypes,
  getTypeCatalogPayload,
  getTypeDetailByCatalogPath,
  getCreateNodeTypesPayload,
  getTypeHealth,
  isFoundationType,
  loadPageTypesFromCatalog,
  loadFieldTypesFromCatalog,
  loadFieldDefFromCatalog,
  loadBlocksFromCatalog,
  loadBlockGroupsFromCatalog,
  getPageTreeRootId,
  resolveCanonicalTypeId
};
