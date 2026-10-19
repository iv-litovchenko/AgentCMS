---
name: agent-cms-search
description: Как искать и ориентироваться в Agent CMS — оглавления (index_toc), гибридный/полнотекстовый/семантический поиск, backlinks, сущности, DQL-выборки по frontmatter, индексы и их пересборка. Применяй, когда нужно найти информацию в хранилище, получить обзор темы или хаба, сделать выборку по полям, найти ссылки между записями или поправить индекс.
---

# Agent CMS — поиск и навигация

Оглавления, поиск и индексы — отдельные tools, не `read_content`. Устройство хранилища и чтение файлов — скилл `agent-cms`.

| Задача | Tool |
|--------|------|
| Обзор | `topics_list`; INDEX — `topics_index_toc_read`; все manifest — `workspace_map_read`; папки без manifest — `contents_list` (`kind: root`) |
| Тема / слот | `read_content_index_toc` |
| Каталоги хабов | `read_channels_index_toc`, `read_databases_index_toc`, `read_repository_index_toc`, `read_media_library_index_toc` (+ `refresh_*`) |
| Поиск (по умолчанию) | `search_workspace_hybrid`; несколько вопросов — `search_workspace_batch` |
| Точный текст, имена файлов / по смыслу | `search_workspace_content` / `search_workspace_semantic` |
| Внутри темы | `resolve_workspace_path` → `topic.folderPath` → параметр `pathPrefix` |
| Backlinks и исходящие | **только** `search_workspace_links` (нужен `rebuild_workspace_link_index`) |
| Ответ по архиву с контекстом | `ask_workspace` / `search_and_get_context` |
| Люди, даты, суммы, теги | `query_workspace_entities`, `list_workspace_entity_catalog` |
| Выборка по frontmatter | `query_workspace_storage({ dql })` |
| Готовые выборки | `list_workspace_registry_queries` → `run_workspace_registry_query({ id })` |
| Лента и аудит | `list_workspace_feed`, `list_recent_activity`, `audit_workspace_memory` |

Хиты поиска содержат `startLine` / `endLine` → `read_content` с `kind: root`, `startLine`, `limitLines`. Лёгкая мета без тела — `read_content` с `part=meta`.

Код в `awn-repositories/` не индексируется — только `manifest.md`, `index.md`, `groups.yml`.

## Индексы

После правки одного файла — `sync_workspace_index_file`; полный `rebuild_workspace_indexes` — только после массовых изменений. По слоям: `rebuild_workspace_fulltext_index` / `_semantic_index` / `_storage_index` / `_link_index` / `_entity_index`. Состояние — `get_workspace_index_status` / `get_workspace_index_monitor`.

**Реестр сущностей** (применяется после `rebuild_workspace_entity_index`): `merge_workspace_entity_alias`, `reject_workspace_entity`, `seed_workspace_entity`, `upsert_workspace_entity_type`, `get_` / `put_workspace_entity_registry` (весь файл — для крупных правок), `explain_workspace_entity_search` (отладка).

## DQL для `query_workspace_storage`

Строка DQL, **не SQL**.

```
FROM path/prefix
WHERE status = "open" AND (priority > 2 OR tags CONTAINS "x") AND file.mtime LAST 7 DAYS
FLATTEN tags · GROUP BY field COUNT|SUM|MIN|MAX · SORT f DESC, g ASC · LIMIT n · SELECT a, b
WITH TEXT "…"   — hybrid-поиск только по отобранным путям
```

Поля: frontmatter + `file.name`, `file.folder`, `file.mtime`, `file.size`, `file.inlink-count`, `file.outlinks`, `file.inlinks`.
