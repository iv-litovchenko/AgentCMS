const path = require("path");

/** Единый workspace платформы — источник правды для типов, справочников и групп агентов. */
const AGENT_CMS_CORE_REL = "workspaces/agent-cms-core";

const COMPONENTS_REL = path.join(AGENT_CMS_CORE_REL, "components");

/** Домены каталога типов platform core (под areas/types/) */
const TYPE_CATALOG_REL = "types";
const TYPE_DOMAINS = ["base", "pages", "content", "slots", "fields", "md-blocks"];
/** Встроенная CMS-модель агента (flat YAML: awn-system/types/{domain}/*.yml) */
const AGENT_SYSTEM_REL = "awn-system";
const AGENT_TYPE_DOMAINS = [
  ...TYPE_DOMAINS,
  "taxonomies",
  "mixins"
];

function getTypeDomainAbsolute(projectRoot, domain) {
  return resolvePlatformPath(projectRoot, AGENT_CMS_CORE_REL, TYPE_CATALOG_REL, domain);
}

function getTypeCatalogRootAbsolute(projectRoot) {
  return getAgentCmsCoreAbsolute(projectRoot);
}

function getAgentSystemAbsolute(agentRoot) {
  return path.join(String(agentRoot || "").trim(), AGENT_SYSTEM_REL);
}

function getAgentSystemTypesDir(agentRoot, domain) {
  return path.join(getAgentSystemAbsolute(agentRoot), "types", domain);
}

const CATALOG_KIT_REL = path.join(AGENT_CMS_CORE_REL, "catalog");
const AGENTS_GROUPS_REL = path.join(AGENT_CMS_CORE_REL, "agents-groups");
const AGENTS_GROUPS_FILE = "groups.json";
const PLATFORM_INDEX_REL = path.join(AGENT_CMS_CORE_REL, "index.json");
const TODO_FILE = "TODO.md";
const TODO_CORE_FILE = "TODO-CORE.md";

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
  TYPE_CATALOG_REL,
  TYPE_DOMAINS,
  AGENT_SYSTEM_REL,
  AGENT_TYPE_DOMAINS,
  getAgentSystemAbsolute,
  getAgentSystemTypesDir,
  CATALOG_KIT_REL,
  AGENTS_GROUPS_REL,
  AGENTS_GROUPS_FILE,
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
  getCatalogKitAbsolute,
  getAgentsGroupsJsonAbsolute,
  getAgentsGroupsAssetsAbsolute,
  getPlatformIndexAbsolute,
  getTodoAbsolute,
  getTodoCoreAbsolute,
  readPlatformTodoFooterMarkdown,
  toAgentsGroupsBackgroundRel
};
