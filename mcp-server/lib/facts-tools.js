import { z } from "zod";

const factKind = z
  .enum(["decision", "preference", "entity", "procedure", "open-question", "note", "fact"])
  .optional()
  .describe("Kind of fact (default: fact)");

const factSource = z
  .enum(["claude-desktop", "cursor", "voice", "shell", "codex", "manual", "other"])
  .optional()
  .describe("Where the fact came from (default: manual)");

const factTags = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .describe("Tags (array or comma-separated string)");

export function registerFactsTools(reg, client) {
  reg(
    "retain_workspace_fact",
    "Retain a distilled fact in workspace fact bank (awn-facts/). Use after decisions, preferences, or important conclusions — especially from external chats (Claude Desktop). Not for full dialog logs (use awn-dialogs / discussion).",
    z.object({
      body: z.string().min(1).describe("Fact text — one or two sentences"),
      kind: factKind,
      source: factSource,
      tags: factTags,
      name: z.string().optional().describe("Short title (default: excerpt from body)"),
      sourceRef: z.string().optional().describe("Optional evidence path, e.g. awn-dialogs/claude/.../2026-09-09.md"),
      supersedes: z.string().optional().describe("Path or id of older fact this replaces")
    }),
    ({ body, kind, source, tags, name, sourceRef, supersedes }) =>
      client.post("/api/agent/workspace-facts/retain", {
        body,
        kind,
        source,
        tags,
        name,
        sourceRef,
        supersedes
      })
  );

  reg(
    "list_workspace_facts",
    "List recent facts from awn-facts/ (newest first). No semantic search — use recall_workspace_facts for questions.",
    z.object({
      kind: factKind,
      tags: factTags,
      limit: z.number().int().min(1).max(200).optional().describe("Max items (default 30)")
    }),
    ({ kind, tags, limit }) =>
      client.get("/api/agent/workspace-facts/list", {
        ...(kind ? { kind } : {}),
        ...(tags ? { tags: Array.isArray(tags) ? tags.join(",") : tags } : {}),
        ...(limit ? { limit } : {})
      })
  );

  reg(
    "recall_workspace_facts",
    "Semantic + fulltext recall over awn-facts/ only. Returns cited hits for the agent to synthesize an answer.",
    z.object({
      query: z.string().min(2).describe("Question or search phrase"),
      kind: factKind,
      tags: factTags,
      limit: z.number().int().min(1).max(50).optional().describe("Max hits (default 12)"),
      includeSnippets: z.boolean().optional().describe("Include snippets (default true)")
    }),
    ({ query, kind, tags, limit, includeSnippets }) =>
      client.get("/api/agent/workspace-facts/recall", {
        q: query,
        ...(kind ? { kind } : {}),
        ...(tags ? { tags: Array.isArray(tags) ? tags.join(",") : tags } : {}),
        ...(limit ? { limit } : {}),
        ...(includeSnippets === false ? { includeSnippets: "false" } : {})
      })
  );
}
