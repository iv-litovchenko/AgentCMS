const fs = require("fs/promises");
const path = require("path");
const { normalizeMessageRuntime } = require("./shell-runtimes");

const DIALOGS_DIR = "awn-dialogs";
const LEGACY_CHATS_DIR = path.join(DIALOGS_DIR, "chats");
const RECORDS_DIR = path.join(DIALOGS_DIR, "records");
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

function dialogRoleMeta(role) {
  if (role === "agent") {
    return { role: "agent", author: "AI", label: "AI" };
  }
  return { role: "user", author: "Human", label: "Human (человек)" };
}

function normalizeDialogRole(rawRole, rawAuthor = "") {
  const roleText = String(rawRole || "").trim().toLowerCase();
  const authorText = String(rawAuthor || "").trim().toLowerCase();
  if (roleText === "agent" || roleText === "assistant" || authorText === "ai" || authorText === "агент") {
    return dialogRoleMeta("agent");
  }
  return dialogRoleMeta("user");
}

function formatShellDialogBlock({ role = "user", text = "", runtime = "qwenpaw", created = new Date() } = {}) {
  const body = String(text || "").trim();
  const runtimeId = normalizeMessageRuntime(runtime);
  const createdIso = created instanceof Date ? created.toISOString() : String(created || new Date().toISOString());
  const meta = dialogRoleMeta(role);
  const frontmatter = [
    "---",
    `awn-role: ${meta.role}`,
    `awn-author: ${meta.author}`,
    `awn-created: ${createdIso}`,
    `awn-runtime: ${runtimeId}`,
    "---"
  ].join("\n");
  return `\n\n---\n\n${frontmatter}\n\n${body}\n`;
}

function parseShellDialogBlock(block) {
  const trimmed = String(block || "").trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("---")) {
    const match = trimmed.match(/^---\n([\s\S]*?)\n---\n\n([\s\S]*)$/);
    if (match) {
      const frontmatter = match[1];
      const body = match[2].trim();
      if (!body) return null;
      const roleRaw = (frontmatter.match(/^awn-role:\s*(.+)$/m) || [])[1] || "";
      const authorRaw = (frontmatter.match(/^awn-author:\s*(.+)$/m) || [])[1] || "";
      const createdRaw = (frontmatter.match(/^awn-created:\s*(.+)$/m) || [])[1] || "";
      const runtimeRaw = (frontmatter.match(/^awn-runtime:\s*(.+)$/m) || [])[1] || "";
      const meta = normalizeDialogRole(roleRaw, authorRaw);
      const at = Date.parse(String(createdRaw).trim()) || Date.now();
      return {
        role: meta.role,
        author: authorRaw.trim() || meta.author,
        label: meta.label,
        body,
        at,
        runtime: normalizeMessageRuntime(runtimeRaw || "qwenpaw")
      };
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
    .split(/\n\n---\n\n/)
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

async function readShellDialogHistory(agentRoot, { runtime = "qwenpaw", limit = 25, days = 14 } = {}) {
  if (!agentRoot) return [];

  const runtimeId = normalizeMessageRuntime(runtime);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 25));
  const safeDays = Math.min(30, Math.max(1, Number(days) || 14));
  const scanDirs = [
    path.join(agentRoot, runtimeDialogDir(runtimeId)),
    path.join(agentRoot, LEGACY_CHATS_DIR)
  ];

  const filePaths = new Set();
  for (const dirAbsolute of scanDirs) {
    const files = await listDialogDayFiles(dirAbsolute);
    for (const filePath of files) filePaths.add(filePath);
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

async function appendShellDialogChat(agentRoot, { role = "user", text = "", runtime = "qwenpaw" } = {}) {
  const body = String(text || "").trim();
  if (!body || !agentRoot) return null;

  const runtimeId = normalizeMessageRuntime(runtime);
  const file = path.join(agentRoot, runtimeDialogDir(runtimeId), `${dateStamp()}.md`);
  await fs.mkdir(path.dirname(file), { recursive: true });

  const meta = dialogRoleMeta(role);
  const block = formatShellDialogBlock({ role, text: body, runtime: runtimeId });
  await fs.appendFile(file, block, "utf-8");
  return {
    path: relPath(agentRoot, file),
    role: meta.role,
    author: meta.author,
    label: meta.label,
    runtime: runtimeId,
    bytes: body.length
  };
}

async function saveShellVoiceRecord(agentRoot, { kind = "meeting", data, ext = "pcm" } = {}) {
  if (!agentRoot || !data) return null;
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
  if (!buffer.length) return null;

  const dir = path.join(agentRoot, RECORDS_DIR, kind);
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${timeStamp()}.${ext}`);
  await fs.writeFile(file, buffer);
  return { path: relPath(agentRoot, file), bytes: buffer.length, kind };
}

module.exports = {
  appendShellDialogChat,
  readShellDialogHistory,
  parseShellDialogFile,
  formatShellDialogBlock,
  dialogRoleMeta,
  saveShellVoiceRecord,
  runtimeDialogDir,
  DIALOGS_DIR,
  LEGACY_CHATS_DIR,
  RECORDS_DIR
};
