const path = require("path");
const fs = require("fs/promises");
const { resolveIndexExcludeFlags } = require("../../workspace/workspace-index-exclude");

const MANIFEST_NAMES = new Set(["manifest.md", "readme.md"]);

function normalizeRelPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function isManifestRelPath(relPath) {
  const base = path.posix.basename(normalizeRelPath(relPath)).toLowerCase();
  return MANIFEST_NAMES.has(base);
}

async function buildSubtreeExcludePrefixes(relFiles, resolvePathAbsolute) {
  const prefixes = [];
  const seen = new Set();
  for (const relPath of relFiles || []) {
    if (!isManifestRelPath(relPath)) continue;
    const normalized = normalizeRelPath(relPath);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    const absolute = resolvePathAbsolute ? resolvePathAbsolute(normalized) : null;
    if (!absolute) continue;
    let content = "";
    try {
      content = await fs.readFile(absolute, "utf-8");
    } catch {
      continue;
    }
    if (!resolveIndexExcludeFlags(content).subtree) continue;
    const dir = path.posix.dirname(normalized);
    prefixes.push(dir === "." ? "" : dir);
  }
  return prefixes;
}

function isUnderSubtreeExcludePrefixes(relPath, prefixes) {
  if (!Array.isArray(prefixes) || !prefixes.length) return false;
  const normalized = normalizeRelPath(relPath);
  if (!normalized) return false;
  for (const prefix of prefixes) {
    if (prefix === "") {
      if (!normalized.includes("/")) return true;
      continue;
    }
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

module.exports = {
  buildSubtreeExcludePrefixes,
  isUnderSubtreeExcludePrefixes
};
