---
awn-supertype: awn-data/system-presets/manifest.md
awn-title: "Cursor Skill — SKILL.md"
awn-preset-id: "awn.preset.skill"
awn-target-file: "SKILL.md"
awn-hint-title: "Cursor Skill — инструкция для агента"
awn-hint-text: "Служебный <code>SKILL.md</code> workspace: краткий скилл для Cursor/агента — как работать с этим Agent CMS через MCP. Frontmatter <code>name</code> и <code>description</code> — только в режиме «Исходник»; в визуальном редакторе меняется только основной текст."
awn-status: active
awn-sort: 3
---
---
name: agent-cms
description: Работа с Agent CMS через MCP. Используй при задачах в workspace агента.
---

# Agent CMS

## Старт
1. MCP `get_session_context`
2. MCP `get_mcp_docs` — справка по инструментам
3. `get_menu` — навигация по контенту

## Зоны workspace
- `awn-system/` — модель CMS
- `awn-container/` — контент
- `awn-agent-kit/` — runtime агента

## MCP (часто)
| Задача | Tool |
| ------ | ---- |
| Меню | `get_menu` |
| Страница | `read_page_properties` / `write_page_properties` |
| Память/контент | `create_slot_record` / `read_slot_record` |
| Уведомление | `notify_user` |

Подробнее — `AGENTS.md`.
