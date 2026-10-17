const { normalizeLegacyWorkspaceId } = require("./bundled-workspaces");

/** REST/MCP body or query: workspaceId (canonical) or legacy agentId / agent. */
function resolveWorkspaceIdFromArgs(input = {}) {
  const raw = input && typeof input === "object" ? input : {};
  const id = String(raw.workspaceId || raw.agentId || raw.agent || "").trim();
  if (!id) return "";
  return normalizeLegacyWorkspaceId(id);
}

/** JSON body for workspace registry mutations (PATCH workspace, assign group, …). */
function resolveWorkspaceIdFromPayload(payload = {}) {
  const raw = payload && typeof payload === "object" ? payload : {};
  const id = String(raw.workspaceId || raw.agentId || raw.id || "").trim();
  if (!id) return "";
  return normalizeLegacyWorkspaceId(id);
}

/** Attach canonical workspaceId alongside legacy agentId on API objects. */
function withWorkspaceIdAlias(record = {}) {
  if (!record || typeof record !== "object") return record;
  const workspaceId = String(record.workspaceId || record.agentId || "").trim();
  if (!workspaceId) return record;
  return { ...record, workspaceId, agentId: record.agentId ?? workspaceId };
}

module.exports = {
  resolveWorkspaceIdFromArgs,
  resolveWorkspaceIdFromPayload,
  withWorkspaceIdAlias
};
