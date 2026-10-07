const fsp = require("fs/promises");
const path = require("path");
const { AWN_WORKSPACE_RECYCLE_FOLDER } = require("../config/manifest-paths");
const {
  allocateNextRecycleMarkerId,
  formatRecycleMarkerId
} = require("./recycle-store");

const TRASH_MARKER_PREFIX = ".trash.";
const RECYCLE_ENTRY_PREFIX = "re-";
const TOMBSTONE_VERSION = 1;

function getRecycleRootAbsolute(agentRoot) {
  return path.join(agentRoot, AWN_WORKSPACE_RECYCLE_FOLDER);
}

function buildRecycleEntryName(agentRoot, markerId, originalBaseName) {
  const label = formatRecycleMarkerId(agentRoot, markerId);
  const safeBase = String(originalBaseName || "item").replace(/[/\\]/g, "_");
  return `${RECYCLE_ENTRY_PREFIX}${label}-${safeBase}`;
}

function buildTrashMarkerFileName(agentRoot, markerId) {
  return `${TRASH_MARKER_PREFIX}${formatRecycleMarkerId(agentRoot, markerId)}`;
}

function parseRecycleEntryName(name) {
  const base = path.basename(String(name || ""));
  const match = /^re-(\d+)-(.+)$/.exec(base);
  if (!match) return null;
  return {
    markerLabel: match[1],
    markerId: Number.parseInt(match[1], 10),
    originalBaseName: match[2],
    recycleName: base
  };
}

function isTrashMarkerFileName(name) {
  const base = path.basename(String(name || ""));
  return base.startsWith(TRASH_MARKER_PREFIX) && base.length > TRASH_MARKER_PREFIX.length;
}

function isRecycleEntryFileName(name) {
  return Boolean(parseRecycleEntryName(name));
}

async function readTombstone(absolutePath) {
  try {
    const raw = await fsp.readFile(absolutePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeTombstone(absolutePath, payload) {
  await fsp.mkdir(path.dirname(absolutePath), { recursive: true });
  const body = `${JSON.stringify(payload, null, 2)}\n`;
  await fsp.writeFile(absolutePath, body, "utf-8");
}

function relFromAgentRoot(agentRoot, absolutePath) {
  const rel = path.relative(agentRoot, absolutePath);
  return rel.split(path.sep).join("/");
}

async function ensureRecycleRoot(agentRoot) {
  const abs = getRecycleRootAbsolute(agentRoot);
  await fsp.mkdir(abs, { recursive: true });
  return abs;
}

/**
 * Soft-delete file or directory: payload → awn-recycler/re-{id}-name, tombstone `.trash.{id}` at original parent.
 */
async function softDeleteWorkspacePath(agentRoot, targetAbsolute, options = {}) {
  const root = path.resolve(agentRoot);
  const absolute = path.resolve(String(targetAbsolute || ""));
  if (!absolute || !absolute.startsWith(root)) {
    return { error: "Path is outside workspace", status: 400 };
  }

  let stat;
  try {
    stat = await fsp.stat(absolute);
  } catch (error) {
    if (error && error.code === "ENOENT") return { error: "File not found", status: 404 };
    throw error;
  }

  const recycleRel = `${AWN_WORKSPACE_RECYCLE_FOLDER}/`;
  const rel = relFromAgentRoot(root, absolute);
  if (rel === AWN_WORKSPACE_RECYCLE_FOLDER || rel.startsWith(`${AWN_WORKSPACE_RECYCLE_FOLDER}/`)) {
    return { error: "Cannot delete recycle bin via soft delete", status: 400 };
  }

  const markerId = allocateNextRecycleMarkerId(root);
  const markerLabel = formatRecycleMarkerId(root, markerId);
  const originalBaseName = path.basename(absolute);
  const recycleName = buildRecycleEntryName(root, markerId, originalBaseName);
  const recycleAbsolute = path.join(await ensureRecycleRoot(root), recycleName);
  const parentAbsolute = path.dirname(absolute);
  const tombstoneAbsolute = path.join(parentAbsolute, buildTrashMarkerFileName(root, markerId));
  const originalRelativePath = rel;

  if (await pathExists(tombstoneAbsolute)) {
    return { error: "Trash marker already exists at target location", status: 409 };
  }
  if (await pathExists(recycleAbsolute)) {
    return { error: "Recycle entry name collision", status: 409 };
  }

  await fsp.rename(absolute, recycleAbsolute);

  const tombstone = {
    v: TOMBSTONE_VERSION,
    markerId,
    markerLabel,
    kind: stat.isDirectory() ? "directory" : "file",
    originalName: originalBaseName,
    originalRelativePath,
    recycleName,
    deletedAt: new Date().toISOString(),
    context: options.context || null
  };
  await writeTombstone(tombstoneAbsolute, tombstone);

  return {
    markerId,
    markerLabel,
    recycleName,
    originalRelativePath,
    tombstoneRelativePath: relFromAgentRoot(root, tombstoneAbsolute),
    kind: tombstone.kind
  };
}

async function pathExists(absolutePath) {
  try {
    await fsp.stat(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function listRecycleItems(agentRoot) {
  const root = path.resolve(agentRoot);
  const recycleAbsolute = getRecycleRootAbsolute(root);
  let entries = [];
  try {
    entries = await fsp.readdir(recycleAbsolute, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return { items: [], folder: AWN_WORKSPACE_RECYCLE_FOLDER };
    throw error;
  }

  const tombstoneByRecycleName = new Map();
  await walkForTrashMarkers(root, async (_markerAbs, data) => {
    if (data?.recycleName) tombstoneByRecycleName.set(data.recycleName, data);
  });

  const items = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const parsed = parseRecycleEntryName(entry.name);
    if (!parsed) continue;
    const entryAbsolute = path.join(recycleAbsolute, entry.name);
    const tombstone = tombstoneByRecycleName.get(parsed.recycleName) || null;
    let kind = entry.isDirectory() ? "directory" : "file";
    if (tombstone?.kind) kind = tombstone.kind;

    let size = null;
    try {
      const st = await fsp.stat(entryAbsolute);
      size = st.size;
    } catch {
      size = null;
    }
    items.push({
      markerId: parsed.markerId,
      markerLabel: parsed.markerLabel,
      recycleName: parsed.recycleName,
      originalBaseName: parsed.originalBaseName,
      originalRelativePath: tombstone?.originalRelativePath || null,
      deletedAt: tombstone?.deletedAt || null,
      kind,
      size
    });
  }

  items.sort((a, b) => {
    const la = String(a.markerLabel || "");
    const lb = String(b.markerLabel || "");
    return lb.localeCompare(la, undefined, { numeric: true });
  });

  return { items, folder: AWN_WORKSPACE_RECYCLE_FOLDER };
}

async function walkForTrashMarkers(agentRoot, visitor) {
  const skipDirNames = new Set([
    ".git",
    "node_modules",
    AWN_WORKSPACE_RECYCLE_FOLDER,
    ".agent-cms"
  ]);

  async function walk(dirAbsolute) {
    let dirEntries = [];
    try {
      dirEntries = await fsp.readdir(dirAbsolute, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of dirEntries) {
      const child = path.join(dirAbsolute, entry.name);
      if (entry.isDirectory()) {
        if (skipDirNames.has(entry.name)) continue;
        if (entry.name.startsWith(".")) continue;
        await walk(child);
        continue;
      }
      if (!entry.isFile() || !isTrashMarkerFileName(entry.name)) continue;
      const data = await readTombstone(child);
      await visitor(child, data);
    }
  }

  await walk(path.resolve(agentRoot));
}

async function restoreRecycleItem(agentRoot, markerIdOrLabel) {
  const root = path.resolve(agentRoot);
  const raw = String(markerIdOrLabel || "").trim();
  if (!raw) return { error: "Missing recycle marker id", status: 400 };

  let tombstoneRecord = null;
  await walkForTrashMarkers(root, async (markerAbs, data) => {
    if (!data || tombstoneRecord) return;
    if (String(data.markerId) === raw || String(data.markerLabel) === raw) {
      tombstoneRecord = { markerAbs, data };
    }
  });

  if (!tombstoneRecord) {
    return { error: "Recycle item not found", status: 404 };
  }

  const { markerAbs, data } = tombstoneRecord;
  const recycleAbsolute = path.join(getRecycleRootAbsolute(root), data.recycleName);
  const restoreAbsolute = path.join(root, data.originalRelativePath.replace(/\\/g, "/"));

  if (!(await pathExists(recycleAbsolute))) {
    return { error: "Recycle payload missing", status: 404 };
  }
  if (await pathExists(restoreAbsolute)) {
    return { error: "Restore path already exists", status: 409 };
  }

  await fsp.mkdir(path.dirname(restoreAbsolute), { recursive: true });
  await fsp.rename(recycleAbsolute, restoreAbsolute);
  await fsp.rm(markerAbs, { force: true });

  return {
    restored: data.originalRelativePath,
    markerId: data.markerId,
    markerLabel: data.markerLabel
  };
}

async function clearRecycleBin(agentRoot) {
  const root = path.resolve(agentRoot);
  const recycleAbsolute = getRecycleRootAbsolute(root);
  let removedEntries = 0;
  let removedMarkers = 0;

  try {
    const dirEntries = await fsp.readdir(recycleAbsolute, { withFileTypes: true });
    for (const entry of dirEntries) {
      if (entry.name.startsWith(".")) continue;
      await fsp.rm(path.join(recycleAbsolute, entry.name), { recursive: true, force: true });
      removedEntries += 1;
    }
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }

  await walkForTrashMarkers(root, async (markerAbs) => {
    await fsp.rm(markerAbs, { force: true });
    removedMarkers += 1;
  });

  return { removedEntries, removedMarkers };
}

module.exports = {
  AWN_WORKSPACE_RECYCLE_FOLDER,
  TRASH_MARKER_PREFIX,
  RECYCLE_ENTRY_PREFIX,
  buildRecycleEntryName,
  buildTrashMarkerFileName,
  parseRecycleEntryName,
  isTrashMarkerFileName,
  isRecycleEntryFileName,
  softDeleteWorkspacePath,
  listRecycleItems,
  restoreRecycleItem,
  clearRecycleBin,
  getRecycleRootAbsolute
};
