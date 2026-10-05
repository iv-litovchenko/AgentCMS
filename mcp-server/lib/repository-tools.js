import { z } from "zod";

const workspaceRelPath = z
  .string()
  .min(1)
  .describe("Workspace-relative repository path, e.g. awn-repositories/my-fork/manifest.md");

export function registerRepositoryTools(reg, client) {
  reg(
    "list_repositories",
    "Catalog of workspace source repos under awn-repositories/: registered manifest cards + unregistered folders (no manifest yet). Code subtree is not search-indexed.",
    z.object({}),
    () => client.get("/api/agent/repositories")
  );

  reg(
    "get_repository",
    "One repository card: manifest frontmatter + body from awn-repositories/{slug}/manifest.md.",
    z.object({
      path: workspaceRelPath
    }),
    ({ path }) => client.get("/api/agent/repository", { path })
  );

  reg(
    "refresh_repository_index",
    "Rebuild awn-repositories/index.md table from repository manifests (overwrite=false skips if exists).",
    z.object({
      overwrite: z
        .boolean()
        .optional()
        .describe("Replace existing index.md if present (default true). false → 409 when file exists.")
    }),
    ({ overwrite }) =>
      client.post("/api/agent/repository-index", {
        ...(overwrite === false ? { overwrite: false } : {})
      })
  );

  reg(
    "register_repository",
    "Create awn-repositories/{slug}/manifest.md — new folder or adopt existing clone (adopted: true when folder already exists).",
    z.object({
      slug: z.string().min(1).describe("Folder name under awn-repositories/, e.g. my-voice-fork"),
      name: z.string().optional(),
      description: z.string().optional(),
      origin: z.string().url().optional().describe("Git remote URL if known"),
      body: z.string().optional().describe("Markdown body below frontmatter")
    }),
    (payload) => client.post("/api/agent/repositories", payload)
  );

  reg(
    "update_repository",
    "Update manifest frontmatter for an existing awn-repositories/{slug}/manifest.md card.",
    z.object({
      path: workspaceRelPath,
      name: z.string().optional(),
      description: z.string().optional(),
      origin: z.string().optional(),
      group: z.string().optional().describe("awn-repository-group sidebar grouping label"),
      status: z.enum(["active", "study", "archived", "vendored"]).optional(),
      body: z.string().optional()
    }),
    (payload) => client.put("/api/agent/repositories", payload)
  );
}
