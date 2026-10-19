import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const awnIdSchema = z.object({
  id: z
    .union([z.number().int().positive(), z.string().min(1)])
    .describe('Global awn-id from frontmatter, e.g. 81, "81", or "#81" (not INDEX.md row id)')
});

function normalizeAwnIdParam(id) {
  return String(id ?? "")
    .trim()
    .replace(/^#+/, "");
}

export function registerRecordTools(reg, client) {
  const resolveByIdHandler = ({ id }) =>
    client.get("/api/workspace-id/resolve", { id: normalizeAwnIdParam(id) });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "record_find_by_id",
    legacy: "find_by_id",
    description:
      "Find workspace file path(s) by global awn-id (frontmatter awn-id). Duplicate ids return paths[] and duplicate:true.",
    schema: awnIdSchema,
    handler: resolveByIdHandler
  });
  reg(
    "resolve_workspace_id",
    "Deprecated alias for record_find_by_id.",
    awnIdSchema,
    resolveByIdHandler
  );

  const idExistsHandler = async ({ id }) => {
    const data = await resolveByIdHandler({ id });
    return {
      exists: Boolean(data?.ok ?? data?.path),
      id: data?.id ?? null,
      path: data?.path ?? null,
      paths: Array.isArray(data?.paths) ? data.paths : data?.path ? [data.path] : [],
      duplicate: Boolean(data?.duplicate),
      duplicates: data?.duplicates ?? []
    };
  };

  reg(
    "record_id_exists",
    "Check whether a global awn-id is assigned (lightweight). For full resolve use record_find_by_id.",
    awnIdSchema,
    idExistsHandler
  );

  const assignSchema = z.object({
    path: z
      .string()
      .min(1)
      .describe("Workspace-relative path to file with frontmatter, e.g. awn-topics/topic/manifest.md"),
    force: z.boolean().optional().describe("Replace existing awn-id (default false)")
  });
  const assignHandler = (payload) => client.post("/api/workspace-id/assign", payload);

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "record_id_assign",
    legacy: "assign_workspace_id",
    description:
      "Assign the next global awn-id to an existing record (manifest, content .md, sidecar). Same as UI «Присвоить id».",
    schema: assignSchema,
    handler: assignHandler
  });

  const slugGenerateSchema = z
    .object({
      text: z.string().optional().describe("Display name or arbitrary text"),
      title: z.string().optional(),
      displayName: z.string().optional(),
      name: z.string().optional(),
      slug: z.string().optional().describe("If set, returns sanitized slug (auto: false)"),
      preset: z
        .enum(["topic", "page", "content", "store", "database", "repository", "catalog", "filename"])
        .optional()
        .describe("Default topic (page = legacy alias for topic)"),
      stripExtension: z
        .boolean()
        .optional()
        .describe("For preset=filename: strip any file extension before slugify")
    })
    .refine(
      (value) =>
        Boolean(
          String(value.text || "").trim() ||
            String(value.title || "").trim() ||
            String(value.displayName || "").trim() ||
            String(value.name || "").trim() ||
            String(value.slug || "").trim()
        ),
      { message: "Provide text, title, displayName, name, or slug" }
    );

  const slugGenerateHandler = (payload) => {
    const text = payload.text ?? payload.title ?? payload.displayName ?? payload.name ?? "";
    return client.get(
      "/api/workspace-slug/generate",
      {
        text,
        slug: payload.slug,
        preset: payload.preset,
        stripExtension: payload.stripExtension
      },
      { agentScope: false }
    );
  };

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "record_generate_slug",
    legacy: "generate_workspace_slug",
    description:
      "Derive disk slug from title/text (same rules as topic_create/content_create). Does not create files.",
    schema: slugGenerateSchema,
    handler: slugGenerateHandler,
    options: { agentScope: false }
  });
  reg(
    "record_slug_generate",
    "Deprecated alias for record_generate_slug.",
    slugGenerateSchema,
    slugGenerateHandler,
    { agentScope: false }
  );

  const slugExistsSchema = z.object({
    path: z
      .string()
      .min(1)
      .describe(
        "Workspace-relative topic/hub path or slug folder (e.g. awn-topics/my-topic or …/manifest.md)"
      )
  });
  const slugExistsHandler = async ({ path }) => {
    const payload = await client.get("/api/page/exists", { path });
    return {
      exists: Boolean(payload?.exists),
      path: payload?.path ?? path
    };
  };

  reg(
    "record_slug_exists",
    "Check whether a topic/hub manifest path already exists (collision before create). For slot files use content_exists.",
    slugExistsSchema,
    slugExistsHandler
  );

  const pathResolveSchema = z.object({
    path: z
      .string()
      .min(1)
      .describe("Workspace-relative file or folder path, e.g. awn-topics/tema/awn-storage/main/readme.md")
  });
  const pathResolveHandler = ({ path }) => client.get("/api/agent/resolve-path", { path });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "record_path_resolve",
    legacy: "resolve_workspace_path",
    description:
      "Walk up from any workspace path: breadcrumbs, manifest ancestors, slot/ref, MCP placement hints.",
    schema: pathResolveSchema,
    handler: pathResolveHandler
  });
}
