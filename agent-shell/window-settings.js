const fs = require("fs/promises");
const path = require("path");

const AWN_SHELL_FILE = "awn-shell.json";

const WINDOW_PROFILE_NORMAL = {
  width: 460,
  height: 780,
  minWidth: 320,
  minHeight: 500
};

const WINDOW_PROFILE_COMPACT = {
  width: 300,
  height: 148,
  minWidth: 260,
  minHeight: 120
};

const WINDOW_PROFILE_COMPACT_QA = {
  width: 340,
  height: 460,
  minWidth: 300,
  minHeight: 320
};

const DEFAULT_WINDOW_SETTINGS = {
  windowTopmost: true,
  windowTransparent: false,
  windowBackground: "wallpaper",
  windowCompact: false,
  windowPetOverlay: false,
  compactDialogQa: true
};

function windowSettingsPath(projectRoot) {
  return path.join(projectRoot, AWN_SHELL_FILE);
}

function normalizeWindowSettings(raw) {
  const merged = {
    ...DEFAULT_WINDOW_SETTINGS,
    ...(raw && typeof raw === "object" ? raw : {})
  };
  merged.windowTopmost = merged.windowTopmost !== false;
  merged.windowTransparent = Boolean(merged.windowTransparent);
  const bg = String(merged.windowBackground || "wallpaper").trim();
  if (!["wallpaper", "dark", "transparent"].includes(bg)) {
    merged.windowBackground = "wallpaper";
  }
  if (merged.windowTransparent || merged.windowBackground === "transparent") {
    merged.windowTransparent = true;
    merged.windowBackground = "transparent";
  }
  merged.windowCompact = Boolean(merged.windowCompact);
  merged.windowPetOverlay = Boolean(merged.windowPetOverlay);
  merged.compactDialogQa = Boolean(merged.compactDialogQa);
  return merged;
}

async function readWindowSettings(projectRoot) {
  try {
    const raw = await fs.readFile(windowSettingsPath(projectRoot), "utf-8");
    return normalizeWindowSettings(JSON.parse(raw));
  } catch {
    return normalizeWindowSettings({});
  }
}

async function writeWindowSettings(projectRoot, patch) {
  const current = await readWindowSettings(projectRoot);
  const next = normalizeWindowSettings({ ...current, ...(patch && typeof patch === "object" ? patch : {}) });
  const target = windowSettingsPath(projectRoot);
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
  await fs.rename(tmp, target);
  return next;
}

async function migrateWindowSettingsFromAgent(projectRoot, agentSettings) {
  try {
    await fs.access(windowSettingsPath(projectRoot));
    return readWindowSettings(projectRoot);
  } catch {
    // first run — migrate legacy per-agent setting if present
  }
  if (agentSettings && typeof agentSettings.windowTopmost === "boolean") {
    return writeWindowSettings(projectRoot, { windowTopmost: agentSettings.windowTopmost });
  }
  return normalizeWindowSettings({});
}

module.exports = {
  AWN_SHELL_FILE,
  WINDOW_PROFILE_NORMAL,
  WINDOW_PROFILE_COMPACT,
  WINDOW_PROFILE_COMPACT_QA,
  DEFAULT_WINDOW_SETTINGS,
  normalizeWindowSettings,
  readWindowSettings,
  writeWindowSettings,
  migrateWindowSettingsFromAgent
};
