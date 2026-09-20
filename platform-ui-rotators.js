const { getAwnDataPayload } = require("./awn-data-loader");
const { getAgentCmsCoreAbsolute } = require("./platform-sources");

function parseArcParts(raw) {
  return String(raw || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
}

function isActiveRecord(frontmatter) {
  const status = String(frontmatter?.["awn-status"] || frontmatter?.status || "active")
    .trim()
    .toLowerCase();
  return status === "active";
}

function sortByStoreOrder(records, sortOrder) {
  const list = Array.isArray(records) ? records : [];
  if (!Array.isArray(sortOrder) || !sortOrder.length) return list;
  const order = new Map(sortOrder.map((id, index) => [String(id), index]));
  return list.slice().sort((left, right) => {
    const leftIndex = order.has(left.id) ? order.get(left.id) : 9999;
    const rightIndex = order.has(right.id) ? order.get(right.id) : 9999;
    return leftIndex - rightIndex;
  });
}

function mapSloganRecord(record) {
  const frontmatter = record?.frontmatter || {};
  if (!isActiveRecord(frontmatter)) return null;

  const kind = String(frontmatter["awn-slogan-kind"] || "text").trim().toLowerCase();
  const holdMs = Number(frontmatter["awn-hold-ms"] || 8000) || 8000;

  if (kind === "arc") {
    const parts = parseArcParts(frontmatter["awn-slogan-arc"]);
    if (parts.length < 2) return null;
    return { kind: "arc", parts, holdMs };
  }

  const text = String(frontmatter["awn-slogan-text"] || frontmatter["awn-title"] || record.title || "").trim();
  if (!text) return null;
  return { kind: "text", text, holdMs };
}

function mapHomeTitleRecord(record) {
  const frontmatter = record?.frontmatter || {};
  if (!isActiveRecord(frontmatter)) return null;

  const text = String(frontmatter["awn-title"] || record.title || "").trim();
  if (!text) return null;

  const holdMs = Number(frontmatter["awn-hold-ms"] || 6500) || 6500;
  return { text, holdMs };
}

function loadStoreRotatorRecords(projectRoot, storeId, mapper) {
  const coreRoot = getAgentCmsCoreAbsolute(projectRoot);
  const payload = getAwnDataPayload(coreRoot, projectRoot, storeId);
  const store = payload?.store;
  if (!store || store.error) return [];

  const records = sortByStoreOrder(store.records || [], store.sortOrder);
  return records.map(mapper).filter(Boolean);
}

function loadPlatformUiRotators(projectRoot = process.cwd()) {
  const slogans = loadStoreRotatorRecords(projectRoot, "ui/slogans", mapSloganRecord);
  const homeTitles = loadStoreRotatorRecords(projectRoot, "ui/home-titles", mapHomeTitleRecord);

  return {
    slogans,
    homeTitles,
    source: "agent-cms-core",
    stores: {
      slogans: "awn-data/ui/slogans",
      homeTitles: "awn-data/ui/home-titles"
    }
  };
}

module.exports = {
  loadPlatformUiRotators,
  mapSloganRecord,
  mapHomeTitleRecord
};
