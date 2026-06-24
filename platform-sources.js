const path = require("path");

/** Единый workspace платформы — источник правды для типов, справочников и групп агентов. */
const AGENT_CMS_CORE_REL = "workspaces/agent-cms-core";

const COMPONENTS_REL = path.join(AGENT_CMS_CORE_REL, "components");

const CATALOG_KIT_REL = path.join(AGENT_CMS_CORE_REL, "catalog");
const AGENTS_GROUPS_REL = path.join(AGENT_CMS_CORE_REL, "agents-groups");
const AGENTS_GROUPS_FILE = "groups.json";
const PLATFORM_INDEX_REL = path.join(AGENT_CMS_CORE_REL, "index.json");

/** Относительный URL-префикс для фонов групп (хранится в groups.json). */
const AGENTS_GROUPS_ASSETS_PUBLIC_PREFIX = path.posix.join(
  AGENT_CMS_CORE_REL.replace(/\\/g, "/"),
  "agents-groups"
);

function resolvePlatformPath(projectRoot, ...segments) {
  return path.join(projectRoot || process.cwd(), ...segments);
}

function getAgentCmsCoreAbsolute(projectRoot) {
  return resolvePlatformPath(projectRoot, AGENT_CMS_CORE_REL);
}

function getPlatformAgentRootAbsolute(projectRoot) {
  return getAgentCmsCoreAbsolute(projectRoot);
}

function getComponentsAbsolute(projectRoot) {
  return resolvePlatformPath(projectRoot, COMPONENTS_REL);
}

function getCatalogKitAbsolute(projectRoot) {
  return resolvePlatformPath(projectRoot, CATALOG_KIT_REL);
}

function getAgentsGroupsJsonAbsolute(projectRoot) {
  return resolvePlatformPath(projectRoot, AGENTS_GROUPS_REL, AGENTS_GROUPS_FILE);
}

function getAgentsGroupsAssetsAbsolute(projectRoot) {
  return resolvePlatformPath(projectRoot, AGENTS_GROUPS_REL);
}

function getPlatformIndexAbsolute(projectRoot) {
  return resolvePlatformPath(projectRoot, PLATFORM_INDEX_REL);
}

function toAgentsGroupsBackgroundRel(fileName) {
  const base = path.posix.basename(String(fileName || "").replace(/\\/g, "/"));
  if (!base) return null;
  return `${AGENTS_GROUPS_ASSETS_PUBLIC_PREFIX}/${base}`;
}

module.exports = {
  AGENT_CMS_CORE_REL,
  COMPONENTS_REL,
  CATALOG_KIT_REL,
  AGENTS_GROUPS_REL,
  AGENTS_GROUPS_FILE,
  AGENTS_GROUPS_ASSETS_PUBLIC_PREFIX,
  PLATFORM_INDEX_REL,
  resolvePlatformPath,
  getAgentCmsCoreAbsolute,
  getPlatformAgentRootAbsolute,
  getComponentsAbsolute,
  getCatalogKitAbsolute,
  getAgentsGroupsJsonAbsolute,
  getAgentsGroupsAssetsAbsolute,
  getPlatformIndexAbsolute,
  toAgentsGroupsBackgroundRel
};
