const fs = require("fs");
const path = require("path");
const { app } = require("electron");

function getConfigPath() {
  return path.join(app.getPath("userData"), "shell-config.json");
}

function loadConfig() {
  try {
    const raw = fs.readFileSync(getConfigPath(), "utf-8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveConfig(partial) {
  const next = { ...loadConfig(), ...partial };
  fs.mkdirSync(path.dirname(getConfigPath()), { recursive: true });
  fs.writeFileSync(getConfigPath(), `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  return next;
}

function getCmsBaseUrl() {
  const env = String(process.env.AGENT_CMS_BASE_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");
  const saved = String(loadConfig().cmsBaseUrl || "").trim();
  if (saved) return saved.replace(/\/+$/, "");
  const port = Number(process.env.PORT || loadConfig().port || 3000);
  return `http://127.0.0.1:${port}`;
}

function getDefaultAgentId() {
  const env = String(process.env.AGENT_CMS_AGENT || "").trim();
  if (env) return env;
  return String(loadConfig().agentId || "agent-cms-test").trim();
}

function getSharedCmsDesktopConfigPath() {
  if (process.platform === "darwin") {
    return path.join(app.getPath("home"), "Library", "Application Support", "Agent CMS", "desktop-config.json");
  }
  return path.join(app.getPath("appData"), "Agent CMS", "desktop-config.json");
}

function getProjectRoot(defaultRoot) {
  try {
    const shared = JSON.parse(fs.readFileSync(getSharedCmsDesktopConfigPath(), "utf-8"));
    if (shared?.projectRoot && fs.existsSync(shared.projectRoot)) {
      return path.resolve(shared.projectRoot);
    }
  } catch {
    // ignore
  }
  const saved = loadConfig().projectRoot;
  if (saved && fs.existsSync(saved)) {
    return path.resolve(saved);
  }
  return path.resolve(defaultRoot);
}

module.exports = {
  loadConfig,
  saveConfig,
  getCmsBaseUrl,
  getDefaultAgentId,
  getProjectRoot
};
