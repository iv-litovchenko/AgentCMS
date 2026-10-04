const path = require("path");
const fs = require("fs/promises");

const DEFAULT_SKIP_DIR_NAMES = new Set([
  ".git",
  "node_modules",
  ".obsidian",
  "awn-temp",
  "awn-media-cloud",
  "awn-google-drive"
]);

const DEFAULT_SKIP_PATH_PREFIXES = [
  ".agent-cms/cache/",
  ".agent-cms/index/",
  ".agent-cms/semantic/"
];

const MAX_EMPTY_FOLDER_HINTS = 80;

/** Finder / Explorer metadata — not meaningful content for gitkeep hints */
const IGNORED_EMPTY_DIR_FILE_NAMES = new Set([
  ".DS_Store",
  "Thumbs.db",
  ".localized",
  "desktop.ini"
]);

function normalizeRepoRelPath(value) {
  return String(value || "")
    .normalize("NFC")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function joinRepoAbsolutePath(repoAbsolute, relDir) {
  const parts = normalizeRepoRelPath(relDir).split("/").filter(Boolean);
  return parts.length ? path.join(repoAbsolute, ...parts) : repoAbsolute;
}

function isIgnoredEmptyDirFileName(name) {
  return IGNORED_EMPTY_DIR_FILE_NAMES.has(String(name || ""));
}

function shouldSkipDir(relDir, dirName) {
  if (DEFAULT_SKIP_DIR_NAMES.has(dirName)) return true;
  const rel = normalizeRepoRelPath(relDir ? `${relDir}/${dirName}` : dirName);
  const relSlash = `${rel}/`;
  return DEFAULT_SKIP_PATH_PREFIXES.some(
    (prefix) => relSlash === prefix || relSlash.startsWith(prefix)
  );
}

/**
 * Directory tree has no regular files (except .gitkeep at this level).
 * Subdirs may exist; emptiness is evaluated per directory node for gitkeep hints.
 */
async function scanEmptyFolderCandidates(repoAbsolute, relDir = "") {
  const absDir = joinRepoAbsolutePath(repoAbsolute, relDir);
  let entries;
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return { hasNonGitkeepFile: false, hasGitkeep: false, emptyHints: [] };
  }

  let hasNonGitkeepFile = false;
  let hasGitkeep = false;
  const emptyHints = [];
  const subdirs = [];

  for (const entry of entries) {
    const entryName = String(entry.name || "").normalize("NFC");
    if (!entry.isDirectory() && !entry.isFile()) continue;
    if (entry.isFile()) {
      if (entryName === ".gitkeep") hasGitkeep = true;
      else if (!isIgnoredEmptyDirFileName(entryName)) hasNonGitkeepFile = true;
      continue;
    }
    if (shouldSkipDir(relDir, entryName)) continue;
    subdirs.push(entryName);
  }

  for (const name of subdirs) {
    const childRel = normalizeRepoRelPath(relDir ? `${relDir}/${name}` : name);
    const child = await scanEmptyFolderCandidates(repoAbsolute, childRel);
    if (child.hasNonGitkeepFile) hasNonGitkeepFile = true;
    if (child.hasGitkeep) hasGitkeep = true;
    emptyHints.push(...child.emptyHints);
  }

  const relNormalized = normalizeRepoRelPath(relDir);
  if (
    relNormalized &&
    !hasGitkeep &&
    !hasNonGitkeepFile &&
    subdirs.length === 0
  ) {
    emptyHints.push(relNormalized);
  }

  return { hasNonGitkeepFile, hasGitkeep, emptyHints };
}

async function findEmptyFolderGitkeepHints(repoAbsolute, options = {}) {
  const root = String(repoAbsolute || "").trim();
  if (!root) {
    return { count: 0, folders: [] };
  }
  const maxHints = Number(options.maxHints) > 0 ? Number(options.maxHints) : MAX_EMPTY_FOLDER_HINTS;
  const { emptyHints } = await scanEmptyFolderCandidates(root, "");
  const unique = [...new Set(emptyHints.map(normalizeRepoRelPath).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "ru", { sensitivity: "base", numeric: true })
  );
  return {
    count: unique.length,
    folders: unique.slice(0, maxHints),
    truncated: unique.length > maxHints
  };
}

module.exports = {
  findEmptyFolderGitkeepHints,
  normalizeRepoRelPath
};
