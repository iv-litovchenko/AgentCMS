const fs = require("fs/promises");
const path = require("path");
const { EventEmitter } = require("events");
const { chatWithQwenPaw, checkQwenPawHealth, listQwenPawChats, createQwenPawChat, buildNewShellSessionId } = require("./qwenpaw-client");
const { createSnapshotRequestService, parseDataUrl } = require("./shell-snapshot");

const SETTINGS_DIR = ".agent-shell";
const SETTINGS_FILE = "settings.json";
const STATE_FILE = "state.json";

const PHASE_WAITING = "waiting";
const PHASE_LISTENING = "listening";
const PHASE_THINKING = "thinking";
const PHASE_SPEAKING = "speaking";
const PHASE_DISABLED = "disabled";

const DEFAULT_SETTINGS = {
  topicPath: "awn-agent-kit/agent/manifest.md",
  messageChannel: "thread",
  messageTarget: "qwenpaw",
  qwenpawBaseUrl: "http://127.0.0.1:8088",
  qwenpawAgentId: "default",
  qwenpawSessionId: "agent-shell",
  qwenpawUserId: "shell",
  qwenpawChatName: "",
  voiceInputMode: "browser",
  voiceResponseEnabled: true,
  ttsEnabled: true,
  ttsEngine: "browser",
  windowTopmost: true,
  cameraEnabled: false,
  cameraOnSpeech: true,
  cameraFacing: "user",
  cameraDeviceId: "",
  screenEnabled: false,
  screenOnSpeech: true
};

const DEFAULT_STATE = {
  phase: PHASE_WAITING,
  phrase: "",
  metrics: "",
  lastAgentMessageId: "",
  lastShellReply: "",
  stopTtsAt: 0,
  sidecarSeenAt: 0,
  pttHeld: false,
  updatedAt: ""
};

const SIDECAR_TTL_MS = 8000;

const SHELL_SHOW_DEMO_RE = /^(демо|demo|пример)(\s+[\wа-яё-]+)?$/i;
const SHELL_SHOW_VIDEO_RE = /\b(видео|video)\b/i;

function isShellShowDemoRequest(text) {
  const trimmed = String(text || "").trim();
  if (!SHELL_SHOW_DEMO_RE.test(trimmed)) return false;
  return (
    SHELL_SHOW_VIDEO_RE.test(trimmed) ||
    /\b(картин|изображ|show|media|картинку|картинка|картинки|image|picture)\b/i.test(trimmed) ||
    /^(демо|demo|пример)$/i.test(trimmed)
  );
}

function shellShowDemoKind(text) {
  return SHELL_SHOW_VIDEO_RE.test(String(text || "")) ? "video" : "image";
}

function buildShellShowDemoReply(kind = "image") {
  if (kind === "video") {
    return `Пример: агент может показать видео прямо в Shell.

[show]
type: video
src: /shell/demo.mp4
caption: Демо-ролик Agent Shell
[/show]

Блок [show] не попадает в озвучку — только текст выше.`;
  }

  return `Пример: агент может показать картинку прямо в Shell.

[show]
type: image
src: /shell/wallpaper.png
caption: Горы и храм — обои Agent Shell
[/show]

Блок [show] не попадает в озвучку — только текст выше.`;
}

function buildShellShowDemoResult(text) {
  const reply = buildShellShowDemoReply(shellShowDemoKind(text));
  return {
    channel: "shell-demo",
    reply,
    message: {
      id: `shell-show-demo-${Date.now()}`,
      body: reply,
      role: "agent",
      author: "shell-demo",
      created: new Date().toISOString()
    }
  };
}

const bus = new EventEmitter();
bus.setMaxListeners(100);

function settingsAbsolute(agentRoot) {
  return path.join(agentRoot, SETTINGS_DIR, SETTINGS_FILE);
}

function stateAbsolute(agentRoot) {
  return path.join(agentRoot, SETTINGS_DIR, STATE_FILE);
}

function normalizeSettings(raw) {
  const merged = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === "object" ? raw : {}) };
  if (!String(merged.topicPath || "").trim()) merged.topicPath = DEFAULT_SETTINGS.topicPath;
  if (!["thread", "inbox"].includes(merged.messageChannel)) merged.messageChannel = "thread";
  if (!["cms", "qwenpaw", "qwenpaw-log"].includes(merged.messageTarget)) {
    merged.messageTarget = DEFAULT_SETTINGS.messageTarget;
  }
  merged.qwenpawBaseUrl = String(merged.qwenpawBaseUrl || DEFAULT_SETTINGS.qwenpawBaseUrl).trim()
    || DEFAULT_SETTINGS.qwenpawBaseUrl;
  merged.qwenpawAgentId = String(merged.qwenpawAgentId || DEFAULT_SETTINGS.qwenpawAgentId).trim()
    || DEFAULT_SETTINGS.qwenpawAgentId;
  merged.qwenpawSessionId = String(merged.qwenpawSessionId || DEFAULT_SETTINGS.qwenpawSessionId).trim()
    || DEFAULT_SETTINGS.qwenpawSessionId;
  merged.qwenpawUserId = String(merged.qwenpawUserId || DEFAULT_SETTINGS.qwenpawUserId).trim()
    || DEFAULT_SETTINGS.qwenpawUserId;
  merged.qwenpawChatName = String(merged.qwenpawChatName || "").trim();
  if (!["disabled", "browser", "sidecar", "always"].includes(merged.voiceInputMode)) {
    merged.voiceInputMode = "browser";
  }
  if (!["browser", "sidecar", "say"].includes(merged.ttsEngine)) merged.ttsEngine = "browser";
  merged.voiceResponseEnabled = Boolean(merged.voiceResponseEnabled);
  merged.ttsEnabled = Boolean(merged.ttsEnabled);
  merged.windowTopmost = merged.windowTopmost !== false;
  merged.cameraEnabled = Boolean(merged.cameraEnabled);
  merged.cameraOnSpeech = merged.cameraOnSpeech !== false;
  if (!["user", "environment", "device"].includes(merged.cameraFacing)) {
    merged.cameraFacing = "user";
  }
  merged.cameraDeviceId = String(merged.cameraDeviceId || "").trim();
  merged.screenEnabled = Boolean(merged.screenEnabled);
  merged.screenOnSpeech = merged.screenOnSpeech !== false;
  return merged;
}

async function readSettings(agentRoot) {
  try {
    const raw = await fs.readFile(settingsAbsolute(agentRoot), "utf-8");
    return normalizeSettings(JSON.parse(raw));
  } catch {
    return normalizeSettings({});
  }
}

async function writeSettings(agentRoot, patch, agentId) {
  const current = await readSettings(agentRoot);
  const next = normalizeSettings({ ...current, ...(patch && typeof patch === "object" ? patch : {}) });
  await fs.mkdir(path.join(agentRoot, SETTINGS_DIR), { recursive: true });
  const tmp = `${settingsAbsolute(agentRoot)}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  await fs.rename(tmp, settingsAbsolute(agentRoot));
  emitShellEvent(agentId, "settings", next);
  return next;
}

async function readPersistedState(agentRoot) {
  try {
    const raw = await fs.readFile(stateAbsolute(agentRoot), "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...(parsed && typeof parsed === "object" ? parsed : {}) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function writePersistedState(agentRoot, state) {
  const dir = path.join(agentRoot, SETTINGS_DIR);
  await fs.mkdir(dir, { recursive: true });
  const target = stateAbsolute(agentRoot);
  const payload = `${JSON.stringify(state, null, 2)}\n`;
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, payload, "utf-8");
  try {
    await fs.rename(tmp, target);
  } catch {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(target, payload, "utf-8");
    await fs.unlink(tmp).catch(() => {});
  }
}

async function getState(agentRoot) {
  const state = await readPersistedState(agentRoot);
  if (!state.updatedAt) state.updatedAt = new Date().toISOString();
  return state;
}

async function patchState(agentRoot, agentId, patch) {
  const current = await getState(agentRoot);
  const next = {
    ...current,
    ...(patch && typeof patch === "object" ? patch : {}),
    updatedAt: new Date().toISOString()
  };
  await writePersistedState(agentRoot, next);
  emitShellEvent(agentId, "state", next);
  return next;
}

function emitShellEvent(agentId, type, payload) {
  bus.emit("event", {
    agentId: String(agentId || ""),
    type,
    payload,
    at: new Date().toISOString()
  });
}

function subscribeShellEvents(listener) {
  bus.on("event", listener);
  return () => bus.off("event", listener);
}

const cameraSnapshots = createSnapshotRequestService({
  emitShellEvent,
  eventName: "camera_snapshot_request",
  requestPrefix: "cam",
  timeoutMessage:
    "Camera snapshot timed out — откройте Agent Shell, включите камеру и разрешите доступ"
});

const screenSnapshots = createSnapshotRequestService({
  emitShellEvent,
  eventName: "screen_snapshot_request",
  requestPrefix: "scr",
  timeoutMessage:
    "Screen snapshot timed out — откройте Agent Shell, включите демонстрацию экрана и выберите окно"
});

async function requestCameraSnapshot(agentId, agentRoot, options = {}) {
  const snapshot = await cameraSnapshots.requestSnapshot(agentId, options);
  const meta = await cameraSnapshots.saveSnapshotFile(agentRoot, "camera", "manual", snapshot);
  const parsed = parseDataUrl(snapshot.dataUrl);
  return {
    ok: true,
    ...meta,
    base64: parsed?.base64 || "",
    dataUrl: snapshot.dataUrl
  };
}

async function requestScreenSnapshot(agentId, agentRoot, options = {}) {
  const snapshot = await screenSnapshots.requestSnapshot(agentId, options);
  const meta = await screenSnapshots.saveSnapshotFile(agentRoot, "screen", "manual", snapshot);
  const parsed = parseDataUrl(snapshot.dataUrl);
  return {
    ok: true,
    ...meta,
    base64: parsed?.base64 || "",
    dataUrl: snapshot.dataUrl
  };
}

function completeCameraSnapshotRequest(agentId, requestId, snapshot) {
  return cameraSnapshots.completeSnapshot(agentId, requestId, snapshot);
}

function completeScreenSnapshotRequest(agentId, requestId, snapshot) {
  return screenSnapshots.completeSnapshot(agentId, requestId, snapshot);
}

async function saveStoredSnapshot(agentRoot, domain, snapshot) {
  const kind = snapshot?.kind === "manual" ? "manual" : "speech";
  const service = domain === "screen" ? screenSnapshots : cameraSnapshots;
  return service.saveSnapshotFile(agentRoot, domain, kind, snapshot);
}

async function saveSpeechCameraSnapshot(agentRoot, snapshot) {
  return saveStoredSnapshot(agentRoot, "camera", snapshot);
}

async function saveSpeechScreenSnapshot(agentRoot, snapshot) {
  return saveStoredSnapshot(agentRoot, "screen", snapshot);
}

async function getLatestCameraSnapshot(agentRoot, kind = "manual") {
  return cameraSnapshots.readLatestSnapshot(agentRoot, "camera", kind);
}

async function getLatestScreenSnapshot(agentRoot, kind = "manual") {
  return screenSnapshots.readLatestSnapshot(agentRoot, "screen", kind);
}

async function sendUserMessage(deps, { agentRoot, settings, body, author }) {
  const text = String(body || "").trim();
  if (!text) throw new Error("Message body is required");

  const topicPath = String(settings.topicPath || DEFAULT_SETTINGS.topicPath).trim();
  if (settings.messageChannel === "inbox") {
    const item = await deps.createInboxItem({
      manifestRelPath: topicPath,
      title: text.slice(0, 120),
      body: text,
      source: "agent-shell",
      author: author || "user"
    });
    return { channel: "inbox", topicPath, item };
  }

  const message = await deps.appendTopicThreadMessage({
    manifestRelPath: topicPath,
    body: text,
    role: "user",
    author: author || "shell",
    linkedFiles: "",
    mode: "description",
    file: "",
    systemName: ""
  });
  return { channel: "thread", topicPath, message };
}

function usesQwenPaw(settings) {
  const target = String(settings?.messageTarget || DEFAULT_SETTINGS.messageTarget);
  return target === "qwenpaw" || target === "qwenpaw-log";
}

function shouldLogToCms(settings) {
  const target = String(settings?.messageTarget || DEFAULT_SETTINGS.messageTarget);
  return target === "cms" || target === "qwenpaw-log";
}

function buildQwenPawSessionId(settings, agentId) {
  const configured = String(settings?.qwenpawSessionId || DEFAULT_SETTINGS.qwenpawSessionId).trim();
  if (configured && configured !== DEFAULT_SETTINGS.qwenpawSessionId) return configured;
  return `agent-shell-${String(agentId || "default")}`;
}

async function fetchQwenPawChats(settings) {
  return listQwenPawChats({
    baseUrl: settings.qwenpawBaseUrl,
    agentId: settings.qwenpawAgentId,
    userId: settings.qwenpawUserId,
    channel: "console"
  });
}

async function resolveQwenPawChatName(settings, sessionId) {
  const chats = await fetchQwenPawChats(settings);
  const match = chats.find((chat) => String(chat?.session_id || "") === String(sessionId || ""));
  return match?.name || settings.qwenpawChatName || sessionId;
}

async function startNewQwenPawChat(agentRoot, agentId, settings, { name } = {}) {
  if (!usesQwenPaw(settings)) throw new Error("QwenPaw mode is not enabled");

  const sessionId = buildNewShellSessionId(agentId);
  const chatName = String(name || "Новый чат").trim() || "Новый чат";

  try {
    await createQwenPawChat({
      baseUrl: settings.qwenpawBaseUrl,
      agentId: settings.qwenpawAgentId,
      sessionId,
      userId: settings.qwenpawUserId,
      channel: "console",
      name: chatName
    });
  } catch {
    // First message also creates the chat — registration is optional.
  }

  const nextSettings = await writeSettings(
    agentRoot,
    { qwenpawSessionId: sessionId, qwenpawChatName: chatName },
    agentId
  );

  return { sessionId, chatName, settings: nextSettings };
}

async function selectQwenPawChat(agentRoot, agentId, settings, { sessionId, chatName }) {
  if (!usesQwenPaw(settings)) throw new Error("QwenPaw mode is not enabled");
  const nextSessionId = String(sessionId || "").trim();
  if (!nextSessionId) throw new Error("sessionId is required");

  const resolvedName =
    String(chatName || "").trim() ||
    (await resolveQwenPawChatName(settings, nextSessionId).catch(() => "")) ||
    nextSessionId;

  const nextSettings = await writeSettings(
    agentRoot,
    { qwenpawSessionId: nextSessionId, qwenpawChatName: resolvedName },
    agentId
  );

  return { sessionId: nextSessionId, chatName: resolvedName, settings: nextSettings };
}

async function sendToQwenPaw(deps, { agentRoot, agentId, settings, body, onProgress }) {
  const text = String(body || "").trim();
  if (!text) throw new Error("Message body is required");

  const topicPath = String(settings.topicPath || DEFAULT_SETTINGS.topicPath).trim();
  let userMessage = null;

  if (shouldLogToCms(settings)) {
    userMessage = await sendUserMessage(deps, {
      agentRoot,
      settings,
      body: text,
      author: "shell"
    });
  }

  const sessionId = buildQwenPawSessionId(settings, agentId);
  const reply = await chatWithQwenPaw({
    baseUrl: settings.qwenpawBaseUrl,
    agentId: settings.qwenpawAgentId,
    sessionId,
    userId: settings.qwenpawUserId,
    text,
    onEvent: (event) => {
      if (typeof onProgress !== "function") return;
      const status = String(event?.status || "").toLowerCase();
      if (status === "in_progress" || status === "created") {
        onProgress({ phase: PHASE_THINKING, status });
      }
    }
  });

  let agentMessage = null;
  if (shouldLogToCms(settings)) {
    agentMessage = await deps.appendTopicThreadMessage({
      manifestRelPath: topicPath,
      body: reply.text,
      role: "agent",
      author: "qwenpaw",
      linkedFiles: "",
      mode: "description",
      file: "",
      systemName: ""
    });
  }

  const assistantMessage = {
    id: agentMessage?.id || `qwenpaw-${Date.now()}`,
    body: reply.text,
    role: "agent",
    author: "qwenpaw",
    created: agentMessage?.created || new Date().toISOString()
  };

  return {
    channel: "qwenpaw",
    topicPath,
    sessionId,
    reply: reply.text,
    userMessage,
    message: assistantMessage
  };
}

async function findLatestAgentMessage(deps, settings) {
  const topicPath = String(settings.topicPath || DEFAULT_SETTINGS.topicPath).trim();
  const payload = await deps.listTopicThread({
    manifestRelPath: topicPath,
    mode: "description",
    file: "",
    systemName: ""
  });
  const messages = Array.isArray(payload?.messages) ? payload.messages : [];
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const item = messages[i];
    if (String(item?.role || "").toLowerCase() === "agent") return item;
  }
  return null;
}

async function pollAssistantReply(deps, agentRoot, agentId, settings) {
  if (usesQwenPaw(settings) && !shouldLogToCms(settings)) {
    return null;
  }
  const latest = await findLatestAgentMessage(deps, settings);
  if (!latest?.id) return null;
  const state = await getState(agentRoot);
  if (latest.id === state.lastAgentMessageId) return null;
  await patchState(agentRoot, agentId, { lastAgentMessageId: latest.id });
  emitShellEvent(agentId, "assistant_message", latest);
  return latest;
}

async function stopTts(agentRoot, agentId) {
  const stopTtsAt = Date.now();
  await patchState(agentRoot, agentId, { stopTtsAt, phase: PHASE_WAITING });
  emitShellEvent(agentId, "stop_tts", { stopTtsAt });
  return { ok: true, stopTtsAt };
}

function isSidecarConnected(state) {
  const seen = Number(state?.sidecarSeenAt) || 0;
  if (!seen) return false;
  return Date.now() - seen < SIDECAR_TTL_MS;
}

async function setPttHeld(agentRoot, agentId, held) {
  const pttHeld = Boolean(held);
  const patch = {
    pttHeld,
    phase: pttHeld ? PHASE_LISTENING : PHASE_THINKING,
    phrase: pttHeld ? "Sidecar слушает…" : "Распознаю речь…"
  };
  return patchState(agentRoot, agentId, patch);
}

async function buildStatusPayload(deps, agentRoot, agentId) {
  const [settings, state] = await Promise.all([readSettings(agentRoot), getState(agentRoot)]);
  let latestAgent = null;
  const shellReply = String(state.lastShellReply || "").trim();
  let stateOut = { ...state };

  if (usesQwenPaw(settings) && shellReply) {
    latestAgent = {
      id: state.lastAgentMessageId || "qwenpaw-reply",
      body: shellReply,
      role: "agent",
      author: "qwenpaw",
      created: state.updatedAt || new Date().toISOString()
    };
  } else if (shouldLogToCms(settings)) {
    try {
      latestAgent = await findLatestAgentMessage(deps, settings);
    } catch {
      latestAgent = null;
    }
  } else {
    try {
      latestAgent = await findLatestAgentMessage(deps, settings);
    } catch {
      latestAgent = null;
    }
  }

  if (shellReply && stateOut.phrase) {
    const phrase = String(stateOut.phrase);
    if (phrase === shellReply.slice(0, 240)) {
      stateOut = { ...stateOut, phrase: "" };
    }
  }
  if (String(stateOut.lastAgentMessageId || "").includes(".md")) {
    stateOut = { ...stateOut, phrase: "", lastAgentMessageId: "" };
  }

  let qwenpaw = { ok: false, configured: usesQwenPaw(settings) };
  if (usesQwenPaw(settings)) {
    qwenpaw = {
      ...(await checkQwenPawHealth(settings.qwenpawBaseUrl)),
      configured: true,
      agentId: settings.qwenpawAgentId,
      sessionId: buildQwenPawSessionId(settings, agentId),
      chatName: settings.qwenpawChatName || "",
      userId: settings.qwenpawUserId
    };
  }

  return {
    agentId,
    settings,
    state: stateOut,
    sidecarConnected: isSidecarConnected(state),
    qwenpaw,
    camera: {
      speech: await cameraSnapshots.readLatestMeta(agentRoot, "camera", "speech"),
      manual: await cameraSnapshots.readLatestMeta(agentRoot, "camera", "manual")
    },
    screen: {
      speech: await screenSnapshots.readLatestMeta(agentRoot, "screen", "speech"),
      manual: await screenSnapshots.readLatestMeta(agentRoot, "screen", "manual")
    },
    latestAgentMessage: latestAgent
      ? {
          id: latestAgent.id,
          body: latestAgent.body,
          created: latestAgent.created,
          author: latestAgent.author
        }
      : null
  };
}

async function streamShellEvents(req, res, { agentId, agentRoot, deps }) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  if (typeof res.flushHeaders === "function") res.flushHeaders();
  res.write(": connected\n\n");

  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  const push = (event, data) => {
    if (closed) return;
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const onBus = (entry) => {
    if (entry.agentId && entry.agentId !== agentId) return;
    if (entry.type === "screen_snapshot_request") {
      push("screen_snapshot_request", entry.payload || {});
      return;
    }
    if (entry.type === "camera_snapshot_request") {
      push("camera_snapshot_request", entry.payload || {});
      return;
    }
    if (entry.type === "state") {
      void (async () => {
        try {
          const status = await buildStatusPayload(deps, agentRoot, agentId);
          status.state = { ...status.state, ...(entry.payload || {}) };
          push("status", status);
        } catch (error) {
          push("error", { message: String(error?.message || error) });
        }
      })();
      return;
    }
    if (entry.type === "assistant_message") {
      push("assistant_message", { message: entry.payload });
      return;
    }
    push(entry.type, entry);
  };
  const unsubscribe = subscribeShellEvents(onBus);

  let lastSig = "";
  const tick = async () => {
    if (closed) return;
    try {
      const settings = await readSettings(agentRoot);
      const reply = await pollAssistantReply(deps, agentRoot, agentId, settings);
      if (reply) {
        push("assistant_message", { message: reply });
      }
      const status = await buildStatusPayload(deps, agentRoot, agentId);
      const sig = JSON.stringify({
        phase: status.state.phase,
        phrase: status.state.phrase,
        lastAgentMessageId: status.state.lastAgentMessageId,
        stopTtsAt: status.state.stopTtsAt
      });
      if (sig !== lastSig) {
        lastSig = sig;
        push("status", status);
      } else {
        push("ping", { at: new Date().toISOString() });
      }
    } catch (error) {
      push("error", { message: String(error?.message || error) });
    }
  };

  await tick();
  const interval = setInterval(() => {
    void tick();
  }, 1500);

  const reconnectTimer = setTimeout(() => {
    if (!closed) {
      push("reconnect", {});
      res.end();
    }
    clearInterval(interval);
  }, 300000);

  req.on("close", () => {
    unsubscribe();
    clearInterval(interval);
    clearTimeout(reconnectTimer);
  });
}

module.exports = {
  PHASE_WAITING,
  PHASE_LISTENING,
  PHASE_THINKING,
  PHASE_SPEAKING,
  PHASE_DISABLED,
  DEFAULT_SETTINGS,
  readSettings,
  writeSettings,
  getState,
  patchState,
  sendUserMessage,
  sendToQwenPaw,
  usesQwenPaw,
  shouldLogToCms,
  buildQwenPawSessionId,
  fetchQwenPawChats,
  startNewQwenPawChat,
  selectQwenPawChat,
  pollAssistantReply,
  stopTts,
  setPttHeld,
  isSidecarConnected,
  buildStatusPayload,
  streamShellEvents,
  emitShellEvent,
  subscribeShellEvents,
  isShellShowDemoRequest,
  buildShellShowDemoResult,
  requestCameraSnapshot,
  completeCameraSnapshotRequest,
  saveSpeechCameraSnapshot,
  getLatestCameraSnapshot,
  requestScreenSnapshot,
  completeScreenSnapshotRequest,
  saveSpeechScreenSnapshot,
  getLatestScreenSnapshot
};
