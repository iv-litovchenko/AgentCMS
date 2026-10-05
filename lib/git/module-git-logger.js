const path = require("path");
const fs = require("fs/promises");

const MODULE_GIT_LOG_REL = ".agent-cms/logs/module-git.log";
const MODULE_GIT_LOG_MAX_READ_BYTES = 512 * 1024;

function moduleGitLogAbsolute(agentRoot) {
  const root = String(agentRoot || "").trim();
  if (!root) return "";
  return path.join(root, MODULE_GIT_LOG_REL);
}

function formatLogLine(entry = {}) {
  const ts = entry.ts || new Date().toISOString();
  const level = String(entry.level || "info").toUpperCase();
  const event = String(entry.event || "event").trim();
  const message = String(entry.message || "").trim();
  const detail =
    entry.detail && typeof entry.detail === "object" && Object.keys(entry.detail).length
      ? ` ${JSON.stringify(entry.detail)}`
      : "";
  return `${ts} [${level}] ${event}${message ? ` ${message}` : ""}${detail}\n`;
}

async function appendModuleGitLog(agentRoot, entry = {}) {
  const abs = moduleGitLogAbsolute(agentRoot);
  if (!abs) return;
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.appendFile(abs, formatLogLine(entry), "utf-8");
}

async function readModuleGitLog(agentRoot, { maxBytes = MODULE_GIT_LOG_MAX_READ_BYTES } = {}) {
  const abs = moduleGitLogAbsolute(agentRoot);
  if (!abs) {
    return { path: MODULE_GIT_LOG_REL, content: "", truncated: false, size: 0 };
  }
  try {
    const st = await fs.stat(abs);
    const size = st.size;
    if (size <= maxBytes) {
      const content = await fs.readFile(abs, "utf-8");
      return { path: MODULE_GIT_LOG_REL, content, truncated: false, size };
    }
    const handle = await fs.open(abs, "r");
    const buffer = Buffer.alloc(maxBytes);
    await handle.read(buffer, 0, maxBytes, size - maxBytes);
    await handle.close();
    const content = `… (показаны последние ${maxBytes} байт из ${size})\n\n${buffer.toString("utf-8")}`;
    return { path: MODULE_GIT_LOG_REL, content, truncated: true, size };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { path: MODULE_GIT_LOG_REL, content: "", truncated: false, size: 0 };
    }
    throw error;
  }
}

async function clearModuleGitLog(agentRoot) {
  const abs = moduleGitLogAbsolute(agentRoot);
  if (!abs) return { cleared: false };
  try {
    await fs.unlink(abs);
    return { cleared: true };
  } catch (error) {
    if (error?.code === "ENOENT") return { cleared: true };
    throw error;
  }
}

module.exports = {
  MODULE_GIT_LOG_REL,
  moduleGitLogAbsolute,
  appendModuleGitLog,
  readModuleGitLog,
  clearModuleGitLog
};
