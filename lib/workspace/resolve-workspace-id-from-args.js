const { normalizeLegacyWorkspaceId } = require("./bundled-workspaces");

/** REST/MCP body or query: workspaceId (canonical) or legacy agentId / agent. */
function resolveWorkspaceIdFromArgs(input = {}) {
  const raw = input && typeof input === "object" ? input : {};
  const id = String(raw.workspaceId || raw.agentId || raw.agent || "").trim();
  if (!id) return "";
  return normalizeLegacyWorkspaceId(id);
}

module.exports = {
  resolveWorkspaceIdFromArgs
};
