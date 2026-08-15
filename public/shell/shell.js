import { loadAgentSelectData, getSelectableAgents } from "/shared/agent-select.js";
import { createTopicPicker } from "/shell/topic-picker.js";
import { createSettingsSaveController } from "/shell/shell-settings-save.js?v=1";
import { parseShellReply, renderShellReplyMedia, prepareSpeechText, pullSpeechSentences, parseDualReply, extractStreamingTtsBody, stripAllTtsBlocks } from "/shell/shell-reply.js?v=12";
import { renderShellReplyMarkdown, renderShellReplyBody } from "/shell/shell-markdown.js?v=6";
import { initShellCharacter } from "/shell/shell-character.js?v=18";
import { createShellCamera } from "/shell/shell-camera.js?v=2";
import { createShellScreen } from "/shell/shell-screen.js?v=1";
import { createShellTtsTabCoordinator } from "/shell/shell-tts-tab.js?v=1";
import { createShellTtsPlayer } from "/shell/shell-tts-player.js?v=2";
import { getShellClientId } from "/shell/shell-client-id.js?v=1";

const SERVER_TTS_ENGINES = new Set(["say", "edge", "piper", "elevenlabs"]);

/** Озвучка только после полного ответа агента (без streaming TTS по предложениям). */
const TTS_WAIT_FOR_COMPLETE_REPLY = true;

const DEFAULT_TTS_PROMPT = `Сформируй ответ в следующем формате. В начале ответа добавь блок [tts], в котором сформируй краткую версию текста для озвучки (предполагается, что ты работаешь в режиме голосового ассистента). Убери emoji, markdown и подробные детали, оставь только смысл и другие незначительные детали которые можно воспроизвести через TTS (text to speech). Закрой блок [/tts].

Далее — полный текст ответа для экрана.`;

const DEFAULT_STT_PROMPT = `Исправь пунктуацию и регистр, убери слова-паразиты («э-э», «эээ», «мм», «ну»), сохрани смысл. Верни только готовый текст для отправки агенту — без пояснений и обёрток.`;

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

const SHELL_AGENT_KEY = "agentcms.shellAgent.v1";
const COMPOSE_DRAFT_SAVE_MS = 700;

let composeDraftSavedText = null;
let composeDraftSaveTimer = null;
let composeDraftSaveInFlight = null;
let composeDraftExpanded = false;

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
const outboundQueue = [];

const state = {
  agentId: localStorage.getItem(SHELL_AGENT_KEY) || "",
  settings: null,
  windowSettings: null,
  shellState: null,
  eventSource: null,
  recognition: null,
  speaking: false,
  ttsPaused: false,
  micActive: false,
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
  return state.settings?.ttsEngine || "browser";
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

/** Озвучивать только на том устройстве, с которого отправили вопрос. */
function shouldPlayReplyTts(meta = {}) {
  if (!state.settings?.ttsEnabled) return false;
  if (state.messageStopped) return false;
  if (document.visibilityState !== "visible") return false;

  const target = String(meta.ttsClientId || "").trim();
  const mine = getShellClientId();
  const pending = String(state.pendingReplyTtsClientId || "").trim();

  if (target) {
    if (target !== mine) return false;
    ttsTabCoordinator?.claimLeader({ force: true });
    return true;
  }
  if (pending && pending === mine) {
    ttsTabCoordinator?.claimLeader({ force: true });
    return true;
  }
  return isLocalMessagePipelineActive() && canPlayTts();
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

  if ((mode === "fn_button" || mode === "browser") && state.recognition) {
    try {
      state.recognition.start();
    } catch {
      // already started
    }
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

  if ((mode === "fn_button" || mode === "browser") && state.recognition && state.micActive) {
    state.recognition.stop();
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
  ttsEngineFields: document.getElementById("shell-tts-engine-fields"),
  ttsEdgeVoice: document.getElementById("shell-tts-edge-voice"),
  ttsPiperModel: document.getElementById("shell-tts-piper-model"),
  ttsPiperBinary: document.getElementById("shell-tts-piper-binary"),
  ttsElevenlabsKey: document.getElementById("shell-tts-elevenlabs-key"),
  ttsElevenlabsVoiceId: document.getElementById("shell-tts-elevenlabs-voice-id"),
  ttsCapabilitiesNote: document.getElementById("shell-tts-capabilities-note"),
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
  ttsControls: document.getElementById("shell-tts-controls"),
  ttsPauseBtn: document.getElementById("shell-tts-pause"),
  ttsResumeBtn: document.getElementById("shell-tts-resume"),
  ttsStopBtn: document.getElementById("shell-tts-stop"),
  voiceWave: document.getElementById("shell-voice-wave"),
  settingsBtn: document.getElementById("shell-settings-btn"),
  windowSave: document.getElementById("shell-window-save"),
  routeSave: document.getElementById("shell-route-save"),
  ttsSave: document.getElementById("shell-tts-save"),
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
  composePanel: document.getElementById("shell-compose-panel"),
  messageQueue: document.getElementById("shell-message-queue"),
  messageQueueActive: document.getElementById("shell-message-queue-active"),
  messageQueueActiveText: document.getElementById("shell-message-queue-active-text"),
  messageQueueCount: document.getElementById("shell-message-queue-count"),
  messageQueueList: document.getElementById("shell-message-queue-list"),
  routeToggle: document.getElementById("shell-route-toggle"),
  routePanel: document.getElementById("shell-route-panel"),
  watchCamera: document.getElementById("shell-watch-camera"),
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
  const response = await fetch(apiUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || `HTTP ${response.status}`);
  }
  return data;
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
  if (state.micActive || state.pttHeld) return "listening";
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
  const displayPhase = resolveDisplayPhase(phase);
  if (!state.ttsPaused) {
    nodes.phaseLabel.textContent = PHASE_LABELS[displayPhase];
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

function shouldSkipAssistantSpeech(message, body) {
  if (lastHandledStreamId && String(message?.streamId || "") === lastHandledStreamId) return true;
  if (lastStreamHandledBody && lastStreamHandledBody === body) return true;
  return false;
}

function beginAssistantStream({ streamId } = {}) {
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
  nodes.lastReply?.scrollTo?.({ top: nodes.lastReply.scrollHeight, behavior: "auto" });
}

function prepareTtsStreamChunk(text) {
  let speech = String(text || "").trim();
  if (!speech) return "";
  if (state.settings?.ttsStripEmoji !== false) {
    speech = speech.replace(/\p{Extended_Pictographic}/gu, " ").replace(/\s+/g, " ").trim();
  }
  return speech;
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

  if (isBrowserTtsEngine()) {
    await speakBrowserChunk(payload);
  } else if (isServerTtsEngine() && ttsPlayer) {
    try {
      await ttsPlayer.speak(payload);
    } catch (serverError) {
      const synth = getSpeechSynth();
      if (!synth) return;
      console.warn("[shell] stream server TTS failed, fallback to browser:", serverError?.message || serverError);
      await speakBrowserChunk(payload);
    }
  }

  if (!state.streamTtsQueue.length) {
    state.speaking = false;
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
  renderShellReply({ ...message, body, spokenText, spokenParts });
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
      void speakTextParts(parts, { ttsClientId: message.ttsClientId }).finally(() => {
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
    releaseMessagePipeline();
  }
  return true;
}

function releaseMessagePipeline() {
  state.messagePipelineBusy = false;
  state.processingMessage = "";
  clearPendingReplyTtsClientId();
  renderMessageQueue();
  updateSendButtonLabel();
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
  renderStreamingAssistantText(displayText);
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
    localStorage.setItem(SHELL_AGENT_KEY, embedAgent);
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

function applyStatusPayload(payload) {
  if (payload?.settings) applySettings(payload.settings);
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
  state.sidecarConnected = Boolean(payload?.sidecarConnected);
  updateFnPttHint();
  state.qwenpawServerOk = Boolean(payload?.qwenpaw?.serverOk);
  state.qwenpawAgentOk = Boolean(payload?.qwenpaw?.agentOk);
  state.qwenpawAgentName = String(payload?.qwenpaw?.agentName || "");
  state.qwenpawAgentError = String(payload?.qwenpaw?.agentError || "");
  state.qwenpawConnected = Boolean(payload?.qwenpaw?.ok);
  renderHeroLinkChip();
  updateQwenPawChatUi(payload);
  if (payload?.latestAgentMessage?.body) {
    const streaming = state.assistantStream && !state.assistantStream.finalized;
    if (!streaming) renderShellReply(payload.latestAgentMessage);
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
    localStorage.setItem(SHELL_AGENT_KEY, nextId);
  }
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
  nodes.composeExpandToggle
    ?.querySelector(".shell-compose-expand-icon")
    ?.classList.toggle("hidden", composeDraftExpanded);
  nodes.composeExpandToggle
    ?.querySelector(".shell-compose-collapse-icon")
    ?.classList.toggle("hidden", !composeDraftExpanded);
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
      releaseMessagePipeline();
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
  nodes.ttsPrompt.value = DEFAULT_TTS_PROMPT;
  state.settings = { ...(state.settings || {}), ttsPrompt: DEFAULT_TTS_PROMPT };
  markSettingsDirty("tts");
}

function insertSttPromptTemplate() {
  if (!nodes.sttPrompt) return;
  nodes.sttPrompt.value = DEFAULT_STT_PROMPT;
  state.settings = { ...(state.settings || {}), sttPrompt: DEFAULT_STT_PROMPT };
  markSettingsDirty("stt");
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
  const settings = state.settings || {};
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
    if (state.recognition && state.micActive) {
      try {
        state.recognition.stop();
      } catch {
        // ignore
      }
    }
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
    const engines = data?.engines || {};
    const engine = getTtsEngine();
    const current = engines[engine];
    if (nodes.ttsCapabilitiesNote) {
      if (current?.available === false) {
        nodes.ttsCapabilitiesNote.textContent = current.hint || "Движок недоступен на этом устройстве";
        nodes.ttsCapabilitiesNote.classList.remove("hidden");
      } else if (current?.hint) {
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
  if (nodes.ttsElevenlabsKey) nodes.ttsElevenlabsKey.value = settings.ttsElevenlabsApiKey || "";
  if (nodes.ttsElevenlabsVoiceId) nodes.ttsElevenlabsVoiceId.value = settings.ttsElevenlabsVoiceId || "";
  updateTtsRateLabel();
  if (nodes.ttsVoice && settings.ttsVoice) nodes.ttsVoice.value = settings.ttsVoice;
  void refreshTtsEngineVoices(settings.ttsEngine === "sidecar" ? "say" : settings.ttsEngine || "browser");
  void loadTtsCapabilities();
}

function collectOutboundMessageSettings() {
  const ttsEnabled = nodes.ttsEnabled?.checked !== false;
  return {
    ttsEnabled,
    ttsPrompt: nodes.ttsPrompt?.value ?? ""
  };
}

function collectTtsFormPatch() {
  return {
    ttsPrompt: nodes.ttsPrompt?.value || "",
    ttsEngine: nodes.ttsEngine?.value || "browser",
    ttsLang: nodes.ttsLang?.value || "ru-RU",
    ttsVoice: nodes.ttsVoice?.value || "",
    ttsEdgeVoice: nodes.ttsEdgeVoice?.value || "ru-RU-SvetlanaNeural",
    ttsElevenlabsApiKey: nodes.ttsElevenlabsKey?.value || "",
    ttsElevenlabsVoiceId: nodes.ttsElevenlabsVoiceId?.value || "",
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

async function speakBrowserChunk(text) {
  const synth = getSpeechSynth();
  if (!synth) throw new Error("Web Speech недоступен в этом браузере");
  await new Promise((resolve, reject) => {
    const utterance = createSpeechUtterance(text);
    utterance.onend = () => resolve();
    utterance.onerror = (event) => reject(new Error(event?.error || "speech-error"));
    synth.speak(utterance);
  });
}

async function speakOneChunk(text) {
  const payload = String(text || "").trim();
  if (!payload) return;
  if (isBrowserTtsEngine()) {
    await speakBrowserChunk(payload);
  } else if (isServerTtsEngine() && ttsPlayer) {
    try {
      await ttsPlayer.speak(payload);
    } catch (serverError) {
      const synth = getSpeechSynth();
      if (!synth) throw serverError;
      console.warn("[shell] server TTS failed, fallback to browser:", serverError?.message || serverError);
      await speakBrowserChunk(payload);
    }
  }
}

async function speakTextParts(parts, { ttsClientId } = {}) {
  const list = (Array.isArray(parts) ? parts : [parts])
    .map((part) => String(part || "").trim())
    .filter(Boolean);
  if (!list.length) return;
  if (!state.settings?.ttsEnabled) return;
  if (state.messageStopped) return;
  if (!shouldPlayReplyTts({ ttsClientId })) {
    releaseMessagePipeline();
    renderPhase(state.shellState?.phase || "waiting", `Готов к сообщению${queuePhraseSuffix()}`, state.shellState?.metrics || "");
    return;
  }

  const seq = bumpTtsPlayback();
  stopBrowserTts({ notifyServer: false, resetPhase: false, broadcast: false, bumpPlayback: false });
  state.speaking = true;
  state.ttsPaused = false;
  updateTtsControlsUi("speaking");

  try {
    for (let i = 0; i < list.length; i++) {
      if (!isTtsPlaybackCurrent(seq)) break;
      const label =
        list.length > 1 ? `Озвучиваю ${i + 1}/${list.length}…` : "Озвучиваю ответ…";
      await patchShellState({ phase: "speaking", phrase: label });
      await speakOneChunk(list[i]);
      if (!isTtsPlaybackCurrent(seq)) break;
    }
  } catch (error) {
    if (!isTtsPlaybackCurrent(seq)) return;
    const msg = String(error?.message || "Ошибка озвучки");
    renderPhase("waiting", msg.includes("No audio") ? "Edge TTS недоступен — выберите say или browser" : msg);
  }

  if (!isTtsPlaybackCurrent(seq)) {
    state.speaking = false;
    state.ttsPaused = false;
    updateTtsControlsUi("waiting");
    clearPendingReplyTtsClientId();
    return;
  }

  state.speaking = false;
  state.ttsPaused = false;
  updateTtsControlsUi("waiting");
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
  const messageId = resolveAssistantMessageKey(message, body);
  const stream = state.assistantStream;

  if (
    stream?.finalized &&
    (stream.id === message?.streamId || stream.id === messageId || stream.text === body)
  ) {
    markAssistantReplyHandled(message, body, { streamTts: true });
    return;
  }

  if (messageId && messageId === lastHandledAssistantId) return;
  if (lastHandledStreamId && String(message?.streamId || "") === lastHandledStreamId) {
    if (!nodes.lastReplyText?.textContent || nodes.lastReplyText.textContent === "…" || nodes.lastReplyText.textContent === "—") {
      renderShellReply(message);
    }
    return;
  }
  if (lastStreamHandledBody && lastStreamHandledBody === body) {
    if (!nodes.lastReplyText?.textContent || nodes.lastReplyText.textContent === "…" || nodes.lastReplyText.textContent === "—") {
      renderShellReply(message);
    }
    return;
  }

  if (stream && !stream.finalized) {
    finalizeAssistantStream(message);
    return;
  }

  markAssistantReplyHandled(message, body);
  renderShellReply(message);
  const phase = state.shellState?.phase || "waiting";
  if (phase === "waiting" && !state.pttHeld && !state.micActive && !state.speaking) {
    renderPhase(phase, "Готов к сообщению", state.shellState?.metrics || "");
  }
  if (state.settings?.ttsEnabled && !shouldSkipAssistantSpeech(message, body)) {
    const parts = buildSpeechParts(body, message);
    if (!parts.length) {
      releaseMessagePipeline();
      return;
    }
    const speechKey = parts.join("\0");
    if (speechKey === lastSpokenBody && state.speaking) {
      releaseMessagePipeline();
      return;
    }
    lastSpokenBody = speechKey;
    await speakTextParts(parts, { ttsClientId: message.ttsClientId });
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
    return;
  }

  const source = new EventSource(apiUrl("/api/shell/stream"));
  state.eventSource = source;
  source.onopen = () => renderHeroLinkChip();
  source.onerror = () => renderHeroLinkChip();

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
        renderPhase(nextState.phase, nextState.phrase, nextState.metrics);
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

function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    nodes.micBtn.disabled = true;
    nodes.micBtn.title = "SpeechRecognition недоступен в этом браузере";
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = state.settings?.sttLang || nodes.sttLang?.value || "ru-RU";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  state.recognition = recognition;

  recognition.onstart = () => {
    state.micActive = true;
    setMicButtonState("Стоп", { active: true });
    void patchShellState({ phase: "listening", phrase: "Говорите…" });
  };

  recognition.onend = () => {
    if (state.pttKeyboardHeld && isFnButtonMode() && !state.sidecarConnected && state.recognition) {
      try {
        state.recognition.start();
      } catch {
        // ignore restart race
      }
      return;
    }
    state.micActive = false;
    setMicButtonState("Говорить");
    if (!state.speaking) void patchShellState({ phase: "waiting", phrase: "Готов к сообщению" });
  };

  recognition.onerror = (event) => {
    renderPhase("waiting", event.error || "Ошибка распознавания");
  };

  recognition.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript || "";
    if (text) {
      nodes.message.value = text;
      void (async () => {
        if (state.settings?.cameraOnSpeech && shellCamera.isActive()) {
          await uploadCameraSnapshot("speech").catch(() => {});
        }
        if (state.settings?.screenOnSpeech && shellScreen.isActive()) {
          await uploadScreenSnapshot("speech").catch(() => {});
        }
        await sendMessage(text, { fromCompose: false, voice: true });
      })();
    }
  };
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
  if (!state.recognition) return;
  if (state.micActive) {
    state.recognition.stop();
    return;
  }
  state.recognition.start();
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
    void saveSettingsSection("tts").catch((error) => renderPhase("waiting", error.message));
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
  nodes.ttsSettingsToggle?.addEventListener("click", () => {
    const open = nodes.ttsSettingsPanel?.classList.contains("hidden");
    setTtsSettingsOpen(open);
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
  nodes.ttsElevenlabsKey?.addEventListener("blur", markTtsDirty);
  nodes.ttsElevenlabsVoiceId?.addEventListener("blur", markTtsDirty);
  nodes.ttsRate?.addEventListener("input", () => {
    updateTtsRateLabel();
    markTtsDirty();
  });
  nodes.ttsEngine?.addEventListener("change", () => {
    void refreshTtsEngineVoices(nodes.ttsEngine.value);
    void loadTtsCapabilities();
    markTtsDirty();
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
    updateVoiceModeSelectUi(mode);
    void persistVoiceInputMode(mode);
  });

  nodes.sendBtn.addEventListener("click", () => void sendMessage(nodes.message.value));
  nodes.sendStopBtn?.addEventListener("click", () => void stopActiveMessage());
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
  if (shellEmbedMode) {
    document.body.classList.add("shell-embed");
  }
  ttsPlayer = createShellTtsPlayer({ apiFetch });
  ttsTabCoordinator = createShellTtsTabCoordinator({
    onYieldSpeech: (reason) => yieldLocalTtsPlayback(reason)
  });
  bindUi();
  bindNavigationUi();
  bindWindowSettingsUi();
  setupSpeechRecognition();
  setupPttKeyboard();
  startClock();
  window.addEventListener("online", renderHeroLinkChip);
  window.addEventListener("offline", renderHeroLinkChip);
  renderHeroLinkChip();
  void initBatteryMonitor();
  void initShellCharacter(nodes.characterStage, nodes.agentAvatar);
  try {
    await resolveShellAgent();
    await topicPicker.refresh();
    await loadWindowSettings();
    if (shellEmbedMode) {
      applyWindowSettings({
        ...(state.windowSettings || {}),
        windowCompact: true,
        windowBackground: "dark",
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
