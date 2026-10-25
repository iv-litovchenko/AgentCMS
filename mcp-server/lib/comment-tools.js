import { z } from "zod";
import { registerCanonicalWithLegacyAlias, registerDeprecatedAlias } from "./register-tool-alias.js";

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
    canonical: "annotation_comments_list",
    legacy: "comments_list",
    description:
      "List annotation comments (awn.annotation.comment) for manifest or a file in a slot. Storage: awn-storage/comments/{target}/.",
    schema: listSchema,
    handler: listHandler
  });
  registerDeprecatedAlias(reg, {
    canonical: "annotation_comments_list",
    name: "list_comments",
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
    canonical: "annotation_comment_append",
    legacy: "comment_append",
    description:
      "Append annotation comment (awn.annotation.comment). Do not use content_create or write_file in comments/.",
    schema: appendSchema,
    handler: appendHandler
  });
  registerDeprecatedAlias(reg, {
    canonical: "annotation_comment_append",
    name: "append_comment",
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
    canonical: "annotation_comment_reaction_toggle",
    legacy: "comment_reaction_toggle",
    description: "Toggle reaction on an annotation comment (default reaction: up).",
    schema: reactionSchema,
    handler: reactionHandler
  });
  registerDeprecatedAlias(reg, {
    canonical: "annotation_comment_reaction_toggle",
    name: "toggle_comment_reaction",
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

  const readHandler = ({ path, commentId, mode, file, name }) =>
    client.get("/api/file/comment", { path, commentId, mode, file, name });
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "annotation_comment_read",
    legacy: "comment_read",
    description: "Read one annotation comment by commentId (awn-id in frontmatter when assigned).",
    schema: z.object(commentTargetFields),
    handler: readHandler
  });
  registerDeprecatedAlias(reg, {
    canonical: "annotation_comment_read",
    name: "read_comment",
    schema: z.object(commentTargetFields),
    handler: readHandler
  });

  const updateSchema = z.object({
    ...commentTargetFields,
    body: z.string().min(1)
  });
  const updateHandler = ({ path, commentId, body, mode, file, name }) =>
    client.patch("/api/file/comment", { path, commentId, body, mode, file, name });
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "annotation_comment_update",
    legacy: "comment_update",
    description: "Update annotation comment body. Preserves author, replyTo, reactions; updates awn-update.",
    schema: updateSchema,
    handler: updateHandler
  });
  registerDeprecatedAlias(reg, {
    canonical: "annotation_comment_update",
    name: "update_comment",
    schema: updateSchema,
    handler: updateHandler
  });

  const deleteSchema = z.object({
    ...commentTargetFields,
    confirm: z.boolean().optional().describe("Required true when platform confirm-delete is enabled")
  });
  const deleteHandler = ({ path, commentId, mode, file, name }) =>
    client.delete("/api/file/comment", { path, commentId, mode, file, name });
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "annotation_comment_delete",
    legacy: "comment_delete",
    description: "Delete annotation comment file. When platform confirm-delete is enabled, pass confirm=true.",
    schema: deleteSchema,
    handler: deleteHandler
  });
  registerDeprecatedAlias(reg, {
    canonical: "annotation_comment_delete",
    name: "delete_comment",
    schema: deleteSchema,
    handler: deleteHandler
  });
}
