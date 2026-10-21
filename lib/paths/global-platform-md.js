const path = require("path");

/** Platform-wide agent docs (skills) live at repository root. */
const GLOBAL_PLATFORM_MD_REL = ".";

/** @deprecated former folder under workspaces/ */
const LEGACY_GLOBAL_PLATFORM_MD_REL = "workspaces/0-md";

const GLOBAL_PLATFORM_MD_FILE_NAMES = new Set([
  "GLOBAL-SKILL-0-MCP-WELCOME.md",
  "GLOBAL-SKILL-1-BASE.md",
  "GLOBAL-SKILL-2-RESPONSE-STYLE.md",
  "GLOBAL-SKILL-3-RULES.md",
  "GLOBAL-SKILL-4-MARKDOWN.md",
  "GLOBAL-SKILL-5-SEARCH.md",
  "GLOBAL-SKILL-6-MODULES.md",
  "GLOBAL-SKILL-7-VIZ-MAPS.md"
]);

/** @deprecated old basenames → canonical files at repo root */
const GLOBAL_PLATFORM_MD_LEGACY_ALIASES = {
  "MCP-INSTRUCTIONS.md": "GLOBAL-SKILL-0-MCP-WELCOME.md",
  "GLOBAL-SKILL-1-BASE.md": "GLOBAL-SKILL-1-BASE.md",
  "GLOBAL-SKILL-2-RESPONSE-STYLE.md": "GLOBAL-SKILL-2-RESPONSE-STYLE.md",
  "GLOBAL-SKILL-3-RULES.md": "GLOBAL-SKILL-3-RULES.md",
  "GLOBAL-SKILL-4-MARKDOWN.md": "GLOBAL-SKILL-4-MARKDOWN.md",
  "GLOBAL-SKILL-5-SEARCH.md": "GLOBAL-SKILL-5-SEARCH.md",
  "GLOBAL-SKILL-6-MODULES.md": "GLOBAL-SKILL-6-MODULES.md",
  "GLOBAL-SKILL-7-VIZ-MAPS.md": "GLOBAL-SKILL-7-VIZ-MAPS.md"
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
  return path.resolve(projectRoot || process.cwd());
}

function normalizeGlobalPlatformMdFileName(fileName) {
  const trimmed = String(fileName || "").trim().replace(/\\/g, "/");
  if (!trimmed || trimmed.includes("..")) return "";
  if (trimmed.includes("/")) {
    const legacyPrefix = `${LEGACY_GLOBAL_PLATFORM_MD_REL}/`;
    if (trimmed.startsWith(legacyPrefix)) {
      return path.basename(trimmed.slice(legacyPrefix.length));
    }
    if (trimmed.startsWith("./")) {
      return path.basename(trimmed.slice(2));
    }
    return "";
  }
  return path.basename(trimmed);
}

function resolveGlobalPlatformMdAbs(projectRoot, fileName) {
  const base = canonicalGlobalPlatformMdFileName(fileName);
  if (!base) return null;
  const root = path.resolve(projectRoot || process.cwd());
  const absolute = path.join(root, base);
  const resolved = path.resolve(absolute);
  if (!resolved.startsWith(root)) return null;
  return resolved;
}

function globalPlatformMdDisplayPath(fileName) {
  const base = canonicalGlobalPlatformMdFileName(fileName);
  return base || "";
}

module.exports = {
  GLOBAL_PLATFORM_MD_REL,
  LEGACY_GLOBAL_PLATFORM_MD_REL,
  GLOBAL_PLATFORM_MD_FILE_NAMES,
  getGlobalPlatformMdDirAbs,
  normalizeGlobalPlatformMdFileName,
  isGlobalPlatformMdFileName,
  resolveGlobalPlatformMdAbs,
  globalPlatformMdDisplayPath,
  canonicalGlobalPlatformMdFileName,
  GLOBAL_PLATFORM_MD_LEGACY_ALIASES
};
