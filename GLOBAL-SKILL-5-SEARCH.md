---
name: agent-cms-search
description: Как искать и ориентироваться в Agent CMS — оглавления (index_toc), гибридный/полнотекстовый/семантический поиск, backlinks, сущности, DQL-выборки по frontmatter, индексы и их пересборка. Применяй, когда нужно найти информацию в хранилище, получить обзор темы или хаба, сделать выборку по полям, найти ссылки между записями или поправить индекс.
---

# Agent CMS — поиск и навигация

Оглавления, поиск и индексы — отдельные tools, не `read_content`. Устройство хранилища и чтение файлов — скилл `agent-cms`.

| Задача | Tool |
|--------|------|
| Обзор | `topics_list`; INDEX — `nav_index_toc_topics_read`; все manifest — `nav_map_workspace_read`; папки без manifest — `contents_list` (`kind: root`) |
| Тема / слот | `read_content_index_toc` |
| Каталоги хабов | `read_channels_index_toc`, `read_databases_index_toc`, `read_repository_index_toc`, `read_media_library_index_toc` (+ `refresh_*`) |
| Поиск (по умолчанию) | `search_hybrid`; несколько вопросов — `search_batch` |
| Точный текст, имена файлов / по смыслу | `search_content` / `search_semantic` |
| Внутри темы | `resolve_workspace_path` → `topic.folderPath` → параметр `pathPrefix` |
| Backlinks и исходящие | **только** `search_links` (нужен `index_link_rebuild`) |
| Ответ по архиву с контекстом | `ask_workspace` / `search_and_get_context` |
| Люди, даты, суммы, теги | `entity_query`, `entity_catalog_list` |
| Выборка по frontmatter | `index_storage_query({ dql })` |
| Готовые выборки | `list_workspace_registry_queries` → `run_workspace_registry_query({ id })` |
| Лента и аудит | `list_workspace_feed`, `list_recent_activity`, `audit_workspace_memory` |

Хиты поиска содержат `startLine` / `endLine` → `read_content` с `kind: root`, `startLine`, `limitLines`. Лёгкая мета без тела — `read_content` с `part=meta`.

Код в `awn-repositories/` не индексируется — только `manifest.md`, `index.md`, `groups.yml`.

## Индексы

После правки одного файла — `index_file_sync`; полный pipeline — `indexes_rebuild` (только после массовых изменений). По слоям: `index_fulltext_rebuild` / `index_semantic_rebuild` / `index_storage_rebuild` / `index_link_rebuild` / `index_entity_rebuild`; OCR отдельно — `index_ocr_run`. Состояние — `index_status_get` / `index_monitor_get`.

**Реестр сущностей** (YAML, после `index_entity_rebuild`): `entity_alias_merge`, `entity_reject`, `entity_seed`, `entity_type_upsert`, `entity_registry_get` / `entity_registry_put` (весь файл — для крупных правок). Отладка hybrid-фильтра — `entity_search_explain`. Legacy: `*_workspace_entity_*`.

## DQL для `index_storage_query`

Строка DQL, **не SQL**.

```
FROM path/prefix
WHERE status = "open" AND (priority > 2 OR tags CONTAINS "x") AND file.mtime LAST 7 DAYS
FLATTEN tags · GROUP BY field COUNT|SUM|MIN|MAX · SORT f DESC, g ASC · LIMIT n · SELECT a, b
WITH TEXT "…"   — hybrid-поиск только по отобранным путям
```

Поля: frontmatter + `file.name`, `file.folder`, `file.mtime`, `file.size`, `file.inlink-count`, `file.outlinks`, `file.inlinks`.
