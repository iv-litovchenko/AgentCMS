const fs = require("fs");
const path = require("path");
const {
  getFieldRegistry,
  fieldDefToEntryKind,
  fieldDefDefaultValue,
  sortPropsEntries
} = require("./awn-field-registry");
const { loadAgentFields } = require("./awn-fields-loader");
const { getBlockGroups, getBlockRegistry } = require("./awn-blocks-loader");
const {
  parseTypeYaml,
  listYamlFilesSync,
  loadYamlFileSync,
  YAML_FILE_RE
} = require("./awn-yaml-utils");
const {
  AREA_MANIFEST_FILE,
  isAreaManifestFileName,
  isTopicManifestFileName,
  isRecordCategoryContentRelPath,
  isExternalSectionReadmeRelPath,
  isMediaSectionReadmeRelPath,
  isMediaCategoryContentRelPath,
  inferAwnTypeFromRelPath
} = require("./manifest-paths");
const { getComponentsAbsolute } = require("./platform-sources");
const {
  parseNodeConfigBundle,
  composeNodeConfigBundle,
  extractSectionYamlText,
  extractDefaultLandingModeFromNodeConfig,
  settingsObjectToEntries,
  settingsEntriesToObject,
  applyAwnUiToConfig,
  applyAwnSettingsToConfig
} = require("./node-config-bundle");
const {
  loadRecordTypesFromComponents,
  getComponentsPayload
} = require("./components-loader");
const { loadPageTypesFromCatalog, getTypeCatalogPayload } = require("./type-catalog-loader");
const {
  normalizeEnumOptions,
  stringifyEnumOptionsYaml,
  getFieldDefDisplayName,
  isEnumOptionObject,
  resolveFieldTypeId,
  resolveFieldWidget,
  DEFAULT_FIELD_WIDGET
} = require("./awn-enum-options");

const TYPE_FILE_RE = YAML_FILE_RE;

function getRecordTypeId(typeDef) {
  return String(typeDef?.id || typeDef?.name || "").trim();
}

function normalizeRecordTypeDef(parsed, filePath) {
  const raw = { ...(parsed || {}) };
  let id = String(raw.id || "").trim();
  let name = String(raw.name || "").trim();

  // Legacy: единственный ключ name был идентификатором (awn.*)
  if (!id && name) {
    if (/^awn\.[\w.-]+$/.test(name)) {
      id = name;
      name = "";
    } else {
      id = name;
    }
  }
  if (!id) {
    const base = path.basename(filePath).replace(TYPE_FILE_RE, "");
    id = base;
  }
  if (!name) name = id;

  return {
    ...raw,
    id,
    name,
    description: raw.description || ""
  };
}

function loadTypeFileSync(filePath) {
  const parsed = loadYamlFileSync(filePath, { idKey: "id", nameKey: "name" });
  return normalizeRecordTypeDef(parsed, filePath);
}

const TYPE_SKIP_FILES = new Set(["field-def.yml"]);
const TYPE_SKIP_DIRS = new Set(["fields", "blocks"]);

function listTypeFilesSync(typesDir, acc = []) {
  if (!fs.existsSync(typesDir)) return acc;
  const entries = fs.readdirSync(typesDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(typesDir, entry.name);
    if (entry.isDirectory()) {
      if (TYPE_SKIP_DIRS.has(entry.name)) continue;
      listTypeFilesSync(fullPath, acc);
    } else if (entry.isFile() && TYPE_FILE_RE.test(entry.name)) {
      if (TYPE_SKIP_FILES.has(entry.name)) continue;
      acc.push(fullPath);
    }
  }
  return acc;
}

function loadTypesFromDirectory(typesDir) {
  const files = listTypeFilesSync(typesDir);
  const byId = new Map();
  for (const filePath of files) {
    const def = loadTypeFileSync(filePath);
    const typeId = getRecordTypeId(def);
    if (typeId) byId.set(typeId, def);
  }
  return byId;
}

function applyTypeMixins(typeDef, byName, fields) {
  const mixins = Array.isArray(typeDef?.mixins) ? typeDef.mixins : [];
  let merged = { ...fields };
  for (const mixinName of mixins) {
    const mixin = byName.get(mixinName);
    if (!mixin || mixin.kind !== "mixin") continue;
    if (mixin.fields && typeof mixin.fields === "object") {
      merged = { ...merged, ...mixin.fields };
    }
  }
  return merged;
}

function mergeTypeFields(typeDef, byName, visited = new Set()) {
  if (!typeDef) return {};
  const typeId = getRecordTypeId(typeDef);
  if (!typeId || visited.has(typeId)) return {};
  visited.add(typeId);

  let fields = {};
  if (typeDef.extends) {
    const parent = byName.get(typeDef.extends);
    if (parent) {
      fields = { ...mergeTypeFields(parent, byName, visited), ...fields };
    }
  }
  if (typeDef.fields && typeof typeDef.fields === "object") {
    fields = { ...fields, ...typeDef.fields };
  }
  fields = applyTypeMixins(typeDef, byName, fields);
  return fields;
}

function resolveTypeDefinition(typeName, typesByName) {
  const def = typesByName.get(typeName);
  if (!def) return null;
  return {
    ...def,
    fields: mergeTypeFields(def, typesByName)
  };
}

const FALLBACK_BASE_FIELD_ORDER = [
  "awn-preview",
  "awn-emoji",
  "awn-name",
  "awn-status",
  "awn-type",
  "awn-create",
  "awn-update",
  "awn-description",
  "awn-main",
  "awn-category",
  "awn-owner",
  "awn-priority",
  "awn-tags",
  "awn-color",
  "awn-version",
  "awn-sort"
];

/** Порядок стандартных awn-* полей — из ключей merged fields в awn.page.base / awn.base. */
function getBaseFieldOrder(agentRoot = "", projectRoot = process.cwd()) {
  const types = loadAgentTypes(agentRoot, projectRoot);
  const baseFields =
    types["awn.page.base"]?.fields || types["awn.base"]?.fields;
  if (!baseFields || typeof baseFields !== "object") {
    return [...FALLBACK_BASE_FIELD_ORDER];
  }
  const keys = Object.keys(baseFields);
  return keys.length ? keys : [...FALLBACK_BASE_FIELD_ORDER];
}

function loadAgentTypes(agentRoot, projectRoot) {
  const catalogTypes = loadPageTypesFromCatalog(projectRoot);
  const legacyTypes = loadRecordTypesFromComponents(projectRoot, agentRoot);
  const rawTypes = { ...legacyTypes, ...catalogTypes };
  const merged = new Map(Object.entries(rawTypes));

  if (merged.has("awn.page.base") && !merged.has("awn.base")) {
    merged.set("awn.base", merged.get("awn.page.base"));
  }
  if (merged.has("awn.base") && !merged.has("awn.mixin.base")) {
    merged.set("awn.mixin.base", merged.get("awn.base"));
  }

  const types = {};
  for (const [name, def] of merged) {
    types[name] = resolveTypeDefinition(name, merged);
  }
  if (types["awn.page.topic"] && !types["awn.topic"]) {
    types["awn.topic"] = types["awn.page.topic"];
  }
  if (types["awn.page.ws"] && !types["awn.workspace"]) {
    types["awn.workspace"] = types["awn.page.ws"];
  }
  if (types["awn.page.area"] && !types["awn.area"]) {
    types["awn.area"] = types["awn.page.area"];
  }
  if (types["awn.content.record"] && !types["awn.record"]) {
    types["awn.record"] = types["awn.content.record"];
  }
  if (types["awn.content.sidecar"] && !types["awn.sidecar"]) {
    types["awn.sidecar"] = types["awn.content.sidecar"];
  }
  if (types["awn.content.record.category"] && !types["awn.record.category"]) {
    types["awn.record.category"] = types["awn.content.record.category"];
  }
  if (types["awn.page.base"] && !types["awn.base"]) {
    types["awn.base"] = types["awn.page.base"];
  }
  if (types["awn.topic"] && !types["awn.file"]) {
    types["awn.file"] = types["awn.topic"];
  }
  if (types["awn.base"] && !types["awn.mixin.base"]) {
    types["awn.mixin.base"] = types["awn.base"];
  }
  return types;
}

function inferAwnTypeFromPath(relPath, options = {}) {
  return inferAwnTypeFromRelPath(relPath, options);
}

function extractFileBaseName(relPath) {
  const fileName = String(relPath || "").split("/").filter(Boolean).pop() || "";
  if (!fileName) return "";
  if (fileName.toLowerCase().endsWith(".sidecar.md")) {
    return fileName.slice(0, -".sidecar.md".length);
  }
  if (fileName.toLowerCase().endsWith(".md")) {
    return fileName.slice(0, -3);
  }
  return fileName;
}

function normalizeAwnTypeName(typeName) {
  const raw = String(typeName || "").trim();
  if (!raw) return "";
  if (/^awn\./i.test(raw)) return raw;
  const aliases = {
    area: "awn.area",
    topic: "awn.topic",
    workspace: "awn.workspace",
    record: "awn.record",
    service: "service"
  };
  return aliases[raw.toLowerCase()] || raw;
}

function buildDefaultFrontmatter(typeName, options = {}) {
  const {
    name = "",
    types = null,
    projectRoot = null,
    agentRoot = null,
    typeDef: typeDefOverride = null
  } = options;
  const resolvedTypeName = normalizeAwnTypeName(typeName);
  const resolvedProjectRoot = projectRoot || process.cwd();
  const resolvedAgentRoot = agentRoot || "";
  const typesMap = types || loadAgentTypes(resolvedAgentRoot, resolvedProjectRoot);
  const typeDef =
    typeDefOverride ||
    resolveTypeDefinition(resolvedTypeName, new Map(Object.entries(typesMap)));
  const fields = typeDef?.fields || {};

  const lines = [];
  const now = new Date().toISOString();
  const baseOrder = getBaseFieldOrder(resolvedAgentRoot, resolvedProjectRoot);

  const orderedKeys = [
    ...baseOrder,
    ...Object.keys(fields).filter((k) => !baseOrder.includes(k))
  ];

  const seen = new Set();
  for (const key of orderedKeys) {
    if (seen.has(key)) continue;
    seen.add(key);

    if (key === "awn-type") {
      lines.push(`awn-type: ${resolvedTypeName}`);
      continue;
    }
    if (key === "awn-name" && name) {
      lines.push(`awn-name: ${formatYamlScalar(name)}`);
      continue;
    }
    if (key === "awn-create") {
      lines.push(`awn-create: ${now}`);
      continue;
    }
    if (key === "awn-update") {
      lines.push(`awn-update: ${now}`);
      continue;
    }
    const fieldDef = fields[key];
    if (!fieldDef) continue;
    if (fieldDef.default === undefined) {
      const kind = fieldDefToEntryKind(fieldDef, resolvedAgentRoot, resolvedProjectRoot);
      if (kind === "array") {
        lines.push(`${key}: []`);
      } else if (kind === "number") {
        lines.push(`${key}: ""`);
      } else {
        lines.push(`${key}: ""`);
      }
      continue;
    }
    const defaultValue = fieldDefDefaultValue(fieldDef, resolvedAgentRoot, resolvedProjectRoot);
    if (defaultValue === "" || defaultValue === null) {
      lines.push(`${key}: ""`);
    } else if (Array.isArray(defaultValue)) {
      lines.push(`${key}: []`);
    } else if (typeof defaultValue === "number") {
      lines.push(`${key}: ${defaultValue}`);
    } else if (typeof defaultValue === "boolean") {
      lines.push(`${key}: ${defaultValue}`);
    } else {
      lines.push(`${key}: ${formatYamlScalar(String(defaultValue))}`);
    }
  }

  return lines.join("\n");
}

function formatYamlScalar(value) {
  const text = String(value ?? "");
  if (!text || /[:#\[\]{}&,*?]|^\s|\s$/.test(text)) {
    return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return text;
}

function typeFieldsToFormEntries(typeDef, existingEntries = [], options = {}) {
  const { projectRoot = process.cwd(), agentRoot = "" } = options;
  const fields = typeDef?.fields || {};
  const existingMap = new Map(
    (existingEntries || []).map((entry) => [entry.key, entry])
  );
  const result = [];
  const baseOrder = getBaseFieldOrder(agentRoot, projectRoot);

  const orderedKeys = [
    ...baseOrder,
    ...Object.keys(fields).filter((k) => !baseOrder.includes(k))
  ];

  const seen = new Set();
  for (const key of orderedKeys) {
    if (seen.has(key)) continue;
    seen.add(key);

    const fieldDef = fields[key];
    const existing = existingMap.get(key);
    if (existing) {
      result.push(existing);
      continue;
    }

    if (!fieldDef && baseOrder.includes(key)) {
      result.push({ key, kind: "string", value: "" });
      continue;
    }
    if (!fieldDef) continue;

    result.push({
      key,
      kind: fieldDefToEntryKind(fieldDef, agentRoot, projectRoot),
      value: fieldDefDefaultValue(fieldDef, agentRoot, projectRoot),
      fieldDef
    });
  }

  for (const entry of existingEntries) {
    if (!entry?.key || seen.has(entry.key)) continue;
    result.push(entry);
  }

  return sortPropsEntries(result, agentRoot, projectRoot);
}

function getAwnTypesPayload(agentRoot, projectRoot) {
  const types = loadAgentTypes(agentRoot, projectRoot);
  const { fieldDefSchema } = loadAgentFields(agentRoot, projectRoot);
  return {
    specVersion: "0.2.2",
    typeCatalog: getTypeCatalogPayload(projectRoot, agentRoot),
    components: getComponentsPayload(projectRoot, agentRoot),
    fieldRegistry: getFieldRegistry(agentRoot, projectRoot),
    baseFieldOrder: getBaseFieldOrder(agentRoot, projectRoot),
    fieldDefSchema: fieldDefSchema || null,
    blockRegistry: getBlockRegistry(agentRoot, projectRoot),
    blockGroups: getBlockGroups(agentRoot, projectRoot),
    types: Object.fromEntries(
      Object.entries(types).map(([typeId, def]) => [
        typeId,
        {
          id: getRecordTypeId(def) || typeId,
          name: def.name || typeId,
          kind: def.kind,
          extends: def.extends || null,
          mixins: Array.isArray(def.mixins) ? [...def.mixins] : [],
          description: def.description || "",
          fields: def.fields || {}
        }
      ])
    )
  };
}

const TOPIC_SCHEMA_STORAGE_SLOT_TARGET_SPECS = [
  { id: "slot_memory", slotKey: "memory", typeName: "awn.record", legacyId: "record" },
  {
    id: "slot_memory_category",
    slotKey: "memory",
    typeName: "awn.record.category",
    legacyId: "record_category",
    schemaOnly: true
  },
  { id: "slot_inbox", slotKey: "inbox", typeName: "awn.record" },
  { id: "slot_quick_notes", slotKey: "quick-notes", typeName: "awn.record" },
  { id: "slot_references", slotKey: "references", typeName: "awn.record" },
  { id: "slot_artefacts", slotKey: "artefacts", typeName: "awn.record" },
  { id: "slot_media", slotKey: "media", typeName: "awn.sidecar" },
  {
    id: "slot_media_category",
    slotKey: "media",
    typeName: "awn.media.category",
    legacyId: "media_category",
    schemaOnly: true
  },
  { id: "slot_scripts", slotKey: "scripts", typeName: "awn.record" },
  { id: "slot_repository", slotKey: "repository", typeName: "awn.file" }
];

const AWN_SCHEMA_LEGACY_TARGET_MIGRATIONS = [
  ["record", "slot_memory"],
  ["record_category", "slot_memory_category"],
  ["media_category", "slot_media_category"]
];

const AWN_SCHEMA_TARGETS = [
  "topic",
  "sidecar",
  ...TOPIC_SCHEMA_STORAGE_SLOT_TARGET_SPECS.map((item) => item.id),
  "settings"
];

const AWN_SCHEMA_TARGET_TYPE_NAMES = {
  topic: "awn.topic",
  sidecar: "awn.sidecar",
  settings: "awn.settings",
  ...Object.fromEntries(
    TOPIC_SCHEMA_STORAGE_SLOT_TARGET_SPECS.map((item) => [item.id, item.typeName])
  )
};

function emptyAwnSchemaBlock() {
  return { fields: {} };
}

function emptyAwnSchema() {
  const result = {};
  for (const target of AWN_SCHEMA_TARGETS) {
    result[target] = emptyAwnSchemaBlock();
  }
  return result;
}

function migrateLegacyAwnSchemaTargets(source, result) {
  for (const [legacyId, modernId] of AWN_SCHEMA_LEGACY_TARGET_MIGRATIONS) {
    const legacyFields = source?.[legacyId]?.fields;
    if (!legacyFields || typeof legacyFields !== "object") continue;
    if (!result[modernId]) result[modernId] = emptyAwnSchemaBlock();
    if (!Object.keys(result[modernId].fields).length) {
      result[modernId].fields = { ...legacyFields };
    }
  }
  const legacySidecarFields = source?.sidecar?.fields;
  if (legacySidecarFields && typeof legacySidecarFields === "object") {
    if (!result.slot_media) result.slot_media = emptyAwnSchemaBlock();
    if (!Object.keys(result.slot_media.fields).length) {
      result.slot_media.fields = { ...legacySidecarFields };
    }
  }
}

function repairFieldDefEnum(fieldDef) {
  if (!fieldDef || fieldDef.enum === undefined) return;
  if (Array.isArray(fieldDef.enum)) {
    fieldDef.enum = normalizeEnumOptions(fieldDef.enum);
    return;
  }
  if (typeof fieldDef.enum !== "object" || !fieldDef.enum) {
    delete fieldDef.enum;
    return;
  }
  const broken = fieldDef.enum;
  const legacyKey =
    broken.key ||
    broken["- key"] ||
    Object.entries(broken).find(([name]) => name === "key" || name.endsWith("key"))?.[1];
  const legacyName = broken.name || broken["- name"] || "";
  if (legacyKey) {
    fieldDef.enum = normalizeEnumOptions([{ key: String(legacyKey), name: String(legacyName || legacyKey) }]);
    return;
  }
  delete fieldDef.enum;
}

function normalizeAwnSchemaFieldMap(fields) {
  if (!fields || typeof fields !== "object") return fields;
  const next = { ...fields };
  for (const key of Object.keys(next)) {
    if (!next[key] || typeof next[key] !== "object") continue;
    next[key] = { ...next[key] };
    repairFieldDefEnum(next[key]);
  }
  return next;
}

function normalizeAwnSchema(raw) {
  const result = emptyAwnSchema();
  if (!raw || typeof raw !== "object") return result;
  const source = { ...raw };
  if (source.file && !source.topic) {
    source.topic = source.file;
  }
  for (const target of AWN_SCHEMA_TARGETS) {
    const block = source[target];
    if (block?.fields && typeof block.fields === "object") {
      result[target].fields = normalizeAwnSchemaFieldMap(block.fields);
    }
  }
  migrateLegacyAwnSchemaTargets(source, result);
  return result;
}

function extractAwnSchemaFromConfig(content) {
  const parsed = parseTypeYaml(content);
  return normalizeAwnSchema(parsed.awn_schema);
}

function mergeTypeWithTopicSchema(typeDef, awnSchema, target) {
  if (!typeDef) return null;
  const topicFields = awnSchema?.[target]?.fields || {};
  return {
    ...typeDef,
    fields: { ...typeDef.fields, ...topicFields }
  };
}

function indentYamlLines(lines, spaces) {
  const pad = " ".repeat(spaces);
  return lines.map((line) => (line ? `${pad}${line}` : line));
}

function stringifyFieldDefYaml(fieldDef, indent) {
  const lines = [];
  const pad = " ".repeat(indent);
  if (fieldDef.type) lines.push(`${pad}type: ${fieldDef.type}`);
  const displayName = getFieldDefDisplayName(fieldDef);
  if (displayName) lines.push(`${pad}name: ${formatYamlScalar(displayName)}`);
  if (fieldDef.description) {
    lines.push(`${pad}description: ${formatYamlScalar(String(fieldDef.description))}`);
  }
  if (fieldDef.hint) lines.push(`${pad}hint: ${formatYamlScalar(String(fieldDef.hint))}`);
  if (fieldDef.format) lines.push(`${pad}format: ${formatYamlScalar(String(fieldDef.format))}`);
  if (fieldDef.required === true) lines.push(`${pad}required: true`);
  if (fieldDef.locked === true) lines.push(`${pad}locked: true`);
  const typeId = resolveFieldTypeId(fieldDef.type || "");
  const widget = resolveFieldWidget(fieldDef);
  const defaultWidget = DEFAULT_FIELD_WIDGET[typeId] || "";
  if (widget && widget !== defaultWidget) {
    lines.push(`${pad}widget: ${formatYamlScalar(widget)}`);
  }
  if (Array.isArray(fieldDef.enum) && fieldDef.enum.length) {
    if (fieldDef.enum.some(isEnumOptionObject)) {
      lines.push(...stringifyEnumOptionsYaml(fieldDef.enum, indent));
    } else {
      const items = fieldDef.enum.map((item) => formatYamlScalar(String(item))).join(", ");
      lines.push(`${pad}enum: [${items}]`);
    }
  }
  if (fieldDef.default !== undefined) {
    if (typeof fieldDef.default === "number" || typeof fieldDef.default === "boolean") {
      lines.push(`${pad}default: ${fieldDef.default}`);
    } else {
      lines.push(`${pad}default: ${formatYamlScalar(String(fieldDef.default))}`);
    }
  }
  if (fieldDef.items) lines.push(`${pad}items: ${fieldDef.items}`);
  if (fieldDef.scope) lines.push(`${pad}scope: ${formatYamlScalar(String(fieldDef.scope))}`);
  if (fieldDef.accept) lines.push(`${pad}accept: ${formatYamlScalar(String(fieldDef.accept))}`);
  if (fieldDef.multiple === true) lines.push(`${pad}multiple: true`);
  if (fieldDef.upload === true) lines.push(`${pad}upload: true`);
  if (fieldDef.insertInText === true) lines.push(`${pad}insertInText: true`);
  return lines;
}

function stringifyAwnSchemaYaml(awnSchema) {
  const schema = normalizeAwnSchema(awnSchema);
  const lines = ["awn_schema:"];
  let hasContent = false;

  for (const target of AWN_SCHEMA_TARGETS) {
    const fields = schema[target]?.fields || {};
    const keys = Object.keys(fields);
    if (!keys.length) continue;
    hasContent = true;
    lines.push(`  ${target}:`);
    lines.push("    fields:");
    for (const key of keys) {
      const fieldDef = fields[key];
      if (!fieldDef || typeof fieldDef !== "object") continue;
      lines.push(`      ${key}:`);
      lines.push(...stringifyFieldDefYaml(fieldDef, 8));
    }
  }

  return hasContent ? lines.join("\n") : "";
}

function applyAwnSchemaToConfig(content, awnSchema) {
  const bundle = parseNodeConfigBundle(content);
  const schemaYaml = stringifyAwnSchemaYaml(awnSchema);
  bundle.awn_schema = null;
  bundle.awn_schemaYaml = schemaYaml;
  return composeNodeConfigBundle(bundle);
}

function getTopicSchemaPayload(configContent, agentRoot, projectRoot) {
  const types = loadAgentTypes(agentRoot, projectRoot);
  const typesByName = new Map(Object.entries(types));
  const awnSchema = extractAwnSchemaFromConfig(configContent);
  const baseTypes = {};
  const merged = {};

  for (const target of AWN_SCHEMA_TARGETS) {
    const typeName = AWN_SCHEMA_TARGET_TYPE_NAMES[target];
    const base = resolveTypeDefinition(typeName, typesByName);
    baseTypes[target] = base
      ? { name: typeName, kind: base.kind, fields: { ...base.fields } }
      : null;
    merged[target] = mergeTypeWithTopicSchema(base, awnSchema, target);
  }

  return { awnSchema, baseTypes, merged };
}

function resolveMergedTypeForManifest(configContent, agentRoot, projectRoot, contextKind) {
  const payload = getTopicSchemaPayload(configContent, agentRoot, projectRoot);
  const normalizedKind =
    contextKind === "file" ? "topic" : contextKind;
  const target = AWN_SCHEMA_TARGETS.includes(normalizedKind) ? normalizedKind : "topic";
  return payload.merged[target] || null;
}

module.exports = {
  parseTypeYaml,
  loadAgentTypes,
  loadTypesFromDirectory,
  resolveTypeDefinition,
  mergeTypeFields,
  getBaseFieldOrder,
  FALLBACK_BASE_FIELD_ORDER,
  inferAwnTypeFromPath,
  extractFileBaseName,
  buildDefaultFrontmatter,
  typeFieldsToFormEntries,
  getAwnTypesPayload,
  emptyAwnSchema,
  normalizeAwnSchema,
  extractAwnSchemaFromConfig,
  mergeTypeWithTopicSchema,
  stringifyAwnSchemaYaml,
  applyAwnSchemaToConfig,
  applyAwnUiToConfig,
  applyAwnSettingsToConfig,
  extractSectionYamlText,
  extractDefaultLandingModeFromNodeConfig,
  parseNodeConfigBundle,
  composeNodeConfigBundle,
  settingsObjectToEntries,
  settingsEntriesToObject,
  getTopicSchemaPayload,
  resolveMergedTypeForManifest,
  AWN_SCHEMA_TARGETS,
  AWN_SCHEMA_TARGET_TYPE_NAMES,
  TOPIC_SCHEMA_STORAGE_SLOT_TARGET_SPECS,
  AREA_MANIFEST_FILE
};
