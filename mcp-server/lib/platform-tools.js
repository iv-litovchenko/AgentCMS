import { z } from "zod";

const repoRootFileName = z
  .string()
  .min(1)
  .describe("File name in the repository root only, e.g. README.md or TODO.md (no slashes)");

export function registerPlatformTools(reg, client) {
  reg(
    "get_platform_info",
    "Platform snapshot: versions, repo root, active workspace, network (ports, localhost/LAN URLs, TLS, MCP base URL hint), key platform settings.",
    z.object({}),
    () => client.get("/api/platform/info", {}, { agentScope: false }),
    { agentScope: false }
  );

  reg(
    "get_platform_health",
    "Platform/workspace health: search index layers summary for the active workspace (agentId), optional disk free space at repo root.",
    z.object({}),
    () => client.get("/api/platform/health", {}, { agentScope: true })
  );

  reg(
    "list_platform_docs",
    "List .md files in the repository root (not subfolders). Use read_platform_doc for content.",
    z.object({}),
    () => client.get("/api/platform/docs", {}, { agentScope: false }),
    { agentScope: false }
  );

  reg(
    "read_platform_doc",
    "Read a .md file from the repository root by file name.",
    z.object({
      path: repoRootFileName,
      maxBytes: z
        .number()
        .int()
        .min(1024)
        .max(2_000_000)
        .optional()
        .describe("Max bytes to read (default 2000000)")
    }),
    ({ path, maxBytes }) =>
      client.get(
        "/api/platform/docs/read",
        { path, ...(maxBytes != null ? { maxBytes: String(maxBytes) } : {}) },
        { agentScope: false }
      ),
    { agentScope: false }
  );

  reg(
    "write_platform_doc",
    "Replace entire .md file in the repository root (simple write). Blocked in mcp-mode=readonly.",
    z.object({
      path: repoRootFileName,
      content: z.string().describe("Full new file content (UTF-8)")
    }),
    ({ path, content }) => client.post("/api/platform/docs/write", { path, content }, { agentScope: true })
  );

  reg(
    "list_platform_config",
    "Catalog of platform configuration locations: workspace registry, platform.yml, awn-system registry, prototype data/ paths. Values: list_settings.",
    z.object({}),
    () => client.get("/api/platform/config", {}, { agentScope: false }),
    { agentScope: false }
  );
}
