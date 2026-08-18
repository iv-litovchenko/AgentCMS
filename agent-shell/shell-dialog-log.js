const fs = require("fs/promises");
const path = require("path");

const DIALOGS_DIR = "awn-dialogs";
const CHATS_DIR = path.join(DIALOGS_DIR, "chats");
const RECORDS_DIR = path.join(DIALOGS_DIR, "records");

function dateStamp(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function timeStamp(d = new Date()) {
  return d.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

function relPath(agentRoot, absPath) {
  return path.relative(agentRoot, absPath).split(path.sep).join("/");
}

async function appendShellDialogChat(agentRoot, { role = "user", text = "" } = {}) {
  const body = String(text || "").trim();
  if (!body || !agentRoot) return null;

  const file = path.join(agentRoot, CHATS_DIR, `${dateStamp()}.md`);
  await fs.mkdir(path.dirname(file), { recursive: true });

  const label = role === "agent" ? "Агент" : "Вы";
  const block = `\n\n---\n\n**${new Date().toISOString()} · ${label}**\n\n${body}\n`;
  await fs.appendFile(file, block, "utf-8");
  return { path: relPath(agentRoot, file), role, bytes: body.length };
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
  saveShellVoiceRecord,
  CHATS_DIR,
  RECORDS_DIR
};
