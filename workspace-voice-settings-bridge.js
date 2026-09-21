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

const TTS_RATE_VOICE_KEYS = {
  browser: "voice-tts-rate",
  edge: "voice-tts-edge-rate",
  elevenlabs: "voice-tts-elevenlabs-rate"
};

const TTS_VOICE_TO_SHELL = {
  "voice-tts-enabled": "ttsEnabled",
  "voice-tts-engine": "ttsEngine",
  "voice-tts-playback-mode": "ttsPlaybackMode",
  "voice-tts-prompt": "ttsPrompt",
  "voice-tts-pitch": "ttsPitch",
  "voice-tts-include-captions": "ttsIncludeCaptions",
  "voice-tts-browser-lang": "ttsBrowserLang",
  "voice-tts-browser-voice": "ttsBrowserVoice",
  "voice-tts-edge-voice": "ttsEdgeVoice",
  "voice-tts-piper-model": "ttsPiperModel",
  "voice-tts-piper-binary": "ttsPiperBinary",
  "voice-tts-elevenlabs-api-key": "ttsElevenlabsApiKey",
  "voice-tts-elevenlabs-voice-id": "ttsElevenlabsVoiceId",
  "voice-tts-elevenlabs-model": "ttsElevenlabsModel"
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

const TTS_SHELL_DEFAULTS = {
  "voice-tts-enabled": true,
  "voice-tts-engine": "browser",
  "voice-tts-playback-mode": "dialog",
  "voice-tts-prompt": "",
  "voice-tts-rate": 1,
  "voice-tts-pitch": 1,
  "voice-tts-include-captions": true,
  "voice-tts-browser-lang": "ru-RU",
  "voice-tts-browser-voice": "",
  "voice-tts-edge-voice": "ru-RU-SvetlanaNeural",
  "voice-tts-edge-rate": 1,
  "voice-tts-piper-model": "",
  "voice-tts-piper-binary": "piper",
  "voice-tts-elevenlabs-api-key": "",
  "voice-tts-elevenlabs-voice-id": "EXAVITQu4vr4xnSDxMaL",
  "voice-tts-elevenlabs-model": "eleven_multilingual_v2",
  "voice-tts-elevenlabs-rate": 1
};

function hydrateTtsRateFields(awnSettings = {}, shellFlat = {}) {
  const out = { ...awnSettings };
  const rate = shellFlat.ttsRate;
  if (rate === undefined || rate === null) return out;
  for (const key of Object.values(TTS_RATE_VOICE_KEYS)) {
    if (!(key in out)) out[key] = rate;
  }
  return out;
}

function resolveTtsRateFromWorkspace(awnSettings = {}) {
  const source = awnSettings && typeof awnSettings === "object" ? awnSettings : {};
  const engine = String(source["voice-tts-engine"] || "browser").trim();
  const preferredKey = TTS_RATE_VOICE_KEYS[engine] || TTS_RATE_VOICE_KEYS.browser;
  if (preferredKey in source) return source[preferredKey];
  for (const key of Object.values(TTS_RATE_VOICE_KEYS)) {
    if (key in source) return source[key];
  }
  return undefined;
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
    patch[shellKey] = source[voiceKey];
  }
  return patch;
}

function hydrateWorkspaceVoiceProactiveFromShell(awnSettings = {}, shellFlat = {}) {
  return hydrateVoiceKeysFromShell(awnSettings, shellFlat, PROACTIVE_VOICE_TO_SHELL);
}

function hydrateWorkspaceVoiceTtsFromShell(awnSettings = {}, shellFlat = {}) {
  let out = hydrateVoiceKeysFromShell(awnSettings, shellFlat, TTS_VOICE_TO_SHELL);
  out = hydrateTtsRateFields(out, shellFlat);
  return out;
}

function hydrateWorkspaceVoiceFromShell(awnSettings = {}, shellFlat = {}) {
  let out = hydrateWorkspaceVoiceProactiveFromShell(awnSettings, shellFlat);
  out = hydrateWorkspaceVoiceTtsFromShell(out, shellFlat);
  return out;
}

function buildShellProactivePatchFromWorkspace(awnSettings = {}) {
  return buildShellPatchFromWorkspace(awnSettings, PROACTIVE_VOICE_TO_SHELL);
}

function buildShellTtsPatchFromWorkspace(awnSettings = {}) {
  const patch = buildShellPatchFromWorkspace(awnSettings, TTS_VOICE_TO_SHELL);
  const rate = resolveTtsRateFromWorkspace(awnSettings);
  if (rate !== undefined) patch.ttsRate = rate;
  return patch;
}

function buildShellVoicePatchFromWorkspace(awnSettings = {}) {
  return {
    ...buildShellProactivePatchFromWorkspace(awnSettings),
    ...buildShellTtsPatchFromWorkspace(awnSettings)
  };
}

function getProactiveVoiceSettingsDefaults() {
  return { ...PROACTIVE_SHELL_DEFAULTS };
}

function getTtsVoiceSettingsDefaults() {
  return { ...TTS_SHELL_DEFAULTS };
}

function getVoiceSettingsDefaults() {
  return {
    ...getProactiveVoiceSettingsDefaults(),
    ...getTtsVoiceSettingsDefaults()
  };
}

module.exports = {
  PROACTIVE_VOICE_TO_SHELL,
  TTS_RATE_VOICE_KEYS,
  TTS_VOICE_TO_SHELL,
  hydrateWorkspaceVoiceProactiveFromShell,
  hydrateWorkspaceVoiceTtsFromShell,
  hydrateWorkspaceVoiceFromShell,
  buildShellProactivePatchFromWorkspace,
  buildShellTtsPatchFromWorkspace,
  buildShellVoicePatchFromWorkspace,
  getProactiveVoiceSettingsDefaults,
  getTtsVoiceSettingsDefaults,
  getVoiceSettingsDefaults
};
