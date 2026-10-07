const fs = require("fs/promises");
const fsSync = require("fs");
const path = require("path");
const {
  readFolderStoreSchemaPayload,
  writeFolderStoreSchema
} = require("../awn/awn-data-loader");
const { parseTypeYaml } = require("../awn/awn-yaml-utils");
const { buildDefaultFrontmatter } = require("../awn/awn-types-loader");
const { allocateNextId } = require("../workspace-id/store");
const {
  STORAGE_SUBFOLDER_ASSETS,
  STORAGE_SUBFOLDER_FILES
} = require("../config/manifest-paths");
const {
  MEDIA_LIBRARY_BUILTIN_PRESETS,
  MEDIA_LIBRARY_BUILTIN_SLUGS,
  MEDIA_LIBRARY_SLIDER_SLUG
} = require("../config/media-library-presets");
const { parseImportanceValue } = require("../workspace/workspace-importance");
const { parseAwnId } = require("../workspace-id/service");

const AWN_MEDIA_DIR = "awn-media";
const MEDIA_LIBRARY_INDEX_FILE = "index.md";
const MEDIA_MANIFEST_FILE = "manifest.md";
const MEDIA_TYPE_ID = "awn.media";
const STORAGE_ROOT = "awn-storage";

const MEDIA_STATUSES = new Set(["active", "archive"]);

const MEDIA_MANIFEST_DEFAULT_BODY =
  "Медиатека workspace: файлы в awn-storage/files/ и awn-storage/assets/ — с привязкой к темам и без.";

const MEDIA_LIBRARY_INDEX_TYPE_LABEL = "медиатека";

const MEDIA_LIBRARY_INDEX_IMPORTANCE_LEGEND =
  "* **Важность** — личная важность для пользователя по шкале 0–10 (`awn-importance` в manifest.md). При абстрактных вопросах агент начинает с более приоритетных медиатек. 0 — не отмечено или низкий приоритет; 10 — критично важно.";

const MEDIA_LIBRARY_INDEX_LINES_LEGEND =
  "* **Строк** — число строк в теле документа (manifest.md). Если больше 0 — есть инструкция/промпт для агента: как работать с медиатекой, что важно знать, договорённости. Пустое тело — 0.";

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
    importance: parseImportanceValue(getYamlScalar(frontmatter, "awn-importance")),
    lineCount: countMediaLibraryBodyLines(body),
    body: String(body || "").trim()
  };
}

function countMediaLibraryBodyLines(body) {
  const normalized = String(body || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.trim()) return 0;
  return normalized.split("\n").length;
}

async function ensureMediaLibraryStorageDirs(libraryFolderAbs) {
  await fs.mkdir(path.join(libraryFolderAbs, STORAGE_ROOT, STORAGE_SUBFOLDER_FILES), {
    recursive: true
  });
  await fs.mkdir(path.join(libraryFolderAbs, STORAGE_ROOT, STORAGE_SUBFOLDER_ASSETS), {
    recursive: true
  });
}

function getMediaLibrarySliderFolderRel() {
  return `${AWN_MEDIA_DIR}/${MEDIA_LIBRARY_SLIDER_SLUG}`;
}

function getMediaLibrarySliderManifestRel() {
  return `${getMediaLibrarySliderFolderRel()}/${MEDIA_MANIFEST_FILE}`;
}

function getMediaLibrarySliderFilesRel() {
  return `${getMediaLibrarySliderFolderRel()}/${STORAGE_ROOT}/${STORAGE_SUBFOLDER_FILES}`;
}

function getMediaLibrarySliderFilesAbsolute(agentRoot) {
  const rootAbs = path.resolve(agentRoot);
  return path.join(rootAbs, getMediaLibrarySliderFilesRel());
}

/** @deprecated кадры раньше клали в assets; читаем для миграции в files */
function getMediaLibrarySliderAssetsRel() {
  return `${getMediaLibrarySliderFolderRel()}/${STORAGE_ROOT}/${STORAGE_SUBFOLDER_ASSETS}`;
}

function getMediaLibrarySliderAssetsAbsolute(agentRoot) {
  const rootAbs = path.resolve(agentRoot);
  return path.join(rootAbs, getMediaLibrarySliderAssetsRel());
}

/** @deprecated workspace-root slot; кадры переносятся в awn-media/slider/awn-storage/files/ */
function getLegacyWorkspaceSliderAssetsAbsolute(agentRoot) {
  const rootAbs = path.resolve(agentRoot);
  return path.join(rootAbs, STORAGE_ROOT, STORAGE_SUBFOLDER_ASSETS, MEDIA_LIBRARY_SLIDER_SLUG);
}

const SLIDER_IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif", ".svg"]);

function isSliderImageFileName(name) {
  const ext = path.extname(String(name || "")).toLowerCase();
  return SLIDER_IMAGE_EXTENSIONS.has(ext);
}

async function listImageFilesInDir(dirAbsolute) {
  let entries = [];
  try {
    entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    if (!entry.isFile() || entry.name.startsWith(".")) continue;
    if (!isSliderImageFileName(entry.name)) continue;
    const fileAbsolute = path.join(dirAbsolute, entry.name);
    const stat = await fs.stat(fileAbsolute);
    files.push({
      name: entry.name,
      size: stat.size,
      updatedAt: stat.mtime ? stat.mtime.toISOString() : null
    });
  }
  files.sort((a, b) => a.name.localeCompare(b.name, "ru", { sensitivity: "base", numeric: true }));
  return files;
}

async function migrateSliderAssetsSubfolderToFiles(agentRoot) {
  const targetAbs = getMediaLibrarySliderFilesAbsolute(agentRoot);
  const assetsAbs = getMediaLibrarySliderAssetsAbsolute(agentRoot);

  const targetFiles = await listImageFilesInDir(targetAbs);
  if (targetFiles.length) return { migrated: 0, skipped: true };

  const assetsFiles = await listImageFilesInDir(assetsAbs);
  if (!assetsFiles.length) return { migrated: 0, skipped: true };

  const libraryFolderAbs = path.join(path.resolve(agentRoot), getMediaLibrarySliderFolderRel());
  await ensureMediaLibraryStorageDirs(libraryFolderAbs);

  let migrated = 0;
  for (const file of assetsFiles) {
    const from = path.join(assetsAbs, file.name);
    const to = path.join(targetAbs, file.name);
    try {
      await fs.rename(from, to);
      migrated += 1;
    } catch (error) {
      if (error && error.code === "EXDEV") {
        await fs.copyFile(from, to);
        await fs.unlink(from);
        migrated += 1;
      } else {
        throw error;
      }
    }
  }

  try {
    const remaining = await fs.readdir(assetsAbs);
    if (!remaining.length) await fs.rmdir(assetsAbs);
  } catch {
    // ignore
  }

  return { migrated, skipped: false };
}

async function migrateLegacyWorkspaceSliderAssetsToMediaLibrary(agentRoot) {
  await migrateSliderAssetsSubfolderToFiles(agentRoot).catch(() => null);

  const targetAbs = getMediaLibrarySliderFilesAbsolute(agentRoot);
  const legacyAbs = getLegacyWorkspaceSliderAssetsAbsolute(agentRoot);

  const targetFiles = await listImageFilesInDir(targetAbs);
  if (targetFiles.length) return { migrated: 0, skipped: true };

  const legacyFiles = await listImageFilesInDir(legacyAbs);
  if (!legacyFiles.length) return { migrated: 0, skipped: true };

  const libraryFolderAbs = path.join(path.resolve(agentRoot), getMediaLibrarySliderFolderRel());
  await ensureMediaLibraryStorageDirs(libraryFolderAbs);

  let migrated = 0;
  for (const file of legacyFiles) {
    const from = path.join(legacyAbs, file.name);
    const to = path.join(targetAbs, file.name);
    try {
      await fs.rename(from, to);
      migrated += 1;
    } catch (error) {
      if (error && error.code === "EXDEV") {
        await fs.copyFile(from, to);
        await fs.unlink(from);
        migrated += 1;
      } else {
        throw error;
      }
    }
  }

  try {
    const remaining = await fs.readdir(legacyAbs);
    if (!remaining.length) await fs.rmdir(legacyAbs);
  } catch {
    // ignore
  }

  return { migrated, skipped: false };
}

async function resolveAgentSliderAssetsFolderAbsolute(agentRoot, options = {}) {
  const libraryFolderAbs = path.join(path.resolve(agentRoot), getMediaLibrarySliderFolderRel());
  const filesAbs = getMediaLibrarySliderFilesAbsolute(agentRoot);
  const assetsAbs = getMediaLibrarySliderAssetsAbsolute(agentRoot);

  if (options.create) {
    await ensureMediaLibraryStorageDirs(libraryFolderAbs);
    return filesAbs;
  }

  await migrateLegacyWorkspaceSliderAssetsToMediaLibrary(agentRoot).catch(() => null);

  const filesListed = await listImageFilesInDir(filesAbs);
  if (filesListed.length) return filesAbs;

  try {
    const stat = await fs.stat(filesAbs);
    if (stat.isDirectory()) return filesAbs;
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }

  const assetsListed = await listImageFilesInDir(assetsAbs);
  if (assetsListed.length) {
    await migrateSliderAssetsSubfolderToFiles(agentRoot).catch(() => null);
    return getMediaLibrarySliderFilesAbsolute(agentRoot);
  }

  const legacyAbs = getLegacyWorkspaceSliderAssetsAbsolute(agentRoot);
  try {
    const legacyStat = await fs.stat(legacyAbs);
    if (legacyStat.isDirectory()) return legacyAbs;
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }

  return null;
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

function escapeMediaLibraryIndexLinkText(value) {
  return String(value || "")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .trim();
}

function encodeMediaLibraryIndexLinkTarget(linkPath) {
  return String(linkPath || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function formatMediaLibraryIndexAwnIdCell(awnId) {
  const parsed = parseAwnId(awnId);
  return parsed ? String(parsed) : "—";
}

function formatMediaLibraryIndexImportanceCell(importance) {
  return String(parseImportanceValue(importance));
}

function formatMediaLibraryIndexLineCount(lineCount) {
  if (lineCount == null || !Number.isFinite(lineCount) || lineCount < 0) return "—";
  return String(lineCount);
}

function formatMediaLibraryIndexRecordCount(recordCount) {
  if (recordCount == null || !Number.isFinite(recordCount) || recordCount < 0) return "—";
  return String(recordCount);
}

function formatMediaLibraryIndexSubsections(subsectionCount) {
  if (subsectionCount == null || !Number.isFinite(subsectionCount) || subsectionCount < 0) return "—";
  return String(subsectionCount);
}

function formatMediaLibraryIndexStatusLabel(item, registered) {
  if (!registered) return "без manifest";
  const raw = String(item?.status || "active").trim().toLowerCase();
  if (raw === "archive" || raw === "archived") return "архив";
  if (raw === "active") return "активна";
  return raw || "—";
}

function formatMediaLibraryIndexTitleCell(entry) {
  const titleRaw = String(entry.name || "").trim();
  const title = titleRaw || "—";
  if (!entry.registered) return escapeMediaLibraryIndexCell(title);
  const linkPath = String(entry.manifestPath || "").trim();
  if (!linkPath) return escapeMediaLibraryIndexCell(title);
  const linkText = escapeMediaLibraryIndexLinkText(titleRaw || "—");
  return `[${linkText}](${encodeMediaLibraryIndexLinkTarget(linkPath)})`;
}

async function countFilesUnderDir(dirAbs) {
  let total = 0;
  let entries = [];
  try {
    entries = await fs.readdir(dirAbs, { withFileTypes: true });
  } catch {
    return 0;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const childAbs = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      total += await countFilesUnderDir(childAbs);
    } else if (entry.isFile()) {
      total += 1;
    }
  }
  return total;
}

async function countMediaLibraryStorageStats(agentRoot, folderRel) {
  const filesDirAbs = path.join(agentRoot, folderRel, STORAGE_ROOT, STORAGE_SUBFOLDER_FILES);
  if (!(await pathExists(filesDirAbs))) {
    return { recordCount: 0, subsectionCount: 0 };
  }
  let subsectionCount = 0;
  try {
    const entries = await fs.readdir(filesDirAbs, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      if (entry.isDirectory()) subsectionCount += 1;
    }
  } catch {
    subsectionCount = 0;
  }
  const recordCount = await countFilesUnderDir(filesDirAbs);
  return { recordCount, subsectionCount };
}

async function buildMediaLibraryIndexEntry(agentRoot, item, { registered = true } = {}) {
  const slug = String(item?.slug || "").trim();
  const folderPath = item?.folderPath || `${AWN_MEDIA_DIR}/${slug}`;
  const manifestPath = item?.manifestPath || `${folderPath}/${MEDIA_MANIFEST_FILE}`;
  const storageStats = registered
    ? await countMediaLibraryStorageStats(agentRoot, folderPath)
    : { recordCount: null, subsectionCount: null };

  return {
    slug,
    registered,
    awnId: registered ? item?.awnId || "" : "",
    status: formatMediaLibraryIndexStatusLabel(item, registered),
    type: MEDIA_LIBRARY_INDEX_TYPE_LABEL,
    path: folderPath,
    manifestPath,
    name: String(item?.name || slug).trim() || slug,
    description: String(item?.description || "").trim(),
    lineCount: registered ? item?.lineCount ?? countMediaLibraryBodyLines(item?.body) : null,
    importance: registered ? item?.importance ?? 0 : null,
    recordCount: storageStats.recordCount,
    subsectionCount: storageStats.subsectionCount
  };
}

async function collectMediaLibraryIndexEntries(agentRoot, catalog) {
  const entries = [];
  const seen = new Set();
  const pushEntry = async (item, { registered = true } = {}) => {
    const slug = String(item?.slug || "").trim();
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    entries.push(await buildMediaLibraryIndexEntry(agentRoot, item, { registered }));
  };
  for (const item of catalog?.presets || []) {
    if (item?.registered) await pushEntry(item, { registered: true });
  }
  for (const item of catalog?.libraries || []) {
    await pushEntry(item, { registered: true });
  }
  for (const item of catalog?.unregistered || []) {
    await pushEntry(item, { registered: false });
  }
  return entries.sort((a, b) =>
    String(a.path || "").localeCompare(String(b.path || ""), "ru", { sensitivity: "base", numeric: true })
  );
}

function formatMediaLibraryIndexEntriesMarkdown(entries) {
  if (!entries.length) {
    return "_Пока нет медиатек. Создайте заготовку по ключу или «+» в sidebar._";
  }
  const lines = [
    "| ID | Статус | Тип | Путь | Название | Описание | Строк* | Важность* | Записей | Подразделы |",
    "| ---: | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |"
  ];
  for (const entry of entries) {
    const pathCell = `\`${escapeMediaLibraryIndexCell(entry.path)}\``;
    lines.push(
      `| ${formatMediaLibraryIndexAwnIdCell(entry.awnId)} | ${escapeMediaLibraryIndexCell(entry.status) || "—"} | ${escapeMediaLibraryIndexCell(entry.type) || "—"} | ${pathCell} | ${formatMediaLibraryIndexTitleCell(entry)} | ${escapeMediaLibraryIndexCell(entry.description) || "—"} | ${formatMediaLibraryIndexLineCount(entry.lineCount)} | ${entry.registered ? formatMediaLibraryIndexImportanceCell(entry.importance) : "—"} | ${formatMediaLibraryIndexRecordCount(entry.recordCount)} | ${formatMediaLibraryIndexSubsections(entry.subsectionCount)} |`
    );
  }
  return lines.join("\n");
}

async function formatMediaLibraryIndexMarkdown(agentRoot) {
  const catalog = await listMediaLibraries(agentRoot);
  const entries = await collectMediaLibraryIndexEntries(agentRoot, catalog);
  const lines = [
    "# Оглавление медиатек",
    "",
    "Каталог `awn-media/` — manifest и слоты `awn-storage/files/`, `awn-storage/assets/`.",
    "",
    formatMediaLibraryIndexEntriesMarkdown(entries),
    "",
    MEDIA_LIBRARY_INDEX_IMPORTANCE_LEGEND,
    MEDIA_LIBRARY_INDEX_LINES_LEGEND
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
      refresh_media_library_index: "Пересобрать awn-media/index.md из manifest-ов.",
      list_media_library_items: "Оглавление files/ или assets/ (path=manifest, folder=files|assets).",
      read_media_library_file: "Прочитать файл внутри медиатеки (path, file, folder).",
      upload_media_library_file: "Загрузить файл (base64) в files/ или assets/."
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

function resolveMediaLibrarySlugFromInput(slugOrPath) {
  const normalized = normalizeRelPath(slugOrPath);
  const match = normalized.match(/^awn-media\/([^/]+)(?:\/manifest\.md)?$/i);
  if (match) return match[1];
  return normalized.split("/").filter(Boolean).pop() || "";
}

function readMediaLibraryFrameTypeId(agentRoot, folderRel) {
  const manifestAbs = path.join(agentRoot, folderRel, MEDIA_MANIFEST_FILE);
  try {
    const content = fsSync.readFileSync(manifestAbs, "utf-8");
    const { frontmatter } = splitFrontmatter(content);
    return getYamlScalar(frontmatter, "awn-type") || MEDIA_TYPE_ID;
  } catch {
    return MEDIA_TYPE_ID;
  }
}

function readMediaLibraryStoreSchemaPayload(agentRoot, projectRoot, slugOrPath) {
  const slug = resolveMediaLibrarySlugFromInput(slugOrPath);
  if (!slug) throw new Error("Missing media library slug");
  const folderRel = `${AWN_MEDIA_DIR}/${slug}`;
  const frameTypeId = readMediaLibraryFrameTypeId(agentRoot, folderRel);
  const payload = readFolderStoreSchemaPayload(agentRoot, projectRoot, folderRel, "collection", frameTypeId);
  return { ...payload, slug, folderRel };
}

function writeMediaLibraryStoreSchema(agentRoot, projectRoot, slugOrPath, options = {}) {
  const slug = resolveMediaLibrarySlugFromInput(slugOrPath);
  if (!slug) throw new Error("Missing media library slug");
  const folderRel = `${AWN_MEDIA_DIR}/${slug}`;
  const frameTypeId = readMediaLibraryFrameTypeId(agentRoot, folderRel);
  const payload = writeFolderStoreSchema(
    agentRoot,
    projectRoot,
    folderRel,
    options,
    "collection",
    frameTypeId
  );
  return { ...payload, slug, folderRel };
}

module.exports = {
  AWN_MEDIA_DIR,
  MEDIA_TYPE_ID,
  MEDIA_MANIFEST_DEFAULT_BODY,
  MEDIA_LIBRARY_SLIDER_SLUG,
  getMediaLibrariesRootRel,
  getMediaLibraryIndexRelPath,
  getMediaLibrarySliderFolderRel,
  getMediaLibrarySliderManifestRel,
  getMediaLibrarySliderFilesRel,
  getMediaLibrarySliderAssetsRel,
  listMediaLibraries,
  getMediaLibrary,
  registerMediaLibrary,
  updateMediaLibrary,
  writeMediaLibraryIndex,
  shouldSkipAwnMediaSearch,
  ensureMediaLibraryStorageDirs,
  migrateLegacyWorkspaceSliderAssetsToMediaLibrary,
  resolveAgentSliderAssetsFolderAbsolute,
  listImageFilesInDir,
  isSliderImageFileName,
  readMediaLibraryStoreSchemaPayload,
  writeMediaLibraryStoreSchema
};
