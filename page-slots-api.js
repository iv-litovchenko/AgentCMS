const { getSlotTypesFromCatalog, slotTypeIdToKey } = require("./awn-canonical-model");
const { loadTypeCatalog, mergeTypeSchema, resolveCanonicalTypeId } = require("./type-catalog-loader");

const INTERNAL_SLOT_KEYS = new Set(["main-single", "main-single-csv", "todo-single", "todo", "log-single"]);

const SLOT_KEY_TYPE_IDS = {
  scripts: ["awn.slot.script"],
  script: ["awn.slot.script"],
  note: ["awn.slot.note"],
  dialogs: ["awn.slot.dialogs"],
  thread: ["awn.slot.dialogs"]
};

function findSlotTypeForKey(slotTypes, slotKey) {
  const key = String(slotKey || "").trim();
  if (!key) return null;

  const explicitIds = SLOT_KEY_TYPE_IDS[key] || [];
  for (const id of [`awn.slot.${key}`, ...explicitIds]) {
    const hit = slotTypes.find((row) => row.id === id);
    if (hit) return hit;
  }

  return slotTypes.find((row) => slotTypeIdToKey(row.id) === key) || null;
}

function buildSlotEntry(slotKey, projectRoot, agentRoot) {
  const slotTypes = getSlotTypesFromCatalog(projectRoot, agentRoot);
  const slotType = findSlotTypeForKey(slotTypes, slotKey);

  const driver =
    slotType?.storageDriver ||
    (INTERNAL_SLOT_KEYS.has(slotKey) ? "internal" : "external");

  return {
    slot: slotKey,
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
  return keys.map((key) => String(key || "").trim()).filter(Boolean);
}

module.exports = {
  INTERNAL_SLOT_KEYS,
  getPageSlotsPayload,
  resolveStorageSlotsForManifest,
  buildSlotEntry,
  findSlotTypeForKey
};
