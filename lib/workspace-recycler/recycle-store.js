const fs = require("fs");
const path = require("path");
const {
  WORKSPACE_SETTINGS_FILE,
  parseSettingsFileContent,
  composeSettingsFileContent
} = require("../config/settings-store");
const {
  WORKSPACE_RECYCLE_COUNTER_KEYS,
  WORKSPACE_RECYCLE_COUNTER_MODEL,
  WORKSPACE_RECYCLE_ID_PAD_WIDTH
} = require("../workspace/workspace-agent-settings");

const RECYCLE_COUNTER_MODEL = WORKSPACE_RECYCLE_COUNTER_MODEL;

function getSettingsPath(agentRoot) {
  return path.join(agentRoot, WORKSPACE_SETTINGS_FILE);
}

function normalizeCounterData(data = {}) {
  const next = Number(data?.next);
  const issued = Number(data?.issued);
  return {
    next: Number.isFinite(next) && next > 0 ? Math.floor(next) : 1,
    issued: Number.isFinite(issued) && issued >= 0 ? Math.floor(issued) : 0,
    updatedAt: data?.updatedAt || null,
    model: String(data?.model || RECYCLE_COUNTER_MODEL).trim() || RECYCLE_COUNTER_MODEL
  };
}

function readSettingsPayload(agentRoot) {
  const file = getSettingsPath(agentRoot);
  try {
    const content = fs.readFileSync(file, "utf-8");
    return parseSettingsFileContent(content);
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
    return { headerComment: "", awn_settings: {} };
  }
}

function readCounterFromSettings(agentRoot) {
  const parsed = readSettingsPayload(agentRoot);
  const settings = parsed.awn_settings || {};
  const nextRaw = settings[WORKSPACE_RECYCLE_COUNTER_KEYS.next];
  if (nextRaw === undefined || nextRaw === null || nextRaw === "") return null;
  return normalizeCounterData({
    next: nextRaw,
    issued: settings[WORKSPACE_RECYCLE_COUNTER_KEYS.issued],
    updatedAt: settings[WORKSPACE_RECYCLE_COUNTER_KEYS.updatedAt],
    model: settings[WORKSPACE_RECYCLE_COUNTER_KEYS.model]
  });
}

function writeCounter(agentRoot, data) {
  const normalized = normalizeCounterData(data);
  const updatedAt = normalized.updatedAt || new Date().toISOString();
  const parsed = readSettingsPayload(agentRoot);
  const nextSettings = {
    ...parsed.awn_settings,
    [WORKSPACE_RECYCLE_COUNTER_KEYS.next]: normalized.next,
    [WORKSPACE_RECYCLE_COUNTER_KEYS.issued]: normalized.issued,
    [WORKSPACE_RECYCLE_COUNTER_KEYS.updatedAt]: updatedAt,
    [WORKSPACE_RECYCLE_COUNTER_KEYS.model]: RECYCLE_COUNTER_MODEL
  };
  const content = composeSettingsFileContent({
    headerComment: parsed.headerComment,
    awn_settings: nextSettings
  });
  const file = getSettingsPath(agentRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.endsWith("\n") ? content : `${content}\n`, "utf-8");
  return {
    next: normalized.next,
    issued: normalized.issued,
    updatedAt,
    model: RECYCLE_COUNTER_MODEL
  };
}

function readCounter(agentRoot) {
  const fromSettings = readCounterFromSettings(agentRoot);
  if (fromSettings) return fromSettings;
  return { next: 1, issued: 0, updatedAt: null, model: RECYCLE_COUNTER_MODEL };
}

function readRecycleIdPadWidth(agentRoot) {
  const parsed = readSettingsPayload(agentRoot);
  const raw = parsed.awn_settings?.[WORKSPACE_RECYCLE_COUNTER_KEYS.padWidth];
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 4 && n <= 12) return Math.floor(n);
  return WORKSPACE_RECYCLE_ID_PAD_WIDTH;
}

function formatRecycleMarkerId(agentRoot, id) {
  const pad = readRecycleIdPadWidth(agentRoot);
  return String(Math.floor(Number(id) || 0)).padStart(pad, "0");
}

function allocateNextRecycleMarkerId(agentRoot) {
  const current = readCounter(agentRoot);
  const id = current.next;
  writeCounter(agentRoot, {
    next: id + 1,
    issued: current.issued + 1,
    updatedAt: new Date().toISOString()
  });
  return id;
}

module.exports = {
  WORKSPACE_RECYCLE_COUNTER_KEYS,
  readCounter,
  readRecycleIdPadWidth,
  formatRecycleMarkerId,
  allocateNextRecycleMarkerId
};
