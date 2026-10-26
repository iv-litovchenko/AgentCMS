import { z } from "zod";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { publicPlacementKindList } = require("../../lib/config/content-placement.js");

export function buildContentSlotSchema(listSectionCapableSlotKeys) {
  return z
    .string()
    .min(1)
    .describe(
      `Storage slot key: ${listSectionCapableSlotKeys().join(", ")}, data (database), repository, main-single, main-single-csv, todo-single, atlas (disk atlas/; aliases roadmap-single, roadmap), inbox, outbox, files, assets. ` +
        "Primary memory: slot main|memory|external → disk awn-storage/main/ (API slotKey memory). main-single* = internal bundle in same main/ folder, no ref. Hub slots differ (channel: inbox|task-queue|outbox|files|assets; database: data|assets)."
    );
}

const publicKinds = publicPlacementKindList();

export const placementKindSchema = z
  .enum(publicKinds)
  .describe("topic | channel | media | database | repository | root (legacy input: page → topic)");

const placementPath = z
  .string()
  .min(1)
  .describe(
    "Container slug or path without hub prefix: topic folder path, channel slug, media slug, database store slug, repository slug (group/repo)"
  );

const rootWorkspacePath = z
  .string()
  .min(1)
  .describe("Workspace-relative file path (AGENTS.md, folder/file.md, …) — no slot/ref");

const placementRef = z
  .string()
  .min(1)
  .optional()
  .describe("File inside the slot, with extension: folder/note.md (read retries with .md if omitted)");

function slotPlacement(kind) {
  return z
    .object({
      kind: z.literal(kind),
      path: placementPath,
      slot: z.string().min(1),
      ref: placementRef
    })
    .strict();
}

export const placementSchema = z.discriminatedUnion("kind", [
  slotPlacement("topic"),
  slotPlacement("channel"),
  slotPlacement("media"),
  slotPlacement("database"),
  slotPlacement("repository"),
  z
    .object({
      kind: z.literal("root"),
      path: rootWorkspacePath
    })
    .strict()
]);

/** Plain strict object: refinements/intersections make MCP tools/list publish an empty input schema. */
function normalizeLegacyPagePlacement(placement) {
  if (!placement || typeof placement !== "object") return placement;
  if (String(placement.kind || "").toLowerCase() === "page") {
    return { ...placement, kind: "topic" };
  }
  return placement;
}

export function withContentAddress(baseShape, contentSlot) {
  return z
    .object({
      placement: z
        .preprocess(normalizeLegacyPagePlacement, placementSchema.optional())
        .describe("Preferred address. kind: topic (legacy page accepted). Or legacy top-level path + slot + ref"),
      path: z.string().min(1).optional().describe("Legacy: manifest path (hub prefix auto-inferred for awn-databases/…)"),
      slot: contentSlot.optional(),
      ref: z.string().min(1).optional(),
      ...baseShape
    })
    .strict();
}

export const slotsListInputSchema = z
  .object({
    placement: z
      .object({
        kind: placementKindSchema.default("topic"),
        path: placementPath
      })
      .strict()
      .optional(),
    path: z.string().min(1).optional()
  })
  .strict();
