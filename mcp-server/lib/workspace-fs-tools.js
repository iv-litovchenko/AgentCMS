import { z } from "zod";

const workspacePath = z
  .string()
  .min(1)
  .describe(
    "Workspace-relative path, e.g. awn-container/tema/awn-storage/media/photo.png or awn-container/Materials/readme.md"
  );

export function registerWorkspaceFsTools(reg, client) {
  reg(
    "read_file",
    "Read a workspace file by path (text returns content; binary returns previewUrl). Not for typed .md records in main/inbox/notes — use read_content_body.",
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
    "Write or overwrite a plain-text workspace file by path (.py, .html, .json, .txt, …). Root system files (AGENTS.md, SKILL.md, …) are saved with history. For .md records in memory slots use write_content_body; for manifest.md use write_page_body.",
    z.object({
      path: workspacePath,
      content: z.string()
    }),
    ({ path, content }) => client.post("/api/workspace/fs/write", { path, content })
  );

  reg(
    "upload_file",
    "Upload a file (base64) to a workspace path including file name. Example path: awn-container/tema/awn-storage/media/photo.png",
    z.object({
      path: workspacePath.describe("Full workspace path including file name"),
      data: z.string().min(1).describe("Base64-encoded file bytes"),
      mimeType: z.string().optional()
    }),
    ({ path, data, mimeType }) => client.post("/api/workspace/fs/upload", { path, data, mimeType })
  );

  reg(
    "upload_file_from_url",
    "Download a file from http(s) URL and save to workspace path (including file name).",
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
