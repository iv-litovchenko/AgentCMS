---
name: agent-cms-welcome
description: Ввод в Agent CMS — зачем хранилище, старт через MCP, карта скиллов 0–6. Необязательный скилл: если не установлен, агент читает его через read_platform_doc. Используй, когда подключаешь MCP или человек спрашивает «что такое Agent CMS» и с чего начать.
---

# Agent CMS — welcome

Это общая память человека и агента (1+1). Человек кладёт заметки, задачи, файлы; ты читаешь и дополняешь через MCP. Ведущая роль у человека — сохраняй его формулировки, не удаляй и не переписывай без просьбы.

## Старт — только по запросу человека

Сам tools не вызывай, пока человек не попросил.

Когда попросил:

1. Только MCP tools сервера **agent-cms** — не `curl`, не прямое чтение файлов на диске.
2. `list_workspaces` → `get_session_context({ workspaceId })`.
3. Во **всех** дальнейших вызовах — тот же `workspaceId`.
4. Пути и типы не угадывай — из ответов tools.

## Как устроено (кратко)

- **Workspace** — папка с md-файлами.
- **Каналы** — входящие потоки; **темы** — знания; **базы** — структурированные данные; **репозитории** — код; **медиатеки** — файлы.
- Ещё: журнал, факты, глоссарий, справочник, крон/heartbeat, зависимости, sidecar.

## Скиллы (установи из репозитория)

Папка **`workspaces/0-md`** в https://github.com/iv-litovchenko/AgentCMS — установи скиллы в клиенте (Claude Desktop, Cursor и т.д.). Без скиллов модель видит только список tools.

| Скилл | Файл | Когда |
|-------|------|--------|
| Welcome | `GLOBAL-SKILL-0-MCP-WELCOME.md` | этот файл |
| Base | `GLOBAL-SKILL-1-BASE.md` | работа с хранилищем и tools |
| Style | `GLOBAL-SKILL-2-RESPONSE-STYLE.md` | как отвечать |
| Rules | `GLOBAL-SKILL-3-RULES.md` | правила человека |
| Markdown | `GLOBAL-SKILL-4-MARKDOWN.md` | разметка при записи md |
| Search | `GLOBAL-SKILL-5-SEARCH.md` | поиск, индексы, DQL |
| Modules | `GLOBAL-SKILL-6-MODULES.md` | git и другие модули |

Через MCP можно прочитать текст скилла: `read_platform_doc({ path: "GLOBAL-SKILL-1-BASE.md" })` (и другие **имена файлов** из таблицы; список — `list_platform_docs`).

## Больше информации

Документация и исходники — https://github.com/iv-litovchenko/AgentCMS.