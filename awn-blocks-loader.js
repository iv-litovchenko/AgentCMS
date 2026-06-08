const fs = require("fs");
const path = require("path");
const { listYamlFilesSync, loadYamlFileSync } = require("./awn-yaml-utils");

const BLOCKS_GROUPS_FILE = "groups.yml";
const TYPES_BLOCKS_DIR = path.join("awn-types", "blocks");

const FALLBACK_BLOCK_GROUPS = [
  {
    id: "structure",
    title: "Структура",
    blocks: [
      {
        id: "awn.block.h2",
        name: "Заголовок H2",
        kind: "block",
        description: "Раздел второго уровня",
        template: "\n## Заголовок\n\nТекст раздела.\n\n"
      }
    ]
  }
];

function resolveBlocksContext(agentRoot = "", projectRoot = process.cwd()) {
  return {
    projectRoot: projectRoot || process.cwd(),
    agentRoot: String(agentRoot || "").trim()
  };
}

function resolveSystemBlocksDir(projectRoot) {
  return path.join(projectRoot, TYPES_BLOCKS_DIR);
}

function resolveAgentBlocksDir(agentRoot) {
  if (!agentRoot) return "";
  return path.join(agentRoot, "awn-types", "blocks");
}

function unescapeBlockTemplate(value) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
}

function normalizeBlockDef(parsed, filePath) {
  const rawId = String(parsed?.id || parsed?.name || "").trim();
  if (!rawId) return null;
  const id = rawId.startsWith("awn.") ? rawId : `awn.block.${rawId}`;
  const name = String(parsed?.name || parsed?.label || id).trim();
  const group = String(parsed?.group || "misc").trim();
  const sort = Number(parsed?.sort) || 0;
  const template = unescapeBlockTemplate(parsed?.template || parsed?.text || "");
  if (!template) return null;

  return {
    id,
    name,
    kind: "block",
    group,
    sort,
    description: parsed?.description || "",
    template
  };
}

function loadBlockGroupsFromDirectory(blocksDir) {
  const registry = {};
  if (!fs.existsSync(blocksDir)) return registry;

  for (const filePath of listYamlFilesSync(blocksDir)) {
    const fileName = path.basename(filePath);
    if (fileName === BLOCKS_GROUPS_FILE) continue;

    const parsed = loadYamlFileSync(filePath, { idKey: "id", nameKey: "name" });
    const block = normalizeBlockDef(parsed, filePath);
    if (block) registry[block.id] = block;
  }

  return registry;
}

function loadBlockGroupMeta(blocksDir) {
  const groupsPath = path.join(blocksDir, BLOCKS_GROUPS_FILE);
  if (!fs.existsSync(groupsPath)) {
    return { groupOrder: [], groupNames: {} };
  }
  const parsed = loadYamlFileSync(groupsPath, { idKey: "id", nameKey: "name" });
  const groupOrder = Array.isArray(parsed.groupOrder)
    ? parsed.groupOrder.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const groupNames =
    parsed.groupNames && typeof parsed.groupNames === "object" ? parsed.groupNames : {};
  return { groupOrder, groupNames };
}

function buildBlockGroups(blocksById, meta) {
  const grouped = new Map();
  for (const block of Object.values(blocksById)) {
    const groupId = block.group || "misc";
    if (!grouped.has(groupId)) grouped.set(groupId, []);
    grouped.get(groupId).push(block);
  }

  const seen = new Set();
  const orderedGroupIds = [];
  for (const groupId of meta.groupOrder || []) {
    if (grouped.has(groupId)) {
      orderedGroupIds.push(groupId);
      seen.add(groupId);
    }
  }
  for (const groupId of grouped.keys()) {
    if (!seen.has(groupId)) orderedGroupIds.push(groupId);
  }

  return orderedGroupIds.map((groupId) => ({
    id: groupId,
    title: meta.groupNames?.[groupId] || groupId,
    blocks: grouped
      .get(groupId)
      .slice()
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "ru"))
      .map((block) => ({
        id: block.id,
        label: block.name,
        name: block.name,
        kind: block.kind,
        description: block.description,
        text: block.template,
        template: block.template
      }))
  }));
}

function loadAgentBlocks(agentRoot = "", projectRoot = process.cwd()) {
  const { projectRoot: root, agentRoot: agent } = resolveBlocksContext(agentRoot, projectRoot);
  const systemDir = resolveSystemBlocksDir(root);
  const agentDir = resolveAgentBlocksDir(agent);

  const blocksById = loadBlockGroupsFromDirectory(systemDir);
  let meta = loadBlockGroupMeta(systemDir);

  if (agentDir && fs.existsSync(agentDir)) {
    const agentBlocks = loadBlockGroupsFromDirectory(agentDir);
    for (const [id, def] of Object.entries(agentBlocks)) {
      blocksById[id] = def;
    }
    const agentMeta = loadBlockGroupMeta(agentDir);
    if (agentMeta.groupOrder.length) meta = agentMeta;
  }

  if (!Object.keys(blocksById).length) {
    return { blockRegistry: {}, blockGroups: FALLBACK_BLOCK_GROUPS };
  }

  return {
    blockRegistry: blocksById,
    blockGroups: buildBlockGroups(blocksById, meta)
  };
}

function getBlockRegistry(agentRoot = "", projectRoot = process.cwd()) {
  return loadAgentBlocks(agentRoot, projectRoot).blockRegistry;
}

function getBlockGroups(agentRoot = "", projectRoot = process.cwd()) {
  return loadAgentBlocks(agentRoot, projectRoot).blockGroups;
}

module.exports = {
  loadAgentBlocks,
  getBlockRegistry,
  getBlockGroups,
  FALLBACK_BLOCK_GROUPS
};
