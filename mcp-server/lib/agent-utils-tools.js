import { z } from "zod";

const pageUrl = z.string().url().describe("Public http(s) URL");
const workspacePath = z
  .string()
  .min(1)
  .describe("Workspace-relative file path, e.g. awn-container/tema/awn-storage/media/doc.pdf");

export function registerAgentUtilsTools(reg, client) {
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
    ({ url }) => client.get("/api/web/preview", { url })
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
