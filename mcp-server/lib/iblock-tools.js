import { z } from "zod";
import { registerTocTool } from "./register-toc-tool.js";

const storePath = z
  .string()
  .min(1)
  .describe("Store relPath under awn-databases/, e.g. tasks, taxonomies/tags, agent-registry/agents");

const recordRef = z
  .string()
  .optional()
  .describe(
    "Record id or rel path (e.g. 1, section/2). Omit for single stores (main.md) and for CSV table stores (main.csv is one file)."
  );

function registerFrameTool(reg, { name, description, schema, handler }) {
  reg(`database_frame_${name}`, description, schema, handler);
}

function registerElementTool(reg, name, description, schema, handler) {
  reg(`database_element_${name}`, description, schema, handler);
}

export function registerDatabaseTools(reg, client) {
  // ── Database frame (database_frame_*) ───────────────────────────────────────

  registerFrameTool(reg, {
    name: "list",
    description: "List database frames in awn-databases (group/collection/single only — not element records).",
    schema: z.object({}),
    handler: () => client.get("/api/awn-databases")
  });

  registerFrameTool(reg, {
    name: "get",
    description:
      "One database frame with schema, records and tree (MD or CSV). If recordEditMode is whole-file-csv, edit table via database_element_read_body/write_body (full main.csv).",
    schema: z.object({
      store: z.string().min(1).describe("Store relPath, e.g. taxonomies/tags, tasks")
    }),
    handler: ({ store }) => client.get("/api/awn-databases", { store })
  });

  registerFrameTool(reg, {
    name: "create",
    description:
      "Create database frame: group, collection (MD/md-lite/CSV/files), or single. csv/csv-files use record-csv schema (minimal awn-* columns). md-lite → record-lite. Custom schema fields without awn- prefix.",
    schema: z.object({
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
    }),
    handler: (payload) =>
      client.post("/api/awn-databases/stores", {
        ...payload,
        recordHierarchy: payload.recordHierarchy ?? payload.hierarchy
      })
  });

  const readDatabasesIndexTocSchema = z.object({});
  const readDatabasesIndexTocHandler = () => client.get("/api/agent/awn-databases-index");
  const readDatabasesIndexTocDescription =
    "Quick TOC for all database frames: kind, group, path, title, description, recordCount (awn-databases/index.md).";

  registerTocTool(reg, {
    canonical: "read_database_frame_index_toc",
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
    "Refresh awn-databases/index.md from database_frame_list. overwrite=false skips if file exists.";
  const refreshDatabasesIndexTocHandler = ({ overwrite }) =>
    client.post("/api/agent/awn-databases-index", {
      ...(overwrite === false ? { overwrite: false } : {})
    });

  registerTocTool(reg, {
    canonical: "refresh_database_frame_index_toc",
    description: refreshDatabasesIndexTocDescription,
    schema: refreshDatabasesIndexTocSchema,
    handler: refreshDatabasesIndexTocHandler
  });

  registerFrameTool(reg, {
    name: "read_schema",
    description:
      "Read custom field overrides from store schema.yml (instance layer only). Base: get_type(record|record-lite|record-csv). User fields in schema.yml must NOT use awn- prefix. Check awn_schema.record.extends.",
    schema: z.object({
      store: z.string().min(1).describe("Store relPath, e.g. tasks, taxonomies/tags")
    }),
    handler: ({ store }) => client.get("/api/awn-databases/store-schema", { store })
  });

  const writeSchemaDescription =
    "Write custom field overrides to store schema.yml. Base from get_type(record|record-lite|record-csv|category|sidecar). User column names without awn- prefix. Pass awnSchema or raw YAML.";
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
  registerFrameTool(reg, {
    name: "write_schema",
    description: writeSchemaDescription,
    schema: writeSchemaSchema,
    handler: writeSchemaHandler
  });

  registerFrameTool(reg, {
    name: "read_properties",
    description: "Read full YAML frontmatter of database manifest.md.",
    schema: z.object({ store: storePath }),
    handler: ({ store }) => client.get("/api/awn-databases/store-properties", { store })
  });

  registerFrameTool(reg, {
    name: "write_properties",
    description:
      "Patch YAML frontmatter of database manifest.md. Send only keys to change — existing keys on disk are preserved.",
    schema: z.object({
      store: storePath,
      content: z.string().describe("YAML patch, e.g. awn-name: Задачи")
    }),
    handler: ({ store, content }) => client.post("/api/awn-databases/store-properties", { store, content })
  });

  registerFrameTool(reg, {
    name: "read_property",
    description: "Read one property from database manifest.md (e.g. awn-name, awn-description).",
    schema: z.object({
      store: storePath,
      key: z.string().min(1)
    }),
    handler: ({ store, key }) => client.get("/api/awn-databases/store-properties", { store, key })
  });

  registerFrameTool(reg, {
    name: "write_property",
    description: "Set one property on database manifest.md. Other keys preserved.",
    schema: z.object({
      store: storePath,
      key: z.string().min(1),
      value: z.string()
    }),
    handler: ({ store, key, value }) => client.post("/api/awn-databases/store-properties", { store, key, value })
  });

  registerFrameTool(reg, {
    name: "delete",
    description: "Delete database frame folder (group must be empty).",
    schema: z.object({
      store: storePath
    }),
    handler: ({ store }) => client.delete("/api/awn-databases/stores", { store })
  });

  registerFrameTool(reg, {
    name: "rename",
    description: "Rename/move database frame folder under awn-databases/.",
    schema: z.object({
      store: storePath,
      slug: z.string().min(1).describe("New store relPath slug")
    }),
    handler: ({ store, slug }) => client.post("/api/awn-databases/stores/rename", { store, slug })
  });

  // ── Database elements (database_element_*) ──────────────────────────────────

  registerElementTool(
    reg,
    "list",
    "Lightweight list of records/sections in a store (includes fileName and fileExtension; no full schema payload).",
    z.object({
      store: storePath
    }),
    ({ store }) => client.get("/api/awn-databases/records", { store })
  );

  registerElementTool(
    reg,
    "create",
    "Add element to database: record (*.md; md-lite stores get minimal frontmatter), plain-text file via fileExtension (.py, .html, …), CSV row, or section folder (isSection=true).",
    z.object({
      store: z.string().min(1).describe("Store relPath, e.g. taxonomies/tags"),
      name: z.string().optional().describe("Display name (awn-name)"),
      slug: z.string().optional().describe("File/folder slug (id-mode slug stores)"),
      id: z.string().optional().describe("Alias for slug"),
      title: z.string().optional().describe("Deprecated alias for name"),
      parent: z.string().optional(),
      body: z.string().optional().describe("Initial file body for .md or plain-text records"),
      fileExtension: z
        .string()
        .optional()
        .describe("Plain-text extension for non-markdown records: .py, .html, .json, …"),
      isSection: z.boolean().optional().describe("Create hierarchy section folder with manifest.md")
    }),
    (payload) =>
      client.post("/api/awn-databases/records", {
        store: payload.store,
        name: payload.name || payload.title,
        slug: payload.slug || payload.id,
        id: payload.id || payload.slug,
        title: payload.title || payload.name,
        parent: payload.parent,
        body: payload.body,
        fileExtension: payload.fileExtension,
        extension: payload.fileExtension,
        isSection: Boolean(payload.isSection)
      })
  );

  registerElementTool(
    reg,
    "read_body",
    "Read database element body. For .md: markdown below frontmatter. For CSV collection stores: entire main.csv (omit record). For .py/.html/…: full file text.",
    z.object({
      store: storePath,
      record: recordRef
    }),
    ({ store, record }) =>
      client.get("/api/awn-databases/record-body", {
        store,
        ...(record ? { record } : {})
      })
  );

  registerElementTool(
    reg,
    "write_body",
    "Write database element body. For .md frontmatter is preserved. For CSV collection stores: replace entire main.csv (omit record). For .py/.html/… overwrites file text.",
    z.object({
      store: storePath,
      record: recordRef,
      body: z.string()
    }),
    ({ store, record, body }) =>
      client.post("/api/awn-databases/record-body", {
        store,
        body,
        ...(record ? { record } : {})
      })
  );

  registerElementTool(
    reg,
    "delete",
    "Delete database element record or section folder.",
    z.object({
      store: storePath,
      record: z.string().min(1)
    }),
    ({ store, record }) => client.delete("/api/awn-databases/records", { store, record })
  );

  registerElementTool(
    reg,
    "rename",
    "Rename or move database element (slug and/or parent section).",
    z.object({
      store: storePath,
      record: z.string().min(1),
      slug: z.string().optional(),
      parent: z.string().optional().describe("Target parent section id, empty string for root")
    }),
    ({ store, record, slug, parent }) =>
      client.post("/api/awn-databases/records/rename", {
        store,
        record,
        ...(slug ? { slug } : {}),
        ...(parent !== undefined ? { parent } : {})
      })
  );

  registerElementTool(
    reg,
    "read_properties",
    "Read YAML frontmatter of a .md record ({id}.md or single main.md). Not for CSV table stores — use read_body (full main.csv).",
    z.object({
      store: storePath,
      record: recordRef
    }),
    ({ store, record }) =>
      client.get("/api/awn-databases/record-properties", {
        store,
        ...(record ? { record } : {})
      })
  );

  registerElementTool(
    reg,
    "write_properties",
    "Patch YAML frontmatter of a .md record. Not for CSV table stores — use write_body (full main.csv).",
    z.object({
      store: storePath,
      record: recordRef,
      content: z.string()
    }),
    ({ store, record, content }) =>
      client.post("/api/awn-databases/record-properties", {
        store,
        content,
        ...(record ? { record } : {})
      })
  );

  registerElementTool(
    reg,
    "read_property",
    "Read one property from database record.",
    z.object({
      store: storePath,
      record: recordRef,
      key: z.string().min(1)
    }),
    ({ store, record, key }) =>
      client.get("/api/awn-databases/record-properties", {
        store,
        key,
        ...(record ? { record } : {})
      })
  );

  registerElementTool(
    reg,
    "write_property",
    "Set one property on database record. Body and other keys preserved; awn-updated bumped when present.",
    z.object({
      store: storePath,
      record: recordRef,
      key: z.string().min(1),
      value: z.string()
    }),
    ({ store, record, key, value }) =>
      client.post("/api/awn-databases/record-properties", {
        store,
        key,
        value,
        ...(record ? { record } : {})
      })
  );
}

/** @deprecated Use registerDatabaseTools */
export const registerIblockTools = registerDatabaseTools;
