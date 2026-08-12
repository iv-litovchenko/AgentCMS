import { z } from "zod";

export function registerBrainTools(reg, client) {
  reg(
    "audit_workspace_memory",
    "Read-only audit of workspace memory: stale always-context files, missing ## Current State sections, duplicate state keys, index health. Does not modify files.",
    z.object({
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
    }),
    ({ staleDays, includeContentChecks }) =>
      client.get("/api/agent/workspace-memory-audit", {
        ...(staleDays ? { staleDays } : {}),
        ...(includeContentChecks === false ? { includeContentChecks: "false" } : {})
      })
  );

  reg(
    "list_workspace_feed",
    "Unified workspace feed: recent activity, intake totals, topics with pending inbox, index health, memory audit summary.",
    z.object({
      activityLimit: z.number().int().min(1).max(100).optional().describe("Max activity events (default 30)"),
      staleDays: z.number().int().min(1).max(3650).optional().describe("Stale threshold for audit summary (default 90)"),
      includeIntake: z.boolean().optional().describe("Include per-topic intake summary (default true)"),
      includeAuditSummary: z.boolean().optional().describe("Include lightweight memory audit summary (default true)")
    }),
    ({ activityLimit, staleDays, includeIntake, includeAuditSummary }) =>
      client.get("/api/agent/workspace-feed", {
        ...(activityLimit ? { activityLimit } : {}),
        ...(staleDays ? { staleDays } : {}),
        ...(includeIntake === false ? { includeIntake: "false" } : {}),
        ...(includeAuditSummary === false ? { includeAuditSummary: "false" } : {})
      })
  );

  reg(
    "ask_workspace",
    "Composite Q&A retrieval: semantic search + full-text search + always-context. Returns cited hits for the agent to synthesize an answer.",
    z.object({
      query: z.string().min(2).describe("Question or search phrase"),
      limit: z.number().int().min(1).max(20).optional().describe("Max cited hits (default 8)"),
      scopes: z
        .array(z.enum(["semantic", "fulltext", "always"]))
        .optional()
        .describe("Sources to search (default: all three)"),
      includeSnippets: z.boolean().optional().describe("Include text snippets in hits (default true)")
    }),
    ({ query, limit, scopes, includeSnippets }) =>
      client.get("/api/agent/workspace-ask", {
        q: query,
        ...(limit ? { limit } : {}),
        ...(scopes?.length ? { scopes: scopes.join(",") } : {}),
        ...(includeSnippets === false ? { includeSnippets: "false" } : {})
      })
  );
}
