import { z } from "zod";

const workspacePath = z
  .string()
  .min(1)
  .describe(
    "Workspace-relative path, e.g. awn-container/tema/awn-storage/media/photo.png or AGENTS.md"
  );

const writeMode = z
  .enum(["append", "replace"])
  .optional()
  .describe("replace (default) — overwrite file; append — add after existing content");

export const readFileInputSchema = z.object({
  path: workspacePath,
  format: z
    .enum(["base64"])
    .optional()
    .describe("For binary files: return base64 bytes (images are returned as MCP image content)"),
  maxBytes: z
    .number()
    .int()
    .min(1024)
    .max(1_500_000)
    .optional()
    .describe("Text partial read max bytes (default 120000) or binary base64 max bytes (default 1500000)"),
  startLine: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("1-based start line for partial read (use with limitLines)"),
  limitLines: z
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .describe("Max lines to return from startLine"),
  offsetBytes: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Byte offset for partial read (alternative to startLine)")
});

export function readFileHandler(client, { path, format, maxBytes, startLine, limitLines, offsetBytes }) {
  return client.get("/api/workspace/fs/read", {
    path,
    ...(format ? { format } : {}),
    ...(maxBytes != null ? { maxBytes: String(maxBytes) } : {}),
    ...(startLine != null ? { startLine: String(startLine) } : {}),
    ...(limitLines != null ? { limitLines: String(limitLines) } : {}),
    ...(offsetBytes != null ? { offsetBytes: String(offsetBytes) } : {})
  });
}

export function formatReadFileToolResult(data, jsonText) {
  if (data?.format === "base64" && typeof data.data === "string" && data.mimeType) {
    const mimeType = String(data.mimeType).split(";")[0].trim().toLowerCase();
    const meta = {
      path: data.path,
      name: data.name,
      size: data.size,
      kind: data.kind,
      format: data.format,
      mimeType,
      truncated: data.truncated,
      offsetBytes: data.offsetBytes ?? 0,
      readBytes: data.readBytes,
      previewUrl: data.previewUrl
    };
    if (mimeType.startsWith("image/")) {
      return {
        content: [
          { type: "text", text: jsonText(meta) },
          { type: "image", data: data.data, mimeType }
        ]
      };
    }
    return {
      content: [{ type: "text", text: jsonText({ ...meta, data: data.data }) }]
    };
  }
  return null;
}

export function registerWorkspaceFsTools(reg, client, { registerReadFile } = {}) {
  const readFileDescription =
    "Read a workspace file by path (text returns content; binary returns previewUrl, or format=base64 for bytes). Partial read: startLine+limitLines (lines) or offsetBytes+maxBytes (bytes). For typed .md in slots use read_content_body; for manifest use read_page_body.";
  const readFileCall = (args) => readFileHandler(client, args);

  if (registerReadFile) {
    registerReadFile(readFileDescription, readFileInputSchema, readFileCall);
  } else {
    reg("read_file", readFileDescription, readFileInputSchema, readFileCall);
  }

  reg(
    "write_file",
    "Write a plain-text workspace file. mode=replace (default) overwrites; mode=append adds to end. Prefer patch_file for edits. Root system files (AGENTS.md, SKILL.md, …) are saved with history. For shared NOTE.md/TODO.md prefer write_workspace_note / write_workspace_todo.",
    z.object({
      path: workspacePath,
      content: z.string(),
      mode: writeMode
    }),
    ({ path, content, mode }) =>
      client.post("/api/workspace/fs/write", { path, content, ...(mode ? { mode } : {}) })
  );

  reg(
    "patch_file",
    "Replace a unique text block in a workspace file (safe edit). old_string must match exactly once unless replaceAll=true. Prefer over write_file for existing files.",
    z.object({
      path: workspacePath,
      old_string: z.string().min(1).describe("Exact text to find in the file"),
      new_string: z.string().describe("Replacement text (empty string deletes the match)"),
      replaceAll: z
        .boolean()
        .optional()
        .describe("Replace every occurrence; default false (exactly one match required)")
    }),
    ({ path, old_string, new_string, replaceAll }) =>
      client.post("/api/workspace/fs/patch", {
        path,
        old_string,
        new_string,
        ...(replaceAll ? { replaceAll: true } : {})
      })
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
