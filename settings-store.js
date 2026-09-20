const fs = require("node:fs");
const path = require("node:path");
const NodeConfigBundle = require("./node-config-bundle");
const { parseTypeYaml } = require("./awn-yaml-utils");
const { AGENT_CMS_CORE_REL, getAgentCmsCoreAbsolute } = require("./platform-sources");
const {
  normalizePlatformAgentSettings,
  normalizeWorkspaceAgentSettings,
  normalizeUserAgentSettings,
  flattenAwnSettingsValues,
  parseWorkspaceAgentSettingsFromConfigContent
} = require("./workspace-agent-settings");
const { loadTypeCatalog, toRecordTypeDef, resolveAgentSettingsRegistry } = require("./type-catalog-loader");

const WORKSPACE_SETTINGS_FILE = "settings.yml";
const GLOBAL_SETTINGS_FILE = "settings.global.yml";
const USER_SETTINGS_REL_PATH = ".agent-cms/user-settings.yml";
const PROJECT_SETTINGS_GLOBAL_SCOPE = "__global__";
const PROJECT_SETTINGS_WORKSPACE_SETTINGS_SCOPE = "__workspace-settings__";
const PROJECT_SETTINGS_USER_SETTINGS_SCOPE = "__user-settings__";

const WORKSPACE_SETTINGS_HEADER =
  "# Agent CMS — настройки workspace (только это хранилище)\n";
const GLOBAL_SETTINGS_HEADER =
  "# Agent CMS — глобальные настройки платформы (agent-cms-core)\n";
const USER_SETTINGS_HEADER =
  "# Agent CMS — пользовательские настройки (UI, дерево меню)\n";

function getGlobalSettingsAbsolute(projectRoot) {
  return path.join(getAgentCmsCoreAbsolute(projectRoot), GLOBAL_SETTINGS_FILE);
}

function getWorkspaceSettingsAbsolute(agentRoot) {
  const root = String(agentRoot || "").trim();
  if (!root) return "";
  return path.join(root, WORKSPACE_SETTINGS_FILE);
}

function getUserSettingsAbsolute(agentRoot) {
  const root = String(agentRoot || "").trim();
  if (!root) return "";
  return path.join(root, USER_SETTINGS_REL_PATH);
}

function parseSettingsFileContent(content) {
  const bundle = NodeConfigBundle.parseNodeConfigBundle(content || "");
  return {
    headerComment: bundle.headerComment || "",
    awn_settings: flattenAwnSettingsValues(bundle.awn_settings || {}),
    awn_policy: extractAwnPolicyFromParsed(parseTypeYaml(content || "") || {})
  };
}

function extractAwnPolicyFromParsed(parsed = {}) {
  const policy = parsed.awn_policy && typeof parsed.awn_policy === "object" ? parsed.awn_policy : null;
  if (!policy) return null;
  const mcp = policy.mcp && typeof policy.mcp === "object" ? policy.mcp : {};
  const batch = policy.batch_invoke && typeof policy.batch_invoke === "object" ? policy.batch_invoke : {};
  return {
    version: Number(parsed.version) || 1,
    mcp,
    batch_invoke: batch
  };
}

function composeSettingsFileContent({ headerComment = "", awn_settings = {} } = {}) {
  const flat = flattenAwnSettingsValues(awn_settings);
  const cleaned = {};
  for (const [key, value] of Object.entries(flat)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && !value.trim()) continue;
    cleaned[key] = value;
  }
  return NodeConfigBundle.composeNodeConfigBundle({
    headerComment: headerComment || WORKSPACE_SETTINGS_HEADER.trim(),
    awn_ui: {},
    awn_settings: cleaned,
    awn_schemaYaml: ""
  });
}

function composeGlobalSettingsFileContent({ headerComment = "", awn_settings = {}, awn_policy = null } = {}) {
  const settingsPart = composeSettingsFileContent({
    headerComment: headerComment || GLOBAL_SETTINGS_HEADER.trim(),
    awn_settings
  }).trim();
  if (!awn_policy || typeof awn_policy !== "object") {
    return settingsPart ? `${settingsPart}\n` : "";
  }
  const policyYaml = stringifyAwnPolicyYaml(awn_policy);
  if (!policyYaml) return settingsPart ? `${settingsPart}\n` : "";
  return `${settingsPart}\n\n${policyYaml}\n`;
}

function stringifyAwnPolicyYaml(policy = {}) {
  const lines = ["awn_policy:"];
  const mcp = policy.mcp && typeof policy.mcp === "object" ? policy.mcp : {};
  const batch = policy.batch_invoke && typeof policy.batch_invoke === "object" ? policy.batch_invoke : {};
  if (Object.keys(mcp).length) {
    lines.push("  mcp:");
    appendYamlObject(lines, mcp, 4);
  }
  if (Object.keys(batch).length) {
    lines.push("  batch_invoke:");
    appendYamlObject(lines, batch, 4);
  }
  return lines.length > 1 ? lines.join("\n") : "";
}

function appendYamlObject(lines, obj, indent) {
  const pad = " ".repeat(indent);
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      lines.push(`${pad}${key}:`);
      for (const item of value) {
        if (item === null || item === undefined) continue;
        if (typeof item === "object") {
          lines.push(`${pad}  -`);
          appendYamlObject(lines, item, indent + 4);
        } else {
          lines.push(`${pad}  - ${formatYamlScalar(item)}`);
        }
      }
      continue;
    }
    if (typeof value === "object") {
      lines.push(`${pad}${key}:`);
      appendYamlObject(lines, value, indent + 2);
      continue;
    }
    lines.push(`${pad}${key}: ${formatYamlScalar(value)}`);
  }
}

function formatYamlScalar(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  const text = String(value ?? "");
  if (!text) return '""';
  if (/[:#\n\r\t]/.test(text) || /^[\s-]/.test(text)) return JSON.stringify(text);
  return text;
}

async function readFilePayload(absolutePath, relPath) {
  try {
    const content = await fs.promises.readFile(absolutePath, "utf-8");
    return { path: relPath, absolutePath, content, exists: true };
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
    return { path: relPath, absolutePath, content: "", exists: false };
  }
}

async function readGlobalSettingsFile(projectRoot) {
  const absolutePath = getGlobalSettingsAbsolute(projectRoot);
  const relPath = path.posix.join(AGENT_CMS_CORE_REL.replace(/\\/g, "/"), GLOBAL_SETTINGS_FILE);
  return readFilePayload(absolutePath, relPath);
}

async function readWorkspaceSettingsFile(agentRoot) {
  const absolutePath = getWorkspaceSettingsAbsolute(agentRoot);
  const relPath = WORKSPACE_SETTINGS_FILE;
  return readFilePayload(absolutePath, relPath);
}

async function readUserSettingsFile(agentRoot) {
  const absolutePath = getUserSettingsAbsolute(agentRoot);
  const relPath = USER_SETTINGS_REL_PATH;
  return readFilePayload(absolutePath, relPath);
}

async function readWorkspaceSettingsWithLegacyFallback(agentRoot, projectRoot) {
  const primary = await readWorkspaceSettingsFile(agentRoot);
  if (primary.exists) {
    return { ...primary, source: "settings.yml" };
  }

  const manifestPath = path.join(agentRoot, "manifest.md");
  const configPath = path.join(agentRoot, "config.yml");
  try {
    const content = await fs.promises.readFile(configPath, "utf-8");
    const parsed = parseSettingsFileContent(content);
    if (Object.keys(parsed.awn_settings).length) {
      return {
        path: WORKSPACE_SETTINGS_FILE,
        absolutePath: getWorkspaceSettingsAbsolute(agentRoot),
        content,
        exists: false,
        source: "config.yml",
        legacyConfigPath: "config.yml",
        awn_settings: parsed.awn_settings
      };
    }
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error;
  }

  return { ...primary, source: "none", manifestPath };
}

let platformSettingsPayloadCache = null;

async function loadPlatformSettingsPayload(projectRoot = process.cwd()) {
  const globalFile = await readGlobalSettingsFile(projectRoot);
  const parsed = parseSettingsFileContent(globalFile.content || "");
  return {
    settings: normalizePlatformAgentSettings(parsed.awn_settings),
    awn_policy: parsed.awn_policy,
    exists: Boolean(globalFile.exists),
    path: globalFile.path
  };
}

async function getPlatformSettingsPayload(projectRoot = process.cwd()) {
  if (!platformSettingsPayloadCache) {
    platformSettingsPayloadCache = await loadPlatformSettingsPayload(projectRoot);
  }
  return platformSettingsPayloadCache;
}

async function getPlatformSettings(projectRoot = process.cwd()) {
  const payload = await getPlatformSettingsPayload(projectRoot);
  return payload.settings;
}

function invalidatePlatformSettingsCache() {
  platformSettingsPayloadCache = null;
}

async function getEffectiveWorkspaceSettings(agentRoot, projectRoot) {
  const globalFile = await readGlobalSettingsFile(projectRoot);
  const globalParsed = parseSettingsFileContent(globalFile.content || "");
  const workspaceFile = await readWorkspaceSettingsWithLegacyFallback(agentRoot, projectRoot);

  let localSettings = {};
  if (workspaceFile.exists) {
    localSettings = parseSettingsFileContent(workspaceFile.content || "").awn_settings;
  } else if (workspaceFile.awn_settings) {
    localSettings = workspaceFile.awn_settings;
  } else if (!workspaceFile.exists) {
    const configRel = "config.yml";
    try {
      const configAbs = path.join(agentRoot, configRel);
      const configContent = await fs.promises.readFile(configAbs, "utf-8");
      localSettings = parseWorkspaceAgentSettingsFromConfigContent(configContent);
      localSettings = flattenAwnSettingsValues(localSettings);
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
    }
  }

  const platform = normalizePlatformAgentSettings(globalParsed.awn_settings);
  const workspace = normalizeWorkspaceAgentSettings(localSettings);

  return {
    platform,
    workspace,
    /** @deprecated use platform — MCP policy reads platform settings only */
    settings: platform,
    /** @deprecated use workspace */
    local: workspace,
    /** @deprecated use platform */
    global: platform,
    sources: {
      platform: globalFile.exists ? globalFile.path : null,
      workspace: workspaceFile.exists ? workspaceFile.path : workspaceFile.legacyConfigPath || null,
      global: globalFile.exists ? globalFile.path : null
    },
    files: {
      global: globalFile,
      workspace: workspaceFile
    }
  };
}

async function writeWorkspaceSettingsFile(agentRoot, content) {
  const absolutePath = getWorkspaceSettingsAbsolute(agentRoot);
  if (!absolutePath) throw new Error("Agent root not set");
  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.promises.writeFile(absolutePath, content, "utf-8");
  return {
    path: WORKSPACE_SETTINGS_FILE,
    absolutePath,
    exists: true,
    content
  };
}

async function writeGlobalSettingsFile(projectRoot, content) {
  const absolutePath = getGlobalSettingsAbsolute(projectRoot);
  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.promises.writeFile(absolutePath, content, "utf-8");
  return {
    path: path.posix.join(AGENT_CMS_CORE_REL.replace(/\\/g, "/"), GLOBAL_SETTINGS_FILE),
    absolutePath,
    exists: true,
    content
  };
}

async function writeUserSettingsFile(agentRoot, content) {
  const absolutePath = getUserSettingsAbsolute(agentRoot);
  if (!absolutePath) throw new Error("Agent root not set");
  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.promises.writeFile(absolutePath, content, "utf-8");
  return {
    path: USER_SETTINGS_REL_PATH,
    absolutePath,
    exists: true,
    content
  };
}

function countSettingsValues(awnSettings = {}) {
  const flat = flattenAwnSettingsValues(awnSettings);
  return Object.keys(flat).filter((key) => {
    const value = flat[key];
    if (value === null || value === undefined) return false;
    if (typeof value === "string") return value.trim() !== "";
    return true;
  }).length;
}

function isProjectSettingsGlobalScope(scopePath) {
  return String(scopePath || "").trim() === PROJECT_SETTINGS_GLOBAL_SCOPE;
}

function isProjectSettingsUserSettingsScope(scopePath) {
  return String(scopePath || "").trim() === PROJECT_SETTINGS_USER_SETTINGS_SCOPE;
}

const PLATFORM_SETTINGS_TYPE_ID = "awn.settings.platform";
const WORKSPACE_SETTINGS_TYPE_ID = "awn.settings.workspace";
const USER_SETTINGS_TYPE_ID = "awn.settings.user";
/** @deprecated use PLATFORM_SETTINGS_TYPE_ID */
const AGENT_SETTINGS_GLOBAL_TYPE_ID = PLATFORM_SETTINGS_TYPE_ID;
/** @deprecated use WORKSPACE_SETTINGS_TYPE_ID */
const AGENT_SETTINGS_LOCAL_TYPE_ID = WORKSPACE_SETTINGS_TYPE_ID;

function resolveSettingsScopeKey(scope = "workspace") {
  const normalized = String(scope || "").trim().toLowerCase();
  if (normalized === "global" || normalized === "platform") return "platform";
  if (normalized === "user") return "user";
  return "workspace";
}

function isPlatformSettingsTypeId(typeId) {
  const id = String(typeId || "").trim();
  return id === PLATFORM_SETTINGS_TYPE_ID || id === "agent.settings.global";
}

function isUserSettingsTypeId(typeId) {
  const id = String(typeId || "").trim();
  return id === USER_SETTINGS_TYPE_ID || id === "agent.settings.user";
}

function getAgentSettingsRegistry(projectRoot) {
  return resolveAgentSettingsRegistry(getAgentCmsCoreAbsolute(projectRoot));
}

function normalizeAgentSettingsFieldGroups(fieldGroups = []) {
  return (Array.isArray(fieldGroups) ? fieldGroups : [])
    .filter((group) => group && group.id)
    .map((group) => ({
      id: String(group.id),
      name: group.name || group.title || group.id,
      description: String(group.description || "").trim()
    }));
}

function resolveAgentSettingsTypeId(scope = "workspace", projectRoot = process.cwd()) {
  const registry = getAgentSettingsRegistry(projectRoot);
  const scopeKey = resolveSettingsScopeKey(scope);
  const entry = registry.schema[scopeKey];
  const typeId = String(entry?.type || "").trim();
  if (typeId) return typeId;
  if (scopeKey === "platform") return PLATFORM_SETTINGS_TYPE_ID;
  if (scopeKey === "user") return USER_SETTINGS_TYPE_ID;
  return WORKSPACE_SETTINGS_TYPE_ID;
}

function buildAgentSettingsSchemaPayloadFromType(typeId, byId, projectRoot = process.cwd()) {
  const isPlatform = isPlatformSettingsTypeId(typeId);
  const isUser = isUserSettingsTypeId(typeId);
  const entry = byId.get(typeId);
  if (!entry) {
    return {
      type: typeId,
      scope: isPlatform ? "global" : isUser ? "user" : "local",
      name: isPlatform ? "Настройки платформы" : isUser ? "Пользовательские настройки" : "Настройки workspace",
      fieldGroups: [],
      fields: {}
    };
  }
  const typeDef = toRecordTypeDef(entry, byId);
  const schema = entry.schema && typeof entry.schema === "object" ? entry.schema : {};
  const ownFieldKeys = Object.keys(schema.fields && typeof schema.fields === "object" ? schema.fields : {});
  const mergedFields = typeDef.fields && typeof typeDef.fields === "object" ? typeDef.fields : {};
  const platformTypeId = resolveAgentSettingsTypeId("platform", projectRoot);
  const platformEntry = byId.get(platformTypeId);
  const platformSchema =
    platformEntry?.schema && typeof platformEntry.schema === "object" ? platformEntry.schema : {};
  const platformFieldKeys = Object.keys(
    platformSchema.fields && typeof platformSchema.fields === "object" ? platformSchema.fields : {}
  );
  const fieldKeys = ownFieldKeys.length
    ? ownFieldKeys
    : isPlatform && platformFieldKeys.length
      ? platformFieldKeys
      : Object.keys(mergedFields).filter((key) => !["scope", "value", "enabled"].includes(key));
  const fields = {};
  for (const key of fieldKeys) {
    if (mergedFields[key]) fields[key] = mergedFields[key];
  }
  return {
    type: typeId,
    scope: isPlatform ? "global" : isUser ? "user" : "local",
    name: typeDef.name || typeId,
    description: schema.description || typeDef.description || "",
    valuesFile:
      schema.valuesFile ||
      (isPlatform ? GLOBAL_SETTINGS_FILE : isUser ? USER_SETTINGS_REL_PATH : WORKSPACE_SETTINGS_FILE),
    consumer: Array.isArray(schema.consumer) ? schema.consumer : [],
    fieldGroups: normalizeAgentSettingsFieldGroups(typeDef.fieldGroups || schema.fieldGroups),
    fields
  };
}

function getAgentSettingsSchemaPayload(agentRoot, projectRoot, scope = "workspace") {
  const { byId } = loadTypeCatalog(projectRoot, agentRoot);
  const registry = getAgentSettingsRegistry(projectRoot);
  const scopeKey = resolveSettingsScopeKey(scope);
  const typeId = resolveAgentSettingsTypeId(scope, projectRoot);
  const payload = buildAgentSettingsSchemaPayloadFromType(typeId, byId, projectRoot);
  const valuesFile = registry.values[scopeKey];
  if (valuesFile) payload.valuesFile = valuesFile;
  if (registry.description && !payload.description) payload.description = registry.description;
  return payload;
}

async function buildPlatformSettingsMeta(projectRoot = process.cwd(), agentRoot = "") {
  const coreRoot = getAgentCmsCoreAbsolute(projectRoot);
  const settingsRegistry = getAgentSettingsRegistry(coreRoot);
  const { byId } = loadTypeCatalog(projectRoot, agentRoot);
  let registryDoc = {};
  try {
    const registryPath = path.join(coreRoot, "awn-system", "registry.yml");
    const content = await fs.promises.readFile(registryPath, "utf-8");
    registryDoc = parseTypeYaml(content) || {};
  } catch {
    registryDoc = {};
  }
  let cmsVersion = "";
  try {
    cmsVersion = String(require(path.join(projectRoot, "package.json")).version || "").trim();
  } catch {
    cmsVersion = "";
  }
  const settingsTypes = Object.fromEntries(
    Object.entries(settingsRegistry.schema || {}).map(([key, entry]) => [
      key,
      { type: entry?.type || "", path: entry?.path || "" }
    ])
  );
  return {
    cmsVersion,
    registryVersion: Number(registryDoc.version) || 1,
    registryMode: String(registryDoc.mode || "").trim(),
    registryAgent: String(registryDoc.agent || "").trim(),
    registryMigrationDate: String(registryDoc["migration-date"] || registryDoc.migrationDate || "").trim(),
    canonicalTypes: String(registryDoc["canonical-types"] || "").trim(),
    nodeVersion: process.version,
    platformOs: process.platform,
    corePath: AGENT_CMS_CORE_REL.replace(/\\/g, "/"),
    settingsPath: path.posix.join(AGENT_CMS_CORE_REL.replace(/\\/g, "/"), GLOBAL_SETTINGS_FILE),
    registryPath: path.posix.join(AGENT_CMS_CORE_REL.replace(/\\/g, "/"), "awn-system/registry.yml"),
    docsMap: String(registryDoc.docs?.map || "GLOBAL_MCP_DOC.md").trim(),
    typeCatalogCount: byId.size,
    settingsScopes: settingsTypes,
    systemInfo: [
      { key: "cms-version", label: "Версия CMS", value: cmsVersion || "—" },
      { key: "registry-version", label: "Версия registry.yml", value: String(Number(registryDoc.version) || 1) },
      {
        key: "registry-mode",
        label: "Режим registry",
        value: String(registryDoc.mode || "—").trim() || "—"
      },
      {
        key: "registry-migration-date",
        label: "Дата миграции типов",
        value: String(registryDoc["migration-date"] || registryDoc.migrationDate || "—").trim() || "—"
      },
      { key: "node-version", label: "Node.js", value: process.version },
      { key: "platform-os", label: "ОС сервера", value: process.platform },
      {
        key: "core-path",
        label: "Каталог ядра",
        value: AGENT_CMS_CORE_REL.replace(/\\/g, "/")
      },
      {
        key: "type-catalog-count",
        label: "Типов в каталоге",
        value: String(byId.size)
      },
      {
        key: "settings-global-path",
        label: "Файл platform values",
        value: path.posix.join(AGENT_CMS_CORE_REL.replace(/\\/g, "/"), GLOBAL_SETTINGS_FILE)
      }
    ],
    enforcedFields: [
      "maintenance-mode",
      "default-locale",
      "mcp-mode",
      "batch-enabled",
      "batch-read-limit",
      "batch-write-limit",
      "read-text-max-bytes",
      "read-binary-max-bytes",
      "index-semantic-enabled",
      "index-fulltext-enabled",
      "index-storage-enabled",
      "index-links-enabled"
    ],
    registryNote:
      "Типы в awn-system/types/ — справочник схем. Редактируются в коде платформы, не через форму настроек."
  };
}

module.exports = {
  WORKSPACE_SETTINGS_FILE,
  GLOBAL_SETTINGS_FILE,
  USER_SETTINGS_REL_PATH,
  PROJECT_SETTINGS_GLOBAL_SCOPE,
  PROJECT_SETTINGS_WORKSPACE_SETTINGS_SCOPE,
  PROJECT_SETTINGS_USER_SETTINGS_SCOPE,
  WORKSPACE_SETTINGS_HEADER,
  GLOBAL_SETTINGS_HEADER,
  USER_SETTINGS_HEADER,
  getGlobalSettingsAbsolute,
  getWorkspaceSettingsAbsolute,
  getUserSettingsAbsolute,
  parseSettingsFileContent,
  extractAwnPolicyFromParsed,
  composeSettingsFileContent,
  composeGlobalSettingsFileContent,
  readGlobalSettingsFile,
  readWorkspaceSettingsFile,
  readUserSettingsFile,
  readWorkspaceSettingsWithLegacyFallback,
  getEffectiveWorkspaceSettings,
  writeWorkspaceSettingsFile,
  writeGlobalSettingsFile,
  writeUserSettingsFile,
  countSettingsValues,
  isProjectSettingsGlobalScope,
  isProjectSettingsUserSettingsScope,
  PLATFORM_SETTINGS_TYPE_ID,
  WORKSPACE_SETTINGS_TYPE_ID,
  USER_SETTINGS_TYPE_ID,
  AGENT_SETTINGS_GLOBAL_TYPE_ID,
  AGENT_SETTINGS_LOCAL_TYPE_ID,
  resolveSettingsScopeKey,
  resolveAgentSettingsTypeId,
  getAgentSettingsRegistry,
  getAgentSettingsSchemaPayload,
  getPlatformSettings,
  getPlatformSettingsPayload,
  invalidatePlatformSettingsCache,
  buildPlatformSettingsMeta
};
