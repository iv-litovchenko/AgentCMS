const fs = require("fs/promises");
const path = require("path");
const { parseTypeYaml } = require("../awn/awn-yaml-utils");
const { buildDefaultFrontmatter } = require("../awn/awn-types-loader");
const { allocateNextId } = require("../workspace-id/store");
const {
  STORAGE_SUBFOLDER_ASSETS,
  STORAGE_SUBFOLDER_FILES
} = require("../config/manifest-paths");
const {
  MEDIA_LIBRARY_BUILTIN_PRESETS,
  MEDIA_LIBRARY_BUILTIN_SLUGS
} = require("../config/media-library-presets");

const AWN_MEDIA_DIR = "awn-media";
const MEDIA_LIBRARY_INDEX_FILE = "index.md";
const MEDIA_MANIFEST_FILE = "manifest.md";
const MEDIA_TYPE_ID = "awn.media";
const STORAGE_ROOT = "awn-storage";

const MEDIA_STATUSES = new Set(["active", "archive"]);

const MEDIA_MANIFEST_DEFAULT_BODY =
  "Медиатека workspace: файлы в awn-storage/files/ и awn-storage/assets/ — с привязкой к темам и без.";

function normalizeRelPath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function getMediaLibrariesRootRel() {
  return AWN_MEDIA_DIR;
}

async function pathExists(absolute) {
  try {
    await fs.access(absolute);
    return true;
  } catch {
    return false;
  }
}

function splitFrontmatter(content) {
  const raw = String(content || "");
  if (!raw.startsWith("---")) {
    return { frontmatter: "", body: raw };
  }
  const end = raw.indexOf("\n---", 3);
  if (end === -1) {
    return { frontmatter: "", body: raw };
  }
  return {
    frontmatter: raw.slice(3, end).trim(),
    body: raw.slice(end + 4).replace(/^\s+/, "")
  };
}

function getYamlScalar(frontmatter, key) {
  const pattern = new RegExp(`^${key}:\\s*(.*)$`, "im");
  const match = String(frontmatter || "").match(pattern);
  if (!match) return "";
  let value = String(match[1] || "").trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return value;
}

function resolveWithinAgentRoot(agentRoot, relPath) {
  const rootAbs = path.resolve(agentRoot);
  const targetAbs = path.resolve(rootAbs, normalizeRelPath(relPath));
  if (targetAbs !== rootAbs && !targetAbs.startsWith(`${rootAbs}${path.sep}`)) {
    return null;
  }
  return { rootAbs, targetAbs };
}

function parseIndexExcludeSubtreeFromFrontmatter(frontmatter) {
  const subtree = getYamlScalar(frontmatter, "awn-index-exclude-subtree");
  const text = String(subtree || "").trim().toLowerCase();
  if (!text) return true;
  return text === "true" || text === "1" || text === "yes";
}

async function readMediaLibraryManifest(manifestAbs, manifestRel) {
  let content = "";
  try {
    content = await fs.readFile(manifestAbs, "utf-8");
  } catch {
    return null;
  }
  const { frontmatter, body } = splitFrontmatter(content);
  const folderRel = path.posix.dirname(manifestRel);
  const slug = path.posix.basename(folderRel);
  const statusRaw = getYamlScalar(frontmatter, "awn-media-status").toLowerCase();
  const status = MEDIA_STATUSES.has(statusRaw) ? statusRaw : statusRaw || "active";
  return {
    id: slug,
    slug,
    folderPath: folderRel,
    manifestPath: manifestRel,
    name: getYamlScalar(frontmatter, "awn-name") || slug,
    description: getYamlScalar(frontmatter, "awn-description") || "",
    status,
    indexExcludeSubtree: parseIndexExcludeSubtreeFromFrontmatter(frontmatter),
    awnType: getYamlScalar(frontmatter, "awn-type") || MEDIA_TYPE_ID,
    awnId: getYamlScalar(frontmatter, "awn-id") || "",
    body: String(body || "").trim()
  };
}

async function ensureMediaLibraryStorageDirs(libraryFolderAbs) {
  await fs.mkdir(path.join(libraryFolderAbs, STORAGE_ROOT, STORAGE_SUBFOLDER_FILES), {
    recursive: true
  });
  await fs.mkdir(path.join(libraryFolderAbs, STORAGE_ROOT, STORAGE_SUBFOLDER_ASSETS), {
    recursive: true
  });
}

async function listMediaLibraryFolderSlugs(agentRoot) {
  const rootAbs = path.join(agentRoot, AWN_MEDIA_DIR);
  if (!(await pathExists(rootAbs))) return [];
  let entries = [];
  try {
    entries = await fs.readdir(rootAbs, { withFileTypes: true });
  } catch {
    return [];
  }
  const slugs = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;
    slugs.push(entry.name);
  }
  return slugs.sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base", numeric: true }));
}

async function buildUnregisteredMediaLibraryEntry(agentRoot, slug) {
  const folderRel = `${AWN_MEDIA_DIR}/${slug}`;
  const folderAbs = path.join(agentRoot, folderRel);
  let entryCount = 0;
  try {
    const children = await fs.readdir(folderAbs, { withFileTypes: true });
    entryCount = children.filter((entry) => entry.name !== MEDIA_MANIFEST_FILE).length;
  } catch {
    // ignore
  }
  return {
    slug,
    folderPath: folderRel,
    manifestPath: `${folderRel}/${MEDIA_MANIFEST_FILE}`,
    name: slug,
    entryCount,
    registered: false,
    hint: "Папка есть, manifest.md нет — register_media_library или «Подхватить» в UI."
  };
}

async function readMediaLibraryEntry(agentRoot, manifestRel) {
  const normalized = normalizeRelPath(manifestRel);
  const resolved = resolveWithinAgentRoot(agentRoot, normalized);
  if (!resolved) return null;
  const parsed = await readMediaLibraryManifest(resolved.targetAbs, normalized);
  if (!parsed) return null;

  let entryCount = null;
  const libraryAbs = path.dirname(resolved.targetAbs);
  try {
    const children = await fs.readdir(libraryAbs, { withFileTypes: true });
    entryCount = children.filter((entry) => entry.name !== MEDIA_MANIFEST_FILE).length;
  } catch {
    entryCount = null;
  }

  return {
    ...parsed,
    exists: true,
    entryCount,
    storageFilesPath: `${parsed.folderPath}/${STORAGE_ROOT}/${STORAGE_SUBFOLDER_FILES}`,
    storageAssetsPath: `${parsed.folderPath}/${STORAGE_ROOT}/${STORAGE_SUBFOLDER_ASSETS}`
  };
}

function getMediaLibraryIndexRelPath() {
  return `${AWN_MEDIA_DIR}/${MEDIA_LIBRARY_INDEX_FILE}`;
}

async function resolveMediaLibraryIndexFileOnDisk(agentRoot) {
  const rel = getMediaLibraryIndexRelPath();
  const abs = path.join(agentRoot, rel);
  return { rel, abs, exists: await pathExists(abs) };
}

function escapeMediaLibraryIndexCell(value) {
  return String(value ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .trim();
}

function collectMediaLibraryIndexEntries(catalog) {
  const entries = [];
  const seen = new Set();
  const pushEntry = (item, { preset = false, registered = true } = {}) => {
    const slug = String(item?.slug || "").trim();
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    entries.push({
      slug,
      name: String(item?.name || slug).trim() || slug,
      status: registered ? String(item?.status || "active").trim() || "active" : "—",
      path: item?.folderPath || `${AWN_MEDIA_DIR}/${slug}`,
      preset: preset ? "да" : "—",
      registered: registered ? "да" : "нет"
    });
  };
  for (const item of catalog?.presets || []) {
    if (item?.registered) pushEntry(item, { preset: true, registered: true });
  }
  for (const item of catalog?.libraries || []) {
    pushEntry(item, { preset: MEDIA_LIBRARY_BUILTIN_SLUGS.has(item?.slug), registered: true });
  }
  for (const item of catalog?.unregistered || []) {
    pushEntry(item, {
      preset: MEDIA_LIBRARY_BUILTIN_SLUGS.has(item?.slug),
      registered: false
    });
  }
  return entries.sort((a, b) => a.slug.localeCompare(b.slug, "ru", { sensitivity: "base", numeric: true }));
}

function formatMediaLibraryIndexEntriesMarkdown(entries) {
  if (!entries.length) {
    return "_Пока нет медиатек. Создайте заготовку по ключу или «+» в sidebar._";
  }
  const lines = [
    "| Ключ | Название | Статус | Путь | Заготовка | manifest |",
    "| --- | --- | --- | --- | --- | --- |"
  ];
  for (const entry of entries) {
    lines.push(
      `| \`${escapeMediaLibraryIndexCell(entry.slug)}\` | ${escapeMediaLibraryIndexCell(entry.name)} | ${escapeMediaLibraryIndexCell(entry.status)} | \`${escapeMediaLibraryIndexCell(entry.path)}\` | ${escapeMediaLibraryIndexCell(entry.preset)} | ${escapeMediaLibraryIndexCell(entry.registered)} |`
    );
  }
  return lines.join("\n");
}

async function formatMediaLibraryIndexMarkdown(agentRoot) {
  const catalog = await listMediaLibraries(agentRoot);
  const entries = collectMediaLibraryIndexEntries(catalog);
  const lines = [
    "# Оглавление медиатек",
    "",
    "Каталог `awn-media/` — manifest и слоты `awn-storage/files/`, `awn-storage/assets/`.",
    "",
    formatMediaLibraryIndexEntriesMarkdown(entries),
    ""
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

async function writeMediaLibraryIndex(agentRoot, options = {}) {
  const overwrite = options.overwrite !== false;
  const indexRel = getMediaLibraryIndexRelPath();
  const indexOnDisk = await resolveMediaLibraryIndexFileOnDisk(agentRoot);
  const exists = indexOnDisk.exists;
  if (exists && !overwrite) {
    return {
      error: "Media library index file already exists",
      status: 409,
      indexFile: { path: indexRel, exists: true }
    };
  }
  await ensureMediaLibrariesRoot(agentRoot);
  const markdown = await formatMediaLibraryIndexMarkdown(agentRoot);
  await fs.writeFile(indexOnDisk.abs, markdown, "utf-8");
  const catalog = await listMediaLibraries(agentRoot);
  return {
    version: 1,
    model: "awn-media-index-write",
    hint: "index.md обновлён в awn-media/. Просмотр → GET /api/agent/media-libraries.",
    overwrite,
    written: {
      path: indexRel,
      created: !exists,
      overwritten: exists,
      libraryCount: catalog.libraryCount + (catalog.presets || []).filter((p) => p.registered).length
    },
    indexFile: { path: indexRel, exists: true }
  };
}

async function listMediaLibraries(agentRoot) {
  const indexOnDisk = await resolveMediaLibraryIndexFileOnDisk(agentRoot);
  const indexRel = getMediaLibraryIndexRelPath();
  const slugs = await listMediaLibraryFolderSlugs(agentRoot);
  const libraries = [];
  const unregistered = [];
  for (const slug of slugs) {
    const manifestRel = `${AWN_MEDIA_DIR}/${slug}/${MEDIA_MANIFEST_FILE}`;
    const entry = await readMediaLibraryEntry(agentRoot, manifestRel);
    if (entry) {
      libraries.push(entry);
    } else {
      unregistered.push(await buildUnregisteredMediaLibraryEntry(agentRoot, slug));
    }
  }

  const libraryBySlug = new Map(libraries.map((entry) => [entry.slug, entry]));
  const unregisteredBySlug = new Map(unregistered.map((entry) => [entry.slug, entry]));
  const userLibraries = libraries.filter((entry) => !MEDIA_LIBRARY_BUILTIN_SLUGS.has(entry.slug));
  const userUnregistered = unregistered.filter((entry) => !MEDIA_LIBRARY_BUILTIN_SLUGS.has(entry.slug));

  const presets = MEDIA_LIBRARY_BUILTIN_PRESETS.map((preset) => {
    const registered = libraryBySlug.get(preset.slug);
    if (registered) {
      return { ...registered, builtin: true, preset: true, registered: true };
    }
    const loose = unregisteredBySlug.get(preset.slug);
    if (loose) {
      return { ...loose, ...preset, builtin: true, preset: true, registered: false };
    }
    const folderPath = `${AWN_MEDIA_DIR}/${preset.slug}`;
    return {
      ...preset,
      folderPath,
      manifestPath: `${folderPath}/${MEDIA_MANIFEST_FILE}`,
      builtin: true,
      preset: true,
      registered: false,
      stub: true,
      description: "Заготовка — создайте медиатеку по клику"
    };
  });

  return {
    version: 1,
    model: "awn-media-catalog",
    hint:
      "Медиатеки workspace: awn-media/{slug}/manifest.md + awn-storage/files/ и assets/. " +
      "presets — заготовки сверху; unregistered — папки без manifest (подхватить через register_media_library).",
    root: getMediaLibrariesRootRel(),
    indexFile: {
      path: indexRel,
      exists: indexOnDisk.exists
    },
    presets,
    presetCount: presets.length,
    libraries: userLibraries,
    libraryCount: userLibraries.length,
    unregistered: userUnregistered,
    unregisteredCount: userUnregistered.length,
    whenToUse: {
      list_media_libraries: "Список медиатек workspace.",
      get_media_library: "Одна карточка + body manifest.",
      register_media_library: "Создать manifest.md и awn-storage/files|assets.",
      refresh_media_library_index: "Пересобрать awn-media/index.md из manifest-ов."
    }
  };
}

async function getMediaLibrary(agentRoot, inputPath) {
  const normalized = normalizeRelPath(inputPath);
  if (!normalized) {
    return { error: "path is required", status: 400 };
  }

  let manifestRel = normalized;
  if (!manifestRel.startsWith(`${AWN_MEDIA_DIR}/`)) {
    manifestRel = `${AWN_MEDIA_DIR}/${manifestRel.replace(/^\/+/, "")}`;
  }
  if (!/\/manifest\.md$/i.test(manifestRel)) {
    manifestRel = `${manifestRel.replace(/\/manifest\.md$/i, "")}/${MEDIA_MANIFEST_FILE}`;
  }

  const entry = await readMediaLibraryEntry(agentRoot, manifestRel);
  if (entry) {
    return {
      version: 1,
      model: "awn-media-library",
      library: { ...entry, registered: true },
      hint: "Файлы — read_file /api/media с path=manifest и folder=files|assets."
    };
  }

  const folderRel = manifestRel.replace(/\/manifest\.md$/i, "");
  const slug = path.posix.basename(folderRel);
  if (!slug || folderRel === AWN_MEDIA_DIR) {
    return { error: "Media library not found", status: 404, path: manifestRel };
  }
  const folderAbs = path.join(agentRoot, folderRel);
  if (!(await pathExists(folderAbs))) {
    return { error: "Media library folder not found", status: 404, path: folderRel };
  }

  const library = await buildUnregisteredMediaLibraryEntry(agentRoot, slug);
  return {
    version: 1,
    model: "awn-media-library-unregistered",
    library,
    hint: "Папка без manifest.md — register_media_library или «Подхватить» в UI."
  };
}

function formatYamlScalar(value) {
  const text = String(value ?? "").trim();
  if (!text) return '""';
  if (/^[a-z0-9._-]+$/i.test(text)) return text;
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function joinMediaManifestContent(frontmatter, body) {
  const fm = String(frontmatter ?? "").trim();
  const mdBody = String(body ?? "").trim();
  if (!fm) return mdBody;
  if (!mdBody) return `---\n${fm}\n---\n`;
  return `---\n${fm}\n---\n\n${mdBody}\n`;
}

function upsertYamlScalarLine(frontmatter, key, value) {
  const pattern = new RegExp(`^${String(key).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:.*\\n?`, "gm");
  const line = `${key}: ${formatYamlScalar(value)}`;
  const raw = String(frontmatter || "").trim();
  if (!raw) return line;
  if (pattern.test(raw)) {
    return raw.replace(pattern, `${line}\n`).trim();
  }
  return `${raw}\n${line}`.trim();
}

function stampMediaManifestAwnIdInFrontmatter(frontmatter, agentRoot) {
  const existing = getYamlScalar(frontmatter, "awn-id").trim();
  if (existing) return frontmatter;
  const root = String(agentRoot || "").trim();
  if (!root) return frontmatter;
  return upsertYamlScalarLine(frontmatter, "awn-id", String(allocateNextId(root)));
}

function composeMediaLibraryManifestContent(options = {}) {
  const agentRoot = String(options.agentRoot || "").trim();
  const projectRoot = options.projectRoot || process.cwd();
  const name = String(options.name || "").trim();

  let frontmatter = buildDefaultFrontmatter(MEDIA_TYPE_ID, {
    name,
    agentRoot,
    projectRoot,
    skipCanonical: true
  });

  const description = String(options.description || "").trim();
  if (description) {
    frontmatter = upsertYamlScalarLine(frontmatter, "awn-description", description);
  }

  const status = String(options.status || "active").trim().toLowerCase();
  if (MEDIA_STATUSES.has(status)) {
    frontmatter = upsertYamlScalarLine(frontmatter, "awn-media-status", status);
  }

  const indexExcludeSubtree =
    options.indexExcludeSubtree !== undefined ? Boolean(options.indexExcludeSubtree) : true;
  frontmatter = upsertYamlScalarLine(
    frontmatter,
    "awn-index-exclude-subtree",
    indexExcludeSubtree ? "true" : "false"
  );

  const body = String(options.body || MEDIA_MANIFEST_DEFAULT_BODY).trim();
  if (agentRoot) {
    frontmatter = stampMediaManifestAwnIdInFrontmatter(frontmatter, agentRoot);
  }
  return joinMediaManifestContent(frontmatter, body);
}

async function ensureMediaLibrariesRoot(agentRoot) {
  const rootAbs = path.join(agentRoot, AWN_MEDIA_DIR);
  await fs.mkdir(rootAbs, { recursive: true });
  return rootAbs;
}

function isMediaLibraryCatalogPath(relPath) {
  const normalized = normalizeRelPath(relPath);
  const match = normalized.match(/^awn-media\/[^/]+\/([^/]+)$/i);
  if (match && String(match[1]).toLowerCase() === "manifest.md") return true;
  return false;
}

function shouldSkipAwnMediaSearch(relPrefix, entryName, isDirectory) {
  const full = relPrefix ? `${relPrefix}/${entryName}`.replace(/\\/g, "/") : entryName;
  if (!full.startsWith(AWN_MEDIA_DIR)) return false;
  if (full === AWN_MEDIA_DIR) return false;
  if (isDirectory) {
    const depth = full.split("/").filter(Boolean).length;
    if (depth <= 2) return false;
    return true;
  }
  return !isMediaLibraryCatalogPath(full);
}

async function registerMediaLibrary(agentRoot, options = {}) {
  const slug = String(options.slug || options.id || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!slug || slug.includes("/") || slug.includes("..")) {
    return { error: "slug is required", status: 400 };
  }

  await ensureMediaLibrariesRoot(agentRoot);
  const folderRel = `${AWN_MEDIA_DIR}/${slug}`;
  const manifestRel = `${folderRel}/${MEDIA_MANIFEST_FILE}`;
  const manifestAbs = path.join(agentRoot, manifestRel);
  const folderAbs = path.dirname(manifestAbs);
  if (await pathExists(manifestAbs)) {
    return { error: "Media library already exists", status: 409, path: manifestRel };
  }

  const folderExists = await pathExists(folderAbs);
  await fs.mkdir(folderAbs, { recursive: true });
  await ensureMediaLibraryStorageDirs(folderAbs);
  const content = composeMediaLibraryManifestContent({ ...options, agentRoot });
  await fs.writeFile(manifestAbs, content, "utf-8");

  const library = await readMediaLibraryEntry(agentRoot, manifestRel);
  return {
    version: 1,
    model: "awn-media-library-register",
    created: true,
    adopted: folderExists,
    path: manifestRel,
    folderPath: folderRel,
    library,
    hint: "Откройте manifest в UI — слоты «Файлы» и «Активы» в awn-storage/."
  };
}

function setYamlScalarInFrontmatter(content, key, value) {
  const raw = String(content || "");
  const { frontmatter, body } = splitFrontmatter(raw);
  const lines = frontmatter ? frontmatter.split("\n") : [];
  const pattern = new RegExp(`^${key}:\\s*`, "i");
  const replacement = `${key}: ${formatYamlScalar(value)}`;
  let found = false;
  const nextLines = lines.map((line) => {
    if (pattern.test(line)) {
      found = true;
      return replacement;
    }
    return line;
  });
  if (!found) nextLines.push(replacement);
  const nextFrontmatter = nextLines.join("\n").trim();
  const nextBody = String(body || "").trim();
  return nextBody ? `---\n${nextFrontmatter}\n---\n\n${nextBody}\n` : `---\n${nextFrontmatter}\n---\n`;
}

async function updateMediaLibrary(agentRoot, inputPath, options = {}) {
  const normalized = normalizeRelPath(inputPath);
  if (!normalized) {
    return { error: "path is required", status: 400 };
  }

  let manifestRel = normalized;
  if (!manifestRel.startsWith(`${AWN_MEDIA_DIR}/`)) {
    manifestRel = `${AWN_MEDIA_DIR}/${manifestRel.replace(/^\/+/, "")}`;
  }
  if (!/\/manifest\.md$/i.test(manifestRel)) {
    manifestRel = `${manifestRel.replace(/\/manifest\.md$/i, "")}/${MEDIA_MANIFEST_FILE}`;
  }

  const resolved = resolveWithinAgentRoot(agentRoot, manifestRel);
  if (!resolved || !(await pathExists(resolved.targetAbs))) {
    return { error: "Media library manifest not found", status: 404, path: manifestRel };
  }

  let content = await fs.readFile(resolved.targetAbs, "utf-8");

  const patchKeys = [
    ["awn-name", options.name],
    ["awn-description", options.description]
  ];
  for (const [key, value] of patchKeys) {
    if (value === undefined) continue;
    content = setYamlScalarInFrontmatter(content, key, value);
  }

  if (options.status !== undefined) {
    const status = String(options.status || "").trim().toLowerCase();
    if (status && !MEDIA_STATUSES.has(status)) {
      return { error: "Invalid media library status", status: 400 };
    }
    content = setYamlScalarInFrontmatter(content, "awn-media-status", status || "active");
  }

  if (options.indexExcludeSubtree !== undefined) {
    content = setYamlScalarInFrontmatter(
      content,
      "awn-index-exclude-subtree",
      options.indexExcludeSubtree ? "true" : "false"
    );
  }

  if (options.body !== undefined) {
    const { frontmatter } = splitFrontmatter(content);
    const body = String(options.body || "").trim();
    content = body
      ? `---\n${frontmatter}\n---\n\n${body}\n`
      : `---\n${frontmatter}\n---\n`;
  }

  await fs.writeFile(resolved.targetAbs, content, "utf-8");
  const library = await readMediaLibraryEntry(agentRoot, manifestRel);
  return {
    version: 1,
    model: "awn-media-library-update",
    updated: true,
    path: manifestRel,
    library,
    hint: "Manifest обновлён."
  };
}

module.exports = {
  AWN_MEDIA_DIR,
  MEDIA_TYPE_ID,
  MEDIA_MANIFEST_DEFAULT_BODY,
  getMediaLibrariesRootRel,
  getMediaLibraryIndexRelPath,
  listMediaLibraries,
  getMediaLibrary,
  registerMediaLibrary,
  updateMediaLibrary,
  writeMediaLibraryIndex,
  shouldSkipAwnMediaSearch,
  ensureMediaLibraryStorageDirs
};
