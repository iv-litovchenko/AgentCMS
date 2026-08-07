#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AgentCmsClient, getConfig, jsonText } from "./lib/client.js";
import { registerPageTools } from "./lib/page-tools.js";
import { registerSlotTools } from "./lib/slot-tools.js";
import { registerContentTools } from "./lib/content-tools.js";
import { registerTypeListTools } from "./lib/type-list-tools.js";
import { registerWorkspaceFsTools } from "./lib/workspace-fs-tools.js";
import { registerMapTools } from "./lib/map-tools.js";

const pagePath = z
  .string()
  .min(1)
  .describe(
    "Path to page manifest.md (awn.page.topic|area|ws), e.g. awn-container/finansydohody/manifest.md"
  );

function textResult(data) {
  return { content: [{ type: "text", text: typeof data === "string" ? data : jsonText(data) }] };
}

function toolError(message) {
  return { content: [{ type: "text", text: message }], isError: true };
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

  const server = new McpServer({ name: "agent-cms", version: "0.3.0" });

  const reg = (name, description, schema, fn) => {
    server.registerTool(name, { description: description + agentNote, inputSchema: schema }, wrap(fn));
  };

  // ── Bootstrap ──────────────────────────────────────────────────────────────

  reg("list_agents", "List agents from awn-agents.json registry.", z.object({}), () =>
    client.get("/api/agents", {}, { agentScope: false })
  );

  reg(
    "get_session_context",
    "START HERE: session bootstrap — topicRegistry (skill-карта), alwaysContext (полные файлы), service manifests, API map. Runtime indexes: list_workspace_always_context / list_workspace_cron / list_workspace_heartbeat.",
    z.object({}),
    () => client.get("/api/agent/session-context")
  );

  reg("get_mcp_docs", "MCP tools reference JSON (docs/mcp-0.0.2.js).", z.object({}), () =>
    client.get("/api/mcp-docs", { version: "0.0.2" }, { agentScope: false })
  );

  // ── Navigation ─────────────────────────────────────────────────────────────

  registerMapTools(reg, client, pagePath);

  reg(
    "get_user_active_context_now",
    "What the user is viewing in Agent CMS UI right now: focus.entity (page|slot|content|system|browse|…), ready MCP args (path/slot/ref) for read/write_*. Call when the user did not specify a path.",
    z.object({}),
    () => client.get("/api/agent/active-context")
  );

  reg(
    "get_active_context",
    "Deprecated → get_user_active_context_now.",
    z.object({}),
    () => client.get("/api/agent/active-context")
  );

  reg(
    "search_workspace",
    "Search workspace (UI header search). scope=all by default. match=relaxed|strict.",
    z.object({
      query: z.string().min(1),
      scope: z.enum(["all", "content", "filename", "description", "tags"]).optional(),
      fileType: z
        .enum([
          "all",
          "markdown",
          "sidecar",
          "pdf",
          "office",
          "spreadsheet",
          "video",
          "audio",
          "image",
          "archive",
          "config",
          "other"
        ])
        .optional(),
      match: z.enum(["relaxed", "strict"]).optional(),
      limit: z.number().int().min(1).max(100).optional()
    }),
    ({ query, scope, fileType, match, limit }) =>
      client.get("/api/search", {
        q: query,
        scope: scope || "all",
        fileType: fileType || "all",
        match: match || "relaxed",
        limit: limit || 30
      })
  );

  reg(
    "list_workspace_always_context",
    "Always-in-context index: full file content for awn-runtime-load-always topics/records + AGENTS.md/SKILL.md/README.md + GLOBAL_MCP_DOC.md. No query — fixed runtime filter.",
    z.object({}),
    () => client.get("/api/agent/always-context")
  );

  reg(
    "list_workspace_cron",
    "Cron index: topics and records with awn-runtime-cron (+ schedule). No query — fixed runtime filter.",
    z.object({}),
    () => client.get("/api/agent/cron-registry")
  );

  reg(
    "list_workspace_heartbeat",
    "Heartbeat index: topics and records with awn-runtime-heartbeat. No query — fixed runtime filter.",
    z.object({}),
    () => client.get("/api/agent/heartbeat-registry")
  );

  reg(
    "get_always_context",
    "Deprecated → list_workspace_always_context.",
    z.object({}),
    () => client.get("/api/agent/always-context")
  );

  reg(
    "get_cron_registry",
    "Deprecated → list_workspace_cron.",
    z.object({}),
    () => client.get("/api/agent/cron-registry")
  );

  reg(
    "get_heartbeat_registry",
    "Deprecated → list_workspace_heartbeat.",
    z.object({}),
    () => client.get("/api/agent/heartbeat-registry")
  );

  reg("get_storage_layout", "awn-storage slot layout for all containers.", z.object({}), () =>
    client.get("/api/agent/storage-layout")
  );

  reg(
    "get_canonical_model",
    "Canonical CMS model v1: page types, slot content types, bindings.",
    z.object({}),
    () => client.get("/api/agent/canonical-model")
  );

  reg("list_awn_types", "Full effective awn-type catalog for agent workspace.", z.object({}), () =>
    client.get("/api/awn-types")
  );

  reg("get_type_health", "Validate agent type model in awn-data/.", z.object({}), () =>
    client.get("/api/agent/type-health")
  );

  // ── Data stores (awn-data) ─────────────────────────────────────────────────

  reg("list_data_stores", "List structured data stores (awn-data): collections, singletons, groups.", z.object({}), () =>
    client.get("/api/awn-data")
  );

  reg(
    "get_data_store",
    "One data store with schema, records and tree (MD or CSV).",
    z.object({
      store: z
        .string()
        .min(1)
        .describe("Store relPath, e.g. taxonomies/statuses, agents, tasks")
    }),
    ({ store }) => client.get("/api/awn-data", { store })
  );

  reg(
    "create_data_store",
    "Create awn-data store: group, collection (MD or CSV for taxonomies/), or singleton.",
    z.object({
      kind: z
        .enum(["group", "collection", "singleton"])
        .optional()
        .describe("Default: collection. group = folder container (taxonomies/, agents/)."),
      slug: z
        .string()
        .min(1)
        .describe("Folder slug under awn-data/, e.g. taxonomies/users or my-notes"),
      name: z.string().optional(),
      description: z.string().optional(),
      hierarchy: z
        .boolean()
        .optional()
        .describe("MD collection: nested folders by parent (default true except taxonomies/)"),
      withSampleRecord: z
        .boolean()
        .optional()
        .describe("MD collection: create sample 1.md (default true for non-taxonomy collections)")
    }),
    (payload) => client.post("/api/awn-data/stores", payload)
  );

  reg(
    "read_data_store_schema",
    "Read record field schema from awn-data store schema-mod.yml (awn_schema.record.fields). Returns mergedFields from manifest + extends + schema-mod.",
    z.object({
      store: z.string().min(1).describe("Store relPath, e.g. tasks, taxonomies/statuses")
    }),
    ({ store }) => client.get("/api/awn-data/store-schema", { store })
  );

  reg(
    "write_data_store_schema",
    "Save record field schema to schema-mod.yml. Pass content as YAML with awn_schema.record.fields, or fields/tabs object.",
    z.object({
      store: z.string().min(1).describe("Store relPath, e.g. tasks"),
      content: z
        .string()
        .optional()
        .describe("Full schema-mod.yml YAML body with awn_schema.record block"),
      fields: z
        .record(z.any())
        .optional()
        .describe("Record fields map (alternative to content)"),
      tabs: z.record(z.any()).optional().describe("Record schema tabs (optional)")
    }),
    ({ store, content, fields, tabs }) =>
      client.post("/api/awn-data/store-schema", { store, content, fields, tabs })
  );

  reg(
    "create_data_record",
    "Add record to a data collection (append CSV row or create {id}.md).",
    z.object({
      store: z.string().min(1).describe("Store relPath, e.g. taxonomies/tags"),
      id: z.string().optional().describe("Slug or numeric id; auto-generated if omitted"),
      title: z.string().optional().describe("Label/title; required if id omitted for slug mode"),
      parent: z.string().optional().describe("Parent record id (MD hierarchical collections only)")
    }),
    (payload) => client.post("/api/awn-data/records", payload)
  );

  // ── Platform ───────────────────────────────────────────────────────────────

  reg("list_type_catalog", "Platform type catalog.", z.object({}), () =>
    client.get("/api/type-catalog", {}, { agentScope: false })
  );

  reg("list_components", "Platform component registry.", z.object({}), () =>
    client.get("/api/components", {}, { agentScope: false })
  );

  reg("get_platform_index", "Platform navigation index.", z.object({}), () =>
    client.get("/api/platform/index", {}, { agentScope: false })
  );

  // ── Page / Slot / Content (canonical v2) ───────────────────────────────────

  registerPageTools({ reg, client, pagePath });
  registerSlotTools({ reg, client, pagePath });
  registerContentTools({ reg, client, pagePath });
  registerTypeListTools({ reg, client });

  // ── Workflow ───────────────────────────────────────────────────────────────

  reg("list_inbox", "List inbox items with triage metadata.", z.object({ path: pagePath }), ({ path }) =>
    client.get("/api/inbox", { path })
  );

  reg(
    "read_inbox_item",
    "Read one inbox item with full body.",
    z.object({ path: pagePath, file: z.string().min(1) }),
    ({ path, file }) => client.get("/api/inbox/item", { path, file })
  );

  reg(
    "triage_inbox_item",
    "Triage inbox: to-thread, to-content, mark-done, set-status.",
    z.object({
      path: pagePath,
      file: z.string().min(1),
      action: z.enum(["to-thread", "to-content", "mark-done", "set-status"]),
      status: z.enum(["new", "in-progress", "done"]).optional()
    }),
    ({ path, file, action, status }) => client.post("/api/inbox/triage", { path, file, action, status })
  );

  reg(
    "read_thread",
    "Read topic dialogue thread.",
    z.object({
      path: pagePath,
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, mode, file, name }) => client.get("/api/thread", { path, mode, file, name })
  );

  reg(
    "append_thread",
    "Append message to topic thread.",
    z.object({
      path: pagePath,
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

  reg("get_topic_intake", "Inbox + thread summary for a topic.", z.object({ path: pagePath }), ({ path }) =>
    client.get("/api/topic/intake", { path })
  );

  reg(
    "get_intake_batch",
    "Batch inbox/thread summary for multiple topics.",
    z.object({ paths: z.array(pagePath).min(1).max(120) }),
    ({ paths }) => client.post("/api/intake/batch", { paths })
  );

  reg(
    "list_comments",
    "List discussion comments on a page or file.",
    z.object({
      path: pagePath,
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, mode, file, name }) => client.get("/api/file/comments", { path, mode, file, name })
  );

  reg(
    "append_comment",
    "Append a comment.",
    z.object({
      path: pagePath,
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
    "Toggle 👍 on a comment.",
    z.object({
      path: pagePath,
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

  registerWorkspaceFsTools(reg, client);

  // ── Workspace (free memory) ────────────────────────────────────────────────

  reg("list_adopt_folders", "List adoptable folders (no manifest.md). Then list_folder / read_file / upload_file.", z.object({}), () =>
    client.get("/api/workspace/folder/adopt")
  );

  // ── awn-system ─────────────────────────────────────────────────────────────

  reg("get_agent_system_status", "Agent awn-system status.", z.object({}), () =>
    client.get("/api/agent-system/status", {})
  );

  reg(
    "get_agent_system_type",
    "Type details by id or catalog path.",
    z.object({
      id: z.string().optional(),
      path: z.string().optional()
    }),
    ({ id, path }) => client.get("/api/agent-system/type", { id, path })
  );

  reg(
    "read_agent_system_file",
    "Read awn-system file (types/*.yml, MAP.md, …).",
    z.object({ path: z.string().min(1) }),
    ({ path }) => client.get("/api/agent-system/file", { path })
  );

  reg(
    "write_agent_system_file",
    "Write awn-system file.",
    z.object({ path: z.string().min(1), content: z.string() }),
    ({ path, content }) => client.post("/api/agent-system/file", { path, content })
  );

  // ── Shell & notifications ──────────────────────────────────────────────────

  reg("shell_get_status", "Agent Shell status.", z.object({}), () => client.get("/api/shell/status"));

  reg(
    "shell_post_message",
    "Send message to Agent Shell thread.",
    z.object({ body: z.string().min(1), author: z.string().optional() }),
    ({ body, author }) => client.post("/api/shell/message", { body, author: author || "agent-mcp" })
  );

  reg("shell_stop_tts", "Stop Shell TTS.", z.object({}), () => client.post("/api/shell/stop-tts", {}));

  reg(
    "shell_camera_snapshot",
    "Capture Shell camera frame.",
    z.object({
      waitMs: z.number().int().min(1000).max(60000).optional(),
      reason: z.string().optional(),
      kind: z.enum(["live", "speech", "manual"]).optional()
    }),
    async ({ waitMs, reason, kind }) => {
      const mode = kind || "live";
      if (mode === "speech" || mode === "manual") {
        return client.get("/api/shell/camera/latest", { kind: mode });
      }
      return client.post("/api/shell/camera/snapshot", { waitMs: waitMs || 15000, reason: reason || "" });
    }
  );

  reg(
    "shell_screenshot",
    "Capture Shell screen frame.",
    z.object({
      waitMs: z.number().int().min(1000).max(60000).optional(),
      reason: z.string().optional(),
      kind: z.enum(["live", "speech", "manual"]).optional()
    }),
    async ({ waitMs, reason, kind }) => {
      const mode = kind || "live";
      if (mode === "speech" || mode === "manual") {
        return client.get("/api/shell/screen/latest", { kind: mode });
      }
      return client.post("/api/shell/screen/snapshot", { waitMs: waitMs || 15000, reason: reason || "" });
    }
  );

  reg(
    "notify_user",
    "Push notification to CMS bell.",
    z.object({
      title: z.string().min(1),
      message: z.string().optional(),
      path: pagePath.optional()
    }),
    ({ title, message, path }) =>
      client.post("/api/agent/activity/notify", { title, message, manifestPath: path, path })
  );

  reg("list_system_files", "List agent system files (AGENTS.md, SKILL.md, …) — then read_file/write_file by path.", z.object({}), () =>
    client.get("/api/system-files")
  );

  return server;
}

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
