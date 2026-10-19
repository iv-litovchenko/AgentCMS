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
- **Пути и типы не угадывай.** Бери из `read_*_index_toc`, `list_content`, `resolve_workspace_path`, `get_ui_focus`, `get_type`.
- **Удаление и выполнение** (риск — см. п. 3). Если в настройках платформы включены `confirm-delete` / `confirm-exec`, передавай `confirm: true` только после моего явного согласия.
- **Связи.** Перед удалением или переносом записи проверь `read_dependencies`.
- **Git.** Коммит, push, pull — только по моей просьбе.
- **Неясно, куда положить** — спроси или предложи вариант с обоснованием. Лучше один вопрос, чем файл не в том месте.
- **Моё — главное.** Мои слова и структура важнее твоих догадок: сохраняй как есть, не переписывай и не удаляй по своей инициативе.

## Факты

Писать `create_workspace_fact`, только если принято решение, выявлено моё предпочтение, появилась новая сущность (URL, проект, контакт) или я попросил «сохрани как факт». Не писать каждую реплику, черновики и то, что уже есть в manifest. Норма: 0 фактов за обычный чат, 1–3 за полезную сессию.

## Антипаттерны

1. Файлы в корень темы не клади — только в слот (кроме гибкого слота).
2. Бинарники не создавай через `create_content` — только `write_content_binary` или `write_content_binary_from_url`.
3. Комментарии, дискуссии, факты, термины и справочник — только через их tools, не через `write_content`.
4. Не путай слоты `media` и `assets`: картинки в тексте, превью и вложения записей — в `assets`.
5. Табличный реестр с общей схемой — в базу, не в `main/`; заметку без общей схемы — не в базу.
6. Не создавай `temp/` в темах — временные файлы только в `awn-temp/`.
7. Не трогай `awn-recycler/`, `.trash.*` и слот `history`.
8. `write_database_schema` — только полным набором полей (сначала `read_database_schema`).
9. Не вызывай `*_zzz` — это заглушки.

## Устаревшие tools

| Устарело | Используй |
|----------|-----------|
| `read_dialogs` / `append_dialog` | `read_discussion` / `append_discussion` |
| `list_system_files` / `read_system_file` / `write_system_file` | `list_content` / `read_content` / `write_content` (`kind: root`) |
| `list_vaults` | `list_workspaces` |
| `get_topic_map` | `list_topics` + `read_topic_index_toc` + `list_content` (`kind: root`) |
| `get_content_map` | `read_content_index_toc` + `read_content` (`part=properties`) |
| `read_content_body`, `write_content_body` и подобные | `read_content` / `write_content` с `part` |
| `list_channel_items`, `upload_channel_file`, `list_media_library_items`, `upload_media_library_file` | `list_content` / `write_content` с `kind: channel` / `media` |
| `write_file`, `patch_file`, `list_folder`, `list_root_files`, `read_root_file`, `write_root_file` | `list_content` / `read_content` / `write_content` с `kind: root` (`mode: patch`) — только при `MCP_LEGACY_TOOLS=1` |
| `page_*`, `get_page_*` | `topic_*`, `get_topic_*` |
| `create_database`, `database_frame_*` | `register_database` и другие `*_database` |

## Контекст переполняется

1. Зафиксируй итоги в `NOTE.md`, нужной записи или `append_discussion`.
2. Предложи мне перезагрузить контекст и кратко резюмируй сделанное.
3. Не выдумывай правила и пути, которых уже не видишь, — перечитай `get_session_context` или нужный файл.

---

Это общий тон человека для всех workspace. Если правила workspace или прямая просьба человека в чате противоречат этим — следуй им.
