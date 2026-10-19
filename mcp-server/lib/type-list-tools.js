import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const typeFilterSchema = z
  .enum(["create-page", "slot-content", "data-containers", "data-elements"])
  .optional()
  .describe("Preset: create-page | slot-content | data-containers | data-elements");

const listTypesSchema = z.object({
  domain: z
    .string()
    .optional()
    .describe("Filter by domain: hubs (alias: pages) | content | database (alias: infoblock) | fields | md-blocks | slots | …"),
  kind: z
    .string()
    .optional()
    .describe("Filter by kind: type | field | block | data-container | data-element | slot | …"),
  filter: typeFilterSchema
});

const getTypeSchema = z.object({
  id: z.string().optional().describe("Type id, e.g. awn.hub.topic or awn.database.collection"),
  path: z
    .string()
    .optional()
    .describe("Catalog path, e.g. awn-system/types/hubs/topic.yml")
});

function requireTypeRef({ id, path }) {
  if (!String(id || "").trim() && !String(path || "").trim()) {
    throw new Error("Provide id or path");
  }
}

export function registerTypeListTools({ reg, client }) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_types_list",
    legacy: "list_types",
    description:
      "Slim platform type index (~KB). Optional domain/kind or filter preset. Details: platform_type_get(id).",
    schema: listTypesSchema,
    handler: ({ domain, kind, filter }) =>
      client.get("/api/agent-system/types", {
        ...(domain ? { domain } : {}),
        ...(kind ? { kind } : {}),
        ...(filter ? { filter } : {})
      })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "platform_type_get",
    legacy: "get_type",
    description: "Resolved platform type: merged schema, fields, inheritance. Use id (preferred) or catalog path.",
    schema: getTypeSchema,
    handler: (args) => {
      requireTypeRef(args);
      return client.get("/api/agent-system/type", { id: args.id, path: args.path });
    }
  });
}
