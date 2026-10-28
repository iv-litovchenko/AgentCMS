# ✅ Закрыто

# Рефакторинг — часть 10

**Цель:** **`workspaceId`** = id хранилища (канон), **`agentId`** = legacy alias (не persona **0-agent**).

## Сделано

- MCP: `agent-scope`, все tools, batch, registry tools, deprecation stderr (отключить: `AGENT_CMS_MCP_DEPRECATE_AGENT_ID=0`).
- REST query: `workspace`, `workspaceId`, `agent`, `agentId` — `/api/agent/*`, registry, focus/main, preview, slider, CHPU canonical-path.
- REST body: registry workspace/groups, platform default-workspace, shell interactive APIs.
- Ответы: session-context, mcp-ping, platform/info, active-context, shell complete, CHPU canonical.
- UI: `activeWorkspaceId`, `getActiveWorkspaceId`, `buildApiUrl` / `appendWorkspaceToApiUrl` (`?agent=` + `?workspace=`).
- CHPU helpers: `canonicalChpuWorkspaceId`, `getWorkspaceIdFromUrl` (+ deprecated aliases).
- Shell client: `workspaceId` в POST и status payload.
- Доки: GLOBAL-DOC-MCP, MCP-INSTRUCTIONS, SKILL, mcp README, REFACTOR-4, chpu-resolver comment.

## Не делали (осознанно)

- Массовая правка черновиков в `workspaces/0-ws-core/**`.
- Переименование внутренних имён в `agent-registry` / `runWithAgent` (отдельный рефакторинг).
- Удаление alias **`agentId`**.

## Чат

`7df0010c-2f8e-45f1-8208-8933ede2fb9a`
