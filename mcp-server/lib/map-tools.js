import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const workspaceRelPath = z
  .string()
  .min(1)
  .describe("Workspace-relative file or folder path, e.g. awn-topics/tema/awn-storage/main/readme.md");

const searchExtensions = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .describe("Limit to file extensions: .php, json, sidecar.md (comma-separated or array)");

function formatSearchExtensionsParam(extensions) {
  if (extensions == null || extensions === "") return undefined;
  return Array.isArray(extensions) ? extensions.join(",") : extensions;
}

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
    .describe("Limit search to workspace subtree, e.g. awn-topics/tema-x. Empty = entire workspace."),
  extensions: searchExtensions,
  limit: z.number().int().min(1).max(100).optional()
});

function registerSearchWorkspaceTools(reg, client) {
  const runSearch = ({ query, scope, fileType, match, pathPrefix, extensions, limit }) =>
    client.get("/api/search", {
      q: query,
      scope: scope || "all",
      fileType: fileType || "all",
      match: match || "relaxed",
      pathPrefix: pathPrefix || undefined,
      extensions: formatSearchExtensionsParam(extensions),
      limit: limit || 30
    });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "search_content",
    legacy: "search_workspace_content",
    description:
      "Full-text search across the workspace (paths, titles, frontmatter, body). scope=all — everything; content|filename|tags to narrow. pathPrefix limits to a topic/area/folder subtree. Same as UI header search.",
    schema: searchWorkspaceSchema,
    handler: runSearch
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "search_semantic",
    legacy: "search_workspace_semantic",
    description:
      "Offline semantic search across the workspace (local hash-TF-IDF index in .agent-cms/cache/indexes/semantic). pathPrefix limits to subtree. Reindex: index_semantic_rebuild.",
    schema: z.object({
      query: z.string().min(2),
      pathPrefix: workspaceRelPath
        .optional()
        .describe("Limit search to workspace subtree, e.g. awn-topics/tema-x"),
      extensions: searchExtensions,
      limit: z.number().int().min(1).max(50).optional()
    }),
    handler: ({ query, pathPrefix, extensions, limit }) =>
      client.get("/api/search/semantic", {
        q: query,
        pathPrefix: pathPrefix || undefined,
        extensions: formatSearchExtensionsParam(extensions),
        limit: limit || 20
      })
  });

  const searchHybridSchema = z.object({
    query: z.string().min(2).describe("Search phrase or question"),
    pathPrefix: workspaceRelPath
      .optional()
      .describe("Limit to workspace subtree, e.g. awn-topics/tema-archiv"),
    extensions: searchExtensions,
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
    includeSnippets: z.boolean().optional().describe("Include text snippets (default true)"),
    entityIds: z
      .array(z.string().min(1))
      .optional()
      .describe("Restrict search to files mentioning ALL listed entity ids (AND)"),
    entityWhere: z
      .object({
        type: z.string().optional().describe("Entity type filter before path union"),
        q: z.string().optional().describe("Substring match on entity label")
      })
      .optional()
      .describe("Resolve entities by type/label, then search only in their mention paths (OR across matches)")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "search_hybrid",
    legacy: "search_workspace_hybrid",
    description:
      "Hybrid workspace search in one call: semantic + fulltext, optionally narrowed by pathPrefix and storage-index field filters (where on frontmatter: awn-date, tags, author…). Returns merged cited hits — agent synthesizes the answer.",
    schema: searchHybridSchema,
    handler: (payload) => client.post("/api/search/hybrid", payload)
  });

  const searchBatchSchema = z.object({
      queries: z
        .array(z.string().min(2))
        .min(1)
        .max(20)
        .describe("List of questions or fact lookups (2+ chars each, max 20)"),
      pathPrefix: workspaceRelPath
        .optional()
        .describe("Limit all queries to workspace subtree"),
      extensions: searchExtensions,
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
        .describe("Frontmatter filters via storage-index (shared for all queries)"),
      scopes: z
        .array(z.enum(["semantic", "fulltext"]))
        .optional()
        .describe("Search layers per query (default: semantic + fulltext)"),
      limitPerQuery: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("Max merged hits per query (default 8)"),
      includeSnippets: z.boolean().optional().describe("Include text snippets (default true)"),
      entityIds: z.array(z.string().min(1)).optional(),
      entityWhere: z
        .object({
          type: z.string().optional(),
          q: z.string().optional()
        })
        .optional()
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "search_batch",
    legacy: "search_workspace_batch",
    description:
      "Batch hybrid search: multiple questions/facts in one MCP call (max 20). Each item runs semantic + fulltext like search_hybrid. Use when the user asks several archive questions at once — one round-trip instead of N separate searches.",
    schema: searchBatchSchema,
    handler: (payload) => client.post("/api/search/batch", payload)
  });

  const indexStorageQuerySchema = z.object({
    dql: z
      .string()
      .optional()
      .describe(
        'DQL-lite string, e.g. FROM finansy WHERE awn-type = "awn.hub.topic" WITH TEXT "аренда" LIMIT 50'
      ),
    withText: z
      .string()
      .optional()
      .describe("Hybrid text search within DQL result paths (overrides WITH TEXT in dql string)"),
    hybridLimit: z.number().int().min(1).max(50).optional(),
    pathPrefix: z.string().optional().describe("Limit to path prefix, e.g. awn-topics/finansy"),
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
  });
  const indexStorageQueryHandler = (payload) => client.post("/api/storage-index/query", payload);

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "index_storage_query",
    legacy: "query_workspace_storage",
    description:
      "SQL-like filter over entire workspace field catalog (.agent-cms/cache/indexes/storage). Not tied to infoblocks — any .md/.yml with frontmatter. Reindex: index_storage_rebuild.",
    schema: indexStorageQuerySchema,
    handler: indexStorageQueryHandler
  });

  reg(
    "list_workspace_registry_queries",
    "Named registry queries for this workspace (.agent-cms/settings/registry-queries.yml): always-context, cron, focus, SQL-like storage-index presets. Defaults merged with file.",
    z.object({}),
    () => client.get("/api/agent/registry-queries")
  );

  reg(
    "run_workspace_registry_query",
    "Run a named registry query by id (see list_workspace_registry_queries). Combines storage-index where/sort/fields or runtime cron/heartbeat/nav registries.",
    z.object({
      id: z.string().min(1).describe("Query id, e.g. always-context, cron, nav-focus, topics"),
      registryId: z
        .string()
        .min(1)
        .optional()
        .describe("Alias for id")
    }),
    ({ id, registryId }) =>
      client.post("/api/agent/registry-queries/run", { id: registryId || id })
  );

  const indexStatusHandler = async () => {
    const [ocr, semantic, fulltext, storage, link, entity] = await Promise.all([
      client.get("/api/ocr-index/status"),
      client.get("/api/search/semantic/status"),
      client.get("/api/search/fulltext/status"),
      client.get("/api/storage-index/status"),
      client.get("/api/link-index/status"),
      client.get("/api/entity-index/status")
    ]);
    return { ocr, semantic, fulltext, storage, link, entity };
  };
  const emptyIndexSchema = z.object({});

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "index_status_get",
    legacy: "get_workspace_index_status",
    description:
      "Status of offline workspace indexes: OCR attachments, fulltext, semantic, and field catalog (SQL-like storage-index).",
    schema: emptyIndexSchema,
    handler: indexStatusHandler
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "index_monitor_get",
    legacy: "get_workspace_index_monitor",
    description:
      "Monitor workspace indexes: stale/outdated files, index size, last rebuild duration, health (ok|stale|partial|empty).",
    schema: emptyIndexSchema,
    handler: () => client.get("/api/workspace-index/monitor")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "index_semantic_rebuild",
    legacy: "rebuild_workspace_semantic_index",
    description:
      "Rebuild offline semantic index for the whole workspace (hash-TF-IDF chunks in .agent-cms/cache/indexes/semantic). Run after bulk file changes or before search_semantic.",
    schema: emptyIndexSchema,
    handler: () => client.post("/api/search/semantic/reindex", {})
  });

  const indexStorageRebuildSchema = z.object({
    mode: z
      .enum(["quick", "full"])
      .optional()
      .describe("quick = frontmatter only; full = schema enrichment (default full)")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "index_storage_rebuild",
    legacy: "rebuild_workspace_storage_index",
    description:
      "Rebuild workspace field catalog from frontmatter of all .md/.yml (.agent-cms/cache/indexes/storage). mode: quick = frontmatter only; full = schema registry + field types/titles (default full).",
    schema: indexStorageRebuildSchema,
    handler: (payload) => client.post("/api/storage-index/reindex", { mode: payload?.mode || "full" })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "index_fulltext_rebuild",
    legacy: "rebuild_workspace_fulltext_index",
    description:
      "Rebuild offline fulltext index for the whole workspace (inverted token index in .agent-cms/cache/indexes/fulltext). Run after bulk imports or before search_content on large archives.",
    schema: emptyIndexSchema,
    handler: () => client.post("/api/search/fulltext/reindex", {})
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "index_link_rebuild",
    legacy: "rebuild_workspace_link_index",
    description:
      "Rebuild workspace link graph (wikilinks, markdown links, relation fields) in .agent-cms/cache/indexes/link/edges.sqlite. Run before search_links.",
    schema: emptyIndexSchema,
    handler: () => client.post("/api/link-index/reindex", {})
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "index_entity_rebuild",
    legacy: "rebuild_workspace_entity_index",
    description:
      "Rebuild workspace entity registry (regex/NER prototype) in .agent-cms/cache/indexes/entity/entities.sqlite. Extracts people, dates, urls, tags, wikilinks, money from note bodies + frontmatter.",
    schema: emptyIndexSchema,
    handler: () => client.post("/api/entity-index/reindex", {})
  });

  const entityQuerySchema = z.object({
    mode: z
      .enum(["entities", "mentions", "by_entity", "by_path", "path"])
      .optional()
      .describe("entities = list/filter; mentions/by_entity = all mentions of entityId; by_path/path = entities in one file"),
    q: z.string().optional().describe("Filter entity labels (substring)"),
    type: z.string().optional().describe("Entity type: person, project, date, url, tag, topic, money, email, org"),
    entityId: z.string().optional().describe("Required for mentions mode"),
    path: z.string().optional().describe("Required for by_path mode"),
    pathPrefix: z.string().optional().describe("Limit to subtree"),
    limit: z.number().int().min(1).max(200).optional()
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "entity_query",
    legacy: "query_workspace_entities",
    description:
      "Facet search over extracted entities: list entities (default), mentions by entityId, or entities in a file path.",
    schema: entityQuerySchema,
    handler: (payload) => client.post("/api/entity-index/query", payload || {})
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "entity_alias_merge",
    legacy: "merge_workspace_entity_alias",
    description:
      "Add alias → canonical entity label in .agent-cms/settings/entity-registry.yml (applied on next index_entity_rebuild).",
    schema: z.object({
      match: z.string().min(1).describe("Alias text as written in notes, e.g. Вася"),
      label: z.string().min(1).describe("Canonical label, e.g. Василий Петров"),
      type: z.string().optional().describe("Entity type (default person)")
    }),
    handler: (payload) => client.post("/api/entity-index/alias", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "entity_reject",
    legacy: "reject_workspace_entity",
    description:
      "Hide a label from the entity registry (.agent-cms/settings/entity-registry.yml reject list). Applied on next index_entity_rebuild.",
    schema: z.object({
      label: z.string().min(1).describe("Entity label to hide, e.g. spam wikilink title"),
      type: z
        .string()
        .optional()
        .describe("Entity type scope, or * for all types (default *)")
    }),
    handler: (payload) => client.post("/api/entity-index/reject", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "entity_seed",
    legacy: "seed_workspace_entity",
    description:
      "Add a manual entity seed in entity-registry.yml (0 mentions until notes link it). Reindex to materialize in SQLite.",
    schema: z.object({
      label: z.string().min(1).describe("Display name, e.g. ACME Corp"),
      type: z.string().optional().describe("Registry type id: person, food, project, topic, …")
    }),
    handler: (payload) => client.post("/api/entity-index/seed", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "entity_registry_get",
    legacy: "get_workspace_entity_registry",
    description: "Read entity-registry.yml rules: types (with tag maps), seeds, aliases, reject.",
    schema: emptyIndexSchema,
    handler: () => client.get("/api/entity-index/registry")
  });

  const entityRegistryBodySchema = z.object({
    version: z.number().int().optional(),
    types: z
      .array(
        z.object({
          id: z.string().min(1),
          label: z.string().min(1),
          tags: z.array(z.string()).optional(),
          builtin: z.string().optional()
        })
      )
      .optional(),
    seeds: z
      .array(z.object({ label: z.string().min(1), type: z.string().optional() }))
      .optional(),
    aliases: z
      .array(
        z.object({
          match: z.string().min(1),
          label: z.string().min(1),
          type: z.string().optional()
        })
      )
      .optional(),
    reject: z
      .array(z.object({ label: z.string().min(1), type: z.string().optional() }))
      .optional()
  });

  const entityRegistryPutSchema = z.object({
    registry: entityRegistryBodySchema.describe("Full registry document (version 2)")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "entity_registry_put",
    legacy: "put_workspace_entity_registry",
    description:
      "Replace entity-registry.yml (types, seeds, aliases, reject). Prefer entity_alias_merge / entity_seed / entity_reject for small edits.",
    schema: entityRegistryPutSchema,
    handler: (payload) => client.put("/api/entity-index/registry", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "entity_type_upsert",
    legacy: "upsert_workspace_entity_type",
    description:
      "Add or update one entity type in entity-registry.yml (label, hashtag → type mapping). Reindex to apply tag rules.",
    schema: z.object({
      id: z.string().min(1).describe("Type id slug, e.g. food"),
      label: z.string().min(1).describe("UI label, e.g. Еда"),
      tags: z
        .array(z.string())
        .optional()
        .describe("Hashtags without # that map notes to this type"),
      builtin: z
        .string()
        .optional()
        .describe("Optional builtin extractor map: person, project, topic, …")
    }),
    handler: (payload) => client.post("/api/entity-index/type", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "entity_catalog_list",
    legacy: "list_workspace_entity_catalog",
    description:
      "Paginated entity list from SQLite (+ registry seeds), same as UI ~show-entities / editor object list.",
    schema: z.object({
      limit: z.number().int().min(1).max(200).optional().describe("Page size (default 40)"),
      offset: z.number().int().min(0).optional().describe("Pagination offset"),
      type: z.string().optional().describe("Filter by type id"),
      q: z.string().optional().describe("Substring on label"),
      pathPrefix: z.string().optional().describe("Only entities mentioned under this folder")
    }),
    handler: ({ limit, offset, type, q, pathPrefix }) =>
      client.get("/api/entity-index/catalog", {
        limit,
        offset,
        type,
        q,
        pathPrefix
      })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "entity_search_explain",
    legacy: "explain_workspace_entity_search",
    description:
      "Debug hybrid/entity filter: which entities matched and which file paths would constrain search (entityIds or entityWhere).",
    schema: z.object({
      entityIds: z.array(z.string().min(1)).optional().describe("AND: files must mention all listed entity ids"),
      entityId: z.string().optional().describe("Single entity id (shorthand)"),
      entityWhere: z
        .object({
          type: z.string().optional(),
          q: z.string().optional().describe("Label substring")
        })
        .optional()
        .describe("Match entities by type + label, union of their mention paths"),
      pathPrefix: z.string().optional().describe("Limit paths to subtree"),
      previewLimit: z.number().int().min(1).max(200).optional().describe("Max paths in preview (default 40)")
    }),
    handler: (payload) => client.post("/api/entity-index/explain", payload || {})
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "search_links",
    legacy: "search_workspace_links",
    description:
      "Graph search over workspace links: backlinks, outbound, or neighbors around a path. Requires index_link_rebuild.",
    schema: z.object({
      path: z.string().describe("Workspace-relative file path"),
      mode: z
        .enum(["backlinks", "outbound", "neighbors", "inbound"])
        .optional()
        .describe("backlinks/inbound = who links here; outbound = links from path; neighbors = both directions up to depth"),
      depth: z.number().int().min(1).max(3).optional().describe("Hop depth for neighbors (default 1)"),
      limit: z.number().int().min(1).max(200).optional().describe("Max results (default 50)"),
      pathPrefix: z.string().optional().describe("Restrict results to subtree")
    }),
    handler: (payload) => client.post("/api/link-index/query", payload)
  });

  const indexOcrRunSchema = z.object({
    force: z.boolean().optional().describe("Reprocess even if sidecar exists (default false)"),
    limit: z.number().int().min(1).max(500).optional().describe("Max files per run (default 50)")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "index_ocr_run",
    legacy: "run_workspace_ocr_index",
    description:
      "OCR/extract text from new image/PDF attachments into {stem}.sidecar.md (incremental). Requires tesseract.js on server.",
    schema: indexOcrRunSchema,
    handler: (payload) => client.post("/api/ocr-index/run", payload)
  });

  const indexRebuildSchema = z.object({
    forceOcr: z.boolean().optional().describe("Force OCR reprocessing before indexes"),
    ocrLimit: z.number().int().min(1).max(500).optional()
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "indexes_rebuild",
    legacy: "index_rebuild",
    description:
      "Rebuild all workspace indexes: OCR (new attachments) → fulltext → semantic → field catalog → link graph → sync awn-id counter → WS-MAP.md (manifest registry). Same as UI pipeline button.",
    schema: indexRebuildSchema,
    handler: (payload) => client.post("/api/workspace-index/pipeline", payload || {})
  });
  reg(
    "rebuild_workspace_indexes",
    "Deprecated alias for indexes_rebuild.",
    indexRebuildSchema,
    (payload) => client.post("/api/workspace-index/pipeline", payload || {})
  );

  const indexFileSyncSchema = z.object({
    path: z.string().min(1).describe("Workspace-relative file path, e.g. awn-storage/main/note.md")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "index_file_sync",
    legacy: "sync_workspace_index_file",
    description:
      "Incrementally update fulltext, semantic, storage field catalog, and link graph for one saved file (fast; requires an initial full rebuild). Use after editing a single file instead of indexes_rebuild.",
    schema: indexFileSyncSchema,
    handler: ({ path }) => client.post("/api/workspace-index/sync-file", { path })
  });

  const findByIdSchema = z.object({
    id: z
      .union([z.number().int().positive(), z.string().min(1)])
      .describe('Global awn-id from frontmatter, e.g. 81, "81", or "#81" (not INDEX.md row id)')
  });

  const resolveWorkspaceIdHandler = ({ id }) =>
    client.get("/api/workspace-id/resolve", {
      id: String(id ?? "")
        .trim()
        .replace(/^#+/, "")
    });

  reg(
    "find_by_id",
    "Find workspace file path(s) by global awn-id number (frontmatter field awn-id). Example: 81 → path to manifest or note. Duplicate ids return paths[] and duplicate:true. Assign missing ids: assign_workspace_id.",
    findByIdSchema,
    resolveWorkspaceIdHandler
  );

  reg(
    "resolve_workspace_id",
    "Same handler as find_by_id — resolve path(s) by global awn-id (workspace counter). Prefer find_by_id for discovery. Alternative: index_storage_query with where: [{ field: 'awn-id', eq: N }].",
    findByIdSchema,
    resolveWorkspaceIdHandler
  );

  reg(
    "assign_workspace_id",
    "Assign the next global awn-id to an existing record (page manifest, content .md, sidecar). Use for old records without id — same as UI «Присвоить id».",
    z.object({
      path: z
        .string()
        .min(1)
        .describe("Workspace-relative path to file with frontmatter, e.g. awn-topics/topic/manifest.md"),
      force: z.boolean().optional().describe("Replace existing awn-id (default false)")
    }),
    (payload) => client.post("/api/workspace-id/assign", payload)
  );
}

export function registerMapTools(reg, client, pagePath) {
  const getTopicMapSchema = z.object({
    includeSlots: z.boolean().optional().describe("Include slot summaries for topics (default true)")
  });

  const getTopicMapHandler = ({ includeSlots }) =>
    client.get("/api/agent/page-map", {
      ...(includeSlots === false ? { includeSlots: "false" } : {})
    });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "get_topic_map",
    description:
      "Deprecated. Prefer nav_index_toc_topics_read (workspace overview) + contents_list (placement.kind=root). Legacy: manifest nodes + kind:folder nodes, optional slot summaries (includeSlots). No body.",
    schema: getTopicMapSchema,
    handler: getTopicMapHandler
  });

  reg(
    "get_content_map",
    "Deprecated. Prefer nav_index_toc_contents_read (overview) and content_read with part=properties|meta per record. Legacy: all slots with properties in one call (heavier).",
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

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topics_list",
    legacy: "list_topics",
    description:
      "Topic tree nodes (ws/area/section/topic): flat list or filtered by parentPath. Hub sections 0-agent-kit and 0-shared are pinned first (pinnedSections). No body. INDEX → nav_index_toc_topics_read; folders without manifest → contents_list (kind: root, includeFolders=true).",
    schema: z.object({
      parentPath: pagePath
        .optional()
        .describe("Area/topic manifest or folder — omit for all manifest nodes in workspace"),
      scope: z
        .enum(["children", "subtree"])
        .optional()
        .describe("With parentPath: direct children (default) or entire subtree"),
      includeFolders: z
        .boolean()
        .optional()
        .describe("Include adoptable folders without manifest.md (default false)")
    }),
    handler: ({ parentPath, scope, includeFolders }) =>
      client.get("/api/agent/topics", {
        ...(parentPath ? { parentPath } : {}),
        ...(scope ? { scope } : {}),
        ...(includeFolders === true ? { includeFolders: "true" } : {})
      })
  });

  reg(
    "resolve_workspace_path",
    "Walk up from any workspace path: breadcrumbs (workspace→file), manifest ancestors, slot/ref, mcp hints.",
    z.object({
      path: workspaceRelPath
    }),
    ({ path }) => client.get("/api/agent/resolve-path", { path })
  );

  const getTopicUrlSchema = z.object({
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
  });

  const getTopicUrlHandler = ({ path, view, forceView }) =>
    client.get("/api/agent/page-url", {
      path: path || "",
      view: view || undefined,
      forceView: forceView ? true : undefined
    });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "get_workspace_open_url_from_path",
    legacy: "get_topic_url",
    description:
      "Agent CMS open URL (CHPU) from workspace path: manifest.md, slot .md, folder, system file. " +
      "view: edit, todo, nav, list, preview, … Returns url + pathname.",
    schema: getTopicUrlSchema,
    handler: getTopicUrlHandler
  });
}

export { registerSearchWorkspaceTools };
