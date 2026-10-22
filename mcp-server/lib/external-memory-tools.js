import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const platformDescribe =
  "Кто ты: slug клиента/среды (kebab-case), не имя LLM. Примеры: cursor, claude-code, codex, claude-cli, chatgpt. Раздел data/{platform}/ создаётся при первой записи.";

const platformOptional = z.string().min(1).optional().describe(`${platformDescribe} Для list — фильтр; можно не указывать.`);

const platformRequired = z
  .string()
  .min(1)
  .optional()
  .describe(`${platformDescribe} Обязателен для upsert/sync — заполняет вызывающий агент.`);

function requirePlatformRefine(data, ctx) {
  const platform = data.platform ?? data.app ?? data.source ?? data.provider;
  if (!String(platform || "").trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message:
        "platform обязателен: укажи, кто ты (cursor, claude-code, codex, claude-cli, chatgpt…), не модель.",
      path: ["platform"]
    });
  }
}

const listSchema = z.object({
  platform: platformOptional,
  provider: platformOptional.describe("Deprecated alias for platform"),
  source: platformOptional.describe("Alias for platform"),
  limit: z.number().int().min(1).max(200).optional().describe("Max items (default 50)")
});

const upsertSchema = z
  .object({
    platform: platformRequired,
    provider: platformRequired.describe("Deprecated alias for platform"),
    source: platformRequired.describe("Alias for platform"),
    body: z.string().min(1).describe("Memory text"),
    name: z.string().optional().describe("Short title"),
    externalId: z.string().optional().describe("Stable id from external service for upsert"),
    record: z.string().optional().describe("Existing record id to update")
  })
  .superRefine(requirePlatformRefine);

const syncEntrySchema = z.object({
  body: z.string().optional(),
  text: z.string().optional(),
  externalId: z.string().optional(),
  name: z.string().optional()
});

const syncSchema = z
  .object({
    platform: platformRequired,
    provider: platformRequired.describe("Deprecated alias for platform"),
    source: platformRequired.describe("Alias for platform"),
    direction: z
      .enum(["pull", "push", "both"])
      .optional()
      .describe("pull: import entries; push: export markdown; both (default both)"),
    entries: z
      .array(z.union([z.string(), syncEntrySchema]))
      .optional()
      .describe("For pull/both: memory lines to merge into CMS")
  })
  .superRefine(requirePlatformRefine);

function normalizePlatformPayload(payload = {}) {
  const platform = payload.platform ?? payload.app ?? payload.source ?? payload.provider;
  const { provider, source, ...rest } = payload;
  return platform ? { ...rest, platform, provider: platform, source: platform } : rest;
}

export function registerExternalMemoryTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "external_memory_list",
    legacy: "list_external_memory",
    description:
      "List external memory in 0-contents/0-external-memory/. Optional platform filter; omit to list all sections.",
    schema: listSchema,
    handler: (payload) => {
      const body = normalizePlatformPayload(payload);
      return client.get("/api/agent/workspace-external-memory/list", {
        ...(body.platform ? { platform: body.platform } : {}),
        ...(payload.limit ? { limit: payload.limit } : {})
      });
    }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "external_memory_upsert",
    legacy: "upsert_external_memory",
    description:
      "Write external memory. Caller agent MUST pass platform (who you are: claude-code, codex, cursor…); section folder is created on first use.",
    schema: upsertSchema,
    handler: (payload) =>
      client.post("/api/agent/workspace-external-memory/upsert", normalizePlatformPayload(payload))
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "external_memory_sync",
    legacy: "sync_external_memory",
    description:
      "Sync external memory for platform (required, self-reported by agent): pull entries, push exports/{platform}.md.",
    schema: syncSchema,
    handler: (payload) =>
      client.post("/api/agent/workspace-external-memory/sync", normalizePlatformPayload(payload))
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "external_memory_sync_status",
    legacy: "external_memory_sync_status_get",
    description: "Read lastSync metadata from sync-state.json (platforms map).",
    schema: z.object({}),
    handler: () => client.get("/api/agent/workspace-external-memory/sync-status")
  });
}
