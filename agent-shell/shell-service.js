const fs = require("fs/promises");
const path = require("path");
const { EventEmitter } = require("events");
const { chatWithQwenPaw, checkQwenPawHealth, checkQwenPawAgent, listQwenPawAgents, listQwenPawChats, createQwenPawChat, updateQwenPawChat, buildNewShellSessionId, fetchQwenPawChatHistory } = require("./qwenpaw-client");
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
const {
  normalizeMessageRuntime,
  isRuntimeImplemented,
  runtimeUsesQwenPaw,
  runtimeUsesBridge
} = require("./shell-runtimes");
const { checkOpenAiRuntimeHealth, chatOpenAiCompletions } = require("./runtime-openai-client");
const { checkCliRuntimeHealth, chatClaudeCli, chatCodexCli, resolveCliBinary } = require("./runtime-cli-client");
const {
  resolveRuntimeEndpoint,
  buildDefaultRuntimeSettings,
  buildRuntimeExtraHeaders,
  runtimeHealthPath,
  RUNTIME_TRANSPORT
} = require("./runtime-bridge");
const { probeAvailableRuntimes } = require("./runtime-probe");
const { probeCliBinary } = require("./runtime-cli-env");
const { flattenSettings } = require("./shell-settings-format");

function settingsFormatModule() {
  const modPath = require.resolve("./shell-settings-format");
  delete require.cache[modPath];
  return require("./shell-settings-format");
}

const SETTINGS_DIR = ".agent-shell";
const SETTINGS_FILE = "settings.json";
const STATE_FILE = "state.json";
const COMPOSE_DRAFT_FILE = "compose-draft.md";

/** Serializes atomic writes per target path — avoids rename races on shared `.tmp`. */
const atomicWriteQueues = new Map();

async function writeFileAtomicUnqueued(targetPath, data, encoding = "utf-8") {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  const tmp = `${targetPath}.tmp`;
  await fs.writeFile(tmp, data, encoding);
  try {
    await fs.rename(tmp, targetPath);
  } catch (error) {
    await fs.unlink(tmp).catch(() => {});
    throw error;
  }
}

async function atomicWriteFile(targetPath, data, encoding = "utf-8") {
  const previous = atomicWriteQueues.get(targetPath) || Promise.resolve();
  const queued = previous.catch(() => {}).then(() => writeFileAtomicUnqueued(targetPath, data, encoding));
  atomicWriteQueues.set(targetPath, queued);
  return queued.finally(() => {
    if (atomicWriteQueues.get(targetPath) === queued) atomicWriteQueues.delete(targetPath);
  });
}

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
  voiceInputMode: "hold",
  voiceGlobalListen: false,
  voiceWakeName: "",
  voiceToCompose: false,
  voiceResponseEnabled: true,
  sttLang: "ru-RU",
  sttEngine: "auto",
  sttPrompt: "",
  ttsEnabled: true,
  ttsPlaybackMode: "dialog",
  ttsEngine: "browser",
  ttsBrowserLang: "ru-RU",
  ttsBrowserVoice: "",
  ttsSayLang: "ru-RU",
  ttsSayVoice: "",
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
  proactivePrompt: "",
  proactiveQuietHoursEnabled: false,
  proactiveQuietStart: "23:00",
  proactiveQuietEnd: "07:00",
  ...buildDefaultRuntimeSettings()
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
  meetingRecording: false,
  lastTtsClientId: "",
  primaryClientId: "",
  updatedAt: ""
};

const SIDECAR_TTL_MS = 8000;
const VOICE_INPUT_MODES = new Set(["live", "wake_name", "meeting", "hold", "fn_button"]);
const { appendShellDialogChat, readShellDialogHistory, saveShellVoiceRecord } = require("./shell-dialog-log");

function migrateVoiceInputMode(mode) {
  const raw = String(mode || "").trim();
  if (raw === "disabled") return "disabled";
  if (VOICE_INPUT_MODES.has(raw)) return raw;
  if (raw === "always") return "live";
  if (raw === "browser" || raw === "sidecar") return "hold";
  if (raw === "fn_button") return "fn_button";
  return "hold";
}

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

function parseProactiveQuietTimeMinutes(value) {
  const match = String(value || "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function normalizeProactiveQuietTime(value, fallback = "23:00") {
  const minutes = parseProactiveQuietTimeMinutes(value);
  if (minutes === null) return fallback;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function normalizeSettings(raw) {
  const merged = { ...DEFAULT_SETTINGS, ...flattenSettings(raw && typeof raw === "object" ? raw : {}) };
  if (!String(merged.topicPath || "").trim()) merged.topicPath = DEFAULT_SETTINGS.topicPath;
  if (!["thread", "inbox"].includes(merged.messageChannel)) merged.messageChannel = "thread";
  merged.messageTarget = normalizeMessageRuntime(merged.messageTarget);
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
  merged.voiceInputMode = migrateVoiceInputMode(merged.voiceInputMode);
  merged.voiceGlobalListen = Boolean(merged.voiceGlobalListen);
  merged.voiceWakeName = String(merged.voiceWakeName || "").trim();
  merged.voiceToCompose = Boolean(merged.voiceToCompose);
  if (!["browser", "say", "edge", "piper", "elevenlabs", "sidecar"].includes(merged.ttsEngine)) {
    merged.ttsEngine = "browser";
  }
  if (merged.ttsEngine === "sidecar") merged.ttsEngine = "say";
  merged.voiceResponseEnabled = Boolean(merged.voiceResponseEnabled);
  merged.sttLang = String(merged.sttLang || "ru-RU").trim() || "ru-RU";
  merged.sttPrompt = String(merged.sttPrompt || "");
  merged.ttsEnabled = Boolean(merged.ttsEnabled);
  merged.ttsPlaybackMode = merged.ttsPlaybackMode === "reading" ? "reading" : "dialog";
  merged.ttsPrompt = String(merged.ttsPrompt || "");
  merged.ttsRate = Math.min(2, Math.max(0.5, Number(merged.ttsRate) || 1));
  merged.ttsPitch = Math.min(2, Math.max(0, Number(merged.ttsPitch) || 1));
  const legacyLang = String(merged.ttsLang || "ru-RU").trim() || "ru-RU";
  const legacyVoice = String(merged.ttsVoice || "").trim();
  merged.ttsBrowserLang = String(merged.ttsBrowserLang || legacyLang).trim() || "ru-RU";
  merged.ttsSayLang = String(merged.ttsSayLang || legacyLang).trim() || "ru-RU";
  merged.ttsBrowserVoice = String(merged.ttsBrowserVoice ?? legacyVoice).trim();
  merged.ttsSayVoice = String(merged.ttsSayVoice ?? legacyVoice).trim();
  if (merged.ttsEngine === "say") {
    merged.ttsLang = merged.ttsSayLang;
    merged.ttsVoice = merged.ttsSayVoice;
  } else if (merged.ttsEngine === "browser") {
    merged.ttsLang = merged.ttsBrowserLang;
    merged.ttsVoice = merged.ttsBrowserVoice;
  } else {
    merged.ttsLang = legacyLang;
    merged.ttsVoice = legacyVoice;
  }
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
  merged.proactiveQuietHoursEnabled = Boolean(merged.proactiveQuietHoursEnabled);
  merged.proactiveQuietStart = normalizeProactiveQuietTime(merged.proactiveQuietStart, "23:00");
  merged.proactiveQuietEnd = normalizeProactiveQuietTime(merged.proactiveQuietEnd, "07:00");
  for (const [key, value] of Object.entries(buildDefaultRuntimeSettings())) {
    if (key.endsWith("BaseUrl") || key.endsWith("Model") || key.endsWith("SessionId")) {
      merged[key] = String(merged[key] ?? value ?? "").trim() || value;
    } else if (key.endsWith("ApiKey") || key.endsWith("Profile") || key.endsWith("AgentId")) {
      merged[key] = String(merged[key] ?? "").trim();
    }
  }
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
  const target = settingsAbsolute(agentRoot);
  const queueKey = `settings-write:${target}`;
  const previous = atomicWriteQueues.get(queueKey) || Promise.resolve();
  const queued = previous.catch(() => {}).then(async () => {
    const current = await readSettings(agentRoot);
    const normalized = normalizeSettings({ ...current, ...(patch && typeof patch === "object" ? patch : {}) });
    const nested = settingsFormatModule().nestSettings(normalized);
    await writeFileAtomicUnqueued(target, `${JSON.stringify(nested, null, 2)}\n`, "utf-8");
    emitShellEvent(agentId, "settings", normalized);
    return normalized;
  });
  atomicWriteQueues.set(queueKey, queued);
  return queued.finally(() => {
    if (atomicWriteQueues.get(queueKey) === queued) atomicWriteQueues.delete(queueKey);
  });
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

async function appendVoiceToComposeDraft(agentRoot, agentId, text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return readComposeDraft(agentRoot);
  }
  const draft = await readComposeDraft(agentRoot);
  const base = String(draft.body || "").trimEnd();
  const next = base ? `${base} ${trimmed}` : trimmed;
  return writeComposeDraft(agentRoot, next, agentId);
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

  await atomicWriteFile(target, text, "utf-8");
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

function stateWithoutUpdatedAt(state) {
  if (!state || typeof state !== "object") return state;
  const { updatedAt, ...rest } = state;
  return rest;
}

function persistedStateChanged(current, next) {
  return JSON.stringify(stateWithoutUpdatedAt(current)) !== JSON.stringify(stateWithoutUpdatedAt(next));
}

async function writePersistedState(agentRoot, state) {
  const target = stateAbsolute(agentRoot);
  const payload = `${JSON.stringify(state, null, 2)}\n`;
  await atomicWriteFile(target, payload, "utf-8");
}

async function getState(agentRoot) {
  const state = await readPersistedState(agentRoot);
  if (!state.updatedAt) state.updatedAt = new Date().toISOString();
  return state;
}

function compactStatePatch(patch) {
  if (!patch || typeof patch !== "object") return {};
  const out = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

async function patchState(agentRoot, agentId, patch) {
  const current = await getState(agentRoot);
  const next = {
    ...current,
    ...compactStatePatch(patch),
    updatedAt: new Date().toISOString()
  };
  if (persistedStateChanged(current, next)) {
    await writePersistedState(agentRoot, next);
  }
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
  return runtimeUsesQwenPaw(settings?.messageTarget);
}

function usesBridgeRuntime(settings) {
  return runtimeUsesBridge(settings?.messageTarget);
}

function getMessageRuntime(settings) {
  return normalizeMessageRuntime(settings?.messageTarget);
}

async function checkBridgeRuntimeHealth(settings, runtime = getMessageRuntime(settings), options = {}) {
  const { timeoutMs, quick = false } = options;
  const id = normalizeMessageRuntime(runtime);
  if (id === "qwenpaw") {
    return { ok: false, configured: false, runtime: id };
  }
  const endpoint = resolveRuntimeEndpoint(settings, id);
  let health;
  if (endpoint.transport === RUNTIME_TRANSPORT.cli) {
    const binary = await resolveCliBinary(id, settings);
    health = await checkCliRuntimeHealth({
      runtime: id,
      binary: binary || endpoint.cliPath,
      timeoutMs,
      quick
    });
  } else {
    health = await checkOpenAiRuntimeHealth({
      baseUrl: endpoint.baseUrl,
      apiKey: endpoint.apiKey,
      path: runtimeHealthPath(id),
      extraHeaders: buildRuntimeExtraHeaders(id, endpoint)
    });
  }
  return {
    ...health,
    configured: true,
    runtime: id,
    model: endpoint.model,
    sessionId: endpoint.sessionId,
    ok: Boolean(health.ok)
  };
}

async function probeAllRuntimeStatuses(settings) {
  const STATUS_CLI_TIMEOUT_MS = 3500;
  const statusHealthOptions = { timeoutMs: STATUS_CLI_TIMEOUT_MS };

  const [probe, qwenHealth, claudeHealth, codexHealth, qwenCli] = await Promise.all([
    probeAvailableRuntimes(settings),
    checkQwenPawHealth(settings.qwenpawBaseUrl).catch((error) => ({
      ok: false,
      error: String(error?.message || error)
    })),
    checkBridgeRuntimeHealth(settings, "claude", statusHealthOptions).catch((error) => ({
      ok: false,
      error: String(error?.message || error)
    })),
    checkBridgeRuntimeHealth(settings, "codex", statusHealthOptions).catch((error) => ({
      ok: false,
      error: String(error?.message || error)
    })),
    probeCliBinary("qwen", settings).catch((error) => ({
      ok: false,
      error: String(error?.message || error)
    }))
  ]);

  const statuses = {};

  let qwenAgent = { ok: false, error: qwenHealth.error || "QwenPaw недоступен" };
  if (qwenHealth.ok) {
    try {
      qwenAgent = await checkQwenPawAgent({
        baseUrl: settings.qwenpawBaseUrl,
        agentId: settings.qwenpawAgentId
      });
    } catch (error) {
      qwenAgent = { ok: false, error: String(error?.message || error) };
    }
  }

  const qwenInstalled = probe.installed.includes("qwenpaw");
  statuses.qwenpaw = {
    runtime: "qwenpaw",
    configured: qwenInstalled,
    installed: qwenInstalled,
    serverOk: Boolean(qwenHealth.ok),
    agentOk: Boolean(qwenAgent.ok),
    ok: Boolean(qwenInstalled && qwenHealth.ok && qwenAgent.ok),
    error: !qwenInstalled
      ? "CLI не найден — проверьте PATH или qwenCliPath (qwen --version)"
      : qwenAgent.error || qwenHealth.error || "",
    agentName: qwenAgent.name || "",
    version: qwenCli.ok ? String(qwenCli.version || "").trim() : "",
    binary: qwenCli.binary || ""
  };

  for (const runtime of ["claude", "codex"]) {
    const installed = probe.installed.includes(runtime);
    const health = runtime === "claude" ? claudeHealth : codexHealth;
    const ok = installed && Boolean(health.ok);
    statuses[runtime] = {
      runtime,
      configured: installed,
      installed,
      serverOk: ok,
      ok,
      error: installed ? health.error || "" : "CLI не найден — проверьте PATH или claudeCliPath/codexCliPath (claude/codex --version)",
      version: installed ? String(health.version || "").trim() : "",
      binary: health.binary || ""
    };
  }

  return {
    statuses,
    available: probe.available,
    installed: probe.installed
  };
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
    await emitAssistantDelta(partial, { done: true, force: true });
    throw error;
  }

  const finalized = finalizeDualReply(reply.text, settings);
  const assistantMessage = {
    id: streamId,
    streamId,
    body: finalized.body,
    spokenText: finalized.spoken || null,
    spokenParts: finalized.spokenParts?.length ? finalized.spokenParts : undefined,
    ttsClientId: replyTtsClientId || undefined,
    role: "agent",
    author: "qwenpaw",
    created: new Date().toISOString()
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
  void logShellDialogAgent(agentRoot, finalized.body, "qwenpaw");

  return {
    channel: "qwenpaw",
    topicPath,
    sessionId,
    streamId,
    reply: finalized.body,
    spokenText: finalized.spoken || null,
    spokenParts: finalized.spokenParts?.length ? finalized.spokenParts : null,
    ttsClientId: replyTtsClientId || undefined,
    message: assistantMessage
  };
}

async function sendToBridgeRuntime(deps, { agentRoot, agentId, settings, body, onProgress, ttsClientId = "", author = "shell" }) {
  const text = String(body || "").trim();
  if (!text) throw new Error("Message body is required");
  const runtime = getMessageRuntime(settings);
  if (!usesBridgeRuntime(settings)) throw new Error(`Runtime ${runtime} is not a bridge runtime`);

  const endpoint = resolveRuntimeEndpoint(settings, runtime);
  const replyTtsClientId = String(ttsClientId || "").trim();
  const streamId = `${runtime}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const outboundText = buildDualReplyInstruction(text, settings);
  let lastEmittedText = "";
  let lastEmitAt = 0;

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
    } else if (replyText.trim()) {
      patch.phrase = "Печатает…";
    }
    await patchState(agentRoot, agentId, patch);
    emitShellEvent(agentId, "assistant_delta", {
      streamId,
      text: replyText,
      done,
      ttsClientId: replyTtsClientId || undefined,
      spokenText: spokenText || undefined,
      spokenParts: Array.isArray(spokenParts) && spokenParts.length ? spokenParts : undefined
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

  await patchState(agentRoot, agentId, {
    phase: PHASE_THINKING,
    phrase: "Запускаю…",
    metrics: runtime
  });

  const messages = [{ role: "user", content: outboundText }];
  const onDelta = (partial) => {
    if (String(partial || "").trim()) void emitAssistantDelta(partial);
  };
  const extraHeaders = buildRuntimeExtraHeaders(runtime, endpoint);

  let reply;
  try {
    if (endpoint.transport === RUNTIME_TRANSPORT.cli) {
      const binary = await resolveCliBinary(runtime, settings);
      const cliChat = runtime === "codex" ? chatCodexCli : chatClaudeCli;
      reply = await cliChat({
        binary: binary || endpoint.cliPath,
        model: endpoint.model,
        messages,
        sessionId: endpoint.sessionId,
        cwd: agentRoot,
        onDelta
      });
    } else {
      reply = await chatOpenAiCompletions({
        baseUrl: endpoint.baseUrl,
        apiKey: endpoint.apiKey,
        model: endpoint.model,
        messages,
        extraHeaders,
        onDelta
      });
    }
  } catch (error) {
    const partial = String(lastEmittedText || "").trim();
    await emitAssistantDelta(partial, { done: true, force: true });
    throw error;
  }

  const finalized = finalizeDualReply(reply.text, settings);
  const assistantMessage = {
    id: streamId,
    streamId,
    body: finalized.body,
    spokenText: finalized.spoken || null,
    spokenParts: finalized.spokenParts?.length ? finalized.spokenParts : undefined,
    ttsClientId: replyTtsClientId || undefined,
    role: "agent",
    author: runtime,
    created: new Date().toISOString()
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
  void logShellDialogAgent(agentRoot, finalized.body, runtime);

  return {
    channel: runtime,
    sessionId: endpoint.sessionId,
    streamId,
    reply: finalized.body,
    spokenText: finalized.spoken || null,
    spokenParts: finalized.spokenParts?.length ? finalized.spokenParts : null,
    ttsClientId: replyTtsClientId || undefined,
    message: assistantMessage
  };
}

async function sendToRuntime(deps, opts) {
  const settings = opts?.settings || {};
  if (usesQwenPaw(settings)) return sendToQwenPaw(deps, opts);
  if (usesBridgeRuntime(settings)) return sendToBridgeRuntime(deps, opts);
  throw new Error(`Runtime ${getMessageRuntime(settings)} is not supported`);
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
  if (usesQwenPaw(settings)) {
    return null;
  }
  const latest = await findLatestAgentMessage(deps, settings);
  if (!latest?.id) return null;
  const state = await getState(agentRoot);
  if (latest.id === state.lastAgentMessageId) return null;
  await patchState(agentRoot, agentId, { lastAgentMessageId: latest.id });
  emitShellEvent(agentId, "assistant_message", latest);
  void logShellDialogAgent(agentRoot, latest.body || "", getMessageRuntime(settings));
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
  if (pttHeld) {
    patch.stopTtsAt = Date.now();
  }
  return patchState(agentRoot, agentId, patch);
}

async function setMeetingRecording(agentRoot, agentId, recording) {
  const meetingRecording = Boolean(recording);
  const patch = {
    meetingRecording,
    phase: meetingRecording ? PHASE_LISTENING : PHASE_THINKING,
    phrase: meetingRecording ? "Запись встречи…" : "Обрабатываю встречу…"
  };
  if (meetingRecording) {
    patch.stopTtsAt = Date.now();
  }
  return patchState(agentRoot, agentId, patch);
}

async function logShellDialogUser(agentRoot, text, runtime = "qwenpaw") {
  try {
    return await appendShellDialogChat(agentRoot, { role: "user", text, runtime });
  } catch {
    return null;
  }
}

async function logShellDialogAgent(agentRoot, text, runtime = "qwenpaw") {
  try {
    return await appendShellDialogChat(agentRoot, { role: "agent", text, runtime });
  } catch {
    return null;
  }
}

async function fetchShellDialogHistory(agentRoot, agentId, options = {}) {
  const settings = await readSettings(agentRoot);
  const runtime = options.runtime || getMessageRuntime(settings);
  const limit = options.limit || 25;

  if (usesQwenPaw(settings) && normalizeMessageRuntime(runtime) === "qwenpaw") {
    try {
      const sessionId = buildQwenPawSessionId(settings, agentId);
      const fromQwenPaw = await fetchQwenPawChatHistory({
        baseUrl: settings.qwenpawBaseUrl,
        agentId: settings.qwenpawAgentId,
        userId: settings.qwenpawUserId,
        channel: "console",
        sessionId,
        limit
      });
      if (fromQwenPaw.length) {
        return fromQwenPaw;
      }
    } catch {
      // Fall back to local awn-dialogs archive.
    }
  }

  try {
    const fromArchive = await readShellDialogHistory(agentRoot, { ...options, runtime, limit });
    return fromArchive.map((item) => ({ ...item, source: item.source || "awn-dialogs" }));
  } catch {
    return [];
  }
}

async function storeShellVoiceRecord(agentRoot, payload = {}) {
  try {
    const raw = payload?.dataBase64 || payload?.data || "";
    const buffer = Buffer.from(String(raw), payload?.dataBase64 ? "base64" : undefined);
    return await saveShellVoiceRecord(agentRoot, {
      kind: String(payload?.kind || "meeting").trim() || "meeting",
      data: buffer,
      ext: String(payload?.ext || "pcm").trim() || "pcm"
    });
  } catch {
    return null;
  }
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
  } else if (usesBridgeRuntime(settings) && shellReply) {
    const finalized = finalizeDualReply(shellReply, settings);
    latestAgent = {
      id: state.lastAgentMessageId || `${getMessageRuntime(settings)}-reply`,
      body: finalized.body || shellReply,
      spokenText: finalized.spoken || undefined,
      spokenParts: finalized.spokenParts?.length ? finalized.spokenParts : undefined,
      ttsClientId: state.lastTtsClientId || undefined,
      role: "agent",
      author: getMessageRuntime(settings),
      created: state.updatedAt || new Date().toISOString()
    };
  } else {
    latestAgent = null;
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
  let bridgeRuntime = { ok: false, configured: usesBridgeRuntime(settings), runtime: getMessageRuntime(settings) };
  const runtimeProbe = await probeAllRuntimeStatuses(settings);
  const runtimeStatuses = runtimeProbe.statuses;

  const qwenStatus = runtimeStatuses.qwenpaw || { ok: false, configured: false };
  if (usesQwenPaw(settings)) {
    qwenpaw = {
      ...qwenStatus,
      configured: true,
      serverOk: Boolean(qwenStatus.serverOk),
      agentOk: Boolean(qwenStatus.agentOk),
      ok: Boolean(qwenStatus.ok),
      agentId: settings.qwenpawAgentId,
      agentName: qwenStatus.agentName || "",
      agentError: qwenStatus.error || "",
      sessionId: buildQwenPawSessionId(settings, agentId),
      chatName: settings.qwenpawChatName || "",
      userId: settings.qwenpawUserId
    };
  }

  if (usesBridgeRuntime(settings)) {
    const currentRuntime = getMessageRuntime(settings);
    const bridgeStatus = runtimeStatuses[currentRuntime] || {};
    bridgeRuntime = {
      ...bridgeStatus,
      configured: true,
      runtime: currentRuntime,
      serverOk: Boolean(bridgeStatus.serverOk ?? bridgeStatus.ok),
      ok: Boolean(bridgeStatus.ok),
      error: bridgeStatus.error || ""
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
    runtime: bridgeRuntime,
    runtimeStatuses,
    availableRuntimes: runtimeProbe.available,
    installedRuntimes: runtimeProbe.installed,
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
  let interval = null;
  let reconnectTimer = null;
  let unsubscribe = () => {};

  const closeStream = () => {
    if (closed) return;
    closed = true;
    unsubscribe();
    if (interval) clearInterval(interval);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    interval = null;
    reconnectTimer = null;
  };

  req.on("close", closeStream);
  res.on("close", closeStream);
  res.on("error", closeStream);

  const push = (event, data) => {
    if (closed || res.writableEnded || res.destroyed) return;
    try {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch {
      closeStream();
    }
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
  unsubscribe = subscribeShellEvents(onBus);

  let lastSig = "";
  const tick = async () => {
    if (closed || res.writableEnded || res.destroyed) return;
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
  interval = setInterval(() => {
    void tick();
  }, 1500);

  reconnectTimer = setTimeout(() => {
    if (!closed) {
      push("reconnect", {});
      if (!res.writableEnded) res.end();
    }
    closeStream();
  }, 300000);
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
  appendVoiceToComposeDraft,
  applyOutboundSettings,
  mergeTtsSynthSettings,
  getState,
  patchState,
  sendUserMessage,
  sendToQwenPaw,
  sendToBridgeRuntime,
  sendToRuntime,
  applyDeviceContextToBody,
  usesQwenPaw,
  usesBridgeRuntime,
  checkBridgeRuntimeHealth,
  getMessageRuntime,
  isRuntimeImplemented,
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
  setMeetingRecording,
  logShellDialogUser,
  logShellDialogAgent,
  fetchShellDialogHistory,
  storeShellVoiceRecord,
  migrateVoiceInputMode,
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
