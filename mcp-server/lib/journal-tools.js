import { z } from "zod";

const journalType = z
  .enum(["life", "action", "ui", "system"])
  .optional()
  .describe("life=real-world, action=work done, ui=CMS UI, system=auto from changes");

const journalAuthor = z.enum(["user", "agent", "system"]).optional().describe("Who wrote the entry (default: agent)");

export function registerJournalTools(reg, client) {
  reg(
    "append_journal_entry",
    "Append an event to the workspace journal (.agent-cms/journal/, one file per ISO week). Use for life events, actions, notes — not full chat logs.",
    z.object({
      body: z.string().min(1).describe("What happened — plain text or markdown"),
      type: journalType,
      author: journalAuthor,
      path: z.string().optional().describe("Related workspace file path"),
      topic: z.string().optional().describe("Topic manifest path; inferred from path when omitted"),
      notify: z.boolean().optional().describe("Surface in notifications bell (default false)"),
      at: z.string().optional().describe("ISO timestamp (default: now)")
    }),
    ({ body, type, author, path, topic, notify, at }) =>
      client.post("/api/agent/workspace-journal/append", {
        body,
        type,
        author,
        path,
        topic,
        notify,
        at
      })
  );

  reg(
    "list_journal_entries",
    "List recent journal entries (newest first). Filter by topic manifest path.",
    z.object({
      topic: z.string().optional().describe("Topic manifest path filter"),
      limit: z.number().int().min(1).max(500).optional().describe("Max entries (default 100)")
    }),
    ({ topic, limit }) =>
      client.get("/api/agent/workspace-journal/list", {
        ...(topic ? { topic } : {}),
        ...(limit ? { limit } : {})
      })
  );
}
