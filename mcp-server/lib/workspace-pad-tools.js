import { z } from "zod";

const writeMode = z
  .enum(["append", "replace"])
  .optional()
  .describe("append (default) — дописать; replace — полная замена файла");

export function registerWorkspacePadTools(reg, client) {
  reg(
    "read_workspace_note",
    "Shared NOTE.md at workspace root — notes between user and agent (sidebar). Not topic notes/ slot, not AGENTS.md.",
    z.object({}),
    () => client.get("/api/workspace/note")
  );

  reg(
    "write_workspace_note",
    "Write shared NOTE.md. Default mode=append. Not topic notes/ slot.",
    z.object({
      content: z.string().min(1),
      mode: writeMode
    }),
    ({ content, mode }) => client.post("/api/workspace/note", { content, mode: mode || "append" })
  );

  reg(
    "read_workspace_todo",
    "Shared TODO.md at workspace root — agreements and tasks with user (footer). Not topic todo-single slot.",
    z.object({}),
    () => client.get("/api/workspace/todo")
  );

  reg(
    "write_workspace_todo",
    "Write shared TODO.md. Default mode=append. Not topic todo-single slot.",
    z.object({
      content: z.string().min(1),
      mode: writeMode
    }),
    ({ content, mode }) => client.post("/api/workspace/todo", { content, mode: mode || "append" })
  );
}
