/** Register canonical MCP tool plus deprecated legacy name (same handler/schema). */
export function registerCanonicalWithLegacyAlias(
  reg,
  { canonical, legacy, description, schema, handler, options }
) {
  reg(canonical, description, schema, handler, options);
  if (legacy && legacy !== canonical) {
    reg(legacy, `Deprecated alias for ${canonical}.`, schema, handler, options);
  }
}
