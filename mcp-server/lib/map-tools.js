import { z } from "zod";

const workspaceRelPath = z
  .string()
  .min(1)
  .describe("Workspace-relative file or folder path, e.g. awn-container/tema/awn-storage/main/readme.md");

const searchWorkspaceSchema = z.object({
  query: z.string().min(1),
  scope: z.enum(["all", "content", "filename", "description", "tags"]).optional(),
  fileType: z
    .enum([
      "all",
      "markdown",
      "sidecar",
      "pdf",
      "office",
      "spreadsheet",
      "video",
      "audio",
      "image",
      "archive",
      "config",
      "other"
    ])
    .optional(),
  match: z.enum(["relaxed", "strict"]).optional(),
  limit: z.number().int().min(1).max(100).optional()
});

function registerSearchWorkspaceTools(reg, client) {
  const runSearch = ({ query, scope, fileType, match, limit }) =>
    client.get("/api/search", {
      q: query,
      scope: scope || "all",
      fileType: fileType || "all",
      match: match || "relaxed",
      limit: limit || 30
    });

  reg(
    "search_workspace_content",
    "Full-text search across the entire workspace (paths, titles, frontmatter, body). scope=all — everything; content|filename|tags to narrow. Same as UI header search.",
    searchWorkspaceSchema,
    runSearch
  );

  reg(
    "search_workspace_semantic",
    "Offline semantic search across the entire workspace (local hash-TF-IDF index in .agent-cms/semantic-index). Finds related notes by meaning without exact words. Reindex: POST /api/search/semantic/reindex.",
    z.object({
      query: z.string().min(2),
      limit: z.number().int().min(1).max(50).optional()
    }),
    ({ query, limit }) => client.get("/api/search/semantic", { q: query, limit: limit || 20 })
  );

  reg(
    "query_workspace_storage",
    "SQL-like filter over entire workspace field catalog (.agent-cms/storage-index). Not tied to infoblocks — any .md/.yml with frontmatter. Reindex: POST /api/storage-index/reindex.",
    z.object({
      pathPrefix: z.string().optional().describe("Limit to path prefix, e.g. awn-container/finansy"),
      where: z
        .array(
          z.object({
            field: z.string().min(1),
            eq: z.union([z.string(), z.number(), z.boolean()]).optional(),
            contains: z.string().optional(),
            gte: z.union([z.string(), z.number()]).optional(),
            lte: z.union([z.string(), z.number()]).optional(),
            gt: z.union([z.string(), z.number()]).optional(),
            lt: z.union([z.string(), z.number()]).optional()
          })
        )
        .optional(),
      sort: z
        .object({
          field: z.string().min(1),
          dir: z.enum(["asc", "desc"]).optional()
        })
        .optional(),
      fields: z.array(z.string()).optional(),
      limit: z.number().int().min(1).max(500).optional()
    }),
    (payload) => client.post("/api/storage-index/query", payload)
  );
}

export function registerMapTools(reg, client, pagePath) {
  reg(
    "get_page_map",
    "Workspace map: manifest nodes (hasManifest:true) + folders without manifest (kind:folder). No body. Folders → list_folder/read_file; pages → read_page_* / get_content_map.",
    z.object({
      includeSlots: z.boolean().optional().describe("Include slot summaries for topics (default true)")
    }),
    ({ includeSlots }) =>
      client.get("/api/agent/page-map", {
        ...(includeSlots === false ? { includeSlots: "false" } : {})
      })
  );

  reg(
    "get_content_map",
    "Content map for one page: items in all slots (or one slot) with title, description, properties (no body). Use for edit planning; heavier than get_content_index.",
    z.object({
      path: pagePath,
      slot: z
        .string()
        .min(1)
        .optional()
        .describe("Optional slot filter, e.g. main, inbox, media. Omit for all slots.")
    }),
    ({ path, slot }) =>
      client.get("/api/agent/content-map", {
        path,
        ...(slot ? { slot } : {})
      })
  );

  reg(
    "get_content_index",
    "Quick TOC for a topic or one slot: path + type + title + description (index.md style). No body, no properties. scope=topic (default) or slot when slot is set. indexFile.exists shows on-disk index.md.",
    z.object({
      path: pagePath,
      slot: z
        .string()
        .min(1)
        .optional()
        .describe(
          "Optional slot filter (memory/main, inbox, media…). Omit for topic-wide index across all data slots."
        )
    }),
    ({ path, slot }) =>
      client.get("/api/agent/content-index", {
        path,
        ...(slot ? { slot } : {})
      })
  );

  const refreshContentIndexSchema = z.object({
    path: pagePath,
    slot: z
      .string()
      .min(1)
      .optional()
      .describe("Optional slot (memory/main, inbox…). Omit to refresh topic-wide index.md next to manifest.md."),
    overwrite: z
      .boolean()
      .optional()
      .describe("Replace existing index.md if present (default true). false → 409 when file exists.")
  });

  const runRefreshContentIndex = ({ path, slot, overwrite }) =>
    client.post("/api/agent/content-index", {
      path,
      ...(slot ? { slot } : {}),
      ...(overwrite === false ? { overwrite: false } : {})
    });

  reg(
    "refresh_content_index",
    "Refresh (rebuild and save) index.md from current slot/topic files (path, type, title, description table). slot omitted → topic index (index.md next to manifest.md); slot set → slot index (e.g. …/main/index.md). overwrite=false skips if file exists.",
    refreshContentIndexSchema,
    runRefreshContentIndex
  );

  reg(
    "get_workspace_page_index",
    "Quick TOC for all workspace pages: path + type + title + description (INDEX.md at workspace root). No body. indexFile.exists shows on-disk INDEX.md.",
    z.object({}),
    () => client.get("/api/agent/workspace-page-index")
  );

  reg(
    "refresh_workspace_page_index",
    "Refresh (rebuild and save) INDEX.md at workspace root from get_page_map (path, type, title, description table). overwrite=false skips if file exists.",
    z.object({
      overwrite: z
        .boolean()
        .optional()
        .describe("Replace existing INDEX.md if present (default true). false → 409 when file exists.")
    }),
    ({ overwrite }) =>
      client.post("/api/agent/workspace-page-index", {
        ...(overwrite === false ? { overwrite: false } : {})
      })
  );

  reg(
    "resolve_workspace_path",
    "Walk up from any workspace path: breadcrumbs (workspace→file), manifest ancestors, slot/ref, mcp hints.",
    z.object({
      path: workspaceRelPath
    }),
    ({ path }) => client.get("/api/agent/resolve-path", { path })
  );
}

export { registerSearchWorkspaceTools };
