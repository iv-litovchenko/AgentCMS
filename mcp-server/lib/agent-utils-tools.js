import { z } from "zod";

const pageUrl = z.string().url().describe("Public http(s) URL");
const workspacePath = z
  .string()
  .min(1)
  .describe("Workspace-relative file path, e.g. awn-container/tema/awn-storage/media/doc.pdf");

export function registerAgentUtilsTools(reg, client) {
  reg(
    "test_mcp_connection",
    "Ping Agent CMS: ok, agentId, serverTime, cms/mcp versions. Use to verify MCP can reach the running CMS.",
    z.object({}),
    () => client.get("/api/agent/mcp-ping", {}, { agentScope: false }),
    { agentScope: false }
  );

  reg(
    "generate_workspace_slug",
    "Derive disk slug from title/text (same rules as create_page/create_content). preset: page|content|store|database|repository|catalog|filename. Pass slug to sanitize only.",
    z
      .object({
        text: z.string().optional().describe("Display name or arbitrary text"),
        title: z.string().optional(),
        displayName: z.string().optional(),
        name: z.string().optional(),
        slug: z.string().optional().describe("If set, returns sanitized slug (auto: false)"),
        preset: z
          .enum(["page", "content", "store", "database", "repository", "catalog", "filename"])
          .optional()
          .describe("Default page"),
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
    (payload) => {
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
    { agentScope: false }
  );

  reg(
    "get_workspace_storage_info",
    "Workspace storage summary: menu/workspace (fileCount, mdFileCount — .md pages only, excludes .mdback history)/intake (sidebar #menu-agent-stats), catalog (iblocks, repositories, settings), git (agent workspace root .git only: branch/clean/changes/commitCount), alwaysContextCount, cronCount, heartbeatCount, workspaceIndexStatus (like get_workspace_index_status), lastIndexedAt + summaryLine.",
    z.object({}),
    () => client.get("/api/agent/storage-summary", {}, { agentScope: false }),
    { agentScope: false }
  );

  reg(
    "get_agent_identity",
    "Agent persona and permissions from awn-agent-kit/agent/ (manifest.md + main.md).",
    z.object({}),
    () => client.get("/api/agent/identity/agent")
  );

  reg(
    "get_user_identity",
    "User profile from awn-agent-kit/user/ (manifest.md + main.md).",
    z.object({}),
    () => client.get("/api/agent/identity/user")
  );

  reg(
    "list_recent_activity",
    "Recent workspace activity feed (MCP + UI changes, notifications).",
    z.object({
      since: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Return events with id greater than since"),
      limit: z.number().int().min(1).max(100).optional().describe("Max events, default 50")
    }),
    ({ since, limit }) => client.get("/api/agent/activity", { since, limit })
  );

  reg(
    "get_link_preview",
    "OpenGraph / meta preview for a public HTML URL: title, description, image.",
    z.object({
      url: pageUrl
    }),
    ({ url }) => client.get("/api/web/preview", { url }),
    { agentScope: false }
  );

  reg(
    "extract_document_text",
    "Extract plain text from pdf, docx, xlsx, html, txt, md, json — from URL or workspace path.",
    z.object({
      url: pageUrl.optional(),
      path: workspacePath.optional(),
      maxChars: z.number().int().min(500).max(200000).optional(),
      maxBytes: z.number().int().min(10000).max(10000000).optional()
    }),
    ({ url, path, maxChars, maxBytes }) =>
      client.get("/api/web/extract", { url, path, maxChars, maxBytes })
  );
}
