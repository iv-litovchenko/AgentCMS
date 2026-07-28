const path = require("path");
const { getSlotTypesFromCatalog, readSlotsBindings } = require("./awn-canonical-model");
const { loadTypeCatalog, mergeTypeSchema, resolveCanonicalTypeId } = require("./type-catalog-loader");

const INTERNAL_SLOT_KEYS = new Set(["main-single", "main-single-csv", "todo-single", "todo"]);

function slotKeyToBindingKey(slotKey) {
  const key = String(slotKey || "").trim();
  if (key === "note") return "note";
  if (key === "script") return "scripts";
  return key;
}

function buildSlotEntry(slotKey, catalog, bindingsDoc) {
  const bindingKey = slotKeyToBindingKey(slotKey);
  const binding = bindingsDoc.bindings?.[bindingKey] || bindingsDoc.bindings?.[slotKey];
  const slotTypes = getSlotTypesFromCatalog(catalog.projectRoot || process.cwd(), catalog.agentRoot || "");
  const slotType =
    slotTypes.find((row) => row.id === `awn.slot.${slotKey}`) ||
    slotTypes.find((row) => row.id.endsWith(`.${slotKey}`)) ||
    null;

  const driver =
    slotType?.storageDriver ||
    (INTERNAL_SLOT_KEYS.has(slotKey) || INTERNAL_SLOT_KEYS.has(bindingKey) ? "internal" : "external");

  return {
    slot: slotKey,
    driver,
    path: binding?.path || slotType?.path || (driver === "internal" ? `${slotKey}` : `${slotKey}/`),
    allowedContent: binding?.content || slotType?.allowedContent || [],
    acceptFiles: binding?.files || []
  };
}

function getPageSlotsPayload(projectRoot, agentRoot, storageSlotKeys = []) {
  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  catalog.projectRoot = projectRoot;
  catalog.agentRoot = agentRoot;
  const bindingsDoc = readSlotsBindings(agentRoot);

  const keys = [...new Set((storageSlotKeys || []).map((key) => String(key || "").trim()).filter(Boolean))];
  const slots = keys.map((slotKey) => buildSlotEntry(slotKey, catalog, bindingsDoc));

  return {
    slots,
    count: slots.length
  };
}

function resolveStorageSlotsForManifest(projectRoot, agentRoot, awnTypeId) {
  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  const byId = catalog.byId;
  const canonicalId = resolveCanonicalTypeId(String(awnTypeId || "awn.page.topic"), byId);
  const entry = byId.get(canonicalId);
  if (!entry) return [];
  const merged = mergeTypeSchema(entry, byId);
  const keys = Array.isArray(merged["storage-slots"]) ? merged["storage-slots"] : [];
  return keys.map((key) => String(key || "").trim()).filter(Boolean);
}

module.exports = {
  INTERNAL_SLOT_KEYS,
  getPageSlotsPayload,
  resolveStorageSlotsForManifest,
  buildSlotEntry
};
