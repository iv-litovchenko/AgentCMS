import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

/** folder|area|awn.hub.topic.area → folder; file|topic|awn.hub.topic* → file + awnType */
export function normalizeCreatePageArgs(input = {}) {
  const explicitAwn = input.awnType ? String(input.awnType).trim() : "";
  const raw = String(input.type || explicitAwn || "").trim();
  if (!raw) {
    throw new Error("type is required (folder|area|awn.hub.topic.area or file|topic|awn.hub.topic)");
  }

  const lower = raw.toLowerCase();
  if (
    lower === "folder" ||
    lower === "area" ||
    lower === "awn.page.area" ||
    lower === "awn.hub.topic.area" ||
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
    `Invalid type "${raw}". Use folder|area|awn.hub.topic.area or file|topic|awn.hub.topic`
  );
}

export function registerPageTools({ reg, client, pagePath }) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_get",
    legacy: "get_topic",
    description:
      "One topic/area/ws hub card: manifest properties + body (like channel_get). Fine-grained: topic_schema_read, topic_config_read, list_slots + *_content_*.",
    schema: z.object({ path: pagePath }),
    handler: ({ path }) => client.get("/api/agent/topic", { path })
  });

  const topicSlotsTemplateSchema = z.enum(["standard", "flexible", "minimal", "none"]);

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_slots_template_get",
    legacy: "get_topic_slots_template",
    description:
      "Read awn-slots-template for a topic/area manifest (standard | flexible | minimal | none). Legacy awn-slots-flexible is normalized. Response includes slotsFlexible for compat.",
    schema: z.object({ path: pagePath }),
    handler: ({ path }) => client.get("/api/agent/topic-slots-template", { path })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_slots_template_set",
    legacy: "set_topic_slots_template",
    description:
      "Set awn-slots-template on manifest.md. Removes legacy awn-slots-flexible / awn-slots-disabled. standard = typed slots; flexible = whole awn-storage/ except assets/, history/, comments/; minimal = single-file slots; none = instruction + todo only.",
    schema: z.object({
      path: pagePath,
      template: topicSlotsTemplateSchema
    }),
    handler: ({ path, template }) => client.put("/api/agent/topic-slots-template", { path, template })
  });

  const updateTopicSchema = z.object({
    path: pagePath,
    name: z.string().optional().describe("Maps to awn-name"),
    description: z.string().optional(),
    body: z.string().optional().describe("Markdown body below frontmatter")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_update",
    legacy: "update_topic",
    description:
      "Update topic manifest: awn-name, awn-description, and/or body (like channel_update). YAML patch → topic_properties_write; schema → topic_schema_write.",
    schema: updateTopicSchema,
    handler: (payload) => {
      if (
        payload.name === undefined &&
        payload.description === undefined &&
        payload.body === undefined
      ) {
        throw new Error("Provide name, description, and/or body");
      }
      return client.put("/api/agent/topic", payload);
    }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_body_read",
    legacy: "read_topic_body",
    description: "Read topic manifest.md body (markdown below frontmatter).",
    schema: z.object({ path: pagePath }),
    handler: ({ path }) => client.get("/api/file", { path })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_body_write",
    legacy: "write_topic_body",
    description: "Save topic manifest.md body. Frontmatter on disk is preserved.",
    schema: z.object({ path: pagePath, content: z.string() }),
    handler: ({ path, content }) => client.post("/api/file/content", { path, content })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_properties_read",
    legacy: "read_topic_properties",
    description: "Read full YAML frontmatter from topic manifest.md.",
    schema: z.object({ path: pagePath }),
    handler: ({ path }) => client.get("/api/file/properties", { path })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_properties_write",
    legacy: "write_topic_properties",
    description:
      "Patch YAML frontmatter on manifest.md. Send only keys to change — existing keys on disk are preserved (awn-create/update/version auto-stamped by server).",
    schema: z.object({
      path: pagePath,
      content: z.string().describe("YAML patch, e.g. awn-status: closed")
    }),
    handler: ({ path, content }) => client.post("/api/file/properties", { path, content })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_property_read",
    legacy: "read_topic_property",
    description: "Read one frontmatter property from manifest.md (e.g. awn-name, awn-status).",
    schema: z.object({
      path: pagePath,
      key: z.string().min(1).describe("Property key, e.g. awn-name")
    }),
    handler: ({ path, key }) => client.get("/api/file/properties", { path, key })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_property_write",
    legacy: "write_topic_property",
    description: "Set one frontmatter property on manifest.md. Other keys preserved; awn-update/version auto-stamped.",
    schema: z.object({
      path: pagePath,
      key: z.string().min(1),
      value: z.string().describe("New value (empty string allowed)")
    }),
    handler: ({ path, key, value }) => client.post("/api/file/properties", { path, key, value })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_schema_read",
    legacy: "read_topic_schema",
    description:
      "Read schema.yml layers (workspace / area / topic — non-empty blocks only). Base type fields: get_type.",
    schema: z.object({
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
    handler: ({ path, target, mode }) =>
      client.get("/api/file/page-schema", {
        path,
        mode: mode || "layers",
        ...(target ? { target } : {})
      })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_schema_write",
    legacy: "write_topic_schema",
    description:
      "Save schema.yml override. Pass YAML with awn_schema: { topic: { fields: … } } — only blocks you change. Response is slim (written blocks only).",
    schema: z.object({ path: pagePath, content: z.string() }),
    handler: ({ path, content }) => client.post("/api/file/page-schema", { path, content, responseMode: "layers" })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_config_read",
    legacy: "read_topic_config",
    description:
      "Read topic config.yml (awn_settings, awn_ui). Field definitions live in schema.yml — use topic_schema_read.",
    schema: z.object({ path: pagePath }),
    handler: ({ path }) => client.get("/api/file/page-config", { path })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_config_write",
    legacy: "write_topic_config",
    description: "Save topic config.yml (awn_settings, awn_ui). Empty content deletes the file. Never put awn_schema here.",
    schema: z.object({ path: pagePath, content: z.string() }),
    handler: ({ path, content }) => client.post("/api/file/page-config", { path, content })
  });

  reg(
    "topic_exists",
    "Check whether topic manifest.md exists. Accepts folder path — appends manifest.md automatically.",
    z.object({ path: pagePath }),
    ({ path }) => client.get("/api/page/exists", { path })
  );

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_meta_get",
    legacy: "get_topic_meta",
    description: "Lightweight topic metadata: manifest stat, folder stat, props hint — no body.",
    schema: z.object({ path: pagePath }),
    handler: ({ path }) => client.get("/api/page/meta", { path })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_env_read",
    legacy: "read_topic_env",
    description: "Read topic .env (secrets, API keys). Path = manifest.md of the topic.",
    schema: z.object({ path: pagePath }),
    handler: ({ path }) => client.get("/api/page/env", { path })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_env_write",
    legacy: "write_topic_env",
    description: "Write topic .env file.",
    schema: z.object({ path: pagePath, content: z.string() }),
    handler: ({ path, content }) => client.post("/api/page/env", { path, content })
  });

  const createTopicSchema = z.object({
    parentPath: z.string().optional().describe("Parent folder, default . (vault topics root)"),
    type: z
      .string()
      .min(1)
      .describe("folder | area | awn.hub.topic.area | file | topic | awn.hub.topic"),
    name: z.string().min(1).optional(),
    displayName: z.string().min(1).optional(),
    title: z.string().optional(),
    slug: z.string().optional(),
    awnType: z.string().optional().describe("Optional awn-type override; usually inferred from type")
  });

  const createTopicHandler = (args) => {
    if (!args.displayName && !args.title && !args.name && !args.slug) {
      throw new Error("Provide displayName, title, name, or slug");
    }
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

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_create",
    legacy: "create_topic",
    description:
      "Create area or topic. Required: type; and displayName | title | name | slug. " +
      "type: area → folder+manifest (awn.hub.topic.area); topic → file+manifest (awn.hub.topic). " +
      "Aliases: folder|area|file|topic or full awn-type id.",
    schema: createTopicSchema,
    handler: createTopicHandler
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_delete",
    legacy: "delete_topic",
    description:
      "Delete area, topic, or part folder. When platform confirm-delete is enabled, pass confirm=true.",
    schema: z.object({
      path: pagePath,
      confirm: z.boolean().optional().describe("Required true when platform confirm-delete is enabled")
    }),
    handler: ({ path }) => client.delete("/api/file", { path })
  });

  const renameTopicSchema = z.object({
    path: pagePath,
    displayName: z.string().min(1).optional(),
    slug: z.string().optional(),
    title: z.string().min(1).optional()
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_rename",
    legacy: "rename_topic",
    description: "Rename topic or area. Required: displayName or title. displayName → awn-name; slug → folder/filename on disk.",
    schema: renameTopicSchema,
    handler: ({ path, displayName, slug, title }) => {
      if (!displayName && !title) {
        throw new Error("displayName or title is required");
      }
      return client.post("/api/file/title", {
        path,
        displayName: displayName || undefined,
        slug: slug || undefined,
        title: title || displayName
      });
    }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "topic_move",
    legacy: "move_topic",
    description: "Move area/topic to another parent folder.",
    schema: z.object({
      path: pagePath,
      parentPath: z.string().describe("Target parent folder path, e.g. awn-topics/kollektsii or .")
    }),
    handler: ({ path, parentPath }) => client.post("/api/page/move", { path, parentPath })
  });

}
