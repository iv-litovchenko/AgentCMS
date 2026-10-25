import { z } from "zod";
import { registerCanonicalWithLegacyAlias, registerDeprecatedAlias } from "./register-tool-alias.js";

const bufferRef = z
  .string()
  .min(1)
  .describe("Workspace ref: topic path, storage file path, or editor route fragment");

export function registerContextBufferTools(reg, client) {
  const readHandler = () => client.get("/api/workspace/context-buffer");
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_context_buffer_read",
    legacy: "session_buffer_read",
    description:
      "Read «Буфер контекста» stash in Agent CMS UI (.agent-cms/state/context-buffer.json) — items the user collected for the agent.",
    schema: z.object({}),
    handler: readHandler
  });
  for (const name of ["context_buffer_read", "read_context_buffer"]) {
    registerDeprecatedAlias(reg, {
      canonical: "session_context_buffer_read",
      name,
      schema: z.object({}),
      handler: readHandler
    });
  }

  const appendSchema = z.object({
    type: z
      .enum(["page", "content", "file", "slot", "link", "text"])
      .optional()
      .describe("Item kind; default link"),
    ref: bufferRef.optional(),
    path: bufferRef.optional().describe("Alias for ref"),
    title: z.string().optional(),
    icon: z.string().optional(),
    meta: z.record(z.unknown()).optional()
  });
  const appendHandler = (payload) => client.post("/api/workspace/context-buffer/add", payload);

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_context_buffer_append",
    legacy: "session_buffer_append",
    description: "Add an item to the UI context buffer (pages, files, slots dragged into the buffer strip).",
    schema: appendSchema,
    handler: appendHandler
  });
  for (const name of ["context_buffer_append", "append_context_buffer"]) {
    registerDeprecatedAlias(reg, {
      canonical: "session_context_buffer_append",
      name,
      schema: appendSchema,
      handler: appendHandler
    });
  }

  const removeSchema = z.object({
    id: z.string().optional(),
    ref: bufferRef.optional(),
    path: bufferRef.optional()
  });
  const removeHandler = (payload) => client.post("/api/workspace/context-buffer/remove", payload);

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_context_buffer_remove",
    legacy: "session_buffer_item_remove",
    description: "Remove one item from the UI context buffer.",
    schema: removeSchema,
    handler: removeHandler
  });
  for (const name of ["context_buffer_item_remove", "remove_context_buffer_item"]) {
    registerDeprecatedAlias(reg, {
      canonical: "session_context_buffer_remove",
      name,
      schema: removeSchema,
      handler: removeHandler
    });
  }

  const clearHandler = () => client.post("/api/workspace/context-buffer/clear", {});
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_context_buffer_clear",
    legacy: "session_buffer_clear",
    description: "Clear all items from the UI context buffer.",
    schema: z.object({}),
    handler: clearHandler
  });
  for (const name of ["context_buffer_clear", "clear_context_buffer"]) {
    registerDeprecatedAlias(reg, {
      canonical: "session_context_buffer_clear",
      name,
      schema: z.object({}),
      handler: clearHandler
    });
  }

  const clipboardItemSchema = z.object({
    path: bufferRef.optional().describe("Workspace-relative path of the record/file"),
    placement: z.record(z.unknown()).optional().describe("Same placement as content_read")
  });
  const clipboardPasteSchema = z.object({
    target: z.record(z.unknown()).describe("Target placement (topic / slot / channel / …)")
  });
  const clipboardStubs = [
    ["session_clipboard_copy_zzz", "put a record/file reference into the clipboard", clipboardItemSchema],
    ["session_clipboard_cut_zzz", "like copy, but paste moves the source", clipboardItemSchema],
    ["session_clipboard_paste_zzz", "copy or move the clipboard item into target placement", clipboardPasteSchema],
    ["session_clipboard_read_zzz", "show what is in the clipboard", z.object({})],
    ["session_clipboard_clear_zzz", "empty the clipboard", z.object({})]
  ];
  for (const [name, idea, schema] of clipboardStubs) {
    reg(
      name,
      `Clipboard STUB (idea): ${idea}. Shared with Agent CMS UI. Not implemented — use content_move / content_create today.`,
      schema,
      async () => ({ ok: false, stub: true, tool: name, message: `Not implemented. Idea: ${idea}.` })
    );
  }
}
