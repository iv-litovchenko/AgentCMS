const fs = require("fs/promises");
const path = require("path");
const { EventEmitter } = require("events");
const { chatWithQwenPaw, checkQwenPawHealth, checkQwenPawAgent, getQwenPawAgent, updateQwenPawAgentApproval, listQwenPawAgents, listQwenPawChats, createQwenPawChat, updateQwenPawChat, buildNewShellSessionId } = require("./qwenpaw-client");
const {
  buildDualReplyInstruction,
  buildOpenAiMessages,
  buildQwenPawChatInput,
  extractStreamingReplyBody,
  finalizeDualReply,
  getSystemPrompt,
  shouldRequestDualReply
} = require("./spoken-text");
const { hasVoiceEndDelimiter } = require("./voice-end-format");
const { finalizeProactiveAgentReply, resolveProactiveDialogLogBody } = require("./proactive-format");
const { createSnapshotRequestService, parseDataUrl } = require("./shell-snapshot");
const { createToolPermissionService } = require("./shell-tool-permission");
const { createUserQuestionService } = require("./shell-user-question");
const {
  shouldRefineStt,
  buildSttSessionId,
  refineSttTranscript
} = require("./stt-refine");
const { syncLatestReplyFromQwenPaw } = require("./qwenpaw-sync");
const { normalizeToolActivity } = require("./tool-activity");
const shellPresence = require("./shell-presence");
const {
  SHELL_RUNTIMES,
  normalizeMessageRuntime,
  isRuntimeImplemented,
  runtimeUsesQwenPaw,
  runtimeUsesBridge
} = require("./shell-runtimes");
const { checkOpenAiRuntimeHealth, chatOpenAiCompletions } = require("./runtime-openai-client");
const { checkCliRuntimeHealth, chatClaudeCli, chatCodexCli, resolveCliBinary } = require("./runtime-cli-client");
const { normalizeClaudePermissionMode } = require("./runtime-cli-shared");
const {
  ensureCliSandbox,
  cliSandboxMeta,
  cliSandboxesMeta,
  resolveProjectRootFromPath
} = require("./cli-sandbox");
const {
  resolveRuntimeEndpoint,
  buildDefaultRuntimeSettings,
  buildRuntimeExtraHeaders,
  runtimeHealthPath,
  RUNTIME_TRANSPORT,
  normalizeCliSessionId
} = require("./runtime-bridge");
const { probeCliBinary } = require("./runtime-cli-env");
const { flattenSettings } = require("./shell-settings-format");
const { normalizeSttEngine: normalizeSttEngineId } = require("./stt-service");

function settingsFormatModule() {
  const modPath = require.resolve("./shell-settings-format");
  delete require.cache[modPath];
  return require("./shell-settings-format");
}

const { rel, abs: agentCmsAbs } = require("../paths/agent-cms");

const SHELL_STATE_REL = rel.state.shell;
const WORKSPACE_SETTINGS_REL = rel.settings.workspace;
const COMPOSE_DRAFT_REL = rel.state.composeDraft;

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
  qwenpawUserId: "default",
  qwenpawApprovalLevel: "AUTO",
  qwenpawChatName: "",
  qwenpawSttSessionId: "",
  qwenpawSttChatName: "Shell STT",
  voiceInputMode: "hold",
  sttEnabled: true,
  sttInputCapture: "microphone",
  voiceGlobalListen: false,
  voiceWakeName: "",
  voiceToCompose: false,
  voiceResponseEnabled: true,
  sttLang: "ru-RU",
  sttEngine: "browser",
  sttPrompt: "",
  sttWhisperModel: "base",
  sttElevenlabsApiKey: "",
  sttElevenlabsModel: "scribe_v2",
  ttsEnabled: true,
  ttsPlaybackMode: "dialog",
  ttsEngine: "browser",
  ttsBrowserLang: "ru-RU",
  ttsBrowserVoice: "",
  ttsEdgeVoice: "ru-RU-SvetlanaNeural",
  ttsElevenlabsApiKey: "",
  ttsElevenlabsVoiceId: "EXAVITQu4vr4xnSDxMaL",
  ttsElevenlabsModel: "eleven_multilingual_v2",
  ttsPiperModel: "",
  ttsPiperBinary: "",
  ttsPrompt: "",
  ttsRate: 1,
  ttsPitch: 1,
  ttsLang: "ru-RU",
  ttsVoice: "",
  ttsIncludeCaptions: true,
  windowTopmost: true,
  windowTransparent: false,
  windowBackground: "wallpaper",
  windowBackgroundImageUrl: "",
  windowPetOverlay: false,
  compactDialogQa: true,
  dialogAutoScroll: true,
  windowCharacterModel: "robot",
  windowKeepAwake: true,
  windowProcessingSound: "off",
  cameraEnabled: false,
  cameraOnSpeech: true,
  cameraFacing: "user",
  cameraDeviceId: "",
  screenEnabled: false,
  screenOnSpeech: true,
  proactiveMode: "off",
  proactiveIdleSeconds: 180,
  proactiveIdleSecondsMin: 120,
  proactiveIdleSecondsMax: 240,
  proactiveCooldownSeconds: 900,
  proactivePrompt: "",
  systemPrompt: "",
  proactiveQuietHoursEnabled: false,
  proactiveQuietStart: "23:00",
  proactiveQuietEnd: "07:00",
  dialogScrollRatio: null,
  composePromptTemplates: [
    {
      id: "very-brief",
      key: "very-brief",
      group: "Стиль ответа",
      label: "Ответ очень кратко",
      text: "Ответь очень кратко — одним-двумя предложениями."
    },
    {
      id: "brief",
      key: "brief",
      group: "Стиль ответа",
      label: "Ответ кратко",
      text: "Ответь кратко, без лишних деталей."
    },
    {
      id: "detailed",
      key: "detailed",
      group: "Стиль ответа",
      label: "Ответ развернуто",
      text: "Ответь развёрнуто, с подробностями и примерами."
    }
  ],
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
const VOICE_INPUT_MODES = new Set(["live", "meeting", "hold", "fn_button", "lego_button"]);
const {
  appendShellDialogChat,
  appendShellDialogTool,
  readShellDialogHistory,
  saveShellVoiceRecord,
  saveShellAudioPair,
  saveShellSttTranscript,
  saveShellTtsTranscript,
  sessionIdFromSettings
} = require("./shell-dialog-log");
const {
  listShellMessageQueue,
  enqueueShellMessage,
  claimNextShellQueueItem,
  finishShellQueueItem,
  updateShellQueueItem,
  removeShellQueueItem,
  clearShellMessageQueue,
  abortProcessingShellQueueItem,
  recoverStaleProcessingQueueItems
} = require("./shell-message-queue");

const queueDrainJobs = new Map();
const activeRunAbort = new Map();

function registerActiveRun(agentId) {
  const id = String(agentId || "").trim();
  if (!id) return new AbortController();
  const prev = activeRunAbort.get(id);
  if (prev) prev.abort();
  const controller = new AbortController();
  activeRunAbort.set(id, controller);
  return controller;
}

function clearActiveRun(agentId, controller) {
  const id = String(agentId || "").trim();
  if (!id) return;
  if (activeRunAbort.get(id) === controller) activeRunAbort.delete(id);
}

function abortActiveRun(agentId) {
  const id = String(agentId || "").trim();
  const controller = activeRunAbort.get(id);
  if (!controller) return false;
  controller.abort();
  return true;
}

function isRunCancelledError(error) {
  const message = String(error?.message || error || "");
  return (
    error?.code === "CANCELLED" ||
    error?.name === "AbortError" ||
    /abort|cancel/i.test(message)
  );
}

function migrateVoiceInputMode(mode) {
  const raw = String(mode || "").trim();
  if (raw === "disabled") return "disabled";
  if (raw === "wake_name") return "live";
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
    return `Пример: видео в ответе через markdown-ссылку.

[Демо-ролик Agent Shell](/shell/demo.mp4)

Используй обычные ссылки или markdown — блок [show] больше не нужен.`;
  }

  return `Пример: картинка в ответе через markdown.

![Горы и храм — обои Agent Shell](/shell/wallpaper.png)

Используй \`![подпись](url)\` — блок [show] больше не нужен.`;
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

function workspaceSettingsAbsolute(agentRoot) {
  return agentCmsAbs(agentRoot, WORKSPACE_SETTINGS_REL);
}

function stateAbsolute(agentRoot) {
  return agentCmsAbs(agentRoot, SHELL_STATE_REL);
}

/** @deprecated settings/shell.json removed — workspace.yml + state/shell.json */
function settingsAbsolute(agentRoot) {
  return workspaceSettingsAbsolute(agentRoot);
}

function composeDraftAbsolute(agentRoot) {
  return agentCmsAbs(agentRoot, COMPOSE_DRAFT_REL);
}

function composeDraftRelativePath() {
  return COMPOSE_DRAFT_REL;
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

const { normalizeVoiceComposeTemplates: normalizeComposePromptTemplates } = require("../lib/workspace/workspace-compose-templates");

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
  const qwenpawApproval = String(merged.qwenpawApprovalLevel || DEFAULT_SETTINGS.qwenpawApprovalLevel)
    .trim()
    .toUpperCase();
  merged.qwenpawApprovalLevel = qwenpawApproval === "OFF" ? "OFF" : "AUTO";
  merged.qwenpawChatName = String(merged.qwenpawChatName || "").trim();
  merged.qwenpawSttSessionId = String(merged.qwenpawSttSessionId || "").trim();
  merged.qwenpawSttChatName = String(merged.qwenpawSttChatName || DEFAULT_SETTINGS.qwenpawSttChatName).trim()
    || DEFAULT_SETTINGS.qwenpawSttChatName;
  merged.voiceInputMode = migrateVoiceInputMode(merged.voiceInputMode);
  if (merged.voiceInputMode === "disabled") {
    merged.sttEnabled = false;
    merged.voiceInputMode = "hold";
  } else if (merged.sttEnabled === undefined) {
    merged.sttEnabled = true;
  }
  merged.sttEnabled = merged.sttEnabled !== false;
  const captureRaw = String(merged.sttInputCapture || "").trim();
  if (["microphone", "system", "mix"].includes(captureRaw)) {
    merged.sttInputCapture = captureRaw;
  } else {
    const legacySource = String(merged.voiceInputSource || "").trim();
    merged.sttInputCapture =
      legacySource === "browser" || legacySource === "sidecar" || legacySource === "auto"
        ? "microphone"
        : "microphone";
  }
  delete merged.voiceInputSource;
  merged.voiceGlobalListen = false;
  merged.voiceWakeName = String(merged.voiceWakeName || "").trim();
  merged.voiceToCompose = Boolean(merged.voiceToCompose);
  if (!["browser", "edge", "piper", "elevenlabs"].includes(merged.ttsEngine)) {
    merged.ttsEngine = "browser";
  }
  if (merged.ttsEngine === "say" || merged.ttsEngine === "sidecar") {
    merged.ttsEngine = "browser";
  }
  merged.voiceResponseEnabled = Boolean(merged.voiceResponseEnabled);
  const sttLangRaw = String(merged.sttLang || "ru-RU").trim() || "ru-RU";
  merged.sttLang = sttLangRaw.toLowerCase() === "auto" ? "auto" : sttLangRaw;
  merged.sttEngine = normalizeSttEngineId(merged.sttEngine);
  merged.sttPrompt = String(merged.sttPrompt || "");
  merged.sttWhisperModel = String(merged.sttWhisperModel || "base").trim() || "base";
  merged.sttElevenlabsApiKey = String(merged.sttElevenlabsApiKey || "").trim();
  merged.sttElevenlabsModel = String(merged.sttElevenlabsModel || "scribe_v2").trim() || "scribe_v2";
  merged.ttsEnabled = Boolean(merged.ttsEnabled);
  merged.ttsPlaybackMode = merged.ttsPlaybackMode === "reading" ? "reading" : "dialog";
  merged.ttsPrompt = String(merged.ttsPrompt || "");
  merged.ttsRate = Math.min(2, Math.max(0.5, Number(merged.ttsRate) || 1));
  merged.ttsPitch = Math.min(2, Math.max(0, Number(merged.ttsPitch) || 1));
  const legacyLang = String(merged.ttsLang || "").trim();
  const legacyVoice = String(merged.ttsVoice || "").trim();
  const hasBrowserLang = merged.ttsBrowserLang !== undefined && String(merged.ttsBrowserLang).trim();
  const legacySayLang = String(merged.ttsSayLang || "").trim();
  const legacySayVoice = String(merged.ttsSayVoice ?? "").trim();
  if (!hasBrowserLang && legacyLang) {
    merged.ttsBrowserLang = legacyLang;
  } else if (!hasBrowserLang && legacySayLang) {
    merged.ttsBrowserLang = legacySayLang;
  }
  merged.ttsBrowserLang = String(merged.ttsBrowserLang || "ru-RU").trim() || "ru-RU";
  if (merged.ttsBrowserVoice === undefined && legacyVoice) {
    merged.ttsBrowserVoice = legacyVoice;
  } else if (merged.ttsBrowserVoice === undefined && legacySayVoice) {
    merged.ttsBrowserVoice = legacySayVoice;
  }
  merged.ttsBrowserVoice = String(merged.ttsBrowserVoice ?? "").trim();
  merged.ttsLang = merged.ttsBrowserLang;
  merged.ttsVoice = merged.ttsBrowserVoice;
  merged.ttsEdgeVoice = String(merged.ttsEdgeVoice || "ru-RU-SvetlanaNeural").trim();
  merged.ttsElevenlabsApiKey = String(merged.ttsElevenlabsApiKey || "").trim();
  merged.ttsElevenlabsVoiceId = String(merged.ttsElevenlabsVoiceId || "EXAVITQu4vr4xnSDxMaL").trim();
  merged.ttsElevenlabsModel = String(merged.ttsElevenlabsModel || "eleven_multilingual_v2").trim();
  merged.ttsPiperModel = String(merged.ttsPiperModel || "").trim();
  merged.ttsPiperBinary = String(merged.ttsPiperBinary || "").trim();
  merged.ttsStripEmoji = merged.ttsStripEmoji === true;
  merged.ttsIncludeCaptions = merged.ttsIncludeCaptions !== false;
  merged.windowTopmost = merged.windowTopmost !== false;
  merged.windowTransparent = Boolean(merged.windowTransparent);
  const windowBg = String(merged.windowBackground || "wallpaper").trim();
  merged.windowBackground = ["wallpaper", "dark", "transparent", "custom"].includes(windowBg)
    ? windowBg
    : "wallpaper";
  merged.windowBackgroundImageUrl = String(merged.windowBackgroundImageUrl || "").trim();
  merged.windowPetOverlay = Boolean(merged.windowPetOverlay);
  merged.compactDialogQa = merged.compactDialogQa !== false;
  merged.dialogAutoScroll = merged.dialogAutoScroll !== false;
  merged.windowCharacterModel = String(merged.windowCharacterModel || "robot").trim() || "robot";
  merged.windowKeepAwake = merged.windowKeepAwake !== false;
  merged.windowProcessingSound = String(merged.windowProcessingSound || "off").trim() || "off";
  merged.cameraEnabled = Boolean(merged.cameraEnabled);
  merged.cameraOnSpeech = merged.cameraOnSpeech !== false;
  if (!["user", "environment", "device"].includes(merged.cameraFacing)) {
    merged.cameraFacing = "user";
  }
  merged.cameraDeviceId = String(merged.cameraDeviceId || "").trim();
  merged.screenEnabled = Boolean(merged.screenEnabled);
  merged.screenOnSpeech = merged.screenOnSpeech !== false;
  const proactiveMode = String(merged.proactiveMode || "").trim();
  if (proactiveMode === "off" || proactiveMode === "natural" || proactiveMode === "ping") {
    merged.proactiveMode = proactiveMode;
  } else if (merged.proactiveEnabled !== undefined) {
    merged.proactiveMode = merged.proactiveEnabled ? "ping" : "off";
  } else {
    merged.proactiveMode = "off";
  }
  delete merged.proactiveEnabled;
  const legacyIdle = Math.min(3600, Math.max(30, Number(merged.proactiveIdleSeconds) || 180));
  let idleMin = Number(merged.proactiveIdleSecondsMin);
  let idleMax = Number(merged.proactiveIdleSecondsMax);
  if (!Number.isFinite(idleMin) && !Number.isFinite(idleMax)) {
    idleMin = legacyIdle;
    idleMax = legacyIdle;
  } else {
    if (!Number.isFinite(idleMin)) idleMin = Number.isFinite(idleMax) ? Math.min(legacyIdle, idleMax) : legacyIdle;
    if (!Number.isFinite(idleMax)) idleMax = Number.isFinite(idleMin) ? Math.max(legacyIdle, idleMin) : legacyIdle;
  }
  idleMin = Math.min(3600, Math.max(30, idleMin));
  idleMax = Math.min(3600, Math.max(30, idleMax));
  if (idleMin > idleMax) [idleMin, idleMax] = [idleMax, idleMin];
  merged.proactiveIdleSecondsMin = idleMin;
  merged.proactiveIdleSecondsMax = idleMax;
  merged.proactiveIdleSeconds = idleMin;
  merged.proactiveCooldownSeconds = Math.min(
    86400,
    Math.max(60, Number(merged.proactiveCooldownSeconds) || 900)
  );
  merged.proactivePrompt = String(merged.proactivePrompt || "");
  merged.systemPrompt = String(merged.systemPrompt || "");
  merged.proactiveQuietHoursEnabled = Boolean(merged.proactiveQuietHoursEnabled);
  merged.proactiveQuietStart = normalizeProactiveQuietTime(merged.proactiveQuietStart, "23:00");
  merged.proactiveQuietEnd = normalizeProactiveQuietTime(merged.proactiveQuietEnd, "07:00");
  merged.composePromptTemplates = normalizeComposePromptTemplates(merged.composePromptTemplates);
  if (merged.dialogScrollRatio == null || merged.dialogScrollRatio === "") {
    merged.dialogScrollRatio = null;
  } else {
    const ratio = Number(merged.dialogScrollRatio);
    merged.dialogScrollRatio = Number.isFinite(ratio)
      ? Math.round(Math.min(1, Math.max(0, ratio)) * 10000) / 10000
      : null;
  }
  for (const [key, value] of Object.entries(buildDefaultRuntimeSettings())) {
    if (
      key.endsWith("BaseUrl") ||
      key.endsWith("Model") ||
      key.endsWith("SessionId") ||
      key.endsWith("CliPath") ||
      key.endsWith("PermissionMode")
    ) {
      merged[key] = String(merged[key] ?? value ?? "").trim() || value;
    } else if (key.endsWith("ApiKey") || key.endsWith("Profile") || key.endsWith("AgentId")) {
      merged[key] = String(merged[key] ?? "").trim();
    }
  }
  return merged;
}

function fillShellPromptPresets(agentRoot, settings) {
  try {
    const { loadShellPromptTemplates } = require("./shell-prompt-presets");
    const templates = loadShellPromptTemplates(resolveProjectRootFromPath(agentRoot), agentRoot);
    if (!String(settings.systemPrompt || "").trim() && templates.systemPrompt) {
      settings.systemPrompt = templates.systemPrompt;
    }
    if (!String(settings.sttPrompt || "").trim() && templates.sttPrompt) {
      settings.sttPrompt = templates.sttPrompt;
    }
    if (!String(settings.ttsPrompt || "").trim() && templates.ttsPrompt) {
      settings.ttsPrompt = templates.ttsPrompt;
    }
  } catch {
    /* presets optional */
  }
  return settings;
}

async function readSettings(agentRoot) {
  const projectRoot = resolveProjectRootFromPath(agentRoot);
  const {
    migrateLegacyShellSettingsFile,
    migrateStateSessionIdsToWorkspace,
    readStateFile
  } = require("./shell-settings-migrate");
  const {
    loadWorkspaceAwnSettings,
    buildShellSettingsFromWorkspace
  } = require("../lib/workspace/workspace-shell-settings-bridge");

  await migrateLegacyShellSettingsFile(agentRoot, projectRoot);
  await migrateStateSessionIdsToWorkspace(agentRoot, projectRoot);
  const workspaceSettings = await loadWorkspaceAwnSettings(agentRoot, projectRoot);
  const runtime = await readStateFile(agentRoot);
  const merged = buildShellSettingsFromWorkspace(workspaceSettings, runtime);
  return fillShellPromptPresets(agentRoot, normalizeSettings(merged));
}

async function writeSettings(agentRoot, patch, agentId) {
  const projectRoot = resolveProjectRootFromPath(agentRoot);
  const target = stateAbsolute(agentRoot);
  const queueKey = `settings-write:${target}`;
  const previous = atomicWriteQueues.get(queueKey) || Promise.resolve();
  const queued = previous.catch(() => {}).then(async () => {
    const {
      pickShellRuntimePatch,
      pickShellConfigPatch,
      buildWorkspacePatchFromShell
    } = require("../lib/workspace/workspace-shell-settings-bridge");
    const { writeStateFile } = require("./shell-settings-migrate");
    const { patchWorkspaceSettings } = require("../settings-store");

    const sourcePatch = patch && typeof patch === "object" ? patch : {};
    const runtimePatch = pickShellRuntimePatch(sourcePatch);
    const configPatch = pickShellConfigPatch(sourcePatch);

    if (Object.keys(runtimePatch).length) {
      await writeStateFile(agentRoot, runtimePatch);
    }

    const workspacePatch = buildWorkspacePatchFromShell(configPatch);
    if (Object.keys(workspacePatch).length) {
      await patchWorkspaceSettings(agentRoot, workspacePatch, projectRoot);
    }

    if (Object.prototype.hasOwnProperty.call(configPatch, "qwenpawApprovalLevel")) {
      const draft = await readSettings(agentRoot);
      if (usesQwenPaw(draft)) {
        try {
          await setQwenPawAgentApprovalLevel(
            draft,
            draft.qwenpawAgentId,
            configPatch.qwenpawApprovalLevel
          );
        } catch {
          /* QwenPaw may be offline — CMS value is still saved */
        }
      }
    }

    const normalized = await readSettings(agentRoot);
    invalidateRuntimeProbeCache();
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
  await fs.mkdir(agentCmsAbs(agentRoot, rel.state.dir), { recursive: true });

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
    const next = String(overrides.ttsPrompt || "").trim();
    if (next) merged.ttsPrompt = next;
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

function patchStateAsync(agentRoot, agentId, patch) {
  void patchState(agentRoot, agentId, patch).catch((error) => {
    console.warn("[shell] patchState failed:", error?.message || error);
  });
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

const toolPermissions = createToolPermissionService({ emitShellEvent });
const userQuestions = createUserQuestionService({ emitShellEvent });

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

function requestClaudeToolPermission(agentId, details = {}) {
  return toolPermissions.requestPermission(agentId, details);
}

function completeClaudeToolPermissionRequest(agentId, requestId, decision = {}) {
  return toolPermissions.completePermission(agentId, requestId, decision);
}

function requestClaudeUserQuestion(agentId, details = {}) {
  return userQuestions.requestQuestion(agentId, details);
}

function completeClaudeUserQuestionRequest(agentId, requestId, payload = {}) {
  return userQuestions.completeQuestion(agentId, requestId, payload);
}

function cancelPendingInteractiveRequests(agentId, reason = "Agent switched") {
  const id = String(agentId || "").trim();
  if (!id) return { agentId: "", ok: true };
  toolPermissions.rejectAllForAgent(id, reason);
  userQuestions.rejectAllForAgent(id, reason);
  return { agentId: id, ok: true };
}

function replayPendingInteractiveRequests(agentId) {
  const id = String(agentId || "").trim();
  if (!id) return;
  toolPermissions.replayPendingForAgent(id);
  userQuestions.replayPendingForAgent(id);
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

function cliStatusFromProbe(runtime, probe, missingHint) {
  const ok = Boolean(probe?.ok);
  return {
    runtime,
    configured: ok,
    installed: ok,
    serverOk: ok,
    ok,
    error: ok ? "" : probe?.error || missingHint,
    version: ok ? String(probe?.version || "").trim() : "",
    binary: probe?.binary || ""
  };
}

async function probeAllRuntimeStatuses(settings) {
  const [claudeCli, codexCli, qwenCli, qwenHealth] = await Promise.all([
    probeCliBinary("claude", settings),
    probeCliBinary("codex", settings),
    probeCliBinary("qwen", settings),
    checkQwenPawHealth(settings.qwenpawBaseUrl).catch((error) => ({
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

  const qwenServerOk = Boolean(qwenHealth.ok);
  const qwenAgentOk = Boolean(qwenAgent.ok);
  statuses.qwenpaw = {
    runtime: "qwenpaw",
    configured: true,
    installed: qwenServerOk && qwenAgentOk,
    serverOk: qwenServerOk,
    agentOk: qwenAgentOk,
    ok: qwenServerOk && qwenAgentOk,
    error: !qwenServerOk
      ? qwenHealth.error || "QwenPaw сервер недоступен"
      : qwenAgent.error || qwenHealth.error || "",
    agentName: qwenAgent.name || "",
    version: qwenCli.ok
      ? String(qwenCli.version || "").trim()
      : String(qwenHealth.version || "").trim(),
    binary: qwenCli.binary || "",
    cliOk: Boolean(qwenCli.ok),
    cliError: qwenCli.ok ? "" : qwenCli.error || ""
  };

  statuses.claude = cliStatusFromProbe(
    "claude",
    claudeCli,
    "CLI не найден — проверьте PATH или claudeCliPath (claude --version)"
  );
  statuses.codex = cliStatusFromProbe(
    "codex",
    codexCli,
    "CLI не найден — проверьте PATH или codexCliPath (codex --version)"
  );

  const installed = ["claude", "codex", "qwenpaw"].filter((runtime) => {
    if (runtime === "qwenpaw") return isRuntimeImplemented(runtime);
    return statuses[runtime]?.installed;
  });
  const available = SHELL_RUNTIMES.filter((runtime) => isRuntimeImplemented(runtime));

  return {
    statuses,
    available,
    installed
  };
}

const RUNTIME_PROBE_TTL_MS = 120000;
const QWENPAW_HTTP_PROBE_TTL_MS = 30000;
const STREAM_STATE_PATCH_MS = 600;
/** @type {Map<string, { at: number, result: Awaited<ReturnType<typeof probeAllRuntimeStatuses>> }>} */
const runtimeProbeCache = new Map();
/** @type {{ key: string, at: number, status: object | null }} */
let qwenpawHttpProbeCache = { key: "", at: 0, status: null };

async function probeQwenPawHttpStatus(settings = {}) {
  const key = `${settings.qwenpawBaseUrl || ""}|${settings.qwenpawAgentId || ""}`;
  if (
    qwenpawHttpProbeCache.key === key &&
    qwenpawHttpProbeCache.status &&
    Date.now() - qwenpawHttpProbeCache.at < QWENPAW_HTTP_PROBE_TTL_MS
  ) {
    return qwenpawHttpProbeCache.status;
  }

  const qwenHealth = await checkQwenPawHealth(settings.qwenpawBaseUrl).catch((error) => ({
    ok: false,
    error: String(error?.message || error)
  }));

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

  const serverOk = Boolean(qwenHealth.ok);
  const agentOk = Boolean(qwenAgent.ok);
  const status = {
    runtime: "qwenpaw",
    configured: true,
    installed: serverOk && agentOk,
    serverOk,
    agentOk,
    ok: serverOk && agentOk,
    error: !serverOk
      ? qwenHealth.error || "QwenPaw сервер недоступен"
      : qwenAgent.error || "",
    agentName: qwenAgent.name || "",
    version: String(qwenHealth.version || "").trim()
  };

  qwenpawHttpProbeCache = { key, at: Date.now(), status };
  return status;
}

function runtimeProbeCacheKey(settings = {}) {
  return [
    settings.claudeCliPath || "",
    settings.codexCliPath || "",
    settings.qwenCliPath || "",
    settings.qwenpawBaseUrl || "",
    settings.qwenpawAgentId || ""
  ].join("|");
}

function invalidateRuntimeProbeCache() {
  runtimeProbeCache.clear();
  qwenpawHttpProbeCache = { key: "", at: 0, status: null };
}

async function probeAllRuntimeStatusesCached(settings) {
  const key = runtimeProbeCacheKey(settings);
  const cached = runtimeProbeCache.get(key);
  if (cached && Date.now() - cached.at < RUNTIME_PROBE_TTL_MS) {
    return cached.result;
  }
  const result = await probeAllRuntimeStatuses(settings);
  runtimeProbeCache.set(key, { at: Date.now(), result });
  return result;
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

async function fetchQwenPawAgentProfile(settings, agentId) {
  return getQwenPawAgent({
    baseUrl: settings.qwenpawBaseUrl,
    agentId: agentId || settings.qwenpawAgentId
  });
}

async function setQwenPawAgentApprovalLevel(settings, agentId, approvalLevel) {
  return updateQwenPawAgentApproval({
    baseUrl: settings.qwenpawBaseUrl,
    agentId: agentId || settings.qwenpawAgentId,
    approvalLevel
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

function shellToolActivityPayload(streamId, activity) {
  const normalized = normalizeToolActivity(activity);
  return {
    streamId,
    kind: normalized.kind,
    phase: normalized.phase,
    tool: normalized.tool,
    toolId: normalized.toolId,
    args: normalized.args || undefined,
    result: normalized.result || undefined,
    status: normalized.status,
    phrase: normalized.phrase,
    error: normalized.error
  };
}

function emitShellToolActivity(agentId, agentRoot, streamId, activity, runtime, sessionId) {
  const normalized = normalizeToolActivity(activity);
  emitShellEvent(agentId, "agent_activity", shellToolActivityPayload(streamId, normalized));
  if (normalized.kind === "tool") {
    const shouldLog =
      normalized.phase === "end" ||
      (normalized.phase === "progress" && isMeaningfulToolArgs(normalized.args));
    if (shouldLog) {
      void logShellDialogTool(agentRoot, normalized, runtime, sessionId);
    }
  }
  return normalized;
}

function isMeaningfulToolArgs(value) {
  const text = String(value ?? "").trim();
  return Boolean(text && text !== "{}" && text !== "[]");
}

async function sendToQwenPaw(deps, { agentRoot, agentId, settings, body, onProgress, ttsClientId = "", author = "shell" }) {
  const text = String(body || "").trim();
  if (!text) throw new Error("Message body is required");
  const replyTtsClientId = String(ttsClientId || "").trim();

  const topicPath = String(settings.topicPath || DEFAULT_SETTINGS.topicPath).trim();

  const sessionId = buildQwenPawSessionId(settings, agentId);
  const streamId = `qwenpaw-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const promptContext = { agentId, runtime: getMessageRuntime(settings) };
  const outboundText = buildDualReplyInstruction(text, settings, promptContext);
  const qwenInput = buildQwenPawChatInput(text, settings, promptContext);
  let lastEmittedText = "";
  let lastEmitAt = 0;
  let lastStatePatchAt = 0;
  let activityPriority = 0;
  let lastActivityPhrase = "";
  let lastActivityPayload = null;

  const emitAgentActivity = async (activity) => {
    if (!activity || typeof activity !== "object") return;
    const normalized = normalizeToolActivity(activity);
    const priority = Number(normalized.priority) || 0;
    const phrase = String(normalized.phrase || "").trim();
    const tool = String(normalized.tool || "").trim();

    if (normalized.kind === "tool") {
      emitShellToolActivity(agentId, agentRoot, streamId, normalized, "qwenpaw", sessionId);
      if (normalized.phase !== "end") {
        activityPriority = Math.max(activityPriority, priority);
        lastActivityPhrase = phrase;
        lastActivityPayload = {
          kind: "tool",
          phrase,
          tool: tool || undefined
        };
        const now = Date.now();
        const shouldPatch = priority >= 10 || now - lastStatePatchAt >= STREAM_STATE_PATCH_MS;
        if (shouldPatch) {
          lastStatePatchAt = now;
          patchStateAsync(agentRoot, agentId, {
            phase: PHASE_THINKING,
            phrase,
            metrics: tool || ""
          });
        }
      }
      return;
    }

    if (normalized.phase === "end") {
      if (tool) {
        emitShellEvent(agentId, "agent_activity", shellToolActivityPayload(streamId, normalized));
      }
      return;
    }

    if (!phrase) return;
    if (priority < activityPriority) return;
    activityPriority = priority;
    lastActivityPhrase = phrase;
    lastActivityPayload = {
      kind: normalized.kind || "run",
      phrase,
      tool: tool || undefined
    };

    const now = Date.now();
    const shouldPatch = priority >= 10 || now - lastStatePatchAt >= STREAM_STATE_PATCH_MS;
    emitShellEvent(agentId, "agent_activity", shellToolActivityPayload(streamId, normalized));
    if (shouldPatch) {
      lastStatePatchAt = now;
      patchStateAsync(agentRoot, agentId, {
        phase: PHASE_THINKING,
        phrase,
        metrics: tool || ""
      });
    }
  };

  const emitAssistantDelta = async (
    nextText,
    { done = false, force = false, spokenText = null, spokenParts = null } = {}
  ) => {
    const replyText = String(nextText || "");
    const now = Date.now();
    if (!done && !force && replyText === lastEmittedText) return;
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
    const shouldPatch = done || force || now - lastStatePatchAt >= STREAM_STATE_PATCH_MS;
    if (shouldPatch) lastStatePatchAt = now;
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
    if (shouldPatch) patchStateAsync(agentRoot, agentId, patch);
  };

  const runAbort = registerActiveRun(agentId);
  let reply;
  try {
    reply = await chatWithQwenPaw({
      baseUrl: settings.qwenpawBaseUrl,
      agentId: settings.qwenpawAgentId,
      sessionId,
      userId: settings.qwenpawUserId,
      text: outboundText,
      input: qwenInput,
      signal: runAbort.signal,
      onEvent: ({ text: partialText, activity }) => {
        if (activity) void emitAgentActivity(activity);
        if (String(partialText ?? "").length) void emitAssistantDelta(partialText);
      }
    });
  } catch (error) {
    const partial = String(lastEmittedText || "").trim();
    await emitAssistantDelta(partial, { done: true, force: true });
    if (isRunCancelledError(error) || runAbort.signal.aborted) {
      const cancelled = new Error("Cancelled");
      cancelled.code = "CANCELLED";
      throw cancelled;
    }
    throw error;
  } finally {
    clearActiveRun(agentId, runAbort);
  }

  const rawReply = String(reply.text || "").trim();
  const finalized = finalizeProactiveAgentReply(rawReply, settings, finalizeDualReply);
  const replyBody = finalized.rawReply || rawReply;
  const assistantMessage = {
    id: streamId,
    streamId,
    body: replyBody,
    spokenText: finalized.spoken || null,
    spokenParts: finalized.spokenParts?.length ? finalized.spokenParts : undefined,
    proactiveEmpty: Boolean(finalized.proactiveEmpty),
    ttsClientId: replyTtsClientId || undefined,
    role: "agent",
    author: "qwenpaw",
    created: new Date().toISOString()
  };

  await patchState(agentRoot, agentId, {
    phase: PHASE_WAITING,
    phrase: "",
    lastAgentMessageId: assistantMessage.id,
    lastShellReply: replyBody
  });
  await emitAssistantDelta(replyBody, {
    done: true,
    force: true,
    spokenText: finalized.spoken || null,
    spokenParts: finalized.spokenParts?.length ? finalized.spokenParts : null
  });
  emitShellEvent(agentId, "assistant_message", assistantMessage);
  void logShellDialogAgent(agentRoot, replyBody, "qwenpaw");

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

function resolveShellProjectRoot(deps, agentRoot) {
  if (typeof deps?.getProjectRoot === "function") {
    return deps.getProjectRoot();
  }
  return resolveProjectRootFromPath(agentRoot);
}

async function maybePersistCodexThreadSessionId(agentRoot, agentId, settings, runtime, reply) {
  if (runtime !== "codex") {
    return {
      settings,
      sessionId: sessionIdFromSettings(settings, runtime)
    };
  }

  const nextId = String(reply?.codexThreadId || "").trim();
  const currentId = normalizeCliSessionId(sessionIdFromSettings(settings, runtime), "codex");
  if (!nextId || nextId === currentId) {
    return {
      settings,
      sessionId: currentId || nextId
    };
  }

  const nextSettings = await writeSettings(agentRoot, { codexSessionId: nextId }, agentId);
  return {
    settings: nextSettings,
    sessionId: nextId
  };
}

async function sendToBridgeRuntime(deps, { agentRoot, agentId, settings, body, onProgress, ttsClientId = "", author = "shell" }) {
  const text = String(body || "").trim();
  if (!text) throw new Error("Message body is required");
  const runtime = getMessageRuntime(settings);
  if (!usesBridgeRuntime(settings)) throw new Error(`Runtime ${runtime} is not a bridge runtime`);

  const projectRoot = resolveShellProjectRoot(deps, agentRoot);
  const cliCwd =
    runtime === "claude" || runtime === "codex"
      ? await ensureCliSandbox(projectRoot, agentId, runtime)
      : agentRoot;

  const endpoint = resolveRuntimeEndpoint(settings, runtime);
  const replyTtsClientId = String(ttsClientId || "").trim();
  const streamId = `${runtime}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const promptContext = { agentId, runtime };
  const outboundText = buildDualReplyInstruction(text, settings, promptContext);
  const messages = buildOpenAiMessages(text, settings, promptContext);
  const systemPrompt = getSystemPrompt(settings, promptContext);
  let lastEmittedText = "";
  let lastEmitAt = 0;
  let lastStatePatchAt = 0;

  const emitAssistantDelta = async (
    nextText,
    { done = false, force = false, spokenText = null, spokenParts = null } = {}
  ) => {
    const replyText = String(nextText || "");
    const now = Date.now();
    if (!done && !force && replyText === lastEmittedText) return;
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
    const shouldPatch = done || force || now - lastStatePatchAt >= STREAM_STATE_PATCH_MS;
    if (shouldPatch) lastStatePatchAt = now;
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
    if (shouldPatch) patchStateAsync(agentRoot, agentId, patch);
  };

  const onDelta = (partial) => {
    if (String(partial ?? "").length) void emitAssistantDelta(partial);
  };
  const onActivity = (activity) => {
    if (!activity) return;
    const normalized = normalizeToolActivity(activity);
    if (normalized.kind === "tool") {
      emitShellToolActivity(agentId, agentRoot, streamId, normalized, runtime, endpoint.sessionId);
      if (normalized.phase !== "end") {
        patchStateAsync(agentRoot, agentId, {
          phase: PHASE_THINKING,
          phrase: normalized.phrase,
          metrics: normalized.tool || ""
        });
      } else {
        patchStateAsync(agentRoot, agentId, {
          phase: PHASE_THINKING,
          phrase: normalized.phrase || `✓ ${normalized.tool}`,
          metrics: normalized.tool || ""
        });
      }
      return;
    }
    emitShellEvent(agentId, "agent_activity", shellToolActivityPayload(streamId, activity));
  };
  const extraHeaders = buildRuntimeExtraHeaders(runtime, endpoint);

  let reply;
  let persistedCodexSession = null;
  const runAbort = registerActiveRun(agentId);
  try {
    if (endpoint.transport === RUNTIME_TRANSPORT.cli) {
      const binary = await resolveCliBinary(runtime, settings);
      const cliChat = runtime === "codex" ? chatCodexCli : chatClaudeCli;
      emitShellEvent(agentId, "agent_activity", {
        streamId,
        kind: "run",
        phase: "start",
        phrase: runtime === "codex" ? "Codex…" : "Claude…"
      });
      const interactiveCli =
        (runtime === "claude" || runtime === "codex") &&
        normalizeClaudePermissionMode(endpoint.permissionMode || "") !== "bypassPermissions";
      const onPermissionRequest = interactiveCli
        ? (details) =>
            requestClaudeToolPermission(agentId, {
              ...details,
              streamId,
              runtime
            })
        : null;
      const onUserQuestionRequest = interactiveCli
        ? (details) =>
            requestClaudeUserQuestion(agentId, {
              ...details,
              streamId,
              runtime
            })
        : null;
      reply = await cliChat({
        binary: binary || endpoint.cliPath,
        model: endpoint.model,
        messages,
        sessionId: endpoint.sessionId,
        permissionMode: endpoint.permissionMode || "",
        systemPrompt,
        cwd: cliCwd,
        onDelta,
        onActivity,
        onPermissionRequest,
        onUserQuestionRequest,
        signal: runAbort.signal
      });
      persistedCodexSession = await maybePersistCodexThreadSessionId(
        agentRoot,
        agentId,
        settings,
        runtime,
        reply
      );
      settings = persistedCodexSession.settings;
      if (reply?.resumeFallback && !reply?.resumeWarning) {
        reply.resumeWarning =
          "Codex не нашёл сохранённую сессию — начата новая, Session ID обновлён автоматически.";
      }
      if (reply?.resumeWarning) {
        emitShellEvent(agentId, "agent_activity", {
          streamId,
          kind: "run",
          phase: "start",
          phrase: reply.resumeWarning
        });
      }
    } else {
      reply = await chatOpenAiCompletions({
        baseUrl: endpoint.baseUrl,
        apiKey: endpoint.apiKey,
        model: endpoint.model,
        messages,
        extraHeaders,
        onDelta,
        signal: runAbort.signal
      });
    }
  } catch (error) {
    const partial = String(lastEmittedText || "").trim();
    await emitAssistantDelta(partial, { done: true, force: true });
    if (isRunCancelledError(error) || runAbort.signal.aborted) {
      const cancelled = new Error("Cancelled");
      cancelled.code = "CANCELLED";
      throw cancelled;
    }
    throw error;
  } finally {
    clearActiveRun(agentId, runAbort);
  }

  const rawReply = String(reply.text || "").trim();
  const finalized = finalizeProactiveAgentReply(rawReply, settings, finalizeDualReply);
  const replyBody = finalized.rawReply || rawReply;
  const assistantMessage = {
    id: streamId,
    streamId,
    body: replyBody,
    spokenText: finalized.spoken || null,
    spokenParts: finalized.spokenParts?.length ? finalized.spokenParts : undefined,
    proactiveEmpty: Boolean(finalized.proactiveEmpty),
    ttsClientId: replyTtsClientId || undefined,
    role: "agent",
    author: runtime,
    created: new Date().toISOString()
  };

  await patchState(agentRoot, agentId, {
    phase: PHASE_WAITING,
    phrase: "",
    lastAgentMessageId: assistantMessage.id,
    lastShellReply: replyBody
  });
  await emitAssistantDelta(replyBody, {
    done: true,
    force: true,
    spokenText: finalized.spoken || null,
    spokenParts: finalized.spokenParts?.length ? finalized.spokenParts : null
  });
  emitShellEvent(agentId, "assistant_message", assistantMessage);
  void logShellDialogAgent(agentRoot, replyBody, runtime);

  const effectiveSessionId =
    runtime === "codex"
      ? persistedCodexSession?.sessionId || endpoint.sessionId
      : endpoint.sessionId;

  return {
    channel: runtime,
    sessionId: effectiveSessionId,
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

async function resolveQueueScope(agentRoot, settings) {
  const resolvedSettings = settings || (await readSettings(agentRoot));
  const runtime = getMessageRuntime(resolvedSettings);
  const sessionId = sessionIdFromSettings(resolvedSettings, runtime);
  return { agentRoot, runtime, sessionId };
}

function emitShellQueueUpdate(agentId, scope) {
  void listShellMessageQueue(scope)
    .then((queue) => {
      emitShellEvent(agentId, "queue_update", { queue });
    })
    .catch((error) => {
      console.warn("[shell-queue] queue_update failed:", error?.message || error);
    });
}

async function processShellQueueItem(deps, agentRoot, agentId, item, scope) {
  const settings = await readSettings(agentRoot);
  const outboundSettings = applyOutboundSettings(settings, {
    ttsEnabled: item.ttsEnabled,
    ttsPrompt: item.ttsPrompt
  });
  const runtime = getMessageRuntime(outboundSettings);
  const body = applyDeviceContextToBody(String(item.body || "").trim(), item.deviceContext);
  const ttsClientId = String(item.shellClientId || "").trim();
  const author = String(item.author || "shell").trim() || "shell";

  if (/proactive/i.test(author)) {
    const dialogText = resolveProactiveDialogLogBody(body, item.dialogBody);
    if (dialogText) void logShellDialogUser(agentRoot, dialogText, runtime);
  } else {
    void logShellDialogUser(agentRoot, body, runtime);
  }
  emitShellQueueUpdate(agentId, scope);

  await patchState(agentRoot, agentId, {
    phase: PHASE_THINKING,
    phrase: String(item.displayPhrase || body).slice(0, 240),
    lastTtsClientId: ttsClientId || undefined,
    primaryClientId: ttsClientId || undefined,
    shellSurfaceHost: item.surfaceHost || undefined,
    shellSurfaceHint: item.surfaceHint || undefined,
    shellSurfaceBackend: item.surfaceBackend || undefined
  });

  if (ttsClientId) {
    shellPresence.upsertPresence(agentId, {
      shellClientId: ttsClientId,
      surfaceHost: item.surfaceHost,
      surfaceHint: item.surfaceHint,
      surfaceBackend: item.surfaceBackend,
      hostUrl: item.hostUrl,
      interact: true
    });
  }

  await sendToRuntime(deps, {
    agentRoot,
    agentId,
    settings: outboundSettings,
    body,
    ttsClientId,
    author
  });
}

async function drainShellMessageQueue(deps, agentRoot, agentId) {
  const settings = await readSettings(agentRoot);
  const scope = await resolveQueueScope(agentRoot, settings);
  const stale = await recoverStaleProcessingQueueItems(scope);
  if (stale.length) {
    const message = "Сессия агента зависла — сообщение снято с обработки. Отправьте снова.";
    for (const item of stale) {
      emitShellEvent(agentId, "message_error", { message, queueId: item.id });
    }
    await patchState(agentRoot, agentId, {
      phase: PHASE_WAITING,
      phrase: message.slice(0, 200)
    });
    emitShellQueueUpdate(agentId, scope);
  }
  while (true) {
    const item = await claimNextShellQueueItem(scope);
    if (!item) break;

    emitShellQueueUpdate(agentId, scope);

    try {
      await processShellQueueItem(deps, agentRoot, agentId, item, scope);
      await finishShellQueueItem(scope, item.id);
    } catch (error) {
      const cancelled = isRunCancelledError(error);
      const message = String(error?.message || error);
      if (!cancelled) {
        await finishShellQueueItem(scope, item.id, { error: message });
        await patchState(agentRoot, agentId, {
          phase: PHASE_WAITING,
          phrase: message.slice(0, 200)
        });
        emitShellEvent(agentId, "message_error", { message, queueId: item.id });
      }
    }

    emitShellQueueUpdate(agentId, scope);
  }
}

function scheduleShellMessageQueueDrain(deps, agentRoot, agentId) {
  const key = String(agentId || "");
  if (queueDrainJobs.has(key)) return queueDrainJobs.get(key);
  const job = drainShellMessageQueue(deps, agentRoot, agentId).finally(() => {
    if (queueDrainJobs.get(key) === job) queueDrainJobs.delete(key);
  });
  queueDrainJobs.set(key, job);
  return job;
}

async function submitShellMessage(deps, agentRoot, agentId, payload = {}) {
  const settings = await readSettings(agentRoot);
  const scope = await resolveQueueScope(agentRoot, settings);
  const { item, queue } = await enqueueShellMessage(scope, payload);
  emitShellQueueUpdate(agentId, scope);
  scheduleShellMessageQueueDrain(deps, agentRoot, agentId);
  return { item, queue };
}

async function getShellMessageQueue(agentRoot, settings) {
  const scope = await resolveQueueScope(agentRoot, settings);
  return listShellMessageQueue(scope);
}

async function patchShellQueueItem(agentRoot, agentId, id, patch = {}, settings) {
  const scope = await resolveQueueScope(agentRoot, settings);
  const result = await updateShellQueueItem(scope, id, patch);
  emitShellQueueUpdate(agentId, scope);
  return result;
}

async function deleteShellQueueItem(agentRoot, agentId, id, settings) {
  const scope = await resolveQueueScope(agentRoot, settings);
  const result = await removeShellQueueItem(scope, id);
  emitShellQueueUpdate(agentId, scope);
  return result;
}

async function resetShellMessageQueue(agentRoot, agentId, options = {}, settings) {
  const scope = await resolveQueueScope(agentRoot, settings);
  const result = await clearShellMessageQueue(scope, options);
  emitShellQueueUpdate(agentId, scope);
  return result;
}

async function cancelShellProcessing(deps, agentRoot, agentId, { reason = "Остановлено" } = {}) {
  const settings = await readSettings(agentRoot);
  const scope = await resolveQueueScope(agentRoot, settings);
  const note = String(reason || "Остановлено").trim() || "Остановлено";

  cancelPendingInteractiveRequests(agentId, note);
  const abortedRun = abortActiveRun(agentId);
  await clearShellMessageQueue(scope, { pendingOnly: true });
  const processing = await abortProcessingShellQueueItem(scope);

  emitShellQueueUpdate(agentId, scope);

  await stopTts(agentRoot, agentId);
  await patchState(agentRoot, agentId, {
    phase: PHASE_WAITING,
    phrase: "",
    metrics: ""
  });
  emitShellEvent(agentId, "assistant_delta", {
    streamId: `cancel-${Date.now()}`,
    text: "",
    done: true
  });
  emitShellEvent(agentId, "run_cancelled", { reason: note, queueId: processing?.id || undefined });

  const queue = await listShellMessageQueue(scope);
  return { ok: true, aborted: abortedRun || Boolean(processing), queue };
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
    const settings = await readSettings(agentRoot);
    const id = normalizeMessageRuntime(runtime || getMessageRuntime(settings));
    const sessionId = sessionIdFromSettings(settings, id);
    return await appendShellDialogChat(agentRoot, { role: "user", text, runtime: id, sessionId });
  } catch (error) {
    console.error("[shell-dialog] failed to log user message", error);
    return null;
  }
}

async function logShellDialogAgent(agentRoot, text, runtime = "qwenpaw") {
  try {
    const settings = await readSettings(agentRoot);
    const id = normalizeMessageRuntime(runtime || getMessageRuntime(settings));
    const sessionId = sessionIdFromSettings(settings, id);
    return await appendShellDialogChat(agentRoot, { role: "agent", text, runtime: id, sessionId });
  } catch (error) {
    console.error("[shell-dialog] failed to log agent message", error);
    return null;
  }
}

async function logShellDialogTool(agentRoot, activity, runtime = "qwenpaw", sessionId = "") {
  try {
    const normalized = normalizeToolActivity(activity);
    if (normalized.kind !== "tool") return null;
    const settings = await readSettings(agentRoot);
    const id = normalizeMessageRuntime(runtime || getMessageRuntime(settings));
    const sid = String(sessionId || sessionIdFromSettings(settings, id) || "").trim();
    return await appendShellDialogTool(agentRoot, {
      tool: normalized.tool,
      toolId: normalized.toolId,
      args: normalized.args,
      result: normalized.result,
      status: normalized.status,
      runtime: id,
      sessionId: sid
    });
  } catch (error) {
    console.error("[shell-dialog] failed to log tool activity", error);
    return null;
  }
}

async function fetchShellDialogHistory(agentRoot, agentId, options = {}) {
  const settings = await readSettings(agentRoot);
  const runtime = options.runtime || getMessageRuntime(settings);
  const limit = options.limit || 25;

  try {
    const sessionId = options.sessionId || sessionIdFromSettings(settings, runtime);
    const fromArchive = await readShellDialogHistory(agentRoot, {
      ...options,
      runtime,
      sessionId,
      limit
    });
    return fromArchive.map((item) => ({ ...item, source: item.source || "awn-dialogs" }));
  } catch {
    return [];
  }
}

async function storeShellAudioRecord(agentRoot, payload = {}) {
  try {
    const raw = payload?.dataBase64 || payload?.data || "";
    const buffer = Buffer.from(String(raw), payload?.dataBase64 ? "base64" : undefined);
    const channel = String(payload?.channel || payload?.kind || "stt").trim().toLowerCase();
    const meta = {};
    for (const key of ["engine", "voice", "mode", "mimeType"]) {
      const value = String(payload?.[key] || "").trim();
      if (value) meta[key] = value;
    }
    if (payload?.kind && channel === "stt" && !meta.mode) {
      meta.mode = String(payload.kind).trim();
    }
    return await saveShellAudioPair(agentRoot, {
      channel: channel === "tts" ? "tts" : "stt",
      data: buffer,
      ext: String(payload?.ext || "").trim(),
      mimeType: String(payload?.mimeType || meta.mimeType || "").trim(),
      text: String(payload?.text || "").trim(),
      meta
    });
  } catch {
    return null;
  }
}

async function storeShellVoiceRecord(agentRoot, payload = {}) {
  return storeShellAudioRecord(agentRoot, { ...payload, channel: "stt" });
}

async function storeShellTtsRecord(agentRoot, { text = "", audioBase64 = "", mimeType = "", engine = "", voice = "" } = {}) {
  return storeShellAudioRecord(agentRoot, {
    channel: "tts",
    dataBase64: audioBase64,
    ext: "",
    mimeType,
    text,
    engine,
    voice
  });
}

async function storeShellTtsTranscript(agentRoot, { text = "", engine = "browser", voice = "" } = {}) {
  return saveShellTtsTranscript(agentRoot, { text, engine, voice });
}

async function storeShellSttTranscript(agentRoot, { text = "", engine = "browser", mode = "live" } = {}) {
  return saveShellSttTranscript(agentRoot, { text, engine, mode });
}

async function buildStatusPayload(
  deps,
  agentRoot,
  agentId,
  { emitLiveUpdate = false, includeRuntimeProbe = false, includeQwenSync = false } = {}
) {
  const [settings, initialState] = await Promise.all([readSettings(agentRoot), getState(agentRoot)]);
  let state = initialState;

  if (includeQwenSync && usesQwenPaw(settings)) {
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
      body: shellReply,
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
      body: shellReply,
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

  if (stateOut.pttHeld) {
    stateOut = {
      ...stateOut,
      pttHeld: false,
      ...(stateOut.phase === PHASE_LISTENING ? { phase: PHASE_WAITING, phrase: "" } : {})
    };
  }

  const queue = await resolveQueueScope(agentRoot, settings)
    .then((scope) => listShellMessageQueue(scope))
    .catch(() => ({
      processingId: null,
      processing: null,
      items: []
    }));
  if (queue.processing || queue.items.length) {
    scheduleShellMessageQueueDrain(deps, agentRoot, agentId);
  }

  let qwenpaw = { ok: false, configured: usesQwenPaw(settings) };
  let bridgeRuntime = { ok: false, configured: usesBridgeRuntime(settings), runtime: getMessageRuntime(settings) };
  let runtimeStatuses = {};
  let installedRuntimes = SHELL_RUNTIMES.filter((runtime) => isRuntimeImplemented(runtime));
  let availableRuntimes = installedRuntimes;

  if (includeRuntimeProbe) {
    const runtimeProbe = await probeAllRuntimeStatusesCached(settings);
    runtimeStatuses = runtimeProbe.statuses;
    installedRuntimes = runtimeProbe.installed;
    availableRuntimes = runtimeProbe.available;
  } else if (usesQwenPaw(settings)) {
    runtimeStatuses.qwenpaw = await probeQwenPawHttpStatus(settings);
  }

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

  const projectRoot = resolveShellProjectRoot(deps, agentRoot);
  const messageRuntime = getMessageRuntime(settings);
  const cliRuntime =
    messageRuntime === "claude" || messageRuntime === "codex" ? messageRuntime : "claude";
  void ensureCliSandbox(projectRoot, agentId, cliRuntime).catch(() => {});

  return {
    agentId,
    agentRoot,
    cliSandboxes: cliSandboxesMeta(projectRoot, agentId),
    cliSandbox: cliSandboxMeta(projectRoot, agentId, cliRuntime),
    settingsFile: settingsAbsolute(agentRoot),
    settings,
    state: stateOut,
    sidecarConnected: false,
    qwenpaw,
    runtime: bridgeRuntime,
    ...(Object.keys(runtimeStatuses).length > 0 ? { runtimeStatuses } : {}),
    availableRuntimes,
    installedRuntimes,
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
      : null,
    queue,
    presence: shellPresence.buildPresencePayload(agentId, stateOut)
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
    if (entry.type === "tool_permission_request") {
      push("tool_permission_request", entry.payload || {});
      return;
    }
    if (entry.type === "user_question_request") {
      push("user_question_request", entry.payload || {});
      return;
    }
    if (entry.type === "state") {
      push("state", { payload: entry.payload || {} });
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
    if (entry.type === "queue_update") {
      push("queue_update", entry.payload || {});
      return;
    }
    if (entry.type === "message_error") {
      push("message_error", entry.payload || {});
      return;
    }
    if (entry.type === "presence") {
      push("presence", entry.payload || {});
      return;
    }
    push(entry.type, entry);
  };
  unsubscribe = subscribeShellEvents(onBus);
  replayPendingInteractiveRequests(agentId);

  const tick = async () => {
    if (closed || res.writableEnded || res.destroyed) return;
    try {
      const status = await buildStatusPayload(deps, agentRoot, agentId);
      push("status", status);
    } catch (error) {
      push("error", { message: String(error?.message || error) });
    }
  };

  await tick();

  interval = setInterval(() => {
    if (closed || res.writableEnded || res.destroyed) return;
    try {
      res.write(`: keepalive ${Date.now()}\n\n`);
    } catch {
      closeStream();
    }
  }, 30000);

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
  workspaceSettingsAbsolute,
  settingsAbsolute,
  stateAbsolute,
  readComposeDraft,
  writeComposeDraft,
  appendVoiceToComposeDraft,
  applyOutboundSettings,
  mergeTtsSynthSettings,
  getState,
  patchState,
  patchStateAsync,
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
  fetchQwenPawAgentProfile,
  setQwenPawAgentApprovalLevel,
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
  storeShellAudioRecord,
  storeShellTtsRecord,
  storeShellTtsTranscript,
  storeShellSttTranscript,
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
  completeClaudeToolPermissionRequest,
  completeClaudeUserQuestionRequest,
  cancelPendingInteractiveRequests,
  replayPendingInteractiveRequests,
  saveSpeechScreenSnapshot,
  getLatestScreenSnapshot,
  submitShellMessage,
  getShellMessageQueue,
  patchShellQueueItem,
  deleteShellQueueItem,
  resetShellMessageQueue,
  cancelShellProcessing,
  scheduleShellMessageQueueDrain
};
