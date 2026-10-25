#!/usr/bin/env node
/**
 * macOS: мини .app без Electron — открывает папку browser-extension в Finder.
 * dist/browser-extension-launcher/ACMS Browser Extension.app
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const repoRoot = path.join(__dirname, "..");
const EXT_DIR = path.join(repoRoot, "browser-extension");
const OUT_DIR = path.join(repoRoot, "dist/browser-extension-launcher");
const APP_NAME = "ACMS Browser Extension.app";
const ICON_PNG = path.join(EXT_DIR, "icons/icon128.png");

function ensureExtensionDir() {
  if (!fs.existsSync(path.join(EXT_DIR, "manifest.json"))) {
    throw new Error(`Не найдена папка расширения: ${EXT_DIR}`);
  }
}

function buildIcns(pngPath, icnsPath) {
  if (!fs.existsSync(pngPath)) return false;
  try {
    fs.mkdirSync(path.dirname(icnsPath), { recursive: true });
    execFileSync("sips", ["-s", "format", "icns", pngPath, "--out", icnsPath], { stdio: "ignore" });
    return fs.existsSync(icnsPath);
  } catch {
    return false;
  }
}

function writePlist(appPath, hasIcon) {
  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>ru</string>
  <key>CFBundleExecutable</key>
  <string>open-extension-folder</string>
  <key>CFBundleIdentifier</key>
  <string>com.agentcms.browser-extension-folder</string>
  <key>CFBundleName</key>
  <string>ACMS Browser Extension</string>
  <key>CFBundleDisplayName</key>
  <string>ACMS Browser Extension</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>1.0.0</string>
  ${hasIcon ? "<key>CFBundleIconFile</key>\n  <string>AppIcon</string>\n  " : ""}<key>LSMinimumSystemVersion</key>
  <string>11.0</string>
</dict>
</plist>
`;
  fs.writeFileSync(path.join(appPath, "Contents/Info.plist"), plist, "utf8");
}

function buildBrowserExtensionLauncherApp(options = {}) {
  const root = path.resolve(options.repoRoot || repoRoot);
  const extFolder = path.join(root, "browser-extension");
  if (!fs.existsSync(path.join(extFolder, "manifest.json"))) {
    throw new Error(`browser-extension не найден: ${extFolder}`);
  }
  if (process.platform !== "darwin") {
    return { ok: false, skipped: true, reason: "macOS only" };
  }

  const appPath = path.join(OUT_DIR, APP_NAME);
  fs.rmSync(appPath, { recursive: true, force: true });
  const macOsDir = path.join(appPath, "Contents/MacOS");
  const resDir = path.join(appPath, "Contents/Resources");
  fs.mkdirSync(macOsDir, { recursive: true });
  fs.mkdirSync(resDir, { recursive: true });

  fs.writeFileSync(path.join(resDir, "extension-folder.txt"), `${extFolder}\n`, "utf8");

  const launcher = `#!/bin/sh
set -e
FOLDER="$(cat "$(dirname "$0")/../Resources/extension-folder.txt" | tr -d '\\r')"
if [ ! -d "$FOLDER" ]; then
  osascript -e 'display alert "Agent CMS" message "Папка расширения не найдена. Пересоберите ярлык: agent-cms electron-app shortcuts." as warning'
  exit 1
fi
open "$FOLDER"
`;
  const binPath = path.join(macOsDir, "open-extension-folder");
  fs.writeFileSync(binPath, launcher, { mode: 0o755 });

  const icnsPath = path.join(resDir, "AppIcon.icns");
  const iconSrc = fs.existsSync(path.join(extFolder, "icons/icon128.png"))
    ? path.join(extFolder, "icons/icon128.png")
    : ICON_PNG;
  const hasIcon = buildIcns(iconSrc, icnsPath);
  writePlist(appPath, hasIcon);

  return { ok: true, appPath, extensionFolder: extFolder };
}

module.exports = { buildBrowserExtensionLauncherApp, APP_NAME, OUT_DIR };

if (require.main === module) {
  try {
    ensureExtensionDir();
    const result = buildBrowserExtensionLauncherApp();
    if (result.skipped) {
      console.log(result.reason);
      process.exit(0);
    }
    console.log(`Готово: ${result.appPath}`);
    console.log(`→ открывает ${result.extensionFolder}`);
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
}
