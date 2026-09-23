const fs = require("node:fs");
const path = require("node:path");
const NodeConfigBundle = require("./node-config-bundle");
const { parseTypeYaml } = require("./awn-yaml-utils");
const { AGENT_CMS_CORE_REL, getAgentCmsCoreAbsolute } = require("./platform-sources");
const {
  PLATFORM_AGENT_SETTINGS_DEFAULTS,
  WORKSPACE_AGENT_SETTINGS_DEFAULTS,
  USER_AGENT_SETTINGS_DEFAULTS,
  normalizePlatformAgentSettings,
  normalizeWorkspaceAgentSettings,
  normalizeUserAgentSettings,
  normalizeIntegrationsAgentSettings,
  flattenAwnSettingsValues,
  parseWorkspaceAgentSettingsFromConfigContent,
  touchWorkspaceAwnIdCounterOnSave
} = require("./workspace-agent-settings");
const { loadTypeCatalog, toRecordTypeDef, resolveAgentSettingsRegistry } = require("./type-catalog-loader");

const { rel, projectRel, legacy, platformSettingsAbs } = require("./paths/agent-cms");
const PLATFORM_SETTINGS_FILE = projectRel.settings.platform;
const WORKSPACE_SETTINGS_FILE = rel.settings.workspace;
const PLATFORM_SETTINGS_LEGACY_FILES = [legacy.platformSettings];
const WORKSPACE_SETTINGS_LEGACY_FILE = legacy.workspaceSettings;
const USER_SETTINGS_REL_PATH = rel.settings.user;
const USER_SETTINGS_LEGACY_FILES = [legacy.userSettings, legacy.userSettingsRoot];

/** @deprecated use PLATFORM_SETTINGS_FILE */
const GLOBAL_SETTINGS_FILE = PLATFORM_SETTINGS_FILE;
const INTEGRATIONS_SETTINGS_REL_PATH = rel.settings.integrations;
const PROJECT_SETTINGS_GLOBAL_SCOPE = "__global__";
const PROJECT_SETTINGS_WORKSPACE_SETTINGS_SCOPE = "__workspace-settings__";
const PROJECT_SETTINGS_INTEGRATIONS_SETTINGS_SCOPE = "__integrations-settings__";
const PROJECT_SETTINGS_USER_SETTINGS_SCOPE = "__user-settings__";

const WORKSPACE_SETTINGS_HEADER =
  "# Agent CMS — настройки workspace (только это хранилище)\n";
const PLATFORM_SETTINGS_HEADER =
  "# Agent CMS — настройки платформы\n";
/** @deprecated use PLATFORM_SETTINGS_HEADER */
const GLOBAL_SETTINGS_HEADER = PLATFORM_SETTINGS_HEADER;
const USER_SETTINGS_HEADER =
  "# Agent CMS — пользовательские настройки (UI, дерево меню)\n";
const INTEGRATIONS_SETTINGS_HEADER =
  "# Agent CMS — интеграции и плагины (контейнеры внешних сервисов)\n";

function getPlatformSettingsAbsolute(projectRoot) {
  return platformSettingsAbs(projectRoot);
}

/** @deprecated use getPlatformSettingsAbsolute */
function getGlobalSettingsAbsolute(projectRoot) {
  return getPlatformSettingsAbsolute(projectRoot);
}

function getWorkspaceSettingsAbsolute(agentRoot) {
  const root = String(agentRoot || "").trim();
  if (!root) return "";
  return path.join(root, WORKSPACE_SETTINGS_FILE);
}

function getWorkspaceSettingsLegacyAbsolute(agentRoot) {
  const root = String(agentRoot || "").trim();
  if (!root) return "";
  return path.join(root, WORKSPACE_SETTINGS_LEGACY_FILE);
}

async function hydrateWorkspaceSettingsFromShell(agentRoot, awnSettings = {}, projectRoot = process.cwd()) {
  try {
    const {
      migrateLegacyShellSettingsFile,
      readStateFile,
      readLegacySettingsFile
    } = require("./agent-shell/shell-settings-migrate");
    const { hydrateWorkspaceFromShell } = require("./workspace-shell-settings-bridge");
    await migrateLegacyShellSettingsFile(agentRoot, projectRoot);
    const legacyFlat = await readLegacySettingsFile(agentRoot);
    const stateFlat = await readStateFile(agentRoot);
    const shellFlat = { ...(legacyFlat || {}), ...(stateFlat || {}) };
    return hydrateWorkspaceFromShell(awnSettings, shellFlat);
  } catch {
    return awnSettings;
  }
}

async function patchPlatformSettings(platformPatch = {}, projectRoot = process.cwd()) {
  const patch = platformPatch && typeof platformPatch === "object" ? platformPatch : {};
  if (!Object.keys(patch).length) {
    return normalizePlatformAgentSettings({});
  }

  const file = await readPlatformSettingsFile(projectRoot);
  const parsed = file.exists
    ? parseSettingsFileContent(file.content || "")
    : { headerComment: PLATFORM_SETTINGS_HEADER.trim(), awn_settings: {}, awn_policy: null };
  const nextFlat = {
    ...flattenAwnSettingsValues(parsed.awn_settings || {}),
    ...patch
  };
  const nextContent = composeGlobalSettingsFileContent({
    headerComment: parsed.headerComment || PLATFORM_SETTINGS_HEADER.trim(),
    awn_settings: nextFlat,
    awn_policy: parsed.awn_policy || null
  });
  const saved = await writeGlobalSettingsFile(
    projectRoot,
    nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`
  );
  invalidatePlatformSettingsCache();
  return normalizePlatformAgentSettings(parseSettingsFileContent(saved.content).awn_settings);
}

async function patchWorkspaceSettings(agentRoot, workspacePatch = {}, projectRoot = process.cwd()) {
  const patch = workspacePatch && typeof workspacePatch === "object" ? workspacePatch : {};
  if (!Object.keys(patch).length) {
    return normalizeWorkspaceAgentSettings({});
  }

  const file = await readWorkspaceSettingsWithLegacyFallback(agentRoot, projectRoot);
  const parsed = file.exists
    ? parseSettingsFileContent(file.content || "")
    : { headerComment: WORKSPACE_SETTINGS_HEADER.trim(), awn_settings: file.awn_settings || {} };
  const nextFlat = {
    ...flattenAwnSettingsValues(parsed.awn_settings || {}),
    ...patch
  };
  const nextContent = composeSettingsFileContent({
    headerComment: parsed.headerComment || WORKSPACE_SETTINGS_HEADER.trim(),
    awn_settings: touchWorkspaceAwnIdCounterOnSave(nextFlat)
  });
  const saved = await writeWorkspaceSettingsFile(
    agentRoot,
    nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`
  );
  return normalizeWorkspaceAgentSettings(parseSettingsFileContent(saved.content).awn_settings);
}

function enrichPlatformSettingsSchema(payload = {}, projectRoot = process.cwd()) {
  const field = payload.fields?.["default-workspace-id"];
  if (!field) return payload;
  try {
    const { getAgentsPublicList } = require("./agent-registry");
    const agents = getAgentsPublicList();
    field.enum = agents
      .filter((agent) => agent.active !== false)
      .map((agent) => ({
        key: agent.id,
        name: agent.name ? `${agent.name} (${agent.id})` : agent.id
      }));
  } catch {
    field.enum = Array.isArray(field.enum) ? field.enum : [];
  }
  return payload;
}

function getUserSettingsAbsolute(agentRoot) {
  const root = String(agentRoot || "").trim();
  if (!root) return "";
  return path.join(root, USER_SETTINGS_REL_PATH);
}

function getIntegrationsSettingsAbsolute(agentRoot) {
  const root = String(agentRoot || "").trim();
  if (!root) return "";
  return path.join(root, INTEGRATIONS_SETTINGS_REL_PATH);
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
    headerComment: headerComment || PLATFORM_SETTINGS_HEADER.trim(),
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

async function readPlatformSettingsFile(projectRoot) {
  const absolutePath = getPlatformSettingsAbsolute(projectRoot);
  const primary = await readFilePayload(absolutePath, PLATFORM_SETTINGS_FILE);
  if (primary.exists) return primary;
  const legacyCandidates = [
    ...PLATFORM_SETTINGS_LEGACY_FILES.map((legacyRel) => ({
      rel: legacyRel,
      absolute: path.join(projectRoot, legacyRel)
    })),
    {
      rel: path.posix.join(AGENT_CMS_CORE_REL.replace(/\\/g, "/"), "settings.global.yml"),
      absolute: path.join(getAgentCmsCoreAbsolute(projectRoot), "settings.global.yml")
    }
  ];
  for (const candidate of legacyCandidates) {
    const legacy = await readFilePayload(candidate.absolute, candidate.rel);
    if (legacy.exists) {
      return { ...legacy, legacySource: candidate.rel, canonicalPath: PLATFORM_SETTINGS_FILE };
    }
  }
  return primary;
}

/** @deprecated use readPlatformSettingsFile */
async function readGlobalSettingsFile(projectRoot) {
  return readPlatformSettingsFile(projectRoot);
}

async function readWorkspaceSettingsFile(agentRoot) {
  const absolutePath = getWorkspaceSettingsAbsolute(agentRoot);
  const primary = await readFilePayload(absolutePath, WORKSPACE_SETTINGS_FILE);
  if (primary.exists) return primary;
  const legacyAbsolute = getWorkspaceSettingsLegacyAbsolute(agentRoot);
  const legacy = await readFilePayload(legacyAbsolute, WORKSPACE_SETTINGS_LEGACY_FILE);
  if (legacy.exists) {
    return { ...legacy, legacySource: WORKSPACE_SETTINGS_LEGACY_FILE, canonicalPath: WORKSPACE_SETTINGS_FILE };
  }
  return primary;
}

async function readUserSettingsFile(agentRoot) {
  const absolutePath = getUserSettingsAbsolute(agentRoot);
  const primary = await readFilePayload(absolutePath, USER_SETTINGS_REL_PATH);
  if (primary.exists) return primary;
  for (const legacyRel of USER_SETTINGS_LEGACY_FILES) {
    const legacyAbsolute = path.join(agentRoot, legacyRel);
    const legacy = await readFilePayload(legacyAbsolute, legacyRel);
    if (legacy.exists) {
      return { ...legacy, legacySource: legacyRel, canonicalPath: USER_SETTINGS_REL_PATH };
    }
  }
  return primary;
}

async function readIntegrationsSettingsFile(agentRoot) {
  const absolutePath = getIntegrationsSettingsAbsolute(agentRoot);
  const relPath = INTEGRATIONS_SETTINGS_REL_PATH;
  return readFilePayload(absolutePath, relPath);
}

async function readWorkspaceSettingsWithLegacyFallback(agentRoot, projectRoot) {
  const primary = await readWorkspaceSettingsFile(agentRoot);
  if (primary.exists) {
    return { ...primary, source: WORKSPACE_SETTINGS_FILE };
  }
  if (primary.legacySource) {
    return { ...primary, source: WORKSPACE_SETTINGS_LEGACY_FILE };
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
let platformSettingsCacheMtimeMs = null;

async function getPlatformSettingsFileMtime(projectRoot = process.cwd()) {
  try {
    const absolutePath = getPlatformSettingsAbsolute(projectRoot);
    const stat = await fs.promises.stat(absolutePath);
    return stat.mtimeMs;
  } catch {
    return null;
  }
}

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
  const mtimeMs = await getPlatformSettingsFileMtime(projectRoot);
  if (
    platformSettingsPayloadCache &&
    platformSettingsCacheMtimeMs != null &&
    mtimeMs != null &&
    mtimeMs === platformSettingsCacheMtimeMs
  ) {
    return platformSettingsPayloadCache;
  }
  platformSettingsPayloadCache = await loadPlatformSettingsPayload(projectRoot);
  platformSettingsCacheMtimeMs = mtimeMs;
  return platformSettingsPayloadCache;
}

async function getPlatformSettings(projectRoot = process.cwd()) {
  const payload = await getPlatformSettingsPayload(projectRoot);
  return payload.settings;
}

function invalidatePlatformSettingsCache() {
  platformSettingsPayloadCache = null;
  platformSettingsCacheMtimeMs = null;
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
    path: PLATFORM_SETTINGS_FILE,
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

async function writeIntegrationsSettingsFile(agentRoot, content) {
  const absolutePath = getIntegrationsSettingsAbsolute(agentRoot);
  if (!absolutePath) throw new Error("Agent root not set");
  await fs.promises.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.promises.writeFile(absolutePath, content, "utf-8");
  return {
    path: INTEGRATIONS_SETTINGS_REL_PATH,
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

function isProjectSettingsIntegrationsSettingsScope(scopePath) {
  return String(scopePath || "").trim() === PROJECT_SETTINGS_INTEGRATIONS_SETTINGS_SCOPE;
}

const PLATFORM_SETTINGS_TYPE_ID = "awn.settings.platform";
const WORKSPACE_SETTINGS_TYPE_ID = "awn.settings.workspace";
const USER_SETTINGS_TYPE_ID = "awn.settings.user";
const INTEGRATIONS_SETTINGS_TYPE_ID = "awn.settings.integrations";
/** @deprecated use PLATFORM_SETTINGS_TYPE_ID */
const AGENT_SETTINGS_GLOBAL_TYPE_ID = PLATFORM_SETTINGS_TYPE_ID;
/** @deprecated use WORKSPACE_SETTINGS_TYPE_ID */
const AGENT_SETTINGS_LOCAL_TYPE_ID = WORKSPACE_SETTINGS_TYPE_ID;

function resolveSettingsScopeKey(scope = "workspace") {
  const normalized = String(scope || "").trim().toLowerCase();
  if (normalized === "global" || normalized === "platform") return "platform";
  if (normalized === "user") return "user";
  if (normalized === "integrations" || normalized === "plugins") return "integrations";
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

function isIntegrationsSettingsTypeId(typeId) {
  const id = String(typeId || "").trim();
  return id === INTEGRATIONS_SETTINGS_TYPE_ID || id === "agent.settings.integrations";
}

function getAgentSettingsRegistry(projectRoot) {
  return resolveAgentSettingsRegistry(getAgentCmsCoreAbsolute(projectRoot));
}

function normalizeAgentSettingsFieldSubgroups(subgroups = []) {
  return (Array.isArray(subgroups) ? subgroups : [])
    .filter((item) => item && item.id)
    .map((item) => ({
      id: String(item.id),
      name: item.name || item.title || item.id,
      description: String(item.description || "").trim(),
      sort: Number(item.sort) || 0,
      defaultOpen: Boolean(item.defaultOpen),
      disabled: Boolean(item.disabled)
    }))
    .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id, "ru"));
}

function normalizeAgentSettingsFieldGroups(fieldGroups = []) {
  return (Array.isArray(fieldGroups) ? fieldGroups : [])
    .filter((group) => group && group.id)
    .map((group) => ({
      id: String(group.id),
      name: group.name || group.title || group.id,
      description: String(group.description || "").trim(),
      subgroups: normalizeAgentSettingsFieldSubgroups(group.subgroups)
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
  if (scopeKey === "integrations") return INTEGRATIONS_SETTINGS_TYPE_ID;
  return WORKSPACE_SETTINGS_TYPE_ID;
}

function buildAgentSettingsSchemaPayloadFromType(typeId, byId, projectRoot = process.cwd()) {
  const isPlatform = isPlatformSettingsTypeId(typeId);
  const isUser = isUserSettingsTypeId(typeId);
  const isIntegrations = isIntegrationsSettingsTypeId(typeId);
  const entry = byId.get(typeId);
  if (!entry) {
    return {
      type: typeId,
      scope: isPlatform ? "global" : isUser ? "user" : isIntegrations ? "integrations" : "local",
      name: isPlatform
        ? "Настройки платформы"
        : isUser
          ? "Пользовательские настройки"
          : isIntegrations
            ? "Интеграции и плагины"
            : "Настройки workspace",
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
    scope: isPlatform ? "global" : isUser ? "user" : isIntegrations ? "integrations" : "local",
    name: typeDef.name || typeId,
    description: schema.description || typeDef.description || "",
    valuesFile:
      schema.valuesFile ||
      (isPlatform
        ? GLOBAL_SETTINGS_FILE
        : isUser
          ? USER_SETTINGS_REL_PATH
          : isIntegrations
            ? INTEGRATIONS_SETTINGS_REL_PATH
            : WORKSPACE_SETTINGS_FILE),
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
  if (scopeKey === "platform") enrichPlatformSettingsSchema(payload, projectRoot);
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
    settingsPath: PLATFORM_SETTINGS_FILE,
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
        value: PLATFORM_SETTINGS_FILE
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
      "index-links-enabled",
      "indexing-ocr-langs",
      "index-ocr-enabled",
      "index-workspace-id-enabled",
      "index-storage-mode",
      "index-file-extensions",
      "index-path-prefixes",
      "index-exclude-patterns",
      "search-default-scopes",
      "search-semantic-chunk-size",
      "search-semantic-chunk-overlap",
      "search-hybrid-semantic-weight",
      "search-hybrid-fulltext-weight"
    ],
    registryNote:
      "Типы в awn-system/types/ — справочник схем. Редактируются в коде платформы, не через форму настроек."
  };
}

const PLATFORM_SYS_KEY_MAP = {
  "cms-version": "sys-cms-version",
  "registry-version": "sys-registry-version",
  "registry-mode": "sys-registry-mode",
  "registry-migration-date": "sys-registry-migration-date",
  "node-version": "sys-node-version",
  "platform-os": "sys-platform-os",
  "core-path": "sys-core-path",
  "type-catalog-count": "sys-type-catalog-count"
};

const SETTINGS_SCOPE_ALIASES = {
  all: "all",
  platform: "platform",
  global: "platform",
  workspace: "workspace",
  local: "workspace",
  user: "user",
  integrations: "integrations",
  plugins: "integrations"
};

function resolveAgentSettingsListScopes(scope = "all") {
  const normalized = SETTINGS_SCOPE_ALIASES[String(scope || "all").trim().toLowerCase()];
  if (!normalized) {
    throw new Error('scope must be "all", "platform", "workspace", "integrations", or "user"');
  }
  if (normalized === "all") return ["platform", "workspace", "integrations", "user"];
  return [normalized];
}

function getDefaultsForScope(scopeKey) {
  if (scopeKey === "platform") return PLATFORM_AGENT_SETTINGS_DEFAULTS;
  if (scopeKey === "user") return USER_AGENT_SETTINGS_DEFAULTS;
  if (scopeKey === "integrations") return INTEGRATIONS_AGENT_SETTINGS_DEFAULTS;
  return WORKSPACE_AGENT_SETTINGS_DEFAULTS;
}

function normalizeSettingsForScope(scopeKey, raw = {}) {
  if (scopeKey === "platform") return normalizePlatformAgentSettings(raw);
  if (scopeKey === "user") return normalizeUserAgentSettings(raw);
  if (scopeKey === "integrations") return normalizeIntegrationsAgentSettings(raw);
  return normalizeWorkspaceAgentSettings(raw);
}

function isSettingFieldReadonly(fieldDef = {}) {
  return Boolean(fieldDef.locked || fieldDef.readonly);
}

function isSettingFieldRuntimeEffect(fieldDef = {}) {
  const title = String(fieldDef.title || fieldDef.name || "").trim();
  return !title.includes("{NOT WORK}");
}

function buildSettingFieldMeta(scopeKey, key, fieldDef = {}, value = null) {
  return {
    scope: scopeKey,
    key,
    value,
    title: String(fieldDef.title || key).trim(),
    description: String(fieldDef.description || "").trim(),
    group: fieldDef.group ? String(fieldDef.group) : null,
    type: fieldDef.type ? String(fieldDef.type) : null,
    readonly: isSettingFieldReadonly(fieldDef),
    runtimeEffect: isSettingFieldRuntimeEffect(fieldDef),
    default: fieldDef.default ?? null
  };
}

async function getPlatformSystemSettingValues(projectRoot, agentRoot = "") {
  const meta = await buildPlatformSettingsMeta(projectRoot, agentRoot);
  const values = {};
  for (const item of meta.systemInfo || []) {
    const schemaKey = PLATFORM_SYS_KEY_MAP[String(item.key || "").trim()] || String(item.key || "").trim();
    if (!schemaKey) continue;
    values[schemaKey] = item.value;
  }
  return values;
}

async function readSettingsRawForScope(agentRoot, projectRoot, scopeKey) {
  if (scopeKey === "platform") {
    const file = await readGlobalSettingsFile(projectRoot);
    const parsed = parseSettingsFileContent(file.content || "");
    const systemValues = await getPlatformSystemSettingValues(projectRoot, agentRoot);
    const mergedRaw = { ...parsed.awn_settings, ...systemValues };
    return {
      scope: scopeKey,
      path: file.path,
      exists: Boolean(file.exists),
      raw: mergedRaw,
      parsed,
      file,
      awn_policy: parsed.awn_policy || null
    };
  }

  if (scopeKey === "user") {
    const file = await readUserSettingsFile(agentRoot);
    const parsed = parseSettingsFileContent(file.content || "");
    return {
      scope: scopeKey,
      path: file.path,
      exists: Boolean(file.exists),
      raw: parsed.awn_settings,
      parsed,
      file
    };
  }

  if (scopeKey === "integrations") {
    const file = await readIntegrationsSettingsFile(agentRoot);
    const parsed = parseSettingsFileContent(file.content || "");
    return {
      scope: scopeKey,
      path: file.path,
      exists: Boolean(file.exists),
      raw: parsed.awn_settings,
      parsed,
      file
    };
  }

  const file = await readWorkspaceSettingsWithLegacyFallback(agentRoot, projectRoot);
  let localSettings = {};
  if (file.exists) {
    localSettings = parseSettingsFileContent(file.content || "").awn_settings;
  } else if (file.awn_settings) {
    localSettings = file.awn_settings;
  } else {
    try {
      const configContent = await fs.promises.readFile(path.join(agentRoot, "config.yml"), "utf-8");
      localSettings = flattenAwnSettingsValues(parseWorkspaceAgentSettingsFromConfigContent(configContent));
    } catch (error) {
      if (!error || error.code !== "ENOENT") throw error;
    }
  }
  localSettings = await hydrateWorkspaceSettingsFromShell(agentRoot, localSettings, projectRoot);

  return {
    scope: scopeKey,
    path: WORKSPACE_SETTINGS_FILE,
    exists: Boolean(file.exists),
    raw: localSettings,
    parsed: { headerComment: "", awn_settings: localSettings },
    file,
    legacySource: file.legacyConfigPath || null
  };
}

function resolveSettingFieldDef(schemaPayload, key) {
  const fieldKey = String(key || "").trim();
  if (!fieldKey) throw new Error("key is required");
  const fieldDef = schemaPayload?.fields?.[fieldKey];
  if (!fieldDef) {
    throw new Error(`Unknown setting key "${fieldKey}" for scope "${schemaPayload.scope || "workspace"}"`);
  }
  return fieldDef;
}

function coerceSettingInputValue(rawValue, fieldDef, defaults, key) {
  if (!(key in defaults)) {
    throw new Error(`Setting "${key}" is not writable in this scope`);
  }
  const defaultValue = defaults[key];

  if (typeof defaultValue === "boolean") {
    if (typeof rawValue === "boolean") return rawValue;
    const text = String(rawValue ?? "")
      .trim()
      .toLowerCase();
    if (["true", "1", "yes", "on"].includes(text)) return true;
    if (["false", "0", "no", "off", ""].includes(text)) return false;
    throw new Error(`Invalid boolean for "${key}"`);
  }

  if (typeof defaultValue === "number") {
    const numeric = Number(rawValue);
    if (!Number.isFinite(numeric)) throw new Error(`Invalid number for "${key}"`);
    return numeric;
  }

  if (Array.isArray(defaultValue)) {
    if (Array.isArray(rawValue)) {
      return rawValue.map((item) => String(item ?? "").trim()).filter(Boolean);
    }
    const text = String(rawValue ?? "").trim();
    if (!text) return [];
    return text
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return String(rawValue ?? "");
}

async function listAgentSettings(agentRoot, projectRoot, scope = "all") {
  const scopes = resolveAgentSettingsListScopes(scope);
  const items = [];

  for (const scopeKey of scopes) {
    const schema = getAgentSettingsSchemaPayload(agentRoot, projectRoot, scopeKey);
    const payload = await readSettingsRawForScope(agentRoot, projectRoot, scopeKey);
    const normalized = normalizeSettingsForScope(scopeKey, payload.raw);

    for (const [key, fieldDef] of Object.entries(schema.fields || {})) {
      items.push(
        buildSettingFieldMeta(scopeKey, key, fieldDef, Object.prototype.hasOwnProperty.call(normalized, key) ? normalized[key] : null)
      );
    }
  }

  items.sort((a, b) => {
    const scopeOrder = { platform: 0, workspace: 1, integrations: 2, user: 3 };
    const scopeDiff = (scopeOrder[a.scope] ?? 9) - (scopeOrder[b.scope] ?? 9);
    if (scopeDiff !== 0) return scopeDiff;
    return String(a.key).localeCompare(String(b.key), "ru");
  });

  return {
    scope: scope === "all" ? "all" : scopes[0],
    count: items.length,
    items
  };
}

async function readAgentSetting(agentRoot, projectRoot, scope, key) {
  const scopeKey = resolveSettingsScopeKey(scope);
  const schema = getAgentSettingsSchemaPayload(agentRoot, projectRoot, scopeKey);
  const fieldDef = resolveSettingFieldDef(schema, key);
  const payload = await readSettingsRawForScope(agentRoot, projectRoot, scopeKey);
  const normalized = normalizeSettingsForScope(scopeKey, payload.raw);
  const fieldKey = String(key).trim();

  return {
    ...buildSettingFieldMeta(scopeKey, fieldKey, fieldDef, normalized[fieldKey]),
    path: payload.path,
    valuesFile: schema.valuesFile || payload.path,
    exists: payload.exists
  };
}

function buildResetSettingsFlatForScope(scopeKey, schema, currentRaw = {}) {
  const current = normalizeSettingsForScope(scopeKey, currentRaw);
  const nextFlat = normalizeSettingsForScope(scopeKey, getDefaultsForScope(scopeKey));
  for (const [key, fieldDef] of Object.entries(schema.fields || {})) {
    if (!isSettingFieldReadonly(fieldDef)) continue;
    if (Object.prototype.hasOwnProperty.call(current, key)) {
      nextFlat[key] = current[key];
    }
  }
  return nextFlat;
}

async function resetAgentSettingsScope(agentRoot, projectRoot, scope) {
  const scopeKey = resolveSettingsScopeKey(scope);
  const schema = getAgentSettingsSchemaPayload(agentRoot, projectRoot, scopeKey);
  const payload = await readSettingsRawForScope(agentRoot, projectRoot, scopeKey);
  const nextFlat = buildResetSettingsFlatForScope(scopeKey, schema, payload.raw);

  if (scopeKey === "platform") {
    const nextContent = composeGlobalSettingsFileContent({
      headerComment: payload.parsed?.headerComment || PLATFORM_SETTINGS_HEADER.trim(),
      awn_settings: nextFlat,
      awn_policy: payload.awn_policy || null
    });
    const saved = await writeGlobalSettingsFile(
      projectRoot,
      nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`
    );
    invalidatePlatformSettingsCache();
    const parsed = parseSettingsFileContent(saved.content);
    return {
      ok: true,
      scope: "platform",
      path: saved.path,
      content: saved.content,
      exists: true,
      settings: normalizePlatformAgentSettings(parsed.awn_settings),
      policyReloadRequired: true
    };
  }

  if (scopeKey === "user") {
    const nextContent = composeSettingsFileContent({
      headerComment: payload.parsed?.headerComment || USER_SETTINGS_HEADER.trim(),
      awn_settings: nextFlat
    });
    const saved = await writeUserSettingsFile(
      agentRoot,
      nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`
    );
    const parsed = parseSettingsFileContent(saved.content);
    return {
      ok: true,
      scope: "user",
      path: saved.path,
      content: saved.content,
      exists: true,
      settings: normalizeUserAgentSettings(parsed.awn_settings)
    };
  }

  if (scopeKey === "integrations") {
    const nextContent = composeSettingsFileContent({
      headerComment: payload.parsed?.headerComment || INTEGRATIONS_SETTINGS_HEADER.trim(),
      awn_settings: nextFlat
    });
    const saved = await writeIntegrationsSettingsFile(
      agentRoot,
      nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`
    );
    const parsed = parseSettingsFileContent(saved.content);
    return {
      ok: true,
      scope: "integrations",
      path: saved.path,
      content: saved.content,
      exists: true,
      settings: normalizeIntegrationsAgentSettings(parsed.awn_settings)
    };
  }

  const nextContent = composeSettingsFileContent({
    headerComment: payload.parsed?.headerComment || WORKSPACE_SETTINGS_HEADER.trim(),
    awn_settings: touchWorkspaceAwnIdCounterOnSave(nextFlat)
  });
  const saved = await writeWorkspaceSettingsFile(
    agentRoot,
    nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`
  );
  const parsed = parseSettingsFileContent(saved.content);
  return {
    ok: true,
    scope: "workspace",
    path: saved.path,
    content: saved.content,
    exists: true,
    settings: normalizeWorkspaceAgentSettings(parsed.awn_settings)
  };
}

async function writeAgentSetting(agentRoot, projectRoot, scope, key, rawValue) {
  const scopeKey = resolveSettingsScopeKey(scope);
  const schema = getAgentSettingsSchemaPayload(agentRoot, projectRoot, scopeKey);
  const fieldKey = String(key || "").trim();
  const fieldDef = resolveSettingFieldDef(schema, fieldKey);

  if (isSettingFieldReadonly(fieldDef)) {
    throw new Error(`Setting "${fieldKey}" is readonly`);
  }

  const defaults = getDefaultsForScope(scopeKey);
  const coerced = coerceSettingInputValue(rawValue, fieldDef, defaults, fieldKey);
  const payload = await readSettingsRawForScope(agentRoot, projectRoot, scopeKey);
  const sourceSettings =
    scopeKey === "platform"
      ? payload.parsed?.awn_settings || {}
      : payload.parsed?.awn_settings || payload.raw || {};
  const nextFlat = {
    ...flattenAwnSettingsValues(sourceSettings),
    [fieldKey]: coerced
  };

  if (scopeKey === "platform") {
    const nextContent = composeGlobalSettingsFileContent({
      headerComment: payload.parsed?.headerComment || GLOBAL_SETTINGS_HEADER.trim(),
      awn_settings: nextFlat,
      awn_policy: payload.awn_policy
    });
    const saved = await writeGlobalSettingsFile(
      projectRoot,
      nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`
    );
    invalidatePlatformSettingsCache();
    const normalized = normalizePlatformAgentSettings(parseSettingsFileContent(saved.content).awn_settings);
    return {
      ok: true,
      ...buildSettingFieldMeta(scopeKey, fieldKey, fieldDef, normalized[fieldKey]),
      path: saved.path,
      valuesFile: schema.valuesFile || saved.path,
      policyReloadRequired: true
    };
  }

  if (scopeKey === "user") {
    const nextContent = composeSettingsFileContent({
      headerComment: payload.parsed?.headerComment || USER_SETTINGS_HEADER.trim(),
      awn_settings: nextFlat
    });
    const saved = await writeUserSettingsFile(
      agentRoot,
      nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`
    );
    const normalized = normalizeUserAgentSettings(parseSettingsFileContent(saved.content).awn_settings);
    return {
      ok: true,
      ...buildSettingFieldMeta(scopeKey, fieldKey, fieldDef, normalized[fieldKey]),
      path: saved.path,
      valuesFile: schema.valuesFile || saved.path
    };
  }

  if (scopeKey === "integrations") {
    const nextContent = composeSettingsFileContent({
      headerComment: payload.parsed?.headerComment || INTEGRATIONS_SETTINGS_HEADER.trim(),
      awn_settings: nextFlat
    });
    const saved = await writeIntegrationsSettingsFile(
      agentRoot,
      nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`
    );
    const normalized = normalizeIntegrationsAgentSettings(parseSettingsFileContent(saved.content).awn_settings);
    return {
      ok: true,
      ...buildSettingFieldMeta(scopeKey, fieldKey, fieldDef, normalized[fieldKey]),
      path: saved.path,
      valuesFile: schema.valuesFile || saved.path
    };
  }

  const nextContent = composeSettingsFileContent({
    headerComment: payload.parsed?.headerComment || WORKSPACE_SETTINGS_HEADER.trim(),
    awn_settings: touchWorkspaceAwnIdCounterOnSave(nextFlat)
  });
  const saved = await writeWorkspaceSettingsFile(
    agentRoot,
    nextContent.endsWith("\n") ? nextContent : `${nextContent}\n`
  );
  const normalized = normalizeWorkspaceAgentSettings(parseSettingsFileContent(saved.content).awn_settings);
  return {
    ok: true,
    ...buildSettingFieldMeta(scopeKey, fieldKey, fieldDef, normalized[fieldKey]),
    path: saved.path,
    valuesFile: schema.valuesFile || saved.path
  };
}

module.exports = {
  WORKSPACE_SETTINGS_FILE,
  PLATFORM_SETTINGS_FILE,
  GLOBAL_SETTINGS_FILE,
  USER_SETTINGS_REL_PATH,
  INTEGRATIONS_SETTINGS_REL_PATH,
  PROJECT_SETTINGS_GLOBAL_SCOPE,
  PROJECT_SETTINGS_WORKSPACE_SETTINGS_SCOPE,
  PROJECT_SETTINGS_INTEGRATIONS_SETTINGS_SCOPE,
  PROJECT_SETTINGS_USER_SETTINGS_SCOPE,
  WORKSPACE_SETTINGS_HEADER,
  PLATFORM_SETTINGS_HEADER,
  GLOBAL_SETTINGS_HEADER,
  USER_SETTINGS_HEADER,
  INTEGRATIONS_SETTINGS_HEADER,
  getPlatformSettingsAbsolute,
  getGlobalSettingsAbsolute,
  getWorkspaceSettingsAbsolute,
  getWorkspaceSettingsLegacyAbsolute,
  hydrateWorkspaceSettingsFromShell,
  patchPlatformSettings,
  patchWorkspaceSettings,
  getUserSettingsAbsolute,
  getIntegrationsSettingsAbsolute,
  parseSettingsFileContent,
  extractAwnPolicyFromParsed,
  composeSettingsFileContent,
  composeGlobalSettingsFileContent,
  readPlatformSettingsFile,
  readGlobalSettingsFile,
  readWorkspaceSettingsFile,
  readUserSettingsFile,
  readIntegrationsSettingsFile,
  readWorkspaceSettingsWithLegacyFallback,
  getEffectiveWorkspaceSettings,
  writeWorkspaceSettingsFile,
  writeGlobalSettingsFile,
  writeUserSettingsFile,
  writeIntegrationsSettingsFile,
  countSettingsValues,
  isProjectSettingsGlobalScope,
  isProjectSettingsUserSettingsScope,
  isProjectSettingsIntegrationsSettingsScope,
  PLATFORM_SETTINGS_TYPE_ID,
  WORKSPACE_SETTINGS_TYPE_ID,
  USER_SETTINGS_TYPE_ID,
  INTEGRATIONS_SETTINGS_TYPE_ID,
  AGENT_SETTINGS_GLOBAL_TYPE_ID,
  AGENT_SETTINGS_LOCAL_TYPE_ID,
  resolveSettingsScopeKey,
  resolveAgentSettingsTypeId,
  getAgentSettingsRegistry,
  getAgentSettingsSchemaPayload,
  getPlatformSettings,
  getPlatformSettingsPayload,
  invalidatePlatformSettingsCache,
  buildPlatformSettingsMeta,
  listAgentSettings,
  readAgentSetting,
  writeAgentSetting,
  resetAgentSettingsScope
};
