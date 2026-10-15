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
    "Check whether content exists in a slot (page, channel, or media placement).",
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
    "Read content by placement.kind: topic (= page) | channel | media | root (or legacy path+slot). part=body|properties|schema|meta|all. " +
      "ref — file in slot with extension (folder/note.md); without extension read retries with .md (refResolved). Unknown params are rejected. " +
      `part=body reads a line window: default first ${READ_WINDOW_DEFAULT_LINES} body lines; startLine/limitLines are file lines incl. frontmatter — same numbers as search_workspace_* startLine. ` +
      "Response: startLine, endLine, totalLines, bodyStartLine (.md), hasMore, nextStartLine, hash; window grows to keep ``` code blocks whole (codeFence). " +
      "full=true — whole body (required before write_content replace). Slot main-single-csv / internal slots: whole content. root binary: format=base64.",
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
    "List items: placement.kind topic (= page)|channel|media + slot, or root + path (folder inferred from file path). path or placement.path is required.",
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
    "Write content by placement. part=body|properties|schema. Slot main-single-csv: part=body replaces entire main.csv. Binary: data (base64); root uses placement.path as file path.",
    address({
      part: contentPartSchema,
      content: z.string().optional(),
      data: z.string().optional().describe("Base64 file bytes (upload); use instead of content"),
      mimeType: z.string().optional(),
      createSubdir: z.boolean().optional(),
      mode: z.enum(["append", "replace"]).optional().describe("root workspace write mode (default replace)")
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
    "Create typed content in a slot (placement or path+slot).",
    address({
      awnType: z
        .enum(["awn.content.record", "awn.content.category"])
        .optional()
        .describe("Default awn.content.record. Use awn.content.category for section folders."),
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
    "Rename content item in an external slot.",
    address({
      ref: z.string().min(1),
      displayName: z.string().min(1).optional(),
      title: z.string().min(1).optional()
    }),
    (args) => renameContent(client, args)
  );

  reg(
    "move_content",
    "Move content within or across topics (external slots).",
    address({
      ref: z.string().min(1),
      targetPath: pagePath.optional(),
      targetRef: z.string().optional(),
      targetParent: z.string().optional()
    }),
    (args) => moveContent(client, args)
  );

  reg(
    "delete_content",
    "Delete content from an external slot.",
    address({
      ref: z.string().min(1),
      confirm: z.boolean().optional()
    }),
    (args) => deleteContent(client, args)
  );
}

export { placementSchema };
