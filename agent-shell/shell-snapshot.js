const fs = require("fs/promises");
const path = require("path");
const {
  shellSnapshotCacheDir,
  shellSnapshotCacheRel,
  rewriteShellSnapshotRelPath
} = require("../lib/paths/agent-cms");

function parseDataUrl(dataUrl) {
  const raw = String(dataUrl || "").trim();
  const match = /^data:([^;]+);base64,(.+)$/i.exec(raw);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

function snapshotDir(agentRoot, domain) {
  return shellSnapshotCacheDir(agentRoot, domain);
}

async function saveSnapshotFile(agentRoot, domain, kind, snapshot) {
  const parsed = parseDataUrl(snapshot?.dataUrl);
  if (!parsed) throw new Error("Invalid image data URL");

  const dir = snapshotDir(agentRoot, domain);
  await fs.mkdir(dir, { recursive: true });
  const ext = parsed.mimeType.includes("png") ? "png" : "jpg";
  const fileName = `${kind}-${Date.now()}.${ext}`;
  const absPath = path.join(dir, fileName);
  await fs.writeFile(absPath, Buffer.from(parsed.base64, "base64"));

  const meta = {
    id: fileName,
    domain,
    kind,
    mimeType: parsed.mimeType,
    width: Number(snapshot.width) || 0,
    height: Number(snapshot.height) || 0,
    capturedAt: new Date().toISOString(),
    path: path.join(shellSnapshotCacheRel(domain), fileName).replace(/\\/g, "/")
  };

  const metaPath = path.join(dir, `${kind}-latest.json`);
  await fs.writeFile(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf-8");
  return meta;
}

async function readLatestMeta(agentRoot, domain, kind) {
  try {
    const raw = await fs.readFile(path.join(snapshotDir(agentRoot, domain), `${kind}-latest.json`), "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed?.path) {
      parsed.path = rewriteShellSnapshotRelPath(parsed.path);
    }
    return parsed;
  } catch {
    return null;
  }
}

async function readLatestSnapshot(agentRoot, domain, kind) {
  const meta = await readLatestMeta(agentRoot, domain, kind);
  if (!meta?.path) return null;
  const absPath = path.join(agentRoot, meta.path);
  const buffer = await fs.readFile(absPath);
  return {
    ...meta,
    base64: buffer.toString("base64"),
    dataUrl: `data:${meta.mimeType};base64,${buffer.toString("base64")}`
  };
}

function createSnapshotRequestService({
  emitShellEvent,
  eventName,
  requestPrefix,
  timeoutMessage
}) {
  const pendingRequests = new Map();

  function requestKey(agentId, requestId) {
    return `${agentId}:${requestId}`;
  }

  function requestSnapshot(agentId, { waitMs = 15000, reason = "" } = {}) {
    const requestId = `${requestPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const key = requestKey(agentId, requestId);

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pendingRequests.delete(key);
        reject(new Error(timeoutMessage));
      }, Math.max(1000, Math.min(Number(waitMs) || 15000, 60000)));

      pendingRequests.set(key, {
        resolve: (value) => {
          clearTimeout(timer);
          pendingRequests.delete(key);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          pendingRequests.delete(key);
          reject(error);
        }
      });

      emitShellEvent(agentId, eventName, { requestId, reason: String(reason || "") });
    });
  }

  function completeSnapshot(agentId, requestId, snapshot) {
    const key = requestKey(agentId, requestId);
    const pending = pendingRequests.get(key);
    if (!pending) return false;
    pending.resolve(snapshot);
    return true;
  }

  return { requestSnapshot, completeSnapshot, saveSnapshotFile, readLatestMeta, readLatestSnapshot };
}

module.exports = {
  createSnapshotRequestService,
  parseDataUrl,
  saveSnapshotFile,
  readLatestMeta,
  readLatestSnapshot,
  snapshotDir
};
