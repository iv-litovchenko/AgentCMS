#!/usr/bin/env node
/**
 * Создаёт Agent CMS Control.app в корне репозитория — ярлык с иконкой для Finder/Dock.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const sharp = require("sharp");

const repoRoot = path.join(__dirname, "..");
const appName = "Agent CMS Control";
const appPath = path.join(repoRoot, `${appName}.app`);
const svgPath = path.join(repoRoot, "desktop/agent-control/assets/favicon.svg");

const ICONSET_SIZES = [
  [16, "icon_16x16.png"],
  [32, "icon_16x16@2x.png"],
  [32, "icon_32x32.png"],
  [64, "icon_32x32@2x.png"],
  [128, "icon_128x128.png"],
  [256, "icon_128x128@2x.png"],
  [256, "icon_256x256.png"],
  [512, "icon_256x256@2x.png"],
  [512, "icon_512x512.png"],
  [1024, "icon_512x512@2x.png"]
];

async function buildIcns(outIcnsPath) {
  const svg = fs.readFileSync(svgPath);
  const iconsetDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-control-root-iconset-"));

  try {
    for (const [size, filename] of ICONSET_SIZES) {
      await sharp(svg).resize(size, size).png().toFile(path.join(iconsetDir, filename));
    }
    const iconsetPath = `${iconsetDir}.iconset`;
    fs.renameSync(iconsetDir, iconsetPath);
    fs.mkdirSync(path.dirname(outIcnsPath), { recursive: true });
    execFileSync("iconutil", ["-c", "icns", iconsetPath, "-o", outIcnsPath], { stdio: "pipe" });
    fs.rmSync(iconsetPath, { recursive: true, force: true });
  } catch (error) {
    fs.rmSync(iconsetDir, { recursive: true, force: true });
    throw error;
  }
}

function writeLauncher(contentsPath) {
  const script = `#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
export AGENT_CMS_ROOT="$ROOT"
exec bash "$ROOT/scripts/launch-agent-control.sh"
`;
  fs.writeFileSync(contentsPath, script, { mode: 0o755 });
}

function writeInfoPlist(contentsDir) {
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleExecutable</key>
  <string>Agent CMS Control</string>
  <key>CFBundleIconFile</key>
  <string>icon</string>
  <key>CFBundleIdentifier</key>
  <string>com.agentcms.control.launcher</string>
  <key>CFBundleName</key>
  <string>Agent CMS Control</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>CFBundleVersion</key>
  <string>0.1.0</string>
  <key>LSMinimumSystemVersion</key>
  <string>11.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
`;
  fs.writeFileSync(path.join(contentsDir, "Info.plist"), plist);
}

async function buildRootApp() {
  if (!fs.existsSync(svgPath)) {
    throw new Error(`Icon not found: ${svgPath}`);
  }

  if (fs.existsSync(appPath)) {
    fs.rmSync(appPath, { recursive: true, force: true });
  }

  const contentsDir = path.join(appPath, "Contents");
  const macOsDir = path.join(contentsDir, "MacOS");
  const resourcesDir = path.join(contentsDir, "Resources");
  fs.mkdirSync(macOsDir, { recursive: true });
  fs.mkdirSync(resourcesDir, { recursive: true });

  writeInfoPlist(contentsDir);
  writeLauncher(path.join(macOsDir, "Agent CMS Control"));
  await buildIcns(path.join(resourcesDir, "icon.icns"));

  try {
    const lsregister =
      "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";
    fs.utimesSync(appPath, new Date(), new Date());
    execFileSync(lsregister, ["-f", appPath], { stdio: "pipe" });
  } catch {
    // non-fatal
  }

  console.log(`build-control-root-app: ${path.relative(repoRoot, appPath)}`);
}

module.exports = { buildRootApp };

if (require.main === module) {
  buildRootApp().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
