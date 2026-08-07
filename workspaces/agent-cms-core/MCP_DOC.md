# MCP_DOC — краткая карта Agent CMS

Перед работой: `get_session_context` → `get_active_context`.

## Модель (3 сущности)

| Сущность | Что это | Ключ MCP |
|----------|---------|----------|
| **Page** | Узел дерева меню (`manifest.md`) | `path` → `…/manifest.md` |
| **Slot** | Место хранения на странице | `slot` → `main`, `inbox`, `media`… |
| **Content** | Файл внутри слота | `path` + `slot` + `ref` |

**Page ≠ Content.** Слот — не файл; контент живёт *в* слоте.

---

## Страницы

Узел дерева меню (`manifest.md`).

| id | Имя | Зачем |
|----|-----|-------|
| `awn.page.ws` | Workspace | Корень агента — `manifest.md` в корне workspace |
| `awn.page.area` | Область | Папка-раздел в меню (legacy; новые — `awn.page.section.*`) |
| `awn.page.topic` | Тема | Рабочая страница со слотами (main, inbox, media…) |
| `awn.page.section.*` | Секция | Служебные разделы: `agent-kit`, `shared`, `container` |

- дерево / карта: `get_menu`, `get_site_map`
- фокус UI: `get_active_context`
- тело / свойства: `read_page_body` / `write_page_body`, `read_page_properties` / `write_page_properties`
- схема / конфиг: `read_page_schema` / `write_page_schema`, `read_page_config` / `write_page_config`
- создать / переименовать / сдвинуть: `create_page`, `rename_page`, `move_page`, `delete_page`
- типы: `list_page_types` → `get_page_type` **по `id`** (`awn.page.topic`)

---

## Схемы

Схема = какие поля у сущности (не путать с телом markdown).

| Что | Файл | Tools |
|-----|------|-------|
| Поля страницы / слотов | `schema-mod.yml` (`awn_schema`) | `read_page_schema` / `write_page_schema` |
| UI/настройки страницы | `configuration.yml` (`awn_ui`, `awn_settings`) | `read_page_config` / `write_page_config` |
| Поля записей накопителя | `schema-mod.yml` в awn-data | `read_data_store_schema` / `write_data_store_schema` |
| Канон типа (fields из awn-system) | тип в каталоге | `get_page_type` / `get_content_type` / `get_agent_system_type` |

- свойства (`*_properties`) — значения frontmatter  
- схема (`*_schema`) — описание полей формы  
- тип (`get_*_type`) — базовая схема из awn-system; `schema-mod.yml` — локальные правки поверх типа

---

## Слоты

Место хранения на странице. MCP-ключ: `slot` (не путь на диске).

| slot | id | Папка/файл | Зачем |
|------|-----|------------|-------|
| `main` | `awn.slot.main` | `main/` | Основная память — много `.md` |
| `main-single` | `awn.slot.main-single` | `main.md` | Одна страница памяти |
| `main-single-csv` | `awn.slot.main-single-csv` | `main.csv` | Табличная память |
| `inbox` | `awn.slot.inbox` | `inbox/` | Входящие |
| `note` | `awn.slot.note` | `notes/` | Заметки |
| `references` | `awn.slot.references` | `references/` | Источники / ссылки |
| `artefacts` | `awn.slot.artefacts` | `artefacts/` | Артефакты / черновики |
| `media` | `awn.slot.media` | `media/` | Медиафайлы |
| `repository` | `awn.slot.repository` | `repository/` | Репозитории / код |
| `assets` | `awn.slot.assets` | `assets/` | Активы |
| `script` | `awn.slot.script` | `scripts/` | Скрипты |
| `todo-single` | `awn.slot.todo-single` | `todo.md` | TODO |
| `log-single` | `awn.slot.log-single` | `log.md` | Журнал |
| `comments` | `awn.slot.comments` | `comments/` | Комментарии к узлу/файлу |
| `dialogs` | `awn.slot.dialogs` | `thread/` | Диалог темы (thread) |

Системные (обычно не трогать вручную): `history`, `temp`, `volume`.

- список слотов страницы: `list_page_slots`
- схема: `get_storage_layout`, `get_canonical_model`

---

## Контент

Файл внутри слота (`path` + `slot` + `ref`).

| id | Имя | Зачем |
|----|-----|-------|
| `awn.content.category` | Категория | Папка для группировки записей внутри слота |
| `awn.content.record` | Запись | Обычный `.md` в слоте (заметка, документ) |
| `awn.content.comment` | Комментарий | Комментарий к странице/записи — слот `comments/` |
| `awn.content.sidecar` | Sidecar | Мета к бинарному файлу (`*.sidecar.md` рядом с media) |

- список: `list_content`
- тело / свойства: `read_content_body` / `write_content_body`, `read_content_properties` / `write_content_properties`
- создать: `create_content` (md/record), `upload_content` (файл), `import_content_from_url`
- типы: `list_content_types` → `get_content_type` **по `id`**

---

## Накопители (awn-data)

Отдельно от страниц/слотов.

- список: `list_data_stores` → `get_data_store`
- схема полей: `read_data_store_schema` / `write_data_store_schema`
- запись: `create_data_record`

Не путать с `create_content`.

---

## Inbox / thread / comments

- inbox: `list_inbox`, `create_inbox_item`, `triage_inbox_item`
- thread: `read_thread`, `append_thread`
- comments: `list_comments`, `append_comment`, `toggle_comment_reaction`
- сводка: `get_topic_intake`

Комментарии ≠ записи в `main`. Писать через `append_comment`, не через `create_content` в произвольный слот.

---

## Типы (awn-system)

- детали: `get_agent_system_type` / `get_page_type` / `get_content_type` — всегда **`id`**, не path без расширения
- пример: `{ "id": "awn.page.area" }` ✅ · `{ "path": "awn-system/types/pages/area" }` — только если с `.yml`

---

## Антипаттерны

1. Не писать файлы «в корень темы» — только через slot (`create_content` / `upload_content`), **если нет** `awn-slots-disabled: true` (режим lite: память рядом с `manifest.md`, без `awn-storage/`).
2. Не путать page tools (`*_page_*`) и content tools (`*_content_*`).
3. Типы искать по `id`, не угадывать path.
4. `awn-data` ≠ слот страницы.
5. Уведомление в 🔔 CMS → `notify_user`; сообщение в Shell → `shell_post_message`.
