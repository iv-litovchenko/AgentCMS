const fs = require("fs");
const path = require("path");
const { getAgentCmsCoreAbsolute } = require("./platform-sources");
const { getAwnDataPayload } = require("./awn-data-loader");
const { parseTypeYaml } = require("./awn-yaml-utils");

const ACTIVE_STATUS = new Set(["active", "deprecated"]);

/** domain id → awn-data store folder (without /types suffix) */
const DOMAIN_TYPE_STORES = {
  base: "base",
  pages: "pages",
  content: "content",
  slots: "slots",
  mixins: "mixins",
  settings: "settings"
};

const CMS_CONFIG_STORE = "cms-config";

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
  const status = String(record?.frontmatter?.status || "active").trim().toLowerCase();
  return ACTIVE_STATUS.has(status);
}

function recordToTypeSchema(record) {
  if (!record || !isTypeRecordActive(record)) return null;
  const fm = record.frontmatter || {};
  const typeId = String(fm.typeId || fm.id || "").trim();
  if (!typeId || !typeId.includes(".")) return null;

  let bodySchema = {};
  const body = String(record.body || "").trim();
  if (body) {
    try {
      bodySchema = parseTypeYaml(body) || {};
    } catch {
      bodySchema = {};
    }
  }

  const schema = {
    ...bodySchema,
    id: typeId,
    name: String(fm.title || record.title || typeId).trim(),
    kind: String(fm.kind || bodySchema.kind || "type").trim(),
    domain: String(fm.domain || bodySchema.domain || "").trim(),
    status: String(fm.status || bodySchema.status || "active").trim(),
    extends: String(fm.extends || bodySchema.extends || "").trim() || undefined
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
    catalogFile: `awn-data/${storeRel}/${relWithinStore}`.replace(/\\/g, "/"),
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

function resolveCmsConfigRoot(agentRoot, projectRoot = process.cwd()) {
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot, projectRoot);
  if (!agentRootAbs) return "";
  return path.join(agentRootAbs, "awn-data", CMS_CONFIG_STORE);
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

function cmsConfigExists(agentRoot, projectRoot = process.cwd()) {
  const configRoot = resolveCmsConfigRoot(agentRoot, projectRoot);
  if (!configRoot || !fs.existsSync(configRoot)) return false;
  return fs.existsSync(path.join(configRoot, "registry.yml"));
}

module.exports = {
  DOMAIN_TYPE_STORES,
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
