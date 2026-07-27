const http = require("http");
const https = require("https");
const os = require("os");
const fsSync = require("fs");
const fs = require("fs/promises");
const path = require("path");
const { AsyncLocalStorage } = require("async_hooks");
const { execFile } = require("child_process");
const { promisify } = require("util");
const agentRegistry = require("./agent-registry");
const { resolveChpuPath, isChpuReservedRootSegment } = require("./chpu-resolver");
const docsRegistry = require("./docs-registry");
const apiDocs = require("./api-docs");
const mcpDocs = require("./mcp-docs");
const { parseYamlScalar } = require("./awn-yaml-utils");
const { createShellHandlers } = require("./agent-shell/http-handlers");
const {
  clampThumbMax,
  readOrCreateImageThumb,
  wantsThumbVariant
} = require("./media-thumbs");
const {
  MANIFEST_FILE,
  AREA_MANIFEST_FILE,
  AREA_MANIFEST_CANDIDATES,
  TOPIC_MANIFEST_RE,
  isAreaManifestFileName,
  isTopicManifestFileName,
  isAreaManifestRelPath,
  isManifestMdRelPath,
  isManifestMdAbsolute,
  joinAreaManifestRel,
  getServiceAreaManifestRel,
  SERVICE_AREA_NAME,
  toTopicFileName,
  toAreaFolderName,
  toStorageFolderName,
  stripTopicPrefix,
  getManifestSlugFromRel,
  resolveNodeDisplayName,
  manifestRelToXSidecar,
  parsePartFolderManifestRel,
  resolvePartFolderSidecarBaseRel,
  resolveParentDirectoryFromManifestPath,
  inferManifestRelFromSidecar,
  topicManifestCandidates,
  getNamedStorageBundleRel,
  getNamedStorageBundleDirRel,
  getManifestContainerDirRel,
  getStorageContainerPrefixRel,
  getManifestNamedSlotKey,
  isStorageAssetsInlineSubfolder,
  getNamedStorageSlotDirRel,
  listManifestStorageSlotDirRelCandidates,
  getNamedStorageBundleRelCandidates,
  listBundleFileNameCandidates,
  resolveManifestRelFromStorageBundlePath,
  parseStorageAssetsRef,
  resolveOwningManifestRelFromNodePath,
  listStorageAssetsRefPathCandidates,
  parseStorageSlotInlineRef,
  buildAssetsUploadRef,
  buildAssetsWorkspaceRef,
  normalizeNodeAssetsStorageRef,
  buildStorageLayerRef,
  buildSlotInlineUploadRef,
  parseStorageLayerRef,
  pickManifestRelFromStorageLayerRef,
  normalizeStorageSlotParentRel,
  parseExternalSectionManifestRel,
  normalizeExternalMemoryFileRel,
  BUNDLE_BODY_FILE,
  BUNDLE_CONTENT_FILE,
  BUNDLE_TABULAR_FILE,
  BUNDLE_CONFIG_FILE,
  LEGACY_BUNDLE_CONFIG_FILE,
  BUNDLE_TODO_FILE,
  ROOT_SYSTEM_TODO_FILE,
  ROOT_SYSTEM_NOTE_FILE,
  normalizeSystemFileRequestName,
  PREVIEW_FILE_BASENAME,
  PREVIEW_FILE_NAMES,
  STORAGE_SUBFOLDER_CONTENT,
  STORAGE_SUBFOLDER_MAIN,
  STORAGE_SUBFOLDER_MEMORY,
  LEGACY_STORAGE_SUBFOLDER_MEMORY,
  LEGACY_STORAGE_SUBFOLDER_CONTENT,
  STORAGE_SUBFOLDER_INBOX,
  STORAGE_SUBFOLDER_THREAD,
  STORAGE_SUBFOLDER_QUICK_NOTES,
  STORAGE_SUBFOLDER_NOTE,
  STORAGE_SUBFOLDER_REFERENCES,
  STORAGE_SUBFOLDER_MEDIA,
  STORAGE_SUBFOLDER_ASSETS,
  STORAGE_SUBFOLDER_ATTACHMENTS,
  STORAGE_SUBFOLDER_SCRIPTS,
  STORAGE_SUBFOLDER_ARTEFACTS,
  STORAGE_SUBFOLDER_REPOSITORY,
  STORAGE_SUBFOLDER_PREVIEW,
  STORAGE_SUBFOLDER_HISTORY,
  STORAGE_SUBFOLDER_COMMENTS,
  STORAGE_SUBFOLDER_BY_MODE,
  HISTORY_VERSION_SUFFIX,
  STORAGE_SLOT_LAYER_FOLDERS,
  STORAGE_FILE_READ_SLOT_FOLDERS,
  STORAGE_FILE_WRITE_SLOT_FOLDERS,
  normalizeStorageSubfolderName,
  getStorageSubfolderForMode,
  listStorageSubfolderNameCandidates,
  isAllowedStorageSubfolderName,
  isStorageFileReadSlotName,
  isStorageFileWriteSlotName,
  isStorageFolderName,
  getStorageRootDirRel,
  getStorageFolderRegexAlternation,
  STORAGE_ROOT_FOLDER,
  CONFIGURATION_ROOT_FOLDER,
  isConfigurationFolderName,
  getHistoryRelativeTargetPath,
  getHistoryVersionDirRel,
  getCommentsDirRel,
  ensureExternalMemoryMdRelPath,
  getThreadDirRel,
  buildHistoryVersionFileName,
  buildCommentFileName,
  isHistoryVersionFileName,
  isCommentFileName,
  formatCommentTimestampLabel,
  formatHistoryVersionTimestampLabel,
  normalizeHistoryTargetRelPath,
  normalizeDeclaredManifestTreeType
} = require("./manifest-paths");
const {
  buildDefaultFrontmatter,
  getAwnTypesPayload,
  inferAwnTypeFromPath,
  loadAgentTypes,
  normalizeAwnSchema,
  extractAwnSchemaFromConfig,
  applyAwnSchemaToConfig,
  applyAwnUiToConfig,
  applyAwnSettingsToConfig,
  extractDefaultLandingModeFromNodeConfig,
  getTopicSchemaPayload
} = require("./awn-types-loader");
const {
  getEffectiveSchemaPayloadForContentPath,
  toSectionConfigRelPath,
  listSectionFolderPrefixes,
  isSectionConfigRelPath
} = require("./section-schema");
const {
  getEffectiveTopicSchemaPayload,
  getWorkspaceSchemaPayloadFull,
  writeTopicConfigurationSchema,
  writeWorkspaceConfigurationSchema,
  readWorkspaceLayerAwnSchema,
  readNodeHasOwnSchemaLayer,
  topicSchemaHasFields,
  WORKSPACE_CONFIGURATION_SCHEMA_REL
} = require("./configuration-schema");
const { rewriteAgentMarkdownLinks } = require("./markdown-link-rewriter");
const { buildAgentBrokenLinksReport } = require("./broken-links-scanner");
const { getMergedCatalogsPayload, getCatalogLookupMaps, resolveCatalogPropValue, resolveCatalogTagsList } = require("./catalog-loader");
const {
  migrateDiscoveredTagsToGlobal,
  migrateDiscoveredPresetToGlobal,
  migrateDiscoveredCatalogsToGlobal,
  MIGRATABLE_PRESETS
} = require("./catalog-migration");
const { addCatalogItemForAgentContext } = require("./catalog-items");
const { getPlatformIndexAbsolute } = require("./platform-sources");
const { getComponentsPayload } = require("./components-loader");
const { getTypeCatalogPayload, getViewTypesPayload, getCreateNodeTypesPayload, getTypeDetailByCatalogPath, getTypeHealth, resolveCanonicalTypeId, loadTypeCatalog } = require("./type-catalog-loader");
const {
  AGENT_SYSTEM_REL,
  agentSystemExists,
  buildAgentSystemMenuTree,
  readAgentSystemFile,
  writeAgentSystemFile,
  getAgentSystemStatus
} = require("./agent-system");
const { getCanonicalModelPayload } = require("./awn-canonical-model");
const NodeConfigBundle = require("./node-config-bundle");
const { transliterateToSlug, sanitizeSlugInput } = require(path.join(__dirname, "public", "slug-translit.js"));
const {
  AWN_MASK_FILE_KEY,
  ID_INCREMENT_FILENAME,
  resolveFileMask,
  sanitizeMaskRelativePath,
  displayNameFromMaskPath,
  maskUsesId,
  extractAwnMaskFileValue
} = require(path.join(__dirname, "public", "external-file-mask.js"));

const execFileAsync = promisify(execFile);

let appRoot = __dirname;
let projectRoot = __dirname;
let httpServer = null;
let httpsServer = null;

function getAppRoot() {
  return appRoot;
}

function getProjectRoot() {
  return projectRoot;
}

function getPublicDir() {
  return path.join(appRoot, "public");
}

function getPublicImagesDir() {
  return docsRegistry.getPublicImagesDir();
}

const PUBLIC_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".ico",
  ".heic",
  ".avif"
]);

async function listPublicImages() {
  const imagesDir = getPublicImagesDir();
  let entries;
  try {
    entries = await fs.readdir(imagesDir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => PUBLIC_IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, "ru"))
    .map((name) => ({
      name,
      url: `/api/public/images/file?${new URLSearchParams({ name }).toString()}`
    }));
}

async function readPublicImageFile(name) {
  const safeName = path.basename(String(name || "").trim());
  if (!safeName || safeName !== String(name || "").trim()) {
    return null;
  }
  const ext = path.extname(safeName).toLowerCase();
  if (!PUBLIC_IMAGE_EXTENSIONS.has(ext)) return null;

  const imagesDir = path.resolve(getPublicImagesDir());
  const absolute = path.resolve(imagesDir, safeName);
  if (absolute !== imagesDir && !absolute.startsWith(`${imagesDir}${path.sep}`)) return null;

  try {
    const stat = await fs.stat(absolute);
    if (!stat.isFile()) return null;
    return { absolute, ext };
  } catch {
    return null;
  }
}

function initProjectRoot(root, options = {}) {
  appRoot = path.resolve(options.appRoot || root || __dirname);
  projectRoot = path.resolve(root || appRoot);
  agentRegistry.init(projectRoot);
}

initProjectRoot(__dirname, { appRoot: __dirname });

function getStoragePathOptions() {
  return { workspaceFolderName: path.basename(getAgentRoot()) };
}

function namedStorageBundleDirRel(relPath) {
  return getNamedStorageBundleDirRel(relPath, getStoragePathOptions());
}

function namedStorageBundleRel(relPath, bundleFileName) {
  return getNamedStorageBundleRel(relPath, bundleFileName, getStoragePathOptions());
}

const {
  getAgentRoot,
  resolveAgent,
  getDefaultAgentId,
  getAgentsPublicList,
  saveAgentsRegistry,
  getAgentsGroupsPublic,
  saveAgentsGroups,
  writeGroupBackgroundFile,
  removeGroupBackground,
  readGroupBackgroundFile,
  validateAgentWorkspacePaths,
  discoverAgentManifests,
  createAgentWorkspace,
  getAgentManifestPreviewAbsolute,
  resolveManifestPreviewAbsolute,
  readWorkspaceManifestSync,
  isWorkspaceReginfoAtPath,
  resolveAgentRootAbsolute,
  enrichAgentEntry,
  findAgentWorkspacePreviewAbsoluteSync,
  getOrCreateAgentWorkspacePreviewAbsoluteSync,
  clearAgentWorkspacePreviewImagesSync,
  updateWorkspaceReginfoFields,
  assertSafeAgentPath,
  refreshAgentsFromDisk,
  runWithAgent,
  collectAllFocusEntries,
  collectAgentFocusEntries,
  getActiveAgentId,
  isPlatformAgentId,
  getAgentKitFolder,
  getAgentContainerFolder,
  getAgentSharedFolder,
  isAgentKitFolderEntryName,
  isContainerFolderEntryName,
  isSharedFolderEntryName,
  isReservedAgentRootFolderEntryName,
  createSystemCatalogNodeSync,
  createSystemServiceDocSync,
  findServiceDocScaffold,
  findCatalogScaffold,
  DEFAULT_SERVICE_CATALOG_FOLDER,
  WORKSPACE_TAXONOMY_FOLDER,
  SYSTEM_REFERENCE_SCAFFOLDS,
  isSystemReferenceManifestRel,
  isAwnDependenciesFileName,
  WORKSPACE_AWN_TYPE,
  AWN_DEPENDENCIES_FILE
} = agentRegistry;

const SYSTEM_FILE_NAMES = [
  ".env",
  ".gitignore",
  "AGENTS.md",
  "SKILL.md",
  AWN_DEPENDENCIES_FILE,
  "docker-compose.yml",
  ROOT_SYSTEM_NOTE_FILE,
  "README.md",
  ROOT_SYSTEM_TODO_FILE
];

const CORE_SYSTEM_FILE_NAMES = new Set([
  "AGENTS.md",
  "SKILL.md",
  ROOT_SYSTEM_NOTE_FILE,
  ROOT_SYSTEM_TODO_FILE,
  ".env",
  ".gitignore"
]);

const SYSTEM_FILE_LIST_EXCLUDED_NAMES = new Set([
  ".ds_store",
  "thumbs.db",
  "desktop.ini",
  MANIFEST_FILE.toLowerCase()
]);

const SYSTEM_FILE_CONFIG_BASENAMES = new Set([
  ".env",
  ".gitignore",
  ".dockerignore",
  ".editorconfig",
  ".npmrc",
  ".nvmrc",
  ".prettierrc",
  ".eslintrc",
  "dockerfile",
  "makefile",
  "procfile",
  "awn-dependencies.json",
  "docker-compose.yml",
  "docker-compose.yaml"
]);

const SYSTEM_FILE_CONFIG_EXTENSIONS = new Set([
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".properties",
  ".env"
]);

function isSafeSystemFileBasename(name) {
  const base = String(name || "").trim();
  if (!base || base === "." || base === "..") return false;
  if (base.includes("/") || base.includes("\\") || base.includes("\0")) return false;
  if (path.basename(base) !== base) return false;
  return true;
}

function isCoreSystemFileName(name) {
  return CORE_SYSTEM_FILE_NAMES.has(String(name || "").trim());
}

function resolveSystemFileOpenMode(name, exists) {
  if (isCoreSystemFileName(name)) return "system";
  return exists ? "adopt" : "system";
}

function classifySystemFileGroup(name) {
  const base = String(name || "").trim();
  const lower = base.toLowerCase();
  if (lower.endsWith(".md")) return "md";
  if (SYSTEM_FILE_CONFIG_BASENAMES.has(lower)) return "config";
  if (lower.startsWith(".env.") || lower.startsWith("docker-compose.")) return "config";
  const ext = path.extname(lower);
  if (ext && SYSTEM_FILE_CONFIG_EXTENSIONS.has(ext)) return "config";
  if (lower.startsWith(".") && !lower.includes(".", 1)) return "config";
  return "other";
}

function canonicalSystemFileName(name) {
  const normalized = normalizeSystemFileRequestName(name);
  if (!isSafeSystemFileBasename(normalized)) return null;
  if (SYSTEM_FILE_NAMES.includes(normalized)) return normalized;
  if (isAwnDependenciesFileName(normalized)) return normalized;
  // Any other single-segment root basename (actual root inventory files).
  return normalized;
}

function isAllowedSystemFileName(name) {
  return Boolean(canonicalSystemFileName(name));
}

function resolveSystemFileAbsolute(name) {
  const canonical = canonicalSystemFileName(name);
  if (!canonical) return null;
  const agentRoot = getAgentRoot();
  const absolute = path.join(agentRoot, canonical);
  if (!absolute.startsWith(agentRoot)) return null;
  return absolute;
}

function buildSystemFileListEntry(meta, { scaffold = false } = {}) {
  const name = meta?.name || "";
  const exists = Boolean(meta?.exists);
  return {
    name,
    exists,
    empty: Boolean(meta?.empty ?? !exists),
    group: classifySystemFileGroup(name),
    openMode: resolveSystemFileOpenMode(name, exists),
    scaffold: Boolean(scaffold)
  };
}

async function listAgentRootSystemFiles() {
  const byName = new Map();

  for (const name of SYSTEM_FILE_NAMES) {
    const meta = await getSystemFileMeta(name);
    const entry = buildSystemFileListEntry(meta, { scaffold: true });
    byName.set(String(entry.name).toLowerCase(), entry);
  }

  const agentRoot = getAgentRoot();
  let entries = [];
  try {
    entries = await fs.readdir(agentRoot, { withFileTypes: true });
  } catch {
    entries = [];
  }

  for (const entry of entries) {
    if (!entry?.isFile?.()) continue;
    const name = String(entry.name || "").trim();
    if (!isSafeSystemFileBasename(name)) continue;
    if (SYSTEM_FILE_LIST_EXCLUDED_NAMES.has(name.toLowerCase())) continue;
    const key = name.toLowerCase();
    if (byName.has(key)) continue;
    const meta = await getSystemFileMeta(name);
    if (!meta.exists) continue;
    byName.set(key, buildSystemFileListEntry(meta, { scaffold: false }));
  }

  return [...byName.values()].sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "en")
  );
}

async function resolveExistingSystemFileAbsolute(name) {
  const canonical = canonicalSystemFileName(name);
  if (!canonical) return null;
  const agentRoot = getAgentRoot();
  const candidates =
    canonical === ROOT_SYSTEM_TODO_FILE
      ? [ROOT_SYSTEM_TODO_FILE, "todo.md"]
      : canonical === ROOT_SYSTEM_NOTE_FILE
        ? [ROOT_SYSTEM_NOTE_FILE, "note.md", "notes.md"]
        : [canonical];
  for (const candidate of candidates) {
    const absolute = path.join(agentRoot, candidate);
    if (!absolute.startsWith(agentRoot)) continue;
    if (await fileExists(absolute)) return absolute;
  }
  return path.join(agentRoot, canonical);
}

async function getSystemFileMeta(name) {
  const canonical = canonicalSystemFileName(name);
  if (!canonical) return { name: normalizeSystemFileRequestName(name), exists: false, empty: true };

  const absolute = await resolveExistingSystemFileAbsolute(canonical);
  const exists = await fileExists(absolute);
  if (!exists) return { name: canonical, exists: false, empty: true };

  try {
    const content = await fs.readFile(absolute, "utf-8");
    return { name: canonical, exists: true, empty: content.trim().length === 0 };
  } catch {
    return { name: canonical, exists: false, empty: true };
  }
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".heic": "image/heic",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".webm": "video/webm",
  ".m4v": "video/x-m4v",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".aac": "audio/aac",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain; charset=utf-8",
  ".zip": "application/zip",
  ".rar": "application/vnd.rar",
  ".7z": "application/x-7z-compressed",
  ".tar": "application/x-tar",
  ".gz": "application/gzip"
};

async function sendImageFileResponse(res, fileAbsolute, options = {}) {
  const stat = await fs.stat(fileAbsolute);
  if (!stat.isFile()) return false;

  if (options.thumb) {
    const thumbRoot = options.thumbCacheRoot || getAgentRoot();
    const thumb = await readOrCreateImageThumb(fileAbsolute, thumbRoot, options.thumbMax);
    if (thumb) {
      res.writeHead(200, {
        "Content-Type": thumb.contentType,
        "Cache-Control": "public, max-age=31536000, immutable"
      });
      res.end(thumb.buffer);
      return true;
    }
  }

  const content = await fs.readFile(fileAbsolute);
  const ext = path.extname(fileAbsolute).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": options.cacheControl || "no-store"
  });
  res.end(content);
  return true;
}

const PREVIEW_FILE_NAME_SET = new Set(PREVIEW_FILE_NAMES);
const NODE_PREVIEW_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif"];
const APP_LOCK_LOGIN_KEY = "APP_LOCK_LOGIN";
const APP_LOCK_PASSWORD_KEY = "APP_LOCK_PASSWORD";

function parseRootEnvFileContent(content) {
  const result = {};
  for (const line of String(content || "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

async function readRootEnvFile() {
  const envPath = path.join(getProjectRoot(), ".env");
  try {
    const content = await fs.readFile(envPath, "utf-8");
    return parseRootEnvFileContent(content);
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

async function getAppLockStatus() {
  const env = await readRootEnvFile();
  const login = String(env[APP_LOCK_LOGIN_KEY] || "").trim();
  const password = String(env[APP_LOCK_PASSWORD_KEY] || "").trim();
  const configured = Boolean(login && password);
  return {
    enabled: configured,
    needsSetup: !configured
  };
}

async function verifyAppLockCredentials(login, password) {
  const env = await readRootEnvFile();
  const expectedLogin = String(env[APP_LOCK_LOGIN_KEY] || "").trim();
  const expectedPassword = String(env[APP_LOCK_PASSWORD_KEY] || "").trim();
  if (!expectedLogin || !expectedPassword) return false;
  return String(login || "").trim() === expectedLogin && String(password || "") === expectedPassword;
}

function formatRootEnvValue(value) {
  const text = String(value ?? "");
  if (/[\s#"'=]/.test(text)) {
    return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return text;
}

async function writeRootEnvValues(updates) {
  const envPath = path.join(getProjectRoot(), ".env");
  let lines = [];
  try {
    const content = await fs.readFile(envPath, "utf-8");
    lines = content.split("\n");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const keysToUpdate = new Set(Object.keys(updates));
  const updatedKeys = new Set();
  const outLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      outLines.push(line);
      continue;
    }
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) {
      outLines.push(line);
      continue;
    }
    const key = trimmed.slice(0, eqIndex).trim();
    if (keysToUpdate.has(key)) {
      outLines.push(`${key}=${formatRootEnvValue(updates[key])}`);
      updatedKeys.add(key);
    } else {
      outLines.push(line);
    }
  }

  for (const key of keysToUpdate) {
    if (!updatedKeys.has(key)) {
      outLines.push(`${key}=${formatRootEnvValue(updates[key])}`);
    }
  }

  const body = outLines.join("\n").replace(/\n*$/, "\n");
  await fs.writeFile(envPath, body, "utf-8");
}

async function saveAppLockCredentials(login, password) {
  await writeRootEnvValues({
    [APP_LOCK_LOGIN_KEY]: String(login || "").trim(),
    [APP_LOCK_PASSWORD_KEY]: String(password || "")
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

const WORKSPACE_ACTIVITY_DIR = ".agent-cms";
const WORKSPACE_ACTIVITY_FILE = "activity.jsonl";
const WORKSPACE_ACTIVITY_ARCHIVE_FILE = "activity-archive.jsonl";
const WORKSPACE_ACTIVITY_MEMORY_LIMIT = 250;
const WORKSPACE_ACTIVITY_FILE_LINE_LIMIT = 5000;
const WORKSPACE_ACTIVITY_FILE_TRIM_TO = 3000;
const WORKSPACE_ACTIVITY_LOAD_LIMIT = 100;
const WORKSPACE_ACTIVITY_FILE_MAX_BYTES = 4 * 1024 * 1024;
const workspaceActivityStorage = new AsyncLocalStorage();
const workspaceActivityByAgentRoot = new Map();
const workspaceActivityLoadPromises = new Map();

function getWorkspaceActivityArchiveFileAbsolute(agentRoot = getAgentRoot()) {
  if (!agentRoot) return null;
  const absolute = path.join(agentRoot, WORKSPACE_ACTIVITY_DIR, WORKSPACE_ACTIVITY_ARCHIVE_FILE);
  if (!absolute.startsWith(agentRoot)) return null;
  return absolute;
}

function getWorkspaceActivityFileAbsolute(agentRoot = getAgentRoot()) {
  if (!agentRoot) return null;
  const absolute = path.join(agentRoot, WORKSPACE_ACTIVITY_DIR, WORKSPACE_ACTIVITY_FILE);
  if (!absolute.startsWith(agentRoot)) return null;
  return absolute;
}

function getWorkspaceActivityStore(agentRoot = getAgentRoot()) {
  if (!agentRoot) return null;
  let store = workspaceActivityByAgentRoot.get(agentRoot);
  if (!store) {
    store = {
      seq: 0,
      events: [],
      fileLines: 0,
      fileTruncated: false,
      loaded: false,
      recordQueue: Promise.resolve(),
      writeQueue: Promise.resolve()
    };
    workspaceActivityByAgentRoot.set(agentRoot, store);
  }
  return store;
}

function parseWorkspaceActivityLine(line) {
  try {
    const event = JSON.parse(line);
    if (!event || typeof event !== "object") return null;
    const id = Number(event.id);
    if (!Number.isFinite(id) || id <= 0) return null;
    return {
      id,
      action: String(event.action || "update"),
      path: String(event.path || "").replace(/\\/g, "/"),
      manifestPath: event.manifestPath ? String(event.manifestPath).replace(/\\/g, "/") : null,
      label: event.label ? String(event.label) : null,
      topicName: event.topicName ? String(event.topicName) : null,
      recordName: event.recordName ? String(event.recordName) : null,
      message: event.message ? String(event.message) : null,
      fileKind: event.fileKind ? String(event.fileKind) : null,
      source: event.source ? String(event.source) : "system",
      route: event.route ? String(event.route) : null,
      at: event.at ? String(event.at) : new Date().toISOString()
    };
  } catch {
    return null;
  }
}

async function readAwnNameFromWorkspaceRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").trim();
  if (!normalized) return null;
  try {
    const resolved = await resolveExistingWorkspaceRelPath(normalized);
    const absolute = normalizeWorkspacePath(resolved || normalized);
    if (!absolute) return null;
    const raw = await fs.readFile(absolute, "utf-8");
    const { frontmatter } = splitNodeFrontmatter(raw);
    const name = getYamlScalar(frontmatter, "awn-name");
    return name ? String(name).trim() : null;
  } catch {
    return null;
  }
}

function isStorageLayerActivityPath(relPath) {
  return /(?:^|\/)awn-storage\//i.test(String(relPath || "").replace(/\\/g, "/"));
}

function isTopicManifestActivityPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").trim();
  if (!/manifest\.md$|_registration\.md$/i.test(normalized)) return false;
  return !isStorageLayerActivityPath(normalized);
}

function resolveStorageSectionManifestRelFromActivityPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").trim();
  if (!isStorageLayerActivityPath(normalized)) return null;
  if (/\/manifest\.md$/i.test(normalized)) return normalized;
  const sectionManifest = normalized.replace(/\/(?:config|configuration)\.yml$/i, "/manifest.md");
  if (sectionManifest !== normalized && /\/manifest\.md$/i.test(sectionManifest)) {
    return sectionManifest;
  }
  return null;
}

async function resolveWorkspaceActivityDisplayNames({ pathValue, manifestPath, label }) {
  const normalizedPath = String(pathValue || "").replace(/\\/g, "/").trim();
  let manifestRel = manifestPath ? String(manifestPath).replace(/\\/g, "/").trim() : "";
  if (!manifestRel && normalizedPath) {
    manifestRel = resolveOwningManifestRelFromNodePath(normalizedPath);
  }

  let topicName = null;
  let recordName = null;
  const labelValue = label ? String(label).trim() : "";

  const isTopicManifest = isTopicManifestActivityPath(normalizedPath);
  const sectionManifestRel = resolveStorageSectionManifestRelFromActivityPath(normalizedPath);
  const isRecordMd =
    normalizedPath &&
    /\.md$/i.test(normalizedPath) &&
    !isTopicManifest &&
    !sectionManifestRel;

  if (manifestRel && isTopicManifestActivityPath(manifestRel)) {
    topicName = await readAwnNameFromWorkspaceRel(manifestRel);
  }
  if (isTopicManifest) {
    topicName = topicName || (await readAwnNameFromWorkspaceRel(normalizedPath));
  }
  if (sectionManifestRel) {
    recordName = await readAwnNameFromWorkspaceRel(sectionManifestRel);
  }
  if (isRecordMd) {
    recordName = await readAwnNameFromWorkspaceRel(normalizedPath);
  }

  let displayName = recordName;
  if (!displayName && !isTopicManifest) {
    displayName = labelValue || path.posix.basename(normalizedPath) || null;
  }
  if (!displayName) {
    displayName = topicName;
  }

  return { topicName, recordName, displayName };
}

async function archiveWorkspaceActivityLines(agentRoot, lines) {
  const archiveAbsolute = getWorkspaceActivityArchiveFileAbsolute(agentRoot);
  if (!archiveAbsolute || !lines.length) return;
  await fs.mkdir(path.dirname(archiveAbsolute), { recursive: true });
  await fs.appendFile(archiveAbsolute, `${lines.join("\n")}\n`, "utf-8");
}

async function trimWorkspaceActivityFile(agentRoot) {
  const fileAbsolute = getWorkspaceActivityFileAbsolute(agentRoot);
  const store = getWorkspaceActivityStore(agentRoot);
  if (!fileAbsolute || !store) return;

  store.writeQueue = store.writeQueue.then(async () => {
    let raw = "";
    try {
      raw = await fs.readFile(fileAbsolute, "utf-8");
    } catch (error) {
      if (error && error.code === "ENOENT") return;
      throw error;
    }
    const lines = raw.split("\n").filter(Boolean);
    store.fileLines = lines.length;
    const stat = await fs.stat(fileAbsolute).catch(() => null);
    const overBytes = stat && stat.size > WORKSPACE_ACTIVITY_FILE_MAX_BYTES;
    const overLines = lines.length > WORKSPACE_ACTIVITY_FILE_LINE_LIMIT;
    if (!overBytes && !overLines) return;

    const keepCount = overBytes
      ? Math.min(WORKSPACE_ACTIVITY_FILE_TRIM_TO, lines.length)
      : WORKSPACE_ACTIVITY_FILE_TRIM_TO;
    if (lines.length <= keepCount) return;

    const dropped = lines.slice(0, lines.length - keepCount);
    const kept = lines.slice(-keepCount);
    await archiveWorkspaceActivityLines(agentRoot, dropped);
    await fs.writeFile(fileAbsolute, `${kept.join("\n")}\n`, "utf-8");
    store.fileLines = kept.length;
    store.fileTruncated = true;
  });

  await store.writeQueue;
}

async function maybeTrimWorkspaceActivityFile(agentRoot) {
  const fileAbsolute = getWorkspaceActivityFileAbsolute(agentRoot);
  const store = getWorkspaceActivityStore(agentRoot);
  if (!fileAbsolute || !store) return;
  if (store.fileLines > WORKSPACE_ACTIVITY_FILE_LINE_LIMIT) {
    await trimWorkspaceActivityFile(agentRoot);
    return;
  }
  const stat = await fs.stat(fileAbsolute).catch(() => null);
  if (stat && stat.size > WORKSPACE_ACTIVITY_FILE_MAX_BYTES) {
    await trimWorkspaceActivityFile(agentRoot);
  }
}

async function loadWorkspaceActivityFromFile(agentRoot) {
  const store = getWorkspaceActivityStore(agentRoot);
  const fileAbsolute = getWorkspaceActivityFileAbsolute(agentRoot);
  if (!store || !fileAbsolute) return;

  store.loaded = true;
  store.events = [];
  store.seq = 0;
  store.fileLines = 0;
  store.fileTruncated = false;

  let raw = "";
  try {
    raw = await fs.readFile(fileAbsolute, "utf-8");
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }

  const lines = raw.split("\n").filter(Boolean);
  store.fileLines = lines.length;
  store.fileTruncated = lines.length > WORKSPACE_ACTIVITY_LOAD_LIMIT;

  const parsed = [];
  for (const line of lines) {
    const event = parseWorkspaceActivityLine(line);
    if (event) parsed.push(event);
  }
  parsed.sort((a, b) => a.id - b.id);
  const tail = parsed.slice(-WORKSPACE_ACTIVITY_LOAD_LIMIT);
  store.seq = tail.length ? tail[tail.length - 1].id : 0;
  store.events = tail.slice().reverse();
}

async function ensureWorkspaceActivityLoaded(agentRoot = getAgentRoot()) {
  const store = getWorkspaceActivityStore(agentRoot);
  if (!store || store.loaded) return;
  if (!workspaceActivityLoadPromises.has(agentRoot)) {
    workspaceActivityLoadPromises.set(
      agentRoot,
      loadWorkspaceActivityFromFile(agentRoot).finally(() => {
        workspaceActivityLoadPromises.delete(agentRoot);
      })
    );
  }
  await workspaceActivityLoadPromises.get(agentRoot);
}

function queueWorkspaceActivityFileAppend(agentRoot, event) {
  const store = getWorkspaceActivityStore(agentRoot);
  const fileAbsolute = getWorkspaceActivityFileAbsolute(agentRoot);
  if (!store || !fileAbsolute) return;

  const line = `${JSON.stringify(event)}\n`;
  store.writeQueue = store.writeQueue
    .then(async () => {
      await fs.mkdir(path.dirname(fileAbsolute), { recursive: true });
      await fs.appendFile(fileAbsolute, line, "utf-8");
      store.fileLines += 1;
      await maybeTrimWorkspaceActivityFile(agentRoot);
    })
    .catch(() => {});
}

async function recordWorkspaceActivityAsync({
  action,
  path: relPath,
  label = null,
  message = null,
  fileKind = null,
  manifestPath = null,
  source = null,
  route = null
} = {}) {
  const agentRoot = getAgentRoot();
  const actionName = String(action || "").trim();
  const normalizedPath = String(relPath || "").replace(/\\/g, "/").trim();
  const isNotify = actionName === "notify";
  if (!agentRoot || !actionName) return null;
  if (!isNotify && !normalizedPath) return null;

  const store = getWorkspaceActivityStore(agentRoot);
  if (!store) return null;

  store.recordQueue = store.recordQueue.then(async () => {
    await ensureWorkspaceActivityLoaded(agentRoot);
    const ctx = getWorkspaceActivityContext();
    const pathValue = normalizedPath || `${WORKSPACE_ACTIVITY_DIR}/notification`;
    const labelValue =
      label ||
      (isNotify ? "Уведомление" : path.posix.basename(pathValue) || pathValue);
    const names = await resolveWorkspaceActivityDisplayNames({
      pathValue,
      manifestPath,
      label: labelValue
    });
    store.seq += 1;
    const event = {
      id: store.seq,
      action: actionName,
      path: pathValue,
      manifestPath: manifestPath ? String(manifestPath).replace(/\\/g, "/") : null,
      label: names.displayName || labelValue,
      topicName: names.topicName,
      recordName: names.recordName,
      message: message ? String(message) : null,
      fileKind: fileKind || (isNotify ? "notification" : inferWorkspaceActivityFileKind(pathValue)),
      source: source || ctx?.source || "system",
      route: route || ctx?.route || null,
      at: new Date().toISOString()
    };
    store.events.unshift(event);
    if (store.events.length > WORKSPACE_ACTIVITY_MEMORY_LIMIT) {
      store.events.length = WORKSPACE_ACTIVITY_MEMORY_LIMIT;
    }
    queueWorkspaceActivityFileAppend(agentRoot, event);
    return event;
  });

  return store.recordQueue;
}

function pushWorkspaceActivityContext(req, url) {
  return {
    source: inferWorkspaceActivitySource(req),
    route: `${req.method} ${url.pathname}`,
    pathname: url.pathname,
    method: req.method
  };
}

function popWorkspaceActivityContext() {
  // kept for compatibility with older call sites; AsyncLocalStorage scopes the context
}

function getWorkspaceActivityContext() {
  return workspaceActivityStorage.getStore() || null;
}

function inferWorkspaceActivitySource(req) {
  const explicit = String(req.headers["x-activity-source"] || "").trim().toLowerCase();
  if (explicit) return explicit;
  const ua = String(req.headers["user-agent"] || "").toLowerCase();
  if (ua.includes("mozilla") || ua.includes("chrome") || ua.includes("safari") || ua.includes("firefox")) {
    return "ui";
  }
  if (ua.includes("node") || ua.includes("undici")) return "mcp";
  return "api";
}

function inferWorkspaceActivityFileKind(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").toLowerCase();
  if (!normalized) return "other";
  if (normalized.endsWith("/manifest.md") || normalized.endsWith("_registration.md")) return "manifest";
  if (normalized.endsWith("/main.md") || normalized.includes("/main/")) return "memory";
  if (normalized.endsWith("/todo.md")) return "todo";
  if (normalized.endsWith("/schema.yml") || normalized.endsWith("schema.yml")) return "schema";
  if (normalized.endsWith("/config.yml") || normalized.endsWith("configuration.yml")) return "schema";
  if (normalized.endsWith("configuration.yml")) return "config";
  if (normalized.endsWith("/.env")) return "env";
  if (normalized.includes("/content/")) return "content";
  if (normalized.includes("/media/")) return "media";
  if (normalized.includes("/assets/")) return "assets";
  if (normalized.endsWith(".md")) return "content";
  return "other";
}

function recordWorkspaceActivity(params = {}) {
  void recordWorkspaceActivityAsync(params);
  return null;
}

function getWorkspaceActivitySeq(agentRoot = getAgentRoot()) {
  const store = getWorkspaceActivityStore(agentRoot);
  return store?.seq || 0;
}

async function listWorkspaceActivityEvents({ since = 0, limit = 50 } = {}) {
  const agentRoot = getAgentRoot();
  await ensureWorkspaceActivityLoaded(agentRoot);
  const store = getWorkspaceActivityStore(agentRoot);
  const sinceId = Number(since) || 0;
  const cappedLimit = Math.max(1, Math.min(100, Number(limit) || 50));
  const eventsSource = store?.events || [];
  const events =
    sinceId > 0
      ? eventsSource.filter((event) => event.id > sinceId)
      : eventsSource.slice(0, cappedLimit);
  return {
    events: sinceId > 0 ? events.slice(0, cappedLimit) : events,
    latestId: store?.seq || 0,
    total: eventsSource.length,
    fileLines: store?.fileLines || 0,
    truncated: Boolean(store?.fileTruncated || (store?.fileLines || 0) > eventsSource.length),
    limits: {
      memory: WORKSPACE_ACTIVITY_MEMORY_LIMIT,
      file: WORKSPACE_ACTIVITY_FILE_LINE_LIMIT,
      fileMaxBytes: WORKSPACE_ACTIVITY_FILE_MAX_BYTES,
      archiveFile: `${WORKSPACE_ACTIVITY_DIR}/${WORKSPACE_ACTIVITY_ARCHIVE_FILE}`,
      api: 100
    }
  };
}

async function clearWorkspaceActivity(agentRoot = getAgentRoot()) {
  await ensureWorkspaceActivityLoaded(agentRoot);
  const store = getWorkspaceActivityStore(agentRoot);
  const fileAbsolute = getWorkspaceActivityFileAbsolute(agentRoot);
  if (!store || !fileAbsolute) return { cleared: 0, latestId: 0 };

  let lines = [];
  try {
    const raw = await fs.readFile(fileAbsolute, "utf-8");
    lines = raw.split("\n").filter(Boolean);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      store.events = [];
      store.seq = 0;
      store.fileLines = 0;
      store.fileTruncated = false;
      return { cleared: 0, latestId: 0 };
    }
    throw error;
  }

  if (lines.length) {
    await archiveWorkspaceActivityLines(agentRoot, lines);
    await fs.writeFile(fileAbsolute, "", "utf-8");
  }

  store.events = [];
  store.seq = 0;
  store.fileLines = 0;
  store.fileTruncated = false;
  return { cleared: lines.length, latestId: 0 };
}

function recordWorkspaceNodeCreateFromResponse(createdPath) {
  const normalized = String(createdPath || "").replace(/\\/g, "/").trim();
  if (!normalized) return null;
  return recordWorkspaceActivity({
    action: "create",
    path: normalized,
    label: path.posix.basename(path.dirname(normalized)) || normalized,
    fileKind: "manifest"
  });
}

async function withWorkspaceActivityContext(req, url, fn) {
  const context = pushWorkspaceActivityContext(req, url);
  return workspaceActivityStorage.run(context, () => fn());
}

async function readJsonBody(req, maxSize = 1_000_000) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString("utf-8");
      if (body.length > maxSize) {
        reject(new Error("Request body is too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON payload"));
      }
    });
    req.on("error", (error) => reject(error));
  });
}

function normalizeWorkspacePath(inputPath) {
  const raw = String(inputPath ?? "").trim();
  if (!raw || raw === ".") return null;
  const agentRoot = getAgentRoot();
  const safe = path.normalize(raw).replace(/^(\.\.[\/\\])+/, "");
  if (!safe || safe === ".") return null;
  const absolute = path.join(agentRoot, safe);
  if (!absolute.startsWith(agentRoot)) {
    return null;
  }
  return absolute;
}

/** Манифест *.md / _registration.md из прямого пути или bundle (todo, content, …). */
function resolveNodeManifestRelForScopedApi(relPath) {
  const normalized = String(relPath || "").trim().replace(/\\/g, "/");
  if (!normalized) return null;

  const directAbsolute = normalizeWorkspacePath(normalized);
  if (directAbsolute && isManifestMdAbsolute(directAbsolute)) {
    return normalized;
  }

  const inferred = inferManifestRelFromSidecar(normalized);
  if (inferred) {
    const inferredAbsolute = normalizeWorkspacePath(inferred);
    if (inferredAbsolute && isManifestMdAbsolute(inferredAbsolute)) {
      return inferred;
    }
  }

  return null;
}

function toNodeFileName(rawName) {
  return toTopicFileName(rawName);
}

function toFolderName(rawName) {
  return toAreaFolderName(rawName);
}

function resolveNodeDiskSlugFromPayload(payload = {}) {
  const displayName = String(payload.displayName || "").trim();
  const slug = sanitizeSlugInput(payload.slug);
  const legacyName = String(payload.name || "").trim();
  const display = displayName || legacyName;
  const raw = slug || transliterateToSlug(display || legacyName) || legacyName;
  return sanitizeSlugInput(raw) || transliterateToSlug(display) || legacyName;
}

function resolveContentItemNames(payload = {}) {
  const displayName = String(payload.displayName || payload.title || payload.name || "").trim();
  const slug = sanitizeSlugInput(payload.slug);
  const legacy = String(payload.title || payload.name || "").trim();
  const display = displayName || legacy;
  const diskSlug =
    slug || sanitizeSlugInput(transliterateToSlug(display)) || sanitizeSlugInput(legacy) || "";
  return { display, diskSlug };
}

function resolveNodeCreateNames(payload = {}) {
  const explicitDisplay = String(payload.displayName || payload.title || "").trim();
  const { display, diskSlug } = resolveContentItemNames(payload);
  const folderSlug =
    sanitizeSlugInput(payload.slug) ||
    diskSlug ||
    sanitizeSlugInput(transliterateToSlug(explicitDisplay || display)) ||
    sanitizeSlugInput(String(payload.name || "").trim()) ||
    "";
  const displayName =
    explicitDisplay ||
    (display && display !== folderSlug ? display : "") ||
    display ||
    stripTopicPrefix(folderSlug) ||
    "";
  return { displayName, folderSlug };
}

function hasNodeCreateIdentity(payload = {}, type = "") {
  if (type === "manifest" || type === "topic-manifest") {
    return Boolean(
      String(payload.name || "").trim() ||
        String(payload.displayName || payload.title || "").trim() ||
        sanitizeSlugInput(payload.slug)
    );
  }
  const { displayName, folderSlug } = resolveNodeCreateNames(payload);
  return Boolean(displayName || folderSlug);
}

function buildManifestCreateFrontmatter(nodeKind, displayName, folderSlug, options = {}) {
  const typeName =
    options.awnType || (nodeKind === "topic" ? "topic" : nodeKind === "area" ? "area" : String(nodeKind || "topic"));
  const title =
    String(displayName || "").trim() ||
    stripTopicPrefix(String(folderSlug || "").trim()) ||
    (nodeKind === "topic" ? "Тема" : "Область");
  let frontmatter = buildDefaultFrontmatter(typeName, {
    name: title,
    agentRoot: getAgentRoot(),
    projectRoot: getProjectRoot()
  });
  return upsertYamlScalarLine(frontmatter, "awn-name", title);
}

function normalizeAwnNameForStorage(displayName, slug) {
  const trimmed = String(displayName || "").trim();
  if (!trimmed) return "";
  if (trimmed === String(slug || "").trim()) return "";
  return trimmed;
}

function shouldSyncAwnNameOnTitleRename(payload, display, diskSlug) {
  if (Object.prototype.hasOwnProperty.call(payload, "displayName")) return true;
  const title = String(payload.title || "").trim();
  if (!title) return false;
  const slugLikeTitle = sanitizeSlugInput(title);
  if (slugLikeTitle && slugLikeTitle === String(diskSlug || "").trim()) return false;
  return transliterateToSlug(title) !== title || Boolean(display && display !== diskSlug);
}

function removeYamlScalarLine(frontmatter, key) {
  const pattern = new RegExp(`^${String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:.*\\n?`, "m");
  return String(frontmatter || "")
    .replace(pattern, "")
    .trim();
}

function applyAwnNameToFrontmatter(frontmatter, displayName, slug) {
  const awnName = normalizeAwnNameForStorage(displayName, slug);
  if (!awnName) return removeYamlScalarLine(frontmatter, "awn-name");
  return upsertYamlScalarLine(frontmatter, "awn-name", awnName);
}

function formatYamlScalarForFrontmatter(value) {
  const text = String(value ?? "");
  if (!text || /[:#\[\]{}&,*?"']|^\s|\s$/.test(text)) {
    return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return text;
}

function toContentFilePath(relNodePath) {
  const partBase = resolvePartFolderSidecarBaseRel(relNodePath);
  if (partBase) return `${partBase}.main.md`;
  return namedStorageBundleRel(relNodePath, BUNDLE_CONTENT_FILE);
}

function toTabularFilePath(relNodePath) {
  const partBase = resolvePartFolderSidecarBaseRel(relNodePath);
  if (partBase) return `${partBase}.main.csv`;
  return namedStorageBundleRel(relNodePath, BUNDLE_TABULAR_FILE);
}

function toNodeConfigFilePath(relNodePath) {
  const partBase = resolvePartFolderSidecarBaseRel(relNodePath);
  if (partBase) return `${partBase}.configuration.yml`;
  return namedStorageBundleRel(relNodePath, BUNDLE_CONFIG_FILE);
}

async function readNodeConfigFile(relNodePath) {
  const resolvedRelPath = await resolveExistingWorkspaceRelPath(relNodePath);
  const configRelPath = toNodeConfigFilePath(resolvedRelPath);
  const configAbsolute = normalizeWorkspacePath(configRelPath);
  if (!configAbsolute) {
    return { path: configRelPath, content: "", exists: false };
  }

  try {
    const content = await fs.readFile(configAbsolute, "utf-8");
    return { path: configRelPath, content, exists: true };
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }

  return { path: configRelPath, content: "", exists: false };
}

function extractAwnMaskFileFromNodeConfigContent(content) {
  const bundle = NodeConfigBundle.parseNodeConfigBundle(content || "");
  return extractAwnMaskFileValue(bundle.awn_settings);
}

function normalizeStorageRecordFields(rawFields) {
  if (!rawFields || typeof rawFields !== "object" || Array.isArray(rawFields)) return null;
  const normalized = {};
  for (const [key, value] of Object.entries(rawFields)) {
    const safeKey = String(key || "").trim();
    if (!safeKey || value === null || value === undefined) continue;
    normalized[safeKey] = value;
  }
  return Object.keys(normalized).length ? normalized : null;
}

async function resolveExternalFileMaskForManifest(manifestRelPath, explicitMask = "") {
  const trimmed = String(explicitMask || "").trim();
  if (trimmed) return trimmed;
  const configFile = await readNodeConfigFile(manifestRelPath);
  return extractAwnMaskFileFromNodeConfigContent(configFile.content || "");
}


function toTodoFilePath(relNodePath) {
  const partBase = resolvePartFolderSidecarBaseRel(relNodePath);
  if (partBase) return `${partBase}.todo.md`;
  return namedStorageBundleRel(relNodePath, BUNDLE_TODO_FILE);
}

async function writeTodoFiles(relNodePath, content) {
  const resolvedRelPath = await resolveExistingWorkspaceRelPath(relNodePath);
  const bundleRelPath = toTodoFilePath(resolvedRelPath);
  await writeWorkspaceTextFileWithHistory(resolvedRelPath, bundleRelPath, content);
  return bundleRelPath;
}

const MAX_FILE_HISTORY_VERSIONS = 50;

async function readWorkspaceTextFileIfExists(targetRelPath) {
  const absolute = normalizeWorkspacePath(targetRelPath);
  if (!absolute) return { content: "", exists: false, absolute: null };
  try {
    const content = await fs.readFile(absolute, "utf-8");
    return { content, exists: true, absolute };
  } catch (error) {
    if (error && error.code === "ENOENT") return { content: "", exists: false, absolute };
    throw error;
  }
}

async function pruneFileHistoryVersions(historyDirAbsolute, maxVersions = MAX_FILE_HISTORY_VERSIONS) {
  let entries;
  try {
    entries = await fs.readdir(historyDirAbsolute, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }
  const files = entries
    .filter((entry) => entry.isFile() && isHistoryVersionFileName(entry.name))
    .map((entry) => entry.name)
    .sort();
  const excess = files.length - maxVersions;
  if (excess <= 0) return;
  for (let index = 0; index < excess; index += 1) {
    await fs.unlink(path.join(historyDirAbsolute, files[index])).catch(() => {});
  }
}

async function snapshotFileHistoryBeforeWrite({ manifestRelPath, targetRelPath, nextContent }) {
  const normalizedTarget = normalizeHistoryTargetRelPath(targetRelPath);
  const normalizedManifest = String(manifestRelPath || "").replace(/\\/g, "/").trim();
  if (!normalizedManifest || !normalizedTarget) return null;

  const { content: previousContent, exists } = await readWorkspaceTextFileIfExists(normalizedTarget);
  if (!exists || previousContent === nextContent) return null;

  const historyDirRel = getHistoryVersionDirRel(normalizedManifest, normalizedTarget);
  const historyDirAbsolute = normalizeWorkspacePath(historyDirRel);
  if (!historyDirAbsolute) return null;

  const versionFileName = buildHistoryVersionFileName();
  const versionRelPath = `${historyDirRel}/${versionFileName}`.replace(/\\/g, "/");
  const versionAbsolute = normalizeWorkspacePath(versionRelPath);
  if (!versionAbsolute) return null;

  await fs.mkdir(historyDirAbsolute, { recursive: true });
  await fs.writeFile(versionAbsolute, previousContent, "utf-8");
  await pruneFileHistoryVersions(historyDirAbsolute);
  return versionRelPath;
}

async function writeWorkspaceTextFileWithHistory(manifestRelPath, targetRelPath, content) {
  const normalizedTarget = normalizeHistoryTargetRelPath(targetRelPath);
  const targetAbsolute = normalizeWorkspacePath(normalizedTarget);
  if (!targetAbsolute) throw new Error("Invalid target path");
  const existed = await fs.stat(targetAbsolute).catch(() => null);
  await snapshotFileHistoryBeforeWrite({
    manifestRelPath,
    targetRelPath: normalizedTarget,
    nextContent: content
  });
  await fs.mkdir(path.dirname(targetAbsolute), { recursive: true });
  await fs.writeFile(targetAbsolute, content, "utf-8");
  recordWorkspaceActivity({
    action: existed ? "update" : "create",
    path: normalizedTarget,
    manifestPath: manifestRelPath,
    label: path.posix.basename(normalizedTarget)
  });
  return normalizedTarget;
}

function resolveSystemFileHistoryManifestRel() {
  return MANIFEST_FILE;
}

function resolveSystemFileHistoryTargetRel(systemName) {
  const canonical = canonicalSystemFileName(systemName);
  if (!canonical) return null;
  const absolute = resolveSystemFileAbsolute(canonical);
  if (!absolute) return null;
  return normalizeHistoryTargetRelPath(manifestRelFromNodeAbsolute(absolute));
}

function getSystemFileHistoryManifestCandidates(primaryManifestRel = resolveSystemFileHistoryManifestRel()) {
  const kitManifest = getServiceAreaManifestRel(getAgentKitFolder());
  return [...new Set([primaryManifestRel, kitManifest].filter(Boolean))];
}

async function readHistoryVersionFileWithManifestFallbacks({
  manifestRelPath,
  targetRelPath,
  version,
  manifestFallbacks = []
}) {
  for (const manifest of [...new Set([manifestRelPath, ...manifestFallbacks].filter(Boolean))]) {
    const result = await readHistoryVersionFile({ manifestRelPath: manifest, targetRelPath, version });
    if (result) return result;
  }
  return null;
}

async function resolveHistoryManifestRel({ manifestRelPath, mode, systemName }) {
  if (mode === "system") {
    return resolveSystemFileHistoryManifestRel();
  }
  if (!manifestRelPath) return null;
  return resolveExistingWorkspaceRelPath(manifestRelPath);
}

async function resolveExternalFileWorkspaceRel(manifestRelPath, relFile) {
  const normalizedRelFile = normalizeExternalMemoryFileRelForManifest(manifestRelPath, relFile);
  if (!normalizedRelFile) return null;
  const folderAbsolute = await resolveExternalMemoryFolderAbsolute(manifestRelPath);
  if (!folderAbsolute) return null;
  const fileAbsolute = path.join(folderAbsolute, normalizedRelFile);
  if (!isPathInsideDirectory(folderAbsolute, fileAbsolute)) return null;
  return manifestRelFromNodeAbsolute(fileAbsolute);
}

async function resolveMediaSidecarWorkspaceRel(manifestRelPath, relFile) {
  const context = await resolveApiStorageContext(manifestRelPath);
  if (!context) return null;
  const normalizedRelFile = normalizeRelativeFilePath(relFile);
  if (!normalizedRelFile) return null;

  const mediaAbsolute = await resolveUploadedMediaFileAbsolute(context.absolute, normalizedRelFile);
  if (!mediaAbsolute) return null;

  const sidecarAbsolute = await resolveMediaSidecarAbsolute(
    context.absolute,
    mediaAbsolute,
    normalizedRelFile
  );
  if (!sidecarAbsolute) return null;

  return manifestRelFromNodeAbsolute(sidecarAbsolute);
}

async function resolveHistoryTargetRelPath({ manifestRelPath, mode, file, systemName }) {
  if (mode === "system") {
    return resolveSystemFileHistoryTargetRel(systemName);
  }

  const resolvedManifest = await resolveExistingWorkspaceRelPath(manifestRelPath);
  if (!resolvedManifest) return null;

  if (mode === "description") return normalizeHistoryTargetRelPath(resolvedManifest);
  if (mode === "internal") return normalizeHistoryTargetRelPath(toContentFilePath(resolvedManifest));
  if (mode === "tabular") return normalizeHistoryTargetRelPath(toTabularFilePath(resolvedManifest));
  if (mode === "todo") return normalizeHistoryTargetRelPath(toTodoFilePath(resolvedManifest));
  if (mode === "configs") return normalizeHistoryTargetRelPath(toNodeConfigFilePath(resolvedManifest));
  if (mode === "env") return normalizeHistoryTargetRelPath(toEnvFilePath(resolvedManifest));
  if (mode === "external" && file) {
    const normalizedFile = ensureExternalMemoryMdRelPath(file);
    return normalizeHistoryTargetRelPath(
      await resolveExternalFileWorkspaceRel(resolvedManifest, normalizedFile)
    );
  }
  if (mode === "media" && file) {
    return normalizeHistoryTargetRelPath(await resolveMediaSidecarWorkspaceRel(resolvedManifest, file));
  }
  return null;
}

async function readHistoryVersionsFromDir(historyDirRel) {
  const historyDirAbsolute = normalizeWorkspacePath(historyDirRel);
  if (!historyDirAbsolute) return [];

  let entries;
  try {
    entries = await fs.readdir(historyDirAbsolute, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }

  const versions = [];
  for (const entry of entries) {
    if (!entry.isFile() || !isHistoryVersionFileName(entry.name)) continue;
    const versionAbsolute = path.join(historyDirAbsolute, entry.name);
    let size = 0;
    try {
      size = (await fs.stat(versionAbsolute)).size;
    } catch {
      // skip size
    }
    versions.push({
      version: entry.name,
      label: formatHistoryVersionTimestampLabel(entry.name),
      relPath: `${historyDirRel}/${entry.name}`.replace(/\\/g, "/"),
      size
    });
  }

  versions.sort((left, right) => right.version.localeCompare(left.version));
  return versions;
}

function getLegacyHistoryVersionDirRel(manifestRelPath, targetRelPath) {
  const slotDir = getNamedStorageSlotDirRel(manifestRelPath);
  const target = normalizeHistoryTargetRelPath(targetRelPath);
  if (!slotDir || !target) return "";
  return `${slotDir}/${STORAGE_SUBFOLDER_HISTORY}/${target}`;
}

function listHistoryVersionDirCandidates(manifestRelPath, targetRelPath) {
  const slotDir = getNamedStorageSlotDirRel(manifestRelPath);
  const target = normalizeHistoryTargetRelPath(targetRelPath);
  const targetBaseName = target ? path.posix.basename(target) : "";
  return [...new Set([
    getHistoryVersionDirRel(manifestRelPath, targetRelPath),
    getLegacyHistoryVersionDirRel(manifestRelPath, targetRelPath),
    slotDir && targetBaseName ? `${slotDir}/${STORAGE_SUBFOLDER_HISTORY}/${targetBaseName}` : ""
  ].filter(Boolean))];
}

function getLegacyCommentsDirRel(manifestRelPath, targetRelPath) {
  const slotDir = getNamedStorageSlotDirRel(manifestRelPath);
  const target = normalizeHistoryTargetRelPath(targetRelPath);
  if (!slotDir || !target) return "";
  return `${slotDir}/${STORAGE_SUBFOLDER_COMMENTS}/${target}`;
}

function listCommentsDirCandidates(manifestRelPath, targetRelPath) {
  const slotDir = getNamedStorageSlotDirRel(manifestRelPath);
  const target = normalizeHistoryTargetRelPath(targetRelPath);
  const targetBaseName = target ? path.posix.basename(target) : "";
  const relativeTarget = getHistoryRelativeTargetPath(manifestRelPath, targetRelPath);
  const candidates = new Set([
    getCommentsDirRel(manifestRelPath, targetRelPath),
    getLegacyCommentsDirRel(manifestRelPath, targetRelPath),
    slotDir && targetBaseName ? `${slotDir}/${STORAGE_SUBFOLDER_COMMENTS}/${targetBaseName}` : ""
  ].filter(Boolean));

  if (slotDir && relativeTarget) {
    candidates.add(`${slotDir}/${STORAGE_SUBFOLDER_COMMENTS}/${relativeTarget}`);
    if (!/\.md$/i.test(relativeTarget)) {
      candidates.add(`${slotDir}/${STORAGE_SUBFOLDER_COMMENTS}/${ensureExternalMemoryMdRelPath(relativeTarget)}`);
    } else {
      const withoutMd = relativeTarget.replace(/\.md$/i, "");
      if (withoutMd !== relativeTarget) {
        candidates.add(`${slotDir}/${STORAGE_SUBFOLDER_COMMENTS}/${withoutMd}`);
      }
    }
  }

  return [...candidates];
}

async function readHistoryVersionFile({ manifestRelPath, targetRelPath, version }) {
  for (const historyDirRel of listHistoryVersionDirCandidates(manifestRelPath, targetRelPath)) {
    const versionRelPath = `${historyDirRel}/${version}`.replace(/\\/g, "/");
    const versionAbsolute = normalizeWorkspacePath(versionRelPath);
    if (!versionAbsolute) continue;
    try {
      const content = await fs.readFile(versionAbsolute, "utf-8");
      return { content, versionRelPath };
    } catch (error) {
      if (error && error.code === "ENOENT") continue;
      throw error;
    }
  }
  return null;
}

function formatYamlScalar(value) {
  const text = String(value ?? "");
  if (/^[a-zA-Z0-9_\-@.]+$/.test(text)) return text;
  return JSON.stringify(text);
}

const COMMENT_MENTION_HANDLE_RE = /[a-zA-Z0-9_\-\.\u0400-\u04FF]+/;

function extractCommentMentions(body) {
  const re = /@([a-zA-Z0-9_\-\.\u0400-\u04FF]+)/g;
  const found = new Set();
  let match;
  while ((match = re.exec(String(body || ""))) !== null) {
    const handle = String(match[1] || "").trim();
    if (handle) found.add(handle);
  }
  return [...found];
}

function parseCommentMentions(frontmatter) {
  const raw = getYamlScalar(frontmatter, "awn-mentions");
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeMentionHandle(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-\.\u0400-\u04FF]/g, "")
    .slice(0, 48)
    .toLowerCase();
}

function commentMentionsHandle(comment, handle) {
  const normalized = normalizeMentionHandle(handle);
  if (!normalized || !comment) return false;
  const mentions = Array.isArray(comment.mentions) ? comment.mentions : extractCommentMentions(comment.body || "");
  return mentions.some((mention) => normalizeMentionHandle(mention) === normalized);
}

function parseCommentReactionsUp(frontmatter) {
  const raw = getYamlScalar(frontmatter, "awn-reactions-up");
  if (!raw) return [];
  return String(raw)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatCommentReactionAuthor(author) {
  return normalizeMentionHandle(author) || "guest";
}

function parseCommentFileContent(rawContent) {
  const { frontmatter, body } = splitNodeFrontmatter(rawContent);
  const storedMentions = parseCommentMentions(frontmatter);
  const bodyMentions = extractCommentMentions(body);
  const mentions = [...new Set([...storedMentions, ...bodyMentions])];
  const reactionsUp = parseCommentReactionsUp(frontmatter);
  return {
    author: getYamlScalar(frontmatter, "awn-author") || "guest",
    created: getYamlScalar(frontmatter, "awn-created") || "",
    replyTo: getYamlScalar(frontmatter, "awn-reply-to") || "",
    mentions,
    reactionsUp,
    body: String(body || "").trim()
  };
}

async function readCommentsFromDir(commentsDirRel) {
  const commentsDirAbsolute = normalizeWorkspacePath(commentsDirRel);
  if (!commentsDirAbsolute) return [];

  let entries;
  try {
    entries = await fs.readdir(commentsDirAbsolute, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }

  const comments = [];
  for (const entry of entries) {
    if (!entry.isFile() || !isCommentFileName(entry.name)) continue;
    const commentAbsolute = path.join(commentsDirAbsolute, entry.name);
    let content = "";
    try {
      content = await fs.readFile(commentAbsolute, "utf-8");
    } catch {
      continue;
    }
    const parsed = parseCommentFileContent(content);
    comments.push({
      id: entry.name,
      label: formatCommentTimestampLabel(entry.name),
      relPath: `${commentsDirRel}/${entry.name}`.replace(/\\/g, "/"),
      author: parsed.author,
      created: parsed.created,
      replyTo: parsed.replyTo || null,
      mentions: parsed.mentions,
      reactionsUp: parsed.reactionsUp,
      reactionsUpCount: parsed.reactionsUp.length,
      body: parsed.body
    });
  }

  comments.sort((left, right) => right.id.localeCompare(left.id));
  return comments;
}

async function listFileComments({ manifestRelPath, mode, file, systemName }) {
  const commentsManifestRel = await resolveHistoryManifestRel({ manifestRelPath, mode, systemName });
  const targetRelPath = await resolveHistoryTargetRelPath({ manifestRelPath, mode, file, systemName });
  const relativeTarget = commentsManifestRel && targetRelPath
    ? getHistoryRelativeTargetPath(commentsManifestRel, targetRelPath)
    : "";
  if (!commentsManifestRel || !targetRelPath) {
    return { manifestPath: commentsManifestRel, target: relativeTarget, comments: [] };
  }

  const comments = [];
  const seenIds = new Set();
  for (const commentsDirRel of listCommentsDirCandidates(commentsManifestRel, targetRelPath)) {
    const dirComments = await readCommentsFromDir(commentsDirRel);
    for (const comment of dirComments) {
      if (seenIds.has(comment.id)) continue;
      seenIds.add(comment.id);
      comments.push(comment);
    }
  }
  comments.sort((left, right) => right.id.localeCompare(left.id));

  return { manifestPath: commentsManifestRel, target: relativeTarget, comments };
}

async function createFileComment({ manifestRelPath, mode, file, systemName, body, author, replyTo }) {
  const commentsManifestRel = await resolveHistoryManifestRel({ manifestRelPath, mode, systemName });
  const targetRelPath = await resolveHistoryTargetRelPath({ manifestRelPath, mode, file, systemName });
  if (!commentsManifestRel || !targetRelPath) {
    throw new Error("Invalid comment target");
  }

  const text = String(body || "").trim();
  if (!text) throw new Error("Comment body is required");

  const commentAuthor = String(author || "guest").trim() || "guest";
  const created = new Date().toISOString();
  const commentsDirRel = getCommentsDirRel(commentsManifestRel, targetRelPath);
  const commentsDirAbsolute = normalizeWorkspacePath(commentsDirRel);
  if (!commentsDirAbsolute) throw new Error("Invalid comments directory");

  const parentId = String(replyTo || "").trim();
  if (parentId) {
    if (!isCommentFileName(parentId)) throw new Error("Invalid reply target");
    let parentFound = false;
    for (const candidateDirRel of listCommentsDirCandidates(commentsManifestRel, targetRelPath)) {
      const candidateDirAbsolute = normalizeWorkspacePath(candidateDirRel);
      if (!candidateDirAbsolute) continue;
      const parentAbsolute = path.join(candidateDirAbsolute, parentId);
      if (!parentAbsolute.startsWith(candidateDirAbsolute)) continue;
      try {
        await fs.access(parentAbsolute);
        parentFound = true;
        break;
      } catch {
        // try next candidate dir
      }
    }
    if (!parentFound) throw new Error("Reply target comment not found");
  }

  const mentions = extractCommentMentions(text);
  const frontmatterLines = [
    `awn-author: ${formatYamlScalar(commentAuthor)}`,
    `awn-created: ${created}`
  ];
  if (parentId) frontmatterLines.push(`awn-reply-to: ${formatYamlScalar(parentId)}`);
  if (mentions.length) frontmatterLines.push(`awn-mentions: ${formatYamlScalar(mentions.join(", "))}`);
  const content = joinNodeFrontmatter(frontmatterLines.join("\n"), text);

  const fileName = buildCommentFileName();
  const commentRelPath = `${commentsDirRel}/${fileName}`.replace(/\\/g, "/");
  const commentAbsolute = normalizeWorkspacePath(commentRelPath);
  if (!commentAbsolute) throw new Error("Invalid comment path");

  await fs.mkdir(commentsDirAbsolute, { recursive: true });
  await fs.writeFile(commentAbsolute, content, "utf-8");

  return {
    id: fileName,
    label: formatCommentTimestampLabel(fileName),
    relPath: commentRelPath,
    author: commentAuthor,
    created,
    replyTo: parentId || null,
    mentions,
    reactionsUp: [],
    reactionsUpCount: 0,
    body: text
  };
}

async function resolveCommentFileAbsolute({ manifestRelPath, mode, file, systemName, commentId }) {
  const commentsManifestRel = await resolveHistoryManifestRel({ manifestRelPath, mode, systemName });
  const targetRelPath = await resolveHistoryTargetRelPath({ manifestRelPath, mode, file, systemName });
  if (!commentsManifestRel || !targetRelPath) throw new Error("Invalid comment target");

  const safeId = String(commentId || "").trim();
  if (!isCommentFileName(safeId)) throw new Error("Invalid comment id");

  for (const commentsDirRel of listCommentsDirCandidates(commentsManifestRel, targetRelPath)) {
    const commentsDirAbsolute = normalizeWorkspacePath(commentsDirRel);
    if (!commentsDirAbsolute) continue;

    const fileAbsolute = path.join(commentsDirAbsolute, safeId);
    if (!fileAbsolute.startsWith(commentsDirAbsolute)) continue;

    try {
      await fs.access(fileAbsolute);
      return { commentsDirAbsolute, fileAbsolute, relPath: safeId, commentsDirRel };
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
    }
  }

  throw new Error("Comment not found");
}

async function toggleCommentReaction({ manifestRelPath, mode, file, systemName, commentId, reaction, author }) {
  const reactionKey = String(reaction || "up").trim().toLowerCase();
  if (reactionKey !== "up") throw new Error("Unsupported reaction");

  const commentAuthor = formatCommentReactionAuthor(author || "guest");
  const { fileAbsolute, relPath, commentsDirRel } = await resolveCommentFileAbsolute({
    manifestRelPath,
    mode,
    file,
    systemName,
    commentId
  });

  const raw = await fs.readFile(fileAbsolute, "utf-8");
  const { frontmatter, body } = splitNodeFrontmatter(raw);
  const reactionsUp = parseCommentReactionsUp(frontmatter);
  const index = reactionsUp.indexOf(commentAuthor);
  let active = false;
  if (index >= 0) {
    reactionsUp.splice(index, 1);
  } else {
    reactionsUp.push(commentAuthor);
    active = true;
  }

  let nextFrontmatter = frontmatter;
  if (reactionsUp.length) {
    nextFrontmatter = upsertYamlScalarLine(nextFrontmatter, "awn-reactions-up", reactionsUp.join(", "));
  } else {
    nextFrontmatter = String(nextFrontmatter || "")
      .replace(/^awn-reactions-up:.*\n?/m, "")
      .trim();
  }

  await fs.writeFile(fileAbsolute, joinNodeFrontmatter(nextFrontmatter, body), "utf-8");

  const parsed = parseCommentFileContent(joinNodeFrontmatter(nextFrontmatter, body));
  return {
    id: relPath,
    relPath: `${commentsDirRel}/${relPath}`.replace(/\\/g, "/"),
    reactionsUp: parsed.reactionsUp,
    reactionsUpCount: parsed.reactionsUp.length,
    activeForAuthor: active
  };
}

async function buildTopicMentionSummary(manifestRelPath, mentionHandle, afterId = "") {
  const handle = normalizeMentionHandle(mentionHandle);
  if (!handle) return { count: 0, unread: 0, latestId: null };

  const { comments } = await listFileComments({ manifestRelPath, mode: "description" });
  const matching = comments.filter((comment) => commentMentionsHandle(comment, handle));
  const after = String(afterId || "").trim();
  const unread = after
    ? matching.filter((comment) => comment.id > after).length
    : matching.length;

  return {
    count: matching.length,
    unread,
    latestId: matching[0]?.id || null
  };
}

function parseThreadMessageContent(rawContent) {
  const { frontmatter, body } = splitNodeFrontmatter(rawContent);
  const roleRaw = String(getYamlScalar(frontmatter, "awn-role") || "user").trim().toLowerCase();
  return {
    role: roleRaw === "agent" ? "agent" : "user",
    author: getYamlScalar(frontmatter, "awn-author") || "guest",
    created: getYamlScalar(frontmatter, "awn-created") || "",
    linkedFiles: getYamlScalar(frontmatter, "awn-linked-files") || "",
    body: String(body || "").trim()
  };
}

function parseInboxItemContent(rawContent) {
  const { frontmatter, body } = splitNodeFrontmatter(rawContent);
  const statusRaw = String(getYamlScalar(frontmatter, "awn-status") || "new").trim().toLowerCase();
  const status =
    statusRaw === "done" || statusRaw === "in-progress" || statusRaw === "new" ? statusRaw : "new";
  return {
    status,
    source: getYamlScalar(frontmatter, "awn-source") || "",
    author: getYamlScalar(frontmatter, "awn-author") || "",
    created: getYamlScalar(frontmatter, "awn-created") || "",
    body: String(body || "").trim()
  };
}

const INBOX_BODY_MAX_LENGTH = 50000;

function sanitizeInboxIntakeBody(body) {
  let text = String(body || "")
    .replace(/^\uFEFF/, "")
    .trim();
  if (text.startsWith("---")) {
    const end = text.indexOf("\n---", 3);
    if (end !== -1) text = text.slice(end + 4).trim();
  }
  text = text.replace(/\0/g, "");
  if (text.length > INBOX_BODY_MAX_LENGTH) {
    text = `${text.slice(0, INBOX_BODY_MAX_LENGTH)}\n\n[… текст обрезан]`;
  }
  return text;
}

function wrapInboxBodyForThread(body, meta = {}) {
  const clean = sanitizeInboxIntakeBody(body);
  const source = String(meta.source || "").trim();
  const sourceNote = source ? ` · ${source}` : "";
  return `> **Входящее**${sourceNote}\n\n${clean}`.trim();
}

async function buildTopicChannelSignature(manifestRelPath, watch = "thread,inbox", scope = {}) {
  const channels = new Set(
    String(watch || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
  const parts = {};

  if (channels.has("inbox")) {
    const inbox = await listInboxItems(manifestRelPath);
    parts.inbox = {
      pending: Number(inbox.pending) || 0,
      total: Array.isArray(inbox.items) ? inbox.items.length : 0,
      latest: inbox.items[0]?.path || null
    };
  }

  if (channels.has("thread")) {
    const thread = await listTopicThread({
      manifestRelPath,
      mode: scope.mode,
      file: scope.file,
      systemName: scope.systemName
    });
    const messages = Array.isArray(thread.messages) ? thread.messages : [];
    const last = messages.length ? messages[messages.length - 1] : null;
    parts.thread = {
      count: messages.length,
      lastId: last?.id || null,
      lastRole: last?.role || null
    };
  }

  return JSON.stringify(parts);
}

async function streamTopicChannelEvents(req, res, manifestRelPath, watch, scope = {}) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  if (typeof res.flushHeaders === "function") res.flushHeaders();
  res.write(": connected\n\n");

  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  let lastSig = "";
  const tick = async () => {
    if (closed) return;
    try {
      const sig = await buildTopicChannelSignature(manifestRelPath, watch, scope);
      if (sig !== lastSig) {
        lastSig = sig;
        res.write(`event: update\ndata: ${sig}\n\n`);
      } else {
        res.write("event: ping\ndata: {}\n\n");
      }
    } catch (error) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: String(error?.message || error) })}\n\n`
      );
    }
  };

  await tick();
  const interval = setInterval(() => {
    void tick();
  }, 2500);

  const reconnectTimer = setTimeout(() => {
    if (!closed) {
      res.write("event: reconnect\ndata: {}\n\n");
      res.end();
    }
    clearInterval(interval);
  }, 300000);

  req.on("close", () => {
    clearInterval(interval);
    clearTimeout(reconnectTimer);
  });
}

async function collectAgentTopicManifestPaths() {
  const menu = await buildAgentMenu(getAgentRoot());
  const entries = collectManifestEntriesFromMenu(menu, []);
  if (menu.serviceTree) collectManifestEntriesFromMenu(menu.serviceTree, entries);
  if (menu.containerTree) collectManifestEntriesFromMenu(menu.containerTree, entries);
  if (menu.sharedTree) collectManifestEntriesFromMenu(menu.sharedTree, entries);
  return [
    ...new Set(
      entries
        .filter((entry) => entry.kind === "topic")
        .map((entry) => String(entry.manifestPath || "").replace(/\\/g, "/"))
        .filter(Boolean)
    )
  ].slice(0, 120);
}

async function buildAgentChannelSignature(agentRoot = getAgentRoot()) {
  const paths = await collectAgentTopicManifestPaths();
  const batch = await buildIntakeBatchSummary(paths);
  const digest = {};
  for (const [path, summary] of Object.entries(batch.summaries || {})) {
    digest[path] = {
      i: Number(summary?.inbox?.pending) || 0,
      t: summary?.thread?.lastMessageId || null,
      m: Number(summary?.mentions?.unread) || 0
    };
  }
  if (agentRoot) await ensureWorkspaceActivityLoaded(agentRoot);
  return JSON.stringify({
    topics: paths.length,
    totals: batch.totals,
    digest,
    activitySeq: getWorkspaceActivitySeq(agentRoot)
  });
}

async function streamAgentChannelEvents(req, res) {
  const agentRoot = getAgentRoot();
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });
  if (typeof res.flushHeaders === "function") res.flushHeaders();
  res.write(": connected\n\n");

  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  let lastSig = "";
  const tick = async () => {
    if (closed) return;
    try {
      const sig = await buildAgentChannelSignature(agentRoot);
      if (sig !== lastSig) {
        lastSig = sig;
        res.write(`event: update\ndata: ${sig}\n\n`);
      } else {
        res.write("event: ping\ndata: {}\n\n");
      }
    } catch (error) {
      res.write(
        `event: error\ndata: ${JSON.stringify({ message: String(error?.message || error) })}\n\n`
      );
    }
  };

  await tick();
  const interval = setInterval(() => {
    void tick();
  }, 2500);

  const reconnectTimer = setTimeout(() => {
    if (!closed) {
      res.write("event: reconnect\ndata: {}\n\n");
      res.end();
    }
    clearInterval(interval);
  }, 300000);

  req.on("close", () => {
    clearInterval(interval);
    clearTimeout(reconnectTimer);
  });
}

function upsertYamlScalarLine(frontmatter, key, value) {
  const line = `${key}: ${formatYamlScalar(value)}`;
  const pattern = new RegExp(`^${String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:.*$`, "m");
  const trimmed = String(frontmatter || "").trim();
  if (pattern.test(trimmed)) {
    return trimmed.replace(pattern, line);
  }
  return trimmed ? `${trimmed}\n${line}` : line;
}

async function readThreadMessagesFromDir(threadDirRel) {
  const threadDirAbsolute = normalizeWorkspacePath(threadDirRel);
  if (!threadDirAbsolute) return [];

  let entries;
  try {
    entries = await fs.readdir(threadDirAbsolute, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }

  const messages = [];
  for (const entry of entries) {
    if (!entry.isFile() || !isCommentFileName(entry.name)) continue;
    const messageAbsolute = path.join(threadDirAbsolute, entry.name);
    let content = "";
    try {
      content = await fs.readFile(messageAbsolute, "utf-8");
    } catch {
      continue;
    }
    const parsed = parseThreadMessageContent(content);
    messages.push({
      id: entry.name,
      label: formatCommentTimestampLabel(entry.name),
      relPath: `${threadDirRel}/${entry.name}`.replace(/\\/g, "/"),
      role: parsed.role,
      author: parsed.author,
      created: parsed.created,
      linkedFiles: parsed.linkedFiles || null,
      body: parsed.body
    });
  }

  messages.sort((left, right) => left.id.localeCompare(right.id));
  return messages;
}

async function resolveThreadTarget({ manifestRelPath, mode, file, systemName }) {
  const historyManifestRel = await resolveHistoryManifestRel({ manifestRelPath, mode, systemName });
  const manifestPath = historyManifestRel || manifestRelPath;
  const hasFileScope = Boolean(String(file || "").trim() || String(systemName || "").trim());

  if (!hasFileScope) {
    const threadDirRel = getThreadDirRel(manifestPath);
    return {
      manifestPath,
      target: null,
      threadDirRel: threadDirRel || "",
      scope: "topic"
    };
  }

  const targetRelPath = await resolveHistoryTargetRelPath({ manifestRelPath, mode, file, systemName });
  if (!targetRelPath) {
    const threadDirRel = getThreadDirRel(manifestPath);
    return {
      manifestPath,
      target: null,
      threadDirRel: threadDirRel || "",
      scope: "topic"
    };
  }

  const relativeTarget = getHistoryRelativeTargetPath(manifestPath, targetRelPath);
  const threadDirRel = getThreadDirRel(manifestPath, targetRelPath);
  return {
    manifestPath,
    target: relativeTarget || null,
    threadDirRel: threadDirRel || "",
    scope: "element"
  };
}

async function listTopicThread({ manifestRelPath, mode, file, systemName } = {}) {
  const resolved = await resolveThreadTarget({ manifestRelPath, mode, file, systemName });
  if (!resolved.threadDirRel) {
    return {
      manifestPath: resolved.manifestPath,
      target: resolved.target,
      scope: resolved.scope,
      threadDir: "",
      messages: []
    };
  }
  const messages = await readThreadMessagesFromDir(resolved.threadDirRel);
  return {
    manifestPath: resolved.manifestPath,
    target: resolved.target,
    scope: resolved.scope,
    threadDir: resolved.threadDirRel,
    messages
  };
}

async function appendTopicThreadMessage({
  manifestRelPath,
  body,
  role,
  author,
  linkedFiles,
  mode,
  file,
  systemName
}) {
  const resolved = await resolveThreadTarget({ manifestRelPath, mode, file, systemName });
  const threadDirRel = resolved.threadDirRel;
  if (!threadDirRel) throw new Error("Invalid thread target");

  const text = String(body || "").trim();
  if (!text) throw new Error("Message body is required");

  const messageRole = String(role || "user").trim().toLowerCase() === "agent" ? "agent" : "user";
  const messageAuthor = String(author || (messageRole === "agent" ? "agent" : "guest")).trim() || "guest";
  const created = new Date().toISOString();
  const threadDirAbsolute = normalizeWorkspacePath(threadDirRel);
  if (!threadDirAbsolute) throw new Error("Invalid thread directory");

  const frontmatterLines = [
    `awn-role: ${formatYamlScalar(messageRole)}`,
    `awn-author: ${formatYamlScalar(messageAuthor)}`,
    `awn-created: ${created}`
  ];
  const linked = String(linkedFiles || "").trim();
  if (linked) frontmatterLines.push(`awn-linked-files: ${formatYamlScalar(linked)}`);
  const content = joinNodeFrontmatter(frontmatterLines.join("\n"), text);

  const fileName = buildCommentFileName();
  const messageRelPath = `${threadDirRel}/${fileName}`.replace(/\\/g, "/");
  const messageAbsolute = normalizeWorkspacePath(messageRelPath);
  if (!messageAbsolute) throw new Error("Invalid thread message path");

  await fs.mkdir(threadDirAbsolute, { recursive: true });
  await fs.writeFile(messageAbsolute, content, "utf-8");

  return {
    id: fileName,
    label: formatCommentTimestampLabel(fileName),
    relPath: messageRelPath,
    role: messageRole,
    author: messageAuthor,
    created,
    linkedFiles: linked || null,
    body: text
  };
}

async function listInboxItems(manifestRelPath) {
  const nodeAbsolute = await resolveApiManifestAbsolute(manifestRelPath);
  if (!nodeAbsolute) throw new Error("Invalid file path");

  const inboxAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_INBOX);
  if (!inboxAbsolute) {
    return { manifestPath: manifestRelPath, exists: false, items: [], pending: 0 };
  }

  const inboxDirRel = path
    .relative(getAgentRoot(), inboxAbsolute)
    .replace(/\\/g, "/");

  const files = await collectMarkdownFiles(inboxAbsolute);
  const items = [];

  for (const file of files) {
    const relPath = String(file.relativePath || "").replace(/\\/g, "/");
    if (!relPath) continue;
    const fileAbsolute = path.join(inboxAbsolute, relPath);
    if (!fileAbsolute.startsWith(getAgentRoot())) continue;
    let raw = "";
    try {
      raw = await fs.readFile(fileAbsolute, "utf-8");
    } catch {
      continue;
    }
    const parsed = parseInboxItemContent(raw);
    const preview = parsed.body.replace(/\s+/g, " ").trim().slice(0, 160);
    items.push({
      path: relPath.replace(/\\/g, "/"),
      relPath: `${inboxDirRel}/${relPath}`.replace(/\\/g, "/"),
      status: parsed.status,
      source: parsed.source,
      author: parsed.author,
      created: parsed.created,
      preview,
      body: parsed.body
    });
  }

  items.sort((left, right) => right.path.localeCompare(left.path));
  const pending = items.filter((item) => item.status !== "done").length;

  return {
    manifestPath: manifestRelPath,
    exists: true,
    inboxDir: inboxDirRel,
    items,
    pending
  };
}

async function readInboxItem(manifestRelPath, inboxRelFile) {
  const { inboxAbsolute, fileAbsolute, relPath } = await resolveInboxFileAbsolute(
    manifestRelPath,
    inboxRelFile
  );
  const inboxDirRel = path.relative(getAgentRoot(), inboxAbsolute).replace(/\\/g, "/");
  const raw = await fs.readFile(fileAbsolute, "utf-8");
  const parsed = parseInboxItemContent(raw);
  const preview = parsed.body.replace(/\s+/g, " ").trim().slice(0, 160);

  return {
    manifestPath: manifestRelPath,
    inboxDir: inboxDirRel,
    item: {
      path: relPath,
      relPath: `${inboxDirRel}/${relPath}`.replace(/\\/g, "/"),
      status: parsed.status,
      source: parsed.source,
      author: parsed.author,
      created: parsed.created,
      preview,
      body: parsed.body
    }
  };
}

async function resolveInboxFileAbsolute(manifestRelPath, inboxRelFile) {
  const nodeAbsolute = await resolveApiManifestAbsolute(manifestRelPath);
  if (!nodeAbsolute) throw new Error("Invalid file path");

  const inboxAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_INBOX);
  if (!inboxAbsolute) throw new Error("Inbox folder not found");

  const safeRel = normalizeHistoryTargetRelPath(inboxRelFile);
  if (!safeRel || safeRel.includes("..")) throw new Error("Invalid inbox file path");

  const fileAbsolute = path.join(inboxAbsolute, safeRel);
  if (!fileAbsolute.startsWith(inboxAbsolute)) throw new Error("Invalid inbox file path");

  try {
    await fs.access(fileAbsolute);
  } catch {
    throw new Error("Inbox file not found");
  }

  return { nodeAbsolute, inboxAbsolute, fileAbsolute, relPath: safeRel };
}

async function triageInboxItem({ manifestRelPath, file, action, status }) {
  const { nodeAbsolute, inboxAbsolute, fileAbsolute, relPath } = await resolveInboxFileAbsolute(
    manifestRelPath,
    file
  );

  const raw = await fs.readFile(fileAbsolute, "utf-8");
  const { frontmatter, body } = splitNodeFrontmatter(raw);
  const parsed = parseInboxItemContent(raw);
  const nextAction = String(action || "").trim().toLowerCase();

  if (nextAction === "to-thread") {
    const threadBody = wrapInboxBodyForThread(String(body || "").trim() || parsed.body, {
      source: parsed.source
    });
    const message = await appendTopicThreadMessage({
      manifestRelPath,
      body: threadBody,
      role: "user",
      author: parsed.author || "inbox"
    });
    let nextFrontmatter = upsertYamlScalarLine(frontmatter, "awn-status", "done");
    nextFrontmatter = upsertYamlScalarLine(nextFrontmatter, "awn-triaged-at", new Date().toISOString());
    nextFrontmatter = upsertYamlScalarLine(nextFrontmatter, "awn-thread-ref", message.id);
    await fs.writeFile(fileAbsolute, joinNodeFrontmatter(nextFrontmatter, body), "utf-8");
    return { action: nextAction, file: relPath, status: "done", threadMessage: message };
  }

  if (nextAction === "to-content") {
    const contentAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_CONTENT, {
      create: true
    });
    if (!contentAbsolute) throw new Error("Content folder unavailable");

    const baseName = path.basename(relPath);
    let targetAbsolute = path.join(contentAbsolute, baseName);
    if (!targetAbsolute.startsWith(contentAbsolute)) throw new Error("Invalid content target");

    if (await fileExists(targetAbsolute)) {
      const stamp = buildCommentFileName().replace(/\.md$/i, "");
      const altName = `${path.basename(baseName, ".md")}-${stamp}.md`;
      targetAbsolute = path.join(contentAbsolute, altName);
    }

    await fs.mkdir(contentAbsolute, { recursive: true });
    let nextFrontmatter = upsertYamlScalarLine(frontmatter, "awn-status", "done");
    nextFrontmatter = upsertYamlScalarLine(nextFrontmatter, "awn-triaged-at", new Date().toISOString());
    const movedContent = joinNodeFrontmatter(nextFrontmatter, body);
    await fs.writeFile(targetAbsolute, movedContent, "utf-8");
    await fs.rm(fileAbsolute, { force: true });

    const contentRel = path.relative(getAgentRoot(), targetAbsolute).replace(/\\/g, "/");
    return { action: nextAction, file: relPath, status: "done", contentPath: contentRel };
  }

  if (nextAction === "mark-done" || nextAction === "set-status") {
    const nextStatusRaw = String(status || "done").trim().toLowerCase();
    const nextStatus =
      nextStatusRaw === "done" || nextStatusRaw === "in-progress" || nextStatusRaw === "new"
        ? nextStatusRaw
        : "done";
    let nextFrontmatter = upsertYamlScalarLine(frontmatter, "awn-status", nextStatus);
    if (nextStatus === "done") {
      nextFrontmatter = upsertYamlScalarLine(nextFrontmatter, "awn-triaged-at", new Date().toISOString());
    }
    await fs.writeFile(fileAbsolute, joinNodeFrontmatter(nextFrontmatter, body), "utf-8");
    return { action: nextAction, file: relPath, status: nextStatus };
  }

  throw new Error("Unknown inbox triage action");
}

async function buildTopicIntakeSummary(manifestRelPath, options = {}) {
  const inbox = await listInboxItems(manifestRelPath);
  const thread = await listTopicThread({ manifestRelPath });
  const messages = Array.isArray(thread.messages) ? thread.messages : [];
  const lastMessage = messages.length ? messages[messages.length - 1] : null;
  const mentionHandle = String(options.mentionHandle || "").trim();
  const mentions = mentionHandle
    ? await buildTopicMentionSummary(
        manifestRelPath,
        mentionHandle,
        String(options.mentionAfterId || "").trim()
      )
    : { count: 0, unread: 0, latestId: null };
  return {
    path: manifestRelPath,
    inbox: {
      exists: Boolean(inbox.exists),
      pending: Number(inbox.pending) || 0,
      total: Array.isArray(inbox.items) ? inbox.items.length : 0
    },
    thread: {
      count: messages.length,
      lastMessageId: lastMessage?.id || null,
      lastMessageAt: lastMessage?.created || null,
      lastMessageRole: lastMessage?.role || null
    },
    mentions
  };
}

async function buildIntakeBatchSummary(paths, options = {}) {
  const uniquePaths = [
    ...new Set(
      (Array.isArray(paths) ? paths : [])
        .map((item) => String(item || "").trim().replace(/\\/g, "/"))
        .filter(Boolean)
    )
  ].slice(0, 120);

  const summaries = {};
  let inboxPending = 0;
  let threadMessages = 0;
  let mentionUnread = 0;
  const mentionHandle = String(options.mentionHandle || "").trim();
  const mentionAfterIds =
    options.mentionAfterIds && typeof options.mentionAfterIds === "object"
      ? options.mentionAfterIds
      : {};

  for (const manifestRelPath of uniquePaths) {
    try {
      const nodeAbsolute = await resolveApiManifestAbsolute(manifestRelPath);
      if (!nodeAbsolute) continue;
      const summary = await buildTopicIntakeSummary(manifestRelPath, {
        mentionHandle,
        mentionAfterId: mentionAfterIds[manifestRelPath] || ""
      });
      summaries[manifestRelPath] = summary;
      inboxPending += Number(summary?.inbox?.pending) || 0;
      threadMessages += Number(summary?.thread?.count) || 0;
      mentionUnread += Number(summary?.mentions?.unread) || 0;
    } catch {
      // skip invalid or unreadable paths
    }
  }

  return {
    summaries,
    totals: {
      topics: Object.keys(summaries).length,
      inboxPending,
      threadMessages,
      mentionUnread
    }
  };
}

async function createInboxItem({ manifestRelPath, title, body, source, author }) {
  const { display, diskSlug } = resolveContentItemNames({ title: title || "Входящее", slug: title });
  const fileTitle = display || "Входящее";
  if (!diskSlug) throw new Error("Invalid file name");
  const textBody = sanitizeInboxIntakeBody(String(body || "").trim() || `# ${fileTitle}\n`);
  const itemAuthor = String(author || "").trim();

  const created = await createStorageRecordFile({
    manifestRelPath,
    storageFolder: STORAGE_SUBFOLDER_INBOX,
    title: fileTitle,
    slug: diskSlug,
    body: textBody,
    source: source || "ui",
    author: itemAuthor,
    status: "new"
  });

  const nodeAbsolute = await resolveApiManifestAbsolute(manifestRelPath);
  const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_INBOX);
  const inboxDirRel = folderAbsolute
    ? path.relative(getAgentRoot(), folderAbsolute).replace(/\\/g, "/")
    : "";

  return {
    path: created.file,
    relPath: inboxDirRel ? `${inboxDirRel}/${created.file}`.replace(/\\/g, "/") : created.file,
    status: "new",
    source: source || "ui",
    author: itemAuthor,
    created: new Date().toISOString(),
    preview: textBody.replace(/\s+/g, " ").trim().slice(0, 160),
    body: textBody,
    file: created.file,
    content: created.content
  };
}

const shellHandlers = createShellHandlers({
  sendJson,
  readJsonBody,
  appendTopicThreadMessage,
  listTopicThread,
  createInboxItem
});

async function listFileHistoryVersions({ manifestRelPath, mode, file, systemName }) {
  const historyManifestRel = await resolveHistoryManifestRel({ manifestRelPath, mode, systemName });
  const targetRelPath = await resolveHistoryTargetRelPath({ manifestRelPath, mode, file, systemName });
  const relativeTarget = historyManifestRel && targetRelPath
    ? getHistoryRelativeTargetPath(historyManifestRel, targetRelPath)
    : "";
  if (!historyManifestRel || !targetRelPath) {
    return { manifestPath: historyManifestRel, target: relativeTarget, versions: [] };
  }

  const versions = [];
  const seenVersions = new Set();
  const manifestCandidates =
    mode === "system"
      ? getSystemFileHistoryManifestCandidates(historyManifestRel)
      : [historyManifestRel];
  for (const manifest of manifestCandidates) {
    for (const historyDirRel of listHistoryVersionDirCandidates(manifest, targetRelPath)) {
      const dirVersions = await readHistoryVersionsFromDir(historyDirRel);
      for (const entry of dirVersions) {
        if (seenVersions.has(entry.version)) continue;
        seenVersions.add(entry.version);
        versions.push(entry);
      }
    }
  }
  versions.sort((left, right) => right.version.localeCompare(left.version));

  return { manifestPath: historyManifestRel, target: relativeTarget, versions };
}

function computeLineDiffEntries(oldText, newText) {
  const a = String(oldText ?? "").split("\n");
  const b = String(newText ?? "").split("\n");
  const m = a.length;
  const n = b.length;
  const maxCells = 250000;
  if (m * n > maxCells) {
    return { truncated: true, entries: [], stats: { added: 0, removed: 0, unchanged: 0 } };
  }

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const entries = [];
  let i = 0;
  let j = 0;
  let added = 0;
  let removed = 0;
  let unchanged = 0;
  while (i < m || j < n) {
    if (i < m && j < n && a[i] === b[j]) {
      entries.push({ type: "same", oldLine: i + 1, newLine: j + 1, text: b[j] });
      unchanged += 1;
      i += 1;
      j += 1;
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      entries.push({ type: "add", newLine: j + 1, text: b[j] });
      added += 1;
      j += 1;
    } else {
      entries.push({ type: "remove", oldLine: i + 1, text: a[i] });
      removed += 1;
      i += 1;
    }
  }

  return { truncated: false, entries, stats: { added, removed, unchanged } };
}

async function getLatestHistorySnapshotForTarget(manifestRelPath, targetRelPath) {
  const manifestCandidates =
    manifestRelPath === resolveSystemFileHistoryManifestRel()
      ? getSystemFileHistoryManifestCandidates(manifestRelPath)
      : [manifestRelPath];

  for (const manifest of manifestCandidates) {
    for (const historyDirRel of listHistoryVersionDirCandidates(manifest, targetRelPath)) {
      const versions = await readHistoryVersionsFromDir(historyDirRel);
      if (!versions.length) continue;
      const latest = versions[0];
      const file = await readHistoryVersionFile({
        manifestRelPath: manifest,
        targetRelPath,
        version: latest.version
      });
      if (file) {
        return {
          content: file.content,
          version: latest.version,
          versionRelPath: file.versionRelPath
        };
      }
    }
  }
  return null;
}

async function buildWorkspaceFileDiff(workspaceRelPath, { oldContent = null } = {}) {
  const normalizedPath = String(workspaceRelPath || "").replace(/\\/g, "/").trim();
  if (!normalizedPath || normalizedPath.startsWith(".agent-cms/")) return null;

  const resolvedPath = await resolveExistingWorkspaceRelPath(normalizedPath);
  if (!resolvedPath) return null;

  const targetRelPath = normalizeHistoryTargetRelPath(resolvedPath);
  const manifestRelPath = resolveOwningManifestRelFromNodePath(resolvedPath);
  const { content: newContent, exists } = await readWorkspaceTextFileIfExists(resolvedPath);
  if (!exists) {
    return { path: resolvedPath, exists: false, changed: false };
  }

  const snapshot =
    oldContent != null ? null : await getLatestHistorySnapshotForTarget(manifestRelPath, targetRelPath);
  const baselineContent = oldContent != null ? String(oldContent) : snapshot?.content ?? "";
  if (baselineContent === newContent) {
    return {
      path: resolvedPath,
      exists: true,
      changed: false,
      newContent,
      oldContent: baselineContent,
      version: snapshot?.version || null,
      diff: {
        truncated: false,
        entries: [],
        stats: { added: 0, removed: 0, unchanged: newContent.split("\n").length }
      }
    };
  }

  const diff = computeLineDiffEntries(baselineContent, newContent);
  return {
    path: resolvedPath,
    exists: true,
    changed: true,
    newContent,
    oldContent: baselineContent,
    version: snapshot?.version || null,
    diff
  };
}

async function readWorkspaceFileRevision(workspaceRelPath) {
  const normalizedPath = String(workspaceRelPath || "").replace(/\\/g, "/").trim();
  if (!normalizedPath || normalizedPath.startsWith(".agent-cms/")) return null;

  const resolvedPath = await resolveExistingWorkspaceRelPath(normalizedPath);
  if (!resolvedPath) return null;

  const absolute = normalizeWorkspacePath(resolvedPath);
  if (!absolute) return null;

  try {
    const stat = await fs.stat(absolute);
    if (!stat.isFile()) {
      return { path: resolvedPath, exists: false, mtime: null, size: 0 };
    }
    return {
      path: resolvedPath,
      exists: true,
      mtime: stat.mtime ? stat.mtime.toISOString() : null,
      size: stat.size
    };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { path: resolvedPath, exists: false, mtime: null, size: 0 };
    }
    throw error;
  }
}

async function readWorkspaceFileRevisions(relPaths = []) {
  const revisions = {};
  const uniquePaths = [
    ...new Set(
      relPaths
        .map((value) => String(value || "").replace(/\\/g, "/").trim())
        .filter(Boolean)
    )
  ].slice(0, 40);

  for (const relPath of uniquePaths) {
    const revision = await readWorkspaceFileRevision(relPath);
    if (revision) revisions[revision.path] = revision;
  }

  return revisions;
}

async function readExistingBundleFile(relNodePath, bundleFileName) {
  const resolvedRelPath = await resolveExistingWorkspaceRelPath(relNodePath);
  for (const rel of getNamedStorageBundleRelCandidates(resolvedRelPath, bundleFileName)) {
    const absolute = normalizeWorkspacePath(rel);
    if (!absolute) continue;
    try {
      const content = await fs.readFile(absolute, "utf-8");
      return { path: rel, content, exists: true };
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
    }
  }
  const fallback = namedStorageBundleRel(resolvedRelPath, bundleFileName);
  return { path: fallback, content: "", exists: false };
}

function getYamlScalar(frontmatter, key) {
  const text = String(frontmatter || "");
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  if (!match) return "";
  return String(parseYamlScalar(match[1]) ?? "").trim();
}

function getYamlBoolean(frontmatter, key) {
  const raw = getYamlScalar(frontmatter, key);
  if (!raw) return false;
  const value = String(raw).trim().toLowerCase();
  return value === "true" || value === "yes" || value === "1";
}

const RUNTIME_LOAD_ALWAYS_LABELS = {
  true: "Всегда в контексте",
  false: "По запросу"
};

function readLegacyRuntimeLoadAlways(frontmatter) {
  const props = parseFrontmatterProps(frontmatter);
  const loadRaw =
    getFrontmatterPropValue(props, "awn-runtime-load") ||
    getYamlScalar(frontmatter, "awn-runtime-load") ||
    "";
  const normalized = String(loadRaw).trim().toLowerCase();
  return normalized === "session-start" || normalized === "true" || normalized === "yes" || normalized === "1";
}

function readRuntimeLoadAlwaysFromFrontmatter(frontmatter) {
  const props = parseFrontmatterProps(frontmatter);
  const alwaysRaw =
    getFrontmatterPropValue(props, "awn-runtime-load-always") ??
    getYamlScalar(frontmatter, "awn-runtime-load-always");
  if (alwaysRaw !== null && alwaysRaw !== undefined && String(alwaysRaw).trim() !== "") {
    return readFrontmatterBooleanProp(frontmatter, "awn-runtime-load-always");
  }
  return readLegacyRuntimeLoadAlways(frontmatter);
}

function readFrontmatterBooleanProp(frontmatter, key) {
  const props = parseFrontmatterProps(frontmatter);
  const normalizedKey = normalizeFrontmatterPropKey(key);
  const entry = props.find((item) => normalizeFrontmatterPropKey(item.key) === normalizedKey);
  if (entry?.kind === "bool") return Boolean(entry.value);
  const scalar = getFrontmatterPropValue(props, key) || getYamlScalar(frontmatter, key);
  if (!scalar) return false;
  const value = String(scalar).trim().toLowerCase();
  return value === "true" || value === "yes" || value === "1" || value === "да";
}

function extractRuntimePropsFromFrontmatter(frontmatter) {
  const props = parseFrontmatterProps(frontmatter);
  const runtimeLoadAlways = readRuntimeLoadAlwaysFromFrontmatter(frontmatter);
  return {
    runtimeLoadAlways,
    runtimeLoadLabel: RUNTIME_LOAD_ALWAYS_LABELS[String(Boolean(runtimeLoadAlways))] || RUNTIME_LOAD_ALWAYS_LABELS.false,
    runtimeCron: readFrontmatterBooleanProp(frontmatter, "awn-runtime-cron"),
    runtimeCronSchedule:
      getFrontmatterPropValue(props, "awn-runtime-cron-schedule") ||
      getYamlScalar(frontmatter, "awn-runtime-cron-schedule"),
    runtimeHeartbeat: readFrontmatterBooleanProp(frontmatter, "awn-runtime-heartbeat"),
    runtimeCommands: readFrontmatterBooleanProp(frontmatter, "awn-runtime-commands")
  };
}

function normalizeFrontmatterPropKey(key) {
  return String(key || "").trim();
}

function parseFrontmatterProps(frontmatter) {
  const lines = String(frontmatter || "").replace(/^\uFEFF/, "").split(/\r?\n/);
  const entries = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith("#")) {
      index += 1;
      continue;
    }

    const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
    if (!match || match[1].length > 0) {
      index += 1;
      continue;
    }

    const key = normalizeFrontmatterPropKey(match[2].trim());
    const rest = match[3];

    if (rest === "" || rest === "|" || rest === ">") {
      const items = [];
      index += 1;
      while (index < lines.length && /^\s+-\s?/.test(lines[index])) {
        items.push(lines[index].replace(/^\s+-\s?/, "").trim().replace(/^["']|["']$/g, ""));
        index += 1;
      }
      if (items.length) {
        entries.push({ key, kind: "array", value: items });
        continue;
      }
      entries.push({ key, kind: "string", value: "" });
      continue;
    }

    if (rest.startsWith("[") && rest.endsWith("]")) {
      const inner = rest.slice(1, -1).trim();
      const value = inner
        ? inner.split(",").map((part) => part.trim().replace(/^["']|["']$/g, ""))
        : [];
      entries.push({ key, kind: "array", value });
      index += 1;
      continue;
    }

    if (rest === "true" || rest === "false") {
      entries.push({ key, kind: "bool", value: rest === "true" });
      index += 1;
      continue;
    }

    if (rest === "null" || rest === "~") {
      entries.push({ key, kind: "null", value: null });
      index += 1;
      continue;
    }

    if (/^-?\d+(?:\.\d+)?$/.test(rest)) {
      entries.push({ key, kind: "number", value: Number(rest) });
      index += 1;
      continue;
    }

    entries.push({ key, kind: "string", value: String(parseYamlScalar(rest) ?? "") });
    index += 1;
  }

  return entries;
}

function getFrontmatterPropValue(entries, key) {
  const normalizedKey = normalizeFrontmatterPropKey(key);
  const entry = entries.find((item) => normalizeFrontmatterPropKey(item.key) === normalizedKey);
  if (!entry) return "";
  if (entry.kind === "array") return (entry.value || []).join(", ");
  if (entry.kind === "bool") return entry.value ? "true" : "false";
  if (entry.kind === "null") return "";
  return String(entry.value ?? "").trim();
}

function isEmptyAwnTimestampValue(value) {
  const raw = String(value ?? "").trim();
  return !raw || raw === '""' || raw === "''" || raw === "~" || raw === "null";
}

function upsertFrontmatterScalar(frontmatter, key, value) {
  const lines = String(frontmatter || "").split("\n");
  const pattern = new RegExp(`^${key}:\\s*`);
  let replaced = false;
  const nextLines = lines.map((line) => {
    if (pattern.test(line)) {
      replaced = true;
      return `${key}: ${value}`;
    }
    return line;
  });
  if (!replaced) nextLines.push(`${key}: ${value}`);
  return nextLines.join("\n");
}

function parseAwnVersionNumber(value) {
  const raw = String(value ?? "").trim().replace(/^["']|["']$/g, "");
  if (!raw) return 0;
  if (/^\d+$/.test(raw)) return Number(raw);
  const semver = raw.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (semver) return Number(semver[3]);
  return 0;
}

function bumpAwnVersion(version) {
  return String(Math.max(1, parseAwnVersionNumber(version) + 1));
}

function applyAwnVersionToFrontmatter(frontmatter, { diskFrontmatter = "" } = {}) {
  let next = String(frontmatter || "");
  const payloadVersion = getYamlScalar(next, "awn-version");
  const diskVersion = getYamlScalar(diskFrontmatter, "awn-version");
  const baseVersion = !isEmptyAwnTimestampValue(diskVersion)
    ? diskVersion
    : payloadVersion;
  if (isEmptyAwnTimestampValue(baseVersion)) {
    return upsertFrontmatterScalar(next, "awn-version", "1");
  }
  return upsertFrontmatterScalar(next, "awn-version", bumpAwnVersion(baseVersion));
}

function mergePersistedAwnCreateFromDisk(frontmatter, diskFrontmatter) {
  let next = String(frontmatter || "");
  const payloadCreated = getYamlScalar(next, "awn-create");
  if (!isEmptyAwnTimestampValue(payloadCreated)) return next;
  const diskCreated = getYamlScalar(diskFrontmatter, "awn-create");
  if (isEmptyAwnTimestampValue(diskCreated)) return next;
  return upsertFrontmatterScalar(next, "awn-create", diskCreated);
}

function applyAwnTimestampsToFrontmatter(frontmatter, { diskFrontmatter = "" } = {}) {
  const now = new Date().toISOString();
  let next = mergePersistedAwnCreateFromDisk(frontmatter, diskFrontmatter);
  const created = getYamlScalar(next, "awn-create");
  if (isEmptyAwnTimestampValue(created)) {
    next = upsertFrontmatterScalar(next, "awn-create", now);
  }
  next = upsertFrontmatterScalar(next, "awn-update", now);
  next = applyAwnVersionToFrontmatter(next, { diskFrontmatter });
  return next;
}

function applyAwnTimestampsToMarkdownContent(content, diskFrontmatter = "") {
  const text = String(content ?? "");
  if (!/^---\r?\n/.test(text)) return text;
  const { frontmatter, body } = splitNodeFrontmatter(text);
  const nextFrontmatter = applyAwnTimestampsToFrontmatter(frontmatter, { diskFrontmatter });
  return joinNodeFrontmatter(nextFrontmatter, body);
}

function excerptText(text, maxLen = 220) {
  const cleaned = String(text || "")
    .replace(/^---[\s\S]*?---\s*/m, "")
    .replace(/[#>*`\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen).trim()}…`;
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCsvText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (!lines.length) return { columns: [], rows: [] };
  const parsed = lines.map(parseCsvLine);
  const columns = parsed[0] || [];
  const rows = parsed.slice(1);
  return { columns, rows };
}

async function readInternalMemoryContent(relPath) {
  const resolvedRelPath = await resolveExistingWorkspaceRelPath(relPath);
  const memoryRelPath = toContentFilePath(resolvedRelPath);
  if (!memoryRelPath) return { path: memoryRelPath, content: "", exists: false };
  const bundleHit = await readExistingBundleFile(resolvedRelPath, BUNDLE_CONTENT_FILE);
  return {
    path: bundleHit.exists ? bundleHit.path : memoryRelPath,
    content: bundleHit.content,
    exists: bundleHit.exists
  };
}

async function readTodoContent(relPath) {
  const resolvedRelPath = await resolveExistingWorkspaceRelPath(relPath);
  const todoRelPath = toTodoFilePath(resolvedRelPath);
  const todoAbsolute = normalizeWorkspacePath(todoRelPath);
  if (!todoAbsolute) return { path: todoRelPath, content: "", exists: false };

  try {
    const content = await fs.readFile(todoAbsolute, "utf-8");
    return { path: todoRelPath, content, exists: true };
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }

  return { path: todoRelPath, content: "", exists: false };
}

async function readTabularMemoryContent(relPath) {
  const resolvedRelPath = await resolveExistingWorkspaceRelPath(relPath);
  const tabularRelPath = toTabularFilePath(resolvedRelPath);
  if (!tabularRelPath) {
    return { path: tabularRelPath, content: "", exists: false, columns: [], rows: [], rowCount: 0 };
  }

  const bundleHit = await readExistingBundleFile(resolvedRelPath, BUNDLE_TABULAR_FILE);
  if (bundleHit.exists) {
    const parsed = parseCsvText(bundleHit.content);
    return {
      path: tabularRelPath,
      content: bundleHit.content,
      exists: true,
      columns: parsed.columns,
      rows: parsed.rows,
      rowCount: parsed.rows.length
    };
  }

  return { path: tabularRelPath, content: "", exists: false, columns: [], rows: [], rowCount: 0 };
}

async function buildMemorySummary(relPath) {
  const resolvedRelPath = await resolveExistingWorkspaceRelPath(relPath);
  const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
  if (!nodeAbsolute || !isManifestMdAbsolute(nodeAbsolute)) {
    return null;
  }

  const internal = await readInternalMemoryContent(resolvedRelPath);
  const internalSummary = {
    exists: internal.exists,
    path: internal.path,
    charCount: internal.content.length,
    excerpt: excerptText(internal.content)
  };

  const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_CONTENT);
  let externalSummary = { exists: false, count: 0, path: null, recent: [] };
  if (folderAbsolute) {
    try {
      const stat = await fs.stat(folderAbsolute);
      if (stat.isDirectory()) {
        const files = await collectMarkdownFiles(folderAbsolute);
        const recentCandidates = [...files]
          .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
          .slice(0, 3);
        const recent = [];
        for (const file of recentCandidates) {
          let excerpt = "";
          try {
            const raw = await fs.readFile(path.join(folderAbsolute, file.relativePath), "utf-8");
            excerpt = excerptText(raw, 140);
          } catch {
            excerpt = "";
          }
          recent.push({
            path: file.relativePath,
            title: file.name.replace(/\.md$/i, ""),
            excerpt,
            updatedAt: file.updatedAt
          });
        }
        externalSummary = {
          exists: files.length > 0,
          count: files.length,
          path: path.relative(getAgentRoot(), folderAbsolute).replace(/\\/g, "/"),
          recent
        };
      }
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
    }
  }

  const tabular = await readTabularMemoryContent(resolvedRelPath);
  const tabularSummary = {
    exists: tabular.exists,
    path: tabular.path,
    rowCount: tabular.rowCount || 0,
    columnCount: tabular.columns.length,
    columns: tabular.columns.slice(0, 8),
    previewRows: tabular.rows.slice(0, 3)
  };

  const existingDrivers = [];
  if (internalSummary.exists) existingDrivers.push("internal");
  if (externalSummary.count > 0) existingDrivers.push("external");
  if (tabularSummary.exists) existingDrivers.push("tabular");

  return {
    enabledDrivers: ["internal", "external", "tabular"],
    existingDrivers,
    drivers: {
      internal: internalSummary,
      external: externalSummary,
      tabular: tabularSummary
    }
  };
}

function splitNodeFrontmatter(raw = "") {
  const text = String(raw).replace(/^\uFEFF/, "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: text };
  return {
    frontmatter: match[1],
    body: match[2].replace(/^\r?\n?/, "")
  };
}

function joinNodeFrontmatter(frontmatter, body) {
  const fm = String(frontmatter ?? "").trim();
  const mdBody = String(body ?? "");
  if (!fm) return mdBody;
  if (!mdBody) return `---\n${fm}\n---\n`;
  return `---\n${fm}\n---\n\n${mdBody}`;
}

function mergeFrontmatterOverrides(baseFrontmatter, overrides = {}) {
  const lines = String(baseFrontmatter || "")
    .split("\n")
    .filter((line) => line.trim());
  const overrideKeys = new Set(Object.keys(overrides).map((key) => key.toLowerCase()));
  const kept = lines.filter((line) => {
    const key = line.split(":")[0]?.trim().toLowerCase();
    return key && !overrideKeys.has(key);
  });
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined || value === null) continue;
    kept.push(`${key}: ${formatYamlScalar(value)}`);
  }
  return kept.join("\n");
}

async function readNodeManifestRaw(nodeAbsolute) {
  try {
    return await fs.readFile(nodeAbsolute, "utf-8");
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function statNodeFileMeta(absolutePath) {
  if (!absolutePath) return null;
  try {
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) return null;
    return {
      size: stat.size,
      createdAt: stat.birthtime ? stat.birthtime.toISOString() : null,
      updatedAt: stat.mtime ? stat.mtime.toISOString() : null
    };
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function statNodeDirMeta(absolutePath) {
  if (!absolutePath) return null;
  try {
    const stat = await fs.stat(absolutePath);
    if (!stat.isDirectory()) return null;
    return {
      createdAt: stat.birthtime ? stat.birthtime.toISOString() : null,
      updatedAt: stat.mtime ? stat.mtime.toISOString() : null
    };
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function readNodeFrontmatterContent(nodeRelPath) {
  const resolvedRelPath = await resolveExistingWorkspaceRelPath(nodeRelPath);
  const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
  if (!nodeAbsolute) return { frontmatter: "", body: "", source: null };

  const raw = await readNodeManifestRaw(nodeAbsolute);
  if (raw === null) {
    return { frontmatter: "", body: "", source: null };
  }

  const { frontmatter, body } = splitNodeFrontmatter(raw);
  if (frontmatter.trim()) {
    return { frontmatter, body, source: "frontmatter" };
  }
  return { frontmatter: "", body, source: null };
}

function extractColorFromPropsYaml(content) {
  const text = String(content || "");
  for (const key of ["accent_color", "color"]) {
    const match = text.match(new RegExp(`^${key}:\\s*["']?([^"'\\n#]+)["']?\\s*$`, "m"));
    if (match) return match[1].trim();
  }
  return null;
}

function toConfigurationFilePath(relNodePath) {
  return path.join(getManifestContainerDirRel(relNodePath), BUNDLE_CONFIG_FILE).replace(/\\/g, "/");
}

function toEnvFilePath(relNodePath) {
  return path.join(getManifestContainerDirRel(relNodePath), ".env").replace(/\\/g, "/");
}

function toExternalMarkdownFileName(rawName) {
  const slug = sanitizeSlugInput(String(rawName || "").replace(/\.md$/i, "")) ||
    transliterateToSlug(String(rawName || "").replace(/\.md$/i, ""));
  if (!slug) return null;
  return `${slug}.md`;
}

function resolveObsidianSidecarAbsolute(nodeAbsolute, sidecarRelFn) {
  const rel = path.relative(getAgentRoot(), nodeAbsolute).replace(/\\/g, "/");
  return normalizeWorkspacePath(sidecarRelFn(rel));
}

function resolveObsidianTargetAbsolute(nodeAbsolute, mode) {
  const rel = path.relative(getAgentRoot(), nodeAbsolute).replace(/\\/g, "/");
  const storageRoot =
    normalizeWorkspacePath(getNamedStorageSlotDirRel(rel, getStoragePathOptions())) ||
    getNodeContainerDir(nodeAbsolute);
  if (mode === "internal") {
    return resolveObsidianSidecarAbsolute(nodeAbsolute, toContentFilePath);
  }
  if (mode === "tabular") {
    return resolveObsidianSidecarAbsolute(nodeAbsolute, toTabularFilePath);
  }
  if (mode === "description") {
    return nodeAbsolute;
  }
  if (mode === "external") {
    return path.join(storageRoot, STORAGE_SUBFOLDER_CONTENT);
  }
  if (mode === "inbox") {
    return path.join(storageRoot, STORAGE_SUBFOLDER_INBOX);
  }
  if (mode === "thread") {
    return path.join(storageRoot, STORAGE_SUBFOLDER_THREAD);
  }
  if (mode === "quick-notes") {
    return path.join(storageRoot, STORAGE_SUBFOLDER_QUICK_NOTES);
  }
  if (mode === "note") {
    return path.join(storageRoot, STORAGE_SUBFOLDER_NOTE);
  }
  if (mode === "references") {
    return path.join(storageRoot, STORAGE_SUBFOLDER_REFERENCES);
  }
  if (mode === "media") {
    return path.join(storageRoot, STORAGE_SUBFOLDER_MEDIA);
  }
  if (mode === "node-preview") {
    return resolveObsidianSidecarAbsolute(nodeAbsolute, (rel) => {
      const partBase = resolvePartFolderSidecarBaseRel(rel);
      if (partBase) return `${partBase}.preview`;
      return `${namedStorageBundleDirRel(rel)}/${PREVIEW_FILE_BASENAME}`;
    });
  }
  if (mode === "configs") {
    return resolveObsidianSidecarAbsolute(nodeAbsolute, toNodeConfigFilePath);
  }
  if (mode === "env") {
    const envRelPath = toEnvFilePath(path.relative(getAgentRoot(), nodeAbsolute).replace(/\\/g, "/"));
    return normalizeWorkspacePath(envRelPath);
  }
  if (mode === "todo") {
    return resolveObsidianSidecarAbsolute(nodeAbsolute, toTodoFilePath);
  }
  if (mode === "scripts") {
    return path.join(storageRoot, STORAGE_SUBFOLDER_SCRIPTS);
  }
  if (mode === "artefacts") {
    return path.join(storageRoot, STORAGE_SUBFOLDER_ARTEFACTS);
  }
  if (mode === "repository") {
    return path.join(storageRoot, STORAGE_SUBFOLDER_REPOSITORY);
  }
  return nodeAbsolute;
}

async function existsDirectory(absolutePath) {
  try {
    const stat = await fs.stat(absolutePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function findVaultRootForTarget(targetAbsolute) {
  let current = targetAbsolute;
  try {
    const currentStat = await fs.stat(targetAbsolute);
    if (!currentStat.isDirectory()) {
      current = path.dirname(targetAbsolute);
    }
  } catch {
    current = path.dirname(targetAbsolute);
  }

  while (true) {
    const obsidianConfigDir = path.join(current, ".obsidian");
    if (await existsDirectory(obsidianConfigDir)) {
      return current;
    }
    const parent = path.dirname(current);
    if (!parent || parent === current) break;
    current = parent;
  }

  return null;
}

async function buildObsidianUri(targetAbsolute) {
  const vaultRoot = await findVaultRootForTarget(targetAbsolute);
  if (vaultRoot) {
    const vaultName = path.basename(vaultRoot);
    const filePath = path.relative(vaultRoot, targetAbsolute).replace(/\\/g, "/");
    return `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`;
  }
  const fallbackVaultName = path.basename(getProjectRoot());
  const fallbackFilePath = path.relative(getProjectRoot(), targetAbsolute).replace(/\\/g, "/");
  return `obsidian://open?vault=${encodeURIComponent(fallbackVaultName)}&file=${encodeURIComponent(fallbackFilePath)}`;
}

async function renameIfExists(fromAbsolute, toAbsolute) {
  try {
    await fs.access(fromAbsolute);
    await renamePathCaseAware(fromAbsolute, toAbsolute);
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }
}

async function removeIfExists(absolutePath) {
  if (!absolutePath) return;
  const agentRoot = getAgentRoot();
  if (absolutePath === agentRoot) return;
  try {
    const stat = await fs.stat(absolutePath);
    if (!stat.isFile()) return;
    await fs.rm(absolutePath, { force: false });
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }
}

async function collectFolderEntries(folderAbsolute, prefix = "") {
  const entries = await fs.readdir(folderAbsolute, { withFileTypes: true });
  const chunks = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory() && shouldSkipExternalMemoryDirectory(entry.name)) continue;
    const absolute = path.join(folderAbsolute, entry.name);
    const relative = path.join(prefix, entry.name);

    if (entry.isDirectory()) {
      chunks.push(`📁 ${relative}/`);
      const nested = await collectFolderEntries(absolute, relative);
      chunks.push(...nested);
      continue;
    }

    if (entry.isFile()) {
      chunks.push(`📄 ${relative}`);
      continue;
    }

    // Other filesystem nodes are ignored in external memory listing.
  }

  return chunks;
}

async function collectExternalContentFolders(folderAbsolute, prefix = "") {
  const folders = [];
  let entries = [];
  try {
    entries = await fs.readdir(folderAbsolute, { withFileTypes: true });
  } catch {
    return folders;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (!entry.isDirectory()) continue;
    if (shouldSkipExternalMemoryDirectory(entry.name)) continue;
    const absolute = path.join(folderAbsolute, entry.name);
    const relative = path.join(prefix, entry.name).replace(/\\/g, "/");
    folders.push({ path: relative, name: entry.name });
    folders.push(...(await collectExternalContentFolders(absolute, relative)));
  }

  return folders;
}

async function collectMarkdownFiles(folderAbsolute, prefix = "") {
  const entries = await fs.readdir(folderAbsolute, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const absolute = path.join(folderAbsolute, entry.name);
    const relative = path.join(prefix, entry.name);

    if (entry.isDirectory()) {
      if (shouldSkipExternalMemoryDirectory(entry.name)) continue;
      const nested = await collectMarkdownFiles(absolute, relative);
      files.push(...nested);
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      const stat = await fs.stat(absolute);
      files.push({
        name: entry.name,
        relativePath: relative.replace(/\\/g, "/"),
        parent: path.dirname(relative).replace(/\\/g, "/"),
        createdAt: stat.birthtime ? stat.birthtime.toISOString() : null,
        updatedAt: stat.mtime ? stat.mtime.toISOString() : null
      });
    }
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "ru", { sensitivity: "base", numeric: true }));
  return files;
}

async function collectNonMarkdownFiles(folderAbsolute, prefix = "") {
  let entries = [];
  try {
    entries = await fs.readdir(folderAbsolute, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const absolute = path.join(folderAbsolute, entry.name);
    const relative = path.join(prefix, entry.name);

    if (entry.isDirectory()) {
      if (shouldSkipDirectoryListing(entry.name)) continue;
      files.push(...(await collectNonMarkdownFiles(absolute, relative)));
      continue;
    }

    if (entry.isFile() && !entry.name.toLowerCase().endsWith(".md")) {
      files.push({
        name: entry.name,
        relativePath: relative.replace(/\\/g, "/")
      });
    }
  }

  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath, "ru", { sensitivity: "base", numeric: true }));
  return files;
}

const WORKSPACE_BROWSE_IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".heic",
  ".avif",
  ".bmp"
]);
const WORKSPACE_BROWSE_VIDEO_EXTENSIONS = new Set([".mp4", ".mov", ".mkv", ".avi", ".webm"]);
const WORKSPACE_BROWSE_AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".flac"]);

function isWorkspaceBrowseImageFile(name) {
  return WORKSPACE_BROWSE_IMAGE_EXTENSIONS.has(path.extname(String(name || "")).toLowerCase());
}

function buildWorkspaceFolderFileUrl(fileRel, options = {}) {
  const params = new URLSearchParams({ file: String(fileRel || "").replace(/\\/g, "/") });
  if (options.thumb) params.set("thumb", "1");
  if (options.max) params.set("max", String(options.max || 480));
  return `/api/workspace/folder/file?${params.toString()}`;
}

function extractMarkdownExcerpt(body, maxLen = 240) {
  const text = String(body || "")
    .replace(/^#+\s.+$/gm, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`#>*_~|-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen).trim()}…`;
}

function extractFirstMarkdownImageSrc(body) {
  const match = String(body || "").match(/!\[[^\]]*\]\(([^)]+)\)/);
  if (!match) return null;
  const src = String(match[1] || "").trim();
  if (!src || /^https?:\/\//i.test(src)) return src || null;
  return src.replace(/\\/g, "/");
}

async function countFolderImmediateEntries(folderAbsolute) {
  try {
    const entries = await fs.readdir(folderAbsolute, { withFileTypes: true });
    return entries.filter((entry) => {
      if (entry.isDirectory()) return !shouldSkipDirectoryListing(entry.name);
      if (entry.isFile()) return !isHiddenMenuEntry(entry.name);
      return false;
    }).length;
  } catch {
    return 0;
  }
}

async function isFreeMemoryFolderAbsolute(folderAbsolute) {
  if (!folderAbsolute) return false;
  const manifestAbs = path.join(folderAbsolute, AREA_MANIFEST_FILE);
  const topicManifestAbs = path.join(folderAbsolute, MANIFEST_FILE);
  return !(await fileExists(manifestAbs)) && !(await fileExists(topicManifestAbs));
}

async function resolveWorkspaceFreeMemoryPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").trim();
  if (!normalized) return { error: "Missing path", status: 400 };
  const absolute = normalizeWorkspacePath(normalized);
  if (!absolute) return { error: "Invalid path", status: 400 };

  let stat;
  try {
    stat = await fs.stat(absolute);
  } catch (error) {
    if (error && error.code === "ENOENT") return { error: "Path not found", status: 404 };
    throw error;
  }

  if (stat.isDirectory()) {
    if (!(await isFreeMemoryFolderAbsolute(absolute))) {
      return { error: "Path is not free memory", status: 400 };
    }
    return { absolute, relPath: normalized, isDirectory: true };
  }

  if (stat.isFile()) {
    const parentRel = path.posix.dirname(normalized);
    if (!parentRel || parentRel === ".") return { error: "Invalid file path", status: 400 };
    const parentAbsolute = path.dirname(absolute);
    if (!(await isFreeMemoryFolderAbsolute(parentAbsolute))) {
      return { error: "Path is not free memory", status: 400 };
    }
    return {
      absolute,
      relPath: normalized,
      isDirectory: false,
      parentRel,
      parentAbsolute
    };
  }

  return { error: "Invalid path", status: 400 };
}

async function renameWorkspaceFreeMemoryPath(relPath, newNameRaw) {
  const ctx = await resolveWorkspaceFreeMemoryPath(relPath);
  if (ctx.error) return ctx;

  let newName = sanitizeMediaFileName(newNameRaw);
  if (!newName) return { error: "Invalid name", status: 400 };
  if (!ctx.isDirectory) {
    const oldExt = path.extname(ctx.relPath);
    if (!path.extname(newName) && oldExt) newName = `${newName}${oldExt}`;
  }

  const parentAbsolute = ctx.isDirectory ? path.dirname(ctx.absolute) : ctx.parentAbsolute;
  const parentRel = ctx.isDirectory ? path.posix.dirname(ctx.relPath) : ctx.parentRel;
  const targetAbsolute = path.join(parentAbsolute, newName);
  if (!isPathInsideDirectory(getAgentRoot(), targetAbsolute)) {
    return { error: "Invalid target path", status: 400 };
  }
  if (path.resolve(targetAbsolute) === path.resolve(ctx.absolute)) {
    return { path: ctx.relPath, name: newName };
  }

  try {
    await fs.access(targetAbsolute);
    return { error: "Target already exists", status: 409 };
  } catch {
    // Target does not exist.
  }

  await fs.rename(ctx.absolute, targetAbsolute);
  const newRel =
    parentRel && parentRel !== "."
      ? `${parentRel}/${newName}`.replace(/\/+/g, "/")
      : newName;
  return { path: newRel, name: newName, oldPath: ctx.relPath };
}

async function moveWorkspaceFreeMemoryPath(relPath, parentPathRaw) {
  const ctx = await resolveWorkspaceFreeMemoryPath(relPath);
  if (ctx.error) return ctx;

  const parentPath = String(parentPathRaw ?? "").replace(/\\/g, "/").trim() || ".";
  const parentAbsolute = await resolveExistingWorkspaceDirAbsolute(parentPath === "." ? "" : parentPath);
  if (!parentAbsolute) return { error: "Invalid parent path", status: 400 };
  if (!(await isFreeMemoryFolderAbsolute(parentAbsolute))) {
    return { error: "Target folder is not free memory", status: 400 };
  }

  const baseName = path.basename(ctx.absolute);
  const targetAbsolute = path.join(parentAbsolute, baseName);
  if (!isPathInsideDirectory(getAgentRoot(), targetAbsolute)) {
    return { error: "Invalid target path", status: 400 };
  }
  if (path.resolve(targetAbsolute) === path.resolve(ctx.absolute)) {
    return { path: ctx.relPath };
  }
  if (ctx.isDirectory && isPathInsideDirectory(ctx.absolute, parentAbsolute)) {
    return { error: "Cannot move folder into itself", status: 400 };
  }

  try {
    await fs.access(targetAbsolute);
    return { error: "Target already exists", status: 409 };
  } catch {
    // Target does not exist.
  }

  await fs.rename(ctx.absolute, targetAbsolute);
  const newRel =
    parentPath && parentPath !== "."
      ? `${parentPath.replace(/\/+$/, "")}/${baseName}`.replace(/\/+/g, "/")
      : baseName;
  return { path: newRel, oldPath: ctx.relPath };
}

async function deleteWorkspaceFreeMemoryPaths(pathsRaw) {
  const paths = Array.isArray(pathsRaw) ? pathsRaw : [];
  if (!paths.length) return { error: "Missing paths", status: 400 };

  const deleted = [];
  for (const relPath of paths) {
    const ctx = await resolveWorkspaceFreeMemoryPath(relPath);
    if (ctx.error) return ctx;
    if (ctx.isDirectory) {
      await fs.rm(ctx.absolute, { recursive: true, force: false });
    } else {
      await fs.rm(ctx.absolute, { force: false });
    }
    deleted.push(ctx.relPath);
  }
  return { deleted };
}

async function enrichWorkspaceFolderMarkdownPage(fileRelPath) {
  const normalizedRel = String(fileRelPath || "").replace(/\\/g, "/").trim();
  const fileAbsolute = normalizeWorkspacePath(normalizedRel);
  const baseName = path.basename(normalizedRel);
  const base = {
    name: baseName,
    path: normalizedRel,
    isManifest: baseName.toLowerCase() === "manifest.md"
  };
  if (!fileAbsolute) {
    return {
      ...base,
      title: baseName.replace(/\.md$/i, ""),
      excerpt: "",
      previewUrl: null,
      status: null,
      tags: null,
      manifestPath: null,
      updatedAt: null
    };
  }

  try {
    const raw = await fs.readFile(fileAbsolute, "utf-8");
    const stat = await fs.stat(fileAbsolute);
    const { frontmatter, body } = splitNodeFrontmatter(raw);
    const props = parseFrontmatterProps(frontmatter);
    const previewRaw =
      getFrontmatterPropValue(props, "awn-preview") || getYamlScalar(frontmatter, "awn-preview") || "";
    let previewUrl = null;
    const previewValue = String(previewRaw || "").trim();
    if (/^https?:\/\//i.test(previewValue)) {
      previewUrl = previewValue;
    } else {
      const inlineImg = extractFirstMarkdownImageSrc(body);
      if (inlineImg) {
        if (/^https?:\/\//i.test(inlineImg)) {
          previewUrl = inlineImg;
        } else {
          const folderRel = path.posix.dirname(normalizedRel);
          const resolved = path.posix.normalize(path.posix.join(folderRel, inlineImg));
          if (normalizeWorkspacePath(resolved)) {
            previewUrl = buildWorkspaceFolderFileUrl(resolved, { thumb: true, max: 480 });
          }
        }
      }
    }

    const slug = normalizedRel.replace(/\.md$/i, "").split("/").pop() || baseName;
    const awnName =
      getFrontmatterPropValue(props, "awn-name") || getYamlScalar(frontmatter, "awn-name") || "";
    const title = resolveNodeDisplayName(awnName, slug);
    const isManifest = base.isManifest;
    return {
      ...base,
      title,
      excerpt: extractMarkdownExcerpt(body),
      previewUrl,
      status: getFrontmatterPropValue(props, "awn-status") || getYamlScalar(frontmatter, "awn-status") || null,
      tags: getFrontmatterPropValue(props, "awn-tags") || getYamlScalar(frontmatter, "awn-tags") || null,
      manifestPath: isManifest ? normalizedRel : null,
      updatedAt: stat.mtime ? stat.mtime.toISOString() : null
    };
  } catch {
    return {
      ...base,
      title: baseName.replace(/\.md$/i, ""),
      excerpt: "",
      previewUrl: null,
      status: null,
      tags: null,
      manifestPath: base.isManifest ? normalizedRel : null,
      updatedAt: null
    };
  }
}

async function browseWorkspaceFolderImmediate(folderRelPath) {
  const normalizedFolder = String(folderRelPath || "")
    .replace(/\\/g, "/")
    .replace(/\/+$/, "")
    .trim();
  const isAgentRoot = !normalizedFolder || normalizedFolder === ".";
  const folderAbsolute = isAgentRoot ? getAgentRoot() : normalizeWorkspacePath(normalizedFolder);
  if (!folderAbsolute) {
    return { exists: false, error: "Invalid folder path" };
  }

  let stat;
  try {
    stat = await fs.stat(folderAbsolute);
  } catch (error) {
    if (error && error.code === "ENOENT") return { exists: false };
    throw error;
  }
  if (!stat.isDirectory()) return { exists: false };

  const folderPathKey = isAgentRoot ? "." : normalizedFolder;
  const entries = await fs.readdir(folderAbsolute, { withFileTypes: true });
  const folders = [];
  const images = [];
  const pages = [];
  const videos = [];
  const audio = [];
  const other = [];
  const collator = (a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""), "ru", { sensitivity: "base", numeric: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (shouldSkipDirectoryListing(entry.name)) continue;
      const childRel = isAgentRoot ? entry.name : path.posix.join(normalizedFolder, entry.name);
      const childAbsolute = path.join(folderAbsolute, entry.name);
      const itemCount = await countFolderImmediateEntries(childAbsolute);
      folders.push({ name: entry.name, folderPath: childRel, itemCount });
      continue;
    }

    if (!entry.isFile()) continue;
    if (isHiddenMenuEntry(entry.name)) continue;

    const fileRel = isAgentRoot ? entry.name : path.posix.join(normalizedFolder, entry.name);
    const fileAbsolute = path.join(folderAbsolute, entry.name);
    const fileStat = await fs.stat(fileAbsolute);
    const ext = path.extname(entry.name).toLowerCase();
    const base = {
      name: entry.name,
      path: fileRel,
      size: fileStat.size,
      updatedAt: fileStat.mtime ? fileStat.mtime.toISOString() : null
    };

    if (isWorkspaceBrowseImageFile(entry.name)) {
      images.push({
        ...base,
        previewUrl: buildWorkspaceFolderFileUrl(fileRel, { thumb: true, max: 480 })
      });
      continue;
    }

    if (ext === ".md") {
      pages.push(await enrichWorkspaceFolderMarkdownPage(fileRel));
      continue;
    }

    if (WORKSPACE_BROWSE_VIDEO_EXTENSIONS.has(ext)) {
      videos.push({ ...base, previewUrl: buildWorkspaceFolderFileUrl(fileRel) });
      continue;
    }

    if (WORKSPACE_BROWSE_AUDIO_EXTENSIONS.has(ext)) {
      audio.push({ ...base, previewUrl: buildWorkspaceFolderFileUrl(fileRel) });
      continue;
    }

    other.push({ ...base, ext });
  }

  folders.sort(collator);
  images.sort(collator);
  pages.sort((a, b) =>
    String(a.title || a.name || "").localeCompare(String(b.title || b.name || ""), "ru", {
      sensitivity: "base",
      numeric: true
    })
  );
  videos.sort(collator);
  audio.sort(collator);
  other.sort(collator);

  return {
    exists: true,
    folderPath: folderPathKey,
    title: isAgentRoot ? path.basename(getAgentRoot()) : path.basename(normalizedFolder),
    folders,
    images,
    pages,
    videos,
    audio,
    other,
    counts: {
      folders: folders.length,
      images: images.length,
      pages: pages.length,
      videos: videos.length,
      audio: audio.length,
      other: other.length
    }
  };
}

const WORKSPACE_TEXT_FILE_EXTENSIONS = new Set([
  ".md",
  ".txt",
  ".csv",
  ".json",
  ".yaml",
  ".yml",
  ".html",
  ".htm",
  ".xml",
  ".log",
  ".pine"
]);
const WORKSPACE_FOLDER_SCAN_MAX_ITEMS = 500;
const WORKSPACE_TEXT_FILE_MAX_BYTES = 120_000;

function resolveWorkspaceFolderScanDepth(raw) {
  const value = String(raw ?? "1").trim().toLowerCase();
  if (value === "all" || value === "0") return Number.POSITIVE_INFINITY;
  const num = Number.parseInt(value, 10);
  if (Number.isFinite(num) && num >= 1) return num;
  return 1;
}

function isWorkspaceTextFile(name) {
  return WORKSPACE_TEXT_FILE_EXTENSIONS.has(path.extname(String(name || "")).toLowerCase());
}

function summarizeWorkspaceFolderScanItems(items = []) {
  const counts = {
    folders: 0,
    images: 0,
    pages: 0,
    videos: 0,
    audio: 0,
    files: 0,
    total: items.length
  };
  for (const item of items) {
    if (item.kind === "folder") counts.folders += 1;
    else if (item.kind === "image") counts.images += 1;
    else if (item.kind === "page") counts.pages += 1;
    else if (item.kind === "video") counts.videos += 1;
    else if (item.kind === "audio") counts.audio += 1;
    else counts.files += 1;
  }
  return counts;
}

function collectAdoptFoldersFromMenuNode(node, results = [], parentPath = null) {
  if (!node || typeof node !== "object") return results;

  const sections = Array.isArray(node.sections) ? node.sections : [];
  for (const section of sections) {
    const folderPath = String(section.folderPath || "")
      .replace(/\\/g, "/")
      .trim();
    if (folderPath && !section.indexPath) {
      results.push({
        title: section.title || path.basename(folderPath),
        folderPath,
        empty: Boolean(section.empty),
        parentPath,
        childTopics: Array.isArray(section.items) ? section.items.length : 0,
        childFolders: Array.isArray(section.sections) ? section.sections.length : 0,
        hasGitSelf: Boolean(section.hasGitSelf),
        hasObsidianSelf: Boolean(section.hasObsidianSelf),
        hasAgentSelf: Boolean(section.hasAgentSelf)
      });
    }
    if (folderPath) {
      collectAdoptFoldersFromMenuNode(section, results, folderPath);
    }
  }

  return results;
}

async function listWorkspaceAdoptFolders() {
  const menu = await buildAgentMenu(getAgentRoot());
  const folders = [];
  collectAdoptFoldersFromMenuNode(menu, folders, null);
  if (menu.containerTree) collectAdoptFoldersFromMenuNode(menu.containerTree, folders, getAgentContainerFolder());
  if (menu.sharedTree) collectAdoptFoldersFromMenuNode(menu.sharedTree, folders, getAgentSharedFolder());
  if (menu.serviceTree) collectAdoptFoldersFromMenuNode(menu.serviceTree, folders, getAgentKitFolder());

  const deduped = [];
  const seen = new Set();
  for (const entry of folders) {
    if (!entry.folderPath || seen.has(entry.folderPath)) continue;
    seen.add(entry.folderPath);
    deduped.push(entry);
  }

  deduped.sort((a, b) =>
    String(a.folderPath || "").localeCompare(String(b.folderPath || ""), "ru", {
      sensitivity: "base",
      numeric: true
    })
  );

  return { folders: deduped, count: deduped.length };
}

async function scanWorkspaceFolder(folderRelPath, options = {}) {
  const normalizedFolder = String(folderRelPath || "")
    .replace(/\\/g, "/")
    .replace(/\/+$/, "")
    .trim();
  const folderAbsolute = normalizeWorkspacePath(normalizedFolder);
  if (!folderAbsolute) {
    return { exists: false, error: "Invalid folder path" };
  }

  try {
    const stat = await fs.stat(folderAbsolute);
    if (!stat.isDirectory()) return { exists: false };
  } catch (error) {
    if (error && error.code === "ENOENT") return { exists: false };
    throw error;
  }

  const maxDepth = resolveWorkspaceFolderScanDepth(options.depth);
  const includeBody = Boolean(options.includeBody);
  const maxBodyChars = Math.min(
    Math.max(Number.parseInt(String(options.maxBodyChars || "4000"), 10) || 4000, 200),
    20_000
  );
  const items = [];
  let truncated = false;

  async function walk(currentRel, depth) {
    if (truncated || depth > maxDepth) return;
    const browse = await browseWorkspaceFolderImmediate(currentRel);
    if (!browse.exists) return;

    for (const folder of browse.folders || []) {
      if (items.length >= WORKSPACE_FOLDER_SCAN_MAX_ITEMS) {
        truncated = true;
        return;
      }
      items.push({
        kind: "folder",
        name: folder.name,
        path: folder.folderPath,
        folderPath: folder.folderPath,
        parentFolder: currentRel,
        depth,
        itemCount: folder.itemCount || 0
      });
      if (depth < maxDepth) {
        await walk(folder.folderPath, depth + 1);
      }
    }

    const appendItems = (entries, kind) => {
      for (const entry of entries || []) {
        if (items.length >= WORKSPACE_FOLDER_SCAN_MAX_ITEMS) {
          truncated = true;
          return;
        }
        items.push({
          kind,
          name: entry.name,
          path: entry.path,
          parentFolder: currentRel,
          depth,
          size: entry.size ?? null,
          updatedAt: entry.updatedAt ?? null,
          title: entry.title ?? null,
          excerpt: entry.excerpt ?? null,
          tags: entry.tags ?? null,
          status: entry.status ?? null,
          manifestPath: entry.manifestPath ?? null,
          ext: entry.ext ?? null
        });
      }
    };

    appendItems(browse.images, "image");
    appendItems(browse.pages, "page");
    appendItems(browse.videos, "video");
    appendItems(browse.audio, "audio");
    appendItems(browse.other, "file");
  }

  await walk(normalizedFolder, 1);

  if (includeBody) {
    for (const item of items) {
      if (item.kind !== "page" && item.kind !== "file") continue;
      if (!item.path || !isWorkspaceTextFile(item.path)) continue;
      const fileAbsolute = normalizeWorkspacePath(item.path);
      if (!fileAbsolute) continue;
      try {
        const stat = await fs.stat(fileAbsolute);
        if (!stat.isFile() || stat.size > WORKSPACE_TEXT_FILE_MAX_BYTES) {
          item.bodyTruncated = true;
          continue;
        }
        const raw = await fs.readFile(fileAbsolute, "utf-8");
        const { body } = item.kind === "page" ? splitNodeFrontmatter(raw) : { body: raw };
        item.body =
          body.length > maxBodyChars ? `${body.slice(0, maxBodyChars).trim()}…` : body;
        item.bodyTruncated = body.length > maxBodyChars;
      } catch {
        // skip unreadable files
      }
    }
  }

  return {
    exists: true,
    folderPath: normalizedFolder,
    depth: Number.isFinite(maxDepth) ? maxDepth : "all",
    truncated,
    counts: summarizeWorkspaceFolderScanItems(items),
    items
  };
}

async function readWorkspaceTextFile(fileRelPath, options = {}) {
  const normalizedRel = String(fileRelPath || "").replace(/\\/g, "/").trim();
  const fileAbsolute = normalizeWorkspacePath(normalizedRel);
  if (!fileAbsolute) return { exists: false, error: "Invalid file path" };
  if (!isWorkspaceTextFile(normalizedRel)) {
    return { exists: false, error: "Not a supported text file" };
  }

  try {
    const stat = await fs.stat(fileAbsolute);
    if (!stat.isFile()) return { exists: false, error: "File not found" };
    const maxBytes = Math.min(
      Math.max(Number.parseInt(String(options.maxBytes || WORKSPACE_TEXT_FILE_MAX_BYTES), 10) || WORKSPACE_TEXT_FILE_MAX_BYTES, 1024),
      WORKSPACE_TEXT_FILE_MAX_BYTES
    );
    const truncated = stat.size > maxBytes;
    const buffer = truncated
      ? Buffer.alloc(maxBytes)
      : await fs.readFile(fileAbsolute);
    if (truncated) {
      const fd = await fs.open(fileAbsolute, "r");
      try {
        await fd.read(buffer, 0, maxBytes, 0);
      } finally {
        await fd.close();
      }
    }
    const content = buffer.toString("utf-8");
    const ext = path.extname(normalizedRel).toLowerCase();
    const result = {
      exists: true,
      path: normalizedRel,
      name: path.basename(normalizedRel),
      size: stat.size,
      truncated,
      content
    };
    if (ext === ".md") {
      const { frontmatter, body } = splitNodeFrontmatter(content);
      result.frontmatter = frontmatter;
      result.body = body;
      result.page = await enrichWorkspaceFolderMarkdownPage(normalizedRel);
    }
    return result;
  } catch (error) {
    if (error && error.code === "ENOENT") return { exists: false, error: "File not found" };
    throw error;
  }
}

async function enrichExternalMarkdownFilePreview(manifestRelPath, folderAbsolute, fileEntry) {
  const fileAbsolute = path.join(folderAbsolute, fileEntry.relativePath);
  try {
    const raw = await fs.readFile(fileAbsolute, "utf-8");
    const { frontmatter } = splitNodeFrontmatter(raw);
    const props = parseFrontmatterProps(frontmatter);
    const previewRaw = getFrontmatterPropValue(props, "awn-preview") || getYamlScalar(frontmatter, "awn-preview");
    const previewMeta = await resolveAwnPreviewFieldMeta(manifestRelPath, previewRaw);
    const slug =
      getManifestSlugFromRel(fileEntry.relativePath) || fileEntry.name.replace(/\.md$/i, "");
    const awnName =
      getFrontmatterPropValue(props, "awn-name") ||
      getYamlScalar(frontmatter, "awn-name") ||
      "";
    const title = resolveNodeDisplayName(awnName, slug);
    return {
      ...fileEntry,
      title,
      props,
      status: getFrontmatterPropValue(props, "awn-status") || getYamlScalar(frontmatter, "awn-status") || null,
      tags: getFrontmatterPropValue(props, "awn-tags") || getYamlScalar(frontmatter, "awn-tags") || null,
      hasPreview: Boolean(previewMeta.hasPreview),
      previewUrl: previewMeta.previewUrl || null,
      previewFile: previewMeta.previewFile || null
    };
  } catch {
    const slug =
      getManifestSlugFromRel(fileEntry.relativePath) || fileEntry.name.replace(/\.md$/i, "");
    return {
      ...fileEntry,
      title: slug,
      props: [],
      status: null,
      tags: null,
      hasPreview: false,
      previewUrl: null,
      previewFile: null
    };
  }
}

function normalizeRelativeFilePath(input) {
  const normalized = path.normalize(String(input || "")).replace(/^(\.\.[\/\\])+/, "");
  if (!normalized || normalized.startsWith("..") || path.isAbsolute(normalized)) return null;
  return normalized;
}

const BLOCKED_STORAGE_FILE_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".com",
  ".msi",
  ".scr"
]);

function getStorageFileBaseName(relFile) {
  const posix = String(relFile || "").replace(/\\/g, "/");
  const slash = posix.lastIndexOf("/");
  return slash >= 0 ? posix.slice(slash + 1) : posix;
}

function isBlockedStorageFileExtension(filename) {
  const ext = path.extname(String(filename || "")).toLowerCase();
  if (!ext) return false;
  return BLOCKED_STORAGE_FILE_EXTENSIONS.has(ext);
}

const ALLOWED_SCRIPT_STORAGE_EXTENSIONS = new Set([
  ".js",
  ".ts",
  ".jsx",
  ".tsx",
  ".mjs",
  ".cjs",
  ".py",
  ".rb",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".sh",
  ".bash",
  ".zsh",
  ".fish",
  ".ps1",
  ".bat",
  ".cmd",
  ".md",
  ".txt",
  ".json",
  ".yaml",
  ".yml",
  ".toml",
  ".ini",
  ".cfg",
  ".conf",
  ".sql",
  ".graphql",
  ".xml",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".less",
  ".vue",
  ".svelte",
  ".php",
  ".pl",
  ".r",
  ".lua",
  ".swift",
  ".scala",
  ".clj"
]);

function shouldSkipStoragePolicyFileName(fileName, { slotKey } = {}) {
  const name = String(fileName || "");
  if (!name || name === ".DS_Store") return true;
  if (name.startsWith(".")) return true;
  if (isAreaManifestFileName(name)) return true;
  if (slotKey === "media" && name.toLowerCase().endsWith(".sidecar.md")) return true;
  return false;
}

function getStorageFilePolicyViolationReason(fileName, slotKey) {
  if (!slotKey || shouldSkipStoragePolicyFileName(fileName, { slotKey })) return null;
  const baseName = getStorageFileBaseName(fileName);
  if (isBlockedStorageFileExtension(baseName)) return "blocked-executable";

  const lowerName = baseName.toLowerCase();
  const ext = path.extname(baseName).toLowerCase();

  switch (slotKey) {
    case "memory":
    case "inbox":
    case "quick-notes":
    case "note":
    case "references":
    case "thread":
      if (!lowerName.endsWith(".md")) return "expected-markdown";
      return null;
    case "media":
      if (!ext) return "unsupported-media-type";
      if (classifyMediaGroup(ext) === "Other") return "unsupported-media-type";
      return null;
    case "scripts":
      if (!ext) return "expected-script-or-text";
      if (!ALLOWED_SCRIPT_STORAGE_EXTENSIONS.has(ext)) return "expected-script-or-text";
      return null;
    case "artefacts":
    case "repository":
    case "temp":
      return null;
    default:
      return null;
  }
}

async function scanStorageFolderPolicyViolations(folderAbsolute, slotKey, { maxSamples = 5 } = {}) {
  if (!folderAbsolute || !slotKey) return { count: 0, samples: [] };

  let count = 0;
  const samples = [];

  async function walk(dirAbsolute, relPrefix = "") {
    let entries = [];
    try {
      entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const relPath = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (shouldSkipDirectoryListing(entry.name)) continue;
        await walk(path.join(dirAbsolute, entry.name), relPath.replace(/\\/g, "/"));
        continue;
      }
      if (!entry.isFile()) continue;

      const reason = getStorageFilePolicyViolationReason(entry.name, slotKey);
      if (!reason) continue;
      count += 1;
      if (samples.length < maxSamples) {
        samples.push({
          path: relPath.replace(/\\/g, "/"),
          fileName: entry.name,
          reason
        });
      }
    }
  }

  await walk(folderAbsolute);
  return { count, samples };
}

function isAllowedHiddenStorageFileName(baseName) {
  const name = String(baseName || "");
  if (!name.startsWith(".")) return true;
  if (name === ".gitkeep") return true;
  if (name === ".env" || name.startsWith(".env.")) return true;
  return false;
}

function validateStorageFileRequest(relFile, storageFolder, { write = false } = {}) {
  const normalizedRelFile = normalizeRelativeFilePath(relFile);
  if (!normalizedRelFile) return { error: "Invalid file path" };

  const baseName = getStorageFileBaseName(normalizedRelFile);
  if (!baseName || baseName === "." || baseName === "..") return { error: "Invalid file path" };
  if (!isAllowedHiddenStorageFileName(baseName)) return { error: "Hidden files are not allowed" };
  if (isBlockedStorageFileExtension(baseName)) return { error: "File extension is not allowed" };

  const canonicalFolder = normalizeStorageSubfolderName(storageFolder);
  if (write) {
    if (!isStorageFileWriteSlotName(canonicalFolder)) {
      return { error: "Writing is not allowed for this storage folder" };
    }
    if (canonicalFolder === STORAGE_SUBFOLDER_MAIN && baseName.toLowerCase().endsWith(".md")) {
      return { error: "Use external memory tools for .md in main/" };
    }
  } else if (!isStorageFileReadSlotName(canonicalFolder)) {
    return { error: "Reading is not allowed for this storage folder" };
  }

  return { normalizedRelFile, baseName, folder: canonicalFolder };
}

async function resolveStorageFileAbsolute(nodeAbsolute, storageFolder, relFile, { create = false } = {}) {
  const validation = validateStorageFileRequest(relFile, storageFolder, { write: create });
  if (validation.error) return validation;

  const localFolderAbsolute = await getNodeStorageSubfolderAbsolute(nodeAbsolute, validation.folder);
  const localValid =
    localFolderAbsolute &&
    (await isExistingDirectory(localFolderAbsolute)) &&
    isPathInsideDirectory(
      localFolderAbsolute,
      path.join(localFolderAbsolute, validation.normalizedRelFile)
    );
  const localFileAbsolute = localValid
    ? path.join(localFolderAbsolute, validation.normalizedRelFile)
    : null;

  if (localFileAbsolute && (create || (await fileExists(localFileAbsolute)))) {
    return {
      folder: validation.folder,
      normalizedRelFile: validation.normalizedRelFile,
      folderAbsolute: localFolderAbsolute,
      fileAbsolute: localFileAbsolute,
      source: "topic"
    };
  }

  if (!create) {
    const sharedFolderAbsolute = await resolveSharedMountSubfolderAbsolute(nodeAbsolute, validation.folder);
    if (sharedFolderAbsolute && (await isExistingDirectory(sharedFolderAbsolute))) {
      const sharedFileAbsolute = path.join(sharedFolderAbsolute, validation.normalizedRelFile);
      if (
        isPathInsideDirectory(sharedFolderAbsolute, sharedFileAbsolute) &&
        (await fileExists(sharedFileAbsolute))
      ) {
        const mount = resolveSharedMountSpecForStorageFolder(validation.folder);
        return {
          folder: validation.folder,
          normalizedRelFile: validation.normalizedRelFile,
          folderAbsolute: sharedFolderAbsolute,
          fileAbsolute: sharedFileAbsolute,
          source: "shared",
          sharedThemeSlug: mount?.themeSlug || null,
          sharedThemeManifestPath: mount ? getSharedThemeManifestRel(mount.themeSlug) : null
        };
      }
    }
  }

  if (create) {
    const folderAbsolute = await getOrCreateNodeStorageSubfolderAbsolute(nodeAbsolute, validation.folder);
    if (!folderAbsolute) {
      return { error: "Storage folder not found" };
    }
    const fileAbsolute = path.join(folderAbsolute, validation.normalizedRelFile);
    if (!isPathInsideDirectory(folderAbsolute, fileAbsolute)) return { error: "Invalid file path" };
    return {
      folder: validation.folder,
      normalizedRelFile: validation.normalizedRelFile,
      folderAbsolute,
      fileAbsolute,
      source: "topic"
    };
  }

  if (localFolderAbsolute) {
    return { error: "File not found", status: 404 };
  }
  return { error: "Storage folder not found", status: 404 };
}

function toMediaSidecarRelativePath(mediaRelPath) {
  const normalized = normalizeRelativeFilePath(mediaRelPath);
  if (!normalized || normalized.endsWith("/") || normalized.endsWith("\\")) return null;
  const posixPath = normalized.replace(/\\/g, "/");
  const lastSlash = posixPath.lastIndexOf("/");
  const dir = lastSlash >= 0 ? `${posixPath.slice(0, lastSlash + 1)}` : "";
  const filename = lastSlash >= 0 ? posixPath.slice(lastSlash + 1) : posixPath;
  const dotIndex = filename.lastIndexOf(".");
  const base = dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
  if (!base) return null;
  return `${dir}${base}.sidecar.md`;
}

function resolveMediaSidecarAbsoluteFromMediaFile(mediaAbsolute) {
  if (!mediaAbsolute) return null;
  const mediaDir = path.resolve(path.dirname(mediaAbsolute));
  const fileName = path.basename(mediaAbsolute);
  const dotIndex = fileName.lastIndexOf(".");
  const stem = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  if (!stem) return null;
  const sidecarAbsolute = path.join(mediaDir, `${stem}.sidecar.md`);
  if (path.resolve(path.dirname(sidecarAbsolute)) !== mediaDir) return null;
  return sidecarAbsolute;
}

async function isAllowedMediaSidecarAbsolute(nodeAbsolute, sidecarAbsolute) {
  if (!nodeAbsolute || !sidecarAbsolute) return false;
  const resolvedSidecar = path.resolve(sidecarAbsolute);
  const mediaFolder = await getMediaFolderAbsolute(nodeAbsolute);
  if (mediaFolder && resolvedSidecar.startsWith(path.resolve(mediaFolder))) return true;
  const assetsFolder = await getAssetsFolderAbsolute(nodeAbsolute);
  if (assetsFolder && resolvedSidecar.startsWith(path.resolve(assetsFolder))) return true;
  return false;
}

async function resolveLegacyAssetsSidecarAbsolute(nodeAbsolute, normalizedRelFile) {
  const relUnderAssets = normalizedRelFile.replace(/^assets\//i, "");
  const sidecarRelPath = toMediaSidecarRelativePath(relUnderAssets);
  if (!sidecarRelPath) return null;
  const assetsFolder = await getAssetsFolderAbsolute(nodeAbsolute);
  if (!assetsFolder) return null;
  const sidecarAbsolute = path.join(assetsFolder, sidecarRelPath);
  if (!sidecarAbsolute.startsWith(assetsFolder)) return null;
  return sidecarAbsolute;
}

async function resolveMediaSidecarAbsolute(nodeAbsolute, mediaAbsolute, normalizedRelFile) {
  const siblingSidecar = resolveMediaSidecarAbsoluteFromMediaFile(mediaAbsolute);
  if (!siblingSidecar) return null;
  if (!(await isAllowedMediaSidecarAbsolute(nodeAbsolute, siblingSidecar))) return null;

  try {
    await fs.access(siblingSidecar);
    return siblingSidecar;
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }

  const legacySidecar = await resolveLegacyAssetsSidecarAbsolute(nodeAbsolute, normalizedRelFile);
  if (legacySidecar && legacySidecar !== siblingSidecar) {
    try {
      await fs.access(legacySidecar);
      return legacySidecar;
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
    }
  }

  return siblingSidecar;
}

function toMediaRenamedFileName(currentRelFile, rawTitle) {
  const currentFileName = path.basename(String(currentRelFile).replace(/\\/g, "/"));
  const preservedExt = path.extname(currentFileName);
  let base = String(rawTitle || "")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    .replace(/\s+/g, " ");
  if (!base || base.includes("..")) return null;
  if (preservedExt && base.toLowerCase().endsWith(preservedExt.toLowerCase())) {
    base = base.slice(0, -preservedExt.length);
  } else {
    const providedExt = path.extname(base);
    if (providedExt) base = base.slice(0, -providedExt.length);
  }
  base = base.trim();
  if (!base) return null;
  if (base.toLowerCase().endsWith(".sidecar.md")) return null;
  return `${base}${preservedExt}`;
}

function classifyMediaGroup(ext) {
  const extension = String(ext || "").toLowerCase();
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".heic", ".avif"].includes(extension)) {
    return "Images";
  }
  if ([".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"].includes(extension)) {
    return "Videos";
  }
  if ([".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"].includes(extension)) {
    return "Audio";
  }
  if ([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".md"].includes(extension)) {
    return "Documents";
  }
  if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(extension)) {
    return "Archives";
  }
  return "Other";
}

async function collectMediaFilesStructured(
  folderAbsolute,
  prefix = "",
  items = [],
  sectionManifests = []
) {
  let entries = [];
  try {
    entries = await fs.readdir(folderAbsolute, { withFileTypes: true });
  } catch {
    return items;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".sidecar.md")) continue;
    const absolute = path.join(folderAbsolute, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    const relPath = relative.replace(/\\/g, "/");

    if (entry.isDirectory()) {
      if (shouldSkipDirectoryListing(entry.name) || shouldSkipExternalMemoryDirectory(entry.name)) continue;
      items.push({
        path: `${relPath}/`,
        name: entry.name,
        group: "Folders",
        isFolder: true,
        size: 0,
        ext: ""
      });
      await collectMediaFilesStructured(absolute, relPath, items, sectionManifests);
      continue;
    }

    if (!entry.isFile()) continue;

    if (isAreaManifestFileName(entry.name)) {
      let displayName = "";
      let status = null;
      try {
        const raw = await fs.readFile(absolute, "utf-8");
        const { frontmatter } = splitNodeFrontmatter(raw);
        const props = parseFrontmatterProps(frontmatter);
        const folderSlug =
          path.posix.basename(path.posix.dirname(relPath)) ||
          path.posix.basename(relPath).replace(/\.md$/i, "");
        displayName = resolveNodeDisplayName(getYamlScalar(frontmatter, "awn-name") || "", folderSlug);
        status =
          getFrontmatterPropValue(props, "awn-status") || getYamlScalar(frontmatter, "awn-status") || null;
      } catch {
        // manifest may be unreadable
      }
      sectionManifests.push({ path: relPath, displayName, status });
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    let size = 0;
    let displayName = "";
    let status = null;
    try {
      const stat = await fs.stat(absolute);
      size = stat.size;
      const sidecarRel = toMediaSidecarRelativePath(relPath);
      if (sidecarRel) {
        const sidecarAbsolute = path.join(folderAbsolute, sidecarRel);
        if (sidecarAbsolute.startsWith(folderAbsolute)) {
          try {
            const sidecarRaw = await fs.readFile(sidecarAbsolute, "utf-8");
            const { frontmatter } = splitNodeFrontmatter(sidecarRaw);
            const props = parseFrontmatterProps(frontmatter);
            displayName = resolveNodeDisplayName(
              getYamlScalar(frontmatter, "awn-name") || "",
              entry.name
            );
            status =
              getFrontmatterPropValue(props, "awn-status") || getYamlScalar(frontmatter, "awn-status") || null;
          } catch {
            // sidecar may not exist yet
          }
        }
      }
      if (!displayName && ext === ".md") {
        try {
          const raw = await fs.readFile(absolute, "utf-8");
          const { frontmatter } = splitNodeFrontmatter(raw);
          const slug = entry.name.replace(/\.md$/i, "");
          displayName = resolveNodeDisplayName(getYamlScalar(frontmatter, "awn-name") || "", slug);
          if (!status) {
            const props = parseFrontmatterProps(frontmatter);
            status =
              getFrontmatterPropValue(props, "awn-status") || getYamlScalar(frontmatter, "awn-status") || null;
          }
        } catch {
          // markdown may be unreadable
        }
      }
    } catch {
      // keep size 0
    }

    items.push({
      path: relPath,
      name: entry.name,
      displayName,
      status,
      group: classifyMediaGroup(ext),
      isFolder: false,
      size,
      ext
    });
  }

  return items;
}

function groupMediaFiles(items) {
  const groups = {};
  for (const item of items) {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  }
  for (const groupName of Object.keys(groups)) {
    groups[groupName].sort((a, b) => a.path.localeCompare(b.path, "ru"));
  }
  return groups;
}

function buildMediaListContent(groups) {
  const groupOrder = ["Folders", "Images", "Videos", "Audio", "Documents", "Archives", "Other"];
  const lines = [];
  let files = 0;

  for (const groupName of groupOrder) {
    const groupItems = groups[groupName] || [];
    if (groupItems.length === 0) continue;
    lines.push(`## ${groupName}`);
    for (const item of groupItems) {
      if (!item.isFolder && isAreaManifestFileName(path.basename(item.path))) continue;
      lines.push(`- ${item.path}`);
      files += 1;
    }
    lines.push("");
  }

  return { content: lines.join("\n").trim(), files };
}

function isPathInsideDirectory(parentDir, childPath) {
  const parent = path.resolve(parentDir);
  const child = path.resolve(childPath);
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function pathsEqualCaseInsensitive(a, b) {
  if (!a || !b) return false;
  return path.resolve(String(a)).toLowerCase() === path.resolve(String(b)).toLowerCase();
}

function isCaseOnlyPathRename(fromAbsolute, toAbsolute) {
  const fromResolved = path.resolve(fromAbsolute);
  const toResolved = path.resolve(toAbsolute);
  return fromResolved !== toResolved && pathsEqualCaseInsensitive(fromResolved, toResolved);
}

async function targetPathOccupiedByOther(fromAbsolute, toAbsolute) {
  if (path.resolve(fromAbsolute) === path.resolve(toAbsolute)) return false;
  if (isCaseOnlyPathRename(fromAbsolute, toAbsolute)) return false;
  try {
    await fs.access(toAbsolute);
    return true;
  } catch (error) {
    if (error && error.code === "ENOENT") return false;
    throw error;
  }
}

async function renamePathCaseAware(fromAbsolute, toAbsolute) {
  const fromResolved = path.resolve(fromAbsolute);
  const toResolved = path.resolve(toAbsolute);
  if (fromResolved === toResolved) return toAbsolute;

  if (await targetPathOccupiedByOther(fromAbsolute, toAbsolute)) {
    const error = new Error("Target path already exists");
    error.code = "EEXIST";
    throw error;
  }

  await fs.mkdir(path.dirname(toAbsolute), { recursive: true });

  if (isCaseOnlyPathRename(fromAbsolute, toAbsolute)) {
    const tempAbsolute = path.join(
      path.dirname(fromAbsolute),
      `.case-rename-${Date.now()}-${Math.random().toString(36).slice(2)}`
    );
    await fs.rename(fromAbsolute, tempAbsolute);
    await fs.rename(tempAbsolute, toAbsolute);
    return toAbsolute;
  }

  await fs.rename(fromAbsolute, toAbsolute);
  return toAbsolute;
}

async function resolveMediaTargetFolderAbsolute(folderAbsolute, subdir, options = {}) {
  if (!folderAbsolute) return null;
  const raw = String(subdir || "").trim().replace(/\\/g, "/");
  if (!raw || raw === ".") return path.resolve(folderAbsolute);

  const normalized = normalizeRelativeFilePath(raw);
  if (!normalized || normalized === ".") return path.resolve(folderAbsolute);

  const root = path.resolve(folderAbsolute);
  const segments = normalized.split("/").filter(Boolean);
  let current = root;

  for (const segment of segments) {
    let next = await resolveFolderPathCaseInsensitive(current, segment);
    if (!next && options.create) {
      next = path.join(current, segment);
      await fs.mkdir(next, { recursive: true });
    }
    if (!next || !isPathInsideDirectory(root, next)) return null;
    current = next;
  }

  try {
    const stat = await fs.stat(current);
    return stat.isDirectory() ? current : null;
  } catch {
    return null;
  }
}

function resolveStorageCreateParentRel(rawParent, { layer = STORAGE_SUBFOLDER_CONTENT, manifestRelPath = "" } = {}) {
  return normalizeStorageSlotParentRel(rawParent, { layer, manifestRelPath });
}

function buildStorageSectionReadmeContent(title, awnType = "awn.content.record.category", folderSlug = "") {
  const segment =
    String(folderSlug || "").trim() || String(title || "Раздел").trim() || "Раздел";
  let frontmatter = awnType ? `awn-type: ${awnType}` : "";
  frontmatter = applyAwnNameToFrontmatter(frontmatter, title, segment);
  if (!frontmatter.trim()) return `\n> Описание раздела.\n`;
  return `---\n${frontmatter}\n---\n\n> Описание раздела.\n`;
}

function resolveAwnSchemaTargetForSectionType(awnType, slotKey = null) {
  if (slotKey) {
    const { resolveTopicSchemaTargetIdForAwnType } = require("./public/topic-schema-slot-specs.js");
    const resolved = resolveTopicSchemaTargetIdForAwnType(slotKey, awnType);
    if (resolved) return resolved;
  }
  // Legacy fallback when slot is unknown
  if (awnType === "awn.content.media.category" || awnType === "awn.media.category") return "slot_media_category";
  if (awnType === "awn.content.record.category" || awnType === "awn.record.category") return "slot_memory_category";
  return null;
}

async function buildStorageSectionReadmeContentForManifest(
  manifestRel,
  title,
  awnType,
  slotKey = null,
  options = {}
) {
  const safeTitle = String(title || "Раздел").trim() || "Раздел";
  const folderSlug = String(options.folderSlug || "").trim();
  if (!awnType) return buildStorageSectionReadmeContent(safeTitle, null, folderSlug);

  const schemaTarget = resolveAwnSchemaTargetForSectionType(awnType, slotKey);
  if (schemaTarget) {
    try {
      const configFile = await readNodeConfigFile(manifestRel);
      const payload = options.contentWorkspaceRel
        ? getEffectiveSchemaPayloadForContentPath(
            configFile.content || "",
            options.contentWorkspaceRel,
            getAgentRoot(),
            getProjectRoot()
          )
        : getEffectiveTopicSchemaPayload(
            manifestRel,
            getAgentRoot(),
            getProjectRoot(),
            configFile.content || ""
          );
      const mergedType = payload.merged[schemaTarget];
      if (mergedType?.fields && Object.keys(mergedType.fields).length) {
        let frontmatter = buildDefaultFrontmatter(awnType, {
          name: safeTitle,
          agentRoot: getAgentRoot(),
          projectRoot: getProjectRoot(),
          typeDef: mergedType
        });
        frontmatter = applyAwnNameToFrontmatter(frontmatter, safeTitle, folderSlug);
        return `---\n${frontmatter}\n---\n\n> Описание раздела.\n`;
      }
    } catch {
      // fallback to minimal readme below
    }
  }

  return buildStorageSectionReadmeContent(safeTitle, awnType, folderSlug);
}

async function buildSlotContentFileContentForManifest(
  manifestRel,
  title,
  slotKey,
  contentKind = "record",
  options = {}
) {
  const {
    CONTENT_KIND_TYPE_NAMES,
    resolveTopicSchemaTargetIdForAwnType
  } = require("./public/topic-schema-slot-specs.js");
  const safeTitle = String(title || "Запись").trim() || "Запись";
  const awnType = CONTENT_KIND_TYPE_NAMES[contentKind] || "awn.content.record";
  const schemaTarget = resolveTopicSchemaTargetIdForAwnType(slotKey, awnType);

  let frontmatter = "";
  try {
    const configFile = await readNodeConfigFile(manifestRel);
    const payload = options.contentWorkspaceRel
      ? getEffectiveSchemaPayloadForContentPath(
          configFile.content || "",
          options.contentWorkspaceRel,
          getAgentRoot(),
          getProjectRoot()
        )
      : getEffectiveTopicSchemaPayload(
          manifestRel,
          getAgentRoot(),
          getProjectRoot(),
          configFile.content || ""
        );
    const mergedType = schemaTarget ? payload.merged[schemaTarget] : null;
    if (mergedType?.fields && Object.keys(mergedType.fields).length) {
      frontmatter = buildDefaultFrontmatter(awnType, {
        name: safeTitle,
        agentRoot: getAgentRoot(),
        projectRoot: getProjectRoot(),
        typeDef: mergedType
      });
    }
  } catch {
    // fallback below
  }
  if (!frontmatter) {
    frontmatter = buildDefaultFrontmatter(awnType, {
      name: safeTitle,
      agentRoot: getAgentRoot(),
      projectRoot: getProjectRoot()
    });
  }
  if (options.frontmatterOverrides && Object.keys(options.frontmatterOverrides).length) {
    frontmatter = mergeFrontmatterOverrides(frontmatter, options.frontmatterOverrides);
  }

  let body = options.body;
  if (body === undefined) {
    if (contentKind === "category") {
      body = "> Описание раздела.\n";
    } else if (contentKind === "sidecar") {
      body = "";
    } else {
      body = `# ${safeTitle}\n`;
    }
  }
  return joinNodeFrontmatter(frontmatter, body);
}

function mergeFrontmatterBlocks(baseFrontmatter, overlayFrontmatter) {
  const overlayText = String(overlayFrontmatter || "").trim();
  if (!overlayText) return String(baseFrontmatter || "").trim();
  const overlayKeys = new Set();
  const overlayLines = overlayText.split("\n").filter((line) => line.trim());
  for (const line of overlayLines) {
    const key = line.split(":")[0]?.trim().toLowerCase();
    if (key) overlayKeys.add(key);
  }
  const baseLines = String(baseFrontmatter || "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      const key = trimmed.split(":")[0]?.trim().toLowerCase();
      return key && !overlayKeys.has(key);
    });
  return [...baseLines, ...overlayLines].join("\n");
}

function inferTitleFromMarkdownContent(content, fileName = "") {
  const { frontmatter, body } = splitNodeFrontmatter(String(content || ""));
  const fromName = getYamlScalar(frontmatter, "awn-name");
  if (String(fromName || "").trim()) {
    return String(fromName).trim().replace(/^["']|["']$/g, "");
  }
  const heading = String(body || "")
    .match(/^#{1,6}\s+(.+)$/m)?.[1]
    ?.trim();
  if (heading) return heading.replace(/^#+\s*/, "");
  const stem = path.basename(String(fileName || ""), ".md");
  return stripTopicPrefix(stem) || "Запись";
}

function countFrontmatterKeys(frontmatter) {
  return String(frontmatter || "")
    .split("\n")
    .filter((line) => /^\s*[A-Za-z0-9_-]+\s*:/.test(line)).length;
}

function shouldEnrichTypedSlotMarkdown(frontmatter, contentKind = "record") {
  const { CONTENT_KIND_TYPE_NAMES, normalizeAwnContentTypeName } = require("./public/topic-schema-slot-specs.js");
  const expectedType = CONTENT_KIND_TYPE_NAMES[contentKind] || "awn.content.record";
  const rawType = String(getYamlScalar(frontmatter, "awn-type") || "").trim();
  if (!rawType) return true;
  if (normalizeAwnContentTypeName(rawType) !== normalizeAwnContentTypeName(expectedType)) return true;
  // Partial agent frontmatter (few keys) — дополняем до полного набора типа
  return countFrontmatterKeys(frontmatter) < 8;
}

async function enrichTypedSlotMarkdownContent(
  manifestRel,
  slotKey,
  content,
  contentKind = "record",
  options = {}
) {
  if (options.raw) {
    return String(content ?? "");
  }

  const { CONTENT_KIND_TYPE_NAMES, normalizeAwnContentTypeName } = require("./public/topic-schema-slot-specs.js");
  const expectedType = CONTENT_KIND_TYPE_NAMES[contentKind] || "awn.content.record";
  const { frontmatter: userFrontmatter, body: userBody } = splitNodeFrontmatter(String(content || ""));

  if (!options.force && !shouldEnrichTypedSlotMarkdown(userFrontmatter, contentKind)) {
    const stamped = applyAwnTimestampsToFrontmatter(userFrontmatter, {
      diskFrontmatter: options.diskFrontmatter || userFrontmatter
    });
    return joinNodeFrontmatter(stamped, userBody);
  }

  const title = options.title || inferTitleFromMarkdownContent(content, options.fileName);
  const template = await buildSlotContentFileContentForManifest(manifestRel, title, slotKey, contentKind, {
    body: userBody || undefined,
    frontmatterOverrides: options.frontmatterOverrides || null
  });
  const { frontmatter: templateFrontmatter, body: templateBody } = splitNodeFrontmatter(template);
  let merged = mergeFrontmatterBlocks(templateFrontmatter, userFrontmatter);
  const userType = String(getYamlScalar(userFrontmatter, "awn-type") || "").trim();
  merged = upsertYamlScalarLine(
    merged,
    "awn-type",
    normalizeAwnContentTypeName(userType || expectedType)
  );
  merged = applyAwnTimestampsToFrontmatter(merged, {
    diskFrontmatter: options.diskFrontmatter || userFrontmatter
  });
  return joinNodeFrontmatter(merged, userBody || templateBody);
}

async function buildExternalRecordFileContentForManifest(manifestRel, title, options = {}) {
  return buildSlotContentFileContentForManifest(manifestRel, title, "memory", "record", {
    contentWorkspaceRel: options.contentWorkspaceRel || null
  });
}

async function createStorageRecordFile({
  manifestRelPath,
  storageFolder,
  title,
  slug,
  parent = "",
  body = "",
  fileMask = "",
  source = "",
  author = "",
  status = "",
  fields = null
}) {
  const canonicalFolder = normalizeStorageSubfolderName(storageFolder);
  if (!canonicalFolder || !isAllowedStorageSubfolderName(canonicalFolder)) {
    throw new Error("Invalid storage folder");
  }

  const slotKey = resolveSlotKeyFromStorageFolderName(canonicalFolder);
  if (!slotKey) throw new Error("Storage folder does not support typed records");

  const nodeAbsolute = await resolveApiManifestAbsolute(manifestRelPath);
  if (!nodeAbsolute) throw new Error("Invalid file path");

  const schemaManifestRel = resolveExternalMemorySchemaManifestRel(manifestRelPath);
  const isMainSlot =
    slotKey === "memory" ||
    canonicalFolder === STORAGE_SUBFOLDER_MAIN ||
    canonicalFolder === STORAGE_SUBFOLDER_CONTENT;

  let folderAbsolute;
  let parentRaw;
  if (isMainSlot) {
    folderAbsolute = await resolveExternalMemoryFolderAbsolute(manifestRelPath, { create: true });
    parentRaw = resolveExternalMemoryCreateParentRel(manifestRelPath, parent);
  } else {
    folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, canonicalFolder, { create: true });
    parentRaw = resolveStorageCreateParentRel(parent, {
      layer: canonicalFolder,
      manifestRelPath
    });
  }
  if (!folderAbsolute) throw new Error("Storage folder unavailable");

  const targetFolder = await resolveMediaTargetFolderAbsolute(folderAbsolute, parentRaw, { create: true });
  if (!targetFolder) {
    throw new Error(parentRaw ? "Parent section not found" : "Invalid storage folder path");
  }

  let fileName = null;
  let fileTitle = String(title || "").trim() || "Запись";
  let mask = String(fileMask || "").trim();
  if (!mask && isMainSlot) {
    mask = await resolveExternalFileMaskForManifest(schemaManifestRel);
  }

  if (mask) {
    fileName = await resolveExternalFileNameFromMask(targetFolder, mask, {
      incrementRoot: folderAbsolute
    });
    if (!fileName) throw new Error("Invalid file mask");
    fileTitle = String(title || "").trim() || displayNameFromMaskPath(fileName);
    await ensureExternalRelativeParentDirs(targetFolder, fileName);
  } else {
    const { display, diskSlug } = resolveContentItemNames({ title: fileTitle, slug: slug || title });
    fileTitle = display || fileTitle;
    const resolvedSlug = diskSlug || slug;
    if (!fileTitle) throw new Error("Title cannot be empty");
    if (!resolvedSlug) throw new Error("Invalid slug");
    fileName = await resolveUniqueExternalFileName(targetFolder, resolvedSlug);
    if (!fileName) throw new Error("Invalid file name");
  }

  const textBody = String(body || "").trim();
  const customFields = normalizeStorageRecordFields(fields);
  let frontmatterOverrides = customFields ? { ...customFields } : null;
  if (slotKey === "inbox") {
    frontmatterOverrides = {
      ...(frontmatterOverrides || {}),
      "awn-status": String(status || "new").trim() || "new",
      "awn-source": String(source || "mcp").trim() || "mcp",
      ...(String(author || "").trim() ? { "awn-author": String(author).trim() } : {})
    };
  }

  const parentRel = path.relative(folderAbsolute, targetFolder).replace(/\\/g, "/").replace(/^\/+/, "");
  const relInSlotPreview = parentRel ? `${parentRel}/${fileName}` : fileName;
  const contentWorkspaceRel = buildStorageLayerRef(schemaManifestRel, canonicalFolder, relInSlotPreview);

  const content = await buildSlotContentFileContentForManifest(
    schemaManifestRel,
    fileTitle,
    slotKey,
    "record",
    {
      body: textBody || undefined,
      frontmatterOverrides,
      contentWorkspaceRel
    }
  );

  const fileAbsolute = joinFolderRelativePath(targetFolder, fileName);
  if (!fileAbsolute) throw new Error("Invalid file path");
  await fs.mkdir(path.dirname(fileAbsolute), { recursive: true });
  await fs.writeFile(fileAbsolute, content, "utf-8");

  const relFile = path.relative(folderAbsolute, fileAbsolute).replace(/\\/g, "/");
  return {
    folder: canonicalFolder,
    file: relFile,
    content,
    exists: true,
    slotKey
  };
}

async function writeStorageSectionReadme(
  sectionAbsolute,
  title,
  awnType = "awn.content.record.category",
  manifestRel = null,
  slotKey = null,
  options = {}
) {
  const readmeAbsolute = path.join(sectionAbsolute, AREA_MANIFEST_FILE);
  try {
    await fs.access(readmeAbsolute);
  } catch {
    const folderSlug = path.basename(sectionAbsolute);
    const content = manifestRel
      ? await buildStorageSectionReadmeContentForManifest(manifestRel, title, awnType, slotKey, {
          ...options,
          folderSlug
        })
      : buildStorageSectionReadmeContent(title, awnType, folderSlug);
    await fs.writeFile(readmeAbsolute, content, "utf-8");
  }
}

async function resolveMemorySectionRootAbsolute(nodeAbsolute, scopeType, storageFolder = "") {
  if (scopeType === "external") {
    return getOrCreateExternalFolderAbsolute(nodeAbsolute);
  }
  if (scopeType === "media") {
    const subfolder =
      storageFolder && isAllowedStorageSubfolderName(storageFolder)
        ? storageFolder
        : STORAGE_SUBFOLDER_MEDIA;
    return resolveNodeSubfolderAbsolute(nodeAbsolute, subfolder);
  }
  if (scopeType === "storage") {
    if (!isAllowedStorageSubfolderName(storageFolder)) return null;
    return resolveNodeSubfolderAbsolute(nodeAbsolute, storageFolder);
  }
  return null;
}

async function resolveMemorySectionContext(manifestRelPath, scopeType, storageFolder, sectionRelPath) {
  const nodeAbsolute = await resolveApiManifestAbsolute(manifestRelPath);
  if (!nodeAbsolute) return { error: "Invalid file path", status: 400 };

  const rootAbsolute = await resolveMemorySectionRootAbsolute(nodeAbsolute, scopeType, storageFolder);
  if (!rootAbsolute) return { error: "Storage folder not found", status: 404 };

  const normalizedSection = String(sectionRelPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!normalizedSection) return { error: "Missing section path", status: 400 };

  const sectionAbsolute = joinFolderRelativePath(rootAbsolute, normalizedSection);
  if (!sectionAbsolute || !isPathInsideDirectory(rootAbsolute, sectionAbsolute)) {
    return { error: "Invalid section path", status: 400 };
  }

  try {
    const stat = await fs.stat(sectionAbsolute);
    if (!stat.isDirectory()) return { error: "Section not found", status: 404 };
  } catch (error) {
    if (error && error.code === "ENOENT") return { error: "Section not found", status: 404 };
    throw error;
  }

  return {
    rootAbsolute,
    sectionAbsolute,
    sectionRelPath: normalizedSection,
    readmeAbsolute: path.join(sectionAbsolute, AREA_MANIFEST_FILE)
  };
}

async function readMemorySectionReadmeContent(readmeAbsolute) {
  try {
    return await fs.readFile(readmeAbsolute, "utf-8");
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function writeMemorySectionReadmeContent(readmeAbsolute, content) {
  await fs.writeFile(readmeAbsolute, content, "utf-8");
}

async function renameMemorySectionRecord(manifestRelPath, scopeType, storageFolder, sectionRelPath, payload) {
  const { display, diskSlug } = resolveContentItemNames(payload);
  if (!display) return { error: "Title cannot be empty", status: 400 };

  const ctx = await resolveMemorySectionContext(manifestRelPath, scopeType, storageFolder, sectionRelPath);
  if (ctx.error) return ctx;

  const parts = ctx.sectionRelPath.split("/").filter(Boolean);
  const currentSlug = parts[parts.length - 1] || "";
  const nextSlug = toExternalSectionFolderName(diskSlug) || currentSlug;
  if (!nextSlug) return { error: "Invalid slug", status: 400 };
  parts[parts.length - 1] = nextSlug;
  const nextRelPath = parts.join("/");

  let sectionAbsolute = ctx.sectionAbsolute;
  if (nextRelPath !== ctx.sectionRelPath) {
    const nextAbsolute = joinFolderRelativePath(ctx.rootAbsolute, nextRelPath);
    if (!nextAbsolute) return { error: "Invalid section path", status: 400 };
    if (await targetPathOccupiedByOther(sectionAbsolute, nextAbsolute)) {
      return { error: "Section already exists", status: 409 };
    }
    await renamePathCaseAware(sectionAbsolute, nextAbsolute);
    sectionAbsolute = nextAbsolute;
  }

  const readmeAbsolute = path.join(sectionAbsolute, AREA_MANIFEST_FILE);
  const raw =
    (await readMemorySectionReadmeContent(readmeAbsolute)) ||
    buildStorageSectionReadmeContent(display, "awn.content.record.category", nextSlug);
  const { frontmatter, body } = splitNodeFrontmatter(raw);
  const nextFrontmatter = applyAwnNameToFrontmatter(frontmatter, display, nextSlug);
  await writeMemorySectionReadmeContent(readmeAbsolute, joinNodeFrontmatter(nextFrontmatter, body));

  const sectionPath = path.relative(ctx.rootAbsolute, sectionAbsolute).replace(/\\/g, "/");
  return {
    sectionPath,
    readme: `${sectionPath}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/"),
    exists: true
  };
}

async function moveMemorySectionRecord(manifestRelPath, scopeType, storageFolder, sectionRelPath, targetParent) {
  const ctx = await resolveMemorySectionContext(manifestRelPath, scopeType, storageFolder, sectionRelPath);
  if (ctx.error) return ctx;

  const sectionName = path.basename(ctx.sectionAbsolute);
  const parentRaw = resolveStorageCreateParentRel(targetParent, {
    layer: storageFolder,
    manifestRelPath
  });
  const targetFolder = await resolveMediaTargetFolderAbsolute(ctx.rootAbsolute, parentRaw);
  if (!targetFolder) {
    return { error: parentRaw ? "Parent section not found" : "Invalid target parent", status: 400 };
  }

  const destAbsolute = path.join(targetFolder, sectionName);
  if (!isPathInsideDirectory(ctx.rootAbsolute, destAbsolute)) {
    return { error: "Invalid target path", status: 400 };
  }
  if (path.resolve(destAbsolute) === path.resolve(ctx.sectionAbsolute)) {
    const sectionPath = ctx.sectionRelPath;
    return {
      sectionPath,
      readme: `${sectionPath}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/"),
      exists: true
    };
  }
  if (isPathInsideDirectory(ctx.sectionAbsolute, destAbsolute)) {
    return { error: "Cannot move section into itself", status: 400 };
  }

  if (await targetPathOccupiedByOther(ctx.sectionAbsolute, destAbsolute)) {
    return { error: "Target section already exists", status: 409 };
  }

  await renamePathCaseAware(ctx.sectionAbsolute, destAbsolute);
  const sectionPath = path.relative(ctx.rootAbsolute, destAbsolute).replace(/\\/g, "/");
  return {
    sectionPath,
    readme: `${sectionPath}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/"),
    exists: true
  };
}

function addMemorySectionSortParentPaths(parentPaths, sectionRelPath) {
  const normalized = String(sectionRelPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  parentPaths.add("");
  if (!normalized) return;
  const parts = normalized.split("/").filter(Boolean);
  for (let i = 0; i < parts.length; i += 1) {
    parentPaths.add(parts.slice(0, i).join("/"));
  }
}

async function collectMemorySectionSortOrders(rootAbsolute, sectionRelPaths = []) {
  const parentPaths = new Set();
  for (const sectionRelPath of sectionRelPaths) {
    addMemorySectionSortParentPaths(parentPaths, sectionRelPath);
  }
  const orders = {};
  for (const parentRel of parentPaths) {
    const dirAbsolute = parentRel
      ? joinFolderRelativePath(rootAbsolute, parentRel)
      : rootAbsolute;
    if (!dirAbsolute || !isPathInsideDirectory(rootAbsolute, dirAbsolute)) continue;
    const order = await readMenuSortOrder(dirAbsolute);
    if (order?.length) orders[parentRel] = order;
  }
  return orders;
}

async function saveMemorySectionSortOrderRecord(
  manifestRelPath,
  scopeType,
  storageFolder,
  parentRelPath,
  order
) {
  const nodeAbsolute = await resolveApiManifestAbsolute(manifestRelPath);
  if (!nodeAbsolute) return { error: "Invalid file path", status: 400 };

  const rootAbsolute = await resolveMemorySectionRootAbsolute(nodeAbsolute, scopeType, storageFolder);
  if (!rootAbsolute) return { error: "Storage folder not found", status: 404 };

  const parentRaw = String(parentRelPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  const dirAbsolute = parentRaw ? joinFolderRelativePath(rootAbsolute, parentRaw) : rootAbsolute;
  if (!dirAbsolute || !isPathInsideDirectory(rootAbsolute, dirAbsolute)) {
    return { error: "Invalid parent section path", status: 400 };
  }

  try {
    const stat = await fs.stat(dirAbsolute);
    if (!stat.isDirectory()) return { error: "Parent section not found", status: 404 };
  } catch (error) {
    if (error && error.code === "ENOENT") return { error: "Parent section not found", status: 404 };
    throw error;
  }

  const nextOrder = Array.isArray(order)
    ? order.map((name) => String(name || "").trim()).filter(Boolean)
    : [];
  const sortPath = path.join(dirAbsolute, MENU_SORT_FILE);
  await fs.writeFile(sortPath, `${JSON.stringify({ order: nextOrder }, null, 2)}\n`, "utf-8");
  return { parent: parentRaw, order: nextOrder };
}

async function deleteMemorySectionRecord(manifestRelPath, scopeType, storageFolder, sectionRelPath) {
  const ctx = await resolveMemorySectionContext(manifestRelPath, scopeType, storageFolder, sectionRelPath);
  if (ctx.error) return ctx;
  await fs.rm(ctx.sectionAbsolute, { recursive: true, force: false });
  return { deleted: ctx.sectionRelPath, exists: false };
}

async function updateMemorySectionStatusRecord(
  manifestRelPath,
  scopeType,
  storageFolder,
  sectionRelPath,
  nextStatus
) {
  const ctx = await resolveMemorySectionContext(manifestRelPath, scopeType, storageFolder, sectionRelPath);
  if (ctx.error) return ctx;

  const status = String(nextStatus || "").trim();
  if (!status) return { error: "Missing status", status: 400 };

  const raw =
    (await readMemorySectionReadmeContent(ctx.readmeAbsolute)) ||
    buildStorageSectionReadmeContent(ctx.sectionRelPath.split("/").pop() || "Раздел");
  const { frontmatter, body } = splitNodeFrontmatter(raw);
  const nextFrontmatter = upsertYamlScalarLine(frontmatter, "awn-status", status);
  await writeMemorySectionReadmeContent(ctx.readmeAbsolute, joinNodeFrontmatter(nextFrontmatter, body));

  const sectionPath = ctx.sectionRelPath;
  return {
    sectionPath,
    readme: `${sectionPath}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/"),
    status,
    exists: true
  };
}

async function getMediaFolderAbsolute(nodeAbsolute, options = {}) {
  const folderAbsolute = await resolveNodeSubfolderAbsolute(
    nodeAbsolute,
    STORAGE_SUBFOLDER_MEDIA,
    options
  );
  if (!folderAbsolute || !folderAbsolute.startsWith(getAgentRoot())) return null;
  return folderAbsolute;
}

async function getAssetsFolderAbsolute(nodeAbsolute, options = {}) {
  const folderAbsolute = await resolveNodeSubfolderAbsolute(
    nodeAbsolute,
    STORAGE_SUBFOLDER_ASSETS,
    options
  );
  if (!folderAbsolute || !folderAbsolute.startsWith(getAgentRoot())) return null;
  return folderAbsolute;
}

function isInlineAssetsUploadSubdir(subdir) {
  return isStorageAssetsInlineSubfolder(String(subdir || "").split("/")[0]);
}

async function resolveInlineAssetsFolderAbsolute(nodeAbsolute, subdir, options = {}) {
  const assetsFolder = await getAssetsFolderAbsolute(nodeAbsolute, options);
  if (!assetsFolder) return null;
  return resolveMediaTargetFolderAbsolute(assetsFolder, subdir, options);
}

async function listStorageAttachmentFiles(storageContext) {
  const files = [];
  const seen = new Set();

  async function appendFolderFiles(folderAbsolute, buildRef, buildMediaRel) {
    if (!folderAbsolute) return;
    let entries = [];
    try {
      entries = await fs.readdir(folderAbsolute, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (!entry.isFile() || entry.name.startsWith(".")) continue;
      if (entry.name.toLowerCase().endsWith(".sidecar.md")) continue;
      const workspaceRef = buildRef(entry.name);
      if (!workspaceRef || seen.has(workspaceRef)) continue;
      seen.add(workspaceRef);
      files.push({
        name: entry.name,
        mediaRel: buildMediaRel(entry.name),
        workspaceRef
      });
    }
  }

  const attachmentsFolder = await resolveInlineAssetsFolderAbsolute(
    storageContext.absolute,
    STORAGE_SUBFOLDER_ATTACHMENTS
  );
  await appendFolderFiles(
    attachmentsFolder,
    (fileName) => buildAssetsUploadRef(storageContext.rel, STORAGE_SUBFOLDER_ATTACHMENTS, fileName),
    (fileName) =>
      `${STORAGE_SUBFOLDER_ASSETS}/${STORAGE_SUBFOLDER_ATTACHMENTS}/${fileName}`.replace(/\\/g, "/")
  );

  const mediaFolder = await getMediaFolderAbsolute(storageContext.absolute);
  if (mediaFolder) {
    const legacyAttachmentsFolder = path.join(mediaFolder, STORAGE_SUBFOLDER_ATTACHMENTS);
    try {
      const stat = await fs.stat(legacyAttachmentsFolder);
      if (stat.isDirectory()) {
        await appendFolderFiles(
          legacyAttachmentsFolder,
          (fileName) => buildAssetsUploadRef(storageContext.rel, STORAGE_SUBFOLDER_ATTACHMENTS, fileName),
          (fileName) =>
            `${STORAGE_SUBFOLDER_ASSETS}/${STORAGE_SUBFOLDER_ATTACHMENTS}/${fileName}`.replace(/\\/g, "/")
        );
      }
    } catch {
      // ignore missing legacy folder
    }
  }

  files.sort((left, right) => left.name.localeCompare(right.name, "ru"));
  return files;
}

async function collectMediaEntriesByType(folderAbsolute, prefix = "", grouped = new Map()) {
  const entries = await fs.readdir(folderAbsolute, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const absolute = path.join(folderAbsolute, entry.name);
    const relative = path.join(prefix, entry.name);

    if (entry.isDirectory()) {
      if (shouldSkipDirectoryListing(entry.name)) continue;
      const bucket = grouped.get("Folders") || [];
      bucket.push(`${relative}/`.replace(/\\/g, "/"));
      grouped.set("Folders", bucket);
      await collectMediaEntriesByType(absolute, relative, grouped);
      continue;
    }

    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const groupName = classifyMediaGroup(ext);
      const bucket = grouped.get(groupName) || [];
      bucket.push(relative.replace(/\\/g, "/"));
      grouped.set(groupName, bucket);
    }
  }

  return grouped;
}

async function resolveFolderPathCaseInsensitive(parentAbsolute, expectedFolderName) {
  const directAbsolute = path.join(parentAbsolute, expectedFolderName);
  try {
    const directStat = await fs.stat(directAbsolute);
    if (directStat.isDirectory()) return directAbsolute;
  } catch {
    // continue with case-insensitive lookup
  }

  try {
    const entries = await fs.readdir(parentAbsolute, { withFileTypes: true });
    const targetLower = String(expectedFolderName).toLowerCase();
    const match = entries.find((entry) => entry.isDirectory() && entry.name.toLowerCase() === targetLower);
    if (!match) return null;
    return path.join(parentAbsolute, match.name);
  } catch {
    return null;
  }
}

async function fileExists(absolutePath) {
  try {
    const stat = await fs.stat(absolutePath);
    return stat.isFile();
  } catch {
    return false;
  }
}

async function dirExists(absolutePath) {
  try {
    const stat = await fs.stat(absolutePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function nodePathExists(absolutePath) {
  try {
    await fs.access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function appendPrefixedWorkspaceManifestCandidates(candidates, normalized, seen) {
  const base = path.posix.basename(normalized);
  if (!isTopicManifestFileName(base) && !isAreaManifestFileName(base)) return;

  let rootEntries;
  try {
    rootEntries = await fs.readdir(getAgentRoot(), { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of rootEntries) {
    if (!entry.isDirectory() || shouldSkipDirectoryListing(entry.name)) continue;
    const prefixed = `${entry.name}/${normalized}`.replace(/\\/g, "/");
    if (seen.has(prefixed)) continue;
    seen.add(prefixed);
    candidates.push(prefixed);
  }
}

async function resolveExistingWorkspaceRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").trim();
  if (!normalized) return normalized;

  const candidates = [];
  const seen = new Set();
  const pushCandidate = (value) => {
    const candidate = String(value || "").replace(/\\/g, "/").trim();
    if (!candidate || seen.has(candidate)) return;
    seen.add(candidate);
    candidates.push(candidate);
  };

  pushCandidate(normalized);
  await appendGitRepoContainerRelCandidates(candidates, normalized, seen);
  await appendPrefixedWorkspaceManifestCandidates(candidates, normalized, seen);

  for (const candidate of candidates) {
    const absolute = normalizeWorkspacePath(candidate);
    if (absolute && (await nodePathExists(absolute))) {
      return candidate.replace(/\\/g, "/");
    }
  }

  return normalized.replace(/\\/g, "/");
}

async function resolveCanonicalManifestRelPath(relPath) {
  return resolveExistingWorkspaceRelPath(relPath);
}

async function resolveApiManifestAbsolute(relPath) {
  const resolvedRelPath = await resolveExistingWorkspaceRelPath(relPath);
  const absolute = normalizeWorkspacePath(resolvedRelPath);
  if (!absolute || !isManifestMdAbsolute(absolute)) return null;
  return absolute;
}

async function resolveApiNodeFrontmatterAbsolute(relPath) {
  const manifestAbsolute = await resolveApiManifestAbsolute(relPath);
  if (manifestAbsolute) return manifestAbsolute;
  return resolveApiStorageContextAbsolute(relPath);
}

async function resolveApiStorageContextAbsolute(relPath) {
  const resolvedRelPath = await resolveExistingWorkspaceRelPath(relPath);
  const absolute = normalizeWorkspacePath(resolvedRelPath);
  if (!absolute) return null;
  const base = path.basename(absolute).toLowerCase();
  if (!base.endsWith(".md")) return null;
  return absolute;
}

async function resolveApiStorageContext(relPath) {
  const absolute = await resolveApiStorageContextAbsolute(relPath);
  if (!absolute) return null;
  return { absolute, rel: manifestRelFromNodeAbsolute(absolute) };
}

function manifestRelFromNodeAbsolute(nodeAbsolute) {
  return path.relative(getAgentRoot(), nodeAbsolute).replace(/\\/g, "/");
}

async function resolveApiManifestContext(relPath) {
  const absolute = await resolveApiManifestAbsolute(relPath);
  if (!absolute) return null;
  return { absolute, rel: manifestRelFromNodeAbsolute(absolute) };
}

async function resolveRootAreaManifestRel(dirAbsolute, prefix = "") {
  const prefixNorm = String(prefix || "").replace(/\\/g, "/").replace(/\/$/, "");
  const directAbsolute = prefixNorm
    ? path.join(dirAbsolute, prefixNorm, MANIFEST_FILE)
    : path.join(dirAbsolute, MANIFEST_FILE);
  if (await nodePathExists(directAbsolute)) {
    return prefixNorm ? `${prefixNorm}/${MANIFEST_FILE}` : MANIFEST_FILE;
  }
  return null;
}

async function ensureWorkspaceRootIndex(dirAbsolute) {
  if (!(await dirExists(dirAbsolute))) return;
  const workspaceKey = path.basename(dirAbsolute);
  const rootManifestAbsolute = path.join(dirAbsolute, MANIFEST_FILE);
  if (await fileExists(rootManifestAbsolute)) return;

  await fs.writeFile(rootManifestAbsolute, `# ${workspaceKey}\n`, "utf-8");
  await ensureManifestStorageSlotDir(MANIFEST_FILE);
}

async function resolveAgentSubfolderAbsolute(agentRootAbsolute, folderName) {
  if (!folderName || !(await dirExists(agentRootAbsolute))) return null;
  const absolute = path.join(agentRootAbsolute, folderName);
  if (!(await dirExists(absolute))) return null;
  return absolute;
}

function withMenuBuildOptions(options = {}) {
  return {
    ...options,
    menuMetaCache: options.menuMetaCache || new Map()
  };
}

async function buildAgentMenu(agentRootAbsolute, options = {}) {
  const buildOptions = withMenuBuildOptions(options);
  if (!(await dirExists(agentRootAbsolute))) {
    return {
      title: path.basename(agentRootAbsolute),
      sections: [],
      items: [],
      indexPath: null,
      serviceTree: null,
      containerTree: null,
      sharedTree: null,
      systemTree: null,
      workspaceMissing: true
    };
  }

  await ensureWorkspaceRootIndex(agentRootAbsolute);
  const menu = dedupeReservedRootMenuSections(
    await listNodeMdFiles(agentRootAbsolute, "", 0, buildOptions)
  );
  const kitFolder = getAgentKitFolder();
  const containerFolder = getAgentContainerFolder();
  const sharedFolder = getAgentSharedFolder();
  let serviceTree = null;
  let containerTree = null;
  let sharedTree = null;
  let systemTree = null;

  const kitAbsolute = await resolveAgentSubfolderAbsolute(agentRootAbsolute, kitFolder);
  if (kitAbsolute) {
    serviceTree = await normalizeServiceMenuTree(
      await listNodeMdFiles(kitAbsolute, kitFolder, 0, buildOptions),
      kitAbsolute
    );
  }

  const containerAbsolute = await resolveAgentSubfolderAbsolute(agentRootAbsolute, containerFolder);
  if (containerAbsolute) {
    containerTree = await normalizeContainerMenuTree(
      await listNodeMdFiles(containerAbsolute, containerFolder, 0, buildOptions),
      containerAbsolute
    );
  }

  const sharedAbsolute = await resolveAgentSubfolderAbsolute(agentRootAbsolute, sharedFolder);
  if (sharedAbsolute) {
    sharedTree = await normalizeSharedMenuTree(
      await listNodeMdFiles(sharedAbsolute, sharedFolder, 0, buildOptions),
      sharedAbsolute
    );
  }

  if (agentSystemExists(agentRootAbsolute)) {
    systemTree = await buildAgentSystemMenuTree(agentRootAbsolute, getProjectRoot());
  }

  enrichMenuTreeRuntimeRollup(menu);
  enrichMenuTreeSchemaRollup(menu);
  if (serviceTree) {
    enrichMenuTreeRuntimeRollup(serviceTree);
    enrichMenuTreeSchemaRollup(serviceTree);
  }
  if (containerTree) {
    enrichMenuTreeRuntimeRollup(containerTree);
    enrichMenuTreeSchemaRollup(containerTree);
  }
  if (sharedTree) {
    enrichMenuTreeRuntimeRollup(sharedTree);
    enrichMenuTreeSchemaRollup(sharedTree);
  }
  if (systemTree) {
    enrichMenuTreeRuntimeRollup(systemTree);
    enrichMenuTreeSchemaRollup(systemTree);
  }

  return { ...menu, serviceTree, sharedTree, containerTree, systemTree };
}

async function buildAgentMenuBranch(agentRootAbsolute, folderPathRaw, options = {}) {
  const buildOptions = withMenuBuildOptions(options);
  const folderPath = String(folderPathRaw || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "") || ".";
  const agentRoot = agentRootAbsolute || getAgentRoot();
  const containerFolder = getAgentContainerFolder();
  const kitFolder = getAgentKitFolder();
  const sharedFolder = getAgentSharedFolder();

  const resolveBranchListOptions = (depth) => {
    const branchDepth = Number.isFinite(buildOptions.branchDepth)
      ? Math.min(20, Math.max(1, Math.floor(buildOptions.branchDepth)))
      : null;
    const maxDepth = Number.isFinite(buildOptions.maxDepth) ? buildOptions.maxDepth : null;
    if (branchDepth !== null && maxDepth !== null) {
      return { ...buildOptions, maxDepth: Math.min(maxDepth, depth + branchDepth) };
    }
    return buildOptions;
  };

  if (folderPath === ".") {
    return buildAgentMenu(agentRoot, buildOptions);
  }

  if (containerFolder && folderPath === containerFolder) {
    const containerAbsolute = await resolveAgentSubfolderAbsolute(agentRoot, containerFolder);
    if (!containerAbsolute) {
      throw new Error("Container folder not found");
    }
    const tree = await listNodeMdFiles(
      containerAbsolute,
      containerFolder,
      0,
      resolveBranchListOptions(0)
    );
    const branch = await normalizeContainerMenuTree(tree, containerAbsolute, containerFolder);
    enrichMenuTreeRuntimeRollup(branch);
    enrichMenuTreeSchemaRollup(branch);
    return branch;
  }

  if (sharedFolder && folderPath === sharedFolder) {
    const sharedAbsolute = await resolveAgentSubfolderAbsolute(agentRoot, sharedFolder);
    if (!sharedAbsolute) {
      throw new Error("Shared folder not found");
    }
    const tree = await listNodeMdFiles(sharedAbsolute, sharedFolder, 0, resolveBranchListOptions(0));
    const branch = await normalizeSharedMenuTree(tree, sharedAbsolute);
    enrichMenuTreeRuntimeRollup(branch);
    enrichMenuTreeSchemaRollup(branch);
    return branch;
  }

  if (kitFolder && folderPath === kitFolder) {
    const kitAbsolute = await resolveAgentSubfolderAbsolute(agentRoot, kitFolder);
    if (!kitAbsolute) {
      throw new Error("Service folder not found");
    }
    const tree = await listNodeMdFiles(kitAbsolute, kitFolder, 0, resolveBranchListOptions(0));
    const branch = await normalizeServiceMenuTree(tree, kitAbsolute);
    enrichMenuTreeRuntimeRollup(branch);
    enrichMenuTreeSchemaRollup(branch);
    return branch;
  }

  const absolute = normalizeWorkspacePath(folderPath);
  if (!absolute) {
    throw new Error("Invalid folder path");
  }
  const stat = await fs.stat(absolute).catch(() => null);
  if (!stat?.isDirectory()) {
    throw new Error("Folder not found");
  }

  const segments = folderPath.split("/").filter(Boolean);
  const depth = Math.max(0, segments.length - 1);
  const tree = await listNodeMdFiles(absolute, folderPath, depth, resolveBranchListOptions(depth));

  let branch = tree;
  if (containerFolder && folderPath.startsWith(`${containerFolder}/`)) {
    branch = await normalizeNestedContainerMenuTree(tree, absolute, folderPath);
  } else if (kitFolder && folderPath.startsWith(`${kitFolder}/`)) {
    branch = tree;
  }
  enrichMenuTreeRuntimeRollup(branch);
  enrichMenuTreeSchemaRollup(branch);
  return branch;
}

async function normalizeServiceMenuTree(tree, serviceAbsolute) {
  if (!tree || !serviceAbsolute) return tree;
  const serviceFolder = getAgentKitFolder();
  const serviceManifestRel = serviceFolder ? getServiceAreaManifestRel(serviceFolder) : null;
  tree.indexPath = serviceManifestRel;
  tree.color = null;
  tree.tags = [];
  tree.category = null;
  tree.status = null;
  tree.hasPreview = false;
  tree.previewUrl = null;
  if (serviceManifestRel) {
    const indexMeta = await enrichMenuNodeItem(serviceManifestRel);
    tree.title = await readNodeDisplayLabelForManifestRel(serviceManifestRel);
    tree.color = indexMeta.color;
    tree.tags = indexMeta.tags || [];
    tree.category = indexMeta.category || null;
    tree.status = indexMeta.status || null;
    tree.hasPreview = indexMeta.hasPreview;
    tree.previewUrl = indexMeta.previewUrl;
  }
  tree.sections = (tree.sections || []).filter(
    (section) =>
      section.title !== SERVICE_AREA_NAME &&
      section.title !== "Служебное" &&
      section.title !== "Служебные темы и компоненты"
  );
  return tree;
}

const CONTAINER_AREA_NAME = "Контейнер";
const SHARED_AREA_NAME = "Общие темы и ресурсы";
const SHARED_DEFAULT_THEMES = [
  { slug: "inbox", title: "Входящие" },
  { slug: "notes", title: "Заметки" },
  { slug: "references", title: "Источники" },
  { slug: "artefacts", title: "Артефакты" },
  { slug: "scripts", title: "Скрипты" },
  { slug: "media", title: "Медиа" }
];

async function normalizeContainerMenuTree(tree, containerAbsolute) {
  if (!tree || !containerAbsolute) return tree;
  const containerFolder = getAgentContainerFolder();
  const containerManifestRel = containerFolder ? `${containerFolder}/${AREA_MANIFEST_FILE}` : null;
  return normalizeNestedContainerMenuTree(tree, containerAbsolute, containerFolder || "");
}

async function normalizeNestedContainerMenuTree(tree, containerAbsolute, containerRelPrefix) {
  if (!tree || !containerAbsolute) return tree;
  const prefix = String(containerRelPrefix || "").replace(/\\/g, "/").replace(/\/$/, "");
  const containerManifestRel = prefix ? `${prefix}/${AREA_MANIFEST_FILE}` : AREA_MANIFEST_FILE;
  tree.indexPath = containerManifestRel;
  tree.color = null;
  tree.tags = [];
  tree.category = null;
  tree.status = null;
  tree.hasPreview = false;
  tree.previewUrl = null;
  if (containerManifestRel) {
    const indexMeta = await enrichMenuNodeItem(containerManifestRel);
    tree.title = await readNodeDisplayLabelForManifestRel(containerManifestRel);
    tree.color = indexMeta.color;
    tree.tags = indexMeta.tags || [];
    tree.category = indexMeta.category || null;
    tree.status = indexMeta.status || null;
    tree.hasPreview = indexMeta.hasPreview;
    tree.previewUrl = indexMeta.previewUrl;
  }
  tree.sections = (tree.sections || []).filter((section) => section.title !== CONTAINER_AREA_NAME);
  return tree;
}

async function normalizeSharedMenuTree(tree, sharedAbsolute) {
  if (!tree || !sharedAbsolute) return tree;
  const sharedFolder = getAgentSharedFolder();
  return normalizeNestedSharedMenuTree(tree, sharedAbsolute, sharedFolder || "");
}

async function normalizeNestedSharedMenuTree(tree, sharedAbsolute, sharedRelPrefix) {
  if (!tree || !sharedAbsolute) return tree;
  const prefix = String(sharedRelPrefix || "").replace(/\\/g, "/").replace(/\/$/, "");
  const sharedManifestRel = prefix ? `${prefix}/${AREA_MANIFEST_FILE}` : AREA_MANIFEST_FILE;
  tree.indexPath = sharedManifestRel;
  tree.color = null;
  tree.tags = [];
  tree.category = null;
  tree.status = null;
  tree.hasPreview = false;
  tree.previewUrl = null;
  if (sharedManifestRel) {
    const indexMeta = await enrichMenuNodeItem(sharedManifestRel);
    tree.title = await readNodeDisplayLabelForManifestRel(sharedManifestRel);
    tree.color = indexMeta.color;
    tree.tags = indexMeta.tags || [];
    tree.category = indexMeta.category || null;
    tree.status = indexMeta.status || null;
    tree.hasPreview = indexMeta.hasPreview;
    tree.previewUrl = indexMeta.previewUrl;
  }
  tree.sections = (tree.sections || []).filter((section) => section.title !== SHARED_AREA_NAME);
  return tree;
}

async function bootstrapSharedTheme(sharedAbsolute, sharedFolder, theme) {
  if (!sharedAbsolute || !sharedFolder || !theme?.slug) return null;
  const themeDir = path.join(sharedAbsolute, theme.slug);
  if (await dirExists(themeDir)) {
    const manifestAbsolute = path.join(themeDir, AREA_MANIFEST_FILE);
    if (await fileExists(manifestAbsolute)) {
      return `${sharedFolder}/${theme.slug}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/");
    }
  } else {
    await fs.mkdir(themeDir, { recursive: true });
  }
  const manifestAbsolute = path.join(themeDir, AREA_MANIFEST_FILE);
  try {
    await fs.access(manifestAbsolute);
  } catch {
    const frontmatter = buildManifestCreateFrontmatter("topic", theme.title, theme.slug);
    await fs.writeFile(
      manifestAbsolute,
      joinNodeFrontmatter(frontmatter, `# ${theme.title}\n\nОбщие ресурсы: ${theme.title.toLowerCase()}.\n`),
      "utf-8"
    );
  }
  const themeManifestRel = `${sharedFolder}/${theme.slug}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/");
  await ensureManifestStorageSlotDir(themeManifestRel);
  await appendMenuSortOrderEntry(themeDir, theme.slug);
  return themeManifestRel;
}

async function bootstrapSharedDefaultThemes(sharedAbsolute, sharedFolder) {
  if (!sharedAbsolute || !sharedFolder) return;
  for (const theme of SHARED_DEFAULT_THEMES) {
    await bootstrapSharedTheme(sharedAbsolute, sharedFolder, theme);
  }
}

function findSharedThemePreset(slug) {
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized) return null;
  return SHARED_DEFAULT_THEMES.find((theme) => theme.slug === normalized) || null;
}

const SHARED_MOUNT_SPECS = [
  { slotKey: "inbox", themeSlug: "inbox", label: "Входящие", mode: "inbox" },
  { slotKey: "note", themeSlug: "notes", label: "Заметки", mode: "note" },
  { slotKey: "references", themeSlug: "references", label: "Источники", mode: "references" },
  { slotKey: "artefacts", themeSlug: "artefacts", label: "Артефакты", mode: "artefacts" },
  { slotKey: "scripts", themeSlug: "scripts", label: "Скрипты", mode: "scripts" },
  { slotKey: "media", themeSlug: "media", label: "Медиа", mode: "media" }
];

const SHARED_MOUNT_SPECS_BY_SLOT = new Map(SHARED_MOUNT_SPECS.map((spec) => [spec.slotKey, spec]));
const SHARED_MOUNT_SPECS_BY_THEME = new Map(SHARED_MOUNT_SPECS.map((spec) => [spec.themeSlug, spec]));

function normalizeSharedAgentRel(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function isPathUnderSharedFolder(relPath) {
  const sharedFolder = getAgentSharedFolder();
  if (!sharedFolder) return false;
  const normalized = normalizeSharedAgentRel(relPath);
  const prefix = normalizeSharedAgentRel(sharedFolder);
  return normalized === prefix || normalized.startsWith(`${prefix}/`);
}

function getSharedThemeManifestRel(themeSlug) {
  const sharedFolder = getAgentSharedFolder();
  if (!sharedFolder || !themeSlug) return null;
  return `${sharedFolder}/${themeSlug}/${MANIFEST_FILE}`.replace(/\\/g, "/");
}

function getSharedThemeSlugFromManifestRel(manifestRel) {
  const sharedFolder = getAgentSharedFolder();
  if (!sharedFolder || !isPathUnderSharedFolder(manifestRel)) return null;
  const normalized = normalizeSharedAgentRel(manifestRel);
  const prefix = `${normalizeSharedAgentRel(sharedFolder)}/`;
  if (!normalized.startsWith(prefix)) return null;
  const tail = normalized.slice(prefix.length);
  const slug = tail.split("/").filter(Boolean)[0] || null;
  return slug && SHARED_MOUNT_SPECS_BY_THEME.has(slug) ? slug : slug;
}

function isTopicManifestEligibleForSharedMounts(manifestRel) {
  const normalized = normalizeSharedAgentRel(manifestRel);
  if (!normalized || isPathUnderSharedFolder(normalized)) return false;
  return isTopicManifestFileName(path.basename(normalized));
}

function resolveSharedMountSpecForStorageFolder(subfolderName) {
  const slotKey = resolveSlotKeyFromStorageFolderName(subfolderName);
  if (slotKey && SHARED_MOUNT_SPECS_BY_SLOT.has(slotKey)) {
    return SHARED_MOUNT_SPECS_BY_SLOT.get(slotKey);
  }
  const canonical = normalizeStorageSubfolderName(subfolderName);
  if (canonical && SHARED_MOUNT_SPECS_BY_THEME.has(canonical)) {
    return SHARED_MOUNT_SPECS_BY_THEME.get(canonical);
  }
  return null;
}

async function resolveSharedThemeNodeAbsolute(themeSlug) {
  const manifestRel = getSharedThemeManifestRel(themeSlug);
  if (!manifestRel) return null;
  const manifestAbsolute = normalizeWorkspacePath(manifestRel);
  if (!manifestAbsolute || !(await fileExists(manifestAbsolute))) return null;
  return path.dirname(manifestAbsolute);
}

async function resolveSharedMountSubfolderAbsolute(topicNodeAbsolute, subfolderName) {
  const topicRel = path.relative(getAgentRoot(), topicNodeAbsolute).replace(/\\/g, "/");
  if (isPathUnderSharedFolder(topicRel)) return null;

  const mount = resolveSharedMountSpecForStorageFolder(subfolderName);
  if (!mount) return null;

  const sharedNodeAbsolute = await resolveSharedThemeNodeAbsolute(mount.themeSlug);
  if (!sharedNodeAbsolute) return null;

  return getNodeStorageSubfolderAbsolute(sharedNodeAbsolute, subfolderName);
}

async function countSharedMountEntries(mount, themeNodeAbsolute) {
  if (!mount || !themeNodeAbsolute) return 0;
  const folderNames = mount.slotKey === "note" ? ["notes", "note"] : [mount.themeSlug, mount.slotKey];
  let total = 0;
  for (const folderName of folderNames) {
    const folderAbsolute = await getNodeStorageSubfolderAbsolute(themeNodeAbsolute, folderName);
    if (folderAbsolute) total += await countDirectoryFiles(folderAbsolute);
  }
  return total;
}

async function buildSharedMountsForTopic(manifestRel) {
  if (!isTopicManifestEligibleForSharedMounts(manifestRel)) return [];

  const mounts = [];
  for (const spec of SHARED_MOUNT_SPECS) {
    const themeManifestPath = getSharedThemeManifestRel(spec.themeSlug);
    const themeNodeAbsolute = await resolveSharedThemeNodeAbsolute(spec.themeSlug);
    if (!themeManifestPath || !themeNodeAbsolute) continue;

    const entryCount = await countSharedMountEntries(spec, themeNodeAbsolute);
    mounts.push({
      slotKey: spec.slotKey,
      themeSlug: spec.themeSlug,
      themeManifestPath,
      label: spec.label,
      mode: spec.mode,
      entryCount
    });
  }
  return mounts;
}

async function buildSharedStorageContext(manifestRel) {
  const normalized = normalizeSharedAgentRel(manifestRel);
  if (!isPathUnderSharedFolder(normalized)) return null;
  const themeSlug = getSharedThemeSlugFromManifestRel(normalized);
  const mount = themeSlug ? SHARED_MOUNT_SPECS_BY_THEME.get(themeSlug) || null : null;
  return {
    isSharedTheme: Boolean(themeSlug),
    themeSlug,
    slotKey: mount?.slotKey || null,
    label: mount?.label || null,
    mode: mount?.mode || null,
    rootManifestPath: getSharedThemeManifestRel(themeSlug) || null
  };
}

function dedupeReservedRootMenuSections(menu) {
  const reserved = new Set(
    [getAgentKitFolder(), getAgentSharedFolder(), getAgentContainerFolder(), AGENT_SYSTEM_REL]
      .filter(Boolean)
      .map((folder) => String(folder).toLowerCase())
  );
  menu.sections = (menu.sections || []).filter((section) => {
    const folderPath = String(section.folderPath || "").replace(/\\/g, "/");
    const topSegment = folderPath.split("/").filter(Boolean)[0] || "";
    return !reserved.has(topSegment.toLowerCase());
  });
  return dedupeRootMenuSections(menu);
}

function dedupeGitRepoReservedSections(sections, gitRootRel) {
  const reserved = new Set(
    [getAgentKitFolder(), getAgentSharedFolder(), getAgentContainerFolder()]
      .filter(Boolean)
      .map((folder) => String(folder).toLowerCase())
  );
  const gitPrefix = gitRootRel ? `${String(gitRootRel || "").replace(/\\/g, "/")}/` : "";
  return (sections || []).filter((section) => {
    const folderPath = String(section.folderPath || "").replace(/\\/g, "/");
    if (!folderPath) return true;
    let tail = folderPath;
    if (gitPrefix && folderPath.startsWith(gitPrefix)) {
      tail = folderPath.slice(gitPrefix.length);
    }
    const firstSeg = tail.split("/").filter(Boolean)[0] || "";
    return !reserved.has(firstSeg.toLowerCase());
  });
}

async function enrichGitRepoMenuNode(node, gitRootAbsolute, gitRootRel, options = {}) {
  if (!node?.hasGitSelf || !gitRootRel) return node;

  const kitFolder = getAgentKitFolder();
  let serviceTree = null;
  if (kitFolder) {
    const kitAbsolute = path.join(gitRootAbsolute, kitFolder);
    if (await dirExists(kitAbsolute)) {
      const kitRel = `${gitRootRel}/${kitFolder}`.replace(/\\/g, "/");
      serviceTree = await normalizeServiceMenuTree(
        await listNodeMdFiles(kitAbsolute, kitRel, 0, options),
        kitAbsolute
      );
    }
  }

  return {
    ...node,
    serviceTree,
    sections: dedupeGitRepoReservedSections(node.sections, gitRootRel)
  };
}

function getAreaFolderPathFromManifestRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  if (!isAreaManifestRelPath(normalized)) return null;
  return path.dirname(normalized).replace(/\\/g, "/");
}

function dedupeRootMenuSections(menu) {
  if (!menu?.indexPath) return menu;
  const indexFolder = getAreaFolderPathFromManifestRel(menu.indexPath);
  if (!indexFolder || indexFolder === ".") return menu;
  menu.sections = (menu.sections || []).filter((section) => section.folderPath !== indexFolder);
  return menu;
}

function sendRenameError(res, error) {
  const code = error && error.code ? String(error.code) : "";
  if (code === "ENOENT") {
    return sendJson(res, 404, { error: "Node file or folder not found" });
  }
  if (code === "EEXIST" || code === "ENOTEMPTY") {
    return sendJson(res, 409, { error: "Target name already exists" });
  }
  if (code === "EPERM" || code === "EACCES") {
    return sendJson(res, 403, { error: "No permission to rename node" });
  }
  return sendJson(res, 500, {
    error: "Failed to rename node",
    details: String(error && error.message ? error.message : error)
  });
}

function sendFileOpError(res, error, actionLabel) {
  const code = error && error.code ? String(error.code) : "";
  if (code === "ENOENT") return sendJson(res, 404, { error: "File not found" });
  if (code === "EEXIST" || code === "ENOTEMPTY") return sendJson(res, 409, { error: "Target already exists" });
  if (code === "EPERM" || code === "EACCES") {
    return sendJson(res, 403, { error: `No permission to ${actionLabel}` });
  }
  return sendJson(res, 500, {
    error: `Failed to ${actionLabel}`,
    details: String(error && error.message ? error.message : error)
  });
}

function normalizeMoveParentPath(raw) {
  const normalized = String(raw || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  return normalized || ".";
}

function normalizeMoveTargetRelFile(raw, fallbackFile) {
  const value = String(raw || "")
    .trim()
    .replace(/\\/g, "/");
  if (value) return normalizeRelativeFilePath(value);
  return normalizeRelativeFilePath(fallbackFile);
}

function isDescendantRelPath(ancestorRel, candidateRel) {
  const ancestor = String(ancestorRel || "")
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
  const candidate = String(candidateRel || "")
    .replace(/\\/g, "/")
    .replace(/\/+$/g, "");
  if (!ancestor || !candidate) return false;
  return candidate === ancestor || candidate.startsWith(`${ancestor}/`);
}

async function removeMenuSortOrderEntry(dirAbsolute, sortKey) {
  const key = String(sortKey || "").trim();
  if (!key || !dirAbsolute) return;
  const order = [...((await readMenuSortOrder(dirAbsolute)) || [])];
  const nextOrder = order.filter((entry) => String(entry || "").trim() !== key);
  if (nextOrder.length === order.length) return;
  const sortPath = path.join(dirAbsolute, MENU_SORT_FILE);
  await fs.writeFile(sortPath, `${JSON.stringify({ order: nextOrder }, null, 2)}\n`, "utf-8");
}

async function resolveExternalFileOpContext(manifestRelPath, relFile) {
  const nodeAbsolute = await resolveApiManifestAbsolute(manifestRelPath);
  if (!nodeAbsolute) return { error: "Invalid file path", status: 400 };

  const normalizedRelFile = normalizeExternalMemoryFileRelForManifest(manifestRelPath, relFile);
  if (!normalizedRelFile || !normalizedRelFile.toLowerCase().endsWith(".md")) {
    return { error: "Only .md files are allowed", status: 400 };
  }

  const folderAbsolute = await resolveExternalMemoryFolderAbsolute(manifestRelPath);
  if (!folderAbsolute) return { error: "External folder not found", status: 404 };

  const fileAbsolute = path.join(folderAbsolute, normalizedRelFile);
  if (!isPathInsideDirectory(folderAbsolute, fileAbsolute)) {
    return { error: "Invalid external file path", status: 400 };
  }

  try {
    await fs.access(fileAbsolute);
  } catch {
    return { error: "External file not found", status: 404 };
  }

  return {
    manifestRelPath,
    nodeAbsolute,
    folderAbsolute,
    normalizedRelFile,
    fileAbsolute
  };
}

async function deleteExternalMemoryFile(manifestRelPath, relFile) {
  const ctx = await resolveExternalFileOpContext(manifestRelPath, relFile);
  if (ctx.error) return ctx;
  await fs.rm(ctx.fileAbsolute, { force: false });
  return {
    deleted: ctx.normalizedRelFile.replace(/\\/g, "/"),
    path: ctx.manifestRelPath
  };
}

async function moveExternalMemoryFile(manifestRelPath, relFile, options = {}) {
  const ctx = await resolveExternalFileOpContext(manifestRelPath, relFile);
  if (ctx.error) return ctx;

  const targetManifest = String(options.targetPath || manifestRelPath).trim();
  const targetNodeAbsolute = await resolveApiManifestAbsolute(targetManifest);
  if (!targetNodeAbsolute) return { error: "Invalid target path", status: 400 };

  const targetFolderAbsolute = await resolveNodeSubfolderAbsolute(targetNodeAbsolute, STORAGE_SUBFOLDER_CONTENT, {
    create: true
  });
  if (!targetFolderAbsolute) return { error: "External folder not found", status: 404 };

  const nextRelFile = normalizeMoveTargetRelFile(options.targetFile, ctx.normalizedRelFile);
  if (!nextRelFile) return { error: "Invalid target file path", status: 400 };

  const nextAbsolute = path.join(targetFolderAbsolute, nextRelFile);
  if (!isPathInsideDirectory(targetFolderAbsolute, nextAbsolute)) {
    return { error: "Invalid target path", status: 400 };
  }

  if (path.resolve(ctx.fileAbsolute) === path.resolve(nextAbsolute)) {
    return { error: "File is already at the target location", status: 409 };
  }

  if (await targetPathOccupiedByOther(ctx.fileAbsolute, nextAbsolute)) {
    return { error: "File with this name already exists", status: 409 };
  }

  await renamePathCaseAware(ctx.fileAbsolute, nextAbsolute);

  const content = await fs.readFile(nextAbsolute, "utf-8");
  let linkRewrite = { filesUpdated: 0, linksUpdated: 0, files: [] };
  const oldWorkspaceRel = await resolveExternalFileWorkspaceRel(manifestRelPath, ctx.normalizedRelFile);
  const newWorkspaceRel = await resolveExternalFileWorkspaceRel(targetManifest, nextRelFile);
  if (
    oldWorkspaceRel &&
    newWorkspaceRel &&
    oldWorkspaceRel.replace(/\\/g, "/") !== newWorkspaceRel.replace(/\\/g, "/")
  ) {
    linkRewrite = await rewriteMarkdownLinksForRename({
      exactMappings: [{ oldRel: oldWorkspaceRel, newRel: newWorkspaceRel }]
    });
  }

  return {
    path: targetManifest,
    file: nextRelFile.replace(/\\/g, "/"),
    content,
    linkRewrite
  };
}

async function resolveMediaFileOpContext(manifestRelPath, relFile) {
  const nodeAbsolute = await resolveApiManifestAbsolute(manifestRelPath);
  if (!nodeAbsolute) return { error: "Invalid file path", status: 400 };

  const normalizedRelFile = normalizeRelativeFilePath(relFile);
  if (!normalizedRelFile) return { error: "Invalid media file path", status: 400 };

  const mediaAbsolute = await resolveUploadedMediaFileAbsolute(nodeAbsolute, normalizedRelFile);
  if (!mediaAbsolute) return { error: "Media file not found", status: 404 };

  const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute);
  if (!folderAbsolute || !isPathInsideDirectory(folderAbsolute, mediaAbsolute)) {
    return { error: "Invalid media file path", status: 400 };
  }

  return {
    manifestRelPath,
    nodeAbsolute,
    folderAbsolute,
    normalizedRelFile,
    mediaAbsolute
  };
}

async function deleteMediaStorageFile(manifestRelPath, relFile) {
  const ctx = await resolveMediaFileOpContext(manifestRelPath, relFile);
  if (ctx.error) return ctx;

  await fs.rm(ctx.mediaAbsolute, { force: false });

  const sidecarAbsolute = resolveMediaSidecarAbsoluteFromMediaFile(ctx.mediaAbsolute);
  if (
    sidecarAbsolute &&
    (await isAllowedMediaSidecarAbsolute(ctx.nodeAbsolute, sidecarAbsolute))
  ) {
    await removeIfExists(sidecarAbsolute);
  }

  return {
    deleted: ctx.normalizedRelFile.replace(/\\/g, "/"),
    path: ctx.manifestRelPath
  };
}

async function moveMediaStorageFile(manifestRelPath, relFile, options = {}) {
  const ctx = await resolveMediaFileOpContext(manifestRelPath, relFile);
  if (ctx.error) return ctx;

  const targetManifest = String(options.targetPath || manifestRelPath).trim();
  const targetNodeAbsolute = await resolveApiManifestAbsolute(targetManifest);
  if (!targetNodeAbsolute) return { error: "Invalid target path", status: 400 };

  const targetFolderAbsolute = await getMediaFolderAbsolute(targetNodeAbsolute, { create: true });
  if (!targetFolderAbsolute) return { error: "Media folder not found", status: 404 };

  const nextRelFile = normalizeMoveTargetRelFile(
    options.targetFile,
    ctx.normalizedRelFile
  );
  if (!nextRelFile) return { error: "Invalid target file path", status: 400 };

  const nextAbsolute = path.join(targetFolderAbsolute, nextRelFile);
  if (!isPathInsideDirectory(targetFolderAbsolute, nextAbsolute)) {
    return { error: "Invalid target path", status: 400 };
  }

  if (path.resolve(ctx.mediaAbsolute) === path.resolve(nextAbsolute)) {
    return { error: "File is already at the target location", status: 409 };
  }

  if (await targetPathOccupiedByOther(ctx.mediaAbsolute, nextAbsolute)) {
    return { error: "File with this name already exists", status: 409 };
  }

  await renamePathCaseAware(ctx.mediaAbsolute, nextAbsolute);

  const sidecarAbsolute = resolveMediaSidecarAbsoluteFromMediaFile(ctx.mediaAbsolute);
  const nextSidecarAbsolute = resolveMediaSidecarAbsoluteFromMediaFile(nextAbsolute);
  if (
    sidecarAbsolute &&
    nextSidecarAbsolute &&
    (await isAllowedMediaSidecarAbsolute(ctx.nodeAbsolute, sidecarAbsolute)) &&
    (await isAllowedMediaSidecarAbsolute(targetNodeAbsolute, nextSidecarAbsolute))
  ) {
    try {
      await fs.rename(sidecarAbsolute, nextSidecarAbsolute);
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
    }
  }

  const sidecarRelPath = toMediaSidecarRelativePath(nextRelFile);
  let content = "";
  if (sidecarRelPath) {
    const sidecarAbsoluteNext = resolveMediaSidecarAbsoluteFromMediaFile(nextAbsolute);
    if (sidecarAbsoluteNext) {
      try {
        content = await fs.readFile(sidecarAbsoluteNext, "utf-8");
      } catch {
        content = "";
      }
    }
  }

  let linkRewrite = { filesUpdated: 0, linksUpdated: 0, files: [] };
  const exactMappings = [];
  const oldAssetRel = manifestRelFromNodeAbsolute(ctx.mediaAbsolute);
  const newAssetRel = manifestRelFromNodeAbsolute(nextAbsolute);
  if (oldAssetRel && newAssetRel && oldAssetRel !== newAssetRel) {
    exactMappings.push({ oldRel: oldAssetRel, newRel: newAssetRel });
  }
  const oldSidecarAbsolute = resolveMediaSidecarAbsoluteFromMediaFile(ctx.mediaAbsolute);
  const newSidecarAbsolute = resolveMediaSidecarAbsoluteFromMediaFile(nextAbsolute);
  if (oldSidecarAbsolute && newSidecarAbsolute && oldSidecarAbsolute !== newSidecarAbsolute) {
    const oldSidecarWorkspaceRel = manifestRelFromNodeAbsolute(oldSidecarAbsolute);
    const newSidecarWorkspaceRel = manifestRelFromNodeAbsolute(newSidecarAbsolute);
    if (
      oldSidecarWorkspaceRel &&
      newSidecarWorkspaceRel &&
      oldSidecarWorkspaceRel !== newSidecarWorkspaceRel
    ) {
      exactMappings.push({ oldRel: oldSidecarWorkspaceRel, newRel: newSidecarWorkspaceRel });
    }
  }
  if (exactMappings.length) {
    linkRewrite = await rewriteMarkdownLinksForRename({ exactMappings });
  }

  return {
    path: targetManifest,
    file: nextRelFile.replace(/\\/g, "/"),
    sidecar: sidecarRelPath ? sidecarRelPath.replace(/\\/g, "/") : "",
    content,
    linkRewrite
  };
}

async function moveNodeManifest(relPath, parentPathRaw) {
  const resolvedRelPath = String(await resolveExistingWorkspaceRelPath(relPath)).replace(/\\/g, "/");
  if (isServiceAreaRootManifestRel(resolvedRelPath) || isContainerAreaRootManifestRel(resolvedRelPath)) {
    return { error: "Служебная папка workspace не может быть перемещена", status: 403 };
  }
  if (isSystemReferenceManifestRel(resolvedRelPath)) {
    return { error: "Системный справочник нельзя перемещать", status: 403 };
  }
  if (parsePartFolderManifestRel(resolvedRelPath)) {
    return { error: "Parts cannot be moved with this API", status: 400 };
  }

  const parentPath = normalizeMoveParentPath(parentPathRaw);
  const parentAbsolute = await resolveExistingWorkspaceDirAbsolute(parentPath === "." ? "" : parentPath);
  if (!parentAbsolute) return { error: "Invalid parent folder path", status: 400 };

  const normalized = resolvedRelPath;
  const absolute = normalizeWorkspacePath(normalized);
  if (!absolute) return { error: "Invalid file path", status: 400 };

  let nextRelPath = normalized;
  let linkRewrite = { filesUpdated: 0, linksUpdated: 0, files: [] };

  if (isAreaManifestRelPath(normalized)) {
    const folderRelPath = path.dirname(normalized).replace(/\\/g, "/");
    if (!folderRelPath || folderRelPath === ".") {
      return { error: "Root Workspaces folder cannot be moved", status: 400 };
    }
    if (parentPath !== "." && isDescendantRelPath(folderRelPath, parentPath)) {
      return { error: "Cannot move folder into itself or its descendant", status: 400 };
    }

    const currentParentRel = path.dirname(folderRelPath).replace(/\\/g, "/");
    const currentParentNorm = !currentParentRel || currentParentRel === "." ? "." : currentParentRel;
    if (currentParentNorm === parentPath) {
      return { error: "Node is already in this folder", status: 409 };
    }

    const folderName = path.basename(folderRelPath);
    const targetFolderRel = parentPath === "." ? folderName : `${parentPath}/${folderName}`;
    const currentFolderAbsolute = path.dirname(absolute);
    const targetFolderAbsolute = path.join(parentAbsolute, folderName);

    try {
      await fs.access(targetFolderAbsolute);
      return { error: "Folder with this name already exists", status: 409 };
    } catch {
      // target does not exist
    }

    await fs.rename(currentFolderAbsolute, targetFolderAbsolute);

    const sortSlug = getMenuSortSlugFromFolderRel(folderRelPath);
    await removeMenuSortOrderEntry(path.dirname(currentFolderAbsolute), sortSlug);
    await appendMenuSortOrderEntry(parentAbsolute, sortSlug);

    nextRelPath = path.join(targetFolderRel, path.basename(normalized)).replace(/\\/g, "/");
    if (folderRelPath !== targetFolderRel) {
      linkRewrite = await rewriteMarkdownLinksForRename({
        prefixMappings: [{ oldPrefix: folderRelPath, newPrefix: targetFolderRel }]
      });
    }
  } else {
    const fileName = path.basename(normalized);
    const currentDirRel = path.dirname(normalized).replace(/\\/g, "/");
    const currentDirNorm = !currentDirRel || currentDirRel === "." ? "." : currentDirRel;
    if (currentDirNorm === parentPath) {
      return { error: "Node is already in this folder", status: 409 };
    }

    const targetRelPath = parentPath === "." ? fileName : `${parentPath}/${fileName}`;
    const targetAbsolute = normalizeWorkspacePath(targetRelPath);
    if (!targetAbsolute) return { error: "Invalid target path", status: 400 };

    try {
      await fs.access(targetAbsolute);
      return { error: "File with this name already exists", status: 409 };
    } catch {
      // target does not exist
    }

    const oldContentAbsolute = normalizeWorkspacePath(toContentFilePath(normalized));
    const newContentAbsolute = normalizeWorkspacePath(toContentFilePath(targetRelPath));
    const oldTodoAbsolute = normalizeWorkspacePath(toTodoFilePath(normalized));
    const newTodoAbsolute = normalizeWorkspacePath(toTodoFilePath(targetRelPath));
    const oldConfigAbsolute = normalizeWorkspacePath(toNodeConfigFilePath(normalized));
    const newConfigAbsolute = normalizeWorkspacePath(toNodeConfigFilePath(targetRelPath));

    await fs.rename(absolute, targetAbsolute);
    if (oldContentAbsolute && newContentAbsolute) await renameIfExists(oldContentAbsolute, newContentAbsolute);
    if (oldTodoAbsolute && newTodoAbsolute) await renameIfExists(oldTodoAbsolute, newTodoAbsolute);
    if (oldConfigAbsolute && newConfigAbsolute) await renameIfExists(oldConfigAbsolute, newConfigAbsolute);

    const oldNamedStorageAbsolute = getNamedStorageRootAbsolute(normalized);
    const newNamedStorageAbsolute = getNamedStorageRootAbsolute(targetRelPath);
    if (oldNamedStorageAbsolute && newNamedStorageAbsolute && oldNamedStorageAbsolute !== newNamedStorageAbsolute) {
      await renameIfExists(oldNamedStorageAbsolute, newNamedStorageAbsolute);
    }

    const sortSlug = getManifestSlugFromRel(normalized);
    const oldParentAbsolute = await resolveExistingWorkspaceDirAbsolute(
      currentDirNorm === "." ? "" : currentDirNorm
    );
    if (oldParentAbsolute) await removeMenuSortOrderEntry(oldParentAbsolute, sortSlug);
    await appendMenuSortOrderEntry(parentAbsolute, sortSlug);

    nextRelPath = targetRelPath;
    const oldRel = stripAgentContentPrefixFromRelPath(normalized);
    const newRel = stripAgentContentPrefixFromRelPath(targetRelPath);
    if (oldRel && newRel && oldRel !== newRel) {
      linkRewrite = await rewriteMarkdownLinksForRename({
        exactMappings: [{ oldRel, newRel }]
      });
    }
  }

  return {
    path: stripAgentContentPrefixFromRelPath(nextRelPath),
    parentPath,
    linkRewrite
  };
}

const VISIBLE_DOT_MENU_ENTRIES = new Set([".awn-framework"]);
const MENU_SKIP_DIRS = new Set([
  "node_modules",
  "vendor",
  "dist",
  "out",
  "build",
  ".cache",
  "tmp",
  "temp",
  ".idea",
  ".vscode",
  "coverage",
  ".nyc_output",
  "__pycache__",
  ".venv",
  "venv",
  "target"
]);
const MENU_SORT_FILE = "sort.json";
const PARTS_FOLDER = "_Parts";

const TREE_MENU_TYPES = new Set(["workspace", "area", "topic"]);
const SERVICE_MENU_LEAF_TYPES = new Set(["service-doc", "catalog", "taxonomy"]);

async function readManifestMenuMeta(manifestRel) {
  try {
    const { frontmatter } = await readNodeFrontmatterContent(manifestRel);
    const kind = String(getYamlScalar(frontmatter, "kind") || "").trim();
    const typeRaw = String(getYamlScalar(frontmatter, "awn-type") || "").trim();
    const treeType = normalizeDeclaredManifestTreeType(typeRaw);
    const type =
      treeType ||
      (typeRaw.startsWith("awn.") ? typeRaw.slice(4) : typeRaw);
    return { kind, type };
  } catch {
    return { kind: "", type: "" };
  }
}

async function shouldRenderMenuChildAsTopicItem(child) {
  const manifestRel = child?.indexPath;
  if (!manifestRel) return false;
  if ((child.sections || []).length > 0) return false;
  if ((child.items || []).length > 0) return false;
  if (child.containerTree) return false;
  if (isSystemReferenceManifestRel(manifestRel)) return true;
  const { type } = await readManifestMenuMeta(manifestRel);
  if (type === "topic" || SERVICE_MENU_LEAF_TYPES.has(type)) return true;
  return false;
}

async function isTreeMenuManifestRel(manifestRel) {
  const normalized = String(manifestRel || "").replace(/\\/g, "/");
  if (!normalized || !isManifestMdRelPath(normalized)) return false;
  if (isSystemReferenceManifestRel(normalized)) return true;
  const { kind, type } = await readManifestMenuMeta(normalized);
  if (kind === "service") return false;
  if (kind === "tree") return true;
  if (TREE_MENU_TYPES.has(type)) return true;
  if (SERVICE_MENU_LEAF_TYPES.has(type)) return true;
  if (type === "service") return true;
  return !type;
}

async function resolveExistingAreaManifestBasename(dirAbsolute) {
  for (const name of AREA_MANIFEST_CANDIDATES) {
    const candidate = path.join(dirAbsolute, name);
    if (await nodePathExists(candidate)) return name;
  }
  return null;
}

async function resolveExistingNodeManifestRel(dirAbsolute, relDirPrefix = "") {
  const base = await resolveExistingAreaManifestBasename(dirAbsolute);
  if (!base) return null;
  const prefix = String(relDirPrefix || "").replace(/\\/g, "/");
  if (!prefix || prefix === ".") return base;
  return path.join(prefix, base).replace(/\\/g, "/");
}

async function resolveExistingTopicManifestRel(parentFolder, nodeBase) {
  for (const candidate of topicManifestCandidates(nodeBase, parentFolder)) {
    const absolute = normalizeWorkspacePath(candidate);
    if (absolute && (await nodePathExists(absolute))) {
      return candidate.replace(/\\/g, "/");
    }
  }
  const fallback = topicManifestCandidates(nodeBase, parentFolder)[0];
  return fallback ? fallback.replace(/\\/g, "/") : null;
}

function resolveParentDirectoryRelPath(parentPathRaw) {
  return resolveParentDirectoryFromManifestPath(parentPathRaw);
}

async function resolveExistingParentDirectoryRelPath(parentPathRaw) {
  const resolved = resolveParentDirectoryRelPath(parentPathRaw);
  const normalized = !resolved || resolved === "." ? "." : resolved.replace(/\\/g, "/");
  const absolute =
    normalized === "." || normalized === "" ? getAgentRoot() : normalizeWorkspacePath(normalized);
  if (absolute) {
    const stat = await fs.stat(absolute).catch(() => null);
    if (stat?.isDirectory()) return normalized;
  }
  return normalized;
}

async function resolveNodeManifestAbsolute(dirAbsolute) {
  const existing = await resolveExistingAreaManifestBasename(dirAbsolute);
  return path.join(dirAbsolute, existing || AREA_MANIFEST_FILE);
}

async function resolveNodeManifestRelForContainer(containerRelDir) {
  const normalized = String(containerRelDir || "").replace(/\\/g, "/");
  if (!normalized || normalized === ".") {
    const rootRel = await resolveRootAreaManifestRel(getAgentRoot());
    return rootRel || AREA_MANIFEST_FILE;
  }
  if (isAreaManifestRelPath(normalized)) return normalized;
  const serviceFolder = getAgentKitFolder();
  if (serviceFolder && normalized.replace(/\\/g, "/") === serviceFolder.replace(/\\/g, "/")) {
    return getServiceAreaManifestRel(serviceFolder);
  }
  const base = path.posix.basename(normalized);
  return joinAreaManifestRel(normalized, base);
}

function isHiddenMenuEntry(name) {
  return name.startsWith(".") && !VISIBLE_DOT_MENU_ENTRIES.has(name);
}

function shouldSkipMenuDirectory(name) {
  return MENU_SKIP_DIRS.has(String(name || "").toLowerCase());
}

function shouldSkipDirectoryListing(name) {
  if (isHiddenMenuEntry(name)) return true;
  return shouldSkipMenuDirectory(name);
}

function shouldSkipExternalMemoryDirectory(name) {
  const lower = String(name || "").trim().toLowerCase();
  if (!lower) return true;
  if (isStorageFolderName(name)) return true;
  if (lower === STORAGE_SUBFOLDER_ASSETS) return true;
  if (lower === STORAGE_SUBFOLDER_MAIN || lower === LEGACY_STORAGE_SUBFOLDER_MEMORY || lower === LEGACY_STORAGE_SUBFOLDER_CONTENT) return true;
  if (lower === STORAGE_SUBFOLDER_MEDIA) return true;
  return shouldSkipDirectoryListing(name);
}

function isPartsFolderName(name) {
  return String(name || "").toLowerCase() === PARTS_FOLDER.toLowerCase();
}

function isContainerFolderName(name) {
  const configured = getAgentContainerFolder();
  if (!configured) return false;
  return String(name || "").toLowerCase() === String(configured).toLowerCase();
}

function isSharedFolderName(name) {
  const configured = getAgentSharedFolder();
  if (!configured) return false;
  return String(name || "").toLowerCase() === String(configured).toLowerCase();
}

function isKitFolderName(name) {
  const configured = getAgentKitFolder();
  if (!configured) return false;
  return String(name || "").toLowerCase() === String(configured).toLowerCase();
}

function isServiceFolderName(name) {
  return isKitFolderName(name);
}

function stripVaultPrefixFromRelPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/");
}

function stripServicePrefixFromRelPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/");
}

function stripAgentContentPrefixFromRelPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/");
}

function toMenuDisplayCreatedPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/");
}

function getNodeContainerDir(nodeAbsolute) {
  return path.dirname(nodeAbsolute);
}

function resolveNodeContainerAbsolute(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").trim();
  if (!normalized) return null;
  const base = path.posix.basename(normalized);
  if (isAreaManifestFileName(base) || isTopicManifestFileName(base)) {
    const dirRel = path.dirname(normalized);
    if (!dirRel || dirRel === ".") return getAgentRoot();
    return normalizeWorkspacePath(dirRel);
  }
  return normalizeWorkspacePath(normalized);
}

async function resolveNodeContainerForReveal(relPath) {
  const containerAbsolute = resolveNodeContainerAbsolute(relPath);
  if (!containerAbsolute) {
    const error = new Error("Invalid file path");
    error.code = "INVALID_PATH";
    throw error;
  }

  const stat = await fs.stat(containerAbsolute).catch((error) => {
    if (error?.code === "ENOENT") {
      const notFound = new Error("Node folder not found");
      notFound.code = "ENOENT";
      throw notFound;
    }
    throw error;
  });
  if (!stat.isDirectory()) {
    const error = new Error("Node folder not found");
    error.code = "NOT_DIRECTORY";
    throw error;
  }

  const folderRel = path.relative(getAgentRoot(), containerAbsolute).replace(/\\/g, "/") || ".";
  return { folderRel, folderAbsolute: containerAbsolute };
}

async function revealFolderInSystemFileManager(absoluteDir) {
  if (process.platform === "darwin") {
    await execFileAsync("open", [absoluteDir]);
    return;
  }
  if (process.platform === "win32") {
    await execFileAsync("cmd.exe", ["/c", "start", "", absoluteDir]);
    return;
  }
  await execFileAsync("xdg-open", [absoluteDir]);
}

async function revealWorkspaceRelativePath(relPath, options = {}) {
  const normalized = String(relPath || "").replace(/\\/g, "/").trim().replace(/^\/+/, "");
  if (!normalized) {
    const error = new Error("Invalid file path");
    error.code = "INVALID_PATH";
    throw error;
  }

  let absolute = null;
  if (options.repoFile) {
    const repoAbsolute = await resolveAgentRootGitRepoAbsolute();
    if (!repoAbsolute) {
      const error = new Error("Git repository not found");
      error.code = "INVALID_PATH";
      throw error;
    }
    absolute = path.resolve(repoAbsolute, normalized);
    const repoPrefix = `${path.resolve(repoAbsolute)}${path.sep}`;
    if (!absolute.startsWith(repoPrefix) && absolute !== path.resolve(repoAbsolute)) {
      const error = new Error("Invalid file path");
      error.code = "INVALID_PATH";
      throw error;
    }
  } else {
    absolute = normalizeWorkspacePath(normalized);
    if (!absolute || !absolute.startsWith(getAgentRoot())) {
      const error = new Error("Invalid file path");
      error.code = "INVALID_PATH";
      throw error;
    }
  }

  const stat = await fs.stat(absolute).catch((error) => {
    if (error?.code === "ENOENT") {
      const notFound = new Error("File not found");
      notFound.code = "ENOENT";
      throw notFound;
    }
    throw error;
  });
  if (stat.isDirectory()) {
    await revealFolderInSystemFileManager(absolute);
  } else {
    await revealFileInSystemFileManager(absolute);
  }
  return { path: normalized, absolute };
}

async function revealFileInSystemFileManager(absoluteFile) {
  const fileAbsolute = path.resolve(String(absoluteFile || ""));
  if (!fileAbsolute) {
    const error = new Error("Invalid file path");
    error.code = "INVALID_PATH";
    throw error;
  }

  const stat = await fs.stat(fileAbsolute).catch((error) => {
    if (error?.code === "ENOENT") {
      const notFound = new Error("File not found");
      notFound.code = "ENOENT";
      throw notFound;
    }
    throw error;
  });
  if (!stat.isFile()) {
    const error = new Error("File not found");
    error.code = "NOT_FILE";
    throw error;
  }

  if (process.platform === "darwin") {
    await execFileAsync("open", ["-R", fileAbsolute]);
    return;
  }
  if (process.platform === "win32") {
    await execFileAsync("explorer", ["/select,", fileAbsolute]);
    return;
  }
  await execFileAsync("xdg-open", [path.dirname(fileAbsolute)]);
}

async function resolveMediaFileAbsoluteForReveal(manifestRelPath, relFile) {
  const nodeAbsolute = await resolveApiManifestAbsolute(manifestRelPath);
  if (!nodeAbsolute) {
    const error = new Error("Invalid file path");
    error.code = "INVALID_PATH";
    throw error;
  }

  const normalizedRelFile = normalizeRelativeFilePath(relFile);
  if (!normalizedRelFile) {
    const error = new Error("Invalid media file path");
    error.code = "INVALID_PATH";
    throw error;
  }

  const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute);
  if (!folderAbsolute) {
    const error = new Error("Media folder not found");
    error.code = "ENOENT";
    throw error;
  }

  const fileAbsolute = path.join(folderAbsolute, normalizedRelFile);
  if (!fileAbsolute.startsWith(folderAbsolute)) {
    const error = new Error("Invalid media file path");
    error.code = "INVALID_PATH";
    throw error;
  }

  const fileRel = manifestRelFromNodeAbsolute(fileAbsolute);
  return { fileRel, fileAbsolute };
}

function getNamedStorageRootAbsolute(nodeAbsoluteOrRel) {
  const rel = path.isAbsolute(String(nodeAbsoluteOrRel || ""))
    ? path.relative(getAgentRoot(), nodeAbsoluteOrRel).replace(/\\/g, "/")
    : String(nodeAbsoluteOrRel || "").replace(/\\/g, "/");
  return normalizeWorkspacePath(getNamedStorageSlotDirRel(rel, getStoragePathOptions()));
}

function getNodeBaseName(nodeAbsoluteOrRel) {
  const raw = String(nodeAbsoluteOrRel || "");
  const base = path.basename(raw);
  if (isAreaManifestFileName(base)) {
    return stripTopicPrefix(path.basename(path.dirname(raw)));
  }
  return stripTopicPrefix(base);
}

function getNodeStorageRootAbsolute(nodeAbsolute) {
  const rel = path.relative(getAgentRoot(), nodeAbsolute).replace(/\\/g, "/");
  const slotAbsolute = normalizeWorkspacePath(getNamedStorageSlotDirRel(rel, getStoragePathOptions()));
  if (slotAbsolute) return slotAbsolute;
  return getNodeContainerDir(nodeAbsolute);
}

function getNodeStorageRootRel(relNodePath) {
  const slotRel = getNamedStorageSlotDirRel(relNodePath, getStoragePathOptions());
  return slotRel ? slotRel.replace(/\\/g, "/") : "";
}

function resolveNodePathFromStorageRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const bundle = resolveManifestRelFromStorageBundlePath(normalized);
  if (!bundle) return null;
  for (const candidate of bundle.manifestCandidates) {
    if (isAreaManifestRelPath(candidate) || isTopicManifestFileName(path.basename(candidate))) {
      return candidate;
    }
  }
  return bundle.manifestCandidates[0] || null;
}

async function ensureManifestStorageSlotDir(relNodePath) {
  const resolvedRelPath = await resolveExistingWorkspaceRelPath(relNodePath);
  const rel = String(resolvedRelPath || "").replace(/\\/g, "/");
  const slotAbsolute = normalizeWorkspacePath(getNamedStorageSlotDirRel(rel, getStoragePathOptions()));
  if (!slotAbsolute || !slotAbsolute.startsWith(getAgentRoot())) return null;
  await fs.mkdir(slotAbsolute, { recursive: true });
  return slotAbsolute;
}


const STORAGE_SLOT_LAYER_FILES = [
  BUNDLE_CONTENT_FILE,
  BUNDLE_TABULAR_FILE,
  BUNDLE_CONFIG_FILE,
  BUNDLE_TODO_FILE,
  ".env",
  ...PREVIEW_FILE_NAMES
];

const STORAGE_SLOT_ROOT_FOLDER_NAMES = new Set(
  STORAGE_SLOT_LAYER_FOLDERS.flatMap((name) =>
    listStorageSubfolderNameCandidates(name).map((candidate) => candidate.toLowerCase())
  )
);

async function countDirectoryFiles(dirAbsolute) {
  let count = 0;
  let entries = [];
  try {
    entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
  } catch {
    return 0;
  }

  for (const entry of entries) {
    if (entry.name === ".DS_Store" || entry.name.startsWith(".")) continue;
    const absolute = path.join(dirAbsolute, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDirectoryListing(entry.name)) continue;
      count += await countDirectoryFiles(absolute);
      continue;
    }
    if (!entry.isFile()) continue;
    if (isAreaManifestFileName(entry.name)) continue;
    count += 1;
  }

  return count;
}

async function countDirectoryImmediateSubfolders(dirAbsolute) {
  let entries = [];
  try {
    entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
  } catch {
    return 0;
  }

  let count = 0;
  for (const entry of entries) {
    if (entry.name === ".DS_Store" || entry.name.startsWith(".")) continue;
    if (!entry.isDirectory()) continue;
    if (shouldSkipDirectoryListing(entry.name)) continue;
    count += 1;
  }
  return count;
}

function getStorageSlotFolderEntryCount(slotKey, folderAbsolute) {
  if (!folderAbsolute) return Promise.resolve(0);
  const resolvedSlotKey =
    slotKey || resolveSlotKeyFromStorageFolderName(path.basename(folderAbsolute));
  if (resolvedSlotKey === "repository") return countDirectoryImmediateSubfolders(folderAbsolute);
  return countDirectoryFiles(folderAbsolute);
}

async function inspectStorageLayersAtAbsolute(baseAbsolute, options = {}) {
  const layers = {};
  const existsBase = baseAbsolute ? await isExistingDirectory(baseAbsolute) : false;
  const bundleSearchDirs = [];
  if (options.containerAbsolute) bundleSearchDirs.push(options.containerAbsolute);
  if (existsBase) bundleSearchDirs.push(baseAbsolute);

  for (const fileName of STORAGE_SLOT_LAYER_FILES) {
    let exists = false;
    for (const dir of bundleSearchDirs) {
      if (!dir) continue;
      for (const name of listBundleFileNameCandidates(fileName)) {
        if (await fileExists(path.join(dir, name))) {
          exists = true;
          break;
        }
      }
      if (exists) break;
    }
    layers[fileName] = { kind: "file", exists };
  }

  for (const folderName of STORAGE_SLOT_LAYER_FOLDERS) {
    let exists = false;
    let entryCount = 0;
    if (existsBase) {
      const folderAbsolute = await resolveFolderPathCaseInsensitive(baseAbsolute, folderName);
      if (folderAbsolute && (await isExistingDirectory(folderAbsolute))) {
        exists = true;
        const slotKey = resolveSlotKeyFromStorageFolderName(folderName);
        entryCount = await getStorageSlotFolderEntryCount(slotKey, folderAbsolute);
      }
    }
    layers[folderName] = { kind: "folder", exists, entryCount };
  }

  if (options.includeFlatRootFiles && existsBase) {
    try {
      const entries = await fs.readdir(baseAbsolute, { withFileTypes: true });
      const looseFiles = entries
        .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
        .map((entry) => entry.name);
      if (looseFiles.length) {
        layers.__looseFiles = { kind: "list", files: looseFiles };
      }
    } catch {
      // ignore
    }
  }

  return { exists: existsBase, layers };
}

const STORAGE_FOLDER_SLOT_KEY_BY_CANONICAL = (() => {
  const map = new Map();
  map.set(STORAGE_SUBFOLDER_MAIN, "memory");
  for (const [mode, folderName] of Object.entries(STORAGE_SUBFOLDER_BY_MODE)) {
    if (mode === "external" || mode === "configs") continue;
    map.set(folderName, mode);
  }
  map.set(STORAGE_SUBFOLDER_HISTORY, "history");
  map.set(STORAGE_SUBFOLDER_COMMENTS, "comments");
  return map;
})();

function resolveSlotKeyFromStorageFolderName(rawName) {
  const canonical = normalizeStorageSubfolderName(rawName);
  if (!canonical) return null;
  if (canonical === STORAGE_SUBFOLDER_QUICK_NOTES) return "note";
  return STORAGE_FOLDER_SLOT_KEY_BY_CANONICAL.get(canonical) || null;
}

function isStorageRootBundleLooseFile(fileName) {
  const lower = String(fileName || "").toLowerCase();
  const bundleNames = new Set(
    [
      ...listBundleFileNameCandidates(BUNDLE_CONTENT_FILE),
      ...listBundleFileNameCandidates(BUNDLE_TABULAR_FILE),
      ...listBundleFileNameCandidates(BUNDLE_TODO_FILE),
      ...listBundleFileNameCandidates(BUNDLE_CONFIG_FILE),
      ...listBundleFileNameCandidates(ROOT_SYSTEM_TODO_FILE),
      BUNDLE_BODY_FILE,
      ".env"
    ].map((name) => name.toLowerCase())
  );
  return bundleNames.has(lower);
}

async function scanStorageRootBundleSlots(storageRootAbs) {
  const specs = [
    { slotKey: "main-single", fileName: BUNDLE_CONTENT_FILE },
    { slotKey: "main-single-csv", fileName: BUNDLE_TABULAR_FILE },
    { slotKey: "todo-single", fileName: BUNDLE_TODO_FILE }
  ];
  const bundleSlots = {};
  if (!storageRootAbs) {
    for (const spec of specs) {
      bundleSlots[spec.slotKey] = { exists: false, entryCount: 0 };
    }
    return bundleSlots;
  }
  for (const spec of specs) {
    let exists = false;
    for (const name of listBundleFileNameCandidates(spec.fileName)) {
      if (await fileExists(path.join(storageRootAbs, name))) {
        exists = true;
        break;
      }
    }
    bundleSlots[spec.slotKey] = { exists, entryCount: exists ? 1 : 0 };
  }
  return bundleSlots;
}

async function scanNodeStorageRoot(manifestRelPath) {
  const normalizedPath = String(manifestRelPath || "").replace(/\\/g, "/");
  if (!normalizedPath) {
    return { exists: false, folders: [], looseFiles: [], bundleSlots: {}, totalEntries: 0, storageRoot: "" };
  }

  const nodeAbsolute = await resolveApiManifestAbsolute(normalizedPath);
  if (!nodeAbsolute) {
    return { exists: false, folders: [], looseFiles: [], bundleSlots: {}, totalEntries: 0, storageRoot: "" };
  }

  const storageRootAbs = getNodeStorageRootAbsolute(nodeAbsolute);
  const storageRoot = getNodeStorageRootRel(normalizedPath);
  const exists = storageRootAbs ? await isExistingDirectory(storageRootAbs) : false;
  const folders = [];
  const looseFiles = [];
  let totalEntries = 0;

  if (exists && storageRootAbs) {
    const entries = await fs.readdir(storageRootAbs, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isFile()) {
        if (isStorageRootBundleLooseFile(entry.name)) continue;
        looseFiles.push(entry.name);
        totalEntries += 1;
        continue;
      }
      if (!entry.isDirectory()) continue;

      const folderAbsolute = await resolveFolderPathCaseInsensitive(storageRootAbs, entry.name);
      const canonical = normalizeStorageSubfolderName(entry.name);
      const slotKey = resolveSlotKeyFromStorageFolderName(entry.name);
      const subfolderCount = folderAbsolute
        ? await countDirectoryImmediateSubfolders(folderAbsolute)
        : 0;
      const entryCount = folderAbsolute
        ? slotKey === "repository"
          ? subfolderCount
          : await getStorageSlotFolderEntryCount(slotKey, folderAbsolute)
        : 0;
      const policy =
        folderAbsolute && slotKey
          ? await scanStorageFolderPolicyViolations(folderAbsolute, slotKey)
          : { count: 0, samples: [] };
      folders.push({
        name: entry.name,
        canonical,
        entryCount,
        subfolderCount,
        slotKey,
        matched: Boolean(slotKey),
        policyViolationCount: policy.count,
        policyViolations: policy.samples
      });
      totalEntries += entryCount;
    }
    looseFiles.sort((a, b) => a.localeCompare(b, "ru"));
    folders.sort((a, b) => {
      if (a.matched !== b.matched) return a.matched ? -1 : 1;
      const labelA = a.slotKey || a.name;
      const labelB = b.slotKey || b.name;
      return labelA.localeCompare(labelB, "ru");
    });
  }

  const bundleSlots =
    exists && storageRootAbs ? await scanStorageRootBundleSlots(storageRootAbs) : {};

  const sharedMounts = await buildSharedMountsForTopic(normalizedPath);
  const sharedContext = await buildSharedStorageContext(normalizedPath);

  return {
    exists,
    folders,
    looseFiles,
    bundleSlots,
    totalEntries,
    storageRoot,
    sharedMounts,
    sharedContext
  };
}

function collectManifestEntriesFromMenu(menu, acc = []) {
  if (!menu || typeof menu !== "object") return acc;

  if (menu.indexPath) {
    acc.push({
      manifestPath: String(menu.indexPath).replace(/\\/g, "/"),
      label: String(menu.title || "").trim() || null,
      kind: "area"
    });
  }

  for (const item of menu.items || []) {
    if (!item?.path) continue;
    acc.push({
      manifestPath: String(item.path).replace(/\\/g, "/"),
      label: String(item.label || "").trim() || null,
      kind: "topic"
    });
  }

  for (const section of menu.sections || []) {
    collectManifestEntriesFromMenu(section, acc);
  }

  return acc;
}

function collectAllMenuManifestEntries(menu) {
  const manifests = collectManifestEntriesFromMenu(menu, []);
  if (menu?.serviceTree) collectManifestEntriesFromMenu(menu.serviceTree, manifests);
  if (menu?.containerTree) collectManifestEntriesFromMenu(menu.containerTree, manifests);
  if (menu?.sharedTree) collectManifestEntriesFromMenu(menu.sharedTree, manifests);
  return manifests;
}

async function buildAgentStorageLayout() {
  const menu = await buildAgentMenu(getAgentRoot());
  const manifests = collectManifestEntriesFromMenu(menu, []);
  if (menu.serviceTree) {
    collectManifestEntriesFromMenu(menu.serviceTree, manifests);
  }

  const byContainer = new Map();
  for (const entry of manifests) {
    const containerDir = getManifestContainerDirRel(entry.manifestPath) || "";
    if (!byContainer.has(containerDir)) byContainer.set(containerDir, []);
    byContainer.get(containerDir).push(entry);
  }

  const containers = [];

  for (const [containerDir, entries] of byContainer.entries()) {
    const storageRootRel = getStorageRootDirRel(containerDir);
    const storageRootAbs = normalizeWorkspacePath(storageRootRel);
    const knownSlotKeys = new Set();
    const slots = [];

    for (const entry of entries) {
      const slotKey = getManifestNamedSlotKey(entry.manifestPath);
      knownSlotKeys.add(slotKey.toLowerCase());
      const slotDirRel = getNamedStorageSlotDirRel(entry.manifestPath);
      const slotAbs = normalizeWorkspacePath(slotDirRel);
      const containerAbs = normalizeWorkspacePath(getManifestContainerDirRel(entry.manifestPath));
      const inspection = await inspectStorageLayersAtAbsolute(slotAbs, {
        containerAbsolute: containerAbs
      });
      const label =
        entry.label ||
        (entry.kind === "area"
          ? containerDir
            ? stripTopicPrefix(path.posix.basename(containerDir))
            : path.basename(getAgentRoot())
          : slotKey);

      slots.push({
        manifestPath: entry.manifestPath,
        kind: entry.kind,
        label,
        slotKey,
        slotDir: slotDirRel.replace(/\\/g, "/"),
        exists: inspection.exists,
        layers: inspection.layers
      });
    }

    slots.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "area" ? -1 : 1;
      return a.label.localeCompare(b.label, "ru");
    });

    const rootInspection = await inspectStorageLayersAtAbsolute(storageRootAbs, {
      includeFlatRootFiles: true
    });

    const orphanSlots = [];
    if (storageRootAbs && (await isExistingDirectory(storageRootAbs))) {
      const subdirs = await fs.readdir(storageRootAbs, { withFileTypes: true });
      for (const subdir of subdirs) {
        if (!subdir.isDirectory()) continue;
        const name = subdir.name;
        if (STORAGE_SLOT_ROOT_FOLDER_NAMES.has(name.toLowerCase())) continue;
        if (knownSlotKeys.has(name.toLowerCase())) continue;
        orphanSlots.push(name);
      }
      orphanSlots.sort((a, b) => a.localeCompare(b, "ru"));
    }

    containers.push({
      containerDir: containerDir || "",
      storageRoot: storageRootRel.replace(/\\/g, "/"),
      slots,
      orphanSlots,
      rootLayers: rootInspection.layers,
      rootHasContent: Boolean(
        rootInspection.exists &&
          (Object.values(rootInspection.layers).some((layer) => layer.exists) ||
            rootInspection.layers.__looseFiles)
      )
    });
  }

  containers.sort((a, b) => {
    const aKey = a.containerDir || "";
    const bKey = b.containerDir || "";
    if (!aKey) return -1;
    if (!bKey) return 1;
    return aKey.localeCompare(bKey, "ru");
  });

  return { containers, manifestCount: manifests.length, canonicalModel: getCanonicalModelPayload(getProjectRoot(), getAgentRoot()) };
}

function countStorageLayersPresent(layers) {
  if (!layers || typeof layers !== "object") return 0;
  let count = 0;
  for (const [key, meta] of Object.entries(layers)) {
    if (key === "__looseFiles") {
      if (meta?.files?.length) count += 1;
      continue;
    }
    if (meta?.exists) count += 1;
  }
  return count;
}

function getManifestDisplayPathForTable(manifestPath, label, kind) {
  const normalized = String(manifestPath || "").replace(/\\/g, "/");
  if (!normalized) return "";

  if (kind === "area") {
    const dir = path.posix.dirname(normalized);
    if (!dir || dir === ".") {
      return String(label || "").trim() || "Workspace";
    }
    return stripAgentContentPrefixFromRelPath(dir) || path.posix.basename(dir);
  }

  const containerDir = getManifestContainerDirRel(normalized);
  const slotKey = getManifestNamedSlotKey(normalized);
  const folderDisplay = stripAgentContentPrefixFromRelPath(containerDir);
  return folderDisplay ? `${folderDisplay}/${slotKey}` : slotKey;
}

async function buildAgentWorkspaceTable() {
  const layout = await buildAgentStorageLayout();
  const lookup = await getAgentCatalogLookupMaps();
  const rows = [];

  for (const container of layout.containers || []) {
    for (const slot of container.slots || []) {
      const manifestPath = slot.manifestPath;
      const [meta, previewMeta, manifestStat] = await Promise.all([
        readNodeMenuMetaForNodeRel(manifestPath),
        getNodePreviewMeta(manifestPath),
        statNodeFileMeta(normalizeWorkspacePath(manifestPath))
      ]);

      const categoryLabel = lookup?.categories
        ? resolveCatalogPropValue(lookup.categories, meta.category)
        : meta.category;
      const statusLabel = lookup?.statuses
        ? resolveCatalogPropValue(lookup.statuses, meta.status)
        : meta.status;
      const ownerLabel = lookup?.users
        ? resolveCatalogPropValue(lookup.users, meta.owner)
        : meta.owner;
      const priorityLabel = lookup?.priorities
        ? resolveCatalogPropValue(lookup.priorities, meta.priority)
        : meta.priority;
      const tagsDisplay = lookup?.tags
        ? resolveCatalogTagsList(lookup.tags, meta.tags)
        : meta.tags;

      rows.push({
        manifestPath,
        label: slot.label,
        kind: slot.kind,
        displayPath: getManifestDisplayPathForTable(manifestPath, slot.label, slot.kind),
        containerDir: container.containerDir || "",
        slotKey: slot.slotKey,
        slotDir: slot.slotDir,
        slotExists: slot.exists,
        layerPresent: countStorageLayersPresent(slot.layers),
        hasPreview: Boolean(previewMeta?.hasPreview),
        previewUrl: previewMeta?.previewUrl || null,
        color: meta.color,
        tags: meta.tags,
        tagsDisplay,
        category: categoryLabel,
        status: statusLabel,
        owner: ownerLabel,
        priority: priorityLabel,
        manifestUpdatedAt: manifestStat?.updatedAt || null
      });
    }
  }

  rows.sort((a, b) => a.displayPath.localeCompare(b.displayPath, "ru"));
  return { rows, manifestCount: layout.manifestCount || rows.length };
}

async function buildAgentSiteMap() {
  const agentRoot = getAgentRoot();
  const projectRoot = getProjectRoot();
  const catalog = loadTypeCatalog(projectRoot, agentRoot);
  const menu = await buildAgentMenu(agentRoot);
  const canonicalModel = getCanonicalModelPayload(projectRoot, agentRoot);
  const topics = [];
  const areas = [];
  let workspace = null;

  async function appendNode(manifestPath, label, kind, parentArea = null) {
    const normalized = String(manifestPath || "").replace(/\\/g, "/");
    if (!normalized) return null;
    let frontmatter = "";
    try {
      ({ frontmatter } = await readNodeFrontmatterContent(normalized));
    } catch {
      frontmatter = "";
    }
    const rawType = getYamlScalar(frontmatter, "awn-type") || "";
    const awnType = rawType ? resolveCanonicalTypeId(String(rawType).trim(), catalog.byId) : "";
    const awnName = getYamlScalar(frontmatter, "awn-name") || label;
    const entry = {
      manifestPath: normalized,
      title: String(awnName || label || "").trim(),
      label: String(label || awnName || "").trim(),
      awnType,
      kind,
      areaPath: parentArea?.manifestPath || null,
      areaTitle: parentArea?.title || null
    };
    if (kind === "topic") topics.push(entry);
    else if (kind === "area") areas.push(entry);
    else if (kind === "ws") workspace = entry;
    return entry;
  }

  async function walkTree(tree, parentArea = null, rootKind = "area") {
    if (!tree) return;
    let currentArea = parentArea;
    if (tree.indexPath) {
      const kind = parentArea ? "area" : rootKind;
      currentArea = await appendNode(tree.indexPath, tree.title, kind, parentArea);
    }
    for (const item of tree.items || []) {
      if (!item?.path) continue;
      await appendNode(item.path, item.label, "topic", currentArea);
    }
    for (const section of tree.sections || []) {
      await walkTree(section, currentArea, rootKind);
    }
  }

  await walkTree(menu, null, "ws");
  if (menu.containerTree) await walkTree(menu.containerTree, null, "area");
  if (menu.sharedTree) await walkTree(menu.sharedTree, null, "area");

  topics.sort((a, b) => a.title.localeCompare(b.title, "ru"));
  areas.sort((a, b) => a.title.localeCompare(b.title, "ru"));

  return {
    version: 1,
    model: "site-map",
    canonicalModel: {
      pageTypes: canonicalModel.pageTypes,
      slotContentTypes: canonicalModel.slotContentTypes,
      rules: canonicalModel.rules
    },
    workspace,
    areas,
    topics,
    topicCount: topics.length,
    areaCount: areas.length
  };
}

function parseRuntimeFilterSearchParam(raw) {
  if (raw === "false" || raw === "0" || raw === "no") return false;
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  return null;
}

function parseRuntimeFilterFromSearchParams(searchParams) {
  const syncRaw = searchParams?.get?.("sync");
  if (syncRaw === "true" || syncRaw === "1" || syncRaw === "yes") {
    return { cron: true, heartbeat: true, mode: "any" };
  }

  const cronRaw = parseRuntimeFilterSearchParam(searchParams?.get?.("cron"));
  const heartbeatRaw = parseRuntimeFilterSearchParam(searchParams?.get?.("heartbeat"));
  const modeRaw = String(searchParams?.get?.("mode") || "").trim().toLowerCase();

  if (cronRaw === null && heartbeatRaw === null && !modeRaw) return null;

  return {
    cron: cronRaw ?? true,
    heartbeat: heartbeatRaw ?? true,
    mode: modeRaw === "all" ? "all" : "any"
  };
}

function matchesRuntimeFilter(row, filter) {
  if (!filter) return true;

  const hasCron = Boolean(row?.runtimeCron);
  const hasHeartbeat = Boolean(row?.runtimeHeartbeat);

  if (filter.mode === "all") {
    if (filter.cron && !hasCron) return false;
    if (filter.heartbeat && !hasHeartbeat) return false;
    return hasCron || hasHeartbeat;
  }

  let match = false;
  if (filter.cron && hasCron) match = true;
  if (filter.heartbeat && hasHeartbeat) match = true;
  return match;
}

function countRuntimeRegistryRows(rows) {
  let sessionStartCount = 0;
  let cronCount = 0;
  let heartbeatCount = 0;
  let syncCount = 0;

  for (const row of rows) {
    if (row.runtimeLoadAlways) sessionStartCount += 1;
    if (row.runtimeCron) cronCount += 1;
    if (row.runtimeHeartbeat) heartbeatCount += 1;
    if (row.runtimeCron || row.runtimeHeartbeat) syncCount += 1;
  }

  return { sessionStartCount, cronCount, heartbeatCount, syncCount };
}

async function buildAgentRuntimeRegistry(filter = null) {
  const menu = await buildAgentMenu(getAgentRoot());
  const entries = collectAllMenuManifestEntries(menu).filter((entry) => entry.kind === "topic");
  const rows = [];

  for (const entry of entries) {
    const manifestPath = String(entry.manifestPath || "").replace(/\\/g, "/");
    if (!manifestPath) continue;

    let frontmatter = "";
    try {
      ({ frontmatter } = await readNodeFrontmatterContent(manifestPath));
    } catch {
      frontmatter = "";
    }

    const awnName = getYamlScalar(frontmatter, "awn-name");
    const slotKey = getManifestNamedSlotKey(manifestPath);
    const label = String(entry.label || awnName || slotKey || "").trim() || slotKey;
    const runtime = extractRuntimePropsFromFrontmatter(frontmatter);

    rows.push({
      manifestPath,
      label,
      displayPath: getManifestDisplayPathForTable(manifestPath, label, "topic"),
      ...runtime
    });
  }

  rows.sort((a, b) => a.displayPath.localeCompare(b.displayPath, "ru"));

  const allCounts = countRuntimeRegistryRows(rows);
  const visibleRows = filter ? rows.filter((row) => matchesRuntimeFilter(row, filter)) : rows;
  const visibleCounts = filter ? countRuntimeRegistryRows(visibleRows) : allCounts;

  return {
    rows: visibleRows,
    topicCount: visibleRows.length,
    sessionStartCount: visibleCounts.sessionStartCount,
    cronCount: visibleCounts.cronCount,
    heartbeatCount: visibleCounts.heartbeatCount,
    syncCount: visibleCounts.syncCount,
    filter: filter || null,
    totalTopicCount: rows.length,
    totalCronCount: allCounts.cronCount,
    totalHeartbeatCount: allCounts.heartbeatCount,
    totalSyncCount: allCounts.syncCount
  };
}

async function buildManifestAreaLookup(menu) {
  const areaByManifest = new Map();

  async function walkTree(tree, parentArea = null) {
    if (!tree) return;
    let currentArea = parentArea;
    if (tree.indexPath) {
      const normalized = String(tree.indexPath).replace(/\\/g, "/");
      currentArea = {
        areaPath: normalized,
        areaTitle: String(tree.title || "").trim() || normalized
      };
    }
    for (const item of tree.items || []) {
      if (!item?.path) continue;
      const manifestPath = String(item.path).replace(/\\/g, "/");
      areaByManifest.set(manifestPath, {
        areaPath: currentArea?.areaPath || null,
        areaTitle: currentArea?.areaTitle || null
      });
    }
    for (const section of tree.sections || []) {
      await walkTree(section, currentArea);
    }
  }

  await walkTree(menu, null);
  if (menu?.containerTree) await walkTree(menu.containerTree, null);
  if (menu?.sharedTree) await walkTree(menu.sharedTree, null);
  if (menu?.serviceTree) await walkTree(menu.serviceTree, null);

  return areaByManifest;
}

const DEFAULT_RUNTIME_SYNC_FILTER = { cron: true, heartbeat: true, mode: "any" };

async function buildAgentRuntimeMap(filter = DEFAULT_RUNTIME_SYNC_FILTER) {
  const menu = await buildAgentMenu(getAgentRoot());
  const registry = await buildAgentRuntimeRegistry();
  const areaByManifest = await buildManifestAreaLookup(menu);
  const topics = [];

  for (const row of registry.rows) {
    if (!matchesRuntimeFilter(row, filter)) continue;

    const area = areaByManifest.get(row.manifestPath) || {};
    const syncKinds = [];
    if (row.runtimeCron) syncKinds.push("cron");
    if (row.runtimeHeartbeat) syncKinds.push("heartbeat");

    topics.push({
      manifestPath: row.manifestPath,
      title: row.label,
      label: row.label,
      displayPath: row.displayPath,
      areaPath: area.areaPath || null,
      areaTitle: area.areaTitle || null,
      runtimeLoadAlways: row.runtimeLoadAlways,
      runtimeLoadLabel: row.runtimeLoadLabel,
      runtimeCron: row.runtimeCron,
      runtimeCronSchedule: row.runtimeCronSchedule,
      runtimeHeartbeat: row.runtimeHeartbeat,
      syncKinds,
      syncKind: syncKinds.join("+") || null
    });
  }

  topics.sort((a, b) => a.displayPath.localeCompare(b.displayPath, "ru"));

  const cronCount = topics.filter((topic) => topic.runtimeCron).length;
  const heartbeatCount = topics.filter((topic) => topic.runtimeHeartbeat).length;
  const bothCount = topics.filter((topic) => topic.runtimeCron && topic.runtimeHeartbeat).length;

  return {
    version: 1,
    model: "runtime-map",
    filter,
    hint: "Темы с awn-runtime-cron и/или awn-runtime-heartbeat — для синхронизации агента (cron/сердцебиение).",
    topics,
    topicCount: topics.length,
    cronCount,
    heartbeatCount,
    bothCount,
    totalTopicCount: registry.totalTopicCount,
    totalSyncCount: registry.totalSyncCount
  };
}

const SESSION_CONTEXT_API_MAP = {
  sessionContext: "GET /api/agent/session-context — стартовый пакет контекста",
  menu: "GET /api/menu — дерево тем (manifest.md)",
  search: "GET /api/search?q=&scope=all|content|filename|tags&fileType=all|markdown|...&match=relaxed|strict&limit=",
  runtimeRegistry: "GET /api/agent/runtime-registry — реестр awn-runtime-* (?sync=true | ?cron=&heartbeat=&mode=any|all)",
  runtimeMap: "GET /api/agent/runtime-map — карта тем с cron/heartbeat для синхронизации агента",
  storageLayout: "GET /api/agent/storage-layout — слоты awn-storage",
  workspaceTable: "GET /api/agent/workspace-table — таблица тем",
  canonicalModel: "GET /api/agent/canonical-model — канон: page types, slot content, bindings",
  siteMap: "GET /api/agent/site-map — карта сайта: все темы и области",
  platformCatalogs: "GET /api/platform/catalogs — глобальные справочники",
  agentCatalogs: "GET /api/agent/catalogs — справочники агента",
  manifest: "GET /api/file?path=<manifest.md>",
  mainNote: "GET /api/external/file?path=<manifest.md>&file=<name.md> — awn-storage/main/",
  thread: "GET /api/thread?path=<manifest.md>",
  inbox: "GET /api/inbox?path=<manifest.md>",
  topicIntake: "GET /api/topic/intake?path=<manifest.md>",
  adoptFolders: "GET /api/workspace/folder/adopt — свободная память: папки без manifest.md",
  workspaceFolderUpload:
    "POST /api/workspace/folder/upload — загрузить файл(ы) в папку свободной памяти (folderPath, data base64, fileName)",
  workspaceFolderRename: "POST /api/workspace/folder/rename — переименовать файл или папку (path, newName)",
  workspaceFolderMove: "POST /api/workspace/folder/move — переместить файл или папку (path, parentPath)",
  workspaceFolderDelete: "POST /api/workspace/folder/delete — удалить файлы/папки (paths[])",
  workspaceFolderBrowse: "GET /api/workspace/folder/browse?folderPath=<path> — содержимое папки (1 уровень)",
  workspaceFolderScan: "GET /api/workspace/folder/scan?folderPath=<path>&depth=1|2|all&includeBody=true — рекурсивный инвентарь для разбора тем",
  workspaceFolderPage: "GET /api/workspace/folder/page?file=<path.md> — markdown-страница из свободной памяти",
  workspaceFolderText: "GET /api/workspace/folder/text?file=<path> — текстовый файл из свободной памяти"
};

const SESSION_PATH_HINTS = {
  topicManifest:
    "Путь к manifest.md темы, напр. awn-container/finansydohody/manifest.md (legacy: _registration.md)",
  areaManifest: "manifest.md области внутри awn-container/<slug>/",
  mainNote: "Параметр file в memory tools — .md внутри awn-storage/main/ темы",
  agentKit: "Служебные темы: awn-agent-kit/agent/manifest.md, awn-agent-kit/user/manifest.md",
  storageLayers: "awn-storage/main|memory|inbox|thread|references|artefacts|media|scripts|history|…",
  storageFile: "read_storage_file / write_storage_file — path=<manifest.md>, folder=scripts|artefacts|…, file=<relative path>",
  adoptFolder: "Свободная память (папки без manifest.md): list adopt → browse/scan по folderPath → read page/text для разбора материалов",
  adoptFolderBrowse: "GET /api/workspace/folder/browse?folderPath=awn-container/Материалы",
  adoptFolderScan: "GET /api/workspace/folder/scan?folderPath=...&depth=all&includeBody=true — flat inventory для сортировки по темам"
};

async function readWorkspaceManifestContent(relPath) {
  const canonical = String(await resolveCanonicalManifestRelPath(relPath)).replace(/\\/g, "/");
  const absolute = normalizeWorkspacePath(canonical);
  if (!absolute) return { path: canonical, exists: false, content: null };
  try {
    const content = await fs.readFile(absolute, "utf-8");
    return { path: canonical, exists: true, content };
  } catch {
    return { path: canonical, exists: false, content: null };
  }
}

async function readAgentSystemContext(agentRoot) {
  const systemRoot = path.join(agentRoot, "awn-system");
  const readText = async (rel) => {
    const abs = path.join(systemRoot, rel);
    try {
      const content = await fs.readFile(abs, "utf-8");
      return { path: `awn-system/${rel}`.replace(/\\/g, "/"), exists: true, content };
    } catch {
      return { path: `awn-system/${rel}`.replace(/\\/g, "/"), exists: false, content: null };
    }
  };

  let typeSummary = null;
  if (fsSync.existsSync(systemRoot)) {
    try {
      const payload = getTypeCatalogPayload(getProjectRoot(), agentRoot);
      typeSummary = {
        sources: payload.sources || [],
        typeCount: Array.isArray(payload.types) ? payload.types.length : 0,
        domains: Object.keys(payload.domains || {}),
        agentSystemRoot: payload.agentSystemRoot || null
      };
    } catch {
      typeSummary = null;
    }
  }

  return {
    exists: fsSync.existsSync(systemRoot),
    root: "awn-system",
    typeSummary,
    docs: {
      map: await readText("MAP.md"),
      registry: await readText("registry.yml"),
      slotsBindings: await readText("slots-bindings.yml"),
      manifest: await readText("manifest.md")
    },
    hint: "CMS-модель агента: awn-system/MAP.md и awn-system/types/"
  };
}

async function buildAgentSessionContext() {
  const agentId = getActiveAgentId();
  const agentRoot = getAgentRoot();
  const kitFolder = getAgentKitFolder() || "awn-agent-kit";
  const agentRootRel = path.relative(getProjectRoot(), agentRoot).replace(/\\/g, "/") || ".";

  const serviceDocs = [];
  for (const slot of ["agent", "user", "agent.voice.tts", "agent.voice.stt"]) {
    const manifestPath = `${kitFolder}/${slot}/manifest.md`;
    const file = await readWorkspaceManifestContent(manifestPath);
    serviceDocs.push({
      slotKey: slot,
      manifestPath: file.path,
      exists: file.exists,
      content: file.content
    });
  }

  const registry = await buildAgentRuntimeRegistry();
  const runtimeMap = await buildAgentRuntimeMap(DEFAULT_RUNTIME_SYNC_FILTER);
  const sessionStartTopics = [];
  for (const row of registry.rows) {
    if (!row.runtimeLoadAlways) continue;
    const file = await readWorkspaceManifestContent(row.manifestPath);
    sessionStartTopics.push({
      manifestPath: row.manifestPath,
      label: row.label,
      displayPath: row.displayPath,
      runtimeLoadAlways: row.runtimeLoadAlways,
      exists: file.exists,
      content: file.content
    });
  }

  const runtimeSyncTopics = runtimeMap.topics.map((topic) => ({
    manifestPath: topic.manifestPath,
    label: topic.label,
    displayPath: topic.displayPath,
    areaPath: topic.areaPath,
    areaTitle: topic.areaTitle,
    runtimeCron: topic.runtimeCron,
    runtimeCronSchedule: topic.runtimeCronSchedule,
    runtimeHeartbeat: topic.runtimeHeartbeat,
    syncKind: topic.syncKind,
    syncKinds: topic.syncKinds
  }));

  const systemFiles = [];
  for (const name of ["AGENTS.md", "README.md"]) {
    const meta = await getSystemFileMeta(name);
    if (!meta.exists) {
      systemFiles.push({ name, exists: false, content: null });
      continue;
    }
    const absolute = await resolveExistingSystemFileAbsolute(name);
    try {
      const content = await fs.readFile(absolute, "utf-8");
      systemFiles.push({ name, exists: true, content });
    } catch {
      systemFiles.push({ name, exists: false, content: null });
    }
  }

  let menuSummary = null;
  try {
    const menu = await buildAgentMenu(agentRoot);
    menuSummary = {
      topicCount: (menu.items || []).length,
      hasServiceTree: Boolean(menu.serviceTree),
      hasContainerTree: Boolean(menu.containerTree),
      hasSharedTree: Boolean(menu.sharedTree)
    };
  } catch {
    menuSummary = null;
  }

  const awnSystem = await readAgentSystemContext(agentRoot);

  return {
    version: "0.0.3",
    mcpVersion: "0.2.0",
    agentId,
    agentRootRel,
    kitFolder,
    pathHints: SESSION_PATH_HINTS,
    apiMap: SESSION_CONTEXT_API_MAP,
    canonicalModel: getCanonicalModelPayload(getProjectRoot(), agentRoot),
    menuSummary,
    awnSystem,
    serviceDocs,
    sessionStartTopics,
    sessionStartCount: sessionStartTopics.length,
    runtimeSyncTopics,
    runtimeSyncCount: runtimeSyncTopics.length,
    runtimeRegistryTopicCount: registry.topicCount,
    runtimeMapHint: runtimeMap.hint,
    systemFiles,
    hint: "Старт: get_session_context → awn-system/MAP.md → get_menu для контента. Синхронизация cron/heartbeat: get_runtime_map."
  };
}

async function findNewestFileMetaInDir(dirAbsolute) {
  if (!dirAbsolute || !(await isExistingDirectory(dirAbsolute))) return null;

  let newest = null;
  try {
    const entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.startsWith(".")) continue;
      const abs = path.join(dirAbsolute, entry.name);
      const stat = await statNodeFileMeta(abs);
      if (!stat?.updatedAt) continue;
      if (!newest || Date.parse(stat.updatedAt) > Date.parse(newest.updatedAt)) {
        newest = { name: entry.name, absolute: abs, ...stat };
      }
    }
  } catch {
    return null;
  }

  if (!newest) return null;
  const rel = path.relative(getAgentRoot(), newest.absolute).replace(/\\/g, "/");
  return { name: newest.name, relPath: rel, updatedAt: newest.updatedAt, size: newest.size };
}

function shouldSkipTimelineScanDirectory(name) {
  const lower = String(name || "").trim().toLowerCase();
  if (!lower) return true;
  if (lower === STORAGE_SUBFOLDER_HISTORY) return true;
  if (lower === "history") return true;
  return shouldSkipDirectoryListing(name);
}

async function findNewestFileMetaInDirRecursive(dirAbsolute) {
  if (!dirAbsolute || !(await isExistingDirectory(dirAbsolute))) return null;

  let newest = null;

  async function walk(currentAbsolute, relPrefix = "") {
    let entries = [];
    try {
      entries = await fs.readdir(currentAbsolute, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const absolute = path.join(currentAbsolute, entry.name);
      const relative = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        if (shouldSkipTimelineScanDirectory(entry.name)) continue;
        await walk(absolute, relative.replace(/\\/g, "/"));
        continue;
      }

      if (!entry.isFile()) continue;
      const stat = await statNodeFileMeta(absolute);
      if (!stat?.updatedAt) continue;
      if (!newest || Date.parse(stat.updatedAt) > Date.parse(newest.updatedAt)) {
        newest = {
          name: entry.name,
          relPath: path.relative(getAgentRoot(), absolute).replace(/\\/g, "/"),
          updatedAt: stat.updatedAt,
          size: stat.size
        };
      }
    }
  }

  await walk(dirAbsolute);
  return newest;
}

const TIMELINE_PREVIEW_IMAGE_PATTERN = /\.(png|jpe?g|gif|webp)$/i;

function isTimelinePreviewImageFileName(name) {
  const lower = String(name || "").trim().toLowerCase();
  if (!lower || lower.endsWith(".sidecar.md")) return false;
  return TIMELINE_PREVIEW_IMAGE_PATTERN.test(lower);
}

async function findNewestPreviewImageMetaInDirRecursive(dirAbsolute) {
  if (!dirAbsolute || !(await isExistingDirectory(dirAbsolute))) return null;

  let newest = null;

  async function walk(currentAbsolute) {
    let entries = [];
    try {
      entries = await fs.readdir(currentAbsolute, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const absolute = path.join(currentAbsolute, entry.name);

      if (entry.isDirectory()) {
        if (shouldSkipTimelineScanDirectory(entry.name)) continue;
        await walk(absolute);
        continue;
      }

      if (!entry.isFile() || !isTimelinePreviewImageFileName(entry.name)) continue;
      const stat = await statNodeFileMeta(absolute);
      if (!stat?.updatedAt) continue;
      if (!newest || Date.parse(stat.updatedAt) > Date.parse(newest.updatedAt)) {
        newest = {
          name: entry.name,
          absolute,
          relPath: path.relative(getAgentRoot(), absolute).replace(/\\/g, "/"),
          updatedAt: stat.updatedAt,
          size: stat.size
        };
      }
    }
  }

  await walk(dirAbsolute);
  return newest;
}

async function resolvePreviewFileAbsoluteFromManifest(manifestPath, previewRaw) {
  const previewValue = String(previewRaw || "").trim();
  if (!previewValue || /^https?:\/\//i.test(previewValue) || previewValue.startsWith("/api/")) {
    return null;
  }

  const candidates = listStorageAssetsRefPathCandidates(previewValue, manifestPath);
  for (const candidate of candidates) {
    const assetsRef = parseStorageAssetsRef(candidate);
    if (assetsRef?.manifestRelPath && assetsRef.mediaFile) {
      const resolvedRelPath = await resolveExistingWorkspaceRelPath(assetsRef.manifestRelPath);
      const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
      if (!nodeAbsolute || !isManifestMdAbsolute(nodeAbsolute)) continue;
      const relFile = normalizeRelativeFilePath(assetsRef.mediaFile);
      if (!relFile) continue;

      let fileAbsolute = null;
      if (assetsRef.workspacePath) {
        const candidateAbsolute = normalizeWorkspacePath(assetsRef.workspacePath);
        if (candidateAbsolute && (await fileExists(candidateAbsolute))) {
          fileAbsolute = candidateAbsolute;
        }
      }
      if (!fileAbsolute) {
        fileAbsolute = await resolveUploadedMediaFileAbsolute(nodeAbsolute, relFile);
      }
      if (!fileAbsolute) {
        fileAbsolute = await resolveUploadedMediaFileAbsolute(
          nodeAbsolute,
          `${STORAGE_ROOT_FOLDER}/${STORAGE_SUBFOLDER_ASSETS}/${relFile}`
        );
      }
      if (fileAbsolute) return fileAbsolute;
    }

    const inlineRef = parseStorageSlotInlineRef(candidate);
    if (!inlineRef?.manifestRelPath || inlineRef.layer !== STORAGE_SUBFOLDER_PREVIEW || !inlineRef.relativePath) {
      continue;
    }
    const resolvedRelPath = await resolveExistingWorkspaceRelPath(inlineRef.manifestRelPath);
    const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
    if (!nodeAbsolute || !isManifestMdAbsolute(nodeAbsolute)) continue;
    const fileAbsolute = await resolveSlotInlineFileAbsolute(
      nodeAbsolute,
      inlineRef.layer,
      inlineRef.relativePath
    );
    if (fileAbsolute) return fileAbsolute;
  }

  return null;
}

async function buildNodePreviewTimelineEvent(manifestPath, label, kind) {
  const candidates = [];

  try {
    const { frontmatter } = await readNodeFrontmatterContent(manifestPath);
    const previewRaw = getYamlScalar(frontmatter, "awn-preview");
    const previewMeta = await resolveAwnPreviewFieldMeta(manifestPath, previewRaw);
    const fileAbsolute = await resolvePreviewFileAbsoluteFromManifest(manifestPath, previewRaw);
    if (previewMeta?.hasPreview && previewMeta.previewUrl && fileAbsolute) {
      const stat = await statNodeFileMeta(fileAbsolute);
      if (stat?.updatedAt) {
        candidates.push({
          previewUrl: previewMeta.previewUrl,
          previewFile: previewMeta.previewFile || path.basename(fileAbsolute),
          relPath: path.relative(getAgentRoot(), fileAbsolute).replace(/\\/g, "/"),
          updatedAt: stat.updatedAt,
          size: stat.size
        });
      }
    }
  } catch {
    // ignore preview read errors
  }

  const nodeAbsolute = normalizeWorkspacePath(manifestPath);
  if (nodeAbsolute) {
    const assetsAbsolute = await getNodeStorageSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_ASSETS);
    const previewDir = assetsAbsolute ? path.join(assetsAbsolute, STORAGE_SUBFOLDER_PREVIEW) : null;
    const newestPreview = await findNewestPreviewImageMetaInDirRecursive(previewDir);
    if (newestPreview) {
      const storageRoot = getNodeStorageRootAbsolute(nodeAbsolute);
      const relFile = storageRoot
        ? path.relative(storageRoot, newestPreview.absolute).replace(/\\/g, "/")
        : newestPreview.name;
      candidates.push({
        previewUrl: `/api/media/file?path=${encodeURIComponent(manifestPath)}&file=${encodeURIComponent(relFile)}`,
        previewFile: newestPreview.name,
        relPath: newestPreview.relPath,
        updatedAt: newestPreview.updatedAt,
        size: newestPreview.size
      });
    }

    for (const previewFolderAbsolute of await listNodePreviewFoldersAbsolute(nodeAbsolute)) {
      const legacyPreview = await findPreviewImageAbsolute(previewFolderAbsolute);
      if (!legacyPreview) continue;
      const stat = await statNodeFileMeta(legacyPreview);
      if (!stat?.updatedAt) continue;
      const storageRoot = getNodeStorageRootAbsolute(nodeAbsolute);
      const relFile = storageRoot
        ? path.relative(storageRoot, legacyPreview).replace(/\\/g, "/")
        : path.basename(legacyPreview);
      candidates.push({
        previewUrl: `/api/media/file?path=${encodeURIComponent(manifestPath)}&file=${encodeURIComponent(relFile)}`,
        previewFile: path.basename(legacyPreview),
        relPath: path.relative(getAgentRoot(), legacyPreview).replace(/\\/g, "/"),
        updatedAt: stat.updatedAt,
        size: stat.size
      });
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const best = candidates[0];
  return {
    manifestPath,
    label,
    kind,
    displayPath: getManifestDisplayPathForTable(manifestPath, label, kind),
    fileKind: "preview",
    fileLabel: best.previewFile,
    relPath: best.relPath,
    updatedAt: best.updatedAt,
    size: best.size,
    previewUrl: best.previewUrl,
    previewFile: best.previewFile
  };
}

const TIMELINE_SLOT_FOLDER_TRACKS = [
  { subfolder: STORAGE_SUBFOLDER_MAIN, fileKind: "external", label: "Main" },
  { subfolder: STORAGE_SUBFOLDER_SCRIPTS, fileKind: "scripts", label: "Скрипты" },
  { subfolder: STORAGE_SUBFOLDER_INBOX, fileKind: "inbox", label: "Входящие" },
  { subfolder: STORAGE_SUBFOLDER_NOTE, fileKind: "note", label: "Заметки" },
  { subfolder: STORAGE_SUBFOLDER_ARTEFACTS, fileKind: "artefacts", label: "Артефакты" },
  { subfolder: STORAGE_SUBFOLDER_REPOSITORY, fileKind: "repository", label: "Репозиторий" },
  { subfolder: STORAGE_SUBFOLDER_QUICK_NOTES, fileKind: "quick-notes", label: "Быстрые заметки" },
  { subfolder: STORAGE_SUBFOLDER_REFERENCES, fileKind: "references", label: "Источники" }
];

async function buildAgentTimeline(limit = 150) {
  const menu = await buildAgentMenu(getAgentRoot());
  const manifests = collectAllMenuManifestEntries(menu);

  const events = [];
  const storageOpts = getStoragePathOptions();

  for (const entry of manifests) {
    const manifestPath = String(entry.manifestPath || "").replace(/\\/g, "/");
    const slotDirRel = getNamedStorageSlotDirRel(manifestPath, storageOpts);
    const label =
      entry.label ||
      getManifestNamedSlotKey(manifestPath) ||
      path.posix.basename(manifestPath, path.extname(manifestPath));

    const containerDirRel = getManifestContainerDirRel(manifestPath);
    const tracks = [
      { fileKind: "manifest", fileLabel: "Манифест", rel: manifestPath },
      { fileKind: "content", fileLabel: BUNDLE_CONTENT_FILE, rel: toContentFilePath(manifestPath) },
      { fileKind: "tabular", fileLabel: BUNDLE_TABULAR_FILE, rel: toTabularFilePath(manifestPath) },
      { fileKind: "config", fileLabel: BUNDLE_CONFIG_FILE, rel: toNodeConfigFilePath(manifestPath) },
      { fileKind: "todo", fileLabel: path.posix.basename(toTodoFilePath(manifestPath)), rel: toTodoFilePath(manifestPath) },
      { fileKind: "env", fileLabel: ".env", rel: toEnvFilePath(manifestPath) }
    ];

    for (const track of tracks) {
      const abs = normalizeWorkspacePath(track.rel);
      const stat = await statNodeFileMeta(abs);
      if (!stat?.updatedAt) continue;
      events.push({
        manifestPath,
        label,
        kind: entry.kind,
        displayPath: getManifestDisplayPathForTable(manifestPath, label, entry.kind),
        fileKind: track.fileKind,
        fileLabel: track.fileLabel,
        relPath: track.rel.replace(/\\/g, "/"),
        updatedAt: stat.updatedAt,
        size: stat.size
      });
    }

    const previewEvent = await buildNodePreviewTimelineEvent(manifestPath, label, entry.kind);
    if (previewEvent) events.push(previewEvent);

    const assetsAbs = normalizeWorkspacePath(`${slotDirRel}/${STORAGE_SUBFOLDER_MEDIA}`);
    const newestAsset = await findNewestFileMetaInDirRecursive(assetsAbs);
    if (newestAsset?.updatedAt) {
      const isImage = isTimelinePreviewImageFileName(newestAsset.name);
      events.push({
        manifestPath,
        label,
        kind: entry.kind,
        displayPath: getManifestDisplayPathForTable(manifestPath, label, entry.kind),
        fileKind: "media",
        fileLabel: `${STORAGE_SUBFOLDER_MEDIA}/${newestAsset.name}`,
        relPath: newestAsset.relPath,
        updatedAt: newestAsset.updatedAt,
        size: newestAsset.size,
        ...(isImage
          ? {
              previewUrl: `/api/media/file?path=${encodeURIComponent(manifestPath)}&file=${encodeURIComponent(`${STORAGE_SUBFOLDER_MEDIA}/${newestAsset.name}`)}`,
              previewFile: newestAsset.name
            }
          : {})
      });
    }

    const nodeAbsolute = normalizeWorkspacePath(manifestPath);
    if (nodeAbsolute) {
      for (const folderTrack of TIMELINE_SLOT_FOLDER_TRACKS) {
        const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, folderTrack.subfolder);
        const newestFolderFile = await findNewestFileMetaInDirRecursive(folderAbsolute);
        if (!newestFolderFile?.updatedAt) continue;
        events.push({
          manifestPath,
          label,
          kind: entry.kind,
          displayPath: getManifestDisplayPathForTable(manifestPath, label, entry.kind),
          fileKind: folderTrack.fileKind,
          fileLabel: `${folderTrack.label}/${newestFolderFile.name}`,
          relPath: newestFolderFile.relPath,
          updatedAt: newestFolderFile.updatedAt,
          size: newestFolderFile.size
        });
      }
    }
  }

  events.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const capped = events.slice(0, Math.max(1, Math.min(500, Number(limit) || 150)));
  return { events: capped, totalMatched: events.length };
}

async function resolveStorageSubfolderInParentAbsolute(parentAbsolute, subfolderName) {
  if (!parentAbsolute) return null;
  const candidates = listStorageSubfolderNameCandidates(subfolderName);
  for (const candidate of candidates) {
    const folder = await resolveFolderPathCaseInsensitive(parentAbsolute, candidate);
    if (folder && (await isExistingDirectory(folder))) return folder;
  }
  return null;
}

async function getNodeStorageSubfolderAbsolute(nodeAbsolute, subfolderName) {
  const rel = path.relative(getAgentRoot(), nodeAbsolute).replace(/\\/g, "/");
  for (const slotRel of listManifestStorageSlotDirRelCandidates(rel, getStoragePathOptions())) {
    const slotAbsolute = normalizeWorkspacePath(slotRel);
    if (!slotAbsolute) continue;
    const folder = await resolveStorageSubfolderInParentAbsolute(slotAbsolute, subfolderName);
    if (folder) return folder;
  }
  const storageRoot = getNodeStorageRootAbsolute(nodeAbsolute);
  return resolveStorageSubfolderInParentAbsolute(storageRoot, subfolderName);
}

async function isExistingDirectory(absolutePath) {
  try {
    const stat = await fs.stat(absolutePath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function resolveNodeSubfolderAbsolute(nodeAbsolute, subfolderName, options = {}) {
  if (options.create) {
    return getOrCreateNodeStorageSubfolderAbsolute(nodeAbsolute, subfolderName);
  }

  const storageFolder = await getNodeStorageSubfolderAbsolute(nodeAbsolute, subfolderName);
  if (storageFolder && (await isExistingDirectory(storageFolder))) {
    return storageFolder;
  }

  if (options.allowShared !== false) {
    const sharedFolder = await resolveSharedMountSubfolderAbsolute(nodeAbsolute, subfolderName);
    if (sharedFolder && (await isExistingDirectory(sharedFolder))) {
      return sharedFolder;
    }
  }

  return null;
}

async function ensureNodeStorageFileAbsolute(nodeAbsolute, fileName) {
  const rel = path.relative(getAgentRoot(), nodeAbsolute).replace(/\\/g, "/");
  const containerAbsolute = normalizeWorkspacePath(getManifestContainerDirRel(rel));
  const targetDir = containerAbsolute || getNodeStorageRootAbsolute(nodeAbsolute);
  if (!targetDir) return null;
  await fs.mkdir(targetDir, { recursive: true });
  const fileAbsolute = path.join(targetDir, fileName);
  if (!fileAbsolute.startsWith(getAgentRoot())) return null;
  return fileAbsolute;
}

async function resolveNodeStorageFileAbsolute(nodeAbsolute, fileName, options = {}) {
  const rel = path.relative(getAgentRoot(), nodeAbsolute).replace(/\\/g, "/");
  const candidates = [];
  const containerAbsolute = normalizeWorkspacePath(getManifestContainerDirRel(rel));
  const storageRoot = getNodeStorageRootAbsolute(nodeAbsolute);
  for (const name of listBundleFileNameCandidates(fileName)) {
    if (containerAbsolute) candidates.push(path.join(containerAbsolute, name));
    if (storageRoot) candidates.push(path.join(storageRoot, name));
  }
  if (!listBundleFileNameCandidates(fileName).includes(fileName)) {
    if (containerAbsolute) candidates.push(path.join(containerAbsolute, fileName));
    if (storageRoot) candidates.push(path.join(storageRoot, fileName));
  }

  if (!options.create) {
    for (const candidate of candidates) {
      if (await fileExists(candidate)) return candidate;
    }
  }

  if (options.create) {
    return ensureNodeStorageFileAbsolute(nodeAbsolute, fileName);
  }

  return candidates[0] || path.join(containerAbsolute || storageRoot || getAgentRoot(), fileName);
}

async function getOrCreateNodeStorageSubfolderAbsolute(nodeAbsolute, subfolderName) {
  const canonical = normalizeStorageSubfolderName(subfolderName);
  if (!canonical) {
    return null;
  }
  const manifestRel = path.relative(getAgentRoot(), nodeAbsolute).replace(/\\/g, "/");
  await ensureManifestStorageSlotDir(manifestRel);
  const storageRoot = getNodeStorageRootAbsolute(nodeAbsolute);
  let folderAbsolute = await resolveFolderPathCaseInsensitive(storageRoot, canonical);
  if (!folderAbsolute) {
    folderAbsolute = path.join(storageRoot, canonical);
    await fs.mkdir(folderAbsolute, { recursive: true });
  }
  if (!folderAbsolute.startsWith(getAgentRoot())) return null;
  return folderAbsolute;
}

function toExternalSectionFolderName(rawName) {
  const slug = sanitizeSlugInput(rawName) || transliterateToSlug(rawName);
  if (!slug) return null;
  return slug;
}

async function resolveUniqueExternalFileName(folderAbsolute, baseName = "Воспоминание") {
  const firstName = toExternalMarkdownFileName(baseName);
  if (!firstName) return null;

  let candidate = firstName;
  let counter = 2;
  while (true) {
    try {
      await fs.access(joinFolderRelativePath(folderAbsolute, candidate));
      const stem = firstName.replace(/\.md$/i, "");
      candidate = `${stem}-${counter}.md`;
      counter += 1;
    } catch {
      return candidate.replace(/\\/g, "/");
    }
  }
}

function joinFolderRelativePath(folderAbsolute, relativePath) {
  const root = path.resolve(folderAbsolute);
  const normalized = String(relativePath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return root;
  const segments = normalized.split("/").filter(Boolean);
  let current = root;
  for (const segment of segments) {
    if (!segment || segment === "." || segment === "..") return null;
    current = path.join(current, segment);
  }
  if (!isPathInsideDirectory(root, current)) return null;
  return current;
}

async function readExternalIdIncrement(folderAbsolute) {
  const incrementAbsolute = path.join(folderAbsolute, ID_INCREMENT_FILENAME);
  try {
    const raw = await fs.readFile(incrementAbsolute, "utf-8");
    const parsed = Number.parseInt(String(raw || "").trim(), 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  } catch {
    // start from zero; first increment yields 1
  }
  return 0;
}

async function writeExternalIdIncrement(folderAbsolute, nextValue) {
  const incrementAbsolute = path.join(folderAbsolute, ID_INCREMENT_FILENAME);
  await fs.writeFile(incrementAbsolute, `${Math.max(0, Math.floor(Number(nextValue) || 0))}\n`, "utf-8");
}

async function allocateExternalIdIncrement(folderAbsolute) {
  const current = await readExternalIdIncrement(folderAbsolute);
  const next = current + 1;
  await writeExternalIdIncrement(folderAbsolute, next);
  return next;
}

async function peekNextExternalIdIncrement(folderAbsolute) {
  const current = await readExternalIdIncrement(folderAbsolute);
  return current + 1;
}

async function resolveUniqueMaskRelativePath(folderAbsolute, relativePath) {
  const normalized = sanitizeMaskRelativePath(relativePath);
  if (!normalized) return null;

  let candidate = normalized;
  let counter = 2;
  while (true) {
    const absolute = joinFolderRelativePath(folderAbsolute, candidate);
    if (!absolute) return null;
    try {
      await fs.access(absolute);
      const stem = normalized.replace(/\.md$/i, "");
      const dir = path.posix.dirname(normalized);
      const nextStem = `${path.posix.basename(stem)}-${counter}`;
      candidate = dir && dir !== "." ? `${dir}/${nextStem}.md` : `${nextStem}.md`;
      counter += 1;
    } catch {
      return candidate.replace(/\\/g, "/");
    }
  }
}

async function resolveExternalFileNameFromMask(targetFolder, mask, options = {}) {
  const template = String(mask || "").trim();
  if (!template) return null;
  const incrementRoot = options.incrementRoot || targetFolder;
  const id = maskUsesId(template)
    ? options.id ?? (await allocateExternalIdIncrement(incrementRoot))
    : options.id ?? 1;
  const relative = resolveFileMask(template, { id, date: options.date || new Date() });
  return resolveUniqueMaskRelativePath(targetFolder, relative);
}

async function ensureExternalRelativeParentDirs(folderAbsolute, relativePath) {
  const normalized = sanitizeMaskRelativePath(relativePath);
  if (!normalized) return null;
  const absolute = joinFolderRelativePath(folderAbsolute, normalized);
  if (!absolute) return null;
  await fs.mkdir(path.dirname(absolute), { recursive: true });
  return normalized.replace(/\\/g, "/");
}

async function getOrCreateExternalFolderAbsolute(nodeAbsolute) {
  return getOrCreateNodeStorageSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_CONTENT);
}

async function resolveExternalMemoryFolderAbsolute(manifestRelPath, options = {}) {
  const section = parseExternalSectionManifestRel(manifestRelPath);
  if (section?.sectionDirRel) {
    const sectionAbsolute = normalizeWorkspacePath(section.sectionDirRel);
    if (sectionAbsolute) {
      if (options.create) {
        await fs.mkdir(sectionAbsolute, { recursive: true });
      } else if (!(await isExistingDirectory(sectionAbsolute))) {
        return null;
      }
      return sectionAbsolute;
    }
  }

  const nodeAbsolute = await resolveApiManifestAbsolute(manifestRelPath);
  if (!nodeAbsolute) return null;

  let folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_CONTENT, options);
  if (!folderAbsolute && options.create) {
    folderAbsolute = await getOrCreateExternalFolderAbsolute(nodeAbsolute);
  }
  return folderAbsolute;
}

function normalizeExternalMemoryFileRelForManifest(manifestRelPath, relFile) {
  const section = parseExternalSectionManifestRel(manifestRelPath);
  return normalizeExternalMemoryFileRel(relFile, {
    sectionRel: section?.sectionRel || "",
    layer: section?.layer || STORAGE_SUBFOLDER_MAIN,
    manifestRelPath: section?.topicManifestRel || manifestRelPath
  });
}

function resolveExternalMemorySchemaManifestRel(manifestRelPath) {
  return parseExternalSectionManifestRel(manifestRelPath)?.topicManifestRel || manifestRelPath;
}

function resolveExternalMemoryCreateParentRel(manifestRelPath, parentRaw) {
  const section = parseExternalSectionManifestRel(manifestRelPath);
  let parentRel = resolveStorageCreateParentRel(parentRaw, {
    layer: STORAGE_SUBFOLDER_CONTENT,
    manifestRelPath: section?.topicManifestRel || manifestRelPath
  });
  if (!section?.sectionRel || !parentRel) return parentRel;

  if (parentRel.toLowerCase() === section.sectionRel.toLowerCase()) {
    return "";
  }
  const sectionPrefix = `${section.sectionRel}/`;
  if (parentRel.toLowerCase().startsWith(sectionPrefix.toLowerCase())) {
    return parentRel.slice(sectionPrefix.length);
  }
  return parentRel;
}

function getNodePreviewSidecarBaseRel(relNodePath) {
  const partBase = resolvePartFolderSidecarBaseRel(relNodePath);
  if (partBase) return `${partBase}.preview`;
  return `${namedStorageBundleDirRel(relNodePath)}/${PREVIEW_FILE_BASENAME}`;
}

function getNodePreviewDirAbsolute(nodeAbsolute) {
  const rel = path.relative(getAgentRoot(), String(nodeAbsolute || "")).replace(/\\/g, "/");
  if (parsePartFolderManifestRel(rel)) {
    return path.dirname(String(nodeAbsolute || ""));
  }
  const bundleDirAbsolute = normalizeWorkspacePath(namedStorageBundleDirRel(rel));
  return bundleDirAbsolute || path.dirname(String(nodeAbsolute || ""));
}

function getNodePreviewSidecarBaseName(nodeAbsolute) {
  const rel = path.relative(getAgentRoot(), String(nodeAbsolute || "")).replace(/\\/g, "/");
  if (parsePartFolderManifestRel(rel)) {
    return path.basename(getNodePreviewSidecarBaseRel(rel));
  }
  return PREVIEW_FILE_BASENAME;
}

function getNodePreviewSidecarBaseNames(nodeAbsolute) {
  const dir = getNodePreviewDirAbsolute(nodeAbsolute);
  const bases = [getNodePreviewSidecarBaseName(nodeAbsolute)];
  return { dir, bases };
}

async function findNodePreviewSidecarAbsolute(nodeAbsolute) {
  const rel = path.relative(getAgentRoot(), String(nodeAbsolute || "")).replace(/\\/g, "/");

  if (!parsePartFolderManifestRel(rel)) {
    for (const slotRel of listManifestStorageSlotDirRelCandidates(rel, getStoragePathOptions())) {
      const dir = normalizeWorkspacePath(slotRel);
      if (!dir) continue;
      for (const ext of NODE_PREVIEW_EXTENSIONS) {
        const absolute = path.join(dir, `${PREVIEW_FILE_BASENAME}${ext}`);
        try {
          const stat = await fs.stat(absolute);
          if (stat.isFile()) return absolute;
        } catch {
          // try next extension
        }
      }
    }
  }

  const { dir, bases } = getNodePreviewSidecarBaseNames(nodeAbsolute);
  for (const base of bases) {
    for (const ext of NODE_PREVIEW_EXTENSIONS) {
      const absolute = path.join(dir, `${base}${ext}`);
      try {
        const stat = await fs.stat(absolute);
        if (stat.isFile()) return absolute;
      } catch {
        // try next extension
      }
    }
  }
  return null;
}

async function clearNodePreviewSidecarFiles(nodeAbsolute) {
  const { dir, bases } = getNodePreviewSidecarBaseNames(nodeAbsolute);
  for (const base of bases) {
    for (const ext of NODE_PREVIEW_EXTENSIONS) {
      try {
        await fs.unlink(path.join(dir, `${base}${ext}`));
      } catch {
        // file may not exist
      }
    }
  }
}

function resolveNodePreviewExtension(mimeType, rawName) {
  const mime = String(mimeType || "").toLowerCase();
  const ext = path.extname(String(rawName || "")).toLowerCase();

  if (mime === "image/png" || ext === ".png") return ".png";
  if (mime === "image/gif" || ext === ".gif") return ".gif";
  if (mime === "image/jpeg" || ext === ".jpg" || ext === ".jpeg") return ".jpg";
  return null;
}

function buildNodePreviewSidecarFileName(nodeAbsolute, ext) {
  const normalizedExt = ext === ".jpeg" ? ".jpg" : ext;
  return `${getNodePreviewSidecarBaseName(nodeAbsolute)}${normalizedExt}`;
}

function validatePreviewImageBufferByExt(buffer, ext) {
  const targetFileName =
    ext === ".png"
      ? `${PREVIEW_FILE_BASENAME}.png`
      : ext === ".gif"
        ? `${PREVIEW_FILE_BASENAME}.gif`
        : `${PREVIEW_FILE_BASENAME}.jpg`;
  return validatePreviewImageBuffer(buffer, targetFileName);
}

async function findNodePreviewImageAbsolute(nodeAbsolute) {
  const sidecar = await findNodePreviewSidecarAbsolute(nodeAbsolute);
  return sidecar || null;
}

async function getOrCreateNodePreviewSidecarAbsolute(nodeAbsolute, ext) {
  const dir = getNodePreviewDirAbsolute(nodeAbsolute);
  await fs.mkdir(dir, { recursive: true });
  const fileName = buildNodePreviewSidecarFileName(nodeAbsolute, ext);
  const absolute = path.join(dir, fileName);
  if (!absolute.startsWith(getAgentRoot())) return null;
  return absolute;
}

async function removeDirectoryIfEmpty(absolutePath) {
  try {
    const entries = await fs.readdir(absolutePath);
    if (entries.length === 0) await fs.rmdir(absolutePath);
  } catch {
    // directory may not exist or not be empty
  }
}

async function listNodePreviewFoldersAbsolute(nodeAbsolute) {
  const folders = [];
  const agentRoot = getAgentRoot();
  const rel = path.relative(agentRoot, String(nodeAbsolute || "")).replace(/\\/g, "/");

  for (const slotRel of listManifestStorageSlotDirRelCandidates(rel)) {
    const slotAbsolute = normalizeWorkspacePath(slotRel);
    if (!slotAbsolute || !slotAbsolute.startsWith(agentRoot)) continue;

    const previewSubfolder = path.join(slotAbsolute, STORAGE_SUBFOLDER_PREVIEW);
    if ((await isExistingDirectory(previewSubfolder)) && !folders.includes(previewSubfolder)) {
      folders.push(previewSubfolder);
    }
  }

  return folders;
}

async function cleanupNodePreviewDirsForNode(nodeAbsolute) {
  for (const previewFolderAbsolute of await listNodePreviewFoldersAbsolute(nodeAbsolute)) {
    await clearPreviewImages(previewFolderAbsolute);
    await removeDirectoryIfEmpty(previewFolderAbsolute);
  }
}

async function clearAllNodePreviewImages(nodeAbsolute) {
  await clearNodePreviewSidecarFiles(nodeAbsolute);
  await cleanupNodePreviewDirsForNode(nodeAbsolute);
}

async function findPreviewImageAbsolute(previewFolderAbsolute) {
  for (const name of PREVIEW_FILE_NAMES) {
    const absolute = path.join(previewFolderAbsolute, name);
    try {
      const stat = await fs.stat(absolute);
      if (stat.isFile()) return absolute;
    } catch {
      // try next candidate
    }
  }

  try {
    const entries = await fs.readdir(previewFolderAbsolute, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile() && /^preview\.(jpe?g|png|gif)$/i.test(entry.name)) {
        return path.join(previewFolderAbsolute, entry.name);
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function clearPreviewImages(previewFolderAbsolute) {
  for (const name of PREVIEW_FILE_NAMES) {
    try {
      await fs.unlink(path.join(previewFolderAbsolute, name));
    } catch {
      // file may not exist
    }
  }
}

function resolvePreviewFileName(mimeType, rawName) {
  const mime = String(mimeType || "").toLowerCase();
  const ext = path.extname(String(rawName || "")).toLowerCase();

  if (mime === "image/png" || ext === ".png") return `${PREVIEW_FILE_BASENAME}.png`;
  if (mime === "image/gif" || ext === ".gif") return `${PREVIEW_FILE_BASENAME}.gif`;
  if (mime === "image/jpeg" || ext === ".jpg" || ext === ".jpeg") return `${PREVIEW_FILE_BASENAME}.jpg`;
  return null;
}

function validatePreviewImageBuffer(buffer, targetFileName) {
  if (!buffer || buffer.length < 6) return false;
  if (targetFileName === `${PREVIEW_FILE_BASENAME}.png`) {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (targetFileName === `${PREVIEW_FILE_BASENAME}.gif`) {
    const header = buffer.subarray(0, 6).toString("ascii");
    return header === "GIF87a" || header === "GIF89a";
  }
  if (
    targetFileName === `${PREVIEW_FILE_BASENAME}.jpg` ||
    targetFileName === `${PREVIEW_FILE_BASENAME}.jpeg`
  ) {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  return false;
}

function detectImageExtensionFromBuffer(buffer) {
  if (!buffer || buffer.length < 6) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return ".png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return ".jpg";
  const gifHeader = buffer.subarray(0, 6).toString("ascii");
  if (gifHeader === "GIF87a" || gifHeader === "GIF89a") return ".gif";
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return ".webp";
  }
  if (buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp") {
    return ".heic";
  }
  return null;
}

function resolveMediaImageExtension(mimeType, rawName, buffer = null) {
  const detected = buffer ? detectImageExtensionFromBuffer(buffer) : null;
  if (detected) return detected;

  const mime = String(mimeType || "").toLowerCase();
  const ext = path.extname(String(rawName || "")).toLowerCase();

  if (mime === "image/png" || ext === ".png") return ".png";
  if (mime === "image/gif" || ext === ".gif") return ".gif";
  if (mime === "image/webp" || ext === ".webp") return ".webp";
  if (mime === "image/heic" || mime === "image/heif" || ext === ".heic" || ext === ".heif") return ".heic";
  if (mime === "image/jpeg" || ext === ".jpg" || ext === ".jpeg") return ".jpg";
  return null;
}

function validateMediaImageBufferByExt(buffer, ext) {
  if (!buffer || !ext) return false;
  if (ext === ".heic" || ext === ".heif") {
    return buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
  }
  if (ext === ".webp") {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  const targetFileName =
    ext === ".png"
      ? `${PREVIEW_FILE_BASENAME}.png`
      : ext === ".gif"
        ? `${PREVIEW_FILE_BASENAME}.gif`
        : `${PREVIEW_FILE_BASENAME}.jpg`;
  return validatePreviewImageBuffer(buffer, targetFileName);
}

function sanitizeMediaFileName(rawName) {
  let name = String(rawName || "")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    .replace(/\s+/g, " ");
  if (!name || name.includes("..")) return null;
  if (name.toLowerCase().endsWith(".sidecar.md")) return null;
  name = name.replace(/[^\w.\- ()[\]а-яА-ЯёЁ]/gi, "-").replace(/-+/g, "-");
  return name || null;
}

async function resolveUniqueMediaFileAbsolute(folderAbsolute, fileName) {
  const parsed = path.parse(fileName);
  let candidate = fileName;
  let index = 1;
  while (await fileExists(path.join(folderAbsolute, candidate))) {
    candidate = `${parsed.name}-${index}${parsed.ext}`;
    index += 1;
    if (index > 999) return null;
  }
  return path.join(folderAbsolute, candidate);
}

const AGENT_SLIDER_ASSETS_SUBDIR = "slider";
const AGENT_SLIDER_FOLDER_REF = `${STORAGE_ROOT_FOLDER}/${STORAGE_SUBFOLDER_ASSETS}/${AGENT_SLIDER_ASSETS_SUBDIR}`;
const AGENT_SLIDER_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"]);

function resolveAgentSliderWorkspacePath(url, payload = null) {
  const agentId = String(url.searchParams.get("agent") || "").trim();
  if (agentId) {
    const agent = resolveAgent(agentId);
    if (!agent) {
      throw Object.assign(new Error(`Unknown agent: ${agentId}`), { status: 400 });
    }
    if (agent.folderExists === false) {
      throw Object.assign(new Error(`Workspace not found for agent «${agent.name || agentId}»`), {
        status: 400
      });
    }
    return assertSafeAgentPath(agent.path);
  }

  const workspacePath = String(url.searchParams.get("path") || payload?.path || "").trim();
  if (!workspacePath) {
    throw Object.assign(new Error("Missing agent query parameter"), { status: 400 });
  }
  return assertSafeAgentPath(workspacePath);
}

function resolveAgentWorkspaceManifestAbsoluteSync(agentPath) {
  const safePath = assertSafeAgentPath(agentPath);
  const workspaceAbsolute = resolveAgentRootAbsolute(safePath);
  const manifest = readWorkspaceManifestSync(workspaceAbsolute);
  if (!manifest) return null;
  return path.join(workspaceAbsolute, AREA_MANIFEST_FILE);
}

async function resolveAgentSliderFolderAbsolute(agentPath, options = {}) {
  const safePath = assertSafeAgentPath(agentPath);
  const workspaceAbsolute = resolveAgentRootAbsolute(safePath);
  const folderAbsolute = path.join(workspaceAbsolute, AGENT_SLIDER_FOLDER_REF);
  if (options.create) {
    await fs.mkdir(folderAbsolute, { recursive: true });
    return folderAbsolute;
  }
  try {
    const stat = await fs.stat(folderAbsolute);
    return stat.isDirectory() ? folderAbsolute : null;
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function listAgentSliderImages(agentPath) {
  const folderAbsolute = await resolveAgentSliderFolderAbsolute(agentPath);
  if (!folderAbsolute) return [];

  let entries = [];
  try {
    entries = await fs.readdir(folderAbsolute, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith(".")) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!AGENT_SLIDER_IMAGE_EXTENSIONS.has(ext)) continue;
    const fileAbsolute = path.join(folderAbsolute, entry.name);
    const stat = await fs.stat(fileAbsolute);
    files.push({
      name: entry.name,
      mediaFile: `${AGENT_SLIDER_ASSETS_SUBDIR}/${entry.name}`,
      size: stat.size,
      updatedAt: stat.mtime ? stat.mtime.toISOString() : null
    });
  }

  files.sort((a, b) => a.name.localeCompare(b.name, "ru", { sensitivity: "base", numeric: true }));
  return files;
}

async function getAgentPreviewMeta(agent) {
  const enriched = enrichAgentEntry(agent);
  try {
    const previewAbsolute = findAgentWorkspacePreviewAbsoluteSync(enriched.rootAbsolute);
    if (previewAbsolute) {
      return {
        hasPreview: true,
        previewUrl: `/api/agents/workspace-preview?path=${encodeURIComponent(enriched.path)}`
      };
    }
    return { hasPreview: false, previewUrl: null };
  } catch {
    return { hasPreview: false, previewUrl: null };
  }
}

async function enrichFocusItems(items) {
  const lookupCache = new Map();

  async function getLookupForAgent(agentId) {
    if (lookupCache.has(agentId)) return lookupCache.get(agentId);
    const agent = resolveAgent(agentId);
    if (!agent || isPlatformAgentId(agent.id)) {
      lookupCache.set(agentId, null);
      return null;
    }
    let serviceAbsolute = null;
    try {
      await runWithAgent(agent.id, async () => {
        const kitFolder = getAgentKitFolder();
        if (kitFolder) {
          serviceAbsolute = await resolveAgentSubfolderAbsolute(getAgentRoot(), kitFolder);
        }
      });
    } catch {
      lookupCache.set(agentId, null);
      return null;
    }
    const lookup = await getCatalogLookupMaps(getProjectRoot(), serviceAbsolute);
    lookupCache.set(agentId, lookup);
    return lookup;
  }

  return Promise.all(
    items.map(async (item) => {
      const agent = resolveAgent(item.agentId);
      if (!agent) return { ...item, agentPreviewUrl: null, nodePreviewUrl: null };

      let agentPreviewUrl = null;
      let nodePreviewUrl = null;
      try {
        const agentPreview = await getAgentPreviewMeta(agent);
        agentPreviewUrl = agentPreview.previewUrl || null;
      } catch {
        // no agent preview
      }

      if (item.nodePath) {
        try {
          await runWithAgent(agent.id, async () => {
            const nodePreview = await getNodePreviewMeta(item.nodePath);
            nodePreviewUrl = nodePreview.previewUrl || null;
          });
        } catch {
          // no node preview
        }
      }

      const lookup = await getLookupForAgent(item.agentId);
      const awnProps = item.awnProps && typeof item.awnProps === "object" ? { ...item.awnProps } : {};
      const catalogDisplay = {};
      if (lookup) {
        if (awnProps["awn-category"]) {
          catalogDisplay["awn-category"] = resolveCatalogPropValue(lookup.categories, awnProps["awn-category"]);
        }
        if (awnProps["awn-status"]) {
          catalogDisplay["awn-status"] = resolveCatalogPropValue(lookup.statuses, awnProps["awn-status"]);
        }
        if (awnProps["awn-owner"]) {
          catalogDisplay["awn-owner"] = resolveCatalogPropValue(lookup.users, awnProps["awn-owner"]);
        }
        if (awnProps["awn-priority"]) {
          catalogDisplay["awn-priority"] = resolveCatalogPropValue(lookup.priorities, awnProps["awn-priority"]);
        }
        if (awnProps["awn-tags"]) {
          catalogDisplay["awn-tags"] = resolveCatalogTagsList(lookup.tags, awnProps["awn-tags"]).join(", ");
        }
        if (awnProps["awn-color"]) {
          const colorRaw = String(awnProps["awn-color"]).trim();
          const colorItem = lookup.colors.find(
            (entry) => entry.id === colorRaw || entry.color === colorRaw
          );
          if (colorItem) {
            catalogDisplay["awn-color"] = colorItem.label || colorRaw;
            if (colorItem.color) catalogDisplay["awn-color-hex"] = colorItem.color;
          } else if (/^#[0-9a-f]{3,8}$/i.test(colorRaw)) {
            catalogDisplay["awn-color"] = colorRaw;
            catalogDisplay["awn-color-hex"] = colorRaw;
          }
        }
      }

      return {
        ...item,
        agentPreviewUrl,
        nodePreviewUrl,
        catalogDisplay
      };
    })
  );
}


async function resolveAwnPreviewFieldMeta(nodeRelativePath, previewRaw) {
  const previewValue = String(previewRaw || "").trim();
  const contextRelPath = resolveOwningManifestRelFromNodePath(nodeRelativePath);
  if (!previewValue) {
    return { hasPreview: false, previewUrl: null, previewFile: null };
  }

  if (/^https?:\/\//i.test(previewValue)) {
    return {
      hasPreview: true,
      previewUrl: previewValue,
      previewFile: path.basename(previewValue.split("?")[0]) || null
    };
  }

  if (previewValue.startsWith("/api/")) {
    return {
      hasPreview: true,
      previewUrl: previewValue,
      previewFile: null
    };
  }

  const candidates = listStorageAssetsRefPathCandidates(previewValue, contextRelPath);
  for (const candidate of candidates) {
    const assetsRef = parseStorageAssetsRef(candidate);
    if (!assetsRef?.manifestRelPath || !assetsRef.mediaFile) continue;
    const resolvedRelPath = await resolveExistingWorkspaceRelPath(assetsRef.manifestRelPath);
    const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
    if (!nodeAbsolute || !isManifestMdAbsolute(nodeAbsolute)) continue;
    const relFile = normalizeRelativeFilePath(assetsRef.mediaFile);
    if (!relFile) continue;

    let fileAbsolute = null;
    if (assetsRef.workspacePath) {
      const candidateAbsolute = normalizeWorkspacePath(assetsRef.workspacePath);
      if (candidateAbsolute && (await fileExists(candidateAbsolute))) {
        fileAbsolute = candidateAbsolute;
      }
    }
    if (!fileAbsolute) {
      fileAbsolute = await resolveUploadedMediaFileAbsolute(nodeAbsolute, relFile);
    }
    if (!fileAbsolute) {
      fileAbsolute = await resolveUploadedMediaFileAbsolute(
        nodeAbsolute,
        `${STORAGE_ROOT_FOLDER}/${STORAGE_SUBFOLDER_ASSETS}/${relFile}`
      );
    }
    if (!fileAbsolute) continue;

    try {
      const stat = await fs.stat(fileAbsolute);
      if (!stat.isFile()) continue;
      return {
        hasPreview: true,
        previewUrl: `/api/media/file?path=${encodeURIComponent(assetsRef.manifestRelPath)}&file=${encodeURIComponent(relFile)}`,
        previewFile: path.basename(relFile)
      };
    } catch {
      // try next candidate
    }
  }

  for (const candidate of candidates) {
    const inlineRef = parseStorageSlotInlineRef(candidate);
    if (!inlineRef?.manifestRelPath || inlineRef.layer !== STORAGE_SUBFOLDER_PREVIEW || !inlineRef.relativePath) {
      continue;
    }
    const resolvedRelPath = await resolveExistingWorkspaceRelPath(inlineRef.manifestRelPath);
    const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
    if (!nodeAbsolute || !isManifestMdAbsolute(nodeAbsolute)) continue;
    const fileAbsolute = await resolveSlotInlineFileAbsolute(
      nodeAbsolute,
      inlineRef.layer,
      inlineRef.relativePath
    );
    if (!fileAbsolute) continue;
    try {
      const stat = await fs.stat(fileAbsolute);
      if (!stat.isFile()) continue;
      return {
        hasPreview: true,
        previewUrl: `/api/media/file?path=${encodeURIComponent(inlineRef.manifestRelPath)}&file=${encodeURIComponent(inlineRef.slotLayerFile)}`,
        previewFile: path.basename(inlineRef.relativePath)
      };
    } catch {
      // try next candidate
    }
  }

  return { hasPreview: false, previewUrl: null, previewFile: null };
}

async function resolveSlotInlineFileAbsolute(nodeAbsolute, layer, relativePath, { create = false } = {}) {
  const folderAbsolute = await resolveInlineAssetsFolderAbsolute(nodeAbsolute, layer, { create });
  if (!folderAbsolute) return null;
  const relFile = normalizeRelativeFilePath(relativePath);
  if (!relFile) return null;
  const fileAbsolute = path.join(folderAbsolute, relFile);
  const folderResolved = path.resolve(folderAbsolute);
  const fileResolved = path.resolve(fileAbsolute);
  if (fileResolved !== folderResolved && !fileResolved.startsWith(`${folderResolved}${path.sep}`)) {
    return null;
  }
  return fileAbsolute;
}

async function resolveUploadedMediaFileAbsolute(nodeAbsolute, relFile) {
  const normalized = normalizeRelativeFilePath(relFile);
  if (!normalized) return null;

  const assetsFromFullPath = parseStorageAssetsRef(normalized);
  if (assetsFromFullPath?.workspacePath) {
    const fileAbsolute = normalizeWorkspacePath(assetsFromFullPath.workspacePath);
    if (fileAbsolute) return fileAbsolute;
  }

  const inlineFromFullPath = parseStorageSlotInlineRef(normalized);
  if (inlineFromFullPath?.manifestRelPath && inlineFromFullPath.relativePath) {
    const manifestAbsolute = normalizeWorkspacePath(inlineFromFullPath.manifestRelPath);
    if (manifestAbsolute) {
      const legacyFile = await resolveSlotInlineFileAbsolute(
        manifestAbsolute,
        inlineFromFullPath.layer,
        inlineFromFullPath.relativePath
      );
      if (legacyFile) return legacyFile;
    }
  }

  const relUnderAssets = normalized
    .replace(/^(?:awn-storage|storage)\/assets\//i, "")
    .replace(/^assets\//i, "");
  const firstSegment = relUnderAssets.split("/")[0];
  if (isInlineAssetsUploadSubdir(firstSegment)) {
    const assetsFolder = await resolveInlineAssetsFolderAbsolute(nodeAbsolute, firstSegment);
    if (assetsFolder) {
      const tail = relUnderAssets.includes("/") ? relUnderAssets.slice(relUnderAssets.indexOf("/") + 1) : relUnderAssets;
      const fileAbsolute = path.join(assetsFolder, tail);
      if (fileAbsolute.startsWith(assetsFolder) && (await fileExists(fileAbsolute))) return fileAbsolute;
    }
  }

  const assetsFolder = await getAssetsFolderAbsolute(nodeAbsolute);
  if (assetsFolder) {
    const fileAbsolute = path.join(assetsFolder, relUnderAssets);
    if (fileAbsolute.startsWith(assetsFolder) && (await fileExists(fileAbsolute))) return fileAbsolute;
  }

  const mediaBasename = path.basename(String(normalized).replace(/\\/g, "/"));
  if (mediaBasename) {
    const mediaFolder = await getMediaFolderAbsolute(nodeAbsolute);
    if (mediaFolder) {
      const mediaByName = path.join(mediaFolder, mediaBasename);
      if (mediaByName.startsWith(mediaFolder) && (await fileExists(mediaByName))) {
        return mediaByName;
      }
    }

    const contentFolder = await resolveNodeSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_CONTENT);
    if (contentFolder) {
      const mainByName = path.join(contentFolder, mediaBasename);
      if (mainByName.startsWith(contentFolder) && (await fileExists(mainByName))) {
        return mainByName;
      }
    }
  }

  const contentFolder = await resolveNodeSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_CONTENT);
  if (contentFolder && /^main\//i.test(normalized)) {
    const tail = normalized.replace(/^main\//i, "");
    const fileAbsolute = path.join(contentFolder, tail);
    if (fileAbsolute.startsWith(contentFolder) && (await fileExists(fileAbsolute))) {
      return fileAbsolute;
    }
  }

  const mediaFolder = await getMediaFolderAbsolute(nodeAbsolute);
  if (mediaFolder && /^media\//i.test(normalized)) {
    const tail = normalized.replace(/^media\//i, "");
    const fileAbsolute = path.join(mediaFolder, tail);
    if (fileAbsolute.startsWith(mediaFolder) && (await fileExists(fileAbsolute))) {
      return fileAbsolute;
    }
  }

  const nodeRel = manifestRelFromNodeAbsolute(nodeAbsolute);
  if (nodeRel && /^preview\//i.test(relUnderAssets)) {
    const fileName = relUnderAssets.split("/").pop();
    const ownerRel = resolveOwningManifestRelFromNodePath(nodeRel);
    const ownerContainer = getManifestContainerDirRel(ownerRel);
    if (ownerContainer && fileName) {
      const legacyRefs = [
        `${ownerContainer}/awn-storage/main/awn-storage/assets/preview/${fileName}`,
        `${ownerContainer}/awn-storage/main/awn-storage/assets/preview/${fileName}`,
        `${ownerContainer}/awn-storage/content/awn-storage/assets/preview/${fileName}`,
        `${ownerContainer}/storage/content/storage/assets/preview/${fileName}`
      ];
      for (const legacyRef of legacyRefs) {
        const legacyAbsolute = normalizeWorkspacePath(legacyRef);
        if (legacyAbsolute && (await fileExists(legacyAbsolute))) return legacyAbsolute;
      }
    }
  }

  const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute);
  if (folderAbsolute) {
    const fileAbsolute = path.join(folderAbsolute, normalized);
    if (fileAbsolute.startsWith(folderAbsolute) && (await fileExists(fileAbsolute))) {
      return fileAbsolute;
    }
  }

  return null;
}

async function getNodePreviewMeta(nodeRelativePath) {
  const resolvedRelPath = await resolveExistingWorkspaceRelPath(nodeRelativePath);
  const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
  if (!nodeAbsolute) {
    return { hasPreview: false, previewUrl: null, previewFile: null };
  }

  const isManifest = isManifestMdAbsolute(nodeAbsolute);
  const storageContextAbsolute = isManifest ? null : await resolveApiStorageContextAbsolute(nodeRelativePath);
  if (!isManifest && !storageContextAbsolute) {
    return { hasPreview: false, previewUrl: null, previewFile: null };
  }

  try {
    const { frontmatter } = await readNodeFrontmatterContent(nodeRelativePath);
    const previewRaw = getYamlScalar(frontmatter, "awn-preview");
    return await resolveAwnPreviewFieldMeta(nodeRelativePath, previewRaw);
  } catch {
    return { hasPreview: false, previewUrl: null, previewFile: null };
  }
}

function inferCategoryFromNodePath(nodeRelPath) {
  const parts = stripAgentContentPrefixFromRelPath(nodeRelPath).split("/").filter(Boolean);
  if (parts.length <= 1) return "Корень";
  return parts[0];
}

function extractCategoryFromProps(content, nodeRelPath) {
  const text = String(content || "");
  for (const key of ["category", "domain", "group", "section"]) {
    const match = text.match(new RegExp(`^${key}:\\s*["']?([^"'\\n#]+)["']?\\s*$`, "im"));
    if (match) return match[1].trim();
  }
  return inferCategoryFromNodePath(nodeRelPath);
}

function extractStatusFromProps(content) {
  const props = parseFrontmatterProps(content);
  const fromProps = getFrontmatterPropValue(props, "awn-status");
  if (fromProps) return fromProps;
  const scalar = getYamlScalar(content, "awn-status");
  return scalar || null;
}

function extractOwnerFromProps(content) {
  const props = parseFrontmatterProps(content);
  const fromProps = getFrontmatterPropValue(props, "awn-owner");
  if (fromProps) return fromProps;
  return getYamlScalar(content, "awn-owner") || null;
}

function extractPriorityFromProps(content) {
  const props = parseFrontmatterProps(content);
  const fromProps = getFrontmatterPropValue(props, "awn-priority");
  if (fromProps) return fromProps;
  return getYamlScalar(content, "awn-priority") || null;
}

async function getAgentCatalogLookupMaps() {
  const serviceFolder = getAgentKitFolder();
  if (!serviceFolder) return null;
  try {
    const serviceAbsolute = await resolveAgentSubfolderAbsolute(getAgentRoot(), serviceFolder);
    return getCatalogLookupMaps(getProjectRoot(), serviceAbsolute);
  } catch {
    return null;
  }
}

async function getAgentCatalogsPayload() {
  if (isPlatformAgentId(getActiveAgentId())) {
    return getMergedCatalogsPayload(getProjectRoot(), null, { globalOnly: true });
  }
  const agentRoot = getAgentRoot();
  const sharedFolder = getAgentSharedFolder();
  const serviceFolder = getAgentKitFolder();
  let catalogAbsolute = null;

  if (sharedFolder) {
    const sharedTaxonomiesAbsolute = path.join(agentRoot, sharedFolder, WORKSPACE_TAXONOMY_FOLDER);
    try {
      await fs.access(sharedTaxonomiesAbsolute);
      catalogAbsolute = sharedTaxonomiesAbsolute;
    } catch {
      // fall through to legacy kit folder
    }
  }

  if (!catalogAbsolute && serviceFolder) {
    catalogAbsolute = await resolveAgentSubfolderAbsolute(agentRoot, serviceFolder);
  }

  return getMergedCatalogsPayload(getProjectRoot(), catalogAbsolute);
}

async function readNodeDisplayLabelForManifestRel(manifestRel) {
  const normalized = String(manifestRel || "").replace(/\\/g, "/");
  const slug = getManifestSlugFromRel(normalized);
  try {
    const { frontmatter } = await readNodeFrontmatterContent(normalized);
    return resolveNodeDisplayName(getYamlScalar(frontmatter, "awn-name") || "", slug);
  } catch {
    return slug;
  }
}

async function resolveFolderDisplayTitle(dirAbsolute, relativePath, child = null) {
  const slug = stripTopicPrefix(path.posix.basename(String(relativePath || "").replace(/\\/g, "/"))) ||
    path.posix.basename(String(relativePath || "").replace(/\\/g, "/"));
  let manifestRel = child?.indexPath || null;
  if (!manifestRel) {
    const areaBasename = await resolveExistingAreaManifestBasename(dirAbsolute);
    if (areaBasename) {
      manifestRel = path.join(relativePath, areaBasename).replace(/\\/g, "/");
    }
  }
  if (manifestRel) {
    return readNodeDisplayLabelForManifestRel(manifestRel);
  }
  return slug;
}

async function readNodeMenuMetaForNodeRel(nodeRelPath) {
  try {
    const { frontmatter } = await readNodeFrontmatterContent(nodeRelPath);
    const awnEmoji = getYamlScalar(frontmatter, "awn-emoji");
    const runtime = extractRuntimePropsFromFrontmatter(frontmatter);
    return {
      color: extractColorFromPropsYaml(frontmatter),
      tags: extractTagsFromProps(frontmatter),
      category: extractCategoryFromProps(frontmatter, nodeRelPath),
      status: extractStatusFromProps(frontmatter),
      owner: extractOwnerFromProps(frontmatter),
      priority: extractPriorityFromProps(frontmatter),
      awnEmoji: awnEmoji || null,
      runtimeCron: runtime.runtimeCron,
      runtimeCronSchedule: runtime.runtimeCronSchedule,
      runtimeHeartbeat: runtime.runtimeHeartbeat,
      runtimeLoadAlways: runtime.runtimeLoadAlways,
      runtimeCommands: runtime.runtimeCommands
    };
  } catch {
    return {
      color: null,
      tags: [],
      category: inferCategoryFromNodePath(nodeRelPath),
      status: null,
      owner: null,
      priority: null,
      awnEmoji: null,
      runtimeCron: false,
      runtimeCronSchedule: "",
      runtimeHeartbeat: false,
      runtimeLoadAlways: false,
      runtimeCommands: false
    };
  }
}

function enrichMenuTreeRuntimeRollup(node) {
  if (!node || typeof node !== "object") {
    return { runtimeCron: false, runtimeHeartbeat: false, runtimeCronSchedule: "" };
  }

  const selfCron = Boolean(node.runtimeCron);
  const selfHeartbeat = Boolean(node.runtimeHeartbeat);
  const selfSchedule = String(node.runtimeCronSchedule || "").trim();

  let runtimeCron = selfCron;
  let runtimeHeartbeat = selfHeartbeat;

  for (const item of node.items || []) {
    const rolled = enrichMenuTreeRuntimeRollup(item);
    if (rolled.runtimeCron) runtimeCron = true;
    if (rolled.runtimeHeartbeat) runtimeHeartbeat = true;
  }

  for (const section of node.sections || []) {
    const rolled = enrichMenuTreeRuntimeRollup(section);
    if (rolled.runtimeCron) runtimeCron = true;
    if (rolled.runtimeHeartbeat) runtimeHeartbeat = true;
  }

  for (const nestedKey of ["containerTree", "sharedTree", "serviceTree", "systemTree"]) {
    if (node[nestedKey]) {
      const rolled = enrichMenuTreeRuntimeRollup(node[nestedKey]);
      if (rolled.runtimeCron) runtimeCron = true;
      if (rolled.runtimeHeartbeat) runtimeHeartbeat = true;
    }
  }

  node.runtimeCronSelf = selfCron;
  node.runtimeHeartbeatSelf = selfHeartbeat;
  node.runtimeCron = runtimeCron;
  node.runtimeHeartbeat = runtimeHeartbeat;
  node.runtimeCronSchedule = selfSchedule;

  return { runtimeCron, runtimeHeartbeat, runtimeCronSchedule: selfSchedule };
}

async function readNodePropsColorForNodeRel(nodeRelPath) {
  const meta = await readNodeMenuMetaForNodeRel(nodeRelPath);
  return meta.color;
}

async function readNodeHasOwnSchemaLayerForMenu(nodeRelPath) {
  const normalized = String(nodeRelPath || "").replace(/\\/g, "/");
  if (await isWorkspaceRootManifestRel(normalized)) {
    return topicSchemaHasFields(readWorkspaceLayerAwnSchema(getAgentRoot()));
  }
  try {
    const configFile = await readNodeConfigFile(normalized);
    return readNodeHasOwnSchemaLayer(normalized, getAgentRoot(), configFile.content || "");
  } catch {
    return false;
  }
}

function enrichMenuTreeSchemaRollup(node) {
  if (!node || typeof node !== "object") {
    return { hasCustomSchema: false };
  }

  let hasCustomSchema = Boolean(node.hasCustomSchema);

  for (const item of node.items || []) {
    const rolled = enrichMenuTreeSchemaRollup(item);
    if (rolled.hasCustomSchema) hasCustomSchema = true;
  }

  for (const section of node.sections || []) {
    const rolled = enrichMenuTreeSchemaRollup(section);
    if (rolled.hasCustomSchema) hasCustomSchema = true;
  }

  for (const nestedKey of ["containerTree", "sharedTree", "serviceTree", "systemTree"]) {
    if (node[nestedKey]) {
      const rolled = enrichMenuTreeSchemaRollup(node[nestedKey]);
      if (rolled.hasCustomSchema) hasCustomSchema = true;
    }
  }

  node.hasCustomSchemaSelf = Boolean(node.hasCustomSchema);
  node.hasCustomSchema = hasCustomSchema;
  return { hasCustomSchema };
}

async function enrichMenuNodeItem(nodeRelPath, options = {}) {
  const normalizedPath = String(nodeRelPath || "").replace(/\\/g, "/");
  const cache = options.menuMetaCache;
  if (cache?.has(normalizedPath)) {
    return cache.get(normalizedPath);
  }
  const [meta, previewMeta, menuMeta, hasCustomSchema] = await Promise.all([
    readNodeMenuMetaForNodeRel(normalizedPath),
    getNodePreviewMeta(normalizedPath),
    readManifestMenuMeta(normalizedPath),
    readNodeHasOwnSchemaLayerForMenu(normalizedPath)
  ]);
  const result = {
    color: meta.color,
    tags: meta.tags,
    category: meta.category,
    status: meta.status || null,
    awnEmoji: meta.awnEmoji || null,
    awnTreeType: menuMeta.type || null,
    runtimeCron: Boolean(meta.runtimeCron),
    runtimeCronSchedule: String(meta.runtimeCronSchedule || "").trim(),
    runtimeHeartbeat: Boolean(meta.runtimeHeartbeat),
    runtimeLoadAlways: Boolean(meta.runtimeLoadAlways),
    runtimeCommands: Boolean(meta.runtimeCommands),
    hasCustomSchema: Boolean(hasCustomSchema),
    ...previewMeta
  };
  cache?.set(normalizedPath, result);
  return result;
}

async function readMenuSortOrder(dirAbsolute) {
  const sortPath = path.join(dirAbsolute, MENU_SORT_FILE);
  try {
    const content = await fs.readFile(sortPath, "utf-8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.order)) {
      return parsed.order
        .map((name) => String(name || "").trim())
        .filter(Boolean);
    }
    if (Array.isArray(parsed)) {
      return parsed.map((name) => String(name || "").trim()).filter(Boolean);
    }
    return null;
  } catch {
    return null;
  }
}

function getMenuSortSlugFromFolderRel(folderRel) {
  const normalized = String(folderRel || "").replace(/\\/g, "/").trim();
  if (!normalized || normalized === ".") return "";
  return stripTopicPrefix(path.posix.basename(normalized));
}

async function appendMenuSortOrderEntry(dirAbsolute, sortKey) {
  const key = String(sortKey || "").trim();
  if (!key || !dirAbsolute) return;
  const order = [...((await readMenuSortOrder(dirAbsolute)) || [])];
  if (order.includes(key)) return;
  order.push(key);
  const sortPath = path.join(dirAbsolute, MENU_SORT_FILE);
  await fs.writeFile(sortPath, `${JSON.stringify({ order }, null, 2)}\n`, "utf-8");
}

async function updateMenuSortOrderSlug(dirAbsolute, oldSlug, newSlug, legacyKeys = []) {
  const oldKey = String(oldSlug || "").trim();
  const newKey = String(newSlug || "").trim();
  if (!dirAbsolute || !newKey || oldKey === newKey) return;

  const order = await readMenuSortOrder(dirAbsolute);
  if (!order?.length) return;

  const replaceKeys = new Set(
    [oldKey, ...legacyKeys.map((key) => String(key || "").trim())].filter(Boolean)
  );
  if (!replaceKeys.size) return;

  let changed = false;
  const nextOrder = order.map((entry) => {
    const key = String(entry || "").trim();
    if (replaceKeys.has(key)) {
      changed = true;
      return newKey;
    }
    return key;
  });
  if (!changed) return;

  const seen = new Set();
  const dedupedOrder = nextOrder.filter((key) => {
    const normalized = String(key || "").trim();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });

  const sortPath = path.join(dirAbsolute, MENU_SORT_FILE);
  await fs.writeFile(sortPath, `${JSON.stringify({ order: dedupedOrder }, null, 2)}\n`, "utf-8");
}

async function resolveExistingWorkspaceDirAbsolute(folderPathRaw) {
  return resolveWorkspaceDirAbsoluteSimple(folderPathRaw);
}

async function resolveAgentRootSortDirAbsolute() {
  return getAgentRoot();
}

async function resolveSortFolderAbsolute(folderPathRaw) {
  if (!folderPathRaw || folderPathRaw === ".") {
    return resolveAgentRootSortDirAbsolute();
  }
  return resolveExistingWorkspaceDirAbsolute(folderPathRaw);
}

async function collectPartNodeItems(partsDirAbsolute, relativePrefix, files) {
  let entries = [];
  try {
    entries = await fs.readdir(partsDirAbsolute, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || isStorageFolderName(entry.name)) continue;
    const partDirAbsolute = path.join(partsDirAbsolute, entry.name);
    const manifestRel = await resolveExistingNodeManifestRel(
      partDirAbsolute,
      path.join(relativePrefix, PARTS_FOLDER, entry.name).replace(/\\/g, "/")
    );
    if (!manifestRel) continue;
    const relativePath = manifestRel.replace(/\\/g, "/");
    files.push({
      label: await readNodeDisplayLabelForManifestRel(relativePath),
      path: relativePath,
      ...(await enrichMenuNodeItem(relativePath))
    });
  }

  for (const entry of entries) {
    if (!entry.isFile() || !isTopicManifestFileName(entry.name)) continue;
    const fullPath = path.join(partsDirAbsolute, entry.name);
    const relativePath = path.join(relativePrefix, PARTS_FOLDER, entry.name).replace(/\\/g, "/");
    files.push({
      label: await readNodeDisplayLabelForManifestRel(relativePath),
      path: relativePath,
      ...(await enrichMenuNodeItem(relativePath))
    });
  }
}

async function folderHasGitRepo(dirAbsolute) {
  try {
    await fs.access(path.join(dirAbsolute, ".git"));
    return true;
  } catch {
    return false;
  }
}

const GIT_STATUS_LABELS = {
  staged: "В индексе",
  modified: "Изменено",
  untracked: "Неотслеживаемые",
  deleted: "Удалено",
  renamed: "Переименовано",
  conflict: "Конфликт"
};

function classifyGitPorcelainEntry(indexStatus, workTreeStatus) {
  if (indexStatus === "?" && workTreeStatus === "?") return "untracked";
  if (indexStatus === "U" || workTreeStatus === "U" || indexStatus === "A" && workTreeStatus === "A") {
    return "conflict";
  }
  if (indexStatus === "R") return "renamed";
  if (indexStatus === "D" || workTreeStatus === "D") return "deleted";
  if (indexStatus && indexStatus !== " " && indexStatus !== "?") return "staged";
  if (workTreeStatus && workTreeStatus !== " " && workTreeStatus !== "?") return "modified";
  return "modified";
}

function parseGitStatusPorcelain(rawOutput) {
  const lines = String(rawOutput || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  let branch = "";
  let upstream = "";
  let ahead = 0;
  let behind = 0;
  const changes = [];

  for (const line of lines) {
    if (line.startsWith("##")) {
      const header = line.slice(2).trim();
      const branchMatch = header.match(/^([^.\s]+(?:\.[^.\s]+)*?)(?:\.\.\.([^ \[]+))?(?:\s+\[(.+)\])?$/);
      if (branchMatch) {
        branch = branchMatch[1] || "";
        upstream = branchMatch[2] || "";
        const flags = branchMatch[3] || "";
        const aheadMatch = flags.match(/ahead (\d+)/);
        const behindMatch = flags.match(/behind (\d+)/);
        ahead = aheadMatch ? Number(aheadMatch[1]) : 0;
        behind = behindMatch ? Number(behindMatch[1]) : 0;
      } else {
        branch = header.split("...")[0] || header;
      }
      continue;
    }

    const indexStatus = line[0] || " ";
    const workTreeStatus = line[1] || " ";
    const rawPath = line.slice(3).trim();
    if (!rawPath) continue;

    let filePath = rawPath;
    let oldPath = "";
    if (rawPath.includes("->")) {
      const parts = rawPath.split("->").map((part) => part.trim());
      oldPath = parts[0] || "";
      filePath = parts[1] || parts[0] || "";
    }

    const kind = classifyGitPorcelainEntry(indexStatus, workTreeStatus);
    changes.push({
      path: filePath.replace(/\\/g, "/"),
      oldPath: oldPath.replace(/\\/g, "/"),
      indexStatus,
      workTreeStatus,
      kind,
      label: GIT_STATUS_LABELS[kind] || kind
    });
  }

  return { branch, upstream, ahead, behind, changes };
}

function parseGitLogOneline(rawOutput) {
  return String(rawOutput || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^([0-9a-f]+)\|([^|]+)\|([^|]*)\|([^|]*)\|(.*)$/);
      if (!match) {
        return { hash: line.slice(0, 7), shortHash: line.slice(0, 7), subject: line, when: "", author: "" };
      }
      return {
        hash: match[1],
        shortHash: match[2],
        subject: match[3],
        when: match[4],
        author: match[5]
      };
    });
}

async function runGitInRepo(repoAbsolute, args) {
  const { stdout } = await execFileAsync("git", ["-C", repoAbsolute, ...args], {
    maxBuffer: 4 * 1024 * 1024
  });
  return String(stdout || "");
}

async function resolveAgentRootGitRepoAbsolute() {
  const agentRoot = getAgentRoot();
  if (await folderHasGitRepo(agentRoot)) {
    return agentRoot;
  }
  return null;
}

const LARGE_FILE_DEFAULT_MIN_BYTES = 45 * 1024 * 1024;
const LARGE_FILE_SCAN_SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  ".obsidian",
  "vendor",
  ".cache",
  "__pycache__",
  ".venv",
  "venv"
]);

function shouldSkipLargeFileScanDirectory(name) {
  const lower = String(name || "").toLowerCase();
  if (LARGE_FILE_SCAN_SKIP_DIRS.has(lower)) return true;
  if (isHiddenMenuEntry(name)) return true;
  return false;
}

function formatBytesLabel(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function collectLargeFilesInDir(dirAbsolute, prefix, minBytes, results) {
  let entries = [];
  try {
    entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const absolute = path.join(dirAbsolute, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      if (shouldSkipLargeFileScanDirectory(entry.name)) continue;
      await collectLargeFilesInDir(absolute, relative, minBytes, results);
      continue;
    }

    if (!entry.isFile()) continue;

    try {
      const stat = await fs.stat(absolute);
      if (stat.size >= minBytes) {
        results.push({ path: relative, size: stat.size });
      }
    } catch {
      // skip unreadable files
    }
  }
}

async function buildAgentLargeFilesReport(minBytes = LARGE_FILE_DEFAULT_MIN_BYTES) {
  const agentRoot = getAgentRoot();
  const results = [];
  await collectLargeFilesInDir(agentRoot, "", minBytes, results);
  results.sort((left, right) => right.size - left.size || left.path.localeCompare(right.path));
  const totalSize = results.reduce((sum, item) => sum + item.size, 0);
  return {
    threshold: minBytes,
    thresholdMb: minBytes / (1024 * 1024),
    count: results.length,
    totalSize,
    totalSizeLabel: formatBytesLabel(totalSize),
    files: results.map((item) => ({
      path: item.path,
      size: item.size,
      sizeLabel: formatBytesLabel(item.size)
    }))
  };
}

async function collectWorkspaceStatsInDir(dirAbsolute, stats) {
  let entries = [];
  try {
    entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const absolute = path.join(dirAbsolute, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipLargeFileScanDirectory(entry.name)) continue;
      stats.folderCount += 1;
      await collectWorkspaceStatsInDir(absolute, stats);
      continue;
    }

    if (!entry.isFile()) continue;

    try {
      const stat = await fs.stat(absolute);
      stats.totalBytes += stat.size;
      stats.fileCount += 1;
    } catch {
      // skip unreadable files
    }
  }
}

async function buildAgentWorkspaceStats() {
  const agentRoot = getAgentRoot();
  const stats = { totalBytes: 0, fileCount: 0, folderCount: 0 };
  await collectWorkspaceStatsInDir(agentRoot, stats);
  return {
    totalBytes: stats.totalBytes,
    totalSizeLabel: formatBytesLabel(stats.totalBytes),
    fileCount: stats.fileCount,
    folderCount: stats.folderCount
  };
}

async function collectDirBytes(dirAbsolute, stats = { totalBytes: 0, fileCount: 0 }) {
  let entries = [];
  try {
    entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
  } catch {
    return stats;
  }

  for (const entry of entries) {
    const absolute = path.join(dirAbsolute, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipLargeFileScanDirectory(entry.name)) continue;
      await collectDirBytes(absolute, stats);
      continue;
    }
    if (!entry.isFile()) continue;
    try {
      const stat = await fs.stat(absolute);
      stats.totalBytes += stat.size;
      stats.fileCount += 1;
    } catch {
      // skip unreadable files
    }
  }

  return stats;
}

function isTopicDirInsideAreaDir(topicContainerDir, areaContainerDir) {
  const topicDir = String(topicContainerDir || "").replace(/\\/g, "/");
  const areaDir = String(areaContainerDir || "").replace(/\\/g, "/");
  if (!topicDir) return false;
  if (!areaDir) return true;
  if (topicDir === areaDir) return false;
  return topicDir.startsWith(`${areaDir}/`);
}

async function buildAgentTopicSizeReport() {
  const menu = await buildAgentMenu(getAgentRoot());
  const entries = collectAllMenuManifestEntries(menu);
  const topics = [];

  for (const entry of entries) {
    if (entry.kind !== "topic") continue;
    const manifestPath = String(entry.manifestPath || "").replace(/\\/g, "/");
    const containerDir = getManifestContainerDirRel(manifestPath);
    const absolute = normalizeWorkspacePath(containerDir);
    const stats = { totalBytes: 0, fileCount: 0 };
    if (absolute) await collectDirBytes(absolute, stats);
    topics.push({
      manifestPath,
      label: String(entry.label || getManifestNamedSlotKey(manifestPath) || "").trim(),
      containerDir,
      bytes: stats.totalBytes,
      fileCount: stats.fileCount,
      sizeLabel: formatBytesLabel(stats.totalBytes)
    });
  }

  const byPath = {};
  for (const topic of topics) {
    byPath[topic.manifestPath] = {
      kind: "topic",
      bytes: topic.bytes,
      sizeLabel: topic.sizeLabel,
      fileCount: topic.fileCount
    };
  }

  for (const entry of entries) {
    if (entry.kind !== "area") continue;
    const manifestPath = String(entry.manifestPath || "").replace(/\\/g, "/");
    const areaDir = getManifestContainerDirRel(manifestPath);
    let bytes = 0;
    let topicCount = 0;
    for (const topic of topics) {
      if (!isTopicDirInsideAreaDir(topic.containerDir, areaDir)) continue;
      bytes += topic.bytes;
      topicCount += 1;
    }
    byPath[manifestPath] = {
      kind: "area",
      bytes,
      sizeLabel: formatBytesLabel(bytes),
      topicCount
    };
  }

  const ranking = topics
    .slice()
    .sort((left, right) => right.bytes - left.bytes || left.label.localeCompare(right.label, "ru"))
    .map((topic) => ({
      manifestPath: topic.manifestPath,
      label: topic.label || getManifestNamedSlotKey(topic.manifestPath),
      bytes: topic.bytes,
      sizeLabel: topic.sizeLabel
    }));

  const totalTopicBytes = topics.reduce((sum, topic) => sum + topic.bytes, 0);

  return {
    byPath,
    ranking,
    topicCount: topics.length,
    totalTopicBytes,
    totalTopicSizeLabel: formatBytesLabel(totalTopicBytes)
  };
}

async function buildAgentGitStatus() {
  const agentRoot = getAgentRoot();
  const repoAbsolute = await resolveAgentRootGitRepoAbsolute();
  if (!repoAbsolute) {
    return {
      isRepo: false,
      missingRootRepo: true,
      repoPath: null,
      repoRel: null,
      branch: "",
      upstream: "",
      ahead: 0,
      behind: 0,
      clean: true,
      changes: [],
      commits: [],
      counts: { total: 0, staged: 0, modified: 0, untracked: 0, deleted: 0, renamed: 0, conflict: 0 }
    };
  }

  const repoRel = path.relative(agentRoot, repoAbsolute).replace(/\\/g, "/") || ".";

  try {
    const [statusRaw, logRaw] = await Promise.all([
      runGitInRepo(repoAbsolute, ["status", "--porcelain=v1", "-b", "--untracked-files=all"]),
      runGitInRepo(repoAbsolute, ["log", "-8", "--format=%H|%h|%s|%cr|%an"]).catch(() => "")
    ]);

    const parsed = parseGitStatusPorcelain(statusRaw);
    const commits = parseGitLogOneline(logRaw);
    const counts = {
      total: parsed.changes.length,
      staged: parsed.changes.filter((item) => item.kind === "staged").length,
      modified: parsed.changes.filter((item) => item.kind === "modified").length,
      untracked: parsed.changes.filter((item) => item.kind === "untracked").length,
      deleted: parsed.changes.filter((item) => item.kind === "deleted").length,
      renamed: parsed.changes.filter((item) => item.kind === "renamed").length,
      conflict: parsed.changes.filter((item) => item.kind === "conflict").length
    };

    return {
      isRepo: true,
      repoPath: repoAbsolute,
      repoRel,
      branch: parsed.branch,
      upstream: parsed.upstream,
      ahead: parsed.ahead,
      behind: parsed.behind,
      clean: parsed.changes.length === 0,
      changes: parsed.changes,
      commits,
      counts
    };
  } catch (error) {
    return {
      isRepo: true,
      repoPath: repoAbsolute,
      repoRel,
      branch: "",
      upstream: "",
      ahead: 0,
      behind: 0,
      clean: true,
      changes: [],
      commits: [],
      counts: { total: 0, staged: 0, modified: 0, untracked: 0, deleted: 0, renamed: 0, conflict: 0 },
      error: String(error?.message || error)
    };
  }
}

async function folderHasObsidianVault(dirAbsolute) {
  return existsDirectory(path.join(dirAbsolute, ".obsidian"));
}

async function folderHasAgentManifest(dirAbsolute) {
  return isWorkspaceReginfoAtPath(dirAbsolute);
}

async function readFolderWorkspaceMarkers(dirAbsolute) {
  const [hasGitSelf, hasObsidianSelf, hasAgentSelf] = await Promise.all([
    folderHasGitRepo(dirAbsolute),
    folderHasObsidianVault(dirAbsolute),
    folderHasAgentManifest(dirAbsolute)
  ]);
  return { hasGitSelf, hasObsidianSelf, hasAgentSelf };
}

function withMenuFolderWorkspaceMarkers(markers) {
  return {
    ...markers,
    hasGit: Boolean(markers?.hasGitSelf),
    hasObsidian: Boolean(markers?.hasObsidianSelf),
    hasAgent: Boolean(markers?.hasAgentSelf)
  };
}

async function resolveWorkspaceDirAbsoluteSimple(folderPathRaw) {
  const normalized = String(folderPathRaw || "").replace(/\\/g, "/").trim();
  if (!normalized || normalized === ".") return getAgentRoot();
  const absolute = normalizeWorkspacePath(normalized);
  if (absolute && (await dirExists(absolute))) return absolute;
  return normalizeWorkspacePath(normalized);
}

async function resolveGitRepoRootForMenuPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").trim() || ".";
  const parts = normalized === "." ? [] : normalized.split("/").filter(Boolean);
  for (let len = parts.length; len >= 0; len -= 1) {
    const prefix = len === 0 ? "." : parts.slice(0, len).join("/");
    const absolute = await resolveWorkspaceDirAbsoluteSimple(prefix);
    if (absolute && (await folderHasGitRepo(absolute))) {
      return { absolute, rel: prefix };
    }
  }
  return null;
}

function isAgentContainerNodePath(relPath) {
  const containerFolder = getAgentContainerFolder();
  if (!containerFolder) return false;
  const normalized = String(relPath || "").replace(/\\/g, "/").trim() || ".";
  const containerLower = containerFolder.toLowerCase();
  const normalizedLower = normalized.toLowerCase();
  return normalizedLower === containerLower || normalizedLower.startsWith(`${containerLower}/`);
}

function isMenuPathInsideGitRepoContainer(relPath, gitRepoRootRel = ".") {
  const containerFolder = getAgentContainerFolder();
  if (!containerFolder) return false;
  const normalized = String(relPath || "").replace(/\\/g, "/").trim() || ".";
  const gitRoot = gitRepoRootRel === "." ? "" : String(gitRepoRootRel || "").replace(/\\/g, "/").replace(/\/$/, "");

  if (!gitRoot) {
    return normalized === containerFolder || normalized.startsWith(`${containerFolder}/`);
  }
  if (normalized === gitRoot) return false;
  if (normalized === `${gitRoot}/${containerFolder}`) return true;
  if (normalized.startsWith(`${gitRoot}/${containerFolder}/`)) return true;
  return false;
}

async function appendGitRepoContainerRelCandidates(candidates, normalized, seen) {
  const gitRoot = await resolveGitRepoRootForMenuPath(normalized);
  if (!gitRoot) return;

  const containerFolder = getAgentContainerFolder();
  if (!containerFolder) return;

  const norm = String(normalized || "").replace(/\\/g, "/").trim() || ".";
  const gitRootRel = gitRoot.rel === "." ? "" : gitRoot.rel;
  const gitRootPrefix = gitRootRel || ".";

  const pushCandidate = (value) => {
    const candidate = String(value || "").replace(/\\/g, "/").trim();
    if (!candidate || seen.has(candidate)) return;
    seen.add(candidate);
    candidates.push(candidate);
  };

  if (norm === gitRootPrefix || (gitRootPrefix === "." && norm === ".")) {
    const nestedRel = gitRootRel ? `${gitRootRel}/${containerFolder}` : containerFolder;
    pushCandidate(nestedRel);
    return;
  }

  if (gitRootRel && !norm.startsWith(`${gitRootRel}/`)) return;
  const tail = gitRootRel ? norm.slice(gitRootRel.length + 1) : norm;
  if (!tail || tail === containerFolder || tail.startsWith(`${containerFolder}/`)) return;

  const nestedRel = gitRootRel ? `${gitRootRel}/${containerFolder}/${tail}` : `${containerFolder}/${tail}`;
  pushCandidate(nestedRel);
}

async function resolveGitRepoCreateParentPath(parentPathResolved) {
  const normalized = String(parentPathResolved || ".").replace(/\\/g, "/").trim() || ".";
  if (isServiceNodePath(normalized)) {
    return parentPathResolved;
  }

  const containerFolder = getAgentContainerFolder();
  if (!containerFolder) return parentPathResolved;

  const gitRoot = await resolveGitRepoRootForMenuPath(normalized);
  if (gitRoot) {
    const gitRootRel = gitRoot.rel === "." ? "" : gitRoot.rel;
    const nestedContainerRel = gitRootRel
      ? `${gitRootRel}/${containerFolder}`.replace(/\\/g, "/")
      : containerFolder;

    const nestedAbsolute = path.join(getAgentRoot(), nestedContainerRel);
    if (await dirExists(nestedAbsolute)) {
      if (isMenuPathInsideGitRepoContainer(normalized, gitRoot.rel)) {
        return parentPathResolved;
      }

      const gitRootPrefix = gitRootRel || ".";
      if (normalized === gitRootPrefix || (gitRootPrefix === "." && normalized === ".")) {
        return nestedContainerRel;
      }

      if (gitRootRel && normalized.startsWith(`${gitRootRel}/`)) {
        const tail = normalized.slice(gitRootRel.length + 1);
        if (tail && tail !== containerFolder && !tail.startsWith(`${containerFolder}/`)) {
          return `${nestedContainerRel}/${tail}`.replace(/\\/g, "/");
        }
      }
    }
  }

  if (isAgentContainerNodePath(normalized)) {
    return parentPathResolved;
  }

  return parentPathResolved;
}

function isGitRepoRootServiceLooseFile(name) {
  const base = String(name || "");
  if (!base || base === MENU_SORT_FILE || isAreaManifestFileName(base)) {
    return false;
  }
  return true;
}

async function isGitRepoLooseFileRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").trim();
  if (!normalized || normalized === ".") return false;
  const base = path.posix.basename(normalized);
  if (!base || base === MENU_SORT_FILE || isAreaManifestFileName(base)) return false;

  const gitRoot = await resolveGitRepoRootForMenuPath(normalized);
  if (!gitRoot) return false;

  const parentRel = path.posix.dirname(normalized).replace(/\\/g, "/");
  const gitRootRel = String(gitRoot.rel || ".").replace(/\\/g, "/");
  return parentRel === gitRootRel;
}

function isServiceNodePath(relPath) {
  const serviceFolder = getAgentKitFolder();
  if (!serviceFolder) return false;
  const normalized = String(relPath || "").replace(/\\/g, "/").trim() || ".";
  const serviceLower = serviceFolder.toLowerCase();
  const normalizedLower = normalized.toLowerCase();
  return normalizedLower === serviceLower || normalizedLower.startsWith(`${serviceLower}/`);
}

function getServiceRootManifestRel() {
  const serviceFolder = getAgentKitFolder();
  return serviceFolder ? getServiceAreaManifestRel(serviceFolder) : null;
}

function isContainerAreaRootManifestRel(relPath) {
  const containerFolder = getAgentContainerFolder();
  if (!containerFolder) return false;
  const containerRoot = `${containerFolder}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/");
  return String(relPath || "").replace(/\\/g, "/") === containerRoot;
}

function isServiceAreaRootManifestRel(relPath) {
  const serviceRoot = getServiceRootManifestRel();
  if (!serviceRoot) return false;
  return String(relPath || "").replace(/\\/g, "/") === serviceRoot.replace(/\\/g, "/");
}

async function buildMenuFolderShellAtDepthLimit(fullPath, relativePath, markers, options = {}) {
  const areaBasename = await resolveExistingAreaManifestBasename(fullPath);
  const indexPath = areaBasename
    ? path.join(relativePath, areaBasename).replace(/\\/g, "/")
    : null;
  const folderTitle = indexPath
    ? await readNodeDisplayLabelForManifestRel(indexPath)
    : await resolveFolderDisplayTitle(fullPath, relativePath, null);

  const shell = {
    title: folderTitle,
    folderPath: relativePath,
    menuDepthLimited: true,
    indexPath,
    sections: [],
    items: [],
    menuOrder: await readMenuSortOrder(fullPath),
    color: null,
    tags: [],
    category: null,
    status: null,
    hasPreview: false,
    previewUrl: null,
    ...markers,
    hasGit: markers.hasGitSelf,
    hasObsidian: markers.hasObsidianSelf,
    hasAgent: markers.hasAgentSelf,
    hasGitSelf: markers.hasGitSelf,
    hasObsidianSelf: markers.hasObsidianSelf,
    hasAgentSelf: markers.hasAgentSelf
  };

  if (indexPath) {
    const indexMeta = await enrichMenuNodeItem(indexPath, options);
    shell.color = indexMeta.color;
    shell.tags = indexMeta.tags || [];
    shell.category = indexMeta.category || null;
    shell.status = indexMeta.status || null;
    shell.hasPreview = indexMeta.hasPreview;
    shell.previewUrl = indexMeta.previewUrl;
    shell.runtimeCron = Boolean(indexMeta.runtimeCron);
    shell.runtimeCronSchedule = String(indexMeta.runtimeCronSchedule || "").trim();
    shell.runtimeHeartbeat = Boolean(indexMeta.runtimeHeartbeat);
    shell.runtimeLoadAlways = Boolean(indexMeta.runtimeLoadAlways);
    shell.runtimeCommands = Boolean(indexMeta.runtimeCommands);
    shell.runtimeCronSelf = shell.runtimeCron;
    shell.runtimeHeartbeatSelf = shell.runtimeHeartbeat;
  }

  return shell;
}

async function listNodeMdFiles(dirPath, prefix = "", depth = 0, options = {}) {
  const maxDepth = Number.isFinite(options.maxDepth) ? options.maxDepth : null;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const folders = [];
  const files = [];
  const repoServiceFiles = [];
  let indexPath = null;
  let nestedContainerTree = null;

  const selfMarkers = await readFolderWorkspaceMarkers(dirPath);
  const isGitRepoRoot = selfMarkers.hasGitSelf;
  const isGitRepoRootMenu = isGitRepoRoot;

  for (const entry of entries) {
    if (isHiddenMenuEntry(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.join(prefix, entry.name).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      if (shouldSkipMenuDirectory(entry.name)) continue;
      if (isStorageFolderName(entry.name)) continue;
      if (isConfigurationFolderName(entry.name)) continue;

      if (isGitRepoRoot && prefix) {
        if (isPartsFolderName(entry.name)) {
          await collectPartNodeItems(fullPath, prefix, files);
          continue;
        }
        if (isKitFolderName(entry.name)) {
          continue;
        }
        if (isContainerFolderName(entry.name)) {
          const childDepth = depth + 1;
          if (maxDepth !== null && childDepth >= maxDepth) {
            nestedContainerTree = {
              ...(await buildMenuFolderShellAtDepthLimit(
                fullPath,
                relativePath,
                await readFolderWorkspaceMarkers(fullPath),
                options
              )),
              containerTree: null
            };
          } else {
            nestedContainerTree = await normalizeNestedContainerMenuTree(
              await listNodeMdFiles(fullPath, relativePath, childDepth, options),
              fullPath,
              relativePath
            );
          }
          continue;
        }
      }

      if (!prefix && (isKitFolderName(entry.name) || isSharedFolderName(entry.name) || isContainerFolderName(entry.name))) {
        continue;
      }
      if (isPartsFolderName(entry.name)) {
        await collectPartNodeItems(fullPath, prefix, files);
        continue;
      }

      const childDepth = depth + 1;
      if (maxDepth !== null && childDepth >= maxDepth) {
        const markers = await readFolderWorkspaceMarkers(fullPath);
        const shell = await buildMenuFolderShellAtDepthLimit(fullPath, relativePath, markers, options);
        if (await shouldRenderMenuChildAsTopicItem(shell)) {
          files.push({
            label: shell.title,
            path: shell.indexPath,
            ...(await enrichMenuNodeItem(shell.indexPath, options)),
            ...withMenuFolderWorkspaceMarkers(markers)
          });
        } else {
          folders.push({
            ...shell,
            ...withMenuFolderWorkspaceMarkers(markers)
          });
        }
        continue;
      }

      const child = await listNodeMdFiles(fullPath, relativePath, childDepth, options);
      if (child.indexPath && !(await isTreeMenuManifestRel(child.indexPath))) {
        child.indexPath = null;
      }
      const hasNodes = Boolean(
        child.indexPath ||
        child.items.length > 0 ||
        child.sections.length > 0 ||
        child.containerTree ||
        (child.repoServiceItems || child.repoItems || []).length > 0
      );
      const markers = await readFolderWorkspaceMarkers(fullPath);

      const folderTitle = await resolveFolderDisplayTitle(fullPath, relativePath, child);

      if (hasNodes) {
        if (await shouldRenderMenuChildAsTopicItem(child)) {
          files.push({
            label: folderTitle,
            path: child.indexPath,
            ...(await enrichMenuNodeItem(child.indexPath, options)),
            ...withMenuFolderWorkspaceMarkers(markers)
          });
          continue;
        }

        folders.push({
          title: folderTitle,
          folderPath: relativePath,
          ...child,
          ...withMenuFolderWorkspaceMarkers(markers)
        });
        continue;
      }

      folders.push({
        title: folderTitle,
        folderPath: relativePath,
        empty: true,
        ...markers,
        hasGit: markers.hasGitSelf,
        hasObsidian: markers.hasObsidianSelf,
        hasAgent: markers.hasAgentSelf,
        hasGitSelf: markers.hasGitSelf,
        hasObsidianSelf: markers.hasObsidianSelf,
        hasAgentSelf: markers.hasAgentSelf,
        sections: [],
        items: [],
        indexPath: null,
        menuOrder: await readMenuSortOrder(fullPath)
      });
      continue;
    }

    if (entry.isFile() && isAreaManifestFileName(entry.name)) {
      continue;
    }

    if (entry.isFile() && isGitRepoRootMenu && isGitRepoRootServiceLooseFile(entry.name)) {
      const nodeRelPath = relativePath.replace(/\\/g, "/");
      const menuItem = {
        label: await readNodeDisplayLabelForManifestRel(nodeRelPath),
        path: nodeRelPath,
        ...(await enrichMenuNodeItem(nodeRelPath, options))
      };
      repoServiceFiles.push({ ...menuItem, menuScope: "repo-service" });
      continue;
    }
  }

  if (!prefix) {
    indexPath = await resolveRootAreaManifestRel(dirPath, prefix);
  } else {
    const areaBasename = await resolveExistingAreaManifestBasename(dirPath);
    if (areaBasename) {
      indexPath = path.join(prefix, areaBasename).replace(/\\/g, "/");
    }
  }

  if (indexPath && !(await isTreeMenuManifestRel(indexPath))) {
    indexPath = null;
  }

  folders.sort((a, b) => a.title.localeCompare(b.title, "ru"));
  files.sort((a, b) => a.label.localeCompare(b.label, "ru"));
  repoServiceFiles.sort((a, b) => a.label.localeCompare(b.label, "ru"));
  let menuOrder = await readMenuSortOrder(dirPath);

  let color = null;
  let tags = [];
  let category = null;
  let status = null;
  let hasPreview = false;
  let previewUrl = null;
  let runtimeCron = false;
  let runtimeCronSchedule = "";
  let runtimeHeartbeat = false;
  let runtimeLoadAlways = false;
  let runtimeCommands = false;
  if (indexPath) {
    const indexMeta = await enrichMenuNodeItem(indexPath, options);
    color = indexMeta.color;
    tags = indexMeta.tags || [];
    category = indexMeta.category || null;
    status = indexMeta.status || null;
    hasPreview = indexMeta.hasPreview;
    previewUrl = indexMeta.previewUrl;
    runtimeCron = Boolean(indexMeta.runtimeCron);
    runtimeCronSchedule = String(indexMeta.runtimeCronSchedule || "").trim();
    runtimeHeartbeat = Boolean(indexMeta.runtimeHeartbeat);
    runtimeLoadAlways = Boolean(indexMeta.runtimeLoadAlways);
    runtimeCommands = Boolean(indexMeta.runtimeCommands);
  }

  const baseNode = {
    sections: folders,
    items: files,
    repoItems: isGitRepoRootMenu ? repoServiceFiles : [],
    repoServiceItems: isGitRepoRootMenu ? repoServiceFiles : [],
    containerTree: nestedContainerTree || null,
    indexPath,
    menuOrder,
    color,
    tags,
    category,
    status,
    hasPreview,
    previewUrl,
    runtimeCron,
    runtimeCronSchedule,
    runtimeHeartbeat,
    runtimeLoadAlways,
    runtimeCommands,
    runtimeCronSelf: runtimeCron,
    runtimeHeartbeatSelf: runtimeHeartbeat,
    hasGit: selfMarkers.hasGitSelf,
    hasObsidian: selfMarkers.hasObsidianSelf,
    ...selfMarkers
  };

  if (isGitRepoRootMenu && prefix) {
    return enrichGitRepoMenuNode(baseNode, dirPath, prefix, options);
  }

  return baseNode;
}

function isSpaAppRoute(reqPath) {
  const normalized = String(reqPath || "/").replace(/\/+$/, "") || "/";
  if (normalized.startsWith("/a/")) return true;
  const firstSegment = normalized.split("/").filter(Boolean)[0];
  if (!firstSegment || isChpuReservedRootSegment(firstSegment)) return false;
  const agentId = decodeURIComponent(firstSegment);
  return getAgentsPublicList().some((agent) => agent.id === agentId);
}

async function serveIndexHtml(res) {
  const indexPath = path.join(getPublicDir(), "index.html");
  const content = await fs.readFile(indexPath);
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(content);
}

async function serveStatic(reqPath, res) {
  let normalizedPath = reqPath === "/shell" || reqPath === "/shell/" ? "/shell/index.html" : reqPath;
  if (normalizedPath.endsWith("/") && normalizedPath !== "/") {
    normalizedPath = `${normalizedPath}index.html`;
  }
  const targetPath = normalizedPath === "/" ? "/index.html" : normalizedPath;
  const safePath = path.normalize(targetPath).replace(/^(\.\.[\/\\])+/, "").replace(/^[/\\]+/, "");
  const filePath = path.join(getPublicDir(), safePath);

  if (!filePath.startsWith(getPublicDir())) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const content = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-store"
    });
    res.end(content);
  } catch {
    const ext = path.extname(safePath).toLowerCase();
    if (!ext || ext === ".html" || isSpaAppRoute(reqPath)) {
      try {
        await serveIndexHtml(res);
        return;
      } catch {
        // fall through to 404
      }
    }
    try {
      const notFoundHtmlPath = path.join(getPublicDir(), "404.html");
      const content = await fs.readFile(notFoundHtmlPath);
      res.writeHead(404, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end(content);
      return;
    } catch {
      // fall through to plain 404
    }
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

async function findNodePathInDirectory(dirAbsolute) {
  const relDir = path.relative(getAgentRoot(), dirAbsolute).replace(/\\/g, "/");
  const fromStorage = resolveNodePathFromStorageRel(relDir);
  if (fromStorage) {
    const nodeAbsolute = normalizeWorkspacePath(fromStorage);
    if (nodeAbsolute && (await nodePathExists(nodeAbsolute))) {
      return fromStorage.replace(/\\/g, "/");
    }
  }

  if (!relDir || relDir === ".") {
    const rootManifest = await resolveRootAreaManifestRel(dirAbsolute);
    if (rootManifest) return rootManifest;
  }

  const manifestCandidates = relDir
    ? AREA_MANIFEST_CANDIDATES.map((name) => `${relDir}/${name}`)
    : AREA_MANIFEST_CANDIDATES;
  for (const candidate of manifestCandidates) {
    if (await nodePathExists(normalizeWorkspacePath(candidate))) {
      return candidate.replace(/\\/g, "/");
    }
  }

  try {
    const entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !isStorageFolderName(entry.name) && !shouldSkipDirectoryListing(entry.name)) {
        const areaManifest = path.join(dirAbsolute, entry.name, AREA_MANIFEST_FILE);
        if (await nodePathExists(areaManifest)) {
          return relDir
            ? `${relDir}/${entry.name}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/")
            : `${entry.name}/${AREA_MANIFEST_FILE}`;
        }
      }
      if (entry.isFile() && isTopicManifestFileName(entry.name)) {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

const SEARCHABLE_TEXT_EXTENSIONS = new Set([
  ".md",
  ".yaml",
  ".yml",
  ".json",
  ".txt",
  ".csv"
]);

const SEARCHABLE_BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".ico",
  ".heic",
  ".avif",
  ".mp4",
  ".mov",
  ".mkv",
  ".avi",
  ".webm",
  ".m4v",
  ".mp3",
  ".wav",
  ".m4a",
  ".ogg",
  ".flac",
  ".aac",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz"
]);

function getSearchableFileExtension(name) {
  const base = path.posix.basename(String(name || "").replace(/\\/g, "/"));
  if (base.toLowerCase().endsWith(".sidecar.md")) return ".sidecar.md";
  return path.extname(base).toLowerCase();
}

function isSearchableFileName(name) {
  if (name === ".env" || name === ".gitignore") return true;
  const ext = getSearchableFileExtension(name);
  if (ext === ".sidecar.md") return true;
  return SEARCHABLE_TEXT_EXTENSIONS.has(ext) || SEARCHABLE_BINARY_EXTENSIONS.has(ext);
}

function isTextSearchableFileName(name) {
  if (name === ".env" || name === ".gitignore") return true;
  const ext = getSearchableFileExtension(name);
  return SEARCHABLE_TEXT_EXTENSIONS.has(ext) || ext === ".sidecar.md";
}

function shouldSkipSearchDirectory(name) {
  const normalized = normalizeStorageSubfolderName(name);
  return (
    normalized === STORAGE_SUBFOLDER_PREVIEW ||
    name === ".obsidian" ||
    shouldSkipDirectoryListing(name)
  );
}

function shouldSkipSearchEntry(name, isDirectory) {
  if (name === MENU_SORT_FILE) return true;
  if (shouldSkipSearchDirectory(name)) return true;
  if (isDirectory) return isHiddenMenuEntry(name);
  if (name === ".env" || name === ".gitignore") return false;
  return isHiddenMenuEntry(name);
}

async function collectSearchableFiles(dirAbsolute, prefix = "", files = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (shouldSkipSearchEntry(entry.name, entry.isDirectory())) continue;
    const absolute = path.join(dirAbsolute, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      await collectSearchableFiles(absolute, relative.replace(/\\/g, "/"), files);
      continue;
    }

    if (!isSearchableFileName(entry.name)) continue;
    files.push(relative.replace(/\\/g, "/"));
  }

  return files;
}

async function rewriteMarkdownLinksForRename(options = {}) {
  const agentRoot = getAgentRoot();
  if (!agentRoot) return { filesUpdated: 0, linksUpdated: 0, files: [] };
  try {
    return await rewriteAgentMarkdownLinks(agentRoot, options);
  } catch (error) {
    console.error("Failed to rewrite markdown links:", error);
    return {
      filesUpdated: 0,
      linksUpdated: 0,
      files: [],
      error: String(error.message || error)
    };
  }
}

async function classifyStoragePathResult(normalized, subfolder, mode, source) {
  const escaped = subfolder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const storageAlt = getStorageFolderRegexAlternation();
  const newWithFile = new RegExp(`^(.*)/${storageAlt}/${escaped}/(.+)$`, "i");
  const newWithFileMatch = normalized.match(newWithFile);
  if (newWithFileMatch) {
    const containerDir = newWithFileMatch[1];
    const nodePath = await resolveNodeManifestRelForContainer(containerDir);
    const nodeAbsolute = normalizeWorkspacePath(nodePath);
    if (!nodeAbsolute || !(await nodePathExists(nodeAbsolute))) return null;
    return {
      nodePath: nodePath.replace(/\\/g, "/"),
      mode,
      externalFile: newWithFileMatch[2],
      source
    };
  }

  const newFolderOnly = new RegExp(`^(.*)/${storageAlt}/${escaped}(?:/|$)`, "i");
  const newFolderMatch = normalized.match(newFolderOnly);
  if (newFolderMatch) {
    const containerDir = newFolderMatch[1];
    const nodePath = await resolveNodeManifestRelForContainer(containerDir);
    const nodeAbsolute = normalizeWorkspacePath(nodePath);
    if (!nodeAbsolute || !(await nodePathExists(nodeAbsolute))) return null;
    return { nodePath: nodePath.replace(/\\/g, "/"), mode, source };
  }

  const withFile = new RegExp(`^(.*)/${storageAlt}/([^/]+)/${escaped}/(.+)$`, "i");
  const withFileMatch = normalized.match(withFile);
  if (withFileMatch) {
    const parentFolder = withFileMatch[1];
    const nodeBase = withFileMatch[2];
    const nodePath = await resolveExistingTopicManifestRel(parentFolder, nodeBase);
    const nodeAbsolute = normalizeWorkspacePath(nodePath);
    if (!nodeAbsolute || !(await nodePathExists(nodeAbsolute))) return null;
    return {
      nodePath: nodePath.replace(/\\/g, "/"),
      mode,
      externalFile: withFileMatch[3],
      source
    };
  }

  const folderOnly = new RegExp(`^(.*)/${storageAlt}/([^/]+)/${escaped}(?:/|$)`, "i");
  const folderMatch = normalized.match(folderOnly);
  if (folderMatch) {
    const parentFolder = folderMatch[1];
    const nodeBase = folderMatch[2];
    const nodePath = await resolveExistingTopicManifestRel(parentFolder, nodeBase);
    const nodeAbsolute = normalizeWorkspacePath(nodePath);
    if (!nodeAbsolute || !(await nodePathExists(nodeAbsolute))) return null;
    return { nodePath: nodePath.replace(/\\/g, "/"), mode, source };
  }

  return null;
}

async function classifyStoragePathForMode(normalized, mode, source) {
  const canonical = getStorageSubfolderForMode(mode);
  if (!canonical) return null;
  for (const subfolder of listStorageSubfolderNameCandidates(canonical)) {
    const hit = await classifyStoragePathResult(normalized, subfolder, mode, source);
    if (hit) return hit;
  }
  return null;
}

function matchLegacyContainerSubfolderPath(normalized, mode, source) {
  const canonical = getStorageSubfolderForMode(mode);
  if (!canonical) return null;
  const alternation = listStorageSubfolderNameCandidates(canonical)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const match = normalized.match(new RegExp(`^(.*)\\/(?:${alternation})(?:/|$)`, "i"));
  if (!match) return null;
  return { containerDir: match[1], mode, source };
}

async function classifySearchResult(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.basename(normalized);
  const dir = path.dirname(normalized);
  const dirAbsolute = dir && dir !== "." ? normalizeWorkspacePath(dir) : getAgentRoot();

  const bundleHit = resolveManifestRelFromStorageBundlePath(normalized, getStoragePathOptions());
  if (bundleHit) {
    for (const manifestCandidate of bundleHit.manifestCandidates) {
      const manifestAbsolute = normalizeWorkspacePath(manifestCandidate);
      if (!manifestAbsolute || !(await nodePathExists(manifestAbsolute))) continue;
      const sourceByMode = {
        internal: "Однофайловая",
        tabular: "Табличная",
        configs: "Конфигурации",
        todo: "TODO",
        "node-preview": "Превью"
      };
      return {
        nodePath: manifestCandidate,
        mode: bundleHit.mode,
        source: sourceByMode[bundleHit.mode] || bundleHit.mode,
        canonicalPath: normalized
      };
    }
  }

  if (isAllowedSystemFileName(base)) {
    return { systemFile: base, source: "Системный файл" };
  }

  if (isAreaManifestRelPath(normalized) && (await nodePathExists(normalizeWorkspacePath(normalized)))) {
    return { nodePath: normalized, mode: "description", source: "Описание" };
  }

  if (isTopicManifestFileName(base)) {
    return { nodePath: normalized, mode: "description", source: "Описание" };
  }

  if (/\.x\.todo\.md$/i.test(normalized)) {
    return {
      nodePath: normalized.replace(/\.x\.todo\.md$/i, ".md"),
      mode: "todo",
      source: "TODO",
      canonicalPath: normalized
    };
  }

  if (/\.node\.todo\.md$/i.test(normalized)) {
    return {
      nodePath: normalized.replace(/\.node\.todo\.md$/i, ".md"),
      mode: "todo",
      source: "TODO",
      canonicalPath: normalized
    };
  }

  if (/\.x\.content\.md$/i.test(normalized)) {
    return {
      nodePath: normalized.replace(/\.x\.content\.md$/i, ".md"),
      mode: "internal",
      source: "Однофайловая"
    };
  }

  if (/\.content\.md$/i.test(normalized) && !/\.x\.content\.md$/i.test(normalized)) {
    const manifestRel = inferManifestRelFromSidecar(normalized);
    if (manifestRel) {
      return { nodePath: manifestRel, mode: "internal", source: "Однофайловая" };
    }
  }

  if (/\.x\.configuration\.ya?ml$/i.test(normalized)) {
    return {
      nodePath: normalized.replace(/\.x\.configuration\.ya?ml$/i, ".md"),
      mode: "configs",
      source: "Конфигурации"
    };
  }

  if (base.toLowerCase() === BUNDLE_CONFIG_FILE.toLowerCase() && dirAbsolute) {
    const nodePath = await findNodePathInDirectory(dirAbsolute);
    if (!nodePath) return null;
    return { nodePath, mode: "configs", source: "Конфигурации" };
  }

  if (base === ".env" && dirAbsolute) {
    const nodePath = await findNodePathInDirectory(dirAbsolute);
    if (!nodePath) return null;
    return { nodePath, mode: "env", source: ".env" };
  }

  if (base.toLowerCase() === BUNDLE_TODO_FILE.toLowerCase() && dirAbsolute) {
    const nodePath = await findNodePathInDirectory(dirAbsolute);
    if (!nodePath) return null;
    return { nodePath, mode: "todo", source: "TODO", canonicalPath: toTodoFilePath(nodePath) };
  }

  const storageExternal = await classifyStoragePathForMode(
    normalized,
    "external",
    "Многофайловая"
  );
  if (storageExternal) return storageExternal;

  const storageScripts = await classifyStoragePathForMode(normalized, "scripts", "Скрипты");
  if (storageScripts) return storageScripts;

  const storageArtefacts = await classifyStoragePathForMode(normalized, "artefacts", "Артефакты");
  if (storageArtefacts) return storageArtefacts;

  const storageRepository = await classifyStoragePathForMode(normalized, "repository", "Репозиторий");
  if (storageRepository) return storageRepository;

  const storageTemp = await classifyStoragePathForMode(normalized, "temp", "Временные файлы");
  if (storageTemp) return storageTemp;

  const storageInbox = await classifyStoragePathForMode(normalized, "inbox", "Входящие");
  if (storageInbox) return storageInbox;

  const storageQuickNotes = await classifyStoragePathForMode(normalized, "quick-notes", "Быстрые заметки");
  if (storageQuickNotes) return storageQuickNotes;

  const storageMedia = await classifyStoragePathForMode(normalized, "media", "Медиа");
  if (storageMedia) return storageMedia;

  const storageReferences = await classifyStoragePathForMode(
    normalized,
    "references",
    "Источники"
  );
  if (storageReferences) return storageReferences;

  const contentAlternation = listStorageSubfolderNameCandidates(STORAGE_SUBFOLDER_CONTENT)
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const contentMatch = normalized.match(new RegExp(`^(.*)\\/(?:${contentAlternation})\\/(.+)$`, "i"));
  if (contentMatch) {
    const nodePath = await findNodePathInDirectory(normalizeWorkspacePath(contentMatch[1]));
    if (!nodePath) return null;
    return {
      nodePath,
      mode: "external",
      externalFile: contentMatch[2],
      source: "Многофайловая"
    };
  }

  for (const spec of [
    { mode: "scripts", source: "Скрипты" },
    { mode: "artefacts", source: "Артефакты" },
    { mode: "repository", source: "Репозиторий" },
    { mode: "temp", source: "Временные файлы" },
    { mode: "inbox", source: "Входящие" },
    { mode: "quick-notes", source: "Быстрые заметки" },
    { mode: "media", source: "Медиа" },
    { mode: "references", source: "Источники" }
  ]) {
    const legacy = matchLegacyContainerSubfolderPath(normalized, spec.mode, spec.source);
    if (!legacy) continue;
    const nodePath = await findNodePathInDirectory(normalizeWorkspacePath(legacy.containerDir));
    if (!nodePath) continue;
    return { nodePath, mode: legacy.mode, source: legacy.source };
  }

  return null;
}

const MARKDOWN_LINK_AWN_TYPE_LABELS = {
  "awn.topic": "Тема",
  "awn.area": "Область",
  "awn.workspace": "Workspace",
  "awn.record": "Запись",
  "awn.record.category": "Раздел Content",
  "awn.media.category": "Раздел Media",
  "awn.sidecar": "Sidecar",
  "awn.memory": "Память темы",
  "awn.system": "Системный файл",
  "awn.file": "Произвольный файл",
  service: "Служебный"
};

const MARKDOWN_LINK_AWN_TYPE_ORDER = [
  "awn.topic",
  "awn.area",
  "awn.workspace",
  "awn.record",
  "awn.record.category",
  "awn.media.category",
  "awn.sidecar",
  "awn.file",
  "awn.memory",
  "awn.system",
  "service"
];

async function isWorkspaceRootManifestRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  try {
    const rootRel = await resolveRootAreaManifestRel(getAgentRoot());
    return normalized.toLowerCase() === String(rootRel || "").replace(/\\/g, "/").toLowerCase();
  } catch {
    return false;
  }
}

async function resolveMarkdownLinkAwnType(relPath, meta) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);

  if (meta?.systemFile || isAllowedSystemFileName(base)) {
    return "awn.system";
  }

  if (
    meta?.mode &&
    ["internal", "tabular", "todo", "configs", "env", "node-preview"].includes(meta.mode)
  ) {
    return "awn.memory";
  }

  if (meta?.externalFile && meta.mode === "external") {
    return "awn.record";
  }

  let explicitType = null;
  const typeSources = [normalized];
  if (meta?.nodePath && meta.nodePath !== normalized) {
    typeSources.push(String(meta.nodePath).replace(/\\/g, "/"));
  }
  for (const sourcePath of typeSources) {
    try {
      const { frontmatter } = await readNodeFrontmatterContent(sourcePath);
      const value = getYamlScalar(frontmatter, "awn-type");
      if (value) {
        explicitType = value;
        break;
      }
    } catch {
      // try next source
    }
  }

  const containerFolder = getAgentContainerFolder();
  const containerRootRel = containerFolder
    ? `${containerFolder}/${MANIFEST_FILE}`.replace(/\\/g, "/")
    : null;
  const inferred = inferAwnTypeFromPath(normalized, {
    contentMode: meta?.mode === "external" ? "external" : undefined,
    isAgentRoot: await isWorkspaceRootManifestRel(normalized),
    isContainerRoot: Boolean(
      containerRootRel &&
        normalized.toLowerCase() === containerRootRel.toLowerCase()
    ),
    containerFolder: containerFolder || "container"
  });

  let awnType = explicitType || inferred;

  const kitFolder = getAgentKitFolder();
  if (kitFolder && normalized.toLowerCase().startsWith(`${kitFolder.toLowerCase()}/`)) {
    if (awnType === "awn.topic" && isTopicManifestFileName(base)) {
      return "awn.topic";
    }
    if (isAreaManifestFileName(base) || base.toLowerCase() === "_reginfo.md") {
      return "service";
    }
    if (awnType !== "awn.topic" && awnType !== "awn.record") {
      return "service";
    }
  }

  if (awnType === "awn.record" && !meta?.externalFile) {
    const inStorage =
      /\/awn-storage\//i.test(normalized) ||
      /\/content\//i.test(normalized) ||
      /\/_storage\//i.test(normalized);
    if (
      !inStorage &&
      !isTopicManifestFileName(base) &&
      !isAreaManifestFileName(base) &&
      base.toLowerCase() !== "_reginfo.md"
    ) {
      return "awn.file";
    }
  }

  return awnType || "awn.file";
}

function getMarkdownLinkAwnTypeLabel(typeId, typesMap = null) {
  const key = String(typeId || "awn.file");
  return typesMap?.[key]?.name || MARKDOWN_LINK_AWN_TYPE_LABELS[key] || key;
}

const MARKDOWN_LINK_GROUP_LABELS = {
  topics: "Темы и области",
  content: "Content / записи",
  media: "Медиа",
  memory: "Память темы",
  storage: "Inbox, скрипты и др.",
  service: "Служебные файлы",
  system: "Системные",
  other: "Прочие markdown"
};

const SEARCH_FILE_FORMAT_LABELS = {
  markdown: "Markdown",
  sidecar: "Sidecar",
  pdf: "PDF",
  office: "Word / PowerPoint",
  spreadsheet: "Excel / CSV",
  video: "Видео",
  audio: "Аудио",
  image: "Изображения",
  archive: "Архивы",
  config: "YAML / JSON / TXT",
  other: "Прочее"
};

const SEARCH_FILE_TYPE_IDS = new Set([
  "all",
  "markdown",
  "sidecar",
  "pdf",
  "office",
  "spreadsheet",
  "video",
  "audio",
  "image",
  "archive",
  "config",
  "other"
]);

const SEARCH_FLAT_STORAGE_MODES = new Set([
  "scripts",
  "inbox",
  "note",
  "quick-notes",
  "references",
  "artefacts",
  "repository",
  "temp",
  "assets"
]);

function normalizeSearchFileType(value) {
  const type = String(value || "all").trim().toLowerCase();
  return SEARCH_FILE_TYPE_IDS.has(type) ? type : "all";
}

function classifySearchFileFormat(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);
  const lower = base.toLowerCase();

  if (lower.endsWith(".sidecar.md")) return "sidecar";

  const ext = path.extname(base).toLowerCase();
  if (ext === ".md" || ext === ".markdown") return "markdown";
  if (ext === ".pdf") return "pdf";
  if ([".doc", ".docx", ".ppt", ".pptx"].includes(ext)) return "office";
  if ([".xls", ".xlsx", ".csv"].includes(ext)) return "spreadsheet";
  if ([".mp4", ".mov", ".mkv", ".avi", ".webm", ".m4v"].includes(ext)) return "video";
  if ([".mp3", ".wav", ".m4a", ".ogg", ".flac", ".aac"].includes(ext)) return "audio";
  if (
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".heic", ".avif"].includes(ext)
  ) {
    return "image";
  }
  if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(ext)) return "archive";
  if ([".yaml", ".yml", ".json", ".txt"].includes(ext) || base === ".env" || base === ".gitignore") {
    return "config";
  }
  return "other";
}

function classifyMarkdownLinkGroup(relPath, meta) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);

  if (meta?.systemFile || isAllowedSystemFileName(base)) {
    return "system";
  }

  if (meta?.externalFile && meta?.mode === "external") {
    return "content";
  }

  if (meta?.externalFile && meta?.mode === "media") {
    return "media";
  }

  if (meta?.mode && SEARCH_FLAT_STORAGE_MODES.has(meta.mode)) {
    return "storage";
  }

  if (
    meta?.mode === "description" &&
    (isAreaManifestRelPath(normalized) || isTopicManifestFileName(base))
  ) {
    return "topics";
  }

  if (
    meta?.mode &&
    ["internal", "tabular", "todo", "configs", "env", "node-preview"].includes(meta.mode)
  ) {
    return "memory";
  }

  const kitFolder = getAgentKitFolder();
  if (kitFolder && normalized.toLowerCase().startsWith(`${kitFolder.toLowerCase()}/`)) {
    return "service";
  }

  if (isAreaManifestRelPath(normalized) || isTopicManifestFileName(base)) {
    return "topics";
  }

  return "other";
}

function buildSearchResultEntry(relPath, meta, payload, fileTypeFilter = "all") {
  if (!meta) return null;
  const fileType = classifySearchFileFormat(relPath);
  if (fileTypeFilter !== "all" && fileType !== fileTypeFilter) return null;
  const display = resolveSearchResultDisplay(relPath, meta);
  return {
    ...meta,
    ...payload,
    filePath: meta.canonicalPath || relPath,
    fileType,
    fileTypeLabel: SEARCH_FILE_FORMAT_LABELS[fileType] || SEARCH_FILE_FORMAT_LABELS.other,
    displayName: display.displayName,
    locationHint: display.locationHint
  };
}

async function resolveSearchResultMeta(relPath) {
  const meta = await classifySearchResult(relPath);
  if (meta) return meta;

  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);
  if (isAllowedSystemFileName(base)) {
    return { systemFile: base, source: base };
  }

  return {
    source: base || normalized,
    canonicalPath: normalized
  };
}

const MARKDOWN_LINK_KIND_LABELS = {
  topics: "Тема",
  content: "Запись",
  memory: "Память",
  service: "Служебный",
  system: "Системный",
  other: "Файл"
};

function resolveMarkdownLinkLocationHint(relPath, meta) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const dir = path.posix.dirname(normalized);

  if (meta?.externalFile) {
    const topicFolder = meta.nodePath ? path.posix.dirname(String(meta.nodePath)) : "";
    const topicName =
      topicFolder && topicFolder !== "." ? path.posix.basename(topicFolder) : "тема";
    return `Content · ${topicName} / ${meta.externalFile}`;
  }

  if (meta?.systemFile) {
    return "Системные файлы workspace";
  }

  if (meta?.source) {
    return dir && dir !== "." ? `${meta.source} · ${dir}` : meta.source;
  }

  return dir && dir !== "." ? dir : "Корень workspace";
}

async function resolveMarkdownLinkIndexLabel(relPath, meta) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);

  if (meta?.externalFile) {
    const recordName = path.posix.basename(meta.externalFile).replace(/\.md$/i, "");
    if (meta.nodePath) {
      try {
        const { frontmatter } = await readNodeFrontmatterContent(meta.nodePath);
        const slug = getManifestSlugFromRel(meta.nodePath);
        const topicName = resolveNodeDisplayName(getYamlScalar(frontmatter, "awn-name") || "", slug);
        if (topicName) return `${recordName} · ${topicName}`;
      } catch {
        // fall through
      }
    }
    return recordName || meta.externalFile;
  }

  if (meta?.systemFile) {
    return meta.systemFile.replace(/\.md$/i, "") || meta.systemFile;
  }

  if (isAreaManifestFileName(base) || base.toLowerCase() === "_reginfo.md") {
    const parentDir = path.posix.dirname(normalized);
    if (parentDir && parentDir !== ".") {
      return `Реестр · ${path.posix.basename(parentDir)}`;
    }
    return "Реестр workspace";
  }

  try {
    const { frontmatter } = await readNodeFrontmatterContent(relPath);
    const slug = getManifestSlugFromRel(relPath);
    const awnName = getYamlScalar(frontmatter, "awn-name") || "";
    return resolveNodeDisplayName(awnName, slug);
  } catch {
    return path.posix.basename(relPath).replace(/\.md$/i, "") || relPath;
  }
}

async function buildAgentMarkdownLinkIndex() {
  const relFiles = await collectSearchableFiles(getAgentRoot());
  const mdFiles = relFiles.filter((relPath) => String(relPath || "").toLowerCase().endsWith(".md"));
  const typesMap = loadAgentTypes(getAgentRoot(), getProjectRoot());
  const items = [];

  for (const relPath of mdFiles) {
    const meta = await classifySearchResult(relPath);
    const normalized = String(relPath || "").replace(/\\/g, "/");
    const base = path.posix.basename(normalized);
    const label = await resolveMarkdownLinkIndexLabel(normalized, meta);
    const group = classifyMarkdownLinkGroup(normalized, meta);
    const awnType = await resolveMarkdownLinkAwnType(normalized, meta);
    const awnTypeLabel = getMarkdownLinkAwnTypeLabel(awnType, typesMap);

    items.push({
      relPath: normalized,
      label,
      fileName: base,
      awnType,
      awnTypeLabel,
      kindLabel: awnTypeLabel,
      locationHint: resolveMarkdownLinkLocationHint(normalized, meta),
      group,
      groupLabel: MARKDOWN_LINK_GROUP_LABELS[group] || MARKDOWN_LINK_GROUP_LABELS.other,
      nodePath: meta?.nodePath ? String(meta.nodePath).replace(/\\/g, "/") : null,
      externalFile: meta?.externalFile ? String(meta.externalFile).replace(/\\/g, "/") : null,
      mode: meta?.mode || null,
      source: meta?.source || null,
      systemFile: meta?.systemFile || null
    });
  }

  items.sort((a, b) => {
    const typeOrderA = MARKDOWN_LINK_AWN_TYPE_ORDER.indexOf(a.awnType);
    const typeOrderB = MARKDOWN_LINK_AWN_TYPE_ORDER.indexOf(b.awnType);
    const rankA = typeOrderA === -1 ? MARKDOWN_LINK_AWN_TYPE_ORDER.length : typeOrderA;
    const rankB = typeOrderB === -1 ? MARKDOWN_LINK_AWN_TYPE_ORDER.length : typeOrderB;
    if (rankA !== rankB) return rankA - rankB;
    return String(a.label || a.relPath || "").localeCompare(String(b.label || b.relPath || ""), "ru", {
      sensitivity: "base",
      numeric: true
    });
  });

  return {
    items,
    total: items.length,
    groups: Object.entries(MARKDOWN_LINK_GROUP_LABELS).map(([id, label]) => ({ id, label })),
    awnTypes: MARKDOWN_LINK_AWN_TYPE_ORDER.map((id) => ({
      id,
      label: getMarkdownLinkAwnTypeLabel(id, typesMap)
    }))
  };
}

function countTextMatches(content, query, parsed = null) {
  const p = parsed || parseSearchQuery(query);
  const text = String(content || "");
  if (!p.raw) return 0;

  if (p.mode === "strict") {
    return countTextMatchesLiteral(text, p.literal);
  }
  if (p.mode === "wildcard" && p.regex) {
    const m = text.match(new RegExp(p.regex.source, `${p.regex.flags}g`));
    return m ? m.length : 0;
  }
  let total = 0;
  for (const term of p.terms) {
    total += countTextMatchesLiteral(text, term);
  }
  return total || (matchesSearchHaystack(text, p) ? 1 : 0);
}

function countTextMatchesLiteral(content, literal) {
  const lower = String(content || "").toLowerCase();
  const q = String(literal || "").toLowerCase();
  if (!q) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = lower.indexOf(q, pos)) !== -1) {
    count += 1;
    pos += q.length;
  }
  return count;
}

function normalizeSearchCompact(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s_\-./]+/g, "");
}

function normalizeSearchMatchMode(value) {
  const mode = String(value || "relaxed").trim().toLowerCase();
  return mode === "strict" ? "strict" : "relaxed";
}

function buildSearchWildcardRegExp(pattern) {
  let source = "";
  for (const ch of String(pattern || "")) {
    if (ch === "*") source += ".*";
    else if (ch === "?") source += ".";
    else source += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(source, "i");
}

function parseSearchQuery(rawQuery, options = {}) {
  const forceMatch = options.match ? normalizeSearchMatchMode(options.match) : null;
  const raw = String(rawQuery || "").trim();
  if (!raw) {
    return { raw: "", mode: "relaxed", terms: [], literal: "", display: "", regex: null, match: "relaxed" };
  }

  if (forceMatch === "strict") {
    return { raw, mode: "strict", terms: [raw], literal: raw, display: raw, regex: null, match: "strict" };
  }

  const strictQuoted = raw.match(/^"([\s\S]+)"$/);
  if (strictQuoted) {
    const literal = strictQuoted[1].trim();
    return {
      raw,
      mode: "strict",
      terms: [literal],
      literal,
      display: literal,
      regex: null,
      match: "strict"
    };
  }

  if (/[*?]/.test(raw)) {
    return {
      raw,
      mode: "wildcard",
      terms: [],
      literal: raw,
      display: raw,
      regex: buildSearchWildcardRegExp(raw),
      match: "relaxed"
    };
  }

  const terms = raw.split(/\s+/).filter(Boolean);
  return {
    raw,
    mode: "relaxed",
    terms,
    literal: raw,
    display: raw,
    regex: null,
    match: forceMatch || "relaxed"
  };
}

function matchesSearchHaystack(haystack, parsed) {
  const text = String(haystack || "");
  if (!text || !parsed?.raw) return false;

  if (parsed.mode === "strict") {
    return text.toLowerCase().includes(parsed.literal.toLowerCase());
  }
  if (parsed.mode === "wildcard" && parsed.regex) {
    return parsed.regex.test(text);
  }

  const lower = text.toLowerCase();
  const compact = normalizeSearchCompact(text);
  return parsed.terms.every((term) => {
    const token = String(term || "").toLowerCase();
    if (!token) return true;
    if (lower.includes(token)) return true;
    const compactToken = normalizeSearchCompact(term);
    return compactToken.length >= 2 && compact.includes(compactToken);
  });
}

function buildSearchSnippet(content, query, radius = 64, parsed = null) {
  const p = parsed || parseSearchQuery(query);
  const text = String(content || "");
  const lower = text.toLowerCase();
  let idx = -1;
  let highlightLen = 0;

  if (p.mode === "strict") {
    idx = lower.indexOf(p.literal.toLowerCase());
    highlightLen = p.literal.length;
  } else if (p.mode === "wildcard" && p.regex) {
    const match = text.match(p.regex);
    if (match && match.index != null) {
      idx = match.index;
      highlightLen = match[0].length;
    }
  } else {
    for (const term of p.terms) {
      const token = term.toLowerCase();
      idx = lower.indexOf(token);
      if (idx !== -1) {
        highlightLen = term.length;
        break;
      }
      const compactIdx = normalizeSearchCompact(text).indexOf(normalizeSearchCompact(term));
      if (compactIdx !== -1 && normalizeSearchCompact(term).length >= 2) {
        idx = 0;
        highlightLen = Math.min(term.length, text.length);
        break;
      }
    }
  }

  if (idx === -1) return "";

  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + highlightLen + radius);
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;
  return snippet;
}

function normalizeSearchScope(scope) {
  const value = String(scope || "all").toLowerCase();
  if (value === "filename" || value === "tags" || value === "content" || value === "all") return value;
  return "all";
}

function getSearchMinLength(scope) {
  if (scope === "filename" || scope === "all") return 1;
  return 2;
}

function scoreFilenameMatch(relPath, query, parsed = null) {
  const p = parsed || parseSearchQuery(query);
  const base = path.basename(relPath).toLowerCase();
  const stem = base.replace(/\.sidecar\.md$/i, "").replace(/\.[^./]+$/i, "");
  if (!p.raw) return 0;

  if (p.mode === "strict") {
    const qLower = p.literal.toLowerCase();
    if (base === qLower) return 200;
    if (base.startsWith(qLower)) return 150;
    if (stem === qLower || stem.startsWith(qLower)) return 140;
    if (base.includes(qLower)) return 120;
    if (String(relPath || "").toLowerCase().includes(qLower)) return 80;
    return 0;
  }

  if (p.mode === "wildcard" && p.regex) {
    if (p.regex.test(base) || p.regex.test(stem)) return 150;
    if (p.regex.test(relPath)) return 100;
    return 0;
  }

  let score = 60;
  if (p.terms.every((term) => stem.includes(term.toLowerCase()))) score = 180;
  else if (p.terms.every((term) => base.includes(term.toLowerCase()))) score = 150;
  else if (matchesSearchHaystack(base, p) || matchesSearchHaystack(stem, p)) score = 130;
  else if (matchesSearchHaystack(relPath, p)) score = 90;
  else return 0;

  const compactStem = normalizeSearchCompact(stem);
  if (p.terms.length > 1 && p.terms.every((term) => compactStem.includes(normalizeSearchCompact(term)))) {
    score += 20;
  }
  return score;
}

function formatSearchMatchKindLabel(kinds = []) {
  const set = new Set(Array.isArray(kinds) ? kinds : []);
  const parts = [];
  if (set.has("topic")) parts.push("тема");
  if (set.has("filename") && set.has("content")) parts.push("имя и текст");
  else if (set.has("filename")) parts.push("имя файла");
  else if (set.has("content")) parts.push("в тексте");
  return parts.join(" · ");
}

function formatSearchPathBreadcrumb(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized) return "Workspace";
  return normalized.split("/").filter(Boolean).join(" › ");
}

function scoreTopicMetaMatch(fields, query, parsed = null) {
  const p = parsed || parseSearchQuery(query);
  if (!p.raw) return 0;
  const haystack = [
    fields.title,
    fields.slug,
    fields.awnName,
    fields.relPath,
    fields.description,
    fields.tags
  ]
    .filter(Boolean)
    .join("\n");
  if (!matchesSearchHaystack(haystack, p)) return 0;

  if (p.mode === "strict") {
    const qLower = p.literal.toLowerCase();
    const title = String(fields.title || "").toLowerCase();
    const slug = String(fields.slug || "").toLowerCase();
    const awnName = String(fields.awnName || "").toLowerCase();
    const relPath = String(fields.relPath || "").toLowerCase();
    if (title === qLower || awnName === qLower || slug === qLower) return 320;
    if (title.startsWith(qLower) || awnName.startsWith(qLower) || slug.startsWith(qLower)) return 280;
    if (title.includes(qLower) || awnName.includes(qLower) || slug.includes(qLower)) return 240;
    if (relPath.includes(qLower)) return 200;
    return 180;
  }

  let score = 180;
  const title = String(fields.title || "").toLowerCase();
  const slug = String(fields.slug || "").toLowerCase();
  const awnName = String(fields.awnName || "").toLowerCase();
  if (p.terms.every((term) => title.includes(term.toLowerCase()))) score = 300;
  else if (p.terms.every((term) => awnName.includes(term.toLowerCase()))) score = 280;
  else if (p.terms.every((term) => slug.includes(term.toLowerCase()))) score = 260;
  return score;
}

async function readSearchFileAwnMeta(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);
  if (!/\.md$/i.test(base)) {
    return { titleName: "", awnName: "", emoji: "" };
  }

  try {
    const { frontmatter } = await readNodeFrontmatterContent(normalized);
    const awnName = getYamlScalar(frontmatter, "awn-name") || "";
    const slug =
      base.replace(/\.sidecar\.md$/i, ".md").replace(/\.md$/i, "") ||
      base.replace(/\.[^./]+$/i, "");
    return {
      titleName: resolveNodeDisplayName(awnName, slug),
      awnName,
      emoji: getYamlScalar(frontmatter, "awn-emoji") || ""
    };
  } catch {
    return { titleName: "", awnName: "", emoji: "" };
  }
}

async function resolveSearchResultEnrichment(relPath, meta) {
  const normalized = String(relPath || meta?.canonicalPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);
  const isTopicOrAreaManifest =
    isTopicManifestFileName(base) || isAreaManifestRelPath(normalized);
  const manifestPath =
    meta?.nodePath &&
    (isTopicManifestFileName(path.posix.basename(meta.nodePath)) || isAreaManifestRelPath(meta.nodePath))
      ? meta.nodePath
      : isTopicOrAreaManifest
        ? normalized
        : meta?.nodePath || null;
  const manifestNormalized = manifestPath ? String(manifestPath).replace(/\\/g, "/") : "";
  const isSelfManifest = Boolean(manifestNormalized && manifestNormalized === normalized);

  const enrichment = {
    fileName: meta?.externalFile ? path.posix.basename(meta.externalFile) : base,
    pathBreadcrumb: formatSearchPathBreadcrumb(normalized),
    kindLabel: "",
    titleName: "",
    topicName: "",
    awnName: "",
    emoji: "",
    previewUrl: null,
    hasPreview: false
  };

  if (meta?.systemFile) {
    enrichment.kindLabel = "Системный";
    enrichment.titleName = base.replace(/\.md$/i, "") || base;
    return enrichment;
  }

  if (manifestPath) {
    try {
      const { frontmatter } = await readNodeFrontmatterContent(manifestPath);
      const slug = getManifestSlugFromRel(manifestPath);
      const manifestAwnName = getYamlScalar(frontmatter, "awn-name") || "";
      const manifestTitle = resolveNodeDisplayName(manifestAwnName, slug);
      enrichment.topicName = manifestTitle;
      enrichment.awnName = manifestAwnName;
      if (isSelfManifest) {
        enrichment.titleName = manifestTitle;
        enrichment.emoji = getYamlScalar(frontmatter, "awn-emoji") || "";
      }
      const awnType = String(getYamlScalar(frontmatter, "awn-type") || "").toLowerCase();
      if (awnType.includes("topic") || isTopicManifestFileName(path.posix.basename(manifestPath))) {
        enrichment.kindLabel = "Тема";
      } else if (isAreaManifestRelPath(manifestPath)) {
        enrichment.kindLabel = "Область";
      }

      const preview = await getNodePreviewMeta(manifestPath);
      enrichment.previewUrl = preview.previewUrl || null;
      enrichment.hasPreview = Boolean(preview.hasPreview && preview.previewUrl);
    } catch {
      // ignore enrichment errors
    }
  }

  if (meta?.nodePath && meta.nodePath !== manifestPath) {
    try {
      const { frontmatter } = await readNodeFrontmatterContent(meta.nodePath);
      const slug = getManifestSlugFromRel(meta.nodePath);
      enrichment.topicName = resolveNodeDisplayName(getYamlScalar(frontmatter, "awn-name") || "", slug);
      if (!enrichment.previewUrl) {
        const preview = await getNodePreviewMeta(meta.nodePath);
        enrichment.previewUrl = preview.previewUrl || null;
        enrichment.hasPreview = Boolean(preview.hasPreview && preview.previewUrl);
      }
    } catch {
      // ignore enrichment errors
    }
  }

  if (!isSelfManifest) {
    const fileMeta = await readSearchFileAwnMeta(normalized);
    if (fileMeta.titleName) enrichment.titleName = fileMeta.titleName;
    if (fileMeta.awnName) enrichment.awnName = fileMeta.awnName;
    if (fileMeta.emoji) enrichment.emoji = fileMeta.emoji;
  }

  if (!enrichment.kindLabel) {
    if (meta?.externalFile) enrichment.kindLabel = "Запись";
    else if (meta?.mode === "internal") enrichment.kindLabel = "Память";
    else if (meta?.source) enrichment.kindLabel = meta.source;
    else enrichment.kindLabel = "Файл";
  }

  if (!enrichment.titleName) {
    enrichment.titleName =
      enrichment.fileName.replace(/\.(sidecar\.)?md$/i, "").replace(/\.[^./]+$/i, "") || base;
  }

  return enrichment;
}

async function enrichSearchResultEntry(entry) {
  if (!entry) return entry;
  const enrichment = await resolveSearchResultEnrichment(entry.filePath || entry.canonicalPath, entry);
  const locationHint = enrichment.topicName
    ? `${enrichment.topicName} · ${entry.source || SEARCH_SLOT_LABELS[entry.mode] || entry.mode || "файл"}`
    : entry.locationHint;

  return {
    ...entry,
    ...enrichment,
    displayName: enrichment.titleName || entry.displayName,
    locationHint
  };
}

async function enrichSearchResults(results) {
  return Promise.all((results || []).map((entry) => enrichSearchResultEntry(entry)));
}

async function searchByTopicMeta(query, limit = 30, fileType = "all", match = "relaxed") {
  const trimmed = String(query || "").trim();
  const normalizedFileType = normalizeSearchFileType(fileType);
  const parsed = parseSearchQuery(trimmed, { match });
  if (trimmed.length < 1) {
    return { query: trimmed, scope: "topic", fileType: normalizedFileType, match: parsed.match, results: [], total: 0 };
  }

  const relFiles = await collectSearchableFiles(getAgentRoot());
  const manifests = relFiles.filter((relPath) => {
    const base = path.posix.basename(relPath);
    return isTopicManifestFileName(base) || isAreaManifestRelPath(relPath);
  });

  const results = [];

  for (const relPath of manifests) {
    let frontmatter = "";
    let body = "";
    try {
      ({ frontmatter, body } = await readNodeFrontmatterContent(relPath));
    } catch {
      continue;
    }

    const slug = getManifestSlugFromRel(relPath);
    const awnName = getYamlScalar(frontmatter, "awn-name") || "";
    const title = resolveNodeDisplayName(awnName, slug);
    const description = getYamlScalar(frontmatter, "awn-description") || "";
    const tags = extractTagsFromProps(frontmatter).join(" ");
    const haystack = [title, slug, awnName, description, tags, relPath].join("\n");
    if (!matchesSearchHaystack(haystack, parsed)) continue;

    const meta = await classifySearchResult(relPath);
    const entry = buildSearchResultEntry(
      relPath,
      meta,
      {
        snippet: buildSearchSnippet(body || description, trimmed, 64, parsed),
        matchCount: countTextMatches(haystack, trimmed, parsed)
      },
      normalizedFileType
    );
    if (!entry) continue;

    results.push({
      entry,
      score: scoreTopicMetaMatch({ title, slug, awnName, relPath, description, tags }, trimmed, parsed)
    });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entry.filePath.localeCompare(b.entry.filePath, "ru");
  });

  const sliced = results.slice(0, limit).map((item) => ({
    ...item.entry,
    topicMatchScore: item.score
  }));
  return {
    query: trimmed,
    scope: "topic",
    fileType: normalizedFileType,
    match: parsed.match,
    results: sliced,
    total: sliced.length
  };
}

const SEARCH_SLOT_LABELS = {
  external: "Content",
  media: "Media",
  inbox: "Inbox",
  scripts: "Скрипты",
  artefacts: "Артефакты",
  repository: "Репозиторий",
  temp: "Временные",
  "quick-notes": "Заметки",
  references: "Источники",
  internal: "Память",
  tabular: "Таблица",
  todo: "TODO",
  configs: "Конфигурации",
  env: ".env",
  description: "Описание темы"
};

function resolveSearchResultDisplay(relPath, meta) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);
  const displayName = base;

  if (meta?.systemFile) {
    return { displayName, locationHint: "Системный файл workspace" };
  }

  if (meta?.externalFile && meta?.nodePath) {
    const topicRel = String(meta.nodePath).replace(/\\/g, "/");
    const topicSlug = path.posix.basename(path.posix.dirname(topicRel));
    const slotLabel = SEARCH_SLOT_LABELS[meta.mode] || meta.source || meta.mode || "файл";
    return { displayName, locationHint: `${topicSlug} · ${slotLabel}` };
  }

  if (meta?.nodePath && meta.mode === "description") {
    const topicSlug = path.posix.basename(String(meta.nodePath).replace(/\\/g, "/")).replace(/\.md$/i, "");
    return { displayName, locationHint: `${topicSlug} · описание темы` };
  }

  if (meta?.nodePath && meta.source) {
    const topicSlug = path.posix.basename(path.posix.dirname(String(meta.nodePath).replace(/\\/g, "/")));
    return {
      displayName,
      locationHint: `${topicSlug} · ${SEARCH_SLOT_LABELS[meta.mode] || meta.source}`
    };
  }

  const storageMatch = normalized.match(/^(.*)\/awn-storage\/([^/]+)\//i);
  if (storageMatch) {
    const topicSlug = path.posix.basename(storageMatch[1]);
    const slotKey = storageMatch[2].toLowerCase();
    const slotLabel =
      SEARCH_SLOT_LABELS[slotKey] ||
      slotKey.charAt(0).toUpperCase() + slotKey.slice(1);
    return { displayName, locationHint: `${topicSlug} · ${slotLabel}` };
  }

  const parts = normalized.split("/").filter(Boolean);
  if (parts.length >= 2) {
    return { displayName, locationHint: parts.slice(-3, -1).join(" / ") || parts[0] };
  }

  return { displayName, locationHint: normalized || "Workspace" };
}

function matchesFilename(relPath, query, parsed = null) {
  const p = parsed || parseSearchQuery(query);
  const base = path.basename(relPath);
  const stem = base.replace(/\.sidecar\.md$/i, "").replace(/\.[^./]+$/i, "");
  return (
    matchesSearchHaystack(base, p) ||
    matchesSearchHaystack(stem, p) ||
    matchesSearchHaystack(relPath, p)
  );
}

function extractTagsFromProps(content) {
  const tags = [];
  const text = String(content || "");
  const lines = text.split("\n");
  let inTagsArray = false;
  let activeField = "";

  for (const line of lines) {
    const trimmed = line.trim();
    const blockStart = trimmed.match(/^(?:awn-)?tags:\s*$/i);
    if (blockStart) {
      inTagsArray = true;
      activeField = "tags";
      continue;
    }

    if (inTagsArray && activeField === "tags") {
      const itemMatch = line.match(/^\s*-\s*(.+)$/);
      if (itemMatch) {
        tags.push(itemMatch[1].trim().replace(/^["']|["']$/g, ""));
        continue;
      }
      if (!/^\s*-/.test(line)) {
        inTagsArray = false;
        activeField = "";
      }
    }

    const inlineMatch = trimmed.match(/^(?:awn-)?tags:\s*(.+)$/i);
    if (inlineMatch) {
      const raw = inlineMatch[1].trim();
      if (raw.startsWith("[") && raw.endsWith("]")) {
        raw
          .slice(1, -1)
          .split(",")
          .map((part) => part.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean)
          .forEach((tag) => tags.push(tag));
      } else {
        raw
          .split(",")
          .map((part) => part.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean)
          .forEach((tag) => tags.push(tag));
      }
    }

    const singleTagMatch = trimmed.match(/^tag:\s*(.+)$/i);
    if (singleTagMatch) {
      tags.push(singleTagMatch[1].trim().replace(/^["']|["']$/g, ""));
    }
  }

  return [...new Set(tags.filter(Boolean))];
}

async function collectNodeMdFiles(dirAbsolute, prefix = "", files = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (shouldSkipSearchEntry(entry.name, entry.isDirectory())) continue;
    const absolute = path.join(dirAbsolute, entry.name);
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      await collectNodeMdFiles(absolute, relative.replace(/\\/g, "/"), files);
      continue;
    }

    if (/\.node\.md$/i.test(entry.name)) {
      files.push(relative.replace(/\\/g, "/"));
    }
  }

  return files;
}

async function searchByFilename(query, limit = 30, fileType = "all", match = "relaxed") {
  const trimmed = String(query || "").trim();
  const normalizedFileType = normalizeSearchFileType(fileType);
  const parsed = parseSearchQuery(trimmed, { match });
  if (!trimmed) {
    return { query: trimmed, scope: "filename", fileType: normalizedFileType, match: parsed.match, results: [], total: 0 };
  }

  const relFiles = await collectSearchableFiles(getAgentRoot());
  const results = [];

  for (const relPath of relFiles) {
    if (!matchesFilename(relPath, trimmed, parsed)) continue;

    const meta = await resolveSearchResultMeta(relPath);
    const displayName = path.basename(relPath);
    const entry = buildSearchResultEntry(
      relPath,
      meta,
      {
        snippet: displayName,
        matchCount: 1
      },
      normalizedFileType
    );
    if (!entry) continue;

    results.push({ entry, score: scoreFilenameMatch(relPath, trimmed, parsed) });
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.entry.filePath.localeCompare(b.entry.filePath, "ru");
  });

  const sliced = results.slice(0, limit).map((item) => item.entry);
  return {
    query: trimmed,
    scope: "filename",
    fileType: normalizedFileType,
    match: parsed.match,
    results: sliced,
    total: sliced.length
  };
}

async function searchByContent(query, limit = 30, fileType = "all", match = "relaxed") {
  const trimmed = String(query || "").trim();
  const normalizedFileType = normalizeSearchFileType(fileType);
  const parsed = parseSearchQuery(trimmed, { match });
  const minLen = parsed.mode === "wildcard" ? 1 : 2;
  if (trimmed.length < minLen) {
    return { query: trimmed, scope: "content", fileType: normalizedFileType, match: parsed.match, results: [], total: 0 };
  }

  const relFiles = await collectSearchableFiles(getAgentRoot());
  const results = [];

  for (const relPath of relFiles) {
    if (!isTextSearchableFileName(path.basename(relPath))) continue;

    const absolute = normalizeWorkspacePath(relPath);
    if (!absolute) continue;

    let content = "";
    try {
      content = await fs.readFile(absolute, "utf-8");
    } catch {
      continue;
    }

    if (!matchesSearchHaystack(content, parsed)) continue;

    const meta = await resolveSearchResultMeta(relPath);
    const entry = buildSearchResultEntry(
      relPath,
      meta,
      {
        snippet: buildSearchSnippet(content, trimmed, 64, parsed),
        matchCount: countTextMatches(content, trimmed, parsed)
      },
      normalizedFileType
    );
    if (!entry) continue;

    results.push(entry);
    if (results.length >= limit) break;
  }

  results.sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return a.filePath.localeCompare(b.filePath, "ru");
  });

  return { query: trimmed, scope: "content", fileType: normalizedFileType, match: parsed.match, results, total: results.length };
}

async function searchAll(query, limit = 30, fileType = "all", match = "relaxed") {
  const trimmed = String(query || "").trim();
  const normalizedFileType = normalizeSearchFileType(fileType);
  const parsed = parseSearchQuery(trimmed, { match });
  if (!trimmed) {
    return { query: trimmed, scope: "all", fileType: normalizedFileType, match: parsed.match, results: [], total: 0 };
  }

  const merged = new Map();

  const addResult = (entry, kind, scoreBoost = 0) => {
    if (!entry?.filePath) return;
    const key = entry.filePath;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, {
        ...entry,
        matchKinds: [kind],
        searchScore: scoreBoost + (entry.matchCount || 1)
      });
      return;
    }
    if (!existing.matchKinds.includes(kind)) existing.matchKinds.push(kind);
    if (kind === "content" && entry.snippet) existing.snippet = entry.snippet;
    existing.matchCount = Math.max(existing.matchCount || 0, entry.matchCount || 0);
    existing.searchScore = Math.max(existing.searchScore || 0, scoreBoost + (entry.matchCount || 1));
  };

  const filenameData = await searchByFilename(trimmed, Math.max(limit * 3, 60), normalizedFileType, match);
  for (const entry of filenameData.results) {
    addResult(entry, "filename", scoreFilenameMatch(entry.filePath, trimmed, parsed));
  }

  if (trimmed.length >= 1) {
    const topicData = await searchByTopicMeta(trimmed, Math.max(limit * 2, 40), normalizedFileType, match);
    for (const entry of topicData.results) {
      addResult(entry, "topic", entry.topicMatchScore || 240);
    }
  }

  const contentMinLen = parsed.mode === "wildcard" ? 1 : 2;
  if (trimmed.length >= contentMinLen) {
    const contentData = await searchByContent(trimmed, Math.max(limit * 3, 60), normalizedFileType, match);
    for (const entry of contentData.results) {
      addResult(entry, "content", (entry.matchCount || 1) * 5);
    }
  }

  const results = [...merged.values()]
    .sort((a, b) => {
      if (b.searchScore !== a.searchScore) return b.searchScore - a.searchScore;
      return a.filePath.localeCompare(b.filePath, "ru");
    })
    .slice(0, limit)
    .map(({ searchScore, matchKinds, ...entry }) => ({
      ...entry,
      matchKinds,
      matchKindLabel: formatSearchMatchKindLabel(matchKinds)
    }));

  const enrichedResults = await enrichSearchResults(results);

  return {
    query: trimmed,
    scope: "all",
    fileType: normalizedFileType,
    match: parsed.match,
    results: enrichedResults,
    total: enrichedResults.length
  };
}

async function searchByDescription(query, limit = 30) {
  const trimmed = String(query || "").trim();
  if (trimmed.length < 2) {
    return { query: trimmed, scope: "description", results: [], total: 0 };
  }

  const relFiles = await collectNodeMdFiles(getAgentRoot());
  const qLower = trimmed.toLowerCase();
  const results = [];

  for (const relPath of relFiles) {
    const absolute = normalizeWorkspacePath(relPath);
    if (!absolute) continue;

    let content = "";
    try {
      content = await fs.readFile(absolute, "utf-8");
    } catch {
      continue;
    }

    if (!content.toLowerCase().includes(qLower)) continue;

    results.push({
      nodePath: relPath,
      mode: "description",
      source: "Описание",
      filePath: relPath,
      snippet: buildSearchSnippet(content, trimmed),
      matchCount: countTextMatches(content, trimmed)
    });

    if (results.length >= limit) break;
  }

  results.sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return a.filePath.localeCompare(b.filePath, "ru");
  });

  return { query: trimmed, scope: "description", results, total: results.length };
}

async function searchByTags(query, limit = 30, fileType = "all", match = "relaxed") {
  const trimmed = String(query || "").trim();
  const normalizedFileType = normalizeSearchFileType(fileType);
  const parsed = parseSearchQuery(trimmed, { match });
  const minLen = parsed.mode === "wildcard" ? 1 : 2;
  if (trimmed.length < minLen) {
    return { query: trimmed, scope: "tags", fileType: normalizedFileType, match: parsed.match, results: [], total: 0 };
  }

  const relFiles = await collectNodeMdFiles(getAgentRoot());
  const lookup = await getAgentCatalogLookupMaps();
  const tagMap = lookup?.tags;
  const results = [];

  for (const relPath of relFiles) {
    let propsContent = "";
    try {
      const { frontmatter } = await readNodeFrontmatterContent(relPath);
      propsContent = frontmatter;
    } catch {
      continue;
    }
    if (!propsContent.trim()) continue;

    const tags = extractTagsFromProps(propsContent);
    let matchingTags = tags.filter((tag) => {
      const label = tagMap?.get(tag) || tag;
      return matchesSearchHaystack(`${tag} ${label}`, parsed);
    });
    if (matchingTags.length === 0) {
      const combined = tags.map((tag) => `${tagMap?.get(tag) || tag} ${tag}`).join(" ");
      if (!matchesSearchHaystack(combined, parsed)) continue;
      matchingTags = tags.filter((tag) => {
        const label = tagMap?.get(tag) || tag;
        if (parsed.mode === "relaxed" && parsed.terms.length > 0) {
          return parsed.terms.some(
            (term) =>
              tag.toLowerCase().includes(term.toLowerCase()) ||
              String(label).toLowerCase().includes(term.toLowerCase())
          );
        }
        return true;
      });
      if (matchingTags.length === 0) matchingTags = tags;
    }

    const snippetTags = matchingTags.map((tag) => {
      const label = tagMap?.get(tag);
      return label && label !== tag ? `${label} (#${tag})` : `#${tag}`;
    });

    const meta = {
      nodePath: relPath,
      mode: "description",
      source: "Тэги"
    };
    const entry = buildSearchResultEntry(
      relPath,
      meta,
      {
        snippet: snippetTags.join(", "),
        matchCount: matchingTags.length
      },
      normalizedFileType
    );
    if (!entry) continue;

    results.push(entry);
    if (results.length >= limit) break;
  }

  results.sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return a.filePath.localeCompare(b.filePath, "ru");
  });

  return { query: trimmed, scope: "tags", fileType: normalizedFileType, match: parsed.match, results, total: results.length };
}

async function searchWorkspaceContent(query, limit = 30, scope = "all", fileType = "all", match = "relaxed") {
  const normalizedScope = normalizeSearchScope(scope);
  const normalizedFileType = normalizeSearchFileType(fileType);
  const normalizedMatch = normalizeSearchMatchMode(match);
  let data;
  if (normalizedScope === "all") data = await searchAll(query, limit, normalizedFileType, normalizedMatch);
  else if (normalizedScope === "filename") data = await searchByFilename(query, limit, normalizedFileType, normalizedMatch);
  else if (normalizedScope === "tags") data = await searchByTags(query, limit, normalizedFileType, normalizedMatch);
  else data = await searchByContent(query, limit, normalizedFileType, normalizedMatch);

  if (normalizedScope !== "all" && Array.isArray(data?.results)) {
    data.results = await enrichSearchResults(data.results);
  }
  return data;
}

async function searchGlobalAcrossAgents(query, agentIds, limit = 50, scope = "content", fileType = "all", match = "relaxed") {
  const trimmed = String(query || "").trim();
  const normalizedScope = normalizeSearchScope(scope);
  const normalizedFileType = normalizeSearchFileType(fileType);
  const ids = Array.isArray(agentIds) ? agentIds.filter(Boolean) : [];
  const perAgentLimit = Math.max(5, Math.ceil(limit / Math.max(ids.length, 1)));
  const merged = [];

  for (const agentId of ids) {
    const agent = resolveAgent(agentId);
    if (!agent || isPlatformAgentId(agent.id)) continue;

    try {
      const data = await runWithAgent(agentId, () =>
        searchWorkspaceContent(trimmed, perAgentLimit, normalizedScope, normalizedFileType, match)
      );
      const agentName = agent.name || agent.id;
      for (const item of data?.results || []) {
        merged.push({ ...item, agentId, agentName });
      }
    } catch {
      // skip agent on search failure
    }
  }

  merged.sort((a, b) => {
    if ((b.matchCount || 0) !== (a.matchCount || 0)) return (b.matchCount || 0) - (a.matchCount || 0);
    const agentCmp = String(a.agentName || a.agentId).localeCompare(String(b.agentName || b.agentId), "ru");
    if (agentCmp !== 0) return agentCmp;
    return String(a.filePath || a.nodePath || "").localeCompare(String(b.filePath || b.nodePath || ""), "ru");
  });

  return {
    query: trimmed,
    scope: normalizedScope,
    results: merged.slice(0, limit),
    total: merged.length,
    agents: ids
  };
}

async function handleApiForAgent(req, res, url) {
  if (await shellHandlers.tryHandleShellApi(req, res, url, {
    agentId: getActiveAgentId(),
    agentRoot: getAgentRoot(),
    projectRoot: getProjectRoot()
  })) {
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/search") {
    const query = url.searchParams.get("q") || "";
    const scope = url.searchParams.get("scope") || "all";
    const fileType = url.searchParams.get("fileType") || "all";
    const match = url.searchParams.get("match") || "relaxed";
    const limitRaw = Number(url.searchParams.get("limit") || 30);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30;

    try {
      const data = await searchWorkspaceContent(query, limit, scope, fileType, match);
      return sendJson(res, 200, data);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to search content", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/menu") {
    try {
      const maxDepthRaw = Number(url.searchParams.get("maxDepth"));
      const maxDepth = Number.isFinite(maxDepthRaw)
        ? Math.min(20, Math.max(1, Math.floor(maxDepthRaw)))
        : 7;
      const menu = await buildAgentMenu(getAgentRoot(), { maxDepth });
      return sendJson(res, 200, menu);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to read Workspaces menu", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/menu/branch") {
    try {
      const folderPath = String(url.searchParams.get("folderPath") || "").trim();
      if (!folderPath) {
        return sendJson(res, 400, { error: "folderPath is required" });
      }
      const maxDepthRaw = Number(url.searchParams.get("maxDepth"));
      const maxDepth = Number.isFinite(maxDepthRaw)
        ? Math.min(20, Math.max(1, Math.floor(maxDepthRaw)))
        : 7;
      const branchDepthRaw = Number(url.searchParams.get("branchDepth"));
      const branchDepth = Number.isFinite(branchDepthRaw)
        ? Math.min(20, Math.max(1, Math.floor(branchDepthRaw)))
        : 3;
      const branch = await buildAgentMenuBranch(getAgentRoot(), folderPath, { maxDepth, branchDepth });
      return sendJson(res, 200, branch);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read menu branch",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/git/status") {
    try {
      const status = await buildAgentGitStatus();
      return sendJson(res, 200, status);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read git status",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/large-files") {
    try {
      const minMbRaw = Number(url.searchParams.get("minMb") || 45);
      const minMb = Number.isFinite(minMbRaw) ? Math.max(1, minMbRaw) : 45;
      const report = await buildAgentLargeFilesReport(minMb * 1024 * 1024);
      return sendJson(res, 200, report);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to scan large files",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/broken-links") {
    try {
      const report = await buildAgentBrokenLinksReport(getAgentRoot());
      return sendJson(res, 200, report);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to scan broken links",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/workspace-stats") {
    try {
      const stats = await buildAgentWorkspaceStats();
      return sendJson(res, 200, stats);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read workspace stats",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/topic-sizes") {
    try {
      const report = await buildAgentTopicSizeReport();
      return sendJson(res, 200, report);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read topic sizes",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/storage-layout") {
    try {
      const layout = await buildAgentStorageLayout();
      return sendJson(res, 200, layout);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read storage layout",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/workspace-table") {
    try {
      const table = await buildAgentWorkspaceTable();
      return sendJson(res, 200, table);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read workspace table",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/canonical-model") {
    try {
      const payload = getCanonicalModelPayload(getProjectRoot(), getAgentRoot());
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read canonical model",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/site-map") {
    try {
      const payload = await buildAgentSiteMap();
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read site map",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/runtime-map") {
    try {
      const filter = parseRuntimeFilterFromSearchParams(url.searchParams) || DEFAULT_RUNTIME_SYNC_FILTER;
      const payload = await buildAgentRuntimeMap(filter);
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read runtime map",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/runtime-registry") {
    try {
      const filter = parseRuntimeFilterFromSearchParams(url.searchParams);
      const registry = await buildAgentRuntimeRegistry(filter);
      return sendJson(res, 200, registry);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read runtime registry",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/session-context") {
    try {
      const context = await buildAgentSessionContext();
      return sendJson(res, 200, context);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to build session context",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/timeline") {
    try {
      const limitRaw = Number(url.searchParams.get("limit"));
      const timeline = await buildAgentTimeline(
        Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 150
      );
      return sendJson(res, 200, timeline);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read workspace timeline",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/activity") {
    try {
      const sinceRaw = Number(url.searchParams.get("since"));
      const limitRaw = Number(url.searchParams.get("limit"));
      const payload = await listWorkspaceActivityEvents({
        since: Number.isFinite(sinceRaw) && sinceRaw > 0 ? sinceRaw : 0,
        limit: Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 50
      });
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read workspace activity",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/agent/activity/clear") {
    try {
      const payload = await clearWorkspaceActivity();
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to clear workspace activity",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/agent/activity/notify") {
    try {
      const payload = await readJsonBody(req);
      const title = String(payload.title || payload.label || "").trim();
      const message = String(payload.message || payload.text || payload.body || "").trim();
      const manifestPath = String(payload.manifestPath || payload.path || "").trim();
      if (!title && !message) {
        return sendJson(res, 400, { error: "title or message is required" });
      }
      const event = await recordWorkspaceActivityAsync({
        action: "notify",
        path: manifestPath || `${WORKSPACE_ACTIVITY_DIR}/notification`,
        manifestPath: manifestPath || null,
        label: title || message.slice(0, 120),
        message: message || title
      });
      return sendJson(res, 200, { event });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to push workspace notification",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/markdown-index") {
    try {
      const index = await buildAgentMarkdownLinkIndex();
      return sendJson(res, 200, index);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read markdown index",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/menu/sort") {
    try {
      const payload = await readJsonBody(req);
      const folderPathRaw = typeof payload.folderPath === "string" ? payload.folderPath : ".";
      const order = Array.isArray(payload.order)
        ? payload.order.map((name) => String(name || "").trim()).filter(Boolean)
        : [];

      const folderAbsolute = await resolveSortFolderAbsolute(folderPathRaw);
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid folder path" });

      const folderStat = await fs.stat(folderAbsolute).catch(() => null);
      if (!folderStat || !folderStat.isDirectory()) {
        return sendJson(res, 404, { error: "Folder not found" });
      }

      const sortAbsolute = path.join(folderAbsolute, MENU_SORT_FILE);
      await fs.writeFile(sortAbsolute, `${JSON.stringify({ order }, null, 2)}\n`, "utf-8");
      return sendJson(res, 200, { folderPath: folderPathRaw || ".", order });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to save menu sort",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/chpu/resolve") {
    const chpuPath = String(url.searchParams.get("path") || "").trim();
    try {
      const resolved = await resolveChpuPath(getAgentRoot(), chpuPath);
      return sendJson(res, 200, resolved);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to resolve CHPU path",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/system-files") {
    try {
      const files = await listAgentRootSystemFiles();
      return sendJson(res, 200, { files });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to check system files", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/system-file") {
    const name = url.searchParams.get("name");
    if (!name) return sendJson(res, 400, { error: "Missing name query parameter" });

    const canonical = canonicalSystemFileName(name);
    if (!canonical) return sendJson(res, 400, { error: "Invalid system file name" });

    const absolute = await resolveExistingSystemFileAbsolute(canonical);

    try {
      const content = await fs.readFile(absolute, "utf-8");
      return sendJson(res, 200, { name: canonical, content, exists: true });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return sendJson(res, 200, { name: canonical, content: "", exists: false });
      }
      return sendJson(res, 500, { error: "Failed to read system file", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/system-file") {
    try {
      const payload = await readJsonBody(req);
      const name = payload.name;
      const content = typeof payload.content === "string" ? payload.content : null;
      if (!name) return sendJson(res, 400, { error: "Missing file name" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const canonical = canonicalSystemFileName(name);
      if (!canonical) return sendJson(res, 400, { error: "Invalid system file name" });

      const absolute = resolveSystemFileAbsolute(canonical);
      if (!absolute) return sendJson(res, 400, { error: "Invalid system file name" });

      const serviceManifestRel = resolveSystemFileHistoryManifestRel();
      const targetRelPath = resolveSystemFileHistoryTargetRel(canonical);
      if (serviceManifestRel && targetRelPath) {
        await ensureManifestStorageSlotDir(serviceManifestRel);
        await writeWorkspaceTextFileWithHistory(serviceManifestRel, targetRelPath, content);
      } else {
        await fs.mkdir(path.dirname(absolute), { recursive: true });
        await fs.writeFile(absolute, content, "utf-8");
      }
      return sendJson(res, 200, { name: canonical, content, exists: true });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save system file", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/repo-loose-file") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    try {
      const normalized = String(relPath || "").replace(/\\/g, "/").trim();
      if (!(await isGitRepoLooseFileRelPath(normalized))) {
        return sendJson(res, 400, { error: "Not a git repo loose file path" });
      }
      const absolute = normalizeWorkspacePath(normalized);
      if (!absolute) return sendJson(res, 400, { error: "Invalid file path" });
      try {
        const content = await fs.readFile(absolute, "utf-8");
        return sendJson(res, 200, { path: normalized, content, exists: true });
      } catch (error) {
        if (error && error.code === "ENOENT") {
          return sendJson(res, 200, { path: normalized, content: "", exists: false });
        }
        throw error;
      }
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read git repo loose file",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/repo-loose-file") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const content = typeof payload.content === "string" ? payload.content : null;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const normalized = String(relPath || "").replace(/\\/g, "/").trim();
      if (!(await isGitRepoLooseFileRelPath(normalized))) {
        return sendJson(res, 400, { error: "Not a git repo loose file path" });
      }
      const absolute = normalizeWorkspacePath(normalized);
      if (!absolute) return sendJson(res, 400, { error: "Invalid file path" });

      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, content, "utf-8");
      return sendJson(res, 200, { path: normalized, content, exists: true });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to save git repo loose file",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const canonicalRelPath = await resolveCanonicalManifestRelPath(relPath);
    let absolute = normalizeWorkspacePath(canonicalRelPath);
    if (!absolute) return sendJson(res, 400, { error: "Invalid file path" });
    const isDocumentationTopic = docsRegistry.isDocumentationTopicMdRelPath(canonicalRelPath);
    if (!isManifestMdAbsolute(absolute) && !isDocumentationTopic) {
      return sendJson(res, 400, { error: "Only manifest markdown files are allowed (*.md, _registration.md)" });
    }

    const serviceFolder = getAgentKitFolder();
    const serviceManifestRel = serviceFolder ? getServiceAreaManifestRel(serviceFolder) : null;
    if (serviceManifestRel && canonicalRelPath.replace(/\\/g, "/") === serviceManifestRel) {
      absolute = normalizeWorkspacePath(canonicalRelPath);
    }

    try {
      const content = await fs.readFile(absolute, "utf-8");
      return sendJson(res, 200, { path: canonicalRelPath, content });
    } catch (error) {
      return sendJson(res, 404, { error: "File not found", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/file/title") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const { display, diskSlug } = resolveContentItemNames(payload);
      const legacyTitle = String(payload.title || payload.name || "").trim();
      const renameTarget = diskSlug || sanitizeSlugInput(legacyTitle);

      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!renameTarget && !display && !legacyTitle) {
        return sendJson(res, 400, { error: "Title cannot be empty" });
      }
      if (!renameTarget) return sendJson(res, 400, { error: "Invalid slug" });

      const resolvedRelPath = String(await resolveExistingWorkspaceRelPath(relPath)).replace(/\\/g, "/");
      if (isServiceAreaRootManifestRel(resolvedRelPath) || isContainerAreaRootManifestRel(resolvedRelPath)) {
        return sendJson(res, 403, {
          error: "Служебная папка workspace не может быть переименована"
        });
      }
      if (isSystemReferenceManifestRel(resolvedRelPath)) {
        return sendJson(res, 403, { error: "Системный справочник нельзя переименовать" });
      }
      const absolute = normalizeWorkspacePath(resolvedRelPath);
      if (!absolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(absolute)) return sendJson(res, 400, { error: "Only manifest markdown files are allowed (*.md, _registration.md)" });

      const normalized = resolvedRelPath;
      let nextRelPath = normalized;
      let nextAbsolute = absolute;

      if (isAreaManifestRelPath(normalized) && !parsePartFolderManifestRel(normalized)) {
        const folderRelPath = path.dirname(normalized).replace(/\\/g, "/");
        if (!folderRelPath || folderRelPath === ".") {
          return sendJson(res, 400, { error: "Root Workspaces folder cannot be renamed" });
        }
        const parentRelPath = path.dirname(folderRelPath).replace(/\\/g, "/");
        const parentAbsolutePath = await resolveExistingWorkspaceDirAbsolute(
          !parentRelPath || parentRelPath === "." ? "" : parentRelPath
        );
        if (!parentAbsolutePath) return sendJson(res, 400, { error: "Invalid parent folder path" });

        const currentFolderAbsolute = path.dirname(absolute);
        const currentFolderName = path.basename(currentFolderAbsolute);
        const oldAreaSortSlug = getMenuSortSlugFromFolderRel(folderRelPath);
        let oldAreaSortLegacyKeys = [];
        try {
          const legacyLabel = await readNodeDisplayLabelForManifestRel(normalized);
          if (legacyLabel && legacyLabel !== oldAreaSortSlug) {
            oldAreaSortLegacyKeys = [legacyLabel];
          }
        } catch {
          // ignore
        }
        const targetFolderName = isStorageFolderName(currentFolderName)
          ? toStorageFolderName(renameTarget)
          : toAreaFolderName(renameTarget);
        if (!targetFolderName) return sendJson(res, 400, { error: "Folder name cannot be empty" });
        const targetFolderAbsolute = path.join(parentAbsolutePath, targetFolderName);

        if (await targetPathOccupiedByOther(currentFolderAbsolute, targetFolderAbsolute)) {
          return sendJson(res, 409, { error: "Folder with this name already exists" });
        }

        await renamePathCaseAware(currentFolderAbsolute, targetFolderAbsolute);
        await updateMenuSortOrderSlug(
          parentAbsolutePath,
          oldAreaSortSlug,
          stripTopicPrefix(targetFolderName),
          oldAreaSortLegacyKeys
        );

        const targetFolderRelPath =
          parentRelPath && parentRelPath !== "."
            ? path.join(parentRelPath, targetFolderName).replace(/\\/g, "/")
            : targetFolderName;
        nextRelPath = path.join(targetFolderRelPath, AREA_MANIFEST_FILE).replace(/\\/g, "/");
        nextAbsolute = path.join(targetFolderAbsolute, AREA_MANIFEST_FILE);
      } else if (!parsePartFolderManifestRel(normalized)) {
        const dirRelPath = path.dirname(normalized).replace(/\\/g, "/");
        const dirAbsolute = await resolveExistingWorkspaceDirAbsolute(
          !dirRelPath || dirRelPath === "." ? "" : dirRelPath
        );
        if (!dirAbsolute) return sendJson(res, 400, { error: "Invalid file directory path" });

        const nextName = toNodeFileName(renameTarget);
        if (!nextName) return sendJson(res, 400, { error: "Invalid file name" });
        const oldTopicSortSlug = getManifestSlugFromRel(normalized);
        let oldTopicSortLegacyKeys = [];
        try {
          const legacyLabel = await readNodeDisplayLabelForManifestRel(normalized);
          if (legacyLabel && legacyLabel !== oldTopicSortSlug) {
            oldTopicSortLegacyKeys = [legacyLabel];
          }
        } catch {
          // ignore
        }
        const targetAbsolute = path.join(dirAbsolute, nextName);
        const targetRelPath =
          !dirRelPath || dirRelPath === "."
            ? nextName
            : path.join(dirRelPath, nextName).replace(/\\/g, "/");

        if (targetAbsolute !== absolute) {
          if (await targetPathOccupiedByOther(absolute, targetAbsolute)) {
            return sendJson(res, 409, { error: "File with this name already exists" });
          }
          const oldContentAbsolute = normalizeWorkspacePath(toContentFilePath(normalized));
          const newContentAbsolute = normalizeWorkspacePath(toContentFilePath(targetRelPath));
          const oldTodoAbsolute = normalizeWorkspacePath(toTodoFilePath(normalized));
          const newTodoAbsolute = normalizeWorkspacePath(toTodoFilePath(targetRelPath));
          const oldConfigAbsolute = normalizeWorkspacePath(toNodeConfigFilePath(normalized));
          const newConfigAbsolute = normalizeWorkspacePath(toNodeConfigFilePath(targetRelPath));
          await renamePathCaseAware(absolute, targetAbsolute);
          if (oldContentAbsolute && newContentAbsolute) {
            await renameIfExists(oldContentAbsolute, newContentAbsolute);
          }
          if (oldTodoAbsolute && newTodoAbsolute) {
            await renameIfExists(oldTodoAbsolute, newTodoAbsolute);
          }
          if (oldConfigAbsolute && newConfigAbsolute) {
            await renameIfExists(oldConfigAbsolute, newConfigAbsolute);
          }
          const oldNamedStorageAbsolute = getNamedStorageRootAbsolute(normalized);
          const newNamedStorageAbsolute = getNamedStorageRootAbsolute(targetRelPath);
          if (oldNamedStorageAbsolute && newNamedStorageAbsolute && oldNamedStorageAbsolute !== newNamedStorageAbsolute) {
            await renameIfExists(oldNamedStorageAbsolute, newNamedStorageAbsolute);
          }
          await updateMenuSortOrderSlug(
            dirAbsolute,
            oldTopicSortSlug,
            stripTopicPrefix(nextName),
            oldTopicSortLegacyKeys
          );
          nextRelPath = targetRelPath;
          nextAbsolute = targetAbsolute;
        }
      }

      let content = await fs.readFile(nextAbsolute, "utf-8");
      const resolvedSlug = isAreaManifestRelPath(nextRelPath) && !parsePartFolderManifestRel(nextRelPath)
        ? stripTopicPrefix(path.basename(path.dirname(nextAbsolute)))
        : getManifestSlugFromRel(nextRelPath);

      if (shouldSyncAwnNameOnTitleRename(payload, display, resolvedSlug)) {
        const { frontmatter, body } = splitNodeFrontmatter(content);
        const nextFrontmatter = applyAwnNameToFrontmatter(frontmatter, display, resolvedSlug);
        const nextContent = joinNodeFrontmatter(nextFrontmatter, body);
        if (nextContent !== content) {
          await fs.writeFile(nextAbsolute, nextContent, "utf-8");
          content = nextContent;
        }
      }

      const oldRel = stripAgentContentPrefixFromRelPath(normalized);
      const newRel = stripAgentContentPrefixFromRelPath(nextRelPath);
      let linkRewrite = { filesUpdated: 0, linksUpdated: 0, files: [] };
      if (isAreaManifestRelPath(normalized) && !parsePartFolderManifestRel(normalized)) {
        const oldFolder = path.dirname(normalized).replace(/\\/g, "/");
        const newFolder = path.dirname(nextRelPath).replace(/\\/g, "/");
        if (oldFolder && newFolder && oldFolder !== newFolder) {
          linkRewrite = await rewriteMarkdownLinksForRename({
            prefixMappings: [{ oldPrefix: oldFolder, newPrefix: newFolder }]
          });
        }
      } else if (oldRel && newRel && oldRel !== newRel) {
        linkRewrite = await rewriteMarkdownLinksForRename({
          exactMappings: [{ oldRel, newRel }]
        });
      }

      return sendJson(res, 200, {
        path: newRel,
        title: display || legacyTitle || renameTarget,
        displayName: display || legacyTitle || renameTarget,
        slug: resolvedSlug,
        content,
        linkRewrite
      });
    } catch (error) {
      return sendRenameError(res, error);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/file/content") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const content = typeof payload.content === "string" ? payload.content : null;

      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const canonicalRelPath = await resolveCanonicalManifestRelPath(relPath);
      const absolute = normalizeWorkspacePath(canonicalRelPath);
      if (!absolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(absolute)) return sendJson(res, 400, { error: "Only manifest markdown files are allowed (*.md, _registration.md)" });

      const raw = (await readNodeManifestRaw(absolute)) ?? "";
      const { frontmatter: diskFrontmatter } = splitNodeFrontmatter(raw);
      const stampedContent = applyAwnTimestampsToMarkdownContent(content, diskFrontmatter);
      await writeWorkspaceTextFileWithHistory(canonicalRelPath, canonicalRelPath, stampedContent);
      if (canonicalRelPath !== String(relPath).replace(/\\/g, "/")) {
        const legacyAbsolute = normalizeWorkspacePath(relPath);
        if (legacyAbsolute && legacyAbsolute !== absolute) {
          await removeIfExists(legacyAbsolute);
        }
      }
      return sendJson(res, 200, { path: canonicalRelPath, content: stampedContent });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to save content",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file/history") {
    const manifestRelPath = url.searchParams.get("path") || "";
    const mode = String(url.searchParams.get("mode") || "description").trim();
    const file = url.searchParams.get("file") || "";
    const systemName = url.searchParams.get("name") || "";

    try {
      const history = await listFileHistoryVersions({ manifestRelPath, mode, file, systemName });
      return sendJson(res, 200, {
        path: manifestRelPath,
        mode,
        file: file || null,
        systemName: systemName || null,
        target: history.target,
        manifestPath: history.manifestPath,
        versions: history.versions
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to list file history",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file/history/content") {
    const manifestRelPath = url.searchParams.get("path") || "";
    const mode = String(url.searchParams.get("mode") || "description").trim();
    const file = url.searchParams.get("file") || "";
    const systemName = url.searchParams.get("name") || "";
    const version = String(url.searchParams.get("version") || "").trim();
    if (!version || !isHistoryVersionFileName(version)) {
      return sendJson(res, 400, { error: "Invalid history version" });
    }

    try {
      const historyManifestRel = await resolveHistoryManifestRel({ manifestRelPath, mode, systemName });
      const targetRelPath = await resolveHistoryTargetRelPath({ manifestRelPath, mode, file, systemName });
      if (!historyManifestRel || !targetRelPath) {
        return sendJson(res, 400, { error: "Invalid history target" });
      }
      const versionFile = await readHistoryVersionFileWithManifestFallbacks({
        manifestRelPath: historyManifestRel,
        targetRelPath,
        version,
        manifestFallbacks:
          mode === "system"
            ? getSystemFileHistoryManifestCandidates(historyManifestRel).slice(1)
            : []
      });
      if (!versionFile) return sendJson(res, 404, { error: "History version not found" });
      return sendJson(res, 200, {
        version,
        label: formatHistoryVersionTimestampLabel(version),
        relPath: versionFile.versionRelPath,
        target: getHistoryRelativeTargetPath(historyManifestRel, targetRelPath),
        content: versionFile.content
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read history version",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file/diff") {
    const relPath = String(url.searchParams.get("path") || "").trim();
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    try {
      const payload = await buildWorkspaceFileDiff(relPath);
      if (!payload) return sendJson(res, 404, { error: "File not found" });
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to build file diff",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/file/diff") {
    try {
      const payload = await readJsonBody(req, 8_000_000);
      const relPath = String(payload.path || "").trim();
      if (!relPath) return sendJson(res, 400, { error: "Missing path" });
      const diffPayload = await buildWorkspaceFileDiff(relPath, {
        oldContent: Object.prototype.hasOwnProperty.call(payload, "oldContent") ? payload.oldContent : null
      });
      if (!diffPayload) return sendJson(res, 404, { error: "File not found" });
      return sendJson(res, 200, diffPayload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to build file diff",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file/revision") {
    const relPath = String(url.searchParams.get("path") || "").trim();
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    try {
      const revision = await readWorkspaceFileRevision(relPath);
      if (!revision) return sendJson(res, 404, { error: "File not found" });
      return sendJson(res, 200, revision);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read file revision",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/file/revisions") {
    try {
      const payload = await readJsonBody(req);
      const paths = Array.isArray(payload.paths) ? payload.paths : [];
      const revisions = await readWorkspaceFileRevisions(paths);
      return sendJson(res, 200, { revisions });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read file revisions",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/file/history/restore") {
    try {
      const payload = await readJsonBody(req);
      const manifestRelPath = payload.path || "";
      const mode = String(payload.mode || "description").trim();
      const file = payload.file || "";
      const systemName = payload.name || "";
      const version = String(payload.version || "").trim();
      if (!version || !isHistoryVersionFileName(version)) {
        return sendJson(res, 400, { error: "Invalid history version" });
      }

      const historyManifestRel = await resolveHistoryManifestRel({ manifestRelPath, mode, systemName });
      const targetRelPath = await resolveHistoryTargetRelPath({ manifestRelPath, mode, file, systemName });
      if (!historyManifestRel || !targetRelPath) {
        return sendJson(res, 400, { error: "Invalid history target" });
      }

      const versionFile = await readHistoryVersionFileWithManifestFallbacks({
        manifestRelPath: historyManifestRel,
        targetRelPath,
        version,
        manifestFallbacks:
          mode === "system"
            ? getSystemFileHistoryManifestCandidates(historyManifestRel).slice(1)
            : []
      });
      if (!versionFile) return sendJson(res, 404, { error: "History version not found" });

      await writeWorkspaceTextFileWithHistory(historyManifestRel, targetRelPath, versionFile.content);
      return sendJson(res, 200, {
        version,
        label: formatHistoryVersionTimestampLabel(version),
        target: getHistoryRelativeTargetPath(historyManifestRel, targetRelPath),
        content: versionFile.content
      });
    } catch (error) {
      if (error && error.code === "ENOENT") return sendJson(res, 404, { error: "History version not found" });
      return sendJson(res, 500, {
        error: "Failed to restore history version",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file/comments") {
    const manifestRelPath = url.searchParams.get("path") || "";
    const mode = String(url.searchParams.get("mode") || "description").trim();
    const file = url.searchParams.get("file") || "";
    const systemName = url.searchParams.get("name") || "";

    try {
      const payload = await listFileComments({ manifestRelPath, mode, file, systemName });
      return sendJson(res, 200, {
        path: manifestRelPath,
        mode,
        file: file || null,
        systemName: systemName || null,
        target: payload.target,
        manifestPath: payload.manifestPath,
        comments: payload.comments
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to list file comments",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/file/comments") {
    try {
      const payload = await readJsonBody(req);
      const manifestRelPath = payload.path || "";
      const mode = String(payload.mode || "description").trim();
      const file = payload.file || "";
      const systemName = payload.name || "";
      const body = String(payload.body || "").trim();
      const author = String(payload.author || "guest").trim() || "guest";
      const replyTo = String(payload.replyTo || "").trim() || null;
      if (!body) return sendJson(res, 400, { error: "Comment body is required" });

      const comment = await createFileComment({
        manifestRelPath,
        mode,
        file,
        systemName,
        body,
        author,
        replyTo
      });
      return sendJson(res, 200, {
        path: manifestRelPath,
        mode,
        file: file || null,
        systemName: systemName || null,
        target: getHistoryRelativeTargetPath(
          await resolveHistoryManifestRel({ manifestRelPath, mode, systemName }),
          await resolveHistoryTargetRelPath({ manifestRelPath, mode, file, systemName })
        ),
        comment
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to create file comment",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/file/comments/reaction") {
    try {
      const payload = await readJsonBody(req);
      const manifestRelPath = payload.path || "";
      const mode = String(payload.mode || "description").trim();
      const file = payload.file || "";
      const systemName = payload.name || "";
      const commentId = String(payload.commentId || payload.id || "").trim();
      const reaction = String(payload.reaction || "up").trim();
      const author = String(payload.author || "guest").trim() || "guest";
      if (!manifestRelPath) return sendJson(res, 400, { error: "Missing path" });
      if (!commentId) return sendJson(res, 400, { error: "Missing comment id" });

      const result = await toggleCommentReaction({
        manifestRelPath,
        mode,
        file,
        systemName,
        commentId,
        reaction,
        author
      });
      return sendJson(res, 200, {
        path: manifestRelPath,
        mode,
        file: file || null,
        systemName: systemName || null,
        commentId,
        reaction,
        ...result
      });
    } catch (error) {
      const message = String(error && error.message ? error.message : error);
      if (/not found/i.test(message)) {
        return sendJson(res, 404, { error: message });
      }
      return sendJson(res, 500, {
        error: "Failed to toggle comment reaction",
        details: message
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/thread") {
    const manifestRelPath = url.searchParams.get("path") || "";
    if (!manifestRelPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    try {
      const payload = await listTopicThread({
        manifestRelPath,
        mode: url.searchParams.get("mode") || "description",
        file: url.searchParams.get("file") || "",
        systemName: url.searchParams.get("name") || ""
      });
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to list thread messages",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/thread") {
    try {
      const payload = await readJsonBody(req);
      const manifestRelPath = payload.path || "";
      const body = String(payload.body || "").trim();
      const role = String(payload.role || "user").trim();
      const author = String(payload.author || "").trim();
      const linkedFiles = String(payload.linkedFiles || "").trim();
      const mode = String(payload.mode || "description").trim();
      const file = payload.file || "";
      const systemName = payload.name || "";
      if (!manifestRelPath) return sendJson(res, 400, { error: "Missing path" });
      if (!body) return sendJson(res, 400, { error: "Message body is required" });

      const message = await appendTopicThreadMessage({
        manifestRelPath,
        body,
        role,
        author,
        linkedFiles,
        mode,
        file,
        systemName
      });
      const threadPayload = await listTopicThread({
        manifestRelPath,
        mode,
        file,
        systemName
      });
      return sendJson(res, 200, {
        path: manifestRelPath,
        target: threadPayload.target,
        scope: threadPayload.scope,
        message
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to append thread message",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/inbox") {
    const manifestRelPath = url.searchParams.get("path") || "";
    if (!manifestRelPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    try {
      const payload = await listInboxItems(manifestRelPath);
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to list inbox items",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/inbox/item") {
    const manifestRelPath = url.searchParams.get("path") || "";
    const file = url.searchParams.get("file") || "";
    if (!manifestRelPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!file) return sendJson(res, 400, { error: "Missing file query parameter" });
    try {
      const payload = await readInboxItem(manifestRelPath, file);
      return sendJson(res, 200, payload);
    } catch (error) {
      const message = String(error && error.message ? error.message : error);
      if (/not found/i.test(message)) {
        return sendJson(res, 404, { error: message });
      }
      return sendJson(res, 500, {
        error: "Failed to read inbox item",
        details: message
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/channels/stream") {
    const scope = String(url.searchParams.get("scope") || "").trim().toLowerCase();
    if (scope === "agent") {
      try {
        await streamAgentChannelEvents(req, res);
        return;
      } catch (error) {
        return sendJson(res, 500, {
          error: "Failed to open agent channel stream",
          details: String(error && error.message ? error.message : error)
        });
      }
    }

    const manifestRelPath = url.searchParams.get("path") || "";
    const watch = url.searchParams.get("watch") || "thread,inbox";
    if (!manifestRelPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    try {
      const nodeAbsolute = await resolveApiManifestAbsolute(manifestRelPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      await streamTopicChannelEvents(req, res, manifestRelPath, watch, {
        mode: url.searchParams.get("mode") || "",
        file: url.searchParams.get("file") || "",
        systemName: url.searchParams.get("name") || ""
      });
      return;
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to open channel stream",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/inbox/triage") {
    try {
      const payload = await readJsonBody(req);
      const manifestRelPath = payload.path || "";
      const file = payload.file || "";
      const action = payload.action || "";
      const status = payload.status || "";
      if (!manifestRelPath) return sendJson(res, 400, { error: "Missing path" });
      if (!file) return sendJson(res, 400, { error: "Missing inbox file" });
      if (!action) return sendJson(res, 400, { error: "Missing triage action" });

      const result = await triageInboxItem({ manifestRelPath, file, action, status });
      return sendJson(res, 200, { path: manifestRelPath, ...result });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to triage inbox item",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/inbox/create") {
    try {
      const payload = await readJsonBody(req);
      const manifestRelPath = payload.path || "";
      const title = String(payload.title || payload.name || "").trim();
      const body = String(payload.body || "").trim();
      const source = String(payload.source || "ui").trim();
      const author = String(payload.author || "").trim();
      if (!manifestRelPath) return sendJson(res, 400, { error: "Missing path" });

      const item = await createInboxItem({ manifestRelPath, title, body, source, author });
      return sendJson(res, 200, { path: manifestRelPath, item });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to create inbox item",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/topic/intake") {
    const manifestRelPath = url.searchParams.get("path") || "";
    if (!manifestRelPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    try {
      const payload = await buildTopicIntakeSummary(manifestRelPath, {
        mentionHandle: url.searchParams.get("mentionHandle") || "",
        mentionAfterId: url.searchParams.get("mentionAfterId") || ""
      });
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read topic intake summary",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/intake/batch") {
    try {
      const payload = await readJsonBody(req);
      const paths = Array.isArray(payload.paths) ? payload.paths : [];
      const batch = await buildIntakeBatchSummary(paths, {
        mentionHandle: payload.mentionHandle || "",
        mentionAfterIds: payload.mentionAfterIds || {}
      });
      return sendJson(res, 200, batch);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read intake batch summary",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/memory/summary") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    try {
      const summary = await buildMemorySummary(relPath);
      if (!summary) return sendJson(res, 400, { error: "Invalid node path" });
      return sendJson(res, 200, summary);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to read memory summary", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/memory/tabular") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    try {
      const tabular = await readTabularMemoryContent(relPath);
      return sendJson(res, 200, tabular);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to read tabular memory", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/memory/tabular") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const content = typeof payload.content === "string" ? payload.content : null;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const resolvedRelPath = await resolveExistingWorkspaceRelPath(relPath);
      const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only manifest markdown files are allowed (*.md, _registration.md)" });

      const tabularRelPath = toTabularFilePath(resolvedRelPath);
      const tabularAbsolute = normalizeWorkspacePath(tabularRelPath);
      if (!tabularAbsolute) return sendJson(res, 400, { error: "Invalid tabular memory path" });

      await writeWorkspaceTextFileWithHistory(resolvedRelPath, tabularRelPath, content);
      const parsed = parseCsvText(content);
      return sendJson(res, 200, {
        path: tabularRelPath,
        content,
        exists: true,
        columns: parsed.columns,
        rows: parsed.rows,
        rowCount: parsed.rows.length
      });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save tabular memory", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/memory/internal") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    try {
      const internal = await readInternalMemoryContent(relPath);
      return sendJson(res, 200, internal);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to read internal memory", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/memory/internal") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const content = typeof payload.content === "string" ? payload.content : null;

      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const resolvedRelPath = await resolveExistingWorkspaceRelPath(relPath);
      const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only manifest markdown files are allowed (*.md, _registration.md)" });

      const memoryRelPath = toContentFilePath(resolvedRelPath);
      const memoryAbsolute = normalizeWorkspacePath(memoryRelPath);
      if (!memoryAbsolute) return sendJson(res, 400, { error: "Invalid internal memory path" });

      await writeWorkspaceTextFileWithHistory(resolvedRelPath, memoryRelPath, content);
      return sendJson(res, 200, { path: memoryRelPath, content });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save internal memory", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/type-catalog") {
    try {
      const payload = getTypeCatalogPayload(getProjectRoot(), getAgentRoot() || "");
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to load type catalog",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/type-health") {
    try {
      const payload = getTypeHealth(getProjectRoot(), getAgentRoot() || "");
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to check type health",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent-system/views") {
    try {
      const agentRoot = getAgentRoot();
      const payload = getViewTypesPayload(getProjectRoot(), agentRoot || "");
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to load view types",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent-system/create-node-types") {
    try {
      const agentRoot = getAgentRoot();
      const payload = getCreateNodeTypesPayload(getProjectRoot(), agentRoot || "");
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to load create-node types",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent-system/all-types") {
    try {
      const agentRoot = getAgentRoot();
      const payload = getTypeCatalogPayload(getProjectRoot(), agentRoot || "");
      const allTypes = (payload.types || []).map((t) => ({
        id: t.id,
        name: t.name || t.id,
        kind: t.kind || "type",
        domain: t.domain || "",
        extends: t.extends || null,
        status: t.status || "active",
        description: t.schema?.description || t.description || "",
        source: t.source || "platform",
        fields: t.schema?.fields || null,
        widget: t.schema?.widget || null,
        storage: t.schema?.storage || null,
        mdbase: t.schema?.mdbase || null,
        settings: t.schema?.settings || null
      }));
      return sendJson(res, 200, { types: allTypes, total: allTypes.length });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to load all types", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent-system/status") {
    try {
      const agentRoot = getAgentRoot();
      if (!agentRoot) return sendJson(res, 400, { error: "Agent not selected" });
      return sendJson(res, 200, getAgentSystemStatus(agentRoot, getProjectRoot()));
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to load agent-system status",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent-system/type") {
    try {
      const agentRoot = getAgentRoot();
      if (!agentRoot) return sendJson(res, 400, { error: "Agent not selected" });
      const relPath = String(url.searchParams.get("path") || "").trim();
      const typeId = String(url.searchParams.get("id") || "").trim();
      let catalogPath = relPath;
      if (!catalogPath && typeId) {
        const payload = getTypeCatalogPayload(getProjectRoot(), agentRoot);
        const match = [...(payload.foundationTypes || []), ...(payload.browseTypes || [])].find(
          (entry) => entry.id === typeId
        );
        catalogPath = match?.catalogFile || "";
      }
      if (!catalogPath) return sendJson(res, 400, { error: "Missing path or id" });
      const detail = getTypeDetailByCatalogPath(getProjectRoot(), agentRoot, catalogPath);
      if (!detail) return sendJson(res, 404, { error: "Type not found", path: catalogPath });
      return sendJson(res, 200, detail);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to load agent-system type",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent-system/file") {
    try {
      const agentRoot = getAgentRoot();
      if (!agentRoot) return sendJson(res, 400, { error: "Agent not selected" });
      const relPath = String(url.searchParams.get("path") || "").trim();
      if (!relPath) return sendJson(res, 400, { error: "Missing path" });
      const payload = await readAgentSystemFile(agentRoot, relPath);
      if (!payload.exists) return sendJson(res, 404, { error: "File not found", path: relPath });
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read agent-system file",
        details: String(error.message || error)
      });
    }
  }

  // Отдаёт JS-рендер блока сырым текстом с JS-MIME — для dynamic import() в UI.
  // Только файлы из awn-system/renderers/*.js.
  if (req.method === "GET" && url.pathname === "/api/agent-system/renderer") {
    try {
      const agentRoot = getAgentRoot();
      if (!agentRoot) return sendJson(res, 400, { error: "Agent not selected" });
      let relPath = String(url.searchParams.get("path") || "").trim();
      const slug = String(url.searchParams.get("slug") || "").trim();
      if (!relPath && slug) relPath = `awn-system/renderers/${slug}.js`;
      const norm = relPath.replace(/\\/g, "/");
      if (!/^awn-system\/renderers\/[A-Za-z0-9_-]+\.js$/.test(norm)) {
        return sendJson(res, 400, { error: "Invalid renderer path" });
      }
      const payload = await readAgentSystemFile(agentRoot, relPath);
      if (!payload.exists) return sendJson(res, 404, { error: "Renderer not found", path: relPath });
      res.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-cache"
      });
      return res.end(payload.content || "");
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read renderer",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/agent-system/file") {
    try {
      const agentRoot = getAgentRoot();
      if (!agentRoot) return sendJson(res, 400, { error: "Agent not selected" });
      const payload = await readJsonBody(req);
      const relPath = String(payload?.path || "").trim();
      if (!relPath) return sendJson(res, 400, { error: "Missing path" });
      const content = String(payload?.content ?? "");

      // Validate YAML types before saving
      const isTypeFile = /^awn-system\/types\/[^/]+\/[^/]+\.ya?ml$/i.test(relPath.replace(/\\/g, "/"));
      if (isTypeFile && content.trim()) {
        const { parseTypeYaml } = require("./awn-yaml-utils");
        let parsed;
        try {
          parsed = parseTypeYaml(content);
        } catch (parseErr) {
          return sendJson(res, 400, {
            error: "Invalid YAML",
            details: String(parseErr.message || parseErr),
            path: relPath
          });
        }
        if (!parsed) return sendJson(res, 400, { error: "Empty or unparseable YAML", path: relPath });
        // Require id and kind
        const missing = ["id", "kind"].filter((k) => !parsed[k]);
        if (missing.length) {
          return sendJson(res, 400, {
            error: `Type YAML missing required fields: ${missing.join(", ")}`,
            path: relPath,
            hint: 'Required: id (e.g. "awn.content.mytype"), kind (type|base|slot|field|block|mixin|taxonomy|view)'
          });
        }
      }

      const saved = await writeAgentSystemFile(agentRoot, relPath, content);
      return sendJson(res, 200, saved);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to save agent-system file",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/components") {
    try {
      const agentRoot = getAgentRoot() || "";
      const payload = getComponentsPayload(getProjectRoot(), agentRoot);
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to load components",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/awn-types") {
    try {
      const agentRoot = getAgentRoot();
      if (!agentRoot) return sendJson(res, 400, { error: "Agent not selected" });
      const payload = getAwnTypesPayload(agentRoot, getProjectRoot());
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to load awn types",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agent/catalogs") {
    try {
      const agentRoot = getAgentRoot();
      if (!agentRoot) return sendJson(res, 400, { error: "Agent not selected" });
      const payload = await getAgentCatalogsPayload();
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to load agent catalogs",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/agent/catalogs/items") {
    try {
      const agentRoot = getAgentRoot();
      if (!agentRoot) return sendJson(res, 400, { error: "Agent not selected" });

      const payload = await readJsonBody(req);
      const preset = String(payload?.preset || "").trim().toLowerCase();
      if (!preset) return sendJson(res, 400, { error: "Missing preset" });

      const serviceFolder = getAgentKitFolder();
      let serviceAbsolute = null;
      if (serviceFolder) {
        serviceAbsolute = await resolveAgentSubfolderAbsolute(getAgentRoot(), serviceFolder);
      }

      const result = await addCatalogItemForAgentContext({
        projectRoot: getProjectRoot(),
        serviceAbsolute,
        isPlatform: isPlatformAgentId(getActiveAgentId()),
        preset,
        item: {
          id: payload?.id,
          label: payload?.label,
          color: payload?.color,
          email: payload?.email
        }
      });

      return sendJson(res, 200, result);
    } catch (error) {
      const code = error && error.code ? String(error.code) : "";
      if (code === "EINVAL") {
        return sendJson(res, 400, { error: String(error.message || "Invalid catalog item") });
      }
      if (code === "EEXIST") {
        return sendJson(res, 409, { error: String(error.message || "Catalog item already exists") });
      }
      return sendJson(res, 500, {
        error: "Failed to add catalog item",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file/properties") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = await resolveApiNodeFrontmatterAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    try {
      const { frontmatter, source } = await readNodeFrontmatterContent(relPath);
      return sendJson(res, 200, {
        path: relPath,
        content: frontmatter,
        exists: Boolean(frontmatter.trim()),
        source: source || "none"
      });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to read properties", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/file/properties") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const content = typeof payload.content === "string" ? payload.content : null;

      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const nodeAbsolute = await resolveApiNodeFrontmatterAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const raw = (await readNodeManifestRaw(nodeAbsolute)) ?? "";
      const { frontmatter: diskFrontmatter, body } = splitNodeFrontmatter(raw);
      const stampedFrontmatter = applyAwnTimestampsToFrontmatter(content, { diskFrontmatter });
      const nextContent = joinNodeFrontmatter(stampedFrontmatter, body);
      await fs.mkdir(path.dirname(nodeAbsolute), { recursive: true });
      await fs.writeFile(nodeAbsolute, nextContent, "utf-8");
      const normalizedRelPath = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
      if (normalizedRelPath === AREA_MANIFEST_FILE || normalizedRelPath === "_reg-info.md") {
        refreshAgentsFromDisk();
      }
      return sendJson(res, 200, { path: relPath, content: stampedFrontmatter, fullContent: nextContent });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save properties", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file/topic-schema") {
    const relPath = url.searchParams.get("path");
    const contentPath = String(url.searchParams.get("contentPath") || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const manifestCtx = await resolveApiManifestContext(relPath);
    if (!manifestCtx) return sendJson(res, 400, { error: "Invalid file path" });

    try {
      const configFile = await readNodeConfigFile(manifestCtx.rel);
      const payload = contentPath
        ? getEffectiveSchemaPayloadForContentPath(
            configFile.content,
            contentPath,
            getAgentRoot(),
            getProjectRoot()
          )
        : getEffectiveTopicSchemaPayload(
            manifestCtx.rel,
            getAgentRoot(),
            getProjectRoot(),
            configFile.content
          );
      return sendJson(res, 200, {
        path: manifestCtx.rel,
        contentPath: contentPath || null,
        configPath: configFile.path,
        configExists: configFile.exists,
        awnSchema: payload.awnSchema,
        topicAwnSchema: payload.topicAwnSchema || payload.awnSchema,
        areaAwnSchema: payload.areaAwnSchema || null,
        workspaceAwnSchema: payload.workspaceAwnSchema || null,
        sectionAwnSchema: payload.sectionAwnSchema || null,
        sectionChain: payload.sectionChain || [],
        baseTypes: payload.baseTypes,
        merged: payload.merged,
        fieldRegistry: getAwnTypesPayload(getAgentRoot(), getProjectRoot()).fieldRegistry
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read topic schema",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/file/topic-schema") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      // Accept both shapes:
      //   { awnSchema: {...} }  — from UI (correct)
      //   { content: "yaml..." } — from MCP agent (legacy, parse YAML → extract awn_schema)
      let awnSchema;
      if (payload.awnSchema && typeof payload.awnSchema === "object") {
        awnSchema = normalizeAwnSchema(payload.awnSchema);
      } else if (typeof payload.content === "string" && payload.content.trim()) {
        awnSchema = extractAwnSchemaFromConfig(payload.content);
      } else {
        awnSchema = normalizeAwnSchema(undefined);
      }

      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });

      const manifestCtx = await resolveApiManifestContext(relPath);
      if (!manifestCtx) return sendJson(res, 400, { error: "Invalid file path" });

      const configFile = await readNodeConfigFile(manifestCtx.rel);

      const writeResult = await writeTopicConfigurationSchema(
        manifestCtx.rel,
        awnSchema,
        async (manifestRel, schemaRel, content) => {
          await writeWorkspaceTextFileWithHistory(manifestRel, schemaRel, content);
        },
        removeIfExists
      );

      const schemaPayload = getEffectiveTopicSchemaPayload(
        manifestCtx.rel,
        getAgentRoot(),
        getProjectRoot(),
        configFile.content
      );
      return sendJson(res, 200, {
        path: manifestCtx.rel,
        configPath: writeResult.schemaRel,
        schemaPath: writeResult.schemaRel,
        content: writeResult.content,
        exists: writeResult.exists,
        awnSchema: schemaPayload.awnSchema,
        topicAwnSchema: schemaPayload.topicAwnSchema || schemaPayload.awnSchema,
        workspaceAwnSchema: schemaPayload.workspaceAwnSchema || null,
        baseTypes: schemaPayload.baseTypes,
        merged: schemaPayload.merged
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to save topic schema",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file/workspace-schema") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const manifestCtx = await resolveApiManifestContext(relPath);
    if (!manifestCtx) return sendJson(res, 400, { error: "Invalid file path" });
    if (!(await isWorkspaceRootManifestRel(manifestCtx.rel))) {
      return sendJson(res, 400, { error: "Workspace schema is only available at agent root" });
    }

    try {
      const payload = getWorkspaceSchemaPayloadFull(getAgentRoot(), getProjectRoot());
      const workspaceAwnSchema = payload.workspaceAwnSchema || payload.awnSchema;
      return sendJson(res, 200, {
        path: manifestCtx.rel,
        schemaPath: WORKSPACE_CONFIGURATION_SCHEMA_REL,
        schemaExists: Boolean(readWorkspaceLayerAwnSchema(getAgentRoot())),
        awnSchema: workspaceAwnSchema,
        workspaceAwnSchema,
        baseTypes: payload.baseTypes,
        merged: payload.merged,
        fieldRegistry: getAwnTypesPayload(getAgentRoot(), getProjectRoot()).fieldRegistry
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read workspace schema",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/file/workspace-schema") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      let awnSchema;
      if (payload.awnSchema && typeof payload.awnSchema === "object") {
        awnSchema = normalizeAwnSchema(payload.awnSchema);
      } else if (typeof payload.content === "string" && payload.content.trim()) {
        const { extractAwnSchemaFromConfigurationSchemaContent } = require("./configuration-schema");
        awnSchema =
          extractAwnSchemaFromConfigurationSchemaContent(payload.content) || normalizeAwnSchema(undefined);
      } else {
        awnSchema = normalizeAwnSchema(undefined);
      }

      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });

      const manifestCtx = await resolveApiManifestContext(relPath);
      if (!manifestCtx) return sendJson(res, 400, { error: "Invalid file path" });
      if (!(await isWorkspaceRootManifestRel(manifestCtx.rel))) {
        return sendJson(res, 400, { error: "Workspace schema is only available at agent root" });
      }

      const writeResult = await writeWorkspaceConfigurationSchema(
        awnSchema,
        async (_manifestRel, schemaRel, content) => {
          await writeWorkspaceTextFileWithHistory(manifestCtx.rel, schemaRel, content);
        },
        removeIfExists
      );

      const schemaPayload = getWorkspaceSchemaPayloadFull(getAgentRoot(), getProjectRoot());
      return sendJson(res, 200, {
        path: manifestCtx.rel,
        schemaPath: writeResult.schemaRel,
        content: writeResult.content,
        exists: writeResult.exists,
        awnSchema: schemaPayload.awnSchema,
        workspaceAwnSchema: schemaPayload.workspaceAwnSchema || schemaPayload.awnSchema,
        baseTypes: schemaPayload.baseTypes,
        merged: schemaPayload.merged
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to save workspace schema",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file/section-schema") {
    const manifestPath = String(url.searchParams.get("manifest") || url.searchParams.get("path") || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");
    const sectionPath = String(url.searchParams.get("section") || url.searchParams.get("sectionPath") || "")
      .replace(/\\/g, "/")
      .replace(/^\/+|\/+$/g, "");
    const layer = String(url.searchParams.get("layer") || "main").trim();
    if (!manifestPath || !sectionPath) {
      return sendJson(res, 400, { error: "Missing manifest and section query parameters" });
    }

    const manifestCtx = await resolveApiManifestContext(manifestPath);
    if (!manifestCtx) return sendJson(res, 400, { error: "Invalid manifest path" });

    try {
      const configRelPath = toSectionConfigRelPath(manifestCtx.rel, layer, sectionPath);
      if (!configRelPath) return sendJson(res, 400, { error: "Invalid section path" });
      const configAbsolute = normalizeWorkspacePath(configRelPath);
      let content = "";
      let exists = false;
      if (configAbsolute) {
        try {
          content = await fs.readFile(configAbsolute, "utf-8");
          exists = true;
        } catch (error) {
          if (!error || error.code !== "ENOENT") throw error;
        }
      }
      const topicConfig = await readNodeConfigFile(manifestCtx.rel);
      const contentWorkspaceRel = buildStorageLayerRef(
        manifestCtx.rel,
        layer,
        `${sectionPath}/${MANIFEST_FILE}`
      );
      const payload = getEffectiveSchemaPayloadForContentPath(
        topicConfig.content,
        contentWorkspaceRel,
        getAgentRoot(),
        getProjectRoot()
      );
      const sectionOnlySchema = extractAwnSchemaFromConfig(content);
      return sendJson(res, 200, {
        manifestPath: manifestCtx.rel,
        sectionPath,
        layer,
        configPath: configRelPath,
        configExists: exists,
        content,
        sectionAwnSchema: sectionOnlySchema,
        awnSchema: payload.awnSchema,
        topicAwnSchema: payload.topicAwnSchema || payload.awnSchema,
        inheritedSectionChain: payload.sectionChain || [],
        baseTypes: payload.baseTypes,
        merged: payload.merged
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read section schema",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/file/section-schema") {
    try {
      const payload = await readJsonBody(req);
      const manifestPath = String(payload.manifestPath || payload.path || "").replace(/\\/g, "/");
      const sectionPath = String(payload.sectionPath || payload.section || "")
        .replace(/\\/g, "/")
        .replace(/^\/+|\/+$/g, "");
      const layer = String(payload.layer || "main").trim();
      let awnSchema;
      if (payload.awnSchema && typeof payload.awnSchema === "object") {
        awnSchema = normalizeAwnSchema(payload.awnSchema);
      } else if (typeof payload.content === "string" && payload.content.trim()) {
        awnSchema = extractAwnSchemaFromConfig(payload.content);
      } else {
        awnSchema = normalizeAwnSchema(undefined);
      }
      if (!manifestPath || !sectionPath) {
        return sendJson(res, 400, { error: "Missing manifestPath and sectionPath" });
      }

      const manifestCtx = await resolveApiManifestContext(manifestPath);
      if (!manifestCtx) return sendJson(res, 400, { error: "Invalid manifest path" });

      const configRelPath = toSectionConfigRelPath(manifestCtx.rel, layer, sectionPath);
      if (!configRelPath) return sendJson(res, 400, { error: "Invalid section path" });
      const configAbsolute = normalizeWorkspacePath(configRelPath);
      if (!configAbsolute) return sendJson(res, 400, { error: "Invalid section config path" });

      const existingContent = (await fs.readFile(configAbsolute, "utf-8").catch(() => "")) || "";
      const nextContent = applyAwnSchemaToConfig(existingContent, awnSchema);
      await fs.mkdir(path.dirname(configAbsolute), { recursive: true });
      if (!String(nextContent).trim()) {
        await removeIfExists(configAbsolute);
      } else {
        await writeWorkspaceTextFileWithHistory(manifestCtx.rel, configRelPath, nextContent);
      }

      const topicConfig = await readNodeConfigFile(manifestCtx.rel);
      const contentWorkspaceRel = buildStorageLayerRef(
        manifestCtx.rel,
        layer,
        `${sectionPath}/${MANIFEST_FILE}`
      );
      const schemaPayload = getEffectiveSchemaPayloadForContentPath(
        topicConfig.content,
        contentWorkspaceRel,
        getAgentRoot(),
        getProjectRoot()
      );
      return sendJson(res, 200, {
        manifestPath: manifestCtx.rel,
        sectionPath,
        layer,
        configPath: configRelPath,
        content: nextContent,
        exists: Boolean(String(nextContent).trim()),
        sectionAwnSchema: awnSchema,
        awnSchema: schemaPayload.awnSchema,
        merged: schemaPayload.merged,
        sectionChain: schemaPayload.sectionChain || []
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to save section schema",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file/node-config") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const manifestCtx = await resolveApiManifestContext(relPath);
    if (!manifestCtx) return sendJson(res, 400, { error: "Invalid file path" });

    const configRelPath = toNodeConfigFilePath(manifestCtx.rel);

    try {
      const configFile = await readNodeConfigFile(manifestCtx.rel);
      const defaultLandingMode = extractDefaultLandingModeFromNodeConfig(configFile.content);
      const awnMaskFile = extractAwnMaskFileFromNodeConfigContent(configFile.content);
      return sendJson(res, 200, {
        path: configFile.path || configRelPath,
        content: configFile.content,
        exists: configFile.exists,
        defaultLandingMode,
        awnMaskFile,
        awnMaskFileKey: AWN_MASK_FILE_KEY
      });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to read node config", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/file/node-config") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const content = typeof payload.content === "string" ? payload.content : null;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const manifestCtx = await resolveApiManifestContext(relPath);
      if (!manifestCtx) return sendJson(res, 400, { error: "Invalid file path" });

      const configRelPath = toNodeConfigFilePath(manifestCtx.rel);
      const configAbsolute = normalizeWorkspacePath(configRelPath);
      if (!configAbsolute) return sendJson(res, 400, { error: "Invalid node config path" });

      const trimmed = String(content).replace(/^\uFEFF/, "").trim();
      if (!trimmed) {
        await removeIfExists(configAbsolute);
        return sendJson(res, 200, {
          path: configRelPath,
          content: "",
          exists: false,
          defaultLandingMode: null
        });
      }

      // Merge-safe: if incoming content has no awn_schema block, preserve existing one from disk.
      // This prevents agents from accidentally wiping awn_schema by sending partial config.
      let finalContent = content;
      const incomingBundle = NodeConfigBundle.parseNodeConfigBundle(content);
      const incomingHasSchema = Boolean(incomingBundle.awn_schema && Object.keys(incomingBundle.awn_schema).length);
      if (!incomingHasSchema) {
        const existingFile = await readNodeConfigFile(manifestCtx.rel);
        if (existingFile.exists && existingFile.content) {
          const existingBundle = NodeConfigBundle.parseNodeConfigBundle(existingFile.content);
          if (existingBundle.awn_schema && Object.keys(existingBundle.awn_schema).length) {
            incomingBundle.awn_schema = existingBundle.awn_schema;
            incomingBundle.awn_schemaYaml = NodeConfigBundle.extractSectionYamlText(existingFile.content, "awn_schema");
            finalContent = NodeConfigBundle.composeNodeConfigBundle(incomingBundle);
          }
        }
      }

      const normalizedContent = finalContent.endsWith("\n") ? finalContent : `${finalContent}\n`;
      await writeWorkspaceTextFileWithHistory(manifestCtx.rel, configRelPath, normalizedContent);
      const defaultLandingMode = extractDefaultLandingModeFromNodeConfig(finalContent);
      return sendJson(res, 200, {
        path: configRelPath,
        content: normalizedContent,
        exists: true,
        defaultLandingMode,
        schemaMerged: !incomingHasSchema
      });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save node config", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/memory/external") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_CONTENT);
    if (!folderAbsolute) return sendJson(res, 200, { exists: false, content: "", files: [] });
    if (!folderAbsolute.startsWith(getAgentRoot())) return sendJson(res, 400, { error: "Invalid external memory path" });

    try {
      const stat = await fs.stat(folderAbsolute);
      if (!stat.isDirectory()) {
        return sendJson(res, 200, { exists: false, content: "", files: [] });
      }

      const chunks = await collectFolderEntries(folderAbsolute);
      return sendJson(res, 200, {
        exists: true,
        files: chunks.length,
        content: chunks.length > 0 ? chunks.join("\n") : ""
      });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return sendJson(res, 200, { exists: false, content: "", files: [] });
      }
      return sendJson(res, 500, { error: "Failed to read external memory", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/external/files") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_CONTENT);
    if (!folderAbsolute) return sendJson(res, 200, { exists: false, files: [] });
    if (!folderAbsolute.startsWith(getAgentRoot())) return sendJson(res, 400, { error: "Invalid external folder path" });

    try {
      const stat = await fs.stat(folderAbsolute);
      if (!stat.isDirectory()) return sendJson(res, 200, { exists: false, files: [] });
      const [files, folders, nonMarkdownFiles] = await Promise.all([
        collectMarkdownFiles(folderAbsolute),
        collectExternalContentFolders(folderAbsolute),
        collectNonMarkdownFiles(folderAbsolute)
      ]);
      const enrichedFiles = await Promise.all(
        files.map((file) => enrichExternalMarkdownFilePreview(relPath, folderAbsolute, file))
      );
      const sectionRelPaths = [];
      for (const folder of folders) {
        const folderPath = String(folder.path || folder.name || folder || "")
          .replace(/\\/g, "/")
          .replace(/\/$/, "");
        if (folderPath) sectionRelPaths.push(folderPath);
      }
      for (const file of enrichedFiles) {
        const parent = String(file.parent || "").replace(/\\/g, "/");
        if (parent && parent !== ".") sectionRelPaths.push(parent);
      }
      const sectionSortOrders = await collectMemorySectionSortOrders(folderAbsolute, sectionRelPaths);
      return sendJson(res, 200, {
        exists: true,
        files: enrichedFiles,
        folders,
        nonMarkdownFiles,
        sectionSortOrders
      });
    } catch (error) {
      if (error && error.code === "ENOENT") return sendJson(res, 200, { exists: false, files: [] });
      return sendJson(res, 500, { error: "Failed to read external files", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/external/file") {
    const relPath = url.searchParams.get("path");
    const relFile = url.searchParams.get("file");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!relFile) return sendJson(res, 400, { error: "Missing file query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    const normalizedRelFile = normalizeExternalMemoryFileRelForManifest(relPath, relFile);
    if (!normalizedRelFile || !normalizedRelFile.toLowerCase().endsWith(".md")) {
      return sendJson(res, 400, { error: "Only .md files are allowed" });
    }

    const folderAbsolute = await resolveExternalMemoryFolderAbsolute(relPath);
    if (!folderAbsolute) return sendJson(res, 404, { error: "External folder not found" });

    const fileAbsolute = path.join(folderAbsolute, normalizedRelFile);
    if (!isPathInsideDirectory(folderAbsolute, fileAbsolute)) {
      return sendJson(res, 400, { error: "Invalid external file path" });
    }

    try {
      const content = await fs.readFile(fileAbsolute, "utf-8");
      return sendJson(res, 200, { file: normalizedRelFile.replace(/\\/g, "/"), content });
    } catch (error) {
      if (error && error.code === "ENOENT") return sendJson(res, 404, { error: "External file not found" });
      return sendJson(res, 500, { error: "Failed to read external file", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/external/file") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const relFile = payload.file;
      const content = typeof payload.content === "string" ? payload.content : null;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!relFile) return sendJson(res, 400, { error: "Missing external file path" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const normalizedRelFile = normalizeExternalMemoryFileRelForManifest(relPath, relFile);
      if (!normalizedRelFile || !normalizedRelFile.toLowerCase().endsWith(".md")) {
        return sendJson(res, 400, { error: "Only .md files are allowed" });
      }

      let folderAbsolute = await resolveExternalMemoryFolderAbsolute(relPath, { create: true });
      if (!folderAbsolute) return sendJson(res, 404, { error: "External folder not found" });

      const fileAbsolute = path.join(folderAbsolute, normalizedRelFile);
      if (!isPathInsideDirectory(folderAbsolute, fileAbsolute)) {
        return sendJson(res, 400, { error: "Invalid external file path" });
      }

      const resolvedManifest = resolveExternalMemorySchemaManifestRel(relPath);
      const targetRelPath = manifestRelFromNodeAbsolute(fileAbsolute);
      const raw = await fs.readFile(fileAbsolute, "utf-8").catch(() => "");
      const { frontmatter: diskFrontmatter } = splitNodeFrontmatter(raw);
      const isNewFile = !raw.trim();
      const stampedContent = await enrichTypedSlotMarkdownContent(resolvedManifest, "memory", content, "record", {
        fileName: normalizedRelFile,
        diskFrontmatter,
        force: isNewFile
      });
      await writeWorkspaceTextFileWithHistory(resolvedManifest, targetRelPath, stampedContent);
      return sendJson(res, 200, { file: normalizedRelFile.replace(/\\/g, "/"), content: stampedContent });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save external file", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/external/id-increment") {
    try {
      const relPath = url.searchParams.get("path");
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const folderAbsolute = await getOrCreateExternalFolderAbsolute(nodeAbsolute);
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid external folder path" });

      const current = await readExternalIdIncrement(folderAbsolute);
      const next = current + 1;
      return sendJson(res, 200, { current, next });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read id increment",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/external/file/create") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      let fileMask = String(payload.fileMask || payload.mask || "").trim();
      const { display, diskSlug } = resolveContentItemNames(payload);
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      if (!fileMask) {
        fileMask = await resolveExternalFileMaskForManifest(relPath);
      }

      const folderAbsolute = await resolveExternalMemoryFolderAbsolute(relPath, { create: true });
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid external folder path" });

      const parentRaw = resolveExternalMemoryCreateParentRel(relPath, payload.parent);
      const targetFolder = await resolveMediaTargetFolderAbsolute(folderAbsolute, parentRaw);
      if (!targetFolder) {
        return sendJson(res, 400, { error: parentRaw ? "Parent section not found" : "Invalid external folder path" });
      }

      let fileName = null;
      let title = display || "Воспоминание";

      if (fileMask) {
        fileName = await resolveExternalFileNameFromMask(targetFolder, fileMask, {
          incrementRoot: folderAbsolute
        });
        if (!fileName) return sendJson(res, 400, { error: "Invalid file mask" });
        title = display || displayNameFromMaskPath(fileName);
        await ensureExternalRelativeParentDirs(targetFolder, fileName);
      } else {
        if (!title) return sendJson(res, 400, { error: "Title cannot be empty" });
        if (!diskSlug) return sendJson(res, 400, { error: "Invalid slug" });
        fileName = await resolveUniqueExternalFileName(targetFolder, diskSlug);
        if (!fileName) return sendJson(res, 400, { error: "Invalid file name" });
      }

      const fileAbsolute = joinFolderRelativePath(targetFolder, fileName);
      if (!fileAbsolute) return sendJson(res, 400, { error: "Invalid external file path" });
      const parentRel = path.relative(folderAbsolute, targetFolder).replace(/\\/g, "/").replace(/^\/+/, "");
      const relInSlot = parentRel ? `${parentRel}/${fileName}` : fileName;
      const contentWorkspaceRel = buildStorageLayerRef(
        String(relPath || "").replace(/\\/g, "/"),
        STORAGE_SUBFOLDER_CONTENT,
        relInSlot
      );
      const content = await buildExternalRecordFileContentForManifest(relPath, title, { contentWorkspaceRel });
      await fs.writeFile(fileAbsolute, content, "utf-8");
      const createdRel = manifestRelFromNodeAbsolute(fileAbsolute);
      recordWorkspaceActivity({
        action: "create",
        path: createdRel || `${relPath.replace(/\\/g, "/")}/${fileName}`,
        manifestPath: relPath.replace(/\\/g, "/"),
        label: title,
        fileKind: "memory"
      });

      return sendJson(res, 200, {
        file: path.relative(folderAbsolute, fileAbsolute).replace(/\\/g, "/"),
        content,
        exists: true
      });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to create external file", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/external/section/create") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const { display, diskSlug } = resolveContentItemNames(payload);
      const title = display;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!title) return sendJson(res, 400, { error: "Title cannot be empty" });
      if (!diskSlug) return sendJson(res, 400, { error: "Invalid slug" });

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const sectionName = toExternalSectionFolderName(diskSlug);
      if (!sectionName) return sendJson(res, 400, { error: "Invalid section name" });

      const folderAbsolute = await getOrCreateExternalFolderAbsolute(nodeAbsolute);
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid external folder path" });

      const parentRaw = resolveStorageCreateParentRel(payload.parent, {
        layer: STORAGE_SUBFOLDER_CONTENT,
        manifestRelPath: relPath
      });
      const baseFolder = await resolveMediaTargetFolderAbsolute(folderAbsolute, parentRaw);
      if (!baseFolder) {
        return sendJson(res, 400, { error: parentRaw ? "Parent section not found" : "Invalid external folder path" });
      }

      const sectionAbsolute = path.join(baseFolder, sectionName);
      if (!isPathInsideDirectory(folderAbsolute, sectionAbsolute)) {
        return sendJson(res, 400, { error: "Invalid section path" });
      }

      try {
        await fs.access(sectionAbsolute);
        return sendJson(res, 409, { error: "Section already exists" });
      } catch {
        // section does not exist
      }

      await fs.mkdir(sectionAbsolute, { recursive: true });
      const sectionPath = path.relative(folderAbsolute, sectionAbsolute).replace(/\\/g, "/");
      const contentWorkspaceRel = buildStorageLayerRef(
        String(relPath || "").replace(/\\/g, "/"),
        STORAGE_SUBFOLDER_CONTENT,
        `${sectionPath}/${AREA_MANIFEST_FILE}`
      );
      await writeStorageSectionReadme(
        sectionAbsolute,
        title,
        "awn.content.record.category",
        relPath,
        "memory",
        { contentWorkspaceRel }
      );
      return sendJson(res, 200, {
        section: sectionName,
        sectionPath,
        readme: `${sectionPath}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/"),
        exists: true
      });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to create external section", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/media/section/create") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const { display, diskSlug } = resolveContentItemNames(payload);
      const title = display;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!title) return sendJson(res, 400, { error: "Title cannot be empty" });
      if (!diskSlug) return sendJson(res, 400, { error: "Invalid slug" });

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const sectionName = toExternalSectionFolderName(diskSlug);
      if (!sectionName) return sendJson(res, 400, { error: "Invalid section name" });

      const folderParam = String(payload.folder || STORAGE_SUBFOLDER_MEDIA).trim();
      const folderName = isAllowedStorageSubfolderName(folderParam) ? folderParam : STORAGE_SUBFOLDER_MEDIA;
      const slotKey = folderName === STORAGE_SUBFOLDER_ASSETS ? "assets" : "media";
      const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, folderName, { create: true });
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid media folder path" });

      const parentRaw = resolveStorageCreateParentRel(payload.parent, {
        layer: folderName,
        manifestRelPath: relPath
      });
      const baseFolder = await resolveMediaTargetFolderAbsolute(folderAbsolute, parentRaw);
      if (!baseFolder) {
        return sendJson(res, 400, { error: parentRaw ? "Parent section not found" : "Invalid media folder path" });
      }

      const sectionAbsolute = path.join(baseFolder, sectionName);
      if (!isPathInsideDirectory(folderAbsolute, sectionAbsolute)) {
        return sendJson(res, 400, { error: "Invalid section path" });
      }

      try {
        await fs.access(sectionAbsolute);
        return sendJson(res, 409, { error: "Section already exists" });
      } catch {
        // section does not exist
      }

      await fs.mkdir(sectionAbsolute, { recursive: true });
      await writeStorageSectionReadme(sectionAbsolute, title, "awn.content.record.category", relPath, slotKey);
      const sectionPath = path.relative(folderAbsolute, sectionAbsolute).replace(/\\/g, "/");
      return sendJson(res, 200, {
        section: sectionName,
        sectionPath,
        readme: `${sectionPath}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/"),
        exists: true
      });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to create media section", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/storage/section/create") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const { display, diskSlug } = resolveContentItemNames(payload);
      const title = display;
      const storageFolder = String(payload.folder || "").trim();
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!title) return sendJson(res, 400, { error: "Title cannot be empty" });
      if (!diskSlug) return sendJson(res, 400, { error: "Invalid slug" });
      if (!isAllowedStorageSubfolderName(storageFolder)) {
        return sendJson(res, 400, { error: "Invalid storage folder" });
      }
      if (
        storageFolder !== STORAGE_SUBFOLDER_SCRIPTS &&
        storageFolder !== STORAGE_SUBFOLDER_INBOX &&
        storageFolder !== STORAGE_SUBFOLDER_QUICK_NOTES &&
        storageFolder !== STORAGE_SUBFOLDER_NOTE &&
        storageFolder !== STORAGE_SUBFOLDER_REFERENCES &&
        storageFolder !== STORAGE_SUBFOLDER_ARTEFACTS
      ) {
        return sendJson(res, 400, { error: "Sections are not supported for this folder" });
      }

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const sectionName = toExternalSectionFolderName(diskSlug);
      if (!sectionName) return sendJson(res, 400, { error: "Invalid section name" });

      const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, storageFolder, { create: true });
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid storage folder path" });

      const parentRaw = resolveStorageCreateParentRel(payload.parent, {
        layer: storageFolder,
        manifestRelPath: relPath
      });
      const baseFolder = await resolveMediaTargetFolderAbsolute(folderAbsolute, parentRaw);
      if (!baseFolder) {
        return sendJson(res, 400, { error: parentRaw ? "Parent section not found" : "Invalid storage folder path" });
      }

      const sectionAbsolute = path.join(baseFolder, sectionName);
      if (!isPathInsideDirectory(folderAbsolute, sectionAbsolute)) {
        return sendJson(res, 400, { error: "Invalid section path" });
      }

      try {
        await fs.access(sectionAbsolute);
        return sendJson(res, 409, { error: "Section already exists" });
      } catch {
        // section does not exist
      }

      await fs.mkdir(sectionAbsolute, { recursive: true });
      const slotKey = resolveSlotKeyFromStorageFolderName(storageFolder);
      await writeStorageSectionReadme(
        sectionAbsolute,
        title,
        "awn.content.record.category",
        relPath,
        slotKey
      );
      const sectionPath = path.relative(folderAbsolute, sectionAbsolute).replace(/\\/g, "/");
      return sendJson(res, 200, {
        section: sectionName,
        sectionPath,
        readme: `${sectionPath}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/"),
        exists: true
      });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to create storage section", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/storage/section/rename") {
    try {
      const payload = await readJsonBody(req);
      const result = await renameMemorySectionRecord(
        payload.path,
        "storage",
        String(payload.folder || "").trim(),
        payload.section,
        payload
      );
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to rename storage section", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/storage/section/move") {
    try {
      const payload = await readJsonBody(req);
      const result = await moveMemorySectionRecord(
        payload.path,
        "storage",
        String(payload.folder || "").trim(),
        payload.section,
        payload.parent
      );
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to move storage section", details: String(error.message || error) });
    }
  }

  if (req.method === "DELETE" && url.pathname === "/api/storage/section") {
    const relPath = url.searchParams.get("path") || "";
    const section = url.searchParams.get("section") || "";
    const folder = String(url.searchParams.get("folder") || "").trim();
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!section) return sendJson(res, 400, { error: "Missing section query parameter" });
    try {
      const result = await deleteMemorySectionRecord(relPath, "storage", folder, section);
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to delete storage section", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/storage/section/status") {
    try {
      const payload = await readJsonBody(req);
      const result = await updateMemorySectionStatusRecord(
        payload.path,
        "storage",
        String(payload.folder || "").trim(),
        payload.section,
        payload.status
      );
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to update storage section status", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/external/section/rename") {
    try {
      const payload = await readJsonBody(req);
      const result = await renameMemorySectionRecord(payload.path, "external", "", payload.section, payload);
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to rename external section", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/external/section/move") {
    try {
      const payload = await readJsonBody(req);
      const result = await moveMemorySectionRecord(
        payload.path,
        "external",
        "",
        payload.section,
        payload.parent
      );
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to move external section", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/external/section/sort") {
    try {
      const payload = await readJsonBody(req);
      const result = await saveMemorySectionSortOrderRecord(
        payload.path,
        "external",
        "",
        payload.parent,
        payload.order
      );
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save external section sort", details: String(error.message || error) });
    }
  }

  if (req.method === "DELETE" && url.pathname === "/api/external/section") {
    const relPath = url.searchParams.get("path") || "";
    const section = url.searchParams.get("section") || "";
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!section) return sendJson(res, 400, { error: "Missing section query parameter" });
    try {
      const result = await deleteMemorySectionRecord(relPath, "external", "", section);
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to delete external section", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/external/section/status") {
    try {
      const payload = await readJsonBody(req);
      const result = await updateMemorySectionStatusRecord(
        payload.path,
        "external",
        "",
        payload.section,
        payload.status
      );
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to update external section status", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/media/section/rename") {
    try {
      const payload = await readJsonBody(req);
      const result = await renameMemorySectionRecord(payload.path, "media", payload.folder || "", payload.section, payload);
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to rename media section", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/media/section/move") {
    try {
      const payload = await readJsonBody(req);
      const result = await moveMemorySectionRecord(payload.path, "media", payload.folder || "", payload.section, payload.parent);
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to move media section", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/media/section/sort") {
    try {
      const payload = await readJsonBody(req);
      const result = await saveMemorySectionSortOrderRecord(
        payload.path,
        "media",
        payload.folder || "",
        payload.parent,
        payload.order
      );
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save media section sort", details: String(error.message || error) });
    }
  }

  if (req.method === "DELETE" && url.pathname === "/api/media/section") {
    const relPath = url.searchParams.get("path") || "";
    const section = url.searchParams.get("section") || "";
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!section) return sendJson(res, 400, { error: "Missing section query parameter" });
    const folder = url.searchParams.get("folder") || "";
    try {
      const result = await deleteMemorySectionRecord(relPath, "media", folder, section);
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to delete media section", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/media/section/status") {
    try {
      const payload = await readJsonBody(req);
      const result = await updateMemorySectionStatusRecord(
        payload.path,
        "media",
        payload.folder || "",
        payload.section,
        payload.status
      );
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to update media section status", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/storage/scan") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    try {
      const scan = await scanNodeStorageRoot(relPath);
      return sendJson(res, 200, scan);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to scan storage root",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/storage/shared-mounts") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    try {
      const mounts = await buildSharedMountsForTopic(relPath);
      const sharedContext = await buildSharedStorageContext(relPath);
      return sendJson(res, 200, {
        available: mounts.length > 0,
        mounts,
        sharedContext
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to resolve shared mounts",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/storage/markdown") {
    const relPath = url.searchParams.get("path");
    const relFile = url.searchParams.get("file");
    const storageFolder = String(url.searchParams.get("folder") || "").trim();
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!relFile) return sendJson(res, 400, { error: "Missing file query parameter" });
    if (!isAllowedStorageSubfolderName(storageFolder)) {
      return sendJson(res, 400, { error: "Invalid storage folder" });
    }

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    const normalizedRelFile = normalizeRelativeFilePath(relFile);
    if (!normalizedRelFile || !normalizedRelFile.toLowerCase().endsWith(".md")) {
      return sendJson(res, 400, { error: "Only .md files are allowed" });
    }

    const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, storageFolder);
    if (!folderAbsolute) return sendJson(res, 404, { error: "Storage folder not found" });

    const fileAbsolute = path.join(folderAbsolute, normalizedRelFile);
    if (!fileAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid file path" });

    try {
      const content = await fs.readFile(fileAbsolute, "utf-8");
      return sendJson(res, 200, { file: normalizedRelFile.replace(/\\/g, "/"), content });
    } catch (error) {
      if (error && error.code === "ENOENT") return sendJson(res, 404, { error: "Markdown file not found" });
      return sendJson(res, 500, { error: "Failed to read markdown", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/storage/markdown") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const relFile = payload.file;
      const storageFolder = String(payload.folder || "").trim();
      const content = typeof payload.content === "string" ? payload.content : null;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!relFile) return sendJson(res, 400, { error: "Missing file path" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });
      if (!isAllowedStorageSubfolderName(storageFolder)) {
        return sendJson(res, 400, { error: "Invalid storage folder" });
      }

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const normalizedRelFile = normalizeRelativeFilePath(relFile);
      if (!normalizedRelFile || !normalizedRelFile.toLowerCase().endsWith(".md")) {
        return sendJson(res, 400, { error: "Only .md files are allowed" });
      }

      const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, storageFolder, { create: true });
      if (!folderAbsolute) return sendJson(res, 404, { error: "Storage folder not found" });

      const fileAbsolute = path.join(folderAbsolute, normalizedRelFile);
      if (!fileAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid file path" });

      await fs.mkdir(path.dirname(fileAbsolute), { recursive: true });
      await fs.writeFile(fileAbsolute, content, "utf-8");
      return sendJson(res, 200, { file: normalizedRelFile.replace(/\\/g, "/"), content });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save markdown", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/storage/file") {
    const relPath = url.searchParams.get("path");
    const relFile = url.searchParams.get("file");
    const storageFolder = String(url.searchParams.get("folder") || "").trim();
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!relFile) return sendJson(res, 400, { error: "Missing file query parameter" });
    if (!storageFolder) return sendJson(res, 400, { error: "Missing folder query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    const resolved = await resolveStorageFileAbsolute(nodeAbsolute, storageFolder, relFile);
    if (resolved.error) {
      return sendJson(res, resolved.status === 404 ? 404 : 400, { error: resolved.error });
    }

    try {
      const content = await fs.readFile(resolved.fileAbsolute, "utf-8");
      return sendJson(res, 200, {
        folder: resolved.folder,
        file: resolved.normalizedRelFile.replace(/\\/g, "/"),
        content,
        exists: true
      });
    } catch (error) {
      if (error && error.code === "ENOENT") return sendJson(res, 404, { error: "Storage file not found" });
      return sendJson(res, 500, { error: "Failed to read storage file", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/storage/file") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const relFile = payload.file;
      const storageFolder = String(payload.folder || "").trim();
      const content = typeof payload.content === "string" ? payload.content : null;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!relFile) return sendJson(res, 400, { error: "Missing file path" });
      if (!storageFolder) return sendJson(res, 400, { error: "Missing storage folder" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const resolved = await resolveStorageFileAbsolute(nodeAbsolute, storageFolder, relFile, { create: true });
      if (resolved.error) {
        return sendJson(res, resolved.status === 404 ? 404 : 400, { error: resolved.error });
      }

      await fs.mkdir(path.dirname(resolved.fileAbsolute), { recursive: true });
      let finalContent = content;
      const relFileLower = resolved.normalizedRelFile.toLowerCase();
      if (relFileLower.endsWith(".md")) {
        const slotKey = resolveSlotKeyFromStorageFolderName(resolved.folder);
        if (slotKey) {
          const manifestRel = path.relative(getAgentRoot(), nodeAbsolute).replace(/\\/g, "/");
          const raw = await fs.readFile(resolved.fileAbsolute, "utf-8").catch(() => "");
          const { frontmatter: diskFrontmatter } = splitNodeFrontmatter(raw);
          finalContent = await enrichTypedSlotMarkdownContent(manifestRel, slotKey, content, "record", {
            fileName: resolved.normalizedRelFile,
            diskFrontmatter,
            force: !raw.trim()
          });
        }
      }
      await fs.writeFile(resolved.fileAbsolute, finalContent, "utf-8");
      return sendJson(res, 200, {
        folder: resolved.folder,
        file: resolved.normalizedRelFile.replace(/\\/g, "/"),
        content: finalContent,
        exists: true
      });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save storage file", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/storage/file/create") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const storageFolder = String(payload.folder || "").trim();
      const { display, diskSlug } = resolveContentItemNames(payload);
      const title = display || String(payload.title || "").trim();
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!storageFolder) return sendJson(res, 400, { error: "Missing storage folder" });
      if (!title && !payload.fileMask) return sendJson(res, 400, { error: "Title cannot be empty" });

      const result = await createStorageRecordFile({
        manifestRelPath: relPath,
        storageFolder,
        title,
        slug: diskSlug || payload.slug,
        parent: payload.parent,
        body: payload.body,
        fileMask: payload.fileMask || payload.mask,
        source: payload.source,
        author: payload.author,
        status: payload.status,
        fields: payload.fields
      });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to create storage record",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/storage/file/rename") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const relFile = payload.file;
      const storageFolder = String(payload.folder || "").trim();
      const title = String(payload.title || "").trim();
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!relFile) return sendJson(res, 400, { error: "Missing file path" });
      if (!storageFolder) return sendJson(res, 400, { error: "Missing storage folder" });
      if (!title) return sendJson(res, 400, { error: "Title cannot be empty" });

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const resolved = await resolveStorageFileAbsolute(nodeAbsolute, storageFolder, relFile);
      if (resolved.error) {
        return sendJson(res, resolved.status === 404 ? 404 : 400, { error: resolved.error });
      }

      const normalizedRelFile = resolved.normalizedRelFile;
      let nextRelPath = normalizedRelFile;
      if (normalizedRelFile.toLowerCase().endsWith(".md")) {
        const nextName = toExternalMarkdownFileName(title);
        if (!nextName) return sendJson(res, 400, { error: "Invalid file name" });
        const dirRelPath = path.dirname(normalizedRelFile);
        nextRelPath = (dirRelPath && dirRelPath !== "."
          ? path.join(dirRelPath, nextName)
          : nextName).replace(/\\/g, "/");
      } else {
        const dirRelPath = path.dirname(normalizedRelFile);
        const ext = path.extname(normalizedRelFile);
        const nextBase =
          sanitizeSlugInput(String(title || "").replace(/\.md$/i, "")) ||
          transliterateToSlug(String(title || "").replace(/\.md$/i, ""));
        if (!nextBase) return sendJson(res, 400, { error: "Invalid file name" });
        const nextName = `${nextBase}${ext}`;
        nextRelPath = (dirRelPath && dirRelPath !== "."
          ? path.join(dirRelPath, nextName)
          : nextName).replace(/\\/g, "/");
      }

      const nextAbsolute = path.join(resolved.folderAbsolute, nextRelPath);
      if (!isPathInsideDirectory(resolved.folderAbsolute, nextAbsolute)) {
        return sendJson(res, 400, { error: "Invalid target path" });
      }

      if (path.resolve(resolved.fileAbsolute) !== path.resolve(nextAbsolute)) {
        if (await targetPathOccupiedByOther(resolved.fileAbsolute, nextAbsolute)) {
          return sendJson(res, 409, { error: "File with this name already exists" });
        }
        await renamePathCaseAware(resolved.fileAbsolute, nextAbsolute);
      }

      const content = await fs.readFile(nextAbsolute, "utf-8");
      return sendJson(res, 200, {
        folder: resolved.folder,
        file: nextRelPath.replace(/\\/g, "/"),
        content,
        linkRewrite: { filesUpdated: 0, linksUpdated: 0, files: [] }
      });
    } catch (error) {
      const code = error && error.code ? String(error.code) : "";
      if (code === "ENOENT") return sendJson(res, 404, { error: "Storage file not found" });
      return sendJson(res, 500, { error: "Failed to rename storage file", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/media/markdown") {
    const relPath = url.searchParams.get("path");
    const relFile = url.searchParams.get("file");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!relFile) return sendJson(res, 400, { error: "Missing file query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    const normalizedRelFile = normalizeRelativeFilePath(relFile);
    if (!normalizedRelFile || !normalizedRelFile.toLowerCase().endsWith(".md")) {
      return sendJson(res, 400, { error: "Only .md files are allowed" });
    }

    const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute);
    if (!folderAbsolute) return sendJson(res, 404, { error: "Media folder not found" });

    const fileAbsolute = path.join(folderAbsolute, normalizedRelFile);
    if (!fileAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid media file path" });

    try {
      const content = await fs.readFile(fileAbsolute, "utf-8");
      return sendJson(res, 200, { file: normalizedRelFile.replace(/\\/g, "/"), content });
    } catch (error) {
      if (error && error.code === "ENOENT") return sendJson(res, 404, { error: "Media markdown file not found" });
      return sendJson(res, 500, { error: "Failed to read media markdown", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/media/markdown") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const relFile = payload.file;
      const content = typeof payload.content === "string" ? payload.content : null;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!relFile) return sendJson(res, 400, { error: "Missing media file path" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const normalizedRelFile = normalizeRelativeFilePath(relFile);
      if (!normalizedRelFile || !normalizedRelFile.toLowerCase().endsWith(".md")) {
        return sendJson(res, 400, { error: "Only .md files are allowed" });
      }

      const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute, { create: true });
      if (!folderAbsolute) return sendJson(res, 404, { error: "Media folder not found" });

      const fileAbsolute = path.join(folderAbsolute, normalizedRelFile);
      if (!fileAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid media file path" });

      await fs.mkdir(path.dirname(fileAbsolute), { recursive: true });
      const raw = await fs.readFile(fileAbsolute, "utf-8").catch(() => "");
      const { frontmatter: diskFrontmatter } = splitNodeFrontmatter(raw);
      const stampedContent = applyAwnTimestampsToMarkdownContent(content, diskFrontmatter);
      await fs.writeFile(fileAbsolute, stampedContent, "utf-8");
      return sendJson(res, 200, { file: normalizedRelFile.replace(/\\/g, "/"), content: stampedContent });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save media markdown", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/external/file/rename") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const relFile = payload.file;
      const title = String(payload.title || "").trim();
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!relFile) return sendJson(res, 400, { error: "Missing external file path" });
      if (!title) return sendJson(res, 400, { error: "Title cannot be empty" });

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const normalizedRelFile = normalizeRelativeFilePath(relFile);
      if (!normalizedRelFile || !normalizedRelFile.toLowerCase().endsWith(".md")) {
        return sendJson(res, 400, { error: "Only .md files are allowed" });
      }

      const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_CONTENT);
      if (!folderAbsolute) return sendJson(res, 404, { error: "External folder not found" });

      const currentAbsolute = path.join(folderAbsolute, normalizedRelFile);
      if (!currentAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid external file path" });

      const nextName = toExternalMarkdownFileName(title);
      if (!nextName) return sendJson(res, 400, { error: "Invalid file name" });
      const dirRelPath = path.dirname(normalizedRelFile);
      const nextRelPath = (dirRelPath && dirRelPath !== "."
        ? path.join(dirRelPath, nextName)
        : nextName).replace(/\\/g, "/");
      const nextAbsolute = path.join(folderAbsolute, nextRelPath);
      if (!nextAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid target path" });

      if (path.resolve(currentAbsolute) !== path.resolve(nextAbsolute)) {
        if (await targetPathOccupiedByOther(currentAbsolute, nextAbsolute)) {
          return sendJson(res, 409, { error: "File with this name already exists" });
        }
        await renamePathCaseAware(currentAbsolute, nextAbsolute);
      }

      const content = await fs.readFile(nextAbsolute, "utf-8");
      let linkRewrite = { filesUpdated: 0, linksUpdated: 0, files: [] };
      const oldWorkspaceRel = await resolveExternalFileWorkspaceRel(relPath, normalizedRelFile);
      const newWorkspaceRel = await resolveExternalFileWorkspaceRel(relPath, nextRelPath);
      if (
        oldWorkspaceRel &&
        newWorkspaceRel &&
        oldWorkspaceRel.replace(/\\/g, "/") !== newWorkspaceRel.replace(/\\/g, "/")
      ) {
        linkRewrite = await rewriteMarkdownLinksForRename({
          exactMappings: [{ oldRel: oldWorkspaceRel, newRel: newWorkspaceRel }]
        });
      }
      return sendJson(res, 200, { file: nextRelPath, content, linkRewrite });
    } catch (error) {
      const code = error && error.code ? String(error.code) : "";
      if (code === "ENOENT") return sendJson(res, 404, { error: "External file not found" });
      return sendJson(res, 500, { error: "Failed to rename external file", details: String(error.message || error) });
    }
  }

  if (req.method === "DELETE" && url.pathname === "/api/external/file") {
    const relPath = url.searchParams.get("path");
    const relFile = url.searchParams.get("file");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!relFile) return sendJson(res, 400, { error: "Missing file query parameter" });

    try {
      const result = await deleteExternalMemoryFile(relPath, relFile);
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendFileOpError(res, error, "delete external file");
    }
  }

  if (req.method === "POST" && url.pathname === "/api/external/file/move") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const relFile = payload.file;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!relFile) return sendJson(res, 400, { error: "Missing external file path" });

      const result = await moveExternalMemoryFile(relPath, relFile, {
        targetPath: payload.targetPath,
        targetFile: payload.targetFile
      });
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendFileOpError(res, error, "move external file");
    }
  }

  if (req.method === "GET" && url.pathname === "/api/media") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    const folderParam = String(url.searchParams.get("folder") || STORAGE_SUBFOLDER_MEDIA).trim();
    const folderName = isAllowedStorageSubfolderName(folderParam) ? folderParam : STORAGE_SUBFOLDER_MEDIA;
    const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, folderName);
    if (!folderAbsolute) return sendJson(res, 200, { exists: false, files: 0, content: "", groups: {} });

    try {
      const stat = await fs.stat(folderAbsolute);
      if (!stat.isDirectory()) {
        return sendJson(res, 200, { exists: false, files: 0, content: "", groups: {} });
      }

      const sectionManifests = [];
      const items = await collectMediaFilesStructured(folderAbsolute, "", [], sectionManifests);
      const groups = groupMediaFiles(items);
      const { content, files } = buildMediaListContent(groups);

      const sectionRelPaths = [];
      for (const manifest of sectionManifests) {
        const manifestPath = String(manifest.path || "").replace(/\\/g, "/");
        if (!manifestPath) continue;
        const folderKey = manifestPath.slice(0, manifestPath.length - AREA_MANIFEST_FILE.length).replace(/\/$/, "");
        if (folderKey) sectionRelPaths.push(folderKey);
      }
      for (const item of items) {
        const itemPath = String(item.path || "").replace(/\\/g, "/");
        if (!itemPath) continue;
        const parentParts = itemPath.split("/").filter(Boolean);
        parentParts.pop();
        if (parentParts.length) sectionRelPaths.push(parentParts.join("/"));
      }
      const sectionSortOrders = await collectMemorySectionSortOrders(folderAbsolute, sectionRelPaths);

      return sendJson(res, 200, {
        exists: true,
        files,
        content,
        groups,
        sectionManifests,
        sectionSortOrders
      });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return sendJson(res, 200, { exists: false, files: 0, content: "", groups: {} });
      }
      return sendJson(res, 500, { error: "Failed to read media", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/media/file") {
    try {
      const payload = await readJsonBody(req, 12_000_000);
      const relPath = payload.path;
      const contextRel = payload.contextPath || relPath;
      const data = payload.data;
      const fileName = payload.fileName;
      const mimeType = payload.mimeType;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!data || typeof data !== "string") return sendJson(res, 400, { error: "Missing file data" });

      const storageContext = await resolveApiStorageContext(contextRel);
      if (!storageContext) return sendJson(res, 400, { error: "Invalid storage context path" });

      const buffer = Buffer.from(data, "base64");
      if (!buffer.length) return sendJson(res, 400, { error: "Empty file data" });
      if (buffer.length > 10 * 1024 * 1024) {
        return sendJson(res, 400, { error: "File is too large (max 10 MB)" });
      }

      const subdir = normalizeRelativeFilePath(String(payload.subdir || "").trim());
      const createSubdir = Boolean(payload.createSubdir);
      const isInlineUpload = isInlineAssetsUploadSubdir(subdir);

      let targetFolder = null;
      if (isInlineUpload) {
        targetFolder = await resolveInlineAssetsFolderAbsolute(storageContext.absolute, subdir, {
          create: createSubdir || true
        });
      } else {
        const libraryFolder = String(payload.libraryFolder || payload.folder || STORAGE_SUBFOLDER_MEDIA).trim();
        const folderName = isAllowedStorageSubfolderName(libraryFolder)
          ? libraryFolder
          : STORAGE_SUBFOLDER_MEDIA;
        const folderAbsolute = await resolveNodeSubfolderAbsolute(storageContext.absolute, folderName, {
          create: true
        });
        if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid media folder path" });
        targetFolder = await resolveMediaTargetFolderAbsolute(folderAbsolute, subdir, {
          create: createSubdir
        });
      }
      if (!targetFolder) {
        return sendJson(res, 400, {
          error: subdir ? "Target section not found" : "Invalid media folder path"
        });
      }

      const imageExt = resolveMediaImageExtension(mimeType, fileName, buffer);
      let storedRelFile = null;

      if (imageExt) {
        if (!validateMediaImageBufferByExt(buffer, imageExt)) {
          return sendJson(res, 400, { error: "Invalid image file", details: "File content does not match format" });
        }
        const safeBase = sanitizeMediaFileName(fileName)?.replace(/\.[^.]+$/, "") || "image";
        const targetAbsolute = await resolveUniqueMediaFileAbsolute(targetFolder, `${safeBase}${imageExt}`);
        if (!targetAbsolute || !targetAbsolute.startsWith(targetFolder)) {
          return sendJson(res, 400, { error: "Invalid media file path" });
        }
        await fs.writeFile(targetAbsolute, buffer);
        storedRelFile = path.relative(targetFolder, targetAbsolute).replace(/\\/g, "/");
      } else {
        const safeName = sanitizeMediaFileName(fileName);
        if (!safeName) return sendJson(res, 400, { error: "Invalid file name" });
        const targetAbsolute = await resolveUniqueMediaFileAbsolute(targetFolder, safeName);
        if (!targetAbsolute || !targetAbsolute.startsWith(targetFolder)) {
          return sendJson(res, 400, { error: "Invalid media file path" });
        }
        await fs.writeFile(targetAbsolute, buffer);
        storedRelFile = path.relative(targetFolder, targetAbsolute).replace(/\\/g, "/");
      }

      const assetsRelFile = isInlineUpload
        ? `${STORAGE_SUBFOLDER_ASSETS}/${subdir}/${storedRelFile}`
        : subdir
          ? `${subdir}/${storedRelFile}`
          : storedRelFile;
      const workspaceRef = isInlineUpload
        ? buildAssetsUploadRef(storageContext.rel, subdir, storedRelFile)
        : undefined;

      return sendJson(res, 200, {
        file: storedRelFile,
        assetsFile: assetsRelFile,
        workspaceRef,
        imageUrl: `/api/media/file?path=${encodeURIComponent(relPath)}&contextPath=${encodeURIComponent(storageContext.rel)}&file=${encodeURIComponent(assetsRelFile)}`
      });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to upload media file", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/media/file") {
    const relPath = url.searchParams.get("path");
    const contextPath = url.searchParams.get("contextPath");
    const relFile = url.searchParams.get("file");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!relFile) return sendJson(res, 400, { error: "Missing file query parameter" });

    const storageContext = await resolveApiStorageContext(contextPath || relPath);
    if (!storageContext) return sendJson(res, 400, { error: "Invalid storage context path" });

    const normalizedRelFile = normalizeRelativeFilePath(relFile);
    if (!normalizedRelFile) return sendJson(res, 400, { error: "Invalid media file path" });

    const fileAbsolute = await resolveUploadedMediaFileAbsolute(storageContext.absolute, normalizedRelFile);
    if (!fileAbsolute) return sendJson(res, 404, { error: "Media file not found" });

    try {
      const thumb = wantsThumbVariant(url.searchParams);
      const sent = await sendImageFileResponse(res, fileAbsolute, {
        thumb,
        thumbMax: clampThumbMax(url.searchParams.get("max"))
      });
      if (!sent) return sendJson(res, 404, { error: "Media file not found" });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return sendJson(res, 404, { error: "Media file not found" });
      }
      return sendJson(res, 500, { error: "Failed to read media file", details: String(error.message || error) });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/configuration") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    const configRelPath = toConfigurationFilePath(relPath);
    const configAbsolute = await resolveNodeStorageFileAbsolute(nodeAbsolute, BUNDLE_CONFIG_FILE);
    if (!configAbsolute) return sendJson(res, 400, { error: "Invalid configuration path" });

    try {
      const content = await fs.readFile(configAbsolute, "utf-8");
      return sendJson(res, 200, { path: configRelPath, content, exists: true });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return sendJson(res, 200, { path: configRelPath, content: "", exists: false });
      }
      return sendJson(res, 500, { error: "Failed to read configuration", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/configuration") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const content = typeof payload.content === "string" ? payload.content : null;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const configRelPath = toConfigurationFilePath(relPath);
      const configAbsolute = await resolveNodeStorageFileAbsolute(nodeAbsolute, BUNDLE_CONFIG_FILE, {
        create: true
      });
      if (!configAbsolute) return sendJson(res, 400, { error: "Invalid configuration path" });

      await fs.writeFile(configAbsolute, content, "utf-8");
      return sendJson(res, 200, { path: configRelPath, content });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save configuration", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/env") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const manifestCtx = await resolveApiManifestContext(relPath);
    if (!manifestCtx) return sendJson(res, 400, { error: "Invalid file path" });

    const envRelPath = toEnvFilePath(manifestCtx.rel);
    const envAbsolute = await resolveNodeStorageFileAbsolute(manifestCtx.absolute, ".env");
    if (!envAbsolute) return sendJson(res, 400, { error: "Invalid .env path" });

    try {
      const content = await fs.readFile(envAbsolute, "utf-8");
      return sendJson(res, 200, { path: envRelPath, content, exists: true });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return sendJson(res, 200, { path: envRelPath, content: "", exists: false });
      }
      return sendJson(res, 500, { error: "Failed to read .env", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/env") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const content = typeof payload.content === "string" ? payload.content : null;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const manifestCtx = await resolveApiManifestContext(relPath);
      if (!manifestCtx) return sendJson(res, 400, { error: "Invalid file path" });

      const envRelPath = toEnvFilePath(manifestCtx.rel);
      const envAbsolute = await resolveNodeStorageFileAbsolute(manifestCtx.absolute, ".env", { create: true });
      if (!envAbsolute) return sendJson(res, 400, { error: "Invalid .env path" });

      await writeWorkspaceTextFileWithHistory(manifestCtx.rel, manifestRelFromNodeAbsolute(envAbsolute), content);
      return sendJson(res, 200, { path: envRelPath, content, exists: true });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save .env", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/todo") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const manifestRel = resolveNodeManifestRelForScopedApi(relPath);
    if (!manifestRel) {
      return sendJson(res, 400, {
        error: "Invalid file path",
        details: "Нужен манифест (*.md, _registration.md) или файл todo (awn-storage/*/todo.md)"
      });
    }

    try {
      const todo = await readTodoContent(manifestRel);
      return sendJson(res, 200, todo);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to read TODO", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/todo") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const content = typeof payload.content === "string" ? payload.content : null;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const manifestRel = resolveNodeManifestRelForScopedApi(relPath);
      if (!manifestRel) {
        return sendJson(res, 400, {
          error: "Invalid file path",
          details: "Нужен манифест (*.md, _registration.md) или файл todo (awn-storage/*/todo.md)"
        });
      }

      const resolvedManifest = await resolveExistingWorkspaceRelPath(manifestRel);
      const todoRelPath = await writeTodoFiles(resolvedManifest, content);

      return sendJson(res, 200, { path: todoRelPath, content, exists: true });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save TODO", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/reveal/folder") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    try {
      const target = await resolveNodeContainerForReveal(relPath);
      return sendJson(res, 200, target);
    } catch (error) {
      if (error?.code === "NOT_DIRECTORY") {
        const absolute = normalizeWorkspacePath(relPath);
        if (absolute) {
          try {
            const stat = await fs.stat(absolute);
            if (stat.isFile()) {
              const fileRel = path.relative(getAgentRoot(), absolute).replace(/\\/g, "/");
              return sendJson(res, 200, {
                folderRel: fileRel,
                folderAbsolute: absolute,
                fileAbsolute: absolute,
                isFile: true
              });
            }
          } catch (statError) {
            if (statError?.code === "ENOENT") {
              return sendJson(res, 404, { error: "File not found" });
            }
            throw statError;
          }
        }
      }
      if (error?.code === "INVALID_PATH") {
        return sendJson(res, 400, { error: "Invalid file path" });
      }
      if (error?.code === "NOT_DIRECTORY") {
        return sendJson(res, 400, { error: "Node folder not found" });
      }
      if (error?.code === "ENOENT") {
        return sendJson(res, 404, { error: "Node folder not found" });
      }
      return sendJson(res, 500, {
        error: "Failed to resolve folder",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/reveal/file") {
    const manifestRelPath = url.searchParams.get("path") || "";
    const relFile = url.searchParams.get("file") || "";
    if (!manifestRelPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!relFile) return sendJson(res, 400, { error: "Missing file query parameter" });

    try {
      const target = await resolveMediaFileAbsoluteForReveal(manifestRelPath, relFile);
      return sendJson(res, 200, target);
    } catch (error) {
      if (error?.code === "INVALID_PATH") {
        return sendJson(res, 400, { error: "Invalid file path" });
      }
      if (error?.code === "NOT_FILE") {
        return sendJson(res, 400, { error: "File not found" });
      }
      if (error?.code === "ENOENT") {
        return sendJson(res, 404, { error: "File not found" });
      }
      return sendJson(res, 500, {
        error: "Failed to resolve file",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/reveal") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const relFile = payload.file || "";
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });

      if (payload.workspace) {
        const target = await revealWorkspaceRelativePath(relPath, { repoFile: Boolean(payload.repoFile) });
        return sendJson(res, 200, { path: target.path, revealed: true, workspace: true });
      }

      if (relFile) {
        const target = await resolveMediaFileAbsoluteForReveal(relPath, relFile);
        await revealFileInSystemFileManager(target.fileAbsolute);
        return sendJson(res, 200, {
          path: target.fileRel,
          file: relFile,
          revealed: true,
          selected: true
        });
      }

      const target = await resolveNodeContainerForReveal(relPath);
      await revealFolderInSystemFileManager(target.folderAbsolute);
      return sendJson(res, 200, { path: target.folderRel, revealed: true });
    } catch (error) {
      if (error?.code === "INVALID_PATH") {
        return sendJson(res, 400, { error: "Invalid file path" });
      }
      if (error?.code === "NOT_DIRECTORY") {
        return sendJson(res, 400, { error: "Node folder not found" });
      }
      if (error?.code === "NOT_FILE") {
        return sendJson(res, 400, { error: "File not found" });
      }
      if (error?.code === "ENOENT") {
        return sendJson(res, 404, { error: "File not found" });
      }
      return sendJson(res, 500, {
        error: "Failed to reveal folder",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/node/meta") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    try {
      const canonicalRelPath = await resolveCanonicalManifestRelPath(relPath);
      const manifestAbsolute = normalizeWorkspacePath(canonicalRelPath);
      if (!manifestAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(manifestAbsolute)) {
        return sendJson(res, 400, { error: "Only manifest markdown files are allowed (*.md, _registration.md)" });
      }

      const manifest = await statNodeFileMeta(manifestAbsolute);
      if (!manifest) return sendJson(res, 404, { error: "File not found" });

      manifest.path = canonicalRelPath.replace(/\\/g, "/");

      const containerDir = getNodeContainerDir(manifestAbsolute);
      const folder = await statNodeDirMeta(containerDir);
      const { frontmatter } = await readNodeFrontmatterContent(canonicalRelPath);
      const props = frontmatter.trim()
        ? {
            ...manifest,
            path: manifest.path,
            embedded: true
          }
        : null;

      return sendJson(res, 200, {
        path: canonicalRelPath.replace(/\\/g, "/"),
        manifest,
        folder,
        props
      });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to read node meta", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/preview") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const resolvedRelPath = await resolveExistingWorkspaceRelPath(relPath);
    const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    const isManifest = isManifestMdAbsolute(nodeAbsolute);
    if (!isManifest && !(await resolveApiStorageContextAbsolute(relPath))) {
      return sendJson(res, 400, { error: "Invalid file path" });
    }

    const previewMeta = await getNodePreviewMeta(relPath);
    if (!previewMeta.hasPreview || !previewMeta.previewUrl) {
      return sendJson(res, 200, { exists: false, file: null, imageUrl: null });
    }

    return sendJson(res, 200, {
      exists: true,
      file: previewMeta.previewFile || null,
      imageUrl: previewMeta.previewUrl
    });
  }

  if (req.method === "GET" && url.pathname === "/api/preview/image") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const resolvedRelPath = await resolveExistingWorkspaceRelPath(relPath);
    const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only manifest markdown files are allowed (*.md, _registration.md)" });

    const imageAbsolute = await findNodePreviewImageAbsolute(nodeAbsolute);
    if (!imageAbsolute) return sendJson(res, 404, { error: "Preview image not found" });

    try {
      const thumb = wantsThumbVariant(url.searchParams);
      const sent = await sendImageFileResponse(res, imageAbsolute, {
        thumb,
        thumbMax: clampThumbMax(url.searchParams.get("max")),
        cacheControl: "no-cache"
      });
      if (!sent) return sendJson(res, 404, { error: "Preview image not found" });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to read preview image", details: String(error.message || error) });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/preview") {
    try {
      const payload = await readJsonBody(req, 12_000_000);
      const relPath = payload.path;
      const data = payload.data;
      const fileName = payload.fileName;
      const mimeType = payload.mimeType;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!data || typeof data !== "string") return sendJson(res, 400, { error: "Missing image data" });

      const resolvedRelPath = await resolveExistingWorkspaceRelPath(relPath);
      const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only manifest markdown files are allowed (*.md, _registration.md)" });

      const previewExt = resolveNodePreviewExtension(mimeType, fileName);
      if (!previewExt) {
        return sendJson(res, 400, {
          error: "Invalid preview format",
          details: "Allowed formats: JPG, PNG, GIF → saved as {папка ноды}/awn-storage/*/preview.{jpg|png|gif}"
        });
      }

      const buffer = Buffer.from(data, "base64");
      if (!buffer.length) return sendJson(res, 400, { error: "Empty image data" });
      if (buffer.length > 10 * 1024 * 1024) return sendJson(res, 400, { error: "Image is too large (max 10 MB)" });
      if (!validatePreviewImageBufferByExt(buffer, previewExt)) {
        return sendJson(res, 400, {
          error: "Invalid image file",
          details: "File content does not match the selected JPG, PNG or GIF format"
        });
      }

      await clearAllNodePreviewImages(nodeAbsolute);
      const targetAbsolute = await getOrCreateNodePreviewSidecarAbsolute(nodeAbsolute, previewExt);
      if (!targetAbsolute) return sendJson(res, 400, { error: "Invalid preview path" });
      const storedName = path.basename(targetAbsolute);
      await fs.writeFile(targetAbsolute, buffer);
      await cleanupNodePreviewDirsForNode(nodeAbsolute);

      return sendJson(res, 200, {
        exists: true,
        file: storedName,
        imageUrl: `/api/preview/image?path=${encodeURIComponent(relPath)}`
      });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to upload preview image", details: String(error.message || error) });
    }
  }

  if (req.method === "DELETE" && url.pathname === "/api/preview") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const resolvedRelPath = await resolveExistingWorkspaceRelPath(relPath);
    const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only manifest markdown files are allowed (*.md, _registration.md)" });

    try {
      await clearAllNodePreviewImages(nodeAbsolute);
      return sendJson(res, 200, { exists: false, file: null, imageUrl: null });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to delete preview image", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/media/attachments") {
    const relPath = url.searchParams.get("path");
    const contextPath = url.searchParams.get("contextPath") || relPath;
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const storageContext = await resolveApiStorageContext(contextPath);
    if (!storageContext) return sendJson(res, 400, { error: "Invalid storage context path" });

    try {
      const files = await listStorageAttachmentFiles(storageContext);
      return sendJson(res, 200, { files });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to list attachment files",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/media/sidecar") {
    const relPath = url.searchParams.get("path");
    const contextPath = url.searchParams.get("contextPath");
    const relFile = url.searchParams.get("file");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!relFile) return sendJson(res, 400, { error: "Missing file query parameter" });

    const storageContext = await resolveApiStorageContext(contextPath || relPath);
    if (!storageContext) return sendJson(res, 400, { error: "Invalid storage context path" });

    const normalizedRelFile = normalizeRelativeFilePath(relFile);
    if (!normalizedRelFile) return sendJson(res, 400, { error: "Invalid media file path" });

    const mediaAbsolute = await resolveUploadedMediaFileAbsolute(storageContext.absolute, normalizedRelFile);
    if (!mediaAbsolute) return sendJson(res, 404, { error: "Media file not found" });

    const sidecarRelPath = toMediaSidecarRelativePath(normalizedRelFile);
    if (!sidecarRelPath) return sendJson(res, 400, { error: "Invalid media file path" });

    const sidecarAbsolute = await resolveMediaSidecarAbsolute(
      storageContext.absolute,
      mediaAbsolute,
      normalizedRelFile
    );
    if (!sidecarAbsolute) return sendJson(res, 400, { error: "Invalid sidecar file path" });

    try {
      const mediaStat = await fs.stat(mediaAbsolute);
      if (!mediaStat.isFile()) return sendJson(res, 404, { error: "Media file not found" });

      let content = "";
      let exists = false;
      try {
        content = await fs.readFile(sidecarAbsolute, "utf-8");
        exists = true;
      } catch (error) {
        if (!error || error.code !== "ENOENT") throw error;
      }

      return sendJson(res, 200, {
        sourceFile: normalizedRelFile.replace(/\\/g, "/"),
        sidecar: sidecarRelPath.replace(/\\/g, "/"),
        content,
        exists
      });
    } catch (error) {
      if (error && error.code === "ENOENT") return sendJson(res, 404, { error: "Media file not found" });
      return sendJson(res, 500, { error: "Failed to read media sidecar", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/media/sidecar") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const contextPath = payload.contextPath || relPath;
      const relFile = payload.file;
      const content = typeof payload.content === "string" ? payload.content : null;

      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!relFile) return sendJson(res, 400, { error: "Missing media file path" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const storageContext = await resolveApiStorageContext(contextPath);
      if (!storageContext) return sendJson(res, 400, { error: "Invalid storage context path" });

      const normalizedRelFile = normalizeRelativeFilePath(relFile);
      if (!normalizedRelFile) return sendJson(res, 400, { error: "Invalid media file path" });

      const mediaAbsolute = await resolveUploadedMediaFileAbsolute(storageContext.absolute, normalizedRelFile);
      if (!mediaAbsolute) return sendJson(res, 404, { error: "Media file not found" });

      const sidecarRelPath = toMediaSidecarRelativePath(normalizedRelFile);
      if (!sidecarRelPath) return sendJson(res, 400, { error: "Invalid media file path" });

      const sidecarAbsolute = resolveMediaSidecarAbsoluteFromMediaFile(mediaAbsolute);
      if (!sidecarAbsolute || !(await isAllowedMediaSidecarAbsolute(storageContext.absolute, sidecarAbsolute))) {
        return sendJson(res, 400, { error: "Invalid sidecar file path" });
      }

      const mediaStat = await fs.stat(mediaAbsolute);
      if (!mediaStat.isFile()) return sendJson(res, 404, { error: "Media file not found" });

      const historyManifest = storageContext.rel;
      const targetRelPath = manifestRelFromNodeAbsolute(sidecarAbsolute);
      const raw = await fs.readFile(sidecarAbsolute, "utf-8").catch(() => "");
      const { frontmatter: diskFrontmatter } = splitNodeFrontmatter(raw);
      const stampedContent = applyAwnTimestampsToMarkdownContent(content, diskFrontmatter);
      await writeWorkspaceTextFileWithHistory(historyManifest, targetRelPath, stampedContent);

      return sendJson(res, 200, {
        sourceFile: normalizedRelFile.replace(/\\/g, "/"),
        sidecar: sidecarRelPath.replace(/\\/g, "/"),
        content: stampedContent
      });
    } catch (error) {
      if (error && error.code === "ENOENT") return sendJson(res, 404, { error: "Media file not found" });
      return sendJson(res, 500, { error: "Failed to save media sidecar", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/media/file/rename") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const relFile = payload.file;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!relFile) return sendJson(res, 400, { error: "Missing media file path" });

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const normalizedRelFile = normalizeRelativeFilePath(relFile);
      if (!normalizedRelFile) return sendJson(res, 400, { error: "Invalid media file path" });

      const nextName = toMediaRenamedFileName(normalizedRelFile, payload.title ?? payload.name);
      if (!nextName) return sendJson(res, 400, { error: "Invalid file name" });

      const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute);
      if (!folderAbsolute) return sendJson(res, 404, { error: "Media folder not found" });

      const currentAbsolute = path.join(folderAbsolute, normalizedRelFile);
      if (!currentAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid media file path" });

      const dirRelPath = path.dirname(normalizedRelFile);
      const nextRelFile = (dirRelPath && dirRelPath !== "."
        ? path.join(dirRelPath, nextName)
        : nextName).replace(/\\/g, "/");
      const nextAbsolute = path.join(folderAbsolute, nextRelFile);
      if (!nextAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid target path" });

      if (currentAbsolute !== nextAbsolute) {
        try {
          await fs.access(nextAbsolute);
          return sendJson(res, 409, { error: "File with this name already exists" });
        } catch {
          // target does not exist
        }
        await fs.rename(currentAbsolute, nextAbsolute);

        const sidecarAbsolute = resolveMediaSidecarAbsoluteFromMediaFile(currentAbsolute);
        const nextSidecarAbsolute = resolveMediaSidecarAbsoluteFromMediaFile(nextAbsolute);
        if (
          sidecarAbsolute &&
          nextSidecarAbsolute &&
          (await isAllowedMediaSidecarAbsolute(nodeAbsolute, sidecarAbsolute)) &&
          (await isAllowedMediaSidecarAbsolute(nodeAbsolute, nextSidecarAbsolute))
        ) {
          try {
            await fs.rename(sidecarAbsolute, nextSidecarAbsolute);
          } catch (error) {
            if (!error || error.code !== "ENOENT") throw error;
          }
        }
      }

      const sidecarRelPath = toMediaSidecarRelativePath(nextRelFile);
      let content = "";
      if (sidecarRelPath) {
        const nextSidecarAbsolute = resolveMediaSidecarAbsoluteFromMediaFile(nextAbsolute);
        if (nextSidecarAbsolute) {
          try {
            content = await fs.readFile(nextSidecarAbsolute, "utf-8");
          } catch {
            content = "";
          }
        }
      }

      let linkRewrite = { filesUpdated: 0, linksUpdated: 0, files: [] };
      if (currentAbsolute !== nextAbsolute) {
        const exactMappings = [];
        const oldAssetRel = manifestRelFromNodeAbsolute(currentAbsolute);
        const newAssetRel = manifestRelFromNodeAbsolute(nextAbsolute);
        if (oldAssetRel && newAssetRel && oldAssetRel !== newAssetRel) {
          exactMappings.push({ oldRel: oldAssetRel, newRel: newAssetRel });
        }
        const oldSidecarAbsolute = resolveMediaSidecarAbsoluteFromMediaFile(currentAbsolute);
        const newSidecarAbsolute = resolveMediaSidecarAbsoluteFromMediaFile(nextAbsolute);
        if (oldSidecarAbsolute && newSidecarAbsolute && oldSidecarAbsolute !== newSidecarAbsolute) {
          const oldSidecarWorkspaceRel = manifestRelFromNodeAbsolute(oldSidecarAbsolute);
          const newSidecarWorkspaceRel = manifestRelFromNodeAbsolute(newSidecarAbsolute);
          if (
            oldSidecarWorkspaceRel &&
            newSidecarWorkspaceRel &&
            oldSidecarWorkspaceRel !== newSidecarWorkspaceRel
          ) {
            exactMappings.push({
              oldRel: oldSidecarWorkspaceRel,
              newRel: newSidecarWorkspaceRel
            });
          }
        }
        if (exactMappings.length) {
          linkRewrite = await rewriteMarkdownLinksForRename({ exactMappings });
        }
      }

      return sendJson(res, 200, {
        file: nextRelFile,
        sidecar: sidecarRelPath ? sidecarRelPath.replace(/\\/g, "/") : "",
        content,
        linkRewrite
      });
    } catch (error) {
      const code = error && error.code ? String(error.code) : "";
      if (code === "ENOENT") return sendJson(res, 404, { error: "Media file not found" });
      return sendJson(res, 500, { error: "Failed to rename media file", details: String(error.message || error) });
    }
  }

  if (req.method === "DELETE" && url.pathname === "/api/media/file") {
    const relPath = url.searchParams.get("path");
    const relFile = url.searchParams.get("file");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!relFile) return sendJson(res, 400, { error: "Missing file query parameter" });

    try {
      const result = await deleteMediaStorageFile(relPath, relFile);
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendFileOpError(res, error, "delete media file");
    }
  }

  if (req.method === "POST" && url.pathname === "/api/media/file/move") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const relFile = payload.file;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!relFile) return sendJson(res, 400, { error: "Missing media file path" });

      const result = await moveMediaStorageFile(relPath, relFile, {
        targetPath: payload.targetPath,
        targetFile: payload.targetFile
      });
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendFileOpError(res, error, "move media file");
    }
  }

  if (req.method === "POST" && url.pathname === "/api/workspace/folder/upload") {
    try {
      const payload = await readJsonBody(req, 12_000_000);
      const folderPath = String(payload.folderPath || "").trim().replace(/\\/g, "/");
      const data = payload.data;
      const fileName = String(payload.fileName || "").trim();
      const mimeType = String(payload.mimeType || "").trim();
      if (!folderPath) return sendJson(res, 400, { error: "Missing folderPath" });
      if (!data || typeof data !== "string") return sendJson(res, 400, { error: "Missing file data" });
      if (!fileName) return sendJson(res, 400, { error: "Missing file name" });

      const folderAbsolute = await resolveExistingWorkspaceDirAbsolute(folderPath);
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid folder path" });

      const folderStat = await fs.stat(folderAbsolute).catch(() => null);
      if (!folderStat?.isDirectory()) {
        return sendJson(res, 404, { error: "Folder not found" });
      }

      const manifestAbs = path.join(folderAbsolute, AREA_MANIFEST_FILE);
      const topicManifestAbs = path.join(folderAbsolute, MANIFEST_FILE);
      if ((await fileExists(manifestAbs)) || (await fileExists(topicManifestAbs))) {
        return sendJson(res, 400, {
          error: "Target folder is a registered area or topic; use media or memory upload instead"
        });
      }

      const buffer = Buffer.from(data, "base64");
      if (!buffer.length) return sendJson(res, 400, { error: "Empty file data" });
      if (buffer.length > 45 * 1024 * 1024) {
        return sendJson(res, 400, { error: "File is too large (max 45 MB)" });
      }

      const imageExt = resolveMediaImageExtension(mimeType, fileName, buffer);
      let storedRelFile = null;

      if (imageExt) {
        if (!validateMediaImageBufferByExt(buffer, imageExt)) {
          return sendJson(res, 400, { error: "Invalid image file", details: "File content does not match format" });
        }
        const safeBase = sanitizeMediaFileName(fileName)?.replace(/\.[^.]+$/, "") || "image";
        const targetAbsolute = await resolveUniqueMediaFileAbsolute(folderAbsolute, `${safeBase}${imageExt}`);
        if (!targetAbsolute || !isPathInsideDirectory(folderAbsolute, targetAbsolute)) {
          return sendJson(res, 400, { error: "Invalid file path" });
        }
        await fs.writeFile(targetAbsolute, buffer);
        storedRelFile = path.relative(folderAbsolute, targetAbsolute).replace(/\\/g, "/");
      } else {
        const safeName = sanitizeMediaFileName(fileName);
        if (!safeName) return sendJson(res, 400, { error: "Invalid file name" });
        const targetAbsolute = await resolveUniqueMediaFileAbsolute(folderAbsolute, safeName);
        if (!targetAbsolute || !isPathInsideDirectory(folderAbsolute, targetAbsolute)) {
          return sendJson(res, 400, { error: "Invalid file path" });
        }
        await fs.writeFile(targetAbsolute, buffer);
        storedRelFile = path.relative(folderAbsolute, targetAbsolute).replace(/\\/g, "/");
      }

      const storedPath = `${folderPath.replace(/\\/g, "/").replace(/\/+$/, "")}/${storedRelFile}`.replace(
        /\/+/g,
        "/"
      );
      return sendJson(res, 200, {
        folderPath,
        file: storedRelFile,
        path: storedPath,
        size: buffer.length
      });
    } catch (error) {
      const code = error && error.code ? String(error.code) : "";
      if (code === "EPERM" || code === "EACCES") {
        return sendJson(res, 403, {
          error: "No permission to write in agent workspace",
          details: String(error.message || error)
        });
      }
      return sendJson(res, 500, {
        error: "Failed to upload workspace folder file",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/workspace/folder/rename") {
    try {
      const payload = await readJsonBody(req);
      const relPath = String(payload.path || "").trim();
      const newName = String(payload.newName || "").trim();
      if (!relPath) return sendJson(res, 400, { error: "Missing path" });
      if (!newName) return sendJson(res, 400, { error: "Missing newName" });

      const result = await renameWorkspaceFreeMemoryPath(relPath, newName);
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });

      recordWorkspaceActivity({
        action: "rename",
        path: String(result.path || relPath).replace(/\\/g, "/"),
        label: path.posix.basename(String(result.path || relPath).replace(/\\/g, "/"))
      });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendFileOpError(res, error, "rename workspace folder item");
    }
  }

  if (req.method === "POST" && url.pathname === "/api/workspace/folder/move") {
    try {
      const payload = await readJsonBody(req);
      const relPath = String(payload.path || "").trim();
      const parentPath = payload.parentPath;
      if (!relPath) return sendJson(res, 400, { error: "Missing path" });
      if (parentPath === undefined || parentPath === null) {
        return sendJson(res, 400, { error: "Missing parentPath" });
      }

      const result = await moveWorkspaceFreeMemoryPath(relPath, parentPath);
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });

      recordWorkspaceActivity({
        action: "move",
        path: String(result.path || relPath).replace(/\\/g, "/"),
        label: path.posix.basename(String(result.path || relPath).replace(/\\/g, "/"))
      });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendFileOpError(res, error, "move workspace folder item");
    }
  }

  if (req.method === "POST" && url.pathname === "/api/workspace/folder/delete") {
    try {
      const payload = await readJsonBody(req);
      const result = await deleteWorkspaceFreeMemoryPaths(payload.paths);
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });

      for (const deletedPath of result.deleted || []) {
        recordWorkspaceActivity({
          action: "delete",
          path: String(deletedPath).replace(/\\/g, "/"),
          label: path.posix.basename(String(deletedPath).replace(/\\/g, "/"))
        });
      }
      return sendJson(res, 200, result);
    } catch (error) {
      const code = error && error.code ? String(error.code) : "";
      if (code === "ENOENT") return sendJson(res, 404, { error: "Path not found" });
      if (code === "EPERM" || code === "EACCES") {
        return sendJson(res, 403, { error: "No permission to delete" });
      }
      return sendJson(res, 500, {
        error: "Failed to delete workspace folder item",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/workspace/folder/adopt") {
    try {
      const data = await listWorkspaceAdoptFolders();
      return sendJson(res, 200, data);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to list adopt folders",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/workspace/folder/scan") {
    const folderPath = String(url.searchParams.get("folderPath") || "").trim();
    if (!folderPath) return sendJson(res, 400, { error: "Missing folderPath query parameter" });

    try {
      const data = await scanWorkspaceFolder(folderPath, {
        depth: url.searchParams.get("depth") || "1",
        includeBody: url.searchParams.get("includeBody") === "true",
        maxBodyChars: url.searchParams.get("maxBodyChars") || "4000"
      });
      if (data.error) return sendJson(res, 400, { error: data.error });
      return sendJson(res, 200, data);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to scan workspace folder",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/workspace/folder/text") {
    const fileRel = String(url.searchParams.get("file") || "").trim();
    if (!fileRel) return sendJson(res, 400, { error: "Missing file query parameter" });

    try {
      const data = await readWorkspaceTextFile(fileRel, {
        maxBytes: url.searchParams.get("maxBytes") || undefined
      });
      if (data.error) return sendJson(res, data.exists === false ? 404 : 400, { error: data.error });
      return sendJson(res, 200, data);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read workspace text file",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/workspace/folder/browse") {
    const folderPath = String(url.searchParams.get("folderPath") || "").trim();
    if (!folderPath) return sendJson(res, 400, { error: "Missing folderPath query parameter" });

    try {
      const data = await browseWorkspaceFolderImmediate(folderPath);
      if (data.error) return sendJson(res, 400, { error: data.error });
      return sendJson(res, 200, data);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to browse workspace folder",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/workspace/folder/page") {
    const fileRel = String(url.searchParams.get("file") || "").trim();
    if (!fileRel) return sendJson(res, 400, { error: "Missing file query parameter" });

    const fileAbsolute = normalizeWorkspacePath(fileRel);
    if (!fileAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!fileRel.toLowerCase().endsWith(".md")) {
      return sendJson(res, 400, { error: "Not a markdown file" });
    }

    try {
      const raw = await fs.readFile(fileAbsolute, "utf-8");
      const { frontmatter, body } = splitNodeFrontmatter(raw);
      const page = await enrichWorkspaceFolderMarkdownPage(fileRel);
      return sendJson(res, 200, {
        exists: true,
        path: fileRel.replace(/\\/g, "/"),
        frontmatter,
        body,
        content: raw,
        page
      });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return sendJson(res, 404, { error: "File not found" });
      }
      return sendJson(res, 500, {
        error: "Failed to read workspace page",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/workspace/folder/file") {
    const fileRel = String(url.searchParams.get("file") || "").trim();
    if (!fileRel) return sendJson(res, 400, { error: "Missing file query parameter" });

    const fileAbsolute = normalizeWorkspacePath(fileRel);
    if (!fileAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    try {
      const stat = await fs.stat(fileAbsolute);
      if (!stat.isFile()) return sendJson(res, 404, { error: "File not found" });

      const ext = path.extname(fileAbsolute).toLowerCase();
      if (isWorkspaceBrowseImageFile(fileAbsolute)) {
        const sent = await sendImageFileResponse(res, fileAbsolute, {
          thumb: wantsThumbVariant(url.searchParams),
          thumbMax: clampThumbMax(url.searchParams.get("max"))
        });
        if (!sent) return sendJson(res, 404, { error: "File not found" });
        return;
      }

      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      const content = await fs.readFile(fileAbsolute);
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "public, max-age=3600"
      });
      res.end(content);
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return sendJson(res, 404, { error: "File not found" });
      }
      return sendJson(res, 500, {
        error: "Failed to read workspace file",
        details: String(error.message || error)
      });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/folder/view") {
    const relPath = url.searchParams.get("path");
    const folderName = url.searchParams.get("folder");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!folderName) return sendJson(res, 400, { error: "Missing folder query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    const safeFolderName = String(folderName).trim();
    if (!isAllowedStorageSubfolderName(safeFolderName)) {
      return sendJson(res, 400, { error: "Invalid folder name" });
    }

    const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, safeFolderName);
    if (!folderAbsolute) return sendJson(res, 200, { exists: false, content: "", files: 0 });
    if (!folderAbsolute.startsWith(getAgentRoot())) return sendJson(res, 400, { error: "Invalid folder path" });

    try {
      const stat = await fs.stat(folderAbsolute);
      if (!stat.isDirectory()) {
        return sendJson(res, 200, { exists: false, content: "", files: 0 });
      }

      const chunks = await collectFolderEntries(folderAbsolute);
      const subfolders = await countDirectoryImmediateSubfolders(folderAbsolute);
      return sendJson(res, 200, {
        exists: true,
        files: chunks.length,
        subfolders,
        content: chunks.length > 0 ? chunks.join("\n") : ""
      });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return sendJson(res, 200, { exists: false, content: "", files: 0 });
      }
      return sendJson(res, 500, { error: "Failed to view folder", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/obsidian/open-uri") {
    const relPath = url.searchParams.get("path");
    const mode = String(url.searchParams.get("mode") || "description");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    const targetAbsolute = resolveObsidianTargetAbsolute(nodeAbsolute, mode);
    if (!targetAbsolute.startsWith(getAgentRoot())) return sendJson(res, 400, { error: "Invalid target path" });
    const uri = await buildObsidianUri(targetAbsolute);

    return sendJson(res, 200, {
      mode,
      targetPath: targetAbsolute,
      uri
    });
  }

  if (req.method === "POST" && url.pathname === "/api/node/move") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const parentPath = payload.parentPath;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (parentPath === undefined || parentPath === null) {
        return sendJson(res, 400, { error: "Missing parentPath" });
      }

      const result = await moveNodeManifest(relPath, parentPath);
      if (result.error) return sendJson(res, result.status || 400, { error: result.error });
      recordWorkspaceActivity({
        action: "move",
        path: String(relPath).replace(/\\/g, "/"),
        label: path.posix.basename(String(relPath).replace(/\\/g, "/"))
      });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendRenameError(res, error);
    }
  }

  if (req.method === "DELETE" && url.pathname === "/api/file") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    try {
      const absolute = normalizeWorkspacePath(relPath);
      if (!absolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(absolute)) return sendJson(res, 400, { error: "Only manifest markdown files are allowed (*.md, _registration.md)" });

      const normalized = path.normalize(relPath);
      if (isAreaManifestRelPath(normalized)) {
        const folderRelPath = path.dirname(normalized);
        if (!folderRelPath || folderRelPath === ".") {
          return sendJson(res, 400, { error: "Root Workspaces folder cannot be deleted" });
        }
        const folderAbsolute = path.dirname(absolute);
        await fs.rm(folderAbsolute, { recursive: true, force: false });
        recordWorkspaceActivity({
          action: "delete",
          path: relPath.replace(/\\/g, "/"),
          label: path.posix.basename(path.dirname(relPath.replace(/\\/g, "/"))),
          fileKind: "manifest"
        });
        return sendJson(res, 200, { deleted: relPath, deletedType: "folder" });
      }

      const contentAbsolute = normalizeWorkspacePath(toContentFilePath(normalized));

      await fs.rm(absolute, { force: false });
      if (contentAbsolute) await removeIfExists(contentAbsolute);
      const slotAbsolute = normalizeWorkspacePath(
        getNamedStorageSlotDirRel(normalized, getStoragePathOptions())
      );
      if (slotAbsolute) {
        try {
          await fs.rm(slotAbsolute, { recursive: true, force: true });
        } catch {
          // slot may not exist
        }
      }
      recordWorkspaceActivity({
        action: "delete",
        path: relPath.replace(/\\/g, "/"),
        label: path.posix.basename(path.dirname(relPath.replace(/\\/g, "/"))),
        fileKind: "manifest"
      });
      return sendJson(res, 200, { deleted: relPath, deletedType: "file" });
    } catch (error) {
      const code = error && error.code ? String(error.code) : "";
      if (code === "ENOENT") return sendJson(res, 404, { error: "Node not found" });
      if (code === "EPERM" || code === "EACCES") return sendJson(res, 403, { error: "No permission to delete node" });
      return sendJson(res, 500, {
        error: "Failed to delete node",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  async function adoptExistingFolderWithManifest({
    parentAbsolute,
    parentPathResolved,
    payload,
    name,
    nodeKind
  }) {
    const responseType = nodeKind === "topic" ? "topic-manifest" : "manifest";
    const currentFolderName = path.basename(parentAbsolute);
    const { displayName, folderSlug } = resolveNodeCreateNames(payload);
    const title =
      displayName ||
      String(name || stripTopicPrefix(currentFolderName)).trim() ||
      currentFolderName;
    const targetFolderName = toFolderName(folderSlug || resolveNodeDiskSlugFromPayload(payload));
    if (!targetFolderName) {
      return { error: "Invalid folder name", status: 400 };
    }

    let targetFolderAbsolute = parentAbsolute;
    let targetFolderRel =
      parentPathResolved && parentPathResolved !== "."
        ? parentPathResolved
        : currentFolderName;

    if (targetFolderName !== currentFolderName) {
      const parentDirAbsolute = path.dirname(parentAbsolute);
      const renamedFolderAbsolute = path.join(parentDirAbsolute, targetFolderName);
      try {
        await fs.access(renamedFolderAbsolute);
        return { error: "Folder with this name already exists", status: 409 };
      } catch {
        // Target does not exist, continue.
      }
      await fs.rename(parentAbsolute, renamedFolderAbsolute);
      targetFolderAbsolute = renamedFolderAbsolute;
      await updateMenuSortOrderSlug(
        parentDirAbsolute,
        stripTopicPrefix(currentFolderName),
        stripTopicPrefix(targetFolderName)
      );
      const parentFolderRel = path.dirname(targetFolderRel).replace(/\\/g, "/");
      targetFolderRel =
        parentFolderRel && parentFolderRel !== "."
          ? path.join(parentFolderRel, targetFolderName).replace(/\\/g, "/")
          : targetFolderName;
    }

    const manifestAbsolute = path.join(targetFolderAbsolute, AREA_MANIFEST_FILE);
    try {
      await fs.access(manifestAbsolute);
      return { error: "Node manifest already exists in this folder", status: 409 };
    } catch {
      // continue
    }

    const manifestFrontmatter = buildManifestCreateFrontmatter(nodeKind === "topic" ? "topic" : "area", title, targetFolderName);
    await fs.writeFile(
      manifestAbsolute,
      joinNodeFrontmatter(manifestFrontmatter, ""),
      "utf-8"
    );

    const createdRel = `${targetFolderRel}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/");
    await ensureManifestStorageSlotDir(createdRel);
    await appendMenuSortOrderEntry(path.dirname(targetFolderAbsolute), targetFolderName);

    return {
      createdPath: toMenuDisplayCreatedPath(createdRel),
      type: responseType
    };
  }

  if (req.method === "POST" && url.pathname === "/api/node/create") {
    try {
      const payload = await readJsonBody(req);
      let parentPathResolved = await resolveExistingParentDirectoryRelPath(
        typeof payload.parentPath === "string" ? payload.parentPath : "."
      );
      const type = String(payload.type || "").trim();
      const name = String(payload.name || "").trim();

      if (
        type !== "folder" &&
        type !== "file" &&
        type !== "manifest" &&
        type !== "topic-manifest" &&
        type !== "free-memory-folder" &&
        type !== "catalog" &&
        type !== "service-doc" &&
        type !== "container-root" &&
        type !== "shared-root" &&
        type !== "shared-theme" &&
        type !== "kit-root"
      ) {
        return sendJson(res, 400, { error: "Invalid type" });
      }

      if (type === "kit-root" || type === "container-root" || type === "shared-root") {
        const parentRel = String(payload.parentPath || ".").replace(/\\/g, "/").trim() || ".";
        const isKit = type === "kit-root";
        const isShared = type === "shared-root";
        if ((isKit || isShared) && parentRel !== ".") {
          return sendJson(res, 400, { error: "Reserved folders can only be created at workspace root" });
        }

        const folderName = isKit
          ? getAgentKitFolder()
          : isShared
            ? getAgentSharedFolder()
            : getAgentContainerFolder();
        const areaName = isKit ? SERVICE_AREA_NAME : isShared ? SHARED_AREA_NAME : CONTAINER_AREA_NAME;
        const areaType = isKit ? "service" : "area";

        if (!folderName) {
          return sendJson(res, 400, {
            error: isKit
              ? "Agent kit folder is not configured"
              : isShared
                ? "Shared folder is not configured"
                : "Container folder is not configured"
          });
        }

        let parentAbsolute = getAgentRoot();
        if (!isKit) {
          if (parentRel === ".") {
            parentAbsolute = getAgentRoot();
          } else {
            const gitRoot = await resolveGitRepoRootForMenuPath(parentRel);
            if (!gitRoot || gitRoot.rel !== parentRel) {
              return sendJson(res, 400, {
                error: "Container can only be created at workspace or git repo area root"
              });
            }
            parentAbsolute = gitRoot.absolute;
          }
        }

        const folderAbsolute = path.join(parentAbsolute, folderName);
        if (await dirExists(folderAbsolute)) {
          return sendJson(res, 409, {
            error: isKit
              ? "Agent kit folder already exists"
              : isShared
                ? "Shared folder already exists"
                : "Container folder already exists"
          });
        }

        await fs.mkdir(folderAbsolute, { recursive: false });
        const manifestAbsolute = path.join(folderAbsolute, AREA_MANIFEST_FILE);
        const manifestFrontmatter = buildDefaultFrontmatter(areaType, {
          name: areaName,
          agentRoot: getAgentRoot(),
          projectRoot: getProjectRoot()
        });
        await fs.writeFile(
          manifestAbsolute,
          joinNodeFrontmatter(manifestFrontmatter, ""),
          "utf-8"
        );

        const createdRel =
          parentRel === "."
            ? `${folderName}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/")
            : `${parentRel}/${folderName}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/");
        await ensureManifestStorageSlotDir(createdRel);
        await appendMenuSortOrderEntry(folderAbsolute, folderName);

        recordWorkspaceNodeCreateFromResponse(toMenuDisplayCreatedPath(createdRel));
        return sendJson(res, 200, {
          createdPath: toMenuDisplayCreatedPath(createdRel),
          type
        });
      }

      if (type === "shared-theme") {
        const sharedFolder = getAgentSharedFolder();
        if (!sharedFolder) {
          return sendJson(res, 400, { error: "Shared folder is not configured" });
        }
        const parentRel = String(payload.parentPath || ".").replace(/\\/g, "/").trim() || ".";
        if (parentRel !== sharedFolder) {
          return sendJson(res, 400, {
            error: "Shared theme presets can only be created in the shared folder root"
          });
        }

        const preset = String(payload.preset || name || "").trim().toLowerCase();
        const theme = findSharedThemePreset(preset);
        if (!theme) {
          return sendJson(res, 400, { error: "Unknown shared theme preset" });
        }

        const sharedAbsolute = path.join(getAgentRoot(), sharedFolder);
        if (!(await dirExists(sharedAbsolute))) {
          return sendJson(res, 400, { error: "Shared folder does not exist yet" });
        }

        const themeDir = path.join(sharedAbsolute, theme.slug);
        if (await dirExists(themeDir)) {
          return sendJson(res, 409, { error: "Shared theme already exists" });
        }

        const createdRel = await bootstrapSharedTheme(sharedAbsolute, sharedFolder, theme);
        if (!createdRel) {
          return sendJson(res, 500, { error: "Failed to create shared theme" });
        }

        recordWorkspaceNodeCreateFromResponse(toMenuDisplayCreatedPath(createdRel));
        return sendJson(res, 200, {
          createdPath: toMenuDisplayCreatedPath(createdRel),
          type,
          preset: theme.slug
        });
      }

      if (type === "folder" || type === "file" || type === "manifest" || type === "topic-manifest" || type === "free-memory-folder") {
        parentPathResolved = await resolveGitRepoCreateParentPath(parentPathResolved);
      }

      if (type === "file" && (parentPathResolved === "." || !parentPathResolved)) {
        const rootRel = await resolveRootAreaManifestRel(getAgentRoot());
        if (rootRel) {
          const rootAreaFolder = path.dirname(rootRel).replace(/\\/g, "/");
          if (rootAreaFolder && rootAreaFolder !== ".") {
            parentPathResolved = rootAreaFolder;
          }
        }
      }

      const parentRelPath =
        parentPathResolved && parentPathResolved !== "."
          ? parentPathResolved.replace(/\\/g, "/")
          : "";
      const serviceFolder = getAgentKitFolder();

      if (type === "catalog" || type === "taxonomy" || type === "service-doc") {
        if (type === "service-doc") {
          if (!serviceFolder) {
            return sendJson(res, 400, { error: "Service folder is not configured for this agent" });
          }
          if (parentRelPath !== serviceFolder) {
            return sendJson(res, 400, { error: "Service docs can only be created in the service folder root" });
          }
        } else {
          const sharedFolder = getAgentSharedFolder();
          const sharedTaxonomiesRel = sharedFolder
            ? `${sharedFolder}/${WORKSPACE_TAXONOMY_FOLDER}`.replace(/\\/g, "/")
            : "";
          const allowedCatalogParents = [sharedTaxonomiesRel];
          if (serviceFolder) allowedCatalogParents.push(serviceFolder);
          if (!allowedCatalogParents.includes(parentRelPath)) {
            return sendJson(res, 400, {
              error: "Catalog presets can only be created in the shared taxonomies area"
            });
          }
        }

        const preset = String(payload.preset || name || "").trim().toLowerCase();
        const scaffold =
          type === "catalog" || type === "taxonomy"
            ? findCatalogScaffold(preset)
            : findServiceDocScaffold(preset);
        if (!scaffold) {
          return sendJson(res, 400, {
            error:
              type === "catalog" || type === "taxonomy"
                ? "Unknown catalog preset"
                : "Unknown service doc preset"
          });
        }

        const sharedFolder = getAgentSharedFolder();
        const sharedTaxonomiesRel = sharedFolder
          ? `${sharedFolder}/${WORKSPACE_TAXONOMY_FOLDER}`.replace(/\\/g, "/")
          : "";
        const catalogBaseKind =
          type !== "service-doc" && parentRelPath === sharedTaxonomiesRel ? "taxonomy-root" : "kit-root";
        const catalogBaseRel =
          type === "service-doc"
            ? serviceFolder
            : catalogBaseKind === "taxonomy-root"
              ? sharedTaxonomiesRel
              : serviceFolder;
        const catalogBaseAbsolute = await resolveAgentSubfolderAbsolute(getAgentRoot(), catalogBaseRel);
        if (!catalogBaseAbsolute) return sendJson(res, 400, { error: "Invalid catalog folder path" });

        try {
          const createdFile =
            type === "catalog" || type === "taxonomy"
              ? createSystemCatalogNodeSync(catalogBaseAbsolute, preset, { baseKind: catalogBaseKind })
              : createSystemServiceDocSync(catalogBaseAbsolute, preset);
          const createdPath = path.join(catalogBaseRel, createdFile).replace(/\\/g, "/");
          return sendJson(res, 200, { createdPath, type, preset });
        } catch (error) {
          const code = error && error.code ? String(error.code) : "";
          if (code === "EEXIST") {
            return sendJson(res, 409, {
              error:
                type === "catalog" || type === "taxonomy"
                  ? "Catalog node already exists"
                  : "Service doc already exists"
            });
          }
          if (code === "EINVAL") {
            return sendJson(res, 400, { error: String(error.message || "Invalid preset") });
          }
          throw error;
        }
      }

      if (!hasNodeCreateIdentity(payload, type)) {
        return sendJson(res, 400, { error: "Name is required (name, displayName, title, or slug)" });
      }

      const parentAbsolute =
        parentPathResolved === "." || parentPathResolved === ""
          ? getAgentRoot()
          : await resolveExistingWorkspaceDirAbsolute(parentPathResolved);
      if (!parentAbsolute) return sendJson(res, 400, { error: "Invalid parent path" });

      const parentStat = await fs.stat(parentAbsolute).catch(() => null);
      if (!parentStat || !parentStat.isDirectory()) {
        return sendJson(res, 404, { error: "Parent folder not found" });
      }

      if (type === "manifest" || type === "topic-manifest") {
        const adoptResult = await adoptExistingFolderWithManifest({
          parentAbsolute,
          parentPathResolved,
          payload,
          name,
          nodeKind: type === "topic-manifest" ? "topic" : "area"
        });
        if (adoptResult.error) {
          return sendJson(res, adoptResult.status || 400, { error: adoptResult.error });
        }
        recordWorkspaceNodeCreateFromResponse(adoptResult.createdPath);
        return sendJson(res, 200, {
          createdPath: adoptResult.createdPath,
          type: adoptResult.type
        });
      }

      if (type === "free-memory-folder") {
        const { displayName, folderSlug } = resolveNodeCreateNames(payload);
        const folderName = toFolderName(folderSlug);
        if (!folderName) return sendJson(res, 400, { error: "Invalid folder name" });

        const folderAbsolute = path.join(parentAbsolute, folderName);
        try {
          await fs.access(folderAbsolute);
          return sendJson(res, 409, { error: "Folder already exists" });
        } catch {
          // continue
        }

        await fs.mkdir(folderAbsolute, { recursive: false });
        await appendMenuSortOrderEntry(parentAbsolute, folderName);

        const createdRel =
          parentPathResolved && parentPathResolved !== "."
            ? `${parentPathResolved}/${folderName}`.replace(/\\/g, "/")
            : folderName;
        recordWorkspaceNodeCreateFromResponse(createdRel);
        return sendJson(res, 200, {
          createdPath: createdRel,
          type: "free-memory-folder",
          title: displayName || folderName
        });
      }

      if (type === "folder") {
        const { displayName, folderSlug } = resolveNodeCreateNames(payload);
        const folderName = toFolderName(folderSlug);
        if (!folderName) return sendJson(res, 400, { error: "Invalid folder name" });

        const folderAbsolute = path.join(parentAbsolute, folderName);
        try {
          await fs.access(folderAbsolute);
          return sendJson(res, 409, { error: "Folder already exists" });
        } catch {
          // continue
        }

        await fs.mkdir(folderAbsolute, { recursive: false });
        const manifestAbsolute = path.join(folderAbsolute, AREA_MANIFEST_FILE);
        const areaFrontmatter = buildManifestCreateFrontmatter("area", displayName, folderName);
        await fs.writeFile(
          manifestAbsolute,
          joinNodeFrontmatter(areaFrontmatter, ""),
          "utf-8"
        );

        const createdPath = parentPathResolved && parentPathResolved !== "."
          ? path.join(parentPathResolved, folderName, AREA_MANIFEST_FILE)
          : path.join(folderName, AREA_MANIFEST_FILE);
        const createdRel = createdPath.replace(/\\/g, "/");
        await ensureManifestStorageSlotDir(createdRel);
        await appendMenuSortOrderEntry(parentAbsolute, folderName);

        recordWorkspaceNodeCreateFromResponse(toMenuDisplayCreatedPath(createdRel));
        return sendJson(res, 200, {
          createdPath: toMenuDisplayCreatedPath(createdRel),
          type: "folder"
        });
      }

      const { displayName, folderSlug } = resolveNodeCreateNames(payload);
      const folderName = toFolderName(folderSlug);
      if (!folderName) return sendJson(res, 400, { error: "Invalid topic name" });

      const folderAbsolute = path.join(parentAbsolute, folderName);
      try {
        await fs.access(folderAbsolute);
        return sendJson(res, 409, { error: "Topic already exists" });
      } catch {
        // continue
      }

      await fs.mkdir(folderAbsolute, { recursive: false });
      const manifestAbsolute = path.join(folderAbsolute, MANIFEST_FILE);
      const awnNodeType = String(payload.awnType || "topic").trim() || "topic";
      const fileFrontmatter = buildManifestCreateFrontmatter("topic", displayName, folderName, {
        awnType: awnNodeType
      });
      await fs.writeFile(
        manifestAbsolute,
        joinNodeFrontmatter(fileFrontmatter, ""),
        "utf-8"
      );

      const createdPath =
        parentPathResolved && parentPathResolved !== "."
          ? path.join(parentPathResolved, folderName, MANIFEST_FILE)
          : path.join(folderName, MANIFEST_FILE);
      const createdRel = createdPath.replace(/\\/g, "/");
      await ensureManifestStorageSlotDir(createdRel);
      await appendMenuSortOrderEntry(parentAbsolute, folderName);
      recordWorkspaceNodeCreateFromResponse(toMenuDisplayCreatedPath(createdRel));
      return sendJson(res, 200, {
        createdPath: toMenuDisplayCreatedPath(createdRel),
        type: "file"
      });
    } catch (error) {
      const code = error && error.code ? String(error.code) : "";
      if (code === "EPERM" || code === "EACCES") {
        return sendJson(res, 403, {
          error: "No permission to write in agent workspace",
          details: String(error && error.message ? error.message : error)
        });
      }
      if (code === "EEXIST") {
        return sendJson(res, 409, { error: "Folder already exists" });
      }
      return sendJson(res, 500, {
        error: "Failed to create node",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  return sendJson(res, 404, { error: "API route not found" });
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/app-lock/status") {
    try {
      const status = await getAppLockStatus();
      return sendJson(res, 200, status);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read app lock config",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/app-lock/login") {
    try {
      const payload = await readJsonBody(req, 32_000);
      const login = String(payload?.login || "").trim();
      const password = String(payload?.password || "");
      if (!login || !password) {
        return sendJson(res, 400, { error: "Missing login or password" });
      }
      const ok = await verifyAppLockCredentials(login, password);
      if (!ok) {
        return sendJson(res, 401, { error: "Неверный логин или пароль" });
      }
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 400, {
        error: "Failed to verify app lock credentials",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/app-lock/setup") {
    try {
      const status = await getAppLockStatus();
      if (!status.needsSetup) {
        return sendJson(res, 409, { error: "Пароль уже задан" });
      }
      const payload = await readJsonBody(req, 32_000);
      const login = String(payload?.login || "").trim();
      const password = String(payload?.password || "");
      const confirm = String(payload?.confirm || "");
      if (!login) {
        return sendJson(res, 400, { error: "Введите логин" });
      }
      if (!password) {
        return sendJson(res, 400, { error: "Введите пароль" });
      }
      if (password !== confirm) {
        return sendJson(res, 400, { error: "Пароли не совпадают" });
      }
      await saveAppLockCredentials(login, password);
      return sendJson(res, 200, { ok: true });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Не удалось сохранить пароль",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/docs-meta") {
    return sendJson(res, 200, docsRegistry.getDocsMeta());
  }

  if (req.method === "GET" && url.pathname === "/api/docs") {
    const version = docsRegistry.normalizeDocVersion(url.searchParams.get("version"));
    return sendJson(res, 200, docsRegistry.getApiDocs(version));
  }

  if (req.method === "GET" && url.pathname === "/api/platform/index") {
    try {
      const indexPath = getPlatformIndexAbsolute(getProjectRoot());
      const raw = await fs.readFile(indexPath, "utf-8");
      return sendJson(res, 200, JSON.parse(raw));
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return sendJson(res, 200, { sections: [] });
      }
      return sendJson(res, 500, {
        error: "Failed to load platform index",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/platform/catalogs") {
    try {
      const payload = await getMergedCatalogsPayload(getProjectRoot(), null, { globalOnly: true });
      return sendJson(res, 200, payload);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to load platform catalogs",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/platform/catalogs/migrate-tags") {
    try {
      const result = await migrateDiscoveredTagsToGlobal(getProjectRoot());
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to migrate tags",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/platform/catalogs/migrate") {
    try {
      const preset = String(url.searchParams.get("preset") || "").trim();
      if (preset) {
        if (!MIGRATABLE_PRESETS.includes(preset)) {
          return sendJson(res, 400, {
            error: "Unsupported preset",
            presets: MIGRATABLE_PRESETS
          });
        }
        const result = await migrateDiscoveredPresetToGlobal(getProjectRoot(), preset);
        return sendJson(res, 200, result);
      }
      const results = await migrateDiscoveredCatalogsToGlobal(getProjectRoot());
      return sendJson(res, 200, { presets: MIGRATABLE_PRESETS, results });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to migrate catalogs",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/mcp-docs") {
    const version = docsRegistry.normalizeDocVersion(url.searchParams.get("version"));
    return sendJson(res, 200, docsRegistry.getMcpDocs(version));
  }

  if (req.method === "GET" && url.pathname === "/api/user-docs") {
    try {
      const version = docsRegistry.normalizeDocVersion(url.searchParams.get("version"));
      const markdown = await docsRegistry.getUserDocsMarkdown(version);
      res.writeHead(200, {
        "Content-Type": "text/markdown; charset=utf-8",
        "Cache-Control": "no-store"
      });
      res.end(markdown);
      return;
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to load user docs",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/public/images") {
    try {
      const images = await listPublicImages();
      return sendJson(res, 200, { images });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to list public images",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/public/images/file") {
    try {
      const image = await readPublicImageFile(url.searchParams.get("name"));
      if (!image) return sendJson(res, 404, { error: "Image not found" });

      const content = await fs.readFile(image.absolute);
      const contentType = MIME_TYPES[image.ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-cache" });
      res.end(content);
      return;
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read image",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agents/focus") {
    const agentId = String(url.searchParams.get("agent") || "").trim();
    try {
      let items = [];
      if (agentId) {
        const agent = resolveAgent(agentId);
        if (!agent || agent.folderExists === false) {
          return sendJson(res, 200, { items: [] });
        }
        items = collectAgentFocusEntries(agent).map((entry) => ({
          agentId: agent.id,
          agentName: agent.name || agent.id,
          agentPath: agent.path,
          agentActive: agent.active !== false,
          ...entry
        }));
      } else {
        items = collectAllFocusEntries();
      }
      return sendJson(res, 200, { items: await enrichFocusItems(items) });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to load focus items",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agents") {
    refreshAgentsFromDisk();
    const agents = await Promise.all(
      getAgentsPublicList().map(async (agent) => {
        try {
          const resolved = resolveAgent(agent.id);
          const preview = resolved ? await getAgentPreviewMeta(resolved) : { hasPreview: false, previewUrl: null };
          return { ...agent, ...preview };
        } catch {
          return { ...agent, hasPreview: false, previewUrl: null };
        }
      })
    );
    return sendJson(res, 200, {
      agents,
      defaultAgentId: getDefaultAgentId()
    });
  }

  if (req.method === "POST" && url.pathname === "/api/agents/discover") {
    try {
      const payload = await readJsonBody(req);
      const agents = discoverAgentManifests({
        roots: payload?.roots,
        maxDepth: payload?.maxDepth
      });
      return sendJson(res, 200, { agents });
    } catch (error) {
      return sendJson(res, 400, {
        error: "Failed to discover agents",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/agents/create") {
    try {
      const payload = await readJsonBody(req);
      const agent = createAgentWorkspace({
        path: payload?.path,
        name: payload?.name,
        comment: payload?.comment ?? payload?.description,
        id: payload?.id
      });
      return sendJson(res, 200, { agent });
    } catch (error) {
      return sendJson(res, 400, {
        error: "Failed to create agent workspace",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agents/preview") {
    const agentId = url.searchParams.get("agent") || getDefaultAgentId();
    const agent = resolveAgent(agentId);
    if (!agent) return sendJson(res, 400, { error: "Unknown agent", agentId });

    const previewAbsolute = getAgentManifestPreviewAbsolute(agent);
    if (!previewAbsolute) return sendJson(res, 404, { error: "Agent preview not found" });

    try {
      const content = await fs.readFile(previewAbsolute);
      const ext = path.extname(previewAbsolute).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-cache" });
      res.end(content);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to read agent preview", details: String(error.message || error) });
    }
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/agents/preview") {
    try {
      const payload = await readJsonBody(req, 12_000_000);
      const workspacePath = String(payload?.path || "").trim();
      if (!workspacePath) return sendJson(res, 400, { error: "Missing path" });

      const agentPath = assertSafeAgentPath(workspacePath);
      const absolute = resolveAgentRootAbsolute(agentPath);
      const manifest = readWorkspaceManifestSync(absolute);
      if (!manifest) {
        return sendJson(res, 400, {
          error: `В «${agentPath}» нет ${MANIFEST_FILE} с type: workspace`
        });
      }

      const data = payload?.data;
      const fileName = payload?.fileName;
      const mimeType = payload?.mimeType;
      if (!data || typeof data !== "string") return sendJson(res, 400, { error: "Missing image data" });

      const previewExt = resolveNodePreviewExtension(mimeType, fileName);
      if (!previewExt) {
        return sendJson(res, 400, {
          error: "Invalid preview format",
          details: "Allowed formats: JPG, PNG, GIF → saved as awn-storage/*/preview.{jpg|png|gif}"
        });
      }

      const buffer = Buffer.from(data, "base64");
      if (!buffer.length) return sendJson(res, 400, { error: "Empty image data" });
      if (buffer.length > 10 * 1024 * 1024) return sendJson(res, 400, { error: "Image is too large (max 10 MB)" });
      if (!validatePreviewImageBufferByExt(buffer, previewExt)) {
        return sendJson(res, 400, {
          error: "Invalid image file",
          details: "File content does not match the selected JPG, PNG or GIF format"
        });
      }

      clearAgentWorkspacePreviewImagesSync(absolute);
      const targetAbsolute = getOrCreateAgentWorkspacePreviewAbsoluteSync(absolute, previewExt);
      await fs.writeFile(targetAbsolute, buffer);

      const rootManifestAbsolute = path.join(absolute, AREA_MANIFEST_FILE);
      if (await fileExists(rootManifestAbsolute)) {
        await cleanupNodePreviewDirsForNode(rootManifestAbsolute);
      }

      return sendJson(res, 200, {
        hasPreview: true,
        previewUrl: `/api/agents/workspace-preview?path=${encodeURIComponent(agentPath)}`
      });
    } catch (error) {
      return sendJson(res, 400, {
        error: "Failed to upload agent preview",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "DELETE" && url.pathname === "/api/agents/preview") {
    const workspacePath = String(url.searchParams.get("path") || "").trim();
    if (!workspacePath) return sendJson(res, 400, { error: "Missing path query parameter" });

    try {
      const agentPath = assertSafeAgentPath(workspacePath);
      const absolute = resolveAgentRootAbsolute(agentPath);
      const manifest = readWorkspaceManifestSync(absolute);
      if (!manifest) {
        return sendJson(res, 400, {
          error: `В «${agentPath}» нет ${MANIFEST_FILE} с type: workspace`
        });
      }

      clearAgentWorkspacePreviewImagesSync(absolute);

      return sendJson(res, 200, { hasPreview: false, previewUrl: null });
    } catch (error) {
      return sendJson(res, 400, {
        error: "Failed to delete agent preview",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agents/workspace-preview") {
    const rawPath = url.searchParams.get("path");
    if (!rawPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    try {
      const agentPath = assertSafeAgentPath(rawPath);
      const workspaceAbsolute = resolveAgentRootAbsolute(agentPath);
      const previewAbsolute = findAgentWorkspacePreviewAbsoluteSync(workspaceAbsolute);
      if (!previewAbsolute) return sendJson(res, 404, { error: "Preview not found" });
      const thumb = wantsThumbVariant(url.searchParams);
      const sent = await sendImageFileResponse(res, previewAbsolute, {
        thumb,
        thumbMax: clampThumbMax(url.searchParams.get("max")),
        cacheControl: "no-cache",
        thumbCacheRoot: workspaceAbsolute
      });
      if (!sent) return sendJson(res, 404, { error: "Preview not found" });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to read workspace preview", details: String(error.message || error) });
    }
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/agents/slider") {
    try {
      const agentPath = resolveAgentSliderWorkspacePath(url);
      const manifestAbsolute = resolveAgentWorkspaceManifestAbsoluteSync(agentPath);
      if (!manifestAbsolute) {
        return sendJson(res, 400, {
          error: `В «${agentPath}» нет ${MANIFEST_FILE} с type: workspace`
        });
      }
      const files = await listAgentSliderImages(agentPath);
      return sendJson(res, 200, {
        folderPath: AGENT_SLIDER_FOLDER_REF,
        files,
        agentPath
      });
    } catch (error) {
      return sendJson(res, error?.status || 400, {
        error: "Failed to list agent slider images",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/agents/slider") {
    try {
      const payload = await readJsonBody(req, 12_000_000);
      const agentId = String(url.searchParams.get("agent") || "").trim();
      if (!agentId) {
        return sendJson(res, 400, { error: "Missing agent query parameter" });
      }
      const agentPath = resolveAgentSliderWorkspacePath(url, payload);
      const manifestAbsolute = resolveAgentWorkspaceManifestAbsoluteSync(agentPath);
      if (!manifestAbsolute) {
        return sendJson(res, 400, {
          error: `В «${agentPath}» нет ${MANIFEST_FILE} с type: workspace`
        });
      }

      const data = payload?.data;
      const fileName = payload?.fileName;
      const mimeType = payload?.mimeType;
      if (!data || typeof data !== "string") return sendJson(res, 400, { error: "Missing image data" });

      const buffer = Buffer.from(data, "base64");
      if (!buffer.length) return sendJson(res, 400, { error: "Empty image data" });
      if (buffer.length > 10 * 1024 * 1024) {
        return sendJson(res, 400, { error: "Image is too large (max 10 MB)" });
      }

      const imageExt = resolveMediaImageExtension(mimeType, fileName, buffer);
      if (!imageExt) {
        return sendJson(res, 400, {
          error: "Invalid image format",
          details: "Allowed formats: JPG, PNG, GIF, WEBP, AVIF"
        });
      }
      if (!validateMediaImageBufferByExt(buffer, imageExt)) {
        return sendJson(res, 400, {
          error: "Invalid image file",
          details: "File content does not match the selected image format"
        });
      }

      const folderAbsolute = await resolveAgentSliderFolderAbsolute(agentPath, { create: true });
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid slider folder path" });

      const safeBase = sanitizeMediaFileName(fileName)?.replace(/\.[^.]+$/, "") || "slide";
      const targetAbsolute = await resolveUniqueMediaFileAbsolute(folderAbsolute, `${safeBase}${imageExt}`);
      if (!targetAbsolute || !targetAbsolute.startsWith(folderAbsolute)) {
        return sendJson(res, 400, { error: "Invalid slider file path" });
      }

      await fs.writeFile(targetAbsolute, buffer);
      const storedName = path.basename(targetAbsolute);
      return sendJson(res, 200, {
        folderPath: AGENT_SLIDER_FOLDER_REF,
        agentPath,
        file: {
          name: storedName,
          mediaFile: `${AGENT_SLIDER_ASSETS_SUBDIR}/${storedName}`
        }
      });
    } catch (error) {
      return sendJson(res, error?.status || 400, {
        error: "Failed to upload slider image",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "DELETE" && url.pathname === "/api/agents/slider") {
    const fileName = String(url.searchParams.get("file") || "").trim();
    if (!fileName) return sendJson(res, 400, { error: "Missing file query parameter" });

    try {
      const agentPath = resolveAgentSliderWorkspacePath(url);
      const manifestAbsolute = resolveAgentWorkspaceManifestAbsoluteSync(agentPath);
      if (!manifestAbsolute) {
        return sendJson(res, 400, {
          error: `В «${agentPath}» нет ${MANIFEST_FILE} с type: workspace`
        });
      }

      const folderAbsolute = await resolveAgentSliderFolderAbsolute(agentPath);
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid slider folder path" });

      const safeName = sanitizeMediaFileName(fileName);
      if (!safeName) return sendJson(res, 400, { error: "Invalid file name" });

      const fileAbsolute = path.join(folderAbsolute, safeName);
      if (!fileAbsolute.startsWith(folderAbsolute)) {
        return sendJson(res, 400, { error: "Invalid slider file path" });
      }

      await fs.unlink(fileAbsolute);
      return sendJson(res, 200, { deleted: safeName });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return sendJson(res, 404, { error: "Slider image not found" });
      }
      return sendJson(res, error?.status || 400, {
        error: "Failed to delete slider image",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/agents/validate-paths") {
    try {
      const payload = await readJsonBody(req);
      const results = validateAgentWorkspacePaths(payload?.paths);
      return sendJson(res, 200, { results });
    } catch (error) {
      return sendJson(res, 400, {
        error: "Failed to validate agent paths",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "PUT" && url.pathname === "/api/agents/registry") {
    try {
      const payload = await readJsonBody(req);
      const data = saveAgentsRegistry(payload?.agents);
      return sendJson(res, 200, data);
    } catch (error) {
      return sendJson(res, 400, {
        error: "Failed to save agents registry",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agents/groups") {
    refreshAgentsFromDisk();
    return sendJson(res, 200, getAgentsGroupsPublic());
  }

  if (req.method === "PUT" && url.pathname === "/api/agents/groups") {
    try {
      refreshAgentsFromDisk();
      const payload = await readJsonBody(req);
      const data = saveAgentsGroups(payload?.groups, payload?.ungrouped);
      return sendJson(res, 200, data);
    } catch (error) {
      return sendJson(res, 400, {
        error: "Failed to save agent groups",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/agents/groups/background") {
    const groupId = String(url.searchParams.get("groupId") || "").trim();
    if (!groupId) return sendJson(res, 400, { error: "Missing groupId query parameter" });
    try {
      refreshAgentsFromDisk();
      const file = readGroupBackgroundFile(groupId);
      if (!file) return sendJson(res, 404, { error: "Background not found" });
      res.writeHead(200, {
        "Content-Type": file.mime,
        "Cache-Control": "no-store"
      });
      res.end(file.content);
      return;
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to read group background",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/agents/groups/background") {
    try {
      refreshAgentsFromDisk();
      const payload = await readJsonBody(req, 12_000_000);
      const groupId = String(payload?.groupId || "").trim();
      if (!groupId) return sendJson(res, 400, { error: "Missing groupId" });
      const isUngrouped = groupId === "__ungrouped__";
      if (
        !isUngrouped &&
        !getAgentsGroupsPublic().groups.some((group) => group.id === groupId)
      ) {
        return sendJson(res, 404, { error: "Group not found" });
      }

      const data = payload?.data;
      const fileName = payload?.fileName;
      const mimeType = payload?.mimeType;
      if (!data || typeof data !== "string") return sendJson(res, 400, { error: "Missing image data" });

      let previewExt = resolveNodePreviewExtension(mimeType, fileName);
      if (previewExt === ".jpeg") previewExt = ".jpg";
      if (previewExt === ".webp" || !previewExt) {
        const ext = path.extname(String(fileName || "")).toLowerCase();
        if (ext === ".webp") previewExt = ".webp";
      }
      if (!previewExt || ![".jpg", ".png", ".gif", ".webp"].includes(previewExt)) {
        return sendJson(res, 400, {
          error: "Invalid background format",
          details: "Allowed formats: JPG, PNG, GIF, WEBP"
        });
      }

      const buffer = Buffer.from(data, "base64");
      if (!buffer.length) return sendJson(res, 400, { error: "Empty image data" });
      if (buffer.length > 10 * 1024 * 1024) return sendJson(res, 400, { error: "Image is too large (max 10 MB)" });
      if (previewExt !== ".webp" && !validatePreviewImageBufferByExt(buffer, previewExt)) {
        return sendJson(res, 400, {
          error: "Invalid image file",
          details: "File content does not match the selected image format"
        });
      }

      const saved = writeGroupBackgroundFile(groupId, buffer, previewExt);
      return sendJson(res, 200, saved);
    } catch (error) {
      return sendJson(res, 400, {
        error: "Failed to upload group background",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "DELETE" && url.pathname === "/api/agents/groups/background") {
    const groupId = String(url.searchParams.get("groupId") || "").trim();
    if (!groupId) return sendJson(res, 400, { error: "Missing groupId query parameter" });
    try {
      refreshAgentsFromDisk();
      const saved = removeGroupBackground(groupId);
      return sendJson(res, 200, saved);
    } catch (error) {
      return sendJson(res, 400, {
        error: "Failed to delete group background",
        details: String(error?.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/search/global") {
    const query = url.searchParams.get("q") || "";
    const scope = url.searchParams.get("scope") || "all";
    const fileType = url.searchParams.get("fileType") || "all";
    const limitRaw = Number(url.searchParams.get("limit") || 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

    let agentIds = String(url.searchParams.get("agents") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (agentIds.length === 0) {
      agentIds = getAgentsPublicList()
        .filter((agent) => agent.active !== false && !isPlatformAgentId(agent.id))
        .map((agent) => agent.id);
    } else {
      agentIds = agentIds.filter((agentId) => resolveAgent(agentId));
    }

    if (agentIds.length === 0) {
      return sendJson(res, 200, { query, scope, fileType, results: [], total: 0, agents: [] });
    }

    try {
      const data = await searchGlobalAcrossAgents(query, agentIds, limit, scope, fileType);
      return sendJson(res, 200, data);
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to search across agents",
        details: String(error?.message || error)
      });
    }
  }

  const agentId = url.searchParams.get("agent") || getDefaultAgentId();
  const agent = resolveAgent(agentId);
  if (!agent) {
    return sendJson(res, 400, { error: "Unknown agent", agentId });
  }

  return runWithAgent(agent.id, () => withWorkspaceActivityContext(req, url, () => handleApiForAgent(req, res, url)));
}

function createRequestHandler() {
  return async (req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname.startsWith("/api/")) {
      return handleApi(req, res, url);
    }

    return serveStatic(url.pathname, res);
  };
}

function readTlsCredentials() {
  const keyPath = process.env.TLS_KEY || process.env.HTTPS_KEY;
  const certPath = process.env.TLS_CERT || process.env.HTTPS_CERT;
  if (!keyPath || !certPath || !fsSync.existsSync(keyPath) || !fsSync.existsSync(certPath)) {
    return null;
  }
  return {
    key: fsSync.readFileSync(keyPath),
    cert: fsSync.readFileSync(certPath)
  };
}

function createAppServer() {
  const handler = createRequestHandler();
  const tls = readTlsCredentials();
  if (tls && process.env.TLS_ONLY === "1") {
    return https.createServer(tls, handler);
  }
  return http.createServer(handler);
}

function listenServer(server, { host, port, tryNextPort = false }) {
  return new Promise((resolve, reject) => {
    let currentPort = port;
    const maxAttempts = tryNextPort ? 20 : 1;

    const attempt = (attemptIndex = 0) => {
      const onError = (error) => {
        if (error.code === "EADDRINUSE" && tryNextPort && attemptIndex + 1 < maxAttempts) {
          currentPort += 1;
          attempt(attemptIndex + 1);
          return;
        }
        reject(error);
      };

      server.once("error", onError);
      const onListening = () => {
        server.removeListener("error", onError);
        resolve(currentPort);
      };

      if (host) {
        server.listen(currentPort, host, onListening);
      } else {
        server.listen(currentPort, onListening);
      }
    };

    attempt();
  });
}

function getLanIPv4() {
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets || []) {
      if (net && net.family === "IPv4" && !net.internal) return net.address;
    }
  }
  return "";
}

function isTlsEnabled() {
  return Boolean(readTlsCredentials());
}

async function startServer(options = {}) {
  if (httpServer || httpsServer) {
    await stopServer();
  }

  initProjectRoot(options.root || __dirname, {
    appRoot: options.appRoot || __dirname
  });

  const host = options.host ?? process.env.HOST ?? undefined;
  const port = Number(options.port ?? process.env.PORT ?? 3000);
  const tlsPort = Number(process.env.TLS_PORT ?? 3443);
  const tryNextPort = Boolean(options.tryNextPort);
  const handler = createRequestHandler();
  const lanIp = getLanIPv4();
  const attachHttpsOnly = process.env.HTTPS_ATTACH === "1";

  if ((process.env.TLS_ONLY === "1" || attachHttpsOnly) && isTlsEnabled()) {
    const tls = readTlsCredentials();
    httpsServer = https.createServer(tls, handler);
    const boundTlsPort = await listenServer(httpsServer, { host, port: tlsPort, tryNextPort });
    const hostname = host || "localhost";
    const url = `https://${hostname}:${boundTlsPort}`;
    return {
      port: boundTlsPort,
      tlsPort: boundTlsPort,
      host: hostname,
      url,
      scheme: "https",
      lanIp,
      tls: true,
      httpUrl: null,
      httpsUrl: lanIp ? `https://${lanIp}:${boundTlsPort}` : url,
      mobileUrl: lanIp ? `https://${lanIp}:${boundTlsPort}/shell/mobile/` : `${url}/shell/mobile/`,
      stop: stopServer
    };
  }

  httpServer = http.createServer(handler);
  const boundPort = await listenServer(httpServer, { host, port, tryNextPort });
  const hostname = host || "localhost";
  const httpUrl = `http://${hostname}:${boundPort}`;
  let httpsUrl = null;
  let boundTlsPort = null;

  if (isTlsEnabled()) {
    const tls = readTlsCredentials();
    httpsServer = https.createServer(tls, handler);
    boundTlsPort = await listenServer(httpsServer, { host, port: tlsPort, tryNextPort: false });
    httpsUrl = `https://${hostname}:${boundTlsPort}`;
  }

  return {
    port: boundPort,
    tlsPort: boundTlsPort,
    host: hostname,
    url: httpUrl,
    scheme: "http",
    lanIp,
    tls: Boolean(httpsUrl),
    httpUrl: lanIp ? `http://${lanIp}:${boundPort}` : httpUrl,
    httpsUrl: lanIp && boundTlsPort ? `https://${lanIp}:${boundTlsPort}` : httpsUrl,
    mobileUrl: lanIp && boundTlsPort
      ? `https://${lanIp}:${boundTlsPort}/shell/mobile/`
      : lanIp
        ? `http://${lanIp}:${boundPort}/shell/mobile/`
        : `${httpUrl}/shell/mobile/`,
    stop: stopServer
  };
}

async function stopServer() {
  const closes = [];
  if (httpServer) {
    closes.push(
      new Promise((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      })
    );
    httpServer = null;
  }
  if (httpsServer) {
    closes.push(
      new Promise((resolve, reject) => {
        httpsServer.close((error) => (error ? reject(error) : resolve()));
      })
    );
    httpsServer = null;
  }
  if (closes.length) await Promise.all(closes);
}

if (require.main === module) {
  startServer({ root: __dirname, tryNextPort: false })
    .then((info) => {
      if (info.httpUrl) console.log(`Agent CMS HTTP  at ${info.httpUrl}`);
      if (info.httpsUrl) console.log(`Agent CMS HTTPS at ${info.httpsUrl}`);
      else if (!info.httpUrl) console.log(`Agent CMS at ${info.url}`);
      console.log(`Mobile Shell:     ${info.mobileUrl}`);
      console.log("");
      if (info.httpsUrl) {
        console.log("iPhone: open HTTPS URL → accept certificate → hold 🎤");
      } else {
        console.log("iPhone mic/compass need HTTPS. Run in another terminal:");
        console.log("  npm run start:https");
      }
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  startServer,
  stopServer,
  getAppRoot,
  getProjectRoot
};
