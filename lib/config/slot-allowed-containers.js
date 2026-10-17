/** Canonical page/hub type ids for slot `allowed-containers` (awn-system/types/slots). */

const PAGE_TOPIC_TYPE_ID = "awn.hub.topic";
const { HUB_MEDIA_TYPE_ID, HUB_CHANNEL_TYPE_ID } = require("./awn-hub-type-ids");

const SLOT_ALLOWED_CONTAINER_ALIASES = {
  topic: PAGE_TOPIC_TYPE_ID,
  "hub.media": HUB_MEDIA_TYPE_ID,
  "hub.channel": HUB_CHANNEL_TYPE_ID
};

function normalizeSlotAllowedContainerId(raw) {
  const key = String(raw || "").trim();
  if (!key) return "";
  return SLOT_ALLOWED_CONTAINER_ALIASES[key] || key;
}

function normalizeSlotAllowedContainers(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const entry of list) {
    const id = normalizeSlotAllowedContainerId(entry);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

module.exports = {
  PAGE_TOPIC_TYPE_ID,
  SLOT_ALLOWED_CONTAINER_ALIASES,
  normalizeSlotAllowedContainerId,
  normalizeSlotAllowedContainers
};
