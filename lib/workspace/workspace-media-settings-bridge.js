const MEDIA_VOICE_TO_SHELL = {
  "voice-media-camera-enabled": "cameraEnabled",
  "voice-media-camera-on-speech": "cameraOnSpeech",
  "voice-media-camera-facing": "cameraFacing",
  "voice-media-screen-enabled": "screenEnabled",
  "voice-media-screen-on-speech": "screenOnSpeech"
};

const MEDIA_SHELL_DEFAULTS = {
  "voice-media-camera-enabled": false,
  "voice-media-camera-on-speech": true,
  "voice-media-camera-facing": "environment",
  "voice-media-screen-enabled": false,
  "voice-media-screen-on-speech": false
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

function hydrateWorkspaceMediaFromShell(awnSettings = {}, shellFlat = {}) {
  return hydrateVoiceKeysFromShell(awnSettings, shellFlat, MEDIA_VOICE_TO_SHELL);
}

function buildShellMediaPatchFromWorkspace(awnSettings = {}) {
  const patch = buildShellPatchFromWorkspace(awnSettings, MEDIA_VOICE_TO_SHELL);
  const facing = String(patch.cameraFacing || "").trim();
  if (facing && !["user", "environment", "device"].includes(facing)) {
    patch.cameraFacing = "environment";
  }
  return patch;
}

function getMediaSettingsDefaults() {
  return { ...MEDIA_SHELL_DEFAULTS };
}

module.exports = {
  MEDIA_VOICE_TO_SHELL,
  hydrateWorkspaceMediaFromShell,
  buildShellMediaPatchFromWorkspace,
  getMediaSettingsDefaults
};
