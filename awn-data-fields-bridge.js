const { getAgentCmsCoreAbsolute } = require("./platform-sources");
const { getAwnDataPayload } = require("./awn-data-loader");
const { parseTypeYaml } = require("./awn-yaml-utils");

const FIELDS_STORE_REL = "editing-fields/fields";
const GROUPS_STORE_REL = "editing-fields/groups";
const FIELD_DEF_STORE_REL = "editing-fields/field-def";
const ACTIVE_STATUS = new Set(["active"]);

function getPlatformAgentRoot(projectRoot) {
  return getAgentCmsCoreAbsolute(projectRoot);
}

function parseSettingsList(raw) {
  const text = String(raw || "").trim();
  if (!text) return undefined;
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text.replace(/'/g, '"'));
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      /* fall through */
    }
  }
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isFieldRecordActive(record) {
  const status = String(record?.frontmatter?.status || "active").trim().toLowerCase();
  return ACTIVE_STATUS.has(status);
}

function recordToFieldDef(record) {
  if (!record || !isFieldRecordActive(record)) return null;
  const fm = record.frontmatter || {};
  const fieldId = String(fm.fieldId || "").trim();
  if (!fieldId) return null;

  const settings = parseSettingsList(fm.settings);
  const field = {
    id: fieldId,
    name: String(fm.title || record.title || fieldId).trim(),
    kind: "field",
    group: String(fm.group || "misc").trim(),
    sort: Number(fm.sort) || 0,
    storage: String(fm.storage || "string").trim(),
    mdbase: String(fm.mdbase || fieldId.replace(/^awn\.field\./, "")).trim(),
    widget: String(fm.widget || "input").trim(),
    description: String(record.body || fm.description || "").trim(),
    extends: String(fm.extends || "awn.field.base").trim(),
    storeRel: `${FIELDS_STORE_REL}/${record.fileName || `${record.id}.md`}`.replace(/\\/g, "/")
  };
  if (fm.format) field.format = String(fm.format).trim();
  if (settings?.length) field.settings = settings;
  return field;
}

function loadFieldsFromAwnData(projectRoot) {
  const agentRoot = getPlatformAgentRoot(projectRoot);
  if (!agentRoot) return null;

  const payload = getAwnDataPayload(agentRoot, projectRoot, FIELDS_STORE_REL);
  const records = payload.store?.records || [];
  if (!records.length) return null;

  const registry = {};
  for (const record of records) {
    const field = recordToFieldDef(record);
    if (field) registry[field.id] = field;
  }

  return Object.keys(registry).length ? registry : null;
}

function loadFieldGroupsMetaFromAwnData(projectRoot) {
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

function buildFieldGroups(registry, meta) {
  const grouped = new Map();
  for (const field of Object.values(registry || {})) {
    const groupId = field.group || "misc";
    if (!grouped.has(groupId)) grouped.set(groupId, []);
    grouped.get(groupId).push(field);
  }

  const seen = new Set();
  const orderedGroupIds = [];
  for (const groupId of meta?.groupOrder || []) {
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
    title: meta?.groupNames?.[groupId] || groupId,
    fields: grouped
      .get(groupId)
      .slice()
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "ru"))
      .map((field) => ({
        id: field.id,
        label: field.name,
        name: field.name,
        kind: field.kind,
        description: field.description,
        widget: field.widget,
        storeRel: field.storeRel || null
      }))
  }));
}

function loadFieldDefFromAwnData(projectRoot) {
  const agentRoot = getPlatformAgentRoot(projectRoot);
  if (!agentRoot) return null;

  const payload = getAwnDataPayload(agentRoot, projectRoot, FIELD_DEF_STORE_REL);
  const record = payload.store?.record || payload.store?.records?.[0];
  if (!record) return null;

  const fm = record.frontmatter || {};
  const body = String(record.body || "").trim();
  if (!body) return null;

  const propsIndex = body.indexOf("properties:");
  const yamlBody = propsIndex >= 0 ? body.slice(propsIndex) : body;

  let parsed;
  try {
    parsed = parseTypeYaml(yamlBody);
  } catch {
    return null;
  }
  const properties = parsed?.properties;
  if (!properties || typeof properties !== "object") return null;

  return {
    id: "awn.field-def",
    fieldId: String(fm.fieldId || "awn.field.base").trim(),
    name: String(fm.title || record.title || "Мета-свойства поля").trim(),
    description: body.split("\n")[0]?.trim() || "",
    properties
  };
}

function editingFieldsStoreHasRecords(projectRoot) {
  const registry = loadFieldsFromAwnData(projectRoot);
  return Boolean(registry && Object.keys(registry).length);
}

module.exports = {
  FIELDS_STORE_REL,
  GROUPS_STORE_REL,
  FIELD_DEF_STORE_REL,
  loadFieldsFromAwnData,
  loadFieldGroupsMetaFromAwnData,
  buildFieldGroups,
  loadFieldDefFromAwnData,
  editingFieldsStoreHasRecords
};
