/** When true, register deprecated MCP tool names (read_content_body, read_file, …). */
export function isLegacyMcpToolsEnabled() {
  const raw = String(process.env.MCP_LEGACY_TOOLS || "").trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}
