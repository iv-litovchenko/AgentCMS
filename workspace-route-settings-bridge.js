const CMS_VOICE_TO_SHELL = {
  "voice-cms-topic-path": "topicPath",
  "voice-cms-channel": "messageChannel"
};

const ROUTE_CONFIG_VOICE_TO_SHELL = {
  "voice-route-system-prompt": "systemPrompt",
  "voice-route-claude-cli-path": "claudeCliPath",
  "voice-route-claude-model": "claudeModel",
  "voice-route-claude-session-id": "claudeSessionId",
  "voice-route-claude-permission-mode": "claudePermissionMode",
  "voice-route-codex-cli-path": "codexCliPath",
  "voice-route-codex-model": "codexModel",
  "voice-route-codex-session-id": "codexSessionId",
  "voice-route-codex-permission-mode": "codexPermissionMode",
  "voice-route-qwenpaw-url": "qwenpawBaseUrl",
  "voice-route-qwenpaw-user-id": "qwenpawUserId",
  "voice-route-qwenpaw-agent-id": "qwenpawAgentId",
  "voice-route-qwenpaw-session-id": "qwenpawSessionId"
};

const CMS_SHELL_DEFAULTS = {
  "voice-cms-topic-path": "awn-agent-kit/agent/manifest.md",
  "voice-cms-channel": "thread"
};

const ROUTE_CONFIG_SHELL_DEFAULTS = {
  "voice-route-system-prompt": "",
  "voice-route-claude-cli-path": "claude",
  "voice-route-claude-model": "",
  "voice-route-claude-session-id": "",
  "voice-route-claude-permission-mode": "",
  "voice-route-codex-cli-path": "codex",
  "voice-route-codex-model": "",
  "voice-route-codex-session-id": "",
  "voice-route-codex-permission-mode": "",
  "voice-route-qwenpaw-url": "http://127.0.0.1:8088",
  "voice-route-qwenpaw-user-id": "shell",
  "voice-route-qwenpaw-agent-id": "default",
  "voice-route-qwenpaw-session-id": ""
};

const ROUTE_CONFIG_TO_SHELL = {
  ...CMS_VOICE_TO_SHELL,
  ...ROUTE_CONFIG_VOICE_TO_SHELL
};

function hydrateVoiceKeysFromShell(awnSettings = {}, shellFlat = {}, keyMap) {
  const out = { ...(awnSettings && typeof awnSettings === "object" ? awnSettings : {}) };
  for (const [voiceKey, shellKey] of Object.entries(keyMap)) {
    if (voiceKey in out) continue;
    if (shellKey in shellFlat && shellFlat[shellKey] !== undefined && shellFlat[shellKey] !== null) {
      out[voiceKey] = shellFlat[shellKey];
    }
  }
  return out;
}

function buildShellPatchFromWorkspace(awnSettings = {}, keyMap) {
  const source = awnSettings && typeof awnSettings === "object" ? awnSettings : {};
  const patch = {};
  for (const [voiceKey, shellKey] of Object.entries(keyMap)) {
    if (!(voiceKey in source)) continue;
    patch[shellKey] = source[voiceKey];
  }
  return patch;
}

function hydrateWorkspaceCmsFromShell(awnSettings = {}, shellFlat = {}) {
  return hydrateVoiceKeysFromShell(awnSettings, shellFlat, CMS_VOICE_TO_SHELL);
}

function hydrateWorkspaceRouteConfigFromShell(awnSettings = {}, shellFlat = {}) {
  return hydrateVoiceKeysFromShell(awnSettings, shellFlat, ROUTE_CONFIG_VOICE_TO_SHELL);
}

function hydrateWorkspaceRouteFromShell(awnSettings = {}, shellFlat = {}) {
  let out = hydrateWorkspaceCmsFromShell(awnSettings, shellFlat);
  out = hydrateWorkspaceRouteConfigFromShell(out, shellFlat);
  return out;
}

function buildShellCmsPatchFromWorkspace(awnSettings = {}) {
  return buildShellPatchFromWorkspace(awnSettings, CMS_VOICE_TO_SHELL);
}

function buildShellRouteConfigPatchFromWorkspace(awnSettings = {}) {
  return buildShellPatchFromWorkspace(awnSettings, ROUTE_CONFIG_VOICE_TO_SHELL);
}

const SESSION_SHELL_TO_WORKSPACE = {
  claudeSessionId: "voice-route-claude-session-id",
  codexSessionId: "voice-route-codex-session-id",
  qwenpawSessionId: "voice-route-qwenpaw-session-id",
  qwenpawUserId: "voice-route-qwenpaw-user-id"
};

function buildShellRoutePatchFromWorkspace(awnSettings = {}) {
  return {
    ...buildShellCmsPatchFromWorkspace(awnSettings),
    ...buildShellRouteConfigPatchFromWorkspace(awnSettings)
  };
}

function getCmsSettingsDefaults() {
  return { ...CMS_SHELL_DEFAULTS };
}

function getRouteConfigSettingsDefaults() {
  return { ...ROUTE_CONFIG_SHELL_DEFAULTS };
}

function getRouteSettingsDefaults() {
  return {
    ...getCmsSettingsDefaults(),
    ...getRouteConfigSettingsDefaults()
  };
}

module.exports = {
  CMS_VOICE_TO_SHELL,
  ROUTE_CONFIG_VOICE_TO_SHELL,
  ROUTE_CONFIG_TO_SHELL,
  hydrateWorkspaceCmsFromShell,
  hydrateWorkspaceRouteConfigFromShell,
  hydrateWorkspaceRouteFromShell,
  buildShellCmsPatchFromWorkspace,
  buildShellRouteConfigPatchFromWorkspace,
  buildShellRoutePatchFromWorkspace,
  getCmsSettingsDefaults,
  getRouteConfigSettingsDefaults,
  getRouteSettingsDefaults,
  SESSION_SHELL_TO_WORKSPACE
};
