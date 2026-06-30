# Agent CMS — MCP Server v0.2.0

MCP-сервер для [Agent CMS](..): доступ к workspace через HTTP API для Cursor, Claude Desktop, CoPaw / QwenPaw.

## Требования

- Node.js 18+
- Запущенный Agent CMS: из корня репозитория `npm start` → http://localhost:3000

## Установка

```bash
cd mcp-server
npm install
```

## Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `AGENT_CMS_BASE_URL` | `http://localhost:3000` | Базовый URL CMS |
| `AGENT_CMS_AGENT` | — | id агента (`?agent=`); если пусто — default из `awn-agents.json` |

Устаревшие `YAMLCMS_*` по-прежнему читаются.

## Подключение в Cursor

**Settings → MCP → Add server** или файл `.cursor/mcp.json` в корне проекта:

```json
{
  "mcpServers": {
    "agent-cms": {
      "command": "node",
      "args": ["/Users/macbook/Desktop/YamlCMS/mcp-server/index.js"],
      "env": {
        "AGENT_CMS_BASE_URL": "http://localhost:3000",
        "AGENT_CMS_AGENT": "agent-cms-test"
      }
    }
  }
}
```

Замените путь на абсолютный путь к вашему клону YamlCMS.  
`AGENT_CMS_AGENT` — id из `awn-agents.json` (например `agent-cms-test`, `agent-cms-core`).

После сохранения: **перезапустите MCP** в Cursor (или перезагрузите окно).

## Подключение в CoPaw / QwenPaw

В конфиге workspace (`~/.copaw/...`) в секции `mcp_servers`:

```json
{
  "mcp_servers": {
    "agent-cms": {
      "command": "node",
      "args": ["/Users/macbook/Desktop/YamlCMS/mcp-server/index.js"],
      "env": {
        "AGENT_CMS_BASE_URL": "http://localhost:3000",
        "AGENT_CMS_AGENT": "agent-cms-test"
      }
    }
  }
}
```

CMS должен быть запущен (`npm start` в YamlCMS).

## Старт сессии (v0.2)

**Не** делайте `grep` / `curl` / `ls` по репозиторию для разведки.

В начале сессии один раз вызовите:

```
get_session_context
```

Ответ включает:

- `awn-agent-kit/agent/manifest.md` и `user/manifest.md`
- темы с `awn-runtime-load: session-start`
- `AGENTS.md`, `README.md`
- `pathHints` и `apiMap`

Пример path к теме:

```
awn-container/finansydohody/manifest.md
```

(legacy `_registration.md` API тоже принимает)

## Документация tools

- UI: кнопка **MCP** в шапке CMS
- JSON: `GET http://localhost:3000/api/mcp-docs?version=0.0.2`
- MCP tool: `get_mcp_docs`

## Запуск вручную

```bash
npm start          # из корня Agent CMS
node mcp-server/index.js   # stdio — для отладки
```

Из корня: `npm run mcp`

## Что нового в 0.2.0

| Было (0.1) | Стало (0.2) |
|------------|-------------|
| 25 tools в справке | 58 tools |
| `_registration.md`, `_Content` | `manifest.md`, `awn-storage/main/` |
| Разведка через shell | `get_session_context` — один запрос |
| Нет runtime registry | `get_runtime_registry`, `get_storage_layout` |
| — | inbox/thread, comments, topic-schema, tabular memory |
