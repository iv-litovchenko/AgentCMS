const path = require("path");

/** Platform-wide agent docs (skills) live under _skills_/ at repository root. */
const GLOBAL_PLATFORM_MD_REL = "_skills_";

/** @deprecated former folder name before _skills_ */
const LEGACY_SKILLS_FOLDER_REL = "skills";

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
  "GLOBAL-SKILL-7-VIZ-MAPS.md",
  "GLOBAL-SKILL-8-SLOTS-LEGACY.md"
]);

/** @deprecated old basenames → canonical files in _skills_/ */
const GLOBAL_PLATFORM_MD_LEGACY_ALIASES = {
  "MCP-INSTRUCTIONS.md": "GLOBAL-SKILL-0-MCP-WELCOME.md",
  "GLOBAL-SKILL-1-BASE.md": "GLOBAL-SKILL-1-BASE.md",
  "GLOBAL-SKILL-2-RESPONSE-STYLE.md": "GLOBAL-SKILL-2-RESPONSE-STYLE.md",
  "GLOBAL-SKILL-3-RULES.md": "GLOBAL-SKILL-3-RULES.md",
  "GLOBAL-SKILL-4-MARKDOWN.md": "GLOBAL-SKILL-4-MARKDOWN.md",
  "GLOBAL-SKILL-5-SEARCH.md": "GLOBAL-SKILL-5-SEARCH.md",
  "GLOBAL-SKILL-6-MODULES.md": "GLOBAL-SKILL-6-MODULES.md",
  "GLOBAL-SKILL-7-VIZ-MAPS.md": "GLOBAL-SKILL-7-VIZ-MAPS.md",
  "GLOBAL-SKILL-8-SLOTS-LEGACY.md": "GLOBAL-SKILL-8-SLOTS-LEGACY.md"
};

const GLOBAL_PLATFORM_MD_GITHUB_RAW_PREFIX =
  "https://raw.githubusercontent.com/iv-litovchenko/AgentCMS/main/_skills_/";

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
  const root = path.resolve(projectRoot || process.cwd());
  return path.join(root, GLOBAL_PLATFORM_MD_REL);
}

function normalizeGlobalPlatformMdFileName(fileName) {
  const trimmed = String(fileName || "").trim().replace(/\\/g, "/");
  if (!trimmed || trimmed.includes("..")) return "";
  if (trimmed.includes("/")) {
    const skillsPrefix = `${GLOBAL_PLATFORM_MD_REL}/`;
    if (trimmed.startsWith(skillsPrefix)) {
      return path.basename(trimmed.slice(skillsPrefix.length));
    }
    const legacySkillsPrefix = `${LEGACY_SKILLS_FOLDER_REL}/`;
    if (trimmed.startsWith(legacySkillsPrefix)) {
      return path.basename(trimmed.slice(legacySkillsPrefix.length));
    }
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
  const absolute = path.join(root, GLOBAL_PLATFORM_MD_REL, base);
  const resolved = path.resolve(absolute);
  const skillsRoot = path.resolve(getGlobalPlatformMdDirAbs(root));
  if (!resolved.startsWith(skillsRoot)) return null;
  return resolved;
}

function globalPlatformMdDisplayPath(fileName) {
  const base = canonicalGlobalPlatformMdFileName(fileName);
  if (!base) return "";
  return `${GLOBAL_PLATFORM_MD_REL}/${base}`;
}

function globalPlatformMdGithubRawUrl(fileName) {
  const base = canonicalGlobalPlatformMdFileName(fileName);
  if (!base || !GLOBAL_PLATFORM_MD_FILE_NAMES.has(base)) return "";
  return `${GLOBAL_PLATFORM_MD_GITHUB_RAW_PREFIX}${encodeURIComponent(base)}`;
}

module.exports = {
  GLOBAL_PLATFORM_MD_REL,
  LEGACY_GLOBAL_PLATFORM_MD_REL,
  LEGACY_SKILLS_FOLDER_REL,
  GLOBAL_PLATFORM_MD_FILE_NAMES,
  GLOBAL_PLATFORM_MD_GITHUB_RAW_PREFIX,
  getGlobalPlatformMdDirAbs,
  normalizeGlobalPlatformMdFileName,
  isGlobalPlatformMdFileName,
  resolveGlobalPlatformMdAbs,
  globalPlatformMdDisplayPath,
  globalPlatformMdGithubRawUrl,
  canonicalGlobalPlatformMdFileName,
  GLOBAL_PLATFORM_MD_LEGACY_ALIASES
};
