import { z } from "zod";

const workspaceId = z
  .string()
  .min(1)
  .describe("Target workspace id from list_workspaces (not the MCP session context unless the same)");

const groupId = z.string().min(1).describe("Workspace group id from list_workspace_groups");

export function registerWorkspaceTools(reg, client) {
  reg(
    "create_workspace",
    "Create a new workspace (folder + manifest.md) and register it in the platform registry. Optional groupId to place it in a sidebar group.",
    z.object({
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
    (payload) =>
      client.post(
        "/api/agents/create",
        {
          ...payload,
          register: true
        },
        { agentScope: false }
      ),
    { agentScope: false }
  );

  reg(
    "register_workspace",
    "Adopt an existing workspace folder into the platform registry (подхват). The folder must already exist and contain manifest.md with awn-type awn.page.ws. Does not create the folder or manifest — use create_workspace for that. Idempotent if the path is already in the registry (alreadyRegistered: true).",
    z.object({
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
    (payload) => client.post("/api/agents/register", payload, { agentScope: false }),
    { agentScope: false }
  );

  reg(
    "discover_workspaces",
    "Scan disk for workspace folders that already have manifest.md (awn.page.ws): project workspaces/, home, Desktop, optional roots. Use register_workspace with path to add one to the registry.",
    z.object({
      roots: z.array(z.string()).optional().describe("Extra absolute or project-relative roots to scan"),
      maxDepth: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe("Directory depth (default 6)")
    }),
    (payload) =>
      client.post(
        "/api/agents/discover",
        {
          ...(payload?.roots ? { roots: payload.roots } : {}),
          ...(payload?.maxDepth != null ? { maxDepth: payload.maxDepth } : {})
        },
        { agentScope: false }
      ),
    { agentScope: false }
  );

  reg(
    "update_workspace",
    "Update workspace metadata and registry flags. Does not move/delete the workspace folder.",
    z.object({
      agentId: workspaceId,
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
    (payload) => client.patch("/api/agents/workspace", payload, { agentScope: false }),
    { agentScope: false }
  );

  reg(
    "set_default_workspace",
    "Set the default workspace opened on platform start.",
    z.object({
      agentId: workspaceId
    }),
    ({ agentId }) =>
      client.post("/api/agents/workspace/default", { agentId }, { agentScope: false }),
    { agentScope: false }
  );

  reg(
    "set_orchestrator_workspace",
    "Set the orchestrator workspace (only one; previous orchestrator is cleared).",
    z.object({
      agentId: workspaceId
    }),
    ({ agentId }) =>
      client.post("/api/agents/workspace/orchestrator", { agentId }, { agentScope: false }),
    { agentScope: false }
  );

  reg(
    "list_workspace_groups",
    "List workspace sidebar groups and which workspace ids belong to each group (plus ungrouped section settings).",
    z.object({}),
    () => client.get("/api/agents/groups", {}, { agentScope: false }),
    { agentScope: false }
  );

  reg(
    "create_workspace_group",
    "Create a workspace sidebar group (UI layout only — does not create or delete workspaces).",
    z.object({
      title: z.string().min(1),
      id: z.string().optional().describe("Slug id; auto-generated from title when omitted")
    }),
    (payload) => client.post("/api/agents/groups/create", payload, { agentScope: false }),
    { agentScope: false }
  );

  reg(
    "update_workspace_group",
    "Rename a workspace group or change appearance (light/dark).",
    z.object({
      groupId,
      title: z.string().optional(),
      appearance: z.enum(["light", "dark"]).optional()
    }),
    (payload) => client.patch("/api/agents/groups/item", payload, { agentScope: false }),
    { agentScope: false }
  );

  reg(
    "delete_workspace_group",
    "Delete a workspace group. Workspaces inside become ungrouped; folders are not deleted.",
    z.object({
      groupId,
      confirm: z
        .boolean()
        .optional()
        .describe("Required when platform confirm-delete is enabled")
    }),
    ({ groupId, confirm }) =>
      client.delete(
        "/api/agents/groups/item",
        { groupId, ...(confirm === true ? { confirm: true } : {}) },
        { agentScope: false }
      ),
    { agentScope: false }
  );

  reg(
    "assign_workspace_to_group",
    "Move a workspace into a sidebar group (one group per workspace).",
    z.object({
      agentId: workspaceId,
      groupId
    }),
    (payload) => client.post("/api/agents/groups/assign", payload, { agentScope: false }),
    { agentScope: false }
  );

  reg(
    "remove_workspace_from_group",
    "Remove a workspace from its group (ungrouped section). Does not delete the workspace.",
    z.object({
      agentId: workspaceId
    }),
    ({ agentId }) => client.post("/api/agents/groups/unassign", { agentId }, { agentScope: false }),
    { agentScope: false }
  );

  reg(
    "reorder_workspace_groups",
    "Reorder workspace sidebar groups. Pass all group ids in desired order; unknown ids are an error.",
    z.object({
      groupIds: z.array(z.string().min(1)).min(1)
    }),
    ({ groupIds }) => client.post("/api/agents/groups/reorder", { groupIds }, { agentScope: false }),
    { agentScope: false }
  );
}
