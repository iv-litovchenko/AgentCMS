import { isLegacyMcpAliasesEnabled } from "./mcp-legacy-tools.js";

/** Register one deprecated alias (same handler/schema as canonical). Skipped when MCP_LEGACY_ALIASES is off. */
export function registerDeprecatedAlias(
  reg,
  { canonical, name, description, schema, handler, options }
) {
  if (!isLegacyMcpAliasesEnabled()) return;
  const alias = String(name || "").trim();
  const canon = String(canonical || "").trim();
  if (!alias || alias === canon) return;
  const desc = description || `Deprecated alias for ${canon}.`;
  reg(alias, desc, schema, handler, options);
}

/** Register canonical MCP tool plus deprecated legacy name(s) (same handler/schema). */
export function registerCanonicalWithLegacyAlias(
  reg,
  { canonical, legacy, extraLegacy = [], description, schema, handler, options }
) {
  reg(canonical, description, schema, handler, options);
  if (!isLegacyMcpAliasesEnabled()) return;
  for (const name of [legacy, ...extraLegacy]) {
    registerDeprecatedAlias(reg, { canonical, name, schema, handler, options });
  }
}
