const { rewriteLegacyTopicPathsInRelPath } = require("./manifest-paths");
const { normalizeLegacyWorkspaceId } = require("../workspace/bundled-workspaces");

/** Canonical workspace-relative path for CHPU (REFACTOR-3 platform 0-*). */
function canonicalizeChpuWorkspacePath(chpuPath) {
  const raw = String(chpuPath || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!raw) return "";
  return rewriteLegacyTopicPathsInRelPath(raw);
}

function canonicalizeChpuWorkspaceAgentId(agentId) {
  return normalizeLegacyWorkspaceId(String(agentId || "").trim());
}

module.exports = {
  canonicalizeChpuWorkspacePath,
  canonicalizeChpuWorkspaceAgentId
};
