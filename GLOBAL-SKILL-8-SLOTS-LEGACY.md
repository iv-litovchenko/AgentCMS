---
name: agent-cms-slots-legacy
description: Agent CMS — legacy-имена слотов, папок и placement.kind. Справочник для MCP; канон — GLOBAL-SKILL-1-BASE §4.
---

# Agent CMS — слоты и legacy-алиасы

Ответы API/MCP (v2): **`slot`** и **`slotKey`** — канон роутера (`memory`, `notes`, …); **`storageFolder`** и **`folder`** — папка под `awn-storage/`; **`workspacePath`** — файл от корня workspace.

## Placement kind (legacy → канон)

| Legacy input | MCP `placement.kind` |
| --- | --- |
| `page` | `topic` |
| `tree` | `root` |
| `infoblock`, `store` | `database` |

## Пути workspace (legacy → канон)

| Legacy | Канон |
| --- | --- |
| `awn-container/` | `awn-topics/` |
| `…/storage/` | `…/awn-storage/` |
| `awn-database/`, `awn-data/` | `awn-databases/` |
| `INDEX.md` (оглавление тем) | `index.md` |

## Слот → папка на диске (тема)

| MCP `placement.slot` (канон **slot**) | Алиасы slot | Папка `awn-storage/` |
| --- | --- | --- |
| `memory` | `main`, `external` | `main/` (legacy disk: `memory/`, `content/`) |
| `notes` | `note` | `notes/` (legacy: `note/`) |
| `scripts` | `script` | `scripts/` |
| `discussion` | `thread`, `dialogs` | `discussion/` (legacy: `thread/`) |
| `atlas` | `roadmap`, `roadmap-single` | `atlas/` (legacy: `roadmap/`) |
| `todo-single` | `todo` | `todo/` (bundle, internal) |
| `task-queue` | `agent-task-queue`, `agent-queue` | `task-queue/` |

Остальные слоты темы: имя slot = имя папки (`inbox`, `references`, `artefacts`, `media`, `assets`, `repository`, …).

## Одна папка `main/` — два смысла

| slot | driver | ref |
| --- | --- | --- |
| `memory` | external | нужен (`zapis.md`) |
| `main-single`, `main-single-csv` | internal | **не** использовать |

## Слоты по kind (не копировать из темы)

| kind | Слоты |
| --- | --- |
| `topic` | см. §4 BASE + таблица выше |
| `channel` | `inbox`, `task-queue`, `outbox`, `files`, `assets` — **нет** `memory`/`main` |
| `media`, `repository` | `files`, `assets` |
| `database` | `data`, `assets` |
| `root` | без slot/ref — только `path` |

## Особые случаи

- **`repository` в теме** — мелкий код в слоте темы; hub **`awn-repositories`** — отдельная сущность.
- **`discussion` / `comments`** — через comment-tools, не обычный `content_create`.
- **`awn-slots-flexible`** — только `main` / `memory` → `awn-storage/main/`.

Перед записью: **`contents_slots_list`** для выбранного `placement.kind` и path.
