const fs = require("fs");
const path = require("path");
const { getAgentCmsCoreAbsolute } = require("./platform-sources");
const { findCatalogScaffold } = require("./agent-registry");
const { AWN_DATA_DIR, getAwnDataPayload } = require("./awn-data-loader");

/** Presets backed by awn-databases/taxonomies/{preset}/ */
const AWN_DATA_TAXONOMY_PRESETS = new Set([
  "tags",
  "categories",
  "statuses",
  "priorities",
  "colors",
  "users"
]);

const PRESET_TO_STORE_REL = {
  tags: "taxonomies/tags",
  categories: "taxonomies/categories",
  statuses: "taxonomies/statuses",
  priorities: "taxonomies/priorities",
  colors: "taxonomies/colors",
  users: "taxonomies/users"
};

const AWN_DATA_MANIFEST_REL_PREFIX = "awn-databases/taxonomies";

function getAwnDataTaxonomyManifestRel(preset) {
  return `${AWN_DATA_MANIFEST_REL_PREFIX}/${preset}/manifest.md`;
}

function getPlatformAwnDataRoot(projectRoot) {
  return path.join(getAgentCmsCoreAbsolute(projectRoot), AWN_DATA_DIR);
}

function getTaxonomyStoreRel(preset) {
  const key = String(preset || "").trim().toLowerCase();
  return PRESET_TO_STORE_REL[key] || null;
}

function taxonomyStoreHasRecords(projectRoot, preset) {
  const storeRel = getTaxonomyStoreRel(preset);
  if (!storeRel) return false;
  const payload = getAwnDataPayload(getAgentCmsCoreAbsolute(projectRoot), projectRoot, storeRel);
  return Boolean(payload.store?.records?.length);
}

function recordToCatalogItem(record) {
  const fm = record.frontmatter || {};
  const id = String(fm.code || fm.id || record.id || "").trim();
  if (!id) return null;
  const label = String(fm.label || record.title || id).trim();
  const color = String(fm.color || "").trim() || null;
  const email = String(fm.email || "").trim() || null;
  const item = { id, label, color };
  if (email) item.email = email;
  return item;
}

function taxonomyStoreExists(projectRoot, preset) {
  const storeRel = getTaxonomyStoreRel(preset);
  if (!storeRel) return false;
  const schemaPath = path.join(getPlatformAwnDataRoot(projectRoot), ...storeRel.split("/"), "manifest.md");
  return fs.existsSync(schemaPath);
}

function loadPlatformTaxonomyPreset(projectRoot, preset) {
  const scaffold = findCatalogScaffold(preset);
  const manifestRel = getAwnDataTaxonomyManifestRel(preset);
  const fromAwnData = loadTaxonomyPresetFromAwnData(projectRoot, preset);
  const items = fromAwnData?.items || [];
  return {
    preset,
    exists: Boolean(items.length || taxonomyStoreExists(projectRoot, preset)),
    title: scaffold?.title || preset,
    manifestRel,
    items,
    source: items.length ? fromAwnData.source : undefined,
    storeRel: getTaxonomyStoreRel(preset)
  };
}

function loadTaxonomyItemsFromAwnData(projectRoot, preset) {
  const storeRel = getTaxonomyStoreRel(preset);
  if (!storeRel) return null;

  const payload = getAwnDataPayload(getAgentCmsCoreAbsolute(projectRoot), projectRoot, storeRel);
  const records = payload.store?.records || [];
  if (!records.length) return null;

  const sortOrder = payload.store?.sortOrder;
  const byId = new Map();
  for (const record of records) {
    const item = recordToCatalogItem(record);
    if (item) byId.set(item.id, item);
  }

  let items = [...byId.values()];
  if (Array.isArray(sortOrder) && sortOrder.length) {
    const ordered = [];
    const seen = new Set();
    for (const id of sortOrder) {
      const item = byId.get(String(id));
      if (item) {
        ordered.push(item);
        seen.add(item.id);
      }
    }
    for (const item of items) {
      if (!seen.has(item.id)) ordered.push(item);
    }
    items = ordered;
  } else {
    const sortByField = (records || [])
      .map((record) => {
        const item = recordToCatalogItem(record);
        if (!item) return null;
        const sort = Number(record.frontmatter?.sort);
        return { item, sort: Number.isFinite(sort) ? sort : null };
      })
      .filter(Boolean);
    if (sortByField.some((entry) => entry.sort !== null)) {
      sortByField.sort((a, b) => {
        if (a.sort === null && b.sort === null) {
          return String(a.item.label || a.item.id).localeCompare(String(b.item.label || b.item.id), "ru");
        }
        if (a.sort === null) return 1;
        if (b.sort === null) return -1;
        if (a.sort !== b.sort) return a.sort - b.sort;
        return String(a.item.label || a.item.id).localeCompare(String(b.item.label || b.item.id), "ru");
      });
      items = sortByField.map((entry) => entry.item);
    } else {
      items.sort((a, b) => String(a.label || a.id).localeCompare(String(b.label || b.id), "ru"));
    }
  }

  return items;
}

function loadTaxonomyPresetFromAwnData(projectRoot, preset) {
  const items = loadTaxonomyItemsFromAwnData(projectRoot, preset);
  if (!items?.length) return null;
  return { items, source: "awn-databases", storeRel: getTaxonomyStoreRel(preset) };
}

module.exports = {
  AWN_DATA_TAXONOMY_PRESETS,
  AWN_DATA_MANIFEST_REL_PREFIX,
  PRESET_TO_STORE_REL,
  getAwnDataTaxonomyManifestRel,
  getTaxonomyStoreRel,
  taxonomyStoreHasRecords,
  taxonomyStoreExists,
  loadTaxonomyItemsFromAwnData,
  loadTaxonomyPresetFromAwnData,
  loadPlatformTaxonomyPreset,
  recordToCatalogItem
};
