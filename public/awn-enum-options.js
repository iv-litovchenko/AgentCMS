/**
 * Enum option helpers + field type normalization (canonical awn.field.* ids only).
 */
const FIELD_TYPE_ALIASES = {};

const DEFAULT_FIELD_WIDGET = {
  "awn.field.choice.one": "select",
  "awn.field.choice.many": "checkbox"
};

function resolveFieldTypeId(typeId) {
  const raw = String(typeId || "").trim();
  if (!raw) return "awn.field.string";
  return raw.startsWith("awn.") ? raw : `awn.${raw}`;
}

function normalizeCanonicalFieldTypeId(typeId) {
  const resolved = resolveFieldTypeId(typeId);
  if (resolved.startsWith("awn.field.")) {
    return `awn.${resolved.slice("awn.field.".length)}`;
  }
  return resolved;
}

function fieldTypeIs(typeId, kind) {
  const canonical = normalizeCanonicalFieldTypeId(typeId);
  const target = kind.startsWith("awn.") ? kind.slice(4) : kind;
  return canonical === `awn.${target}` || canonical.endsWith(`.${target}`);
}

function isChoiceOneFieldTypeId(typeId) {
  return normalizeCanonicalFieldTypeId(typeId) === "awn.choice.one";
}

function isChoiceManyFieldTypeId(typeId) {
  return normalizeCanonicalFieldTypeId(typeId) === "awn.choice.many";
}

function isEnumFieldTypeId(typeId) {
  return isChoiceOneFieldTypeId(typeId);
}

function isArrayFieldTypeId(typeId) {
  const canonical = normalizeCanonicalFieldTypeId(typeId);
  if (isChoiceManyFieldTypeId(typeId)) return true;
  return canonical.startsWith("awn.array.");
}

function isNumberFieldTypeId(typeId) {
  const canonical = normalizeCanonicalFieldTypeId(typeId);
  return canonical === "awn.number" || canonical.startsWith("awn.number.");
}

function isRelationFieldTypeId(typeId) {
  const canonical = normalizeCanonicalFieldTypeId(typeId);
  return canonical.startsWith("awn.relation.");
}

function isLinkFieldTypeId(typeId) {
  return isRelationFieldTypeId(typeId);
}

function isLookupOneFieldTypeId(typeId) {
  return normalizeCanonicalFieldTypeId(typeId) === "awn.lookup.one";
}

function isLookupManyFieldTypeId(typeId) {
  return normalizeCanonicalFieldTypeId(typeId) === "awn.lookup.many";
}

function isFileFieldTypeId(typeId) {
  const canonical = normalizeCanonicalFieldTypeId(typeId);
  return canonical.startsWith("awn.file.");
}

function isFieldTypeMany(typeId) {
  const canonical = normalizeCanonicalFieldTypeId(typeId);
  return canonical.endsWith(".many");
}

function resolveFieldWidget(fieldDef, registryEntry = null) {
  const rawType = String(fieldDef?.type || "").trim();
  const normalizedType = rawType.startsWith("awn.") ? rawType : rawType ? `awn.${rawType}` : "";
  const explicit = String(fieldDef?.widget || "").trim();
  if (explicit) return explicit;
  const typeId = resolveFieldTypeId(normalizedType);
  const registryWidget = String(registryEntry?.widget || "").trim();
  if (registryWidget && registryWidget !== "tags" && registryWidget !== "input") {
    return registryWidget;
  }
  const canonical = normalizeCanonicalFieldTypeId(typeId);
  return DEFAULT_FIELD_WIDGET[typeId] || DEFAULT_FIELD_WIDGET[canonical] || registryWidget || "";
}

function isEnumOptionObject(item) {
  return Boolean(item && typeof item === "object" && !Array.isArray(item));
}

function slugifyEnumOptionKey(value, index = 0) {
  const raw = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
  return raw || `option_${index + 1}`;
}

function normalizeEnumOptions(raw) {
  if (!Array.isArray(raw)) return [];
  const result = [];
  raw.forEach((item, index) => {
    if (isEnumOptionObject(item)) {
      const name = String(item.name ?? item.label ?? item.title ?? "").trim();
      const key = String(item.key ?? "").trim() || slugifyEnumOptionKey(name, index);
      if (!key && !name) return;
      result.push({ key, name: name || key });
      return;
    }
    const text = String(item ?? "").trim();
    if (!text) return;
    result.push({ key: text, name: text });
  });
  return result;
}

function enumOptionKey(option) {
  if (isEnumOptionObject(option)) return String(option.key || option.name || "").trim();
  return String(option ?? "").trim();
}

function enumOptionName(option) {
  if (isEnumOptionObject(option)) {
    const name = String(option.name ?? option.label ?? option.title ?? "").trim();
    return name || enumOptionKey(option);
  }
  return String(option ?? "").trim();
}

function resolveEnumStoredKey(rawValue, options = []) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return raw;
  const normalized = normalizeEnumOptions(options);
  for (const option of normalized) {
    if (option.key === raw || option.name === raw) return option.key;
  }
  const squeeze = (value) => String(value).replace(/\s+/g, "").toLowerCase();
  for (const option of normalized) {
    if (squeeze(option.key) === squeeze(raw) || squeeze(option.name) === squeeze(raw)) {
      return option.key;
    }
  }
  const enumLabel = (value) => {
    const text = String(value).trim();
    const match = text.match(/^\S+\s+(.+)$/);
    return (match?.[1] || text).trim().toLowerCase();
  };
  const rawLabel = enumLabel(raw);
  for (const option of normalized) {
    if (enumLabel(option.name) === rawLabel || enumLabel(option.key) === rawLabel) {
      return option.key;
    }
  }
  return raw;
}

function resolveEnumDisplayName(rawValue, options = []) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return raw;
  const normalized = normalizeEnumOptions(options);
  const key = resolveEnumStoredKey(raw, normalized);
  const match = normalized.find((option) => option.key === key);
  return match ? match.name : raw;
}

function parseEnumOptionsFromCompactText(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk, index) => {
      const pipe = chunk.split("|").map((part) => part.trim());
      if (pipe.length >= 2) {
        const key = pipe[0];
        const name = pipe.slice(1).join("|").trim();
        return { key, name: name || key };
      }
      const colon = chunk.match(/^([^:=]+)\s*[:=]\s*(.+)$/);
      if (colon) {
        const key = colon[1].trim();
        const name = colon[2].trim();
        return { key, name: name || key };
      }
      return { key: slugifyEnumOptionKey(chunk, index), name: chunk };
    });
}

function formatEnumOptionsCompactText(options = []) {
  return normalizeEnumOptions(options)
    .map((option) => `${option.key}:${option.name}`)
    .join(", ");
}

function getFieldDefDisplayName(fieldDef, fallbackKey = "") {
  return String(fieldDef?.name ?? fieldDef?.title ?? fallbackKey ?? "").trim();
}

function normalizeArrayStoredKeys(rawValue, options = []) {
  const normalized = normalizeEnumOptions(options);
  if (!normalized.length) {
    if (Array.isArray(rawValue)) return rawValue.map((item) => String(item ?? "").trim()).filter(Boolean);
    return String(rawValue ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  const values = Array.isArray(rawValue)
    ? rawValue
    : String(rawValue ?? "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  return values.map((value) => resolveEnumStoredKey(value, normalized)).filter(Boolean);
}

function stringifyEnumOptionsYaml(options, indent = 6) {
  const normalized = normalizeEnumOptions(options);
  if (!normalized.length) return [];
  const pad = " ".repeat(indent);
  const itemPad = " ".repeat(indent + 2);
  const lines = [`${pad}enum:`];
  for (const option of normalized) {
    lines.push(`${itemPad}- key: ${formatYamlScalar(option.key)}`);
    lines.push(`${itemPad}  name: ${formatYamlScalar(option.name)}`);
  }
  return lines;
}

function formatYamlScalar(value) {
  const text = String(value ?? "");
  if (!text) return '""';
  if (/^[a-z0-9_.-]+$/i.test(text)) return text;
  return JSON.stringify(text);
}

const api = {
  FIELD_TYPE_ALIASES,
  DEFAULT_FIELD_WIDGET,
  resolveFieldTypeId,
  normalizeCanonicalFieldTypeId,
  fieldTypeIs,
  isChoiceOneFieldTypeId,
  isChoiceManyFieldTypeId,
  isEnumFieldTypeId,
  isArrayFieldTypeId,
  isNumberFieldTypeId,
  isRelationFieldTypeId,
  isLinkFieldTypeId,
  isLookupOneFieldTypeId,
  isLookupManyFieldTypeId,
  isFileFieldTypeId,
  isFieldTypeMany,
  resolveFieldWidget,
  isEnumOptionObject,
  normalizeEnumOptions,
  enumOptionKey,
  enumOptionName,
  resolveEnumStoredKey,
  resolveEnumDisplayName,
  parseEnumOptionsFromCompactText,
  formatEnumOptionsCompactText,
  getFieldDefDisplayName,
  normalizeArrayStoredKeys,
  stringifyEnumOptionsYaml,
  formatYamlScalar
};

if (typeof module === "object" && module.exports) {
  module.exports = api;
}

if (typeof globalThis !== "undefined") {
  globalThis.AwnEnumOptions = api;
}
