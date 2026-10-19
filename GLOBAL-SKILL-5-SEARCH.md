---
name: agent-cms-search
description: Как искать и ориентироваться в Agent CMS — оглавления (index_toc), гибридный/полнотекстовый/семантический поиск, backlinks, сущности, DQL-выборки по frontmatter, индексы и их пересборка. Применяй, когда нужно найти информацию в хранилище, получить обзор темы или хаба, сделать выборку по полям, найти ссылки между записями или поправить индекс.
---

# Agent CMS — поиск и навигация

Оглавления, поиск и индексы — отдельные tools, не `content_read`. Устройство хранилища и чтение файлов — скилл `agent-cms`.

| Задача | Tool |
|--------|------|
| Обзор | `topics_list`; INDEX — `nav_index_toc_topics_read`; все manifest — `nav_map_workspace_read`; папки без manifest — `contents_list` (`kind: root`) |
| Тема / слот | `nav_index_toc_contents_read` |
| Каталоги хабов | `nav_index_toc_channels_read`, `nav_index_toc_databases_read`, `nav_index_toc_repositories_read`, `nav_index_toc_media_libraries_read` (+ `refresh_*`) |
| Поиск (по умолчанию) | `index_3_hybrid_search_query`; несколько вопросов — `index_search_query_batch` |
| Точный текст / по смыслу | `index_2_fulltext_search_query` / `index_3_semantic_search_query` |
| Внутри темы | `record_path_resolve` → `topic.folderPath` → параметр `pathPrefix` |
| Backlinks и исходящие | **только** `index_5_link_search_query` (нужен `index_5_link_rebuild`) |
| Ответ по архиву с контекстом | `query_workspace_ask` |
| Люди, даты, суммы, теги | слой 6 эксперимент: `index_6_entity_*_zzz` (🟡) / рабочие `index_6_entity_*` |
| Выборка по frontmatter | `index_4_storage_query({ dql })` |
| Готовые выборки | `registry_queries_list` → `registry_query_run({ id })`; nav: `session_list_in_focus` / `session_list_on_main` |
| Лента и аудит | `workspace_feed_list`, `workspace_activity_list`, `workspace_memory_audit` |

Хиты поиска содержат `startLine` / `endLine` → `content_read` с `kind: root`, `startLine`, `limitLines`. Лёгкая мета без тела — `content_read` с `part=meta`.

Код в `awn-repositories/` не индексируется — только `manifest.md`, `index.md`, `groups.yml`.

## Индексы (номера как в UI popover)

После правки одного файла — `record_index_sync`; полный pipeline — `index_rebuild_all` (только после массовых изменений). По слоям 1–6: `index_1_ocr_run_zzz` (stub, 🟡) / рабочий `index_1_ocr_run`, `index_2_fulltext_rebuild`, `index_3_semantic_rebuild`, `index_4_storage_rebuild`, `index_5_link_rebuild`, `index_6_entity_rebuild`. **6. Сущности (эксперимент)** — в каноне дерева `index_6_entity_*_zzz` (🟡); API без `_zzz`. **7. ID** — `record_*`; **Карта** / **Мониторинг** без № — `nav_map_workspace_*`, `index_status_get`, `index_monitor_get`.

## DQL для `index_4_storage_query`

Строка DQL, **не SQL**.

```
FROM path/prefix
WHERE status = "open" AND (priority > 2 OR tags CONTAINS "x") AND file.mtime LAST 7 DAYS
FLATTEN tags · GROUP BY field COUNT|SUM|MIN|MAX · SORT f DESC, g ASC · LIMIT n · SELECT a, b
WITH TEXT "…"   — hybrid-поиск только по отобранным путям
```

Поля — из `index_4_storage_rebuild` (mode=full) или из `topic_schema_read` / `platform_type_get`.
