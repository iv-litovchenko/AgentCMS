import { z } from "zod";

const workspacePath = z
  .string()
  .min(1)
  .describe(
    "Workspace-relative path, e.g. awn-container/tema/awn-storage/media/photo.png or AGENTS.md"
  );

export function registerWorkspaceFsTools(reg, client) {
  reg(
    "read_file",
    "Read a workspace file by path (text returns content; binary returns previewUrl). For typed .md in slots use read_content_body; for manifest use read_page_body.",
    z.object({
      path: workspacePath,
      maxBytes: z.number().int().min(1024).max(120000).optional()
    }),
    ({ path, maxBytes }) =>
      client.get("/api/workspace/fs/read", {
        path,
        ...(maxBytes != null ? { maxBytes: String(maxBytes) } : {})
      })
  );

  reg(
    "write_file",
    "Write or overwrite a plain-text workspace file by path. Root system files (AGENTS.md, SKILL.md, …) are saved with history. For shared NOTE.md/TODO.md prefer write_workspace_note / write_workspace_todo.",
    z.object({
      path: workspacePath,
      content: z.string()
    }),
    ({ path, content }) => client.post("/api/workspace/fs/write", { path, content })
  );

  reg(
    "upload_file",
    "Upload a file (base64) to a workspace path including file name. Use for media/assets binaries and imports.",
    z.object({
      path: workspacePath.describe("Full workspace path including file name"),
      data: z.string().min(1).describe("Base64-encoded file bytes"),
      mimeType: z.string().optional()
    }),
    ({ path, data, mimeType }) => client.post("/api/workspace/fs/upload", { path, data, mimeType })
  );

  reg(
    "upload_file_from_url",
    "Download a file from http(s) URL and save to a workspace path (including file name).",
    z.object({
      path: workspacePath.describe("Full workspace path including file name"),
      url: z.string().url(),
      mimeType: z.string().optional()
    }),
    ({ path, url, mimeType }) => client.post("/api/workspace/fs/import", { path, url, mimeType })
  );

  reg(
    "list_folder",
    "List workspace folder contents by path. depth=1 (default) — one level; depth=2|all — recursive inventory.",
    z.object({
      path: z
        .string()
        .min(1)
        .describe("Workspace-relative folder path, e.g. awn-container/tema/awn-storage/media"),
      depth: z.union([z.string(), z.number()]).optional(),
      includeBody: z.boolean().optional(),
      maxBodyChars: z.number().int().min(200).max(20000).optional()
    }),
    ({ path, depth, includeBody, maxBodyChars }) =>
      client.get("/api/workspace/fs/list", {
        path,
        ...(depth != null ? { depth: String(depth) } : {}),
        ...(includeBody ? { includeBody: "true" } : {}),
        ...(maxBodyChars != null ? { maxBodyChars: String(maxBodyChars) } : {})
      })
  );
}
