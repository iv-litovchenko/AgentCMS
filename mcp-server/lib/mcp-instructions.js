import { existsSync, readFileSync } from "node:fs";

/**
 * Short MCP initialize `instructions` (inline). Full welcome — skill
 * workspaces/0-md/GLOBAL-SKILL-0-MCP-WELCOME.md (install in the client).
 * Override entire text: AGENT_CMS_MCP_INSTRUCTIONS_PATH (file at MCP process start).
 * Disable: AGENT_CMS_MCP_INSTRUCTIONS=0|false|off
 */
const DEFAULT_MCP_INSTRUCTIONS = `
Agent CMS MCP. Начинай только по просьбе человека.
Старт: list_workspaces → get_session_context({ workspaceId }); дальше тот же workspaceId во всех tools.
Установи скиллы из репозитория AgentCMS, папка workspaces/0-md (welcome 0, base 1, style 2, rules 3, markdown 4, search 5, modules 6).
Задачи по хранилищу — скилл agent-cms (GLOBAL-SKILL-1-BASE). Текст скиллов через MCP: list_platform_docs, read_platform_doc({ path: "GLOBAL-SKILL-1-BASE.md" }).
`.trim();

function instructionsDisabled() {
  const flag = String(process.env.AGENT_CMS_MCP_INSTRUCTIONS || "").trim().toLowerCase();
  return flag === "0" || flag === "false" || flag === "off";
}

export function loadMcpServerInstructions() {
  if (instructionsDisabled()) return undefined;

  const overridePath = String(process.env.AGENT_CMS_MCP_INSTRUCTIONS_PATH || "").trim();
  if (overridePath) {
    if (!existsSync(overridePath)) {
      console.error(`[agent-cms-mcp] MCP instructions file not found: ${overridePath}`);
      return undefined;
    }
    const text = readFileSync(overridePath, "utf8").trim();
    if (!text) {
      console.error(`[agent-cms-mcp] MCP instructions file is empty: ${overridePath}`);
      return undefined;
    }
    return text;
  }

  return DEFAULT_MCP_INSTRUCTIONS;
}
