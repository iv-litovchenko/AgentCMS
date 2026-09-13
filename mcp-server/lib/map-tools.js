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
  pathPrefix: workspaceRelPath
    .optional()
    .describe("Limit search to workspace subtree, e.g. awn-container/tema-x. Empty = entire workspace."),
  limit: z.number().int().min(1).max(100).optional()
});

function registerSearchWorkspaceTools(reg, client) {
  const runSearch = ({ query, scope, fileType, match, pathPrefix, limit }) =>
    client.get("/api/search", {
      q: query,
      scope: scope || "all",
      fileType: fileType || "all",
      match: match || "relaxed",
      pathPrefix: pathPrefix || undefined,
      limit: limit || 30
    });

  reg(
    "search_workspace_content",
    "Full-text search across the workspace (paths, titles, frontmatter, body). scope=all — everything; content|filename|tags to narrow. pathPrefix limits to a topic/area/folder subtree. Same as UI header search.",
    searchWorkspaceSchema,
    runSearch
  );

  reg(
    "search_workspace_semantic",
    "Offline semantic search across the workspace (local hash-TF-IDF index in .agent-cms/semantic-index). pathPrefix limits to subtree. Reindex: rebuild_workspace_semantic_index.",
    z.object({
      query: z.string().min(2),
      pathPrefix: workspaceRelPath
        .optional()
        .describe("Limit search to workspace subtree, e.g. awn-container/tema-x"),
      limit: z.number().int().min(1).max(50).optional()
    }),
    ({ query, pathPrefix, limit }) =>
      client.get("/api/search/semantic", {
        q: query,
        pathPrefix: pathPrefix || undefined,
        limit: limit || 20
      })
  );

  reg(
    "search_workspace_hybrid",
    "Hybrid workspace search in one call: semantic + fulltext, optionally narrowed by pathPrefix and storage-index field filters (where on frontmatter: awn-date, tags, author…). Returns merged cited hits — agent synthesizes the answer.",
    z.object({
      query: z.string().min(2).describe("Search phrase or question"),
      pathPrefix: workspaceRelPath
        .optional()
        .describe("Limit to workspace subtree, e.g. awn-container/tema-archiv"),
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
        .optional()
        .describe("Frontmatter filters via storage-index (applied before text/semantic search)"),
      scopes: z
        .array(z.enum(["semantic", "fulltext"]))
        .optional()
        .describe("Search layers (default: semantic + fulltext)"),
      limit: z.number().int().min(1).max(50).optional().describe("Max merged hits (default 20)"),
      includeSnippets: z.boolean().optional().describe("Include text snippets (default true)")
    }),
    (payload) => client.post("/api/search/hybrid", payload)
  );

  reg(
    "query_workspace_storage",
    "SQL-like filter over entire workspace field catalog (.agent-cms/storage-index). Not tied to infoblocks — any .md/.yml with frontmatter. Reindex: rebuild_workspace_storage_index.",
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

  reg(
    "get_workspace_index_status",
    "Status of offline workspace indexes: semantic, fulltext (inverted token index), and field catalog (SQL-like storage-index).",
    z.object({}),
    async () => {
      const [semantic, fulltext, storage] = await Promise.all([
        client.get("/api/search/semantic/status"),
        client.get("/api/search/fulltext/status"),
        client.get("/api/storage-index/status")
      ]);
      return { semantic, fulltext, storage };
    }
  );

  reg(
    "get_workspace_index_monitor",
    "Monitor workspace indexes: stale/outdated files, index size, last rebuild duration, health (ok|stale|partial|empty).",
    z.object({}),
    () => client.get("/api/workspace-index/monitor")
  );

  reg(
    "rebuild_workspace_semantic_index",
    "Rebuild offline semantic index for the whole workspace (hash-TF-IDF chunks in .agent-cms/semantic-index). Run after bulk file changes or before semantic search.",
    z.object({}),
    () => client.post("/api/search/semantic/reindex", {})
  );

  reg(
    "rebuild_workspace_storage_index",
    "Rebuild workspace field catalog from frontmatter of all .md/.yml (.agent-cms/storage-index). Run after bulk metadata changes or before query_workspace_storage.",
    z.object({}),
    () => client.post("/api/storage-index/reindex", {})
  );

  reg(
    "rebuild_workspace_fulltext_index",
    "Rebuild offline fulltext index for the whole workspace (inverted token index in .agent-cms/fulltext-index). Run after bulk imports or before search_workspace_content on large archives.",
    z.object({}),
    () => client.post("/api/search/fulltext/reindex", {})
  );

  reg(
    "rebuild_workspace_indexes",
    "Rebuild workspace indexes: semantic, fulltext, then field catalog (SQL-like).",
    z.object({}),
    async () => {
      const semantic = await client.post("/api/search/semantic/reindex", {});
      const fulltext = await client.post("/api/search/fulltext/reindex", {});
      const storage = await client.post("/api/storage-index/reindex", {});
      return { semantic, fulltext, storage };
    }
  );

  reg(
    "sync_workspace_index_file",
    "Incrementally update both workspace indexes for one saved file (fast; requires an initial full rebuild). Use after editing a single file instead of full reindex.",
    z.object({
      path: z.string().min(1).describe("Workspace-relative file path, e.g. awn-storage/main/note.md")
    }),
    ({ path }) => client.post("/api/workspace-index/sync-file", { path })
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

  reg(
    "get_page_url",
    "Build a browser URL to open a workspace page in Agent CMS (CHPU route). path: manifest.md, slot file, system file, or folder. view: optional UI suffix (edit, todo, nav, list, …). Returns url + pathname.",
    z.object({
      path: workspaceRelPath
        .optional()
        .describe("Workspace-relative path; empty = workspace home"),
      view: z
        .string()
        .optional()
        .describe("Optional CHPU UI view, e.g. edit, todo, nav, list, preview, hub"),
      forceView: z
        .boolean()
        .optional()
        .describe("Append view even for default-omitted views like nav/preview")
    }),
    ({ path, view, forceView }) =>
      client.get("/api/agent/page-url", {
        path: path || "",
        view: view || undefined,
        forceView: forceView ? true : undefined
      })
  );
}

export { registerSearchWorkspaceTools };
