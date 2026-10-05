const fs = require("fs");
const path = require("path");
const { getAgentCmsCoreAbsolute } = require("../platform/platform-sources");
const { getAwnDataPayload } = require("./awn-data-loader");
const { parseTypeYaml } = require("./awn-yaml-utils");
const {
  agentSystemDirExists,
  getCmsConfigRel,
  resolveAgentRootAbsolute: resolveAgentRootFromPlatform
} = require("../platform/platform-sources");

const ACTIVE_STATUS = new Set(["active", "deprecated"]);

/** domain id → awn-databases store folder (legacy MD types; YAML in awn-system/types/) */
const DOMAIN_TYPE_STORES = {
  settings: "settings"
};

const CMS_BASE_STORE = "cms-base";
/** @deprecated use CMS_BASE_STORE */
const CMS_CONFIG_STORE = CMS_BASE_STORE;

function getPlatformAgentRoot(projectRoot) {
  return getAgentCmsCoreAbsolute(projectRoot);
}

function resolveAgentRootAbsolute(agentRoot, projectRoot) {
  const raw = String(agentRoot || "").trim();
  if (!raw) return "";
  return path.isAbsolute(raw) ? raw : path.join(projectRoot || process.cwd(), raw);
}

function getTypeStoreRel(domain) {
  const store = DOMAIN_TYPE_STORES[domain];
  if (!store) return "";
  return store;
}

function isTypeRecordActive(record) {
  const fm = record?.frontmatter || {};
  const status = String(fm["awn-status"] || fm.status || "active").trim().toLowerCase();
  return ACTIVE_STATUS.has(status);
}

function normalizeTypeBodySchema(bodySchema) {
  const src = bodySchema && typeof bodySchema === "object" ? { ...bodySchema } : {};
  const awnFields = src["awn-fields"];
  if (awnFields && typeof awnFields === "object") {
    src.fields = { ...(src.fields || {}), ...awnFields };
    delete src["awn-fields"];
  }
  if (src.properties && typeof src.properties === "object") {
    if (!src.fields || !Object.keys(src.fields).length) {
      src.fields = { ...(src.fields || {}), ...src.properties };
    }
    delete src.properties;
  }
  return src;
}

function recordToTypeSchema(record) {
  if (!record || !isTypeRecordActive(record)) return null;
  const fm = record.frontmatter || {};
  const typeId = String(fm["awn-typeId"] || fm.typeId || fm["awn-id"] || fm.id || "").trim();
  if (!typeId || !typeId.includes(".")) return null;

  let bodySchema = {};
  const body = String(record.body || "").trim();
  if (body) {
    try {
      bodySchema = normalizeTypeBodySchema(parseTypeYaml(body) || {});
    } catch {
      bodySchema = {};
    }
  }

  const schema = {
    ...bodySchema,
    id: typeId,
    name: String(fm["awn-title"] || fm.title || record.title || typeId).trim(),
    kind: String(fm["awn-kind"] || fm.kind || bodySchema.kind || "type").trim(),
    domain: String(fm["awn-domain"] || fm.domain || bodySchema.domain || "").trim(),
    status: String(fm["awn-status"] || fm.status || bodySchema.status || "active").trim(),
    extends: String(fm["awn-extends"] || fm.extends || bodySchema.extends || "").trim() || undefined
  };

  for (const key of [
    "slot-category",
    "storage-driver",
    "slot-order",
    "slot-tier",
    "path",
    "allow-children",
    "allowed-content",
    "accept-files"
  ]) {
    const fmKey = key.replace(/-/g, "_");
    const value = fm[key] ?? fm[fmKey] ?? bodySchema[key];
    if (value !== undefined && value !== null && value !== "") schema[key] = value;
  }

  return schema;
}

function recordToCatalogEntry(record, domain, source = "platform") {
  const schema = recordToTypeSchema(record);
  if (!schema?.id) return null;

  const slug = String(record.id || record.frontmatter?.id || "").trim();
  const storeRel = getTypeStoreRel(domain);
  const fileName = record.fileName || `${slug}.md`;
  const recordRel = String(record.relPath || fileName).replace(/\\/g, "/");
  const relWithinStore = recordRel.startsWith(`${storeRel}/`)
    ? recordRel.slice(storeRel.length + 1)
    : recordRel;
  const relPath = relWithinStore.replace(/\.md$/i, "");

  return {
    id: schema.id,
    domain,
    fileName: path.posix.basename(relWithinStore).replace(/\.md$/i, ""),
    relPath,
    catalogFile: `awn-databases/${storeRel}/${relWithinStore}`.replace(/\\/g, "/"),
    source,
    schema,
    status: String(schema.status || "active").trim(),
    kind: String(schema.kind || "").trim(),
    extends: schema.extends ? String(schema.extends).trim() : null
  };
}

function domainStoreHasRecords(projectRoot, domain, agentRoot = "") {
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot || getPlatformAgentRoot(projectRoot), projectRoot);
  if (!agentRootAbs) return false;
  const storeRel = getTypeStoreRel(domain);
  if (!storeRel) return false;
  try {
    const payload = getAwnDataPayload(agentRootAbs, projectRoot, storeRel);
    return Boolean(payload.store?.records?.length);
  } catch {
    return false;
  }
}

function cmsTypesStoreHasRecords(projectRoot, agentRoot = "") {
  for (const domain of Object.keys(DOMAIN_TYPE_STORES)) {
    if (domainStoreHasRecords(projectRoot, domain, agentRoot)) return true;
  }
  return false;
}

function loadDomainTypesFromAwnData(projectRoot, domain, agentRoot = "", source = "platform") {
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot || getPlatformAgentRoot(projectRoot), projectRoot);
  if (!agentRootAbs) return [];
  const storeRel = getTypeStoreRel(domain);
  if (!storeRel) return [];

  const payload = getAwnDataPayload(agentRootAbs, projectRoot, storeRel);
  const records = payload.store?.records || [];
  const entries = [];
  for (const record of records) {
    const entry = recordToCatalogEntry(record, domain, source);
    if (entry) entries.push(entry);
  }
  return entries;
}

function ingestDomainTypesFromAwnData(projectRoot, domain, source, byId, byDomain, agentRoot = "") {
  const entries = loadDomainTypesFromAwnData(projectRoot, domain, agentRoot, source);
  if (!entries.length) return false;
  if (!byDomain[domain]) byDomain[domain] = [];
  const indexById = new Map(byDomain[domain].map((entry, idx) => [entry.id, idx]));
  for (const entry of entries) {
    byId.set(entry.id, entry);
    if (indexById.has(entry.id)) {
      byDomain[domain][indexById.get(entry.id)] = entry;
    } else {
      byDomain[domain].push(entry);
      indexById.set(entry.id, byDomain[domain].length - 1);
    }
  }
  return true;
}

function resolveAgentRootAbsolute(agentRoot, projectRoot = process.cwd()) {
  return resolveAgentRootFromPlatform(agentRoot, projectRoot);
}

function resolveCmsConfigRoot(agentRoot, projectRoot = process.cwd()) {
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot, projectRoot);
  if (!agentRootAbs) return "";
  return path.join(agentRootAbs, getCmsConfigRel(agentRootAbs));
}

function cmsConfigExists(agentRoot, projectRoot = process.cwd()) {
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot, projectRoot);
  if (!agentRootAbs) return false;
  if (agentSystemDirExists(agentRootAbs)) return true;
  for (const rel of [
    path.join("awn-databases", CMS_CONFIG_STORE),
    path.join("awn-data", CMS_CONFIG_STORE)
  ]) {
    const configRoot = path.join(agentRootAbs, rel);
    if (fs.existsSync(path.join(configRoot, "registry.yml"))) return true;
  }
  return false;
}

function readCmsConfigFile(agentRoot, fileName, projectRoot = process.cwd()) {
  const configRoot = resolveCmsConfigRoot(agentRoot, projectRoot);
  if (!configRoot) return null;
  const abs = path.join(configRoot, fileName);
  if (!fs.existsSync(abs)) return null;
  try {
    return fs.readFileSync(abs, "utf-8");
  } catch {
    return null;
  }
}

module.exports = {
  DOMAIN_TYPE_STORES,
  CMS_BASE_STORE,
  CMS_CONFIG_STORE,
  getTypeStoreRel,
  domainStoreHasRecords,
  cmsTypesStoreHasRecords,
  loadDomainTypesFromAwnData,
  ingestDomainTypesFromAwnData,
  resolveCmsConfigRoot,
  readCmsConfigFile,
  cmsConfigExists,
  recordToTypeSchema,
  recordToCatalogEntry
};
