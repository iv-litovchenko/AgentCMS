import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

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
    reg(name, "Deprecated alias for session_context_buffer_read.", z.object({}), readHandler);
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
    reg(name, "Deprecated alias for session_context_buffer_append.", appendSchema, appendHandler);
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
    reg(name, "Deprecated alias for session_context_buffer_remove.", removeSchema, removeHandler);
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
    reg(name, "Deprecated alias for session_context_buffer_clear.", z.object({}), clearHandler);
  }
}
