import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const workspacePath = z
  .string()
  .min(1)
  .describe("Workspace-relative path of the content file to queue or remove");

const FILE_HUB_INBOUND_STUB_MESSAGE =
  "Not implemented yet (stub). Shell file hub inbound pane («Загрузить файлы в хранилище») — drag-and-drop to vault. MCP inbound API planned.";

export function registerFileHubQueueTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "module_file_hub_outbound_list",
    legacy: "read_file_hub_queue",
    description:
      "module-file-hub outbound: list content queued for Shell «Выдать из хранилища» (.agent-cms/state/file-hub-queue.json).",
    schema: z.object({}),
    handler: () => client.get("/api/workspace/file-hub/queue")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "module_file_hub_outbound_enqueue",
    legacy: "add_file_to_file_hub",
    description:
      "module-file-hub outbound: enqueue workspace content for Shell export (CMS «Добавить в файлообменник»). path — workspace-relative content file.",
    schema: z.object({
      path: workspacePath,
      name: z.string().optional(),
      topic: z.string().optional(),
      place: z.string().optional(),
      size: z.number().int().nonnegative().optional()
    }),
    handler: (payload) => client.post("/api/workspace/file-hub/add", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "module_file_hub_outbound_remove",
    legacy: "remove_file_from_file_hub",
    description: "module-file-hub outbound: remove one item from export queue.",
    schema: z.object({
      id: z.string().optional().describe("Queue item id"),
      path: workspacePath.optional().describe("Workspace path if id unknown")
    }),
    handler: (payload) => client.post("/api/workspace/file-hub/remove", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "module_file_hub_outbound_clear",
    legacy: "clear_file_hub_queue",
    description: "module-file-hub outbound: clear entire export queue.",
    schema: z.object({}),
    handler: () => client.post("/api/workspace/file-hub/clear", {})
  });

  reg(
    "module_file_hub_inbound_list_zzz",
    "module-file-hub STUB: future — list inbound inbox (Shell → vault). Use Shell UI upload pane today.",
    z.object({}),
    async () => ({
      ok: false,
      stub: true,
      tool: "module_file_hub_inbound_list_zzz",
      message: FILE_HUB_INBOUND_STUB_MESSAGE
    })
  );

  reg(
    "module_file_hub_inbound_upload_zzz",
    "module-file-hub STUB: future — upload bytes into vault via file hub inbound (topic/folder target).",
    z.object({
      topic: z.string().optional().describe("Target topic or folder slug"),
      fileName: z.string().optional(),
      data: z.string().optional().describe("Base64 file bytes (planned)")
    }),
    async () => ({
      ok: false,
      stub: true,
      tool: "module_file_hub_inbound_upload_zzz",
      message: FILE_HUB_INBOUND_STUB_MESSAGE
    })
  );
}
