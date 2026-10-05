#!/usr/bin/env node
/**
 * Patches dist/*.app: icon.icns (Finder/Dock file) + icon.png inside app.asar (Electron runtime).
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const sharp = require("sharp");

const repoRoot = path.join(__dirname, "..");
const asarBin = path.join(repoRoot, "node_modules/@electron/asar/bin/asar.js");

const brands = [
  {
    name: "Agent CMS",
    svgPath: path.join(repoRoot, "public/favicon.svg"),
    pngPath: path.join(repoRoot, "desktop/agent-cms/assets/icon.png"),
    appPath: path.join(repoRoot, "dist/agent-cms", "Agent CMS.app"),
    asarIconPaths: ["electron/assets/icon.png", "desktop/agent-cms/assets/icon.png"]
  },
  {
    name: "Agent Shell",
    svgPath: path.join(repoRoot, "public/shell/favicon.svg"),
    pngPath: path.join(repoRoot, "desktop/agent-shell/assets/icon.png"),
    appPath: path.join(repoRoot, "dist/agent-shell", "Agent Shell.app"),
    asarIconPaths: ["assets/icon.png"]
  },
  {
    name: "Agent CMS Control",
    svgPath: path.join(repoRoot, "desktop/agent-control/assets/favicon.svg"),
    pngPath: path.join(repoRoot, "desktop/agent-control/assets/icon.png"),
    appPath: path.join(repoRoot, "dist/agent-control", "Agent CMS Control.app"),
    asarIconPaths: ["assets/icon.png"]
  }
];

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

function runAsar(args) {
  execFileSync(process.execPath, [asarBin, ...args], { stdio: "pipe" });
}

async function buildIcns(svgPath, outIcnsPath) {
  const svg = fs.readFileSync(svgPath);
  const iconsetDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-iconset-"));

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
    const iconsetPath = `${iconsetDir}.iconset`;
    if (fs.existsSync(iconsetPath)) fs.rmSync(iconsetPath, { recursive: true, force: true });
    throw error;
  }
}

function findAppBundles(appPath) {
  if (!fs.existsSync(appPath)) return [];
  if (appPath.endsWith(".app")) return [appPath];
  const found = [];
  for (const name of fs.readdirSync(appPath)) {
    if (name.endsWith(".app")) found.push(path.join(appPath, name));
  }
  return found;
}

function patchAsarIcon(appBundle, pngPath, asarIconPaths) {
  const asarPath = path.join(appBundle, "Contents/Resources/app.asar");
  if (!fs.existsSync(asarPath) || !fs.existsSync(pngPath)) return 0;

  const extractDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-asar-"));
  const tmpAsar = `${asarPath}.tmp`;
  let replaced = 0;

  try {
    runAsar(["extract", asarPath, extractDir]);
    for (const relPath of asarIconPaths) {
      const dest = path.join(extractDir, relPath);
      if (!fs.existsSync(path.dirname(dest))) continue;
      fs.copyFileSync(pngPath, dest);
      replaced += 1;
      console.log("  asar →", relPath);
    }
    if (!replaced) return 0;
    runAsar(["pack", extractDir, tmpAsar]);
    fs.renameSync(tmpAsar, asarPath);
    return replaced;
  } finally {
    fs.rmSync(extractDir, { recursive: true, force: true });
    if (fs.existsSync(tmpAsar)) fs.rmSync(tmpAsar, { force: true });
  }
}

function refreshLaunchServices(appBundle) {
  try {
    const lsregister =
      "/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister";
    fs.utimesSync(appBundle, new Date(), new Date());
    execFileSync(lsregister, ["-f", appBundle], { stdio: "pipe" });
  } catch {
    // non-fatal
  }
}

async function patchDistIcons() {
  let patched = 0;

  for (const brand of brands) {
    const apps = findAppBundles(brand.appPath);
    if (!apps.length) {
      console.log(`${brand.name}: no dist .app — skip`);
      continue;
    }

    const icnsPath = path.join(
      os.tmpdir(),
      `agent-${brand.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.icns`
    );
    await buildIcns(brand.svgPath, icnsPath);

    for (const appBundle of apps) {
      const icnsDest = path.join(appBundle, "Contents/Resources/icon.icns");
      fs.copyFileSync(icnsPath, icnsDest);
      console.log(`${brand.name} icns →`, path.relative(repoRoot, icnsDest));

      const asarCount = patchAsarIcon(appBundle, brand.pngPath, brand.asarIconPaths);
      if (!asarCount) {
        console.log(`  ${brand.name}: app.asar icon paths not found — rebuild with cms:pack / shell:pack`);
      }

      refreshLaunchServices(appBundle);
      patched += 1;
    }

    fs.rmSync(icnsPath, { force: true });
  }

  if (!patched) {
    console.log("patch-dist-icons: nothing patched (run cms:pack / shell:pack first)");
  } else {
    console.log("patch-dist-icons: quit app, reopen from dist/; if Dock icon stale: killall Dock");
  }
}

module.exports = { patchDistIcons };

if (require.main === module) {
  patchDistIcons().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
