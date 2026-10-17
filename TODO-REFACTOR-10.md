# Рефакторинг — часть 10

**Цель:** в MCP/API/UI **`agentId`** по смыслу = **id хранилища (workspace)** — переименовать в **`workspaceId`**, не путать с темой **0-agent** / `get_agent_identity`.

| Сейчас | План |
| ------ | ---- |
| `agentId` (MCP, REST, UI, CHPU `/{agentId}/…`) | **`workspaceId`** (канон) + **alias** `agentId` |

## Зачем

1. **Workspace** — реестр, папка `workspaces/<id>/`, CHPU первый сегмент.
2. **Agent (persona)** — `awn-topics/0-agent-kit/0-agent/`, identity tools — другое.
3. После REFACTOR-9 id вида **`0-ws-*`** — слово «agent» в параметре ещё сильнее вводит в заблуждение.

## Scope

- MCP: zod args, descriptions, `batch_invoke` (items без agentId → без workspaceId).
- REST `/api/*`, `server.js`, `public/main.js` (`activeAgentId` → поэтапно).
- Доки: `GLOBAL-DOC-MCP.md`, `SKILL.md`, `MCP-INSTRUCTIONS.md`, `TODO-REFACTOR-4`.
- CHPU: сегмент URL (опционально позже; alias старого id уже есть в REFACTOR-9).

## Не в scope

- Переименование **CLI sandbox** `0-cli-sandbox/<runtime>/<agent-id>/` — отдельно (там тоже ws id).
- REFACTOR-5 (бренд Agent CMS).
- Удаление alias **`agentId`** — только после deprecation-срока.

## Безопасная схема

1. Принимать **оба** ключа везде (`workspaceId` ?? `agentId`).
2. В ответах/логах — **`workspaceId`**.
3. Доки и новые tools — только **`workspaceId`**.
4. Потом (опц.) deprecate `agentId` в MCP schema.

## Оценка сложности

**Средне, не «один replace»:** сотни вхождений (`agentId`, `activeAgentId`, `getActiveAgentId`, MCP policy, desktop/shell). **Не сломать**, если alias на входе + не трогать внутренние имена одним коммитом. Риск: внешние клиенты MCP, Cursor config, скрипты с `agentId` в JSON.

## Чат (Cursor)

`<!-- uuid при старте работы -->`
