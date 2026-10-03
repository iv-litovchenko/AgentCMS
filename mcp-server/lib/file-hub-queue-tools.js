import { z } from "zod";

const workspacePath = z
  .string()
  .min(1)
  .describe("Workspace-relative path of the file to queue or remove");

export function registerFileHubQueueTools(reg, client) {
  reg(
    "read_file_hub_queue",
    "List files queued in Shell «Файлообменник» export pane (.agent-cms/state/file-hub-queue.json).",
    z.object({}),
    () => client.get("/api/workspace/file-hub/queue")
  );

  reg(
    "send_file_to_file_hub",
    "Add a workspace file to the Shell file hub export queue (CMS «Отправить в файлообменник»).",
    z.object({
      path: workspacePath,
      name: z.string().optional(),
      topic: z.string().optional(),
      place: z.string().optional(),
      size: z.number().int().nonnegative().optional()
    }),
    (payload) => client.post("/api/workspace/file-hub/send", payload)
  );

  reg(
    "remove_file_from_file_hub",
    "Remove a file from the Shell file hub export queue (after «забрать» / drag-out).",
    z.object({
      id: z.string().optional().describe("Queue item id"),
      path: workspacePath.optional().describe("Workspace path if id unknown")
    }),
    (payload) => client.post("/api/workspace/file-hub/remove", payload)
  );
}
