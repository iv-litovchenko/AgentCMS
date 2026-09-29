const fs = require("fs/promises");
const path = require("path");

const { listDirChainFromStart, manifestRelForDir, normalizeInputPath } = require("./workspace-path-resolver");

const INDEX_EXCLUDE_LEGACY_FIELD_KEY = "awn-index-exclude";
const INDEX_EXCLUDE_RECORD_FIELD_KEY = "awn-index-exclude-record";
const INDEX_EXCLUDE_SUBTREE_FIELD_KEY = "awn-index-exclude-subtree";

const INDEX_EXCLUDE_RECORD_BASENAMES = ["manifest.md", "readme.md"];

/** @deprecated use INDEX_EXCLUDE_LEGACY_FIELD_KEY */
const INDEX_EXCLUDE_FIELD_KEY = INDEX_EXCLUDE_LEGACY_FIELD_KEY;

function normalizeRelPathCase(relPath) {
  return String(relPath || "").replace(/\\/g, "/").trim();
}

function pathsEqualCaseInsensitive(left, right) {
  const a = normalizeRelPathCase(left).toLowerCase();
  const b = normalizeRelPathCase(right).toLowerCase();
  return Boolean(a && b && a === b);
}

function isIndexExcludeRecordBasename(baseName) {
  const lower = String(baseName || "").trim().toLowerCase();
  return INDEX_EXCLUDE_RECORD_BASENAMES.includes(lower);
}

function isIndexExcludeRecordPath(relPath) {
  const normalized = normalizeRelPathCase(relPath);
  if (!normalized) return false;
  return isIndexExcludeRecordBasename(path.posix.basename(normalized));
}

function parseIndexExcludeValue(raw) {
  const text = String(raw ?? "").trim().toLowerCase();
  if (!text) return false;
  return text === "true" || text === "1" || text === "yes";
}

function parseFrontmatterBoolean(content, key) {
  const text = String(content || "");
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) return false;
  return parseIndexExcludeValue(match[1].trim().replace(/^["']|["']$/g, ""));
}

function resolveIndexExcludeFlags(content) {
  const legacy = parseFrontmatterBoolean(content, INDEX_EXCLUDE_LEGACY_FIELD_KEY);
  const record =
    parseFrontmatterBoolean(content, INDEX_EXCLUDE_RECORD_FIELD_KEY) || legacy;
  const subtree =
    parseFrontmatterBoolean(content, INDEX_EXCLUDE_SUBTREE_FIELD_KEY) || legacy;
  return { record, subtree, legacy };
}

function parsePayloadIndexExcludeFlags(payload = {}) {
  const legacy = parseIndexExcludeValue(
    payload.indexExclude ?? payload[INDEX_EXCLUDE_LEGACY_FIELD_KEY]
  );
  const record = parseIndexExcludeValue(
    payload.indexExcludeRecord ??
      payload[INDEX_EXCLUDE_RECORD_FIELD_KEY] ??
      (legacy ? true : undefined)
  );
  const subtree = parseIndexExcludeValue(
    payload.indexExcludeSubtree ??
      payload[INDEX_EXCLUDE_SUBTREE_FIELD_KEY] ??
      (legacy ? true : undefined)
  );
  return { record, subtree };
}

async function resolveIndexManifestRelForDir(dirRel, resolvePathAbsolute) {
  const normalizedDir = normalizeRelPathCase(dirRel);
  const dirAbsolute = resolvePathAbsolute
    ? resolvePathAbsolute(normalizedDir || ".")
    : null;

  if (dirAbsolute) {
    try {
      const entries = await fs.readdir(dirAbsolute);
      for (const target of INDEX_EXCLUDE_RECORD_BASENAMES) {
        const match = entries.find((name) => String(name).toLowerCase() === target);
        if (!match) continue;
        return normalizedDir ? `${normalizedDir}/${match}` : match;
      }
    } catch {
      // fallback below
    }
  }

  return manifestRelForDir(normalizedDir);
}

function createWorkspaceIndexExcludeResolver(deps = {}) {
  const resolvePathAbsolute = deps.resolvePathAbsolute;
  const cache = new Map();

  async function readIndexFlagsFromRelPath(relPath) {
    const key = normalizeRelPathCase(relPath);
    if (!key) return { record: false, subtree: false, legacy: false };
    if (cache.has(key)) return cache.get(key);

    const absolute = resolvePathAbsolute ? resolvePathAbsolute(key) : null;
    if (!absolute) {
      const empty = { record: false, subtree: false, legacy: false };
      cache.set(key, empty);
      return empty;
    }

    try {
      const content = await fs.readFile(absolute, "utf8");
      const flags = resolveIndexExcludeFlags(content);
      cache.set(key, flags);
      return flags;
    } catch {
      const empty = { record: false, subtree: false, legacy: false };
      cache.set(key, empty);
      return empty;
    }
  }

  async function isPathExcluded(relPath) {
    const normalized = normalizeInputPath(relPath);
    if (!normalized) return false;

    if (/\.md$/i.test(normalized)) {
      const own = await readIndexFlagsFromRelPath(normalized);
      if (own.record) return true;
    }

    let walkStart = normalized;
    if (/\.[^/]+$/i.test(normalized)) {
      const parent = path.posix.dirname(normalized);
      walkStart = parent === "." ? "" : parent;
    }

    for (const dirRel of listDirChainFromStart(walkStart)) {
      const manifestRel = await resolveIndexManifestRelForDir(dirRel, resolvePathAbsolute);
      const manifestFlags = await readIndexFlagsFromRelPath(manifestRel);
      const isOwnContainerManifest =
        pathsEqualCaseInsensitive(normalized, manifestRel) ||
        (isIndexExcludeRecordPath(normalized) &&
          pathsEqualCaseInsensitive(path.posix.dirname(normalized), dirRel || ""));
      if (!isOwnContainerManifest && manifestFlags.subtree) {
        return true;
      }
    }

    return false;
  }

  return {
    INDEX_EXCLUDE_LEGACY_FIELD_KEY,
    INDEX_EXCLUDE_RECORD_FIELD_KEY,
    INDEX_EXCLUDE_SUBTREE_FIELD_KEY,
    INDEX_EXCLUDE_FIELD_KEY,
    parseIndexExcludeValue,
    resolveIndexExcludeFlags,
    parsePayloadIndexExcludeFlags,
    isPathExcluded,
    readIndexFlagsFromRelPath,
    resolveIndexManifestRelForDir: (dirRel) =>
      resolveIndexManifestRelForDir(dirRel, resolvePathAbsolute)
  };
}

module.exports = {
  INDEX_EXCLUDE_LEGACY_FIELD_KEY,
  INDEX_EXCLUDE_RECORD_FIELD_KEY,
  INDEX_EXCLUDE_SUBTREE_FIELD_KEY,
  INDEX_EXCLUDE_FIELD_KEY,
  INDEX_EXCLUDE_RECORD_BASENAMES,
  parseIndexExcludeValue,
  resolveIndexExcludeFlags,
  parsePayloadIndexExcludeFlags,
  isIndexExcludeRecordBasename,
  isIndexExcludeRecordPath,
  pathsEqualCaseInsensitive,
  resolveIndexManifestRelForDir,
  createWorkspaceIndexExcludeResolver
};
