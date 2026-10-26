import { z } from "zod";
import { registerCanonicalWithLegacyAlias, registerDeprecatedAlias } from "./register-tool-alias.js";

const pageUrl = z.string().url().describe("Public http(s) URL");

export function registerAgentUtilsTools(reg, client) {
  const workspaceSummarySchema = z.object({});
  const workspaceSummaryHandler = () =>
    client.get("/api/agent/storage-summary", {}, { agentScope: false });
  const workspaceSummaryDescription =
    "Workspace summary: menu/workspace (fileCount, mdFileCount — .md pages only, excludes .mdback history)/intake (sidebar #menu-agent-stats), catalog (iblocks, repositories, settings), git (agent workspace root .git only: branch/clean/changes/commitCount), alwaysContextCount, cronCount, heartbeatCount, workspaceIndexStatus (like index_status_get), lastIndexedAt + summaryLine.";
  const workspaceSummaryOptions = { agentScope: false };

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_summary_get",
    legacy: "get_workspace_storage_info",
    description: workspaceSummaryDescription,
    schema: workspaceSummarySchema,
    handler: workspaceSummaryHandler,
    options: workspaceSummaryOptions
  });
  registerDeprecatedAlias(reg, {
    canonical: "workspace_summary_get",
    name: "workspace_storage_info_get",
    schema: workspaceSummarySchema,
    handler: workspaceSummaryHandler,
    options: workspaceSummaryOptions
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_activity_list",
    legacy: "list_recent_activity",
    description: "Recent workspace activity feed (MCP + UI changes, notifications).",
    schema: z.object({
      since: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Return events with id greater than since"),
      limit: z.number().int().min(1).max(100).optional().describe("Max events, default 50")
    }),
    handler: ({ since, limit }) => client.get("/api/agent/activity", { since, limit })
  });

  const activityCountSchema = z.object({
    since: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Planned: count only events with id > since (same as workspace_activity_list)"),
    pathPrefix: z
      .string()
      .optional()
      .describe("Planned: limit count to workspace-relative paths starting with this prefix")
  });

  reg(
    "workspace_activity_count_zzz",
    "STUB (planned). Return { total } for `.agent-cms/state/activity.jsonl` without loading the feed. " +
      "Optional since (event id watermark) and pathPrefix. Today: use workspace_activity_list or workspace_feed_list.",
    activityCountSchema,
    async () => ({
      ok: false,
      stub: true,
      tool: "workspace_activity_count_zzz",
      planned:
        "GET /api/agent/activity/count (or cheap tail scan): { total, since?, pathPrefix? }. " +
        "Same event model as workspace_activity_list (action, path, source mcp|ui, at).",
      message: "Not implemented. Use workspace_activity_list with a small limit for now."
    })
  );

  reg(
    "workspace_activity_get_zzz",
    "STUB (planned). Fetch one activity event by numeric id from activity.jsonl. " +
      "Today: workspace_activity_list(since: id-1, limit: 1) or scan feed.",
    z.object({
      id: z.number().int().positive().describe("Activity event id (monotonic in activity.jsonl)")
    }),
    async () => ({
      ok: false,
      stub: true,
      tool: "workspace_activity_get_zzz",
      planned:
        "GET /api/agent/activity/event?id= — single row: id, action, path, manifestPath, label, source, route, at.",
      message: "Not implemented. Use workspace_activity_list with since/limit to find an event."
    })
  );

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "utility_web_page_preview",
    legacy: "get_external_page_preview_from_url",
    extraLegacy: ["get_external_url_page_preview", "get_link_preview"],
    description:
      "Preview card for a public external http(s) page (OpenGraph): title, description, image — not Agent CMS content.",
    schema: z.object({
      url: pageUrl
    }),
    handler: ({ url }) => client.get("/api/web/preview", { url }),
    options: { agentScope: false }
  });
}
