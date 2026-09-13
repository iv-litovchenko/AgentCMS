#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AgentCmsClient, getConfig, jsonText } from "./lib/client.js";
import {
  resolveAgentId,
  runWithAgentId,
  withAgentIdSchema,
  WORKSPACE_ID_SYNONYMS
} from "./lib/agent-scope.js";
import { registerPageTools } from "./lib/page-tools.js";
import { registerSlotTools } from "./lib/slot-tools.js";
import { registerContentTools } from "./lib/content-tools.js";
import { registerTypeListTools } from "./lib/type-list-tools.js";
import { registerWorkspaceFsTools } from "./lib/workspace-fs-tools.js";
import { registerMapTools, registerSearchWorkspaceTools } from "./lib/map-tools.js";
import { registerRepositoryTools } from "./lib/repository-tools.js";
import { registerDataPropertyTools } from "./lib/data-property-tools.js";
import { registerExecTools } from "./lib/exec-tools.js";
import { registerWebSearchTools } from "./lib/web-search-tools.js";
import { registerAgentUtilsTools } from "./lib/agent-utils-tools.js";
import { registerBrainTools } from "./lib/brain-tools.js";
import { registerWorkspacePadTools } from "./lib/workspace-pad-tools.js";
import { registerSidecarTools } from "./lib/sidecar-tools.js";
import { registerFactsTools } from "./lib/facts-tools.js";

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

  const server = new McpServer({ name: "agent-cms", version: "0.3.8" });

  const reg = (name, description, schema, fn, { agentScope = true } = {}) => {
    const inputSchema = agentScope ? withAgentIdSchema(schema) : schema;
    const scopeNote = agentScope
      ? ` Required: agentId (${WORKSPACE_ID_SYNONYMS}).` +
        (cfg.defaultAgent ? ` Dev-only env fallback: ${cfg.defaultAgent}.` : "")
      : "";
    server.registerTool(
      name,
      { description: description + scopeNote, inputSchema },
      wrap(async (args) => {
        if (!agentScope) return fn(args);
        const agentId = resolveAgentId(args, cfg.defaultAgent);
        return runWithAgentId(agentId, () => fn(args));
      })
    );
  };

  // ── Workspaces (no agentId) ─────────────────────────────────────────────────

  const listWorkspacesHandler = () => client.get("/api/agents", {}, { agentScope: false });

  reg(
    "list_workspaces",
    "START NEW CHAT: list all workspaces (agents / vaults / хранилища / рабочие пространства). Returns id, name, path, defaultAgentId. Pick agentId before get_session_context.",
    z.object({}),
    listWorkspacesHandler,
    { agentScope: false }
  );

  reg(
    "list_vaults",
    "Alias for list_workspaces — same registry of agents / vaults / хранилища.",
    z.object({}),
    listWorkspacesHandler,
    { agentScope: false }
  );

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

  registerSearchWorkspaceTools(reg, client);

  registerRepositoryTools(reg, client);

  registerBrainTools(reg, client);

  registerFactsTools(reg, client);

  // ── AWN-DATA runtime (5) ───────────────────────────────────────────────────

  reg("zzz_list_data_stores", "List structured data stores (awn-data): collections, singletons, groups.", z.object({}), () =>
    client.get("/api/awn-data")
  );

  reg(
    "zzz_get_data_store",
    "One data store with schema, records and tree (MD or CSV).",
    z.object({
      store: z.string().min(1).describe("Store relPath, e.g. taxonomies/statuses, agents, tasks")
    }),
    ({ store }) => client.get("/api/awn-data", { store })
  );

  reg(
    "zzz_create_data_store",
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
    "zzz_read_data_store_schema",
    "Read record field schema from awn-data store schema-mod.yml (instance override, not type catalog).",
    z.object({
      store: z.string().min(1).describe("Store relPath, e.g. tasks, taxonomies/statuses")
    }),
    ({ store }) => client.get("/api/awn-data/store-schema", { store })
  );

  reg(
    "zzz_create_data_record",
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
    "Triage inbox: to-content, mark-done, set-status.",
    z.object({
      path: pagePath,
      file: z.string().min(1),
      action: z.enum(["to-content", "mark-done", "set-status"]),
      status: z.enum(["new", "in-progress", "done"]).optional()
    }),
    ({ path, file, action, status }) => client.post("/api/inbox/triage", { path, file, action, status })
  );

  reg(
    "read_discussion",
    "Read topic discussion (slot discussion / folder discussion/).",
    z.object({
      path: pagePath,
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, mode, file, name }) => client.get("/api/discussion", { path, mode, file, name })
  );

  reg(
    "append_discussion",
    "Append message to topic discussion.",
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
      client.post("/api/discussion", { path, body, role, author, linkedFiles, mode, file, name })
  );

  reg(
    "read_dialogs",
    "Deprecated alias for read_discussion.",
    z.object({
      path: pagePath,
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, mode, file, name }) => client.get("/api/discussion", { path, mode, file, name })
  );

  reg(
    "append_dialog",
    "Deprecated alias for append_discussion.",
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
      client.post("/api/discussion", { path, body, role, author, linkedFiles, mode, file, name })
  );

  reg(
    "list_comments",
    "List discuss comments for manifest or a file in a slot (UI comments panel). Storage: awn-storage/comments/{target}/.",
    z.object({
      path: pagePath,
      mode: z.string().optional().describe("description (default) | external | media | …"),
      file: z.string().optional().describe("Record path in slot when commenting on content, e.g. memory/razdel/zapis.md"),
      name: z.string().optional()
    }),
    ({ path, mode, file, name }) => client.get("/api/file/comments", { path, mode, file, name })
  );

  reg(
    "append_comment",
    "Append discuss comment to manifest or file in slot. Do not use create_content or write_file in comments/.",
    z.object({
      path: pagePath,
      body: z.string().min(1),
      author: z.string().optional().describe("Display author, default guest"),
      replyTo: z.string().optional().describe("Parent comment file id, e.g. 2026-08-08_14-00-00-123.md"),
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, body, author, replyTo, mode, file, name }) =>
      client.post("/api/file/comments", { path, body, author, replyTo, mode, file, name })
  );

  reg(
    "toggle_comment_reaction",
    "Toggle reaction on a discuss comment (default reaction: up).",
    z.object({
      path: pagePath,
      commentId: z.string().min(1).describe("Comment file id, e.g. 2026-08-08_14-00-00-123.md"),
      reaction: z.string().optional().describe("Default up"),
      author: z.string().optional(),
      mode: z.string().optional(),
      file: z.string().optional(),
      name: z.string().optional()
    }),
    ({ path, commentId, reaction, author, mode, file, name }) =>
      client.post("/api/file/comments/reaction", { path, commentId, reaction, author, mode, file, name })
  );

  // ── Workspace pads + FS + system ───────────────────────────────────────────

  registerWorkspacePadTools(reg, client);
  registerWorkspaceFsTools(reg, client);
  registerExecTools(reg, client, pagePath);
  registerWebSearchTools(reg, client);
  registerAgentUtilsTools(reg, client);
  registerSidecarTools(reg, client);

  reg(
    "list_system_files",
    "List agent system files (AGENTS.md, SKILL.md, …). For shared NOTE/TODO pads use read_workspace_note / read_workspace_todo.",
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
