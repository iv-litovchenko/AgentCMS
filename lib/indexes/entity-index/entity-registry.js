const fs = require("fs/promises");
const path = require("path");
const yaml = require("js-yaml");
const { rel, abs } = require("../../paths/agent-cms");

const REGISTRY_REL = `${rel.settings.dir}/entity-registry.yml`;
const MODEL = "workspace-entity-registry-v1";

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function emptyRegistry() {
  return { version: 1, aliases: [], reject: [] };
}

function normalizeRegistry(raw) {
  const base = emptyRegistry();
  if (!raw || typeof raw !== "object") return base;
  const aliases = Array.isArray(raw.aliases) ? raw.aliases : [];
  const reject = Array.isArray(raw.reject) ? raw.reject : [];
  return {
    version: 1,
    aliases: aliases
      .map((row) => ({
        match: normalizeKey(row?.match ?? row?.alias ?? row?.from),
        label: String(row?.label || row?.to || "").trim(),
        type: String(row?.type || "topic").trim().toLowerCase()
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
  return { aliasMap, reject };
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
  if (isRejected(mention, registryIndex.reject)) return null;

  const key = normalizeKey(mention.label);
  const alias = registryIndex.aliasMap.get(key);
  if (!alias) return mention;
  return {
    ...mention,
    label: alias.label,
    type: alias.type || mention.type,
    source: `${mention.source}+alias`
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
    type: String(type || "topic").trim().toLowerCase()
  });
  return saveEntityRegistry(agentRoot, registry);
}

module.exports = {
  REGISTRY_REL,
  MODEL,
  loadEntityRegistry,
  saveEntityRegistry,
  buildRegistryIndex,
  applyRegistryToMention,
  addEntityAlias,
  normalizeKey
};
