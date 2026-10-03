const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { rel, abs } = require("../paths/agent-cms");

const FILE_HUB_QUEUE_REL_PATH = rel.state.fileHubQueue;

function normalizeWorkspacePath(raw) {
  const value = String(raw || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();
  if (!value || value.includes("..")) return "";
  return value;
}

function dirnameHint(filePath) {
  const dir = path.posix.dirname(filePath);
  if (!dir || dir === ".") return "workspace";
  return `${dir}/`;
}

function basenameHint(filePath) {
  const base = path.posix.basename(filePath);
  return base || filePath;
}

function normalizeQueueDocument(raw) {
  const items = Array.isArray(raw?.items) ? raw.items : [];
  const normalized = [];
  const seen = new Set();
  for (const row of items) {
    const filePath = normalizeWorkspacePath(row?.path);
    if (!filePath || seen.has(filePath)) continue;
    seen.add(filePath);
    const id = String(row?.id || "").trim() || crypto.randomUUID();
    const name = String(row?.name || "").trim() || basenameHint(filePath);
    const topic = String(row?.topic || "").trim() || "Файлообменник";
    const place = String(row?.place || "").trim() || dirnameHint(filePath);
    const sizeRaw = Number(row?.size);
    const size = Number.isFinite(sizeRaw) && sizeRaw >= 0 ? sizeRaw : null;
    const sentAt = String(row?.sentAt || "").trim() || new Date().toISOString();
    normalized.push({ id, path: filePath, name, topic, place, size, sentAt });
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: normalized
  };
}

async function readFileHubQueue(agentRoot) {
  if (!agentRoot) {
    return { exists: false, queue: { version: 1, updatedAt: null, items: [] }, path: FILE_HUB_QUEUE_REL_PATH };
  }
  const absolute = abs(agentRoot, FILE_HUB_QUEUE_REL_PATH);
  try {
    const raw = await fs.readFile(absolute, "utf-8");
    const parsed = JSON.parse(raw);
    const queue = normalizeQueueDocument(parsed);
    return { exists: true, queue, path: FILE_HUB_QUEUE_REL_PATH };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        exists: false,
        queue: { version: 1, updatedAt: null, items: [] },
        path: FILE_HUB_QUEUE_REL_PATH
      };
    }
    throw error;
  }
}

async function writeFileHubQueue(agentRoot, queue) {
  if (!agentRoot) throw new Error("Agent root is required");
  const normalized = normalizeQueueDocument(queue);
  await fs.mkdir(abs(agentRoot, rel.state.dir), { recursive: true });
  const absolute = abs(agentRoot, FILE_HUB_QUEUE_REL_PATH);
  await fs.writeFile(absolute, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  return { path: FILE_HUB_QUEUE_REL_PATH, queue: normalized };
}

async function sendFileToFileHub(agentRoot, payload = {}) {
  const filePath = normalizeWorkspacePath(payload.path);
  if (!filePath) {
    return { error: "path is required", status: 400 };
  }
  const current = await readFileHubQueue(agentRoot);
  const queue = normalizeQueueDocument(current.queue);
  const existing = queue.items.find((item) => item.path === filePath);
  if (existing) {
    return { path: FILE_HUB_QUEUE_REL_PATH, queue, item: existing, alreadyQueued: true };
  }
  const item = {
    id: crypto.randomUUID(),
    path: filePath,
    name: String(payload.name || "").trim() || basenameHint(filePath),
    topic: String(payload.topic || "").trim() || "Файлообменник",
    place: String(payload.place || "").trim() || dirnameHint(filePath),
    size:
      Number.isFinite(Number(payload.size)) && Number(payload.size) >= 0 ? Math.floor(Number(payload.size)) : null,
    sentAt: new Date().toISOString()
  };
  queue.items.unshift(item);
  const written = await writeFileHubQueue(agentRoot, queue);
  return { ...written, item, alreadyQueued: false };
}

async function removeFileFromFileHub(agentRoot, payload = {}) {
  const id = String(payload.id || "").trim();
  const filePath = normalizeWorkspacePath(payload.path);
  if (!id && !filePath) {
    return { error: "id or path is required", status: 400 };
  }
  const current = await readFileHubQueue(agentRoot);
  const queue = normalizeQueueDocument(current.queue);
  const before = queue.items.length;
  queue.items = queue.items.filter((item) => {
    if (id && item.id === id) return false;
    if (filePath && item.path === filePath) return false;
    return true;
  });
  if (queue.items.length === before) {
    return { error: "Item not found in file hub queue", status: 404 };
  }
  const written = await writeFileHubQueue(agentRoot, queue);
  return { ...written, removed: true };
}

module.exports = {
  FILE_HUB_QUEUE_REL_PATH,
  readFileHubQueue,
  writeFileHubQueue,
  sendFileToFileHub,
  removeFileFromFileHub,
  normalizeWorkspacePath
};
