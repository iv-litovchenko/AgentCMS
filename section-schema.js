const fs = require("fs");
const path = require("path");
const {
  BUNDLE_CONFIG_FILE,
  LEGACY_BUNDLE_CONFIG_FILE,
  buildStorageLayerRef,
  parseStorageLayerRef,
  pickManifestRelFromStorageLayerRef,
  MANIFEST_FILE
} = require("./manifest-paths");
const { SCHEMA_MOD_FILE, isSchemaModFileName, listSchemaModFileNames } = require("./schema-mod-paths");
const {
  extractAwnSchemaFromConfigurationSchemaContent,
  mergeAwnSchemaLayers
} = require("./configuration-schema");
const {
  extractAwnSchemaFromConfig,
  getTopicSchemaPayload,
  mergeTypeWithTopicSchema,
  AWN_SCHEMA_TARGETS,
  AWN_SCHEMA_TARGET_TYPE_NAMES,
  loadAgentTypes,
  resolveTypeDefinition
} = require("./awn-types-loader");

function listSectionFolderPrefixes(relativePathInSlot) {
  const segments = String(relativePathInSlot || "")
    .replace(/\\/g, "/")
    .split("/")
    .filter(Boolean);
  if (!segments.length) return [];
  const last = segments[segments.length - 1];
  if (/\.md$/i.test(last)) segments.pop();
  const prefixes = [];
  for (let i = 0; i < segments.length; i += 1) {
    prefixes.push(segments.slice(0, i + 1).join("/"));
  }
  return prefixes;
}

function toSectionSchemaRelPath(manifestRel, layer, sectionPrefix) {
  const prefix = String(sectionPrefix || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!prefix) return "";
  return buildStorageLayerRef(manifestRel, layer, `${prefix}/${SCHEMA_MOD_FILE}`);
}

/** @deprecated alias — schema is stored in schema.yml */
function toSectionConfigRelPath(manifestRel, layer, sectionPrefix) {
  return toSectionSchemaRelPath(manifestRel, layer, sectionPrefix);
}

function listSectionConfigRelPaths(manifestRel, layer, relativePathInSlot) {
  return listSectionFolderPrefixes(relativePathInSlot)
    .map((prefix) => ({
      sectionPrefix: prefix,
      configRelPath: toSectionSchemaRelPath(manifestRel, layer, prefix)
    }))
    .filter((item) => item.configRelPath);
}

function sectionSchemaHasFields(awnSchema) {
  return AWN_SCHEMA_TARGETS.some((target) => Object.keys(awnSchema?.[target]?.fields || {}).length > 0);
}

function readSectionSchemaFromRelPaths(item, agentRootAbs) {
  const dir = String(item.configRelPath || "").replace(/[^/]+$/i, "");
  const schemaCandidates = listSchemaModFileNames().map((name) => `${dir}${name}`);
  for (const relPath of schemaCandidates) {
    const schemaContent = readSectionConfigContentSync(relPath, agentRootAbs);
    if (!schemaContent.trim()) continue;
    const schema = extractAwnSchemaFromConfigurationSchemaContent(schemaContent);
    if (schema && sectionSchemaHasFields(schema)) {
      return {
        sectionPrefix: item.sectionPrefix,
        configRelPath: item.configRelPath,
        awnSchema: schema
      };
    }
  }
  return null;
}

function readTextFileSync(absolute) {
  try {
    return fs.readFileSync(absolute, "utf-8");
  } catch {
    return "";
  }
}

function readSectionConfigContentSync(configRelPath, agentRootAbs) {
  const normalized = String(configRelPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || !agentRootAbs) return "";
  const absolute = path.join(agentRootAbs, normalized);
  if (!absolute.startsWith(agentRootAbs)) return "";
  return readTextFileSync(absolute);
}

function readSectionSchemaLayersSync(manifestRel, layer, relativePathInSlot, agentRootAbs) {
  const chain = [];
  for (const item of listSectionConfigRelPaths(manifestRel, layer, relativePathInSlot)) {
    const layerEntry = readSectionSchemaFromRelPaths(item, agentRootAbs);
    if (layerEntry) chain.push(layerEntry);
  }
  return chain;
}

function readSectionSchemaLayersForContentPath(contentWorkspaceRel, agentRootAbs) {
  const parsed = parseStorageLayerRef(contentWorkspaceRel);
  if (!parsed?.layer || !parsed.relativePath) {
    return { manifestRel: "", layer: "", chain: [] };
  }
  const manifestRel = pickManifestRelFromStorageLayerRef(parsed);
  if (!manifestRel) return { manifestRel: "", layer: parsed.layer, chain: [] };
  const chain = readSectionSchemaLayersSync(
    manifestRel,
    parsed.layer,
    parsed.relativePath,
    agentRootAbs
  );
  return { manifestRel, layer: parsed.layer, chain };
}

function recomputeMergedTypes(combinedAwnSchema, agentRoot, projectRoot) {
  const types = loadAgentTypes(agentRoot, projectRoot);
  const typesByName = new Map(Object.entries(types));
  const baseTypes = {};
  const merged = {};
  for (const target of AWN_SCHEMA_TARGETS) {
    const typeName = AWN_SCHEMA_TARGET_TYPE_NAMES[target];
    const base = resolveTypeDefinition(typeName, typesByName);
    baseTypes[target] = base
      ? { name: typeName, kind: base.kind, fields: { ...base.fields } }
      : null;
    merged[target] = mergeTypeWithTopicSchema(base, combinedAwnSchema, target);
  }
  return { baseTypes, merged };
}

function getEffectiveSchemaPayload(configContent, agentRoot, projectRoot, sectionAwnSchemas = [], manifestRel = "") {
  const { getEffectiveTopicSchemaPayload } = require("./configuration-schema");
  const base = manifestRel
    ? getEffectiveTopicSchemaPayload(manifestRel, agentRoot, projectRoot, configContent)
    : getTopicSchemaPayload(configContent, agentRoot, projectRoot);

  const sectionAwnSchema =
    sectionAwnSchemas.length > 0 ? sectionAwnSchemas[sectionAwnSchemas.length - 1] : null;
  // Slot content (category / record / sidecar): inherit topic schema.yml + section chain only.
  // ws/area schema.yml apply to their own node levels, not to storage slot fields.
  const contextSchema = mergeAwnSchemaLayers(base.topicAwnSchema, ...sectionAwnSchemas);
  const { baseTypes, merged } = recomputeMergedTypes(contextSchema, agentRoot, projectRoot);
  return {
    ...base,
    topicAwnSchema: base.topicAwnSchema || base.awnSchema,
    workspaceAwnSchema: base.workspaceAwnSchema || null,
    areaAwnSchema: base.areaAwnSchema || null,
    awnSchema: contextSchema,
    sectionAwnSchema,
    baseTypes,
    merged
  };
}

function getEffectiveSchemaPayloadForContentPath(
  configContent,
  contentWorkspaceRel,
  agentRoot,
  projectRoot
) {
  const agentRootAbs = path.resolve(String(agentRoot || ""));
  const { chain } = readSectionSchemaLayersForContentPath(contentWorkspaceRel, agentRootAbs);
  const sectionAwnSchemas = chain.map((item) => item.awnSchema);
  const parsed = parseStorageLayerRef(contentWorkspaceRel);
  const manifestRel = parsed ? pickManifestRelFromStorageLayerRef(parsed) : "";
  const payload = getEffectiveSchemaPayload(
    configContent,
    agentRoot,
    projectRoot,
    sectionAwnSchemas,
    manifestRel
  );
  return {
    ...payload,
    sectionChain: chain.map((item) => ({
      sectionPrefix: item.sectionPrefix,
      configRelPath: item.configRelPath
    }))
  };
}

function resolveSectionConfigRelPath(contentWorkspaceRel) {
  const parsed = parseStorageLayerRef(contentWorkspaceRel);
  if (!parsed?.layer || !parsed.relativePath) return "";
  const manifestRel = pickManifestRelFromStorageLayerRef(parsed);
  if (!manifestRel) return "";
  const prefixes = listSectionFolderPrefixes(parsed.relativePath);
  const sectionPrefix = prefixes[prefixes.length - 1] || "";
  if (!sectionPrefix) return "";
  return toSectionSchemaRelPath(manifestRel, parsed.layer, sectionPrefix);
}

function isSectionConfigRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return false;
  const base = normalized.split("/").pop() || "";
  if (isSchemaModFileName(base)) {
    return /\/awn-storage\/[^/]+\/.+\/(schema|schema-mod|scheme-mod)\.yml$/i.test(normalized);
  }
  return (
    (base.toLowerCase() === BUNDLE_CONFIG_FILE.toLowerCase() ||
      base.toLowerCase() === LEGACY_BUNDLE_CONFIG_FILE.toLowerCase()) &&
    /\/awn-storage\/[^/]+\/.+\/config\.yml$/i.test(normalized)
  );
}

module.exports = {
  SCHEMA_MOD_FILE,
  listSectionFolderPrefixes,
  toSectionSchemaRelPath,
  toSectionConfigRelPath,
  listSectionConfigRelPaths,
  readSectionSchemaLayersSync,
  readSectionSchemaLayersForContentPath,
  readSectionConfigContentSync,
  getEffectiveSchemaPayload,
  getEffectiveSchemaPayloadForContentPath,
  resolveSectionConfigRelPath,
  isSectionConfigRelPath
};
