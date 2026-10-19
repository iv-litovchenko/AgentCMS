import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const pagePath = z
  .string()
  .min(1)
  .describe("Path to page manifest.md, e.g. awn-topics/tema/manifest.md");

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
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "annotation_sidecar_path_resolve",
    legacy: "sidecar_path_resolve",
    description:
      "Resolve sidecar path for a workspace file (awn.annotation.sidecar). Naming: photo.png → photo.sidecar.md (same folder). Use sourcePath for any location, or path+slot+file.",
    schema: sidecarAddress,
    handler: (args) => client.get("/api/storage/sidecar/resolve", sidecarQuery(args))
  });
  reg(
    "resolve_sidecar_path",
    "Deprecated alias for annotation_sidecar_path_resolve.",
    sidecarAddress,
    (args) => client.get("/api/storage/sidecar/resolve", sidecarQuery(args))
  );

  const readHandler = (args) => client.get("/api/storage/sidecar", sidecarQuery(args));
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "annotation_sidecar_read",
    legacy: "sidecar_read",
    description: "Read sidecar metadata for a source file. Returns exists:false when sidecar was never created.",
    schema: sidecarAddress,
    handler: readHandler
  });
  reg("read_sidecar", "Deprecated alias for annotation_sidecar_read.", sidecarAddress, readHandler);

  const createSchema = sidecarAddress.extend({
    title: z.string().optional().describe("awn-name, default from source file name"),
    body: z.string().optional().describe("Initial description body"),
    properties: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
  });
  const createHandler = ({ sourcePath, path, slot, file, title, body, properties }) =>
    client.post("/api/storage/sidecar", {
      mode: "create",
      sourcePath,
      path,
      slot,
      file,
      title,
      body,
      properties
    });
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "annotation_sidecar_create",
    legacy: "sidecar_create",
    description:
      "Explicitly create a sidecar (awn.annotation.sidecar) for an existing file. Fails with 409 if sidecar already exists. Not created automatically on upload.",
    schema: createSchema,
    handler: createHandler
  });
  reg("create_sidecar", "Deprecated alias for annotation_sidecar_create.", createSchema, createHandler);

  const writeSchema = sidecarAddress.extend({
    content: z.string().optional().describe("Full markdown (frontmatter + body)"),
    body: z.string().optional().describe("Body only; keeps/patches frontmatter"),
    properties: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
  });
  const writeHandler = ({ sourcePath, path, slot, file, content, body, properties }) =>
    client.post("/api/storage/sidecar", {
      sourcePath,
      path,
      slot,
      file,
      content,
      body,
      properties
    });
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "annotation_sidecar_update",
    legacy: "annotation_sidecar_write",
    description:
      "Update an existing sidecar. Sidecar must exist — use annotation_sidecar_create first. Pass full content or body/properties patch.",
    schema: writeSchema,
    handler: writeHandler
  });
  reg("sidecar_write", "Deprecated alias for annotation_sidecar_update.", writeSchema, writeHandler);
  reg("write_sidecar", "Deprecated alias for annotation_sidecar_update.", writeSchema, writeHandler);

  const deleteHandler = (args) => client.delete("/api/storage/sidecar", sidecarQuery(args));
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "annotation_sidecar_delete",
    legacy: "sidecar_delete",
    description:
      "Delete sidecar for a source file. Does not delete the source file. 404 if sidecar was never created. Address: sourcePath or path+slot+file.",
    schema: sidecarAddress,
    handler: deleteHandler
  });
  reg("delete_sidecar", "Deprecated alias for annotation_sidecar_delete.", sidecarAddress, deleteHandler);
}
