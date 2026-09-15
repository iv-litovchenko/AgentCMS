const NodeConfigBundle = require("./node-config-bundle");

const WORKSPACE_AGENT_SETTINGS_DEFAULTS = {
  "agent-language": "ru",
  "response-style": "agents-md",
  "notify-on-complete": false,
  "mcp-mode": "standard",
  "batch-enabled": true,
  "batch-read-limit": 20,
  "batch-write-limit": 10,
  "batch-deny-exec": true,
  "confirm-delete": true,
  "confirm-exec": true,
  "default-slot": "main",
  "auto-retain-facts": false,
  "awn-temp-ttl-days": 0,
  "always-context-max-files": 0
};

const MCP_WRITE_TOOL_PATTERN =
  /^(write_|create_|delete_|move_|rename_|append_|upload_|import_|triage_|retain_|zzz_write_|zzz_create_|notify_user|run_script|exec_)/;

function flattenAwnSettingsValues(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const flat = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key) continue;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        if (!nestedKey) continue;
        if (nestedValue && typeof nestedValue === "object" && !Array.isArray(nestedValue)) continue;
        flat[nestedKey] = nestedValue;
      }
      continue;
    }
    flat[key] = value;
  }
  return flat;
}

function normalizeWorkspaceAgentSettings(raw = {}) {
  const flat = flattenAwnSettingsValues(raw);
  const normalized = { ...WORKSPACE_AGENT_SETTINGS_DEFAULTS };
  for (const [key, value] of Object.entries(flat)) {
    if (!(key in WORKSPACE_AGENT_SETTINGS_DEFAULTS)) {
      normalized[key] = value;
      continue;
    }
    const defaults = WORKSPACE_AGENT_SETTINGS_DEFAULTS[key];
    if (typeof defaults === "boolean") normalized[key] = Boolean(value);
    else if (typeof defaults === "number") normalized[key] = Number(value) || 0;
    else normalized[key] = String(value ?? defaults);
  }
  return normalized;
}

function parseWorkspaceAgentSettingsFromConfigContent(content) {
  const bundle = NodeConfigBundle.parseNodeConfigBundle(content || "");
  return normalizeWorkspaceAgentSettings(bundle.awn_settings || {});
}

function isMcpWriteTool(toolName) {
  return MCP_WRITE_TOOL_PATTERN.test(String(toolName || "").trim());
}

function assertMcpToolAllowed(toolName, settings = {}) {
  const normalized = normalizeWorkspaceAgentSettings(settings);
  const mode = normalized["mcp-mode"];
  if (mode === "readonly" && isMcpWriteTool(toolName)) {
    throw new Error(
      `MCP tool "${toolName}" blocked: workspace mcp-mode=readonly (change in config.yml → awn_settings)`
    );
  }
  if (mode !== "full" && /^(exec_|run_script)/.test(String(toolName || ""))) {
    throw new Error(
      `MCP tool "${toolName}" blocked: workspace mcp-mode=${mode} (exec only in full mode)`
    );
  }
  return normalized;
}

module.exports = {
  WORKSPACE_AGENT_SETTINGS_DEFAULTS,
  flattenAwnSettingsValues,
  normalizeWorkspaceAgentSettings,
  parseWorkspaceAgentSettingsFromConfigContent,
  isMcpWriteTool,
  assertMcpToolAllowed
};
