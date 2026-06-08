const fs = require("fs");
const path = require("path");
const { listYamlFilesSync, loadYamlFileSync } = require("./awn-yaml-utils");

const FIELDS_ORDER_FILE = "order.yml";
const FIELD_DEF_FILE = "field-def.yml";
const LEGACY_FIELDS_DIR = "awn-fields";
const TYPES_FIELDS_DIR = path.join("awn-types", "fields");
const TYPES_COMPONENTS_DIR = path.join("awn-types", "components");
const TYPES_FIELD_DEF_FILE = path.join(TYPES_COMPONENTS_DIR, FIELD_DEF_FILE);
const LEGACY_TYPES_FIELD_DEF_FILE = path.join("awn-types", FIELD_DEF_FILE);

const MDBASE_STORAGE = {
  string: "string",
  text: "string",
  enum: "string",
  url: "string",
  datetime: "string",
  date: "string",
  color: "string",
  link: "string",
  integer: "number",
  number: "number",
  boolean: "bool",
  null: "null",
  list: "array"
};

const FALLBACK_FIELD_TYPES = {
  "awn.string": {
    id: "awn.string",
    name: "Текст",
    kind: "field",
    storage: "string",
    mdbase: "string",
    widget: "input",
    description: "Короткая строка"
  }
};

function resolveFieldStorage(parsed) {
  if (parsed?.storage) return String(parsed.storage).trim();
  const rawKind = String(parsed?.kind || "").trim();
  if (rawKind && rawKind !== "field") {
    return rawKind === "boolean" ? "bool" : rawKind;
  }
  const mdbase = String(parsed?.mdbase || "").trim();
  if (mdbase && MDBASE_STORAGE[mdbase]) return MDBASE_STORAGE[mdbase];
  return "string";
}

function resolveFieldTypeId(typeId) {
  const raw = String(typeId || "").trim();
  if (!raw) return "awn.string";
  if (raw.startsWith("awn.")) return raw;
  return `awn.${raw}`;
}

const FALLBACK_BASE_FIELD_ORDER = [
  "awn-type",
  "awn-name",
  "awn-create",
  "awn-update",
  "awn-description",
  "awn-status",
  "awn-category",
  "awn-tags",
  "awn-version",
  "awn-sort",
  "awn-preview"
];

function resolveFieldsContext(agentRoot = "", projectRoot = process.cwd()) {
  return {
    projectRoot: projectRoot || process.cwd(),
    agentRoot: String(agentRoot || "").trim()
  };
}

function resolveSystemFieldsDir(projectRoot) {
  const primary = path.join(projectRoot, TYPES_FIELDS_DIR);
  if (fs.existsSync(primary)) return primary;
  return path.join(projectRoot, LEGACY_FIELDS_DIR);
}

function resolveAgentFieldsDir(agentRoot) {
  if (!agentRoot) return "";
  return path.join(agentRoot, "awn-types", "fields");
}

function resolveFieldDefPath(projectRoot) {
  const candidates = [
    path.join(projectRoot, TYPES_FIELD_DEF_FILE),
    path.join(projectRoot, LEGACY_TYPES_FIELD_DEF_FILE),
    path.join(projectRoot, LEGACY_FIELDS_DIR, FIELD_DEF_FILE)
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(projectRoot, TYPES_FIELD_DEF_FILE);
}

function normalizeFieldTypeDef(parsed) {
  const rawId = String(parsed?.id || parsed?.name || "").trim();
  if (!rawId) return null;
  const id = resolveFieldTypeId(rawId);
  const name = String(parsed?.name || parsed?.label || id).trim();
  const field = {
    id,
    name,
    kind: "field",
    storage: resolveFieldStorage(parsed),
    mdbase: parsed.mdbase || id.replace(/^awn\./, ""),
    widget: parsed.widget || "input",
    description: parsed.description || ""
  };
  if (parsed.format) field.format = parsed.format;
  return field;
}

function loadFieldTypesFromDirectory(fieldsDir) {
  const registry = {};
  if (!fs.existsSync(fieldsDir)) return registry;

  for (const filePath of listYamlFilesSync(fieldsDir)) {
    const fileName = path.basename(filePath);
    if (fileName === FIELDS_ORDER_FILE) continue;

    const parsed = loadYamlFileSync(filePath, { idKey: "id", nameKey: "name" });
    const field = normalizeFieldTypeDef(parsed);
    if (field) registry[field.id] = field;
  }

  return registry;
}

function loadBaseFieldOrderFromDirectory(fieldsDir) {
  const orderPath = path.join(fieldsDir, FIELDS_ORDER_FILE);
  if (!fs.existsSync(orderPath)) {
    const legacyOrder = path.join(fieldsDir, "base-order.yml");
    if (!fs.existsSync(legacyOrder)) return null;
    const parsed = loadYamlFileSync(legacyOrder, { idKey: "name", nameKey: "name" });
    return Array.isArray(parsed.order)
      ? parsed.order.map((item) => String(item).trim()).filter(Boolean)
      : null;
  }
  const parsed = loadYamlFileSync(orderPath, { idKey: "name", nameKey: "name" });
  return Array.isArray(parsed.order) ? parsed.order.map((item) => String(item).trim()).filter(Boolean) : null;
}

function loadFieldDefSchema(projectRoot = process.cwd()) {
  const schemaPath = resolveFieldDefPath(projectRoot);
  if (!fs.existsSync(schemaPath)) return null;
  const parsed = loadYamlFileSync(schemaPath, { idKey: "id", nameKey: "name" });
  if (!parsed?.properties || typeof parsed.properties !== "object") return null;
  const id = String(parsed.id || parsed.name || "awn.field-def").trim();
  return {
    id,
    name: parsed.name || "Мета-свойства поля",
    description: parsed.description || "",
    properties: parsed.properties
  };
}

function loadAgentFields(agentRoot = "", projectRoot = process.cwd()) {
  const { projectRoot: root, agentRoot: agent } = resolveFieldsContext(agentRoot, projectRoot);
  const systemDir = resolveSystemFieldsDir(root);
  const agentDir = resolveAgentFieldsDir(agent);

  const registry = loadFieldTypesFromDirectory(systemDir);
  if (agentDir && fs.existsSync(agentDir)) {
    const agentRegistry = loadFieldTypesFromDirectory(agentDir);
    for (const [id, def] of Object.entries(agentRegistry)) {
      registry[id] = def;
    }
  }

  let baseFieldOrder = loadBaseFieldOrderFromDirectory(systemDir);
  if (agentDir && fs.existsSync(agentDir)) {
    const agentOrder = loadBaseFieldOrderFromDirectory(agentDir);
    if (agentOrder?.length) baseFieldOrder = agentOrder;
  }
  if (!baseFieldOrder?.length) baseFieldOrder = [...FALLBACK_BASE_FIELD_ORDER];

  const fieldDefSchema = loadFieldDefSchema(root);

  if (!Object.keys(registry).length) {
    return {
      fieldRegistry: { ...FALLBACK_FIELD_TYPES },
      baseFieldOrder,
      fieldDefSchema
    };
  }

  if (!registry["awn.string"]) {
    registry["awn.string"] = { ...FALLBACK_FIELD_TYPES["awn.string"] };
  }

  return { fieldRegistry: registry, baseFieldOrder, fieldDefSchema };
}

function getFieldRegistry(agentRoot = "", projectRoot = process.cwd()) {
  return loadAgentFields(agentRoot, projectRoot).fieldRegistry;
}

function getBaseFieldOrder(agentRoot = "", projectRoot = process.cwd()) {
  return loadAgentFields(agentRoot, projectRoot).baseFieldOrder;
}

function getFieldDefSchema(projectRoot = process.cwd()) {
  return loadFieldDefSchema(projectRoot);
}

module.exports = {
  loadAgentFields,
  getFieldRegistry,
  getBaseFieldOrder,
  getFieldDefSchema,
  loadFieldDefSchema,
  resolveFieldTypeId,
  resolveFieldStorage,
  FALLBACK_FIELD_TYPES,
  FALLBACK_BASE_FIELD_ORDER
};
