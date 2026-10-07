import { z } from "zod";
import { readFileHandler } from "./workspace-fs-tools.js";

const workspaceRelPath = z
  .string()
  .min(1)
  .describe("Workspace-relative path, e.g. awn-media/demo/manifest.md");

const mediaLibraryFolder = z
  .enum(["files", "assets"])
  .optional()
  .describe("awn-storage subfolder; for awn-media libraries default is files (not topic media/)");

function normalizeMediaLibraryManifestPath(path) {
  let manifest = String(path || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!manifest.startsWith("awn-media/")) {
    manifest = `awn-media/${manifest}`;
  }
  if (!/\/manifest\.md$/i.test(manifest)) {
    manifest = `${manifest.replace(/\/$/, "")}/manifest.md`;
  }
  return manifest;
}

function resolveMediaLibraryStorageRel(manifestPath, folder, file) {
  const manifest = normalizeMediaLibraryManifestPath(manifestPath);
  const base = manifest.replace(/\/manifest\.md$/i, "");
  const slot = folder === "assets" ? "assets" : "files";
  const relFile = String(file || "").replace(/\\/g, "/").replace(/^\/+/, "");
  return `${base}/awn-storage/${slot}/${relFile}`;
}

function splitMediaLibraryUploadRef(fileRef) {
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

export function registerMediaLibraryTools(reg, client, options = {}) {
  const regRead =
    options.registerBinaryReadFile ||
    ((name, description, schema, fn) => reg(name, description, schema, fn));
  reg(
    "list_media_libraries",
    "Catalog of workspace media libraries under awn-media/: manifest cards + unregistered folders.",
    z.object({}),
    () => client.get("/api/agent/media-libraries")
  );

  reg(
    "get_media_library",
    "One media library card: manifest frontmatter + body from awn-media/{slug}/manifest.md.",
    z.object({
      path: workspaceRelPath
    }),
    ({ path }) => client.get("/api/agent/media-library", { path })
  );

  reg(
    "register_media_library",
    "Create awn-media/{slug}/manifest.md and awn-storage/files|assets/ (adopt if folder exists).",
    z.object({
      slug: z.string().min(1).describe("Folder name under awn-media/, e.g. shared-assets"),
      name: z.string().optional(),
      description: z.string().optional(),
      body: z.string().optional().describe("Markdown body below frontmatter")
    }),
    (payload) => client.post("/api/agent/media-libraries", payload)
  );

  reg(
    "update_media_library",
    "Update manifest frontmatter for awn-media/{slug}/manifest.md.",
    z.object({
      path: workspaceRelPath,
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["active", "archive"]).optional(),
      body: z.string().optional()
    }),
    (payload) => client.put("/api/agent/media-libraries", payload)
  );

  reg(
    "refresh_media_library_index",
    "Rebuild awn-media/index.md from registered library manifests.",
    z.object({}),
    () => client.post("/api/agent/media-library-index", {})
  );

  reg(
    "list_media_library_items",
    "List files and section manifests inside awn-media/{slug}/awn-storage/files or assets (same as UI media browser).",
    z.object({
      path: workspaceRelPath,
      folder: mediaLibraryFolder
    }),
    async ({ path, folder }) => {
      const manifestPath = normalizeMediaLibraryManifestPath(path);
      const data = await client.get("/api/media", {
        path: manifestPath,
        folder: folder || "files"
      });
      if (!data || typeof data !== "object") return data;
      const { content, ...lean } = data;
      return {
        ...lean,
        path: manifestPath,
        folder: folder || "files",
        hint:
          "Items are in groups (by type). Section folders have manifest.md paths in sectionManifests. " +
          "Open a file with read_media_library_file; upload with upload_media_library_file."
      };
    }
  );

  regRead(
    "read_media_library_file",
    "Read one file inside a media library (path = manifest, file = path inside files/ or assets/, e.g. photo.png or 009/note.md).",
    z.object({
      path: workspaceRelPath,
      file: z.string().min(1).describe("Relative path inside the library folder, e.g. prostaya-kartinka.png"),
      folder: mediaLibraryFolder,
      format: z.enum(["base64"]).optional().describe("For images/binaries: return base64 via workspace read"),
      maxBytes: z.number().int().min(1024).max(1_500_000).optional()
    }),
    (args) => {
      const storagePath = resolveMediaLibraryStorageRel(args.path, args.folder || "files", args.file);
      return readFileHandler(client, {
        path: storagePath,
        format: args.format,
        maxBytes: args.maxBytes
      });
    }
  );

  reg(
    "upload_media_library_file",
    "Upload base64 bytes into awn-media/{slug}/awn-storage/files or assets/.",
    z.object({
      path: workspaceRelPath,
      file: z.string().min(1).describe("Target relative path including file name, e.g. imports/photo.png"),
      data: z.string().min(1).describe("Base64-encoded file bytes"),
      folder: mediaLibraryFolder,
      mimeType: z.string().optional(),
      createSubdir: z
        .boolean()
        .optional()
        .describe("Create parent folders under files/ or assets/ if missing (default true)")
    }),
    ({ path, file, data, folder, mimeType, createSubdir }) => {
      const manifestPath = normalizeMediaLibraryManifestPath(path);
      const { fileName, subdir } = splitMediaLibraryUploadRef(file);
      const libraryFolder = folder || "files";
      return client.post("/api/media/file", {
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
