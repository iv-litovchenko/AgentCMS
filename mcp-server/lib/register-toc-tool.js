/** Canonical MCP name + legacy alias (old *index without _toc). */
export function registerTocTool(reg, { canonical, legacy, description, schema, handler }) {
  reg(canonical, description, schema, handler);
  if (legacy && legacy !== canonical) {
    reg(legacy, `[Legacy] Use ${canonical}. ${description}`, schema, handler);
  }
}
