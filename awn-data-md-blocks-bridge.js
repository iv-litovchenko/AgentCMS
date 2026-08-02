const { getAgentCmsCoreAbsolute } = require("./platform-sources");
const { getAwnDataPayload } = require("./awn-data-loader");

const BLOCKS_STORE_REL = "markdown-blocks/blocks";
const GROUPS_STORE_REL = "markdown-blocks/groups";
const ACTIVE_STATUS = new Set(["active"]);

function getPlatformAgentRoot(projectRoot) {
  return getAgentCmsCoreAbsolute(projectRoot);
}

function unescapeTemplate(value) {
  if (value && typeof value === "object") return "";
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .trim();
}

function isBlockRecordActive(record) {
  const status = String(record?.frontmatter?.status || "active").trim().toLowerCase();
  return ACTIVE_STATUS.has(status);
}

function recordToBlockDef(record) {
  if (!record || !isBlockRecordActive(record)) return null;
  const fm = record.frontmatter || {};
  const blockId = String(fm.blockId || "").trim();
  if (!blockId) return null;
  const template = unescapeTemplate(record.body || "");
  if (!template) return null;

  return {
    id: blockId,
    name: String(fm.title || record.title || blockId).trim(),
    kind: "block",
    group: String(fm.group || "misc").trim(),
    sort: Number(fm.sort) || 0,
    description: String(fm.description || "").trim(),
    icon: String(fm.icon || "").trim(),
    template,
    render: String(fm.render || "template").trim(),
    fenceTag: String(fm.fenceTag || fm["fence-tag"] || "").trim(),
    renderer: String(fm.renderer || "").trim(),
    storeRel: `${BLOCKS_STORE_REL}/${record.fileName || `${record.id}.md`}`.replace(/\\/g, "/")
  };
}

function loadMdBlocksFromAwnData(projectRoot) {
  const agentRoot = getPlatformAgentRoot(projectRoot);
  if (!agentRoot) return null;

  const payload = getAwnDataPayload(agentRoot, projectRoot, BLOCKS_STORE_REL);
  const records = payload.store?.records || [];
  if (!records.length) return null;

  const blocksById = {};
  for (const record of records) {
    const block = recordToBlockDef(record);
    if (block) blocksById[block.id] = block;
  }

  return Object.keys(blocksById).length ? blocksById : null;
}

function loadMdBlockGroupsMetaFromAwnData(projectRoot) {
  const agentRoot = getPlatformAgentRoot(projectRoot);
  if (!agentRoot) return null;

  const payload = getAwnDataPayload(agentRoot, projectRoot, GROUPS_STORE_REL);
  const records = payload.store?.records || [];
  if (!records.length) return null;

  const sortOrder = payload.store?.sortOrder;
  const byId = new Map();
  for (const record of records) {
    const id = String(record.id || record.frontmatter?.id || "").trim();
    if (!id) continue;
    const status = String(record.frontmatter?.status || "active").trim().toLowerCase();
    if (!ACTIVE_STATUS.has(status)) continue;
    byId.set(id, {
      id,
      title: String(record.frontmatter?.title || record.title || id).trim(),
      sort: Number(record.frontmatter?.sort) || 0
    });
  }

  let ordered = [...byId.values()];
  if (Array.isArray(sortOrder) && sortOrder.length) {
    ordered = sortOrder
      .map((id) => byId.get(String(id)))
      .filter(Boolean);
    for (const entry of byId.values()) {
      if (!ordered.some((item) => item.id === entry.id)) ordered.push(entry);
    }
  } else {
    ordered.sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title, "ru"));
  }

  return {
    groupOrder: ordered.map((entry) => entry.id),
    groupNames: Object.fromEntries(ordered.map((entry) => [entry.id, entry.title]))
  };
}

function mdBlocksStoreHasRecords(projectRoot) {
  const blocks = loadMdBlocksFromAwnData(projectRoot);
  return Boolean(blocks && Object.keys(blocks).length);
}

module.exports = {
  BLOCKS_STORE_REL,
  GROUPS_STORE_REL,
  loadMdBlocksFromAwnData,
  loadMdBlockGroupsMetaFromAwnData,
  mdBlocksStoreHasRecords
};
