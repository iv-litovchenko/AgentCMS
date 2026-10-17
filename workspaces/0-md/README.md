# Platform agent docs (`0-md`)

Глобальные markdown для агентов и MCP (не workspace `SKILL.md` в корне хранилища):

| Файл | Назначение |
|------|------------|
| `MCP-INSTRUCTIONS.md` | Вводная в MCP server `instructions` при подключении |
| `GLOBAL-SKILL-1-BASE.md` | Скилл `agent-cms` — работа с хранилищем |
| `GLOBAL-SKILL-2-RESPONSE-STYLE.md` | Always-context: стиль ответов (`#N` 🗄️/🌐/💭) |
| `GLOBAL-SKILL-3-RULES.md` | Always-context: правила человека |
| `GLOBAL-SKILL-4-MARKDOWN.md` | Скилл `agent-cms-markdown` — разметка при записи md |
| `GLOBAL-SKILL-5-SEARCH.md` | Скилл `agent-cms-search` — поиск, индексы, DQL |
| `GLOBAL-SKILL-6-MODULES.md` | Скилл `agent-cms-modules` — модули (git и др.) |
| `GLOBAL-MARKDOWN-SHOWCASE.md` | Демо разметки для человека (кнопка **MD**) |

MCP: `read_platform_doc({ path: "GLOBAL-SKILL-1-BASE.md" })`. Старые имена (`GLOBAL-SKILL.md`, …) — алиасы на чтение.
