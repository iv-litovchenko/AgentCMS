const fs = require("fs/promises");
const path = require("path");
const { parseTypeYaml } = require("../../awn-yaml-utils");
const { parseImportanceValue } = require("../workspace/workspace-importance");
const { buildDefaultFrontmatter } = require("../../awn-types-loader");
const { isSameWorkspaceIndexPath } = require("../workspace-index-path");

const AWN_REPOSITORIES_DIR = "awn-repositories";
const AWN_REPOSITORIES_INDEX_FILE = "index.md";
const AWN_REPOSITORIES_INDEX_LEGACY_FILE = "INDEX.md";
const AWN_REPOSITORIES_GROUPS_FILE = "groups.yml";
const REPOSITORY_MANIFEST_FILE = "manifest.md";
const REPOSITORY_TYPE_ID = "awn.repository";

const REPOSITORY_STATUSES = new Set(["active", "study", "archived", "vendored"]);

const DEFAULT_REPOSITORY_GROUPS = [
  { id: "study", title: "Изучение" },
  { id: "new", title: "Новый" },
  { id: "archived", title: "Архив" },
  { id: "vendored", title: "Вендор" }
];

const DEFAULT_REPOSITORY_GROUP_IDS = new Set(DEFAULT_REPOSITORY_GROUPS.map((group) => group.id));

const REPOSITORY_MANIFEST_DEFAULT_BODY =
  "Описание для агента и человека: entry point, ветка, связь с темами CMS.";

function normalizeRelPath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function getRepositoriesRootRel() {
  return AWN_REPOSITORIES_DIR;
}

function getRepositoryIndexRelPath() {
  return `${AWN_REPOSITORIES_DIR}/${AWN_REPOSITORIES_INDEX_FILE}`;
}

function getRepositoryIndexLegacyRelPath() {
  return `${AWN_REPOSITORIES_DIR}/${AWN_REPOSITORIES_INDEX_LEGACY_FILE}`;
}

async function resolveRepositoryIndexFileOnDisk(agentRoot) {
  const canonical = getRepositoryIndexRelPath();
  if (await pathExists(path.join(agentRoot, canonical))) {
    return { path: canonical, exists: true };
  }
  const legacy = getRepositoryIndexLegacyRelPath();
  if (!isSameWorkspaceIndexPath(legacy, canonical) && (await pathExists(path.join(agentRoot, legacy)))) {
    return { path: legacy, exists: true, legacy: true };
  }
  return { path: canonical, exists: false };
}

function getRepositoryGroupsRelPath() {
  return `${AWN_REPOSITORIES_DIR}/${AWN_REPOSITORIES_GROUPS_FILE}`;
}

function normalizeRepositoryGroupId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^-+|-+$/g, "");
}

function mergeRepositoryGroupsWithDefaults(groups = []) {
  const input = Array.isArray(groups) ? groups : [];
  if (!input.length) {
    return DEFAULT_REPOSITORY_GROUPS.map((group) => ({ ...group }));
  }

  const byId = new Map(DEFAULT_REPOSITORY_GROUPS.map((group) => [group.id, { ...group }]));
  const merged = [];
  const seen = new Set();

  for (const entry of input) {
    if (!entry || typeof entry !== "object") continue;
    const id = normalizeRepositoryGroupId(entry.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const fallback = byId.get(id);
    merged.push({
      id,
      title: String(entry.title || entry.name || fallback?.title || id).trim() || id
    });
  }

  for (const group of DEFAULT_REPOSITORY_GROUPS) {
    if (!seen.has(group.id)) merged.push({ ...group });
  }

  return merged;
}

function normalizeRepositoryGroupsCatalog(raw = {}) {
  const groups = mergeRepositoryGroupsWithDefaults(raw.groups);

  const assignments = {};
  const assignRaw = raw.assignments && typeof raw.assignments === "object" ? raw.assignments : {};
  for (const [slug, groupId] of Object.entries(assignRaw)) {
    const normalizedSlug = String(slug || "").trim();
    const normalizedGroup = normalizeRepositoryGroupId(groupId);
    if (!normalizedSlug || !normalizedGroup) continue;
    assignments[normalizedSlug] = normalizedGroup;
  }

  return { groups, assignments };
}

function stringifyRepositoryGroupsYaml(catalog) {
  const lines = [
    "# Группы sidebar для awn-repositories (без физических подпапок)",
    "groups:"
  ];
  for (const group of catalog.groups || []) {
    lines.push(`  - id: ${formatYamlScalar(group.id)}`);
    lines.push(`    title: ${formatYamlScalar(group.title || group.id)}`);
  }
  lines.push("assignments:");
  const assignments =
    catalog.assignments && typeof catalog.assignments === "object" ? catalog.assignments : {};
  const slugs = Object.keys(assignments).sort((a, b) =>
    a.localeCompare(b, "ru", { sensitivity: "base", numeric: true })
  );
  for (const slug of slugs) {
    lines.push(`  ${slug}: ${formatYamlScalar(assignments[slug])}`);
  }
  return `${lines.join("\n")}\n`;
}

function inferRepositoryGroupId(repo) {
  const status = String(repo?.status || "study").trim().toLowerCase();
  if (status === "archived") return "archived";
  if (status === "vendored") return "vendored";
  return "study";
}

function repositoryGroupIdToManifestStatus(groupId) {
  const normalized = normalizeRepositoryGroupId(groupId);
  if (normalized === "archived") return "archived";
  if (normalized === "vendored") return "vendored";
  return "study";
}

async function readRepositoryGroups(agentRoot) {
  const relPath = getRepositoryGroupsRelPath();
  const absPath = path.join(agentRoot, relPath);
  if (!(await pathExists(absPath))) {
    return {
      path: relPath,
      exists: false,
      groups: mergeRepositoryGroupsWithDefaults([]),
      assignments: {}
    };
  }

  let content = "";
  try {
    content = await fs.readFile(absPath, "utf-8");
  } catch {
    return {
      path: relPath,
      exists: false,
      groups: mergeRepositoryGroupsWithDefaults([]),
      assignments: {}
    };
  }

  const parsed = parseTypeYaml(content);
  const catalog = normalizeRepositoryGroupsCatalog(parsed);
  return {
    ...catalog,
    path: relPath,
    exists: true
  };
}

async function writeRepositoryGroups(agentRoot, catalog = {}) {
  await ensureRepositoriesRoot(agentRoot);
  const normalized = normalizeRepositoryGroupsCatalog({
    groups: catalog.groups,
    assignments: catalog.assignments
  });
  const validIds = new Set(normalized.groups.map((group) => group.id));
  const assignments = {};
  for (const [slug, groupId] of Object.entries(normalized.assignments)) {
    if (validIds.has(groupId)) assignments[slug] = groupId;
  }
  const finalCatalog = { groups: normalized.groups, assignments };
  const relPath = getRepositoryGroupsRelPath();
  await fs.writeFile(path.join(agentRoot, relPath), stringifyRepositoryGroupsYaml(finalCatalog), "utf-8");
  return {
    ...finalCatalog,
    path: relPath,
    exists: true,
    written: true
  };
}

async function setRepositoryGroupAssignment(agentRoot, slug, groupId) {
  const normalizedSlug = String(slug || "").trim();
  if (!normalizedSlug) return null;

  const catalog = await readRepositoryGroups(agentRoot);
  const normalizedGroup = normalizeRepositoryGroupId(groupId);
  const nextAssignments = { ...catalog.assignments };
  if (!normalizedGroup) {
    delete nextAssignments[normalizedSlug];
  } else {
    nextAssignments[normalizedSlug] = normalizedGroup;
  }

  return writeRepositoryGroups(agentRoot, {
    groups: catalog.groups,
    assignments: nextAssignments
  });
}

function applyGroupsCatalogToRepositories(repositories, groupsCatalog) {
  const groups = mergeRepositoryGroupsWithDefaults(groupsCatalog?.groups);
  const titleById = new Map(groups.map((group) => [group.id, group.title || group.id]));
  for (const repo of repositories) {
    const fromCatalog = groupsCatalog?.assignments?.[repo.slug];
    const fromManifest = normalizeRepositoryGroupId(repo.group);
    repo.group = fromCatalog || fromManifest || inferRepositoryGroupId(repo);
    repo.groupTitle = titleById.get(repo.group) || repo.group || "";
  }
  return repositories;
}

function isRepositoryRecordCatalogBasename(baseName) {
  const lower = String(baseName || "").trim().toLowerCase();
  return lower === "manifest.md" || lower === "readme.md";
}

function isRepositoryCatalogPath(relPath) {
  const normalized = normalizeRelPath(relPath);
  if (normalized === getRepositoryIndexRelPath() || normalized === getRepositoryIndexLegacyRelPath()) return true;
  if (normalized === getRepositoryGroupsRelPath()) return true;
  const repoFileMatch = normalized.match(/^awn-repositories\/[^/]+\/([^/]+)$/i);
  if (repoFileMatch && isRepositoryRecordCatalogBasename(repoFileMatch[1])) return true;
  return false;
}

async function resolveRepositoryReadmeRel(agentRoot, folderRel) {
  const normalizedFolder = normalizeRelPath(folderRel);
  if (!normalizedFolder.startsWith(AWN_REPOSITORIES_DIR)) return null;
  const folderAbs = path.join(agentRoot, normalizedFolder);
  let entries = [];
  try {
    entries = await fs.readdir(folderAbs);
  } catch {
    return null;
  }
  const match = entries.find((name) => String(name).toLowerCase() === "readme.md");
  if (!match) return null;
  return `${normalizedFolder}/${match}`;
}

function shouldSkipAwnRepositoriesSearch(relPrefix, entryName, isDirectory) {
  const full = relPrefix ? `${relPrefix}/${entryName}`.replace(/\\/g, "/") : entryName;
  if (!full.startsWith(AWN_REPOSITORIES_DIR)) return false;
  if (full === AWN_REPOSITORIES_DIR) return false;
  if (isDirectory) {
    const depth = full.split("/").filter(Boolean).length;
    if (depth <= 2) return false;
    return true;
  }
  return !isRepositoryCatalogPath(full);
}

function parseYamlScalarList(raw) {
  const text = String(raw || "").trim();
  if (!text) return [];
  if (text.startsWith("[") && text.endsWith("]")) {
    return text
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return text
    .split(/[\n,]/)
    .map((item) => item.trim().replace(/^-\s*/, "").replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
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

async function pathExists(absolute) {
  try {
    await fs.access(absolute);
    return true;
  } catch {
    return false;
  }
}

async function readRepositoryManifest(manifestAbs, manifestRel) {
  let content = "";
  try {
    content = await fs.readFile(manifestAbs, "utf-8");
  } catch {
    return null;
  }
  const { frontmatter, body } = splitFrontmatter(content);
  const folderRel = path.posix.dirname(manifestRel);
  const slug = path.posix.basename(folderRel);
  const statusRaw = getYamlScalar(frontmatter, "awn-repo-status").toLowerCase();
  const status = REPOSITORY_STATUSES.has(statusRaw) ? statusRaw : statusRaw || "study";
  return {
    id: slug,
    slug,
    folderPath: folderRel,
    manifestPath: manifestRel,
    name: getYamlScalar(frontmatter, "awn-name") || slug,
    description: getYamlScalar(frontmatter, "awn-description") || "",
    origin: getYamlScalar(frontmatter, "awn-repo-origin") || "",
    status,
    tech: parseYamlScalarList(getYamlScalar(frontmatter, "awn-repo-tech")),
    relatedTopic: getYamlScalar(frontmatter, "awn-repo-related-topic") || "",
    group: getYamlScalar(frontmatter, "awn-repository-group") || "",
    runtimeIndex: getYamlScalar(frontmatter, "awn-runtime-index") || "manifest-only",
    indexExcludeSubtree: parseIndexExcludeSubtreeFromFrontmatter(frontmatter),
    awnType: getYamlScalar(frontmatter, "awn-type") || REPOSITORY_TYPE_ID,
    body: String(body || "").trim()
  };
}

function parseIndexExcludeSubtreeFromFrontmatter(frontmatter) {
  const legacy = getYamlScalar(frontmatter, "awn-index-exclude");
  const subtree = getYamlScalar(frontmatter, "awn-index-exclude-subtree");
  const text = String(subtree || legacy || "").trim().toLowerCase();
  if (!text) return true;
  return text === "true" || text === "1" || text === "yes";
}

async function listRepositoryFolderSlugs(agentRoot) {
  const rootAbs = path.join(agentRoot, AWN_REPOSITORIES_DIR);
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
    // Только скрытые (.DS_Store-папки) — slug с _ и __ допустим (__MyTs и т.п.)
    if (entry.name.startsWith(".")) continue;
    slugs.push(entry.name);
  }
  return slugs.sort((a, b) => a.localeCompare(b, "ru", { sensitivity: "base", numeric: true }));
}

async function buildUnregisteredRepositoryEntry(agentRoot, slug) {
  const folderRel = `${AWN_REPOSITORIES_DIR}/${slug}`;
  const folderAbs = path.join(agentRoot, folderRel);
  let hasGit = false;
  let entryCount = 0;
  let readmePath = null;
  let readmeBody = "";
  let readmeExists = false;
  try {
    hasGit = await pathExists(path.join(folderAbs, ".git"));
    const children = await fs.readdir(folderAbs, { withFileTypes: true });
    entryCount = children.filter((entry) => entry.name !== REPOSITORY_MANIFEST_FILE).length;
  } catch {
    // ignore
  }
  readmePath = await resolveRepositoryReadmeRel(agentRoot, folderRel);
  if (readmePath) {
    try {
      readmeBody = await fs.readFile(path.join(agentRoot, readmePath), "utf-8");
      readmeExists = true;
    } catch {
      readmeExists = false;
      readmeBody = "";
    }
  }
  return {
    slug,
    folderPath: folderRel,
    manifestPath: `${folderRel}/${REPOSITORY_MANIFEST_FILE}`,
    name: slug,
    hasGit,
    entryCount,
    readmePath,
    readmeExists,
    readmeBody,
    registered: false,
    hint: "Папка есть, manifest.md нет — вызовите register_repository или «Подхватить» в UI."
  };
}

function resolveWithinAgentRoot(agentRoot, relPath) {
  const rootAbs = path.resolve(agentRoot);
  const targetAbs = path.resolve(rootAbs, normalizeRelPath(relPath));
  if (targetAbs !== rootAbs && !targetAbs.startsWith(`${rootAbs}${path.sep}`)) {
    return null;
  }
  return { rootAbs, targetAbs };
}

async function readRepositoryEntry(agentRoot, manifestRel) {
  const normalized = normalizeRelPath(manifestRel);
  const resolved = resolveWithinAgentRoot(agentRoot, normalized);
  if (!resolved) return null;
  const manifestAbs = resolved.targetAbs;
  const parsed = await readRepositoryManifest(manifestAbs, normalized);
  if (!parsed) return null;

  let hasGit = false;
  let entryCount = null;
  let readmePath = null;
  let readmeBody = "";
  let readmeExists = false;
  const repoAbs = path.dirname(manifestAbs);
  hasGit = await pathExists(path.join(repoAbs, ".git"));
  try {
    const children = await fs.readdir(repoAbs, { withFileTypes: true });
    entryCount = children.filter((entry) => entry.name !== REPOSITORY_MANIFEST_FILE).length;
  } catch {
    entryCount = null;
  }
  readmePath = await resolveRepositoryReadmeRel(agentRoot, parsed.folderPath);
  if (readmePath) {
    try {
      readmeBody = await fs.readFile(path.join(agentRoot, readmePath), "utf-8");
      readmeExists = true;
    } catch {
      readmeExists = false;
      readmeBody = "";
    }
  }

  return {
    ...parsed,
    exists: true,
    hasGit,
    entryCount,
    readmePath,
    readmeExists,
    readmeBody
  };
}

async function listRepositories(agentRoot) {
  const indexOnDisk = await resolveRepositoryIndexFileOnDisk(agentRoot);
  const indexRel = getRepositoryIndexRelPath();
  const groupsCatalog = await readRepositoryGroups(agentRoot);
  const slugs = await listRepositoryFolderSlugs(agentRoot);
  const repositories = [];
  const unregistered = [];
  for (const slug of slugs) {
    const manifestRel = `${AWN_REPOSITORIES_DIR}/${slug}/${REPOSITORY_MANIFEST_FILE}`;
    const entry = await readRepositoryEntry(agentRoot, manifestRel);
    if (entry) {
      repositories.push(entry);
    } else {
      unregistered.push(await buildUnregisteredRepositoryEntry(agentRoot, slug));
    }
  }
  applyGroupsCatalogToRepositories(repositories, groupsCatalog);

  return {
    version: 1,
    model: "awn-repositories-catalog",
    hint:
      "Каталог исходников workspace: только manifest.md, index.md и groups.yml в поиске. " +
      "Содержимое клонов не индексируется — агент знает где код, читает по явному path. " +
      "unregistered — папки в awn-repositories/ без manifest (подхватить через register_repository). " +
      "groups.yml — логические группы sidebar без физических подпапок.",
    root: getRepositoriesRootRel(),
    indexFile: {
      path: indexRel,
      exists: indexOnDisk.exists
    },
    groupsCatalog,
    repositories,
    repositoryCount: repositories.length,
    unregistered,
    unregisteredCount: unregistered.length,
    whenToUse: {
      list_repositories: "Список репозиториев workspace с описаниями из manifest.md.",
      get_repository: "Одна карточка репозитория + body manifest.",
      refresh_repository_index: "Пересобрать awn-repositories/index.md из manifest-ов.",
      register_repository: "Создать manifest.md — в т.ч. для уже существующей папки (подхват)."
    }
  };
}

async function getRepository(agentRoot, inputPath) {
  const normalized = normalizeRelPath(inputPath);
  if (!normalized) {
    return { error: "path is required", status: 400 };
  }

  let manifestRel = normalized;
  if (!manifestRel.startsWith(`${AWN_REPOSITORIES_DIR}/`)) {
    manifestRel = `${AWN_REPOSITORIES_DIR}/${manifestRel.replace(/^\/+/, "")}`;
  }
  if (!/\/manifest\.md$/i.test(manifestRel)) {
    manifestRel = `${manifestRel.replace(/\/manifest\.md$/i, "")}/${REPOSITORY_MANIFEST_FILE}`;
  }
  if (!manifestRel.startsWith(`${AWN_REPOSITORIES_DIR}/`)) {
    return { error: "path must be under awn-repositories/", status: 400 };
  }

  const entry = await readRepositoryEntry(agentRoot, manifestRel);
  if (entry) {
    return {
      version: 1,
      model: "awn-repository",
      repository: { ...entry, registered: true },
      hint: "Исходники лежат в folderPath; для файлов используй read_file с полным workspace path."
    };
  }

  const folderRel = manifestRel.replace(/\/manifest\.md$/i, "");
  const slug = path.posix.basename(folderRel);
  if (!slug || folderRel === AWN_REPOSITORIES_DIR) {
    return { error: "Repository not found", status: 404, path: manifestRel };
  }
  const folderAbs = path.join(agentRoot, folderRel);
  if (!(await pathExists(folderAbs))) {
    return { error: "Repository folder not found", status: 404, path: folderRel };
  }

  const repository = await buildUnregisteredRepositoryEntry(agentRoot, slug);
  return {
    version: 1,
    model: "awn-repository-unregistered",
    repository,
    hint:
      "Папка репозитория без manifest.md. Для регистрации — register_repository или «Подхватить» в UI. " +
      "Файлы читай через read_file с folderPath."
  };
}

function countRepositoryBodyLines(body) {
  const normalized = String(body || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!normalized.trim()) return 0;
  return normalized.split("\n").length;
}

function formatRepositoryIndexFileSize(sizeBytes) {
  if (sizeBytes == null || !Number.isFinite(sizeBytes) || sizeBytes < 0) return "—";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) {
    const kb = sizeBytes / 1024;
    return kb < 10 ? `${kb.toFixed(1)} KB` : `${Math.round(kb)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRepositoryIndexLineCount(lineCount) {
  if (lineCount == null || !Number.isFinite(lineCount) || lineCount < 0) return "—";
  return String(lineCount);
}

function formatRepositoryIndexImportanceCell(importance) {
  return String(parseImportanceValue(importance));
}

async function readRepositoryManifestIndexStats(agentRoot, repo) {
  const manifestRel = String(repo?.manifestPath || "").replace(/\\/g, "/").trim();
  const manifestAbs = manifestRel ? path.join(agentRoot, manifestRel) : "";
  let sizeBytes = null;
  let lineCount = null;
  let importance = 0;

  if (manifestAbs) {
    try {
      const content = await fs.readFile(manifestAbs, "utf-8");
      const stat = await fs.stat(manifestAbs);
      sizeBytes = stat.size;
      const { frontmatter, body } = splitFrontmatter(content);
      lineCount = countRepositoryBodyLines(body);
      importance = parseImportanceValue(getYamlScalar(frontmatter, "awn-importance"));
    } catch {
      sizeBytes = null;
      lineCount = null;
      importance = 0;
    }
  }

  const readmePath = repo?.readmePath || (await resolveRepositoryReadmeRel(agentRoot, repo?.folderPath));
  const readmeExists = Boolean(repo?.readmeExists || readmePath);
  const readmeCell = readmeExists && readmePath
    ? `[README](${encodeContentIndexLinkTarget(readmePath)})`
    : "—";

  return {
    id: repo?.slug || repo?.id || "",
    group: repo?.groupTitle || repo?.group || "—",
    path: repo?.folderPath || "",
    linkPath: manifestRel,
    title: repo?.name || repo?.slug || "",
    description: String(repo?.description || "").trim(),
    sizeBytes,
    lineCount,
    importance,
    readmeCell,
    fileCount: Number.isFinite(Number(repo?.entryCount)) ? Number(repo.entryCount) : null
  };
}

async function buildRepositoryIndexEntries(agentRoot, repositories = []) {
  return Promise.all((repositories || []).map((repo) => readRepositoryManifestIndexStats(agentRoot, repo)));
}

const REPOSITORY_INDEX_IMPORTANCE_LEGEND =
  "* **Важность** — личная важность репозитория для пользователя (`awn-importance` в manifest.md, шкала 0–10).";

const REPOSITORY_INDEX_LINES_LEGEND =
  "* **Строк** — число строк в теле manifest.md (после frontmatter). Если больше 0 — есть инструкция для агента: entry point, ветка, что смотреть в клоне.";

function escapeContentIndexTableCell(value) {
  return String(value || "")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ")
    .trim();
}

function escapeContentIndexLinkText(value) {
  return String(value || "")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .trim();
}

function encodeContentIndexLinkTarget(linkPath) {
  return String(linkPath || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function formatContentIndexTitleCell(entry, { linkTitle = true } = {}) {
  const titleRaw = String(entry.title || "").trim();
  const title = titleRaw || "—";
  if (!linkTitle) return escapeContentIndexTableCell(title);
  const linkPath = String(entry.linkPath || entry.path || "").trim();
  if (!linkPath) return escapeContentIndexTableCell(title);
  const linkText = escapeContentIndexLinkText(titleRaw || "—");
  return `[${linkText}](${encodeContentIndexLinkTarget(linkPath)})`;
}

function formatRepositoryIndexEntriesMarkdown(entries) {
  if (!entries.length) {
    return "_Пока нет репозиториев. Создайте `awn-repositories/{slug}/manifest.md`._";
  }

  const lines = [
    "| ID | Группа | Путь | Название | Описание | Размер | Строк | Важность | README.md | Кол-во файлов |",
    "| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: |"
  ];

  for (const entry of entries) {
    const titleCell = formatContentIndexTitleCell(entry);
    lines.push(
      `| ${escapeContentIndexTableCell(entry.id) || "—"} | ${escapeContentIndexTableCell(entry.group) || "—"} | \`${escapeContentIndexTableCell(entry.path)}\` | ${titleCell} | ${escapeContentIndexTableCell(entry.description) || "—"} | ${formatRepositoryIndexFileSize(entry.sizeBytes)} | ${formatRepositoryIndexLineCount(entry.lineCount)} | ${formatRepositoryIndexImportanceCell(entry.importance)} | ${entry.readmeCell || "—"} | ${entry.fileCount == null ? "—" : String(entry.fileCount)} |`
    );
  }

  return lines.join("\n");
}

async function formatRepositoryIndexMarkdown(agentRoot, repositories) {
  const entries = await buildRepositoryIndexEntries(agentRoot, repositories);
  const lines = [
    "# Каталог репозиториев",
    "",
    formatRepositoryIndexEntriesMarkdown(entries),
    "",
    REPOSITORY_INDEX_IMPORTANCE_LEGEND,
    REPOSITORY_INDEX_LINES_LEGEND
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

async function ensureRepositoriesRoot(agentRoot) {
  const rootAbs = path.join(agentRoot, AWN_REPOSITORIES_DIR);
  await fs.mkdir(rootAbs, { recursive: true });
  return rootAbs;
}

async function writeRepositoryIndex(agentRoot, options = {}) {
  const overwrite = options.overwrite !== false;
  const payload = await listRepositories(agentRoot);
  const indexRel = getRepositoryIndexRelPath();
  const indexOnDisk = await resolveRepositoryIndexFileOnDisk(agentRoot);
  const exists = indexOnDisk.exists;
  if (exists && !overwrite) {
    return {
      error: "Repository index file already exists",
      status: 409,
      indexFile: { path: indexRel, exists: true }
    };
  }

  await ensureRepositoriesRoot(agentRoot);
  const markdown = await formatRepositoryIndexMarkdown(agentRoot, payload.repositories);
  const indexAbs = path.join(agentRoot, indexRel);
  await fs.writeFile(indexAbs, markdown, "utf-8");
  const legacyRel = getRepositoryIndexLegacyRelPath();
  const legacyAbs = path.join(agentRoot, legacyRel);
  if (
    !isSameWorkspaceIndexPath(legacyRel, indexRel) &&
    legacyAbs !== indexAbs &&
    (await pathExists(legacyAbs))
  ) {
    await fs.rm(legacyAbs, { force: true }).catch(() => {});
  }

  return {
    version: 1,
    model: "awn-repositories-index-write",
    hint: "index.md обновлён в awn-repositories/. Просмотр → GET /api/agent/repositories.",
    overwrite,
    written: {
      path: indexRel,
      created: !exists,
      overwritten: exists,
      repositoryCount: payload.repositoryCount
    },
    indexFile: { path: indexRel, exists: true }
  };
}

function formatYamlScalar(value) {
  const text = String(value ?? "").trim();
  if (!text) return '""';
  if (/^[a-z0-9._-]+$/i.test(text)) return text;
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
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

function joinRepositoryManifestContent(frontmatter, body) {
  const fm = String(frontmatter ?? "").trim();
  const mdBody = String(body ?? "").trim();
  if (!fm) return mdBody;
  if (!mdBody) return `---\n${fm}\n---\n`;
  return `---\n${fm}\n---\n\n${mdBody}\n`;
}

function composeRepositoryManifestContent(options = {}) {
  const agentRoot = String(options.agentRoot || "").trim();
  const projectRoot = options.projectRoot || process.cwd();
  const name = String(options.name || "").trim();

  let frontmatter = buildDefaultFrontmatter(REPOSITORY_TYPE_ID, {
    name,
    agentRoot,
    projectRoot,
    skipCanonical: true
  });

  const description = String(options.description || "").trim();
  if (description) {
    frontmatter = upsertYamlScalarLine(frontmatter, "awn-description", description);
  }

  const origin = String(options.origin || options.repoOrigin || "").trim();
  if (origin) {
    frontmatter = upsertYamlScalarLine(frontmatter, "awn-repo-origin", origin);
  }

  const group = String(options.group || "").trim();
  if (group) {
    frontmatter = upsertYamlScalarLine(frontmatter, "awn-repository-group", group);
  }

  const tech = Array.isArray(options.tech)
    ? options.tech
    : parseYamlScalarList(String(options.tech || "").trim());
  if (tech.length) {
    frontmatter = upsertYamlScalarLine(frontmatter, "awn-repo-tech", tech.join(", "));
  }

  if (options.relatedTopic) {
    frontmatter = upsertYamlScalarLine(frontmatter, "awn-repo-related-topic", options.relatedTopic);
  }

  const indexFlags = options.indexExcludeFlags || {
    record: Boolean(options.indexExcludeRecord),
    subtree:
      options.indexExcludeSubtree !== undefined
        ? Boolean(options.indexExcludeSubtree)
        : options.indexExclude
          ? true
          : true
  };
  if (indexFlags?.record) {
    frontmatter = upsertYamlScalarLine(frontmatter, "awn-index-exclude-record", "true");
  }
  frontmatter = upsertYamlScalarLine(
    frontmatter,
    "awn-index-exclude-subtree",
    indexFlags?.subtree !== false ? "true" : "false"
  );

  const body = String(options.body || REPOSITORY_MANIFEST_DEFAULT_BODY).trim();
  return joinRepositoryManifestContent(frontmatter, body);
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

async function updateRepository(agentRoot, inputPath, options = {}) {
  const normalized = normalizeRelPath(inputPath);
  if (!normalized) {
    return { error: "path is required", status: 400 };
  }

  let manifestRel = normalized;
  if (!manifestRel.startsWith(`${AWN_REPOSITORIES_DIR}/`)) {
    manifestRel = `${AWN_REPOSITORIES_DIR}/${manifestRel.replace(/^\/+/, "")}`;
  }
  if (!/\/manifest\.md$/i.test(manifestRel)) {
    manifestRel = `${manifestRel.replace(/\/manifest\.md$/i, "")}/${REPOSITORY_MANIFEST_FILE}`;
  }

  const resolved = resolveWithinAgentRoot(agentRoot, manifestRel);
  if (!resolved) {
    return { error: "Invalid repository path", status: 400 };
  }
  if (!(await pathExists(resolved.targetAbs))) {
    return { error: "Repository manifest not found", status: 404, path: manifestRel };
  }

  let content = "";
  try {
    content = await fs.readFile(resolved.targetAbs, "utf-8");
  } catch {
    return { error: "Repository manifest not found", status: 404, path: manifestRel };
  }

  const patchKeys = [
    ["awn-name", options.name],
    ["awn-description", options.description],
    ["awn-repo-origin", options.origin ?? options.repoOrigin],
    ["awn-repository-group", options.group],
    ["awn-repo-related-topic", options.relatedTopic]
  ];
  for (const [key, value] of patchKeys) {
    if (value === undefined) continue;
    content = setYamlScalarInFrontmatter(content, key, value);
  }

  if (options.group !== undefined) {
    content = setYamlScalarInFrontmatter(
      content,
      "awn-repo-status",
      repositoryGroupIdToManifestStatus(options.group)
    );
  } else if (options.status !== undefined) {
    const status = String(options.status || "").trim().toLowerCase();
    if (status && !REPOSITORY_STATUSES.has(status)) {
      return { error: "Invalid repository status", status: 400 };
    }
    content = setYamlScalarInFrontmatter(content, "awn-repo-status", status || "study");
  }

  if (options.tech !== undefined) {
    const tech = Array.isArray(options.tech)
      ? options.tech
      : parseYamlScalarList(String(options.tech || "").trim());
    content = setYamlScalarInFrontmatter(content, "awn-repo-tech", tech.join(", "));
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
  if (options.group !== undefined) {
    const slug = path.posix.basename(path.posix.dirname(manifestRel));
    await setRepositoryGroupAssignment(agentRoot, slug, options.group);
  }
  const repository = await readRepositoryEntry(agentRoot, manifestRel);
  if (repository) {
    const groupsCatalog = await readRepositoryGroups(agentRoot);
    applyGroupsCatalogToRepositories([repository], groupsCatalog);
  }
  return {
    version: 1,
    model: "awn-repository-update",
    updated: true,
    path: manifestRel,
    repository,
    hint: "Manifest обновлён. refresh_repository_index — если нужна новая строка в index.md."
  };
}

async function registerRepository(agentRoot, options = {}) {
  const slug = String(options.slug || options.id || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!slug || slug.includes("/") || slug.includes("..")) {
    return { error: "slug is required", status: 400 };
  }

  await ensureRepositoriesRoot(agentRoot);
  const folderRel = `${AWN_REPOSITORIES_DIR}/${slug}`;
  const manifestRel = `${folderRel}/${REPOSITORY_MANIFEST_FILE}`;
  const manifestAbs = path.join(agentRoot, manifestRel);
  const folderAbs = path.dirname(manifestAbs);
  const manifestExists = await pathExists(manifestAbs);
  if (manifestExists) {
    return { error: "Repository already exists", status: 409, path: manifestRel };
  }

  const folderExists = await pathExists(folderAbs);
  await fs.mkdir(folderAbs, { recursive: true });
  const content = composeRepositoryManifestContent({ ...options, agentRoot });
  await fs.writeFile(manifestAbs, content, "utf-8");
  if (options.group !== undefined) {
    const groupId = String(options.group || "").trim() || inferRepositoryGroupId({ status: options.status });
    if (groupId) await setRepositoryGroupAssignment(agentRoot, slug, groupId);
  }

  const repository = await readRepositoryEntry(agentRoot, manifestRel);
  if (repository) {
    const groupsCatalog = await readRepositoryGroups(agentRoot);
    applyGroupsCatalogToRepositories([repository], groupsCatalog);
  }
  return {
    version: 1,
    model: "awn-repository-register",
    created: true,
    adopted: folderExists,
    path: manifestRel,
    folderPath: folderRel,
    repository,
    hint: folderExists
      ? "Подхвачена существующая папка — допишите manifest и вызовите refresh_repository_index."
      : "Клонируй код в folderPath. Содержимое не попадёт в semantic search — только manifest."
  };
}

module.exports = {
  AWN_REPOSITORIES_DIR,
  AWN_REPOSITORIES_INDEX_FILE,
  AWN_REPOSITORIES_GROUPS_FILE,
  DEFAULT_REPOSITORY_GROUPS,
  REPOSITORY_TYPE_ID,
  REPOSITORY_MANIFEST_DEFAULT_BODY,
  getRepositoriesRootRel,
  getRepositoryIndexRelPath,
  getRepositoryGroupsRelPath,
  isRepositoryCatalogPath,
  isRepositoryRecordCatalogBasename,
  resolveRepositoryReadmeRel,
  shouldSkipAwnRepositoriesSearch,
  listRepositoryFolderSlugs,
  listRepositories,
  getRepository,
  readRepositoryGroups,
  writeRepositoryGroups,
  setRepositoryGroupAssignment,
  mergeRepositoryGroupsWithDefaults,
  writeRepositoryIndex,
  registerRepository,
  updateRepository,
  formatRepositoryIndexMarkdown,
  formatRepositoryIndexEntriesMarkdown,
  buildRepositoryIndexEntries
};
