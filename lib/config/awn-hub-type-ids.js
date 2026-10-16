/** Реестры вне дерева страниц (awn-repositories/, awn-media/). */
const HUB_REPOSITORY_TYPE_ID = "awn.hub.repository";
const HUB_MEDIA_TYPE_ID = "awn.hub.media";
const HUB_CHANNEL_TYPE_ID = "awn.hub.channel";

const LEGACY_REPOSITORY_TYPE_ID = "awn.repository";
const LEGACY_MEDIA_TYPE_ID = "awn.media";

function isHubRepositoryTypeId(typeId) {
  const raw = String(typeId || "").trim().toLowerCase();
  return raw === HUB_REPOSITORY_TYPE_ID || raw === LEGACY_REPOSITORY_TYPE_ID;
}

function isHubMediaTypeId(typeId) {
  const raw = String(typeId || "").trim().toLowerCase();
  return raw === HUB_MEDIA_TYPE_ID || raw === LEGACY_MEDIA_TYPE_ID;
}

function isHubChannelTypeId(typeId) {
  const raw = String(typeId || "").trim().toLowerCase();
  return raw === HUB_CHANNEL_TYPE_ID;
}

const HUB_DATABASE_FRAME_TYPE_IDS = new Set([
  "awn.hub.database.single",
  "awn.hub.database.group",
  "awn.hub.database.collection",
  "awn.hub.database.taxonomy-collection"
]);

function isDatabaseFrameTypeId(typeId) {
  const raw = String(typeId || "").trim().toLowerCase();
  if (HUB_DATABASE_FRAME_TYPE_IDS.has(raw)) return true;
  if (raw.startsWith("awn.hub.database.frame.") && raw !== "awn.hub.database.frame.base") {
    return true;
  }
  return raw.startsWith("awn.database.frame.") && raw !== "awn.database.frame.base";
}

module.exports = {
  HUB_REPOSITORY_TYPE_ID,
  HUB_MEDIA_TYPE_ID,
  HUB_CHANNEL_TYPE_ID,
  LEGACY_REPOSITORY_TYPE_ID,
  LEGACY_MEDIA_TYPE_ID,
  isHubRepositoryTypeId,
  isHubMediaTypeId,
  isHubChannelTypeId,
  isDatabaseFrameTypeId
};
