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
  importContentFromUrl,
  renameContent,
  moveContent,
  deleteContent,
  listContentItems,
  listSectionCapableSlotKeys,
  withMdRefFallback
} from "./content-core.js";
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

  reg(
    "get_content_meta",
    "Lightweight content metadata: exists, driver, file stat — no body. Prefer read_content with part=meta.",
    address({}),
    (args) => withMdRefFallback(args, (a) => getContentMeta(client, a))
  );

  reg(
    "read_content",
    "Read content by placement.kind: topic | channel | media | database | repository | root (or legacy path+slot). part=body|properties|schema|meta|all. " +
      "ref — file in slot with extension (folder/note.md); without extension read retries with .md (refResolved). Unknown params are rejected. " +
      `part=body reads a line window: default first ${READ_WINDOW_DEFAULT_LINES} body lines; startLine/limitLines are file lines incl. frontmatter — same numbers as search_workspace_* startLine. ` +
      "Response: startLine, endLine, totalLines, bodyStartLine (.md), hasMore, nextStartLine, hash; window grows to keep ``` code blocks whole (codeFence). " +
      "full=true — whole body (required before write_content replace). Slot main-single-csv / internal slots: whole content. root binary: format=base64 (images → MCP image content for chat clients).",
    address({
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
    (args) =>
      withMdRefFallback(args, (a) => {
        if (a.part === "meta") return readContentMeta(client, a);
        if (a.part === "all") return readContentAll(client, a);
        if (a.part === "properties") return readContentProperties(client, a);
        if (a.part === "schema") return readContentSchema(client, a);
        return readContentBody(client, a);
      })
  );

  reg(
    "list_content",
    "List items: placement.kind topic|channel|media|database|repository + slot, or root + path (folder inferred from file path). path or placement.path is required.",
    z
      .object({
        placement: z
          .object({
            kind: placementKindSchema,
            path: z.string().min(1),
            slot: z.string().min(1).optional()
          })
          .strict()
          .optional(),
        path: z.string().min(1).optional(),
        slot: z.string().min(1).optional(),
        depth: z.union([z.number(), z.string()]).optional()
      })
      .strict(),
    (args) => listContentItems(client, args)
  );

  reg(
    "write_content",
    "Write content by placement (same as read_content). part=body|properties|schema. " +
      "part=body mode: replace (default, whole body; frontmatter kept) | append | prepend | patch (oldString→newString, unique unless replaceAll) | " +
      "replace_lines (startLine..endLine → content; content=\"\" deletes) | insert (afterLine or beforeLine + content). " +
      "Line numbers = read_content / search_workspace_* numbering (file lines incl. frontmatter); frontmatter lines are rejected — use part=properties. " +
      "expectedHash = hash from read_content: mismatch → conflict error; required for replace_lines/insert. " +
      "Response: startLine/endLine of changed lines, totalLines, previousHash, hash (use as next expectedHash). " +
      "Binary: data (base64); root uses placement.path as file path.",
    address({
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
      expectedHash: z.string().optional().describe("hash from read_content / previous write; mismatch → conflict"),
      data: z.string().optional().describe("Base64 file bytes (upload); use instead of content"),
      mimeType: z.string().optional(),
      createSubdir: z.boolean().optional()
    }),
    async (args) => {
      if (args.part === "properties") return writeContentProperties(client, args);
      if (args.part === "schema") return writeContentSchema(client, args);
      return writeContentBody(client, args);
    }
  );

  reg(
    "read_content_property",
    "Read one frontmatter property of a .md content item.",
    address({ key: z.string().min(1) }),
    (args) => withMdRefFallback(args, (a) => readContentProperty(client, a))
  );

  reg(
    "write_content_property",
    "Set one frontmatter property on a .md content item.",
    address({
      key: z.string().min(1),
      value: z.string()
    }),
    (args) => writeContentProperty(client, args)
  );

  if (isLegacyMcpToolsEnabled()) {
    reg(
      "read_content_body",
      "[Legacy] Use read_content with part=body.",
      address({}),
      (args) => readContentBody(client, args)
    );
    reg(
      "write_content_body",
      "[Legacy] Use write_content with part=body.",
      address({ content: z.string() }),
      (args) => writeContentBody(client, args)
    );
    reg(
      "read_content_properties",
      "[Legacy] Use read_content with part=properties.",
      address({}),
      (args) => readContentProperties(client, args)
    );
    reg(
      "write_content_properties",
      "[Legacy] Use write_content with part=properties.",
      address({ content: z.string() }),
      (args) => writeContentProperties(client, args)
    );
    reg(
      "read_content_schema",
      "[Legacy] Use read_content with part=schema.",
      address({
        mode: z.enum(["effective", "layers", "local"]).optional(),
        ref: z.string().min(1).optional()
      }),
      (args) => readContentSchema(client, args)
    );
    reg(
      "write_content_schema",
      "[Legacy] Use write_content with part=schema.",
      address({
        ref: z.string().min(1).optional(),
        content: z.string().describe("YAML with awn_schema slot_* blocks")
      }),
      (args) => writeContentSchema(client, args)
    );
  }

  reg(
    "create_content",
    "Create typed content in a slot (placement or path+slot). Database (kind: database, slot: data): same as legacy database_element_create — isSection or awn.content.category for sections.",
    address({
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
    (args) => createContent(client, args)
  );

  reg(
    "import_content_from_url",
    "Download a file from http(s) URL into an external slot.",
    address({
      url: z.string().url(),
      fileName: z.string().min(1).optional(),
      mimeType: z.string().optional(),
      parent: z.string().optional(),
      createSubdir: z.boolean().optional()
    }),
    (args) => importContentFromUrl(client, args)
  );

  reg(
    "rename_content",
    "Rename content item in an external slot. Address like read_content: placement { kind, path, slot, ref }. Required: displayName or title (new title).",
    address({
      displayName: z.string().min(1).optional().describe("New display name (or title)"),
      title: z.string().min(1).optional()
    }),
    (args) => renameContent(client, args)
  );

  reg(
    "move_content",
    "Move content within or across topics. Source: placement { kind, path, slot, ref } like read_content. Database data slot: targetParent (section id) and/or slug (or targetRef as new slug). external/memory/main and media: targetPath + targetRef. Storage slots: targetFolder + targetRef or targetParent.",
    address({
      targetPath: pagePath.optional(),
      targetRef: z.string().optional(),
      targetParent: z.string().optional(),
      targetFolder: z.string().optional(),
      slug: z.string().optional().describe("Database data slot: new record/section slug (records/rename).")
    }),
    (args) => moveContent(client, args)
  );

  reg(
    "delete_content",
    "Delete content from an external slot. Address: placement { kind, path, slot, ref } like read_content.",
    address({
      confirm: z.boolean().optional()
    }),
    (args) => deleteContent(client, args)
  );
}

export { placementSchema };
