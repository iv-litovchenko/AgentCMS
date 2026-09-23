const fs = require("fs/promises");
const path = require("path");

const { listDirChainFromStart, manifestRelForDir, normalizeInputPath } = require("./workspace-path-resolver");

const INDEX_EXCLUDE_FIELD_KEY = "awn-index-exclude";

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

function createWorkspaceIndexExcludeResolver(deps = {}) {
  const resolvePathAbsolute = deps.resolvePathAbsolute;
  const cache = new Map();

  async function readIndexExcludeFromRelPath(relPath) {
    const key = String(relPath || "").replace(/\\/g, "/").trim();
    if (!key) return false;
    if (cache.has(key)) return cache.get(key);

    const absolute = resolvePathAbsolute ? resolvePathAbsolute(key) : null;
    if (!absolute) {
      cache.set(key, false);
      return false;
    }

    try {
      const content = await fs.readFile(absolute, "utf8");
      const value = parseFrontmatterBoolean(content, INDEX_EXCLUDE_FIELD_KEY);
      cache.set(key, value);
      return value;
    } catch {
      cache.set(key, false);
      return false;
    }
  }

  async function isPathExcluded(relPath) {
    const normalized = normalizeInputPath(relPath);
    if (!normalized) return false;

    const values = [];
    if (/\.md$/i.test(normalized)) {
      values.push(await readIndexExcludeFromRelPath(normalized));
    }

    let walkStart = normalized;
    if (/\.[^/]+$/i.test(normalized)) {
      const parent = path.posix.dirname(normalized);
      walkStart = parent === "." ? "" : parent;
    }

    for (const dirRel of listDirChainFromStart(walkStart)) {
      values.push(await readIndexExcludeFromRelPath(manifestRelForDir(dirRel)));
    }

    return values.some(Boolean);
  }

  return {
    INDEX_EXCLUDE_FIELD_KEY,
    parseIndexExcludeValue,
    isPathExcluded
  };
}

module.exports = {
  INDEX_EXCLUDE_FIELD_KEY,
  parseIndexExcludeValue,
  createWorkspaceIndexExcludeResolver
};
