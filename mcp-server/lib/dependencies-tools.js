import { z } from "zod";
import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

const dependencyRow = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .describe("Row object keyed by column names from workspace settings (host, kind, name, …)");

export function registerDependenciesTools(reg, client) {
  const readSchema = z.object({});
  const readDescription =
    "Read workspace dependencies.csv with column schema from project settings (dependencies-columns). Returns columns, rows, raw content, header validation.";
  const readFn = () => client.get("/api/agent/dependencies");

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_dependencies_read",
    legacy: "dependencies_read",
    description: readDescription,
    schema: readSchema,
    handler: readFn
  });
  reg("read_dependencies", "Deprecated alias for workspace_dependencies_read.", readSchema, readFn);

  const writeSchema = z.object({
    content: z
      .string()
      .optional()
      .describe("Full CSV file body including header row"),
    rows: z
      .array(dependencyRow)
      .optional()
      .describe("Rows as objects; header rebuilt from settings column keys")
  });
  const writeDescription =
    "Update workspace dependencies.csv. Pass full content (CSV text) OR rows (array of objects). Column headers must match settings; change columns in workspace settings only. Blocked in mcp-mode=readonly.";
  const writeFn = (payload) => client.post("/api/agent/dependencies", payload);

  registerCanonicalWithLegacyAlias(reg, {
    canonical: "workspace_dependencies_write",
    legacy: "dependencies_write",
    description: writeDescription,
    schema: writeSchema,
    handler: writeFn
  });
  reg(
    "write_dependencies",
    "Deprecated alias for workspace_dependencies_write.",
    writeSchema,
    writeFn
  );
}
