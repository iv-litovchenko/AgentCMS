/** Bundled workspace folder names under `workspaces/` (REFACTOR-9). */

const WS_CORE_REL = "workspaces/0-ws-core";
const WS_TEST_REL = "workspaces/0-ws-test";
const CLI_SANDBOX_REL = "workspaces/0-cli-sandbox";

const WS_CORE_ID = "0-ws-core";
const WS_TEST_ID = "0-ws-test";

/** @type {Record<string, string>} legacy workspace id → canonical id */
const LEGACY_WORKSPACE_ID_ALIASES = {
  "agent-cms-core": WS_CORE_ID,
  "agent-cms-test": WS_TEST_ID
};

/** @type {[string, string][]} longest legacy path prefix first */
const LEGACY_WORKSPACE_PATH_REWRITES = [
  ["workspaces/agent-cms-core", WS_CORE_REL],
  ["workspaces/agent-cms-test", WS_TEST_REL],
  ["workspaces/cli-sandbox", CLI_SANDBOX_REL]
];

function normalizeLegacyWorkspaceId(rawId) {
  const id = String(rawId || "").trim();
  if (!id) return id;
  return LEGACY_WORKSPACE_ID_ALIASES[id] || id;
}

function rewriteLegacyWorkspacePath(rawPath) {
  let normalized = String(rawPath || "")
    .trim()
    .replace(/\\/g, "/");
  if (!normalized) return normalized;
  for (const [from, to] of LEGACY_WORKSPACE_PATH_REWRITES) {
    if (normalized === from || normalized.startsWith(`${from}/`)) {
      normalized = to + normalized.slice(from.length);
      break;
    }
  }
  return normalized;
}

module.exports = {
  WS_CORE_REL,
  WS_TEST_REL,
  CLI_SANDBOX_REL,
  WS_CORE_ID,
  WS_TEST_ID,
  LEGACY_WORKSPACE_ID_ALIASES,
  LEGACY_WORKSPACE_PATH_REWRITES,
  normalizeLegacyWorkspaceId,
  rewriteLegacyWorkspacePath
};
