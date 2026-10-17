# Platform agent docs (`0-md`)

Глобальные markdown для агентов (не workspace `SKILL.md` в корне хранилища):

| Файл | Назначение |
|------|------------|
| `GLOBAL-SKILL-0-MCP-WELCOME.md` | Скилл `agent-cms-welcome` — ввод, старт MCP, карта скиллов |
| `GLOBAL-SKILL-1-BASE.md` | Скилл `agent-cms` — работа с хранилищем |
| `GLOBAL-SKILL-2-RESPONSE-STYLE.md` | Always-context: стиль ответов (`#N` 🗄️/🌐/💭) |
| `GLOBAL-SKILL-3-RULES.md` | Always-context: правила человека |
| `GLOBAL-SKILL-4-MARKDOWN.md` | Скилл `agent-cms-markdown` — разметка при записи md |
| `GLOBAL-SKILL-5-SEARCH.md` | Скилл `agent-cms-search` — поиск, индексы, DQL |
| `GLOBAL-SKILL-6-MODULES.md` | Скилл `agent-cms-modules` — модули (git и др.) |

MCP `instructions` при подключении — короткий inline-текст в `mcp-server/lib/mcp-instructions.js` (не целый файл).

Чтение через MCP: `read_platform_doc({ path: "GLOBAL-SKILL-1-BASE.md" })`. Старые имена (`MCP-INSTRUCTIONS.md`, `GLOBAL-SKILL.md`, …) — алиасы на чтение.
