const WINDOW_VOICE_TO_SHELL = {
  "voice-window-character-model": "windowCharacterModel",
  "voice-window-compact-mode": "windowCompact",
  "voice-window-topmost": "windowTopmost",
  "voice-window-pet-overlay": "windowPetOverlay",
  "voice-window-transparent": "windowTransparent",
  "voice-window-background": "windowBackground",
  "voice-window-background-image-url": "windowBackgroundImageUrl",
  "voice-window-compact-dialog-qa": "compactDialogQa",
  "voice-window-dialog-auto-scroll": "dialogAutoScroll",
  "voice-window-keep-awake": "windowKeepAwake",
  "voice-window-processing-sound": "windowProcessingSound"
};

const WINDOW_SHELL_DEFAULTS = {
  "voice-window-character-model": "robot",
  "voice-window-compact-mode": false,
  "voice-window-topmost": true,
  "voice-window-pet-overlay": false,
  "voice-window-transparent": false,
  "voice-window-background": "wallpaper",
  "voice-window-background-image-url": "",
  "voice-window-compact-dialog-qa": true,
  "voice-window-dialog-auto-scroll": true,
  "voice-window-keep-awake": false,
  "voice-window-processing-sound": "off"
};

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
    patch[shellKey] = source[voiceKey];
  }
  return patch;
}

function hydrateWorkspaceWindowFromShell(awnSettings = {}, shellFlat = {}) {
  return hydrateVoiceKeysFromShell(awnSettings, shellFlat, WINDOW_VOICE_TO_SHELL);
}

function buildShellWindowPatchFromWorkspace(awnSettings = {}) {
  const patch = buildShellPatchFromWorkspace(awnSettings, WINDOW_VOICE_TO_SHELL);
  const bg = String(patch.windowBackground || "").trim();
  if (bg === "transparent") {
    patch.windowTransparent = true;
    patch.windowBackground = "wallpaper";
  }
  if (bg === "custom" && !String(patch.windowBackgroundImageUrl || "").trim()) {
    patch.windowBackground = "wallpaper";
  }
  return patch;
}

function getWindowVoiceSettingsDefaults() {
  return { ...WINDOW_SHELL_DEFAULTS };
}

module.exports = {
  WINDOW_VOICE_TO_SHELL,
  WINDOW_SHELL_DEFAULTS,
  hydrateWorkspaceWindowFromShell,
  buildShellWindowPatchFromWorkspace,
  getWindowVoiceSettingsDefaults
};
