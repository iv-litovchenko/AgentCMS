const fs = require("fs");
const path = require("path");
const { PROJECT_ROOT } = require("./paths/agent-cms");
const {
  loadRegistryEntriesFromAwnData,
  loadGroupsFromAwnData
} = require("./awn-data-agents-bridge");

const WS_LIST_VERSION = 1;
const LEGACY_AGENTS_REGISTRY_FILE = "awn-agents.json";
const UNGROUPED_GROUP_ID = "__ungrouped__";

function getAgentCmsDirAbsolute(projectRoot) {
  return path.join(projectRoot || process.cwd(), PROJECT_ROOT);
}

function getWsListAgentsAbsolute(projectRoot) {
  return path.join(getAgentCmsDirAbsolute(projectRoot), "ws-list-agents.json");
}

function getWsListGroupsAbsolute(projectRoot) {
  return path.join(getAgentCmsDirAbsolute(projectRoot), "ws-list-groups.json");
}

function ensureAgentCmsDir(projectRoot) {
  const dir = getAgentCmsDirAbsolute(projectRoot);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function parseBool(raw) {
  const value = String(raw ?? "").trim().toLowerCase();
  return value === "true" || value === "yes" || value === "1";
}

function parseCsv(raw) {
  return String(raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readJsonFile(absPath) {
  if (!absPath || !fs.existsSync(absPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absPath, "utf-8"));
  } catch {
    return null;
  }
}

function writeJsonFile(absPath, payload) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

function normalizeRegistryEntry(raw) {
  const agentPath = String(raw?.path || "").trim();
  if (!agentPath) return null;
  const entry = {
    path: agentPath,
    environment: String(raw?.environment || "local").trim() || "local"
  };
  if (parseBool(raw?.default)) entry.default = true;
  if (parseBool(raw?.orchestrator)) entry.orchestrator = true;
  return entry;
}

function loadAgentsFromLegacyRootJson(projectRoot) {
  const registryPath = path.join(projectRoot || process.cwd(), LEGACY_AGENTS_REGISTRY_FILE);
  const parsed = readJsonFile(registryPath);
  if (!parsed || !Array.isArray(parsed.agents)) return null;
  const agents = parsed.agents.map(normalizeRegistryEntry).filter(Boolean);
  return agents.length ? agents : null;
}

function mapWsListAgentRecord(raw) {
  const id = String(raw?.id || "").trim();
  const entry = normalizeRegistryEntry(raw);
  if (!entry) return null;
  if (id) entry.id = id;
  return entry;
}

function loadRegistryEntriesFromWsList(projectRoot) {
  const parsed = readJsonFile(getWsListAgentsAbsolute(projectRoot));
  if (!parsed || !Array.isArray(parsed.agents) || !parsed.agents.length) return null;
  const agents = parsed.agents.map(mapWsListAgentRecord).filter(Boolean);
  return agents.length ? agents : null;
}

function loadRegistryEntriesWithMigration(projectRoot) {
  const root = projectRoot || process.cwd();

  const fromWsList = loadRegistryEntriesFromWsList(root);
  if (fromWsList) return fromWsList;

  let legacy = null;
  try {
    legacy = loadRegistryEntriesFromAwnData(root);
  } catch {
    legacy = null;
  }
  if (!legacy?.length) {
    legacy = loadAgentsFromLegacyRootJson(root);
  }
  if (!legacy?.length) return null;

  saveRegistryEntriesToWsList(
    root,
    legacy.map((entry, index) => ({
      id: entry.id || deriveAgentIdFromPath(entry.path, index),
      path: entry.path,
      environment: entry.environment,
      default: entry.default,
      orchestrator: entry.orchestrator
    }))
  );
  return legacy;
}

function deriveAgentIdFromPath(agentPath, fallbackIndex = 0) {
  const cleaned = String(agentPath || "")
    .trim()
    .replace(/[\\/]+$/, "");
  const folderName = path.basename(cleaned);
  const slug = String(folderName || "")
    .trim()
    .toLowerCase();
  return slug || `agent-${fallbackIndex + 1}`;
}

function saveRegistryEntriesToWsList(projectRoot, normalizedAgents) {
  ensureAgentCmsDir(projectRoot);
  const agents = (Array.isArray(normalizedAgents) ? normalizedAgents : [])
    .map((agent, index) => {
      const agentPath = String(agent?.path || "").trim();
      if (!agentPath) return null;
      const id = String(agent?.id || "").trim() || deriveAgentIdFromPath(agentPath, index);
      const item = {
        id,
        path: agentPath,
        environment: String(agent?.environment || "local").trim() || "local"
      };
      if (parseBool(agent?.default)) item.default = true;
      if (parseBool(agent?.orchestrator)) item.orchestrator = true;
      return item;
    })
    .filter(Boolean);

  writeJsonFile(getWsListAgentsAbsolute(projectRoot), {
    version: WS_LIST_VERSION,
    agents
  });
}

function normalizeGroupRecord(raw, index) {
  const id = String(raw?.id || "").trim();
  if (!id || id === UNGROUPED_GROUP_ID) return null;
  const title = String(raw?.title || raw?.name || id).trim() || id;
  const agentIds = Array.isArray(raw?.agentIds)
    ? raw.agentIds.map((value) => String(value || "").trim()).filter(Boolean)
    : parseCsv(raw?.agentIds);
  const appearance = String(raw?.appearance || "light").trim() === "dark" ? "dark" : "light";
  return {
    id,
    title,
    agentIds: [...new Set(agentIds)],
    appearance
  };
}

function normalizeUngroupedRecord(raw) {
  const appearance = String(raw?.appearance || "light").trim() === "dark" ? "dark" : "light";
  return { appearance };
}

function loadGroupsFromWsList(projectRoot) {
  const parsed = readJsonFile(getWsListGroupsAbsolute(projectRoot));
  if (!parsed) return null;

  const groups = Array.isArray(parsed.groups)
    ? parsed.groups.map(normalizeGroupRecord).filter(Boolean)
    : [];
  const ungrouped = normalizeUngroupedRecord(parsed.ungrouped || {});

  if (!groups.length && !parsed.ungrouped) return null;
  return { groups, ungrouped };
}

function loadGroupsWithMigration(projectRoot) {
  const root = projectRoot || process.cwd();

  const fromWsList = loadGroupsFromWsList(root);
  if (fromWsList) return fromWsList;

  let legacy = null;
  try {
    legacy = loadGroupsFromAwnData(root);
  } catch {
    legacy = null;
  }
  if (!legacy) return null;

  saveGroupsToWsList(root, legacy.groups, legacy.ungrouped);
  return legacy;
}

function saveGroupsToWsList(projectRoot, groups, ungrouped) {
  ensureAgentCmsDir(projectRoot);
  const normalizedGroups = (Array.isArray(groups) ? groups : [])
    .map((group, index) => normalizeGroupRecord(group, index))
    .filter(Boolean);

  writeJsonFile(getWsListGroupsAbsolute(projectRoot), {
    version: WS_LIST_VERSION,
    groups: normalizedGroups,
    ungrouped: normalizeUngroupedRecord(ungrouped || {})
  });
}

module.exports = {
  WS_LIST_VERSION,
  LEGACY_AGENTS_REGISTRY_FILE,
  UNGROUPED_GROUP_ID,
  getWsListAgentsAbsolute,
  getWsListGroupsAbsolute,
  loadRegistryEntriesFromWsList,
  loadRegistryEntriesWithMigration,
  saveRegistryEntriesToWsList,
  loadGroupsFromWsList,
  loadGroupsWithMigration,
  saveGroupsToWsList
};
