/**
 * Реестр типов полей YAML-свойств (awn-*).
/**
 * Реестр типов полей — awn-system/types/fields/, загрузка — awn-fields-loader.js.
 */

const {
  loadAgentFields,
  getFieldRegistry: loadFieldRegistry,
  resolveFieldTypeId,
  FALLBACK_FIELD_TYPES
} = require("./awn-fields-loader");

function resolveRegistryContext(agentRoot = "", projectRoot = process.cwd()) {
  return loadAgentFields(agentRoot, projectRoot);
}

function getFieldType(typeId, agentRoot = "", projectRoot = process.cwd()) {
  const { fieldRegistry } = resolveRegistryContext(agentRoot, projectRoot);
  const id = resolveFieldTypeId(typeId);
  return fieldRegistry[id] || fieldRegistry["awn.string"] || FALLBACK_FIELD_TYPES["awn.string"];
}

function getFieldRegistry(agentRoot = "", projectRoot = process.cwd()) {
  return { ...loadFieldRegistry(agentRoot, projectRoot) };
}

function getBaseFieldOrder(agentRoot = "", projectRoot = process.cwd()) {
  const { getBaseFieldOrder: loadBaseFieldOrder } = require("./awn-types-loader");
  return [...loadBaseFieldOrder(agentRoot, projectRoot)];
}

function isAwnFieldKey(key) {
  return /^awn-/i.test(String(key || "").trim());
}

function sortPropsFieldKeys(keys, agentRoot = "", projectRoot = process.cwd()) {
  const list = [...keys];
  const baseOrder = getBaseFieldOrder(agentRoot, projectRoot);
  return list.sort((a, b) => {
    const aNorm = String(a || "").toLowerCase();
    const bNorm = String(b || "").toLowerCase();
    const aBase = baseOrder.indexOf(aNorm);
    const bBase = baseOrder.indexOf(bNorm);
    const aAwn = isAwnFieldKey(aNorm);
    const bAwn = isAwnFieldKey(bNorm);

    if (aBase !== -1 && bBase !== -1) return aBase - bBase;
    if (aBase !== -1) return -1;
    if (bBase !== -1) return 1;
    if (aAwn && !bAwn) return -1;
    if (!aAwn && bAwn) return 1;
    if (aAwn && bAwn) return aNorm.localeCompare(bNorm);
    return aNorm.localeCompare(bNorm);
  });
}

function sortPropsEntries(entries, agentRoot = "", projectRoot = process.cwd()) {
  const keys = entries.map((e) => e?.key).filter(Boolean);
  const order = sortPropsFieldKeys(keys, agentRoot, projectRoot);
  const map = new Map(entries.map((e) => [e.key, e]));
  const result = [];
  for (const key of order) {
    if (map.has(key)) result.push(map.get(key));
  }
  for (const entry of entries) {
    if (entry?.key && !order.includes(entry.key)) result.push(entry);
  }
  return result;
}

function fieldDefToEntryKind(fieldDef, agentRoot = "", projectRoot = process.cwd()) {
  const entry = getFieldType(fieldDef?.type, agentRoot, projectRoot);
  if (entry?.storage) return entry.storage;
  if (entry?.kind && entry.kind !== "field") return entry.kind;
  return "string";
}

function fieldDefDefaultValue(fieldDef, agentRoot = "", projectRoot = process.cwd()) {
  if (fieldDef?.default !== undefined) return fieldDef.default;
  const kind = fieldDefToEntryKind(fieldDef, agentRoot, projectRoot);
  if (kind === "array") return [];
  if (kind === "bool") return false;
  if (kind === "null") return null;
  return "";
}

module.exports = {
  getFieldType,
  getFieldRegistry,
  getBaseFieldOrder,
  resolveFieldTypeId,
  isAwnFieldKey,
  sortPropsFieldKeys,
  sortPropsEntries,
  fieldDefToEntryKind,
  fieldDefDefaultValue,
  loadAgentFields: resolveRegistryContext
};
