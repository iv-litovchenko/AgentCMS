import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const discussionReadSchema = (pagePath) =>
  z.object({
    path: pagePath,
    mode: z.string().optional(),
    file: z.string().optional(),
    name: z.string().optional()
  });

const discussionAppendSchema = (pagePath) =>
  z.object({
    path: pagePath,
    body: z.string().min(1),
    role: z.enum(["user", "agent"]).optional(),
    author: z.string().optional(),
    linkedFiles: z.string().optional(),
    mode: z.string().optional(),
    file: z.string().optional(),
    name: z.string().optional()
  });

export function registerIntakeTools({ reg, client, pagePath }) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "inbox_items_list",
    legacy: "list_inbox",
    description: "List inbox items with triage metadata.",
    schema: z.object({ path: pagePath }),
    handler: ({ path }) => client.get("/api/inbox", { path })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "inbox_item_triage",
    legacy: "triage_inbox_item",
    description: "Triage inbox: to-content, mark-done, set-status.",
    schema: z.object({
      path: pagePath,
      file: z.string().min(1),
      action: z.enum(["to-content", "mark-done", "set-status"]),
      status: z.enum(["new", "in-progress", "done"]).optional()
    }),
    handler: ({ path, file, action, status }) =>
      client.post("/api/inbox/triage", { path, file, action, status })
  });

  const readDiscussion = ({ path, mode, file, name }) =>
    client.get("/api/discussion", { path, mode, file, name });

  const readSchema = discussionReadSchema(pagePath);
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "discussion_read",
    legacy: "read_discussion",
    description: "Read topic discussion (slot discussion / folder discussion/).",
    schema: readSchema,
    handler: readDiscussion
  });
  reg("read_dialogs", "Deprecated alias for discussion_read.", readSchema, readDiscussion);

  const appendDiscussion = ({ path, body, role, author, linkedFiles, mode, file, name }) =>
    client.post("/api/discussion", { path, body, role, author, linkedFiles, mode, file, name });

  const appendSchema = discussionAppendSchema(pagePath);
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "discussion_append",
    legacy: "append_discussion",
    description: "Append message to topic discussion.",
    schema: appendSchema,
    handler: appendDiscussion
  });
  reg("append_dialog", "Deprecated alias for discussion_append.", appendSchema, appendDiscussion);
}
