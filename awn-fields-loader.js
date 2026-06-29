const fs = require("fs");
const path = require("path");
const {
  getActiveComponents,
  loadFieldDefFromComponents
} = require("./components-loader");
const {
  resolveFieldTypeId,
  isEnumFieldTypeId,
  isArrayFieldTypeId
} = require("./awn-enum-options");

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
  const typeId = resolveFieldTypeId(parsed?.id || "");
  if (isArrayFieldTypeId(typeId)) return "array";
  return "string";
}

function resolveFieldsContext(agentRoot = "", projectRoot = process.cwd()) {
  return {
    projectRoot: projectRoot || process.cwd(),
    agentRoot: String(agentRoot || "").trim()
  };
}

function normalizeFieldTypeDef(schema, component) {
  const rawId = String(schema?.id || component?.runtimeId || "").trim();
  if (!rawId) return null;
  const id = resolveFieldTypeId(rawId);
  const name = String(schema?.name || component?.name || id).trim();
  const field = {
    id,
    name,
    kind: "field",
    storage: resolveFieldStorage(schema),
    mdbase: schema?.mdbase || id.replace(/^awn\./, ""),
    widget: schema?.widget || "input",
    description: schema?.description || component?.description || "",
    componentId: component?.id || null
  };
  if (schema?.format) field.format = schema.format;
  if (Array.isArray(schema?.settings)) {
    field.settings = schema.settings.map((item) => String(item).trim()).filter(Boolean);
  } else {
    const idSuffix = id.replace(/^awn\./, "");
    if (isEnumFieldTypeId(id)) field.settings = [...DEFAULT_FIELD_SETTINGS, "widget", "enum"];
    else if (isArrayFieldTypeId(id)) field.settings = [...DEFAULT_FIELD_SETTINGS, "widget", "enum"];
    else if (idSuffix === "null") field.settings = ["description", "hint", "locked"];
    else field.settings = [...DEFAULT_FIELD_SETTINGS];
  }
  return field;
}

function loadFieldsFromComponents(projectRoot, agentRoot) {
  const registry = {};
  const components = getActiveComponents(projectRoot, agentRoot, "field");

  for (const component of components) {
    if (component.id.endsWith("/_base")) continue;
    const schema = component.mergedSchema || component.schema || {};
    const field = normalizeFieldTypeDef(schema, component);
    if (field) registry[field.id] = field;
  }

  return registry;
}

function loadAgentFields(agentRoot = "", projectRoot = process.cwd()) {
  const { projectRoot: root, agentRoot: agent } = resolveFieldsContext(agentRoot, projectRoot);
  const registry = loadFieldsFromComponents(root, agent);
  const fieldDefSchema = loadFieldDefFromComponents(root, agent);

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

function getFieldDefSchema(projectRoot = process.cwd(), agentRoot = "") {
  return loadFieldDefFromComponents(projectRoot, agentRoot);
}

module.exports = {
  loadAgentFields,
  getFieldRegistry,
  getFieldDefSchema,
  resolveFieldTypeId,
  resolveFieldStorage,
  FALLBACK_FIELD_TYPES
};
