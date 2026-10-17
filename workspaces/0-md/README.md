# Platform agent docs (`0-md`)

Глобальные markdown для агентов и MCP (не workspace `SKILL.md` в корне хранилища):

| Файл | Назначение |
|------|------------|
| `MCP-INSTRUCTIONS.md` | Вводная в MCP server `instructions` при подключении |
| `GLOBAL-SKILL-1-BASE.md` | Скилл `agent-cms` — работа с хранилищем |
| `GLOBAL-SKILL-2-RESPONSE-STYLE.md` | Always-context: стиль ответов (`#N` 🗄️/🌐/💭) |
| `GLOBAL-SKILL-3-RULES.md` | Always-context: правила человека |
| `GLOBAL-SKILL-4-MARKDOWN.md` | Markdown preview в редакторе |
| `GLOBAL-MCP-INSTRUCTION.md` | Legacy-карта MCP (канон — `GLOBAL-SKILL-1-BASE.md`) |

MCP: `read_platform_doc({ path: "GLOBAL-SKILL-1-BASE.md" })`. Старые имена (`GLOBAL-SKILL.md`, …) — алиасы на чтение.
