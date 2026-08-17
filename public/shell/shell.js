import { loadAgentSelectData, getSelectableAgents } from "/shared/agent-select.js";
import { createTopicPicker } from "/shell/topic-picker.js";
import { createSettingsSaveController } from "/shell/shell-settings-save.js?v=2";
import { parseShellReply, renderShellReplyMedia, prepareSpeechText, pullSpeechSentences, parseDualReply, extractStreamingTtsBody, stripAllTtsBlocks } from "/shell/shell-reply.js?v=12";
import { renderShellReplyMarkdown, renderShellReplyBody } from "/shell/shell-markdown.js?v=6";
import { initShellCharacter } from "/shell/shell-character.js?v=18";
import { createShellCamera } from "/shell/shell-camera.js?v=2";
import { createShellScreen } from "/shell/shell-screen.js?v=1";
import { createShellTtsTabCoordinator } from "/shell/shell-tts-tab.js?v=1";
import { createShellTtsPlayer } from "/shell/shell-tts-player.js?v=8";
import { unlockShellAudio } from "/shell/shell-audio-unlock.js?v=1";
import { speakShellBrowserTts } from "/shell/shell-browser-tts.js?v=6";
import {
  formatTtsErrorHint,
  shellTtsFailureMessage,
  truncateForShellTts
} from "/shell/shell-tts-mobile.js?v=1";
import { createShellSession } from "/shell/shell-session.js?v=1";
import { getShellClientId } from "/shell/shell-client-id.js?v=1";
import { getShellSurfacePayload, initShellSurfaceSwitcher } from "/shell/shell-surface.js?v=2";
import { initShellOrientationChip, initShellLocationChip, getShellDeviceLocation, isShellLocationShareEnabled, refreshShellLocationForSend } from "/shell/shell-device-chips.js?v=3";
import { initShellInstallBanner } from "/shell/shell-pwa.js?v=2";
import {
  getShellHttpsUrl,
  initShellPermissions,
  shellPermissionIssue,
  warmUpMicrophone
} from "/shell/shell-permissions.js?v=1";
import { createShellDialog } from "/shell/shell-dialog.js?v=2";
import { initShellComposeLayout } from "/shell/shell-compose-layout.js?v=1";
import { migrateShellStorageFromMobile, SHELL_STORAGE } from "/shell/shell-storage-keys.js?v=1";
import { initShellHelp } from "/shell/shell-help.js?v=1";
import {
  buildComposeCameraMessage,
  captureOneShotCameraFrame,
  openCameraFilePicker,
  preferredComposeCameraFacing
} from "/shell/shell-compose-camera.js?v=1";
import {
  createShellTapVoice,
  createVoiceConfirmDialog,
  hapticTap,
  hapticSupported,
  initShellKeepAwake,
  isBrowserTapVoiceMode,
  readKeepAwakeSetting,
  readVoiceConfirmSetting,
  runHapticDemo,
  writeKeepAwakeSetting,
  writeVoiceConfirmSetting
} from "/shell/shell-voice.js?v=3";

const SERVER_TTS_ENGINES = new Set(["say", "edge", "piper", "elevenlabs"]);

/** Озвучка только после полного ответа агента (без streaming TTS по предложениям). */
const TTS_WAIT_FOR_COMPLETE_REPLY = true;

const DEFAULT_TTS_PROMPT = `Сформируй ответ в следующем формате. В начале ответа добавь блок [tts], в котором сформируй краткую версию текста для озвучки (предполагается, что ты работаешь в режиме голосового ассистента). Убери emoji, markdown и подробные детали, оставь только смысл и другие незначительные детали которые можно воспроизвести через TTS (text to speech). Закрой блок [/tts].

Далее — полный текст ответа для экрана.`;

const DEFAULT_STT_PROMPT = `Исправь пунктуацию и регистр, убери слова-паразиты («э-э», «эээ», «мм», «ну»), сохрани смысл. Верни только готовый текст для отправки агенту — без пояснений и обёрток.`;

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

/** @type {{ ttsPrompt: string, sttPrompt: string, sources: { ttsPrompt: string | null, sttPrompt: string | null } }} */
let shellPromptTemplates = {
  ttsPrompt: DEFAULT_TTS_PROMPT,
  sttPrompt: DEFAULT_STT_PROMPT,
  sources: { ttsPrompt: null, sttPrompt: null }
};

const PHASE_LABELS = {
  waiting: "🟡 Ожидаю",
  listening: "🔴 Слушаю",
  thinking: "🟢 Думаю",
  speaking: "🔊 Говорю",
  disabled: "⏸️ Отключено"
};

const VOICE_MODE_TITLES = {
  disabled: "Отключен",
  browser: "Браузер (микрофон)",
  sidecar: "Sidecar (Python)",
  always: "Sidecar · всегда слушать",
  fn_button: "Shift (удерживать)"
};

const COMPOSE_DRAFT_SAVE_MS = 700;

let composeDraftSavedText = null;
let composeDraftSaveTimer = null;
let composeDraftSaveInFlight = null;
let composeDraftExpanded = false;
let ttsTestBusy = false;

function isShellEmbedMode() {
  try {
    return new URLSearchParams(window.location.search).get("embed") === "1";
  } catch {
    return false;
  }
}

const shellEmbedMode = isShellEmbedMode();

let lastHandledAssistantId = "";
let lastSpokenBody = "";
let lastHandledStreamId = "";
let lastStreamHandledBody = "";
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
  micWarmed: false,
  pttHeld: false,
  pttKeyboardHeld: false,
  sidecarConnected: false,
  qwenpawConnected: false,
  qwenpawServerOk: false,
  qwenpawAgentOk: false,
  qwenpawAgentName: "",
  qwenpawAgentError: "",
  qwenpawSessionId: "",
  qwenpawChatsOpen: false,
  qwenpawChatNameDraft: "",
  qwenpawRenameBusy: false,
  stopTtsAt: 0,
  previousPhase: "waiting",
  cameraSnapshotBusy: false,
  composeCameraBusy: false,
  cameraAppliedKey: "",
  screenSnapshotBusy: false,
  screenAppliedKey: "",
  view: "main",
  chatOpen: true,
  routeOpen: false,
  characterPickerOpen: false,
  mediaMode: "",
  clockTimer: null,
  assistantStream: null,
  streamTtsQueue: [],
  streamTtsActive: false,
  streamTtsCursor: 0,
  messagePipelineBusy: false,
  processingMessage: "",
  queueEditingId: "",
  messageStopped: false,
  sessionUiLocked: false,
  sttResumeMode: "browser",
  /** shellClientId отправителя текущего вопроса — для надёжной маршрутизации TTS */
  pendingReplyTtsClientId: ""
};

let messageSendAbortController = null;
let ttsTabCoordinator = null;
let ttsPlayer = null;
let ttsPlaybackSeq = 0;
const settingsSave = createSettingsSaveController();
let onRouteSettingsDirty = () => {};

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
    state.pendingReplyTtsClientId === getShellClientId()
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
    void patchShellState({ phase: "waiting", phrase: "Готов к сообщению" }).then(() => {
      renderPhase("waiting", `Готов к сообщению${queuePhraseSuffix()}`, state.shellState?.metrics || "");
    });
  }
}

function getTtsEngine() {
  if (nodes.ttsEngine) return nodes.ttsEngine.value || "browser";
  return state.settings?.ttsEngine || "browser";
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

  const mine = getShellClientId();
  const pending = String(state.pendingReplyTtsClientId || "").trim();
  const target = String(meta.ttsClientId || "").trim();

  if (pending === mine || target === mine) {
    ttsTabCoordinator?.claimLeader({ force: true });
    return true;
  }
  if (state.micActive || state.pttHeld || isLocalMessagePipelineActive()) {
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
  return nodes.voiceMode?.value || state.settings?.voiceInputMode || "browser";
}

function isFnButtonMode() {
  return getVoiceInputMode() === "fn_button";
}

function usesSidecarPtt(mode = getVoiceInputMode()) {
  return mode === "sidecar" || mode === "always" || (mode === "fn_button" && state.sidecarConnected);
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
      state.pttHeld ? "Sidecar слушает…" : "Готов к сообщению"
    );
  });
}

function beginPttHold() {
  const mode = getVoiceInputMode();
  if (mode === "disabled") return;
  if (isTypingTarget(document.activeElement)) return;
  if (state.pttKeyboardHeld) return;
  state.pttKeyboardHeld = true;

  if (mode === "fn_button" && state.sidecarConnected) return;

  if (mode === "sidecar" || mode === "always") {
    void setPttHeldRemote(true);
    return;
  }

  if ((mode === "fn_button" || mode === "browser") && state.recognition && shellTapVoice) {
    shellTapVoice.prepareSession();
    void shellTapVoice.startSession();
  }
}

function endPttHold() {
  if (!state.pttKeyboardHeld) return;
  state.pttKeyboardHeld = false;

  const mode = getVoiceInputMode();
  if (mode === "fn_button" && state.sidecarConnected) return;

  if (mode === "sidecar" || mode === "always") {
    void setPttHeldRemote(false);
    return;
  }

  if ((mode === "fn_button" || mode === "browser") && state.recognition && (state.micActive || state.micTapHeld)) {
    try {
      state.recognition.stop();
    } catch {
      // ignore
    }
  }
}

function setupPttKeyboard() {
  window.addEventListener("keydown", (event) => {
    if (!isFnButtonMode()) return;
    if (state.sidecarConnected) return;
    if (event.repeat) return;
    if (!isPttKeyEvent(event)) return;
    if (isTypingTarget(event.target)) return;
    event.preventDefault();
    beginPttHold();
  });

  window.addEventListener("keyup", (event) => {
    if (!isFnButtonMode()) return;
    if (state.sidecarConnected) return;
    if (!isPttKeyEvent(event)) return;
    event.preventDefault();
    endPttHold();
  });

  window.addEventListener("blur", () => {
    if (state.pttKeyboardHeld) endPttHold();
  });

  window.shellApp?.onPttKey?.((payload) => {
    if (!isFnButtonMode() || state.sidecarConnected) return;
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
  qwenpawPanel: document.getElementById("shell-qwenpaw-panel"),
  qwenpawUrl: document.getElementById("shell-qwenpaw-url"),
  qwenpawOpenUrl: document.getElementById("shell-qwenpaw-open-url"),
  qwenpawAgentId: document.getElementById("shell-qwenpaw-agent-id"),
  qwenpawChatName: document.getElementById("shell-qwenpaw-chat-name"),
  qwenpawChatSession: document.getElementById("shell-qwenpaw-chat-session"),
  qwenpawNewChat: document.getElementById("shell-qwenpaw-new-chat"),
  qwenpawChatsToggle: document.getElementById("shell-qwenpaw-chats-toggle"),
  qwenpawChatsPanel: document.getElementById("shell-qwenpaw-chats-panel"),
  topicPath: document.getElementById("shell-topic-path"),
  topicField: document.getElementById("shell-topic-field"),
  topicTrigger: document.getElementById("shell-topic-trigger"),
  topicTriggerLabel: document.getElementById("shell-topic-trigger-label"),
  topicTriggerPath: document.getElementById("shell-topic-trigger-path"),
  topicPopover: document.getElementById("shell-topic-popover"),
  topicSearch: document.getElementById("shell-topic-search"),
  topicTree: document.getElementById("shell-topic-tree"),
  ttsEnabled: document.getElementById("shell-tts-enabled"),
  ttsSettingsToggle: document.getElementById("shell-tts-settings-toggle"),
  ttsSettingsPanel: document.getElementById("shell-tts-settings"),
  ttsPrompt: document.getElementById("shell-tts-prompt"),
  ttsPromptInsert: document.getElementById("shell-tts-prompt-insert"),
  ttsEngine: document.getElementById("shell-tts-engine"),
  ttsTestBtn: document.getElementById("shell-tts-test"),
  ttsEngineFields: document.getElementById("shell-tts-engine-fields"),
  ttsEdgeVoice: document.getElementById("shell-tts-edge-voice"),
  ttsPiperModel: document.getElementById("shell-tts-piper-model"),
  ttsPiperBinary: document.getElementById("shell-tts-piper-binary"),
  ttsElevenlabsKey: document.getElementById("shell-tts-elevenlabs-key"),
  ttsElevenlabsVoiceId: document.getElementById("shell-tts-elevenlabs-voice-id"),
  ttsCapabilitiesNote: document.getElementById("shell-tts-capabilities-note"),
  ttsEngineHint: document.getElementById("shell-tts-engine-hint"),
  ttsVoiceLabel: document.getElementById("shell-tts-voice-label"),
  ttsLang: document.getElementById("shell-tts-lang"),
  ttsVoice: document.getElementById("shell-tts-voice"),
  ttsRate: document.getElementById("shell-tts-rate"),
  ttsRateValue: document.getElementById("shell-tts-rate-value"),
  sttEnabled: document.getElementById("shell-stt-enabled"),
  sttSettingsToggle: document.getElementById("shell-stt-settings-toggle"),
  sttSettingsPanel: document.getElementById("shell-stt-settings"),
  sttPrompt: document.getElementById("shell-stt-prompt"),
  sttPromptInsert: document.getElementById("shell-stt-prompt-insert"),
  sttLang: document.getElementById("shell-stt-lang"),
  sttEngine: document.getElementById("shell-stt-engine"),
  topmost: document.getElementById("shell-topmost"),
  windowTransparent: document.getElementById("shell-window-transparent"),
  windowBackground: document.getElementById("shell-window-background"),
  windowCompact: document.getElementById("shell-compact-toggle"),
  voiceMode: document.getElementById("shell-voice-mode"),
  voiceControl: document.getElementById("shell-voice-control"),
  fnPttHint: document.getElementById("shell-fn-ptt-hint"),
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
  helpDialog: document.getElementById("shell-help-dialog"),
  helpClose: document.getElementById("shell-help-close"),
  helpMicLink: document.getElementById("shell-help-mic-link"),
  voiceConfirm: document.getElementById("shell-voice-confirm"),
  voiceConfirmDialog: document.getElementById("shell-voice-confirm-dialog"),
  voiceConfirmForm: document.getElementById("shell-voice-confirm-form"),
  voiceConfirmText: document.getElementById("shell-voice-confirm-text"),
  voiceRetry: document.getElementById("shell-voice-retry"),
  voiceCancel: document.getElementById("shell-voice-cancel"),
  heroCancelSend: document.getElementById("shell-hero-cancel-send"),
  keepAwake: document.getElementById("shell-keep-awake"),
  hapticTestBtn: document.getElementById("shell-haptic-test"),
  ttsControls: document.getElementById("shell-tts-controls"),
  ttsPauseBtn: document.getElementById("shell-tts-pause"),
  ttsResumeBtn: document.getElementById("shell-tts-resume"),
  ttsStopBtn: document.getElementById("shell-tts-stop"),
  ttsDownloadBtn: document.getElementById("shell-tts-download"),
  ttsDownloadPanelBtn: document.getElementById("shell-tts-download-panel"),
  voiceWave: document.getElementById("shell-voice-wave"),
  settingsBtn: document.getElementById("shell-settings-btn"),
  windowSave: document.getElementById("shell-window-save"),
  routeSave: document.getElementById("shell-route-save"),
  ttsSave: document.getElementById("shell-tts-save"),
  ttsSaveHint: document.getElementById("shell-tts-save-hint"),
  sttSave: document.getElementById("shell-stt-save"),
  homeBtn: document.getElementById("shell-home-btn"),
  homeBrand: document.getElementById("shell-home-brand"),
  openCmsBtn: document.getElementById("shell-open-cms"),
  shellApp: document.getElementById("shell-app"),
  mainView: document.getElementById("shell-main-view"),
  subtitle: document.getElementById("shell-subtitle"),
  agentAvatar: document.getElementById("shell-agent-avatar"),
  characterStage: document.getElementById("shell-character-stage"),
  characterToggle: document.getElementById("shell-character-toggle"),
  characterPickerWrap: document.getElementById("shell-character-picker-wrap"),
  characterPicker: document.getElementById("shell-character-picker"),
  sessionToggle: document.getElementById("shell-session-toggle"),
  replyPanel: document.getElementById("shell-reply-panel"),
  dialogScroll: document.getElementById("shell-dialog-scroll"),
  composePanel: document.getElementById("shell-compose-panel"),
  composeDock: document.getElementById("shell-compose-dock"),
  messageQueue: document.getElementById("shell-message-queue"),
  messageQueueActive: document.getElementById("shell-message-queue-active"),
  messageQueueActiveText: document.getElementById("shell-message-queue-active-text"),
  messageQueueCount: document.getElementById("shell-message-queue-count"),
  messageQueueList: document.getElementById("shell-message-queue-list"),
  routeToggle: document.getElementById("shell-route-toggle"),
  routePanel: document.getElementById("shell-route-panel"),
  watchCamera: document.getElementById("shell-watch-camera"),
  composeCameraStub: document.getElementById("shell-compose-camera-stub"),
  composeCameraFile: document.getElementById("shell-compose-camera-file"),
  watchScreen: document.getElementById("shell-watch-screen"),
  screenshotAction: document.getElementById("shell-screenshot-action"),
  clipboardReadAction: document.getElementById("shell-clipboard-read-action"),
  clipboardPasteAction: document.getElementById("shell-clipboard-paste-action"),
  compactAction: document.getElementById("shell-compact-action"),
  mediaSection: document.getElementById("shell-media-section"),
  phaseLabel: document.getElementById("shell-phase-label"),
  battery: document.getElementById("shell-battery"),
  batteryFill: document.getElementById("shell-battery-fill"),
  batteryLevel: document.getElementById("shell-battery-level"),
  clock: document.getElementById("shell-clock"),
  linkChip: document.getElementById("shell-link-chip"),
  linkChipDot: document.getElementById("shell-link-chip-dot"),
  linkChipLabel: document.getElementById("shell-link-chip-label"),
  linkChipOpen: document.getElementById("shell-link-chip-open"),
  agentChip: document.getElementById("shell-agent-chip"),
  serverChip: document.getElementById("shell-server-chip"),
  orientChip: document.getElementById("shell-orient-chip"),
  orientValue: document.getElementById("shell-orient-value"),
  locationChip: document.getElementById("shell-location-chip"),
  locationValue: document.getElementById("shell-location-value"),
  locationShare: document.getElementById("shell-location-share"),
  meta: document.getElementById("shell-meta"),
  pulse: document.getElementById("shell-pulse"),
  lastReply: document.getElementById("shell-last-reply"),
  lastReplyText: document.getElementById("shell-last-reply-text"),
  lastReplyMedia: document.getElementById("shell-last-reply-media"),
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

const topicPicker = createTopicPicker({
  rootEl: document.getElementById("shell-topic-picker"),
  triggerEl: nodes.topicTrigger,
  labelEl: nodes.topicTriggerLabel,
  pathEl: nodes.topicTriggerPath,
  popoverEl: nodes.topicPopover,
  searchEl: nodes.topicSearch,
  treeEl: nodes.topicTree,
  hiddenInputEl: nodes.topicPath,
  getAgentId: () => state.agentId,
  onChange: () => {
    onRouteSettingsDirty();
  }
});

const shellDialog = createShellDialog({
  panel: nodes.replyPanel,
  scroll: document.getElementById("shell-dialog-scroll"),
  collapseBtn: document.getElementById("shell-dialog-collapse"),
  collapseHint: document.getElementById("shell-dialog-collapse-hint"),
  statusDot: document.getElementById("shell-status-dot"),
  reconnectBtn: document.getElementById("shell-reconnect-btn"),
  copyBtn: document.getElementById("shell-copy-reply"),
  shareBtn: document.getElementById("shell-share-reply"),
  historyOpen: document.getElementById("shell-history-open"),
  historyCount: document.getElementById("shell-history-count"),
  historyDialog: document.getElementById("shell-history-dialog"),
  historyClose: document.getElementById("shell-history-close"),
  historyList: document.getElementById("shell-history-list"),
  lastAskWrap: document.getElementById("shell-last-ask-wrap"),
  lastAsk: document.getElementById("shell-last-ask"),
  errorEl: document.getElementById("shell-dialog-error"),
  pullHint: document.getElementById("shell-pull-hint")
});

let shellSession = null;

function syncDialogConnectionState(override) {
  const conn = override || resolveShellServerConnectionState();
  shellDialog.setConnectionState(conn);
  renderServerChip();
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
  return new Intl.DateTimeFormat(SHELL_CLOCK_LOCALE, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

const ROUTE_CHIP_LABELS = {
  qwenpaw: "QwenPaw",
  "qwenpaw-log": "QwenPaw",
  cms: "CMS"
};

function renderAgentChip() {
  if (!nodes.agentChip) return;
  const label = state.agentLabel || state.agentId || "—";
  nodes.agentChip.textContent = label;
  nodes.agentChip.title = state.agentId
    ? `Workspace · agent=${state.agentId}`
    : "Workspace CMS";
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

function renderServerChip() {
  if (!nodes.serverChip) return;
  const host = window.location.host || "localhost";
  nodes.serverChip.textContent = host;
  const conn = resolveShellServerConnectionState();
  nodes.serverChip.dataset.state = conn;
  const titles = {
    live: `Live · ${host}`,
    error: `Обрыв SSE · ${host}`,
    offline: "Нет сети",
    connecting: `Подключение… · ${host}`
  };
  nodes.serverChip.title = titles[conn] || titles.connecting;
}

function renderHeroLinkChip() {
  if (!nodes.linkChip || !nodes.linkChipDot || !nodes.linkChipLabel) return;
  const target = state.settings?.messageTarget || nodes.messageTarget?.value || "cms";
  const label = ROUTE_CHIP_LABELS[target] || "CMS";
  const streamLive = state.eventSource?.readyState === EventSource.OPEN;
  const online = navigator.onLine !== false;
  const usesQwen = usesQwenPawTarget(target);
  let status = "off";
  let dot = "🔴";
  let title = `${label} · нет связи`;

  if (usesQwen) {
    const agentLabel = state.qwenpawAgentName || state.settings?.qwenpawAgentId || "default";
    if (!online) {
      title = `${label} · нет сети`;
    } else if (!state.qwenpawServerOk) {
      title = `${label} · сервер недоступен`;
    } else if (!state.qwenpawAgentOk) {
      status = "off";
      dot = "🔴";
      title = state.qwenpawAgentError || `${label} · агент «${agentLabel}» недоступен`;
    } else if (streamLive) {
      status = "ok";
      dot = "🟢";
      title = `${label} · ${agentLabel} · на связи`;
    } else {
      status = "partial";
      dot = "🟡";
      title = `${label} · ${agentLabel} · агент ok, SSE отключён`;
    }
  } else if (streamLive && online) {
    status = "ok";
    dot = "🟢";
    title = `${label} · на связи`;
  }

  nodes.linkChip.dataset.status = status;
  nodes.linkChipDot.textContent = dot;
  nodes.linkChipLabel.textContent = label;
  nodes.linkChip.title = title;
  if (nodes.linkChipOpen) {
    nodes.linkChipOpen.classList.toggle("hidden", !usesQwen);
    nodes.linkChipOpen.title = usesQwen ? "Открыть QwenPaw" : "";
  }
  renderServerChip();
  syncDialogConnectionState();
}

function renderClock() {
  if (!nodes.clock) return;
  const now = new Date();
  nodes.clock.textContent = formatShellClock(now);
  nodes.clock.dateTime = now.toISOString();
}

function startClock() {
  renderClock();
  if (state.clockTimer) clearInterval(state.clockTimer);
  state.clockTimer = setInterval(renderClock, 1000);
}

function renderBattery(battery) {
  if (!nodes.battery || !nodes.batteryFill || !nodes.batteryLevel) return;
  const level = Math.max(0, Math.min(100, Math.round((battery?.level || 0) * 100)));
  const charging = Boolean(battery?.charging);
  nodes.battery.classList.remove("hidden");
  nodes.battery.dataset.charging = charging ? "1" : "0";
  nodes.battery.dataset.level = level <= 10 ? "critical" : level <= 20 ? "low" : "normal";
  nodes.batteryFill.setAttribute("width", String((level / 100) * BATTERY_FILL_MAX));
  nodes.batteryLevel.textContent = `${level}%`;
  nodes.battery.title = charging ? `Батарея: ${level}% (зарядка)` : `Батарея: ${level}%`;
}

async function initBatteryMonitor() {
  if (!navigator.getBattery) {
    nodes.battery?.classList.add("hidden");
    return;
  }
  try {
    const battery = await navigator.getBattery();
    const update = () => renderBattery(battery);
    update();
    battery.addEventListener("levelchange", update);
    battery.addEventListener("chargingchange", update);
  } catch {
    nodes.battery?.classList.add("hidden");
  }
}

function livePhraseFromStatus(shellState, latestAgentMessage) {
  const phase = shellState?.phase || "waiting";
  let phrase = String(shellState?.phrase || "").trim();
  const replyBody = String(latestAgentMessage?.body || "").trim();
  if (replyBody && phrase && phrase === replyBody.slice(0, 240)) {
    phrase = "";
  }
  if (!phrase && phase === "waiting") return "Готов к сообщению";
  return phrase;
}

function resolveDisplayPhase(requestedPhase = "waiting") {
  const phase = PHASE_LABELS[requestedPhase] ? requestedPhase : "waiting";

  if (phase === "disabled") return "disabled";
  if (state.micActive || state.micTapHeld || state.pttHeld || state.pttKeyboardHeld) return "listening";
  if (isTtsPlaybackActive()) return "speaking";
  if (state.assistantStream && !state.assistantStream.finalized) return "thinking";
  if (state.messagePipelineBusy) return "thinking";
  if (phase === "speaking" && !isTtsPlaybackActive()) return "waiting";

  return phase;
}

function maybeResetStaleSpeakingPhase() {
  if (state.shellState?.phase !== "speaking") return;
  if (isTtsPlaybackActive()) return;
  void patchShellState({ phase: "waiting", phrase: "Готов к сообщению" });
}

function renderPhase(phase, phrase = "", metrics = "") {
  if (shellSession?.shouldBlockPhaseUpdate(phase)) return;
  if (shellSession?.shouldSkipDuplicatePhase(phase) && !String(phrase || "").trim()) return;
  shellSession?.rememberPhase(phase);
  const displayPhase = resolveDisplayPhase(phase);
  const statusText = String(phrase || "").trim();
  if (!state.ttsPaused) {
    nodes.phaseLabel.textContent = statusText || PHASE_LABELS[displayPhase];
  }
  nodes.meta.textContent = metrics || "";
  nodes.pulse.dataset.phase = displayPhase;
  if (nodes.agentAvatar) nodes.agentAvatar.dataset.phase = displayPhase;
  if (nodes.characterStage) nodes.characterStage.dataset.phase = displayPhase;
  updateTtsControlsUi(displayPhase);
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

function updateTtsControlsUi(phase = resolveDisplayPhase(state.shellState?.phase || nodes.pulse?.dataset.phase || "waiting")) {
  const playbackActive = isTtsPlaybackActive();

  nodes.ttsControls?.classList.toggle("hidden", !playbackActive);
  nodes.ttsPauseBtn?.classList.toggle("hidden", !playbackActive || state.ttsPaused);
  nodes.ttsResumeBtn?.classList.toggle("hidden", !playbackActive || !state.ttsPaused);

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

  nodes.ttsDownloadBtn?.classList.toggle("hidden", !hasText);
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
  nodes.replyPanel?.classList.remove("is-streaming");
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

function beginAssistantStream({ streamId } = {}) {
  shellSession?.resetStreamRenderState();
  state.assistantStream = {
    id: String(streamId || `local-${Date.now()}`),
    text: "",
    spokenText: "",
    spokenParts: [],
    done: false,
    finalized: false
  };
  state.streamTtsCursor = 0;
  state.streamTtsQueue = [];
  lastStreamHandledBody = "";
  lastHandledStreamId = "";
  nodes.replyPanel?.classList.add("is-streaming");
  if (nodes.lastReplyText) {
    nodes.lastReplyText.classList.remove("shell-md");
    nodes.lastReplyText.textContent = "…";
  }
  renderPhase("thinking", "Печатает…");
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
  nodes.dialogScroll?.scrollTo?.({ top: nodes.dialogScroll.scrollHeight, behavior: "auto" });
  shellDialog.onReplyRendered(value);
}

function prepareTtsStreamChunk(text) {
  let speech = String(text || "").trim();
  if (!speech) return "";
  if (state.settings?.ttsStripEmoji !== false) {
    speech = speech.replace(/\p{Extended_Pictographic}/gu, " ").replace(/\s+/g, " ").trim();
  }
  return truncateForShellTts(speech);
}

function queueStreamSpeech(fullBody) {
  if (TTS_WAIT_FOR_COMPLETE_REPLY) return;
  if (!canPlayTts()) return;
  if (!state.settings?.ttsEnabled) return;

  const speech = hasTtsPrompt()
    ? prepareTtsStreamChunk(extractStreamingTtsBody(fullBody))
    : buildSpeechPayloadSync(fullBody);
  if (!speech) return;

  const { sentences, cursor } = pullSpeechSentences(speech, state.streamTtsCursor);
  if (!sentences.length && cursor === state.streamTtsCursor) return;

  state.streamTtsCursor = cursor;
  for (const sentence of sentences) {
    state.streamTtsQueue.push(sentence);
  }
  void drainStreamTtsQueue();
}

async function speakStreamChunk(text) {
  const payload = String(text || "").trim();
  if (!payload) return;
  if (!canPlayTts()) return;

  state.speaking = true;
  updateTtsControlsUi("speaking");
  if ((state.shellState?.phase || "waiting") !== "speaking") {
    await patchShellState({ phase: "speaking", phrase: "Озвучиваю ответ…" });
  }

  try {
    await speakReplyAudio(payload);
  } catch {
    // playTtsPayload уже показал hint в диалоге
    throw new Error("stream-tts-failed");
  } finally {
    if (!state.streamTtsQueue.length) {
      state.speaking = false;
    }
  }
}

async function drainStreamTtsQueue() {
  if (state.streamTtsActive) return;
  state.streamTtsActive = true;
  updateTtsControlsUi("speaking");
  try {
    while (state.streamTtsQueue.length) {
      await waitWhileTtsPaused();
      if (!state.streamTtsQueue.length) break;
      const chunk = state.streamTtsQueue.shift();
      await speakStreamChunk(chunk);
    }
  } finally {
    state.streamTtsActive = false;
    updateTtsControlsUi(state.shellState?.phase || "waiting");
  }
}

function finalizeAssistantStream(message) {
  const stream = state.assistantStream;
  const streamId = String(message?.streamId || message?.id || stream?.id || "");
  const rawBody = String(message?.body || stream?.text || "").trim();
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
  nodes.replyPanel?.classList.remove("is-streaming");
  shellSession?.flushStreamingRender(renderStreamingAssistantText);
  renderShellReply({ ...message, body, spokenText, spokenParts });
  shellDialog.onAgentReply(body);
  shellSession?.markReplyDisplayed({ ...message, body, streamId });
  markAssistantReplyHandled({ ...message, body, streamId }, body, { streamTts: true });

  if (state.settings?.ttsEnabled && shouldPlayReplyTts(message) && !state.messageStopped) {
    const parts = spokenParts
      .map((part) => prepareTtsStreamChunk(String(part || "").trim()))
      .filter(Boolean);
    if (!parts.length && !hasTtsPrompt()) {
      const fallback = prepareTtsStreamChunk(buildSpeechPayloadSync(body));
      if (fallback) parts.push(fallback);
    }
    state.streamTtsCursor = 0;
    state.streamTtsQueue = [];
    if (parts.length) {
      lastSpokenBody = parts.join("\0");
      void speakTextParts(parts, { ttsClientId: message.ttsClientId, sourceMessage: { ...message, body, streamId } }).finally(() => {
        state.assistantStream = null;
        releaseMessagePipeline();
      });
    } else {
      state.assistantStream = null;
      if (state.settings?.ttsEnabled && shouldPlayReplyTts(message) && hasTtsPrompt()) {
        renderPhase(
          "waiting",
          "Нет блока [tts] для озвучки — агент не вернул текст для TTS",
          state.shellState?.metrics || ""
        );
      }
      releaseMessagePipeline();
    }
  } else {
    state.assistantStream = null;
    if (isTtsEnabledSetting() && !state.messageStopped && !shouldPlayReplyTts(message)) {
      shellDialog.setError("Озвучка пропущена", {
        hint: "Ответ пришёл на другое устройство или вкладку — отправьте вопрос снова с этого экрана"
      });
    }
    releaseMessagePipeline();
  }
  return true;
}

function releaseMessagePipeline() {
  state.messagePipelineBusy = false;
  state.processingMessage = "";
  renderMessageQueue();
  updateSendButtonLabel();
  shellSession?.releaseSessionUiLock();
  void drainOutboundQueue();
}

function queuePhraseSuffix() {
  const n = outboundQueue.length;
  return n > 0 ? ` · в очереди: ${n}` : "";
}

function updateSendButtonLabel() {
  if (!nodes.sendBtn) return;
  const draft = String(nodes.message?.value || "").trim();
  if (state.messagePipelineBusy && draft) {
    nodes.sendBtn.textContent = outboundQueue.length ? `В очередь · ${outboundQueue.length}` : "В очередь";
  } else {
    nodes.sendBtn.textContent = "Отправить";
  }
  const stopActive = Boolean(
    state.messagePipelineBusy ||
      state.processingMessage ||
      (state.assistantStream && !state.assistantStream.finalized) ||
      state.streamTtsActive ||
      state.streamTtsQueue.length ||
      state.speaking
  );
  if (nodes.sendStopBtn) {
    nodes.sendStopBtn.disabled = !stopActive;
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
  nodes.heroCancelSend?.classList.toggle("hidden", !heroCancelActive);
}

async function stopActiveMessage() {
  if (nodes.sendStopBtn?.disabled) return;
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
    nodes.replyPanel?.classList.remove("is-streaming");
    state.assistantStream = null;
  }
  state.streamTtsQueue = [];
  state.streamTtsCursor = 0;
  stopBrowserTts({ notifyServer: true, resetPhase: false, broadcast: true });
  renderMessageQueue();
  releaseMessagePipeline();
  const phrase = stoppingSpeech && !stoppingGeneration ? "Озвучка остановлена" : "Остановлено";
  await patchShellState({ phase: "waiting", phrase }).catch(() => {});
  renderPhase("waiting", `Готов к сообщению${queuePhraseSuffix()}`, state.shellState?.metrics || "");
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
  const phrase = `Готов к сообщению${queuePhraseSuffix()}`;
  const metrics = state.shellState?.metrics || "";
  if (state.shellState?.phase === "speaking") {
    state.shellState = { ...state.shellState, phase: "waiting", phrase: "Готов к сообщению" };
  }
  renderPhase("waiting", phrase, metrics);
}

async function finishStreamTtsWhenIdle() {
  await drainStreamTtsQueue();
  state.speaking = false;
  state.ttsPaused = false;
  state.assistantStream = null;
  updateTtsControlsUi("waiting");
  if (!state.pttHeld && !state.micActive) {
    await patchShellState({ phase: "waiting", phrase: "Готов к сообщению" }).catch(() => {});
  }
  syncWaitingUiAfterPlayback();
  releaseMessagePipeline();
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
    } else {
      beginAssistantStream({ streamId });
    }
  }

  const displayText = rawText;
  state.assistantStream.text = rawText;
  if (spokenText) state.assistantStream.spokenText = spokenText;
  if (spokenParts.length) state.assistantStream.spokenParts = spokenParts;
  state.assistantStream.done = done;
  shellSession?.queueStreamingRender(displayText, renderStreamingAssistantText);
  queueStreamSpeech(rawText);

  if (done) {
    finalizeAssistantStream({
      streamId,
      id: streamId,
      body: rawText,
      spokenText,
      spokenParts,
      ttsClientId: payload.ttsClientId
    });
    if (!state.settings?.ttsEnabled || !shouldPlayReplyTts(payload)) {
      renderPhase("waiting", "Готов к сообщению", state.shellState?.metrics || "");
    }
  } else {
    renderPhase("thinking", "Печатает…");
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

async function readClipboardText() {
  if (!navigator.clipboard?.readText) {
    throw new Error("Буфер обмена недоступен в этом браузере");
  }
  return navigator.clipboard.readText();
}

async function readClipboardForAgent() {
  try {
    const text = String(await readClipboardText() || "").trim();
    if (!text) {
      renderPhase("waiting", "Буфер пуст");
      return;
    }
    state.lastClipboardText = text;
    const preview = text.length > 320 ? `${text.slice(0, 320)}…` : text;
    renderShellReplyMarkdown(nodes.lastReplyText, `**Буфер обмена**\n\n${preview}`);
    renderPhase(state.shellState?.phase || "waiting", "Буфер прочитан");
  } catch {
    renderPhase("waiting", "Нет доступа к буферу — разрешите в браузере");
  }
}

async function pasteClipboardToCompose() {
  try {
    const text = String(await readClipboardText() || "");
    if (!text.trim()) {
      renderPhase("waiting", "Буфер пуст");
      return;
    }
    const field = nodes.message;
    if (!field) return;
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? field.value.length;
    field.value = field.value.slice(0, start) + text + field.value.slice(end);
    const caret = start + text.length;
    field.setSelectionRange(caret, caret);
    field.focus();
    renderPhase(state.shellState?.phase || "waiting", "Вставлено из буфера");
  } catch {
    renderPhase("waiting", "Нет доступа к буферу — разрешите в браузере");
  }
}

function buildWindowSettingsPayload(overrides = {}) {
  const windowBackground = nodes.windowBackground?.value || "wallpaper";
  const windowTransparent =
    nodes.windowTransparent?.checked === true || windowBackground === "transparent";
  return {
    windowTopmost: nodes.topmost?.checked !== false,
    windowTransparent,
    windowBackground: windowTransparent ? "transparent" : windowBackground,
    windowCompact: isWindowCompactEnabled(),
    ...overrides
  };
}

function syncCompactActionUi(compact = isWindowCompactEnabled()) {
  const pressed = compact ? "true" : "false";
  nodes.windowCompact?.setAttribute("aria-pressed", pressed);
  nodes.compactAction?.setAttribute("aria-pressed", pressed);
}

function toggleCompactMode() {
  const next = !isWindowCompactEnabled();
  syncCompactActionUi(next);
  void saveWindowSettings(buildWindowSettingsPayload({ windowCompact: next })).catch((error) =>
    renderPhase("waiting", error.message)
  );
}

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
  document.body.classList.remove("shell-bg-wallpaper", "shell-bg-dark", "shell-bg-transparent");
  const bg = transparent ? "transparent" : ws.windowBackground || "wallpaper";
  document.body.classList.add(`shell-bg-${bg}`);
}

function isWindowCompactEnabled() {
  return nodes.windowCompact?.getAttribute("aria-pressed") === "true";
}

function applyWindowSettings(settings) {
  state.windowSettings = settings;
  if (!settingsSave.isSectionDirty("window")) {
    if (nodes.topmost) nodes.topmost.checked = settings.windowTopmost !== false;
    if (nodes.windowTransparent) nodes.windowTransparent.checked = Boolean(settings.windowTransparent);
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

function setMicButtonState(label, { active = false } = {}) {
  if (!nodes.micBtn) return;
  const icon =
    nodes.micBtn.querySelector(".shell-compose-tool-icon") ||
    nodes.micBtn.querySelector(".shell-compose-mic-icon");
  if (icon) icon.textContent = active ? "⏹" : "🎤";
  nodes.micBtn.setAttribute("aria-label", label);
  nodes.micBtn.title = label;
  nodes.micBtn.classList.toggle("is-active", active);
  nodes.micBtn.setAttribute("aria-pressed", active ? "true" : "false");
}

function setChatPanel(open) {
  const next = Boolean(open);
  state.chatOpen = next;
  nodes.mainView?.setAttribute("data-chat-open", next ? "1" : "0");
  nodes.sessionToggle?.setAttribute("aria-pressed", next ? "true" : "false");
  nodes.replyPanel?.classList.toggle("hidden", !next);
  nodes.composePanel?.classList.toggle("hidden", !next);
}

function setRouteDrawer(open) {
  const next = Boolean(open);
  state.routeOpen = next;
  nodes.mainView?.setAttribute("data-route-open", next ? "1" : "0");
  document.querySelectorAll(".shell-route-toggle").forEach((btn) => {
    btn.setAttribute("aria-pressed", next ? "true" : "false");
  });
  nodes.routePanel?.classList.toggle("hidden", !next);
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

function collectRouteSnapshot() {
  return {
    messageTarget: nodes.messageTarget?.value || "qwenpaw",
    qwenpawBaseUrl: nodes.qwenpawUrl?.value.trim() || "http://127.0.0.1:8088",
    qwenpawAgentId: nodes.qwenpawAgentId?.value.trim() || "default",
    topicPath: topicPicker.getValue() || ""
  };
}

function getSettingsSnapshot(section) {
  if (section === "window") return collectWindowSnapshot();
  if (section === "route") return collectRouteSnapshot();
  if (section === "tts") return collectTtsFormPatch();
  if (section === "stt") return collectSttFormPatch();
  return {};
}

function markSettingsDirty(section) {
  settingsSave.markDirty(section, getSettingsSnapshot(section));
}

function commitAllSettingsBaselines() {
  settingsSave.commitAllBaselines({
    window: collectWindowSnapshot(),
    route: collectRouteSnapshot(),
    tts: collectTtsFormPatch(),
    stt: collectSttFormPatch()
  });
}

function previewWindowFromForm() {
  applyWindowAppearance({
    ...(state.windowSettings || {}),
    ...collectWindowSnapshot()
  });
}

async function saveSettingsSection(section) {
  if (section === "window") {
    await saveWindowSettings(collectWindowSnapshot());
    settingsSave.commitBaseline("window", collectWindowSnapshot());
    return;
  }

  const patch = getSettingsSnapshot(section);
  if (section === "route") updateTargetUi(patch.messageTarget);
  if (section === "stt") {
    applyRecognitionLang(patch.sttLang);
  }
  await saveSettings(patch);
  settingsSave.commitBaseline(section, getSettingsSnapshot(section));
}

function applySettings(settings) {
  state.settings = settings;

  if (!settingsSave.isSectionDirty("route")) {
    nodes.messageTarget.value = settings.messageTarget || "cms";
    nodes.qwenpawUrl.value = settings.qwenpawBaseUrl || "http://127.0.0.1:8088";
    nodes.qwenpawAgentId.value = settings.qwenpawAgentId || "default";
    void loadQwenPawAgents(settings.qwenpawAgentId || "default");
    topicPicker.setValue(settings.topicPath || "");
    updateTargetUi(settings.messageTarget || "cms");
  }

  nodes.ttsEnabled.checked = settings.ttsEnabled !== false;
  if (!settingsSave.isSectionDirty("tts")) {
    applyTtsSettingsUi(settings);
  }

  applySttToggleUi(settings);
  if (!settingsSave.isSectionDirty("stt")) {
    applySttFormUi(settings);
  }

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

function usesQwenPawTarget(target) {
  return target === "qwenpaw" || target === "qwenpaw-log";
}

function updateTargetUi(target) {
  const qwenpaw = usesQwenPawTarget(target);
  const cmsOnly = target === "cms";
  const cmsLog = target === "qwenpaw-log";

  nodes.qwenpawPanel.dataset.visible = qwenpaw ? "1" : "0";
  topicPicker.setVisible(cmsOnly || cmsLog);
  renderHeroLinkChip();
}

function cleanShellUrl() {
  const url = new URL(window.location.href);
  const embedAgent = shellEmbedMode ? String(url.searchParams.get("agent") || "").trim() : "";
  if (embedAgent) {
    state.agentId = embedAgent;
    localStorage.setItem(SHELL_STORAGE.agent, embedAgent);
  }
  if (!url.searchParams.has("agent")) return;
  if (shellEmbedMode) {
    url.searchParams.delete("agent");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    return;
  }
  url.searchParams.delete("agent");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function renderQwenPawAgents(agents, selectedAgentId) {
  if (!nodes.qwenpawAgentId) return;
  const selected = String(selectedAgentId || nodes.qwenpawAgentId.value || state.settings?.qwenpawAgentId || "default");
  const items = Array.isArray(agents) ? agents : [];
  const knownIds = new Set(items.map((item) => item.id));
  nodes.qwenpawAgentId.innerHTML = "";

  if (selected && !knownIds.has(selected)) {
    const missing = document.createElement("option");
    missing.value = selected;
    missing.textContent = `${selected} (не найден)`;
    missing.dataset.invalid = "1";
    missing.selected = true;
    nodes.qwenpawAgentId.append(missing);
  }

  for (const agent of items) {
    const opt = document.createElement("option");
    opt.value = agent.id;
    const suffix = agent.enabled === false ? " · выкл" : "";
    opt.textContent = agent.name && agent.name !== agent.id ? `${agent.name} (${agent.id})${suffix}` : `${agent.id}${suffix}`;
    if (agent.id === selected) opt.selected = true;
    if (agent.enabled === false) opt.disabled = true;
    nodes.qwenpawAgentId.append(opt);
  }

  if (!items.length && !selected) {
    const fallback = document.createElement("option");
    fallback.value = "default";
    fallback.textContent = "default";
    nodes.qwenpawAgentId.append(fallback);
  }

  nodes.qwenpawAgentId.dataset.invalid = selected && !knownIds.has(selected) ? "1" : "0";
}

async function loadQwenPawAgents(preferredId = "") {
  if (!usesQwenPawTarget(state.settings?.messageTarget || nodes.messageTarget?.value || "qwenpaw")) return;
  try {
    const data = await apiFetch("/api/shell/qwenpaw/agents");
    renderQwenPawAgents(data.agents, preferredId || data.selectedAgentId || state.settings?.qwenpawAgentId);
  } catch {
    renderQwenPawAgents([], preferredId || state.settings?.qwenpawAgentId || "default");
  }
}

function updateQwenPawChatUi(payload) {
  if (!nodes.qwenpawChatName || !nodes.qwenpawChatSession) return;
  const target = payload?.settings?.messageTarget || state.settings?.messageTarget || "cms";
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
  if (state.qwenpawChatsOpen) await loadQwenPawChats();
}

function updateTtsSaveAgentHint(extra = {}) {
  const agentId = String(extra.agentId || state.agentId || "").trim() || "?";
  const settingsFile = String(extra.settingsFile || state.settingsFile || "").trim();
  const fileLabel = settingsFile
    ? settingsFile.replace(/^.*\/workspaces\//, "workspaces/").replace(/^\/Users\/macbook\//, "~/")
    : `.agent-shell/settings.json · agent ${agentId}`;
  if (nodes.ttsSaveHint) {
    nodes.ttsSaveHint.innerHTML = `<code>${fileLabel}</code>`;
    nodes.ttsSaveHint.title = settingsFile || `Агент ${agentId}`;
  }
}

function applyStatusPayload(payload) {
  if (payload?.agentId) state.agentId = payload.agentId;
  if (payload?.settingsFile) state.settingsFile = payload.settingsFile;
  if (payload?.agentRoot) state.agentRoot = payload.agentRoot;
  updateTtsSaveAgentHint(payload);
  renderAgentChip();
  if (payload?.settings) applySettings(payload.settings);
  state.sidecarConnected = Boolean(payload?.sidecarConnected);
  state.qwenpawServerOk = Boolean(payload?.qwenpaw?.serverOk);
  state.qwenpawAgentOk = Boolean(payload?.qwenpaw?.agentOk);
  state.qwenpawAgentName = String(payload?.qwenpaw?.agentName || "");
  state.qwenpawAgentError = String(payload?.qwenpaw?.agentError || "");
  state.qwenpawConnected = Boolean(payload?.qwenpaw?.ok);
  renderHeroLinkChip();
  updateQwenPawChatUi(payload);
  syncDialogConnectionState();

  if (state.sessionUiLocked) return;

  if (payload?.state) {
    onShellPhaseChange(payload.state);
    state.shellState = payload.state;
    state.stopTtsAt = Number(payload.state.stopTtsAt) || 0;
    state.pttHeld = Boolean(payload.state.pttHeld);
    renderPhase(
      payload.state.phase,
      livePhraseFromStatus(payload.state, payload.latestAgentMessage),
      payload.state.metrics
    );
    maybeResetStaleSpeakingPhase();
    if (state.pttHeld) setMicButtonState("Стоп", { active: true });
    else if (!state.micActive) setMicButtonState("Говорить");
  }
  updateFnPttHint();
  if (payload?.latestAgentMessage?.body) {
    const streaming = state.assistantStream && !state.assistantStream.finalized;
    if (!streaming && !shellSession?.isReplyAlreadyDisplayed(payload.latestAgentMessage)) {
      renderShellReply(payload.latestAgentMessage);
      shellSession?.markReplyDisplayed(payload.latestAgentMessage);
    }
  }
}

function needsSidecar(mode) {
  return mode === "sidecar" || mode === "always" || mode === "fn_button";
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
  renderAgentChip();
}

async function refreshStatus() {
  const payload = await apiFetch("/api/shell/status");
  applyStatusPayload(payload);
}

async function loadWindowSettings() {
  const data = await apiFetch("/api/shell/window");
  applyWindowSettings(data.settings);
}

async function saveWindowSettings(patch) {
  try {
    const data = await apiFetch("/api/shell/window", {
      method: "POST",
      body: JSON.stringify({ settings: patch })
    });
    applyWindowSettings(data.settings);
  } catch (error) {
    renderPhase("waiting", error.message);
    throw error;
  }
}

async function saveSettings(patch) {
  try {
    const data = await apiFetch("/api/shell/settings", {
      method: "POST",
      body: JSON.stringify({ settings: patch })
    });
    if (data.settingsFile) state.settingsFile = data.settingsFile;
    if (data.agentRoot) state.agentRoot = data.agentRoot;
    if (data.agentId) state.agentId = data.agentId;
    updateTtsSaveAgentHint(data);
    applySettings(data.settings);
  } catch (error) {
    renderPhase("waiting", error.message);
    throw error;
  }
}

function renderComposeDraftStatus(kind = "idle") {
  const el = nodes.composeDraftStatus;
  if (!el) return;
  el.classList.remove("is-saving", "is-saved", "is-error");
  if (kind === "idle") {
    el.textContent = "";
    el.classList.add("hidden");
    nodes.composeDraftPath?.classList.add("hidden");
    return;
  }
  el.classList.remove("hidden");
  if (kind === "saving") {
    el.textContent = "сохранение…";
    el.classList.add("is-saving");
  } else if (kind === "saved") {
    el.textContent = "(сохранено)";
    el.classList.add("is-saved");
    nodes.composeDraftPath?.classList.remove("hidden");
  } else if (kind === "error") {
    el.textContent = "не сохранено";
    el.classList.add("is-error");
  } else if (kind === "dirty") {
    el.textContent = "изменено";
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

function setComposeExpanded(next) {
  composeDraftExpanded = Boolean(next);
  nodes.composeField?.classList.toggle("is-expanded", composeDraftExpanded);
  nodes.composeExpandBackdrop?.classList.toggle("hidden", !composeDraftExpanded);
  if (nodes.composeExpandBackdrop) {
    nodes.composeExpandBackdrop.hidden = !composeDraftExpanded;
  }
  nodes.composeExpandToggle?.setAttribute("aria-pressed", composeDraftExpanded ? "true" : "false");
  nodes.composeExpandToggle?.setAttribute(
    "aria-label",
    composeDraftExpanded ? "Свернуть" : "Развернуть на весь экран"
  );
  nodes.composeExpandToggle?.setAttribute(
    "title",
    composeDraftExpanded ? "Свернуть" : "Развернуть на весь экран"
  );
  document.body.classList.toggle("shell-compose-expanded", composeDraftExpanded);
  if (composeDraftExpanded) {
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

  if (fromCompose && nodes.message) {
    nodes.message.value = "";
    updateSendButtonLabel();
    void clearComposeDraft();
    nodes.message.blur();
    composeLayout?.resetViewport?.();
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

async function sendMessageDirect(body, { fromCompose = false, voice = false } = {}) {
  const text = String(body || "").trim();
  if (!text) return;
  void unlockShellAudio();
  shellSession?.setSessionUiLocked(true);
  shellSession?.resetStreamRenderState();
  state.messageStopped = false;
  state.messagePipelineBusy = true;
  state.processingMessage = text;
  state.pendingReplyTtsClientId = getShellClientId();
  renderMessageQueue();
  updateSendButtonLabel();
  const target = state.settings?.messageTarget || nodes.messageTarget?.value || "cms";
  const streamingQwenPaw = usesQwenPawTarget(target);
  if (streamingQwenPaw) beginAssistantStream({});
  messageSendAbortController?.abort();
  messageSendAbortController = new AbortController();
  const { signal } = messageSendAbortController;
  try {
    if (isShellLocationShareEnabled()) {
      await refreshShellLocationForSend();
    }
    shellDialog.clearError();
    shellDialog.onUserMessage(text);
    await patchShellState({ phase: "thinking", phrase: text.slice(0, 240) });
    const result = await apiFetch("/api/shell/message", {
      method: "POST",
      body: JSON.stringify({
        body: text,
        author: "shell",
        voice: Boolean(voice),
        shellClientId: getShellClientId(),
        ...collectOutboundMessageSettings()
      }),
      signal
    });
    if (result?.sttRefined && nodes.message && String(result.sttRefined) !== text) {
      setComposeMessageValue(String(result.sttRefined));
    }
    if (state.messageStopped) {
      releaseMessagePipeline();
      return;
    }
    updateSendButtonLabel();
    if (result?.reply || result?.message?.body) {
      await handleAssistantMessage(
        result.message || {
          body: result.reply,
          streamId: result.streamId,
          spokenText: result.spokenText,
          spokenParts: result.spokenParts,
          ttsClientId: result.ttsClientId
        }
      );
    } else {
      await refreshStatus();
      const waitingForStream = Boolean(
        streamingQwenPaw || (state.assistantStream && !state.assistantStream.finalized)
      );
      if (!waitingForStream) {
        releaseMessagePipeline();
      }
      return;
    }

    if (!streamingQwenPaw) {
      if (!state.speaking && !state.streamTtsQueue.length && !state.streamTtsActive) {
        releaseMessagePipeline();
      }
    } else if (
      !state.assistantStream &&
      !state.streamTtsQueue.length &&
      !state.streamTtsActive &&
      !state.speaking
    ) {
      releaseMessagePipeline();
    }
  } catch (error) {
    if (state.messageStopped || error?.name === "AbortError") {
      releaseMessagePipeline();
      updateSendButtonLabel();
      return;
    }
    if (streamingQwenPaw && state.assistantStream && !state.assistantStream.finalized) {
      nodes.replyPanel?.classList.remove("is-streaming");
      state.assistantStream = null;
    }
    state.processingMessage = "";
    renderMessageQueue();
    shellDialog.setError(error.message, { hint: shellDialog.connectionHint(error) });
    renderPhase("waiting", error.message);
    releaseMessagePipeline();
  } finally {
    if (messageSendAbortController?.signal === signal) {
      messageSendAbortController = null;
    }
    if (
      state.messagePipelineBusy &&
      !state.speaking &&
      !state.streamTtsActive &&
      !state.streamTtsQueue.length &&
      (!state.assistantStream || state.assistantStream.finalized)
    ) {
      releaseMessagePipeline();
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

async function loadShellPromptTemplates() {
  try {
    const data = await apiFetch("/api/shell/prompt-templates");
    shellPromptTemplates = {
      ttsPrompt: String(data.ttsPrompt || DEFAULT_TTS_PROMPT).trim() || DEFAULT_TTS_PROMPT,
      sttPrompt: String(data.sttPrompt || DEFAULT_STT_PROMPT).trim() || DEFAULT_STT_PROMPT,
      sources: {
        ttsPrompt: data.sources?.ttsPrompt || null,
        sttPrompt: data.sources?.sttPrompt || null
      }
    };
  } catch {
    shellPromptTemplates = {
      ttsPrompt: DEFAULT_TTS_PROMPT,
      sttPrompt: DEFAULT_STT_PROMPT,
      sources: { ttsPrompt: null, sttPrompt: null }
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
  utterance.lang = settings.ttsLang || "ru-RU";
  utterance.rate = Math.min(2, Math.max(0.5, Number(settings.ttsRate) || 1));
  utterance.pitch = Math.min(2, Math.max(0, Number(settings.ttsPitch) || 1));
  const voiceName = String(settings.ttsVoice || "").trim();
  if (voiceName) {
    const voices = getSpeechSynth()?.getVoices() || [];
    const voice = voices.find((item) => item.name === voiceName || item.voiceURI === voiceName);
    if (voice) utterance.voice = voice;
  }
  return utterance;
}

function refreshTtsVoiceOptions() {
  if (!nodes.ttsVoice) return;
  const synth = getSpeechSynth();
  const lang = String(nodes.ttsLang?.value || state.settings?.ttsLang || "ru-RU").toLowerCase();
  const langPrefix = lang.split("-")[0];
  const current = nodes.ttsVoice.value || state.settings?.ttsVoice || "";
  nodes.ttsVoice.innerHTML = '<option value="">Системный по умолчанию</option>';
  const voices = (synth?.getVoices() || []).filter((voice) =>
    voice.lang.toLowerCase().startsWith(langPrefix)
  );
  for (const voice of voices) {
    const opt = document.createElement("option");
    opt.value = voice.name;
    opt.textContent = `${voice.name} (${voice.lang})`;
    if (voice.name === current) opt.selected = true;
    nodes.ttsVoice.append(opt);
  }
}

function updateTtsRateLabel() {
  if (!nodes.ttsRateValue || !nodes.ttsRate) return;
  nodes.ttsRateValue.textContent = Number(nodes.ttsRate.value || 1).toFixed(1);
}

function setTtsSettingsOpen(open) {
  const next = Boolean(open);
  nodes.ttsSettingsPanel?.classList.toggle("hidden", !next);
  nodes.ttsSettingsToggle?.setAttribute("aria-expanded", next ? "true" : "false");
  nodes.ttsSettingsToggle?.setAttribute("aria-pressed", next ? "true" : "false");
}

function setSttSettingsOpen(open) {
  const next = Boolean(open);
  nodes.sttSettingsPanel?.classList.toggle("hidden", !next);
  nodes.sttSettingsToggle?.setAttribute("aria-expanded", next ? "true" : "false");
  nodes.sttSettingsToggle?.setAttribute("aria-pressed", next ? "true" : "false");
}

function applyRecognitionLang(lang) {
  const code = lang || nodes.sttLang?.value || state.settings?.sttLang || "ru-RU";
  if (state.recognition) state.recognition.lang = code;
}

function updateFnPttHint(mode = getVoiceInputMode()) {
  if (!nodes.fnPttHint) return;
  const show = mode === "fn_button";
  nodes.fnPttHint.classList.toggle("hidden", !show);
  if (!show) return;
  if (state.sidecarConnected) {
    nodes.fnPttHint.textContent =
      "Shift: удерживай для записи. Sidecar подключён — работает глобально в любом приложении.";
    nodes.fnPttHint.classList.remove("shell-compose-voice-hint--warn");
  } else {
    nodes.fnPttHint.textContent =
      "Shift глобально — запусти sidecar: npm run shell:sidecar. Без sidecar Shift только когда окно Shell в фокусе (не в поле ввода).";
    nodes.fnPttHint.classList.add("shell-compose-voice-hint--warn");
  }
}

function updateVoiceModeSelectUi(mode = getVoiceInputMode()) {
  const title = VOICE_MODE_TITLES[mode] || mode;
  const disabled = mode === "disabled";
  if (nodes.voiceMode) {
    nodes.voiceMode.title = `Режим голосового ввода: ${title}`;
  }
  nodes.voiceControl?.classList.toggle("is-disabled", disabled);
  if (nodes.micBtn) {
    nodes.micBtn.disabled = disabled;
  }
  if (disabled) {
    shellTapVoice?.abortSession();
    if (state.pttKeyboardHeld) endPttHold();
    setMicButtonState("Голосовой ввод выключен");
  } else if (!state.micActive && !state.pttHeld) {
    setMicButtonState("Говорить");
  }
  updateFnPttHint(mode);
}

function applySttToggleUi(settings) {
  const mode = settings.voiceInputMode || "browser";
  if (nodes.voiceMode) nodes.voiceMode.value = mode;
  if (mode !== "disabled") state.sttResumeMode = mode;
  if (nodes.sttEnabled) nodes.sttEnabled.checked = mode !== "disabled";
  updateVoiceModeSelectUi(mode);
}

function applySttFormUi(settings) {
  if (nodes.sttPrompt && document.activeElement !== nodes.sttPrompt) {
    nodes.sttPrompt.value = settings.sttPrompt || "";
  }
  if (nodes.sttLang) nodes.sttLang.value = settings.sttLang || "ru-RU";
  if (nodes.sttEngine) {
    const mode = settings.voiceInputMode || "browser";
    const sidecar = mode === "sidecar" || mode === "always" || mode === "fn_button";
    nodes.sttEngine.value = sidecar ? "sidecar" : "browser";
  }
  applyRecognitionLang(settings.sttLang);
}

function applySttSettingsUi(settings) {
  applySttToggleUi(settings);
  applySttFormUi(settings);
}

function collectSttFormPatch() {
  return {
    sttLang: nodes.sttLang?.value || "ru-RU",
    sttPrompt: nodes.sttPrompt?.value || ""
  };
}

async function persistVoiceInputMode(mode) {
  try {
    await saveSettings({ voiceInputMode: mode });
  } catch (error) {
    renderPhase("waiting", error.message);
  }
}

async function persistTtsEnabled(enabled) {
  try {
    await saveSettings({ ttsEnabled: enabled });
  } catch (error) {
    renderPhase("waiting", error.message);
  }
}

async function loadTtsCapabilities() {
  try {
    const data = await apiFetch("/api/shell/tts/capabilities");
    const engines = { ...(data?.engines || {}) };
    const runtime = collectTtsRuntimeSettings();
    if (String(runtime.ttsElevenlabsApiKey || "").trim()) {
      engines.elevenlabs = { ...(engines.elevenlabs || {}), available: true, label: "ElevenLabs" };
    }
    const engine = getTtsEngine();
    const current = engines[engine];
    if (nodes.ttsCapabilitiesNote) {
      const engineHint = ttsEngineDescription(engine);
      if (current?.available === false) {
        nodes.ttsCapabilitiesNote.textContent = current.hint || "Движок недоступен на этом устройстве";
        nodes.ttsCapabilitiesNote.classList.remove("hidden");
      } else if (current?.hint && current.hint !== engineHint) {
        nodes.ttsCapabilitiesNote.textContent = current.hint;
        nodes.ttsCapabilitiesNote.classList.remove("hidden");
      } else {
        nodes.ttsCapabilitiesNote.textContent = "";
        nodes.ttsCapabilitiesNote.classList.add("hidden");
      }
    }
    if (nodes.ttsEngine) {
      for (const option of nodes.ttsEngine.options) {
        const meta = engines[option.value];
        option.disabled = meta?.available === false;
      }
    }
  } catch {
    nodes.ttsCapabilitiesNote?.classList.add("hidden");
  }
}

function ttsEngineDescription(engine = getTtsEngine()) {
  const descriptions = {
    browser:
      "Озвучка во вкладке (Web Speech). На Mac часто тот же системный голос, что и say — для сравнения выберите другой голос ниже.",
    say:
      "Озвучка на сервере через macOS say (WAV с сервера). При том же голосе звучит почти как Web Speech — попробуйте Yuri или Katya.",
    edge: "Онлайн-синтез Microsoft Edge TTS. Нужен интернет, API key не нужен.",
    piper: "Локальная нейромодель на сервере. Нужен путь к .onnx и бинарник piper.",
    elevenlabs: "Облачный синтез ElevenLabs. Нужны API key и Voice ID."
  };
  return descriptions[engine] || "";
}

function updateTtsEnginePanels(engine = getTtsEngine()) {
  const value = engine || "browser";
  const root = nodes.ttsEngineFields || nodes.ttsSettingsPanel;
  if (!root) return;
  for (const field of root.querySelectorAll("[data-tts-engines]")) {
    const engines = String(field.dataset.ttsEngines || "")
      .split(/\s+/)
      .filter(Boolean);
    field.classList.toggle("hidden", !engines.includes(value));
  }
  if (nodes.ttsVoiceLabel) {
    nodes.ttsVoiceLabel.textContent =
      value === "say" ? "Голос macOS say" : value === "browser" ? "Голос браузера" : "Голос";
  }
  if (nodes.ttsEngineHint) {
    nodes.ttsEngineHint.textContent = ttsEngineDescription(value);
  }
}

async function applyContrastVoiceDefaults(engine = getTtsEngine()) {
  if (engine === "browser") {
    refreshTtsVoiceOptions();
    if (!nodes.ttsVoice) return;
    const langPrefix = String(nodes.ttsLang?.value || "ru-RU").split("-")[0].toLowerCase();
    const voices = getSpeechSynth()?.getVoices() || [];
    const milena = voices.find(
      (voice) => /milena/i.test(voice.name) && voice.lang.toLowerCase().startsWith(langPrefix)
    );
    const fallback = voices.find((voice) => voice.lang.toLowerCase().startsWith(langPrefix));
    nodes.ttsVoice.value = milena?.name || fallback?.name || "";
    return;
  }
  if (engine !== "say") return;
  await refreshTtsEngineVoices("say");
  if (!nodes.ttsVoice) return;
  const options = [...nodes.ttsVoice.options].map((option) => option.value).filter(Boolean);
  const preferred = ["Yuri", "Katya", "Milena"];
  const next = preferred.find((name) => options.includes(name)) || options[0] || "";
  if (next) nodes.ttsVoice.value = next;
}

async function refreshTtsEngineVoices(engine = getTtsEngine()) {
  updateTtsEnginePanels(engine);
  if (engine === "browser") {
    refreshTtsVoiceOptions();
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
  if (engine !== "say" || !nodes.ttsVoice) return;
  try {
    const data = await apiFetch(`/api/shell/tts/voices?engine=${encodeURIComponent(engine)}`);
    const current = nodes.ttsVoice.value || state.settings?.ttsVoice || "";
    nodes.ttsVoice.innerHTML = '<option value="">По умолчанию</option>';
    for (const voice of data.voices || []) {
      const opt = document.createElement("option");
      opt.value = voice.id;
      opt.textContent = voice.label || voice.id;
      if (voice.id === current) opt.selected = true;
      nodes.ttsVoice.append(opt);
    }
  } catch {
    refreshTtsVoiceOptions();
  }
}

function applyTtsSettingsUi(settings) {
  if (nodes.ttsPrompt && document.activeElement !== nodes.ttsPrompt) {
    nodes.ttsPrompt.value = settings.ttsPrompt || "";
  }
  if (nodes.ttsEngine) {
    const engine = settings.ttsEngine === "sidecar" ? "say" : settings.ttsEngine || "browser";
    nodes.ttsEngine.value = engine;
  }
  if (nodes.ttsLang) nodes.ttsLang.value = settings.ttsLang || "ru-RU";
  if (nodes.ttsRate) nodes.ttsRate.value = String(settings.ttsRate ?? 1);
  if (nodes.ttsEdgeVoice) nodes.ttsEdgeVoice.value = settings.ttsEdgeVoice || "ru-RU-SvetlanaNeural";
  if (nodes.ttsPiperModel) nodes.ttsPiperModel.value = settings.ttsPiperModel || "";
  if (nodes.ttsPiperBinary) nodes.ttsPiperBinary.value = settings.ttsPiperBinary || "";
  applyElevenlabsKeyUi(settings);
  if (nodes.ttsElevenlabsVoiceId) nodes.ttsElevenlabsVoiceId.value = settings.ttsElevenlabsVoiceId || "";
  updateTtsRateLabel();
  if (nodes.ttsVoice && settings.ttsVoice) nodes.ttsVoice.value = settings.ttsVoice;
  void refreshTtsEngineVoices(settings.ttsEngine === "sidecar" ? "say" : settings.ttsEngine || "browser");
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
  const ttsEnabled = nodes.ttsEnabled?.checked !== false;
  const deviceContext = collectDeviceContextForMessage();
  return {
    ttsEnabled,
    ttsPrompt: nodes.ttsPrompt?.value ?? "",
    ...getShellSurfacePayload(),
    ...(deviceContext ? { deviceContext } : {})
  };
}

function collectTtsFormPatch() {
  return {
    ttsPrompt: nodes.ttsPrompt?.value || "",
    ttsEngine: nodes.ttsEngine?.value || "browser",
    ttsLang: nodes.ttsLang?.value || "ru-RU",
    ttsVoice: nodes.ttsVoice?.value || "",
    ttsEdgeVoice: nodes.ttsEdgeVoice?.value || "ru-RU-SvetlanaNeural",
    ttsElevenlabsApiKey: resolveElevenlabsApiKey(),
    ttsElevenlabsVoiceId: resolveElevenlabsVoiceId(),
    ttsPiperModel: nodes.ttsPiperModel?.value || "",
    ttsPiperBinary: nodes.ttsPiperBinary?.value || "",
    ttsRate: Number(nodes.ttsRate?.value || 1)
  };
}

function collectTtsSettingsPatch() {
  return {
    ttsEnabled: nodes.ttsEnabled.checked,
    ...collectTtsFormPatch()
  };
}

async function persistTtsSettings() {
  const patch = collectTtsSettingsPatch();
  patch.ttsEngine = getTtsEngine();
  const apiKey = String(nodes.ttsElevenlabsKey?.value || "").trim();
  const voiceId = String(nodes.ttsElevenlabsVoiceId?.value || "").trim();
  if (apiKey) patch.ttsElevenlabsApiKey = apiKey;
  else delete patch.ttsElevenlabsApiKey;
  patch.ttsElevenlabsVoiceId = voiceId;

  await saveSettings(patch);
  applyElevenlabsKeyUi(state.settings);
  if (nodes.ttsElevenlabsVoiceId && document.activeElement !== nodes.ttsElevenlabsVoiceId) {
    nodes.ttsElevenlabsVoiceId.value = String(state.settings?.ttsElevenlabsVoiceId || "");
  }
  settingsSave.commitBaseline("tts", collectTtsFormPatch());
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

function ttsEngineLabel(engine = getTtsEngine()) {
  const labels = {
    browser: "Браузер",
    say: "macOS say",
    edge: "Edge TTS",
    piper: "Piper",
    elevenlabs: "ElevenLabs"
  };
  return labels[engine] || engine;
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
  const lang = settings.ttsLang || "ru-RU";
  const rate = settings.ttsRate || 1;
  const voiceName = settings.ttsVoice || "";
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

async function playTtsPayload(text, { allowBrowserFallback = true } = {}) {
  const payload = String(text || "").trim();
  if (!payload) return null;
  await unlockShellAudio();

  const engine = getTtsEngine();
  const settings = { ...(state.settings || {}), ...collectTtsFormPatch() };
  const lang = settings.ttsLang || "ru-RU";
  const rate = settings.ttsRate || 1;
  const voiceName = settings.ttsVoice || "";
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
      state.speaking = false;
      updateTtsControlsUi("waiting");
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
          renderPhase("thinking", `Синтез · ${ttsEngineLabel(engine)}…`);
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
    state.speaking = false;
    updateTtsControlsUi("waiting");
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
      state.speaking = false;
      updateTtsControlsUi("waiting");
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
    ttsTestBusy = false;
    nodes.ttsTestBtn?.classList.remove("is-busy");
    nodes.ttsTestBtn?.removeAttribute("disabled");
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
    void patchShellState({ phase: "waiting", phrase: "Готов к сообщению" }).then(() => {
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
    if (state.pendingReplyTtsClientId === getShellClientId()) {
      shellDialog.setError("Озвучка не запустилась", {
        hint: "Обновите страницу и проверьте, что TTS включён в настройках"
      });
    }
    renderPhase(state.shellState?.phase || "waiting", `Готов к сообщению${queuePhraseSuffix()}`, state.shellState?.metrics || "");
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
  await patchShellState({ phase: "waiting", phrase: "Готов к сообщению" }).catch(() => {});
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
    if (
      !shellSession?.isReplyAlreadySpoken(message) &&
      state.settings?.ttsEnabled &&
      shouldPlayReplyTts(message) &&
      !shouldSkipAssistantSpeech(message)
    ) {
      const parts = buildSpeechParts(body, message);
      if (parts.length) {
        await speakTextParts(parts, { ttsClientId: message.ttsClientId, sourceMessage: message });
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
    if (
      !shellSession.isReplyAlreadySpoken(message) &&
      state.settings?.ttsEnabled &&
      shouldPlayReplyTts(message) &&
      !shouldSkipAssistantSpeech(message)
    ) {
      const parts = buildSpeechParts(body, message);
      if (parts.length) {
        await speakTextParts(parts, { ttsClientId: message.ttsClientId, sourceMessage: message });
      }
    }
    releaseMessagePipeline();
    return;
  }

  shellSession?.flushStreamingRender(renderStreamingAssistantText);
  markAssistantReplyHandled(message, body);
  renderShellReply(message);
  shellDialog.onAgentReply(body);
  shellSession?.markReplyDisplayed(message);

  const phase = state.shellState?.phase || "waiting";
  if (phase === "waiting" && !state.pttHeld && !state.micActive && !state.speaking) {
    renderPhase(phase, "Готов к сообщению", state.shellState?.metrics || "");
  }
  if (state.settings?.ttsEnabled && !shouldSkipAssistantSpeech(message)) {
    const parts = buildSpeechParts(body, message);
    if (!parts.length) {
      shellDialog.setError("Нечего озвучить", {
        hint: "Агент не вернул блок [tts] — проверьте ttsPrompt в настройках TTS"
      });
      releaseMessagePipeline();
      return;
    }
    const speechKey = parts.join("\0");
    if (speechKey === lastSpokenBody && state.speaking) {
      releaseMessagePipeline();
      return;
    }
    lastSpokenBody = speechKey;
    await speakTextParts(parts, { ttsClientId: message.ttsClientId, sourceMessage: message });
    releaseMessagePipeline();
    return;
  }
  releaseMessagePipeline();
}

function connectStream() {
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }
  if (!state.agentId || typeof EventSource === "undefined") {
    renderServerChip();
    return;
  }

  const source = new EventSource(apiUrl("/api/shell/stream"));
  state.eventSource = source;
  syncDialogConnectionState("connecting");
  source.onopen = () => {
    renderHeroLinkChip();
    syncDialogConnectionState("live");
  };
  source.onerror = () => {
    renderHeroLinkChip();
    syncDialogConnectionState("error");
  };

  source.addEventListener("status", (event) => {
    try {
      applyStatusPayload(JSON.parse(event.data));
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("assistant_message", (event) => {
    try {
      const payload = JSON.parse(event.data);
      void handleAssistantMessage(payload.message || payload.payload || payload);
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("assistant_delta", (event) => {
    try {
      const payload = JSON.parse(event.data);
      handleAssistantDelta(payload);
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("camera_snapshot_request", (event) => {
    try {
      const payload = JSON.parse(event.data);
      void handleCameraSnapshotRequest(payload);
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("screen_snapshot_request", (event) => {
    try {
      const payload = JSON.parse(event.data);
      void handleScreenSnapshotRequest(payload);
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("window_settings", (event) => {
    try {
      const entry = JSON.parse(event.data);
      applyWindowSettings(entry.payload || entry);
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("state", (event) => {
    try {
      const entry = JSON.parse(event.data);
      const nextState = entry.payload || entry;
      onShellPhaseChange(nextState);
      if (nextState?.phase) {
        state.shellState = { ...(state.shellState || {}), ...nextState };
        if (!state.sessionUiLocked) {
          renderPhase(nextState.phase, nextState.phrase, nextState.metrics);
        }
        maybeResetStaleSpeakingPhase();
      }
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("stop_tts", () => {
    stopBrowserTts({ notifyServer: false, broadcast: false });
    releaseMessagePipeline();
  });

  source.addEventListener("reconnect", () => {
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
  renderPhase("waiting", `Готов к сообщению${queuePhraseSuffix()}`, state.shellState?.metrics || "");
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

  if (readVoiceConfirmSetting()) {
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
    nodes.micBtn.disabled = true;
    nodes.micBtn.title = insecure
      ? `SpeechRecognition недоступен · нужен HTTPS · ${getShellHttpsUrl()}`
      : "SpeechRecognition недоступен в этом браузере";
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
    clearShellError: () => shellDialog?.clearError?.()
  });
  shellTapVoice.configureRecognition(recognition);
  shellTapVoice.bindHandlers(recognition);
}

function toggleMic() {
  const mode = nodes.voiceMode.value;
  if (mode === "disabled") {
    renderPhase("disabled", "Голосовой ввод отключён");
    return;
  }
  if (mode === "fn_button" && state.sidecarConnected) {
    renderPhase("waiting", "Удерживай Shift. Sidecar слушает глобально.");
    return;
  }
  if (mode === "sidecar" || mode === "always") {
    if (!state.sidecarConnected) {
      renderPhase("disabled", "Sidecar не запущен — npm run shell:sidecar");
      return;
    }
    const nextHeld = !state.pttHeld;
    void setPttHeldRemote(nextHeld).catch((error) => renderPhase("waiting", error.message));
    return;
  }
  if (!shellTapVoice || !isBrowserTapVoiceMode(mode)) return;
  shellTapVoice.toggleTap();
}

async function startBrowserMic() {
  if (!shellTapVoice) return;
  await shellTapVoice.startSession({ viaTap: true });
}

function setShellView(view) {
  const next = view === "settings" ? "settings" : "main";
  state.view = next;
  if (nodes.shellApp) nodes.shellApp.dataset.view = next;
  if (nodes.settingsBtn) {
    nodes.settingsBtn.setAttribute("aria-pressed", next === "settings" ? "true" : "false");
  }
  if (nodes.homeBtn) {
    nodes.homeBtn.setAttribute("aria-pressed", next === "main" ? "true" : "false");
  }
  if (nodes.homeBrand) {
    nodes.homeBrand.setAttribute("aria-pressed", next === "main" ? "true" : "false");
  }
}

function bindNavigationUi() {
  nodes.settingsBtn?.addEventListener("click", () => setShellView("settings"));
  nodes.homeBtn?.addEventListener("click", () => setShellView("main"));
  nodes.homeBrand?.addEventListener("click", () => setShellView("main"));
  nodes.sessionToggle?.addEventListener("click", () => setChatPanel(!state.chatOpen));
  nodes.routeToggle?.addEventListener("click", () => setRouteDrawer(!state.routeOpen));
  nodes.characterToggle?.addEventListener("click", () => setCharacterPicker(!state.characterPickerOpen));
  nodes.characterPicker?.addEventListener("click", (event) => {
    if (event.target.closest(".shell-character-option")) setCharacterPicker(false);
  });
  nodes.watchCamera?.addEventListener("click", () => {
    void toggleWatchCamera().catch((error) => renderPhase("waiting", error.message));
  });

  nodes.composeCameraStub?.addEventListener("click", () => {
    void captureAndSendComposePhoto();
  });
  nodes.watchScreen?.addEventListener("click", () => {
    void toggleWatchScreen().catch((error) => renderPhase("waiting", error.message));
  });
}

function bindWindowSettingsUi() {
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
  nodes.windowTransparent?.addEventListener("change", () => {
    if (!nodes.windowTransparent.checked && nodes.windowBackground?.value === "transparent") {
      nodes.windowBackground.value = "wallpaper";
    }
    onWindowFieldChange();
  });
  nodes.windowBackground?.addEventListener("change", onWindowFieldChange);
  if (nodes.keepAwake) {
    nodes.keepAwake.checked = readKeepAwakeSetting();
    nodes.keepAwake.addEventListener("change", () => {
      writeKeepAwakeSetting(nodes.keepAwake.checked);
      shellKeepAwake?.sync();
    });
  }
  nodes.windowSave?.addEventListener("click", () => {
    void saveSettingsSection("window").catch((error) => renderPhase("waiting", error.message));
  });
}

function bindUi() {
  onRouteSettingsDirty = () => markSettingsDirty("route");

  settingsSave.attachUi({
    saveButtons: {
      window: nodes.windowSave,
      route: nodes.routeSave,
      tts: nodes.ttsSave,
      stt: nodes.sttSave
    },
    toggleButtons: {
      window: nodes.settingsBtn,
      route: nodes.routeToggle,
      tts: nodes.ttsSettingsToggle,
      stt: nodes.sttSettingsToggle
    }
  });
  const markRouteDirty = () => markSettingsDirty("route");
  const markTtsDirty = () => markSettingsDirty("tts");
  const markSttDirty = () => markSettingsDirty("stt");

  nodes.routeSave?.addEventListener("click", () => {
    void saveSettingsSection("route").catch((error) => renderPhase("waiting", error.message));
  });
  nodes.ttsSave?.addEventListener("click", () => {
    void persistTtsSettings().catch((error) => renderPhase("waiting", error.message));
  });
  nodes.sttSave?.addEventListener("click", () => {
    void saveSettingsSection("stt").catch((error) => renderPhase("waiting", error.message));
  });

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

  nodes.clipboardReadAction?.addEventListener("click", () => {
    void readClipboardForAgent();
  });

  nodes.clipboardPasteAction?.addEventListener("click", () => {
    void pasteClipboardToCompose();
  });

  nodes.compactAction?.addEventListener("click", () => {
    toggleCompactMode();
  });

  nodes.messageTarget.addEventListener("change", () => {
    updateTargetUi(nodes.messageTarget.value);
    markRouteDirty();
  });
  nodes.qwenpawUrl.addEventListener("change", () => {
    markRouteDirty();
    void loadQwenPawAgents(nodes.qwenpawAgentId?.value);
  });
  nodes.qwenpawOpenUrl?.addEventListener("click", openQwenPawInBrowser);
  nodes.linkChipOpen?.addEventListener("click", (event) => {
    event.stopPropagation();
    openQwenPawInBrowser();
  });
  nodes.qwenpawAgentId.addEventListener("change", markRouteDirty);
  nodes.ttsEnabled.addEventListener("change", () => {
    const enabled = nodes.ttsEnabled.checked;
    if (state.settings) state.settings.ttsEnabled = enabled;
    if (!enabled) stopBrowserTts({ notifyServer: true });
    void persistTtsEnabled(enabled);
  });
  nodes.sttEnabled?.addEventListener("change", () => {
    let mode = nodes.voiceMode?.value || state.settings?.voiceInputMode || "browser";
    if (nodes.sttEnabled.checked) {
      mode = state.sttResumeMode || "browser";
      if (nodes.voiceMode) nodes.voiceMode.value = mode;
    } else if (mode !== "disabled") {
      state.sttResumeMode = mode;
      mode = "disabled";
      if (nodes.voiceMode) nodes.voiceMode.value = mode;
      shellTapVoice?.abortSession();
    }
    updateVoiceModeSelectUi(mode);
    void persistVoiceInputMode(mode);
  });
  nodes.sttSettingsToggle?.addEventListener("click", () => {
    const open = nodes.sttSettingsPanel?.classList.contains("hidden");
    setSttSettingsOpen(open);
  });
  for (const el of [nodes.sttPrompt]) {
    el?.addEventListener("change", markSttDirty);
  }
  nodes.sttPrompt?.addEventListener("input", markSttDirty);
  nodes.sttLang?.addEventListener("change", () => {
    applyRecognitionLang();
    markSttDirty();
  });
  if (nodes.voiceConfirm) {
    nodes.voiceConfirm.checked = readVoiceConfirmSetting();
    nodes.voiceConfirm.addEventListener("change", () => {
      writeVoiceConfirmSetting(nodes.voiceConfirm.checked);
    });
  }
  nodes.hapticTestBtn?.addEventListener("click", () => {
    const btn = nodes.hapticTestBtn;
    btn?.classList.add("is-busy");
    window.setTimeout(() => btn?.classList.remove("is-busy"), 3200);
    const ok = runHapticDemo();
    if (!ok) {
      btn?.classList.remove("is-busy");
      window.alert(
        hapticSupported()
          ? "Вибрация не сработала."
          : "navigator.vibrate недоступен в этом браузере (Safari на iPhone часто не поддерживает)."
      );
    }
  });
  nodes.ttsSettingsToggle?.addEventListener("click", () => {
    const open = nodes.ttsSettingsPanel?.classList.contains("hidden");
    setTtsSettingsOpen(open);
  });
  nodes.ttsTestBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    void testTtsEngine();
  });
  for (const el of [
    nodes.ttsPrompt,
    nodes.ttsEngine,
    nodes.ttsLang,
    nodes.ttsVoice,
    nodes.ttsEdgeVoice,
    nodes.ttsPiperModel,
    nodes.ttsPiperBinary,
    nodes.ttsElevenlabsKey,
    nodes.ttsElevenlabsVoiceId,
    nodes.ttsRate
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
  nodes.ttsPiperModel?.addEventListener("blur", markTtsDirty);
  nodes.ttsPiperBinary?.addEventListener("blur", markTtsDirty);
  nodes.ttsElevenlabsKey?.addEventListener("input", markTtsDirty);
  nodes.ttsElevenlabsKey?.addEventListener("blur", () => {
    markTtsDirty();
    void maybeAutoSaveElevenlabsCredentials();
  });
  nodes.ttsElevenlabsVoiceId?.addEventListener("input", markTtsDirty);
  nodes.ttsElevenlabsVoiceId?.addEventListener("blur", () => {
    markTtsDirty();
    void maybeAutoSaveElevenlabsCredentials();
  });
  nodes.ttsSave?.addEventListener("mousedown", () => {
    markSettingsDirty("tts", collectTtsFormPatch());
  });
  nodes.ttsRate?.addEventListener("input", () => {
    updateTtsRateLabel();
    markTtsDirty();
  });
  nodes.ttsEngine?.addEventListener("change", () => {
    const engine = nodes.ttsEngine.value;
    state.settings = { ...(state.settings || {}), ttsEngine: engine };
    void (async () => {
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
    void refreshTtsEngineVoices(getTtsEngine());
    markTtsDirty();
  });
  if (typeof speechSynthesis !== "undefined") {
    speechSynthesis.addEventListener("voiceschanged", refreshTtsVoiceOptions);
  }
  nodes.voiceMode?.addEventListener("change", () => {
    const mode = nodes.voiceMode.value;
    if (mode !== "disabled") state.sttResumeMode = mode;
    if (nodes.sttEnabled) nodes.sttEnabled.checked = mode !== "disabled";
    if (!isBrowserTapVoiceMode(mode)) shellTapVoice?.abortSession();
    updateVoiceModeSelectUi(mode);
    void persistVoiceInputMode(mode);
  });

  nodes.sendBtn.addEventListener("click", () => void sendMessage(nodes.message.value));
  nodes.sendStopBtn?.addEventListener("click", () => void stopActiveMessage());
  nodes.heroCancelSend?.addEventListener("click", () => void stopActiveMessage());
  nodes.message?.addEventListener("input", () => {
    updateSendButtonLabel();
    scheduleComposeDraftSave();
  });
  nodes.message.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void sendMessage(nodes.message.value);
    }
    if (event.key === "Escape" && composeDraftExpanded) {
      event.preventDefault();
      setComposeExpanded(false);
    }
  });
  nodes.composeExpandToggle?.addEventListener("click", toggleComposeExpanded);
  nodes.composeExpandBackdrop?.addEventListener("click", () => setComposeExpanded(false));

  nodes.micBtn.addEventListener("click", toggleMic);
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

  nodes.openCmsBtn.addEventListener("click", () => {
    const url = state.agentId ? `/a/${encodeURIComponent(state.agentId)}` : "/";
    window.open(url, "_blank");
    if (window.shellApp?.positionWindowBottomCenter) {
      void window.shellApp.positionWindowBottomCenter();
    }
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
}

async function boot() {
  cleanShellUrl();
  migrateShellStorageFromMobile();
  if (shellEmbedMode) {
    document.body.classList.add("shell-embed");
  }
  initShellSurfaceSwitcher();
  if (!shellEmbedMode) {
    initShellInstallBanner({
      bannerEl: document.getElementById("shell-install-banner"),
      dismissBtn: document.getElementById("shell-install-dismiss")
    });
  }
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
  shellDialog.init();
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
  renderAgentChip();
  renderServerChip();
  ttsPlayer = createShellTtsPlayer({ apiFetch, getTtsSettings: collectTtsRuntimeSettings });
  ttsTabCoordinator = createShellTtsTabCoordinator({
    onYieldSpeech: (reason) => yieldLocalTtsPlayback(reason)
  });
  bindUi();
  bindNavigationUi();
  bindWindowSettingsUi();
  updateTtsDownloadUi();
  setupSpeechRecognition();
  shellKeepAwake = initShellKeepAwake(state, { getEnabled: readKeepAwakeSetting });
  composeLayout = initShellComposeLayout({
    nodes,
    getSessionUiLocked: () => state.sessionUiLocked
  });
  setupPttKeyboard();
  startClock();
  window.addEventListener("online", renderHeroLinkChip);
  window.addEventListener("offline", renderHeroLinkChip);
  renderHeroLinkChip();
  void initBatteryMonitor();
  void initShellCharacter(nodes.characterStage, nodes.agentAvatar);
  try {
    await resolveShellAgent();
    const surfacePayload = getShellSurfacePayload();
    void patchShellState({
      shellSurfaceHost: surfacePayload.surfaceHost,
      shellSurfaceHint: surfacePayload.surfaceHint,
      shellSurfaceBackend: surfacePayload.surfaceBackend
    }).catch(() => {});
    await loadShellPromptTemplates();
    await topicPicker.refresh();
    await loadWindowSettings();
    if (shellEmbedMode) {
      applyWindowSettings({
        ...(state.windowSettings || {}),
        windowCompact: true,
        windowBackground: "wallpaper",
        windowTransparent: false
      });
    }
    await refreshStatus();
    await loadComposeDraft();
    commitAllSettingsBaselines();
    void loadQwenPawAgents();
    connectStream();
  } catch (error) {
    renderPhase("waiting", error.message);
  }
}

void boot();
