# Рефакторинг — часть 10

**Цель:** в MCP/API/UI **`agentId`** по смыслу = **id хранилища (workspace)** — переименовать в **`workspaceId`**, не путать с темой **0-agent** / `get_agent_identity`.

| Сейчас | План |
| ------ | ---- |
| `agentId` (MCP, REST, UI, CHPU `/{agentId}/…`) | **`workspaceId`** (канон) + **alias** `agentId` |

## Зачем

1. **Workspace** — реестр, папка `workspaces/<id>/`, CHPU первый сегмент.
2. **Agent (persona)** — `awn-topics/0-agent-kit/0-agent/`, identity tools — другое.
3. После REFACTOR-9 id вида **`0-ws-*`** — слово «agent» в параметре ещё сильнее вводит в заблуждение.

## Прогресс

### ✅ Сделано (фаза 1 — MCP + docs + вход REST)

- [x] **`mcp-server/lib/agent-scope.js`** — `workspaceIdField`, `resolveWorkspaceId`, `normalizeWorkspaceScopedArgs`, `withAgentIdSchema` (оба ключа); legacy id → canonical через `bundled-workspaces`.
- [x] **`mcp-server/index.js`** — все scoped tools через `normalizeWorkspaceScopedArgs`; описания с `workspaceId`.
- [x] **`mcp-server/lib/batch-invoke-tools.js`** — items без `workspaceId`/`agentId`; batch scope из top-level args.
- [x] **`mcp-server/lib/workspace-tools.js`** — registry/group tools: `workspaceId` или legacy `agentId` → REST body `agentId`.
- [x] **`lib/workspace/resolve-workspace-id-from-args.js`** — helper для REST/query.
- [x] **`server.js`** — `/api/agent/*` scope: query `workspace`, `workspaceId`, `agent`, `agentId` (+ alias id); **`mcp-ping`** отдаёт `workspaceId` и `agentId`.
- [x] Доки: **`GLOBAL-DOC-MCP.md`**, **`MCP-INSTRUCTIONS.md`**, **`SKILL.md`**, **`mcp-server/README.md`**, **`lib/http/https-redirect.js`** (MCP onboarding text).

### ❌ Ещё нужно (фаза 2+)

- [ ] **`public/main.js`** — `activeAgentId` → `activeWorkspaceId` (поэтапно; не блокирует MCP).
- [ ] **REST JSON bodies** — массово принимать `workspaceId` в POST/PATCH (сейчас в основном query `?agent=`; точечные body — по мере правок API).
- [ ] **Ответы API / session-context** — дублировать **`workspaceId`** рядом с `agentId` в ключевых payload (не только mcp-ping).
- [ ] **CHPU** — переименование сегмента URL в доках/коде (`workspaceId` vs `agentId` в комментариях); canonical ws id уже из REFACTOR-9.
- [ ] **`TODO-REFACTOR-4.md`** — обновить примеры MCP при следующем проходе по doc-4.
- [ ] **Контент в `workspaces/0-ws-core/**`** — черновики с `agentId` в тексте (низкий приоритет).
- [ ] **Deprecation** — предупреждение в MCP schema / лог при только `agentId` (опционально, после срока — убрать alias).

## Scope (исходный)

- MCP: zod args, descriptions, `batch_invoke`.
- REST `/api/*`, `server.js`, `public/main.js` (`activeAgentId` → поэтапно).
- Доки: `GLOBAL-DOC-MCP.md`, `SKILL.md`, `MCP-INSTRUCTIONS.md`, `TODO-REFACTOR-4`.
- CHPU: сегмент URL (опционально позже).

## Не в scope

- Переименование **CLI sandbox** `0-cli-sandbox/<runtime>/<agent-id>/`.
- REFACTOR-5 (бренд Agent CMS).
- Удаление alias **`agentId`** — только после deprecation-срока.

## Безопасная схема

1. Принимать **оба** ключа везде (`workspaceId` ?? `agentId`).
2. В ответах/логах — **`workspaceId`** (начато: mcp-ping).
3. Доки и новые tools — только **`workspaceId`**.
4. Потом (опц.) deprecate `agentId` в MCP schema.

## Оценка сложности

**Средне:** фаза 1 (MCP + alias) — **готова**. Фаза 2 (UI + ответы API + body) — сотни вхождений, отдельными PR.

## Чат (Cursor)

`7df0010c-2f8e-45f1-8208-8933ede2fb9a`
