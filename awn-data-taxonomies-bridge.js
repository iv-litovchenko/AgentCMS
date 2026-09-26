const fs = require("fs");
const path = require("path");
const { getAgentCmsCoreAbsolute } = require("./platform-sources");
const { findCatalogScaffold } = require("./agent-registry");
const { AWN_DATA_DIR, getAwnDataPayload } = require("./awn-data-loader");
const { listWorkspaceTaxonomies } = require("./awn-taxonomy-service");
const { recordToCatalogItem } = require("./awn-taxonomy-record");

const AWN_DATA_MANIFEST_REL_PREFIX = "awn-databases/awn-taxonomies";

function listPlatformTaxonomyDefinitions(projectRoot) {
  const agentRoot = getAgentCmsCoreAbsolute(projectRoot);
  return listWorkspaceTaxonomies(agentRoot, projectRoot);
}

function resolveTaxonomyPreset(projectRoot, preset) {
  const needle = String(preset || "").trim().toLowerCase();
  if (!needle) return null;
  const definitions = listPlatformTaxonomyDefinitions(projectRoot);
  return (
    definitions.find(
      (def) =>
        String(def.key || "").trim().toLowerCase() === needle ||
        String(def.slug || "").trim().toLowerCase() === needle
    ) || null
  );
}

function listPlatformTaxonomyPresetKeys(projectRoot) {
  return listPlatformTaxonomyDefinitions(projectRoot).map((def) => def.key).filter(Boolean);
}

function isPlatformTaxonomyPreset(projectRoot, preset) {
  return Boolean(resolveTaxonomyPreset(projectRoot, preset));
}

function getAwnDataTaxonomyManifestRel(preset, storeRel = "") {
  if (storeRel) {
    return `awn-databases/${String(storeRel).replace(/^\/+|\/+$/g, "")}/manifest.md`;
  }
  return `${AWN_DATA_MANIFEST_REL_PREFIX}/${preset}/manifest.md`;
}

function getPlatformAwnDataRoot(projectRoot) {
  return path.join(getAgentCmsCoreAbsolute(projectRoot), AWN_DATA_DIR);
}

function getTaxonomyStoreRel(projectRoot, preset) {
  const def = resolveTaxonomyPreset(projectRoot, preset);
  return def?.storeRel || null;
}

function taxonomyStoreHasRecords(projectRoot, preset) {
  const storeRel = getTaxonomyStoreRel(projectRoot, preset);
  if (!storeRel) return false;
  const payload = getAwnDataPayload(getAgentCmsCoreAbsolute(projectRoot), projectRoot, storeRel);
  return Boolean(payload.store?.records?.length);
}

function taxonomyStoreExists(projectRoot, preset) {
  const storeRel = getTaxonomyStoreRel(projectRoot, preset);
  if (!storeRel) return false;
  const schemaPath = path.join(getPlatformAwnDataRoot(projectRoot), ...storeRel.split("/"), "manifest.md");
  return fs.existsSync(schemaPath);
}

function loadPlatformTaxonomyPreset(projectRoot, preset) {
  const def = resolveTaxonomyPreset(projectRoot, preset);
  const scaffold = findCatalogScaffold(preset);
  const manifestRel = def
    ? getAwnDataTaxonomyManifestRel(preset, def.storeRel)
    : getAwnDataTaxonomyManifestRel(preset);
  const fromAwnData = loadTaxonomyPresetFromAwnData(projectRoot, preset);
  const items = fromAwnData?.items || def?.items || [];
  return {
    preset: def?.key || preset,
    exists: Boolean(items.length || taxonomyStoreExists(projectRoot, preset)),
    title: def?.name || scaffold?.title || preset,
    manifestRel,
    items,
    source: items.length ? fromAwnData?.source || "awn-databases" : undefined,
    storeRel: getTaxonomyStoreRel(projectRoot, preset)
  };
}

function loadTaxonomyItemsFromAwnData(projectRoot, preset) {
  const storeRel = getTaxonomyStoreRel(projectRoot, preset);
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
  return { items, source: "awn-databases", storeRel: getTaxonomyStoreRel(projectRoot, preset) };
}

module.exports = {
  AWN_DATA_MANIFEST_REL_PREFIX,
  getAwnDataTaxonomyManifestRel,
  getTaxonomyStoreRel,
  listPlatformTaxonomyPresetKeys,
  listPlatformTaxonomyDefinitions,
  resolveTaxonomyPreset,
  isPlatformTaxonomyPreset,
  taxonomyStoreHasRecords,
  taxonomyStoreExists,
  loadTaxonomyItemsFromAwnData,
  loadTaxonomyPresetFromAwnData,
  loadPlatformTaxonomyPreset,
  recordToCatalogItem
};
