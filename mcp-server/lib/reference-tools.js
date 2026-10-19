import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const entryTags = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .describe("Tags (array or comma-separated string)");

const createEntrySchema = z.object({
  title: z.string().min(1).describe("Entry title"),
  body: z.string().min(1).describe("Reference body (markdown)"),
  parent: z.string().optional().describe("Parent section record id (hierarchical store)"),
  tags: entryTags,
  sourceRef: z.string().optional().describe("Optional source path in workspace")
});

const updateEntrySchema = z.object({
  record: z.string().min(1).describe("Record id or workspace path"),
  title: z.string().optional(),
  body: z.string().optional(),
  tags: entryTags,
  sourceRef: z.string().optional()
});

const listEntriesSchema = z.object({
  prefix: z.string().optional().describe("Filter titles starting with prefix"),
  tags: entryTags,
  limit: z.number().int().min(1).max(200).optional().describe("Max items (default 50)")
});

const searchEntriesSchema = z.object({
  query: z.string().min(2).describe("Word or phrase"),
  limit: z.number().int().min(1).max(50).optional().describe("Max hits (default 12)"),
  includeSnippets: z.boolean().optional().describe("Include snippets (default true)")
});

export function registerReferenceTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "reference_entry_create",
    legacy: "create_reference_entry",
    description:
      "Create a reference entry in awn-databases/0-contents/0-reference (md-lite, hierarchical sections).",
    schema: createEntrySchema,
    handler: (payload) => client.post("/api/agent/workspace-reference/create", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "reference_entry_update",
    legacy: "update_reference_entry",
    description: "Update reference entry by record id or path in contents/reference.",
    schema: updateEntrySchema,
    handler: (payload) => client.post("/api/agent/workspace-reference/update", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "reference_entries_list",
    legacy: "list_reference_entries",
    description: "List reference entries from contents/reference (alphabetical). Optional prefix and tags.",
    schema: listEntriesSchema,
    handler: ({ prefix, tags, limit }) =>
      client.get("/api/agent/workspace-reference/list", {
        ...(prefix ? { prefix } : {}),
        ...(tags ? { tags: Array.isArray(tags) ? tags.join(",") : tags } : {}),
        ...(limit ? { limit } : {})
      })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "reference_entries_search",
    legacy: "search_reference_entries",
    description: "Semantic + fulltext search over contents/reference only.",
    schema: searchEntriesSchema,
    handler: ({ query, limit, includeSnippets }) =>
      client.get("/api/agent/workspace-reference/search", {
        q: query,
        ...(limit ? { limit } : {}),
        ...(includeSnippets === false ? { includeSnippets: "false" } : {})
      })
  });
}
