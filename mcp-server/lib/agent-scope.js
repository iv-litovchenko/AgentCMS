import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import { z } from "zod";

const require = createRequire(import.meta.url);
const { normalizeLegacyWorkspaceId } = require("../../lib/workspace/bundled-workspaces.js");

/** Shared terminology for docs and tool descriptions. */
export const WORKSPACE_ID_SYNONYMS =
  "workspace · vault · хранилище · рабочее пространство (не тема 0-agent / identity)";

export const workspaceIdField = z
  .string()
  .min(1)
  .describe(
    `Workspace id from list_workspaces (e.g. 0-ws-test). Required on every workspace-scoped tool. ` +
      `Start: list_workspaces → get_session_context({ workspaceId }) → same id on all later tools.`
  );

/** @deprecated use workspaceId — accepted on all workspace-scoped tools (REFACTOR-10). */
export const legacyAgentIdField = z
  .string()
  .min(1)
  .describe(
    `Legacy alias for workspaceId (${WORKSPACE_ID_SYNONYMS}). Prefer workspaceId in new integrations.`
  );

/** @deprecated use workspaceIdField */
export const agentIdField = legacyAgentIdField;

const agentContext = new AsyncLocalStorage();

export function runWithAgentId(agentId, fn) {
  return agentContext.run({ agentId: String(agentId || "").trim() }, fn);
}

export function getActiveAgentIdFromContext() {
  return agentContext.getStore()?.agentId || "";
}

export function resolveWorkspaceId(args = {}, fallbackAgent = "") {
  const fromArgs = normalizeLegacyWorkspaceId(
    String(args.workspaceId || args.agentId || args.agent || "").trim()
  );
  if (fromArgs) return fromArgs;

  const fallback = String(
    fallbackAgent || process.env.AGENT_CMS_AGENT || process.env.YAMLCMS_AGENT || ""
  ).trim();
  if (fallback) return normalizeLegacyWorkspaceId(fallback);

  throw new Error(
    "workspaceId is required (legacy alias: agentId). Call list_workspaces, pick an id, " +
      "then pass workspaceId on every workspace-scoped MCP tool."
  );
}

/** @deprecated use resolveWorkspaceId */
export function resolveAgentId(args = {}, fallbackAgent = "") {
  return resolveWorkspaceId(args, fallbackAgent);
}

export function normalizeWorkspaceScopedArgs(args = {}, fallbackAgent = "") {
  const workspaceId = resolveWorkspaceId(args, fallbackAgent);
  return { ...args, workspaceId, agentId: workspaceId };
}

export function withAgentIdSchema(schema) {
  const scopeFields = {
    workspaceId: workspaceIdField.optional(),
    agentId: legacyAgentIdField.optional()
  };
  if (schema instanceof z.ZodObject) {
    return schema.extend(scopeFields);
  }
  return z.object(scopeFields).and(schema);
}
