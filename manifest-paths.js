/**
 * Конвенции манифестов workspace:
 * - Область (area): _.x.md (legacy: _.node.md)
 * - Тема (topic): *.x.md (legacy: *.node.md)
 * - Связанные файлы: {папка ноды}/_Storage/Content.md, … (локальный _Storage у каждой темы/области)
 */
const path = require("path");

const AREA_MANIFEST_FILE = "_.x.md";
const LEGACY_AREA_MANIFEST_FILE = "_.node.md";
const LEGACY_AREA_MANIFEST_ALIASES = ["_Self.node.md", "00_MAIN.node.md", "README.node.md"];

const STORAGE_FOLDER_NAME = "_Storage";
const BUNDLE_CONTENT_FILE = "Content.md";
const BUNDLE_TABULAR_FILE = "Content.csv";
const BUNDLE_CONFIG_FILE = "Config.yml";
const BUNDLE_TODO_FILE = "Todo.md";
const PREVIEW_FILE_BASENAME = "Preview";
const PREVIEW_FILE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif"];
const PREVIEW_FILE_NAMES = PREVIEW_FILE_EXTENSIONS.map((ext) => `${PREVIEW_FILE_BASENAME}${ext}`);

/** Каталоги внутри слота _Storage/{ключ}/ (без префикса _). */
const STORAGE_SUBFOLDER_CONTENT = "Content";
const STORAGE_SUBFOLDER_INBOX = "Inbox";
const STORAGE_SUBFOLDER_REFERENCES = "Referenses";
const STORAGE_SUBFOLDER_ASSETS = "Assets";
const STORAGE_SUBFOLDER_ARTEFACTS = "Artefacts";
const STORAGE_SUBFOLDER_PREVIEW = "Preview";

const STORAGE_SLOT_LAYER_FOLDERS = [
  STORAGE_SUBFOLDER_CONTENT,
  STORAGE_SUBFOLDER_INBOX,
  STORAGE_SUBFOLDER_REFERENCES,
  STORAGE_SUBFOLDER_ASSETS,
  STORAGE_SUBFOLDER_ARTEFACTS,
  STORAGE_SUBFOLDER_PREVIEW
];

/** Legacy-имена каталогов (с префиксом _) для чтения старых workspace. */
const STORAGE_SUBFOLDER_LEGACY_BY_CANONICAL = {
  [STORAGE_SUBFOLDER_CONTENT]: "_Content",
  [STORAGE_SUBFOLDER_INBOX]: "_Inbox",
  [STORAGE_SUBFOLDER_REFERENCES]: "_Referenses",
  [STORAGE_SUBFOLDER_ASSETS]: "_Assets",
  [STORAGE_SUBFOLDER_ARTEFACTS]: "_Scripts",
  [STORAGE_SUBFOLDER_PREVIEW]: "_Preview"
};

/** Режим редактора → каноническое имя каталога. */
const STORAGE_SUBFOLDER_BY_MODE = {
  external: STORAGE_SUBFOLDER_CONTENT,
  inbox: STORAGE_SUBFOLDER_INBOX,
  references: STORAGE_SUBFOLDER_REFERENCES,
  media: STORAGE_SUBFOLDER_ASSETS,
  scripts: STORAGE_SUBFOLDER_ARTEFACTS
};

function normalizeStorageSubfolderName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  for (const canonical of STORAGE_SLOT_LAYER_FOLDERS) {
    if (raw === canonical || raw.toLowerCase() === canonical.toLowerCase()) return canonical;
  }
  for (const [canonical, legacy] of Object.entries(STORAGE_SUBFOLDER_LEGACY_BY_CANONICAL)) {
    if (raw === legacy || raw.toLowerCase() === legacy.toLowerCase()) return canonical;
  }
  return raw;
}

function getStorageSubfolderForMode(mode) {
  return STORAGE_SUBFOLDER_BY_MODE[String(mode || "").trim()] || null;
}

function listStorageSubfolderNameCandidates(folderName) {
  const canonical = normalizeStorageSubfolderName(folderName);
  if (!canonical) return [];
  const legacy = STORAGE_SUBFOLDER_LEGACY_BY_CANONICAL[canonical];
  const candidates = [canonical];
  if (legacy && legacy.toLowerCase() !== canonical.toLowerCase()) {
    candidates.push(legacy);
  }
  return [...new Set(candidates)];
}

const MANIFEST_MD_RE = /\.(node|x)\.md$/i;
const TOPIC_MANIFEST_RE = /\.(node|x)\.md$/i;

const AREA_MANIFEST_CANDIDATES = [
  AREA_MANIFEST_FILE,
  LEGACY_AREA_MANIFEST_FILE,
  ...LEGACY_AREA_MANIFEST_ALIASES
];

function isAreaManifestFileName(name) {
  const base = String(name || "");
  return AREA_MANIFEST_CANDIDATES.includes(base);
}

function isTopicManifestFileName(name) {
  const base = String(name || "");
  return TOPIC_MANIFEST_RE.test(base) && !isAreaManifestFileName(base);
}

function isTopicManifestRelPath(relPath) {
  return isTopicManifestFileName(path.basename(String(relPath || "")));
}

function isAreaManifestRelPath(relPath) {
  return isAreaManifestFileName(path.basename(String(relPath || "")));
}

function isManifestMdRelPath(relPath) {
  const base = path.basename(String(relPath || ""));
  return isAreaManifestFileName(base) || isTopicManifestFileName(base);
}

function isManifestMdAbsolute(absPath) {
  return MANIFEST_MD_RE.test(String(absPath || ""));
}

function joinAreaManifestRel(relDir) {
  if (!relDir || relDir === ".") return AREA_MANIFEST_FILE;
  return path.join(relDir, AREA_MANIFEST_FILE).replace(/\\/g, "/");
}

function stripTopicManifestSuffix(fileName) {
  return String(fileName || "").replace(MANIFEST_MD_RE, "");
}

function getManifestContainerDirRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const dir = path.posix.dirname(normalized);
  if (!dir || dir === ".") return "";
  return dir;
}

/**
 * Ключ каталога в _Storage (плоско от корня workspace):
 * - область (_.x.md): «_»
 * - тема (*.x.md): stem файла (Goals из Goals.x.md)
 */
function getManifestStorageKey(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.basename(normalized);
  if (isAreaManifestFileName(base)) return "_";
  return stripTopicManifestSuffix(base);
}

/** Локальный каталог _Storage рядом с манифестом (канон). */
function getNodeLocalStorageDirRel(relPath, options = {}) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const containerDir = getManifestContainerDirRel(normalized);
  if (!containerDir) return STORAGE_FOLDER_NAME;
  return `${containerDir}/${STORAGE_FOLDER_NAME}`;
}

/** @deprecated Плоский _Storage/{ключ} — только для разбора legacy-путей. */
function getFlatLegacyNamedStorageDirRel(relPath, options = {}) {
  const key = getManifestStorageKey(relPath, options);
  return `${STORAGE_FOLDER_NAME}/${key}`;
}

/**
 * Ключ слота в {container}/_Storage/{ключ}/:
 * - область (_.x.md): «_» (Иван/_.x.md → Иван/_Storage/_/)
 * - тема (*.x.md): stem файла (Кристина.x.md → «Кристина»)
 */
function getManifestNamedSlotKey(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);
  if (isAreaManifestFileName(base)) return "_";
  return stripTopicManifestSuffix(base);
}

/** Каталог _Storage/{ключ}/ рядом с манифестом (канон для Content.md, Preview.*, _Assets/…). */
function getNamedStorageSlotDirRel(relPath, options = {}) {
  const containerDir = getManifestContainerDirRel(relPath);
  const slotKey = getManifestNamedSlotKey(relPath, options);
  if (!containerDir) return `${STORAGE_FOLDER_NAME}/${slotKey}`;
  return `${containerDir}/${STORAGE_FOLDER_NAME}/${slotKey}`;
}

function getNamedStorageBundleDirRel(relPath, options = {}) {
  return getNamedStorageSlotDirRel(relPath, options);
}

/** Кандидаты каталогов слота при чтении (новый канон + legacy). */
function listManifestStorageSlotDirRelCandidates(relPath, options = {}) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const containerDir = getManifestContainerDirRel(normalized);
  const base = path.posix.basename(normalized);
  const candidates = [];

  candidates.push(getNamedStorageSlotDirRel(normalized, options));

  if (containerDir) {
    if (isAreaManifestFileName(base)) {
      const folderKey = path.posix.basename(containerDir);
      if (folderKey && folderKey !== "_") {
        candidates.push(`${containerDir}/${STORAGE_FOLDER_NAME}/${folderKey}`);
      }
    } else {
      const stem = stripTopicManifestSuffix(base);
      if (stem) candidates.push(`${containerDir}/${STORAGE_FOLDER_NAME}/${stem}`);
    }
    candidates.push(`${containerDir}/${STORAGE_FOLDER_NAME}`);
  } else {
    const workspaceKey = String(options.workspaceFolderName || "").trim();
    if (workspaceKey && workspaceKey !== "_") {
      candidates.push(`${STORAGE_FOLDER_NAME}/${workspaceKey}`);
    }
    candidates.push(`${STORAGE_FOLDER_NAME}/_`);
    candidates.push(STORAGE_FOLDER_NAME);
  }

  return [...new Set(candidates.filter(Boolean))];
}

function getNamedStorageBundleRel(relPath, bundleFileName, options = {}) {
  const dir = getNamedStorageBundleDirRel(relPath, options);
  return `${dir}/${bundleFileName}`;
}

function getLegacyLowercaseBundleRel(relPath, bundleFileName) {
  return getNamedStorageBundleRel(relPath, String(bundleFileName || "").toLowerCase());
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
  const workspaceKey = String(options.workspaceFolderName || "").trim();
  manifestCandidates.push(`${key}.x.md`);
  manifestCandidates.push(`${key}/_.x.md`);
  manifestCandidates.push(`${key}.node.md`);
  manifestCandidates.push(`${key}/_.node.md`);
  if (workspaceKey && key === workspaceKey) {
    manifestCandidates.push("_.x.md");
    manifestCandidates.push("_.node.md");
  }
  return manifestCandidates;
}

function buildManifestCandidatesForContainerDir(containerPrefix) {
  const manifestCandidates = [];
  const prefix = String(containerPrefix || "").replace(/\/$/, "").trim();
  if (!prefix) {
    manifestCandidates.push("_.x.md");
    manifestCandidates.push("_.node.md");
    return manifestCandidates;
  }
  for (const name of AREA_MANIFEST_CANDIDATES) {
    manifestCandidates.push(`${prefix}/${name}`);
  }
  const folderBase = prefix.slice(prefix.lastIndexOf("/") + 1);
  manifestCandidates.push(`${prefix}/${folderBase}.x.md`);
  manifestCandidates.push(`${prefix}/${folderBase}.node.md`);
  return manifestCandidates;
}

function resolveManifestRelFromStorageBundlePath(normalized, options = {}) {
  const rel = String(normalized || "").replace(/\\/g, "/");

  const flatMatch = rel.match(/^_Storage\/([^/]+)\/([^/]+)$/i);
  if (flatMatch) {
    const key = flatMatch[1];
    const mode = resolveBundleFileMode(flatMatch[2].toLowerCase());
    if (!mode) return null;
    return {
      manifestCandidates: buildManifestCandidatesForStorageKey(key, options),
      mode,
      bundlePath: rel
    };
  }

  const localMatch = rel.match(/^(.*)\/_Storage\/([^/]+)$/i);
  if (localMatch) {
    const containerPrefix = localMatch[1] ? localMatch[1].replace(/\/$/, "") : "";
    const mode = resolveBundleFileMode(localMatch[2].toLowerCase());
    if (!mode) {
      return null;
    }
    return {
      manifestCandidates: buildManifestCandidatesForContainerDir(containerPrefix),
      mode,
      bundlePath: rel
    };
  }

  const nestedMatch = rel.match(/^(.*)\/_Storage\/([^/]+)\/([^/]+)$/i);
  if (!nestedMatch) return null;
  const containerPrefix = nestedMatch[1] ? nestedMatch[1].replace(/\/$/, "") : "";
  const key = nestedMatch[2];
  const mode = resolveBundleFileMode(nestedMatch[3].toLowerCase());
  if (!mode) return null;

  const manifestCandidates = [];
  if (key === "_") {
    manifestCandidates.push(containerPrefix ? `${containerPrefix}/_.x.md` : "_.x.md");
  } else {
    manifestCandidates.push(
      containerPrefix ? `${containerPrefix}/${key}.x.md` : `${key}.x.md`
    );
    manifestCandidates.push(
      containerPrefix ? `${containerPrefix}/${key}/_.x.md` : `${key}/_.x.md`
    );
  }

  return { manifestCandidates, mode, bundlePath: rel };
}

function toTopicFileName(rawName) {
  const cleaned = String(rawName || "")
    .trim()
    .replace(/[\/\\]/g, "")
    .replace(MANIFEST_MD_RE, "")
    .replace(/\s+/g, " ");
  if (!cleaned) return null;
  return `${cleaned}.x.md`;
}

function topicManifestCandidates(nodeBase, parentFolder) {
  const base = String(nodeBase || "").trim();
  if (!base) return [];
  const parent = String(parentFolder || "").replace(/\\/g, "/");
  const rel = (name) =>
    parent && parent !== "." ? `${parent}/${name}` : name;
  return [rel(`${base}.x.md`), rel(`${base}.node.md`)];
}

function manifestRelToXSidecar(relPath, sidecarSuffix) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const dot = sidecarSuffix.startsWith(".") ? sidecarSuffix : `.${sidecarSuffix}`;
  return normalized.replace(MANIFEST_MD_RE, `.x${dot}`);
}

function legacyManifestRelToNodeSidecar(relPath, nodeSidecarSuffix) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const dot = nodeSidecarSuffix.startsWith(".") ? nodeSidecarSuffix : `.${nodeSidecarSuffix}`;
  return normalized.replace(MANIFEST_MD_RE, `.node${dot}`);
}

function parsePartFolderManifestRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const match = normalized.match(/^(.*\/)?_Parts\/([^/]+)\/([^/]+\.(?:node|x)\.md)$/i);
  if (!match || !isAreaManifestFileName(match[3])) return null;
  const prefix = match[1] || "";
  const partName = match[2];
  return {
    dir: `${prefix}_Parts/${partName}`,
    partName,
    manifestName: match[3]
  };
}

function partFolderSidecarRel(relPath, sidecarDotExt) {
  const parsed = parsePartFolderManifestRel(relPath);
  if (!parsed) return null;
  const ext = sidecarDotExt.startsWith(".") ? sidecarDotExt : `.${sidecarDotExt}`;
  return `${parsed.dir}/${parsed.manifestName.replace(MANIFEST_MD_RE, `.x${ext}`)}`;
}

function partFolderLegacySidecarRel(relPath, legacyDotExt) {
  const parsed = parsePartFolderManifestRel(relPath);
  if (!parsed) return null;
  const ext = legacyDotExt.startsWith(".") ? legacyDotExt : `.${legacyDotExt}`;
  return `${parsed.dir}/${parsed.manifestName.replace(MANIFEST_MD_RE, `.node${ext}`)}`;
}

function resolvePartFolderSidecarBaseRel(relPath) {
  const parsed = parsePartFolderManifestRel(relPath);
  if (!parsed) return null;
  const stem = stripTopicManifestSuffix(parsed.manifestName);
  return `${parsed.dir}/${stem}.x`;
}

function resolveParentDirectoryFromManifestPath(raw) {
  const normalized = String(raw || ".").trim().replace(/\\/g, "/");
  if (!normalized || normalized === ".") return ".";
  const base = path.posix.basename(normalized);
  if (isAreaManifestFileName(base) || TOPIC_MANIFEST_RE.test(base)) {
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
      if (MANIFEST_MD_RE.test(candidate)) return candidate;
    }
  }
  const pairs = [
    [/\.x\.todo\.md$/i, ".x.md"],
    [/\.node\.todo\.md$/i, ".x.md"],
    [/\.x\.content\.md$/i, ".x.md"],
    [/\.node\.content\.md$/i, ".x.md"],
    [/\.x\.content\.csv$/i, ".x.md"],
    [/\.node\.content\.csv$/i, ".x.md"],
    [/\.x\.config\.ya?ml$/i, ".x.md"],
    [/\.node\.config\.ya?ml$/i, ".x.md"],
    [/\.content\.md$/i, ".x.md"],
    [/\.props\.yaml$/i, ".x.md"]
  ];
  for (const [re, manifestSuffix] of pairs) {
    if (re.test(rel)) return rel.replace(re, manifestSuffix);
  }
  return null;
}

/** @deprecated use isAreaManifestFileName */
const isNodeManifestFileName = isAreaManifestFileName;

/** @deprecated use isAreaManifestRelPath */
const isNodeManifestRelPath = isAreaManifestRelPath;

/** @deprecated */
const NODE_MANIFEST_FILE = AREA_MANIFEST_FILE;

/** @deprecated */
const LEGACY_NODE_MANIFEST_FILES = LEGACY_AREA_MANIFEST_ALIASES;

module.exports = {
  AREA_MANIFEST_FILE,
  LEGACY_AREA_MANIFEST_FILE,
  LEGACY_AREA_MANIFEST_ALIASES,
  AREA_MANIFEST_CANDIDATES,
  STORAGE_FOLDER_NAME,
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
  STORAGE_SUBFOLDER_ARTEFACTS,
  STORAGE_SUBFOLDER_PREVIEW,
  STORAGE_SLOT_LAYER_FOLDERS,
  STORAGE_SUBFOLDER_LEGACY_BY_CANONICAL,
  STORAGE_SUBFOLDER_BY_MODE,
  normalizeStorageSubfolderName,
  getStorageSubfolderForMode,
  listStorageSubfolderNameCandidates,
  getLegacyLowercaseBundleRel,
  MANIFEST_MD_RE,
  TOPIC_MANIFEST_RE,
  isAreaManifestFileName,
  isTopicManifestFileName,
  isTopicManifestRelPath,
  isAreaManifestRelPath,
  isManifestMdRelPath,
  isManifestMdAbsolute,
  joinAreaManifestRel,
  stripTopicManifestSuffix,
  getManifestContainerDirRel,
  getManifestStorageKey,
  getNodeLocalStorageDirRel,
  getFlatLegacyNamedStorageDirRel,
  getNamedStorageBundleDirRel,
  getNamedStorageBundleRel,
  getManifestNamedSlotKey,
  getNamedStorageSlotDirRel,
  listManifestStorageSlotDirRelCandidates,
  buildManifestCandidatesForStorageKey,
  buildManifestCandidatesForContainerDir,
  resolveManifestRelFromStorageBundlePath,
  toTopicFileName,
  topicManifestCandidates,
  manifestRelToXSidecar,
  legacyManifestRelToNodeSidecar,
  parsePartFolderManifestRel,
  partFolderSidecarRel,
  partFolderLegacySidecarRel,
  resolvePartFolderSidecarBaseRel,
  resolveParentDirectoryFromManifestPath,
  inferManifestRelFromSidecar,
  isNodeManifestFileName,
  isNodeManifestRelPath,
  NODE_MANIFEST_FILE,
  LEGACY_NODE_MANIFEST_FILES
};
