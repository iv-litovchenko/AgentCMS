const { normalizeGitExtensions, MODULE_GIT_DEFAULT_EXTENSIONS } = require("./workspace-git-module");
const {
  formatModuleGitCommitMessageTemplate,
  MODULE_GIT_COMMIT_MESSAGE_TEMPLATE_DEFAULT
} = require("./module-git-config");
const {
  readIntegrationsSettingsFile,
  parseSettingsFileContent
} = require("../config/settings-store");
const { normalizeIntegrationsAgentSettings } = require("../workspace/workspace-agent-settings");

const MODULE_GIT_COMMIT_BATCH_KEYS = {
  batchOrder: "module-git-commit-batch-order",
  contentExtensions: "module-git-commit-extensions-content",
  systemExtensions: "module-git-commit-extensions-system",
  contentTemplate: "module-git-commit-message-template-content",
  systemTemplate: "module-git-commit-message-template-system",
  legacyExtensions: "module-git-commit-extensions",
  legacyTemplate: "module-git-commit-message-template"
};

const MODULE_GIT_CONTENT_EXTENSIONS_DEFAULT = ["md", "mdx", "csv", "txt"];

const MODULE_GIT_SYSTEM_EXTENSIONS_DEFAULT = MODULE_GIT_DEFAULT_EXTENSIONS.filter(
  (ext) => !MODULE_GIT_CONTENT_EXTENSIONS_DEFAULT.includes(ext)
);

const MODULE_GIT_COMMIT_TEMPLATE_CONTENT_DEFAULT =
  "[{branch}] Сохранение workspace ({date} {time}) - Content";
const MODULE_GIT_COMMIT_TEMPLATE_SYSTEM_DEFAULT =
  "[{branch}] Сохранение workspace ({date} {time}) - System";

function extensionsTextFromList(list) {
  return (Array.isArray(list) ? list : [])
    .map((entry) => String(entry || "").trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean)
    .join("\n");
}

function parseExtensionsSettingValue(value, fallbackList) {
  const normalized = normalizeGitExtensions(
    value == null || String(value).trim() === "" ? extensionsTextFromList(fallbackList) : value
  );
  return normalized;
}

function splitLegacyExtensions(legacyValue) {
  const all = parseExtensionsSettingValue(legacyValue, MODULE_GIT_DEFAULT_EXTENSIONS);
  const contentSet = new Set(MODULE_GIT_CONTENT_EXTENSIONS_DEFAULT);
  const content = all.filter((ext) => contentSet.has(ext));
  const system = all.filter((ext) => !contentSet.has(ext));
  return {
    content: content.length ? content : [...MODULE_GIT_CONTENT_EXTENSIONS_DEFAULT],
    system: system.length ? system : [...MODULE_GIT_SYSTEM_EXTENSIONS_DEFAULT]
  };
}

function resolveModuleGitCommitBatchOrder(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "content-first") return "content-first";
  return "system-first";
}

function pickCommitBatchesFromSettings(awnSettings = {}) {
  const normalized = normalizeIntegrationsAgentSettings(awnSettings);
  const legacyExtensions = normalized[MODULE_GIT_COMMIT_BATCH_KEYS.legacyExtensions];
  const hasContentKey =
    String(normalized[MODULE_GIT_COMMIT_BATCH_KEYS.contentExtensions] || "").trim() !== "";
  const hasSystemKey =
    String(normalized[MODULE_GIT_COMMIT_BATCH_KEYS.systemExtensions] || "").trim() !== "";

  let contentExtensions;
  let systemExtensions;
  if (hasContentKey || hasSystemKey) {
    contentExtensions = parseExtensionsSettingValue(
      normalized[MODULE_GIT_COMMIT_BATCH_KEYS.contentExtensions],
      MODULE_GIT_CONTENT_EXTENSIONS_DEFAULT
    );
    systemExtensions = parseExtensionsSettingValue(
      normalized[MODULE_GIT_COMMIT_BATCH_KEYS.systemExtensions],
      MODULE_GIT_SYSTEM_EXTENSIONS_DEFAULT
    );
  } else if (String(legacyExtensions || "").trim()) {
    const split = splitLegacyExtensions(legacyExtensions);
    contentExtensions = split.content;
    systemExtensions = split.system;
  } else {
    contentExtensions = [...MODULE_GIT_CONTENT_EXTENSIONS_DEFAULT];
    systemExtensions = [...MODULE_GIT_SYSTEM_EXTENSIONS_DEFAULT];
  }

  const legacyTemplate = String(normalized[MODULE_GIT_COMMIT_BATCH_KEYS.legacyTemplate] || "").trim();
  const contentTemplate =
    String(normalized[MODULE_GIT_COMMIT_BATCH_KEYS.contentTemplate] || "").trim() ||
    (legacyTemplate ? `${legacyTemplate} - Content` : MODULE_GIT_COMMIT_TEMPLATE_CONTENT_DEFAULT);
  const systemTemplate =
    String(normalized[MODULE_GIT_COMMIT_BATCH_KEYS.systemTemplate] || "").trim() ||
    (legacyTemplate ? `${legacyTemplate} - System` : MODULE_GIT_COMMIT_TEMPLATE_SYSTEM_DEFAULT);

  const order = resolveModuleGitCommitBatchOrder(normalized[MODULE_GIT_COMMIT_BATCH_KEYS.batchOrder]);

  const contentBatch = {
    id: "content",
    label: "Content",
    extensions: contentExtensions,
    messageTemplate: contentTemplate || MODULE_GIT_COMMIT_TEMPLATE_CONTENT_DEFAULT
  };
  const systemBatch = {
    id: "system",
    label: "System",
    extensions: systemExtensions,
    messageTemplate: systemTemplate || MODULE_GIT_COMMIT_TEMPLATE_SYSTEM_DEFAULT
  };

  const batches = order === "content-first" ? [contentBatch, systemBatch] : [systemBatch, contentBatch];

  const unionExtensions = [...new Set([...contentExtensions, ...systemExtensions])];

  return {
    batchOrder: order,
    batches,
    unionExtensions,
    contentExtensionsText: extensionsTextFromList(contentExtensions),
    systemExtensionsText: extensionsTextFromList(systemExtensions),
    contentTemplate,
    systemTemplate
  };
}

function formatCommitBatchMessages(batches, { branch = "main", date = "", time = "" } = {}) {
  return batches.map((batch) => ({
    ...batch,
    message: formatModuleGitCommitMessageTemplate(batch.messageTemplate, { branch, date, time })
  }));
}

async function loadModuleGitCommitBatchSettings(agentRoot) {
  if (!agentRoot) {
    return pickCommitBatchesFromSettings({});
  }
  const file = await readIntegrationsSettingsFile(agentRoot);
  const parsed = file.exists
    ? parseSettingsFileContent(file.content || "")
    : { headerComment: "", awn_settings: {} };
  return pickCommitBatchesFromSettings(parsed.awn_settings);
}

module.exports = {
  MODULE_GIT_COMMIT_BATCH_KEYS,
  MODULE_GIT_CONTENT_EXTENSIONS_DEFAULT,
  MODULE_GIT_SYSTEM_EXTENSIONS_DEFAULT,
  MODULE_GIT_COMMIT_TEMPLATE_CONTENT_DEFAULT,
  MODULE_GIT_COMMIT_TEMPLATE_SYSTEM_DEFAULT,
  pickCommitBatchesFromSettings,
  loadModuleGitCommitBatchSettings,
  formatCommitBatchMessages,
  extensionsTextFromList
};
