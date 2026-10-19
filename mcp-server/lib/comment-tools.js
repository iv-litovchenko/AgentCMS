import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

export function registerCommentTools(reg, client, { pagePath }) {
  const listSchema = z.object({
    path: pagePath,
    mode: z.string().optional().describe("description (default) | external | media | …"),
    file: z
      .string()
      .optional()
      .describe("Record path in slot when commenting on content, e.g. memory/razdel/zapis.md"),
    name: z.string().optional()
  });
  const listHandler = ({ path, mode, file, name }) =>
    client.get("/api/file/comments", { path, mode, file, name });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "comments_list",
    legacy: "list_comments",
    description:
      "List discuss comments for manifest or a file in a slot (UI comments panel). Storage: awn-storage/comments/{target}/.",
    schema: listSchema,
    handler: listHandler
  });

  const appendSchema = z.object({
    path: pagePath,
    body: z.string().min(1),
    author: z.string().optional().describe("Display author, default guest"),
    replyTo: z.string().optional().describe("Parent comment file id, e.g. 2026-08-08_14-00-00-123.md"),
    mode: z.string().optional(),
    file: z.string().optional(),
    name: z.string().optional()
  });
  const appendHandler = ({ path, body, author, replyTo, mode, file, name }) =>
    client.post("/api/file/comments", { path, body, author, replyTo, mode, file, name });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "comment_append",
    legacy: "append_comment",
    description:
      "Append discuss comment to manifest or file in slot. Do not use content_create or write_file in comments/.",
    schema: appendSchema,
    handler: appendHandler
  });

  const reactionSchema = z.object({
    path: pagePath,
    commentId: z.string().min(1).describe("Comment file id, e.g. 2026-08-08_14-00-00-123.md"),
    reaction: z.string().optional().describe("Default up"),
    author: z.string().optional(),
    mode: z.string().optional(),
    file: z.string().optional(),
    name: z.string().optional()
  });
  const reactionHandler = ({ path, commentId, reaction, author, mode, file, name }) =>
    client.post("/api/file/comments/reaction", { path, commentId, reaction, author, mode, file, name });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "comment_reaction_toggle",
    legacy: "toggle_comment_reaction",
    description: "Toggle reaction on a discuss comment (default reaction: up).",
    schema: reactionSchema,
    handler: reactionHandler
  });

  const commentTargetFields = {
    path: pagePath,
    commentId: z.string().min(1).describe("Comment file id, e.g. 2026-08-08_14-00-00-123.md"),
    mode: z.string().optional(),
    file: z.string().optional(),
    name: z.string().optional()
  };

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "comment_read",
    legacy: "read_comment",
    description: "Read one discuss comment by commentId (awn-id in frontmatter when assigned).",
    schema: z.object(commentTargetFields),
    handler: ({ path, commentId, mode, file, name }) =>
      client.get("/api/file/comment", { path, commentId, mode, file, name })
  });

  const updateSchema = z.object({
    ...commentTargetFields,
    body: z.string().min(1)
  });
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "comment_update",
    legacy: "update_comment",
    description: "Update discuss comment body. Preserves author, replyTo, reactions; updates awn-update.",
    schema: updateSchema,
    handler: ({ path, commentId, body, mode, file, name }) =>
      client.patch("/api/file/comment", { path, commentId, body, mode, file, name })
  });

  const deleteSchema = z.object({
    ...commentTargetFields,
    confirm: z.boolean().optional().describe("Required true when platform confirm-delete is enabled")
  });
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "comment_delete",
    legacy: "delete_comment",
    description: "Delete discuss comment file. When platform confirm-delete is enabled, pass confirm=true.",
    schema: deleteSchema,
    handler: ({ path, commentId, mode, file, name }) =>
      client.delete("/api/file/comment", { path, commentId, mode, file, name })
  });
}
