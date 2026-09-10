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
  windowBackgroundImageUrl: "",
  windowCompact: false,
  windowPetOverlay: false,
  compactDialogQa: true,
  dialogAutoScroll: true
};

const AGENT_WINDOW_KEYS = new Set([
  "windowTopmost",
  "windowTransparent",
  "windowBackground",
  "windowBackgroundImageUrl",
  "windowPetOverlay",
  "compactDialogQa",
  "dialogAutoScroll",
  "windowCharacterModel",
  "windowKeepAwake",
  "windowProcessingSound"
]);

const GLOBAL_WINDOW_KEYS = new Set(["windowCompact"]);

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
  if (!["wallpaper", "dark", "transparent", "custom"].includes(bg)) {
    merged.windowBackground = "wallpaper";
  }
  merged.windowBackgroundImageUrl = String(merged.windowBackgroundImageUrl || "").trim();
  if (merged.windowTransparent || merged.windowBackground === "transparent") {
    merged.windowTransparent = true;
    merged.windowBackground = "transparent";
  }
  merged.windowCompact = Boolean(merged.windowCompact);
  merged.windowPetOverlay = Boolean(merged.windowPetOverlay);
  merged.compactDialogQa = Boolean(merged.compactDialogQa);
  merged.dialogAutoScroll = merged.dialogAutoScroll !== false;
  if (merged.windowCharacterModel !== undefined) {
    merged.windowCharacterModel = String(merged.windowCharacterModel || "").trim();
  }
  if (merged.windowKeepAwake !== undefined) merged.windowKeepAwake = merged.windowKeepAwake !== false;
  if (merged.windowProcessingSound !== undefined) {
    merged.windowProcessingSound = String(merged.windowProcessingSound || "off").trim() || "off";
  }
  return merged;
}

function splitWindowPatch(patch = {}) {
  const agentPatch = {};
  const globalPatch = {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (AGENT_WINDOW_KEYS.has(key)) agentPatch[key] = value;
    else if (GLOBAL_WINDOW_KEYS.has(key)) globalPatch[key] = value;
    else globalPatch[key] = value;
  }
  return { agentPatch, globalPatch };
}

function mergeAgentWindowSettings(agentSettings = {}) {
  const src = agentSettings && typeof agentSettings === "object" ? agentSettings : {};
  return normalizeWindowSettings({
    windowTopmost: src.windowTopmost,
    windowTransparent: src.windowTransparent,
    windowBackground: src.windowBackground,
    windowBackgroundImageUrl: src.windowBackgroundImageUrl,
    windowPetOverlay: src.windowPetOverlay,
    compactDialogQa: src.compactDialogQa,
    dialogAutoScroll: src.dialogAutoScroll,
    windowCharacterModel: src.windowCharacterModel,
    windowKeepAwake: src.windowKeepAwake,
    windowProcessingSound: src.windowProcessingSound
  });
}

async function readMergedWindowSettings(projectRoot, agentSettings = {}) {
  const global = await readWindowSettings(projectRoot);
  const flatAgent = agentSettings && typeof agentSettings === "object" ? agentSettings : {};
  const agent = mergeAgentWindowSettings(agentSettings);
  const dialogAutoScroll =
    flatAgent.dialogAutoScroll !== undefined
      ? flatAgent.dialogAutoScroll !== false
      : global.dialogAutoScroll !== undefined
        ? global.dialogAutoScroll !== false
        : true;
  return normalizeWindowSettings({
    ...agent,
    windowCompact: global.windowCompact,
    windowTopmost: agent.windowTopmost ?? global.windowTopmost,
    windowTransparent: agent.windowTransparent ?? global.windowTransparent,
    windowBackground: agent.windowBackground || global.windowBackground,
    windowBackgroundImageUrl: agent.windowBackgroundImageUrl || global.windowBackgroundImageUrl,
    windowPetOverlay: agent.windowPetOverlay ?? global.windowPetOverlay,
    compactDialogQa: agent.compactDialogQa ?? global.compactDialogQa,
    dialogAutoScroll
  });
}

async function writeMergedWindowSettings(projectRoot, agentRoot, shellService, patch = {}) {
  const { agentPatch, globalPatch } = splitWindowPatch(patch);
  if (Object.prototype.hasOwnProperty.call(patch || {}, "dialogAutoScroll")) {
    agentPatch.dialogAutoScroll = patch.dialogAutoScroll;
    globalPatch.dialogAutoScroll = patch.dialogAutoScroll;
  }
  let agentSettings = null;
  if (Object.keys(agentPatch).length && shellService?.writeSettings) {
    agentSettings = await shellService.writeSettings(agentRoot, agentPatch);
  } else if (shellService?.readSettings) {
    agentSettings = await shellService.readSettings(agentRoot);
  }
  let global = null;
  if (Object.keys(globalPatch).length) {
    global = await writeWindowSettings(projectRoot, globalPatch);
  } else {
    global = await readWindowSettings(projectRoot);
  }
  return readMergedWindowSettings(projectRoot, agentSettings || {});
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
  AGENT_WINDOW_KEYS,
  GLOBAL_WINDOW_KEYS,
  normalizeWindowSettings,
  splitWindowPatch,
  mergeAgentWindowSettings,
  readMergedWindowSettings,
  writeMergedWindowSettings,
  readWindowSettings,
  writeWindowSettings,
  migrateWindowSettingsFromAgent
};
