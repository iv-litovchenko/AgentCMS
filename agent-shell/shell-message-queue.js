const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { sessionDialogDir } = require("./shell-dialog-log");
const { normalizeMessageRuntime } = require("./shell-runtimes");

/** awn-dialogs/<runtime>/<session-id>/queue/*.json — после обработки файл удаляется. */
const QUEUE_DIR_NAME = "queue";

const writeLocks = new Map();

function normalizeQueueScope(scope = {}) {
  const agentRoot = String(scope.agentRoot || "").trim();
  if (!agentRoot) throw new Error("agentRoot is required");
  const runtime = normalizeMessageRuntime(scope.runtime || "qwenpaw");
  const sessionId = String(scope.sessionId || "").trim();
  return { agentRoot, runtime, sessionId };
}

function queueDir(scope = {}) {
  const { agentRoot, runtime, sessionId } = normalizeQueueScope(scope);
  return path.join(agentRoot, sessionDialogDir(runtime, sessionId), QUEUE_DIR_NAME);
}

function queueFilePath(scope, id) {
  return path.join(queueDir(scope), `${id}.json`);
}

function newQueueId() {
  return `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
}

async function withQueueLock(scope, fn) {
  const key = queueDir(scope);
  const previous = writeLocks.get(key) || Promise.resolve();
  const job = previous.catch(() => {}).then(fn);
  writeLocks.set(
    key,
    job.finally(() => {
      if (writeLocks.get(key) === job) writeLocks.delete(key);
    })
  );
  return job;
}

async function ensureQueueDir(scope) {
  await fs.mkdir(queueDir(scope), { recursive: true });
}

async function readQueueFile(scope, id) {
  try {
    const raw = await fs.readFile(queueFilePath(scope, id), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeQueueFile(scope, item) {
  await ensureQueueDir(scope);
  const target = queueFilePath(scope, item.id);
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(item, null, 2)}\n`, "utf-8");
  await fs.rename(tmp, target);
  return item;
}

async function migrateLegacyQueueLayout(scope) {
  const { agentRoot } = normalizeQueueScope(scope);
  const targetDir = queueDir(scope);
  const legacyRoots = [
    path.join(agentRoot, QUEUE_DIR_NAME),
    path.join(agentRoot, QUEUE_DIR_NAME, "items")
  ];
  await ensureQueueDir(scope);
  for (const legacyRoot of legacyRoots) {
    let entries = [];
    try {
      entries = await fs.readdir(legacyRoot, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
      const id = entry.name.replace(/\.json$/i, "");
      await fs
        .rename(path.join(legacyRoot, entry.name), path.join(targetDir, `${id}.json`))
        .catch(() => {});
    }
    if (legacyRoot.endsWith("items")) {
      await fs.rmdir(legacyRoot).catch(() => {});
    }
  }
  await fs.unlink(path.join(agentRoot, QUEUE_DIR_NAME, "index.json")).catch(() => {});
}

async function listQueueFiles(scope) {
  await migrateLegacyQueueLayout(scope);
  await ensureQueueDir(scope);
  let entries = [];
  try {
    entries = await fs.readdir(queueDir(scope), { withFileTypes: true });
  } catch {
    return [];
  }
  const names = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json") && !entry.name.startsWith("."))
    .map((entry) => entry.name.replace(/\.json$/i, ""))
    .sort();
  const items = [];
  for (const id of names) {
    const item = await readQueueFile(scope, id);
    if (item) items.push(item);
  }
  return items;
}

function serializeQueueItem(item, position = 0) {
  return {
    id: item.id,
    text: item.body,
    body: item.body,
    voice: Boolean(item.voice),
    author: item.author || "shell",
    status: item.status || "pending",
    createdAt: item.createdAt,
    startedAt: item.startedAt || null,
    finishedAt: item.finishedAt || null,
    error: item.error || "",
    position
  };
}

async function listShellMessageQueue(scope) {
  const all = await listQueueFiles(scope);
  const processing = all.find((item) => item.status === "processing") || null;
  const pending = all.filter((item) => item.status === "pending");
  return {
    processingId: processing?.id || null,
    processing: processing ? serializeQueueItem(processing) : null,
    items: pending.map((item, index) => serializeQueueItem(item, index + 1))
  };
}

async function enqueueShellMessage(scope, payload = {}) {
  const body = String(payload.body || "").trim();
  if (!body) throw new Error("Message body is required");

  return withQueueLock(scope, async () => {
    const id = newQueueId();
    const item = {
      id,
      body,
      author: String(payload.author || "shell").trim() || "shell",
      voice: Boolean(payload.voice),
      displayPhrase: String(payload.displayPhrase || "").trim(),
      shellClientId: String(payload.shellClientId || payload.clientId || "").trim(),
      surfaceHost: String(payload.surfaceHost || "").trim(),
      surfaceHint: String(payload.surfaceHint || "").trim(),
      surfaceBackend: String(payload.surfaceBackend || "").trim(),
      hostUrl: String(payload.hostUrl || "").trim(),
      ttsEnabled: payload.ttsEnabled,
      ttsPrompt: payload.ttsPrompt,
      deviceContext: payload.deviceContext && typeof payload.deviceContext === "object" ? payload.deviceContext : null,
      sttRaw: payload.sttRaw,
      sttRefined: payload.sttRefined,
      sttRefineApplied: payload.sttRefineApplied,
      sttRefineError: payload.sttRefineError,
      status: "pending",
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      error: ""
    };
    await writeQueueFile(scope, item);
    return { item, queue: await listShellMessageQueue(scope) };
  });
}

async function claimNextShellQueueItem(scope) {
  return withQueueLock(scope, async () => {
    const all = await listQueueFiles(scope);
    if (all.some((item) => item.status === "processing")) return null;
    const next = all.find((item) => item.status === "pending");
    if (!next) return null;
    next.status = "processing";
    next.startedAt = new Date().toISOString();
    await writeQueueFile(scope, next);
    return next;
  });
}

async function finishShellQueueItem(scope, id, { error = "" } = {}) {
  return withQueueLock(scope, async () => {
    const item = await readQueueFile(scope, id);
    if (!item) return null;
    await fs.unlink(queueFilePath(scope, id)).catch(() => {});
    return { ...item, status: error ? "error" : "done", error: String(error || "").trim() };
  });
}

async function updateShellQueueItem(scope, id, patch = {}) {
  return withQueueLock(scope, async () => {
    const item = await readQueueFile(scope, id);
    if (!item) throw new Error("Queue item not found");
    if (item.status !== "pending") throw new Error("Only pending queue items can be edited");
    const body = String(patch.body ?? patch.text ?? item.body ?? "").trim();
    if (!body) throw new Error("Message body is required");
    item.body = body;
    await writeQueueFile(scope, item);
    return { item, queue: await listShellMessageQueue(scope) };
  });
}

async function removeShellQueueItem(scope, id) {
  return withQueueLock(scope, async () => {
    const item = await readQueueFile(scope, id);
    if (!item) return { queue: await listShellMessageQueue(scope) };
    if (item.status === "processing") throw new Error("Cannot remove item while it is processing");
    await fs.unlink(queueFilePath(scope, id)).catch(() => {});
    return { queue: await listShellMessageQueue(scope) };
  });
}

async function clearShellMessageQueue(scope, { pendingOnly = true } = {}) {
  return withQueueLock(scope, async () => {
    const all = await listQueueFiles(scope);
    for (const item of all) {
      if (pendingOnly && item.status === "processing") continue;
      if (!pendingOnly || item.status === "pending") {
        await fs.unlink(queueFilePath(scope, item.id)).catch(() => {});
      }
    }
    return { queue: await listShellMessageQueue(scope) };
  });
}

async function recoverStaleProcessingQueueItems(scope, { maxAgeMs = 6 * 60 * 1000 } = {}) {
  return withQueueLock(scope, async () => {
    const all = await listQueueFiles(scope);
    const now = Date.now();
    const stale = [];
    for (const item of all) {
      if (item.status !== "processing") continue;
      const startedAt = Date.parse(String(item.startedAt || ""));
      if (!Number.isFinite(startedAt) || now - startedAt <= maxAgeMs) continue;
      stale.push(item);
    }
    for (const item of stale) {
      await fs.unlink(queueFilePath(scope, item.id)).catch(() => {});
    }
    return stale;
  });
}

module.exports = {
  QUEUE_DIR_NAME,
  queueDir,
  listShellMessageQueue,
  enqueueShellMessage,
  claimNextShellQueueItem,
  finishShellQueueItem,
  updateShellQueueItem,
  removeShellQueueItem,
  clearShellMessageQueue,
  recoverStaleProcessingQueueItems,
  serializeQueueItem,
  normalizeQueueScope
};
