import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const journalType = z
  .enum(["life", "action", "ui", "system"])
  .optional()
  .describe("life=real-world, action=work done, ui=CMS UI, system=auto from changes");

const journalAuthor = z.enum(["user", "agent", "system"]).optional().describe("Who wrote the entry (default: agent)");

export function registerJournalTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "journal_entry_append",
    legacy: "append_journal_entry",
    description:
      "Append an event to the workspace journal (.agent-cms/journal/, one file per ISO week). Use for life events, actions, notes — not full chat logs.",
    schema: z.object({
      body: z.string().min(1).describe("What happened — plain text or markdown"),
      type: journalType,
      author: journalAuthor,
      path: z.string().optional().describe("Related workspace file path"),
      topic: z.string().optional().describe("Topic manifest path; inferred from path when omitted"),
      notify: z.boolean().optional().describe("Surface in notifications bell (default false)"),
      at: z.string().optional().describe("ISO timestamp (default: now)")
    }),
    handler: ({ body, type, author, path, topic, notify, at }) =>
      client.post("/api/agent/workspace-journal/append", {
        body,
        type,
        author,
        path,
        topic,
        notify,
        at
      })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "journal_entries_list",
    legacy: "list_journal_entries",
    description: "List recent journal entries (newest first). Filter by topic manifest path.",
    schema: z.object({
      topic: z.string().optional().describe("Topic manifest path filter"),
      limit: z.number().int().min(1).max(500).optional().describe("Max entries (default 100)")
    }),
    handler: ({ topic, limit }) =>
      client.get("/api/agent/workspace-journal/list", {
        ...(topic ? { topic } : {}),
        ...(limit ? { limit } : {})
      })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_notifications_list",
    legacy: "list_workspace_notifications",
    description:
      "Notification bell feed — journal entries in UI notification format (same as GET /api/agent/workspace-notifications). Use since for incremental poll.",
    schema: z.object({
      since: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Return events with id greater than since (0 = latest batch)"),
      limit: z.number().int().min(1).max(100).optional().describe("Max events (default 50, max 100)"),
      notifyOnly: z.boolean().optional().describe("Only entries with notify: true (default false)")
    }),
    handler: ({ since, limit, notifyOnly }) =>
      client.get("/api/agent/workspace-notifications", {
        ...(since != null ? { since } : {}),
        ...(limit != null ? { limit } : {}),
        ...(notifyOnly ? { notifyOnly: "true" } : {})
      })
  });
}
