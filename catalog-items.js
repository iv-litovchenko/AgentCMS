const fs = require("fs/promises");
const path = require("path");
const {
  findCatalogScaffold,
  createSystemCatalogNodeSync
} = require("./agent-registry");
const {
  MERGE_CATALOG_PRESETS,
  resolveCatalogManifestRel,
  loadCatalogPreset
} = require("./catalog-loader");
const {
  normalizeCatalogItemInput,
  resolveDiscoveredCatalogItem,
  catalogItemKnown
} = require("./catalog-normalize");
const {
  getNamedStorageBundleDirRel,
  BUNDLE_TABULAR_FILE
} = require("./manifest-paths");
const {
  AWN_DATA_TAXONOMY_PRESETS,
  getTaxonomyStoreRel,
  loadTaxonomyPresetFromAwnData
} = require("./awn-data-taxonomies-bridge");
const { getAgentCmsCoreAbsolute } = require("./platform-sources");
const { createAwnDataRecord } = require("./awn-data-loader");

const CATEGORY_LIKE_PRESETS = new Set(["categories", "statuses", "users", "priorities", "colors"]);

async function ensureWritableCatalog(serviceAbsolute, preset, projectRoot = null) {
  const scaffold = findCatalogScaffold(preset);
  if (!scaffold) {
    const error = new Error("Unknown catalog preset");
    error.code = "EINVAL";
    throw error;
  }
  if (!serviceAbsolute) {
    const error = new Error("Service catalog folder is not available for this agent");
    error.code = "EINVAL";
    throw error;
  }

  const manifestRel = await resolveCatalogManifestRel(serviceAbsolute, preset, projectRoot);
  const manifestAbs = path.join(serviceAbsolute, manifestRel);
  try {
    await fs.access(manifestAbs);
  } catch {
    createSystemCatalogNodeSync(serviceAbsolute, preset);
  }
}

async function writeTagsCsv(catalogAbsolute, preset, items, options = {}) {
  const manifestRel =
    options.manifestRel ||
    (await resolveCatalogManifestRel(catalogAbsolute, preset, options.projectRoot));
  const csvRel = path.posix.join(getNamedStorageBundleDirRel(manifestRel), BUNDLE_TABULAR_FILE);
  const csvAbs = path.join(catalogAbsolute, csvRel);
  const sorted = [...items]
    .map((item) => item.id)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ru"));
  const body = `tag\n${sorted.join("\n")}\n`;
  await fs.mkdir(path.dirname(csvAbs), { recursive: true });
  await fs.writeFile(csvAbs, body, "utf-8");
  return csvRel;
}

async function writeCategoryLikeCsv(catalogAbsolute, preset, items, options = {}) {
  const manifestRel =
    options.manifestRel ||
    (await resolveCatalogManifestRel(catalogAbsolute, preset, options.projectRoot));
  const csvRel = path.posix.join(getNamedStorageBundleDirRel(manifestRel), BUNDLE_TABULAR_FILE);
  const csvAbs = path.join(catalogAbsolute, csvRel);
  const header =
    preset === "colors" ? "id,label,color" : preset === "users" ? "id,label,email" : "id,label";
  const lines = [header];
  for (const item of items) {
    if (preset === "colors") {
      lines.push(`${item.id},${item.label || item.id},${item.color || ""}`);
    } else if (preset === "users") {
      lines.push(`${item.id},${item.label || item.id},${item.email || ""}`);
    } else {
      lines.push(`${item.id},${item.label || item.id}`);
    }
  }
  await fs.mkdir(path.dirname(csvAbs), { recursive: true });
  await fs.writeFile(csvAbs, `${lines.join("\n")}\n`, "utf-8");
  return csvRel;
}

async function addCatalogItemToAwnData(projectRoot, preset, itemInput) {
  const storeRel = getTaxonomyStoreRel(preset);
  if (!storeRel) {
    const error = new Error("Unsupported taxonomy preset");
    error.code = "EINVAL";
    throw error;
  }

  const existingPayload = loadTaxonomyPresetFromAwnData(projectRoot, preset);
  const existing = existingPayload?.items || [];
  const item = normalizeCatalogItemInput(preset, itemInput, existing);

  if (existing.some((entry) => entry.id === item.id)) {
    const error = new Error(`Catalog item "${item.id}" already exists`);
    error.code = "EEXIST";
    throw error;
  }

  const record = {
    store: storeRel,
    id: item.id,
    title: item.label || item.id
  };
  if (item.color) record.color = item.color;
  if (item.email) record.email = item.email;

  createAwnDataRecord(getAgentCmsCoreAbsolute(projectRoot), projectRoot, record);

  return {
    preset,
    item,
    total: existing.length + 1,
    source: "awn-data",
    storeRel
  };
}

async function addCatalogItemToAbsolute(catalogAbsolute, preset, itemInput, options = {}) {
  if (!MERGE_CATALOG_PRESETS.includes(preset)) {
    const error = new Error("Unsupported catalog preset");
    error.code = "EINVAL";
    throw error;
  }

  const payload = await loadCatalogPreset(catalogAbsolute, preset, options);
  const existing = payload.items || [];
  const item = normalizeCatalogItemInput(preset, itemInput, existing);

  if (existing.some((entry) => entry.id === item.id)) {
    const error = new Error(`Catalog item "${item.id}" already exists`);
    error.code = "EEXIST";
    throw error;
  }

  const nextItems = [...existing, item].sort((a, b) =>
    String(a.label || a.id).localeCompare(String(b.label || b.id), "ru")
  );

  const writeOptions = {
    projectRoot: options.projectRoot,
    manifestRel: payload.manifestRel
  };

  if (preset === "tags") {
    await writeTagsCsv(catalogAbsolute, preset, nextItems, writeOptions);
  } else if (CATEGORY_LIKE_PRESETS.has(preset)) {
    await writeCategoryLikeCsv(catalogAbsolute, preset, nextItems, writeOptions);
  }

  return {
    preset,
    item,
    total: nextItems.length
  };
}

async function addCatalogItemForAgentContext({
  projectRoot,
  serviceAbsolute,
  isPlatform,
  preset,
  item
}) {
  if (!MERGE_CATALOG_PRESETS.includes(preset)) {
    const error = new Error("Unsupported catalog preset");
    error.code = "EINVAL";
    throw error;
  }

  if (isPlatform && AWN_DATA_TAXONOMY_PRESETS.has(preset)) {
    const result = await addCatalogItemToAwnData(projectRoot, preset, item);
    return { ...result, scope: "global" };
  }

  if (!isPlatform && !serviceAbsolute) {
    const error = new Error("Service folder is not configured for this agent");
    error.code = "EINVAL";
    throw error;
  }

  if (!isPlatform) {
    await ensureWritableCatalog(serviceAbsolute, preset, projectRoot);
  }

  const catalogAbsolute = serviceAbsolute;
  const result = await addCatalogItemToAbsolute(catalogAbsolute, preset, item, { projectRoot });
  return {
    ...result,
    scope: isPlatform ? "global" : "agent"
  };
}

module.exports = {
  addCatalogItemForAgentContext,
  addCatalogItemToAbsolute,
  addCatalogItemToAwnData,
  writeCategoryLikeCsv,
  writeTagsCsv
};
