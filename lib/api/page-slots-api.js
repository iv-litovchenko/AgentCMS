const { getSlotTypesFromCatalog, slotTypeIdToKey } = require("../awn/awn-canonical-model");
const { loadTypeCatalog, mergeTypeSchema, resolveCanonicalTypeId } = require("../catalog/type-catalog-loader");
const { normalizeStorageSlotKey } = require("../config/storage-slot-routing");

const INTERNAL_SLOT_KEYS = new Set([
  "main-single",
  "main-single-csv",
  "todo-single",
  "todo",
  "roadmap-single",
  "roadmap"
]);

const SLOT_KEY_TYPE_IDS = {
  notes: ["awn.slot.note"],
  note: ["awn.slot.note"],
  scripts: ["awn.slot.script"],
  script: ["awn.slot.script"],
  discussion: ["awn.slot.discussion"],
  thread: ["awn.slot.discussion"],
  dialogs: ["awn.slot.discussion"]
};

function findSlotTypeForKey(slotTypes, slotKey) {
  const key = normalizeStorageSlotKey(String(slotKey || "").trim());
  if (!key) return null;

  const explicitIds = SLOT_KEY_TYPE_IDS[key] || [];
  for (const id of [`awn.slot.${key}`, ...explicitIds]) {
    const hit = slotTypes.find((row) => row.id === id);
    if (hit) return hit;
  }

  return slotTypes.find((row) => slotTypeIdToKey(row.id) === key) || null;
}

function buildSlotEntry(slotKey, projectRoot, agentRoot) {
  const normalizedKey = normalizeStorageSlotKey(String(slotKey || "").trim());
  const slotTypes = getSlotTypesFromCatalog(projectRoot, agentRoot);
  const slotType = findSlotTypeForKey(slotTypes, normalizedKey);

  const driver =
    slotType?.storageDriver ||
    (INTERNAL_SLOT_KEYS.has(normalizedKey) ? "internal" : "external");

  return {
    slot: normalizedKey,
    driver,
    path: slotType?.path || (driver === "internal" ? `${slotKey}` : `${slotKey}/`),
    allowedContent: slotType?.allowedContent || [],
    acceptFiles: slotType?.acceptFiles || []
  };
}

function getPageSlotsPayload(projectRoot, agentRoot, storageSlotKeys = []) {
  const keys = [...new Set((storageSlotKeys || []).map((key) => String(key || "").trim()).filter(Boolean))];
  const slots = keys.map((slotKey) => buildSlotEntry(slotKey, projectRoot, agentRoot));

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
  return [...new Set(keys.map((key) => normalizeStorageSlotKey(String(key || "").trim())).filter(Boolean))];
}

module.exports = {
  INTERNAL_SLOT_KEYS,
  getPageSlotsPayload,
  resolveStorageSlotsForManifest,
  buildSlotEntry,
  findSlotTypeForKey
};
