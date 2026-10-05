import { z } from "zod";

const dependencyRow = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .describe("Row object keyed by column names from workspace settings (host, kind, name, …)");

export function registerDependenciesTools(reg, client) {
  reg(
    "read_dependencies",
    "Read workspace dependencies.csv with column schema from project settings (dependencies-columns). Returns columns, rows, raw content, header validation.",
    z.object({}),
    () => client.get("/api/agent/dependencies")
  );

  reg(
    "write_dependencies",
    "Update dependencies.csv. Pass full content (CSV text) OR rows (array of objects). Column headers must match settings; change columns in workspace settings only. Blocked in mcp-mode=readonly.",
    z.object({
      content: z
        .string()
        .optional()
        .describe("Full CSV file body including header row"),
      rows: z
        .array(dependencyRow)
        .optional()
        .describe("Rows as objects; header rebuilt from settings column keys")
    }),
    (payload) => client.post("/api/agent/dependencies", payload)
  );
}
