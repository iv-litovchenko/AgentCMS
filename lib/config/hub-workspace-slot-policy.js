/**
 * Which storage slots appear on hub workspaces (awn-media / awn-channels manifest overview).
 * Topic pages use the full DATA_STORAGE_SLOT_SPECS set (minus files on normal topics).
 */

const HUB_CHANNEL_SLOT_KEYS = ["inbox", "task-queue", "outbox"];
const HUB_MEDIA_SLOT_KEYS = ["files"];

function isHubChannelTopicPath(topicPath, helpers = {}) {
  const normalized = String(topicPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return false;
  if (typeof helpers.isAwnChannelHubWorkspacePath === "function" && helpers.isAwnChannelHubWorkspacePath(normalized)) {
    return true;
  }
  if (typeof helpers.isAwnChannelPageNodePath === "function" && helpers.isAwnChannelPageNodePath(normalized)) {
    return true;
  }
  return /^awn-channels\/[^/]+/i.test(normalized);
}

function isHubMediaTopicPath(topicPath, helpers = {}) {
  const normalized = String(topicPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return false;
  if (typeof helpers.isMediaLibraryHubWorkspacePath === "function" && helpers.isMediaLibraryHubWorkspacePath(normalized)) {
    return true;
  }
  if (typeof helpers.isMediaLibraryPageNodePath === "function" && helpers.isMediaLibraryPageNodePath(normalized)) {
    return true;
  }
  return /^awn-media\/[^/]+/i.test(normalized);
}

/**
 * @param {string} topicPath
 * @param {object} [helpers] — browser: isAwnChannelPageNodePath, isMediaLibraryPageNodePath, …
 * @returns {{ kind: 'channel'|'media', slotKeys: string[], defaultMemoryKind: string } | null}
 */
function resolveHubWorkspaceSlotPolicy(topicPath, helpers = {}) {
  const path = String(topicPath || "").trim();
  if (!path) return null;
  if (isHubChannelTopicPath(path, helpers)) {
    return {
      kind: "channel",
      slotKeys: HUB_CHANNEL_SLOT_KEYS,
      defaultMemoryKind: "inbox"
    };
  }
  if (isHubMediaTopicPath(path, helpers)) {
    return {
      kind: "media",
      slotKeys: HUB_MEDIA_SLOT_KEYS,
      defaultMemoryKind: "files"
    };
  }
  return null;
}

function filterHubWorkspaceSlotCounters(topicPath, slots, helpers = {}) {
  const policy = resolveHubWorkspaceSlotPolicy(topicPath, helpers);
  if (!policy) return slots;
  const allowed = new Set(policy.slotKeys);
  return (slots || []).filter((slot) => allowed.has(slot.id));
}

function shouldShowHubWorkspaceSlotStrip(topicPath, slotCount, helpers = {}) {
  const policy = resolveHubWorkspaceSlotPolicy(topicPath, helpers);
  if (!policy) return false;
  return slotCount > 1;
}

module.exports = {
  HUB_CHANNEL_SLOT_KEYS,
  HUB_MEDIA_SLOT_KEYS,
  resolveHubWorkspaceSlotPolicy,
  filterHubWorkspaceSlotCounters,
  shouldShowHubWorkspaceSlotStrip,
  isHubChannelTopicPath,
  isHubMediaTopicPath
};
