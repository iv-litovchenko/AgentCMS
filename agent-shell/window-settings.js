const fs = require("fs/promises");
const path = require("path");
const { rel } = require("../paths/agent-cms");

const LEGACY_AWN_SHELL_FILE = "awn-shell.json";
const SHELL_SETTINGS_FILE = rel.settings.shell;
const WORKSPACE_SETTINGS_FILE = rel.settings.workspace;

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
  "windowCompact",
  "compactDialogQa",
  "dialogAutoScroll",
  "windowCharacterModel",
  "windowKeepAwake",
  "windowProcessingSound"
]);

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
  if (merged.windowBackground === "transparent") {
    merged.windowTransparent = true;
    merged.windowBackground = "wallpaper";
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

function pickAgentWindowPatch(patch = {}) {
  const out = {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (AGENT_WINDOW_KEYS.has(key)) out[key] = value;
  }
  return out;
}

function mergeAgentWindowSettings(agentSettings = {}) {
  const src = agentSettings && typeof agentSettings === "object" ? agentSettings : {};
  return normalizeWindowSettings({
    windowTopmost: src.windowTopmost,
    windowTransparent: src.windowTransparent,
    windowBackground: src.windowBackground,
    windowBackgroundImageUrl: src.windowBackgroundImageUrl,
    windowPetOverlay: src.windowPetOverlay,
    windowCompact: src.windowCompact,
    compactDialogQa: src.compactDialogQa,
    dialogAutoScroll: src.dialogAutoScroll,
    windowCharacterModel: src.windowCharacterModel,
    windowKeepAwake: src.windowKeepAwake,
    windowProcessingSound: src.windowProcessingSound
  });
}

function agentHasWindowSettings(agentSettings = {}) {
  const src = agentSettings && typeof agentSettings === "object" ? agentSettings : {};
  return AGENT_WINDOW_KEYS.some((key) => src[key] !== undefined && src[key] !== null);
}

async function readLegacyAwnShellSettings(projectRoot) {
  try {
    const raw = await fs.readFile(path.join(projectRoot, LEGACY_AWN_SHELL_FILE), "utf-8");
    return normalizeWindowSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

async function migrateLegacyAwnShellToAgent(projectRoot, agentRoot, shellService, agentSettings = {}) {
  if (agentHasWindowSettings(agentSettings)) return agentSettings;
  const legacy = await readLegacyAwnShellSettings(projectRoot);
  if (!legacy || !shellService?.writeSettings) return agentSettings;
  const patch = pickAgentWindowPatch(legacy);
  if (!Object.keys(patch).length) return agentSettings;
  return shellService.writeSettings(agentRoot, patch);
}

async function readMergedWindowSettings(_projectRoot, agentSettings = {}) {
  return mergeAgentWindowSettings(agentSettings);
}

async function writeMergedWindowSettings(_projectRoot, agentRoot, shellService, patch = {}) {
  const agentPatch = pickAgentWindowPatch(patch);
  if (!shellService?.writeSettings) return mergeAgentWindowSettings({});
  if (!Object.keys(agentPatch).length) {
    return mergeAgentWindowSettings(await shellService.readSettings(agentRoot));
  }
  const updated = await shellService.writeSettings(agentRoot, agentPatch);
  return mergeAgentWindowSettings(updated);
}

module.exports = {
  SHELL_SETTINGS_FILE,
  WORKSPACE_SETTINGS_FILE,
  LEGACY_AWN_SHELL_FILE,
  WINDOW_PROFILE_NORMAL,
  WINDOW_PROFILE_COMPACT,
  WINDOW_PROFILE_COMPACT_QA,
  DEFAULT_WINDOW_SETTINGS,
  AGENT_WINDOW_KEYS,
  normalizeWindowSettings,
  pickAgentWindowPatch,
  mergeAgentWindowSettings,
  migrateLegacyAwnShellToAgent,
  readMergedWindowSettings,
  writeMergedWindowSettings
};
