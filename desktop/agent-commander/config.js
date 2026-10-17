const path = require("path");
const { app } = require("electron");
const { loadAgentCmsPortsModule } = require("./ports-resolve");
const { getAgentCmsPorts, hydrateProcessEnvFromRoot } = loadAgentCmsPortsModule();
const {
  REPO_ROOT,
  resolveCommanderProjectRoot,
  hasCommanderPublic,
  commanderIndexPath
} = require("./project-root");

function getSharedCmsDesktopConfigPaths() {
  const home = app.getPath("home");
  if (process.platform === "darwin") {
    return [
      path.join(home, "Library", "Application Support", "agent-cms", "desktop-config.json"),
      path.join(home, "Library", "Application Support", "Agent CMS", "desktop-config.json")
    ];
  }
  return [
    path.join(app.getPath("appData"), "agent-cms", "desktop-config.json"),
    path.join(app.getPath("appData"), "Agent CMS", "desktop-config.json")
  ];
}

function loadSharedCmsConfig() {
  const fs = require("fs");
  for (const configPath of getSharedCmsDesktopConfigPaths()) {
    try {
      if (fs.existsSync(configPath)) {
        const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {
      // try next
    }
  }
  return {};
}

function getProjectRoot() {
  const shared = loadSharedCmsConfig();
  return resolveCommanderProjectRoot({
    envRoot: process.env.AGENT_CMS_ROOT,
    execSearchRoot: app?.isPackaged ? path.dirname(process.execPath) : null,
    devFallback: REPO_ROOT,
    sharedProjectRoot: shared.projectRoot
  });
}

function getCommanderPort(projectRoot = getProjectRoot()) {
  hydrateProcessEnvFromRoot(projectRoot);
  return getAgentCmsPorts().commanderHttp;
}

function getCommanderBaseUrl(projectRoot = getProjectRoot()) {
  const port = getCommanderPort(projectRoot);
  return `http://127.0.0.1:${port}/`;
}

module.exports = {
  getProjectRoot,
  getCommanderPort,
  getCommanderBaseUrl,
  loadSharedCmsConfig,
  hasCommanderPublic,
  commanderIndexPath
};
