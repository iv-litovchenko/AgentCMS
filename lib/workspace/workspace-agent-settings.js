const NodeConfigBundle = require("../config/node-config-bundle");
const { loadMcpPolicy } = require("../config/mcp-policy-loader");
const { getVoiceSettingsDefaults } = require("./workspace-voice-settings-bridge");
const { getWindowVoiceSettingsDefaults } = require("./workspace-window-settings-bridge");
const { getRouteSettingsDefaults: getRouteConfigSettingsDefaults } = require("./workspace-route-settings-bridge");
const { getMediaSettingsDefaults } = require("./workspace-media-settings-bridge");
const { getUiSettingsDefaults } = require("./workspace-ui-settings-bridge");
const { getBuiltinRegistryQueryPresetsUi } = require("./registry-queries");

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
  "indexing-ocr-langs": "rus+eng",
  "index-ocr-enabled": false,
  "index-workspace-id-enabled": true,
  "index-wsmap-enabled": true,
  "index-storage-mode": "quick",
  "index-storage-batch-size": 30,
  "index-storage-sqlite-enabled": false,
  "index-path-prefixes": [],
  "index-exclude-patterns":
    ".git/\n.agent-cms/cache/\nnode_modules/\nawn-temp/\nawn-media-cloud/\nawn-google-drive/\n*.mdback",
  "index-file-extensions": [".md", ".sidecar.md"],
  "search-default-scopes": ["semantic", "fulltext"],
  "search-semantic-chunk-size": "900",
  "search-semantic-chunk-overlap": "100",
  "search-hybrid-semantic-weight": "60",
  "search-hybrid-fulltext-weight": "40",
  "auto-retain-facts": false,
  "always-context-platform-readme": true,
  "always-context-global-mcp-doc": true,
  "always-context-global-response-style": true,
  "always-context-global-rules": true,
  "always-context-global-markdown-showcase": false,
  "always-context-md-files": ["AGENTS.md"],
  "always-context-ws-folder": "awn-shared/context/awn-storage/",
  "default-workspace-id": "",
  "media-cloud-default-provider": "google-drive",
  "media-cloud-providers": [
    { key: "google-drive", title: "Google Диск" },
    { key: "yandex-disk", title: "Яндекс Диск" }
  ]
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

const WORKSPACE_RECYCLE_COUNTER_MODEL = "workspace-recycle-marker-v1";
const WORKSPACE_RECYCLE_ID_PAD_WIDTH = 8;

const WORKSPACE_RECYCLE_COUNTER_KEYS = {
  next: "awn-recycle-id-next",
  issued: "awn-recycle-id-issued",
  updatedAt: "awn-recycle-id-updated-at",
  model: "awn-recycle-id-model",
  padWidth: "awn-recycle-id-pad-width"
};

const WORKSPACE_AGENT_SETTINGS_DEFAULTS = {
  "agent-language": "ru",
  "response-style": "agents-md",
  "notify-on-complete": false,
  "workspace-idle-screensaver-minutes": "3",
  "workspace-pomodoro-enabled": true,
  "workspace-pomodoro-work-minutes": "25",
  "workspace-pomodoro-break-minutes": "5",
  [WORKSPACE_AWN_ID_COUNTER_KEYS.next]: 1,
  [WORKSPACE_AWN_ID_COUNTER_KEYS.issued]: 0,
  [WORKSPACE_AWN_ID_COUNTER_KEYS.updatedAt]: "",
  [WORKSPACE_AWN_ID_COUNTER_KEYS.model]: WORKSPACE_AWN_ID_COUNTER_MODEL,
  [WORKSPACE_RECYCLE_COUNTER_KEYS.next]: 1,
  [WORKSPACE_RECYCLE_COUNTER_KEYS.issued]: 0,
  [WORKSPACE_RECYCLE_COUNTER_KEYS.updatedAt]: "",
  [WORKSPACE_RECYCLE_COUNTER_KEYS.model]: WORKSPACE_RECYCLE_COUNTER_MODEL,
  [WORKSPACE_RECYCLE_COUNTER_KEYS.padWidth]: WORKSPACE_RECYCLE_ID_PAD_WIDTH,
  "registry-query-presets": getBuiltinRegistryQueryPresetsUi(),
  "ws-static-plugin-example": "",
  "ws-static-example-1": "значение 1",
  "ws-static-example-2": "значение 2",
  "ws-static-example-3": "значение 3",
  "dependencies-file": "dependencies.csv",
  "dependencies-columns": [
    {
      key: "host",
      title: "Хост",
      description: "cursor | claude | codex | shell | linux | mac | any",
      required: true
    },
    {
      key: "kind",
      title: "Тип",
      description:
        "any | runtime | npm | pip | brew | apt | docker | mcp | mcp-tool | skill | plugin | rule | hook | env | repo | doc | cli | self | other",
      required: true
    },
    {
      key: "name",
      title: "Название",
      description: "Короткое имя зависимости",
      required: true
    },
    {
      key: "description",
      title: "Описание",
      description: "Зачем нужно в проекте",
      required: false
    },
    {
      key: "path",
      title: "Путь / install",
      description: "Путь, package, команда установки или env-ключ",
      required: false
    },
    {
      key: "version",
      title: "Версия",
      description: ">=22, 1.2.3, latest",
      required: false
    },
    {
      key: "status",
      title: "Статус",
      description: "active | optional | missing | broken",
      required: false
    },
    {
      key: "required",
      title: "Обязательно",
      description: "yes | no",
      required: false
    },
    {
      key: "notes",
      title: "Заметки",
      description: "Кто ставил, дата, self-view агента",
      required: false
    }
  ],
  "default-slot": "main",
  "awn-temp-ttl-days": 0,
  ...getRouteConfigSettingsDefaults(),
  ...getVoiceSettingsDefaults(),
  ...getMediaSettingsDefaults(),
  ...getWindowVoiceSettingsDefaults(),
  ...getUiSettingsDefaults()
};

const USER_AGENT_SETTINGS_DEFAULTS = {
  "tree-show-empty-folders": true,
  "tree-active-topics-only": false,
  "tree-pad-sort-indexes": false,
  "tree-max-depth": 7,
  "sidebar-width": 280,
  "pinned-branch-path": "",
  "hide-sensitive-data": false,
  "user-static-plugin-example": "",
  "user-static-example-1": "значение 1",
  "user-static-example-2": "значение 2",
  "user-static-example-3": "значение 3"
};

const INTEGRATIONS_AGENT_SETTINGS_DEFAULTS = {
  "integrations-model-version": "stub-v1",
  "integrations-containers-note": "static-groups-stub",
  "module-git-user-name": "",
  "module-git-user-email": "",
  "module-git-commit-message-template": "[{branch}] Сохранение workspace ({date} {time})",
  "module-git-sign-commits": false,
  "module-git-pull-strategy": "merge",
  "container-cursor-skill-enabled": false,
  "container-cursor-skill-kind": "skill",
  "container-cursor-skill-source": "~/.cursor/skills/automate",
  "container-cursor-skill-namespace": "cursor-skill",
  "container-mcp-bridge-enabled": false,
  "container-mcp-bridge-endpoint": "http://127.0.0.1:7337/mcp",
  "container-mcp-bridge-tools": "list_workspaces, read_page_body, search_workspace_content",
  "container-mcp-bridge-auth-token": ""
};

/** @deprecated merged defaults kept for compatibility checks only */
const WORKSPACE_AGENT_SETTINGS_DEFAULTS_LEGACY = {
  ...PLATFORM_AGENT_SETTINGS_DEFAULTS,
  ...WORKSPACE_AGENT_SETTINGS_DEFAULTS
};

function getPolicy() {
  return loadMcpPolicy();
}

function coerceSettingBoolean(value) {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(text)) return true;
  if (["false", "0", "no", "off", ""].includes(text)) return false;
  return Boolean(value);
}

function coerceSettingString(value, fallback = "") {
  const safeFallback = typeof fallback === "string" ? fallback : String(fallback ?? "");
  if (value === null || value === undefined) return safeFallback;
  if (typeof value === "string") {
    const text = value.trim();
    return !text || text === "[object Object]" ? safeFallback : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean).join("\n") || safeFallback;
  }
  if (typeof value === "object") return safeFallback;
  return String(value);
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
    if (typeof defaultValue === "boolean") normalized[key] = coerceSettingBoolean(value);
    else if (typeof defaultValue === "number") normalized[key] = Number(value) || 0;
    else if (Array.isArray(defaultValue)) {
      const defaultHasObjects = defaultValue.some((item) => item && typeof item === "object");
      if (Array.isArray(value)) {
        const valueHasObjects = value.some((item) => item && typeof item === "object");
        if (valueHasObjects || defaultHasObjects) {
          normalized[key] = value.filter((item) => item && typeof item === "object");
        } else {
          normalized[key] = value.map((item) => String(item ?? "").trim()).filter(Boolean);
        }
      } else {
        const raw = String(value ?? "").trim();
        normalized[key] = raw
          ? raw.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean)
          : [...defaultValue];
      }
    } else if (typeof defaultValue === "string") {
      normalized[key] = coerceSettingString(value, defaultValue);
    } else normalized[key] = String(value ?? defaultValue);
  }
  return normalized;
}

const ALWAYS_CONTEXT_MD_FILE_KEYS = [
  "AGENTS.md",
  "AUTH.md",
  "BOOTSTRAP.md",
  "ONBOARDING.md",
  "SKILL.md",
  "README.md",
  "NOTE.md",
  "TODO.md"
];

const ALWAYS_CONTEXT_MD_LEGACY_SETTING_KEYS = [
  { file: "AGENTS.md", keys: ["always-context-md-agents-md", "always-context-agents-md"] },
  { file: "AUTH.md", keys: ["always-context-md-auth-md"] },
  { file: "BOOTSTRAP.md", keys: ["always-context-md-bootstrap-md"] },
  { file: "ONBOARDING.md", keys: ["always-context-md-onboarding-md"] },
  { file: "SKILL.md", keys: ["always-context-md-skill-md"] },
  { file: "README.md", keys: ["always-context-md-readme-md"] },
  { file: "NOTE.md", keys: ["always-context-md-note-md"] },
  { file: "TODO.md", keys: ["always-context-md-todo-md"] }
];

function migrateAlwaysContextMdFiles(flat = {}) {
  if ("always-context-md-files" in flat) return flat;
  let hasLegacy = false;
  const selected = [];
  for (const { file, keys } of ALWAYS_CONTEXT_MD_LEGACY_SETTING_KEYS) {
    for (const key of keys) {
      if (!(key in flat)) continue;
      hasLegacy = true;
      if (Boolean(flat[key])) selected.push(file);
      break;
    }
  }
  if (!hasLegacy) return flat;
  return { ...flat, "always-context-md-files": selected };
}

function getMediaCloudProviders(settings = {}) {
  const normalized = normalizePlatformAgentSettings(settings);
  const raw = normalized["media-cloud-providers"];
  const list = Array.isArray(raw) ? raw : [];
  const providers = list
    .map((item) => ({
      key: String(item?.key || "").trim(),
      title: String(item?.title || "").trim() || String(item?.key || "").trim()
    }))
    .filter((item) => item.key);
  if (providers.length) return providers;
  return (PLATFORM_AGENT_SETTINGS_DEFAULTS["media-cloud-providers"] || []).map((item) => ({
    key: String(item.key || "").trim(),
    title: String(item.title || item.key || "").trim()
  }));
}

function getMediaCloudDefaultProviderId(settings = {}) {
  const normalized = normalizePlatformAgentSettings(settings);
  const value = String(normalized["media-cloud-default-provider"] || "").trim();
  if (value) return value;
  const first = getMediaCloudProviders(normalized)[0];
  return first?.key || "google-drive";
}

function normalizePlatformAgentSettings(raw = {}) {
  const migrated = migrateAlwaysContextMdFiles(flattenAwnSettingsValues(raw));
  const normalized = normalizeSettingsWithDefaults(migrated, PLATFORM_AGENT_SETTINGS_DEFAULTS);
  if (Array.isArray(normalized["always-context-md-files"])) {
    normalized["always-context-md-files"] = normalized["always-context-md-files"]
      .map((item) => String(item ?? "").trim())
      .filter((item) => ALWAYS_CONTEXT_MD_FILE_KEYS.includes(item));
  }
  return normalized;
}

function normalizeWorkspaceAgentSettings(raw = {}) {
  const normalized = normalizeSettingsWithDefaults(raw, WORKSPACE_AGENT_SETTINGS_DEFAULTS);
  try {
    const { normalizeRegistryQueryPresets } = require("./workspace-registry-queries-bridge");
    normalized["registry-query-presets"] = normalizeRegistryQueryPresets(
      normalized["registry-query-presets"]
    );
  } catch {
    // registry presets optional
  }
  return normalized;
}

function normalizeUserAgentSettings(raw = {}) {
  return normalizeSettingsWithDefaults(raw, USER_AGENT_SETTINGS_DEFAULTS);
}

function normalizeIntegrationsAgentSettings(raw = {}) {
  return normalizeSettingsWithDefaults(raw, INTEGRATIONS_AGENT_SETTINGS_DEFAULTS);
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
    "workspace-id": "index-workspace-id-enabled",
    wsmap: "index-wsmap-enabled"
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
  if (!settingKey) return true;
  if (settingKey in normalized) return Boolean(normalized[settingKey]);
  return true;
}

function getPlatformAlwaysContextMdFiles(settings = {}) {
  const files = normalizePlatformAgentSettings(settings)["always-context-md-files"];
  return Array.isArray(files) ? files : PLATFORM_AGENT_SETTINGS_DEFAULTS["always-context-md-files"];
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

function workspaceAwnSettingsFlatEqual(a = {}, b = {}) {
  const left = a && typeof a === "object" && !Array.isArray(a) ? a : {};
  const right = b && typeof b === "object" && !Array.isArray(b) ? b : {};
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (JSON.stringify(left[key]) !== JSON.stringify(right[key])) return false;
  }
  return true;
}

function touchWorkspaceAwnIdCounterOnSave(settings = {}, previousFlat = null) {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return settings;
  const touched = { ...settings };
  const hasCounterField =
    WORKSPACE_AWN_ID_COUNTER_KEYS.next in touched || WORKSPACE_AWN_ID_COUNTER_KEYS.issued in touched;
  if (!hasCounterField) return touched;

  const prev =
    previousFlat && typeof previousFlat === "object" && !Array.isArray(previousFlat) ? previousFlat : null;
  const countersChanged =
    !prev ||
    prev[WORKSPACE_AWN_ID_COUNTER_KEYS.next] !== touched[WORKSPACE_AWN_ID_COUNTER_KEYS.next] ||
    prev[WORKSPACE_AWN_ID_COUNTER_KEYS.issued] !== touched[WORKSPACE_AWN_ID_COUNTER_KEYS.issued];

  if (!countersChanged) {
    const prevUpdated = prev?.[WORKSPACE_AWN_ID_COUNTER_KEYS.updatedAt];
    if (prevUpdated) {
      touched[WORKSPACE_AWN_ID_COUNTER_KEYS.updatedAt] = prevUpdated;
    }
    if (prev?.[WORKSPACE_AWN_ID_COUNTER_KEYS.model]) {
      touched[WORKSPACE_AWN_ID_COUNTER_KEYS.model] = prev[WORKSPACE_AWN_ID_COUNTER_KEYS.model];
    }
    return touched;
  }

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
  WORKSPACE_RECYCLE_COUNTER_MODEL,
  WORKSPACE_RECYCLE_COUNTER_KEYS,
  WORKSPACE_RECYCLE_ID_PAD_WIDTH,
  WORKSPACE_AGENT_SETTINGS_DEFAULTS,
  USER_AGENT_SETTINGS_DEFAULTS,
  INTEGRATIONS_AGENT_SETTINGS_DEFAULTS,
  WORKSPACE_AGENT_SETTINGS_DEFAULTS_LEGACY,
  flattenAwnSettingsValues,
  getMediaCloudProviders,
  getMediaCloudDefaultProviderId,
  normalizePlatformAgentSettings,
  normalizeWorkspaceAgentSettings,
  normalizeUserAgentSettings,
  normalizeIntegrationsAgentSettings,
  parsePlatformAgentSettingsFromConfigContent,
  parseWorkspaceAgentSettingsFromConfigContent,
  workspaceAwnSettingsFlatEqual,
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
  getPlatformAlwaysContextMdFiles,
  getPlatformAlwaysContextWsFolder
};
