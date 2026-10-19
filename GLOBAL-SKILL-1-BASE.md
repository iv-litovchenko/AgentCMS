---
name: agent-cms
description: Работа с Agent CMS через MCP — общим хранилищем человека и агента (workspace, каналы, темы, слоты, базы, репозитории, медиатеки, журнал, факты, глоссарий, справочник, крон, зависимости, sidecar, корзина). Используй, когда человек просит что-то сделать в хранилище — прочитать, найти, создать, разобрать, отредактировать, удалить, закоммитить, — а также при упоминании workspace, workspaceId, awn-*, manifest.md, awn-storage или tools вроде read_content / write_content / get_session_context.
---

# Agent CMS — базовый скилл

Как устроено хранилище и какими tools с ним работать. Правила — `agent-cms-rules`, стиль — `agent-cms-response-style`, markdown — `agent-cms-markdown`, поиск — `agent-cms-search`, модули (git) — `agent-cms-modules`. Ввод и карта скиллов — `agent-cms-welcome` (`GLOBAL-SKILL-0-MCP-WELCOME.md`), необязательный: если не установлен — `read_platform_doc({ path: "GLOBAL-SKILL-0-MCP-WELCOME.md" })`.

Разделы: 1 Старт · 2 Карта · 3 Темы · 4 Слоты · 5 Контент · 6 Базы · 7 Каналы · 8 Репозитории · 9 Медиатеки · 10 Память · 11 Крон · 12 Зависимости · 13 Sidecar · 14 Поиск (→ скилл 5) · 15 Файлы и выполнение · 16 Корзина · 17 Модули (→ скилл 6) · 18 Хранилища и настройки.

---

## 1. Старт

Работа начинается по запросу человека, сам ничего не запускай.

1. `list_workspaces` → выбери id → `get_session_context({ workspaceId })`. Во всех вызовах — тот же `workspaceId` (селектор в UI на MCP не влияет).
2. Человек говорит «вот это» без пути → `get_ui_focus` (готовые `path` / `slot` / `ref`).
3. Дали только путь → `resolve_workspace_path` (тема, слот, готовые аргументы).
4. Кто ты и кто человек — `get_agent_identity` / `get_user_identity`.

**«Перезагрузи контекст»** = снова `get_session_context` и при необходимости `get_workspace_always_context_registry`, `read_topic_index_toc`, `read_content_index_toc`.

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
- **`awn-id`** — глобальный номер записи (не `workspaceId`). `find_by_id({ id })`; старым проставить — `assign_workspace_id`. Остальные свойства — «Базовые свойства» ниже.
- **Служебные папки:** `awn-temp/` (все временные файлы), `awn-scripts/`, `awn-recycler/` (корзина, раздел 16), `.agent-cms/` (кэши, журнал, настройки).
- **Файлы корня** (`AGENTS.md`, `SKILL.md`, `NOTE.md`, `TODO.md`, `dependencies.csv`) — раздел 15.
- **Свободная память** — папки без `manifest.md`: `list_content` (`kind: root`, `path`) + `read_content` / `write_content` с `kind: root`. Описание папки — `{folder}/sidecar.md`. В тему превращает `create_topic`.

### Базовые свойства (frontmatter)

Есть у любой записи и карточки (`manifest.md`, запись слота). Читать/писать — `read_` / `write_content` с `part: properties` (patch) или `*_topic_property`. Полный список полей типа — `read_topic_schema` / `get_type`; здесь только общие.

| Свойство | Что значит | Правило |
|----------|-----------|---------|
| `awn-type` | Тип сущности (`awn.hub.topic`, `awn.content.record`…) | Не менять |
| `awn-id` | Глобальный числовой номер в workspace (≠ `workspaceId`, ≠ slug) | Не менять; поиск — `find_by_id` |
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
| `awn-runtime-load-always` | Всегда подгружать в контекст агента (`get_session_context`) | Включать редко |
| `awn-runtime-cron` · `-cron-schedule` · `-heartbeat` · `-reminder` · `-commands` | Запуск по расписанию (cron-выражение), heartbeat, напоминание, в инструкции есть команды | Раздел 11 |
| `awn-index-exclude-record` / `-subtree` | Исключить запись / всё содержимое папки из поиска и индексов | — |
| `awn-create` · `awn-update` · `awn-version` · `awn-owner` | Создан / изменён / версия / владелец | Системные, не писать |
| `awn-viewed` · `awn-deadline` · `awn-auto-toc` | Заглушки — пока не заполняются и ни на что не влияют | Не опираться |
| `awn-viz-graph` / `-mindmap` / `-roadmap` | Настройки узла на графе, карте знаний и roadmap | Только по просьбе |
| `awn-location-*`, `awn-is-real-world-*` | Физическая локация, координаты, признак реального объекта/события (записи) | — |

Префикс `awn-` — системные поля платформы; свои поля темы задаются в `schema` и могут быть без префикса. Поля типа ведут свои хабы (например `awn-code` / `awn-target-path` у short-link) — смотри схему типа.

---

## 3. Темы (`awn-topics/`)

Типы: `awn.hub.topic.ws` (корень), `awn.hub.topic.area` (область), `awn.hub.topic` (тема со слотами), `awn.hub.topic.section` (служебные). `parentPath` в `create_topic`:

- `awn-topics/` — темы человека (по умолчанию);
- `awn-topics/0-agent-kit/` — служебные темы агента;
- `awn-topics/0-shared/` — общие ресурсы.

Тело `manifest.md` — **бриф**: назначение, границы, договорённости, что класть в слоты. Не память: записи — в слотах, события — в журнале, разговор — в дискуссии.

| Задача | Tool |
|--------|------|
| Карточка | `get_topic` / `update_topic` |
| Создать | `create_topic({ type: "area"\|"topic", parentPath, displayName, slug })` (нужно хоть одно из `displayName` / `title` / `slug` / `name`) |
| Переименовать / переместить / удалить | `rename_topic` (`path` + `displayName`/`title`, опц. `slug`) / `move_topic` / `delete_topic` |
| Тело manifest | `read_topic_body` / `write_topic_body` |
| Свойства (frontmatter) | `read_` / `write_topic_properties` (patch), `*_topic_property` |
| Схема полей формы | `read_` / `write_topic_schema` (только изменённые блоки) |
| Настройки UI | `read_` / `write_topic_config` |
| Секреты | `read_` / `write_topic_env` |
| Есть ли / лёгкая мета | `topic_exists` / `get_topic_meta` |
| Ссылка / slug | `get_topic_url({ path, view? })` / `generate_workspace_slug({ text, preset })` |

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
- **Гибкий слот** (`slotsFlexible: true` в TOC) — тема без типовых слотов; только `create_content({ slot: "main", parent? })`.
- **`main-single-csv`** — `read_content` / `write_content`, `part=body`, весь CSV целиком.

---

## 5. Чтение и запись контента

Один объект — `read_content` / `write_content` / `list_content` (+ `create_content`, `content_exists`, `rename_content`, `move_content`, `delete_content`, `read_content_binary`, `write_content_binary`, `write_content_binary_from_url`, `merge_content`, `split_content`, `*_content_property`). Неизвестные параметры (в т.ч. в `placement`) → `Unrecognized key(s)`.

```json
{ "workspaceId": "…", "placement": { "kind": "topic", "path": "…/manifest.md", "slot": "main", "ref": "zametka.md" }, "part": "body" }
{ "workspaceId": "…", "placement": { "kind": "root", "path": "awn-repositories/site/src/index.html" } }
```

- `kind`: `topic` | `channel` | `media` | `database` | `repository` — нужны `path` (slug без префикса хаба) + `slot` (+ `ref`); `root` — только `path` от корня.
- `ref` — файл с расширением; без расширения повторяется с `.md` (`refResolved` в ответе).

**`read_content`** — `part`: `body` (по умолчанию) | `properties` | `schema` | `meta` | `all`.
- Тело окном: 300 строк, `startLine` + `limitLines` (до 500). Номера строк — файла с frontmatter, как в поиске.
- Ответ: `hash`, `totalLines`, `hasMore`, `nextStartLine`. `full: true` — всё тело, нужно только перед `mode: replace`.
- Бинарь (`kind: root`): `format: "base64"` (картинки — блоком `image`), `offsetBytes`.

**`write_content`** — `part`: `body` | `properties` (patch) | `schema`; бинарь — `data` (base64) + `mimeType`.

| `mode` для body | Что делает |
|-----------------|-----------|
| `patch` | `oldString` → `newString` (`""` удаляет). Совпадение одно или `replaceAll: true`. **Предпочтительно** |
| `replace` (по умолчанию) | Всё тело, frontmatter сохраняется |
| `append` / `prepend` | В конец / в начало |
| `replace_lines` | `startLine`..`endLine` → `content`; нужен `expectedHash` |
| `insert` | `afterLine` / `beforeLine` + `content`; нужен `expectedHash` |

`expectedHash` — `hash` из последнего чтения/записи; файл изменился → `conflict`. Frontmatter через body не меняется — только `part=properties`.

- Новый `.md` — `create_content`. Бинарник — `write_content_binary` или `write_content_binary_from_url` (не `.md`).
- Показать картинку из заметки: ссылку `awn-storage/assets/pasted/x.png` достроить до `awn-topics/<тема>/awn-storage/…` (путь — из `resolve_workspace_path`), затем `read_content` с `kind: root`, `format: "base64"`.

---

## 6. Базы (накопители, инфоблоки)

В UI — «Накопители информации». **Однотипные записи с общей схемой полей.**

| | База (`awn-databases/`) | Тема (`awn-topics/`) |
|---|------------------------|----------------------|
| Данные | Одинаковые поля | Свободный текст, медиа, код |
| Запросы | Выборки «по колонке» | Связи между файлами |
| Примеры | Задачи, расходы, справочники | Протокол встречи, README |

Адресация по `store` (путь под `awn-databases/`, например `tasks`, `taxonomies/tags`):

- **Каркас** (`group` / `collection` / `single`): `list_databases`, `get_database`, `register_database`, `update_database`, `delete_database`, `rename_database`, `read_` / `write_database_schema`, `read_databases_index_toc`.
- **Записи** в `data/`: `list_content`, `create_content` (`isSection` или `awn.content.category` — раздел), `delete_content`, `move_content` (`targetParent`, `slug`); тело и поля — `read_` / `write_content` / `*_content_property` с `kind: database`, `slot: data`, `ref`.

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

- Tools: `list_channels`, `get_channel`, `register_channel`, `update_channel`, `rename_channel`, `delete_channel`, `list_inbox`.
- Разбор: `triage_inbox_item` — `to-content` (в тему), `mark-done`, `set-status`. Для `inbox` темы (`status: new`) — то же.

---

## 8. Репозитории (`awn-repositories/`)

Свои проекты, форки, клоны: `awn-repositories/{slug}/` (или `{group}/{slug}/`) + `manifest.md`.

- Tools: `list_repositories` (папки без карточки — в `unregistered`), `get_repository({ path })`, `register_repository({ slug, name?, description?, origin?, body? })`, `update_repository({ path, name?, description?, origin?, group?, status?, body? })`, `rename_repository`, `delete_repository`.
- **Код не индексируется** — в поиске только `manifest.md`, `index.md`, `groups.yml`. Код читай по явному пути: `list_content` (`kind: root`) + `read_content` (`kind: root`), правь `write_content` с `mode: patch`.
- **Карточка** — зачем репозиторий, что смотреть, связь с темой. `status`: `active` · `study` · `archived` · `vendored`. `group` — группа в сайдбаре, не папка.
- Папка в `unregistered` → `register_repository` с тем же `slug`.
- Git хранилища — раздел 17; клонов он не касается.

---

## 9. Медиатеки (`awn-media/`)

Файлы и картинки уровня хранилища. Слоты: `files`, `assets`. `placement: { kind: "media", path: "<slug>", slot, ref }`.

- Tools: `list_media_libraries`, `get_media_library`, `register_` / `update_` / `rename_` / `delete_media_library`; картинка из сети — `write_content_binary_from_url`.
- **Медиа-облако:** `module_media_cloud_*` — `providers_list`, `status`, `sync`, `links_repair` (`path` — manifest темы, `file` — **полный** путь от корня). Пока только локально (`awn-media-cloud/`), в Google и Яндекс не грузит. Скилл `agent-cms-modules`.

---

## 10. Куда что класть и память

| Что | Куда |
|-----|------|
| Решение, предпочтение, сущность (1–2 фразы) | `create_workspace_fact` |
| Термин и определение | `create_glossary_term` |
| Справочная статья | `create_reference_entry` |
| Событие | `append_journal_entry` |
| Обсуждение темы | `append_discussion` |
| Комментарий к manifest или записи | `append_comment` |
| Входящее | `create_content({ slot: "inbox", status: "new" })` |
| Заметка на сессию / договорённость | `write_workspace_note` (`NOTE.md`) / `write_workspace_todo` (`TODO.md`) |
| Инструкции агента | `AGENTS.md` / `SKILL.md` через `write_content` (`kind: root`, `path: AGENTS.md`) |
| Уведомление в 🔔 | `notify_user` или журнал с `notify: true` |
| Однотипные табличные данные | база (раздел 6) |
| Всё остальное | слот темы (раздел 4) |

Комментарии, дискуссии, факты, термины и справочник — только через свои tools (не `write_content`):

- **Журнал** (`.agent-cms/journal/`, файл на ISO-неделю): `append_journal_entry`, `list_journal_entries`, `list_workspace_notifications`. События, не логи чатов.
- **Факты:** `create_workspace_fact({ body, kind, tags, supersedes? })`, `update_` / `list_` / `search_workspace_fact(s)`. `kind`: `decision` · `preference` · `entity` · `procedure` · `open-question` · `note` · `fact`. Решение изменилось → новый факт с `supersedes`.
- **Глоссарий** и **справочник:** `create_` / `update_` / `list_` / `search_` + `glossary_term(s)` / `reference_entry(ies)`.
- **Дискуссия:** `read_discussion` / `append_discussion`.
- **Комментарии:** `list_comments`, `append_comment`, `read_comment`, `update_comment`, `delete_comment`, `toggle_comment_reaction`. `path` — manifest темы; к записи — `mode` (`description` | `external` | `media`) + `file`; ответ — `replyTo`.
- **`NOTE.md` / `TODO.md`** в корне: `read_` / `write_workspace_note`, `read_` / `write_workspace_todo` (по умолчанию append). Это не слоты `notes` и `todo-single`.

---

## 11. Крон, heartbeat, always-context

Флаги frontmatter темы/записи (`write_topic_properties` / `write_content`, `part=properties`):

| Поле | Значение | Реестр |
|------|----------|--------|
| `awn-runtime-load-always: true` | Всегда в контексте | `get_workspace_always_context_registry` |
| `awn-runtime-cron: true` + `awn-runtime-cron-schedule` | По расписанию | `get_workspace_cron_registry` |
| `awn-runtime-heartbeat: true` | Периодическая проверка | `get_workspace_heartbeat_registry` |
| `awn-runtime-reminder: true` | В «Напоминания» | — |
| `awn-runtime-commands: true` | В инструкции есть команды | — |

---

## 12. Зависимости

`dependencies.csv` в корне — связи между записями. `read_dependencies`, `write_dependencies` (весь CSV или `rows`). Колонки меняются только в настройках workspace.

---

## 13. Sidecar

Метаданные к файлу: `photo.png` → `photo.sidecar.md`. Сам не создаётся.

`resolve_sidecar_path`, `read_sidecar`, `create_sidecar` (409, если есть), `write_sidecar`, `delete_sidecar` (исходник не трогает). Текст из картинок и PDF — `run_workspace_ocr_index`.

---

## 14. Поиск и навигация

Поиск, оглавления (`*_index_toc`), backlinks, сущности, DQL, индексы — скилл `agent-cms-search` (`GLOBAL-SKILL-5-SEARCH.md`). Читай его, когда нужно что-то найти или сделать выборку.

---

## 15. Файлы, веб, выполнение

| Что | Чем |
|-----|-----|
| Любой файл по пути | `read_content` / `write_content` с `kind: root`; обход — `list_content` (`kind: root`, `path`, `depth`) |
| Файлы корня (`AGENTS.md`, `SKILL.md`…) | `list_content` (`path: "."`) → `read_content` / `write_content` (`path: AGENTS.md`; история на write) |
| Бинарь в слот | `write_content_binary` (base64) / `write_content_binary_from_url` |
| Загрузка по полному пути | только `MCP_LEGACY_TOOLS=1`: `upload_file` / `upload_file_from_url` |
| Текст из pdf, docx, xlsx, html | `extract_document_text` |
| Веб | `search_web`, `search_web_images`, `read_web_page`, `get_link_preview` |
| Скрипт | `run_script` (`.py` / `.js` / `.sh`) |
| Команда | `exec_command` (массив args) / `exec_shell` (строка с пайпами) |
| Файлообменник | `read_file_hub_queue`, `add_file_to_file_hub`, `remove_file_from_file_hub`, `clear_file_hub_queue` |

**`batch_invoke`** — N вызовов **одного** tool (`tool` + `items[]`, без `workspaceId` в items): read / list / search до 20, write / create / delete до 10. Возможен частичный успех — проверяй каждый item.

---

## 16. Корзина

Удаление мягкое: файл или папка переезжает в корзину.

- **Где:** `awn-recycler/re-{метка}-{имя}`, метаданные — `awn-recycler/_meta`. На месте остаётся маркер `.trash.{метка}` (скрыт в списках и поиске, не считай контентом).
- **Ответ tool:** `recycled: true`, `markerId`, `markerLabel`, `recycleName` — покажи человеку метку.
- **Удаляют в корзину:** `delete_content`, `delete_topic`, `delete_channel`, `delete_media_library`, `delete_repository` (встроенные каналы и медиатеки защищены).
- **Восстановить и очистить** — только человек через UI («Корзина»); MCP-tools нет. На «верни удалённое» назови метку.
- `awn-recycler/` не правь и не читай как данные.

---

## 17. Модули

Git-модуль хранилища (`module_git_*`) и другие модули платформы — скилл `agent-cms-modules` (`GLOBAL-SKILL-6-MODULES.md`). Только по просьбе человека.

---

## 18. Хранилища, настройки, типы

**Хранилища:** `list_workspaces`, `create_workspace`, `discover_workspaces` → `register_workspace`, `update_workspace`, `set_default_workspace`, `set_orchestrator_workspace`. Группы: `list_workspace_groups`, `create_` / `update_` / `delete_workspace_group`, `assign_workspace_to_group`, `remove_workspace_from_group`, `reorder_workspace_groups`.

**Настройки** — 4 независимых scope: `platform` (MCP policy, индексы, always-context), `workspace` (`awn-id-*`, voice, колонки зависимостей), `integrations` (skills, MCP, git-партии), `user` (меню, сайдбар). `list_settings`, `read_setting`, `write_setting` (`sys-*` и `awn-id-*` — только чтение). Секретов в settings нет — для темы есть `.env`.

**Типы:** `list_types({ filter })` → `get_type({ id })`, всегда по `id`. `filter`: `create-page` (`awn.hub.topic`), `slot-content` (`awn.content.record`, `awn.content.record-csv`), `data-containers` (`awn.hub.database.collection`), `data-elements` (`awn.content.record`, `-lite`, `-csv`, `awn.content.category`).

**Платформа:** `test_mcp_connection`, `get_platform_info`, `get_platform_health`, `get_workspace_storage_info`, `list_platform_config`. Документы (`GLOBAL-SKILL-*.md` и README в корне репо): `list_platform_docs` → `read_platform_doc({ path })`.
