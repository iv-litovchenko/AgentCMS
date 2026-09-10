const fs = require("fs/promises");
const path = require("path");
const { normalizeMessageRuntime } = require("./shell-runtimes");

const DIALOGS_DIR = "awn-dialogs";
const LEGACY_CHATS_DIR = path.join(DIALOGS_DIR, "chats");
const RECORDS_DIR = path.join(DIALOGS_DIR, "records");
const AUDIO_DIR = path.join(DIALOGS_DIR, "audio");
const AUDIO_CHANNELS = new Set(["stt", "tts"]);
const LEGACY_SESSION_UID_DIR = "uid";
const OPEN_SESSION = "open";
const DIALOG_DAY_FILE_RE = /^\d{4}-\d{2}-\d{2}\.md$/;

function dateStamp(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function timeStamp(d = new Date()) {
  return d.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function relPath(agentRoot, absPath) {
  return path.relative(agentRoot, absPath).split(path.sep).join("/");
}

/** Безопасное имя папки runtime: awn-dialogs/qwenpaw/, claude/, codex/ … */
function runtimeDialogDir(runtime) {
  const id = normalizeMessageRuntime(runtime);
  const safe = String(id || "unknown")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return path.join(DIALOGS_DIR, safe || "unknown");
}

function safeSessionDirName(sessionId) {
  const safe = String(sessionId || "")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return safe || OPEN_SESSION;
}

/** awn-dialogs/<runtime>/<session-uuid>/ */
function sessionDialogDir(runtime, sessionId) {
  return path.join(runtimeDialogDir(runtime), safeSessionDirName(sessionId));
}

function sessionIdFromSettings(settings, runtime) {
  const id = normalizeMessageRuntime(runtime);
  if (id === "qwenpaw") return String(settings?.qwenpawSessionId || "").trim();
  return String(settings?.[`${id}SessionId`] || "").trim();
}

function dialogRoleMeta(role) {
  if (role === "tool") {
    return { role: "tool", author: "Tool", label: "Tool" };
  }
  if (role === "agent") {
    return { role: "agent", author: "AI", label: "AI" };
  }
  return { role: "user", author: "Human", label: "Human (человек)" };
}

function normalizeDialogRole(rawRole, rawAuthor = "") {
  const roleText = String(rawRole || "").trim().toLowerCase();
  const authorText = String(rawAuthor || "").trim().toLowerCase();
  if (roleText === "tool") return dialogRoleMeta("tool");
  if (roleText === "agent" || roleText === "assistant" || authorText === "ai" || authorText === "агент") {
    return dialogRoleMeta("agent");
  }
  return dialogRoleMeta("user");
}

function parseToolDialogBody(body) {
  try {
    const parsed = JSON.parse(String(body || "").trim());
    if (!parsed || typeof parsed !== "object") return null;
    return {
      tool: String(parsed.tool || "tool").trim() || "tool",
      toolId: String(parsed.toolId || parsed.tool || "tool").trim() || "tool",
      args: String(parsed.args ?? ""),
      result: String(parsed.result ?? ""),
      status: String(parsed.status || "ok").trim() || "ok"
    };
  } catch {
    return null;
  }
}

function formatShellDialogBlock({
  role = "user",
  text = "",
  runtime = "qwenpaw",
  sessionId = "",
  created = new Date()
} = {}) {
  const body = String(text || "").trim();
  const runtimeId = normalizeMessageRuntime(runtime);
  const createdIso = created instanceof Date ? created.toISOString() : String(created || new Date().toISOString());
  const meta = dialogRoleMeta(role);
  const sid = String(sessionId || "").trim();
  const frontmatter = [
    "---",
    `awn-role: ${meta.role}`,
    `awn-author: ${meta.author}`,
    `awn-created: ${createdIso}`,
    `awn-runtime: ${runtimeId}`,
    sid ? `awn-session: ${sid}` : null,
    "---"
  ].filter(Boolean);
  return `\n\n---\n\n${frontmatter.join("\n")}\n\n${body}\n`;
}

const SHELL_DIALOG_BLOCK_SPLIT_RE = /\n\n---\r?\n\r?\n(?=---\r?\nawn-role:)/;

function parseShellDialogBlock(block) {
  const trimmed = String(block || "").trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("---")) {
    const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n\r?\n([\s\S]*)$/);
    if (match) {
      const frontmatter = match[1];
      const body = match[2].trim();
      if (!body) return null;
      const roleRaw = (frontmatter.match(/^awn-role:\s*(.+)$/m) || [])[1] || "";
      const authorRaw = (frontmatter.match(/^awn-author:\s*(.+)$/m) || [])[1] || "";
      const createdRaw = (frontmatter.match(/^awn-created:\s*(.+)$/m) || [])[1] || "";
      const runtimeRaw = (frontmatter.match(/^awn-runtime:\s*(.+)$/m) || [])[1] || "";
      const sessionRaw = (frontmatter.match(/^awn-session:\s*(.+)$/m) || [])[1] || "";
      const meta = normalizeDialogRole(roleRaw, authorRaw);
      const at = Date.parse(String(createdRaw).trim()) || Date.now();
      const base = {
        role: meta.role,
        author: authorRaw.trim() || meta.author,
        label: meta.label,
        body,
        at,
        runtime: normalizeMessageRuntime(runtimeRaw || "qwenpaw"),
        sessionId: String(sessionRaw || "").trim()
      };
      if (meta.role === "tool") {
        const tool = parseToolDialogBody(body);
        if (tool) {
          return {
            ...base,
            tool: tool.tool,
            toolId: tool.toolId,
            args: tool.args,
            result: tool.result,
            status: tool.status
          };
        }
      }
      return base;
    }
  }

  const legacy = trimmed.match(/^\*\*(.+?) · (.+?)(?: · (.+?))?\*\*\n\n([\s\S]*)$/);
  if (legacy) {
    const createdRaw = legacy[1];
    const authorRaw = legacy[2];
    const runtimeRaw = legacy[3] || "";
    const body = legacy[4].trim();
    if (!body) return null;
    const meta = normalizeDialogRole("", authorRaw);
    return {
      role: meta.role,
      author: meta.author,
      label: meta.label,
      body,
      at: Date.parse(String(createdRaw).trim()) || Date.now(),
      runtime: normalizeMessageRuntime(runtimeRaw || "qwenpaw")
    };
  }

  return null;
}

function parseShellDialogFile(content) {
  const text = String(content || "");
  if (!text.trim()) return [];
  return text
    .split(SHELL_DIALOG_BLOCK_SPLIT_RE)
    .map(parseShellDialogBlock)
    .filter(Boolean);
}

async function listDialogDayFiles(dirAbsolute) {
  try {
    const entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && DIALOG_DAY_FILE_RE.test(entry.name))
      .map((entry) => path.join(dirAbsolute, entry.name));
  } catch {
    return [];
  }
}

async function listSessionSubdirDayFiles(runtimeDir) {
  const files = [];
  try {
    const entries = await fs.readdir(runtimeDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(runtimeDir, entry.name);
      if (entry.name === LEGACY_SESSION_UID_DIR) {
        try {
          const nested = await fs.readdir(full, { withFileTypes: true });
          for (const child of nested) {
            if (!child.isDirectory()) continue;
            files.push(...await listDialogDayFiles(path.join(full, child.name)));
          }
        } catch {
          /* ignore */
        }
        continue;
      }
      files.push(...await listDialogDayFiles(full));
    }
  } catch {
    /* no session folders yet */
  }
  return files;
}

async function collectDialogDayFiles(agentRoot, runtime, sessionId = "") {
  const runtimeDir = path.join(agentRoot, runtimeDialogDir(runtime));
  const files = new Set();
  const sid = String(sessionId || "").trim();
  if (sid) {
    const sessionDir = path.join(agentRoot, sessionDialogDir(runtime, sid));
    for (const filePath of await listDialogDayFiles(sessionDir)) files.add(filePath);
    for (const filePath of await listDialogDayFiles(path.join(runtimeDir, LEGACY_SESSION_UID_DIR, safeSessionDirName(sid)))) {
      files.add(filePath);
    }
    return [...files];
  }
  for (const filePath of await listDialogDayFiles(runtimeDir)) files.add(filePath);
  for (const filePath of await listSessionSubdirDayFiles(runtimeDir)) files.add(filePath);
  return [...files];
}

async function readShellDialogHistory(agentRoot, { runtime = "qwenpaw", sessionId = "", limit = 25, days = 14 } = {}) {
  if (!agentRoot) return [];

  const runtimeId = normalizeMessageRuntime(runtime);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const safeDays = Math.min(30, Math.max(1, Number(days) || 14));
  const filePaths = new Set(await collectDialogDayFiles(agentRoot, runtimeId, sessionId));
  for (const filePath of await listDialogDayFiles(path.join(agentRoot, LEGACY_CHATS_DIR))) {
    if (!sessionId) filePaths.add(filePath);
  }

  const sortedFiles = [...filePaths].sort((left, right) => path.basename(right).localeCompare(path.basename(left)));
  const selectedFiles = sortedFiles.slice(0, safeDays);
  const messages = [];

  for (const filePath of selectedFiles) {
    const content = await fs.readFile(filePath, "utf-8").catch(() => "");
    messages.push(...parseShellDialogFile(content));
  }

  messages.sort((left, right) => left.at - right.at);
  return messages.slice(-safeLimit);
}

async function appendShellDialogTool(
  agentRoot,
  { tool = "tool", toolId = "", args = "", result = "", status = "ok", runtime = "qwenpaw", sessionId = "" } = {}
) {
  const payload = {
    tool: String(tool || "tool").trim() || "tool",
    toolId: String(toolId || tool || "tool").trim() || "tool",
    args: String(args ?? ""),
    result: String(result ?? ""),
    status: String(status || "ok").trim() || "ok"
  };
  return appendShellDialogChat(agentRoot, {
    role: "tool",
    text: JSON.stringify(payload),
    runtime,
    sessionId
  });
}

async function appendShellDialogChat(
  agentRoot,
  { role = "user", text = "", runtime = "qwenpaw", sessionId = "" } = {}
) {
  const body = String(text || "").trim();
  if (!body || !agentRoot) return null;

  const runtimeId = normalizeMessageRuntime(runtime);
  const sid = String(sessionId || "").trim();
  const file = path.join(agentRoot, sessionDialogDir(runtimeId, sid), `${dateStamp()}.md`);
  await fs.mkdir(path.dirname(file), { recursive: true });

  const meta = dialogRoleMeta(role);
  const block = formatShellDialogBlock({ role, text: body, runtime: runtimeId, sessionId: sid });
  await fs.appendFile(file, block, "utf-8");
  return {
    path: relPath(agentRoot, file),
    role: meta.role,
    author: meta.author,
    label: meta.label,
    runtime: runtimeId,
    sessionId: sid || OPEN_SESSION,
    bytes: body.length
  };
}

function normalizeAudioChannel(value) {
  const channel = String(value || "stt").trim().toLowerCase();
  return AUDIO_CHANNELS.has(channel) ? channel : "stt";
}

function normalizeAudioExt(ext, mimeType = "") {
  const raw = String(ext || "").trim().toLowerCase().replace(/^\./, "");
  if (raw) return raw;
  const mime = String(mimeType || "").toLowerCase();
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("pcm")) return "pcm";
  return "bin";
}

function formatShellAudioMarkdown({
  channel = "stt",
  audioFile = "",
  text = "",
  created = new Date(),
  meta = {}
} = {}) {
  const createdIso = created instanceof Date ? created.toISOString() : String(created || new Date().toISOString());
  const body = String(text || "").trim();
  const frontmatter = [
    "---",
    `awn-kind: ${normalizeAudioChannel(channel)}`,
    `awn-created: ${createdIso}`,
    audioFile ? `awn-audio: ${audioFile}` : null,
    ...Object.entries(meta || {})
      .map(([key, value]) => {
        const normalized = String(value ?? "").trim();
        if (!normalized) return null;
        return `awn-${key}: ${normalized}`;
      })
      .filter(Boolean),
    "---"
  ].filter(Boolean);
  return `${frontmatter.join("\n")}\n\n${body}\n`;
}

/** Пара файлов: awn-dialogs/audio/{stt|tts}/<stamp>.<ext> + <stamp>.md */
async function saveShellAudioPair(
  agentRoot,
  { channel = "stt", data, ext = "", mimeType = "", text = "", meta = {}, created = new Date() } = {}
) {
  if (!agentRoot || !data) return null;
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (!buffer.length) return null;

  const kind = normalizeAudioChannel(channel);
  const dir = path.join(agentRoot, AUDIO_DIR, kind);
  await fs.mkdir(dir, { recursive: true });

  const stamp = timeStamp(created instanceof Date ? created : new Date());
  const audioExt = normalizeAudioExt(ext, mimeType);
  const audioName = `${stamp}.${audioExt}`;
  const mdName = `${stamp}.md`;
  const audioPath = path.join(dir, audioName);
  const mdPath = path.join(dir, mdName);

  await fs.writeFile(audioPath, buffer);
  await fs.writeFile(
    mdPath,
    formatShellAudioMarkdown({
      channel: kind,
      audioFile: audioName,
      text,
      created,
      meta
    }),
    "utf-8"
  );

  return {
    channel: kind,
    path: relPath(agentRoot, audioPath),
    mdPath: relPath(agentRoot, mdPath),
    audioFile: audioName,
    mdFile: mdName,
    bytes: buffer.length,
    ext: audioExt
  };
}

/** @deprecated Используйте saveShellAudioPair — старый путь records/{kind}/ */
async function saveShellVoiceRecord(agentRoot, { kind = "meeting", data, ext = "pcm" } = {}) {
  return saveShellAudioPair(agentRoot, {
    channel: "stt",
    data,
    ext,
    meta: { mode: String(kind || "meeting").trim() || "meeting" }
  });
}

module.exports = {
  appendShellDialogChat,
  appendShellDialogTool,
  readShellDialogHistory,
  parseShellDialogFile,
  formatShellDialogBlock,
  dialogRoleMeta,
  saveShellVoiceRecord,
  saveShellAudioPair,
  formatShellAudioMarkdown,
  runtimeDialogDir,
  sessionDialogDir,
  sessionIdFromSettings,
  DIALOGS_DIR,
  LEGACY_CHATS_DIR,
  RECORDS_DIR,
  AUDIO_DIR
};
