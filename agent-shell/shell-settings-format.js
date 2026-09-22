/** Nested on-disk format ↔ flat runtime model for Shell settings. */

const { RUNTIME_DEFAULTS } = require("./runtime-bridge");

const SETTINGS_FORMAT_VERSION = 6;

const TTS_ENGINE_IDS = ["browser", "edge", "piper", "elevenlabs"];

/** Тип подключения runtime на диске: cli = терминал, agent = HTTP/gateway. */
const RUNTIME_KIND = {
  claude: "cli",
  codex: "cli",
  qwenpaw: "agent",
  cursor: "agent",
  openclaw: "agent",
  hermes: "agent",
  "agent-zero": "agent"
};

const ALL_RUNTIME_IDS = ["qwenpaw", "claude", "codex", "cursor", "openclaw", "hermes", "agent-zero"];

const RUNTIME_FLAT_SUFFIX = {
  cliPath: "CliPath",
  baseUrl: "BaseUrl",
  apiKey: "ApiKey",
  model: "Model",
  profile: "Profile",
  agentId: "AgentId",
  sessionId: "SessionId",
  permissionMode: "PermissionMode"
};

const RUNTIME_FIELDS_BY_KIND = {
  cli: ["cliPath", "model", "sessionId", "permissionMode"],
  agent: ["baseUrl", "apiKey", "model", "profile", "agentId", "sessionId"]
};

function runtimeKind(id) {
  return RUNTIME_KIND[id] || "agent";
}

function normalizeRuntimeKind(value) {
  const raw = String(value || "").trim();
  if (raw === "cli") return "cli";
  if (raw === "agent" || raw === "url") return "agent";
  return "";
}

function isNestedSettings(raw) {
  return Boolean(
    raw &&
      typeof raw === "object" &&
      !Array.isArray(raw) &&
      (raw.route || raw.cms || raw.voice || raw.formatVersion)
  );
}

function flattenQwenpawRuntime(cfg, flat) {
  if (!cfg || typeof cfg !== "object") return;
  if (cfg.baseUrl !== undefined) flat.qwenpawBaseUrl = cfg.baseUrl;
  if (cfg.agentId !== undefined) flat.qwenpawAgentId = cfg.agentId;
  if (cfg.sessionId !== undefined) flat.qwenpawSessionId = cfg.sessionId;
  if (cfg.userId !== undefined) flat.qwenpawUserId = cfg.userId;
  if (cfg.chatName !== undefined) flat.qwenpawChatName = cfg.chatName;
  const stt = cfg.stt || {};
  if (stt.sessionId !== undefined) flat.qwenpawSttSessionId = stt.sessionId;
  if (stt.chatName !== undefined) flat.qwenpawSttChatName = stt.chatName;
}

function flattenTtsEngines(tts, flat) {
  const engines = tts.engines && typeof tts.engines === "object" ? tts.engines : {};

  const browser = engines.browser || {};
  if (browser.lang !== undefined) flat.ttsBrowserLang = browser.lang;
  if (browser.voice !== undefined) flat.ttsBrowserVoice = browser.voice;

  const legacySay = engines.say || {};
  if (legacySay.lang !== undefined && flat.ttsBrowserLang === undefined) flat.ttsBrowserLang = legacySay.lang;
  if (legacySay.voice !== undefined && flat.ttsBrowserVoice === undefined) flat.ttsBrowserVoice = legacySay.voice;

  const edge = engines.edge || {};
  if (edge.voice !== undefined) flat.ttsEdgeVoice = edge.voice;

  const piperEng = engines.piper || {};
  if (piperEng.model !== undefined) flat.ttsPiperModel = piperEng.model;
  if (piperEng.binary !== undefined) flat.ttsPiperBinary = piperEng.binary;

  const elevenEng = engines.elevenlabs || {};
  if (elevenEng.apiKey !== undefined) flat.ttsElevenlabsApiKey = elevenEng.apiKey;
  if (elevenEng.voiceId !== undefined) flat.ttsElevenlabsVoiceId = elevenEng.voiceId;
  if (elevenEng.model !== undefined) flat.ttsElevenlabsModel = elevenEng.model;

  // Legacy v4: одно lang/voice на корне tts — только для активного движка
  if (tts.lang !== undefined) {
    flat.ttsLang = tts.lang;
    if (flat.ttsBrowserLang === undefined) flat.ttsBrowserLang = tts.lang;
  }
  if (tts.voice !== undefined) {
    flat.ttsVoice = tts.voice;
    if (flat.ttsBrowserVoice === undefined) flat.ttsBrowserVoice = tts.voice;
  }
  if (tts.engine !== undefined) {
    const engine = String(tts.engine || "browser").trim();
    if (engine === "say" || engine === "sidecar") flat.ttsEngine = "browser";
  }
  if (tts.edgeVoice !== undefined && flat.ttsEdgeVoice === undefined) {
    flat.ttsEdgeVoice = tts.edgeVoice;
  }

  const legacyEleven = tts.elevenlabs || {};
  if (legacyEleven.apiKey !== undefined && flat.ttsElevenlabsApiKey === undefined) {
    flat.ttsElevenlabsApiKey = legacyEleven.apiKey;
  }
  if (legacyEleven.voiceId !== undefined && flat.ttsElevenlabsVoiceId === undefined) {
    flat.ttsElevenlabsVoiceId = legacyEleven.voiceId;
  }
  if (legacyEleven.model !== undefined && flat.ttsElevenlabsModel === undefined) {
    flat.ttsElevenlabsModel = legacyEleven.model;
  }

  const legacyPiper = tts.piper || {};
  if (legacyPiper.model !== undefined && flat.ttsPiperModel === undefined) {
    flat.ttsPiperModel = legacyPiper.model;
  }
  if (legacyPiper.binary !== undefined && flat.ttsPiperBinary === undefined) {
    flat.ttsPiperBinary = legacyPiper.binary;
  }
}

function nestTtsEngines(source) {
  return compactObject({
    browser: compactObject({
      lang: source.ttsBrowserLang,
      voice: source.ttsBrowserVoice
    }),
    edge: compactObject({
      voice: source.ttsEdgeVoice
    }),
    piper: compactObject({
      model: source.ttsPiperModel,
      binary: source.ttsPiperBinary
    }),
    elevenlabs: compactObject({
      apiKey: source.ttsElevenlabsApiKey,
      voiceId: source.ttsElevenlabsVoiceId,
      model: source.ttsElevenlabsModel
    })
  });
}

function flattenSettings(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  if (!isNestedSettings(raw)) return { ...raw };

  const flat = {};
  const cms = raw.cms || {};
  const route = raw.route || {};

  if (cms.topicPath !== undefined) flat.topicPath = cms.topicPath;
  else if (route.topicPath !== undefined) flat.topicPath = route.topicPath;

  if (cms.channel !== undefined) flat.messageChannel = cms.channel;
  else if (route.messageChannel !== undefined) flat.messageChannel = route.messageChannel;

  if (route.runtime !== undefined) flat.messageTarget = route.runtime;
  else if (route.messageTarget !== undefined) flat.messageTarget = route.messageTarget;
  else if (route.selectedRuntime !== undefined) flat.messageTarget = route.selectedRuntime;

  if (route.systemPrompt !== undefined) flat.systemPrompt = route.systemPrompt;

  const runtimes = route.runtimes || {};
  flattenQwenpawRuntime(runtimes.qwenpaw, flat);
  flattenQwenpawRuntime(route.qwenpaw, flat);

  for (const id of ALL_RUNTIME_IDS) {
    if (id === "qwenpaw") continue;
    const cfg = runtimes[id];
    if (!cfg || typeof cfg !== "object") continue;
    for (const field of RUNTIME_FIELDS_BY_KIND.cli.concat(RUNTIME_FIELDS_BY_KIND.agent)) {
      if (cfg[field] === undefined) continue;
      flat[`${id}${RUNTIME_FLAT_SUFFIX[field]}`] = cfg[field];
    }
  }

  const voice = raw.voice || {};
  const stt = voice.stt || {};
  const input = voice.input || {};

  if (stt.mode !== undefined) flat.voiceInputMode = stt.mode;
  else if (input.mode !== undefined) flat.voiceInputMode = input.mode;

  if (stt.globalListen !== undefined) flat.voiceGlobalListen = stt.globalListen;
  else if (input.globalListen !== undefined) flat.voiceGlobalListen = input.globalListen;

  if (stt.wakeName !== undefined) flat.voiceWakeName = stt.wakeName;
  else if (input.wakeName !== undefined) flat.voiceWakeName = input.wakeName;

  if (stt.toCompose !== undefined) flat.voiceToCompose = stt.toCompose;
  else if (input.toCompose !== undefined) flat.voiceToCompose = input.toCompose;

  if (stt.responseEnabled !== undefined) flat.voiceResponseEnabled = stt.responseEnabled;
  else   if (input.responseEnabled !== undefined) flat.voiceResponseEnabled = input.responseEnabled;

  if (input.enabled !== undefined) flat.sttEnabled = input.enabled;
  else if (stt.enabled !== undefined) flat.sttEnabled = stt.enabled;

  if (input.capture !== undefined) flat.sttInputCapture = input.capture;
  else if (stt.capture !== undefined) flat.sttInputCapture = stt.capture;
  else if (input.source !== undefined || stt.source !== undefined) {
    const legacy = String(input.source ?? stt.source ?? "").trim();
    flat.sttInputCapture =
      legacy === "browser" || legacy === "sidecar" || legacy === "auto" ? "microphone" : "microphone";
  }

  if (stt.lang !== undefined) flat.sttLang = stt.lang;
  if (stt.engine !== undefined) flat.sttEngine = stt.engine;
  if (stt.prompt !== undefined) flat.sttPrompt = stt.prompt;

  const whisper = stt.whisper || {};
  if (whisper.model !== undefined) flat.sttWhisperModel = whisper.model;

  const sttEleven = stt.elevenlabs || {};
  if (sttEleven.apiKey !== undefined) flat.sttElevenlabsApiKey = sttEleven.apiKey;
  if (sttEleven.model !== undefined) flat.sttElevenlabsModel = sttEleven.model;

  const tts = voice.tts || {};
  if (tts.enabled !== undefined) flat.ttsEnabled = tts.enabled;
  if (tts.playbackMode !== undefined) flat.ttsPlaybackMode = tts.playbackMode;
  if (tts.engine !== undefined) flat.ttsEngine = tts.engine;
  if (tts.prompt !== undefined) flat.ttsPrompt = tts.prompt;
  if (tts.rate !== undefined) flat.ttsRate = tts.rate;
  if (tts.pitch !== undefined) flat.ttsPitch = tts.pitch;
  if (tts.includeCaptions !== undefined) flat.ttsIncludeCaptions = tts.includeCaptions;
  flattenTtsEngines(tts, flat);

  const proactive = raw.proactive || {};
  if (proactive.enabled !== undefined) flat.proactiveEnabled = proactive.enabled;
  if (proactive.idleSecondsMin !== undefined) flat.proactiveIdleSecondsMin = proactive.idleSecondsMin;
  if (proactive.idleSecondsMax !== undefined) flat.proactiveIdleSecondsMax = proactive.idleSecondsMax;
  if (proactive.idleSeconds !== undefined) flat.proactiveIdleSeconds = proactive.idleSeconds;
  if (proactive.cooldownSeconds !== undefined) flat.proactiveCooldownSeconds = proactive.cooldownSeconds;
  if (proactive.prompt !== undefined) flat.proactivePrompt = proactive.prompt;
  const quiet = proactive.quietHours || {};
  if (quiet.enabled !== undefined) flat.proactiveQuietHoursEnabled = quiet.enabled;
  if (quiet.start !== undefined) flat.proactiveQuietStart = quiet.start;
  if (quiet.end !== undefined) flat.proactiveQuietEnd = quiet.end;

  const media = raw.media || {};
  const camera = media.camera || {};
  if (camera.enabled !== undefined) flat.cameraEnabled = camera.enabled;
  if (camera.onSpeech !== undefined) flat.cameraOnSpeech = camera.onSpeech;
  if (camera.facing !== undefined) flat.cameraFacing = camera.facing;
  if (camera.deviceId !== undefined) flat.cameraDeviceId = camera.deviceId;
  const screen = media.screen || {};
  if (screen.enabled !== undefined) flat.screenEnabled = screen.enabled;
  if (screen.onSpeech !== undefined) flat.screenOnSpeech = screen.onSpeech;

  const ui = raw.ui || {};
  if (ui.dialogScrollRatio !== undefined) flat.dialogScrollRatio = ui.dialogScrollRatio;

  const compose = raw.compose || {};
  if (compose.promptTemplates !== undefined) flat.composePromptTemplates = compose.promptTemplates;

  const window = raw.window || {};
  if (window.topmost !== undefined) flat.windowTopmost = window.topmost;
  if (window.transparent !== undefined) flat.windowTransparent = window.transparent;
  if (window.background !== undefined) flat.windowBackground = window.background;
  if (window.backgroundImageUrl !== undefined) flat.windowBackgroundImageUrl = window.backgroundImageUrl;
  if (window.petOverlay !== undefined) flat.windowPetOverlay = window.petOverlay;
  if (window.compactDialogQa !== undefined) flat.compactDialogQa = window.compactDialogQa;
  if (window.dialogAutoScroll !== undefined) flat.dialogAutoScroll = window.dialogAutoScroll;
  if (window.characterModel !== undefined) flat.windowCharacterModel = window.characterModel;
  if (window.keepAwake !== undefined) flat.windowKeepAwake = window.keepAwake;
  if (window.processingSound !== undefined) flat.windowProcessingSound = window.processingSound;
  if (window.compact !== undefined) flat.windowCompact = window.compact;

  return flat;
}

function compactObject(value) {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) return value.length ? value : undefined;
  if (typeof value !== "object") {
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    const next = compactObject(item);
    if (next === undefined) continue;
    if (typeof next === "object" && !Array.isArray(next) && Object.keys(next).length === 0) continue;
    out[key] = next;
  }
  return Object.keys(out).length ? out : undefined;
}

function nestStringField(block, key, value, def = "") {
  if (value === undefined) return;
  const trimmed = String(value).trim();
  if (!trimmed && !def) return;
  if (trimmed === String(def ?? "").trim()) return;
  block[key] = trimmed;
}

function nestQwenpawRuntime(flat) {
  const block = { type: "agent" };
  nestStringField(block, "baseUrl", flat.qwenpawBaseUrl);
  nestStringField(block, "agentId", flat.qwenpawAgentId, "default");
  nestStringField(block, "sessionId", flat.qwenpawSessionId);
  nestStringField(block, "userId", flat.qwenpawUserId, "shell");
  return Object.keys(block).length > 1 ? block : undefined;
}

function nestRuntimeBlock(flat, id) {
  const kind = runtimeKind(id);
  const defaults = RUNTIME_DEFAULTS[id] || {};
  const block = { type: kind };
  const fields = RUNTIME_FIELDS_BY_KIND[kind] || RUNTIME_FIELDS_BY_KIND.agent;

  for (const field of fields) {
    const flatKey = `${id}${RUNTIME_FLAT_SUFFIX[field]}`;
    if (!(flatKey in flat)) continue;
    const value = flat[flatKey];
    const def = defaults[field];
    if (typeof value === "string") {
      nestStringField(block, field, value, def);
      continue;
    }
    if (value !== undefined && value !== def) block[field] = value;
  }

  return Object.keys(block).length > 1 ? block : undefined;
}

function nestSettings(flat) {
  const source = flat && typeof flat === "object" ? flat : {};
  const runtimes = {};

  const qwenpaw = nestQwenpawRuntime(source);
  if (qwenpaw) runtimes.qwenpaw = qwenpaw;

  for (const id of ALL_RUNTIME_IDS) {
    if (id === "qwenpaw") continue;
    const block = nestRuntimeBlock(source, id);
    if (block) runtimes[id] = block;
  }

  const nested = {
    formatVersion: SETTINGS_FORMAT_VERSION,
    cms: compactObject({
      topicPath: source.topicPath,
      channel: source.messageChannel
    }),
    route: compactObject({
      runtime: source.messageTarget,
      systemPrompt: source.systemPrompt,
      runtimes: Object.keys(runtimes).length ? runtimes : undefined
    }),
    voice: compactObject({
      input: compactObject({
        enabled: source.sttEnabled === false ? false : undefined,
        mode:
          source.voiceInputMode === "disabled"
            ? "hold"
            : source.voiceInputMode,
        capture: source.sttInputCapture,
        globalListen: source.voiceGlobalListen,
        wakeName: source.voiceWakeName,
        toCompose: source.voiceToCompose,
        responseEnabled: source.voiceResponseEnabled
      }),
      stt: compactObject({
        lang: source.sttLang,
        engine: source.sttEngine,
        prompt: source.sttPrompt,
        whisper: compactObject({
          model: source.sttWhisperModel
        }),
        elevenlabs: compactObject({
          apiKey: source.sttElevenlabsApiKey,
          model: source.sttElevenlabsModel
        })
      }),
      tts: compactObject({
        enabled: source.ttsEnabled,
        playbackMode: source.ttsPlaybackMode,
        engine: source.ttsEngine,
        prompt: source.ttsPrompt,
        rate: source.ttsRate,
        pitch: source.ttsPitch,
        includeCaptions: source.ttsIncludeCaptions,
        engines: nestTtsEngines(source)
      })
    }),
    proactive: compactObject({
      enabled: source.proactiveEnabled,
      idleSecondsMin: source.proactiveIdleSecondsMin,
      idleSecondsMax: source.proactiveIdleSecondsMax,
      idleSeconds: source.proactiveIdleSeconds,
      cooldownSeconds: source.proactiveCooldownSeconds,
      prompt: source.proactivePrompt,
      quietHours: compactObject({
        enabled: source.proactiveQuietHoursEnabled,
        start: source.proactiveQuietStart,
        end: source.proactiveQuietEnd
      })
    }),
    media: compactObject({
      camera: compactObject({
        enabled: source.cameraEnabled,
        onSpeech: source.cameraOnSpeech,
        facing: source.cameraFacing,
        deviceId: source.cameraDeviceId
      }),
      screen: compactObject({
        enabled: source.screenEnabled,
        onSpeech: source.screenOnSpeech
      })
    }),
    window: compactObject({
      topmost: source.windowTopmost,
      transparent: source.windowTransparent,
      background: source.windowBackground,
      backgroundImageUrl: source.windowBackgroundImageUrl,
      petOverlay: source.windowPetOverlay,
      compact: source.windowCompact,
      compactDialogQa: source.compactDialogQa,
      dialogAutoScroll: source.dialogAutoScroll,
      characterModel: source.windowCharacterModel,
      keepAwake: source.windowKeepAwake,
      processingSound: source.windowProcessingSound
    }),
    ui: compactObject({
      dialogScrollRatio: source.dialogScrollRatio
    }),
    compose: compactObject({
      promptTemplates: source.composePromptTemplates
    })
  };

  return compactObject(nested) || { formatVersion: SETTINGS_FORMAT_VERSION };
}

module.exports = {
  SETTINGS_FORMAT_VERSION,
  TTS_ENGINE_IDS,
  RUNTIME_KIND,
  runtimeKind,
  normalizeRuntimeKind,
  isNestedSettings,
  flattenSettings,
  nestSettings
};
