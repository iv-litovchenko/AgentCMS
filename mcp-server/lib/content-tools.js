import { z } from "zod";

const INTERNAL_SLOTS = new Set(["main-single", "main-single-csv", "todo-single", "todo"]);

const contentSlot = z
  .string()
  .min(1)
  .describe(
    "Storage slot key: main, inbox, notes, references, artefacts, repository, scripts, media, assets, main-single, main-single-csv, todo-single"
  );

const contentRef = z
  .string()
  .min(1)
  .optional()
  .describe("Relative path inside the slot (required for external/collection slots). Omit for internal single-file slots.");

function slotToFolder(slot) {
  if (slot === "note") return "notes";
  if (slot === "script") return "scripts";
  return slot;
}

function isInternalSlot(slot) {
  return INTERNAL_SLOTS.has(String(slot || "").trim());
}

function isMediaSlot(slot) {
  return slot === "media" || slot === "assets";
}

async function readMarkdownFull(client, pagePath, slot, ref) {
  const folder = slotToFolder(slot);
  if (slot === "main") {
    return client.get("/api/external/file", { path: pagePath, file: ref });
  }
  if (isMediaSlot(slot) && ref.endsWith(".sidecar.md")) {
    return client.get("/api/media/sidecar", { path: pagePath, file: ref });
  }
  return client.get("/api/storage/markdown", { path: pagePath, folder, file: ref });
}

async function writeMarkdownFull(client, pagePath, slot, ref, content) {
  const folder = slotToFolder(slot);
  if (slot === "main") {
    return client.post("/api/external/file", { path: pagePath, file: ref, content });
  }
  if (isMediaSlot(slot) && ref.endsWith(".sidecar.md")) {
    return client.post("/api/media/sidecar", { path: pagePath, file: ref.replace(/\.sidecar\.md$/i, ""), content });
  }
  return client.post("/api/storage/markdown", { path: pagePath, folder, file: ref, content });
}

function splitMarkdownFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/);
  if (!match) return { properties: "", description: text };
  return {
    properties: match[1] || "",
    description: match[2] || ""
  };
}

function mergeMarkdownFrontmatter(properties, description) {
  const props = String(properties || "").trim();
  const body = String(description || "");
  if (!props) return body;
  return `---\n${props}\n---\n${body}`;
}

async function readInternalContent(client, pagePath, slot, file) {
  if (slot === "main-single-csv") return client.get("/api/memory/tabular", { path: pagePath, file });
  if (slot === "todo-single" || slot === "todo") return client.get("/api/todo", { path: pagePath });
  return client.get("/api/memory/internal", { path: pagePath });
}

async function writeInternalContent(client, pagePath, slot, content, file) {
  if (slot === "main-single-csv") return client.post("/api/memory/tabular", { path: pagePath, content, file });
  if (slot === "todo-single" || slot === "todo") return client.post("/api/todo", { path: pagePath, content });
  return client.post("/api/memory/internal", { path: pagePath, content });
}

export function registerContentTools({ reg, client, pagePath }) {
  reg(
    "list_content",
    "List content items in a page slot. Works for external (folder) slots only.",
    z.object({ path: pagePath, slot: contentSlot }),
    async ({ path, slot }) => {
      if (isInternalSlot(slot)) {
        throw new Error(`Slot "${slot}" is single-file (internal). Use read_content_description instead of list_content.`);
      }
      if (slot === "main") return client.get("/api/external/files", { path });
      if (isMediaSlot(slot)) return client.get("/api/media", { path, folder: slotToFolder(slot) });
      return client.get("/api/folder/view", { path, folder: slotToFolder(slot) });
    }
  );

  reg(
    "content_exists",
    "Check whether content exists in a slot (no body read). ref required for external slots.",
    z.object({ path: pagePath, slot: contentSlot, ref: contentRef }),
    ({ path, slot, ref }) => client.get("/api/content/exists", { path, slot, ref: ref || "" })
  );

  reg(
    "read_content_description",
    "Read content body. For .md: body without frontmatter. For internal slots: full file content.",
    z.object({ path: pagePath, slot: contentSlot, ref: contentRef }),
    async ({ path, slot, ref }) => {
      if (isInternalSlot(slot)) {
        const payload = await readInternalContent(client, path, slot);
        return { slot, content: payload?.content ?? "" };
      }
      if (!ref) throw new Error("ref is required for external slots");
      const payload = await readMarkdownFull(client, path, slot, ref);
      if (!ref.toLowerCase().endsWith(".md")) return payload;
      const { description } = splitMarkdownFrontmatter(payload.content);
      return { file: payload.file, content: description };
    }
  );

  reg(
    "write_content_description",
    "Save content body. Frontmatter on disk is preserved for .md files.",
    z.object({
      path: pagePath,
      slot: contentSlot,
      ref: contentRef,
      content: z.string()
    }),
    async ({ path, slot, ref, content }) => {
      if (isInternalSlot(slot)) {
        return writeInternalContent(client, path, slot, content);
      }
      if (!ref) throw new Error("ref is required for external slots");
      const existing = await readMarkdownFull(client, path, slot, ref);
      if (!ref.toLowerCase().endsWith(".md")) {
        return writeMarkdownFull(client, path, slot, ref, content);
      }
      const { properties } = splitMarkdownFrontmatter(existing.content);
      const merged = mergeMarkdownFrontmatter(properties, content);
      return writeMarkdownFull(client, path, slot, ref, merged);
    }
  );

  reg(
    "read_content_properties",
    "Read YAML frontmatter of a .md content item.",
    z.object({ path: pagePath, slot: contentSlot, ref: contentRef }),
    async ({ path, slot, ref }) => {
      if (isInternalSlot(slot)) {
        const payload = await readInternalContent(client, path, slot);
        const { properties } = splitMarkdownFrontmatter(payload?.content || "");
        return { slot, content: properties };
      }
      if (!ref) throw new Error("ref is required for external slots");
      const payload = await readMarkdownFull(client, path, slot, ref);
      const { properties } = splitMarkdownFrontmatter(payload.content || "");
      return { file: payload.file, content: properties };
    }
  );

  reg(
    "write_content_properties",
    "Save YAML frontmatter of a .md content item. Body on disk is preserved.",
    z.object({
      path: pagePath,
      slot: contentSlot,
      ref: contentRef,
      content: z.string()
    }),
    async ({ path, slot, ref, content }) => {
      if (isInternalSlot(slot)) {
        const payload = await readInternalContent(client, path, slot);
        const { description } = splitMarkdownFrontmatter(payload?.content || "");
        const merged = mergeMarkdownFrontmatter(content, description);
        return writeInternalContent(client, path, slot, merged);
      }
      if (!ref) throw new Error("ref is required for external slots");
      const existing = await readMarkdownFull(client, path, slot, ref);
      const { description } = splitMarkdownFrontmatter(existing.content || "");
      const merged = mergeMarkdownFrontmatter(content, description);
      return writeMarkdownFull(client, path, slot, ref, merged);
    }
  );

  reg(
    "create_content",
    "Create typed content: awn.content.record or awn.content.record.category. Use awnType awn.content.record.category for sections.",
    z.object({
      path: pagePath,
      slot: contentSlot,
      awnType: z
        .enum(["awn.content.record", "awn.content.record.category"])
        .optional()
        .describe("Default awn.content.record. Use awn.content.record.category for section folders."),
      title: z.string().optional(),
      displayName: z.string().optional(),
      slug: z.string().optional(),
      parent: z.string().optional(),
      body: z.string().optional(),
      fileMask: z.string().optional(),
      fields: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
      source: z.string().optional(),
      author: z.string().optional(),
      status: z.string().optional()
    }),
    async ({ path, slot, awnType, title, displayName, slug, parent, body, fileMask, fields, source, author, status }) => {
      if (isInternalSlot(slot)) {
        throw new Error(`Cannot create_content in internal slot "${slot}". Use write_content_description.`);
      }
      const folder = slotToFolder(slot);
      const isCategory = awnType === "awn.content.record.category";
      if (isCategory) {
        return client.post("/api/storage/section/create", {
          path,
          folder,
          title: title || displayName,
          displayName: displayName || title,
          slug,
          parent
        });
      }
      return client.post("/api/storage/file/create", {
        path,
        folder,
        title: title || displayName,
        displayName: displayName || title,
        slug,
        parent,
        body,
        fileMask,
        mask: fileMask,
        fields,
        source,
        author,
        status
      });
    }
  );

  reg(
    "upload_content",
    "Upload a binary or text file into an external slot (media/, repository/, …). data = base64.",
    z.object({
      path: pagePath,
      slot: contentSlot,
      fileName: z.string().min(1),
      data: z.string().min(1).describe("Base64-encoded file bytes"),
      mimeType: z.string().optional(),
      parent: z.string().optional().describe("Subfolder inside slot, e.g. section path in media/"),
      createSubdir: z.boolean().optional()
    }),
    async ({ path, slot, fileName, data, mimeType, parent, createSubdir }) => {
      if (isInternalSlot(slot)) {
        throw new Error(`Cannot upload_content to internal slot "${slot}". Use write_content_description.`);
      }
      return client.post("/api/media/file", {
        path,
        fileName,
        data,
        mimeType,
        libraryFolder: slotToFolder(slot),
        folder: slotToFolder(slot),
        subdir: parent || "",
        createSubdir: Boolean(createSubdir)
      });
    }
  );

  reg(
    "read_content_file",
    "Read a file from an external slot. Text files return content; media returns previewUrl for binary.",
    z.object({ path: pagePath, slot: contentSlot, ref: z.string().min(1) }),
    async ({ path, slot, ref }) => {
      if (isInternalSlot(slot)) {
        throw new Error("read_content_file is for external slot files. Use read_content_description for internal slots.");
      }
      const folder = slotToFolder(slot);
      if (isMediaSlot(slot)) {
        const base = client.buildUrl("/api/media/file", { path, file: ref }).toString();
        return { path, slot, ref, previewUrl: base, binary: true };
      }
      return client.get("/api/storage/file", { path, folder, file: ref });
    }
  );

  reg(
    "rename_content",
    "Rename content item in an external slot.",
    z.object({
      path: pagePath,
      slot: contentSlot,
      ref: z.string().min(1),
      displayName: z.string().min(1).optional(),
      title: z.string().min(1).optional()
    }),
    async ({ path, slot, ref, displayName, title }) => {
      if (isInternalSlot(slot)) throw new Error("rename_content is not supported for internal slots.");
      const name = displayName || title;
      if (!name) throw new Error("displayName or title is required");
      if (slot === "main") {
        return client.post("/api/external/file/rename", { path, file: ref, title: name });
      }
      if (isMediaSlot(slot)) {
        return client.post("/api/media/file/rename", { path, file: ref, title: name });
      }
      return client.post("/api/storage/file/rename", {
        path,
        folder: slotToFolder(slot),
        file: ref,
        title: name
      });
    }
  );

  reg(
    "move_content",
    "Move content within or across topics (external slots).",
    z.object({
      path: pagePath,
      slot: contentSlot,
      ref: z.string().min(1),
      targetPath: pagePath.optional(),
      targetRef: z.string().optional(),
      targetParent: z.string().optional()
    }),
    async ({ path, slot, ref, targetPath, targetRef, targetParent }) => {
      if (isInternalSlot(slot)) throw new Error("move_content is not supported for internal slots.");
      if (slot === "main") {
        return client.post("/api/external/file/move", {
          path,
          file: ref,
          targetPath,
          targetFile: targetRef || targetParent
        });
      }
      if (isMediaSlot(slot)) {
        return client.post("/api/media/file/move", {
          path,
          file: ref,
          targetPath,
          targetFile: targetRef
        });
      }
      throw new Error(`move_content for slot "${slot}" is not supported yet. Supported: main, media, assets.`);
    }
  );

  reg(
    "delete_content",
    "Delete content from an external slot.",
    z.object({ path: pagePath, slot: contentSlot, ref: z.string().min(1) }),
    async ({ path, slot, ref }) => {
      if (isInternalSlot(slot)) throw new Error("delete_content is not supported for internal slots.");
      if (slot === "main") return client.delete("/api/external/file", { path, file: ref });
      if (isMediaSlot(slot)) return client.delete("/api/media/file", { path, file: ref });
      throw new Error(`delete_content for slot "${slot}" is not supported yet. Supported: main, media, assets.`);
    }
  );
}
