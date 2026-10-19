import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

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
  reg(
    "workspace_storage_info_get",
    "Deprecated alias for workspace_summary_get.",
    workspaceSummarySchema,
    workspaceSummaryHandler,
    workspaceSummaryOptions
  );

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
