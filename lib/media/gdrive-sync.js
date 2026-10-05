const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const AWN_MEDIA_CLOUD_DIR = "awn-media-cloud";
const LEGACY_AWN_GOOGLE_DRIVE_DIR = "awn-google-drive";
const AWN_MEDIA_CLOUD_BLOBS_DIR = "_blobs";
const AWN_MEDIA_CLOUD_REGISTRY_FILE = "registry.json";
const MEDIA_CLOUD_DEFAULT_PROVIDER_ID = "google-drive";
/** @deprecated use AWN_MEDIA_CLOUD_DIR */
const AWN_GOOGLE_DRIVE_DIR = AWN_MEDIA_CLOUD_DIR;
const AWN_GOOGLE_DRIVE_REGISTRY_FILE = AWN_MEDIA_CLOUD_REGISTRY_FILE;
/** @deprecated legacy blob names; new sync uses mc-{8hex}-{originBasename} */
const LEGACY_GDRIVE_BLOB_NAME_RE = /^gd_[0-9a-f]{8}(?:\.[^./\\]+)?$/i;
const MEDIA_CLOUD_BLOB_NAME_RE = /^mc-[0-9a-f]{8}-[^/\\]+$/i;
const GDRIVE_BLOB_NAME_RE = LEGACY_GDRIVE_BLOB_NAME_RE;

function isMediaCloudBlobFileName(name) {
  const base = String(name || "").trim();
  return LEGACY_GDRIVE_BLOB_NAME_RE.test(base) || MEDIA_CLOUD_BLOB_NAME_RE.test(base);
}

function sanitizeBlobOriginBaseName(baseName) {
  let name = String(baseName || "").trim();
  if (!name || name === "." || name === "..") return "file";
  name = name.replace(/[/\\]/g, "-").replace(/[\0-\x1f]/g, "");
  name = name.replace(/[<>:"|?*]/g, "-");
  const stem = path.parse(name).name;
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(stem)) {
    name = `_${name}`;
  }
  return name || "file";
}

function createMediaCloudBlobFileName(sourceAbsolute) {
  const id = crypto.randomBytes(4).toString("hex");
  const origin = sanitizeBlobOriginBaseName(path.basename(sourceAbsolute));
  return `mc-${id}-${origin}`;
}

function getMediaCloudFolderAbsolute(agentRoot) {
  return path.join(agentRoot, AWN_MEDIA_CLOUD_DIR);
}

function getLegacyGoogleDriveFolderAbsolute(agentRoot) {
  return path.join(agentRoot, LEGACY_AWN_GOOGLE_DRIVE_DIR);
}

/** @deprecated use getMediaCloudFolderAbsolute */
function getGoogleDriveFolderAbsolute(agentRoot) {
  return getMediaCloudFolderAbsolute(agentRoot);
}

function getMediaCloudBlobsFolderAbsolute(agentRoot) {
  return path.join(getMediaCloudFolderAbsolute(agentRoot), AWN_MEDIA_CLOUD_BLOBS_DIR);
}

function isPathInsideMediaCloud(absolutePath, agentRoot) {
  const resolved = path.resolve(absolutePath);
  const roots = [
    path.resolve(getMediaCloudFolderAbsolute(agentRoot)),
    path.resolve(getLegacyGoogleDriveFolderAbsolute(agentRoot))
  ];
  return roots.some(
    (driveRoot) => resolved === driveRoot || resolved.startsWith(`${driveRoot}${path.sep}`)
  );
}

/** @deprecated use isPathInsideMediaCloud */
function isPathInsideGoogleDrive(absolutePath, agentRoot) {
  return isPathInsideMediaCloud(absolutePath, agentRoot);
}

function normalizeWorkspaceCloudFileRef(relFile) {
  const normalized = String(relFile || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/")
    .trim();
  if (!normalized || normalized.includes("..")) return null;
  return normalized;
}

function isBlockedCloudFileRel(relFile) {
  const lower = String(relFile || "").replace(/\\/g, "/").toLowerCase();
  if (!lower) return true;
  if (lower.startsWith("awn-media-cloud/")) return true;
  if (lower.startsWith("awn-google-drive/")) return true;
  if (lower.startsWith(".git/")) return true;
  if (lower === ".env" || lower.endsWith("/.env")) return true;
  return false;
}

/** @deprecated prefer normalizeWorkspaceCloudFileRef */
function normalizeMediaFileRef(relFile) {
  const normalized = normalizeWorkspaceCloudFileRef(relFile);
  if (!normalized) return null;
  if (/^media\//i.test(normalized)) return normalized;
  return `media/${normalized}`;
}

async function ensureMediaCloudProviderFolder(agentRoot, providerKey) {
  const key = String(providerKey || "").trim();
  if (!key || key.includes("/") || key.includes("..")) return null;
  const folderAbsolute = path.join(getMediaCloudFolderAbsolute(agentRoot), key);
  await fs.mkdir(folderAbsolute, { recursive: true });
  return folderAbsolute;
}

function providerOriginLinkFileName(mediaRel) {
  const base = path.basename(String(mediaRel || "").replace(/\\/g, "/"));
  return base && base !== "." ? base : "";
}

function resolveProviderLinkFileName(mediaRel, blobName) {
  const blob = String(blobName || "").trim();
  if (blob && isMediaCloudBlobFileName(blob)) return blob;
  const base = providerOriginLinkFileName(mediaRel);
  if (base && base !== blob) return base;
  return blob || base || "file";
}

async function unlinkProviderSymlinkIfPointsToBlob(linkAbsolute, blobAbsolute) {
  try {
    const stat = await fs.lstat(linkAbsolute);
    if (!stat.isSymbolicLink()) return;
    const current = await fs.readlink(linkAbsolute);
    const currentResolved = path.isAbsolute(current)
      ? current
      : path.resolve(path.dirname(linkAbsolute), current);
    if (path.resolve(currentResolved) === path.resolve(blobAbsolute)) {
      await fs.unlink(linkAbsolute);
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

async function ensureProviderBlobSymlink(agentRoot, providerKey, blobName, mediaRel) {
  const blobAbsolute = await resolveGoogleDriveBlobAbsolute(agentRoot, blobName);
  const providerFolder = await ensureMediaCloudProviderFolder(agentRoot, providerKey);
  if (!blobAbsolute || !providerFolder) return;

  const linkName = resolveProviderLinkFileName(mediaRel, blobName);
  const linkAbsolute = path.join(providerFolder, linkName);
  const relTarget = path.relative(path.dirname(linkAbsolute), blobAbsolute).replace(/\\/g, "/");

  let linkReady = false;
  try {
    const stat = await fs.lstat(linkAbsolute);
    if (stat.isSymbolicLink()) {
      const current = await fs.readlink(linkAbsolute);
      const currentResolved = path.isAbsolute(current)
        ? current
        : path.resolve(path.dirname(linkAbsolute), current);
      if (path.resolve(currentResolved) === path.resolve(blobAbsolute)) {
        linkReady = true;
      } else {
        await fs.unlink(linkAbsolute);
      }
    } else if (stat.isFile()) {
      return;
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  if (!linkReady) {
    await fs.symlink(relTarget, linkAbsolute);
  }

  const originName = providerOriginLinkFileName(mediaRel);
  if (originName && originName !== linkName) {
    await unlinkProviderSymlinkIfPointsToBlob(path.join(providerFolder, originName), blobAbsolute);
  }
}

async function removeProviderBlobSymlink(agentRoot, providerKey, mediaRel, blobName) {
  const key = String(providerKey || "").trim();
  if (!key) return;
  const providerFolder = path.join(getMediaCloudFolderAbsolute(agentRoot), key);
  const names = new Set(
    [resolveProviderLinkFileName(mediaRel, blobName), providerOriginLinkFileName(mediaRel)].filter(Boolean)
  );
  for (const name of names) {
    const linkAbsolute = path.join(providerFolder, name);
    try {
      const stat = await fs.lstat(linkAbsolute);
      if (stat.isSymbolicLink()) await fs.unlink(linkAbsolute);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
}

async function removeAllProviderBlobSymlinksForEntry(agentRoot, entry) {
  const blob = String(entry?.blob || "").trim();
  const mediaRel = String(entry?.mediaRel || "").trim();
  if (!blob || !mediaRel) return;
  const providers = Array.isArray(entry.providers) ? entry.providers : [];
  for (const provider of providers) {
    const id = normalizeRegistryProvider(provider).id;
    await removeProviderBlobSymlink(agentRoot, id, mediaRel, blob);
  }
}

async function ensureMediaCloudFolder(agentRoot) {
  const folderAbsolute = getMediaCloudFolderAbsolute(agentRoot);
  await fs.mkdir(folderAbsolute, { recursive: true });
  return folderAbsolute;
}

async function ensureMediaCloudBlobsFolder(agentRoot) {
  const mediaRoot = await ensureMediaCloudFolder(agentRoot);
  const blobsAbsolute = path.join(mediaRoot, AWN_MEDIA_CLOUD_BLOBS_DIR);
  await fs.mkdir(blobsAbsolute, { recursive: true });
  return blobsAbsolute;
}

/** @deprecated use ensureMediaCloudFolder */
async function ensureGoogleDriveFolder(agentRoot) {
  return ensureMediaCloudFolder(agentRoot);
}

/** @deprecated use createMediaCloudBlobFileName */
function createGoogleDriveBlobFileName(sourceAbsolute) {
  return createMediaCloudBlobFileName(sourceAbsolute);
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

function getMediaCloudRegistryAbsolute(agentRoot) {
  return path.join(getMediaCloudFolderAbsolute(agentRoot), AWN_MEDIA_CLOUD_REGISTRY_FILE);
}

function getLegacyGoogleDriveRegistryAbsolute(agentRoot) {
  return path.join(getLegacyGoogleDriveFolderAbsolute(agentRoot), AWN_MEDIA_CLOUD_REGISTRY_FILE);
}

/** @deprecated use getMediaCloudRegistryAbsolute */
function getGoogleDriveRegistryAbsolute(agentRoot) {
  return getMediaCloudRegistryAbsolute(agentRoot);
}

function normalizeRegistryProvider(entry) {
  const id = String(entry?.id || entry?.key || MEDIA_CLOUD_DEFAULT_PROVIDER_ID).trim();
  return {
    id: id || MEDIA_CLOUD_DEFAULT_PROVIDER_ID,
    status: String(entry?.status || "local").trim() || "local",
    remoteUrl: String(entry?.remoteUrl || entry?.["service-url"] || "").trim()
  };
}

function normalizeRegistryEntryShape(entry, agentRoot) {
  const blob = String(entry?.blob || "").trim();
  const mediaRel = normalizeRegistryMediaRel(entry?.mediaRel, agentRoot);
  const rawProviders = Array.isArray(entry?.providers) ? entry.providers : [];
  const providers = rawProviders.map(normalizeRegistryProvider).filter((item) => item.id);
  if (blob && mediaRel && !providers.length) {
    providers.push(normalizeRegistryProvider({ id: MEDIA_CLOUD_DEFAULT_PROVIDER_ID, status: "local" }));
  }
  return { blob, mediaRel, providers };
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

async function readRegistryFileAbsolute(registryAbsolute, agentRoot) {
  const raw = await fs.readFile(registryAbsolute, "utf-8");
  const parsed = JSON.parse(raw);
  const entries = Array.isArray(parsed?.entries) ? parsed.entries : [];
  return {
    version: Number(parsed?.version) || 1,
    entries: entries
      .map((entry) => normalizeRegistryEntryShape(entry, agentRoot))
      .filter((entry) => entry.blob && entry.mediaRel)
  };
}

async function readGoogleDriveRegistry(agentRoot) {
  const primaryAbsolute = getMediaCloudRegistryAbsolute(agentRoot);
  const legacyAbsolute = getLegacyGoogleDriveRegistryAbsolute(agentRoot);
  try {
    return await readRegistryFileAbsolute(primaryAbsolute, agentRoot);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  try {
    const legacy = await readRegistryFileAbsolute(legacyAbsolute, agentRoot);
    if (legacy.entries.length) return legacy;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  return { version: 2, entries: [] };
}

async function writeGoogleDriveRegistry(agentRoot, registry) {
  await ensureMediaCloudFolder(agentRoot);
  const registryAbsolute = getMediaCloudRegistryAbsolute(agentRoot);
  const entries = (Array.isArray(registry?.entries) ? registry.entries : [])
    .map((entry) => normalizeRegistryEntryShape(entry, agentRoot))
    .filter((entry) => entry.blob && entry.mediaRel);
  const payload = {
    version: 2,
    entries
  };
  await fs.writeFile(registryAbsolute, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

function mergeRegistryProviders(existingProviders, providerId) {
  const id = String(providerId || MEDIA_CLOUD_DEFAULT_PROVIDER_ID).trim() || MEDIA_CLOUD_DEFAULT_PROVIDER_ID;
  const list = Array.isArray(existingProviders) ? existingProviders.map(normalizeRegistryProvider) : [];
  if (!list.some((item) => item.id === id)) {
    list.push(normalizeRegistryProvider({ id, status: "local" }));
  }
  return list;
}

async function upsertGoogleDriveRegistryEntry(
  agentRoot,
  blobName,
  mediaAbsolute,
  providerId = MEDIA_CLOUD_DEFAULT_PROVIDER_ID
) {
  const blob = String(blobName || "").trim();
  const mediaRel = normalizeRegistryMediaRel(path.relative(agentRoot, mediaAbsolute), agentRoot);
  if (!blob || !mediaRel) return;

  const registry = await readGoogleDriveRegistry(agentRoot);
  const existing = registry.entries.find((entry) => entry.blob === blob || entry.mediaRel === mediaRel);
  const without = registry.entries.filter((entry) => entry.blob !== blob && entry.mediaRel !== mediaRel);
  const providers = mergeRegistryProviders(existing?.providers, providerId);
  without.push({ blob, mediaRel, providers });
  without.sort((a, b) => a.mediaRel.localeCompare(b.mediaRel, "ru"));
  await writeGoogleDriveRegistry(agentRoot, { entries: without });
  await ensureProviderBlobSymlink(agentRoot, providerId, blob, mediaRel);
}

async function readRegistryProvidersForFile(agentRoot, fileAbsolute) {
  const mediaRel = normalizeRegistryMediaRel(path.relative(agentRoot, fileAbsolute), agentRoot);
  if (!mediaRel) return [];
  const registry = await readGoogleDriveRegistry(agentRoot);
  const entry = registry.entries.find((item) => item.mediaRel === mediaRel);
  if (!entry) return [];
  return (entry.providers || []).map((item) => normalizeRegistryProvider(item).id);
}

async function removeGoogleDriveRegistryEntry(agentRoot, blobName) {
  const blob = String(blobName || "").trim();
  if (!blob) return;
  const registry = await readGoogleDriveRegistry(agentRoot);
  const existing = registry.entries.find((entry) => entry.blob === blob);
  if (existing) await removeAllProviderBlobSymlinksForEntry(agentRoot, existing);
  const nextEntries = registry.entries.filter((entry) => entry.blob !== blob);
  if (nextEntries.length === registry.entries.length) return;
  await writeGoogleDriveRegistry(agentRoot, { entries: nextEntries });
}

function extractGoogleDriveBlobNameFromLinkTarget(linkTarget) {
  const normalized = String(linkTarget || "").replace(/\\/g, "/");
  const base = path.basename(normalized);
  if (isMediaCloudBlobFileName(base)) return base;
  for (const dirName of [AWN_MEDIA_CLOUD_DIR, LEGACY_AWN_GOOGLE_DRIVE_DIR]) {
    if (!normalized.includes(`${dirName}/`)) continue;
    const tail = normalized.split(`${dirName}/`).pop() || "";
    const blob = path.basename(tail);
    if (isMediaCloudBlobFileName(blob)) return blob;
  }
  if (normalized.includes(`${AWN_MEDIA_CLOUD_BLOBS_DIR}/`)) {
    const tail = normalized.split(`${AWN_MEDIA_CLOUD_BLOBS_DIR}/`).pop() || "";
    const blob = path.basename(tail);
    if (isMediaCloudBlobFileName(blob)) return blob;
  }
  return "";
}

async function resolveGoogleDriveBlobAbsolute(agentRoot, blobName) {
  const blob = String(blobName || "").trim();
  if (!blob || blob.includes("/") || blob.includes("\\") || blob.includes("..")) return null;

  const candidates = [
    path.join(getMediaCloudBlobsFolderAbsolute(agentRoot), blob),
    path.join(getMediaCloudFolderAbsolute(agentRoot), blob),
    path.join(getLegacyGoogleDriveFolderAbsolute(agentRoot), blob)
  ];

  for (const blobAbsolute of candidates) {
    const inside = isPathInsideMediaCloud(blobAbsolute, agentRoot);
    if (!inside) continue;
    try {
      const stat = await fs.stat(blobAbsolute);
      if (stat.isFile()) return blobAbsolute;
    } catch {
      // try next candidate
    }
  }
  return null;
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
  const mediaCloudResolved = path.resolve(getMediaCloudFolderAbsolute(agentRoot));
  const legacyDriveResolved = path.resolve(getLegacyGoogleDriveFolderAbsolute(agentRoot));

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
        const resolvedEntry = path.resolve(entryAbsolute);
        if (resolvedEntry === mediaCloudResolved || resolvedEntry === legacyDriveResolved) continue;
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

  for (const entry of registry.entries) {
    const providers = Array.isArray(entry.providers) ? entry.providers : [];
    for (const provider of providers) {
      const id = normalizeRegistryProvider(provider).id;
      await ensureProviderBlobSymlink(agentRoot, id, entry.blob, entry.mediaRel);
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
    const agentRoot = getAgentRoot();
    const contextPathNorm = String(contextPath || "").replace(/\\/g, "/");
    const rawRef = normalizeWorkspaceCloudFileRef(relFile);
    if (!rawRef || isBlockedCloudFileRel(rawRef)) return null;

    const tryAbsolute = async (fileAbsolute, normalizedRelFile, storageContext = null) => {
      if (!fileAbsolute.startsWith(agentRoot)) return null;
      try {
        await fs.lstat(fileAbsolute);
        return {
          fileAbsolute,
          normalizedRelFile: normalizeRegistryMediaRel(normalizedRelFile, agentRoot) || normalizedRelFile,
          storageContext,
          contextPath: contextPathNorm
        };
      } catch {
        return null;
      }
    };

    const direct = await tryAbsolute(path.join(agentRoot, rawRef), rawRef);
    if (direct) return direct;

    const storageContext = await resolveApiStorageContext(contextPath);
    if (!storageContext) return null;

    const mediaFolder = await getMediaFolderAbsolute(storageContext.absolute);
    if (mediaFolder) {
      const candidates = [rawRef, rawRef.replace(/^media\//i, ""), `media/${rawRef}`];
      for (const candidate of candidates) {
        const relUnderMedia = candidate.replace(/^media\//i, "");
        const linkAbsolute = path.join(mediaFolder, relUnderMedia);
        if (!linkAbsolute.startsWith(mediaFolder)) continue;
        const resolved = await tryAbsolute(
          linkAbsolute,
          path.relative(agentRoot, linkAbsolute).replace(/\\/g, "/"),
          storageContext
        );
        if (resolved) return resolved;
      }
    }

    for (const candidate of [rawRef, normalizeMediaFileRef(relFile)]) {
      if (!candidate) continue;
      const fileAbsolute = await resolveUploadedMediaFileAbsolute(storageContext.absolute, candidate);
      if (!fileAbsolute) continue;
      const resolved = await tryAbsolute(
        fileAbsolute,
        path.relative(agentRoot, fileAbsolute).replace(/\\/g, "/"),
        storageContext
      );
      if (resolved) return resolved;
    }

    return null;
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
    const blobsFolder = await ensureMediaCloudBlobsFolder(agentRoot);

    if (await isGoogleDriveSyncedFileAbsolute(fileAbsolute, agentRoot)) {
      const target = await readSymlinkTargetAbsolute(fileAbsolute);
      return { action: "already-synced", synced: true, blobAbsolute: target };
    }

    let blobName = createMediaCloudBlobFileName(fileAbsolute);
    let blobAbsolute = path.join(blobsFolder, blobName);
    while (await fileExists(blobAbsolute)) {
      blobName = createMediaCloudBlobFileName(fileAbsolute);
      blobAbsolute = path.join(blobsFolder, blobName);
    }

    const stat = await fs.lstat(fileAbsolute);
    if (stat.isSymbolicLink()) {
      throw new Error("Cannot sync: path is a symlink outside Google Drive storage");
    }

    await fs.rename(fileAbsolute, blobAbsolute);
    const relTarget = path.relative(path.dirname(fileAbsolute), blobAbsolute).replace(/\\/g, "/");
    await fs.symlink(relTarget, fileAbsolute);
    return {
      action: "synced",
      synced: true,
      blobAbsolute,
      blobName,
      symlinkRelative: relTarget,
      fileAbsolute
    };
  }

  async function unsyncFileAbsoluteFromGoogleDrive(fileAbsolute, agentRoot = getAgentRoot()) {
    const stat = await fs.lstat(fileAbsolute);
    if (!stat.isSymbolicLink()) {
      return { action: "already-local", synced: false };
    }

    const target = await readSymlinkTargetAbsolute(fileAbsolute);
    if (!isPathInsideGoogleDrive(target, agentRoot)) {
      throw new Error("Symlink does not point to awn-media-cloud storage");
    }

    await fs.unlink(fileAbsolute);
    await fs.rename(target, fileAbsolute);
    await removeGoogleDriveRegistryEntry(agentRoot, path.basename(target));

    return { action: "unsynced", synced: false, restoredAbsolute: fileAbsolute };
  }

  async function getGoogleDriveFileSyncStatus(contextPath, relFile, options = {}) {
    const resolved = await resolveMediaFileAbsoluteForGdrive(contextPath, relFile);
    if (!resolved) {
      return { scope: "file", exists: false, synced: false, providers: [] };
    }
    const agentRoot = getAgentRoot();
    const synced = await isGoogleDriveSyncedFileAbsolute(resolved.fileAbsolute, agentRoot);
    const providers = synced ? await readRegistryProvidersForFile(agentRoot, resolved.fileAbsolute) : [];
    const providerId = String(options.providerId || "").trim();
    const providerActive = providerId ? providers.includes(providerId) : providers.length > 0;
    return {
      scope: "file",
      exists: true,
      synced,
      providerActive,
      providers,
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

  async function toggleGoogleDriveFileSync(contextPath, relFile, options = {}) {
    const providerId =
      String(options.providerId || MEDIA_CLOUD_DEFAULT_PROVIDER_ID).trim() ||
      MEDIA_CLOUD_DEFAULT_PROVIDER_ID;
    const resolved = await resolveMediaFileAbsoluteForGdrive(contextPath, relFile);
    if (!resolved) {
      throw new Error("File not found");
    }
    const agentRoot = getAgentRoot();
    const synced = await isGoogleDriveSyncedFileAbsolute(resolved.fileAbsolute, agentRoot);

    if (!synced) {
      const result = await syncFileAbsoluteToGoogleDrive(resolved.fileAbsolute, agentRoot);
      await upsertGoogleDriveRegistryEntry(agentRoot, result.blobName, resolved.fileAbsolute, providerId);
      const providers = await readRegistryProvidersForFile(agentRoot, resolved.fileAbsolute);
      return {
        scope: "file",
        path: resolved.contextPath,
        file: resolved.normalizedRelFile,
        providerId,
        providers,
        ...result
      };
    }

    const providers = await readRegistryProvidersForFile(agentRoot, resolved.fileAbsolute);
    if (providers.includes(providerId)) {
      if (providers.length <= 1) {
        const result = await unsyncFileAbsoluteFromGoogleDrive(resolved.fileAbsolute, agentRoot);
        return {
          scope: "file",
          path: resolved.contextPath,
          file: resolved.normalizedRelFile,
          providerId,
          providers: [],
          ...result
        };
      }
      const registry = await readGoogleDriveRegistry(agentRoot);
      const mediaRel = normalizeRegistryMediaRel(
        path.relative(agentRoot, resolved.fileAbsolute),
        agentRoot
      );
      const entry = registry.entries.find((item) => item.mediaRel === mediaRel);
      const nextProviders = (entry?.providers || []).filter(
        (item) => normalizeRegistryProvider(item).id !== providerId
      );
      const nextEntries = registry.entries.map((item) =>
        item.mediaRel === mediaRel ? { ...item, providers: nextProviders } : item
      );
      await writeGoogleDriveRegistry(agentRoot, { entries: nextEntries });
      if (entry) {
        await removeProviderBlobSymlink(agentRoot, providerId, entry.mediaRel, entry.blob);
      }
      return {
        scope: "file",
        action: "provider-removed",
        synced: true,
        path: resolved.contextPath,
        file: resolved.normalizedRelFile,
        providerId,
        providers: nextProviders.map((item) => normalizeRegistryProvider(item).id)
      };
    }

    const meta = await getGoogleDriveSymlinkMeta(resolved.fileAbsolute, agentRoot);
    await upsertGoogleDriveRegistryEntry(
      agentRoot,
      meta.blobName,
      resolved.fileAbsolute,
      providerId
    );
    const nextProviders = await readRegistryProvidersForFile(agentRoot, resolved.fileAbsolute);
    return {
      scope: "file",
      action: "provider-added",
      synced: true,
      path: resolved.contextPath,
      file: resolved.normalizedRelFile,
      providerId,
      providers: nextProviders
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
    const roots = [
      getMediaCloudFolderAbsolute(agentRoot),
      getLegacyGoogleDriveFolderAbsolute(agentRoot)
    ];
    let fileCount = 0;
    let totalBytes = 0;
    const files = [];
    let anyExists = false;

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
        if (entry.name === AWN_MEDIA_CLOUD_REGISTRY_FILE) continue;
        if (entry.name === ".gitkeep") continue;
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

    for (const folderAbsolute of roots) {
      try {
        await fs.access(folderAbsolute);
        anyExists = true;
        await walk(folderAbsolute);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }

    return {
      path: AWN_MEDIA_CLOUD_DIR,
      exists: anyExists,
      fileCount,
      totalBytes,
      files
    };
  }

  async function repairGoogleDriveSymlinksForAgent() {
    return repairGoogleDriveSymlinks(getAgentRoot());
  }

  return {
    AWN_MEDIA_CLOUD_DIR,
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
  AWN_MEDIA_CLOUD_DIR,
  AWN_MEDIA_CLOUD_BLOBS_DIR,
  AWN_MEDIA_CLOUD_REGISTRY_FILE,
  AWN_GOOGLE_DRIVE_DIR,
  AWN_GOOGLE_DRIVE_REGISTRY_FILE,
  MEDIA_CLOUD_DEFAULT_PROVIDER_ID,
  MEDIA_CLOUD_BLOB_NAME_RE,
  createMediaCloudBlobFileName,
  isMediaCloudBlobFileName,
  createGdriveSyncHelpers,
  getGoogleDriveSymlinkMeta,
  repairGoogleDriveSymlinks
};
