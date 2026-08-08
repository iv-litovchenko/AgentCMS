import { z } from "zod";

export function registerPageTools({ reg, client, pagePath }) {
  reg(
    "read_page_body",
    "Read manifest.md body (markdown below frontmatter).",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/file", { path })
  );

  reg(
    "write_page_body",
    "Save manifest.md body. Frontmatter on disk is preserved.",
    z.object({ path: pagePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/content", { path, content })
  );

  reg(
    "read_page_properties",
    "Read full YAML frontmatter from manifest.md.",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/file/properties", { path })
  );

  reg(
    "write_page_properties",
    "Patch YAML frontmatter on manifest.md. Send only keys to change — existing keys on disk are preserved (awn-create/update/version auto-stamped by server).",
    z.object({
      path: pagePath,
      content: z.string().describe("YAML patch, e.g. awn-status: closed")
    }),
    ({ path, content }) => client.post("/api/file/properties", { path, content })
  );

  reg(
    "read_page_property",
    "Read one frontmatter property from manifest.md (e.g. awn-name, awn-status).",
    z.object({
      path: pagePath,
      key: z.string().min(1).describe("Property key, e.g. awn-name")
    }),
    ({ path, key }) => client.get("/api/file/properties", { path, key })
  );

  reg(
    "write_page_property",
    "Set one frontmatter property on manifest.md. Other keys preserved; awn-update/version auto-stamped.",
    z.object({
      path: pagePath,
      key: z.string().min(1),
      value: z.string().describe("New value (empty string allowed)")
    }),
    ({ path, key, value }) => client.post("/api/file/properties", { path, key, value })
  );

  reg(
    "read_page_schema",
    "Read schema-mod.yml layers (workspace / area / topic — non-empty blocks only). Base type fields: get_type.",
    z.object({
      path: pagePath,
      target: z
        .string()
        .optional()
        .describe("Optional schema block id, e.g. topic, slot_memory — returns merged custom fields for one target"),
      mode: z
        .enum(["layers", "overlay", "full"])
        .optional()
        .describe("layers (default) = schema-mod layers only; full = legacy dump with baseTypes/merged")
    }),
    ({ path, target, mode }) =>
      client.get("/api/file/page-schema", {
        path,
        mode: mode || "layers",
        ...(target ? { target } : {})
      })
  );

  reg(
    "write_page_schema",
    "Save schema-mod.yml override. Pass YAML with awn_schema: { topic: { fields: … } } — only blocks you change. Response is slim (written blocks only).",
    z.object({ path: pagePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/page-schema", { path, content, responseMode: "layers" })
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
