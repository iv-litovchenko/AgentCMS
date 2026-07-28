import { z } from "zod";

export function registerPageTools({ reg, client, pagePath }) {
  reg(
    "get_page_meta",
    "Page metadata (awn.page.* manifest): storage layers, preview, manifest info.",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/page/meta", { path })
  );

  reg(
    "page_exists",
    "Check whether a page manifest exists at path (no body read).",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/page/exists", { path })
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
    "read_page_env",
    "Read .env at page root (topic container).",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/env", { path })
  );

  reg(
    "write_page_env",
    "Save .env at page root.",
    z.object({ path: pagePath, content: z.string() }),
    ({ path, content }) => client.post("/api/env", { path, content })
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
}
