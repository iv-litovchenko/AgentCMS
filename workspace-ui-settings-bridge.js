const UI_VOICE_TO_SHELL = {
  "voice-ui-dialog-scroll-ratio": "dialogScrollRatio"
};

const UI_SHELL_DEFAULTS = {
  "voice-ui-dialog-scroll-ratio": "1"
};

function normalizeDialogScrollRatio(value) {
  const ratio = Number(value);
  if (!Number.isFinite(ratio)) return null;
  return Math.round(Math.min(1, Math.max(0, ratio)) * 10000) / 10000;
}

function hydrateVoiceKeysFromShell(awnSettings = {}, shellFlat = {}, keyMap) {
  const out = { ...(awnSettings && typeof awnSettings === "object" ? awnSettings : {}) };
  for (const [voiceKey, shellKey] of Object.entries(keyMap)) {
    if (voiceKey in out) continue;
    if (shellKey in shellFlat && shellFlat[shellKey] !== undefined && shellFlat[shellKey] !== null) {
      out[voiceKey] = shellFlat[shellKey];
    }
  }
  return out;
}

function buildShellPatchFromWorkspace(awnSettings = {}, keyMap) {
  const source = awnSettings && typeof awnSettings === "object" ? awnSettings : {};
  const patch = {};
  for (const [voiceKey, shellKey] of Object.entries(keyMap)) {
    if (!(voiceKey in source)) continue;
    const normalized = normalizeDialogScrollRatio(source[voiceKey]);
    if (normalized != null) patch[shellKey] = normalized;
  }
  return patch;
}

function hydrateWorkspaceUiFromShell(awnSettings = {}, shellFlat = {}) {
  const out = hydrateVoiceKeysFromShell(awnSettings, shellFlat, UI_VOICE_TO_SHELL);
  if ("voice-ui-dialog-scroll-ratio" in out) return out;
  const ratio = normalizeDialogScrollRatio(shellFlat.dialogScrollRatio);
  if (ratio != null) out["voice-ui-dialog-scroll-ratio"] = String(ratio);
  return out;
}

function buildShellUiPatchFromWorkspace(awnSettings = {}) {
  return buildShellPatchFromWorkspace(awnSettings, UI_VOICE_TO_SHELL);
}

function getUiSettingsDefaults() {
  return { ...UI_SHELL_DEFAULTS };
}

module.exports = {
  UI_VOICE_TO_SHELL,
  hydrateWorkspaceUiFromShell,
  buildShellUiPatchFromWorkspace,
  getUiSettingsDefaults,
  normalizeDialogScrollRatio
};
