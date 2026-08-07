const fs = require("fs");
const path = require("path");
const {
  getManifestContainerDirRel,
  isAreaLevelManifestRelPath,
  isManifestMdRelPath
} = require("./manifest-paths");
const { getCmsConfigRel, AGENT_SYSTEM_FOLDER } = require("./platform-sources");
const { parseTypeYaml } = require("./awn-yaml-utils");
const {
  normalizeAwnSchema,
  stringifyAwnSchemaYaml,
  extractAwnSchemaFromConfig,
  AWN_SCHEMA_TARGETS,
  emptyAwnSchema
} = require("./awn-types-loader");

const SCHEMA_MOD_FILE = "scheme-mod.yml";
const LEGACY_SHEMAMOD_FILE = "shemamod.yml";
const LEGACY_CONFIGURATION_SCHEMA_FILE = "configuration-schema.yml";
/** @deprecated use SCHEMA_MOD_FILE */
const CONFIGURATION_SCHEMA_FILE = SCHEMA_MOD_FILE;
const CORE_CONFIGURATION_SCHEMA_REL = `${AGENT_SYSTEM_FOLDER}/${SCHEMA_MOD_FILE}`;
const WORKSPACE_CONFIGURATION_SCHEMA_REL = SCHEMA_MOD_FILE;

function isSchemaModFileName(name) {
  const lower = String(name || "").toLowerCase();
  return (
    lower === SCHEMA_MOD_FILE.toLowerCase() ||
    lower === LEGACY_SHEMAMOD_FILE.toLowerCase() ||
    lower === LEGACY_CONFIGURATION_SCHEMA_FILE.toLowerCase()
  );
}

function resolveAgentRootAbsolute(agentRoot) {
  const raw = String(agentRoot || "").trim();
  if (!raw) return "";
  return path.isAbsolute(raw) ? raw : path.resolve(raw);
}

function getCoreConfigurationSchemaRel(agentRoot) {
  return `${getCmsConfigRel(agentRoot)}/${SCHEMA_MOD_FILE}`;
}

function isConfigurationSchemaRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  return (
    normalized === WORKSPACE_CONFIGURATION_SCHEMA_REL ||
    normalized === LEGACY_CONFIGURATION_SCHEMA_FILE ||
    isSchemaModFileName(path.posix.basename(normalized))
  );
}

function resolveConfigurationSchemaAbsolute(agentRoot, relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot);
  if (!agentRootAbs || !normalized) return null;

  if (normalized === WORKSPACE_CONFIGURATION_SCHEMA_REL || normalized === LEGACY_CONFIGURATION_SCHEMA_FILE) {
    return path.join(agentRootAbs, normalized);
  }
  const coreRel = getCoreConfigurationSchemaRel(agentRootAbs);
  if (normalized === coreRel) {
    return path.join(agentRootAbs, coreRel);
  }
  if (isSchemaModFileName(path.posix.basename(normalized)) && !normalized.includes("..")) {
    const absolute = path.join(agentRootAbs, normalized);
    if (!absolute.startsWith(agentRootAbs)) return null;
    return absolute;
  }
  return null;
}

function toTopicConfigurationSchemaRel(manifestRel) {
  const containerDir = getManifestContainerDirRel(manifestRel);
  if (!containerDir) return "";
  return path.join(containerDir, SCHEMA_MOD_FILE).replace(/\\/g, "/");
}

function listSchemaModRelCandidates(containerDirRel) {
  const dir = String(containerDirRel || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!dir) {
    return [
      WORKSPACE_CONFIGURATION_SCHEMA_REL,
      LEGACY_SHEMAMOD_FILE,
      LEGACY_CONFIGURATION_SCHEMA_FILE
    ];
  }
  return [
    `${dir}/${SCHEMA_MOD_FILE}`,
    `${dir}/${LEGACY_SHEMAMOD_FILE}`,
    `${dir}/${LEGACY_CONFIGURATION_SCHEMA_FILE}`
  ];
}

function readSchemaModFromContainerDir(manifestRel, agentRoot) {
  const containerDir = getManifestContainerDirRel(manifestRel);
  if (!containerDir) return null;
  for (const rel of listSchemaModRelCandidates(containerDir)) {
    const absolute = resolveConfigurationSchemaAbsolute(agentRoot, rel);
    if (!absolute || !fs.existsSync(absolute)) continue;
    const schema = extractAwnSchemaFromConfigurationSchemaContent(readTextFile(absolute));
    if (schema) return schema;
  }
  return null;
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
  for (const rel of listSchemaModRelCandidates("")) {
    const absolute = resolveConfigurationSchemaAbsolute(agentRoot, rel);
    if (!absolute || !fs.existsSync(absolute)) continue;
    const schema = extractAwnSchemaFromConfigurationSchemaContent(readTextFile(absolute));
    if (schema) return schema;
  }
  return null;
}

function readTopicConfigurationSchemaFile(manifestRel, agentRoot) {
  return readSchemaModFromContainerDir(manifestRel, agentRoot);
}

function readNodeOnlyAwnSchema(manifestRel, agentRoot, configContent = "") {
  const topicFromFile = readTopicConfigurationSchemaFile(manifestRel, agentRoot);
  if (topicFromFile) return normalizeAwnSchema(topicFromFile);
  return emptyAwnSchema();
}

/** @deprecated alias */
function readTopicOnlyAwnSchema(manifestRel, agentRoot, configContent = "") {
  return readNodeOnlyAwnSchema(manifestRel, agentRoot, configContent);
}

function resolveAreaManifestRelForNode(manifestRel) {
  const normalized = String(manifestRel || "").replace(/\\/g, "/");
  if (!isManifestMdRelPath(normalized) || isAreaLevelManifestRelPath(normalized)) return null;
  let dir = path.posix.dirname(normalized);
  while (dir && dir !== ".") {
    const candidate = `${dir}/manifest.md`;
    if (candidate !== normalized && isAreaLevelManifestRelPath(candidate)) return candidate;
    dir = path.posix.dirname(dir);
  }
  return null;
}

function readEffectiveTopicAwnSchema(manifestRel, agentRoot, configContent = "") {
  const normalized = String(manifestRel || "").replace(/\\/g, "/");
  const workspaceLayer = readWorkspaceLayerAwnSchema(agentRoot);
  if (isAreaLevelManifestRelPath(normalized)) {
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

function composeSectionConfigurationSchemaYaml(awnSchema) {
  return composeConfigurationSchemaYaml(awnSchema, "section");
}

function getEffectiveTopicSchemaPayload(manifestRel, agentRoot, projectRoot, configContent = "") {
  const effectiveSchema = readEffectiveTopicAwnSchema(manifestRel, agentRoot, configContent);
  const normalized = String(manifestRel || "").replace(/\\/g, "/");
  const topicAwnSchema = isAreaLevelManifestRelPath(normalized)
    ? emptyAwnSchema()
    : readNodeOnlyAwnSchema(manifestRel, agentRoot, configContent);
  const areaManifestRel = isAreaLevelManifestRelPath(normalized)
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
  const content = isAreaLevelManifestRelPath(normalized)
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
  SCHEMA_MOD_FILE,
  LEGACY_CONFIGURATION_SCHEMA_FILE,
  CONFIGURATION_SCHEMA_FILE,
  CORE_CONFIGURATION_SCHEMA_REL,
  WORKSPACE_CONFIGURATION_SCHEMA_REL,
  isConfigurationSchemaRelPath,
  isSchemaModFileName,
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
  composeSectionConfigurationSchemaYaml,
  composeConfigurationSchemaYaml,
  readNodeOnlyAwnSchema,
  resolveAreaManifestRelForNode,
  topicSchemaHasFields,
  getEffectiveTopicSchemaPayload,
  getWorkspaceSchemaPayloadFull,
  writeTopicConfigurationSchema,
  writeWorkspaceConfigurationSchema,
  readNodeHasOwnSchemaLayer
};
