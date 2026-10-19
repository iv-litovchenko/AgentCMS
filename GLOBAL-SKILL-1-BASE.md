---
name: agent-cms
description: Работа с Agent CMS через MCP — общим хранилищем человека и агента (workspace, каналы, темы, слоты, базы, репозитории, медиатеки, журнал, факты, глоссарий, справочник, крон, зависимости, sidecar, корзина). Используй, когда человек просит что-то сделать в хранилище — прочитать, найти, создать, разобрать, отредактировать, удалить, закоммитить, — а также при упоминании workspace, workspaceId, awn-*, manifest.md, awn-storage или tools вроде content_read / content_write / session_context_get.
---

# Agent CMS — базовый скилл

Как устроено хранилище и какими tools с ним работать. Правила — `agent-cms-rules`, стиль — `agent-cms-response-style`, markdown — `agent-cms-markdown`, поиск — `agent-cms-search`, модули (git) — `agent-cms-modules`. Ввод и карта скиллов — `agent-cms-welcome` (`GLOBAL-SKILL-0-MCP-WELCOME.md`), необязательный: если не установлен — `read_platform_doc({ path: "GLOBAL-SKILL-0-MCP-WELCOME.md" })`.

Разделы: 1 Старт · 2 Карта · 3 Темы · 4 Слоты · 5 Контент · 6 Базы · 7 Каналы · 8 Репозитории · 9 Медиатеки · 10 Память · 11 Крон · 12 Зависимости · 13 Sidecar · 14 Поиск (→ скилл 5) · 15 Файлы и выполнение · 16 Корзина · 17 Модули (→ скилл 6) · 18 Хранилища и настройки.

---

## 1. Старт

Работа начинается по запросу человека, сам ничего не запускай.

1. `workspaces_list` → выбери id → `session_context_get({ workspaceId })`. Во всех вызовах — тот же `workspaceId` (селектор в UI на MCP не влияет).
2. Человек говорит «вот это» без пути → `session_ui_focus_get` (готовые `path` / `slot` / `ref`).
3. Дали только путь → `record_path_resolve` (тема, слот, готовые аргументы).
4. Кто ты и кто человек — `session_agent_profile_get` / `session_user_profile_get` (темы `0-agent` / `0-user`, не workspaceId).

**«Перезагрузи контекст»** = снова `session_context_get` и при необходимости `session_list_always_context`, `nav_index_toc_topics_read`, `nav_index_toc_contents_read`.

---

## 2. Карта хранилища

Workspace — папка с md-файлами. Хабы:

| Хаб | Папка | Что там |
|-----|-------|---------|
| Каналы | `awn-channels/{slug}/` | Входящие потоки: Telegram, GitHub, закладки |
| Темы | `awn-topics/…` | Разобранные знания |
| Базы | `awn-databases/…` | Данные с общей схемой |
| Репозитории | `awn-repositories/{slug}/` | Проекты с кодом |
| Медиатеки | `awn-media/{slug}/` | Файлы и картинки |

Поток: сырое → канал (или `inbox` темы) → тема или база.

- **`manifest.md`** — карточка единицы: frontmatter + описание.
- **`awn-id`** — глобальный номер записи (не `workspaceId`). `record_find_by_id({ id })`; проверка — `record_id_exists`; старым проставить — `record_id_assign`. Slug: `record_generate_slug` → `record_slug_exists` → create. Остальные свойства — «Базовые свойства» ниже.
- **Служебные папки:** `awn-temp/` (все временные файлы), `awn-scripts/`, `awn-recycler/` (корзина, раздел 16), `.agent-cms/` (кэши, журнал, настройки).
- **Файлы корня** (`AGENTS.md`, `SKILL.md`, `NOTE.md`, `TODO.md`, `dependencies.csv`) — раздел 15.
- **Свободная память** — папки без `manifest.md`: `contents_list` (`kind: root`, `path`) + `content_read` / `content_write` с `kind: root`. Описание папки — `{folder}/sidecar.md`. В тему превращает `topic_create`.

### Базовые свойства (frontmatter)

Есть у любой записи и карточки (`manifest.md`, запись слота). Читать/писать — `content_read` / `content_write` с `part: properties` (patch) или `topic_property_*`. Полный список полей типа — `topic_schema_read` / `get_type`; здесь только общие.

| Свойство | Что значит | Правило |
|----------|-----------|---------|
| `awn-type` | Тип сущности (`awn.hub.topic`, `awn.content.record`…) | Не менять |
| `awn-id` | Глобальный числовой номер в workspace (≠ `workspaceId`, ≠ slug) | Не менять; поиск — `record_find_by_id` |
| `awn-name` | Отображаемое имя в меню и ответах; пусто → берётся slug (имя папки/файла) | Менять для смены названия; slug — `rename_*` |
| `awn-description` | Короткое описание, одна-две фразы | — |
| `awn-summary` | Развёрнутое резюме: о чём запись, факты, выводы (подробнее description) | Хорошо для поиска и контекста |
| `awn-note` / `awn-todo` | Рабочая заметка / на чём остановились и следующий шаг | `awn-note-todo-sticker` устарел — писать в `awn-todo` |
| `awn-status` | `new` · `draft` · `open` · `planned` · `in-progress` · `blocked` · `waiting-review` · `done` · `closed` · `archived` · `backlog` · `incoming` · `in-discussion` · `outgoing` · `none` | Только эти ключи; по умолчанию `open` |
| `awn-quality` | Готовность после проверки, 0–10 (<4 — доработать, 4 — норма) | — |
| `awn-importance` | Важность для человека, 0–10; поднимает в поиске, наследуется внутрь темы | — |
| `awn-tags` / `awn-taxonomy` | Свободные теги (список строк) / значения справочников из `awn-databases/taxonomies/` | — |
| `awn-emoji`, `awn-preview`, `awn-sort` | Эмодзи вместо иконки, картинка превью (`assets/preview/`), порядок в меню | Превью — слот `assets` |
| `awn-web-url` | URL оригинала в интернете | — |
| `awn-main` / `awn-focus` | Показ на главной / в быстром навигаторе | — |
| `awn-slots-flexible` | Тема без типовых слотов (только hub, см. раздел 4) | — |
| `awn-runtime-load-always` | Всегда подгружать в контекст агента (`session_context_get`) | Включать редко |
| `awn-runtime-cron` · `-cron-schedule` · `-heartbeat` · `-reminder` · `-commands` | Запуск по расписанию (cron-выражение), heartbeat, напоминание, в инструкции есть команды | Раздел 11 |
| `awn-index-exclude-record` / `-subtree` | Исключить запись / всё содержимое папки из поиска и индексов | — |
| `awn-create` · `awn-update` · `awn-version` · `awn-owner` | Создан / изменён / версия / владелец | Системные, не писать |
| `awn-viewed` · `awn-deadline` · `awn-auto-toc` | Заглушки — пока не заполняются и ни на что не влияют | Не опираться |
| `awn-viz-graph` / `-mindmap` / `-roadmap` | Настройки узла на графе, карте знаний и roadmap | Только по просьбе |
| `awn-location-*`, `awn-is-real-world-*` | Физическая локация, координаты, признак реального объекта/события (записи) | — |

Префикс `awn-` — системные поля платформы; свои поля темы задаются в `schema` и могут быть без префикса. Поля типа ведут свои хабы (например `awn-code` / `awn-target-path` у short-link) — смотри схему типа.

---

## 3. Темы (`awn-topics/`)

Типы: `awn.hub.topic.ws` (корень), `awn.hub.topic.area` (область), `awn.hub.topic` (тема со слотами), `awn.hub.topic.section` (служебные). `parentPath` в `topic_create`:

- `awn-topics/` — темы человека (по умолчанию);
- `awn-topics/0-agent-kit/` — служебные темы агента;
- `awn-topics/0-shared/` — общие ресурсы.

Тело `manifest.md` — **бриф**: назначение, границы, договорённости, что класть в слоты. Не память: записи — в слотах, события — в журнале, разговор — в дискуссии.

| Задача | Tool |
|--------|------|
| Карточка | `topic_get` / `topic_update` |
| Список узлов | `topics_list` (legacy `list_topics`) |
| Создать | `topic_create({ type: "area"\|"topic", parentPath, displayName, slug })` |
| Переименовать / переместить / удалить | `topic_rename` / `topic_move` / `topic_delete` |
| Тело manifest | `topic_body_read` / `topic_body_write` |
| Свойства (frontmatter) | `topic_properties_read` / `topic_properties_write`, `topic_property_read` / `topic_property_write` |
| Схема полей формы | `topic_schema_read` / `topic_schema_write` |
| Настройки UI | `topic_config_read` / `topic_config_write` |
| Секреты | `topic_env_read` / `topic_env_write` |
| Слоты-шаблон | `topic_slots_template_get` / `topic_slots_template_set` |
| Есть ли / лёгкая мета | `topic_exists` / `topic_meta_get` |
| Ссылка / slug | `get_workspace_open_url_from_path({ path, view? })` (legacy `get_topic_url`) / `record_slug_generate` |

`schema.yml` — поля формы (override типа); `config.yml` — только UI.

---

## 4. Слоты

Слот — папка под `awn-storage/` темы (и канала, медиатеки, базы, репозитория). `list_slots({ placement: { kind: "topic", path } })` — слоты и драйвер: `external` (папка файлов, нужен `ref`) или `internal` (один файл, **без `ref`**).

| Слот | Что там |
|------|---------|
| `main` | Основная память |
| `inbox` | Входящие (`status: new`, разбор — `triage_inbox_item`) |
| `notes`, `references`, `artefacts` | Заметки, источники, черновики |
| `media` | Самостоятельные файлы темы |
| `assets` | Ресурсы **записей**: `preview/`, `pasted/`, `attachments/`, `materials/` |
| `repository`, `scripts` | Небольшой код (проект со своим git — в репозиторий) |
| `comments`, `discussion` | Только через свои tools (раздел 10) |
| `main-single`, `main-single-csv`, `todo-single` | Однофайловые: страница, таблица, TODO |
| `history` | Системный |

Ключи только канонические: `notes`, `scripts`, `discussion`.

- **`media` ≠ `assets`.** Картинка в тексте, превью (`awn-preview`), вложение (`awn-attachments`) → `assets`; в markdown: `awn-storage/assets/pasted/{файл}`.
- **Материалы записи:** `assets/materials/{awn-id}/` — связь по `awn-id` (переименование записи папку не переносит).
- **Гибкий слот** (`slotsFlexible: true` в TOC) — тема без типовых слотов; только `content_create({ slot: "main", parent? })`.
- **`main-single-csv`** — `content_read` / `content_write`, `part=body`, весь CSV целиком.

---

## 5. Чтение и запись контента

Один объект — `content_read` / `content_write` / `contents_list` (+ `content_create`, `content_exists`, `content_rename`, `content_move`, `content_delete`, `content_binary_read`, `content_binary_write`, `content_binary_write_from_url`, `content_merge`, `content_split`, `content_property_read` / `content_property_write`). Legacy: `read_content`, … Неизвестные параметры → `Unrecognized key(s)`.

```json
{ "workspaceId": "…", "placement": { "kind": "topic", "path": "…/manifest.md", "slot": "main", "ref": "zametka.md" }, "part": "body" }
{ "workspaceId": "…", "placement": { "kind": "root", "path": "awn-repositories/site/src/index.html" } }
```

- `kind`: `topic` | `channel` | `media` | `database` | `repository` — нужны `path` (slug без префикса хаба) + `slot` (+ `ref`); `root` — только `path` от корня.
- `ref` — файл с расширением; без расширения повторяется с `.md` (`refResolved` в ответе).

**`content_read`** — `part`: `body` (по умолчанию) | `properties` | `schema` | `meta` | `all`.
- Тело окном: 300 строк, `startLine` + `limitLines` (до 500). Номера строк — файла с frontmatter, как в поиске.
- Ответ: `hash`, `totalLines`, `hasMore`, `nextStartLine`. `full: true` — всё тело, нужно только перед `mode: replace`.
- Бинарь (`kind: root`): `format: "base64"` (картинки — блоком `image`), `offsetBytes`.

**`content_write`** — `part`: `body` | `properties` (patch) | `schema`; бинарь — `data` (base64) + `mimeType`.

| `mode` для body | Что делает |
|-----------------|-----------|
| `patch` | `oldString` → `newString` (`""` удаляет). Совпадение одно или `replaceAll: true`. **Предпочтительно** |
| `replace` (по умолчанию) | Всё тело, frontmatter сохраняется |
| `append` / `prepend` | В конец / в начало |
| `replace_lines` | `startLine`..`endLine` → `content`; нужен `expectedHash` |
| `insert` | `afterLine` / `beforeLine` + `content`; нужен `expectedHash` |

`expectedHash` — `hash` из последнего чтения/записи; файл изменился → `conflict`. Frontmatter через body не меняется — только `part=properties`.

- Новый `.md` — `content_create`. Бинарник — `content_binary_write` или `content_binary_write_from_url` (не `.md`).
- Показать картинку из заметки: ссылку `awn-storage/assets/pasted/x.png` достроить до `awn-topics/<тема>/awn-storage/…` (путь — из `record_path_resolve`), затем `content_read` с `kind: root`, `format: "base64"`.

---

## 6. Базы (накопители, инфоблоки)

В UI — «Накопители информации». **Однотипные записи с общей схемой полей.**

| | База (`awn-databases/`) | Тема (`awn-topics/`) |
|---|------------------------|----------------------|
| Данные | Одинаковые поля | Свободный текст, медиа, код |
| Запросы | Выборки «по колонке» | Связи между файлами |
| Примеры | Задачи, расходы, справочники | Протокол встречи, README |

Адресация по `store` (путь под `awn-databases/`, например `tasks`, `taxonomies/tags`):

- **Каркас** (`group` / `collection` / `single`): `databases_list`, `database_get`, `database_register`, `database_update`, `database_delete`, `database_rename`, `database_schema_read` / `database_schema_write`, `database_properties_read` / `database_properties_write`, `read_databases_index_toc` (legacy `list_databases`, `read_database_schema`, …).
- **Записи** в `data/`: `contents_list`, `content_create` (`isSection` или `awn.content.category` — раздел), `content_delete`, `content_move` (`targetParent`, `slug`); тело и поля — `content_read` / `content_write` / `content_property_*` с `kind: database`, `slot: data`, `ref`.

| `collectionType` | Когда |
|------------------|-------|
| `md` | Сущности с полями |
| `md-lite` | Простые списки |
| `csv` | Одна таблица-реестр |
| `csv-files` | Таблица на запись |
| `files` | Загрузка файлов |

- **CSV** (`recordEditMode: whole-file-csv`): `ref: main.csv`, всегда целиком.
- **Имена полей:** `awn-*` — системные; свои — без префикса.
- Факты, глоссарий, справочник — тоже базы (`awn-databases/contents/…`), работай через их tools (раздел 10).
- Схему пиши полным набором полей (см. `agent-cms-rules`).

---

## 7. Каналы и входящие

Канал: `awn-channels/{slug}/`. Слоты: `inbox`, `outbox`, `files`, `assets`. Содержимое — `placement: { kind: "channel", path: "<slug>", slot, ref }`.

- Tools: `channels_list`, `channel_get`, `channel_register`, `channel_update`, `channel_rename`, `channel_delete` (legacy `list_channels`, …); `list_inbox`.
- Разбор: `triage_inbox_item` — `to-content` (в тему), `mark-done`, `set-status`. Для `inbox` темы (`status: new`) — то же.

---

## 8. Репозитории (`awn-repositories/`)

Свои проекты, форки, клоны: `awn-repositories/{slug}/` (или `{group}/{slug}/`) + `manifest.md`.

- Tools: `repositories_list` (папки без карточки — в `unregistered`), `repository_get({ path })`, `repository_register({ slug, name?, description?, origin?, body? })`, `repository_update({ path, … })`, `repository_rename`, `repository_delete`. Legacy: `list_repositories`, `get_repository`, …
- **Код не индексируется** — в поиске только `manifest.md`, `index.md`, `groups.yml`. Код читай по явному пути: `contents_list` (`kind: root`) + `content_read` (`kind: root`), правь `content_write` с `mode: patch`.
- **Карточка** — зачем репозиторий, что смотреть, связь с темой. `status`: `active` · `study` · `archived` · `vendored`. `group` — группа в сайдбаре, не папка.
- Папка в `unregistered` → `repository_register` с тем же `slug`.
- Git хранилища — раздел 17; клонов он не касается.

---

## 9. Медиатеки (`awn-media/`)

Файлы и картинки уровня хранилища. Слоты: `files`, `assets`. `placement: { kind: "media", path: "<slug>", slot, ref }`.

- Tools: `media_libraries_list`, `media_library_get`, `media_library_register` / `media_library_update` / `media_library_rename` / `media_library_delete` (legacy `list_media_libraries`, …); картинка из сети — `content_binary_write_from_url`.
- **Медиа-облако:** `module_media_cloud_*` — `providers_list`, `status`, `sync`, `links_repair` (`path` — manifest темы, `file` — **полный** путь от корня). Пока только локально (`awn-media-cloud/`), в Google и Яндекс не грузит. Скилл `agent-cms-modules`.

---

## 10. Куда что класть и память

| Что | Куда |
|-----|------|
| Решение, предпочтение, сущность (1–2 фразы) | `fact_create` |
| Термин и определение | `glossary_term_create` |
| Справочная статья | `reference_entry_create` |
| Событие | `journal_entry_append` |
| Обсуждение темы | `append_discussion` |
| Аннотация-комментарий к manifest или записи | `annotation_comment_append` |
| Входящее | `content_create({ slot: "inbox", status: "new" })` |
| Заметка на сессию / договорённость | `session_note_write` (`NOTE.md`) / `session_todo_write` (`TODO.md`) |
| Инструкции агента | `AGENTS.md` / `SKILL.md` через `content_write` (`kind: root`, `path: AGENTS.md`) |
| Уведомление в 🔔 | `notify_user` или журнал с `notify: true` |
| Однотипные табличные данные | база (раздел 6) |
| Всё остальное | слот темы (раздел 4) |

Комментарии, дискуссии, факты, термины и справочник — только через свои tools (не `content_write`):

- **Журнал** (`.agent-cms/journal/`, файл на ISO-неделю): `journal_entry_append`, `journal_entries_list`, `workspace_notifications_list`. События, не логи чатов.
- **Факты:** `fact_create`, `fact_update`, `facts_list`, `facts_search`. `kind`: `decision` · `preference` · `entity` · `procedure` · `open-question` · `note` · `fact`. Решение изменилось → новый факт с `supersedes`. Legacy: `workspace_fact_*`, `create_workspace_fact`, …
- **Глоссарий:** `glossary_term_create` / `glossary_term_update` / `glossary_terms_list` / `glossary_terms_search`.
- **Справочник:** `reference_entry_create` / `reference_entry_update` / `reference_entries_list` / `reference_entries_search`.
- **Дискуссия:** `read_discussion` / `append_discussion`.
- **Аннотации · comment** (`awn.annotation.comment`, слот `comments/`): `annotation_comments_list`, `annotation_comment_append`, `annotation_comment_read`, `annotation_comment_update`, `annotation_comment_delete`, `annotation_comment_reaction_toggle`. `path` — manifest темы; к записи — `mode` (`description` | `external` | `media`) + `file`; ответ — `replyTo`.
- **`NOTE.md` / `TODO.md`** в корне: `session_note_read` / `session_note_write`, `session_todo_read` / `session_todo_write` (по умолчанию append). Это не слоты `notes` и `todo-single`.

---

## 11. Крон, heartbeat, always-context

**Старт чата:** `session_context_get` → `alwaysContext` (полные тексты файлов) и `wsMap`. Только always-context без карты: `session_list_always_context`.

Состав `alwaysContext` (все три источника суммируются):

1. **`awn-runtime-load-always: true`** на теме или content-записи.
2. **`always-context-md-files`** (scope `platform`) — какие **корневые** `.md` workspace подмешивать (по умолчанию `AGENTS.md`; также AUTH, BOOTSTRAP, ONBOARDING, SKILL, README, NOTE, TODO). `setting_read` / `setting_write`.
3. **`always-context-ws-folder`** (scope `platform`) — путь от корня workspace; **рекурсивно** `.md`, `.yml`, `.yaml`, `.txt` (по умолчанию `awn-topics/0-shared/0-context/awn-storage/`). Пустая строка — каталог отключён.

**`GLOBAL-SKILL-*`** сюда не входят — скиллы клиента или `read_platform_doc`.

Флаги frontmatter темы/записи (`topic_properties_write` / `content_write`, `part=properties`):

| Поле | Значение | Реестр |
|------|----------|--------|
| `awn-runtime-load-always: true` | Всегда в контексте | `session_list_always_context` |
| `awn-runtime-cron: true` + `awn-runtime-cron-schedule` | По расписанию | `session_list_cron` |
| `awn-runtime-heartbeat: true` | Периодическая проверка | `session_list_heartbeat` |
| `awn-runtime-reminder: true` | В «Напоминания» | — |
| `awn-runtime-commands: true` | В инструкции есть команды | — |

**Пять списков `session_list_*`** (индекс записей; always — ещё полные тексты в `items`):

| Tool | Что в списке |
|------|----------------|
| `session_list_always_context` | always-context (load-always + system md + ws-folder) |
| `session_list_cron` | `awn-runtime-cron` + расписание |
| `session_list_heartbeat` | `awn-runtime-heartbeat` |
| `session_list_in_focus` | `awn-focus` |
| `session_list_on_main` | `awn-main` на главной |

Произвольная выборка из каталога: `registry_queries_list` → `registry_query_run({ id })`.

---

## 12. Зависимости

`dependencies.csv` в корне — связи между записями. `workspace_dependencies_read`, `workspace_dependencies_write` (весь CSV или `rows`). Колонки меняются только в настройках workspace.

---

## 13. Аннотации · sidecar

Метаданные к файлу: `photo.png` → `photo.sidecar.md`. Сам не создаётся.

**Sidecar** (`awn.annotation.sidecar`, `*.sidecar.md`): `annotation_sidecar_path_resolve`, `annotation_sidecar_read`, `annotation_sidecar_create` (409, если есть), `annotation_sidecar_update`, `annotation_sidecar_delete`. Текст из картинок и PDF — `index_ocr_run`.

---

## 14. Поиск и навигация

Поиск, оглавления (`*_index_toc`), backlinks, сущности, DQL, индексы — скилл `agent-cms-search` (`GLOBAL-SKILL-5-SEARCH.md`). Читай его, когда нужно что-то найти или сделать выборку.

---

## 15. Файлы, веб, выполнение

| Что | Чем |
|-----|-----|
| Любой файл по пути | `content_read` / `content_write` с `kind: root`; обход — `contents_list` (`kind: root`, `path`, `depth`) |
| Файлы корня (`AGENTS.md`, `SKILL.md`…) | `contents_list` (`path: "."`) → `content_read` / `content_write` (`path: AGENTS.md`; история на write) |
| Бинарь в слот | `content_binary_write` (base64) / `content_binary_write_from_url` |
| Загрузка по полному пути | только `MCP_LEGACY_TOOLS=1`: `upload_file` / `upload_file_from_url` |
| Текст из pdf, docx, xlsx, html | `tool_document_text_extract` |
| Веб | `tool_web_search`, `tool_web_images_search`, `tool_web_page_read`, `get_external_url_page_preview` |
| Скрипт | `tool_script_run` (`.py` / `.js` / `.sh`) |
| Команда | `tool_command_exec` (массив args) / `tool_shell_exec` (строка с пайпами) |
| Файлообменник | `module_file_hub_outbound_*` (list, enqueue, remove, clear); inbound — stub `module_file_hub_inbound_*_zzz` |

**`batch_invoke`** — N вызовов **одного** tool (`tool` + `items[]`, без `workspaceId` в items): read / list / search до 20, write / create / delete до 10. Возможен частичный успех — проверяй каждый item.

---

## 16. Корзина

Удаление мягкое: файл или папка переезжает в корзину.

- **Где:** `awn-recycler/re-{метка}-{имя}`, метаданные — `awn-recycler/_meta`. На месте остаётся маркер `.trash.{метка}` (скрыт в списках и поиске, не считай контентом).
- **Ответ tool:** `recycled: true`, `markerId`, `markerLabel`, `recycleName` — покажи человеку метку.
- **Удаляют в корзину:** `content_delete`, `topic_delete`, `channel_delete`, `media_library_delete`, `repository_delete` (legacy `delete_*`; встроенные каналы и медиатеки защищены).
- **Восстановить и очистить** — только человек через UI («Корзина»); MCP-tools нет. На «верни удалённое» назови метку.
- `awn-recycler/` не правь и не читай как данные.

---

## 17. Модули

Git-модуль хранилища (`module_git_*`) и другие модули платформы — скилл `agent-cms-modules` (`GLOBAL-SKILL-6-MODULES.md`). Только по просьбе человека.

---

## 18. Хранилища, настройки, типы

**Хранилища:** `workspaces_list`, `workspace_create`, `workspaces_scan` → `workspace_register`, `workspace_update`, `workspace_default_set`, `workspace_orchestrator_set`. Группы: `workspace_groups_list`, `workspace_group_create` / `workspace_group_update` / `workspace_group_delete`, `workspace_group_assign`, `workspace_group_unassign`, `workspace_groups_reorder`.

**Настройки** — 4 независимых scope: `platform` (MCP policy, индексы, always-context), `workspace` (`awn-id-*`, voice, колонки зависимостей), `integrations` (skills, MCP, git-партии), `user` (меню, сайдбар). `settings_list`, `setting_read`, `setting_write` (`sys-*` и `awn-id-*` — только чтение). Секретов в settings нет — для темы есть `.env`.

**Типы:** `list_types({ filter })` → `get_type({ id })`, всегда по `id`. `filter`: `create-page` (`awn.hub.topic`), `slot-content` (`awn.content.record`, `awn.content.record-csv`), `data-containers` (`awn.hub.database.collection`), `data-elements` (`awn.content.record`, `-lite`, `-csv`, `awn.content.category`).

**Платформа:** `platform_info_get`, `platform_health_get`, `platform_config_list`, `settings_list`, `setting_read`, `setting_write`. Документы (`GLOBAL-SKILL-*.md` и README в корне репо): `platform_docs_list` → `platform_doc_read({ path })`. **Хранилище (после `workspaceId`):** `workspace_dependencies_read` / `workspace_dependencies_write`, `tool_mcp_ping`, `workspace_summary_get`, …
