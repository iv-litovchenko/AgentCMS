import { z } from "zod";

const storePath = z
  .string()
  .min(1)
  .describe("Store relPath under awn-databases/, e.g. tasks, taxonomies/tags, agent-registry/agents");

const recordRef = z
  .string()
  .optional()
  .describe("Record id or rel path (e.g. 1, section/2). Omit for single stores (main.md).");

const deprecatedPrefix = "[deprecated] Use iblock_frame_";

function registerFrameTool(reg, client, { legacyName, name, description, schema, handler }) {
  const frameName = `iblock_frame_${name}`;
  reg(frameName, description, schema, handler);
  if (legacyName) {
    reg(legacyName, `${deprecatedPrefix}${name}. ${description}`, schema, handler);
  }
}

export function registerIblockTools(reg, client) {
  // ── Infoblock frame (iblock_frame_*) ───────────────────────────────────────

  registerFrameTool(reg, client, {
    legacyName: "iblock_list",
    name: "list",
    description:
      "List infoblock frames in awn-databases (group/collection/single only — not element records).",
    schema: z.object({}),
    handler: () => client.get("/api/awn-databases")
  });

  registerFrameTool(reg, client, {
    legacyName: "iblock_get",
    name: "get",
    description: "One infoblock frame with schema, records and tree (MD or CSV).",
    schema: z.object({
      store: z.string().min(1).describe("Store relPath, e.g. taxonomies/tags, tasks")
    }),
    handler: ({ store }) => client.get("/api/awn-databases", { store })
  });

  registerFrameTool(reg, client, {
    legacyName: "iblock_create",
    name: "create",
    description:
      "Create infoblock frame: group, collection (MD/CSV/files), or single. Uses frame type defaults from awn.infoblock.frame.*.",
    schema: z.object({
      kind: z
        .enum(["group", "collection", "single", "singleton"])
        .optional()
        .transform((value) => (value === "singleton" ? "single" : value)),
      slug: z.string().min(1).describe("Folder slug under awn-databases/, e.g. taxonomies/tags"),
      name: z.string().optional(),
      description: z.string().optional(),
      collectionKind: z.enum(["records", "files"]).optional(),
      recordStorage: z.enum(["md", "csv"]).optional(),
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

  registerFrameTool(reg, client, {
    legacyName: "iblock_read_index",
    name: "read_index",
    description:
      "Quick TOC for all infoblock frames: kind, group, path, title, description, recordCount (awn-databases/index.md).",
    schema: z.object({}),
    handler: () => client.get("/api/agent/awn-databases-index")
  });

  registerFrameTool(reg, client, {
    legacyName: "iblock_refresh_index",
    name: "refresh_index",
    description:
      "Refresh awn-databases/index.md from iblock_frame_list. overwrite=false skips if file exists.",
    schema: z.object({
      overwrite: z
        .boolean()
        .optional()
        .describe("Replace existing index.md if present (default true). false → 409 when file exists.")
    }),
    handler: ({ overwrite }) =>
      client.post("/api/agent/awn-databases-index", {
        ...(overwrite === false ? { overwrite: false } : {})
      })
  });

  registerFrameTool(reg, client, {
    legacyName: "iblock_read_schema",
    name: "read_schema",
    description:
      "Read custom field overrides from store schema.yml (instance layer only). Base element fields: get_type({ id: \"awn.infoblock.element.record\" }) (or category/sidecar).",
    schema: z.object({
      store: z.string().min(1).describe("Store relPath, e.g. tasks, taxonomies/tags")
    }),
    handler: ({ store }) => client.get("/api/awn-databases/store-schema", { store })
  });

  const writeSchemaDescription =
    "Write custom field overrides to store schema.yml. Base fields come from get_type(awn.infoblock.element.*); pass awnSchema or raw YAML content.";
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
  reg("iblock_frame_write_schema", writeSchemaDescription, writeSchemaSchema, writeSchemaHandler);
  reg(
    "iblock_write_schema",
    `${deprecatedPrefix}write_schema. ${writeSchemaDescription}`,
    writeSchemaSchema,
    writeSchemaHandler
  );

  registerFrameTool(reg, client, {
    legacyName: "iblock_read_properties",
    name: "read_properties",
    description: "Read full YAML frontmatter of infoblock manifest.md.",
    schema: z.object({ store: storePath }),
    handler: ({ store }) => client.get("/api/awn-databases/store-properties", { store })
  });

  registerFrameTool(reg, client, {
    legacyName: "iblock_write_properties",
    name: "write_properties",
    description:
      "Patch YAML frontmatter of infoblock manifest.md. Send only keys to change — existing keys on disk are preserved.",
    schema: z.object({
      store: storePath,
      content: z.string().describe("YAML patch, e.g. awn-name: Задачи")
    }),
    handler: ({ store, content }) => client.post("/api/awn-databases/store-properties", { store, content })
  });

  registerFrameTool(reg, client, {
    legacyName: "iblock_read_property",
    name: "read_property",
    description: "Read one property from infoblock manifest.md (e.g. awn-name, awn-description).",
    schema: z.object({
      store: storePath,
      key: z.string().min(1)
    }),
    handler: ({ store, key }) => client.get("/api/awn-databases/store-properties", { store, key })
  });

  registerFrameTool(reg, client, {
    legacyName: "iblock_write_property",
    name: "write_property",
    description: "Set one property on infoblock manifest.md. Other keys preserved.",
    schema: z.object({
      store: storePath,
      key: z.string().min(1),
      value: z.string()
    }),
    handler: ({ store, key, value }) => client.post("/api/awn-databases/store-properties", { store, key, value })
  });

  reg(
    "iblock_frame_delete",
    "Delete infoblock frame folder (group must be empty).",
    z.object({
      store: storePath
    }),
    ({ store }) => client.delete("/api/awn-databases/stores", { store })
  );

  reg(
    "iblock_frame_rename",
    "Rename/move infoblock frame folder under awn-databases/.",
    z.object({
      store: storePath,
      slug: z.string().min(1).describe("New store relPath slug")
    }),
    ({ store, slug }) => client.post("/api/awn-databases/stores/rename", { store, slug })
  );

  // ── Infoblock content / elements (iblock_content_*) ───────────────────────

  reg(
    "iblock_content_list",
    "Lightweight list of records/sections in a store (includes fileName and fileExtension; no full schema payload).",
    z.object({
      store: storePath
    }),
    ({ store }) => client.get("/api/awn-databases/records", { store })
  );

  reg(
    "iblock_content_create",
    "Add element to infoblock: record (*.md), plain-text file via fileExtension (.py, .html, …), CSV row, or section folder (isSection=true).",
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

  reg(
    "iblock_content_read_body",
    "Read infoblock element body. For .md: markdown below frontmatter. For .py/.html/…: full file text.",
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

  reg(
    "iblock_content_write_body",
    "Write infoblock element body. For .md frontmatter is preserved; for .py/.html/… overwrites file text.",
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

  reg(
    "iblock_content_delete",
    "Delete infoblock element record or section folder.",
    z.object({
      store: storePath,
      record: z.string().min(1)
    }),
    ({ store, record }) => client.delete("/api/awn-databases/records", { store, record })
  );

  reg(
    "iblock_content_rename",
    "Rename or move infoblock element (slug and/or parent section).",
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

  reg(
    "iblock_content_read_properties",
    "Read full YAML frontmatter of infoblock record ({id}.md or single main.md).",
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

  reg(
    "iblock_content_write_properties",
    "Patch YAML frontmatter of infoblock record. Send only keys to change — body and other keys preserved; awn-updated bumped when present.",
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

  reg(
    "iblock_content_read_property",
    "Read one property from infoblock record.",
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

  reg(
    "iblock_content_write_property",
    "Set one property on infoblock record. Body and other keys preserved; awn-updated bumped when present.",
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
