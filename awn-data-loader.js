const fs = require("fs");
const path = require("path");
const { parseTypeYaml } = require("./awn-yaml-utils");
const { getAgentCmsCoreAbsolute } = require("./platform-sources");
const {
  getRecordStorage,
  getCsvFileName,
  getCsvColumnsFromSchema,
  loadCsvRecords,
  appendCsvRecord,
  serializeCsv
} = require("./awn-data-csv");

const AWN_DATA_DIR = "awn-data";
const TABLE_BASE_EXTENDS = `${AWN_DATA_DIR}/cms-base/entities/table.base.md`;
const ROW_BASE_EXTENDS = `${AWN_DATA_DIR}/cms-base/entities/row.base.md`;
const ENTITY_BASE_EXTENDS = `${AWN_DATA_DIR}/cms-base/entities/base.md`;
/** @deprecated use TABLE_BASE_EXTENDS */
const TABLE_BASE_REL = "cms-base/entities/table.base.md";
const COLLECTION_MANIFEST = "manifest.md";
const SCHEME_MOD_FILE = "scheme-mod.yml";
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
const DISCOVER_SKIP_DIRS = new Set([".awn-cache", "history", "table-base"]);
const RECORD_WALK_SKIP_DIRS = new Set(["table-base", "record-base", "row-base", "_base", ".awn-cache", "history"]);

function isSystemStoreFile(name) {
  const lower = String(name || "").toLowerCase();
  if (lower === COLLECTION_MANIFEST.toLowerCase()) return true;
  if (lower === STORE_CONTRACT_FILE.toLowerCase()) return true;
  if (lower === STORE_MD_FILE.toLowerCase()) return true;
  if (lower === STORE_FILE.toLowerCase()) return true;
  if (lower.endsWith(STORE_CONTRACT_SUFFIX)) return true;
  return false;
}

const AWN_PROP_TYPE_TO_KIND = {
  "awn.data.collection": "collection",
  "awn.data.single": "singleton",
  "awn.data.singleton": "singleton",
  "awn.data.group": "group",
  "awn.data.base": "collection",
  "awn.data.mixin": "collection",
  "awn.data.entity": "collection",
  "awn.collection": "collection",
  "awn.single": "singleton",
  "awn.singleton": "singleton",
  "awn.group": "group",
  "awn.base": "collection"
};

const KIND_TO_AWN_PROP_TYPE = {
  collection: "awn.data.collection",
  singleton: "awn.data.single",
  group: "awn.data.group"
};

const DATA_CONTAINERS_PREFIX = `${AWN_DATA_DIR}/cms-base/data-containers/`;
const CONTAINER_SUPERTYPE = {
  collection: `${DATA_CONTAINERS_PREFIX}collection.md`,
  group: `${DATA_CONTAINERS_PREFIX}group.md`,
  singleton: `${DATA_CONTAINERS_PREFIX}single.md`
};
const DEFAULT_ELEMENT_SCHEMA = `${AWN_DATA_DIR}/cms-base/data-elements/default.md`;

function toAwnFieldKey(key) {
  const name = String(key || "").trim();
  if (!name || name.startsWith("awn-")) return name;
  return `awn-${name}`;
}

function normalizeAwnPropTypeToKind(propType, fallback = "collection") {
  const key = String(propType || "").trim().toLowerCase();
  if (AWN_PROP_TYPE_TO_KIND[key]) return AWN_PROP_TYPE_TO_KIND[key];
  if (key.includes("group")) return "group";
  if (key.includes("single")) return "singleton";
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

const STORE_KINDS = new Set(["collection", "singleton", "group"]);

/** Порядок в sidebar «Накопители»: группы → коллекции → одиночки. */
const AWN_DATA_STORE_KIND_ORDER = { group: 0, collection: 1, singleton: 2 };

function awnDataStoreKindRank(kind) {
  return Object.prototype.hasOwnProperty.call(AWN_DATA_STORE_KIND_ORDER, kind)
    ? AWN_DATA_STORE_KIND_ORDER[kind]
    : 1;
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
  return path.join(agentRootAbs, AWN_DATA_DIR);
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
    if (path.basename(dir) === AWN_DATA_DIR) return dir;
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
    !normalized.startsWith(`${AWN_DATA_DIR}/`) &&
    !normalized.startsWith(".") &&
    !path.isAbsolute(normalized)
  ) {
    normalized = `${AWN_DATA_DIR}/${normalized}`;
  }

  return normalized;
}

function resolveKindFromSupertype(supertype) {
  const ref = normalizeExtendsRef(supertype).toLowerCase();
  if (!ref.startsWith(DATA_CONTAINERS_PREFIX)) return "";
  const base = path.basename(ref, ".md");
  if (base === "collection") return "collection";
  if (base === "group") return "group";
  if (base === "single") return "singleton";
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
  if (idMode) record["id-mode"] = idMode;
  if (file) record.file = file;
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

  if (dataRoot && ref.startsWith(`${AWN_DATA_DIR}/`)) {
    const withinData = ref.slice(`${AWN_DATA_DIR}/`.length);
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
      kind: String(raw.kind || "collection").trim(),
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
  const kindFromSuper = resolveKindFromSupertype(supertype);
  const kind = raw.kind
    ? String(raw.kind).trim()
    : kindFromSuper || normalizeAwnPropTypeToKind(awnType, "collection");

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

  const elementExtends = normalizeExtendsRef(readStoreProp(raw, ["awn-data-elements-schema-extends"], ""));
  const legacyExtends = normalizeExtendsRef(readStoreProp(raw, ["awn-extends", "extends", "awn-prop-extends"], ""));

  return {
    version: raw.version || 1,
    kind,
    supertype,
    id: String(readStoreProp(raw, ["awn-id", "id", "awn-prop-id"], "")).trim(),
    name: String(readStoreProp(raw, ["awn-name", "name", "title", "awn-prop-name"], "")).trim(),
    description: String(extractDescriptionFromBody(body) || readStoreProp(raw, ["description", "awn-description", "awn-prop-description"], "")).trim(),
    extends: elementExtends || legacyExtends,
    layer: String(readStoreProp(raw, ["awn-layer", "layer", "awn-prop-layer"], "")).trim(),
    record: { ...recordFromObject, ...extractFlatRecordProps(raw) },
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

function readStoreSchemeModOverlay(storeAbs) {
  const schemePath = path.join(storeAbs, SCHEME_MOD_FILE);
  if (!fs.existsSync(schemePath)) return null;
  try {
    const parsed = parseTypeYaml(fs.readFileSync(schemePath, "utf-8"));
    const awnSchema = parsed?.awn_schema;
    if (!awnSchema || typeof awnSchema !== "object") {
      return { fields: {}, tabs: {}, schemePath, exists: true };
    }
    const block = awnSchema.record || awnSchema.store || awnSchema.element || null;
    const rawFields =
      (block && typeof block === "object" ? block.fields : null) ||
      awnSchema.record?.fields ||
      awnSchema.fields ||
      {};
    return {
      fields: normalizeAwnFieldsMap(rawFields),
      tabs: block?.tabs && typeof block.tabs === "object" ? { ...block.tabs } : {},
      schemePath,
      exists: true
    };
  } catch {
    return null;
  }
}

function composeAwnDataStoreSchemeModYaml(schema = {}) {
  const fields = normalizeAwnFieldsMap(schema.fields || {});
  const tabs = schema.elementSchemaTabs || schema.tabs || {};
  const lines = ["version: 1", "layer: awn-data-store", "", "awn_schema:", "  record:", "    fields:"];
  if (Object.keys(fields).length) {
    lines.push(...dumpYamlBlock(fields, 3));
  }
  if (tabs && Object.keys(tabs).length) {
    lines.push("    tabs:");
    lines.push(...dumpYamlBlock(tabs, 3));
  }
  lines.push("");
  return `${lines.join("\n")}`;
}

function writeStoreSchemeMod(storeAbs, schema = {}) {
  const fields = schema.fields || {};
  const tabs = schema.elementSchemaTabs || schema.tabs || {};
  if (!Object.keys(fields).length && !Object.keys(tabs).length) return false;
  fs.writeFileSync(
    path.join(storeAbs, SCHEME_MOD_FILE),
    composeAwnDataStoreSchemeModYaml({ fields, elementSchemaTabs: tabs }),
    "utf-8"
  );
  return true;
}

function loadMergedStoreSchema(storeAbs, dataRoot = "") {
  const leaf = readRawStoreSchemaAt(storeAbs);
  if (!leaf) return null;

  const agentRoot = dataRoot ? path.dirname(dataRoot) : findAgentRootFromStoreAbs(storeAbs);
  const chain = [leaf];
  let dir = storeAbs;
  let extendsRef = leaf.schema.extends;
  const visited = new Set([leaf.schemaPath]);

  while (extendsRef) {
    const parentPath = resolveExtendsSchemaAbs(dir, extendsRef, agentRoot);
    if (!parentPath || visited.has(parentPath)) break;
    visited.add(parentPath);
    const parent = readRawStoreSchemaAt(path.dirname(parentPath), parentPath);
    if (!parent) break;
    chain.unshift(parent);
    dir = path.dirname(parentPath);
    extendsRef = parent.schema.extends;
  }

  let fields = {};
  for (const item of chain) {
    fields = { ...fields, ...(item.schema.fields || {}) };
  }

  const schemeOverlay = readStoreSchemeModOverlay(storeAbs);
  let fieldsLocal = { ...(leaf.schema.fields || {}) };
  if (schemeOverlay) {
    fieldsLocal = { ...schemeOverlay.fields };
    fields = { ...fields, ...schemeOverlay.fields };
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
    schemeModFile: schemeOverlay?.exists ? SCHEME_MOD_FILE : "",
    extendsChain: chain.map((item) => item.schema.extends).filter(Boolean),
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

function isRecordFile(name, kind) {
  const lower = name.toLowerCase();
  if (!lower.endsWith(".md")) return false;
  if (isSystemStoreFile(name)) return false;
  if (kind === "singleton" && lower !== SINGLETON_RECORD) return false;
  if (kind === "collection" && lower === SINGLETON_RECORD) return false;
  return true;
}

function listRecordFiles(dirPath, kind, relPrefix = "", acc = []) {
  if (!fs.existsSync(dirPath)) return acc;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (RECORD_WALK_SKIP_DIRS.has(entry.name)) continue;
      listRecordFiles(fullPath, kind, path.posix.join(relPrefix, entry.name), acc);
      continue;
    }
    if (!isRecordFile(entry.name, kind)) continue;
    acc.push({
      absPath: fullPath,
      fileName: entry.name,
      relPath: path.posix.join(relPrefix, entry.name).replace(/\\/g, "/")
    });
  }
  return acc;
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

function parseRecordFile(fileEntry, storeRel) {
  const raw = fs.readFileSync(fileEntry.absPath, "utf-8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const mergedFrontmatter = mergeRecordBodyFields(frontmatter, body);
  const id =
    String(
      mergedFrontmatter["awn-id"] ||
        mergedFrontmatter.id ||
        frontmatter["awn-id"] ||
        frontmatter.id ||
        ""
    ).trim() || path.basename(fileEntry.fileName, path.extname(fileEntry.fileName));
  const parent = String(
    mergedFrontmatter["awn-parent"] || mergedFrontmatter.parent || frontmatter["awn-parent"] || frontmatter.parent || ""
  ).trim();
  const pathParent = path.dirname(fileEntry.relPath);
  const inferredParent =
    pathParent && pathParent !== "." ? path.basename(pathParent) : "";

  return {
    id,
    parent: parent || inferredParent || null,
    relPath: `${storeRel}/${fileEntry.relPath}`.replace(/\\/g, "/"),
    fileName: fileEntry.fileName,
    frontmatter: mergedFrontmatter,
    body,
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
  const schemaPath = resolveStoreSchemaPath(dataRoot);
  if (fs.existsSync(schemaPath)) {
    acc.push({ absPath: dataRoot, relPath: rel.replace(/\\/g, "/") || path.basename(dataRoot) });
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

  const kind = String(schema.kind || "collection").trim();
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

  const recordStorage = kind === "collection" ? getRecordStorage(schema) : "md";
  let records = [];
  if (kind !== "group") {
    if (kind === "collection" && recordStorage === "csv") {
      records = loadCsvRecords(storeAbs, storeRel, schema);
    } else {
      const recordFiles = listRecordFiles(storeAbs, kind);
      records = recordFiles.map((f) => parseRecordFile(f, storeRel));
    }
  }

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
    recordStorage,
    recordCount: kind === "group" ? 0 : records.length,
    recordFile:
      kind === "singleton"
        ? SINGLETON_RECORD
        : kind === "collection" && recordStorage === "csv"
          ? getCsvFileName(schema)
          : null
  };

  if (kind === "group") {
    payload.children = [];
    payload.childCount = 0;
    return payload;
  }

  if (kind === "singleton") {
    const main = records.find((r) => r.fileName === SINGLETON_RECORD) || records[0] || null;
    payload.record = main;
    payload.records = main ? [main] : [];
  } else {
    payload.records = records;
    payload.tree = buildRecordTree(records);
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
    if (groupSort?.length && group.children.length) {
      group.children.sort((a, b) => {
        const aSlug = a.relPath.split("/").pop();
        const bSlug = b.relPath.split("/").pop();
        const ai = groupSort.indexOf(aSlug);
        const bi = groupSort.indexOf(bSlug);
        if (ai === -1 && bi === -1) return String(a.name).localeCompare(String(b.name), "ru");
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    } else {
      group.children.sort((a, b) => String(a.name).localeCompare(String(b.name), "ru"));
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
    model: "awn-data",
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
awn-type: awn.data.base
awn-layer: awn-data-base
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

Базовые поля каждой записи в awn-data (наследуются всеми накопителями).
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

function buildStoreManifestContent(schema, body = "") {
  const kind = String(schema.kind || "collection").trim();
  const lines = ["---"];
  const supertype = schema.supertype || CONTAINER_SUPERTYPE[kind] || "";
  if (supertype) {
    lines.push(`awn-supertype: ${normalizeExtendsRef(supertype)}`);
    if (schema.name) lines.push(`awn-name: ${yamlQuote(schema.name)}`);
    const record = schema.record && typeof schema.record === "object" ? schema.record : {};
    if (record["id-mode"]) lines.push(`awn-record-id-mode: ${record["id-mode"]}`);
    if (record.file) lines.push(`awn-record-file: ${yamlQuote(record.file)}`);
    if (record.hierarchy !== undefined) lines.push(`awn-record-hierarchy: ${record.hierarchy ? "true" : "false"}`);
    lines.push(
      `awn-data-elements-schema-extends: ${normalizeExtendsRef(schema.extends || DEFAULT_ELEMENT_SCHEMA)}`
    );
    lines.push("awn-data-elements-schema-mixins: []");
    if (schema.fieldsInSchemeMod) {
      lines.push("awn-data-elements-schema:");
      lines.push("  fields: {}");
    } else {
      lines.push("awn-data-elements-schema:");
      lines.push("  fields:");
      if (schema.fields && Object.keys(schema.fields).length) {
        lines.push(...dumpYamlBlock(normalizeAwnFieldsMap(schema.fields), 2));
      }
      const tabs = schema.elementSchemaTabs || {};
      if (Object.keys(tabs).length) {
        lines.push("  tabs:");
        lines.push(...dumpYamlBlock(tabs, 2));
      }
    }
  } else {
    lines.push(`awn-type: ${KIND_TO_AWN_PROP_TYPE[kind] || "awn.data.collection"}`);
    if (schema.id) lines.push(`awn-id: ${schema.id}`);
    if (schema.layer) lines.push(`awn-layer: ${schema.layer}`);
    if (schema.name) lines.push(`awn-name: ${yamlQuote(schema.name)}`);
    if (schema.extends) lines.push(`awn-extends: ${normalizeExtendsRef(schema.extends)}`);
    if (schema.record && Object.keys(schema.record).length) {
      lines.push("awn-record:");
      lines.push(...dumpYamlBlock(schema.record, 1));
    }
    if (schema.fields && Object.keys(schema.fields).length) {
      lines.push("awn-fields:");
      lines.push(...dumpYamlBlock(normalizeAwnFieldsMap(schema.fields), 1));
    }
  }
  lines.push("---", "");
  const manifestBody =
    String(body || "").trim() ||
    buildPlainManifestContent(schema.name, schema.description).trim();
  return `${lines.join("\n")}${manifestBody}\n`;
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

function buildCollectionManifestBody({ name, description }) {
  const title = name || "Коллекция";
  const desc = String(description || title).trim();
  return `# ${title}\n\n${desc}`;
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

/** @deprecated use tableBaseExtendsPath */
function recordBaseExtendsPath() {
  return tableBaseExtendsPath();
}

function buildCollectionSchemaContent({ slug, name, description, hierarchy = true }) {
  const desc = String(description || name || slug).trim();
  const recordFields = {
    "awn-title": { type: "awn.string", title: "Название", required: true, tab: "main" },
    "awn-parent": {
      type: "awn.string",
      title: "Родитель",
      description: "id родительской записи",
      tab: "main"
    },
    "awn-status": {
      type: "awn.enum",
      title: "Статус",
      enum: ["open", "done"],
      default: "open",
      tab: "main"
    }
  };
  return {
    schema: {
      kind: "collection",
      supertype: CONTAINER_SUPERTYPE.collection,
      name: name || slug,
      description: desc,
      extends: DEFAULT_ELEMENT_SCHEMA,
      fieldsInSchemeMod: true,
      record: {
        storage: "md",
        "id-mode": hierarchy ? "numeric" : "slug",
        file: "{id}.md",
        hierarchy: hierarchy ? true : false
      },
      fields: recordFields,
      elementSchemaTabs: { main: "Основное" }
    },
    schemeModFields: recordFields,
    schemeModTabs: { main: "Основное" },
    manifestBody: buildCollectionManifestBody({ name: name || slug, description: desc })
  };
}

function buildTaxonomyCollectionSchemaContent({ slug, name, description }) {
  const extendsPath = recordBaseExtendsPath(slug);
  const id = slug.replace(/\//g, ".");
  const shortName = name || slug.split("/").pop();
  const desc = String(description || shortName).trim();
  return {
    schema: {
      kind: "collection",
      id,
      name: shortName,
      description: desc,
      extends: extendsPath,
      record: {
        storage: "csv",
        file: "main.csv",
        "id-mode": "slug",
        hierarchy: false
      },
      fields: {
        code: { type: "awn.string", title: "Код", required: true },
        label: { type: "awn.string", title: "Подпись", required: true },
        emoji: { type: "awn.string", title: "Эмодзи" },
        color: { type: "awn.color", title: "Цвет" },
        sort: { type: "awn.integer", title: "Порядок", default: 0 }
      }
    },
    manifestBody: `# ${shortName}\n\n${desc}`
  };
}

function buildSingletonSchemaContent({ slug, name, description }) {
  const desc = String(description || name || slug).trim();
  const recordFields = {
    "awn-title": { type: "awn.string", title: "Название", required: true, tab: "main" }
  };
  return {
    schema: {
      kind: "singleton",
      supertype: CONTAINER_SUPERTYPE.singleton,
      name: name || slug,
      description: desc,
      extends: DEFAULT_ELEMENT_SCHEMA,
      fieldsInSchemeMod: true,
      record: { file: "main.md" },
      fields: recordFields,
      elementSchemaTabs: { main: "Основное" }
    },
    schemeModFields: recordFields,
    schemeModTabs: { main: "Основное" },
    manifestBody: `# ${name || slug}\n\n${desc}`
  };
}

function buildGroupSchemaContent({ slug, name, description }) {
  const desc = String(description || name || slug).trim();
  return {
    schema: {
      kind: "group",
      supertype: CONTAINER_SUPERTYPE.group,
      name: name || slug,
      description: desc
    },
    manifestBody: `# ${name || slug}\n\n${desc}`
  };
}

function writeStoreManifest(storeAbs, schema, manifestBody = "") {
  fs.writeFileSync(
    path.join(storeAbs, COLLECTION_MANIFEST),
    buildStoreManifestContent(schema, manifestBody),
    "utf-8"
  );
}

/** @deprecated use writeStoreManifest */
function writeStoreContractBundle(storeAbs, schema, manifestBody = "") {
  writeStoreManifest(storeAbs, schema, manifestBody);
}

function buildRecordMarkdown({ id, title, parent, storeRel = "", extra = {} }) {
  const lines = ["---"];
  const store = String(storeRel || "").trim().replace(/^\/+|\/+$/g, "");
  if (store) lines.push(`awn-supertype: ${AWN_DATA_DIR}/${store}/manifest.md`);
  const ts = nowIsoMinute();
  lines.push(`awn-created: "${ts}"`, `awn-updated: "${ts}"`);
  if (title) lines.push(`awn-title: ${title}`);
  if (parent) lines.push(`awn-parent: "${parent}"`);
  for (const [key, value] of Object.entries(extra)) {
    const awnKey = toAwnFieldKey(key);
    if (
      [
        "awn-id",
        "awn-parent",
        "awn-created",
        "awn-updated",
        "awn-title",
        "awn-supertype",
        "id",
        "parent",
        "created",
        "updated",
        "title"
      ].includes(awnKey)
    ) {
      continue;
    }
    lines.push(`${awnKey}: ${value}`);
  }
  lines.push("---", "", title ? `${title}.` : "");
  return `${lines.join("\n")}\n`;
}

function createAwnDataStore(agentRoot, projectRoot, options = {}) {
  const kind = String(options.kind || "collection").trim();
  if (!STORE_KINDS.has(kind)) throw new Error("kind must be collection, singleton, or group");

  const slug = normalizeStoreSlug(options.slug || slugifyStoreName(options.name));
  if (!slug) throw new Error("Invalid store slug (use kebab-case, optional subfolder: taxonomies/tags)");

  const dataRoot = ensureAwnDataBase(agentRoot, projectRoot);
  if (storeSchemaExists(dataRoot, slug)) {
    throw new Error(`Store already exists: ${slug}`);
  }

  const storeAbs = getStoreAbsolutePath(dataRoot, slug);
  fs.mkdirSync(storeAbs, { recursive: true });

  const name = String(options.name || slug).trim();
  const description = String(options.description || "").trim();
  const isTaxonomy = slug.startsWith("taxonomies/");
  const withSample =
    kind === "collection" && !isTaxonomy ? options.withSampleRecord !== false : false;

  if (kind === "collection") {
    const bundle = isTaxonomy
      ? buildTaxonomyCollectionSchemaContent({ slug, name, description })
      : buildCollectionSchemaContent({ slug, name, description, hierarchy: options.hierarchy !== false });
    writeStoreManifest(storeAbs, bundle.schema, bundle.manifestBody);
    if (bundle.schemeModFields) {
      writeStoreSchemeMod(storeAbs, {
        fields: bundle.schemeModFields,
        elementSchemaTabs: bundle.schemeModTabs || {}
      });
    }
    fs.writeFileSync(path.join(storeAbs, "sort.json"), "[]\n", "utf-8");
    if (isTaxonomy) {
      const columns = getCsvColumnsFromSchema(loadMergedStoreSchema(storeAbs, dataRoot));
      fs.writeFileSync(path.join(storeAbs, "main.csv"), serializeCsv(columns, []), "utf-8");
    } else if (withSample) {
      const recordContent = buildRecordMarkdown({ id: "1", title: "Первая запись", storeRel: slug });
      fs.writeFileSync(path.join(storeAbs, "1.md"), recordContent, "utf-8");
      fs.writeFileSync(path.join(storeAbs, "sort.json"), `${JSON.stringify(["1"], null, 2)}\n`, "utf-8");
    }
  } else if (kind === "group") {
    const bundle = buildGroupSchemaContent({ slug, name, description });
    writeStoreManifest(storeAbs, bundle.schema, bundle.manifestBody);
    fs.writeFileSync(path.join(storeAbs, "sort.json"), "[]\n", "utf-8");
  } else {
    const bundle = buildSingletonSchemaContent({ slug, name, description });
    writeStoreManifest(storeAbs, bundle.schema, bundle.manifestBody);
    if (bundle.schemeModFields) {
      writeStoreSchemeMod(storeAbs, {
        fields: bundle.schemeModFields,
        elementSchemaTabs: bundle.schemeModTabs || {}
      });
    }
    const recordContent = buildRecordMarkdown({
      id: slug.replace(/\//g, "."),
      title: name,
      storeRel: slug,
      extra: { note: "" }
    });
    fs.writeFileSync(path.join(storeAbs, SINGLETON_RECORD), recordContent, "utf-8");
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
  const kind = String(schema?.kind || "collection").trim();
  if (kind === "singleton") throw new Error("Cannot add records to singleton (edit main.md)");

  const payload = getAwnDataPayload(agentRoot, projectRoot, storeRel);
  const store = payload.store;
  if (!store) throw new Error("Store not found");

  const recordStorage = getRecordStorage(schema);
  const idMode = String(schema?.record?.["id-mode"] || schema?.record?.idMode || "numeric").trim();
  let id = String(options.id || "").trim();
  if (!id) {
    id = idMode === "numeric" ? resolveNextNumericRecordId(store.records || []) : slugifyStoreName(options.title || "record");
  }

  const parent = String(options.parent || "").trim();
  const title = String(options.title || id).trim();
  const hierarchy = schema?.record?.hierarchy !== false;

  if (recordStorage === "csv") {
    if (parent) throw new Error("CSV store does not support hierarchy");
    const fields = schema?.fields || {};
    const row = { "awn-code": id, "awn-label": title };
    for (const key of Object.keys(fields)) {
      if (options[key] !== undefined) row[key] = options[key];
    }
    appendCsvRecord(storeAbs, schema, row);
    return getAwnDataPayload(agentRoot, projectRoot, storeRel).store;
  }

  let relFile = `${id}.md`;
  let absFile = path.join(storeAbs, relFile);
  if (parent && hierarchy) {
    relFile = path.posix.join(parent, `${id}.md`);
    absFile = path.join(storeAbs, parent, `${id}.md`);
    fs.mkdirSync(path.dirname(absFile), { recursive: true });
  }

  if (fs.existsSync(absFile)) throw new Error(`Record already exists: ${id}`);

  const content = buildRecordMarkdown({ id, title, parent: parent || null, storeRel });
  fs.writeFileSync(absFile, content, "utf-8");

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
    fields: normalizeAwnFieldsMap(rawFields),
    tabs: { ...tabs }
  };
}

function readAwnDataStoreSchemaPayload(agentRoot, projectRoot, storeRel) {
  const { store, dataRoot, storeAbs, storeRel: rel } = resolveAwnDataStoreContext(
    agentRoot,
    projectRoot,
    storeRel
  );
  const schemeModRelPath = `${rel}/${SCHEME_MOD_FILE}`.replace(/\\/g, "/");
  const schemePath = path.join(storeAbs, SCHEME_MOD_FILE);
  const overlay = readStoreSchemeModOverlay(storeAbs);
  const merged = loadMergedStoreSchema(storeAbs, dataRoot);
  let content = "";
  if (fs.existsSync(schemePath)) {
    content = fs.readFileSync(schemePath, "utf-8");
  }

  return {
    store: rel,
    kind: store.kind,
    schemeModRelPath,
    schemeModExists: Boolean(overlay?.exists || fs.existsSync(schemePath)),
    content,
    awnSchema: {
      record: {
        fields: overlay?.fields || {},
        tabs: overlay?.tabs || {}
      }
    },
    mergedFields: merged?.fields || {},
    fieldsLocal: merged?.fieldsLocal || {},
    fieldsInSchemeMod: Boolean(merged?.fieldsInSchemeMod)
  };
}

function writeAwnDataStoreSchema(agentRoot, projectRoot, storeRel, options = {}) {
  const { store, storeAbs, storeRel: rel } = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
  if (store.kind === "group") {
    throw new Error("Record field schema is not supported for group stores");
  }

  const schemePath = path.join(storeAbs, SCHEME_MOD_FILE);
  let nextContent = "";

  if (typeof options.content === "string" && options.content.trim()) {
    nextContent = String(options.content).replace(/\r\n/g, "\n");
    extractRecordSchemaFromSchemeModContent(nextContent);
  } else {
    const awnSchema = options.awnSchema && typeof options.awnSchema === "object" ? options.awnSchema : null;
    const block = awnSchema?.record || awnSchema?.store || awnSchema?.element || null;
    const fields = normalizeAwnFieldsMap(
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

  fs.writeFileSync(schemePath, nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`, "utf-8");
  return readAwnDataStoreSchemaPayload(agentRoot, projectRoot, rel);
}

module.exports = {
  AWN_DATA_DIR,
  STORE_CONTRACT_FILE,
  STORE_MD_FILE,
  STORE_FILE,
  SCHEMA_FILE,
  SINGLETON_RECORD,
  COLLECTION_MANIFEST,
  SCHEME_MOD_FILE,
  getAwnDataRoot,
  loadAwnDataStores,
  getAwnDataPayload,
  resolveAwnDataReadRoot,
  buildRecordTree,
  normalizeStoreSlug,
  slugifyStoreName,
  ensureAwnDataBase,
  createAwnDataStore,
  createAwnDataRecord,
  buildStoreManifestContent,
  buildStoreMdContent,
  buildPlainManifestContent,
  writeStoreManifest,
  writeStoreSchemeMod,
  writeStoreContractBundle,
  composeAwnDataStoreSchemeModYaml,
  readStoreSchemeModOverlay,
  loadMergedStoreSchema,
  resolveAwnDataStoreContext,
  readAwnDataStoreSchemaPayload,
  writeAwnDataStoreSchema,
  normalizeExtendsRef,
  resolveKindFromSupertype,
  CONTAINER_SUPERTYPE,
  toAwnFieldKey,
  KIND_TO_AWN_PROP_TYPE
};
