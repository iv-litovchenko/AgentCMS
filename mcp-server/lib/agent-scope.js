import { AsyncLocalStorage } from "node:async_hooks";
import { z } from "zod";

/** Shared terminology for docs and tool descriptions. */
export const WORKSPACE_ID_SYNONYMS =
  "workspace · agent · vault · хранилище · рабочее пространство (поле agentId)";

export const agentIdField = z
  .string()
  .min(1)
  .describe(
    `Workspace id (${WORKSPACE_ID_SYNONYMS}). Required on every workspace-scoped tool. ` +
      "Start each chat: list_workspaces → pick id → get_session_context({ agentId }) → pass the same agentId on all later tools."
  );

const agentContext = new AsyncLocalStorage();

export function runWithAgentId(agentId, fn) {
  return agentContext.run({ agentId: String(agentId || "").trim() }, fn);
}

export function getActiveAgentIdFromContext() {
  return agentContext.getStore()?.agentId || "";
}

export function resolveAgentId(args = {}, fallbackAgent = "") {
  const fromArgs = String(args.agentId || args.agent || "").trim();
  if (fromArgs) return fromArgs;

  const fallback = String(
    fallbackAgent || process.env.AGENT_CMS_AGENT || process.env.YAMLCMS_AGENT || ""
  ).trim();
  if (fallback) return fallback;

  throw new Error(
    "agentId is required. Call list_workspaces (alias list_vaults), choose a workspace id, " +
      "then pass agentId on every workspace-scoped MCP tool."
  );
}

export function withAgentIdSchema(schema) {
  if (schema instanceof z.ZodObject) {
    return schema.extend({ agentId: agentIdField });
  }
  return z.object({ agentId: agentIdField }).and(schema);
}
