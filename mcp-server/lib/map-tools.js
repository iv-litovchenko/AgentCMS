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
    "Full-text search across workspace files (paths, titles, frontmatter, body). scope=all searches everything; use content|filename|tags to narrow. Same as UI header search.",
    searchWorkspaceSchema,
    runSearch
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
    "Quick TOC for a topic or one slot: path + title + description only (index.md style). No body, no properties. scope=topic (default) or slot when slot is set. indexFile.exists shows on-disk index.md.",
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

  reg(
    "write_content_index",
    "Generate and save index.md from current slot/topic files (path, title, description table). slot omitted → topic index (awn-storage/index.md); slot set → slot index (e.g. …/main/index.md). overwrite=false skips if file exists.",
    z.object({
      path: pagePath,
      slot: z
        .string()
        .min(1)
        .optional()
        .describe("Optional slot (memory/main, inbox…). Omit to write topic-wide awn-storage/index.md."),
      overwrite: z
        .boolean()
        .optional()
        .describe("Replace existing index.md if present (default true). false → 409 when file exists.")
    }),
    ({ path, slot, overwrite }) =>
      client.post("/api/agent/content-index", {
        path,
        ...(slot ? { slot } : {}),
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
