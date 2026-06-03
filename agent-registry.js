const { AsyncLocalStorage } = require("async_hooks");
const fs = require("fs");
const path = require("path");
const {
  AREA_MANIFEST_CANDIDATES,
  BUNDLE_CONFIG_FILE,
  BUNDLE_CONTENT_FILE,
  BUNDLE_TABULAR_FILE,
  BUNDLE_TODO_FILE,
  PREVIEW_FILE_BASENAME,
  PREVIEW_FILE_EXTENSIONS,
  PREVIEW_FILE_NAMES,
  AREA_MANIFEST_FILE,
  buildManifestCandidatesForStorageKey,
  getManifestNamedSlotKey,
  getNamedStorageBundleDirRel,
  isAreaManifestFileName,
  isTopicManifestFileName
} = require("./manifest-paths");

const LEGACY_PREVIEW_FOLDER_NAME = "_Preview";
const legacyPreviewPurgedAgents = new Set();
/** Версия миграции слотов _Storage (смена — один повторный прогон с исправленной логикой). */
const STORAGE_LAYOUT_MIGRATION_ID = "named-slots-v2";
const legacyStorageLayoutMigratedAgents = new Set();

const NAMED_BUNDLE_FILE_NAMES_LOWER = new Set([
  BUNDLE_CONTENT_FILE.toLowerCase(),
  BUNDLE_TABULAR_FILE.toLowerCase(),
  BUNDLE_CONFIG_FILE.toLowerCase(),
  "config.yaml",
  BUNDLE_TODO_FILE.toLowerCase(),
  ...PREVIEW_FILE_NAMES.map((name) => name.toLowerCase())
]);

const LEGACY_NODE_STORAGE_SUBDIRS = new Set([
  "_preview",
  "_content",
  "_assets",
  "_inbox",
  "_referenses",
  "_scripts"
]);

const agentContext = new AsyncLocalStorage();

/** Agent CMS — канонические имена файлов платформы и workspace. */
const ACMS_MAIN_FILE = "acms.main.json";
const ACMS_MAP_FILE = "acms.map.json";
const ACMS_AGENTS_REGISTRY_FILE = "acms.agents.json";
const ACMS_DEPENDENCIES_FILE = "acms.dependencies.json";
const ACMS_DEPS_FILE = "acms.deps.json";

const LEGACY_WORKSPACE_MANIFEST_FILES = ["acms.workspace.json", "agentcms.json", "awn.agent.json"];
const LEGACY_AGENTS_REGISTRY_FILES = ["agents.registry.json"];
const LEGACY_DEPS_FILES = ["agentcms.deps.json", "awn.dependencies.json"];

/** @deprecated use ACMS_MAIN_FILE */
const ACMS_WORKSPACE_FILE = ACMS_MAIN_FILE;
/** @deprecated use ACMS_MAIN_FILE */
const AGENTCMS_MANIFEST_FILE = ACMS_MAIN_FILE;
const LEGACY_AWN_AGENT_FILE = "awn.agent.json";
/** @deprecated use LEGACY_AWN_AGENT_FILE */
const AWN_AGENT_FILE = LEGACY_AWN_AGENT_FILE;

function resolveAgentManifestAbsoluteSync(workspaceRootAbsolute) {
  if (!workspaceRootAbsolute) return null;
  migrateLegacyAgentManifestSync(workspaceRootAbsolute);
  const canonical = path.join(workspaceRootAbsolute, ACMS_MAIN_FILE);
  if (fs.existsSync(canonical)) return canonical;
  for (const name of LEGACY_WORKSPACE_MANIFEST_FILES) {
    const legacy = path.join(workspaceRootAbsolute, name);
    if (fs.existsSync(legacy)) return legacy;
  }
  return null;
}

function migrateLegacyAgentManifestSync(workspaceRootAbsolute) {
  if (!workspaceRootAbsolute) return;
  const canonical = path.join(workspaceRootAbsolute, ACMS_MAIN_FILE);
  if (fs.existsSync(canonical)) return;
  for (const name of LEGACY_WORKSPACE_MANIFEST_FILES) {
    const legacy = path.join(workspaceRootAbsolute, name);
    if (!fs.existsSync(legacy)) continue;
    try {
      fs.renameSync(legacy, canonical);
    } catch {
      try {
        fs.copyFileSync(legacy, canonical);
        fs.unlinkSync(legacy);
      } catch {
        // keep legacy if migration fails
      }
    }
    return;
  }
}

function getAgentsRegistryPathSync() {
  migrateAgentsRegistrySync();
  return path.join(projectRoot, ACMS_AGENTS_REGISTRY_FILE);
}

function migrateAgentsRegistrySync() {
  if (!projectRoot) return;
  const canonical = path.join(projectRoot, ACMS_AGENTS_REGISTRY_FILE);
  if (fs.existsSync(canonical)) return;
  for (const name of LEGACY_AGENTS_REGISTRY_FILES) {
    const legacy = path.join(projectRoot, name);
    if (!fs.existsSync(legacy)) continue;
    try {
      fs.renameSync(legacy, canonical);
    } catch {
      try {
        fs.copyFileSync(legacy, canonical);
        fs.unlinkSync(legacy);
      } catch {
        // keep legacy if migration fails
      }
    }
    return;
  }
}

function isAcmsDepsFileName(fileName) {
  const base = String(fileName || "").trim().toLowerCase();
  return (
    base === ACMS_DEPENDENCIES_FILE.toLowerCase() ||
    base === ACMS_DEPS_FILE.toLowerCase() ||
    LEGACY_DEPS_FILES.some((legacy) => base === legacy.toLowerCase())
  );
}
const DEFAULT_VAULT_FOLDER = "_Vault";
const LEGACY_VAULT_FOLDER = "_vault";
const DEFAULT_SERVICE_FOLDER = "_System";
const LEGACY_SERVICE_FOLDER = "_system";
/** Общая папка справочников внутри служебного (_System), без префикса _ */
const DEFAULT_SERVICE_CATALOG_FOLDER = "Catalog";
const SYSTEM_REFERENCE_SCAFFOLDS = [
  {
    preset: "categories",
    kind: "catalog",
    fileName: "Categories",
    title: "Категории",
    manifest:
      "# Категории\n\nСправочник категорий workspace. Данные — в `Categories.x.content.md`.\n",
    content:
      "# Категории\n\n| id | label | color |\n| --- | --- | --- |\n| general | Общее | #64748b |\n| project | Проекты | #2563eb |\n| reference | Справочники | #7c3aed |\n"
  },
  {
    preset: "tags",
    kind: "catalog",
    fileName: "Tags",
    title: "Теги",
    manifest:
      "# Теги\n\nСписок тегов workspace — как `#tag` в Obsidian. Данные — в `Tags.x.content.md`.\n\nТемы ссылаются на них через `tags:` в `*.props.yaml` или `#tag` в тексте.\n",
    content:
      "# Теги\n\n#project\n#idea\n#reference\n#daily\n#person\n#source\n#todo\n#review\n"
  },
  {
    preset: "schemas",
    kind: "catalog",
    fileName: "Schemas",
    title: "Схемы",
    manifest:
      "# Схемы\n\nОпределения типов и полей для тем workspace. Данные — в `Schemas.x.content.md`.\n",
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
const AGENT_PREVIEW_FILE_NAMES = ["preview.png", "preview.jpg", "preview.jpeg", "preview.gif"];
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
  if (lower === LEGACY_VAULT_FOLDER) return DEFAULT_VAULT_FOLDER;
  if (lower === LEGACY_SERVICE_FOLDER) return DEFAULT_SERVICE_FOLDER;
  return cleaned;
}

function migrateWorkspaceReservedFolderSync(workspaceAbsolute, fromName, toName) {
  if (!workspaceAbsolute || !fromName || !toName || fromName === toName) return;
  const fromAbsolute = path.join(workspaceAbsolute, fromName);
  const toAbsolute = path.join(workspaceAbsolute, toName);
  if (!fs.existsSync(fromAbsolute)) return;

  if (fs.existsSync(toAbsolute)) {
    if (fromName.toLowerCase() !== toName.toLowerCase()) return;
    if (fromName === toName) return;
    const tempAbsolute = path.join(workspaceAbsolute, `${toName}.__awn_rename__`);
    if (fs.existsSync(tempAbsolute)) return;
    fs.renameSync(fromAbsolute, tempAbsolute);
    fs.renameSync(tempAbsolute, toAbsolute);
    return;
  }

  fs.renameSync(fromAbsolute, toAbsolute);
}

function migrateWorkspaceReservedFoldersSync(workspaceAbsolute) {
  if (!workspaceAbsolute) return;
  migrateWorkspaceReservedFolderSync(workspaceAbsolute, LEGACY_VAULT_FOLDER, DEFAULT_VAULT_FOLDER);
  migrateWorkspaceReservedFolderSync(workspaceAbsolute, LEGACY_SERVICE_FOLDER, DEFAULT_SERVICE_FOLDER);
  migrateWorkspaceReservedFolderSync(workspaceAbsolute, "_Catalog", DEFAULT_SERVICE_CATALOG_FOLDER);
}

function normalizeManifestFolderAliases(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const manifest = { ...raw };
  const vault = String(manifest.vaultFolder ?? "").trim();
  if (vault.toLowerCase() === LEGACY_VAULT_FOLDER) manifest.vaultFolder = DEFAULT_VAULT_FOLDER;
  const service = String(manifest.serviceFolder ?? "").trim();
  if (service.toLowerCase() === LEGACY_SERVICE_FOLDER) manifest.serviceFolder = DEFAULT_SERVICE_FOLDER;
  return manifest;
}

function normalizeVaultFolderName(raw) {
  if (raw === null || raw === false) return null;
  const cleaned = String(raw ?? "").trim();
  if (!cleaned || cleaned.toLowerCase() === "false") return null;
  if (cleaned.toLowerCase() === DEFAULT_SERVICE_FOLDER) return null;
  return DEFAULT_VAULT_FOLDER;
}

function normalizeServiceFolderName(raw) {
  const cleaned = normalizeReservedFolderName(raw, DEFAULT_SERVICE_FOLDER);
  if (!cleaned) return cleaned;
  if (cleaned.toLowerCase() === DEFAULT_VAULT_FOLDER) return null;
  return cleaned;
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

/** Bundle корневой области (_.x.md): workspace/_Storage/Preview.{jpg,png,gif} */
function getAgentWorkspacePreviewBundleDirSync(workspaceRootAbsolute) {
  return path.join(workspaceRootAbsolute, "_Storage");
}

function getAgentWorkspaceLegacyPreviewDirsSync(workspaceRootAbsolute) {
  return [
    path.join(workspaceRootAbsolute, "_Storage", LEGACY_PREVIEW_FOLDER_NAME),
    path.join(workspaceRootAbsolute, LEGACY_PREVIEW_FOLDER_NAME)
  ];
}

function removeEmptyDirectorySync(absolutePath) {
  try {
    const entries = fs.readdirSync(absolutePath);
    if (entries.length === 0) fs.rmdirSync(absolutePath);
  } catch {
    // directory may not exist or not be empty
  }
}

function resolveAreaManifestAbsoluteInDirSync(containerDirAbsolute) {
  for (const name of AREA_MANIFEST_CANDIDATES) {
    const candidate = path.join(containerDirAbsolute, name);
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

function migrateLegacyPreviewDirSync(workspaceRootAbsolute, previewDirAbsolute) {
  const parent = path.dirname(previewDirAbsolute);
  const containerDir =
    path.basename(parent) === "_Storage" ? path.dirname(parent) : parent;
  const manifestAbsolute = resolveAreaManifestAbsoluteInDirSync(containerDir);
  if (!manifestAbsolute) {
    removeEmptyDirectorySync(previewDirAbsolute);
    return;
  }

  const rel = path.relative(workspaceRootAbsolute, manifestAbsolute).replace(/\\/g, "/");
  const bundleDir = path.join(
    workspaceRootAbsolute,
    ...getNamedStorageBundleDirRel(rel, {
      workspaceFolderName: getWorkspaceStorageKeySync(workspaceRootAbsolute)
    }).split("/")
  );
  fs.mkdirSync(bundleDir, { recursive: true });

  const legacyNames = [...new Set([...AGENT_PREVIEW_FILE_NAMES, ...PREVIEW_FILE_NAMES])];
  for (const legacyDir of [previewDirAbsolute]) {
    for (const name of legacyNames) {
      const legacyAbsolute = path.join(legacyDir, name);
      try {
        if (!fs.existsSync(legacyAbsolute) || !fs.statSync(legacyAbsolute).isFile()) continue;
      } catch {
        continue;
      }
      const ext = path.extname(name).toLowerCase();
      const normalizedExt = ext === ".jpeg" ? ".jpg" : ext;
      const targetAbsolute = path.join(bundleDir, `${PREVIEW_FILE_BASENAME}${normalizedExt}`);
      if (legacyAbsolute === targetAbsolute) continue;
      try {
        if (fs.existsSync(targetAbsolute) && fs.statSync(targetAbsolute).isFile()) {
          fs.unlinkSync(legacyAbsolute);
          continue;
        }
      } catch {
        // target missing
      }
      fs.copyFileSync(legacyAbsolute, targetAbsolute);
      try {
        fs.unlinkSync(legacyAbsolute);
      } catch {
        // keep legacy if unlink fails
      }
    }

    try {
      const entries = fs.readdirSync(legacyDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !/^preview\.(jpe?g|png|gif)$/i.test(entry.name)) continue;
        const legacyAbsolute = path.join(legacyDir, entry.name);
        const ext = path.extname(entry.name).toLowerCase();
        const normalizedExt = ext === ".jpeg" ? ".jpg" : ext;
        const targetAbsolute = path.join(bundleDir, `${PREVIEW_FILE_BASENAME}${normalizedExt}`);
        if (legacyAbsolute === targetAbsolute) continue;
        try {
          if (fs.existsSync(targetAbsolute) && fs.statSync(targetAbsolute).isFile()) {
            fs.unlinkSync(legacyAbsolute);
            continue;
          }
        } catch {
          // target missing
        }
        fs.copyFileSync(legacyAbsolute, targetAbsolute);
        try {
          fs.unlinkSync(legacyAbsolute);
        } catch {
          // keep legacy if unlink fails
        }
      }
    } catch {
      // folder may not exist
    }
  }

  removeEmptyDirectorySync(previewDirAbsolute);
}

function isNamedBundleKeyDirSync(dirAbsolute) {
  try {
    return fs
      .readdirSync(dirAbsolute)
      .some((name) => NAMED_BUNDLE_FILE_NAMES_LOWER.has(String(name).toLowerCase()));
  } catch {
    return false;
  }
}

function mergeDirectorySync(fromAbsolute, toAbsolute) {
  fs.mkdirSync(toAbsolute, { recursive: true });
  let entries;
  try {
    entries = fs.readdirSync(fromAbsolute, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fromPath = path.join(fromAbsolute, entry.name);
    const toPath = path.join(toAbsolute, entry.name);
    if (entry.isDirectory()) {
      mergeDirectorySync(fromPath, toPath);
      continue;
    }
    if (!entry.isFile()) continue;
    try {
      if (fs.existsSync(toPath) && fs.statSync(toPath).isFile()) {
        fs.unlinkSync(fromPath);
        continue;
      }
    } catch {
      // target missing
    }
    try {
      fs.renameSync(fromPath, toPath);
    } catch {
      try {
        fs.copyFileSync(fromPath, toPath);
        fs.unlinkSync(fromPath);
      } catch {
        // keep source if move fails
      }
    }
  }
}

function removeDirectoryRecursiveSync(absolutePath) {
  let entries;
  try {
    entries = fs.readdirSync(absolutePath, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const child = path.join(absolutePath, entry.name);
    if (entry.isDirectory()) removeDirectoryRecursiveSync(child);
    else {
      try {
        fs.unlinkSync(child);
      } catch {
        // ignore
      }
    }
  }
  try {
    fs.rmdirSync(absolutePath);
  } catch {
    // ignore
  }
}

function resolveManifestAbsoluteForStorageKeySync(workspaceRootAbsolute, key) {
  const workspaceKey = getWorkspaceStorageKeySync(workspaceRootAbsolute);
  const options = { workspaceFolderName: workspaceKey };
  const topicHits = [];
  const areaHits = [];
  const stack = [workspaceRootAbsolute];

  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (SKIP_SCAN_DIRS.has(entry.name) || entry.name === "_Storage" || entry.name.startsWith(".")) {
          continue;
        }
        stack.push(path.join(dir, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      const rel = path.relative(workspaceRootAbsolute, path.join(dir, entry.name)).replace(/\\/g, "/");
      if (getManifestNamedSlotKey(rel) !== key) continue;
      if (isTopicManifestFileName(entry.name)) topicHits.push(rel);
      else if (isAreaManifestFileName(entry.name)) areaHits.push(rel);
    }
  }

  const pick = topicHits.sort((a, b) => a.length - b.length)[0] || areaHits.sort((a, b) => a.length - b.length)[0];
  if (pick) {
    const abs = path.join(workspaceRootAbsolute, ...pick.split("/"));
    return { absolute: abs, rel: pick };
  }

  const candidates = buildManifestCandidatesForStorageKey(key, options);
  for (const cand of candidates) {
    const abs = path.join(workspaceRootAbsolute, ...cand.split("/"));
    try {
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        return { absolute: abs, rel: cand.replace(/\\/g, "/") };
      }
    } catch {
      // try next
    }
  }
  return null;
}

/** Целевой слот _Storage/{key}/ для каталога области (не сливать все ключи в _). */
function resolveNamedStorageTargetDirForKeySync(
  workspaceRootAbsolute,
  containerDirAbsolute,
  key
) {
  const workspaceKey = getWorkspaceStorageKeySync(workspaceRootAbsolute);
  const options = { workspaceFolderName: workspaceKey };
  const containerRel = path
    .relative(workspaceRootAbsolute, containerDirAbsolute)
    .replace(/\\/g, "/");

  const topicSiblingRel =
    containerRel && containerRel !== "." ? `${containerRel}/${key}.x.md` : `${key}.x.md`;
  const topicSiblingAbs = path.join(workspaceRootAbsolute, ...topicSiblingRel.split("/"));
  try {
    if (fs.existsSync(topicSiblingAbs) && fs.statSync(topicSiblingAbs).isFile()) {
      return path.join(
        workspaceRootAbsolute,
        ...getNamedStorageBundleDirRel(topicSiblingRel, options).split("/")
      );
    }
  } catch {
    // try subfolder area
  }

  const legacyTopicSiblingRel =
    containerRel && containerRel !== "." ? `${containerRel}/${key}.node.md` : `${key}.node.md`;
  const legacyTopicSiblingAbs = path.join(workspaceRootAbsolute, ...legacyTopicSiblingRel.split("/"));
  try {
    if (fs.existsSync(legacyTopicSiblingAbs) && fs.statSync(legacyTopicSiblingAbs).isFile()) {
      return path.join(
        workspaceRootAbsolute,
        ...getNamedStorageBundleDirRel(legacyTopicSiblingRel, options).split("/")
      );
    }
  } catch {
    // try nested area folder
  }

  const nestedAreaManifest = path.join(containerDirAbsolute, key, AREA_MANIFEST_FILE);
  try {
    if (fs.existsSync(nestedAreaManifest) && fs.statSync(nestedAreaManifest).isFile()) {
      const rel = path.relative(workspaceRootAbsolute, nestedAreaManifest).replace(/\\/g, "/");
      return path.join(
        workspaceRootAbsolute,
        ...getNamedStorageBundleDirRel(rel, options).split("/")
      );
    }
  } catch {
    // fall through
  }

  if (key === "_") {
    const manifestAbsolute = resolveAreaManifestAbsoluteInDirSync(containerDirAbsolute);
    if (manifestAbsolute) {
      const rel = path.relative(workspaceRootAbsolute, manifestAbsolute).replace(/\\/g, "/");
      return path.join(
        workspaceRootAbsolute,
        ...getNamedStorageBundleDirRel(rel, options).split("/")
      );
    }
  }

  return path.join(containerDirAbsolute, "_Storage", key);
}

function migrateKeysFromNestedStorageDirSync(workspaceRootAbsolute, nestedStorageAbsolute, containerDirAbsolute) {
  let entries;
  try {
    entries = fs.readdirSync(nestedStorageAbsolute, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (LEGACY_NODE_STORAGE_SUBDIRS.has(entry.name.toLowerCase())) continue;
    const sourceDir = path.join(nestedStorageAbsolute, entry.name);
    if (!isNamedBundleKeyDirSync(sourceDir)) continue;

    const targetDir = resolveNamedStorageTargetDirForKeySync(
      workspaceRootAbsolute,
      containerDirAbsolute,
      entry.name
    );
    if (path.resolve(sourceDir) === path.resolve(targetDir)) continue;
    mergeDirectorySync(sourceDir, targetDir);
    removeDirectoryRecursiveSync(sourceDir);
  }
  removeEmptyDirectorySync(nestedStorageAbsolute);
}

function migrateNestedStorageInDirSync(workspaceRootAbsolute, dirAbsolute) {
  if (resolveAreaManifestAbsoluteInDirSync(dirAbsolute)) {
    const nestedStorage = path.join(dirAbsolute, "_Storage");
    if (fs.existsSync(nestedStorage) && fs.statSync(nestedStorage).isDirectory()) {
      migrateKeysFromNestedStorageDirSync(workspaceRootAbsolute, nestedStorage, dirAbsolute);
    }
  }

  let entries;
  try {
    entries = fs.readdirSync(dirAbsolute, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "_Storage" || entry.name.startsWith(".")) continue;
    if (SKIP_SCAN_DIRS.has(entry.name)) continue;
    migrateNestedStorageInDirSync(workspaceRootAbsolute, path.join(dirAbsolute, entry.name));
  }
}

function migrateFlatNamedStorageBundlesToLocalSync(workspaceRootAbsolute) {
  if (!workspaceRootAbsolute) return;
  const workspaceKey = getWorkspaceStorageKeySync(workspaceRootAbsolute);
  const flatStorage = path.join(workspaceRootAbsolute, "_Storage");
  if (!fs.existsSync(flatStorage)) return;

  const flatWorkspaceBundle = path.join(flatStorage, workspaceKey);
  if (
    workspaceKey &&
    fs.existsSync(flatWorkspaceBundle) &&
    fs.statSync(flatWorkspaceBundle).isDirectory()
  ) {
    mergeDirectorySync(flatWorkspaceBundle, flatStorage);
    removeDirectoryRecursiveSync(flatWorkspaceBundle);
  }

  const legacyUnderscoreDir = path.join(flatStorage, "_");
  if (fs.existsSync(legacyUnderscoreDir) && fs.statSync(legacyUnderscoreDir).isDirectory()) {
    mergeDirectorySync(legacyUnderscoreDir, flatStorage);
    removeDirectoryRecursiveSync(legacyUnderscoreDir);
  }

  let entries;
  try {
    entries = fs.readdirSync(flatStorage, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const key = entry.name;
    if (LEGACY_NODE_STORAGE_SUBDIRS.has(key.toLowerCase())) continue;
    const sourceDir = path.join(flatStorage, key);
    if (!isNamedBundleKeyDirSync(sourceDir)) continue;
    const hit = resolveManifestAbsoluteForStorageKeySync(workspaceRootAbsolute, key);
    if (!hit) continue;
    const targetDir = path.join(
      workspaceRootAbsolute,
      ...getNamedStorageBundleDirRel(hit.rel, { workspaceFolderName: workspaceKey }).split("/")
    );
    if (path.resolve(sourceDir) === path.resolve(targetDir)) continue;
    mergeDirectorySync(sourceDir, targetDir);
    removeDirectoryRecursiveSync(sourceDir);
  }
}

function migrateLegacyStorageLayoutsToLocalSync(workspaceRootAbsolute) {
  if (!workspaceRootAbsolute) return;
  migrateFlatNamedStorageBundlesToLocalSync(workspaceRootAbsolute);
  migrateNestedStorageInDirSync(workspaceRootAbsolute, workspaceRootAbsolute);
}

function purgeLegacyWorkspacePreviewFoldersSync(workspaceRootAbsolute) {
  if (!workspaceRootAbsolute) return;
  const stack = [workspaceRootAbsolute];
  while (stack.length > 0) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (entry.name === LEGACY_PREVIEW_FOLDER_NAME) {
        migrateLegacyPreviewDirSync(workspaceRootAbsolute, full);
        continue;
      }
      if (SKIP_SCAN_DIRS.has(entry.name) || entry.name.startsWith(".")) continue;
      stack.push(full);
    }
  }
}

function migrateLegacyAgentWorkspacePreviewToBundleSync(workspaceRootAbsolute) {
  const bundleDir = getAgentWorkspacePreviewBundleDirSync(workspaceRootAbsolute);
  for (const name of PREVIEW_FILE_NAMES) {
    const canonicalAbsolute = path.join(bundleDir, name);
    try {
      if (fs.existsSync(canonicalAbsolute) && fs.statSync(canonicalAbsolute).isFile()) {
        return canonicalAbsolute;
      }
    } catch {
      // try next
    }
  }

  fs.mkdirSync(bundleDir, { recursive: true });
  const legacyNames = [...new Set([...AGENT_PREVIEW_FILE_NAMES, ...PREVIEW_FILE_NAMES])];

  for (const legacyDir of getAgentWorkspaceLegacyPreviewDirsSync(workspaceRootAbsolute)) {
    for (const name of legacyNames) {
      const legacyAbsolute = path.join(legacyDir, name);
      try {
        if (!fs.existsSync(legacyAbsolute) || !fs.statSync(legacyAbsolute).isFile()) continue;
      } catch {
        continue;
      }
      const ext = path.extname(name).toLowerCase();
      const normalizedExt = ext === ".jpeg" ? ".jpg" : ext;
      const targetAbsolute = path.join(bundleDir, `${PREVIEW_FILE_BASENAME}${normalizedExt}`);
      if (legacyAbsolute === targetAbsolute) return targetAbsolute;
      try {
        if (fs.existsSync(targetAbsolute) && fs.statSync(targetAbsolute).isFile()) {
          fs.unlinkSync(legacyAbsolute);
          return targetAbsolute;
        }
      } catch {
        // target missing
      }
      fs.copyFileSync(legacyAbsolute, targetAbsolute);
      try {
        fs.unlinkSync(legacyAbsolute);
      } catch {
        // keep legacy if unlink fails
      }
      return targetAbsolute;
    }

    try {
      const entries = fs.readdirSync(legacyDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isFile() || !/^preview\.(jpe?g|png|gif)$/i.test(entry.name)) continue;
        const legacyAbsolute = path.join(legacyDir, entry.name);
        const ext = path.extname(entry.name).toLowerCase();
        const normalizedExt = ext === ".jpeg" ? ".jpg" : ext;
        const targetAbsolute = path.join(bundleDir, `${PREVIEW_FILE_BASENAME}${normalizedExt}`);
        if (legacyAbsolute === targetAbsolute) return targetAbsolute;
        try {
          if (fs.existsSync(targetAbsolute) && fs.statSync(targetAbsolute).isFile()) {
            fs.unlinkSync(legacyAbsolute);
            return targetAbsolute;
          }
        } catch {
          // target missing
        }
        fs.copyFileSync(legacyAbsolute, targetAbsolute);
        try {
          fs.unlinkSync(legacyAbsolute);
        } catch {
          // keep legacy if unlink fails
        }
        return targetAbsolute;
      }
    } catch {
      // folder may not exist
    }
    removeEmptyDirectorySync(legacyDir);
  }

  return null;
}

function findAgentWorkspacePreviewAbsoluteSync(workspaceRootAbsolute) {
  const migrated = migrateLegacyAgentWorkspacePreviewToBundleSync(workspaceRootAbsolute);
  if (migrated) return migrated;

  const bundleDir = getAgentWorkspacePreviewBundleDirSync(workspaceRootAbsolute);
  for (const name of PREVIEW_FILE_NAMES) {
    const absolute = path.join(bundleDir, name);
    try {
      if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return absolute;
    } catch {
      // try next
    }
  }

  const raw = readAgentManifestRawSync(workspaceRootAbsolute);
  const legacyPreview = String(raw?.preview || "").trim();
  if (legacyPreview) {
    return resolveManifestPreviewAbsolute(workspaceRootAbsolute, legacyPreview);
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
  for (const legacyDir of getAgentWorkspaceLegacyPreviewDirsSync(workspaceRootAbsolute)) {
    for (const name of [...AGENT_PREVIEW_FILE_NAMES, ...PREVIEW_FILE_NAMES]) {
      try {
        fs.unlinkSync(path.join(legacyDir, name));
      } catch {
        // file may not exist
      }
    }
    try {
      const entries = fs.readdirSync(legacyDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && /^preview\.(jpe?g|png|gif)$/i.test(entry.name)) {
          try {
            fs.unlinkSync(path.join(legacyDir, entry.name));
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // folder may not exist
    }
    removeEmptyDirectorySync(legacyDir);
  }
}

function readAgentManifestRawSync(workspaceRootAbsolute) {
  migrateLegacyAgentManifestSync(workspaceRootAbsolute);
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
  migrateLegacyAgentManifestSync(workspaceRootAbsolute);
  const manifestPath = path.join(workspaceRootAbsolute, ACMS_MAIN_FILE);
  fs.writeFileSync(manifestPath, `${JSON.stringify(raw, null, 2)}\n`, "utf-8");
}

function readAgentManifestSync(workspaceRootAbsolute) {
  const raw = readAgentManifestRawSync(workspaceRootAbsolute);
  if (!raw) return null;
  return normalizeAgentManifest(raw, workspaceRootAbsolute);
}

function migrateVaultFolderOnDiskSync(workspaceAbsolute, previousName, nextName) {
  if (!workspaceAbsolute || !nextName) return;
  migrateWorkspaceReservedFolderSync(workspaceAbsolute, LEGACY_VAULT_FOLDER, nextName);
  if (previousName && previousName !== nextName) {
    migrateWorkspaceReservedFolderSync(workspaceAbsolute, previousName, nextName);
  }
}

function migrateServiceFolderOnDiskSync(workspaceAbsolute, previousName, nextName) {
  if (!workspaceAbsolute || !nextName) return;
  migrateWorkspaceReservedFolderSync(workspaceAbsolute, LEGACY_SERVICE_FOLDER, nextName);
  if (previousName && previousName !== nextName) {
    migrateWorkspaceReservedFolderSync(workspaceAbsolute, previousName, nextName);
  }
}

function updateAgentManifestFields(agentPath, fields = {}) {
  const resolvedPath = assertSafeAgentPath(agentPath);
  const absolute = resolveAgentRootAbsolute(resolvedPath);
  const raw = readAgentManifestRawSync(absolute);
  if (!raw) {
    throw new Error(`В «${resolvedPath}» нет ${ACMS_MAIN_FILE}`);
  }

  const previousManifest = normalizeAgentManifest(raw, absolute);

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
    const previousVault = previousManifest?.vaultFolder || null;
    let nextVault = null;
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
        nextVault = normalized;
      }
    }
    if (nextVault) {
      migrateVaultFolderOnDiskSync(absolute, previousVault, nextVault);
    }
  }

  if (fields.serviceFolder !== undefined) {
    const previousService = previousManifest?.serviceFolder || null;
    let nextService = null;
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
        nextService = normalized;
      }
    }
    if (nextService) {
      migrateServiceFolderOnDiskSync(absolute, previousService, nextService);
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
  migrateAgentsRegistrySync();
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
  migrateWorkspaceReservedFoldersSync(agent.rootAbsolute);
  migrateLegacyAgentManifestSync(agent.rootAbsolute);
  const storageMigrationKey = `${agent.id}:${STORAGE_LAYOUT_MIGRATION_ID}`;
  if (!legacyStorageLayoutMigratedAgents.has(storageMigrationKey)) {
    migrateLegacyStorageLayoutsToLocalSync(agent.rootAbsolute);
    purgeLegacyWorkspacePreviewFoldersSync(agent.rootAbsolute);
    legacyStorageLayoutMigratedAgents.add(storageMigrationKey);
    legacyPreviewPurgedAgents.add(agent.id);
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

  migrateLegacyAgentManifestSync(dirAbsolute);
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
    throw new Error(`В «${resolvedPath}» уже есть ${ACMS_MAIN_FILE}`);
  }

  const folderName = path.basename(workspaceAbsolute);
  const name = String(options.name || "").trim() || folderName.replace(/\.agent$/i, "") || folderName;
  fs.mkdirSync(path.join(workspaceAbsolute, "_Storage"), { recursive: true });
  fs.mkdirSync(
    path.join(workspaceAbsolute, DEFAULT_SERVICE_FOLDER, "_Storage", "Assets"),
    { recursive: true }
  );

  const id = slugifyAgentId(options.id || name, 0);
  writeAgentManifestSync(workspaceAbsolute, { id, name });
  fs.writeFileSync(path.join(workspaceAbsolute, "_.x.md"), `# ${name}\n`, "utf-8");
  fs.writeFileSync(
    path.join(workspaceAbsolute, DEFAULT_SERVICE_FOLDER, "_.x.md"),
    "# Служебное\n\nОбщая медиатека и служебные темы агента.\n",
    "utf-8"
  );
  fs.writeFileSync(
    path.join(workspaceAbsolute, DEFAULT_SERVICE_FOLDER, "_.props.yaml"),
    "title: Служебное\nAWN-TYPE: service\n",
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
      manifest: `${scaffold.fileName}.x.md`,
      props: `${scaffold.fileName}.props.yaml`,
      content: null
    };
  }
  const base = path.join(DEFAULT_SERVICE_CATALOG_FOLDER, scaffold.fileName).replace(/\\/g, "/");
  return {
    manifest: `${base}.x.md`,
    props: `${base}.props.yaml`,
    content: `${base}.x.content.md`
  };
}

function getCatalogRelPaths(scaffold) {
  return getSystemReferenceRelPaths(scaffold);
}

function renameCatalogSidecarIfExists(fromAbsolute, toAbsolute) {
  if (!fromAbsolute || !toAbsolute || fromAbsolute === toAbsolute) return;
  if (!fs.existsSync(fromAbsolute) || fs.existsSync(toAbsolute)) return;
  fs.mkdirSync(path.dirname(toAbsolute), { recursive: true });
  fs.renameSync(fromAbsolute, toAbsolute);
}

function migrateCatalogSidecarsSync(serviceAbsolute, catalogAbsolute, fromStem, scaffold) {
  const pairs = [
    [".node.content.md", ".x.content.md"],
    [".x.content.md", ".x.content.md"],
    [".content.md", ".x.content.md"],
    [".props.yaml", ".props.yaml"]
  ];
  for (const [fromSuffix, toSuffix] of pairs) {
    renameCatalogSidecarIfExists(
      path.join(serviceAbsolute, `${fromStem}${fromSuffix}`),
      path.join(catalogAbsolute, `${scaffold.fileName}${toSuffix}`)
    );
    renameCatalogSidecarIfExists(
      path.join(catalogAbsolute, `${fromStem}${fromSuffix}`),
      path.join(catalogAbsolute, `${scaffold.fileName}${toSuffix}`)
    );
  }
}

function migrateServiceCatalogLegacySync(serviceAbsolute) {
  if (!serviceAbsolute || !fs.existsSync(serviceAbsolute)) return;

  const catalogAbsolute = path.join(serviceAbsolute, DEFAULT_SERVICE_CATALOG_FOLDER);
  const legacyCatalogAbsolute = path.join(serviceAbsolute, "_Catalog");
  if (
    fs.existsSync(legacyCatalogAbsolute) &&
    !fs.existsSync(catalogAbsolute)
  ) {
    fs.renameSync(legacyCatalogAbsolute, catalogAbsolute);
  }
  fs.mkdirSync(catalogAbsolute, { recursive: true });

  for (const scaffold of SYSTEM_REFERENCE_SCAFFOLDS) {
    const rel = getSystemReferenceRelPaths(scaffold);
    const targetManifest = path.join(serviceAbsolute, rel.manifest);
    if (fs.existsSync(targetManifest)) continue;

    const legacyStems = [
      scaffold.preset,
      scaffold.fileName,
      scaffold.fileName.toLowerCase()
    ];

    for (const stem of legacyStems) {
      const legacyCandidates = [
        path.join(serviceAbsolute, `${stem}.node.md`),
        path.join(serviceAbsolute, `${stem}.x.md`)
      ];
      if (scaffold.kind === "catalog") {
        legacyCandidates.push(
          path.join(catalogAbsolute, `${stem}.node.md`),
          path.join(catalogAbsolute, `${stem}.x.md`)
        );
      }
      const legacyManifest = legacyCandidates.find((candidate) => fs.existsSync(candidate));
      if (!legacyManifest) continue;

      if (scaffold.kind === "catalog") {
        fs.mkdirSync(catalogAbsolute, { recursive: true });
      }
      const legacyDir = path.dirname(legacyManifest);
      const legacyStem = path.basename(legacyManifest).replace(/\.(node|x)\.md$/i, "");

      if (legacyManifest !== targetManifest) {
        renameCatalogSidecarIfExists(legacyManifest, targetManifest);
      }

      if (scaffold.kind === "catalog") {
        migrateCatalogSidecarsSync(serviceAbsolute, catalogAbsolute, legacyStem, scaffold);
        if (legacyDir !== serviceAbsolute && legacyDir !== catalogAbsolute) {
          migrateCatalogSidecarsSync(legacyDir, catalogAbsolute, legacyStem, scaffold);
        }
      }
      break;
    }
  }
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

  migrateServiceCatalogLegacySync(serviceAbsolute);

  const scaffold = findSystemReferenceScaffold(presetBase);
  if (!scaffold) {
    const error = new Error("Unknown system reference preset");
    error.code = "EINVAL";
    throw error;
  }

  const rel = getSystemReferenceRelPaths(scaffold);
  const manifestPath = path.join(serviceAbsolute, rel.manifest);
  const propsPath = path.join(serviceAbsolute, rel.props);

  if (fs.existsSync(manifestPath)) {
    const error = new Error("System reference already exists");
    error.code = "EEXIST";
    throw error;
  }

  if (scaffold.kind === "catalog") {
    const catalogAbsolute = path.join(serviceAbsolute, DEFAULT_SERVICE_CATALOG_FOLDER);
    const contentPath = path.join(serviceAbsolute, rel.content);
    fs.mkdirSync(catalogAbsolute, { recursive: true });
    fs.writeFileSync(manifestPath, scaffold.manifest, "utf-8");
    fs.writeFileSync(
      propsPath,
      `title: ${scaffold.title}\ntags: [system, catalog]\nAWN-TYPE: catalog\n`,
      "utf-8"
    );
    fs.writeFileSync(contentPath, scaffold.content, "utf-8");
    return rel.manifest;
  }

  fs.writeFileSync(manifestPath, scaffold.manifest, "utf-8");
  fs.writeFileSync(
    propsPath,
    `title: ${scaffold.title}\ntags: [system, service]\nAWN-TYPE: service-doc\n`,
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
  LEGACY_VAULT_FOLDER,
  DEFAULT_SERVICE_FOLDER,
  LEGACY_SERVICE_FOLDER,
  DEFAULT_SERVICE_CATALOG_FOLDER,
  migrateWorkspaceReservedFoldersSync,
  SYSTEM_REFERENCE_SCAFFOLDS,
  migrateServiceCatalogLegacySync,
  findCatalogScaffold,
  findServiceDocScaffold,
  findSystemReferenceScaffold,
  createSystemReferenceNodeSync,
  createSystemServiceDocSync,
  ACMS_MAIN_FILE,
  ACMS_MAP_FILE,
  ACMS_WORKSPACE_FILE,
  ACMS_AGENTS_REGISTRY_FILE,
  ACMS_DEPENDENCIES_FILE,
  ACMS_DEPS_FILE,
  isAcmsDepsFileName,
  AGENTCMS_MANIFEST_FILE,
  LEGACY_AWN_AGENT_FILE,
  AWN_AGENT_FILE,
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
