const fs = require("fs");
const path = require("path");
const { app } = require("electron");
const { loadAgentCmsPortsModule } = require("./ports-resolve");
const { getAgentCmsPorts, hydrateProcessEnvFromRoot } = loadAgentCmsPortsModule();

const REPO_ROOT = path.join(__dirname, "..", "..");

function findRepoRoot(startDir) {
  let current = path.resolve(startDir);
  for (let depth = 0; depth < 8; depth += 1) {
    const pkgPath = path.join(current, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.name === "agent-cms") return current;
      } catch {
        // ignore
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

function getProjectRoot(fallback = REPO_ROOT) {
  const envRoot = String(process.env.AGENT_CMS_ROOT || "").trim();
  if (envRoot && fs.existsSync(envRoot)) return envRoot;

  if (app?.isPackaged) {
    const fromExec = findRepoRoot(path.dirname(process.execPath));
    if (fromExec) return fromExec;
    return path.dirname(process.execPath);
  }

  return fallback;
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
  getCommanderBaseUrl
};
