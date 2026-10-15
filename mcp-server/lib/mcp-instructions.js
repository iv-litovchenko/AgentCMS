import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_INSTRUCTIONS_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "MCP-INSTRUCTIONS.md"
);

function instructionsDisabled() {
  const flag = String(process.env.AGENT_CMS_MCP_INSTRUCTIONS || "").trim().toLowerCase();
  return flag === "0" || flag === "false" || flag === "off";
}

/**
 * Text for MCP initialize `instructions` (platform-wide; not per-workspace).
 * Source: repo MCP-INSTRUCTIONS.md, override via AGENT_CMS_MCP_INSTRUCTIONS_PATH.
 */
export function loadMcpServerInstructions() {
  if (instructionsDisabled()) return undefined;

  const override = String(process.env.AGENT_CMS_MCP_INSTRUCTIONS_PATH || "").trim();
  const filePath = override || DEFAULT_INSTRUCTIONS_PATH;

  if (!existsSync(filePath)) {
    console.error(`[agent-cms-mcp] MCP instructions file not found: ${filePath}`);
    return undefined;
  }

  const text = readFileSync(filePath, "utf8").trim();
  if (!text) {
    console.error(`[agent-cms-mcp] MCP instructions file is empty: ${filePath}`);
    return undefined;
  }

  return text;
}
