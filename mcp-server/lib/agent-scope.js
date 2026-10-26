import { AsyncLocalStorage } from "node:async_hooks";
import { createRequire } from "node:module";
import { z } from "zod";
import { parseWorkspaceRef } from "./workspace-ref.js";

const require = createRequire(import.meta.url);
const { normalizeLegacyWorkspaceId } = require("../../lib/workspace/bundled-workspaces.js");

/** Shared terminology for docs and tool descriptions. */
export const WORKSPACE_ID_SYNONYMS =
  "workspace · vault · хранилище · рабочее пространство (не тема 0-agent / identity)";

export const workspaceIdField = z
  .string()
  .min(1)
  .describe(
    `Workspace id from workspaces_list (e.g. 0-ws-test). Required on every workspace-scoped tool. ` +
      `Start: workspaces_list → session_context_get({ workspaceId }) → same id on all later tools.`
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

let legacyAgentIdArgWarned = false;

function warnLegacyAgentIdArgOnce() {
  if (legacyAgentIdArgWarned) return;
  if (String(process.env.AGENT_CMS_MCP_DEPRECATE_AGENT_ID || "").trim() === "0") return;
  legacyAgentIdArgWarned = true;
  process.stderr.write(
    "[agent-cms-mcp] DEPRECATED: use workspaceId on workspace-scoped tools (agentId is a legacy alias).\n"
  );
}

function noteLegacyWorkspaceIdArg(args = {}) {
  if (!args || typeof args !== "object") return;
  if (String(args.workspaceId || "").trim()) return;
  const legacy = String(args.agentId || args.agent || "").trim();
  if (legacy) warnLegacyAgentIdArgOnce();
}

export function runWithAgentId(agentId, fn) {
  const ref = parseWorkspaceRef(String(agentId || "").trim());
  return runWithWorkspaceScope(ref, fn);
}

export function runWithWorkspaceScope(ref, fn) {
  const workspaceId = String(ref?.workspaceId || "").trim();
  const instanceId = String(ref?.instanceId || "local").trim() || "local";
  return agentContext.run({ agentId: workspaceId, instanceId }, fn);
}

export function getActiveAgentIdFromContext() {
  return agentContext.getStore()?.agentId || "";
}

export function getActiveWorkspaceIdFromContext() {
  return getActiveAgentIdFromContext();
}

export function getActiveInstanceIdFromContext() {
  return agentContext.getStore()?.instanceId || "local";
}

export function resolveWorkspaceId(args = {}, fallbackAgent = "") {
  const raw = String(args.workspaceId || args.agentId || args.agent || "").trim();
  if (raw) {
    return parseWorkspaceRef(raw).workspaceId;
  }

  const fallback = String(
    fallbackAgent || process.env.AGENT_CMS_AGENT || process.env.YAMLCMS_AGENT || ""
  ).trim();
  if (fallback) return normalizeLegacyWorkspaceId(fallback);

  throw new Error(
    "workspaceId is required (legacy alias: agentId). Call workspaces_list, pick an id, " +
      "then pass workspaceId on every workspace-scoped MCP tool."
  );
}

/** @deprecated use resolveWorkspaceId */
export function resolveAgentId(args = {}, fallbackAgent = "") {
  return resolveWorkspaceId(args, fallbackAgent);
}

export function normalizeWorkspaceScopedArgs(args = {}, fallbackAgent = "") {
  noteLegacyWorkspaceIdArg(args);
  const workspaceId = resolveWorkspaceId(args, fallbackAgent);
  return { ...args, workspaceId, agentId: workspaceId };
}

/** Unwrap ZodEffects (.refine/.superRefine) to inner ZodObject for MCP inputSchema. */
export function unwrapToZodObject(schema) {
  let current = schema;
  while (current instanceof z.ZodEffects) {
    current = current._def.schema;
  }
  return current instanceof z.ZodObject ? current : null;
}

export function withAgentIdSchema(schema) {
  const scopeFields = {
    workspaceId: workspaceIdField.optional(),
    agentId: legacyAgentIdField.optional()
  };
  const inner = unwrapToZodObject(schema);
  if (inner) {
    return inner.extend(scopeFields);
  }
  if (schema instanceof z.ZodObject) {
    return schema.extend(scopeFields);
  }
  return z.object(scopeFields).and(schema);
}
