#!/usr/bin/env node
/**
 * Создаёт ярлыки приложений Agent CMS на рабочем столе (macOS).
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

const repoRoot = path.join(__dirname, "..");

const SHORTCUTS = [
  {
    name: "ACMS-Control.app",
    target: () => path.join(repoRoot, "dist/agent-control/Agent CMS Control.app")
  },
  {
    name: "ACMS.app",
    target: () => path.join(repoRoot, "dist/agent-cms/Agent CMS.app")
  },
  {
    name: "ACMS-Voice.app",
    target: () => path.join(repoRoot, "dist/agent-shell/Agent Shell.app")
  }
];

const LEGACY_SHORTCUTS = [
  "Agent CMS Control.app",
  "Agent CMS.app",
  "Agent CMS Voice.app"
];

function getDesktopDir() {
  const home = os.homedir();
  for (const folder of ["Desktop", "Рабочий стол"]) {
    const dir = path.join(home, folder);
    if (fs.existsSync(dir)) return dir;
  }
  return path.join(home, "Desktop");
}

function removePath(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  const stat = fs.lstatSync(targetPath);
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    fs.rmSync(targetPath, { recursive: true, force: true });
    return;
  }
  fs.unlinkSync(targetPath);
}

function linkShortcut(desktopDir, name, targetPath) {
  const absTarget = path.resolve(targetPath);
  if (!fs.existsSync(absTarget)) {
    return { ok: false, missing: absTarget };
  }

  const linkPath = path.join(desktopDir, name);
  removePath(linkPath);
  fs.symlinkSync(absTarget, linkPath);
  return { ok: true, linkPath };
}

async function createDesktopShortcuts() {
  if (process.platform !== "darwin") {
    throw new Error("Ярлыки на рабочем столе поддерживаются только на macOS.");
  }

  const desktopDir = getDesktopDir();
  console.log(`Рабочий стол: ${desktopDir}\n`);

  for (const legacyName of LEGACY_SHORTCUTS) {
    const legacyPath = path.join(desktopDir, legacyName);
    if (fs.existsSync(legacyPath)) {
      removePath(legacyPath);
      console.log(`  ✕ убран старый ярлык ${legacyName}`);
    }
  }

  let created = 0;

  for (const entry of SHORTCUTS) {
    if (entry.ensure) await entry.ensure();

    const target = entry.target();
    const result = linkShortcut(desktopDir, entry.name, target);
    if (result.ok) {
      console.log(`  ✓ ${entry.name} → ${path.relative(repoRoot, target)}`);
      created += 1;
      continue;
    }

    console.log(`  – ${entry.name} — нет сборки (${path.relative(repoRoot, target)})`);
  }

  console.log("");
  if (created === 0) {
    throw new Error("Не удалось создать ярлыки. Сначала соберите приложения в Control.");
  }

  console.log(`Готово: ${created} ярлык(ов) на рабочем столе.`);
  if (created < SHORTCUTS.length) {
    console.log("Остальные появятся после «Собрать» в разделе Приложения.");
  }

  return { ok: true, created, desktopDir };
}

module.exports = { createDesktopShortcuts, getDesktopDir, linkShortcut, SHORTCUTS };

if (require.main === module) {
  createDesktopShortcuts().catch((error) => {
    console.error(error.message || error);
    process.exit(1);
  });
}
