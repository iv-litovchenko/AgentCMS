const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const agentRegistry = require("./agent-registry");
const docsRegistry = require("./docs-registry");
const apiDocs = require("./api-docs");
const mcpDocs = require("./mcp-docs");
const {
  AREA_MANIFEST_FILE,
  AREA_MANIFEST_CANDIDATES,
  TOPIC_MANIFEST_RE,
  isAreaManifestFileName,
  isTopicManifestFileName,
  isAreaManifestRelPath,
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
  getManifestNamedSlotKey,
  getNamedStorageSlotDirRel,
  listManifestStorageSlotDirRelCandidates,
  getNamedStorageBundleRelCandidates,
  listBundleFileNameCandidates,
  resolveManifestRelFromStorageBundlePath,
  BUNDLE_CONTENT_FILE,
  BUNDLE_TABULAR_FILE,
  BUNDLE_CONFIG_FILE,
  BUNDLE_TODO_FILE,
  ROOT_SYSTEM_TODO_FILE,
  normalizeSystemFileRequestName,
  PREVIEW_FILE_BASENAME,
  PREVIEW_FILE_NAMES,
  STORAGE_SUBFOLDER_CONTENT,
  STORAGE_SUBFOLDER_INBOX,
  STORAGE_SUBFOLDER_REFERENCES,
  STORAGE_SUBFOLDER_ASSETS,
  STORAGE_SUBFOLDER_SCRIPTS,
  STORAGE_SUBFOLDER_ARTEFACTS,
  STORAGE_SUBFOLDER_PREVIEW,
  STORAGE_SUBFOLDER_HISTORY,
  HISTORY_VERSION_SUFFIX,
  STORAGE_SLOT_LAYER_FOLDERS,
  normalizeStorageSubfolderName,
  getStorageSubfolderForMode,
  listStorageSubfolderNameCandidates,
  isAllowedStorageSubfolderName,
  isStorageFolderName,
  getStorageRootDirRel,
  getStorageFolderRegexAlternation,
  STORAGE_ROOT_FOLDER,
  getHistoryRelativeTargetPath,
  getHistoryVersionDirRel,
  buildHistoryVersionFileName,
  isHistoryVersionFileName,
  formatHistoryVersionTimestampLabel,
  normalizeHistoryTargetRelPath
} = require("./manifest-paths");
const {
  buildDefaultFrontmatter,
  getAwnTypesPayload,
  inferAwnTypeFromPath,
  loadAgentTypes,
  normalizeAwnSchema,
  applyAwnSchemaToConfig,
  getTopicSchemaPayload
} = require("./awn-types-loader");
const { transliterateToSlug, sanitizeSlugInput } = require(path.join(__dirname, "public", "slug-translit.js"));

const execFileAsync = promisify(execFile);

let appRoot = __dirname;
let projectRoot = __dirname;
let httpServer = null;

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
  return path.join(getProjectRoot(), "workspaces", "Documentation", "images");
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
  getAgentKitFolder,
  getAgentContainerFolder,
  isAgentKitFolderEntryName,
  isContainerFolderEntryName,
  isReservedAgentRootFolderEntryName,
  createSystemCatalogNodeSync,
  createSystemServiceDocSync,
  findServiceDocScaffold,
  findCatalogScaffold,
  DEFAULT_SERVICE_CATALOG_FOLDER,
  SYSTEM_REFERENCE_SCAFFOLDS,
  isSystemReferenceManifestRel,
  isAwnDependenciesFileName,
  WORKSPACE_AWN_TYPE,
  AWN_MAP_FILE,
  AWN_DEPENDENCIES_FILE,
  AWN_AUTOINCREMENT_ID_FILE
} = agentRegistry;

const SYSTEM_FILE_NAMES = [
  ".env",
  ".gitignore",
  "AGENTS.md",
  AWN_DEPENDENCIES_FILE,
  AWN_AUTOINCREMENT_ID_FILE,
  AWN_MAP_FILE,
  "docker-compose.yml",
  "README.md",
  ROOT_SYSTEM_TODO_FILE
];

function canonicalSystemFileName(name) {
  const normalized = normalizeSystemFileRequestName(name);
  if (SYSTEM_FILE_NAMES.includes(normalized)) return normalized;
  if (isAwnDependenciesFileName(normalized)) return normalized;
  return null;
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

async function resolveExistingSystemFileAbsolute(name) {
  const canonical = canonicalSystemFileName(name);
  if (!canonical) return null;
  const agentRoot = getAgentRoot();
  const candidates =
    canonical === ROOT_SYSTEM_TODO_FILE ? [ROOT_SYSTEM_TODO_FILE, "todo.md"] : [canonical];
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
  ".txt": "text/plain; charset=utf-8",
  ".zip": "application/zip",
  ".rar": "application/vnd.rar",
  ".7z": "application/x-7z-compressed",
  ".tar": "application/x-tar",
  ".gz": "application/gzip"
};

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

function formatYamlScalarForFrontmatter(value) {
  const text = String(value ?? "");
  if (!text || /[:#\[\]{}&,*?]|^\s|\s$/.test(text)) {
    return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return text;
}

function toContentFilePath(relNodePath) {
  const partBase = resolvePartFolderSidecarBaseRel(relNodePath);
  if (partBase) return `${partBase}.content.md`;
  return namedStorageBundleRel(relNodePath, BUNDLE_CONTENT_FILE);
}

function toTabularFilePath(relNodePath) {
  const partBase = resolvePartFolderSidecarBaseRel(relNodePath);
  if (partBase) return `${partBase}.content.csv`;
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

function extractDefaultLandingModeFromNodeConfig(content) {
  const text = String(content || "").replace(/^\uFEFF/, "");
  const match = text.match(/^default_landing_mode:\s*(?:"([^"]*)"|'([^']*)'|(\S+))\s*$/m);
  if (!match) return null;
  const value = String(match[1] || match[2] || match[3] || "").trim();
  return value || null;
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
  await snapshotFileHistoryBeforeWrite({
    manifestRelPath,
    targetRelPath: normalizedTarget,
    nextContent: content
  });
  await fs.mkdir(path.dirname(targetAbsolute), { recursive: true });
  await fs.writeFile(targetAbsolute, content, "utf-8");
  return normalizedTarget;
}

async function resolveHistoryManifestRel({ manifestRelPath, mode, systemName }) {
  if (mode === "system") {
    const serviceFolder = getAgentKitFolder();
    return serviceFolder ? getServiceAreaManifestRel(serviceFolder) : null;
  }
  if (!manifestRelPath) return null;
  return resolveExistingWorkspaceRelPath(manifestRelPath);
}

async function resolveExternalFileWorkspaceRel(manifestRelPath, relFile) {
  const nodeAbsolute = await resolveApiManifestAbsolute(manifestRelPath);
  if (!nodeAbsolute) return null;
  const normalizedRelFile = normalizeRelativeFilePath(relFile);
  if (!normalizedRelFile) return null;
  const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_CONTENT);
  if (!folderAbsolute) return null;
  const fileAbsolute = path.join(folderAbsolute, normalizedRelFile);
  if (!fileAbsolute.startsWith(folderAbsolute)) return null;
  return manifestRelFromNodeAbsolute(fileAbsolute);
}

async function resolveMediaSidecarWorkspaceRel(manifestRelPath, relFile) {
  const nodeAbsolute = await resolveApiManifestAbsolute(manifestRelPath);
  if (!nodeAbsolute) return null;
  const normalizedRelFile = normalizeRelativeFilePath(relFile);
  if (!normalizedRelFile) return null;
  const sidecarRelPath = toMediaSidecarRelativePath(normalizedRelFile);
  if (!sidecarRelPath) return null;
  const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute);
  if (!folderAbsolute) return null;
  const sidecarAbsolute = path.join(folderAbsolute, sidecarRelPath);
  if (!sidecarAbsolute.startsWith(folderAbsolute)) return null;
  return manifestRelFromNodeAbsolute(sidecarAbsolute);
}

async function resolveHistoryTargetRelPath({ manifestRelPath, mode, file, systemName }) {
  if (mode === "system") {
    const serviceFolder = getAgentKitFolder();
    const name = String(systemName || "").trim();
    if (!serviceFolder || !name) return null;
    return normalizeHistoryTargetRelPath(`${serviceFolder}/${name}`);
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
    return normalizeHistoryTargetRelPath(await resolveExternalFileWorkspaceRel(resolvedManifest, file));
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
  for (const historyDirRel of listHistoryVersionDirCandidates(historyManifestRel, targetRelPath)) {
    const dirVersions = await readHistoryVersionsFromDir(historyDirRel);
    for (const entry of dirVersions) {
      if (seenVersions.has(entry.version)) continue;
      seenVersions.add(entry.version);
      versions.push(entry);
    }
  }
  versions.sort((left, right) => right.version.localeCompare(left.version));

  return { manifestPath: historyManifestRel, target: relativeTarget, versions };
}

async function readExistingBundleFile(relNodePath, bundleFileName) {
  const resolvedRelPath = await resolveExistingWorkspaceRelPath(relNodePath);
  const canonicalRel = namedStorageBundleRel(resolvedRelPath, bundleFileName);
  const absolute = normalizeWorkspacePath(canonicalRel);
  if (!absolute) return { path: canonicalRel, content: "", exists: false };
  try {
    const content = await fs.readFile(absolute, "utf-8");
    return { path: canonicalRel, content, exists: true };
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }
  return { path: canonicalRel, content: "", exists: false };
}

function getYamlScalar(frontmatter, key) {
  const text = String(frontmatter || "");
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  if (!match) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
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

    if (
      (rest.startsWith('"') && rest.endsWith('"')) ||
      (rest.startsWith("'") && rest.endsWith("'"))
    ) {
      entries.push({ key, kind: "string", value: rest.slice(1, -1) });
      index += 1;
      continue;
    }

    entries.push({ key, kind: "string", value: rest });
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

function applyAwnTimestampsToFrontmatter(frontmatter) {
  const now = new Date().toISOString();
  let next = String(frontmatter || "");
  const created = getYamlScalar(next, "awn-create");
  if (isEmptyAwnTimestampValue(created)) {
    next = upsertFrontmatterScalar(next, "awn-create", now);
  }
  next = upsertFrontmatterScalar(next, "awn-update", now);
  return next;
}

function applyAwnTimestampsToMarkdownContent(content) {
  const text = String(content ?? "");
  if (!/^---\r?\n/.test(text)) return text;
  const { frontmatter, body } = splitNodeFrontmatter(text);
  const nextFrontmatter = applyAwnTimestampsToFrontmatter(frontmatter);
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
  return { path: memoryRelPath, content: bundleHit.content, exists: bundleHit.exists };
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
  return path.join(getNodeStorageRootRel(relNodePath), BUNDLE_CONFIG_FILE).replace(/\\/g, "/");
}

function toEnvFilePath(relNodePath) {
  return path.join(getNodeStorageRootRel(relNodePath), ".env").replace(/\\/g, "/");
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
  if (mode === "references") {
    return path.join(storageRoot, STORAGE_SUBFOLDER_REFERENCES);
  }
  if (mode === "media") {
    return path.join(storageRoot, STORAGE_SUBFOLDER_ASSETS);
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
    await fs.rename(fromAbsolute, toAbsolute);
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

async function enrichExternalMarkdownFilePreview(manifestRelPath, folderAbsolute, fileEntry) {
  const fileAbsolute = path.join(folderAbsolute, fileEntry.relativePath);
  try {
    const raw = await fs.readFile(fileAbsolute, "utf-8");
    const { frontmatter } = splitNodeFrontmatter(raw);
    const props = parseFrontmatterProps(frontmatter);
    const previewRaw = getFrontmatterPropValue(props, "awn-preview") || getYamlScalar(frontmatter, "awn-preview");
    const previewMeta = await resolveAwnPreviewFieldMeta(manifestRelPath, previewRaw);
    const slug = fileEntry.name.replace(/\.md$/i, "");
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
    return {
      ...fileEntry,
      title: fileEntry.name.replace(/\.md$/i, ""),
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
      try {
        const raw = await fs.readFile(absolute, "utf-8");
        const { frontmatter } = splitNodeFrontmatter(raw);
        const folderSlug =
          path.posix.basename(path.posix.dirname(relPath)) ||
          path.posix.basename(relPath).replace(/\.md$/i, "");
        displayName = resolveNodeDisplayName(getYamlScalar(frontmatter, "awn-name") || "", folderSlug);
      } catch {
        // manifest may be unreadable
      }
      sectionManifests.push({ path: relPath, displayName });
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    let size = 0;
    let displayName = "";
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
            displayName = resolveNodeDisplayName(
              getYamlScalar(frontmatter, "awn-name") || "",
              entry.name
            );
          } catch {
            // sidecar may not exist yet
          }
        }
      }
    } catch {
      // keep size 0
    }

    items.push({
      path: relPath,
      name: entry.name,
      displayName,
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

function buildStorageSectionReadmeContent(title, awnType = "awn.record.category") {
  const safeTitle = String(title || "Раздел").trim() || "Раздел";
  const quotedTitle = /[:#\[\]{}&,*?]|^\s|\s$/.test(safeTitle)
    ? `"${safeTitle.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
    : safeTitle;
  if (!awnType) {
    return `---\nawn-name: ${quotedTitle}\n---\n\n> Описание раздела.\n`;
  }
  return `---\nawn-type: ${awnType}\nawn-name: ${quotedTitle}\n---\n\n> Описание раздела.\n`;
}

function resolveAwnSchemaTargetForSectionType(awnType) {
  if (awnType === "awn.media.category") return "media_category";
  if (awnType === "awn.record.category") return "record_category";
  return null;
}

async function buildStorageSectionReadmeContentForManifest(manifestRel, title, awnType) {
  const safeTitle = String(title || "Раздел").trim() || "Раздел";
  if (!awnType) return buildStorageSectionReadmeContent(safeTitle, null);

  const schemaTarget = resolveAwnSchemaTargetForSectionType(awnType);
  if (schemaTarget) {
    try {
      const configFile = await readNodeConfigFile(manifestRel);
      const payload = getTopicSchemaPayload(
        configFile.content || "",
        getAgentRoot(),
        getProjectRoot()
      );
      const mergedType = payload.merged[schemaTarget];
      if (mergedType?.fields && Object.keys(mergedType.fields).length) {
        const frontmatter = buildDefaultFrontmatter(awnType, {
          name: safeTitle,
          agentRoot: getAgentRoot(),
          projectRoot: getProjectRoot(),
          typeDef: mergedType
        });
        return `---\n${frontmatter}\n---\n\n> Описание раздела.\n`;
      }
    } catch {
      // fallback to minimal readme below
    }
  }

  return buildStorageSectionReadmeContent(safeTitle, awnType);
}

async function buildExternalRecordFileContentForManifest(manifestRel, title) {
  const safeTitle = String(title || "Воспоминание").trim() || "Воспоминание";
  try {
    const configFile = await readNodeConfigFile(manifestRel);
    const payload = getTopicSchemaPayload(
      configFile.content || "",
      getAgentRoot(),
      getProjectRoot()
    );
    const mergedType = payload.merged.record;
    if (mergedType?.fields && Object.keys(mergedType.fields).length) {
      const frontmatter = buildDefaultFrontmatter("awn.record", {
        name: safeTitle,
        agentRoot: getAgentRoot(),
        projectRoot: getProjectRoot(),
        typeDef: mergedType
      });
      return `---\n${frontmatter}\n---\n\n# ${safeTitle}\n`;
    }
  } catch {
    // fallback below
  }
  const frontmatter = buildDefaultFrontmatter("awn.record", {
    name: safeTitle,
    agentRoot: getAgentRoot(),
    projectRoot: getProjectRoot()
  });
  return `---\n${frontmatter}\n---\n\n# ${safeTitle}\n`;
}

async function writeStorageSectionReadme(
  sectionAbsolute,
  title,
  awnType = "awn.record.category",
  manifestRel = null
) {
  const readmeAbsolute = path.join(sectionAbsolute, AREA_MANIFEST_FILE);
  try {
    await fs.access(readmeAbsolute);
  } catch {
    const content = manifestRel
      ? await buildStorageSectionReadmeContentForManifest(manifestRel, title, awnType)
      : buildStorageSectionReadmeContent(title, awnType);
    await fs.writeFile(readmeAbsolute, content, "utf-8");
  }
}

async function getMediaFolderAbsolute(nodeAbsolute, options = {}) {
  const folderAbsolute = await resolveNodeSubfolderAbsolute(
    nodeAbsolute,
    STORAGE_SUBFOLDER_ASSETS,
    options
  );
  if (!folderAbsolute || !folderAbsolute.startsWith(getAgentRoot())) return null;
  return folderAbsolute;
}

async function collectMediaEntriesByType(folderAbsolute, prefix = "", grouped = new Map()) {
  const entries = await fs.readdir(folderAbsolute, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const absolute = path.join(folderAbsolute, entry.name);
    const relative = path.join(prefix, entry.name);

    if (entry.isDirectory()) {
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
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
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
    ? path.join(dirAbsolute, prefixNorm, AREA_MANIFEST_FILE)
    : path.join(dirAbsolute, AREA_MANIFEST_FILE);
  if (await nodePathExists(directAbsolute)) {
    return prefixNorm ? `${prefixNorm}/${AREA_MANIFEST_FILE}` : AREA_MANIFEST_FILE;
  }

  const workspaceKey = path.basename(dirAbsolute);
  const preferredFolder = toAreaFolderName(workspaceKey);
  if (preferredFolder) {
    const preferredRel = prefixNorm
      ? `${prefixNorm}/${preferredFolder}/${AREA_MANIFEST_FILE}`
      : `${preferredFolder}/${AREA_MANIFEST_FILE}`;
    const legacyAbsolute = prefixNorm
      ? path.join(dirAbsolute, prefixNorm, preferredFolder, AREA_MANIFEST_FILE)
      : path.join(dirAbsolute, preferredFolder, AREA_MANIFEST_FILE);
    if (await nodePathExists(legacyAbsolute)) {
      return preferredRel.replace(/\\/g, "/");
    }
  }
  return null;
}

async function ensureWorkspaceRootIndex(dirAbsolute) {
  if (!(await dirExists(dirAbsolute))) return;
  const workspaceKey = path.basename(dirAbsolute);
  const rootManifestAbsolute = path.join(dirAbsolute, AREA_MANIFEST_FILE);
  if (await fileExists(rootManifestAbsolute)) return;

  const legacyFolder = toAreaFolderName(workspaceKey);
  if (legacyFolder) {
    const legacyManifestAbsolute = path.join(dirAbsolute, legacyFolder, AREA_MANIFEST_FILE);
    if (await fileExists(legacyManifestAbsolute)) return;
  }

  await fs.writeFile(rootManifestAbsolute, `# ${workspaceKey}\n`, "utf-8");
  await ensureManifestStorageSlotDir(AREA_MANIFEST_FILE);
}

async function resolveAgentSubfolderAbsolute(agentRootAbsolute, folderName) {
  if (!folderName || !(await dirExists(agentRootAbsolute))) return null;
  const absolute = path.join(agentRootAbsolute, folderName);
  if (!(await dirExists(absolute))) return null;
  return absolute;
}

async function buildAgentMenu(agentRootAbsolute) {
  if (!(await dirExists(agentRootAbsolute))) {
    return {
      title: path.basename(agentRootAbsolute),
      sections: [],
      items: [],
      indexPath: null,
      serviceTree: null,
      containerTree: null,
      workspaceMissing: true
    };
  }

  await ensureWorkspaceRootIndex(agentRootAbsolute);
  const menu = dedupeReservedRootMenuSections(await listNodeMdFiles(agentRootAbsolute));
  const kitFolder = getAgentKitFolder();
  const containerFolder = getAgentContainerFolder();
  let serviceTree = null;
  let containerTree = null;

  const kitAbsolute = await resolveAgentSubfolderAbsolute(agentRootAbsolute, kitFolder);
  if (kitAbsolute) {
    serviceTree = await normalizeServiceMenuTree(
      await listNodeMdFiles(kitAbsolute, kitFolder, 0),
      kitAbsolute
    );
  }

  const containerAbsolute = await resolveAgentSubfolderAbsolute(agentRootAbsolute, containerFolder);
  if (containerAbsolute) {
    containerTree = await normalizeContainerMenuTree(
      await listNodeMdFiles(containerAbsolute, containerFolder, 0),
      containerAbsolute
    );
  }

  return { ...menu, serviceTree, containerTree };
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

function dedupeReservedRootMenuSections(menu) {
  const reserved = new Set(
    [getAgentKitFolder(), getAgentContainerFolder()]
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
    [getAgentKitFolder(), getAgentContainerFolder()]
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

async function enrichGitRepoMenuNode(node, gitRootAbsolute, gitRootRel) {
  if (!node?.hasGitSelf || !gitRootRel) return node;

  const kitFolder = getAgentKitFolder();
  let serviceTree = null;
  if (kitFolder) {
    const kitAbsolute = path.join(gitRootAbsolute, kitFolder);
    if (await dirExists(kitAbsolute)) {
      const kitRel = `${gitRootRel}/${kitFolder}`.replace(/\\/g, "/");
      serviceTree = await normalizeServiceMenuTree(
        await listNodeMdFiles(kitAbsolute, kitRel, 0),
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

const VISIBLE_DOT_MENU_ENTRIES = new Set([".awn-framework"]);
const MENU_SORT_FILE = "awn-sort.json";
const PARTS_FOLDER = "_Parts";
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

function isPartsFolderName(name) {
  return String(name || "").toLowerCase() === PARTS_FOLDER.toLowerCase();
}

function isContainerFolderName(name) {
  const configured = getAgentContainerFolder();
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
    const repoAbsolute = await resolveGitRepoRootAbsolute(getAgentRoot());
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

async function countDirectoryEntries(dirAbsolute) {
  try {
    const entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
    return entries.filter((entry) => entry.name !== ".DS_Store").length;
  } catch {
    return 0;
  }
}

async function inspectStorageLayersAtAbsolute(baseAbsolute, options = {}) {
  const layers = {};
  const existsBase = baseAbsolute ? await isExistingDirectory(baseAbsolute) : false;

  for (const fileName of STORAGE_SLOT_LAYER_FILES) {
    let exists = false;
    if (existsBase) {
      for (const name of listBundleFileNameCandidates(fileName)) {
        if (await fileExists(path.join(baseAbsolute, name))) {
          exists = true;
          break;
        }
      }
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
        entryCount = await countDirectoryEntries(folderAbsolute);
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
      const inspection = await inspectStorageLayersAtAbsolute(slotAbs);
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

  return { containers, manifestCount: manifests.length };
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
  const rows = [];

  for (const container of layout.containers || []) {
    for (const slot of container.slots || []) {
      const manifestPath = slot.manifestPath;
      const [meta, previewMeta, manifestStat] = await Promise.all([
        readNodeMenuMetaForNodeRel(manifestPath),
        getNodePreviewMeta(manifestPath),
        statNodeFileMeta(normalizeWorkspacePath(manifestPath))
      ]);

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
        category: meta.category,
        manifestUpdatedAt: manifestStat?.updatedAt || null
      });
    }
  }

  rows.sort((a, b) => a.displayPath.localeCompare(b.displayPath, "ru"));
  return { rows, manifestCount: layout.manifestCount || rows.length };
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

async function buildAgentTimeline(limit = 150) {
  const menu = await buildAgentMenu(getAgentRoot());
  const manifests = collectManifestEntriesFromMenu(menu, []);
  if (menu.serviceTree) {
    collectManifestEntriesFromMenu(menu.serviceTree, manifests);
  }

  const events = [];
  const storageOpts = getStoragePathOptions();

  for (const entry of manifests) {
    const manifestPath = String(entry.manifestPath || "").replace(/\\/g, "/");
    const slotDirRel = getNamedStorageSlotDirRel(manifestPath, storageOpts);
    const label =
      entry.label ||
      getManifestNamedSlotKey(manifestPath) ||
      path.posix.basename(manifestPath, path.extname(manifestPath));

    const tracks = [
      { fileKind: "manifest", fileLabel: "Манифест", rel: manifestPath },
      { fileKind: "content", fileLabel: BUNDLE_CONTENT_FILE, rel: `${slotDirRel}/${BUNDLE_CONTENT_FILE}` },
      { fileKind: "tabular", fileLabel: BUNDLE_TABULAR_FILE, rel: `${slotDirRel}/${BUNDLE_TABULAR_FILE}` },
      { fileKind: "config", fileLabel: BUNDLE_CONFIG_FILE, rel: `${slotDirRel}/${BUNDLE_CONFIG_FILE}` },
      { fileKind: "todo", fileLabel: path.posix.basename(toTodoFilePath(manifestPath)), rel: toTodoFilePath(manifestPath) },
      { fileKind: "env", fileLabel: ".env", rel: `${slotDirRel}/.env` }
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

    const slotAbs = normalizeWorkspacePath(slotDirRel);
    for (const previewName of PREVIEW_FILE_NAMES) {
      const previewAbs = slotAbs ? path.join(slotAbs, previewName) : null;
      const stat = await statNodeFileMeta(previewAbs);
      if (!stat?.updatedAt) continue;
      events.push({
        manifestPath,
        label,
        kind: entry.kind,
        displayPath: getManifestDisplayPathForTable(manifestPath, label, entry.kind),
        fileKind: "preview",
        fileLabel: `Превью (${previewName})`,
        relPath: `${slotDirRel}/${previewName}`.replace(/\\/g, "/"),
        updatedAt: stat.updatedAt,
        size: stat.size
      });
    }

    const assetsAbs = normalizeWorkspacePath(`${slotDirRel}/${STORAGE_SUBFOLDER_ASSETS}`);
    const newestAsset = await findNewestFileMetaInDir(assetsAbs);
    if (newestAsset?.updatedAt) {
      events.push({
        manifestPath,
        label,
        kind: entry.kind,
        displayPath: getManifestDisplayPathForTable(manifestPath, label, entry.kind),
        fileKind: "media",
        fileLabel: `${STORAGE_SUBFOLDER_ASSETS}/${newestAsset.name}`,
        relPath: newestAsset.relPath,
        updatedAt: newestAsset.updatedAt,
        size: newestAsset.size
      });
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

  return null;
}

async function ensureNodeStorageFileAbsolute(nodeAbsolute, fileName) {
  const storageRoot = getNodeStorageRootAbsolute(nodeAbsolute);
  await fs.mkdir(storageRoot, { recursive: true });
  const fileAbsolute = path.join(storageRoot, fileName);
  if (!fileAbsolute.startsWith(getAgentRoot())) return null;
  return fileAbsolute;
}

async function resolveNodeStorageFileAbsolute(nodeAbsolute, fileName, options = {}) {
  const storagePath = path.join(getNodeStorageRootAbsolute(nodeAbsolute), fileName);

  if (options.create) {
    return ensureNodeStorageFileAbsolute(nodeAbsolute, fileName);
  }

  if (await fileExists(storagePath)) return storagePath;
  return storagePath;
}

async function getOrCreateNodeStorageSubfolderAbsolute(nodeAbsolute, subfolderName) {
  const canonical = normalizeStorageSubfolderName(subfolderName);
  if (!canonical || canonical.toLowerCase() === STORAGE_SUBFOLDER_PREVIEW.toLowerCase()) {
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
      await fs.access(path.join(folderAbsolute, candidate));
      const stem = firstName.replace(/\.md$/i, "");
      candidate = `${stem}-${counter}.md`;
      counter += 1;
    } catch {
      return candidate.replace(/\\/g, "/");
    }
  }
}

async function getOrCreateExternalFolderAbsolute(nodeAbsolute) {
  return getOrCreateNodeStorageSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_CONTENT);
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

    return await runWithAgent(enriched.id, async () => {
      const manifestRel =
        (await resolveExistingNodeManifestRel(getAgentRoot())) || AREA_MANIFEST_FILE;
      return getNodePreviewMeta(manifestRel);
    });
  } catch {
    return { hasPreview: false, previewUrl: null };
  }
}

function stripAssetsPathPrefix(relPath) {
  let rel = String(relPath || "").replace(/\\/g, "/");
  const prefixes = [`${STORAGE_SUBFOLDER_ASSETS}/`];
  for (const prefix of prefixes) {
    if (rel.startsWith(prefix)) return rel.slice(prefix.length);
    const lower = prefix.toLowerCase();
    if (rel.toLowerCase().startsWith(lower)) return rel.slice(prefix.length);
  }
  return rel;
}

async function resolveAwnPreviewFieldMeta(nodeRelativePath, previewRaw) {
  const previewValue = String(previewRaw || "").trim();
  if (!previewValue) {
    return { hasPreview: false, previewUrl: null, previewFile: null };
  }

  const normalizedPath = String(nodeRelativePath || "").replace(/\\/g, "/");

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

  const resolvedRelPath = await resolveExistingWorkspaceRelPath(nodeRelativePath);
  const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
  if (!nodeAbsolute || !isManifestMdAbsolute(nodeAbsolute)) {
    return { hasPreview: false, previewUrl: null, previewFile: null };
  }

  const relFile = normalizeRelativeFilePath(stripAssetsPathPrefix(previewValue));
  if (!relFile) {
    return { hasPreview: false, previewUrl: null, previewFile: null };
  }

  const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute);
  if (!folderAbsolute) {
    return { hasPreview: false, previewUrl: null, previewFile: null };
  }

  const fileAbsolute = path.join(folderAbsolute, relFile);
  if (!fileAbsolute.startsWith(folderAbsolute)) {
    return { hasPreview: false, previewUrl: null, previewFile: null };
  }

  try {
    const stat = await fs.stat(fileAbsolute);
    if (!stat.isFile()) {
      return { hasPreview: false, previewUrl: null, previewFile: null };
    }
  } catch {
    return { hasPreview: false, previewUrl: null, previewFile: null };
  }

  return {
    hasPreview: true,
    previewUrl: `/api/media/file?path=${encodeURIComponent(normalizedPath)}&file=${encodeURIComponent(relFile)}`,
    previewFile: path.basename(relFile)
  };
}

async function getNodePreviewMeta(nodeRelativePath) {
  const resolvedRelPath = await resolveExistingWorkspaceRelPath(nodeRelativePath);
  const nodeAbsolute = normalizeWorkspacePath(resolvedRelPath);
  if (!nodeAbsolute || !isManifestMdAbsolute(nodeAbsolute)) {
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

function getServiceCatalogManifestRel(preset) {
  const scaffold = findCatalogScaffold(preset);
  if (!scaffold) return null;
  return path.posix.join(DEFAULT_SERVICE_CATALOG_FOLDER, toTopicFileName(scaffold.fileName));
}

function parseMarkdownTableBody(body) {
  const lines = String(body || "").split("\n");
  let headers = null;
  const rows = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell, index, all) => index > 0 && index < all.length - 1);
    if (!cells.length) continue;
    const isSeparator = cells.every((cell) => /^:?-{3,}:?$/.test(cell));
    if (isSeparator) continue;
    if (!headers) {
      headers = cells.map((cell) => cell.toLowerCase());
      continue;
    }
    rows.push(cells);
  }
  return { headers, rows };
}

function parseCategoryTableItems(body) {
  const { headers, rows } = parseMarkdownTableBody(body);
  if (!headers?.length) return [];
  const idIdx = headers.findIndex((h) => ["id", "slug", "код", "code"].includes(h));
  const labelIdx = headers.findIndex((h) => ["label", "name", "title", "название"].includes(h));
  const colorIdx = headers.findIndex((h) => h === "color" || h === "цвет");
  return rows
    .map((cells) => {
      const id = String(cells[idIdx >= 0 ? idIdx : 0] || "").trim();
      const label = String(cells[labelIdx >= 0 ? labelIdx : 1] || id).trim();
      const color = colorIdx >= 0 ? String(cells[colorIdx] || "").trim() : "";
      if (!id) return null;
      return { id, label, color: color || null };
    })
    .filter(Boolean);
}

function parseCategoryCsvItems(csv) {
  const columns = (csv?.columns || []).map((cell) => String(cell).trim().toLowerCase());
  const rows = Array.isArray(csv?.rows) ? csv.rows : [];
  if (!columns.length) return [];
  const idIdx = columns.findIndex((h) => ["id", "slug", "код", "code"].includes(h));
  const labelIdx = columns.findIndex((h) => ["label", "name", "title", "название"].includes(h));
  const colorIdx = columns.findIndex((h) => h === "color" || h === "цвет");
  return rows
    .map((cells) => {
      const id = String(cells[idIdx >= 0 ? idIdx : 0] || "").trim();
      const label = String(cells[labelIdx >= 0 ? labelIdx : 1] || id).trim();
      const color = colorIdx >= 0 ? String(cells[colorIdx] || "").trim() : "";
      if (!id) return null;
      return { id, label, color: color || null };
    })
    .filter(Boolean);
}

function parseTagsCsvItems(csv) {
  const columns = (csv?.columns || []).map((cell) => String(cell).trim().toLowerCase());
  const rows = Array.isArray(csv?.rows) ? csv.rows : [];
  if (!columns.length) return [];
  const tagIdx = columns.findIndex((h) => ["tag", "id", "name", "тег"].includes(h));
  const colIdx = tagIdx >= 0 ? tagIdx : 0;
  const tags = new Set();
  for (const cells of rows) {
    const raw = String(cells[colIdx] || "").trim().replace(/^#+/, "");
    if (raw) tags.add(raw);
  }
  return [...tags]
    .sort((a, b) => a.localeCompare(b, "ru"))
    .map((id) => ({ id, label: `#${id}` }));
}

function parseTagsBodyItems(body) {
  const tags = new Set();
  for (const line of String(body || "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("# ")) continue;
    if (trimmed.startsWith("#")) {
      trimmed
        .split(/\s+/)
        .map((part) => part.trim())
        .filter((part) => part.startsWith("#") && part.length > 1)
        .forEach((part) => tags.add(part.replace(/^#+/, "")));
      continue;
    }
    const bullet = trimmed.match(/^[-*]\s+#?([^\s#]+)/);
    if (bullet) tags.add(bullet[1].trim());
  }
  return [...tags]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ru"))
    .map((id) => ({ id, label: `#${id}` }));
}

async function readServiceCatalogFileBody(serviceAbsolute, manifestRel, bundleFileName = BUNDLE_CONTENT_FILE) {
  const contentRel = path.posix.join(namedStorageBundleDirRel(manifestRel), bundleFileName);
  const contentAbs = path.join(serviceAbsolute, contentRel);
  try {
    const raw = await fs.readFile(contentAbs, "utf-8");
    if (bundleFileName === BUNDLE_TABULAR_FILE) return raw;
    const { body } = splitNodeFrontmatter(raw);
    return body;
  } catch {
    return "";
  }
}

async function readServiceCatalogCsv(serviceAbsolute, manifestRel) {
  const raw = await readServiceCatalogFileBody(serviceAbsolute, manifestRel, BUNDLE_TABULAR_FILE);
  if (!String(raw || "").trim()) return { columns: [], rows: [] };
  return parseCsvText(raw);
}

async function listCategoryCatalogItems(serviceAbsolute, manifestRel) {
  const contentDirRel = path.posix.join(namedStorageBundleDirRel(manifestRel), STORAGE_SUBFOLDER_CONTENT);
  const contentDirAbs = path.join(serviceAbsolute, contentDirRel);
  const items = [];

  try {
    const entries = await fs.readdir(contentDirAbs, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
      if (entry.name.toLowerCase() === AREA_MANIFEST_FILE.toLowerCase()) continue;
      const fileRel = path.posix.join(contentDirRel, entry.name);
      const fileAbs = path.join(serviceAbsolute, fileRel);
      const raw = await fs.readFile(fileAbs, "utf-8");
      const { frontmatter } = splitNodeFrontmatter(raw);
      const baseName = entry.name.replace(/\.md$/i, "");
      const id = getYamlScalar(frontmatter, "awn-slug") || baseName;
      const label = resolveNodeDisplayName(getYamlScalar(frontmatter, "awn-name") || "", baseName);
      const color = getYamlScalar(frontmatter, "awn-color") || null;
      if (!id) continue;
      items.push({ id, label, color, path: fileRel });
    }
  } catch {
    // fall back to content.md table
  }

  if (items.length) {
    return items.sort((a, b) => a.label.localeCompare(b.label, "ru"));
  }

  const csv = await readServiceCatalogCsv(serviceAbsolute, manifestRel);
  const fromCsv = parseCategoryCsvItems(csv);
  if (fromCsv.length) return fromCsv;

  const body = await readServiceCatalogFileBody(serviceAbsolute, manifestRel, BUNDLE_CONTENT_FILE);
  return parseCategoryTableItems(body);
}

async function listTagsCatalogItems(serviceAbsolute, manifestRel) {
  const csv = await readServiceCatalogCsv(serviceAbsolute, manifestRel);
  const fromCsv = parseTagsCsvItems(csv);
  if (fromCsv.length) return fromCsv;

  const body = await readServiceCatalogFileBody(serviceAbsolute, manifestRel, BUNDLE_CONTENT_FILE);
  const fromBody = parseTagsBodyItems(body);
  if (fromBody.length) return fromBody;

  const contentDirRel = path.posix.join(namedStorageBundleDirRel(manifestRel), STORAGE_SUBFOLDER_CONTENT);
  const contentDirAbs = path.join(serviceAbsolute, contentDirRel);
  const tags = new Set();
  try {
    const entries = await fs.readdir(contentDirAbs, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
      const baseName = entry.name.replace(/\.md$/i, "");
      if (baseName) tags.add(baseName);
    }
  } catch {
    return [];
  }
  return [...tags]
    .sort((a, b) => a.localeCompare(b, "ru"))
    .map((id) => ({ id, label: `#${id}` }));
}

async function loadAgentCatalogPreset(serviceAbsolute, preset) {
  const scaffold = findCatalogScaffold(preset);
  if (!scaffold) {
    return { preset, exists: false, title: preset, items: [] };
  }
  const manifestRel = getServiceCatalogManifestRel(preset);
  if (!manifestRel) {
    return { preset, exists: false, title: scaffold.title, items: [] };
  }
  const manifestAbs = path.join(serviceAbsolute, manifestRel);
  try {
    await fs.access(manifestAbs);
  } catch {
    return { preset, exists: false, title: scaffold.title, manifestRel, items: [] };
  }

  const items =
    preset === "categories"
      ? await listCategoryCatalogItems(serviceAbsolute, manifestRel)
      : preset === "tags"
        ? await listTagsCatalogItems(serviceAbsolute, manifestRel)
        : [];

  return {
    preset,
    exists: true,
    title: scaffold.title,
    manifestRel,
    items
  };
}

async function getAgentCatalogsPayload() {
  const serviceFolder = getAgentKitFolder();
  if (!serviceFolder) {
    return {
      categories: { preset: "categories", exists: false, title: "Категории", items: [] },
      tags: { preset: "tags", exists: false, title: "Теги", items: [] }
    };
  }
  const serviceAbsolute = await resolveAgentSubfolderAbsolute(getAgentRoot(), serviceFolder);
  if (!serviceAbsolute) {
    return {
      categories: { preset: "categories", exists: false, title: "Категории", items: [] },
      tags: { preset: "tags", exists: false, title: "Теги", items: [] }
    };
  }
  const [categories, tags] = await Promise.all([
    loadAgentCatalogPreset(serviceAbsolute, "categories"),
    loadAgentCatalogPreset(serviceAbsolute, "tags")
  ]);
  return { categories, tags };
}

async function readNodeDisplayLabelForManifestRel(manifestRel) {
  const normalized = String(manifestRel || "").replace(/\\/g, "/");
  const slug = getManifestSlugFromRel(normalized);
  try {
    const { frontmatter } = await readNodeFrontmatterContent(normalized);
    const awnName = getYamlScalar(frontmatter, "awn-name") || "";
    return resolveNodeDisplayName(awnName, slug);
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
    return {
      color: extractColorFromPropsYaml(frontmatter),
      tags: extractTagsFromProps(frontmatter),
      category: extractCategoryFromProps(frontmatter, nodeRelPath),
      status: extractStatusFromProps(frontmatter)
    };
  } catch {
    return {
      color: null,
      tags: [],
      category: inferCategoryFromNodePath(nodeRelPath),
      status: null
    };
  }
}

async function readNodePropsColorForNodeRel(nodeRelPath) {
  const meta = await readNodeMenuMetaForNodeRel(nodeRelPath);
  return meta.color;
}

async function enrichMenuNodeItem(nodeRelPath) {
  const normalizedPath = String(nodeRelPath || "").replace(/\\/g, "/");
  const [meta, previewMeta] = await Promise.all([
    readNodeMenuMetaForNodeRel(normalizedPath),
    getNodePreviewMeta(normalizedPath)
  ]);
  return {
    color: meta.color,
    tags: meta.tags,
    category: meta.category,
    status: meta.status || null,
    ...previewMeta
  };
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

async function appendMenuSortOrderEntry(dirAbsolute, sortKey) {
  const key = String(sortKey || "").trim();
  if (!key || !dirAbsolute) return;
  const order = [...((await readMenuSortOrder(dirAbsolute)) || [])];
  if (order.includes(key)) return;
  order.push(key);
  const sortPath = path.join(dirAbsolute, MENU_SORT_FILE);
  await fs.writeFile(sortPath, `${JSON.stringify({ order }, null, 2)}\n`, "utf-8");
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

async function resolveGitRepoRootAbsolute(startAbsolute) {
  let current = path.resolve(String(startAbsolute || ""));
  const stopRoot = path.resolve(getProjectRoot());
  while (current) {
    if (await folderHasGitRepo(current)) {
      return current;
    }
    if (current === stopRoot) break;
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

async function buildAgentGitStatus() {
  const agentRoot = getAgentRoot();
  const repoAbsolute = await resolveGitRepoRootAbsolute(agentRoot);
  if (!repoAbsolute) {
    return {
      isRepo: false,
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

async function folderHasSkillManifest(dirAbsolute) {
  try {
    const stat = await fs.stat(path.join(dirAbsolute, "SKILL.md"));
    return stat.isFile();
  } catch {
    return false;
  }
}

async function readFolderWorkspaceMarkers(dirAbsolute) {
  const [hasGitSelf, hasObsidianSelf, hasAgentSelf, hasSkillSelf] = await Promise.all([
    folderHasGitRepo(dirAbsolute),
    folderHasObsidianVault(dirAbsolute),
    folderHasAgentManifest(dirAbsolute),
    folderHasSkillManifest(dirAbsolute)
  ]);
  return { hasGitSelf, hasObsidianSelf, hasAgentSelf, hasSkillSelf };
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

async function listNodeMdFiles(dirPath, prefix = "", depth = 0) {
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
      if (isStorageFolderName(entry.name)) continue;

      if (isGitRepoRoot && prefix) {
        if (isPartsFolderName(entry.name)) {
          await collectPartNodeItems(fullPath, prefix, files);
          continue;
        }
        if (isKitFolderName(entry.name)) {
          continue;
        }
        if (isContainerFolderName(entry.name)) {
          nestedContainerTree = await normalizeNestedContainerMenuTree(
            await listNodeMdFiles(fullPath, relativePath, depth + 1),
            fullPath,
            relativePath
          );
          continue;
        }
      }

      if (!prefix && (isKitFolderName(entry.name) || isContainerFolderName(entry.name))) {
        continue;
      }
      if (isPartsFolderName(entry.name)) {
        await collectPartNodeItems(fullPath, prefix, files);
        continue;
      }

      const child = await listNodeMdFiles(fullPath, relativePath, depth + 1);
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
        folders.push({
          title: folderTitle,
          folderPath: relativePath,
          ...child,
          ...markers,
          hasGit: markers.hasGitSelf,
          hasObsidian: markers.hasObsidianSelf,
          hasAgent: markers.hasAgentSelf,
          hasSkill: markers.hasSkillSelf,
          hasGitSelf: markers.hasGitSelf,
          hasObsidianSelf: markers.hasObsidianSelf,
          hasAgentSelf: markers.hasAgentSelf,
          hasSkillSelf: markers.hasSkillSelf
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
        hasSkill: markers.hasSkillSelf,
        hasGitSelf: markers.hasGitSelf,
        hasObsidianSelf: markers.hasObsidianSelf,
        hasAgentSelf: markers.hasAgentSelf,
        hasSkillSelf: markers.hasSkillSelf,
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
        ...(await enrichMenuNodeItem(nodeRelPath))
      };
      repoServiceFiles.push({ ...menuItem, menuScope: "repo-service" });
      continue;
    }

    if (entry.isFile() && isTopicManifestFileName(entry.name, { isAgentRoot: !prefix })) {
      const nodeRelPath = relativePath.replace(/\\/g, "/");
      const menuItem = {
        label: await readNodeDisplayLabelForManifestRel(nodeRelPath),
        path: nodeRelPath,
        ...(await enrichMenuNodeItem(nodeRelPath))
      };
      files.push(menuItem);
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
  if (indexPath) {
    const indexMeta = await enrichMenuNodeItem(indexPath);
    color = indexMeta.color;
    tags = indexMeta.tags || [];
    category = indexMeta.category || null;
    status = indexMeta.status || null;
    hasPreview = indexMeta.hasPreview;
    previewUrl = indexMeta.previewUrl;
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
    hasGit: selfMarkers.hasGitSelf,
    hasObsidian: selfMarkers.hasObsidianSelf,
    ...selfMarkers
  };

  if (isGitRepoRootMenu && prefix) {
    return enrichGitRepoMenuNode(baseNode, dirPath, prefix);
  }

  return baseNode;
}

function isSpaAppRoute(reqPath) {
  const normalized = String(reqPath || "/").replace(/\/+$/, "") || "/";
  return normalized.startsWith("/a/");
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
  const targetPath = reqPath === "/" ? "/index.html" : reqPath;
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
      if (entry.isDirectory() && !isStorageFolderName(entry.name)) {
        const areaManifest = path.join(dirAbsolute, entry.name, AREA_MANIFEST_FILE);
        if (await nodePathExists(areaManifest)) {
          return relDir
            ? `${relDir}/${entry.name}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/")
            : `${entry.name}/${AREA_MANIFEST_FILE}`;
        }
      }
      if (entry.isFile() && isTopicManifestFileName(entry.name)) {
        return relDir ? `${relDir}/${entry.name}`.replace(/\\/g, "/") : entry.name;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function isSearchableFileName(name) {
  if (name === ".env" || name === ".gitignore") return true;
  const ext = path.extname(name).toLowerCase();
  return [".md", ".yaml", ".yml", ".json", ".txt"].includes(ext);
}

function shouldSkipSearchDirectory(name) {
  const normalized = normalizeStorageSubfolderName(name);
  return (
    normalized === STORAGE_SUBFOLDER_PREVIEW ||
    name === ".obsidian" ||
    name === "node_modules"
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

  const storageTemp = await classifyStoragePathForMode(normalized, "temp", "Временные файлы");
  if (storageTemp) return storageTemp;

  const storageInbox = await classifyStoragePathForMode(normalized, "inbox", "Входящие");
  if (storageInbox) return storageInbox;

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
    { mode: "temp", source: "Временные файлы" },
    { mode: "inbox", source: "Входящие" },
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

  const inferred = inferAwnTypeFromPath(normalized, {
    contentMode: meta?.mode === "external" ? "external" : undefined,
    isAgentRoot: await isWorkspaceRootManifestRel(normalized)
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
  memory: "Память темы",
  service: "Служебные файлы",
  system: "Системные",
  other: "Прочие markdown"
};

function classifyMarkdownLinkGroup(relPath, meta) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.posix.basename(normalized);

  if (meta?.systemFile || isAllowedSystemFileName(base)) {
    return "system";
  }

  if (meta?.externalFile && meta?.mode === "external") {
    return "content";
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

function countTextMatches(content, query) {
  const lower = String(content || "").toLowerCase();
  const q = String(query || "").toLowerCase();
  if (!q) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = lower.indexOf(q, pos)) !== -1) {
    count += 1;
    pos += q.length;
  }
  return count;
}

function buildSearchSnippet(content, query, radius = 64) {
  const text = String(content || "");
  const lower = text.toLowerCase();
  const q = String(query || "").toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return "";

  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + q.length + radius);
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;
  return snippet;
}

function normalizeSearchScope(scope) {
  const value = String(scope || "content").toLowerCase();
  if (value === "filename" || value === "tags") return value;
  return "content";
}

function getSearchMinLength(scope) {
  return scope === "filename" ? 1 : 2;
}

function matchesFilename(relPath, query) {
  const qLower = String(query || "").toLowerCase();
  const base = path.basename(relPath);
  const displayName = base.replace(/\.(md|yaml|yml|json|txt)$/i, "");
  return (
    base.toLowerCase().includes(qLower) ||
    displayName.toLowerCase().includes(qLower) ||
    relPath.toLowerCase().includes(qLower)
  );
}

function extractTagsFromProps(content) {
  const tags = [];
  const text = String(content || "");
  const lines = text.split("\n");
  let inTagsArray = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^tags:\s*$/i.test(trimmed)) {
      inTagsArray = true;
      continue;
    }

    if (inTagsArray) {
      const itemMatch = line.match(/^\s*-\s*(.+)$/);
      if (itemMatch) {
        tags.push(itemMatch[1].trim().replace(/^["']|["']$/g, ""));
        continue;
      }
      if (!/^\s*-/.test(line)) inTagsArray = false;
    }

    const inlineMatch = trimmed.match(/^tags:\s*(.+)$/i);
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

async function searchByFilename(query, limit = 30) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return { query: trimmed, scope: "filename", results: [], total: 0 };

  const relFiles = await collectSearchableFiles(getAgentRoot());
  const results = [];

  for (const relPath of relFiles) {
    if (!matchesFilename(relPath, trimmed)) continue;

    const meta = await classifySearchResult(relPath);
    if (!meta) continue;

    const displayName = path.basename(relPath);
    results.push({
      ...meta,
      filePath: meta.canonicalPath || relPath,
      snippet: displayName,
      matchCount: 1
    });

    if (results.length >= limit) break;
  }

  results.sort((a, b) => a.filePath.localeCompare(b.filePath, "ru"));
  return { query: trimmed, scope: "filename", results, total: results.length };
}

async function searchByContent(query, limit = 30) {
  const trimmed = String(query || "").trim();
  if (trimmed.length < 2) {
    return { query: trimmed, scope: "content", results: [], total: 0 };
  }

  const relFiles = await collectSearchableFiles(getAgentRoot());
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

    const meta = await classifySearchResult(relPath);
    if (!meta) continue;

    results.push({
      ...meta,
      filePath: meta.canonicalPath || relPath,
      snippet: buildSearchSnippet(content, trimmed),
      matchCount: countTextMatches(content, trimmed)
    });

    if (results.length >= limit) break;
  }

  results.sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return a.filePath.localeCompare(b.filePath, "ru");
  });

  return { query: trimmed, scope: "content", results, total: results.length };
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

async function searchByTags(query, limit = 30) {
  const trimmed = String(query || "").trim();
  if (trimmed.length < 2) {
    return { query: trimmed, scope: "tags", results: [], total: 0 };
  }

  const relFiles = await collectNodeMdFiles(getAgentRoot());
  const qLower = trimmed.toLowerCase();
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
    const matchingTags = tags.filter((tag) => tag.toLowerCase().includes(qLower));
    if (matchingTags.length === 0) continue;

    results.push({
      nodePath: relPath,
      mode: "description",
      source: "Тэги",
      filePath: relPath,
      snippet: matchingTags.join(", "),
      matchCount: matchingTags.length
    });

    if (results.length >= limit) break;
  }

  results.sort((a, b) => {
    if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
    return a.filePath.localeCompare(b.filePath, "ru");
  });

  return { query: trimmed, scope: "tags", results, total: results.length };
}

async function searchWorkspaceContent(query, limit = 30, scope = "content") {
  const normalizedScope = normalizeSearchScope(scope);
  if (normalizedScope === "filename") return searchByFilename(query, limit);
  if (normalizedScope === "tags") return searchByTags(query, limit);
  return searchByContent(query, limit);
}

async function searchGlobalAcrossAgents(query, agentIds, limit = 50, scope = "content") {
  const trimmed = String(query || "").trim();
  const normalizedScope = normalizeSearchScope(scope);
  const ids = Array.isArray(agentIds) ? agentIds.filter(Boolean) : [];
  const perAgentLimit = Math.max(5, Math.ceil(limit / Math.max(ids.length, 1)));
  const merged = [];

  for (const agentId of ids) {
    const agent = resolveAgent(agentId);
    if (!agent) continue;

    try {
      const data = await runWithAgent(agentId, () =>
        searchWorkspaceContent(trimmed, perAgentLimit, normalizedScope)
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
  if (req.method === "GET" && url.pathname === "/api/search") {
    const query = url.searchParams.get("q") || "";
    const scope = url.searchParams.get("scope") || "content";
    const limitRaw = Number(url.searchParams.get("limit") || 30);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 30;

    try {
      const data = await searchWorkspaceContent(query, limit, scope);
      return sendJson(res, 200, data);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to search content", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/menu") {
    try {
      const menu = await buildAgentMenu(getAgentRoot());
      return sendJson(res, 200, menu);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to read Workspaces menu", details: String(error.message || error) });
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

  if (req.method === "GET" && url.pathname === "/api/system-files") {
    try {
      const files = [];
      for (const name of SYSTEM_FILE_NAMES) {
        files.push(await getSystemFileMeta(name));
      }
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

      const serviceManifestRel = getServiceAreaManifestRel(getAgentKitFolder());
      const targetRelPath = manifestRelFromNodeAbsolute(absolute);
      if (serviceManifestRel && targetRelPath) {
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
    if (!isManifestMdAbsolute(absolute)) return sendJson(res, 400, { error: "Only manifest markdown files are allowed (*.md, _registration.md)" });

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
      const title = String(payload.title || "").trim();

      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!title) return sendJson(res, 400, { error: "Title cannot be empty" });

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
        const targetFolderName = isStorageFolderName(currentFolderName)
          ? toStorageFolderName(title)
          : toAreaFolderName(title);
        if (!targetFolderName) return sendJson(res, 400, { error: "Folder name cannot be empty" });
        const targetFolderAbsolute = path.join(parentAbsolutePath, targetFolderName);

        try {
          await fs.access(targetFolderAbsolute);
          return sendJson(res, 409, { error: "Folder with this name already exists" });
        } catch {
          // Target does not exist, continue.
        }

        await fs.rename(currentFolderAbsolute, targetFolderAbsolute);

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

        const nextName = toNodeFileName(title);
        if (!nextName) return sendJson(res, 400, { error: "Invalid file name" });
        const targetAbsolute = path.join(dirAbsolute, nextName);
        const targetRelPath =
          !dirRelPath || dirRelPath === "."
            ? nextName
            : path.join(dirRelPath, nextName).replace(/\\/g, "/");

        if (targetAbsolute !== absolute) {
          try {
            await fs.access(targetAbsolute);
            return sendJson(res, 409, { error: "File with this name already exists" });
          } catch {
            // Target does not exist, continue.
          }
          const oldContentAbsolute = normalizeWorkspacePath(toContentFilePath(normalized));
          const newContentAbsolute = normalizeWorkspacePath(toContentFilePath(targetRelPath));
          const oldTodoAbsolute = normalizeWorkspacePath(toTodoFilePath(normalized));
          const newTodoAbsolute = normalizeWorkspacePath(toTodoFilePath(targetRelPath));
          const oldConfigAbsolute = normalizeWorkspacePath(toNodeConfigFilePath(normalized));
          const newConfigAbsolute = normalizeWorkspacePath(toNodeConfigFilePath(targetRelPath));
          await fs.rename(absolute, targetAbsolute);
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
          nextRelPath = targetRelPath;
          nextAbsolute = targetAbsolute;
        }
      }

      const content = await fs.readFile(nextAbsolute, "utf-8");

      return sendJson(res, 200, {
        path: stripAgentContentPrefixFromRelPath(nextRelPath),
        title,
        content
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

      const stampedContent = applyAwnTimestampsToMarkdownContent(content);
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
      const versionFile = await readHistoryVersionFile({
        manifestRelPath: historyManifestRel,
        targetRelPath,
        version
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

      const versionFile = await readHistoryVersionFile({
        manifestRelPath: historyManifestRel,
        targetRelPath,
        version
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

  if (req.method === "GET" && url.pathname === "/api/file/properties") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
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

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const raw = (await readNodeManifestRaw(nodeAbsolute)) ?? "";
      const { body } = splitNodeFrontmatter(raw);
      const stampedFrontmatter = applyAwnTimestampsToFrontmatter(content);
      const nextContent = joinNodeFrontmatter(stampedFrontmatter, body);
      await fs.mkdir(path.dirname(nodeAbsolute), { recursive: true });
      await fs.writeFile(nodeAbsolute, nextContent, "utf-8");
      return sendJson(res, 200, { path: relPath, content: stampedFrontmatter, fullContent: nextContent });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save properties", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file/topic-schema") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const manifestCtx = await resolveApiManifestContext(relPath);
    if (!manifestCtx) return sendJson(res, 400, { error: "Invalid file path" });

    try {
      const configFile = await readNodeConfigFile(manifestCtx.rel);
      const payload = getTopicSchemaPayload(configFile.content, getAgentRoot(), getProjectRoot());
      return sendJson(res, 200, {
        path: manifestCtx.rel,
        configPath: configFile.path,
        configExists: configFile.exists,
        awnSchema: payload.awnSchema,
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
      const awnSchema = normalizeAwnSchema(payload.awnSchema);

      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });

      const manifestCtx = await resolveApiManifestContext(relPath);
      if (!manifestCtx) return sendJson(res, 400, { error: "Invalid file path" });

      const configFile = await readNodeConfigFile(manifestCtx.rel);
      const configRelPath = toNodeConfigFilePath(manifestCtx.rel);
      const configAbsolute = normalizeWorkspacePath(configRelPath);
      if (!configAbsolute) return sendJson(res, 400, { error: "Invalid node config path" });

      const nextContent = applyAwnSchemaToConfig(configFile.content, awnSchema);
      await fs.mkdir(path.dirname(configAbsolute), { recursive: true });
      if (!String(nextContent).trim()) {
        await removeIfExists(configAbsolute);
      } else {
        await writeWorkspaceTextFileWithHistory(manifestCtx.rel, configRelPath, nextContent);
      }

      const schemaPayload = getTopicSchemaPayload(nextContent, getAgentRoot(), getProjectRoot());
      return sendJson(res, 200, {
        path: manifestCtx.rel,
        configPath: configRelPath,
        content: nextContent,
        exists: Boolean(String(nextContent).trim()),
        awnSchema: schemaPayload.awnSchema,
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

  if (req.method === "GET" && url.pathname === "/api/file/node-config") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const manifestCtx = await resolveApiManifestContext(relPath);
    if (!manifestCtx) return sendJson(res, 400, { error: "Invalid file path" });

    const configRelPath = toNodeConfigFilePath(manifestCtx.rel);

    try {
      const configFile = await readNodeConfigFile(manifestCtx.rel);
      const defaultLandingMode = extractDefaultLandingModeFromNodeConfig(configFile.content);
      return sendJson(res, 200, {
        path: configFile.path || configRelPath,
        content: configFile.content,
        exists: configFile.exists,
        defaultLandingMode
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

      const normalizedContent = content.endsWith("\n") ? content : `${content}\n`;
      await writeWorkspaceTextFileWithHistory(manifestCtx.rel, configRelPath, normalizedContent);
      const defaultLandingMode = extractDefaultLandingModeFromNodeConfig(content);
      return sendJson(res, 200, {
        path: configRelPath,
        content,
        exists: true,
        defaultLandingMode
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
      return sendJson(res, 200, { exists: true, files: enrichedFiles, folders, nonMarkdownFiles });
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

    const normalizedRelFile = normalizeRelativeFilePath(relFile);
    if (!normalizedRelFile || !normalizedRelFile.toLowerCase().endsWith(".md")) {
      return sendJson(res, 400, { error: "Only .md files are allowed" });
    }

    const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_CONTENT);
    if (!folderAbsolute) return sendJson(res, 404, { error: "External folder not found" });

    const fileAbsolute = path.join(folderAbsolute, normalizedRelFile);
    if (!fileAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid external file path" });

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

      const normalizedRelFile = normalizeRelativeFilePath(relFile);
      if (!normalizedRelFile || !normalizedRelFile.toLowerCase().endsWith(".md")) {
        return sendJson(res, 400, { error: "Only .md files are allowed" });
      }

      let folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, STORAGE_SUBFOLDER_CONTENT);
      if (!folderAbsolute) {
        folderAbsolute = await getOrCreateExternalFolderAbsolute(nodeAbsolute);
      }
      if (!folderAbsolute) return sendJson(res, 404, { error: "External folder not found" });

      const fileAbsolute = path.join(folderAbsolute, normalizedRelFile);
      if (!fileAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid external file path" });

      const resolvedManifest = manifestRelFromNodeAbsolute(nodeAbsolute);
      const targetRelPath = manifestRelFromNodeAbsolute(fileAbsolute);
      const stampedContent = applyAwnTimestampsToMarkdownContent(content);
      await writeWorkspaceTextFileWithHistory(resolvedManifest, targetRelPath, stampedContent);
      return sendJson(res, 200, { file: normalizedRelFile.replace(/\\/g, "/"), content: stampedContent });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save external file", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/external/file/create") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const { display, diskSlug } = resolveContentItemNames(payload);
      const title = display || "Воспоминание";
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!title) return sendJson(res, 400, { error: "Title cannot be empty" });
      if (!diskSlug) return sendJson(res, 400, { error: "Invalid slug" });

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const folderAbsolute = await getOrCreateExternalFolderAbsolute(nodeAbsolute);
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid external folder path" });

      const parentRaw = String(payload.parent || "").trim().replace(/\\/g, "/");
      const targetFolder = await resolveMediaTargetFolderAbsolute(folderAbsolute, parentRaw);
      if (!targetFolder) {
        return sendJson(res, 400, { error: parentRaw ? "Parent section not found" : "Invalid external folder path" });
      }

      const fileName = await resolveUniqueExternalFileName(targetFolder, diskSlug);
      if (!fileName) return sendJson(res, 400, { error: "Invalid file name" });

      const fileAbsolute = path.join(targetFolder, fileName);
      const content = await buildExternalRecordFileContentForManifest(relPath, title);
      await fs.writeFile(fileAbsolute, content, "utf-8");

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

      const parentRaw = String(payload.parent || "").trim().replace(/\\/g, "/");
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
      await writeStorageSectionReadme(sectionAbsolute, title, "awn.record.category", relPath);
      const sectionPath = path.relative(folderAbsolute, sectionAbsolute).replace(/\\/g, "/");
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

      const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute, { create: true });
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid media folder path" });

      const parentRaw = String(payload.parent || "").trim().replace(/\\/g, "/");
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
      await writeStorageSectionReadme(sectionAbsolute, title, "awn.media.category", relPath);
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

      const parentRaw = String(payload.parent || "").trim().replace(/\\/g, "/");
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
      await writeStorageSectionReadme(sectionAbsolute, title, null);
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
      const stampedContent = applyAwnTimestampsToMarkdownContent(content);
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

      if (currentAbsolute !== nextAbsolute) {
        try {
          await fs.access(nextAbsolute);
          return sendJson(res, 409, { error: "File with this name already exists" });
        } catch {
          // target does not exist
        }
        await fs.rename(currentAbsolute, nextAbsolute);
      }

      const content = await fs.readFile(nextAbsolute, "utf-8");
      return sendJson(res, 200, { file: nextRelPath, content });
    } catch (error) {
      const code = error && error.code ? String(error.code) : "";
      if (code === "ENOENT") return sendJson(res, 404, { error: "External file not found" });
      return sendJson(res, 500, { error: "Failed to rename external file", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/media") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute);
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

      return sendJson(res, 200, {
        exists: true,
        files,
        content,
        groups,
        sectionManifests
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
      const data = payload.data;
      const fileName = payload.fileName;
      const mimeType = payload.mimeType;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!data || typeof data !== "string") return sendJson(res, 400, { error: "Missing file data" });

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const buffer = Buffer.from(data, "base64");
      if (!buffer.length) return sendJson(res, 400, { error: "Empty file data" });
      if (buffer.length > 10 * 1024 * 1024) {
        return sendJson(res, 400, { error: "File is too large (max 10 MB)" });
      }

      const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute, { create: true });
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid media folder path" });

      const subdir = normalizeRelativeFilePath(String(payload.subdir || "").trim());
      const createSubdir = Boolean(payload.createSubdir);
      const targetFolder = await resolveMediaTargetFolderAbsolute(folderAbsolute, subdir, {
        create: createSubdir
      });
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
        if (!targetAbsolute || !targetAbsolute.startsWith(folderAbsolute)) {
          return sendJson(res, 400, { error: "Invalid media file path" });
        }
        await fs.writeFile(targetAbsolute, buffer);
        storedRelFile = path.relative(folderAbsolute, targetAbsolute).replace(/\\/g, "/");
      } else {
        const safeName = sanitizeMediaFileName(fileName);
        if (!safeName) return sendJson(res, 400, { error: "Invalid file name" });
        const targetAbsolute = await resolveUniqueMediaFileAbsolute(targetFolder, safeName);
        if (!targetAbsolute || !targetAbsolute.startsWith(folderAbsolute)) {
          return sendJson(res, 400, { error: "Invalid media file path" });
        }
        await fs.writeFile(targetAbsolute, buffer);
        storedRelFile = path.relative(folderAbsolute, targetAbsolute).replace(/\\/g, "/");
      }

      return sendJson(res, 200, {
        file: storedRelFile,
        imageUrl: `/api/media/file?path=${encodeURIComponent(relPath)}&file=${encodeURIComponent(storedRelFile)}`
      });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to upload media file", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/media/file") {
    const relPath = url.searchParams.get("path");
    const relFile = url.searchParams.get("file");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!relFile) return sendJson(res, 400, { error: "Missing file query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    const normalizedRelFile = normalizeRelativeFilePath(relFile);
    if (!normalizedRelFile) return sendJson(res, 400, { error: "Invalid media file path" });

    const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute);
    if (!folderAbsolute) return sendJson(res, 404, { error: "Media folder not found" });

    const fileAbsolute = path.join(folderAbsolute, normalizedRelFile);
    if (!fileAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid media file path" });

    try {
      const stat = await fs.stat(fileAbsolute);
      if (!stat.isFile()) return sendJson(res, 404, { error: "Media file not found" });

      const content = await fs.readFile(fileAbsolute);
      const ext = path.extname(fileAbsolute).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": contentType,
        "Cache-Control": "no-store"
      });
      res.end(content);
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
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only manifest markdown files are allowed (*.md, _registration.md)" });

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
      const content = await fs.readFile(imageAbsolute);
      const ext = path.extname(imageAbsolute).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-cache" });
      res.end(content);
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

  if (req.method === "GET" && url.pathname === "/api/media/sidecar") {
    const relPath = url.searchParams.get("path");
    const relFile = url.searchParams.get("file");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });
    if (!relFile) return sendJson(res, 400, { error: "Missing file query parameter" });

    const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

    const normalizedRelFile = normalizeRelativeFilePath(relFile);
    if (!normalizedRelFile) return sendJson(res, 400, { error: "Invalid media file path" });

    const sidecarRelPath = toMediaSidecarRelativePath(normalizedRelFile);
    if (!sidecarRelPath) return sendJson(res, 400, { error: "Invalid media file path" });

    const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute);
    if (!folderAbsolute) return sendJson(res, 404, { error: "Media folder not found" });

    const mediaAbsolute = path.join(folderAbsolute, normalizedRelFile);
    if (!mediaAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid media file path" });

    const sidecarAbsolute = path.join(folderAbsolute, sidecarRelPath);
    if (!sidecarAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid sidecar file path" });

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
      const relFile = payload.file;
      const content = typeof payload.content === "string" ? payload.content : null;

      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!relFile) return sendJson(res, 400, { error: "Missing media file path" });
      if (content === null) return sendJson(res, 400, { error: "Missing content" });

      const nodeAbsolute = await resolveApiManifestAbsolute(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });

      const normalizedRelFile = normalizeRelativeFilePath(relFile);
      if (!normalizedRelFile) return sendJson(res, 400, { error: "Invalid media file path" });

      const sidecarRelPath = toMediaSidecarRelativePath(normalizedRelFile);
      if (!sidecarRelPath) return sendJson(res, 400, { error: "Invalid media file path" });

      const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute);
      if (!folderAbsolute) return sendJson(res, 404, { error: "Media folder not found" });

      const mediaAbsolute = path.join(folderAbsolute, normalizedRelFile);
      if (!mediaAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid media file path" });

      const sidecarAbsolute = path.join(folderAbsolute, sidecarRelPath);
      if (!sidecarAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid sidecar file path" });

      const mediaStat = await fs.stat(mediaAbsolute);
      if (!mediaStat.isFile()) return sendJson(res, 404, { error: "Media file not found" });

      const resolvedManifest = manifestRelFromNodeAbsolute(nodeAbsolute);
      const targetRelPath = manifestRelFromNodeAbsolute(sidecarAbsolute);
      const stampedContent = applyAwnTimestampsToMarkdownContent(content);
      await writeWorkspaceTextFileWithHistory(resolvedManifest, targetRelPath, stampedContent);

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

        const sidecarRelPath = toMediaSidecarRelativePath(normalizedRelFile);
        const nextSidecarRelPath = toMediaSidecarRelativePath(nextRelFile);
        if (sidecarRelPath && nextSidecarRelPath) {
          const sidecarAbsolute = path.join(folderAbsolute, sidecarRelPath);
          const nextSidecarAbsolute = path.join(folderAbsolute, nextSidecarRelPath);
          if (sidecarAbsolute.startsWith(folderAbsolute) && nextSidecarAbsolute.startsWith(folderAbsolute)) {
            try {
              await fs.rename(sidecarAbsolute, nextSidecarAbsolute);
            } catch (error) {
              if (!error || error.code !== "ENOENT") throw error;
            }
          }
        }
      }

      const sidecarRelPath = toMediaSidecarRelativePath(nextRelFile);
      let content = "";
      if (sidecarRelPath) {
        const sidecarAbsolute = path.join(folderAbsolute, sidecarRelPath);
        try {
          content = await fs.readFile(sidecarAbsolute, "utf-8");
        } catch {
          content = "";
        }
      }

      return sendJson(res, 200, {
        file: nextRelFile,
        sidecar: sidecarRelPath ? sidecarRelPath.replace(/\\/g, "/") : "",
        content
      });
    } catch (error) {
      const code = error && error.code ? String(error.code) : "";
      if (code === "ENOENT") return sendJson(res, 404, { error: "Media file not found" });
      return sendJson(res, 500, { error: "Failed to rename media file", details: String(error.message || error) });
    }
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
      return sendJson(res, 200, {
        exists: true,
        files: chunks.length,
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
        type !== "catalog" &&
        type !== "service-doc" &&
        type !== "container-root" &&
        type !== "kit-root"
      ) {
        return sendJson(res, 400, { error: "Invalid type" });
      }

      if (type === "kit-root" || type === "container-root") {
        const parentRel = String(payload.parentPath || ".").replace(/\\/g, "/").trim() || ".";
        const isKit = type === "kit-root";
        if (isKit && parentRel !== ".") {
          return sendJson(res, 400, { error: "Reserved folders can only be created at workspace root" });
        }

        const folderName = isKit ? getAgentKitFolder() : getAgentContainerFolder();
        const areaName = isKit ? SERVICE_AREA_NAME : CONTAINER_AREA_NAME;
        const areaType = isKit ? "service" : "awn.area";

        if (!folderName) {
          return sendJson(res, 400, {
            error: isKit ? "Agent kit folder is not configured" : "Container folder is not configured"
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
            error: isKit ? "Agent kit folder already exists" : "Container folder already exists"
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
        await appendMenuSortOrderEntry(folderAbsolute, areaName);

        return sendJson(res, 200, {
          createdPath: toMenuDisplayCreatedPath(createdRel),
          type
        });
      }

      if (type === "folder" || type === "file" || type === "manifest") {
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

      if (type === "catalog" || type === "service-doc") {
        if (!serviceFolder) {
          return sendJson(res, 400, { error: "Service folder is not configured for this agent" });
        }
        if (parentRelPath !== serviceFolder) {
          return sendJson(res, 400, {
            error:
              type === "catalog"
                ? "Catalog presets can only be created in the service folder root"
                : "Service docs can only be created in the service folder root"
          });
        }

        const preset = String(payload.preset || name || "").trim().toLowerCase();
        const scaffold =
          type === "catalog" ? findCatalogScaffold(preset) : findServiceDocScaffold(preset);
        if (!scaffold) {
          return sendJson(res, 400, {
            error: type === "catalog" ? "Unknown catalog preset" : "Unknown service doc preset"
          });
        }

        const serviceAbsolute = await resolveAgentSubfolderAbsolute(getAgentRoot(), serviceFolder);
        if (!serviceAbsolute) return sendJson(res, 400, { error: "Invalid service folder path" });

        try {
          const createdFile =
            type === "catalog"
              ? createSystemCatalogNodeSync(serviceAbsolute, preset)
              : createSystemServiceDocSync(serviceAbsolute, preset);
          const createdPath = path.join(serviceFolder, createdFile).replace(/\\/g, "/");
          return sendJson(res, 200, { createdPath, type, preset });
        } catch (error) {
          const code = error && error.code ? String(error.code) : "";
          if (code === "EEXIST") {
            return sendJson(res, 409, {
              error: type === "catalog" ? "Catalog node already exists" : "Service doc already exists"
            });
          }
          if (code === "EINVAL") {
            return sendJson(res, 400, { error: String(error.message || "Invalid preset") });
          }
          throw error;
        }
      }

      if (!name && type !== "manifest") {
        return sendJson(res, 400, { error: "Name is required" });
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

      if (type === "manifest") {
        const currentFolderName = path.basename(parentAbsolute);
        const displayName = String(payload.displayName || "").trim();
        const title =
          displayName ||
          String(name || stripTopicPrefix(currentFolderName)).trim() ||
          currentFolderName;
        const diskSlug = resolveNodeDiskSlugFromPayload(payload);
        const targetFolderName = toFolderName(diskSlug);
        if (!targetFolderName) return sendJson(res, 400, { error: "Invalid folder name" });

        let areaFolderAbsolute = parentAbsolute;
        let areaFolderRel =
          parentPathResolved && parentPathResolved !== "."
            ? parentPathResolved
            : currentFolderName;

        if (targetFolderName !== currentFolderName) {
          const parentDirAbsolute = path.dirname(parentAbsolute);
          const targetFolderAbsolute = path.join(parentDirAbsolute, targetFolderName);
          try {
            await fs.access(targetFolderAbsolute);
            return sendJson(res, 409, { error: "Folder with this name already exists" });
          } catch {
            // Target does not exist, continue.
          }
          await fs.rename(parentAbsolute, targetFolderAbsolute);
          areaFolderAbsolute = targetFolderAbsolute;
          const parentFolderRel = path.dirname(areaFolderRel).replace(/\\/g, "/");
          areaFolderRel =
            parentFolderRel && parentFolderRel !== "."
              ? path.join(parentFolderRel, targetFolderName).replace(/\\/g, "/")
              : targetFolderName;
        }

        const manifestAbsolute = path.join(areaFolderAbsolute, AREA_MANIFEST_FILE);
        try {
          await fs.access(manifestAbsolute);
          return sendJson(res, 409, { error: "Node manifest already exists in this folder" });
        } catch {
          // continue
        }

        const manifestFrontmatter = buildDefaultFrontmatter("awn.area", {
          name: title,
          agentRoot: getAgentRoot(),
          projectRoot: getProjectRoot()
        });
        await fs.writeFile(
          manifestAbsolute,
          joinNodeFrontmatter(manifestFrontmatter, ""),
          "utf-8"
        );

        const createdRel = `${areaFolderRel}/${AREA_MANIFEST_FILE}`.replace(/\\/g, "/");
        await ensureManifestStorageSlotDir(createdRel);
        await appendMenuSortOrderEntry(
          path.dirname(areaFolderAbsolute),
          title
        );

        return sendJson(res, 200, {
          createdPath: toMenuDisplayCreatedPath(createdRel),
          type: "manifest"
        });
      }

      if (type === "folder") {
        const displayName = String(payload.displayName || "").trim() || String(name || "").trim();
        const diskSlug = resolveNodeDiskSlugFromPayload(payload);
        const folderName = toFolderName(diskSlug);
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
        const areaTitle = displayName || stripTopicPrefix(folderName);
        const areaFrontmatter = buildDefaultFrontmatter("awn.area", {
          name: areaTitle,
          agentRoot: getAgentRoot(),
          projectRoot: getProjectRoot()
        });
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
        await appendMenuSortOrderEntry(parentAbsolute, areaTitle);

        return sendJson(res, 200, {
          createdPath: toMenuDisplayCreatedPath(createdRel),
          type: "folder"
        });
      }

      const displayName = String(payload.displayName || "").trim() || String(name || "").trim();
      const diskSlug = resolveNodeDiskSlugFromPayload(payload);
      const partFileName = toNodeFileName(diskSlug);
      if (!partFileName) return sendJson(res, 400, { error: "Invalid topic name" });

      const partFileAbsolute = path.join(parentAbsolute, partFileName);
      try {
        await fs.access(partFileAbsolute);
        return sendJson(res, 409, { error: "Topic already exists" });
      } catch {
        // continue
      }

      const fileFrontmatter = buildDefaultFrontmatter("awn.topic", {
        name: displayName || stripTopicPrefix(partFileName),
        agentRoot: getAgentRoot(),
        projectRoot: getProjectRoot()
      });
      await fs.writeFile(
        partFileAbsolute,
        joinNodeFrontmatter(fileFrontmatter, ""),
        "utf-8"
      );

      const createdPath =
        parentPathResolved && parentPathResolved !== "."
          ? path.join(parentPathResolved, partFileName)
          : partFileName;
      const createdRel = createdPath.replace(/\\/g, "/");
      await ensureManifestStorageSlotDir(createdRel);
      await appendMenuSortOrderEntry(parentAbsolute, stripTopicPrefix(partFileName));
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

  if (req.method === "GET" && url.pathname === "/api/agents") {
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
          error: `В «${agentPath}» нет ${AREA_MANIFEST_FILE} с awn-type: ${WORKSPACE_AWN_TYPE}`
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
          error: `В «${agentPath}» нет ${AREA_MANIFEST_FILE} с awn-type: ${WORKSPACE_AWN_TYPE}`
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
      const absolute = resolveAgentRootAbsolute(rawPath);
      const previewAbsolute = findAgentWorkspacePreviewAbsoluteSync(absolute);
      if (!previewAbsolute) return sendJson(res, 404, { error: "Preview not found" });
      const content = await fs.readFile(previewAbsolute);
      const ext = path.extname(previewAbsolute).toLowerCase();
      const contentType = MIME_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType, "Cache-Control": "no-cache" });
      res.end(content);
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to read workspace preview", details: String(error.message || error) });
    }
    return;
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

  if (req.method === "GET" && url.pathname === "/api/search/global") {
    const query = url.searchParams.get("q") || "";
    const scope = url.searchParams.get("scope") || "content";
    const limitRaw = Number(url.searchParams.get("limit") || 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 50;

    let agentIds = String(url.searchParams.get("agents") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (agentIds.length === 0) {
      agentIds = getAgentsPublicList()
        .filter((agent) => agent.active !== false)
        .map((agent) => agent.id);
    } else {
      agentIds = agentIds.filter((agentId) => resolveAgent(agentId));
    }

    if (agentIds.length === 0) {
      return sendJson(res, 200, { query, scope, results: [], total: 0, agents: [] });
    }

    try {
      const data = await searchGlobalAcrossAgents(query, agentIds, limit, scope);
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

  return runWithAgent(agent.id, () => handleApiForAgent(req, res, url));
}

function createAppServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");

    if (url.pathname.startsWith("/api/")) {
      return handleApi(req, res, url);
    }

    return serveStatic(url.pathname, res);
  });
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

async function startServer(options = {}) {
  if (httpServer) {
    await stopServer();
  }

  initProjectRoot(options.root || __dirname, {
    appRoot: options.appRoot || __dirname
  });

  const host = options.host ?? process.env.HOST ?? undefined;
  const port = Number(options.port ?? process.env.PORT ?? 3000);
  const tryNextPort = Boolean(options.tryNextPort);

  httpServer = createAppServer();
  const boundPort = await listenServer(httpServer, { host, port, tryNextPort });
  const hostname = host || "localhost";
  const url = `http://${hostname}:${boundPort}`;

  return {
    port: boundPort,
    host: hostname,
    url,
    stop: stopServer
  };
}

async function stopServer() {
  if (!httpServer) return;

  await new Promise((resolve, reject) => {
    httpServer.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });
  httpServer = null;
}

if (require.main === module) {
  startServer({ root: __dirname, tryNextPort: false })
    .then((info) => {
      console.log(`Agent CMS running at ${info.url}`);
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
