const fs = require("fs");
const path = require("path");
const {
  getFieldRegistry,
  getBaseFieldOrder,
  fieldDefToEntryKind,
  fieldDefDefaultValue,
  sortPropsEntries
} = require("./awn-field-registry");
const {
  parseTypeYaml,
  listYamlFilesSync,
  loadYamlFileSync,
  YAML_FILE_RE
} = require("./awn-yaml-utils");
const {
  AREA_MANIFEST_FILE,
  isAreaManifestFileName,
  isTopicManifestFileName
} = require("./manifest-paths");

const TYPE_FILE_RE = YAML_FILE_RE;

function loadTypeFileSync(filePath) {
  const parsed = loadYamlFileSync(filePath, { idKey: "name", nameKey: "name" });
  if (!parsed.name) {
    const base = path.basename(filePath).replace(TYPE_FILE_RE, "");
    parsed.name = base.replace(/\./g, ".");
  }
  return parsed;
}

function listTypeFilesSync(typesDir, acc = []) {
  return listYamlFilesSync(typesDir, acc);
}

function loadTypesFromDirectory(typesDir) {
  const files = listTypeFilesSync(typesDir);
  const byName = new Map();
  for (const filePath of files) {
    const def = loadTypeFileSync(filePath);
    if (def?.name) byName.set(def.name, def);
  }
  return byName;
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
  const name = typeDef.name;
  if (visited.has(name)) return {};
  visited.add(name);

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

function loadAgentTypes(agentRoot, projectRoot) {
  const systemDir = path.join(projectRoot, "awn-types");
  const agentDir = path.join(agentRoot, "awn-types");

  const systemTypes = loadTypesFromDirectory(systemDir);
  const agentTypes = loadTypesFromDirectory(agentDir);

  const merged = new Map(systemTypes);
  for (const [name, def] of agentTypes) {
    merged.set(name, def);
  }
  if (merged.has("awn.base") && !merged.has("awn.mixin.base")) {
    merged.set("awn.mixin.base", merged.get("awn.base"));
  }

  const types = {};
  for (const [name, def] of merged) {
    types[name] = resolveTypeDefinition(name, merged);
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
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const fileName = normalized.split("/").filter(Boolean).pop() || "";
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".sidecar.md")) return "awn.sidecar";

  if (options.contentMode === "external" || /\/Content\//i.test(normalized)) {
    return "awn.record";
  }

  if (isAreaManifestFileName(fileName)) {
    if (options.isAgentRoot) return "awn.agent";
    return "awn.area";
  }

  if (isTopicManifestFileName(fileName, { isAgentRoot: options.isAgentRoot })) {
    return "awn.topic";
  }

  return "awn.record";
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

function buildDefaultFrontmatter(typeName, options = {}) {
  const { name = "", types = null, projectRoot = null, agentRoot = null } = options;
  const resolvedProjectRoot = projectRoot || process.cwd();
  const resolvedAgentRoot = agentRoot || "";
  const typesMap = types || loadAgentTypes(resolvedAgentRoot, resolvedProjectRoot);
  const typeDef = resolveTypeDefinition(typeName, new Map(Object.entries(typesMap)));
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
      lines.push(`awn-type: ${typeName}`);
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
    if (key === "title" && name) {
      lines.push(`title: ${formatYamlScalar(name)}`);
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
  return {
    specVersion: "0.2.1",
    fieldRegistry: getFieldRegistry(agentRoot, projectRoot),
    baseFieldOrder: getBaseFieldOrder(agentRoot, projectRoot),
    types: Object.fromEntries(
      Object.entries(types).map(([name, def]) => [
        name,
        {
          name: def.name,
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

const AWN_SCHEMA_TARGETS = ["topic", "record", "sidecar"];

const AWN_SCHEMA_TARGET_TYPE_NAMES = {
  topic: "awn.topic",
  record: "awn.record",
  sidecar: "awn.sidecar"
};

function emptyAwnSchema() {
  return {
    topic: { fields: {} },
    record: { fields: {} },
    sidecar: { fields: {} }
  };
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
      result[target].fields = { ...block.fields };
    }
  }
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
  if (fieldDef.title) lines.push(`${pad}title: ${formatYamlScalar(String(fieldDef.title))}`);
  if (fieldDef.description) {
    lines.push(`${pad}description: ${formatYamlScalar(String(fieldDef.description))}`);
  }
  if (Array.isArray(fieldDef.enum) && fieldDef.enum.length) {
    const items = fieldDef.enum.map((item) => formatYamlScalar(String(item))).join(", ");
    lines.push(`${pad}enum: [${items}]`);
  }
  if (fieldDef.default !== undefined) {
    if (typeof fieldDef.default === "number" || typeof fieldDef.default === "boolean") {
      lines.push(`${pad}default: ${fieldDef.default}`);
    } else {
      lines.push(`${pad}default: ${formatYamlScalar(String(fieldDef.default))}`);
    }
  }
  if (fieldDef.items) lines.push(`${pad}items: ${fieldDef.items}`);
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

function stripAwnSchemaFromConfigText(content) {
  const text = String(content || "").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/);
  const result = [];
  let skipping = false;
  let schemaIndent = 0;

  for (const line of lines) {
    if (!skipping && /^awn_schema:\s*$/.test(line.trim())) {
      skipping = true;
      schemaIndent = line.match(/^(\s*)/)[1].length;
      continue;
    }
    if (skipping) {
      if (!line.trim()) continue;
      const indent = line.match(/^(\s*)/)[1].length;
      if (indent <= schemaIndent) {
        skipping = false;
        result.push(line);
      }
      continue;
    }
    result.push(line);
  }

  return result.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function applyAwnSchemaToConfig(content, awnSchema) {
  const base = stripAwnSchemaFromConfigText(content);
  const schemaYaml = stringifyAwnSchemaYaml(awnSchema);
  if (!schemaYaml) return base ? `${base}\n` : "";
  if (!base) return `${schemaYaml}\n`;
  return `${base}\n\n${schemaYaml}\n`;
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
  getTopicSchemaPayload,
  resolveMergedTypeForManifest,
  AWN_SCHEMA_TARGETS,
  AWN_SCHEMA_TARGET_TYPE_NAMES,
  AREA_MANIFEST_FILE
};
