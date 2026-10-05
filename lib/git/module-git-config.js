const {
  INTEGRATIONS_SETTINGS_HEADER,
  parseSettingsFileContent,
  composeSettingsFileContent,
  readIntegrationsSettingsFile,
  writeIntegrationsSettingsFile
} = require("../config/settings-store");
const {
  flattenAwnSettingsValues,
  normalizeIntegrationsAgentSettings
} = require("../workspace/workspace-agent-settings");

const MODULE_GIT_COMMIT_MESSAGE_TEMPLATE_DEFAULT =
  "[{branch}] Сохранение workspace ({date} {time})";

const MODULE_GIT_CONFIG_KEYS = {
  userName: "module-git-user-name",
  userEmail: "module-git-user-email",
  commitMessageTemplate: "module-git-commit-message-template",
  signCommits: "module-git-sign-commits",
  pullStrategy: "module-git-pull-strategy"
};

function formatModuleGitCommitMessageTemplate(template, { branch = "main", date = "", time = "" } = {}) {
  const source = String(template || "").trim() || MODULE_GIT_COMMIT_MESSAGE_TEMPLATE_DEFAULT;
  return source
    .replaceAll("{branch}", String(branch || "main").trim() || "main")
    .replaceAll("{date}", String(date || ""))
    .replaceAll("{time}", String(time || ""))
    .trim();
}

function pickModuleGitConfigFromSettings(awnSettings = {}) {
  const normalized = normalizeIntegrationsAgentSettings(awnSettings);
  const userName = String(normalized[MODULE_GIT_CONFIG_KEYS.userName] || "").trim();
  const userEmail = String(normalized[MODULE_GIT_CONFIG_KEYS.userEmail] || "").trim();
  const templateRaw =
    String(normalized[MODULE_GIT_CONFIG_KEYS.commitMessageTemplate] || "").trim() ||
    MODULE_GIT_COMMIT_MESSAGE_TEMPLATE_DEFAULT;
  return {
    userName,
    userEmail,
    commitMessageTemplate: templateRaw,
    signCommits: Boolean(normalized[MODULE_GIT_CONFIG_KEYS.signCommits]),
    pullStrategy: String(normalized[MODULE_GIT_CONFIG_KEYS.pullStrategy] || "merge").trim() || "merge"
  };
}

function serializeModuleGitConfigForApi(config = {}) {
  return {
    userName: String(config.userName || "").trim(),
    userEmail: String(config.userEmail || "").trim(),
    commitMessageTemplate:
      String(config.commitMessageTemplate || "").trim() || MODULE_GIT_COMMIT_MESSAGE_TEMPLATE_DEFAULT,
    signCommits: Boolean(config.signCommits),
    pullStrategy: String(config.pullStrategy || "merge").trim() || "merge",
    signCommitsAvailable: false,
    pullStrategyAvailable: false
  };
}

async function loadModuleGitConfig(agentRoot) {
  if (!agentRoot) {
    return serializeModuleGitConfigForApi({});
  }
  const file = await readIntegrationsSettingsFile(agentRoot);
  const parsed = file.exists
    ? parseSettingsFileContent(file.content || "")
    : { headerComment: "", awn_settings: {} };
  return serializeModuleGitConfigForApi(pickModuleGitConfigFromSettings(parsed.awn_settings));
}

function buildGitAuthorFromModuleConfig(config = {}) {
  const name = String(config.userName || "").trim();
  const email = String(config.userEmail || "").trim();
  if (!name && !email) return null;
  return { name: name || "Workspace", email: email || "workspace@local" };
}

async function saveModuleGitConfig(agentRoot, patch = {}) {
  if (!agentRoot) throw new Error("Agent root not set");
  const file = await readIntegrationsSettingsFile(agentRoot);
  const parsed = file.exists
    ? parseSettingsFileContent(file.content || "")
    : {
        headerComment: INTEGRATIONS_SETTINGS_HEADER.trim(),
        awn_settings: {}
      };
  const flat = flattenAwnSettingsValues(parsed.awn_settings);

  if (patch.userName !== undefined) {
    flat[MODULE_GIT_CONFIG_KEYS.userName] = String(patch.userName || "").trim();
  }
  if (patch.userEmail !== undefined) {
    flat[MODULE_GIT_CONFIG_KEYS.userEmail] = String(patch.userEmail || "").trim();
  }
  if (patch.commitMessageTemplate !== undefined) {
    const template = String(patch.commitMessageTemplate || "").trim();
    flat[MODULE_GIT_CONFIG_KEYS.commitMessageTemplate] =
      template || MODULE_GIT_COMMIT_MESSAGE_TEMPLATE_DEFAULT;
  }

  const nextContent = composeSettingsFileContent({
    headerComment: parsed.headerComment || INTEGRATIONS_SETTINGS_HEADER.trim(),
    awn_settings: flat
  });
  const saved = await writeIntegrationsSettingsFile(
    agentRoot,
    nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`
  );
  const savedParsed = parseSettingsFileContent(saved.content);
  return serializeModuleGitConfigForApi(pickModuleGitConfigFromSettings(savedParsed.awn_settings));
}

module.exports = {
  MODULE_GIT_COMMIT_MESSAGE_TEMPLATE_DEFAULT,
  MODULE_GIT_CONFIG_KEYS,
  formatModuleGitCommitMessageTemplate,
  loadModuleGitConfig,
  saveModuleGitConfig,
  buildGitAuthorFromModuleConfig,
  serializeModuleGitConfigForApi
};
