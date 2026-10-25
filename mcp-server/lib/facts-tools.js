import { z } from "zod";
import { registerCanonicalWithLegacyAlias, registerDeprecatedAlias } from "./register-tool-alias.js";

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

const createFactSchema = z.object({
  body: z.string().min(1).describe("Fact text — one or two sentences"),
  kind: factKind,
  source: factSource,
  tags: factTags,
  name: z.string().optional().describe("Short title (default: excerpt from body)"),
  sourceRef: z.string().optional().describe("Optional evidence path"),
  supersedes: z.string().optional().describe("Path or id of older fact this replaces")
});

const updateFactSchema = z.object({
  record: z.string().min(1).describe("Record id or workspace path"),
  body: z.string().optional().describe("Updated fact text"),
  kind: factKind,
  source: factSource,
  tags: factTags,
  name: z.string().optional(),
  sourceRef: z.string().optional(),
  supersedes: z.string().optional()
});

const listFactsSchema = z.object({
  kind: factKind,
  tags: factTags,
  limit: z.number().int().min(1).max(200).optional().describe("Max items (default 30)")
});

const searchFactsSchema = z.object({
  query: z.string().min(2).describe("Question or search phrase"),
  kind: factKind,
  tags: factTags,
  limit: z.number().int().min(1).max(50).optional().describe("Max hits (default 12)"),
  includeSnippets: z.boolean().optional().describe("Include snippets (default true)")
});

export function registerFactsTools(reg, client) {
  const createHandler = (payload) => client.post("/api/agent/workspace-facts/create", payload);
  const updateHandler = (payload) => client.post("/api/agent/workspace-facts/update", payload);
  const listHandler = ({ kind, tags, limit }) =>
    client.get("/api/agent/workspace-facts/list", {
      ...(kind ? { kind } : {}),
      ...(tags ? { tags: Array.isArray(tags) ? tags.join(",") : tags } : {}),
      ...(limit ? { limit } : {})
    });
  const searchHandler = ({ query, kind, tags, limit, includeSnippets }) =>
    client.get("/api/agent/workspace-facts/search", {
      q: query,
      ...(kind ? { kind } : {}),
      ...(tags ? { tags: Array.isArray(tags) ? tags.join(",") : tags } : {}),
      ...(limit ? { limit } : {}),
      ...(includeSnippets === false ? { includeSnippets: "false" } : {})
    });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "fact_create",
    legacy: "workspace_fact_create",
    description:
      "Create a distilled fact in awn-databases/0-contents/0-facts (md-lite collection). Not for full dialog logs.",
    schema: createFactSchema,
    handler: createHandler
  });
  registerDeprecatedAlias(reg, {
    canonical: "fact_create",
    name: "create_workspace_fact",
    schema: createFactSchema,
    handler: createHandler
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "fact_update",
    legacy: "workspace_fact_update",
    description: "Update an existing fact by record id or path in 0-contents/0-facts.",
    schema: updateFactSchema,
    handler: updateHandler
  });
  registerDeprecatedAlias(reg, {
    canonical: "fact_update",
    name: "update_workspace_fact",
    schema: updateFactSchema,
    handler: updateHandler
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "facts_list",
    legacy: "workspace_facts_list",
    description:
      "List recent facts from 0-contents/0-facts (newest first). No semantic search — use facts_search.",
    schema: listFactsSchema,
    handler: listHandler
  });
  registerDeprecatedAlias(reg, {
    canonical: "facts_list",
    name: "list_workspace_facts",
    schema: listFactsSchema,
    handler: listHandler
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "facts_search",
    legacy: "workspace_facts_search",
    description:
      "Semantic + fulltext search over 0-contents/0-facts only. Returns cited hits for the agent to synthesize an answer.",
    schema: searchFactsSchema,
    handler: searchHandler
  });
  registerDeprecatedAlias(reg, {
    canonical: "facts_search",
    name: "search_workspace_facts",
    schema: searchFactsSchema,
    handler: searchHandler
  });
}
