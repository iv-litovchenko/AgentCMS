const fs = require("node:fs");
const path = require("node:path");
const { parseTypeYaml } = require("../awn/awn-yaml-utils");
const { getAgentCmsCoreAbsolute } = require("../platform/platform-sources");

const DEFAULT_POLICY_PATH = path.join(
  __dirname,
  "workspaces/agent-cms-core/awn-system/mcp-policy.yml"
);
const { projectRel, projectLegacy, legacy } = require("../paths/agent-cms");
const PLATFORM_SETTINGS_FILE = projectRel.settings.platform;

const FALLBACK_POLICY = {
  version: 1,
  mcp: {
    write_tool_pattern:
      "^(write_|create_|delete_|move_|rename_|append_|upload_|import_|triage_|retain_|database_frame_write_|database_frame_create_|database_element_write_|database_element_create_|iblock_write_|iblock_create_|iblock_content_write_|iblock_content_create_|notify_user|run_script|exec_)",
    exec_tools: ["exec_command", "exec_shell", "run_script"],
    exec_allowed_modes: ["full"]
  },
  batch_invoke: {
    absolute_max_items: 50,
    default_parallel: { read: true, write: false },
    denied_tools: ["batch_invoke", "search_workspace_batch", "get_session_context"],
    exec_tools: ["exec_command", "exec_shell", "run_script"],
    read_name_patterns: ["^read_", "^list_", "^get_", "^search_", "^recall_", "^resolve_", "^refresh_"],
    read_tools: ["page_exists", "content_exists"]
  }
};

let cachedPolicy = null;
let cachedPath = "";
let cachedMtime = 0;

function toStringSet(values = []) {
  return new Set(
    (Array.isArray(values) ? values : [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  );
}

function toRegExpList(patterns = []) {
  return (Array.isArray(patterns) ? patterns : [])
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .map((source) => {
      try {
        return new RegExp(source);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function normalizePolicy(raw = {}) {
  const mcp = raw.mcp && typeof raw.mcp === "object" ? raw.mcp : {};
  const batch = raw.batch_invoke && typeof raw.batch_invoke === "object" ? raw.batch_invoke : {};
  const writeToolPatternSource = String(mcp.write_tool_pattern || FALLBACK_POLICY.mcp.write_tool_pattern);
  let writeToolPattern;
  try {
    writeToolPattern = new RegExp(writeToolPatternSource);
  } catch {
    writeToolPattern = new RegExp(FALLBACK_POLICY.mcp.write_tool_pattern);
  }

  const execTools = toStringSet(mcp.exec_tools?.length ? mcp.exec_tools : FALLBACK_POLICY.mcp.exec_tools);
  const deniedTools = toStringSet(
    batch.denied_tools?.length ? batch.denied_tools : FALLBACK_POLICY.batch_invoke.denied_tools
  );
  const batchExecTools = toStringSet(
    batch.exec_tools?.length ? batch.exec_tools : FALLBACK_POLICY.batch_invoke.exec_tools
  );
  const readTools = toStringSet(
    batch.read_tools?.length ? batch.read_tools : FALLBACK_POLICY.batch_invoke.read_tools
  );
  const readNamePatterns = toRegExpList(
    batch.read_name_patterns?.length
      ? batch.read_name_patterns
      : FALLBACK_POLICY.batch_invoke.read_name_patterns
  );

  return {
    version: Number(raw.version) || 1,
    path: cachedPath,
    mcp: {
      writeToolPattern,
      writeToolPatternSource,
      execTools,
      execAllowedModes: toStringSet(
        mcp.exec_allowed_modes?.length ? mcp.exec_allowed_modes : FALLBACK_POLICY.mcp.exec_allowed_modes
      )
    },
    batch: {
      absoluteMaxItems: Math.max(
        1,
        Number(batch.absolute_max_items) || FALLBACK_POLICY.batch_invoke.absolute_max_items
      ),
      defaultParallel: {
        read: batch.default_parallel?.read !== false,
        write: Boolean(batch.default_parallel?.write)
      },
      deniedTools,
      execTools: batchExecTools,
      readTools,
      readNamePatterns
    }
  };
}

function resolvePolicyPath(customPath = "") {
  return String(customPath || process.env.AGENT_CMS_MCP_POLICY_PATH || DEFAULT_POLICY_PATH).trim();
}

function loadGlobalPolicyFromSettingsFile(projectRoot) {
  const candidates = [
    path.join(projectRoot, PLATFORM_SETTINGS_FILE),
    path.join(projectRoot, projectLegacy.platformSettings),
    path.join(projectRoot, projectLegacy.globalSettings),
    path.join(projectRoot, legacy.platformSettings),
    path.join(getAgentCmsCoreAbsolute(projectRoot), "settings.global.yml")
  ];
  for (const absolutePath of candidates) {
    try {
    const parsed = parseTypeYaml(fs.readFileSync(absolutePath, "utf-8")) || {};
    const policyRoot =
      parsed.awn_policy && typeof parsed.awn_policy === "object" ? parsed.awn_policy : parsed;
    const mcp = policyRoot.mcp && typeof policyRoot.mcp === "object" ? policyRoot.mcp : {};
    const batch =
      policyRoot.batch_invoke && typeof policyRoot.batch_invoke === "object" ? policyRoot.batch_invoke : {};
    if (!Object.keys(mcp).length && !Object.keys(batch).length) continue;
    return {
      policy: {
        version: Number(parsed.version) || 1,
        mcp,
        batch_invoke: batch
      },
      path: absolutePath
    };
    } catch {
      // try next candidate
    }
  }
  return null;
}

function loadMcpPolicyFromFile(policyPath) {
  const stat = fs.statSync(policyPath);
  if (cachedPolicy && cachedPath === policyPath && stat.mtimeMs === cachedMtime) {
    return cachedPolicy;
  }
  cachedPath = policyPath;
  cachedMtime = stat.mtimeMs;
  const parsed = parseTypeYaml(fs.readFileSync(policyPath, "utf8")) || {};
  cachedPolicy = normalizePolicy(parsed);
  cachedPolicy.path = policyPath;
  return cachedPolicy;
}

function loadMcpPolicy(options = {}) {
  if (!options.path && !process.env.AGENT_CMS_MCP_POLICY_PATH) {
    const fromSettings = loadGlobalPolicyFromSettingsFile(options.projectRoot || process.cwd());
    if (fromSettings?.policy) {
      const policyPath = fromSettings.path;
      try {
        const stat = fs.statSync(policyPath);
        if (cachedPolicy && cachedPath === policyPath && stat.mtimeMs === cachedMtime) {
          return cachedPolicy;
        }
        cachedPath = policyPath;
        cachedMtime = stat.mtimeMs;
        cachedPolicy = normalizePolicy(fromSettings.policy);
        cachedPolicy.path = policyPath;
        cachedPolicy.source = PLATFORM_SETTINGS_FILE;
        return cachedPolicy;
      } catch {
        // fall through to legacy file
      }
    }
  }

  const policyPath = resolvePolicyPath(options.path);
  try {
    return loadMcpPolicyFromFile(policyPath);
  } catch {
    cachedPath = policyPath;
    cachedMtime = 0;
    cachedPolicy = normalizePolicy(FALLBACK_POLICY);
    cachedPolicy.path = policyPath;
    cachedPolicy.fallback = true;
    return cachedPolicy;
  }
}

function reloadMcpPolicy(options = {}) {
  cachedPolicy = null;
  cachedPath = "";
  cachedMtime = 0;
  return loadMcpPolicy(options);
}

function serializeMcpPolicy(policy = loadMcpPolicy()) {
  return {
    version: policy.version,
    path: policy.path,
    fallback: Boolean(policy.fallback),
    mcp: {
      write_tool_pattern: policy.mcp.writeToolPatternSource,
      exec_tools: [...policy.mcp.execTools],
      exec_allowed_modes: [...policy.mcp.execAllowedModes]
    },
    batch_invoke: {
      absolute_max_items: policy.batch.absoluteMaxItems,
      default_parallel: policy.batch.defaultParallel,
      denied_tools: [...policy.batch.deniedTools],
      exec_tools: [...policy.batch.execTools],
      read_tools: [...policy.batch.readTools],
      read_name_patterns: policy.batch.readNamePatterns.map((rx) => rx.source)
    }
  };
}

module.exports = {
  DEFAULT_POLICY_PATH,
  loadMcpPolicy,
  reloadMcpPolicy,
  serializeMcpPolicy
};
