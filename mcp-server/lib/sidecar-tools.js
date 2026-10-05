import { z } from "zod";

const pagePath = z
  .string()
  .min(1)
  .describe("Path to page manifest.md, e.g. awn-container/tema/manifest.md");

const workspacePath = z
  .string()
  .min(1)
  .describe("Workspace-relative path to source file, any location");

const slotKey = z
  .string()
  .min(1)
  .describe("Slot key: media, assets, inbox, scripts, repository, memory, …");

const sourceFile = z.string().min(1).describe("Source file path inside slot, e.g. deploy.sh or photo.png");

const sidecarAddress = z.object({
  sourcePath: workspacePath.optional(),
  path: pagePath.optional(),
  slot: slotKey.optional(),
  file: sourceFile.optional()
});

function sidecarQuery({ sourcePath, path, slot, file }) {
  const q = {};
  if (sourcePath) q.sourcePath = sourcePath;
  if (path) q.path = path;
  if (slot) q.slot = slot;
  if (file) q.file = file;
  return q;
}

export function registerSidecarTools(reg, client) {
  reg(
    "resolve_sidecar_path",
    "Resolve sidecar path for a workspace file. Naming: photo.png → photo.sidecar.md (same folder). Use sourcePath for any location, or path+slot+file.",
    sidecarAddress,
    (args) => client.get("/api/storage/sidecar/resolve", sidecarQuery(args))
  );

  reg(
    "read_sidecar",
    "Read sidecar metadata for a source file. Returns exists:false when sidecar was never created.",
    sidecarAddress,
    (args) => client.get("/api/storage/sidecar", sidecarQuery(args))
  );

  reg(
    "create_sidecar",
    "Explicitly create a sidecar (awn.annotation.sidecar) for an existing file. Fails with 409 if sidecar already exists. Not created automatically on upload.",
    sidecarAddress.extend({
      title: z.string().optional().describe("awn-name, default from source file name"),
      body: z.string().optional().describe("Initial description body"),
      properties: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
    }),
    ({ sourcePath, path, slot, file, title, body, properties }) =>
      client.post("/api/storage/sidecar", {
        mode: "create",
        sourcePath,
        path,
        slot,
        file,
        title,
        body,
        properties
      })
  );

  reg(
    "write_sidecar",
    "Update an existing sidecar. Sidecar must exist — use create_sidecar first. Pass full content or body/properties patch.",
    sidecarAddress.extend({
      content: z.string().optional().describe("Full markdown (frontmatter + body)"),
      body: z.string().optional().describe("Body only; keeps/patches frontmatter"),
      properties: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
    }),
    ({ sourcePath, path, slot, file, content, body, properties }) =>
      client.post("/api/storage/sidecar", {
        sourcePath,
        path,
        slot,
        file,
        content,
        body,
        properties
      })
  );

  reg(
    "delete_sidecar",
    "Delete sidecar for a source file. Does not delete the source file. 404 if sidecar was never created. Address: sourcePath or path+slot+file.",
    sidecarAddress,
    (args) => client.delete("/api/storage/sidecar", sidecarQuery(args))
  );
}
