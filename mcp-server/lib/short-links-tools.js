import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

export function registerShortLinksTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "module_short_link_create",
    legacy: "create_short_link",
    description:
      "module-short-link: create a public short link for a workspace page (registry awn-short-links/{code}.md). Idempotent: same targetPath returns existing link unless replace=true.",
    schema: z.object({
      path: z.string().min(1).describe("Workspace-relative target path (manifest, .md, slot file)"),
      view: z.string().optional().describe("Optional CHPU view for full URL (preview, edit, nav, …)"),
      code: z
        .string()
        .optional()
        .describe("Optional custom code (a-z0-9, 6–32). Auto-generated if omitted"),
      replace: z
        .boolean()
        .optional()
        .describe("If true, delete existing link for this path before creating a new one")
    }),
    handler: ({ path, view, code, replace }) =>
      client.post("/api/agent/short-links", {
        targetPath: path,
        path,
        view,
        code,
        replace
      })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "module_short_link_get",
    legacy: "get_short_link",
    description:
      "module-short-link: resolve short link by code or by target path (path query). Returns previewUrl and fullUrl when target exists.",
    schema: z.object({
      code: z.string().optional().describe("Short link code"),
      path: z.string().optional().describe("Workspace-relative target path")
    }),
    handler: ({ code, path }) =>
      client.get("/api/agent/short-links/resolve", {
        ...(code ? { code } : {}),
        ...(path ? { path } : {})
      })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "module_short_link_delete",
    legacy: "delete_short_link",
    description: "module-short-link: delete short link record from awn-short-links registry by code.",
    schema: z.object({
      code: z.string().min(1).describe("Short link code")
    }),
    handler: ({ code }) => client.delete(`/api/agent/short-links/${encodeURIComponent(code)}`)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "module_short_link_list",
    legacy: "list_short_links",
    description: "module-short-link: list all short links in workspace registry awn-short-links/.",
    schema: z.object({}),
    handler: () => client.get("/api/agent/short-links")
  });
}
