# Рефакторинг — часть 10

**Цель:** в MCP/API/UI **`agentId`** по смыслу = **id хранилища (workspace)** — переименовать в **`workspaceId`**, не путать с темой **0-agent** / `get_agent_identity`.

| Сейчас | План |
| ------ | ---- |
| `agentId` (MCP, REST, UI, CHPU `/{agentId}/…`) | **`workspaceId`** (канон) + **alias** `agentId` |

## Прогресс

### ✅ Сделано

**Фаза 1 — MCP + docs + query REST**

- [x] `mcp-server/lib/agent-scope.js` — `workspaceId`, alias `agentId`, legacy id → canonical.
- [x] `mcp-server/index.js`, `batch-invoke-tools.js`, `workspace-tools.js`.
- [x] `lib/workspace/resolve-workspace-id-from-args.js`.
- [x] `server.js` — scope `/api/agent/*` query (`workspace`, `workspaceId`, `agent`, `agentId`).
- [x] Доки: `GLOBAL-DOC-MCP.md`, `MCP-INSTRUCTIONS.md`, `SKILL.md`, `mcp-server/README.md`, `https-redirect.js`.

**Фаза 2 — UI + ответы API + registry body**

- [x] **`public/main.js`** — `activeWorkspaceId` (+ `getActiveWorkspaceId()`); localStorage key без смены (`agentcms.activeAgent.v1`).
- [x] **REST registry** — PATCH/POST workspace, groups assign/unassign: body **`workspaceId`** или legacy **`agentId`** / `id`.
- [x] **Ответы:** `session-context`, `mcp-ping`, `platform/info`, `active-context`, UI context enrich — поле **`workspaceId`** (+ `agentId`).
- [x] **`/api/agents/focus|main`** — query alias как у `/api/agent/*`.
- [x] **CHPU** — комментарий в `chpu-resolver.js`.
- [x] **`TODO-REFACTOR-4.md`** — примеры MCP terminology.

### ❌ Осталось (низкий приоритет)

- [ ] **REST JSON bodies** — остальные POST/PATCH под workspace (по мере касания эндпоинтов).
- [ ] **`public/main.js`** — переименовать параметры/CHPU helpers `*AgentId*` где это именно workspace (косметика; state уже `activeWorkspaceId`).
- [ ] **Query `?agent=`** → опционально дублировать `?workspace=` в клиенте (сервер уже понимает оба).
- [ ] **Контент `workspaces/0-ws-core/**`** — черновики с `agentId` в тексте.
- [ ] **Deprecation warning** — лог/schema при только `agentId` (перед удалением alias).

## Не в scope

- CLI sandbox `0-cli-sandbox/<runtime>/<agent-id>/`.
- REFACTOR-5 (бренд).
- Удаление alias **`agentId`**.

## Чат (Cursor)

`7df0010c-2f8e-45f1-8208-8933ede2fb9a`
