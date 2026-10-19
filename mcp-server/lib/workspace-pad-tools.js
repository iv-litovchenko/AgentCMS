import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const writeMode = z
  .enum(["append", "replace"])
  .optional()
  .describe("append (default) — дописать; replace — полная замена файла");

export function registerWorkspacePadTools(reg, client) {
  const noteRead = () => client.get("/api/workspace/note");
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_note_read",
    legacy: "workspace_note_read",
    description:
      "Shared NOTE.md at workspace root — notes between user and agent (sidebar). Not topic notes/ slot, not AGENTS.md.",
    schema: z.object({}),
    handler: noteRead
  });
  reg("read_workspace_note", "Deprecated alias for session_note_read.", z.object({}), noteRead);

  const noteWrite = ({ content, mode }) =>
    client.post("/api/workspace/note", { content, mode: mode || "append" });
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_note_write",
    legacy: "workspace_note_write",
    description: "Write shared NOTE.md. Default mode=append. Not topic notes/ slot.",
    schema: z.object({
      content: z.string().min(1),
      mode: writeMode
    }),
    handler: noteWrite
  });
  reg(
    "write_workspace_note",
    "Deprecated alias for session_note_write.",
    z.object({ content: z.string().min(1), mode: writeMode }),
    noteWrite
  );

  const todoRead = () => client.get("/api/workspace/todo");
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_todo_read",
    legacy: "workspace_todo_read",
    description:
      "Shared TODO.md at workspace root — agreements and tasks with user (footer). Not topic todo-single slot.",
    schema: z.object({}),
    handler: todoRead
  });
  reg("read_workspace_todo", "Deprecated alias for session_todo_read.", z.object({}), todoRead);

  const todoWrite = ({ content, mode }) =>
    client.post("/api/workspace/todo", { content, mode: mode || "append" });
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "session_todo_write",
    legacy: "workspace_todo_write",
    description: "Write shared TODO.md. Default mode=append. Not topic todo-single slot.",
    schema: z.object({
      content: z.string().min(1),
      mode: writeMode
    }),
    handler: todoWrite
  });
  reg(
    "write_workspace_todo",
    "Deprecated alias for session_todo_write.",
    z.object({ content: z.string().min(1), mode: writeMode }),
    todoWrite
  );
}
