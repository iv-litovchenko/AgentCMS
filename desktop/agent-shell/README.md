# Agent Shell Desktop

Electron-приложение **Agent Shell** (`desktop/agent-shell/`).
Backend API и sidecar — в `agent-shell/` (корень репо).

## Запуск (разработка)

```bash
# из корня YamlCMS
npm run shell:desktop
```

Если CMS ещё не запущен — Shell **сам поднимет** `server.js` (только в dev).

## Сборка .app

```bash
npm run shell:dist
npm run shell:open
```

Собранный Shell ожидает, что **Agent CMS server уже работает**  
(`npm start` или **Agent CMS.app**).

## Два приложения

| App | Dev | Назначение |
|-----|-----|------------|
| **Agent CMS** | `npm run cms:desktop` | редактор, workspace, MCP |
| **Agent Shell** | `npm run shell:desktop` | голос, компактное окно |

Можно запускать **по отдельности** или **оба сразу**.

## Настройки

Файл: `~/Library/Application Support/agent-shell/shell-config.json`

- `cmsBaseUrl` — URL CMS (по умолчанию `http://127.0.0.1:3000`)
- `agentId` — активный агент (по умолчанию `agent-cms-test`)

Переменные окружения: `AGENT_CMS_BASE_URL`, `AGENT_CMS_AGENT`, `PORT`.
