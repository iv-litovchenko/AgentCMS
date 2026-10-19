import { createRequire } from "node:module";
import { z } from "zod";
import { readFileHandler } from "./workspace-fs-tools.js";
import { readContentBody, writeContentBinary, listContentItems } from "./content-core.js";
import { isLegacyMcpToolsEnabled } from "./mcp-legacy-tools.js";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const require = createRequire(import.meta.url);
const {
  normalizeChannelManifestPath,
  hubStorageWorkspacePath
} = require("../../lib/config/content-placement.js");

const workspaceRelPath = z
  .string()
  .min(1)
  .describe("Workspace-relative path, e.g. awn-channels/0-telegram/manifest.md");

const channelStorageFolder = z
  .enum(["files", "assets"])
  .optional()
  .describe("awn-storage subfolder; default files (ingress storage, not topic media/)");

function resolveChannelStorageRel(manifestPath, folder, file) {
  return hubStorageWorkspacePath(normalizeChannelManifestPath(manifestPath), folder, file);
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

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "channels_list",
    legacy: "list_channels",
    description:
      "Catalog of workspace ingress channels under awn-channels/: manifest cards + unregistered folders + presets.",
    schema: z.object({}),
    handler: () => client.get("/api/agent/channels")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "channel_get",
    legacy: "get_channel",
    description:
      "One channel card: manifest frontmatter + body from awn-channels/{slug}/manifest.md (awn.hub.channel).",
    schema: z.object({
      path: workspaceRelPath
    }),
    handler: ({ path }) => client.get("/api/agent/channel", { path })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "channel_register",
    legacy: "register_channel",
    description:
      "Create awn-channels/{slug}/manifest.md and awn-storage/files|assets/ (adopt if folder exists).",
    schema: z.object({
      slug: z.string().min(1).describe("Folder name under awn-channels/, e.g. telegram"),
      name: z.string().optional(),
      description: z.string().optional(),
      body: z.string().optional().describe("Markdown body below frontmatter")
    }),
    handler: (payload) => client.post("/api/agent/channels", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "channel_update",
    legacy: "update_channel",
    description: "Update manifest frontmatter for awn-channels/{slug}/manifest.md.",
    schema: z.object({
      path: workspaceRelPath,
      name: z.string().optional(),
      description: z.string().optional(),
      body: z.string().optional()
    }),
    handler: (payload) => client.put("/api/agent/channels", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "channel_delete",
    legacy: "delete_channel",
    description:
      "Soft-delete channel hub folder (awn-channels/{slug}/) to workspace recycle bin. Built-in presets are protected.",
    schema: z.object({ path: workspaceRelPath }),
    handler: ({ path }) => client.delete("/api/agent/channel", { path })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "channel_rename",
    legacy: "rename_channel",
    description: "Rename/move channel folder under awn-channels/ (new slug). Built-in presets are protected.",
    schema: z.object({
      path: workspaceRelPath,
      slug: z.string().min(1).describe("New folder name under awn-channels/, e.g. telegram")
    }),
    handler: ({ path, slug }) => client.post("/api/agent/channels/rename", { path, slug })
  });

  if (!isLegacyMcpToolsEnabled()) return;

  reg(
    "list_channel_items",
    "[Legacy] Use list_content with placement.kind=channel and slot (files, assets, inbox, …).",
    z.object({
      path: workspaceRelPath,
      folder: channelStorageFolder
    }),
    async ({ path, folder }) => {
      const slot =
        folder === "assets" ? "assets" : folder === "files" ? "files" : folder || "files";
      const data = await listContentItems(client, {
        placement: { kind: "channel", path, slot }
      });
      return {
        ...data,
        hint: "Prefer list_content with placement.kind=channel."
      };
    }
  );

  regRead(
    "read_channel_file",
    "[Legacy] Prefer read_content with placement.kind=channel (slot files|assets or inbox/…). Read one file inside a channel.",
    z.object({
      path: workspaceRelPath,
      file: z.string().min(1).describe("Relative path inside the channel storage folder"),
      folder: channelStorageFolder,
      format: z.enum(["base64"]).optional().describe("For images/binaries: return base64 via workspace read"),
      maxBytes: z.number().int().min(1024).max(1_500_000).optional()
    }),
    async (args) => {
      const folder = args.folder || "files";
      const slot = folder === "assets" ? "assets" : "files";
      const placementArgs = {
        placement: {
          kind: "channel",
          path: args.path,
          slot,
          ref: args.file
        }
      };
      if (args.format === "base64") {
        const storagePath = resolveChannelStorageRel(args.path, folder, args.file);
        return readFileHandler(client, {
          path: storagePath,
          format: args.format,
          maxBytes: args.maxBytes
        });
      }
      return readContentBody(client, placementArgs);
    }
  );

  reg(
    "upload_channel_file",
    "[Legacy] Prefer write_content with placement.kind=channel and data (base64).",
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
      const slot = folder === "assets" ? "assets" : folder || "files";
      return writeContentBinary(client, {
        placement: { kind: "channel", path, slot, ref: file },
        data,
        mimeType,
        createSubdir
      });
    }
  );
}
