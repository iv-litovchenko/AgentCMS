import { loadAgentSelectData, getSelectableAgents } from "/shared/agent-select.js";
import { createTopicPicker } from "/shell/topic-picker.js";

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
  stopTtsAt: 0
};

const nodes = {
  messageTarget: document.getElementById("shell-message-target"),
  qwenpawPanel: document.getElementById("shell-qwenpaw-panel"),
  qwenpawUrl: document.getElementById("shell-qwenpaw-url"),
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
  voiceMode: document.getElementById("shell-voice-mode"),
  message: document.getElementById("shell-message"),
  sendBtn: document.getElementById("shell-send-btn"),
  micBtn: document.getElementById("shell-mic-btn"),
  stopTtsBtn: document.getElementById("shell-stop-tts"),
  openCmsBtn: document.getElementById("shell-open-cms"),
  phaseLabel: document.getElementById("shell-phase-label"),
  phrase: document.getElementById("shell-phrase"),
  meta: document.getElementById("shell-meta"),
  pulse: document.getElementById("shell-pulse"),
  lastReply: document.getElementById("shell-last-reply")
};

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

function renderPhase(phase, phrase = "", metrics = "") {
  const normalized = PHASE_LABELS[phase] ? phase : "waiting";
  nodes.phaseLabel.textContent = PHASE_LABELS[normalized];
  nodes.phrase.textContent = phrase || "Готов к сообщению";
  nodes.meta.textContent = metrics || "";
  nodes.pulse.dataset.phase = normalized;
}

function applySettings(settings) {
  state.settings = settings;
  nodes.messageTarget.value = settings.messageTarget || "cms";
  nodes.qwenpawUrl.value = settings.qwenpawBaseUrl || "http://127.0.0.1:8088";
  nodes.qwenpawAgentId.value = settings.qwenpawAgentId || "default";
  topicPicker.setValue(settings.topicPath || "");
  nodes.ttsEnabled.checked = settings.ttsEnabled !== false;
  nodes.topmost.checked = settings.windowTopmost !== false;
  nodes.voiceMode.value = settings.voiceInputMode || "browser";
  document.body.style.opacity = settings.windowTopmost === false ? "0.98" : "1";
  updateTargetUi(settings.messageTarget || "cms");
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
  nodes.lastReply.textContent = "—";
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
  nodes.lastReply.textContent = "—";
  lastHandledAssistantId = "";
  setQwenPawChatsOpen(false);
  renderPhase("waiting", `Чат: ${data.chatName || data.sessionId}`);
  if (state.qwenpawChatsOpen) await loadQwenPawChats();
}

function applyStatusPayload(payload) {
  if (payload?.settings) applySettings(payload.settings);
  if (payload?.state) {
    state.shellState = payload.state;
    state.stopTtsAt = Number(payload.state.stopTtsAt) || 0;
    state.pttHeld = Boolean(payload.state.pttHeld);
    renderPhase(payload.state.phase, payload.state.phrase, payload.state.metrics);
    if (state.pttHeld) nodes.micBtn.textContent = "⏹ Стоп";
    else if (!state.micActive) nodes.micBtn.textContent = "🎤 Говорить";
  }
  state.sidecarConnected = Boolean(payload?.sidecarConnected);
  state.qwenpawConnected = Boolean(payload?.qwenpaw?.ok);
  updateQwenPawChatUi(payload);
  if (payload?.latestAgentMessage?.body) {
    nodes.lastReply.textContent = payload.latestAgentMessage.body;
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
  nodes.sendBtn.disabled = true;
  try {
    await patchShellState({ phase: "thinking", phrase: text.slice(0, 240) });
    const result = await apiFetch("/api/shell/message", {
      method: "POST",
      body: JSON.stringify({ body: text, author: "shell" })
    });
    nodes.message.value = "";
    if (result?.reply || result?.message?.body) {
      await handleAssistantMessage(result.message || { body: result.reply });
    } else {
      await refreshStatus();
    }
  } catch (error) {
    renderPhase("waiting", error.message);
  } finally {
    nodes.sendBtn.disabled = false;
  }
}

function getSpeechSynth() {
  return window.speechSynthesis || null;
}

function stopBrowserTts() {
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
  await patchShellState({ phase: "speaking", phrase: payload.slice(0, 240) });

  await new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(payload);
    utterance.lang = "ru-RU";
    utterance.rate = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    synth.speak(utterance);
  });

  state.speaking = false;
  await patchShellState({ phase: "waiting", phrase: payload.slice(0, 240) });
}

let lastHandledAssistantId = "";
let lastSpokenBody = "";

async function handleAssistantMessage(message) {
  const body = String(message?.body || message?.message?.body || "").trim();
  if (!body) return;
  const messageId = String(message?.id || message?.message?.id || body.slice(0, 120));
  if (messageId && messageId === lastHandledAssistantId) return;
  lastHandledAssistantId = messageId;
  nodes.lastReply.textContent = body;
  if (state.settings?.ttsEnabled) {
    if (body === lastSpokenBody && state.speaking) return;
    lastSpokenBody = body;
    await speakText(body);
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
      void handleAssistantMessage(payload.message || payload);
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
    nodes.micBtn.textContent = "⏹ Стоп";
    void patchShellState({ phase: "listening", phrase: "Говорите…" });
  };

  recognition.onend = () => {
    state.micActive = false;
    nodes.micBtn.textContent = "🎤 Говорить";
    if (!state.speaking) void patchShellState({ phase: "waiting", phrase: "Готов к сообщению" });
  };

  recognition.onerror = (event) => {
    renderPhase("waiting", event.error || "Ошибка распознавания");
  };

  recognition.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript || "";
    if (text) {
      nodes.message.value = text;
      void sendMessage(text);
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
        nodes.micBtn.textContent = state.pttHeld ? "⏹ Стоп" : "🎤 Говорить";
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
      windowTopmost: nodes.topmost.checked,
      voiceInputMode: voiceMode,
      ttsEngine: voiceMode === "sidecar" || voiceMode === "always" ? "say" : "browser"
    }).catch((error) => renderPhase("waiting", error.message));
  };

  nodes.messageTarget.addEventListener("change", persistSettings);
  nodes.qwenpawUrl.addEventListener("change", persistSettings);
  nodes.qwenpawAgentId.addEventListener("change", persistSettings);
  nodes.ttsEnabled.addEventListener("change", persistSettings);
  nodes.topmost.addEventListener("change", persistSettings);
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
  setupSpeechRecognition();
  try {
    await resolveShellAgent();
    await topicPicker.refresh();
    await refreshStatus();
    connectStream();
  } catch (error) {
    renderPhase("waiting", error.message);
  }
}

void boot();
