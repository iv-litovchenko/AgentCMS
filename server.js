const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const agentRegistry = require("./agent-registry");
const apiDocs = require("./api-docs");
const mcpDocs = require("./mcp-docs");
const {
  AREA_MANIFEST_FILE,
  LEGACY_AREA_MANIFEST_FILE,
  AREA_MANIFEST_CANDIDATES,
  MANIFEST_MD_RE,
  isAreaManifestFileName,
  isTopicManifestFileName,
  isAreaManifestRelPath,
  isManifestMdAbsolute,
  joinAreaManifestRel,
  toTopicFileName,
  manifestRelToXSidecar,
  legacyManifestRelToNodeSidecar,
  parsePartFolderManifestRel,
  partFolderSidecarRel,
  partFolderLegacySidecarRel,
  resolvePartFolderSidecarBaseRel,
  resolveParentDirectoryFromManifestPath,
  inferManifestRelFromSidecar,
  topicManifestCandidates,
  getNamedStorageBundleRel,
  getNamedStorageBundleDirRel,
  getLegacyLowercaseBundleRel,
  resolveManifestRelFromStorageBundlePath,
  BUNDLE_CONTENT_FILE,
  BUNDLE_TABULAR_FILE,
  BUNDLE_CONFIG_FILE,
  BUNDLE_TODO_FILE,
  PREVIEW_FILE_BASENAME,
  PREVIEW_FILE_NAMES
} = require("./manifest-paths");

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
  return path.join(getPublicDir(), "_storage", "images");
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
      url: `/_storage/images/${encodeURI(name)}`
    }));
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
  readAgentManifestSync,
  resolveAgentRootAbsolute,
  enrichAgentEntry,
  findAgentWorkspacePreviewAbsoluteSync,
  getOrCreateAgentWorkspacePreviewAbsoluteSync,
  clearAgentWorkspacePreviewImagesSync,
  updateAgentManifestFields,
  assertSafeAgentPath,
  refreshAgentsFromDisk,
  runWithAgent,
  getAgentVaultFolder,
  getAgentServiceFolder,
  createSystemCatalogNodeSync,
  migrateServiceCatalogLegacySync,
  migrateWorkspaceReservedFoldersSync,
  findCatalogScaffold,
  SYSTEM_REFERENCE_SCAFFOLDS
} = agentRegistry;

const SYSTEM_FILE_NAMES = [
  "AGENTS.md",
  "README.md",
  "TODO.md",
  "docker-compose.yml",
  ".env",
  ".gitignore",
  "awn.dependencies.json",
  "awn.registry.json"
];

function isAllowedSystemFileName(name) {
  return SYSTEM_FILE_NAMES.includes(String(name || ""));
}

function resolveSystemFileAbsolute(name) {
  if (!isAllowedSystemFileName(name)) return null;
  const agentRoot = getAgentRoot();
  const absolute = path.join(agentRoot, name);
  if (!absolute.startsWith(agentRoot)) return null;
  return absolute;
}

async function getSystemFileMeta(name) {
  const absolute = resolveSystemFileAbsolute(name);
  if (!absolute) return { name, exists: false, empty: true };

  const exists = await fileExists(absolute);
  if (!exists) return { name, exists: false, empty: true };

  try {
    const content = await fs.readFile(absolute, "utf-8");
    return { name, exists: true, empty: content.trim().length === 0 };
  } catch {
    return { name, exists: false, empty: true };
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

function toNodeFileName(rawName) {
  return toTopicFileName(rawName);
}

function toFolderName(rawName) {
  const cleaned = String(rawName || "")
    .trim()
    .replace(/[\/\\]/g, "")
    .replace(/\s+/g, " ");
  if (!cleaned) return null;
  return cleaned;
}

function toPartFolderManifestSidecarRel(relNodePath, nodeExt) {
  return (
    partFolderLegacySidecarRel(relNodePath, nodeExt) ||
    partFolderSidecarRel(relNodePath, nodeExt)
  );
}

async function removePartFolderLegacySidecarRel(relNodePath, legacyExt) {
  const legacyRel = toPartFolderManifestSidecarRel(relNodePath, legacyExt);
  if (!legacyRel) return;
  await removeIfExists(normalizeWorkspacePath(legacyRel));
}

async function migratePartLegacySidecarFile(relNodePath, canonicalRelFn, legacyExt) {
  const legacyRel = toPartFolderManifestSidecarRel(relNodePath, legacyExt);
  if (!legacyRel) return;
  const canonicalRel = canonicalRelFn(relNodePath);
  const canonicalAbsolute = normalizeWorkspacePath(canonicalRel);
  const legacyAbsolute = normalizeWorkspacePath(legacyRel);
  if (!canonicalAbsolute || !legacyAbsolute || canonicalAbsolute === legacyAbsolute) return;

  let canonicalExists = false;
  try {
    await fs.access(canonicalAbsolute);
    canonicalExists = true;
  } catch {
    // canonical missing
  }
  if (canonicalExists) {
    await removeIfExists(legacyAbsolute);
    return;
  }

  try {
    const content = await fs.readFile(legacyAbsolute, "utf-8");
    await fs.mkdir(path.dirname(canonicalAbsolute), { recursive: true });
    await fs.writeFile(canonicalAbsolute, content, "utf-8");
    await removeIfExists(legacyAbsolute);
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }
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
  if (partBase) return `${partBase}.config.yml`;
  return namedStorageBundleRel(relNodePath, BUNDLE_CONFIG_FILE);
}

function toLegacyNodeConfigFilePath(relNodePath) {
  const partBase = resolvePartFolderSidecarBaseRel(relNodePath);
  if (partBase) return `${partBase}.config.yaml`;
  return legacyManifestRelToNodeSidecar(relNodePath, ".config.yaml");
}

async function readNodeConfigFile(relNodePath) {
  const configRelPath = toNodeConfigFilePath(relNodePath);
  const configAbsolute = normalizeWorkspacePath(configRelPath);
  if (!configAbsolute) {
    return { path: configRelPath, content: "", exists: false, migratedFrom: null };
  }

  try {
    const content = await fs.readFile(configAbsolute, "utf-8");
    return { path: configRelPath, content, exists: true, migratedFrom: null };
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }

  const legacyRelPaths = [
    ...getLegacyManifestSidecarRelPaths(relNodePath, ".config.yml", ".config.yml"),
    ...getLegacyManifestSidecarRelPaths(relNodePath, ".config.yaml", ".config.yaml"),
    toLegacyNodeConfigFilePath(relNodePath),
    toConfigurationFilePath(relNodePath),
    getLegacyLowercaseBundleRel(relNodePath, BUNDLE_CONFIG_FILE)
  ];
  await migrateLegacySidecarFileToBundle(relNodePath, BUNDLE_CONFIG_FILE, legacyRelPaths);

  try {
    const content = await fs.readFile(configAbsolute, "utf-8");
    return { path: configRelPath, content, exists: true, migratedFrom: null };
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }

  return { path: configRelPath, content: "", exists: false, migratedFrom: null };
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

function getLegacyManifestSidecarRelPaths(relNodePath, xSuffix, nodeSuffix) {
  if (resolvePartFolderSidecarBaseRel(relNodePath)) return [];
  const paths = [];
  if (xSuffix) paths.push(manifestRelToXSidecar(relNodePath, xSuffix));
  if (nodeSuffix) paths.push(legacyManifestRelToNodeSidecar(relNodePath, nodeSuffix));
  return paths;
}

async function migrateLegacySidecarFileToBundle(relNodePath, bundleFileName, legacyRelPaths) {
  const canonicalRel = namedStorageBundleRel(relNodePath, bundleFileName);
  const canonicalAbsolute = normalizeWorkspacePath(canonicalRel);
  if (!canonicalAbsolute) return canonicalRel;

  try {
    await fs.access(canonicalAbsolute);
    return canonicalRel;
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }

  const manifestAbsolute = normalizeWorkspacePath(relNodePath);

  for (const legacyRel of legacyRelPaths) {
    const legacyAbsolute = normalizeWorkspacePath(legacyRel);
    if (!legacyAbsolute || legacyAbsolute === canonicalAbsolute) continue;
    if (manifestAbsolute && legacyAbsolute === manifestAbsolute) continue;
    try {
      const content = await fs.readFile(legacyAbsolute);
      await fs.mkdir(path.dirname(canonicalAbsolute), { recursive: true });
      await fs.writeFile(canonicalAbsolute, content);
      await removeIfExists(legacyAbsolute);
      return canonicalRel;
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
    }
  }

  return canonicalRel;
}

function toLegacyTodoFilePath(relNodePath) {
  return path.join(getNodeStorageRootRel(relNodePath), "TODO.md").replace(/\\/g, "/");
}

function toLegacyFlatTodoFilePath(relNodePath) {
  const normalized = String(relNodePath).replace(/\\/g, "/");
  const dir = path.dirname(normalized);
  if (!dir || dir === ".") return "TODO.md";
  return path.join(dir, "TODO.md").replace(/\\/g, "/");
}

function getTodoLegacyAbsoluteCandidates(relNodePath) {
  const seen = new Set();
  const candidates = [];
  for (const relPath of [toLegacyTodoFilePath(relNodePath), toLegacyFlatTodoFilePath(relNodePath)]) {
    const absolute = normalizeWorkspacePath(relPath);
    if (!absolute || seen.has(absolute)) continue;
    seen.add(absolute);
    candidates.push(absolute);
  }
  const nodeAbsolute = normalizeWorkspacePath(relNodePath);
  if (nodeAbsolute) {
    const storageAbsolute = path.join(getNodeStorageRootAbsolute(nodeAbsolute), "TODO.md");
    if (storageAbsolute.startsWith(getAgentRoot()) && !seen.has(storageAbsolute)) {
      seen.add(storageAbsolute);
      candidates.push(storageAbsolute);
    }
  }
  return candidates;
}

async function migrateTodoLegacyToCanonical(relNodePath, content) {
  const todoRelPath = toTodoFilePath(relNodePath);
  const todoAbsolute = normalizeWorkspacePath(todoRelPath);
  if (!todoAbsolute) return todoRelPath;

  await fs.mkdir(path.dirname(todoAbsolute), { recursive: true });
  await fs.writeFile(todoAbsolute, content, "utf-8");

  for (const legacyAbsolute of getTodoLegacyAbsoluteCandidates(relNodePath)) {
    if (legacyAbsolute !== todoAbsolute) {
      await removeIfExists(legacyAbsolute);
    }
  }

  return todoRelPath;
}

function getYamlScalar(frontmatter, key) {
  const text = String(frontmatter || "");
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  if (!match) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
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
  const memoryRelPath = toContentFilePath(relPath);
  const memoryAbsolute = normalizeWorkspacePath(memoryRelPath);
  const partLegacyAbsolute = normalizeWorkspacePath(
    toPartFolderManifestSidecarRel(relPath, ".node.content.md") || ""
  );
  if (!memoryAbsolute) return { path: memoryRelPath, content: "", exists: false };

  try {
    const content = await fs.readFile(memoryAbsolute, "utf-8");
    if (partLegacyAbsolute && partLegacyAbsolute !== memoryAbsolute) {
      await removeIfExists(partLegacyAbsolute);
    }
    return { path: memoryRelPath, content, exists: true };
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
    const legacyRelPaths = [
      ...getLegacyManifestSidecarRelPaths(relPath, ".content.md", ".content.md"),
      toLegacyFlatContentFilePath(relPath),
      toLegacyContentFilePath(relPath)
    ];
    const contentLegacyRelPaths = [
      ...legacyRelPaths,
      getLegacyLowercaseBundleRel(relPath, BUNDLE_CONTENT_FILE)
    ];
    await migrateLegacySidecarFileToBundle(relPath, BUNDLE_CONTENT_FILE, contentLegacyRelPaths);
    try {
      const content = await fs.readFile(memoryAbsolute, "utf-8");
      return { path: memoryRelPath, content, exists: true };
    } catch (readError) {
      if (!readError || readError.code !== "ENOENT") throw readError;
    }
    if (partLegacyAbsolute) {
      try {
        const legacyContent = await fs.readFile(partLegacyAbsolute, "utf-8");
        await migratePartLegacySidecarFile(relPath, toContentFilePath, ".node.content.md");
        return { path: memoryRelPath, content: legacyContent, exists: true };
      } catch {
        // try next legacy path
      }
    }
    return { path: memoryRelPath, content: "", exists: false };
  }
}

async function readTodoContent(relPath) {
  const todoRelPath = toTodoFilePath(relPath);
  const todoAbsolute = normalizeWorkspacePath(todoRelPath);
  if (!todoAbsolute) return { path: todoRelPath, content: "", exists: false };

  try {
    const content = await fs.readFile(todoAbsolute, "utf-8");
    return { path: todoRelPath, content, exists: true };
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
    await migrateLegacySidecarFileToBundle(
      relPath,
      BUNDLE_TODO_FILE,
      [
        ...getLegacyManifestSidecarRelPaths(relPath, ".todo.md", ".todo.md"),
        getLegacyLowercaseBundleRel(relPath, BUNDLE_TODO_FILE)
      ]
    );
    try {
      const content = await fs.readFile(todoAbsolute, "utf-8");
      return { path: todoRelPath, content, exists: true };
    } catch (retryError) {
      if (!retryError || retryError.code !== "ENOENT") throw retryError;
    }
    for (const legacyAbsolute of getTodoLegacyAbsoluteCandidates(relPath)) {
      try {
        const legacyContent = await fs.readFile(legacyAbsolute, "utf-8");
        const migratedPath = await migrateTodoLegacyToCanonical(relPath, legacyContent);
        return { path: migratedPath, content: legacyContent, exists: true };
      } catch (legacyError) {
        if (!legacyError || legacyError.code !== "ENOENT") throw legacyError;
      }
    }
    const partLegacyAbsolute = normalizeWorkspacePath(
      toPartFolderManifestSidecarRel(relPath, ".node.todo.md") || ""
    );
    if (partLegacyAbsolute && partLegacyAbsolute !== todoAbsolute) {
      try {
        const legacyContent = await fs.readFile(partLegacyAbsolute, "utf-8");
        const migratedPath = await migrateTodoLegacyToCanonical(relPath, legacyContent);
        await removeIfExists(partLegacyAbsolute);
        return { path: migratedPath, content: legacyContent, exists: true };
      } catch (legacyError) {
        if (!legacyError || legacyError.code !== "ENOENT") throw legacyError;
      }
    }
    return { path: todoRelPath, content: "", exists: false };
  }
}

async function readTabularMemoryContent(relPath) {
  const tabularRelPath = toTabularFilePath(relPath);
  const tabularAbsolute = normalizeWorkspacePath(tabularRelPath);
  if (!tabularAbsolute) return { path: tabularRelPath, content: "", exists: false, columns: [], rows: [] };

  try {
    const content = await fs.readFile(tabularAbsolute, "utf-8");
    const partLegacyAbsolute = normalizeWorkspacePath(
      toPartFolderManifestSidecarRel(relPath, ".node.content.csv") || ""
    );
    if (partLegacyAbsolute && partLegacyAbsolute !== tabularAbsolute) {
      await removeIfExists(partLegacyAbsolute);
    }
    const parsed = parseCsvText(content);
    return {
      path: tabularRelPath,
      content,
      exists: true,
      columns: parsed.columns,
      rows: parsed.rows,
      rowCount: parsed.rows.length
    };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      await migrateLegacySidecarFileToBundle(
        relPath,
        BUNDLE_TABULAR_FILE,
        [
          ...getLegacyManifestSidecarRelPaths(relPath, ".content.csv", ".content.csv"),
          getLegacyLowercaseBundleRel(relPath, BUNDLE_TABULAR_FILE)
        ]
      );
      try {
        const content = await fs.readFile(tabularAbsolute, "utf-8");
        const parsed = parseCsvText(content);
        return {
          path: tabularRelPath,
          content,
          exists: true,
          columns: parsed.columns,
          rows: parsed.rows,
          rowCount: parsed.rows.length
        };
      } catch (retryError) {
        if (!retryError || retryError.code !== "ENOENT") throw retryError;
      }
      const partLegacyAbsolute = normalizeWorkspacePath(
        toPartFolderManifestSidecarRel(relPath, ".node.content.csv") || ""
      );
      if (partLegacyAbsolute) {
        try {
          const legacyContent = await fs.readFile(partLegacyAbsolute, "utf-8");
          await migratePartLegacySidecarFile(relPath, toTabularFilePath, ".node.content.csv");
          const parsed = parseCsvText(legacyContent);
          return {
            path: tabularRelPath,
            content: legacyContent,
            exists: true,
            columns: parsed.columns,
            rows: parsed.rows,
            rowCount: parsed.rows.length
          };
        } catch (legacyError) {
          if (!legacyError || legacyError.code !== "ENOENT") throw legacyError;
        }
      }
      return { path: tabularRelPath, content: "", exists: false, columns: [], rows: [], rowCount: 0 };
    }
    throw error;
  }
}

async function buildMemorySummary(relPath) {
  const nodeAbsolute = normalizeWorkspacePath(relPath);
  if (!nodeAbsolute || !isManifestMdAbsolute(nodeAbsolute)) {
    return null;
  }

  const internal = await readInternalMemoryContent(relPath);
  const internalSummary = {
    exists: internal.exists,
    path: internal.path,
    charCount: internal.content.length,
    excerpt: excerptText(internal.content)
  };

  const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, "_Content");
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

  const tabular = await readTabularMemoryContent(relPath);
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

function toPropsFilePath(relNodePath) {
  const parsed = parsePartFolderManifestRel(relNodePath);
  if (parsed) return `${parsed.dir}/${parsed.partName}.props.yaml`;
  return String(relNodePath).replace(/\.node\.md$/i, ".props.yaml");
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

function getLegacyPropsAbsoluteCandidates(nodeRelPath) {
  return [toPropsFilePath, toLegacyFlatPropsFilePath]
    .map((fn) => normalizeWorkspacePath(fn(nodeRelPath)))
    .filter(Boolean);
}

async function readLegacyPropsContent(nodeRelPath) {
  for (const propsAbsolute of getLegacyPropsAbsoluteCandidates(nodeRelPath)) {
    try {
      const content = await fs.readFile(propsAbsolute, "utf-8");
      return { content, path: path.relative(getAgentRoot(), propsAbsolute).replace(/\\/g, "/") };
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
    }
  }
  return null;
}

async function readNodeFrontmatterContent(nodeRelPath) {
  const nodeAbsolute = normalizeWorkspacePath(nodeRelPath);
  if (!nodeAbsolute) return { frontmatter: "", body: "", source: null, legacyPath: null };

  const raw = await readNodeManifestRaw(nodeAbsolute);
  if (raw !== null) {
    const { frontmatter, body } = splitNodeFrontmatter(raw);
    if (frontmatter.trim()) {
      return { frontmatter, body, source: "frontmatter", legacyPath: null };
    }
    if (body.trim()) {
      const legacy = await readLegacyPropsContent(nodeRelPath);
      if (legacy) {
        return {
          frontmatter: legacy.content,
          body,
          source: "legacy-props",
          legacyPath: legacy.path
        };
      }
      return { frontmatter: "", body, source: null, legacyPath: null };
    }
  }

  const legacy = await readLegacyPropsContent(nodeRelPath);
  if (legacy) {
    return {
      frontmatter: legacy.content,
      body: raw ?? "",
      source: "legacy-props",
      legacyPath: legacy.path
    };
  }

  return { frontmatter: "", body: raw ?? "", source: null, legacyPath: null };
}

async function removeLegacyPropsFiles(nodeRelPath) {
  for (const propsAbsolute of getLegacyPropsAbsoluteCandidates(nodeRelPath)) {
    await removeIfExists(propsAbsolute);
  }
}

function extractColorFromPropsYaml(content) {
  const text = String(content || "");
  for (const key of ["accent_color", "color"]) {
    const match = text.match(new RegExp(`^${key}:\\s*["']?([^"'\\n#]+)["']?\\s*$`, "m"));
    if (match) return match[1].trim();
  }
  return null;
}

function toLegacyFlatContentFilePath(relNodePath) {
  return legacyManifestRelToNodeSidecar(relNodePath, ".content.md");
}

function toLegacyFlatPropsFilePath(relNodePath) {
  return String(relNodePath).replace(/\.node\.md$/i, ".props.yaml");
}

function toLegacyContentFilePath(relNodePath) {
  const normalized = String(relNodePath || "").replace(/\\/g, "/");
  if (MANIFEST_MD_RE.test(path.posix.basename(normalized))) {
    return manifestRelToXSidecar(normalized, ".content.md");
  }
  return normalized.replace(/\.node\.md$/i, ".content.md");
}

function toConfigurationFilePath(relNodePath) {
  return path.join(getNodeStorageRootRel(relNodePath), "Configuration.md").replace(/\\/g, "/");
}

function toEnvFilePath(relNodePath) {
  return path.join(getNodeStorageRootRel(relNodePath), ".env").replace(/\\/g, "/");
}

function toExternalMarkdownFileName(rawName) {
  const cleaned = String(rawName || "")
    .trim()
    .replace(/[\/\\]/g, "")
    .replace(/\.md$/i, "")
    .replace(/\s+/g, " ");
  if (!cleaned) return null;
  return `${cleaned}.md`;
}

function resolveObsidianSidecarAbsolute(nodeAbsolute, sidecarRelFn) {
  const rel = path.relative(getAgentRoot(), nodeAbsolute).replace(/\\/g, "/");
  return normalizeWorkspacePath(sidecarRelFn(rel));
}

function resolveObsidianTargetAbsolute(nodeAbsolute, mode) {
  const containerDir = getNodeContainerDir(nodeAbsolute);
  const storageRoot = path.join(containerDir, STORAGE_FOLDER);
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
    return path.join(storageRoot, "_Content");
  }
  if (mode === "inbox") {
    return path.join(storageRoot, "_Inbox");
  }
  if (mode === "references") {
    return path.join(storageRoot, "_Referenses");
  }
  if (mode === "media") {
    return path.join(storageRoot, "_Assets");
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
    return path.join(storageRoot, "_Scripts");
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

async function collectMediaFilesStructured(folderAbsolute, prefix = "", items = []) {
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
      await collectMediaFilesStructured(absolute, relPath, items);
      continue;
    }

    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    let size = 0;
    try {
      const stat = await fs.stat(absolute);
      size = stat.size;
    } catch {
      // keep size 0
    }

    items.push({
      path: relPath,
      name: entry.name,
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
      lines.push(`- ${item.path}`);
      files += 1;
    }
    lines.push("");
  }

  return { content: lines.join("\n").trim(), files };
}

async function getMediaFolderAbsolute(nodeAbsolute, options = {}) {
  const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, "_Assets", options);
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

async function migrateLegacyAreaManifestInDir(dirAbsolute) {
  const canonicalAbsolute = path.join(dirAbsolute, AREA_MANIFEST_FILE);
  const legacyAbsolute = path.join(dirAbsolute, LEGACY_AREA_MANIFEST_FILE);
  const hasCanonical = await nodePathExists(canonicalAbsolute);
  const hasLegacy = await nodePathExists(legacyAbsolute);
  if (!hasLegacy) return;

  if (!hasCanonical) {
    await fs.rename(legacyAbsolute, canonicalAbsolute);
    return;
  }

  try {
    const [canonicalContent, legacyContent] = await Promise.all([
      fs.readFile(canonicalAbsolute, "utf-8"),
      fs.readFile(legacyAbsolute, "utf-8")
    ]);
    if (!String(canonicalContent || "").trim() && String(legacyContent || "").trim()) {
      await fs.writeFile(canonicalAbsolute, legacyContent, "utf-8");
    }
  } catch {
    // keep canonical if merge fails
  }
  await removeIfExists(legacyAbsolute);
}

async function resolveCanonicalManifestRelPath(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const base = path.basename(normalized);
  const dirRel = path.dirname(normalized);
  const dirAbsolute =
    !dirRel || dirRel === "." ? getAgentRoot() : normalizeWorkspacePath(dirRel);
  if (!dirAbsolute) return normalized;

  if (isAreaManifestFileName(base)) {
    await migrateLegacyAreaManifestInDir(dirAbsolute);
    const existing = await resolveExistingAreaManifestBasename(dirAbsolute);
    if (!existing) return normalized;
    if (!dirRel || dirRel === ".") return existing;
    return path.join(dirRel, existing).replace(/\\/g, "/");
  }

  if (isTopicManifestFileName(base) && /\.node\.md$/i.test(base)) {
    const xRel = normalized.replace(/\.node\.md$/i, ".x.md");
    const xAbsolute = normalizeWorkspacePath(xRel);
    if (xAbsolute && (await nodePathExists(xAbsolute))) return xRel;
  }

  return normalized;
}

async function ensureWorkspaceRootIndex(dirAbsolute) {
  await fs.mkdir(dirAbsolute, { recursive: true });
  await migrateLegacyAreaManifestInDir(dirAbsolute);
  if (await resolveExistingAreaManifestBasename(dirAbsolute)) return;
  const manifestAbsolute = path.join(dirAbsolute, AREA_MANIFEST_FILE);
  if (await dirExists(manifestAbsolute)) return;
  await fs.writeFile(manifestAbsolute, "", "utf-8");
}

async function ensureServiceFolderScaffold(agentRootAbsolute) {
  const serviceFolder = getAgentServiceFolder();
  if (!serviceFolder) return null;

  const serviceAbsolute = path.join(agentRootAbsolute, serviceFolder);
  await fs.mkdir(path.join(serviceAbsolute, STORAGE_FOLDER, "_Assets"), { recursive: true });

  await migrateLegacyAreaManifestInDir(serviceAbsolute);
  const manifestBasename = await resolveExistingAreaManifestBasename(serviceAbsolute);
  if (!manifestBasename) {
    await fs.writeFile(
      path.join(serviceAbsolute, AREA_MANIFEST_FILE),
      "# Служебное\n\nОбщая медиатека и служебные ноды агента.\n",
      "utf-8"
    );
  }

  const propsAbsolute = path.join(serviceAbsolute, "_.props.yaml");
  if (!(await fileExists(propsAbsolute))) {
    await fs.writeFile(propsAbsolute, "title: Служебное\nAWN-TYPE: service\n", "utf-8");
  }

  migrateServiceCatalogLegacySync(serviceAbsolute);

  return serviceAbsolute;
}

async function ensureVaultFolderScaffold(agentRootAbsolute) {
  const vaultFolder = getAgentVaultFolder();
  if (!vaultFolder) return null;

  const vaultAbsolute = path.join(agentRootAbsolute, vaultFolder);
  await fs.mkdir(vaultAbsolute, { recursive: true });
  return vaultAbsolute;
}

async function buildAgentMenu(agentRootAbsolute) {
  await ensureWorkspaceRootIndex(agentRootAbsolute);
  await ensureVaultFolderScaffold(agentRootAbsolute);
  const menu = await listNodeMdFiles(agentRootAbsolute);
  const serviceFolder = getAgentServiceFolder();
  let serviceTree = null;

  if (serviceFolder) {
    const serviceAbsolute = await ensureServiceFolderScaffold(agentRootAbsolute);
    if (serviceAbsolute) {
      serviceTree = await listNodeMdFiles(serviceAbsolute, serviceFolder, 0);
    }
  }

  return { ...menu, serviceTree };
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
const STORAGE_FOLDER = "_Storage";
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
  const candidates = [normalized];
  const vaultFolder = getAgentVaultFolder();

  if (vaultFolder) {
    const vaultLower = vaultFolder.toLowerCase();
    const normalizedLower = normalized.toLowerCase();
    const targetsVault =
      normalized === "." ||
      normalized === "" ||
      normalizedLower === vaultLower ||
      normalizedLower.startsWith(`${vaultLower}/`);
    const needsVaultPrefix =
      normalized !== "." &&
      normalized !== "" &&
      normalizedLower !== vaultLower &&
      !normalizedLower.startsWith(`${vaultLower}/`);

    if (targetsVault || needsVaultPrefix) {
      await ensureVaultFolderScaffold(getAgentRoot());
    }
    if (needsVaultPrefix) {
      candidates.push(`${vaultFolder}/${normalized}`);
    }
  }

  for (const candidate of candidates) {
    const absolute =
      candidate === "." || candidate === "" ? getAgentRoot() : normalizeWorkspacePath(candidate);
    if (!absolute) continue;
    const stat = await fs.stat(absolute).catch(() => null);
    if (stat?.isDirectory()) {
      return candidate === "" ? "." : candidate;
    }
  }

  return normalized;
}

async function resolveNodeManifestAbsolute(dirAbsolute) {
  const existing = await resolveExistingAreaManifestBasename(dirAbsolute);
  return path.join(dirAbsolute, existing || AREA_MANIFEST_FILE);
}

async function resolveNodeManifestRelForContainer(containerRelDir) {
  const normalized = String(containerRelDir || "").replace(/\\/g, "/");
  if (!normalized || normalized === ".") return AREA_MANIFEST_FILE;
  if (isAreaManifestRelPath(normalized)) return normalized;
  return joinAreaManifestRel(normalized);
}

function isHiddenMenuEntry(name) {
  return name.startsWith(".") && !VISIBLE_DOT_MENU_ENTRIES.has(name);
}

function isStorageFolderName(name) {
  return String(name || "").toLowerCase() === STORAGE_FOLDER.toLowerCase();
}

function isPartsFolderName(name) {
  return String(name || "").toLowerCase() === PARTS_FOLDER.toLowerCase();
}

function isVaultFolderName(name) {
  const vaultFolder = getAgentVaultFolder();
  if (!vaultFolder) return false;
  return String(name || "").toLowerCase() === vaultFolder.toLowerCase();
}

function isServiceFolderName(name) {
  const serviceFolder = getAgentServiceFolder();
  if (!serviceFolder) return false;
  return String(name || "").toLowerCase() === serviceFolder.toLowerCase();
}

function stripVaultPrefixFromRelPath(relPath) {
  const vaultFolder = getAgentVaultFolder();
  if (!vaultFolder) {
    return String(relPath || "").replace(/\\/g, "/");
  }
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const prefix = `${vaultFolder}/`;
  if (normalized === vaultFolder) return "";
  if (normalized.startsWith(prefix)) return normalized.slice(prefix.length);
  return normalized;
}

function stripServicePrefixFromRelPath(relPath) {
  const serviceFolder = getAgentServiceFolder();
  if (!serviceFolder) {
    return String(relPath || "").replace(/\\/g, "/");
  }
  const normalized = String(relPath || "").replace(/\\/g, "/");
  const prefix = `${serviceFolder}/`;
  if (normalized === serviceFolder) return "";
  if (normalized.startsWith(prefix)) return normalized.slice(prefix.length);
  return normalized;
}

function stripAgentContentPrefixFromRelPath(relPath) {
  return stripVaultPrefixFromRelPath(stripServicePrefixFromRelPath(relPath));
}

function getNodeContainerDir(nodeAbsolute) {
  return path.dirname(nodeAbsolute);
}

function resolveNodeContainerAbsolute(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/").trim();
  if (!normalized) return null;
  if (MANIFEST_MD_RE.test(normalized)) {
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

function getNodeBaseName(nodeAbsoluteOrRel) {
  return path.basename(String(nodeAbsoluteOrRel)).replace(/\.node\.md$/i, "");
}

function getNodeStorageRootAbsolute(nodeAbsolute) {
  return path.join(getNodeContainerDir(nodeAbsolute), STORAGE_FOLDER);
}

function getNodeStorageRootRel(relNodePath) {
  const normalized = String(relNodePath).replace(/\\/g, "/");
  const dir = path.dirname(normalized);
  if (!dir || dir === ".") return STORAGE_FOLDER;
  return path.join(dir, STORAGE_FOLDER).replace(/\\/g, "/");
}

function resolveNodePathFromStorageRel(relPath) {
  const normalized = String(relPath || "").replace(/\\/g, "/");
  if (!/\/_Storage(?:\/|$)/i.test(normalized)) return null;
  const containerDir = normalized.replace(/\/_Storage(?:\/.*)?$/i, "");
  if (!containerDir || containerDir === "" || containerDir === ".") return AREA_MANIFEST_FILE;
  if (isAreaManifestRelPath(containerDir)) return containerDir;
  return joinAreaManifestRel(containerDir);
}

function getLegacyNamedStorageRootAbsolute(nodeAbsolute) {
  const nodeDir = getNodeContainerDir(nodeAbsolute);
  const baseName = getNodeBaseName(nodeAbsolute);
  return path.join(nodeDir, STORAGE_FOLDER, baseName);
}

async function getNodeStorageSubfolderAbsolute(nodeAbsolute, subfolderName) {
  const storageRoot = getNodeStorageRootAbsolute(nodeAbsolute);
  return resolveFolderPathCaseInsensitive(storageRoot, subfolderName);
}

function getLegacyContainerDir(nodeAbsolute) {
  return getNodeContainerDir(nodeAbsolute);
}

async function resolveLegacyNamedStorageSubfolderAbsolute(nodeAbsolute, subfolderName) {
  const namedRoot = getLegacyNamedStorageRootAbsolute(nodeAbsolute);
  return resolveFolderPathCaseInsensitive(namedRoot, subfolderName);
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

  const namedLegacyFolder = await resolveLegacyNamedStorageSubfolderAbsolute(nodeAbsolute, subfolderName);
  if (namedLegacyFolder && (await isExistingDirectory(namedLegacyFolder))) {
    return namedLegacyFolder;
  }

  const legacyFolder = await resolveFolderPathCaseInsensitive(
    getLegacyContainerDir(nodeAbsolute),
    subfolderName
  );
  if (legacyFolder && (await isExistingDirectory(legacyFolder))) {
    return legacyFolder;
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
  const legacyPath = path.join(getLegacyContainerDir(nodeAbsolute), fileName);

  if (options.create) {
    return ensureNodeStorageFileAbsolute(nodeAbsolute, fileName);
  }

  if (await fileExists(storagePath)) return storagePath;

  const namedLegacyPath = path.join(getLegacyNamedStorageRootAbsolute(nodeAbsolute), fileName);
  if (await fileExists(namedLegacyPath)) return namedLegacyPath;

  if (await fileExists(legacyPath)) return legacyPath;
  return storagePath;
}

async function getOrCreateNodeStorageSubfolderAbsolute(nodeAbsolute, subfolderName) {
  if (String(subfolderName || "").toLowerCase() === "_preview") {
    return null;
  }
  const storageRoot = getNodeStorageRootAbsolute(nodeAbsolute);
  let folderAbsolute = await resolveFolderPathCaseInsensitive(storageRoot, subfolderName);
  if (!folderAbsolute) {
    folderAbsolute = path.join(storageRoot, subfolderName);
    await fs.mkdir(folderAbsolute, { recursive: true });
  }
  if (!folderAbsolute.startsWith(getAgentRoot())) return null;
  return folderAbsolute;
}

function toExternalSectionFolderName(rawName) {
  const cleaned = String(rawName || "")
    .trim()
    .replace(/[\/\\]/g, "")
    .replace(/\s+/g, " ");
  if (!cleaned) return null;
  return cleaned;
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
  return getOrCreateNodeStorageSubfolderAbsolute(nodeAbsolute, "_Content");
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

function getPartLegacyPreviewSidecarBaseName() {
  return "_.x.preview";
}

function getNodePreviewSidecarBaseNames(nodeAbsolute) {
  const dir = getNodePreviewDirAbsolute(nodeAbsolute);
  const rel = path.relative(getAgentRoot(), String(nodeAbsolute || "")).replace(/\\/g, "/");
  const bases = [getNodePreviewSidecarBaseName(nodeAbsolute)];
  if (parsePartFolderManifestRel(rel)) {
    bases.push(getPartLegacyPreviewSidecarBaseName(), "_.node.preview");
  } else {
    const manifestDir = path.dirname(String(nodeAbsolute || ""));
    bases.push(
      path.basename(manifestRelToXSidecar(rel, ".preview")),
      path.basename(legacyManifestRelToNodeSidecar(rel, ".preview"))
    );
  }
  return { dir, bases: [...new Set(bases.filter(Boolean))] };
}

async function migrateLegacyNodePreviewToBundle(nodeAbsolute) {
  const rel = path.relative(getAgentRoot(), String(nodeAbsolute || "")).replace(/\\/g, "/");
  if (parsePartFolderManifestRel(rel)) return null;

  const bundleDir = getNodePreviewDirAbsolute(nodeAbsolute);
  if (!bundleDir || !bundleDir.startsWith(getAgentRoot())) return null;
  await fs.mkdir(bundleDir, { recursive: true });

  const canonicalBase = PREVIEW_FILE_BASENAME;
  for (const ext of NODE_PREVIEW_EXTENSIONS) {
    const canonicalAbsolute = path.join(bundleDir, `${canonicalBase}${ext}`);
    try {
      const stat = await fs.stat(canonicalAbsolute);
      if (stat.isFile()) return canonicalAbsolute;
    } catch {
      // canonical missing
    }
  }

  const manifestDir = path.dirname(String(nodeAbsolute || ""));
  const legacyDirs = [manifestDir];
  for (const previewFolderAbsolute of await listLegacyNodePreviewFoldersAbsolute(nodeAbsolute)) {
    if (!legacyDirs.includes(previewFolderAbsolute)) {
      legacyDirs.push(previewFolderAbsolute);
    }
  }

  const legacyBases = [
    path.basename(manifestRelToXSidecar(rel, ".preview")),
    path.basename(legacyManifestRelToNodeSidecar(rel, ".preview")),
    ...PREVIEW_FILE_NAMES.map((name) => path.basename(name, path.extname(name))),
    "preview"
  ];

  for (const legacyDir of legacyDirs) {
    for (const base of legacyBases) {
      for (const ext of NODE_PREVIEW_EXTENSIONS) {
        const legacyAbsolute = path.join(legacyDir, `${base}${ext}`);
        const normalizedExt = ext === ".jpeg" ? ".jpg" : ext;
        const targetAbsolute = path.join(bundleDir, `${canonicalBase}${normalizedExt}`);
        if (legacyAbsolute === targetAbsolute) continue;
        try {
          const stat = await fs.stat(legacyAbsolute);
          if (!stat.isFile()) continue;
          try {
            await fs.access(targetAbsolute);
            await removeIfExists(legacyAbsolute);
            return targetAbsolute;
          } catch {
            // target missing
          }
          const buffer = await fs.readFile(legacyAbsolute);
          await fs.writeFile(targetAbsolute, buffer);
          await removeIfExists(legacyAbsolute);
          return targetAbsolute;
        } catch {
          // try next
        }
      }
    }
  }

  await cleanupLegacyPreviewDirsForNode(nodeAbsolute);
  return null;
}

async function removeDirectoryIfEmpty(absolutePath) {
  try {
    const entries = await fs.readdir(absolutePath);
    if (entries.length === 0) await fs.rmdir(absolutePath);
  } catch {
    // directory may not exist or not be empty
  }
}

async function cleanupLegacyPreviewDirsForNode(nodeAbsolute) {
  for (const previewFolderAbsolute of await listLegacyNodePreviewFoldersAbsolute(nodeAbsolute)) {
    await clearPreviewImages(previewFolderAbsolute);
    await removeDirectoryIfEmpty(previewFolderAbsolute);
  }
}

async function findNodePreviewSidecarAbsolute(nodeAbsolute) {
  await migrateLegacyNodePreviewToBundle(nodeAbsolute);
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

async function migratePartLegacyPreviewSidecar(nodeAbsolute) {
  const rel = path.relative(getAgentRoot(), String(nodeAbsolute || "")).replace(/\\/g, "/");
  if (!parsePartFolderManifestRel(rel)) return null;

  const dir = getNodePreviewDirAbsolute(nodeAbsolute);
  const legacyBase = getPartLegacyPreviewSidecarBaseName();
  let legacyAbsolute = null;
  for (const ext of NODE_PREVIEW_EXTENSIONS) {
    const candidate = path.join(dir, `${legacyBase}${ext}`);
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) {
        legacyAbsolute = candidate;
        break;
      }
    } catch {
      // try next extension
    }
  }
  if (!legacyAbsolute) return null;

  const ext = path.extname(legacyAbsolute);
  const canonicalBase = getNodePreviewSidecarBaseName(nodeAbsolute);
  const canonicalAbsolute = path.join(dir, `${canonicalBase}${ext === ".jpeg" ? ".jpg" : ext}`);
  if (legacyAbsolute === canonicalAbsolute) return canonicalAbsolute;

  try {
    await fs.access(canonicalAbsolute);
    await removeIfExists(legacyAbsolute);
    return canonicalAbsolute;
  } catch {
    // canonical missing
  }

  const buffer = await fs.readFile(legacyAbsolute);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(canonicalAbsolute, buffer);
  await removeIfExists(legacyAbsolute);
  return canonicalAbsolute;
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
  await migratePartLegacyPreviewSidecar(nodeAbsolute);
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

async function listLegacyNodePreviewFoldersAbsolute(nodeAbsolute) {
  const folders = [];
  const storageFolder = path.join(getNodeStorageRootAbsolute(nodeAbsolute), "_Preview");
  if (storageFolder.startsWith(getAgentRoot()) && (await isExistingDirectory(storageFolder))) {
    folders.push(storageFolder);
  }

  const legacyFolder = await resolveFolderPathCaseInsensitive(
    getLegacyContainerDir(nodeAbsolute),
    "_Preview"
  );
  if (
    legacyFolder &&
    legacyFolder.startsWith(getAgentRoot()) &&
    !folders.includes(legacyFolder) &&
    (await isExistingDirectory(legacyFolder))
  ) {
    folders.push(legacyFolder);
  }

  return folders;
}

async function clearAllNodePreviewImages(nodeAbsolute) {
  await clearNodePreviewSidecarFiles(nodeAbsolute);
  await cleanupLegacyPreviewDirsForNode(nodeAbsolute);
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
    return await runWithAgent(enriched.id, async () => {
      const manifestRel =
        (await resolveExistingNodeManifestRel(getAgentRoot())) || AREA_MANIFEST_FILE;
      return getNodePreviewMeta(manifestRel);
    });
  } catch {
    return { hasPreview: false, previewUrl: null };
  }
}

async function getNodePreviewMeta(nodeRelativePath) {
  const nodeAbsolute = normalizeWorkspacePath(nodeRelativePath);
  if (!nodeAbsolute || !isManifestMdAbsolute(nodeAbsolute)) {
    return { hasPreview: false, previewUrl: null };
  }

  const imageAbsolute = await findNodePreviewImageAbsolute(nodeAbsolute);
  if (!imageAbsolute) {
    return { hasPreview: false, previewUrl: null };
  }

  const normalizedPath = String(nodeRelativePath).replace(/\\/g, "/");
  return {
    hasPreview: true,
    previewUrl: `/api/preview/image?path=${encodeURIComponent(normalizedPath)}`
  };
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

async function readNodeMenuMetaForNodeRel(nodeRelPath) {
  try {
    const { frontmatter } = await readNodeFrontmatterContent(nodeRelPath);
    return {
      color: extractColorFromPropsYaml(frontmatter),
      tags: extractTagsFromProps(frontmatter),
      category: extractCategoryFromProps(frontmatter, nodeRelPath)
    };
  } catch {
    return {
      color: null,
      tags: [],
      category: inferCategoryFromNodePath(nodeRelPath)
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

function resolveSortFolderAbsolute(folderPathRaw) {
  if (!folderPathRaw || folderPathRaw === ".") return getAgentRoot();
  return normalizeWorkspacePath(folderPathRaw);
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
      label: entry.name,
      path: relativePath,
      ...(await enrichMenuNodeItem(relativePath))
    });
  }

  for (const entry of entries) {
    if (!entry.isFile() || !isTopicManifestFileName(entry.name)) continue;
    const fullPath = path.join(partsDirAbsolute, entry.name);
    const relativePath = path.join(relativePrefix, PARTS_FOLDER, entry.name).replace(/\\/g, "/");
    files.push({
      label: entry.name.replace(MANIFEST_MD_RE, ""),
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

async function folderHasObsidianVault(dirAbsolute) {
  return existsDirectory(path.join(dirAbsolute, ".obsidian"));
}

async function readFolderWorkspaceMarkers(dirAbsolute) {
  const [hasGitSelf, hasObsidianSelf] = await Promise.all([
    folderHasGitRepo(dirAbsolute),
    folderHasObsidianVault(dirAbsolute)
  ]);
  return { hasGitSelf, hasObsidianSelf };
}

async function listNodeMdFiles(dirPath, prefix = "", depth = 0) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const folders = [];
  const files = [];
  let indexPath = null;

  const selfMarkers = await readFolderWorkspaceMarkers(dirPath);

  for (const entry of entries) {
    if (isHiddenMenuEntry(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.join(prefix, entry.name).replace(/\\/g, "/");

    if (entry.isDirectory()) {
      if (isStorageFolderName(entry.name)) continue;
      if (isVaultFolderName(entry.name)) {
        const child = await listNodeMdFiles(fullPath, relativePath, depth);
        folders.push(...child.sections);
        files.push(...child.items);
        continue;
      }
      if (isServiceFolderName(entry.name)) {
        continue;
      }
      if (isPartsFolderName(entry.name)) {
        await collectPartNodeItems(fullPath, prefix, files);
        continue;
      }

      const child = await listNodeMdFiles(fullPath, relativePath, depth + 1);
      const hasNodes = Boolean(child.indexPath || child.items.length > 0 || child.sections.length > 0);
      const markers = await readFolderWorkspaceMarkers(fullPath);

      if (hasNodes) {
        folders.push({
          title: entry.name,
          folderPath: relativePath,
          hasGit: markers.hasGitSelf,
          hasObsidian: markers.hasObsidianSelf,
          ...markers,
          ...child
        });
        continue;
      }

      if (depth <= 1) {
        folders.push({
          title: entry.name,
          folderPath: relativePath,
          empty: true,
          hasGit: markers.hasGitSelf,
          hasObsidian: markers.hasObsidianSelf,
          ...markers,
          sections: [],
          items: [],
          indexPath: null,
          menuOrder: await readMenuSortOrder(fullPath)
        });
      }
      continue;
    }

    if (entry.isFile() && isAreaManifestFileName(entry.name)) {
      continue;
    }

    if (entry.isFile() && isTopicManifestFileName(entry.name)) {
      const nodeRelPath = relativePath.replace(/\\/g, "/");
      files.push({
        label: entry.name.replace(MANIFEST_MD_RE, ""),
        path: nodeRelPath,
        ...(await enrichMenuNodeItem(nodeRelPath))
      });
    }
  }

  const areaBasename = await resolveExistingAreaManifestBasename(dirPath);
  if (areaBasename) {
    indexPath = prefix ? path.join(prefix, areaBasename).replace(/\\/g, "/") : areaBasename;
  }

  folders.sort((a, b) => a.title.localeCompare(b.title, "ru"));
  files.sort((a, b) => a.label.localeCompare(b.label, "ru"));
  const menuOrder = await readMenuSortOrder(dirPath);

  let color = null;
  let tags = [];
  let category = null;
  let hasPreview = false;
  let previewUrl = null;
  if (indexPath) {
    const indexMeta = await enrichMenuNodeItem(indexPath);
    color = indexMeta.color;
    tags = indexMeta.tags || [];
    category = indexMeta.category || null;
    hasPreview = indexMeta.hasPreview;
    previewUrl = indexMeta.previewUrl;
  }

  return {
    sections: folders,
    items: files,
    indexPath,
    menuOrder,
    color,
    tags,
    category,
    hasPreview,
    previewUrl,
    hasGit: selfMarkers.hasGitSelf,
    hasObsidian: selfMarkers.hasObsidianSelf,
    ...selfMarkers
  };
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

  const manifestCandidates = (relDir
    ? AREA_MANIFEST_CANDIDATES.map((name) => `${relDir}/${name}`)
    : AREA_MANIFEST_CANDIDATES
  );
  for (const candidate of manifestCandidates) {
    if (await nodePathExists(normalizeWorkspacePath(candidate))) {
      return candidate.replace(/\\/g, "/");
    }
  }

  try {
    const entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
    const manifestFiles = entries.filter(
      (entry) => entry.isFile() && /\.(node|x)\.md$/i.test(entry.name)
    );
    const xFile = manifestFiles.find((entry) => /\.x\.md$/i.test(entry.name));
    const nodeFile = xFile || manifestFiles[0];
    if (!nodeFile) return null;
    return relDir ? `${relDir}/${nodeFile.name}`.replace(/\\/g, "/") : nodeFile.name.replace(/\\/g, "/");
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
  return name === "_Preview" || name === ".obsidian" || name === "node_modules";
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

  const newWithFile = new RegExp(`^(.*)/_Storage/${escaped}/(.+)$`, "i");
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

  const newFolderOnly = new RegExp(`^(.*)/_Storage/${escaped}(?:/|$)`, "i");
  const newFolderMatch = normalized.match(newFolderOnly);
  if (newFolderMatch) {
    const containerDir = newFolderMatch[1];
    const nodePath = await resolveNodeManifestRelForContainer(containerDir);
    const nodeAbsolute = normalizeWorkspacePath(nodePath);
    if (!nodeAbsolute || !(await nodePathExists(nodeAbsolute))) return null;
    return { nodePath: nodePath.replace(/\\/g, "/"), mode, source };
  }

  const withFile = new RegExp(`^(.*)/_Storage/([^/]+)/${escaped}/(.+)$`, "i");
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

  const folderOnly = new RegExp(`^(.*)/_Storage/([^/]+)/${escaped}(?:/|$)`, "i");
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
      nodePath: normalized.replace(/\.x\.todo\.md$/i, ".x.md"),
      mode: "todo",
      source: "TODO",
      canonicalPath: normalized
    };
  }

  if (/\.node\.todo\.md$/i.test(normalized)) {
    return {
      nodePath: normalized.replace(/\.node\.todo\.md$/i, ".x.md"),
      mode: "todo",
      source: "TODO",
      canonicalPath: normalized
    };
  }

  if (/\.x\.content\.md$/i.test(normalized)) {
    return {
      nodePath: normalized.replace(/\.x\.content\.md$/i, ".x.md"),
      mode: "internal",
      source: "Однофайловая"
    };
  }

  if (/\.node\.content\.md$/i.test(normalized)) {
    return {
      nodePath: normalized.replace(/\.node\.content\.md$/i, ".x.md"),
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

  if (/\.props\.yaml$/i.test(normalized)) {
    const manifestRel = inferManifestRelFromSidecar(normalized);
    if (manifestRel) {
      return { nodePath: manifestRel, mode: "description", source: "YAML-свойства" };
    }
  }

  if (/\.x\.config\.ya?ml$/i.test(normalized)) {
    return {
      nodePath: normalized.replace(/\.x\.config\.ya?ml$/i, ".x.md"),
      mode: "configs",
      source: "Конфигурации"
    };
  }

  if (/\.node\.config\.ya?ml$/i.test(normalized)) {
    return {
      nodePath: normalized.replace(/\.node\.config\.ya?ml$/i, ".x.md"),
      mode: "configs",
      source: "Конфигурации"
    };
  }

  if (base === "Configuration.md" && dirAbsolute) {
    const nodePath = await findNodePathInDirectory(dirAbsolute);
    if (!nodePath) return null;
    return { nodePath, mode: "configs", source: "Конфигурации" };
  }

  if (base === ".env" && dirAbsolute) {
    const nodePath = await findNodePathInDirectory(dirAbsolute);
    if (!nodePath) return null;
    return { nodePath, mode: "env", source: ".env" };
  }

  if (base === "TODO.md" && dirAbsolute) {
    const nodePath = await findNodePathInDirectory(dirAbsolute);
    if (!nodePath) return null;
    return { nodePath, mode: "todo", source: "TODO", canonicalPath: toTodoFilePath(nodePath) };
  }

  const storageExternal = await classifyStoragePathResult(normalized, "_Content", "external", "Многофайловая");
  if (storageExternal) return storageExternal;

  const storageScripts = await classifyStoragePathResult(normalized, "_Scripts", "scripts", "Скрипты");
  if (storageScripts) return storageScripts;

  const storageInbox = await classifyStoragePathResult(normalized, "_Inbox", "inbox", "Входящие");
  if (storageInbox) return storageInbox;

  const storageMedia = await classifyStoragePathResult(normalized, "_Assets", "media", "Медиа");
  if (storageMedia) return storageMedia;

  const storageReferences = await classifyStoragePathResult(
    normalized,
    "_Referenses",
    "references",
    "Источники"
  );
  if (storageReferences) return storageReferences;

  const contentMatch = normalized.match(/^(.*)\/_Content\/(.+)$/i);
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

  const scriptsMatch = normalized.match(/^(.*)\/_Scripts\//i);
  if (scriptsMatch) {
    const nodePath = await findNodePathInDirectory(normalizeWorkspacePath(scriptsMatch[1]));
    if (!nodePath) return null;
    return { nodePath, mode: "scripts", source: "Скрипты" };
  }

  const inboxMatch = normalized.match(/^(.*)\/_Inbox\//i);
  if (inboxMatch) {
    const nodePath = await findNodePathInDirectory(normalizeWorkspacePath(inboxMatch[1]));
    if (!nodePath) return null;
    return { nodePath, mode: "inbox", source: "Входящие" };
  }

  const mediaMatch = normalized.match(/^(.*)\/_Assets\//i);
  if (mediaMatch) {
    const nodePath = await findNodePathInDirectory(normalizeWorkspacePath(mediaMatch[1]));
    if (!nodePath) return null;
    return { nodePath, mode: "media", source: "Медиа" };
  }

  const referencesMatch = normalized.match(/^(.*)\/_Referenses\//i);
  if (referencesMatch) {
    const nodePath = await findNodePathInDirectory(normalizeWorkspacePath(referencesMatch[1]));
    if (!nodePath) return null;
    return { nodePath, mode: "references", source: "Источники" };
  }

  return null;
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
  const displayName = base
    .replace(/\.node\.md$/i, "")
    .replace(/\.props\.yaml$/i, "")
    .replace(/\.(md|yaml|yml|json|txt)$/i, "");
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

  if (req.method === "POST" && url.pathname === "/api/menu/sort") {
    try {
      const payload = await readJsonBody(req);
      const folderPathRaw = typeof payload.folderPath === "string" ? payload.folderPath : ".";
      const order = Array.isArray(payload.order)
        ? payload.order.map((name) => String(name || "").trim()).filter(Boolean)
        : [];

      const folderAbsolute = resolveSortFolderAbsolute(folderPathRaw);
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

    const absolute = resolveSystemFileAbsolute(name);
    if (!absolute) return sendJson(res, 400, { error: "Invalid system file name" });

    try {
      const content = await fs.readFile(absolute, "utf-8");
      return sendJson(res, 200, { name, content, exists: true });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        return sendJson(res, 200, { name, content: "", exists: false });
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

      const absolute = resolveSystemFileAbsolute(name);
      if (!absolute) return sendJson(res, 400, { error: "Invalid system file name" });

      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, content, "utf-8");
      return sendJson(res, 200, { name, content, exists: true });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save system file", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const canonicalRelPath = await resolveCanonicalManifestRelPath(relPath);
    const absolute = normalizeWorkspacePath(canonicalRelPath);
    if (!absolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(absolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

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

      const absolute = normalizeWorkspacePath(relPath);
      if (!absolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(absolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      const normalized = path.normalize(relPath);
      let nextRelPath = normalized;
      let nextAbsolute = absolute;

      if (isAreaManifestRelPath(normalized) && !parsePartFolderManifestRel(normalized)) {
        const folderRelPath = path.dirname(normalized);
        if (!folderRelPath || folderRelPath === ".") {
          return sendJson(res, 400, { error: "Root Workspaces folder cannot be renamed" });
        }
        const parentRelPath = path.dirname(folderRelPath);
        const parentAbsolutePath =
          parentRelPath && parentRelPath !== "." ? normalizeWorkspacePath(parentRelPath) : getAgentRoot();
        if (!parentAbsolutePath) return sendJson(res, 400, { error: "Invalid parent folder path" });

        const targetFolderName = String(title).trim().replace(/[\/\\]/g, "");
        if (!targetFolderName) return sendJson(res, 400, { error: "Folder name cannot be empty" });
        const targetFolderAbsolute = path.join(parentAbsolutePath, targetFolderName);

        try {
          await fs.access(targetFolderAbsolute);
          return sendJson(res, 409, { error: "Folder with this name already exists" });
        } catch {
          // Target does not exist, continue.
        }

        const currentFolderAbsolute = path.dirname(absolute);
        await fs.rename(currentFolderAbsolute, targetFolderAbsolute);

        const targetFolderRelPath =
          parentRelPath && parentRelPath !== "." ? path.join(parentRelPath, targetFolderName) : targetFolderName;
        nextRelPath = path.join(targetFolderRelPath, AREA_MANIFEST_FILE);
        nextAbsolute = path.join(targetFolderAbsolute, AREA_MANIFEST_FILE);
      } else if (!parsePartFolderManifestRel(normalized)) {
        const dirRelPath = path.dirname(normalized);
        const dirAbsolute = dirRelPath && dirRelPath !== "." ? normalizeWorkspacePath(dirRelPath) : getAgentRoot();
        if (!dirAbsolute) return sendJson(res, 400, { error: "Invalid file directory path" });

        const nextName = toNodeFileName(title);
        if (!nextName) return sendJson(res, 400, { error: "Invalid file name" });
        const targetAbsolute = path.join(dirAbsolute, nextName);
        const targetRelPath = dirRelPath && dirRelPath !== "." ? path.join(dirRelPath, nextName) : nextName;

        if (targetAbsolute !== absolute) {
          try {
            await fs.access(targetAbsolute);
            return sendJson(res, 409, { error: "File with this name already exists" });
          } catch {
            // Target does not exist, continue.
          }
          const oldContentAbsolute = normalizeWorkspacePath(toContentFilePath(normalized));
          const newContentAbsolute = normalizeWorkspacePath(toContentFilePath(targetRelPath));
          const oldLegacyContentAbsolute = normalizeWorkspacePath(toLegacyFlatContentFilePath(normalized));
          const newLegacyContentAbsolute = normalizeWorkspacePath(toLegacyFlatContentFilePath(targetRelPath));
          const oldPropsAbsolute = normalizeWorkspacePath(toPropsFilePath(normalized));
          const newPropsAbsolute = normalizeWorkspacePath(toPropsFilePath(targetRelPath));
          const oldLegacyPropsAbsolute = normalizeWorkspacePath(toLegacyFlatPropsFilePath(normalized));
          const newLegacyPropsAbsolute = normalizeWorkspacePath(toLegacyFlatPropsFilePath(targetRelPath));
          const oldTodoAbsolute = normalizeWorkspacePath(toTodoFilePath(normalized));
          const newTodoAbsolute = normalizeWorkspacePath(toTodoFilePath(targetRelPath));
          const oldConfigAbsolute = normalizeWorkspacePath(toNodeConfigFilePath(normalized));
          const newConfigAbsolute = normalizeWorkspacePath(toNodeConfigFilePath(targetRelPath));
          await fs.rename(absolute, targetAbsolute);
          if (oldContentAbsolute && newContentAbsolute) {
            await renameIfExists(oldContentAbsolute, newContentAbsolute);
          }
          if (oldLegacyContentAbsolute && newLegacyContentAbsolute) {
            await renameIfExists(oldLegacyContentAbsolute, newLegacyContentAbsolute);
          }
          if (oldPropsAbsolute && newPropsAbsolute) {
            await renameIfExists(oldPropsAbsolute, newPropsAbsolute);
          }
          if (oldLegacyPropsAbsolute && newLegacyPropsAbsolute) {
            await renameIfExists(oldLegacyPropsAbsolute, newLegacyPropsAbsolute);
          }
          if (oldTodoAbsolute && newTodoAbsolute) {
            await renameIfExists(oldTodoAbsolute, newTodoAbsolute);
          }
          if (oldConfigAbsolute && newConfigAbsolute) {
            await renameIfExists(oldConfigAbsolute, newConfigAbsolute);
          }
          const oldNamedStorageAbsolute = getLegacyNamedStorageRootAbsolute(absolute);
          const newNamedStorageAbsolute = getLegacyNamedStorageRootAbsolute(targetAbsolute);
          if (oldNamedStorageAbsolute !== newNamedStorageAbsolute) {
            await renameIfExists(oldNamedStorageAbsolute, newNamedStorageAbsolute);
          }
          nextRelPath = targetRelPath;
          nextAbsolute = targetAbsolute;
        }
      }

      const content = await fs.readFile(nextAbsolute, "utf-8");

      return sendJson(res, 200, { path: nextRelPath, title, content });
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
      if (!isManifestMdAbsolute(absolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      await fs.mkdir(path.dirname(absolute), { recursive: true });
      await fs.writeFile(absolute, content, "utf-8");
      if (canonicalRelPath !== String(relPath).replace(/\\/g, "/")) {
        const legacyAbsolute = normalizeWorkspacePath(relPath);
        if (legacyAbsolute && legacyAbsolute !== absolute) {
          await removeIfExists(legacyAbsolute);
        }
      }
      return sendJson(res, 200, { path: canonicalRelPath, content });
    } catch (error) {
      return sendJson(res, 500, {
        error: "Failed to save content",
        details: String(error && error.message ? error.message : error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/memory/summary") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

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

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

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

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      const tabularRelPath = toTabularFilePath(relPath);
      const tabularAbsolute = normalizeWorkspacePath(tabularRelPath);
      if (!tabularAbsolute) return sendJson(res, 400, { error: "Invalid tabular memory path" });

      await fs.mkdir(path.dirname(tabularAbsolute), { recursive: true });
      await fs.writeFile(tabularAbsolute, content, "utf-8");
      await removePartFolderLegacySidecarRel(relPath, ".node.content.csv");
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

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

    const memoryRelPath = toContentFilePath(relPath);
    const memoryAbsolute = normalizeWorkspacePath(memoryRelPath);
    const legacyRelPath = toLegacyFlatContentFilePath(relPath);
    const legacyAbsolute = normalizeWorkspacePath(legacyRelPath);
    const legacyAltRelPath = toLegacyContentFilePath(relPath);
    const legacyAltAbsolute = normalizeWorkspacePath(legacyAltRelPath);
    const partLegacyAbsolute = normalizeWorkspacePath(
      toPartFolderManifestSidecarRel(relPath, ".node.content.md") || ""
    );
    if (!memoryAbsolute) return sendJson(res, 400, { error: "Invalid internal memory path" });

    try {
      const content = await fs.readFile(memoryAbsolute, "utf-8");
      return sendJson(res, 200, { path: memoryRelPath, content, exists: true });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        for (const candidateAbsolute of [partLegacyAbsolute, legacyAbsolute, legacyAltAbsolute]) {
          if (!candidateAbsolute) continue;
          try {
            const legacyContent = await fs.readFile(candidateAbsolute, "utf-8");
            return sendJson(res, 200, {
              path: memoryRelPath,
              content: legacyContent,
              exists: true,
              migratedFrom: path.relative(getAgentRoot(), candidateAbsolute).replace(/\\/g, "/")
            });
          } catch {
            // try next legacy path
          }
        }
        return sendJson(res, 200, { path: memoryRelPath, content: "", exists: false });
      }
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

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      const memoryRelPath = toContentFilePath(relPath);
      const memoryAbsolute = normalizeWorkspacePath(memoryRelPath);
      if (!memoryAbsolute) return sendJson(res, 400, { error: "Invalid internal memory path" });

      await fs.mkdir(path.dirname(memoryAbsolute), { recursive: true });
      await fs.writeFile(memoryAbsolute, content, "utf-8");

      await removePartFolderLegacySidecarRel(relPath, ".node.content.md");
      for (const legacyRelPath of [toLegacyFlatContentFilePath(relPath), toLegacyContentFilePath(relPath)]) {
        const legacyAbsolute = normalizeWorkspacePath(legacyRelPath);
        if (legacyAbsolute && legacyAbsolute !== memoryAbsolute) {
          await removeIfExists(legacyAbsolute);
        }
      }

      return sendJson(res, 200, { path: memoryRelPath, content });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save internal memory", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file/properties") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

    try {
      const { frontmatter, source, legacyPath } = await readNodeFrontmatterContent(relPath);
      return sendJson(res, 200, {
        path: relPath,
        content: frontmatter,
        exists: Boolean(frontmatter.trim()),
        source: source || "none",
        legacyPath: legacyPath || null
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

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      const raw = (await readNodeManifestRaw(nodeAbsolute)) ?? "";
      const { body } = splitNodeFrontmatter(raw);
      const nextContent = joinNodeFrontmatter(content, body);
      await fs.mkdir(path.dirname(nodeAbsolute), { recursive: true });
      await fs.writeFile(nodeAbsolute, nextContent, "utf-8");
      await removeLegacyPropsFiles(relPath);
      return sendJson(res, 200, { path: relPath, content, fullContent: nextContent });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save properties", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file/node-config") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

    const configRelPath = toNodeConfigFilePath(relPath);

    try {
      const configFile = await readNodeConfigFile(relPath);
      const defaultLandingMode = extractDefaultLandingModeFromNodeConfig(configFile.content);
      return sendJson(res, 200, {
        path: configFile.path || configRelPath,
        content: configFile.content,
        exists: configFile.exists,
        defaultLandingMode,
        migratedFrom: configFile.migratedFrom || null
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

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      const configRelPath = toNodeConfigFilePath(relPath);
      const configAbsolute = normalizeWorkspacePath(configRelPath);
      if (!configAbsolute) return sendJson(res, 400, { error: "Invalid node config path" });
      const legacyAbsolute = normalizeWorkspacePath(toLegacyNodeConfigFilePath(relPath));

      const trimmed = String(content).replace(/^\uFEFF/, "").trim();
      if (!trimmed) {
        await removeIfExists(configAbsolute);
        if (legacyAbsolute && legacyAbsolute !== configAbsolute) {
          await removeIfExists(legacyAbsolute);
        }
        return sendJson(res, 200, {
          path: configRelPath,
          content: "",
          exists: false,
          defaultLandingMode: null
        });
      }

      await fs.mkdir(path.dirname(configAbsolute), { recursive: true });
      await fs.writeFile(configAbsolute, content.endsWith("\n") ? content : `${content}\n`, "utf-8");
      if (legacyAbsolute && legacyAbsolute !== configAbsolute) {
        await removeIfExists(legacyAbsolute);
      }
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

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

    const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, "_Content");
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

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

    const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, "_Content");
    if (!folderAbsolute) return sendJson(res, 200, { exists: false, files: [] });
    if (!folderAbsolute.startsWith(getAgentRoot())) return sendJson(res, 400, { error: "Invalid external folder path" });

    try {
      const stat = await fs.stat(folderAbsolute);
      if (!stat.isDirectory()) return sendJson(res, 200, { exists: false, files: [] });
      const files = await collectMarkdownFiles(folderAbsolute);
      return sendJson(res, 200, { exists: true, files });
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

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

    const normalizedRelFile = normalizeRelativeFilePath(relFile);
    if (!normalizedRelFile || !normalizedRelFile.toLowerCase().endsWith(".md")) {
      return sendJson(res, 400, { error: "Only .md files are allowed" });
    }

    const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, "_Content");
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

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      const normalizedRelFile = normalizeRelativeFilePath(relFile);
      if (!normalizedRelFile || !normalizedRelFile.toLowerCase().endsWith(".md")) {
        return sendJson(res, 400, { error: "Only .md files are allowed" });
      }

      let folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, "_Content");
      if (!folderAbsolute) {
        folderAbsolute = await getOrCreateExternalFolderAbsolute(nodeAbsolute);
      }
      if (!folderAbsolute) return sendJson(res, 404, { error: "External folder not found" });

      const fileAbsolute = path.join(folderAbsolute, normalizedRelFile);
      if (!fileAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid external file path" });

      await fs.writeFile(fileAbsolute, content, "utf-8");
      return sendJson(res, 200, { file: normalizedRelFile.replace(/\\/g, "/"), content });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save external file", details: String(error.message || error) });
    }
  }

  if (req.method === "POST" && url.pathname === "/api/external/file/create") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      const title = String(payload.title || "Воспоминание").trim();
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!title) return sendJson(res, 400, { error: "Title cannot be empty" });

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      const folderAbsolute = await getOrCreateExternalFolderAbsolute(nodeAbsolute);
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid external folder path" });

      const fileName = await resolveUniqueExternalFileName(folderAbsolute, title);
      if (!fileName) return sendJson(res, 400, { error: "Invalid file name" });

      const fileAbsolute = path.join(folderAbsolute, fileName);
      const baseTitle = title.replace(/\.md$/i, "");
      const content = `---\ntitle: ${baseTitle}\ntags: []\n---\n\n# ${baseTitle}\n`;
      await fs.writeFile(fileAbsolute, content, "utf-8");

      return sendJson(res, 200, {
        file: fileName,
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
      const title = String(payload.title || payload.name || "").trim();
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });
      if (!title) return sendJson(res, 400, { error: "Title cannot be empty" });

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      const sectionName = toExternalSectionFolderName(title);
      if (!sectionName) return sendJson(res, 400, { error: "Invalid section name" });

      const folderAbsolute = await getOrCreateExternalFolderAbsolute(nodeAbsolute);
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid external folder path" });

      const sectionAbsolute = path.join(folderAbsolute, sectionName);
      if (!sectionAbsolute.startsWith(folderAbsolute)) return sendJson(res, 400, { error: "Invalid section path" });

      try {
        await fs.access(sectionAbsolute);
        return sendJson(res, 409, { error: "Section already exists" });
      } catch {
        // section does not exist
      }

      await fs.mkdir(sectionAbsolute, { recursive: false });
      return sendJson(res, 200, { section: sectionName, exists: true });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to create external section", details: String(error.message || error) });
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

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      const normalizedRelFile = normalizeRelativeFilePath(relFile);
      if (!normalizedRelFile || !normalizedRelFile.toLowerCase().endsWith(".md")) {
        return sendJson(res, 400, { error: "Only .md files are allowed" });
      }

      const folderAbsolute = await resolveNodeSubfolderAbsolute(nodeAbsolute, "_Content");
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

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

    const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute);
    if (!folderAbsolute) return sendJson(res, 200, { exists: false, files: 0, content: "", groups: {} });

    try {
      const stat = await fs.stat(folderAbsolute);
      if (!stat.isDirectory()) {
        return sendJson(res, 200, { exists: false, files: 0, content: "", groups: {} });
      }

      const items = await collectMediaFilesStructured(folderAbsolute);
      const groups = groupMediaFiles(items);
      const { content, files } = buildMediaListContent(groups);

      return sendJson(res, 200, {
        exists: true,
        files,
        content,
        groups
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

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      const buffer = Buffer.from(data, "base64");
      if (!buffer.length) return sendJson(res, 400, { error: "Empty file data" });
      if (buffer.length > 10 * 1024 * 1024) {
        return sendJson(res, 400, { error: "File is too large (max 10 MB)" });
      }

      const folderAbsolute = await getMediaFolderAbsolute(nodeAbsolute, { create: true });
      if (!folderAbsolute) return sendJson(res, 400, { error: "Invalid media folder path" });

      const imageExt = resolveMediaImageExtension(mimeType, fileName, buffer);
      let storedRelFile = null;

      if (imageExt) {
        if (!validateMediaImageBufferByExt(buffer, imageExt)) {
          return sendJson(res, 400, { error: "Invalid image file", details: "File content does not match format" });
        }
        const safeBase = sanitizeMediaFileName(fileName)?.replace(/\.[^.]+$/, "") || "pasted-image";
        const targetAbsolute = await resolveUniqueMediaFileAbsolute(folderAbsolute, `${safeBase}${imageExt}`);
        if (!targetAbsolute || !targetAbsolute.startsWith(folderAbsolute)) {
          return sendJson(res, 400, { error: "Invalid media file path" });
        }
        await fs.writeFile(targetAbsolute, buffer);
        storedRelFile = path.relative(folderAbsolute, targetAbsolute).replace(/\\/g, "/");
      } else {
        const safeName = sanitizeMediaFileName(fileName);
        if (!safeName) return sendJson(res, 400, { error: "Invalid file name" });
        const targetAbsolute = await resolveUniqueMediaFileAbsolute(folderAbsolute, safeName);
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

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

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

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

    const configRelPath = toConfigurationFilePath(relPath);
    const configAbsolute = await resolveNodeStorageFileAbsolute(nodeAbsolute, "Configuration.md");
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

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      const configRelPath = toConfigurationFilePath(relPath);
      const configAbsolute = await resolveNodeStorageFileAbsolute(nodeAbsolute, "Configuration.md", {
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

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

    const envRelPath = toEnvFilePath(relPath);
    const envAbsolute = await resolveNodeStorageFileAbsolute(nodeAbsolute, ".env");
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

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      const envRelPath = toEnvFilePath(relPath);
      const envAbsolute = await resolveNodeStorageFileAbsolute(nodeAbsolute, ".env", { create: true });
      if (!envAbsolute) return sendJson(res, 400, { error: "Invalid .env path" });

      await fs.writeFile(envAbsolute, content, "utf-8");
      return sendJson(res, 200, { path: envRelPath, content, exists: true });
    } catch (error) {
      return sendJson(res, 500, { error: "Failed to save .env", details: String(error.message || error) });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/todo") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

    try {
      const todo = await readTodoContent(relPath);
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

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      const todoRelPath = toTodoFilePath(relPath);
      const todoAbsolute = normalizeWorkspacePath(todoRelPath);
      if (!todoAbsolute) return sendJson(res, 400, { error: "Invalid TODO path" });

      await fs.mkdir(path.dirname(todoAbsolute), { recursive: true });
      await fs.writeFile(todoAbsolute, content, "utf-8");

      await removePartFolderLegacySidecarRel(relPath, ".node.todo.md");
      for (const legacyAbsolute of getTodoLegacyAbsoluteCandidates(relPath)) {
        if (legacyAbsolute !== todoAbsolute) {
          await removeIfExists(legacyAbsolute);
        }
      }

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

  if (req.method === "POST" && url.pathname === "/api/reveal") {
    try {
      const payload = await readJsonBody(req);
      const relPath = payload.path;
      if (!relPath) return sendJson(res, 400, { error: "Missing file path" });

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
      if (error?.code === "ENOENT") {
        return sendJson(res, 404, { error: "Node folder not found" });
      }
      return sendJson(res, 500, {
        error: "Failed to reveal folder",
        details: String(error.message || error)
      });
    }
  }

  if (req.method === "GET" && url.pathname === "/api/preview") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

    const imageAbsolute = await findNodePreviewImageAbsolute(nodeAbsolute);
    if (!imageAbsolute) {
      return sendJson(res, 200, { exists: false, file: null, imageUrl: null });
    }

    return sendJson(res, 200, {
      exists: true,
      file: path.basename(imageAbsolute),
      imageUrl: `/api/preview/image?path=${encodeURIComponent(relPath)}`
    });
  }

  if (req.method === "GET" && url.pathname === "/api/preview/image") {
    const relPath = url.searchParams.get("path");
    if (!relPath) return sendJson(res, 400, { error: "Missing path query parameter" });

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

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

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

      const previewExt = resolveNodePreviewExtension(mimeType, fileName);
      if (!previewExt) {
        return sendJson(res, 400, {
          error: "Invalid preview format",
          details: "Allowed formats: JPG, PNG, GIF → saved as _Storage/{ключ}/Preview.{jpg|png|gif}"
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
      await cleanupLegacyPreviewDirsForNode(nodeAbsolute);

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

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

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

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

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
      let created = false;
      try {
        content = await fs.readFile(sidecarAbsolute, "utf-8");
      } catch (error) {
        if (error && error.code === "ENOENT") {
          await fs.mkdir(path.dirname(sidecarAbsolute), { recursive: true });
          await fs.writeFile(sidecarAbsolute, "", "utf-8");
          created = true;
        } else {
          throw error;
        }
      }

      return sendJson(res, 200, {
        sourceFile: normalizedRelFile.replace(/\\/g, "/"),
        sidecar: sidecarRelPath.replace(/\\/g, "/"),
        content,
        created
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

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

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

      await fs.mkdir(path.dirname(sidecarAbsolute), { recursive: true });
      await fs.writeFile(sidecarAbsolute, content, "utf-8");

      return sendJson(res, 200, {
        sourceFile: normalizedRelFile.replace(/\\/g, "/"),
        sidecar: sidecarRelPath.replace(/\\/g, "/"),
        content
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

      const nodeAbsolute = normalizeWorkspacePath(relPath);
      if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
      if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

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

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

    const safeFolderName = String(folderName).trim();
    if (!/^_[A-Za-z0-9-]+$/.test(safeFolderName)) {
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

    const nodeAbsolute = normalizeWorkspacePath(relPath);
    if (!nodeAbsolute) return sendJson(res, 400, { error: "Invalid file path" });
    if (!isManifestMdAbsolute(nodeAbsolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

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
      if (!isManifestMdAbsolute(absolute)) return sendJson(res, 400, { error: "Only *.x.md manifest files are allowed" });

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
      const legacyContentAbsolute = normalizeWorkspacePath(toLegacyContentFilePath(normalized));
      const propsAbsolute = normalizeWorkspacePath(toPropsFilePath(normalized));

      await fs.rm(absolute, { force: false });
      if (contentAbsolute) await removeIfExists(contentAbsolute);
      if (legacyContentAbsolute) await removeIfExists(legacyContentAbsolute);
      if (propsAbsolute) await removeIfExists(propsAbsolute);
      const legacyNamedStorageAbsolute = getLegacyNamedStorageRootAbsolute(absolute);
      try {
        await fs.rm(legacyNamedStorageAbsolute, { recursive: true, force: true });
      } catch {
        // legacy named storage may not exist
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
      const parentPathResolved = await resolveExistingParentDirectoryRelPath(
        typeof payload.parentPath === "string" ? payload.parentPath : "."
      );
      const type = String(payload.type || "").trim();
      const name = String(payload.name || "").trim();

      if (type !== "folder" && type !== "file" && type !== "manifest" && type !== "catalog") {
        return sendJson(res, 400, { error: "Invalid type" });
      }

      const parentRelPath =
        parentPathResolved && parentPathResolved !== "."
          ? parentPathResolved.replace(/\\/g, "/")
          : "";
      const serviceFolder = getAgentServiceFolder();

      if (type === "catalog") {
        if (!serviceFolder) {
          return sendJson(res, 400, { error: "Service folder is not configured for this agent" });
        }
        if (parentRelPath !== serviceFolder) {
          return sendJson(res, 400, { error: "Catalog presets can only be created in the service folder root" });
        }

        const preset = String(payload.preset || name || "").trim().toLowerCase();
        const scaffold = findCatalogScaffold(preset);
        if (!scaffold) return sendJson(res, 400, { error: "Unknown catalog preset" });

        const serviceAbsolute = await ensureServiceFolderScaffold(getAgentRoot());
        if (!serviceAbsolute) return sendJson(res, 400, { error: "Invalid service folder path" });

        try {
          const createdFile = createSystemCatalogNodeSync(serviceAbsolute, preset);
          const createdPath = path.join(serviceFolder, createdFile).replace(/\\/g, "/");
          return sendJson(res, 200, { createdPath, type: "catalog", preset });
        } catch (error) {
          const code = error && error.code ? String(error.code) : "";
          if (code === "EEXIST") {
            return sendJson(res, 409, { error: "Catalog node already exists" });
          }
          if (code === "EINVAL") {
            return sendJson(res, 400, { error: String(error.message || "Invalid catalog preset") });
          }
          throw error;
        }
      }

      if (!name && type !== "manifest") {
        return sendJson(res, 400, { error: "Name is required" });
      }

      const vaultFolder = getAgentVaultFolder();
      if (
        vaultFolder &&
        (parentRelPath === vaultFolder ||
          parentRelPath.toLowerCase().startsWith(`${vaultFolder.toLowerCase()}/`))
      ) {
        await ensureVaultFolderScaffold(getAgentRoot());
      }

      const parentAbsolute =
        parentPathResolved === "." || parentPathResolved === ""
          ? getAgentRoot()
          : normalizeWorkspacePath(parentPathResolved);
      if (!parentAbsolute) return sendJson(res, 400, { error: "Invalid parent path" });

      const parentStat = await fs.stat(parentAbsolute).catch(() => null);
      if (!parentStat || !parentStat.isDirectory()) {
        return sendJson(res, 404, { error: "Parent folder not found" });
      }

      if (type === "manifest") {
        const folderName = path.basename(parentAbsolute);
        const title = String(name || folderName).trim() || folderName;
        const manifestAbsolute = path.join(parentAbsolute, AREA_MANIFEST_FILE);
        try {
          await fs.access(manifestAbsolute);
          return sendJson(res, 409, { error: "Node manifest already exists in this folder" });
        } catch {
          // continue
        }

        await fs.writeFile(
          manifestAbsolute,
          joinNodeFrontmatter(`title: ${title}`, `# ${title}\n`),
          "utf-8"
        );

        const createdPath =
          parentPathResolved && parentPathResolved !== "."
            ? path.join(parentPathResolved, AREA_MANIFEST_FILE)
            : AREA_MANIFEST_FILE;

        return sendJson(res, 200, { createdPath: createdPath.replace(/\\/g, "/"), type: "manifest" });
      }

      if (type === "folder") {
        const folderName = toFolderName(name);
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
        await fs.writeFile(
          manifestAbsolute,
          joinNodeFrontmatter(`title: ${folderName}`, `# ${folderName}\n`),
          "utf-8"
        );

        const createdPath = parentPathResolved && parentPathResolved !== "."
          ? path.join(parentPathResolved, folderName, AREA_MANIFEST_FILE)
          : path.join(folderName, AREA_MANIFEST_FILE);

        return sendJson(res, 200, { createdPath: createdPath.replace(/\\/g, "/"), type: "folder" });
      }

      const partFileName = toNodeFileName(name);
      if (!partFileName) return sendJson(res, 400, { error: "Invalid topic name" });

      const partFileAbsolute = path.join(parentAbsolute, partFileName);
      try {
        await fs.access(partFileAbsolute);
        return sendJson(res, 409, { error: "Topic already exists" });
      } catch {
        // continue
      }

      await fs.writeFile(
        partFileAbsolute,
        joinNodeFrontmatter(`title: ${name}`, `# ${name}\n`),
        "utf-8"
      );

      const createdPath =
        parentPathResolved && parentPathResolved !== "."
          ? path.join(parentPathResolved, partFileName)
          : partFileName;
      return sendJson(res, 200, { createdPath: createdPath.replace(/\\/g, "/"), type: "file" });
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
  if (req.method === "GET" && url.pathname === "/api/docs") {
    return sendJson(res, 200, apiDocs);
  }

  if (req.method === "GET" && url.pathname === "/api/mcp-docs") {
    return sendJson(res, 200, mcpDocs);
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
      const manifest = readAgentManifestSync(absolute);
      if (!manifest) {
        return sendJson(res, 400, { error: `В «${agentPath}» нет awn.agent.json` });
      }

      const data = payload?.data;
      const fileName = payload?.fileName;
      const mimeType = payload?.mimeType;
      if (!data || typeof data !== "string") return sendJson(res, 400, { error: "Missing image data" });

      const previewExt = resolveNodePreviewExtension(mimeType, fileName);
      if (!previewExt) {
        return sendJson(res, 400, {
          error: "Invalid preview format",
          details: `Allowed formats: JPG, PNG, GIF → saved as _Storage/${path.basename(absolute)}/Preview.{jpg|png|gif}`
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
        await cleanupLegacyPreviewDirsForNode(rootManifestAbsolute);
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
      const manifest = readAgentManifestSync(absolute);
      if (!manifest) {
        return sendJson(res, 400, { error: `В «${agentPath}» нет awn.agent.json` });
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
      console.log(`YAML Agent CMS running at ${info.url}`);
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
