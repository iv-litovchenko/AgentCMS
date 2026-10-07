# GLOBAL-DOC-MCP — карта Agent CMS для агента

Выдаётся через **`get_session_documentation`**; в always-context — только если включено в platform-настройке `always-context-*`.
Стиль ответов — `GLOBAL-RESPONSE-STYLE.md`. Общие правила — `GLOBAL-RULES.md`. Markdown preview — `GLOBAL-DOC-MARKDOWN.md` (opt-in).

## Оглавление

1. Старт
2. Модель данных
3. Навигация и поиск
4. Страницы
5. Слоты и контент
6. Инфоблоки (awn-databases)
7. Память и общение
8. Файлы и выполнение
9. Внешний мир
10. Настройки и типы
11. Правила поведения

---

## 1. Старт

Это **общее хранилище** человека и агента: одно дерево страниц, слотов и записей. Ты работаешь через MCP, человек — через UI; оба видят одно и то же.

**Правило:** работать с CMS **только через MCP tools**. Запрещены сторонние tools, прямой `curl` к API, прямое чтение/запись файлов workspace в обход MCP. Shell и команды — через `run_script` / `exec_command` / `exec_shell`.

### Выбор хранилища (`agentId`)

Синонимы одного поля: workspace · agent · vault · хранилище → **`agentId`**. MCP подключается **без** фиксированного хранилища. Каждый чат:

1. `list_workspaces` (alias `list_vaults`) — список id и имён.
2. `get_session_context({ agentId })` — контекст workspace (уже содержит `topicRegistry`, `alwaysContext`, `platformSettings`, `workspaceSettings`).
3. При необходимости `get_session_documentation({ agentId })` и `get_user_active_context_now({ agentId })`.
4. **Все** workspace-tools — с тем же `agentId`.

Селектор «Хранилище (агент)» в Shell UI **не** меняет MCP в Claude Desktop — работает только явный `agentId`.

### Перезагрузка контекста

Отдельного tool нет. «Перезагрузи контекст» = снова `get_session_context({ agentId })` + при необходимости `list_workspace_always_context`, `get_page_map`, `get_content_index` по активной теме.

---

## 2. Модель данных

### Словарь: инфоблок ↔ `database`

| В разговоре / UI | В репозитории | В MCP |
|------------------|---------------|-------|
| **инфоблок**, «Накопители информации» | `awn-databases/`, типы `awn.database.*` | `database_frame_*`, `database_element_*` |
| каркас store (group / collection / single) | `awn.database.frame.*` | `database_frame_*` |
| запись / раздел внутри store | `awn.database.element.*` | `database_element_*` |

Устаревшие синонимы: `infoblock`, `awn.infoblock.*`, `awn.data.*`, MCP `iblock_*` — алиасы на канон выше.

### Page · Slot · Content

| Сущность | Что это | Ключ MCP |
|----------|---------|----------|
| **Page** | Узел дерева меню (`manifest.md`) | `path` → `…/manifest.md` |
| **Slot** | Место хранения на странице | `slot` → `main`, `inbox`, `media`… |
| **Content** | Файл внутри слота | `path` + `slot` + `ref` |

**Page ≠ Content.** Слот — не файл; контент живёт *в* слоте.

| Ключ | Значение | Пример |
|------|----------|--------|
| `path` | Путь к `manifest.md` страницы | `awn-container/finansy/manifest.md` |
| `slot` | MCP-ключ слота = имя папки | `notes`, `scripts`, `discussion` |
| `ref` | Путь файла **внутри** слота | `vstrecha.md`, `subdir/vstrecha.md` |

Устаревшие ключи слотов (работают, но не используй): `note` → `notes`, `script` → `scripts`, `thread` / `dialogs` → `discussion`.

Конвенция пути на диске: `{область}/{тема}/awn-storage/{слот}/{файл}`.

### Дерево агента

| Папка | Зачем |
|-------|-------|
| `awn-agent-kit/` | Служебные темы агента (persona, rules, voice…) |
| `awn-shared/` | Общие ресурсы между темами |
| `awn-container/` | Пользовательский контент — области и темы |
| `awn-databases/` | Инфоблоки (вне дерева страниц) |
| корень | `manifest.md` (ws), системные файлы (`AGENTS.md`, `SKILL.md`, `NOTE.md`, `TODO.md`…), служебные папки (`awn-temp/`, `awn-scripts/`, `awn-dialogs/`, `awn-recycle/`, `awn-media-cloud/`), runtime `.agent-cms/` |

### Глобальный ID — `awn-id`

У каждой новой записи (manifest, content, sidecar, comment…) в frontmatter есть `awn-id` — число из счётчика в `.agent-cms/settings/workspace.yml`. Один id у нескольких записей допустим.

| Tool | Когда |
|------|-------|
| `resolve_workspace_id({ id })` | Путь записи по числу |
| `assign_workspace_id({ path })` | Выдать id старой записи без `awn-id` |
| `query_workspace_storage({ where: [{ field: "awn-id", eq: N }] })` | Фильтр по id (и любым полям frontmatter) |
| `generate_workspace_slug({ text, preset? })` | Slug по правилам `create_page` / `create_content`, без записи. `preset`: `page` · `content` · `store` · `database` · `repository` · `catalog` · `filename` |

### Страницы и контент vs инфоблоки — когда что

| | **Page · Slot · Content** | **awn-databases** |
|---|---------------------------|-------------------|
| Данные | Неструктурированные и полуструктурированные | Структурированные, единая схема |
| Форма | Markdown, медиа, код, произвольные папки | `{id}.md`, CSV, общий `schema.yml` |
| Примеры | Протокол встречи, README темы, заметка, медиафайл | Справочники, `taxonomies/`, задачи с полями, расходы (дата, сумма, категория) |

**Правило:** у всех элементов одинаковый набор полей и нужны запросы «по колонке» → **awn-databases**. Важнее свободный текст и связи между файлами → **Page · Slot · Content**. Не смешивать без причины.

---

## 3. Навигация и поиск

### Где пользователь — `get_user_active_context_now`

`focus.entity`: `page` | `slot` | `content` | `system` | `browse` | … В ответе готовые `path` / `slot` / `ref` — подставляй в `read_*` / `write_*`, не угадывай пути.

### Произвольный путь — `resolve_workspace_path({ path })`

Дали только путь — **не угадывай** тему/область. Сервер поднимается по папкам и собирает цепочку `manifest.md`.

| Поле ответа | Зачем |
|-------------|-------|
| `breadcrumbs[]` | Сверху вниз: ws → area → topic → slot → папки → файл; у каждой `kind`, `label`, `path` (+ `manifestPath` / `slot` / `ref`), у последней `current: true` |
| `breadcrumbsLabel` | Одна строка `WS › Area › Topic › Слот › file.md` |
| `ancestors[]` / `ancestorsTopDown[]` | Только manifest-страницы снизу вверх / сверху вниз |
| `topic` / `area` / `workspace` | Быстрые ссылки (`manifestPath`, `title`, `folderPath`) |
| `slot` | Если путь под `awn-storage/`: `mcpKey`, `ref` |
| `mcp` | Готовые `{ path, slot?, ref? }` для `read_content_*` |

Путь в `awn-databases/` — это инфоблок, не Page. Папка без manifest — свободная память (`ancestors` пуст).

### Реестры и оглавления

Сначала реестр → потом точечно `read_page_*` / `read_content_*`.

| Задача | Tool |
|--------|------|
| Все узлы workspace (manifest + папки без manifest), без body | `get_page_map` |
| Компактное оглавление страниц (path, type, title, description) | `get_workspace_page_index` → обновить `INDEX.md` в корне: `refresh_workspace_page_index` |
| Что есть в теме, не читая тексты (внешние слоты) | `get_content_index(path)`; один слот — `get_content_index(path, slot)` |
| Обновить `index.md` темы или слота | `refresh_content_index(path[, slot])` |
| properties / tags / status записей перед правкой | `get_content_map(path)` |
| Что в always-context | `list_workspace_always_context` |
| Темы с cron / heartbeat | `list_workspace_cron` / `list_workspace_heartbeat` |

`indexFile.exists: false` — оглавление сгенерировано на лету из текущих файлов.

Флаги в frontmatter темы/записи: `awn-runtime-load-always` (полный текст в always-context), `awn-runtime-cron` + `awn-runtime-cron-schedule`, `awn-runtime-heartbeat`.

### Поиск по workspace

| Задача | Tool |
|--------|------|
| Один вопрос (смысл + слова + фильтры полей) | **`search_workspace_hybrid`** — по умолчанию |
| Несколько вопросов за раз (до 20) | `search_workspace_batch({ queries })` |
| Точные слова | `search_workspace_content` |
| По смыслу | `search_workspace_semantic` |
| По полям frontmatter (SQL-like) | `query_workspace_storage` |
| Q&A / «что мы решили» по архиву | `ask_workspace` / `search_and_get_context` |
| Граф ссылок: кто ссылается / куда ведёт / соседи | `search_workspace_links({ path, mode: "backlinks" \| "outbound" \| "neighbors", depth? })` — **не** входит в hybrid |
| Факты / термины | `search_workspace_facts` / `search_glossary_terms` (раздел 7) |

**Ограничение по теме — `pathPrefix`** (в UI — иконка ◎ у поиска). Поддерживают `search_workspace_hybrid`, `search_workspace_batch`, `search_workspace_content`, `search_workspace_semantic`, `search_workspace_links`, `query_workspace_storage`. Пусто = весь workspace.

```json
resolve_workspace_path({ "path": "oblast/tema/manifest.md" })  // → topic.folderPath
search_workspace_content({ "query": "RAG", "pathPrefix": "oblast/tema", "scope": "all", "limit": 20 })
```

### Индексы

Цепочка: `run_workspace_ocr_index` → fulltext → semantic → поля → связи. Всё разом: `rebuild_workspace_indexes`. По отдельности: `rebuild_workspace_fulltext_index`, `rebuild_workspace_semantic_index`, `rebuild_workspace_storage_index`, `rebuild_workspace_link_index`. Статус: `get_workspace_index_status` / `get_workspace_index_monitor`.

---

## 4. Страницы

| id | Имя | Зачем |
|----|-----|-------|
| `awn.page.ws` | Workspace | `manifest.md` в корне |
| `awn.page.area` | Область | Раздел меню (legacy; новые служебные — `awn.page.section.*`) |
| `awn.page.topic` | Тема | Рабочая страница со слотами |
| `awn.page.section.*` | Секция | `agent-kit`, `shared`, `container` |

### Бриф темы — тело `manifest.md`

Тело manifest (после frontmatter) — **бриф**: назначение и границы темы, инструкции, договорённости, что класть в слоты. Это **не** память: записи — в слотах, события — в журнале, разговор — в `discussion/`. Frontmatter (`awn-name`, `awn-description`…) — краткая мета для меню и реестров.

### Tools

- создать / переименовать / сдвинуть / удалить: `create_page`, `rename_page`, `move_page`, `delete_page`
- `create_page`: `parentPath` обычно внутри `awn-container/`; `type`: `awn.page.area` (`area` / `folder`) или `awn.page.topic` (`topic` / `file`); `displayName` / `title` → `awn-name`; `slug` / `name` → папка; `awnType` — нестандартный подтип
- тело: `read_page_body` / `write_page_body` (frontmatter не трогает)
- проверки / мета: `page_exists`, `get_page_meta`; env: `read_page_env` / `write_page_env`
- типы: `list_types({ filter: "create-page" })` → `get_type({ id: "awn.page.topic" })`

### Свойства — patch

`write_*_properties` — **merge**: шли только изменённые ключи, остальное берётся с диска. Auto-поля (`awn-update`, `awn-version`, `awn-create`) дописывает сервер.

| Сущность | Весь frontmatter | Одно поле |
|----------|------------------|-----------|
| Страница | `read_page_properties` / `write_page_properties` | `read_page_property` / `write_page_property` |
| Контент | `read_content_properties` / `write_content_properties` | `read_content_property` / `write_content_property` |
| Frame инфоблока | `database_frame_read_properties` / `database_frame_write_properties` | `database_frame_read_property` / `database_frame_write_property` |
| Элемент инфоблока | `database_element_read_properties` / `database_element_write_properties` | `database_element_read_property` / `database_element_write_property` |

### Схемы

Свойства — **значения** frontmatter; схема — **описание** полей формы; тип (`get_type`) — база из awn-system, `schema.yml` — локальный override.

| Что | Файл | Tools |
|-----|------|-------|
| Поля страницы / слотов | `schema.yml` | `read_page_schema` / `write_page_schema` |
| UI / настройки страницы (не поля) | `config.yml` | `read_page_config` / `write_page_config` |
| Поля записей инфоблока | `schema.yml` в store | `database_frame_read_schema` / `database_frame_write_schema` |
| Канон типа | awn-system | `get_type(id)` |

- `read_page_schema` — по умолчанию `mode=layers` (слои `workspace` / `area` / `topic`, только непустые). `mode=full` — только при необходимости.
- `write_page_schema` — YAML только с нужным блоком.
- `database_frame_write_schema` — **полный** YAML: сначала прочитай, иначе потеряешь поля.

---

## 5. Слоты и контент

`list_page_slots` отдаёт `driver`: **`external`** (папка, много файлов) или **`internal`** (один файл). Типы слотов: `awn-system/types/slots/` (`multi-file/`, `single-file/`), резолвятся по `id`.

### Многофайловые (external) — `path` + `slot` + `ref`

| slot | Зачем |
|------|-------|
| `main` | Основная память |
| `inbox` | Входящие |
| `notes` | Заметки |
| `references` | Источники / ссылки |
| `artefacts` | Артефакты / черновики |
| `media` | Медиатека темы (самостоятельные файлы) |
| `assets` | Ресурсы **записей** (preview, pasted, attachments, materials) |
| `repository` | Репозитории / код |
| `scripts` | Скрипты темы |
| `comments` | Комментарии — только `append_comment` и др. (раздел 7) |
| `discussion` | Дискуссия темы — только `read_discussion` / `append_discussion` |

### Однофайловые (internal) — `path` + `slot`, **без `ref`**

| slot | Файл |
|------|------|
| `main-single` | `main.md` |
| `main-single-csv` | `main.csv` (тип `awn.content.record-csv`) |
| `todo-single` | `todo.md` |

Системный `history` руками не трогать.

### Гибкий слот (`awn-slots-flexible: true`)

Тема без типовых слотов: произвольная структура папок в `awn-storage/`. Признак: `slotsFlexible: true` в `get_page_map` / `get_content_index` / `get_content_map` (legacy: `slotsDisabled`, `awn-slots-disabled`).

- писать **только** `create_content({ path, slot: "main", parent?: "подпапка" })` — файлы ложатся в `awn-storage/`;
- `slot: inbox|media|references|…` вернёт ошибку;
- internal-слоты работают как обычно.

### Контент

| id | Что |
|----|-----|
| `awn.content.record` | Обычный `.md` в слоте |
| `awn.content.category` | Папка для группировки записей |

- создать: `create_content` (inbox: `slot: inbox`, `status: new`)
- тело: `read_content_body` / `write_content_body` (frontmatter не трогает)
- проверки / мета: `content_exists`, `get_content_meta`
- переименовать / перенести / удалить: `rename_content`, `move_content`, `delete_content`
- схема контента: `read_content_schema` / `write_content_schema`
- типы: `list_types({ filter: "slot-content" })` → `get_type({ id: "awn.content.record" })`

### Файлы и бинарники

- в слот по URL: `import_content_from_url({ path, slot, url })`
- по полному пути: `upload_file({ path, data: "<base64>" })` / `upload_file_from_url`

| Цель | Path |
|------|------|
| Превью темы (`awn-preview`) | `…/awn-storage/assets/preview/shot.png` |
| Картинка в тексте | `…/awn-storage/assets/pasted/shot.png` → `![…](awn-storage/assets/pasted/…)` |
| Вложение записи (`awn-attachments`) | `…/awn-storage/assets/attachments/doc.pdf` |
| Медиатека темы | `…/awn-storage/media/photo.png` |

**`media` ≠ `assets`:** `media` — самостоятельные файлы темы; `assets` — ресурсы записей. Картинка в текст или превью → `assets`.

### Доп. материалы записи — `assets/materials/{awn-id}/`

Личная папка **одной** записи (черновики, схемы, приложения). Связь 1:1 по `awn-id`, не по slug — переименование записи папку не переносит. Одна запись → не больше одной папки.

```
awn-storage/
  main/razdel/zapis.md          ← владелец (awn-id: 42)
  assets/materials/42/          ← его материалы
```

Legacy (читаются, новые не создавать): `awn-materials-{slug}`, `awn-parts-{slug}`, `parts-{slug}` рядом с записью.

Как найти: `get_content_map(path)` / `get_content_index(path)` → у записи `hasRecordMaterials: true`, `recordMaterialsFolderRef`; у файлов папки — `parentRecordRef`, kind `record-materials-folder` / `record-materials` / `record-materials-file`. Текст — `read_content_body` по ref из map, бинарник — `read_file` по `workspacePath`. Новые файлы к записи — в `assets/materials/{awn-id}/`, не в корень раздела.

### Sidecar — мета к файлу

`photo.png` → `photo.sidecar.md` в той же папке, тип `awn.annotation.sidecar`. **Не создаётся автоматически.**

| Tool | Зачем |
|------|-------|
| `resolve_sidecar_path` | Куда ляжет: `sourcePath` **или** `path` + `slot` + `file` |
| `read_sidecar` | Прочитать (`exists: false`, если нет) |
| `create_sidecar` | Создать (409, если есть) |
| `write_sidecar` | Обновить (404, если нет) |
| `delete_sidecar` | Удалить (исходник не трогает) |

Не путать с `{folder}/sidecar.md` — описанием папки свободной памяти (ниже).

### Свободная память — папки без `manifest.md`

В `get_page_map`: `kind: "folder"`, `hasManifest: false`, `adoptable: true`. Работа — `list_folder` / `read_file` / `upload_file`, не `read_page_*`. Описание папки — необязательный `{folder}/sidecar.md` (`awn-name`, `awn-description`) через `read_file` / `write_file`. Превратить в тему — `create_page`.

---

## 6. Инфоблоки (awn-databases)

Структурированные данные со схемой, вне дерева страниц. В UI — «Накопители информации (инфоблоки)». В меню и `database_frame_list` — только frames.

| Слой | MCP | Типы | Что |
|------|-----|------|-----|
| Каркас (frame) | `database_frame_*` | `awn.database.frame.*` | group / collection / single в `awn-databases/{slug}/` |
| Элементы | `database_element_*` | `awn.database.element.*` | записи и разделы в `awn-storage/data/` |

**Типовой flow:** `database_frame_list` → `database_frame_get({ store })` → `database_element_list({ store })` → `database_element_read_properties` / `database_element_write_properties`.

### Тип коллекции (`awn-collection-type` в manifest frame)

| Значение | Хранение | Тип записи | Когда |
|----------|----------|------------|-------|
| `md` | `{id}.md` | `awn.database.element.record` | Сущности с полями |
| `md-lite` | `{id}.md` | `…record-lite` | Простые списки (тексты, слоганы) |
| `csv` | `main.csv` | `…record-csv` | Табличный реестр |
| `csv-files` | `{id}.csv` | `…record-csv` | Таблица на запись |
| `files` | файлы в `data/` | `…record` | Загрузка файлов |

В `schema.yml`: `awn_schema.record.extends: awn.database.element.record-lite` (или `record-csv`).

**Имена полей:** `awn-*` — только системные поля платформы. Пользовательские поля и колонки — **без** префикса (`amount`, `label`, `status`…). Не дублируй системные ключи в `schema.yml`.

### Tools

- frame: `database_frame_create`, `database_frame_get` (бриф — `manifestMarkdown`), `database_frame_rename`, `database_frame_delete`
- оглавление frames: `database_frame_read_index` / `database_frame_refresh_index` → `awn-databases/index.md`
- доп. поля instance: `database_frame_read_schema` / `database_frame_write_schema`
- элемент: `database_element_create({ store, name, slug, isSection? })`, `database_element_rename`, `database_element_delete`
- раздел = папка с `manifest.md` в `awn-storage/data/{section}/`, тип `awn.database.element.category`
- тело записи: `database_element_read_body` / `database_element_write_body`
- типы: `list_types({ filter: "data-containers" | "data-elements" })` → `get_type({ id })`

---

## 7. Память и общение

### Куда что класть

| Что | Где | Tools |
|-----|-----|-------|
| Короткая выжимка: решение, предпочтение, сущность | `awn-databases/contents/facts/` | `create_workspace_fact` |
| Термин и определение | `awn-databases/contents/glossary/` | `create_glossary_term` |
| Событие (жизнь, действие, UI, система) | `.agent-cms/journal/` | `append_journal_entry` |
| Обсуждение одной темы | слот `discussion/` | `append_discussion` |
| Комментарий к manifest / записи | слот `comments/` | `append_comment` |
| Полный Q/A Shell/Voice | `awn-dialogs/` | пишется клиентами сам; не в semantic index |
| Входящие | слот `inbox/` | `create_content` (`slot: inbox`, `status: new`); разбор — `list_inbox` → `triage_inbox_item` (`to-content`, `mark-done`, `set-status`) |
| Общая доска сессии / задачи | `NOTE.md` / `TODO.md` в корне | `write_workspace_note` / `write_workspace_todo` |
| Уведомление человеку в 🔔 | — | `notify_user` |

### Банк фактов

Короткие (1–2 фразы) выжимки из любых чатов (Cursor, Claude Desktop, Voice). Коллекция md-lite, индексируется.

| Tool | Зачем |
|------|-------|
| `create_workspace_fact` | Создать |
| `update_workspace_fact` | Обновить по `record` |
| `list_workspace_facts({ limit?, kind? })` | Последние |
| `search_workspace_facts({ query, kind?, limit? })` | Найти по вопросу |

`retain_workspace_fact` / `recall_workspace_facts` — deprecated. Legacy `awn-facts/` мигрирует в коллекцию автоматически.

**Писать:** принято решение; выявлено предпочтение; зафиксирована сущность (URL API, проект, контакт); важный итог внешнего чата. **Не писать:** каждую реплику, черновики, то, что уже есть в manifest темы. Норма: 0 фактов за обычный чат, 1–3 за полезную сессию. Решение изменилось — новый факт с `supersedes`, а не почти одинаковый дубль.

| Параметр | Значения |
|----------|----------|
| `body` (обяз.) | 1–2 предложения |
| `kind` | `decision` · `preference` · `entity` · `procedure` · `open-question` · `note` · `fact` (default) |
| `source` | `claude-desktop` · `cursor` · `voice` · `shell` · `codex` · `manual` · `other` |
| `tags`, `name` | Массив или строка через запятую; короткий заголовок |
| `sourceRef` | Путь к evidence (`awn-dialogs/…`) |
| `supersedes` | Путь старого факта, который заменяется |

```json
create_workspace_fact({ "agentId": "…", "body": "Cron только через awn-runtime-heartbeat, не в always-context.", "kind": "decision", "source": "cursor", "tags": ["runtime", "cron"] })
search_workspace_facts({ "agentId": "…", "query": "cron heartbeat", "kind": "decision", "limit": 8 })
```

Ответ поиска — cited hits (path + snippet); ответ пользователю формируешь ты. Широкий поиск не только по фактам — `ask_workspace` / `search_workspace_hybrid`.

### Глоссарий

`create_glossary_term`, `update_glossary_term`, `list_glossary_terms`, `search_glossary_terms`.

### Журнал workspace

Единый журнал событий; один файл на ISO-неделю (`2026-W38.md`), индексируется. `log.md` в теме не используется.

- `append_journal_entry` — type: `life` / `action` / `ui` / `system`; `notify: true` → попадёт в 🔔
- `list_journal_entries({ topic })` — по теме
- `list_workspace_notifications({ since, limit, notifyOnly })` — лента 🔔
- `list_recent_activity({ since?, limit? })` — лента изменений; `list_workspace_feed` — единая лента

### Дискуссия и комментарии

- дискуссия темы: `read_discussion` / `append_discussion`
- комментарии: `list_comments`, `read_comment`, `append_comment`, `update_comment`, `delete_comment`, `toggle_comment_reaction`

Привязка комментария: `path` (manifest) всегда; для записи — `mode` (`description`, `external`, `media`…) + `file`.

```json
append_comment({ "path": "…/manifest.md", "mode": "external", "file": "memory/razdel/zapis.md", "body": "Уточнить формулировку", "replyTo": "2026-08-08_14-00-00-123.md" })
delete_comment({ "path": "…/manifest.md", "commentId": "2026-08-08_14-00-00-123.md", "confirm": true })
```

Файлы: `awn-storage/comments/{target}/{timestamp}.md`, тип `awn.annotation.comment` + `awn-id`.

### NOTE.md / TODO.md и системные файлы

- `NOTE.md` / `TODO.md` — `read_workspace_note` / `write_workspace_note`, `read_workspace_todo` / `write_workspace_todo`. Запись по умолчанию `mode=append`; `mode=replace` — полная замена; с history. Не путать со слотами `notes/` / `todo-single` в теме.
- `AGENTS.md`, `SKILL.md`, `README.md` — `list_system_files` → `read_file` / `write_file` (с history). Попадают в always-context, если есть.
- Зависимости workspace (`dependencies.csv`) — `read_dependencies` / `write_dependencies`.
- Аудит устаревшей памяти — `audit_workspace_memory`.

---

## 8. Файлы и выполнение

### Работа по пути

Путь — от корня workspace (`awn-container/tema/awn-storage/media/photo.png`, `AGENTS.md`).

| Tool | Зачем |
|------|-------|
| `read_file` | Текст → content; бинарник → previewUrl |
| `write_file` / `patch_file` | Записать / поправить текстовый файл |
| `upload_file` / `upload_file_from_url` | Загрузить base64 / скачать URL |
| `list_folder` | Содержимое папки (`depth`) |

**Когда path-based:** код, HTML, бинарники, media, свободная память, системные файлы. Для `.md`-записей в слотах — `create_content` / `write_content_body`; для manifest — `write_page_body`.

### Служебные папки корня

- `awn-temp/` — все временные файлы (подпапки `incoming/`, `scratch/`, `exports/`…). Не создавай `awn-storage/temp/` в темах.
- `awn-scripts/` — общие скрипты workspace (обслуживание, cron, миграции). Слот `scripts/` — только для своей темы.
- `awn-recycle/` — корзина (пока просто папка).

### Пакетные вызовы — `batch_invoke`

Один round-trip для N вызовов **одного** tool. Не для разных tools, не для одного объекта, не для exec.

```json
{ "agentId": "…", "tool": "read_file", "parallel": true,
  "items": [{ "path": "…/main/a.md" }, { "path": "…/main/b.md" }] }
```

- `items[]` — аргументы как для одиночного вызова, **без** `agentId`.
- `parallel: false` — строго по порядку (create/write с зависимостями).
- Ответ — массив `ok` / `result` / `error` по каждому item; частичный успех возможен.
- Лимиты: read/list/search — до 20; write/create, move/rename/delete — до 10; exec — нельзя (`batch-deny-exec`). В `mcp-mode=readonly` — только read/list/search.
- Для нескольких поисковых запросов есть отдельный `search_workspace_batch`.

### Выполнение команд

| Tool | Зачем |
|------|-------|
| `run_script` | Файл из workspace: `script`, `args?`, `cwd?`, `topicPath?`, `interpreter?` |
| `exec_command` | `command` + `args[]` без shell |
| `exec_shell` | Shell-строка (pipes, `&&`) |

`cwd` по умолчанию — папка темы из `topicPath` или корень workspace. Ответ: `exitCode`, `stdout`, `stderr`, `durationMs`; вывод до ~256 KB, timeout до 10 мин.

**Подтверждения:** при `confirm-exec: true` exec-tools требуют `confirm: true`, при `confirm-delete: true` — `delete_*`. Передавай `confirm: true` только после явного согласия человека.

### Медиа в облако (`awn-media-cloud/`)

Локальная выгрузка тяжёлых файлов: в теме остаётся симлинк с исходным именем, байты — в `awn-media-cloud/_blobs/`, реестр — `awn-media-cloud/registry.json`. Sidecar остаётся рядом с симлинком. Папка не индексируется.

- `list_media_cloud_providers` — провайдеры и `defaultProvider`
- `get_media_cloud_file_status({ path, file, provider?, scope? })` — синхронизирован ли файл
- `sync_media_cloud_file({ path, file, provider? })` — включить/выключить выгрузку
- `repair_media_cloud_links` — починить симлинки

`path` — manifest темы, `file` — **полный** workspace-path. Загрузка на API Google/Яндекс не реализована; `*_zzz` — заглушки, не вызывать.

---

## 9. Внешний мир

| Tool | Зачем |
|------|-------|
| `search_web` | `{ query, limit?, lang?, country?, gl?, safe? }` |
| `search_web_images` | То же + `size?`, `type?` (только в режиме `api`) |
| `read_web_page` | Один URL как текст: `{ url, maxChars?, maxBytes? }`; private URL блокируются |
| `get_link_preview` | Карточка ссылки: title, description, imageUrl, siteName |
| `extract_document_text` | Текст из pdf, docx, xlsx, html, txt, md, json: `{ url? \| path?, … }` |

По умолчанию прямой Google с fallback на DuckDuckGo (`fallbackFrom: "google-direct"`); captcha → 429. Найденную картинку в тему — `import_content_from_url({ path, slot: "media", url })`.

**Идентичность:** `get_agent_identity` (`awn-agent-kit/agent/`), `get_user_identity` (`awn-agent-kit/user/`) → `profile`, `main.body`, `text`.

---

## 10. Настройки и типы

### Настройки — 4 независимых scope (не merge)

| Scope | Файл | Что там |
|-------|------|---------|
| `platform` (alias `global`) | корень репо `.agent-cms-global/settings/platform.yml` | MCP policy (`mcp-mode`, `batch-*`, `confirm-*`), `index-*-enabled`, `always-context-*`, `default-locale`, `maintenance-mode` |
| `workspace` (alias `local`) | `.agent-cms/settings/workspace.yml` | `awn-id-*`, Voice (`voice-*`), `dependencies-columns` |
| `integrations` (alias `plugins`) | `.agent-cms/settings/integrations.yml` | skills / MCP / плагины (stub) |
| `user` | `.agent-cms/settings/user.yml` | `tree-*`, `sidebar-width`, `pinned-branch-path` |

Tools: `list_settings({ scope? })`, `read_setting({ scope, key })`, `write_setting({ scope, key, value })`.

- MCP policy — только `platform`; остальные scope на неё не влияют.
- `readonly`-ключи (`sys-*`, `awn-id-*`) — только чтение. `{NOT WORK}` — сохраняются, но без эффекта.
- Секреты — корневой `.env`, не yaml. Полный реестр полей — `SETTINGS_CHECK.md`.
- `schema.yml` / `config.yml` / `.env` тем и инфоблоков — это не settings: `read_page_*` / `database_frame_*`.

### Типы (awn-system)

`list_types({ domain?, kind?, filter? })` → `get_type({ id })`. Всегда по **`id`**, не по пути.

| filter | Пример id |
|--------|-----------|
| `create-page` | `awn.page.topic` |
| `slot-content` | `awn.content.record`, `awn.content.record-csv` |
| `data-containers` | `awn.database.frame.collection` |
| `data-elements` | `awn.database.element.record`, `…record-lite`, `…record-csv` |

`read_page_schema` / `database_frame_read_schema` — локальные override, не справочник типов.

---

## 11. Правила поведения

### Антипаттерны

1. Не писать файлы в корень темы — только через слот или `upload_file` (кроме гибкого слота).
2. Не путать page tools (`*_page_*`) и content tools (`*_content_*`).
3. Типы — по `id`, пути не угадывать.
4. Табличный реестр — в инфоблок, не в `main/`; заметку без общей схемы — не в инфоблок.
5. Только канонические ключи слотов: `notes`, `scripts`, `discussion`.
6. В `comments/`, `discussion/`, `inbox/` не писать через `create_content` / `write_file` в обход их tools.
7. Бинарники — `upload_file`, не `create_content`.
8. Факты — через `create_workspace_fact`, не `write_file` в коллекцию.
9. `read_page_schema` — без `mode=full` без нужды.

### Неясно, куда положить материал

Спроси человека или предложи вариант с обоснованием:

- инструкция агента → `AGENTS.md` / `SKILL.md`;
- заметка на сессию → `NOTE.md`; задача → `TODO.md`;
- материал по теме → `create_content` в подходящий слот;
- обсуждение → `append_discussion` / `append_comment`.

Лучше одна реплика с вопросом, чем файл не в том месте. Карта для выбора: `get_page_map` → `get_content_map(path)`.

### Контекст переполняется

1. Предложи человеку обновить контекст (раздел 1) и кратко резюмируй сделанное.
2. Перед этим зафиксируй итоги в `NOTE.md`, нужной записи или `append_discussion`.
3. Не выдумывай правила и пути, которых уже не видишь, — перечитай `get_session_context` / нужный файл или уточни у человека.
