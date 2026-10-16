import { z } from "zod";

/** folder|area|awn.hub.area → folder; file|topic|awn.hub.topic* → file + awnType */
export function normalizeCreatePageArgs(input = {}) {
  const explicitAwn = input.awnType ? String(input.awnType).trim() : "";
  const raw = String(input.type || explicitAwn || "").trim();
  if (!raw) {
    throw new Error("type is required (folder|area|awn.hub.area or file|topic|awn.hub.topic)");
  }

  const lower = raw.toLowerCase();
  if (
    lower === "folder" ||
    lower === "area" ||
    lower === "awn.page.area" ||
    lower === "awn.hub.area" ||
    lower === "manifest"
  ) {
    return {
      ...input,
      type: "folder",
      awnType: explicitAwn || undefined
    };
  }

  if (
    lower === "file" ||
    lower === "topic" ||
    lower === "topic-manifest" ||
    lower.startsWith("awn.page.topic") ||
    lower.startsWith("awn.hub.topic")
  ) {
    const awnType =
      raw.startsWith("awn.page.") || raw.startsWith("awn.hub.")
        ? raw
        : explicitAwn || "awn.hub.topic";
    return { ...input, type: "file", awnType };
  }

  throw new Error(
    `Invalid type "${raw}". Use folder|area|awn.hub.area or file|topic|awn.hub.topic`
  );
}

export function registerPageTools({ reg, client, pagePath }) {
  reg(
    "read_topic_body",
    "Read topic manifest.md body (markdown below frontmatter).",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/file", { path })
  );

  reg(
    "write_topic_body",
    "Save topic manifest.md body. Frontmatter on disk is preserved.",
    z.object({ path: pagePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/content", { path, content })
  );

  reg(
    "read_topic_properties",
    "Read full YAML frontmatter from topic manifest.md.",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/file/properties", { path })
  );

  reg(
    "write_topic_properties",
    "Patch YAML frontmatter on manifest.md. Send only keys to change — existing keys on disk are preserved (awn-create/update/version auto-stamped by server).",
    z.object({
      path: pagePath,
      content: z.string().describe("YAML patch, e.g. awn-status: closed")
    }),
    ({ path, content }) => client.post("/api/file/properties", { path, content })
  );

  reg(
    "read_topic_property",
    "Read one frontmatter property from manifest.md (e.g. awn-name, awn-status).",
    z.object({
      path: pagePath,
      key: z.string().min(1).describe("Property key, e.g. awn-name")
    }),
    ({ path, key }) => client.get("/api/file/properties", { path, key })
  );

  reg(
    "write_topic_property",
    "Set one frontmatter property on manifest.md. Other keys preserved; awn-update/version auto-stamped.",
    z.object({
      path: pagePath,
      key: z.string().min(1),
      value: z.string().describe("New value (empty string allowed)")
    }),
    ({ path, key, value }) => client.post("/api/file/properties", { path, key, value })
  );

  reg(
    "read_topic_schema",
    "Read schema.yml layers (workspace / area / topic — non-empty blocks only). Base type fields: get_type.",
    z.object({
      path: pagePath,
      target: z
        .string()
        .optional()
        .describe("Optional schema block id, e.g. topic, slot_memory — returns merged custom fields for one target"),
      mode: z
        .enum(["layers", "overlay", "full"])
        .optional()
        .describe("layers (default) = schema layers only; full = legacy dump with baseTypes/merged")
    }),
    ({ path, target, mode }) =>
      client.get("/api/file/page-schema", {
        path,
        mode: mode || "layers",
        ...(target ? { target } : {})
      })
  );

  reg(
    "write_topic_schema",
    "Save schema.yml override. Pass YAML with awn_schema: { topic: { fields: … } } — only blocks you change. Response is slim (written blocks only).",
    z.object({ path: pagePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/page-schema", { path, content, responseMode: "layers" })
  );

  reg(
    "read_topic_config",
    "Read topic config.yml (awn_settings, awn_ui). Field definitions live in schema.yml — use read_topic_schema.",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/file/page-config", { path })
  );

  reg(
    "write_topic_config",
    "Save topic config.yml (awn_settings, awn_ui). Empty content deletes the file. Never put awn_schema here.",
    z.object({ path: pagePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/page-config", { path, content })
  );

  reg(
    "topic_exists",
    "Check whether topic manifest.md exists. Accepts folder path — appends manifest.md automatically.",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/page/exists", { path })
  );

  reg(
    "get_topic_meta",
    "Lightweight topic metadata: manifest stat, folder stat, props hint — no body.",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/page/meta", { path })
  );

  reg(
    "read_topic_env",
    "Read topic .env (secrets, API keys). Path = manifest.md of the topic.",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/page/env", { path })
  );

  reg(
    "write_topic_env",
    "Write topic .env file.",
    z.object({ path: pagePath, content: z.string() }),
    ({ path, content }) => client.post("/api/page/env", { path, content })
  );

  const createTopicSchema = z
    .object({
      parentPath: z.string().optional(),
      type: z
        .string()
        .min(1)
        .describe("folder | area | awn.hub.area | file | topic | awn.hub.topic"),
      name: z.string().min(1).optional(),
      displayName: z.string().min(1).optional(),
      title: z.string().optional(),
      slug: z.string().optional(),
      awnType: z.string().optional().describe("Optional awn-type override; usually inferred from type")
    })
    .refine((value) => Boolean(value.displayName || value.title || value.name || value.slug), {
      message: "Provide displayName, title, name, or slug"
    });

  const createTopicHandler = (args) => {
    const payload = normalizeCreatePageArgs(args);
    return client.post("/api/page/create", {
      parentPath: payload.parentPath || ".",
      type: payload.type,
      name: payload.name,
      displayName: payload.displayName,
      title: payload.title,
      slug: payload.slug,
      awnType: payload.awnType
    });
  };

  reg(
    "create_topic",
    "Create area or topic. type: area → folder+manifest (awn.hub.area); topic → file+manifest (awn.hub.topic). Aliases: folder|area|file|topic or full awn-type id.",
    createTopicSchema,
    createTopicHandler
  );

  reg(
    "delete_topic",
    "Delete area, topic, or part folder. When platform confirm-delete is enabled, pass confirm=true.",
    z.object({
      path: pagePath,
      confirm: z.boolean().optional().describe("Required true when platform confirm-delete is enabled")
    }),
    ({ path }) => client.delete("/api/file", { path })
  );

  const renameTopicSchema = z
    .object({
      path: pagePath,
      displayName: z.string().min(1).optional(),
      slug: z.string().optional(),
      title: z.string().min(1).optional()
    })
    .refine((value) => Boolean(value.displayName || value.title), {
      message: "displayName or title is required"
    });

  reg(
    "rename_topic",
    "Rename topic or area. displayName → awn-name; slug → folder/filename on disk.",
    renameTopicSchema,
    ({ path, displayName, slug, title }) =>
      client.post("/api/file/title", {
        path,
        displayName: displayName || undefined,
        slug: slug || undefined,
        title: title || displayName
      })
  );

  reg(
    "move_topic",
    "Move area/topic to another parent folder.",
    z.object({
      path: pagePath,
      parentPath: z.string().describe("Target parent folder path, e.g. awn-container/kollektsii or .")
    }),
    ({ path, parentPath }) => client.post("/api/page/move", { path, parentPath })
  );
}
