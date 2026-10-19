---
name: agent-cms-rules
description: Правила, запреты и антипаттерны агента при работе с Agent CMS — работать только по запросу человека, только через MCP, не угадывать пути и типы, согласовывать удаление, выполнение и git, куда нельзя класть файлы, какие tools устарели, что делать при переполнении контекста. Применяй всегда, когда работаешь с Agent CMS или хранилищем (workspace).
---

# Правила — как со мной работать

## Общие

1. **Память на диске** — о моих заметках и планах сначала загляни в хранилище, а не опирайся на «как было в чате».
2. **Не выдумывай** — не нашёл — скажи прямо и спроси.
3. **Согласуй риск** — перед удалением, массовой правкой или необратимым шагом спроси меня.
4. **Пиши как человеку** — на моём языке, коротко, без «воды».

## Работа с Agent CMS

- **Только по моему запросу.** Не стартуй сам: не вызывай tools и не читай хранилище, пока я не попросил.
- **Только MCP tools.** Никаких `curl` к API, сторонних tools и чтения или записи файлов хранилища в обход MCP. Команды — `run_script` / `exec_command` / `exec_shell`.
- **Пути и типы не угадывай.** Бери из `nav_index_toc_*_read`, `nav_map_workspace_read`, `contents_list`, `record_path_resolve`, `session_context_get_user_open_url_location_in_ui`, `get_type`.
- **Удаление и выполнение** (риск — см. п. 3). Если в настройках платформы включены `confirm-delete` / `confirm-exec`, передавай `confirm: true` только после моего явного согласия.
- **Связи.** Перед удалением или переносом записи проверь `workspace_dependencies_read`.
- **Git.** Коммит, push, pull — только по моей просьбе.
- **Неясно, куда положить** — спроси или предложи вариант с обоснованием. Лучше один вопрос, чем файл не в том месте.
- **Моё — главное.** Мои слова и структура важнее твоих догадок: сохраняй как есть, не переписывай и не удаляй по своей инициативе.

## Факты

Писать `fact_create`, только если принято решение, выявлено моё предпочтение, появилась новая сущность (URL, проект, контакт) или я попросил «сохрани как факт». Не писать каждую реплику, черновики и то, что уже есть в manifest. Норма: 0 фактов за обычный чат, 1–3 за полезную сессию.

## Антипаттерны

1. Файлы в корень темы не клади — только в слот (кроме гибкого слота).
2. Бинарники не создавай через `create_content` — только `write_content_binary` или `write_content_binary_from_url`.
3. Комментарии, дискуссии, факты, термины и справочник — только через их tools, не через `write_content`.
4. Не путай слоты `media` и `assets`: картинки в тексте, превью и вложения записей — в `assets`.
5. Табличный реестр с общей схемой — в базу, не в `main/`; заметку без общей схемы — не в базу.
6. Не создавай `temp/` в темах — временные файлы только в `awn-temp/`.
7. Не трогай `awn-recycler/`, `.trash.*` и слот `history`.
8. `database_schema_write` — только полным набором полей (сначала `database_schema_read`; legacy `write_database_schema`).
9. Не вызывай `*_zzz` — это заглушки.

## Устаревшие tools

| Устарело | Используй |
|----------|-----------|
| `read_dialogs` / `append_dialog` / `read_discussion` / `append_discussion` | `discussion_read` / `discussion_append` |
| `list_inbox` / `triage_inbox_item` | `inbox_items_list` / `inbox_item_triage` |
| `tool_*` (web, exec, ping, extract), `search_web*`, `exec_*`, `run_script` | `utility_*` (те же суффиксы) |
| `batch_invoke` / `tool_batch_invoke` / `request_batch_invoke` | `batch_tools_invoke` |
| `get_topic_url` / `get_workspace_open_url_from_path` | `get_record_url_from_path` |
| `get_workspace_url_page_preview` | `get_workspace_page_preview_from_path` |
| `get_link_preview` / `get_external_url_page_preview` | `get_external_page_preview_from_url` |
| `content_binary_url_get` / `get_content_binary_url` | `get_record_binary_url_from_path` |
| `search_content` / `search_semantic` / `search_hybrid` / `search_links` / `search_batch` | `index_2_fulltext_search_query` / `index_3_semantic_search_query` / `index_3_hybrid_search_query` / `index_5_link_search_query` / `index_search_query_batch` |
| `ask_workspace` / `search_and_get_context` | `query_workspace_ask` / `query_context_get` |
| `index_ocr_run` … `sync_workspace_index_file` / `indexes_rebuild` | `index_1_ocr_run` … `index_file_sync` / `index_rebuild_all` (слои 1–6: `index_{N}_*`; ops/monitor без №) |
| `get_workspace_index_status` / `get_workspace_index_monitor` | `index_status_get` / `index_monitor_get` |
| `index_entity_*` (query, catalog, rebuild, …) | `index_6_entity_*` |
| `notify_user` | `user_notification_send` |
| `list_workspace_notifications` / `workspace_notifications_list` | `user_notifications_list` |
| `list_system_files` / `read_system_file` / `write_system_file` | `contents_list` / `content_read` / `content_write` (`kind: root`) |
| `list_vaults` / `list_workspaces` | `workspaces_list` |
| `get_topic_map` | `topics_list` + `nav_index_toc_topics_read` + `contents_list` (`kind: root`) |
| `get_content_map` | `read_content_index_toc` + `content_read` (`part=properties`) |
| `read_content`, `write_content`, `list_content`, … | `content_read`, `content_write`, `contents_list`, … |
| `read_content_body`, … | `content_read` / `content_write` с `part` |
| `list_channel_items`, `upload_channel_file`, … | `contents_list` / `content_write` с `kind: channel` / `media` |
| `write_file`, `patch_file`, `list_folder`, … | `contents_list` / `content_read` / `content_write` (`kind: root`) — legacy FS при `MCP_LEGACY_TOOLS=1` |
| `page_*`, `get_page_*` | `topic_*` (legacy `get_topic`, `read_topic_*`) |
| `create_database`, `database_frame_*`, `list_databases`, … | `database_register`, `databases_list`, … (канон `database_*` / `databases_*`) |

## Контекст переполняется

1. Зафиксируй итоги в `NOTE.md`, нужной записи или `append_discussion`.
2. Предложи мне перезагрузить контекст и кратко резюмируй сделанное.
3. Не выдумывай правила и пути, которых уже не видишь, — перечитай `session_context_get` или нужный файл.

---

Это общий тон человека для всех workspace. Если правила workspace или прямая просьба человека в чате противоречат этим — следуй им.
