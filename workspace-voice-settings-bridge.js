const PROACTIVE_VOICE_TO_SHELL = {
  "voice-proactive-enabled": "proactiveEnabled",
  "voice-proactive-idle-seconds-min": "proactiveIdleSecondsMin",
  "voice-proactive-idle-seconds-max": "proactiveIdleSecondsMax",
  "voice-proactive-cooldown-seconds": "proactiveCooldownSeconds",
  "voice-proactive-prompt": "proactivePrompt",
  "voice-proactive-quiet-hours-enabled": "proactiveQuietHoursEnabled",
  "voice-proactive-quiet-hours-start": "proactiveQuietStart",
  "voice-proactive-quiet-hours-end": "proactiveQuietEnd"
};

const PROACTIVE_SHELL_DEFAULTS = {
  "voice-proactive-enabled": false,
  "voice-proactive-idle-seconds-min": 30,
  "voice-proactive-idle-seconds-max": 60,
  "voice-proactive-cooldown-seconds": 180,
  "voice-proactive-quiet-hours-enabled": true,
  "voice-proactive-quiet-hours-start": "23:00",
  "voice-proactive-quiet-hours-end": "07:00",
  "voice-proactive-prompt": ""
};

function hydrateWorkspaceVoiceProactiveFromShell(awnSettings = {}, shellFlat = {}) {
  const out = { ...(awnSettings && typeof awnSettings === "object" ? awnSettings : {}) };
  for (const [voiceKey, shellKey] of Object.entries(PROACTIVE_VOICE_TO_SHELL)) {
    if (voiceKey in out) continue;
    if (shellKey in shellFlat && shellFlat[shellKey] !== undefined && shellFlat[shellKey] !== null) {
      out[voiceKey] = shellFlat[shellKey];
    }
  }
  return out;
}

function buildShellProactivePatchFromWorkspace(awnSettings = {}) {
  const source = awnSettings && typeof awnSettings === "object" ? awnSettings : {};
  const patch = {};
  for (const [voiceKey, shellKey] of Object.entries(PROACTIVE_VOICE_TO_SHELL)) {
    if (!(voiceKey in source)) continue;
    patch[shellKey] = source[voiceKey];
  }
  return patch;
}

function getProactiveVoiceSettingsDefaults() {
  return { ...PROACTIVE_SHELL_DEFAULTS };
}

module.exports = {
  PROACTIVE_VOICE_TO_SHELL,
  hydrateWorkspaceVoiceProactiveFromShell,
  buildShellProactivePatchFromWorkspace,
  getProactiveVoiceSettingsDefaults
};
