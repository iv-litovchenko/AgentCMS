const {
  REGISTRY_QUERIES_PRESETS_KEY,
  loadRegistryQueriesCatalog,
  catalogToPresetItems,
  writeRegistryQueriesFromPresets,
  getBuiltinRegistryQueryPresetsUi,
  queryObjectToPresetText,
  DEFAULT_REGISTRY_QUERIES
} = require("./registry-queries");

function isRegistryQueryPresetsEmpty(value) {
  return !Array.isArray(value) || value.length === 0;
}

function normalizeRegistryQueryPresets(raw) {
  if (isRegistryQueryPresetsEmpty(raw)) {
    return getBuiltinRegistryQueryPresetsUi();
  }
  const out = [];
  const seen = new Set();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const name = String(item.name || "").trim();
    if (!name) continue;
    let id = String(item.id || "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
    if (!id) id = `query-${out.length + 1}`;
    while (seen.has(id)) id = `${id}-${out.length + 1}`;
    seen.add(id);
    const builtin = DEFAULT_REGISTRY_QUERIES.find((q) => q.id === id);
    let query = String(item.query ?? "").trim();
    if (!query && builtin?.query) {
      query = queryObjectToPresetText(builtin.query);
    }
    const description = String(item.description || item.comment || builtin?.comment || "").trim();
    out.push({ id, name, description, query });
  }
  return out.length ? out : getBuiltinRegistryQueryPresetsUi();
}

function resolveEffectiveRegistryQueryPresets(raw) {
  return normalizeRegistryQueryPresets(raw);
}

async function hydrateWorkspaceRegistryQueryPresets(agentRoot, awnSettings = {}) {
  const out = { ...(awnSettings && typeof awnSettings === "object" ? awnSettings : {}) };
  const workspaceValue = out[REGISTRY_QUERIES_PRESETS_KEY];

  if (!isRegistryQueryPresetsEmpty(workspaceValue)) {
    out[REGISTRY_QUERIES_PRESETS_KEY] = normalizeRegistryQueryPresets(workspaceValue);
    return out;
  }

  if (agentRoot) {
    try {
      const catalog = await loadRegistryQueriesCatalog(agentRoot);
      const fromFile = catalogToPresetItems(catalog);
      if (!isRegistryQueryPresetsEmpty(fromFile)) {
        out[REGISTRY_QUERIES_PRESETS_KEY] = fromFile;
        return out;
      }
    } catch {
      // fall through
    }
  }

  out[REGISTRY_QUERIES_PRESETS_KEY] = getBuiltinRegistryQueryPresetsUi();
  return out;
}

async function syncRegistryQueriesFileFromWorkspacePresets(agentRoot, presets) {
  if (!agentRoot) return null;
  const normalized = normalizeRegistryQueryPresets(presets);
  return writeRegistryQueriesFromPresets(agentRoot, normalized);
}

module.exports = {
  REGISTRY_QUERIES_PRESETS_KEY,
  isRegistryQueryPresetsEmpty,
  normalizeRegistryQueryPresets,
  resolveEffectiveRegistryQueryPresets,
  getBuiltinRegistryQueryPresetsUi,
  hydrateWorkspaceRegistryQueryPresets,
  syncRegistryQueriesFileFromWorkspacePresets
};
