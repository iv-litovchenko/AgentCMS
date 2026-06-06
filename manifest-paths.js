/**
 * Конвенции манифестов workspace (без legacy-миграций):
 * - Область: t.{Name}/t.README.md
 * - Тема: t.{Name}.md
 * - Слот данных: s.{Name}/ (Content.md, Content.csv, Config.yml, Todo.md, …)
 */
const path = require("path");

const TOPIC_PREFIX = "t.";
const STORAGE_PREFIX = "s.";
const AREA_README_FILE = "t.README.md";

/** @deprecated alias */
const AREA_MANIFEST_FILE = AREA_README_FILE;

const BUNDLE_CONTENT_FILE = "Content.md";
const BUNDLE_TABULAR_FILE = "Content.csv";
const BUNDLE_CONFIG_FILE = "Config.yml";
const BUNDLE_TODO_FILE = "Todo.md";
const PREVIEW_FILE_BASENAME = "Preview";
const PREVIEW_FILE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif"];
const PREVIEW_FILE_NAMES = PREVIEW_FILE_EXTENSIONS.map((ext) => `${PREVIEW_FILE_BASENAME}${ext}`);

const TOPIC_MANIFEST_RE = /^t\.[^/\\]+\.md$/i;
const AREA_MANIFEST_CANDIDATES = [AREA_README_FILE];

const STORAGE_SUBFOLDER_CONTENT = "Content";
const STORAGE_SUBFOLDER_INBOX = "Inbox";
const STORAGE_SUBFOLDER_REFERENCES = "Referenses";
const STORAGE_SUBFOLDER_ASSETS = "Assets";
const STORAGE_SUBFOLDER_SCRIPTS = "Scripts";
const STORAGE_SUBFOLDER_ARTEFACTS = "Artefacts";
const STORAGE_SUBFOLDER_PREVIEW = "Preview";

const STORAGE_SLOT_LAYER_FOLDERS = [
  STORAGE_SUBFOLDER_CONTENT,
  STORAGE_SUBFOLDER_INBOX,
  STORAGE_SUBFOLDER_REFERENCES,
  STORAGE_SUBFOLDER_ASSETS,
  STORAGE_SUBFOLDER_SCRIPTS,
  STORAGE_SUBFOLDER_ARTEFACTS,
  STORAGE_SUBFOLDER_PREVIEW
];

const STORAGE_SUBFOLDER_BY_MODE = {
  external: STORAGE_SUBFOLDER_CONTENT,
  inbox: STORAGE_SUBFOLDER_INBOX,
  references: STORAGE_SUBFOLDER_REFERENCES,
  media: STORAGE_SUBFOLDER_ASSETS,
  scripts: STORAGE_SUBFOLDER_SCRIPTS,
  artefacts: STORAGE_SUBFOLDER_ARTEFACTS
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
  if (raw.startsWith(TOPIC_PREFIX)) raw = raw.slice(TOPIC_PREFIX.length);
  if (raw.toLowerCase().endsWith(".md")) raw = raw.slice(0, -3);
  return raw.trim();
}

function toAreaFolderName(rawName) {
  const cleaned = cleanManifestName(stripTopicPrefix(rawName));
  return cleaned ? `${TOPIC_PREFIX}${cleaned}` : null;
}

function toTopicFileName(rawName) {
  const cleaned = cleanManifestName(stripTopicPrefix(rawName));
  return cleaned ? `${TOPIC_PREFIX}${cleaned}.md` : null;
}

function toStorageFolderName(rawName) {
  const cleaned = cleanManifestName(stripTopicPrefix(rawName));
  return cleaned ? `${STORAGE_PREFIX}${cleaned}` : null;
}

function isStorageFolderName(name) {
  const raw = String(name || "");
  return raw.startsWith(STORAGE_PREFIX) && raw.length > STORAGE_PREFIX.length;
}

function isAreaFolderName(name) {
  const raw = String(name || "");
  return raw.startsWith(TOPIC_PREFIX) && raw.length > TOPIC_PREFIX.length;
}

function getStorageFolderRegexAlternation() {
  return `${escapeRegex(STORAGE_PREFIX)}[^/]+`;
}

function listBundleFileNameCandidates(bundleFileName) {
  const canonical = String(bundleFileName || "").trim();
  return canonical ? [canonical] : [];
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

function isAreaManifestFileName(name) {
  return String(name || "").toLowerCase() === AREA_README_FILE.toLowerCase();
}

function isTopicManifestFileName(name) {
  const base = String(name || "");
  if (isAreaManifestFileName(base)) return false;
  return TOPIC_MANIFEST_RE.test(base);
}

function isTopicManifestRelPath(relPath) {
  return isTopicManifestFileName(path.basename(String(relPath || "")));
}

function isAreaManifestRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);
  if (!isAreaManifestFileName(base)) return false;
  const parent = path.posix.basename(path.posix.dirname(normalized));
  return isAreaFolderName(parent);
}

function isManifestMdRelPath(relPath) {
  return isAreaManifestRelPath(relPath) || isTopicManifestRelPath(relPath);
}

function joinAreaManifestRel(parentDir, areaName) {
  const parent = String(parentDir || "").replace(/\\/g, "/").replace(/\/$/, "");
  if (areaName != null && String(areaName).trim()) {
    const folder = toAreaFolderName(areaName);
    if (!folder) return AREA_README_FILE;
    return parent && parent !== "." ? `${parent}/${folder}/${AREA_README_FILE}` : `${folder}/${AREA_README_FILE}`;
  }
  if (!parent || parent === ".") return AREA_README_FILE;
  const base = path.posix.basename(parent);
  if (isAreaFolderName(base)) return `${parent}/${AREA_README_FILE}`;
  const folder = toAreaFolderName(base);
  return folder ? `${parent}/${folder}/${AREA_README_FILE}` : `${parent}/${AREA_README_FILE}`;
}

function getManifestContainerDirRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const dir = path.posix.dirname(normalized);
  if (!dir || dir === ".") return "";
  return dir;
}

function getManifestNamedSlotKey(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);
  if (isAreaManifestFileName(base)) {
    return stripTopicPrefix(path.posix.basename(path.posix.dirname(normalized)));
  }
  if (isTopicManifestFileName(base)) {
    return stripTopicPrefix(base);
  }
  return "";
}

function getNamedStorageSlotDirRel(relPath) {
  const containerDir = getManifestContainerDirRel(relPath);
  const slotKey = getManifestNamedSlotKey(relPath);
  const storageFolder = toStorageFolderName(slotKey);
  if (!storageFolder) return "";
  if (!containerDir) return storageFolder;
  return `${containerDir}/${storageFolder}`;
}

function getNamedStorageBundleDirRel(relPath) {
  return getNamedStorageSlotDirRel(relPath);
}

function getNamedStorageBundleRel(relPath, bundleFileName) {
  const dir = getNamedStorageBundleDirRel(relPath);
  return dir ? `${dir}/${bundleFileName}` : String(bundleFileName || "");
}

function resolveBundleFileMode(fileNameLower) {
  if (fileNameLower === BUNDLE_CONTENT_FILE.toLowerCase()) return "internal";
  if (fileNameLower === BUNDLE_TABULAR_FILE.toLowerCase()) return "tabular";
  if (fileNameLower === BUNDLE_CONFIG_FILE.toLowerCase() || fileNameLower === "config.yaml") {
    return "configs";
  }
  if (fileNameLower === BUNDLE_TODO_FILE.toLowerCase()) return "todo";
  if (fileNameLower.startsWith(`${PREVIEW_FILE_BASENAME.toLowerCase()}.`)) return "node-preview";
  return null;
}

function buildManifestCandidatesForStorageKey(key, options = {}) {
  const manifestCandidates = [];
  const slotKey = String(key || "").trim();
  if (!slotKey) return manifestCandidates;
  manifestCandidates.push(`t.${slotKey}.md`);
  manifestCandidates.push(`t.${slotKey}/${AREA_README_FILE}`);
  const workspaceKey = String(options.workspaceFolderName || "").trim();
  if (workspaceKey && slotKey === workspaceKey) {
    manifestCandidates.push(`t.${workspaceKey}/${AREA_README_FILE}`);
  }
  return [...new Set(manifestCandidates)];
}

function buildManifestCandidatesForContainerDir(containerPrefix) {
  const prefix = String(containerPrefix || "").replace(/\/$/, "").trim();
  if (!prefix) return [AREA_README_FILE];
  if (isAreaFolderName(path.posix.basename(prefix))) {
    return [`${prefix}/${AREA_README_FILE}`];
  }
  return [joinAreaManifestRel(prefix)];
}

function stripStoragePrefix(name) {
  let raw = String(name || "").trim();
  if (raw.startsWith(STORAGE_PREFIX)) raw = raw.slice(STORAGE_PREFIX.length);
  return raw.trim();
}

function resolveManifestRelFromStorageBundlePath(normalized) {
  const rel = String(normalized || "").replace(/\\/g, "/");
  const match = rel.match(new RegExp(`^(.*)/${getStorageFolderRegexAlternation()}/([^/]+)$`, "i"));
  if (!match) return null;
  const containerPrefix = match[1] ? match[1].replace(/\/$/, "") : "";
  const key = stripStoragePrefix(match[2]);
  const mode = resolveBundleFileMode(match[3].toLowerCase());
  if (!mode || !key) return null;

  const manifestCandidates = [];
  manifestCandidates.push(
    containerPrefix ? `${containerPrefix}/t.${key}.md` : `t.${key}.md`
  );
  manifestCandidates.push(
    containerPrefix ? `${containerPrefix}/t.${key}/${AREA_README_FILE}` : `t.${key}/${AREA_README_FILE}`
  );

  return { manifestCandidates, mode, bundlePath: rel };
}

function topicManifestCandidates(nodeBase, parentFolder) {
  const fileName = toTopicFileName(nodeBase);
  if (!fileName) return [];
  const parent = String(parentFolder || "").replace(/\\/g, "/");
  return [parent && parent !== "." ? `${parent}/${fileName}` : fileName];
}

function manifestRelToXSidecar(relPath, sidecarSuffix) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const dot = sidecarSuffix.startsWith(".") ? sidecarSuffix : `.${sidecarSuffix}`;
  const base = path.posix.basename(normalized);
  if (isTopicManifestFileName(base)) {
    return normalized.replace(/\.md$/i, `${dot}.md`);
  }
  if (isAreaManifestFileName(base)) {
    const dir = path.posix.dirname(normalized);
    const key = stripTopicPrefix(path.posix.basename(dir));
    return `${dir}/${TOPIC_PREFIX}${key}${dot}.md`;
  }
  return normalized;
}

function resolveParentDirectoryFromManifestPath(raw) {
  const normalized = String(raw || ".").trim().replace(/\\/g, "/");
  if (!normalized || normalized === ".") return ".";
  const base = path.posix.basename(normalized);
  if (isAreaManifestFileName(base) || isTopicManifestFileName(base)) {
    const dir = path.posix.dirname(normalized);
    return dir === "." ? "." : dir;
  }
  return normalized;
}

function inferManifestRelFromSidecar(normalized) {
  const rel = String(normalized || "").replace(/\\/g, "/");
  const bundle = resolveManifestRelFromStorageBundlePath(rel);
  if (bundle) {
    for (const candidate of bundle.manifestCandidates) {
      if (isManifestMdRelPath(candidate)) return candidate;
    }
  }
  const topicSidecar = rel.match(/^(.*\/t\.[^/]+)\.[^/]+\.md$/i);
  if (topicSidecar) return `${topicSidecar[1]}.md`;
  return null;
}

function stripTopicManifestSuffix(fileName) {
  return stripTopicPrefix(fileName);
}

/** @deprecated */
const STORAGE_FOLDER_NAME = "s";
/** @deprecated */
const LEGACY_STORAGE_FOLDER_NAME = "_Storage";
/** @deprecated */
const LEGACY_AREA_MANIFEST_FILE = "_.x.md";
/** @deprecated */
const LEGACY_AREA_MANIFEST_ALIASES = [];
/** @deprecated */
const LEGACY_BUNDLE_CONTENT_FILE = BUNDLE_CONTENT_FILE;
/** @deprecated */
const LEGACY_BUNDLE_TABULAR_FILE = BUNDLE_TABULAR_FILE;
/** @deprecated */
const MANIFEST_MD_RE = TOPIC_MANIFEST_RE;
/** @deprecated */
function expandStorageFolderRelCandidates(relPaths) {
  return [...new Set(relPaths.filter(Boolean))];
}
/** @deprecated */
function listManifestStorageSlotDirRelCandidates(relPath) {
  const dir = getNamedStorageSlotDirRel(relPath);
  return dir ? [dir] : [];
}
/** @deprecated */
function getManifestStorageKey(relPath) {
  return getManifestNamedSlotKey(relPath);
}
/** @deprecated */
function getNodeLocalStorageDirRel(relPath) {
  return getNamedStorageSlotDirRel(relPath);
}
/** @deprecated */
function getFlatLegacyNamedStorageDirRel(relPath) {
  return getNamedStorageSlotDirRel(relPath);
}
/** @deprecated */
function getLegacyLowercaseBundleRel(relPath, bundleFileName) {
  return getNamedStorageBundleRel(relPath, bundleFileName);
}
/** @deprecated */
const isNodeManifestFileName = isAreaManifestFileName;
/** @deprecated */
const isNodeManifestRelPath = isAreaManifestRelPath;
/** @deprecated */
const NODE_MANIFEST_FILE = AREA_MANIFEST_FILE;
/** @deprecated */
const LEGACY_NODE_MANIFEST_FILES = [];
function isManifestMdAbsolute(absPath) {
  const base = path.basename(String(absPath || ""));
  return isAreaManifestFileName(base) || isTopicManifestFileName(base);
}
/** @deprecated */
function legacyManifestRelToNodeSidecar(relPath, nodeSidecarSuffix) {
  return manifestRelToXSidecar(relPath, nodeSidecarSuffix);
}
/** @deprecated */
function parsePartFolderManifestRel() {
  return null;
}
/** @deprecated */
function partFolderSidecarRel() {
  return null;
}
/** @deprecated */
function partFolderLegacySidecarRel() {
  return null;
}
/** @deprecated */
function resolvePartFolderSidecarBaseRel() {
  return null;
}

module.exports = {
  TOPIC_PREFIX,
  STORAGE_PREFIX,
  AREA_README_FILE,
  AREA_MANIFEST_FILE,
  AREA_MANIFEST_CANDIDATES,
  TOPIC_MANIFEST_RE,
  BUNDLE_CONTENT_FILE,
  BUNDLE_TABULAR_FILE,
  BUNDLE_CONFIG_FILE,
  BUNDLE_TODO_FILE,
  PREVIEW_FILE_BASENAME,
  PREVIEW_FILE_EXTENSIONS,
  PREVIEW_FILE_NAMES,
  STORAGE_SUBFOLDER_CONTENT,
  STORAGE_SUBFOLDER_INBOX,
  STORAGE_SUBFOLDER_REFERENCES,
  STORAGE_SUBFOLDER_ASSETS,
  STORAGE_SUBFOLDER_SCRIPTS,
  STORAGE_SUBFOLDER_ARTEFACTS,
  STORAGE_SUBFOLDER_PREVIEW,
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
  stripStoragePrefix,
  toAreaFolderName,
  toTopicFileName,
  toStorageFolderName,
  isStorageFolderName,
  isAreaFolderName,
  getStorageFolderRegexAlternation,
  expandStorageFolderRelCandidates,
  listBundleFileNameCandidates,
  getNamedStorageBundleRelCandidates,
  normalizeStorageSubfolderName,
  getStorageSubfolderForMode,
  listStorageSubfolderNameCandidates,
  isAllowedStorageSubfolderName,
  isAreaManifestFileName,
  isTopicManifestFileName,
  isTopicManifestRelPath,
  isAreaManifestRelPath,
  isManifestMdRelPath,
  joinAreaManifestRel,
  getManifestContainerDirRel,
  getManifestNamedSlotKey,
  getNamedStorageSlotDirRel,
  getNamedStorageBundleDirRel,
  getNamedStorageBundleRel,
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
