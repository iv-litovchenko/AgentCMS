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
    description:
      "List .md files in the repository root (not skills/). Agent skills: platform_skills_list. Content: platform_doc_read.",
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

  const platformSkillFileName = z
    .string()
    .min(1)
    .describe(
      "Skill file name from platform_skills_list, e.g. GLOBAL-SKILL-1-BASE.md (optional prefix skills/)"
    );

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_skills_list",
    description:
      "List Agent CMS skills in skills/GLOBAL-SKILL-*.md (name, description from frontmatter, githubRawUrl).",
    schema: z.object({}),
    handler: () => client.get("/api/platform/skills", {}, { agentScope: false }),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_skill_read",
    description:
      "Read one Agent CMS skill from skills/ by file name. Same content via platform_doc_read({ path: basename }) as legacy.",
    schema: z.object({
      path: platformSkillFileName,
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
        "/api/platform/skills/read",
        { path, ...(maxBytes != null ? { maxBytes: String(maxBytes) } : {}) },
        { agentScope: false }
      ),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_doc_write",
    legacy: "write_platform_doc",
    description:
      "Replace entire .md file in the repository root (full content, UTF-8). Same paths as platform_doc_read. Blocked in mcp-mode=readonly.",
    schema: z.object({
      path: repoRootFileName,
      content: z.string().describe("Full new file content (UTF-8)")
    }),
    handler: ({ path, content }) =>
      client.post("/api/platform/docs/write", { path, content }, { agentScope: false }),
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

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_services_list",
    description:
      "Edge-services on subdomains (all.*, qwenpaw.*, etc.): public URLs, proxy|static kind, running probe, dataPathRel on disk. Separate from /app-* platform_apps_list.",
    schema: z.object({}),
    handler: () => client.get("/api/platform/services", {}, { agentScope: false }),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_env_keys_list",
    legacy: "list_env_keys",
    description:
      "Root env: per key from .env.example — example.value (what can be) and current.* from .env (what is; secrets redacted unless app-lock).",
    schema: z.object({}),
    handler: () => client.get("/api/platform/env-keys", {}, { agentScope: false }),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_env_key_read",
    legacy: "read_env_key",
    description:
      "Read one root .env value by key (key must be in platform_env_keys_list). Secrets redacted unless app-lock session.",
    schema: z.object({
      key: z.string().min(1).describe("Env key from .env.example, e.g. AGENT_CMS_PUBLIC_URL")
    }),
    handler: ({ key }) =>
      client.get("/api/platform/env-key", { key: String(key || "").trim() }, { agentScope: false }),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_env_key_write",
    legacy: "write_env_key",
    description:
      "Write one root .env key (app-lock session required). Key must be in platform_env_keys_list.",
    schema: z.object({
      key: z.string().min(1).describe("Env key from .env.example"),
      value: z.string().describe("New value (empty string clears to KEY=)")
    }),
    handler: ({ key, value }) =>
      client.post(
        "/api/platform/env-key",
        { key: String(key || "").trim(), value: String(value ?? "") },
        { agentScope: false }
      ),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_workspace_mounts_list",
    legacy: "list_workspace_mounts",
    description:
      "Docker workspace roots: host paths mounted into cms/mcp (default ./workspaces). Source: .agent-cms-global/workspace-mounts.json + generated docker-compose.workspace-mounts.yml.",
    schema: z.object({}),
    handler: () => client.get("/api/platform/workspace-mounts", {}, { agentScope: false }),
    options: { agentScope: false }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_workspace_mounts_write",
    legacy: "write_workspace_mounts",
    description:
      "Replace workspace mount list (app-lock). Regenerates docker-compose.workspace-mounts.yml; docker compose up -d required on host.",
    schema: z.object({
      mounts: z
        .array(
          z.object({
            id: z.string().optional(),
            label: z.string().optional(),
            hostPath: z.string().min(1),
            containerPath: z.string().optional(),
            builtIn: z.boolean().optional()
          })
        )
        .min(1)
    }),
    handler: ({ mounts }) =>
      client.post("/api/platform/workspace-mounts", { mounts }, { agentScope: false }),
    options: { agentScope: false }
  });
}
