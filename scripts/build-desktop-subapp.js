#!/usr/bin/env node
/**
 * Сборка desktop/agent-shell или desktop/agent-control через electron-builder.
 * Electron установлен только в корне репозитория — передаём electronVersion явно.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const subapp = process.argv[2];
const mode = process.argv[3] === "pack" ? "pack" : "dist";
const allowed = new Set(["agent-shell", "agent-control", "agent-commander"]);
if (!allowed.has(subapp)) {
  console.error(
    "Usage: node scripts/build-desktop-subapp.js <agent-shell|agent-control|agent-commander> [pack|dist]"
  );
  process.exit(1);
}

const root = path.join(__dirname, "..");
const projectDir = path.join(root, "desktop", subapp);

/** electron-builder не упаковывает ../shared — копируем в subapp перед сборкой */
function syncPackAssets() {
  const sharedSrc = path.join(root, "desktop", "shared");
  const sharedDst = path.join(projectDir, "shared");
  fs.rmSync(sharedDst, { recursive: true, force: true });
  fs.cpSync(sharedSrc, sharedDst, { recursive: true });

  const libDstDir = path.join(projectDir, "lib", "desktop");
  fs.mkdirSync(libDstDir, { recursive: true });
  fs.copyFileSync(
    path.join(root, "lib", "desktop", "public-url.js"),
    path.join(libDstDir, "public-url.js")
  );
}
const electronPkg = require(path.join(root, "node_modules", "electron", "package.json"));
const electronVersion = electronPkg.version;

const builderBin = path.join(root, "node_modules", ".bin", "electron-builder");

const builderArgs = [
  "--config.electronVersion",
  electronVersion,
  "--config.npmRebuild=false",
  "--config.nodeGypRebuild=false"
];
if (mode === "pack") builderArgs.push("--dir");

console.log(`build-desktop-subapp: ${subapp} ${mode} (electron ${electronVersion})`);
syncPackAssets();

execFileSync(
  builderBin,
  builderArgs,
  {
    cwd: projectDir,
    stdio: "inherit",
    env: {
      ...process.env,
      PATH: `/opt/homebrew/bin:/usr/local/bin:${process.env.PATH || ""}`
    }
  }
);
