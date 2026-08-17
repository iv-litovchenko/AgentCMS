import { prepareSpeechText, splitReplyDisplayParts, cleanReplyTextSegment, parseDualReply } from "/shell/shell-reply.js?v=12";
import { renderShellReplyBody } from "/shell/shell-markdown.js?v=5";
import { shellPhaseLabel, shellRouteLabel } from "/shell/shell-contract.js?v=1";
import { ShellClient } from "/shell/shell-client.js?v=4";
import { getShellClientId } from "/shell/shell-client-id.js?v=1";
import { initShellSurfaceSwitcher, renderShellSurfaceSwitcherMarkup } from "/shell/shell-surface.js?v=2";
import { createMobileTtsPlayer } from "/shell/mobile/mobile-tts.js?v=5";
import { initMobileCharacter, setMobileCharacterPhase } from "/shell/mobile/mobile-character.js?v=1";
import {
  applyCharacterBackdrop,
  readStoredCharacterBackdrop,
  saveCharacterBackdrop
} from "/shell/mobile/mobile-background.js?v=2";
import { initMobileDeviceChips } from "/shell/mobile/mobile-device-chips.js?v=3";
import { initMobilePermissions, warmUpMicrophone, mobilePermissionIssue, getMobileHttpsUrl } from "/shell/mobile/mobile-permissions.js?v=2";
import { loadAgentSelectData, populateAgentSelect, getSelectableAgents } from "/shared/agent-select.js";
import { unlockMobileAudio, isIosDevice } from "/shell/mobile/mobile-audio-unlock.js?v=3";
import { speakBrowserTts } from "/shell/mobile/mobile-browser-tts.js?v=3";

const AGENT_KEY = "agentcms.shellAgent.mobile.v1";
const VOICE_CONFIRM_KEY = "agentcms.shellMobile.voiceConfirm.v1";
const INSTALL_DISMISS_KEY = "agentcms.shellMobile.installDismiss.v1";
const HISTORY_KEY = "agentcms.shellMobile.history.v1";
const CHAT_COLLAPSE_KEY = "agentcms.shellMobile.chatCollapsed.v1";
const MAX_HISTORY = 12;
const MIC_HINT_IDLE = "Нажмите микрофон — запись";
const MIC_HINT_ACTIVE = "Нажмите ещё раз — стоп";
const SERVER_TTS_ENGINES = new Set(["say", "edge", "piper", "elevenlabs"]);

function isMobileEmbedMode() {
  try {
    return new URLSearchParams(window.location.search).get("embed") === "1";
  } catch {
    return false;
  }
}

const mobileEmbedMode = isMobileEmbedMode();

const state = {
  agentId: localStorage.getItem(AGENT_KEY) || "",
  agentLabel: "",
  shellSettings: null,
  ttsEnabled: true,
  sttEnabled: true,
  ttsEngine: "browser",
  pendingReplyClientId: "",
  lastSpokenForMessageId: "",
  speakInFlightId: "",
  speakMutex: null,
  spokenReplyIds: new Set(),
  displayedReplyIds: new Set(),
  voiceConfirm: localStorage.getItem(VOICE_CONFIRM_KEY) !== "0",
  characterBackdrop: readStoredCharacterBackdrop(),
  client: null,
  serverTts: null,
  recognition: null,
  micHeld: false,
  isSending: false,
  sendAbort: null,
  streamBuffer: "",
  lastReplyRaw: "",
  lastAskRaw: "",
  lastSpoken: "",
  lastMessageId: "",
  agentsLoaded: false,
  agentOptions: { agents: [], groups: [], defaultAgentId: "" },
  wakeLock: null,
  history: [],
  chatCollapsed: false,
  pullStartY: 0,
  pullActive: false,
  isStreaming: false,
  streamUiLocked: false
};

let streamRenderTimer = 0;
let pendingStreamText = "";
const STREAM_RENDER_MS = 240;

const nodes = {
  appRoot: document.getElementById("mobile-app-root"),
  pullHint: document.getElementById("mobile-pull-hint"),
  installBanner: document.getElementById("mobile-install-banner"),
  installDismiss: document.getElementById("mobile-install-dismiss"),
  permissionBanner: document.getElementById("mobile-permission-banner"),
  statusDot: document.getElementById("mobile-status-dot"),
  agent: document.getElementById("mobile-agent"),
  route: document.getElementById("mobile-route"),
  server: document.getElementById("mobile-server"),
  clock: document.getElementById("mobile-clock"),
  battery: document.getElementById("mobile-battery"),
  orient: document.getElementById("mobile-orient"),
  orientValue: document.getElementById("mobile-orient-value"),
  phase: document.getElementById("mobile-phase"),
  phaseLabel: document.getElementById("mobile-phase-label"),
  phrase: document.getElementById("mobile-phrase"),
  mic: document.getElementById("mobile-mic"),
  micHint: document.getElementById("mobile-mic-hint"),
  stopTts: document.getElementById("mobile-stop-tts"),
  cancelSend: document.getElementById("mobile-cancel-send"),
  chat: document.getElementById("mobile-chat"),
  chatCollapse: document.getElementById("mobile-chat-collapse"),
  chatCollapseHint: document.getElementById("mobile-chat-collapse-hint"),
  chatScroll: document.getElementById("mobile-chat-scroll"),
  lastAskWrap: document.getElementById("mobile-last-ask-wrap"),
  lastAsk: document.getElementById("mobile-last-ask"),
  reply: document.getElementById("mobile-reply"),
  copyReply: document.getElementById("mobile-copy-reply"),
  shareReply: document.getElementById("mobile-share-reply"),
  historyOpen: document.getElementById("mobile-history-open"),
  historyClose: document.getElementById("mobile-history-close"),
  historyDialog: document.getElementById("mobile-history-dialog"),
  historyCount: document.getElementById("mobile-history-count"),
  historyList: document.getElementById("mobile-history-list"),
  compose: document.getElementById("mobile-compose"),
  dock: document.getElementById("mobile-dock"),
  input: document.getElementById("mobile-input"),
  sendBtn: document.getElementById("mobile-send-btn"),
  error: document.getElementById("mobile-error"),
  helpBtn: document.getElementById("mobile-help-btn"),
  reconnectBtn: document.getElementById("mobile-reconnect-btn"),
  settingsBtn: document.getElementById("mobile-settings-btn"),
  settingsDialog: document.getElementById("mobile-settings-dialog"),
  settingsForm: document.getElementById("mobile-settings-form"),
  settingsCancel: document.getElementById("mobile-settings-cancel"),
  agentSelect: document.getElementById("mobile-agent-select"),
  ttsEnabled: document.getElementById("mobile-tts-enabled"),
  sttEnabled: document.getElementById("mobile-stt-enabled"),
  ttsEngineNote: document.getElementById("mobile-tts-engine-note"),
  sttLangNote: document.getElementById("mobile-stt-lang-note"),
  voiceConfirm: document.getElementById("mobile-voice-confirm"),
  characterBackdrop: document.getElementById("mobile-character-backdrop"),
  helpUrl: document.getElementById("mobile-help-url"),
  helpDialog: document.getElementById("mobile-help-dialog"),
  helpClose: document.getElementById("mobile-help-close"),
  micDialog: document.getElementById("mobile-mic-dialog"),
  micClose: document.getElementById("mobile-mic-close"),
  micHelpLink: document.getElementById("mobile-mic-help-link"),
  voiceConfirmDialog: document.getElementById("mobile-voice-confirm-dialog"),
  voiceConfirmForm: document.getElementById("mobile-voice-confirm-form"),
  voiceConfirmText: document.getElementById("mobile-voice-confirm-text"),
  voiceRetry: document.getElementById("mobile-voice-retry"),
  voiceCancel: document.getElementById("mobile-voice-cancel")
};

function isStandalonePwa() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function setStatusDot(connState) {
  if (!nodes.statusDot) return;
  nodes.statusDot.dataset.state = connState === "live" ? "live" : connState === "error" ? "error" : "offline";
}

function setError(message, { hint = "" } = {}) {
  if (!message) {
    nodes.error.classList.add("hidden");
    nodes.error.textContent = "";
    return;
  }
  nodes.error.textContent = hint ? `${message} — ${hint}` : message;
  nodes.error.classList.remove("hidden");
}

function connectionHint(error) {
  const msg = String(error?.message || error || "").toLowerCase();
  if (msg.includes("failed") || msg.includes("network") || msg.includes("load") || msg.includes("abort")) {
    return "Mac и iPhone в одной Wi‑Fi? CMS: HOST=0.0.0.0 npm start";
  }
  if (msg.includes("404")) return "Перезапустите CMS после обновления";
  return "";
}

function setStreamUiLocked(locked) {
  state.streamUiLocked = Boolean(locked);
  document.body.classList.toggle("mobile-session-active", state.streamUiLocked);
}

function releaseSessionUiLock() {
  if (state.isSending || state.isStreaming || state.speakInFlightId) return;
  setStreamUiLocked(false);
}

function updateChatCollapseHint() {
  if (!nodes.chatCollapseHint) return;
  const preview = formatHistoryPreview(state.lastReplyRaw);
  const hasPreview = preview && preview !== "—";
  if (state.chatCollapsed && hasPreview) {
    nodes.chatCollapseHint.textContent = preview;
    nodes.chatCollapseHint.classList.remove("hidden");
    if (nodes.chatCollapse) {
      nodes.chatCollapse.title = preview;
    }
  } else {
    nodes.chatCollapseHint.textContent = "";
    nodes.chatCollapseHint.classList.add("hidden");
    if (nodes.chatCollapse) {
      nodes.chatCollapse.title = state.chatCollapsed ? "Развернуть диалог" : "Свернуть диалог";
    }
  }
}

function setChatCollapsed(collapsed) {
  state.chatCollapsed = Boolean(collapsed);
  nodes.chat?.setAttribute("data-collapsed", state.chatCollapsed ? "1" : "0");
  nodes.appRoot?.classList.toggle("mobile-chat-collapsed", state.chatCollapsed);
  nodes.chatCollapse?.setAttribute("aria-expanded", state.chatCollapsed ? "false" : "true");
  nodes.chatCollapse?.setAttribute(
    "aria-label",
    state.chatCollapsed ? "Развернуть диалог" : "Свернуть диалог"
  );
  localStorage.setItem(CHAT_COLLAPSE_KEY, state.chatCollapsed ? "1" : "0");
  updateChatCollapseHint();
}

function bindChatCollapse() {
  setChatCollapsed(localStorage.getItem(CHAT_COLLAPSE_KEY) === "1");
  nodes.chatCollapse?.addEventListener("click", () => {
    setChatCollapsed(!state.chatCollapsed);
  });
}

function renderPhase(phase, phrase = "") {
  const key = phase || "waiting";
  if (state.streamUiLocked && key !== "thinking" && key !== "speaking" && key !== "listening") {
    return;
  }
  if (state.streamUiLocked && key === nodes.phase.dataset.phase) {
    return;
  }
  nodes.phase.dataset.phase = key;
  nodes.phaseLabel.textContent = shellPhaseLabel(key);
  const showPhrase = !state.isStreaming && !state.isSending;
  nodes.phrase.textContent = showPhrase ? String(phrase || "") : "";
  if (!state.streamUiLocked || key === "thinking" || key === "speaking" || key === "listening") {
    setMobileCharacterPhase(key);
  }
}

function flushStreamingReply() {
  if (streamRenderTimer) {
    clearTimeout(streamRenderTimer);
    streamRenderTimer = 0;
  }
  if (!pendingStreamText) return;
  renderReply(pendingStreamText, { streaming: true });
}

function queueStreamingReply(text) {
  pendingStreamText = String(text || "");
  if (streamRenderTimer) return;
  streamRenderTimer = window.setTimeout(() => {
    streamRenderTimer = 0;
    renderReply(pendingStreamText, { streaming: true });
  }, STREAM_RENDER_MS);
}

function renderReply(text, { streaming = false, spokenParts = [], spokenText = "" } = {}) {
  const raw = String(text || "").trim();
  state.lastReplyRaw = raw;

  if (!raw || raw === "—") {
    nodes.copyReply.classList.add("hidden");
    nodes.shareReply.classList.add("hidden");
    nodes.reply.classList.remove("is-streaming");
    nodes.reply.dataset.replyKind = "empty";
    renderShellReplyBody(nodes.reply, "—");
    state.lastRenderedReplyKey = "";
    return;
  }

  nodes.copyReply.classList.remove("hidden");
  nodes.shareReply.classList.toggle("hidden", !navigator.share);
  nodes.reply.classList.toggle("is-streaming", streaming);
  nodes.reply.dataset.replyKind = streaming ? "stream" : "message";

  const body = raw.length > 12000 ? `${raw.slice(0, 12000)}…` : raw;
  const renderKey = `${streaming ? "s" : "f"}:${body.length}:${body.slice(-120)}`;
  if (renderKey === state.lastRenderedReplyKey) {
    updateChatCollapseHint();
    return;
  }
  state.lastRenderedReplyKey = renderKey;
  renderShellReplyBody(nodes.reply, body, { spokenParts, spokenText });
  updateChatCollapseHint();
}

function renderLastAsk(text) {
  const raw = String(text || "").trim();
  state.lastAskRaw = raw;
  if (!raw) {
    nodes.lastAskWrap?.classList.add("hidden");
    if (nodes.lastAsk) nodes.lastAsk.textContent = "";
    return;
  }
  nodes.lastAskWrap?.classList.remove("hidden");
  if (nodes.lastAsk) nodes.lastAsk.textContent = raw;
}

function renderAgentChip() {
  const label = state.agentLabel || state.agentId || "—";
  nodes.agent.textContent = label;
  nodes.agent.title = state.agentId ? `agent=${state.agentId}` : "Workspace CMS";
}

function renderRoute(messageTarget, qwenpawOk) {
  const label = shellRouteLabel(messageTarget);
  nodes.route.textContent = qwenpawOk === false && messageTarget?.startsWith("qwenpaw")
    ? `${label} · offline`
    : label;
  nodes.route.dataset.ok = qwenpawOk === false ? "0" : "1";
}

function setConnection(stateName) {
  setStatusDot(stateName);
  const host = window.location.host;
  nodes.server.textContent = host;
  const labels = {
    live: `Live · ${host}`,
    error: `Обрыв SSE · ${host}`,
    offline: "Отключено",
    connecting: `Подключение… · ${host}`
  };
  const title = labels[stateName] || labels.connecting;
  if (nodes.statusDot) {
    nodes.statusDot.title = title;
    nodes.statusDot.setAttribute("aria-label", title);
  }
}

function setSending(busy) {
  state.isSending = busy;
  nodes.sendBtn.disabled = busy;
  syncVoiceControls();
  if (!state.streamUiLocked) {
    nodes.micHint.textContent = busy ? "Думаю…" : state.sttEnabled ? MIC_HINT_IDLE : "Голосовой ввод выключен";
  }
  nodes.cancelSend?.classList.toggle("hidden", !busy);
}

function syncVoiceControls() {
  const sttOn = state.sttEnabled !== false;
  const busy = state.isSending;
  if (nodes.mic) {
    nodes.mic.disabled = !sttOn || busy;
    nodes.mic.dataset.sttDisabled = sttOn ? "0" : "1";
  }
  nodes.mic?.closest(".mobile-mic-zone")?.classList.toggle("mobile-mic-zone--disabled", !sttOn);
  if (!busy && !state.streamUiLocked && nodes.micHint) {
    nodes.micHint.textContent = sttOn ? MIC_HINT_IDLE : "Голосовой ввод выключен — Настройки ⚙️";
  }
}

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    state.history = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.history)) state.history = [];
  } catch {
    state.history = [];
  }
}

function saveHistory() {
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(state.history.slice(-MAX_HISTORY)));
}

function pushHistory(role, body) {
  const text = String(body || "").trim();
  if (!text) return;
  state.history.push({ role, body: text, at: Date.now() });
  if (state.history.length > MAX_HISTORY) {
    state.history = state.history.slice(-MAX_HISTORY);
  }
  saveHistory();
  renderHistory();
}

function formatHistoryPreview(body) {
  const parts = splitReplyDisplayParts(body);
  let text = "";
  if (parts.length) {
    text = parts
      .map((part) => (part.kind === "tts" ? part.text : cleanReplyTextSegment(part.text)))
      .filter(Boolean)
      .join(" ");
  } else {
    text = prepareSpeechText(body, { ttsIncludeCaptions: false, ttsStripEmoji: false });
  }
  const singleLine = text.replace(/\s+/g, " ").trim();
  if (singleLine.length <= 140) return singleLine;
  return `${singleLine.slice(0, 139)}…`;
}

function formatHistoryTime(at) {
  if (!at) return "";
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(at));
}

function renderHistory() {
  const items = state.history;
  if (nodes.historyCount) {
    nodes.historyCount.textContent = items.length ? String(items.length) : "";
  }
  if (!nodes.historyList) return;
  nodes.historyList.innerHTML = "";
  for (const item of [...items].reverse()) {
    const li = document.createElement("li");
    li.className = `mobile-history-item mobile-history-item--${item.role}`;

    const avatar = document.createElement("span");
    avatar.className = "mobile-history-avatar";
    avatar.textContent = item.role === "user" ? "Вы" : "AI";
    avatar.setAttribute("aria-hidden", "true");

    const bodyWrap = document.createElement("div");
    bodyWrap.className = "mobile-history-body";

    const head = document.createElement("div");
    head.className = "mobile-history-head";

    const label = document.createElement("span");
    label.className = "mobile-history-role";
    label.textContent = item.role === "user" ? "Вы" : "Агент";

    const time = document.createElement("time");
    time.className = "mobile-history-time";
    time.dateTime = item.at ? new Date(item.at).toISOString() : "";
    time.textContent = formatHistoryTime(item.at);

    const body = document.createElement("p");
    body.className = "mobile-history-text";
    body.textContent = formatHistoryPreview(item.body);

    head.append(label, time);
    bodyWrap.append(head, body);
    li.append(avatar, bodyWrap);
    nodes.historyList.append(li);
  }
  nodes.historyOpen?.classList.toggle("hidden", items.length === 0);
}

async function acquireWakeLock() {
  if (!("wakeLock" in navigator)) return;
  try {
    state.wakeLock = await navigator.wakeLock.request("screen");
  } catch {
    state.wakeLock = null;
  }
}

async function releaseWakeLock() {
  try {
    await state.wakeLock?.release();
  } catch {
    // ignore
  }
  state.wakeLock = null;
}

function hapticTap() {
  try {
    navigator.vibrate?.(12);
  } catch {
    // ignore
  }
}

function createClient() {
  state.client?.disconnectStream();
  state.client = new ShellClient({
    agentId: state.agentId,
    onConnectionChange: ({ state: connState }) => setConnection(connState),
    onStreamEvent: (event) => handleStreamEvent(event)
  });
  state.serverTts = createMobileTtsPlayer((path, options) => state.client.apiFetch(path, options));
  return state.client;
}

function handleStreamEvent(event) {
  if (event.type === "settings") {
    applyShellSettings(event.settings);
    return;
  }
  if (event.type === "status") {
    applyStatus(event.status);
    return;
  }
  if (event.type === "state") {
    if (state.streamUiLocked) return;
    if (state.isStreaming || state.isSending) return;
    renderPhase(event.state?.phase, event.state?.phrase);
    if (event.state?.lastShellReply) renderReply(event.state.lastShellReply);
    return;
  }
  if (event.type === "assistant_message") {
    handleAssistantMessage(event.message);
    return;
  }
  if (event.type === "assistant_delta") {
    const delta = event.delta || {};
    const chunk = String(delta.text ?? delta.delta ?? delta.body ?? "");
    if (chunk) {
      state.isStreaming = true;
      setStreamUiLocked(true);
      state.streamBuffer = chunk;
      queueStreamingReply(state.streamBuffer);
    }
    if (delta.done) {
      state.isStreaming = false;
      handleAssistantMessage(
        {
          id: delta.streamId,
          streamId: delta.streamId,
          body: chunk || state.streamBuffer,
          spokenText: delta.spokenText,
          spokenParts: delta.spokenParts,
          ttsClientId: delta.ttsClientId
        },
        { streamDone: true }
      );
    }
    return;
  }
}

function shellTtsEngineLabel(settings = {}) {
  const engine = settings.ttsEngine === "sidecar" ? "say" : settings.ttsEngine || "browser";
  if (engine === "browser") return "Safari (браузер)";
  if (engine === "edge") {
    const voice = String(settings.ttsEdgeVoice || "").trim();
    return voice ? `Edge · ${voice}` : "Edge (сервер CMS)";
  }
  if (engine === "say") return "Say (сервер CMS)";
  if (engine === "piper") return "Piper (сервер CMS)";
  if (engine === "elevenlabs") return "ElevenLabs (сервер CMS)";
  return engine;
}

function shellSttLabel(settings = {}) {
  const lang = settings.sttLang || "ru-RU";
  const mode = settings.voiceInputMode || "browser";
  const modeLabels = {
    browser: "Safari",
    fn_button: "Fn / удержание",
    sidecar: "Sidecar",
    always: "Sidecar always"
  };
  return `${lang} · ${modeLabels[mode] || mode}`;
}

function mobileUsesServerTts(settings = {}) {
  const engine = settings.ttsEngine === "sidecar" ? "say" : settings.ttsEngine || "browser";
  return SERVER_TTS_ENGINES.has(engine);
}

function applyShellSettings(settings) {
  if (!settings || typeof settings !== "object") return;
  state.shellSettings = settings;
  state.ttsEnabled = settings.ttsEnabled !== false;
  state.sttEnabled = settings.voiceInputMode !== "disabled";
  state.ttsEngine = mobileUsesServerTts(settings) ? "server" : "browser";
  const lang = settings.sttLang || "ru-RU";
  if (state.recognition) state.recognition.lang = lang;
  populateSettingsForm();
  syncVoiceControls();
}

function populateSettingsForm() {
  const settings = state.shellSettings;
  if (!settings) return;
  if (nodes.ttsEnabled) nodes.ttsEnabled.checked = settings.ttsEnabled !== false;
  if (nodes.sttEnabled) nodes.sttEnabled.checked = settings.voiceInputMode !== "disabled";
  if (nodes.ttsEngineNote) {
    nodes.ttsEngineNote.textContent =
      settings.ttsEnabled !== false ? shellTtsEngineLabel(settings) : "Озвучка выключена";
  }
  if (nodes.sttLangNote) {
    nodes.sttLangNote.textContent =
      settings.voiceInputMode !== "disabled" ? shellSttLabel(settings) : "Микрофон заблокирован";
  }
}

async function loadShellSettings() {
  if (!state.client) return;
  try {
    const data = await state.client.apiFetch("/api/shell/settings");
    applyShellSettings(data?.settings);
  } catch {
    // status poll may still deliver settings
  }
}

async function saveShellSettings(patch) {
  if (!state.client) throw new Error("Нет подключения к CMS");
  const data = await state.client.apiFetch("/api/shell/settings", {
    method: "POST",
    body: JSON.stringify({ settings: patch })
  });
  applyShellSettings(data?.settings);
  return data?.settings;
}

function applyStatus(status) {
  if (state.streamUiLocked) {
    if (status?.settings) applyShellSettings(status.settings);
    return;
  }
  const applied = ShellClient.applyStatus(status);
  if (state.isStreaming || state.isSending) {
    return;
  }
  renderPhase(applied.phase, applied.phrase);
  if (applied.reply) {
    state.streamBuffer = "";
    renderReply(applied.reply);
  }
  if (status?.settings) applyShellSettings(status.settings);
  renderRoute(applied.messageTarget, applied.qwenpawOk);
  if (status?.agentId && !state.agentId) {
    state.agentId = status.agentId;
    localStorage.setItem(AGENT_KEY, state.agentId);
    renderAgentChip();
  }
}

function clearSendingState() {
  state.isSending = false;
  state.isStreaming = false;
  state.sendAbort = null;
  setSending(false);
}

function collectReplyIds(message = {}) {
  return [message.id, message.streamId].map((value) => String(value || "").trim()).filter(Boolean);
}

function isReplyAlreadyDisplayed(message = {}) {
  const ids = collectReplyIds(message);
  return ids.some((id) => state.displayedReplyIds.has(id));
}

function isReplyAlreadySpoken(message = {}) {
  const ids = collectReplyIds(message);
  return ids.some((id) => state.spokenReplyIds.has(id));
}

function markReplyDisplayed(message = {}) {
  for (const id of collectReplyIds(message)) {
    state.displayedReplyIds.add(id);
    trimReplyIdSet(state.displayedReplyIds);
  }
}

function markReplySpoken(message = {}) {
  for (const id of collectReplyIds(message)) {
    state.spokenReplyIds.add(id);
    trimReplyIdSet(state.spokenReplyIds);
  }
}

function trimReplyIdSet(set) {
  if (set.size <= 24) return;
  const first = set.values().next().value;
  set.delete(first);
}

function handleAssistantMessage(message, { streamDone = false } = {}) {
  const ids = collectReplyIds(message);
  const id = ids[0] || "";
  const body = String(message?.body || "").trim();
  if (!body) {
    clearSendingState();
    return;
  }

  // SSE delta.done — только финальный текст; озвучку даёт HTTP / assistant_message.
  if (streamDone) {
    state.isStreaming = false;
    if (!isReplyAlreadyDisplayed(message)) {
      markReplyDisplayed(message);
      state.lastMessageId = id || state.lastMessageId;
      renderReply(body, {
        spokenParts: message.spokenParts,
        spokenText: message.spokenText
      });
    }
    return;
  }

  if (isReplyAlreadyDisplayed(message)) {
    clearSendingState();
    if (!isReplyAlreadySpoken(message)) {
      void speakReply(body, message).then(() => {
        state.pendingReplyClientId = "";
        releaseSessionUiLock();
      });
    }
    return;
  }

  state.lastMessageId = id || state.lastMessageId;
  state.isStreaming = false;
  state.streamBuffer = "";
  pendingStreamText = "";
  flushStreamingReply();
  renderReply(body, {
    spokenParts: message.spokenParts,
    spokenText: message.spokenText
  });
  markReplyDisplayed(message);
  clearSendingState();

  void speakReply(body, message).then(() => {
    state.pendingReplyClientId = "";
    releaseSessionUiLock();
  });
}

function shouldPlayMobileTts(message = {}) {
  const target = String(message.ttsClientId || "").trim();
  const mine = getShellClientId();
  if (target) return target === mine;
  const pending = String(state.pendingReplyClientId || "").trim();
  if (pending && pending === mine) return true;
  return Boolean(state.micHeld);
}

function formatTtsErrorHint({ serverReason = "", browserReason = "", useServerTts = true } = {}) {
  const parts = [];
  if (serverReason === "synthesize-fetch" || /fetch|network|failed/i.test(serverReason)) {
    parts.push("Нет связи с CMS — Wi‑Fi и https://IP:3443");
  } else if (serverReason === "play-not-allowed") {
    parts.push("iPhone заблокировал звук — нажмите микрофон и сразу задайте вопрос");
  } else if (serverReason === "play-failed" || serverReason === "audio-element-error") {
    parts.push("Выключите беззвучный режим, громкость вверх");
  } else if (serverReason === "engine-browser" && useServerTts) {
    parts.push("Настройки TTS не загрузились — обновите страницу");
  } else if (serverReason && serverReason !== "engine-browser") {
    parts.push(`Сервер: ${serverReason}`);
  }

  if (browserReason === "speech-timeout" || browserReason === "speech-end-timeout") {
    parts.push("Safari TTS завис — Edge TTS с Mac не сработал");
  } else if (browserReason && browserReason !== "no-speech-synthesis") {
    parts.push(`Safari: ${browserReason}`);
  }

  if (!parts.length) {
    parts.push("Беззвучный режим выкл · TTS включён в Agent Shell на Mac");
  }
  return parts.join(" · ");
}

function truncateForMobileTts(text, maxLen = 700) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value || value.length <= maxLen) return value;
  const cut = value.slice(0, maxLen);
  return `${cut.replace(/\s+\S*$/, "").trim()}…`;
}

function buildMobileSpeechText(body, message = {}) {
  const spokenParts = Array.isArray(message?.spokenParts)
    ? message.spokenParts.map((part) => String(part || "").trim()).filter(Boolean)
    : [];
  if (spokenParts.length) return spokenParts.join("\n\n");
  const spokenText = String(message?.spokenText || "").trim();
  if (spokenText) return spokenText;

  const sources = [body, state.lastReplyRaw, state.streamBuffer].filter(Boolean);
  for (const source of sources) {
    const parsed = parseDualReply(String(source));
    if (parsed.spokenParts?.length) return parsed.spokenParts.join("\n\n");
    if (parsed.spoken) return parsed.spoken;
  }

  const fallback = prepareSpeechText(body, {
    ttsStripEmoji: state.shellSettings?.ttsStripEmoji !== false,
    ttsIncludeCaptions: false
  });
  return truncateForMobileTts(fallback);
}

async function speakReply(body, message = {}) {
  if (!state.ttsEnabled) {
    if (shouldPlayMobileTts(message)) {
      setError("Озвучка выключена", {
        hint: "Agent Shell на Mac → Настройки TTS → включите «TTS» и сохраните"
      });
    }
    return false;
  }
  if (!shouldPlayMobileTts(message)) return false;
  if (isReplyAlreadySpoken(message)) return false;

  while (state.speakMutex) {
    await state.speakMutex;
  }
  let releaseMutex = () => {};
  state.speakMutex = new Promise((resolve) => {
    releaseMutex = resolve;
  });

  try {
    return await speakReplyNow(body, message);
  } finally {
    releaseMutex();
    state.speakMutex = null;
  }
}

async function speakReplyNow(body, message = {}) {
  const text = buildMobileSpeechText(body, message);
  const messageIds = collectReplyIds(message);
  const messageKey = messageIds[0] || "";
  if (!text) {
    if (shouldPlayMobileTts(message)) {
      setError("Нечего озвучить", {
        hint: "Агент не вернул блок [tts] — проверьте ttsPrompt в Agent Shell на Mac"
      });
    }
    return false;
  }
  if (text === state.lastSpoken && messageIds.some((id) => state.spokenReplyIds.has(id))) {
    return false;
  }

  state.lastSpoken = text;
  state.speakInFlightId = messageKey;

  await unlockMobileAudio();

  state.serverTts?.stop();
  nodes.stopTts.classList.remove("hidden");
  renderPhase("speaking");

  const lang = state.shellSettings?.ttsLang || "ru-RU";
  const rate = state.shellSettings?.ttsRate || 1;
  const useServerTts = mobileUsesServerTts(state.shellSettings || {});
  let ok = false;
  let serverReason = "";
  let browserReason = "";

  const tryServerTts = async () => {
    if (!useServerTts || !state.serverTts) {
      if (!useServerTts) serverReason = "engine-browser";
      return false;
    }
    await unlockMobileAudio();
    const server = await state.serverTts.speak(text);
    if (server.ok) return true;
    if (server.reason) serverReason = server.reason;
    return false;
  };

  const tryBrowserTts = async () => {
    if (!window.speechSynthesis) {
      browserReason = "no-speech-synthesis";
      return false;
    }
    await unlockMobileAudio();
    const browser = await speakBrowserTts(text, { lang, rate });
    if (browser.ok) return true;
    if (browser.reason) browserReason = browser.reason;
    return false;
  };

  ok = (await tryServerTts()) || (await tryBrowserTts());

  if (!ok) {
    const hint = formatTtsErrorHint({ serverReason, browserReason, useServerTts });
    setError("Не удалось озвучить ответ", { hint });
  } else {
    setError("");
    markReplySpoken(message);
    for (const id of messageIds) {
      if (id) state.lastSpokenForMessageId = id;
    }
  }

  finishSpeaking();
  if (state.speakInFlightId === messageKey) state.speakInFlightId = "";
  releaseSessionUiLock();
  return ok;
}

function finishSpeaking() {
  nodes.stopTts.classList.add("hidden");
  if (!state.isSending) renderPhase("waiting");
}

async function stopSpeaking() {
  window.speechSynthesis?.cancel();
  state.serverTts?.stop();
  finishSpeaking();
  try {
    await state.client?.stopTts();
  } catch {
    // ignore
  }
}

function cancelSending() {
  state.sendAbort?.abort();
  state.sendAbort = null;
  state.isStreaming = false;
  state.isSending = false;
  pendingStreamText = "";
  flushStreamingReply();
  setSending(false);
  setStreamUiLocked(false);
  renderPhase("waiting");
  setError("Отправка отменена");
}

async function sendMessage(body, { voice = false } = {}) {
  const text = String(body || "").trim();
  if (!text || state.isSending) return;
  if (!state.client) {
    setError("Нет подключения к CMS", { hint: "Проверьте Wi‑Fi и обновите страницу" });
    return;
  }

  void unlockMobileAudio();
  if (!state.shellSettings) await loadShellSettings();
  state.pendingReplyClientId = getShellClientId();
  setStreamUiLocked(true);
  setError("");
  setSending(true);
  state.streamBuffer = "";
  state.lastRenderedReplyKey = "";
  renderLastAsk(text);
  renderPhase("thinking");
  pushHistory("user", text);
  window.speechSynthesis?.cancel();
  state.serverTts?.stop();
  finishSpeaking();

  state.sendAbort = new AbortController();
  try {
    const result = await state.client.sendMessage(text, { voice, signal: state.sendAbort.signal });
    if (result?.message?.body || result?.reply) {
      handleAssistantMessage(
        result.message || {
          id: result.streamId,
          streamId: result.streamId,
          body: result.reply,
          spokenText: result.spokenText,
          spokenParts: result.spokenParts,
          ttsClientId: result.ttsClientId
        }
      );
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      state.pendingReplyClientId = "";
      state.isSending = false;
      setSending(false);
      return;
    }
    state.pendingReplyClientId = "";
    setError(error.message, { hint: connectionHint(error) });
  } finally {
    if (state.isSending) {
      state.isSending = false;
      setSending(false);
    }
  }
}

function getRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  if (!state.recognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = state.shellSettings?.sttLang || "ru-RU";
    recognition.interimResults = true;
    recognition.continuous = true;
    state.recognition = recognition;
  }
  return state.recognition;
}

function showVoiceConfirmDialog(text) {
  return new Promise((resolve) => {
    nodes.voiceConfirmText.value = text;
    nodes.voiceConfirmDialog.showModal();
    nodes.voiceConfirmText.focus();

    const cleanup = (result) => {
      nodes.voiceConfirmForm.removeEventListener("submit", onSubmit);
      nodes.voiceCancel.removeEventListener("click", onCancel);
      nodes.voiceRetry.removeEventListener("click", onRetry);
      nodes.voiceConfirmDialog.close();
      resolve(result);
    };

    const onSubmit = (event) => {
      event.preventDefault();
      cleanup(nodes.voiceConfirmText.value.trim() || null);
    };
    const onCancel = () => cleanup(null);
    const onRetry = () => cleanup("__retry__");

    nodes.voiceConfirmForm.addEventListener("submit", onSubmit);
    nodes.voiceCancel.addEventListener("click", onCancel);
    nodes.voiceRetry.addEventListener("click", onRetry);
  });
}

async function handleVoiceTranscript(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    renderPhase("waiting");
    return;
  }

  if (state.voiceConfirm) {
    const result = await showVoiceConfirmDialog(trimmed);
    if (result === "__retry__") {
      renderPhase("waiting");
      hapticTap();
      return;
    }
    if (!result) {
      renderPhase("waiting");
      return;
    }
    await sendMessage(result, { voice: true });
    return;
  }

  await sendMessage(trimmed, { voice: true });
}

function bindMic() {
  const recognition = getRecognition();
  const insecure = Boolean(mobilePermissionIssue());

  if (!recognition) {
    nodes.mic.disabled = true;
    setError("Web Speech API недоступен.", {
      hint: insecure
        ? "Нужен HTTPS: npm run start:https на Mac"
        : "Нажмите ? → Микрофон Safari или дождитесь iOS-приложения."
    });
    return;
  }

  if (insecure) {
    nodes.micHint.textContent = "Нужен HTTPS";
  }

  let finalText = "";
  let micWarmed = false;
  let micStarting = false;
  let stopWhenReady = false;
  let micRestartTimer = null;

  const clearMicRestartTimer = () => {
    if (micRestartTimer) {
      clearTimeout(micRestartTimer);
      micRestartTimer = null;
    }
  };

  const scheduleRecognitionRestart = (delayMs = 140) => {
    clearMicRestartTimer();
    if (!state.micHeld) return;
    micRestartTimer = window.setTimeout(() => {
      micRestartTimer = null;
      if (!state.micHeld) return;
      try {
        recognition.start();
        nodes.mic.dataset.recording = "1";
        nodes.mic.setAttribute("aria-pressed", "true");
      } catch {
        if (state.micHeld) scheduleRecognitionRestart(260);
      }
    }, delayMs);
  };

  const finishRecordingSession = async () => {
    clearMicRestartTimer();
    micStarting = false;
    stopWhenReady = false;
    state.micHeld = false;
    nodes.mic.dataset.recording = "0";
    nodes.mic.setAttribute("aria-pressed", "false");
    await releaseWakeLock();
    syncVoiceControls();
    const text = (finalText || nodes.phrase.textContent || "").trim();
    finalText = "";
    nodes.phrase.textContent = text;
    if (text) {
      await handleVoiceTranscript(text);
      return;
    }
    renderPhase("waiting");
    nodes.phrase.textContent = "";
  };

  recognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const part = event.results[i][0]?.transcript || "";
      if (event.results[i].isFinal) finalText += part;
      else interim += part;
    }
    nodes.phrase.textContent = (finalText + interim).trim();
  };

  recognition.onerror = (event) => {
    if (state.micHeld && (event.error === "no-speech" || event.error === "aborted")) {
      scheduleRecognitionRestart();
      return;
    }
    clearMicRestartTimer();
    micStarting = false;
    stopWhenReady = false;
    nodes.mic.dataset.recording = "0";
    nodes.mic.setAttribute("aria-pressed", "false");
    state.micHeld = false;
    void releaseWakeLock();
    if (!state.isSending) nodes.micHint.textContent = MIC_HINT_IDLE;
    renderPhase("waiting");
    if (event.error === "not-allowed") {
      setError("Нет доступа к микрофону.", { hint: "Настройки → Safari → Микрофон" });
      nodes.micDialog?.showModal();
      return;
    }
    if (event.error === "service-not-allowed" || insecure) {
      setError("Микрофон заблокирован.", {
        hint: `Откройте ${getMobileHttpsUrl()} (npm run start:https на Mac)`
      });
      nodes.micDialog?.showModal();
    }
  };

  recognition.onend = () => {
    if (state.micHeld) {
      scheduleRecognitionRestart();
      return;
    }
    void finishRecordingSession();
  };

  const start = async () => {
    void unlockMobileAudio();
    if (!state.sttEnabled) {
      setError("Голосовой ввод выключен", { hint: "Настройки ⚙️ → «Голосовой ввод (STT)»" });
      return;
    }
    state.pendingReplyClientId = getShellClientId();
    if (state.micHeld || micStarting || state.isSending) return;
    if (mobilePermissionIssue()) {
      setError("Safari не спрашивает разрешения по HTTP.", {
        hint: `На Mac: npm run start:https → ${getMobileHttpsUrl("192.168.0.102")}`
      });
      nodes.micDialog?.showModal();
      return;
    }

    state.micHeld = true;
    micStarting = true;
    stopWhenReady = false;
    finalText = "";
    nodes.mic.dataset.recording = "1";
    nodes.mic.setAttribute("aria-pressed", "true");
    nodes.micHint.textContent = MIC_HINT_ACTIVE;
    renderPhase("listening", "Запись…");
    setError("");
    hapticTap();
    void acquireWakeLock();
    try {
      if (!micWarmed) {
        await warmUpMicrophone();
        micWarmed = true;
      }
      if (stopWhenReady || !state.micHeld) {
        state.micHeld = false;
        nodes.mic.dataset.recording = "0";
        nodes.mic.setAttribute("aria-pressed", "false");
        if (!state.isSending) nodes.micHint.textContent = MIC_HINT_IDLE;
        renderPhase("waiting");
        void releaseWakeLock();
        return;
      }
      recognition.start();
    } catch (error) {
      micStarting = false;
      stopWhenReady = false;
      state.micHeld = false;
      nodes.mic.dataset.recording = "0";
      nodes.mic.setAttribute("aria-pressed", "false");
      void releaseWakeLock();
      if (!state.isSending) nodes.micHint.textContent = MIC_HINT_IDLE;
      renderPhase("waiting");
      if (error?.code === "insecure-context") {
        setError("Нужен HTTPS для микрофона.", { hint: "npm run start:https на Mac" });
        nodes.micDialog?.showModal();
        return;
      }
      if (error?.name === "NotAllowedError") {
        setError("Нет доступа к микрофону.", { hint: "Настройки → Safari → Микрофон" });
        nodes.micDialog?.showModal();
        return;
      }
      setError(error?.message || "Не удалось включить микрофон");
    } finally {
      micStarting = false;
    }
  };

  const stop = () => {
    clearMicRestartTimer();
    if (micStarting) {
      stopWhenReady = true;
      return;
    }
    if (!state.micHeld) return;
    state.micHeld = false;
    if (!state.isSending) nodes.micHint.textContent = MIC_HINT_IDLE;
    hapticTap();
    try {
      recognition.stop();
    } catch {
      void finishRecordingSession();
    }
  };

  const toggleMic = () => {
    if (state.micHeld || micStarting) {
      stop();
      return;
    }
    void start();
  };

  nodes.mic.addEventListener("click", () => {
    toggleMic();
  });
}

function bindCompose() {
  nodes.compose.addEventListener("submit", async (event) => {
    event.preventDefault();
    void unlockMobileAudio();
    const text = nodes.input.value;
    nodes.input.value = "";
    nodes.input.blur();
    resetMobileViewport();
    await sendMessage(text, { voice: false });
  });
}

function measureDockHeight() {
  if (!nodes.dock) return;
  document.documentElement.style.setProperty("--mobile-dock-height", `${nodes.dock.offsetHeight}px`);
}

function syncMobileKeyboardViewport() {
  if (state.streamUiLocked && document.activeElement !== nodes.input) return;

  const vv = window.visualViewport;
  if (!vv) return;

  const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
  const keyboardOpen = overlap > 40 || document.activeElement === nodes.input;

  document.documentElement.style.setProperty("--vv-keyboard", keyboardOpen ? `${overlap}px` : "0px");
  document.body.classList.toggle("mobile-keyboard-open", keyboardOpen);

  if (keyboardOpen) measureDockHeight();
}

function resetMobileViewport() {
  if (document.activeElement === nodes.input) return;
  document.documentElement.style.setProperty("--vv-keyboard", "0px");
  document.body.classList.remove("mobile-keyboard-open");
  const snap = () => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };
  snap();
  requestAnimationFrame(snap);
}

function bindKeyboardDismiss() {
  const input = nodes.input;
  const compose = nodes.compose;
  if (!input) return;

  const keepsInputFocus = (target) => {
    if (!(target instanceof Element)) return false;
    return target === input || compose?.contains(target) || nodes.dock?.contains(target);
  };

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (keepsInputFocus(event.target)) return;
      if (document.activeElement === input) input.blur();
    },
    { passive: true }
  );

  input.addEventListener("focus", () => {
    measureDockHeight();
    syncMobileKeyboardViewport();
    window.setTimeout(syncMobileKeyboardViewport, 60);
    window.setTimeout(syncMobileKeyboardViewport, 280);
  });

  input.addEventListener("blur", resetMobileViewport);

  window.visualViewport?.addEventListener("resize", syncMobileKeyboardViewport);
  window.visualViewport?.addEventListener("scroll", syncMobileKeyboardViewport);
  window.addEventListener("orientationchange", () => {
    window.setTimeout(() => {
      measureDockHeight();
      syncMobileKeyboardViewport();
    }, 120);
  });

  measureDockHeight();
  window.addEventListener("resize", measureDockHeight, { passive: true });
}

function resolveAgentLabel(agentId) {
  const match = (state.agentOptions.agents || []).find((a) => a.id === agentId);
  return match?.name || agentId;
}

function cleanMobileUrl() {
  const url = new URL(window.location.href);
  const embedAgent = mobileEmbedMode ? String(url.searchParams.get("agent") || "").trim() : "";
  if (embedAgent) {
    state.agentId = embedAgent;
    localStorage.setItem(AGENT_KEY, embedAgent);
  }
  if (!url.searchParams.has("agent")) return;
  url.searchParams.delete("agent");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

async function bootstrapAgents() {
  try {
    state.agentOptions = await loadAgentSelectData();
    state.agentsLoaded = true;
    if (!state.agentId) {
      state.agentId = state.agentOptions.defaultAgentId
        || getSelectableAgents(state.agentOptions.agents)[0]?.id
        || "agent-cms-test";
      localStorage.setItem(AGENT_KEY, state.agentId);
    }
    state.agentLabel = resolveAgentLabel(state.agentId);
    renderAgentChip();
    populateAgentSelect(nodes.agentSelect, {
      agents: state.agentOptions.agents,
      groups: state.agentOptions.groups,
      selectedId: state.agentId,
      includePlaceholder: false
    });
  } catch {
    state.agentId = state.agentId || "agent-cms-test";
    state.agentLabel = state.agentId;
    renderAgentChip();
    nodes.agentSelect.innerHTML = `<option value="${state.agentId}">${state.agentId}</option>`;
  }
}

function bindSettings() {
  nodes.settingsBtn.addEventListener("click", async () => {
    if (!state.agentsLoaded) await bootstrapAgents();
    await loadShellSettings();
    nodes.agentSelect.value = state.agentId;
    nodes.voiceConfirm.checked = state.voiceConfirm;
    if (nodes.characterBackdrop) nodes.characterBackdrop.value = state.characterBackdrop;
    populateSettingsForm();
    nodes.helpUrl.textContent = `URL: ${window.location.origin}/shell/mobile/`;
    nodes.settingsDialog.showModal();
  });

  nodes.settingsCancel.addEventListener("click", () => nodes.settingsDialog.close());

  nodes.settingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const nextAgentId = nodes.agentSelect.value.trim() || "agent-cms-test";
    const agentChanged = nextAgentId !== state.agentId;
    state.agentId = nextAgentId;
    state.agentLabel = resolveAgentLabel(state.agentId);
    state.voiceConfirm = Boolean(nodes.voiceConfirm.checked);
    state.characterBackdrop = nodes.characterBackdrop?.value === "dark" ? "dark" : "wallpaper";
    localStorage.setItem(AGENT_KEY, state.agentId);
    localStorage.setItem(VOICE_CONFIRM_KEY, state.voiceConfirm ? "1" : "0");
    renderAgentChip();
    saveCharacterBackdrop(state.characterBackdrop);

    const ttsOn = nodes.ttsEnabled?.checked !== false;
    const sttOn = nodes.sttEnabled?.checked !== false;
    try {
      if (agentChanged) createClient();
      await saveShellSettings({
        ttsEnabled: ttsOn,
        voiceInputMode: sttOn ? "browser" : "disabled"
      });
      if (!sttOn && state.micHeld) {
        try {
          state.recognition?.stop();
        } catch {
          // ignore
        }
        state.micHeld = false;
        nodes.mic.dataset.recording = "0";
        nodes.mic.setAttribute("aria-pressed", "false");
      }
      syncVoiceControls();
      setError("");
    } catch (error) {
      setError(error.message, { hint: "Не удалось сохранить настройки Agent Shell" });
      return;
    }

    nodes.settingsDialog.close();
    reconnect({ soft: agentChanged });
  });
}

function bindHelp() {
  nodes.helpBtn?.addEventListener("click", () => nodes.helpDialog?.showModal());
  nodes.helpClose?.addEventListener("click", () => nodes.helpDialog?.close());
  nodes.micHelpLink?.addEventListener("click", (event) => {
    event.preventDefault();
    nodes.settingsDialog.close();
    nodes.micDialog?.showModal();
  });
  nodes.micClose?.addEventListener("click", () => nodes.micDialog?.close());
}

function bindInstallBanner() {
  if (isStandalonePwa() || localStorage.getItem(INSTALL_DISMISS_KEY) === "1") return;
  nodes.installBanner?.classList.remove("hidden");
  nodes.installDismiss?.addEventListener("click", () => {
    localStorage.setItem(INSTALL_DISMISS_KEY, "1");
    nodes.installBanner?.classList.add("hidden");
  });
}

function bindHistory() {
  nodes.historyOpen?.addEventListener("click", () => {
    renderHistory();
    nodes.historyDialog?.showModal();
  });
  nodes.historyClose?.addEventListener("click", () => nodes.historyDialog?.close());
  nodes.historyDialog?.addEventListener("click", (event) => {
    if (event.target === nodes.historyDialog) nodes.historyDialog.close();
  });
}

function setPillLabel(button, text) {
  const label = button?.querySelector(".mobile-pill-btn__label");
  if (label) label.textContent = text;
}

function bindCopyShare() {
  nodes.copyReply?.addEventListener("click", async () => {
    if (!state.lastReplyRaw) return;
    try {
      await navigator.clipboard.writeText(state.lastReplyRaw);
      setPillLabel(nodes.copyReply, "✓");
      setTimeout(() => {
        setPillLabel(nodes.copyReply, "Копировать");
      }, 1200);
    } catch {
      setError("Не удалось скопировать");
    }
  });

  nodes.shareReply?.addEventListener("click", async () => {
    if (!state.lastReplyRaw || !navigator.share) return;
    try {
      await navigator.share({ title: "Agent Shell", text: state.lastReplyRaw });
    } catch {
      // user cancelled
    }
  });
}

function bindPullRefresh() {
  const scrollEl = nodes.chatScroll || nodes.reply;

  window.addEventListener(
    "touchstart",
    (event) => {
      const top = scrollEl?.scrollTop ?? window.scrollY;
      if (top > 8 || state.isSending) return;
      state.pullStartY = event.touches[0]?.clientY || 0;
      state.pullActive = true;
    },
    { passive: true }
  );

  window.addEventListener(
    "touchmove",
    (event) => {
      if (!state.pullActive) return;
      const dy = (event.touches[0]?.clientY || 0) - state.pullStartY;
      if (dy > 70) nodes.pullHint?.classList.remove("hidden");
      else nodes.pullHint?.classList.add("hidden");
    },
    { passive: true }
  );

  window.addEventListener(
    "touchend",
    () => {
      if (!state.pullActive) return;
      const show = !nodes.pullHint?.classList.contains("hidden");
      nodes.pullHint?.classList.add("hidden");
      state.pullActive = false;
      if (show) reconnect();
    },
    { passive: true }
  );
}

function bindActions() {
  nodes.reconnectBtn.addEventListener("click", () => reconnect());
  nodes.stopTts.addEventListener("click", () => void stopSpeaking());
  nodes.cancelSend?.addEventListener("click", () => cancelSending());

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      reconnect({ soft: true });
      if (state.micHeld) void acquireWakeLock();
    } else {
      void releaseWakeLock();
    }
  });
}

async function refreshStatus() {
  try {
    const status = await state.client.fetchStatus();
    applyStatus(status);
    if (!state.shellSettings) await loadShellSettings();
    setError("");
  } catch (error) {
    setConnection("error");
    setError(error.message, { hint: connectionHint(error) });
  }
}

function reconnect({ soft = false } = {}) {
  if (!state.agentId) return;
  if (!soft) setConnection("offline");
  createClient();
  state.client.connectStream();
  refreshStatus();
}

async function init() {
  const surfaceSwitcher = document.getElementById("shell-surface-switcher");
  if (surfaceSwitcher) {
    surfaceSwitcher.innerHTML = renderShellSurfaceSwitcherMarkup();
    initShellSurfaceSwitcher({ rootEl: surfaceSwitcher });
  }
  if (mobileEmbedMode) {
    document.body.classList.add("mobile-embed");
    cleanMobileUrl();
  }
  initMobilePermissions({ bannerEl: nodes.permissionBanner, micDialog: nodes.micDialog });
  loadHistory();
  renderHistory();
  bindMic();
  bindCompose();
  bindKeyboardDismiss();
  bindSettings();
  bindHelp();
  bindInstallBanner();
  bindHistory();
  bindCopyShare();
  bindChatCollapse();
  bindPullRefresh();
  bindActions();
  initMobileDeviceChips({
    clock: nodes.clock,
    battery: nodes.battery,
    orient: nodes.orient,
    orientValue: nodes.orientValue
  });

  try {
    await bootstrapAgents();
    reconnect();
  } catch (error) {
    setConnection("error");
    setError(error?.message || "Не удалось подключиться", { hint: connectionHint(error) });
  }

  void initMobileCharacter(document.getElementById("mobile-character-mount"))
    .then((stage) => {
      if (stage) applyCharacterBackdrop(state.characterBackdrop, stage);
    })
    .catch(() => {
      // 3D optional — Shell works without character
    });
}

init().catch((error) => {
  setConnection("error");
  setError(error?.message || "Не удалось запустить Shell");
});
