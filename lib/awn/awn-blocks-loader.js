const {
  loadBlocksFromCatalog,
  loadBlockGroupsFromCatalog
} = require("../catalog/type-catalog-loader");
const {
  getAgentCmsCoreAbsolute,
  agentSystemDirExists,
  resolveAgentRootAbsolute
} = require("../platform/platform-sources");

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
        icon: "2️⃣",
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
        icon: block.icon || "",
        text: block.template,
        template: block.template,
        render: block.render || "template",
        fenceTag: block.fenceTag || "",
        renderer: block.renderer || "",
        storeRel: block.storeRel || null
      }))
  }));
}

function shouldPreferCatalogBlocks(projectRoot, agentRoot) {
  const coreRoot = getAgentCmsCoreAbsolute(projectRoot);
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot, projectRoot);
  return agentSystemDirExists(coreRoot) || Boolean(agentRootAbs && agentSystemDirExists(agentRootAbs));
}

function loadAgentBlocks(agentRoot = "", projectRoot = process.cwd()) {
  const { projectRoot: root, agentRoot: agent } = resolveBlocksContext(agentRoot, projectRoot);

  if (shouldPreferCatalogBlocks(root, agent)) {
    const blocksById = loadBlocksFromCatalog(root, agent);
    if (blocksById && Object.keys(blocksById).length) {
      const meta = loadBlockGroupsFromCatalog(root, agent) || { groupOrder: [], groupNames: {} };
      return {
        blockRegistry: blocksById,
        blockGroups: buildBlockGroups(blocksById, meta)
      };
    }
  }

  return { blockRegistry: {}, blockGroups: FALLBACK_BLOCK_GROUPS };
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
