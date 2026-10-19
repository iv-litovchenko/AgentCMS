import { z } from "zod";
import { registerContextBufferTools } from "./context-buffer-tools.js";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";
import { registerWorkspacePadTools } from "./workspace-pad-tools.js";

const emptySchema = z.object({});

export function registerSessionTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_context_get",
    legacy: "get_session_context",
    description:
      "START HERE (light): wsMap (fresh WS-MAP markdown) + alwaysContext (full text of always-loaded files). Skills: platform_doc_read. Runtime lists: session_list_cron / session_list_heartbeat.",
    schema: emptySchema,
    handler: () => client.get("/api/agent/session-context")
  });

  const uiFocusHandler = () => client.get("/api/agent/active-context");
  const uiFocusDescription =
    "Human focus in Agent CMS browser UI (not Cursor): focus.entity (page|slot|content|system|browse|home|none), " +
    "mcp hints (path/slot/ref). Call when the user did not name a path. Response may include stale if UI was not synced (~5 min).";

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_ui_focus_get",
    legacy: "get_ui_focus",
    description: uiFocusDescription,
    schema: emptySchema,
    handler: uiFocusHandler
  });
  reg("get_user_active_context_now", "Deprecated alias for session_ui_focus_get.", emptySchema, uiFocusHandler);
  reg(
    "get_ui_open_location",
    "Deprecated alias for session_ui_focus_get (same active-context API).",
    emptySchema,
    uiFocusHandler
  );

  const alwaysContextHandler = () => client.get("/api/agent/always-context");
  const alwaysContextDescription =
    "Always-context list (same alwaysContext block as session_context_get): runtime-load-always, workspace system md, ws-folder.";
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_list_always_context",
    legacy: "session_always_registry_list",
    description: alwaysContextDescription,
    schema: emptySchema,
    handler: alwaysContextHandler
  });
  for (const name of [
    "workspace_always_context_registry_get",
    "get_workspace_always_context_registry",
    "list_workspace_always_context",
    "refresh_workspace_always_context",
    "session_always_registry_get"
  ]) {
    reg(name, "Deprecated alias for session_list_always_context.", emptySchema, alwaysContextHandler);
  }

  const cronRegistryHandler = () => client.get("/api/agent/cron-registry");
  const cronListDescription =
    "Topics/records with awn-runtime-cron (+ schedule). Index only, not file bodies.";
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_list_cron",
    legacy: "session_cron_registry_list",
    description: cronListDescription,
    schema: emptySchema,
    handler: cronRegistryHandler
  });
  for (const name of [
    "workspace_cron_registry_get",
    "get_workspace_cron_registry",
    "list_workspace_cron",
    "session_cron_registry_get"
  ]) {
    reg(name, "Deprecated alias for session_list_cron.", emptySchema, cronRegistryHandler);
  }

  const heartbeatRegistryHandler = () => client.get("/api/agent/heartbeat-registry");
  const heartbeatListDescription =
    "Topics/records with awn-runtime-heartbeat. Index only, not file bodies.";
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_list_heartbeat",
    legacy: "session_heartbeat_registry_list",
    description: heartbeatListDescription,
    schema: emptySchema,
    handler: heartbeatRegistryHandler
  });
  for (const name of [
    "workspace_heartbeat_registry_get",
    "get_workspace_heartbeat_registry",
    "list_workspace_heartbeat",
    "session_heartbeat_registry_get"
  ]) {
    reg(name, "Deprecated alias for session_list_heartbeat.", emptySchema, heartbeatRegistryHandler);
  }

  const sessionAgentProfileHandler = () => client.get("/api/agent/identity/agent");
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_agent_profile_get",
    legacy: "agent_identity_get",
    description:
      "Agent persona profile from awn-topics/0-agent-kit/0-agent/ (manifest.md + main.md). Not workspaceId.",
    schema: emptySchema,
    handler: sessionAgentProfileHandler
  });
  reg("get_agent_identity", "Deprecated alias for session_agent_profile_get.", emptySchema, sessionAgentProfileHandler);
  reg("session_agent_get", "Deprecated alias for session_agent_profile_get.", emptySchema, sessionAgentProfileHandler);

  const sessionUserProfileHandler = () => client.get("/api/agent/identity/user");
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_user_profile_get",
    legacy: "user_identity_get",
    description: "User profile from awn-topics/0-agent-kit/0-user/ (manifest.md + main.md).",
    schema: emptySchema,
    handler: sessionUserProfileHandler
  });
  reg("get_user_identity", "Deprecated alias for session_user_profile_get.", emptySchema, sessionUserProfileHandler);
  reg("session_user_get", "Deprecated alias for session_user_profile_get.", emptySchema, sessionUserProfileHandler);

  const registryQueriesListHandler = () => client.get("/api/agent/registry-queries");
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "registry_queries_list",
    legacy: "list_workspace_registry_queries",
    description:
      "Named registry queries (.agent-cms/settings/registry-queries.yml): always-context, cron, nav-focus, nav-main, storage-index presets.",
    schema: emptySchema,
    handler: registryQueriesListHandler
  });
  reg(
    "session_registry_queries_list",
    "Deprecated alias for registry_queries_list.",
    emptySchema,
    registryQueriesListHandler
  );

  const registryQueryRunSchema = z.object({
    id: z.string().min(1).describe("Query id, e.g. always-context, cron, nav-focus, nav-main, topics"),
    registryId: z.string().min(1).optional().describe("Alias for id")
  });
  const registryQueryRunHandler = ({ id, registryId }) =>
    client.post("/api/agent/registry-queries/run", { id: registryId || id });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "registry_query_run",
    legacy: "run_workspace_registry_query",
    description:
      "Run a named registry query by id (see registry_queries_list). Storage-index, nav-focus, nav-main, runtime cron/heartbeat, etc.",
    schema: registryQueryRunSchema,
    handler: registryQueryRunHandler
  });
  reg(
    "session_registry_query_run",
    "Deprecated alias for registry_query_run.",
    registryQueryRunSchema,
    registryQueryRunHandler
  );

  const navFocusListHandler = () => client.post("/api/agent/registry-queries/run", { id: "nav-focus" });
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_list_in_focus",
    legacy: "session_nav_focus_list",
    description:
      "Records with awn-focus (preset query nav-focus). Shorthand for registry_query_run({ id: \"nav-focus\" }).",
    schema: emptySchema,
    handler: navFocusListHandler
  });
  reg("session_nav_focus_get", "Deprecated alias for session_list_in_focus.", emptySchema, navFocusListHandler);

  const navMainListHandler = () => client.post("/api/agent/registry-queries/run", { id: "nav-main" });
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_list_on_main",
    legacy: "session_nav_main_list",
    description:
      "Records with awn-main on home (preset query nav-main). Shorthand for registry_query_run({ id: \"nav-main\" }).",
    schema: emptySchema,
    handler: navMainListHandler
  });
  reg("session_nav_main_get", "Deprecated alias for session_list_on_main.", emptySchema, navMainListHandler);

  registerWorkspacePadTools(reg, client);
  registerContextBufferTools(reg, client);
}
