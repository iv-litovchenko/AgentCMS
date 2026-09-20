const fs = require("node:fs");
const path = require("node:path");
const NodeConfigBundle = require("./node-config-bundle");
const { parseTypeYaml } = require("./awn-yaml-utils");
const { AGENT_CMS_CORE_REL, getAgentCmsCoreAbsolute } = require("./platform-sources");
const {
  normalizeWorkspaceAgentSettings,
  flattenAwnSettingsValues,
  parseWorkspaceAgentSettingsFromConfigContent
} = require("./workspace-agent-settings");
const { loadTypeCatalog, toRecordTypeDef, resolveAgentSettingsRegistry } = require("./type-catalog-loader");

const WORKSPACE_SETTINGS_FILE = "settings.yml";
const GLOBAL_SETTINGS_FILE = "settings.global.yml";
const PROJECT_SETTINGS_GLOBAL_SCOPE = "__global__";
const PROJECT_SETTINGS_WORKSPACE_SETTINGS_SCOPE = "__workspace-settings__";

const WORKSPACE_SETTINGS_HEADER =
  "# Agent CMS — локальные настройки workspace (переопределяют глобальные)\n";
const GLOBAL_SETTINGS_HEADER =
  "# Agent CMS — глобальные настройки платформы (agent-cms-core)\n";

function getGlobalSettingsAbsolute(projectRoot) {
  return path.join(getAgentCmsCoreAbsolute(projectRoot), GLOBAL_SETTINGS_FILE);
}

function getWorkspaceSettingsAbsolute(agentRoot) {
  const root = String(agentRoot || "").trim();
  if (!root) return "";
  return path.join(root, WORKSPACE_SETTINGS_FILE);
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

  const merged = {
    ...globalParsed.awn_settings,
    ...localSettings
  };

  return {
    settings: normalizeWorkspaceAgentSettings(merged),
    local: normalizeWorkspaceAgentSettings(localSettings),
    global: normalizeWorkspaceAgentSettings(globalParsed.awn_settings),
    sources: {
      global: globalFile.exists ? globalFile.path : null,
      workspace: workspaceFile.exists ? workspaceFile.path : workspaceFile.legacyConfigPath || null
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

const PLATFORM_SETTINGS_TYPE_ID = "awn.settings.platform";
const WORKSPACE_SETTINGS_TYPE_ID = "awn.settings.workspace";
/** @deprecated use PLATFORM_SETTINGS_TYPE_ID */
const AGENT_SETTINGS_GLOBAL_TYPE_ID = PLATFORM_SETTINGS_TYPE_ID;
/** @deprecated use WORKSPACE_SETTINGS_TYPE_ID */
const AGENT_SETTINGS_LOCAL_TYPE_ID = WORKSPACE_SETTINGS_TYPE_ID;

function resolveSettingsScopeKey(scope = "workspace") {
  const normalized = String(scope || "").trim().toLowerCase();
  if (normalized === "global" || normalized === "platform") return "platform";
  return "workspace";
}

function isPlatformSettingsTypeId(typeId) {
  const id = String(typeId || "").trim();
  return id === PLATFORM_SETTINGS_TYPE_ID || id === "agent.settings.global";
}

function getAgentSettingsRegistry(projectRoot) {
  return resolveAgentSettingsRegistry(getAgentCmsCoreAbsolute(projectRoot));
}

function normalizeAgentSettingsFieldGroups(fieldGroups = []) {
  return (Array.isArray(fieldGroups) ? fieldGroups : [])
    .filter((group) => group && group.id)
    .map((group) => ({
      id: String(group.id),
      name: group.name || group.title || group.id
    }));
}

function resolveAgentSettingsTypeId(scope = "workspace", projectRoot = process.cwd()) {
  const registry = getAgentSettingsRegistry(projectRoot);
  const scopeKey = resolveSettingsScopeKey(scope);
  const entry = registry.schema[scopeKey];
  const typeId = String(entry?.type || "").trim();
  if (typeId) return typeId;
  return scopeKey === "platform" ? PLATFORM_SETTINGS_TYPE_ID : WORKSPACE_SETTINGS_TYPE_ID;
}

function buildAgentSettingsSchemaPayloadFromType(typeId, byId, projectRoot = process.cwd()) {
  const isPlatform = isPlatformSettingsTypeId(typeId);
  const entry = byId.get(typeId);
  if (!entry) {
    return {
      type: typeId,
      scope: isPlatform ? "global" : "local",
      name: isPlatform ? "Настройки платформы" : "Настройки workspace",
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
    : platformFieldKeys.length
      ? platformFieldKeys
      : Object.keys(mergedFields).filter((key) => !["scope", "value", "enabled"].includes(key));
  const fields = {};
  for (const key of fieldKeys) {
    if (mergedFields[key]) fields[key] = mergedFields[key];
  }
  return {
    type: typeId,
    scope: isPlatform ? "global" : "local",
    name: typeDef.name || typeId,
    description: schema.description || typeDef.description || "",
    valuesFile: schema.valuesFile || (isPlatform ? GLOBAL_SETTINGS_FILE : WORKSPACE_SETTINGS_FILE),
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

module.exports = {
  WORKSPACE_SETTINGS_FILE,
  GLOBAL_SETTINGS_FILE,
  PROJECT_SETTINGS_GLOBAL_SCOPE,
  PROJECT_SETTINGS_WORKSPACE_SETTINGS_SCOPE,
  WORKSPACE_SETTINGS_HEADER,
  GLOBAL_SETTINGS_HEADER,
  getGlobalSettingsAbsolute,
  getWorkspaceSettingsAbsolute,
  parseSettingsFileContent,
  extractAwnPolicyFromParsed,
  composeSettingsFileContent,
  composeGlobalSettingsFileContent,
  readGlobalSettingsFile,
  readWorkspaceSettingsFile,
  readWorkspaceSettingsWithLegacyFallback,
  getEffectiveWorkspaceSettings,
  writeWorkspaceSettingsFile,
  writeGlobalSettingsFile,
  countSettingsValues,
  isProjectSettingsGlobalScope,
  PLATFORM_SETTINGS_TYPE_ID,
  WORKSPACE_SETTINGS_TYPE_ID,
  AGENT_SETTINGS_GLOBAL_TYPE_ID,
  AGENT_SETTINGS_LOCAL_TYPE_ID,
  resolveSettingsScopeKey,
  resolveAgentSettingsTypeId,
  getAgentSettingsRegistry,
  getAgentSettingsSchemaPayload
};
