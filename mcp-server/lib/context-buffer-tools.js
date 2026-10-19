import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const bufferRef = z
  .string()
  .min(1)
  .describe("Workspace ref: topic path, storage file path, or editor route fragment");

export function registerContextBufferTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "context_buffer_read",
    legacy: "read_context_buffer",
    description:
      "Read «Буфер контекста» stash in Agent CMS UI (.agent-cms/state/context-buffer.json) — items the user collected for the agent.",
    schema: z.object({}),
    handler: () => client.get("/api/workspace/context-buffer")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "context_buffer_append",
    legacy: "append_context_buffer",
    description: "Add an item to the UI context buffer (pages, files, slots dragged into the buffer strip).",
    schema: z.object({
      type: z
        .enum(["page", "content", "file", "slot", "link", "text"])
        .optional()
        .describe("Item kind; default link"),
      ref: bufferRef.optional(),
      path: bufferRef.optional().describe("Alias for ref"),
      title: z.string().optional(),
      icon: z.string().optional(),
      meta: z.record(z.unknown()).optional()
    }),
    handler: (payload) => client.post("/api/workspace/context-buffer/add", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "context_buffer_item_remove",
    legacy: "remove_context_buffer_item",
    description: "Remove one item from the UI context buffer.",
    schema: z.object({
      id: z.string().optional(),
      ref: bufferRef.optional(),
      path: bufferRef.optional()
    }),
    handler: (payload) => client.post("/api/workspace/context-buffer/remove", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "context_buffer_clear",
    legacy: "clear_context_buffer",
    description: "Clear all items from the UI context buffer.",
    schema: z.object({}),
    handler: () => client.post("/api/workspace/context-buffer/clear", {})
  });
}
