const NodeConfigBundle = require("./node-config-bundle");
const { loadMcpPolicy } = require("./mcp-policy-loader");

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

function getPolicy() {
  return loadMcpPolicy();
}

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
  const policy = getPolicy();
  return policy.mcp.writeToolPattern.test(String(toolName || "").trim());
}

function isMcpExecTool(toolName) {
  const policy = getPolicy();
  const name = String(toolName || "").trim();
  return policy.mcp.execTools.has(name) || /^exec_/.test(name) || name === "run_script";
}

function assertMcpToolAllowed(toolName, settings = {}) {
  const policy = getPolicy();
  const normalized = normalizeWorkspaceAgentSettings(settings);
  const mode = normalized["mcp-mode"];
  const name = String(toolName || "").trim();

  if (mode === "readonly" && isMcpWriteTool(name)) {
    throw new Error(
      `MCP tool "${name}" blocked: workspace mcp-mode=readonly (change in settings.yml)`
    );
  }
  if (isMcpExecTool(name) && !policy.mcp.execAllowedModes.has(mode)) {
    throw new Error(`MCP tool "${name}" blocked: workspace mcp-mode=${mode} (exec only in full mode)`);
  }
  return normalized;
}

function getBatchToolCategory(toolName) {
  const policy = getPolicy();
  const name = String(toolName || "").trim();
  if (!name) return "denied";
  if (policy.batch.deniedTools.has(name)) return "denied";
  if (policy.batch.execTools.has(name) || isMcpExecTool(name)) return "exec";
  if (policy.batch.readTools.has(name)) return "read";
  if (policy.batch.readNamePatterns.some((pattern) => pattern.test(name))) return "read";
  return "write";
}

function getBatchLimitForTool(toolName, settings = {}) {
  const normalized = normalizeWorkspaceAgentSettings(settings);
  const category = getBatchToolCategory(toolName);
  if (category === "read") return normalized["batch-read-limit"];
  if (category === "write") return normalized["batch-write-limit"];
  return 0;
}

function getBatchAbsoluteMaxItems() {
  return getPolicy().batch.absoluteMaxItems;
}

function getBatchDefaultParallel(category) {
  const policy = getPolicy();
  if (category === "read") return policy.batch.defaultParallel.read;
  if (category === "write") return policy.batch.defaultParallel.write;
  return false;
}

function assertBatchInvokeAllowed(toolName, itemCount, settings = {}) {
  const policy = getPolicy();
  const normalized = normalizeWorkspaceAgentSettings(settings);
  const name = String(toolName || "").trim();
  const count = Number(itemCount) || 0;

  if (!normalized["batch-enabled"]) {
    throw new Error("batch_invoke disabled in workspace settings (batch-enabled=false)");
  }

  const category = getBatchToolCategory(name);
  if (category === "denied") {
    throw new Error(`Tool "${name}" cannot be used in batch_invoke (see settings.global.yml → awn_policy)`);
  }
  if (category === "exec") {
    throw new Error(`Tool "${name}" cannot be batched (exec tools are single-call only)`);
  }
  if (normalized["mcp-mode"] === "readonly" && category === "write") {
    throw new Error(`batch_invoke write tool "${name}" blocked: mcp-mode=readonly`);
  }

  const absoluteMax = policy.batch.absoluteMaxItems;
  if (count < 1) throw new Error("batch_invoke requires at least one item");
  if (absoluteMax > 0 && count > absoluteMax) {
    throw new Error(`batch_invoke absolute max is ${absoluteMax}, got ${count}`);
  }

  const limit = getBatchLimitForTool(name, normalized);
  if (limit > 0 && count > limit) {
    throw new Error(`batch_invoke limit for "${name}" is ${limit}, got ${count}`);
  }

  return { normalized, category, limit };
}

module.exports = {
  WORKSPACE_AGENT_SETTINGS_DEFAULTS,
  flattenAwnSettingsValues,
  normalizeWorkspaceAgentSettings,
  parseWorkspaceAgentSettingsFromConfigContent,
  isMcpWriteTool,
  isMcpExecTool,
  assertMcpToolAllowed,
  getBatchToolCategory,
  getBatchLimitForTool,
  getBatchAbsoluteMaxItems,
  getBatchDefaultParallel,
  assertBatchInvokeAllowed,
  getMcpPolicy: getPolicy
};
