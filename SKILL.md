---
name: agent-cms
description: Работа с Agent CMS через MCP — общим хранилищем человека и агента (workspace, каналы, темы, слоты, базы/инфоблоки, репозитории, медиатеки, журнал, факты, глоссарий, справочник, крон, зависимости, sidecar, поиск, DQL). Используй всегда, когда задача касается хранилища Agent CMS — прочитать, найти, создать, разобрать, переложить или отредактировать заметку, тему, файл, запись базы, факт или комментарий, — а также когда упоминаются workspace, agentId, awn-*, manifest.md, awn-storage или tools вроде read_content / write_content / get_session_context.
---

# Agent CMS

## Оглавление

1. Зачем это
2. Старт
3. Жёсткие правила
4. Как устроено — каналы, темы, базы, репозитории, медиатеки
5. Чтение и запись контента
6. Дополнительно — журнал, факты, общение, крон, зависимости, sidecar
7. Поиск и навигация
8. Файлы, веб, выполнение
9. Workspace, git, настройки
10. Когда контекст переполняется

---

## 1. Зачем это

Agent CMS — общее хранилище для человека и ИИ-агентов. Человек складывает сюда заметки, задачи, идеи, ссылки и файлы. Агент читает и пополняет их, поэтому контекст не теряется между сессиями и между разными агентами. Человек работает через UI, агент — через MCP; оба видят одно и то же.

Человек и агент — совместные пользователи данных (1+1), ведущая роль у человека. Его слова и структура важнее твоих догадок: сохраняй как есть, не переписывай и не удаляй по своей инициативе.

---

## 2. Старт

1. `list_workspaces` → выбери id → `get_session_context({ agentId })`.
2. `agentId` обязателен в **каждом** workspace-вызове (синонимы: workspace · agent · vault · хранилище). Селектор хранилища в UI на MCP не влияет.
3. Обзор: `list_topics` (узлы дерева тем), `read_topic_index_toc` (INDEX.md) или `read_workspace_map` (все `manifest.md` плоским списком).
4. Пользователь не назвал путь → `get_user_active_context_now`: что он сейчас открыл в UI, с готовыми `path` / `slot` / `ref`.

**«Перезагрузи контекст»** = снова `get_session_context` + при необходимости `list_workspace_always_context`, `read_topic_index_toc`, `read_content_index_toc` по активной теме.

Кто ты и кто пользователь в этом workspace — `get_agent_identity` / `get_user_identity` (`awn-topics/0-agent-kit/0-agent/`, `awn-topics/0-agent-kit/0-user/`; legacy `agent-kit/`, `a0-*`, `awn-agent-kit/…` на чтение).

---

## 3. Жёсткие правила

- **Только MCP tools.** Никаких `curl` к API и чтения/записи файлов workspace в обход MCP. Команды — `run_script` / `exec_command` / `exec_shell`.
- **Пути и типы не угадывай.** Бери из `read_*_index_toc`, `list_content`, `list_folder`, `resolve_workspace_path`, `get_type`.
- **Удаление и выполнение.** При `confirm-delete` / `confirm-exec` в настройках платформы передавай `confirm: true` **только после явного согласия человека**. Перед удалением или переносом записи проверь связи — `read_dependencies`.
- **Неясно, куда положить** — спроси или предложи вариант с обоснованием. Лучше один вопрос, чем файл не в том месте.
- **Устаревшие tools не используй:**

| Устарело | Используй |
|----------|-----------|
| `read_dialogs` / `append_dialog` | `read_discussion` / `append_discussion` |
| `list_system_files` / `read_system_file` / `write_system_file` | `list_root_files` / `read_root_file` / `write_root_file` |
| `list_vaults` | `list_workspaces` |
| `get_topic_map` | `read_topic_index_toc` + `list_folder` |
| `get_content_map` | `read_content_index_toc` + `read_content` (`part=properties`) |
| `read_content_body` / `write_content_*` и подобные | `read_content` / `write_content` с `part` |
| `list_channel_items`, `upload_channel_file`, `list_media_library_items`, `upload_media_library_file` | `list_content` / `write_content` с `kind: channel` / `media` |
| `write_file`, `patch_file` | `write_content` с `kind: root` (`mode: patch`) |
| `*_zzz` | заглушки, не вызывать |

---

## 4. Как устроено

**Поток данных:** сырое попадает в **канал** (или в слот `inbox` темы) → разбирается в **тему** (знания) или **базу** (структурированные данные). Код живёт в **репозиториях**, файлы и картинки — в **медиатеках** и слотах тем.

| Раздел | Где на диске | Что там |
|--------|--------------|---------|
| Каналы | `awn-channels/{slug}/` | Входящие потоки: Telegram, GitHub, закладки — сырые идеи, ссылки, задачи на потом |
| Темы | `awn-topics/…` (+ секции `agent-kit/`, `shared/`) | Разобранные знания по областям |
| Базы | `awn-databases/…` | Структурированные данные: задачи, финансы, дневник, привычки |
| Репозитории | `awn-repositories/{slug}/` | Подключённые проекты с кодом |
| Медиатеки | `awn-media/{slug}/` | Файлы и картинки workspace |

У каждой единицы — `manifest.md` (карточка: frontmatter + описание). У каждой новой записи — `awn-id` (глобальный номер): путь по номеру — `find_by_id({ id })`, проставить старым — `assign_workspace_id`.

### 4.1 Каналы (`awn-channels/`)

Входящие потоки. Карточка канала: `list_channels`, `get_channel`, `register_channel`, `update_channel`, `delete_channel`, `rename_channel`; каталог — `read_channels_index_toc` / `refresh_channels_index_toc`. Аналогично медиатеки и репозитории: `delete_media_library` / `rename_media_library`, `delete_repository` / `rename_repository`.

Содержимое — через content-tools с `placement: { kind: "channel", path: "<slug>", slot, ref }`. Слоты: `inbox` (входящее), `outbox` (исходящее), `files`, `assets`.

Разбор входящего: `list_inbox` → `triage_inbox_item` (`to-content` — перенести в тему, `mark-done`, `set-status`).

### 4.2 Темы (`awn-topics/`)

Дерево областей и тем. Типы: `awn.page.ws` (корень workspace), `awn.page.area` (область — папка), `awn.page.topic` (тема со слотами).

Разделы дерева (`parentPath` в `create_topic`): `awn-topics/` — темы пользователя (по умолчанию); `awn-topics/0-agent-kit/` — служебные темы агента; `awn-topics/shared/` — общие ресурсы (legacy `awn-shared/`, `agent-kit/`, `a0-*` на чтение).

**Тело `manifest.md` — бриф темы:** назначение, границы, договорённости, что класть в слоты. Это **не** память: записи — в слотах, события — в журнале, разговор — в дискуссии.

| Задача | Tool |
|--------|------|
| Карточка hub (как channel) | `get_topic` / `update_topic` — name, description, body |
| Создать | `create_topic({ type: "area"\|"topic", parentPath, displayName, slug })` |
| Переименовать / перенести / удалить | `rename_topic` / `move_topic` / `delete_topic` (`confirm`) |
| Тело и свойства manifest | `read_topic_body` / `write_topic_body`, `read_topic_properties` / `write_topic_properties` (patch), `*_topic_property` |
| Схема полей формы | `read_topic_schema` / `write_topic_schema` (только изменённые блоки) |
| Настройки UI темы | `read_topic_config` / `write_topic_config` — без `awn_schema` |
| Секреты темы | `read_topic_env` / `write_topic_env` |
| Существует ли / мета | `topic_exists` / `get_topic_meta` |
| Ссылка для человека | `get_topic_url({ path, view? })` |
| Подобрать slug | `generate_workspace_slug({ text, preset })` |

#### Слоты темы

Слот — папка под `awn-storage/` темы. Файлы в корень темы **не** класть — только в слот.

`list_slots({ placement: { kind: "topic", path } })` → `driver`: `external` (папка, нужен `ref`) или `internal` (один файл, **без `ref`**). Ключи только канонические: `notes`, `scripts`, `discussion` (не `note`, `script`, `thread`, `dialogs`).

| Слот | Зачем |
|------|-------|
| `main` | Основная память темы |
| `inbox` | Входящие темы (`status: new`) |
| `notes`, `references`, `artefacts` | Заметки, источники, черновики |
| `media` | Самостоятельные файлы темы |
| `assets` | Ресурсы **записей**: `preview/`, `pasted/`, `attachments/`, `materials/` |
| `repository`, `scripts` | Небольшой код и скрипты темы (проект со своим git — в репозитории) |
| `comments`, `discussion` | Только через свои tools (раздел 6) |
| `main-single`, `main-single-csv`, `todo-single` | Однофайловые: страница памяти, таблица, TODO |
| `history` | Системный, не трогать |

- **`media` ≠ `assets`.** Картинка в тексте, превью (`awn-preview`), вложение (`awn-attachments`) — в `assets`. Ссылка в markdown: `awn-storage/assets/pasted/{файл}`.
- **Материалы записи** — `assets/materials/{awn-id}/`: одна папка на запись, связь по `awn-id` (переименование записи папку не переносит). Legacy `awn-materials-*` / `awn-parts-*` не создавать.
- **Гибкий слот** (`slotsFlexible: true` в TOC) — тема без типовых слотов; писать **только** `create_content({ slot: "main", parent? })`.
- **`main-single-csv`** — читай и пиши **весь** CSV через `part=body`.

### 4.3 Базы (`awn-databases/`)

В UI — «Накопители информации». **Когда база, а когда тема:** у всех элементов одинаковые поля и нужны выборки «по колонке» (задачи, расходы, справочники) → база. Свободный текст, медиа, связи между файлами → тема. Табличный реестр — не в `main/`; заметку без общей схемы — не в базу.

Два слоя, адресация по `store` (путь под `awn-databases/`, напр. `tasks`, `taxonomies/tags`):

- **store** — каркас (`group` / `collection` / `single`): `list_databases`, `get_database`, `register_database`, `update_database`, … (legacy `create_database`, `database_frame_*`); каталог — `read_databases_index_toc`.
- **Записи в data/** — `list_content`, `create_content` (`isSection` или `awn.content.category` — раздел), `delete_content`, `move_content` (`targetParent`, `slug`); тело/поля — `read_content` / `write_content` / `*_content_property` (`kind: database`, `slot: data`, `ref`).

| `collectionType` | Когда |
|------------------|-------|
| `md` | Сущности с полями |
| `md-lite` | Простые списки (тексты, слоганы) |
| `csv` | Табличный реестр в одной таблице |
| `csv-files` | Отдельная таблица на запись |
| `files` | Загрузка файлов |

- **CSV** (`recordEditMode: whole-file-csv` в `get_database`): таблица = один файл. `read_content` / `write_content`, `ref: main.csv`, целиком.
- **Схема:** `write_database_schema` — сначала `read_database_schema`, потом **полный** набор полей.
- **Имена полей:** `awn-*` — только системные; свои — без префикса (`amount`, `status`).
- Факты, глоссарий и справочник — тоже базы (`awn-databases/contents/…`), но работай с ними **только** через свои tools (раздел 6).

### 4.4 Репозитории (`awn-repositories/`)

Исходники, подключённые к workspace: свои проекты, форки, клоны для изучения. Папка `awn-repositories/{slug}/` (или `{group}/{slug}/`) + карточка `manifest.md`.

| Задача | Tool |
|--------|------|
| Список (+ папки без карточки в `unregistered`) | `list_repositories` |
| Одна карточка | `get_repository({ path })` |
| Подключить новый / подхватить существующую папку | `register_repository({ slug, name?, description?, origin?, body? })` |
| Обновить карточку | `update_repository({ path, name?, description?, origin?, group?, status?, body? })` |
| Каталог `index.md` | `read_repository_index_toc` / `refresh_repository_index_toc` |

- **Код не индексируется** — в поиске только `manifest.md`, `index.md`, `groups.yml`. Репозиторий находи через `list_repositories`, код читай по явному пути: `list_folder` + `read_content({ placement: { kind: "root", path: "awn-repositories/{slug}/…" } })`, правь `write_content` с `mode: patch`.
- **Карточка** — зачем репозиторий, что в нём смотреть, связь с темой. `status`: `active` · `study` · `archived` · `vendored`. `group` — логическая группа в сайдбаре, не папка.
- Папка в `unregistered` — предложи `register_repository` с тем же `slug` (папка не тронется).

### 4.5 Медиатеки (`awn-media/`)

Файлы и картинки уровня workspace (не слот темы). Карточка: `list_media_libraries`, `get_media_library`, `register_media_library`, `update_media_library`. Содержимое — content-tools с `placement: { kind: "media", path: "<slug>", slot: "files"|"assets", ref }`.

**Медиа-облако** — выгрузка тяжёлых файлов из workspace: `sync_media_cloud_file` (`path` — manifest темы, `file` — **полный** workspace-path), `get_media_cloud_file_status`, `repair_media_cloud_links`, `list_media_cloud_providers`. Сейчас только локальная выгрузка (`awn-media-cloud/`), загрузки на Google/Яндекс нет.

### 4.6 Свободная память и корневые файлы

- **Свободная память** — папки без `manifest.md`: `list_folder` + `read_content` / `write_content` с `kind: root`. Описание папки — `{folder}/sidecar.md`. Превратить в тему — `create_topic`.
- **Файлы корня workspace** (`AGENTS.md`, `SKILL.md`…): `list_root_files` → `read_root_file` / `write_root_file` (с историей). Только basename в корне.
- **Служебные папки:** `awn-temp/` — все временные файлы (не создавай `temp/` в темах); `awn-scripts/` — общие скрипты (слот `scripts` — только для своей темы).

---

## 5. Чтение и запись контента

Один объект в слоте или по пути — **всегда** `read_content` / `write_content` / `list_content` (+ `create_content`, `content_exists`, `rename_content`, `move_content`, `delete_content`, `import_content_from_url`, `read_content_property` / `write_content_property`). Неизвестные параметры (и внутри `placement`) → ошибка `Unrecognized key(s)`.

```json
{ "agentId": "…", "placement": { "kind": "topic", "path": "…/manifest.md", "slot": "main", "ref": "zametka.md" }, "part": "body" }
{ "agentId": "…", "placement": { "kind": "channel", "path": "telegram", "slot": "inbox", "ref": "2026-10-16.md" } }
{ "agentId": "…", "placement": { "kind": "root", "path": "awn-repositories/site/src/index.html" } }
```

- `kind`: `topic` (legacy `page`) | `channel` | `media` | `database` | `repository` — нужны `path` + `slot` (+ `ref`); `root` — только `path` от корня workspace.
- `ref` — файл в слоте **с расширением**; без расширения повторяется с `.md` (`refResolved` в ответе).

**`read_content`** — `part`: `body` (default) | `properties` | `schema` | `meta` | `all`.
- Тело читается окном: по умолчанию 300 строк; `startLine` + `limitLines` (до 500). Номера строк — **файла с frontmatter**, те же, что в поиске.
- В ответе `hash`, `totalLines`, `hasMore`, `nextStartLine`. `full: true` — всё тело (нужно только перед `mode: replace`).
- Бинарь по `kind: root`: `format: "base64"` (картинки возвращаются блоком `image`), `offsetBytes`.

**`write_content`** — `part`: `body` | `properties` (patch — только изменённые ключи) | `schema`; бинарь — `data` (base64) + `mimeType`.

| `mode` (для body) | Что делает |
|-------------------|-----------|
| `patch` | `oldString` → `newString` (`""` удаляет). Совпадение одно, иначе ошибка или `replaceAll: true`. **Предпочтительно для правок** |
| `replace` (default) | Всё тело, frontmatter сохраняется |
| `append` / `prepend` | В конец / начало тела |
| `replace_lines` | `startLine`..`endLine` → `content`; **нужен `expectedHash`** |
| `insert` | `afterLine` / `beforeLine` + `content`; **нужен `expectedHash`** |

`expectedHash` — `hash` из последнего чтения/записи; файл изменился → `conflict`. Frontmatter через body не меняется — только `part=properties`.

| Что | Чем |
|-----|-----|
| Новый `.md` в слоте | `create_content` |
| Бинарник в слот | `write_content` + `data`; по URL — `import_content_from_url`. **Не** `create_content` |
| Переименовать / перенести / удалить | `rename_content` / `move_content` / `delete_content` |

---

## 6. Дополнительно

### 6.1 Куда что класть

| Что | Куда |
|-----|------|
| Решение, предпочтение, сущность (1–2 фразы) | `create_workspace_fact` |
| Термин и определение | `create_glossary_term` |
| Справочная статья с разделами | `create_reference_entry` |
| Событие (действие, жизнь, система) | `append_journal_entry` |
| Обсуждение темы | `append_discussion` |
| Комментарий к manifest или записи | `append_comment` |
| Входящее | `create_content({ slot: "inbox", status: "new" })` |
| Заметка на сессию / договорённость с человеком | `write_workspace_note` (`NOTE.md`) / `write_workspace_todo` (`TODO.md`) |
| Инструкции агента | `AGENTS.md` / `SKILL.md` через `write_root_file` |
| Уведомление в 🔔 | `notify_user` или журнал с `notify: true` |

Комментарии, дискуссии, факты, термины и справочник — **только** через свои tools, не через `write_content`.

### 6.2 Журнал, факты, глоссарий, справочник

- **Журнал** (`.agent-cms/journal/`, файл на ISO-неделю): `append_journal_entry`, `list_journal_entries`, `list_workspace_notifications`. События, не логи чатов.
- **Факты:** `create_workspace_fact({ body, kind, tags, supersedes? })`, `update_workspace_fact`, `list_workspace_facts`, `search_workspace_facts`. `kind`: `decision` · `preference` · `entity` · `procedure` · `open-question` · `note` · `fact`.
  - Писать: принято решение, выявлено предпочтение, новая сущность (URL, проект, контакт), просьба «сохрани как факт».
  - Не писать: каждую реплику, черновики, то, что уже есть в manifest. Норма — 0 за обычный чат, 1–3 за полезную сессию. Решение изменилось — новый факт с `supersedes`, не дубль.
- **Глоссарий:** `create_glossary_term`, `update_glossary_term`, `list_glossary_terms`, `search_glossary_terms`.
- **Справочник:** `create_reference_entry`, `update_reference_entry`, `list_reference_entries`, `search_reference_entries`.

### 6.3 Общение: дискуссии, комментарии, NOTE / TODO

- **Дискуссия темы:** `read_discussion` / `append_discussion`.
- **Комментарии:** `list_comments`, `append_comment`, `read_comment`, `update_comment`, `delete_comment`, `toggle_comment_reaction`. `path` — manifest темы; к записи — `mode` (`description` | `external` | `media`) + `file` (путь записи); ответ — `replyTo`.
- **NOTE.md / TODO.md** в корне workspace — общий блокнот и договорённости с человеком: `read_workspace_note` / `write_workspace_note`, `read_workspace_todo` / `write_workspace_todo` (по умолчанию append). Это не слоты `notes` / `todo-single`.

### 6.4 Крон, heartbeat, always-context

Флаги во frontmatter темы или записи (`write_topic_properties` / `write_content` с `part=properties`):

| Поле | Значение | Реестр |
|------|----------|--------|
| `awn-runtime-load-always: true` | Всегда в контексте агента | `list_workspace_always_context` |
| `awn-runtime-cron: true` + `awn-runtime-cron-schedule` | Задача по расписанию | `list_workspace_cron` |
| `awn-runtime-heartbeat: true` | Периодическая проверка | `list_workspace_heartbeat` |
| `awn-runtime-reminder: true` | В реестр «Напоминания» | — |
| `awn-runtime-commands: true` | В инструкции темы есть команды | — |

### 6.5 Зависимости

`dependencies.csv` в корне workspace — связи между записями. `read_dependencies` (колонки + строки), `write_dependencies` (весь CSV или `rows`). Колонки меняются только в настройках workspace. **Проверяй перед удалением или переносом.**

### 6.6 Sidecar

Метаданные к одному файлу: `photo.png` → `photo.sidecar.md` рядом. Не создаётся автоматически. `resolve_sidecar_path`, `read_sidecar`, `create_sidecar` (409, если уже есть), `write_sidecar`, `delete_sidecar` (исходный файл не трогает). Текст из картинок и PDF в sidecar — `run_workspace_ocr_index`.

---

## 7. Поиск и навигация

Оглавления, поиск и индексы — **отдельные tools, не `read_content`**.

| Задача | Tool |
|--------|------|
| Обзор workspace | `list_topics`; INDEX — `read_topic_index_toc`; все manifest — `read_workspace_map`; папки без manifest — `list_folder` |
| Обзор темы / слота | `read_content_index_toc` |
| Есть только путь к файлу | `resolve_workspace_path` (тема, слот, готовые аргументы) |
| Каталоги разделов | `read_channels_index_toc`, `read_databases_index_toc`, `read_repository_index_toc`, `read_media_library_index_toc` |
| Поиск (по умолчанию) | `search_workspace_hybrid`; несколько вопросов — `search_workspace_batch` |
| Вопрос по архиву с готовым контекстом | `ask_workspace` / `search_and_get_context` |
| Поиск в теме | `resolve_workspace_path` → `topic.folderPath` → `pathPrefix` |
| Точный текст / имена файлов | `search_workspace_content`; только смысловой — `search_workspace_semantic` |
| Backlinks / outbound | **только** `search_workspace_links` (hybrid их не видит) |
| Люди, даты, суммы, теги | `query_workspace_entities`, `list_workspace_entity_catalog` |
| Выборка по frontmatter | `query_workspace_storage({ dql })` |
| Готовые выборки | `list_workspace_registry_queries` → `run_workspace_registry_query({ id })` |
| Лента и аудит | `list_workspace_feed`, `list_recent_activity`, `audit_workspace_memory` |

Хиты поиска содержат `startLine` / `endLine` → `read_content({ placement: { kind: "root", path }, startLine, limitLines })`.

**Индексы:** после правки одного файла — `sync_workspace_index_file`; полный `rebuild_workspace_indexes` — только после массовых изменений. Отдельный слой: `rebuild_workspace_fulltext_index` / `_semantic_index` / `_storage_index` / `_link_index` (нужен до `search_workspace_links`) / `_entity_index`. Состояние — `get_workspace_index_status` / `get_workspace_index_monitor`.

**Оглавления** (`index.md` разделов) пересобираются парными `refresh_*`: … `refresh_databases_index_toc`, …

**Реестр сущностей** (`.agent-cms/settings/entity-registry.yml`, применяется после `rebuild_workspace_entity_index`): `merge_workspace_entity_alias` (синоним → каноническое имя), `reject_workspace_entity` (скрыть), `seed_workspace_entity` (добавить вручную), `upsert_workspace_entity_type` (тип и маппинг хэштегов), `get_workspace_entity_registry` / `put_workspace_entity_registry` (весь файл — только для крупных правок), `explain_workspace_entity_search` (отладка фильтра).

`find_by_id` = `resolve_workspace_id`. Лёгкая мета без тела — `read_content` с `part=meta` (legacy `get_content_meta`).

### DQL (для `query_workspace_storage`)

Строка DQL, **не SQL** (`sql` / `rawSql` → ошибка).

```
FROM path/prefix
WHERE status = "open" AND (priority > 2 OR tags CONTAINS "x") AND file.mtime LAST 7 DAYS
FLATTEN tags · GROUP BY field COUNT|SUM|MIN|MAX · SORT f DESC, g ASC · LIMIT n · SELECT a, b
WITH TEXT "…"   — hybrid-поиск только по отобранным путям
```

Поля: frontmatter + `file.name`, `file.folder`, `file.mtime`, `file.size`, `file.inlink-count`, `file.outlinks`, `file.inlinks`.

---

## 8. Файлы, веб, выполнение

| Что | Чем |
|-----|-----|
| Любой файл по пути (код, HTML, свободная память) | `read_content` / `write_content` с `kind: root`; обход — `list_folder` |
| Загрузка по полному пути | `upload_file` (base64) / `upload_file_from_url` |
| Текст из pdf / docx / xlsx / html | `extract_document_text` (URL или путь) |
| Поиск в вебе | `search_web`, `search_web_images` |
| Прочитать страницу | `read_web_page`; превью ссылки — `get_link_preview` |
| Картинка из веба в тему | `import_content_from_url({ slot: "media" })`, не `curl` |
| Скрипт workspace | `run_script` (`.py` / `.js` / `.sh`) |
| Команда | `exec_command` (args-массив) или `exec_shell` (строка с пайпами) |
| Файлообменник Shell | `read_file_hub_queue`, `add_file_to_file_hub`, `remove_file_from_file_hub`, `clear_file_hub_queue` |

**Показать картинку из заметки:** относительную ссылку `awn-storage/assets/pasted/x.png` дострой до полного пути `awn-topics/<тема>/awn-storage/…` (путь темы — из `resolve_workspace_path`), затем `read_content({ placement: { kind: "root", path }, format: "base64" })`.

**`batch_invoke`** — N вызовов одного tool (`tool` + `items[]` без `agentId`): read/list/search до 20, write до 10. Частичный успех возможен — проверяй каждый item.

---

## 9. Workspace, git, настройки

**Workspace (vault)** — отдельное хранилище со своим деревом. `list_workspaces`, `create_workspace`, `discover_workspaces` → `register_workspace` (подхватить папку с диска), `update_workspace`, `set_default_workspace`, `set_orchestrator_workspace`. Группы в сайдбаре: `list_workspace_groups`, `create_` / `update_` / `delete_workspace_group`, `assign_workspace_to_group`, `remove_workspace_from_group`, `reorder_workspace_groups`.

**Git самого workspace** (не клонов в `awn-repositories/`): `module_git_status` → `module_git_commit({ batchIds })` (партии `records`, `images`…), `module_git_diff`, `module_git_pull` / `module_git_push`, `module_git_remote`, `module_git_init`. Коммит и пуш — только по просьбе человека.

**Настройки** — 4 независимых scope (не сливаются): `platform` (MCP policy, индексы, always-context), `workspace` (`awn-id-*`, voice, колонки зависимостей), `integrations` (skills, MCP, git-партии), `user` (меню, сайдбар). `list_settings`, `read_setting`, `write_setting` (`sys-*`, `awn-id-*` — только чтение). Секреты в settings не хранятся — для темы есть `.env`.

**Типы:** `list_types({ filter })` → `get_type({ id })`, всегда по `id`. Свойства (`*_properties`) — значения frontmatter; `schema.yml` — описание полей формы (локальный override типа); `config.yml` — только UI.

**Платформа:** `test_mcp_connection`, `get_platform_info`, `get_platform_health`, `get_workspace_storage_info`, `list_platform_config` (где лежат конфиги). Документы в корне репозитория платформы (этот `SKILL.md`, `README.md`, `GLOBAL-*.md`): `list_platform_docs` → `read_platform_doc({ path })`; `write_platform_doc` — только по просьбе человека. `get_session_documentation` — README и справочник markdown-разметки preview.

---

## 10. Когда контекст переполняется

1. Зафиксируй итоги в `NOTE.md`, нужной записи или `append_discussion`.
2. Предложи человеку перезагрузить контекст и кратко резюмируй сделанное.
3. Не выдумывай правила и пути, которых уже не видишь, — перечитай `get_session_context` или нужный файл.
