import { z } from "zod";

export function registerShortLinksTools(reg, client) {
  reg(
    "create_short_link",
    "Create a public short link for a workspace page (registry awn-short-links/{code}.md). Idempotent: same targetPath returns existing link unless replace=true.",
    z.object({
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
    ({ path, view, code, replace }) =>
      client.post("/api/agent/short-links", {
        targetPath: path,
        path,
        view,
        code,
        replace
      })
  );

  reg(
    "get_short_link",
    "Resolve short link by code or by target path (path query). Returns previewUrl and fullUrl when target exists.",
    z.object({
      code: z.string().optional().describe("Short link code"),
      path: z.string().optional().describe("Workspace-relative target path")
    }),
    ({ code, path }) =>
      client.get("/api/agent/short-links/resolve", {
        ...(code ? { code } : {}),
        ...(path ? { path } : {})
      })
  );

  reg(
    "delete_short_link",
    "Delete short link record from awn-short-links registry by code.",
    z.object({
      code: z.string().min(1).describe("Short link code")
    }),
    ({ code }) => client.delete(`/api/agent/short-links/${encodeURIComponent(code)}`)
  );

  reg(
    "list_short_links",
    "List all short links in workspace registry awn-short-links/.",
    z.object({}),
    () => client.get("/api/agent/short-links")
  );
}
