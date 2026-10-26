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
  HUB_REPOSITORY_TYPE_ID,
  isHubChannelTypeId,
  isHubMediaTypeId,
  isHubRepositoryTypeId,
  isDatabaseFrameTypeId
} = require("../config/awn-hub-type-ids");
const {
  isRepositoryCloneRootSlot,
  listAllowedRepositoryPlacementSlots,
  resolveRepositoryClonePlacementSlot
} = require("../config/repository-clone-placement");
const { isFlexibleTopicPlacementSlot } = require("../config/flexible-topic-placement-slot-key");
const { resolveTopicFlexiblePlacementSlot } = require("../config/flexible-topic-placement");

function resolveContainerTypeIdForPolicy(awnTypeId) {
  const raw = String(awnTypeId || "").trim();
  if (isHubChannelTypeId(raw)) return HUB_CHANNEL_TYPE_ID;
  if (isHubMediaTypeId(raw)) return HUB_MEDIA_TYPE_ID;
  if (isHubRepositoryTypeId(raw)) return HUB_REPOSITORY_TYPE_ID;
  if (isDatabaseFrameTypeId(raw)) return raw;
  if (raw.startsWith("awn.page.") || raw.startsWith("awn.hub.")) return PAGE_TOPIC_TYPE_ID;
  return raw;
}

async function resolveTopicSlotsFlexibleFlag(manifestRelPath, params, containerId) {
  if (containerId !== PAGE_TOPIC_TYPE_ID) return false;
  if (typeof params.slotsFlexible === "boolean") return params.slotsFlexible;
  if (typeof params.getTopicSlotsFlexible === "function") {
    return Boolean(await params.getTopicSlotsFlexible(manifestRelPath));
  }
  return false;
}

/**
 * @param {object} params
 * @param {string} params.projectRoot
 * @param {string} params.agentRoot
 * @param {string} params.manifestRelPath
 * @param {string} params.slotKey
 * @param {() => Promise<string>} params.getAwnType
 * @param {() => Promise<boolean>} [params.getTopicSlotsFlexible]
 * @param {boolean} [params.slotsFlexible]
 */
async function validateContentSlotAccess(params) {
  const projectRoot = String(params.projectRoot || "").trim();
  const agentRoot = String(params.agentRoot || "").trim();
  const manifestRelPath = String(params.manifestRelPath || "").trim();
  const slotRaw = String(params.slotKey || "").trim();
  if (!manifestRelPath || !slotRaw) {
    return { ok: false, error: "Missing manifest path or slot", allowedSlots: [] };
  }

  let awnType = "awn.hub.topic";
  try {
    awnType = String(await params.getAwnType(manifestRelPath)).trim() || awnType;
  } catch {
    return { ok: false, error: "Failed to read page type from manifest", allowedSlots: [] };
  }

  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  const canonicalType = resolveCanonicalTypeId(awnType, catalog.byId);
  const containerId = resolveContainerTypeIdForPolicy(canonicalType);
  const allowedSlotKeys = resolveStorageSlotsForManifest(projectRoot, agentRoot, canonicalType);
  const isRepositoryContainer = isHubRepositoryTypeId(canonicalType) || isHubRepositoryTypeId(awnType);
  const slotsFlexible = await resolveTopicSlotsFlexibleFlag(manifestRelPath, params, containerId);

  const repositoryVerdict = resolveRepositoryClonePlacementSlot(slotRaw, { isRepositoryContainer });
  if (repositoryVerdict) {
    if (!repositoryVerdict.ok) {
      return {
        ...repositoryVerdict,
        allowedSlots: isRepositoryContainer ? listAllowedRepositoryPlacementSlots() : allowedSlotKeys
      };
    }
    return {
      ok: true,
      slotKey: repositoryVerdict.slotKey,
      publicSlot: repositoryVerdict.publicSlot,
      containerId,
      storageFolder: ""
    };
  }

  if (isRepositoryContainer && !isRepositoryCloneRootSlot(slotRaw)) {
    const normalized = normalizeStorageSlotKey(slotRaw);
    if (allowedSlotKeys.length && !allowedSlotKeys.includes(normalized)) {
      return {
        ok: false,
        error: `Slot "${normalized}" is not valid for repository — use clone tree slot "root" or hub storage files|assets.`,
        allowedSlots: listAllowedRepositoryPlacementSlots()
      };
    }
  }

  if (containerId === PAGE_TOPIC_TYPE_ID) {
    const flexibleVerdict = resolveTopicFlexiblePlacementSlot(slotRaw, {
      slotsFlexible,
      catalogSlotKeys: allowedSlotKeys
    });
    if (flexibleVerdict) {
      if (!flexibleVerdict.ok) return flexibleVerdict;
      return {
        ok: true,
        slotKey: flexibleVerdict.slotKey,
        publicSlot: flexibleVerdict.publicSlot,
        containerId,
        storageFolder: slotKeyToStorageFolder(flexibleVerdict.slotKey)
      };
    }
  } else if (isFlexibleTopicPlacementSlot(slotRaw)) {
    return {
      ok: false,
      error: `Slot "flexible" is only for topics with awn-slots-template flexible.`,
      allowedSlots: allowedSlotKeys,
      slotsTemplate: slotsFlexible ? "flexible" : "standard"
    };
  }

  const slotKey = normalizeStorageSlotKey(slotRaw);
  if (allowedSlotKeys.length && !allowedSlotKeys.includes(slotKey)) {
    return {
      ok: false,
      error: `Slot "${slotKey}" is not listed in storage-slots for ${canonicalType}`,
      allowedSlots: allowedSlotKeys
    };
  }

  const slotTypes = getSlotTypesFromCatalog(projectRoot, agentRoot);
  const slotRow = findSlotTypeForKey(slotTypes, slotKey);
  if (!slotRow?.id) {
    return {
      ok: true,
      slotKey,
      publicSlot: slotKey,
      storageFolder: slotKeyToStorageFolder(slotKey)
    };
  }

  const slotEntry = catalog.byId.get(slotRow.id);
  if (!slotEntry) {
    return {
      ok: true,
      slotKey,
      publicSlot: slotKey,
      storageFolder: slotKeyToStorageFolder(slotKey)
    };
  }

  const merged = mergeTypeSchema(slotEntry, catalog.byId);
  const allowedContainers = normalizeSlotAllowedContainers(merged["allowed-containers"]);
  if (!allowedContainers.length) {
    return {
      ok: true,
      slotKey,
      publicSlot: slotKey,
      containerId,
      storageFolder: slotKeyToStorageFolder(slotKey)
    };
  }

  if (!allowedContainers.includes(containerId)) {
    return {
      ok: false,
      error: `Slot "${slotKey}" is not allowed on container type ${canonicalType} (policy: ${allowedContainers.join(", ")})`,
      allowedSlots: allowedSlotKeys
    };
  }

  return {
    ok: true,
    slotKey,
    publicSlot: slotKey,
    containerId,
    storageFolder: slotKeyToStorageFolder(slotKey)
  };
}

module.exports = {
  validateContentSlotAccess,
  resolveContainerTypeIdForPolicy,
  slotKeyFromStorageFolder
};
