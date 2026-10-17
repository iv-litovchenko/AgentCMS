const fs = require("fs/promises");
const path = require("path");
const yaml = require("js-yaml");
const { rel, abs } = require("../../paths/agent-cms");

const REGISTRY_REL = `${rel.settings.dir}/entity-registry.yml`;
const MODEL = "workspace-entity-registry-v2";

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function slugTypeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04ff_-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function defaultTypes() {
  return [
    { id: "person", label: "Люди", tags: [], builtin: "person" },
    { id: "food", label: "Еда", tags: ["еда", "food"] },
    { id: "project", label: "Проекты", tags: [], builtin: "project" },
    { id: "topic", label: "Темы", tags: [], builtin: "topic" }
  ];
}

function emptyRegistry() {
  return {
    version: 2,
    types: defaultTypes(),
    seeds: [],
    aliases: [],
    reject: []
  };
}

function normalizeTypeRow(row) {
  const id = slugTypeId(row?.id || row?.label);
  if (!id) return null;
  const tagsRaw = row?.tags ?? row?.hashtags ?? [];
  const tags = (Array.isArray(tagsRaw) ? tagsRaw : String(tagsRaw).split(/[,;]+/))
    .map((t) => normalizeKey(t).replace(/^#+/, ""))
    .filter(Boolean);
  const builtin = String(row?.builtin || row?.mapBuiltin || "").trim().toLowerCase();
  return {
    id,
    label: String(row?.label || id).trim(),
    tags: [...new Set(tags)],
    builtin: builtin || undefined
  };
}

function normalizeSeedRow(row) {
  const label = String(row?.label || "").trim();
  const type = slugTypeId(row?.type || "topic");
  if (!label) return null;
  return { type, label };
}

function normalizeRegistry(raw) {
  const base = emptyRegistry();
  if (!raw || typeof raw !== "object") return base;

  let types = Array.isArray(raw.types) ? raw.types.map(normalizeTypeRow).filter(Boolean) : [];
  if (!types.length) types = defaultTypes();

  const seeds = Array.isArray(raw.seeds) ? raw.seeds.map(normalizeSeedRow).filter(Boolean) : [];
  const aliases = Array.isArray(raw.aliases) ? raw.aliases : [];
  const reject = Array.isArray(raw.reject) ? raw.reject : [];

  return {
    version: 2,
    types,
    seeds,
    aliases: aliases
      .map((row) => ({
        match: normalizeKey(row?.match ?? row?.alias ?? row?.from),
        label: String(row?.label || row?.to || "").trim(),
        type: slugTypeId(row?.type || "topic")
      }))
      .filter((row) => row.match && row.label),
    reject: reject
      .map((row) => ({
        type: String(row?.type || "*").trim().toLowerCase(),
        label: normalizeKey(row?.label ?? row?.match)
      }))
      .filter((row) => row.label)
  };
}

function registryAbs(agentRoot) {
  return abs(agentRoot, REGISTRY_REL);
}

async function loadEntityRegistry(agentRoot) {
  const filePath = registryAbs(agentRoot);
  try {
    const text = await fs.readFile(filePath, "utf-8");
    const parsed = yaml.load(text);
    return normalizeRegistry(parsed);
  } catch (error) {
    if (error && error.code === "ENOENT") return emptyRegistry();
    throw error;
  }
}

async function saveEntityRegistry(agentRoot, registry) {
  const filePath = registryAbs(agentRoot);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const payload = normalizeRegistry(registry);
  const text = yaml.dump(payload, { lineWidth: 100, noRefs: true });
  await fs.writeFile(filePath, `# ${MODEL}\n${text}`, "utf-8");
  return { ok: true, path: REGISTRY_REL, ...payload };
}

function buildRegistryIndex(registry) {
  const aliasMap = new Map();
  for (const row of registry.aliases || []) {
    aliasMap.set(row.match, { label: row.label, type: row.type });
  }
  const reject = (registry.reject || []).map((row) => ({
    type: row.type,
    label: row.label
  }));

  const tagToType = new Map();
  const builtinRemap = new Map();
  for (const typeRow of registry.types || []) {
    for (const tag of typeRow.tags || []) {
      tagToType.set(normalizeKey(tag), typeRow.id);
    }
    if (typeRow.builtin && typeRow.builtin !== typeRow.id) {
      builtinRemap.set(typeRow.builtin, typeRow.id);
    }
  }

  return { aliasMap, reject, tagToType, builtinRemap, seeds: registry.seeds || [] };
}

function applyTypeRules(mention, registryIndex) {
  if (!mention || !registryIndex) return mention;
  let next = mention;
  const labelKey = normalizeKey(next.label);
  const fromTag = registryIndex.tagToType?.get(labelKey);
  if (fromTag) {
    next = { ...next, type: fromTag, source: `${next.source}+typeTag` };
  } else if (next.type === "tag" && fromTag) {
    next = { ...next, type: fromTag, source: `${next.source}+typeTag` };
  }
  const fromBuiltin = registryIndex.builtinRemap?.get(next.type);
  if (fromBuiltin) {
    next = { ...next, type: fromBuiltin, source: `${next.source}+typeBuiltin` };
  }
  return next;
}

function isRejected(mention, rejectList) {
  const labelNorm = normalizeKey(mention.label);
  const type = String(mention.type || "").toLowerCase();
  for (const rule of rejectList) {
    if (rule.label !== labelNorm) continue;
    if (rule.type === "*" || rule.type === type) return true;
  }
  return false;
}

function applyRegistryToMention(mention, registryIndex) {
  if (!mention || !registryIndex) return mention;
  let next = applyTypeRules(mention, registryIndex);
  if (isRejected(next, registryIndex.reject)) return null;

  const key = normalizeKey(next.label);
  const alias = registryIndex.aliasMap.get(key);
  if (!alias) return next;
  return {
    ...next,
    label: alias.label,
    type: alias.type || next.type,
    source: `${next.source}+alias`
  };
}

async function addEntityAlias(agentRoot, { match, label, type = "person" }) {
  const registry = await loadEntityRegistry(agentRoot);
  const key = normalizeKey(match);
  if (!key || !String(label || "").trim()) {
    throw new Error("match and label are required");
  }
  registry.aliases = (registry.aliases || []).filter((row) => row.match !== key);
  registry.aliases.push({
    match: key,
    label: String(label).trim(),
    type: slugTypeId(type)
  });
  return saveEntityRegistry(agentRoot, registry);
}

async function addEntityReject(agentRoot, { label, type = "*" }) {
  const registry = await loadEntityRegistry(agentRoot);
  const key = normalizeKey(label);
  if (!key) throw new Error("label is required");
  const rejectType = String(type || "*").trim().toLowerCase();
  registry.reject = (registry.reject || []).filter(
    (row) => !(row.label === key && String(row.type).toLowerCase() === rejectType)
  );
  registry.reject.push({ label: key, type: rejectType });
  return saveEntityRegistry(agentRoot, registry);
}

async function addEntitySeed(agentRoot, { label, type = "topic" }) {
  const registry = await loadEntityRegistry(agentRoot);
  const seed = normalizeSeedRow({ label, type });
  if (!seed) throw new Error("label is required");
  registry.seeds = (registry.seeds || []).filter(
    (row) => !(normalizeKey(row.label) === normalizeKey(seed.label) && row.type === seed.type)
  );
  registry.seeds.push(seed);
  return saveEntityRegistry(agentRoot, registry);
}

async function upsertEntityType(agentRoot, { id, label, tags, builtin }) {
  const registry = await loadEntityRegistry(agentRoot);
  const row = normalizeTypeRow({ id, label, tags, builtin });
  if (!row) throw new Error("id and label are required");
  registry.types = (registry.types || []).filter((t) => t.id !== row.id);
  registry.types.push(row);
  return saveEntityRegistry(agentRoot, registry);
}

module.exports = {
  REGISTRY_REL,
  MODEL,
  defaultTypes,
  loadEntityRegistry,
  saveEntityRegistry,
  buildRegistryIndex,
  applyRegistryToMention,
  applyTypeRules,
  addEntityAlias,
  addEntityReject,
  addEntitySeed,
  upsertEntityType,
  normalizeKey,
  slugTypeId,
  emptyRegistry
};
