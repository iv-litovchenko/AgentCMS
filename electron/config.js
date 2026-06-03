const fs = require("fs");
const path = require("path");
const { app } = require("electron");

function getConfigPath() {
  return path.join(app.getPath("userData"), "desktop-config.json");
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

function getProjectRoot(defaultRoot) {
  const saved = loadConfig().projectRoot;
  if (saved && fs.existsSync(saved)) {
    return path.resolve(saved);
  }
  return path.resolve(defaultRoot);
}

module.exports = {
  loadConfig,
  saveConfig,
  getProjectRoot
};
