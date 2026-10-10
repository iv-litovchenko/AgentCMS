import { z } from "zod";
import { readFileHandler } from "./workspace-fs-tools.js";

const workspaceRelPath = z
  .string()
  .min(1)
  .describe("Workspace-relative path, e.g. awn-channels/telegram/manifest.md");

const channelStorageFolder = z
  .enum(["files", "assets"])
  .optional()
  .describe("awn-storage subfolder; default files (ingress storage, not topic media/)");

function normalizeChannelManifestPath(path) {
  let manifest = String(path || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!manifest.startsWith("awn-channels/")) {
    manifest = `awn-channels/${manifest}`;
  }
  if (!/\/manifest\.md$/i.test(manifest)) {
    manifest = `${manifest.replace(/\/$/, "")}/manifest.md`;
  }
  return manifest;
}

function resolveChannelStorageRel(manifestPath, folder, file) {
  const manifest = normalizeChannelManifestPath(manifestPath);
  const base = manifest.replace(/\/manifest\.md$/i, "");
  const slot = folder === "assets" ? "assets" : "files";
  const relFile = String(file || "").replace(/\\/g, "/").replace(/^\/+/, "");
  return `${base}/awn-storage/${slot}/${relFile}`;
}

function splitChannelUploadRef(fileRef) {
  const normalized = String(fileRef || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const slash = normalized.lastIndexOf("/");
  if (slash === -1) {
    return { fileName: normalized, subdir: "" };
  }
  return {
    fileName: normalized.slice(slash + 1),
    subdir: normalized.slice(0, slash)
  };
}

export function registerChannelTools(reg, client, options = {}) {
  const regRead =
    options.registerBinaryReadFile ||
    ((name, description, schema, fn) => reg(name, description, schema, fn));

  reg(
    "list_channels",
    "Catalog of workspace ingress channels under awn-channels/: manifest cards + unregistered folders + presets.",
    z.object({}),
    () => client.get("/api/agent/channels")
  );

  reg(
    "get_channel",
    "One channel card: manifest frontmatter + body from awn-channels/{slug}/manifest.md (awn.hub.channel).",
    z.object({
      path: workspaceRelPath
    }),
    ({ path }) => client.get("/api/agent/channel", { path })
  );

  reg(
    "register_channel",
    "Create awn-channels/{slug}/manifest.md and awn-storage/files|assets/ (adopt if folder exists).",
    z.object({
      slug: z.string().min(1).describe("Folder name under awn-channels/, e.g. telegram"),
      name: z.string().optional(),
      description: z.string().optional(),
      body: z.string().optional().describe("Markdown body below frontmatter")
    }),
    (payload) => client.post("/api/agent/channels", payload)
  );

  reg(
    "update_channel",
    "Update manifest frontmatter for awn-channels/{slug}/manifest.md.",
    z.object({
      path: workspaceRelPath,
      name: z.string().optional(),
      description: z.string().optional(),
      body: z.string().optional()
    }),
    (payload) => client.put("/api/agent/channels", payload)
  );

  reg(
    "list_channel_items",
    "List files and section manifests inside awn-channels/{slug}/awn-storage/files or assets.",
    z.object({
      path: workspaceRelPath,
      folder: channelStorageFolder
    }),
    async ({ path, folder }) => {
      const manifestPath = normalizeChannelManifestPath(path);
      const data = await client.get("/api/agent/channels/items", {
        path: manifestPath,
        folder: folder || "files"
      });
      if (!data || typeof data !== "object") return data;
      return {
        ...data,
        path: manifestPath,
        folder: folder || "files",
        hint:
          "Ingress storage for channel. Open a file with read_channel_file; upload with upload_channel_file."
      };
    }
  );

  regRead(
    "read_channel_file",
    "Read one file inside a channel (path = manifest, file = path inside files/ or assets/).",
    z.object({
      path: workspaceRelPath,
      file: z.string().min(1).describe("Relative path inside the channel storage folder"),
      folder: channelStorageFolder,
      format: z.enum(["base64"]).optional().describe("For images/binaries: return base64 via workspace read"),
      maxBytes: z.number().int().min(1024).max(1_500_000).optional()
    }),
    (args) => {
      const storagePath = resolveChannelStorageRel(args.path, args.folder || "files", args.file);
      return readFileHandler(client, {
        path: storagePath,
        format: args.format,
        maxBytes: args.maxBytes
      });
    }
  );

  reg(
    "upload_channel_file",
    "Upload base64 bytes into awn-channels/{slug}/awn-storage/files or assets/.",
    z.object({
      path: workspaceRelPath,
      file: z.string().min(1).describe("Target relative path including file name, e.g. inbox/photo.png"),
      data: z.string().min(1).describe("Base64-encoded file bytes"),
      folder: channelStorageFolder,
      mimeType: z.string().optional(),
      createSubdir: z
        .boolean()
        .optional()
        .describe("Create parent folders under files/ or assets/ if missing (default true)")
    }),
    ({ path, file, data, folder, mimeType, createSubdir }) => {
      const manifestPath = normalizeChannelManifestPath(path);
      const { fileName, subdir } = splitChannelUploadRef(file);
      const libraryFolder = folder || "files";
      return client.post("/api/agent/channels/file", {
        path: manifestPath,
        contextPath: manifestPath,
        fileName,
        data,
        mimeType,
        folder: libraryFolder,
        libraryFolder,
        subdir,
        createSubdir: createSubdir !== false
      });
    }
  );
}
