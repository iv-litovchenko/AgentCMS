import { z } from "zod";

export function registerMapTools(reg, client, pagePath) {
  reg(
    "get_page_map",
    "Lightweight page map: all manifest.md nodes with title, description, properties (no body). Optional slot entry counts per topic.",
    z.object({
      includeSlots: z.boolean().optional().describe("Include slot summaries for topics (default true)")
    }),
    ({ includeSlots }) =>
      client.get("/api/agent/page-map", {
        ...(includeSlots === false ? { includeSlots: "false" } : {})
      })
  );

  reg(
    "get_content_map",
    "Content map for one page: items in all slots (or one slot) with title, description, properties (no body).",
    z.object({
      path: pagePath,
      slot: z
        .string()
        .min(1)
        .optional()
        .describe("Optional slot filter, e.g. main, inbox, media. Omit for all slots.")
    }),
    ({ path, slot }) =>
      client.get("/api/agent/content-map", {
        path,
        ...(slot ? { slot } : {})
      })
  );

  reg(
    "get_menu",
    "Deprecated → get_page_map (flat meta map, not UI tree). HTTP /api/menu remains for UI.",
    z.object({}),
    () => client.get("/api/agent/page-map")
  );

  reg(
    "get_workspace_table",
    "Deprecated → get_page_map (pages include slot summaries).",
    z.object({}),
    () => client.get("/api/agent/page-map")
  );

  reg(
    "get_topic_registry",
    "Deprecated → get_page_map.",
    z.object({}),
    () => client.get("/api/agent/page-map")
  );

  reg(
    "get_site_map",
    "Deprecated → get_page_map.",
    z.object({}),
    () => client.get("/api/agent/page-map")
  );
}
