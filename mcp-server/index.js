#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AgentCmsClient, getConfig, jsonText } from "./lib/client.js";
import { registerPageTools } from "./lib/page-tools.js";
import { registerSlotTools } from "./lib/slot-tools.js";
import { registerContentTools } from "./lib/content-tools.js";
import { registerTypeListTools } from "./lib/type-list-tools.js";

const pagePath = z
  .string()
  .min(1)
  .describe(
    "Path to page manifest.md (awn.page.topic|area|ws), e.g. awn-container/finansydohody/manifest.md"
  );

const workspaceFolderPath = z
  .string()
  .min(1)
  .describe("Workspace folder path without manifest.md, e.g. awn-container/Материалы/PINE-TV");
const workspaceFilePath = z
  .string()
  .min(1)
  .describe("Relative workspace file path, e.g. awn-container/Материалы/notes/readme.md");

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
    "START HERE: session bootstrap — manifests, session-start topics, AGENTS.md, API map, path hints.",
    z.object({}),
    () => client.get("/api/agent/session-context")
  );

  reg("get_mcp_docs", "MCP tools reference JSON (docs/mcp-0.0.2.js).", z.object({}), () =>
    client.get("/api/mcp-docs", { version: "0.0.2" }, { agentScope: false })
  );

  reg("get_api_reference", "HTTP API docs JSON (version 0.0.2).", z.object({}), () =>
    client.get("/api/docs", { version: "0.0.2" }, { agentScope: false })
  );

  // ── Navigation ─────────────────────────────────────────────────────────────

  reg("get_menu", "Workspace tree: areas and topics (manifest.md paths).", z.object({}), () =>
    client.get("/api/menu")
  );

  reg(
    "get_active_context",
    "Current UI focus (PAGE→SLOT→CONTENT): focus.entity, focus.page/slot/content, mcp hints with ready tool args, aliases.path/slot/ref. Call when user did not specify path.",
    z.object({}),
    () => client.get("/api/agent/active-context")
  );

  reg(
    "get_active_page",
    "Deprecated alias of get_active_context.",
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
    "get_runtime_registry",
    "Topic runtime registry. Filter: sync, cron, heartbeat, mode.",
    runtimeFilterSchema,
    (args) => client.get("/api/agent/runtime-registry", runtimeFilterQuery(args))
  );

  reg(
    "get_runtime_map",
    "Runtime sync map — topics with cron and/or heartbeat.",
    runtimeFilterSchema,
    (args) => client.get("/api/agent/runtime-map", runtimeFilterQuery(args))
  );

  reg("get_storage_layout", "awn-storage slot layout for all containers.", z.object({}), () =>
    client.get("/api/agent/storage-layout")
  );

  reg("get_workspace_table", "Flat workspace table.", z.object({}), () =>
    client.get("/api/agent/workspace-table")
  );

  reg(
    "get_canonical_model",
    "Canonical CMS model v1: page types, slot content types, bindings.",
    z.object({}),
    () => client.get("/api/agent/canonical-model")
  );

  reg("get_site_map", "Site map — areas and topics with manifest paths.", z.object({}), () =>
    client.get("/api/agent/site-map")
  );

  reg("list_awn_types", "Full effective awn-type catalog for agent workspace.", z.object({}), () =>
    client.get("/api/awn-types")
  );

  reg("get_type_health", "Validate agent type model in awn-system/types/.", z.object({}), () =>
    client.get("/api/agent/type-health")
  );

  // ── Platform catalogs ──────────────────────────────────────────────────────

  reg("list_type_catalog", "Platform type catalog.", z.object({}), () =>
    client.get("/api/type-catalog", {}, { agentScope: false })
  );

  reg("list_components", "Platform component registry.", z.object({}), () =>
    client.get("/api/components", {}, { agentScope: false })
  );

  reg("list_platform_catalogs", "Global platform catalogs.", z.object({}), () =>
    client.get("/api/platform/catalogs", {}, { agentScope: false })
  );

  reg("list_agent_catalogs", "Merged global + local catalogs.", z.object({}), () =>
    client.get("/api/agent/catalogs")
  );

  reg("get_platform_index", "Platform navigation index.", z.object({}), () =>
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
    "create_inbox_item",
    "Create inbox intake note.",
    z.object({
      path: pagePath,
      title: z.string().optional(),
      body: z.string().optional(),
      source: z.string().optional(),
      author: z.string().optional()
    }),
    ({ path, title, body, source, author }) =>
      client.post("/api/inbox/create", { path, title, body, source, author })
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

  // ── Workspace (free memory) ────────────────────────────────────────────────

  reg("list_adopt_folders", "List adoptable folders (no manifest.md).", z.object({}), () =>
    client.get("/api/workspace/folder/adopt")
  );

  reg(
    "browse_workspace_folder",
    "Browse one level of free memory folder.",
    z.object({ folderPath: workspaceFolderPath }),
    ({ folderPath }) => client.get("/api/workspace/folder/browse", { folderPath })
  );

  reg(
    "scan_workspace_folder",
    "Recursive inventory of free memory folder.",
    z.object({
      folderPath: workspaceFolderPath,
      depth: z.union([z.string(), z.number()]).optional(),
      includeBody: z.boolean().optional(),
      maxBodyChars: z.number().int().min(200).max(20000).optional()
    }),
    ({ folderPath, depth, includeBody, maxBodyChars }) =>
      client.get("/api/workspace/folder/scan", {
        folderPath,
        ...(depth != null ? { depth: String(depth) } : {}),
        ...(includeBody ? { includeBody: "true" } : {}),
        ...(maxBodyChars != null ? { maxBodyChars: String(maxBodyChars) } : {})
      })
  );

  reg(
    "read_workspace_page",
    "Read markdown page from free memory.",
    z.object({ file: workspaceFilePath }),
    ({ file }) => client.get("/api/workspace/folder/page", { file })
  );

  reg(
    "read_workspace_text_file",
    "Read text file from free memory.",
    z.object({
      file: workspaceFilePath,
      maxBytes: z.number().int().min(1024).max(120000).optional()
    }),
    ({ file, maxBytes }) =>
      client.get("/api/workspace/folder/text", {
        file,
        ...(maxBytes != null ? { maxBytes: String(maxBytes) } : {})
      })
  );

  reg(
    "upload_workspace_file",
    "Upload file to free memory folder (not a topic slot). data = base64.",
    z.object({
      folderPath: workspaceFolderPath,
      fileName: z.string().min(1),
      data: z.string().min(1),
      mimeType: z.string().optional()
    }),
    ({ folderPath, fileName, data, mimeType }) =>
      client.post("/api/workspace/folder/upload", { folderPath, fileName, data, mimeType })
  );

  // ── awn-system ─────────────────────────────────────────────────────────────

  reg("get_agent_system_status", "Agent awn-system status.", z.object({}), () =>
    client.get("/api/agent-system/status", {})
  );

  reg("list_view_types", "Available awn.view.* types.", z.object({}), () =>
    client.get("/api/agent-system/views", {})
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

  reg("list_system_files", "List agent system files.", z.object({}), () => client.get("/api/system-files"));

  reg(
    "read_system_file",
    "Read system file (AGENTS.md, …).",
    z.object({ name: z.string().min(1) }),
    ({ name }) => client.get("/api/system-file", { name })
  );

  reg(
    "write_system_file",
    "Write system file.",
    z.object({ name: z.string().min(1), content: z.string() }),
    ({ name, content }) => client.post("/api/system-file", { name, content })
  );

  return server;
}

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
