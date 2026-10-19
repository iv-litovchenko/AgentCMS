/** Register canonical MCP tool plus deprecated legacy name(s) (same handler/schema). */
export function registerCanonicalWithLegacyAlias(
  reg,
  { canonical, legacy, extraLegacy = [], description, schema, handler, options }
) {
  reg(canonical, description, schema, handler, options);
  for (const name of [legacy, ...extraLegacy]) {
    if (name && name !== canonical) {
      reg(name, `Deprecated alias for ${canonical}.`, schema, handler, options);
    }
  }
}
