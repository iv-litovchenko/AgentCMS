const fs = require("fs");
const path = require("path");
const { parseTypeYaml, mergeFrontmatterOverrides } = require("./awn-yaml-utils");
const { getAgentCmsCoreAbsolute } = require("./platform-sources");
const {
  getRecordStorage,
  getCsvFileName,
  getCsvColumnsFromSchema,
  loadCsvRecords,
  appendCsvRecord,
  serializeCsv,
  parseCsvText,
  resolveCsvAbsPath,
  formatCsvRecordRelPath
} = require("./awn-data-csv");
const {
  SCHEMA_MOD_FILE,
  LEGACY_SCHEMA_MOD_FILE,
  LEGACY_SCHEME_MOD_FILE,
  LEGACY_SHEMAMOD_FILE,
  LEGACY_CONFIGURATION_SCHEMA_FILE
} = require("./schema-mod-paths");
const {
  normalizeStorageRecordExtension,
  isPlainTextStorageRecordExtension,
  isMarkdownRecordExtension,
  buildPlainTextPlaceholderContent,
  recordFileNameForId
} = require("./storage-record-extensions");

const AWN_DATABASE_DIR = "awn-databases";
const LEGACY_AWN_DATABASE_DIR = "awn-database";
const LEGACY_AWN_DATA_DIR = "awn-data";
/** @deprecated use AWN_DATABASE_DIR */
const AWN_DATA_DIR = AWN_DATABASE_DIR;
const TABLE_BASE_EXTENDS = `${AWN_DATA_DIR}/cms-base/entities/table.base.md`;
const ROW_BASE_EXTENDS = `${AWN_DATA_DIR}/cms-base/entities/row.base.md`;
const ENTITY_BASE_EXTENDS = `${AWN_DATA_DIR}/cms-base/entities/base.md`;
/** @deprecated use TABLE_BASE_EXTENDS */
const TABLE_BASE_REL = "cms-base/entities/table.base.md";
/** @deprecated use ROW_BASE_EXTENDS / rowBaseExtendsPath() */
const RECORD_BASE_REL = "cms-base/entities/row.base.md";
const COLLECTION_MANIFEST = "manifest.md";
/** @deprecated use SCHEMA_MOD_FILE */
const SCHEME_MOD_FILE = SCHEMA_MOD_FILE;
/** @deprecated legacy split contract */
const STORE_CONTRACT_FILE = "manifest.store.md";
/** @deprecated legacy */
const STORE_MD_FILE = "_store.md";
const STORE_CONTRACT_SUFFIX = ".store.md";
/** @deprecated legacy */
const STORE_FILE = "store.yml";
/** @deprecated */
const SCHEMA_FILE = COLLECTION_MANIFEST;
const LEGACY_STORE_FILE = "configuration-schema.yml";
const SINGLETON_RECORD = "main.md";
const STORE_STORAGE_ROOT = "awn-storage";
const STORE_DATA_DIR = "data";
const STORE_ASSETS_DIR = "assets";
const DISCOVER_SKIP_DIRS = new Set([".awn-cache", "history", "table-base", STORE_STORAGE_ROOT, STORE_ASSETS_DIR]);
const RECORD_WALK_SKIP_DIRS = new Set([
  "table-base",
  "record-base",
  "row-base",
  "_base",
  ".awn-cache",
  "history",
  STORE_STORAGE_ROOT
]);

function resolveStoreStorageDataAbs(storeAbs) {
  const nested = path.join(storeAbs, STORE_STORAGE_ROOT, STORE_DATA_DIR);
  if (fs.existsSync(nested) && fs.statSync(nested).isDirectory()) return nested;
  return storeAbs;
}

function usesStoreStorageDataLayout(storeAbs) {
  const nested = path.join(storeAbs, STORE_STORAGE_ROOT, STORE_DATA_DIR);
  return fs.existsSync(nested) && fs.statSync(nested).isDirectory();
}

function ensureStoreStorageLayout(storeAbs) {
  const storageRoot = path.join(storeAbs, STORE_STORAGE_ROOT);
  const dataDir = path.join(storageRoot, STORE_DATA_DIR);
  const assetsDir = path.join(storageRoot, STORE_ASSETS_DIR);
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(assetsDir, { recursive: true });
  fs.mkdirSync(path.join(assetsDir, "attachments"), { recursive: true });
  return dataDir;
}

function resolveStoreRecordRootAbs(storeAbs) {
  return resolveStoreStorageDataAbs(storeAbs);
}

function formatStoreRecordRelPath(storeRel, innerRelPath, storeAbs) {
  const normalized = String(innerRelPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  if (usesStoreStorageDataLayout(storeAbs)) {
    return `${storeRel}/${STORE_STORAGE_ROOT}/${STORE_DATA_DIR}/${normalized}`.replace(/\/+/g, "/");
  }
  return `${storeRel}/${normalized}`.replace(/\/+/g, "/");
}

function resolveStoreSingletonRecordAbs(storeAbs) {
  const nested = path.join(storeAbs, STORE_STORAGE_ROOT, STORE_DATA_DIR, SINGLETON_RECORD);
  if (fs.existsSync(nested)) return nested;
  return path.join(storeAbs, SINGLETON_RECORD);
}

function resolveStoreRecordAbs(storeAbs, relWithinStore) {
  const normalized = String(relWithinStore || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");
  const recordRoot = resolveStoreRecordRootAbs(storeAbs);
  const abs = path.join(recordRoot, normalized);
  if (fs.existsSync(abs)) return abs;
  if (recordRoot !== storeAbs) {
    const legacy = path.join(storeAbs, normalized);
    if (fs.existsSync(legacy)) return legacy;
  }
  return abs;
}

function isSystemStoreFile(name) {
  const lower = String(name || "").toLowerCase();
  if (lower === COLLECTION_MANIFEST.toLowerCase()) return true;
  if (lower === STORE_CONTRACT_FILE.toLowerCase()) return true;
  if (lower === STORE_MD_FILE.toLowerCase()) return true;
  if (lower === STORE_FILE.toLowerCase()) return true;
  if (lower.endsWith(STORE_CONTRACT_SUFFIX)) return true;
  return false;
}

const FRAME_TYPE_ID = {
  group: "awn.infoblock.frame.group",
  collection: "awn.infoblock.frame.collection",
  single: "awn.infoblock.frame.single"
};

const AWN_PROP_TYPE_TO_KIND = {
  [FRAME_TYPE_ID.collection]: "collection",
  [FRAME_TYPE_ID.single]: "single",
  [FRAME_TYPE_ID.group]: "group",
  "awn.infoblock.frame.singleton": "single",
  "awn.infoblock.collection": "collection",
  "awn.infoblock.single": "single",
  "awn.infoblock.singleton": "single",
  "awn.infoblock.group": "group",
  "awn.infoblock.base": "collection",
  "awn.infoblock.mixin": "collection",
  "awn.infoblock.entity": "collection",
  "awn.data.collection": "collection",
  "awn.data.single": "single",
  "awn.data.singleton": "single",
  "awn.data.group": "group",
  "awn.data.base": "collection",
  "awn.data.mixin": "collection",
  "awn.data.entity": "collection",
  "awn.collection": "collection",
  "awn.single": "single",
  "awn.singleton": "single",
  "awn.group": "group",
  "awn.base": "collection"
};

const KIND_TO_AWN_PROP_TYPE = {
  collection: FRAME_TYPE_ID.collection,
  single: FRAME_TYPE_ID.single,
  group: FRAME_TYPE_ID.group
};

/** Canonical infoblock frame type ids (awn-system/types/infoblocks/frames/). */
const CONTAINER_TYPE_ID = FRAME_TYPE_ID;
/** @deprecated legacy MD paths — use CONTAINER_TYPE_ID */
const DATA_CONTAINERS_PREFIX = `${AWN_DATA_DIR}/cms-base/data-containers/`;
const CONTAINER_SUPERTYPE = {
  collection: `${DATA_CONTAINERS_PREFIX}collection.md`,
  group: `${DATA_CONTAINERS_PREFIX}group.md`,
  single: `${DATA_CONTAINERS_PREFIX}single.md`
};
const DEFAULT_ELEMENT_SCHEMA_TYPE = "awn.infoblock.element.default";
const ELEMENT_TYPE_RECORD = "awn.infoblock.element.record";
const ELEMENT_TYPE_RECORD_LITE = "awn.infoblock.element.record-lite";
const ELEMENT_TYPE_RECORD_CSV = "awn.infoblock.element.record-csv";
const ELEMENT_TYPE_CATEGORY = "awn.infoblock.element.category";
const ELEMENT_TYPE_SIDECAR = "awn.infoblock.element.sidecar";
const ELEMENT_TYPE_COMMENT = "awn.infoblock.element.comment";
const ELEMENT_TYPE_PREFIXES = ["awn.infoblock.element.", "awn.infoblock.content."];
const DEFAULT_RECORD_ELEMENT_TYPE = ELEMENT_TYPE_RECORD;
const AWN_DATA_SCHEMA_TARGETS = ["frame", "category", "record", "record-csv", "sidecar"];
const AWN_DATA_SCHEMA_TARGET_EXTENDS = {
  category: ELEMENT_TYPE_CATEGORY,
  record: ELEMENT_TYPE_RECORD,
  "record-csv": ELEMENT_TYPE_RECORD_CSV,
  sidecar: ELEMENT_TYPE_SIDECAR
};

function resolveStoreFrameTypeId(storeAbs, storeKind = "") {
  const leaf = readRawStoreSchemaAt(storeAbs);
  const kind = normalizeStoreKind(storeKind || leaf?.schema?.kind || "collection");
  return (
    String(leaf?.schema?.typeId || leaf?.schema?.supertype || "").trim() ||
    KIND_TO_AWN_PROP_TYPE[kind] ||
    CONTAINER_TYPE_ID[kind] ||
    CONTAINER_TYPE_ID.collection
  );
}

function resolveAwnDataSchemaTargetExtends(kind, frameTypeId = "") {
  if (kind === "frame") return String(frameTypeId || "").trim();
  return AWN_DATA_SCHEMA_TARGET_EXTENDS[kind] || "";
}

function hasSchemeModBlockContent(block = {}) {
  const fields = normalizeAwnFieldsMap(block.fields || {});
  const tabs = block.tabs && typeof block.tabs === "object" ? block.tabs : {};
  return Object.keys(fields).length > 0 || Object.keys(tabs).length > 0;
}
/** @deprecated use DEFAULT_ELEMENT_SCHEMA_TYPE */
const DEFAULT_ELEMENT_SCHEMA = `${AWN_DATA_DIR}/cms-base/data-elements/default.md`;

const LEGACY_EXTENDS_TO_TYPE_ID = {
  [`${AWN_DATA_DIR}/cms-base/data-elements/default.md`]: ELEMENT_TYPE_RECORD,
  [`${AWN_DATA_DIR}/cms-base/entities/row.base.md`]: ELEMENT_TYPE_RECORD,
  [`${AWN_DATA_DIR}/cms-base/entities/table.base.md`]: ELEMENT_TYPE_RECORD,
  [`${AWN_DATA_DIR}/cms-base/entities/base.md`]: "awn.entity",
  [`${AWN_DATA_DIR}/cms-base/data-containers/collection.md`]: FRAME_TYPE_ID.collection,
  [`${AWN_DATA_DIR}/cms-base/data-containers/group.md`]: FRAME_TYPE_ID.group,
  [`${AWN_DATA_DIR}/cms-base/data-containers/single.md`]: FRAME_TYPE_ID.single,
  "awn.infoblock.collection": FRAME_TYPE_ID.collection,
  "awn.infoblock.single": FRAME_TYPE_ID.single,
  "awn.infoblock.singleton": FRAME_TYPE_ID.single,
  "awn.infoblock.group": FRAME_TYPE_ID.group,
  "awn.infoblock.content.record": ELEMENT_TYPE_RECORD,
  "awn.infoblock.content.category": ELEMENT_TYPE_CATEGORY,
  "awn.infoblock.content.sidecar": ELEMENT_TYPE_SIDECAR,
  "awn.infoblock.content.comment": ELEMENT_TYPE_COMMENT,
  "awn.infoblock.element.default": ELEMENT_TYPE_RECORD
};

function normalizeStoreKind(kind) {
  const value = String(kind || "").trim().toLowerCase();
  if (value === "singleton") return "single";
  return value;
}

function isTypeIdRef(ref) {
  const value = String(ref || "").trim();
  return /^awn\.[a-z0-9.-]+$/.test(value) && !value.includes("/");
}

function resolveProjectRootFromAgentRoot(agentRoot) {
  let dir = path.resolve(String(agentRoot || process.cwd()));
  for (let depth = 0; depth < 6; depth += 1) {
    if (fs.existsSync(path.join(dir, "server.js"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function resolveElementExtendsRef(ref) {
  const normalized = normalizeExtendsRef(ref);
  if (!normalized) return "";
  if (normalized === DEFAULT_ELEMENT_SCHEMA_TYPE) return ELEMENT_TYPE_RECORD;
  if (LEGACY_EXTENDS_TO_TYPE_ID[normalized]) return LEGACY_EXTENDS_TO_TYPE_ID[normalized];
  return normalized;
}

function loadInheritedFieldsFromTypeId(typeId, agentRoot, projectRoot) {
  if (!isTypeIdRef(typeId)) return { fields: {}, tabs: {} };
  try {
    const { getTypeDetailByTypeId } = require("./type-catalog-loader");
    const detail = getTypeDetailByTypeId(projectRoot, agentRoot, typeId);
    if (!detail) return { fields: {}, tabs: {} };
    return {
      fields: normalizeAwnFieldsMap(detail.mergedFields || {}),
      tabs: {}
    };
  } catch {
    return { fields: {}, tabs: {} };
  }
}

function extractCustomSchemeModFields(fields, extendsRef, agentRoot, projectRoot) {
  const ref = resolveElementExtendsRef(extendsRef || ELEMENT_TYPE_RECORD);
  const inherited = isTypeIdRef(ref)
    ? loadInheritedFieldsFromTypeId(ref, agentRoot, projectRoot).fields
    : {};
  const inheritedKeys = new Set(Object.keys(inherited || {}));
  const custom = {};
  for (const [key, def] of Object.entries(
    remapLegacyCustomSchemeModFields(fields || {}, inheritedKeys)
  )) {
    if (!inheritedKeys.has(key)) custom[key] = def;
  }
  return custom;
}

function readTypeFieldDefault(fields, key) {
  const awnKey = toAwnFieldKey(key);
  const def = fields?.[awnKey] || fields?.[key];
  if (!def || def.default === undefined || def.default === null || String(def.default).trim() === "") {
    return "";
  }
  return def.default;
}

function normalizeRecordStorage(value, fallback = "md") {
  const raw = String(value || fallback).trim().toLowerCase();
  if (raw === "csv") return "csv";
  if (raw === "csv-files" || raw === "csv_files") return "csv-files";
  return "md";
}

function normalizeCollectionKind(value, fallback = "records") {
  const raw = String(value || fallback).trim().toLowerCase();
  return raw === "files" ? "files" : "records";
}

function normalizeCollectionType(value, fallback = "md") {
  const raw = String(value || fallback).trim().toLowerCase();
  if (raw === "md-lite") return "md-lite";
  if (raw === "csv" || raw === "csv-files" || raw === "files") return raw;
  return "md";
}

function elementTypeFromCollectionType(collectionType) {
  const type = normalizeCollectionType(collectionType);
  if (type === "md-lite") return ELEMENT_TYPE_RECORD_LITE;
  if (type === "csv" || type === "csv-files") return ELEMENT_TYPE_RECORD_CSV;
  return ELEMENT_TYPE_RECORD;
}

function recordPropsFromCollectionType(collectionType) {
  const type = normalizeCollectionType(collectionType);
  if (type === "files") {
    return {
      collectionType: type,
      collectionKind: "files",
      recordStorage: "md",
      elementType: ELEMENT_TYPE_RECORD
    };
  }
  if (type === "csv") {
    return {
      collectionType: type,
      collectionKind: "records",
      recordStorage: "csv",
      elementType: ELEMENT_TYPE_RECORD_CSV
    };
  }
  if (type === "csv-files") {
    return {
      collectionType: type,
      collectionKind: "records",
      recordStorage: "csv-files",
      elementType: ELEMENT_TYPE_RECORD_CSV
    };
  }
  if (type === "md-lite") {
    return {
      collectionType: type,
      collectionKind: "records",
      recordStorage: "md",
      elementType: ELEMENT_TYPE_RECORD_LITE
    };
  }
  return {
    collectionType: type,
    collectionKind: "records",
    recordStorage: "md",
    elementType: ELEMENT_TYPE_RECORD
  };
}

function collectionTypeFromRecordProps(record = {}) {
  const explicit = String(record?.collectionType || "").trim().toLowerCase();
  if (
    explicit === "md" ||
    explicit === "md-lite" ||
    explicit === "csv" ||
    explicit === "csv-files" ||
    explicit === "files"
  ) {
    return explicit;
  }
  if (normalizeCollectionKind(record?.collectionKind) === "files") return "files";
  const storage = normalizeRecordStorage(record?.storage);
  if (storage === "csv-files") return "csv-files";
  if (storage === "csv") return "csv";
  return "md";
}

function getCollectionKind(schema) {
  const fromRecord = schema?.record?.collectionKind;
  if (fromRecord) return normalizeCollectionKind(fromRecord);
  const fromType = schema?.record?.collectionType;
  if (fromType) return recordPropsFromCollectionType(fromType).collectionKind;
  return "records";
}

function getCollectionType(schema) {
  const fromRecord = schema?.record?.collectionType;
  if (fromRecord) return normalizeCollectionType(fromRecord);
  return collectionTypeFromRecordProps({
    collectionKind: schema?.record?.collectionKind,
    storage: schema?.record?.storage
  });
}

function getRecordHierarchy(schema) {
  const hierarchy = schema?.record?.hierarchy;
  return hierarchy === true || String(hierarchy || "").trim().toLowerCase() === "true";
}

function getRecordFileTypes(schema) {
  return String(schema?.record?.fileTypes || schema?.record?.["file-types"] || "").trim();
}

function matchesFileTypePattern(fileName, pattern) {
  const name = String(fileName || "").toLowerCase();
  const pat = String(pattern || "").trim().toLowerCase();
  if (!pat) return true;
  if (pat.startsWith("*.")) return name.endsWith(pat.slice(1));
  if (pat.startsWith(".")) return name.endsWith(pat);
  if (pat.endsWith("/*")) {
    const prefix = pat.slice(0, -1);
    if (prefix === "image") return /\.(png|jpe?g|gif|webp|svg|bmp|ico|avif|tiff)$/.test(name);
    if (prefix === "video") return /\.(mp4|webm|mov|avi|mkv)$/.test(name);
    if (prefix === "audio") return /\.(mp3|wav|ogg|m4a|flac)$/.test(name);
    return true;
  }
  return name === pat || name.endsWith(`.${pat}`);
}

function matchesFileTypesSpec(fileName, spec) {
  const filters = String(spec || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!filters.length) return true;
  return filters.some((pattern) => matchesFileTypePattern(fileName, pattern));
}

function loadContainerTypeDefaults(kind, agentRoot, projectRoot) {
  const normalizedKind = normalizeStoreKind(kind);
  const typeId = CONTAINER_TYPE_ID[normalizedKind] || "";
  const { fields } = loadInheritedFieldsFromTypeId(typeId, agentRoot, projectRoot);
  const collectionType = normalizeCollectionType(readTypeFieldDefault(fields, "awn-collection-type"), "md");
  const mapped = recordPropsFromCollectionType(collectionType);
  const hierarchyDefault = readTypeFieldDefault(fields, "awn-record-hierarchy");
  const recordHierarchy =
    hierarchyDefault === true || String(hierarchyDefault || "").trim().toLowerCase() === "true";
  const recordFileTypes = String(readTypeFieldDefault(fields, "awn-record-file-types") || "").trim();
  return {
    typeId,
    fields,
    collectionType: mapped.collectionType,
    recordStorage: mapped.recordStorage,
    collectionKind: mapped.collectionKind,
    recordElementType: mapped.elementType || ELEMENT_TYPE_RECORD,
    recordHierarchy,
    recordFileTypes
  };
}

function toAwnFieldKey(key) {
  const name = String(key || "").trim();
  if (!name || name.startsWith("awn-")) return name;
  return `awn-${name}`;
}

/** User fields in store schema.yml — keys as written, without awn- prefix. */
function normalizeSchemeModFieldsMap(fields) {
  const src = fields && typeof fields === "object" ? fields : {};
  const out = {};
  for (const [key, value] of Object.entries(src)) {
    const name = String(key || "").trim();
    if (!name) continue;
    out[name] = value;
  }
  return out;
}

/** Strip mistaken awn- prefix from custom overlay fields (legacy saves). */
function remapLegacyCustomSchemeModFields(fields, inheritedKeys) {
  const inherited = inheritedKeys instanceof Set ? inheritedKeys : new Set(inheritedKeys || []);
  const out = {};
  for (const [key, def] of Object.entries(normalizeSchemeModFieldsMap(fields || {}))) {
    let name = key;
    if (name.startsWith("awn-") && !inherited.has(name)) {
      const plain = name.slice(4);
      if (plain && !inherited.has(plain)) name = plain;
    }
    out[name] = def;
  }
  return out;
}

function normalizeAwnPropTypeToKind(propType, fallback = "collection") {
  const key = String(propType || "").trim().toLowerCase();
  if (AWN_PROP_TYPE_TO_KIND[key]) return AWN_PROP_TYPE_TO_KIND[key];
  if (key.includes("group")) return "group";
  if (key.includes("single")) return "single";
  if (key.includes("mixin")) return "collection";
  if (key.includes("base") || key.includes("entity")) return "collection";
  return fallback;
}

function normalizeAwnFieldsMap(fields) {
  const src = fields && typeof fields === "object" ? fields : {};
  const out = {};
  for (const [key, value] of Object.entries(src)) {
    out[toAwnFieldKey(key)] = value;
  }
  return out;
}

function readStoreProp(raw, names, fallback = "") {
  for (const name of names) {
    const value = raw?.[name];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return fallback;
}

const STORE_KINDS = new Set(["collection", "single", "group"]);

/** Порядок в sidebar «Накопители»: группы → коллекции → одиночки. */
const AWN_DATA_STORE_KIND_ORDER = { group: 0, collection: 1, single: 2 };

function awnDataStoreKindRank(kind) {
  return Object.prototype.hasOwnProperty.call(AWN_DATA_STORE_KIND_ORDER, kind)
    ? AWN_DATA_STORE_KIND_ORDER[kind]
    : 1;
}

function compareAwnDataStoreSiblings(a, b, sortOrder = null) {
  const kindDiff = awnDataStoreKindRank(a.kind) - awnDataStoreKindRank(b.kind);
  if (kindDiff !== 0) return kindDiff;

  if (sortOrder?.length) {
    const resolveSortKey = (store) => {
      const rel = String(store?.relPath || "").trim();
      const slash = rel.lastIndexOf("/");
      return slash >= 0 ? rel.slice(slash + 1) : rel;
    };
    const aKey = resolveSortKey(a);
    const bKey = resolveSortKey(b);
    const ai = sortOrder.indexOf(aKey);
    const bi = sortOrder.indexOf(bKey);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      if (ai !== bi) return ai - bi;
    }
  }

  const aName = String(a.name || a.relPath);
  const bName = String(b.name || b.relPath);
  return aName.localeCompare(bName, "ru", { sensitivity: "base" });
}

function compareAwnDataStoresTopLevel(a, b, rootSort = null) {
  const kindDiff = awnDataStoreKindRank(a.kind) - awnDataStoreKindRank(b.kind);
  if (kindDiff !== 0) return kindDiff;

  if (rootSort?.length) {
    const aKey = a.relPath.split("/")[0];
    const bKey = b.relPath.split("/")[0];
    const ai = rootSort.indexOf(aKey);
    const bi = rootSort.indexOf(bKey);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      if (ai !== bi) return ai - bi;
    }
  }

  const aName = String(a.name || a.relPath);
  const bName = String(b.name || b.relPath);
  return aName.localeCompare(bName, "ru", { sensitivity: "base" });
}

function splitFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: text.trim() };
  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const key = trimmed.slice(0, colon).trim();
    frontmatter[key] = trimmed.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { frontmatter, body: match[2].trim() };
}

function resolveAgentRootAbsolute(agentRoot, projectRoot = process.cwd()) {
  const raw = String(agentRoot || "").trim();
  if (!raw) return "";
  return path.isAbsolute(raw) ? raw : path.join(projectRoot, raw);
}

function getAwnDataRoot(agentRoot, projectRoot = process.cwd()) {
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot, projectRoot);
  if (!agentRootAbs) return "";
  const databasePath = path.join(agentRootAbs, AWN_DATABASE_DIR);
  const legacyDatabasePath = path.join(agentRootAbs, LEGACY_AWN_DATABASE_DIR);
  const legacyPath = path.join(agentRootAbs, LEGACY_AWN_DATA_DIR);
  if (fs.existsSync(databasePath)) return databasePath;
  if (fs.existsSync(legacyDatabasePath)) return legacyDatabasePath;
  if (fs.existsSync(legacyPath)) return legacyPath;
  return databasePath;
}

function readSchemaFile(schemaPath) {
  if (!fs.existsSync(schemaPath)) return null;
  try {
    return parseTypeYaml(fs.readFileSync(schemaPath, "utf-8"));
  } catch {
    return null;
  }
}

function readStoreMdParts(storeMdPath) {
  if (!fs.existsSync(storeMdPath)) return null;
  const raw = fs.readFileSync(storeMdPath, "utf-8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return null;
  try {
    return {
      frontmatter: parseTypeYaml(match[1]),
      body: String(match[2] || "").trim()
    };
  } catch {
    return null;
  }
}

const ENTITY_TYPE_PATHS = {
  "awn.base": "cms-base/entities/base.md",
  "awn.table.base": "cms-base/entities/table.base.md",
  "awn.row.base": "cms-base/entities/row.base.md"
};

function isEntityTypeRecordFrontmatter(raw) {
  if (!raw || typeof raw !== "object") return false;
  if (raw["awn-type"] || raw["awn-prop-type"]) return false;
  return Boolean(raw["awn-typeId"] || raw.typeId);
}

function normalizeEntityFieldType(type) {
  const raw = String(type || "").trim();
  if (raw.startsWith("awn.field.")) return `awn.${raw.slice("awn.field.".length)}`;
  return raw;
}

function normalizeEntityFieldsToStore(fields) {
  const src = fields && typeof fields === "object" ? fields : {};
  const out = {};
  for (const [key, value] of Object.entries(src)) {
    const field = value && typeof value === "object" ? { ...value } : { type: value };
    if (field.type) field.type = normalizeEntityFieldType(field.type);
    out[toAwnFieldKey(key)] = field;
  }
  return out;
}

function resolveEntityTypeIdToPath(typeId, dataRoot = "") {
  const id = String(typeId || "").trim();
  if (!id) return "";
  const rel = ENTITY_TYPE_PATHS[id];
  if (!rel) return "";
  return `${AWN_DATA_DIR}/${rel}`;
}

function readEntityTypeAsStoreSchema(absPath, parts) {
  let bodySchema = {};
  const body = String(parts.body || "").trim();
  if (body) {
    try {
      bodySchema = parseTypeYaml(body) || {};
    } catch {
      bodySchema = {};
    }
  }

  const bodyFields = normalizeEntityFieldsToStore(bodySchema["awn-fields"] || bodySchema.fields || {});
  const fm = parts.frontmatter || {};
  const storeExtends = String(bodySchema["awn-store-extends"] || "").trim();
  const typeExtends = String(fm["awn-extends"] || fm.extends || "").trim();
  const extendsRef = storeExtends || resolveEntityTypeIdToPath(typeExtends) || "";

  return {
    schema: {
      kind: "collection",
      id: String(fm["awn-id"] || path.basename(absPath, ".md")).trim(),
      name: String(fm["awn-title"] || fm["awn-name"] || "").trim(),
      description: String(bodySchema.description || fm.description || "").trim(),
      extends: normalizeExtendsRef(extendsRef),
      fields: bodyFields
    },
    body,
    schemaPath: absPath,
    schemaFile: path.basename(absPath)
  };
}

function resolveManifestAwnTypeId(raw) {
  return String(raw?.["awn-type"] || raw?.["awn-prop-type"] || raw?.["awn-supertype"] || "").trim();
}

function isAwnInfoblockContentTypeId(typeId) {
  const id = String(typeId || "").trim();
  if (!id) return false;
  return ELEMENT_TYPE_PREFIXES.some((prefix) => id.startsWith(prefix));
}

function resolveFrameKindFromManifest(raw) {
  const typeId = resolveManifestAwnTypeId(raw);
  if (typeId) {
    const resolved = resolveElementExtendsRef(typeId);
    const kind = AWN_PROP_TYPE_TO_KIND[resolved] || AWN_PROP_TYPE_TO_KIND[typeId];
    if (kind && STORE_KINDS.has(kind)) return kind;
  }
  if (!isStoreManifestFrontmatter(raw)) return "";
  if (raw?.["awn-store"]) return "";
  if (
    raw?.["awn-collection-type"] ||
    raw?.["awn-record"] ||
    raw?.["awn-prop-record"] ||
    raw?.["awn-record-hierarchy"] !== undefined ||
    raw?.["awn-record-file"]
  ) {
    return "collection";
  }
  if (raw?.["awn-name"]) return "group";
  return "";
}

function isAwnInfoblockFrameManifest(raw) {
  if (!raw || typeof raw !== "object") return false;
  const typeId = resolveManifestAwnTypeId(raw);
  if (typeId && isAwnInfoblockContentTypeId(typeId)) return false;
  if (raw["awn-store"]) return false;
  return Boolean(resolveFrameKindFromManifest(raw));
}

function isStoreManifestFrontmatter(raw) {
  if (!raw || typeof raw !== "object") return false;
  return Boolean(
    raw["awn-supertype"] ||
      raw["awn-super-type"] ||
      raw["awn-type"] ||
      raw["awn-prop-type"] ||
      raw.kind ||
      raw["awn-fields"] ||
      raw.fields ||
      raw["awn-record"] ||
      raw["awn-prop-record"] ||
      raw["awn-record-id-mode"] ||
      raw["awn-record-file"] ||
      raw["awn-data-elements-schema"] ||
      raw["awn-data-elements-schema-extends"]
  );
}

function findAwnDataRootFromStoreAbs(storeAbs) {
  let dir = path.resolve(String(storeAbs || ""));
  while (dir) {
    if (path.basename(dir) === AWN_DATABASE_DIR || path.basename(dir) === LEGACY_AWN_DATA_DIR) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return "";
}

function findAgentRootFromStoreAbs(storeAbs) {
  const dataRoot = findAwnDataRootFromStoreAbs(storeAbs);
  return dataRoot ? path.dirname(dataRoot) : "";
}

function normalizeExtendsRef(ref) {
  let normalized = String(ref || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/store\.yml$/i, "/manifest.md")
    .replace(/(^|\/)_store\.yml$/i, "$1manifest.md")
    .replace(/(^|\/)_store\.md$/i, "$1manifest.md")
    .replace(/manifest\.store\.md$/i, "manifest.md")
    .replace(/(^|\/)_store$/i, "$1/manifest.md");

  if (/^\.\.(\/|$)/.test(normalized)) {
    const parts = normalized.split("/").filter(Boolean);
    while (parts[0] === "..") parts.shift();
    normalized = parts.join("/");
  }

  normalized = normalized.replace(/\/record-base\//g, "/entities/row.base.md");
  normalized = normalized.replace(/\/row-base\//g, "/entities/row.base.md");
  normalized = normalized.replace(/cms-base\/entities\/table-base\/manifest\.md/g, "cms-base/entities/table.base.md");
  normalized = normalized.replace(/cms-base\/table-base\/manifest\.md/g, "cms-base/entities/table.base.md");
  normalized = normalized.replace(/^\/+/, "");

  if (
    normalized &&
    !isTypeIdRef(normalized) &&
    !normalized.startsWith(`${AWN_DATABASE_DIR}/`) &&
    !normalized.startsWith(`${LEGACY_AWN_DATA_DIR}/`) &&
    !normalized.startsWith(".") &&
    !path.isAbsolute(normalized)
  ) {
    normalized = `${AWN_DATA_DIR}/${normalized}`;
  }

  return normalized;
}

function resolveKindFromSupertype(supertype) {
  const ref = resolveElementExtendsRef(supertype);
  if (ref === CONTAINER_TYPE_ID.collection) return "collection";
  if (ref === CONTAINER_TYPE_ID.group) return "group";
  if (ref === CONTAINER_TYPE_ID.single) return "single";
  const legacy = normalizeExtendsRef(supertype).toLowerCase();
  if (!legacy.startsWith(DATA_CONTAINERS_PREFIX)) return "";
  const base = path.basename(legacy, ".md");
  if (base === "collection") return "collection";
  if (base === "group") return "group";
  if (base === "single") return "single";
  return "";
}

function extractElementSchemaBlock(raw) {
  const block = raw["awn-data-elements-schema"];
  if (!block || typeof block !== "object") return { fields: {}, tabs: {} };
  return {
    fields: normalizeAwnFieldsMap(block.fields || {}),
    tabs: block.tabs && typeof block.tabs === "object" ? { ...block.tabs } : {}
  };
}

function extractFlatRecordProps(raw) {
  const record = {};
  const idMode = readStoreProp(raw, ["awn-record-id-mode"], "");
  const file = readStoreProp(raw, ["awn-record-file"], "");
  const hierarchy = raw["awn-record-hierarchy"];
  const fileTypes = readStoreProp(raw, ["awn-record-file-types"], "");
  const collectionTypeRaw = readStoreProp(raw, ["awn-collection-type"], "");
  if (collectionTypeRaw) {
    const mapped = recordPropsFromCollectionType(collectionTypeRaw);
    record.collectionType = mapped.collectionType;
    record.collectionKind = mapped.collectionKind;
    record.storage = mapped.recordStorage;
  } else {
    const storage = readStoreProp(raw, ["awn-record-storage"], "");
    const collectionKind = readStoreProp(raw, ["awn-collection-kind"], "");
    if (storage) record.storage = normalizeRecordStorage(storage);
    if (collectionKind) record.collectionKind = normalizeCollectionKind(collectionKind);
    record.collectionType = collectionTypeFromRecordProps(record);
    const mapped = recordPropsFromCollectionType(record.collectionType);
    record.collectionKind = mapped.collectionKind;
    record.storage = mapped.recordStorage;
  }
  if (idMode) record["id-mode"] = idMode;
  if (file) record.file = file;
  if (fileTypes) record.fileTypes = String(fileTypes).trim();
  if (hierarchy !== undefined && hierarchy !== null && String(hierarchy).trim() !== "") {
    record.hierarchy = hierarchy === true || String(hierarchy).trim().toLowerCase() === "true";
  }
  return record;
}

function resolveExtendsSchemaAbs(storeAbs, extendsRef, agentRoot = "") {
  const ref = normalizeExtendsRef(extendsRef);
  if (!ref) return "";
  const projectRoot = agentRoot || findAgentRootFromStoreAbs(storeAbs);
  const dataRoot = findAwnDataRootFromStoreAbs(storeAbs);
  const candidates = [];

  if (!ref.startsWith(".") && projectRoot) {
    if (ref.endsWith(".md") || ref.endsWith(".yml")) {
      candidates.push(path.join(projectRoot, ref));
    } else {
      candidates.push(path.join(projectRoot, `${ref}.md`), path.join(projectRoot, `${ref}.yml`));
    }
  }

  if (dataRoot && (ref.startsWith(`${AWN_DATABASE_DIR}/`) || ref.startsWith(`${LEGACY_AWN_DATA_DIR}/`))) {
    const withinData = ref.startsWith(`${AWN_DATABASE_DIR}/`)
      ? ref.slice(`${AWN_DATABASE_DIR}/`.length)
      : ref.slice(`${LEGACY_AWN_DATA_DIR}/`.length);
    if (withinData.endsWith(".md") || withinData.endsWith(".yml")) {
      candidates.push(path.join(dataRoot, withinData));
    }
  }

  if (ref.endsWith(".md") || ref.endsWith(".yml")) {
    candidates.push(path.resolve(storeAbs, ref));
  } else {
    candidates.push(path.resolve(storeAbs, `${ref}.md`), path.resolve(storeAbs, `${ref}.yml`));
  }
  candidates.push(
    path.resolve(storeAbs, ref.replace(/\.md$/i, ".yml")),
    path.resolve(storeAbs, ref.replace(/\.yml$/i, ".md"))
  );

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return "";
}

function readPlainManifestBody(storeAbs) {
  const manifestPath = path.join(storeAbs, COLLECTION_MANIFEST);
  if (!fs.existsSync(manifestPath)) return "";
  const raw = fs.readFileSync(manifestPath, "utf-8");
  const match = raw.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (match) return String(match[1] || "").trim();
  return String(raw || "").trim();
}

function normalizeAwnTypeToKind(awnType, fallback = "collection") {
  return normalizeAwnPropTypeToKind(awnType, fallback);
}

function extractDescriptionFromBody(body) {
  const text = String(body || "").trim();
  if (!text) return "";
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) || "";
  return firstLine.replace(/^#+\s*/, "").trim();
}

function normalizeRawStoreSchema(raw, body = "") {
  if (!raw || typeof raw !== "object") return null;

  const hasAwnKeys =
    raw["awn-supertype"] ||
    raw["awn-super-type"] ||
    raw["awn-type"] ||
    raw["awn-name"] ||
    raw["awn-id"] ||
    raw["awn-fields"] ||
    raw["awn-record"] ||
    raw["awn-extends"] ||
    raw["awn-data-elements-schema"] ||
    raw["awn-data-elements-schema-extends"];

  const hasLegacyPropKeys = raw["awn-prop-type"] || raw["awn-prop-name"] || raw["awn-prop-id"];

  if (!hasAwnKeys && !hasLegacyPropKeys && raw.kind) {
    return {
      version: raw.version || 1,
      kind: normalizeStoreKind(raw.kind || "collection"),
      id: String(raw.id || "").trim(),
      name: String(raw.name || raw.id || "").trim(),
      description: String(extractDescriptionFromBody(body) || raw.description || "").trim(),
      extends: normalizeExtendsRef(raw.extends || ""),
      layer: String(raw.layer || raw["awn-layer"] || raw["awn-prop-layer"] || "").trim(),
      record: raw.record && typeof raw.record === "object" ? { ...raw.record } : {},
      fields: normalizeAwnFieldsMap(raw.fields),
      storeBody: body
    };
  }

  const supertype = normalizeExtendsRef(readStoreProp(raw, ["awn-supertype", "awn-super-type"], ""));
  const awnType = readStoreProp(raw, ["awn-type", "awnType", "awn-prop-type"], "");
  const kindFromSuper = resolveKindFromSupertype(supertype || awnType);
  const kind = normalizeStoreKind(
    raw.kind ? raw.kind : kindFromSuper || normalizeAwnPropTypeToKind(awnType, "collection")
  );

  const elementBlock = extractElementSchemaBlock(raw);
  const rawFields =
    (Object.keys(elementBlock.fields).length ? elementBlock.fields : null) ||
    (raw["awn-fields"] && typeof raw["awn-fields"] === "object" ? raw["awn-fields"] : null) ||
    (raw.fields && typeof raw.fields === "object" ? raw.fields : {}) ||
    {};

  const recordFromObject =
    (raw["awn-record"] && typeof raw["awn-record"] === "object" ? raw["awn-record"] : null) ||
    (raw["awn-prop-record"] && typeof raw["awn-prop-record"] === "object" ? raw["awn-prop-record"] : null) ||
    (raw.record && typeof raw.record === "object" ? raw.record : {}) ||
    {};

  const elementExtends = resolveElementExtendsRef(readStoreProp(raw, ["awn-data-elements-schema-extends"], ""));
  const legacyExtends = resolveElementExtendsRef(readStoreProp(raw, ["awn-extends", "extends", "awn-prop-extends"], ""));
  const record =
    kind === "group"
      ? {}
      : { ...recordFromObject, ...extractFlatRecordProps(raw) };

  return {
    version: raw.version || 1,
    kind,
    supertype,
    typeId: CONTAINER_TYPE_ID[kind] || "",
    id: String(readStoreProp(raw, ["awn-id", "id", "awn-prop-id"], "")).trim(),
    name: String(readStoreProp(raw, ["awn-name", "name", "title", "awn-prop-name"], "")).trim(),
    description: String(extractDescriptionFromBody(body) || readStoreProp(raw, ["description", "awn-description", "awn-prop-description"], "")).trim(),
    extends: kind === "group" ? "" : elementExtends || legacyExtends,
    layer: String(readStoreProp(raw, ["awn-layer", "layer", "awn-prop-layer"], "")).trim(),
    record,
    fields: normalizeAwnFieldsMap(rawFields),
    elementSchemaTabs: elementBlock.tabs,
    elementSchemaMixins: Array.isArray(raw["awn-data-elements-schema-mixins"])
      ? raw["awn-data-elements-schema-mixins"]
      : [],
    storeBody: body
  };
}

function readRawStoreSchemaAt(storeAbs, explicitPath = "") {
  if (explicitPath) {
    const lower = explicitPath.toLowerCase();
    if (lower.endsWith(".md")) {
      const parts = readStoreMdParts(explicitPath);
      if (!parts) return null;
      if (isEntityTypeRecordFrontmatter(parts.frontmatter)) {
        return readEntityTypeAsStoreSchema(explicitPath, parts);
      }
      const schema = normalizeRawStoreSchema(parts.frontmatter, parts.body);
      if (!schema) return null;
      return { schema, body: parts.body, schemaPath: explicitPath, schemaFile: path.basename(explicitPath) };
    }
    const schema = readSchemaFile(explicitPath);
    if (!schema) return null;
    return {
      schema: normalizeRawStoreSchema(schema, ""),
      body: "",
      schemaPath: explicitPath,
      schemaFile: path.basename(explicitPath)
    };
  }

  const manifestPath = path.join(storeAbs, COLLECTION_MANIFEST);
  if (fs.existsSync(manifestPath)) {
    const parts = readStoreMdParts(manifestPath);
    if (parts && isStoreManifestFrontmatter(parts.frontmatter)) {
      const schema = normalizeRawStoreSchema(parts.frontmatter, parts.body);
      if (schema) {
        return {
          schema,
          body: parts.body,
          schemaPath: manifestPath,
          schemaFile: COLLECTION_MANIFEST
        };
      }
    }
  }

  const storeMdPath = path.join(storeAbs, STORE_CONTRACT_FILE);
  if (fs.existsSync(storeMdPath)) {
    const parts = readStoreMdParts(storeMdPath);
    if (parts) {
      const schema = normalizeRawStoreSchema(parts.frontmatter, "");
      if (schema) {
        return {
          schema,
          body: "",
          schemaPath: storeMdPath,
          schemaFile: STORE_CONTRACT_FILE
        };
      }
    }
  }

  const legacyStoreMdPath = path.join(storeAbs, STORE_MD_FILE);
  if (fs.existsSync(legacyStoreMdPath)) {
    const parts = readStoreMdParts(legacyStoreMdPath);
    if (parts) {
      const schema = normalizeRawStoreSchema(parts.frontmatter, parts.body);
      if (schema) {
        return {
          schema,
          body: parts.body,
          schemaPath: legacyStoreMdPath,
          schemaFile: STORE_MD_FILE
        };
      }
    }
  }

  const legacyYmlPath = path.join(storeAbs, STORE_FILE);
  if (fs.existsSync(legacyYmlPath)) {
    const schema = readSchemaFile(legacyYmlPath);
    if (schema) {
      return {
        schema: normalizeRawStoreSchema(schema, ""),
        body: "",
        schemaPath: legacyYmlPath,
        schemaFile: STORE_FILE
      };
    }
  }

  const olderPath = path.join(storeAbs, LEGACY_STORE_FILE);
  if (fs.existsSync(olderPath)) {
    const schema = readSchemaFile(olderPath);
    if (schema) {
      return {
        schema: normalizeRawStoreSchema(schema, ""),
        body: "",
        schemaPath: olderPath,
        schemaFile: LEGACY_STORE_FILE
      };
    }
  }

  return null;
}

function resolveStoreSchemeModPath(storeAbs) {
  const candidates = [
    path.join(storeAbs, SCHEMA_MOD_FILE),
    path.join(storeAbs, LEGACY_SCHEMA_MOD_FILE),
    path.join(storeAbs, LEGACY_SCHEME_MOD_FILE),
    path.join(storeAbs, LEGACY_SHEMAMOD_FILE),
    path.join(storeAbs, LEGACY_CONFIGURATION_SCHEMA_FILE)
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(storeAbs, SCHEMA_MOD_FILE);
}

function readStoreSchemeModBlock(awnSchema, kind, frameTypeId = "") {
  const block = awnSchema?.[kind];
  if (!block || typeof block !== "object") return null;
  const extendsRef = resolveAwnDataSchemaTargetExtends(kind, frameTypeId);
  return {
    fields: normalizeSchemeModFieldsMap(block.fields || {}),
    tabs: block.tabs && typeof block.tabs === "object" ? { ...block.tabs } : {},
    extends: resolveElementExtendsRef(block.extends || extendsRef || "")
  };
}

function readStoreSchemeModOverlay(storeAbs) {
  const schemePath = resolveStoreSchemeModPath(storeAbs);
  if (!fs.existsSync(schemePath)) return null;
  try {
    const parsed = parseTypeYaml(fs.readFileSync(schemePath, "utf-8"));
    const awnSchema = parsed?.awn_schema;
    if (!awnSchema || typeof awnSchema !== "object") {
      return { fields: {}, tabs: {}, blocks: {}, schemePath, exists: true };
    }

    const frameTypeId = resolveStoreFrameTypeId(storeAbs);
    const blocks = {};
    for (const kind of AWN_DATA_SCHEMA_TARGETS) {
      const block = readStoreSchemeModBlock(awnSchema, kind, frameTypeId);
      if (block) blocks[kind] = block;
    }

    const legacyBlock = awnSchema.record || awnSchema.store || awnSchema.element || null;
    if (!blocks.record && legacyBlock && typeof legacyBlock === "object") {
      blocks.record = {
        fields: normalizeSchemeModFieldsMap(legacyBlock.fields || awnSchema.fields || {}),
        tabs: legacyBlock.tabs && typeof legacyBlock.tabs === "object" ? { ...legacyBlock.tabs } : {},
        extends: resolveElementExtendsRef(
          legacyBlock.extends || awnSchema.extends || AWN_DATA_SCHEMA_TARGET_EXTENDS.record
        )
      };
    }

    const recordCsvBlock = blocks["record-csv"];
    const recordBlock = blocks.record || { fields: {}, tabs: {}, extends: AWN_DATA_SCHEMA_TARGET_EXTENDS.record };
    const activeRecordBlock =
      recordCsvBlock ||
      (recordBlock.extends === ELEMENT_TYPE_RECORD_CSV ? recordBlock : null) ||
      recordBlock;
    return {
      fields: activeRecordBlock.fields,
      tabs: activeRecordBlock.tabs,
      extends: activeRecordBlock.extends,
      blocks,
      schemePath,
      exists: true
    };
  } catch {
    return null;
  }
}

function composeAwnDataStoreSchemeModYaml(schema = {}) {
  const lines = ["version: 1", "layer: awn-databases-store", "", "awn_schema:"];
  const blocks = schema.blocks && typeof schema.blocks === "object" ? schema.blocks : null;
  const includeEmptyBlocks = Boolean(schema.includeEmptyBlocks);

  if (blocks) {
    let wroteAny = false;
    for (const kind of AWN_DATA_SCHEMA_TARGETS) {
      const block = blocks[kind];
      if (!block) continue;
      const fields = normalizeSchemeModFieldsMap(block.fields || {});
      const tabs = block.tabs && typeof block.tabs === "object" ? block.tabs : {};
      const extendsRef = String(block.extends || "").trim();
      if (!hasSchemeModBlockContent({ fields, tabs }) && !includeEmptyBlocks && !extendsRef) continue;
      lines.push(`  ${kind}:`);
      if (extendsRef) lines.push(`    extends: ${extendsRef}`);
      if (Object.keys(fields).length) {
        lines.push("    fields:");
        lines.push(...dumpYamlBlock(fields, 3));
      }
      if (tabs && Object.keys(tabs).length) {
        lines.push("    tabs:");
        lines.push(...dumpYamlBlock(tabs, 3));
      }
      wroteAny = true;
    }
    if (!wroteAny) return "";
  } else {
    const fields = normalizeSchemeModFieldsMap(schema.fields || {});
    const tabs = schema.elementSchemaTabs || schema.tabs || {};
    const extendsRef = String(schema.extends || "").trim();
    if (!Object.keys(fields).length && !Object.keys(tabs || {}).length && !extendsRef) return "";
    lines.push("  record:");
    if (extendsRef) lines.push(`    extends: ${extendsRef}`);
    if (Object.keys(fields).length) {
      lines.push("    fields:");
      lines.push(...dumpYamlBlock(fields, 3));
    }
    if (tabs && Object.keys(tabs).length) {
      lines.push("    tabs:");
      lines.push(...dumpYamlBlock(tabs, 3));
    }
  }

  lines.push("");
  return `${lines.join("\n")}`;
}

function writeStoreSchemeMod(storeAbs, schema = {}) {
  const fields = schema.fields || {};
  const extendsRef = String(schema.extends || "").trim();
  // schema.yml — только пользовательские поля; база приходит из type-catalog в runtime.
  if (!Object.keys(fields).length && !extendsRef) return false;
  const tabs = schema.elementSchemaTabs || schema.tabs || {};
  const blockKind = schema.blockKind || resolveStoreElementSchemaKind(extendsRef);
  const content = composeAwnDataStoreSchemeModYaml({
    blocks: {
      [blockKind]: {
        extends: extendsRef,
        fields,
        tabs
      }
    },
    includeEmptyBlocks: Boolean(extendsRef)
  });
  if (!String(content || "").trim()) return false;
  fs.writeFileSync(path.join(storeAbs, SCHEMA_MOD_FILE), content, "utf-8");
  return true;
}

function writeInitialStoreAwnSchema(_storeAbs, _kind, _frameTypeId = "") {
  // Пустой schema.yml не создаём — как у страниц: файл появляется только с локальными полями.
  return false;
}

function loadMergedStoreSchema(storeAbs, dataRoot = "") {
  const leaf = readRawStoreSchemaAt(storeAbs);
  if (!leaf) return null;

  const agentRoot = dataRoot ? path.dirname(dataRoot) : findAgentRootFromStoreAbs(storeAbs);
  const projectRoot = resolveProjectRootFromAgentRoot(agentRoot);
  const schemeOverlay = readStoreSchemeModOverlay(storeAbs);
  const kind = normalizeStoreKind(leaf.schema.kind || "collection");

  if (kind === "group") {
    const typeMeta = loadContainerTypeMeta("group", agentRoot, projectRoot);
    const containerFields = normalizeAwnFieldsMap(typeMeta.typeFields || {});
    const merged = {
      ...leaf.schema,
      kind: "group",
      typeId: typeMeta.typeId || CONTAINER_TYPE_ID.group,
      fields: containerFields,
      fieldsLocal: {},
      fieldsInSchemeMod: false,
      elementSchemaTabs: {},
      storeBody: leaf.body || leaf.schema.storeBody || "",
      schemaFile: leaf.schemaFile,
      schemeModFile: "",
      extendsChain: typeMeta.typeId ? [typeMeta.typeId] : [],
      elementExtends: "",
      supertype: typeMeta.typeId || CONTAINER_TYPE_ID.group,
      record: {}
    };
    delete merged.storeBody;
    merged._storeBody = leaf.body || leaf.schema.storeBody || "";
    return merged;
  }

  const extendsRef = resolveElementExtendsRef(
    schemeOverlay?.extends || leaf.schema.extends || ELEMENT_TYPE_RECORD
  );

  let fields = {};
  if (isTypeIdRef(extendsRef)) {
    fields = { ...loadInheritedFieldsFromTypeId(extendsRef, agentRoot, projectRoot).fields };
  } else if (extendsRef) {
    const chain = [leaf];
    let dir = storeAbs;
    let fileExtendsRef = extendsRef;
    const visited = new Set([leaf.schemaPath]);

    while (fileExtendsRef) {
      const parentPath = resolveExtendsSchemaAbs(dir, fileExtendsRef, agentRoot);
      if (!parentPath || visited.has(parentPath)) break;
      visited.add(parentPath);
      const parent = readRawStoreSchemaAt(path.dirname(parentPath), parentPath);
      if (!parent) break;
      chain.unshift(parent);
      dir = path.dirname(parentPath);
      fileExtendsRef = resolveElementExtendsRef(parent.schema.extends);
      if (isTypeIdRef(fileExtendsRef)) {
        fields = {
          ...loadInheritedFieldsFromTypeId(fileExtendsRef, agentRoot, projectRoot).fields,
          ...fields
        };
        break;
      }
    }

    for (const item of chain) {
      fields = { ...fields, ...(item.schema.fields || {}) };
    }
  }

  let fieldsLocal = { ...(leaf.schema.fields || {}) };
  if (schemeOverlay) {
    const localFields = remapLegacyCustomSchemeModFields(schemeOverlay.fields, Object.keys(fields));
    fieldsLocal = { ...localFields };
    fields = { ...fields, ...localFields };
  }

  const merged = {
    ...leaf.schema,
    fields,
    fieldsLocal,
    fieldsInSchemeMod: Boolean(schemeOverlay?.exists),
    elementSchemaTabs: {
      ...(leaf.schema.elementSchemaTabs || {}),
      ...(schemeOverlay?.tabs || {})
    },
    storeBody: leaf.body || leaf.schema.storeBody || "",
    schemaFile: leaf.schemaFile,
    schemeModFile: schemeOverlay?.exists ? SCHEMA_MOD_FILE : "",
    extendsChain: extendsRef ? [extendsRef] : [],
    elementExtends: extendsRef,
    supertype: leaf.schema.supertype || ""
  };
  delete merged.storeBody;
  merged._storeBody = leaf.body || leaf.schema.storeBody || "";
  return merged;
}

function readSortJson(dirPath) {
  const sortPath = path.join(dirPath, "sort.json");
  if (!fs.existsSync(sortPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}

function isNestedSectionManifest(name, relPrefix = "") {
  return (
    String(name || "").toLowerCase() === COLLECTION_MANIFEST.toLowerCase() &&
    Boolean(String(relPrefix || "").trim())
  );
}

function isRecordFile(name, kind, relPrefix = "") {
  const lower = name.toLowerCase();
  const ext = path.extname(lower);
  const isMd = lower.endsWith(".md");
  const isPlain = !isMd && isPlainTextStorageRecordExtension(ext);
  if (!isMd && !isPlain) return false;
  if (isNestedSectionManifest(name, relPrefix)) return true;
  if (isSystemStoreFile(name)) return false;
  if (kind === "single" && lower !== SINGLETON_RECORD) return false;
  if (kind === "collection" && lower === SINGLETON_RECORD) return false;
  return true;
}

function isCsvRecordFile(name) {
  const lower = String(name || "").toLowerCase();
  if (!lower.endsWith(".csv")) return false;
  if (lower === "main.csv") return false;
  if (isSystemStoreFile(name)) return false;
  return true;
}

function walkCsvRecordFiles(dirPath, relPrefix = "", acc = []) {
  if (!fs.existsSync(dirPath)) return acc;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (RECORD_WALK_SKIP_DIRS.has(entry.name)) continue;
      walkCsvRecordFiles(fullPath, path.posix.join(relPrefix, entry.name), acc);
      continue;
    }
    if (!isCsvRecordFile(entry.name)) continue;
    acc.push({
      absPath: fullPath,
      fileName: entry.name,
      relPath: path.posix.join(relPrefix, entry.name).replace(/\\/g, "/")
    });
  }
  return acc;
}

function listCsvRecordFiles(storeAbs) {
  return walkCsvRecordFiles(resolveStoreRecordRootAbs(storeAbs));
}

function parseCsvRecordFile(fileEntry, storeRel, storeAbs, options = {}) {
  const id = path.basename(fileEntry.fileName, path.extname(fileEntry.fileName));
  const innerRel = String(fileEntry.relPath || "").replace(/\\/g, "/");
  let parent = null;
  if (options.hierarchy) {
    const pathParent = path.dirname(innerRel);
    if (pathParent && pathParent !== ".") {
      parent = path.basename(pathParent);
    }
  }
  let csvRowCount = 0;
  let fileSize = 0;
  try {
    const stats = fs.statSync(fileEntry.absPath);
    fileSize = Number(stats.size) || 0;
    const { rows } = parseCsvText(fs.readFileSync(fileEntry.absPath, "utf-8"));
    csvRowCount = Array.isArray(rows) ? rows.length : 0;
  } catch {
    csvRowCount = 0;
    fileSize = 0;
  }
  return {
    id,
    parent,
    relPath: formatStoreRecordRelPath(storeRel, fileEntry.relPath, storeAbs),
    fileName: fileEntry.fileName,
    frontmatter: {},
    body: "",
    title: fileEntry.fileName,
    bodyFields: {},
    isCsvFile: true,
    csvRowCount,
    fileSize
  };
}

function isCollectionContentFile(name) {
  const lower = String(name || "").toLowerCase();
  if (!lower || lower.startsWith(".")) return false;
  if (isSystemStoreFile(name)) return false;
  if (lower === "sort.json") return false;
  if (lower === "schema.yml" || lower.endsWith(".schema.yml")) return false;
  if (lower === "main.csv") return false;
  return true;
}

function walkCollectionFiles(dirPath, fileTypesSpec, relPrefix = "", acc = []) {
  if (!fs.existsSync(dirPath)) return acc;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (RECORD_WALK_SKIP_DIRS.has(entry.name)) continue;
      walkCollectionFiles(fullPath, fileTypesSpec, path.posix.join(relPrefix, entry.name), acc);
      continue;
    }
    if (!isCollectionContentFile(entry.name)) continue;
    if (!matchesFileTypesSpec(entry.name, fileTypesSpec)) continue;
    acc.push({
      absPath: fullPath,
      fileName: entry.name,
      relPath: path.posix.join(relPrefix, entry.name).replace(/\\/g, "/")
    });
  }
  return acc;
}

function listCollectionFiles(storeAbs, fileTypesSpec, relPrefix = "", acc = []) {
  return walkCollectionFiles(resolveStoreRecordRootAbs(storeAbs), fileTypesSpec, relPrefix, acc);
}

function parseCollectionFile(fileEntry, storeRel, storeAbs, options = {}) {
  const id = path.basename(fileEntry.fileName, path.extname(fileEntry.fileName));
  const innerRel = String(fileEntry.relPath || "").replace(/\\/g, "/");
  let parent = null;
  if (options.hierarchy) {
    const pathParent = path.dirname(innerRel);
    if (pathParent && pathParent !== ".") {
      parent = path.basename(pathParent);
    }
  }
  return {
    id,
    parent,
    relPath: formatStoreRecordRelPath(storeRel, fileEntry.relPath, storeAbs),
    fileName: fileEntry.fileName,
    frontmatter: {},
    body: "",
    title: fileEntry.fileName,
    bodyFields: {},
    isFile: true
  };
}

function walkRecordFiles(dirPath, kind, relPrefix = "", acc = []) {
  if (!fs.existsSync(dirPath)) return acc;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (RECORD_WALK_SKIP_DIRS.has(entry.name)) continue;
      walkRecordFiles(fullPath, kind, path.posix.join(relPrefix, entry.name), acc);
      continue;
    }
    if (!isRecordFile(entry.name, kind, relPrefix)) continue;
    acc.push({
      absPath: fullPath,
      fileName: entry.name,
      relPath: path.posix.join(relPrefix, entry.name).replace(/\\/g, "/")
    });
  }
  return acc;
}

function listRecordFiles(storeAbs, kind, relPrefix = "", acc = []) {
  return walkRecordFiles(resolveStoreRecordRootAbs(storeAbs), kind, relPrefix, acc);
}

function parseRecordBodyFields(body) {
  const text = String(body || "").trim();
  if (!text) return {};
  let bodyData = {};
  try {
    bodyData = parseTypeYaml(text) || {};
  } catch {
    return {};
  }
  const raw =
    bodyData["awn-fields"] ||
    bodyData.fields ||
    bodyData.properties ||
    {};
  return normalizeEntityFieldsToStore(raw);
}

function mergeRecordBodyFields(frontmatter, body) {
  const merged = { ...(frontmatter || {}) };
  const text = String(body || "").trim();
  if (!text) return merged;
  let bodyData = {};
  try {
    bodyData = parseTypeYaml(text) || {};
  } catch {
    return merged;
  }
  for (const [key, value] of Object.entries(bodyData)) {
    if (key === "properties") continue;
    const existing = merged[key];
    if (existing !== undefined && existing !== null && String(existing).trim() !== "") continue;
    merged[key] = value;
  }
  return merged;
}

function isSectionManifestRecord(fileEntry) {
  return isNestedSectionManifest(fileEntry?.fileName, path.dirname(String(fileEntry?.relPath || "")));
}

function parseRecordFile(fileEntry, storeRel, storeAbs) {
  const raw = fs.readFileSync(fileEntry.absPath, "utf-8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const mergedFrontmatter = mergeRecordBodyFields(frontmatter, body);
  const sectionManifest = isSectionManifestRecord(fileEntry);
  const sectionFolder = sectionManifest ? path.basename(path.dirname(fileEntry.relPath)) : "";
  const id =
    String(
      mergedFrontmatter["awn-id"] ||
        mergedFrontmatter.id ||
        frontmatter["awn-id"] ||
        frontmatter.id ||
        ""
    ).trim() ||
    sectionFolder ||
    path.basename(fileEntry.fileName, path.extname(fileEntry.fileName));
  const parent = String(
    mergedFrontmatter["awn-parent"] || mergedFrontmatter.parent || frontmatter["awn-parent"] || frontmatter.parent || ""
  ).trim();
  let inferredParent = "";
  if (sectionManifest) {
    const sectionParentPath = path.dirname(path.dirname(fileEntry.relPath));
    inferredParent =
      sectionParentPath && sectionParentPath !== "." ? path.basename(sectionParentPath) : "";
  } else {
    const pathParent = path.dirname(fileEntry.relPath);
    inferredParent = pathParent && pathParent !== "." ? path.basename(pathParent) : "";
  }

  return {
    id,
    parent: parent || inferredParent || null,
    relPath: formatStoreRecordRelPath(storeRel, fileEntry.relPath, storeAbs),
    fileName: fileEntry.fileName,
    frontmatter: mergedFrontmatter,
    body,
    isSection: sectionManifest,
    title: String(
      mergedFrontmatter["awn-title"] ||
        mergedFrontmatter.title ||
        mergedFrontmatter.label ||
        mergedFrontmatter.name ||
        mergedFrontmatter["awn-name"] ||
        id
    ).trim(),
    bodyFields: parseRecordBodyFields(body)
  };
}

function partitionStoreRecords(records) {
  const sections = [];
  const contentRecords = [];
  for (const record of Array.isArray(records) ? records : []) {
    if (record?.isSection) sections.push(record);
    else contentRecords.push(record);
  }
  return { sections, contentRecords };
}

function normalizeSectionInnerRel(relPath) {
  return String(relPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\/manifest\.md$/i, "");
}

function resolveSectionInnerPathFromHit(hit) {
  const explicit = normalizeSectionInnerRel(hit?.sectionPath);
  if (explicit) return explicit;
  const relPath = String(hit?.relPath || "").replace(/\\/g, "/");
  const marker = `/${STORE_STORAGE_ROOT}/${STORE_DATA_DIR}/`;
  const markerIndex = relPath.indexOf(marker);
  if (markerIndex >= 0) {
    const inner = relPath.slice(markerIndex + marker.length);
    return normalizeSectionInnerRel(inner);
  }
  const legacyMarker = "/awn-storage/data/";
  const legacyIndex = relPath.indexOf(legacyMarker);
  if (legacyIndex >= 0) {
    const inner = relPath.slice(legacyIndex + legacyMarker.length);
    return normalizeSectionInnerRel(inner);
  }
  return normalizeSectionInnerRel(hit?.id);
}

function resolveSectionDirectoryAbs(storeAbs, innerPath) {
  const normalized = normalizeSectionInnerRel(innerPath);
  if (!normalized) return null;
  const recordRoot = resolveStoreRecordRootAbs(storeAbs);
  const abs = path.join(recordRoot, normalized);
  const recordRootResolved = path.resolve(recordRoot);
  const absResolved = path.resolve(abs);
  if (absResolved !== recordRootResolved && !absResolved.startsWith(`${recordRootResolved}${path.sep}`)) {
    return null;
  }
  return abs;
}

function listImplicitSectionDirs(recordRootAbs, explicitSectionPaths = new Set()) {
  const implicit = new Map();

  const walk = (dirAbs, relPrefix = "") => {
    if (!fs.existsSync(dirAbs)) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (RECORD_WALK_SKIP_DIRS.has(entry.name)) continue;
      if (!entry.isDirectory()) continue;
      const innerRel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      const manifestAbs = path.join(dirAbs, entry.name, COLLECTION_MANIFEST);
      if (!fs.existsSync(manifestAbs) && !explicitSectionPaths.has(innerRel)) {
        implicit.set(innerRel, innerRel);
      }
      walk(path.join(dirAbs, entry.name), innerRel);
    }
  };

  walk(recordRootAbs, "");
  return [...implicit.values()];
}

function buildImplicitSectionRecord(innerRel, storeRel, storeAbs) {
  const normalized = normalizeSectionInnerRel(innerRel);
  const segments = normalized.split("/").filter(Boolean);
  const id = segments[segments.length - 1] || normalized;
  const parent = segments.length > 1 ? segments[segments.length - 2] : null;
  return {
    id,
    parent,
    relPath: formatStoreRecordRelPath(storeRel, `${normalized}/${COLLECTION_MANIFEST}`, storeAbs),
    fileName: COLLECTION_MANIFEST,
    frontmatter: {},
    body: "",
    isSection: true,
    missingManifest: true,
    sectionPath: normalized,
    title: id
  };
}

function mergeImplicitStoreSections(storeAbs, storeRel, sections, recordHierarchy) {
  if (!recordHierarchy) return sections;
  const explicitPaths = new Set(
    sections
      .map((record) => resolveSectionInnerPathFromHit(record))
      .filter(Boolean)
  );
  const implicitDirs = listImplicitSectionDirs(resolveStoreRecordRootAbs(storeAbs), explicitPaths);
  if (!implicitDirs.length) return sections;
  const knownIds = new Set(sections.map((record) => String(record.id || "").trim()).filter(Boolean));
  const implicitRecords = implicitDirs
    .map((innerRel) => buildImplicitSectionRecord(innerRel, storeRel, storeAbs))
    .filter((record) => record.id && !knownIds.has(record.id));
  return implicitRecords.length ? [...sections, ...implicitRecords] : sections;
}

function buildRecordTree(records) {
  const byId = new Map(records.map((r) => [r.id, { ...r, children: [] }]));
  const roots = [];
  for (const record of byId.values()) {
    const parentId = record.parent;
    if (parentId && byId.has(parentId) && parentId !== record.id) {
      byId.get(parentId).children.push(record);
    } else {
      roots.push(record);
    }
  }
  const strip = (node) => ({
    id: node.id,
    parent: node.parent,
    relPath: node.relPath,
    title: node.title,
    frontmatter: node.frontmatter,
    children: node.children.map(strip)
  });
  return roots.map(strip);
}

function resolveStoreSchemaPath(storeAbs) {
  const manifestPath = path.join(storeAbs, COLLECTION_MANIFEST);
  if (fs.existsSync(manifestPath)) {
    const parts = readStoreMdParts(manifestPath);
    if (parts && isStoreManifestFrontmatter(parts.frontmatter)) return manifestPath;
  }
  const contractPath = path.join(storeAbs, STORE_CONTRACT_FILE);
  if (fs.existsSync(contractPath)) return contractPath;
  const legacyMdPath = path.join(storeAbs, STORE_MD_FILE);
  if (fs.existsSync(legacyMdPath)) return legacyMdPath;
  const storePath = path.join(storeAbs, STORE_FILE);
  if (fs.existsSync(storePath)) return storePath;
  const legacyPath = path.join(storeAbs, LEGACY_STORE_FILE);
  if (fs.existsSync(legacyPath)) return legacyPath;
  return contractPath;
}

function discoverStoreDirs(dataRoot, acc = [], rel = "") {
  if (!dataRoot || !fs.existsSync(dataRoot)) return acc;
  const manifestPath = path.join(dataRoot, COLLECTION_MANIFEST);
  if (fs.existsSync(manifestPath)) {
    const parts = readStoreMdParts(manifestPath);
    if (parts && isAwnInfoblockFrameManifest(parts.frontmatter)) {
      acc.push({ absPath: dataRoot, relPath: rel.replace(/\\/g, "/") || path.basename(dataRoot) });
    }
  } else {
    const schemaPath = resolveStoreSchemaPath(dataRoot);
    if (schemaPath && fs.existsSync(schemaPath) && schemaPath !== manifestPath) {
      const leaf = readRawStoreSchemaAt(dataRoot, schemaPath);
      const kind = normalizeStoreKind(leaf?.schema?.kind || "");
      if (STORE_KINDS.has(kind)) {
        acc.push({ absPath: dataRoot, relPath: rel.replace(/\\/g, "/") || path.basename(dataRoot) });
      }
    }
  }
  for (const entry of fs.readdirSync(dataRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || DISCOVER_SKIP_DIRS.has(entry.name)) continue;
    const childRel = rel ? path.posix.join(rel, entry.name) : entry.name;
    discoverStoreDirs(path.join(dataRoot, entry.name), acc, childRel);
  }
  return acc;
}

function loadStore(dataRoot, storeEntry) {
  const storeAbs = storeEntry.absPath;
  const storeRel = storeEntry.relPath;
  const schema = loadMergedStoreSchema(storeAbs, dataRoot);
  if (!schema) return null;

  const kind = normalizeStoreKind(schema.kind || "collection");
  if (!STORE_KINDS.has(kind)) return null;

  const id = String(schema.id || storeRel).trim();
  const name = String(schema.name || id).trim();
  const sortOrder = readSortJson(storeAbs);

  let manifestMarkdown = readPlainManifestBody(storeAbs);
  if (!manifestMarkdown) {
    manifestMarkdown = String(schema._storeBody || "").trim();
  }
  const manifestDescription = manifestMarkdown.split("\n")[0]?.replace(/^#\s*/, "").trim() || "";

  const schemaFile = String(schema.schemaFile || COLLECTION_MANIFEST).trim() || COLLECTION_MANIFEST;
  const schemaRelPath = `${storeRel}/${schemaFile}`.replace(/\\/g, "/");
  const manifestRelPath = schemaRelPath;
  const schemeModRelPath = schema.schemeModFile
    ? `${storeRel}/${schema.schemeModFile}`.replace(/\\/g, "/")
    : "";

  const collectionKind = kind === "collection" ? getCollectionKind(schema) : "records";
  const collectionType = kind === "collection" ? getCollectionType(schema) : "md";
  const recordHierarchy = kind === "collection" ? getRecordHierarchy(schema) : false;
  const recordFileTypes = kind === "collection" ? getRecordFileTypes(schema) : "";
  const recordStorage = kind === "collection" ? getRecordStorage(schema) : "md";
  let records = [];
  if (kind !== "group") {
    if (kind === "collection" && collectionKind === "files") {
      const fileEntries = listCollectionFiles(storeAbs, recordFileTypes);
      records = fileEntries.map((fileEntry) =>
        parseCollectionFile(fileEntry, storeRel, storeAbs, { hierarchy: recordHierarchy })
      );
      if (recordHierarchy) {
        const sectionEntries = listRecordFiles(storeAbs, kind).filter((fileEntry) =>
          isNestedSectionManifest(fileEntry.fileName, path.dirname(fileEntry.relPath))
        );
        const sections = sectionEntries.map((fileEntry) => parseRecordFile(fileEntry, storeRel, storeAbs));
        records = [...sections, ...records];
      }
    } else if (kind === "collection" && recordStorage === "csv-files") {
      const recordFiles = listCsvRecordFiles(storeAbs);
      records = recordFiles.map((fileEntry) =>
        parseCsvRecordFile(fileEntry, storeRel, storeAbs, { hierarchy: recordHierarchy })
      );
      if (recordHierarchy) {
        const sectionEntries = listRecordFiles(storeAbs, kind).filter((fileEntry) =>
          isNestedSectionManifest(fileEntry.fileName, path.dirname(fileEntry.relPath))
        );
        const sections = sectionEntries.map((fileEntry) => parseRecordFile(fileEntry, storeRel, storeAbs));
        records = [...sections, ...records];
      }
    } else if (kind === "collection" && recordStorage === "csv") {
      records = loadCsvRecords(storeAbs, storeRel, schema);
    } else {
      const recordFiles = listRecordFiles(storeAbs, kind);
      records = recordFiles.map((f) => parseRecordFile(f, storeRel, storeAbs));
    }
  }

  const csvFileName = recordStorage === "csv" ? getCsvFileName(schema) : "";
  const csvRecordFileRelPath =
    recordStorage === "csv" ? formatCsvRecordRelPath(storeRel, csvFileName, storeAbs) : "";
  const csvUsesNestedLayout =
    Boolean(csvRecordFileRelPath) &&
    csvRecordFileRelPath.includes(`${STORE_STORAGE_ROOT}/${STORE_DATA_DIR}/`);

  const payload = {
    id,
    relPath: storeRel,
    kind,
    name,
    description: String(schema.description || manifestDescription || "").trim(),
    manifestMarkdown,
    manifestRelPath,
    schemaRelPath,
    schemeModRelPath,
    schemeModFile: schema.schemeModFile || "",
    schemaFile,
    schema,
    sortOrder,
    collectionKind,
    collectionType,
    recordHierarchy,
    recordFileTypes,
    recordStorage,
    recordCount: kind === "group" ? 0 : partitionStoreRecords(records).contentRecords.length,
    recordFile:
      kind === "single"
        ? SINGLETON_RECORD
        : kind === "collection" && recordStorage === "csv"
          ? csvFileName
          : null,
    recordFileExists:
      recordStorage === "csv" ? fs.existsSync(resolveCsvAbsPath(storeAbs, schema)) : undefined,
    recordFileRelPath: recordStorage === "csv" ? csvRecordFileRelPath : undefined,
    storageLayout:
      recordStorage === "csv"
        ? csvUsesNestedLayout
          ? "storage-data"
          : "flat"
        : usesStoreStorageDataLayout(storeAbs)
          ? "storage-data"
          : "flat",
    recordRoot:
      recordStorage === "csv"
        ? csvUsesNestedLayout
          ? `${STORE_STORAGE_ROOT}/${STORE_DATA_DIR}`
          : ""
        : usesStoreStorageDataLayout(storeAbs)
          ? `${STORE_STORAGE_ROOT}/${STORE_DATA_DIR}`
          : "",
    assetsRoot: fs.existsSync(path.join(storeAbs, STORE_STORAGE_ROOT, STORE_ASSETS_DIR))
      ? `${STORE_STORAGE_ROOT}/${STORE_ASSETS_DIR}`
      : ""
  };

  if (kind === "group") {
    payload.children = [];
    payload.childCount = 0;
    return payload;
  }

  if (kind === "single") {
    const main = records.find((r) => r.fileName === SINGLETON_RECORD) || records[0] || null;
    payload.record = main;
    payload.records = main ? [main] : [];
  } else {
    const { sections, contentRecords } = partitionStoreRecords(records);
    const mergedSections =
      kind === "collection" && recordHierarchy
        ? mergeImplicitStoreSections(storeAbs, storeRel, sections, recordHierarchy)
        : sections;
    payload.sections = mergedSections;
    payload.records = contentRecords;
    payload.tree = buildRecordTree([...mergedSections, ...contentRecords]);
  }

  return payload;
}

function organizeAwnDataStores(stores, dataRoot) {
  if (!stores.length) return [];

  const byRel = new Map(stores.map((s) => [s.relPath, s]));
  const groupRels = new Set(stores.filter((s) => s.kind === "group").map((s) => s.relPath));
  const topLevel = [];

  for (const store of stores) {
    if (store.kind === "group") {
      store.children = [];
      continue;
    }
    const slash = store.relPath.indexOf("/");
    if (slash > 0) {
      const parentRel = store.relPath.slice(0, slash);
      if (groupRels.has(parentRel)) {
        const group = byRel.get(parentRel);
        if (group) {
          group.children.push(store);
          continue;
        }
      }
    }
    topLevel.push(store);
  }

  for (const group of stores.filter((s) => s.kind === "group")) {
    const groupSort = readSortJson(path.join(dataRoot, group.relPath));
    if (group.children.length) {
      group.children.sort((a, b) => compareAwnDataStoreSiblings(a, b, groupSort));
    }
    group.childCount = group.children.length;
    group.recordCount = group.children.reduce((sum, child) => sum + (Number(child.recordCount) || 0), 0);
    topLevel.push(group);
  }

  const rootSort = readSortJson(dataRoot);
  topLevel.sort((a, b) => compareAwnDataStoresTopLevel(a, b, rootSort));

  return topLevel;
}

function loadAwnDataStores(agentRoot, projectRoot = process.cwd()) {
  const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
  if (!dataRoot || !fs.existsSync(dataRoot)) {
    return { root: dataRoot, stores: [] };
  }

  const discovered = discoverStoreDirs(dataRoot);
  const flatStores = discovered.map((entry) => loadStore(dataRoot, entry)).filter(Boolean);
  const stores = organizeAwnDataStores(flatStores, dataRoot);

  return {
    specVersion: "0.2",
    model: "awn-databases",
    root: dataRoot.replace(/\\/g, "/"),
    storeCount: stores.length,
    stores
  };
}

function findAwnDataStore(stores, filter) {
  const needle = String(filter || "").trim();
  if (!needle) return null;

  function walk(list) {
    for (const store of list || []) {
      if (store.id === needle || store.relPath === needle || store.relPath.endsWith(`/${needle}`)) {
        return store;
      }
      if (store.kind === "group" && store.children?.length) {
        const nested = walk(store.children);
        if (nested) return nested;
      }
    }
    return null;
  }

  return walk(stores);
}

function isLegacyOnlyAwnDataStores(stores) {
  const list = Array.isArray(stores) ? stores : [];
  if (!list.length) return true;
  if (list.length !== 1) return false;
  const rel = String(list[0]?.relPath || list[0]?.id || "").trim();
  return rel === "_base";
}

function resolveAwnDataReadRoot(agentRoot, projectRoot = process.cwd()) {
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot, projectRoot);
  if (!agentRootAbs) {
    return { readRoot: "", source: "agent", sourceAgentId: "", payload: { stores: [], storeCount: 0 } };
  }

  const agentPayload = loadAwnDataStores(agentRootAbs, projectRoot);
  return {
    readRoot: agentRootAbs,
    source: "agent",
    sourceAgentId: path.basename(agentRootAbs),
    payload: agentPayload
  };
}

function getAwnDataPayload(agentRoot, projectRoot = process.cwd(), storeId = "") {
  const resolved = resolveAwnDataReadRoot(agentRoot, projectRoot);
  const payload = resolved.payload || loadAwnDataStores(resolved.readRoot || agentRoot, projectRoot);
  const filter = String(storeId || "").trim();

  const enriched = {
    ...payload,
    source: resolved.source,
    sourceAgentId: resolved.sourceAgentId,
    readRoot: String(resolved.readRoot || "").replace(/\\/g, "/")
  };

  if (!filter) return enriched;

  const store = findAwnDataStore(enriched.stores, filter);
  if (!store) {
    return { ...enriched, store: null, error: "store not found" };
  }
  return { ...enriched, store };
}

const BASE_SCHEMA_TEMPLATE = `---
awn-type: awn.infoblock.base
awn-layer: awn-databases-base
awn-fields:
  awn-id:
    type: awn.string
    title: ID
    description: Идентификатор записи (= имя файла без .md)
    locked: true
  awn-created:
    type: awn.datetime
    title: Создано
  awn-updated:
    type: awn.datetime
    title: Обновлено
---

Базовые поля каждой записи в awn-databases (наследуются всеми накопителями).
`;

function yamlQuote(value) {
  const text = String(value ?? "");
  if (!text || /[:#\n[\]{}&,*>!|@`"]/.test(text)) {
    return JSON.stringify(text);
  }
  return text;
}

function dumpYamlBlock(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  const lines = [];
  for (const [key, value] of Object.entries(obj || {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      lines.push(`${pad}${key}:`);
      lines.push(...dumpYamlBlock(value, indent + 1));
      continue;
    }
    if (Array.isArray(value)) {
      lines.push(`${pad}${key}:`);
      for (const item of value) {
        if (item && typeof item === "object") {
          lines.push(`${pad}  -`);
          lines.push(...dumpYamlBlock(item, indent + 2).map((line) => line || `${pad}    `));
        } else {
          lines.push(`${pad}  - ${yamlQuote(item)}`);
        }
      }
      continue;
    }
    lines.push(`${pad}${key}: ${yamlQuote(value)}`);
  }
  return lines;
}

function manifestFieldDefaultYaml(key, fieldDef) {
  const def = fieldDef && typeof fieldDef === "object" ? fieldDef : {};
  const defaultValue = def.default;
  if (defaultValue === undefined || defaultValue === null || String(defaultValue).trim() === "") {
    const kind = String(def.type || def.kind || "").toLowerCase();
    if (kind.includes("array") || kind.includes("list") || kind.includes("tags")) return `${key}: []`;
    if (kind.includes("bool")) return `${key}: false`;
    return `${key}: ""`;
  }
  if (typeof defaultValue === "boolean") return `${key}: ${defaultValue}`;
  if (typeof defaultValue === "number") return `${key}: ${defaultValue}`;
  if (Array.isArray(defaultValue)) return `${key}: []`;
  return `${key}: ${yamlQuote(String(defaultValue))}`;
}

function buildContainerManifestFrontmatter(typeId, displayName, fields) {
  const normalized = normalizeAwnFieldsMap(fields || {});
  const now = new Date().toISOString();
  const lines = [];
  const preferredOrder = [
    "awn-name",
    "awn-description",
    "awn-preview",
    "awn-web-url",
    "awn-status",
    "awn-quality",
    "awn-importance",
    "awn-note-todo-sticker",
    "awn-emoji",
    "awn-sort",
    "awn-runtime-load-always",
    "awn-runtime-heartbeat",
    "awn-runtime-cron",
    "awn-runtime-cron-schedule",
    "awn-runtime-commands",
    "awn-index-exclude-record",
    "awn-index-exclude-subtree",
    "awn-taxonomy",
    "awn-owner",
    "awn-type",
    "awn-create",
    "awn-update",
    "awn-version"
  ];
  const orderedKeys = [
    ...preferredOrder.filter((key) => key in normalized),
    ...Object.keys(normalized).filter((key) => !preferredOrder.includes(key))
  ];
  const seen = new Set();

  for (const key of orderedKeys) {
    if (seen.has(key) || key === "awn-id") continue;
    seen.add(key);
    if (key === "awn-type") {
      lines.push(`awn-type: ${typeId}`);
      continue;
    }
    if (key === "awn-name" && displayName) {
      lines.push(`awn-name: ${yamlQuote(displayName)}`);
      continue;
    }
    if (key === "awn-create" || key === "awn-update") {
      lines.push(`${key}: ${now}`);
      continue;
    }
    lines.push(manifestFieldDefaultYaml(key, normalized[key]));
  }

  if (!seen.has("awn-type")) lines.push(`awn-type: ${typeId}`);
  if (displayName && !seen.has("awn-name")) lines.push(`awn-name: ${yamlQuote(displayName)}`);
  if (!seen.has("awn-create")) lines.push(`awn-create: ${now}`);
  if (!seen.has("awn-update")) lines.push(`awn-update: ${now}`);

  return lines.join("\n");
}

function resolveContainerManifestFields(schema, kind, options = {}) {
  const normalizedKind = normalizeStoreKind(kind);
  const fromOptions = normalizeAwnFieldsMap(options.typeFields || {});
  if (Object.keys(fromOptions).length) return fromOptions;

  const fromSchema = normalizeAwnFieldsMap(
    schema?.containerFields || (normalizedKind === "group" ? schema?.fields : null) || {}
  );
  if (Object.keys(fromSchema).length) return fromSchema;

  const typeMeta = loadContainerTypeMeta(
    normalizedKind,
    options.agentRoot || "",
    options.projectRoot || process.cwd()
  );
  return normalizeAwnFieldsMap(typeMeta.typeFields || {});
}

function buildStoreManifestContent(schema, body = "", options = {}) {
  const kind = normalizeStoreKind(schema.kind || "collection");
  const typeId =
    schema.typeId ||
    schema.supertype ||
    KIND_TO_AWN_PROP_TYPE[kind] ||
    CONTAINER_TYPE_ID.collection ||
    "awn.infoblock.collection";
  const agentRoot = options.agentRoot || "";
  const projectRoot = options.projectRoot || process.cwd();
  const displayName = String(schema.name || schema.id || "").trim();
  const userDescription = String(schema.description || "").trim();

  const containerFields = resolveContainerManifestFields(schema, kind, options);
  let frontmatter = "";
  if (Object.keys(containerFields).length) {
    frontmatter = buildContainerManifestFrontmatter(typeId, displayName, containerFields);
  }

  if (!frontmatter) {
    const fallback = [];
    fallback.push(`awn-type: ${typeId}`);
    if (schema.id) fallback.push(`awn-id: ${schema.id}`);
    if (schema.layer) fallback.push(`awn-layer: ${schema.layer}`);
    if (displayName) fallback.push(`awn-name: ${yamlQuote(displayName)}`);
    frontmatter = fallback.join("\n");
  }

  const overrides = {};
  if (schema.id) overrides["awn-id"] = schema.id;
  if (schema.layer) overrides["awn-layer"] = schema.layer;
  if (userDescription && userDescription !== displayName) overrides["awn-description"] = userDescription;
  const indexFlags =
    options.indexExcludeFlags ||
    (options.indexExclude ? { record: true, subtree: true } : null);
  if (indexFlags?.record) overrides["awn-index-exclude-record"] = true;
  if (indexFlags?.subtree) overrides["awn-index-exclude-subtree"] = true;

  if (kind !== "group") {
    const record = schema.record && typeof schema.record === "object" ? schema.record : {};
    overrides["awn-collection-type"] = collectionTypeFromRecordProps(record);
    if (record.storage) overrides["awn-record-storage"] = record.storage;
    if (record["id-mode"]) overrides["awn-record-id-mode"] = record["id-mode"];
    if (record.file) overrides["awn-record-file"] = record.file;
    if (record.hierarchy !== undefined) overrides["awn-record-hierarchy"] = Boolean(record.hierarchy);
    if (record.fileTypes !== undefined && String(record.fileTypes).trim()) {
      overrides["awn-record-file-types"] = String(record.fileTypes).trim();
    }
  }

  const taxonomy = schema.taxonomy && typeof schema.taxonomy === "object" ? schema.taxonomy : null;
  if (taxonomy?.key) overrides["awn-taxonomy-key"] = String(taxonomy.key).trim();
  if (taxonomy?.cardinality) {
    overrides["awn-taxonomy-cardinality"] =
      String(taxonomy.cardinality).trim().toLowerCase() === "many" ? "many" : "one";
  }

  frontmatter = mergeFrontmatterOverrides(frontmatter, overrides);

  const manifestBody =
    String(body || "").trim() ||
    buildPlainManifestContent(schema.name, schema.description).trim();
  return `---\n${frontmatter}\n---\n\n${manifestBody}\n`;
}

/** @deprecated use buildStoreManifestContent */
function buildStoreMdContent(schema) {
  return buildStoreManifestContent(schema, schema.description ? `# ${schema.name || schema.id}\n\n${schema.description}` : "");
}

function buildPlainManifestContent(name, body = "") {
  const title = String(name || "Накопитель").trim();
  const text = String(body || "").trim();
  if (!text) return `# ${title}\n\n${title}.\n`;
  if (text.startsWith("#")) return `${text}\n`;
  return `# ${title}\n\n${text}\n`;
}

function nowIsoMinute() {
  return new Date().toISOString().slice(0, 16);
}

function normalizeStoreSlug(slug) {
  const raw = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!raw || raw.includes("..")) return "";
  const segments = raw.split("/").filter(Boolean);
  if (!segments.length) return "";
  for (const seg of segments) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(seg)) return "";
  }
  return segments.join("/");
}

function slugifyStoreName(name) {
  const map = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
    й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
    у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
    э: "e", ю: "yu", я: "ya"
  };
  const text = String(name || "")
    .trim()
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  return text || "store";
}

function ensureAwnDataBase(agentRoot, projectRoot = process.cwd()) {
  const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
  if (!dataRoot) throw new Error("Agent root not set");
  fs.mkdirSync(dataRoot, { recursive: true });
  return dataRoot;
}

function getStoreAbsolutePath(dataRoot, storeRel) {
  const normalized = normalizeStoreSlug(storeRel);
  if (!normalized) return null;
  const abs = path.join(dataRoot, normalized);
  if (!abs.startsWith(dataRoot)) return null;
  return abs;
}

function storeSchemaExists(dataRoot, storeRel) {
  const abs = getStoreAbsolutePath(dataRoot, storeRel);
  return Boolean(abs && fs.existsSync(resolveStoreSchemaPath(abs)));
}

function appendGroupSortEntry(dataRoot, groupRel, childSlug) {
  const groupAbs = getStoreAbsolutePath(dataRoot, groupRel);
  if (!groupAbs) return;
  const sortPath = path.join(groupAbs, "sort.json");
  let order = [];
  if (fs.existsSync(sortPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
      if (Array.isArray(parsed)) order = parsed.map(String);
    } catch {
      order = [];
    }
  }
  const slug = String(childSlug || "").trim();
  if (slug && !order.includes(slug)) {
    order.push(slug);
    fs.writeFileSync(sortPath, `${JSON.stringify(order, null, 2)}\n`, "utf-8");
  }
}

function appendRootSortEntry(dataRoot, storeRel) {
  const sortPath = path.join(dataRoot, "sort.json");
  let order = [];
  if (fs.existsSync(sortPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
      if (Array.isArray(parsed)) order = parsed.map(String);
    } catch {
      order = [];
    }
  }
  const top = storeRel.split("/")[0];
  if (!order.includes(top)) order.push(top);
  fs.writeFileSync(sortPath, `${JSON.stringify(order, null, 2)}\n`, "utf-8");
}

function loadContainerTypeMeta(kind, agentRoot, projectRoot) {
  const normalizedKind = normalizeStoreKind(kind);
  const typeDefaults = loadContainerTypeDefaults(normalizedKind, agentRoot, projectRoot);
  const typeId = typeDefaults.typeId || CONTAINER_TYPE_ID[normalizedKind] || "";
  let typeDescription = "";
  let typeFields = typeDefaults.fields || {};
  try {
    const { getTypeDetailByTypeId } = require("./type-catalog-loader");
    const detail = getTypeDetailByTypeId(projectRoot, agentRoot, typeId);
    if (detail) {
      typeDescription = String(detail.description || "").trim();
      if (detail.mergedFields && typeof detail.mergedFields === "object") {
        typeFields = normalizeAwnFieldsMap(detail.mergedFields);
      }
    }
  } catch {
    // ignore
  }
  return { normalizedKind, typeId, typeDescription, typeFields, typeDefaults };
}

function buildStoreManifestBody({ name, description, typeDescription, fallbackTitle = "Накопитель" }) {
  const title = String(name || fallbackTitle).trim() || fallbackTitle;
  const userDesc = String(description || "").trim();
  const typeDesc = String(typeDescription || "").trim();
  const lines = [`# ${title}`, ""];
  if (userDesc) lines.push(userDesc);
  else if (typeDesc) lines.push(typeDesc);
  else lines.push(`${title}.`);
  return `${lines.join("\n")}\n`;
}

function buildContainerManifestRecord(kind, { typeDefaults, typeFields, options = {} }) {
  const normalizedKind = normalizeStoreKind(kind);
  if (normalizedKind === "group") return {};

  if (normalizedKind === "single") {
    return {
      storage: "md",
      file: "main.md",
      collectionType: "md",
      collectionKind: "records"
    };
  }

  const collectionKind = normalizeCollectionKind(
    options.collectionKind ?? typeDefaults.collectionKind,
    "records"
  );
  const recordStorage = normalizeRecordStorage(options.recordStorage ?? typeDefaults.recordStorage, "md");
  const hierarchy =
    recordStorage === "csv"
      ? false
      : Boolean(options.recordHierarchy ?? typeDefaults.recordHierarchy ?? false);
  const fileTypes =
    collectionKind === "files"
      ? String(options.recordFileTypes ?? typeDefaults.recordFileTypes ?? "").trim()
      : "";
  const collectionType =
    String(options.collectionType || "").trim().toLowerCase() ||
    collectionTypeFromRecordProps({ collectionKind, storage: recordStorage });
  const idMode =
    String(options.idMode || readTypeFieldDefault(typeFields, "awn-record-id-mode") || "slug").trim() ||
    "slug";

  const record = {
    collectionType,
    collectionKind,
    storage: recordStorage,
    "id-mode": idMode,
    hierarchy,
    ...(fileTypes ? { fileTypes } : {})
  };

  if (recordStorage === "csv") record.file = "main.csv";
  else if (recordStorage === "csv-files") record.file = "{id}.csv";
  else if (collectionKind !== "files") record.file = "{id}.md";

  return record;
}

function loadStoreElementScheme(
  agentRoot,
  projectRoot,
  fallbackFields,
  fallbackTabs = { main: "Основное" },
  elementType = ELEMENT_TYPE_RECORD
) {
  const typeId = String(elementType || ELEMENT_TYPE_RECORD).trim() || ELEMENT_TYPE_RECORD;
  const inherited = loadInheritedFieldsFromTypeId(typeId, agentRoot, projectRoot);
  const rawFields = inherited.fields || {};
  if (!Object.keys(rawFields).length) {
    return { extends: typeId, fields: fallbackFields, tabs: fallbackTabs };
  }
  const fields = {};
  for (const [key, def] of Object.entries(rawFields)) {
    if (!def || typeof def !== "object") continue;
    fields[key] = { ...def, tab: def.tab || "main" };
  }
  if (!fields["awn-title"] && !fields["awn-name"]) {
    fields["awn-title"] = { type: "awn.string", title: "Название", required: true, tab: "main" };
  }
  return {
    extends: typeId,
    fields,
    tabs: inherited.tabs && Object.keys(inherited.tabs).length ? inherited.tabs : { main: "Основное" }
  };
}

function resolveStoreRecordElementType(storeAbs, agentRoot = "", projectRoot = process.cwd(), dataRoot = "") {
  const overlay = readStoreSchemeModOverlay(storeAbs);
  const overlayExtends = resolveElementExtendsRef(
    overlay?.blocks?.["record-csv"]?.extends ||
      overlay?.extends ||
      overlay?.blocks?.record?.extends ||
      ""
  );
  if (overlayExtends && overlayExtends !== ELEMENT_TYPE_RECORD) return overlayExtends;

  const merged = loadMergedStoreSchema(storeAbs, dataRoot || "");
  const mergedExtends = resolveElementExtendsRef(merged?.elementExtends || merged?.extends || "");
  if (mergedExtends && mergedExtends !== ELEMENT_TYPE_RECORD) return mergedExtends;

  const collectionType = getCollectionType(merged);
  return elementTypeFromCollectionType(collectionType);
}

function buildCollectionManifestBody({ name, description, typeDescription }) {
  return buildStoreManifestBody({
    name,
    description,
    typeDescription,
    fallbackTitle: "Коллекция"
  });
}

function tableBaseExtendsPath() {
  return TABLE_BASE_EXTENDS;
}

function rowBaseExtendsPath() {
  return ROW_BASE_EXTENDS;
}

function entityBaseExtendsPath() {
  return ENTITY_BASE_EXTENDS;
}

/** @deprecated use rowBaseExtendsPath for record/element schema */
function recordBaseExtendsPath(_slug) {
  return rowBaseExtendsPath();
}

function buildCollectionSchemaContent({
  slug,
  name,
  description,
  recordStorage = "md",
  collectionKind = "records",
  collectionType = "",
  recordHierarchy = false,
  recordFileTypes = "",
  agentRoot = "",
  projectRoot = process.cwd()
}) {
  const typeMeta = loadContainerTypeMeta("collection", agentRoot, projectRoot);
  const userDescription = String(description || "").trim();
  const displayName = String(name || slug).trim();
  const desc = userDescription || displayName;
  const resolvedCollectionType =
    normalizeCollectionType(
      collectionType ||
        collectionTypeFromRecordProps({ collectionKind, storage: recordStorage }),
      "md"
    );
  const recordElementType = elementTypeFromCollectionType(resolvedCollectionType);
  const record = buildContainerManifestRecord("collection", {
    typeDefaults: typeMeta.typeDefaults,
    typeFields: typeMeta.typeFields,
    options: {
      collectionKind,
      recordStorage,
      collectionType: resolvedCollectionType,
      recordHierarchy,
      recordFileTypes
    }
  });
  const fallbackRecordFields = {
    "awn-title": { type: "awn.string", title: "Название", required: true, tab: "main" },
    "awn-parent": {
      type: "awn.string",
      title: "Родитель",
      description: "id родительской записи",
      tab: "main"
    },
    "awn-status": {
      type: "awn.field.choice.one",
      title: "Статус",
      enum: ["open", "done"],
      default: "open",
      tab: "main"
    }
  };
  const elementScheme = loadStoreElementScheme(
    agentRoot,
    projectRoot,
    fallbackRecordFields,
    { main: "Основное" },
    recordElementType
  );
  return {
    schema: {
      kind: "collection",
      name: displayName,
      description: desc,
      typeId: typeMeta.typeId || CONTAINER_TYPE_ID.collection,
      supertype: typeMeta.typeId || CONTAINER_TYPE_ID.collection,
      extends: elementScheme.extends,
      fieldsInSchemeMod: false,
      record,
      fields: elementScheme.fields,
      containerFields: normalizeAwnFieldsMap(typeMeta.typeFields || {}),
      elementSchemaTabs: elementScheme.tabs
    },
    schemeModFields: null,
    schemeModTabs: elementScheme.tabs,
    schemeModExtends: elementScheme.extends,
    manifestBody: buildCollectionManifestBody({
      name: displayName,
      description: userDescription,
      typeDescription: typeMeta.typeDescription
    })
  };
}

function inferTaxonomyKeyFromSlug(slug) {
  const leaf = String(slug || "").split("/").pop() || "";
  if (leaf === "categories") return "category";
  if (leaf === "colors") return "color";
  return leaf;
}

function inferTaxonomyCardinality(key, slug = "") {
  const normalized = String(key || slug || "").trim().toLowerCase();
  if (normalized === "tags" || normalized === "color" || normalized === "colors") return "many";
  if (normalized === "category" || normalized === "categories") return "one";
  return "one";
}

function buildTaxonomyCollectionSchemaContent({ slug, name, description, taxonomyKey, taxonomyCardinality, hierarchy }) {
  const id = slug.replace(/\//g, ".");
  const shortName = name || slug.split("/").pop();
  const desc = String(description || shortName).trim();
  const key = String(taxonomyKey || inferTaxonomyKeyFromSlug(slug)).trim();
  const cardinality = String(taxonomyCardinality || inferTaxonomyCardinality(key, slug)).trim().toLowerCase();
  const recordFields = {
    "awn-code": { type: "awn.string", title: "Код", required: true },
    "awn-label": { type: "awn.string", title: "Подпись", required: true },
    "awn-emoji": { type: "awn.string", title: "Эмодзи" },
    "awn-color": { type: "awn.color", title: "Цвет" },
    "awn-sort": { type: "awn.integer", title: "Порядок", default: 0 }
  };
  return {
    schema: {
      kind: "collection",
      id,
      name: shortName,
      description: desc,
      extends: ELEMENT_TYPE_RECORD_CSV,
      fieldsInSchemeMod: true,
      taxonomy: {
        key,
        cardinality: cardinality === "many" ? "many" : "one",
        hierarchy: Boolean(hierarchy)
      },
      record: {
        storage: "csv",
        file: "main.csv",
        "id-mode": "slug",
        hierarchy: Boolean(hierarchy),
        collectionType: "csv"
      },
      fields: recordFields
    },
    schemeModFields: recordFields,
    schemeModExtends: ELEMENT_TYPE_RECORD_CSV,
    manifestBody: `# ${shortName}\n\n${desc}\n\nКлюч в \`awn-taxonomy.${key}\`. Кардинальность: ${cardinality}.`
  };
}

function buildSingletonSchemaContent({
  slug,
  name,
  description,
  agentRoot = "",
  projectRoot = process.cwd()
}) {
  const typeMeta = loadContainerTypeMeta("single", agentRoot, projectRoot);
  const userDescription = String(description || "").trim();
  const displayName = String(name || slug).trim();
  const desc = userDescription || displayName;
  const record = buildContainerManifestRecord("single", {
    typeDefaults: typeMeta.typeDefaults,
    typeFields: typeMeta.typeFields,
    options: {}
  });
  const fallbackRecordFields = {
    "awn-title": { type: "awn.string", title: "Название", required: true, tab: "main" }
  };
  const elementScheme = loadStoreElementScheme(
    agentRoot,
    projectRoot,
    fallbackRecordFields,
    { main: "Основное" }
  );
  return {
    schema: {
      kind: "single",
      name: displayName,
      description: desc,
      typeId: typeMeta.typeId || CONTAINER_TYPE_ID.single,
      supertype: typeMeta.typeId || CONTAINER_TYPE_ID.single,
      extends: elementScheme.extends,
      fieldsInSchemeMod: false,
      record,
      fields: elementScheme.fields,
      containerFields: normalizeAwnFieldsMap(typeMeta.typeFields || {}),
      elementSchemaTabs: elementScheme.tabs
    },
    schemeModFields: null,
    schemeModTabs: elementScheme.tabs,
    schemeModExtends: elementScheme.extends,
    manifestBody: buildStoreManifestBody({
      name: displayName,
      description: userDescription,
      typeDescription: typeMeta.typeDescription,
      fallbackTitle: "Одиночка"
    })
  };
}

function buildGroupSchemaContent({ slug, name, description, agentRoot, projectRoot }) {
  const typeMeta = loadContainerTypeMeta("group", agentRoot, projectRoot);
  const userDescription = String(description || "").trim();
  const displayName = String(name || slug).trim();
  const desc = userDescription || displayName;
  const containerFields = normalizeAwnFieldsMap(typeMeta.typeFields || {});
  return {
    schema: {
      kind: "group",
      name: displayName,
      description: desc,
      typeId: typeMeta.typeId || CONTAINER_TYPE_ID.group,
      supertype: typeMeta.typeId || CONTAINER_TYPE_ID.group,
      fields: containerFields,
      record: {}
    },
    manifestBody: buildStoreManifestBody({
      name: displayName,
      description: userDescription,
      typeDescription: typeMeta.typeDescription,
      fallbackTitle: "Группа"
    })
  };
}

function writeStoreManifest(storeAbs, schema, manifestBody = "", options = {}) {
  fs.writeFileSync(
    path.join(storeAbs, COLLECTION_MANIFEST),
    buildStoreManifestContent(schema, manifestBody, options),
    "utf-8"
  );
}

/** @deprecated use writeStoreManifest */
function writeStoreContractBundle(storeAbs, schema, manifestBody = "") {
  writeStoreManifest(storeAbs, schema, manifestBody);
}

function resolveElementManifestFields(elementType, agentRoot = "", projectRoot = process.cwd()) {
  return normalizeAwnFieldsMap(
    loadInheritedFieldsFromTypeId(elementType, agentRoot, projectRoot).fields || {}
  );
}

function resolveStoreElementSchemaKind(elementType) {
  const typeId = String(elementType || DEFAULT_RECORD_ELEMENT_TYPE).trim();
  if (typeId === ELEMENT_TYPE_CATEGORY) return "category";
  if (typeId === ELEMENT_TYPE_SIDECAR) return "sidecar";
  if (typeId === ELEMENT_TYPE_RECORD_CSV) return "record-csv";
  return "record";
}

function resolveStoreSchemeModBlockForKind(overlay, kind, storeAbs) {
  const frameTypeId = resolveStoreFrameTypeId(storeAbs);
  const directBlock = overlay?.blocks?.[kind];
  if (directBlock) return directBlock;

  const legacyRecordBlock = overlay?.blocks?.record;
  if (kind === "record-csv") {
    if (legacyRecordBlock?.extends === ELEMENT_TYPE_RECORD_CSV) return legacyRecordBlock;
    return {
      fields: {},
      tabs: {},
      extends: resolveAwnDataSchemaTargetExtends("record-csv", frameTypeId)
    };
  }

  if (kind === "record") {
    if (legacyRecordBlock && legacyRecordBlock.extends !== ELEMENT_TYPE_RECORD_CSV) {
      return legacyRecordBlock;
    }
    if (overlay?.fields && Object.keys(overlay.fields).length) {
      const overlayExtends = resolveElementExtendsRef(overlay.extends || "");
      if (overlayExtends !== ELEMENT_TYPE_RECORD_CSV) {
        return {
          fields: overlay.fields,
          tabs: overlay.tabs || {},
          extends: overlayExtends || resolveAwnDataSchemaTargetExtends("record", frameTypeId)
        };
      }
    }
  }

  return {
    fields: {},
    tabs: {},
    extends: resolveAwnDataSchemaTargetExtends(kind, frameTypeId)
  };
}

function resolveStoreElementMergedFields(storeRel, elementType, agentRoot = "", projectRoot = process.cwd()) {
  const typeId = String(elementType || DEFAULT_RECORD_ELEMENT_TYPE).trim();
  const baseFields = resolveElementManifestFields(typeId, agentRoot, projectRoot);
  const normalizedStoreRel = normalizeStoreSlug(storeRel);
  if (!normalizedStoreRel || !agentRoot) return baseFields;

  try {
    const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
    const storeAbs = getStoreAbsolutePath(dataRoot, normalizedStoreRel);
    if (!storeAbs || !fs.existsSync(storeAbs)) return baseFields;
    const overlay = readStoreSchemeModOverlay(storeAbs);
    if (!overlay?.exists) return baseFields;
    const kind = resolveStoreElementSchemaKind(typeId);
    const block = resolveStoreSchemeModBlockForKind(overlay, kind, storeAbs);
    const localFields = remapLegacyCustomSchemeModFields(block?.fields || {}, Object.keys(baseFields));
    return { ...baseFields, ...localFields };
  } catch {
    return baseFields;
  }
}

/** @deprecated use resolveStoreElementMergedFields — kept for callers expecting custom-only fields */
function resolveStoreElementCreationFields(storeRel, elementType, agentRoot = "", projectRoot = process.cwd()) {
  const normalizedStoreRel = normalizeStoreSlug(storeRel);
  if (!normalizedStoreRel || !agentRoot) return {};
  try {
    const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
    const storeAbs = getStoreAbsolutePath(dataRoot, normalizedStoreRel);
    if (!storeAbs || !fs.existsSync(storeAbs)) return {};
    const overlay = readStoreSchemeModOverlay(storeAbs);
    if (!overlay?.exists) return {};
    const typeId = String(elementType || DEFAULT_RECORD_ELEMENT_TYPE).trim();
    const kind = resolveStoreElementSchemaKind(typeId);
    const block = resolveStoreSchemeModBlockForKind(overlay, kind, storeAbs);
    const extendsRef = resolveElementExtendsRef(block.extends || typeId);
    return extractCustomSchemeModFields(block.fields || {}, extendsRef, agentRoot, projectRoot);
  } catch {
    return {};
  }
}

function resolveStoreElementSchemaBlock(storeRel, elementType, agentRoot = "", projectRoot = process.cwd()) {
  const fields = resolveStoreElementMergedFields(storeRel, elementType, agentRoot, projectRoot);
  return {
    fields,
    tabs: {}
  };
}

function insertStoreElementFrontmatterLine(lines, key, value, afterKey = "") {
  if (!value) return;
  const line = `${key}: ${yamlQuote(value)}`;
  if (lines.some((item) => item.startsWith(`${key}:`))) return;
  if (afterKey) {
    const anchorIdx = lines.findIndex((item) => item.startsWith(`${afterKey}:`));
    if (anchorIdx >= 0) {
      lines.splice(anchorIdx + 1, 0, line);
      return;
    }
  }
  lines.push(line);
}

function buildRecordMarkdown({
  id,
  name,
  title,
  parent,
  storeRel = "",
  extra = {},
  elementType = DEFAULT_RECORD_ELEMENT_TYPE,
  body = "",
  agentRoot = "",
  projectRoot = process.cwd()
} = {}) {
  const displayName = String(name || title || "").trim();
  const store = String(storeRel || "").trim().replace(/^\/+|\/+$/g, "");
  let typeId = String(elementType || "").trim();
  if (!typeId && store && agentRoot) {
    try {
      const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
      const storeAbs = getStoreAbsolutePath(dataRoot, store);
      if (storeAbs && fs.existsSync(resolveStoreSchemaPath(storeAbs))) {
        typeId = resolveStoreRecordElementType(storeAbs, agentRoot, projectRoot, dataRoot);
      }
    } catch {
      // ignore and fall back to default element type
    }
  }
  typeId = typeId || DEFAULT_RECORD_ELEMENT_TYPE;
  const mergedFields = resolveStoreElementMergedFields(store, typeId, agentRoot, projectRoot);
  const fmLines = buildContainerManifestFrontmatter(typeId, displayName, mergedFields)
    .split("\n")
    .filter(Boolean);

  insertStoreElementFrontmatterLine(fmLines, "awn-store", store, "awn-type:");
  insertStoreElementFrontmatterLine(fmLines, "awn-parent", parent, "awn-store:");

  const written = new Set(
    fmLines.map((line) => String(line.split(":")[0] || "").trim()).filter(Boolean)
  );
  for (const [key, value] of Object.entries(extra || {})) {
    if (value === undefined || value === null) continue;
    const fieldKey = String(key || "").trim();
    if (!fieldKey || written.has(fieldKey)) continue;
    fmLines.push(`${fieldKey}: ${value}`);
    written.add(fieldKey);
  }

  const bodyText = String(body || "").trim();
  const bodyBlock = bodyText || (displayName ? `${displayName}.` : "");
  return `---\n${fmLines.join("\n")}\n---\n\n${bodyBlock ? `${bodyBlock}\n` : ""}`;
}

function buildSectionManifestMarkdown({
  id,
  name,
  title,
  parent,
  storeRel = "",
  agentRoot = "",
  projectRoot = process.cwd()
}) {
  return buildRecordMarkdown({
    id,
    name: name || title,
    parent,
    storeRel,
    elementType: ELEMENT_TYPE_CATEGORY,
    body: "> Описание раздела.",
    agentRoot,
    projectRoot
  });
}

function createAwnDataStore(agentRoot, projectRoot, options = {}) {
  const kind = normalizeStoreKind(options.kind || "collection");
  if (!STORE_KINDS.has(kind)) throw new Error("kind must be collection, single, or group");

  const slug = normalizeStoreSlug(options.slug || slugifyStoreName(options.name));
  if (!slug) throw new Error("Invalid store slug (use kebab-case, optional subfolder: awn-taxonomies/tags)");

  const dataRoot = ensureAwnDataBase(agentRoot, projectRoot);
  if (storeSchemaExists(dataRoot, slug)) {
    throw new Error(`Store already exists: ${slug}`);
  }

  const storeAbs = getStoreAbsolutePath(dataRoot, slug);
  fs.mkdirSync(storeAbs, { recursive: true });
  const dataAbs = ensureStoreStorageLayout(storeAbs);

  const name = String(options.name || slug).trim();
  const description = String(options.description || "").trim();
  const isTaxonomy = slug.startsWith("awn-taxonomies/") || slug.startsWith("taxonomies/");
  const withSample =
    kind === "collection" && !isTaxonomy ? options.withSampleRecord !== false : false;
  const indexExcludeFlags =
    options.indexExcludeFlags ||
    (options.indexExcludeRecord || options.indexExcludeSubtree
      ? {
          record: Boolean(options.indexExcludeRecord),
          subtree: Boolean(options.indexExcludeSubtree)
        }
      : null) ||
    (options.indexExclude ? { record: true, subtree: true } : null);
  const manifestOptions = {
    agentRoot,
    projectRoot,
    ...(indexExcludeFlags ? { indexExcludeFlags } : {})
  };

  if (kind === "collection") {
    const typeDefaults = loadContainerTypeDefaults("collection", agentRoot, projectRoot);
    const collectionType = normalizeCollectionType(
      options.collectionType ||
        collectionTypeFromRecordProps({
          collectionKind: options.collectionKind || typeDefaults.collectionKind,
          storage: options.recordStorage || typeDefaults.recordStorage
        }),
      "md"
    );
    const mappedFromType = recordPropsFromCollectionType(collectionType);
    const collectionKind = isTaxonomy
      ? "records"
      : normalizeCollectionKind(
          options.collectionKind || mappedFromType.collectionKind || typeDefaults.collectionKind,
          "records"
        );
    const recordStorage = isTaxonomy
      ? "csv"
      : normalizeRecordStorage(
          options.recordStorage || mappedFromType.recordStorage || typeDefaults.recordStorage,
          "md"
        );
    const recordHierarchy =
      recordStorage === "csv"
        ? false
        : options.recordHierarchy ?? typeDefaults.recordHierarchy ?? false;
    const recordFileTypes =
      collectionKind === "files"
        ? String(options.recordFileTypes || typeDefaults.recordFileTypes || "").trim()
        : "";
    const bundle = isTaxonomy
      ? buildTaxonomyCollectionSchemaContent({
          slug,
          name,
          description,
          taxonomyKey: options.taxonomyKey,
          taxonomyCardinality: options.taxonomyCardinality,
          hierarchy: options.recordHierarchy
        })
      : buildCollectionSchemaContent({
          slug,
          name,
          description,
          recordStorage,
          collectionKind,
          collectionType,
          recordHierarchy,
          recordFileTypes,
          agentRoot,
          projectRoot
        });
    writeStoreManifest(storeAbs, bundle.schema, bundle.manifestBody, {
      ...manifestOptions,
      typeFields: bundle.schema.containerFields || {}
    });
    const schemeModExtends = bundle.schemeModExtends || ELEMENT_TYPE_RECORD;
    const hasCustomSchemeFields =
      bundle.schemeModFields && Object.keys(bundle.schemeModFields).length > 0;
    if (hasCustomSchemeFields || schemeModExtends !== ELEMENT_TYPE_RECORD) {
      writeStoreSchemeMod(storeAbs, {
        extends: schemeModExtends,
        fields: bundle.schemeModFields || {},
        ...(hasCustomSchemeFields ? { elementSchemaTabs: bundle.schemeModTabs || {} } : {})
      });
    } else if (!isTaxonomy) {
      writeInitialStoreAwnSchema(storeAbs, "collection", bundle.schema.typeId);
    }
    fs.writeFileSync(path.join(storeAbs, "sort.json"), "[]\n", "utf-8");
    if (collectionKind === "files") {
      // files-only collection: no sample record
    } else if (recordStorage === "csv") {
      const columns = getCsvColumnsFromSchema(loadMergedStoreSchema(storeAbs, dataRoot));
      const csvFile = getCsvFileName(loadMergedStoreSchema(storeAbs, dataRoot));
      fs.writeFileSync(path.join(storeAbs, csvFile), serializeCsv(columns, []), "utf-8");
    } else if (recordStorage === "csv-files" && withSample) {
      const columns = getCsvColumnsFromSchema(loadMergedStoreSchema(storeAbs, dataRoot));
      fs.writeFileSync(path.join(dataAbs, "1.csv"), serializeCsv(columns, []), "utf-8");
      fs.writeFileSync(path.join(storeAbs, "sort.json"), `${JSON.stringify(["1"], null, 2)}\n`, "utf-8");
    } else if (withSample) {
      const recordContent = buildRecordMarkdown({
        id: "1",
        name: "Первая запись",
        storeRel: slug,
        elementType: elementTypeFromCollectionType(collectionType),
        agentRoot,
        projectRoot
      });
      fs.writeFileSync(path.join(dataAbs, "1.md"), recordContent, "utf-8");
      fs.writeFileSync(path.join(storeAbs, "sort.json"), `${JSON.stringify(["1"], null, 2)}\n`, "utf-8");
    }
  } else if (kind === "group") {
    const bundle = buildGroupSchemaContent({ slug, name, description, agentRoot, projectRoot });
    writeStoreManifest(storeAbs, bundle.schema, bundle.manifestBody, {
      ...manifestOptions,
      typeFields: bundle.schema.fields || {}
    });
    writeInitialStoreAwnSchema(storeAbs, "group", bundle.schema.typeId);
    fs.writeFileSync(path.join(storeAbs, "sort.json"), "[]\n", "utf-8");
  } else {
    const bundle = buildSingletonSchemaContent({ slug, name, description, agentRoot, projectRoot });
    writeStoreManifest(storeAbs, bundle.schema, bundle.manifestBody, {
      ...manifestOptions,
      typeFields: bundle.schema.containerFields || {}
    });
    if (bundle.schemeModFields && Object.keys(bundle.schemeModFields).length) {
      writeStoreSchemeMod(storeAbs, {
        extends: bundle.schemeModExtends || ELEMENT_TYPE_RECORD,
        fields: bundle.schemeModFields,
        elementSchemaTabs: bundle.schemeModTabs || {}
      });
    } else {
      writeInitialStoreAwnSchema(storeAbs, "single", bundle.schema.typeId);
    }
    const recordContent = buildRecordMarkdown({
      id: slug.replace(/\//g, "."),
      name,
      storeRel: slug,
      extra: { note: "" },
      agentRoot,
      projectRoot
    });
    fs.writeFileSync(path.join(dataAbs, SINGLETON_RECORD), recordContent, "utf-8");
  }

  if (slug.includes("/")) {
    const [groupRel, childSlug] = slug.split("/", 2);
    appendGroupSortEntry(dataRoot, groupRel, childSlug);
  } else {
    appendRootSortEntry(dataRoot, slug);
  }

  const payload = getAwnDataPayload(agentRoot, projectRoot, slug);
  return payload.store || { id: slug, relPath: slug, kind };
}

const TAXONOMIES_GROUP_REL = "awn-taxonomies";
const LEGACY_TAXONOMIES_GROUP_REL = "taxonomies";
const TAXONOMIES_GROUP_NAME = "Таксономии (справочники)";
const TAXONOMIES_GROUP_DESCRIPTION =
  "Встроенная группа CSV-справочников workspace для поля awn-taxonomy.";
const DEFAULT_TAXONOMY_VOCABULARIES = [
  {
    slug: "tags",
    name: "Теги",
    description: "Список тегов workspace — как #tag в Obsidian",
    taxonomyKey: "tags",
    taxonomyCardinality: "many"
  },
  {
    slug: "categories",
    name: "Категории",
    description: "Справочник категорий. Ключ в awn-taxonomy.category",
    taxonomyKey: "category",
    taxonomyCardinality: "one"
  },
  {
    slug: "colors",
    name: "Палитра",
    description: "Справочник цветов-меток. Ключ в awn-taxonomy.color",
    taxonomyKey: "color",
    taxonomyCardinality: "many"
  }
];

function pinTaxonomiesGroupInRootSort(dataRoot) {
  const sortPath = path.join(dataRoot, "sort.json");
  let order = [];
  if (fs.existsSync(sortPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
      if (Array.isArray(parsed)) order = parsed.map(String);
    } catch {
      order = [];
    }
  }
  order = order.filter((item) => item !== TAXONOMIES_GROUP_REL && item !== LEGACY_TAXONOMIES_GROUP_REL);
  order.unshift(TAXONOMIES_GROUP_REL);
  fs.writeFileSync(sortPath, `${JSON.stringify(order, null, 2)}\n`, "utf-8");
}

function ensureTaxonomiesGroupSort(dataRoot) {
  const groupAbs = getStoreAbsolutePath(dataRoot, TAXONOMIES_GROUP_REL);
  if (!groupAbs || !fs.existsSync(path.join(groupAbs, COLLECTION_MANIFEST))) return;
  const preferred = DEFAULT_TAXONOMY_VOCABULARIES.map((item) => item.slug);
  const sortPath = path.join(groupAbs, "sort.json");
  let order = [];
  if (fs.existsSync(sortPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
      if (Array.isArray(parsed)) order = parsed.map(String);
    } catch {
      order = [];
    }
  }
  const finalOrder = [...preferred, ...order.filter((slug) => !preferred.includes(slug))];
  fs.writeFileSync(sortPath, `${JSON.stringify(finalOrder, null, 2)}\n`, "utf-8");
}

function ensureTaxonomiesGroupScaffold(agentRoot, projectRoot = process.cwd(), options = {}) {
  const dataRoot = ensureAwnDataBase(agentRoot, projectRoot);
  const withDefaults = options.withDefaults === true;
  const result = {
    groupRel: TAXONOMIES_GROUP_REL,
    groupCreated: false,
    storesCreated: [],
    storesSkipped: [],
    alreadyExists: false
  };

  if (!storeSchemaExists(dataRoot, TAXONOMIES_GROUP_REL)) {
    const manifestBody = `# ${TAXONOMIES_GROUP_NAME}

${TAXONOMIES_GROUP_DESCRIPTION}

Каждый поднакопитель — CSV-коллекция \`main.csv\` в \`awn-databases/awn-taxonomies/\`.

Значения подключаются к записям через единое поле \`awn-taxonomy\`.
`;
    createAwnDataStore(agentRoot, projectRoot, {
      kind: "group",
      slug: TAXONOMIES_GROUP_REL,
      name: TAXONOMIES_GROUP_NAME,
      description: TAXONOMIES_GROUP_DESCRIPTION
    });
    const groupAbs = getStoreAbsolutePath(dataRoot, TAXONOMIES_GROUP_REL);
    if (groupAbs) {
      const bundle = buildGroupSchemaContent({
        slug: TAXONOMIES_GROUP_REL,
        name: TAXONOMIES_GROUP_NAME,
        description: TAXONOMIES_GROUP_DESCRIPTION,
        agentRoot,
        projectRoot
      });
      writeStoreManifest(groupAbs, bundle.schema, manifestBody, {
        agentRoot,
        projectRoot
      });
    }
    result.groupCreated = true;
  } else {
    result.alreadyExists = true;
  }

  if (withDefaults) {
    for (const vocabulary of DEFAULT_TAXONOMY_VOCABULARIES) {
      const storeRel = `${TAXONOMIES_GROUP_REL}/${vocabulary.slug}`;
      if (storeSchemaExists(dataRoot, storeRel)) {
        result.storesSkipped.push(vocabulary.slug);
        continue;
      }
      createAwnDataStore(agentRoot, projectRoot, {
        kind: "collection",
        slug: storeRel,
        name: vocabulary.name,
        description: vocabulary.description,
        taxonomyKey: vocabulary.taxonomyKey,
        taxonomyCardinality: vocabulary.taxonomyCardinality,
        withSampleRecord: false
      });
      result.storesCreated.push(vocabulary.slug);
    }
  }

  pinTaxonomiesGroupInRootSort(dataRoot);
  ensureTaxonomiesGroupSort(dataRoot);
  result.store = findAwnDataStore(loadAwnDataStores(agentRoot, projectRoot).stores, TAXONOMIES_GROUP_REL);
  return result;
}

function resolveNextNumericRecordId(records) {
  let max = 0;
  for (const record of records) {
    const n = Number(record.id);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}

function createAwnDataRecord(agentRoot, projectRoot, options = {}) {
  const storeRel = normalizeStoreSlug(options.store || options.storeRel || "");
  if (!storeRel) throw new Error("store is required");

  const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
  const storeAbs = getStoreAbsolutePath(dataRoot, storeRel);
  if (!storeAbs || !fs.existsSync(resolveStoreSchemaPath(storeAbs))) {
    throw new Error("Store not found");
  }

  const schema = loadMergedStoreSchema(storeAbs, dataRoot);
  const kind = normalizeStoreKind(schema?.kind || "collection");
  if (kind === "single") throw new Error("Cannot add records to single store (edit main.md)");

  const payload = getAwnDataPayload(agentRoot, projectRoot, storeRel);
  const store = payload.store;
  if (!store) throw new Error("Store not found");

  const recordStorage = getRecordStorage(schema);
  const fileExtension = normalizeStorageRecordExtension(options.fileExtension || options.extension || "");
  const usePlainTextRecord = Boolean(fileExtension && isPlainTextStorageRecordExtension(fileExtension));
  if (fileExtension && !usePlainTextRecord) {
    throw new Error(`Unsupported fileExtension for infoblock record: ${fileExtension}`);
  }
  const idMode = String(schema?.record?.["id-mode"] || schema?.record?.idMode || "numeric").trim();
  let id = String(options.id || options.slug || "").trim();
  if (!id) {
    if (options.isSection) {
      id = slugifyStoreName(options.name || options.title || "section");
    } else if (idMode === "numeric") {
      id = resolveNextNumericRecordId(store.records || []);
    } else {
      id = slugifyStoreName(options.name || options.title || "record");
    }
  } else if (options.isSection) {
    const normalizedSlug = normalizeStoreSlug(id);
    if (!normalizedSlug) throw new Error("Invalid section slug");
    id = normalizedSlug;
  } else if (idMode === "numeric") {
    if (!/^\d+$/.test(id)) throw new Error("Invalid record id for numeric id-mode");
  } else {
    const normalizedSlug = normalizeStoreSlug(id);
    if (!normalizedSlug) throw new Error("Invalid record slug");
    id = normalizedSlug;
  }

  const parent = String(options.parent || "").trim();
  const name = String(options.name || options.title || id).trim();
  const title = String(options.title || name || id).trim();
  const hierarchy = schema?.record?.hierarchy !== false;

  if (recordStorage === "csv") {
    if (parent) throw new Error("CSV store does not support hierarchy");
    const fields = schema?.fields || {};
    const row = { "awn-code": id, "awn-name": name, label: name };
    for (const key of Object.keys(fields)) {
      if (options[key] !== undefined) row[key] = options[key];
    }
    appendCsvRecord(storeAbs, schema, row);
    return getAwnDataPayload(agentRoot, projectRoot, storeRel).store;
  }

  const recordRoot = resolveStoreRecordRootAbs(storeAbs);
  const recordFileName =
    recordStorage === "csv-files"
      ? `${id}.csv`
      : usePlainTextRecord
        ? recordFileNameForId(id, fileExtension)
        : `${id}.md`;
  let relFile = recordFileName;
  let absFile = path.join(recordRoot, relFile);
  if (parent && hierarchy) {
    relFile = path.posix.join(parent, recordFileName);
    absFile = path.join(recordRoot, parent, recordFileName);
    fs.mkdirSync(path.dirname(absFile), { recursive: true });
  }

  if (options.isSection) {
    const sectionId = id;
    const sectionDir = parent
      ? path.join(recordRoot, parent, sectionId)
      : path.join(recordRoot, sectionId);
    const manifestPath = path.join(sectionDir, COLLECTION_MANIFEST);
    if (fs.existsSync(sectionDir)) throw new Error(`Раздел уже существует: ${sectionId}`);
    fs.mkdirSync(sectionDir, { recursive: true });
    const content = buildSectionManifestMarkdown({
      id: sectionId,
      name,
      title,
      parent: parent || null,
      storeRel,
      agentRoot,
      projectRoot
    });
    fs.writeFileSync(manifestPath, content, "utf-8");
  } else if (recordStorage === "csv-files") {
    if (fs.existsSync(absFile)) throw new Error(`Record already exists: ${id}`);
    const columns = getCsvColumnsFromSchema(schema);
    fs.writeFileSync(absFile, serializeCsv(columns, []), "utf-8");
  } else if (usePlainTextRecord) {
    if (fs.existsSync(absFile)) throw new Error(`Record already exists: ${id}`);
    const textBody = String(options.body ?? "").trim();
    const content = textBody || buildPlainTextPlaceholderContent(fileExtension);
    fs.writeFileSync(absFile, content, "utf-8");
  } else {
    if (fs.existsSync(absFile)) throw new Error(`Record already exists: ${id}`);
    const content = buildRecordMarkdown({
      id,
      name,
      title,
      parent: parent || null,
      storeRel,
      elementType: resolveStoreRecordElementType(storeAbs, agentRoot, projectRoot, dataRoot),
      agentRoot,
      projectRoot,
      body: String(options.body ?? "").trim()
    });
    fs.writeFileSync(absFile, content, "utf-8");
  }

  const sortPath = path.join(storeAbs, "sort.json");
  if (fs.existsSync(sortPath) && !parent) {
    try {
      const order = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
      if (Array.isArray(order) && !order.includes(id)) {
        order.push(id);
        fs.writeFileSync(sortPath, `${JSON.stringify(order, null, 2)}\n`, "utf-8");
      }
    } catch {
      // ignore sort errors
    }
  }

  return getAwnDataPayload(agentRoot, projectRoot, storeRel).store;
}

function ensureAwnDataMainCsvFile(agentRoot, projectRoot, storeRel) {
  const { storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
  const schema = loadMergedStoreSchema(storeAbs, dataRoot);
  if (getRecordStorage(schema) !== "csv") {
    throw new Error("Store is not a CSV table");
  }
  const csvPath = resolveCsvAbsPath(storeAbs, schema);
  if (!fs.existsSync(csvPath)) {
    const columns = getCsvColumnsFromSchema(schema);
    fs.mkdirSync(path.dirname(csvPath), { recursive: true });
    fs.writeFileSync(csvPath, serializeCsv(columns, []), "utf-8");
  }
  return getAwnDataPayload(agentRoot, projectRoot, rel).store;
}

function resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel) {
  const filter = String(storeRel || "").trim();
  if (!filter) throw new Error("Missing store path");

  const payload = getAwnDataPayload(agentRoot, projectRoot);
  const store = findAwnDataStore(payload.stores, filter);
  if (!store) throw new Error(`Store not found: ${filter}`);

  const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
  const storeAbs = getStoreAbsolutePath(dataRoot, store.relPath);
  if (!storeAbs || !fs.existsSync(storeAbs)) {
    throw new Error(`Store folder not found: ${store.relPath}`);
  }

  return {
    store,
    dataRoot,
    storeAbs,
    storeRel: store.relPath
  };
}

function isValidAwnPropertyKey(key) {
  return /^[A-Za-z0-9_.-]+$/.test(String(key || "").trim());
}

function escapeYamlKeyRegExp(key) {
  return String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatYamlScalarValue(value) {
  const text = String(value ?? "");
  if (/^[a-zA-Z0-9_\-@.]+$/.test(text)) return text;
  return JSON.stringify(text);
}

function getYamlScalarFromText(frontmatter, key) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) return { value: "", exists: false };
  const text = String(frontmatter || "");
  const match = text.match(new RegExp(`^${escapeYamlKeyRegExp(normalizedKey)}:\\s*(.+)$`, "im"));
  if (!match) return { value: "", exists: false };
  const raw = match[1].trim();
  const unquoted =
    (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))
      ? raw.slice(1, -1)
      : raw;
  return { value: unquoted, exists: true };
}

function upsertYamlScalarInText(frontmatter, key, value) {
  const normalizedKey = String(key || "").trim();
  const line = `${normalizedKey}: ${formatYamlScalarValue(value)}`;
  const pattern = new RegExp(`^${escapeYamlKeyRegExp(normalizedKey)}:.*$`, "m");
  const trimmed = String(frontmatter || "").trim();
  if (pattern.test(trimmed)) {
    return trimmed.replace(pattern, line);
  }
  return trimmed ? `${trimmed}\n${line}` : line;
}

function splitMarkdownFrontmatterText(content) {
  const raw = String(content || "");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n([\s\S]*))?$/);
  if (!match) return { frontmatter: "", body: raw, hasFrontmatter: false };
  return { frontmatter: match[1] || "", body: match[3] || "", hasFrontmatter: true };
}

function joinMarkdownFrontmatterText(frontmatter, body) {
  const fm = String(frontmatter || "").trim();
  const text = String(body ?? "");
  if (!fm) return text;
  return `---\n${fm}\n---\n${text}`;
}

function mergeFrontmatterBlocks(baseFrontmatter, overlayFrontmatter) {
  const overlayText = String(overlayFrontmatter || "").trim();
  if (!overlayText) return String(baseFrontmatter || "").trim();
  const overlayKeys = new Set();
  const overlayLines = overlayText.split("\n").filter((line) => line.trim());
  for (const line of overlayLines) {
    const key = line.split(":")[0]?.trim().toLowerCase();
    if (key) overlayKeys.add(key);
  }
  const baseLines = String(baseFrontmatter || "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      const key = trimmed.split(":")[0]?.trim().toLowerCase();
      return key && !overlayKeys.has(key);
    });
  return [...baseLines, ...overlayLines].join("\n");
}

function bumpRecordUpdatedFrontmatter(frontmatter) {
  const text = String(frontmatter || "");
  if (/\bawn-updated\s*:/i.test(text)) {
    return upsertYamlScalarInText(text, "awn-updated", nowIsoMinute());
  }
  return text;
}

function readStoreManifestRaw(storeAbs) {
  const manifestPath = resolveStoreSchemaPath(storeAbs);
  if (!manifestPath || !fs.existsSync(manifestPath)) {
    throw new Error("Store manifest not found");
  }
  return { manifestPath, raw: fs.readFileSync(manifestPath, "utf-8") };
}

function resolveStoreRecordAbsolute(storeEntry, storeAbs, recordRef) {
  const kind = normalizeStoreKind(storeEntry?.kind || "");
  if (kind === "single") {
    return resolveStoreSingletonRecordAbs(storeAbs);
  }
  const ref = String(recordRef || "").trim();
  if (!ref) throw new Error("record is required");

  const storeRel = String(storeEntry?.relPath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const refBase = path.basename(ref, path.extname(ref));
  const hit = findStoreRecordHit(storeEntry, ref);
  if (hit) {
    if (hit.isSection && hit.missingManifest) {
      const innerPath = resolveSectionInnerPathFromHit(hit);
      const sectionDir = resolveSectionDirectoryAbs(storeAbs, innerPath);
      if (!sectionDir || !fs.existsSync(sectionDir)) {
        throw new Error(`Section not found: ${ref}`);
      }
      return path.join(sectionDir, COLLECTION_MANIFEST);
    }
    const relPath = String(hit.relPath || "").replace(/\\/g, "/");
    if (storeRel && relPath.startsWith(`${storeRel}/`)) {
      const withinStore = relPath.slice(storeRel.length + 1);
      return resolveStoreRecordAbs(storeAbs, withinStore);
    }
    const withinStore = relPath.replace(/^[^/]+\//, "").replace(/\\/g, "/");
    const rel = withinStore || hit.fileName || `${ref}.md`;
    return resolveStoreRecordAbs(storeAbs, rel);
  }

  if (ref.includes(".")) {
    const absWithExt = resolveStoreRecordAbs(storeAbs, ref);
    if (fs.existsSync(absWithExt)) return absWithExt;
  }
  const direct = ref.endsWith(".md") ? ref : `${ref}.md`;
  const abs = resolveStoreRecordAbs(storeAbs, direct);
  if (fs.existsSync(abs)) return abs;
  throw new Error(`Record not found: ${ref}`);
}

function isMarkdownRecordAbs(recordAbs) {
  return isMarkdownRecordExtension(path.extname(recordAbs));
}

function assertMarkdownRecordAbs(recordAbs) {
  if (!isMarkdownRecordAbs(recordAbs)) {
    throw new Error("Record properties API supports .md records only; use record-body for plain-text files");
  }
}

function readAwnDataStoreProperty(agentRoot, projectRoot, storeRel, key) {
  const propertyKey = String(key || "").trim();
  if (!isValidAwnPropertyKey(propertyKey)) throw new Error("Invalid property key");
  const { storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  const { raw } = readStoreManifestRaw(storeAbs);
  const { frontmatter } = splitMarkdownFrontmatterText(raw);
  const { value, exists } = getYamlScalarFromText(frontmatter, propertyKey);
  return { store: rel, key: propertyKey, value, exists };
}

function readAwnDataStoreProperties(agentRoot, projectRoot, storeRel) {
  const { storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  const { raw } = readStoreManifestRaw(storeAbs);
  const { frontmatter } = splitMarkdownFrontmatterText(raw);
  return {
    store: rel,
    content: String(frontmatter || "").trim(),
    exists: Boolean(String(frontmatter || "").trim())
  };
}

function writeAwnDataStoreProperties(agentRoot, projectRoot, storeRel, content) {
  const patch = typeof content === "string" ? content : null;
  if (patch === null) throw new Error("Missing content");
  const { storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  const { manifestPath, raw } = readStoreManifestRaw(storeAbs);
  const parts = splitMarkdownFrontmatterText(raw);
  const nextFrontmatter = mergeFrontmatterBlocks(parts.frontmatter, patch);
  const nextRaw = joinMarkdownFrontmatterText(nextFrontmatter, parts.body);
  fs.writeFileSync(manifestPath, nextRaw, "utf-8");
  return { store: rel, content: nextFrontmatter };
}

function writeAwnDataStoreProperty(agentRoot, projectRoot, storeRel, key, value) {
  const propertyKey = String(key || "").trim();
  if (!isValidAwnPropertyKey(propertyKey)) throw new Error("Invalid property key");
  if (value === undefined || value === null) throw new Error("Missing value");
  const { storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  const { manifestPath, raw } = readStoreManifestRaw(storeAbs);
  const parts = splitMarkdownFrontmatterText(raw);
  const nextFrontmatter = upsertYamlScalarInText(parts.frontmatter, propertyKey, value);
  const nextRaw = joinMarkdownFrontmatterText(nextFrontmatter, parts.body);
  fs.writeFileSync(manifestPath, nextRaw, "utf-8");
  return { store: rel, key: propertyKey, value: String(value), content: nextFrontmatter };
}

function readAwnDataRecordProperty(agentRoot, projectRoot, storeRel, recordRef, key) {
  const propertyKey = String(key || "").trim();
  if (!isValidAwnPropertyKey(propertyKey)) throw new Error("Invalid property key");
  const { store, storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  if (store.recordStorage === "csv") {
    throw new Error("CSV store records do not support property API yet; use iblock_get");
  }
  const recordAbs = resolveStoreRecordAbsolute(store, storeAbs, recordRef);
  if (!fs.existsSync(recordAbs)) throw new Error("Record file not found");
  assertMarkdownRecordAbs(recordAbs);
  const raw = fs.readFileSync(recordAbs, "utf-8");
  const { frontmatter } = splitMarkdownFrontmatterText(raw);
  const { value, exists } = getYamlScalarFromText(frontmatter, propertyKey);
  const record =
    String(recordRef || "").trim() || path.basename(recordAbs, path.extname(recordAbs));
  return { store: rel, record, key: propertyKey, value, exists, file: path.basename(recordAbs) };
}

function readAwnDataRecordProperties(agentRoot, projectRoot, storeRel, recordRef) {
  const { store, storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  if (store.recordStorage === "csv") {
    throw new Error("CSV store records do not support property API yet; use iblock_get");
  }
  const recordAbs = resolveStoreRecordAbsolute(store, storeAbs, recordRef);
  if (!fs.existsSync(recordAbs)) throw new Error("Record file not found");
  assertMarkdownRecordAbs(recordAbs);
  const raw = fs.readFileSync(recordAbs, "utf-8");
  const { frontmatter } = splitMarkdownFrontmatterText(raw);
  const record =
    String(recordRef || "").trim() || path.basename(recordAbs, path.extname(recordAbs));
  return {
    store: rel,
    record,
    file: path.basename(recordAbs),
    content: String(frontmatter || "").trim(),
    exists: Boolean(String(frontmatter || "").trim())
  };
}

function writeAwnDataRecordProperties(agentRoot, projectRoot, storeRel, recordRef, content) {
  const patch = typeof content === "string" ? content : null;
  if (patch === null) throw new Error("Missing content");
  const { store, storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  if (store.recordStorage === "csv") {
    throw new Error("CSV store records do not support property API yet; use iblock_get");
  }
  const recordAbs = resolveStoreRecordAbsolute(store, storeAbs, recordRef);
  if (!fs.existsSync(recordAbs)) throw new Error("Record file not found");
  assertMarkdownRecordAbs(recordAbs);
  const raw = fs.readFileSync(recordAbs, "utf-8");
  const parts = splitMarkdownFrontmatterText(raw);
  let nextFrontmatter = mergeFrontmatterBlocks(parts.frontmatter, patch);
  nextFrontmatter = bumpRecordUpdatedFrontmatter(nextFrontmatter);
  const nextRaw = joinMarkdownFrontmatterText(nextFrontmatter, parts.body);
  fs.writeFileSync(recordAbs, nextRaw, "utf-8");
  const record =
    String(recordRef || "").trim() || path.basename(recordAbs, path.extname(recordAbs));
  return { store: rel, record, file: path.basename(recordAbs), content: nextFrontmatter };
}

function writeAwnDataRecordProperty(agentRoot, projectRoot, storeRel, recordRef, key, value) {
  const propertyKey = String(key || "").trim();
  if (!isValidAwnPropertyKey(propertyKey)) throw new Error("Invalid property key");
  if (value === undefined || value === null) throw new Error("Missing value");
  const { store, storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  if (store.recordStorage === "csv") {
    throw new Error("CSV store records do not support property API yet; use iblock_get");
  }
  const recordAbs = resolveStoreRecordAbsolute(store, storeAbs, recordRef);
  if (!fs.existsSync(recordAbs)) throw new Error("Record file not found");
  assertMarkdownRecordAbs(recordAbs);
  const raw = fs.readFileSync(recordAbs, "utf-8");
  const parts = splitMarkdownFrontmatterText(raw);
  let nextFrontmatter = upsertYamlScalarInText(parts.frontmatter, propertyKey, value);
  nextFrontmatter = bumpRecordUpdatedFrontmatter(nextFrontmatter);
  const nextRaw = joinMarkdownFrontmatterText(nextFrontmatter, parts.body);
  fs.writeFileSync(recordAbs, nextRaw, "utf-8");
  const record =
    String(recordRef || "").trim() || path.basename(recordAbs, path.extname(recordAbs));
  return { store: rel, record, key: propertyKey, value: String(value), content: nextFrontmatter, file: path.basename(recordAbs) };
}

function extractRecordSchemaFromSchemeModContent(content) {
  const parsed = parseTypeYaml(String(content || ""));
  const awnSchema = parsed?.awn_schema;
  if (!awnSchema || typeof awnSchema !== "object") {
    return { fields: {}, tabs: {} };
  }
  const block = awnSchema.record || awnSchema.store || awnSchema.element || null;
  const rawFields =
    (block && typeof block === "object" ? block.fields : null) ||
    awnSchema.record?.fields ||
    awnSchema.fields ||
    {};
  const tabs =
    (block && typeof block === "object" && block.tabs && typeof block.tabs === "object" ? block.tabs : null) ||
    {};
  return {
    fields: normalizeSchemeModFieldsMap(rawFields),
    tabs: { ...tabs }
  };
}

function readAwnDataStoreSchemaPayload(agentRoot, projectRoot, storeRel) {
  const { store, dataRoot, storeAbs, storeRel: rel } = resolveAwnDataStoreContext(
    agentRoot,
    projectRoot,
    storeRel
  );
  const agentRootResolved = findAgentRootFromStoreAbs(storeAbs);
  const schemeModRelPath = `${rel}/${SCHEMA_MOD_FILE}`.replace(/\\/g, "/");
  const schemePath = path.join(storeAbs, SCHEMA_MOD_FILE);
  const overlay = readStoreSchemeModOverlay(storeAbs);
  const merged = loadMergedStoreSchema(storeAbs, dataRoot);
  let content = "";
  if (fs.existsSync(schemePath)) {
    content = fs.readFileSync(schemePath, "utf-8");
  }

  const frameTypeId = resolveStoreFrameTypeId(storeAbs, store.kind);
  const awnSchema = {};
  for (const kind of AWN_DATA_SCHEMA_TARGETS) {
    const block = resolveStoreSchemeModBlockForKind(overlay, kind, storeAbs);
    const extendsRef = block?.extends || resolveAwnDataSchemaTargetExtends(kind, frameTypeId);
    const storedFields = block?.fields || {};
    awnSchema[kind] = {
      fields: extractCustomSchemeModFields(
        storedFields,
        extendsRef,
        agentRootResolved,
        projectRoot
      ),
      tabs: block?.tabs || {},
      extends: extendsRef
    };
  }

  const legacyRecordBlock = overlay?.blocks?.record;
  if (
    legacyRecordBlock?.extends === ELEMENT_TYPE_RECORD_CSV &&
    !overlay?.blocks?.["record-csv"]
  ) {
    awnSchema["record-csv"] = {
      fields: { ...(awnSchema["record-csv"]?.fields || {}), ...(awnSchema.record?.fields || {}) },
      tabs: { ...(awnSchema["record-csv"]?.tabs || {}), ...(awnSchema.record?.tabs || {}) },
      extends: ELEMENT_TYPE_RECORD_CSV
    };
    awnSchema.record = {
      fields: {},
      tabs: {},
      extends: ELEMENT_TYPE_RECORD
    };
  }

  return {
    store: rel,
    kind: store.kind,
    frameTypeId,
    schemeModRelPath,
    schemeModExists: Boolean(overlay?.exists || fs.existsSync(schemePath)),
    content,
    awnSchema,
    mergedFields: merged?.fields || {},
    fieldsLocal: merged?.fieldsLocal || {},
    fieldsInSchemeMod: Boolean(merged?.fieldsInSchemeMod)
  };
}

function writeAwnDataStoreSchema(agentRoot, projectRoot, storeRel, options = {}) {
  const { store, storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  const isGroup = store.kind === "group";
  const frameTypeId = resolveStoreFrameTypeId(storeAbs, store.kind);
  const schemePath = path.join(storeAbs, SCHEMA_MOD_FILE);
  let nextContent = "";

  if (typeof options.content === "string" && options.content.trim()) {
    nextContent = String(options.content).replace(/\r\n/g, "\n");
    extractRecordSchemaFromSchemeModContent(nextContent);
  } else {
    const awnSchema = options.awnSchema && typeof options.awnSchema === "object" ? options.awnSchema : null;
    if (
      awnSchema &&
      (awnSchema.frame ||
        awnSchema.category ||
        awnSchema.record ||
        awnSchema["record-csv"] ||
        awnSchema.sidecar)
    ) {
      const agentRootResolved = findAgentRootFromStoreAbs(storeAbs);
      const blocks = {};
      const targets = isGroup ? ["frame"] : AWN_DATA_SCHEMA_TARGETS;
      for (const kind of targets) {
        const block = awnSchema[kind] || {};
        const extendsRef = block.extends || resolveAwnDataSchemaTargetExtends(kind, frameTypeId);
        blocks[kind] = {
          extends: extendsRef,
          fields: extractCustomSchemeModFields(
            block.fields || {},
            extendsRef,
            agentRootResolved,
            projectRoot
          ),
          tabs: block.tabs && typeof block.tabs === "object" ? block.tabs : {}
        };
      }
      const hasAnyCustom = targets.some((kind) => Object.keys(blocks[kind]?.fields || {}).length > 0);
      nextContent = hasAnyCustom ? composeAwnDataStoreSchemeModYaml({ blocks }) : "";
    } else {
      const block = awnSchema?.record || awnSchema?.store || awnSchema?.element || null;
      const fields = normalizeSchemeModFieldsMap(
        options.fields || (block && block.fields) || awnSchema?.record?.fields || awnSchema?.fields || {}
      );
      const tabs =
        options.tabs ||
        options.elementSchemaTabs ||
        (block && block.tabs) ||
        awnSchema?.record?.tabs ||
        {};
      nextContent = composeAwnDataStoreSchemeModYaml({ fields, elementSchemaTabs: tabs });
    }
  }

  if (!String(nextContent || "").trim()) {
    if (fs.existsSync(schemePath)) fs.unlinkSync(schemePath);
  } else {
    fs.writeFileSync(schemePath, nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`, "utf-8");
  }
  return readAwnDataStoreSchemaPayload(agentRoot, projectRoot, rel);
}

function getStoreCatalogRecords(storeEntry) {
  const sections = Array.isArray(storeEntry?.sections) ? storeEntry.sections : [];
  const content = Array.isArray(storeEntry?.records) ? storeEntry.records : [];
  if (sections.length) return [...sections, ...content];
  return content;
}

function findStoreRecordHit(storeEntry, recordRef) {
  const ref = String(recordRef || "").trim();
  if (!ref) return null;
  const records = getStoreCatalogRecords(storeEntry);
  const refBase = path.basename(ref, path.extname(ref));
  return (
    records.find(
      (item) =>
        item.id === ref ||
        item.id === refBase ||
        item.fileName === ref ||
        item.fileName === `${ref}.md` ||
        item.relPath === ref ||
        item.relPath.endsWith(`/${ref}`) ||
        item.relPath.endsWith(`/${ref}.md`) ||
        (refBase && item.id === refBase)
    ) || null
  );
}

function readSortJsonFile(sortPath) {
  if (!fs.existsSync(sortPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function writeSortJsonFile(sortPath, order) {
  fs.writeFileSync(sortPath, `${JSON.stringify(order, null, 2)}\n`, "utf-8");
}

function removeStoreSortEntry(dataRoot, storeRel) {
  const rel = String(storeRel || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const slash = rel.indexOf("/");
  if (slash > 0) {
    const groupRel = rel.slice(0, slash);
    const childSlug = rel.slice(slash + 1);
    const sortPath = path.join(dataRoot, groupRel, "sort.json");
    const order = readSortJsonFile(sortPath).filter((item) => item !== childSlug);
    writeSortJsonFile(sortPath, order);
    return;
  }
  const sortPath = path.join(dataRoot, "sort.json");
  const top = rel.split("/")[0];
  const order = readSortJsonFile(sortPath).filter((item) => item !== top);
  writeSortJsonFile(sortPath, order);
}

function renameStoreSortEntry(dataRoot, storeRel, nextStoreRel) {
  const fromRel = String(storeRel || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const toRel = String(nextStoreRel || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!fromRel || !toRel || fromRel === toRel) return;

  const fromSlash = fromRel.indexOf("/");
  const toSlash = toRel.indexOf("/");
  if (fromSlash > 0 && toSlash > 0 && fromRel.slice(0, fromSlash) === toRel.slice(0, toSlash)) {
    const groupRel = fromRel.slice(0, fromSlash);
    const fromSlug = fromRel.slice(fromSlash + 1);
    const toSlug = toRel.slice(toSlash + 1);
    const sortPath = path.join(dataRoot, groupRel, "sort.json");
    const order = readSortJsonFile(sortPath);
    const next = order.map((item) => (item === fromSlug ? toSlug : item));
    if (!next.includes(toSlug)) next.push(toSlug);
    writeSortJsonFile(sortPath, [...new Set(next)]);
    return;
  }

  removeStoreSortEntry(dataRoot, fromRel);
  if (toSlash > 0) {
    const groupRel = toRel.slice(0, toSlash);
    const childSlug = toRel.slice(toSlash + 1);
    appendGroupSortEntry(dataRoot, groupRel, childSlug);
  } else {
    appendRootSortEntry(dataRoot, toRel);
  }
}

function resolveRecordDeletionTarget(storeEntry, storeAbs, recordRef) {
  const recordAbs = resolveStoreRecordAbsolute(storeEntry, storeAbs, recordRef);
  const hit = findStoreRecordHit(storeEntry, recordRef);
  if (hit?.isSection) {
    const sectionDir = path.dirname(recordAbs);
    return { targetAbs: sectionDir, kind: "section", recordId: hit.id };
  }
  return {
    targetAbs: recordAbs,
    kind: "file",
    recordId: hit?.id || path.basename(recordAbs, path.extname(recordAbs))
  };
}

function listAwnDataRecordsPayload(agentRoot, projectRoot, storeRel) {
  const { store, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  const records = getStoreCatalogRecords(store).map((record) => ({
    id: record.id,
    title: record.title || record.id,
    parent: record.parent || null,
    isSection: Boolean(record.isSection),
    missingManifest: Boolean(record.missingManifest),
    relPath: record.relPath,
    fileName: record.fileName,
    fileExtension: path.extname(String(record.fileName || "")).toLowerCase() || ".md"
  }));
  return {
    store: rel,
    kind: store.kind,
    recordCount: records.length,
    records,
    tree: store.tree || buildRecordTree(store.records || [])
  };
}

function readAwnDataRecordBody(agentRoot, projectRoot, storeRel, recordRef) {
  const { store, storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  if (store.recordStorage === "csv") {
    throw new Error("CSV store records do not support body API yet; use iblock_frame_get");
  }
  const recordAbs = resolveStoreRecordAbsolute(store, storeAbs, recordRef);
  if (!fs.existsSync(recordAbs)) throw new Error("Record file not found");
  const raw = fs.readFileSync(recordAbs, "utf-8");
  const hit = findStoreRecordHit(store, recordRef);
  const record =
    String(recordRef || "").trim() || hit?.id || path.basename(recordAbs, path.extname(recordAbs));
  if (!isMarkdownRecordAbs(recordAbs)) {
    return {
      store: rel,
      record,
      file: path.basename(recordAbs),
      fileExtension: path.extname(recordAbs).toLowerCase(),
      body: raw
    };
  }
  const parts = splitMarkdownFrontmatterText(raw);
  return {
    store: rel,
    record,
    file: path.basename(recordAbs),
    fileExtension: ".md",
    body: parts.body
  };
}

function writeAwnDataRecordBody(agentRoot, projectRoot, storeRel, recordRef, body) {
  const { store, storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  if (store.recordStorage === "csv") {
    throw new Error("CSV store records do not support body API yet; use iblock_frame_get");
  }
  const recordAbs = resolveStoreRecordAbsolute(store, storeAbs, recordRef);
  if (!fs.existsSync(recordAbs)) throw new Error("Record file not found");
  const hit = findStoreRecordHit(store, recordRef);
  const record =
    String(recordRef || "").trim() || hit?.id || path.basename(recordAbs, path.extname(recordAbs));
  if (!isMarkdownRecordAbs(recordAbs)) {
    const nextBody = String(body ?? "");
    fs.writeFileSync(recordAbs, nextBody, "utf-8");
    return {
      store: rel,
      record,
      file: path.basename(recordAbs),
      fileExtension: path.extname(recordAbs).toLowerCase(),
      body: nextBody
    };
  }
  const raw = fs.readFileSync(recordAbs, "utf-8");
  const parts = splitMarkdownFrontmatterText(raw);
  let nextFrontmatter = parts.frontmatter;
  nextFrontmatter = bumpRecordUpdatedFrontmatter(nextFrontmatter);
  const nextRaw = joinMarkdownFrontmatterText(nextFrontmatter, String(body ?? ""));
  fs.writeFileSync(recordAbs, nextRaw, "utf-8");
  return {
    store: rel,
    record,
    file: path.basename(recordAbs),
    fileExtension: ".md",
    body: String(body ?? "")
  };
}

function deleteAwnDataRecord(agentRoot, projectRoot, storeRel, recordRef) {
  const { store, storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  if (store.kind === "single") throw new Error("Cannot delete the only record in a single store");
  if (store.recordStorage === "csv") {
    throw new Error("CSV store records do not support delete API yet; use write_file on main.csv");
  }
  const { targetAbs, kind, recordId } = resolveRecordDeletionTarget(store, storeAbs, recordRef);
  if (!fs.existsSync(targetAbs)) throw new Error("Record not found");
  if (kind === "section") {
    fs.rmSync(targetAbs, { recursive: true, force: true });
  } else {
    fs.unlinkSync(targetAbs);
  }
  const sortPath = path.join(storeAbs, "sort.json");
  const order = readSortJsonFile(sortPath).filter((item) => item !== recordId);
  if (fs.existsSync(sortPath)) writeSortJsonFile(sortPath, order);
  return { ok: true, store: rel, record: recordId, deleted: true };
}

function ensureAwnDataSectionManifest(agentRoot, projectRoot, storeRel, sectionRef, options = {}) {
  const { store, storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  const hit = findStoreRecordHit(store, sectionRef);
  if (!hit?.isSection) throw new Error("Section not found");

  const innerPath = resolveSectionInnerPathFromHit(hit);
  const sectionDir = resolveSectionDirectoryAbs(storeAbs, innerPath);
  if (!sectionDir || !fs.existsSync(sectionDir)) throw new Error("Section folder not found");

  const manifestPath = path.join(sectionDir, COLLECTION_MANIFEST);
  if (!fs.existsSync(manifestPath)) {
    const name = String(options.name || options.title || hit.title || path.basename(sectionDir)).trim();
    const title = String(options.title || name || hit.id || path.basename(sectionDir)).trim();
    const content = buildSectionManifestMarkdown({
      id: hit.id,
      name: title,
      title,
      parent: hit.parent || null,
      storeRel: rel,
      agentRoot,
      projectRoot
    });
    fs.writeFileSync(manifestPath, content, "utf-8");
  }

  return getAwnDataPayload(agentRoot, projectRoot, rel).store;
}

function renameAwnDataRecord(agentRoot, projectRoot, storeRel, recordRef, options = {}) {
  const { store, storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  if (store.kind === "single") throw new Error("Cannot rename the only record in a single store");
  if (store.recordStorage === "csv") {
    throw new Error("CSV store records do not support rename/move API yet");
  }

  const hit = findStoreRecordHit(store, recordRef);
  const recordAbs = resolveStoreRecordAbsolute(store, storeAbs, recordRef);
  if (!fs.existsSync(recordAbs)) throw new Error("Record not found");

  const nextSlug = normalizeStoreSlug(options.slug || options.id || options.to || "");
  const nextParent =
    options.parent !== undefined ? String(options.parent || "").trim() : String(hit?.parent || "").trim();
  const recordRoot = resolveStoreRecordRootAbs(storeAbs);
  const ext = path.extname(recordAbs) || ".md";

  let targetAbs;
  if (hit?.isSection) {
    const sectionDir = hit?.missingManifest
      ? resolveSectionDirectoryAbs(storeAbs, resolveSectionInnerPathFromHit(hit))
      : path.dirname(recordAbs);
    if (!sectionDir || !fs.existsSync(sectionDir)) throw new Error("Section not found");
    const sectionId = nextSlug || path.basename(sectionDir);
    const parentDir = nextParent ? path.join(recordRoot, nextParent) : recordRoot;
    targetAbs = path.join(parentDir, sectionId);
    if (fs.existsSync(targetAbs)) throw new Error(`Target already exists: ${sectionId}`);
    fs.mkdirSync(parentDir, { recursive: true });
    fs.renameSync(sectionDir, targetAbs);
  } else {
    const nextId = nextSlug || path.basename(recordAbs, ext);
    const relFile = nextParent ? path.posix.join(nextParent, `${nextId}${ext}`) : `${nextId}${ext}`;
    targetAbs = path.join(recordRoot, relFile);
    if (fs.existsSync(targetAbs)) throw new Error(`Target already exists: ${nextId}`);
    fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
    fs.renameSync(recordAbs, targetAbs);
  }

  const sortPath = path.join(storeAbs, "sort.json");
  const oldId = hit?.id || path.basename(recordAbs, ext);
  const newId = nextSlug || oldId;
  const order = readSortJsonFile(sortPath);
  if (order.includes(oldId)) {
    writeSortJsonFile(
      sortPath,
      order.map((item) => (item === oldId ? newId : item)).filter((item, index, arr) => arr.indexOf(item) === index)
    );
  }

  return {
    ok: true,
    store: rel,
    record: newId,
    from: oldId,
    file: path.basename(targetAbs)
  };
}

function deleteAwnDataStore(agentRoot, projectRoot, storeRel) {
  const { store, storeAbs, storeRel: rel, dataRoot } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  if (store.kind === "group" && Number(store.childCount || 0) > 0) {
    throw new Error("Group is not empty");
  }
  fs.rmSync(storeAbs, { recursive: true, force: true });
  removeStoreSortEntry(dataRoot, rel);
  return { ok: true, store: rel, deleted: true };
}

function renameAwnDataStore(agentRoot, projectRoot, storeRel, nextSlug) {
  const { storeAbs, storeRel: rel, dataRoot } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  const normalized = normalizeStoreSlug(nextSlug);
  if (!normalized) throw new Error("Invalid store slug");
  if (storeSchemaExists(dataRoot, normalized)) throw new Error(`Store already exists: ${normalized}`);

  const nextAbs = getStoreAbsolutePath(dataRoot, normalized);
  if (!nextAbs) throw new Error("Invalid store slug");
  fs.mkdirSync(path.dirname(nextAbs), { recursive: true });
  fs.renameSync(storeAbs, nextAbs);
  renameStoreSortEntry(dataRoot, rel, normalized);
  return { ok: true, store: rel, nextStore: normalized };
}

function getContainerTypesPayload(agentRoot, projectRoot) {
  const types = {};
  for (const kind of ["group", "collection", "single"]) {
    const meta = loadContainerTypeMeta(kind, agentRoot, projectRoot);
    types[kind] = {
      typeId: meta.typeId,
      description: meta.typeDescription,
      fields: meta.typeFields,
      defaults: {
        collectionType: meta.typeDefaults?.collectionType || "md",
        collectionKind: meta.typeDefaults?.collectionKind || "records",
        recordStorage: meta.typeDefaults?.recordStorage || "md",
        recordElementType: meta.typeDefaults?.recordElementType || ELEMENT_TYPE_RECORD,
        recordHierarchy: Boolean(meta.typeDefaults?.recordHierarchy),
        recordFileTypes: String(meta.typeDefaults?.recordFileTypes || "")
      }
    };
  }
  return { types };
}

module.exports = {
  AWN_DATABASE_DIR,
  LEGACY_AWN_DATABASE_DIR,
  LEGACY_AWN_DATA_DIR,
  AWN_DATA_DIR,
  STORE_CONTRACT_FILE,
  STORE_MD_FILE,
  STORE_FILE,
  SCHEMA_FILE,
  SINGLETON_RECORD,
  STORE_STORAGE_ROOT,
  STORE_DATA_DIR,
  STORE_ASSETS_DIR,
  resolveStoreRecordRootAbs,
  usesStoreStorageDataLayout,
  ensureStoreStorageLayout,
  formatStoreRecordRelPath,
  COLLECTION_MANIFEST,
  SCHEME_MOD_FILE,
  SCHEMA_MOD_FILE,
  getAwnDataRoot,
  loadAwnDataStores,
  getAwnDataPayload,
  findAwnDataStore,
  readStoreMdParts,
  resolveAwnDataReadRoot,
  buildRecordTree,
  normalizeStoreKind,
  normalizeRecordStorage,
  normalizeCollectionKind,
  getCollectionKind,
  getRecordHierarchy,
  getRecordFileTypes,
  loadContainerTypeDefaults,
  loadContainerTypeMeta,
  getContainerTypesPayload,
  normalizeStoreSlug,
  slugifyStoreName,
  ensureAwnDataBase,
  TAXONOMIES_GROUP_REL,
  ensureTaxonomiesGroupScaffold,
  createAwnDataStore,
  createAwnDataRecord,
  ensureAwnDataSectionManifest,
  ensureAwnDataMainCsvFile,
  buildStoreManifestContent,
  buildStoreMdContent,
  buildPlainManifestContent,
  writeStoreManifest,
  writeStoreSchemeMod,
  writeInitialStoreAwnSchema,
  writeStoreContractBundle,
  composeAwnDataStoreSchemeModYaml,
  readStoreSchemeModOverlay,
  loadMergedStoreSchema,
  resolveAwnDataStoreContext,
  extractCustomSchemeModFields,
  readAwnDataStoreSchemaPayload,
  writeAwnDataStoreSchema,
  readAwnDataStoreProperty,
  writeAwnDataStoreProperty,
  readAwnDataStoreProperties,
  writeAwnDataStoreProperties,
  readAwnDataRecordProperty,
  writeAwnDataRecordProperty,
  readAwnDataRecordProperties,
  writeAwnDataRecordProperties,
  listAwnDataRecordsPayload,
  readAwnDataRecordBody,
  writeAwnDataRecordBody,
  deleteAwnDataRecord,
  renameAwnDataRecord,
  deleteAwnDataStore,
  renameAwnDataStore,
  normalizeExtendsRef,
  resolveKindFromSupertype,
  CONTAINER_SUPERTYPE,
  CONTAINER_TYPE_ID,
  FRAME_TYPE_ID,
  isAwnInfoblockFrameManifest,
  isAwnInfoblockContentTypeId,
  DEFAULT_ELEMENT_SCHEMA_TYPE,
  DEFAULT_RECORD_ELEMENT_TYPE,
  ELEMENT_TYPE_RECORD,
  ELEMENT_TYPE_RECORD_LITE,
  ELEMENT_TYPE_RECORD_CSV,
  ELEMENT_TYPE_CATEGORY,
  elementTypeFromCollectionType,
  resolveStoreRecordElementType,
  ELEMENT_TYPE_SIDECAR,
  ELEMENT_TYPE_COMMENT,
  AWN_DATA_SCHEMA_TARGETS,
  AWN_DATA_SCHEMA_TARGET_EXTENDS,
  buildSectionManifestMarkdown,
  toAwnFieldKey,
  normalizeSchemeModFieldsMap,
  KIND_TO_AWN_PROP_TYPE
};
