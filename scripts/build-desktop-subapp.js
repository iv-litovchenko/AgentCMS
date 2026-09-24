#!/usr/bin/env node
/**
 * Сборка desktop/agent-shell или desktop/agent-control через electron-builder.
 * Electron установлен только в корне репозитория — передаём electronVersion явно.
 */
const { execFileSync } = require("child_process");
const path = require("path");

const subapp = process.argv[2];
const allowed = new Set(["agent-shell", "agent-control"]);
if (!allowed.has(subapp)) {
  console.error("Usage: node scripts/build-desktop-subapp.js <agent-shell|agent-control>");
  process.exit(1);
}

const root = path.join(__dirname, "..");
const projectDir = path.join(root, "desktop", subapp);
const electronPkg = require(path.join(root, "node_modules", "electron", "package.json"));
const electronVersion = electronPkg.version;

const builderBin = path.join(root, "node_modules", ".bin", "electron-builder");

console.log(`build-desktop-subapp: ${subapp} (electron ${electronVersion})`);

execFileSync(
  builderBin,
  ["--config.electronVersion", electronVersion],
  {
    cwd: projectDir,
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ""}`
    }
  }
);
