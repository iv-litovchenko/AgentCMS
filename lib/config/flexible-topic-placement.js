const { normalizeStorageSlotKey, isExternalMemorySlot, isInternalBundleSlot } = require("./storage-slot-routing");
const { INTERNAL_SLOT_KEYS } = require("../api/page-slots-api");
const {
  FLEXIBLE_TOPIC_PLACEMENT_SLOT,
  isFlexibleTopicPlacementSlot
} = require("./flexible-topic-placement-slot-key");

function isFlexibleTopicExternalAccessSlot(raw) {
  return isFlexibleTopicPlacementSlot(raw) || isExternalMemorySlot(raw);
}

function listAllowedFlexibleTopicPlacementSlots(catalogSlotKeys) {
  const keys = Array.isArray(catalogSlotKeys) ? catalogSlotKeys : [];
  const internal = keys.filter((key) => INTERNAL_SLOT_KEYS.has(normalizeStorageSlotKey(key)));
  return [FLEXIBLE_TOPIC_PLACEMENT_SLOT, ...internal];
}

/**
 * @param {string} rawSlot
 * @param {{ slotsFlexible: boolean, catalogSlotKeys: string[] }} ctx
 * @returns {{ ok: true, slotKey: string, publicSlot: string } | { ok: false, error: string, allowedSlots: string[], slotsTemplate?: string }}
 */
function resolveTopicFlexiblePlacementSlot(rawSlot, ctx) {
  const raw = String(rawSlot || "").trim();
  if (!raw) {
    return { ok: false, error: "Missing manifest path or slot", allowedSlots: [] };
  }

  const { slotsFlexible, catalogSlotKeys } = ctx;
  const allowedStandard = [
    ...new Set(
      (catalogSlotKeys || []).map((k) => normalizeStorageSlotKey(String(k || "").trim())).filter(Boolean)
    )
  ];

  if (isFlexibleTopicPlacementSlot(raw)) {
    if (!slotsFlexible) {
      return {
        ok: false,
        error: `Slot "${FLEXIBLE_TOPIC_PLACEMENT_SLOT}" is only for topics with awn-slots-template flexible.`,
        allowedSlots: allowedStandard,
        slotsTemplate: "standard"
      };
    }
    return {
      ok: true,
      slotKey: "memory",
      publicSlot: FLEXIBLE_TOPIC_PLACEMENT_SLOT
    };
  }

  if (slotsFlexible) {
    if (isFlexibleTopicExternalAccessSlot(raw)) {
      return {
        ok: true,
        slotKey: "memory",
        publicSlot: FLEXIBLE_TOPIC_PLACEMENT_SLOT
      };
    }
    const normalized = normalizeStorageSlotKey(raw);
    if (isInternalBundleSlot(normalized) && allowedStandard.includes(normalized)) {
      return { ok: true, slotKey: normalized, publicSlot: normalized };
    }
    return {
      ok: false,
      error:
        `Topic uses awn-slots-template flexible: list/read/write files in awn-storage/ with placement.slot "${FLEXIBLE_TOPIC_PLACEMENT_SLOT}" only.`,
      allowedSlots: listAllowedFlexibleTopicPlacementSlots(allowedStandard),
      slotsTemplate: "flexible"
    };
  }

  return null;
}

module.exports = {
  FLEXIBLE_TOPIC_PLACEMENT_SLOT,
  isFlexibleTopicPlacementSlot,
  isFlexibleTopicExternalAccessSlot,
  listAllowedFlexibleTopicPlacementSlots,
  resolveTopicFlexiblePlacementSlot
};
