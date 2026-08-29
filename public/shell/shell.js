import { loadAgentSelectData, getSelectableAgents, populateAgentSelect } from "/shared/agent-select.js";
import { createSettingsSaveController } from "@shell/settings-save";
import { parseShellReply, renderShellReplyMedia, prepareSpeechText, pullSpeechSentences, mergeSpeechStreamChunks, parseDualReply, extractStreamingTtsBody, extractStreamingReplyBody, hasVoiceEndDelimiter, stripAllTtsBlocks } from "@shell/reply";
import { renderShellReplyMarkdown, renderShellReplyBody } from "@shell/markdown";
import { initShellCharacter } from "@shell/character";
import { createShellCamera } from "@shell/camera";
import { createShellScreen } from "@shell/screen";
import { createShellTtsTabCoordinator } from "@shell/tts-tab";
import { createShellTtsPlayer } from "@shell/tts-player";
import { unlockShellAudio } from "@shell/audio-unlock";
import { speakShellBrowserTts } from "@shell/browser-tts";
import {
  formatTtsErrorHint,
  shellTtsFailureMessage,
  truncateForShellTts
} from "@shell/tts-mobile";
import { createShellSession } from "@shell/session";
import { getShellClientId } from "@shell/client-id";
import { getShellSurfacePayload, initShellSurface, getShellHostLabel, getShellHostHeaderLabel, getShellSurface } from "@shell/surface";
import {
  buildVoiceShellPath,
  isEmbeddedVoiceHost,
  isVoiceStandaloneAppLocation,
  migrateVoiceHostQueryToPath,
  parseVoiceShellPath,
  readVoiceSurfaceHostFromLocation
} from "@shell/voice-chpu";
import { initShellPresence } from "@shell/presence";
import { initShellOrientationChip, initShellLocationChip, getShellDeviceLocation, isShellLocationShareEnabled, refreshShellLocationForSend } from "@shell/device-chips";
import { initShellInstallBanner } from "@shell/pwa";
import {
  getShellHttpsUrl,
  initShellPermissions,
  shellPermissionIssue,
  warmUpMicrophone
} from "@shell/permissions";
import { createShellDialog } from "@shell/dialog";
import { initShellComposeLayout } from "@shell/compose-layout";
import { migrateShellStorageFromMobile, SHELL_STORAGE } from "@shell/storage-keys";
import { initShellHelp } from "@shell/help";
import { initShellHints, updateTtsPlaybackHint, updateVoiceModeHint } from "@shell/hints";
import {
  normalizeWindowSettings,
  readWindowSettingsFromStorage,
  writeWindowSettingsToStorage
} from "@shell/window-storage";
import { buildProactiveMessage, createShellProactive, DEFAULT_PROACTIVE_PROMPT, normalizeQuietTime } from "@shell/proactive";
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
  resolveSttEngine,
  sttEngineIsAvailable,
  VOICE_INPUT_MODES,
  VOICE_MODE_LABELS,
  VOICE_MODE_HINTS,
  voiceModeMicAction,
  voiceModeMicLabel,
  voiceModeRequiresSidecar,
  voiceModeUsesBrowserStt,
  voiceModeUsesSidecarMic
} from "@shell/voice-modes";
import {
  SHELL_RUNTIMES,
  SHELL_RUNTIME_LABELS,
  SHELL_RUNTIME_HINTS,
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
  runtimeShowsProfile,
  runtimeShowsAgentId,
  runtimeUsesCli,
  runtimeShowsApiKey,
  runtimeShowsBaseUrl,
  runtimeModelPresets
} from "@shell/runtimes";

const SERVER_TTS_ENGINES = new Set(["say", "edge", "piper", "elevenlabs"]);
const VOICE_MODE_USER_GRACE_MS = 30000;
let ttsPlaybackModePersisting = false;
let voiceInputModePersisting = false;
let voiceModeUserChangedAt = 0;
let voiceModeHydratedFromServer = false;
let lastCommittedVoiceMode = "";

/** dialog — озвучка по мере печати; reading — после полного ответа и маркера. */
function readTtsPlaybackModeFromDom() {
  const checked = nodes.ttsPlaybackModeGroup?.querySelector('input[name="shell-tts-playback-mode"]:checked');
  const fromDom = checked?.value;
  if (fromDom === "reading" || fromDom === "dialog") return fromDom;
  return null;
}

function getTtsPlaybackMode() {
  const fromDom = readTtsPlaybackModeFromDom();
  if (fromDom) return fromDom;
  const mode = String(state.settings?.ttsPlaybackMode || "dialog").trim();
  return mode === "reading" ? "reading" : "dialog";
}

function syncTtsPlaybackModeUi(settings = state.settings) {
  if (!nodes.ttsPlaybackModeGroup || ttsPlaybackModePersisting) return;
  const active = document.activeElement;
  if (active && nodes.ttsPlaybackModeGroup.contains(active)) return;
  const mode = settings?.ttsPlaybackMode === "reading" ? "reading" : "dialog";
  const input = nodes.ttsPlaybackModeGroup.querySelector(`input[name="shell-tts-playback-mode"][value="${mode}"]`);
  if (input) input.checked = true;
  updateTtsPlaybackHint(mode);
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

/** @type {{ ttsPrompt: string, sttPrompt: string, proactivePrompt: string, sources: Record<string, string | null> }} */
let shellPromptTemplates = {
  ttsPrompt: DEFAULT_TTS_PROMPT,
  sttPrompt: DEFAULT_STT_PROMPT,
  proactivePrompt: DEFAULT_PROACTIVE_PROMPT,
  sources: { ttsPrompt: null, sttPrompt: null, proactivePrompt: null }
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

const HERO_STATE_LABELS = {
  ready: "Готов к сообщению",
  idle: "Ожидаю",
  listening: "Слушаю",
  thinking: "Думаю",
  replying: "Отвечаю"
};

const HERO_DEMO_PRESETS = {
  ready: { phase: "waiting", heroState: "ready", phrase: "Готов к сообщению" },
  idle: { phase: "waiting", heroState: "idle", phrase: "Ожидаю" },
  listening: { phase: "listening", heroState: "listening", phrase: "Слушаю" },
  thinking: { phase: "thinking", heroState: "thinking", phrase: "Думаю" },
  replying: { phase: "speaking", heroState: "replying", phrase: "Отвечаю" }
};

let heroStatusDemo = null;

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
  pendingReplyTtsClientId: ""
};

let messageSendAbortController = null;
let ttsTabCoordinator = null;
let shellPresenceController = null;
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
  if (nodes.sttEnabled?.checked === false) return "disabled";
  const raw =
    nodes.voiceMode?.value ||
    state.sttResumeMode ||
    lastCommittedVoiceMode ||
    state.settings?.voiceInputMode ||
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

function getVoiceModeContext(settings = state.settings) {
  return {
    globalListen: isVoiceGlobalListen(settings),
    sidecarConnected: state.sidecarConnected,
    sttEngine: normalizeSttEngine(settings?.sttEngine)
  };
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
      state.pttHeld ? "Sidecar слушает…" : "Готов к сообщению"
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
      state.meetingRecording ? "Запись встречи…" : "Готов к сообщению"
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
  qwenpawPanel: document.getElementById("shell-qwenpaw-panel"),
  qwenpawUrl: document.getElementById("shell-qwenpaw-url"),
  qwenpawOpenUrl: document.getElementById("shell-qwenpaw-open-url"),
  qwenpawAgentId: document.getElementById("shell-qwenpaw-agent-id"),
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
  bridgeModelNote: document.getElementById("shell-runtime-bridge-model-note"),
  bridgeProfileField: document.getElementById("shell-runtime-bridge-profile-field"),
  bridgeProfile: document.getElementById("shell-runtime-bridge-profile"),
  bridgeAgentField: document.getElementById("shell-runtime-bridge-agent-field"),
  bridgeAgentId: document.getElementById("shell-runtime-bridge-agent-id"),
  bridgeSessionId: document.getElementById("shell-runtime-bridge-session-id"),
  ttsEnabled: document.getElementById("shell-tts-enabled"),
  ttsPlaybackModeGroup: document.getElementById("shell-tts-playback-mode"),
  ttsPlaybackHint: document.getElementById("shell-tts-playback-hint"),
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
  sttSettingsPanel: document.getElementById("shell-stt-settings"),
  sttPrompt: document.getElementById("shell-stt-prompt"),
  sttPromptInsert: document.getElementById("shell-stt-prompt-insert"),
  sttLang: document.getElementById("shell-stt-lang"),
  sttEngine: document.getElementById("shell-stt-engine"),
  sttEngineNote: document.getElementById("shell-stt-engine-note"),
  voiceGlobalListen: document.getElementById("shell-voice-global-listen"),
  voiceWakeName: document.getElementById("shell-voice-wake-name"),
  topmost: document.getElementById("shell-topmost"),
  windowTransparent: document.getElementById("shell-window-transparent"),
  windowPetOverlay: document.getElementById("shell-window-pet"),
  windowBackground: document.getElementById("shell-window-background"),
  windowCompact: document.getElementById("shell-compact-action"),
  voiceMode: document.getElementById("shell-voice-mode"),
  voiceControl: document.getElementById("shell-voice-control"),
  voiceToCompose: document.getElementById("shell-voice-to-compose"),
  voiceToComposeWrap: document.getElementById("shell-voice-to-compose-wrap"),
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
  proactiveToggle: document.getElementById("shell-proactive-toggle"),
  proactiveEnabled: document.getElementById("shell-proactive-enabled"),
  proactiveIdleSeconds: document.getElementById("shell-proactive-idle-seconds"),
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
  compactAction: document.getElementById("shell-compact-action"),
  compactStage: document.getElementById("shell-compact-stage"),
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
  thread: document.getElementById("shell-dialog-thread"),
  lastReply: document.getElementById("shell-last-reply"),
  errorEl: document.getElementById("shell-dialog-error"),
  pullHint: document.getElementById("shell-pull-hint"),
  fetchHistory: async () => {
    const runtime = normalizeMessageRuntime(state.settings?.messageTarget || nodes.messageTarget?.value || "qwenpaw");
    const data = await apiFetch(`/api/shell/dialogs/history?runtime=${encodeURIComponent(runtime)}&limit=25`);
    return Array.isArray(data?.messages) ? data.messages : [];
  }
});

let shellSession = null;
let shellProactive = null;

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
      await saveSettings({ proactiveEnabled: enabled });
      if (nodes.proactiveEnabled) nodes.proactiveEnabled.checked = enabled;
    }
  });
  shellProactive.start();
  if (state.settings) shellProactive.syncSettings(state.settings);
}

function syncDialogConnectionState(override) {
  const conn = override || resolveShellServerConnectionState();
  shellDialog.setConnectionState(conn);
}

function getRuntimeStatus(runtime) {
  const id = normalizeMessageRuntime(runtime);
  return state.runtimeStatuses?.[id] || null;
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

function syncAgentSelects() {
  if (nodes.headerAgent && state.agentId) {
    nodes.headerAgent.value = state.agentId;
  }
}

async function populateAgentSelects() {
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
  navigateToShellAgent(agentId);
  if (state.eventSource) {
    state.eventSource.close();
    state.eventSource = null;
  }
  await resolveShellAgent();
  state.runtimeStatuses = {};
  refreshRuntimeSelectLabels();
  await refreshStatus();
  await loadComposeDraft();
  commitAllSettingsBaselines();
  connectStream();
}

function bindAgentSelectUi(selectEl) {
  selectEl?.addEventListener("change", () => {
    void onAgentSelectChange(selectEl.value);
  });
}

function renderHeaderHostChip() {
  if (!nodes.headerHost) return;
  const surface = getShellSurface();
  const host = surface?.host || readVoiceSurfaceHostFromLocation() || "browser-embed";
  nodes.headerHost.textContent = getShellHostHeaderLabel(host);
  nodes.headerHost.title = `${getShellHostLabel(host)} · где открыт Agent CMS Voice`;
}

function bindHeaderContextUi() {
  bindAgentSelectUi(nodes.headerAgent);
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

function resolveHeroStatusBadgeClass(displayPhase, heroState) {
  if (displayPhase === "listening") return "is-active";
  if (heroState === "thinking") return "is-busy";
  if (heroState === "replying") return "is-speaking";
  if (heroState === "ready") return "is-ready";
  return "is-idle";
}

function resolveHeroSensorActivity(displayPhase, heroState) {
  if (displayPhase === "listening") return "listening";
  if (heroState === "replying") return "speaking";
  if (heroState === "thinking") return "thinking";
  if (heroState === "ready") return "ready";
  return "idle";
}

function isHeroReadyPhrase(phrase = "") {
  const text = String(phrase || "").trim();
  if (!text) return true;
  return text.startsWith("Готов к сообщению");
}

function resolveHeroAvatarState(requestedPhase = "waiting", phrase = "") {
  if (heroStatusDemo?.heroState) return heroStatusDemo.heroState;
  if (isTtsPlaybackActive()) return "replying";
  if (state.assistantStream && !state.assistantStream.finalized) return "replying";
  const displayPhase = resolveDisplayPhase(requestedPhase);
  if (displayPhase === "listening") return "listening";
  if (displayPhase === "thinking") return "thinking";
  if (state.messagePipelineBusy) return "thinking";
  if (displayPhase === "waiting" && isHeroReadyPhrase(phrase)) return "ready";
  return "idle";
}

function syncHeroAvatarVisuals(requestedPhase = "waiting", { updateLabel = false, phrase = "" } = {}) {
  const displayPhase = heroStatusDemo?.phase || resolveDisplayPhase(requestedPhase);
  const statusText = String(phrase || "").trim();
  const demoPhrase = heroStatusDemo?.phrase || "";
  const heroState = resolveHeroAvatarState(requestedPhase, demoPhrase || statusText);

  if (nodes.agentAvatar) {
    nodes.agentAvatar.dataset.phase = displayPhase;
    nodes.agentAvatar.dataset.heroState = heroState;
    nodes.agentAvatar.dataset.activity = resolveHeroSensorActivity(displayPhase, heroState);
    nodes.agentAvatar.setAttribute(
      "aria-label",
      demoPhrase || HERO_STATE_LABELS[heroState] || HERO_STATE_LABELS.idle
    );
  }
  if (nodes.shellHero) {
    nodes.shellHero.dataset.heroState = heroState;
  }

  if (nodes.voiceWave) {
    const showWave = heroState === "replying" || isTtsPlaybackActive();
    nodes.voiceWave.classList.toggle("hidden", !showWave);
    nodes.voiceWave.classList.toggle("is-paused", Boolean(state.ttsPaused));
  }

  if (updateLabel && !state.ttsPaused && nodes.phaseLabel) {
    nodes.phaseLabel.classList.remove("is-idle", "is-ready", "is-active", "is-busy", "is-speaking", "is-typing");
    let labelText = demoPhrase;
    if (!labelText) {
      if (statusText) {
        labelText = statusText;
      } else if (displayPhase === "listening") {
        labelText = "Слушаю";
      } else if (displayPhase === "disabled") {
        labelText = PHASE_LABELS.disabled;
      } else {
        labelText = HERO_STATE_LABELS[heroState] || HERO_STATE_LABELS.idle;
      }
    }
    nodes.phaseLabel.textContent = labelText;
    nodes.phaseLabel.classList.add(resolveHeroStatusBadgeClass(displayPhase, heroState));
  }

  nodes.heroDemoBar?.querySelectorAll("[data-hero-demo]").forEach((btn) => {
    btn.classList.toggle("is-active", Boolean(heroStatusDemo && btn.dataset.heroDemo === heroStatusDemo.key));
  });
}

function clearHeroStatusDemo() {
  heroStatusDemo = null;
  nodes.heroDemoBar?.querySelectorAll("[data-hero-demo].is-active").forEach((btn) => {
    btn.classList.remove("is-active");
  });
}

function applyHeroStatusDemo(key) {
  const preset = HERO_DEMO_PRESETS[key];
  if (!preset) return;
  if (heroStatusDemo?.key === key) {
    clearHeroStatusDemo();
    syncHeroAvatarVisuals(state.shellState?.phase || "waiting", {
      updateLabel: true,
      phrase: state.shellState?.phrase || ""
    });
    return;
  }
  heroStatusDemo = { key, ...preset };
  syncHeroAvatarVisuals(preset.phase, { updateLabel: true, phrase: preset.phrase });
}

function maybeResetStaleSpeakingPhase() {
  if (state.shellState?.phase !== "speaking") return;
  if (isTtsPlaybackActive()) return;
  void patchShellState({ phase: "waiting", phrase: "Готов к сообщению" });
}

function renderPhase(phase, phrase = "", metrics = "") {
  if (shellSession?.shouldBlockPhaseUpdate(phase)) return;
  const statusText = String(phrase || "").trim();
  const skipLabel = shellSession?.shouldSkipDuplicatePhase(phase) && !statusText;
  if (!skipLabel) shellSession?.rememberPhase(phase);
  syncHeroAvatarVisuals(phase, { updateLabel: !skipLabel && !state.ttsPaused, phrase: statusText });
  nodes.meta.textContent = metrics || "";
  if (nodes.characterStage) nodes.characterStage.dataset.phase = resolveDisplayPhase(phase);
  updateTtsControlsUi(resolveDisplayPhase(phase));
  syncCompactSensorPhase(resolveDisplayPhase(phase), statusText);
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
  nodes.replyPanel?.classList.remove("is-streaming");
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

function renderAgentActivitySteps() {
  const wrap = nodes.agentActivity;
  const list = nodes.agentActivityList;
  if (!wrap || !list) return;
  if (!agentActivitySteps.length) {
    wrap.classList.add("hidden");
    list.replaceChildren();
    return;
  }
  wrap.classList.remove("hidden");
  list.replaceChildren();
  for (const step of agentActivitySteps) {
    const li = document.createElement("li");
    li.className = `shell-agent-activity-item shell-agent-activity-item--${step.kind || "run"}`;
    if (step.active) li.classList.add("is-active");
    li.textContent = step.label;
    list.append(li);
  }
  if (agentActivitySteps.length && nodes.replyPanel?.classList.contains("is-streaming")) {
    nodes.dialogScroll?.scrollTo?.({ top: nodes.dialogScroll.scrollHeight, behavior: "auto" });
  }
}

function resetAgentActivitySteps() {
  agentActivitySteps = [];
  agentActivityTypingAdded = false;
  renderAgentActivitySteps();
}

function finalizeAgentActivitySteps() {
  for (const step of agentActivitySteps) step.active = false;
  renderAgentActivitySteps();
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
  state.streamTtsCursor = 0;
  state.streamTtsQueue = [];
  state.streamTtsVoiceEnded = false;
  if (queueStreamSpeech._timer) {
    clearTimeout(queueStreamSpeech._timer);
    queueStreamSpeech._timer = 0;
  }
  lastStreamHandledBody = "";
  lastHandledStreamId = "";
  nodes.replyPanel?.classList.add("is-streaming");
  shellDialog.syncLiveReplySlot?.();
  if (nodes.lastReplyText) {
    nodes.lastReplyText.classList.remove("shell-md");
    nodes.lastReplyText.textContent = "…";
  }
  pushAgentActivityStep({ kind: "run", phrase: "Запускаю…" });
  renderPhase("thinking", "Запускаю…");
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
  if (state.assistantStream && !state.assistantStream.finalized) {
    syncHeroAvatarVisuals(state.shellState?.phase || "speaking", { updateLabel: true });
  }
}

const STREAM_TTS_MERGE = { maxChars: 320, maxParts: 4 };
const STREAM_TTS_MERGE_FLUSH = { maxChars: 2000, maxParts: 32 };

function prepareTtsStreamChunk(text) {
  let speech = String(text || "").trim();
  if (!speech) return "";
  if (state.settings?.ttsStripEmoji !== false) {
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
  nodes.replyPanel?.classList.remove("is-streaming");
  shellDialog.syncLiveReplySlot?.();
  shellSession?.flushStreamingRender(renderStreamingAssistantText);
  renderShellReply({ ...message, body, spokenText, spokenParts });
  shellDialog.onAgentReply(body);
  void shellDialog.refreshHistory?.();
  finalizeAgentActivitySteps();
  shellSession?.markReplyDisplayed({ ...message, body, streamId });
  markAssistantReplyHandled({ ...message, body, streamId }, body, { streamTts: true });

  if (state.settings?.ttsEnabled && shouldPlayReplyTts(message) && !state.messageStopped) {
    const parts = spokenParts
      .map((part) => prepareTtsStreamChunk(String(part || "").trim()))
      .filter(Boolean);
    if (!parts.length && !hasTtsPrompt()) {
      const fallback = prepareTtsStreamChunk(buildSpeechPayloadSync(rawBody));
      if (fallback) parts.push(fallback);
    }

    if (isReadingTtsMode()) {
      state.streamTtsCursor = 0;
      state.streamTtsQueue = [];
      state.streamTtsVoiceEnded = false;
      if (parts.length) {
        lastSpokenBody = parts.join("\0");
        void speakTextParts(parts, {
          ttsClientId: message.ttsClientId,
          sourceMessage: { ...message, body, streamId }
        }).finally(() => {
          state.assistantStream = null;
          releaseMessagePipeline();
        });
      } else {
        state.assistantStream = null;
        if (hasTtsPrompt()) {
          renderPhase(
            "waiting",
            "Нет текста для озвучки — агент не вернул блок до ::: VOICE-END :::",
            state.shellState?.metrics || ""
          );
        }
        releaseMessagePipeline();
      }
    } else {
      queueStreamSpeech(rawBody, { flush: true });
      if (parts.length) lastSpokenBody = parts.join("\0");
      const spokeViaStream =
        parts.length > 0 ||
        state.streamTtsCursor > 0 ||
        state.streamTtsQueue.length > 0 ||
        state.streamTtsVoiceEnded;
      if (!spokeViaStream && hasTtsPrompt()) {
        state.assistantStream = null;
        renderPhase(
          "waiting",
          "Нет текста для озвучки — агент не вернул блок до ::: VOICE-END :::",
          state.shellState?.metrics || ""
        );
        releaseMessagePipeline();
      } else {
        shellSession?.markReplySpoken({ ...message, body, streamId });
        void finishStreamTtsWhenIdle({
          sourceMessage: { ...message, body, streamId },
          spokenText: parts.join("\n\n")
        });
      }
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
  let label = "Отправить";
  if (state.messagePipelineBusy && draft) {
    label = outboundQueue.length ? `В очередь · ${outboundQueue.length}` : "В очередь";
  }
  nodes.sendBtn.title = label;
  nodes.sendBtn.setAttribute("aria-label", label);
  nodes.sendBtn.dataset.sendMode = state.messagePipelineBusy && draft ? "queue" : "send";
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
    nodes.replyPanel?.classList.remove("is-streaming");
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
      await patchShellState({ phase: "waiting", phrase: "Готов к сообщению" }).catch(() => {});
    }
    syncWaitingUiAfterPlayback();
    releaseMessagePipeline();
  }
}

function handleAgentActivity(payload = {}) {
  if (state.messageStopped) return;
  pushAgentActivityStep(payload);
  const phrase = String(payload.phrase || "").trim();
  const tool = String(payload.tool || "").trim();
  if (!phrase) return;
  renderPhase("thinking", phrase, tool || state.shellState?.metrics || "");
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
    } else {
      beginAssistantStream({ streamId });
    }
  }

  state.assistantStream.text = done ? state.assistantStream.text || rawText : rawText;
  if (spokenText) state.assistantStream.spokenText = spokenText;
  if (spokenParts.length) state.assistantStream.spokenParts = spokenParts;
  state.assistantStream.done = done;
  const displayText = hasTtsPrompt() ? extractStreamingReplyBody(rawText) : rawText;
  shellSession?.queueStreamingRender(displayText, renderStreamingAssistantText);
  if (!done) queueStreamSpeech(rawText);
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
    if (!state.settings?.ttsEnabled || !shouldPlayReplyTts(payload)) {
      renderPhase("waiting", "Готов к сообщению", state.shellState?.metrics || "");
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
  return {
    windowTopmost: nodes.topmost?.checked !== false,
    windowTransparent,
    windowBackground: windowTransparent ? "transparent" : windowBackground,
    windowCompact: isWindowCompactEnabled(),
    windowPetOverlay: nodes.windowPetOverlay?.checked === true,
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

function resolveCompactSensorActivity(displayPhase, phrase = "") {
  const text = String(phrase || "").trim();
  if (displayPhase === "listening") return "listening";
  if (displayPhase === "speaking") return "speaking";
  if (displayPhase === "thinking") {
    if (/печатает|typing|пишет/i.test(text)) return "typing";
    return "thinking";
  }
  if (displayPhase === "disabled") return "disabled";
  return "idle";
}

function syncCompactSensorPhase(phase, phrase = "") {
  const displayPhase = resolveDisplayPhase(phase);
  const sensor = nodes.compactSensor;
  const status = nodes.compactSensorStatus;
  if (!sensor || !status || !isWindowCompactEnabled()) return;
  if (isCompactSensorScanning()) return;

  sensor.dataset.phase = displayPhase;
  const text = String(phrase || "").trim() || PHASE_LABELS[displayPhase] || "Ожидание касания…";
  sensor.dataset.activity = resolveCompactSensorActivity(displayPhase, text);
  status.textContent = text;
  status.classList.remove("is-active", "is-busy", "is-speaking", "is-typing");
  if (sensor.dataset.activity === "listening") status.classList.add("is-active");
  else if (sensor.dataset.activity === "typing") status.classList.add("is-typing");
  else if (sensor.dataset.activity === "thinking") status.classList.add("is-busy");
  else if (sensor.dataset.activity === "speaking") status.classList.add("is-speaking");
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
  syncCompactSensorUi(compact);
}

function toggleCompactMode() {
  const next = !isWindowCompactEnabled();
  applyWindowAppearance({ ...(state.windowSettings || {}), windowCompact: next });
  syncCompactActionUi(next);
  if (next) setShellView("main");
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
  if (state.windowSettings && Object.prototype.hasOwnProperty.call(state.windowSettings, "windowCompact")) {
    return Boolean(state.windowSettings.windowCompact);
  }
  return nodes.compactAction?.getAttribute("aria-pressed") === "true";
}

function applyWindowSettings(settings) {
  state.windowSettings = settings;
  if (!settingsSave.isSectionDirty("window")) {
    if (nodes.topmost) nodes.topmost.checked = settings.windowTopmost !== false;
    if (nodes.windowTransparent) nodes.windowTransparent.checked = Boolean(settings.windowTransparent);
    if (nodes.windowPetOverlay) nodes.windowPetOverlay.checked = Boolean(settings.windowPetOverlay);
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
  nodes.micBtn.title = label;
  nodes.micBtn.classList.toggle("is-active", active);
  nodes.micBtn.setAttribute("aria-pressed", active ? "true" : "false");
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

function populateBridgeModelSelect(runtime, selected = "") {
  const select = nodes.bridgeModel;
  if (!select) return;
  const id = normalizeMessageRuntime(runtime);
  const presets = runtimeModelPresets(id);
  const value = String(selected ?? "").trim();
  select.replaceChildren();
  const seen = new Set();
  for (const item of presets) {
    const opt = document.createElement("option");
    opt.value = item.value;
    opt.textContent = item.label;
    select.append(opt);
    seen.add(item.value);
  }
  if (value && !seen.has(value)) {
    const opt = document.createElement("option");
    opt.value = value;
    opt.textContent = value;
    select.append(opt);
  }
  select.value = value;
}

function setBridgeModelNote(runtime) {
  const note = nodes.bridgeModelNote;
  if (!note) return;
  const id = normalizeMessageRuntime(runtime);
  if (!runtimeUsesBridge(id)) {
    note.textContent = "";
    return;
  }
  if (runtimeUsesCli(id)) {
    note.textContent =
      id === "codex"
        ? "«По умолчанию» — модель из codex login. Выбор выше → codex exec … -m <model>."
        : "«По умолчанию» — модель из claude login. Выбор выше → claude -p … --model <model>.";
    return;
  }
  note.textContent = "Model id для OpenAI-compatible endpoint. Свой id из /v1/models можно прописать в settings.json.";
}

function collectBridgeFormPatch(runtime) {
  const id = normalizeMessageRuntime(runtime);
  const defaults = RUNTIME_DEFAULTS[id] || {};
  const patch = {
    [bridgeRuntimeField(id, "model")]: nodes.bridgeModel?.value.trim() || defaults.model || "",
    [bridgeRuntimeField(id, "profile")]: nodes.bridgeProfile?.value.trim() || "",
    [bridgeRuntimeField(id, "agentId")]: nodes.bridgeAgentId?.value.trim() || "",
    [bridgeRuntimeField(id, "sessionId")]: nodes.bridgeSessionId?.value.trim() || defaults.sessionId || ""
  };
  if (runtimeUsesCli(id)) {
    patch[bridgeRuntimeField(id, "cliPath")] =
      nodes.bridgeUrl?.value.trim() || defaults.cliPath || (id === "codex" ? "codex" : "claude");
  } else {
    patch[bridgeRuntimeField(id, "baseUrl")] = nodes.bridgeUrl?.value.trim() || defaults.baseUrl || "";
    patch[bridgeRuntimeField(id, "apiKey")] = nodes.bridgeApiKey?.value.trim() || "";
  }
  return patch;
}

function applyBridgeForm(runtime, settings = state.settings || {}) {
  const id = normalizeMessageRuntime(runtime);
  const defaults = RUNTIME_DEFAULTS[id] || {};
  const read = (field) => String(settings[bridgeRuntimeField(id, field)] ?? "").trim();
  if (runtimeUsesCli(id)) {
    if (nodes.bridgeUrl) {
      nodes.bridgeUrl.value =
        read("cliPath") || defaults.cliPath || (id === "codex" ? "codex" : "claude");
    }
  } else {
    if (nodes.bridgeUrl) nodes.bridgeUrl.value = read("baseUrl") || defaults.baseUrl || "";
    if (nodes.bridgeApiKey) nodes.bridgeApiKey.value = read("apiKey");
  }
  populateBridgeModelSelect(id, read("model") || defaults.model || "");
  setBridgeModelNote(id);
  if (nodes.bridgeProfile) nodes.bridgeProfile.value = read("profile");
  if (nodes.bridgeAgentId) nodes.bridgeAgentId.value = read("agentId");
  if (nodes.bridgeSessionId) {
    nodes.bridgeSessionId.value = read("sessionId") || defaults.sessionId || "";
  }
}

function collectRouteSnapshot() {
  const runtime = getSelectedRuntime();
  const patch = {
    messageTarget: runtime,
    qwenpawBaseUrl: nodes.qwenpawUrl?.value.trim() || "http://127.0.0.1:8088",
    qwenpawAgentId: nodes.qwenpawAgentId?.value.trim() || "default"
  };
  if (runtimeUsesBridge(runtime)) {
    Object.assign(patch, collectBridgeFormPatch(runtime));
  }
  return patch;
}

function getSettingsSnapshot(section) {
  if (section === "window") return collectWindowSnapshot();
  if (section === "route") return collectRouteSnapshot();
  if (section === "proactive") return collectProactiveFormPatch();
  if (section === "tts") return collectTtsSettingsPatch();
  if (section === "stt") return collectSttSettingsPatch();
  return {};
}

function markSettingsDirty(section) {
  settingsSave.markDirty(section, getSettingsSnapshot(section));
}

function commitAllSettingsBaselines() {
  settingsSave.commitAllBaselines({
    window: collectWindowSnapshot(),
    route: collectRouteSnapshot(),
    proactive: collectProactiveFormPatch(),
    tts: collectTtsSettingsPatch(),
    stt: collectSttSettingsPatch()
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
  if (section === "route") updateRuntimeUi();
  if (section === "stt") {
    applyRecognitionLang(patch.sttLang);
  }
  await saveSettings(patch);
  settingsSave.commitBaseline(section, getSettingsSnapshot(section));
}

function applyTtsSummarySettings(settings = state.settings) {
  if (!settings) return;
  if (document.activeElement !== nodes.ttsEnabled) {
    nodes.ttsEnabled.checked = settings.ttsEnabled !== false;
  }
  syncTtsPlaybackModeUi(settings);
}

function applySttSummarySettings(settings = state.settings) {
  if (!settings) return;
  applySttToggleUi(settings);
}

function applySettings(settings) {
  state.settings = settings;

  if (!settingsSave.isSectionDirty("route")) {
    populateRuntimeSelect(settings.messageTarget || "qwenpaw");
    nodes.qwenpawUrl.value = settings.qwenpawBaseUrl || "http://127.0.0.1:8088";
    nodes.qwenpawAgentId.value = settings.qwenpawAgentId || "default";
    void loadQwenPawAgents(settings.qwenpawAgentId || "default");
    applyBridgeForm(normalizeMessageRuntime(settings.messageTarget || "qwenpaw"), settings);
    updateRuntimeUi();
  }

  if (!settingsSave.isSectionDirty("tts") && document.activeElement !== nodes.ttsEnabled) {
    nodes.ttsEnabled.checked = settings.ttsEnabled !== false;
  }
  syncTtsPlaybackModeUi(settings);
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
  if (!settingsSave.isSectionDirty("proactive")) {
    applyProactiveFormUi(settings);
  }
  syncCompactSensorAvailability();
  shellProactive?.syncSettings(settings);
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
  });
}

function navigateToShellAgent(agentId) {
  const id = String(agentId || "").trim();
  if (!id) return;
  state.agentId = id;
  localStorage.setItem(SHELL_STORAGE.agent, id);
  syncShellAgentUrl(id);
  hideShellAgentGate();
  if (shellAgentGateResolver) {
    shellAgentGateResolver(id);
    shellAgentGateResolver = null;
  }
}

function bindShellAgentGateUi() {
  nodes.agentGateOpen?.addEventListener("click", () => {
    navigateToShellAgent(nodes.agentGateSelect?.value || state.agentId);
  });
}

async function ensureShellAgentSelected() {
  const fromPath = parseShellPathAgentId();
  if (fromPath) {
    state.agentId = fromPath;
    localStorage.setItem(SHELL_STORAGE.agent, fromPath);
    hideShellAgentGate();
    return fromPath;
  }

  const data = await loadAgentSelectData();
  const selectable = getSelectableAgents(data.agents);
  if (!selectable.length) {
    throw new Error("Нет доступных workspace-агентов в CMS");
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

function syncRuntimeSelects(preferred = "") {
  const raw =
    preferred === "route"
      ? nodes.routeRuntime?.value
      : preferred === "header"
        ? nodes.messageTarget?.value
        : nodes.routeRuntime?.value || nodes.messageTarget?.value || state.settings?.messageTarget || "qwenpaw";
  const runtime = normalizeMessageRuntime(raw);
  if (nodes.messageTarget) nodes.messageTarget.value = runtime;
  if (nodes.routeRuntime) nodes.routeRuntime.value = runtime;
}

function getSelectedRuntime() {
  const raw =
    nodes.routeRuntime?.value ||
    nodes.messageTarget?.value ||
    state.settings?.messageTarget ||
    "qwenpaw";
  return normalizeMessageRuntime(raw);
}

function getSelectableRuntimes() {
  return SHELL_RUNTIMES.filter((runtime) => isRuntimeImplemented(runtime));
}

function fillRuntimeSelect(selectEl, selected, available) {
  if (!selectEl) return;
  let current = normalizeMessageRuntime(selected);
  if (!available.includes(current)) current = available.includes("qwenpaw") ? "qwenpaw" : available[0] || "qwenpaw";
  selectEl.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "— Runtime —";
  placeholder.disabled = true;
  selectEl.append(placeholder);
  for (const runtime of SHELL_RUNTIMES) {
    const opt = document.createElement("option");
    const selectable = available.includes(runtime);
    const status = selectable ? getRuntimeStatus(runtime) : null;
    const conn = selectable
      ? resolveRuntimeConnectionState(runtime, status, { implemented: true })
      : "soon";
    opt.value = runtime;
    opt.textContent = formatRuntimeSelectLabel(runtime, { implemented: selectable, status, conn });
    opt.title = formatRuntimeStatusTitle(runtime, status, { implemented: selectable });
    opt.disabled = !selectable;
    if (runtime === current) opt.selected = true;
    selectEl.append(opt);
  }
  if (!available.includes(normalizeMessageRuntime(selectEl.value))) {
    selectEl.value = current;
  }
}

function refreshRuntimeSelectLabels() {
  for (const selectEl of [nodes.messageTarget, nodes.routeRuntime]) {
    if (!selectEl) continue;
    for (const opt of selectEl.options) {
      if (!opt.value) continue;
      const runtime = normalizeMessageRuntime(opt.value);
      if (!SHELL_RUNTIMES.includes(runtime)) continue;
      const selectable = isRuntimeImplemented(runtime);
      const status = selectable ? getRuntimeStatus(runtime) : null;
      const conn = selectable
        ? resolveRuntimeConnectionState(runtime, status, { implemented: true })
        : "soon";
      opt.textContent = formatRuntimeSelectLabel(runtime, { implemented: selectable, status, conn });
      opt.title = formatRuntimeStatusTitle(runtime, status, { implemented: selectable });
    }
  }
}

function populateRuntimeSelect(selected = normalizeMessageRuntime(state.settings?.messageTarget || "qwenpaw")) {
  const available = getSelectableRuntimes();
  fillRuntimeSelect(nodes.messageTarget, selected, available);
  fillRuntimeSelect(nodes.routeRuntime, selected, available);
  syncRuntimeSelects();
  updateRuntimeUi();
}

function updateRuntimeUi() {
  const runtime = getSelectedRuntime();
  if (nodes.qwenpawPanel) {
    nodes.qwenpawPanel.dataset.visible = runtimeUsesQwenPaw(runtime) ? "1" : "0";
  }
  if (nodes.bridgePanel) {
    nodes.bridgePanel.dataset.visible = runtimeUsesBridge(runtime) ? "1" : "0";
  }
  if (runtimeUsesBridge(runtime)) {
    applyBridgeForm(runtime, state.settings || {});
    const usesCli = runtimeUsesCli(runtime);
    const showBaseUrl = runtimeShowsBaseUrl(runtime);
    if (nodes.bridgeUrlLabel) {
      nodes.bridgeUrlLabel.textContent = usesCli ? "CLI binary" : "Base URL (/v1 добавится автоматически)";
    }
    if (nodes.bridgeUrl) {
      nodes.bridgeUrl.type = usesCli ? "text" : "url";
      nodes.bridgeUrl.placeholder = usesCli
        ? runtime === "codex"
          ? "codex"
          : "claude"
        : "http://127.0.0.1:8642";
    }
    if (nodes.bridgeUrlField) {
      nodes.bridgeUrlField.hidden = !showBaseUrl && !usesCli;
      nodes.bridgeUrlField.classList.toggle("hidden", !showBaseUrl && !usesCli);
    }
    const showApiKey = runtimeShowsApiKey(runtime);
    nodes.bridgeApiKeyField?.classList.toggle("hidden", !showApiKey);
    if (nodes.bridgeApiKeyField) nodes.bridgeApiKeyField.hidden = !showApiKey;
    const showProfile = runtimeShowsProfile(runtime);
    nodes.bridgeProfileField?.classList.toggle("hidden", !showProfile);
    if (nodes.bridgeProfileField) nodes.bridgeProfileField.hidden = !showProfile;
    const showAgent = runtimeShowsAgentId(runtime);
    nodes.bridgeAgentField?.classList.toggle("hidden", !showAgent);
    if (nodes.bridgeAgentField) nodes.bridgeAgentField.hidden = !showAgent;
    setBridgeModelNote(runtime);
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
  if (payload?.settings) applySettings(payload.settings);
  if (payload?.agentId && payload.agentId !== prevAgentId) {
    commitAllSettingsBaselines();
  }
  state.sidecarConnected = Boolean(payload?.sidecarConnected);
  syncCompactSensorAvailability();
  updateFnPttHint(getVoiceInputMode());
  updateSttEngineNote();
  state.qwenpawServerOk = Boolean(payload?.qwenpaw?.serverOk);
  state.qwenpawAgentOk = Boolean(payload?.qwenpaw?.agentOk);
  state.qwenpawAgentName = String(payload?.qwenpaw?.agentName || "");
  state.qwenpawAgentError = String(payload?.qwenpaw?.agentError || "");
  state.qwenpawConnected = Boolean(payload?.qwenpaw?.ok);
  if (Array.isArray(payload?.availableRuntimes) && payload.availableRuntimes.length) {
    state.availableRuntimes = payload.availableRuntimes.map((item) => normalizeMessageRuntime(item));
  }
  if (Array.isArray(payload?.installedRuntimes)) {
    state.installedRuntimes = payload.installedRuntimes.map((item) => normalizeMessageRuntime(item));
  }
  if (payload?.runtimeStatuses && typeof payload.runtimeStatuses === "object") {
    state.runtimeStatuses = payload.runtimeStatuses;
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
      next[activeRuntime] = {
        ...next[activeRuntime],
        ...payload.runtime,
        runtime: activeRuntime
      };
    }
    state.runtimeStatuses = next;
  }
  refreshRuntimeSelectLabels();
  state.runtimeServerOk = Boolean(payload?.runtime?.serverOk ?? payload?.runtime?.ok);
  state.runtimeConnected = Boolean(payload?.runtime?.ok);
  state.runtimeError = String(payload?.runtime?.error || "");
  syncDialogConnectionState();
  updateQwenPawChatUi(payload);

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
}

async function refreshStatus() {
  const payload = await apiFetch("/api/shell/status");
  applyStatusPayload(payload);
}

async function loadWindowSettings() {
  let settings = readWindowSettingsFromStorage();
  if (!settings) {
    try {
      const data = await apiFetch("/api/shell/window");
      settings = normalizeWindowSettings(data.settings);
      writeWindowSettingsToStorage(settings);
    } catch {
      settings = normalizeWindowSettings({});
    }
  }
  applyWindowSettings(settings);
}

async function saveWindowSettings(patch) {
  try {
    const settings = writeWindowSettingsToStorage(patch);
    applyWindowSettings(settings);
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
    }
    if (apply === "tts") applyTtsSummarySettings(settings);
    else if (apply === "stt") applySttSummarySettings(settings);
    else if (apply === "full") applySettings(settings);
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

function isVoiceToComposeEnabled() {
  return Boolean(nodes.voiceToCompose?.checked ?? state.settings?.voiceToCompose);
}

function appendVoiceToCompose(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed || !nodes.message) return;
  const current = String(nodes.message.value || "").trimEnd();
  const next = current ? `${current} ${trimmed}` : trimmed;
  setComposeMessageValue(next);
  nodes.message.focus();
  const len = nodes.message.value.length;
  try {
    nodes.message.setSelectionRange(len, len);
  } catch {
    // ignore
  }
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
  const fullscreenHead = nodes.composeDock?.querySelector(".shell-compose-fullscreen-head");
  fullscreenHead?.setAttribute("aria-hidden", expanded ? "false" : "true");
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
  shellProactive?.bumpActivity();

  if (fromCompose && nodes.message) {
    nodes.message.value = "";
    updateSendButtonLabel();
    void clearComposeDraft();
    nodes.message.blur();
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
  const template = resolveProactivePromptTemplate();
  await sendMessageDirect(buildProactiveMessage(idleSeconds, template), {
    fromCompose: false,
    voice: false,
    author: "shell/proactive",
    displayPhrase: "Проактивность…",
    showInDialog: false
  });
}

async function sendMessageDirect(
  body,
  { fromCompose = false, voice = false, author = "shell", displayPhrase = "", showInDialog = true } = {}
) {
  const text = String(body || "").trim();
  if (!text) return;
  clearHeroStatusDemo();
  shellProactive?.bumpActivity();
  void unlockShellAudio();
  shellSession?.setSessionUiLocked(true);
  shellSession?.resetStreamRenderState();
  state.messageStopped = false;
  state.messagePipelineBusy = true;
  state.processingMessage = text;
  state.pendingReplyTtsClientId = getShellClientId();
  shellPresenceController?.ping({ interact: true });
  renderMessageQueue();
  updateSendButtonLabel();
  const target = normalizeMessageRuntime(state.settings?.messageTarget || nodes.messageTarget?.value || "qwenpaw");
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
    if (showInDialog) shellDialog.onUserMessage(text);
    await patchShellState({ phase: "thinking", phrase: String(displayPhrase || text).slice(0, 240) });
    const result = await apiFetch("/api/shell/message", {
      method: "POST",
      body: JSON.stringify({
        body: text,
        author,
        displayPhrase: displayPhrase || undefined,
        voice: Boolean(voice),
        shellClientId: getShellClientId(),
        ...collectOutboundMessageSettings()
      }),
      signal
    });
    void shellDialog.refreshHistory?.();
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
      sources: {
        ttsPrompt: data.sources?.ttsPrompt || null,
        sttPrompt: data.sources?.sttPrompt || null,
        proactivePrompt: data.sources?.proactivePrompt || null
      }
    };
  } catch {
    shellPromptTemplates = {
      ttsPrompt: DEFAULT_TTS_PROMPT,
      sttPrompt: DEFAULT_STT_PROMPT,
      proactivePrompt: DEFAULT_PROACTIVE_PROMPT,
      sources: { ttsPrompt: null, sttPrompt: null, proactivePrompt: null }
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
  updateComposeVoiceBarHint(getVoiceInputMode());
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

function updateComposeVoiceBarHint(mode = getVoiceInputMode()) {
  if (!nodes.fnPttHint) return;
  const action = voiceModeMicAction(mode);
  const globalOn = isVoiceGlobalListen();
  const sidecar = state.sidecarConnected;
  const needsSidecar = voiceModeRequiresSidecar(mode) || (globalOn && (mode === "hold" || mode === "fn_button"));

  let show = true;
  let text = VOICE_MODE_HINTS[mode] || "";
  nodes.fnPttHint.classList.remove("shell-compose-voice-hint--warn");

  if (mode === "disabled") {
    show = false;
  } else if (mode === "fn_button") {
    text = globalOn && sidecar
      ? "Shift: удерживай для записи. Глобально — sidecar подключён."
      : globalOn
        ? "Shift глобально — запусти sidecar: npm run shell:sidecar"
        : "Shift: удерживай для записи (окно Shell в фокусе, не в поле ввода).";
    if (globalOn && !sidecar) nodes.fnPttHint.classList.add("shell-compose-voice-hint--warn");
  } else if (mode === "live" || mode === "wake_name") {
    text = `${VOICE_MODE_HINTS[mode] || ""}${mode === "wake_name" && state.settings?.voiceWakeName ? ` Имя: «${state.settings.voiceWakeName}».` : ""} Нужен sidecar.`;
    if (!sidecar) {
      text += " Запусти: npm run shell:sidecar";
      nodes.fnPttHint.classList.add("shell-compose-voice-hint--warn");
    }
  } else if (mode === "meeting") {
    text = sidecar
      ? "Нажмите 🎤 — старт/стоп записи встречи. Файл → awn-dialogs/records/meeting/."
      : "Запись встречи — нужен sidecar: npm run shell:sidecar";
    if (!sidecar) nodes.fnPttHint.classList.add("shell-compose-voice-hint--warn");
  } else if (mode === "hold") {
    text = globalOn
      ? sidecar
        ? "Удерживайте 🎤 — глобально через sidecar."
        : "Глобально — запусти sidecar: npm run shell:sidecar"
      : "Удерживайте 🎤 — говорите — отпустите.";
    if (globalOn && !sidecar) nodes.fnPttHint.classList.add("shell-compose-voice-hint--warn");
  }

  if (needsSidecar && !sidecar && mode !== "hold" && mode !== "fn_button") {
    nodes.fnPttHint.classList.add("shell-compose-voice-hint--warn");
  }

  const recording = isVoiceRecordingActive() && state.voiceRecordStartedAt > 0;
  nodes.fnPttHint.classList.toggle("shell-compose-voice-hint--recording", recording);
  const hasWarn = nodes.fnPttHint.classList.contains("shell-compose-voice-hint--warn");
  nodes.fnPttHint.classList.toggle("hidden", !show || (!hasWarn && !recording));
  if (show) {
    if (recording) {
      const elapsed = formatVoiceRecordElapsed(Date.now() - state.voiceRecordStartedAt);
      nodes.fnPttHint.textContent = `🔴 ${elapsed} · ${text}`;
    } else {
      nodes.fnPttHint.textContent = text;
    }
  }
}

function updateFnPttHint(mode = getVoiceInputMode()) {
  updateComposeVoiceBarHint(mode);
}

function updateVoiceToComposeUi() {
  const sttOff = nodes.sttEnabled?.checked === false;
  const on = isVoiceToComposeEnabled();
  nodes.voiceToComposeWrap?.classList.toggle("is-active", on);
  nodes.voiceToComposeWrap?.classList.toggle("is-disabled", sttOff);
  nodes.voiceToComposeWrap?.setAttribute("aria-pressed", on ? "true" : "false");
  if (nodes.voiceToCompose) {
    nodes.voiceToCompose.disabled = sttOff;
    nodes.voiceToComposeWrap.title = sttOff
      ? "Голосовой ввод выключен"
      : on
        ? "✏️ В поле ввода — речь попадает в текст, не отправляется агенту"
        : "✏️ Агенту — речь отправляется (с подтверждением, если включено в ⚙️ STT)";
  }
}

function updateVoiceModeSelectUi() {
  const sttOff = nodes.sttEnabled?.checked === false;
  const mode = sttOff
    ? "disabled"
    : normalizeVoiceInputMode(nodes.voiceMode?.value || state.sttResumeMode || "hold");
  const micAction = voiceModeMicAction(mode);
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
}

function populateVoiceModeSelect(selected = getVoiceInputMode()) {
  if (!nodes.voiceMode) return;
  const current = normalizeVoiceInputMode(selected === "disabled" ? state.sttResumeMode || "hold" : selected);
  nodes.voiceMode.innerHTML = "";
  for (const mode of VOICE_INPUT_MODES) {
    const opt = document.createElement("option");
    opt.value = mode;
    opt.textContent = VOICE_MODE_LABELS[mode] || mode;
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

  const stored = normalizeVoiceInputMode(settings?.voiceInputMode || "hold");
  const localMode = normalizeVoiceInputMode(
    nodes.voiceMode.value || state.sttResumeMode || lastCommittedVoiceMode || "hold"
  );
  const userLocked = isVoiceModeUserLocked();

  if (!voiceModeHydratedFromServer && !userLocked) {
    if (stored !== "disabled" && stored !== localMode) {
      nodes.voiceMode.value = stored;
      state.sttResumeMode = stored;
      lastCommittedVoiceMode = stored;
      if (state.settings) state.settings.voiceInputMode = stored;
    }
    voiceModeHydratedFromServer = true;
  } else if (
    !userLocked &&
    stored !== "disabled" &&
    stored !== localMode &&
    lastCommittedVoiceMode === localMode
  ) {
    state.sttResumeMode = localMode;
    if (state.settings) state.settings.voiceInputMode = localMode;
    void persistVoiceInputMode(localMode);
  }

  if (nodes.sttEnabled) {
    if (stored !== "disabled") {
      nodes.sttEnabled.checked = true;
    } else if (!nodes.sttEnabled.checked) {
      nodes.sttEnabled.checked = false;
    }
  }

  if (state.pendingVoiceInputMode && stored === normalizeVoiceInputMode(state.pendingVoiceInputMode)) {
    state.pendingVoiceInputMode = null;
  }

  updateVoiceModeSelectUi();
}

function applySttToggleUi(settings) {
  if (!isMicPhysicalHold()) {
    syncVoiceModeUi(settings);
  }
  if (nodes.voiceGlobalListen && document.activeElement !== nodes.voiceGlobalListen) {
    nodes.voiceGlobalListen.checked = settings.voiceGlobalListen === true;
  }
  if (nodes.voiceWakeName && document.activeElement !== nodes.voiceWakeName) {
    nodes.voiceWakeName.value = settings.voiceWakeName || "";
  }
  if (nodes.voiceToCompose && document.activeElement !== nodes.voiceToCompose) {
    nodes.voiceToCompose.checked = Boolean(settings.voiceToCompose);
  }
  updateVoiceToComposeUi();
  updateFnPttHint(getVoiceInputMode());
  updateSttEngineNote(settings);
}

function applySttFormUi(settings) {
  if (nodes.sttPrompt && document.activeElement !== nodes.sttPrompt) {
    nodes.sttPrompt.value = settings.sttPrompt || "";
  }
  if (nodes.sttLang) nodes.sttLang.value = settings.sttLang || "ru-RU";
  if (nodes.sttEngine && document.activeElement !== nodes.sttEngine) {
    nodes.sttEngine.value = normalizeSttEngine(settings.sttEngine);
  }
  applyRecognitionLang(settings.sttLang);
  updateSttEngineNote(settings);
}

function updateSttEngineNote(settings = state.settings) {
  const el = nodes.sttEngineNote;
  if (!el) return;
  const mode = getVoiceInputMode();
  const ctx = getVoiceModeContext(settings);
  const resolved = resolveSttEngine(mode, ctx);
  const picked = normalizeSttEngine(settings?.sttEngine);
  let text = "";

  if (picked === "auto") {
    text =
      resolved === "sidecar"
        ? "Авто → sidecar для текущего режима. Sidecar записывает и расшифровывает речь (Python)."
        : "Авто → Web Speech в браузере. Нужен HTTPS; Chrome / Safari на Mac.";
  } else if (picked === "browser") {
    text = "Web Speech API в браузере. Удерживайте 🎤 или Shift (без sidecar). Нужен HTTPS.";
  } else {
    text = state.sidecarConnected
      ? "Sidecar подключён — STT через Python (удержание 🎤 / Shift / Live / Встреча)."
      : "Sidecar не запущен. В терминале: AGENT_CMS_AGENT=agent-cms-core npm run shell:sidecar";
  }

  if (resolved === "sidecar" && !state.sidecarConnected) {
    text += " · Запустите sidecar.";
  }

  el.textContent = text;
  el.classList.toggle("shell-stt-engine-note--warn", resolved === "sidecar" && !state.sidecarConnected);
}

function applySttSettingsUi(settings) {
  applySttToggleUi(settings);
  applySttFormUi(settings);
}

function collectSttFormPatch() {
  return {
    sttLang: nodes.sttLang?.value || "ru-RU",
    sttEngine: normalizeSttEngine(nodes.sttEngine?.value),
    sttPrompt: nodes.sttPrompt?.value || "",
    voiceGlobalListen: Boolean(nodes.voiceGlobalListen?.checked),
    voiceWakeName: nodes.voiceWakeName?.value?.trim() || "",
    voiceToCompose: Boolean(nodes.voiceToCompose?.checked)
  };
}

function collectSttSettingsPatch() {
  return {
    sttEnabled: nodes.sttEnabled?.checked !== false,
    ...collectSttFormPatch()
  };
}

function applyProactiveFormUi(settings) {
  if (nodes.proactiveEnabled) {
    nodes.proactiveEnabled.checked = Boolean(settings.proactiveEnabled);
  }
  if (nodes.proactiveIdleSeconds) {
    nodes.proactiveIdleSeconds.value = String(settings.proactiveIdleSeconds ?? 180);
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
  return {
    proactiveEnabled: Boolean(nodes.proactiveEnabled?.checked),
    proactiveIdleSeconds: Math.min(
      3600,
      Math.max(30, Number(nodes.proactiveIdleSeconds?.value) || 180)
    ),
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

async function persistMessageTarget(runtime) {
  const target = normalizeMessageRuntime(runtime);
  if (state.settings) state.settings.messageTarget = target;
  try {
    await saveSettings({ messageTarget: target });
    settingsSave.commitBaseline("route", collectRouteSnapshot());
    refreshRuntimeSelectLabels();
  } catch (error) {
    markSettingsDirty("route");
  }
}

async function persistSttEnabled(enabled) {
  const uiMode = normalizeVoiceInputMode(nodes.voiceMode?.value || state.sttResumeMode || "hold");
  const voiceInputMode = enabled ? uiMode : "disabled";
  state.sttResumeMode = uiMode;
  if (!enabled) {
    shellTapVoice?.abortSession();
    if (state.meetingRecording) void setMeetingRecordingRemote(false);
  }
  if (state.settings) state.settings.voiceInputMode = voiceInputMode;
  try {
    await saveSettings({ voiceInputMode }, { apply: "stt" });
    settingsSave.patchBaseline("stt", { voiceInputMode, sttEnabled: enabled });
    markSettingsDirty("stt");
  } catch (error) {
    renderPhase("waiting", error.message);
    markSettingsDirty("stt");
  }
  updateVoiceModeSelectUi();
  syncCompactSensorAvailability();
}

async function persistVoiceInputMode(mode) {
  const next = normalizeVoiceInputMode(mode);
  const stored = next === "disabled" ? "disabled" : next;
  if (stored !== "disabled") state.pendingVoiceInputMode = stored;
  if (state.settings) state.settings.voiceInputMode = stored;
  voiceInputModePersisting = true;
  try {
    await saveSettings({ voiceInputMode: stored }, { apply: "stt" });
    lastCommittedVoiceMode = stored;
    if (state.pendingVoiceInputMode === stored) state.pendingVoiceInputMode = null;
  } catch (error) {
    state.pendingVoiceInputMode = null;
    renderPhase("waiting", error.message);
  } finally {
    voiceInputModePersisting = false;
  }
}

async function persistTtsEnabled(enabled) {
  if (state.settings) state.settings.ttsEnabled = enabled;
  try {
    await saveSettings({ ttsEnabled: enabled }, { apply: "tts" });
    settingsSave.patchBaseline("tts", { ttsEnabled: enabled });
    markSettingsDirty("tts");
  } catch (error) {
    renderPhase("waiting", error.message);
    markSettingsDirty("tts");
  }
}

async function persistTtsPlaybackMode(mode) {
  const next = mode === "reading" ? "reading" : "dialog";
  if (state.settings) state.settings.ttsPlaybackMode = next;
  ttsPlaybackModePersisting = true;
  try {
    await saveSettings({ ttsPlaybackMode: next }, { apply: "tts" });
    settingsSave.patchBaseline("tts", { ttsPlaybackMode: next });
    markSettingsDirty("tts");
  } catch (error) {
    renderPhase("waiting", error.message);
    markSettingsDirty("tts");
  } finally {
    ttsPlaybackModePersisting = false;
  }
}

async function loadTtsCapabilities() {
  try {
    const data = await apiFetch("/api/shell/tts/capabilities");
    const engines = { ...(data?.engines || {}) };
    const engine = getTtsEngine();
    const current = engines[engine];
    if (nodes.ttsCapabilitiesNote) {
      const engineHint = ttsEngineDescription(engine);
      const missingElevenlabsKey =
        engine === "elevenlabs" && !String(resolveElevenlabsApiKey() || "").trim();
      if (missingElevenlabsKey) {
        nodes.ttsCapabilitiesNote.textContent =
          current?.hint || "ElevenLabs: введите API key и Voice ID, затем «Сохранить»";
        nodes.ttsCapabilitiesNote.classList.remove("hidden");
      } else if (current?.available === false) {
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
        option.disabled = option.value === "elevenlabs" ? false : meta?.available === false;
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
  syncTtsPlaybackModeUi(settings);
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
    hostUrl: window.location.href,
    ...getShellSurfacePayload(),
    ...(deviceContext ? { deviceContext } : {})
  };
}

function collectTtsFormPatch() {
  return {
    ttsPlaybackMode: getTtsPlaybackMode(),
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
    ttsEnabled: nodes.ttsEnabled?.checked !== false,
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
  settingsSave.commitBaseline("tts", collectTtsSettingsPatch());
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

async function playTtsPayload(text, { allowBrowserFallback = true, streamChunk = false } = {}) {
  const payload = String(text || "").trim();
  if (!payload) return null;
  await unlockShellAudio();

  const keepSpeakingState = () =>
    streamChunk || state.streamTtsActive || state.streamTtsQueue.length > 0;

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
    if (shouldPlayMessageTts(message)) {
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
    if (shouldPlayMessageTts(message)) {
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
  void shellDialog.refreshHistory?.();
  shellSession?.markReplyDisplayed(message);

  const phase = state.shellState?.phase || "waiting";
  if (phase === "waiting" && !state.pttHeld && !state.micActive && !state.speaking) {
    renderPhase(phase, "Готов к сообщению", state.shellState?.metrics || "");
  }
  if (shouldPlayMessageTts(message)) {
    const parts = buildSpeechParts(body, message);
    if (!parts.length) {
      shellDialog.setError("Нечего озвучить", {
        hint: "Агент не вернул текст до маркера ::: VOICE-END ::: — проверьте ttsPrompt"
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
    syncDialogConnectionState();
    return;
  }

  const source = new EventSource(apiUrl("/api/shell/stream"));
  state.eventSource = source;
  syncDialogConnectionState("connecting");
  source.onopen = () => {
    syncDialogConnectionState("live");
  };
  source.onerror = () => {
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

  source.addEventListener("agent_activity", (event) => {
    try {
      const payload = JSON.parse(event.data);
      handleAgentActivity(payload);
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

  source.addEventListener("compose_draft", (event) => {
    try {
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
      const entry = JSON.parse(event.data);
      const nextState = entry.payload || entry;
      onShellPhaseChange(nextState);
      if (nextState?.phase) {
        state.shellState = { ...(state.shellState || {}), ...nextState };
        const phase = nextState.phase;
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

  if (isVoiceToComposeEnabled()) {
    appendVoiceToCompose(trimmed);
    renderPhase("waiting", "Текст в поле ввода — отправьте вручную");
    hapticTap();
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
  if (!insecure) {
    void warmUpMicrophone()
      .then(() => {
        state.micWarmed = true;
      })
      .catch(() => {
        state.micWarmed = false;
      });
  }
  updateVoiceModeSelectUi();
}

function beginMicHold() {
  const mode = getVoiceInputMode();
  if (mode === "disabled" || isSttDisabled()) {
    renderPhase("disabled", "Голосовой ввод отключён");
    return false;
  }
  if (voiceModeMicAction(mode) !== "hold") return false;
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
    hapticTap();
    void setPttHeldRemote(true).catch((error) => renderPhase("waiting", error.message));
    return true;
  }
  if (!shellTapVoice) {
    renderPhase("waiting", `SpeechRecognition недоступен · ${getShellHttpsUrl()}`);
    return false;
  }
  if (usesBrowserStt(mode)) {
    shellTapVoice.prepareSession();
    void shellTapVoice.startSession({ viaTap: true });
    return true;
  }
  renderPhase("waiting", "Голос недоступен — проверьте режим и «Глобально»");
  return false;
}

function endMicHold() {
  const mode = getVoiceInputMode();
  if (voiceModeMicAction(mode) !== "hold") return;
  schedulePttReleaseTail(() => {
    if (usesSidecarMic(mode)) {
      void setPttHeldRemote(false).catch((error) => renderPhase("waiting", error.message));
      return;
    }
    shellTapVoice?.stopSession();
  });
}

function handleMicPress() {
  const mode = getVoiceInputMode();
  if (mode === "disabled" || nodes.sttEnabled?.checked === false) {
    renderPhase("disabled", "Голосовой ввод отключён");
    return;
  }
  const action = voiceModeMicAction(mode);
  if (action === "sidecar-always") {
    if (!state.sidecarConnected) {
      renderPhase("disabled", "Sidecar не запущен — npm run shell:sidecar");
      return;
    }
    hapticTap();
    const wake =
      mode === "wake_name" && state.settings?.voiceWakeName
        ? ` Wake: «${state.settings.voiceWakeName}».`
        : "";
    renderPhase("listening", `Sidecar слушает.${wake} Говорите — фраза уйдёт по паузе.`);
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
    const action = voiceModeMicAction(getVoiceInputMode());
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
    if (voiceModeMicAction(getVoiceInputMode()) !== "hold") return;
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
    if (voiceModeMicAction(getVoiceInputMode()) !== "hold" || event.button !== 0) return;
    if (performance.now() - micHoldStartedAt < 80) return;
    finishMicHold();
  });

  nodes.micBtn.addEventListener("lostpointercapture", () => {
    if (voiceModeMicAction(getVoiceInputMode()) !== "hold") return;
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
}

function setShellView(view, { scrollTo = "", settingsTab = "" } = {}) {
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
    settingsSave.syncUi();
  }
}

function bindNavigationUi() {
  nodes.settingsBtn?.addEventListener("click", () => {
    setShellView(state.view === "settings" ? "main" : "settings");
  });
  nodes.homeBrand?.addEventListener("click", () => setShellView("main"));
  document.querySelectorAll(".shell-settings-close-btn").forEach((btn) => {
    btn.addEventListener("click", () => setShellView("main"));
  });
  document.querySelectorAll(".shell-settings-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.settingsTab;
      if (tab) setSettingsTab(tab);
    });
  });
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
  populateVoiceModeSelect();
  populateRuntimeSelect();
  onRouteSettingsDirty = () => markSettingsDirty("route");

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
  const markRouteDirty = () => markSettingsDirty("route");
  const markTtsDirty = () => markSettingsDirty("tts");
  const markSttDirty = () => markSettingsDirty("stt");
  const markProactiveDirty = () => markSettingsDirty("proactive");

  nodes.routeSave?.addEventListener("mousedown", () => markSettingsDirty("route"));
  nodes.routeSave?.addEventListener("click", () => {
    void saveSettingsSection("route").catch((error) => renderPhase("waiting", error.message));
  });
  nodes.proactiveSave?.addEventListener("mousedown", () => markSettingsDirty("proactive"));
  nodes.proactiveSave?.addEventListener("click", () => {
    void saveSettingsSection("proactive").catch((error) => renderPhase("waiting", error.message));
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

  nodes.compactAction?.addEventListener("click", () => {
    toggleCompactMode();
  });

  initCompactSensor();

  nodes.messageTarget?.addEventListener("change", () => {
    syncRuntimeSelects("header");
    updateRuntimeUi();
    void persistMessageTarget(nodes.messageTarget.value);
  });
  nodes.routeRuntime?.addEventListener("change", () => {
    syncRuntimeSelects("route");
    updateRuntimeUi();
    void persistMessageTarget(nodes.routeRuntime.value);
  });
  nodes.qwenpawUrl.addEventListener("change", () => {
    markRouteDirty();
    void loadQwenPawAgents(nodes.qwenpawAgentId?.value);
  });
  nodes.qwenpawOpenUrl?.addEventListener("click", openQwenPawInBrowser);
  nodes.qwenpawAgentId.addEventListener("change", markRouteDirty);
  for (const input of [
    nodes.bridgeUrl,
    nodes.bridgeApiKey,
    nodes.bridgeModel,
    nodes.bridgeProfile,
    nodes.bridgeAgentId,
    nodes.bridgeSessionId
  ]) {
    input?.addEventListener("change", markRouteDirty);
  }
  nodes.ttsEnabled?.addEventListener("change", () => {
    const enabled = nodes.ttsEnabled.checked;
    if (state.settings) state.settings.ttsEnabled = enabled;
    if (!enabled) stopBrowserTts({ notifyServer: true });
    void persistTtsEnabled(enabled);
  });
  nodes.ttsPlaybackModeGroup?.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.name !== "shell-tts-playback-mode") return;
    const mode = input.value === "reading" ? "reading" : "dialog";
    if (state.settings) state.settings.ttsPlaybackMode = mode;
    updateTtsPlaybackHint(mode);
    void persistTtsPlaybackMode(mode);
  });
  nodes.sttEnabled?.addEventListener("change", () => {
    void persistSttEnabled(nodes.sttEnabled.checked);
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
    updateVoiceModeSelectUi();
    updateSttEngineNote();
    markSttDirty();
  });
  nodes.voiceGlobalListen?.addEventListener("change", () => {
    if (state.settings) state.settings.voiceGlobalListen = nodes.voiceGlobalListen.checked;
    updateVoiceModeSelectUi();
    updateSttEngineNote();
    syncCompactSensorAvailability();
    markSttDirty();
  });
  nodes.voiceToCompose?.addEventListener("change", () => {
    const on = Boolean(nodes.voiceToCompose.checked);
    if (state.settings) state.settings.voiceToCompose = on;
    updateVoiceToComposeUi();
    void saveSettings({ voiceToCompose: on }).catch(() => {});
  });
  nodes.voiceWakeName?.addEventListener("input", markSttDirty);
  nodes.voiceWakeName?.addEventListener("change", markSttDirty);
  if (nodes.voiceConfirm) {
    nodes.voiceConfirm.checked = readVoiceConfirmSetting();
    nodes.voiceConfirm.addEventListener("change", () => {
      writeVoiceConfirmSetting(nodes.voiceConfirm.checked);
    });
  }
  nodes.proactiveToggle?.addEventListener("click", () => {
    const btn = nodes.proactiveToggle;
    btn?.classList.add("is-busy");
    void shellProactive
      ?.toggleEnabled()
      .then((enabled) => {
        renderPhase("waiting", enabled ? "Проактивность включена" : "Проактивность выключена");
      })
      .catch((error) => renderPhase("waiting", error.message))
      .finally(() => btn?.classList.remove("is-busy"));
  });
  preventDetailsToggleOnControl(nodes.ttsPlaybackModeGroup);
  preventDetailsToggleOnControl(nodes.ttsPlaybackHint);
  preventDetailsToggleOnControl(nodes.ttsEnabled);
  preventDetailsToggleOnControl(nodes.ttsEnabled?.closest("label"));
  nodes.heroDemoBar?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-hero-demo]");
    if (!btn) return;
    applyHeroStatusDemo(btn.dataset.heroDemo);
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
  nodes.proactivePromptInsert?.addEventListener("click", (event) => {
    event.preventDefault();
    insertProactivePromptTemplate();
  });
  for (const el of [
    nodes.proactiveEnabled,
    nodes.proactiveIdleSeconds,
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
    shellProactive?.syncSettings({
      ...(state.settings || {}),
      ...collectProactiveFormPatch()
    });
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
  nodes.ttsSave?.addEventListener("mousedown", () => {
    markSettingsDirty("tts");
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

  nodes.openCmsBtn.addEventListener("click", () => {
    const url = state.agentId ? `/${encodeURIComponent(state.agentId)}/` : "/";
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

  updateTtsControlsUi();
  updateTtsDownloadUi();
}

async function boot() {
  setComposeExpanded(false);
  populateVoiceModeSelect();
  populateRuntimeSelect();
  if (window.agentAppLock?.whenUnlocked) {
    await window.agentAppLock.whenUnlocked();
  }
  cleanShellUrl();
  bindShellAgentGateUi();
  bindHeaderContextUi();
  await ensureShellAgentSelected();
  await populateHeaderAgentSelect();
  renderHeaderHostChip();
  migrateShellStorageFromMobile();
  if (shellEmbedMode) {
    document.body.classList.add("shell-embed");
  }
  initShellSurface({ onSurface: renderHeaderHostChip });
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
  initShellHints();
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
  syncAgentSelects();
  ttsPlayer = createShellTtsPlayer({ apiFetch, getTtsSettings: collectTtsRuntimeSettings });
  ttsTabCoordinator = createShellTtsTabCoordinator({
    onYieldSpeech: (reason) => yieldLocalTtsPlayback(reason)
  });
  bindUi();
  bindNavigationUi();
  setSettingsTab(state.settingsTab || "route");
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
  window.addEventListener("online", syncDialogConnectionState);
  window.addEventListener("offline", syncDialogConnectionState);
  syncDialogConnectionState();
  void initBatteryMonitor();
  void initShellCharacter(nodes.characterStage, nodes.agentAvatar);
  try {
    await resolveShellAgent();
    shellPresenceController?.stop();
    shellPresenceController = initShellPresence({
      agentId: state.agentId,
      apiFetch,
      getMicActive: () => Boolean(state.micActive || state.micTapHeld || state.pttHeld),
      getPttHeld: () => Boolean(state.pttHeld)
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
    await refreshStatus();
    if (state.messagePipelineBusy && !isTtsPlaybackActive() && (state.shellState?.phase || "waiting") === "waiting") {
      releaseMessagePipeline();
    }
    await loadComposeDraft();
    commitAllSettingsBaselines();
    void loadQwenPawAgents();
    connectStream();
    initShellProactiveController();
  } catch (error) {
    renderPhase("waiting", error.message);
  }
}

void boot().catch((error) => {
  const msg = String(error?.message || error || "Ошибка загрузки Shell");
  console.error("[shell boot]", error);
  try {
    renderPhase("waiting", msg);
  } catch {
    const el = document.getElementById("shell-phase-phrase");
    if (el) el.textContent = msg;
  }
});
