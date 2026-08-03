import { z } from "zod";

export function registerTypeListTools({ reg, client }) {
  reg(
    "list_page_types",
    "Page types available for create_page (grouped like UI create wizard).",
    z.object({}),
    () => client.get("/api/agent-system/create-node-types")
  );

  reg(
    "get_page_type",
    "Resolved page type details: fields, storage-slots, inheritance.",
    z.object({
      id: z.string().min(1).describe("Type id, e.g. awn.page.topic")
    }),
    ({ id }) => client.get("/api/agent-system/type", { id })
  );

  reg(
    "list_content_types",
    "Canonical content types allowed in storage slots (record, category, sidecar).",
    z.object({}),
    async () => {
      const model = await client.get("/api/agent/canonical-model");
      return {
        contentTypes: model.slotContentTypes || [],
        slotCategories: model.slotCategories || [],
        slotTypesByCategory: model.slotTypesByCategory || [],
        slotTypes: (model.slotTypes || []).map((row) => ({
          id: row.id,
          name: row.name,
          slotCategory: row.slotCategory,
          allowedContent: row.allowedContent
        }))
      };
    }
  );

  reg(
    "get_content_type",
    "Resolved content type details from awn-system.",
    z.object({
      id: z.string().min(1).describe("Type id, e.g. awn.content.record")
    }),
    ({ id }) => client.get("/api/agent-system/type", { id })
  );
}
