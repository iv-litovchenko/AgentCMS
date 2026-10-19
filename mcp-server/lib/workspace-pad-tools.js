import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const writeMode = z
  .enum(["append", "replace"])
  .optional()
  .describe("append (default) — дописать; replace — полная замена файла");

export function registerWorkspacePadTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_note_read",
    legacy: "read_workspace_note",
    description:
      "Shared NOTE.md at workspace root — notes between user and agent (sidebar). Not topic notes/ slot, not AGENTS.md.",
    schema: z.object({}),
    handler: () => client.get("/api/workspace/note")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_note_write",
    legacy: "write_workspace_note",
    description: "Write shared NOTE.md. Default mode=append. Not topic notes/ slot.",
    schema: z.object({
      content: z.string().min(1),
      mode: writeMode
    }),
    handler: ({ content, mode }) => client.post("/api/workspace/note", { content, mode: mode || "append" })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_todo_read",
    legacy: "read_workspace_todo",
    description:
      "Shared TODO.md at workspace root — agreements and tasks with user (footer). Not topic todo-single slot.",
    schema: z.object({}),
    handler: () => client.get("/api/workspace/todo")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_todo_write",
    legacy: "write_workspace_todo",
    description: "Write shared TODO.md. Default mode=append. Not topic todo-single slot.",
    schema: z.object({
      content: z.string().min(1),
      mode: writeMode
    }),
    handler: ({ content, mode }) => client.post("/api/workspace/todo", { content, mode: mode || "append" })
  });
}
