import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const pageUrl = z.string().url().describe("Public http(s) URL");

export function registerAgentUtilsTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "record_slug_generate",
    legacy: "generate_workspace_slug",
    description:
      "Derive disk slug from title/text (same rules as topic_create/content_create). preset: topic|page|content|store|database|repository|catalog|filename (page = legacy alias for topic). Pass slug to sanitize only.",
    schema: z
      .object({
        text: z.string().optional().describe("Display name or arbitrary text"),
        title: z.string().optional(),
        displayName: z.string().optional(),
        name: z.string().optional(),
        slug: z.string().optional().describe("If set, returns sanitized slug (auto: false)"),
        preset: z
          .enum(["topic", "page", "content", "store", "database", "repository", "catalog", "filename"])
          .optional()
          .describe("Default topic (page = legacy)"),
        stripExtension: z
          .boolean()
          .optional()
          .describe("For preset=filename: strip any file extension before slugify")
      })
      .refine(
        (value) =>
          Boolean(
            String(value.text || "").trim() ||
              String(value.title || "").trim() ||
              String(value.displayName || "").trim() ||
              String(value.name || "").trim() ||
              String(value.slug || "").trim()
          ),
        { message: "Provide text, title, displayName, name, or slug" }
      ),
    handler: (payload) => {
      const text =
        payload.text ?? payload.title ?? payload.displayName ?? payload.name ?? "";
      return client.get(
        "/api/workspace-slug/generate",
        {
          text,
          slug: payload.slug,
          preset: payload.preset,
          stripExtension: payload.stripExtension
        },
        { agentScope: false }
      );
    },
    options: { agentScope: false }
  });

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
    canonical: "get_external_url_page_preview",
    legacy: "get_link_preview",
    description:
      "Preview card for a public external http(s) page (OpenGraph): title, description, image — not Agent CMS content.",
    schema: z.object({
      url: pageUrl
    }),
    handler: ({ url }) => client.get("/api/web/preview", { url }),
    options: { agentScope: false }
  });
}
