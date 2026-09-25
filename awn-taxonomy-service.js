const fs = require("fs");
const path = require("path");
const {
  loadAwnDataStores,
  getAwnDataRoot,
  findAwnDataStore,
  getAwnDataPayload,
  readStoreMdParts
} = require("./awn-data-loader");
const { recordToCatalogItem } = require("./awn-data-taxonomies-bridge");

const TAXONOMIES_GROUP_REL = "awn-taxonomies";
const LEGACY_TAXONOMIES_GROUP_REL = "taxonomies";
const LEGACY_TAXONOMY_FIELD_MAP = {
  "awn-tags": "tags",
  "awn-category": "category",
  "awn-color": "color"
};

function getYamlScalar(frontmatter, key) {
  const raw = frontmatter?.[key];
  if (raw === undefined || raw === null) return "";
  return String(raw).trim();
}

function inferTaxonomyKeyFromSlug(storeRel) {
  const slug = String(storeRel || "").split("/").pop() || "";
  if (slug === "categories") return "category";
  if (slug === "colors") return "color";
  return slug;
}

function inferTaxonomyCardinality(key, slug = "") {
  const normalized = String(key || slug || "").trim().toLowerCase();
  if (normalized === "tags" || normalized === "color" || normalized === "colors") return "many";
  if (normalized === "category" || normalized === "categories") return "one";
  return "one";
}

function readTaxonomyManifestMeta(storeAbs) {
  const manifestPath = path.join(storeAbs, "manifest.md");
  if (!fs.existsSync(manifestPath)) return {};
  const parts = readStoreMdParts(manifestPath);
  const fm = parts?.frontmatter || {};
  const storeRelHint = path.basename(storeAbs);
  const explicitKey = getYamlScalar(fm, "awn-taxonomy-key");
  const key = explicitKey || inferTaxonomyKeyFromSlug(storeRelHint);
  const cardinalityRaw = getYamlScalar(fm, "awn-taxonomy-cardinality").toLowerCase();
  const cardinality = cardinalityRaw === "many" || cardinalityRaw === "one"
    ? cardinalityRaw
    : inferTaxonomyCardinality(key, storeRelHint);
  const hierarchyRaw = fm["awn-record-hierarchy"];
  const hierarchy =
    hierarchyRaw === true ||
    hierarchyRaw === "true" ||
    hierarchyRaw === 1 ||
    hierarchyRaw === "1";
  return {
    key,
    explicitKey: Boolean(explicitKey),
    cardinality,
    hierarchy,
    name: getYamlScalar(fm, "awn-name") || key,
    description: getYamlScalar(fm, "awn-description")
  };
}

function normalizeTaxonomyValue(value, cardinality) {
  if (cardinality === "many") {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    const text = String(value ?? "").trim();
    if (!text) return [];
    if (text.startsWith("[") && text.endsWith("]")) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch {
        // fall through
      }
    }
    return text
      .split(",")
      .map((item) => item.trim().replace(/^#+/, ""))
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    const first = value.map((item) => String(item).trim()).find(Boolean);
    return first || "";
  }
  return String(value ?? "").trim();
}

function normalizeTaxonomyObject(raw = {}, definitions = []) {
  const result = {};
  const defByKey = new Map(definitions.map((def) => [def.key, def]));
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  for (const def of definitions) {
    const value = normalizeTaxonomyValue(source[def.key], def.cardinality);
    if (def.cardinality === "many") {
      if (value.length) result[def.key] = value;
    } else if (value) {
      result[def.key] = value;
    }
  }
  for (const [key, value] of Object.entries(source)) {
    if (defByKey.has(key)) continue;
    if (Array.isArray(value)) {
      const items = value.map((item) => String(item).trim()).filter(Boolean);
      if (items.length) result[key] = items;
      continue;
    }
    const text = String(value ?? "").trim();
    if (text) result[key] = text;
  }
  return result;
}

function migrateLegacyTaxonomyFields(frontmatter = {}, definitions = []) {
  const merged = normalizeTaxonomyObject(frontmatter["awn-taxonomy"] || {}, definitions);
  for (const [legacyKey, taxonomyKey] of Object.entries(LEGACY_TAXONOMY_FIELD_MAP)) {
    const legacyValue = frontmatter[legacyKey];
    if (legacyValue === undefined || legacyValue === null || legacyValue === "") continue;
    const def = definitions.find((item) => item.key === taxonomyKey);
    const cardinality = def?.cardinality || inferTaxonomyCardinality(taxonomyKey);
    const normalized = normalizeTaxonomyValue(legacyValue, cardinality);
    const hasValue = cardinality === "many" ? normalized.length > 0 : Boolean(normalized);
    if (!hasValue) continue;
    if (cardinality === "many") {
      const current = Array.isArray(merged[taxonomyKey]) ? merged[taxonomyKey] : [];
      merged[taxonomyKey] = [...new Set([...current, ...normalized])];
    } else if (!merged[taxonomyKey]) {
      merged[taxonomyKey] = normalized;
    }
  }
  return merged;
}

function listTaxonomyStores(agentRoot, projectRoot = process.cwd()) {
  const payload = loadAwnDataStores(agentRoot, projectRoot);
  const stores = payload?.stores || [];
  const group =
    findAwnDataStore(stores, TAXONOMIES_GROUP_REL) ||
    findAwnDataStore(stores, LEGACY_TAXONOMIES_GROUP_REL);
  const children = Array.isArray(group?.children) ? group.children : [];
  if (children.length) {
    return children.filter((store) => store.kind === "collection");
  }
  return stores.filter((store) => {
    const rel = String(store?.relPath || "");
    return (
      (rel.startsWith(`${TAXONOMIES_GROUP_REL}/`) ||
        rel.startsWith(`${LEGACY_TAXONOMIES_GROUP_REL}/`)) &&
      store.kind === "collection"
    );
  });
}

function loadTaxonomyDefinition(store, agentRoot, projectRoot) {
  const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
  const storeAbs = path.join(dataRoot, store.relPath);
  const meta = readTaxonomyManifestMeta(storeAbs);
  if (!meta.explicitKey) return null;
  const storePayload = getAwnDataPayload(agentRoot, projectRoot, store.relPath);
  const fromStore = (storePayload?.store?.records || store.records || [])
    .map((record) => recordToCatalogItem(record))
    .filter(Boolean);
  const byId = new Map();
  for (const item of fromStore) {
    if (item?.id) byId.set(item.id, item);
  }
  return {
    key: meta.key,
    slug: store.relPath.split("/").pop(),
    storeRel: store.relPath,
    name: meta.name || store.name || meta.key,
    description: meta.description || store.description || "",
    cardinality: meta.cardinality,
    hierarchy: meta.hierarchy,
    items: [...byId.values()]
  };
}

function listWorkspaceTaxonomies(agentRoot, projectRoot = process.cwd()) {
  const stores = listTaxonomyStores(agentRoot, projectRoot);
  const definitions = stores
    .map((store) => {
      try {
        return loadTaxonomyDefinition(store, agentRoot, projectRoot);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
  const byKey = new Map();
  for (const def of definitions) {
    if (!def.key) continue;
    byKey.set(def.key, def);
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
}

function getWorkspaceTaxonomiesPayload(agentRoot, projectRoot = process.cwd()) {
  const taxonomies = listWorkspaceTaxonomies(agentRoot, projectRoot);
  const byKey = {};
  for (const def of taxonomies) {
    byKey[def.key] = {
      key: def.key,
      slug: def.slug,
      storeRel: def.storeRel,
      name: def.name,
      description: def.description,
      cardinality: def.cardinality,
      hierarchy: def.hierarchy,
      items: def.items
    };
  }
  return {
    group: TAXONOMIES_GROUP_REL,
    taxonomies,
    byKey
  };
}

function projectTaxonomyIndexFields(taxonomyValue = {}) {
  const projected = {};
  if (!taxonomyValue || typeof taxonomyValue !== "object" || Array.isArray(taxonomyValue)) {
    return projected;
  }
  for (const [key, value] of Object.entries(taxonomyValue)) {
    const fieldKey = `awn-taxonomy-${key}`;
    if (Array.isArray(value)) {
      projected[fieldKey] = value.map((item) => String(item).trim()).filter(Boolean).join(", ");
    } else {
      projected[fieldKey] = String(value ?? "").trim();
    }
  }
  return projected;
}

function resolveTaxonomyFromFrontmatter(frontmatter = {}, agentRoot, projectRoot = process.cwd()) {
  const definitions = listWorkspaceTaxonomies(agentRoot, projectRoot);
  const fromField = migrateLegacyTaxonomyFields(frontmatter, definitions);
  return normalizeTaxonomyObject(fromField, definitions);
}

module.exports = {
  TAXONOMIES_GROUP_REL,
  LEGACY_TAXONOMY_FIELD_MAP,
  inferTaxonomyKeyFromSlug,
  inferTaxonomyCardinality,
  normalizeTaxonomyValue,
  normalizeTaxonomyObject,
  migrateLegacyTaxonomyFields,
  listTaxonomyStores,
  listWorkspaceTaxonomies,
  getWorkspaceTaxonomiesPayload,
  projectTaxonomyIndexFields,
  resolveTaxonomyFromFrontmatter,
  readTaxonomyManifestMeta
};
