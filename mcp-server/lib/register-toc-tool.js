import { registerCanonicalWithLegacyAlias } from "./register-tool-alias.js";

/** Register canonical MCP TOC tool (*_index_toc), optional legacy name. */
export function registerTocTool(reg, { canonical, legacy, description, schema, handler }) {
  registerCanonicalWithLegacyAlias(reg, {
    canonical,
    legacy,
    description,
    schema,
    handler
  });
}
