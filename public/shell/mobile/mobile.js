import { prepareSpeechText } from "/shell/shell-reply.js?v=12";
import { shellPhaseLabel, shellRouteLabel } from "/shell/shell-contract.js?v=1";
import { ShellClient } from "/shell/shell-client.js?v=1";
import { loadAgentSelectData, populateAgentSelect } from "/shared/agent-select.js";

const AGENT_KEY = "agentcms.shellAgent.mobile.v1";
const TTS_KEY = "agentcms.shellMobile.tts.v1";

const state = {
  agentId: localStorage.getItem(AGENT_KEY) || "agent-cms-test",
  ttsEnabled: localStorage.getItem(TTS_KEY) !== "0",
  client: null,
  recognition: null,
  micHeld: false,
  isSending: false,
  streamBuffer: "",
  lastSpoken: "",
  lastMessageId: "",
  agentsLoaded: false,
  agentOptions: { agents: [], groups: [], defaultAgentId: "" }
};

const nodes = {
  connection: document.getElementById("mobile-connection"),
  route: document.getElementById("mobile-route"),
  server: document.getElementById("mobile-server"),
  phase: document.getElementById("mobile-phase"),
  phaseLabel: document.getElementById("mobile-phase-label"),
  phrase: document.getElementById("mobile-phrase"),
  mic: document.getElementById("mobile-mic"),
  micHint: document.getElementById("mobile-mic-hint"),
  stopTts: document.getElementById("mobile-stop-tts"),
  reply: document.getElementById("mobile-reply"),
  compose: document.getElementById("mobile-compose"),
  input: document.getElementById("mobile-input"),
  sendBtn: document.getElementById("mobile-send-btn"),
  error: document.getElementById("mobile-error"),
  reconnectBtn: document.getElementById("mobile-reconnect-btn"),
  settingsBtn: document.getElementById("mobile-settings-btn"),
  settingsDialog: document.getElementById("mobile-settings-dialog"),
  settingsForm: document.getElementById("mobile-settings-form"),
  settingsCancel: document.getElementById("mobile-settings-cancel"),
  agentSelect: document.getElementById("mobile-agent-select"),
  ttsEnabled: document.getElementById("mobile-tts-enabled"),
  helpUrl: document.getElementById("mobile-help-url")
};

function setError(message) {
  if (!message) {
    nodes.error.classList.add("hidden");
    nodes.error.textContent = "";
    return;
  }
  nodes.error.textContent = message;
  nodes.error.classList.remove("hidden");
}

function renderPhase(phase, phrase = "") {
  const key = phase || "waiting";
  nodes.phase.dataset.phase = key;
  nodes.phaseLabel.textContent = shellPhaseLabel(key);
  nodes.phrase.textContent = phrase || "";
}

function renderReply(text) {
  nodes.reply.textContent = text?.trim() ? text : "—";
}

function renderRoute(messageTarget, qwenpawOk) {
  const label = shellRouteLabel(messageTarget);
  nodes.route.textContent = qwenpawOk === false && messageTarget?.startsWith("qwenpaw")
    ? `${label} · offline`
    : label;
  nodes.route.dataset.ok = qwenpawOk === false ? "0" : "1";
}

function setConnection(stateName) {
  const host = window.location.host;
  nodes.server.textContent = host;
  if (stateName === "live") {
    nodes.connection.textContent = `Live · ${host}`;
    return;
  }
  if (stateName === "error") {
    nodes.connection.textContent = `Обрыв SSE · ${host}`;
    return;
  }
  nodes.connection.textContent = stateName === "offline" ? "Отключено" : `Подключение… · ${host}`;
}

function setSending(busy) {
  state.isSending = busy;
  nodes.mic.disabled = busy;
  nodes.sendBtn.disabled = busy;
  nodes.micHint.textContent = busy ? "Агент думает…" : "Удерживайте для записи";
}

function createClient() {
  state.client?.disconnectStream();
  state.client = new ShellClient({
    agentId: state.agentId,
    onConnectionChange: ({ state: connState }) => setConnection(connState),
    onStreamEvent: (event) => handleStreamEvent(event)
  });
  return state.client;
}

function handleStreamEvent(event) {
  if (event.type === "status") {
    applyStatus(event.status);
    return;
  }
  if (event.type === "state") {
    renderPhase(event.state?.phase, event.state?.phrase);
    if (event.state?.lastShellReply) renderReply(event.state.lastShellReply);
    return;
  }
  if (event.type === "assistant_message") {
    handleAssistantMessage(event.message);
    return;
  }
  if (event.type === "assistant_delta") {
    const chunk = event.delta?.delta || event.delta?.body || "";
    if (!chunk) return;
    state.streamBuffer += chunk;
    renderReply(state.streamBuffer);
  }
}

function applyStatus(status) {
  const applied = ShellClient.applyStatus(status);
  renderPhase(applied.phase, applied.phrase);
  if (applied.reply) {
    state.streamBuffer = "";
    renderReply(applied.reply);
  }
  renderRoute(applied.messageTarget, applied.qwenpawOk);
}

function handleAssistantMessage(message) {
  const id = message?.id || "";
  const body = String(message?.body || "").trim();
  if (!body || (id && id === state.lastMessageId)) return;
  state.lastMessageId = id;
  state.streamBuffer = "";
  state.isSending = false;
  setSending(false);
  renderReply(body);
  speakReply(body);
}

function speakReply(body) {
  if (!state.ttsEnabled || !window.speechSynthesis) return;
  const text = prepareSpeechText(body, { ttsStripEmoji: true });
  if (!text || text === state.lastSpoken) return;
  state.lastSpoken = text;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "ru-RU";
  utterance.onstart = () => {
    nodes.stopTts.classList.remove("hidden");
    renderPhase("speaking");
  };
  utterance.onend = finishSpeaking;
  utterance.onerror = finishSpeaking;
  window.speechSynthesis.speak(utterance);
}

function finishSpeaking() {
  nodes.stopTts.classList.add("hidden");
  renderPhase("waiting");
}

async function stopSpeaking() {
  window.speechSynthesis?.cancel();
  finishSpeaking();
  try {
    await state.client?.stopTts();
  } catch {
    // ignore
  }
}

async function sendMessage(body, { voice = false } = {}) {
  const text = String(body || "").trim();
  if (!text || state.isSending) return;

  setError("");
  setSending(true);
  state.streamBuffer = "";
  renderPhase("thinking", text.slice(0, 240));
  window.speechSynthesis?.cancel();
  finishSpeaking();

  try {
    await state.client.sendMessage(text, { voice });
  } catch (error) {
    setSending(false);
    renderPhase("waiting");
    setError(error.message);
  }
}

function getRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  if (!state.recognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "ru-RU";
    recognition.interimResults = true;
    recognition.continuous = false;
    state.recognition = recognition;
  }
  return state.recognition;
}

function bindMic() {
  const recognition = getRecognition();
  if (!recognition) {
    nodes.mic.disabled = true;
    setError("Web Speech API недоступен. Разрешите микрофон или используйте iOS-приложение.");
    return;
  }

  let finalText = "";

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
    nodes.mic.dataset.recording = "0";
    state.micHeld = false;
    renderPhase("waiting");
    if (event.error === "not-allowed") {
      setError("Нет доступа к микрофону. Настройки → Safari → Микрофон.");
    }
  };

  recognition.onend = async () => {
    nodes.mic.dataset.recording = "0";
    state.micHeld = false;
    const text = (finalText || nodes.phrase.textContent || "").trim();
    finalText = "";
    if (text) await sendMessage(text, { voice: true });
    else if (!state.isSending) renderPhase("waiting");
  };

  const start = () => {
    if (state.micHeld || state.isSending) return;
    state.micHeld = true;
    finalText = "";
    nodes.mic.dataset.recording = "1";
    renderPhase("listening", "Слушаю…");
    setError("");
    try {
      recognition.start();
    } catch {
      state.micHeld = false;
      nodes.mic.dataset.recording = "0";
    }
  };

  const stop = () => {
    if (!state.micHeld) return;
    try {
      recognition.stop();
    } catch {
      state.micHeld = false;
      nodes.mic.dataset.recording = "0";
    }
  };

  nodes.mic.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    start();
  });
  nodes.mic.addEventListener("pointerup", stop);
  nodes.mic.addEventListener("pointerleave", stop);
  nodes.mic.addEventListener("pointercancel", stop);
}

function bindCompose() {
  nodes.compose.addEventListener("submit", async (event) => {
    event.preventDefault();
    const text = nodes.input.value;
    nodes.input.value = "";
    await sendMessage(text, { voice: false });
  });
}

async function loadAgentsIntoSettings() {
  try {
    state.agentOptions = await loadAgentSelectData();
    state.agentsLoaded = true;
    populateAgentSelect(nodes.agentSelect, {
      agents: state.agentOptions.agents,
      groups: state.agentOptions.groups,
      selectedId: state.agentId,
      includePlaceholder: false
    });
  } catch {
    nodes.agentSelect.innerHTML = `<option value="${state.agentId}">${state.agentId}</option>`;
  }
}

function bindSettings() {
  nodes.settingsBtn.addEventListener("click", async () => {
    if (!state.agentsLoaded) await loadAgentsIntoSettings();
    nodes.agentSelect.value = state.agentId;
    nodes.ttsEnabled.checked = state.ttsEnabled;
    nodes.helpUrl.textContent = `Текущий URL: ${window.location.origin}/shell/mobile/`;
    nodes.settingsDialog.showModal();
  });

  nodes.settingsCancel.addEventListener("click", () => nodes.settingsDialog.close());

  nodes.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.agentId = nodes.agentSelect.value.trim() || "agent-cms-test";
    state.ttsEnabled = Boolean(nodes.ttsEnabled.checked);
    localStorage.setItem(AGENT_KEY, state.agentId);
    localStorage.setItem(TTS_KEY, state.ttsEnabled ? "1" : "0");
    nodes.settingsDialog.close();
    reconnect();
  });
}

function bindActions() {
  nodes.reconnectBtn.addEventListener("click", () => reconnect());
  nodes.stopTts.addEventListener("click", () => void stopSpeaking());

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") reconnect({ soft: true });
  });
}

async function refreshStatus() {
  try {
    const status = await state.client.fetchStatus();
    applyStatus(status);
    setError("");
  } catch (error) {
    setConnection("error");
    setError(error.message);
  }
}

function reconnect({ soft = false } = {}) {
  if (!soft) setConnection("offline");
  createClient();
  state.client.connectStream();
  refreshStatus();
}

bindMic();
bindCompose();
bindSettings();
bindActions();
reconnect();

if (!state.agentId && state.agentOptions.defaultAgentId) {
  state.agentId = state.agentOptions.defaultAgentId;
}
