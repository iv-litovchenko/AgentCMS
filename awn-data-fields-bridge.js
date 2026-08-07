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

function pickFieldFrontmatterValue(fm, ...keys) {
  if (!fm || typeof fm !== "object") return "";
  for (const key of keys) {
    const value = fm[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function isFieldRecordActive(record) {
  const status = String(
    pickFieldFrontmatterValue(record?.frontmatter || {}, "status", "awn-status") || "active"
  )
    .trim()
    .toLowerCase();
  return ACTIVE_STATUS.has(status);
}

function recordToFieldDef(record) {
  if (!record || !isFieldRecordActive(record)) return null;
  const fm = record.frontmatter || {};
  const fieldId = String(pickFieldFrontmatterValue(fm, "fieldId", "awn-fieldId")).trim();
  if (!fieldId) return null;

  const settings = parseSettingsList(pickFieldFrontmatterValue(fm, "settings", "awn-settings"));
  const field = {
    id: fieldId,
    name: String(
      pickFieldFrontmatterValue(fm, "title", "awn-title") || record.title || fieldId
    ).trim(),
    kind: "field",
    group: String(pickFieldFrontmatterValue(fm, "group", "awn-group") || "misc").trim(),
    sort: Number(pickFieldFrontmatterValue(fm, "sort", "awn-sort")) || 0,
    storage: String(pickFieldFrontmatterValue(fm, "storage", "awn-storage") || "string").trim(),
    mdbase: String(
      pickFieldFrontmatterValue(fm, "mdbase", "awn-mdbase") || fieldId.replace(/^awn\.field\./, "")
    ).trim(),
    widget: String(pickFieldFrontmatterValue(fm, "widget", "awn-widget") || "input").trim(),
    description: String(record.body || pickFieldFrontmatterValue(fm, "description", "awn-description") || "").trim(),
    extends: String(pickFieldFrontmatterValue(fm, "extends", "awn-extends") || "awn.field.base").trim(),
    storeRel: `${FIELDS_STORE_REL}/${record.fileName || `${record.id}.md`}`.replace(/\\/g, "/")
  };
  const format = pickFieldFrontmatterValue(fm, "format", "awn-format");
  if (format) field.format = String(format).trim();
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
      title: String(
        pickFieldFrontmatterValue(record.frontmatter || {}, "title", "awn-title") ||
          record.title ||
          id
      ).trim(),
      sort: Number(pickFieldFrontmatterValue(record.frontmatter || {}, "sort", "awn-sort")) || 0
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

function recordToCatalogFieldEntry(record) {
  const field = recordToFieldDef(record);
  if (!field) return null;
  const slug = String(record.id || record.frontmatter?.id || "").trim();
  const storeFile = record.fileName || `${slug}.md`;
  return {
    id: field.id,
    domain: "fields",
    fileName: storeFile.replace(/\.md$/i, ""),
    relPath: slug,
    catalogFile: `awn-data/${FIELDS_STORE_REL}/${storeFile}`.replace(/\\/g, "/"),
    source: "platform",
    schema: {
      id: field.id,
      name: field.name,
      kind: "field",
      domain: "fields",
      extends: field.extends,
      widget: field.widget,
      storage: field.storage,
      mdbase: field.mdbase,
      description: field.description,
      settings: field.settings,
      format: field.format,
      group: field.group,
      status: "active"
    },
    status: "active",
    kind: "field",
    extends: field.extends
  };
}

function buildFieldBaseCatalogEntry(projectRoot) {
  const fieldDef = loadFieldDefFromAwnData(projectRoot);
  if (!fieldDef?.properties) return null;
  const fieldId = String(fieldDef.fieldId || "awn.field.base").trim();
  return {
    id: fieldId,
    domain: "fields",
    fileName: "main",
    relPath: "field-def/main",
    catalogFile: `awn-data/${FIELD_DEF_STORE_REL}/main.md`.replace(/\\/g, "/"),
    source: "platform",
    schema: {
      id: fieldId,
      name: fieldDef.name || "База поля",
      kind: "base",
      domain: "fields",
      extends: "awn.table.base",
      description: fieldDef.description || "",
      properties: fieldDef.properties,
      status: "active"
    },
    status: "active",
    kind: "base",
    extends: "awn.table.base"
  };
}

function ingestFieldsIntoCatalog(projectRoot, byId, byDomain) {
  if (!editingFieldsStoreHasRecords(projectRoot)) return false;

  for (const [id, entry] of [...byId.entries()]) {
    if (entry?.domain === "fields") byId.delete(id);
  }
  byDomain.fields = [];

  const baseEntry = buildFieldBaseCatalogEntry(projectRoot);
  if (baseEntry) {
    byId.set(baseEntry.id, baseEntry);
    byDomain.fields.push(baseEntry);
  }

  const agentRoot = getPlatformAgentRoot(projectRoot);
  const payload = getAwnDataPayload(agentRoot, projectRoot, FIELDS_STORE_REL);
  for (const record of payload.store?.records || []) {
    const entry = recordToCatalogFieldEntry(record);
    if (!entry) continue;
    byId.set(entry.id, entry);
    byDomain.fields.push(entry);
  }

  return byDomain.fields.length > 0;
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
  ingestFieldsIntoCatalog,
  editingFieldsStoreHasRecords
};
