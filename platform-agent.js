const { AGENT_CMS_CORE_REL, getPlatformAgentRootAbsolute: resolvePlatformRoot } = require("./platform-sources");

const PLATFORM_AGENT_ID = "platform";
const PLATFORM_AGENT_PATH = `./${AGENT_CMS_CORE_REL.replace(/\\/g, "/")}`;
const PLATFORM_KIT_FOLDER = "catalog";
const PLATFORM_AGENT_NAME = "Платформа";

function isPlatformAgentId(agentId) {
  return String(agentId || "").trim() === PLATFORM_AGENT_ID;
}

function getPlatformAgentRootAbsolute(projectRoot) {
  return resolvePlatformRoot(projectRoot);
}

function buildPlatformAgentEntry(projectRoot) {
  const rootAbsolute = getPlatformAgentRootAbsolute(projectRoot);
  let folderExists = false;
  try {
    const fs = require("fs");
    folderExists = fs.existsSync(rootAbsolute);
  } catch {
    folderExists = false;
  }
  return {
    id: PLATFORM_AGENT_ID,
    name: PLATFORM_AGENT_NAME,
    path: PLATFORM_AGENT_PATH,
    rootAbsolute,
    environment: "platform",
    comment: "Глобальные справочники: теги, категории, статусы, пользователи, приоритеты, палитра",
    default: false,
    orchestrator: false,
    active: true,
    virtual: true,
    registryEditable: false,
    folderExists
  };
}

module.exports = {
  PLATFORM_AGENT_ID,
  PLATFORM_AGENT_PATH,
  PLATFORM_KIT_FOLDER,
  PLATFORM_AGENT_NAME,
  isPlatformAgentId,
  getPlatformAgentRootAbsolute,
  buildPlatformAgentEntry
};
