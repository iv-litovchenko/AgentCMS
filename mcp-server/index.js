#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AgentCmsClient, getConfig, jsonText } from "./lib/client.js";
import {
  normalizeWorkspaceScopedArgs,
  resolveWorkspaceId,
  runWithAgentId,
  withAgentIdSchema,
  WORKSPACE_ID_SYNONYMS
} from "./lib/agent-scope.js";
import { registerPageTools } from "./lib/page-tools.js";
import { registerSlotTools } from "./lib/slot-tools.js";
import { registerContentTools } from "./lib/content-tools.js";
import { registerTypeListTools } from "./lib/type-list-tools.js";
import {
  formatReadFileToolResult,
  registerWorkspaceFsTools
} from "./lib/workspace-fs-tools.js";
import { registerMapTools, registerSearchWorkspaceTools } from "./lib/map-tools.js";
import { registerRepositoryTools } from "./lib/repository-tools.js";
import { registerMediaLibraryTools } from "./lib/media-library-tools.js";
import { registerChannelTools } from "./lib/channel-tools.js";
import { registerWorkspaceTools } from "./lib/workspace-tools.js";
import { registerDatabaseTools } from "./lib/iblock-tools.js";
import { registerToolTools } from "./lib/tool-tools.js";
import { registerToolWebTools } from "./lib/web-search-tools.js";
import { registerAgentUtilsTools } from "./lib/agent-utils-tools.js";
import { registerMediaCloudTools } from "./lib/media-cloud-tools.js";
import { registerBrainTools } from "./lib/brain-tools.js";
import { registerWorkspacePadTools } from "./lib/workspace-pad-tools.js";
import { registerFileHubQueueTools } from "./lib/file-hub-queue-tools.js";
import { registerContextBufferTools } from "./lib/context-buffer-tools.js";
import { registerSidecarTools } from "./lib/sidecar-tools.js";
import { registerFactsTools } from "./lib/facts-tools.js";
import { registerGlossaryTools } from "./lib/glossary-tools.js";
import { registerReferenceTools } from "./lib/reference-tools.js";
import { registerJournalTools } from "./lib/journal-tools.js";
import { registerSettingsTools } from "./lib/settings-tools.js";
import { registerPlatformTools } from "./lib/platform-tools.js";
import { registerDependenciesTools } from "./lib/dependencies-tools.js";
import { registerWorkspaceRootTools } from "./lib/workspace-root-tools.js";
import { registerGitModuleTools } from "./lib/git-module-tools.js";
import { registerShortLinksTools } from "./lib/short-links-tools.js";
import { registerCommentTools } from "./lib/comment-tools.js";
import { assertWorkspaceMcpToolAllowed } from "./lib/workspace-settings-guard.js";
import { createToolRegistry, registerBatchInvokeTools } from "./lib/batch-invoke-tools.js";
import { loadMcpServerInstructions } from "./lib/mcp-instructions.js";
import { registerCanonicalWithLegacyAlias } from "./lib/register-tool-alias.js";

const pagePath = z
  .string()
  .min(1)
  .describe(
    "Path to topic manifest.md (awn.hub.topic|area|ws), e.g. awn-topics/finansydohody/manifest.md"
  );

function textResult(data) {
  return { content: [{ type: "text", text: typeof data === "string" ? data : jsonText(data) }] };
}

function toolError(message) {
  return { content: [{ type: "text", text: message }], isError: true };
}

function wrap(handler, { formatResult } = {}) {
  return async (args) => {
    try {
      const data = await handler(args);
      if (formatResult) {
        const formatted = formatResult(data);
        if (formatted) return formatted;
      }
      return textResult(data);
    } catch (e) {
      return toolError(e.message);
    }
  };
}

function createServer() {
  const cfg = getConfig();
  const client = new AgentCmsClient(cfg);

  const instructions = loadMcpServerInstructions();
  const server = new McpServer(
    { name: "agent-cms", version: "0.4.0" },
    instructions ? { instructions } : {}
  );
  const toolRegistry = createToolRegistry();

  const reg = (name, description, schema, fn, { agentScope = true, formatResult } = {}) => {
    toolRegistry.handlers.set(name, fn);
    toolRegistry.agentScope.set(name, agentScope);
    if (formatResult) toolRegistry.formatters.set(name, formatResult);
    const inputSchema = agentScope ? withAgentIdSchema(schema) : schema;
    const scopeNote = agentScope
      ? ` Required: workspaceId (legacy alias: agentId; ${WORKSPACE_ID_SYNONYMS}).` +
        (cfg.defaultAgent ? ` Dev-only env fallback: ${cfg.defaultAgent}.` : "")
      : "";
    server.registerTool(
      name,
      { description: description + scopeNote, inputSchema },
      wrap(
        async (args) => {
          if (!agentScope) return fn(args);
          const scopedArgs = normalizeWorkspaceScopedArgs(args, cfg.defaultAgent);
          const workspaceId = scopedArgs.workspaceId;
          await assertWorkspaceMcpToolAllowed(client, workspaceId, name, scopedArgs);
          return runWithAgentId(workspaceId, () => fn(scopedArgs));
        },
        { formatResult }
      )
    );
  };

  // ── Platform · settings (before workspace pick) ───────────────────────────

  registerSettingsTools(reg, client);
  registerPlatformTools(reg, client);

  // ── Workspaces (no agentId) ─────────────────────────────────────────────────

  const listWorkspacesHandler = () => client.get("/api/agents", {}, { agentScope: false });
  const listWorkspacesSchema = z.object({});
  const listWorkspacesDescription =
    "START NEW CHAT: list all workspaces (vaults / хранилища). Returns id, name, path, defaultAgentId. Pick workspaceId before session_context_get.";

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspaces_list",
    legacy: "list_workspaces",
    description: listWorkspacesDescription,
    schema: listWorkspacesSchema,
    handler: listWorkspacesHandler,
    options: { agentScope: false }
  });

  reg(
    "list_vaults",
    "Deprecated alias for workspaces_list — same registry of agents / vaults / хранилища.",
    listWorkspacesSchema,
    listWorkspacesHandler,
    { agentScope: false }
  );

  registerWorkspaceTools(reg, client);
  registerDependenciesTools(reg, client);

  // ── Старт / контекст (4) ───────────────────────────────────────────────────

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_context_get",
    legacy: "get_session_context",
    description:
      "START HERE (light): wsMap (fresh generated WS-MAP markdown: all manifest.md nodes + root entries — replaces list topics/databases calls) + alwaysContext (full text of always-loaded files: runtime-load-always, system md, ws-folder). Nothing else. GLOBAL-SKILL-*: client skills or platform_doc_read. Runtime registries: workspace_cron_registry_get / workspace_heartbeat_registry_get.",
    schema: z.object({}),
    handler: () => client.get("/api/agent/session-context")
  });

  const getUiFocusHandler = () => client.get("/api/agent/active-context");
  const getUiFocusSchema = z.object({});
  const getUiFocusDescription =
    "Human focus in Agent CMS browser UI (not Cursor): focus.entity (page|slot|content|system|browse|home|none), " +
    "mcp hints (path/slot/ref). Call when the user did not name a path. Response may include stale if UI was not synced (~5 min). " +
    "REST: GET /api/agent/active-context.";
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "get_ui_focus",
    legacy: "get_user_active_context_now",
    description: getUiFocusDescription,
    schema: getUiFocusSchema,
    handler: getUiFocusHandler
  });

  reg(
    "get_ui_open_location",
    "Where the user is in Agent CMS browser UI: route URL + focus (page/slot/content). Same data as get_ui_focus. REST: GET /api/agent/active-context.",
    getUiFocusSchema,
    getUiFocusHandler
  );

  const getWorkspaceAlwaysContextRegistryHandler = () => client.get("/api/agent/always-context");
  const getWorkspaceAlwaysContextRegistrySchema = z.object({});
  const getWorkspaceAlwaysContextRegistryDescription =
    "Always-context registry (same alwaysContext block as session_context_get): items include full content for runtime-load-always, workspace system md, ws-folder. No GLOBAL-SKILL-*. Full session: session_context_get.";
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_always_context_registry_get",
    legacy: "get_workspace_always_context_registry",
    description: getWorkspaceAlwaysContextRegistryDescription,
    schema: getWorkspaceAlwaysContextRegistrySchema,
    handler: getWorkspaceAlwaysContextRegistryHandler
  });
  reg(
    "list_workspace_always_context",
    "Deprecated alias for workspace_always_context_registry_get.",
    getWorkspaceAlwaysContextRegistrySchema,
    getWorkspaceAlwaysContextRegistryHandler
  );
  reg(
    "refresh_workspace_always_context",
    "Deprecated alias for workspace_always_context_registry_get.",
    getWorkspaceAlwaysContextRegistrySchema,
    getWorkspaceAlwaysContextRegistryHandler
  );

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_cron_registry_get",
    legacy: "get_workspace_cron_registry",
    description: "Registry of topics/records with awn-runtime-cron (+ schedule). Index only, not file bodies.",
    schema: z.object({}),
    handler: () => client.get("/api/agent/cron-registry")
  });
  reg(
    "list_workspace_cron",
    "Deprecated alias for workspace_cron_registry_get.",
    z.object({}),
    () => client.get("/api/agent/cron-registry")
  );

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_heartbeat_registry_get",
    legacy: "get_workspace_heartbeat_registry",
    description: "Registry of topics/records with awn-runtime-heartbeat. Index only, not file bodies.",
    schema: z.object({}),
    handler: () => client.get("/api/agent/heartbeat-registry")
  });
  reg(
    "list_workspace_heartbeat",
    "Deprecated alias for workspace_heartbeat_registry_get.",
    z.object({}),
    () => client.get("/api/agent/heartbeat-registry")
  );

  registerGitModuleTools(reg, client);
  registerShortLinksTools(reg, client);

  // ── Навигация (3) ──────────────────────────────────────────────────────────

  registerMapTools(reg, client, pagePath);

  registerSearchWorkspaceTools(reg, client);

  registerRepositoryTools(reg, client);
  registerMediaLibraryTools(reg, client, {
    registerBinaryReadFile: (name, description, schema, fn) =>
      reg(name, description, schema, fn, {
        formatResult: (data) => formatReadFileToolResult(data, jsonText)
      })
  });
  registerChannelTools(reg, client, {
    registerBinaryReadFile: (name, description, schema, fn) =>
      reg(name, description, schema, fn, {
        formatResult: (data) => formatReadFileToolResult(data, jsonText)
      })
  });

  registerBrainTools(reg, client);

  registerFactsTools(reg, client);
  registerGlossaryTools(reg, client);
  registerReferenceTools(reg, client);
  registerJournalTools(reg, client);

  // ── awn-databases: databases_list / database_get … (legacy list_databases, database_frame_*; records → *_content_*) ─

  registerDatabaseTools(reg, client);

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

  registerCommentTools(reg, client, { pagePath });

  // ── Workspace pads + FS + system ───────────────────────────────────────────

  registerWorkspacePadTools(reg, client);
  registerFileHubQueueTools(reg, client);
  registerContextBufferTools(reg, client);
  registerWorkspaceFsTools(reg, client);
  registerToolWebTools(reg, client);
  registerToolTools(reg, client, pagePath);
  registerAgentUtilsTools(reg, client);
  registerMediaCloudTools(reg, client, { pagePath });
  registerSidecarTools(reg, client);
  registerWorkspaceRootTools(reg, client, { jsonText });

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

  registerBatchInvokeTools({ reg, client, toolRegistry });

  return server;
}

export { createServer };

const isStdioMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isStdioMain) {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
