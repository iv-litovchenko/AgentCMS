import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const kindId = z
  .string()
  .optional()
  .describe("Viz type id from viz_map_types_list (mindmap, roadmap, flowchart, …)");

const mapPath = z
  .string()
  .optional()
  .describe("Workspace-relative path to a *.viz.md file");

const recordPath = z
  .string()
  .optional()
  .describe("Record the map describes (YAML frontmatter field viz-about)");

function atlasQuery({ recordPath: rec, about, kind, section }) {
  return {
    about: rec || about || "",
    kind: kind || "",
    section: section || ""
  };
}

export function registerVizMapTools(reg, client) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical: "viz_map_types_list",
    legacy: "viz_kind_list",
    description:
      "Registry of viz map kinds and UI sections (awn-system/types/viz/). Use before creating maps.",
    schema: z.object({}),
    handler: () => client.get("/api/viz/kinds")
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "viz_maps_all_list",
    legacy: "viz_atlas_read",
    description:
      "List all *.viz.md maps in the workspace (filesystem scan). Filters: recordPath, kind, section. " +
      "In the UI this view is labeled «Атлас» — a collection of maps, not a separate storage layer.",
    schema: z.object({
      recordPath,
      about: z.string().optional().describe("Deprecated alias for recordPath (viz-about)"),
      kind: kindId,
      section: z.string().optional().describe("Section id: knowledge, plans, process, time, people, places")
    }),
    handler: (args) => client.get("/api/viz/maps", atlasQuery(args))
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "viz_maps_for_record",
    legacy: "viz_maps_for_about",
    description:
      "For one record: every registered viz kind with expected path and whether a map file exists (editor aside «ВИЗУАЛИЗАЦИЯ»).",
    schema: z.object({
      recordPath,
      about: z.string().optional().describe("Deprecated alias for recordPath")
    }),
    handler: ({ recordPath: rec, about }) => {
      const target = String(rec || about || "").trim();
      if (!target) throw new Error("recordPath (or about) is required");
      return client.get("/api/viz/maps-for-record", { about: target });
    }
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "viz_map_read",
    legacy: "read_viz_map",
    description: "Read one viz map file. Provide mapPath, or recordPath + kind.",
    schema: z.object({
      mapPath: mapPath,
      path: z.string().optional().describe("Deprecated alias for mapPath"),
      recordPath,
      about: z.string().optional().describe("Deprecated alias for recordPath"),
      kind: kindId
    }),
    handler: ({ mapPath: mp, path: legacyPath, recordPath: rec, about, kind }) =>
      client.get("/api/viz/map", {
        path: mp || legacyPath || "",
        recordPath: rec || about || "",
        kind: kind || ""
      })
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "viz_map_write",
    legacy: "write_viz_map",
    description:
      "Create or update a *.viz.md map at assets/viz/{awn-id}/{kind}.viz.md (record must have awn-id). Optional content (full file body).",
    schema: z.object({
      recordPath,
      about: z.string().optional().describe("Deprecated alias for recordPath"),
      kind: kindId.describe("Required when mapPath omitted"),
      mapPath: mapPath,
      path: z.string().optional().describe("Deprecated alias for mapPath"),
      content: z.string().optional().describe("Full markdown file including frontmatter")
    }),
    handler: (body) => client.post("/api/viz/map", body)
  });

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "viz_map_delete",
    legacy: "delete_viz_map",
    description: "Delete a *.viz.md map. Provide mapPath, or recordPath + kind. Only when the human asked to remove the map.",
    schema: z.object({
      mapPath: mapPath,
      path: z.string().optional().describe("Deprecated alias for mapPath"),
      recordPath,
      about: z.string().optional().describe("Deprecated alias for recordPath"),
      kind: kindId
    }),
    handler: (query) => client.delete("/api/viz/map", query)
  });
}
