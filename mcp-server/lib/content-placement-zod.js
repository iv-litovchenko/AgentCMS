import { z } from "zod";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { PLACEMENT_KINDS } = require("../../lib/config/content-placement.js");

export function buildContentSlotSchema(listSectionCapableSlotKeys) {
  return z
    .string()
    .min(1)
    .describe(
      `Storage slot key: ${listSectionCapableSlotKeys().join(", ")}, repository, main-single, main-single-csv, todo-single, roadmap-single, inbox, outbox, files, assets`
    );
}

export const placementKindSchema = z.enum(PLACEMENT_KINDS);

const placementPath = z
  .string()
  .min(1)
  .describe("Container path or slug (page manifest, awn-channels/{slug}, awn-media/{slug})");

export const placementSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("page"),
    path: placementPath,
    slot: z.string().min(1),
    ref: z.string().min(1).optional()
  }),
  z.object({
    kind: z.literal("channel"),
    path: placementPath,
    slot: z.string().min(1),
    ref: z.string().min(1).optional()
  }),
  z.object({
    kind: z.literal("media"),
    path: placementPath,
    slot: z.string().min(1),
    ref: z.string().min(1).optional()
  })
]);

export function withContentAddress(baseShape, contentSlot) {
  return z
    .object({
      placement: placementSchema.optional(),
      path: z.string().min(1).optional(),
      slot: contentSlot.optional(),
      ref: z.string().min(1).optional(),
      ...baseShape
    })
    .superRefine((val, ctx) => {
      if (val.placement) return;
      if (!val.path) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "path or placement is required" });
      }
      if (!val.slot) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "slot is required when placement is omitted" });
      }
    });
}

export const slotsListInputSchema = z
  .object({
    placement: z
      .object({
        kind: placementKindSchema.default("page"),
        path: placementPath
      })
      .optional(),
    path: z.string().min(1).optional()
  })
  .superRefine((val, ctx) => {
    if (val.placement?.path || val.path) return;
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "path or placement.path is required" });
  });
