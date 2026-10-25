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
| Файлы | `{хост}/awn-storage/assets/viz/{awn-id}/{kind}.viz.md` — рядом с записью, как `assets/materials/{awn-id}/` |
| YAML | `viz-kind`, `viz-about`, `awn-name` (из записи при создании), `awn-type` (фикс. для карты) |
| MCP / HTTP | `viz_map_*`, `viz_maps_*` — без слова *atlas* |

Список всех карт = **`viz_maps_all_list`** (скан файлов; отдельного индекса «пересобрать атлас» нет).

## Файлы и привязка к записи

- **Канон:** `{topic}/awn-storage/assets/viz/{awn-id}/{kind}.viz.md` — в bundle хранилища записи (тот же принцип, что `assets/materials/{awn-id}/`), связь по **`awn-id`** и **`viz-about`**.
- **Создание** — только если у записи уже есть `awn-id` (иначе API вернёт ошибку; сначала присвоить id).
- **Legacy (чтение):** workspace-root `assets/viz/{awn-id}/` (ранний канон), colocated `{stem}.{kind}.viz.md`; новые — только в bundle `…/awn-storage/assets/viz/`. Миграция: `node scripts/migrate-viz-maps-to-bundle-assets.js [workspacePath]`.
- **`viz-about`** — путь записи в frontmatter (MCP: **`recordPath`**).
- **`viz-kind`** — вид карты; заголовок в UI — **`awn-name`** (при создании копируется с записи; **`viz-title`** опционален, legacy).
- **`awn-type`** на карте — свой (`awn.content.record`), **не** с родительской записи.

Пример: запись `awn-topics/foo/awn-storage/main/note.md` с `awn-id: 45` → mindmap: `awn-topics/foo/awn-storage/assets/viz/45/mindmap.viz.md`.

## Реестр видов (7 разделов · 11 kinds)

Каталог: `awn-system/types/viz/` (`registry.yml` + `*.yml`).

| Раздел | kinds |
|--------|--------|
| Знания (`knowledge`) | mindmap, concept |
| Планы (`plans`) | roadmap, goaltree |
| Процессы (`process`) | flowchart, architecture, decision |
| Время (`time`) | timeline |
| Люди (`people`) | people |
| Места (`places`) | geo |
| Пространство (`space`) | scene3d — JSON в блоке ` ```scene3d `, превью Three.js (примитивы + glTF) |

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
