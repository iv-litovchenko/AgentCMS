import { z } from "zod";

const termTags = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .describe("Tags (array or comma-separated string)");

const createTermSchema = z.object({
  term: z.string().min(1).describe("Term title"),
  definition: z.string().min(1).describe("Definition (markdown body)"),
  aliases: termTags.describe("Alternative names"),
  tags: termTags,
  marker: z.string().optional().describe("Source marker, e.g. study marker id"),
  sourceRef: z.string().optional().describe("Optional source path in workspace")
});

const updateTermSchema = z.object({
  record: z.string().min(1).describe("Record id or workspace path"),
  term: z.string().optional(),
  definition: z.string().optional(),
  aliases: termTags,
  tags: termTags,
  marker: z.string().optional(),
  sourceRef: z.string().optional()
});

const listTermsSchema = z.object({
  prefix: z.string().optional().describe("Filter terms starting with prefix/letter"),
  tags: termTags,
  limit: z.number().int().min(1).max(200).optional().describe("Max items (default 50)")
});

const searchTermsSchema = z.object({
  query: z.string().min(2).describe("Word, phrase, or marker"),
  limit: z.number().int().min(1).max(50).optional().describe("Max hits (default 12)"),
  includeSnippets: z.boolean().optional().describe("Include snippets (default true)")
});

export function registerGlossaryTools(reg, client) {
  reg(
    "create_glossary_term",
    "Create a glossary term in awn-databases/contents/glossary (md-lite collection).",
    createTermSchema,
    (payload) => client.post("/api/agent/workspace-glossary/create", payload)
  );

  reg(
    "update_glossary_term",
    "Update glossary term by record id or path in contents/glossary.",
    updateTermSchema,
    (payload) => client.post("/api/agent/workspace-glossary/update", payload)
  );

  reg(
    "list_glossary_terms",
    "List glossary terms from contents/glossary (alphabetical). Optional prefix and tags.",
    listTermsSchema,
    ({ prefix, tags, limit }) =>
      client.get("/api/agent/workspace-glossary/list", {
        ...(prefix ? { prefix } : {}),
        ...(tags ? { tags: Array.isArray(tags) ? tags.join(",") : tags } : {}),
        ...(limit ? { limit } : {})
      })
  );

  reg(
    "search_glossary_terms",
    "Semantic + fulltext search over contents/glossary only.",
    searchTermsSchema,
    ({ query, limit, includeSnippets }) =>
      client.get("/api/agent/workspace-glossary/search", {
        q: query,
        ...(limit ? { limit } : {}),
        ...(includeSnippets === false ? { includeSnippets: "false" } : {})
      })
  );
}
