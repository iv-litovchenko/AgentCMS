import { z } from "zod";

const gitExtensions = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .describe("File extensions filter (default: md, txt, csv, yml, yaml)");

export function registerGitModuleTools(reg, client) {
  reg(
    "module_git_status",
    "module-git: branch, porcelain changes, recent commits. Default extensions filter: md, txt, csv, yml, yaml.",
    z.object({
      extensions: gitExtensions,
      includeCommits: z
        .boolean()
        .optional()
        .describe("Include last commits (default true)")
    }),
    ({ extensions, includeCommits }) =>
      client.get("/api/git/status", {
        ...(extensions != null ? { extensions: Array.isArray(extensions) ? extensions.join(",") : extensions } : {}),
        ...(includeCommits === false ? { includeCommits: "false" } : {})
      })
  );

  reg(
    "module_git_commit",
    "module-git: stage filtered paths (md, txt, csv, yml, yaml by default) and commit. Blocked in mcp-mode=readonly.",
    z.object({
      message: z.string().min(1).describe("Commit message"),
      extensions: gitExtensions
    }),
    ({ message, extensions }) =>
      client.post("/api/git/commit", {
        message,
        ...(extensions != null ? { extensions } : {})
      })
  );
}
