const NodeConfigBundle = require("./node-config-bundle");
const { loadMcpPolicy } = require("./mcp-policy-loader");

const PLATFORM_AGENT_SETTINGS_DEFAULTS = {
  "maintenance-mode": false,
  "default-locale": "ru",
  "mcp-mode": "standard",
  "batch-enabled": true,
  "batch-read-limit": 20,
  "batch-write-limit": 10,
  "batch-deny-exec": true,
  "confirm-delete": true,
  "confirm-exec": true,
  "read-text-max-bytes": "120000",
  "read-binary-max-bytes": "1500000",
  "index-semantic-enabled": true,
  "index-fulltext-enabled": true,
  "index-storage-enabled": true,
  "index-links-enabled": true,
  "index-ocr-enabled": false,
  "index-workspace-id-enabled": true,
  "index-storage-mode": "quick",
  "index-path-prefixes": [],
  "index-exclude-patterns": ".git\n.agent-cms\n.agent-shell\nnode_modules/\nawn-repository/ !manifest.md !README.md",
  "index-file-extensions": [".md", ".sidecar.md"],
  "search-default-scopes": ["semantic", "fulltext"],
  "search-semantic-chunk-size": "900",
  "search-semantic-chunk-overlap": "100",
  "search-hybrid-semantic-weight": "60",
  "search-hybrid-fulltext-weight": "40",
  "auto-retain-facts": false,
  "always-context-global-mcp-doc": true,
  "always-context-global-response-style": true,
  "always-context-agents-md": true,
  "always-context-ws-folder": "awn-shared/context/awn-storage/",
};

const PLATFORM_FS_LIMITS = {
  textMin: 1024,
  textMax: 10_000_000,
  binaryMin: 1024,
  binaryMax: 10_000_000
};

const WORKSPACE_AWN_ID_COUNTER_MODEL = "workspace-id-autoincrement-v1";

const WORKSPACE_AWN_ID_COUNTER_KEYS = {
  next: "awn-id-next",
  issued: "awn-id-issued",
  updatedAt: "awn-id-updated-at",
  model: "awn-id-model"
};

const WORKSPACE_AGENT_SETTINGS_DEFAULTS = {
  "agent-language": "ru",
  "response-style": "agents-md",
  "notify-on-complete": false,
  [WORKSPACE_AWN_ID_COUNTER_KEYS.next]: 1,
  [WORKSPACE_AWN_ID_COUNTER_KEYS.issued]: 0,
  [WORKSPACE_AWN_ID_COUNTER_KEYS.updatedAt]: "",
  [WORKSPACE_AWN_ID_COUNTER_KEYS.model]: WORKSPACE_AWN_ID_COUNTER_MODEL,
  "ws-static-plugin-example": "",
  "ws-static-example-1": "значение 1",
  "ws-static-example-2": "значение 2",
  "ws-static-example-3": "значение 3",
  "default-slot": "main",
  "awn-temp-ttl-days": 0
};

const USER_AGENT_SETTINGS_DEFAULTS = {
  "tree-show-empty-folders": true,
  "tree-active-topics-only": false,
  "tree-pad-sort-indexes": false,
  "tree-max-depth": 7,
  "sidebar-width": 280,
  "pinned-branch-path": "",
  "user-static-plugin-example": "",
  "user-static-example-1": "значение 1",
  "user-static-example-2": "значение 2",
  "user-static-example-3": "значение 3"
};

/** @deprecated merged defaults kept for compatibility checks only */
const WORKSPACE_AGENT_SETTINGS_DEFAULTS_LEGACY = {
  ...PLATFORM_AGENT_SETTINGS_DEFAULTS,
  ...WORKSPACE_AGENT_SETTINGS_DEFAULTS
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

function normalizeSettingsWithDefaults(raw = {}, defaults = {}) {
  const flat = flattenAwnSettingsValues(raw);
  const normalized = { ...defaults };
  for (const [key, value] of Object.entries(flat)) {
    if (!(key in defaults)) continue;
    const defaultValue = defaults[key];
    if (typeof defaultValue === "boolean") normalized[key] = Boolean(value);
    else if (typeof defaultValue === "number") normalized[key] = Number(value) || 0;
    else if (Array.isArray(defaultValue)) {
      if (Array.isArray(value)) normalized[key] = value.map((item) => String(item ?? "").trim()).filter(Boolean);
      else {
        const raw = String(value ?? "").trim();
        normalized[key] = raw
          ? raw.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean)
          : [...defaultValue];
      }
    } else normalized[key] = String(value ?? defaultValue);
  }
  return normalized;
}

function normalizePlatformAgentSettings(raw = {}) {
  return normalizeSettingsWithDefaults(raw, PLATFORM_AGENT_SETTINGS_DEFAULTS);
}

function normalizeWorkspaceAgentSettings(raw = {}) {
  return normalizeSettingsWithDefaults(raw, WORKSPACE_AGENT_SETTINGS_DEFAULTS);
}

function normalizeUserAgentSettings(raw = {}) {
  return normalizeSettingsWithDefaults(raw, USER_AGENT_SETTINGS_DEFAULTS);
}

function getPlatformReadTextMaxBytes(settings = {}) {
  const normalized = normalizePlatformAgentSettings(settings);
  const value = Number(normalized["read-text-max-bytes"]);
  const fallback = Number(PLATFORM_AGENT_SETTINGS_DEFAULTS["read-text-max-bytes"]) || 120_000;
  const bytes = Number.isFinite(value) && value > 0 ? value : fallback;
  return Math.min(Math.max(bytes, PLATFORM_FS_LIMITS.textMin), PLATFORM_FS_LIMITS.textMax);
}

function getPlatformReadBinaryMaxBytes(settings = {}) {
  const normalized = normalizePlatformAgentSettings(settings);
  const value = Number(normalized["read-binary-max-bytes"]);
  const fallback = Number(PLATFORM_AGENT_SETTINGS_DEFAULTS["read-binary-max-bytes"]) || 1_500_000;
  const bytes = Number.isFinite(value) && value > 0 ? value : fallback;
  return Math.min(Math.max(bytes, PLATFORM_FS_LIMITS.binaryMin), PLATFORM_FS_LIMITS.binaryMax);
}

function isPlatformIndexEnabled(settings = {}, layer = "") {
  const normalized = normalizePlatformAgentSettings(settings);
  const map = {
    semantic: "index-semantic-enabled",
    fulltext: "index-fulltext-enabled",
    storage: "index-storage-enabled",
    link: "index-links-enabled",
    ocr: "index-ocr-enabled",
    "workspace-id": "index-workspace-id-enabled"
  };
  const key = map[String(layer || "").trim()];
  return key ? Boolean(normalized[key]) : true;
}

function isPlatformMaintenanceMode(settings = {}) {
  return Boolean(normalizePlatformAgentSettings(settings)["maintenance-mode"]);
}

function getPlatformDefaultLocale(settings = {}) {
  const locale = String(normalizePlatformAgentSettings(settings)["default-locale"] || "ru")
    .trim()
    .toLowerCase();
  return locale === "en" ? "en" : "ru";
}

function isPlatformAlwaysContextEnabled(settings = {}, key = "") {
  const normalized = normalizePlatformAgentSettings(settings);
  const settingKey = String(key || "").trim();
  if (!settingKey || !(settingKey in normalized)) return true;
  return Boolean(normalized[settingKey]);
}

function getPlatformAlwaysContextWsFolder(settings = {}) {
  return String(normalizePlatformAgentSettings(settings)["always-context-ws-folder"] || "").trim();
}

function parsePlatformAgentSettingsFromConfigContent(content) {
  const bundle = NodeConfigBundle.parseNodeConfigBundle(content || "");
  return normalizePlatformAgentSettings(bundle.awn_settings || {});
}

function parseWorkspaceAgentSettingsFromConfigContent(content) {
  const bundle = NodeConfigBundle.parseNodeConfigBundle(content || "");
  return normalizeWorkspaceAgentSettings(bundle.awn_settings || {});
}

function touchWorkspaceAwnIdCounterOnSave(settings = {}) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return settings;
  const touched = { ...settings };
  const hasCounterField =
    WORKSPACE_AWN_ID_COUNTER_KEYS.next in touched || WORKSPACE_AWN_ID_COUNTER_KEYS.issued in touched;
  if (!hasCounterField) return touched;
  touched[WORKSPACE_AWN_ID_COUNTER_KEYS.updatedAt] = new Date().toISOString();
  touched[WORKSPACE_AWN_ID_COUNTER_KEYS.model] = WORKSPACE_AWN_ID_COUNTER_MODEL;
  return touched;
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

function isPlatformBatchDenyExec(settings = {}) {
  return Boolean(normalizePlatformAgentSettings(settings)["batch-deny-exec"]);
}

function isPlatformConfirmDelete(settings = {}) {
  return Boolean(normalizePlatformAgentSettings(settings)["confirm-delete"]);
}

function isPlatformConfirmExec(settings = {}) {
  return Boolean(normalizePlatformAgentSettings(settings)["confirm-exec"]);
}

function isMcpDeleteTool(toolName) {
  const name = String(toolName || "").trim();
  return /^delete_/.test(name);
}

function isMcpOperationConfirmed(args = {}) {
  return args?.confirm === true || args?.confirmed === true;
}

function assertMcpOperationConfirm(toolName, args = {}, settings = {}) {
  const normalized = normalizePlatformAgentSettings(settings);
  const name = String(toolName || "").trim();
  if (!name) return normalized;
  if (isMcpOperationConfirmed(args)) return normalized;

  if (isMcpExecTool(name) && isPlatformConfirmExec(normalized)) {
    throw new Error(
      `MCP tool "${name}" requires confirm=true (platform confirm-exec enabled in settings.global.yml)`
    );
  }
  if (isMcpDeleteTool(name) && isPlatformConfirmDelete(normalized)) {
    throw new Error(
      `MCP tool "${name}" requires confirm=true (platform confirm-delete enabled in settings.global.yml)`
    );
  }
  return normalized;
}

function assertMcpToolAllowed(toolName, settings = {}, args = {}) {
  const policy = getPolicy();
  const normalized = normalizePlatformAgentSettings(settings);
  const mode = normalized["mcp-mode"];
  const name = String(toolName || "").trim();

  if (mode === "readonly" && isMcpWriteTool(name)) {
    throw new Error(
      `MCP tool "${name}" blocked: platform mcp-mode=readonly (change in settings.global.yml)`
    );
  }
  if (isMcpExecTool(name) && !policy.mcp.execAllowedModes.has(mode)) {
    throw new Error(`MCP tool "${name}" blocked: platform mcp-mode=${mode} (exec only in full mode)`);
  }
  assertMcpOperationConfirm(name, args, normalized);
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
  const normalized = normalizePlatformAgentSettings(settings);
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
  const normalized = normalizePlatformAgentSettings(settings);
  const name = String(toolName || "").trim();
  const count = Number(itemCount) || 0;

  if (!normalized["batch-enabled"]) {
    throw new Error("batch_invoke disabled in platform settings (batch-enabled=false)");
  }

  const category = getBatchToolCategory(name);
  if (category === "denied") {
    throw new Error(`Tool "${name}" cannot be used in batch_invoke (see settings.global.yml → awn_policy)`);
  }
  if (category === "exec") {
    if (isPlatformBatchDenyExec(normalized)) {
      throw new Error(
        `Tool "${name}" cannot be batched (platform batch-deny-exec=true; disable in settings.global.yml to allow)`
      );
    }
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
  PLATFORM_AGENT_SETTINGS_DEFAULTS,
  WORKSPACE_AWN_ID_COUNTER_MODEL,
  WORKSPACE_AWN_ID_COUNTER_KEYS,
  WORKSPACE_AGENT_SETTINGS_DEFAULTS,
  USER_AGENT_SETTINGS_DEFAULTS,
  WORKSPACE_AGENT_SETTINGS_DEFAULTS_LEGACY,
  flattenAwnSettingsValues,
  normalizePlatformAgentSettings,
  normalizeWorkspaceAgentSettings,
  normalizeUserAgentSettings,
  parsePlatformAgentSettingsFromConfigContent,
  parseWorkspaceAgentSettingsFromConfigContent,
  touchWorkspaceAwnIdCounterOnSave,
  isMcpWriteTool,
  isMcpExecTool,
  assertMcpToolAllowed,
  assertMcpOperationConfirm,
  isPlatformBatchDenyExec,
  isPlatformConfirmDelete,
  isPlatformConfirmExec,
  isMcpDeleteTool,
  getBatchToolCategory,
  getBatchLimitForTool,
  getBatchAbsoluteMaxItems,
  getBatchDefaultParallel,
  assertBatchInvokeAllowed,
  getMcpPolicy: getPolicy,
  getPlatformReadTextMaxBytes,
  getPlatformReadBinaryMaxBytes,
  isPlatformIndexEnabled,
  isPlatformMaintenanceMode,
  getPlatformDefaultLocale,
  isPlatformAlwaysContextEnabled,
  getPlatformAlwaysContextWsFolder
};
