---
name: agent-cms
description: Работа с Agent CMS через MCP — общим хранилищем человека и агента (workspace, каналы, темы, слоты, базы/накопители/инфоблоки, репозитории, медиатеки, журнал, факты, глоссарий, справочник, крон, зависимости, sidecar, поиск, DQL, корзина, git-модуль). Используй, когда человек просит что-то сделать в хранилище Agent CMS — прочитать, найти, создать, разобрать, переложить, отредактировать, удалить, закоммитить, — а также когда упоминаются workspace, workspaceId, awn-*, manifest.md, awn-storage или tools вроде read_content / write_content / get_session_context.
---

# Agent CMS — базовый скилл

Как устроено хранилище и какими tools с ним работать. Правила, запреты и антипаттерны — в скилле `agent-cms-rules`, стиль ответов — в `agent-cms-response-style`, markdown-разметка — в `GLOBAL-SKILL-4-MARKDOWN.md`.

## Оглавление

| № | Раздел | Читай, когда нужно |
|---|--------|--------------------|
| 1 | Старт | начать работу в чате, понять, что открыл человек |
| 2 | Карта хранилища | понять, что где лежит на диске |
| 3 | Темы | создать, найти, переименовать, переместить тему |
| 4 | Слоты | понять, в какую папку темы положить файл |
| 5 | Чтение и запись контента | прочитать или изменить любой файл |
| 6 | Базы (накопители, инфоблоки) | таблицы однотипных записей: задачи, расходы, справочники |
| 7 | Каналы и входящие | разобрать сырое: Telegram, закладки, inbox |
| 8 | Репозитории | работать с кодом проектов |
| 9 | Медиатеки | файлы и картинки уровня хранилища |
| 10 | Куда что класть и память | факты, термины, журнал, обсуждения, комментарии, NOTE / TODO |
| 11 | Крон, heartbeat, always-context | задачи по расписанию и «всегда в контексте» |
| 12 | Зависимости | связи между записями |
| 13 | Sidecar | метаданные к одному файлу |
| 14 | Поиск и навигация | найти, обзор, выборки, DQL, индексы |
| 15 | Файлы, веб, выполнение | корневые файлы, интернет, скрипты, `batch_invoke` |
| 16 | Корзина | удалить, найти удалённое |
| 17 | Git-модуль | коммит, пуш и пулл самого хранилища |
| 18 | Хранилища, настройки, типы | несколько workspace, настройки, типы, платформа |

---

## 1. Старт

Работа начинается по запросу человека, сам ничего не запускай.

1. `list_workspaces` → выбери id → `get_session_context({ workspaceId })`.
2. Во всех вызовах — тот же `workspaceId`. Селектор хранилища в UI на MCP не влияет.
3. Человек не назвал путь, а говорит «вот это» → `get_ui_focus`: что открыто в UI, готовые `path` / `slot` / `ref`.
4. Дали только путь к файлу → `resolve_workspace_path`: тема, слот, готовые аргументы.
5. Кто ты и кто человек в этом хранилище — `get_agent_identity` / `get_user_identity`.

**«Перезагрузи контекст»** = снова `get_session_context` и при необходимости `list_workspace_always_context`, `read_topic_index_toc`, `read_content_index_toc` по активной теме.

---

## 2. Карта хранилища

Хранилище (workspace) — папка с md-файлами. Основное лежит в хабах:

| Хаб | Папка | Что там |
|-----|-------|---------|
| Каналы | `awn-channels/{slug}/` | Входящие потоки: Telegram, GitHub, закладки |
| Темы | `awn-topics/…` | Разобранные знания по областям |
| Базы | `awn-databases/…` | Структурированные данные с общей схемой |
| Репозитории | `awn-repositories/{slug}/` | Подключённые проекты с кодом |
| Медиатеки | `awn-media/{slug}/` | Файлы и картинки |

Поток данных: сырое попадает в канал (или в `inbox` темы) → разбирается в тему или базу.

- **`manifest.md`** — карточка любой единицы: frontmatter + описание.
- **`awn-id`** — глобальный номер каждой новой записи. Путь по номеру: `find_by_id({ id })`, проставить старым: `assign_workspace_id`.
- **Служебные папки корня:** `awn-temp/` — все временные файлы; `awn-scripts/` — общие скрипты; `awn-recycler/` — корзина (раздел 16); `.agent-cms/` — кэши, журнал, настройки.
- **Файлы корня** (`AGENTS.md`, `SKILL.md`, `NOTE.md`, `TODO.md`, `dependencies.csv`) — раздел 15.
- **Свободная память** — папки без `manifest.md`: `list_folder` + `read_content` / `write_content` с `kind: root`. Описание папки — `{folder}/sidecar.md`. Превратить в тему — `create_topic`.

---

## 3. Темы (`awn-topics/`)

Дерево областей и тем. Типы: `awn.hub.topic.ws` (корень), `awn.hub.topic.area` (область), `awn.hub.topic` (тема со слотами), `awn.hub.topic.section` (служебные секции). Разделы дерева (`parentPath` в `create_topic`):

- `awn-topics/` — темы человека (по умолчанию);
- `awn-topics/0-agent-kit/` — служебные темы агента (persona, rules, voice…);
- `awn-topics/0-shared/` — общие ресурсы между темами.

Тело `manifest.md` — **бриф темы**: назначение, границы, договорённости, что класть в слоты. Не память: записи — в слотах, события — в журнале, разговор — в дискуссии.

| Задача | Tool |
|--------|------|
| Карточка (имя, описание, тело) | `get_topic` / `update_topic` |
| Создать | `create_topic({ type: "area"\|"topic", parentPath, displayName, slug })` |
| Переименовать / переместить / удалить | `rename_topic` / `move_topic` / `delete_topic` |
| Тело manifest | `read_topic_body` / `write_topic_body` |
| Свойства (frontmatter) | `read_topic_properties` / `write_topic_properties` (patch), `*_topic_property` |
| Схема полей формы | `read_topic_schema` / `write_topic_schema` (только изменённые блоки; `mode=full` — по необходимости) |
| Настройки UI темы | `read_topic_config` / `write_topic_config` |
| Секреты темы | `read_topic_env` / `write_topic_env` |
| Есть ли тема / лёгкая мета | `topic_exists` / `get_topic_meta` |
| Ссылка для человека | `get_topic_url({ path, view? })` |
| Подобрать slug | `generate_workspace_slug({ text, preset })` |

`create_topic`: нужно хотя бы одно из `displayName` / `title` / `slug` / `name`. `rename_topic`: `path` + `displayName` или `title`, опционально `slug`.

**Свойства, схема, конфиг:** свойства (`*_properties`) — значения frontmatter; `schema.yml` — описание полей формы (локальный override типа); `config.yml` — только UI, не поля.

---

## 4. Слоты

Слот — папка под `awn-storage/` темы (и канала, медиатеки, базы, репозитория). Узнать слоты и драйвер: `list_slots({ placement: { kind: "topic", path } })`:

- `external` — папка с файлами, нужен `ref`;
- `internal` — один файл, **без `ref`**.

| Слот | Что там |
|------|---------|
| `main` | Основная память темы |
| `inbox` | Входящие (`status: new`, разбор — `triage_inbox_item`) |
| `notes`, `references`, `artefacts` | Заметки, источники, черновики |
| `media` | Самостоятельные файлы темы |
| `assets` | Ресурсы **записей**: `preview/`, `pasted/`, `attachments/`, `materials/` |
| `repository`, `scripts` | Небольшой код и скрипты темы (проект со своим git — в репозиторий) |
| `comments`, `discussion` | Только через свои tools (раздел 10) |
| `main-single`, `main-single-csv`, `todo-single` | Однофайловые: страница памяти, таблица, TODO |
| `history` | Системный |

Ключи только канонические: `notes`, `scripts`, `discussion`.

- **`media` и `assets` — разные слоты.** Картинка в тексте, превью (`awn-preview`), вложение (`awn-attachments`) → `assets`. В markdown: `awn-storage/assets/pasted/{файл}`.
- **Материалы записи:** `assets/materials/{awn-id}/` — одна папка на запись, связь по `awn-id` (переименование записи папку не переносит).
- **Гибкий слот** (`slotsFlexible: true` в TOC) — тема без типовых слотов; писать только `create_content({ slot: "main", parent? })`.
- **`main-single-csv`** — `read_content` / `write_content` с `part=body`, весь CSV целиком.

---

## 5. Чтение и запись контента

Один объект в слоте или по пути — всегда `read_content` / `write_content` / `list_content` (+ `create_content`, `content_exists`, `rename_content`, `move_content`, `delete_content`, `import_content_from_url`, `read_content_property` / `write_content_property`). Неизвестные параметры, в том числе внутри `placement`, дают ошибку `Unrecognized key(s)`.

```json
{ "workspaceId": "…", "placement": { "kind": "topic", "path": "…/manifest.md", "slot": "main", "ref": "zametka.md" }, "part": "body" }
{ "workspaceId": "…", "placement": { "kind": "channel", "path": "telegram", "slot": "inbox", "ref": "2026-10-16.md" } }
{ "workspaceId": "…", "placement": { "kind": "root", "path": "awn-repositories/site/src/index.html" } }
```

- `kind`: `topic` | `channel` | `media` | `database` | `repository` — нужны `path` (slug без префикса хаба) + `slot` (+ `ref`); `root` — только `path` от корня хранилища.
- `ref` — файл в слоте с расширением; без расширения повторяется с `.md` (`refResolved` в ответе).

**`read_content`** — `part`: `body` (по умолчанию) | `properties` | `schema` | `meta` | `all`.
- Тело читается окном: 300 строк по умолчанию, `startLine` + `limitLines` (до 500). Номера строк — файла с frontmatter, те же, что в поиске.
- В ответе `hash`, `totalLines`, `hasMore`, `nextStartLine`. `full: true` — всё тело, нужно только перед `mode: replace`.
- Бинарь (`kind: root`): `format: "base64"` (картинки возвращаются блоком `image`), `offsetBytes`.

**`write_content`** — `part`: `body` | `properties` (patch: только изменённые ключи) | `schema`; бинарь — `data` (base64) + `mimeType`.

| `mode` для body | Что делает |
|-----------------|-----------|
| `patch` | `oldString` → `newString` (`""` удаляет). Совпадение одно, иначе ошибка или `replaceAll: true`. **Предпочтительно** |
| `replace` (по умолчанию) | Всё тело, frontmatter сохраняется |
| `append` / `prepend` | В конец / в начало тела |
| `replace_lines` | `startLine`..`endLine` → `content`; нужен `expectedHash` |
| `insert` | `afterLine` / `beforeLine` + `content`; нужен `expectedHash` |

`expectedHash` — `hash` из последнего чтения или записи; файл изменился → `conflict`. Frontmatter через body не меняется — только `part=properties`.

| Что | Чем |
|-----|-----|
| Новый `.md` в слоте | `create_content` |
| Бинарник в слот | `write_content` + `data`; по URL — `import_content_from_url` |
| Переименовать / переместить / удалить | `rename_content` / `move_content` / `delete_content` |
| Показать картинку из заметки | ссылку `awn-storage/assets/pasted/x.png` достроить до `awn-topics/<тема>/awn-storage/…` (путь темы из `resolve_workspace_path`), затем `read_content` с `kind: root` и `format: "base64"` |

---

## 6. Базы (накопители, инфоблоки)

В UI — «Накопители информации». Хранят **однотипные записи с общей схемой полей**.

**База или тема:**

| | База (`awn-databases/`) | Тема (`awn-topics/`) |
|---|------------------------|----------------------|
| Данные | У всех записей одинаковые поля | Свободный текст, медиа, код |
| Запросы | Нужны выборки «по колонке» | Важны связи между файлами |
| Примеры | Задачи с полями, расходы (дата, сумма, категория), справочники | Протокол встречи, README, заметка |

Два слоя, адресация по `store` (путь под `awn-databases/`, например `tasks`, `taxonomies/tags`):

- **Каркас store** (`group` / `collection` / `single`): `list_databases`, `get_database`, `register_database`, `update_database`, `delete_database`, `rename_database`, `read_database_schema` / `write_database_schema`; каталог — `read_databases_index_toc`.
- **Записи** лежат в `data/`: `list_content`, `create_content` (`isSection` или `awn.content.category` — раздел), `delete_content`, `move_content` (`targetParent`, `slug`); тело и поля — `read_content` / `write_content` / `*_content_property` с `kind: database`, `slot: data`, `ref`.

| `collectionType` | Когда |
|------------------|-------|
| `md` | Сущности с полями |
| `md-lite` | Простые списки (тексты, слоганы) |
| `csv` | Табличный реестр в одной таблице |
| `csv-files` | Отдельная таблица на запись |
| `files` | Загрузка файлов |

- **CSV** (`recordEditMode: whole-file-csv` в `get_database`): таблица = один файл. `read_content` / `write_content` с `ref: main.csv`, всегда целиком.
- **Схема:** `write_database_schema` принимает **полный** набор полей — сначала `read_database_schema`, иначе поля потеряются.
- **Имена полей:** `awn-*` — только системные; свои — без префикса (`amount`, `status`).
- Факты, глоссарий и справочник — тоже базы (`awn-databases/contents/…`), но работай с ними только через их tools (раздел 10).

---

## 7. Каналы и входящие

Канал — карточка потока: `awn-channels/{slug}/`. Слоты: `inbox` (входящее), `outbox` (исходящее), `files`, `assets`. Содержимое — content-tools с `placement: { kind: "channel", path: "<slug>", slot, ref }`.

| Задача | Tool |
|--------|------|
| Список, карточка | `list_channels`, `get_channel` |
| Создать, изменить, переименовать, удалить | `register_channel`, `update_channel`, `rename_channel`, `delete_channel` |
| Каталог | `read_channels_index_toc` / `refresh_channels_index_toc` |
| Что лежит во входящих | `list_inbox` |
| Разобрать входящее | `triage_inbox_item`: `to-content` (перенести в тему), `mark-done`, `set-status` |

Входящие темы — слот `inbox` с `status: new`, разбор тем же `triage_inbox_item`.

---

## 8. Репозитории (`awn-repositories/`)

Исходники, подключённые к хранилищу: свои проекты, форки, клоны для изучения. Папка `awn-repositories/{slug}/` (или `{group}/{slug}/`) + карточка `manifest.md`.

| Задача | Tool |
|--------|------|
| Список (+ папки без карточки в `unregistered`) | `list_repositories` |
| Карточка | `get_repository({ path })` |
| Подключить новый / подхватить существующую папку | `register_repository({ slug, name?, description?, origin?, body? })` |
| Обновить карточку | `update_repository({ path, name?, description?, origin?, group?, status?, body? })` |
| Переименовать / удалить | `rename_repository` / `delete_repository` |
| Каталог | `read_repository_index_toc` / `refresh_repository_index_toc` |

- **Код не индексируется** — в поиске только `manifest.md`, `index.md`, `groups.yml`. Репозиторий находи через `list_repositories`, код читай по явному пути: `list_folder` + `read_content` с `kind: root`, правь через `write_content` с `mode: patch`.
- **Карточка** — зачем репозиторий, что в нём смотреть, связь с темой. `status`: `active` · `study` · `archived` · `vendored`. `group` — группа в сайдбаре, не папка.
- Папка в `unregistered` → `register_repository` с тем же `slug` (папка не тронется).
- Git самого хранилища — раздел 17, клонов в `awn-repositories/` он не касается.

---

## 9. Медиатеки (`awn-media/`)

Файлы и картинки уровня хранилища (не слот темы). Слоты: `files`, `assets`. Содержимое — `placement: { kind: "media", path: "<slug>", slot, ref }`.

| Задача | Tool |
|--------|------|
| Список, карточка | `list_media_libraries`, `get_media_library` |
| Создать, изменить, переименовать, удалить | `register_media_library`, `update_media_library`, `rename_media_library`, `delete_media_library` |
| Каталог | `read_media_library_index_toc` / `refresh_media_library_index_toc` |
| Картинка из интернета | `import_content_from_url` |

**Медиа-облако** — выгрузка тяжёлых файлов: `sync_media_cloud_file` (`path` — manifest темы, `file` — **полный** путь от корня хранилища), `get_media_cloud_file_status`, `repair_media_cloud_links`, `list_media_cloud_providers`. Сейчас только локальная выгрузка (`awn-media-cloud/`), на Google и Яндекс не загружается.

---

## 10. Куда что класть и память

| Что | Куда |
|-----|------|
| Решение, предпочтение, сущность (1–2 фразы) | `create_workspace_fact` |
| Термин и определение | `create_glossary_term` |
| Справочная статья с разделами | `create_reference_entry` |
| Событие (действие, жизнь, система) | `append_journal_entry` |
| Обсуждение темы | `append_discussion` |
| Комментарий к manifest или записи | `append_comment` |
| Входящее | `create_content({ slot: "inbox", status: "new" })` |
| Заметка на сессию, договорённость с человеком | `write_workspace_note` (`NOTE.md`) / `write_workspace_todo` (`TODO.md`) |
| Инструкции агента | `AGENTS.md` / `SKILL.md` через `write_root_file` |
| Уведомление в 🔔 | `notify_user` или журнал с `notify: true` |
| Табличные однотипные данные | база (раздел 6) |
| Всё остальное | слот темы (раздел 4) |

Комментарии, дискуссии, факты, термины и справочник — только через свои tools, не через `write_content`.

- **Журнал** (`.agent-cms/journal/`, файл на ISO-неделю): `append_journal_entry`, `list_journal_entries`, `list_workspace_notifications`. События, не логи чатов.
- **Факты:** `create_workspace_fact({ body, kind, tags, supersedes? })`, `update_workspace_fact`, `list_workspace_facts`, `search_workspace_facts`. `kind`: `decision` · `preference` · `entity` · `procedure` · `open-question` · `note` · `fact`. Решение изменилось → новый факт с `supersedes`.
- **Глоссарий:** `create_glossary_term`, `update_glossary_term`, `list_glossary_terms`, `search_glossary_terms`.
- **Справочник:** `create_reference_entry`, `update_reference_entry`, `list_reference_entries`, `search_reference_entries`.
- **Дискуссия темы:** `read_discussion` / `append_discussion`.
- **Комментарии:** `list_comments`, `append_comment`, `read_comment`, `update_comment`, `delete_comment`, `toggle_comment_reaction`. `path` — manifest темы; к записи — `mode` (`description` | `external` | `media`) + `file` (путь записи); ответ — `replyTo`.
- **`NOTE.md` / `TODO.md`** в корне хранилища: `read_workspace_note` / `write_workspace_note`, `read_workspace_todo` / `write_workspace_todo` (по умолчанию append). Это не слоты `notes` и `todo-single`.

---

## 11. Крон, heartbeat, always-context

Флаги во frontmatter темы или записи (`write_topic_properties` / `write_content` с `part=properties`):

| Поле | Значение | Реестр |
|------|----------|--------|
| `awn-runtime-load-always: true` | Всегда в контексте агента | `list_workspace_always_context` |
| `awn-runtime-cron: true` + `awn-runtime-cron-schedule` | Задача по расписанию | `list_workspace_cron` |
| `awn-runtime-heartbeat: true` | Периодическая проверка | `list_workspace_heartbeat` |
| `awn-runtime-reminder: true` | В реестр «Напоминания» | — |
| `awn-runtime-commands: true` | В инструкции темы есть команды | — |

---

## 12. Зависимости

`dependencies.csv` в корне хранилища — связи между записями. `read_dependencies` (колонки + строки), `write_dependencies` (весь CSV или `rows`). Колонки меняются только в настройках workspace.

---

## 13. Sidecar

Метаданные к одному файлу: `photo.png` → `photo.sidecar.md` рядом. Сам не создаётся.

`resolve_sidecar_path`, `read_sidecar`, `create_sidecar` (ошибка 409, если уже есть), `write_sidecar`, `delete_sidecar` (исходный файл не трогает). Текст из картинок и PDF в sidecar — `run_workspace_ocr_index`.

---

## 14. Поиск и навигация

Оглавления, поиск и индексы — отдельные tools, не `read_content`.

| Задача | Tool |
|--------|------|
| Обзор хранилища | `list_topics`; INDEX — `read_topic_index_toc`; все manifest плоским списком — `read_workspace_map`; папки без manifest — `list_folder` |
| Обзор темы / слота | `read_content_index_toc` |
| Каталоги хабов | `read_channels_index_toc`, `read_databases_index_toc`, `read_repository_index_toc`, `read_media_library_index_toc` (+ парные `refresh_*`) |
| Поиск (по умолчанию) | `search_workspace_hybrid`; несколько вопросов — `search_workspace_batch` |
| Точный текст, имена файлов | `search_workspace_content`; только по смыслу — `search_workspace_semantic` |
| Поиск внутри темы | `resolve_workspace_path` → `topic.folderPath` → параметр `pathPrefix` |
| Backlinks и исходящие ссылки | **только** `search_workspace_links` (hybrid их не видит; нужен `rebuild_workspace_link_index`) |
| Ответ по архиву с готовым контекстом | `ask_workspace` / `search_and_get_context` |
| Люди, даты, суммы, теги | `query_workspace_entities`, `list_workspace_entity_catalog` |
| Выборка по frontmatter | `query_workspace_storage({ dql })` |
| Готовые выборки | `list_workspace_registry_queries` → `run_workspace_registry_query({ id })` |
| Лента и аудит | `list_workspace_feed`, `list_recent_activity`, `audit_workspace_memory` |

Хиты поиска содержат `startLine` / `endLine` → открывай фрагмент: `read_content` с `kind: root`, `startLine`, `limitLines`. Лёгкая мета без тела — `read_content` с `part=meta`.

**Индексы:** после правки одного файла — `sync_workspace_index_file`; полный `rebuild_workspace_indexes` — только после массовых изменений. По слоям: `rebuild_workspace_fulltext_index` / `_semantic_index` / `_storage_index` / `_link_index` / `_entity_index`. Состояние — `get_workspace_index_status` / `get_workspace_index_monitor`.

**Реестр сущностей** (применяется после `rebuild_workspace_entity_index`): `merge_workspace_entity_alias`, `reject_workspace_entity`, `seed_workspace_entity`, `upsert_workspace_entity_type`, `get_workspace_entity_registry` / `put_workspace_entity_registry` (весь файл — только для крупных правок), `explain_workspace_entity_search` (отладка).

### DQL для `query_workspace_storage`

Строка DQL, **не SQL**.

```
FROM path/prefix
WHERE status = "open" AND (priority > 2 OR tags CONTAINS "x") AND file.mtime LAST 7 DAYS
FLATTEN tags · GROUP BY field COUNT|SUM|MIN|MAX · SORT f DESC, g ASC · LIMIT n · SELECT a, b
WITH TEXT "…"   — hybrid-поиск только по отобранным путям
```

Поля: frontmatter + `file.name`, `file.folder`, `file.mtime`, `file.size`, `file.inlink-count`, `file.outlinks`, `file.inlinks`.

---

## 15. Файлы, веб, выполнение

| Что | Чем |
|-----|-----|
| Любой файл по пути (код, HTML, свободная память) | `read_content` / `write_content` с `kind: root`; обход папок — `list_folder` |
| Файлы корня (`AGENTS.md`, `SKILL.md`…) | `list_root_files` → `read_root_file` / `write_root_file` (с историей); только имя файла в корне |
| Загрузка по полному пути | `upload_file` (base64) / `upload_file_from_url` |
| Текст из pdf, docx, xlsx, html | `extract_document_text` (URL или путь) |
| Поиск в вебе | `search_web`, `search_web_images` |
| Прочитать страницу | `read_web_page`; превью ссылки — `get_link_preview` |
| Скрипт | `run_script` (`.py` / `.js` / `.sh`) |
| Команда | `exec_command` (массив args) или `exec_shell` (строка с пайпами) |
| Файлообменник Shell | `read_file_hub_queue`, `add_file_to_file_hub`, `remove_file_from_file_hub`, `clear_file_hub_queue` |

**`batch_invoke`** — N вызовов **одного** tool (`tool` + `items[]`, без `workspaceId` в items): read / list / search до 20, write / create / delete до 10. Частичный успех возможен — проверяй каждый item.

---

## 16. Корзина

Удаление в Agent CMS мягкое: файл или папка не стираются, а переезжают в корзину.

- **Где лежит:** `awn-recycler/re-{метка}-{имя}` в корне хранилища, метаданные — в `awn-recycler/_meta`.
- **Что остаётся на месте:** файл-маркер `.trash.{метка}`. В списках, поиске и деревьях он скрыт — не считай его контентом.
- **Что вернёт tool:** `recycled: true`, `markerId`, `markerLabel`, `recycleName`. Покажи человеку метку, чтобы он мог найти удалённое.
- **Какие tools** удаляют в корзину: `delete_content`, `delete_topic`, `delete_channel`, `delete_media_library`, `delete_repository` (встроенные каналы и медиатеки защищены).
- **Восстановить и очистить** — только человек, через UI («Корзина»). MCP-tools для восстановления и очистки нет: просьбу «верни удалённое» направь человеку и назови метку.
- Содержимое `awn-recycler/` не правь и не читай как обычные данные.

---

## 17. Git-модуль

Git **самого хранилища** (не клонов в `awn-repositories/` — те через `exec_command` / `exec_shell`). Все tools кроме `module_git_status` и `module_git_diff` заблокированы при `mcp-mode=readonly`.

| Задача | Tool |
|--------|------|
| Ветка, изменения, последние коммиты, партии | `module_git_status` |
| Что изменилось (diff с HEAD) | `module_git_diff` (`path` — один файл) |
| Закоммитить | `module_git_commit` |
| Отправить / забрать | `module_git_push` / `module_git_pull` |
| Remote | `module_git_remote` (`action: set\|remove`, `name`, `url`) |
| Создать репозиторий | `module_git_init` (ветка по умолчанию `main`) |

**Коммит партиями** — как кнопка «Сохранить» в UI:

1. `module_git_status` → смотри `changes` (`commitBatchId`, `commitAllowed`, `sizeBytes`).
2. `module_git_commit({ batchIds: [...], messageSuffix? })`: «закоммить записи» → `["records"]`, «изображения» → `["images"]`. Если партия больше лимита — `["images#1"]`, потом `["images#2"]` и так далее. Без `batchIds` — все партии по порядку, по коммиту на партию, пустые пропускаются.
3. Id партий: `records`, `records-history`, `images`, `sources`, `documents`, `media`, `design-2d`, `design-3d`, `design-bim`, `archives`, `other`, `configs`, `out-of-batch`.

Старый режим: `batched: false` + `message` — один коммит по фильтру расширений.

`module_git_pull`: стратегия берётся из настроек (`module-git-pull-strategy`), переопределяется `rebase: true` или `strategy: merge|rebase`. `module_git_push` по умолчанию `origin`, текущая ветка, `-u`.

---

## 18. Хранилища, настройки, типы

**Несколько хранилищ:** `list_workspaces`, `create_workspace`, `discover_workspaces` → `register_workspace` (подхватить папку с диска), `update_workspace`, `set_default_workspace`, `set_orchestrator_workspace`. Группы в сайдбаре: `list_workspace_groups`, `create_` / `update_` / `delete_workspace_group`, `assign_workspace_to_group`, `remove_workspace_from_group`, `reorder_workspace_groups`.

**Настройки** — 4 независимых scope (не сливаются): `platform` (MCP policy, индексы, always-context), `workspace` (`awn-id-*`, voice, колонки зависимостей), `integrations` (skills, MCP, git-партии), `user` (меню, сайдбар). Tools: `list_settings`, `read_setting`, `write_setting` (`sys-*` и `awn-id-*` — только чтение). Секреты в settings не хранятся — для темы есть `.env`.

**Типы:** `list_types({ filter })` → `get_type({ id })`, всегда по `id`, не по пути.

| `filter` | Примеры id |
|----------|-----------|
| `create-page` | `awn.hub.topic` |
| `slot-content` | `awn.content.record`, `awn.content.record-csv` |
| `data-containers` | `awn.hub.database.collection` |
| `data-elements` | `awn.content.record`, `awn.content.record-lite`, `awn.content.record-csv`, `awn.content.category` |

**Платформа:** `test_mcp_connection`, `get_platform_info`, `get_platform_health`, `get_workspace_storage_info`, `list_platform_config`. Документы платформы (`workspaces/0-md/`): `list_platform_docs` → `read_platform_doc({ path })`; `write_platform_doc` — только по просьбе человека. `get_session_documentation` — README и справочник markdown-разметки.
