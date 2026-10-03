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
    const size = Number.isFinite(sizeRaw) && sizeRaw > 0 ? Math.floor(sizeRaw) : null;
    const sentAt = String(row?.sentAt || "").trim() || new Date().toISOString();
    normalized.push({ id, path: filePath, name, topic, place, size, sentAt });
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: normalized
  };
}

const QUEUE_PATH_SKIP_DIRS = new Set([".git", "node_modules", ".agent-cms"]);

async function workspaceFileExists(agentRoot, filePath) {
  const normalized = normalizeWorkspacePath(filePath);
  if (!normalized || !agentRoot) return false;
  const absolute = abs(agentRoot, normalized);
  try {
    const stat = await fs.stat(absolute);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function readWorkspaceFileSize(agentRoot, filePath) {
  const normalized = normalizeWorkspacePath(filePath);
  if (!normalized || !agentRoot) return null;
  const absolute = abs(agentRoot, normalized);
  try {
    const stat = await fs.stat(absolute);
    if (!stat.isFile()) return null;
    return stat.size;
  } catch {
    return null;
  }
}

function pickBestBasenameMatch(rawPath, matches) {
  if (!matches.length) return null;
  const norm = String(rawPath || "").replace(/^\/+/, "");
  let hit = matches.find((m) => m === norm);
  if (hit) return hit;
  hit = matches.find((m) => m.endsWith(`/${norm}`));
  if (hit) return hit;
  if (matches.length === 1) return matches[0];
  hit = matches.find((m) => /awn-storage\/(?:media|assets)\//i.test(m));
  if (hit) return hit;
  hit = matches.find((m) => /awn-storage\//i.test(m));
  if (hit) return hit;
  return null;
}

async function findWorkspaceRelPathsByBasename(agentRoot, basename, limit = 16) {
  const target = String(basename || "").trim();
  if (!target || !agentRoot) return [];
  const matches = [];
  let visitedDirs = 0;
  const maxDirs = 6000;

  async function walk(dirRel) {
    if (matches.length >= limit || visitedDirs >= maxDirs) return;
    visitedDirs += 1;
    const dirAbs = dirRel ? abs(agentRoot, dirRel) : agentRoot;
    let entries;
    try {
      entries = await fs.readdir(dirAbs, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      if (matches.length >= limit) return;
      const name = ent.name;
      if (ent.isDirectory()) {
        if (QUEUE_PATH_SKIP_DIRS.has(name)) continue;
        const childRel = dirRel ? `${dirRel}/${name}` : name;
        await walk(childRel);
      } else if (ent.isFile() && name === target) {
        matches.push(dirRel ? `${dirRel}/${name}` : name);
      }
    }
  }

  await walk("");
  return matches;
}

async function resolveQueueItemWorkspacePath(agentRoot, rawPath) {
  const normalized = normalizeWorkspacePath(rawPath);
  if (!normalized || !agentRoot) return { path: normalized, repaired: false };
  if (await workspaceFileExists(agentRoot, normalized)) {
    return { path: normalized, repaired: false };
  }
  const base = path.posix.basename(normalized);
  const matches = await findWorkspaceRelPathsByBasename(agentRoot, base);
  const picked = pickBestBasenameMatch(normalized, matches);
  if (picked && picked !== normalized) {
    return { path: picked, repaired: true };
  }
  return { path: normalized, repaired: false };
}

async function enrichQueueItem(agentRoot, item) {
  if (!item || typeof item !== "object") return { item, dirty: false };
  let dirty = false;
  let filePath = item.path;
  const resolved = await resolveQueueItemWorkspacePath(agentRoot, filePath);
  if (resolved.path && resolved.path !== filePath) {
    filePath = resolved.path;
    dirty = true;
  }

  let size = item.size;
  const sizeNum = Number(size);
  if (!Number.isFinite(sizeNum) || sizeNum <= 0) {
    const fromDisk = await readWorkspaceFileSize(agentRoot, filePath);
    if (Number.isFinite(fromDisk) && fromDisk > 0) {
      size = fromDisk;
      dirty = true;
    } else if (size !== null && size !== undefined) {
      size = null;
      if (item.size === 0 || item.size != null) dirty = true;
    }
  }

  let place = item.place;
  if (filePath !== item.path) {
    const nextPlace = dirnameHint(filePath);
    if (nextPlace !== place) {
      place = nextPlace;
      dirty = true;
    }
  }

  const next = { ...item, path: filePath, size, place };
  return { item: next, dirty };
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
    let dirty = false;
    const items = [];
    for (const row of queue.items) {
      const { item, dirty: rowDirty } = await enrichQueueItem(agentRoot, row);
      if (rowDirty) dirty = true;
      items.push(item);
    }
    const enrichedQueue = { ...queue, items };
    if (dirty) {
      await writeFileHubQueue(agentRoot, enrichedQueue);
    }
    return { exists: true, queue: enrichedQueue, path: FILE_HUB_QUEUE_REL_PATH };
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

async function addFileToFileHub(agentRoot, payload = {}) {
  const filePathRaw = normalizeWorkspacePath(payload.path);
  if (!filePathRaw) {
    return { error: "path is required", status: 400 };
  }
  const resolved = await resolveQueueItemWorkspacePath(agentRoot, filePathRaw);
  const filePath = resolved.path || filePathRaw;
  const current = await readFileHubQueue(agentRoot);
  const queue = normalizeQueueDocument(current.queue);
  const existing = queue.items.find((item) => item.path === filePath || item.path === filePathRaw);
  if (existing) {
    return { path: FILE_HUB_QUEUE_REL_PATH, queue, item: existing, alreadyQueued: true };
  }
  let size =
    Number.isFinite(Number(payload.size)) && Number(payload.size) > 0 ? Math.floor(Number(payload.size)) : null;
  if (size == null) {
    const fromDisk = await readWorkspaceFileSize(agentRoot, filePath);
    if (Number.isFinite(fromDisk) && fromDisk > 0) size = fromDisk;
  }
  const item = {
    id: crypto.randomUUID(),
    path: filePath,
    name: String(payload.name || "").trim() || basenameHint(filePath),
    topic: String(payload.topic || "").trim() || "Файлообменник",
    place: String(payload.place || "").trim() || dirnameHint(filePath),
    size,
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

async function clearFileHubQueue(agentRoot) {
  if (!agentRoot) throw new Error("Agent root is required");
  const current = await readFileHubQueue(agentRoot);
  const removedCount = Array.isArray(current.queue?.items) ? current.queue.items.length : 0;
  const written = await writeFileHubQueue(agentRoot, { version: 1, items: [] });
  return { ...written, cleared: true, removedCount };
}

module.exports = {
  FILE_HUB_QUEUE_REL_PATH,
  readFileHubQueue,
  writeFileHubQueue,
  addFileToFileHub,
  /** @deprecated use addFileToFileHub */
  sendFileToFileHub: addFileToFileHub,
  removeFileFromFileHub,
  clearFileHubQueue,
  normalizeWorkspacePath
};
