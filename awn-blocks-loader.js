const fs = require("fs");
const path = require("path");
const {
  loadBlocksFromCatalog,
  loadBlockGroupsFromCatalog
} = require("./type-catalog-loader");
const {
  getActiveComponents,
  loadComponentRegistry
} = require("./components-loader");

const BLOCKS_GROUPS_FILE = "groups.yml";
const { getComponentsAbsolute } = require("./platform-sources");

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

function unescapeBlockTemplate(value) {
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
}

function normalizeBlockDef(schema, component) {
  const rawId = String(schema?.id || component?.runtimeId || "").trim();
  if (!rawId) return null;
  const id = rawId.startsWith("awn.") ? rawId : `awn.block.${rawId}`;
  const name = String(schema?.name || component?.name || id).trim();
  const group = String(schema?.group || "misc").trim();
  const sort = Number(schema?.sort) || 0;
  const template = unescapeBlockTemplate(schema?.template || schema?.text || "");
  if (!template) return null;

  return {
    id,
    name,
    kind: "block",
    group,
    sort,
    description: schema?.description || component?.description || "",
    icon: String(schema?.icon || schema?.emoji || "").trim(),
    template,
    componentId: component?.id || null
  };
}

function loadBlockGroupMeta(componentsRoot) {
  const groupsPath = path.join(componentsRoot, "markdown-blocks", BLOCKS_GROUPS_FILE);
  if (!fs.existsSync(groupsPath)) {
    return { groupOrder: [], groupNames: {} };
  }
  const { loadYamlFileSync } = require("./awn-yaml-utils");
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
        icon: block.icon || "",
        text: block.template,
        template: block.template,
        componentId: block.componentId || null
      }))
  }));
}

function loadBlocksFromComponents(projectRoot, agentRoot) {
  const blocksById = {};
  const components = getActiveComponents(projectRoot, agentRoot, "block");

  for (const component of components) {
    if (component.id.endsWith("/_base")) continue;
    const schema = component.mergedSchema || component.schema || {};
    const block = normalizeBlockDef(schema, component);
    if (block) blocksById[block.id] = block;
  }

  return blocksById;
}

function loadAgentBlocks(agentRoot = "", projectRoot = process.cwd()) {
  const { projectRoot: root, agentRoot: agent } = resolveBlocksContext(agentRoot, projectRoot);
  let blocksById = loadBlocksFromCatalog(root, agent);
  let meta = loadBlockGroupsFromCatalog(root, agent);

  if (!Object.keys(blocksById).length) {
    blocksById = loadBlocksFromComponents(root, agent);
    meta = loadBlockGroupMeta(getComponentsAbsolute(root));
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
