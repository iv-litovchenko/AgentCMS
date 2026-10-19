import { z } from "zod";
import { registerTocTool } from "./register-toc-tool.js";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const workspaceRelPath = z
  .string()
  .min(1)
  .describe("Workspace-relative repository path, e.g. awn-repositories/my-fork/manifest.md");

export function registerRepositoryTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "repositories_list",
    legacy: "list_repositories",
    description:
      "Catalog of workspace source repos under awn-repositories/: registered manifest cards + unregistered folders (no manifest yet). Code subtree is not search-indexed.",
    schema: z.object({}),
    handler: () => client.get("/api/agent/repositories")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "repository_get",
    legacy: "get_repository",
    description:
      "One repository card: manifest frontmatter + body from awn-repositories/{slug}/manifest.md (slug = repo folder or group/repo).",
    schema: z.object({
      path: workspaceRelPath
    }),
    handler: ({ path }) => client.get("/api/agent/repository", { path })
  });

  registerTocTool(reg, {
    canonical: "read_repository_index_toc",
    description: "Read awn-repositories/index.md (catalog table of source repos).",
    schema: z.object({}),
    handler: () => client.get("/api/workspace/fs/read", { path: "awn-repositories/index.md" })
  });

  const refreshRepositoryIndexSchema = z.object({
    overwrite: z
      .boolean()
      .optional()
      .describe("Replace existing index.md if present (default true). false → 409 when file exists.")
  });

  registerTocTool(reg, {
    canonical: "refresh_repository_index_toc",
    description:
      "Rebuild awn-repositories/index.md table from repository manifests (overwrite=false skips if exists).",
    schema: refreshRepositoryIndexSchema,
    handler: ({ overwrite }) =>
      client.post("/api/agent/repository-index", {
        ...(overwrite === false ? { overwrite: false } : {})
      })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "repository_register",
    legacy: "register_repository",
    description:
      "Create awn-repositories/{slug}/manifest.md — new folder or adopt existing clone (adopted: true when folder already exists).",
    schema: z.object({
      slug: z
        .string()
        .min(1)
        .describe(
          "Path under awn-repositories/: repo folder or group/repo (group = optional parent folder), e.g. my-fork or clients/acme-site"
        ),
      name: z.string().optional(),
      description: z.string().optional(),
      origin: z.string().url().optional().describe("Git remote URL if known"),
      body: z.string().optional().describe("Markdown body below frontmatter")
    }),
    handler: (payload) => client.post("/api/agent/repositories", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "repository_update",
    legacy: "update_repository",
    description: "Update manifest frontmatter for an existing awn-repositories/{slug}/manifest.md card.",
    schema: z.object({
      path: workspaceRelPath,
      name: z.string().optional(),
      description: z.string().optional(),
      origin: z.string().optional(),
      group: z.string().optional().describe("awn-repository-group sidebar grouping label"),
      status: z.enum(["active", "study", "archived", "vendored"]).optional(),
      body: z.string().optional()
    }),
    handler: (payload) => client.put("/api/agent/repositories", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "repository_delete",
    legacy: "delete_repository",
    description: "Soft-delete repository hub folder (awn-repositories/{slug}/) to workspace recycle bin.",
    schema: z.object({ path: workspaceRelPath }),
    handler: ({ path }) => client.delete("/api/agent/repository", { path })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "repository_rename",
    legacy: "rename_repository",
    description:
      "Rename/move repository folder under awn-repositories/ (slug or group/repo). Updates groups.yml assignment when present.",
    schema: z.object({
      path: workspaceRelPath,
      slug: z
        .string()
        .min(1)
        .describe("New path under awn-repositories/, e.g. my-fork or clients/acme-site")
    }),
    handler: ({ path, slug }) => client.post("/api/agent/repositories/rename", { path, slug })
  });
}
