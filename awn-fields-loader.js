const fs = require("fs");
const path = require("path");
const { listYamlFilesSync, loadYamlFileSync } = require("./awn-yaml-utils");

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

const DEFAULT_FIELD_SETTINGS = [
  "description",
  "hint",
  "required",
  "locked",
  "format",
  "default"
];

const FALLBACK_FIELD_TYPES = {
  "awn.string": {
    id: "awn.string",
    name: "Текст",
    kind: "field",
    storage: "string",
    mdbase: "string",
    widget: "input",
    description: "Короткая строка",
    settings: [...DEFAULT_FIELD_SETTINGS]
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
  if (Array.isArray(parsed.settings)) {
    field.settings = parsed.settings.map((item) => String(item).trim()).filter(Boolean);
  } else {
    const idSuffix = id.replace(/^awn\./, "");
    if (idSuffix === "enum") field.settings = [...DEFAULT_FIELD_SETTINGS, "enum"];
    else if (idSuffix === "array") field.settings = [...DEFAULT_FIELD_SETTINGS, "items"];
    else if (idSuffix === "null") field.settings = ["description", "hint", "locked"];
    else field.settings = [...DEFAULT_FIELD_SETTINGS];
  }
  return field;
}

function loadFieldTypesFromDirectory(fieldsDir) {
  const registry = {};
  if (!fs.existsSync(fieldsDir)) return registry;

  for (const filePath of listYamlFilesSync(fieldsDir)) {
    const parsed = loadYamlFileSync(filePath, { idKey: "id", nameKey: "name" });
    const field = normalizeFieldTypeDef(parsed);
    if (field) registry[field.id] = field;
  }

  return registry;
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

  const fieldDefSchema = loadFieldDefSchema(root);

  if (!Object.keys(registry).length) {
    return {
      fieldRegistry: { ...FALLBACK_FIELD_TYPES },
      fieldDefSchema
    };
  }

  if (!registry["awn.string"]) {
    registry["awn.string"] = { ...FALLBACK_FIELD_TYPES["awn.string"] };
  }

  return { fieldRegistry: registry, fieldDefSchema };
}

function getFieldRegistry(agentRoot = "", projectRoot = process.cwd()) {
  return loadAgentFields(agentRoot, projectRoot).fieldRegistry;
}

function getFieldDefSchema(projectRoot = process.cwd()) {
  return loadFieldDefSchema(projectRoot);
}

module.exports = {
  loadAgentFields,
  getFieldRegistry,
  getFieldDefSchema,
  loadFieldDefSchema,
  resolveFieldTypeId,
  resolveFieldStorage,
  FALLBACK_FIELD_TYPES
};
