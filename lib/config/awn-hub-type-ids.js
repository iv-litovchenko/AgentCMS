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

module.exports = {
  HUB_REPOSITORY_TYPE_ID,
  HUB_MEDIA_TYPE_ID,
  HUB_CHANNEL_TYPE_ID,
  LEGACY_REPOSITORY_TYPE_ID,
  LEGACY_MEDIA_TYPE_ID,
  isHubRepositoryTypeId,
  isHubMediaTypeId,
  isHubChannelTypeId
};
