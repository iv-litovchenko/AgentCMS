# GLOBAL_MCP_DOC — краткая карта Agent CMS

Глобальный документ платформы (`workspaces/agent-cms-core/GLOBAL_MCP_DOC.md`): попадает в always-context **всех** агентов.

## Зачем это

Это **общее хранилище** человека и агента: одно дерево страниц, слотов и записей, один язык модели (Page · Slot · Content · типы · MCP).  
Мы ведём его вместе: ты пишешь и правишь через MCP, человек — через UI; оба видят одно и то же.  
**1 + 1 = синергия** — не два разных «файловых мира», а одна CMS-память на общем словаре.

**Правило:** работать с CMS **только через MCP tools**. Запрещены сторонние tools, shell/`curl` к API, прямое чтение/запись файлов workspace и любые вызовы в обход MCP.  
Этот файл — шпаргалка. Полный список tools: `get_mcp_docs`.

Перед работой: `get_session_context` → `get_active_context`.  
Поиск: `search_workspace` (как шапка UI; scope=all|content|filename…).

**«Перезагрузи контекст»** → снова `get_session_context` (отдельного `reload_*` нет).  
Уточнения: только always-файлы → `get_always_context`; фокус UI → `get_active_context`; только оглавление тем → `get_topic_registry`.

## Модель (3 сущности)

| Сущность | Что это | Ключ MCP |
|----------|---------|----------|
| **Page** | Узел дерева меню (`manifest.md`) | `path` → `…/manifest.md` |
| **Slot** | Место хранения на странице | `slot` → `main`, `inbox`, `media`… |
| **Content** | Файл внутри слота | `path` + `slot` + `ref` |

**Page ≠ Content.** Слот — не файл; контент живёт *в* слоте.

### Ключи (обязательно)

| Ключ | Значение | Пример |
|------|----------|--------|
| `path` | Путь к **manifest.md** страницы | `awn-container/finansy/manifest.md` |
| `slot` | MCP-ключ слота | `notes`, `scripts`, `dialogs` — совпадает с именем папки (кроме `dialogs` → папка `thread/`) |
| `ref` | Путь файла **внутри** слота | `vstrecha.md` или `subdir/vstrecha.md` |

Устаревшие алиасы (ещё работают, но не используй): `note` → `notes`, `script` → `scripts`, `thread` → `dialogs`.

### Фокус UI — `get_active_context`

Что открыто у пользователя. Смотри `focus.entity`: `page` | `slot` | `content` | `system` | `browse` | …  
В ответе уже есть готовые MCP-args: `path` / `slot` / `ref` — подставляй в `read_*` / `write_*`, не угадывай пути.

---

## Дерево агента

| Папка | Зачем |
|-------|-------|
| `awn-agent-kit/` | Служебные темы агента (persona, rules, voice…) |
| `awn-shared/` | Общие ресурсы между темами (inbox, media…) |
| `awn-container/` | Пользовательский контент — обычные области/темы |
| корень | `manifest.md` (ws) + системные MD (`AGENTS.md`, `SKILL.md`…) |

`create_page`: обычно `parentPath` внутри `awn-container/` (или kit/shared по назначению).

- `type: "folder"` — раздел (area / section); `type: "file"` — тема (topic)
- `awnType` — точный тип, напр. `awn.page.topic` или `awn.page.section.container`
- `displayName` / `title` → `awn-name`; `slug` / `name` → папка на диске
- список допустимых: `list_page_types`

---

## Реестры

Индексы workspace — **без** полного обхода дерева вручную. Старт: `get_session_context` уже отдаёт `topicRegistry` + `alwaysContext`.

| Tool | Что внутри | Тела файлов? |
|------|------------|--------------|
| `get_topic_registry` | Все темы: name, path, description (skill-карта) | нет |
| `get_always_context` | `awn-runtime-load-always` + `AGENTS.md` / `SKILL.md` / `README.md` + глобальный `GLOBAL_MCP_DOC.md` | **да** |
| `get_cron_registry` | Темы/записи с `awn-runtime-cron` (+ schedule) | нет |
| `get_heartbeat_registry` | Темы/записи с `awn-runtime-heartbeat` | нет |
| `get_runtime_registry` | Полный runtime: флаги sync/cron/heartbeat (фильтры) | нет |
| `get_runtime_map` | Упрощённая карта для sync cron/heartbeat (когда надо «что синкать») | нет |
| `get_site_map` | Карта сайта: области + темы + `awn-type` | нет |
| `get_workspace_table` | Плоская таблица тем | нет |

Флаги на теме/записи (frontmatter):

- `awn-runtime-load-always` — полный текст в always-context  
- `awn-runtime-cron` / `awn-runtime-cron-schedule` — расписание  
- `awn-runtime-heartbeat` — периодическая проверка  

Сначала реестр → потом точечно `read_page_*` / `read_content_*` по path.

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

### Запись свойств / схем — полная перезапись

`write_page_properties` **заменяет весь frontmatter**. Сначала `read_page_properties`, потом в `write_*` подавай **полный** YAML — иначе потеряешь авто-поля (`awn-update`, `awn-version`, …). Это особенность метода, не баг.

Аналогично:

| Метод | Что перезаписывает | Как безопасно |
|-------|-------------------|---------------|
| `write_page_properties` | весь frontmatter страницы | `read` → правишь → полный YAML в `write` |
| `write_content_properties` | весь frontmatter записи в слоте | то же |
| `write_data_store_schema` | весь `schema-mod.yml` накопителя | то же (или полный `fields`/`content`) |

Тело (`write_page_body` / `write_content_body`) frontmatter **не трогает**.

---

## Схемы

Схема = какие поля у сущности (не путать с телом markdown и значениями).

| Что | Файл | Tools | Когда |
|-----|------|-------|-------|
| Поля страницы / слотов | `schema-mod.yml` (`awn_schema`) | `read_page_schema` / `write_page_schema` | Добавить/менять поля формы |
| UI/настройки страницы | `configuration.yml` (`awn_ui`, `awn_settings`) | `read_page_config` / `write_page_config` | UI, mask — **не** поля |
| Поля записей накопителя | `schema-mod.yml` в awn-data | `read_data_store_schema` / `write_data_store_schema` | Схема awn-data |
| Канон типа | awn-system | `get_page_type` / `get_content_type` / `get_agent_system_type` | Смотреть базовые fields |

- свойства (`*_properties`) — **значения** frontmatter (write = полная замена блока)  
- схема (`*_schema`) — **описание** полей формы  
- тип (`get_*_type`) — база из awn-system; `schema-mod.yml` — локальный override поверх типа  

`read_page_schema` отдаёт большой объект. При записи — YAML только с нужным блоком (`topic`, `slot_memory`, `slot_inbox`…), не гоняй весь dump обратно. Для `write_data_store_schema` — наоборот полный актуальный набор fields/content.

---

## Слоты

Место хранения на странице. MCP-ключ: `slot`.  
`list_page_slots` отдаёт `driver`: **`external`** (папка, много файлов) или **`internal`** (один файл).

### Многофайловая память (external)

Папка в `awn-storage/`. Нужны `path` + `slot` + `ref`.

| slot | id | Папка | Зачем |
|------|-----|-------|-------|
| `main` | `awn.slot.main` | `main/` | Основная память — много `.md` |
| `inbox` | `awn.slot.inbox` | `inbox/` | Входящие |
| `notes` | `awn.slot.note` | `notes/` | Заметки |
| `references` | `awn.slot.references` | `references/` | Источники / ссылки |
| `artefacts` | `awn.slot.artefacts` | `artefacts/` | Артефакты / черновики |
| `media` | `awn.slot.media` | `media/` | Медиатека темы (самостоятельные файлы) |
| `assets` | `awn.slot.assets` | `assets/` | Ресурсы **для записей** (вставки, вложения, preview) |
| `repository` | `awn.slot.repository` | `repository/` | Репозитории / код |
| `scripts` | `awn.slot.script` | `scripts/` | Скрипты |
| `comments` | `awn.slot.comments` | `comments/` | Комментарии к узлу/файлу |
| `dialogs` | `awn.slot.dialogs` | `thread/` | Диалог темы (не через `create_content` — `read_thread` / `append_thread`) |

### Однофайловая память (internal)

Один файл на слот (`main.md`, `todo.md`…). Нужны `path` + `slot`; **`ref` не указывай** — `read_content_body` / `write_content_body`.

| slot | id | Файл | Зачем |
|------|-----|------|-------|
| `main-single` | `awn.slot.main-single` | `main.md` | Одна страница памяти |
| `main-single-csv` | `awn.slot.main-single-csv` | `main.csv` | Табличная память |
| `todo-single` | `awn.slot.todo-single` | `todo.md` | TODO |
| `log-single` | `awn.slot.log-single` | `log.md` | Журнал |

Системные (обычно не трогать вручную): `history`, `temp`, `volume`.

- список слотов страницы: `list_page_slots`
- схема: `get_storage_layout`, `get_canonical_model`

### Куда грузить файлы (`upload_content` / `import_content_from_url`)

| Цель | `slot` | `parent` (подпапка) | Куда на диске / как ссылаться |
|------|--------|---------------------|-------------------------------|
| Превью темы/карточки | `assets` | `preview` | `awn-storage/assets/preview/` → поле `awn-preview` |
| Картинка, вставленная в текст записи | `assets` | `pasted` | `awn-storage/assets/pasted/` → в markdown: `![…](awn-storage/assets/pasted/file.png)` |
| Вложение записи | `assets` | `attachments` | `awn-storage/assets/attachments/` → поле `awn-attachments` |
| Медиатека темы (не к конкретной записи) | `media` | — / раздел | `awn-storage/media/` |

Пример: `{ "path": "…/manifest.md", "slot": "assets", "parent": "pasted", "fileName": "shot.png", "data": "…" }`

**`media` ≠ `assets`.** Не путать:
- `media` — медиатека **темы** (самостоятельные файлы в `media/`)
- `assets` — ресурсы **записей** (`preview` / `pasted` / `attachments` в `assets/`)  
Картинку в текст или превью темы → `assets`, не `media`.

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

`write_content_properties` — полная замена frontmatter (как у страницы): `read` → полный YAML → `write`.

---

## Накопители (awn-data)

Отдельно от страниц/слотов.

- список: `list_data_stores` → `get_data_store`
- схема полей: `read_data_store_schema` / `write_data_store_schema`
- запись: `create_data_record`

Не путать с `create_content`.

`write_data_store_schema` — полная замена схемы накопителя: сначала `read`, потом пиши полный актуальный YAML/`fields`.

---

---

## Свободная память

Два разных случая:

1. **Папка без `manifest.md`** (ещё не тема) → `list_adopt_folders` / `browse_workspace_folder` / `scan_workspace_folder` / `upload_workspace_file`
2. **Тема lite:** `awn-slots-disabled: true` — файлы рядом с `manifest.md`, без `awn-storage/` (не adopt-папка)

Не путать с `create_content` (обычная тема **со слотами**).

---

## Системные файлы агента

Корень **конкретного** workspace: `AGENTS.md`, `SKILL.md`, `README.md`, `NOTE.md`, `TODO.md`…

- список: `list_system_files`
- читать / писать: `read_system_file` / `write_system_file`

В always-context агента (если есть): `AGENTS.md`, `SKILL.md`, `README.md`.  
Плюс всегда глобально: `GLOBAL_MCP_DOC.md` из корня `agent-cms-core` (для всех агентов).

---

## Inbox / thread / comments

| Задача | Tools | Не делать |
|--------|-------|-----------|
| Intake / входящие | `list_inbox`, `create_inbox_item`, `triage_inbox_item` | Не подменять triage обычным `create_content` в `inbox`, если нужен triage-поток |
| Диалог темы | `read_thread`, `append_thread` | Не писать в `thread/` через `create_content` |
| Комментарии к узлу/файлу | `list_comments`, `append_comment`, `toggle_comment_reaction` | Не `create_content` + `awn.content.comment` |
| Сводка | `get_topic_intake` | — |

`create_content` в `slot: inbox` — просто файл в слоте; **intake-заметка** — `create_inbox_item`.  
Комментарии ≠ записи в `main`.

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
6. В `slot` — канонические ключи: `notes`, `scripts`, `dialogs` (не устаревшие `note` / `script` / `thread`).
7. Комментарии / thread / inbox-intake — свои tools; не через произвольный `create_content`.
8. `write_page_schema` — точечный YAML-блок, не весь ответ `read_page_schema`.
9. `write_*_properties` / `write_data_store_schema` — полная перезапись: не шли частичный YAML, иначе сотрёшь авто-поля.
10. `media` ≠ `assets`: медиатека темы vs ресурсы записей (preview / pasted / attachments).
