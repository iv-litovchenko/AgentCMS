const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const AWN_GOOGLE_DRIVE_DIR = "awn-google-drive";
const AWN_GOOGLE_DRIVE_REGISTRY_FILE = "registry.json";
const GDRIVE_BLOB_NAME_RE = /^gd_[0-9a-f]{8}(?:\.[^./\\]+)?$/i;

function getGoogleDriveFolderAbsolute(agentRoot) {
  return path.join(agentRoot, AWN_GOOGLE_DRIVE_DIR);
}

function isPathInsideGoogleDrive(absolutePath, agentRoot) {
  const driveRoot = path.resolve(getGoogleDriveFolderAbsolute(agentRoot));
  const resolved = path.resolve(absolutePath);
  return resolved === driveRoot || resolved.startsWith(`${driveRoot}${path.sep}`);
}

function normalizeMediaFileRef(relFile) {
  const normalized = String(relFile || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
    .trim();
  if (!normalized || normalized.includes("..")) return null;
  if (/^media\//i.test(normalized)) return normalized;
  return `media/${normalized}`;
}

async function ensureGoogleDriveFolder(agentRoot) {
  const folderAbsolute = getGoogleDriveFolderAbsolute(agentRoot);
  await fs.mkdir(folderAbsolute, { recursive: true });
  return folderAbsolute;
}

function createGoogleDriveBlobFileName(sourceAbsolute) {
  const ext = path.extname(sourceAbsolute) || "";
  const id = crypto.randomBytes(4).toString("hex");
  return `gd_${id}${ext}`;
}

async function readSymlinkTargetAbsolute(linkAbsolute) {
  const linkDir = path.dirname(linkAbsolute);
  let target = await fs.readlink(linkAbsolute);
  if (!path.isAbsolute(target)) {
    target = path.resolve(linkDir, target);
  }
  return target;
}

async function isGoogleDriveSyncedFileAbsolute(fileAbsolute, agentRoot) {
  try {
    const stat = await fs.lstat(fileAbsolute);
    if (!stat.isSymbolicLink()) return false;
    const target = await readSymlinkTargetAbsolute(fileAbsolute);
    return isPathInsideGoogleDrive(target, agentRoot);
  } catch {
    return false;
  }
}

async function getGoogleDriveSymlinkMeta(fileAbsolute, agentRoot) {
  if (!(await isGoogleDriveSyncedFileAbsolute(fileAbsolute, agentRoot))) {
    return { synced: false, blobName: "" };
  }
  try {
    const target = await readSymlinkTargetAbsolute(fileAbsolute);
    return { synced: true, blobName: path.basename(target) };
  } catch {
    return { synced: true, blobName: "" };
  }
}

function getGoogleDriveRegistryAbsolute(agentRoot) {
  return path.join(getGoogleDriveFolderAbsolute(agentRoot), AWN_GOOGLE_DRIVE_REGISTRY_FILE);
}

function normalizeRegistryMediaRel(mediaRel, agentRoot) {
  const agentPrefix = `${String(agentRoot || "").replace(/\\/g, "/").replace(/\/+$/, "")}/`;
  let normalized = String(mediaRel || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.startsWith(agentPrefix)) {
    normalized = normalized.slice(agentPrefix.length);
  }
  if (!normalized || normalized.includes("..")) return "";
  return normalized;
}

async function readGoogleDriveRegistry(agentRoot) {
  const registryAbsolute = getGoogleDriveRegistryAbsolute(agentRoot);
  try {
    const raw = await fs.readFile(registryAbsolute, "utf-8");
    const parsed = JSON.parse(raw);
    const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
    return {
      version: Number(parsed?.version) || 1,
      entries: entries
        .map((entry) => ({
          blob: String(entry?.blob || "").trim(),
          mediaRel: normalizeRegistryMediaRel(entry?.mediaRel, agentRoot)
        }))
        .filter((entry) => entry.blob && entry.mediaRel)
    };
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { version: 1, entries: [] };
    }
    throw error;
  }
}

async function writeGoogleDriveRegistry(agentRoot, registry) {
  await ensureGoogleDriveFolder(agentRoot);
  const registryAbsolute = getGoogleDriveRegistryAbsolute(agentRoot);
  const payload = {
    version: 1,
    entries: Array.isArray(registry?.entries) ? registry.entries : []
  };
  await fs.writeFile(registryAbsolute, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

async function upsertGoogleDriveRegistryEntry(agentRoot, blobName, mediaAbsolute) {
  const blob = String(blobName || "").trim();
  const mediaRel = normalizeRegistryMediaRel(path.relative(agentRoot, mediaAbsolute), agentRoot);
  if (!blob || !mediaRel) return;

  const registry = await readGoogleDriveRegistry(agentRoot);
  const withoutBlob = registry.entries.filter((entry) => entry.blob !== blob);
  withoutBlob.push({ blob, mediaRel });
  withoutBlob.sort((a, b) => a.mediaRel.localeCompare(b.mediaRel, "ru"));
  await writeGoogleDriveRegistry(agentRoot, { entries: withoutBlob });
}

async function removeGoogleDriveRegistryEntry(agentRoot, blobName) {
  const blob = String(blobName || "").trim();
  if (!blob) return;
  const registry = await readGoogleDriveRegistry(agentRoot);
  const nextEntries = registry.entries.filter((entry) => entry.blob !== blob);
  if (nextEntries.length === registry.entries.length) return;
  await writeGoogleDriveRegistry(agentRoot, { entries: nextEntries });
}

function extractGoogleDriveBlobNameFromLinkTarget(linkTarget) {
  const normalized = String(linkTarget || "").replace(/\\/g, "/");
  const base = path.basename(normalized);
  if (GDRIVE_BLOB_NAME_RE.test(base)) return base;
  if (normalized.includes(`${AWN_GOOGLE_DRIVE_DIR}/`)) {
    const tail = normalized.split(`${AWN_GOOGLE_DRIVE_DIR}/`).pop() || "";
    const blob = path.basename(tail);
    if (GDRIVE_BLOB_NAME_RE.test(blob)) return blob;
  }
  return "";
}

async function resolveGoogleDriveBlobAbsolute(agentRoot, blobName) {
  const blob = String(blobName || "").trim();
  if (!blob || blob.includes("/") || blob.includes("\\") || blob.includes("..")) return null;
  const blobAbsolute = path.join(getGoogleDriveFolderAbsolute(agentRoot), blob);
  const driveRoot = path.resolve(getGoogleDriveFolderAbsolute(agentRoot));
  if (!blobAbsolute.startsWith(driveRoot)) return null;
  try {
    const stat = await fs.stat(blobAbsolute);
    return stat.isFile() ? blobAbsolute : null;
  } catch {
    return null;
  }
}

function buildGoogleDriveSymlinkRelative(linkAbsolute, blobAbsolute) {
  return path.relative(path.dirname(linkAbsolute), blobAbsolute).replace(/\\/g, "/");
}

async function recreateGoogleDriveSymlink(linkAbsolute, blobAbsolute) {
  const relTarget = buildGoogleDriveSymlinkRelative(linkAbsolute, blobAbsolute);
  try {
    const stat = await fs.lstat(linkAbsolute);
    if (stat.isSymbolicLink()) {
      const currentTarget = await fs.readlink(linkAbsolute);
      const currentResolved = path.isAbsolute(currentTarget)
        ? currentTarget
        : path.resolve(path.dirname(linkAbsolute), currentTarget);
      if (path.resolve(currentResolved) === path.resolve(blobAbsolute)) {
        return { changed: false, symlinkRelative: relTarget };
      }
      await fs.unlink(linkAbsolute);
    } else if (stat.isFile()) {
      return { changed: false, error: "path-is-regular-file" };
    } else {
      return { changed: false, error: "path-not-file" };
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  await fs.symlink(relTarget, linkAbsolute);
  return { changed: true, symlinkRelative: relTarget };
}

async function isGoogleDriveManagedSymlinkAbsolute(linkAbsolute, agentRoot) {
  try {
    const stat = await fs.lstat(linkAbsolute);
    if (!stat.isSymbolicLink()) return false;
  } catch {
    return false;
  }

  let target = "";
  try {
    target = await fs.readlink(linkAbsolute);
  } catch {
    return false;
  }

  const blobName = extractGoogleDriveBlobNameFromLinkTarget(target);
  if (blobName) return true;

  try {
    const resolved = path.isAbsolute(target)
      ? target
      : path.resolve(path.dirname(linkAbsolute), target);
    return isPathInsideGoogleDrive(resolved, agentRoot);
  } catch {
    return false;
  }
}

async function repairGoogleDriveSymlinkAt(linkAbsolute, agentRoot) {
  let target = "";
  try {
    const stat = await fs.lstat(linkAbsolute);
    if (!stat.isSymbolicLink()) {
      return { linkAbsolute, action: "skip-not-symlink" };
    }
    target = await fs.readlink(linkAbsolute);
  } catch (error) {
    if (error?.code === "ENOENT") {
      return { linkAbsolute, action: "skip-missing" };
    }
    throw error;
  }

  const blobName =
    extractGoogleDriveBlobNameFromLinkTarget(target) || path.basename(String(target || ""));
  const blobAbsolute = await resolveGoogleDriveBlobAbsolute(agentRoot, blobName);
  if (!blobAbsolute) {
    return { linkAbsolute, action: "blob-missing", blobName };
  }

  const repair = await recreateGoogleDriveSymlink(linkAbsolute, blobAbsolute);
  if (repair.error) {
    return { linkAbsolute, action: repair.error, blobName };
  }

  await upsertGoogleDriveRegistryEntry(agentRoot, blobName, linkAbsolute);
  return {
    linkAbsolute,
    mediaRel: normalizeRegistryMediaRel(path.relative(agentRoot, linkAbsolute), agentRoot),
    blobName,
    action: repair.changed ? "repaired" : "ok",
    symlinkRelative: repair.symlinkRelative
  };
}

async function walkAgentGoogleDriveSymlinks(agentRoot, visit) {
  const agentRootResolved = path.resolve(agentRoot);
  const driveRootResolved = path.resolve(getGoogleDriveFolderAbsolute(agentRoot));

  async function walk(currentAbsolute) {
    let entries = [];
    try {
      entries = await fs.readdir(currentAbsolute, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const entryAbsolute = path.join(currentAbsolute, entry.name);
      if (entry.isDirectory()) {
        if (path.resolve(entryAbsolute) === driveRootResolved) continue;
        await walk(entryAbsolute);
        continue;
      }
      if (!entry.isSymbolicLink()) continue;
      await visit(entryAbsolute);
    }
  }

  await walk(agentRootResolved);
}

async function repairGoogleDriveSymlinks(agentRoot) {
  const results = [];
  const counters = {
    repaired: 0,
    ok: 0,
    blobMissing: 0,
    skipped: 0,
    restoredFromRegistry: 0
  };

  await walkAgentGoogleDriveSymlinks(agentRoot, async (linkAbsolute) => {
    if (!(await isGoogleDriveManagedSymlinkAbsolute(linkAbsolute, agentRoot))) {
      counters.skipped += 1;
      return;
    }
    const result = await repairGoogleDriveSymlinkAt(linkAbsolute, agentRoot);
    results.push(result);
    if (result.action === "repaired") counters.repaired += 1;
    else if (result.action === "ok") counters.ok += 1;
    else if (result.action === "blob-missing") counters.blobMissing += 1;
    else counters.skipped += 1;
  });

  const registry = await readGoogleDriveRegistry(agentRoot);
  for (const entry of registry.entries) {
    const linkAbsolute = path.join(agentRoot, entry.mediaRel);
    if (!linkAbsolute.startsWith(agentRoot)) continue;

    const blobAbsolute = await resolveGoogleDriveBlobAbsolute(agentRoot, entry.blob);
    if (!blobAbsolute) continue;

    let needsRestore = false;
    try {
      const stat = await fs.lstat(linkAbsolute);
      if (!stat.isSymbolicLink()) {
        needsRestore = !stat.isFile();
      } else {
        const target = await readSymlinkTargetAbsolute(linkAbsolute);
        needsRestore = path.resolve(target) !== path.resolve(blobAbsolute);
      }
    } catch (error) {
      if (error?.code === "ENOENT") needsRestore = true;
      else throw error;
    }

    if (!needsRestore) continue;

    try {
      await fs.mkdir(path.dirname(linkAbsolute), { recursive: true });
      const repair = await recreateGoogleDriveSymlink(linkAbsolute, blobAbsolute);
      if (repair.error) {
        results.push({
          linkAbsolute,
          mediaRel: entry.mediaRel,
          blobName: entry.blob,
          action: repair.error
        });
        continue;
      }
      results.push({
        linkAbsolute,
        mediaRel: entry.mediaRel,
        blobName: entry.blob,
        action: repair.changed ? "restored-from-registry" : "ok",
        symlinkRelative: repair.symlinkRelative
      });
      if (repair.changed) counters.restoredFromRegistry += 1;
    } catch (error) {
      results.push({
        linkAbsolute,
        mediaRel: entry.mediaRel,
        blobName: entry.blob,
        action: "restore-failed",
        error: String(error.message || error)
      });
    }
  }

  return {
    repaired: counters.repaired,
    ok: counters.ok,
    blobMissing: counters.blobMissing,
    skipped: counters.skipped,
    restoredFromRegistry: counters.restoredFromRegistry,
    processed: results.length,
    results
  };
}

function createGdriveSyncHelpers(deps) {
  const {
    getAgentRoot,
    normalizeWorkspacePath,
    resolveApiStorageContext,
    resolveUploadedMediaFileAbsolute,
    resolveCanonicalManifestRelPath,
    getMediaFolderAbsolute,
    collectMediaFilesStructured,
    fileExists
  } = deps;

  async function resolveMediaFileAbsoluteForGdrive(contextPath, relFile) {
    const storageContext = await resolveApiStorageContext(contextPath);
    if (!storageContext) return null;
    const normalizedRelFile = normalizeMediaFileRef(relFile);
    if (!normalizedRelFile) return null;

    const mediaFolder = await getMediaFolderAbsolute(storageContext.absolute);
    if (mediaFolder) {
      const relUnderMedia = normalizedRelFile.replace(/^media\//i, "");
      const linkAbsolute = path.join(mediaFolder, relUnderMedia);
      if (linkAbsolute.startsWith(mediaFolder)) {
        try {
          await fs.lstat(linkAbsolute);
          return {
            fileAbsolute: linkAbsolute,
            normalizedRelFile,
            storageContext,
            contextPath: String(contextPath || "").replace(/\\/g, "/")
          };
        } catch {
          // fall through to generic resolver
        }
      }
    }

    const fileAbsolute = await resolveUploadedMediaFileAbsolute(storageContext.absolute, normalizedRelFile);
    if (!fileAbsolute) return null;
    return {
      fileAbsolute,
      normalizedRelFile,
      storageContext,
      contextPath: String(contextPath || "").replace(/\\/g, "/")
    };
  }

  async function listTopicMediaRelativeFiles(manifestPath) {
    const canonical = await resolveCanonicalManifestRelPath(manifestPath);
    const nodeAbsolute = normalizeWorkspacePath(canonical);
    if (!nodeAbsolute) return [];
    const mediaFolder = await getMediaFolderAbsolute(nodeAbsolute);
    if (!mediaFolder) return [];
    const items = [];
    await collectMediaFilesStructured(mediaFolder, "", items, []);
    return items
      .filter((item) => !item.isFolder)
      .map((item) => String(item.path || "").replace(/\\/g, "/"))
      .filter(Boolean);
  }

  async function syncFileAbsoluteToGoogleDrive(fileAbsolute, agentRoot = getAgentRoot()) {
    const driveFolder = await ensureGoogleDriveFolder(agentRoot);

    if (await isGoogleDriveSyncedFileAbsolute(fileAbsolute, agentRoot)) {
      const target = await readSymlinkTargetAbsolute(fileAbsolute);
      return { action: "already-synced", synced: true, blobAbsolute: target };
    }

    let blobName = createGoogleDriveBlobFileName(fileAbsolute);
    let blobAbsolute = path.join(driveFolder, blobName);
    while (await fileExists(blobAbsolute)) {
      blobName = createGoogleDriveBlobFileName(fileAbsolute);
      blobAbsolute = path.join(driveFolder, blobName);
    }

    const stat = await fs.lstat(fileAbsolute);
    if (stat.isSymbolicLink()) {
      throw new Error("Cannot sync: path is a symlink outside Google Drive storage");
    }

    await fs.rename(fileAbsolute, blobAbsolute);
    const relTarget = path.relative(path.dirname(fileAbsolute), blobAbsolute).replace(/\\/g, "/");
    await fs.symlink(relTarget, fileAbsolute);
    await upsertGoogleDriveRegistryEntry(agentRoot, blobName, fileAbsolute);

    return {
      action: "synced",
      synced: true,
      blobAbsolute,
      blobName,
      symlinkRelative: relTarget
    };
  }

  async function unsyncFileAbsoluteFromGoogleDrive(fileAbsolute, agentRoot = getAgentRoot()) {
    const stat = await fs.lstat(fileAbsolute);
    if (!stat.isSymbolicLink()) {
      return { action: "already-local", synced: false };
    }

    const target = await readSymlinkTargetAbsolute(fileAbsolute);
    if (!isPathInsideGoogleDrive(target, agentRoot)) {
      throw new Error("Symlink does not point to awn-google-drive storage");
    }

    await fs.unlink(fileAbsolute);
    await fs.rename(target, fileAbsolute);
    await removeGoogleDriveRegistryEntry(agentRoot, path.basename(target));

    return { action: "unsynced", synced: false, restoredAbsolute: fileAbsolute };
  }

  async function getGoogleDriveFileSyncStatus(contextPath, relFile) {
    const resolved = await resolveMediaFileAbsoluteForGdrive(contextPath, relFile);
    if (!resolved) {
      return { scope: "file", exists: false, synced: false };
    }
    const synced = await isGoogleDriveSyncedFileAbsolute(resolved.fileAbsolute, getAgentRoot());
    return {
      scope: "file",
      exists: true,
      synced,
      file: resolved.normalizedRelFile,
      path: resolved.contextPath
    };
  }

  async function getGoogleDriveTopicSyncStatus(manifestPath) {
    const files = await listTopicMediaRelativeFiles(manifestPath);
    let syncedCount = 0;
    for (const rel of files) {
      const status = await getGoogleDriveFileSyncStatus(manifestPath, rel);
      if (status.synced) syncedCount += 1;
    }
    const totalCount = files.length;
    return {
      scope: "topic",
      path: String(manifestPath || "").replace(/\\/g, "/"),
      totalCount,
      syncedCount,
      localCount: Math.max(0, totalCount - syncedCount),
      synced: totalCount > 0 && syncedCount === totalCount,
      partial: syncedCount > 0 && syncedCount < totalCount
    };
  }

  async function toggleGoogleDriveFileSync(contextPath, relFile) {
    const resolved = await resolveMediaFileAbsoluteForGdrive(contextPath, relFile);
    if (!resolved) {
      throw new Error("Media file not found");
    }
    const agentRoot = getAgentRoot();
    const synced = await isGoogleDriveSyncedFileAbsolute(resolved.fileAbsolute, agentRoot);
    const result = synced
      ? await unsyncFileAbsoluteFromGoogleDrive(resolved.fileAbsolute, agentRoot)
      : await syncFileAbsoluteToGoogleDrive(resolved.fileAbsolute, agentRoot);
    return {
      scope: "file",
      path: resolved.contextPath,
      file: resolved.normalizedRelFile,
      ...result
    };
  }

  async function toggleGoogleDriveTopicSync(manifestPath) {
    const status = await getGoogleDriveTopicSyncStatus(manifestPath);
    const files = await listTopicMediaRelativeFiles(manifestPath);
    const results = [];

    if (status.synced) {
      for (const rel of files) {
        try {
          results.push(await toggleGoogleDriveFileSync(manifestPath, rel));
        } catch {
          // skip files that fail unsync
        }
      }
      return {
        scope: "topic",
        path: String(manifestPath || "").replace(/\\/g, "/"),
        action: "unsynced-topic",
        synced: false,
        processed: results.length,
        results
      };
    }

    for (const rel of files) {
      const fileStatus = await getGoogleDriveFileSyncStatus(manifestPath, rel);
      if (fileStatus.synced) continue;
      try {
        results.push(await toggleGoogleDriveFileSync(manifestPath, rel));
      } catch {
        // skip unreadable files
      }
    }

    return {
      scope: "topic",
      path: String(manifestPath || "").replace(/\\/g, "/"),
      action: "synced-topic",
      synced: results.length > 0 && results.every((item) => item.synced),
      processed: results.length,
      results
    };
  }

  async function countGoogleDriveStorageStats(agentRoot = getAgentRoot()) {
    const folderAbsolute = getGoogleDriveFolderAbsolute(agentRoot);
    let fileCount = 0;
    let totalBytes = 0;
    const files = [];

    async function walk(dirAbsolute) {
      let entries;
      try {
        entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
      } catch (error) {
        if (error?.code === "ENOENT") return;
        throw error;
      }

      for (const entry of entries) {
        if (entry.name === ".DS_Store") continue;
        if (entry.name === AWN_GOOGLE_DRIVE_REGISTRY_FILE) continue;
        const entryAbsolute = path.join(dirAbsolute, entry.name);
        if (entry.isDirectory()) {
          await walk(entryAbsolute);
          continue;
        }
        if (!entry.isFile()) continue;
        fileCount += 1;
        let size = 0;
        try {
          const stat = await fs.stat(entryAbsolute);
          size = Number(stat.size) || 0;
          totalBytes += size;
        } catch {
          // ignore unreadable entries
        }
        files.push({ name: entry.name, size });
      }
    }

    files.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "ru", { sensitivity: "base", numeric: true })
    );

    try {
      await fs.access(folderAbsolute);
      await walk(folderAbsolute);
      return {
        path: AWN_GOOGLE_DRIVE_DIR,
        exists: true,
        fileCount,
        totalBytes,
        files
      };
    } catch (error) {
      if (error?.code === "ENOENT") {
        return {
          path: AWN_GOOGLE_DRIVE_DIR,
          exists: false,
          fileCount: 0,
          totalBytes: 0,
          files: []
        };
      }
      throw error;
    }
  }

  async function repairGoogleDriveSymlinksForAgent() {
    return repairGoogleDriveSymlinks(getAgentRoot());
  }

  return {
    AWN_GOOGLE_DRIVE_DIR,
    countGoogleDriveStorageStats,
    getGoogleDriveFileSyncStatus,
    getGoogleDriveTopicSyncStatus,
    toggleGoogleDriveFileSync,
    toggleGoogleDriveTopicSync,
    repairGoogleDriveSymlinks: repairGoogleDriveSymlinksForAgent
  };
}

module.exports = {
  AWN_GOOGLE_DRIVE_DIR,
  AWN_GOOGLE_DRIVE_REGISTRY_FILE,
  createGdriveSyncHelpers,
  getGoogleDriveSymlinkMeta,
  repairGoogleDriveSymlinks
};
