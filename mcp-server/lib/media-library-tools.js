import { createRequire } from "node:module";
import { z } from "zod";
import { isLegacyMcpToolsEnabled } from "./mcp-legacy-tools.js";
import { registerTocTool } from "./register-toc-tool.js";
import { readFileHandler } from "./workspace-fs-tools.js";
import { readContentBody, writeContentBinary, listContentItems } from "./content-core.js";

const require = createRequire(import.meta.url);
const {
  normalizeMediaManifestPath,
  hubStorageWorkspacePath
} = require("../../lib/config/content-placement.js");

const workspaceRelPath = z
  .string()
  .min(1)
  .describe("Workspace-relative path, e.g. awn-media/demo/manifest.md");

const mediaLibraryFolder = z
  .enum(["files", "assets"])
  .optional()
  .describe("awn-storage subfolder; for awn-media libraries default is files (not topic media/)");

function normalizeMediaLibraryManifestPath(path) {
  return normalizeMediaManifestPath(path);
}

function resolveMediaLibraryStorageRel(manifestPath, folder, file) {
  return hubStorageWorkspacePath(normalizeMediaManifestPath(manifestPath), folder, file);
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

  const mediaLibraryIndexTocSchema = z.object({
    overwrite: z
      .boolean()
      .optional()
      .describe("Replace existing index.md if present (default true). false → 409 when file exists.")
  });

  const readMediaLibraryIndexDescription = "Read awn-media/index.md (catalog table of media libraries).";

  registerTocTool(reg, {
    canonical: "read_media_library_index_toc",
    legacy: "read_media_library_index",
    description: readMediaLibraryIndexDescription,
    schema: z.object({}),
    handler: () => client.get("/api/workspace/fs/read", { path: "awn-media/index.md" })
  });

  const refreshMediaLibraryIndexDescription =
    "Rebuild awn-media/index.md from registered library manifests.";

  registerTocTool(reg, {
    canonical: "refresh_media_library_index_toc",
    legacy: "refresh_media_library_index",
    description: refreshMediaLibraryIndexDescription,
    schema: mediaLibraryIndexTocSchema,
    handler: ({ overwrite } = {}) =>
      client.post("/api/agent/media-library-index", {
        ...(overwrite === false ? { overwrite: false } : {})
      })
  });

  if (!isLegacyMcpToolsEnabled()) return;

  reg(
    "list_media_library_items",
    "[Legacy] Use list_content with placement.kind=media and slot files|assets.",
    z.object({
      path: workspaceRelPath,
      folder: mediaLibraryFolder
    }),
    async ({ path, folder }) => {
      const slot = folder === "assets" ? "assets" : "files";
      const data = await listContentItems(client, {
        placement: { kind: "media", path, slot }
      });
      return {
        ...data,
        hint: "Prefer list_content with placement.kind=media."
      };
    }
  );

  regRead(
    "read_media_library_file",
    "[Legacy] Prefer read_content with placement.kind=media. Read one file inside a media library.",
    z.object({
      path: workspaceRelPath,
      file: z.string().min(1).describe("Relative path inside the library folder, e.g. prostaya-kartinka.png"),
      folder: mediaLibraryFolder,
      format: z.enum(["base64"]).optional().describe("For images/binaries: return base64 via workspace read"),
      maxBytes: z.number().int().min(1024).max(1_500_000).optional()
    }),
    async (args) => {
      const folder = args.folder || "files";
      const slot = folder === "assets" ? "assets" : "files";
      if (args.format === "base64") {
        const storagePath = resolveMediaLibraryStorageRel(args.path, folder, args.file);
        return readFileHandler(client, {
          path: storagePath,
          format: args.format,
          maxBytes: args.maxBytes
        });
      }
      return readContentBody(client, {
        placement: {
          kind: "media",
          path: args.path,
          slot,
          ref: args.file
        }
      });
    }
  );

  reg(
    "upload_media_library_file",
    "[Legacy] Prefer write_content with placement.kind=media and data (base64).",
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
      const slot = folder === "assets" ? "assets" : folder || "files";
      return writeContentBinary(client, {
        placement: { kind: "media", path, slot, ref: file },
        data,
        mimeType,
        createSubdir
      });
    }
  );
}
