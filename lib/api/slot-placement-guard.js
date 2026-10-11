const { loadTypeCatalog, mergeTypeSchema, resolveCanonicalTypeId } = require("../catalog/type-catalog-loader");
const { getSlotTypesFromCatalog } = require("../awn/awn-canonical-model");
const {
  findSlotTypeForKey,
  resolveStorageSlotsForManifest
} = require("./page-slots-api");
const {
  normalizeStorageSlotKey,
  slotKeyToStorageFolder,
  slotKeyFromStorageFolder
} = require("../config/storage-slot-routing");
const {
  normalizeSlotAllowedContainers,
  PAGE_TOPIC_TYPE_ID
} = require("../config/slot-allowed-containers");
const {
  HUB_CHANNEL_TYPE_ID,
  HUB_MEDIA_TYPE_ID,
  isHubChannelTypeId,
  isHubMediaTypeId
} = require("../config/awn-hub-type-ids");

function resolveContainerTypeIdForPolicy(awnTypeId) {
  const raw = String(awnTypeId || "").trim();
  if (isHubChannelTypeId(raw)) return HUB_CHANNEL_TYPE_ID;
  if (isHubMediaTypeId(raw)) return HUB_MEDIA_TYPE_ID;
  if (raw.startsWith("awn.page.")) return PAGE_TOPIC_TYPE_ID;
  return raw;
}

/**
 * @param {object} params
 * @param {string} params.projectRoot
 * @param {string} params.agentRoot
 * @param {string} params.manifestRelPath
 * @param {string} params.slotKey
 * @param {() => Promise<string>} params.getAwnType
 */
async function validateContentSlotAccess(params) {
  const projectRoot = String(params.projectRoot || "").trim();
  const agentRoot = String(params.agentRoot || "").trim();
  const manifestRelPath = String(params.manifestRelPath || "").trim();
  const slotKey = normalizeStorageSlotKey(params.slotKey);
  if (!manifestRelPath || !slotKey) {
    return { ok: false, error: "Missing manifest path or slot" };
  }

  let awnType = "awn.page.topic";
  try {
    awnType = String(await params.getAwnType(manifestRelPath)).trim() || awnType;
  } catch {
    return { ok: false, error: "Failed to read page type from manifest" };
  }

  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  const canonicalType = resolveCanonicalTypeId(awnType, catalog.byId);
  const allowedSlotKeys = resolveStorageSlotsForManifest(projectRoot, agentRoot, canonicalType);
  if (allowedSlotKeys.length && !allowedSlotKeys.includes(slotKey)) {
    return {
      ok: false,
      error: `Slot "${slotKey}" is not listed in storage-slots for ${canonicalType}`
    };
  }

  const slotTypes = getSlotTypesFromCatalog(projectRoot, agentRoot);
  const slotRow = findSlotTypeForKey(slotTypes, slotKey);
  if (!slotRow?.id) return { ok: true };

  const slotEntry = catalog.byId.get(slotRow.id);
  if (!slotEntry) return { ok: true };

  const merged = mergeTypeSchema(slotEntry, catalog.byId);
  const allowedContainers = normalizeSlotAllowedContainers(merged["allowed-containers"]);
  if (!allowedContainers.length) return { ok: true };

  const containerId = resolveContainerTypeIdForPolicy(canonicalType);
  if (!allowedContainers.includes(containerId)) {
    return {
      ok: false,
      error: `Slot "${slotKey}" is not allowed on container type ${canonicalType} (policy: ${allowedContainers.join(", ")})`
    };
  }

  return { ok: true, slotKey, containerId, storageFolder: slotKeyToStorageFolder(slotKey) };
}

module.exports = {
  validateContentSlotAccess,
  resolveContainerTypeIdForPolicy,
  slotKeyFromStorageFolder
};
