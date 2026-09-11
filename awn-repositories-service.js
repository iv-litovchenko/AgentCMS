const fs = require("fs/promises");
const path = require("path");

const AWN_REPOSITORIES_DIR = "awn-repositories";
const AWN_REPOSITORIES_INDEX_FILE = "INDEX.md";
const REPOSITORY_MANIFEST_FILE = "manifest.md";
const REPOSITORY_TYPE_ID = "awn.repository";

const REPOSITORY_STATUSES = new Set(["active", "study", "archived", "vendored"]);

const REPOSITORY_MANIFEST_TEMPLATE = `---
awn-type: ${REPOSITORY_TYPE_ID}
awn-name: "Название репозитория"
awn-description: "Кратко: зачем клон, что смотреть"
awn-repo-origin: ""
awn-repo-status: study
awn-repo-tech: []
awn-runtime-index: manifest-only
---

Описание для агента и человека: entry point, ветка, связь с темами CMS.
`;

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

function isRepositoryCatalogPath(relPath) {
  const normalized = normalizeRelPath(relPath);
  if (normalized === getRepositoryIndexRelPath()) return true;
  if (/^awn-repositories\/[^/]+\/manifest\.md$/i.test(normalized)) return true;
  return false;
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
    runtimeIndex: getYamlScalar(frontmatter, "awn-runtime-index") || "manifest-only",
    awnType: getYamlScalar(frontmatter, "awn-type") || REPOSITORY_TYPE_ID,
    body: String(body || "").trim()
  };
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
  try {
    hasGit = await pathExists(path.join(folderAbs, ".git"));
    const children = await fs.readdir(folderAbs, { withFileTypes: true });
    entryCount = children.filter((entry) => entry.name !== REPOSITORY_MANIFEST_FILE).length;
  } catch {
    // ignore
  }
  return {
    slug,
    folderPath: folderRel,
    manifestPath: `${folderRel}/${REPOSITORY_MANIFEST_FILE}`,
    hasGit,
    entryCount,
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
  const repoAbs = path.dirname(manifestAbs);
  hasGit = await pathExists(path.join(repoAbs, ".git"));
  try {
    const children = await fs.readdir(repoAbs, { withFileTypes: true });
    entryCount = children.filter((entry) => entry.name !== REPOSITORY_MANIFEST_FILE).length;
  } catch {
    entryCount = null;
  }

  return {
    ...parsed,
    exists: true,
    hasGit,
    entryCount
  };
}

async function listRepositories(agentRoot) {
  const indexRel = getRepositoryIndexRelPath();
  const indexAbs = path.join(agentRoot, indexRel);
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

  return {
    version: 1,
    model: "awn-repositories-catalog",
    hint:
      "Каталог исходников workspace: только manifest.md и INDEX.md в поиске. " +
      "Содержимое клонов не индексируется — агент знает где код, читает по явному path. " +
      "unregistered — папки в awn-repositories/ без manifest (подхватить через register_repository).",
    root: getRepositoriesRootRel(),
    indexFile: {
      path: indexRel,
      exists: await pathExists(indexAbs)
    },
    repositories,
    repositoryCount: repositories.length,
    unregistered,
    unregisteredCount: unregistered.length,
    whenToUse: {
      list_repositories: "Список репозиториев workspace с описаниями из manifest.md.",
      get_repository: "Одна карточка репозитория + body manifest.",
      refresh_repository_index: "Пересобрать awn-repositories/INDEX.md из manifest-ов.",
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
  if (!entry) {
    return { error: "Repository manifest not found", status: 404, path: manifestRel };
  }

  return {
    version: 1,
    model: "awn-repository",
    repository: entry,
    hint: "Исходники лежат в folderPath; для файлов используй read_file с полным workspace path."
  };
}

function repositoryToIndexEntry(repo) {
  return {
    path: repo.folderPath,
    linkPath: repo.manifestPath,
    type: "repository",
    title: repo.name,
    description: [repo.description, repo.status !== "study" ? repo.status : ""].filter(Boolean).join(" · ")
  };
}

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

function formatRepositoryIndexMarkdown(repositories) {
  const entries = repositories.map(repositoryToIndexEntry);
  const lines = [
    "# Каталог репозиториев",
    "",
    "_Исходники проектов workspace. Индексируются только эта таблица и manifest.md каждого репозитория._",
    ""
  ];
  if (!entries.length) {
    lines.push("_Пока нет репозиториев. Создайте `awn-repositories/{slug}/manifest.md`._");
  } else {
    lines.push("| Статус | Путь | Название | Описание |", "| --- | --- | --- | --- |");
    for (const repo of repositories) {
      const entry = repositoryToIndexEntry(repo);
      lines.push(
        `| ${escapeContentIndexTableCell(repo.status) || "—"} | \`${escapeContentIndexTableCell(entry.path)}\` | ${formatContentIndexTitleCell(entry)} | ${escapeContentIndexTableCell(entry.description) || "—"} |`
      );
    }
  }
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
  const indexAbs = path.join(agentRoot, indexRel);
  const exists = await pathExists(indexAbs);
  if (exists && !overwrite) {
    return {
      error: "Repository index file already exists",
      status: 409,
      indexFile: { path: indexRel, exists: true }
    };
  }

  await ensureRepositoriesRoot(agentRoot);
  const markdown = formatRepositoryIndexMarkdown(payload.repositories);
  await fs.writeFile(indexAbs, markdown, "utf-8");

  return {
    version: 1,
    model: "awn-repositories-index-write",
    hint: "INDEX.md обновлён в awn-repositories/. Просмотр → GET /api/agent/repositories.",
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
  let content = REPOSITORY_MANIFEST_TEMPLATE;
  const name = String(options.name || "").trim();
  const description = String(options.description || "").trim();
  const origin = String(options.origin || options.repoOrigin || "").trim();
  if (name) content = content.replace('awn-name: "Название репозитория"', `awn-name: "${name.replace(/"/g, '\\"')}"`);
  if (description) {
    content = content.replace(
      'awn-description: "Кратко: зачем клон, что смотреть"',
      `awn-description: "${description.replace(/"/g, '\\"')}"`
    );
  }
  if (origin) content = content.replace('awn-repo-origin: ""', `awn-repo-origin: "${origin.replace(/"/g, '\\"')}"`);
  if (options.body) {
    content = content.replace(
      /Описание для агента[\s\S]*$/,
      `${String(options.body).trim()}\n`
    );
  }
  await fs.writeFile(manifestAbs, content, "utf-8");

  const repository = await readRepositoryEntry(agentRoot, manifestRel);
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
  REPOSITORY_TYPE_ID,
  REPOSITORY_MANIFEST_TEMPLATE,
  getRepositoriesRootRel,
  getRepositoryIndexRelPath,
  isRepositoryCatalogPath,
  shouldSkipAwnRepositoriesSearch,
  listRepositoryFolderSlugs,
  listRepositories,
  getRepository,
  writeRepositoryIndex,
  registerRepository,
  formatRepositoryIndexMarkdown
};
