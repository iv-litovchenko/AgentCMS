const fs = require("node:fs/promises");
const path = require("node:path");
const { rel } = require("./paths/agent-cms");
const { parseSettingsFileContent } = require("./settings-store");
const { normalizeWorkspaceAgentSettings } = require("./workspace-agent-settings");
const { buildShellVoicePatchFromWorkspace, hydrateWorkspaceVoiceFromShell } = require("./workspace-voice-settings-bridge");
const { buildShellWindowPatchFromWorkspace, hydrateWorkspaceWindowFromShell } = require("./workspace-window-settings-bridge");
const {
  buildShellRoutePatchFromWorkspace: buildShellRouteConfigPatchFromWorkspace,
  hydrateWorkspaceRouteFromShell: hydrateWorkspaceRouteConfigFromShell
} = require("./workspace-route-settings-bridge");
const { buildShellMediaPatchFromWorkspace, hydrateWorkspaceMediaFromShell } = require("./workspace-media-settings-bridge");
const { buildShellUiPatchFromWorkspace, hydrateWorkspaceUiFromShell } = require("./workspace-ui-settings-bridge");
const { VOICE_INPUT_TO_SHELL } = require("./workspace-voice-settings-bridge");
const { STT_VOICE_TO_SHELL } = require("./workspace-voice-settings-bridge");
const { PROACTIVE_VOICE_TO_SHELL } = require("./workspace-voice-settings-bridge");
const { COMPOSE_VOICE_TO_SHELL } = require("./workspace-voice-settings-bridge");
const { ROUTE_VOICE_TO_SHELL } = require("./workspace-voice-settings-bridge");
const { TTS_VOICE_TO_SHELL } = require("./workspace-voice-settings-bridge");
const { WINDOW_VOICE_TO_SHELL } = require("./workspace-window-settings-bridge");
const { ROUTE_CONFIG_TO_SHELL } = require("./workspace-route-settings-bridge");
const { MEDIA_VOICE_TO_SHELL } = require("./workspace-media-settings-bridge");
const { UI_VOICE_TO_SHELL } = require("./workspace-ui-settings-bridge");

const SHELL_RUNTIME_KEYS = new Set([
  "cursorSessionId",
  "openclawSessionId",
  "hermesSessionId",
  "agent-zeroSessionId",
  "qwenpawUserId",
  "qwenpawChatName",
  "qwenpawSttSessionId",
  "qwenpawSttChatName",
  "cameraDeviceId",
  "dialogScrollRatio"
]);

const SHELL_TO_WORKSPACE = invertBridgeMap({
  ...ROUTE_CONFIG_TO_SHELL,
  ...ROUTE_VOICE_TO_SHELL,
  ...VOICE_INPUT_TO_SHELL,
  ...STT_VOICE_TO_SHELL,
  ...PROACTIVE_VOICE_TO_SHELL,
  ...TTS_VOICE_TO_SHELL,
  ...COMPOSE_VOICE_TO_SHELL,
  ...MEDIA_VOICE_TO_SHELL,
  ...WINDOW_VOICE_TO_SHELL,
  ...UI_VOICE_TO_SHELL
});

function invertBridgeMap(keyMap) {
  const out = {};
  for (const [workspaceKey, shellKey] of Object.entries(keyMap)) {
    out[shellKey] = workspaceKey;
  }
  return out;
}

function isShellRuntimeKey(key) {
  return SHELL_RUNTIME_KEYS.has(String(key || "").trim());
}

function pickShellRuntimePatch(patch = {}) {
  const out = {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (!isShellRuntimeKey(key)) continue;
    out[key] = value;
  }
  return out;
}

function pickShellConfigPatch(patch = {}) {
  const out = {};
  for (const [key, value] of Object.entries(patch || {})) {
    if (isShellRuntimeKey(key)) continue;
    out[key] = value;
  }
  if (Object.prototype.hasOwnProperty.call(patch || {}, "ttsRate")) {
    out.ttsRate = patch.ttsRate;
  }
  return out;
}

function buildWorkspacePatchFromShell(shellPatch = {}) {
  const source = shellPatch && typeof shellPatch === "object" ? shellPatch : {};
  const out = {};
  for (const [shellKey, value] of Object.entries(source)) {
    const workspaceKey = SHELL_TO_WORKSPACE[shellKey];
    if (!workspaceKey) continue;
    out[workspaceKey] = value;
  }
  if (Object.prototype.hasOwnProperty.call(source, "ttsRate")) {
    out["voice-tts-rate"] = String(source.ttsRate);
  }
  return out;
}

async function loadWorkspaceAwnSettings(agentRoot) {
  const root = String(agentRoot || "").trim();
  if (!root) return normalizeWorkspaceAgentSettings({});
  try {
    const content = await fs.readFile(path.join(root, rel.settings.workspace), "utf-8");
    const parsed = parseSettingsFileContent(content);
    return normalizeWorkspaceAgentSettings(parsed.awn_settings || {});
  } catch {
    return normalizeWorkspaceAgentSettings({});
  }
}

function hydrateWorkspaceFromShell(awnSettings = {}, shellFlat = {}) {
  let out = hydrateWorkspaceRouteConfigFromShell(awnSettings, shellFlat);
  out = hydrateWorkspaceVoiceFromShell(out, shellFlat);
  out = hydrateWorkspaceMediaFromShell(out, shellFlat);
  out = hydrateWorkspaceWindowFromShell(out, shellFlat);
  out = hydrateWorkspaceUiFromShell(out, shellFlat);
  return out;
}

function buildShellConfigPatchFromWorkspace(awnSettings = {}) {
  return {
    ...buildShellRouteConfigPatchFromWorkspace(awnSettings),
    ...buildShellVoicePatchFromWorkspace(awnSettings),
    ...buildShellMediaPatchFromWorkspace(awnSettings),
    ...buildShellWindowPatchFromWorkspace(awnSettings),
    ...buildShellUiPatchFromWorkspace(awnSettings)
  };
}

function buildShellSettingsFromWorkspace(awnSettings = {}, runtimeFlat = {}) {
  const configPatch = buildShellConfigPatchFromWorkspace(awnSettings);
  const runtime = pickShellRuntimePatch(runtimeFlat);
  return { ...configPatch, ...runtime };
}

module.exports = {
  SHELL_RUNTIME_KEYS,
  SHELL_TO_WORKSPACE,
  loadWorkspaceAwnSettings,
  hydrateWorkspaceFromShell,
  buildShellConfigPatchFromWorkspace,
  buildShellSettingsFromWorkspace,
  buildWorkspacePatchFromShell,
  pickShellRuntimePatch,
  pickShellConfigPatch,
  isShellRuntimeKey
};
