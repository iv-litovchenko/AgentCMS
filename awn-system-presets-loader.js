const fs = require("fs");
const path = require("path");
const { loadYamlFileSync } = require("./awn-yaml-utils");
const {
  AGENT_SYSTEM_REL,
  getAgentCmsCoreAbsolute,
  resolveAgentRootAbsolute
} = require("./platform-sources");
const { normalizeSystemFileRequestName } = require("./manifest-paths");
const { AWN_DATA_DIR, getAwnDataRoot, loadAwnDataStores } = require("./awn-data-loader");

const PRESETS_REL = `${AGENT_SYSTEM_REL}/presets`;
const PRESETS_DIR_NAME = "presets";
const SYSTEM_PRESETS_STORE = "system-presets";
/** Как у типов: active и deprecated участвуют в runtime; draft/inactive — только в каталоге/меню. */
const PRESET_RUNTIME_STATUS = new Set(["active", "deprecated"]);

function normalizeTargetFile(name) {
  return normalizeSystemFileRequestName(String(name || "").trim());
}

function readPresetYamlField(parsed, ...keys) {
  if (!parsed || typeof parsed !== "object") return "";
  for (const key of keys) {
    const value = parsed[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function listPresetYamlFiles(presetsDir) {
  if (!presetsDir || !fs.existsSync(presetsDir)) return [];
  return fs
    .readdirSync(presetsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name) && entry.name !== "sort.yml")
    .map((entry) => path.join(presetsDir, entry.name));
}

function loadPresetSortOrder(presetsDir) {
  const sortPath = path.join(presetsDir, "sort.yml");
  if (!fs.existsSync(sortPath)) return [];
  try {
    const parsed = loadYamlFileSync(sortPath);
    const order = parsed?.sortOrder;
    return Array.isArray(order) ? order.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function loadPresetSortOrderFromJson(dataRoot) {
  const sortPath = path.join(dataRoot, SYSTEM_PRESETS_STORE, "sort.json");
  if (!fs.existsSync(sortPath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
    return Array.isArray(parsed) ? parsed.map((item) => String(item).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function presetYamlToDef(filePath, source) {
  try {
    const parsed = loadYamlFileSync(filePath);
    if (!parsed) return null;
    const slug = path.basename(filePath).replace(/\.ya?ml$/i, "");
    const targetFile = normalizeTargetFile(readPresetYamlField(parsed, "target-file", "targetFile"));
    const body = String(parsed.body || "").trim();
    if (!targetFile || !body) return null;

    const status = readPresetYamlField(parsed, "status") || "active";
    const relPath = `${PRESETS_DIR_NAME}/${slug}.yml`.replace(/\\/g, "/");
    const catalogFile = `${PRESETS_REL}/${slug}.yml`.replace(/\\/g, "/");

    return {
      id: readPresetYamlField(parsed, "id") || `awn.preset.${slug}`,
      slug,
      name: readPresetYamlField(parsed, "name", "title") || targetFile,
      targetFile,
      hintTitle: readPresetYamlField(parsed, "hint-title", "hintTitle", "name", "title"),
      hintText: readPresetYamlField(parsed, "hint-text", "hintText"),
      body,
      status,
      sort: Number(parsed.sort) || 0,
      relPath,
      catalogFile,
      filePath,
      source
    };
  } catch {
    return null;
  }
}

function presetRecordToDef(record, source) {
  if (!record) return null;
  const fm = record.frontmatter || {};
  const slug =
    String(record.id || path.basename(record.fileName || "", path.extname(record.fileName || ".md"))).trim() ||
    "";
  if (!slug) return null;

  const targetFile = normalizeTargetFile(
    readPresetYamlField(fm, "awn-target-file", "target-file", "targetFile")
  );
  const body = String(record.body || "").trim();
  if (!targetFile || !body) return null;

  const catalogFile = `${AWN_DATA_DIR}/${SYSTEM_PRESETS_STORE}/${slug}.md`.replace(/\\/g, "/");

  return {
    id: readPresetYamlField(fm, "awn-preset-id", "id") || `awn.preset.${slug}`,
    slug,
    name:
      readPresetYamlField(fm, "awn-title", "title", "name") ||
      String(record.title || slug).trim() ||
      targetFile,
    targetFile,
    hintTitle: readPresetYamlField(
      fm,
      "awn-hint-title",
      "hint-title",
      "hintTitle",
      "awn-title",
      "title",
      "name"
    ),
    hintText: readPresetYamlField(fm, "awn-hint-text", "hint-text", "hintText"),
    body,
    status: readPresetYamlField(fm, "awn-status", "status") || "active",
    sort: Number(fm["awn-sort"] ?? fm.sort) || 0,
    relPath: catalogFile,
    catalogFile,
    filePath: record.absPath || null,
    source
  };
}

function loadPresetsFromDir(presetsDir, source) {
  const bySlug = new Map();
  for (const filePath of listPresetYamlFiles(presetsDir)) {
    const preset = presetYamlToDef(filePath, source);
    if (!preset) continue;
    bySlug.set(preset.slug, preset);
  }
  return bySlug;
}

function findSystemPresetsStore(stores) {
  function walk(list) {
    for (const store of list || []) {
      if (
        store?.id === SYSTEM_PRESETS_STORE ||
        store?.relPath === SYSTEM_PRESETS_STORE ||
        String(store?.relPath || "").endsWith(`/${SYSTEM_PRESETS_STORE}`)
      ) {
        return store;
      }
      if (store?.kind === "group" && store.children?.length) {
        const nested = walk(store.children);
        if (nested) return nested;
      }
    }
    return null;
  }
  return walk(stores);
}

function loadPresetsFromAwnData(agentRoot, projectRoot, source) {
  const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
  if (!dataRoot || !fs.existsSync(dataRoot)) return new Map();

  const payload = loadAwnDataStores(agentRoot, projectRoot);
  const store = findSystemPresetsStore(payload.stores);
  if (!store || !Array.isArray(store.records)) return new Map();

  const bySlug = new Map();
  for (const record of store.records) {
    const preset = presetRecordToDef(record, source);
    if (!preset) continue;
    bySlug.set(preset.slug, preset);
  }
  return bySlug;
}

function mergePresetMaps(...maps) {
  const merged = new Map();
  for (const map of maps) {
    for (const [slug, preset] of map || []) {
      merged.set(slug, preset);
    }
  }
  return merged;
}

function orderPresets(presetMap, sortOrder = []) {
  const seen = new Set();
  const ordered = [];
  for (const slug of sortOrder) {
    const preset = presetMap.get(slug);
    if (!preset) continue;
    ordered.push(preset);
    seen.add(slug);
  }
  const rest = [...presetMap.values()]
    .filter((preset) => !seen.has(preset.slug))
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "ru") || a.slug.localeCompare(b.slug, "ru"));
  return [...ordered, ...rest];
}

function loadSystemFilePresets(projectRoot, agentRoot = "") {
  const coreRoot = getAgentCmsCoreAbsolute(projectRoot);
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot, projectRoot);
  const platformDir = path.join(coreRoot, PRESETS_REL);
  const agentDir = agentRootAbs ? path.join(agentRootAbs, PRESETS_REL) : "";

  const platformAwnData = loadPresetsFromAwnData(coreRoot, projectRoot, "platform");
  const agentAwnData =
    agentRootAbs && agentRootAbs !== coreRoot
      ? loadPresetsFromAwnData(agentRootAbs, projectRoot, "agent")
      : new Map();

  const platformYaml = loadPresetsFromDir(platformDir, "platform");
  const agentYaml =
    agentDir && agentDir !== platformDir ? loadPresetsFromDir(agentDir, "agent") : new Map();

  const merged = mergePresetMaps(platformAwnData, agentAwnData, platformYaml, agentYaml);

  const sortOrder = [
    ...loadPresetSortOrderFromJson(getAwnDataRoot(agentRootAbs || coreRoot, projectRoot) || ""),
    ...loadPresetSortOrderFromJson(getAwnDataRoot(coreRoot, projectRoot) || ""),
    ...loadPresetSortOrder(agentDir && fs.existsSync(path.join(agentDir, "sort.yml")) ? agentDir : platformDir),
    ...loadPresetSortOrder(platformDir)
  ];
  const uniqueSort = [...new Set(sortOrder)];

  const presets = orderPresets(merged, uniqueSort);
  return {
    presets,
    byTarget: buildPresetsByTarget(presets),
    presetsDir: path.join(getAwnDataRoot(coreRoot, projectRoot) || coreRoot, SYSTEM_PRESETS_STORE),
    agentPresetsDir: agentRootAbs
      ? path.join(getAwnDataRoot(agentRootAbs, projectRoot) || agentRootAbs, SYSTEM_PRESETS_STORE)
      : null,
    legacyPresetsDir: platformDir,
    agentLegacyPresetsDir: agentDir || null
  };
}

function buildPresetsByTarget(presets) {
  const byTarget = {};
  for (const preset of presets || []) {
    if (!PRESET_RUNTIME_STATUS.has(String(preset.status || "active").trim())) continue;
    byTarget[preset.targetFile] = {
      id: preset.id,
      targetFile: preset.targetFile,
      title: preset.name,
      hintTitle: preset.hintTitle || preset.name,
      hintText: preset.hintText || "",
      body: preset.body,
      relPath: preset.catalogFile,
      status: preset.status
    };
  }
  return byTarget;
}

function loadSystemFileTemplatesFromPresets(projectRoot, agentRoot = "") {
  return loadSystemFilePresets(projectRoot, agentRoot).byTarget;
}

function loadPresetsMenuItems(projectRoot, agentRoot = "") {
  const { presets } = loadSystemFilePresets(projectRoot, agentRoot);
  return presets.map((preset) => ({
    label: preset.name,
    path: preset.catalogFile,
    systemFile: true,
    presetId: preset.id,
    presetTargetFile: preset.targetFile,
    presetStatus: preset.status
  }));
}

module.exports = {
  PRESETS_REL,
  SYSTEM_PRESETS_STORE,
  PRESET_RUNTIME_STATUS,
  loadSystemFilePresets,
  loadSystemFileTemplatesFromPresets,
  loadPresetsMenuItems
};
