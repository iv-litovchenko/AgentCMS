# Agent Shell Desktop

Отдельное приложение **Agent Shell** с собственной иконкой.

## Запуск (разработка)

```bash
# из корня YamlCMS
npm run shell:desktop
```

Если CMS ещё не запущен — Shell **сам поднимет** `server.js` (только в dev).

## Сборка .app

```bash
npm run shell:dist
open "dist/shell/mac/Agent Shell.app"
```

Собранный Shell ожидает, что **Agent CMS server уже работает**  
(`npm start` или **Agent CMS.app**).

## Два приложения

| App | Команда | Назначение |
|-----|---------|------------|
| **Agent CMS** | `npm run desktop` | редактор, workspace, MCP |
| **Agent Shell** | `npm run shell:desktop` | голос, компактное окно |

Можно запускать **по отдельности** или **оба сразу**.

## Настройки

Файл: `~/Library/Application Support/agent-shell/shell-config.json`

- `cmsBaseUrl` — URL CMS (по умолчанию `http://127.0.0.1:3000`)
- `agentId` — активный агент (по умолчанию `agent-cms-test`)

Переменные окружения: `AGENT_CMS_BASE_URL`, `AGENT_CMS_AGENT`, `PORT`.
