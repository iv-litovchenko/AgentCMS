#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getConfig, jsonText } from "./lib/client.js";
import {
  normalizeWorkspaceScopedArgs,
  runWithWorkspaceScope,
  withAgentIdSchema,
  WORKSPACE_ID_SYNONYMS
} from "./lib/agent-scope.js";
import { InstanceRegistry } from "./lib/instance-registry.js";
import { CmsRoutingClient } from "./lib/routing-client.js";
import { parseWorkspaceRef } from "./lib/workspace-ref.js";
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
import { registerRecordTools } from "./lib/record-tools.js";
import { registerMediaCloudTools } from "./lib/media-cloud-tools.js";
import { registerBrainTools } from "./lib/brain-tools.js";
import { registerFileHubQueueTools } from "./lib/file-hub-queue-tools.js";
import { registerFactsTools } from "./lib/facts-tools.js";
import { registerGlossaryTools } from "./lib/glossary-tools.js";
import { registerReferenceTools } from "./lib/reference-tools.js";
import { registerExternalMemoryTools } from "./lib/external-memory-tools.js";
import { registerJournalTools } from "./lib/journal-tools.js";
import { registerSettingsTools } from "./lib/settings-tools.js";
import { registerPlatformTools } from "./lib/platform-tools.js";
import { registerDependenciesTools } from "./lib/dependencies-tools.js";
import { registerWorkspaceRootTools } from "./lib/workspace-root-tools.js";
import { registerGitModuleTools } from "./lib/git-module-tools.js";
import { registerShortLinksTools } from "./lib/short-links-tools.js";
import { registerAnnotationTools } from "./lib/annotation-tools.js";
import { registerIntakeTools } from "./lib/intake-tools.js";
import { registerNotificationTools } from "./lib/notification-tools.js";
import { registerNavTools } from "./lib/nav-tools.js";
import { registerVizMapTools } from "./lib/viz-map-tools.js";
import { registerSessionTools } from "./lib/session-tools.js";
import { assertWorkspaceMcpToolAllowed } from "./lib/workspace-settings-guard.js";
import { createToolRegistry, registerBatchInvokeTools } from "./lib/batch-invoke-tools.js";
import { loadMcpServerInstructions } from "./lib/mcp-instructions.js";
import { getMcpServerInfo } from "./lib/server-info.js";
import { registerCanonicalWithLegacyAlias, registerDeprecatedAlias } from "./lib/register-tool-alias.js";

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

async function listWorkspacesAcrossInstances(registry) {
  const agents = [];
  let defaultAgentId = null;
  for (const inst of registry.listInstances()) {
    try {
      const instClient = await registry.getClient(inst.id);
      const payload = await instClient.get("/api/agents", {}, { agentScope: false });
      const list = Array.isArray(payload?.agents) ? payload.agents : [];
      if (payload?.defaultAgentId && !defaultAgentId) {
        defaultAgentId = `${inst.id}:${payload.defaultAgentId}`;
      }
      for (const agent of list) {
        agents.push({
          ...agent,
          id: `${inst.id}:${agent.id}`,
          workspaceId: agent.id,
          instanceId: inst.id,
          instanceLabel: inst.label || inst.id
        });
      }
    } catch (error) {
      agents.push({
        id: `${inst.id}:`,
        instanceId: inst.id,
        instanceLabel: inst.label || inst.id,
        offline: true,
        error: error.message || String(error)
      });
    }
  }
  return { agents, defaultAgentId, instanceIds: registry.listInstances().map((i) => i.id) };
}

function createServer(options = {}) {
  const cfg = getConfig();
  const registry = new InstanceRegistry();
  const client = new CmsRoutingClient(registry);

  const instructions = loadMcpServerInstructions();
  const server = new McpServer(getMcpServerInfo(options), instructions ? { instructions } : {});
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
          const rawRef = String(
            args.workspaceId || args.agentId || cfg.defaultAgent || ""
          ).trim();
          const ref = parseWorkspaceRef(rawRef);
          await assertWorkspaceMcpToolAllowed(client, ref.workspaceId, name, scopedArgs);
          return runWithWorkspaceScope(ref, () => fn(scopedArgs));
        },
        { formatResult }
      )
    );
  };

  // ── Platform · settings (before workspace pick) ───────────────────────────

  registerSettingsTools(reg, client);
  registerPlatformTools(reg, client);

  // ── Workspaces (no agentId) ─────────────────────────────────────────────────

  const listWorkspacesHandler = () => listWorkspacesAcrossInstances(registry);
  const listWorkspacesSchema = z.object({});
  const listWorkspacesDescription =
    "START NEW CHAT: list workspaces from all configured instances. id format: instanceId:workspaceId (e.g. local:0-ws-test, server:medcenter). Pass full id as workspaceId on later tools.";

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspaces_list",
    legacy: "list_workspaces",
    description: listWorkspacesDescription,
    schema: listWorkspacesSchema,
    handler: listWorkspacesHandler,
    options: { agentScope: false }
  });

  registerDeprecatedAlias(reg, {
    canonical: "workspaces_list",
    name: "list_vaults",
    description:
      "Deprecated alias for workspaces_list — same registry of agents / vaults / хранилища.",
    schema: listWorkspacesSchema,
    handler: listWorkspacesHandler,
    options: { agentScope: false }
  });

  registerWorkspaceTools(reg, client);
  registerDependenciesTools(reg, client);

  registerSessionTools(reg, client);

  registerGitModuleTools(reg, client);
  registerShortLinksTools(reg, client);

  // ── Навигация (nav_* · WS-MAP + hub index.md) ─────────────────────────────

  registerNavTools(reg, client, pagePath);
  registerMapTools(reg, client, pagePath);
  registerVizMapTools(reg, client);
  registerRecordTools(reg, client);

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
  registerExternalMemoryTools(reg, client);
  registerJournalTools(reg, client);

  // ── awn-databases: databases_list / database_get … (legacy list_databases, database_frame_*; records → *_content_*) ─

  registerDatabaseTools(reg, client);

  // ── Page / Slot / Content / Types ──────────────────────────────────────────

  registerPageTools({ reg, client, pagePath });
  registerTypeListTools({ reg, client });
  registerSlotTools({ reg, client, pagePath });
  registerContentTools({ reg, client, pagePath });

  registerIntakeTools({ reg, client, pagePath });

  registerAnnotationTools(reg, client, { pagePath });

  // ── Workspace pads + FS + system ───────────────────────────────────────────

  registerFileHubQueueTools(reg, client);
  registerWorkspaceFsTools(reg, client);
  registerToolWebTools(reg, client);
  registerToolTools(reg, client, pagePath);
  registerAgentUtilsTools(reg, client);
  registerMediaCloudTools(reg, client, { pagePath });
  registerWorkspaceRootTools(reg, client, { jsonText });

  registerNotificationTools({ reg, client, pagePath });

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
