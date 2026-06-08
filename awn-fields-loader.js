const fs = require("fs");
const path = require("path");
const { listYamlFilesSync, loadYamlFileSync } = require("./awn-yaml-utils");

const BASE_ORDER_FILE = "base-order.yml";

const FALLBACK_FIELD_TYPES = {
  string: {
    id: "string",
    label: "Текст",
    kind: "string",
    mdbase: "string",
    widget: "input",
    description: "Короткая строка"
  }
};

const FALLBACK_BASE_FIELD_ORDER = [
  "awn-type",
  "awn-name",
  "awn-create",
  "awn-update",
  "awn-description",
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

function normalizeFieldTypeDef(parsed) {
  const id = String(parsed?.id || "").trim();
  if (!id) return null;
  const field = {
    id,
    label: parsed.label || id,
    kind: parsed.kind || "string",
    mdbase: parsed.mdbase || id,
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
    if (fileName === BASE_ORDER_FILE) continue;

    const parsed = loadYamlFileSync(filePath, { idKey: "id", nameKey: "id" });
    const field = normalizeFieldTypeDef(parsed);
    if (field) registry[field.id] = field;
  }

  return registry;
}

function loadBaseFieldOrderFromDirectory(fieldsDir) {
  const orderPath = path.join(fieldsDir, BASE_ORDER_FILE);
  if (!fs.existsSync(orderPath)) return null;
  const parsed = loadYamlFileSync(orderPath, { idKey: "name", nameKey: "name" });
  return Array.isArray(parsed.order) ? parsed.order.map((item) => String(item).trim()).filter(Boolean) : null;
}

function loadAgentFields(agentRoot = "", projectRoot = process.cwd()) {
  const { projectRoot: root, agentRoot: agent } = resolveFieldsContext(agentRoot, projectRoot);
  const systemDir = path.join(root, "awn-fields");
  const agentDir = agent ? path.join(agent, "awn-fields") : "";

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

  if (!Object.keys(registry).length) {
    return {
      fieldRegistry: { ...FALLBACK_FIELD_TYPES },
      baseFieldOrder
    };
  }

  if (!registry.string) {
    registry.string = { ...FALLBACK_FIELD_TYPES.string };
  }

  return { fieldRegistry: registry, baseFieldOrder };
}

function getFieldRegistry(agentRoot = "", projectRoot = process.cwd()) {
  return loadAgentFields(agentRoot, projectRoot).fieldRegistry;
}

function getBaseFieldOrder(agentRoot = "", projectRoot = process.cwd()) {
  return loadAgentFields(agentRoot, projectRoot).baseFieldOrder;
}

module.exports = {
  loadAgentFields,
  getFieldRegistry,
  getBaseFieldOrder,
  FALLBACK_FIELD_TYPES,
  FALLBACK_BASE_FIELD_ORDER
};
