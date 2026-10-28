import { existsSync, readFileSync } from "node:fs";

/**
 * Short MCP initialize `instructions` (inline). Full welcome — skill
 * GLOBAL-SKILL-0-MCP-WELCOME.md in skills/ (optional skill; fallback — platform_skill_read).
 * Override entire text: AGENT_CMS_MCP_INSTRUCTIONS_PATH (file at MCP process start).
 * Disable: AGENT_CMS_MCP_INSTRUCTIONS=0|false|off
 */
const DEFAULT_MCP_INSTRUCTIONS = `
Agent CMS MCP. Начинай только по просьбе человека.
Платформа: platform_skills_list → platform_skill_read({ path: "GLOBAL-SKILL-1-BASE.md" }). README в корне: platform_docs_list / platform_doc_read.
Старт хранилища: workspaces_list → session_context_get({ workspaceId }); дальше тот же workspaceId во всех tools.
Установи скиллы из репозитория AgentCMS — папка skills/GLOBAL-SKILL-*.md (минимум agent-cms; agent-cms-welcome — по желанию; ещё agent-cms-response-style, agent-cms-rules, agent-cms-markdown, agent-cms-search, agent-cms-modules, agent-cms-slots-legacy при путанице slot/папок).
Задачи по хранилищу — скилл agent-cms (GLOBAL-SKILL-1-BASE).
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
