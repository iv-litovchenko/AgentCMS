---
awn-preview: ""
awn-emoji: ""
awn-name: overview
awn-status: 🟡 Черновик
awn-type: awn.topic
awn-create: "2026-06-21T18:00"
awn-update: 2026-06-21T18:00:00.000Z
awn-description: Глобальные справочники — tags, statuses, colors…
awn-main: false
awn-category: ""
awn-tags: [catalog]
awn-color: ""
awn-version: 1
awn-sort: ""
---

# Catalog overview

| | |
|---|---|
| **Workspace** | `data/catalog/` |
| **Путь в UI** | agent «Платформа» → area `catalog/` |

## Топики справочников

| Топик | Данные |
|-------|--------|
| `tags.md` | `awn-storage/tags/memory.csv` |
| `categories.md` | `awn-storage/categories/memory.csv` |
| `statuses.md` | `awn-storage/statuses/memory.csv` |
| `users.md` | `awn-storage/users/memory.csv` |
| `priorities.md` | `awn-storage/priorities/memory.csv` |
| `colors.md` | `awn-storage/colors/memory.csv` |
| `schemas.md` | `awn-storage/schemas/memory.md` |

## Использование в агентах

Frontmatter полей (`awn-status`, `awn-tags`, `awn-category`…) ссылаются на значения из catalog через UI pickers / validation (план).

## Почему отдельный workspace

- один источник истины для **всех** агентов
- `agent-cms-core` описывает **механику**, catalog — **значения**
