const path = require("path");

/** Platform-wide agent docs (skills, MCP instructions, rules). */
const GLOBAL_PLATFORM_MD_REL = "workspaces/0-md";

const GLOBAL_PLATFORM_MD_FILE_NAMES = new Set([
  "GLOBAL-SKILL-1-BASE.md",
  "GLOBAL-SKILL-2-RESPONSE-STYLE.md",
  "GLOBAL-SKILL-3-RULES.md",
  "GLOBAL-SKILL-4-MARKDOWN.md",
  "GLOBAL-SKILL-5-SEARCH.md",
  "GLOBAL-SKILL-6-MODULES.md",
  "MCP-INSTRUCTIONS.md"
]);

/** @deprecated old basenames → canonical files in workspaces/0-md */
const GLOBAL_PLATFORM_MD_LEGACY_ALIASES = {
  "GLOBAL-SKILL-1-BASE.md": "GLOBAL-SKILL-1-BASE.md",
  "GLOBAL-SKILL-2-RESPONSE-STYLE.md": "GLOBAL-SKILL-2-RESPONSE-STYLE.md",
  "GLOBAL-SKILL-3-RULES.md": "GLOBAL-SKILL-3-RULES.md",
  "GLOBAL-SKILL-4-MARKDOWN.md": "GLOBAL-SKILL-4-MARKDOWN.md",
  "GLOBAL-SKILL-5-SEARCH.md": "GLOBAL-SKILL-5-SEARCH.md",
  "GLOBAL-SKILL-6-MODULES.md": "GLOBAL-SKILL-6-MODULES.md"
};

function canonicalGlobalPlatformMdFileName(fileName) {
  const base = normalizeGlobalPlatformMdFileName(fileName);
  if (!base) return "";
  return GLOBAL_PLATFORM_MD_LEGACY_ALIASES[base] || base;
}

function isGlobalPlatformMdFileName(fileName) {
  const base = canonicalGlobalPlatformMdFileName(fileName);
  return Boolean(base && GLOBAL_PLATFORM_MD_FILE_NAMES.has(base));
}

function getGlobalPlatformMdDirAbs(projectRoot) {
  return path.join(path.resolve(projectRoot || process.cwd()), GLOBAL_PLATFORM_MD_REL);
}

function normalizeGlobalPlatformMdFileName(fileName) {
  const trimmed = String(fileName || "").trim().replace(/\\/g, "/");
  if (!trimmed || trimmed.includes("..")) return "";
  if (trimmed.includes("/")) {
    const prefix = `${GLOBAL_PLATFORM_MD_REL}/`;
    if (trimmed.startsWith(prefix)) {
      return path.basename(trimmed.slice(prefix.length));
    }
    return "";
  }
  return path.basename(trimmed);
}

function resolveGlobalPlatformMdAbs(projectRoot, fileName) {
  const base = canonicalGlobalPlatformMdFileName(fileName);
  if (!base) return null;
  const dir = getGlobalPlatformMdDirAbs(projectRoot);
  const absolute = path.join(dir, base);
  const root = path.resolve(projectRoot || process.cwd());
  const resolved = path.resolve(absolute);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function globalPlatformMdDisplayPath(fileName) {
  const base = canonicalGlobalPlatformMdFileName(fileName);
  return base ? `${GLOBAL_PLATFORM_MD_REL}/${base}` : "";
}

module.exports = {
  GLOBAL_PLATFORM_MD_REL,
  GLOBAL_PLATFORM_MD_FILE_NAMES,
  getGlobalPlatformMdDirAbs,
  normalizeGlobalPlatformMdFileName,
  isGlobalPlatformMdFileName,
  resolveGlobalPlatformMdAbs,
  globalPlatformMdDisplayPath,
  canonicalGlobalPlatformMdFileName,
  GLOBAL_PLATFORM_MD_LEGACY_ALIASES
};
