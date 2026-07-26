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
const { mergeAwnSchemaLayers } = require("./configuration-schema");
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

function toSectionConfigRelPath(manifestRel, layer, sectionPrefix) {
  const prefix = String(sectionPrefix || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!prefix) return "";
  return buildStorageLayerRef(manifestRel, layer, `${prefix}/${BUNDLE_CONFIG_FILE}`);
}

function listSectionConfigRelPaths(manifestRel, layer, relativePathInSlot) {
  return listSectionFolderPrefixes(relativePathInSlot)
    .map((prefix) => ({
      sectionPrefix: prefix,
      configRelPath: toSectionConfigRelPath(manifestRel, layer, prefix)
    }))
    .filter((item) => item.configRelPath);
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
    const content = readSectionConfigContentSync(item.configRelPath, agentRootAbs);
    const schema = extractAwnSchemaFromConfig(content);
    const hasFields = AWN_SCHEMA_TARGETS.some(
      (target) => Object.keys(schema?.[target]?.fields || {}).length > 0
    );
    if (!hasFields) continue;
    chain.push({
      sectionPrefix: item.sectionPrefix,
      configRelPath: item.configRelPath,
      awnSchema: schema
    });
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
  if (!sectionAwnSchemas.length) {
    return {
      ...base,
      topicAwnSchema: base.topicAwnSchema || base.awnSchema,
      workspaceAwnSchema: base.workspaceAwnSchema || null,
      sectionAwnSchema: null,
      sectionChain: []
    };
  }

  const sectionAwnSchema = mergeAwnSchemaLayers(...sectionAwnSchemas);
  const combinedAwnSchema = mergeAwnSchemaLayers(base.awnSchema, sectionAwnSchema);
  const { baseTypes, merged } = recomputeMergedTypes(combinedAwnSchema, agentRoot, projectRoot);
  return {
    topicAwnSchema: base.topicAwnSchema || base.awnSchema,
    workspaceAwnSchema: base.workspaceAwnSchema || null,
    awnSchema: combinedAwnSchema,
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
  return toSectionConfigRelPath(manifestRel, parsed.layer, sectionPrefix);
}

function isSectionConfigRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return false;
  const base = normalized.split("/").pop() || "";
  return (
    (base.toLowerCase() === BUNDLE_CONFIG_FILE.toLowerCase() ||
      base.toLowerCase() === LEGACY_BUNDLE_CONFIG_FILE.toLowerCase()) &&
    /\/awn-storage\/[^/]+\/.+\/config\.yml$/i.test(normalized)
  );
}

module.exports = {
  listSectionFolderPrefixes,
  toSectionConfigRelPath,
  listSectionConfigRelPaths,
  readSectionSchemaLayersSync,
  readSectionSchemaLayersForContentPath,
  getEffectiveSchemaPayload,
  getEffectiveSchemaPayloadForContentPath,
  resolveSectionConfigRelPath,
  isSectionConfigRelPath
};
