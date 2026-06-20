const path = require("path");

const PLATFORM_AGENT_ID = "platform";
const PLATFORM_AGENT_PATH = "./data/catalog";
const PLATFORM_KIT_FOLDER = "catalog";
const PLATFORM_AGENT_NAME = "Платформа";

function isPlatformAgentId(agentId) {
  return String(agentId || "").trim() === PLATFORM_AGENT_ID;
}

function getPlatformAgentRootAbsolute(projectRoot) {
  return path.join(projectRoot, "data/catalog");
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
