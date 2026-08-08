import { createRequire } from "node:module";
import { z } from "zod";
import { mergeFrontmatterBlocks } from "./yaml-frontmatter.js";

const require = createRequire(import.meta.url);
const {
  slotKeyToStorageFolder,
  isExternalMemorySlot,
  isMediaSlotKey,
  isInternalBundleSlot,
  buildSectionCreateRequest,
  listSectionCapableSlotKeys
} = require("../../storage-slot-routing.js");

const contentSlot = z
  .string()
  .min(1)
  .describe(
    `Storage slot key: ${listSectionCapableSlotKeys().join(", ")}, repository, main-single, main-single-csv, todo-single, log-single`
  );

const contentRef = z
  .string()
  .min(1)
  .optional()
  .describe(
    "Relative path inside the slot (required for external/collection slots). For memory/main use section/file.md when nested in a section. Omit for internal single-file slots."
  );

function slotToFolder(slot) {
  return slotKeyToStorageFolder(slot);
}

async function readMarkdownFull(client, pagePath, slot, ref) {
  const folder = slotToFolder(slot);
  if (isExternalMemorySlot(slot)) {
    return client.get("/api/external/file", { path: pagePath, file: ref });
  }
  if (isMediaSlotKey(slot) && ref.endsWith(".sidecar.md")) {
    return client.get("/api/media/sidecar", { path: pagePath, file: ref });
  }
  return client.get("/api/storage/markdown", { path: pagePath, folder, file: ref });
}

async function writeMarkdownFull(client, pagePath, slot, ref, content) {
  const folder = slotToFolder(slot);
  if (isExternalMemorySlot(slot)) {
    return client.post("/api/external/file", { path: pagePath, file: ref, content });
  }
  if (isMediaSlotKey(slot) && ref.endsWith(".sidecar.md")) {
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
  if (slot === "log-single") return client.get("/api/log", { path: pagePath });
  return client.get("/api/memory/internal", { path: pagePath });
}

async function writeInternalContent(client, pagePath, slot, content, file) {
  if (slot === "main-single-csv") return client.post("/api/memory/tabular", { path: pagePath, content, file });
  if (slot === "todo-single" || slot === "todo") return client.post("/api/todo", { path: pagePath, content });
  if (slot === "log-single") return client.post("/api/log", { path: pagePath, content });
  return client.post("/api/memory/internal", { path: pagePath, content });
}

export function registerContentTools({ reg, client, pagePath }) {
  reg(
    "read_content_body",
    "Read content body. For .md: markdown below frontmatter. For internal slots: full file content.",
    z.object({ path: pagePath, slot: contentSlot, ref: contentRef }),
    async ({ path, slot, ref }) => {
      if (isInternalBundleSlot(slot)) {
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
    "write_content_body",
    "Save content body. Frontmatter on disk is preserved for .md files.",
    z.object({
      path: pagePath,
      slot: contentSlot,
      ref: contentRef,
      content: z.string()
    }),
    async ({ path, slot, ref, content }) => {
      if (isInternalBundleSlot(slot)) {
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
      if (isInternalBundleSlot(slot)) {
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
    "Patch YAML frontmatter of a .md content item. Send only keys to change — existing keys are merged from disk; body preserved.",
    z.object({
      path: pagePath,
      slot: contentSlot,
      ref: contentRef,
      content: z.string()
    }),
    async ({ path, slot, ref, content }) => {
      if (isInternalBundleSlot(slot)) {
        const payload = await readInternalContent(client, path, slot);
        const { properties, description } = splitMarkdownFrontmatter(payload?.content || "");
        const mergedProps = mergeFrontmatterBlocks(properties, content);
        const merged = mergeMarkdownFrontmatter(mergedProps, description);
        return writeInternalContent(client, path, slot, merged);
      }
      if (!ref) throw new Error("ref is required for external slots");
      const existing = await readMarkdownFull(client, path, slot, ref);
      const { properties, description } = splitMarkdownFrontmatter(existing.content || "");
      const mergedProps = mergeFrontmatterBlocks(properties, content);
      const merged = mergeMarkdownFrontmatter(mergedProps, description);
      return writeMarkdownFull(client, path, slot, ref, merged);
    }
  );

  reg(
    "create_content",
    "Create typed content: awn.content.record or awn.content.category. For plain-text in artefacts/scripts use fileExtension + body (.html, .py). For inbox intake: slot=inbox, status=new.",
    z.object({
      path: pagePath,
      slot: contentSlot,
      awnType: z
        .enum(["awn.content.record", "awn.content.category"])
        .optional()
        .describe("Default awn.content.record. Use awn.content.category for section folders."),
      title: z.string().optional(),
      displayName: z.string().optional(),
      slug: z.string().optional(),
      parent: z.string().optional(),
      body: z.string().optional(),
      fileExtension: z
        .string()
        .optional()
        .describe("For flat slots (artefacts, scripts, …): .html, .py, .json, …"),
      fileMask: z.string().optional(),
      fields: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
      source: z.string().optional(),
      author: z.string().optional(),
      status: z
        .string()
        .optional()
        .describe("Maps to awn-status in frontmatter (e.g. new, open, closed).")
    }),
    async ({
      path,
      slot,
      awnType,
      title,
      displayName,
      slug,
      parent,
      body,
      fileExtension,
      fileMask,
      fields,
      source,
      author,
      status
    }) => {
      if (isInternalBundleSlot(slot)) {
        throw new Error(`Cannot create_content in internal slot "${slot}". Use write_content_body.`);
      }
      const folder = slotToFolder(slot);
      const isCategory = awnType === "awn.content.category" || awnType === "awn.content.record.category";
      if (isCategory) {
        const { endpoint, body: requestBody } = buildSectionCreateRequest(slot, {
          path,
          title: title || displayName,
          displayName: displayName || title,
          slug,
          parent
        });
        return client.post(endpoint, requestBody);
      }
      return client.post("/api/storage/file/create", {
        path,
        folder,
        title: title || displayName,
        displayName: displayName || title,
        slug,
        parent,
        body,
        fileExtension,
        extension: fileExtension,
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
      if (isInternalBundleSlot(slot)) throw new Error("rename_content is not supported for internal slots.");
      const name = displayName || title;
      if (!name) throw new Error("displayName or title is required");
      if (isExternalMemorySlot(slot)) {
        return client.post("/api/external/file/rename", { path, file: ref, title: name });
      }
      if (isMediaSlotKey(slot)) {
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
      if (isInternalBundleSlot(slot)) throw new Error("move_content is not supported for internal slots.");
      if (isExternalMemorySlot(slot)) {
        return client.post("/api/external/file/move", {
          path,
          file: ref,
          targetPath,
          targetFile: targetRef || targetParent
        });
      }
      if (isMediaSlotKey(slot)) {
        return client.post("/api/media/file/move", {
          path,
          file: ref,
          targetPath,
          targetFile: targetRef
        });
      }
      throw new Error(`move_content for slot "${slot}" is not supported yet. Supported: memory/main, media, assets.`);
    }
  );

  reg(
    "delete_content",
    "Delete content from an external slot (main, inbox, media, repository, scripts, …). Internal single-file slots are not supported.",
    z.object({ path: pagePath, slot: contentSlot, ref: z.string().min(1) }),
    async ({ path, slot, ref }) => {
      if (isInternalBundleSlot(slot)) throw new Error("delete_content is not supported for internal slots.");
      if (isExternalMemorySlot(slot)) return client.delete("/api/external/file", { path, file: ref });
      if (isMediaSlotKey(slot)) return client.delete("/api/media/file", { path, file: ref });
      return client.delete("/api/storage/file", { path, folder: slotToFolder(slot), file: ref });
    }
  );
}
