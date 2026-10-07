import { z } from "zod";

const workspaceRelPath = z
  .string()
  .min(1)
  .describe("Workspace-relative path, e.g. awn-media/shared/manifest.md");

export function registerMediaLibraryTools(reg, client) {
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
}
