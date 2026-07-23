const fs = require("fs");
const path = require("path");
const { getManifestContainerDirRel } = require("./manifest-paths");
const { AGENT_SYSTEM_REL } = require("./platform-sources");
const { parseTypeYaml } = require("./awn-yaml-utils");
const {
  normalizeAwnSchema,
  stringifyAwnSchemaYaml,
  extractAwnSchemaFromConfig,
  AWN_SCHEMA_TARGETS,
  emptyAwnSchema
} = require("./awn-types-loader");

const CONFIGURATION_SCHEMA_FILE = "configuration-schema.yml";
const CORE_CONFIGURATION_SCHEMA_REL = `${AGENT_SYSTEM_REL}/${CONFIGURATION_SCHEMA_FILE}`;
const WORKSPACE_CONFIGURATION_SCHEMA_REL = CONFIGURATION_SCHEMA_FILE;

function resolveAgentRootAbsolute(agentRoot) {
  const raw = String(agentRoot || "").trim();
  if (!raw) return "";
  return path.isAbsolute(raw) ? raw : path.resolve(raw);
}

function isConfigurationSchemaRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  return (
    normalized === WORKSPACE_CONFIGURATION_SCHEMA_REL ||
    normalized === CORE_CONFIGURATION_SCHEMA_REL ||
    normalized.endsWith(`/${CONFIGURATION_SCHEMA_FILE}`)
  );
}

function resolveConfigurationSchemaAbsolute(agentRoot, relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot);
  if (!agentRootAbs || !normalized) return null;

  if (normalized === WORKSPACE_CONFIGURATION_SCHEMA_REL) {
    return path.join(agentRootAbs, CONFIGURATION_SCHEMA_FILE);
  }
  if (normalized === CORE_CONFIGURATION_SCHEMA_REL) {
    return path.join(agentRootAbs, CORE_CONFIGURATION_SCHEMA_REL);
  }
  if (normalized.endsWith(`/${CONFIGURATION_SCHEMA_FILE}`) && !normalized.includes("..")) {
    const absolute = path.join(agentRootAbs, normalized);
    if (!absolute.startsWith(agentRootAbs)) return null;
    return absolute;
  }
  return null;
}

function toTopicConfigurationSchemaRel(manifestRel) {
  const containerDir = getManifestContainerDirRel(manifestRel);
  if (!containerDir) return "";
  return path.join(containerDir, CONFIGURATION_SCHEMA_FILE).replace(/\\/g, "/");
}

function readTextFile(absolute) {
  try {
    return fs.readFileSync(absolute, "utf-8");
  } catch {
    return "";
  }
}

function extractAwnSchemaFromConfigurationSchemaContent(content) {
  if (!String(content || "").trim()) return null;
  try {
    const parsed = parseTypeYaml(content);
    if (parsed?.awn_schema && typeof parsed.awn_schema === "object") {
      return normalizeAwnSchema(parsed.awn_schema);
    }
  } catch {
    return null;
  }
  return null;
}

function topicSchemaHasFields(awnSchema) {
  const normalized = normalizeAwnSchema(awnSchema);
  return AWN_SCHEMA_TARGETS.some((target) => Object.keys(normalized[target]?.fields || {}).length > 0);
}

function mergeAwnSchemaLayers(...layers) {
  const result = emptyAwnSchema();
  for (const layer of layers) {
    if (!layer) continue;
    const normalized = normalizeAwnSchema(layer);
    for (const target of AWN_SCHEMA_TARGETS) {
      const fields = normalized[target]?.fields || {};
      if (!Object.keys(fields).length) continue;
      result[target].fields = { ...result[target].fields, ...fields };
    }
  }
  return result;
}

function readWorkspaceLayerAwnSchema(agentRoot) {
  const absolute = resolveConfigurationSchemaAbsolute(agentRoot, WORKSPACE_CONFIGURATION_SCHEMA_REL);
  if (!absolute || !fs.existsSync(absolute)) return null;
  return extractAwnSchemaFromConfigurationSchemaContent(readTextFile(absolute));
}

function readTopicConfigurationSchemaFile(manifestRel, agentRoot) {
  const schemaRel = toTopicConfigurationSchemaRel(manifestRel);
  if (!schemaRel) return null;
  const absolute = resolveConfigurationSchemaAbsolute(agentRoot, schemaRel);
  if (!absolute || !fs.existsSync(absolute)) return null;
  return extractAwnSchemaFromConfigurationSchemaContent(readTextFile(absolute));
}

function readTopicOnlyAwnSchema(manifestRel, agentRoot, configContent = "") {
  const topicFromFile = readTopicConfigurationSchemaFile(manifestRel, agentRoot);
  if (topicFromFile) return normalizeAwnSchema(topicFromFile);
  return extractAwnSchemaFromConfig(configContent);
}

function readEffectiveTopicAwnSchema(manifestRel, agentRoot, configContent = "") {
  return mergeAwnSchemaLayers(
    readWorkspaceLayerAwnSchema(agentRoot),
    readTopicOnlyAwnSchema(manifestRel, agentRoot, configContent)
  );
}

/** @deprecated use readEffectiveTopicAwnSchema or readTopicOnlyAwnSchema */
function readTopicLayerAwnSchema(manifestRel, agentRoot, configContent = "") {
  return readEffectiveTopicAwnSchema(manifestRel, agentRoot, configContent);
}

function composeTopicConfigurationSchemaYaml(awnSchema) {
  const schemaYaml = stringifyAwnSchemaYaml(awnSchema);
  if (!String(schemaYaml || "").trim()) return "";
  return ["version: 1", "layer: topic", "", schemaYaml, ""].join("\n");
}

async function writeTopicConfigurationSchema(manifestRel, awnSchema, writeFileFn, removeFileFn) {
  const schemaRel = toTopicConfigurationSchemaRel(manifestRel);
  if (!schemaRel) throw new Error("Invalid topic path");
  const content = composeTopicConfigurationSchemaYaml(awnSchema);
  if (content.trim()) {
    await writeFileFn(manifestRel, schemaRel, content);
    return { schemaRel, exists: true, content };
  }
  await removeFileFn(schemaRel);
  return { schemaRel, exists: false, content: "" };
}

module.exports = {
  CONFIGURATION_SCHEMA_FILE,
  CORE_CONFIGURATION_SCHEMA_REL,
  WORKSPACE_CONFIGURATION_SCHEMA_REL,
  isConfigurationSchemaRelPath,
  resolveConfigurationSchemaAbsolute,
  toTopicConfigurationSchemaRel,
  extractAwnSchemaFromConfigurationSchemaContent,
  readTopicOnlyAwnSchema,
  readEffectiveTopicAwnSchema,
  readWorkspaceLayerAwnSchema,
  composeTopicConfigurationSchemaYaml,
  writeTopicConfigurationSchema
};
