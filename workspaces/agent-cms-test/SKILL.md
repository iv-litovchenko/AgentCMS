***

name: agent-cmsdescription: Работа с Agent CMS через MCP. Используй при задачах в workspace агента.
---

# Agent CMS

## Старт

1. MCP `get_session_context`
2. MCP `get_mcp_docs` — справка по инструментам
3. `get_menu` — навигация по контенту

## Зоны workspace

* `awn-system/` — модель CMS
* `awn-container/` — контент
* `awn-agent-kit/` — runtime агента

## MCP (часто)

| Задача | Tool |
| ------ | ---- |
| Меню | `get_menu` |
| Узел | `read_node_properties` / `write_node_properties` |
| Память/контент | `read_external_memory` / `write_external_memory` |
| Уведомление | `notify_user` |

Подробнее — `AGENTS.md`.