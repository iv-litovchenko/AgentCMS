const { AsyncLocalStorage } = require("async_hooks");
const fs = require("fs");
const path = require("path");
const {
  AREA_MANIFEST_CANDIDATES,
  AREA_MANIFEST_FILE,
  BUNDLE_CONFIG_FILE,
  BUNDLE_CONTENT_FILE,
  BUNDLE_TABULAR_FILE,
  BUNDLE_TODO_FILE,
  PREVIEW_FILE_BASENAME,
  PREVIEW_FILE_EXTENSIONS,
  PREVIEW_FILE_NAMES,
  STORAGE_SUBFOLDER_ASSETS,
  getManifestNamedSlotKey,
  getNamedStorageBundleDirRel,
  getNamedStorageBundleRel,
  getLegacyRootAreaManifestRel,
  getNamedStorageSlotDirRel,
  joinAreaManifestRel,
  getServiceAreaManifestRel,
  SERVICE_AREA_NAME,
  toAreaFolderName,
  toTopicFileName,
  isAreaManifestFileName,
  isTopicManifestFileName,
  isStorageFolderName
} = require("./manifest-paths");

const agentContext = new AsyncLocalStorage();

function joinNodeFrontmatter(frontmatter, body) {
  const fm = String(frontmatter ?? "").trim();
  const mdBody = String(body ?? "");
  if (!fm) return mdBody;
  if (!mdBody) return `---\n${fm}\n---\n`;
  return `---\n${fm}\n---\n\n${mdBody}`;
}

/** Agent CMS — канонические имена файлов платформы и workspace. */
const AWN_AGENT_FILE = "awn-agent.json";
const AWN_MAP_FILE = "awn-map.json";
const AWN_AGENTS_REGISTRY_FILE = "awn-agents.json";
const AWN_DEPENDENCIES_FILE = "awn-dependencies.json";
const AWN_AUTOINCREMENT_ID_FILE = "awn-autoincrement-id.json";

function resolveAgentManifestAbsoluteSync(workspaceRootAbsolute) {
  if (!workspaceRootAbsolute) return null;
  const canonical = path.join(workspaceRootAbsolute, AWN_AGENT_FILE);
  return fs.existsSync(canonical) ? canonical : null;
}

function getAgentsRegistryPathSync() {
  return path.join(projectRoot, AWN_AGENTS_REGISTRY_FILE);
}

function isAwnDependenciesFileName(fileName) {
  const base = String(fileName || "").trim().toLowerCase();
  return base === AWN_DEPENDENCIES_FILE.toLowerCase();
}
const DEFAULT_VAULT_FOLDER = "_vault";
const DEFAULT_SERVICE_FOLDER = "_system";

function isVaultFolderEntryName(name) {
  return String(name || "").toLowerCase() === DEFAULT_VAULT_FOLDER.toLowerCase();
}

function isServiceFolderEntryName(name) {
  return String(name || "").toLowerCase() === DEFAULT_SERVICE_FOLDER.toLowerCase();
}

/** Общая папка справочников внутри _system */
const DEFAULT_SERVICE_CATALOG_FOLDER = "Catalog";
const SYSTEM_REFERENCE_SCAFFOLDS = [
  {
    preset: "categories",
    kind: "catalog",
    fileName: "Categories",
    title: "Категории",
    manifest:
      "# Категории\n\nСправочник категорий workspace. Данные — в `_s.Categories/Content.md`.\n",
    content:
      "# Категории\n\n| id | label | color |\n| --- | --- | --- |\n| general | Общее | #64748b |\n| project | Проекты | #2563eb |\n| reference | Справочники | #7c3aed |\n"
  },
  {
    preset: "tags",
    kind: "catalog",
    fileName: "Tags",
    title: "Теги",
    manifest:
      "# Теги\n\nСписок тегов workspace — как `#tag` в Obsidian. Данные — в `_s.Tags/Content.md`.\n\nТемы ссылаются на них через `tags:` в YAML-frontmatter темы (`.md`) или `#tag` в тексте.\n",
    content:
      "# Теги\n\n#project\n#idea\n#reference\n#daily\n#person\n#source\n#todo\n#review\n"
  },
  {
    preset: "schemas",
    kind: "catalog",
    fileName: "Schemas",
    title: "Схемы",
    manifest:
      "# Схемы\n\nОпределения типов и полей для тем workspace. Данные — в `_s.Schemas/Content.md`.\n",
    content:
      "# Схемы\n\n## node.default\n\nБазовые поля темы: `title`, `tags`, `color`, `priority`, `owner`, `status`.\n"
  },
  {
    preset: "agent",
    kind: "service-doc",
    fileName: "Agent",
    title: "Агент",
    manifest: "# Агент\n\nОписание агента: роль, цели и границы workspace.\n"
  },
  {
    preset: "user",
    kind: "service-doc",
    fileName: "User",
    title: "Пользователь",
    manifest: "# Пользователь\n\nПрофиль пользователя: предпочтения, контекст и стиль работы.\n"
  },
  {
    preset: "users",
    kind: "service-doc",
    fileName: "Users",
    title: "Пользователи",
    manifest: "# Пользователи\n\nСписок пользователей и связанных ролей в workspace.\n"
  },
  {
    preset: "agent-rules",
    kind: "service-doc",
    fileName: "Agent.Rules",
    title: "Правила агента",
    manifest: "# Правила агента\n\nОбщие правила и ограничения для агента в этом workspace.\n"
  },
  {
    preset: "agent-voice-tts",
    kind: "service-doc",
    fileName: "Agent.Voice.Tts",
    title: "Голос · TTS",
    manifest: "# Голос · TTS\n\nНастройки и инструкции для синтеза речи (text-to-speech).\n"
  },
  {
    preset: "agent-voice-stt",
    kind: "service-doc",
    fileName: "Agent.Voice.STT",
    title: "Голос · STT",
    manifest: "# Голос · STT\n\nНастройки и инструкции для распознавания речи (speech-to-text).\n"
  }
];
const SKIP_SCAN_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "Library",
  "Caches",
  "Application Support",
  "Trash",
  "vendor"
]);

let projectRoot = null;
let agents = [];
let defaultAgentId = "main";

function resolveAgentRootAbsolute(rawPath) {
  const cleaned = String(rawPath || "./Workspaces").trim();
  if (path.isAbsolute(cleaned)) return path.normalize(cleaned);
  return path.resolve(projectRoot, cleaned);
}

function toRegistryPath(absolutePath) {
  const absolute = path.normalize(String(absolutePath || ""));
  if (!absolute) return "";
  const relative = path.relative(projectRoot, absolute);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative.split(path.sep).join("/");
  }
  return absolute;
}

function resolveExistingWorkspaceDirectory(absolutePath) {
  try {
    const stat = fs.statSync(absolutePath);
    if (!stat.isDirectory()) {
      return { exists: false, absolute: path.normalize(absolutePath), error: "Путь указывает на файл, нужна папка" };
    }
    let resolvedAbsolute = path.normalize(absolutePath);
    try {
      resolvedAbsolute = fs.realpathSync.native(absolutePath);
    } catch {
      // keep normalized absolute
    }
    return { exists: true, absolute: resolvedAbsolute };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return { exists: false, absolute: path.normalize(absolutePath) };
    }
    return {
      exists: false,
      absolute: path.normalize(absolutePath),
      error: String(error?.message || error)
    };
  }
}

const AGENT_ENVIRONMENTS = ["local", "production"];

function normalizeAgentEnvironment(raw) {
  const value = String(raw || "local").trim().toLowerCase();
  return AGENT_ENVIRONMENTS.includes(value) ? value : "local";
}

function normalizeReservedFolderName(raw, fallback) {
  if (raw === false || raw === null) return null;
  if (raw === undefined) return fallback;
  const text = String(raw).trim();
  if (!text || /^false$/i.test(text) || /^none$/i.test(text) || text === "-") return null;
  const cleaned = text.replace(/[\\/]/g, "").replace(/\s+/g, " ");
  if (!cleaned || cleaned.startsWith(".")) return null;
  const lower = cleaned.toLowerCase();
  if (lower === "_storage" || lower === "_parts") return null;
  if (isVaultFolderEntryName(cleaned)) return DEFAULT_VAULT_FOLDER;
  if (isServiceFolderEntryName(cleaned)) return DEFAULT_SERVICE_FOLDER;
  return cleaned;
}

function normalizeManifestFolderAliases(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const manifest = { ...raw };
  const vault = String(manifest.vaultFolder ?? "").trim();
  if (isVaultFolderEntryName(vault)) manifest.vaultFolder = DEFAULT_VAULT_FOLDER;
  const service = String(manifest.serviceFolder ?? "").trim();
  if (isServiceFolderEntryName(service)) manifest.serviceFolder = DEFAULT_SERVICE_FOLDER;
  return manifest;
}

function normalizeVaultFolderName(raw) {
  if (raw === null || raw === false) return null;
  const cleaned = String(raw ?? "").trim();
  if (!cleaned || cleaned.toLowerCase() === "false") return null;
  if (isServiceFolderEntryName(cleaned)) return null;
  return DEFAULT_VAULT_FOLDER;
}

function normalizeServiceFolderName(raw) {
  if (raw === null || raw === false) return null;
  const cleaned = String(raw ?? "").trim();
  if (cleaned.toLowerCase() === "false") return null;
  if (!cleaned) return DEFAULT_SERVICE_FOLDER;
  if (isVaultFolderEntryName(cleaned)) return null;
  return DEFAULT_SERVICE_FOLDER;
}

function normalizeAgentManifest(raw, workspaceRootAbsolute) {
  if (!raw || typeof raw !== "object") return null;
  raw = normalizeManifestFolderAliases(raw);
  const folderName = path.basename(String(workspaceRootAbsolute || ""));
  return {
    id: String(raw.id || "").trim(),
    name: String(raw.name || folderName).trim(),
    comment: String(raw.comment || raw.description || "").trim(),
    vaultFolder: normalizeVaultFolderName(raw.vaultFolder ?? raw.vault),
    serviceFolder: normalizeServiceFolderName(raw.serviceFolder ?? raw.service)
  };
}

function getWorkspaceStorageKeySync(workspaceRootAbsolute) {
  return path.basename(String(workspaceRootAbsolute || "").replace(/[\\/]+$/, ""));
}

/** Превью корневой области: workspace/_s.{имя_манифеста}/Preview.* */
function resolveWorkspaceRootManifestRelSync(workspaceRootAbsolute) {
  const directAbsolute = path.join(workspaceRootAbsolute, AREA_MANIFEST_FILE);
  if (fs.existsSync(directAbsolute)) return AREA_MANIFEST_FILE;
  const legacyRel = getLegacyRootAreaManifestRel(getWorkspaceStorageKeySync(workspaceRootAbsolute));
  if (legacyRel) {
    const legacyAbsolute = path.join(workspaceRootAbsolute, ...legacyRel.split("/"));
    if (fs.existsSync(legacyAbsolute)) return legacyRel;
  }
  return AREA_MANIFEST_FILE;
}

function getAgentWorkspacePreviewBundleDirSync(workspaceRootAbsolute) {
  const workspaceKey = getWorkspaceStorageKeySync(workspaceRootAbsolute);
  const manifestRel = resolveWorkspaceRootManifestRelSync(workspaceRootAbsolute);
  return path.join(
    workspaceRootAbsolute,
    ...getNamedStorageBundleDirRel(manifestRel, { workspaceFolderName: workspaceKey }).split("/")
  );
}

function findAgentWorkspacePreviewAbsoluteSync(workspaceRootAbsolute) {
  const bundleDir = getAgentWorkspacePreviewBundleDirSync(workspaceRootAbsolute);
  for (const name of PREVIEW_FILE_NAMES) {
    const absolute = path.join(bundleDir, name);
    try {
      if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return absolute;
    } catch {
      // try next
    }
  }
  return null;
}

function getOrCreateAgentWorkspacePreviewAbsoluteSync(workspaceRootAbsolute, ext = ".jpg") {
  const bundleDir = getAgentWorkspacePreviewBundleDirSync(workspaceRootAbsolute);
  fs.mkdirSync(bundleDir, { recursive: true });
  const normalizedExt = ext === ".jpeg" ? ".jpg" : ext;
  return path.join(bundleDir, `${PREVIEW_FILE_BASENAME}${normalizedExt}`);
}

function clearAgentWorkspacePreviewImagesSync(workspaceRootAbsolute) {
  const bundleDir = getAgentWorkspacePreviewBundleDirSync(workspaceRootAbsolute);
  for (const name of PREVIEW_FILE_NAMES) {
    try {
      fs.unlinkSync(path.join(bundleDir, name));
    } catch {
      // file may not exist
    }
  }
}

function readAgentManifestRawSync(workspaceRootAbsolute) {
  const manifestPath = resolveAgentManifestAbsoluteSync(workspaceRootAbsolute);
  if (!manifestPath) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
  } catch {
    return null;
  }
}

function writeAgentManifestSync(workspaceRootAbsolute, raw) {
  const manifestPath = path.join(workspaceRootAbsolute, AWN_AGENT_FILE);
  fs.writeFileSync(manifestPath, `${JSON.stringify(raw, null, 2)}\n`, "utf-8");
}

function readAgentManifestSync(workspaceRootAbsolute) {
  const raw = readAgentManifestRawSync(workspaceRootAbsolute);
  if (!raw) return null;
  return normalizeAgentManifest(raw, workspaceRootAbsolute);
}

function updateAgentManifestFields(agentPath, fields = {}) {
  const resolvedPath = assertSafeAgentPath(agentPath);
  const absolute = resolveAgentRootAbsolute(resolvedPath);
  const raw = readAgentManifestRawSync(absolute);
  if (!raw) {
    throw new Error(`В «${resolvedPath}» нет ${AWN_AGENT_FILE}`);
  }

  if (fields.name !== undefined) {
    const trimmed = String(fields.name ?? "").trim();
    if (!trimmed) {
      throw new Error("Название агента не может быть пустым");
    }
    raw.name = trimmed;
  }

  if (fields.comment !== undefined) {
    const trimmed = String(fields.comment ?? "").trim();
    if (trimmed) {
      raw.comment = trimmed;
    } else {
      delete raw.comment;
      delete raw.description;
    }
  }

  if (fields.vaultFolder !== undefined) {
    if (fields.vaultFolder === null || fields.vaultFolder === false) {
      raw.vaultFolder = false;
      delete raw.vault;
    } else {
      const normalized = normalizeVaultFolderName(fields.vaultFolder);
      if (!normalized) {
        raw.vaultFolder = false;
        delete raw.vault;
      } else {
        raw.vaultFolder = normalized;
        delete raw.vault;
      }
    }
  }

  if (fields.serviceFolder !== undefined) {
    if (fields.serviceFolder === null || fields.serviceFolder === false) {
      raw.serviceFolder = false;
      delete raw.service;
    } else {
      const normalized = normalizeServiceFolderName(fields.serviceFolder);
      if (!normalized) {
        raw.serviceFolder = false;
        delete raw.service;
      } else {
        raw.serviceFolder = normalized;
        delete raw.service;
      }
    }
  }

  writeAgentManifestSync(absolute, raw);
}

function resolveManifestPreviewAbsolute(workspaceRootAbsolute, previewRel) {
  const rel = String(previewRel || "").trim().replace(/\\/g, "/");
  if (!rel) return null;
  const absolute = path.resolve(workspaceRootAbsolute, rel);
  if (!absolute.startsWith(path.resolve(workspaceRootAbsolute))) return null;
  try {
    const stat = fs.statSync(absolute);
    if (!stat.isFile()) return null;
    return absolute;
  } catch {
    return null;
  }
}

function enrichAgentEntry(entry) {
  const manifest = readAgentManifestSync(entry.rootAbsolute);
  const folderName = path.basename(entry.rootAbsolute);
  return {
    ...entry,
    manifestFound: Boolean(manifest),
    name: manifest?.name || entry.name || entry.id || folderName,
    comment: manifest?.comment || entry.comment || "",
    manifestId: manifest?.id || "",
    vaultFolder: manifest ? manifest.vaultFolder : DEFAULT_VAULT_FOLDER,
    serviceFolder: manifest ? manifest.serviceFolder : DEFAULT_SERVICE_FOLDER,
    hasPreview: Boolean(findAgentWorkspacePreviewAbsoluteSync(entry.rootAbsolute)),
    previewRel: null
  };
}

function getAgentVaultFolder(agentId) {
  const agent = resolveAgent(agentId || getActiveAgentId());
  if (!agent) return DEFAULT_VAULT_FOLDER;
  if (agent.vaultFolder === null) return null;
  return DEFAULT_VAULT_FOLDER;
}

function getAgentServiceFolder(agentId) {
  const agent = resolveAgent(agentId || getActiveAgentId());
  if (!agent) return DEFAULT_SERVICE_FOLDER;
  if (agent.serviceFolder === null) return null;
  return agent.serviceFolder || DEFAULT_SERVICE_FOLDER;
}

function normalizeAgentActive(raw) {
  return raw !== false;
}

function pickDefaultAgentId(agentList) {
  const activeAgents = agentList.filter((agent) => normalizeAgentActive(agent.active));
  const pool = activeAgents.length > 0 ? activeAgents : agentList;
  return pool.find((agent) => agent.default)?.id || pool[0]?.id || "main";
}

function normalizeAgentEntry(entry) {
  const id = String(entry.id || "").trim();
  const agentPath = String(entry.path || "./Workspaces");
  const rootAbsolute = resolveAgentRootAbsolute(agentPath);
  const base = {
    id,
    name: String(entry.name || id).trim(),
    path: agentPath,
    rootAbsolute,
    environment: normalizeAgentEnvironment(entry.environment),
    comment: String(entry.comment || "").trim(),
    default: Boolean(entry.default),
    active: normalizeAgentActive(entry.active)
  };
  return enrichAgentEntry(base);
}

function loadRegistrySync() {
  const registryPath = getAgentsRegistryPathSync();
  if (!fs.existsSync(registryPath)) {
    const rootAbsolute = path.join(projectRoot, "Workspaces");
    agents = [enrichAgentEntry({ id: "main", name: "Main Agent", path: "./Workspaces", rootAbsolute, default: true, active: true })];
    defaultAgentId = "main";
    return;
  }

  const raw = JSON.parse(fs.readFileSync(registryPath, "utf-8"));
  agents = (Array.isArray(raw.agents) ? raw.agents : [])
    .map(normalizeAgentEntry)
    .filter((agent) => agent.id);
  if (agents.length === 0) {
    const rootAbsolute = path.join(projectRoot, "Workspaces");
    agents = [enrichAgentEntry({ id: "main", name: "Main Agent", path: "./Workspaces", rootAbsolute, default: true, active: true })];
  }
  defaultAgentId = pickDefaultAgentId(agents);
}

function init(rootDir) {
  projectRoot = rootDir;
  loadRegistrySync();
}

function getAgentRoot() {
  const store = agentContext.getStore();
  if (store?.agentRoot) return store.agentRoot;
  const fallback = resolveAgent(defaultAgentId);
  return fallback?.rootAbsolute || path.join(projectRoot, "Workspaces");
}

function resolveAgent(agentId) {
  const id = String(agentId || defaultAgentId).trim();
  return agents.find((agent) => agent.id === id) || null;
}

function getDefaultAgentId() {
  return defaultAgentId;
}

function getActiveAgentId() {
  return agentContext.getStore()?.agentId || defaultAgentId;
}

function getAgentsPublicList() {
  return agents.map(
    ({
      id,
      name,
      path: agentPath,
      environment,
      comment,
      default: isDefault,
      active,
      manifestFound,
      manifestId,
      vaultFolder,
      previewRel
    }) => ({
      id,
      name,
      path: agentPath,
      environment,
      comment: comment || "",
      default: isDefault,
      active: normalizeAgentActive(active),
      manifestFound: Boolean(manifestFound),
      manifestId: manifestId || "",
      vaultFolder,
      previewRel: previewRel || null
    })
  );
}

function slugifyAgentId(raw, fallbackIndex = 0) {
  const cleaned = String(raw || "")
    .trim()
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || `agent-${fallbackIndex + 1}`;
}

function assertSafeAgentPath(agentPath) {
  const cleaned = String(agentPath || "").trim();
  if (!cleaned) {
    throw new Error("Путь workspace не может быть пустым");
  }
  if (cleaned.startsWith("~/")) {
    const home = process.env.HOME || process.env.USERPROFILE;
    if (!home) {
      throw new Error("Не удалось развернуть путь с ~");
    }
    return path.normalize(path.join(home, cleaned.slice(2)));
  }
  if (path.isAbsolute(cleaned)) return path.normalize(cleaned);
  const absolute = path.resolve(projectRoot, cleaned);
  if (!absolute.startsWith(projectRoot)) {
    throw new Error(`Недопустимый путь workspace: ${cleaned}`);
  }
  return toRegistryPath(absolute) || cleaned;
}

function saveAgentsRegistry(rawAgents) {
  if (!Array.isArray(rawAgents) || rawAgents.length === 0) {
    throw new Error("Нужен хотя бы один агент");
  }

  const seen = new Set();
  const normalized = [];
  let defaultAssigned = false;

  rawAgents.forEach((entry, index) => {
    const agentPath = assertSafeAgentPath(entry?.path || "./Workspaces");
    const absolute = resolveAgentRootAbsolute(agentPath);
    const manifest = readAgentManifestSync(absolute);
    const folderName = path.basename(absolute);

    if (manifest && (entry?.name !== undefined || entry?.comment !== undefined || entry?.vaultFolder !== undefined)) {
      updateAgentManifestFields(agentPath, {
        name: entry?.name,
        comment: entry?.comment,
        vaultFolder: entry?.vaultFolder
      });
    }

    const manifestAfterUpdate = readAgentManifestSync(absolute);
    const id = slugifyAgentId(
      entry?.id ||
        manifestAfterUpdate?.id ||
        manifestAfterUpdate?.name ||
        entry?.name ||
        folderName,
      index
    );
    if (seen.has(id)) {
      throw new Error(`Дублирующийся id: ${id}`);
    }
    seen.add(id);

    const wantsDefault = Boolean(entry?.default);
    const isActive = normalizeAgentActive(entry?.active);
    const isDefault = wantsDefault && isActive && !defaultAssigned;

    normalized.push({
      id,
      path: agentPath,
      environment: normalizeAgentEnvironment(entry?.environment),
      active: isActive,
      default: isDefault
    });

    if (isDefault) defaultAssigned = true;
  });

  if (!normalized.some((agent) => normalizeAgentActive(agent.active))) {
    throw new Error("Нужен хотя бы один активный агент");
  }

  if (!normalized.some((agent) => agent.default && normalizeAgentActive(agent.active))) {
    const firstActive = normalized.find((agent) => normalizeAgentActive(agent.active));
    if (firstActive) firstActive.default = true;
  }

  const registryPath = getAgentsRegistryPathSync();
  const payload = {
    agents: normalized.map(({ id, path: agentPath, environment, active, default: isDefault }) => {
      const item = { id, path: agentPath, environment, active: normalizeAgentActive(active) };
      if (isDefault) item.default = true;
      if (!normalizeAgentActive(active)) item.active = false;
      return item;
    })
  };

  fs.writeFileSync(registryPath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  loadRegistrySync();

  return {
    agents: getAgentsPublicList(),
    defaultAgentId: getDefaultAgentId()
  };
}

function runWithAgent(agentId, fn) {
  const agent = resolveAgent(agentId);
  if (!agent) {
    return Promise.reject(new Error(`Unknown agent: ${agentId}`));
  }
  return agentContext.run({ agentId: agent.id, agentRoot: agent.rootAbsolute, agent }, fn);
}

function buildPathValidationResult(pathValue, resolvedPath) {
  const absolute = resolveAgentRootAbsolute(resolvedPath);
  const directoryState = resolveExistingWorkspaceDirectory(absolute);
  const manifest = directoryState.exists ? readAgentManifestSync(directoryState.absolute) : null;

  if (directoryState.error) {
    return {
      path: pathValue,
      valid: false,
      exists: false,
      manifestFound: false,
      absolute: directoryState.absolute,
      error: directoryState.error
    };
  }

  if (!directoryState.exists) {
    return {
      path: pathValue,
      valid: true,
      exists: false,
      manifestFound: false,
      absolute: directoryState.absolute
    };
  }

  return {
    path: pathValue,
    valid: true,
    exists: true,
    manifestFound: Boolean(manifest),
    absolute: directoryState.absolute,
    manifest: manifest || null
  };
}

function validateAgentWorkspacePaths(rawPaths) {
  const paths = Array.isArray(rawPaths) ? rawPaths : [];
  return paths.map((rawPath) => {
    const pathValue = String(rawPath || "").trim();
    if (!pathValue) {
      return { path: pathValue, valid: false, exists: false, manifestFound: false, error: "Путь пустой" };
    }

    try {
      const resolvedPath = assertSafeAgentPath(pathValue);
      return buildPathValidationResult(pathValue, resolvedPath);
    } catch (error) {
      return {
        path: pathValue,
        valid: false,
        exists: false,
        manifestFound: false,
        error: String(error?.message || error)
      };
    }
  });
}

function getDefaultDiscoverRoots(extraRoots = []) {
  const roots = [projectRoot, path.join(projectRoot, "Workspaces")];
  const home = process.env.HOME || process.env.USERPROFILE;
  if (home) {
    roots.push(path.join(home, "Desktop"));
    roots.push(home);
  }
  for (const item of extraRoots) {
    const cleaned = String(item || "").trim();
    if (cleaned) roots.push(cleaned);
  }
  return [...new Set(roots.map((item) => path.normalize(item)).filter(Boolean))];
}

function shouldSkipScanDir(name) {
  if (!name) return true;
  if (SKIP_SCAN_DIRS.has(name)) return true;
  return name.startsWith(".") && name !== ".awn-framework";
}

function scanForAgentManifests(dirAbsolute, depth, maxDepth, results, seen) {
  let entries = [];
  try {
    entries = fs.readdirSync(dirAbsolute, { withFileTypes: true });
  } catch {
    return;
  }

  const manifestPath = resolveAgentManifestAbsoluteSync(dirAbsolute);
  if (manifestPath) {
    let key = path.normalize(dirAbsolute);
    try {
      key = fs.realpathSync.native(dirAbsolute);
    } catch {
      // keep normalized
    }
    if (!seen.has(key)) {
      seen.add(key);
      const manifest = readAgentManifestSync(dirAbsolute);
      const previewAbsolute = findAgentWorkspacePreviewAbsoluteSync(dirAbsolute);
      results.push({
        path: toRegistryPath(dirAbsolute),
        absolute: key,
        manifestFound: Boolean(manifest),
        manifest: manifest || null,
        name: manifest?.name || path.basename(dirAbsolute),
        comment: manifest?.comment || "",
        id: slugifyAgentId(manifest?.id || manifest?.name || path.basename(dirAbsolute), results.length),
        vaultFolder: manifest ? manifest.vaultFolder : DEFAULT_VAULT_FOLDER,
        hasPreview: Boolean(previewAbsolute),
        previewRel: null
      });
    }
  }

  if (depth >= maxDepth) return;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (shouldSkipScanDir(entry.name)) continue;
    scanForAgentManifests(path.join(dirAbsolute, entry.name), depth + 1, maxDepth, results, seen);
  }
}

function discoverAgentManifests(options = {}) {
  const maxDepth = Math.min(Math.max(Number(options.maxDepth) || 6, 1), 10);
  const roots = getDefaultDiscoverRoots(Array.isArray(options.roots) ? options.roots : []);
  const results = [];
  const seen = new Set();

  for (const root of roots) {
    if (!root || !fs.existsSync(root)) continue;
    let rootAbsolute = root;
    try {
      const stat = fs.statSync(root);
      if (!stat.isDirectory()) continue;
      rootAbsolute = fs.realpathSync.native(root);
    } catch {
      continue;
    }
    scanForAgentManifests(rootAbsolute, 0, maxDepth, results, seen);
  }

  results.sort((left, right) => String(left.name || "").localeCompare(String(right.name || ""), "ru"));
  return results;
}

function getAgentManifestPreviewAbsolute(agent) {
  const enriched = enrichAgentEntry(agent);
  return findAgentWorkspacePreviewAbsoluteSync(enriched.rootAbsolute);
}

function createAgentWorkspace(options = {}) {
  const workspacePath = String(options.path || "").trim();
  if (!workspacePath) {
    throw new Error("Укажите путь workspace");
  }

  const resolvedPath = assertSafeAgentPath(workspacePath);
  const workspaceAbsolute = resolveAgentRootAbsolute(resolvedPath);

  if (fs.existsSync(workspaceAbsolute)) {
    if (!fs.statSync(workspaceAbsolute).isDirectory()) {
      throw new Error("Путь указывает на файл, нужна папка");
    }
  } else {
    fs.mkdirSync(workspaceAbsolute, { recursive: true });
  }

  if (readAgentManifestRawSync(workspaceAbsolute)) {
    throw new Error(`В «${resolvedPath}» уже есть ${AWN_AGENT_FILE}`);
  }

  const folderName = path.basename(workspaceAbsolute);
  const name = String(options.name || "").trim() || folderName.replace(/\.agent$/i, "") || folderName;
  const areaManifestRel = AREA_MANIFEST_FILE;
  fs.mkdirSync(
    path.join(workspaceAbsolute, ...getNamedStorageSlotDirRel(areaManifestRel).split("/")),
    { recursive: true }
  );
  const serviceAbsolute = path.join(workspaceAbsolute, DEFAULT_SERVICE_FOLDER);
  fs.mkdirSync(serviceAbsolute, { recursive: true });
  const serviceManifestRel = getServiceAreaManifestRel(DEFAULT_SERVICE_FOLDER);
  const serviceSlotRel = getNamedStorageSlotDirRel(serviceManifestRel);
  fs.mkdirSync(path.join(workspaceAbsolute, ...serviceSlotRel.split("/")), { recursive: true });
  fs.mkdirSync(
    path.join(workspaceAbsolute, ...serviceSlotRel.split("/"), STORAGE_SUBFOLDER_ASSETS),
    { recursive: true }
  );

  const id = slugifyAgentId(options.id || name, 0);
  writeAgentManifestSync(workspaceAbsolute, { id, name });
  fs.writeFileSync(path.join(workspaceAbsolute, AREA_MANIFEST_FILE), `# ${name}\n`, "utf-8");
  const serviceManifestAbsolute = path.join(
    workspaceAbsolute,
    ...getServiceAreaManifestRel(DEFAULT_SERVICE_FOLDER).split("/")
  );
  fs.writeFileSync(
    serviceManifestAbsolute,
    joinNodeFrontmatter(
      `title: ${SERVICE_AREA_NAME}\nAWN-TYPE: service`,
      `# ${SERVICE_AREA_NAME}\n\nОбщая медиатека и служебные темы агента.\n`
    ),
    "utf-8"
  );

  return {
    path: toRegistryPath(workspaceAbsolute) || resolvedPath,
    id,
    name,
    comment: "",
    manifestFound: true,
    hasPreview: false,
    previewRel: null
  };
}

function refreshAgentsFromDisk() {
  loadRegistrySync();
}

function findSystemReferenceScaffold(presetBase) {
  const key = String(presetBase || "").trim().toLowerCase();
  return SYSTEM_REFERENCE_SCAFFOLDS.find((item) => item.preset === key) || null;
}

function findCatalogScaffold(presetBase) {
  const scaffold = findSystemReferenceScaffold(presetBase);
  return scaffold && scaffold.kind === "catalog" ? scaffold : null;
}

function findServiceDocScaffold(presetBase) {
  const scaffold = findSystemReferenceScaffold(presetBase);
  return scaffold && scaffold.kind === "service-doc" ? scaffold : null;
}

function getSystemReferenceRelPaths(scaffold) {
  if (scaffold.kind === "service-doc") {
    return {
      manifest: toTopicFileName(scaffold.fileName),
      content: null
    };
  }
  const catalogDir = DEFAULT_SERVICE_CATALOG_FOLDER;
  const manifest = path.join(catalogDir, toTopicFileName(scaffold.fileName)).replace(/\\/g, "/");
  return {
    manifest,
    content: getNamedStorageBundleRel(manifest, BUNDLE_CONTENT_FILE)
  };
}

function getCatalogRelPaths(scaffold) {
  return getSystemReferenceRelPaths(scaffold);
}

function systemReferenceExistsSync(serviceAbsolute, scaffold) {
  const rel = getSystemReferenceRelPaths(scaffold);
  return fs.existsSync(path.join(serviceAbsolute, rel.manifest));
}

function catalogManifestExistsSync(serviceAbsolute, scaffold) {
  return systemReferenceExistsSync(serviceAbsolute, scaffold);
}

function createSystemReferenceNodeSync(serviceAbsolute, presetBase) {
  if (!serviceAbsolute) {
    const error = new Error("Service folder path is required");
    error.code = "EINVAL";
    throw error;
  }

  const scaffold = findSystemReferenceScaffold(presetBase);
  if (!scaffold) {
    const error = new Error("Unknown system reference preset");
    error.code = "EINVAL";
    throw error;
  }

  const rel = getSystemReferenceRelPaths(scaffold);
  const manifestPath = path.join(serviceAbsolute, rel.manifest);

  if (fs.existsSync(manifestPath)) {
    const error = new Error("System reference already exists");
    error.code = "EEXIST";
    throw error;
  }

  if (scaffold.kind === "catalog") {
    const catalogAbsolute = path.join(serviceAbsolute, DEFAULT_SERVICE_CATALOG_FOLDER);
    const contentPath = path.join(serviceAbsolute, rel.content);
    fs.mkdirSync(catalogAbsolute, { recursive: true });
    fs.mkdirSync(path.dirname(contentPath), { recursive: true });
    fs.writeFileSync(
      manifestPath,
      joinNodeFrontmatter(
        `title: ${scaffold.title}\ntags: [system, catalog]\nAWN-TYPE: catalog`,
        scaffold.manifest
      ),
      "utf-8"
    );
    fs.writeFileSync(contentPath, scaffold.content, "utf-8");
    return rel.manifest;
  }

  fs.writeFileSync(
    manifestPath,
    joinNodeFrontmatter(
      `title: ${scaffold.title}\ntags: [system, service]\nAWN-TYPE: service-doc`,
      scaffold.manifest
    ),
    "utf-8"
  );
  return rel.manifest;
}

function createSystemCatalogNodeSync(serviceAbsolute, presetBase) {
  const scaffold = findCatalogScaffold(presetBase);
  if (!scaffold) {
    const error = new Error("Unknown catalog preset");
    error.code = "EINVAL";
    throw error;
  }
  return createSystemReferenceNodeSync(serviceAbsolute, presetBase);
}

function createSystemServiceDocSync(serviceAbsolute, presetBase) {
  const scaffold = findServiceDocScaffold(presetBase);
  if (!scaffold) {
    const error = new Error("Unknown service doc preset");
    error.code = "EINVAL";
    throw error;
  }
  return createSystemReferenceNodeSync(serviceAbsolute, presetBase);
}

module.exports = {
  DEFAULT_VAULT_FOLDER,
  isVaultFolderEntryName,
  DEFAULT_SERVICE_FOLDER,
  isServiceFolderEntryName,
  DEFAULT_SERVICE_CATALOG_FOLDER,
  SYSTEM_REFERENCE_SCAFFOLDS,
  findCatalogScaffold,
  findServiceDocScaffold,
  findSystemReferenceScaffold,
  createSystemReferenceNodeSync,
  createSystemServiceDocSync,
  AWN_AGENT_FILE,
  AWN_MAP_FILE,
  AWN_AGENTS_REGISTRY_FILE,
  AWN_DEPENDENCIES_FILE,
  AWN_AUTOINCREMENT_ID_FILE,
  isAwnDependenciesFileName,
  init,
  getAgentRoot,
  getActiveAgentId,
  resolveAgent,
  getDefaultAgentId,
  getAgentsPublicList,
  getAgentVaultFolder,
  getAgentServiceFolder,
  createSystemCatalogNodeSync,
  saveAgentsRegistry,
  validateAgentWorkspacePaths,
  discoverAgentManifests,
  createAgentWorkspace,
  readAgentManifestSync,
  enrichAgentEntry,
  getAgentManifestPreviewAbsolute,
  resolveManifestPreviewAbsolute,
  resolveAgentRootAbsolute,
  toRegistryPath,
  findAgentWorkspacePreviewAbsoluteSync,
  getOrCreateAgentWorkspacePreviewAbsoluteSync,
  clearAgentWorkspacePreviewImagesSync,
  updateAgentManifestFields,
  assertSafeAgentPath,
  refreshAgentsFromDisk,
  runWithAgent
};
