/**
 * Read/write platform maintenance-mode in .agent-cms-global/settings/platform.yml
 * (no js-yaml — safe for agent-cms-cli on host without npm install).
 */
const fs = require("fs");
const { platformSettingsAbs } = require("../paths/agent-cms");

const MAINTENANCE_LINE_RE = /^(\s*maintenance-mode:\s*)(true|false)\s*$/m;

function readMaintenanceMode(projectRoot) {
  const filePath = platformSettingsAbs(projectRoot);
  if (!fs.existsSync(filePath)) return false;
  const text = fs.readFileSync(filePath, "utf8");
  const match = text.match(MAINTENANCE_LINE_RE);
  if (!match) return false;
  return match[2] === "true";
}

function writeMaintenanceMode(projectRoot, enabled) {
  const filePath = platformSettingsAbs(projectRoot);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Нет файла ${filePath}`);
  }
  const nextVal = enabled ? "true" : "false";
  let text = fs.readFileSync(filePath, "utf8");
  if (MAINTENANCE_LINE_RE.test(text)) {
    text = text.replace(MAINTENANCE_LINE_RE, `$1${nextVal}`);
  } else if (/^awn_settings:\s*$/m.test(text)) {
    text = text.replace(/^awn_settings:\s*$/m, `awn_settings:\n  maintenance-mode: ${nextVal}`);
  } else {
    throw new Error("В platform.yml не найден ключ maintenance-mode");
  }
  fs.writeFileSync(filePath, text.endsWith("\n") ? text : `${text}\n`, "utf8");
  return readMaintenanceMode(projectRoot);
}

module.exports = {
  readMaintenanceMode,
  writeMaintenanceMode
};
