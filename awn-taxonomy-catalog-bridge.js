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

function mergeTaxonomyCatalogItems(globalItems, agentItems) {
  const byId = new Map();
  for (const item of globalItems || []) {
    if (!item?.id) continue;
    byId.set(item.id, { ...item, scope: "global" });
  }
  for (const item of agentItems || []) {
    if (!item?.id) continue;
    byId.set(item.id, { ...item, scope: "agent" });
  }
  return [...byId.values()].sort((a, b) =>
    String(a.label || a.id).localeCompare(String(b.label || b.id), "ru")
  );
}

function isAgentCmsCoreRoot(agentRoot, projectRoot) {
  if (!agentRoot) return false;
  return path.resolve(agentRoot) === path.resolve(getAgentCmsCoreAbsolute(projectRoot));
}

function listPlatformTaxonomyDefinitions(projectRoot) {
  return listWorkspaceTaxonomies(getAgentCmsCoreAbsolute(projectRoot), projectRoot);
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

function listMergedTaxonomiesForAgent(agentRoot, projectRoot, options = {}) {
  const globalOnly = options.globalOnly === true;
  const agentOnly = options.agentOnly === true;
  const platformDefs = listPlatformTaxonomyDefinitions(projectRoot).map((definition) => ({
    ...definition,
    items: (definition.items || []).map((item) => ({ ...item, scope: "global" }))
  }));

  if (globalOnly || isAgentCmsCoreRoot(agentRoot, projectRoot)) {
    return platformDefs;
  }

  const agentDefs = listWorkspaceTaxonomies(agentRoot, projectRoot);

  if (agentOnly) {
    const merged = [];
    for (const preset of MERGE_CATALOG_PRESETS) {
      if (preset === "statuses") {
        const platformStatus = findTaxonomyDefinition(platformDefs, catalogPresetToTaxonomyKeys(preset));
        if (platformStatus) {
          merged.push({
            ...platformStatus,
            items: (platformStatus.items || []).map((item) => ({ ...item, scope: "global" }))
          });
        }
        continue;
      }
      const agentDef = findTaxonomyDefinition(agentDefs, catalogPresetToTaxonomyKeys(preset));
      if (!agentDef) continue;
      merged.push({
        ...agentDef,
        items: (agentDef.items || []).map((item) => ({ ...item, scope: "agent" }))
      });
    }
    for (const def of agentDefs) {
      const preset = taxonomyKeyToCatalogPreset(def.key, def.slug);
      if (MERGE_CATALOG_PRESETS.includes(preset)) continue;
      merged.push({
        ...def,
        items: (def.items || []).map((item) => ({ ...item, scope: "agent" }))
      });
    }
    return merged;
  }

  const byKey = new Map();
  for (const definition of platformDefs) {
    byKey.set(definition.key, { ...definition });
  }
  for (const definition of agentDefs) {
    const existing = byKey.get(definition.key);
    const agentItems = (definition.items || []).map((item) => ({ ...item, scope: "agent" }));
    if (existing) {
      byKey.set(definition.key, {
        ...existing,
        ...definition,
        name: definition.name || existing.name,
        description: definition.description || existing.description,
        storeRel: definition.storeRel || existing.storeRel,
        items: mergeTaxonomyCatalogItems(existing.items, agentItems)
      });
    } else {
      byKey.set(definition.key, {
        ...definition,
        items: agentItems
      });
    }
  }
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
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
