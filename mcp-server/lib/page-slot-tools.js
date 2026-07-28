import { z } from "zod";

export function registerPageAndSlotTools({ reg, client, pagePath, extFile, storageSlotFolder, storageSlotFile }) {
  const externalSlotFolder = z
    .enum(["main", "inbox", "notes", "references", "artefacts", "repository", "scripts"])
    .describe(
      "External storage slot folder (storage-driver: external). main = multi-file memory; inbox, notes, references, …"
    );

  reg(
    "get_page_meta",
    "Page metadata (awn.page.* manifest): storage layers, preview, manifest info.",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/page/meta", { path })
  );

  reg(
    "read_page_description",
    "Read manifest.md body (page description).",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/file", { path })
  );

  reg(
    "write_page_description",
    "Save manifest.md body. Frontmatter on disk is preserved.",
    z.object({ path: pagePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/content", { path, content })
  );

  reg(
    "read_page_properties",
    "Read YAML frontmatter from manifest.md.",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/file/properties", { path })
  );

  reg(
    "write_page_properties",
    "Save YAML frontmatter to manifest.md.",
    z.object({ path: pagePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/properties", { path, content })
  );

  reg(
    "read_page_schema",
    "Read page field schema (schema.yml layer, awn_schema). Bound to page type and slot targets.",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/file/page-schema", { path })
  );

  reg(
    "write_page_schema",
    "Save page field schema. Pass content as YAML with an awn_schema: block (slot_memory, slot_inbox, sidecar, topic, …). Only awn_schema is written; awn_ui and awn_settings are untouched.",
    z.object({ path: pagePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/page-schema", { path, content })
  );

  reg(
    "read_page_config",
    "Read page configuration.yml (awn_ui, awn_settings). Use read_page_schema for awn_schema.",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/file/page-config", { path })
  );

  reg(
    "write_page_config",
    "Save page configuration.yml (awn_ui, awn_settings only).",
    z.object({ path: pagePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/page-config", { path, content })
  );

  reg(
    "create_page",
    "Create page: area (folder) or topic (file). displayName → awn-name; slug → folder on disk.",
    z
      .object({
        parentPath: z.string().optional(),
        type: z.enum(["folder", "file"]),
        name: z.string().min(1).optional(),
        displayName: z.string().min(1).optional(),
        title: z.string().optional(),
        slug: z.string().optional(),
        awnType: z.string().optional()
      })
      .refine((value) => Boolean(value.displayName || value.title || value.name || value.slug), {
        message: "Provide displayName, title, name, or slug"
      }),
    ({ parentPath, type, name, displayName, title, slug, awnType }) =>
      client.post("/api/page/create", {
        parentPath: parentPath || ".",
        type,
        name,
        displayName,
        title,
        slug,
        awnType
      })
  );

  reg(
    "delete_page",
    "Delete area, topic, or part folder.",
    z.object({ path: pagePath }),
    ({ path }) => client.delete("/api/file", { path })
  );

  reg(
    "rename_page",
    "Rename page. displayName → awn-name; slug → folder/filename on disk.",
    z
      .object({
        path: pagePath,
        displayName: z.string().min(1).optional(),
        slug: z.string().optional(),
        title: z.string().min(1).optional()
      })
      .refine((value) => Boolean(value.displayName || value.title), {
        message: "displayName or title is required"
      }),
    ({ path, displayName, slug, title }) =>
      client.post("/api/file/title", {
        path,
        displayName: displayName || undefined,
        slug: slug || undefined,
        title: title || displayName
      })
  );

  reg(
    "move_page",
    "Move area/topic page to another parent folder.",
    z.object({
      path: pagePath,
      parentPath: z.string().describe("Target parent folder path, e.g. awn-container/kollektsii or .")
    }),
    ({ path, parentPath }) => client.post("/api/page/move", { path, parentPath })
  );

  reg(
    "list_slot_records",
    "List typed records in an external storage slot (main, inbox, notes, references, …). Prefer over list_external_memory (main only).",
    z.object({
      path: pagePath,
      folder: externalSlotFolder
    }),
    async ({ path, folder }) => {
      if (folder === "main") {
        return client.get("/api/external/files", { path });
      }
      return client.get("/api/folder/view", { path, folder });
    }
  );

  reg(
    "read_slot_record",
    "Read one .md record from an external slot.",
    z.object({
      path: pagePath,
      folder: externalSlotFolder,
      file: extFile
    }),
    async ({ path, folder, file }) => {
      if (folder === "main") {
        return client.get("/api/external/file", { path, file });
      }
      return client.get("/api/storage/markdown", { path, folder, file });
    }
  );

  reg(
    "write_slot_record",
    "Save one .md record in an external slot.",
    z.object({
      path: pagePath,
      folder: externalSlotFolder,
      file: extFile,
      content: z.string()
    }),
    async ({ path, folder, file, content }) => {
      if (folder === "main") {
        return client.post("/api/external/file", { path, file, content });
      }
      return client.post("/api/storage/markdown", { path, folder, file, content });
    }
  );

  reg(
    "create_slot_record",
    "Create typed awn.content.record in any external slot (main, inbox, references, notes, …). Prefer over create_external_memory.",
    z.object({
      path: pagePath,
      folder: externalSlotFolder,
      title: z.string().optional(),
      displayName: z.string().optional(),
      slug: z.string().optional(),
      parent: z.string().optional(),
      body: z.string().optional(),
      fileMask: z.string().optional(),
      fields: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
      source: z.string().optional(),
      author: z.string().optional(),
      status: z.string().optional()
    }),
    ({ path, folder, title, displayName, slug, parent, body, fileMask, fields, source, author, status }) =>
      client.post("/api/storage/file/create", {
        path,
        folder,
        title: title || displayName,
        displayName: displayName || title,
        slug,
        parent,
        body,
        fileMask,
        mask: fileMask,
        fields,
        source,
        author,
        status
      })
  );

  reg(
    "create_slot_section",
    "Create typed section (awn.content.record.category) inside an external slot folder.",
    z.object({
      path: pagePath,
      folder: externalSlotFolder,
      title: z.string().min(1),
      displayName: z.string().optional(),
      slug: z.string().optional(),
      parent: z.string().optional()
    }),
    ({ path, folder, title, displayName, slug, parent }) =>
      client.post("/api/storage/section/create", {
        path,
        folder,
        title,
        displayName: displayName || title,
        slug,
        parent
      })
  );

  reg(
    "read_internal_slot",
    "Read internal (single-file) slot: main.md, main.csv, or todo.md bundle.",
    z.object({
      path: pagePath,
      slot: z.enum(["main-single", "main-single-csv", "todo-single"]).describe("Internal storage-driver slot")
    }),
    async ({ path, slot }) => {
      if (slot === "main-single-csv") return client.get("/api/memory/tabular", { path });
      if (slot === "todo-single") return client.get("/api/todo", { path });
      return client.get("/api/memory/internal", { path });
    }
  );

  reg(
    "write_internal_slot",
    "Write internal (single-file) slot: main.md, main.csv, or todo.md bundle.",
    z.object({
      path: pagePath,
      slot: z.enum(["main-single", "main-single-csv", "todo-single"]),
      content: z.string(),
      file: z.string().optional().describe("Optional CSV file name for main-single-csv")
    }),
    async ({ path, slot, content, file }) => {
      if (slot === "main-single-csv") return client.post("/api/memory/tabular", { path, content, file });
      if (slot === "todo-single") return client.post("/api/todo", { path, content });
      return client.post("/api/memory/internal", { path, content });
    }
  );

  void storageSlotFolder;
  void storageSlotFile;
}
