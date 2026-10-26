import { z } from "zod";
import {
  contentExists,
  getContentMeta,
  readContentBody,
  readContentMeta,
  readContentAll,
  writeContentBody,
  readContentProperties,
  writeContentProperties,
  readContentProperty,
  writeContentProperty,
  readContentSchema,
  writeContentSchema,
  createContent,
  renameContent,
  moveContent,
  deleteContent,
  listContentItems,
  listSectionCapableSlotKeys,
  mergeContent,
  splitContent,
  readContentBinary,
  writeContentBinary,
  writeContentBinaryFromUrl,
  getContentBinaryUrl,
  getWorkspaceUrlPagePreview,
  withMdRefFallback
} from "./content-core.js";
import {
  beginContentBinaryUpload,
  completeContentBinaryUpload,
  abortContentBinaryUpload,
  statusContentBinaryUpload,
  getContentBinaryMetadata
} from "./content-binary-upload.js";
import { jsonText } from "./client.js";
import { formatReadFileToolResult } from "./workspace-fs-tools.js";
import { registerCanonicalWithLegacyAlias, registerDeprecatedAlias } from "./register-tool-alias.js";
import {
  buildContentSlotSchema,
  withContentAddress,
  placementSchema,
  placementKindSchema
} from "./content-placement-zod.js";
import { isLegacyMcpToolsEnabled } from "./mcp-legacy-tools.js";
import { READ_WINDOW_DEFAULT_LINES, READ_WINDOW_MAX_LINES } from "./content-read-window.js";
import { WRITE_MODES } from "./content-write-edit.js";

const contentPartSchema = z
  .enum(["body", "properties", "schema", "meta", "all"])
  .optional()
  .default("body")
  .describe(
    "body — markdown below frontmatter; properties — YAML block; schema — section schema.yml; meta — exists/driver/stat (no body); all — meta + body + properties (+ schema when ref set)"
  );

export function registerContentTools({ reg, client, pagePath }) {
  const contentSlot = buildContentSlotSchema(listSectionCapableSlotKeys);
  const address = (extra = {}) => withContentAddress(extra, contentSlot);

  reg(
    "content_exists",
    "Check whether content exists in a slot (topic, channel, media, database, or repository placement).",
    address({}),
    (args) => withMdRefFallback(args, (a) => contentExists(client, a))
  );

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_meta_get",
    legacy: "get_content_meta",
    description: "Lightweight content metadata: exists, driver, file stat — no body. Prefer content_read with part=meta.",
    schema: address({}),
    handler: (args) => withMdRefFallback(args, (a) => getContentMeta(client, a))
  });

  const readContentDescription =
    "Read content by placement.kind: topic | channel | media | database | repository | root (or legacy path+slot). part=body|properties|schema|meta|all. " +
    "ref — file in slot with extension (folder/note.md); without extension read retries with .md (refResolved). Unknown params are rejected. " +
    `part=body reads a line window: default first ${READ_WINDOW_DEFAULT_LINES} body lines; startLine/limitLines are file lines incl. frontmatter — same numbers as search_* startLine. ` +
    "Response: startLine, endLine, totalLines, bodyStartLine (.md), hasMore, nextStartLine, hash; window grows to keep ``` code blocks whole (codeFence). " +
    "full=true — whole body (required before content_write replace). Slot main-single-csv / internal slots: whole content. root binary: format=base64 (images → MCP image content for chat clients).";

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_read",
    legacy: "read_content",
    description: readContentDescription,
    schema: address({
      part: contentPartSchema,
      format: z.enum(["base64"]).optional(),
      maxBytes: z.number().int().optional(),
      startLine: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe("1-based file line (frontmatter counted), e.g. startLine from a search hit"),
      limitLines: z
        .number()
        .int()
        .min(1)
        .max(READ_WINDOW_MAX_LINES)
        .optional()
        .describe(`Lines to return (default ${READ_WINDOW_DEFAULT_LINES})`),
      full: z.boolean().optional().describe("Return the whole body, ignore line window"),
      offsetBytes: z.number().int().min(0).optional().describe("root only: byte-offset read (no line window)")
    }),
    handler: (args) =>
      withMdRefFallback(args, (a) => {
        if (a.part === "meta") return readContentMeta(client, a);
        if (a.part === "all") return readContentAll(client, a);
        if (a.part === "properties") return readContentProperties(client, a);
        if (a.part === "schema") return readContentSchema(client, a);
        return readContentBody(client, a);
      })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "contents_list",
    legacy: "list_content",
    description:
      'List items: placement.kind topic|channel|media|database|repository + slot; or kind root + path (folder, "." for vault root; depth=1|2|all). Legacy: list_folder, list_root_files.',
    schema: z
      .object({
        placement: z
          .object({
            kind: placementKindSchema,
            path: z
              .string()
              .optional()
              .describe("Required for slots; for kind=root — folder path or \".\" (default vault root)"),
            slot: z.string().min(1).optional()
          })
          .strict()
          .optional(),
        path: z.string().optional().describe("Legacy top-level folder path when placement.kind=root"),
        slot: z.string().min(1).optional(),
        depth: z.union([z.number(), z.string()]).optional(),
        includeBody: z.boolean().optional(),
        maxBodyChars: z.number().int().min(200).max(20000).optional()
      })
      .strict(),
    handler: (args) => listContentItems(client, args)
  });

  reg(
    "contents_list_reconcile",
    "Reconcile agent memory with workspace: batch compare id and/or path (short meta: title, updatedAt). " +
      "Statuses: ok, moved, missing, path_missing, id_mismatch, duplicate, no_id. Max 50 items. " +
      "Use before cron/always refresh or after long sessions — then targeted content_read/content_write. " +
      "HTTP POST /api/content/reconcile.",
    z
      .object({
        items: z
          .array(
            z
              .object({
                id: z
                  .union([z.number().int().positive(), z.string().min(1)])
                  .optional()
                  .describe("Global awn-id (#81 ok)"),
                path: z
                  .string()
                  .min(1)
                  .optional()
                  .describe("Workspace-relative path as agent remembers it"),
                note: z.string().optional().describe("Agent hint echoed in response")
              })
              .strict()
          )
          .min(1)
          .max(50)
          .describe("Records to check; each item needs id and/or path"),
        includeMeta: z
          .boolean()
          .optional()
          .default(true)
          .describe("Include title, updatedAt, size in actual (default true)")
      })
      .strict(),
    (payload) => client.post("/api/content/reconcile", payload)
  );

  const pagePreviewSchema = address({
    path: z
      .string()
      .min(1)
      .optional()
      .describe("Workspace .md path; alternative to placement.ref"),
    view: z.string().optional().describe("Optional CHPU view for openUrl (edit, nav, …)"),
    forceView: z.boolean().optional()
  });
  const pagePreviewHandler = (args) => getWorkspaceUrlPagePreview(client, args);

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "record_preview_get",
    legacy: "get_workspace_page_preview_from_path",
    extraLegacy: ["get_workspace_url_page_preview"],
    description:
      "Preview card for an internal Agent CMS .md page: title, excerpt, preview image URL, openUrl (CHPU). " +
      "Use path (workspace-relative .md) or placement with .md ref (topic/channel/…).",
    schema: pagePreviewSchema,
    handler: pagePreviewHandler
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "record_binary_url_get",
    legacy: "get_record_binary_url_from_path",
    extraLegacy: ["content_binary_url_get", "get_content_binary_url"],
    description:
      "Absolute HTTPS URL to view binary content (image opens directly in browser). Same placement as content_binary_read. " +
      "Optional thumb + max for images. Does not return file bytes.",
    schema: address({
      thumb: z.boolean().optional().describe("Request thumbnail for images (default true)"),
      max: z.number().int().min(64).max(2000).optional().describe("Thumbnail max px (default server 480)"),
      ttlSec: z
        .number()
        .int()
        .min(60)
        .max(86400)
        .optional()
        .describe("Reserved: short-lived signed URL (not yet enforced server-side)")
    }),
    handler: (args) => getContentBinaryUrl(client, args)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_binary_read",
    legacy: "read_content_binary",
    description:
      "Read a binary file by placement (same address as content_read). Always base64; images also return MCP image content. " +
      "Not for .md — use content_read. Partial read: maxBytes, offsetBytes.",
    schema: address({
      maxBytes: z
        .number()
        .int()
        .min(1024)
        .max(1_500_000)
        .optional()
        .describe("Max bytes to return as base64 (default server limit)"),
      offsetBytes: z.number().int().min(0).optional().describe("Byte offset for partial binary read")
    }),
    handler: (args) => readContentBinary(client, args),
    options: { formatResult: (data) => formatReadFileToolResult(data, jsonText) }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_binary_upload_begin",
    description:
      "Start a large binary upload without base64. Returns uploadId + putUrl — PUT raw bytes to putUrl, then content_binary_upload_complete. Same placement as content_binary_write.",
    schema: address({
      sizeBytes: z.number().int().min(1).describe("Exact file size in bytes (required for PUT)"),
      mimeType: z.string().optional(),
      createSubdir: z.boolean().optional().describe("Create subdirs in ref (default true)")
    }),
    handler: (args) => beginContentBinaryUpload(client, args)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_binary_upload_complete",
    description: "Finalize upload after PUT to putUrl from content_binary_upload_begin.",
    schema: z.object({
      uploadId: z.string().uuid().describe("From content_binary_upload_begin")
    }),
    handler: (args) => completeContentBinaryUpload(client, args)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_binary_upload_abort",
    description: "Cancel a pending upload session and delete staging data.",
    schema: z.object({
      uploadId: z.string().uuid()
    }),
    handler: (args) => abortContentBinaryUpload(client, args)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_binary_upload_status",
    description: "Check pending upload session: pending | uploaded | ready | expired.",
    schema: z.object({
      uploadId: z.string().uuid()
    }),
    handler: (args) => statusContentBinaryUpload(client, args)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_binary_metadata_get",
    description: "File metadata (size, mimeType) without reading bytes. Workspace-resolved placement only.",
    schema: address({}),
    handler: (args) => getContentBinaryMetadata(client, args)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_binary_write",
    legacy: "write_content_binary",
    description:
      "Write/upload a binary file by placement. data (base64) required; mimeType optional. " +
      "Same paths as content_write data=… — prefer this tool for agents. Not for .md text.",
    schema: address({
      data: z.string().min(1).describe("Base64-encoded file bytes"),
      mimeType: z.string().optional(),
      createSubdir: z.boolean().optional().describe("Create subdirs in ref (default true)")
    }),
    handler: (args) => writeContentBinary(client, args)
  });

  const writeContentDescription =
    "Write content by placement (same as content_read). part=body|properties|schema. " +
    "part=body mode: replace (default, whole body; frontmatter kept) | append | prepend | patch (oldString→newString, unique unless replaceAll) | " +
    "replace_lines (startLine..endLine → content; content=\"\" deletes) | insert (afterLine or beforeLine + content). " +
    "Line numbers = content_read / search_* numbering (file lines incl. frontmatter); frontmatter lines are rejected — use part=properties. " +
    "expectedHash = hash from content_read: mismatch → conflict error; required for replace_lines/insert. " +
    "Response: startLine/endLine of changed lines, totalLines, previousHash, hash (use as next expectedHash). " +
    "Binary: data (base64); root uses placement.path as file path.";

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_write",
    legacy: "write_content",
    description: writeContentDescription,
    schema: address({
      part: contentPartSchema,
      mode: z.enum(WRITE_MODES).optional().describe("part=body edit mode (default replace)"),
      content: z.string().optional().describe("Text for replace / append / prepend / replace_lines / insert"),
      oldString: z.string().optional().describe("mode=patch: exact text to find in body"),
      newString: z.string().optional().describe("mode=patch: replacement (\"\" deletes)"),
      replaceAll: z.boolean().optional().describe("mode=patch: replace every match"),
      startLine: z.number().int().min(1).optional().describe("mode=replace_lines: first line (inclusive)"),
      endLine: z.number().int().min(1).optional().describe("mode=replace_lines: last line (inclusive, default startLine)"),
      afterLine: z.number().int().min(0).optional().describe("mode=insert: insert after this line"),
      beforeLine: z.number().int().min(1).optional().describe("mode=insert: insert before this line"),
      expectedHash: z.string().optional().describe("hash from content_read / previous write; mismatch → conflict"),
      data: z.string().optional().describe("Base64 file bytes (upload); use instead of content"),
      mimeType: z.string().optional(),
      createSubdir: z.boolean().optional()
    }),
    handler: async (args) => {
      if (args.part === "properties") return writeContentProperties(client, args);
      if (args.part === "schema") return writeContentSchema(client, args);
      return writeContentBody(client, args);
    }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_property_read",
    legacy: "read_content_property",
    description: "Read one frontmatter property of a .md content item.",
    schema: address({ key: z.string().min(1) }),
    handler: (args) => withMdRefFallback(args, (a) => readContentProperty(client, a))
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_property_write",
    legacy: "write_content_property",
    description: "Set one frontmatter property on a .md content item.",
    schema: address({
      key: z.string().min(1),
      value: z.string()
    }),
    handler: (args) => writeContentProperty(client, args)
  });

  if (isLegacyMcpToolsEnabled()) {
    reg(
      "read_content_body",
      "[Legacy] Use content_read with part=body.",
      address({}),
      (args) => readContentBody(client, args)
    );
    reg(
      "write_content_body",
      "[Legacy] Use content_write with part=body.",
      address({ content: z.string() }),
      (args) => writeContentBody(client, args)
    );
    reg(
      "read_content_properties",
      "[Legacy] Use content_read with part=properties.",
      address({}),
      (args) => readContentProperties(client, args)
    );
    reg(
      "write_content_properties",
      "[Legacy] Use content_write with part=properties.",
      address({ content: z.string() }),
      (args) => writeContentProperties(client, args)
    );
    reg(
      "read_content_schema",
      "[Legacy] Use content_read with part=schema.",
      address({
        mode: z.enum(["effective", "layers", "local"]).optional(),
        ref: z.string().min(1).optional()
      }),
      (args) => readContentSchema(client, args)
    );
    reg(
      "write_content_schema",
      "[Legacy] Use content_write with part=schema.",
      address({
        ref: z.string().min(1).optional(),
        content: z.string().describe("YAML with awn_schema slot_* blocks")
      }),
      (args) => writeContentSchema(client, args)
    );
  }

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_create",
    legacy: "create_content",
    description:
      "Create typed content in a slot (placement or path+slot). kind=root: placement.path = new workspace file (text); same as content_write for a missing file. Database (kind: database, slot: data): isSection or awn.content.category for sections.",
    schema: address({
      awnType: z
        .enum(["awn.content.record", "awn.content.category"])
        .optional()
        .describe("Default awn.content.record. Use awn.content.category for section folders."),
      isSection: z
        .boolean()
        .optional()
        .describe("Database data slot: create hierarchy section folder (manifest.md)."),
      title: z.string().optional(),
      displayName: z.string().optional(),
      slug: z.string().optional(),
      parent: z.string().optional(),
      body: z.string().optional(),
      fileExtension: z.string().optional(),
      fileMask: z.string().optional(),
      fields: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
      source: z.string().optional(),
      author: z.string().optional(),
      status: z.string().optional()
    }),
    handler: (args) => createContent(client, args)
  });

  const writeContentBinaryFromUrlSchema = address({
    url: z.string().url(),
    fileName: z
      .string()
      .min(1)
      .optional()
      .describe("Target file name or ref path if placement.ref omitted, e.g. pasted/photo.png"),
    mimeType: z.string().optional(),
    parent: z.string().optional().describe("Subfolder under slot (legacy alias for ref prefix)"),
    createSubdir: z.boolean().optional()
  });
  const writeContentBinaryFromUrlHandler = (args) => writeContentBinaryFromUrl(client, args);
  const writeContentBinaryFromUrlDescription =
    "Download http(s) URL into a binary file by placement (same slots as content_binary_write). " +
    "Requires placement.ref or fileName; not for .md text.";

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_binary_write_from_url",
    legacy: "write_content_binary_from_url",
    description: writeContentBinaryFromUrlDescription,
    schema: writeContentBinaryFromUrlSchema,
    handler: writeContentBinaryFromUrlHandler
  });
  registerDeprecatedAlias(reg, {
    canonical: "content_binary_write_from_url",
    name: "import_content_from_url",
    schema: writeContentBinaryFromUrlSchema,
    handler: writeContentBinaryFromUrlHandler
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_rename",
    legacy: "rename_content",
    description:
      "Rename content item in an external slot. Address like content_read: placement { kind, path, slot, ref }. Required: displayName or title (new title).",
    schema: address({
      displayName: z.string().min(1).optional().describe("New display name (or title)"),
      title: z.string().min(1).optional()
    }),
    handler: (args) => renameContent(client, args)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_move",
    legacy: "move_content",
    description:
      "Move content within or across topics. Source: placement { kind, path, slot, ref } like content_read. Database data slot: targetParent (section id) and/or slug (or targetRef as new slug). external/memory/main and media: targetPath + targetRef. Storage slots: targetFolder + targetRef or targetParent.",
    schema: address({
      targetPath: pagePath.optional(),
      targetRef: z.string().optional(),
      targetParent: z.string().optional(),
      targetFolder: z.string().optional(),
      slug: z.string().optional().describe("Database data slot: new record/section slug (records/rename).")
    }),
    handler: (args) => moveContent(client, args)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_delete",
    legacy: "delete_content",
    description:
      "Delete content. External slots: placement { kind, path, slot, ref } like content_read. kind=root: placement.path = workspace file path (e.g. preview.svg).",
    schema: address({
      confirm: z.boolean().optional()
    }),
    handler: (args) => deleteContent(client, args)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_split",
    legacy: "split_content",
    description:
      "Split one .md note into several files by top-level H1 lines (# title — single # only). " +
      "Each part gets title «Base (n)» from source title or file name; preamble before first H1 → «Base (0)» when includePreamble. " +
      "New refs: same folder, {stem}-0.md, {stem}-1.md, … Copies frontmatter; updates title and id per part. deleteSource defaults true.",
    schema: address({
      includePreamble: z.boolean().optional().describe("Create part (0) for body before first H1 (default true)"),
      deleteSource: z.boolean().optional().describe("Delete source file after split (default true)")
    }),
    handler: (args) => withMdRefFallback(args, (a) => splitContent(client, a))
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "content_merge",
    legacy: "merge_content",
    description:
      "Merge several .md notes into one (same placement slot). Bodies joined with --- between parts. " +
      "Keeps target file frontmatter; optional union of tags (mergeTags, default true). targetRef must be in refs (default first). deleteSources optional.",
    schema: address({
      refs: z.array(z.string().min(1)).min(2).describe("Markdown refs in merge order, e.g. [\"a.md\", \"b.md\"]"),
      targetRef: z.string().min(1).optional().describe("Which ref receives merged body (default: first in refs)"),
      mergeTags: z.boolean().optional().describe("Union tags from all sources (default true)"),
      deleteSources: z.boolean().optional().describe("Delete non-target refs after merge (default false)")
    }),
    handler: (args) => mergeContent(client, args)
  });

}

export { placementSchema };
