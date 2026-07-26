const fs = require("fs");
const path = require("path");
const { getManifestContainerDirRel, isAreaManifestRelPath, isManifestMdRelPath } = require("./manifest-paths");
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

function readNodeOnlyAwnSchema(manifestRel, agentRoot, configContent = "") {
  const topicFromFile = readTopicConfigurationSchemaFile(manifestRel, agentRoot);
  if (topicFromFile) return normalizeAwnSchema(topicFromFile);
  return extractAwnSchemaFromConfig(configContent);
}

/** @deprecated alias */
function readTopicOnlyAwnSchema(manifestRel, agentRoot, configContent = "") {
  return readNodeOnlyAwnSchema(manifestRel, agentRoot, configContent);
}

function resolveAreaManifestRelForNode(manifestRel) {
  const normalized = String(manifestRel || "").replace(/\\/g, "/");
  if (!isManifestMdRelPath(normalized) || isAreaManifestRelPath(normalized)) return null;
  let dir = path.posix.dirname(normalized);
  while (dir && dir !== ".") {
    const candidate = `${dir}/manifest.md`;
    if (candidate !== normalized && isAreaManifestRelPath(candidate)) return candidate;
    dir = path.posix.dirname(dir);
  }
  return null;
}

function readEffectiveTopicAwnSchema(manifestRel, agentRoot, configContent = "") {
  const normalized = String(manifestRel || "").replace(/\\/g, "/");
  const workspaceLayer = readWorkspaceLayerAwnSchema(agentRoot);
  if (isAreaManifestRelPath(normalized)) {
    return mergeAwnSchemaLayers(workspaceLayer, readNodeOnlyAwnSchema(manifestRel, agentRoot, configContent));
  }
  const areaManifestRel = resolveAreaManifestRelForNode(normalized);
  return mergeAwnSchemaLayers(
    workspaceLayer,
    areaManifestRel ? readNodeOnlyAwnSchema(areaManifestRel, agentRoot) : null,
    readNodeOnlyAwnSchema(manifestRel, agentRoot, configContent)
  );
}

/** @deprecated use readEffectiveTopicAwnSchema or readTopicOnlyAwnSchema */
function readTopicLayerAwnSchema(manifestRel, agentRoot, configContent = "") {
  return readEffectiveTopicAwnSchema(manifestRel, agentRoot, configContent);
}

function composeTopicConfigurationSchemaYaml(awnSchema) {
  return composeConfigurationSchemaYaml(awnSchema, "topic");
}

function composeWorkspaceConfigurationSchemaYaml(awnSchema) {
  return composeConfigurationSchemaYaml(awnSchema, "workspace");
}

function composeConfigurationSchemaYaml(awnSchema, layer = "topic") {
  const schemaYaml = stringifyAwnSchemaYaml(awnSchema);
  if (!String(schemaYaml || "").trim()) return "";
  return ["version: 1", `layer: ${layer}`, "", schemaYaml, ""].join("\n");
}

function composeAreaConfigurationSchemaYaml(awnSchema) {
  return composeConfigurationSchemaYaml(awnSchema, "area");
}

function getEffectiveTopicSchemaPayload(manifestRel, agentRoot, projectRoot, configContent = "") {
  const effectiveSchema = readEffectiveTopicAwnSchema(manifestRel, agentRoot, configContent);
  const normalized = String(manifestRel || "").replace(/\\/g, "/");
  const topicAwnSchema = isAreaManifestRelPath(normalized)
    ? emptyAwnSchema()
    : readNodeOnlyAwnSchema(manifestRel, agentRoot, configContent);
  const areaManifestRel = isAreaManifestRelPath(normalized)
    ? normalized
    : resolveAreaManifestRelForNode(normalized);
  const areaAwnSchema = areaManifestRel
    ? readNodeOnlyAwnSchema(areaManifestRel, agentRoot)
    : emptyAwnSchema();
  const workspaceAwnSchema = readWorkspaceLayerAwnSchema(agentRoot);
  const { getTopicSchemaPayload } = require("./awn-types-loader");
  const payload = getTopicSchemaPayload(configContent, agentRoot, projectRoot, {
    awnSchema: effectiveSchema
  });
  return {
    ...payload,
    topicAwnSchema,
    areaAwnSchema,
    workspaceAwnSchema
  };
}

function getWorkspaceSchemaPayloadFull(agentRoot, projectRoot) {
  const { getWorkspaceSchemaPayload } = require("./awn-types-loader");
  const workspaceAwnSchema = readWorkspaceLayerAwnSchema(agentRoot);
  const payload = getWorkspaceSchemaPayload(agentRoot, projectRoot);
  return {
    ...payload,
    workspaceAwnSchema
  };
}

async function writeWorkspaceConfigurationSchema(awnSchema, writeFileFn, removeFileFn) {
  const content = composeWorkspaceConfigurationSchemaYaml(awnSchema);
  const schemaRel = WORKSPACE_CONFIGURATION_SCHEMA_REL;
  if (content.trim()) {
    await writeFileFn(schemaRel, schemaRel, content);
    return { schemaRel, exists: true, content };
  }
  await removeFileFn(schemaRel);
  return { schemaRel, exists: false, content: "" };
}

async function writeTopicConfigurationSchema(manifestRel, awnSchema, writeFileFn, removeFileFn) {
  const schemaRel = toTopicConfigurationSchemaRel(manifestRel);
  if (!schemaRel) throw new Error("Invalid topic path");
  const normalized = String(manifestRel || "").replace(/\\/g, "/");
  const content = isAreaManifestRelPath(normalized)
    ? composeAreaConfigurationSchemaYaml(awnSchema)
    : composeTopicConfigurationSchemaYaml(awnSchema);
  if (content.trim()) {
    await writeFileFn(manifestRel, schemaRel, content);
    return { schemaRel, exists: true, content };
  }
  await removeFileFn(schemaRel);
  return { schemaRel, exists: false, content: "" };
}

function readNodeHasOwnSchemaLayer(manifestRel, agentRoot, configContent = "") {
  return topicSchemaHasFields(readNodeOnlyAwnSchema(manifestRel, agentRoot, configContent));
}

module.exports = {
  CONFIGURATION_SCHEMA_FILE,
  CORE_CONFIGURATION_SCHEMA_REL,
  WORKSPACE_CONFIGURATION_SCHEMA_REL,
  isConfigurationSchemaRelPath,
  resolveConfigurationSchemaAbsolute,
  toTopicConfigurationSchemaRel,
  extractAwnSchemaFromConfigurationSchemaContent,
  mergeAwnSchemaLayers,
  readTopicOnlyAwnSchema,
  readEffectiveTopicAwnSchema,
  readWorkspaceLayerAwnSchema,
  composeTopicConfigurationSchemaYaml,
  composeWorkspaceConfigurationSchemaYaml,
  composeAreaConfigurationSchemaYaml,
  readNodeOnlyAwnSchema,
  resolveAreaManifestRelForNode,
  topicSchemaHasFields,
  getEffectiveTopicSchemaPayload,
  getWorkspaceSchemaPayloadFull,
  writeTopicConfigurationSchema,
  writeWorkspaceConfigurationSchema,
  readNodeHasOwnSchemaLayer
};
