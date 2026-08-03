const path = require("path");

/** Единый workspace платформы — источник правды для типов, справочников и групп агентов. */
const AGENT_CMS_CORE_REL = "workspaces/agent-cms-core";

const COMPONENTS_REL = path.join(AGENT_CMS_CORE_REL, "components");

const AWN_DATA_REL = "awn-data";
const CMS_BASE_REL = path.join(AWN_DATA_REL, "cms-base");
/** @deprecated use CMS_BASE_REL */
const CMS_CONFIG_REL = CMS_BASE_REL;

const TYPE_DOMAINS = ["base", "pages", "content", "slots", "fields"];
/** CMS-модель агента — конфиг и registry в awn-data/cms-base/ */
const AGENT_SYSTEM_REL = CMS_CONFIG_REL;
const AGENT_TYPE_DOMAINS = [
  ...TYPE_DOMAINS,
  "mixins",
  "settings"
];

function getAwnDataAbsolute(agentRoot) {
  return path.join(String(agentRoot || "").trim(), AWN_DATA_REL);
}

function getCmsConfigAbsolute(agentRoot) {
  return path.join(String(agentRoot || "").trim(), CMS_CONFIG_REL);
}

function getTypeDomainAbsolute(projectRoot, domain) {
  return resolvePlatformPath(projectRoot, AGENT_CMS_CORE_REL, AWN_DATA_REL, domain);
}

function getTypeCatalogRootAbsolute(projectRoot) {
  return getAgentCmsCoreAbsolute(projectRoot);
}

function getAgentSystemAbsolute(agentRoot) {
  return getCmsConfigAbsolute(agentRoot);
}

const AWN_DATA_TAXONOMIES_REL = path.join(AGENT_CMS_CORE_REL, "awn-data", "taxonomies");
const AGENT_REGISTRY_GROUPS_REL = path.join(AGENT_CMS_CORE_REL, "awn-data/agent-registry/agent-groups");
const AGENT_GROUPS_ATTACHMENTS_REL = path.join(
  AGENT_REGISTRY_GROUPS_REL,
  "awn-storage/assets/attachments"
);
const PLATFORM_INDEX_REL = path.join(AGENT_CMS_CORE_REL, "index.json");
const TODO_FILE = "TODO.md";
const TODO_CORE_FILE = "TODO-CORE.md";

/** Относительный путь к фону группы (в frontmatter записей). */
const AGENTS_GROUPS_ASSETS_PUBLIC_PREFIX = path.posix.join(
  AGENT_CMS_CORE_REL.replace(/\\/g, "/"),
  "awn-data/agent-registry/agent-groups/awn-storage/assets/attachments"
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

function getAwnDataTaxonomiesAbsolute(projectRoot) {
  return resolvePlatformPath(projectRoot, AWN_DATA_TAXONOMIES_REL);
}

function getAgentsGroupsAssetsAbsolute(projectRoot) {
  return resolvePlatformPath(projectRoot, AGENT_GROUPS_ATTACHMENTS_REL);
}

function getPlatformIndexAbsolute(projectRoot) {
  return resolvePlatformPath(projectRoot, PLATFORM_INDEX_REL);
}

function getTodoAbsolute(projectRoot) {
  return resolvePlatformPath(projectRoot, AGENT_CMS_CORE_REL, TODO_FILE);
}

function getTodoCoreAbsolute(projectRoot) {
  return resolvePlatformPath(projectRoot, AGENT_CMS_CORE_REL, TODO_CORE_FILE);
}

async function readPlatformTodoFooterMarkdown(projectRoot) {
  const fs = require("fs/promises");
  const todoAbs = getTodoAbsolute(projectRoot);
  const coreAbs = getTodoCoreAbsolute(projectRoot);
  let todo = "";
  let core = "";
  let todoExists = false;
  let coreExists = false;

  try {
    todo = await fs.readFile(todoAbs, "utf-8");
    todoExists = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  try {
    core = await fs.readFile(coreAbs, "utf-8");
    coreExists = true;
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const parts = [];
  if (todo.trim()) {
    parts.push(todo.trim());
  } else {
    parts.push(`_${TODO_FILE} пуст или не найден_`);
  }
  parts.push("", "---", "", `## ${TODO_CORE_FILE}`, "");
  if (core.trim()) {
    parts.push(core.trim());
  } else {
    parts.push(`_${TODO_CORE_FILE} пуст или не найден_`);
  }

  return {
    content: parts.join("\n"),
    todoExists,
    coreExists,
    todoPath: path.posix.join(AGENT_CMS_CORE_REL.replace(/\\/g, "/"), TODO_FILE),
    corePath: path.posix.join(AGENT_CMS_CORE_REL.replace(/\\/g, "/"), TODO_CORE_FILE)
  };
}

function toAgentsGroupsBackgroundRel(fileName) {
  const base = path.posix.basename(String(fileName || "").replace(/\\/g, "/"));
  if (!base) return null;
  return `${AGENTS_GROUPS_ASSETS_PUBLIC_PREFIX}/${base}`;
}

module.exports = {
  AGENT_CMS_CORE_REL,
  COMPONENTS_REL,
  AWN_DATA_REL,
  CMS_BASE_REL,
  CMS_CONFIG_REL,
  TYPE_DOMAINS,
  AGENT_SYSTEM_REL,
  AGENT_TYPE_DOMAINS,
  getAwnDataAbsolute,
  getCmsConfigAbsolute,
  getAgentSystemAbsolute,
  AWN_DATA_TAXONOMIES_REL,
  AGENT_REGISTRY_GROUPS_REL,
  AGENT_GROUPS_ATTACHMENTS_REL,
  AGENTS_GROUPS_ASSETS_PUBLIC_PREFIX,
  PLATFORM_INDEX_REL,
  TODO_FILE,
  TODO_CORE_FILE,
  resolvePlatformPath,
  getAgentCmsCoreAbsolute,
  getPlatformAgentRootAbsolute,
  getComponentsAbsolute,
  getTypeDomainAbsolute,
  getTypeCatalogRootAbsolute,
  getAwnDataTaxonomiesAbsolute,
  getAgentsGroupsAssetsAbsolute,
  getPlatformIndexAbsolute,
  getTodoAbsolute,
  getTodoCoreAbsolute,
  readPlatformTodoFooterMarkdown,
  toAgentsGroupsBackgroundRel
};
