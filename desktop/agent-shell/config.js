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
  for (const configPath of getSharedCmsDesktopConfigPaths()) {
    try {
      if (fs.existsSync(configPath)) {
        const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {
      // try next path
    }
  }
  return {};
}

function getCmsBaseUrl() {
  const env = String(process.env.AGENT_CMS_BASE_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");
  const shared = String(loadSharedCmsConfig().cmsBaseUrl || "").trim();
  if (shared) return shared.replace(/\/+$/, "");
  const saved = String(loadConfig().cmsBaseUrl || "").trim();
  if (saved) return saved.replace(/\/+$/, "");
  const port = Number(process.env.PORT || loadConfig().port || 3000);
  return `http://127.0.0.1:${port}`;
}

function getVoiceBaseUrl() {
  const env = String(process.env.AGENT_CMS_VOICE_URL || process.env.VOICE_BASE_URL || "").trim();
  if (env) return env.replace(/\/+$/, "");
  const shared = String(loadSharedCmsConfig().voiceBaseUrl || "").trim();
  if (shared) return shared.replace(/\/+$/, "");
  const saved = String(loadConfig().voiceBaseUrl || "").trim();
  if (saved) return saved.replace(/\/+$/, "");
  const port = Number(process.env.VOICE_PORT || loadConfig().voicePort || 3088);
  return `http://127.0.0.1:${port}`;
}

function getDefaultAgentId() {
  const env = String(process.env.AGENT_CMS_AGENT || "").trim();
  if (env) return env;
  return String(loadConfig().agentId || "agent-cms-test").trim();
}

function getSharedCmsDesktopConfigPath() {
  return getSharedCmsDesktopConfigPaths()[0];
}

function getProjectRoot(defaultRoot) {
  try {
    const shared = loadSharedCmsConfig();
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
  getVoiceBaseUrl,
  getDefaultAgentId,
  getProjectRoot,
  loadSharedCmsConfig,
  getSharedCmsDesktopConfigPath
};
