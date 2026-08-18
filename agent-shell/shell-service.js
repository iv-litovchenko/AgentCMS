const fs = require("fs/promises");
const path = require("path");
const { EventEmitter } = require("events");
const { chatWithQwenPaw, checkQwenPawHealth, checkQwenPawAgent, listQwenPawAgents, listQwenPawChats, createQwenPawChat, updateQwenPawChat, buildNewShellSessionId } = require("./qwenpaw-client");
const {
  buildDualReplyInstruction,
  extractStreamingReplyBody,
  finalizeDualReply,
  shouldRequestDualReply
} = require("./spoken-text");
const { hasVoiceEndDelimiter } = require("./voice-end-format");
const { createSnapshotRequestService, parseDataUrl } = require("./shell-snapshot");
const {
  shouldRefineStt,
  buildSttSessionId,
  refineSttTranscript
} = require("./stt-refine");
const { syncLatestReplyFromQwenPaw } = require("./qwenpaw-sync");

const SETTINGS_DIR = ".agent-shell";
const SETTINGS_FILE = "settings.json";
const STATE_FILE = "state.json";
const COMPOSE_DRAFT_FILE = "compose-draft.md";

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
  qwenpawSttSessionId: "",
  qwenpawSttChatName: "Shell STT",
  voiceInputMode: "browser",
  voiceResponseEnabled: true,
  sttLang: "ru-RU",
  sttPrompt: "",
  ttsEnabled: true,
  ttsEngine: "browser",
  ttsEdgeVoice: "ru-RU-SvetlanaNeural",
  ttsElevenlabsApiKey: "",
  ttsElevenlabsVoiceId: "",
  ttsElevenlabsModel: "eleven_multilingual_v2",
  ttsPiperModel: "",
  ttsPiperBinary: "",
  ttsPrompt: "",
  ttsRate: 1,
  ttsPitch: 1,
  ttsLang: "ru-RU",
  ttsVoice: "",
  ttsStripEmoji: true,
  ttsIncludeCaptions: true,
  windowTopmost: true,
  cameraEnabled: false,
  cameraOnSpeech: true,
  cameraFacing: "user",
  cameraDeviceId: "",
  screenEnabled: false,
  screenOnSpeech: true,
  proactiveEnabled: false,
  proactiveIdleSeconds: 180,
  proactiveCooldownSeconds: 900,
  proactivePrompt: ""
};

const DEFAULT_STATE = {
  phase: PHASE_WAITING,
  phrase: "",
  metrics: "",
  lastAgentMessageId: "",
  lastShellReply: "",
  qwenpawChatUpdatedAt: "",
  stopTtsAt: 0,
  sidecarSeenAt: 0,
  pttHeld: false,
  lastTtsClientId: "",
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

function composeDraftAbsolute(agentRoot) {
  return path.join(agentRoot, SETTINGS_DIR, COMPOSE_DRAFT_FILE);
}

function composeDraftRelativePath() {
  return path.join(SETTINGS_DIR, COMPOSE_DRAFT_FILE);
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
  merged.qwenpawSttSessionId = String(merged.qwenpawSttSessionId || "").trim();
  merged.qwenpawSttChatName = String(merged.qwenpawSttChatName || DEFAULT_SETTINGS.qwenpawSttChatName).trim()
    || DEFAULT_SETTINGS.qwenpawSttChatName;
  if (!["disabled", "browser", "sidecar", "always", "fn_button"].includes(merged.voiceInputMode)) {
    merged.voiceInputMode = "browser";
  }
  if (!["browser", "say", "edge", "piper", "elevenlabs", "sidecar"].includes(merged.ttsEngine)) {
    merged.ttsEngine = "browser";
  }
  if (merged.ttsEngine === "sidecar") merged.ttsEngine = "say";
  merged.voiceResponseEnabled = Boolean(merged.voiceResponseEnabled);
  merged.sttLang = String(merged.sttLang || "ru-RU").trim() || "ru-RU";
  merged.sttPrompt = String(merged.sttPrompt || "");
  merged.ttsEnabled = Boolean(merged.ttsEnabled);
  merged.ttsPrompt = String(merged.ttsPrompt || "");
  merged.ttsRate = Math.min(2, Math.max(0.5, Number(merged.ttsRate) || 1));
  merged.ttsPitch = Math.min(2, Math.max(0, Number(merged.ttsPitch) || 1));
  merged.ttsLang = String(merged.ttsLang || "ru-RU").trim() || "ru-RU";
  merged.ttsVoice = String(merged.ttsVoice || "").trim();
  merged.ttsEdgeVoice = String(merged.ttsEdgeVoice || "ru-RU-SvetlanaNeural").trim();
  merged.ttsElevenlabsApiKey = String(merged.ttsElevenlabsApiKey || "").trim();
  merged.ttsElevenlabsVoiceId = String(merged.ttsElevenlabsVoiceId || "").trim();
  merged.ttsElevenlabsModel = String(merged.ttsElevenlabsModel || "eleven_multilingual_v2").trim();
  merged.ttsPiperModel = String(merged.ttsPiperModel || "").trim();
  merged.ttsPiperBinary = String(merged.ttsPiperBinary || "").trim();
  merged.ttsStripEmoji = merged.ttsStripEmoji !== false;
  merged.ttsIncludeCaptions = merged.ttsIncludeCaptions !== false;
  merged.windowTopmost = merged.windowTopmost !== false;
  merged.cameraEnabled = Boolean(merged.cameraEnabled);
  merged.cameraOnSpeech = merged.cameraOnSpeech !== false;
  if (!["user", "environment", "device"].includes(merged.cameraFacing)) {
    merged.cameraFacing = "user";
  }
  merged.cameraDeviceId = String(merged.cameraDeviceId || "").trim();
  merged.screenEnabled = Boolean(merged.screenEnabled);
  merged.screenOnSpeech = merged.screenOnSpeech !== false;
  merged.proactiveEnabled = Boolean(merged.proactiveEnabled);
  merged.proactiveIdleSeconds = Math.min(3600, Math.max(30, Number(merged.proactiveIdleSeconds) || 180));
  merged.proactiveCooldownSeconds = Math.min(
    86400,
    Math.max(60, Number(merged.proactiveCooldownSeconds) || 900)
  );
  merged.proactivePrompt = String(merged.proactivePrompt || "");
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

async function readComposeDraft(agentRoot) {
  const relativePath = composeDraftRelativePath();
  try {
    const body = await fs.readFile(composeDraftAbsolute(agentRoot), "utf-8");
    const stat = await fs.stat(composeDraftAbsolute(agentRoot));
    return {
      body,
      path: relativePath,
      updatedAt: stat.mtime.toISOString()
    };
  } catch {
    return { body: "", path: relativePath, updatedAt: null };
  }
}

async function writeComposeDraft(agentRoot, body, agentId) {
  const text = String(body ?? "");
  const relativePath = composeDraftRelativePath();
  const target = composeDraftAbsolute(agentRoot);
  await fs.mkdir(path.join(agentRoot, SETTINGS_DIR), { recursive: true });

  if (!text) {
    await fs.unlink(target).catch(() => {});
    const payload = { body: "", path: relativePath, updatedAt: null };
    emitShellEvent(agentId, "compose_draft", payload);
    return payload;
  }

  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, text, "utf-8");
  await fs.rename(tmp, target);
  const stat = await fs.stat(target);
  const payload = {
    body: text,
    path: relativePath,
    updatedAt: stat.mtime.toISOString()
  };
  emitShellEvent(agentId, "compose_draft", payload);
  return payload;
}

function applyOutboundSettings(settings, overrides = {}) {
  const merged = { ...settings };
  if (!overrides || typeof overrides !== "object") return merged;
  if (overrides.ttsEnabled !== undefined) {
    merged.ttsEnabled = Boolean(overrides.ttsEnabled);
  }
  if (overrides.ttsPrompt !== undefined) {
    merged.ttsPrompt = String(overrides.ttsPrompt);
  }
  return merged;
}

const TTS_SYNTH_PRESERVE_IF_EMPTY = [
  "ttsElevenlabsApiKey",
  "ttsElevenlabsVoiceId",
  "ttsPiperModel",
  "ttsPiperBinary"
];

function mergeTtsSynthSettings(stored, client = {}) {
  const merged = { ...(stored && typeof stored === "object" ? stored : {}) };
  if (!client || typeof client !== "object") return merged;
  for (const [key, value] of Object.entries(client)) {
    if (value === undefined || value === null) continue;
    if (TTS_SYNTH_PRESERVE_IF_EMPTY.includes(key) && !String(value).trim()) continue;
    merged[key] = value;
  }
  if (Object.prototype.hasOwnProperty.call(client, "ttsEngine")) {
    const engine = String(client.ttsEngine ?? "").trim();
    if (engine) merged.ttsEngine = engine;
  }
  return merged;
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

function formatDeviceContextBlock(deviceContext) {
  if (!deviceContext || typeof deviceContext !== "object") return "";
  const lines = [];
  const location = deviceContext.location;
  if (location && location.latitude != null && location.longitude != null) {
    const lat = Number(location.latitude);
    const lng = Number(location.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const accuracy =
        location.accuracy != null && Number.isFinite(Number(location.accuracy))
          ? ` ±${Math.round(Number(location.accuracy))} м`
          : "";
      lines.push(`Геолокация: ${lat.toFixed(6)}, ${lng.toFixed(6)}${accuracy}`);
      lines.push(`Карта: https://maps.apple.com/?ll=${lat},${lng}`);
    }
  }
  if (!lines.length) return "";
  return `[Контекст устройства]\n${lines.join("\n")}\n[/Контекст устройства]\n\n`;
}

function applyDeviceContextToBody(body, deviceContext) {
  const prefix = formatDeviceContextBlock(deviceContext);
  const text = String(body || "").trim();
  if (!prefix) return text;
  return `${prefix}${text}`;
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

async function fetchQwenPawAgents(settings) {
  return listQwenPawAgents({ baseUrl: settings.qwenpawBaseUrl });
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

  await patchState(agentRoot, agentId, {
    lastShellReply: "",
    lastAgentMessageId: "",
    qwenpawChatUpdatedAt: "",
    phrase: ""
  });

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

  await patchState(agentRoot, agentId, {
    qwenpawChatUpdatedAt: "",
    phrase: ""
  });

  await syncLatestReplyFromQwenPaw({
    settings: nextSettings,
    agentId,
    state: await getState(agentRoot),
    buildSessionId: buildQwenPawSessionId,
    patchState: (patch) => patchState(agentRoot, agentId, patch),
    emitShellEvent,
    emitLiveUpdate: false
  }).catch(() => null);

  return { sessionId: nextSessionId, chatName: resolvedName, settings: nextSettings };
}

async function renameQwenPawChat(agentRoot, agentId, settings, { name, sessionId } = {}) {
  if (!usesQwenPaw(settings)) throw new Error("QwenPaw mode is not enabled");

  const chatName = String(name || "").trim();
  if (!chatName) throw new Error("Chat name is required");

  const nextSessionId = String(sessionId || settings.qwenpawSessionId || "").trim();
  if (!nextSessionId) throw new Error("sessionId is required");

  const chats = await fetchQwenPawChats(settings);
  const match = chats.find((chat) => String(chat?.session_id || "") === nextSessionId);

  if (match?.id) {
    await updateQwenPawChat({
      baseUrl: settings.qwenpawBaseUrl,
      agentId: settings.qwenpawAgentId,
      chatId: match.id,
      name: chatName,
      sessionId: nextSessionId,
      userId: settings.qwenpawUserId,
      channel: "console"
    });
  } else {
    try {
      await createQwenPawChat({
        baseUrl: settings.qwenpawBaseUrl,
        agentId: settings.qwenpawAgentId,
        sessionId: nextSessionId,
        userId: settings.qwenpawUserId,
        channel: "console",
        name: chatName
      });
    } catch {
      // First message may register the chat later.
    }
  }

  const nextSettings = await writeSettings(
    agentRoot,
    { qwenpawSessionId: nextSessionId, qwenpawChatName: chatName },
    agentId
  );

  return { sessionId: nextSessionId, chatName, settings: nextSettings };
}

async function appendAgentReplyToCms(deps, settings, body, { partial = false } = {}) {
  const topicPath = String(settings.topicPath || DEFAULT_SETTINGS.topicPath).trim();
  const text = String(body || "").trim();
  if (!text) return null;
  const payloadBody = partial ? `${text}\n\n_(ответ оборван, сохранена часть)_` : text;
  return deps.appendTopicThreadMessage({
    manifestRelPath: topicPath,
    body: payloadBody,
    role: "agent",
    author: "qwenpaw",
    linkedFiles: "",
    mode: "description",
    file: "",
    systemName: ""
  });
}

async function sendToQwenPaw(deps, { agentRoot, agentId, settings, body, onProgress, ttsClientId = "", author = "shell" }) {
  const text = String(body || "").trim();
  if (!text) throw new Error("Message body is required");
  const replyTtsClientId = String(ttsClientId || "").trim();

  const topicPath = String(settings.topicPath || DEFAULT_SETTINGS.topicPath).trim();
  let userMessage = null;

  if (shouldLogToCms(settings)) {
    userMessage = await sendUserMessage(deps, {
      agentRoot,
      settings,
      body: text,
      author: String(author || "shell").trim() || "shell"
    });
  }

  const sessionId = buildQwenPawSessionId(settings, agentId);
  const streamId = `qwenpaw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const outboundText = buildDualReplyInstruction(text, settings);
  let lastEmittedText = "";
  let lastEmitAt = 0;
  let activityPriority = 0;
  let lastActivityPhrase = "";
  let lastActivityPayload = null;

  const emitAgentActivity = async (activity) => {
    if (!activity || typeof activity !== "object") return;
    const priority = Number(activity.priority) || 0;
    const phrase = String(activity.phrase || "").trim();
    const tool = String(activity.tool || "").trim();

    if (activity.phase === "end") {
      if (tool) {
        emitShellEvent(agentId, "agent_activity", {
          streamId,
          kind: activity.kind || "tool",
          phase: "end",
          tool
        });
      }
      return;
    }

    if (!phrase) return;
    if (priority < activityPriority) return;
    activityPriority = priority;
    lastActivityPhrase = phrase;
    lastActivityPayload = {
      kind: activity.kind || "run",
      phrase,
      tool: tool || undefined
    };

    await patchState(agentRoot, agentId, {
      phase: PHASE_THINKING,
      phrase,
      metrics: tool || ""
    });
    emitShellEvent(agentId, "agent_activity", {
      streamId,
      kind: lastActivityPayload.kind,
      phase: activity.phase || "start",
      tool: lastActivityPayload.tool,
      phrase
    });
  };

  const emitAssistantDelta = async (
    nextText,
    { done = false, force = false, spokenText = null, spokenParts = null } = {}
  ) => {
    const replyText = String(nextText || "");
    const now = Date.now();
    if (!done && !force && replyText === lastEmittedText) return;
    if (!done && !force && now - lastEmitAt < 60) return;
    lastEmittedText = replyText;
    lastEmitAt = now;

    const patch = {
      phase: done ? PHASE_WAITING : PHASE_THINKING,
      lastShellReply: replyText
    };
    if (done) {
      patch.phrase = "";
      patch.metrics = "";
      activityPriority = 0;
      lastActivityPhrase = "";
      lastActivityPayload = null;
    } else if (replyText.trim()) {
      const showTyping =
        !shouldRequestDualReply(settings) || hasVoiceEndDelimiter(replyText);
      if (showTyping) {
        activityPriority = 50;
        patch.phrase = "Печатает…";
        lastActivityPayload = { kind: "typing", phrase: "Печатает…" };
        emitShellEvent(agentId, "agent_activity", {
          streamId,
          kind: "typing",
          phase: "start",
          phrase: "Печатает…"
        });
      }
    }
    await patchState(agentRoot, agentId, patch);
    emitShellEvent(agentId, "assistant_delta", {
      streamId,
      text: replyText,
      done,
      ttsClientId: replyTtsClientId || undefined,
      spokenText: spokenText || undefined,
      spokenParts: Array.isArray(spokenParts) && spokenParts.length ? spokenParts : undefined,
      activity: lastActivityPayload || undefined
    });
    if (typeof onProgress === "function") {
      onProgress({
        phase: done ? PHASE_WAITING : PHASE_THINKING,
        streamId,
        text: replyText,
        done,
        ttsClientId: replyTtsClientId || undefined,
        spokenText,
        spokenParts
      });
    }
  };

  await emitAgentActivity({ kind: "run", phase: "start", priority: 10, phrase: "Запускаю…" });

  let reply;
  try {
    reply = await chatWithQwenPaw({
      baseUrl: settings.qwenpawBaseUrl,
      agentId: settings.qwenpawAgentId,
      sessionId,
      userId: settings.qwenpawUserId,
      text: outboundText,
      onEvent: ({ text: partialText, activity }) => {
        if (activity) void emitAgentActivity(activity);
        if (String(partialText || "").trim()) void emitAssistantDelta(partialText);
      }
    });
  } catch (error) {
    const partial = String(lastEmittedText || "").trim();
    if (partial && shouldLogToCms(settings)) {
      try {
        await appendAgentReplyToCms(deps, settings, partial, { partial: true });
      } catch {
        // keep partial in state even if CMS write fails
      }
    }
    await emitAssistantDelta(partial, { done: true, force: true });
    throw error;
  }

  let agentMessage = null;
  const finalized = finalizeDualReply(reply.text, settings);
  if (shouldLogToCms(settings)) {
    agentMessage = await appendAgentReplyToCms(deps, settings, finalized.body);
  }

  const assistantMessage = {
    id: agentMessage?.id || streamId,
    streamId,
    body: finalized.body,
    spokenText: finalized.spoken || null,
    spokenParts: finalized.spokenParts?.length ? finalized.spokenParts : undefined,
    ttsClientId: replyTtsClientId || undefined,
    role: "agent",
    author: "qwenpaw",
    created: agentMessage?.created || new Date().toISOString()
  };

  await patchState(agentRoot, agentId, {
    phase: PHASE_WAITING,
    phrase: "",
    lastAgentMessageId: assistantMessage.id,
    lastShellReply: finalized.body
  });
  await emitAssistantDelta(finalized.body, {
    done: true,
    force: true,
    spokenText: finalized.spoken || null,
    spokenParts: finalized.spokenParts?.length ? finalized.spokenParts : null
  });
  emitShellEvent(agentId, "assistant_message", assistantMessage);

  return {
    channel: "qwenpaw",
    topicPath,
    sessionId,
    streamId,
    reply: finalized.body,
    spokenText: finalized.spoken || null,
    spokenParts: finalized.spokenParts?.length ? finalized.spokenParts : null,
    ttsClientId: replyTtsClientId || undefined,
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

async function buildStatusPayload(deps, agentRoot, agentId, { emitLiveUpdate = false } = {}) {
  const [settings, initialState] = await Promise.all([readSettings(agentRoot), getState(agentRoot)]);
  let state = initialState;

  if (usesQwenPaw(settings)) {
    try {
      const synced = await syncLatestReplyFromQwenPaw({
        settings,
        agentId,
        state,
        buildSessionId: buildQwenPawSessionId,
        patchState: (patch) => patchState(agentRoot, agentId, patch),
        emitShellEvent,
        emitLiveUpdate
      });
      state = synced.state;
    } catch {
      // QwenPaw sync is best-effort; stale cache is better than broken status.
    }
  }

  let latestAgent = null;
  const shellReply = String(state.lastShellReply || "").trim();
  let stateOut = { ...state };

  if (usesQwenPaw(settings) && shellReply) {
    const finalized = finalizeDualReply(shellReply, settings);
    latestAgent = {
      id: state.lastAgentMessageId || "qwenpaw-reply",
      body: finalized.body || shellReply,
      spokenText: finalized.spoken || undefined,
      spokenParts: finalized.spokenParts?.length ? finalized.spokenParts : undefined,
      ttsClientId: state.lastTtsClientId || undefined,
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
    const health = await checkQwenPawHealth(settings.qwenpawBaseUrl);
    const agent =
      health.ok
        ? await checkQwenPawAgent({
            baseUrl: settings.qwenpawBaseUrl,
            agentId: settings.qwenpawAgentId
          })
        : { ok: false, agentId: settings.qwenpawAgentId, error: "QwenPaw недоступен" };
    qwenpaw = {
      ...health,
      configured: true,
      serverOk: Boolean(health.ok),
      agentOk: Boolean(agent.ok),
      ok: Boolean(health.ok && agent.ok),
      agentId: settings.qwenpawAgentId,
      agentName: agent.name || "",
      agentError: agent.error || "",
      sessionId: buildQwenPawSessionId(settings, agentId),
      chatName: settings.qwenpawChatName || "",
      userId: settings.qwenpawUserId
    };
  }

  return {
    agentId,
    agentRoot,
    settingsFile: settingsAbsolute(agentRoot),
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
          spokenText: latestAgent.spokenText,
          spokenParts: latestAgent.spokenParts,
          ttsClientId: latestAgent.ttsClientId || stateOut.lastTtsClientId || undefined,
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
    if (entry.type === "assistant_delta") {
      push("assistant_delta", entry.payload || {});
      return;
    }
    if (entry.type === "agent_activity") {
      push("agent_activity", entry.payload || {});
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
      const status = await buildStatusPayload(deps, agentRoot, agentId, { emitLiveUpdate: true });
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
  settingsAbsolute,
  readComposeDraft,
  writeComposeDraft,
  applyOutboundSettings,
  mergeTtsSynthSettings,
  getState,
  patchState,
  sendUserMessage,
  sendToQwenPaw,
  applyDeviceContextToBody,
  usesQwenPaw,
  shouldLogToCms,
  buildQwenPawSessionId,
  shouldRefineStt,
  buildSttSessionId,
  refineSttTranscript,
  fetchQwenPawChats,
  fetchQwenPawAgents,
  startNewQwenPawChat,
  selectQwenPawChat,
  renameQwenPawChat,
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
