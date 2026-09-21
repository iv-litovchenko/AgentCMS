import { createRequire } from "node:module";
import { z } from "zod";
import { runWithAgentId } from "./agent-scope.js";
import { assertWorkspaceMcpToolAllowed, loadWorkspaceAgentSettings } from "./workspace-settings-guard.js";

const require = createRequire(import.meta.url);
const { assertBatchInvokeAllowed, getBatchAbsoluteMaxItems, getBatchDefaultParallel } = require(
  "../../workspace-agent-settings.js"
);

function normalizeBatchItem(item, index) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw new Error(`items[${index}] must be an object with tool arguments`);
  }
  const { agentId: _ignored, ...rest } = item;
  return rest;
}

async function invokeBatchItem({
  client,
  agentId,
  toolName,
  item,
  index,
  handler,
  formatResult
}) {
  try {
    await assertWorkspaceMcpToolAllowed(client, agentId, toolName, item);
    const args = { agentId, ...item };
    const data = await runWithAgentId(agentId, () => handler(args));
    if (formatResult) {
      const formatted = formatResult(data);
      if (formatted) {
        return { index, ok: true, result: formatted };
      }
    }
    return { index, ok: true, result: data };
  } catch (error) {
    return {
      index,
      ok: false,
      error: String(error?.message || error)
    };
  }
}

export function registerBatchInvokeTools({ reg, client, toolRegistry }) {
  reg(
    "batch_invoke",
    "Пакетный вызов одного и того же MCP-tool. Передай tool + items[] (аргументы без agentId). " +
      "Для read/list/search — parallel=true; для write/create/delete — parallel=false. " +
      "Нельзя: batch_invoke, exec_*, search_workspace_batch, get_session_context. " +
      "Лимиты: config.yml (batch-read-limit / batch-write-limit) + mcp-policy.yml (denylist).",
    z.object({
      tool: z.string().min(1).describe("Имя MCP-tool (один тип на весь batch)"),
      items: z
        .array(z.record(z.any()))
        .min(1)
        .max(getBatchAbsoluteMaxItems())
        .describe("Массив аргументов для каждого вызова (без agentId)"),
      parallel: z
        .boolean()
        .optional()
        .describe("true — параллельно (по умолчанию для read); false — строго по порядку")
    }),
    async ({ agentId, tool, items, parallel }) => {
      const toolName = String(tool || "").trim();
      const settings = await loadWorkspaceAgentSettings(client, agentId);
      const normalizedItems = (items || []).map((item, index) => normalizeBatchItem(item, index));
      const { category } = assertBatchInvokeAllowed(toolName, normalizedItems.length, settings);

      const handler = toolRegistry.handlers.get(toolName);
      if (!handler) {
        throw new Error(`Unknown MCP tool "${toolName}"`);
      }
      if (toolRegistry.agentScope.get(toolName) === false) {
        throw new Error(`Tool "${toolName}" is not workspace-scoped and cannot be used in batch_invoke`);
      }

      const useParallel = parallel ?? getBatchDefaultParallel(category);
      const formatResult = toolRegistry.formatters.get(toolName);

      let results;
      if (useParallel) {
        results = await Promise.all(
          normalizedItems.map((item, index) =>
            invokeBatchItem({
              client,
              agentId,
              toolName,
              item,
              index,
              handler,
              formatResult
            })
          )
        );
      } else {
        results = [];
        for (let index = 0; index < normalizedItems.length; index += 1) {
          results.push(
            await invokeBatchItem({
              client,
              agentId,
              toolName,
              item: normalizedItems[index],
              index,
              handler,
              formatResult
            })
          );
        }
      }

      const okCount = results.filter((entry) => entry.ok).length;
      return {
        tool: toolName,
        parallel: useParallel,
        category,
        summary: {
          total: results.length,
          ok: okCount,
          error: results.length - okCount
        },
        items: results
      };
    }
  );
}

export function createToolRegistry() {
  return {
    handlers: new Map(),
    formatters: new Map(),
    agentScope: new Map()
  };
}
