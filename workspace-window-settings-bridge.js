const WINDOW_VOICE_TO_AWN_SHELL = {
  "voice-window-compact-mode": "windowCompact"
};

const WINDOW_VOICE_DEFAULTS = {
  "voice-window-compact-mode": false
};

function hydrateVoiceKeysFromAwnShell(awnSettings = {}, awnShellFlat = {}, keyMap) {
  const out = { ...(awnSettings && typeof awnSettings === "object" ? awnSettings : {}) };
  for (const [voiceKey, shellKey] of Object.entries(keyMap)) {
    if (voiceKey in out) continue;
    if (shellKey in awnShellFlat && awnShellFlat[shellKey] !== undefined && awnShellFlat[shellKey] !== null) {
      out[voiceKey] = awnShellFlat[shellKey];
    }
  }
  return out;
}

function buildAwnShellPatchFromWorkspace(awnSettings = {}, keyMap) {
  const source = awnSettings && typeof awnSettings === "object" ? awnSettings : {};
  const patch = {};
  for (const [voiceKey, shellKey] of Object.entries(keyMap)) {
    if (!(voiceKey in source)) continue;
    patch[shellKey] = source[voiceKey];
  }
  return patch;
}

function hydrateWorkspaceWindowFromAwnShell(awnSettings = {}, awnShellFlat = {}) {
  return hydrateVoiceKeysFromAwnShell(awnSettings, awnShellFlat, WINDOW_VOICE_TO_AWN_SHELL);
}

function buildAwnShellWindowPatchFromWorkspace(awnSettings = {}) {
  return buildAwnShellPatchFromWorkspace(awnSettings, WINDOW_VOICE_TO_AWN_SHELL);
}

function getWindowVoiceSettingsDefaults() {
  return { ...WINDOW_VOICE_DEFAULTS };
}

module.exports = {
  WINDOW_VOICE_TO_AWN_SHELL,
  hydrateWorkspaceWindowFromAwnShell,
  buildAwnShellWindowPatchFromWorkspace,
  getWindowVoiceSettingsDefaults
};
