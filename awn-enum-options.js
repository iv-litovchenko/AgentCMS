/**
 * Enum option helpers: { key, name } + field type aliases (enum/array variants).
 */
const FIELD_TYPE_ALIASES = {
  "awn.enum-select": "awn.enum",
  "awn.enum-radio": "awn.enum",
  "awn.array-checkbox": "awn.array",
  "awn.array-select-multiple": "awn.array"
};

const LEGACY_FIELD_TYPE_WIDGET = {
  "awn.enum-select": "select",
  "awn.enum-radio": "radio",
  "awn.array-checkbox": "checkbox",
  "awn.array-select-multiple": "select-multiple"
};

const DEFAULT_FIELD_WIDGET = {
  "awn.enum": "select",
  "awn.array": "checkbox"
};

function resolveFieldTypeId(typeId) {
  const raw = String(typeId || "").trim();
  if (!raw) return "awn.string";
  const id = raw.startsWith("awn.") ? raw : `awn.${raw}`;
  return FIELD_TYPE_ALIASES[id] || id;
}

function isEnumFieldTypeId(typeId) {
  return resolveFieldTypeId(typeId) === "awn.enum";
}

function isArrayFieldTypeId(typeId) {
  return resolveFieldTypeId(typeId) === "awn.array";
}

function resolveFieldWidget(fieldDef, registryEntry = null) {
  const rawType = String(fieldDef?.type || "").trim();
  const normalizedType = rawType.startsWith("awn.") ? rawType : rawType ? `awn.${rawType}` : "";
  const explicit = String(fieldDef?.widget || "").trim();
  if (explicit) return explicit;
  if (normalizedType && LEGACY_FIELD_TYPE_WIDGET[normalizedType]) {
    return LEGACY_FIELD_TYPE_WIDGET[normalizedType];
  }
  const typeId = resolveFieldTypeId(normalizedType);
  const registryWidget = String(registryEntry?.widget || "").trim();
  if (registryWidget && registryWidget !== "tags" && registryWidget !== "input") {
    return registryWidget;
  }
  return DEFAULT_FIELD_WIDGET[typeId] || registryWidget || "";
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
  LEGACY_FIELD_TYPE_WIDGET,
  DEFAULT_FIELD_WIDGET,
  resolveFieldTypeId,
  isEnumFieldTypeId,
  isArrayFieldTypeId,
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
