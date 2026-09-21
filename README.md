# AGENT CMS

**Agent CMS** — file-based CMS для совместной работы человека и LLM-агента. Без базы данных: контент, структура и память лежат на диске в markdown и YAML.

## Три приложения

| | Назначение |
|---|------------|
| **Agent CMS** | Редактор: дерево страниц, настройки, память, MCP |
| **Agent CMS Voice** | Голосовой клиент к тому же хранилищу |
| **Agent CMS Control** | Пульт: сервер, сборки, зависимости, desktop-приложения |

Один workspace — три входа. Человек в UI, агент через MCP, голос через Voice.

## Идеи

1. **Одно хранилище** — у человека и агента не два разных «мира файлов», а одно дерево Page · Slot · Content.
2. **Файлы вместо БД** — всё на диске; индексы и кэш пересобираются из файлов.
3. **Агент как полноценный пользователь** — те же страницы, те же tools; секреты в `.env`, runtime в `.agent-cms/`.

## Как устроено

- **Workspace** — корневая папка агента: темы, области, медиа, `AGENTS.md`, `settings.yml`.
- **Платформа** — ядро в `agent-cms-core`: типы, MCP-tools, глобальные настройки. Одна платформа — много workspace.
- **Page · Slot · Content** — страница, слот внутри неё, запись в слоте.

Секреты — в `.env`. Временное и пересобираемое — в `.agent-cms/`.

## Первый старт

Этот файл показывается на главной Agent CMS. Его же можно вставить в чат с агентом — «объясни Agent CMS по README.md» — чтобы обсудить систему с нуля.

Дальше: запустите сервер, откройте workspace, прочитайте `AGENTS.md` в корне хранилища.

## Ссылки

- Сайт: [agent-cms.ru](https://agent-cms.ru/)
- GitHub: [iv-litovchenko/AgentCMS](https://github.com/iv-litovchenko/AgentCMS)

## Запуск

```bash
npm install && npm run start:https
```

→ https://localhost:3443

Desktop: [desktop/README.md](desktop/README.md) · MCP: [mcp-server/README.md](mcp-server/README.md)

## Для агента

Операционная карта — [`GLOBAL_MCP_DOC.md`](workspaces/agent-cms-core/GLOBAL_MCP_DOC.md). Работа с хранилищем — только через MCP tools.
