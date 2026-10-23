import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const repoRootFileName = z
  .string()
  .min(1)
  .describe("File name in the repository root only, e.g. README.md or TODO.md (no slashes)");

export function registerPlatformTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_info_get",
    legacy: "get_platform_info",
    description:
      "Platform snapshot: versions, repo root, active workspace, network (ports, localhost/LAN URLs, TLS, MCP base URL hint), key platform settings.",
    schema: z.object({}),
    handler: () => client.get("/api/platform/info", {}, { agentScope: false }),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_health_get",
    legacy: "get_platform_health",
    description:
      "Platform/workspace health: search index layers summary for the active workspace (workspaceId), optional disk free space at repo root.",
    schema: z.object({}),
    handler: () => client.get("/api/platform/health", {}, { agentScope: true }),
    options: { agentScope: true }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_docs_list",
    legacy: "list_platform_docs",
    description: "List .md files in the repository root (not subfolders). Use platform_doc_read for content.",
    schema: z.object({}),
    handler: () => client.get("/api/platform/docs", {}, { agentScope: false }),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_doc_read",
    legacy: "read_platform_doc",
    description: "Read a .md file from the repository root by file name.",
    schema: z.object({
      path: repoRootFileName,
      maxBytes: z
        .number()
        .int()
        .min(1024)
        .max(2_000_000)
        .optional()
        .describe("Max bytes to read (default 2000000)")
    }),
    handler: ({ path, maxBytes }) =>
      client.get(
        "/api/platform/docs/read",
        { path, ...(maxBytes != null ? { maxBytes: String(maxBytes) } : {}) },
        { agentScope: false }
      ),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_config_list",
    legacy: "list_platform_config",
    description:
      "Catalog of platform configuration locations: workspace registry, platform.yml, awn-system registry, prototype data/ paths. Values: settings_list.",
    schema: z.object({}),
    handler: () => client.get("/api/platform/config", {}, { agentScope: false }),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_apps_list",
    legacy: "list_platform_apps",
    description:
      "Registry of platform apps (editor, app-chat, app-commander, app-control, app-mcp): public URLs, kind ui|api, optional internal ports in dev.",
    schema: z.object({
      ui: z
        .boolean()
        .optional()
        .describe("If true, only UI apps shown in Editor app switcher")
    }),
    handler: ({ ui }) =>
      client.get("/api/platform/apps", ui ? { ui: "1" } : {}, { agentScope: false }),
    options: { agentScope: false }
  });
}
