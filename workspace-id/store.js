const fs = require("fs");
const path = require("path");
const {
  WORKSPACE_SETTINGS_FILE,
  parseSettingsFileContent,
  composeSettingsFileContent
} = require("../settings-store");
const {
  WORKSPACE_AWN_ID_COUNTER_KEYS,
  WORKSPACE_AWN_ID_COUNTER_MODEL
} = require("../lib/workspace/workspace-agent-settings");

const LEGACY_COUNTER_FILE = "id-autoincrement.json";
const COUNTER_FILE = WORKSPACE_SETTINGS_FILE;

function getSettingsPath(agentRoot) {
  return path.join(agentRoot, WORKSPACE_SETTINGS_FILE);
}

function getLegacyCounterPath(agentRoot) {
  return path.join(agentRoot, LEGACY_COUNTER_FILE);
}

function normalizeCounterData(data = {}) {
  const next = Number(data?.next);
  const issued = Number(data?.issued);
  return {
    next: Number.isFinite(next) && next > 0 ? Math.floor(next) : 1,
    issued: Number.isFinite(issued) && issued >= 0 ? Math.floor(issued) : 0,
    updatedAt: data?.updatedAt || null,
    model: String(data?.model || WORKSPACE_AWN_ID_COUNTER_MODEL).trim() || WORKSPACE_AWN_ID_COUNTER_MODEL
  };
}

function readLegacyCounter(agentRoot) {
  const file = getLegacyCounterPath(agentRoot);
  try {
    const raw = fs.readFileSync(file, "utf-8");
    const data = JSON.parse(raw);
    const normalized = normalizeCounterData(data);
    return normalized;
  } catch {
    return null;
  }
}

function removeLegacyCounterFile(agentRoot) {
  try {
    fs.unlinkSync(getLegacyCounterPath(agentRoot));
  } catch {
    // ignore missing legacy file
  }
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
  const nextRaw = settings[WORKSPACE_AWN_ID_COUNTER_KEYS.next];
  if (nextRaw === undefined || nextRaw === null || nextRaw === "") return null;
  return normalizeCounterData({
    next: nextRaw,
    issued: settings[WORKSPACE_AWN_ID_COUNTER_KEYS.issued],
    updatedAt: settings[WORKSPACE_AWN_ID_COUNTER_KEYS.updatedAt],
    model: settings[WORKSPACE_AWN_ID_COUNTER_KEYS.model]
  });
}

function writeCounter(agentRoot, data) {
  const normalized = normalizeCounterData(data);
  const updatedAt = normalized.updatedAt || new Date().toISOString();
  const parsed = readSettingsPayload(agentRoot);
  const nextSettings = {
    ...parsed.awn_settings,
    [WORKSPACE_AWN_ID_COUNTER_KEYS.next]: normalized.next,
    [WORKSPACE_AWN_ID_COUNTER_KEYS.issued]: normalized.issued,
    [WORKSPACE_AWN_ID_COUNTER_KEYS.updatedAt]: updatedAt,
    [WORKSPACE_AWN_ID_COUNTER_KEYS.model]: WORKSPACE_AWN_ID_COUNTER_MODEL
  };
  const content = composeSettingsFileContent({
    headerComment: parsed.headerComment,
    awn_settings: nextSettings
  });
  const file = getSettingsPath(agentRoot);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content.endsWith("\n") ? content : `${content}\n`, "utf-8");
  removeLegacyCounterFile(agentRoot);
  return {
    next: normalized.next,
    issued: normalized.issued,
    updatedAt,
    model: WORKSPACE_AWN_ID_COUNTER_MODEL
  };
}

function readCounter(agentRoot) {
  const fromSettings = readCounterFromSettings(agentRoot);
  if (fromSettings) return fromSettings;

  const legacy = readLegacyCounter(agentRoot);
  if (legacy) {
    return writeCounter(agentRoot, legacy);
  }

  return { next: 1, issued: 0, updatedAt: null, model: WORKSPACE_AWN_ID_COUNTER_MODEL };
}

function allocateNextId(agentRoot) {
  const current = readCounter(agentRoot);
  const id = current.next;
  writeCounter(agentRoot, {
    next: id + 1,
    issued: current.issued + 1,
    updatedAt: new Date().toISOString()
  });
  return id;
}

function bumpCounterFloor(agentRoot, minNext) {
  const floor = Number(minNext);
  if (!Number.isFinite(floor) || floor <= 0) return readCounter(agentRoot);
  const current = readCounter(agentRoot);
  if (current.next >= floor) return current;
  return writeCounter(agentRoot, {
    next: Math.floor(floor),
    issued: current.issued,
    updatedAt: new Date().toISOString()
  });
}

module.exports = {
  COUNTER_FILE,
  LEGACY_COUNTER_FILE,
  WORKSPACE_AWN_ID_COUNTER_KEYS,
  getCounterPath: getSettingsPath,
  getSettingsPath,
  readCounter,
  writeCounter,
  allocateNextId,
  bumpCounterFloor
};
