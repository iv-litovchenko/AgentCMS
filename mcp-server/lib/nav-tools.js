import { z } from "zod";
import { registerCanonicalWithLegacyAlias, registerDeprecatedAlias } from "./register-tool-alias.js";

function registerNavReadRefreshPair(
  reg,
  {
    hub,
    readDescription,
    refreshDescription,
    readSchema,
    readHandler,
    refreshSchema,
    refreshHandler,
    legacyReadNames = [],
    legacyRefreshNames = []
  }
) {
  const canonicalRead = `nav_index_toc_${hub}_read`;
  const canonicalRefresh = `nav_index_toc_${hub}_refresh`;
  const midRead = `${hub}_index_toc_read`;
  const midRefresh = `${hub}_index_toc_refresh`;

  registerCanonicalWithLegacyAlias(reg, {
    canonical: canonicalRead,
    legacy: midRead,
    description: readDescription,
    schema: readSchema,
    handler: readHandler
  });
  for (const name of legacyReadNames) {
    if (name && name !== midRead && name !== canonicalRead) {
      registerDeprecatedAlias(reg, {
        canonical: canonicalRead,
        name,
        schema: readSchema,
        handler: readHandler
      });
    }
  }

  registerCanonicalWithLegacyAlias(reg, {
    canonical: canonicalRefresh,
    legacy: midRefresh,
    description: refreshDescription,
    schema: refreshSchema,
    handler: refreshHandler
  });
  for (const name of legacyRefreshNames) {
    if (name && name !== midRefresh && name !== canonicalRefresh) {
      registerDeprecatedAlias(reg, {
        canonical: canonicalRefresh,
        name,
        schema: refreshSchema,
        handler: refreshHandler
      });
    }
  }
}

export function registerNavTools(reg, client, pagePath) {
  const overwriteSchema = z.object({
    overwrite: z
      .boolean()
      .optional()
      .describe("Replace existing file if present (default true). false → 409 when file exists.")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "nav_map_workspace_read",
    legacy: "workspace_map_read",
    description:
      "Light WS-MAP.md metadata: every manifest.md in workspace (disk walk, not get_topic_map). ID, status, type, path, title, description. No body.",
    schema: z.object({}),
    handler: () => client.get("/api/agent/workspace-wsmap")
  });
  registerDeprecatedAlias(reg, {
    canonical: "nav_map_workspace_read",
    name: "read_workspace_map",
    schema: z.object({}),
    handler: () => client.get("/api/agent/workspace-wsmap")
  });

  const refreshWorkspaceMapSchema = z.object({
    overwrite: z
      .boolean()
      .optional()
      .describe("Replace existing WS-MAP.md if present (default true). false → 409 when file exists.")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "nav_map_workspace_refresh",
    legacy: "workspace_map_refresh",
    description:
      "Rebuild WS-MAP.md at workspace root: flat table from all manifest.md files on disk (topics, infoblocks, media, channels, …).",
    schema: refreshWorkspaceMapSchema,
    handler: ({ overwrite }) =>
      client.post("/api/agent/workspace-wsmap", {
        ...(overwrite === false ? { overwrite: false } : {})
      })
  });
  registerDeprecatedAlias(reg, {
    canonical: "nav_map_workspace_refresh",
    name: "refresh_workspace_map",
    schema: refreshWorkspaceMapSchema,
    handler: ({ overwrite }) =>
      client.post("/api/agent/workspace-wsmap", {
        ...(overwrite === false ? { overwrite: false } : {})
      })
  });

  registerNavReadRefreshPair(reg, {
    hub: "topics",
    readDescription:
      "Quick TOC for workspace topics: path + type + title + description (awn-topics/index.md). Hub sections 0-agent-kit / 0-shared pinned at top (pinnedSections). No body.",
    refreshDescription:
      "Refresh (rebuild and save) awn-topics/index.md from workspace page map (path, type, title, description table). overwrite=false skips if file exists.",
    readSchema: z.object({}),
    readHandler: () => client.get("/api/agent/workspace-page-index"),
    refreshSchema: overwriteSchema,
    refreshHandler: ({ overwrite }) =>
      client.post("/api/agent/workspace-page-index", {
        ...(overwrite === false ? { overwrite: false } : {})
      }),
    legacyReadNames: ["read_topic_index_toc"],
    legacyRefreshNames: ["refresh_topic_index_toc"]
  });

  const contentIndexReadSchema = z.object({
    path: pagePath,
    slot: z
      .string()
      .min(1)
      .optional()
      .describe(
        "Optional slot filter (memory/main, inbox, media…). Omit for topic-wide index across all data slots."
      )
  });

  const contentIndexRefreshSchema = z.object({
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

  registerNavReadRefreshPair(reg, {
    hub: "contents",
    readDescription:
      "Quick TOC for a topic or one slot: path + type + title + description (index.md style). No body, no properties. scope=topic (default) or slot when slot is set. indexFile.exists shows on-disk index.md.",
    refreshDescription:
      "Refresh (rebuild and save) index.md from current slot/topic files (path, type, title, description table). slot omitted → topic index (index.md next to manifest.md); slot set → slot index (e.g. …/main/index.md). overwrite=false skips if file exists.",
    readSchema: contentIndexReadSchema,
    readHandler: ({ path, slot }) =>
      client.get("/api/agent/content-index", {
        path,
        ...(slot ? { slot } : {})
      }),
    refreshSchema: contentIndexRefreshSchema,
    refreshHandler: ({ path, slot, overwrite }) =>
      client.post("/api/agent/content-index", {
        path,
        ...(slot ? { slot } : {}),
        ...(overwrite === false ? { overwrite: false } : {})
      }),
    legacyReadNames: ["read_content_index_toc"],
    legacyRefreshNames: ["refresh_content_index_toc"]
  });

  registerNavReadRefreshPair(reg, {
    hub: "databases",
    readDescription:
      "Quick TOC for all database stores: kind, group, path, title, description, recordCount (awn-databases/index.md).",
    refreshDescription: "Refresh awn-databases/index.md from databases_list. overwrite=false skips if file exists.",
    readSchema: z.object({}),
    readHandler: () => client.get("/api/agent/awn-databases-index"),
    refreshSchema: overwriteSchema,
    refreshHandler: ({ overwrite }) =>
      client.post("/api/agent/awn-databases-index", {
        ...(overwrite === false ? { overwrite: false } : {})
      }),
    legacyReadNames: ["read_databases_index_toc", "read_database_frame_index_toc"],
    legacyRefreshNames: ["refresh_databases_index_toc", "refresh_database_frame_index_toc"]
  });

  registerNavReadRefreshPair(reg, {
    hub: "channels",
    readDescription: "Read awn-channels/index.md (catalog table of ingress channels).",
    refreshDescription: "Rebuild awn-channels/index.md from channel manifests and presets.",
    readSchema: z.object({}),
    readHandler: () => client.get("/api/agent/channels-index"),
    refreshSchema: overwriteSchema,
    refreshHandler: ({ overwrite }) =>
      client.post("/api/agent/channels-index", {
        ...(overwrite === false ? { overwrite: false } : {})
      }),
    legacyReadNames: ["read_channels_index_toc"],
    legacyRefreshNames: ["refresh_channels_index_toc"]
  });

  registerNavReadRefreshPair(reg, {
    hub: "repositories",
    readDescription: "Read awn-repositories/index.md (catalog table of source repos).",
    refreshDescription:
      "Rebuild awn-repositories/index.md table from repository manifests (overwrite=false skips if exists).",
    readSchema: z.object({}),
    readHandler: () => client.get("/api/workspace/fs/read", { path: "awn-repositories/index.md" }),
    refreshSchema: overwriteSchema,
    refreshHandler: ({ overwrite }) =>
      client.post("/api/agent/repository-index", {
        ...(overwrite === false ? { overwrite: false } : {})
      }),
    legacyReadNames: ["read_repository_index_toc"],
    legacyRefreshNames: ["refresh_repository_index_toc"]
  });

  registerNavReadRefreshPair(reg, {
    hub: "media_libraries",
    readDescription: "Read awn-media/index.md (catalog table of media libraries).",
    refreshDescription: "Rebuild awn-media/index.md from registered library manifests.",
    readSchema: z.object({}),
    readHandler: () => client.get("/api/workspace/fs/read", { path: "awn-media/index.md" }),
    refreshSchema: overwriteSchema,
    refreshHandler: ({ overwrite } = {}) =>
      client.post("/api/agent/media-library-index", {
        ...(overwrite === false ? { overwrite: false } : {})
      }),
    legacyReadNames: ["read_media_library_index_toc"],
    legacyRefreshNames: ["refresh_media_library_index_toc"]
  });
}
