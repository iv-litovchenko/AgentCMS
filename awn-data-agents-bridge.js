const fs = require("fs");
const path = require("path");
const { getAgentCmsCoreAbsolute } = require("./platform-sources");
const {
  AWN_DATA_DIR,
  SCHEMA_FILE,
  getAwnDataPayload,
  ensureAwnDataBase
} = require("./awn-data-loader");

const AGENT_REGISTRY_GROUP = "agent-registry";
const AGENTS_STORE_ID = "agent-registry/agents";
const AGENT_GROUPS_STORE_ID = "agent-registry/agent-groups";
const UNGROUPED_RECORD_ID = "_ungrouped";

function nowIsoMinute() {
  return new Date().toISOString().slice(0, 16);
}

function yamlScalar(value) {
  const text = String(value ?? "").trim();
  if (!text) return '""';
  if (/^[a-z0-9._/-]+$/i.test(text) && !text.includes(" ")) return text;
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
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

function getPlatformAwnDataRoot(projectRoot) {
  const coreRoot = getAgentCmsCoreAbsolute(projectRoot);
  return path.join(coreRoot, AWN_DATA_DIR);
}

function getStoreAbsolute(projectRoot, storeId) {
  const dataRoot = getPlatformAwnDataRoot(projectRoot);
  const abs = path.join(dataRoot, storeId);
  if (!abs.startsWith(dataRoot)) return null;
  return abs;
}

function storeHasRecords(projectRoot, storeId) {
  const payload = getAwnDataPayload(getAgentCmsCoreAbsolute(projectRoot), projectRoot, storeId);
  return Boolean(payload.store?.records?.length);
}

function listStoreRecordFiles(storeAbs) {
  if (!storeAbs || !fs.existsSync(storeAbs)) return [];
  return fs
    .readdirSync(storeAbs, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md") && entry.name !== "manifest.md")
    .map((entry) => path.join(storeAbs, entry.name));
}

function writeRecordFile(absPath, frontmatterLines, body = "") {
  const lines = ["---", ...frontmatterLines, "---", ""];
  if (body) lines.push(body);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, `${lines.join("\n")}\n`, "utf-8");
}

function readExistingTimestamps(absPath) {
  if (!fs.existsSync(absPath)) return { created: null, updated: null };
  try {
    const raw = fs.readFileSync(absPath, "utf-8");
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return { created: null, updated: null };
    const created = match[1].match(/^created:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") || null;
    const updated = match[1].match(/^updated:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "") || null;
    return { created, updated };
  } catch {
    return { created: null, updated: null };
  }
}

function syncSortJson(storeAbs, ids) {
  const sortPath = path.join(storeAbs, "sort.json");
  const order = ids.filter((id) => id !== UNGROUPED_RECORD_ID);
  fs.writeFileSync(sortPath, `${JSON.stringify(order, null, 2)}\n`, "utf-8");
}

function appendRootSortEntry(dataRoot, storeId) {
  const sortPath = path.join(dataRoot, "sort.json");
  let order = [];
  if (fs.existsSync(sortPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
      if (Array.isArray(parsed)) order = parsed.map(String);
    } catch {
      order = [];
    }
  }
  if (!order.includes(storeId)) {
    order.push(storeId);
    fs.writeFileSync(sortPath, `${JSON.stringify(order, null, 2)}\n`, "utf-8");
  }
}

function loadRegistryEntriesFromAwnData(projectRoot) {
  if (!storeHasRecords(projectRoot, AGENTS_STORE_ID)) return null;

  const payload = getAwnDataPayload(getAgentCmsCoreAbsolute(projectRoot), projectRoot, AGENTS_STORE_ID);
  const records = payload.store?.records || [];
  if (!records.length) return null;

  return records
    .map((record) => {
      const fm = record.frontmatter || {};
      const agentPath = String(fm.path || "").trim();
      if (!agentPath) return null;
      const entry = {
        path: agentPath,
        environment: String(fm.environment || "local").trim() || "local"
      };
      if (parseBool(fm.default)) entry.default = true;
      if (parseBool(fm.orchestrator)) entry.orchestrator = true;
      return entry;
    })
    .filter(Boolean);
}

function saveRegistryEntriesToAwnData(projectRoot, normalizedAgents) {
  const coreRoot = getAgentCmsCoreAbsolute(projectRoot);
  const dataRoot = ensureAwnDataBase(coreRoot, projectRoot);
  const storeAbs = getStoreAbsolute(projectRoot, AGENTS_STORE_ID);
  if (!storeAbs || !fs.existsSync(path.join(storeAbs, SCHEMA_FILE))) {
    throw new Error("awn-database store agents not found");
  }

  const keepIds = new Set();
  for (const agent of normalizedAgents) {
    const id = String(agent.id || "").trim();
    if (!id) continue;
    keepIds.add(id);

    const absFile = path.join(storeAbs, `${id}.md`);
    const { created } = readExistingTimestamps(absFile);
    const ts = nowIsoMinute();
    const title = String(agent.name || id).trim();

    writeRecordFile(
      absFile,
      [
        `id: ${yamlScalar(id)}`,
        `created: ${yamlScalar(created || ts)}`,
        `updated: ${yamlScalar(ts)}`,
        `title: ${yamlScalar(title)}`,
        `path: ${yamlScalar(agent.path)}`,
        `environment: ${yamlScalar(agent.environment || "local")}`,
        ...(agent.default ? ["default: true"] : []),
        ...(agent.orchestrator ? ["orchestrator: true"] : [])
      ],
      `Workspace **${title}** · \`${agent.path}\``
    );
  }

  for (const absFile of listStoreRecordFiles(storeAbs)) {
    const id = path.basename(absFile, ".md");
    if (!keepIds.has(id)) {
      try {
        fs.unlinkSync(absFile);
      } catch {
        // ignore
      }
    }
  }

  syncSortJson(storeAbs, normalizedAgents.map((a) => a.id));
  appendRootSortEntry(dataRoot, AGENT_REGISTRY_GROUP);
}

function loadGroupsFromAwnData(projectRoot) {
  if (!storeHasRecords(projectRoot, AGENT_GROUPS_STORE_ID)) return null;

  const payload = getAwnDataPayload(getAgentCmsCoreAbsolute(projectRoot), projectRoot, AGENT_GROUPS_STORE_ID);
  const records = payload.store?.records || [];
  if (!records.length) return null;

  let ungrouped = null;
  const groups = [];

  for (const record of records) {
    const fm = record.frontmatter || {};
    const id = String(record.id || fm.id || "").trim();
    if (!id) continue;

    if (id === UNGROUPED_RECORD_ID || parseBool(fm.system)) {
      ungrouped = {
        background: String(fm.background || "").trim() || null,
        appearance: String(fm.appearance || "light").trim() === "dark" ? "dark" : "light"
      };
      continue;
    }

    groups.push({
      id,
      title: String(fm.title || record.title || id).trim() || id,
      agentIds: parseCsv(fm.agentIds),
      background: String(fm.background || "").trim() || null,
      appearance: String(fm.appearance || "light").trim() === "dark" ? "dark" : "light"
    });
  }

  return {
    groups,
    ungrouped: ungrouped || { background: null, appearance: "light" }
  };
}

function saveGroupsToAwnData(projectRoot, groups, ungrouped) {
  const coreRoot = getAgentCmsCoreAbsolute(projectRoot);
  const dataRoot = ensureAwnDataBase(coreRoot, projectRoot);
  const storeAbs = getStoreAbsolute(projectRoot, AGENT_GROUPS_STORE_ID);
  if (!storeAbs || !fs.existsSync(path.join(storeAbs, SCHEMA_FILE))) {
    throw new Error("awn-database store agent-groups not found");
  }

  const keepIds = new Set([UNGROUPED_RECORD_ID]);
  const ts = nowIsoMinute();

  for (const group of groups) {
    const id = String(group.id || "").trim();
    if (!id || id === UNGROUPED_RECORD_ID) continue;
    keepIds.add(id);

    const absFile = path.join(storeAbs, `${id}.md`);
    const { created } = readExistingTimestamps(absFile);
    const agentIds = Array.isArray(group.agentIds) ? group.agentIds.join(", ") : "";
    const lines = [
      `id: ${yamlScalar(id)}`,
      `created: ${yamlScalar(created || ts)}`,
      `updated: ${yamlScalar(ts)}`,
      `title: ${yamlScalar(group.title || id)}`
    ];
    if (agentIds) lines.push(`agentIds: ${yamlScalar(agentIds)}`);
    if (group.background) lines.push(`background: ${yamlScalar(group.background)}`);
    if (group.appearance === "dark") lines.push("appearance: dark");

    writeRecordFile(absFile, lines, `Группа **${group.title || id}**.`);
  }

  const ungroupedAbs = path.join(storeAbs, `${UNGROUPED_RECORD_ID}.md`);
  const { created: ungroupedCreated } = readExistingTimestamps(ungroupedAbs);
  const ungroupedLines = [
    `id: ${yamlScalar(UNGROUPED_RECORD_ID)}`,
    `created: ${yamlScalar(ungroupedCreated || ts)}`,
    `updated: ${yamlScalar(ts)}`,
    `title: ${yamlScalar("Без группы")}`,
    "system: true"
  ];
  const ungroupedData = ungrouped || {};
  if (ungroupedData.background) ungroupedLines.push(`background: ${yamlScalar(ungroupedData.background)}`);
  if (ungroupedData.appearance === "dark") ungroupedLines.push("appearance: dark");
  writeRecordFile(ungroupedAbs, ungroupedLines, "Настройки агентов без группы.");

  for (const absFile of listStoreRecordFiles(storeAbs)) {
    const id = path.basename(absFile, ".md");
    if (!keepIds.has(id)) {
      try {
        fs.unlinkSync(absFile);
      } catch {
        // ignore
      }
    }
  }

  syncSortJson(storeAbs, [...groups.map((g) => g.id), UNGROUPED_RECORD_ID]);
  appendRootSortEntry(dataRoot, AGENT_REGISTRY_GROUP);
}

module.exports = {
  AGENT_REGISTRY_GROUP,
  AGENTS_STORE_ID,
  AGENT_GROUPS_STORE_ID,
  UNGROUPED_RECORD_ID,
  loadRegistryEntriesFromAwnData,
  saveRegistryEntriesToAwnData,
  loadGroupsFromAwnData,
  saveGroupsToAwnData,
  storeHasRecords
};
