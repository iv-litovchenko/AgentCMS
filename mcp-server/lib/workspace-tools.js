import { z } from "zod";
import { legacyAgentIdField, resolveWorkspaceId, workspaceIdField } from "./agent-scope.js";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const workspaceRegistryTargetShape = {
  workspaceId: workspaceIdField.optional(),
  agentId: legacyAgentIdField.optional()
};

function registryWorkspaceId(payload = {}) {
  return resolveWorkspaceId(payload);
}

const groupId = z.string().min(1).describe("Workspace group id from workspace_groups_list");

export function registerWorkspaceTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_create",
    legacy: "create_workspace",
    description:
      "Create a new workspace (folder + manifest.md) and register it in the platform registry. Optional groupId to place it in a sidebar group.",
    schema: z.object({
      name: z.string().min(1).describe("Display name (awn-name)"),
      path: z
        .string()
        .optional()
        .describe("Folder path, e.g. workspaces/my-agent. Default: workspaces/{slug-from-name}"),
      description: z.string().optional().describe("Short description (awn-description)"),
      groupId: z.string().optional().describe("Sidebar group id after create"),
      default: z.boolean().optional().describe("Make default active workspace"),
      orchestrator: z.boolean().optional().describe("Mark as orchestrator workspace"),
      active: z.boolean().optional().describe("Active in registry (default true)")
    }),
    handler: (payload) =>
      client.post(
        "/api/agents/create",
        {
          ...payload,
          register: true
        },
        { agentScope: false }
      ),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_register",
    legacy: "register_workspace",
    description:
      "Adopt an existing workspace folder into the platform registry (подхват). The folder must already exist and contain manifest.md with awn-type awn.hub.topic.ws. Does not create the folder or manifest — use workspace_create for that. Idempotent if the path is already in the registry (alreadyRegistered: true).",
    schema: z.object({
      path: z
        .string()
        .min(1)
        .describe("Existing workspace folder path, e.g. workspaces/my-agent"),
      description: z.string().optional().describe("Registry comment (manifest awn-description is unchanged)"),
      groupId: z.string().optional().describe("Sidebar group id after register"),
      default: z.boolean().optional().describe("Make default active workspace"),
      orchestrator: z.boolean().optional().describe("Mark as orchestrator workspace"),
      active: z.boolean().optional().describe("Active in registry (default true)"),
      environment: z.string().optional().describe("Registry environment label, e.g. local")
    }),
    handler: (payload) => client.post("/api/agents/register", payload, { agentScope: false }),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspaces_discover",
    legacy: "discover_workspaces",
    description:
      "Scan disk for workspace folders that already have manifest.md (awn.hub.topic.ws): project workspaces/, home, Desktop, optional roots. Use workspace_register with path to add one to the registry.",
    schema: z.object({
      roots: z.array(z.string()).optional().describe("Extra absolute or project-relative roots to scan"),
      maxDepth: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe("Directory depth (default 6)")
    }),
    handler: (payload) =>
      client.post(
        "/api/agents/discover",
        {
          ...(payload?.roots ? { roots: payload.roots } : {}),
          ...(payload?.maxDepth != null ? { maxDepth: payload.maxDepth } : {})
        },
        { agentScope: false }
      ),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_update",
    legacy: "update_workspace",
    description: "Update workspace metadata and registry flags. Does not move/delete the workspace folder.",
    schema: z.object({
      ...workspaceRegistryTargetShape,
      name: z.string().optional(),
      description: z.string().optional(),
      active: z.boolean().optional(),
      status: z.string().optional().describe("awn-status, e.g. 🟢 Открыта or 🔴 Закрыта"),
      default: z.boolean().optional(),
      orchestrator: z.boolean().optional(),
      environment: z.string().optional(),
      color: z.string().optional(),
      emoji: z.string().optional(),
      preview: z.string().optional().describe("awn-preview path, e.g. awn-storage/assets/preview/shot.png"),
      category: z.string().optional(),
      owner: z.string().optional(),
      priority: z.string().optional(),
      tags: z.array(z.string()).optional()
    }),
    handler: (payload) => {
      const agentId = registryWorkspaceId(payload);
      const { workspaceId: _w, agentId: _a, ...rest } = payload;
      return client.patch("/api/agents/workspace", { agentId, ...rest }, { agentScope: false });
    },
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_default_set",
    legacy: "set_default_workspace",
    description: "Set the default workspace opened on platform start.",
    schema: z.object({ ...workspaceRegistryTargetShape }),
    handler: (payload) =>
      client.post(
        "/api/agents/workspace/default",
        { agentId: registryWorkspaceId(payload) },
        { agentScope: false }
      ),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_orchestrator_set",
    legacy: "set_orchestrator_workspace",
    description: "Set the orchestrator workspace (only one; previous orchestrator is cleared).",
    schema: z.object({ ...workspaceRegistryTargetShape }),
    handler: (payload) =>
      client.post(
        "/api/agents/workspace/orchestrator",
        { agentId: registryWorkspaceId(payload) },
        { agentScope: false }
      ),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_groups_list",
    legacy: "list_workspace_groups",
    description:
      "List workspace sidebar groups and which workspace ids belong to each group (plus ungrouped section settings).",
    schema: z.object({}),
    handler: () => client.get("/api/agents/groups", {}, { agentScope: false }),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_group_create",
    legacy: "create_workspace_group",
    description: "Create a workspace sidebar group (UI layout only — does not create or delete workspaces).",
    schema: z.object({
      title: z.string().min(1),
      id: z.string().optional().describe("Slug id; auto-generated from title when omitted")
    }),
    handler: (payload) => client.post("/api/agents/groups/create", payload, { agentScope: false }),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_group_update",
    legacy: "update_workspace_group",
    description: "Rename a workspace group or change appearance (light/dark).",
    schema: z.object({
      groupId,
      title: z.string().optional(),
      appearance: z.enum(["light", "dark"]).optional()
    }),
    handler: (payload) => client.patch("/api/agents/groups/item", payload, { agentScope: false }),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_group_delete",
    legacy: "delete_workspace_group",
    description: "Delete a workspace group. Workspaces inside become ungrouped; folders are not deleted.",
    schema: z.object({
      groupId,
      confirm: z
        .boolean()
        .optional()
        .describe("Required when platform confirm-delete is enabled")
    }),
    handler: ({ groupId, confirm }) =>
      client.delete(
        "/api/agents/groups/item",
        { groupId, ...(confirm === true ? { confirm: true } : {}) },
        { agentScope: false }
      ),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_group_assign",
    legacy: "assign_workspace_to_group",
    description: "Move a workspace into a sidebar group (one group per workspace).",
    schema: z.object({
      ...workspaceRegistryTargetShape,
      groupId
    }),
    handler: (payload) =>
      client.post(
        "/api/agents/groups/assign",
        { agentId: registryWorkspaceId(payload), groupId: payload.groupId },
        { agentScope: false }
      ),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_group_unassign",
    legacy: "remove_workspace_from_group",
    description: "Remove a workspace from its group (ungrouped section). Does not delete the workspace.",
    schema: z.object({ ...workspaceRegistryTargetShape }),
    handler: (payload) =>
      client.post(
        "/api/agents/groups/unassign",
        { agentId: registryWorkspaceId(payload) },
        { agentScope: false }
      ),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_groups_reorder",
    legacy: "reorder_workspace_groups",
    description: "Reorder workspace sidebar groups. Pass all group ids in desired order; unknown ids are an error.",
    schema: z.object({
      groupIds: z.array(z.string().min(1)).min(1)
    }),
    handler: ({ groupIds }) => client.post("/api/agents/groups/reorder", { groupIds }, { agentScope: false }),
    options: { agentScope: false }
  });
}
