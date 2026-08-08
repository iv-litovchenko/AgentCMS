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
import { registerDataPropertyTools } from "./lib/data-property-tools.js";
import { registerExecTools } from "./lib/exec-tools.js";

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

  // ── Старт / контекст (5) ───────────────────────────────────────────────────

  reg(
    "get_session_context",
    "START HERE: topicRegistry, alwaysContext, service manifests. Runtime indexes: list_workspace_always_context / list_workspace_cron / list_workspace_heartbeat.",
    z.object({}),
    () => client.get("/api/agent/session-context")
  );

  reg(
    "get_user_active_context_now",
    "What the user is viewing in Agent CMS UI: focus.entity, ready MCP args (path/slot/ref). Call when the user did not specify a path.",
    z.object({}),
    () => client.get("/api/agent/active-context")
  );

  reg(
    "list_workspace_always_context",
    "Always-in-context: full file content for awn-runtime-load-always + AGENTS.md/SKILL.md/README.md + GLOBAL_MCP_DOC.md.",
    z.object({}),
    () => client.get("/api/agent/always-context")
  );

  reg(
    "list_workspace_cron",
    "Cron index: topics and records with awn-runtime-cron (+ schedule).",
    z.object({}),
    () => client.get("/api/agent/cron-registry")
  );

  reg(
    "list_workspace_heartbeat",
    "Heartbeat index: topics and records with awn-runtime-heartbeat.",
    z.object({}),
    () => client.get("/api/agent/heartbeat-registry")
  );

  // ── Навигация (3) ──────────────────────────────────────────────────────────

  registerMapTools(reg, client, pagePath);

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

  // ── AWN-DATA runtime (5) ───────────────────────────────────────────────────

  reg("list_data_stores", "List structured data stores (awn-data): collections, singletons, groups.", z.object({}), () =>
    client.get("/api/awn-data")
  );

  reg(
    "get_data_store",
    "One data store with schema, records and tree (MD or CSV).",
    z.object({
      store: z.string().min(1).describe("Store relPath, e.g. taxonomies/statuses, agents, tasks")
    }),
    ({ store }) => client.get("/api/awn-data", { store })
  );

  reg(
    "create_data_store",
    "Create awn-data store: group, collection (MD or CSV for taxonomies/), or singleton.",
    z.object({
      kind: z.enum(["group", "collection", "singleton"]).optional(),
      slug: z.string().min(1).describe("Folder slug under awn-data/, e.g. taxonomies/users"),
      name: z.string().optional(),
      description: z.string().optional(),
      hierarchy: z.boolean().optional(),
      withSampleRecord: z.boolean().optional()
    }),
    (payload) => client.post("/api/awn-data/stores", payload)
  );

  reg(
    "read_data_store_schema",
    "Read record field schema from awn-data store schema-mod.yml (instance override, not type catalog).",
    z.object({
      store: z.string().min(1).describe("Store relPath, e.g. tasks, taxonomies/statuses")
    }),
    ({ store }) => client.get("/api/awn-data/store-schema", { store })
  );

  reg(
    "create_data_record",
    "Add record to a data collection (append CSV row or create {id}.md).",
    z.object({
      store: z.string().min(1).describe("Store relPath, e.g. taxonomies/tags"),
      id: z.string().optional(),
      title: z.string().optional(),
      parent: z.string().optional()
    }),
    (payload) => client.post("/api/awn-data/records", payload)
  );

  registerDataPropertyTools(reg, client);

  // ── Page / Slot / Content / Types ──────────────────────────────────────────

  registerPageTools({ reg, client, pagePath });
  registerSlotTools({ reg, client, pagePath });
  registerContentTools({ reg, client, pagePath });
  registerTypeListTools({ reg, client });

  // ── Intake (4) ─────────────────────────────────────────────────────────────

  reg("list_inbox", "List inbox items with triage metadata.", z.object({ path: pagePath }), ({ path }) =>
    client.get("/api/inbox", { path })
  );

  reg(
    "triage_inbox_item",
    "Triage inbox: to-dialogs, to-content, mark-done, set-status.",
    z.object({
      path: pagePath,
      file: z.string().min(1),
      action: z.enum(["to-dialogs", "to-content", "mark-done", "set-status"]),
      status: z.enum(["new", "in-progress", "done"]).optional()
    }),
    ({ path, file, action, status }) => client.post("/api/inbox/triage", { path, file, action, status })
  );

  reg(
    "read_dialogs",
    "Read topic dialog (slot dialogs / folder thread/).",
    z.object({
      path: pagePath,
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, mode, file, name }) => client.get("/api/dialogs", { path, mode, file, name })
  );

  reg(
    "append_dialog",
    "Append message to topic dialog.",
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
      client.post("/api/dialogs", { path, body, role, author, linkedFiles, mode, file, name })
  );

  // ── FS + system (5) ────────────────────────────────────────────────────────

  registerWorkspaceFsTools(reg, client);
  registerExecTools(reg, client, pagePath);

  reg(
    "list_system_files",
    "List agent system files (AGENTS.md, SKILL.md, …) — then read_file/write_file by path.",
    z.object({}),
    () => client.get("/api/system-files")
  );

  // ── Уведомление (1) ────────────────────────────────────────────────────────

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

  return server;
}

const server = createServer();
const transport = new StdioServerTransport();
await server.connect(transport);
