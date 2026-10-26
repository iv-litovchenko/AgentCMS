#!/usr/bin/env node
/**
 * agent-cms-cli maintenance — platform maintenance-mode (same as Control toggle).
 */
const path = require("path");
const { findRepoRoot } = require("../lib/desktop/public-url");
const {
  readMaintenanceMode,
  writeMaintenanceMode
} = require("../lib/ops/platform-maintenance-mode");

function usage() {
  console.error(`Usage: agent-cms-cli maintenance status | on | off
       (aliases: enable → on, disable → off)`);
}

function normalizeAction(raw) {
  const a = String(raw || "status").trim().toLowerCase();
  if (a === "enable") return "on";
  if (a === "disable") return "off";
  return a;
}

async function main() {
  const action = normalizeAction(process.argv[2]);
  if (!action || action === "-h" || action === "--help" || action === "help") {
    usage();
    process.exit(action ? 0 : 1);
  }

  const projectRoot = findRepoRoot(path.join(__dirname, ".."));
  process.chdir(projectRoot);

  if (action === "status") {
    const enabled = readMaintenanceMode(projectRoot);
    console.log(enabled ? "on" : "off");
    process.exit(0);
  }

  if (action === "on" || action === "off") {
    const next = action === "on";
    const enabled = writeMaintenanceMode(projectRoot, next);
    if (enabled !== next) {
      console.error("Не удалось сохранить maintenance-mode.");
      process.exit(1);
    }
    console.log(`maintenance-mode: ${enabled ? "on" : "off"}`);
    if (enabled) {
      console.log("Editor / Voice / Commander → 503. Control / app-control остаётся доступен.");
      console.log("Выключить: agent-cms-cli maintenance off");
    }
    process.exit(0);
  }

  usage();
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
