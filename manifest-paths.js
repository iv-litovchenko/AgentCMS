/**
 * Конвенции манифестов workspace:
 * - Корень workspace: README.x.md (без папки с именем агента)
 * - Область: {Name}/README.x.md
 * - Тема: {Name}.md
 * - Слот данных: _s.{имя_манифеста_без_.md}/ в той же папке, что и *.md (Content.md, Todo.md, …)
 */
const path = require("path");

const STORAGE_PREFIX = "_s.";
const AREA_README_FILE = "README.x.md";
/** Заголовок служебной области; файл: {assistantFolder}/README.x.md */
const SERVICE_AREA_NAME = "Служебное";

/** @deprecated alias */
const AREA_MANIFEST_FILE = AREA_README_FILE;

const BUNDLE_CONTENT_FILE = "Content.md";
const BUNDLE_TABULAR_FILE = "Content.csv";
const BUNDLE_CONFIG_FILE = "Config.yml";
const BUNDLE_TODO_FILE = "Todo.md";
const PREVIEW_FILE_BASENAME = "Preview";
const PREVIEW_FILE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif"];
const PREVIEW_FILE_NAMES = PREVIEW_FILE_EXTENSIONS.map((ext) => `${PREVIEW_FILE_BASENAME}${ext}`);

const TOPIC_MANIFEST_RE = /^[^./\\]+\.md$/i;
const AREA_MANIFEST_CANDIDATES = [AREA_README_FILE];

const WORKSPACE_MENU_EXCLUDED_TOPIC_MD = new Set([
  "readme.x.md",
  "agents.md",
  "todo.md"
]);

const STORAGE_SUBFOLDER_CONTENT = "Content";
const STORAGE_SUBFOLDER_INBOX = "Inbox";
const STORAGE_SUBFOLDER_REFERENCES = "Referenses";
const STORAGE_SUBFOLDER_ASSETS = "Assets";
const STORAGE_SUBFOLDER_SCRIPTS = "Scripts";
const STORAGE_SUBFOLDER_ARTEFACTS = "Artefacts";
const STORAGE_SUBFOLDER_PREVIEW = "Preview";
const STORAGE_SUBFOLDER_TEMP = "Temp";
const STORAGE_SUBFOLDER_HISTORY = "History";
const HISTORY_VERSION_SUFFIX = ".md.back";

const STORAGE_SLOT_LAYER_FOLDERS = [
  STORAGE_SUBFOLDER_CONTENT,
  STORAGE_SUBFOLDER_INBOX,
  STORAGE_SUBFOLDER_REFERENCES,
  STORAGE_SUBFOLDER_ASSETS,
  STORAGE_SUBFOLDER_SCRIPTS,
  STORAGE_SUBFOLDER_ARTEFACTS,
  STORAGE_SUBFOLDER_TEMP,
  STORAGE_SUBFOLDER_PREVIEW
];

const STORAGE_SUBFOLDER_BY_MODE = {
  external: STORAGE_SUBFOLDER_CONTENT,
  inbox: STORAGE_SUBFOLDER_INBOX,
  references: STORAGE_SUBFOLDER_REFERENCES,
  media: STORAGE_SUBFOLDER_ASSETS,
  scripts: STORAGE_SUBFOLDER_SCRIPTS,
  artefacts: STORAGE_SUBFOLDER_ARTEFACTS,
  temp: STORAGE_SUBFOLDER_TEMP
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
  if (raw.toLowerCase().endsWith(".md")) raw = raw.slice(0, -3);
  return raw.trim();
}

function toAreaFolderName(rawName) {
  return cleanManifestName(stripTopicPrefix(rawName)) || null;
}

function toTopicFileName(rawName) {
  const cleaned = cleanManifestName(stripTopicPrefix(rawName));
  return cleaned ? `${cleaned}.md` : null;
}

function toStorageFolderName(rawName) {
  const cleaned = cleanManifestName(stripTopicPrefix(rawName));
  return cleaned ? `${STORAGE_PREFIX}${cleaned}` : null;
}

function isStorageFolderName(name) {
  const raw = String(name || "");
  return raw.startsWith(STORAGE_PREFIX) && raw.length > STORAGE_PREFIX.length;
}

function isExcludedMenuTopicMdFileName(name, options = {}) {
  const base = String(name || "");
  const lower = base.toLowerCase();
  if (isAreaManifestFileName(base)) return true;
  if (lower.endsWith(".sidecar.md")) return true;
  if (WORKSPACE_MENU_EXCLUDED_TOPIC_MD.has(lower)) return true;
  // Legacy README.md at agent workspace root is hidden; README.x.md is the area manifest.
  if (lower === "readme.md" && options.isAgentRoot) return true;
  return false;
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

function isTopicManifestFileName(name, options = {}) {
  const base = String(name || "");
  if (!TOPIC_MANIFEST_RE.test(base)) return false;
  if (isExcludedMenuTopicMdFileName(base, options)) return false;
  return true;
}

function isTopicManifestRelPath(relPath) {
  return isTopicManifestFileName(path.basename(String(relPath || "")));
}

function isAreaManifestRelPath(relPath) {
  return isAreaManifestFileName(path.posix.basename(String(relPath || "").replace(/\\/g, "/")));
}

function isManifestMdRelPath(relPath) {
  return isAreaManifestRelPath(relPath) || isTopicManifestRelPath(relPath);
}

function getServiceAreaManifestRel(serviceFolderRel) {
  const prefix = String(serviceFolderRel || "").replace(/\\/g, "/").replace(/\/$/, "");
  return prefix && prefix !== "." ? `${prefix}/${AREA_README_FILE}` : AREA_README_FILE;
}

function joinAreaManifestRel(parentDir, areaName) {
  const parent = String(parentDir || "").replace(/\\/g, "/").replace(/\/$/, "");
  if (areaName != null && String(areaName).trim()) {
    const folder = toAreaFolderName(areaName);
    if (!folder) return AREA_README_FILE;
    return parent && parent !== "." ? `${parent}/${folder}/${AREA_README_FILE}` : `${folder}/${AREA_README_FILE}`;
  }
  if (!parent || parent === ".") return AREA_README_FILE;
  return `${parent}/${AREA_README_FILE}`;
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
  if (isAreaManifestFileName(base) || isTopicManifestFileName(base)) {
    return stripTopicPrefix(base);
  }
  return "";
}

function getLegacyAreaStorageFolderRel(containerDirRel) {
  const legacyFolder = `${STORAGE_PREFIX}README`;
  const container = String(containerDirRel || "").replace(/\\/g, "/").replace(/\/$/, "");
  if (!container) return legacyFolder;
  return `${container}/${legacyFolder}`;
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

  manifestCandidates.push(withPrefix(`${slotKey}.md`));

  const areaSlotKey = stripTopicPrefix(AREA_README_FILE);
  if (slotKey === areaSlotKey || slotKey === "README") {
    manifestCandidates.push(withPrefix(AREA_README_FILE));
  }

  manifestCandidates.push(withPrefix(`${slotKey}/${AREA_README_FILE}`));
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

function normalizeHistoryTargetRelPath(targetRelPath) {
  return String(targetRelPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function getHistoryVersionDirRel(manifestRelPath, targetRelPath) {
  const slotDir = getNamedStorageSlotDirRel(manifestRelPath);
  const target = normalizeHistoryTargetRelPath(targetRelPath);
  if (!slotDir || !target) return "";
  return `${slotDir}/${STORAGE_SUBFOLDER_HISTORY}/${target}`;
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

function parseHistoryVersionTimestamp(fileName) {
  const raw = String(fileName || "");
  if (!isHistoryVersionFileName(raw)) return null;
  const stamp = raw.slice(0, -HISTORY_VERSION_SUFFIX.length);
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
  appendManifestCandidatesForStorageKey(manifestCandidates, "", slotKey);
  const workspaceKey = String(options.workspaceFolderName || "").trim();
  if (workspaceKey) {
    if (slotKey === workspaceKey) {
      manifestCandidates.push(`${workspaceKey}/${AREA_README_FILE}`);
      manifestCandidates.push(AREA_README_FILE);
    }
  }
  return [...new Set(manifestCandidates.filter((candidate) => isManifestMdRelPath(candidate)))];
}

function buildManifestCandidatesForContainerDir(containerPrefix) {
  const prefix = String(containerPrefix || "").replace(/\/$/, "").trim();
  if (!prefix) return [AREA_README_FILE];
  return [`${prefix}/${AREA_README_FILE}`];
}

function stripStoragePrefix(name) {
  let raw = String(name || "").trim();
  if (raw.startsWith(STORAGE_PREFIX)) raw = raw.slice(STORAGE_PREFIX.length);
  return raw.trim();
}

function resolveManifestRelFromStorageBundlePath(normalized) {
  const rel = String(normalized || "").replace(/\\/g, "/");
  const match = rel.match(
    new RegExp(`^(.*)/(${getStorageFolderRegexAlternation()})/([^/]+)$`, "i")
  );
  if (!match) return null;
  const containerPrefix = match[1] ? match[1].replace(/\/$/, "") : "";
  const key = stripStoragePrefix(match[2]);
  const mode = resolveBundleFileMode(match[3].toLowerCase());
  if (!mode || !key) return null;

  const manifestCandidates = [];
  appendManifestCandidatesForStorageKey(manifestCandidates, containerPrefix, key);

  return {
    manifestCandidates: [...new Set(manifestCandidates.filter((candidate) => isManifestMdRelPath(candidate)))],
    mode,
    bundlePath: rel
  };
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
  if (isTopicManifestFileName(base) || isAreaManifestFileName(base)) {
    return normalized.replace(/\.md$/i, `${dot}.md`);
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

/** @deprecated */
const STORAGE_FOLDER_NAME = "_s";
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
  const candidates = [];
  const primary = getNamedStorageSlotDirRel(relPath);
  if (primary) candidates.push(primary);

  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);
  if (isAreaManifestFileName(base)) {
    const legacy = getLegacyAreaStorageFolderRel(getManifestContainerDirRel(relPath));
    if (legacy && !candidates.includes(legacy)) candidates.push(legacy);
  }

  return candidates;
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
  STORAGE_PREFIX,
  AREA_README_FILE,
  AREA_MANIFEST_FILE,
  SERVICE_AREA_NAME,
  getServiceAreaManifestRel,
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
  STORAGE_SUBFOLDER_TEMP,
  STORAGE_SUBFOLDER_PREVIEW,
  STORAGE_SUBFOLDER_HISTORY,
  HISTORY_VERSION_SUFFIX,
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
  isExcludedMenuTopicMdFileName,
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
  getHistoryVersionDirRel,
  buildHistoryVersionFileName,
  isHistoryVersionFileName,
  parseHistoryVersionTimestamp,
  formatHistoryVersionTimestampLabel,
  normalizeHistoryTargetRelPath,
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
