#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AgentCmsClient, getConfig, jsonText } from "./lib/client.js";

const nodePath = z
  .string()
  .min(1)
  .describe(
    "Path to manifest.md of topic/area, e.g. awn-container/finansydohody/manifest.md (legacy _registration.md accepted)"
  );
const extFile = z.string().min(1).describe("File name under awn-storage/main/ or media/, e.g. notes.md");
const storageSlotFolder = z
  .string()
  .min(1)
  .describe("Storage slot folder: scripts, artefacts, repository, references, notes, assets, temp, main, configuration");
const storageSlotFile = z
  .string()
  .min(1)
  .describe("Relative file path inside the slot folder, e.g. fetch.py or exports/report.json");

function textResult(data) {
  return { content: [{ type: "text", text: typeof data === "string" ? data : jsonText(data) }] };
}

function toolError(message) {
  return { content: [{ type: "text", text: message }], isError: true };
}

const runtimeFilterSchema = z.object({
  sync: z
    .boolean()
    .optional()
    .describe("If true: topics with cron OR heartbeat (same as runtime-map default)."),
  cron: z.boolean().optional().describe("Include topics with awn-runtime-cron: true."),
  heartbeat: z.boolean().optional().describe("Include topics with awn-runtime-heartbeat: true."),
  mode: z
    .enum(["any", "all"])
    .optional()
    .describe("any = cron OR heartbeat; all = cron AND heartbeat (when both flags enabled).")
});

function runtimeFilterQuery(args) {
  const params = {};
  if (args.sync === true) params.sync = "true";
  if (args.cron !== undefined) params.cron = String(args.cron);
  if (args.heartbeat !== undefined) params.heartbeat = String(args.heartbeat);
  if (args.mode) params.mode = args.mode;
  return params;
}

function wrap(handler) {
  return async (args) => {
    try {
      return textResult(await handler(args));
    } catch (e) {
      return toolError(e.message);
    }
  };
}

function createServer() {
  const cfg = getConfig();
  const client = new AgentCmsClient(cfg);
  const agentNote = cfg.defaultAgent
    ? ` Agent: ${cfg.defaultAgent}.`
    : " Uses default agent from registry.";

  const server = new McpServer({ name: "agent-cms", version: "0.2.0" });

  const reg = (name, description, schema, fn) => {
    server.registerTool(name, { description: description + agentNote, inputSchema: schema }, wrap(fn));
  };

  reg("list_agents", "List agents from awn-agents.json registry.", z.object({}), () =>
    client.get("/api/agents", {}, { agentScope: false })
  );

  reg(
    "get_session_context",
    "START HERE: one-shot session bootstrap — agent/user manifests, session-start topics, runtimeSyncTopics (cron/heartbeat), AGENTS.md, API map, path hints.",
    z.object({}),
    () => client.get("/api/agent/session-context")
  );

  reg("get_mcp_docs", "MCP tools reference JSON (docs/mcp-0.0.2.js).", z.object({}), () =>
    client.get("/api/mcp-docs", { version: "0.0.2" }, { agentScope: false })
  );

  reg("get_menu", "Workspace tree: areas and topics (manifest.md paths).", z.object({}), () =>
    client.get("/api/menu")
  );

  reg(
    "get_runtime_registry",
    "Topic runtime registry (awn-runtime-load, cron, heartbeat). Optional filter: sync, cron, heartbeat, mode.",
    runtimeFilterSchema,
    (args) => client.get("/api/agent/runtime-registry", runtimeFilterQuery(args))
  );

  reg(
    "get_runtime_map",
    "Runtime sync map — topics with cron and/or heartbeat (like site map for agent automation sync).",
    runtimeFilterSchema,
    (args) => client.get("/api/agent/runtime-map", runtimeFilterQuery(args))
  );

  reg("get_storage_layout", "awn-storage slot layout (named-slots-v2) for all containers.", z.object({}), () =>
    client.get("/api/agent/storage-layout")
  );

  reg("get_workspace_table", "Flat workspace table for agent dashboard.", z.object({}), () =>
    client.get("/api/agent/workspace-table")
  );

  reg(
    "get_canonical_model",
    "Canonical CMS model v1: page types (ws/area/topic), slot content types (record/record.category/sidecar), slot bindings.",
    z.object({}),
    () => client.get("/api/agent/canonical-model")
  );

  reg(
    "get_site_map",
    "Site map — all areas and topics with manifest paths and awn-type.",
    z.object({}),
    () => client.get("/api/agent/site-map")
  );

  reg(
    "get_node_meta",
    "Node metadata: paths, storage layers, preview, manifest info.",
    z.object({ path: nodePath }),
    ({ path }) => client.get("/api/node/meta", { path })
  );

  reg("list_awn_types", "awn-type catalog for current agent workspace.", z.object({}), () =>
    client.get("/api/awn-types")
  );

  reg(
    "get_type_health",
    "Validate agent type model: broken extends, views without contentMode, blocks without template, slots without path. Use before/after editing awn-system/types/.",
    z.object({}),
    () => client.get("/api/agent/type-health")
  );

  reg(
    "search_workspace",
    "Search workspace.",
    z.object({
      query: z.string().min(1),
      scope: z.enum(["content", "filename", "description", "tags"]).optional(),
      limit: z.number().int().min(1).max(100).optional()
    }),
    ({ query, scope, limit }) =>
      client.get("/api/search", { q: query, scope: scope || "content", limit: limit || 25 })
  );

  reg("list_type_catalog", "Platform type catalog (pages, fields, md-blocks, content slots).", z.object({}), () =>
    client.get("/api/type-catalog", {}, { agentScope: false })
  );

  reg("list_components", "Platform component registry (fields, blocks, frames, …).", z.object({}), () =>
    client.get("/api/components", {}, { agentScope: false })
  );

  reg("list_platform_catalogs", "Global platform catalogs (tags, categories, statuses, …).", z.object({}), () =>
    client.get("/api/platform/catalogs", {}, { agentScope: false })
  );

  reg("list_agent_catalogs", "Merged global + local catalogs for current agent.", z.object({}), () =>
    client.get("/api/agent/catalogs")
  );

  reg("get_platform_index", "Platform navigation index from data/index.json.", z.object({}), () =>
    client.get("/api/platform/index", {}, { agentScope: false })
  );

  reg(
    "add_catalog_item",
    "Add item to agent-local or platform-global catalog CSV.",
    z.object({
      preset: z.enum(["tags", "categories", "statuses", "users", "priorities", "colors"]),
      id: z.string().optional(),
      label: z.string().optional(),
      color: z.string().optional(),
      email: z.string().optional()
    }),
    (payload) => client.post("/api/agent/catalogs/items", payload)
  );

  reg("read_node_description", "Read manifest.md body (topic or area).", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/file", { path })
  );

  reg(
    "write_node_description",
    "Save manifest.md body.",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/content", { path, content })
  );

  reg("read_node_properties", "Read YAML frontmatter from manifest.md.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/file/properties", { path })
  );

  reg(
    "write_node_properties",
    "Save YAML frontmatter to manifest.md.",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/properties", { path, content })
  );

  reg("read_topic_schema", "Read topic field schema (schema.yml layer).", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/file/topic-schema", { path })
  );

  reg(
    "write_topic_schema",
    "Save topic field schema. Pass content as YAML string containing an awn_schema: block with slot targets (slot_memory, slot_inbox, sidecar, etc.). Example: 'awn_schema:\\n  slot_memory:\\n    fields:\\n      title:\\n        type: string'. Only awn_schema is written; awn_ui and awn_settings are untouched.",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/topic-schema", { path, content })
  );

  reg("read_node_config", "Read node configuration.yml (awn_ui, awn_settings). Does NOT include awn_schema — use read_topic_schema for that.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/file/node-config", { path })
  );

  reg(
    "write_node_config",
    "Save node configuration.yml settings (awn_ui, awn_settings only). Existing awn_schema is preserved automatically — do NOT include awn_schema in content here, use write_topic_schema instead.",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/file/node-config", { path, content })
  );

  reg(
    "create_external_memory",
    "Create note in awn-storage/main/. Uses awn-mask-file from node config when fileMask omitted. Placeholders: {YYYY},{YY},{MM},{DD},{WW},{id}.",
    z.object({
      path: nodePath,
      title: z.string().optional(),
      displayName: z.string().optional(),
      fileMask: z.string().optional(),
      parent: z.string().optional()
    }),
    ({ path, title, displayName, fileMask, parent }) =>
      client.post("/api/external/file/create", {
        path,
        title,
        displayName: displayName || title,
        fileMask,
        mask: fileMask,
        parent
      })
  );

  reg(
    "create_node",
    "Create area (type folder) or topic (type file). displayName/title → awn-name in manifest; slug or name → folder on disk (transliterated when Cyrillic).",
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
      client.post("/api/node/create", {
        parentPath: parentPath || ".",
        type,
        name,
        displayName,
        title,
        slug,
        awnType
      })
  );

  reg("delete_node", "Delete area, topic, or part folder.", z.object({ path: nodePath }), ({ path }) =>
    client.delete("/api/file", { path })
  );

  reg(
    "rename_node",
    "Rename area/topic. displayName → awn-name; slug → folder/filename on disk (transliterated from displayName when omitted). Do not pass Cyrillic as slug.",
    z
      .object({
        path: nodePath,
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
    "move_node",
    "Move area/topic folder or topic .md to another parent folder.",
    z.object({
      path: nodePath,
      parentPath: z.string().describe("Target parent folder path, e.g. awn-container/kollektsii or .")
    }),
    ({ path, parentPath }) => client.post("/api/node/move", { path, parentPath })
  );

  reg(
    "read_memory_summary",
    "Memory layer summary for topic (main/memory/tabular counts).",
    z.object({ path: nodePath }),
    ({ path }) => client.get("/api/memory/summary", { path })
  );

  reg(
    "read_tabular_memory",
    "Read tabular memory CSV (awn-storage/memory/main.csv or topic tabular layer).",
    z.object({ path: nodePath, file: z.string().optional() }),
    ({ path, file }) => client.get("/api/memory/tabular", { path, file })
  );

  reg(
    "write_tabular_memory",
    "Save tabular memory CSV.",
    z.object({ path: nodePath, content: z.string(), file: z.string().optional() }),
    ({ path, content, file }) => client.post("/api/memory/tabular", { path, content, file })
  );

  reg(
    "read_internal_memory",
    "Read single-file internal memory bundle (legacy memory.md / main.md layer).",
    z.object({ path: nodePath }),
    ({ path }) => client.get("/api/memory/internal", { path })
  );

  reg(
    "write_internal_memory",
    "Save single-file memory.",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/memory/internal", { path, content })
  );

  reg("list_external_memory", "List .md notes in awn-storage/main/.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/external/files", { path })
  );

  reg(
    "read_external_memory",
    "Read one note from awn-storage/main/.",
    z.object({ path: nodePath, file: extFile }),
    ({ path, file }) => client.get("/api/external/file", { path, file })
  );

  reg(
    "write_external_memory",
    "Save note to awn-storage/main/. Auto-enriches .md with full slot_memory frontmatter (awn.content.record). Prefer create_external_memory for new records.",
    z.object({ path: nodePath, file: extFile, content: z.string() }),
    ({ path, file, content }) => client.post("/api/external/file", { path, file, content })
  );

  reg(
    "rename_external_memory",
    "Rename .md record in awn-storage/main/.",
    z.object({ path: nodePath, file: extFile, title: z.string().min(1) }),
    ({ path, file, title }) => client.post("/api/external/file/rename", { path, file, title })
  );

  reg(
    "delete_external_memory",
    "Delete .md record from awn-storage/main/.",
    z.object({ path: nodePath, file: extFile }),
    ({ path, file }) => client.delete("/api/external/file", { path, file })
  );

  reg(
    "move_external_memory",
    "Move .md record within or across topics (awn-storage/main/).",
    z.object({
      path: nodePath,
      file: extFile,
      targetPath: nodePath.optional().describe("Destination topic manifest; defaults to source topic"),
      targetFile: z.string().optional().describe("Destination relative path in main/, e.g. 2026/06/note.md")
    }),
    ({ path, file, targetPath, targetFile }) =>
      client.post("/api/external/file/move", { path, file, targetPath, targetFile })
  );

  reg("read_todo", "Read node todo (`*.node.todo.md`).", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/todo", { path })
  );

  reg(
    "write_todo",
    "Save node todo (`*.node.todo.md`).",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/todo", { path, content })
  );

  reg("read_configuration", "Read configuration.yml.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/configuration", { path })
  );

  reg(
    "write_configuration",
    "Save configuration.yml.",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/configuration", { path, content })
  );

  reg("read_env", "Read .env.", z.object({ path: nodePath }), ({ path }) => client.get("/api/env", { path }));

  reg(
    "write_env",
    "Save .env.",
    z.object({ path: nodePath, content: z.string() }),
    ({ path, content }) => client.post("/api/env", { path, content })
  );

  reg(
    "list_folder",
    "List inbox/, scripts/, etc.",
    z.object({ path: nodePath, folder: z.string().min(1) }),
    ({ path, folder }) => client.get("/api/folder/view", { path, folder })
  );

  reg(
    "read_storage_file",
    "Read text file from storage slot (scripts/, artefacts/, repository/, …).",
    z.object({ path: nodePath, folder: storageSlotFolder, file: storageSlotFile }),
    ({ path, folder, file }) => client.get("/api/storage/file", { path, folder, file })
  );

  reg(
    "write_storage_file",
    "Write text to storage slot. .md files auto-enriched with typed frontmatter; for new records prefer create_storage_record.",
    z.object({ path: nodePath, folder: storageSlotFolder, file: storageSlotFile, content: z.string() }),
    ({ path, folder, file, content }) => client.post("/api/storage/file", { path, folder, file, content })
  );

  reg(
    "create_storage_record",
    "Create typed .md record in storage slot (inbox/, notes/, references/, artefacts/, scripts/). Frontmatter: awn-type awn.content.record + slot schema defaults.",
    z.object({
      path: nodePath,
      folder: storageSlotFolder,
      title: z.string().optional(),
      displayName: z.string().optional(),
      slug: z.string().optional(),
      parent: z.string().optional(),
      body: z.string().optional(),
      fileMask: z.string().optional(),
      source: z.string().optional(),
      author: z.string().optional(),
      status: z.string().optional()
    }),
    ({ path, folder, title, displayName, slug, parent, body, fileMask, source, author, status }) =>
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
        source,
        author,
        status
      })
  );

  reg(
    "create_storage_section",
    "Create typed section folder (manifest.md with awn.content.record.category) in inbox/, notes/, references/, artefacts/, scripts/.",
    z.object({
      path: nodePath,
      folder: storageSlotFolder,
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

  reg("list_inbox", "List inbox items with triage metadata.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/inbox", { path })
  );

  reg(
    "read_inbox_item",
    "Read a single inbox item with full body and metadata.",
    z.object({ path: nodePath, file: z.string().min(1) }),
    ({ path, file }) => client.get("/api/inbox/item", { path, file })
  );

  reg(
    "triage_inbox_item",
    "Triage inbox item: to-thread, to-content, mark-done, set-status.",
    z.object({
      path: nodePath,
      file: z.string().min(1),
      action: z.enum(["to-thread", "to-content", "mark-done", "set-status"]),
      status: z.enum(["new", "in-progress", "done"]).optional()
    }),
    ({ path, file, action, status }) => client.post("/api/inbox/triage", { path, file, action, status })
  );

  reg("read_thread", "Read topic dialogue thread messages.", z.object({
    path: nodePath,
    mode: z.string().optional(),
    file: z.string().optional(),
    name: z.string().optional()
  }), ({ path, mode, file, name }) =>
    client.get("/api/thread", { path, mode, file, name })
  );

  reg(
    "append_thread",
    "Append message to topic dialogue thread.",
    z.object({
      path: nodePath,
      body: z.string().min(1),
      role: z.enum(["user", "agent"]).optional(),
      author: z.string().optional(),
      linkedFiles: z.string().optional(),
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, body, role, author, linkedFiles, mode, file, name }) =>
      client.post("/api/thread", { path, body, role, author, linkedFiles, mode, file, name })
  );

  reg("get_topic_intake", "Inbox pending + thread summary for a topic.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/topic/intake", { path })
  );

  reg(
    "get_intake_batch",
    "Batch inbox/thread summary for multiple topics.",
    z.object({ paths: z.array(nodePath).min(1).max(120) }),
    ({ paths }) => client.post("/api/intake/batch", { paths })
  );

  reg(
    "create_inbox_item",
    "Create inbox intake note for a topic.",
    z.object({
      path: nodePath,
      title: z.string().optional(),
      body: z.string().optional(),
      source: z.string().optional(),
      author: z.string().optional()
    }),
    ({ path, title, body, source, author }) =>
      client.post("/api/inbox/create", { path, title, body, source, author })
  );

  reg(
    "list_comments",
    "List human discussion comments on a node or file (Overview/Navigation scope).",
    z.object({
      path: nodePath,
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, mode, file, name }) => client.get("/api/file/comments", { path, mode, file, name })
  );

  reg(
    "append_comment",
    "Append a comment to node/file discussion thread.",
    z.object({
      path: nodePath,
      body: z.string().min(1),
      author: z.string().optional(),
      replyTo: z.string().optional(),
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, body, author, replyTo, mode, file, name }) =>
      client.post("/api/file/comments", { path, body, author, replyTo, mode, file, name })
  );

  reg(
    "toggle_comment_reaction",
    "Toggle 👍 reaction on a comment.",
    z.object({
      path: nodePath,
      commentId: z.string().min(1),
      author: z.string().optional(),
      reaction: z.enum(["up"]).optional(),
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, commentId, author, reaction, mode, file, name }) =>
      client.post("/api/file/comments/reaction", {
        path,
        commentId,
        author,
        reaction: reaction || "up",
        mode,
        file,
        name
      })
  );

  reg("list_media", "List media/.", z.object({ path: nodePath }), ({ path }) =>
    client.get("/api/media", { path })
  );

  reg(
    "read_media_sidecar",
    "Read media sidecar.",
    z.object({ path: nodePath, file: extFile }),
    ({ path, file }) => client.get("/api/media/sidecar", { path, file })
  );

  reg(
    "write_media_sidecar",
    "Save media sidecar.",
    z.object({ path: nodePath, file: extFile, content: z.string() }),
    ({ path, file, content }) => client.post("/api/media/sidecar", { path, file, content })
  );

  reg(
    "rename_media_file",
    "Rename media file and its sidecar.",
    z.object({
      path: nodePath,
      file: extFile,
      title: z.string().min(1).optional(),
      name: z.string().min(1).optional()
    }),
    ({ path, file, title, name }) => client.post("/api/media/file/rename", { path, file, title, name })
  );

  reg(
    "delete_media_file",
    "Delete media file and its sidecar.",
    z.object({ path: nodePath, file: extFile }),
    ({ path, file }) => client.delete("/api/media/file", { path, file })
  );

  reg(
    "move_media_file",
    "Move media file within or across topics.",
    z.object({
      path: nodePath,
      file: extFile,
      targetPath: nodePath.optional().describe("Destination topic manifest; defaults to source topic"),
      targetFile: z.string().optional().describe("Destination relative path in media/")
    }),
    ({ path, file, targetPath, targetFile }) =>
      client.post("/api/media/file/move", { path, file, targetPath, targetFile })
  );

  reg("list_system_files", "List agent system files.", z.object({}), () => client.get("/api/system-files"));

  reg(
    "read_system_file",
    "Read system file.",
    z.object({ name: z.string().min(1) }),
    ({ name }) => client.get("/api/system-file", { name })
  );

  reg(
    "write_system_file",
    "Write system file.",
    z.object({ name: z.string().min(1), content: z.string() }),
    ({ name, content }) => client.post("/api/system-file", { name, content })
  );

  // ── awn-system (CMS model: types, views, fields) ─────────────────────────────

  reg(
    "get_agent_system_status",
    "Get agent awn-system status: whether it exists, type count, active domains.",
    z.object({}),
    () => client.get("/api/agent-system/status", {})
  );

  reg(
    "list_view_types",
    "List available view types (awn.view.*) with their contentMode mapping. Use to know which views can be set as default_landing_mode for a topic.",
    z.object({}),
    () => client.get("/api/agent-system/views", {})
  );

  reg(
    "get_agent_system_type",
    "Get resolved type details: inheritance chain, merged fields, storage slots. Use 'id' (e.g. 'awn.page.topic') or 'path' (e.g. 'awn-system/types/pages/topic.yml').",
    z.object({
      id: z.string().optional().describe("Type id, e.g. awn.page.topic"),
      path: z.string().optional().describe("Catalog-relative path, e.g. awn-system/types/pages/topic.yml")
    }),
    ({ id, path }) => client.get("/api/agent-system/type", { id, path })
  );

  reg(
    "read_agent_system_file",
    "Read a file from agent awn-system (types/*.yml, MAP.md, slots-bindings.yml, registry.yml). Path is relative to agent root, e.g. 'awn-system/types/content/record.yml'.",
    z.object({ path: z.string().min(1).describe("Path relative to agent root, starting with awn-system/") }),
    ({ path }) => client.get("/api/agent-system/file", { path })
  );

  reg(
    "write_agent_system_file",
    "Create or update a file in agent awn-system. Allowed: awn-system/types/**/*.yml, awn-system/MAP.md, awn-system/slots-bindings.yml. To CREATE a new type: path = 'awn-system/types/{domain}/{slug}.yml', content = valid YAML with id, name, kind, domain, status fields. Domains: base, pages, content, slots, fields, md-blocks, taxonomies, views, mixins.",
    z.object({
      path: z.string().min(1).describe("Path relative to agent root, starting with awn-system/"),
      content: z.string().describe("File content (YAML for types, Markdown for .md)")
    }),
    ({ path, content }) => client.post("/api/agent-system/file", { path, content })
  );

  reg("shell_get_status", "Agent Shell status, settings and latest agent reply.", z.object({}), () =>
    client.get("/api/shell/status")
  );

  reg(
    "shell_post_message",
    "Send a user message through Agent Shell into the active topic thread/inbox.",
    z.object({
      body: z.string().min(1).describe("Message text for the connected agent"),
      author: z.string().optional().describe("Optional author label, default shell")
    }),
    ({ body, author }) => client.post("/api/shell/message", { body, author: author || "agent-mcp" })
  );

  reg("shell_stop_tts", "Stop active Agent Shell text-to-speech playback.", z.object({}), () =>
    client.post("/api/shell/stop-tts", {})
  );

  reg(
    "shell_camera_snapshot",
    "Capture a JPEG frame from Agent Shell camera. Requires Shell UI open with camera enabled.",
    z.object({
      waitMs: z.number().int().min(1000).max(60000).optional().describe("Wait for Shell UI, default 15000"),
      reason: z.string().optional().describe("Why the agent needs the frame"),
      kind: z.enum(["live", "speech", "manual"]).optional().describe("live=ask Shell now; speech/manual=last saved frame")
    }),
    async ({ waitMs, reason, kind }) => {
      const mode = kind || "live";
      if (mode === "speech" || mode === "manual") {
        const latest = await client.get("/api/shell/camera/latest", { kind: mode });
        return latest;
      }
      return client.post("/api/shell/camera/snapshot", { waitMs: waitMs || 15000, reason: reason || "" });
    }
  );

  reg(
    "shell_screenshot",
    "Capture a PNG frame from Agent Shell screen share. Requires Shell UI open with screen share enabled.",
    z.object({
      waitMs: z.number().int().min(1000).max(60000).optional().describe("Wait for Shell UI, default 15000"),
      reason: z.string().optional().describe("Why the agent needs the screenshot"),
      kind: z.enum(["live", "speech", "manual"]).optional().describe("live=ask Shell now; speech/manual=last saved frame")
    }),
    async ({ waitMs, reason, kind }) => {
      const mode = kind || "live";
      if (mode === "speech" || mode === "manual") {
        const latest = await client.get("/api/shell/screen/latest", { kind: mode });
        return latest;
      }
      return client.post("/api/shell/screen/snapshot", { waitMs: waitMs || 15000, reason: reason || "" });
    }
  );

  reg("get_api_reference", "HTTP API docs JSON (version 0.0.2).", z.object({}), () =>
    client.get("/api/docs", { version: "0.0.2" }, { agentScope: false })
  );

  return server;
}

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
