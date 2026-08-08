import { z } from "zod";

const typeFilterSchema = z
  .enum(["create-page", "slot-content", "data-containers", "data-elements"])
  .optional()
  .describe("Preset: create-page | slot-content | data-containers | data-elements");

const listTypesSchema = z.object({
  domain: z
    .string()
    .optional()
    .describe("Filter by domain: pages | content | data | fields | md-blocks | slots | …"),
  kind: z
    .string()
    .optional()
    .describe("Filter by kind: type | field | block | data-container | data-element | slot | …"),
  filter: typeFilterSchema
});

const getTypeSchema = z.object({
  id: z.string().optional().describe("Type id, e.g. awn.page.topic or awn.data.collection"),
  path: z
    .string()
    .optional()
    .describe("Catalog path, e.g. awn-system/types/pages/topic.yml")
});

function requireTypeRef({ id, path }) {
  if (!String(id || "").trim() && !String(path || "").trim()) {
    throw new Error("Provide id or path");
  }
}

export function registerTypeListTools({ reg, client }) {
  reg(
    "list_types",
    "Slim type index (~KB). Optional domain/kind or filter preset. Details: get_type(id).",
    listTypesSchema,
    ({ domain, kind, filter }) =>
      client.get("/api/agent-system/types", {
        ...(domain ? { domain } : {}),
        ...(kind ? { kind } : {}),
        ...(filter ? { filter } : {})
      })
  );

  reg(
    "get_type",
    "Resolved type: merged schema, fields, inheritance. Use id (preferred) or catalog path.",
    getTypeSchema,
    (args) => {
      requireTypeRef(args);
      return client.get("/api/agent-system/type", { id: args.id, path: args.path });
    }
  );
}
