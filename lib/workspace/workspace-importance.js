const fs = require("fs/promises");
const path = require("path");

const { listDirChainFromStart, manifestRelForDir, normalizeInputPath } = require("./workspace-path-resolver");

const IMPORTANCE_FIELD_KEY = "awn-importance";

function parseFrontmatterScalar(content, key) {
  const text = String(content || "");
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function parseImportanceValue(raw, fallback = 0) {
  const text = String(raw ?? "").trim();
  if (!text) return fallback;
  const parsed = Number(text);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(10, Math.round(parsed)));
}

function importanceBoostMultiplier(importance) {
  const value = parseImportanceValue(importance);
  if (value <= 0) return 1;
  return 1 + value * 0.1;
}

function createWorkspaceImportanceResolver(deps = {}) {
  const resolvePathAbsolute = deps.resolvePathAbsolute;
  const cache = new Map();

  async function readImportanceFromRelPath(relPath) {
    const key = String(relPath || "").replace(/\\/g, "/").trim();
    if (!key) return 0;
    if (cache.has(key)) return cache.get(key);

    const absolute = resolvePathAbsolute ? resolvePathAbsolute(key) : null;
    if (!absolute) {
      cache.set(key, 0);
      return 0;
    }

    try {
      const content = await fs.readFile(absolute, "utf8");
      const value = parseImportanceValue(parseFrontmatterScalar(content, IMPORTANCE_FIELD_KEY));
      cache.set(key, value);
      return value;
    } catch {
      cache.set(key, 0);
      return 0;
    }
  }

  async function resolveEffectiveImportance(relPath) {
    const normalized = normalizeInputPath(relPath);
    if (!normalized) return 0;

    const values = [];
    if (/\.md$/i.test(normalized)) {
      values.push(await readImportanceFromRelPath(normalized));
    }

    let walkStart = normalized;
    if (/\.[^/]+$/i.test(normalized)) {
      const parent = path.posix.dirname(normalized);
      walkStart = parent === "." ? "" : parent;
    }

    for (const dirRel of listDirChainFromStart(walkStart)) {
      values.push(await readImportanceFromRelPath(manifestRelForDir(dirRel)));
    }

    return values.reduce((max, value) => Math.max(max, value), 0);
  }

  async function applyImportanceBoostToHits(hits) {
    if (!Array.isArray(hits) || !hits.length) return hits || [];

    const boosted = [];
    for (const hit of hits) {
      const importance = await resolveEffectiveImportance(hit.path);
      const multiplier = importanceBoostMultiplier(importance);
      const baseScore = Number(hit.score) || 0;
      boosted.push({
        ...hit,
        importance,
        baseScore,
        score: baseScore * multiplier
      });
    }
    return boosted;
  }

  return {
    IMPORTANCE_FIELD_KEY,
    parseImportanceValue,
    importanceBoostMultiplier,
    resolveEffectiveImportance,
    applyImportanceBoostToHits
  };
}

module.exports = {
  IMPORTANCE_FIELD_KEY,
  parseImportanceValue,
  importanceBoostMultiplier,
  createWorkspaceImportanceResolver
};
