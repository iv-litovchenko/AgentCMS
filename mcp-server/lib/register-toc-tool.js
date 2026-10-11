/** Register canonical MCP TOC tool (*_index_toc). */
export function registerTocTool(reg, { canonical, description, schema, handler }) {
  reg(canonical, description, schema, handler);
}
