/**
 * Реестр типов полей YAML-свойств (awn-*).
 * Определения хранятся в awn-fields/*.yml, загрузка — awn-fields-loader.js.
 */

const {
  loadAgentFields,
  getFieldRegistry: loadFieldRegistry,
  getBaseFieldOrder: loadBaseFieldOrder,
  FALLBACK_FIELD_TYPES
} = require("./awn-fields-loader");

function resolveRegistryContext(agentRoot = "", projectRoot = process.cwd()) {
  return loadAgentFields(agentRoot, projectRoot);
}

function getFieldType(typeId, agentRoot = "", projectRoot = process.cwd()) {
  const { fieldRegistry } = resolveRegistryContext(agentRoot, projectRoot);
  const id = String(typeId || "").trim();
  return fieldRegistry[id] || fieldRegistry.string || FALLBACK_FIELD_TYPES.string;
}

function getFieldRegistry(agentRoot = "", projectRoot = process.cwd()) {
  return { ...loadFieldRegistry(agentRoot, projectRoot) };
}

function getBaseFieldOrder(agentRoot = "", projectRoot = process.cwd()) {
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
  const typeId = fieldDef?.type || "string";
  return getFieldType(typeId, agentRoot, projectRoot).kind;
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
  isAwnFieldKey,
  sortPropsFieldKeys,
  sortPropsEntries,
  fieldDefToEntryKind,
  fieldDefDefaultValue,
  loadAgentFields: resolveRegistryContext
};
