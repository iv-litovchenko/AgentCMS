/**
 * Конвенции workspace (без legacy):
 * - Tree-нода: {slug}/manifest.md
 * - Данные: {slug}/storage/
 * - Slug = имя папки; display name — frontmatter `awn-name:`
 */
const path = require("path");

const MANIFEST_FILE = "manifest.md";
/** @deprecated alias */
const AREA_MANIFEST_FILE = MANIFEST_FILE;
const AREA_MANIFEST_CANDIDATES = [MANIFEST_FILE];

const STORAGE_ROOT_FOLDER = "storage";
/** Служебный слой Neos-like: node-types, fields — не в меню контента */
const CONFIGURATION_ROOT_FOLDER = "configuration";
const SERVICE_AREA_NAME = "Служебные темы и компоненты";

const BUNDLE_BODY_FILE = "body.md";
const BUNDLE_CONTENT_FILE = "content.md";
const BUNDLE_TABULAR_FILE = "content.csv";
const BUNDLE_CONFIG_FILE = "configuration.yml";
const BUNDLE_TODO_FILE = "todo.md";
const ROOT_SYSTEM_TODO_FILE = "TODO.md";
const PREVIEW_FILE_BASENAME = "preview";
const PREVIEW_FILE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif"];
const PREVIEW_FILE_NAMES = PREVIEW_FILE_EXTENSIONS.map((ext) => `${PREVIEW_FILE_BASENAME}${ext}`);

const WORKSPACE_MENU_EXCLUDED_MD = new Set([
  MANIFEST_FILE,
  "agents.md",
  "todo.md",
  "STRUCTURE.md"
]);

const STORAGE_SUBFOLDER_CONTENT = "content";
const STORAGE_SUBFOLDER_INBOX = "inbox";
const STORAGE_SUBFOLDER_THREAD = "thread";
const STORAGE_SUBFOLDER_QUICK_NOTES = "quick-notes";
const STORAGE_SUBFOLDER_REFERENCES = "references";
const STORAGE_SUBFOLDER_MEDIA = "media";
const STORAGE_SUBFOLDER_ASSETS = "assets";
const STORAGE_SUBFOLDER_SCRIPTS = "scripts";
const STORAGE_SUBFOLDER_ARTEFACTS = "artefacts";
const STORAGE_SUBFOLDER_ATTACHMENTS = "attachments";
const STORAGE_SUBFOLDER_CONFIGURATION = "configuration";
const STORAGE_SUBFOLDER_PREVIEW = "preview";
const STORAGE_SUBFOLDER_PASTED = "pasted";
const STORAGE_SUBFOLDER_TEMP = "temp";
const STORAGE_SUBFOLDER_HISTORY = "history";
const STORAGE_SUBFOLDER_COMMENTS = "comments";
const HISTORY_VERSION_SUFFIX = ".mdback";
const COMMENT_FILE_SUFFIX = ".md";

const STORAGE_SLOT_LAYER_FOLDERS = [
  STORAGE_SUBFOLDER_CONTENT,
  STORAGE_SUBFOLDER_INBOX,
  STORAGE_SUBFOLDER_THREAD,
  STORAGE_SUBFOLDER_QUICK_NOTES,
  STORAGE_SUBFOLDER_REFERENCES,
  STORAGE_SUBFOLDER_MEDIA,
  STORAGE_SUBFOLDER_ASSETS,
  STORAGE_SUBFOLDER_SCRIPTS,
  STORAGE_SUBFOLDER_ARTEFACTS,
  STORAGE_SUBFOLDER_CONFIGURATION,
  STORAGE_SUBFOLDER_TEMP
];

const STORAGE_ASSETS_INLINE_SUBFOLDERS = [
  STORAGE_SUBFOLDER_PASTED,
  STORAGE_SUBFOLDER_PREVIEW,
  STORAGE_SUBFOLDER_ATTACHMENTS
];

const STORAGE_SUBFOLDER_BY_MODE = {
  external: STORAGE_SUBFOLDER_CONTENT,
  inbox: STORAGE_SUBFOLDER_INBOX,
  thread: STORAGE_SUBFOLDER_THREAD,
  "quick-notes": STORAGE_SUBFOLDER_QUICK_NOTES,
  references: STORAGE_SUBFOLDER_REFERENCES,
  media: STORAGE_SUBFOLDER_MEDIA,
  scripts: STORAGE_SUBFOLDER_SCRIPTS,
  artefacts: STORAGE_SUBFOLDER_ARTEFACTS,
  temp: STORAGE_SUBFOLDER_TEMP,
  configs: STORAGE_SUBFOLDER_CONFIGURATION
};

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanManifestName(rawName) {
  return String(rawName || "")
    .trim()
    .replace(/[\/\\]/g, "")
    .replace(/\s+/g, " ");
}

function stripTopicPrefix(name) {
  let raw = String(name || "").trim();
  if (raw.toLowerCase() === MANIFEST_FILE.toLowerCase()) return "";
  if (raw.toLowerCase().endsWith(".md")) raw = raw.slice(0, -3);
  return raw.trim();
}

/** Slug tree-ноды: имя папки, содержащей manifest.md */
function getManifestSlugFromRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);
  if (isManifestFileName(base)) {
    const dir = path.posix.dirname(normalized);
    if (!dir || dir === ".") return "";
    return stripTopicPrefix(path.posix.basename(dir));
  }
  return stripTopicPrefix(base);
}

function resolveNodeDisplayName(nameRaw, slug) {
  const name = String(nameRaw || "").trim();
  const slugLabel = String(slug || "").trim();
  if (!name) return slugLabel;
  if (name.toLowerCase() === "manifest") return slugLabel;
  return name;
}

function toAreaFolderName(rawName) {
  return cleanManifestName(stripTopicPrefix(rawName)) || null;
}

function toTopicFileName(rawName) {
  const folder = toAreaFolderName(rawName);
  return folder ? `${folder}/${MANIFEST_FILE}` : null;
}

function toStorageSlotKey(rawName) {
  return toAreaFolderName(rawName);
}

function toStorageFolderName(rawName) {
  return toStorageSlotKey(rawName);
}

function isStorageFolderName(name) {
  return String(name || "").toLowerCase() === STORAGE_ROOT_FOLDER.toLowerCase();
}

function isConfigurationFolderName(name) {
  return String(name || "").toLowerCase() === CONFIGURATION_ROOT_FOLDER.toLowerCase();
}

function getStorageRootDirRel(containerDirRel) {
  const container = String(containerDirRel || "").replace(/\\/g, "/").replace(/\/$/, "");
  return container ? `${container}/${STORAGE_ROOT_FOLDER}` : STORAGE_ROOT_FOLDER;
}

function normalizeSystemFileRequestName(name) {
  const base = String(name || "").trim();
  if (base.toLowerCase() === "todo.md") return ROOT_SYSTEM_TODO_FILE;
  return base;
}

function isRootSystemTodoFileName(name) {
  return String(name || "").trim().toLowerCase() === "todo.md";
}

function isExcludedMenuTopicMdFileName(name, options = {}) {
  const base = String(name || "");
  const lower = base.toLowerCase();
  if (isManifestFileName(base)) return true;
  if (lower.endsWith(".sidecar.md")) return true;
  if (WORKSPACE_MENU_EXCLUDED_MD.has(lower)) return true;
  if (lower === "readme.md" && options.isAgentRoot) return true;
  return false;
}

function getStorageFolderRegexAlternation() {
  return `${escapeRegex(STORAGE_ROOT_FOLDER)}/[^/]+`;
}

function listBundleFileNameCandidates(bundleFileName) {
  const canonical = String(bundleFileName || "").trim();
  if (!canonical) return [];
  if (canonical.toLowerCase() === BUNDLE_CONTENT_FILE.toLowerCase()) {
    return [BUNDLE_BODY_FILE, BUNDLE_CONTENT_FILE];
  }
  return [canonical];
}

function getNamedStorageBundleRelCandidates(relPath, bundleFileName) {
  return listBundleFileNameCandidates(bundleFileName).map((name) =>
    getNamedStorageBundleRel(relPath, name)
  );
}

function normalizeStorageSubfolderName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  for (const canonical of STORAGE_SLOT_LAYER_FOLDERS) {
    if (raw === canonical || raw.toLowerCase() === canonical.toLowerCase()) return canonical;
  }
  return raw;
}

function getStorageSubfolderForMode(mode) {
  return STORAGE_SUBFOLDER_BY_MODE[String(mode || "").trim()] || null;
}

function listStorageSubfolderNameCandidates(folderName) {
  const canonical = normalizeStorageSubfolderName(folderName);
  return canonical ? [canonical] : [];
}

function isAllowedStorageSubfolderName(name) {
  const raw = String(name || "").trim();
  if (!raw || /[\\/]/.test(raw) || raw === "." || raw === "..") return false;
  const canonical = normalizeStorageSubfolderName(raw);
  return STORAGE_SLOT_LAYER_FOLDERS.includes(canonical);
}

function isManifestFileName(name) {
  return String(name || "").toLowerCase() === MANIFEST_FILE.toLowerCase();
}

/** @deprecated alias */
const isAreaManifestFileName = isManifestFileName;

function isAreaManifestRelPathSuffix(normalized) {
  return String(normalized || "").toLowerCase().endsWith(`/${MANIFEST_FILE.toLowerCase()}`);
}

function isTopicManifestFileName(name, options = {}) {
  return isManifestFileName(name) && !isExcludedMenuTopicMdFileName(name, options);
}

function isTopicManifestRelPath(relPath) {
  return isManifestFileName(path.basename(String(relPath || "")));
}

function isAreaManifestRelPath(relPath) {
  return isManifestFileName(path.posix.basename(String(relPath || "").replace(/\\/g, "/")));
}

function isManifestMdRelPath(relPath) {
  return isAreaManifestRelPath(relPath);
}

function normalizeManifestRelPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/");
}

function isRecordCategoryContentRelPath(relPath) {
  const normalized = normalizeManifestRelPath(relPath);
  return (
    /\/storage\/categories\/content\/[^/]+\.md$/i.test(normalized) ||
    /\/content\/categories\/[^/]+\.md$/i.test(normalized)
  );
}

function isExternalSectionReadmeRelPath(relPath) {
  const normalized = normalizeManifestRelPath(relPath);
  if (!isAreaManifestRelPathSuffix(normalized)) return false;
  return /\/content\//i.test(normalized);
}

function isMediaSectionReadmeRelPath(relPath) {
  const normalized = normalizeManifestRelPath(relPath);
  if (!isAreaManifestRelPathSuffix(normalized)) return false;
  return /\/media\//i.test(normalized);
}

function isMediaCategoryContentRelPath(relPath) {
  const normalized = normalizeManifestRelPath(relPath);
  const lower = normalized.toLowerCase();
  if (lower.endsWith(".sidecar.md")) return false;
  return /\/media\/categories\/[^/]+\.md$/i.test(normalized);
}

function getServiceAreaManifestRel(serviceFolderRel) {
  const prefix = String(serviceFolderRel || "").replace(/\\/g, "/").replace(/\/$/, "");
  return prefix && prefix !== "." ? `${prefix}/${MANIFEST_FILE}` : MANIFEST_FILE;
}

function joinAreaManifestRel(parentDir, areaName) {
  const parent = String(parentDir || "").replace(/\\/g, "/").replace(/\/$/, "");
  if (areaName != null && String(areaName).trim()) {
    const folder = toAreaFolderName(areaName);
    if (!folder) return MANIFEST_FILE;
    return parent && parent !== "." ? `${parent}/${folder}/${MANIFEST_FILE}` : `${folder}/${MANIFEST_FILE}`;
  }
  if (!parent || parent === ".") return MANIFEST_FILE;
  return `${parent}/${MANIFEST_FILE}`;
}

function getManifestContainerDirRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  if (!isManifestMdRelPath(normalized)) {
    const dir = path.posix.dirname(normalized);
    return !dir || dir === "." ? "" : dir;
  }
  const dir = path.posix.dirname(normalized);
  return !dir || dir === "." ? "" : dir;
}

function getStorageContainerPrefixRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return "";
  const marker = `/${STORAGE_ROOT_FOLDER}/`;
  const idx = normalized.toLowerCase().indexOf(marker.toLowerCase());
  if (idx >= 0) {
    return normalized.slice(0, idx);
  }
  if (isManifestMdRelPath(normalized)) {
    return getManifestContainerDirRel(normalized);
  }
  return getManifestContainerDirRel(normalized);
}

function getManifestNamedSlotKey(relPath) {
  return getManifestSlugFromRel(relPath);
}

function appendManifestCandidatesForStorageKey(manifestCandidates, containerPrefix, key) {
  const slotKey = String(key || "").trim();
  if (!slotKey) return;
  const prefix = String(containerPrefix || "").replace(/\\/g, "/").replace(/\/$/, "");
  const withPrefix = (rel) => {
    const normalized = String(rel || "").replace(/\\/g, "/");
    if (!prefix || prefix === ".") return normalized;
    return `${prefix}/${normalized}`;
  };
  manifestCandidates.push(withPrefix(`${slotKey}/${MANIFEST_FILE}`));
}

function getNamedStorageSlotDirRel(relPath) {
  const ownerRel = resolveOwningManifestRelFromNodePath(relPath);
  const containerDir = getManifestContainerDirRel(ownerRel);
  if (!containerDir) return STORAGE_ROOT_FOLDER;
  return `${containerDir}/${STORAGE_ROOT_FOLDER}`;
}

function getNamedStorageBundleDirRel(relPath) {
  return getNamedStorageSlotDirRel(relPath);
}

function getNamedStorageBundleRel(relPath, bundleFileName) {
  const dir = getNamedStorageBundleDirRel(relPath);
  return dir ? `${dir}/${bundleFileName}` : String(bundleFileName || "");
}

function normalizeHistoryTargetRelPath(targetRelPath) {
  return String(targetRelPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function getHistoryRelativeTargetPath(manifestRelPath, targetRelPath) {
  const manifest = normalizeHistoryTargetRelPath(manifestRelPath);
  const target = normalizeHistoryTargetRelPath(targetRelPath);
  if (!manifest || !target) return "";

  if (target === manifest) {
    return path.posix.basename(manifest);
  }

  const slotDir = getNamedStorageSlotDirRel(manifest);
  if (slotDir) {
    const slotPrefix = `${slotDir}/`;
    if (target.startsWith(slotPrefix)) {
      return target.slice(slotPrefix.length);
    }
  }

  const containerDir = getManifestContainerDirRel(manifest);
  if (containerDir) {
    const containerPrefix = `${containerDir}/`;
    if (target.startsWith(containerPrefix)) {
      return target.slice(containerPrefix.length);
    }
  }

  return path.posix.basename(target);
}

function getHistoryVersionDirRel(manifestRelPath, targetRelPath) {
  const slotDir = getNamedStorageSlotDirRel(manifestRelPath);
  const relativeTarget = getHistoryRelativeTargetPath(manifestRelPath, targetRelPath);
  if (!slotDir || !relativeTarget) return "";
  return `${slotDir}/${STORAGE_SUBFOLDER_HISTORY}/${relativeTarget}`;
}

function getCommentsDirRel(manifestRelPath, targetRelPath) {
  const slotDir = getNamedStorageSlotDirRel(manifestRelPath);
  const relativeTarget = getHistoryRelativeTargetPath(manifestRelPath, targetRelPath);
  if (!slotDir || !relativeTarget) return "";
  return `${slotDir}/${STORAGE_SUBFOLDER_COMMENTS}/${relativeTarget}`;
}

function getThreadDirRel(manifestRelPath, targetRelPath = null) {
  const slotDir = getNamedStorageSlotDirRel(manifestRelPath);
  if (!slotDir) return "";
  if (!targetRelPath) return `${slotDir}/${STORAGE_SUBFOLDER_THREAD}`;
  const relativeTarget = getHistoryRelativeTargetPath(manifestRelPath, targetRelPath);
  if (!relativeTarget) return `${slotDir}/${STORAGE_SUBFOLDER_THREAD}`;
  return `${slotDir}/${STORAGE_SUBFOLDER_THREAD}/${relativeTarget}`;
}

function buildCommentFileName(date = new Date()) {
  return `${formatHistoryVersionTimestamp(date)}${COMMENT_FILE_SUFFIX}`;
}

function isCommentFileName(fileName) {
  const raw = String(fileName || "");
  if (!raw.endsWith(COMMENT_FILE_SUFFIX) || raw.length <= COMMENT_FILE_SUFFIX.length) return false;
  const stem = raw.slice(0, -COMMENT_FILE_SUFFIX.length);
  return /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}$/.test(stem);
}

function parseCommentFileTimestamp(fileName) {
  const raw = String(fileName || "");
  if (!isCommentFileName(raw)) return null;
  const stamp = raw.slice(0, -COMMENT_FILE_SUFFIX.length);
  const match = stamp.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})-(\d{1,3})$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, millisecond = "0"] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(millisecond)
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatCommentTimestampLabel(fileName) {
  const date = parseCommentFileTimestamp(fileName);
  if (!date) return String(fileName || "");
  const pad = (num) => String(num).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatHistoryVersionTimestamp(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  const pad = (num) => String(num).padStart(2, "0");
  const padMs = (num) => String(num).padStart(3, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}_${pad(value.getHours())}-${pad(value.getMinutes())}-${pad(value.getSeconds())}-${padMs(value.getMilliseconds())}`;
}

function buildHistoryVersionFileName(date = new Date()) {
  return `${formatHistoryVersionTimestamp(date)}${HISTORY_VERSION_SUFFIX}`;
}

function isHistoryVersionFileName(fileName) {
  const raw = String(fileName || "");
  return raw.endsWith(HISTORY_VERSION_SUFFIX) && raw.length > HISTORY_VERSION_SUFFIX.length;
}

function historyVersionSuffixLength(fileName) {
  return isHistoryVersionFileName(fileName) ? HISTORY_VERSION_SUFFIX.length : 0;
}

function parseHistoryVersionTimestamp(fileName) {
  const raw = String(fileName || "");
  const suffixLength = historyVersionSuffixLength(raw);
  if (!suffixLength) return null;
  const stamp = raw.slice(0, -suffixLength);
  const match = stamp.match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})(?:-(\d{1,3}))?$/);
  if (!match) return null;
  const [, year, month, day, hour, minute, second, millisecond = "0"] = match;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(millisecond)
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatHistoryVersionTimestampLabel(fileName) {
  const date = parseHistoryVersionTimestamp(fileName);
  if (!date) return String(fileName || "");
  const pad = (num) => String(num).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function resolveBundleFileMode(fileNameLower) {
  if (fileNameLower === BUNDLE_BODY_FILE.toLowerCase()) return "internal";
  if (fileNameLower === BUNDLE_CONTENT_FILE.toLowerCase()) return "internal";
  if (fileNameLower === BUNDLE_TABULAR_FILE.toLowerCase()) return "tabular";
  if (fileNameLower === BUNDLE_CONFIG_FILE.toLowerCase()) return "configs";
  if (fileNameLower === BUNDLE_TODO_FILE.toLowerCase()) return "todo";
  if (fileNameLower.startsWith(`${PREVIEW_FILE_BASENAME.toLowerCase()}.`)) return "node-preview";
  return null;
}

function buildManifestCandidatesForStorageKey(key, options = {}) {
  const manifestCandidates = [];
  const slotKey = String(key || "").trim();
  if (!slotKey) return manifestCandidates;
  appendManifestCandidatesForStorageKey(manifestCandidates, "", slotKey);
  const workspaceKey = String(options.workspaceFolderName || "").trim();
  if (workspaceKey && slotKey === workspaceKey) {
    manifestCandidates.push(MANIFEST_FILE);
    manifestCandidates.push(`${workspaceKey}/${MANIFEST_FILE}`);
  }
  return [...new Set(manifestCandidates.filter((candidate) => isManifestMdRelPath(candidate)))];
}

function buildManifestCandidatesForContainerDir(containerPrefix) {
  const prefix = String(containerPrefix || "").replace(/\/$/, "").trim();
  if (!prefix) return [MANIFEST_FILE];
  return [`${prefix}/${MANIFEST_FILE}`];
}

function stripStoragePrefix(name) {
  return String(name || "").trim();
}

function buildStorageLayerRef(manifestRelPath, layerFolder, relativePath) {
  const rel = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!rel || rel.includes("..")) return "";
  const layer = normalizeStorageSubfolderName(layerFolder) || String(layerFolder || "").trim();
  if (!layer || !isAllowedStorageSubfolderName(layer)) return "";
  const slotDir = getNamedStorageSlotDirRel(manifestRelPath);
  if (!slotDir) return "";
  return `${slotDir}/${layer}/${rel}`;
}

function parseStorageLayerRef(workspaceRelPath) {
  const normalized = String(workspaceRelPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return null;

  let containerPrefix = "";
  let layer = "";
  let relativePath = "";

  const rootMatch = normalized.match(
    new RegExp(`^${escapeRegex(STORAGE_ROOT_FOLDER)}/([^/]+)/(.+)$`, "i")
  );
  if (rootMatch) {
    layer = normalizeStorageSubfolderName(rootMatch[1]);
    relativePath = rootMatch[2];
  } else {
    const match = normalized.match(
      new RegExp(`^(.*?)/${escapeRegex(STORAGE_ROOT_FOLDER)}/([^/]+)/(.+)$`, "i")
    );
    if (!match) return null;
    containerPrefix = String(match[1] || "").replace(/\/$/, "");
    layer = normalizeStorageSubfolderName(match[2]);
    relativePath = match[3];
  }

  if (!layer || !relativePath || !isAllowedStorageSubfolderName(layer)) return null;

  const manifestRel = containerPrefix ? `${containerPrefix}/${MANIFEST_FILE}` : MANIFEST_FILE;

  return {
    workspacePath: normalized,
    slotDir: containerPrefix ? `${containerPrefix}/${STORAGE_ROOT_FOLDER}` : STORAGE_ROOT_FOLDER,
    slotKey: getManifestSlugFromRel(manifestRel),
    layer,
    relativePath,
    manifestCandidates: [manifestRel]
  };
}

function pickManifestRelFromStorageLayerRef(parsed) {
  return parsed?.manifestCandidates?.[0] || null;
}

function resolveOwningManifestRelFromNodePath(nodePath) {
  const normalized = String(nodePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return "";
  const base = path.posix.basename(normalized);
  if (isManifestFileName(base)) return normalized;
  const storageMarker = `/${STORAGE_ROOT_FOLDER}/`;
  const idx = normalized.toLowerCase().indexOf(storageMarker.toLowerCase());
  if (idx >= 0) {
    const prefix = normalized.slice(0, idx).replace(/\/$/, "");
    return prefix ? `${prefix}/${MANIFEST_FILE}` : MANIFEST_FILE;
  }
  return normalized;
}

function countManifestFolderDepthUnderContainer(normalized, containerFolder = "container") {
  const container = String(containerFolder || "container").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!container) return null;
  const marker = `${container}/`;
  const idx = normalized.toLowerCase().indexOf(marker.toLowerCase());
  if (idx < 0) return null;
  const after = normalized.slice(idx + marker.length);
  const segments = after.split("/").filter(Boolean);
  if (!segments.length) return 0;
  const last = segments[segments.length - 1].toLowerCase();
  if (last === MANIFEST_FILE.toLowerCase()) return Math.max(0, segments.length - 1);
  return segments.length;
}

/** Infer awn-type from workspace-relative path (no form state). */
function inferAwnTypeFromRelPath(relPath, options = {}) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return "awn.file";
  const fileName = normalized.split("/").filter(Boolean).pop() || "";
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".sidecar.md")) return "awn.sidecar";
  if (isMediaCategoryContentRelPath(normalized)) return "awn.media.category";
  if (isRecordCategoryContentRelPath(normalized)) return "awn.record.category";
  if (isExternalSectionReadmeRelPath(normalized)) return "awn.record.category";
  if (isMediaSectionReadmeRelPath(normalized)) return "awn.media.category";

  const isStorageContentFile =
    options.contentMode === "external" || /\/storage\/content\//i.test(normalized);
  if (isStorageContentFile && !isManifestFileName(fileName)) {
    return "awn.record";
  }

  if (isManifestFileName(fileName)) {
    if (options.isAgentRoot) return "awn.workspace";
    if (options.isContainerRoot) return "awn.area";

    const containerFolder = options.containerFolder || "container";
    const folderDepth = countManifestFolderDepthUnderContainer(normalized, containerFolder);
    if (folderDepth !== null) {
      return folderDepth >= 2 ? "awn.topic" : "awn.area";
    }
    return "awn.area";
  }

  return "awn.record";
}

function listStorageAssetsRefPathCandidates(workspaceRelPath, contextManifestRelPath) {
  const normalized = String(workspaceRelPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return [];

  const context = resolveOwningManifestRelFromNodePath(contextManifestRelPath || MANIFEST_FILE);
  const rawContext = String(contextManifestRelPath || MANIFEST_FILE)
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  const candidates = [];
  const seen = new Set();
  const add = (value, { first = false } = {}) => {
    const item = String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
    if (!item || item.includes("..") || seen.has(item)) return;
    seen.add(item);
    if (first) candidates.unshift(item);
    else candidates.push(item);
  };

  if (/^storage\//i.test(normalized)) {
    const containerDir = getManifestContainerDirRel(context);
    if (containerDir) add(`${containerDir}/${normalized}`, { first: true });
    if (/\/storage\/content\//i.test(rawContext)) {
      const legacyNested = `${containerDir}/storage/content/storage/${normalized.replace(/^storage\//i, "")}`;
      add(legacyNested);
    }
  }

  if (/^assets\//i.test(normalized)) {
    const slotDir = getNamedStorageSlotDirRel(context);
    if (slotDir) add(`${slotDir}/${normalized}`, { first: true });
  }

  add(normalized);
  return candidates;
}

function parseStorageAssetsRefInContext(workspaceRelPath, contextManifestRelPath) {
  for (const candidate of listStorageAssetsRefPathCandidates(workspaceRelPath, contextManifestRelPath)) {
    const ref = parseStorageAssetsRef(candidate);
    if (ref) return { ...ref, workspacePath: candidate };
  }
  return null;
}

function parseStorageAssetsRef(workspaceRelPath) {
  const parsed = parseStorageLayerRef(workspaceRelPath);
  if (!parsed || parsed.layer !== STORAGE_SUBFOLDER_ASSETS) return null;
  return {
    manifestRelPath: pickManifestRelFromStorageLayerRef(parsed),
    mediaFile: parsed.relativePath,
    workspacePath: parsed.workspacePath,
    slotDir: parsed.slotDir
  };
}

function buildAssetsUploadRef(_contextRelPath, assetsSubdir, fileName) {
  const subdir = String(assetsSubdir || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const file = String(fileName || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!subdir || !file || subdir.includes("..") || file.includes("..")) return "";
  return `${STORAGE_ROOT_FOLDER}/${STORAGE_SUBFOLDER_ASSETS}/${subdir}/${file}`;
}

function normalizeNodeAssetsStorageRef(workspaceRelPath) {
  const normalized = String(workspaceRelPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) return "";

  if (/^storage\/assets\//i.test(normalized)) return normalized;

  if (/^assets\//i.test(normalized)) {
    return `${STORAGE_ROOT_FOLDER}/${normalized}`;
  }

  if (/^(pasted|preview|attachments)\//i.test(normalized)) {
    return `${STORAGE_ROOT_FOLDER}/${STORAGE_SUBFOLDER_ASSETS}/${normalized}`;
  }

  const assetsRef = parseStorageAssetsRef(normalized);
  if (assetsRef?.mediaFile) {
    return `${STORAGE_ROOT_FOLDER}/${STORAGE_SUBFOLDER_ASSETS}/${assetsRef.mediaFile}`;
  }

  const storageAssetsIdx = normalized.toLowerCase().indexOf("/storage/assets/");
  if (storageAssetsIdx >= 0) {
    return normalized.slice(storageAssetsIdx + 1);
  }

  return normalized;
}

function buildAssetsWorkspaceRef(contextRelPath, assetsSubdir, fileName) {
  const subdir = String(assetsSubdir || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const file = String(fileName || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!subdir || !file || subdir.includes("..") || file.includes("..")) return "";
  return buildStorageLayerRef(contextRelPath, STORAGE_SUBFOLDER_ASSETS, `${subdir}/${file}`);
}

function parseStorageSlotInlineRef(workspaceRelPath) {
  const parsed = parseStorageAssetsRef(workspaceRelPath);
  if (!parsed?.mediaFile) return null;
  const parts = String(parsed.mediaFile).replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const layer = normalizeStorageSubfolderName(parts[0]);
  if (layer !== STORAGE_SUBFOLDER_PASTED && layer !== STORAGE_SUBFOLDER_PREVIEW) return null;
  const relativePath = parts.slice(1).join("/");
  if (!relativePath) return null;
  return {
    manifestRelPath: parsed.manifestRelPath,
    layer,
    relativePath,
    workspacePath: parsed.workspacePath,
    slotDir: parsed.slotDir,
    slotLayerFile: `${layer}/${relativePath}`
  };
}

function isStorageAssetsInlineSubfolder(name) {
  const canonical = normalizeStorageSubfolderName(name);
  return STORAGE_ASSETS_INLINE_SUBFOLDERS.includes(canonical);
}

function buildSlotInlineUploadRef(manifestRelPath, layer, fileName) {
  return buildAssetsUploadRef(manifestRelPath, layer, fileName);
}

function resolveManifestRelFromStorageBundlePath(normalized) {
  const rel = String(normalized || "").replace(/\\/g, "/");
  const match = rel.match(
    new RegExp(`^(.*)/${escapeRegex(STORAGE_ROOT_FOLDER)}/([^/]+)$`, "i")
  );
  if (!match) return null;
  const containerPrefix = match[1] ? match[1].replace(/\/$/, "") : "";
  const mode = resolveBundleFileMode(match[2].toLowerCase());
  if (!mode) return null;

  const manifestRel = containerPrefix ? `${containerPrefix}/${MANIFEST_FILE}` : MANIFEST_FILE;

  return {
    manifestCandidates: [manifestRel],
    mode,
    bundlePath: rel
  };
}

function topicManifestCandidates(nodeBase, parentFolder) {
  const rel = toTopicFileName(nodeBase);
  if (!rel) return [];
  const parent = String(parentFolder || "").replace(/\\/g, "/");
  return [parent && parent !== "." ? `${parent}/${rel}` : rel];
}

function manifestRelToXSidecar(relPath, sidecarSuffix) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const dot = sidecarSuffix.startsWith(".") ? sidecarSuffix : `.${sidecarSuffix}`;
  const base = path.posix.basename(normalized);
  if (isManifestFileName(base)) {
    return normalized.replace(/\.md$/i, `${dot}.md`);
  }
  return normalized;
}

function resolveParentDirectoryFromManifestPath(raw) {
  const normalized = String(raw || ".").trim().replace(/\\/g, "/");
  if (!normalized || normalized === ".") return ".";
  const base = path.posix.basename(normalized);
  if (isManifestFileName(base)) {
    const dir = path.posix.dirname(normalized);
    return dir === "." ? "." : dir;
  }
  return normalized;
}

function inferManifestRelFromSidecar(normalized) {
  const rel = String(normalized || "").replace(/\\/g, "/");
  const bundle = resolveManifestRelFromStorageBundlePath(rel);
  if (bundle?.manifestCandidates?.[0]) return bundle.manifestCandidates[0];
  const topicSidecar = rel.match(/^(.*\/[^/]+)\.[^/]+\.md$/i);
  if (topicSidecar) {
    const candidate = `${topicSidecar[1]}.md`;
    if (isManifestMdRelPath(candidate)) return candidate;
  }
  return null;
}

function stripTopicManifestSuffix(fileName) {
  return stripTopicPrefix(fileName);
}

const STORAGE_FOLDER_NAME = STORAGE_ROOT_FOLDER;
const NODE_MANIFEST_FILE = MANIFEST_FILE;
const TOPIC_MANIFEST_RE = /^manifest\.md$/i;
const MANIFEST_MD_RE = TOPIC_MANIFEST_RE;

function isManifestMdAbsolute(absPath) {
  return isManifestFileName(path.basename(String(absPath || "")));
}

function expandStorageFolderRelCandidates(relPaths) {
  return [...new Set(relPaths.filter(Boolean))];
}

function listManifestStorageSlotDirRelCandidates(relPath) {
  const primary = getNamedStorageSlotDirRel(relPath);
  return primary ? [primary] : [];
}

function getManifestStorageKey(relPath) {
  return getManifestNamedSlotKey(relPath);
}

function getNodeLocalStorageDirRel(relPath) {
  return getNamedStorageSlotDirRel(relPath);
}

function getFlatLegacyNamedStorageDirRel(relPath) {
  return getNamedStorageSlotDirRel(relPath);
}

function getLegacyLowercaseBundleRel(relPath, bundleFileName) {
  return getNamedStorageBundleRel(relPath, bundleFileName);
}

const isNodeManifestFileName = isManifestFileName;
const isNodeManifestRelPath = isAreaManifestRelPath;
const LEGACY_NODE_MANIFEST_FILES = [];
const LEGACY_AREA_MANIFEST_FILE = MANIFEST_FILE;
const LEGACY_AREA_MANIFEST_ALIASES = [];
const LEGACY_STORAGE_FOLDER_NAME = STORAGE_ROOT_FOLDER;
const LEGACY_BUNDLE_CONTENT_FILE = BUNDLE_CONTENT_FILE;
const LEGACY_BUNDLE_TABULAR_FILE = BUNDLE_TABULAR_FILE;
const LEGACY_HISTORY_VERSION_SUFFIX = ".md.back";

function legacyManifestRelToNodeSidecar(relPath, nodeSidecarSuffix) {
  return manifestRelToXSidecar(relPath, nodeSidecarSuffix);
}

function parsePartFolderManifestRel() {
  return null;
}

function partFolderSidecarRel() {
  return null;
}

function partFolderLegacySidecarRel() {
  return null;
}

function resolvePartFolderSidecarBaseRel() {
  return null;
}

module.exports = {
  MANIFEST_FILE,
  STORAGE_ROOT_FOLDER,
  CONFIGURATION_ROOT_FOLDER,
  isConfigurationFolderName,
  STORAGE_PREFIX: STORAGE_ROOT_FOLDER,
  AREA_MANIFEST_FILE,
  SERVICE_AREA_NAME,
  getServiceAreaManifestRel,
  AREA_MANIFEST_CANDIDATES,
  TOPIC_MANIFEST_RE,
  BUNDLE_BODY_FILE,
  BUNDLE_CONTENT_FILE,
  BUNDLE_TABULAR_FILE,
  BUNDLE_CONFIG_FILE,
  BUNDLE_TODO_FILE,
  ROOT_SYSTEM_TODO_FILE,
  normalizeSystemFileRequestName,
  isRootSystemTodoFileName,
  PREVIEW_FILE_BASENAME,
  PREVIEW_FILE_EXTENSIONS,
  PREVIEW_FILE_NAMES,
  STORAGE_SUBFOLDER_CONTENT,
  STORAGE_SUBFOLDER_INBOX,
  STORAGE_SUBFOLDER_THREAD,
  STORAGE_SUBFOLDER_QUICK_NOTES,
  STORAGE_SUBFOLDER_REFERENCES,
  STORAGE_SUBFOLDER_MEDIA,
  STORAGE_SUBFOLDER_ASSETS,
  STORAGE_SUBFOLDER_SCRIPTS,
  STORAGE_SUBFOLDER_ARTEFACTS,
  STORAGE_SUBFOLDER_CONFIGURATION,
  STORAGE_SUBFOLDER_TEMP,
  STORAGE_SUBFOLDER_PREVIEW,
  STORAGE_SUBFOLDER_PASTED,
  STORAGE_SUBFOLDER_ATTACHMENTS,
  STORAGE_ASSETS_INLINE_SUBFOLDERS,
  STORAGE_SUBFOLDER_HISTORY,
  STORAGE_SUBFOLDER_COMMENTS,
  HISTORY_VERSION_SUFFIX,
  COMMENT_FILE_SUFFIX,
  STORAGE_SLOT_LAYER_FOLDERS,
  STORAGE_SUBFOLDER_BY_MODE,
  STORAGE_FOLDER_NAME,
  LEGACY_STORAGE_FOLDER_NAME,
  LEGACY_AREA_MANIFEST_FILE,
  LEGACY_AREA_MANIFEST_ALIASES,
  LEGACY_BUNDLE_CONTENT_FILE,
  LEGACY_BUNDLE_TABULAR_FILE,
  MANIFEST_MD_RE,
  cleanManifestName,
  stripTopicPrefix,
  getManifestSlugFromRel,
  resolveNodeDisplayName,
  stripStoragePrefix,
  toAreaFolderName,
  toTopicFileName,
  toStorageSlotKey,
  toStorageFolderName,
  getStorageRootDirRel,
  isStorageFolderName,
  isExcludedMenuTopicMdFileName,
  getStorageFolderRegexAlternation,
  expandStorageFolderRelCandidates,
  listBundleFileNameCandidates,
  getNamedStorageBundleRelCandidates,
  normalizeStorageSubfolderName,
  getStorageSubfolderForMode,
  listStorageSubfolderNameCandidates,
  isAllowedStorageSubfolderName,
  isManifestFileName,
  isAreaManifestFileName,
  isTopicManifestFileName,
  isTopicManifestRelPath,
  isAreaManifestRelPath,
  isManifestMdRelPath,
  isRecordCategoryContentRelPath,
  isExternalSectionReadmeRelPath,
  isMediaSectionReadmeRelPath,
  isMediaCategoryContentRelPath,
  joinAreaManifestRel,
  getManifestContainerDirRel,
  getStorageContainerPrefixRel,
  getManifestNamedSlotKey,
  isStorageAssetsInlineSubfolder,
  getNamedStorageSlotDirRel,
  getNamedStorageBundleDirRel,
  getNamedStorageBundleRel,
  buildStorageLayerRef,
  parseStorageLayerRef,
  resolveOwningManifestRelFromNodePath,
  countManifestFolderDepthUnderContainer,
  inferAwnTypeFromRelPath,
  listStorageAssetsRefPathCandidates,
  parseStorageAssetsRefInContext,
  parseStorageAssetsRef,
  parseStorageSlotInlineRef,
  buildAssetsUploadRef,
  buildAssetsWorkspaceRef,
  normalizeNodeAssetsStorageRef,
  buildSlotInlineUploadRef,
  pickManifestRelFromStorageLayerRef,
  getHistoryRelativeTargetPath,
  getHistoryVersionDirRel,
  getCommentsDirRel,
  getThreadDirRel,
  buildHistoryVersionFileName,
  buildCommentFileName,
  isHistoryVersionFileName,
  isCommentFileName,
  parseCommentFileTimestamp,
  formatCommentTimestampLabel,
  parseHistoryVersionTimestamp,
  formatHistoryVersionTimestampLabel,
  normalizeHistoryTargetRelPath,
  LEGACY_HISTORY_VERSION_SUFFIX,
  listManifestStorageSlotDirRelCandidates,
  buildManifestCandidatesForStorageKey,
  buildManifestCandidatesForContainerDir,
  resolveManifestRelFromStorageBundlePath,
  topicManifestCandidates,
  manifestRelToXSidecar,
  resolveParentDirectoryFromManifestPath,
  inferManifestRelFromSidecar,
  stripTopicManifestSuffix,
  getManifestStorageKey,
  getNodeLocalStorageDirRel,
  getFlatLegacyNamedStorageDirRel,
  getLegacyLowercaseBundleRel,
  isNodeManifestFileName,
  isNodeManifestRelPath,
  NODE_MANIFEST_FILE,
  LEGACY_NODE_MANIFEST_FILES,
  isManifestMdAbsolute,
  legacyManifestRelToNodeSidecar,
  parsePartFolderManifestRel,
  partFolderSidecarRel,
  partFolderLegacySidecarRel,
  resolvePartFolderSidecarBaseRel
};
