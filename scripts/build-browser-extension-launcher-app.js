#!/usr/bin/env node
/**
 * macOS: мини .app без Electron — открывает папку browser-extension в Finder.
 * dist/browser-extension-launcher/ACMS Browser Extension.app
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const repoRoot = path.join(__dirname, "..");
const EXT_DIR = path.join(repoRoot, "browser-extension");
const OUT_DIR = path.join(repoRoot, "dist/browser-extension-launcher");
const APP_NAME = "ACMS Browser Extension.app";
const LAUNCHER_ICON_REL = "icons/launcher-desktop-icon.png";
const LAUNCHER_ICON_SVG = "icons/launcher-desktop-icon.svg";

function resolveLauncherIconPng(extFolder) {
  const png = path.join(extFolder, LAUNCHER_ICON_REL);
  if (fs.existsSync(png)) return png;
  const svg = path.join(extFolder, LAUNCHER_ICON_SVG);
  if (fs.existsSync(svg) && process.platform === "darwin") {
    const tmpPng = path.join(extFolder, "icons", ".launcher-desktop-icon.generated.png");
    if (svgToPngMac(svg, tmpPng)) return tmpPng;
  }
  const brand = path.join(extFolder, "icons/companion-brand.svg");
  if (fs.existsSync(brand) && process.platform === "darwin") {
    const tmpPng = path.join(extFolder, "icons", ".launcher-brand.generated.png");
    if (svgToPngMac(brand, tmpPng)) return tmpPng;
  }
  return path.join(extFolder, "icons/icon128.png");
}

/** SVG → PNG. qlmanage держит градиент; magick только убирает белые углы превью. */
function svgToPngMac(svgPath, outPng) {
  const outDir = path.dirname(outPng);
  fs.mkdirSync(outDir, { recursive: true });
  try {
    execFileSync("qlmanage", ["-t", "-s", "1024", "-o", outDir, svgPath], { stdio: "ignore" });
    const generated = path.join(outDir, `${path.basename(svgPath)}.png`);
    if (!fs.existsSync(generated)) return false;
    fs.renameSync(generated, outPng);
    for (const cmd of ["magick", "convert"]) {
      try {
        execFileSync(
          cmd,
          [
            outPng,
            "-alpha",
            "set",
            "-fuzz",
            "12%",
            "-fill",
            "none",
            "-draw",
            "color 0,0 floodfill",
            "-draw",
            "color %[fx:w-1],0 floodfill",
            "-draw",
            "color 0,%[fx:h-1] floodfill",
            "-draw",
            "color %[fx:w-1],%[fx:h-1] floodfill",
            outPng
          ],
          { stdio: "ignore" }
        );
        break;
      } catch {
        /* углы останутся белыми, цвет иконки не трогаем */
      }
    }
    return fs.existsSync(outPng);
  } catch {
    return false;
  }
}

function ensureExtensionDir() {
  if (!fs.existsSync(path.join(EXT_DIR, "manifest.json"))) {
    throw new Error(`Не найдена папка расширения: ${EXT_DIR}`);
  }
}

function buildIcns(pngPath, icnsPath) {
  if (!fs.existsSync(pngPath)) return false;
  fs.mkdirSync(path.dirname(icnsPath), { recursive: true });
  const iconsetTmp = fs.mkdtempSync(path.join(os.tmpdir(), "acms-launcher-"));
  const iconset = `${iconsetTmp}.iconset`;
  fs.renameSync(iconsetTmp, iconset);
  try {
    for (const size of [16, 32, 128, 256, 512]) {
      const out1 = path.join(iconset, `icon_${size}x${size}.png`);
      const out2 = path.join(iconset, `icon_${size}x${size}@2x.png`);
      execFileSync("sips", ["-z", String(size), String(size), pngPath, "--out", out1], {
        stdio: "ignore"
      });
      execFileSync("sips", ["-z", String(size * 2), String(size * 2), pngPath, "--out", out2], {
        stdio: "ignore"
      });
    }
    execFileSync("iconutil", ["-c", "icns", iconset, "-o", icnsPath], { stdio: "ignore" });
    return fs.existsSync(icnsPath);
  } catch {
    try {
      execFileSync("sips", ["-s", "format", "icns", pngPath, "--out", icnsPath], { stdio: "ignore" });
      return fs.existsSync(icnsPath);
    } catch {
      return false;
    }
  } finally {
    fs.rmSync(iconset, { recursive: true, force: true });
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
  const iconSrc = resolveLauncherIconPng(extFolder);
  const hasIcon = buildIcns(iconSrc, icnsPath);
  if (!hasIcon) {
    console.warn("⚠ Не удалось собрать AppIcon.icns — на Desktop будет белая иконка по умолчанию.");
  }
  writePlist(appPath, hasIcon);

  return { ok: true, appPath, extensionFolder: extFolder, hasIcon };
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
