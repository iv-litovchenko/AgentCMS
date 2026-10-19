import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

export function registerBrainTools(reg, client) {
  const memoryAuditSchema = z.object({
    staleDays: z
      .number()
      .int()
      .min(1)
      .max(3650)
      .optional()
      .describe("Flag always-context items older than N days (default 90)"),
    includeContentChecks: z
      .boolean()
      .optional()
      .describe("Check ## Current State / duplicate state keys (default true)")
  });
  const memoryAuditHandler = ({ staleDays, includeContentChecks }) =>
    client.get("/api/agent/workspace-memory-audit", {
      ...(staleDays ? { staleDays } : {}),
      ...(includeContentChecks === false ? { includeContentChecks: "false" } : {})
    });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_memory_audit",
    legacy: "audit_workspace_memory",
    description:
      "Read-only audit of workspace memory: stale always-context files, missing ## Current State sections, duplicate state keys, index health. Does not modify files.",
    schema: memoryAuditSchema,
    handler: memoryAuditHandler
  });

  const feedSchema = z.object({
    activityLimit: z.number().int().min(1).max(100).optional().describe("Max activity events (default 30)"),
    staleDays: z.number().int().min(1).max(3650).optional().describe("Stale threshold for audit summary (default 90)"),
    includeIntake: z.boolean().optional().describe("Include per-topic intake summary (default true)"),
    includeAuditSummary: z.boolean().optional().describe("Include lightweight memory audit summary (default true)")
  });
  const feedHandler = ({ activityLimit, staleDays, includeIntake, includeAuditSummary }) =>
    client.get("/api/agent/workspace-feed", {
      ...(activityLimit ? { activityLimit } : {}),
      ...(staleDays ? { staleDays } : {}),
      ...(includeIntake === false ? { includeIntake: "false" } : {}),
      ...(includeAuditSummary === false ? { includeAuditSummary: "false" } : {})
    });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_feed_list",
    legacy: "list_workspace_feed",
    description:
      "Unified workspace feed: recent activity, intake totals, topics with pending inbox, index health, memory audit summary.",
    schema: feedSchema,
    handler: feedHandler
  });

  const queryWorkspaceAskSchema = z.object({
    query: z.string().min(2).describe("Question or search phrase"),
    limit: z.number().int().min(1).max(20).optional().describe("Max cited hits (default 8)"),
    scopes: z
      .array(z.enum(["semantic", "fulltext", "always"]))
      .optional()
      .describe("Sources to search (default: all three)"),
    includeSnippets: z.boolean().optional().describe("Include text snippets in hits (default true)")
  });
  const queryWorkspaceAskHandler = ({ query, limit, scopes, includeSnippets }) =>
    client.get("/api/agent/workspace-ask", {
      q: query,
      ...(limit ? { limit } : {}),
      ...(scopes?.length ? { scopes: scopes.join(",") } : {}),
      ...(includeSnippets === false ? { includeSnippets: "false" } : {})
    });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "query_workspace_ask",
    legacy: "ask_workspace",
    extraLegacy: ["search_and_get_context", "query_context_get"],
    description:
      "Composite Q&A retrieval: semantic search + full-text search + always-context. Returns cited hits for the agent to synthesize an answer.",
    schema: queryWorkspaceAskSchema,
    handler: queryWorkspaceAskHandler
  });

  reg(
    "search_workspace_zzz",
    "Search STUB (idea): future single entry for workspace search (mode: hybrid|fulltext|semantic|links|storage|…). Use query_workspace_ask or index_3_hybrid_search_query today.",
    queryWorkspaceAskSchema,
    async () => ({
      ok: false,
      stub: true,
      tool: "search_workspace_zzz",
      message:
        "Not implemented. Idea: one search tool instead of many index_N_*_search_query. Today: query_workspace_ask or index_3_hybrid_search_query."
    })
  );
}
