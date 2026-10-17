# `0-md`

Глобальные скиллы платформы (`GLOBAL-SKILL-*.md`).

## Содержание

- [О папке](#о-папке)
- [Установка в клиенте](#установка-в-клиенте)
- [Скилл 0 — welcome](#скилл-0--welcome)
- [Скилл 1 — base](#скилл-1--base)
- [Скилл 2 — response-style](#скилл-2--response-style)
- [Скилл 3 — rules](#скилл-3--rules)
- [Скилл 4 — markdown](#скилл-4--markdown)
- [Скилл 5 — search](#скилл-5--search)
- [Скилл 6 — modules](#скилл-6--modules)

## О папке

Каждый `GLOBAL-SKILL-*.md` — markdown с YAML frontmatter (`name`, `description`). Их копируют в Claude Desktop / Cursor как Agent Skills и подключают вместе с MCP **agent-cms**.

Полная таблица и пошаговая установка — в [README.md](../../README.md#-скиллы-для-агентов-claude--cursor--gb-agent-skills-for-claude--cursor) репозитория.

## Установка в клиенте

1. Подключите MCP **agent-cms** (см. [установку](../../README.md#-установка-первый-старт-и-запуск-только-macos-gb-install-first-run-and-launch-macos-only) в корневом README).
2. **Cursor** — `.cursor/skills/<name>/SKILL.md` с полным текстом файла (`<name>` = поле `name` во frontmatter).
3. **Claude Desktop** — Skills из этой папки; минимум **1** (`agent-cms`); **0** (`agent-cms-welcome`) — по желанию.
4. После `git pull` обновите копии в клиенте и перезапустите MCP.

## Скилл 0 — welcome

| | |
| --- | --- |
| Файл | [GLOBAL-SKILL-0-MCP-WELCOME.md](GLOBAL-SKILL-0-MCP-WELCOME.md) |
| `name` | `agent-cms-welcome` |
| Зачем | Ввод, старт MCP, карта скиллов |

## Скилл 1 — base

| | |
| --- | --- |
| Файл | [GLOBAL-SKILL-1-BASE.md](GLOBAL-SKILL-1-BASE.md) |
| `name` | `agent-cms` |
| Зачем | Хранилище и MCP tools |

## Скилл 2 — response-style

| | |
| --- | --- |
| Файл | [GLOBAL-SKILL-2-RESPONSE-STYLE.md](GLOBAL-SKILL-2-RESPONSE-STYLE.md) |
| `name` | `agent-cms-response-style` |
| Зачем | Стиль ответов (🗄️ / 🌐 / 💭) |

## Скилл 3 — rules

| | |
| --- | --- |
| Файл | [GLOBAL-SKILL-3-RULES.md](GLOBAL-SKILL-3-RULES.md) |
| `name` | `agent-cms-rules` |
| Зачем | Глобальные правила |

## Скилл 4 — markdown

| | |
| --- | --- |
| Файл | [GLOBAL-SKILL-4-MARKDOWN.md](GLOBAL-SKILL-4-MARKDOWN.md) |
| `name` | `agent-cms-markdown` |
| Зачем | Разметка в md |

## Скилл 5 — search

| | |
| --- | --- |
| Файл | [GLOBAL-SKILL-5-SEARCH.md](GLOBAL-SKILL-5-SEARCH.md) |
| `name` | `agent-cms-search` |
| Зачем | Поиск, индексы, DQL |

## Скилл 6 — modules

| | |
| --- | --- |
| Файл | [GLOBAL-SKILL-6-MODULES.md](GLOBAL-SKILL-6-MODULES.md) |
| `name` | `agent-cms-modules` |
| Зачем | Git и модули |
