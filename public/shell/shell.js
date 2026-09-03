import { loadAgentSelectData, getSelectableAgents, populateAgentSelect } from "/shared/agent-select.js";
import { createSettingsSaveController } from "@shell/settings-save";
import { parseShellReply, renderShellReplyMedia, prepareSpeechText, pullSpeechSentences, mergeSpeechStreamChunks, parseDualReply, extractStreamingTtsBody, extractStreamingReplyBody, hasVoiceEndDelimiter, stripAllTtsBlocks } from "@shell/reply";
import { renderShellReplyMarkdown, renderShellReplyBody, preloadShellMarkdown } from "@shell/markdown";
import { initShellCharacter } from "@shell/character";
import { createShellCamera } from "@shell/camera";
import { createShellScreen } from "@shell/screen";
import { createShellTtsTabCoordinator } from "@shell/tts-tab";
import { createShellTtsPlayer } from "@shell/tts-player";
import { unlockShellAudio } from "@shell/audio-unlock";
import {
  playShellUiSound,
  playShellMicSound,
  primeShellProcessingAudio,
  previewShellProcessingAmbient,
  PROCESSING_SOUND_OPTIONS,
  readProcessingSound,
  startShellProcessingAmbient,
  stopShellProcessingAmbient,
  writeProcessingSound
} from "@shell/ui-sounds";
import {
  speakShellBrowserTts,
  loadWebSpeechVoices,
  compareWebSpeechVoices,
  formatWebSpeechVoiceLabel,
  filterLocalWebSpeechVoices,
  voiceLangPrefix
} from "@shell/browser-tts";
import {
  formatTtsErrorHint,
  shellTtsFailureMessage,
  truncateForShellTts
} from "@shell/tts-mobile";
import { createShellSession } from "@shell/session";
import { getShellClientId, getShellPresenceClientId } from "@shell/client-id";
import { getShellSurfacePayload, initShellSurface, getShellHostLabel, getShellHostHeaderLabel, getShellSurface } from "@shell/surface";
import {
  buildVoiceShellPath,
  isEmbeddedVoiceHost,
  isVoiceStandaloneAppLocation,
  migrateVoiceHostQueryToPath,
  parseVoiceShellPath,
  readVoiceSurfaceHostFromLocation
} from "@shell/voice-chpu";
import { initShellPresence, SHELL_PRESENCE_ENABLED } from "@shell/presence";
import { initShellOrientationChip, initShellLocationChip, getShellDeviceLocation, isShellLocationShareEnabled, refreshShellLocationForSend } from "@shell/device-chips";
import { initShellInstallBanner } from "@shell/pwa";
import {
  getShellHttpsUrl,
  initShellPermissions,
  shellPermissionIssue,
  warmUpMicrophone
} from "@shell/permissions";
import { createShellDialog } from "@shell/dialog";
import { createShellCompactQa } from "@shell/compact-qa";
import { initShellComposeLayout } from "@shell/compose-layout";
import { migrateShellStorageFromMobile, SHELL_STORAGE } from "@shell/storage-keys";
import { initShellHelp } from "@shell/help";
import { initShellHints, updateTtsPlaybackHint, updateVoiceModeHint } from "@shell/hints";
import { initShellImageLightbox } from "@shell/image-lightbox";
import {
  normalizeWindowSettings,
  readWindowSettingsFromStorage,
  writeWindowSettingsToStorage
} from "@shell/window-storage";
import { buildProactiveMessage, createShellProactive, DEFAULT_PROACTIVE_PROMPT, normalizeProactiveIdleRange, normalizeQuietTime } from "@shell/proactive";
import { createShellDebugLog } from "@shell/debug";
import {
  buildComposeCameraMessage,
  captureOneShotCameraFrame,
  openCameraFilePicker,
  preferredComposeCameraFacing
} from "@shell/compose-camera";
import {
  createShellTapVoice,
  createVoiceConfirmDialog,
  hapticTap,
  initShellKeepAwake,
  readKeepAwakeSetting,
  readVoiceConfirmSetting,
  writeKeepAwakeSetting,
  writeVoiceConfirmSetting
} from "@shell/voice";
import {
  normalizeVoiceInputMode,
  normalizeSttEngine,
  normalizeSttSource,
  resolveSttSource,
  resolveSttEngine,
  sttEngineIsAvailable,
  isSidecarSttEngine,
  STT_SOURCE_LABELS,
  STT_ENGINE_LABELS,
  VOICE_INPUT_MODES,
  VOICE_MODE_LABELS,
  VOICE_MODE_COMPACT_LABELS,
  VOICE_MODE_HINTS,
  voiceModeMicAction,
  voiceModeMicLabel,
  voiceModeRequiresSidecar,
  voiceModeUsesBrowserStt,
  voiceModeUsesSidecarMic
} from "@shell/voice-modes";
import {
  SHELL_RUNTIMES,
  SHELL_RUNTIME_GROUPS,
  SHELL_RUNTIME_LABELS,
  SHELL_RUNTIME_HINTS,
  formatRuntimeRouteNote,
  SHELL_RUNTIME_ROUTE_INTROS,
  runtimeShowsRouteNote,
  formatRuntimeSelectLabel,
  formatRuntimeStatusTitle,
  resolveRuntimeConnectionState,
  formatRuntimeStatusEmoji,
  RUNTIME_DEFAULTS,
  normalizeMessageRuntime,
  isRuntimeImplemented,
  runtimeUsesQwenPaw,
  runtimeUsesBridge,
  bridgeRuntimeField,
  runtimeShowsAgentMeta,
  runtimeAgentMetaKey,
  runtimeUsesCli,
  runtimeShowsModel,
  runtimeShowsPermissionMode,
  runtimePermissionModeCopy,
  runtimeQwenpawPermissionModeCopy,
  runtimeAgentFieldLabel,
  runtimeShowsApiKey,
  runtimeShowsBaseUrl
} from "@shell/runtimes";
import {
  SHELL_TTS_ENGINE_GROUPS,
  SHELL_TTS_ENGINES,
  normalizeTtsEngine,
  ttsEngineLabel,
  formatTtsEngineSelectLabel,
  formatTtsEngineSelectTitle
} from "@shell/tts-engines";

const SERVER_TTS_ENGINES = new Set(["say", "edge", "piper", "elevenlabs"]);

const TTS_ENGINE_PANEL_NODES = {
  browser: () => nodes.ttsBrowserPanel,
  say: () => nodes.ttsSayPanel,
  edge: () => nodes.ttsEdgePanel,
  piper: () => nodes.ttsPiperPanel,
  elevenlabs: () => nodes.ttsElevenlabsPanel
};

const VOICE_MODE_USER_GRACE_MS = 30000;
/** Блокирует перезапись hero/header-контролов из SSE status во время autosave. */
const heroAutosaveInFlight = {
  messageTarget: false,
  ttsEnabled: false,
  ttsPlaybackMode: false
};
let ttsPlaybackModePersisting = false;
let ttsEngineCapabilities = {};
let sttEngineCapabilities = {};
let voiceInputModePersisting = false;
let voiceModeUserChangedAt = 0;
let voiceModeHydratedFromServer = false;
let lastCommittedVoiceMode = "";

const TTS_PLAYBACK_MODE_NAMES = ["shell-tts-playback-mode", "shell-tts-playback-mode-panel"];

/** dialog — озвучка по мере печати; reading — после полного ответа и маркера. */
function readTtsPlaybackModeFromDom() {
  for (const name of TTS_PLAYBACK_MODE_NAMES) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    const fromDom = checked?.value;
    if (fromDom === "reading" || fromDom === "dialog") return fromDom;
  }
  return null;
}

function getTtsPlaybackMode() {
  const fromDom = readTtsPlaybackModeFromDom();
  if (fromDom) return fromDom;
  const mode = String(state.settings?.ttsPlaybackMode || "dialog").trim();
  return mode === "reading" ? "reading" : "dialog";
}

function beginHeroAutosave(field) {
  if (field && Object.prototype.hasOwnProperty.call(heroAutosaveInFlight, field)) {
    heroAutosaveInFlight[field] = true;
  }
}

function endHeroAutosave(field) {
  if (field && Object.prototype.hasOwnProperty.call(heroAutosaveInFlight, field)) {
    heroAutosaveInFlight[field] = false;
  }
}

function isHeroAutosaveActive(field) {
  return Boolean(field && heroAutosaveInFlight[field]);
}

function syncTtsPlaybackModeUi(settings = state.settings) {
  if (ttsPlaybackModePersisting || isHeroAutosaveActive("ttsPlaybackMode")) {
    return;
  }
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement &&
    TTS_PLAYBACK_MODE_NAMES.includes(active.name)
  ) {
    return;
  }
  const mode = settings?.ttsPlaybackMode === "reading" ? "reading" : "dialog";
  for (const name of TTS_PLAYBACK_MODE_NAMES) {
    for (const input of document.querySelectorAll(`input[name="${name}"]`)) {
      if (input instanceof HTMLInputElement) {
        input.checked = input.value === mode;
      }
    }
  }
  updateTtsPlaybackHint(mode);
}

function readTtsEnabledFromDom() {
  if (nodes.ttsPanelEnabled && document.activeElement === nodes.ttsPanelEnabled) {
    return nodes.ttsPanelEnabled.checked;
  }
  if (nodes.ttsEnabled) return nodes.ttsEnabled.checked;
  if (nodes.ttsPanelEnabled) return nodes.ttsPanelEnabled.checked;
  return state.settings?.ttsEnabled !== false;
}

function syncTtsEnabledUi(settings = state.settings) {
  if (isHeroAutosaveActive("ttsEnabled")) return;
  const enabled = settings?.ttsEnabled !== false;
  if (nodes.ttsEnabled && document.activeElement !== nodes.ttsEnabled) {
    nodes.ttsEnabled.checked = enabled;
  }
  if (nodes.ttsPanelEnabled && document.activeElement !== nodes.ttsPanelEnabled) {
    nodes.ttsPanelEnabled.checked = enabled;
  }
}

function readSttEnabledFromDom() {
  if (nodes.sttPanelEnabled && document.activeElement === nodes.sttPanelEnabled) {
    return nodes.sttPanelEnabled.checked;
  }
  if (nodes.sttEnabled) return nodes.sttEnabled.checked;
  if (nodes.sttPanelEnabled) return nodes.sttPanelEnabled.checked;
  return isSttEnabled(state.settings);
}

function isSttEnabled(settings = state.settings) {
  if (settings?.sttEnabled === false) return false;
  if (settings?.sttEnabled === true) return true;
  return normalizeVoiceInputMode(settings?.voiceInputMode) !== "disabled";
}

function resolveVoiceInputMode(settings = state.settings) {
  const mode = normalizeVoiceInputMode(settings?.voiceInputMode || "hold");
  return mode === "disabled" ? "hold" : mode;
}

function syncSttEnabledUi(settings = state.settings) {
  if (isHeroAutosaveActive("sttEnabled")) return;
  const enabled = isSttEnabled(settings);
  if (nodes.sttEnabled && document.activeElement !== nodes.sttEnabled) {
    nodes.sttEnabled.checked = enabled;
  }
  if (nodes.sttPanelEnabled && document.activeElement !== nodes.sttPanelEnabled) {
    nodes.sttPanelEnabled.checked = enabled;
  }
}

function handleSttEnabledChange(source) {
  void playShellUiSound("toggle");
  const enabled = Boolean(source?.checked);
  if (nodes.sttEnabled && nodes.sttEnabled !== source) nodes.sttEnabled.checked = enabled;
  if (nodes.sttPanelEnabled && nodes.sttPanelEnabled !== source) nodes.sttPanelEnabled.checked = enabled;
  if (state.settings) state.settings.sttEnabled = enabled;
  markSettingsDirty("stt");
  const fromPanel = source?.id === "shell-stt-panel-enabled";
  if (!(fromPanel && isSettingsViewOpen())) {
    void persistSttEnabled(enabled);
  } else if (!enabled) {
    shellTapVoice?.abortSession();
    if (state.meetingRecording) void setMeetingRecordingRemote(false);
    updateVoiceModeSelectUi();
    syncCompactSensorAvailability();
  }
}

function handleTtsEnabledChange(source) {
  void playShellUiSound("toggle");
  const enabled = Boolean(source?.checked);
  if (nodes.ttsEnabled && nodes.ttsEnabled !== source) nodes.ttsEnabled.checked = enabled;
  if (nodes.ttsPanelEnabled && nodes.ttsPanelEnabled !== source) nodes.ttsPanelEnabled.checked = enabled;
  if (state.settings) state.settings.ttsEnabled = enabled;
  markSettingsDirty("tts");
  if (!enabled) stopBrowserTts({ notifyServer: true });
  const fromPanel = source?.id === "shell-tts-panel-enabled";
  if (!(fromPanel && isSettingsViewOpen())) {
    void persistTtsEnabled(enabled);
  }
}

function handleTtsPlaybackModeChange(source) {
  if (!(source instanceof HTMLInputElement) || !TTS_PLAYBACK_MODE_NAMES.includes(source.name)) return;
  void playShellUiSound("toggle");
  const mode = source.value === "reading" ? "reading" : "dialog";
  for (const name of TTS_PLAYBACK_MODE_NAMES) {
    for (const input of document.querySelectorAll(`input[name="${name}"]`)) {
      if (input instanceof HTMLInputElement) {
        input.checked = input.value === mode;
      }
    }
  }
  if (state.settings) state.settings.ttsPlaybackMode = mode;
  markSettingsDirty("tts");
  updateTtsPlaybackHint(mode);
  const fromPanel = source.name === "shell-tts-playback-mode-panel";
  if (!(fromPanel && isSettingsViewOpen())) {
    void persistTtsPlaybackMode(mode);
  }
}

function isReadingTtsMode() {
  return getTtsPlaybackMode() === "reading";
}

const DEFAULT_TTS_PROMPT = `Сформируй ответ в следующем формате (строго, в таком порядке):

1) Краткая версия для озвучки — 1–4 предложения, без emoji и markdown, только то, что можно произнести вслух. Не включай секреты, ключи и пароли. Не используй HTML-комментарии <!-- -->.

2) Отдельной строкой маркер:
::: VOICE-END :::

3) Полный текст ответа для экрана (можно markdown, списки, код). Без HTML-комментариев <!-- -->.`;

const DEFAULT_STT_PROMPT = `Исправь пунктуацию и регистр, убери слова-паразиты («э-э», «эээ», «мм», «ну»), сохрани смысл. Верни только готовый текст для отправки агенту — без пояснений и обёрток.`;

const DEFAULT_SYSTEM_PROMPT = `Ты — мой личный ассистент. Мы работаем вместе с мобильного устройства через браузер (Agent CMS Voice).

Контекст:
- У тебя есть доступ к нашей совместной памяти и workspace через MCP-инструменты Agent CMS (поиск, страницы, заметки, диалоги, файлы).
- Пользователь часто общается голосом: отвечай коротко и по делу, без лишней воды.
- Если нужны данные из памяти или workspace — сначала найди их инструментами, не выдумывай.

Стиль:
- Русский язык, если пользователь не переключился на другой.
- Проактивность умеренная: предлагай следующий шаг, но не навязывайся.
- Не показывай сырой JSON, ID инструментов и технические детали MCP — только результат.

Безопасность:
- Не озвучивай и не выводи секреты, ключи API, пароли.`;

/** @type {{ ttsPrompt: string, sttPrompt: string, proactivePrompt: string, systemPrompt: string, sources: Record<string, string | null> }} */
let shellPromptTemplates = {
  ttsPrompt: DEFAULT_TTS_PROMPT,
  sttPrompt: DEFAULT_STT_PROMPT,
  proactivePrompt: DEFAULT_PROACTIVE_PROMPT,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  sources: { ttsPrompt: null, sttPrompt: null, proactivePrompt: null, systemPrompt: null }
};

const TTS_TEST_PHRASES = {
  browser: "Это Web Speech в браузере. Озвучивает вкладка, не сервер.",
  say: "Это macOS say на сервере Mac. Озвучивает команда say.",
  edge: "Привет! Это проверка Edge TTS онлайн.",
  piper: "Привет! Это проверка Piper офлайн.",
  elevenlabs: "Привет! Это проверка ElevenLabs."
};

function getTtsTestPhrase(engine = getTtsEngine()) {
  return TTS_TEST_PHRASES[engine] || TTS_TEST_PHRASES.browser;
}

const PHASE_LABELS = {
  waiting: "🟡 Ожидаю",
  listening: "🔴 Слушаю",
  thinking: "🟢 Думаю",
  speaking: "🔵 Отвечаю",
  disabled: "⏸️ Ожидаю"
};

const HERO_IDLE_PHRASE = "Ожидаю";
const HERO_READY_PHRASE = "Готов к сообщению";

const HERO_STATE_LABELS = {
  idle: HERO_IDLE_PHRASE,
  ready: HERO_READY_PHRASE,
  listening: "Слушаю",
  thinking: "Думаю",
  typing: "Печатаю",
  replying: "Отвечаю"
};

let lastRenderedDisplayPhase = "waiting";
let lastLoggedPhase = "";
let processingSoundPhase = "";

const VOICE_MODE_TITLES = VOICE_MODE_LABELS;

const COMPOSE_DRAFT_SAVE_MS = 700;

let composeDraftSavedText = null;
let composeDraftSaveTimer = null;
let composeDraftSaveInFlight = null;
let composeDraftExpanded = false;
let ttsTestBusy = false;

migrateVoiceHostQueryToPath();

function isShellEmbedMode() {
  try {
    if (new URLSearchParams(window.location.search).get("embed") === "1") return true;
    if (isVoiceStandaloneAppLocation()) {
      return isEmbeddedVoiceHost(readVoiceSurfaceHostFromLocation());
    }
  } catch {
    // ignore
  }
  return false;
}

/** Voice на отдельном порту: /\<agent\>/ вместо /shell/\<agent\>/ */
function isVoiceStandaloneApp() {
  try {
    if (document.querySelector('meta[name="agent-cms-voice-app"]')?.content === "1") return true;
    return !window.location.pathname.startsWith("/shell");
  } catch {
    return false;
  }
}

const shellEmbedMode = isShellEmbedMode();
const shellVoiceStandalone = isVoiceStandaloneApp();

let lastHandledAssistantId = "";
let lastSpokenBody = "";
let lastHandledStreamId = "";
let lastStreamHandledBody = "";
/** @type {{ kind: string, label: string, tool?: string, active?: boolean, at: number }[]} */
let agentActivitySteps = [];
let streamWaitTimer = 0;
let streamWaitStartedAt = 0;
let pipelineStatusPollTimer = 0;
const recentAgentStreamIds = new Set();

function rememberAgentStreamId(streamId) {
  const id = String(streamId || "").trim();
  if (!id) return;
  recentAgentStreamIds.add(id);
  if (recentAgentStreamIds.size > 12) {
    const first = recentAgentStreamIds.values().next().value;
    recentAgentStreamIds.delete(first);
  }
}
let agentActivityTypingAdded = false;
/** @type {{ text: string, blob: Blob | null, mimeType: string, blobText: string }} */
let lastTtsSpoken = { text: "", blob: null, mimeType: "", blobText: "" };
/** @type {{ blob: Blob, mimeType: string, text: string } | null} */
let lastTtsChunkRecording = null;
const outboundQueue = [];

const state = {
  agentId: localStorage.getItem(SHELL_STORAGE.agent) || "",
  agentLabel: "",
  agentRoot: "",
  settingsFile: "",
  settings: null,
  windowSettings: null,
  shellState: null,
  eventSource: null,
  recognition: null,
  speaking: false,
  ttsPaused: false,
  micActive: false,
  micTapHeld: false,
  micPointerHeld: false,
  micWarmed: false,
  voiceRecordStartedAt: 0,
  pttHeld: false,
  pttKeyboardHeld: false,
  sidecarConnected: false,
  qwenpawConnected: false,
  qwenpawServerOk: false,
  qwenpawAgentOk: false,
  qwenpawAgentsReachable: false,
  qwenpawAgentName: "",
  qwenpawAgentError: "",
  qwenpawSessionId: "",
  qwenpawChatsOpen: false,
  qwenpawChatNameDraft: "",
  qwenpawRenameBusy: false,
  runtimeConnected: false,
  runtimeServerOk: false,
  runtimeError: "",
  runtimeStatuses: {},
  availableRuntimes: ["qwenpaw"],
  pendingVoiceInputMode: null,
  stopTtsAt: 0,
  previousPhase: "waiting",
  cameraSnapshotBusy: false,
  composeCameraBusy: false,
  cameraAppliedKey: "",
  screenSnapshotBusy: false,
  screenAppliedKey: "",
  view: "main",
  settingsTab: "route",
  chatOpen: true,
  characterPickerOpen: false,
  mediaMode: "",
  clockTimer: null,
  assistantStream: null,
  activeAgentStreamId: "",
  streamTtsQueue: [],
  streamTtsActive: false,
  streamTtsCursor: 0,
  messagePipelineBusy: false,
  processingMessage: "",
  queueEditingId: "",
  messageStopped: false,
  sessionUiLocked: false,
  sttResumeMode: "hold",
  voiceModeInteracting: false,
  meetingRecording: false,
  /** shellClientId отправителя текущего вопроса — для надёжной маршрутизации TTS */
  pendingReplyTtsClientId: "",
  voicePresence: {
    primaryClientId: "",
    clientCount: 0,
    isPrimary: true
  }
};

let messageSendAbortController = null;
let ttsTabCoordinator = null;
let shellPresenceController = null;
let ttsPlayer = null;
let ttsPlaybackSeq = 0;
const settingsSave = createSettingsSaveController();
let onRouteSettingsDirty = () => {};
let runtimeSelectSyncing = 0;
let runtimeSelectSuppressChange = false;
let runtimeStatusProbePromise = null;

function runRuntimeSelectSync(fn) {
  runtimeSelectSyncing += 1;
  runtimeSelectSuppressChange = true;
  try {
    return fn();
  } finally {
    runtimeSelectSuppressChange = false;
    runtimeSelectSyncing -= 1;
  }
}

function bumpTtsPlayback() {
  ttsPlaybackSeq += 1;
  return ttsPlaybackSeq;
}

function isTtsPlaybackCurrent(seq) {
  return seq === ttsPlaybackSeq && !state.messageStopped;
}

function yieldLocalTtsPlayback(reason = "yield") {
  if (
    reason === "leader-lost" &&
    state.speaking &&
    state.pendingReplyTtsClientId &&
    state.pendingReplyTtsClientId === getShellPresenceClientId()
  ) {
    ttsTabCoordinator?.claimLeader({ force: true });
    return;
  }
  state.streamTtsQueue = [];
  state.ttsPaused = false;
  const synth = getSpeechSynth();
  if (synth) synth.cancel();
  ttsPlayer?.stop();
  state.speaking = false;
  state.streamTtsActive = false;
  renderPhase(state.shellState?.phase || "waiting", state.shellState?.phrase || "", state.shellState?.metrics || "");
  if (reason === "remote-stop" && !state.pttHeld && !state.micActive) {
    void patchShellState({ phase: "waiting", phrase: HERO_IDLE_PHRASE }).then(() => {
      renderPhase("waiting", heroIdlePhrase(), state.shellState?.metrics || "");
    });
  }
}

function getTtsEngine() {
  if (nodes.ttsEngine) return normalizeTtsEngine(nodes.ttsEngine.value);
  return normalizeTtsEngine(state.settings?.ttsEngine);
}

function ttsSettingsLang(settings = {}, engine = getTtsEngine()) {
  const id = normalizeTtsEngine(engine);
  if (id === "browser") return settings.ttsBrowserLang || "ru-RU";
  if (id === "say") return settings.ttsSayLang || "ru-RU";
  return settings.ttsBrowserLang || "ru-RU";
}

function ttsSettingsVoice(settings = {}, engine = getTtsEngine()) {
  const id = normalizeTtsEngine(engine);
  if (id === "browser") return String(settings.ttsBrowserVoice ?? "").trim();
  if (id === "say") return String(settings.ttsSayVoice ?? "").trim();
  return String(settings.ttsBrowserVoice ?? "").trim();
}

function resolveElevenlabsApiKey() {
  return String(nodes.ttsElevenlabsKey?.value || state.settings?.ttsElevenlabsApiKey || "").trim();
}

function resolveElevenlabsVoiceId() {
  return String(nodes.ttsElevenlabsVoiceId?.value || state.settings?.ttsElevenlabsVoiceId || "").trim();
}

function applyElevenlabsKeyUi(settings = state.settings || {}) {
  if (!nodes.ttsElevenlabsKey || document.activeElement === nodes.ttsElevenlabsKey) return;
  nodes.ttsElevenlabsKey.value = String(settings.ttsElevenlabsApiKey || "");
  nodes.ttsElevenlabsKey.placeholder = nodes.ttsElevenlabsKey.value ? "••••••••  (сохранён)" : "sk_…";
}

function collectTtsRuntimeSettings() {
  const patch = collectTtsFormPatch();
  const stored = state.settings || {};
  const runtime = { ...patch, ttsEngine: getTtsEngine() };
  const apiKey = resolveElevenlabsApiKey();
  if (apiKey) runtime.ttsElevenlabsApiKey = apiKey;
  if (!String(runtime.ttsElevenlabsVoiceId || "").trim() && stored.ttsElevenlabsVoiceId) {
    runtime.ttsElevenlabsVoiceId = stored.ttsElevenlabsVoiceId;
  }
  if (!String(runtime.ttsPiperModel || "").trim() && stored.ttsPiperModel) {
    runtime.ttsPiperModel = stored.ttsPiperModel;
  }
  if (!String(runtime.ttsPiperBinary || "").trim() && stored.ttsPiperBinary) {
    runtime.ttsPiperBinary = stored.ttsPiperBinary;
  }
  return runtime;
}

function isBrowserTtsEngine() {
  return state.settings?.ttsEnabled !== false && getTtsEngine() === "browser";
}

function isServerTtsEngine() {
  return state.settings?.ttsEnabled !== false && SERVER_TTS_ENGINES.has(getTtsEngine());
}

function matchesTtsClientId(id) {
  const trimmed = String(id || "").trim();
  if (!trimmed) return false;
  const mine = getShellPresenceClientId();
  const browser = getShellClientId();
  if (trimmed === mine) return true;
  if (trimmed === browser && !trimmed.includes(":")) {
    return Boolean(ttsTabCoordinator?.isLeader());
  }
  return false;
}

function isVoicePrimaryClient() {
  return state.voicePresence?.isPrimary !== false;
}

function voicePrimaryBlockedPhrase() {
  return "Голос активен в другом окне — переключитесь туда или нажмите ★";
}

function ensureVoicePrimaryClient() {
  if (isVoicePrimaryClient()) return true;
  renderPhase("waiting", voicePrimaryBlockedPhrase());
  return false;
}

function releaseVoiceCaptureOnPrimaryLoss() {
  if (state.micPointerHeld || state.micTapHeld) {
    resetMicHoldUi();
  }
  if (state.pttKeyboardHeld) {
    endPttHold();
  }
  if (state.micActive && shellTapVoice) {
    shellTapVoice.stopSession?.();
  }
}

function applyVoicePresence(payload) {
  if (!SHELL_PRESENCE_ENABLED) return;
  if (!payload || typeof payload !== "object") return;
  const primaryClientId = String(payload.primaryClientId || "").trim();
  const clientCount = Number(payload.clientCount) || 0;
  const mine = getShellPresenceClientId();
  const isPrimary = clientCount <= 1 || !primaryClientId || primaryClientId === mine;
  const wasPrimary = state.voicePresence?.isPrimary !== false;
  state.voicePresence = { primaryClientId, clientCount, isPrimary };
  updateVoicePrimaryStar();
  if (wasPrimary && !isPrimary) {
    releaseVoiceCaptureOnPrimaryLoss();
  }
}

function updateVoicePrimaryStar() {
  const star = nodes.voicePrimaryStar;
  if (!star) return;
  if (!SHELL_PRESENCE_ENABLED) {
    star.classList.add("hidden");
    star.setAttribute("aria-hidden", "true");
    return;
  }
  const count = state.voicePresence?.clientCount ?? 0;
  if (count <= 1) {
    star.classList.add("hidden");
    star.setAttribute("aria-hidden", "true");
    return;
  }
  star.classList.remove("hidden");
  star.removeAttribute("aria-hidden");
  const isPrimary = isVoicePrimaryClient();
  star.classList.toggle("is-primary", isPrimary);
  star.classList.toggle("is-secondary", !isPrimary);
  const title = isPrimary
    ? "Это окно активно для голоса"
    : "Голос в другом окне — нажмите, чтобы активировать это";
  star.title = title;
  star.setAttribute("aria-label", title);
  star.setAttribute("aria-pressed", isPrimary ? "true" : "false");
}

function canPlayTts() {
  if (!state.settings?.ttsEnabled) return false;
  if (document.visibilityState === "visible") ttsTabCoordinator?.claimLeader();
  if (!ttsTabCoordinator?.isLeader()) return false;
  return document.visibilityState === "visible";
}

function isLocalMessagePipelineActive() {
  return Boolean(state.messagePipelineBusy || state.processingMessage);
}

function isTtsEnabledSetting() {
  return state.settings?.ttsEnabled !== false;
}

/** Озвучивать на устройстве, с которого отправили вопрос. */
function shouldPlayReplyTts(meta = {}) {
  if (!isTtsEnabledSetting()) return false;
  if (state.messageStopped) return false;
  if (document.visibilityState !== "visible") return false;

  const pending = String(state.pendingReplyTtsClientId || "").trim();
  const target = String(meta.ttsClientId || "").trim();

  if (matchesTtsClientId(pending) || matchesTtsClientId(target)) {
    ttsTabCoordinator?.claimLeader({ force: true });
    return true;
  }
  if (state.micActive || state.pttHeld || isLocalMessagePipelineActive()) {
    if (!ensureVoicePrimaryClient()) return false;
    ttsTabCoordinator?.claimLeader({ force: true });
    return true;
  }
  return false;
}

function clearPendingReplyTtsClientId() {
  if (!state.speaking && !state.streamTtsActive && !state.streamTtsQueue.length) {
    state.pendingReplyTtsClientId = "";
  }
}

function canPlayBrowserTts() {
  return isBrowserTtsEngine() && canPlayTts();
}

function isTypingTarget(element) {
  if (!element || !(element instanceof HTMLElement)) return false;
  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || element.isContentEditable;
}

function getVoiceInputMode() {
  if (readSttEnabledFromDom() === false) return "disabled";
  const raw =
    nodes.voiceMode?.value ||
    state.sttResumeMode ||
    lastCommittedVoiceMode ||
    resolveVoiceInputMode(state.settings) ||
    "hold";
  const mode = normalizeVoiceInputMode(raw);
  return mode === "disabled" ? "hold" : mode;
}

function isVoiceModeUserLocked() {
  return (
    state.voiceModeInteracting ||
    document.activeElement === nodes.voiceMode ||
    Boolean(state.pendingVoiceInputMode) ||
    Date.now() - voiceModeUserChangedAt < VOICE_MODE_USER_GRACE_MS
  );
}

function commitVoiceModeSelection({ persist = true } = {}) {
  if (nodes.sttEnabled?.checked === false) return;
  const mode = normalizeVoiceInputMode(nodes.voiceMode?.value || state.sttResumeMode || "hold");
  if (!VOICE_INPUT_MODES.includes(mode)) return;

  state.voiceModeInteracting = false;
  voiceModeUserChangedAt = Date.now();
  lastCommittedVoiceMode = mode;
  state.pendingVoiceInputMode = mode;
  if (nodes.voiceMode) nodes.voiceMode.value = mode;
  state.sttResumeMode = mode;
  if (state.settings) state.settings.voiceInputMode = mode;

  if (!usesBrowserStt(mode)) shellTapVoice?.abortSession();
  if (state.meetingRecording) void setMeetingRecordingRemote(false);

  updateVoiceModeSelectUi();
  syncCompactSensorAvailability();
  renderPhase("waiting", `Режим: ${VOICE_MODE_LABELS[mode] || mode}`);

  if (persist) void persistVoiceInputMode(mode);
}

function syncVoiceModeSelectFromDom() {
  if (!nodes.voiceMode || nodes.sttEnabled?.checked === false) return;
  const mode = normalizeVoiceInputMode(nodes.voiceMode.value || state.sttResumeMode || "hold");
  if (mode === lastCommittedVoiceMode) {
    updateVoiceModeSelectUi();
    return;
  }
  commitVoiceModeSelection();
}

function isVoiceGlobalListen(settings = state.settings) {
  return Boolean(settings?.voiceGlobalListen);
}

function readSttEngineFromDom(settings = state.settings) {
  if (nodes.sttEngine?.value) return normalizeSttEngine(nodes.sttEngine.value);
  return normalizeSttEngine(settings?.sttEngine);
}

function readVoiceInputSourceFromDom(settings = state.settings) {
  if (nodes.sttSource?.value) return normalizeSttSource(nodes.sttSource.value);
  return normalizeSttSource(settings?.voiceInputSource);
}

function getVoiceModeContext(settings = state.settings) {
  return {
    globalListen: isVoiceGlobalListen(settings),
    sidecarConnected: state.sidecarConnected,
    sttEngine: readSttEngineFromDom(settings),
    sttSource: readVoiceInputSourceFromDom(settings)
  };
}

function micActionForMode(mode = getVoiceInputMode()) {
  return voiceModeMicAction(mode, getVoiceModeContext());
}

function shouldSendVoiceImmediately(settings = state.settings) {
  if (settings?.voiceResponseEnabled !== undefined) {
    return settings.voiceResponseEnabled !== false;
  }
  return !readVoiceConfirmSetting();
}

function usesSidecarMic(mode = getVoiceInputMode()) {
  return voiceModeUsesSidecarMic(mode, getVoiceModeContext());
}

function usesBrowserStt(mode = getVoiceInputMode()) {
  return voiceModeUsesBrowserStt(mode, getVoiceModeContext());
}

function isMicPhysicalHold() {
  return Boolean(state.micPointerHeld || state.pttKeyboardHeld);
}

function isMicSessionUiActive() {
  return Boolean(
    state.micPointerHeld ||
      state.micTapHeld ||
      state.micActive ||
      state.pttHeld ||
      state.pttKeyboardHeld ||
      shellTapVoice?.isTapHeld?.()
  );
}

function isFnButtonMode() {
  return getVoiceInputMode() === "fn_button";
}

function usesSidecarPtt(mode = getVoiceInputMode()) {
  return usesSidecarMic(mode);
}

function isPttKeyEvent(event) {
  if (!event) return false;
  const code = String(event.code || "");
  if (code === "ShiftLeft" || code === "ShiftRight") return true;
  if (code === "F18" || code === "Fn") return true;
  return event.keyCode === 128;
}

function setPttHeldRemote(held) {
  return apiFetch("/api/shell/ptt", {
    method: "POST",
    body: JSON.stringify({ held: Boolean(held) })
  }).then((data) => {
    state.pttHeld = Boolean(data.held);
    setMicButtonState(state.pttHeld ? "Стоп" : "Говорить", { active: state.pttHeld });
    renderPhase(
      state.pttHeld ? "listening" : "waiting",
      state.pttHeld ? "Sidecar слушает…" : HERO_IDLE_PHRASE
    );
    syncVoiceRecordTimer();
  });
}

function setMeetingRecordingRemote(recording) {
  return apiFetch("/api/shell/meeting", {
    method: "POST",
    body: JSON.stringify({ recording: Boolean(recording) })
  }).then((data) => {
    state.meetingRecording = Boolean(data.recording);
    updateVoiceModeSelectUi();
    setMicButtonState(state.meetingRecording ? "Стоп встречи" : "Говорить", {
      active: state.meetingRecording
    });
    renderPhase(
      state.meetingRecording ? "listening" : "waiting",
      state.meetingRecording ? "Запись встречи…" : HERO_IDLE_PHRASE
    );
    syncVoiceRecordTimer();
  });
}

function interruptTtsForUserVoice() {
  stopBrowserTts({ bumpPlayback: false });
  void apiFetch("/api/shell/stop-tts", { method: "POST", body: "{}" }).catch(() => {});
}

const PTT_RELEASE_TAIL_MS = 180;
let pttReleaseTailTimer = 0;

function cancelPttReleaseTail() {
  if (!pttReleaseTailTimer) return;
  clearTimeout(pttReleaseTailTimer);
  pttReleaseTailTimer = 0;
}

function schedulePttReleaseTail(fn) {
  cancelPttReleaseTail();
  pttReleaseTailTimer = window.setTimeout(() => {
    pttReleaseTailTimer = 0;
    fn();
  }, PTT_RELEASE_TAIL_MS);
}

function beginPttHold() {
  const mode = getVoiceInputMode();
  if (mode === "disabled") return;
  if (isTypingTarget(document.activeElement)) return;
  if (state.pttKeyboardHeld) return;
  if (!ensureVoicePrimaryClient()) return;
  cancelPttReleaseTail();
  state.pttKeyboardHeld = true;
  interruptTtsForUserVoice();

  if (usesSidecarMic(mode) && (mode === "hold" || mode === "fn_button")) {
    void setPttHeldRemote(true);
    syncVoiceRecordTimer();
    return;
  }

  if ((mode === "fn_button" || mode === "hold") && state.recognition && shellTapVoice) {
    shellTapVoice.prepareSession();
    void shellTapVoice.startSession();
  }
  syncVoiceRecordTimer();
}

function endPttHold() {
  if (!state.pttKeyboardHeld) return;
  state.pttKeyboardHeld = false;
  syncVoiceRecordTimer();
  const mode = getVoiceInputMode();
  schedulePttReleaseTail(() => {
    if (usesSidecarMic(mode) && (mode === "hold" || mode === "fn_button")) {
      void setPttHeldRemote(false).catch((error) => renderPhase("waiting", error.message));
      return;
    }
    if ((mode === "fn_button" || mode === "hold") && state.recognition && (state.micActive || state.micTapHeld)) {
      try {
        state.recognition.stop();
      } catch {
        // ignore
      }
    }
  });
}

function setupPttKeyboard() {
  window.addEventListener("keydown", (event) => {
    if (!isFnButtonMode()) return;
    if (usesSidecarMic()) return;
    if (event.repeat) return;
    if (!isPttKeyEvent(event)) return;
    if (isTypingTarget(event.target)) return;
    event.preventDefault();
    beginPttHold();
  });

  window.addEventListener("keyup", (event) => {
    if (!isFnButtonMode()) return;
    if (usesSidecarMic()) return;
    if (!isPttKeyEvent(event)) return;
    event.preventDefault();
    endPttHold();
  });

  window.addEventListener("blur", () => {
    if (state.pttKeyboardHeld) endPttHold();
  });

  window.shellApp?.onPttKey?.((payload) => {
    if (!isFnButtonMode() || usesSidecarMic()) return;
    if (payload?.pressed) beginPttHold();
    if (payload?.released) endPttHold();
  });
}

function toggleTtsPauseResume() {
  if (!isTtsPlaybackActive()) return;
  if (state.ttsPaused) resumeTtsPlayback();
  else pauseTtsPlayback();
}

const nodes = {
  messageTarget: document.getElementById("shell-message-target"),
  routeRuntime: document.getElementById("shell-route-runtime"),
  routeRuntimeNotes: document.getElementById("shell-route-runtime-notes"),
  routeRuntimeNote: document.getElementById("shell-route-runtime-note"),
  routeRuntimeNoteIntro: document.getElementById("shell-route-runtime-note-intro"),
  routeRuntimeNoteTitle: document.getElementById("shell-route-runtime-note-title"),
  routeRuntimeNoteBody: document.getElementById("shell-route-runtime-note-body"),
  qwenpawPanel: document.getElementById("shell-qwenpaw-panel"),
  qwenpawUrl: document.getElementById("shell-qwenpaw-url"),
  qwenpawOpenUrl: document.getElementById("shell-qwenpaw-open-url"),
  qwenpawAgentId: document.getElementById("shell-qwenpaw-agent-id"),
  qwenpawPermissionField: document.getElementById("shell-qwenpaw-permission-field"),
  qwenpawPermissionLabel: document.getElementById("shell-qwenpaw-permission-label"),
  qwenpawPermissionMode: document.getElementById("shell-qwenpaw-permission-mode"),
  qwenpawPermissionEmoji: document.getElementById("shell-qwenpaw-permission-emoji"),
  qwenpawPermissionTitle: document.getElementById("shell-qwenpaw-permission-title"),
  qwenpawPermissionDesc: document.getElementById("shell-qwenpaw-permission-desc"),
  qwenpawChatName: document.getElementById("shell-qwenpaw-chat-name"),
  qwenpawChatSession: document.getElementById("shell-qwenpaw-chat-session"),
  qwenpawNewChat: document.getElementById("shell-qwenpaw-new-chat"),
  qwenpawChatsToggle: document.getElementById("shell-qwenpaw-chats-toggle"),
  qwenpawChatsPanel: document.getElementById("shell-qwenpaw-chats-panel"),
  bridgePanel: document.getElementById("shell-runtime-bridge-panel"),
  bridgeUrlLabel: document.getElementById("shell-runtime-bridge-url-label"),
  bridgeUrl: document.getElementById("shell-runtime-bridge-url"),
  bridgeUrlField: document.getElementById("shell-runtime-bridge-url-field"),
  bridgeApiKey: document.getElementById("shell-runtime-bridge-api-key"),
  bridgeApiKeyField: document.getElementById("shell-runtime-bridge-api-key-field"),
  bridgeModel: document.getElementById("shell-runtime-bridge-model"),
  bridgeModelField: document.getElementById("shell-runtime-bridge-model-field"),
  bridgeAgentLabel: document.getElementById("shell-runtime-bridge-agent-label"),
  bridgeAgentField: document.getElementById("shell-runtime-bridge-agent-field"),
  bridgeAgentMeta: document.getElementById("shell-runtime-bridge-agent-meta"),
  bridgeSessionId: document.getElementById("shell-runtime-bridge-session-id"),
  bridgeSessionGenerate: document.getElementById("shell-runtime-bridge-session-generate"),
  bridgePermissionField: document.getElementById("shell-runtime-bridge-permission-field"),
  bridgePermissionLabel: document.getElementById("shell-runtime-bridge-permission-label"),
  bridgePermissionMode: document.getElementById("shell-runtime-bridge-permission-mode"),
  bridgePermissionEmoji: document.getElementById("shell-runtime-bridge-permission-emoji"),
  bridgePermissionTitle: document.getElementById("shell-runtime-bridge-permission-title"),
  bridgePermissionDesc: document.getElementById("shell-runtime-bridge-permission-desc"),
  systemPrompt: document.getElementById("shell-system-prompt"),
  systemPromptInsert: document.getElementById("shell-system-prompt-insert"),
  ttsEnabled: document.getElementById("shell-tts-enabled"),
  ttsPanelEnabled: document.getElementById("shell-tts-panel-enabled"),
  ttsPlaybackModeGroup: document.getElementById("shell-tts-playback-mode"),
  ttsPlaybackHint: document.getElementById("shell-tts-playback-hint"),
  ttsSettingsPanel: document.getElementById("shell-tts-panel"),
  ttsPrompt: document.getElementById("shell-tts-prompt"),
  ttsPromptInsert: document.getElementById("shell-tts-prompt-insert"),
  ttsEngine: document.getElementById("shell-tts-engine"),
  ttsTestBtn: document.getElementById("shell-tts-test"),
  ttsBrowserPanel: document.getElementById("shell-tts-browser-panel"),
  ttsSayPanel: document.getElementById("shell-tts-say-panel"),
  ttsEdgePanel: document.getElementById("shell-tts-edge-panel"),
  ttsPiperPanel: document.getElementById("shell-tts-piper-panel"),
  ttsElevenlabsPanel: document.getElementById("shell-tts-elevenlabs-panel"),
  ttsEdgeVoice: document.getElementById("shell-tts-edge-voice"),
  ttsPiperModel: document.getElementById("shell-tts-piper-model"),
  ttsPiperBinary: document.getElementById("shell-tts-piper-binary"),
  ttsElevenlabsKey: document.getElementById("shell-tts-elevenlabs-key"),
  ttsElevenlabsVoiceId: document.getElementById("shell-tts-elevenlabs-voice-id"),
  ttsElevenlabsModel: document.getElementById("shell-tts-elevenlabs-model"),
  ttsLang: document.getElementById("shell-tts-lang"),
  ttsVoice: document.getElementById("shell-tts-voice"),
  ttsVoiceRefresh: document.getElementById("shell-tts-voice-refresh"),
  ttsSayLang: document.getElementById("shell-tts-say-lang"),
  ttsSayVoice: document.getElementById("shell-tts-say-voice"),
  ttsRate: document.getElementById("shell-tts-rate"),
  ttsRateField: document.getElementById("shell-tts-rate-field"),
  ttsRateValue: document.getElementById("shell-tts-rate-value"),
  ttsPitch: document.getElementById("shell-tts-pitch"),
  ttsPitchValue: document.getElementById("shell-tts-pitch-value"),
  sttEnabled: document.getElementById("shell-stt-enabled"),
  sttPanelEnabled: document.getElementById("shell-stt-panel-enabled"),
  sttSettingsPanel: document.getElementById("shell-stt-settings"),
  sttPrompt: document.getElementById("shell-stt-prompt"),
  sttPromptInsert: document.getElementById("shell-stt-prompt-insert"),
  sttLang: document.getElementById("shell-stt-lang"),
  sttEngine: document.getElementById("shell-stt-engine"),
  sttSource: document.getElementById("shell-stt-source"),
  sttEngineNote: document.getElementById("shell-stt-engine-note"),
  sttWhisperPanel: document.getElementById("shell-stt-whisper-panel"),
  sttWhisperModel: document.getElementById("shell-stt-whisper-model"),
  sttElevenlabsPanel: document.getElementById("shell-stt-elevenlabs-panel"),
  sttElevenlabsKey: document.getElementById("shell-stt-elevenlabs-key"),
  sttElevenlabsModel: document.getElementById("shell-stt-elevenlabs-model"),
  voiceGlobalListen: document.getElementById("shell-voice-global-listen"),
  voiceGlobalWrap: document.getElementById("shell-voice-global-wrap"),
  topmost: document.getElementById("shell-topmost"),
  windowTransparent: document.getElementById("shell-window-transparent"),
  windowPetOverlay: document.getElementById("shell-window-pet"),
  windowBackground: document.getElementById("shell-window-background"),
  thinkingSoundGrid: document.getElementById("shell-thinking-sound-grid"),
  thinkingSoundDemo: document.getElementById("shell-thinking-sound-demo"),
  windowCompact: document.getElementById("shell-compact-exit"),
  voiceMode: document.getElementById("shell-voice-mode"),
  voiceSourceBadge: document.getElementById("shell-voice-source-badge"),
  voiceControl: document.getElementById("shell-voice-control"),
  voiceToCompose: document.getElementById("shell-voice-to-compose"),
  message: document.getElementById("shell-message"),
  composeField: document.getElementById("shell-compose-field"),
  composeExpandToggle: document.getElementById("shell-compose-expand-toggle"),
  composeExpandBackdrop: document.getElementById("shell-compose-expand-backdrop"),
  composeDraftStatus: document.getElementById("shell-compose-draft-status"),
  composeDraftPath: document.getElementById("shell-compose-draft-path"),
  sendBtn: document.getElementById("shell-send-btn"),
  sendStopBtn: document.getElementById("shell-send-stop"),
  micBtn: document.getElementById("shell-mic-btn"),
  permissionBanner: document.getElementById("shell-permission-banner"),
  micDialog: document.getElementById("shell-mic-dialog"),
  micDialogUrl: document.getElementById("shell-mic-dialog-url"),
  micDialogClose: document.getElementById("shell-mic-dialog-close"),
  micDialogCheck: document.getElementById("shell-mic-dialog-check"),
  micHelpLink: document.getElementById("shell-mic-help-link"),
  helpBtn: document.getElementById("shell-help-btn"),
  debugBtn: document.getElementById("shell-debug-btn"),
  debugPanel: document.getElementById("shell-debug-panel"),
  debugClear: document.getElementById("shell-debug-clear"),
  debugClose: document.getElementById("shell-debug-close"),
  voicePrimaryStar: document.getElementById("shell-voice-primary-star"),
  helpDialog: document.getElementById("shell-help-dialog"),
  helpClose: document.getElementById("shell-help-close"),
  composeParamsDialog: document.getElementById("shell-compose-params-dialog"),
  composeParamsBody: document.getElementById("shell-compose-params-body"),
  composeParamsClose: document.getElementById("shell-compose-params-close"),
  helpMicLink: document.getElementById("shell-help-mic-link"),
  voiceConfirm: document.getElementById("shell-voice-confirm"),
  voiceConfirmDialog: document.getElementById("shell-voice-confirm-dialog"),
  voiceConfirmForm: document.getElementById("shell-voice-confirm-form"),
  voiceConfirmText: document.getElementById("shell-voice-confirm-text"),
  voiceRetry: document.getElementById("shell-voice-retry"),
  voiceCancel: document.getElementById("shell-voice-cancel"),
  heroCancelSend: document.getElementById("shell-hero-cancel-send"),
  keepAwake: document.getElementById("shell-keep-awake"),
  proactiveRow: document.getElementById("shell-proactive-row"),
  proactiveToggle: document.getElementById("shell-proactive-toggle"),
  proactiveEnabled: document.getElementById("shell-proactive-enabled"),
  proactiveIdleMin: document.getElementById("shell-proactive-idle-min"),
  proactiveIdleMax: document.getElementById("shell-proactive-idle-max"),
  proactiveCooldownSeconds: document.getElementById("shell-proactive-cooldown-seconds"),
  proactiveQuietEnabled: document.getElementById("shell-proactive-quiet-enabled"),
  proactiveQuietStart: document.getElementById("shell-proactive-quiet-start"),
  proactiveQuietEnd: document.getElementById("shell-proactive-quiet-end"),
  proactivePrompt: document.getElementById("shell-proactive-prompt"),
  proactivePromptInsert: document.getElementById("shell-proactive-prompt-insert"),
  proactiveSave: document.getElementById("shell-proactive-save"),
  ttsControls: document.getElementById("shell-tts-controls"),
  ttsPauseBtn: document.getElementById("shell-tts-pause"),
  ttsResumeBtn: document.getElementById("shell-tts-resume"),
  ttsStopBtn: document.getElementById("shell-tts-stop"),
  ttsDownloadBtn: document.getElementById("shell-tts-download"),
  ttsDownloadPanelBtn: document.getElementById("shell-tts-download-panel"),
  voiceWave: document.getElementById("shell-voice-wave"),
  settingsBtn: document.getElementById("shell-settings-btn"),
  windowSave: document.getElementById("shell-window-save"),
  compactDialogQa: document.getElementById("shell-compact-dialog-qa"),
  routeSave: document.getElementById("shell-route-save"),
  ttsSave: document.getElementById("shell-tts-save"),
  ttsSaveHint: document.getElementById("shell-tts-save-hint"),
  sttSave: document.getElementById("shell-stt-save"),
  homeBrand: document.getElementById("shell-home-brand"),
  openSiteBtn: document.getElementById("shell-open-site"),
  openCmsBtn: document.getElementById("shell-open-cms"),
  shellApp: document.getElementById("shell-app"),
  settingsView: document.getElementById("shell-settings-view"),
  mainView: document.getElementById("shell-main-view"),
  subtitle: document.getElementById("shell-subtitle"),
  agentAvatar: document.getElementById("shell-agent-avatar"),
  characterStage: document.getElementById("shell-character-stage"),
  characterToggle: document.getElementById("shell-character-toggle"),
  characterPickerWrap: document.getElementById("shell-character-picker-wrap"),
  characterPicker: document.getElementById("shell-character-picker"),
  replyPanel: document.getElementById("shell-reply-panel"),
  dialogScroll: document.getElementById("shell-dialog-scroll"),
  composePanel: document.getElementById("shell-compose-panel"),
  composeDock: document.getElementById("shell-compose-dock"),
  messageQueue: document.getElementById("shell-message-queue"),
  messageQueueActive: document.getElementById("shell-message-queue-active"),
  messageQueueActiveText: document.getElementById("shell-message-queue-active-text"),
  messageQueueCount: document.getElementById("shell-message-queue-count"),
  messageQueueList: document.getElementById("shell-message-queue-list"),
  routePanel: document.getElementById("shell-route-panel"),
  watchCamera: document.getElementById("shell-watch-camera"),
  composeCameraStub: document.getElementById("shell-compose-camera-stub"),
  composeCameraFile: document.getElementById("shell-compose-camera-file"),
  watchScreen: document.getElementById("shell-watch-screen"),
  screenshotAction: document.getElementById("shell-screenshot-action"),
  compactAction: document.getElementById("shell-compact-exit"),
  compactStage: document.getElementById("shell-compact-stage"),
  compactQa: document.getElementById("shell-compact-qa"),
  compactQaFrame: document.getElementById("shell-compact-qa-frame"),
  compactQaPane: document.getElementById("shell-compact-qa-pane"),
  compactSensor: document.getElementById("shell-compact-sensor"),
  compactSensorStatus: document.getElementById("shell-compact-sensor-status"),
  mediaSection: document.getElementById("shell-media-section"),
  phaseLabel: document.getElementById("shell-phase-label"),
  heroDemoBar: document.getElementById("shell-hero-demo-bar"),
  shellHero: document.getElementById("shell-hero"),
  battery: document.getElementById("shell-battery"),
  batteryFill: document.getElementById("shell-battery-fill"),
  batteryLevel: document.getElementById("shell-battery-level"),
  clock: document.getElementById("shell-clock"),
  agentGate: document.getElementById("shell-agent-gate"),
  agentGateSelect: document.getElementById("shell-agent-gate-select"),
  agentGateOpen: document.getElementById("shell-agent-gate-open"),
  headerAgent: document.getElementById("shell-header-agent"),
  headerHost: document.getElementById("shell-header-host"),
  orientChip: document.getElementById("shell-orient-chip"),
  orientValue: document.getElementById("shell-orient-value"),
  locationChip: document.getElementById("shell-location-chip"),
  locationValue: document.getElementById("shell-location-value"),
  locationShare: document.getElementById("shell-location-share"),
  meta: document.getElementById("shell-meta"),
  lastReply: document.getElementById("shell-last-reply"),
  lastReplyText: document.getElementById("shell-last-reply-text"),
  lastReplyWait: document.getElementById("shell-last-reply-wait"),
  lastReplyMedia: document.getElementById("shell-last-reply-media"),
  agentActivity: document.getElementById("shell-agent-activity"),
  agentActivityList: document.getElementById("shell-agent-activity-list"),
  cameraEnabled: document.getElementById("shell-camera-enabled"),
  cameraStage: document.getElementById("shell-camera-stage"),
  cameraVideo: document.getElementById("shell-camera-video"),
  cameraStatus: document.getElementById("shell-camera-status"),
  cameraSnapshot: document.getElementById("shell-camera-snapshot"),
  cameraFacing: document.getElementById("shell-camera-facing"),
  cameraDevice: document.getElementById("shell-camera-device"),
  cameraDeviceField: document.getElementById("shell-camera-device-field"),
  cameraOnSpeech: document.getElementById("shell-camera-on-speech"),
  screenEnabled: document.getElementById("shell-screen-enabled"),
  screenStage: document.getElementById("shell-screen-stage"),
  screenVideo: document.getElementById("shell-screen-video"),
  screenStatus: document.getElementById("shell-screen-status"),
  screenSnapshot: document.getElementById("shell-screen-snapshot"),
  screenOnSpeech: document.getElementById("shell-screen-on-speech")
};

const shellCamera = createShellCamera({
  videoEl: nodes.cameraVideo,
  stageEl: nodes.cameraStage,
  statusEl: nodes.cameraStatus
});

const shellScreen = createShellScreen({
  videoEl: nodes.screenVideo,
  stageEl: nodes.screenStage,
  statusEl: nodes.screenStatus,
  onInactive: () => {
    if (nodes.screenEnabled) nodes.screenEnabled.checked = false;
    updateScreenUi(false);
    void saveSettings({ screenEnabled: false }).catch(() => {});
  }
});

let dialogScrollSaveTimer = 0;
let lastSavedDialogScrollRatio = null;
let lastDialogHistoryLoadedAt = 0;
const DIALOG_HISTORY_REFRESH_MIN_MS = 30000;

function dialogScrollRatioStorageKey(agentId = state.agentId) {
  const id = String(agentId || "default").trim() || "default";
  return `${SHELL_STORAGE.dialogScrollRatio}:${id}`;
}

function normalizeDialogScrollRatio(value) {
  const ratio = Number(value);
  return Number.isFinite(ratio) ? Math.round(Math.min(1, Math.max(0, ratio)) * 10000) / 10000 : null;
}

function readLocalDialogScrollRatio(agentId = state.agentId) {
  try {
    return normalizeDialogScrollRatio(localStorage.getItem(dialogScrollRatioStorageKey(agentId)));
  } catch {
    return null;
  }
}

function writeLocalDialogScrollRatio(agentId, ratio) {
  const normalized = normalizeDialogScrollRatio(ratio);
  if (normalized == null) return;
  try {
    localStorage.setItem(dialogScrollRatioStorageKey(agentId), String(normalized));
  } catch {
    /* ignore */
  }
}

function readDialogScrollRatioFromSettings(settings = state.settings, agentId = state.agentId) {
  const localRatio = readLocalDialogScrollRatio(agentId);
  if (localRatio != null) return localRatio;
  return normalizeDialogScrollRatio(settings?.dialogScrollRatio);
}

function syncDialogScrollFromSettings(settings = state.settings) {
  const agentId = state.agentId;
  const ratio = readDialogScrollRatioFromSettings(settings, agentId);
  const serverRatio = normalizeDialogScrollRatio(settings?.dialogScrollRatio);
  if (readLocalDialogScrollRatio(agentId) == null && serverRatio != null) {
    writeLocalDialogScrollRatio(agentId, serverRatio);
  }
  lastSavedDialogScrollRatio = ratio;
  shellDialog.scheduleScrollRestore?.(ratio);
}

function persistDialogScrollRatio(ratio) {
  const normalized = normalizeDialogScrollRatio(ratio);
  if (normalized == null) return;
  if (lastSavedDialogScrollRatio === normalized) return;
  lastSavedDialogScrollRatio = normalized;
  state.settings = { ...(state.settings || {}), dialogScrollRatio: normalized };
  writeLocalDialogScrollRatio(state.agentId, normalized);
  shellDialog.scheduleScrollRestore?.(normalized);
  if (dialogScrollSaveTimer) window.clearTimeout(dialogScrollSaveTimer);
  dialogScrollSaveTimer = window.setTimeout(() => {
    dialogScrollSaveTimer = 0;
    void saveSettings({ dialogScrollRatio: normalized }, { apply: "none" }).catch(() => {});
  }, 400);
}

function flushDialogScrollRatioSave() {
  if (dialogScrollSaveTimer) {
    window.clearTimeout(dialogScrollSaveTimer);
    dialogScrollSaveTimer = 0;
  }
  const ratio = shellDialog.getScrollRatio?.();
  const normalized = normalizeDialogScrollRatio(ratio);
  if (normalized == null) return;
  if (lastSavedDialogScrollRatio === normalized) return;
  lastSavedDialogScrollRatio = normalized;
  state.settings = { ...(state.settings || {}), dialogScrollRatio: normalized };
  writeLocalDialogScrollRatio(state.agentId, normalized);
  if (!state.agentId) return;
  try {
    fetch(apiUrl("/api/shell/settings"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: { dialogScrollRatio: normalized } }),
      keepalive: true
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

function bindDialogScrollPersistence() {
  if (document.documentElement.dataset.shellDialogScrollBound === "1") return;
  document.documentElement.dataset.shellDialogScrollBound = "1";
  window.addEventListener("pagehide", flushDialogScrollRatioSave);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushDialogScrollRatioSave();
  });
}

function prepareDialogScrollRestore({ restoreOnLoad = false } = {}) {
  const ratio = readLocalDialogScrollRatio(state.agentId);
  if (ratio != null) shellDialog.scheduleScrollRestore?.(ratio);
  syncDialogScrollFromSettings();
  if (restoreOnLoad) shellDialog.requestScrollRestoreOnLoad?.();
}

function syncCompactQa() {
  shellCompactQa.render?.();
}

function isCompactDialogQaEnabled() {
  return state.windowSettings?.compactDialogQa !== false;
}

const shellDialog = createShellDialog({
  panel: nodes.replyPanel,
  scroll: document.getElementById("shell-dialog-scroll"),
  scrollProgress: document.getElementById("shell-dialog-scroll-progress"),
  scrollProgressFill: document.getElementById("shell-dialog-scroll-progress-fill"),
  statusDot: document.getElementById("shell-status-dot"),
  refreshBtn: document.getElementById("shell-dialog-refresh"),
  historyOpen: document.getElementById("shell-history-open"),
  historyCount: document.getElementById("shell-history-count"),
  historyDialog: document.getElementById("shell-history-dialog"),
  historyClose: document.getElementById("shell-history-close"),
  historyList: document.getElementById("shell-history-list"),
  lastAskWrap: document.getElementById("shell-last-ask-wrap"),
  lastAsk: document.getElementById("shell-last-ask"),
  thread: document.getElementById("shell-dialog-thread"),
  liveTools: document.getElementById("shell-live-tools"),
  lastReply: document.getElementById("shell-last-reply"),
  errorEl: document.getElementById("shell-dialog-error"),
  pullHint: document.getElementById("shell-pull-hint"),
  onScrollPositionChange: persistDialogScrollRatio,
  onHistoryChange: syncCompactQa,
  fetchHistory: async () => {
    const runtime = normalizeMessageRuntime(state.settings?.messageTarget || nodes.messageTarget?.value || "qwenpaw");
    const data = await apiFetch(`/api/shell/dialogs/history?runtime=${encodeURIComponent(runtime)}&limit=50`, {
      timeoutMs: 15000
    });
    lastDialogHistoryLoadedAt = Date.now();
    return Array.isArray(data?.messages) ? data.messages : [];
  }
});

const shellCompactQa = createShellCompactQa({
  root: nodes.compactQa,
  frame: nodes.compactQaFrame,
  pane: nodes.compactQaPane,
  getHistory: () => shellDialog.getHistory?.() || [],
  getLastAsk: () => shellDialog.getLastAskText?.() || "",
  getLiveReply: () => shellDialog.getLastReplyRaw?.() || "",
  isStreaming: () => nodes.replyPanel?.classList.contains("is-streaming"),
  isEnabled: () => isWindowCompactEnabled() && isCompactDialogQaEnabled(),
  isCompact: () => isWindowCompactEnabled()
});

let shellSession = null;
let shellProactive = null;
const shellDebug = createShellDebugLog({ storageKey: SHELL_STORAGE.debugLog });

function shellLog(category, message, detail) {
  shellDebug.log(category, message, detail);
}

function initShellProactiveController() {
  shellProactive = createShellProactive({
    toggleBtn: nodes.proactiveToggle,
    composeEl: nodes.message,
    getPhase: () => resolveDisplayPhase(state.shellState?.phase || nodes.agentAvatar?.dataset.phase || "waiting"),
    isPipelineBusy: () => isMessagePipelineActive(),
    isTtsActive: () => isTtsPlaybackActive(),
    isMicActive: () =>
      Boolean(state.micActive || state.micTapHeld || shellTapVoice?.isTapHeld?.()),
    sendProactive: (idleSeconds) => sendProactiveMessage(idleSeconds),
    syncEnabledUi: (on) => {
      if (nodes.proactiveEnabled) nodes.proactiveEnabled.checked = on;
    },
    persistEnabled: async (enabled) => {
      await saveSettings({ proactiveEnabled: enabled }, { apply: "none" });
      state.settings = { ...(state.settings || {}), proactiveEnabled: enabled };
      if (nodes.proactiveEnabled) nodes.proactiveEnabled.checked = enabled;
      settingsSave.patchBaseline("proactive", { proactiveEnabled: enabled });
    }
  });
  shellProactive.syncSettings(state.settings || { proactiveEnabled: false });
  shellDebug.watchProactive(shellProactive);
}

async function toggleProactiveFromHero() {
  const btn = nodes.proactiveToggle;
  if (!shellProactive || btn?.classList.contains("is-busy") || btn?.disabled) return;
  const prev = btn.getAttribute("aria-pressed") === "true";
  btn.setAttribute("aria-pressed", prev ? "false" : "true");
  btn.classList.add("is-busy");
  void playShellUiSound("toggle");
  try {
    const enabled = await shellProactive.toggleEnabled();
    shellLog("proactive", enabled ? "Включена из hero" : "Выключена из hero");
    renderPhase("waiting", enabled ? "Проактивность включена" : "Проактивность выключена");
  } catch (error) {
    btn.setAttribute("aria-pressed", prev ? "true" : "false");
    renderPhase("waiting", error.message);
  } finally {
    btn.classList.remove("is-busy");
  }
}

function syncDialogConnectionState(override) {
  let conn = override || resolveShellServerConnectionState();
  const runtime = getSelectedRuntime();
  const status = getRuntimeStatus(runtime);
  if (conn === "live" && status) {
    const runtimeConn = resolveRuntimeConnectionState(runtime, status, { implemented: true });
    if (runtimeConn === "error") conn = "error";
    else if (runtimeConn === "unconfigured") conn = "connecting";
  }
  shellDialog.setConnectionState(conn);
  if (nodes.statusDot) {
    const runtimeLabel = SHELL_RUNTIME_LABELS[runtime] || runtime;
    const titles = {
      live: `${runtimeLabel} · на связи`,
      error: `${runtimeLabel} · недоступен${status?.error ? `: ${status.error}` : ""}`,
      offline: "Нет сети",
      connecting: `${runtimeLabel} · подключение…`
    };
    const title = titles[conn] || titles.connecting;
    nodes.statusDot.title = title;
    nodes.statusDot.setAttribute("aria-label", title);
  }
}

function getRuntimeStatus(runtime) {
  const id = normalizeMessageRuntime(runtime);
  return state.runtimeStatuses?.[id] || null;
}

function mergeRuntimeStatusEntry(prev = {}, incoming = {}, { fullProbe = false } = {}) {
  if (!incoming || typeof incoming !== "object") return { ...prev };
  const merged = {
    ...prev,
    ...incoming,
    runtime: incoming.runtime || prev.runtime
  };
  if (
    !fullProbe &&
    prev.ok === true &&
    incoming.ok === false &&
    !String(incoming.version || "").trim() &&
    !String(incoming.error || "").trim()
  ) {
    merged.ok = prev.ok;
    merged.installed = prev.installed ?? merged.installed;
    merged.serverOk = prev.serverOk ?? merged.serverOk;
    merged.configured = prev.configured ?? merged.configured;
    merged.version = prev.version || merged.version;
    merged.binary = prev.binary || merged.binary;
    merged.error = prev.error || "";
  }
  return merged;
}

function apiUrl(path, params = {}) {
  const url = new URL(path, window.location.origin);
  if (state.agentId) url.searchParams.set("agent", state.agentId);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

async function apiFetch(path, options = {}) {
  const timeoutMs = Number(options.timeoutMs) || 0;
  const { timeoutMs: _timeoutMs, ...fetchOptions } = options;
  const controller = timeoutMs > 0 ? new AbortController() : null;
  let timer;
  try {
    if (controller) {
      timer = setTimeout(() => controller.abort(), timeoutMs);
    }
    const response = await fetch(apiUrl(path), {
      headers: {
        "Content-Type": "application/json",
        ...(fetchOptions.headers || {})
      },
      ...fetchOptions,
      signal: controller?.signal || fetchOptions.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.details || data.error || `HTTP ${response.status}`);
    }
    return data;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Таймаут запроса (${Math.round(timeoutMs / 1000)} с)`);
    }
    throw error;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

const SHELL_CLOCK_LOCALE = "ru-RU";
const BATTERY_FILL_MAX = 16;

function formatShellClock(date = new Date()) {
  try {
    return new Intl.DateTimeFormat(SHELL_CLOCK_LOCALE, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  } catch {
    return date.toLocaleString(SHELL_CLOCK_LOCALE, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
}

function syncAgentSelects() {
  if (nodes.headerAgent && state.agentId) {
    nodes.headerAgent.value = state.agentId;
  }
}

function isShellAgentGateOpen() {
  return Boolean(nodes.agentGate && !nodes.agentGate.classList.contains("hidden"));
}

function isShellAgentReady() {
  return Boolean(String(state.agentId || "").trim()) && !isShellAgentGateOpen();
}

function isShellRuntimeSelectReady() {
  const select = nodes.messageTarget;
  if (!select) return false;
  if (select.options.length > 0) return true;
  return Boolean(select.querySelector("optgroup option"));
}

function canUseShellMessaging() {
  if (!isShellAgentReady()) return false;
  if (isShellRuntimeSelectReady()) return true;
  return Boolean(String(state.settings?.messageTarget || state.agentId || "").trim());
}

function shellAgentLockHint() {
  if (!isShellAgentReady()) return "Выберите хранилище (агента) в шапке";
  if (!isShellRuntimeSelectReady()) return "Загрузка runtime…";
  return "";
}

function syncShellAgentReadyUi() {
  const agentReady = isShellAgentReady();
  const messagingReady = canUseShellMessaging();
  const lockHint = shellAgentLockHint();

  document.body.classList.toggle("shell-agent-locked", !messagingReady);

  const lockControl = (el, enabled, title = lockHint) => {
    if (!el) return;
    el.disabled = !enabled;
    if (title) {
      if (enabled) el.removeAttribute("data-agent-lock-title");
      else {
        el.dataset.agentLockTitle = el.title || "";
        el.title = title;
      }
    } else if (el.dataset.agentLockTitle) {
      el.title = el.dataset.agentLockTitle;
      el.removeAttribute("data-agent-lock-title");
    }
  };

  if (nodes.message) {
    nodes.message.disabled = !messagingReady;
    nodes.message.readOnly = !messagingReady;
    nodes.message.placeholder = messagingReady ? "Спросите агента…" : lockHint || "Спросите агента…";
    nodes.message.title = messagingReady ? "" : lockHint;
  }

  lockControl(nodes.sttEnabled, messagingReady);
  lockControl(nodes.ttsEnabled, messagingReady);
  lockControl(nodes.messageTarget, isShellRuntimeSelectReady());

  nodes.ttsPlaybackModeGroup
    ?.querySelectorAll('input[type="radio"]')
    .forEach((input) => lockControl(input, messagingReady));

  if (nodes.proactiveToggle) {
    lockControl(nodes.proactiveToggle, messagingReady);
    nodes.proactiveToggle.classList.toggle("is-disabled", !messagingReady);
  }
  nodes.proactiveRow?.classList.toggle("is-disabled", !messagingReady);

  updateSendButtonLabel();
}

async function populateAgentSelects() {
  refreshShellHeaderNodes();
  const data = await loadAgentSelectData();
  const selected = String(state.agentId || "").trim();
  populateAgentSelect(nodes.headerAgent, {
    agents: data.agents,
    groups: data.groups,
    selectedId: selected,
    placeholder: "— Хранилище (агент) —",
    includePlaceholder: true
  });
}

async function populateHeaderAgentSelect() {
  await populateAgentSelects();
}

async function onAgentSelectChange(next) {
  const agentId = String(next || "").trim();
  if (!agentId || agentId === state.agentId) return;
  void playShellUiSound("switch");
  navigateToShellAgent(agentId);
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }
  await resolveShellAgent();
  state.runtimeStatuses = {};
  resetRuntimeStatusProbe();
  releaseMessagePipeline();
  state.assistantStream = null;
  clearShellReply();
  populateRuntimeSelect();
  refreshRuntimeSelectLabels();
  syncShellAgentReadyUi();
  await bootstrapRuntimeSelect();
  resetRuntimeStatusProbe();
  await pullRuntimeStatuses();
  prepareDialogScrollRestore({ restoreOnLoad: true });
  await shellDialog.refreshHistory?.({ replace: true, restoreScroll: true });
  await loadComposeDraft();
  commitAllSettingsBaselinesIfSafe();
  syncComposeReadyStatus();
  connectStream();
}

function bindAgentSelectUi(selectEl) {
  selectEl?.addEventListener("change", () => {
    void onAgentSelectChange(selectEl.value);
  });
}

function refreshShellHeaderNodes() {
  nodes.messageTarget = document.getElementById("shell-message-target") || nodes.messageTarget;
  nodes.routeRuntime = document.getElementById("shell-route-runtime") || nodes.routeRuntime;
  nodes.headerAgent = document.getElementById("shell-header-agent") || nodes.headerAgent;
  nodes.headerHost = document.getElementById("shell-header-host") || nodes.headerHost;
  nodes.settingsBtn = document.getElementById("shell-settings-btn") || nodes.settingsBtn;
  nodes.clock = document.getElementById("shell-clock") || nodes.clock;
}

function renderHeaderHostChip() {
  if (!nodes.headerHost) return;
  const surface = getShellSurface();
  const host = surface?.host || readVoiceSurfaceHostFromLocation() || "browser-embed";
  nodes.headerHost.textContent = getShellHostHeaderLabel(host);
  nodes.headerHost.title = `${getShellHostLabel(host)} · где открыт Agent CMS Voice`;
}

function bindRuntimeSelectUi(selectEl = nodes.messageTarget) {
  if (!selectEl || selectEl.dataset.shellBound === "1") return;
  selectEl.dataset.shellBound = "1";
  selectEl.addEventListener("change", () => {
    void handleMessageTargetChange();
  });
}

function bindSettingsBtnUi() {
  refreshShellHeaderNodes();
  if (nodes.settingsBtn && nodes.settingsBtn.dataset.shellBound !== "1") {
    nodes.settingsBtn.dataset.shellBound = "1";
    const toggleSettingsView = () => {
      setShellView(state.view === "settings" ? "main" : "settings");
    };
    window.__shellToggleSettings = toggleSettingsView;
    nodes.settingsBtn.addEventListener("click", toggleSettingsView);
  }
}

function bindHeaderContextUi() {
  refreshShellHeaderNodes();
  bindShellClickHandlers();
  bindAgentSelectUi(nodes.headerAgent);
  bindRuntimeSelectUi(nodes.messageTarget);
  bindSettingsBtnUi();
}

function resolveShellServerConnectionState() {
  const online = navigator.onLine !== false;
  if (!online) return "offline";
  if (!state.agentId || typeof EventSource === "undefined") return "connecting";
  const readyState = state.eventSource?.readyState;
  if (readyState === EventSource.OPEN) return "live";
  if (readyState === EventSource.CLOSED) return "error";
  return "connecting";
}

function renderClock() {
  if (!nodes.clock) return;
  const now = new Date();
  nodes.clock.textContent = formatShellClock(now);
  nodes.clock.dateTime = now.toISOString();
}

function startClock() {
  refreshShellHeaderNodes();
  renderClock();
  if (state.clockTimer) clearInterval(state.clockTimer);
  state.clockTimer = setInterval(renderClock, 1000);
}

function renderBatteryUnavailable(reason = "") {
  if (!nodes.battery || !nodes.batteryFill || !nodes.batteryLevel) return;
  nodes.battery.classList.remove("hidden");
  nodes.battery.dataset.charging = "0";
  nodes.battery.dataset.level = "unknown";
  nodes.battery.dataset.available = "0";
  nodes.batteryFill.setAttribute("width", "0");
  nodes.batteryLevel.textContent = "—";
  nodes.battery.title = reason || "Батарея недоступна в этом браузере";
}

function renderBattery(battery) {
  if (!nodes.battery || !nodes.batteryFill || !nodes.batteryLevel) return;
  const level = Math.max(0, Math.min(100, Math.round((battery?.level || 0) * 100)));
  const charging = Boolean(battery?.charging);
  nodes.battery.classList.remove("hidden");
  nodes.battery.dataset.available = "1";
  nodes.battery.dataset.charging = charging ? "1" : "0";
  nodes.battery.dataset.level = level <= 10 ? "critical" : level <= 20 ? "low" : "normal";
  nodes.batteryFill.setAttribute("width", String((level / 100) * BATTERY_FILL_MAX));
  nodes.batteryLevel.textContent = `${level}%`;
  nodes.battery.title = charging ? `Батарея: ${level}% (зарядка)` : `Батарея: ${level}%`;
}

async function initBatteryMonitor() {
  if (!navigator.getBattery) {
    renderBatteryUnavailable("Батарея: API недоступен (Safari / iOS)");
    return;
  }
  try {
    const battery = await navigator.getBattery();
    const update = () => renderBattery(battery);
    update();
    battery.addEventListener("levelchange", update);
    battery.addEventListener("chargingchange", update);
  } catch {
    renderBatteryUnavailable("Батарея: не удалось прочитать уровень");
  }
}

function livePhraseFromStatus(shellState, latestAgentMessage) {
  const phase = shellState?.phase || "waiting";
  let phrase = String(shellState?.phrase || "").trim();
  const replyBody = String(latestAgentMessage?.body || "").trim();
  if (replyBody && phrase && phrase === replyBody.slice(0, 240)) {
    phrase = "";
  }
  if (!phrase && phase === "waiting") return HERO_IDLE_PHRASE;
  return phrase;
}

function heroIdlePhrase() {
  return `${HERO_IDLE_PHRASE}${queuePhraseSuffix()}`;
}

function isAssistantStreaming() {
  return Boolean(state.assistantStream && !state.assistantStream.finalized);
}

function isShellAgentWorkActive() {
  return Boolean(state.messagePipelineBusy || state.processingMessage || isAssistantStreaming());
}

function hasAssistantStreamText() {
  return Boolean(String(state.assistantStream?.text || "").trim());
}

function isAgentReplyStreaming() {
  return Boolean(isAssistantStreaming() && hasAssistantStreamText());
}

function isHeroIdlePhrase(phrase = "") {
  const text = String(phrase || "").trim();
  if (!text) return true;
  return (
    text === HERO_IDLE_PHRASE ||
    text.startsWith(`${HERO_IDLE_PHRASE} ·`) ||
    text.startsWith(HERO_READY_PHRASE)
  );
}

function isUserComposingInput() {
  if (String(nodes.message?.value || "").trim()) return true;
  return Boolean(
    state.micActive ||
    state.micTapHeld ||
    state.pttHeld ||
    state.pttKeyboardHeld ||
    state.meetingRecording
  );
}

function isComposeReady() {
  if (isTtsPlaybackActive() || isAssistantStreaming() || state.messagePipelineBusy) return false;
  return isUserComposingInput();
}

function syncComposeReadyStatus() {
  const phase = state.shellState?.phase || nodes.agentAvatar?.dataset.phase || "waiting";
  syncHeroAvatarVisuals(phase, {
    updateLabel: true,
    phrase: resolveHeroStatusLabel(phase, nodes.phaseLabel?.textContent || "")
  });
}

function resolveDisplayPhase(requestedPhase = "waiting") {
  const phase = PHASE_LABELS[requestedPhase] ? requestedPhase : "waiting";

  if (phase === "disabled") return "disabled";
  if (isTtsPlaybackActive()) return "speaking";
  if (isAssistantStreaming()) return "thinking";
  if (state.messagePipelineBusy || state.processingMessage) return "thinking";
  if (phase === "speaking" && !isTtsPlaybackActive()) return "waiting";
  if (isUserComposingInput()) return "waiting";
  if ((phase === "thinking" || phase === "speaking") && !isShellAgentWorkActive() && !isTtsPlaybackActive()) {
    return "waiting";
  }

  return phase;
}

function resolveHeroStatusBadgeClass(displayPhase, heroState) {
  if (displayPhase === "listening") return "is-active";
  if (heroState === "thinking") return "is-busy";
  if (heroState === "typing" || heroState === "replying") return "is-typing";
  if (heroState === "ready") return "is-ready";
  return "is-idle";
}

function resolveHeroSensorActivity(displayPhase, heroState) {
  if (displayPhase === "listening") return "listening";
  if (heroState === "ready") return "ready";
  if (heroState === "typing" || heroState === "replying") return "typing";
  if (heroState === "thinking") return "thinking";
  return "idle";
}

function resolveHeroAvatarState(requestedPhase = "waiting") {
  const displayPhase = resolveDisplayPhase(requestedPhase);
  if (isTtsPlaybackActive()) return "typing";
  if (isAgentReplyStreaming()) return "typing";
  if (displayPhase === "thinking") return "thinking";
  if (displayPhase === "listening") return "listening";
  if (displayPhase === "speaking") return "typing";
  if (isComposeReady()) return "ready";
  return "idle";
}

function resolveHeroStatusLabel(requestedPhase = "waiting", phrase = "") {
  const heroState = resolveHeroAvatarState(requestedPhase);
  const statusText = String(phrase || "").trim();
  const displayPhase = resolveDisplayPhase(requestedPhase);
  if (displayPhase === "disabled") return PHASE_LABELS.disabled;
  if (heroState === "listening") return HERO_STATE_LABELS.listening;
  if (heroState === "ready") return HERO_STATE_LABELS.ready;
  if (heroState === "typing") {
    if (isTtsPlaybackActive() && !isAssistantStreaming()) return HERO_STATE_LABELS.replying;
    return HERO_STATE_LABELS.typing;
  }
  if (heroState === "replying") return HERO_STATE_LABELS.replying;
  if (heroState === "thinking") {
    if (statusText && !isHeroIdlePhrase(statusText)) return statusText;
    return HERO_STATE_LABELS.thinking;
  }
  return HERO_IDLE_PHRASE;
}

function syncProcessingSound(_displayPhase) {
  if (processingSoundPhase === "thinking") stopShellProcessingAmbient();
  processingSoundPhase = "";
}

function syncThinkingSoundButtons() {
  const selected = readProcessingSound();
  document.querySelectorAll("[data-thinking-sound]").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.thinkingSound === selected);
  });
}

function populateThinkingSoundPickers() {
  const hosts = [nodes.thinkingSoundGrid, nodes.thinkingSoundDemo].filter(Boolean);
  for (const host of hosts) {
    if (host.dataset.ready === "1") continue;
    host.dataset.ready = "1";
    const compact = host === nodes.thinkingSoundDemo;
    host.replaceChildren(
      ...PROCESSING_SOUND_OPTIONS.map((option, index) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "shell-thinking-sound-btn";
        btn.dataset.thinkingSound = option.id;
        btn.title = option.hint;
        btn.setAttribute("aria-label", `${option.label}. ${option.hint}`);
        const caption = document.createElement("span");
        caption.textContent = compact ? `${index + 1} ${option.label}` : `${index + 1}. ${option.label}`;
        btn.append(caption);
        if (!compact) {
          const hint = document.createElement("small");
          hint.textContent = option.hint;
          btn.append(hint);
        }
        btn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          pickThinkingSound(option.id);
        });
        return btn;
      })
    );
  }
  syncThinkingSoundButtons();
}

function pickThinkingSound(id) {
  primeShellProcessingAudio();
  writeProcessingSound(id);
  syncThinkingSoundButtons();
  if (processingSoundPhase === "thinking") {
    void startShellProcessingAmbient(id);
    return;
  }
  void previewShellProcessingAmbient(id);
}

function syncHeroAvatarVisuals(requestedPhase = "waiting", { updateLabel = false, phrase = "" } = {}) {
  const displayPhase = resolveDisplayPhase(requestedPhase);
  const statusText = String(phrase || "").trim();
  const heroState = resolveHeroAvatarState(requestedPhase);

  if (nodes.agentAvatar) {
    nodes.agentAvatar.dataset.phase = displayPhase;
    nodes.agentAvatar.dataset.heroState = heroState;
    nodes.agentAvatar.dataset.activity = resolveHeroSensorActivity(displayPhase, heroState);
    nodes.agentAvatar.setAttribute(
      "aria-label",
      resolveHeroStatusLabel(requestedPhase, statusText)
    );
  }
  if (nodes.shellHero) {
    nodes.shellHero.dataset.heroState = heroState;
  }

  if (nodes.voiceWave) {
    const showWave = heroState === "typing" && isTtsPlaybackActive();
    nodes.voiceWave.classList.toggle("hidden", !showWave);
    nodes.voiceWave.classList.toggle("is-paused", Boolean(state.ttsPaused));
  }

  if (updateLabel && !state.ttsPaused && nodes.phaseLabel) {
    nodes.phaseLabel.classList.remove("is-idle", "is-ready", "is-active", "is-busy", "is-speaking", "is-typing");
    nodes.phaseLabel.textContent = resolveHeroStatusLabel(requestedPhase, statusText);
    nodes.phaseLabel.classList.add(resolveHeroStatusBadgeClass(displayPhase, heroState));
  }

  syncProcessingSound(displayPhase);
}

function maybeResetStaleSpeakingPhase() {
  if (state.shellState?.phase !== "speaking") return;
  if (isTtsPlaybackActive()) return;
  void patchShellState({ phase: "waiting", phrase: HERO_IDLE_PHRASE });
}

function isRuntimeMetricsLabel(metrics) {
  const extra = String(metrics || "").trim().toLowerCase();
  return Boolean(extra && SHELL_RUNTIMES.includes(extra));
}

function composePhaseStatusText(phrase, metrics) {
  const statusText = String(phrase || "").trim();
  const extra = String(metrics || "").trim();
  if (!extra || isRuntimeMetricsLabel(extra) || isHeroIdlePhrase(statusText)) return statusText;
  if (!statusText) return extra;
  if (statusText.includes(extra)) return statusText;
  return `${statusText} · ${extra}`;
}

function renderPhase(phase, phrase = "", metrics = "") {
  if (shellSession?.shouldBlockPhaseUpdate(phase)) return;
  const displayPhase = resolveDisplayPhase(phase);
  lastRenderedDisplayPhase = displayPhase;
  let statusText = composePhaseStatusText(phrase, metrics);
  if (displayPhase === "waiting" && !isShellAgentWorkActive() && !isTtsPlaybackActive()) {
    if (!statusText || /печатает|думаю|запускаю|работаю|размышляю/i.test(statusText)) {
      statusText = heroIdlePhrase();
    }
  }
  if (displayPhase !== lastLoggedPhase) {
    shellLog("phase", displayPhase, statusText || undefined);
    lastLoggedPhase = displayPhase;
  }
  const skipLabel = shellSession?.shouldSkipDuplicatePhase(displayPhase) && !statusText;
  if (!skipLabel) shellSession?.rememberPhase(displayPhase);
  syncHeroAvatarVisuals(displayPhase, { updateLabel: !skipLabel && !state.ttsPaused, phrase: statusText });
  if (nodes.meta) nodes.meta.textContent = "";
  if (nodes.characterStage) nodes.characterStage.dataset.phase = displayPhase;
  updateTtsControlsUi(displayPhase);
  syncCompactSensorPhase(displayPhase, statusText);
}

function isTtsPlaybackActive() {
  if (state.ttsPaused) return true;
  if (state.streamTtsActive || state.streamTtsQueue.length) return true;
  if (state.speaking) return true;
  if (ttsPlayer?.isPlaying() || ttsPlayer?.isPaused()) return true;
  return false;
}

function waitWhileTtsPaused() {
  if (!state.ttsPaused) return Promise.resolve();
  return new Promise((resolve) => {
    const tick = () => {
      if (!state.ttsPaused) {
        resolve();
        return;
      }
      setTimeout(tick, 80);
    };
    tick();
  });
}

function updateTtsControlsUi(phase = resolveDisplayPhase(state.shellState?.phase || nodes.agentAvatar?.dataset.phase || "waiting")) {
  const playbackActive = isTtsPlaybackActive();

  if (nodes.ttsPauseBtn) {
    nodes.ttsPauseBtn.disabled = !playbackActive || state.ttsPaused;
  }
  if (nodes.ttsResumeBtn) {
    nodes.ttsResumeBtn.disabled = !playbackActive || !state.ttsPaused;
  }
  if (nodes.ttsStopBtn) {
    nodes.ttsStopBtn.disabled = !playbackActive;
  }

  const showWave = playbackActive;
  nodes.voiceWave?.classList.toggle("hidden", !showWave);
  nodes.voiceWave?.classList.toggle("is-paused", Boolean(state.ttsPaused));
  updateSendButtonLabel();
  updateTtsDownloadUi();
}

function updateTtsDownloadUi() {
  const text = String(lastTtsSpoken.text || "").trim();
  const hasText = Boolean(text);
  const title = hasText
    ? `Скачать аудио озвучки: ${text.slice(0, 160)}${text.length > 160 ? "…" : ""}`
    : "Пока нечего скачивать — сначала «Пробный текст» или ответ агента с озвучкой";
  const busy = Boolean(
    nodes.ttsDownloadBtn?.classList.contains("is-busy") ||
      nodes.ttsDownloadPanelBtn?.classList.contains("is-busy")
  );

  nodes.ttsDownloadBtn?.classList.remove("hidden");
  if (nodes.ttsDownloadBtn) {
    nodes.ttsDownloadBtn.disabled = !hasText || busy;
    nodes.ttsDownloadBtn.title = title;
  }
  if (nodes.ttsDownloadPanelBtn) {
    nodes.ttsDownloadPanelBtn.disabled = !hasText || busy;
    nodes.ttsDownloadPanelBtn.title = title;
    nodes.ttsDownloadPanelBtn.classList.toggle("is-ready", hasText);
  }
}

function rememberLastTtsSpoken(text) {
  const spoken = String(text || "").trim();
  if (!spoken) return;
  const chunk = lastTtsChunkRecording;
  const useChunkBlob = chunk?.blob && chunk.text === spoken;
  lastTtsSpoken = {
    text: spoken,
    blob: useChunkBlob ? chunk.blob : null,
    mimeType: useChunkBlob ? chunk.mimeType || chunk.blob.type || "audio/mpeg" : "",
    blobText: useChunkBlob ? chunk.text : spoken
  };
  updateTtsDownloadUi();
}

function ttsDownloadExtension(mimeType = "") {
  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("wav")) return "wav";
  if (mime.includes("ogg")) return "ogg";
  return "mp3";
}

function decodeTtsAudioResult(result) {
  const mimeType = String(result?.mimeType || "audio/mpeg");
  const binary = atob(String(result?.audio || ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { blob: new Blob([bytes], { type: mimeType }), mimeType };
}

async function resolveTtsDownloadBlob(text) {
  const payload = String(text || "").trim();
  if (!payload) throw new Error("Нет текста для скачивания");

  if (
    lastTtsSpoken.blob &&
    lastTtsSpoken.blobText === payload &&
    lastTtsSpoken.text === payload
  ) {
    return {
      blob: lastTtsSpoken.blob,
      mimeType: lastTtsSpoken.mimeType || lastTtsSpoken.blob.type || "audio/mpeg"
    };
  }

  const request = { text: payload, settings: collectTtsRuntimeSettings() };
  if (isBrowserTtsEngine()) request.engine = "edge";
  const result = await apiFetch("/api/shell/tts/synthesize", {
    method: "POST",
    body: JSON.stringify(request)
  });
  return decodeTtsAudioResult(result);
}

async function downloadLastTtsAudio() {
  const text = String(lastTtsSpoken.text || "").trim();
  if (!text || (!nodes.ttsDownloadBtn && !nodes.ttsDownloadPanelBtn)) return;

  nodes.ttsDownloadBtn?.classList.add("is-busy");
  nodes.ttsDownloadPanelBtn?.classList.add("is-busy");
  updateTtsDownloadUi();
  try {
    const { blob, mimeType } = await resolveTtsDownloadBlob(text);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const filename = `shell-tts-${stamp}.${ttsDownloadExtension(mimeType)}`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    lastTtsSpoken = { text, blob, mimeType, blobText: text };
    updateTtsDownloadUi();
  } catch (error) {
    renderPhase("waiting", `Не удалось скачать озвучку: ${error.message}`);
  } finally {
    nodes.ttsDownloadBtn?.classList.remove("is-busy");
    nodes.ttsDownloadPanelBtn?.classList.remove("is-busy");
    updateTtsDownloadUi();
  }
}

function pauseTtsPlayback() {
  if (!isTtsPlaybackActive()) return;
  if (isBrowserTtsEngine()) {
    const synth = getSpeechSynth();
    if (synth?.speaking && !synth.paused) synth.pause();
  } else {
    ttsPlayer?.pause();
  }
  state.ttsPaused = true;
  if (nodes.phaseLabel) nodes.phaseLabel.textContent = "⏸ Пауза";
  updateTtsControlsUi("speaking");
}

function resumeTtsPlayback() {
  if (!state.ttsPaused) return;
  if (isBrowserTtsEngine()) {
    const synth = getSpeechSynth();
    if (synth?.paused) synth.resume();
  } else {
    ttsPlayer?.resume();
  }
  state.ttsPaused = false;
  if (nodes.phaseLabel) nodes.phaseLabel.textContent = PHASE_LABELS.speaking;
  updateTtsControlsUi("speaking");
}

function pauseBrowserTts() {
  pauseTtsPlayback();
}

function resumeBrowserTts() {
  resumeTtsPlayback();
}

function isStubReplyText(text) {
  const value = String(text || "").trim();
  if (!value || value === "—") return true;
  return /^(ответ от mcp-агента|ответ агента|ответ получен|ok|понятно)\.?$/iu.test(value);
}

function stubReplyPresentation() {
  return "Агент на связи — содержательного текста в ответе пока нет";
}

function applyReplyTextPresentation(element, { text, stub }) {
  if (!element) return;
  element.classList.toggle("shell-reply-text--stub", Boolean(stub));
  element.dataset.replyKind = stub ? "stub" : "message";
}

function renderShellReply(message) {
  const rawBody = String(message?.body || message?.message?.body || "").trim();
  const extraShows = Array.isArray(message?.shows) ? message.shows : [];
  const spokenParts = Array.isArray(message?.spokenParts) ? message.spokenParts : [];
  const spokenText = String(message?.spokenText || "").trim();
  const parsed = parseShellReply(rawBody);
  const shows = extraShows.length ? [...parsed.shows, ...extraShows] : parsed.shows;
  const rawText = parsed.text === "—" ? "" : parsed.text;
  const stub = isStubReplyText(stripAllTtsBlocks(rawText));
  const spokenOpts = { spokenParts, spokenText };

  if (nodes.lastReplyText) {
    if (stub) {
      renderShellReplyMarkdown(nodes.lastReplyText, stubReplyPresentation());
      applyReplyTextPresentation(nodes.lastReplyText, { text: stubReplyPresentation(), stub: true });
    } else {
      renderShellReplyBody(nodes.lastReplyText, rawText, spokenOpts);
      applyReplyTextPresentation(nodes.lastReplyText, { text: rawText, stub: false });
    }
  } else if (nodes.lastReply) {
    if (stub) {
      renderShellReplyMarkdown(nodes.lastReply, stubReplyPresentation());
      applyReplyTextPresentation(nodes.lastReply, { text: stubReplyPresentation(), stub: true });
    } else {
      renderShellReplyBody(nodes.lastReply, rawText, spokenOpts);
      applyReplyTextPresentation(nodes.lastReply, { text: rawText, stub: false });
    }
  }

  renderShellReplyMedia(nodes.lastReplyMedia, shows, state.agentId);
  shellDialog.onReplyRendered(stub ? "" : rawText);
  return { ...parsed, shows };
}

function clearShellReply() {
  if (nodes.lastReplyText) {
    renderShellReplyMarkdown(nodes.lastReplyText, "");
    applyReplyTextPresentation(nodes.lastReplyText, { text: "", stub: false });
  } else if (nodes.lastReply) {
    renderShellReplyMarkdown(nodes.lastReply, "");
    applyReplyTextPresentation(nodes.lastReply, { text: "", stub: false });
  }
  renderShellReplyMedia(nodes.lastReplyMedia, [], state.agentId);
  setReplyPanelStreaming(false);
  shellDialog.syncLiveReplySlot?.();
  resetAgentActivitySteps();
}

function resolveAssistantMessageKey(message, body) {
  return String(message?.id || message?.streamId || body.slice(0, 120));
}

function markAssistantReplyHandled(message, body, { streamTts = false } = {}) {
  const key = resolveAssistantMessageKey(message, body);
  lastHandledAssistantId = key;
  if (message?.streamId) lastHandledStreamId = String(message.streamId);
  if (streamTts || message?.streamId) lastStreamHandledBody = body;
}

function shouldSkipAssistantSpeech(message) {
  return Boolean(shellSession?.isReplyAlreadySpoken(message));
}

function usesStreamingReplyTts() {
  return !isReadingTtsMode();
}

function shouldPlayMessageTts(message = {}) {
  if (!state.settings?.ttsEnabled) return false;
  if (!shouldPlayReplyTts(message)) return false;
  if (shouldSkipAssistantSpeech(message)) return false;
  if (usesStreamingReplyTts()) {
    if (state.assistantStream && !state.assistantStream.finalized) return false;
    if (state.streamTtsActive || state.streamTtsQueue.length) return false;
    const streamId = String(message?.streamId || message?.id || "").trim();
    if (streamId.startsWith("qwenpaw-")) return false;
  }
  return true;
}

function shouldShowTypingActivity(rawText, displayText) {
  if (!String(displayText || "").trim()) return false;
  if (!hasTtsPrompt()) return true;
  return hasVoiceEndDelimiter(rawText);
}

function syncAgentActivityFromPhrase(phrase = "", metrics = "") {
  const text = String(phrase || "").trim();
  if (!text) return;
  let kind = "run";
  if (/^🔧/.test(text) || String(metrics || "").trim()) kind = "tool";
  else if (/Размышляю/i.test(text)) kind = "reasoning";
  else if (/Печатает/i.test(text)) kind = "typing";
  else if (/Запускаю|Работаю/i.test(text)) kind = "run";
  pushAgentActivityStep({
    kind,
    phrase: text,
    tool: String(metrics || "").trim() || undefined
  });
  syncToolActivityFromStatus({ phrase: text, metrics, kind });
}

function syncToolActivityFromStatus({ phrase = "", metrics = "" } = {}) {
  if (!isShellAgentWorkActive()) return;
  const text = String(phrase || "").trim();
  const metricsText = String(metrics || "").trim();
  if (text || metricsText) shellDialog.setLiveActivityHint?.(text || metricsText);

  const tool = metricsText.replace(/^🔧\s*/, "");
  let inferredTool =
    tool ||
    (/^🔧\s*(.+?)(?:…|$)/u.exec(text)?.[1] || "").trim() ||
    (/^✓\s*(.+)$/u.exec(text)?.[1] || "").trim();
  if (!inferredTool) {
    const known = text.match(
      /\b(WebSearch|WebFetch|Bash|Read|Write|Edit|Grep|Glob|Task|NotebookEdit|Skill)\b/i
    );
    if (known) inferredTool = known[1];
  }
  if (!inferredTool && /web\s*search|поиск/i.test(text)) inferredTool = "WebSearch";
  if (!inferredTool && /web\s*fetch|fetch/i.test(text)) inferredTool = "WebFetch";
  if (!inferredTool && /\bbash\b|команд/i.test(text)) inferredTool = "Bash";
  if (!inferredTool) return;
  const phase = /^✓/.test(text) ? "end" : "start";
  shellDialog.upsertToolActivity?.({
    streamId: state.activeAgentStreamId || state.assistantStream?.id || "",
    kind: "tool",
    phase,
    tool: inferredTool,
    toolId: inferredTool,
    phrase: text,
    status: phase === "end" ? "ok" : "running"
  });
}

function startPipelineStatusPoll() {
  stopPipelineStatusPoll();
  pipelineStatusPollTimer = window.setInterval(() => {
    if (!isShellAgentWorkActive()) {
      stopPipelineStatusPoll();
      return;
    }
    void refreshStatus({ timeoutMs: 4000 }).catch(() => {});
  }, 500);
}

function stopPipelineStatusPoll() {
  if (!pipelineStatusPollTimer) return;
  clearInterval(pipelineStatusPollTimer);
  pipelineStatusPollTimer = 0;
}

function inferToolActivityPayload(payload = {}) {
  const activity = normalizeAgentActivityPayload(payload);
  const phrase = String(activity.phrase || "").trim();
  const metrics = String(payload.metrics || state.shellState?.metrics || "").trim();
  let tool = String(activity.tool || metrics || "").trim();
  if (!tool && /^🔧\s*(.+?)(?:…|$)/u.test(phrase)) {
    tool = phrase.replace(/^🔧\s*/, "").replace(/…+$/u, "").trim();
  }
  if (!tool && /^✓\s*(.+)$/u.test(phrase)) {
    tool = phrase.replace(/^✓\s*/, "").trim();
  }
  if (!tool && phrase) {
    const known = phrase.match(
      /\b(WebSearch|WebFetch|Bash|Read|Write|Edit|Grep|Glob|Task|NotebookEdit|Skill)\b/i
    );
    if (known) tool = known[1];
  }
  if (!tool) return null;
  return {
    ...activity,
    kind: "tool",
    tool,
    toolId: String(activity.toolId || tool).trim() || tool,
    phase: activity.phase || (/^✓/.test(phrase) ? "end" : "start"),
    status: activity.status || (/^✓/.test(phrase) ? "ok" : "running")
  };
}

function normalizeActivityStepLabel(payload = {}) {
  const kind = String(payload.kind || "").trim();
  const tool = String(payload.tool || "").trim();
  const phrase = String(payload.phrase || "")
    .trim()
    .replace(/^🔧\s*/, "")
    .replace(/…+$/u, "")
    .trim();
  if (kind === "tool" && tool) return tool;
  if (phrase) return phrase;
  if (kind === "reasoning") return "Размышляю";
  if (kind === "typing") return "Печатает";
  return "";
}

function hideAgentActivityPanel() {
  const wrap = nodes.agentActivity;
  if (!wrap) return;
  wrap.classList.add("hidden");
  wrap.hidden = true;
  wrap.setAttribute("aria-hidden", "true");
  if (nodes.agentActivityList) nodes.agentActivityList.replaceChildren();
}

function renderAgentActivitySteps() {
  if (!agentActivitySteps.length) {
    hideAgentActivityPanel();
    return;
  }

  const phase = resolveDisplayPhase(state.shellState?.phase || "waiting");
  if (phase !== "thinking" && phase !== "speaking") {
    hideAgentActivityPanel();
    return;
  }

  hideAgentActivityPanel();

  const active = agentActivitySteps.find((step) => step.active);
  if (!active) return;
  const label = String(active.label || "").trim();
  if (!label || state.ttsPaused || !nodes.phaseLabel) return;
  nodes.phaseLabel.textContent = label;
  nodes.phaseLabel.classList.remove("is-idle", "is-ready", "is-active", "is-busy", "is-speaking", "is-typing");
  const isTyping = active.kind === "typing" || /печатает/i.test(label);
  nodes.phaseLabel.classList.add(isTyping ? "is-typing" : "is-busy");
}

function bindComposeReadyStatus() {
  const onComposeInteract = () => syncComposeReadyStatus();
  nodes.message?.addEventListener("focus", onComposeInteract);
  nodes.message?.addEventListener("blur", () => {
    window.setTimeout(syncComposeReadyStatus, 0);
  });
  const composePanel = document.querySelector(".shell-compose-panel, #shell-compose-dock");
  composePanel?.addEventListener("focusin", onComposeInteract);
  composePanel?.addEventListener("focusout", () => {
    window.setTimeout(syncComposeReadyStatus, 0);
  });
}

function resetAgentActivitySteps() {
  agentActivitySteps = [];
  agentActivityTypingAdded = false;
  renderAgentActivitySteps();
}

function finalizeAgentActivitySteps() {
  resetAgentActivitySteps();
}

function pushAgentActivityStep(payload = {}) {
  if (payload.phase === "end") {
    const tool = String(payload.tool || "").trim();
    if (tool) {
      for (let i = agentActivitySteps.length - 1; i >= 0; i -= 1) {
        const step = agentActivitySteps[i];
        if (step.kind === "tool" && step.label === tool) {
          step.active = false;
          renderAgentActivitySteps();
          break;
        }
      }
    }
    return;
  }

  const kind = String(payload.kind || "run").trim() || "run";
  const label = normalizeActivityStepLabel({ ...payload, kind });
  if (!label) return;

  const last = agentActivitySteps[agentActivitySteps.length - 1];
  if (last && last.label === label && last.kind === kind) {
    for (const step of agentActivitySteps) step.active = false;
    last.active = true;
    renderAgentActivitySteps();
    return;
  }

  for (const step of agentActivitySteps) step.active = false;
  agentActivitySteps.push({
    kind,
    label,
    tool: String(payload.tool || "").trim() || undefined,
    active: true,
    at: Date.now()
  });
  if (agentActivitySteps.length > 14) agentActivitySteps = agentActivitySteps.slice(-14);
  renderAgentActivitySteps();
}

function formatStreamWaitDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return "0 с";
  const sec = n / 1000;
  if (sec < 10) {
    const rounded = Math.round(sec * 10) / 10;
    return `${String(rounded).replace(".", ",")} с`;
  }
  return `${Math.round(sec)} с`;
}

function updateStreamWaitLabel() {
  if (!nodes.lastReplyWait || !streamWaitStartedAt) return;
  const elapsed = Date.now() - streamWaitStartedAt;
  nodes.lastReplyWait.textContent = `Ждём ${formatStreamWaitDuration(elapsed)}`;
  syncToolActivityFromStatus({
    phrase: state.shellState?.phrase || "",
    metrics: state.shellState?.metrics || ""
  });
}

function startStreamWaitTimer() {
  stopStreamWaitTimer();
  streamWaitStartedAt = Date.now();
  if (!nodes.lastReplyWait) return;
  nodes.lastReplyWait.classList.remove("hidden");
  updateStreamWaitLabel();
  streamWaitTimer = window.setInterval(updateStreamWaitLabel, 200);
}

function stopStreamWaitTimer() {
  if (streamWaitTimer) {
    clearInterval(streamWaitTimer);
    streamWaitTimer = 0;
  }
  streamWaitStartedAt = 0;
  if (!nodes.lastReplyWait) return;
  nodes.lastReplyWait.classList.add("hidden");
  nodes.lastReplyWait.textContent = "";
}

function setReplyPanelStreaming(active) {
  nodes.replyPanel?.classList.toggle("is-streaming", Boolean(active));
  if (active) {
    shellDialog.clearLiveStreamTools?.();
    shellDialog.setLiveActivityHint?.("Запускаю…");
    startStreamWaitTimer();
    startPipelineStatusPoll();
  } else {
    stopStreamWaitTimer();
    stopPipelineStatusPoll();
    shellDialog.renderLiveToolStrip?.();
    shellDialog.tryApplyPendingScrollRestore?.();
  }
  syncCompactQa();
}

function beginAssistantStream({ streamId } = {}) {
  shellSession?.resetStreamRenderState();
  resetAgentActivitySteps();
  state.assistantStream = {
    id: String(streamId || `local-${Date.now()}`),
    text: "",
    spokenText: "",
    spokenParts: [],
    done: false,
    finalized: false
  };
  state.activeAgentStreamId = state.assistantStream.id;
  rememberAgentStreamId(state.activeAgentStreamId);
  state.streamTtsCursor = 0;
  state.streamTtsQueue = [];
  state.streamTtsVoiceEnded = false;
  if (queueStreamSpeech._timer) {
    clearTimeout(queueStreamSpeech._timer);
    queueStreamSpeech._timer = 0;
  }
  lastStreamHandledBody = "";
  lastHandledStreamId = "";
  setReplyPanelStreaming(true);
  shellDialog.syncLiveReplySlot?.();
  shellDialog.renderLiveToolStrip?.();
  if (nodes.lastReplyText) {
    nodes.lastReplyText.classList.remove("shell-md");
    nodes.lastReplyText.textContent = "…";
  }
  pushAgentActivityStep({ kind: "run", phrase: "Запускаю…" });
  renderPhase("thinking", "Запускаю…");
  syncCompactQa();
}

function renderStreamingAssistantText(text) {
  const value = String(text || "");
  if (!nodes.lastReplyText) return;
  nodes.lastReplyText.classList.remove("shell-reply-text--stub");
  nodes.lastReplyText.dataset.replyKind = "stream";
  if (!value) {
    renderShellReplyMarkdown(nodes.lastReplyText, "…");
    return;
  }
  renderShellReplyBody(nodes.lastReplyText, value);
  shellDialog.updateScrollProgress?.();
  shellDialog.onReplyRendered(value);
  syncCompactQa();
  if (state.assistantStream && !state.assistantStream.finalized) {
    syncHeroAvatarVisuals(state.shellState?.phase || "thinking", {
      updateLabel: true,
      phrase: nodes.phaseLabel?.textContent || ""
    });
  }
}

const STREAM_TTS_MERGE = { maxChars: 320, maxParts: 4 };
const STREAM_TTS_MERGE_FLUSH = { maxChars: 2000, maxParts: 32 };

function prepareTtsStreamChunk(text) {
  let speech = String(text || "").trim();
  if (!speech) return "";
  if (state.settings?.ttsStripEmoji === true) {
    speech = speech.replace(/\p{Extended_Pictographic}/gu, " ").replace(/\s+/g, " ").trim();
  }
  return truncateForShellTts(speech);
}

function queueStreamSpeech(fullBody, { flush = false } = {}) {
  if (isReadingTtsMode()) return;
  if (state.streamTtsVoiceEnded && !flush) return;
  if (!canPlayTts()) return;
  if (!state.settings?.ttsEnabled) return;

  const run = () => {
    queueStreamSpeech._timer = 0;
    const speech = hasTtsPrompt()
      ? prepareTtsStreamChunk(extractStreamingTtsBody(fullBody))
      : buildSpeechPayloadSync(fullBody);
    if (!speech) return;

    if (hasTtsPrompt() && hasVoiceEndDelimiter(fullBody)) {
      state.streamTtsVoiceEnded = true;
    }

    const { sentences, cursor } = pullSpeechSentences(speech, state.streamTtsCursor);
    if (!sentences.length && cursor === state.streamTtsCursor) return;

    state.streamTtsCursor = cursor;
    const pending = [];
    for (const sentence of sentences) {
      const chunk = String(sentence || "").trim();
      if (!chunk) continue;
      if (
        !flush &&
        pending.length === 0 &&
        chunk.length < 12 &&
        !hasVoiceEndDelimiter(fullBody)
      ) {
        continue;
      }
      pending.push(chunk);
    }
    const mergeOpts = flush ? STREAM_TTS_MERGE_FLUSH : STREAM_TTS_MERGE;
    for (const chunk of mergeSpeechStreamChunks(pending, mergeOpts)) {
      state.streamTtsQueue.push(chunk);
    }
    if (state.streamTtsQueue.length) void drainStreamTtsQueue();
  };

  if (flush) {
    if (queueStreamSpeech._timer) {
      clearTimeout(queueStreamSpeech._timer);
      queueStreamSpeech._timer = 0;
    }
    run();
    return;
  }

  if (queueStreamSpeech._timer) clearTimeout(queueStreamSpeech._timer);
  queueStreamSpeech._timer = window.setTimeout(run, 90);
}
queueStreamSpeech._timer = 0;

async function synthesizeStreamTtsChunk(text) {
  const payload = String(text || "").trim();
  if (!payload || !canPlayTts()) return null;
  if (getTtsEngine() === "browser" || !ttsPlayer?.synthesize) return null;
  try {
    const prepared = await ttsPlayer.synthesize(payload, { engine: getTtsEngine() });
    return prepared?.ok ? prepared : null;
  } catch {
    return null;
  }
}

async function speakStreamChunk(text, prepared = null) {
  const payload = String(text || "").trim();
  if (!payload || !canPlayTts()) return;

  state.speaking = true;
  updateTtsControlsUi("speaking");
  renderPhase("speaking", "Озвучиваю…", state.shellState?.metrics || "");

  try {
    if (prepared?.ok && ttsPlayer?.playPrepared) {
      const result = await ttsPlayer.playPrepared(prepared, {
        onPhase() {
          renderPhase("speaking", "Озвучиваю…", state.shellState?.metrics || "");
        }
      });
      if (result?.ok !== false && result) shellDialog.clearError();
    } else {
      await playTtsPayload(payload, { allowBrowserFallback: false, streamChunk: true });
      shellDialog.clearError();
    }
  } catch {
    // Не прерываем очередь и не переключаемся на Web Speech — иначе голос обрывается.
  } finally {
    if (!state.streamTtsActive && !state.streamTtsQueue.length) {
      state.speaking = false;
      updateTtsControlsUi("waiting");
    }
  }
}

async function drainStreamTtsQueue() {
  drainStreamTtsQueue._chain = (drainStreamTtsQueue._chain || Promise.resolve()).then(async () => {
    state.streamTtsActive = true;
    updateTtsControlsUi("speaking");
    let prepared = null;
    try {
      while (state.streamTtsQueue.length) {
        await waitWhileTtsPaused();
        if (!state.streamTtsQueue.length) break;
        const chunk = state.streamTtsQueue.shift();
        if (!prepared || prepared.text !== chunk) {
          prepared = await synthesizeStreamTtsChunk(chunk);
        }
        const nextChunk = state.streamTtsQueue[0];
        const prefetch = nextChunk
          ? synthesizeStreamTtsChunk(nextChunk).catch(() => null)
          : null;
        await speakStreamChunk(chunk, prepared);
        prepared = prefetch ? await prefetch : null;
      }
    } finally {
      state.streamTtsActive = false;
      if (!state.streamTtsQueue.length) {
        state.speaking = false;
      }
      updateTtsControlsUi(state.shellState?.phase || "waiting");
    }
  });
  return drainStreamTtsQueue._chain;
}

function finalizeAssistantStream(message) {
  const stream = state.assistantStream;
  const streamId = String(message?.streamId || message?.id || stream?.id || "");
  const rawBody = String(stream?.text || message?.body || "").trim();
  if (!rawBody) return false;
  if (stream?.finalized && stream.id === streamId) return true;

  const spokenFromMessage = String(message?.spokenText || stream?.spokenText || "").trim();
  let spokenParts = Array.isArray(message?.spokenParts)
    ? message.spokenParts
    : Array.isArray(stream?.spokenParts)
      ? stream.spokenParts
      : [];
  let body = rawBody;
  let spokenText = spokenFromMessage;
  if (hasTtsPrompt()) {
    const parsed = parseDualReply(rawBody);
    if (parsed.parsed) {
      body = parsed.body ?? "";
      if (!spokenParts.length && parsed.spokenParts?.length) spokenParts = parsed.spokenParts;
      if (!spokenText) spokenText = String(parsed.spoken || "").trim();
    }
  }
  if (!spokenParts.length && spokenText) spokenParts = [spokenText];

  state.assistantStream = { id: streamId, text: body, spokenText, spokenParts, done: true, finalized: true };
  setReplyPanelStreaming(false);
  shellDialog.finalizeRunningTools?.();
  shellDialog.syncLiveReplySlot?.();
  shellSession?.flushStreamingRender(renderStreamingAssistantText);
  renderShellReply({ ...message, body, spokenText, spokenParts });
  shellDialog.onAgentReply(body);
  void shellDialog.refreshHistory?.().then(() => shellDialog.syncLiveReplySlot?.());
  finalizeAgentActivitySteps();
  shellSession?.markReplyDisplayed({ ...message, body, streamId });
  markAssistantReplyHandled({ ...message, body, streamId }, body, { streamTts: true });

  state.assistantStream = null;
  releaseMessagePipeline();

  if (state.settings?.ttsEnabled && shouldPlayReplyTts(message) && !state.messageStopped) {
    const parts = spokenParts
      .map((part) => prepareTtsStreamChunk(String(part || "").trim()))
      .filter(Boolean);
    if (!parts.length) {
      const fallback = prepareTtsStreamChunk(buildSpeechPayloadSync(body));
      if (fallback) parts.push(fallback);
    }
    if (parts.length) {
      lastSpokenBody = parts.join("\0");
      shellSession?.markReplySpoken({ ...message, body, streamId });
      void speakTextParts(parts, {
        ttsClientId: message.ttsClientId,
        sourceMessage: { ...message, body, streamId }
      });
    }
  }
  return true;
}

let messagePipelineWatchdog = 0;

function armMessagePipelineWatchdog() {
  if (messagePipelineWatchdog) window.clearTimeout(messagePipelineWatchdog);
  messagePipelineWatchdog = window.setTimeout(() => {
    messagePipelineWatchdog = 0;
    recoverStuckMessagePipeline("watchdog");
  }, 90000);
}

function disarmMessagePipelineWatchdog() {
  if (!messagePipelineWatchdog) return;
  window.clearTimeout(messagePipelineWatchdog);
  messagePipelineWatchdog = 0;
}

function releaseMessagePipeline() {
  disarmMessagePipelineWatchdog();
  stopPipelineStatusPoll();
  state.messagePipelineBusy = false;
  state.processingMessage = "";
  state.activeAgentStreamId = "";
  renderMessageQueue();
  updateSendButtonLabel();
  shellSession?.releaseSessionUiLock();
  void drainOutboundQueue();
}

function recoverStuckMessagePipeline(reason = "") {
  if (!state.messagePipelineBusy && !state.processingMessage) return false;
  if (isTtsPlaybackActive()) return false;

  const stream = state.assistantStream;
  const streaming = Boolean(stream && !stream.finalized);
  const streamHasText = Boolean(String(stream?.text || "").trim());
  const serverPhase = state.shellState?.phase || "waiting";

  // Зависло на «Запускаю…» — stream открыт, но текста ещё нет.
  if (streaming && !streamHasText) {
    shellLog("message", `Empty stream reset${reason ? `: ${reason}` : ""}`);
    setReplyPanelStreaming(false);
    state.assistantStream = null;
    releaseMessagePipeline();
    renderPhase("waiting", heroIdlePhrase(), state.shellState?.metrics || "");
    return true;
  }

  if (streaming && streamHasText) return false;

  // Сервер уже waiting, а клиентский pipeline ещё busy — типично после reload или пропущенных SSE.
  if (serverPhase === "waiting" || serverPhase === "disabled") {
    shellLog("message", `Pipeline reset${reason ? `: ${reason}` : ""}`);
    state.messageStopped = false;
    releaseMessagePipeline();
    renderPhase("waiting", heroIdlePhrase(), state.shellState?.metrics || "");
    return true;
  }

  return false;
}

async function syncShellReplyAfterConnect(reason = "connect") {
  if (!state.agentId) return;
  try {
    const payload = await refreshStatus({
      sync: usesQwenPawTarget(state.settings?.messageTarget || nodes.messageTarget?.value || "qwenpaw"),
      timeoutMs: 20000
    });
    const latest = payload?.latestAgentMessage;
    if (
      isShellAgentWorkActive() &&
      latest?.body &&
      !shellSession?.isReplyAlreadyDisplayed(latest)
    ) {
      if (state.assistantStream && !state.assistantStream.finalized) {
        finalizeAssistantStream(latest);
      } else {
        await handleAssistantMessage(latest);
      }
      return;
    }
    recoverStuckMessagePipeline(reason);
    if (!isShellAgentWorkActive() && (payload?.state?.phase || "waiting") === "waiting") {
      renderPhase("waiting", heroIdlePhrase(), payload?.state?.metrics || "");
    }
  } catch (error) {
    shellLog("error", "syncShellReplyAfterConnect failed", error.message);
    recoverStuckMessagePipeline(`${reason} error`);
  }
}

function queuePhraseSuffix() {
  const n = outboundQueue.length;
  return n > 0 ? ` · в очереди: ${n}` : "";
}

function composeSendShortcutLabel() {
  return /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "") ? "⌘↵" : "Ctrl+↵";
}

function updateSendButtonLabel() {
  if (!nodes.sendBtn) return;
  const draft = String(nodes.message?.value || "").trim();
  const shortcut = composeSendShortcutLabel();
  const messagingReady = canUseShellMessaging();
  let label = "Отправить";
  if (state.messagePipelineBusy && draft) {
    label = outboundQueue.length ? `В очередь · ${outboundQueue.length}` : "В очередь";
  }
  const kbd = nodes.sendBtn.querySelector(".shell-compose-send-kbd");
  if (kbd) kbd.textContent = shortcut;
  nodes.sendBtn.title = messagingReady
    ? state.messagePipelineBusy && draft
      ? label
      : `${label} (${shortcut})`
    : shellAgentLockHint();
  nodes.sendBtn.setAttribute("aria-label", label);
  nodes.sendBtn.dataset.sendMode = state.messagePipelineBusy && draft ? "queue" : "send";
  nodes.sendBtn.disabled = !messagingReady;
  const stopActive = Boolean(
    state.messagePipelineBusy ||
      state.processingMessage ||
      (state.assistantStream && !state.assistantStream.finalized) ||
      state.streamTtsActive ||
      state.streamTtsQueue.length ||
      state.speaking
  );
  if (nodes.sendStopBtn) {
    nodes.sendStopBtn.disabled = !messagingReady || !stopActive;
    if (state.speaking || state.streamTtsActive || state.streamTtsQueue.length) {
      nodes.sendStopBtn.title = "Остановить озвучку";
      nodes.sendStopBtn.setAttribute("aria-label", "Остановить озвучку");
    } else {
      nodes.sendStopBtn.title = "Остановить ответ агента";
      nodes.sendStopBtn.setAttribute("aria-label", "Остановить ответ агента");
    }
  }
  const heroCancelActive = Boolean(
    state.messagePipelineBusy ||
      state.processingMessage ||
      (state.assistantStream && !state.assistantStream.finalized)
  );
  if (nodes.heroCancelSend) {
    nodes.heroCancelSend.disabled = !heroCancelActive;
  }
}

async function stopActiveMessage() {
  const heroCancelActive = Boolean(
    state.messagePipelineBusy ||
      state.processingMessage ||
      (state.assistantStream && !state.assistantStream.finalized)
  );
  const stopActive = Boolean(
    state.messagePipelineBusy ||
      state.processingMessage ||
      (state.assistantStream && !state.assistantStream.finalized) ||
      state.streamTtsActive ||
      state.streamTtsQueue.length ||
      state.speaking
  );
  if (!stopActive && !heroCancelActive) return;
  if (nodes.sendStopBtn?.disabled && nodes.heroCancelSend?.disabled) return;
  const stoppingSpeech = Boolean(state.speaking || state.streamTtsActive || state.streamTtsQueue.length);
  const stoppingGeneration = Boolean(
    state.messagePipelineBusy ||
      state.processingMessage ||
      (state.assistantStream && !state.assistantStream.finalized)
  );
  state.messageStopped = true;
  bumpTtsPlayback();
  shellSession?.resetStreamRenderState();
  messageSendAbortController?.abort();
  messageSendAbortController = null;
  outboundQueue.length = 0;
  state.queueEditingId = "";
  state.processingMessage = "";
  if (state.assistantStream && !state.assistantStream.finalized) {
    setReplyPanelStreaming(false);
    state.assistantStream = null;
  }
  state.streamTtsQueue = [];
  state.streamTtsCursor = 0;
  finalizeAgentActivitySteps();
  stopBrowserTts({ notifyServer: true, resetPhase: false, broadcast: true });
  renderMessageQueue();
  releaseMessagePipeline();
  const phrase = stoppingSpeech && !stoppingGeneration ? "Озвучка остановлена" : "Остановлено";
  await patchShellState({ phase: "waiting", phrase }).catch(() => {});
  renderPhase("waiting", heroIdlePhrase(), state.shellState?.metrics || "");
  updateSendButtonLabel();
  clearPendingReplyTtsClientId();
  shellSession?.setSessionUiLocked(false);
}

function removeOutboundMessage(id) {
  if (state.queueEditingId === id) state.queueEditingId = "";
  const idx = outboundQueue.findIndex((item) => item.id === id);
  if (idx >= 0) outboundQueue.splice(idx, 1);
  renderMessageQueue();
}

function startEditOutboundMessage(id) {
  state.queueEditingId = id;
  renderMessageQueue();
  const field = nodes.messageQueueList?.querySelector(`[data-queue-edit="${id}"]`);
  field?.focus();
  if (field instanceof HTMLTextAreaElement) {
    field.setSelectionRange(field.value.length, field.value.length);
  }
}

function saveEditOutboundMessage(id, nextText) {
  const text = String(nextText || "").trim();
  const item = outboundQueue.find((entry) => entry.id === id);
  if (!item) {
    state.queueEditingId = "";
    renderMessageQueue();
    return;
  }
  if (!text) {
    removeOutboundMessage(id);
    return;
  }
  item.text = text;
  state.queueEditingId = "";
  renderMessageQueue();
}

function cancelEditOutboundMessage() {
  state.queueEditingId = "";
  renderMessageQueue();
}

function moveOutboundMessageToDraft(id) {
  const item = outboundQueue.find((entry) => entry.id === id);
  if (!item || !nodes.message) return;
  setComposeMessageValue(item.text);
  removeOutboundMessage(id);
  nodes.message.focus();
}

function createQueueAction(label, { variant = "", onClick, ariaLabel = label, compact = false } = {}) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = ["shell-message-queue-action", compact ? "shell-message-queue-action--compact" : "", variant]
    .filter(Boolean)
    .join(" ");
  btn.textContent = label;
  btn.setAttribute("aria-label", ariaLabel);
  btn.addEventListener("click", onClick);
  return btn;
}

function renderMessageQueue() {
  const hasActive = Boolean(state.processingMessage);
  const hasQueued = outboundQueue.length > 0;
  const showQueue = hasActive || hasQueued;

  nodes.messageQueue?.classList.toggle("hidden", !showQueue);
  nodes.messageQueueActive?.classList.toggle("hidden", !hasActive);
  if (nodes.messageQueueActiveText) {
    nodes.messageQueueActiveText.textContent = state.processingMessage || "";
  }
  if (nodes.messageQueueCount) {
    nodes.messageQueueCount.textContent = hasQueued ? `+${outboundQueue.length}` : "";
  }

  if (!nodes.messageQueueList) {
    updateSendButtonLabel();
    return;
  }

  nodes.messageQueueList.innerHTML = "";
  outboundQueue.forEach((item, index) => {
    const li = document.createElement("li");
    const isEditing = state.queueEditingId === item.id;
    li.className = `shell-message-queue-item${isEditing ? " is-editing" : ""}`;

    const head = document.createElement("div");
    head.className = "shell-message-queue-item-head";

    const order = document.createElement("span");
    order.className = "shell-message-queue-index";
    order.textContent = String(index + 1);

    head.append(order);

    const body = document.createElement("div");
    body.className = "shell-message-queue-item-body";

    if (isEditing) {
      const editor = document.createElement("textarea");
      editor.className = "shell-message-queue-edit";
      editor.dataset.queueEdit = item.id;
      editor.value = item.text;
      editor.rows = 2;
      editor.setAttribute("aria-label", "Редактирование сообщения в очереди");
      editor.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          cancelEditOutboundMessage();
        }
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          saveEditOutboundMessage(item.id, editor.value);
        }
      });

      body.append(editor);

      const actions = document.createElement("div");
      actions.className = "shell-message-queue-item-actions";
      actions.append(
        createQueueAction("✓", {
          variant: "shell-message-queue-action--save",
          compact: true,
          ariaLabel: "Сохранить",
          onClick: () => saveEditOutboundMessage(item.id, editor.value)
        }),
        createQueueAction("✕", {
          variant: "shell-message-queue-action--muted",
          compact: true,
          ariaLabel: "Отмена",
          onClick: cancelEditOutboundMessage
        })
      );

      li.append(head, body, actions);
    } else {
      const text = document.createElement("p");
      text.className = "shell-message-queue-item-text";
      text.textContent = item.text;
      text.title = item.text;
      text.addEventListener("dblclick", () => startEditOutboundMessage(item.id));
      body.append(text);

      const actions = document.createElement("div");
      actions.className = "shell-message-queue-item-actions";
      actions.append(
        createQueueAction("✎", {
          compact: true,
          ariaLabel: "Изменить",
          onClick: () => startEditOutboundMessage(item.id)
        }),
        createQueueAction("↩", {
          variant: "shell-message-queue-action--muted",
          compact: true,
          ariaLabel: "Вернуть в поле ввода",
          onClick: () => moveOutboundMessageToDraft(item.id)
        }),
        createQueueAction("✕", {
          variant: "shell-message-queue-action--danger",
          compact: true,
          ariaLabel: "Удалить",
          onClick: () => removeOutboundMessage(item.id)
        })
      );

      li.append(head, body, actions);
    }

    nodes.messageQueueList.append(li);
  });
  updateSendButtonLabel();

  if (state.queueEditingId) {
    const field = nodes.messageQueueList.querySelector(`[data-queue-edit="${state.queueEditingId}"]`);
    field?.focus();
  }
}

async function drainOutboundQueue() {
  if (state.messagePipelineBusy || !outboundQueue.length) return;
  const next = outboundQueue.shift();
  renderMessageQueue();
  if (!next?.text) return;
  await sendMessageDirect(next.text, { voice: Boolean(next.voice) });
}

function syncWaitingUiAfterPlayback() {
  if (isTtsPlaybackActive()) return;
  if (state.micActive || state.pttHeld) return;
  if (state.messagePipelineBusy) return;
  if (state.assistantStream && !state.assistantStream.finalized) return;
  const phrase = heroIdlePhrase();
  const metrics = state.shellState?.metrics || "";
  if (state.shellState?.phase === "speaking") {
    state.shellState = { ...state.shellState, phase: "waiting", phrase: HERO_IDLE_PHRASE };
  }
  renderPhase("waiting", phrase, metrics);
}

async function finishStreamTtsWhenIdle({ sourceMessage = null, spokenText = "" } = {}) {
  try {
    await drainStreamTtsQueue();
    const speech = String(spokenText || "").trim();
    if (speech) rememberLastTtsSpoken(speech);
    if (sourceMessage) shellSession?.markReplySpoken(sourceMessage);
    state.pendingReplyTtsClientId = "";
  } finally {
    state.speaking = false;
    state.ttsPaused = false;
    state.assistantStream = null;
    updateTtsControlsUi("waiting");
    if (!state.pttHeld && !state.micActive) {
      await patchShellState({ phase: "waiting", phrase: HERO_IDLE_PHRASE }).catch(() => {});
    }
    syncWaitingUiAfterPlayback();
    releaseMessagePipeline();
  }
}

function normalizeAgentActivityPayload(payload = {}) {
  const root =
    payload?.activity && typeof payload.activity === "object" && !Array.isArray(payload.activity)
      ? payload.activity
      : payload;
  const tool = String(root.tool || "").trim();
  const phrase = String(root.phrase || "").trim();
  let kind = String(root.kind || "").trim().toLowerCase();
  if (!kind && tool) kind = "tool";
  if (kind !== "tool" && tool && (root.args != null || root.result != null || /^🔧|^✓/.test(phrase))) {
    kind = "tool";
  }
  return {
    ...root,
    streamId: String(root.streamId || payload.streamId || "").trim(),
    kind,
    phase: String(root.phase || "start").trim().toLowerCase(),
    tool,
    toolId: String(root.toolId || tool || "").trim(),
    args: root.args != null ? String(root.args) : "",
    result: root.result != null ? String(root.result) : "",
    status: String(root.status || "").trim().toLowerCase(),
    phrase,
    error: root.error
  };
}

function shouldShowAgentActivity(payload = {}) {
  if (isShellAgentWorkActive()) return true;
  const streamId = String(payload.streamId || "").trim();
  if (streamId && recentAgentStreamIds.has(streamId)) return true;
  const active = String(state.activeAgentStreamId || state.assistantStream?.id || "").trim();
  return Boolean(streamId && active && streamId === active);
}

function handleAgentActivity(payload = {}) {
  if (state.messageStopped) return;
  const activity = normalizeAgentActivityPayload(payload);
  if (activity.streamId) rememberAgentStreamId(activity.streamId);

  const toolActivity =
    inferToolActivityPayload(payload) || (activity.kind === "tool" || activity.tool ? activity : null);
  if (toolActivity) {
    shellDialog.noteAgentActivity?.(toolActivity);
  } else if (isShellAgentWorkActive()) {
    shellDialog.noteAgentActivity?.(activity);
  }

  if (!shouldShowAgentActivity(activity)) return;

  pushAgentActivityStep(activity);
  const phrase = String(activity.phrase || "").trim();
  const tool = String(activity.tool || "").trim();
  const label = phrase || tool;
  if (!label) return;
  renderPhase("thinking", phrase || tool, tool || state.shellState?.metrics || "");
}

function applyAssistantActivity(payload = {}) {
  const activity = payload?.activity;
  if (!activity || typeof activity !== "object") return;
  handleAgentActivity(activity);
}

function handleAssistantDelta(payload) {
  if (state.messageStopped) return;
  const streamId = String(payload?.streamId || "").trim();
  const rawText = String(payload?.text ?? "");
  const done = Boolean(payload?.done);
  const spokenText = String(payload?.spokenText || "").trim();
  const spokenParts = Array.isArray(payload?.spokenParts) ? payload.spokenParts : [];

  if (!state.assistantStream) {
    beginAssistantStream({ streamId: streamId || undefined });
  } else if (streamId && state.assistantStream.id !== streamId) {
    if (String(state.assistantStream.id).startsWith("local-")) {
      state.assistantStream.id = streamId;
      state.activeAgentStreamId = streamId;
      rememberAgentStreamId(streamId);
    } else {
      beginAssistantStream({ streamId });
    }
  }

  state.assistantStream.text = done ? state.assistantStream.text || rawText : rawText;
  if (spokenText) state.assistantStream.spokenText = spokenText;
  if (spokenParts.length) state.assistantStream.spokenParts = spokenParts;
  state.assistantStream.done = done;
  const displayText = rawText;
  shellSession?.queueStreamingRender(displayText, renderStreamingAssistantText);
  applyAssistantActivity(payload);
  if (!done && shouldShowTypingActivity(rawText, displayText) && !agentActivityTypingAdded) {
    agentActivityTypingAdded = true;
    pushAgentActivityStep({ kind: "typing", phrase: "Печатает" });
  }

  if (done) {
    finalizeAssistantStream({
      streamId,
      id: streamId,
      body: state.assistantStream.text || rawText,
      spokenText,
      spokenParts,
      ttsClientId: payload.ttsClientId
    });
    state.shellState = {
      ...(state.shellState || {}),
      phase: "waiting",
      phrase: HERO_IDLE_PHRASE,
      metrics: isRuntimeMetricsLabel(state.shellState?.metrics) ? state.shellState.metrics : ""
    };
    const willSpeak =
      state.settings?.ttsEnabled &&
      shouldPlayReplyTts(payload) &&
      (state.speaking || state.streamTtsActive || state.streamTtsQueue.length);
    if (!willSpeak) {
      renderPhase("waiting", HERO_IDLE_PHRASE, state.shellState?.metrics || "");
    }
  } else if (shouldShowTypingActivity(rawText, displayText)) {
    if (state.streamTtsActive || state.speaking || state.streamTtsQueue.length) {
      renderPhase("speaking", "Озвучиваю…", state.shellState?.metrics || "");
    } else if (payload.activity?.phrase) {
      renderPhase(
        "thinking",
        payload.activity.phrase,
        payload.activity.tool || state.shellState?.metrics || ""
      );
    } else {
      renderPhase("thinking", "Печатает…", state.shellState?.metrics || "");
    }
  }
}

function getCameraConstraints() {
  const facing = nodes.cameraFacing?.value || state.settings?.cameraFacing || "user";
  const deviceId =
    facing === "device" ? String(nodes.cameraDevice?.value || state.settings?.cameraDeviceId || "").trim() : "";
  return {
    cameraFacing: facing === "device" ? "user" : facing,
    cameraDeviceId: deviceId
  };
}

function updateCameraDeviceField() {
  const useList = nodes.cameraFacing?.value === "device";
  nodes.cameraDeviceField?.classList.toggle("hidden", !useList);
}

async function refreshCameraDeviceList() {
  if (!nodes.cameraDevice) return;
  const devices = await shellCamera.listDevices();
  const current = state.settings?.cameraDeviceId || nodes.cameraDevice.value || "";
  nodes.cameraDevice.innerHTML = "";
  if (!devices.length) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Нет камер";
    nodes.cameraDevice.append(opt);
    return;
  }
  for (const device of devices) {
    const opt = document.createElement("option");
    opt.value = device.deviceId;
    opt.textContent = device.label;
    if (device.deviceId === current) opt.selected = true;
    nodes.cameraDevice.append(opt);
  }
}

function updateCameraUi(active) {
  nodes.cameraSnapshot?.classList.toggle("hidden", !active);
  nodes.watchCamera?.setAttribute("aria-pressed", active ? "true" : "false");
  if (active) setMediaDrawer("camera");
  else if (state.mediaMode === "camera") setMediaDrawer("");
}

async function applyCameraEnabled(enabled, { persist = false } = {}) {
  const want = Boolean(enabled);
  const constraints = getCameraConstraints();
  shellCamera.setConstraints(constraints);

  if (!want) {
    await shellCamera.stop();
    if (nodes.cameraEnabled) nodes.cameraEnabled.checked = false;
    updateCameraUi(false);
    return;
  }

  if (!shellCamera.isSupported()) {
    if (nodes.cameraEnabled) nodes.cameraEnabled.checked = false;
    if (nodes.cameraStatus) {
      nodes.cameraStatus.textContent = "Камера недоступна в этом браузере";
      nodes.cameraStage?.classList.remove("hidden");
    }
    updateCameraUi(false);
    return;
  }

  try {
    await shellCamera.setEnabled(true, constraints);
    await refreshCameraDeviceList();
    if (nodes.cameraEnabled) nodes.cameraEnabled.checked = true;
    updateCameraUi(true);
    if (persist) {
      await saveSettings({
        cameraEnabled: true,
        ...constraints
      });
    }
  } catch (error) {
    if (nodes.cameraEnabled) nodes.cameraEnabled.checked = false;
    updateCameraUi(false);
    renderPhase("waiting", error.message);
  }
}

async function uploadCameraSnapshot(kind = "speech") {
  const frame = shellCamera.captureFrame();
  if (!frame) return null;
  const data = await apiFetch("/api/shell/camera/speech-snapshot", {
    method: "POST",
    body: JSON.stringify({ ...frame, kind })
  });
  return data;
}

async function captureAndSendComposePhoto() {
  if (state.composeCameraBusy || state.messagePipelineBusy) return;
  if (!shellCamera.isSupported() && !nodes.composeCameraFile) {
    renderPhase("waiting", "Камера недоступна в этом браузере");
    return;
  }

  const httpsIssue = shellPermissionIssue();
  if (httpsIssue && !window.isSecureContext) {
    renderPhase("waiting", `Камера на iPhone нужен HTTPS · ${getShellHttpsUrl()}`);
    return;
  }

  state.composeCameraBusy = true;
  nodes.composeCameraStub?.classList.add("is-busy");
  nodes.composeCameraStub?.setAttribute("aria-busy", "true");

  const userText = String(nodes.message?.value || "").trim();
  const keepCameraActive = shellCamera.isActive() || Boolean(state.settings?.cameraEnabled);
  const facing = preferredComposeCameraFacing(state.settings);

  try {
    void unlockShellAudio();
    renderPhase("waiting", "Камера…");
    nodes.message?.blur();
    composeLayout?.resetViewport?.();

    let frame = null;
    try {
      const captured = await captureOneShotCameraFrame(shellCamera, nodes.cameraVideo, {
        facing,
        keepActive: keepCameraActive
      });
      frame = captured.frame;
      if (captured.startedHere) {
        updateCameraUi(keepCameraActive);
        if (nodes.cameraEnabled) nodes.cameraEnabled.checked = keepCameraActive;
      }
    } catch (streamError) {
      if (nodes.composeCameraFile) {
        try {
          frame = await openCameraFilePicker(nodes.composeCameraFile);
        } catch (pickError) {
          if (String(pickError?.message || pickError) === "cancelled") return;
          throw pickError;
        }
      } else {
        throw streamError;
      }
    }

    if (!frame?.dataUrl) {
      throw new Error("Не удалось получить снимок");
    }

    renderPhase("waiting", "Сохраняю снимок…");
    const meta = await apiFetch("/api/shell/camera/speech-snapshot", {
      method: "POST",
      body: JSON.stringify({ ...frame, kind: "manual" })
    });

    const body = buildComposeCameraMessage(userText, meta?.path);
    if (userText && nodes.message) {
      nodes.message.value = "";
      updateSendButtonLabel();
      void clearComposeDraft();
    }

    renderPhase("waiting", "Отправляю снимок…");
    await sendMessageDirect(body, { fromCompose: false });
  } catch (error) {
    const message = String(error?.message || error);
    if (message === "cancelled") return;
    if (message.includes("NotAllowed") || message.includes("доступ")) {
      renderPhase("waiting", "Нет доступа к камере — разрешите в браузере");
    } else {
      renderPhase("waiting", message || "Не удалось сделать снимок");
    }
  } finally {
    state.composeCameraBusy = false;
    nodes.composeCameraStub?.classList.remove("is-busy");
    nodes.composeCameraStub?.removeAttribute("aria-busy");
  }
}

async function uploadScreenSnapshot(kind = "speech") {
  const frame = shellScreen.captureFrame();
  if (!frame) return null;
  const data = await apiFetch("/api/shell/screen/speech-snapshot", {
    method: "POST",
    body: JSON.stringify({ ...frame, kind })
  });
  return data;
}

async function takeManualScreenshot() {
  if (shellScreen.isActive()) {
    const frame = shellScreen.captureFrame();
    if (frame) {
      renderShellReplyMedia(
        nodes.lastReplyMedia,
        [{ type: "image", src: frame.dataUrl, caption: "Снимок экрана" }],
        state.agentId
      );
      renderShellReplyMarkdown(nodes.lastReplyText, "Снимок экрана");
      await uploadScreenSnapshot("manual").catch(() => {});
      renderPhase(state.shellState?.phase || "waiting", "Снимок сохранён");
      return;
    }
  }

  if (shellCamera.isActive()) {
    const frame = shellCamera.captureFrame();
    if (frame) {
      renderShellReplyMedia(
        nodes.lastReplyMedia,
        [{ type: "image", src: frame.dataUrl, caption: "Кадр с камеры" }],
        state.agentId
      );
      renderShellReplyMarkdown(nodes.lastReplyText, "Кадр с камеры");
      await uploadCameraSnapshot("manual").catch(() => {});
      renderPhase(state.shellState?.phase || "waiting", "Кадр сохранён");
      return;
    }
  }

  renderPhase("waiting", "Сначала включите камеру 📷 или демонстрацию экрана 🖥");
}

function buildWindowSettingsPayload(overrides = {}) {
  const windowBackground = nodes.windowBackground?.value || "wallpaper";
  const windowTransparent =
    nodes.windowTransparent?.checked === true || windowBackground === "transparent";
  const compactDialogQa = settingsSave.isSectionDirty("window")
    ? nodes.compactDialogQa?.checked !== false
    : state.windowSettings?.compactDialogQa !== false;
  return {
    windowTopmost: nodes.topmost?.checked !== false,
    windowTransparent,
    windowBackground: windowTransparent ? "transparent" : windowBackground,
    windowCompact: isWindowCompactEnabled(),
    windowPetOverlay: nodes.windowPetOverlay?.checked === true,
    compactDialogQa,
    ...overrides
  };
}

function syncCompactSensorUi(compact = isWindowCompactEnabled()) {
  syncCompactSensorAvailability();
  if (!compact) {
    setCompactSensorScanning(false);
    return;
  }
  if (!isCompactSensorScanning()) {
    syncCompactSensorPhase(resolveDisplayPhase(nodes.agentAvatar?.dataset.phase || state.shellState?.phase || "waiting"));
  }
}

function isCompactSensorScanning() {
  return Boolean(nodes.compactSensor?.classList.contains("is-scanning"));
}

function syncCompactSensorPhase(phase, phrase = "") {
  const displayPhase = resolveDisplayPhase(phase);
  const heroState = resolveHeroAvatarState(phase);
  const sensor = nodes.compactSensor;
  const status = nodes.compactSensorStatus;
  if (!sensor || !status || !isWindowCompactEnabled()) return;
  if (isCompactSensorScanning()) return;

  sensor.dataset.phase = displayPhase;
  sensor.dataset.activity = resolveHeroSensorActivity(displayPhase, heroState);
  status.textContent = resolveHeroStatusLabel(phase, phrase);
  status.classList.remove("is-active", "is-busy", "is-speaking", "is-typing", "is-idle", "is-ready");
  status.classList.add(resolveHeroStatusBadgeClass(displayPhase, heroState));
}

function setCompactSensorScanning(active) {
  const sensor = nodes.compactSensor;
  const status = nodes.compactSensorStatus;
  if (!sensor) return;
  const on = Boolean(active);
  sensor.classList.toggle("is-holding", on);
  sensor.classList.toggle("is-scanning", on);
  if (!status || !isWindowCompactEnabled()) return;
  if (on) {
    sensor.dataset.activity = "listening";
    const voiceReady = sensor.dataset.voiceReady !== "0";
    status.textContent = voiceReady ? "Сканирование…" : "Сканирование… (демо)";
    status.classList.remove("is-busy", "is-speaking", "is-typing");
    status.classList.add("is-active");
    return;
  }
  syncCompactSensorPhase(sensor.dataset.phase || "waiting", nodes.phaseLabel?.textContent || "");
}

function beginCompactSensorVoice() {
  const sensor = nodes.compactSensor;
  if (!sensor || sensor.dataset.voiceReady === "0") return Promise.resolve(false);

  const mode = getVoiceInputMode();
  if (mode === "disabled") {
    return Promise.resolve(false);
  }
  if (isMessagePipelineActive()) {
    return Promise.resolve(false);
  }

  void unlockShellAudio();
  hapticTap();

  if (usesSidecarPtt(mode)) {
    if (!state.sidecarConnected) {
      return Promise.resolve(false);
    }
    return setPttHeldRemote(true)
      .then(() => true)
      .catch(() => false);
  }

  if (shellTapVoice && usesBrowserStt(mode)) {
    shellTapVoice.prepareSession();
    return shellTapVoice.startSession({ viaTap: true }).then((ok) => Boolean(ok));
  }

  return Promise.resolve(false);
}

function endCompactSensorHold() {
  const mode = getVoiceInputMode();
  if (usesSidecarPtt(mode)) {
    if (state.pttHeld) {
      void setPttHeldRemote(false).catch((error) => renderPhase("waiting", error.message));
    }
    return;
  }
  if (shellTapVoice && (state.micActive || state.micTapHeld || shellTapVoice.isTapHeld?.())) {
    shellTapVoice.stopSession();
  }
}

function syncCompactSensorAvailability() {
  const sensor = nodes.compactSensor;
  if (!sensor) return;
  const mode = getVoiceInputMode();
  const needsSidecar = voiceModeRequiresSidecar(mode) || (isVoiceGlobalListen() && (mode === "hold" || mode === "fn_button"));
  const voiceUnavailable =
    mode === "disabled" || (needsSidecar && !state.sidecarConnected);
  sensor.dataset.voiceReady = voiceUnavailable ? "0" : "1";
  sensor.setAttribute("aria-disabled", voiceUnavailable ? "true" : "false");
}

function initCompactSensor() {
  const sensor = nodes.compactSensor;
  if (!sensor) return;

  let pointerHeld = false;
  let keyboardHeld = false;

  const isHeld = () => pointerHeld || keyboardHeld;

  const syncScanningFromHold = () => {
    setCompactSensorScanning(isHeld());
  };

  const releaseHold = () => {
    if (!isHeld()) return;
    pointerHeld = false;
    keyboardHeld = false;
    setCompactSensorScanning(false);
    endCompactSensorHold();
  };

  const startHold = () => {
    setCompactSensorScanning(true);
    void beginCompactSensorVoice();
  };

  sensor.addEventListener("pointerdown", (event) => {
    if (pointerHeld) return;
    event.preventDefault();
    pointerHeld = true;
    try {
      sensor.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    startHold();
  });

  const onPointerRelease = (event) => {
    if (!pointerHeld) return;
    pointerHeld = false;
    try {
      sensor.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    setCompactSensorScanning(keyboardHeld);
    endCompactSensorHold();
  };

  sensor.addEventListener("pointerup", onPointerRelease);
  sensor.addEventListener("pointercancel", onPointerRelease);
  sensor.addEventListener("lostpointercapture", () => {
    if (pointerHeld) onPointerRelease({ pointerId: -1 });
  });

  sensor.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (keyboardHeld) return;
      keyboardHeld = true;
      startHold();
    }
  });

  sensor.addEventListener("keyup", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!keyboardHeld) return;
      keyboardHeld = false;
      syncScanningFromHold();
      endCompactSensorHold();
    }
  });
}

function syncCompactActionUi(compact = isWindowCompactEnabled()) {
  const pressed = compact ? "true" : "false";
  nodes.windowCompact?.setAttribute("aria-pressed", pressed);
  nodes.compactAction?.setAttribute("aria-pressed", pressed);
  nodes.agentAvatar?.setAttribute("title", compact ? "Выйти из компакта" : "Компактный режим");
  syncCompactSensorUi(compact);
  syncCompactQa();
}

function setWindowCompactMode(next) {
  const compact = Boolean(next);
  const nextSettings = {
    ...(state.windowSettings || {}),
    windowCompact: compact,
    compactDialogQa: isCompactDialogQaEnabled()
  };
  state.windowSettings = nextSettings;
  applyWindowAppearance(nextSettings);
  syncCompactActionUi(compact);
  if (compact) {
    setShellView("main");
    void shellDialog.refreshHistory?.().then(() => syncCompactQa());
  } else {
    syncCompactQa();
  }
  void saveWindowSettings(
    buildWindowSettingsPayload({
      windowCompact: compact,
      compactDialogQa: nextSettings.compactDialogQa
    })
  ).catch((error) => renderPhase("waiting", error.message));
}

function toggleCompactMode() {
  setWindowCompactMode(!isWindowCompactEnabled());
}

function exitCompactMode() {
  setWindowCompactMode(false);
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof Element)) return;
  if (target.closest("#shell-compact-exit") || target.closest("#shell-compact-brand")) {
    exitCompactMode();
  }
});

async function handleCameraSnapshotRequest(payload) {
  if (state.cameraSnapshotBusy) return;
  state.cameraSnapshotBusy = true;
  const requestId = String(payload?.requestId || "").trim();
  try {
    if (!requestId) return;
    if (!shellCamera.isActive()) {
      await applyCameraEnabled(true);
    }
    const frame = shellCamera.captureFrame();
    if (!frame) throw new Error("Камера не готова");
    await apiFetch("/api/shell/camera/snapshot/complete", {
      method: "POST",
      body: JSON.stringify({ requestId, ...frame })
    });
    renderShellReplyMedia(
      nodes.lastReplyMedia,
      [{ type: "image", src: frame.dataUrl, caption: payload?.reason || "Кадр для агента" }],
      state.agentId
    );
    renderPhase(state.shellState?.phase || "waiting", "Кадр отправлен агенту");
  } catch (error) {
    renderPhase("waiting", error.message);
  } finally {
    state.cameraSnapshotBusy = false;
  }
}

async function handleScreenSnapshotRequest(payload) {
  if (state.screenSnapshotBusy) return;
  state.screenSnapshotBusy = true;
  const requestId = String(payload?.requestId || "").trim();
  try {
    if (!requestId) return;
    if (!shellScreen.isActive()) {
      await applyScreenEnabled(true);
    }
    const frame = shellScreen.captureFrame();
    if (!frame) throw new Error("Демонстрация экрана не готова");
    await apiFetch("/api/shell/screen/snapshot/complete", {
      method: "POST",
      body: JSON.stringify({ requestId, ...frame })
    });
    renderShellReplyMedia(
      nodes.lastReplyMedia,
      [{ type: "image", src: frame.dataUrl, caption: payload?.reason || "Снимок экрана для агента" }],
      state.agentId
    );
    renderPhase(state.shellState?.phase || "waiting", "Снимок экрана отправлен агенту");
  } catch (error) {
    renderPhase("waiting", error.message);
  } finally {
    state.screenSnapshotBusy = false;
  }
}

function updateScreenUi(active) {
  nodes.screenSnapshot?.classList.toggle("hidden", !active);
  nodes.watchScreen?.setAttribute("aria-pressed", active ? "true" : "false");
  if (active) setMediaDrawer("screen");
  else if (state.mediaMode === "screen") setMediaDrawer("");
}

async function applyScreenEnabled(enabled, { persist = false } = {}) {
  if (!shellScreen.isSupported()) {
    if (nodes.screenEnabled) nodes.screenEnabled.checked = false;
    if (nodes.screenStatus) {
      nodes.screenStatus.textContent = "Демонстрация экрана недоступна в этом браузере";
      nodes.screenStage?.classList.remove("hidden");
    }
    return false;
  }
  try {
    await shellScreen.setEnabled(enabled);
    updateScreenUi(enabled);
    if (nodes.screenEnabled) nodes.screenEnabled.checked = enabled;
    if (persist && enabled) {
      await saveSettings({
        screenEnabled: true
      });
    }
    return enabled;
  } catch (error) {
    if (nodes.screenEnabled) nodes.screenEnabled.checked = false;
    updateScreenUi(false);
    renderPhase("waiting", error.message);
    return false;
  }
}

function onShellPhaseChange(nextState) {
  const prev = state.previousPhase || "waiting";
  const next = nextState?.phase || "waiting";
  if (prev === next) return;
  shellLog("state", `phase ${prev} → ${next}`);
  if (prev === "listening" && next === "thinking") {
    if (state.settings?.cameraOnSpeech && shellCamera.isActive()) {
      void uploadCameraSnapshot("speech").catch(() => {});
    }
    if (state.settings?.screenOnSpeech && shellScreen.isActive()) {
      void uploadScreenSnapshot("speech").catch(() => {});
    }
  }
  state.previousPhase = next;
}

function applyWindowAppearance(settings) {
  const ws = settings || state.windowSettings || {};
  const transparent = Boolean(ws.windowTransparent || ws.windowBackground === "transparent");
  const compact = Boolean(ws.windowCompact);
  document.body.classList.toggle("shell-window-transparent", transparent);
  document.body.classList.toggle("shell-compact", compact);
  if (nodes.shellApp) nodes.shellApp.dataset.compact = compact ? "1" : "0";
  if (nodes.shellApp) nodes.shellApp.dataset.compactQa = isCompactDialogQaEnabled() && compact ? "1" : "0";
  document.body.classList.remove("shell-bg-wallpaper", "shell-bg-dark", "shell-bg-transparent");
  const bg = transparent ? "transparent" : ws.windowBackground || "wallpaper";
  document.body.classList.add(`shell-bg-${bg}`);
  syncCompactQa();
}

function isWindowCompactEnabled() {
  if (nodes.shellApp?.dataset.compact === "1") return true;
  if (document.body.classList.contains("shell-compact")) return true;
  return Boolean(state.windowSettings?.windowCompact);
}

function applyWindowSettings(settings) {
  state.windowSettings = settings;
  if (!settingsSave.isSectionDirty("window")) {
    if (nodes.topmost) nodes.topmost.checked = settings.windowTopmost !== false;
    if (nodes.windowTransparent) nodes.windowTransparent.checked = Boolean(settings.windowTransparent);
    if (nodes.windowPetOverlay) nodes.windowPetOverlay.checked = Boolean(settings.windowPetOverlay);
    if (nodes.compactDialogQa) nodes.compactDialogQa.checked = settings.compactDialogQa !== false;
    if (nodes.windowBackground) {
      nodes.windowBackground.value = settings.windowBackground || "wallpaper";
      nodes.windowBackground.disabled = Boolean(settings.windowTransparent);
    }
  }
  if (nodes.windowCompact) {
    nodes.windowCompact.setAttribute("aria-pressed", settings.windowCompact ? "true" : "false");
  }
  syncCompactActionUi(Boolean(settings.windowCompact));
  applyWindowAppearance(settings);
  if (settings.windowCompact) setShellView("main");
  if (window.shellApp?.applyWindowSettings) {
    void window.shellApp.applyWindowSettings(settings);
  }
}

function resetMicHoldUi({ force = true } = {}) {
  state.micPointerHeld = false;
  disarmMicHoldDocRelease();
  shellTapVoice?.abortSession();
  if (usesSidecarMic() && state.pttHeld) {
    void setPttHeldRemote(false).catch(() => {});
  }
  setMicButtonState("Говорить", { active: false, force });
  syncVoiceRecordTimer();
}

let micHoldStartedAt = 0;
let micHoldDocRelease = null;

function disarmMicHoldDocRelease() {
  if (!micHoldDocRelease) return;
  document.removeEventListener("pointerup", micHoldDocRelease, true);
  document.removeEventListener("pointercancel", micHoldDocRelease, true);
  micHoldDocRelease = null;
}

function armMicHoldDocRelease(releaseFn) {
  disarmMicHoldDocRelease();
  micHoldDocRelease = (event) => {
    if (!state.micPointerHeld) return;
    if (event.type === "pointercancel" && performance.now() - micHoldStartedAt < 80) return;
    releaseFn();
  };
  requestAnimationFrame(() => {
    if (!state.micPointerHeld || !micHoldDocRelease) return;
    document.addEventListener("pointerup", micHoldDocRelease, true);
    document.addEventListener("pointercancel", micHoldDocRelease, true);
  });
}

function setMicButtonState(label, { active = false, force = false } = {}) {
  if (!nodes.micBtn) return;
  if (!force && !active && isMicPhysicalHold()) return;
  const icon =
    nodes.micBtn.querySelector(".shell-compose-tool-icon") ||
    nodes.micBtn.querySelector(".shell-compose-mic-icon");
  if (icon) icon.textContent = active ? "⏹" : "🎤";
  nodes.micBtn.setAttribute("aria-label", label);
  nodes.micBtn.classList.toggle("is-active", active);
  nodes.micBtn.setAttribute("aria-pressed", active ? "true" : "false");
  refreshComposeMicTitle();
}

function setChatPanel(open) {
  const next = Boolean(open);
  state.chatOpen = next;
  nodes.mainView?.setAttribute("data-chat-open", next ? "1" : "0");
  nodes.replyPanel?.classList.toggle("hidden", !next);
  nodes.composePanel?.classList.toggle("hidden", !next);
}

function setCharacterPicker(open) {
  const next = Boolean(open);
  state.characterPickerOpen = next;
  nodes.characterStage?.setAttribute("data-character-picker-open", next ? "1" : "0");
  nodes.characterToggle?.setAttribute("aria-pressed", next ? "true" : "false");
  nodes.characterToggle?.setAttribute("aria-expanded", next ? "true" : "false");
  nodes.characterPickerWrap?.classList.toggle("hidden", !next);
}

function setMediaDrawer(mode) {
  const next = mode === "camera" || mode === "screen" ? mode : "";
  state.mediaMode = next;
  nodes.mainView?.setAttribute("data-media-open", next ? "1" : "0");
  if (nodes.mediaSection) {
    nodes.mediaSection.classList.toggle("hidden", !next);
    nodes.mediaSection.dataset.mode = next;
  }
  nodes.watchCamera?.setAttribute("aria-pressed", next === "camera" ? "true" : "false");
  nodes.watchScreen?.setAttribute("aria-pressed", next === "screen" ? "true" : "false");
}

async function toggleWatchCamera() {
  const active = nodes.watchCamera?.getAttribute("aria-pressed") === "true";
  if (active) {
    await applyCameraEnabled(false, { persist: true });
    if (state.mediaMode === "camera") setMediaDrawer("");
    return;
  }
  setMediaDrawer("camera");
  await applyCameraEnabled(true, { persist: true });
}

async function toggleWatchScreen() {
  const active = nodes.watchScreen?.getAttribute("aria-pressed") === "true";
  if (active) {
    await applyScreenEnabled(false, { persist: true });
    if (state.mediaMode === "screen") setMediaDrawer("");
    return;
  }
  setMediaDrawer("screen");
  await applyScreenEnabled(true, { persist: true });
}

function collectWindowSnapshot() {
  return buildWindowSettingsPayload();
}

function applyBridgeModelPlaceholder(runtime) {
  const input = nodes.bridgeModel;
  if (!input) return;
  const id = normalizeMessageRuntime(runtime);
  if (!runtimeUsesCli(id)) return;
  input.placeholder =
    id === "codex" ? "По умолчанию из codex login" : "По умолчанию из claude login";
}

function applyBridgeForm(runtime, settings = state.settings || {}) {
  const id = normalizeMessageRuntime(runtime);
  const defaults = RUNTIME_DEFAULTS[id] || {};
  const read = (field) => String(settings[bridgeRuntimeField(id, field)] ?? "").trim();
  if (runtimeUsesCli(id)) {
    if (nodes.bridgeUrl && document.activeElement !== nodes.bridgeUrl) {
      nodes.bridgeUrl.value =
        read("cliPath") || defaults.cliPath || (id === "codex" ? "codex" : "claude");
    }
  } else {
    if (nodes.bridgeUrl && document.activeElement !== nodes.bridgeUrl) {
      nodes.bridgeUrl.value = read("baseUrl") || defaults.baseUrl || "";
    }
    if (nodes.bridgeApiKey && document.activeElement !== nodes.bridgeApiKey) {
      nodes.bridgeApiKey.value = read("apiKey");
    }
  }
  if (nodes.bridgeModel && document.activeElement !== nodes.bridgeModel) {
    nodes.bridgeModel.value = read("model") || defaults.model || "";
  }
  applyBridgeModelPlaceholder(id);
  if (nodes.bridgeAgentMeta && document.activeElement !== nodes.bridgeAgentMeta) {
    nodes.bridgeAgentMeta.value = read(runtimeAgentMetaKey(id));
  }
  if (nodes.bridgeSessionId && document.activeElement !== nodes.bridgeSessionId) {
    nodes.bridgeSessionId.value = read("sessionId") || defaults.sessionId || "";
  }
  if (
    runtimeUsesCli(id) &&
    nodes.bridgePermissionMode
  ) {
    const mode = read("permissionMode") || defaults.permissionMode || "";
    nodes.bridgePermissionMode.checked = mode === "bypassPermissions";
  }
}

function applyQwenpawRouteForm(settings = state.settings || {}) {
  if (nodes.qwenpawUrl && document.activeElement !== nodes.qwenpawUrl) {
    nodes.qwenpawUrl.value = settings.qwenpawBaseUrl || "http://127.0.0.1:8088";
  }
  if (nodes.qwenpawAgentId && document.activeElement !== nodes.qwenpawAgentId) {
    nodes.qwenpawAgentId.value = settings.qwenpawAgentId || "default";
  }
  void loadQwenPawAgents(settings.qwenpawAgentId || "default");
}

function routeRuntimeFlatFields(runtimeId) {
  const id = normalizeMessageRuntime(runtimeId);
  if (runtimeUsesCli(id)) {
    const fields = ["cliPath", "model", "sessionId"];
    if (runtimeUsesCli(id)) fields.push("permissionMode");
    return fields;
  }
  return ["baseUrl", "apiKey", "model", "profile", "agentId", "sessionId"];
}

function buildRouteSnapshotFromSettings(settings = state.settings || {}) {
  const snap = {
    messageTarget: normalizeMessageRuntime(settings.messageTarget || "qwenpaw"),
    qwenpawBaseUrl: String(settings.qwenpawBaseUrl || "http://127.0.0.1:8088").trim() || "http://127.0.0.1:8088",
    qwenpawAgentId: String(settings.qwenpawAgentId || "default").trim() || "default",
    systemPrompt: String(settings.systemPrompt || "").trim()
  };
  for (const id of SHELL_RUNTIMES) {
    if (id === "qwenpaw") continue;
    for (const field of routeRuntimeFlatFields(id)) {
      const key = bridgeRuntimeField(id, field);
      snap[key] = String(settings[key] ?? "").trim();
    }
  }
  return snap;
}

function applyRouteFormFromSettings(settings = state.settings || {}) {
  if (!settings) return;
  const available = getSelectableRuntimes();
  const runtime = normalizeMessageRuntime(settings.messageTarget || "qwenpaw");
  ensureRuntimeSelectOptions(available);
  runRuntimeSelectSync(() => {
    const headerRuntime = readRuntimeSelectValue(nodes.messageTarget);
    const routeRuntime = readRuntimeSelectValue(nodes.routeRuntime);
    if (headerRuntime !== runtime) {
      setRuntimeSelectValue(nodes.messageTarget, runtime, available);
    }
    if (routeRuntime !== runtime) {
      setRuntimeSelectValue(nodes.routeRuntime, runtime, available);
    }
  });
  if (state.settings) state.settings.messageTarget = runtime;
  applyQwenpawRouteForm(settings);
  applyBridgeForm(runtime, settings);
  if (nodes.systemPrompt && document.activeElement !== nodes.systemPrompt) {
    nodes.systemPrompt.value = settings.systemPrompt || "";
  }
  updateRuntimeUi({ reloadForms: false });
}

function collectBridgeFormPatch(runtime, { validate = true } = {}) {
  const id = normalizeMessageRuntime(runtime);
  const defaults = RUNTIME_DEFAULTS[id] || {};
  const sessionId = nodes.bridgeSessionId?.value.trim() || defaults.sessionId || "";
  if (validate && id === "codex" && sessionId) {
    const check = validateCodexSessionId(sessionId);
    if (!check.ok) throw new Error(check.message);
  }
  const patch = {
    [bridgeRuntimeField(id, "sessionId")]: sessionId
  };
  if (runtimeShowsAgentMeta(id)) {
    patch[bridgeRuntimeField(id, runtimeAgentMetaKey(id))] = nodes.bridgeAgentMeta?.value.trim() || "";
  }
  if (runtimeUsesCli(id)) {
    patch[bridgeRuntimeField(id, "cliPath")] =
      nodes.bridgeUrl?.value.trim() || defaults.cliPath || (id === "codex" ? "codex" : "claude");
    patch[bridgeRuntimeField(id, "model")] = nodes.bridgeModel?.value.trim() || "";
    if (runtimeUsesCli(id)) {
      patch[bridgeRuntimeField(id, "permissionMode")] = nodes.bridgePermissionMode?.checked
        ? "bypassPermissions"
        : "";
    }
  } else {
    patch[bridgeRuntimeField(id, "baseUrl")] = nodes.bridgeUrl?.value.trim() || defaults.baseUrl || "";
    patch[bridgeRuntimeField(id, "apiKey")] = nodes.bridgeApiKey?.value.trim() || "";
  }
  return patch;
}

function collectRouteSettingsPatch({ validate = false } = {}) {
  const runtime = getSelectedRuntime();
  const patch = {
    messageTarget: runtime,
    qwenpawBaseUrl: nodes.qwenpawUrl?.value.trim() || "http://127.0.0.1:8088",
    qwenpawAgentId: nodes.qwenpawAgentId?.value.trim() || "default",
    systemPrompt: nodes.systemPrompt?.value || ""
  };
  if (runtimeUsesBridge(runtime)) {
    Object.assign(patch, collectBridgeFormPatch(runtime, { validate }));
  }
  return patch;
}

function getSettingsSnapshot(section) {
  if (section === "window") return collectWindowSnapshot();
  if (section === "route") return collectRouteSettingsPatch();
  if (section === "proactive") return collectProactiveFormPatch();
  if (section === "tts") return collectTtsSettingsPatch();
  if (section === "stt") return collectSttSettingsPatch();
  return {};
}

function markSettingsDirty(section) {
  let snapshot;
  try {
    snapshot = getSettingsSnapshot(section);
  } catch (error) {
    shellLog("settings", "markSettingsDirty snapshot failed", section, error.message);
    settingsSave.forceDirty(section);
    return;
  }
  settingsSave.markDirty(section, snapshot);
}

function bindSettingsSaveButton(btn, section) {
  if (!btn || btn.dataset.shellSaveBound === "1") return;
  btn.dataset.shellSaveBound = "1";
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    void handleSettingsSaveClick(section, btn);
  });
}

function applySettingsFormsFromServer(settings = state.settings) {
  if (!settings) return;
  if (
    !isSettingsViewOpen() &&
    !settingsSave.isSectionDirty("route") &&
    !isHeroAutosaveActive("messageTarget")
  ) {
    applyRouteFormFromSettings(settings);
  }
  if (
    !isSettingsViewOpen() &&
    !settingsSave.isSectionDirty("tts") &&
    !isHeroAutosaveActive("ttsEnabled")
  ) {
    syncTtsEnabledUi(settings);
  }
  if (
    !isSettingsViewOpen() &&
    !settingsSave.isSectionDirty("tts") &&
    !isHeroAutosaveActive("ttsPlaybackMode")
  ) {
    syncTtsPlaybackModeUi(settings);
  }
  if (!isSettingsViewOpen() && !settingsSave.isSectionDirty("tts")) {
    applyTtsSettingsUi(settings);
  }
  if (
    !isSettingsViewOpen() &&
    !settingsSave.isSectionDirty("stt") &&
    !isHeroAutosaveActive("sttEnabled")
  ) {
    syncSttEnabledUi(settings);
  }
  if (!isSettingsViewOpen() && !settingsSave.isSectionDirty("stt")) {
    applySttSettingsUi(settings);
  }
  if (!isSettingsViewOpen() && !settingsSave.isSectionDirty("proactive")) {
    applyProactiveFormUi(settings);
    shellProactive?.syncSettings(settings);
  } else if (isSettingsViewOpen() && settingsSave.isSectionDirty("proactive") && shellProactive) {
    shellProactive.syncSettings({
      ...(settings || {}),
      ...collectProactiveFormPatch()
    });
  } else if (!isSettingsViewOpen()) {
    shellProactive?.syncSettings(settings);
  }
}

function applySettingsSectionForm(section, settings = state.settings) {
  if (!settings && section !== "window") return;
  if (section === "route") applyRouteFormFromSettings(settings);
  else if (section === "tts") applyTtsSettingsUi(settings);
  else if (section === "stt") applySttSettingsUi(settings);
  else if (section === "proactive") applyProactiveFormUi(settings);
}

function syncSettingsFormsOnOpen(settings = state.settings) {
  for (const section of ["window", "route", "tts", "stt", "proactive"]) {
    if (settingsSave.isSectionDirty(section)) continue;
    try {
      if (section !== "window") {
        if (!settings) continue;
        applySettingsSectionForm(section, settings);
      }
    } catch (error) {
      shellLog("settings", "syncSettingsFormsOnOpen apply failed", section, error.message);
    }
  }
  if (!isAnySettingsSectionDirty()) {
    commitAllSettingsBaselines();
  }
  settingsSave.syncUi();
}

function commitCleanSettingsBaselines() {
  if (isSettingsViewOpen() || isAnySettingsSectionDirty()) {
    settingsSave.syncUi();
    return;
  }
  commitAllSettingsBaselines();
}

async function handleSettingsSaveClick(section, btn) {
  if (!section) return;
  if (!state.agentId) {
    try {
      await ensureShellAgentSelected();
    } catch (error) {
      renderPhase("waiting", error.message);
      return;
    }
  }
  if (!state.agentId) {
    renderPhase("waiting", "Выберите хранилище (агента) в шапке");
    return;
  }
  btn?.classList.add("is-saving");
  btn?.setAttribute("disabled", "disabled");
  try {
    if (section === "tts") await persistTtsSettings();
    else await saveSettingsSection(section);
    void playShellUiSound("saved");
  } catch (error) {
    renderPhase("waiting", error.message);
  } finally {
    btn?.classList.remove("is-saving");
    btn?.removeAttribute("disabled");
    settingsSave.syncUi();
  }
}

function settingsSectionFromTarget(target) {
  if (!(target instanceof Element)) return "";
  if (target.closest("#shell-window-panel")) return "window";
  if (target.closest("#shell-route-panel")) return "route";
  if (target.closest("#shell-proactive-panel")) return "proactive";
  if (target.closest("#shell-tts-panel")) return "tts";
  if (target.closest("#shell-stt-panel")) return "stt";
  return "";
}

function refreshSettingsSaveUi() {
  nodes.settingsBtn = document.getElementById("shell-settings-btn") || nodes.settingsBtn;
  nodes.windowSave = document.getElementById("shell-window-save") || nodes.windowSave;
  nodes.routeSave = document.getElementById("shell-route-save") || nodes.routeSave;
  nodes.proactiveSave = document.getElementById("shell-proactive-save") || nodes.proactiveSave;
  nodes.ttsSave = document.getElementById("shell-tts-save") || nodes.ttsSave;
  nodes.sttSave = document.getElementById("shell-stt-save") || nodes.sttSave;
  settingsSave.attachUi({
    saveButtons: {
      window: nodes.windowSave,
      route: nodes.routeSave,
      proactive: nodes.proactiveSave,
      tts: nodes.ttsSave,
      stt: nodes.sttSave
    },
    toggleButtons: {},
    settingsMenuBtn: nodes.settingsBtn
  });
  bindSettingsSaveButton(nodes.windowSave, "window");
  bindSettingsSaveButton(nodes.routeSave, "route");
  bindSettingsSaveButton(nodes.proactiveSave, "proactive");
  bindSettingsSaveButton(nodes.ttsSave, "tts");
  bindSettingsSaveButton(nodes.sttSave, "stt");
}

function bindSettingsDirtyUi() {
  refreshSettingsSaveUi();
  bindSettingsDirtyTracking();
  bindSettingsSaveHandlers();
}

function bindSettingsDirtyTracking() {
  if (document.body.dataset.shellDirtyDocBound === "1") return;
  document.body.dataset.shellDirtyDocBound = "1";
  const onFieldChange = (event) => {
    if (!isSettingsViewOpen()) return;
    const section = settingsSectionFromTarget(event.target);
    if (!section) return;
    markSettingsDirty(section);
  };
  document.addEventListener("input", onFieldChange, true);
  document.addEventListener("change", onFieldChange, true);
}

function bindSettingsSaveHandlers() {
  const root = document.getElementById("shell-settings-view") || document.querySelector(".shell-settings-panels");
  if (!root || root.dataset.shellSaveBound === "1") return;
  root.dataset.shellSaveBound = "1";
  root.addEventListener("click", (event) => {
    const btn = event.target.closest(".shell-save-btn");
    if (!btn) return;
    event.preventDefault();
    if (btn.id === "shell-window-save") {
      void handleSettingsSaveClick("window", btn);
      return;
    }
    if (btn.id === "shell-route-save") {
      void handleSettingsSaveClick("route", btn);
      return;
    }
    if (btn.id === "shell-proactive-save") {
      void handleSettingsSaveClick("proactive", btn);
      return;
    }
    if (btn.id === "shell-tts-save") {
      void handleSettingsSaveClick("tts", btn);
      return;
    }
    if (btn.id === "shell-stt-save") {
      void handleSettingsSaveClick("stt", btn);
    }
  });
}

function commitAllSettingsBaselines() {
  settingsSave.commitAllBaselines({
    window: collectWindowSnapshot(),
    route: collectRouteSettingsPatch(),
    proactive: collectProactiveFormPatch(),
    tts: collectTtsSettingsPatch(),
    stt: collectSttSettingsPatch()
  });
}

function commitAllSettingsBaselinesIfSafe() {
  commitCleanSettingsBaselines();
}

function previewWindowFromForm() {
  applyWindowAppearance({
    ...(state.windowSettings || {}),
    ...collectWindowSnapshot()
  });
}

function isSettingsViewOpen() {
  if (state.view === "settings") return true;
  return document.getElementById("shell-app")?.dataset.view === "settings";
}

function isAnySettingsSectionDirty() {
  return ["window", "route", "proactive", "tts", "stt"].some((section) =>
    settingsSave.isSectionDirty(section)
  );
}

async function persistRoutePermissionMode() {
  const runtime = getSelectedRuntime();
  if (!runtimeUsesCli(runtime)) return;
  const permissionKey = bridgeRuntimeField(runtime, "permissionMode");
  const patch = {
    [permissionKey]: nodes.bridgePermissionMode?.checked ? "bypassPermissions" : ""
  };
  await persistAgentSettingsPatch(patch, {
    baselineSection: "route",
    commitSection: false
  });
}

async function saveSettingsSection(section) {
  if (section === "window") {
    await saveWindowSettings(collectWindowSnapshot());
    settingsSave.commitBaseline("window", collectWindowSnapshot());
    return;
  }

  const patch =
    section === "route" ? collectRouteSettingsPatch({ validate: true }) : getSettingsSnapshot(section);
  if (section === "stt") {
    applyRecognitionLang(patch.sttLang);
  }
  const applyMode =
    section === "route" || section === "tts" || section === "stt" ? "none" : "full";
  await saveSettings(patch, { apply: applyMode });
  applySavedSettingsSection(section, state.settings);
  settingsSave.commitBaseline(section, getSettingsSnapshot(section));
}

function applySavedSettingsSection(section, settings = state.settings) {
  if (!settings) return;
  if (section === "route") applyRouteFormFromSettings(settings);
  else if (section === "proactive") applyProactiveFormUi(settings);
  else if (section === "stt") applySttSettingsUi(settings);
  else if (section === "tts") applyTtsSettingsUi(settings);
}

function applyRouteSummarySettings(settings = state.settings) {
  if (
    !settings ||
    isSettingsViewOpen() ||
    settingsSave.isSectionDirty("route") ||
    isHeroAutosaveActive("messageTarget")
  ) {
    return;
  }
  applyRouteFormFromSettings(settings);
  refreshRuntimeSelectLabels();
}

function applyTtsSummarySettings(settings = state.settings) {
  if (!settings) return;
  if (!isHeroAutosaveActive("ttsEnabled")) {
    syncTtsEnabledUi(settings);
  }
  if (!isHeroAutosaveActive("ttsPlaybackMode")) {
    syncTtsPlaybackModeUi(settings);
  }
}

function applySttSummarySettings(settings = state.settings) {
  if (!settings) return;
  if (!isHeroAutosaveActive("sttEnabled")) {
    syncSttEnabledUi(settings);
  }
  applySttToggleUi(settings);
}

function applySettings(settings) {
  if (!settings) return;
  const prevProactive = Boolean(state.settings?.proactiveEnabled);
  state.settings = settings;
  shellLog("settings", "applySettings", {
    proactiveEnabled: settings.proactiveEnabled,
    proactiveDirty: settingsSave.isSectionDirty("proactive"),
    settingsOpen: isSettingsViewOpen()
  });

  applySettingsFormsFromServer(settings);

  if (nodes.cameraFacing) {
    nodes.cameraFacing.value = settings.cameraFacing || "user";
    updateCameraDeviceField();
  }
  if (nodes.cameraOnSpeech) {
    nodes.cameraOnSpeech.checked = settings.cameraOnSpeech !== false;
  }
  if (nodes.cameraEnabled) {
    const enabled = Boolean(settings.cameraEnabled);
    nodes.cameraEnabled.checked = enabled;
    shellCamera.setConstraints(getCameraConstraints());
    const cameraKey = `${enabled}:${settings.cameraFacing || "user"}:${settings.cameraDeviceId || ""}`;
    if (cameraKey !== state.cameraAppliedKey) {
      state.cameraAppliedKey = cameraKey;
      if (enabled) void applyCameraEnabled(true);
      else {
        void shellCamera.stop();
        updateCameraUi(false);
      }
    }
  }
  if (nodes.screenOnSpeech) {
    nodes.screenOnSpeech.checked = settings.screenOnSpeech !== false;
  }
  if (nodes.screenEnabled) {
    const enabled = Boolean(settings.screenEnabled);
    nodes.screenEnabled.checked = enabled;
    const screenKey = enabled ? "on" : "off";
    if (screenKey !== state.screenAppliedKey) {
      state.screenAppliedKey = screenKey;
      if (enabled) void applyScreenEnabled(true);
      else {
        void shellScreen.stop();
        updateScreenUi(false);
      }
    }
  }
  if (prevProactive !== Boolean(settings.proactiveEnabled)) {
    shellLog("proactive", `С сервера: ${settings.proactiveEnabled ? "вкл" : "выкл"}`);
  }
  syncCompactSensorAvailability();
  syncDialogScrollFromSettings(settings);
}

function getQwenPawUrlValue() {
  const raw = String(nodes.qwenpawUrl?.value || "").trim() || "http://127.0.0.1:8088";
  try {
    return new URL(raw).href;
  } catch {
    return "http://127.0.0.1:8088";
  }
}

function openQwenPawInBrowser() {
  void (async () => {
    const base = getQwenPawUrlValue().replace(/\/+$/, "");
    try {
      const data = await apiFetch("/api/shell/qwenpaw/chats");
      const sessionId =
        data?.sessionId || state.qwenpawSessionId || state.settings?.qwenpawSessionId || "";
      const match = (data?.chats || []).find(
        (chat) => String(chat?.session_id || "") === sessionId && !isInternalQwenPawChat(chat)
      );
      const url = match?.id ? `${base}/chat/${match.id}` : base;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      window.open(base, "_blank", "noopener,noreferrer");
    }
  })();
}

function parseShellPathAgentId() {
  try {
    const parts = window.location.pathname.split("/").filter(Boolean);
    if (shellVoiceStandalone) {
      const { agentId } = parseVoiceShellPath(window.location.pathname);
      if (agentId) return agentId;
      const reserved = new Set([
        "shell",
        "shared",
        "vendor",
        "cms",
        "a",
        "api",
        "favicon.svg",
        "project-version.js",
        "app-lock.js",
        "markdown-github-alerts.js",
        "markdown-it-task-lists.js"
      ]);
      if (parts.length >= 1 && !reserved.has(parts[0]) && !parts[0].includes(".")) {
        return decodeURIComponent(parts[0]);
      }
      return "";
    }
    if (parts[0] !== "shell" || parts.length < 2) return "";
    const segment = decodeURIComponent(parts[1]);
    const reserved = new Set([
      "index.html",
      "shell.js",
      "shell.css",
      "shell-build.js",
      "manifest.webmanifest",
      "vendor"
    ]);
    if (reserved.has(segment)) return "";
    return segment;
  } catch {
    return "";
  }
}

function shellAgentPath(agentId, surfaceHost = "") {
  const id = String(agentId || "").trim();
  if (!id) return shellVoiceStandalone ? "/" : "/shell/";
  if (shellVoiceStandalone) {
    const host =
      String(surfaceHost || "").trim() ||
      readVoiceSurfaceHostFromLocation();
    return buildVoiceShellPath(id, host);
  }
  return `/shell/${encodeURIComponent(id)}/`;
}

function syncShellAgentUrl(agentId) {
  if (shellEmbedMode) return;
  const id = String(agentId || "").trim();
  if (!id) return;
  const desired = shellAgentPath(id);
  const current = window.location.pathname.replace(/\/+$/, "") || "/";
  const target = desired.replace(/\/+$/, "") || "/";
  if (current !== target) {
    const url = new URL(window.location.href);
    url.pathname = desired;
    window.history.replaceState({}, "", url.toString());
  }
}

let shellAgentGateResolver = null;

function hideShellAgentGate() {
  nodes.agentGate?.classList.add("hidden");
  document.body.classList.remove("shell-agent-gate-open");
  syncShellAgentReadyUi();
}

function showShellAgentGate(selectable) {
  return new Promise((resolve) => {
    shellAgentGateResolver = resolve;
    if (!nodes.agentGate || !nodes.agentGateSelect) {
      resolve(null);
      return;
    }
    nodes.agentGateSelect.innerHTML = "";
    for (const agent of selectable) {
      const opt = document.createElement("option");
      opt.value = agent.id;
      opt.textContent = agent.name && agent.name !== agent.id ? `${agent.name} (${agent.id})` : agent.id;
      if (agent.id === state.agentId) opt.selected = true;
      nodes.agentGateSelect.append(opt);
    }
    nodes.agentGate.classList.remove("hidden");
    document.body.classList.add("shell-agent-gate-open");
    syncShellAgentReadyUi();
  });
}

function isCompanionEmbedRequest() {
  try {
    return new URLSearchParams(window.location.search).get("companion") === "1";
  } catch {
    return false;
  }
}

function notifyCompanionAgentSelected(agentId) {
  const id = String(agentId || "").trim();
  if (!id) return;
  try {
    if (window.parent !== window) {
      window.parent.postMessage({ type: "agent-cms-voice:agent-selected", agentId: id }, "*");
    }
  } catch {
    // ignore
  }
}

function navigateToShellAgent(agentId) {
  const id = String(agentId || "").trim();
  if (!id) return;
  state.agentId = id;
  localStorage.setItem(SHELL_STORAGE.agent, id);
  notifyCompanionAgentSelected(id);
  if (shellVoiceStandalone && isCompanionEmbedRequest()) {
    hideShellAgentGate();
    if (shellAgentGateResolver) {
      shellAgentGateResolver(id);
      shellAgentGateResolver = null;
    }
    const url = new URL(window.location.href);
    url.pathname = buildVoiceShellPath(id, "extension");
    url.searchParams.delete("embed");
    url.searchParams.set("companion", "1");
    window.location.replace(`${url.pathname}${url.search}${url.hash}`);
    return;
  }
  syncShellAgentUrl(id);
  hideShellAgentGate();
  if (shellAgentGateResolver) {
    shellAgentGateResolver(id);
    shellAgentGateResolver = null;
  }
  syncShellAgentReadyUi();
}

function bindShellAgentGateUi() {
  nodes.agentGateOpen?.addEventListener("click", () => {
    navigateToShellAgent(nodes.agentGateSelect?.value || state.agentId);
  });
}

async function ensureShellAgentSelected() {
  const data = await loadAgentSelectData();
  const selectable = getSelectableAgents(data.agents);
  if (!selectable.length) {
    throw new Error("Нет доступных workspace-агентов в CMS");
  }

  const fromPath = parseShellPathAgentId();
  if (fromPath && selectable.some((agent) => agent.id === fromPath)) {
    state.agentId = fromPath;
    localStorage.setItem(SHELL_STORAGE.agent, fromPath);
    hideShellAgentGate();
    return fromPath;
  }

  const remembered = selectable.find((agent) => agent.id === state.agentId);
  if (remembered) {
    navigateToShellAgent(remembered.id);
    return remembered.id;
  }

  if (selectable.length === 1) {
    navigateToShellAgent(selectable[0].id);
    return selectable[0].id;
  }

  await showShellAgentGate(selectable);
  return state.agentId;
}

const CODEX_SESSION_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validateCodexSessionId(value) {
  const sid = String(value || "").trim();
  if (!sid) return { ok: true, normalized: "" };
  if (CODEX_SESSION_UUID_RE.test(sid)) return { ok: true, normalized: sid };
  return {
    ok: false,
    normalized: "",
    message: "Codex resume: укажите UUID сессии или оставьте поле пустым для новой сессии"
  };
}

function createCliSessionUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const nibble = (Math.random() * 16) | 0;
    const value = ch === "x" ? nibble : (nibble & 0x3) | 0x8;
    return value.toString(16);
  });
}

function readRuntimeSelectValue(selectEl) {
  if (!selectEl) return "";
  const picked = selectEl.selectedOptions?.[0] || selectEl.options[selectEl.selectedIndex];
  const raw = String(picked?.value || selectEl.value || "").trim();
  return raw ? normalizeMessageRuntime(raw) : "";
}

function setRuntimeSelectValue(selectEl, runtime, available = getSelectableRuntimes()) {
  if (!selectEl) return normalizeMessageRuntime(runtime || "qwenpaw");
  const wanted = normalizeMessageRuntime(runtime || "qwenpaw");
  const value = available.includes(wanted)
    ? wanted
    : available.includes("qwenpaw")
      ? "qwenpaw"
      : available[0] || "qwenpaw";
  let match = null;
  for (const opt of selectEl.options) {
    if (!opt.value || opt.disabled) continue;
    if (opt.value === value) {
      match = opt;
      break;
    }
  }
  if (!match) {
    for (const opt of selectEl.options) {
      if (opt.value && !opt.disabled) {
        match = opt;
        break;
      }
    }
  }
  if (!match) return normalizeMessageRuntime(selectEl.value || value);
  if (selectEl.selectedOptions?.[0] !== match) {
    match.selected = true;
  }
  if (selectEl.value !== match.value) {
    selectEl.value = match.value;
  }
  return normalizeMessageRuntime(match.value || value);
}

function syncRuntimeSelects(preferred = "") {
  const saved = normalizeMessageRuntime(state.settings?.messageTarget || "qwenpaw");
  let raw = saved;
  if (preferred === "route") {
    raw = readRuntimeSelectValue(nodes.routeRuntime) || saved;
  } else if (preferred === "header") {
    raw = readRuntimeSelectValue(nodes.messageTarget) || saved;
  }
  const runtime = normalizeMessageRuntime(raw);
  if (state.settings) state.settings.messageTarget = runtime;
  const available = getSelectableRuntimes();
  runRuntimeSelectSync(() => {
    setRuntimeSelectValue(nodes.messageTarget, runtime, available);
    setRuntimeSelectValue(nodes.routeRuntime, runtime, available);
  });
  return runtime;
}

function getSelectedRuntime() {
  if (isSettingsViewOpen()) {
    const fromRoute = readRuntimeSelectValue(nodes.routeRuntime);
    if (fromRoute && isRuntimeImplemented(fromRoute)) return fromRoute;
  }
  const fromHeader = readRuntimeSelectValue(nodes.messageTarget);
  if (fromHeader && isRuntimeImplemented(fromHeader)) return fromHeader;
  const fromRoute = readRuntimeSelectValue(nodes.routeRuntime);
  if (fromRoute && isRuntimeImplemented(fromRoute)) return fromRoute;
  const saved = normalizeMessageRuntime(state.settings?.messageTarget || "");
  if (saved && isRuntimeImplemented(saved)) return saved;
  return "qwenpaw";
}

function getSelectableRuntimes() {
  const implemented = SHELL_RUNTIMES.filter((runtime) => isRuntimeImplemented(runtime));
  const installed = Array.isArray(state.installedRuntimes)
    ? state.installedRuntimes.map((item) => normalizeMessageRuntime(item))
    : [];
  if (!installed.length) return implemented;
  return implemented.filter((runtime) => installed.includes(runtime));
}

function createRuntimeSelectOption(runtime, current, available, { showVersion = false } = {}) {
  const opt = document.createElement("option");
  const implemented = isRuntimeImplemented(runtime);
  if (!implemented) {
    opt.value = runtime;
    opt.textContent = formatRuntimeSelectLabel(runtime, { implemented: false, conn: "soon" });
    opt.disabled = true;
    if (runtime === current) opt.selected = true;
    return opt;
  }
  const status = getRuntimeStatus(runtime);
  const installed =
    !status ||
    status.installed !== false ||
    (runtimeUsesCli(runtime) && String(status.version || "").trim());
  const selectable = available.includes(runtime) && installed;
  const conn = resolveRuntimeConnectionState(runtime, status, { implemented: true });
  opt.value = runtime;
  opt.textContent = formatRuntimeSelectLabel(runtime, {
    implemented: selectable,
    status,
    conn,
    showVersion
  });
  opt.title = formatRuntimeStatusTitle(runtime, status, { implemented: selectable });
  opt.disabled = !selectable;
  if (runtime === current) opt.selected = true;
  return opt;
}

function fillRuntimeSelect(selectEl, selected, available) {
  if (!selectEl) return normalizeMessageRuntime(selected);
  return runRuntimeSelectSync(() => {
    const showVersion = selectEl.id === "shell-route-runtime";
    let current = normalizeMessageRuntime(selected);
    if (!available.includes(current)) current = available.includes("qwenpaw") ? "qwenpaw" : available[0] || "qwenpaw";
    selectEl.innerHTML = "";
    for (const group of SHELL_RUNTIME_GROUPS) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = group.label;
      if (group.hint) optgroup.title = group.hint;
      for (const runtime of group.runtimes) {
        optgroup.append(createRuntimeSelectOption(runtime, current, available, { showVersion }));
      }
      selectEl.append(optgroup);
    }
    return setRuntimeSelectValue(selectEl, current, available);
  });
}

function ensureRuntimeSelectOptions(available = getSelectableRuntimes()) {
  for (const selectEl of [nodes.messageTarget, nodes.routeRuntime]) {
    if (!selectEl || selectEl.options.length > 0) continue;
    const runtime = normalizeMessageRuntime(state.settings?.messageTarget || "qwenpaw");
    fillRuntimeSelect(selectEl, runtime, available);
  }
}

function refreshRuntimeSelectLabels() {
  refreshShellHeaderNodes();
  ensureRuntimeSelectOptions();
  const available = getSelectableRuntimes();
  for (const selectEl of [nodes.messageTarget, nodes.routeRuntime]) {
    if (!selectEl) continue;
    const showVersion = selectEl.id === "shell-route-runtime";
    const current = normalizeMessageRuntime(selectEl.value || state.settings?.messageTarget || "qwenpaw");
    for (const opt of selectEl.options) {
      if (!opt.value) continue;
      const runtime = normalizeMessageRuntime(opt.value);
      if (!SHELL_RUNTIMES.includes(runtime)) continue;
      const implemented = isRuntimeImplemented(runtime);
      const status = implemented ? getRuntimeStatus(runtime) : null;
      const installed =
        !status ||
        status.installed !== false ||
        (runtimeUsesCli(runtime) && String(status.version || "").trim());
      const selectable = implemented && available.includes(runtime) && installed;
      const conn = selectable
        ? resolveRuntimeConnectionState(runtime, status, { implemented: true })
        : implemented
          ? resolveRuntimeConnectionState(runtime, status, { implemented: true })
          : "soon";
      opt.textContent = formatRuntimeSelectLabel(runtime, {
        implemented: selectable,
        status,
        conn,
        showVersion
      });
      opt.title = formatRuntimeStatusTitle(runtime, status, { implemented: selectable });
      opt.disabled = !selectable;
      if (runtime === current) opt.selected = true;
    }
  }
  if (state.view === "settings") {
    updateRuntimeRouteNotes(readRouteRuntimeSelectValue() || getSelectedRuntime());
  }
}

function populateRuntimeSelect(selected = normalizeMessageRuntime(state.settings?.messageTarget || "qwenpaw")) {
  refreshShellHeaderNodes();
  bindRuntimeSelectUi(nodes.messageTarget);
  const available = getSelectableRuntimes();
  const runtime = fillRuntimeSelect(nodes.messageTarget, selected, available);
  fillRuntimeSelect(nodes.routeRuntime, runtime, available);
  if (state.settings) state.settings.messageTarget = runtime;
  updateRuntimeUi({ reloadForms: true, runtime });
  syncShellAgentReadyUi();
}

/** Быстро заполнить runtime-select; settings — отдельным лёгким запросом. */
async function bootstrapRuntimeSelect() {
  refreshShellHeaderNodes();
  bindRuntimeSelectUi(nodes.messageTarget);
  const fallback = normalizeMessageRuntime(state.settings?.messageTarget || "qwenpaw");
  populateRuntimeSelect(fallback);
  if (!state.agentId) return;
  try {
    const data = await apiFetch("/api/shell/settings");
    const settings = data?.settings;
    if (!settings) return;
    state.settings = { ...(state.settings || {}), ...settings };
    syncDialogScrollFromSettings(settings);
    populateRuntimeSelect(settings.messageTarget);
    refreshRuntimeSelectLabels();
    syncShellAgentReadyUi();
  } catch (error) {
    shellLog("error", "runtime settings bootstrap failed", error.message);
  }
}

async function pullRuntimeStatuses({ probe = true } = {}) {
  if (!state.agentId) return;
  try {
    await refreshStatus({ probe });
  } catch (error) {
    shellLog("error", "status probe failed", error.message);
    try {
      await refreshStatus();
    } catch (fallbackError) {
      shellLog("error", "status fallback failed", fallbackError.message);
    }
  } finally {
    refreshRuntimeSelectLabels();
    syncShellAgentReadyUi();
  }
}

function resetRuntimeStatusProbe() {
  runtimeStatusProbePromise = null;
}

function ensureRuntimeStatusProbe({ force = false } = {}) {
  if (!state.agentId) return Promise.resolve();
  if (force) resetRuntimeStatusProbe();
  if (!runtimeStatusProbePromise) {
    runtimeStatusProbePromise = (async () => {
      try {
        await refreshStatus({ probe: true });
      } catch (error) {
        shellLog("error", "status probe failed", error.message);
        try {
          await refreshStatus();
        } catch (fallbackError) {
          shellLog("error", "status fallback failed", fallbackError.message);
        }
      } finally {
        refreshRuntimeSelectLabels();
        syncShellAgentReadyUi();
      }
    })();
  }
  return runtimeStatusProbePromise;
}

function setBridgeFieldVisible(fieldEl, visible) {
  if (!fieldEl) return;
  fieldEl.hidden = !visible;
  fieldEl.classList.toggle("hidden", !visible);
}

function updateBridgePermissionFieldUi(runtime) {
  const id = normalizeMessageRuntime(runtime);
  const show = runtimeShowsPermissionMode(id);
  setBridgeFieldVisible(nodes.bridgePermissionField, show);
  if (!show || !nodes.bridgePermissionField) return;
  nodes.bridgePermissionField.dataset.runtime = id;
  const copy = runtimePermissionModeCopy(id);
  if (nodes.bridgePermissionEmoji) nodes.bridgePermissionEmoji.textContent = copy.emoji;
  if (nodes.bridgePermissionTitle) nodes.bridgePermissionTitle.textContent = copy.title;
  if (nodes.bridgePermissionDesc) nodes.bridgePermissionDesc.textContent = copy.desc;
  if (nodes.bridgePermissionLabel) nodes.bridgePermissionLabel.title = copy.titleAttr;
  if (nodes.bridgePermissionMode) nodes.bridgePermissionMode.setAttribute("aria-label", copy.ariaLabel);
}

function refreshRoutePanelNodes() {
  nodes.routeRuntime = document.getElementById("shell-route-runtime") || nodes.routeRuntime;
  nodes.routeRuntimeNotes = document.getElementById("shell-route-runtime-notes") || nodes.routeRuntimeNotes;
  nodes.routeRuntimeNote = document.getElementById("shell-route-runtime-note") || nodes.routeRuntimeNote;
  nodes.routeRuntimeNoteIntro =
    document.getElementById("shell-route-runtime-note-intro") || nodes.routeRuntimeNoteIntro;
  nodes.routeRuntimeNoteTitle =
    document.getElementById("shell-route-runtime-note-title") || nodes.routeRuntimeNoteTitle;
  nodes.routeRuntimeNoteBody =
    document.getElementById("shell-route-runtime-note-body") || nodes.routeRuntimeNoteBody;
  nodes.bridgePermissionMode =
    document.getElementById("shell-runtime-bridge-permission-mode") || nodes.bridgePermissionMode;
  nodes.bridgePermissionField =
    document.getElementById("shell-runtime-bridge-permission-field") || nodes.bridgePermissionField;
  nodes.bridgePermissionLabel =
    document.getElementById("shell-runtime-bridge-permission-label") || nodes.bridgePermissionLabel;
  nodes.bridgePermissionEmoji =
    document.getElementById("shell-runtime-bridge-permission-emoji") || nodes.bridgePermissionEmoji;
  nodes.bridgePermissionTitle =
    document.getElementById("shell-runtime-bridge-permission-title") || nodes.bridgePermissionTitle;
  nodes.bridgePermissionDesc =
    document.getElementById("shell-runtime-bridge-permission-desc") || nodes.bridgePermissionDesc;
  nodes.bridgeSessionId =
    document.getElementById("shell-runtime-bridge-session-id") || nodes.bridgeSessionId;
  nodes.bridgeSessionGenerate =
    document.getElementById("shell-runtime-bridge-session-generate") || nodes.bridgeSessionGenerate;
}

function generateBridgeSessionUuid() {
  refreshRoutePanelNodes();
  const sessionInput = nodes.bridgeSessionId || document.getElementById("shell-runtime-bridge-session-id");
  if (!sessionInput) return;
  sessionInput.value = createCliSessionUuid();
  sessionInput.dispatchEvent(new Event("input", { bubbles: true }));
  markSettingsDirty("route");
}

function readRouteRuntimeSelectValue() {
  refreshRoutePanelNodes();
  return readRuntimeSelectValue(nodes.routeRuntime);
}

function updateRuntimeRouteNotes(runtime = readRouteRuntimeSelectValue() || getSelectedRuntime()) {
  refreshRoutePanelNodes();
  const container = nodes.routeRuntimeNotes;
  const block = nodes.routeRuntimeNote;
  const introEl = nodes.routeRuntimeNoteIntro;
  const titleEl = nodes.routeRuntimeNoteTitle;
  const bodyEl = nodes.routeRuntimeNoteBody;
  if (!container || !block || !introEl || !titleEl || !bodyEl) return;

  const selected = normalizeMessageRuntime(runtime);
  const show = runtimeShowsRouteNote(selected);
  if (!show) {
    container.hidden = true;
    container.classList.add("hidden");
    container.dataset.runtime = "";
    block.dataset.runtime = "";
    block.dataset.active = "0";
    return;
  }

  const intro = String(SHELL_RUNTIME_ROUTE_INTROS[selected] || "").trim();
  const body = formatRuntimeRouteNote(selected, getRuntimeStatus(selected));
  introEl.textContent = intro;
  titleEl.textContent = SHELL_RUNTIME_LABELS[selected] || selected;
  bodyEl.textContent = body;
  block.dataset.runtime = selected;
  block.dataset.active = body ? "1" : "0";
  block.classList.toggle("shell-runtime-route-note--cli", runtimeUsesCli(selected));
  block.classList.toggle("shell-runtime-route-note--agent", runtimeUsesQwenPaw(selected));

  container.hidden = false;
  container.classList.remove("hidden");
  container.dataset.runtime = selected;
}

function bindRoutePanelUi() {
  const panel = document.getElementById("shell-route-panel");
  if (!panel || panel.dataset.shellRouteBound === "1") return;
  panel.dataset.shellRouteBound = "1";
  panel.addEventListener("click", (event) => {
    const generateBtn = event.target.closest("#shell-runtime-bridge-session-generate");
    if (!generateBtn) return;
    event.preventDefault();
    event.stopPropagation();
    generateBridgeSessionUuid();
  });
  panel.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || target.id !== "shell-route-runtime") return;
    handleRouteRuntimeChange();
  });
  panel.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement) || target.id !== "shell-route-runtime") return;
    updateRuntimeRouteNotes(readRuntimeSelectValue(target));
  });
}

function updateRuntimeUi({ reloadForms = true, runtime: runtimeOverride } = {}) {
  const runtime = normalizeMessageRuntime(runtimeOverride || getSelectedRuntime());
  if (nodes.qwenpawPanel) {
    nodes.qwenpawPanel.dataset.visible = runtimeUsesQwenPaw(runtime) ? "1" : "0";
  }
  if (nodes.bridgePanel) {
    nodes.bridgePanel.dataset.visible = runtimeUsesBridge(runtime) ? "1" : "0";
  }
  updateRuntimeRouteNotes(runtime);
  const settings = state.settings || {};
  if (reloadForms) {
    if (runtimeUsesQwenPaw(runtime)) {
      applyQwenpawRouteForm(settings);
      updateQwenPawPermissionFieldUi();
    }
    if (runtimeUsesBridge(runtime)) applyBridgeForm(runtime, settings);
  }
  if (runtimeUsesBridge(runtime)) {
    const usesCli = runtimeUsesCli(runtime);
    const showModel = runtimeShowsModel(runtime);
    if (nodes.bridgeUrlLabel) {
      nodes.bridgeUrlLabel.textContent = usesCli ? "CLI binary" : "URL";
    }
    if (nodes.bridgeUrl) {
      nodes.bridgeUrl.type = "text";
      nodes.bridgeUrl.placeholder = usesCli
        ? runtime === "codex"
          ? "codex"
          : "claude"
        : "http://127.0.0.1:8088";
    }
    if (nodes.bridgeUrlField) {
      setBridgeFieldVisible(nodes.bridgeUrlField, usesCli || runtimeShowsBaseUrl(runtime));
    }
    const showApiKey = runtimeShowsApiKey(runtime);
    setBridgeFieldVisible(nodes.bridgeApiKeyField, showApiKey);
    setBridgeFieldVisible(nodes.bridgeModelField, showModel);
    const showAgentMeta = runtimeShowsAgentMeta(runtime);
    setBridgeFieldVisible(nodes.bridgeAgentField, showAgentMeta);
    if (nodes.bridgeAgentLabel && showAgentMeta) {
      nodes.bridgeAgentLabel.textContent = runtimeAgentFieldLabel(runtime);
    }
    if (nodes.bridgeSessionId) {
      nodes.bridgeSessionId.placeholder = usesCli
        ? runtime === "codex"
          ? "UUID сессии Codex, пусто = новая"
          : "UUID или название сессии Claude, пусто = новая"
        : "идентификатор сессии на gateway";
    }
    updateBridgePermissionFieldUi(runtime);
    applyBridgeModelPlaceholder(runtime);
  }
  syncDialogConnectionState();
}

function usesQwenPawTarget(target) {
  return runtimeUsesQwenPaw(target);
}

function cleanShellUrl() {
  const fromPath = parseShellPathAgentId();
  if (fromPath) {
    state.agentId = fromPath;
    localStorage.setItem(SHELL_STORAGE.agent, fromPath);
  }
  const embedAgent = shellEmbedMode ? String(new URL(window.location.href).searchParams.get("agent") || "").trim() : "";
  if (embedAgent) {
    state.agentId = embedAgent;
    localStorage.setItem(SHELL_STORAGE.agent, embedAgent);
  }
  if (state.agentId) syncShellAgentUrl(state.agentId);
  const url = new URL(window.location.href);
  if (url.searchParams.has("agent")) {
    url.searchParams.delete("agent");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }
}

function formatQwenPawAgentOptionLabel(agent) {
  const id = String(agent?.id || "").trim();
  const name = String(agent?.name || id).trim() || id;
  if (!id) return name;
  if (name && name !== id) return `${name} (${id})`;
  return name;
}

function isQwenPawPanelAvailable() {
  if (state.qwenpawAgentsReachable) return true;
  if (state.qwenpawServerOk || state.qwenpawConnected) return true;
  const status = getRuntimeStatus("qwenpaw");
  return Boolean(status?.serverOk || status?.ok);
}

function syncQwenPawPanelAvailability() {
  const available = isQwenPawPanelAvailable();
  if (nodes.qwenpawAgentId) nodes.qwenpawAgentId.disabled = !available;
  if (nodes.qwenpawChatName && !state.qwenpawRenameBusy) {
    nodes.qwenpawChatName.disabled = !available;
  }
  if (nodes.qwenpawPermissionMode) nodes.qwenpawPermissionMode.disabled = !available;
}

function updateQwenPawPermissionFieldUi() {
  const copy = runtimeQwenpawPermissionModeCopy();
  if (nodes.qwenpawPermissionEmoji) nodes.qwenpawPermissionEmoji.textContent = copy.emoji;
  if (nodes.qwenpawPermissionTitle) nodes.qwenpawPermissionTitle.textContent = copy.title;
  if (nodes.qwenpawPermissionDesc) nodes.qwenpawPermissionDesc.textContent = copy.desc;
  if (nodes.qwenpawPermissionLabel) nodes.qwenpawPermissionLabel.title = copy.titleAttr;
  if (nodes.qwenpawPermissionMode) nodes.qwenpawPermissionMode.setAttribute("aria-label", copy.ariaLabel);
}

function syncQwenPawApprovalCheckbox(approvalLevel) {
  if (!nodes.qwenpawPermissionMode || document.activeElement === nodes.qwenpawPermissionMode) return;
  const level = String(approvalLevel || "AUTO").trim().toUpperCase() || "AUTO";
  nodes.qwenpawPermissionMode.checked = level === "OFF";
}

function syncQwenPawAgentInput(agents, selectedAgentId) {
  if (!nodes.qwenpawAgentId) return;
  const selected =
    String(selectedAgentId || nodes.qwenpawAgentId.value || state.settings?.qwenpawAgentId || "default").trim() ||
    "default";
  const items = Array.isArray(agents) ? agents.filter((item) => item?.id) : [];
  const knownIds = new Set(items.map((item) => item.id));
  const invalid = Boolean(selected && items.length && !knownIds.has(selected));

  if (document.activeElement !== nodes.qwenpawAgentId) {
    nodes.qwenpawAgentId.innerHTML = "";
    if (!items.length) {
      const option = document.createElement("option");
      option.value = selected;
      option.textContent = invalid ? `${selected} — недоступен` : selected;
      nodes.qwenpawAgentId.append(option);
    } else {
      for (const agent of items) {
        const option = document.createElement("option");
        option.value = agent.id;
        option.textContent = formatQwenPawAgentOptionLabel(agent);
        if (agent.enabled === false) option.disabled = true;
        nodes.qwenpawAgentId.append(option);
      }
      if (selected && !knownIds.has(selected)) {
        const orphan = document.createElement("option");
        orphan.value = selected;
        orphan.textContent = `${selected} — не найден`;
        nodes.qwenpawAgentId.append(orphan);
      }
    }
    nodes.qwenpawAgentId.value = selected;
  }

  nodes.qwenpawAgentId.dataset.invalid = invalid ? "1" : "0";
  nodes.qwenpawAgentId.title = invalid ? `${selected} — не найден в QwenPaw` : "";
}

async function loadQwenPawAgents(preferredId = "") {
  if (!usesQwenPawTarget(state.settings?.messageTarget || nodes.messageTarget?.value || "qwenpaw")) return;
  const lookupId =
    String(preferredId || nodes.qwenpawAgentId?.value || state.settings?.qwenpawAgentId || "default").trim() ||
    "default";
  try {
    const data = await apiFetch(
      `/api/shell/qwenpaw/agents?agentId=${encodeURIComponent(lookupId)}`
    );
    state.qwenpawAgentsReachable = Array.isArray(data.agents) && data.agents.length > 0;
    syncQwenPawAgentInput(data.agents, lookupId || data.selectedAgentId || state.settings?.qwenpawAgentId);
    syncQwenPawApprovalCheckbox(data.selectedAgentApproval);
  } catch {
    state.qwenpawAgentsReachable = false;
    syncQwenPawAgentInput([], lookupId || state.settings?.qwenpawAgentId || "default");
  } finally {
    syncQwenPawPanelAvailability();
  }
}

async function persistQwenPawApprovalMode() {
  if (!usesQwenPawTarget(state.settings?.messageTarget || nodes.messageTarget?.value || "qwenpaw")) return;
  const agentId =
    String(nodes.qwenpawAgentId?.value || state.settings?.qwenpawAgentId || "default").trim() || "default";
  const data = await apiFetch("/api/shell/qwenpaw/agent-approval", {
    method: "POST",
    body: JSON.stringify({
      agentId,
      bypass: Boolean(nodes.qwenpawPermissionMode?.checked)
    })
  });
  syncQwenPawApprovalCheckbox(data.approvalLevel);
}

function updateQwenPawChatUi(payload) {
  if (!nodes.qwenpawChatName || !nodes.qwenpawChatSession) return;
  const target = normalizeMessageRuntime(payload?.settings?.messageTarget || state.settings?.messageTarget || "qwenpaw");
  if (!usesQwenPawTarget(target)) return;

  const qwenpaw = payload?.qwenpaw || {};
  const sessionId =
    qwenpaw.sessionId ||
    payload?.settings?.qwenpawSessionId ||
    state.qwenpawSessionId ||
    "";
  const chatName =
    qwenpaw.chatName ||
    payload?.settings?.qwenpawChatName ||
    nodes.qwenpawChatName.value ||
    "Новый чат";

  state.qwenpawSessionId = sessionId;
  if (document.activeElement !== nodes.qwenpawChatName) {
    nodes.qwenpawChatName.value = chatName || "Новый чат";
    state.qwenpawChatNameDraft = nodes.qwenpawChatName.value;
  }
  nodes.qwenpawChatSession.textContent = sessionId ? `session: ${sessionId}` : "";
}

async function renameQwenPawChatName({ force = false } = {}) {
  if (!nodes.qwenpawChatName || state.qwenpawRenameBusy) return;
  const nextName = String(nodes.qwenpawChatName.value || "").trim();
  if (!nextName) {
    nodes.qwenpawChatName.value = state.qwenpawChatNameDraft || "Новый чат";
    return;
  }
  if (!force && nextName === state.qwenpawChatNameDraft) return;

  state.qwenpawRenameBusy = true;
  nodes.qwenpawChatName.disabled = true;
  try {
    const data = await apiFetch("/api/shell/qwenpaw/rename-chat", {
      method: "POST",
      body: JSON.stringify({ name: nextName, sessionId: state.qwenpawSessionId })
    });
    applySettings(data.settings);
    updateQwenPawChatUi({ settings: data.settings, qwenpaw: { sessionId: data.sessionId, chatName: data.chatName } });
    if (state.qwenpawChatsOpen) await loadQwenPawChats();
  } catch (error) {
    nodes.qwenpawChatName.value = state.qwenpawChatNameDraft || "Новый чат";
    renderPhase("waiting", error.message);
  } finally {
    nodes.qwenpawChatName.disabled = false;
    state.qwenpawRenameBusy = false;
    syncQwenPawPanelAvailability();
  }
}

function setQwenPawChatsOpen(open) {
  state.qwenpawChatsOpen = Boolean(open);
  nodes.qwenpawChatsPanel?.classList.toggle("hidden", !state.qwenpawChatsOpen);
}

function isInternalQwenPawChat(chat) {
  const sessionId = String(chat?.session_id || "").trim();
  return sessionId.includes("-tts-prep-") || sessionId.startsWith("__shell-tts-prep-");
}

function renderQwenPawChats(chats, activeSessionId) {
  if (!nodes.qwenpawChatsPanel) return;
  nodes.qwenpawChatsPanel.innerHTML = "";

  const items = (Array.isArray(chats) ? chats : []).filter((chat) => !isInternalQwenPawChat(chat));
  if (!items.length) {
    nodes.qwenpawChatsPanel.innerHTML = '<div class="shell-qwenpaw-chats-empty">Чатов пока нет</div>';
    return;
  }

  const sorted = [...items].sort((a, b) => {
    const aTime = Date.parse(a?.updated_at || a?.created_at || "") || 0;
    const bTime = Date.parse(b?.updated_at || b?.created_at || "") || 0;
    return bTime - aTime;
  });

  for (const chat of sorted) {
    const sessionId = String(chat?.session_id || "");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "shell-qwenpaw-chat-item";
    if (sessionId && sessionId === activeSessionId) btn.classList.add("is-active");

    const name = document.createElement("span");
    name.className = "shell-qwenpaw-chat-item-name";
    name.textContent = chat?.name || sessionId || "Чат";

    const meta = document.createElement("span");
    meta.className = "shell-qwenpaw-chat-item-meta";
    meta.textContent = sessionId;

    btn.append(name, meta);
    btn.addEventListener("click", () => {
      void selectQwenPawChat(sessionId, chat?.name || "");
    });
    nodes.qwenpawChatsPanel.append(btn);
  }
}

async function loadQwenPawChats() {
  const data = await apiFetch("/api/shell/qwenpaw/chats");
  renderQwenPawChats(data.chats, data.sessionId || state.qwenpawSessionId);
  return data;
}

async function startNewQwenPawChat() {
  const data = await apiFetch("/api/shell/qwenpaw/new-chat", {
    method: "POST",
    body: JSON.stringify({ name: "Новый чат" })
  });
  applySettings(data.settings);
  updateQwenPawChatUi({ settings: data.settings, qwenpaw: { sessionId: data.sessionId, chatName: data.chatName } });
  clearShellReply();
  lastHandledAssistantId = "";
  renderPhase("waiting", "Новый чат QwenPaw");
  void shellDialog.refreshHistory?.();
  nodes.qwenpawChatName?.focus();
  nodes.qwenpawChatName?.select();
  if (state.qwenpawChatsOpen) await loadQwenPawChats();
}

async function selectQwenPawChat(sessionId, chatName) {
  const data = await apiFetch("/api/shell/qwenpaw/select-chat", {
    method: "POST",
    body: JSON.stringify({ sessionId, chatName })
  });
  applySettings(data.settings);
  updateQwenPawChatUi({ settings: data.settings, qwenpaw: { sessionId: data.sessionId, chatName: data.chatName } });
  clearShellReply();
  lastHandledAssistantId = "";
  setQwenPawChatsOpen(false);
  renderPhase("waiting", `Чат: ${data.chatName || data.sessionId}`);
  void shellDialog.refreshHistory?.();
  if (state.qwenpawChatsOpen) await loadQwenPawChats();
}

function formatSettingsFileLabel(settingsFile, agentId) {
  if (settingsFile) {
    return settingsFile.replace(/^.*\/workspaces\//, "workspaces/").replace(/^\/Users\/macbook\//, "~/");
  }
  const id = String(agentId || "").trim();
  return id ? `workspaces/${id}/.agent-shell/settings.json` : ".agent-shell/settings.json";
}

function updateSettingsSaveHints(extra = {}) {
  const agentId = String(extra.agentId || state.agentId || "").trim();
  const agentLabel = String(state.agentLabel || agentId || "").trim() || "агент";
  const settingsFile = String(extra.settingsFile || state.settingsFile || "").trim();
  const agentFileLabel = formatSettingsFileLabel(settingsFile, agentId);
  const perAgentHtml = `${agentLabel} · <code>${agentFileLabel}</code>`;
  const globalHtml = `этот браузер · <code>localStorage</code>`;

  document.querySelectorAll("[data-settings-save-hint='agent']").forEach((el) => {
    el.innerHTML = perAgentHtml;
    el.title = settingsFile || `Настройки агента ${agentLabel}`;
  });
  document.querySelectorAll("[data-settings-save-hint='global']").forEach((el) => {
    el.innerHTML = globalHtml;
    el.title = "Настройки окна Shell — только в этом браузере (localStorage)";
  });
  if (nodes.ttsSaveHint) {
    nodes.ttsSaveHint.innerHTML = perAgentHtml;
    nodes.ttsSaveHint.title = settingsFile || `Настройки агента ${agentLabel}`;
  }
}

function updateTtsSaveAgentHint(extra = {}) {
  updateSettingsSaveHints(extra);
}

function applyStatusPayload(payload) {
  const prevAgentId = state.agentId;
  if (payload?.agentId) state.agentId = payload.agentId;
  if (payload?.agentId && payload.agentId !== prevAgentId) {
    voiceModeHydratedFromServer = false;
    lastCommittedVoiceMode = "";
  }
  if (payload?.settingsFile) state.settingsFile = payload.settingsFile;
  if (payload?.agentRoot) state.agentRoot = payload.agentRoot;
  if (payload?.state?.meetingRecording != null) {
    state.meetingRecording = Boolean(payload.state.meetingRecording);
    updateVoiceModeSelectUi();
    syncVoiceRecordTimer();
  }
  updateTtsSaveAgentHint(payload);
  syncAgentSelects();
  if (Array.isArray(payload?.availableRuntimes) && payload.availableRuntimes.length) {
    state.availableRuntimes = payload.availableRuntimes.map((item) => normalizeMessageRuntime(item));
  }
  if (Array.isArray(payload?.installedRuntimes)) {
    state.installedRuntimes = payload.installedRuntimes.map((item) => normalizeMessageRuntime(item));
  }
  if (payload?.runtimeStatuses && typeof payload.runtimeStatuses === "object") {
    const incoming = payload.runtimeStatuses;
    if (Object.keys(incoming).length > 0) {
      state.runtimeStatuses = incoming;
    }
  } else {
    const next = { ...(state.runtimeStatuses || {}) };
    if (payload?.qwenpaw) {
      next.qwenpaw = {
        runtime: "qwenpaw",
        configured: true,
        installed: true,
        ...next.qwenpaw,
        ...payload.qwenpaw
      };
    }
    const activeRuntime = normalizeMessageRuntime(payload?.runtime?.runtime || payload?.settings?.messageTarget);
    if (payload?.runtime && activeRuntime !== "qwenpaw") {
      next[activeRuntime] = mergeRuntimeStatusEntry(next[activeRuntime], {
        ...payload.runtime,
        runtime: activeRuntime
      });
    }
    state.runtimeStatuses = next;
  }
  if (payload?.settings) {
    applySettings(payload.settings);
  }
  if (payload?.agentId && payload.agentId !== prevAgentId) {
    commitAllSettingsBaselinesIfSafe();
  }
  state.sidecarConnected = Boolean(payload?.sidecarConnected);
  syncCompactSensorAvailability();
  updateFnPttHint(getVoiceInputMode());
  updateSttEngineNote();
  state.qwenpawServerOk =
    payload?.qwenpaw?.serverOk != null ? Boolean(payload.qwenpaw.serverOk) : state.qwenpawServerOk;
  state.qwenpawAgentOk =
    payload?.qwenpaw?.agentOk != null ? Boolean(payload.qwenpaw.agentOk) : state.qwenpawAgentOk;
  state.qwenpawAgentName =
    payload?.qwenpaw?.agentName != null ? String(payload.qwenpaw.agentName || "") : state.qwenpawAgentName;
  state.qwenpawAgentError =
    payload?.qwenpaw?.agentError != null ? String(payload.qwenpaw.agentError || "") : state.qwenpawAgentError;
  state.qwenpawConnected = payload?.qwenpaw?.ok != null ? Boolean(payload.qwenpaw.ok) : state.qwenpawConnected;
  syncQwenPawPanelAvailability();
  refreshRuntimeSelectLabels();
  syncShellAgentReadyUi();
  const activeRuntime = normalizeMessageRuntime(
    payload?.runtime?.runtime || payload?.settings?.messageTarget || state.settings?.messageTarget
  );
  const activeStatus = getRuntimeStatus(activeRuntime);
  state.runtimeServerOk = Boolean(
    activeStatus?.serverOk ?? activeStatus?.ok ?? payload?.runtime?.serverOk ?? payload?.runtime?.ok
  );
  state.runtimeConnected =
    resolveRuntimeConnectionState(activeRuntime, activeStatus, { implemented: isRuntimeImplemented(activeRuntime) }) ===
    "live";
  state.runtimeError = String(activeStatus?.error || payload?.runtime?.error || "");
  syncDialogConnectionState();
  updateQwenPawChatUi(payload);

  if (payload?.presence) applyVoicePresence(payload.presence);

  if (payload?.state && isShellAgentWorkActive()) {
    const phase = resolveDisplayPhase(payload.state.phase);
    const phrase = String(payload.state.phrase || "").trim();
    const metrics = String(payload.state.metrics || "").trim();
    if (phase === "thinking" && (phrase || metrics)) {
      syncAgentActivityFromPhrase(phrase, metrics);
    }
  }

  if (state.sessionUiLocked) return;

  if (payload?.state) {
    onShellPhaseChange(payload.state);
    state.shellState = payload.state;
    state.stopTtsAt = Number(payload.state.stopTtsAt) || 0;
    state.pttHeld = Boolean(payload.state.pttHeld) && Boolean(payload.sidecarConnected);
    renderPhase(
      resolveDisplayPhase(payload.state.phase),
      livePhraseFromStatus(payload.state, payload.latestAgentMessage),
      payload.state.metrics
    );
    if ((payload.state.phase || "waiting") === "waiting") {
      recoverStuckMessagePipeline("status waiting");
    }
    maybeResetStaleSpeakingPhase();
    if (state.pttHeld) setMicButtonState("Стоп", { active: true });
    else if (!state.micActive && !state.pttHeld && !isMicSessionUiActive()) setMicButtonState("Говорить");
    syncVoiceRecordTimer();
  }
  if (payload?.latestAgentMessage?.body) {
    const streaming = state.assistantStream && !state.assistantStream.finalized;
    if (!streaming && !shellSession?.isReplyAlreadyDisplayed(payload.latestAgentMessage)) {
      renderShellReply(payload.latestAgentMessage);
      shellSession?.markReplyDisplayed(payload.latestAgentMessage);
    }
  }
}

function needsSidecar(mode = getVoiceInputMode()) {
  const m = normalizeVoiceInputMode(mode);
  if (voiceModeRequiresSidecar(m)) return true;
  return isVoiceGlobalListen() && (m === "hold" || m === "fn_button");
}

async function resolveShellAgent() {
  const data = await loadAgentSelectData();
  const selectable = getSelectableAgents(data.agents);
  const candidates = [state.agentId, data.defaultAgentId].filter(Boolean);

  let nextId = "";
  for (const id of candidates) {
    if (selectable.some((agent) => agent.id === id)) {
      nextId = id;
      break;
    }
  }
  if (!nextId) nextId = selectable[0]?.id || "";

  if (nextId) {
    state.agentId = nextId;
    localStorage.setItem(SHELL_STORAGE.agent, nextId);
  }
  const agent = selectable.find((entry) => entry.id === state.agentId);
  state.agentLabel = agent?.name || state.agentId || "";
  syncAgentSelects();
  updateSettingsSaveHints();
  shellPresenceController?.setAgentId(state.agentId);
  syncShellAgentReadyUi();
}

async function refreshStatus({ probe = false, sync = false, timeoutMs = 0 } = {}) {
  const query = [];
  if (probe) query.push("probe=1");
  if (sync) query.push("sync=1");
  const suffix = query.length ? `?${query.join("&")}` : "";
  const payload = await apiFetch(`/api/shell/status${suffix}`, { timeoutMs });
  applyStatusPayload(payload);
}

async function loadWindowSettings() {
  let settings = readWindowSettingsFromStorage();
  try {
    const data = await apiFetch("/api/shell/window");
    const remote = normalizeWindowSettings(data.settings);
    settings = normalizeWindowSettings({ ...(settings || {}), ...remote });
    writeWindowSettingsToStorage(settings);
  } catch {
    settings = normalizeWindowSettings(settings || {});
  }
  applyWindowSettings(settings);
  if (!settingsSave.isSectionDirty("window")) {
    settingsSave.commitBaseline("window", collectWindowSnapshot());
  }
}

async function saveWindowSettings(patch) {
  try {
    const local = writeWindowSettingsToStorage(patch);
    applyWindowSettings(local);
    const data = await apiFetch("/api/shell/window", {
      method: "POST",
      body: JSON.stringify({ settings: patch })
    });
    const settings = normalizeWindowSettings(data?.settings || local);
    writeWindowSettingsToStorage(settings);
    applyWindowSettings(settings);
    return settings;
  } catch (error) {
    renderPhase("waiting", error.message);
    throw error;
  }
}

async function saveSettings(patch, { apply = "full" } = {}) {
  try {
    const data = await apiFetch("/api/shell/settings", {
      method: "POST",
      body: JSON.stringify({ settings: patch })
    });
    if (data.settingsFile) state.settingsFile = data.settingsFile;
    if (data.agentRoot) state.agentRoot = data.agentRoot;
    if (data.agentId) state.agentId = data.agentId;
    updateTtsSaveAgentHint(data);
    const settings = data.settings;
    if (settings) {
      state.settings = { ...(state.settings || {}), ...settings };
      if (Object.prototype.hasOwnProperty.call(patch || {}, "dialogScrollRatio")) {
        lastSavedDialogScrollRatio = readDialogScrollRatioFromSettings(settings);
      }
    }
    if (apply === "none") return settings;
    if (apply === "tts") applyTtsSummarySettings(settings);
    else if (apply === "stt") applySttSummarySettings(settings);
    else if (apply === "route") applyRouteSummarySettings(settings);
    else if (apply === "full") applySettings(settings);
    return settings;
  } catch (error) {
    renderPhase("waiting", error.message);
    throw error;
  }
}

function renderComposeDraftStatus(kind = "idle") {
  const el = nodes.composeDraftStatus;
  if (!el) return;
  el.classList.remove("is-saving", "is-saved", "is-error");
  const pathTitle = ".agent-shell/compose-draft.md";
  if (kind === "idle") {
    el.textContent = "";
    el.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
  if (kind === "saving") {
    el.textContent = "сохранение…";
    el.classList.add("is-saving");
    el.title = `Сохранение · ${pathTitle}`;
  } else if (kind === "saved") {
    el.textContent = "сохранено";
    el.classList.add("is-saved");
    el.title = `Сохранено · ${pathTitle}`;
  } else if (kind === "error") {
    el.textContent = "не сохранено";
    el.classList.add("is-error");
    el.title = `Не сохранено · ${pathTitle}`;
  } else if (kind === "dirty") {
    el.textContent = "изменено";
    el.title = `Изменено · ${pathTitle}`;
  }
}

function scheduleComposeDraftSave() {
  clearTimeout(composeDraftSaveTimer);
  const body = String(nodes.message?.value || "");
  if (!body.trim()) {
    renderComposeDraftStatus("idle");
    composeDraftSaveTimer = setTimeout(() => void persistComposeDraft(""), COMPOSE_DRAFT_SAVE_MS);
    return;
  }
  if (body !== composeDraftSavedText) {
    renderComposeDraftStatus("dirty");
  }
  composeDraftSaveTimer = setTimeout(() => void persistComposeDraft(body), COMPOSE_DRAFT_SAVE_MS);
}

async function persistComposeDraft(body) {
  const text = String(body ?? "");
  if (text === composeDraftSavedText) {
    renderComposeDraftStatus(text ? "saved" : "idle");
    return;
  }
  if (composeDraftSaveInFlight) {
    await composeDraftSaveInFlight.catch(() => {});
    if (text === composeDraftSavedText) {
      renderComposeDraftStatus(text ? "saved" : "idle");
      return;
    }
  }
  renderComposeDraftStatus("saving");
  composeDraftSaveInFlight = apiFetch("/api/shell/compose-draft", {
    method: "POST",
    body: JSON.stringify({ body: text })
  })
    .then(() => {
      composeDraftSavedText = text;
      renderComposeDraftStatus(text ? "saved" : "idle");
    })
    .catch(() => {
      renderComposeDraftStatus("error");
    })
    .finally(() => {
      composeDraftSaveInFlight = null;
    });
  await composeDraftSaveInFlight;
}

async function loadComposeDraft() {
  try {
    const data = await apiFetch("/api/shell/compose-draft");
    const body = String(data.body || "");
    composeDraftSavedText = body;
    if (body && nodes.message && !String(nodes.message.value || "").trim()) {
      nodes.message.value = body;
      updateSendButtonLabel();
    }
    renderComposeDraftStatus(body ? "saved" : "idle");
  } catch {
    renderComposeDraftStatus("idle");
  }
}

async function clearComposeDraft() {
  clearTimeout(composeDraftSaveTimer);
  composeDraftSavedText = "";
  renderComposeDraftStatus("idle");
  try {
    await apiFetch("/api/shell/compose-draft", {
      method: "POST",
      body: JSON.stringify({ body: "" })
    });
  } catch {
    // ignore
  }
}

function setComposeMessageValue(value, { save = true } = {}) {
  if (!nodes.message) return;
  nodes.message.value = String(value ?? "");
  updateSendButtonLabel();
  if (save) scheduleComposeDraftSave();
}

function isVoiceToComposeEnabled() {
  return Boolean(nodes.voiceToCompose?.checked ?? state.settings?.voiceToCompose);
}

function appendVoiceToCompose(text, options = {}) {
  const trimmed = String(text || "").trim();
  if (!trimmed || !nodes.message) return;
  const current = String(nodes.message.value || "").trimEnd();
  const separator =
    options.join === "newline" ? (current.endsWith("\n") ? "" : "\n") : current ? " " : "";
  const next = current ? `${current}${separator}${trimmed}` : trimmed;
  setComposeMessageValue(next);
  nodes.message.focus();
  const len = nodes.message.value.length;
  try {
    nodes.message.setSelectionRange(len, len);
  } catch {
    // ignore
  }
}

function bindCmsComposeInsertBridge() {
  if (!shellEmbedMode) return;
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== "agent-cms-voice:compose-insert") return;
    appendVoiceToCompose(data.text, { join: data.join });
  });
}

function bindCmsPagePickerBridge() {
  if (!shellEmbedMode) return;
  const btn = document.getElementById("shell-page-picker-btn");
  if (!btn || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";
  btn.hidden = false;

  let active = false;

  const syncUi = (next) => {
    active = Boolean(next);
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  };

  btn.addEventListener("click", () => {
    syncUi(!active);
    window.parent.postMessage({ type: "agent-cms-voice:page-picker-set", active }, "*");
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    if (data.type !== "agent-cms-voice:page-picker-state") return;
    syncUi(Boolean(data.active));
  });
}

function applyRemoteComposeDraft(body) {
  const text = String(body ?? "");
  composeDraftSavedText = text;
  if (nodes.message) {
    nodes.message.value = text;
    updateSendButtonLabel();
  }
  renderComposeDraftStatus(text ? "saved" : "idle");
  if (text) {
    nodes.message?.focus();
    const len = text.length;
    try {
      nodes.message?.setSelectionRange(len, len);
    } catch {
      // ignore
    }
  }
}

let composeDockAnchor = null;
let composeScrollLockY = 0;

function mountComposeFullscreenDom(expanded) {
  const dock = nodes.composeDock;
  const backdrop = nodes.composeExpandBackdrop;
  if (!dock) return;

  if (expanded) {
    if (!composeDockAnchor) {
      composeDockAnchor = {
        dockParent: dock.parentNode,
        dockNext: dock.nextSibling,
        backdropParent: backdrop?.parentNode || null,
        backdropNext: backdrop?.nextSibling || null
      };
    }
    if (backdrop) document.body.appendChild(backdrop);
    document.body.appendChild(dock);
    return;
  }

  if (!composeDockAnchor) return;
  const { dockParent, dockNext, backdropParent, backdropNext } = composeDockAnchor;
  if (backdrop && backdropParent) {
    backdropParent.insertBefore(backdrop, backdropNext);
  }
  dockParent.insertBefore(dock, dockNext);
}

function lockComposePageScroll() {
  composeScrollLockY = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.style.position = "fixed";
  document.body.style.top = `-${composeScrollLockY}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
}

function unlockComposePageScroll() {
  const y = composeScrollLockY;
  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  window.scrollTo(0, y);
  composeScrollLockY = 0;
}

const COMPOSE_OPTION_KEYS = ["reasoning", "tools", "memory", "execute"];
const COMPOSE_OPTIONS_STORAGE = "shell-compose-option-toggles";

function readComposeOptionToggles() {
  try {
    const raw = JSON.parse(localStorage.getItem(COMPOSE_OPTIONS_STORAGE) || "{}");
    return Object.fromEntries(COMPOSE_OPTION_KEYS.map((key) => [key, Boolean(raw?.[key])]));
  } catch {
    return Object.fromEntries(COMPOSE_OPTION_KEYS.map((key) => [key, false]));
  }
}

function writeComposeOptionToggles(map) {
  try {
    localStorage.setItem(COMPOSE_OPTIONS_STORAGE, JSON.stringify(map));
  } catch {
    /* ignore quota */
  }
}

function applyComposeOptionToggles() {
  const map = readComposeOptionToggles();
  document.querySelectorAll("[data-compose-option]").forEach((btn) => {
    const key = btn.dataset.composeOption;
    if (!COMPOSE_OPTION_KEYS.includes(key)) return;
    const on = Boolean(map[key]);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  });
}

function bindComposeOptionTabs() {
  document.querySelectorAll("[data-compose-option]").forEach((btn) => {
    if (btn.dataset.shellBound === "1") return;
    btn.dataset.shellBound = "1";
    btn.addEventListener("click", () => {
      const key = btn.dataset.composeOption;
      if (!COMPOSE_OPTION_KEYS.includes(key)) return;
      const map = readComposeOptionToggles();
      map[key] = !map[key];
      writeComposeOptionToggles(map);
      btn.setAttribute("aria-pressed", map[key] ? "true" : "false");
    });
  });
  document.querySelectorAll("[data-compose-action='params-preview']").forEach((btn) => {
    if (btn.dataset.shellBound === "1") return;
    btn.dataset.shellBound = "1";
    btn.addEventListener("click", () => {
      void openComposeParamsPreview(btn);
    });
  });
  applyComposeOptionToggles();
}

function detectComposeDeviceSurface() {
  const ua = String(navigator.userAgent || "");
  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  let os = "desktop";
  if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac/i.test(ua)) os = "macOS";
  else if (/Win/i.test(ua)) os = "Windows";
  else if (/Linux/i.test(ua)) os = "Linux";

  let browser = "browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox/i.test(ua)) browser = "Firefox";

  const form = mobile ? "mobile" : "desktop";
  return `${form} · ${os} · ${browser}`;
}

function summarizePromptSetting(value) {
  const text = String(value || "").trim();
  if (!text) return "— (пусто)";
  if (text.length <= 48) return text;
  return `задан (${text.length} симв.)`;
}

function buildComposeParamsPreviewRows() {
  const settings = state.settings || {};
  const toggles = readComposeOptionToggles();
  const outbound = collectOutboundMessageSettings();
  const runtime = normalizeMessageRuntime(settings.messageTarget || nodes.messageTarget?.value || "qwenpaw");
  const voiceMode = String(settings.voiceInputMode || nodes.voiceMode?.value || "hold").trim() || "hold";
  const locationEnabled = isShellLocationShareEnabled();
  const location = locationEnabled ? getShellDeviceLocation() : null;

  return [
    {
      key: "{{device}}",
      value: detectComposeDeviceSurface(),
      target: "контекст устройства"
    },
    {
      key: "{{tts_enabled}}",
      value: outbound.ttsEnabled ? "true" : "false",
      target: "Shell → озвучка ответа"
    },
    {
      key: "{{stt_enabled}}",
      value: settings.sttEnabled !== false ? "true" : "false",
      target: "Shell → голосовой ввод"
    },
    {
      key: "{{voice_mode}}",
      value: voiceMode,
      target: "режим микрофона"
    },
    {
      key: "{{runtime}}",
      value: runtime,
      target: "маршрут / runtime"
    },
    {
      key: "{{proactive_enabled}}",
      value: settings.proactiveEnabled ? "true" : "false",
      target: "таймер Shell (не агенту)"
    },
    {
      key: "{{system_prompt}}",
      value: summarizePromptSetting(settings.systemPrompt || nodes.systemPrompt?.value),
      target: "system → агент"
    },
    {
      key: "{{tts_prompt}}",
      value: summarizePromptSetting(settings.ttsPrompt || nodes.ttsPrompt?.value),
      target: "формат ответа (идея)"
    },
    {
      key: "{{stt_prompt}}",
      value: summarizePromptSetting(settings.sttPrompt || nodes.sttPrompt?.value),
      target: "очистка STT до агента"
    },
    {
      key: "{{reasoning}}",
      value: toggles.reasoning ? "true" : "false",
      target: "кнопка compose (идея)"
    },
    {
      key: "{{tools}}",
      value: toggles.tools ? "true" : "false",
      target: "кнопка compose (идея)"
    },
    {
      key: "{{memory}}",
      value: toggles.memory ? "true" : "false",
      target: "кнопка compose (идея)"
    },
    {
      key: "{{execute}}",
      value: toggles.execute ? "true" : "false",
      target: "кнопка compose (идея)"
    },
    {
      key: "{{location}}",
      value: location
        ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
        : locationEnabled
          ? "ожидание GPS"
          : "false",
      target: "блок [Контекст устройства]"
    },
    {
      key: "{{host_url}}",
      value: String(outbound.hostUrl || window.location.href || "").trim(),
      target: "метаданные запроса"
    }
  ];
}

function renderComposeParamsPreview() {
  const body = nodes.composeParamsBody;
  if (!body) return;
  body.replaceChildren();
  for (const row of buildComposeParamsPreviewRows()) {
    const tr = document.createElement("tr");
    const keyCell = document.createElement("td");
    const valueCell = document.createElement("td");
    const targetCell = document.createElement("td");
    keyCell.innerHTML = `<code>${escapeHtml(row.key)}</code>`;
    valueCell.textContent = row.value;
    targetCell.textContent = row.target;
    tr.append(keyCell, valueCell, targetCell);
    body.append(tr);
  }
}

async function openComposeParamsPreview(triggerBtn = null) {
  const dialog = nodes.composeParamsDialog;
  if (!dialog) return;
  renderComposeParamsPreview();
  triggerBtn?.setAttribute("aria-expanded", "true");
  try {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  } catch {
    dialog.setAttribute("open", "");
  }
}

function closeComposeParamsPreview() {
  const dialog = nodes.composeParamsDialog;
  if (!dialog) return;
  dialog.close?.();
  dialog.removeAttribute("open");
  document
    .querySelectorAll("[data-compose-action='params-preview']")
    .forEach((btn) => btn.setAttribute("aria-expanded", "false"));
}

function bindComposeParamsPreview() {
  nodes.composeParamsClose?.addEventListener("click", () => closeComposeParamsPreview());
  nodes.composeParamsDialog?.addEventListener("close", () => closeComposeParamsPreview());
  nodes.composeParamsDialog?.addEventListener("cancel", () => closeComposeParamsPreview());
}

function escapeHtml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function setComposeExpanded(next) {
  const expanded = Boolean(next);
  if (expanded === composeDraftExpanded) return;

  composeDraftExpanded = expanded;
  mountComposeFullscreenDom(expanded);
  if (expanded) lockComposePageScroll();
  else unlockComposePageScroll();

  nodes.composeDock?.classList.toggle("is-expanded", expanded);
  nodes.composePanel?.classList.toggle("is-compose-fullscreen", expanded);
  nodes.composeField?.classList.toggle("is-expanded", expanded);
  nodes.composeExpandBackdrop?.classList.toggle("hidden", !expanded);
  if (nodes.composeExpandBackdrop) {
    nodes.composeExpandBackdrop.hidden = !expanded;
  }
  nodes.composeExpandToggle?.setAttribute("aria-pressed", expanded ? "true" : "false");
  nodes.composeExpandToggle?.setAttribute(
    "aria-label",
    expanded ? "Свернуть" : "Развернуть на весь экран"
  );
  nodes.composeExpandToggle?.setAttribute(
    "title",
    expanded ? "Свернуть (Esc)" : "Развернуть на весь экран"
  );
  document.body.classList.toggle("shell-compose-expanded", expanded);
  document.body.classList.toggle("shell-compose-fullscreen", expanded);
  if (expanded) {
    nodes.message?.focus();
  }
}

function toggleComposeExpanded() {
  setComposeExpanded(!composeDraftExpanded);
}

async function patchShellState(patch) {
  const data = await apiFetch("/api/shell/state", {
    method: "POST",
    body: JSON.stringify({ state: patch })
  });
  state.shellState = data.state;
  renderPhase(data.state.phase, data.state.phrase, data.state.metrics);
}

async function sendMessage(body, { fromCompose = true, voice = false } = {}) {
  const text = String(body || "").trim();
  if (!text) return;
  if (!canUseShellMessaging()) {
    renderPhase("waiting", shellAgentLockHint() || "Выберите хранилище (агента) в шапке");
    return;
  }
  shellProactive?.bumpActivity();

  if (fromCompose && nodes.message) {
    nodes.message.value = "";
    updateSendButtonLabel();
    void clearComposeDraft();
    refocusComposeInput();
    composeLayout?.syncKeyboardViewport?.();
  }

  if (state.messagePipelineBusy) {
    outboundQueue.push({ id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text, voice });
    renderMessageQueue();
    renderPhase(
      state.shellState?.phase || "thinking",
      `Печатает…${queuePhraseSuffix()}`
    );
    return;
  }

  await sendMessageDirect(text, { fromCompose, voice });
}

async function sendProactiveMessage(idleSeconds) {
  hapticTap();
  shellLog("proactive", `Отправка (idle ${idleSeconds}s)`);
  const template = resolveProactivePromptTemplate();
  await sendMessageDirect(buildProactiveMessage(idleSeconds, template), {
    fromCompose: false,
    voice: false,
    author: "shell/proactive",
    displayPhrase: "Проактивность…",
    showInDialog: false
  });
}

function handleSendMessageError(error, { streamingQwenPaw = false } = {}) {
  if (state.messageStopped || error?.name === "AbortError") {
    releaseMessagePipeline();
    updateSendButtonLabel();
    return;
  }
  if (streamingQwenPaw && state.assistantStream && !state.assistantStream.finalized) {
    setReplyPanelStreaming(false);
    state.assistantStream = null;
  }
  if (state.assistantStream?.finalized) return;
  state.processingMessage = "";
  renderMessageQueue();
  shellDialog.setError(error.message, { hint: shellDialog.connectionHint(error) });
  renderPhase("waiting", error.message);
  releaseMessagePipeline();
}

function handleSendMessageResult(result, { streamingQwenPaw = false } = {}) {
  if (result?.sttRefined && nodes.message && String(result.sttRefined) !== state.processingMessage) {
    setComposeMessageValue(String(result.sttRefined));
  }
  if (state.messageStopped) {
    releaseMessagePipeline();
    return;
  }
  if (result?.accepted) {
    updateSendButtonLabel();
    armMessagePipelineWatchdog();
    return;
  }
  if (result?.reply || result?.message?.body) {
    void shellDialog.refreshHistory?.();
    void handleAssistantMessage(
      result.message || {
        body: result.reply,
        streamId: result.streamId,
        spokenText: result.spokenText,
        spokenParts: result.spokenParts,
        ttsClientId: result.ttsClientId
      }
    );
    return;
  }
  if (!streamingQwenPaw && !(state.assistantStream && !state.assistantStream.finalized)) {
    releaseMessagePipeline();
  }
}

async function sendMessageDirect(
  body,
  { fromCompose = false, voice = false, author = "shell", displayPhrase = "", showInDialog = true } = {}
) {
  const text = String(body || "").trim();
  if (!text) return;
  shellLog("message", `${author}${voice ? " · voice" : ""}`, text.slice(0, 160));
  shellProactive?.bumpActivity();
  void unlockShellAudio();
  shellSession?.setSessionUiLocked(true);
  shellSession?.resetStreamRenderState();
  state.messageStopped = false;
  state.messagePipelineBusy = true;
  state.processingMessage = text;
  state.pendingReplyTtsClientId = getShellPresenceClientId();
  shellPresenceController?.ping({ interact: true });
  renderMessageQueue();
  updateSendButtonLabel();
  const target = normalizeMessageRuntime(state.settings?.messageTarget || nodes.messageTarget?.value || "qwenpaw");
  const streamingQwenPaw = usesQwenPawTarget(target);
  beginAssistantStream({});
  messageSendAbortController?.abort();
  messageSendAbortController = new AbortController();
  const { signal } = messageSendAbortController;
  try {
    if (isShellLocationShareEnabled()) {
      void refreshShellLocationForSend();
    }
    shellDialog.clearError();
    if (showInDialog) shellDialog.onUserMessage(text);
    void apiFetch("/api/shell/message", {
      method: "POST",
      body: JSON.stringify({
        body: text,
        author,
        displayPhrase: displayPhrase || undefined,
        voice: Boolean(voice),
        shellClientId: getShellPresenceClientId(),
        ...collectOutboundMessageSettings()
      }),
      signal
    })
      .then((result) => handleSendMessageResult(result, { streamingQwenPaw }))
      .catch((error) => handleSendMessageError(error, { streamingQwenPaw }));
  } catch (error) {
    handleSendMessageError(error, { streamingQwenPaw });
  } finally {
    if (messageSendAbortController?.signal === signal) {
      messageSendAbortController = null;
    }
    updateSendButtonLabel();
  }
}

function getSpeechSynth() {
  return window.speechSynthesis || null;
}

function insertTtsPromptTemplate() {
  if (!nodes.ttsPrompt) return;
  const template = String(shellPromptTemplates.ttsPrompt || DEFAULT_TTS_PROMPT).trim() || DEFAULT_TTS_PROMPT;
  nodes.ttsPrompt.value = template;
  state.settings = { ...(state.settings || {}), ttsPrompt: template };
  markSettingsDirty("tts");
}

function insertSttPromptTemplate() {
  if (!nodes.sttPrompt) return;
  const template = String(shellPromptTemplates.sttPrompt || DEFAULT_STT_PROMPT).trim() || DEFAULT_STT_PROMPT;
  nodes.sttPrompt.value = template;
  state.settings = { ...(state.settings || {}), sttPrompt: template };
  markSettingsDirty("stt");
}

function insertSystemPromptTemplate() {
  if (!nodes.systemPrompt) return;
  const template =
    String(shellPromptTemplates.systemPrompt || DEFAULT_SYSTEM_PROMPT).trim() || DEFAULT_SYSTEM_PROMPT;
  nodes.systemPrompt.value = template;
  state.settings = { ...(state.settings || {}), systemPrompt: template };
  markSettingsDirty("route");
}

function insertProactivePromptTemplate() {
  if (!nodes.proactivePrompt) return;
  const template =
    String(shellPromptTemplates.proactivePrompt || DEFAULT_PROACTIVE_PROMPT).trim() ||
    DEFAULT_PROACTIVE_PROMPT;
  nodes.proactivePrompt.value = template;
  state.settings = { ...(state.settings || {}), proactivePrompt: template };
  markSettingsDirty("proactive");
}

function resolveProactivePromptTemplate() {
  const custom = String(state.settings?.proactivePrompt || nodes.proactivePrompt?.value || "").trim();
  if (custom) return custom;
  return (
    String(shellPromptTemplates.proactivePrompt || DEFAULT_PROACTIVE_PROMPT).trim() ||
    DEFAULT_PROACTIVE_PROMPT
  );
}

async function loadShellPromptTemplates() {
  try {
    const data = await apiFetch("/api/shell/prompt-templates");
    shellPromptTemplates = {
      ttsPrompt: String(data.ttsPrompt || DEFAULT_TTS_PROMPT).trim() || DEFAULT_TTS_PROMPT,
      sttPrompt: String(data.sttPrompt || DEFAULT_STT_PROMPT).trim() || DEFAULT_STT_PROMPT,
      proactivePrompt:
        String(data.proactivePrompt || DEFAULT_PROACTIVE_PROMPT).trim() || DEFAULT_PROACTIVE_PROMPT,
      systemPrompt:
        String(data.systemPrompt || DEFAULT_SYSTEM_PROMPT).trim() || DEFAULT_SYSTEM_PROMPT,
      sources: {
        ttsPrompt: data.sources?.ttsPrompt || null,
        sttPrompt: data.sources?.sttPrompt || null,
        proactivePrompt: data.sources?.proactivePrompt || null,
        systemPrompt: data.sources?.systemPrompt || null
      }
    };
  } catch {
    shellPromptTemplates = {
      ttsPrompt: DEFAULT_TTS_PROMPT,
      sttPrompt: DEFAULT_STT_PROMPT,
      proactivePrompt: DEFAULT_PROACTIVE_PROMPT,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      sources: { ttsPrompt: null, sttPrompt: null, proactivePrompt: null, systemPrompt: null }
    };
  }
}

function hasTtsPrompt() {
  return Boolean(String(state.settings?.ttsPrompt || nodes.ttsPrompt?.value || "").trim());
}

function buildSpeechPayloadSync(body) {
  return prepareSpeechText(body, state.settings || {});
}

function buildSpeechParts(body, message = {}) {
  if (Array.isArray(message?.spokenParts) && message.spokenParts.length) {
    return message.spokenParts
      .map((part) => prepareTtsStreamChunk(String(part || "").trim()))
      .filter(Boolean);
  }
  const spoken = String(message?.spokenText || "").trim();
  if (spoken) {
    const chunk = prepareTtsStreamChunk(spoken);
    return chunk ? [chunk] : [];
  }
  if (hasTtsPrompt()) {
    const parsed = parseDualReply(body);
    if (parsed.spokenParts?.length) {
      return parsed.spokenParts.map((part) => prepareTtsStreamChunk(part)).filter(Boolean);
    }
    if (parsed.spoken) {
      const chunk = prepareTtsStreamChunk(parsed.spoken);
      return chunk ? [chunk] : [];
    }
    return [];
  }
  const fallback = prepareTtsStreamChunk(buildSpeechPayloadSync(body));
  return fallback ? [fallback] : [];
}

function buildSpeechPayload(body, message = {}) {
  const parts = buildSpeechParts(body, message);
  return parts.length ? parts.join("\n\n") : "";
}

function createSpeechUtterance(text) {
  const settings = { ...(state.settings || {}), ...collectTtsFormPatch() };
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = settings.ttsBrowserLang || "ru-RU";
  utterance.rate = Math.min(2, Math.max(0.5, Number(settings.ttsRate) || 1));
  utterance.pitch = Math.min(2, Math.max(0, Number(settings.ttsPitch) || 1));
  const voiceName = String(settings.ttsBrowserVoice ?? "").trim();
  if (voiceName) {
    const voices = filterLocalWebSpeechVoices(getSpeechSynth()?.getVoices() || []);
    const voice = voices.find((item) => item.name === voiceName || item.voiceURI === voiceName);
    if (voice) utterance.voice = voice;
  }
  return utterance;
}

function appendBrowserVoiceOptions(selectEl, voices, current) {
  for (const voice of voices) {
    const opt = document.createElement("option");
    opt.value = voice.name;
    opt.textContent = formatWebSpeechVoiceLabel(voice);
    if (voice.name === current) opt.selected = true;
    selectEl.append(opt);
  }
}

let browserVoiceRefreshSeq = 0;

async function refreshTtsVoiceOptions() {
  if (!nodes.ttsVoice) return;
  const seq = ++browserVoiceRefreshSeq;
  const lang = String(nodes.ttsLang?.value || state.settings?.ttsBrowserLang || "ru-RU").toLowerCase();
  const langPrefix = lang.split("-")[0];
  const current = nodes.ttsVoice.value || state.settings?.ttsBrowserVoice || "";
  nodes.ttsVoice.innerHTML = '<option value="">Системный по умолчанию</option>';

  const allVoices = await loadWebSpeechVoices();
  if (seq !== browserVoiceRefreshSeq) return;

  const voices = allVoices
    .filter((voice) => voiceLangPrefix(voice) === langPrefix)
    .sort(compareWebSpeechVoices);

  appendBrowserVoiceOptions(nodes.ttsVoice, voices, current);
  if (current && !voices.some((voice) => voice.name === current)) {
    nodes.ttsVoice.value = "";
  }

  if (!voices.length) {
    const empty = document.createElement("option");
    empty.disabled = true;
    empty.textContent = "Нет локальных голосов для выбранного языка";
    nodes.ttsVoice.append(empty);
  }
}

function updateTtsRateLabel() {
  if (!nodes.ttsRateValue || !nodes.ttsRate) return;
  nodes.ttsRateValue.textContent = Number(nodes.ttsRate.value || 1).toFixed(1);
}

function updateTtsPitchLabel() {
  if (!nodes.ttsPitchValue || !nodes.ttsPitch) return;
  nodes.ttsPitchValue.textContent = Number(nodes.ttsPitch.value || 1).toFixed(1);
}

function preventDetailsToggleOnControl(el) {
  if (!el) return;
  for (const type of ["click", "mousedown", "pointerdown"]) {
    el.addEventListener(type, (event) => event.stopPropagation());
  }
}

function bindVoiceSettingsExpandToggle(button) {
  if (!button) return;
  const details = button.closest("details");
  if (!details) return;
  const sync = () => {
    button.setAttribute("aria-expanded", details.open ? "true" : "false");
  };
  details.addEventListener("toggle", sync);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    details.open = !details.open;
  });
  sync();
}

function applyRecognitionLang(lang) {
  const code = lang || nodes.sttLang?.value || state.settings?.sttLang || "ru-RU";
  if (state.recognition) state.recognition.lang = code;
}

let voiceRecordTimerId = 0;

function isVoiceRecordingActive() {
  return Boolean(
    state.meetingRecording ||
      state.pttHeld ||
      state.pttKeyboardHeld ||
      state.micPointerHeld ||
      state.micTapHeld ||
      state.micActive
  );
}

function formatVoiceRecordElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function tickVoiceRecordTimer() {
  if (!isVoiceRecordingActive()) {
    stopVoiceRecordTimer(false);
    return;
  }
  updateComposeVoiceUi(getVoiceInputMode());
}

function stopVoiceRecordTimer(refreshHint = true) {
  if (voiceRecordTimerId) {
    clearInterval(voiceRecordTimerId);
    voiceRecordTimerId = 0;
  }
  state.voiceRecordStartedAt = 0;
  if (refreshHint) updateFnPttHint(getVoiceInputMode());
}

function startVoiceRecordTimer() {
  if (!state.voiceRecordStartedAt) state.voiceRecordStartedAt = Date.now();
  if (!voiceRecordTimerId) {
    voiceRecordTimerId = window.setInterval(tickVoiceRecordTimer, 250);
  }
  tickVoiceRecordTimer();
}

function syncVoiceRecordTimer() {
  if (isVoiceRecordingActive()) startVoiceRecordTimer();
  else stopVoiceRecordTimer();
}

function getComposeVoiceSourceLabel(settings = state.settings) {
  const mode = getVoiceInputMode();
  const ctx = getVoiceModeContext(settings);
  const configured = readVoiceInputSourceFromDom(settings);
  const resolved = resolveSttSource(mode, ctx);
  let label =
    resolved === "sidecar"
      ? state.sidecarConnected
        ? STT_SOURCE_LABELS.sidecar
        : "sidecar?"
      : STT_SOURCE_LABELS.browser;
  if (configured === "auto") label += " (авто)";
  return label;
}

function composeVoiceSourceBadgeTitle(mode, ctx, configuredSource) {
  const resolved = resolveSttSource(mode, ctx);
  const sidecar = resolved === "sidecar";
  const autoPrefix = configuredSource === "auto" ? "Авто → " : "";
  if (sidecar) {
    return state.sidecarConnected
      ? `${autoPrefix}Источник: sidecar`
      : `${autoPrefix}Источник: sidecar (не запущен)`;
  }
  return `${autoPrefix}Источник: микрофон браузера`;
}

function refreshComposeMicTitle(mode = getVoiceInputMode()) {
  if (!nodes.micBtn || isMicPhysicalHold()) return;
  if (nodes.sttEnabled?.checked === false) {
    nodes.micBtn.title = "Голосовой ввод выключен";
    return;
  }
  const parts = [];
  if (isVoiceRecordingActive() && state.voiceRecordStartedAt > 0) {
    parts.push(`🔴 ${formatVoiceRecordElapsed(Date.now() - state.voiceRecordStartedAt)}`);
  }
  parts.push(voiceModeMicLabel(mode, { meetingRecording: state.meetingRecording }));
  parts.push(getComposeVoiceSourceLabel());
  nodes.micBtn.title = parts.join(" · ");
}

function updateComposeVoiceUi(mode = getVoiceInputMode()) {
  const ctx = getVoiceModeContext();
  const configuredSource = readVoiceInputSourceFromDom();
  const resolvedSource = resolveSttSource(mode, ctx);

  if (nodes.voiceControl) {
    nodes.voiceControl.dataset.sttSource = resolvedSource;
    nodes.voiceControl.dataset.sttSourceConfigured = configuredSource;
    updateVoiceModeHint(mode, nodes.voiceControl, {
      resolvedSource,
      sidecarConnected: state.sidecarConnected
    });
  }

  if (nodes.voiceSourceBadge) {
    const sidecar = resolvedSource === "sidecar";
    nodes.voiceSourceBadge.textContent = sidecar ? "SC" : "WEB";
    nodes.voiceSourceBadge.title = composeVoiceSourceBadgeTitle(mode, ctx, configuredSource);
    nodes.voiceSourceBadge.classList.toggle("is-warn", sidecar && !state.sidecarConnected);
    nodes.voiceSourceBadge.classList.toggle("is-sidecar", sidecar);
    nodes.voiceSourceBadge.classList.toggle("is-browser", !sidecar);
  }

  if (nodes.voiceMode && mode !== "disabled") {
    nodes.voiceMode.title = `${VOICE_MODE_LABELS[mode] || mode} · ${getComposeVoiceSourceLabel()}`;
  }

  refreshComposeMicTitle(mode);
}

function updateFnPttHint(mode = getVoiceInputMode()) {
  updateComposeVoiceUi(mode);
}

function updateVoiceToComposeUi() {
  const sttOff = readSttEnabledFromDom() === false;
  if (nodes.voiceToCompose) {
    nodes.voiceToCompose.disabled = sttOff;
  }
}

function updateVoiceModeSelectUi() {
  const sttOff = nodes.sttEnabled?.checked === false;
  const mode = sttOff
    ? "disabled"
    : normalizeVoiceInputMode(nodes.voiceMode?.value || state.sttResumeMode || "hold");
  const micAction = micActionForMode(mode);
  const captureActive = isMicPhysicalHold();
  if (nodes.voiceMode) {
    nodes.voiceMode.disabled = sttOff;
    nodes.voiceMode.title = sttOff
      ? "Голосовой ввод выключен — включите «Голосовой ввод (STT)» выше"
      : VOICE_MODE_HINTS[mode] || `Режим: ${VOICE_MODE_LABELS[mode] || mode}`;
    if (sttOff && document.activeElement === nodes.voiceMode) {
      nodes.voiceMode.blur();
    }
  }
  updateVoiceModeHint(mode);
  if (nodes.voiceControl) nodes.voiceControl.dataset.voiceMode = mode;
  nodes.voiceControl?.classList.toggle("is-disabled", sttOff);
  nodes.voiceControl?.setAttribute("aria-disabled", sttOff ? "true" : "false");
  if (nodes.micBtn) {
    nodes.micBtn.disabled = false;
    nodes.micBtn.classList.toggle("is-voice-locked", sttOff);
    nodes.micBtn.setAttribute("aria-disabled", sttOff ? "true" : "false");
    nodes.micBtn.dataset.voiceAction = micAction;
    nodes.micBtn.classList.toggle("is-meeting-active", Boolean(state.meetingRecording));
  }
  if (sttOff) {
    if (!captureActive) {
      shellTapVoice?.abortSession();
      if (state.pttKeyboardHeld) endPttHold();
      setMicButtonState("Голосовой ввод выключен", { force: true });
    }
  } else if (state.meetingRecording) {
    if (!captureActive) setMicButtonState("Стоп встречи", { active: true });
  } else if (!captureActive && !state.micActive && !state.pttHeld) {
    setMicButtonState(voiceModeMicLabel(mode));
  }
  updateFnPttHint(mode);
  updateVoiceToComposeUi();
  updateComposeGlobalListenUi();
  updateComposeVoiceUi(mode);
}

function populateVoiceModeSelect(selected = getVoiceInputMode()) {
  if (!nodes.voiceMode) return;
  const current = normalizeVoiceInputMode(selected === "disabled" ? state.sttResumeMode || "hold" : selected);
  nodes.voiceMode.innerHTML = "";
  for (const mode of VOICE_INPUT_MODES) {
    const opt = document.createElement("option");
    opt.value = mode;
    opt.textContent = VOICE_MODE_COMPACT_LABELS[mode] || VOICE_MODE_LABELS[mode] || mode;
    if (mode === current) opt.selected = true;
    nodes.voiceMode.append(opt);
  }
  lastCommittedVoiceMode = current;
  updateVoiceModeSelectUi();
}

function syncVoiceModeUi(settings = state.settings) {
  if (!nodes.voiceMode) return;
  if (voiceInputModePersisting) {
    updateVoiceModeSelectUi();
    return;
  }

  const stored = resolveVoiceInputMode(settings);
  const localMode = normalizeVoiceInputMode(
    nodes.voiceMode.value || state.sttResumeMode || lastCommittedVoiceMode || "hold"
  );
  const userLocked = isVoiceModeUserLocked();

  if (!voiceModeHydratedFromServer && !userLocked) {
    if (stored !== localMode) {
      nodes.voiceMode.value = stored;
      state.sttResumeMode = stored;
      lastCommittedVoiceMode = stored;
      if (state.settings) state.settings.voiceInputMode = stored;
    }
    voiceModeHydratedFromServer = true;
  } else if (
    !userLocked &&
    stored !== localMode &&
    lastCommittedVoiceMode === localMode
  ) {
    state.sttResumeMode = localMode;
    if (state.settings) state.settings.voiceInputMode = localMode;
    void persistVoiceInputMode(localMode);
  }

  if (state.pendingVoiceInputMode && stored === normalizeVoiceInputMode(state.pendingVoiceInputMode)) {
    state.pendingVoiceInputMode = null;
  }

  syncSttEnabledUi(settings);
  updateVoiceModeSelectUi();
}

function applySttToggleUi(settings) {
  if (!isMicPhysicalHold()) {
    syncVoiceModeUi(settings);
  }
  if (nodes.voiceGlobalListen && document.activeElement !== nodes.voiceGlobalListen) {
    nodes.voiceGlobalListen.checked = settings.voiceGlobalListen === true;
  }
  updateVoiceToComposeUi();
  updateComposeGlobalListenUi();
  updateFnPttHint(getVoiceInputMode());
  updateSttEngineNote(settings);
}

function updateComposeGlobalListenUi() {
  const wrap = nodes.voiceGlobalWrap;
  if (!wrap) return;
  const mode = getVoiceInputMode();
  const show = mode === "hold" || mode === "fn_button";
  wrap.hidden = !show;
  wrap.classList.toggle("is-active", Boolean(nodes.voiceGlobalListen?.checked));
  wrap.setAttribute("aria-pressed", nodes.voiceGlobalListen?.checked ? "true" : "false");
}

function applySttFormUi(settings) {
  if (nodes.sttPrompt && document.activeElement !== nodes.sttPrompt) {
    nodes.sttPrompt.value = settings.sttPrompt || "";
  }
  if (nodes.sttLang) nodes.sttLang.value = settings.sttLang || "ru-RU";
  if (nodes.sttEngine && document.activeElement !== nodes.sttEngine) {
    nodes.sttEngine.value = normalizeSttEngine(settings.sttEngine);
  }
  if (nodes.sttSource && document.activeElement !== nodes.sttSource) {
    nodes.sttSource.value = normalizeSttSource(settings.voiceInputSource);
  }
  if (nodes.sttWhisperModel && document.activeElement !== nodes.sttWhisperModel) {
    nodes.sttWhisperModel.value = settings.sttWhisperModel || "base";
  }
  if (nodes.sttElevenlabsKey && document.activeElement !== nodes.sttElevenlabsKey) {
    nodes.sttElevenlabsKey.value = settings.sttElevenlabsApiKey || "";
  }
  if (nodes.sttElevenlabsModel && document.activeElement !== nodes.sttElevenlabsModel) {
    nodes.sttElevenlabsModel.value = settings.sttElevenlabsModel || "scribe_v2";
  }
  if (nodes.voiceToCompose && document.activeElement !== nodes.voiceToCompose) {
    nodes.voiceToCompose.checked = Boolean(settings.voiceToCompose);
  }
  if (nodes.voiceConfirm && document.activeElement !== nodes.voiceConfirm) {
    if (settings.voiceResponseEnabled !== undefined) {
      nodes.voiceConfirm.checked = settings.voiceResponseEnabled !== false;
    } else {
      nodes.voiceConfirm.checked = !readVoiceConfirmSetting();
    }
  }
  applyRecognitionLang(settings.sttLang);
  updateSttEngineUi();
}

function updateSttEngineNote(settings = state.settings) {
  const el = nodes.sttEngineNote;
  if (!el) return;
  const mode = getVoiceInputMode();
  const ctx = getVoiceModeContext(settings);
  const resolvedSource = resolveSttSource(mode, ctx);
  const pickedEngine = normalizeSttEngine(settings?.sttEngine);
  const meta = sttEngineCapabilities[pickedEngine] || {};
  const sourceLabel = STT_SOURCE_LABELS[resolvedSource] || resolvedSource;
  const engineLabel = STT_ENGINE_LABELS[pickedEngine] || pickedEngine;
  let text = `Сейчас: режим «${VOICE_MODE_LABELS[mode] || mode}» → ${sourceLabel.toLowerCase()}, движок «${engineLabel}». `;

  if (resolvedSource === "sidecar") {
    text += " Sidecar: npm run shell:sidecar.";
  } else {
    text += " Микрофон вкладки Shell.";
  }

  if (pickedEngine === "auto") {
    text +=
      resolvedSource === "sidecar"
        ? " Авто-движок → Google STT в sidecar."
        : " Авто-движок → Web Speech в браузере.";
  } else if (pickedEngine === "browser") {
    text += " Web Speech API — нужен HTTPS.";
  } else if (pickedEngine === "google") {
    text += " Google STT через sidecar.";
  } else if (pickedEngine === "whisper") {
    text += meta.available === false
      ? ` Whisper: ${meta.hint || "pip install faster-whisper"}.`
      : " Whisper локально в sidecar.";
  } else if (pickedEngine === "elevenlabs") {
    text += meta.available === false
      ? ` Scribe: ${meta.hint || "нужен API key"}.`
      : " ElevenLabs Scribe через sidecar.";
  }

  if (resolvedSource === "browser" && isSidecarSttEngine(pickedEngine)) {
    text += " ⚠ Этот движок нужен sidecar — смените провайдер или режим 🎤.";
  }
  if (resolvedSource === "sidecar" && pickedEngine === "browser") {
    text += " ⚠ Web Speech не работает через sidecar — выберите Google / Whisper / Scribe.";
  }

  if (resolvedSource === "sidecar") {
    text += state.sidecarConnected
      ? " Sidecar подключён."
      : " Запустите sidecar: npm run shell:sidecar";
  }

  el.textContent = text.trim();
  el.classList.toggle(
    "shell-stt-engine-note--warn",
    (resolvedSource === "sidecar" && !state.sidecarConnected) ||
      (resolvedSource === "browser" && isSidecarSttEngine(pickedEngine)) ||
      (resolvedSource === "sidecar" && pickedEngine === "browser") ||
      (pickedEngine === "whisper" && meta.available === false) ||
      (pickedEngine === "elevenlabs" && meta.available === false)
  );
}

function applySttSettingsUi(settings) {
  syncSttEnabledUi(settings);
  applySttToggleUi(settings);
  applySttFormUi(settings);
}

function collectSttFormPatch() {
  const sendImmediately = Boolean(nodes.voiceConfirm?.checked);
  return {
    sttLang: nodes.sttLang?.value || "ru-RU",
    sttEngine: normalizeSttEngine(nodes.sttEngine?.value),
    voiceInputSource: normalizeSttSource(nodes.sttSource?.value),
    sttPrompt: nodes.sttPrompt?.value || "",
    sttWhisperModel: nodes.sttWhisperModel?.value || "base",
    sttElevenlabsApiKey: nodes.sttElevenlabsKey?.value?.trim() || "",
    sttElevenlabsModel: nodes.sttElevenlabsModel?.value || "scribe_v2",
    voiceGlobalListen: Boolean(nodes.voiceGlobalListen?.checked),
    voiceToCompose: Boolean(nodes.voiceToCompose?.checked),
    voiceResponseEnabled: sendImmediately
  };
}

function collectSttSettingsPatch() {
  const uiMode = normalizeVoiceInputMode(nodes.voiceMode?.value || state.sttResumeMode || "hold");
  return {
    sttEnabled: readSttEnabledFromDom() !== false,
    voiceInputMode: uiMode,
    ...collectSttFormPatch()
  };
}

function applyProactiveFormUi(settings) {
  if (nodes.proactiveEnabled) {
    nodes.proactiveEnabled.checked = Boolean(settings.proactiveEnabled);
  }
  const idleRange = normalizeProactiveIdleRange(settings || {});
  if (nodes.proactiveIdleMin) {
    nodes.proactiveIdleMin.value = String(idleRange.min);
  }
  if (nodes.proactiveIdleMax) {
    nodes.proactiveIdleMax.value = String(idleRange.max);
  }
  if (nodes.proactiveCooldownSeconds) {
    nodes.proactiveCooldownSeconds.value = String(settings.proactiveCooldownSeconds ?? 900);
  }
  if (nodes.proactiveQuietEnabled) {
    nodes.proactiveQuietEnabled.checked = Boolean(settings.proactiveQuietHoursEnabled);
  }
  if (nodes.proactiveQuietStart) {
    nodes.proactiveQuietStart.value = normalizeQuietTime(settings.proactiveQuietStart, "23:00");
  }
  if (nodes.proactiveQuietEnd) {
    nodes.proactiveQuietEnd.value = normalizeQuietTime(settings.proactiveQuietEnd, "07:00");
  }
  if (nodes.proactivePrompt && document.activeElement !== nodes.proactivePrompt) {
    nodes.proactivePrompt.value = settings.proactivePrompt || "";
  }
}

function collectProactiveFormPatch() {
  const idleRange = normalizeProactiveIdleRange({
    proactiveIdleSecondsMin: nodes.proactiveIdleMin?.value,
    proactiveIdleSecondsMax: nodes.proactiveIdleMax?.value,
    proactiveIdleSeconds: state.settings?.proactiveIdleSeconds
  });
  return {
    proactiveEnabled: Boolean(nodes.proactiveEnabled?.checked),
    proactiveIdleSecondsMin: idleRange.min,
    proactiveIdleSecondsMax: idleRange.max,
    proactiveIdleSeconds: idleRange.min,
    proactiveCooldownSeconds: Math.min(
      86400,
      Math.max(60, Number(nodes.proactiveCooldownSeconds?.value) || 900)
    ),
    proactiveQuietHoursEnabled: Boolean(nodes.proactiveQuietEnabled?.checked),
    proactiveQuietStart: normalizeQuietTime(nodes.proactiveQuietStart?.value, "23:00"),
    proactiveQuietEnd: normalizeQuietTime(nodes.proactiveQuietEnd?.value, "07:00"),
    proactivePrompt: nodes.proactivePrompt?.value || ""
  };
}

async function persistAgentSettingsPatch(patch, { baselineSection = null, commitSection = false } = {}) {
  if (!state.agentId) {
    try {
      await ensureShellAgentSelected();
    } catch (error) {
      renderPhase("waiting", error.message);
      return false;
    }
  }
  if (!state.agentId) {
    renderPhase("waiting", "Выберите хранилище (агента) в шапке");
    return false;
  }
  if (state.settings) Object.assign(state.settings, patch);
  try {
    await saveSettings(patch, { apply: "none" });
    if (baselineSection) {
      if (commitSection) {
        settingsSave.commitBaseline(baselineSection, getSettingsSnapshot(baselineSection));
        applySavedSettingsSection(baselineSection, state.settings);
      } else {
        settingsSave.patchBaseline(baselineSection, patch);
        markSettingsDirty(baselineSection);
      }
    }
    updateSettingsSaveHints();
    return true;
  } catch (error) {
    if (baselineSection) markSettingsDirty(baselineSection);
    renderPhase("waiting", error.message);
    return false;
  }
}

async function persistMessageTarget(runtime) {
  const target = normalizeMessageRuntime(runtime);
  if (state.settings) state.settings.messageTarget = target;
  const available = getSelectableRuntimes();
  runRuntimeSelectSync(() => {
    setRuntimeSelectValue(nodes.messageTarget, target, available);
    setRuntimeSelectValue(nodes.routeRuntime, target, available);
  });
  beginHeroAutosave("messageTarget");
  try {
    await persistAgentSettingsPatch(
      { messageTarget: target },
      { baselineSection: "route", commitSection: !isSettingsViewOpen() }
    );
    refreshRuntimeSelectLabels();
    void shellDialog.refreshHistory?.();
  } finally {
    endHeroAutosave("messageTarget");
  }
}

async function persistSttEnabled(enabled) {
  const uiMode = normalizeVoiceInputMode(nodes.voiceMode?.value || state.sttResumeMode || "hold");
  state.sttResumeMode = uiMode;
  if (!enabled) {
    shellTapVoice?.abortSession();
    if (state.meetingRecording) void setMeetingRecordingRemote(false);
  }
  if (state.settings) {
    state.settings.sttEnabled = enabled;
    state.settings.voiceInputMode = uiMode;
  }
  beginHeroAutosave("sttEnabled");
  try {
    await persistAgentSettingsPatch(
      { sttEnabled: enabled, voiceInputMode: uiMode },
      { baselineSection: "stt", commitSection: !isSettingsViewOpen() }
    );
  } finally {
    endHeroAutosave("sttEnabled");
  }
  updateVoiceModeSelectUi();
  syncCompactSensorAvailability();
}

async function persistVoiceInputMode(mode) {
  const next = normalizeVoiceInputMode(mode);
  if (next === "disabled") return;
  if (state.settings) state.settings.voiceInputMode = next;
  state.pendingVoiceInputMode = next;
  voiceInputModePersisting = true;
  try {
    await saveSettings({ voiceInputMode: next }, { apply: "none" });
    lastCommittedVoiceMode = next;
    if (state.pendingVoiceInputMode === next) state.pendingVoiceInputMode = null;
  } catch (error) {
    state.pendingVoiceInputMode = null;
    renderPhase("waiting", error.message);
  } finally {
    voiceInputModePersisting = false;
  }
}

async function persistTtsEnabled(enabled) {
  if (state.settings) state.settings.ttsEnabled = enabled;
  beginHeroAutosave("ttsEnabled");
  try {
    await persistAgentSettingsPatch({ ttsEnabled: enabled }, { baselineSection: "tts" });
  } finally {
    endHeroAutosave("ttsEnabled");
  }
}

async function persistTtsPlaybackMode(mode) {
  const next = mode === "reading" ? "reading" : "dialog";
  if (state.settings) state.settings.ttsPlaybackMode = next;
  ttsPlaybackModePersisting = true;
  beginHeroAutosave("ttsPlaybackMode");
  try {
    await persistAgentSettingsPatch({ ttsPlaybackMode: next }, { baselineSection: "tts" });
  } finally {
    ttsPlaybackModePersisting = false;
    endHeroAutosave("ttsPlaybackMode");
  }
}

function fillTtsEngineSelect(selectEl, selected, capabilities = ttsEngineCapabilities) {
  if (!selectEl) return normalizeTtsEngine(selected);
  const current = normalizeTtsEngine(selected);
  selectEl.innerHTML = "";
  for (const group of SHELL_TTS_ENGINE_GROUPS) {
    const optgroup = document.createElement("optgroup");
    optgroup.label = group.label;
    for (const engine of group.engines) {
      const meta = capabilities?.[engine] || {};
      const available = engine === "elevenlabs" ? meta.available !== false : meta.available !== false;
      const opt = document.createElement("option");
      opt.value = engine;
      opt.textContent = formatTtsEngineSelectLabel(engine, { available });
      opt.title = formatTtsEngineSelectTitle(engine, meta);
      opt.disabled = engine === "elevenlabs" ? false : meta.available === false;
      if (engine === current) opt.selected = true;
      optgroup.append(opt);
    }
    selectEl.append(optgroup);
  }
  selectEl.value = current;
  return normalizeTtsEngine(selectEl.value || current);
}

function refreshTtsEngineSelectLabels(capabilities = ttsEngineCapabilities) {
  if (!nodes.ttsEngine) return;
  for (const opt of nodes.ttsEngine.options) {
    if (!opt.value) continue;
    const engine = normalizeTtsEngine(opt.value);
    if (!SHELL_TTS_ENGINES.includes(engine)) continue;
    const meta = capabilities?.[engine] || {};
    const available = engine === "elevenlabs" ? meta.available !== false : meta.available !== false;
    opt.textContent = formatTtsEngineSelectLabel(engine, { available });
    opt.title = formatTtsEngineSelectTitle(engine, meta);
    opt.disabled = engine === "elevenlabs" ? false : meta.available === false;
  }
}

function populateTtsEngineSelect(selected = normalizeTtsEngine(state.settings?.ttsEngine || "browser")) {
  const engine = fillTtsEngineSelect(nodes.ttsEngine, selected);
  if (state.settings) state.settings.ttsEngine = engine;
  updateTtsEngineUi();
}

function updateTtsEngineUi({ reloadVoices = false } = {}) {
  const engine = normalizeTtsEngine(getTtsEngine());
  for (const [id, getPanel] of Object.entries(TTS_ENGINE_PANEL_NODES)) {
    const panel = getPanel();
    if (panel) panel.dataset.visible = id === engine ? "1" : "0";
  }
  if (reloadVoices) {
    void refreshTtsEngineVoices(engine);
  }
}

async function loadSttCapabilities() {
  try {
    const data = await apiFetch("/api/shell/stt/capabilities");
    sttEngineCapabilities = { ...(data?.engines || {}) };
    if (nodes.sttEngine) {
      for (const option of nodes.sttEngine.options) {
        const meta = sttEngineCapabilities[option.value];
        if (!meta) continue;
        option.disabled = false;
        if (meta.hint && option.value !== "auto") {
          option.title = meta.available === false ? `${meta.hint} (можно выбрать заранее)` : meta.hint;
        }
      }
    }
    updateSttEngineUi();
  } catch {
    // ignore
  }
}

function updateSttEngineUi() {
  const engine = normalizeSttEngine(nodes.sttEngine?.value || state.settings?.sttEngine || "auto");
  if (nodes.sttWhisperPanel) {
    nodes.sttWhisperPanel.dataset.visible = engine === "whisper" ? "1" : "0";
  }
  if (nodes.sttElevenlabsPanel) {
    nodes.sttElevenlabsPanel.dataset.visible = engine === "elevenlabs" ? "1" : "0";
  }
  updateComposeGlobalListenUi();
  updateComposeVoiceUi(state.settings ? getVoiceInputMode() : "hold");
  updateSttEngineNote(state.settings);
}

async function loadTtsCapabilities() {
  try {
    const data = await apiFetch("/api/shell/tts/capabilities");
    const engines = { ...(data?.engines || {}) };
    ttsEngineCapabilities = engines;
    refreshTtsEngineSelectLabels(engines);
    if (nodes.ttsEngine) {
      for (const option of nodes.ttsEngine.options) {
        const meta = engines[option.value];
        option.disabled = option.value === "elevenlabs" ? false : meta?.available === false;
      }
    }
  } catch {
    // ignore — select labels stay as last known state
  }
}

async function applyContrastVoiceDefaults(engine = getTtsEngine()) {
  if (engine === "browser") {
    await refreshTtsVoiceOptions();
    if (!nodes.ttsVoice) return;
    const langPrefix = String(nodes.ttsLang?.value || "ru-RU").split("-")[0].toLowerCase();
    const voices = filterLocalWebSpeechVoices(getSpeechSynth()?.getVoices() || []).filter((voice) =>
      voice.lang.toLowerCase().startsWith(langPrefix)
    );
    const milena = voices.find(
      (voice) => /milena/i.test(voice.name) && voice.lang.toLowerCase().startsWith(langPrefix)
    );
    const fallback = voices.find((voice) => voice.lang.toLowerCase().startsWith(langPrefix));
    nodes.ttsVoice.value = milena?.name || fallback?.name || "";
    return;
  }
  if (engine !== "say") return;
  await refreshTtsEngineVoices("say");
  if (!nodes.ttsSayVoice) return;
  const options = [...nodes.ttsSayVoice.options].map((option) => option.value).filter(Boolean);
  const preferred = ["Yuri", "Katya", "Milena"];
  const next = preferred.find((name) => options.includes(name)) || options[0] || "";
  if (next) nodes.ttsSayVoice.value = next;
}

async function refreshTtsEngineVoices(engine = getTtsEngine()) {
  updateTtsEngineUi({ reloadVoices: false });
  if (engine === "browser") {
    void refreshTtsVoiceOptions();
    return;
  }
  if (engine === "edge") {
    if (!nodes.ttsEdgeVoice) return;
    const current = nodes.ttsEdgeVoice.value || state.settings?.ttsEdgeVoice || "ru-RU-SvetlanaNeural";
    nodes.ttsEdgeVoice.innerHTML = "";
    const presets = [
      { id: "ru-RU-SvetlanaNeural", label: "Svetlana (ru-RU, ж)" },
      { id: "ru-RU-DmitryNeural", label: "Dmitry (ru-RU, м)" },
      { id: "en-US-JennyNeural", label: "Jenny (en-US, ж)" },
      { id: "en-US-GuyNeural", label: "Guy (en-US, м)" }
    ];
    for (const voice of presets) {
      const opt = document.createElement("option");
      opt.value = voice.id;
      opt.textContent = voice.label;
      if (voice.id === current) opt.selected = true;
      nodes.ttsEdgeVoice.append(opt);
    }
    return;
  }
  if (engine !== "say" || !nodes.ttsSayVoice) return;
  try {
    const sayLang = nodes.ttsSayLang?.value || state.settings?.ttsSayLang || "ru-RU";
    const data = await apiFetch(
      `/api/shell/tts/voices?engine=${encodeURIComponent(engine)}&lang=${encodeURIComponent(sayLang)}`
    );
    const current = nodes.ttsSayVoice.value || state.settings?.ttsSayVoice || "";
    nodes.ttsSayVoice.innerHTML = '<option value="">По умолчанию (say)</option>';
    for (const voice of data.voices || []) {
      const opt = document.createElement("option");
      opt.value = voice.id;
      opt.textContent = `${voice.label || voice.id} · say сервер`;
      if (voice.id === current) opt.selected = true;
      nodes.ttsSayVoice.append(opt);
    }
  } catch {
    nodes.ttsSayVoice.innerHTML = '<option value="">say недоступен (нужен Mac-сервер)</option>';
  }
}

function applyTtsSettingsUi(settings) {
  syncTtsPlaybackModeUi(settings);
  syncTtsEnabledUi(settings);
  if (nodes.ttsPrompt && document.activeElement !== nodes.ttsPrompt) {
    nodes.ttsPrompt.value = settings.ttsPrompt || "";
  }
  const engine = normalizeTtsEngine(settings.ttsEngine === "sidecar" ? "say" : settings.ttsEngine || "browser");
  fillTtsEngineSelect(nodes.ttsEngine, engine);
  const lang = settings.ttsBrowserLang || "ru-RU";
  const sayLang = settings.ttsSayLang || "ru-RU";
  const voice = settings.ttsBrowserVoice ?? "";
  const sayVoice = settings.ttsSayVoice ?? "";
  if (nodes.ttsLang) nodes.ttsLang.value = lang;
  if (nodes.ttsSayLang) nodes.ttsSayLang.value = sayLang;
  if (nodes.ttsRate) nodes.ttsRate.value = String(settings.ttsRate ?? 1);
  if (nodes.ttsPitch) nodes.ttsPitch.value = String(settings.ttsPitch ?? 1);
  if (nodes.ttsEdgeVoice) nodes.ttsEdgeVoice.value = settings.ttsEdgeVoice || "ru-RU-SvetlanaNeural";
  if (nodes.ttsPiperModel) nodes.ttsPiperModel.value = settings.ttsPiperModel || "";
  if (nodes.ttsPiperBinary) nodes.ttsPiperBinary.value = settings.ttsPiperBinary || "";
  applyElevenlabsKeyUi(settings);
  if (nodes.ttsElevenlabsVoiceId) nodes.ttsElevenlabsVoiceId.value = settings.ttsElevenlabsVoiceId || "";
  if (nodes.ttsElevenlabsModel) {
    nodes.ttsElevenlabsModel.value = settings.ttsElevenlabsModel || "eleven_multilingual_v2";
  }
  updateTtsRateLabel();
  updateTtsPitchLabel();
  if (nodes.ttsVoice) nodes.ttsVoice.value = voice;
  if (nodes.ttsSayVoice) nodes.ttsSayVoice.value = sayVoice;
  updateTtsEngineUi();
  void refreshTtsEngineVoices("browser");
  void refreshTtsEngineVoices("say");
  if (!["browser", "say"].includes(engine)) {
    void refreshTtsEngineVoices(engine);
  }
  void loadTtsCapabilities();
}

function collectDeviceContextForMessage() {
  if (!isShellLocationShareEnabled()) return undefined;
  const location = getShellDeviceLocation();
  if (!location) return undefined;
  return {
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      altitude: location.altitude,
      heading: location.heading,
      speed: location.speed,
      capturedAt: location.capturedAt
    }
  };
}

function collectOutboundMessageSettings() {
  const ttsEnabled = readTtsEnabledFromDom() !== false;
  const deviceContext = collectDeviceContextForMessage();
  return {
    ttsEnabled,
    ttsPrompt: nodes.ttsPrompt?.value ?? "",
    hostUrl: window.location.href,
    ...getShellSurfacePayload(),
    ...(deviceContext ? { deviceContext } : {})
  };
}

function collectTtsFormPatch() {
  return {
    ttsPlaybackMode: getTtsPlaybackMode(),
    ttsPrompt: nodes.ttsPrompt?.value || "",
    ttsEngine: getTtsEngine(),
    ttsBrowserLang: nodes.ttsLang?.value || "ru-RU",
    ttsBrowserVoice: nodes.ttsVoice?.value || "",
    ttsSayLang: nodes.ttsSayLang?.value || "ru-RU",
    ttsSayVoice: nodes.ttsSayVoice?.value || "",
    ttsEdgeVoice: nodes.ttsEdgeVoice?.value || "ru-RU-SvetlanaNeural",
    ttsElevenlabsApiKey: resolveElevenlabsApiKey(),
    ttsElevenlabsVoiceId: resolveElevenlabsVoiceId(),
    ttsElevenlabsModel: nodes.ttsElevenlabsModel?.value || "",
    ttsPiperModel: nodes.ttsPiperModel?.value || "",
    ttsPiperBinary: nodes.ttsPiperBinary?.value || "",
    ttsRate: Number(nodes.ttsRate?.value || 1),
    ttsPitch: Number(nodes.ttsPitch?.value || 1)
  };
}

function collectTtsSettingsPatch() {
  return {
    ttsEnabled: readTtsEnabledFromDom() !== false,
    ...collectTtsFormPatch()
  };
}

async function persistTtsSettings({ commitBaseline: shouldCommitBaseline = true } = {}) {
  const patch = collectTtsSettingsPatch();
  patch.ttsEngine = getTtsEngine();
  const apiKey = String(nodes.ttsElevenlabsKey?.value || "").trim();
  const voiceId = String(nodes.ttsElevenlabsVoiceId?.value || "").trim();
  if (apiKey) patch.ttsElevenlabsApiKey = apiKey;
  else delete patch.ttsElevenlabsApiKey;
  patch.ttsElevenlabsVoiceId = voiceId;

  await saveSettings(patch, { apply: "none" });
  applySavedSettingsSection("tts", state.settings);
  applyElevenlabsKeyUi(state.settings);
  if (nodes.ttsElevenlabsVoiceId && document.activeElement !== nodes.ttsElevenlabsVoiceId) {
    nodes.ttsElevenlabsVoiceId.value = String(state.settings?.ttsElevenlabsVoiceId || "");
  }
  if (shouldCommitBaseline) {
    settingsSave.commitBaseline("tts", collectTtsSettingsPatch());
  }
  void loadTtsCapabilities();

  const savedKey = String(state.settings?.ttsElevenlabsApiKey || "").trim();
  const savedVoice = String(state.settings?.ttsElevenlabsVoiceId || "").trim();
  const wantsElevenlabs = getTtsEngine() === "elevenlabs" || apiKey || voiceId;
  if (wantsElevenlabs && apiKey && savedKey !== apiKey) {
    throw new Error("ElevenLabs API key не записался в settings.json — попробуйте ещё раз");
  }
  if (wantsElevenlabs && voiceId && savedVoice !== voiceId) {
    throw new Error("ElevenLabs Voice ID не записался в settings.json — попробуйте ещё раз");
  }
  if (getTtsEngine() === "elevenlabs" && (!savedKey || !savedVoice)) {
    throw new Error("ElevenLabs: заполните API key и Voice ID, затем «Сохранить»");
  }
  const hint =
    savedKey && savedVoice
      ? ` · ElevenLabs ✓ (${savedKey.length} + ${savedVoice.length} симв.)`
      : "";
  const agentHint = state.agentId ? ` · агент ${state.agentId}` : "";
  renderPhase("waiting", `Настройки TTS сохранены${agentHint}${hint}`);
  updateTtsSaveAgentHint();
}

async function maybeAutoSaveElevenlabsCredentials() {
  if (isSettingsViewOpen()) return;
  if (getTtsEngine() !== "elevenlabs") return;
  const apiKey = String(nodes.ttsElevenlabsKey?.value || "").trim();
  const voiceId = String(nodes.ttsElevenlabsVoiceId?.value || "").trim();
  if (!apiKey || !voiceId) return;
  const stored = state.settings || {};
  if (apiKey === stored.ttsElevenlabsApiKey && voiceId === stored.ttsElevenlabsVoiceId) return;
  try {
    await persistTtsSettings();
  } catch (error) {
    renderPhase("waiting", error.message);
  }
}

function resolveReplyTtsEngines() {
  const configured = String(state.settings?.ttsEngine || getTtsEngine() || "").trim();
  const order = [];
  const push = (engine) => {
    if (SERVER_TTS_ENGINES.has(engine) && !order.includes(engine)) order.push(engine);
  };
  if (SERVER_TTS_ENGINES.has(configured)) push(configured);
  push("edge");
  if (/Mac/i.test(navigator.platform || "")) push("say");
  return order;
}

async function speakReplyAudio(text) {
  const payload = String(text || "").trim();
  if (!payload) throw new Error("empty-tts-payload");
  await unlockShellAudio();

  const settings = { ...(state.settings || {}), ...collectTtsFormPatch() };
  const lang = ttsSettingsLang(settings, "browser");
  const rate = settings.ttsRate || 1;
  const voiceName = ttsSettingsVoice(settings, "browser");
  let serverReason = "";

  if (ttsPlayer) {
    for (const engine of resolveReplyTtsEngines()) {
      renderPhase("thinking", `Синтез · ${ttsEngineLabel(engine)}…`, state.shellState?.metrics || "");
      state.speaking = true;
      updateTtsControlsUi("speaking");
      let result;
      try {
        result = await ttsPlayer.speak(payload, {
          engine,
          onPhase(phase) {
            if (phase === "synthesizing") {
              renderPhase("thinking", `Синтез · ${ttsEngineLabel(engine)}…`, state.shellState?.metrics || "");
              return;
            }
            renderPhase("speaking", `Озвучиваю · ${ttsEngineLabel(engine)}…`, state.shellState?.metrics || "");
          }
        });
      } catch (error) {
        result = { ok: false, reason: String(error?.message || error) };
      } finally {
        state.speaking = false;
        updateTtsControlsUi("waiting");
      }
      if (result?.ok) {
        shellDialog.clearError();
        return {
          engine: result.engine || engine,
          voice: result.voice || "",
          transport: result.mimeType ? `сервер · ${result.mimeType}` : "сервер"
        };
      }
      if (result?.reason) serverReason = String(result.reason);
    }
  }

  if (getSpeechSynth()) {
    renderPhase("speaking", "Озвучиваю · Web Speech…", state.shellState?.metrics || "");
    state.speaking = true;
    updateTtsControlsUi("speaking");
    let browserReason = "";
    try {
      const browser = await speakShellBrowserTts(payload, { lang, rate, voiceName });
      if (browser.ok) {
        shellDialog.clearError();
        return {
          engine: "browser",
          voice: browser.voice || voiceName || "системный",
          transport: "Web Speech (вкладка)"
        };
      }
      browserReason = String(browser.reason || "speech-error");
    } finally {
      state.speaking = false;
      updateTtsControlsUi("waiting");
    }
    const { title, hint } = shellTtsFailureMessage(serverReason, browserReason, true);
    shellDialog.setError(title, { hint });
    throw new Error(browserReason || serverReason || "tts-failed");
  }

  const { title, hint } = shellTtsFailureMessage(serverReason, "", true);
  shellDialog.setError(title, { hint });
  throw new Error(serverReason || "tts-failed");
}

async function playTtsPayload(text, { allowBrowserFallback = true, streamChunk = false } = {}) {
  const payload = String(text || "").trim();
  if (!payload) return null;
  await unlockShellAudio();

  const keepSpeakingState = () =>
    streamChunk || state.streamTtsActive || state.streamTtsQueue.length > 0;

  const engine = getTtsEngine();
  const settings = { ...(state.settings || {}), ...collectTtsFormPatch() };
  const lang = ttsSettingsLang(settings, engine);
  const rate = settings.ttsRate || 1;
  const voiceName = ttsSettingsVoice(settings, engine);
  const useServerTts = engine !== "browser" && SERVER_TTS_ENGINES.has(engine);

  if (engine === "browser") {
    state.speaking = true;
    updateTtsControlsUi("speaking");
    renderPhase("speaking", "Озвучиваю · Web Speech…");
    try {
      const browser = await speakShellBrowserTts(payload, { lang, rate, voiceName });
      if (!browser.ok) {
        const { title, hint } = shellTtsFailureMessage("", browser.reason, false);
        shellDialog.setError(title, { hint });
        throw new Error(browser.reason || "speech-error");
      }
      shellDialog.clearError();
      return {
        engine: "browser",
        voice: browser.voice || voiceName || "системный",
        transport: "Web Speech (вкладка)"
      };
    } finally {
      if (!keepSpeakingState()) {
        state.speaking = false;
        updateTtsControlsUi("waiting");
      }
    }
  }

  if (!SERVER_TTS_ENGINES.has(engine) || !ttsPlayer) {
    throw new Error(`Неизвестный движок: ${engine}`);
  }

  let serverReason = "";
  try {
    const result = await ttsPlayer.speak(payload, {
      engine,
      onPhase(phase) {
        if (phase === "synthesizing") {
          renderPhase(
            streamChunk ? "speaking" : "thinking",
            streamChunk ? "Озвучиваю…" : `Синтез · ${ttsEngineLabel(engine)}…`
          );
          return;
        }
        state.speaking = true;
        updateTtsControlsUi("speaking");
        renderPhase("speaking", `Озвучиваю · ${ttsEngineLabel(engine)}…`);
      }
    });
    if (result?.ok) {
      shellDialog.clearError();
      return {
        engine: result.engine || engine,
        voice: result.voice || "",
        transport: result.mimeType ? `сервер · ${result.mimeType}` : "сервер"
      };
    }
    serverReason = String(result?.reason || "play-failed");
  } catch (serverError) {
    serverReason = String(serverError?.message || serverError);
  } finally {
    if (!keepSpeakingState()) {
      state.speaking = false;
      updateTtsControlsUi("waiting");
    }
  }

  if (allowBrowserFallback && getSpeechSynth()) {
    renderPhase("speaking", `${ttsEngineLabel(engine)} недоступен — озвучиваю браузером`);
    state.speaking = true;
    updateTtsControlsUi("speaking");
    try {
      const browser = await speakShellBrowserTts(payload, { lang, rate, voiceName });
      if (browser.ok) {
        shellDialog.clearError();
        return { engine: "browser", fallbackFrom: engine, voice: browser.voice || "" };
      }
      const { title, hint } = shellTtsFailureMessage(serverReason, browser.reason, useServerTts);
      shellDialog.setError(title, { hint });
      throw new Error(browser.reason || serverReason);
    } finally {
      if (!keepSpeakingState()) {
        state.speaking = false;
        updateTtsControlsUi("waiting");
      }
    }
  }

  const { title, hint } = shellTtsFailureMessage(serverReason, "", useServerTts);
  shellDialog.setError(title, { hint });
  throw new Error(serverReason || "tts-failed");
}

async function testTtsEngine() {
  if (ttsTestBusy) return;
  const engine = getTtsEngine();
  ttsTestBusy = true;
  nodes.ttsTestBtn?.classList.add("is-busy");
  nodes.ttsTestBtn?.setAttribute("disabled", "true");

  bumpTtsPlayback();
  stopBrowserTts({ notifyServer: false, resetPhase: false, broadcast: false, bumpPlayback: false });
  await unlockShellAudio();

  try {
    const runtime = collectTtsRuntimeSettings();
    const stored = state.settings || {};
    const credsChanged =
      String(runtime.ttsElevenlabsApiKey || "") !== String(stored.ttsElevenlabsApiKey || "") ||
      String(runtime.ttsElevenlabsVoiceId || "") !== String(stored.ttsElevenlabsVoiceId || "") ||
      getTtsEngine() !== (stored.ttsEngine || "browser");
    if (settingsSave.isSectionDirty("tts") || credsChanged) {
      renderPhase("thinking", "Сохраняю настройки TTS…");
      await persistTtsSettings();
    }
    if (engine === "elevenlabs") {
      const ready = collectTtsRuntimeSettings();
      if (!String(ready.ttsElevenlabsApiKey || "").trim()) {
        throw new Error("ElevenLabs: укажите API key");
      }
      if (!String(ready.ttsElevenlabsVoiceId || "").trim()) {
        throw new Error("ElevenLabs: укажите Voice ID");
      }
    }
    if (engine === "browser" || engine === "say") {
      await applyContrastVoiceDefaults(engine);
      markSettingsDirty("tts");
    }
    const phrase = getTtsTestPhrase(engine);
    renderPhase("thinking", `Пробная озвучка · ${ttsEngineLabel(engine)}…`);

    const result = await playTtsPayload(phrase, { allowBrowserFallback: true });
    const usedEngine = result?.engine || engine;
    const voiceHint = result?.voice ? ` · ${result.voice}` : "";
    const transportHint = result?.transport ? ` · ${result.transport}` : "";
    const mismatch = usedEngine !== engine ? ` (выбран ${ttsEngineLabel(engine)})` : "";
    renderPhase(
      "waiting",
      `Пробная · ${ttsEngineLabel(usedEngine)}${voiceHint}${transportHint}${mismatch} — готово`
    );
    if (result?.engine !== "browser" && ttsPlayer) {
      lastTtsChunkRecording = ttsPlayer.getLastRecording?.() || null;
    } else {
      lastTtsChunkRecording = null;
    }
    rememberLastTtsSpoken(phrase);
  } catch (error) {
    renderPhase("waiting", `Пробная озвучка · ${ttsEngineLabel(engine)}: ${error.message}`);
  } finally {
    state.speaking = false;
    updateTtsControlsUi("waiting");
    resetTtsTestButtonUi();
  }
}

function stopBrowserTts({ notifyServer = true, resetPhase = true, broadcast = true, bumpPlayback = true } = {}) {
  if (bumpPlayback) bumpTtsPlayback();
  state.streamTtsQueue = [];
  state.ttsPaused = false;
  const synth = getSpeechSynth();
  if (synth) synth.cancel();
  ttsPlayer?.stop();
  state.speaking = false;
  state.streamTtsActive = false;
  updateTtsControlsUi("waiting");
  if (broadcast) ttsTabCoordinator?.requestGlobalStop();
  if (resetPhase && !state.pttHeld && !state.micActive) {
    void patchShellState({ phase: "waiting", phrase: HERO_IDLE_PHRASE }).then(() => {
      syncWaitingUiAfterPlayback();
    });
  }
  if (notifyServer) {
    void apiFetch("/api/shell/stop-tts", { method: "POST", body: "{}" }).catch(() => {});
  }
}

async function speakOneChunk(text) {
  const payload = String(text || "").trim();
  if (!payload) throw new Error("empty-tts-payload");
  const engine = getTtsEngine();
  const result = await speakReplyAudio(payload);
  if (result?.engine && result.engine !== engine) {
    renderPhase("waiting", `Озвучено · ${ttsEngineLabel(result.engine)} (выбран ${ttsEngineLabel(engine)})`);
  }
  if (result?.engine !== "browser" && ttsPlayer) {
    lastTtsChunkRecording = ttsPlayer.getLastRecording?.() || null;
  } else {
    lastTtsChunkRecording = null;
  }
}

async function speakTextParts(parts, { ttsClientId, sourceMessage = null } = {}) {
  const list = (Array.isArray(parts) ? parts : [parts])
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  if (!list.length) return;
  if (!isTtsEnabledSetting()) return;
  if (state.messageStopped) return;
  const ttsMeta = {
    ttsClientId: ttsClientId || sourceMessage?.ttsClientId,
    ...(sourceMessage && typeof sourceMessage === "object" ? sourceMessage : {})
  };
  if (!shouldPlayReplyTts(ttsMeta)) {
    if (matchesTtsClientId(state.pendingReplyTtsClientId)) {
      shellDialog.setError("Озвучка не запустилась", {
        hint: "Обновите страницу и проверьте, что TTS включён в настройках"
      });
    }
    renderPhase(state.shellState?.phase || "waiting", heroIdlePhrase(), state.shellState?.metrics || "");
    return;
  }

  lastTtsChunkRecording = null;
  const seq = bumpTtsPlayback();
  stopBrowserTts({ notifyServer: false, resetPhase: false, broadcast: false, bumpPlayback: false });
  state.ttsPaused = false;

  try {
    for (let i = 0; i < list.length; i++) {
      if (!isTtsPlaybackCurrent(seq)) break;
      const label =
        list.length > 1 ? `Озвучиваю ${i + 1}/${list.length}…` : "Озвучиваю ответ…";
      renderPhase("speaking", label, state.shellState?.metrics || "");
      void patchShellState({ phase: "speaking", phrase: label }).catch(() => {});
      await speakOneChunk(list[i]);
      if (!isTtsPlaybackCurrent(seq)) break;
    }
  } catch (error) {
    if (!isTtsPlaybackCurrent(seq)) return;
    const reason = String(error?.message || "Ошибка озвучки");
    const { title, hint } = shellTtsFailureMessage(reason, "", getTtsEngine() !== "browser");
    shellDialog.setError(title, { hint: hint || formatTtsErrorHint({ serverReason: reason }) });
    renderPhase("waiting", title);
    return;
  }

  if (!isTtsPlaybackCurrent(seq)) {
    clearPendingReplyTtsClientId();
    return;
  }

  rememberLastTtsSpoken(list.join("\n\n"));
  if (sourceMessage) shellSession?.markReplySpoken(sourceMessage);
  state.pendingReplyTtsClientId = "";
  await patchShellState({ phase: "waiting", phrase: HERO_IDLE_PHRASE }).catch(() => {});
  syncWaitingUiAfterPlayback();
}

async function speakText(text) {
  await speakTextParts([text]);
}

async function handleAssistantMessage(message) {
  if (state.messageStopped) {
    releaseMessagePipeline();
    return;
  }
  const body = String(message?.body || message?.message?.body || "").trim();
  if (!body) {
    if (state.messagePipelineBusy) releaseMessagePipeline();
    return;
  }
  const stream = state.assistantStream;

  if (
    stream?.finalized &&
    (stream.id === message?.streamId ||
      stream.id === resolveAssistantMessageKey(message, body) ||
      stream.text === body)
  ) {
    if (shouldPlayMessageTts(message)) {
      const parts = buildSpeechParts(body, message);
      if (parts.length) {
        void speakTextParts(parts, { ttsClientId: message.ttsClientId, sourceMessage: message });
      }
    }
    releaseMessagePipeline();
    return;
  }

  if (stream && !stream.finalized) {
    finalizeAssistantStream(message);
    return;
  }

  if (shellSession?.isReplyAlreadyDisplayed(message)) {
    if (shouldPlayMessageTts(message)) {
      const parts = buildSpeechParts(body, message);
      if (parts.length) {
        void speakTextParts(parts, { ttsClientId: message.ttsClientId, sourceMessage: message });
      }
    }
    releaseMessagePipeline();
    return;
  }

  shellSession?.flushStreamingRender(renderStreamingAssistantText);
  markAssistantReplyHandled(message, body);
  renderShellReply(message);
  shellDialog.onAgentReply(body);
  void shellDialog.refreshHistory?.().then(() => shellDialog.syncLiveReplySlot?.());
  shellSession?.markReplyDisplayed(message);

  const phase = state.shellState?.phase || "waiting";
  if (phase === "waiting" && !state.pttHeld && !state.micActive && !state.speaking) {
    renderPhase(phase, HERO_IDLE_PHRASE, state.shellState?.metrics || "");
  }
  releaseMessagePipeline();
  if (shouldPlayMessageTts(message)) {
    const parts = buildSpeechParts(body, message);
    if (parts.length) {
      const speechKey = parts.join("\0");
      if (speechKey !== lastSpokenBody || !state.speaking) {
        lastSpokenBody = speechKey;
        void speakTextParts(parts, { ttsClientId: message.ttsClientId, sourceMessage: message });
      }
    }
  }
}

function shouldRefreshDialogHistoryOnSseOpen() {
  if (isShellAgentWorkActive()) return false;
  if (!lastDialogHistoryLoadedAt) return true;
  return Date.now() - lastDialogHistoryLoadedAt >= DIALOG_HISTORY_REFRESH_MIN_MS;
}

function connectStream() {
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }
  if (!state.agentId || typeof EventSource === "undefined") {
    syncDialogConnectionState();
    shellLog("sse", "stream skipped", { agentId: state.agentId || null });
    return;
  }

  shellLog("sse", "connect", { agentId: state.agentId });
  const source = new EventSource(apiUrl("/api/shell/stream"));
  state.eventSource = source;
  syncDialogConnectionState("connecting");
  source.onopen = () => {
    syncDialogConnectionState("live");
    shellLog("sse", "open");
    const hasStatuses = Object.keys(state.runtimeStatuses || {}).length > 0;
    if (hasStatuses) {
      refreshRuntimeSelectLabels();
      syncDialogConnectionState();
    } else {
      void pullRuntimeStatuses();
    }
    void (shouldRefreshDialogHistoryOnSseOpen() ? shellDialog.refreshHistory?.() : Promise.resolve());
    void syncShellReplyAfterConnect("sse open");
  };
  source.onerror = () => {
    syncDialogConnectionState("error");
    shellLog("error", "SSE error");
  };

  const logSse = (type, detail) => {
    if (type === "status") {
      const now = Date.now();
      if (!logSse.lastStatusAt || now - logSse.lastStatusAt > 30000) {
        logSse.lastStatusAt = now;
        shellLog("sse", type, detail);
      }
      return;
    }
    shellLog("sse", type, detail);
  };

  source.addEventListener("status", (event) => {
    try {
      const payload = JSON.parse(event.data);
      logSse("status", {
        phase: payload?.state?.phase,
        proactiveEnabled: payload?.settings?.proactiveEnabled
      });
      applyStatusPayload(payload);
    } catch {
      // ignore malformed event
    }
  });

  if (SHELL_PRESENCE_ENABLED) {
    source.addEventListener("presence", (event) => {
      try {
        logSse("presence");
        applyVoicePresence(JSON.parse(event.data));
      } catch {
        // ignore malformed event
      }
    });
  }

  source.addEventListener("assistant_message", (event) => {
    try {
      logSse("assistant_message");
      const payload = JSON.parse(event.data);
      void handleAssistantMessage(payload.message || payload.payload || payload);
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("assistant_delta", (event) => {
    try {
      logSse("assistant_delta");
      const payload = JSON.parse(event.data);
      handleAssistantDelta(payload);
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("message_error", (event) => {
    try {
      const payload = JSON.parse(event.data);
      const message = String(payload?.message || payload?.details || "Ошибка отправки").trim();
      if (!message || state.assistantStream?.finalized) return;
      shellDialog.setError(message);
      renderPhase("waiting", message);
      releaseMessagePipeline();
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("agent_activity", (event) => {
    try {
      logSse("agent_activity");
      const payload = JSON.parse(event.data);
      handleAgentActivity(payload);
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("camera_snapshot_request", (event) => {
    try {
      logSse("camera_snapshot_request");
      const payload = JSON.parse(event.data);
      void handleCameraSnapshotRequest(payload);
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("screen_snapshot_request", (event) => {
    try {
      logSse("screen_snapshot_request");
      const payload = JSON.parse(event.data);
      void handleScreenSnapshotRequest(payload);
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("window_settings", (event) => {
    try {
      logSse("window_settings");
      const entry = JSON.parse(event.data);
      applyWindowSettings(entry.payload || entry);
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("compose_draft", (event) => {
    try {
      logSse("compose_draft");
      const entry = JSON.parse(event.data);
      const draft = entry.payload || entry;
      applyRemoteComposeDraft(String(draft.body || ""));
      if (String(draft.body || "").trim()) {
        renderPhase("waiting", "Текст в поле ввода — отправьте вручную");
      }
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("state", (event) => {
    try {
      logSse("state");
      const entry = JSON.parse(event.data);
      const nextState = entry.payload || entry;
      onShellPhaseChange(nextState);
      if (nextState?.phase) {
        state.shellState = { ...(state.shellState || {}), ...nextState };
        const phase = resolveDisplayPhase(nextState.phase);
        const phrase = String(nextState.phrase || "").trim();
        const metrics = String(nextState.metrics || "").trim();
        const shouldRender =
          !state.sessionUiLocked ||
          phase === "thinking" ||
          phase === "speaking" ||
          phase === "listening";
        if (shouldRender) {
          renderPhase(phase, phrase, metrics);
          if (phase === "thinking" && phrase) syncAgentActivityFromPhrase(phrase, metrics);
        }
        maybeResetStaleSpeakingPhase();
      }
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("stop_tts", () => {
    logSse("stop_tts");
    stopBrowserTts({ notifyServer: false, broadcast: false });
    releaseMessagePipeline();
  });

  source.addEventListener("reconnect", () => {
    logSse("reconnect");
    source.close();
    setTimeout(connectStream, 500);
  });
}

function showMicPermissionDialog() {
  if (nodes.micDialogUrl) {
    nodes.micDialogUrl.textContent = getShellHttpsUrl();
  }
  nodes.micDialog?.showModal();
}

function syncMicPermissionUi() {
  const issue = shellPermissionIssue();
  if (!nodes.micBtn || !issue) return;
  nodes.micBtn.title = `Нужен HTTPS · ${getShellHttpsUrl()}`;
}

function bindMicPermissionsUi(permissionApi) {
  nodes.micHelpLink?.addEventListener("click", (event) => {
    event.preventDefault();
    showMicPermissionDialog();
  });
  nodes.micDialogClose?.addEventListener("click", () => nodes.micDialog?.close());
  nodes.micDialogCheck?.addEventListener("click", () => {
    void permissionApi.runCheck().then(() => {
      initShellPermissions({
        bannerEl: nodes.permissionBanner,
        micDialog: nodes.micDialog
      });
      syncMicPermissionUi();
    });
  });
  nodes.micDialog?.addEventListener("click", (event) => {
    if (event.target === nodes.micDialog) nodes.micDialog.close();
  });
}

let shellTapVoice = null;
let showVoiceConfirmDialog = null;
let shellKeepAwake = null;
let composeLayout = null;

function renderWaitingPhrase() {
  renderPhase("waiting", heroIdlePhrase(), state.shellState?.metrics || "");
}

function isSttDisabled() {
  return getVoiceInputMode() === "disabled" || nodes.sttEnabled?.checked === false;
}

function isMessagePipelineActive() {
  return Boolean(state.messagePipelineBusy || state.processingMessage);
}

async function sendVoiceMessage(text) {
  if (state.settings?.cameraOnSpeech && shellCamera.isActive()) {
    await uploadCameraSnapshot("speech").catch(() => {});
  }
  if (state.settings?.screenOnSpeech && shellScreen.isActive()) {
    await uploadScreenSnapshot("speech").catch(() => {});
  }
  await sendMessage(text, { fromCompose: false, voice: true });
}

async function handleVoiceTranscript(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    renderWaitingPhrase();
    return;
  }

  if (isVoiceToComposeEnabled()) {
    appendVoiceToCompose(trimmed);
    renderPhase("waiting", "Текст в поле ввода — отправьте вручную");
    hapticTap();
    return;
  }

  if (!shouldSendVoiceImmediately()) {
    const result = await showVoiceConfirmDialog(trimmed);
    if (result === "__retry__") {
      renderWaitingPhrase();
      hapticTap();
      return;
    }
    if (!result) {
      renderWaitingPhrase();
      return;
    }
    await sendVoiceMessage(result);
    return;
  }

  await sendVoiceMessage(trimmed);
}

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const insecure = Boolean(shellPermissionIssue());
  if (!SpeechRecognition) {
    if (nodes.micBtn) {
      nodes.micBtn.title = insecure
        ? `Web Speech недоступен · sidecar/HTTPS · ${getShellHttpsUrl()}`
        : "Web Speech недоступен · для sidecar запустите npm run shell:sidecar";
    }
    updateVoiceModeSelectUi();
    return;
  }

  if (insecure) {
    syncMicPermissionUi();
  }

  const recognition = new SpeechRecognition();
  recognition.lang = state.settings?.sttLang || nodes.sttLang?.value || "ru-RU";
  state.recognition = recognition;

  showVoiceConfirmDialog = createVoiceConfirmDialog(nodes);
  shellTapVoice = createShellTapVoice({
    state,
    recognition,
    getVoiceInputMode,
    shellPermissionIssue,
    getShellHttpsUrl,
    warmUpMicrophone,
    showMicPermissionDialog,
    setMicButtonState,
    renderPhase,
    renderWaitingPhrase,
    getLivePhrase: () => livePhraseFromStatus(state.shellState, null),
    handleVoiceTranscript,
    isSttDisabled,
    isMessageBusy: isMessagePipelineActive,
    clearShellError: () => shellDialog?.clearError?.(),
    syncVoiceRecordTimer
  });
  shellTapVoice.configureRecognition(recognition);
  shellTapVoice.bindHandlers(recognition);
  updateVoiceModeSelectUi();
}

function beginMicHold() {
  const mode = getVoiceInputMode();
  if (mode === "disabled" || isSttDisabled()) {
    renderPhase("disabled", "Голосовой ввод отключён");
    return false;
  }
  if (!ensureVoicePrimaryClient()) return false;
  if (micActionForMode(mode) !== "hold") return false;
  const ctx = getVoiceModeContext();
  if (!sttEngineIsAvailable(mode, ctx)) {
    renderPhase(
      "disabled",
      resolveSttEngine(mode, ctx) === "sidecar"
        ? "STT sidecar — запустите: AGENT_CMS_AGENT=agent-cms-core npm run shell:sidecar"
        : "STT браузера недоступен · откройте Shell по HTTPS"
    );
    return false;
  }
  interruptTtsForUserVoice();
  if (usesSidecarMic(mode)) {
    playShellMicSound("press");
    hapticTap();
    void setPttHeldRemote(true).catch((error) => renderPhase("waiting", error.message));
    return true;
  }
  if (!shellTapVoice) {
    renderPhase("waiting", `SpeechRecognition недоступен · ${getShellHttpsUrl()}`);
    return false;
  }
  if (usesBrowserStt(mode)) {
    playShellMicSound("press");
    hapticTap();
    shellTapVoice.prepareSession();
    void shellTapVoice.startSession({ viaTap: true, skipPressSound: true });
    return true;
  }
  renderPhase("waiting", "Голос недоступен — проверьте режим и «Глобально»");
  return false;
}

function endMicHold() {
  const mode = getVoiceInputMode();
  if (micActionForMode(mode) !== "hold") return;
  if (state.micPointerHeld || shellTapVoice?.isTapHeld?.() || state.pttHeld) {
    playShellMicSound("release");
  }
  schedulePttReleaseTail(() => {
    if (usesSidecarMic(mode)) {
      void setPttHeldRemote(false).catch((error) => renderPhase("waiting", error.message));
      return;
    }
    shellTapVoice?.stopSession({ skipReleaseSound: true });
  });
}

function handleMicPress() {
  const mode = getVoiceInputMode();
  if (mode === "disabled" || nodes.sttEnabled?.checked === false) {
    renderPhase("disabled", "Голосовой ввод отключён");
    return;
  }
  const action = micActionForMode(mode);
  if (action === "sidecar-always") {
    if (!ensureVoicePrimaryClient()) return;
    if (!state.sidecarConnected) {
      renderPhase("disabled", "Sidecar не запущен — npm run shell:sidecar");
      return;
    }
    hapticTap();
    renderPhase("listening", "Sidecar слушает. Говорите — фраза уйдёт по паузе.");
    return;
  }
  if (action === "hint") {
    renderPhase(
      "waiting",
      usesSidecarMic(mode)
        ? "Удерживай Shift. Sidecar слушает глобально."
        : "Удерживай Shift для записи (Shell в фокусе, не в поле ввода)."
    );
    return;
  }
  if (action === "toggle-meeting") {
    if (!ensureVoicePrimaryClient()) return;
    if (!state.sidecarConnected) {
      renderPhase("disabled", "Sidecar не запущен — npm run shell:sidecar");
      return;
    }
    hapticTap();
    void setMeetingRecordingRemote(!state.meetingRecording).catch((error) =>
      renderPhase("waiting", error.message)
    );
  }
}

function bindMicUi() {
  if (!nodes.micBtn) return;

  const micSttOff = () => nodes.sttEnabled?.checked === false;

  const finishMicHold = () => {
    if (!state.micPointerHeld) return;
    state.micPointerHeld = false;
    disarmMicHoldDocRelease();
    endMicHold();
    syncVoiceRecordTimer();
  };

  const routeMicPress = (event) => {
    if (event?.button !== undefined && event.button !== 0) return false;
    if (micSttOff()) {
      renderPhase("disabled", "Голосовой ввод отключён");
      return true;
    }
    const action = micActionForMode(getVoiceInputMode());
    if (action === "hold") return false;
    event?.preventDefault?.();
    handleMicPress();
    return true;
  };

  nodes.micBtn.addEventListener("click", (event) => {
    if (routeMicPress(event)) return;
    event.preventDefault();
    if (nodes.micBtn.classList.contains("is-active")) {
      resetMicHoldUi();
    }
  });

  nodes.micBtn.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || micSttOff()) return;
    if (micActionForMode(getVoiceInputMode()) !== "hold") return;
    event.preventDefault();
    if (nodes.micBtn.classList.contains("is-active")) {
      resetMicHoldUi();
      return;
    }
    micHoldStartedAt = performance.now();
    state.micPointerHeld = true;
    cancelPttReleaseTail();
    try {
      nodes.micBtn.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    armMicHoldDocRelease(finishMicHold);
    if (beginMicHold()) syncVoiceRecordTimer();
    else {
      state.micPointerHeld = false;
      disarmMicHoldDocRelease();
    }
  });

  nodes.micBtn.addEventListener("pointerup", (event) => {
    if (micActionForMode(getVoiceInputMode()) !== "hold" || event.button !== 0) return;
    if (performance.now() - micHoldStartedAt < 80) return;
    finishMicHold();
  });

  nodes.micBtn.addEventListener("lostpointercapture", () => {
    if (micActionForMode(getVoiceInputMode()) !== "hold") return;
    if (performance.now() - micHoldStartedAt < 80) return;
    finishMicHold();
  });
}

async function startBrowserMic() {
  if (!shellTapVoice) return;
  await shellTapVoice.startSession({ viaTap: true });
}

const SETTINGS_TABS = ["route", "tts", "stt", "proactive", "window", "todo"];

const SETTINGS_TAB_PANELS = {
  route: "shell-route-panel",
  proactive: "shell-proactive-panel",
  window: "shell-window-panel",
  tts: "shell-tts-panel",
  stt: "shell-stt-panel",
  todo: "shell-todo-panel"
};

function resetTtsTestButtonUi() {
  ttsTestBusy = false;
  nodes.ttsTestBtn?.classList.remove("is-busy");
  nodes.ttsTestBtn?.removeAttribute("disabled");
}

function setSettingsTab(tab) {
  const next = SETTINGS_TABS.includes(tab) ? tab : "route";
  state.settingsTab = next;
  if (nodes.settingsView) nodes.settingsView.dataset.settingsTab = next;
  for (const id of SETTINGS_TABS) {
    const panel = document.getElementById(SETTINGS_TAB_PANELS[id]);
    if (panel) panel.hidden = id !== next;
  }
  document.querySelectorAll(".shell-settings-tab").forEach((btn) => {
    const active = btn.dataset.settingsTab === next;
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  if (next === "tts") {
    resetTtsTestButtonUi();
    void refreshTtsVoiceOptions();
  }
  if (next === "stt") {
    void loadSttCapabilities();
  }
  if (next === "route") {
    bindRoutePanelUi();
    updateRuntimeRouteNotes(readRouteRuntimeSelectValue() || getSelectedRuntime());
  }
}

function setShellView(view, { scrollTo = "", settingsTab = "" } = {}) {
  const prev = state.view;
  const next = view === "settings" ? "settings" : "main";
  state.view = next;
  if (nodes.shellApp) nodes.shellApp.dataset.view = next;
  if (nodes.settingsBtn) {
    nodes.settingsBtn.setAttribute("aria-pressed", next === "settings" ? "true" : "false");
  }
  if (nodes.homeBrand) {
    nodes.homeBrand.setAttribute("aria-pressed", next === "main" ? "true" : "false");
  }
  if (next === "settings") {
    const tabFromScroll =
      scrollTo === "route" ||
      scrollTo === "proactive" ||
      scrollTo === "window" ||
      scrollTo === "tts" ||
      scrollTo === "stt" ||
      scrollTo === "todo"
        ? scrollTo
        : "";
    setSettingsTab(settingsTab || tabFromScroll || state.settingsTab || "route");
    bindRoutePanelUi();
    bindSettingsDirtyUi();
    syncSettingsFormsOnOpen(state.settings);
    updateRuntimeRouteNotes(readRouteRuntimeSelectValue() || getSelectedRuntime());
    settingsSave.syncUi();
  } else if (prev === "settings") {
    void refreshStatus().then(() => {
      if (state.settings) applySettings(state.settings);
      commitAllSettingsBaselinesIfSafe();
    });
  }
}

function bindNavigationUi() {
  refreshShellHeaderNodes();
  bindSettingsBtnUi();
  if (nodes.homeBrand && nodes.homeBrand.dataset.shellBound !== "1") {
    nodes.homeBrand.dataset.shellBound = "1";
    nodes.homeBrand.addEventListener("click", () => setShellView("main"));
  }
  document.querySelectorAll(".shell-settings-close-btn").forEach((btn) => {
    if (btn.dataset.shellBound === "1") return;
    btn.dataset.shellBound = "1";
    btn.addEventListener("click", () => setShellView("main"));
  });
  document.querySelectorAll(".shell-settings-tab").forEach((btn) => {
    if (btn.dataset.shellBound === "1") return;
    btn.dataset.shellBound = "1";
    btn.addEventListener("click", () => {
      const tab = btn.dataset.settingsTab;
      if (tab) setSettingsTab(tab);
    });
  });
  if (nodes.characterToggle && nodes.characterToggle.dataset.shellBound !== "1") {
    nodes.characterToggle.dataset.shellBound = "1";
    nodes.characterToggle.addEventListener("click", () => setCharacterPicker(!state.characterPickerOpen));
  }
  if (nodes.characterPicker && nodes.characterPicker.dataset.shellBound !== "1") {
    nodes.characterPicker.dataset.shellBound = "1";
    nodes.characterPicker.addEventListener("click", (event) => {
      if (event.target.closest(".shell-character-option")) setCharacterPicker(false);
    });
  }
  if (nodes.watchCamera && nodes.watchCamera.dataset.shellBound !== "1") {
    nodes.watchCamera.dataset.shellBound = "1";
    nodes.watchCamera.addEventListener("click", () => {
      void toggleWatchCamera().catch((error) => renderPhase("waiting", error.message));
    });
  }
  if (nodes.composeCameraStub && nodes.composeCameraStub.dataset.shellBound !== "1") {
    nodes.composeCameraStub.dataset.shellBound = "1";
    nodes.composeCameraStub.addEventListener("click", () => {
      void captureAndSendComposePhoto();
    });
  }
  if (nodes.watchScreen && nodes.watchScreen.dataset.shellBound !== "1") {
    nodes.watchScreen.dataset.shellBound = "1";
    nodes.watchScreen.addEventListener("click", () => {
      void toggleWatchScreen().catch((error) => renderPhase("waiting", error.message));
    });
  }
}

function refocusComposeInput() {
  const field = nodes.message;
  if (!field || field.disabled || field.readOnly) return;
  requestAnimationFrame(() => {
    if (!field || field.disabled || field.readOnly) return;
    field.focus({ preventScroll: true });
  });
}

function bindComposeSendUi() {
  if (nodes.sendBtn && nodes.sendBtn.dataset.shellBound !== "1") {
    nodes.sendBtn.dataset.shellBound = "1";
    nodes.sendBtn.addEventListener("mousedown", (event) => {
      event.preventDefault();
    });
    nodes.sendBtn.addEventListener("click", () => void sendMessage(nodes.message?.value || ""));
  }
  if (nodes.sendStopBtn && nodes.sendStopBtn.dataset.shellBound !== "1") {
    nodes.sendStopBtn.dataset.shellBound = "1";
    nodes.sendStopBtn.addEventListener("click", () => void stopActiveMessage());
  }
  if (nodes.heroCancelSend && nodes.heroCancelSend.dataset.shellBound !== "1") {
    nodes.heroCancelSend.dataset.shellBound = "1";
    nodes.heroCancelSend.addEventListener("click", () => void stopActiveMessage());
  }
  if (nodes.message && nodes.message.dataset.shellSendBound !== "1") {
    nodes.message.dataset.shellSendBound = "1";
    nodes.message.addEventListener("input", () => {
      updateSendButtonLabel();
      scheduleComposeDraftSave();
      syncComposeReadyStatus();
    });
    nodes.message.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void sendMessage(nodes.message?.value || "");
      }
      if (event.key === "Escape" && composeDraftExpanded) {
        event.preventDefault();
        setComposeExpanded(false);
      }
    });
  }
}

function bindShellClickHandlers() {
  if (document.body.dataset.shellClickBound === "1") return;
  document.body.dataset.shellClickBound = "1";
  bindNavigationUi();
  bindComposeOptionTabs();
  bindComposeParamsPreview();
  bindComposeSendUi();
}

function bindWindowSettingsUi() {
  if (document.body.dataset.shellWindowBound === "1") return;
  document.body.dataset.shellWindowBound = "1";
  const onWindowFieldChange = () => {
    const windowBackground = nodes.windowBackground?.value || "wallpaper";
    const windowTransparent =
      nodes.windowTransparent?.checked === true || windowBackground === "transparent";
    if (nodes.windowTransparent) {
      nodes.windowTransparent.checked = windowTransparent;
    }
    if (nodes.windowBackground) {
      nodes.windowBackground.disabled = windowTransparent && nodes.windowTransparent?.checked === true;
    }
    previewWindowFromForm();
    markSettingsDirty("window");
  };

  nodes.topmost?.addEventListener("change", onWindowFieldChange);
  nodes.windowPetOverlay?.addEventListener("change", () => {
    onWindowFieldChange();
    if (window.shellApp?.applyWindowSettings) {
      void saveWindowSettings(buildWindowSettingsPayload()).catch((error) =>
        renderPhase("waiting", error.message)
      );
    }
  });
  if (window.shellApp?.onPetOverlayChanged) {
    window.shellApp.onPetOverlayChanged((payload) => {
      if (!nodes.windowPetOverlay) return;
      nodes.windowPetOverlay.checked = Boolean(payload?.enabled);
      markSettingsDirty("window");
      void saveWindowSettings(buildWindowSettingsPayload({ windowPetOverlay: Boolean(payload?.enabled) })).catch(
        () => {}
      );
    });
  }
  nodes.windowTransparent?.addEventListener("change", () => {
    if (!nodes.windowTransparent.checked && nodes.windowBackground?.value === "transparent") {
      nodes.windowBackground.value = "wallpaper";
    }
    onWindowFieldChange();
  });
  nodes.windowBackground?.addEventListener("change", onWindowFieldChange);
  const onThinkingSoundClick = (event) => {
    const btn = event.target.closest("[data-thinking-sound]");
    if (!btn) return;
    pickThinkingSound(btn.dataset.thinkingSound);
  };
  nodes.thinkingSoundGrid?.addEventListener("click", onThinkingSoundClick);
  nodes.thinkingSoundDemo?.addEventListener("click", onThinkingSoundClick);
  if (nodes.keepAwake) {
    nodes.keepAwake.checked = readKeepAwakeSetting();
    nodes.keepAwake.addEventListener("change", () => {
      writeKeepAwakeSetting(nodes.keepAwake.checked);
      shellKeepAwake?.sync();
    });
  }
}

function handleMessageTargetChange() {
  if (runtimeSelectSuppressChange) return;
  void playShellUiSound("switch");
  const runtime = readRuntimeSelectValue(nodes.messageTarget);
  if (!runtime) return;
  if (state.settings) state.settings.messageTarget = runtime;
  markSettingsDirty("route");
  syncRuntimeSelects("header");
  updateRuntimeUi({ runtime });
  void persistMessageTarget(runtime).then(() => shellDialog.refreshHistory?.());
}

function handleRouteRuntimeChange() {
  if (runtimeSelectSuppressChange) return;
  refreshRoutePanelNodes();
  const runtime = readRuntimeSelectValue(nodes.routeRuntime);
  if (!runtime) return;
  updateRuntimeRouteNotes(runtime);
  if (state.settings) state.settings.messageTarget = runtime;
  syncRuntimeSelects("route");
  updateRuntimeUi({ runtime, reloadForms: true });
  markSettingsDirty("route");
  void persistMessageTarget(runtime);
}

function bindUi() {
  if (document.body.dataset.shellUiBound === "1") return;
  bindShellClickHandlers();
  try {
  populateVoiceModeSelect();
  populateTtsEngineSelect();
  onRouteSettingsDirty = () => markSettingsDirty("route");

  bindSettingsDirtyUi();
  const markRouteDirty = () => markSettingsDirty("route");
  const markTtsDirty = () => markSettingsDirty("tts");
  const markSttDirty = () => markSettingsDirty("stt");
  const markProactiveDirty = () => markSettingsDirty("proactive");

  nodes.cameraEnabled?.addEventListener("change", () => {
    const enabled = nodes.cameraEnabled.checked;
    void applyCameraEnabled(enabled, { persist: true }).then(() => {
      if (!enabled) void saveSettings({ cameraEnabled: false });
    });
  });

  nodes.cameraFacing?.addEventListener("change", () => {
    updateCameraDeviceField();
    void refreshCameraDeviceList();
    if (shellCamera.isActive()) void applyCameraEnabled(true, { persist: true });
    else void saveSettings(getCameraConstraints());
  });

  nodes.cameraDevice?.addEventListener("change", () => {
    if (shellCamera.isActive()) void applyCameraEnabled(true, { persist: true });
    else void saveSettings(getCameraConstraints());
  });

  nodes.cameraOnSpeech?.addEventListener("change", () => {
    void saveSettings({ cameraOnSpeech: nodes.cameraOnSpeech.checked });
  });

  nodes.cameraSnapshot?.addEventListener("click", () => {
    void (async () => {
      const frame = shellCamera.captureFrame();
      if (!frame) {
        renderPhase("waiting", "Камера не готова для снимка");
        return;
      }
      renderShellReplyMedia(
        nodes.lastReplyMedia,
        [{ type: "image", src: frame.dataUrl, caption: "Кадр с камеры" }],
        state.agentId
      );
      renderShellReplyMarkdown(nodes.lastReplyText, "Кадр с камеры");
      await uploadCameraSnapshot("manual").catch(() => {});
      renderPhase(state.shellState?.phase || "waiting", "Кадр сохранён");
    })();
  });

  nodes.screenEnabled?.addEventListener("change", () => {
    const enabled = nodes.screenEnabled.checked;
    void applyScreenEnabled(enabled, { persist: true }).then(() => {
      if (!enabled) void saveSettings({ screenEnabled: false });
    });
  });

  nodes.screenOnSpeech?.addEventListener("change", () => {
    void saveSettings({ screenOnSpeech: nodes.screenOnSpeech.checked });
  });

  nodes.screenSnapshot?.addEventListener("click", () => {
    void (async () => {
      const frame = shellScreen.captureFrame();
      if (!frame) {
        renderPhase("waiting", "Демонстрация экрана не готова для снимка");
        return;
      }
      renderShellReplyMedia(
        nodes.lastReplyMedia,
        [{ type: "image", src: frame.dataUrl, caption: "Снимок экрана" }],
        state.agentId
      );
      renderShellReplyMarkdown(nodes.lastReplyText, "Снимок экрана");
      await uploadScreenSnapshot("manual").catch(() => {});
      renderPhase(state.shellState?.phase || "waiting", "Снимок сохранён");
    })();
  });

  nodes.screenshotAction?.addEventListener("click", () => {
    void takeManualScreenshot();
  });

  nodes.agentAvatar?.addEventListener("click", () => {
    toggleCompactMode();
  });
  nodes.agentAvatar?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    toggleCompactMode();
  });
  if (nodes.agentAvatar && !nodes.agentAvatar.getAttribute("title")) {
    nodes.agentAvatar.setAttribute("title", "Компактный режим");
    nodes.agentAvatar.setAttribute("aria-label", "Компактный режим");
  }

  initCompactSensor();

  bindRuntimeSelectUi(nodes.messageTarget);
  bindRoutePanelUi();
  nodes.qwenpawUrl?.addEventListener("input", markRouteDirty);
  nodes.qwenpawUrl?.addEventListener("change", () => {
    markRouteDirty();
    void loadQwenPawAgents(nodes.qwenpawAgentId?.value);
  });
  nodes.qwenpawOpenUrl?.addEventListener("click", openQwenPawInBrowser);
  nodes.qwenpawAgentId?.addEventListener("change", () => {
    markRouteDirty();
    void loadQwenPawAgents(nodes.qwenpawAgentId?.value);
  });
  nodes.qwenpawPermissionMode?.addEventListener("change", () => {
    void persistQwenPawApprovalMode().catch((error) => renderPhase("waiting", error.message));
  });
  updateQwenPawPermissionFieldUi();
  syncQwenPawPanelAvailability();
  for (const input of [
    nodes.bridgeUrl,
    nodes.bridgeApiKey,
    nodes.bridgeModel,
    nodes.bridgeAgentMeta,
    nodes.bridgeSessionId
  ]) {
    input?.addEventListener("input", markRouteDirty);
    input?.addEventListener("change", markRouteDirty);
  }
  nodes.bridgePermissionMode?.addEventListener("change", () => {
    markSettingsDirty("route");
    void persistRoutePermissionMode().catch((error) => renderPhase("waiting", error.message));
  });
  nodes.systemPrompt?.addEventListener("input", markRouteDirty);
  nodes.systemPromptInsert?.addEventListener("click", (event) => {
    event.preventDefault();
    insertSystemPromptTemplate();
  });
  nodes.ttsEnabled?.addEventListener("change", () => {
    handleTtsEnabledChange(nodes.ttsEnabled);
  });
  nodes.ttsPanelEnabled?.addEventListener("change", () => {
    handleTtsEnabledChange(nodes.ttsPanelEnabled);
  });
  document.addEventListener("change", (event) => {
    const input = event.target;
    if (
      input instanceof HTMLInputElement &&
      TTS_PLAYBACK_MODE_NAMES.includes(input.name)
    ) {
      handleTtsPlaybackModeChange(input);
    }
  });
  nodes.sttEnabled?.addEventListener("change", () => {
    handleSttEnabledChange(nodes.sttEnabled);
  });
  nodes.sttPanelEnabled?.addEventListener("change", () => {
    handleSttEnabledChange(nodes.sttPanelEnabled);
  });
  for (const el of [nodes.sttPrompt]) {
    el?.addEventListener("change", markSttDirty);
  }
  nodes.sttPrompt?.addEventListener("input", markSttDirty);
  nodes.sttLang?.addEventListener("change", () => {
    applyRecognitionLang();
    markSttDirty();
  });
  nodes.sttEngine?.addEventListener("change", () => {
    if (state.settings) state.settings.sttEngine = normalizeSttEngine(nodes.sttEngine.value);
    updateSttEngineUi();
    updateVoiceModeSelectUi();
    markSttDirty();
  });
  nodes.sttSource?.addEventListener("change", () => {
    if (state.settings) state.settings.voiceInputSource = normalizeSttSource(nodes.sttSource.value);
    updateVoiceModeSelectUi();
    updateComposeVoiceUi();
    updateSttEngineNote();
    markSttDirty();
  });
  nodes.voiceMode?.addEventListener("change", () => {
    updateComposeGlobalListenUi();
  });
  for (const el of [nodes.sttWhisperModel, nodes.sttElevenlabsKey, nodes.sttElevenlabsModel]) {
    el?.addEventListener("input", markSttDirty);
    el?.addEventListener("change", markSttDirty);
  }
  nodes.voiceGlobalListen?.addEventListener("change", () => {
    if (state.settings) state.settings.voiceGlobalListen = nodes.voiceGlobalListen.checked;
    updateComposeGlobalListenUi();
    updateVoiceModeSelectUi();
    updateSttEngineNote();
    syncCompactSensorAvailability();
    markSttDirty();
  });
  nodes.voiceToCompose?.addEventListener("change", () => {
    if (state.settings) state.settings.voiceToCompose = Boolean(nodes.voiceToCompose.checked);
    updateVoiceToComposeUi();
    markSttDirty();
  });
  if (nodes.voiceConfirm) {
    nodes.voiceConfirm.addEventListener("change", () => {
      const sendImmediately = Boolean(nodes.voiceConfirm.checked);
      if (state.settings) state.settings.voiceResponseEnabled = sendImmediately;
      writeVoiceConfirmSetting(!sendImmediately);
      markSttDirty();
    });
  }
  nodes.proactiveRow?.addEventListener("click", () => {
    void toggleProactiveFromHero();
  });
  nodes.proactiveToggle?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void toggleProactiveFromHero();
    }
  });
  preventDetailsToggleOnControl(nodes.ttsPlaybackModeGroup);
  preventDetailsToggleOnControl(nodes.ttsPlaybackHint);
  preventDetailsToggleOnControl(nodes.ttsEnabled);
  preventDetailsToggleOnControl(nodes.ttsEnabled?.closest("label"));
  preventDetailsToggleOnControl(nodes.ttsPanelEnabled);
  preventDetailsToggleOnControl(nodes.ttsPanelEnabled?.closest("label"));
  preventDetailsToggleOnControl(nodes.sttEnabled);
  preventDetailsToggleOnControl(nodes.sttEnabled?.closest("label"));
  preventDetailsToggleOnControl(nodes.sttPanelEnabled);
  preventDetailsToggleOnControl(nodes.sttPanelEnabled?.closest("label"));
  preventDetailsToggleOnControl(document.querySelector("#shell-tts-panel .shell-tts-panel-playback-field"));
  nodes.ttsTestBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    void testTtsEngine();
  });
  for (const el of [
    nodes.ttsPrompt,
    nodes.ttsEngine,
    nodes.ttsLang,
    nodes.ttsVoice,
    nodes.ttsSayLang,
    nodes.ttsSayVoice,
    nodes.ttsEdgeVoice,
    nodes.ttsPiperModel,
    nodes.ttsPiperBinary,
    nodes.ttsElevenlabsKey,
    nodes.ttsElevenlabsVoiceId,
    nodes.ttsElevenlabsModel,
    nodes.ttsRate,
    nodes.ttsPitch
  ]) {
    el?.addEventListener("change", markTtsDirty);
  }
  nodes.ttsPrompt?.addEventListener("input", markTtsDirty);
  nodes.ttsPromptInsert?.addEventListener("click", (event) => {
    event.preventDefault();
    insertTtsPromptTemplate();
  });
  nodes.sttPromptInsert?.addEventListener("click", (event) => {
    event.preventDefault();
    insertSttPromptTemplate();
  });
  nodes.proactivePromptInsert?.addEventListener("click", (event) => {
    event.preventDefault();
    insertProactivePromptTemplate();
  });
  for (const el of [
    nodes.proactiveEnabled,
    nodes.proactiveIdleMin,
    nodes.proactiveIdleMax,
    nodes.proactiveCooldownSeconds,
    nodes.proactiveQuietEnabled,
    nodes.proactiveQuietStart,
    nodes.proactiveQuietEnd
  ]) {
    el?.addEventListener("change", markProactiveDirty);
    el?.addEventListener("input", markProactiveDirty);
  }
  nodes.proactivePrompt?.addEventListener("input", markProactiveDirty);
  nodes.proactivePrompt?.addEventListener("change", markProactiveDirty);
  nodes.proactiveEnabled?.addEventListener("change", () => {
    const patch = collectProactiveFormPatch();
    shellProactive?.syncSettings({ ...(state.settings || {}), ...patch });
    const enabled = Boolean(patch.proactiveEnabled);
    if (enabled === Boolean(state.settings?.proactiveEnabled)) return;
    shellLog("proactive", enabled ? "Включена в настройках" : "Выключена в настройках");
    void saveSettings({ proactiveEnabled: enabled }, { apply: "none" })
      .then(() => {
        state.settings = { ...(state.settings || {}), proactiveEnabled: enabled };
        settingsSave.patchBaseline("proactive", { proactiveEnabled: enabled });
      })
      .catch((error) => shellLog("error", "Не сохранилась проактивность", error.message));
  });
  nodes.ttsPiperModel?.addEventListener("blur", markTtsDirty);
  nodes.ttsPiperBinary?.addEventListener("blur", markTtsDirty);
  nodes.ttsElevenlabsKey?.addEventListener("input", () => {
    markTtsDirty();
    void loadTtsCapabilities();
  });
  nodes.ttsElevenlabsKey?.addEventListener("blur", () => {
    markTtsDirty();
    void maybeAutoSaveElevenlabsCredentials();
  });
  nodes.ttsElevenlabsVoiceId?.addEventListener("input", markTtsDirty);
  nodes.ttsElevenlabsVoiceId?.addEventListener("blur", () => {
    markTtsDirty();
    void maybeAutoSaveElevenlabsCredentials();
  });
  nodes.ttsRate?.addEventListener("input", () => {
    updateTtsRateLabel();
    markTtsDirty();
  });
  nodes.ttsPitch?.addEventListener("input", () => {
    updateTtsPitchLabel();
    markTtsDirty();
  });
  nodes.ttsEngine?.addEventListener("change", () => {
    const engine = normalizeTtsEngine(nodes.ttsEngine.value);
    state.settings = { ...(state.settings || {}), ttsEngine: engine };
    void (async () => {
      updateTtsEngineUi();
      if (engine === "browser" || engine === "say") {
        await applyContrastVoiceDefaults(engine);
      } else {
        await refreshTtsEngineVoices(engine);
      }
      void loadTtsCapabilities();
      markTtsDirty();
    })();
  });
  nodes.ttsLang?.addEventListener("change", () => {
    void refreshTtsEngineVoices("browser");
    markTtsDirty();
  });
  nodes.ttsVoiceRefresh?.addEventListener("click", () => {
    const btn = nodes.ttsVoiceRefresh;
    btn?.classList.add("is-busy");
    btn?.setAttribute("disabled", "disabled");
    void refreshTtsVoiceOptions().finally(() => {
      btn?.classList.remove("is-busy");
      btn?.removeAttribute("disabled");
    });
  });
  nodes.ttsSayLang?.addEventListener("change", () => {
    void refreshTtsEngineVoices("say");
    markTtsDirty();
  });
  if (typeof speechSynthesis !== "undefined") {
    speechSynthesis.addEventListener("voiceschanged", refreshTtsVoiceOptions);
  }
  nodes.voiceMode?.addEventListener("pointerdown", () => {
    state.voiceModeInteracting = true;
  });
  nodes.voiceMode?.addEventListener("focus", () => {
    state.voiceModeInteracting = true;
  });
  nodes.voiceMode?.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (document.activeElement !== nodes.voiceMode) {
        state.voiceModeInteracting = false;
        syncVoiceModeSelectFromDom();
        if (state.pendingVoiceInputMode) {
          const pending = normalizeVoiceInputMode(state.pendingVoiceInputMode);
          const stored = normalizeVoiceInputMode(state.settings?.voiceInputMode || "hold");
          if (pending === stored) state.pendingVoiceInputMode = null;
        }
      }
    }, 0);
  });
  nodes.voiceMode?.addEventListener("change", () => commitVoiceModeSelection());
  nodes.voiceMode?.addEventListener("input", () => syncVoiceModeSelectFromDom());
  nodes.voiceMode?.addEventListener("pointerup", () => {
    window.requestAnimationFrame(() => syncVoiceModeSelectFromDom());
  });
  nodes.voiceMode?.addEventListener("keyup", (event) => {
    if (event.key === "ArrowUp" || event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      syncVoiceModeSelectFromDom();
    }
  });

  bindComposeSendUi();
  nodes.composeExpandToggle?.addEventListener("click", toggleComposeExpanded);
  nodes.composeExpandBackdrop?.addEventListener("click", () => setComposeExpanded(false));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !composeDraftExpanded) return;
    event.preventDefault();
    setComposeExpanded(false);
  });

  bindMicUi();
  nodes.ttsStopBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    bumpTtsPlayback();
    stopBrowserTts({ bumpPlayback: false });
    releaseMessagePipeline();
  });
  nodes.ttsDownloadBtn?.addEventListener("click", () => void downloadLastTtsAudio());
  nodes.ttsDownloadPanelBtn?.addEventListener("click", () => void downloadLastTtsAudio());

  nodes.ttsPauseBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    pauseTtsPlayback();
  });
  nodes.ttsResumeBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    resumeTtsPlayback();
  });

  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space" || event.repeat) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (isTypingTarget(event.target)) return;
    if (!isTtsPlaybackActive()) return;
    event.preventDefault();
    toggleTtsPauseResume();
  });

  nodes.openCmsBtn?.addEventListener("click", () => {
    const url = state.agentId ? `/${encodeURIComponent(state.agentId)}/` : "/";
    window.open(url, "_blank");
    if (window.shellApp?.positionWindowBottomCenter) {
      void window.shellApp.positionWindowBottomCenter();
    }
  });

  nodes.voicePrimaryStar?.addEventListener("click", () => {
    window.focus();
    void shellPresenceController?.ping({ interact: true });
    updateVoicePrimaryStar();
  });

  nodes.qwenpawNewChat?.addEventListener("click", () => {
    void startNewQwenPawChat().catch((error) => renderPhase("waiting", error.message));
  });

  nodes.qwenpawChatName?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void renameQwenPawChatName({ force: true });
      nodes.qwenpawChatName?.blur();
    }
  });
  nodes.qwenpawChatName?.addEventListener("blur", () => {
    void renameQwenPawChatName();
  });

  nodes.qwenpawChatsToggle?.addEventListener("click", () => {
    const nextOpen = !state.qwenpawChatsOpen;
    setQwenPawChatsOpen(nextOpen);
    if (nextOpen) {
      void loadQwenPawChats().catch((error) => renderPhase("waiting", error.message));
    }
  });

  document.addEventListener("click", (event) => {
    if (!state.qwenpawChatsOpen || !nodes.qwenpawChatsPanel) return;
    const chatRoot = document.getElementById("shell-qwenpaw-chat");
    if (chatRoot && !chatRoot.contains(event.target)) setQwenPawChatsOpen(false);
  });

  updateTtsControlsUi();
  updateTtsDownloadUi();
  bindComposeReadyStatus();
  document.body.dataset.shellUiBound = "1";
  } catch (error) {
    shellLog("error", "bindUi failed", error.message);
    console.error("[shell bindUi]", error);
    throw error;
  }
}

function bindShellInteractiveUi() {
  if (document.body.dataset.shellInteractiveBound === "1") return;
  try {
    bindShellClickHandlers();
    const permissionApi = initShellPermissions({
      bannerEl: nodes.permissionBanner,
      micDialog: nodes.micDialog
    });
    bindMicPermissionsUi(permissionApi);
    initShellHelp({
      helpBtn: nodes.helpBtn,
      helpDialog: nodes.helpDialog,
      helpClose: nodes.helpClose,
      micHelpLink: nodes.helpMicLink,
      onMicHelp: showMicPermissionDialog
    });
    initShellHints();
    initShellImageLightbox();
    if (nodes.micDialogUrl) {
      nodes.micDialogUrl.textContent = getShellHttpsUrl();
    }
    syncMicPermissionUi();
    initShellOrientationChip({
      button: nodes.orientChip,
      valueEl: nodes.orientValue
    });
    initShellLocationChip({
      button: nodes.locationChip,
      valueEl: nodes.locationValue,
      shareBtn: nodes.locationShare
    });
    ttsPlayer = createShellTtsPlayer({ apiFetch, getTtsSettings: collectTtsRuntimeSettings });
    ttsTabCoordinator = createShellTtsTabCoordinator({
      onYieldSpeech: (reason) => yieldLocalTtsPlayback(reason)
    });
    initShellProactiveController();
    shellDebug.mount({
      btn: nodes.debugBtn,
      panel: nodes.debugPanel,
      clearBtn: nodes.debugClear,
      closeBtn: nodes.debugClose
    });
    try {
      bindUi();
    } catch (bindUiError) {
      window.__shellBindUiError = String(bindUiError?.message || bindUiError);
      shellLog("error", "bindUi failed", bindUiError.message);
      console.error("[shell bindUi]", bindUiError);
    }
    setSettingsTab(state.settingsTab || "route");
    bindWindowSettingsUi();
    populateThinkingSoundPickers();
    updateTtsDownloadUi();
    setupSpeechRecognition();
    shellKeepAwake = initShellKeepAwake(state, { getEnabled: readKeepAwakeSetting });
    composeLayout = initShellComposeLayout({
      nodes,
      getSessionUiLocked: () => state.sessionUiLocked
    });
    document.addEventListener("gesturestart", (event) => event.preventDefault());
    document.addEventListener("gesturechange", (event) => event.preventDefault());
    setupPttKeyboard();
    startClock();
    window.addEventListener("online", syncDialogConnectionState);
    window.addEventListener("offline", syncDialogConnectionState);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        stopShellProcessingAmbient();
      } else {
        renderClock();
      }
    });
    syncDialogConnectionState();
    setComposeExpanded(false);
    window.__shellUiReady = true;
    document.body.dataset.shellInteractiveBound = "1";
  } catch (error) {
    window.__shellUiReady = false;
    window.__shellBindError = String(error?.message || error);
    delete document.body.dataset.shellInteractiveBound;
    shellLog("error", "bindShellInteractiveUi failed", error.message);
    console.error("[shell bindShellInteractiveUi]", error);
    renderPhase("waiting", `Ошибка UI: ${error.message}`);
  }
}

async function connectShellAgentData() {
  if (!String(state.agentId || "").trim()) {
    shellLog("boot", "connectShellAgentData skipped — no agent");
    return;
  }
  refreshShellHeaderNodes();
  bindRuntimeSelectUi(nodes.messageTarget);
  try {
    await bootstrapRuntimeSelect();
  } catch (error) {
    shellLog("error", "bootstrapRuntimeSelect failed", error.message);
  }
  void pullRuntimeStatuses();
  try {
    connectStream();
    prepareDialogScrollRestore({ restoreOnLoad: true });
    await shellDialog.refreshHistory?.({ restoreScroll: true });
    await syncShellReplyAfterConnect("agent connect");
    await loadComposeDraft();
    syncComposeReadyStatus();
    commitAllSettingsBaselinesIfSafe();
    void loadQwenPawAgents();
    shellLog("boot", "Агент подключён", {
      agentId: state.agentId,
      messageTarget: state.settings?.messageTarget || getSelectedRuntime(),
      proactiveEnabled: Boolean(state.settings?.proactiveEnabled)
    });
  } catch (error) {
    shellLog("error", "connectShellAgentData failed", error.message);
    renderPhase("waiting", error.message);
  }
}

async function boot() {
  refreshShellHeaderNodes();
  startClock();
  setComposeExpanded(false);
  populateVoiceModeSelect();
  populateRuntimeSelect();
  renderHeaderHostChip();
  bindShellAgentGateUi();
  bindHeaderContextUi();
  bindSettingsDirtyUi();
  bindShellInteractiveUi();
  shellLog("boot", "Shell UI готов", { agentId: state.agentId || null, embed: shellEmbedMode });
  try {
    await populateHeaderAgentSelect();
  } catch (error) {
    shellLog("error", "Не удалось загрузить список агентов", error.message);
  }
  syncShellAgentReadyUi();
  if (window.agentAppLock?.whenUnlocked) {
    await window.agentAppLock.whenUnlocked();
  }
  cleanShellUrl();
  try {
    await ensureShellAgentSelected();
    await populateHeaderAgentSelect();
    syncAgentSelects();
    await bootstrapRuntimeSelect();
    syncShellAgentReadyUi();
  } catch (error) {
    shellLog("error", "Не удалось выбрать агента", error.message);
    renderPhase("waiting", error.message);
  }
  migrateShellStorageFromMobile();
  if (shellEmbedMode) {
    document.body.classList.add("shell-embed");
  }
  bindCmsComposeInsertBridge();
  bindCmsPagePickerBridge();
  initShellSurface({ onSurface: renderHeaderHostChip });
  if (!shellEmbedMode) {
    initShellInstallBanner({
      bannerEl: document.getElementById("shell-install-banner"),
      dismissBtn: document.getElementById("shell-install-dismiss")
    });
  }
  shellDialog.init();
  bindDialogScrollPersistence();
  shellSession = createShellSession(state, {
    nodes,
    shellDialog,
    closeStream: () => {
      if (state.eventSource) {
        state.eventSource.close();
        state.eventSource = null;
      }
    },
    connectStream,
    refreshStatus,
    syncConnectionState: syncDialogConnectionState,
    renderReconnectPhrase: () => renderPhase("waiting", "Переподключение…")
  });
  shellDialog.bindReconnect(({ soft } = {}) => {
    void shellSession.reconnect({ soft });
  });
  void bootShellAgentLayer();
  preloadShellMarkdown();
  void initBatteryMonitor();
  void initShellCharacter(nodes.characterStage, nodes.agentAvatar);
}

async function bootShellAgentLayer() {
  try {
    await resolveShellAgent();
    shellPresenceController?.stop();
    shellPresenceController = initShellPresence({
      agentId: state.agentId,
      apiFetch,
      getMicActive: () => Boolean(state.micActive || state.micTapHeld || state.pttHeld),
      getPttHeld: () => Boolean(state.pttHeld),
      onPresenceChange: applyVoicePresence
    });
    const surfacePayload = getShellSurfacePayload();
    void patchShellState({
      shellSurfaceHost: surfacePayload.surfaceHost,
      shellSurfaceHint: surfacePayload.surfaceHint,
      shellSurfaceBackend: surfacePayload.surfaceBackend
    }).catch(() => {});
    await loadShellPromptTemplates();
    await loadWindowSettings();
    if (shellEmbedMode) {
      applyWindowSettings({
        ...(state.windowSettings || {}),
        windowCompact: true,
        windowBackground: "wallpaper",
        windowTransparent: false,
        windowPetOverlay: false
      });
    }
  } catch (error) {
    shellLog("error", "Ошибка инициализации агента", error.message);
    renderPhase("waiting", error.message);
  }
  await connectShellAgentData();
}

void boot().catch((error) => {
  const msg = String(error?.message || error || "Ошибка загрузки Shell");
  shellLog("error", "Критическая ошибка boot", msg);
  console.error("[shell boot]", error);
  try {
    renderPhase("waiting", msg);
  } catch {
    const el = document.getElementById("shell-phase-phrase");
    if (el) el.textContent = msg;
  }
});
