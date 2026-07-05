const fs = require("fs");
const path = require("path");
const { loadYamlFileSync } = require("./awn-yaml-utils");
const {
  getAgentCmsCoreAbsolute,
  getAgentSystemAbsolute,
  getAgentSystemTypesDir,
  TYPE_DOMAINS,
  AGENT_TYPE_DOMAINS,
  TYPE_CATALOG_REL,
  AGENT_SYSTEM_REL
} = require("./platform-sources");

const TYPES_DIR_SEGMENTS = ["awn-storage", "configuration", "types"];
const WORKSPACE_STATUS_ACTIVE = "🟢 Открыта";

const ACTIVE_STATUS = new Set(["active", "deprecated"]);

/** Legacy id → canonical id (манifests могут ещё использовать старые awn-type). */
const TYPE_ID_ALIASES = {
  "awn.page": "awn.page.base",
  "awn.base": "awn.page.base",
  "awn.workspace": "awn.page.ws",
  "awn.area": "awn.page.area",
  "awn.topic": "awn.page.topic",
  "awn.record": "awn.content.record",
  "awn.sidecar": "awn.content.sidecar",
  "awn.record.category": "awn.content.record.category",
  "awn.media.category": "awn.content.media.category",
  "awn.dialog": "awn.content.dialog",
  "awn.comment": "awn.content.comment",
  "service-doc": "awn.page.service-doc",
  "catalog": "awn.page.catalog"
};

function listTypeFiles(typesDir) {
  if (!typesDir || !fs.existsSync(typesDir)) return [];
  return fs
    .readdirSync(typesDir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.ya?ml$/i.test(e.name))
    .map((e) => path.join(typesDir, e.name));
}

function loadTypeFile(filePath, domain, source = "platform") {
  try {
    const parsed = loadYamlFileSync(filePath, { idKey: "id", nameKey: "name" });
    if (!parsed?.id) return null;
    const fileName = path.basename(filePath).replace(/\.ya?ml$/i, "");
    const catalogFile =
      source === "agent"
        ? `${AGENT_SYSTEM_REL}/types/${domain}/${fileName}.yml`
        : `types/${domain}/awn-storage/configuration/types/${fileName}.yml`;
    return {
      id: String(parsed.id).trim(),
      domain,
      fileName,
      filePath,
      relPath: `${domain}/${fileName}`,
      catalogFile,
      source,
      schema: parsed,
      status: String(parsed.status || "active").trim(),
      kind: String(parsed.kind || "").trim(),
      extends: parsed.extends ? String(parsed.extends).trim() : null
    };
  } catch {
    return null;
  }
}

function getPlatformDomainTypesDir(coreRoot, domain) {
  return path.join(coreRoot, TYPE_CATALOG_REL, domain, ...TYPES_DIR_SEGMENTS);
}

function resolveAgentRootAbsolute(agentRoot, projectRoot) {
  const raw = String(agentRoot || "").trim();
  if (!raw) return "";
  return path.isAbsolute(raw) ? raw : path.join(projectRoot || process.cwd(), raw);
}

function ingestDomainTypes(typesDir, domain, source, byId, byDomain) {
  if (!typesDir || !fs.existsSync(typesDir)) return;
  if (!byDomain[domain]) byDomain[domain] = [];
  const indexById = new Map(byDomain[domain].map((entry, idx) => [entry.id, idx]));

  for (const filePath of listTypeFiles(typesDir)) {
    const entry = loadTypeFile(filePath, domain, source);
    if (!entry) continue;
    byId.set(entry.id, entry);
    if (indexById.has(entry.id)) {
      byDomain[domain][indexById.get(entry.id)] = entry;
    } else {
      byDomain[domain].push(entry);
      indexById.set(entry.id, byDomain[domain].length - 1);
    }
  }
}

function loadTypeCatalog(projectRoot = process.cwd(), agentRoot = "") {
  const coreRoot = getAgentCmsCoreAbsolute(projectRoot);
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot, projectRoot);
  const agentSystemRoot = agentRootAbs ? getAgentSystemAbsolute(agentRootAbs) : "";
  const byId = new Map();
  const byDomain = {};
  const sources = ["platform:agent-cms-core"];

  for (const domain of TYPE_DOMAINS) {
    ingestDomainTypes(getPlatformDomainTypesDir(coreRoot, domain), domain, "platform", byId, byDomain);
  }

  const agentTypesRoot = agentSystemRoot ? path.join(agentSystemRoot, "types") : "";
  if (agentTypesRoot && fs.existsSync(agentTypesRoot)) {
    sources.push(`${AGENT_SYSTEM_REL}:agent`);
    for (const domain of AGENT_TYPE_DOMAINS) {
      ingestDomainTypes(getAgentSystemTypesDir(agentRootAbs, domain), domain, "agent", byId, byDomain);
    }
  }

  applyTypeAliases(byId);

  return {
    coreRoot,
    agentRoot: agentRootAbs,
    agentSystemRoot,
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
  const baseNames = new Set(["_base", "base"]);
  if (baseNames.has(entry.fileName)) return false;
  if (entry.kind === "entity" || entry.kind === "base" || entry.kind === "component") return false;
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
  if (byId.has("awn.base")) return "awn.base";
  if (byId.has("awn.page")) return "awn.page";
  if (byId.has("awn.entity")) return "awn.entity";
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
      `types/${entry.domain}/awn-storage/configuration/types/${entry.fileName}.yml`,
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
  if (entry.kind === "entity" || entry.kind === "base") return true;
  const baseNames = new Set(["_base", "base"]);
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
  const normalized = String(catalogPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return null;
  for (const entry of byId.values()) {
    if (entry.catalogFile === normalized) return entry;
    const agentRel = `${AGENT_SYSTEM_REL}/types/${entry.domain}/${entry.fileName}.yml`;
    if (agentRel === normalized) return entry;
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
    ownFields,
    inheritedFields,
    mergedFields,
    fieldCount: Object.keys(mergedFields).length,
    ownFieldCount: Object.keys(ownFields).length,
    storageSlots: Array.isArray(merged["storage-slots"]) ? [...merged["storage-slots"]] : [],
    manifestPattern: merged["manifest-pattern"] || null
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

module.exports = {
  TYPES_DIR_SEGMENTS,
  TYPE_ID_ALIASES,
  loadTypeCatalog,
  mergeTypeSchema,
  isTypeActive,
  isCatalogType,
  inheritsFrom,
  isPageTreeType,
  getActiveTypes,
  getTypeCatalogPayload,
  getTypeDetailByCatalogPath,
  isFoundationType,
  loadPageTypesFromCatalog,
  loadFieldTypesFromCatalog,
  loadFieldDefFromCatalog,
  loadBlocksFromCatalog,
  loadBlockGroupsFromCatalog,
  getPageTreeRootId,
  resolveCanonicalTypeId
};
