import { z } from "zod";
import { registerTocTool } from "./register-toc-tool.js";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const storePath = z
  .string()
  .min(1)
  .describe("Store relPath under awn-databases/, e.g. tasks, taxonomies/tags, agent-registry/agents");

/** Canonical list_databases / get_database … plus deprecated database_frame_* alias. */
function registerDatabaseTool(reg, { canonical, legacyFrameName, description, schema, handler }) {
  const legacy = legacyFrameName ? `database_frame_${legacyFrameName}` : null;
  registerCanonicalWithLegacyAlias(reg, {
    canonical,
    legacy: legacy && legacy !== canonical ? legacy : null,
    description,
    schema,
    handler
  });
}

export function registerDatabaseTools(reg, client) {
  // ── Database hub (list_databases / get_database …; legacy database_frame_*) ─

  registerDatabaseTool(reg, {
    canonical: "list_databases",
    legacyFrameName: "list",
    description:
      "List database stores in awn-databases (group/collection/single — not records in data/).",
    schema: z.object({}),
    handler: () => client.get("/api/awn-databases")
  });

  registerDatabaseTool(reg, {
    canonical: "get_database",
    legacyFrameName: "get",
    description:
      "One database store: schema, records tree (MD or CSV). whole-file-csv → read_content/write_content (kind: database, slot: data, ref: main.csv).",
    schema: z.object({
      store: z.string().min(1).describe("Store relPath, e.g. taxonomies/tags, tasks")
    }),
    handler: ({ store }) => client.get("/api/awn-databases", { store })
  });

  const registerDatabaseSchema = z.object({
    kind: z
      .enum(["group", "collection", "single", "singleton"])
      .optional()
      .transform((value) => (value === "singleton" ? "single" : value)),
    slug: z.string().min(1).describe("Folder slug under awn-databases/, e.g. taxonomies/tags"),
    name: z.string().optional(),
    description: z.string().optional(),
    collectionType: z
      .enum(["md", "md-lite", "csv", "csv-files", "files"])
      .optional()
      .describe("Collection preset: md, md-lite (record-lite), csv/csv-files (record-csv), files"),
    collectionKind: z.enum(["records", "files"]).optional(),
    recordStorage: z.enum(["md", "csv", "csv-files"]).optional(),
    recordHierarchy: z.boolean().optional(),
    recordFileTypes: z.string().optional(),
    hierarchy: z.boolean().optional().describe("Alias for recordHierarchy"),
    withSampleRecord: z.boolean().optional(),
    indexExclude: z.boolean().optional(),
    indexExcludeRecord: z.boolean().optional(),
    indexExcludeSubtree: z.boolean().optional()
  });
  const registerDatabaseHandler = (payload) =>
    client.post("/api/awn-databases/stores", {
      ...payload,
      recordHierarchy: payload.recordHierarchy ?? payload.hierarchy
    });
  const registerDatabaseDescription =
    "Register database store hub (like register_channel): group, collection (MD/md-lite/CSV/files), or single. Adopts existing folder under awn-databases/ when present.";

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "register_database",
    legacy: "create_database",
    description: registerDatabaseDescription,
    schema: registerDatabaseSchema,
    handler: registerDatabaseHandler
  });
  reg(
    "database_frame_create",
    "Deprecated alias for register_database.",
    registerDatabaseSchema,
    registerDatabaseHandler
  );

  const updateDatabaseSchema = z
    .object({
      store: storePath,
      name: z.string().optional().describe("Maps to awn-name in manifest frontmatter"),
      description: z.string().optional().describe("Maps to awn-description"),
      body: z.string().optional().describe("Markdown body below frontmatter")
    })
    .refine((value) => value.name !== undefined || value.description !== undefined || value.body !== undefined, {
      message: "Provide name, description, and/or body"
    });

  reg(
    "update_database",
    "Update database manifest.md: awn-name, awn-description, and/or body (like update_channel). Schema → write_database_schema; arbitrary YAML → write_database_properties.",
    updateDatabaseSchema,
    (payload) => client.put("/api/awn-databases/stores", payload)
  );

  const readDatabasesIndexTocSchema = z.object({});
  const readDatabasesIndexTocHandler = () => client.get("/api/agent/awn-databases-index");
  const readDatabasesIndexTocDescription =
    "Quick TOC for all database stores: kind, group, path, title, description, recordCount (awn-databases/index.md).";

  registerTocTool(reg, {
    canonical: "read_databases_index_toc",
    legacy: "read_database_frame_index_toc",
    description: readDatabasesIndexTocDescription,
    schema: readDatabasesIndexTocSchema,
    handler: readDatabasesIndexTocHandler
  });

  const refreshDatabasesIndexTocSchema = z.object({
    overwrite: z
      .boolean()
      .optional()
      .describe("Replace existing index.md if present (default true). false → 409 when file exists.")
  });
  const refreshDatabasesIndexTocDescription =
    "Refresh awn-databases/index.md from list_databases. overwrite=false skips if file exists.";
  const refreshDatabasesIndexTocHandler = ({ overwrite }) =>
    client.post("/api/agent/awn-databases-index", {
      ...(overwrite === false ? { overwrite: false } : {})
    });

  registerTocTool(reg, {
    canonical: "refresh_databases_index_toc",
    legacy: "refresh_database_frame_index_toc",
    description: refreshDatabasesIndexTocDescription,
    schema: refreshDatabasesIndexTocSchema,
    handler: refreshDatabasesIndexTocHandler
  });

  registerDatabaseTool(reg, {
    canonical: "read_database_schema",
    legacyFrameName: "read_schema",
    description:
      "Read custom field overrides from store schema.yml (instance layer only). Base: get_type(record|record-lite|record-csv). User fields without awn- prefix.",
    schema: z.object({
      store: z.string().min(1).describe("Store relPath, e.g. tasks, taxonomies/tags")
    }),
    handler: ({ store }) => client.get("/api/awn-databases/store-schema", { store })
  });

  const writeSchemaDescription =
    "Write custom field overrides to store schema.yml. Base from get_type(record|record-lite|record-csv|category|sidecar). Pass awnSchema or raw YAML.";
  const writeSchemaSchema = z.object({
    store: storePath,
    content: z.string().optional().describe("Raw schema.yml YAML"),
    awnSchema: z.record(z.any()).optional().describe("Structured awn_schema blocks (record/category/sidecar)"),
    fields: z.record(z.any()).optional(),
    tabs: z.record(z.any()).optional()
  });
  const writeSchemaHandler = ({ store, content, awnSchema, fields, tabs }) =>
    client.post("/api/awn-databases/store-schema", {
      store,
      ...(content !== undefined ? { content } : {}),
      ...(awnSchema ? { awnSchema } : {}),
      ...(fields ? { fields } : {}),
      ...(tabs ? { tabs } : {})
    });
  registerDatabaseTool(reg, {
    canonical: "write_database_schema",
    legacyFrameName: "write_schema",
    description: writeSchemaDescription,
    schema: writeSchemaSchema,
    handler: writeSchemaHandler
  });

  registerDatabaseTool(reg, {
    canonical: "read_database_properties",
    legacyFrameName: "read_properties",
    description: "Read full YAML frontmatter of database manifest.md.",
    schema: z.object({ store: storePath }),
    handler: ({ store }) => client.get("/api/awn-databases/store-properties", { store })
  });

  registerDatabaseTool(reg, {
    canonical: "write_database_properties",
    legacyFrameName: "write_properties",
    description:
      "Patch YAML frontmatter of database manifest.md. Send only keys to change — existing keys on disk are preserved.",
    schema: z.object({
      store: storePath,
      content: z.string().describe("YAML patch, e.g. awn-name: Задачи")
    }),
    handler: ({ store, content }) => client.post("/api/awn-databases/store-properties", { store, content })
  });

  registerDatabaseTool(reg, {
    canonical: "read_database_property",
    legacyFrameName: "read_property",
    description: "Read one property from database manifest.md (e.g. awn-name, awn-description).",
    schema: z.object({
      store: storePath,
      key: z.string().min(1)
    }),
    handler: ({ store, key }) => client.get("/api/awn-databases/store-properties", { store, key })
  });

  registerDatabaseTool(reg, {
    canonical: "write_database_property",
    legacyFrameName: "write_property",
    description: "Set one property on database manifest.md. Other keys preserved.",
    schema: z.object({
      store: storePath,
      key: z.string().min(1),
      value: z.string()
    }),
    handler: ({ store, key, value }) => client.post("/api/awn-databases/store-properties", { store, key, value })
  });

  registerDatabaseTool(reg, {
    canonical: "delete_database",
    legacyFrameName: "delete",
    description: "Delete database store folder (group must be empty).",
    schema: z.object({
      store: storePath
    }),
    handler: ({ store }) => client.delete("/api/awn-databases/stores", { store })
  });

  registerDatabaseTool(reg, {
    canonical: "rename_database",
    legacyFrameName: "rename",
    description: "Rename/move database store folder under awn-databases/.",
    schema: z.object({
      store: storePath,
      slug: z.string().min(1).describe("New store relPath slug")
    }),
    handler: ({ store, slug }) => client.post("/api/awn-databases/stores/rename", { store, slug })
  });
}

/** @deprecated Use registerDatabaseTools */
export const registerIblockTools = registerDatabaseTools;
