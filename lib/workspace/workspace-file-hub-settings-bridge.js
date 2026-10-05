const FILE_HUB_MAX_ATTACH_MB_VALUES = [1, 2.5, 5, 10, 20, 25];

const FILE_HUB_VOICE_TO_SHELL = {
  "voice-file-hub-max-attach-mb": "fileHubMaxAttachMb"
};

const FILE_HUB_SHELL_DEFAULTS = {
  "voice-file-hub-max-attach-mb": "25"
};

function normalizeFileHubMaxAttachMb(value, fallback = 25) {
  const raw = value === undefined || value === null ? "" : String(value).trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (FILE_HUB_MAX_ATTACH_MB_VALUES.includes(parsed)) return parsed;
  return FILE_HUB_MAX_ATTACH_MB_VALUES.includes(fallback) ? fallback : 25;
}

function fileHubMaxAttachMbToBytes(mb) {
  const n = normalizeFileHubMaxAttachMb(mb);
  return Math.round(n * 1024 * 1024);
}

function formatFileHubMaxAttachMbLabel(mb) {
  const n = normalizeFileHubMaxAttachMb(mb);
  return Number.isInteger(n) ? `${n} МБ` : `${n} МБ`.replace(".", ",");
}

function hydrateWorkspaceFileHubFromShell(awnSettings = {}, shellFlat = {}) {
  const out = { ...(awnSettings && typeof awnSettings === "object" ? awnSettings : {}) };
  if ("voice-file-hub-max-attach-mb" in out) {
    out["voice-file-hub-max-attach-mb"] = String(normalizeFileHubMaxAttachMb(out["voice-file-hub-max-attach-mb"]));
    return out;
  }
  if (shellFlat.fileHubMaxAttachMb !== undefined && shellFlat.fileHubMaxAttachMb !== null) {
    out["voice-file-hub-max-attach-mb"] = String(normalizeFileHubMaxAttachMb(shellFlat.fileHubMaxAttachMb));
  }
  return out;
}

function buildShellFileHubPatchFromWorkspace(awnSettings = {}) {
  const source = awnSettings && typeof awnSettings === "object" ? awnSettings : {};
  if (!("voice-file-hub-max-attach-mb" in source)) return {};
  return {
    fileHubMaxAttachMb: normalizeFileHubMaxAttachMb(source["voice-file-hub-max-attach-mb"])
  };
}

function getFileHubSettingsDefaults() {
  return { ...FILE_HUB_SHELL_DEFAULTS };
}

module.exports = {
  FILE_HUB_MAX_ATTACH_MB_VALUES,
  FILE_HUB_VOICE_TO_SHELL,
  FILE_HUB_SHELL_DEFAULTS,
  normalizeFileHubMaxAttachMb,
  fileHubMaxAttachMbToBytes,
  formatFileHubMaxAttachMbLabel,
  hydrateWorkspaceFileHubFromShell,
  buildShellFileHubPatchFromWorkspace,
  getFileHubSettingsDefaults
};
