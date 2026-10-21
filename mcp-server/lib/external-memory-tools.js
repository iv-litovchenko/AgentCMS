import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const providerSchema = z
  .enum(["claude", "cursor", "chatgpt", "other"])
  .describe("Assistant / service (folder under 0-external-memory/)");

const listSchema = z.object({
  provider: providerSchema,
  limit: z.number().int().min(1).max(200).optional().describe("Max items (default 50)")
});

const upsertSchema = z.object({
  provider: providerSchema,
  body: z.string().min(1).describe("Memory text"),
  name: z.string().optional().describe("Short title"),
  externalId: z.string().optional().describe("Stable id from external service for upsert"),
  record: z.string().optional().describe("Existing record id to update")
});

const syncEntrySchema = z.object({
  body: z.string().optional(),
  text: z.string().optional(),
  externalId: z.string().optional(),
  name: z.string().optional()
});

const syncSchema = z.object({
  provider: providerSchema,
  direction: z
    .enum(["pull", "push", "both"])
    .optional()
    .describe("pull: import entries; push: export markdown; both (default both)"),
  entries: z
    .array(z.union([z.string(), syncEntrySchema]))
    .optional()
    .describe("For pull/both: memory lines to merge into CMS")
});

export function registerExternalMemoryTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "external_memory_list",
    legacy: "list_external_memory",
    description:
      "List memory entries from awn-databases/0-external-memory/{provider} (claude, cursor, chatgpt, other).",
    schema: listSchema,
    handler: ({ provider, limit }) =>
      client.get("/api/agent/workspace-external-memory/list", {
        provider,
        ...(limit ? { limit } : {})
      })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "external_memory_upsert",
    legacy: "upsert_external_memory",
    description: "Create or update one external memory entry in the provider collection.",
    schema: upsertSchema,
    handler: (payload) => client.post("/api/agent/workspace-external-memory/upsert", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "external_memory_sync",
    legacy: "sync_external_memory",
    description:
      "Sync external memory: pull entries into CMS, push export markdown to awn-databases/0-external-memory/exports/{provider}.md, update 0-sync state.",
    schema: syncSchema,
    handler: (payload) => client.post("/api/agent/workspace-external-memory/sync", payload)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "external_memory_sync_status",
    legacy: "external_memory_sync_status_get",
    description: "Read lastSync metadata from awn-databases/0-external-memory/0-sync singleton.",
    schema: z.object({}),
    handler: () => client.get("/api/agent/workspace-external-memory/sync-status")
  });
}
