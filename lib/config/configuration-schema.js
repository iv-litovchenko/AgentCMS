const fs = require("fs");
const path = require("path");
const {
  getManifestContainerDirRel,
  isAreaLevelManifestRelPath,
  isManifestMdRelPath
} = require("./manifest-paths");
const { getCmsConfigRel, AGENT_SYSTEM_FOLDER } = require("../platform/platform-sources");
const { parseTypeYaml } = require("../awn/awn-yaml-utils");
const {
  normalizeAwnSchema,
  stringifyAwnSchemaYaml,
  extractAwnSchemaFromConfig,
  AWN_SCHEMA_TARGETS,
  emptyAwnSchema
} = require("../awn/awn-types-loader");

const {
  SCHEMA_MOD_FILE,
  LEGACY_SCHEMA_MOD_FILE,
  LEGACY_SCHEME_MOD_FILE,
  LEGACY_SHEMAMOD_FILE,
  LEGACY_CONFIGURATION_SCHEMA_FILE,
  isSchemaModFileName
} = require("./schema-mod-paths");
/** @deprecated use SCHEMA_MOD_FILE */
const CONFIGURATION_SCHEMA_FILE = SCHEMA_MOD_FILE;
const CORE_CONFIGURATION_SCHEMA_REL = `${AGENT_SYSTEM_FOLDER}/${SCHEMA_MOD_FILE}`;
const WORKSPACE_CONFIGURATION_SCHEMA_REL = SCHEMA_MOD_FILE;

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
      LEGACY_SCHEMA_MOD_FILE,
      LEGACY_SCHEME_MOD_FILE,
      LEGACY_SHEMAMOD_FILE,
      LEGACY_CONFIGURATION_SCHEMA_FILE
    ];
  }
  return [
    `${dir}/${SCHEMA_MOD_FILE}`,
    `${dir}/${LEGACY_SCHEMA_MOD_FILE}`,
    `${dir}/${LEGACY_SCHEME_MOD_FILE}`,
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

/** Schema override from this node only (no ws/area/topic stacking). */
function readContextOwnAwnSchema(manifestRel, agentRoot, configContent = "") {
  return readNodeOnlyAwnSchema(manifestRel, agentRoot, configContent);
}

function readEffectiveTopicAwnSchema(manifestRel, agentRoot, configContent = "") {
  return readContextOwnAwnSchema(manifestRel, agentRoot, configContent);
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
  const contextSchema = readContextOwnAwnSchema(manifestRel, agentRoot, configContent);
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
  const { getTopicSchemaPayload } = require("../awn/awn-types-loader");
  const payload = getTopicSchemaPayload(configContent, agentRoot, projectRoot, {
    awnSchema: contextSchema
  });
  return {
    ...payload,
    topicAwnSchema,
    areaAwnSchema,
    workspaceAwnSchema
  };
}

function getWorkspaceSchemaPayloadFull(agentRoot, projectRoot) {
  const { getWorkspaceSchemaPayload } = require("../awn/awn-types-loader");
  const workspaceAwnSchema = readWorkspaceLayerAwnSchema(agentRoot);
  const payload = getWorkspaceSchemaPayload(agentRoot, projectRoot);
  return {
    ...payload,
    workspaceAwnSchema
  };
}

/** Strip empty target blocks — only blocks with custom fields. */
function compactAwnSchema(awnSchema) {
  const normalized = normalizeAwnSchema(awnSchema);
  const result = {};
  for (const target of AWN_SCHEMA_TARGETS) {
    const fields = normalized[target]?.fields || {};
    if (Object.keys(fields).length > 0) {
      result[target] = { fields: { ...fields } };
    }
  }
  return result;
}

function resolveSchemaLayerNameForTarget(target) {
  if (target === "workspace") return "workspace";
  if (target === "area") return "area";
  if (target === "section") return "section";
  return "topic";
}

function collectLayeredCustomFields(layers, target) {
  const layerName = resolveSchemaLayerNameForTarget(target);
  const layerFields = layers?.[layerName]?.[target]?.fields;
  if (layerFields && typeof layerFields === "object") {
    return { ...layerFields };
  }
  if (layerName !== "section") {
    const sectionFields = layers?.section?.[target]?.fields;
    if (sectionFields && typeof sectionFields === "object") {
      return { ...sectionFields };
    }
  }
  return {};
}

/** Per-page response: schema.yml layers only. Base types live in awn-system / get_type. */
function buildLayeredTopicSchemaResponse(meta, payload) {
  const layers = {
    workspace: compactAwnSchema(payload?.workspaceAwnSchema),
    area: compactAwnSchema(payload?.areaAwnSchema),
    topic: compactAwnSchema(payload?.topicAwnSchema)
  };
  if (payload?.sectionAwnSchema) {
    layers.section = compactAwnSchema(payload.sectionAwnSchema);
  }
  const result = {
    path: meta?.path || null,
    contentPath: meta?.contentPath || null,
    schemaPath: meta?.schemaPath || null,
    schemaExists: Boolean(meta?.schemaExists),
    mode: "layers",
    layers
  };
  if (Array.isArray(payload?.sectionChain) && payload.sectionChain.length) {
    result.sectionChain = payload.sectionChain;
  }
  if (payload?.awnSchema) {
    result.contextSchema = compactAwnSchema(payload.awnSchema);
  }
  return result;
}

function buildLayeredTopicSchemaWriteResponse(manifestRel, writeResult, schemaPayload) {
  return {
    ok: true,
    ...buildLayeredTopicSchemaResponse(
      {
        path: manifestRel,
        schemaPath: writeResult?.schemaRel || null,
        schemaExists: writeResult?.exists
      },
      schemaPayload
    ),
    content: writeResult?.content || ""
  };
}

function buildLayeredWorkspaceSchemaResponse(meta, workspaceAwnSchema) {
  return {
    path: meta?.path || null,
    schemaPath: meta?.schemaPath || null,
    schemaExists: Boolean(meta?.schemaExists),
    mode: "layers",
    layers: {
      workspace: compactAwnSchema(workspaceAwnSchema)
    }
  };
}

/** layers | overlay (alias) = compact layers; full = legacy UI dump with baseTypes/merged/fieldRegistry. */
function slimTopicSchemaResponse(payload, options = {}) {
  const mode = String(options.mode || "layers").trim().toLowerCase();
  if (mode === "full") return payload;

  const result = buildLayeredTopicSchemaResponse(
    {
      path: payload?.path,
      contentPath: payload?.contentPath,
      schemaPath: payload?.schemaPath,
      schemaExists: payload?.schemaExists
    },
    payload
  );

  const target = String(options.target || "").trim();
  if (target) {
    result.target = target;
    result.fields = collectLayeredCustomFields(result.layers, target);
  }

  return result;
}

function slimTopicSchemaWriteResponse(manifestRel, writeResult, schemaPayload) {
  return buildLayeredTopicSchemaWriteResponse(manifestRel, writeResult, schemaPayload);
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

function countAwnSchemaFields(awnSchema) {
  const normalized = normalizeAwnSchema(awnSchema);
  let count = 0;
  for (const target of AWN_SCHEMA_TARGETS) {
    count += Object.keys(normalized[target]?.fields || {}).length;
  }
  return count;
}

function resolveSchemaModStatusForManifest(manifestRel, agentRoot) {
  const normalized = String(manifestRel || "").replace(/\\/g, "/").trim();
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot);
  if (!agentRootAbs || !normalized) {
    return {
      schemaPath: "",
      schemaExists: false,
      schemaFieldCount: 0,
      hasLocalSchema: false
    };
  }

  const containerDir = getManifestContainerDirRel(normalized);
  for (const rel of listSchemaModRelCandidates(containerDir || "")) {
    const absolute = resolveConfigurationSchemaAbsolute(agentRootAbs, rel);
    if (!absolute || !fs.existsSync(absolute)) continue;
    const schema = extractAwnSchemaFromConfigurationSchemaContent(readTextFile(absolute));
    const schemaFieldCount = countAwnSchemaFields(schema);
    return {
      schemaPath: rel.replace(/\\/g, "/"),
      schemaExists: true,
      schemaFieldCount,
      hasLocalSchema: schemaFieldCount > 0
    };
  }

  const fallbackPath = toTopicConfigurationSchemaRel(normalized) || WORKSPACE_CONFIGURATION_SCHEMA_REL;
  return {
    schemaPath: fallbackPath,
    schemaExists: false,
    schemaFieldCount: 0,
    hasLocalSchema: false
  };
}

module.exports = {
  SCHEMA_MOD_FILE,
  LEGACY_SCHEME_MOD_FILE,
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
  readContextOwnAwnSchema,
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
  countAwnSchemaFields,
  resolveSchemaModStatusForManifest,
  getEffectiveTopicSchemaPayload,
  getWorkspaceSchemaPayloadFull,
  compactAwnSchema,
  buildLayeredTopicSchemaResponse,
  buildLayeredTopicSchemaWriteResponse,
  buildLayeredWorkspaceSchemaResponse,
  slimTopicSchemaResponse,
  slimTopicSchemaWriteResponse,
  writeTopicConfigurationSchema,
  writeWorkspaceConfigurationSchema,
  readNodeHasOwnSchemaLayer
};
