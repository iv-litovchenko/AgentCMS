import { z } from "zod";
import { registerTocTool } from "./register-toc-tool.js";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const storePath = z
  .string()
  .min(1)
  .describe("Store relPath under awn-databases/, e.g. tasks, taxonomies/tags, agent-registry/agents");

/** Canonical database_* / databases_* plus verb-first and database_frame_* legacy aliases. */
function registerDatabaseTool(reg, { canonical, verbLegacy, legacyFrameName, description, schema, handler }) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical,
    legacy: verbLegacy && verbLegacy !== canonical ? verbLegacy : null,
    description,
    schema,
    handler
  });
  if (legacyFrameName) {
    const frameName = `database_frame_${legacyFrameName}`;
    if (frameName !== canonical && frameName !== verbLegacy) {
      reg(frameName, `Deprecated alias for ${canonical}.`, schema, handler);
    }
  }
}

export function registerDatabaseTools(reg, client) {
  // ── Database hub (databases_list / database_get …; legacy list_databases, database_frame_*) ─

  registerDatabaseTool(reg, {
    canonical: "databases_list",
    verbLegacy: "list_databases",
    legacyFrameName: "list",
    description:
      "List database stores in awn-databases (group/collection/single — not records in data/).",
    schema: z.object({}),
    handler: () => client.get("/api/awn-databases")
  });

  registerDatabaseTool(reg, {
    canonical: "database_get",
    verbLegacy: "get_database",
    legacyFrameName: "get",
    description:
      "One database store: schema, records tree (MD or CSV). whole-file-csv → content_read/content_write (kind: database, slot: data, ref: main.csv).",
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
    "Register database store hub (like channel_register): group, collection (MD/md-lite/CSV/files), or single. Adopts existing folder under awn-databases/ when present.";

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "database_register",
    legacy: "register_database",
    description: registerDatabaseDescription,
    schema: registerDatabaseSchema,
    handler: registerDatabaseHandler
  });
  reg("create_database", "Deprecated alias for database_register.", registerDatabaseSchema, registerDatabaseHandler);
  reg(
    "database_frame_create",
    "Deprecated alias for database_register.",
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

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "database_update",
    legacy: "update_database",
    description:
      "Update database manifest.md: awn-name, awn-description, and/or body (like channel_update). Schema → database_schema_write; arbitrary YAML → database_properties_write.",
    schema: updateDatabaseSchema,
    handler: (payload) => client.put("/api/awn-databases/stores", payload)
  });

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
    "Refresh awn-databases/index.md from databases_list. overwrite=false skips if file exists.";
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
    canonical: "database_schema_read",
    verbLegacy: "read_database_schema",
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
    canonical: "database_schema_write",
    verbLegacy: "write_database_schema",
    legacyFrameName: "write_schema",
    description: writeSchemaDescription,
    schema: writeSchemaSchema,
    handler: writeSchemaHandler
  });

  registerDatabaseTool(reg, {
    canonical: "database_properties_read",
    verbLegacy: "read_database_properties",
    legacyFrameName: "read_properties",
    description: "Read full YAML frontmatter of database manifest.md.",
    schema: z.object({ store: storePath }),
    handler: ({ store }) => client.get("/api/awn-databases/store-properties", { store })
  });

  registerDatabaseTool(reg, {
    canonical: "database_properties_write",
    verbLegacy: "write_database_properties",
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
    canonical: "database_property_read",
    verbLegacy: "read_database_property",
    legacyFrameName: "read_property",
    description: "Read one property from database manifest.md (e.g. awn-name, awn-description).",
    schema: z.object({
      store: storePath,
      key: z.string().min(1)
    }),
    handler: ({ store, key }) => client.get("/api/awn-databases/store-properties", { store, key })
  });

  registerDatabaseTool(reg, {
    canonical: "database_property_write",
    verbLegacy: "write_database_property",
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
    canonical: "database_delete",
    verbLegacy: "delete_database",
    legacyFrameName: "delete",
    description: "Delete database store folder (group must be empty).",
    schema: z.object({
      store: storePath
    }),
    handler: ({ store }) => client.delete("/api/awn-databases/stores", { store })
  });

  registerDatabaseTool(reg, {
    canonical: "database_rename",
    verbLegacy: "rename_database",
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
