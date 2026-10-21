---
name: agent-cms-viz
description: Живые карты визуализации в Agent CMS — файлы *.viz.md, виды из awn-system/types/viz/, MCP tools viz_map_*. В UI раздел «Атлас» — сборник карт; в API и MCP слово atlas не используется. По просьбе человека.
---

# Agent CMS — карты визуализации (viz maps)

Базовая работа с хранилищем — скилл `agent-cms`. Legacy-поля `awn-viz-*` в canvas RMM **не** заполняй — см. `GLOBAL-SKILL-1-BASE.md`.

## Что такое «Атлас»

**Атлас** — человеческое название в интерфейсе: *сборник карт*, упорядоченный каталог иллюстраций и схем по workspace. Это **не** отдельная сущность в данных и **не** имя для MCP/API.

| Где | Как называть |
|-----|----------------|
| UI редактора | «Атлас», «Виды карт» |
| Файлы | `*.viz.md` рядом с записью |
| YAML | `viz-kind`, `viz-about`, `viz-title` |
| MCP / HTTP | `viz_map_*`, `viz_maps_*` — без слова *atlas* |

Список всех карт = **`viz_maps_all_list`** (скан файлов; отдельного индекса «пересобрать атлас» нет).

## Файлы и привязка к записи

- Имя: `{stem-записи}.{kind}.viz.md` в той же папке, что и запись (stem — имя файла записи без расширения).
- **`viz-about`** — путь записи, о которой карта (в MCP аргумент **`recordPath`**; поле в frontmatter остаётся `viz-about`).
- **`viz-kind`** — id вида из реестра (`mindmap`, `roadmap`, …).
- **`viz-title`** — заголовок карты (опционально).

Пример: запись `awn-topics/demo/note.md` → карта mindmap: `awn-topics/demo/note.mindmap.viz.md`.

## Реестр видов (6 разделов · 10 kinds)

Каталог: `awn-system/types/viz/` (`registry.yml` + `*.yml`).

| Раздел | kinds |
|--------|--------|
| Знания (`knowledge`) | mindmap, concept |
| Планы (`plans`) | roadmap, goaltree |
| Процессы (`process`) | flowchart, architecture, decision |
| Время (`time`) | timeline |
| Люди (`people`) | people |
| Места (`places`) | geo |

Полный список с подписями и шаблонами — **`viz_map_types_list`**.

## MCP tools

| Задача | Tool |
|--------|------|
| Реестр видов и разделов | `viz_map_types_list` |
| Все карты workspace (фильтры) | `viz_maps_all_list` (`recordPath`, `kind`, `section`) |
| Карты для одной записи (есть/нет файла) | `viz_maps_for_record` |
| Прочитать карту | `viz_map_read` (`mapPath` или `recordPath` + `kind`) |
| Создать / обновить | `viz_map_write` |
| Удалить | `viz_map_delete` — **только по просьбе человека** |

Устаревшие имена (aliases): `viz_kind_list`, `viz_atlas_read`, `viz_maps_for_about`, … — не используй в новых сценариях.

## HTTP (редактор и отладка)

| Method | Path |
|--------|------|
| GET | `/api/viz/kinds` |
| GET | `/api/viz/maps` (alias: `/api/viz/atlas`) |
| GET | `/api/viz/maps-for-record` (alias: `/api/viz/maps-for-about`, query `about` или `recordPath`) |
| GET | `/api/viz/map` |
| POST | `/api/viz/map` |
| DELETE | `/api/viz/map` |

## Практика для агента

1. Перед созданием карты — `viz_map_types_list` или `viz_maps_for_record`, чтобы не дублировать kind.
2. Тело карты — обычный markdown; frontmatter держи согласованным с `recordPath` и `kind`.
3. Не смешивай с legacy RMM mindmap/roadmap на canvas — это другой механизм (`awn-viz-*`).
4. Удаление файла карты — явная просьба человека; запись-«about» при этом не трогай.
