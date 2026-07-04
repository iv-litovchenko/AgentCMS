import { loadAgentSelectData, getSelectableAgents } from "/shared/agent-select.js";
import { createTopicPicker } from "/shell/topic-picker.js";
import { parseShellReply, renderShellReplyMedia, toSpeechText, pullSpeechSentences } from "/shell/shell-reply.js?v=3";
import { renderShellReplyMarkdown } from "/shell/shell-markdown.js?v=1";
import { initShellCharacter } from "/shell/shell-character.js?v=17";
import { createShellCamera } from "/shell/shell-camera.js?v=2";
import { createShellScreen } from "/shell/shell-screen.js?v=1";

const PHASE_LABELS = {
  waiting: "🟡 Ожидаю",
  listening: "🔴 Слушаю",
  thinking: "🟢 Думаю",
  speaking: "🔊 Говорю",
  disabled: "⏸️ Отключено"
};

const SHELL_AGENT_KEY = "agentcms.shellAgent.v1";

const state = {
  agentId: localStorage.getItem(SHELL_AGENT_KEY) || "",
  settings: null,
  windowSettings: null,
  shellState: null,
  eventSource: null,
  recognition: null,
  speaking: false,
  micActive: false,
  pttHeld: false,
  sidecarConnected: false,
  qwenpawConnected: false,
  qwenpawSessionId: "",
  qwenpawChatsOpen: false,
  stopTtsAt: 0,
  previousPhase: "waiting",
  cameraSnapshotBusy: false,
  cameraAppliedKey: "",
  screenSnapshotBusy: false,
  screenAppliedKey: "",
  view: "main",
  chatOpen: true,
  routeOpen: false,
  mediaMode: "",
  clockTimer: null,
  assistantStream: null,
  streamTtsQueue: [],
  streamTtsActive: false,
  streamTtsCursor: 0,
  messagePipelineBusy: false
};

const nodes = {
  messageTarget: document.getElementById("shell-message-target"),
  qwenpawPanel: document.getElementById("shell-qwenpaw-panel"),
  qwenpawUrl: document.getElementById("shell-qwenpaw-url"),
  qwenpawOpenUrl: document.getElementById("shell-qwenpaw-open-url"),
  qwenpawAgentId: document.getElementById("shell-qwenpaw-agent-id"),
  qwenpawChatTitle: document.getElementById("shell-qwenpaw-chat-title"),
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
  topmost: document.getElementById("shell-topmost"),
  windowTransparent: document.getElementById("shell-window-transparent"),
  windowBackground: document.getElementById("shell-window-background"),
  windowCompact: document.getElementById("shell-window-compact"),
  voiceMode: document.getElementById("shell-voice-mode"),
  message: document.getElementById("shell-message"),
  sendBtn: document.getElementById("shell-send-btn"),
  micBtn: document.getElementById("shell-mic-btn"),
  stopTtsBtn: document.getElementById("shell-stop-tts"),
  settingsBtn: document.getElementById("shell-settings-btn"),
  homeBtn: document.getElementById("shell-home-btn"),
  openCmsBtn: document.getElementById("shell-open-cms"),
  shellApp: document.getElementById("shell-app"),
  mainView: document.getElementById("shell-main-view"),
  subtitle: document.getElementById("shell-subtitle"),
  agentAvatar: document.getElementById("shell-agent-avatar"),
  characterStage: document.getElementById("shell-character-stage"),
  sessionToggle: document.getElementById("shell-session-toggle"),
  replyPanel: document.getElementById("shell-reply-panel"),
  composePanel: document.getElementById("shell-compose-panel"),
  routeToggle: document.getElementById("shell-route-toggle"),
  routePanel: document.getElementById("shell-route-panel"),
  watchCamera: document.getElementById("shell-watch-camera"),
  watchScreen: document.getElementById("shell-watch-screen"),
  mediaSection: document.getElementById("shell-media-section"),
  phaseLabel: document.getElementById("shell-phase-label"),
  battery: document.getElementById("shell-battery"),
  batteryFill: document.getElementById("shell-battery-fill"),
  batteryLevel: document.getElementById("shell-battery-level"),
  clock: document.getElementById("shell-clock"),
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
    void saveSettings({ topicPath: topicPicker.getValue() });
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

function renderPhase(phase, phrase = "", metrics = "") {
  const normalized = PHASE_LABELS[phase] ? phase : "waiting";
  nodes.phaseLabel.textContent = PHASE_LABELS[normalized];
  nodes.meta.textContent = metrics || "";
  nodes.pulse.dataset.phase = normalized;
  if (nodes.agentAvatar) nodes.agentAvatar.dataset.phase = normalized;
  if (nodes.characterStage) nodes.characterStage.dataset.phase = normalized;
}

function renderShellReply(message) {
  const body = String(message?.body || message?.message?.body || "").trim();
  const extraShows = Array.isArray(message?.shows) ? message.shows : [];
  const parsed = parseShellReply(body);
  const shows = extraShows.length ? [...parsed.shows, ...extraShows] : parsed.shows;

  if (nodes.lastReplyText) renderShellReplyMarkdown(nodes.lastReplyText, parsed.text === "—" ? "" : parsed.text);
  else if (nodes.lastReply) renderShellReplyMarkdown(nodes.lastReply, parsed.text === "—" ? "" : parsed.text);

  renderShellReplyMedia(nodes.lastReplyMedia, shows, state.agentId);
  return { ...parsed, shows };
}

function clearShellReply() {
  if (nodes.lastReplyText) renderShellReplyMarkdown(nodes.lastReplyText, "");
  else if (nodes.lastReply) renderShellReplyMarkdown(nodes.lastReply, "");
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
  if (message?.streamId) return true;
  if (lastHandledStreamId && String(message?.streamId || "") === lastHandledStreamId) return true;
  if (lastStreamHandledBody && lastStreamHandledBody === body) return true;
  return false;
}

function beginAssistantStream({ streamId } = {}) {
  state.assistantStream = {
    id: String(streamId || `local-${Date.now()}`),
    text: "",
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
  nodes.lastReplyText.classList.remove("shell-md");
  nodes.lastReplyText.textContent = value || "…";
  nodes.lastReply?.scrollTo?.({ top: nodes.lastReply.scrollHeight, behavior: "auto" });
}

function queueStreamSpeech(fullBody) {
  if (!state.settings?.ttsEnabled) return;
  if (state.settings?.ttsEngine === "sidecar" || state.settings?.ttsEngine === "say") return;

  const speech = toSpeechText(fullBody);
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

  const synth = getSpeechSynth();
  if (!synth) return;

  state.speaking = true;
  if ((state.shellState?.phase || "waiting") !== "speaking") {
    await patchShellState({ phase: "speaking", phrase: "Озвучиваю ответ…" });
  }

  await new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(payload);
    utterance.lang = "ru-RU";
    utterance.rate = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.speak(utterance);
  });
}

async function drainStreamTtsQueue() {
  if (state.streamTtsActive) return;
  state.streamTtsActive = true;
  try {
    while (state.streamTtsQueue.length) {
      const chunk = state.streamTtsQueue.shift();
      await speakStreamChunk(chunk);
    }
  } finally {
    state.streamTtsActive = false;
  }
}

function finalizeAssistantStream(message) {
  const stream = state.assistantStream;
  const streamId = String(message?.streamId || message?.id || stream?.id || "");
  const body = String(message?.body || stream?.text || "").trim();
  if (!body) return false;
  if (stream?.finalized && stream.id === streamId) return true;

  state.assistantStream = { id: streamId, text: body, done: true, finalized: true };
  nodes.replyPanel?.classList.remove("is-streaming");
  renderShellReply({ ...message, body });
  markAssistantReplyHandled({ ...message, body, streamId }, body, { streamTts: true });

  if (
    state.settings?.ttsEnabled &&
    state.settings?.ttsEngine !== "sidecar" &&
    state.settings?.ttsEngine !== "say"
  ) {
    const speech = toSpeechText(body);
    const tail = speech.slice(state.streamTtsCursor).trim();
    if (tail) {
      state.streamTtsQueue.push(tail);
      state.streamTtsCursor = speech.length;
    }
    void finishStreamTtsWhenIdle();
  } else {
    state.assistantStream = null;
    releaseMessagePipeline();
  }
  return true;
}

function releaseMessagePipeline() {
  state.messagePipelineBusy = false;
  nodes.sendBtn.disabled = false;
  void drainOutboundQueue();
}

function queuePhraseSuffix() {
  const n = outboundQueue.length;
  return n > 0 ? ` · в очереди: ${n}` : "";
}

async function drainOutboundQueue() {
  if (state.messagePipelineBusy || !outboundQueue.length) return;
  const next = outboundQueue.shift();
  if (!next) return;
  await sendMessageDirect(next);
}

async function finishStreamTtsWhenIdle() {
  await drainStreamTtsQueue();
  state.speaking = false;
  state.assistantStream = null;
  if (!state.pttHeld && !state.micActive) {
    await patchShellState({ phase: "waiting", phrase: "Готов к сообщению" });
    renderPhase("waiting", `Готов к сообщению${queuePhraseSuffix()}`, state.shellState?.metrics || "");
  }
  releaseMessagePipeline();
}

function handleAssistantDelta(payload) {
  const streamId = String(payload?.streamId || "").trim();
  const text = String(payload?.text ?? "");
  const done = Boolean(payload?.done);

  if (!state.assistantStream) {
    beginAssistantStream({ streamId: streamId || undefined });
  } else if (streamId && state.assistantStream.id !== streamId) {
    if (String(state.assistantStream.id).startsWith("local-")) {
      state.assistantStream.id = streamId;
    } else {
      beginAssistantStream({ streamId });
    }
  }

  state.assistantStream.text = text;
  state.assistantStream.done = done;
  renderStreamingAssistantText(text);
  queueStreamSpeech(text);

  if (done) {
    finalizeAssistantStream({ streamId, id: streamId, body: text });
    if (!state.settings?.ttsEnabled || state.settings?.ttsEngine === "sidecar" || state.settings?.ttsEngine === "say") {
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

function applyWindowSettings(settings) {
  state.windowSettings = settings;
  if (nodes.topmost) nodes.topmost.checked = settings.windowTopmost !== false;
  if (nodes.windowTransparent) nodes.windowTransparent.checked = Boolean(settings.windowTransparent);
  if (nodes.windowCompact) nodes.windowCompact.checked = Boolean(settings.windowCompact);
  if (nodes.windowBackground) {
    nodes.windowBackground.value = settings.windowBackground || "wallpaper";
    nodes.windowBackground.disabled = Boolean(settings.windowTransparent);
  }
  applyWindowAppearance(settings);
  if (settings.windowCompact) setShellView("main");
  if (window.shellApp?.applyWindowSettings) {
    void window.shellApp.applyWindowSettings(settings);
  }
}

function setMicButtonState(label, { active = false } = {}) {
  if (!nodes.micBtn) return;
  const icon = nodes.micBtn.querySelector(".shell-action-icon");
  const text = nodes.micBtn.querySelector(".shell-action-label");
  if (icon) icon.textContent = active ? "⏹" : "🎤";
  if (text) text.textContent = label;
  else nodes.micBtn.textContent = label;
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

function applySettings(settings) {
  state.settings = settings;
  nodes.messageTarget.value = settings.messageTarget || "cms";
  nodes.qwenpawUrl.value = settings.qwenpawBaseUrl || "http://127.0.0.1:8088";
  nodes.qwenpawAgentId.value = settings.qwenpawAgentId || "default";
  topicPicker.setValue(settings.topicPath || "");
  nodes.ttsEnabled.checked = settings.ttsEnabled !== false;
  nodes.voiceMode.value = settings.voiceInputMode || "browser";
  updateTargetUi(settings.messageTarget || "cms");
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
  window.open(getQwenPawUrlValue(), "_blank", "noopener,noreferrer");
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
}

function cleanShellUrl() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("agent")) return;
  url.searchParams.delete("agent");
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

function updateQwenPawChatUi(payload) {
  if (!nodes.qwenpawChatTitle || !nodes.qwenpawChatSession) return;
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
    sessionId ||
    "—";

  state.qwenpawSessionId = sessionId;
  nodes.qwenpawChatTitle.textContent = chatName || "Новый чат";
  nodes.qwenpawChatSession.textContent = sessionId ? `session: ${sessionId}` : "";
}

function setQwenPawChatsOpen(open) {
  state.qwenpawChatsOpen = Boolean(open);
  nodes.qwenpawChatsPanel?.classList.toggle("hidden", !state.qwenpawChatsOpen);
}

function renderQwenPawChats(chats, activeSessionId) {
  if (!nodes.qwenpawChatsPanel) return;
  nodes.qwenpawChatsPanel.innerHTML = "";

  const items = Array.isArray(chats) ? chats : [];
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
    if (state.pttHeld) setMicButtonState("Стоп", { active: true });
    else if (!state.micActive) setMicButtonState("Говорить");
  }
  state.sidecarConnected = Boolean(payload?.sidecarConnected);
  state.qwenpawConnected = Boolean(payload?.qwenpaw?.ok);
  updateQwenPawChatUi(payload);
  if (payload?.latestAgentMessage?.body) {
    const streaming = state.assistantStream && !state.assistantStream.finalized;
    if (!streaming) renderShellReply(payload.latestAgentMessage);
  }
}

function needsSidecar(mode) {
  return mode === "sidecar" || mode === "always";
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

async function patchShellState(patch) {
  const data = await apiFetch("/api/shell/state", {
    method: "POST",
    body: JSON.stringify({ state: patch })
  });
  state.shellState = data.state;
  renderPhase(data.state.phase, data.state.phrase, data.state.metrics);
}

async function sendMessage(body) {
  const text = String(body || "").trim();
  if (!text) return;

  if (state.messagePipelineBusy) {
    outboundQueue.push(text);
    renderPhase(state.shellState?.phase || "thinking", `В очереди: ${outboundQueue.length}${queuePhraseSuffix()}`);
    return;
  }

  await sendMessageDirect(text);
}

async function sendMessageDirect(body) {
  const text = String(body || "").trim();
  if (!text) return;
  state.messagePipelineBusy = true;
  nodes.sendBtn.disabled = true;
  const target = state.settings?.messageTarget || nodes.messageTarget?.value || "cms";
  const streamingQwenPaw = usesQwenPawTarget(target);
  if (streamingQwenPaw) beginAssistantStream({});
  try {
    await patchShellState({ phase: "thinking", phrase: text.slice(0, 240) });
    const result = await apiFetch("/api/shell/message", {
      method: "POST",
      body: JSON.stringify({ body: text, author: "shell" })
    });
    nodes.message.value = "";
    if (result?.reply || result?.message?.body) {
      await handleAssistantMessage(result.message || { body: result.reply, streamId: result.streamId });
      if (!streamingQwenPaw || shouldSkipAssistantSpeech(result.message || { streamId: result.streamId }, String(result.reply || result.message?.body || "").trim())) {
        if (!state.streamTtsQueue.length && !state.streamTtsActive) {
          releaseMessagePipeline();
        }
      }
    } else {
      await refreshStatus();
      releaseMessagePipeline();
    }
  } catch (error) {
    if (streamingQwenPaw && state.assistantStream && !state.assistantStream.finalized) {
      nodes.replyPanel?.classList.remove("is-streaming");
      state.assistantStream = null;
    }
    renderPhase("waiting", error.message);
    releaseMessagePipeline();
  }
}

function getSpeechSynth() {
  return window.speechSynthesis || null;
}

function stopBrowserTts() {
  state.streamTtsQueue = [];
  const synth = getSpeechSynth();
  if (synth) synth.cancel();
  state.speaking = false;
}

async function speakText(text) {
  const payload = String(text || "").trim();
  if (!payload) return;
  if (!state.settings?.ttsEnabled) return;
  if (state.settings?.ttsEngine === "sidecar" || state.settings?.ttsEngine === "say") return;

  const synth = getSpeechSynth();
  if (!synth) return;

  stopBrowserTts();
  state.speaking = true;
  await patchShellState({ phase: "speaking", phrase: "Озвучиваю ответ…" });

  await new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(payload);
    utterance.lang = "ru-RU";
    utterance.rate = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.speak(utterance);
  });

  state.speaking = false;
  await patchShellState({ phase: "waiting", phrase: "Готов к сообщению" });
}

let lastHandledAssistantId = "";
let lastSpokenBody = "";
let lastHandledStreamId = "";
let lastStreamHandledBody = "";
const outboundQueue = [];

async function handleAssistantMessage(message) {
  const body = String(message?.body || message?.message?.body || "").trim();
  if (!body) return;
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
    const speech = toSpeechText(body);
    if (!speech) {
      releaseMessagePipeline();
      return;
    }
    if (speech === lastSpokenBody && state.speaking) return;
    lastSpokenBody = speech;
    await speakText(speech);
    releaseMessagePipeline();
  } else if (!state.messagePipelineBusy) {
    releaseMessagePipeline();
  }
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
      onShellPhaseChange(entry.payload || entry);
    } catch {
      // ignore malformed event
    }
  });

  source.addEventListener("stop_tts", () => {
    stopBrowserTts();
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
  recognition.lang = "ru-RU";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  state.recognition = recognition;

  recognition.onstart = () => {
    state.micActive = true;
    setMicButtonState("Стоп", { active: true });
    void patchShellState({ phase: "listening", phrase: "Говорите…" });
  };

  recognition.onend = () => {
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
        await sendMessage(text);
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
  if (mode === "sidecar" || mode === "always") {
    if (!state.sidecarConnected) {
      renderPhase("disabled", "Sidecar не запущен — npm run shell:sidecar");
      return;
    }
    const nextHeld = !state.pttHeld;
    void apiFetch("/api/shell/ptt", {
      method: "POST",
      body: JSON.stringify({ held: nextHeld })
    })
      .then((data) => {
        state.pttHeld = Boolean(data.held);
        setMicButtonState(state.pttHeld ? "Стоп" : "Говорить", { active: state.pttHeld });
        renderPhase(
          state.pttHeld ? "listening" : "thinking",
          state.pttHeld ? "Sidecar слушает…" : "Распознаю…"
        );
      })
      .catch((error) => renderPhase("waiting", error.message));
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
}

function bindNavigationUi() {
  nodes.settingsBtn?.addEventListener("click", () => setShellView("settings"));
  nodes.homeBtn?.addEventListener("click", () => setShellView("main"));
  nodes.sessionToggle?.addEventListener("click", () => setChatPanel(!state.chatOpen));
  nodes.routeToggle?.addEventListener("click", () => setRouteDrawer(!state.routeOpen));
  nodes.watchCamera?.addEventListener("click", () => {
    void toggleWatchCamera().catch((error) => renderPhase("waiting", error.message));
  });
  nodes.watchScreen?.addEventListener("click", () => {
    void toggleWatchScreen().catch((error) => renderPhase("waiting", error.message));
  });
}

function bindWindowSettingsUi() {
  const persistWindowSettings = () => {
    const windowBackground = nodes.windowBackground?.value || "wallpaper";
    const windowTransparent =
      nodes.windowTransparent?.checked === true || windowBackground === "transparent";
    if (nodes.windowTransparent) {
      nodes.windowTransparent.checked = windowTransparent;
    }
    if (nodes.windowBackground) {
      nodes.windowBackground.disabled = windowTransparent && nodes.windowTransparent?.checked === true;
    }
    void saveWindowSettings({
      windowTopmost: nodes.topmost?.checked !== false,
      windowTransparent,
      windowBackground: windowTransparent ? "transparent" : windowBackground,
      windowCompact: nodes.windowCompact?.checked === true
    }).catch((error) => renderPhase("waiting", error.message));
  };

  nodes.topmost?.addEventListener("change", persistWindowSettings);
  nodes.windowCompact?.addEventListener("change", persistWindowSettings);
  nodes.windowTransparent?.addEventListener("change", () => {
    if (!nodes.windowTransparent.checked && nodes.windowBackground?.value === "transparent") {
      nodes.windowBackground.value = "wallpaper";
    }
    persistWindowSettings();
  });
  nodes.windowBackground?.addEventListener("change", persistWindowSettings);
}

function bindUi() {
  const persistSettings = () => {
    const voiceMode = nodes.voiceMode.value;
    const messageTarget = nodes.messageTarget.value;
    updateTargetUi(messageTarget);
    void saveSettings({
      messageTarget,
      qwenpawBaseUrl: nodes.qwenpawUrl.value.trim() || "http://127.0.0.1:8088",
      qwenpawAgentId: nodes.qwenpawAgentId.value.trim() || "default",
      topicPath: topicPicker.getValue(),
      ttsEnabled: nodes.ttsEnabled.checked,
      voiceInputMode: voiceMode,
      ttsEngine: voiceMode === "sidecar" || voiceMode === "always" ? "say" : "browser",
      cameraEnabled: nodes.cameraEnabled?.checked === true,
      cameraOnSpeech: nodes.cameraOnSpeech?.checked !== false,
      cameraFacing: nodes.cameraFacing?.value || "user",
      cameraDeviceId: nodes.cameraFacing?.value === "device" ? nodes.cameraDevice?.value || "" : "",
      screenEnabled: nodes.screenEnabled?.checked === true,
      screenOnSpeech: nodes.screenOnSpeech?.checked !== false
    }).catch((error) => renderPhase("waiting", error.message));
  };

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

  nodes.messageTarget.addEventListener("change", persistSettings);
  nodes.qwenpawUrl.addEventListener("change", persistSettings);
  nodes.qwenpawOpenUrl?.addEventListener("click", openQwenPawInBrowser);
  nodes.qwenpawAgentId.addEventListener("change", persistSettings);
  nodes.ttsEnabled.addEventListener("change", persistSettings);
  nodes.voiceMode.addEventListener("change", persistSettings);

  nodes.sendBtn.addEventListener("click", () => void sendMessage(nodes.message.value));
  nodes.message.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void sendMessage(nodes.message.value);
    }
  });

  nodes.micBtn.addEventListener("click", toggleMic);
  nodes.stopTtsBtn.addEventListener("click", async () => {
    stopBrowserTts();
    await apiFetch("/api/shell/stop-tts", { method: "POST", body: "{}" });
  });

  nodes.openCmsBtn.addEventListener("click", () => {
    const url = state.agentId ? `/a/${encodeURIComponent(state.agentId)}` : "/";
    window.open(url, "_blank");
  });

  nodes.qwenpawNewChat?.addEventListener("click", () => {
    void startNewQwenPawChat().catch((error) => renderPhase("waiting", error.message));
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
  bindUi();
  bindNavigationUi();
  bindWindowSettingsUi();
  setupSpeechRecognition();
  startClock();
  void initBatteryMonitor();
  void initShellCharacter(nodes.characterStage, nodes.agentAvatar);
  try {
    await resolveShellAgent();
    await topicPicker.refresh();
    await loadWindowSettings();
    await refreshStatus();
    connectStream();
  } catch (error) {
    renderPhase("waiting", error.message);
  }
}

void boot();
