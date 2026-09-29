const fs = require("fs/promises");
const path = require("path");
const {
  parseStorageLayerRef,
  pickManifestRelFromStorageLayerRef,
  inferAwnTypeFromRelPath,
  MANIFEST_FILE,
  isManifestFileName
} = require("../../config/manifest-paths");
const { isSchemaModFileName, listSchemaModFileNames } = require("../../config/schema-mod-paths");
const {
  extractAwnSchemaFromConfigurationSchemaContent,
  getEffectiveTopicSchemaPayload
} = require("../../config/configuration-schema");
const { getEffectiveSchemaPayloadForContentPath } = require("../../config/section-schema");
const { normalizeStorageSlotKey, STORAGE_SLOT_ROUTING } = require("../../config/storage-slot-routing");
const TopicSchemaSlotSpecs = require("../../../public/topic-schema-slot-specs.js");

function storageLayerToSlotKey(layer) {
  const normalized = String(layer || "").trim();
  for (const spec of STORAGE_SLOT_ROUTING) {
    if (spec.storageFolder === normalized) return spec.slotKey;
    for (const alias of spec.aliases || []) {
      if (alias === normalized) return spec.slotKey;
    }
  }
  return normalizeStorageSlotKey(normalized) || normalized;
}

function resolveContentKindFromRelPath(relPath) {
  const typeName = String(inferAwnTypeFromRelPath(relPath) || "").toLowerCase();
  if (typeName.includes("sidecar")) return "sidecar";
  if (typeName.includes("category")) return "category";
  return "record";
}

function resolveSchemaTargetForStoragePath(relPath, layer) {
  const slotKey = storageLayerToSlotKey(layer);
  const contentKind = resolveContentKindFromRelPath(relPath);
  return (
    TopicSchemaSlotSpecs.resolveTopicSchemaTargetId(slotKey, { contentKind }) ||
    TopicSchemaSlotSpecs.resolveTopicSchemaTargetId("memory", { contentKind })
  );
}

function pickFieldDef(fieldDefs, key) {
  if (!fieldDefs || !key) return null;
  return fieldDefs[key] || fieldDefs[String(key).toLowerCase()] || null;
}

function fieldDefToMeta(def) {
  if (!def || typeof def !== "object") return { type: null, title: null };
  const type = def.type ? String(def.type) : def["x-field-type"] ? String(def["x-field-type"]) : null;
  const title = def.title || def.name || def.label || null;
  return { type, title };
}

function contextKey(parts) {
  return parts.filter(Boolean).join("#");
}

function addFieldVariant(fieldCatalogMeta, key, variant) {
  if (!key) return;
  if (!fieldCatalogMeta.has(key)) fieldCatalogMeta.set(key, new Map());
  const bucket = fieldCatalogMeta.get(key);
  const id = contextKey([variant.manifestRel, variant.layer, variant.sectionPrefix, variant.schemaTarget]);
  const existing = bucket.get(id);
  if (existing) {
    existing.samplePaths = existing.samplePaths || [];
    if (variant.samplePath && existing.samplePaths.length < 5) {
      existing.samplePaths.push(variant.samplePath);
    }
    return;
  }
  bucket.set(id, {
    type: variant.type || null,
    title: variant.title || null,
    manifestRel: variant.manifestRel || null,
    layer: variant.layer || null,
    sectionPrefix: variant.sectionPrefix || null,
    schemaTarget: variant.schemaTarget || null,
    pathPrefix: variant.pathPrefix || null,
    samplePaths: variant.samplePath ? [variant.samplePath] : []
  });
}

function fieldCatalogMetaToArray(fieldCatalogMeta) {
  return Array.from(fieldCatalogMeta.entries())
    .map(([key, variantsMap]) => ({
      key,
      variants: Array.from(variantsMap.values()).sort((a, b) =>
        String(a.title || key).localeCompare(String(b.title || key), "ru")
      )
    }))
    .sort((a, b) => a.key.localeCompare(b.key, "ru"));
}

function registerSchemaFields(fieldCatalogMeta, manifestRel, layer, sectionPrefix, schemaTarget, fields, pathPrefix) {
  for (const [key, def] of Object.entries(fields || {})) {
    const meta = fieldDefToMeta(def);
    addFieldVariant(fieldCatalogMeta, key, {
      ...meta,
      manifestRel,
      layer,
      sectionPrefix,
      schemaTarget,
      pathPrefix
    });
  }
}

async function readText(agentRoot, relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return "";
  const absolute = path.join(agentRoot, normalized);
  try {
    return await fs.readFile(absolute, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Phase 1: scan schema.yml files and build field variant catalog (no content files).
 */
async function buildSchemaRegistry({ agentRoot, projectRoot, relFiles }) {
  const fieldCatalogMeta = new Map();
  const schemaFiles = relFiles.filter((rel) => isSchemaModFileName(path.basename(rel)));

  for (const schemaRel of schemaFiles) {
    const content = await readText(agentRoot, schemaRel);
    if (!content.trim()) continue;
    const awnSchema = extractAwnSchemaFromConfigurationSchemaContent(content);
    if (!awnSchema) continue;

    const normalized = schemaRel.replace(/\\/g, "/");
    const isSectionSchema = /\/awn-storage\/[^/]+\/.+\/(schema|schema-mod|scheme-mod)\.yml$/i.test(normalized);

    if (isSectionSchema) {
      const parsed = parseStorageLayerRef(normalized.replace(/\/(schema|schema-mod|scheme-mod)\.yml$/i, "/manifest.md"));
      if (!parsed) continue;
      const manifestRel = pickManifestRelFromStorageLayerRef(parsed);
      const sectionPrefix = path.posix.dirname(parsed.relativePath);
      const pathPrefix = normalized.replace(/\/(schema|schema-mod|scheme-mod)\.yml$/i, "/");
      for (const [target, block] of Object.entries(awnSchema)) {
        registerSchemaFields(
          fieldCatalogMeta,
          manifestRel,
          parsed.layer,
          sectionPrefix,
          target,
          block?.fields,
          pathPrefix
        );
      }
      continue;
    }

    const manifestRel = normalized.includes("/")
      ? `${normalized.replace(/\/(schema|schema-mod|scheme-mod)\.yml$/i, "")}/${MANIFEST_FILE}`.replace(
          /\/+/g,
          "/"
        )
      : MANIFEST_FILE;
    const topicDir = manifestRel.replace(/\/manifest\.md$/i, "");
    const pathPrefix = topicDir ? `${topicDir}/` : "";

    for (const [target, block] of Object.entries(awnSchema)) {
      registerSchemaFields(fieldCatalogMeta, manifestRel, null, null, target, block?.fields, pathPrefix);
    }
  }

  return {
    fieldCatalogMeta,
    fieldCatalogMetaList: fieldCatalogMetaToArray(fieldCatalogMeta)
  };
}

function createSchemaResolver({ agentRoot, projectRoot, registry }) {
  const manifestConfigCache = new Map();

  async function getManifestConfig(manifestRel) {
    if (manifestConfigCache.has(manifestRel)) return manifestConfigCache.get(manifestRel);
    const content = await readText(agentRoot, manifestRel);
    manifestConfigCache.set(manifestRel, content);
    return content;
  }

  async function resolveMergedFieldsForPath(relPath) {
    const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const parsed = parseStorageLayerRef(normalized);

    if (parsed?.layer && parsed.relativePath) {
      const manifestRel = pickManifestRelFromStorageLayerRef(parsed);
      if (!manifestRel) return null;
      const configContent = await getManifestConfig(manifestRel);
      const payload = getEffectiveSchemaPayloadForContentPath(
        configContent,
        normalized,
        agentRoot,
        projectRoot
      );
      const schemaTarget = resolveSchemaTargetForStoragePath(normalized, parsed.layer);
      const mergedFields = payload?.merged?.[schemaTarget]?.fields || payload?.awnSchema?.[schemaTarget]?.fields || {};
      const sectionPrefix =
        payload?.sectionChain?.length > 0
          ? payload.sectionChain[payload.sectionChain.length - 1].sectionPrefix
          : "";
      return {
        schemaTarget,
        manifestRel,
        layer: parsed.layer,
        sectionPrefix,
        pathPrefix: normalized.slice(0, normalized.lastIndexOf("/") + 1),
        mergedFields,
        schemaContext: contextKey([manifestRel, parsed.layer, sectionPrefix, schemaTarget])
      };
    }

    if (isManifestFileName(path.basename(normalized))) {
      const manifestRel = normalized;
      const configContent = await getManifestConfig(manifestRel);
      const payload = getEffectiveTopicSchemaPayload(manifestRel, agentRoot, projectRoot, configContent);
      const isArea = String(inferAwnTypeFromRelPath(manifestRel)).includes("area");
      const schemaTarget = isArea ? "area" : "topic";
      const mergedFields = payload?.merged?.[schemaTarget]?.fields || payload?.awnSchema?.[schemaTarget]?.fields || {};
      const topicDir = manifestRel.replace(/\/manifest\.md$/i, "");
      return {
        schemaTarget,
        manifestRel,
        layer: null,
        sectionPrefix: null,
        pathPrefix: topicDir ? `${topicDir}/` : "",
        mergedFields,
        schemaContext: contextKey([manifestRel, schemaTarget])
      };
    }

    return null;
  }

  function enrichFlatFields(flatFields, schemaCtx) {
    const enriched = {};
    for (const [key, value] of Object.entries(flatFields || {})) {
      const def = pickFieldDef(schemaCtx?.mergedFields, key);
      const meta = fieldDefToMeta(def);
      enriched[key] = {
        value,
        type: meta.type,
        title: meta.title,
        schemaTarget: schemaCtx?.schemaTarget || null,
        schemaContext: schemaCtx?.schemaContext || null
      };
      if (registry?.fieldCatalogMeta && schemaCtx) {
        addFieldVariant(registry.fieldCatalogMeta, key, {
          ...meta,
          manifestRel: schemaCtx.manifestRel,
          layer: schemaCtx.layer,
          sectionPrefix: schemaCtx.sectionPrefix,
          schemaTarget: schemaCtx.schemaTarget,
          pathPrefix: schemaCtx.pathPrefix,
          samplePath: schemaCtx.samplePath
        });
      }
    }
    return enriched;
  }

  return { resolveMergedFieldsForPath, enrichFlatFields, getManifestConfig };
}

module.exports = {
  buildSchemaRegistry,
  createSchemaResolver,
  fieldCatalogMetaToArray,
  getRecordFieldValue: require("./field-utils").getRecordFieldValue
};
