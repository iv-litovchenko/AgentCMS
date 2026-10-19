import { z } from "zod";

const bufferRef = z
  .string()
  .min(1)
  .describe("Workspace ref: topic path, storage file path, or editor route fragment");

export function registerContextBufferTools(reg, client) {
  reg(
    "read_context_buffer",
    "Read «Буфер контекста» stash in Agent CMS UI (.agent-cms/state/context-buffer.json) — items the user collected for the agent.",
    z.object({}),
    () => client.get("/api/workspace/context-buffer")
  );

  reg(
    "append_context_buffer",
    "Add an item to the UI context buffer (pages, files, slots dragged into the buffer strip).",
    z.object({
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
    (payload) => client.post("/api/workspace/context-buffer/add", payload)
  );

  reg(
    "remove_context_buffer_item",
    "Remove one item from the UI context buffer.",
    z.object({
      id: z.string().optional(),
      ref: bufferRef.optional(),
      path: bufferRef.optional()
    }),
    (payload) => client.post("/api/workspace/context-buffer/remove", payload)
  );

  reg(
    "clear_context_buffer",
    "Clear all items from the UI context buffer.",
    z.object({}),
    () => client.post("/api/workspace/context-buffer/clear", {})
  );
}
