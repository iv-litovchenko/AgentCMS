const path = require("path");
const { getAgentCmsCoreAbsolute } = require("./platform-sources");
const { listWorkspaceTaxonomies } = require("./awn-taxonomy-service");

const CATALOG_GROUP_LABELS = {
  global: "Общие",
  agent: "Агент"
};

function buildCatalogGroups(items) {
  const globalItems = (items || []).filter((item) => item.scope !== "agent");
  const agentItems = (items || []).filter((item) => item.scope === "agent");
  return {
    global: { title: CATALOG_GROUP_LABELS.global, items: globalItems },
    agent: { title: CATALOG_GROUP_LABELS.agent, items: agentItems }
  };
}

const MERGE_CATALOG_PRESETS = ["categories", "tags", "statuses", "priorities", "colors"];

const CATALOG_PRESET_TO_TAXONOMY_KEYS = {
  categories: ["category", "categories"],
  colors: ["color", "colors"],
  tags: ["tags"],
  priorities: ["priorities"],
  statuses: ["statuses"],
  users: ["users"]
};

function taxonomyKeyToCatalogPreset(key, slug = "") {
  const normalizedKey = String(key || "").trim().toLowerCase();
  const normalizedSlug = String(slug || "").trim().toLowerCase();
  if (normalizedKey === "category" || normalizedSlug === "categories") return "categories";
  if (normalizedKey === "color" || normalizedSlug === "colors") return "colors";
  if (normalizedKey === "tags" || normalizedSlug === "tags") return "tags";
  if (normalizedKey === "priorities" || normalizedSlug === "priorities") return "priorities";
  if (normalizedKey === "statuses" || normalizedSlug === "statuses") return "statuses";
  if (normalizedKey === "users" || normalizedSlug === "users") return "users";
  return normalizedKey || normalizedSlug;
}

function catalogPresetToTaxonomyKeys(preset) {
  const needle = String(preset || "").trim().toLowerCase();
  return CATALOG_PRESET_TO_TAXONOMY_KEYS[needle] || [needle];
}

function findTaxonomyDefinition(definitions, keys) {
  for (const definition of definitions || []) {
    const key = String(definition?.key || "").trim().toLowerCase();
    const slug = String(definition?.slug || "").trim().toLowerCase();
    if (keys.some((needle) => needle === key || needle === slug)) {
      return definition;
    }
  }
  return null;
}

function listMergedTaxonomiesForAgent(agentRoot, projectRoot) {
  if (!agentRoot) return [];
  return listWorkspaceTaxonomies(agentRoot, projectRoot);
}

function buildCatalogPresetFromTaxonomies(preset, definitions, options = {}) {
  const keys = catalogPresetToTaxonomyKeys(preset);
  const definition = findTaxonomyDefinition(definitions, keys);
  const items = definition?.items || [];
  const exists = Boolean(definition && items.length);
  const title = definition?.name || preset;
  return {
    preset,
    exists: Boolean(definition) || exists,
    title,
    manifestRel: definition?.storeRel ? `awn-databases/${definition.storeRel}/manifest.md` : null,
    globalManifestRel: null,
    items,
    groups: buildCatalogGroups(items),
    storeRel: definition?.storeRel || null
  };
}

function getCatalogsPayloadFromTaxonomies(agentRoot, projectRoot, options = {}) {
  const definitions = listMergedTaxonomiesForAgent(agentRoot, projectRoot, options);
  const presetKeys = new Set(MERGE_CATALOG_PRESETS);
  for (const definition of definitions) {
    presetKeys.add(taxonomyKeyToCatalogPreset(definition.key, definition.slug));
  }

  const payload = {};
  for (const preset of presetKeys) {
    payload[preset] = buildCatalogPresetFromTaxonomies(preset, definitions, options);
  }
  return payload;
}

function buildCatalogLookupMapsFromTaxonomies(agentRoot, projectRoot, options = {}) {
  const definitions = listMergedTaxonomiesForAgent(agentRoot, projectRoot, options);
  const payload = {};
  for (const preset of MERGE_CATALOG_PRESETS) {
    payload[preset] = buildCatalogPresetFromTaxonomies(preset, definitions, options);
  }
  const toMap = (items) => {
    const map = new Map();
    for (const item of items || []) {
      if (!item?.id) continue;
      map.set(item.id, item.label || item.id);
      if (item.label) map.set(String(item.label).trim(), item.label);
    }
    return map;
  };
  return {
    categories: toMap(payload.categories?.items),
    tags: toMap(payload.tags?.items),
    statuses: toMap(payload.statuses?.items),
    users: toMap(payload.users?.items),
    priorities: toMap(payload.priorities?.items),
    colors: payload.colors?.items || []
  };
}

function resolveAgentRootForCatalogLookup(projectRoot, agentCatalogAbsolute, options = {}) {
  if (options.globalOnly) return getAgentCmsCoreAbsolute(projectRoot);
  if (!agentCatalogAbsolute) return null;
  const normalized = path.resolve(agentCatalogAbsolute);
  const marker = `${path.sep}workspaces${path.sep}`;
  const idx = normalized.indexOf(marker);
  if (idx < 0) return null;
  const rest = normalized.slice(idx + marker.length);
  const agentSlug = rest.split(path.sep)[0];
  if (!agentSlug) return null;
  return path.join(projectRoot, "workspaces", agentSlug);
}

module.exports = {
  MERGE_CATALOG_PRESETS,
  CATALOG_PRESET_TO_TAXONOMY_KEYS,
  taxonomyKeyToCatalogPreset,
  catalogPresetToTaxonomyKeys,
  listMergedTaxonomiesForAgent,
  getCatalogsPayloadFromTaxonomies,
  buildCatalogLookupMapsFromTaxonomies,
  resolveAgentRootForCatalogLookup
};
