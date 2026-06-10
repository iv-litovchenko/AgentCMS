/**
 * Конвенции манифестов workspace:
 * - Корень workspace: _registration.md (без папки с именем агента)
 * - Область: {Name}/_registration.md
 * - Тема: {Name}.md
 * - Слот данных: awn-storage/{имя_манифеста_без_.md}/ рядом с *.md (content.md, todo.md, …)
 */
const path = require("path");

const STORAGE_ROOT_FOLDER = "awn-storage";
const AREA_MANIFEST_FILE = "_registration.md";
const LEGACY_AREA_MANIFEST_FILE = "_reg-info.md";
/** awn-name корня awn-agent-kit ({agentSystemFolder}/_registration.md) */
const SERVICE_AREA_NAME = "Служебные темы и компоненты системы";

const BUNDLE_CONTENT_FILE = "content.md";
const BUNDLE_TABULAR_FILE = "content.csv";
const BUNDLE_CONFIG_FILE = "configuration.yml";
const BUNDLE_TODO_FILE = "todo.md";
/** Корневой системный TODO workspace (не путать с todo.md в awn-storage) */
const ROOT_SYSTEM_TODO_FILE = "TODO.md";
const PREVIEW_FILE_BASENAME = "preview";
const PREVIEW_FILE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif"];
const PREVIEW_FILE_NAMES = PREVIEW_FILE_EXTENSIONS.map((ext) => `${PREVIEW_FILE_BASENAME}${ext}`);

const TOPIC_MANIFEST_RE = /^[^./\\]+\.md$/i;
const AREA_MANIFEST_CANDIDATES = [AREA_MANIFEST_FILE, LEGACY_AREA_MANIFEST_FILE];

const WORKSPACE_MENU_EXCLUDED_TOPIC_MD = new Set([
  AREA_MANIFEST_FILE,
  LEGACY_AREA_MANIFEST_FILE,
  "agents.md",
  "todo.md"
]);

const STORAGE_SUBFOLDER_CONTENT = "content";
const STORAGE_SUBFOLDER_INBOX = "inbox";
const STORAGE_SUBFOLDER_REFERENCES = "references";
const STORAGE_SUBFOLDER_ASSETS = "assets";
const STORAGE_SUBFOLDER_SCRIPTS = "scripts";
const STORAGE_SUBFOLDER_ARTEFACTS = "artefacts";
const STORAGE_SUBFOLDER_PREVIEW = "preview";
const STORAGE_SUBFOLDER_TEMP = "temp";
const STORAGE_SUBFOLDER_HISTORY = "history";
const HISTORY_VERSION_SUFFIX = ".mdback";
const LEGACY_HISTORY_VERSION_SUFFIX = ".md.back";

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

/** Slug ноды: имя файла темы или папки области (без .md). */
function getManifestSlugFromRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);
  if (isAreaManifestRelPath(normalized)) {
    const dir = path.posix.dirname(normalized);
    if (!dir || dir === ".") return stripTopicPrefix(base);
    return stripTopicPrefix(path.posix.basename(dir));
  }
  return stripTopicPrefix(base);
}

/** Отображаемое имя: awn-name, иначе slug. Пустые и служебные значения → slug. */
function resolveNodeDisplayName(awnNameRaw, slug) {
  const awnName = String(awnNameRaw || "").trim();
  const slugLabel = String(slug || "").trim();
  if (!awnName) return slugLabel;
  const areaManifestStem = stripTopicPrefix(AREA_MANIFEST_FILE);
  const legacyManifestStem = stripTopicPrefix(LEGACY_AREA_MANIFEST_FILE);
  if (awnName.toLowerCase() === areaManifestStem.toLowerCase()) return slugLabel;
  if (awnName.toLowerCase() === legacyManifestStem.toLowerCase()) return slugLabel;
  if (awnName === "_REGISTRATION" || awnName === "_REGINFO") return slugLabel;
  return awnName;
}

function toAreaFolderName(rawName) {
  return cleanManifestName(stripTopicPrefix(rawName)) || null;
}

function toTopicFileName(rawName) {
  const cleaned = cleanManifestName(stripTopicPrefix(rawName));
  return cleaned ? `${cleaned}.md` : null;
}

function toStorageSlotKey(rawName) {
  const cleaned = cleanManifestName(stripTopicPrefix(rawName));
  return cleaned || null;
}

/** @deprecated alias — возвращает ключ слота (без awn-storage/) */
function toStorageFolderName(rawName) {
  return toStorageSlotKey(rawName);
}

function isStorageFolderName(name) {
  return String(name || "").toLowerCase() === STORAGE_ROOT_FOLDER.toLowerCase();
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
  if (isAreaManifestFileName(base)) return true;
  if (lower.endsWith(".sidecar.md")) return true;
  if (WORKSPACE_MENU_EXCLUDED_TOPIC_MD.has(lower)) return true;
  // README.md at agent workspace root is hidden; _registration.md is the area manifest.
  if (lower === "readme.md" && options.isAgentRoot) return true;
  return false;
}

function getStorageFolderRegexAlternation() {
  return `${escapeRegex(STORAGE_ROOT_FOLDER)}/[^/]+`;
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
  const lower = String(name || "").toLowerCase();
  return AREA_MANIFEST_CANDIDATES.some((candidate) => lower === candidate.toLowerCase());
}

function isAreaManifestRelPathSuffix(normalized) {
  const lower = String(normalized || "").toLowerCase();
  return AREA_MANIFEST_CANDIDATES.some((candidate) => lower.endsWith(`/${candidate.toLowerCase()}`));
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

function normalizeManifestRelPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/");
}

/** Справочник категорий записей: awn-storage/categories/content/{slug}.md или …/content/categories/{slug}.md */
function isRecordCategoryContentRelPath(relPath) {
  const normalized = normalizeManifestRelPath(relPath);
  return (
    /\/awn-storage\/categories\/content\/[^/]+\.md$/i.test(normalized) ||
    /\/content\/categories\/[^/]+\.md$/i.test(normalized)
  );
}

/** Описание подкаталога в content: …/content/{section}/_registration.md */
function isExternalSectionReadmeRelPath(relPath) {
  const normalized = normalizeManifestRelPath(relPath);
  if (!isAreaManifestRelPathSuffix(normalized)) return false;
  return /\/content\//i.test(normalized);
}

/** Описание подкаталога в assets: …/assets/{section}/_registration.md */
function isMediaSectionReadmeRelPath(relPath) {
  const normalized = normalizeManifestRelPath(relPath);
  if (!isAreaManifestRelPathSuffix(normalized)) return false;
  return /\/assets\//i.test(normalized);
}

/** Справочник категорий медиа: …/assets/categories/{slug}.md или awn-storage/{ключ}/content/{slug}.md */
function isMediaCategoryContentRelPath(relPath) {
  const normalized = normalizeManifestRelPath(relPath);
  const lower = normalized.toLowerCase();
  if (lower.endsWith(".sidecar.md")) return false;
  return (
    /\/assets\/categories\/[^/]+\.md$/i.test(normalized) ||
    /\/awn-storage\/[^/]+\/content\/[^/]+\.md$/i.test(normalized)
  );
}

function getServiceAreaManifestRel(serviceFolderRel) {
  const prefix = String(serviceFolderRel || "").replace(/\\/g, "/").replace(/\/$/, "");
  return prefix && prefix !== "." ? `${prefix}/${AREA_MANIFEST_FILE}` : AREA_MANIFEST_FILE;
}

function joinAreaManifestRel(parentDir, areaName) {
  const parent = String(parentDir || "").replace(/\\/g, "/").replace(/\/$/, "");
  if (areaName != null && String(areaName).trim()) {
    const folder = toAreaFolderName(areaName);
    if (!folder) return AREA_MANIFEST_FILE;
    return parent && parent !== "." ? `${parent}/${folder}/${AREA_MANIFEST_FILE}` : `${folder}/${AREA_MANIFEST_FILE}`;
  }
  if (!parent || parent === ".") return AREA_MANIFEST_FILE;
  return `${parent}/${AREA_MANIFEST_FILE}`;
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

  const areaSlotKey = stripTopicPrefix(AREA_MANIFEST_FILE);
  const legacyAreaSlotKey = stripTopicPrefix(LEGACY_AREA_MANIFEST_FILE);
  if (slotKey === areaSlotKey || slotKey === legacyAreaSlotKey) {
    for (const manifestFile of AREA_MANIFEST_CANDIDATES) {
      manifestCandidates.push(withPrefix(manifestFile));
    }
  }

  for (const manifestFile of AREA_MANIFEST_CANDIDATES) {
    manifestCandidates.push(withPrefix(`${slotKey}/${manifestFile}`));
  }
}

function getNamedStorageSlotDirRel(relPath) {
  const containerDir = getManifestContainerDirRel(relPath);
  const slotKey = getManifestNamedSlotKey(relPath);
  if (!slotKey) return "";
  const slotDir = `${STORAGE_ROOT_FOLDER}/${slotKey}`;
  if (!containerDir) return slotDir;
  return `${containerDir}/${slotDir}`;
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

/**
 * Путь внутри History относительно темы:
 * - манифест темы → Тема.md
 * - файл в awn-storage/* → content/juijui.md (без префикса awn-storage/Тема)
 * - файл рядом с манифестом → todo.md
 */
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
  if (raw.endsWith(HISTORY_VERSION_SUFFIX) && raw.length > HISTORY_VERSION_SUFFIX.length) return true;
  return raw.endsWith(LEGACY_HISTORY_VERSION_SUFFIX) && raw.length > LEGACY_HISTORY_VERSION_SUFFIX.length;
}

function historyVersionSuffixLength(fileName) {
  const raw = String(fileName || "");
  if (raw.endsWith(HISTORY_VERSION_SUFFIX)) return HISTORY_VERSION_SUFFIX.length;
  if (raw.endsWith(LEGACY_HISTORY_VERSION_SUFFIX)) return LEGACY_HISTORY_VERSION_SUFFIX.length;
  return 0;
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
  if (fileNameLower === BUNDLE_CONTENT_FILE.toLowerCase()) return "internal";
  if (fileNameLower === BUNDLE_TABULAR_FILE.toLowerCase()) return "tabular";
  if (fileNameLower === BUNDLE_CONFIG_FILE.toLowerCase()) {
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
      for (const manifestFile of AREA_MANIFEST_CANDIDATES) {
        manifestCandidates.push(`${workspaceKey}/${manifestFile}`);
        manifestCandidates.push(manifestFile);
      }
    }
  }
  return [...new Set(manifestCandidates.filter((candidate) => isManifestMdRelPath(candidate)))];
}

function buildManifestCandidatesForContainerDir(containerPrefix) {
  const prefix = String(containerPrefix || "").replace(/\/$/, "").trim();
  if (!prefix) return [AREA_MANIFEST_FILE];
  return [`${prefix}/${AREA_MANIFEST_FILE}`];
}

function stripStoragePrefix(name) {
  return String(name || "").trim();
}

function resolveManifestRelFromStorageBundlePath(normalized) {
  const rel = String(normalized || "").replace(/\\/g, "/");
  const match = rel.match(
    new RegExp(`^(.*)/${escapeRegex(STORAGE_ROOT_FOLDER)}/([^/]+)/([^/]+)$`, "i")
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

const STORAGE_FOLDER_NAME = STORAGE_ROOT_FOLDER;
/** @deprecated */
const LEGACY_STORAGE_FOLDER_NAME = "_Storage";
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
  STORAGE_ROOT_FOLDER,
  STORAGE_PREFIX: STORAGE_ROOT_FOLDER,
  AREA_MANIFEST_FILE,
  SERVICE_AREA_NAME,
  getServiceAreaManifestRel,
  AREA_MANIFEST_CANDIDATES,
  TOPIC_MANIFEST_RE,
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
  getManifestNamedSlotKey,
  getNamedStorageSlotDirRel,
  getNamedStorageBundleDirRel,
  getNamedStorageBundleRel,
  getHistoryRelativeTargetPath,
  getHistoryVersionDirRel,
  buildHistoryVersionFileName,
  isHistoryVersionFileName,
  parseHistoryVersionTimestamp,
  formatHistoryVersionTimestampLabel,
  normalizeHistoryTargetRelPath,
  HISTORY_VERSION_SUFFIX,
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
