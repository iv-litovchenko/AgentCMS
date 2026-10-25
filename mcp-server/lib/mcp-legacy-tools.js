/** When true, register deprecated MCP FS/path tools (read_file, upload_file, read_content_body, …). Default off. */
export function isLegacyMcpToolsEnabled() {
  const raw = String(process.env.MCP_LEGACY_TOOLS || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/** When true, register deprecated MCP tool name aliases (read_content, list_settings, tool_web_*, …). Default off. */
export function isLegacyMcpAliasesEnabled() {
  const raw = String(process.env.MCP_LEGACY_ALIASES || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
