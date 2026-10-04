import { z } from "zod";

const gitExtensions = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .describe(
    "File extensions filter (default: md, txt, csv, yml, yaml, json, toml, html, htm, css, scss, js, mjs, ts, sh, xml, ini, cfg, properties, sql, jsonl, ndjson, mdx)"
  );

export function registerGitModuleTools(reg, client) {
  reg(
    "module_git_status",
    "module-git: branch, changes (commitBatchId, commitAllowed, sizeBytes), recent commits, moduleConfig.commitBatches. Use before module_git_commit to pick batchIds (records, images, images#1, …).",
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
    "module_git_diff",
    "module-git: unified diff vs HEAD for filtered changes (same default extensions as module_git_status). Optional path for one file.",
    z.object({
      extensions: gitExtensions,
      path: z.string().optional().describe("Workspace-relative file path (single file)"),
      maxBytes: z
        .number()
        .int()
        .min(1024)
        .max(2_000_000)
        .optional()
        .describe("Max combined diff size (default 500000)")
    }),
    ({ extensions, path, maxBytes }) =>
      client.get("/api/git/diff", {
        ...(extensions != null ? { extensions: Array.isArray(extensions) ? extensions.join(",") : extensions } : {}),
        ...(path ? { path } : {}),
        ...(maxBytes != null ? { maxBytes } : {})
      })
  );

  reg(
    "module_git_commit",
    `module-git: commit like Git UI «Сохранить» — parties from integrations.yml (module-git-commit-batches), same limits and chunk ids.
Say «закоммить записи» → batchIds: ["records"]. «изображения» → ["images"]; if over max batch MB use ["images#1"], then ["images#2"], …
Omit batchIds to run all parties in config order (one commit per party, skip empty).
Optional messageSuffix = note under template. Legacy single commit: pass message (and optional extensions) with batched=false.
Party ids: records, records-history, images, sources, documents, media, design-2d, design-3d, design-bim, archives, other, configs.
Blocked in mcp-mode=readonly.`,
    z.object({
      batched: z
        .boolean()
        .optional()
        .describe("Default true — UI-style batched commit. Set false with message for legacy extension filter commit."),
      batchIds: z
        .array(z.string())
        .optional()
        .describe(
          "One or more party ids in commit order, e.g. [records] or [images#1]. Empty/omit = all configured parties."
        ),
      messageSuffix: z
        .string()
        .optional()
        .describe("Extra text appended to the generated commit message (UI «заметка»)."),
      message: z
        .string()
        .optional()
        .describe("Legacy only (batched=false): full commit message for a single extensions-filtered commit."),
      extensions: gitExtensions
    }),
    ({ batched, batchIds, messageSuffix, message, extensions }) => {
      const msg = String(message || "").trim();
      const hasBatchIds = Array.isArray(batchIds) && batchIds.length > 0;
      const useBatched =
        batched === true || (batched !== false && (hasBatchIds || !msg));

      if (!useBatched) {
        return client.post("/api/git/commit", {
          message: msg || "workspace save",
          ...(extensions != null ? { extensions: Array.isArray(extensions) ? extensions.join(",") : extensions } : {})
        });
      }

      return client.post("/api/git/commit", {
        batched: true,
        ...(hasBatchIds ? { batchIds } : {}),
        ...(String(messageSuffix || "").trim() ? { messageSuffix: String(messageSuffix).trim() } : {})
      });
    }
  );

  reg(
    "module_git_init",
    "module-git: git init in workspace root with initial branch main (default). Blocked in mcp-mode=readonly.",
    z.object({
      branch: z.string().optional().describe("Initial branch name (default main)")
    }),
    ({ branch }) => client.post("/api/git/init", { ...(branch ? { branch } : {}) })
  );

  reg(
    "module_git_push",
    "module-git: git push to remote (default origin, current branch, -u). Blocked in mcp-mode=readonly.",
    z.object({
      remote: z.string().optional().describe("Remote name (default origin)"),
      branch: z.string().optional().describe("Branch to push (default: current)"),
      setUpstream: z.boolean().optional().describe("Use -u (default true)")
    }),
    ({ remote, branch, setUpstream }) =>
      client.post("/api/git/push", {
        ...(remote ? { remote } : {}),
        ...(branch ? { branch } : {}),
        ...(setUpstream === false ? { setUpstream: false } : {})
      })
  );

  reg(
    "module_git_pull",
    "module-git: git pull from remote (default origin, current branch). Uses merge or rebase per integrations module-git-pull-strategy. Blocked in mcp-mode=readonly.",
    z.object({
      remote: z.string().optional().describe("Remote name (default origin)"),
      branch: z.string().optional().describe("Branch to pull (default: current)"),
      rebase: z.boolean().optional().describe("Use pull --rebase (overrides workspace strategy)"),
      strategy: z.enum(["merge", "rebase"]).optional().describe("Pull strategy when rebase not set")
    }),
    ({ remote, branch, rebase, strategy }) =>
      client.post("/api/git/pull", {
        ...(remote ? { remote } : {}),
        ...(branch ? { branch } : {}),
        ...(rebase != null ? { rebase } : {}),
        ...(strategy ? { strategy } : {})
      })
  );

  reg(
    "module_git_remote",
    "module-git: add or change remote URL (action set) or remove remote (action remove). Remotes also in module_git_status. Blocked in mcp-mode=readonly.",
    z.object({
      action: z.enum(["set", "remove"]).describe("set = add or change URL; remove = delete remote"),
      name: z.string().optional().describe("Remote name (default origin)"),
      url: z.string().optional().describe("Remote URL (required for action=set)")
    }),
    ({ action, name, url }) =>
      client.post("/api/git/remote", {
        action,
        ...(name ? { name } : {}),
        ...(url ? { url } : {})
      })
  );
}
