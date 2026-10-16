# GLOBAL-DOC-MCP — карта Agent CMS для агента

Выдаётся через `get_session_documentation`. Описания и параметры tools — в самом MCP; здесь только модель данных, договорённости и то, чего нет в схемах.
Стиль ответов — `GLOBAL-RESPONSE-STYLE.md`. Общие правила — `GLOBAL-RULES.md`. Markdown preview — `GLOBAL-DOC-MARKDOWN.md`.

## Оглавление

1. Старт
2. Модель данных
3. Навигация и поиск
4. Страницы
5. Слоты и контент
6. Инфоблоки (awn-databases)
7. Память и общение
8. Файлы и выполнение
9. Настройки и типы
10. Правила поведения

---

## 1. Старт

Это **общее хранилище** человека и агента: ты работаешь через MCP, человек — через UI; оба видят одно и то же.

**Только MCP tools.** Запрещены сторонние tools, `curl` к API, чтение/запись файлов workspace в обход MCP. Команды — через `run_script` / `exec_command` / `exec_shell`.

**Каждый чат:** `list_workspaces` → `get_session_context({ agentId })` → дальше **все** tools с тем же `agentId` (синонимы: workspace · agent · vault · хранилище). Селектор хранилища в Shell UI на MCP не влияет.

**Устаревшие алиасы не используй:** `read_dialogs` / `append_dialog` → `read_discussion` / `append_discussion`; `list_system_files` / `read_system_file` / `write_system_file` → `list_root_files` / `read_root_file` / `write_root_file`; `list_vaults` → `list_workspaces`; `*_zzz` — заглушки. (`page_*` / `get_page_*` сняты — только `topic_*` / `get_topic_*`.) **Deprecated maps:** `get_topic_map` → `list_topics` + `read_topic_index_toc` + `list_folder`; `get_content_map` → `read_content_index_toc` + `read_content` (`part=properties|meta`).

**«Перезагрузи контекст»** = снова `get_session_context` + при необходимости `list_workspace_always_context`, `read_topic_index_toc`, `read_content_index_toc` по активной теме.

---

## 2. Модель данных

### Page · Slot · Content · Placement

| Сущность | Что это | Ключ MCP |
|----------|---------|----------|
| **Placement** | Где лежит контент | `placement.kind`: `topic` \| `channel` \| `media` \| `database` \| `repository` \| `root` + `path` (slug без префикса hub) (+ `slot` + `ref` кроме root) |
| **Page (topic)** | Тема/область в дереве (`manifest.md`) | `kind: topic`, `path` → папка/slug темы (без `manifest.md`) |
| **Channel** | Карточка ingress | `kind: channel`, `path` → slug (`telegram`, не `awn-channels/…`); слоты: **`inbox`**, **`outbox`**, **`files`**, **`assets`**; каталог: `read_channels_index_toc` |
| **Database** | Инфоблок `awn-databases/{slug}/` | `kind: database`, `path` → slug; слот **`data`**; каркас: **`list_databases`** / **`get_database`** … (legacy `database_frame_*`) |
| **Media hub** | Карточка `awn-media/{slug}/` | `kind: media`, `path` → slug |
| **Repository** | Карточка `awn-repositories/{slug}/` | `kind: repository`, `path` → slug (`group/repo`) |
| **Slot** | Папка под `awn-storage/` | `slot` → `inbox`, `media`, `files`… |
| **Content** | Файл в слоте | `ref` — путь внутри слота |
| **Root file** | Произвольный путь в workspace | `kind: root`, `path` — `AGENTS.md`, `folder/note.md` (без slot) |

**Работа с контентом — `read_content` / `write_content` / `list_content` / `list_slots` с `placement`.** У этих tools (и у `create_content`, `content_exists`, `rename_content`, `move_content`, `delete_content`, `import_content_from_url`, `*_content_property`) схема параметров публикуется в MCP; неизвестные параметры (в т.ч. внутри `placement`) отклоняются ошибкой `Unrecognized key(s)`. Формат:

```json
{ "agentId": "…", "placement": { "kind": "topic", "path": "…/manifest.md", "slot": "main", "ref": "zametka.md" }, "part": "body" }
{ "agentId": "…", "placement": { "kind": "root", "path": "AGENTS.md" } }
```

- `placement.kind`: `topic` | `channel` | `media` | `database` | `repository` — нужны `path` (slug без `awn-channels/` / `awn-databases/` / …) + `slot` (+ `ref`); `root` — только `path` (файл от корня workspace). Legacy: `path` с префиксом hub и `kind: topic` → kind выводится автоматически.
- `ref` — файл в слоте **с расширением** (`папка/zametka.md`). Если расширения нет, `read_content` / `content_exists` / `get_content_meta` / `read_content_property` повторяют запрос с `.md` и возвращают `refResolved`.
- Без `placement` можно `path` + `slot` + `ref` — это то же, что `kind: topic`.
- `read_content`: `part` = `body` (default) | `properties` | `schema` | `meta` | `all`. Body читается окном: по умолчанию первые 300 строк тела, `startLine` + `limitLines` (до 500) — номера строк **файла с frontmatter**, те же, что `startLine` в результатах поиска. В ответе `startLine`, `endLine`, `totalLines`, `bodyStartLine`, `hasMore`, `nextStartLine`, `hash`; окно расширяется, чтобы не резать блок ``` (`codeFence`). `full: true` — всё тело (нужно перед `write_content` mode=replace; для точечной правки не нужно). Internal-слоты и `main-single-csv` — целиком. Для root ещё `format: "base64"`, `offsetBytes`.
- `write_content`: `part` = `body` | `properties` (patch — только изменённые ключи) | `schema`; бинарь — `data` (base64) + `mimeType`. Для `part=body` — `mode`:
  - `replace` (default) — всё тело, frontmatter сохраняется; `append` / `prepend` — в конец / в начало тела; все три — `content`.
  - `patch` — `oldString` → `newString` (`""` удаляет); совпадение должно быть одно, иначе ошибка со списком строк или `replaceAll: true`. **Предпочтительный способ точечной правки.**
  - `replace_lines` — `startLine`..`endLine` → `content` (`""` удаляет строки); `insert` — `afterLine` или `beforeLine` + `content`.
  - Номера строк — как в `read_content` и поиске (строки файла с frontmatter); строки frontmatter через body не меняются → `part=properties`.
  - `expectedHash` — `hash` из `read_content` или прошлой записи; файл изменился → ошибка `conflict`. **Обязателен** для `replace_lines` / `insert`.
  - Ответ: `startLine` / `endLine` изменённого участка, `totalLines`, `previousHash`, `hash` (следующий `expectedHash`).
- `list_content`: `placement` (`kind`, `path`, `slot?`) или `path`; `depth`.

Ключи слотов только канонические: `notes`, `scripts`, `discussion` (не `note`, `script`, `thread`, `dialogs`). Пути не собирай руками — бери из `read_topic_index_toc`, `read_content_index_toc`, `list_content`, `resolve_workspace_path`, `list_folder`.

### Разделы дерева (для `parentPath` в `create_topic`)

- `awn-container/` — пользовательские области и темы (по умолчанию);
- `awn-agent-kit/` — служебные темы агента (persona, rules, voice…);
- `awn-shared/` — общие ресурсы между темами.

### Страницы vs инфоблоки — когда что

| | **Page · Slot · Content** | **awn-databases (инфоблоки)** |
|---|---------------------------|-------------------------------|
| Данные | Свободный текст, медиа, код | Однотипные сущности с общей схемой |
| Примеры | Протокол встречи, README темы, заметка | Справочники, задачи с полями, расходы (дата, сумма, категория) |

**Правило:** у всех элементов одинаковый набор полей и нужны запросы «по колонке» → инфоблок. Важнее текст и связи между файлами → страницы. Не смешивать без причины.

В UI инфоблоки называются «Накопители информации».

### `awn-id`

У каждой новой записи (manifest, content, sidecar, comment) в frontmatter есть `awn-id` — число из глобального счётчика workspace. Один id у нескольких записей допустим. Найти путь по числу — `find_by_id({ id: 81 })` (alias: `resolve_workspace_id`). Старым записям — `assign_workspace_id`.

---

## 3. Навигация и поиск

**Граница с `placement` (refactor-4):** CRUD **одного** объекта в слоте или по пути — только `read_content` / `write_content` / `list_content` / `list_slots` (+ lifecycle). **Не** через `placement`: markdown-оглавления (`read_*_index_toc`, `refresh_*_index_toc`, hub `read/refresh_*_index_toc`, `read_workspace_map`), поиск (`search_workspace_*`, `query_workspace_storage`, `search_workspace_links`), offline-кэш (`.agent-cms/cache/indexes/*`, `rebuild_workspace_*`, `get_workspace_index_status`). Legacy `get_topic_map` / `get_content_map` — deprecated. Единого `placement.kind: index` **нет** — именованные tools остаются каноном. Search/rebuild **не** добавлять в `read_content` без отдельного продуктового решения.

- Пользователь не назвал путь → `get_user_active_context_now`: в ответе готовые `path` / `slot` / `ref`, не угадывай.
- Дали только путь к файлу → `resolve_workspace_path`: тема, область, слот и готовые MCP-аргументы.
- Обзор workspace → `list_topics` или `read_topic_index_toc`; папки без manifest → `list_folder`. Обзор темы/слота → `read_content_index_toc`; properties одной записи → `read_content` (`part=properties|meta`).

**Поиск:** по умолчанию `search_workspace_hybrid`; несколько вопросов — `search_workspace_batch`. Связи между файлами (backlinks / outbound) ищет **только** `search_workspace_links` — hybrid их не видит. Факты, термины и справочник — `search_workspace_facts` / `search_glossary_terms` / `search_reference_entries`.

**Строки в результатах:** у semantic / fulltext / hybrid hits — `startLine`, `endLine`, `locationHint` (`L12` или `L12-18`); открой фрагмент через `read_content({ placement: { kind: "root", path }, startLine, limitLines })`. У `search_workspace_links` в каждом item — `line` (номер строки ссылки в исходном файле). Каталог файлов: `query_workspace_storage` — `lineCountTotal`, `lineCountBody` на записи.

**Поиск в теме:** `resolve_workspace_path` → `topic.folderPath` → передай как `pathPrefix`.

**Готовые выборки** (always-context, cron, фокус, пресеты по полям): `list_workspace_registry_queries` → `run_workspace_registry_query({ id })`.

После правки одного файла — `sync_workspace_index_file`, а не полный `rebuild_workspace_indexes`.

---

## 4. Темы

Типы: `awn.hub.topic.ws` (корень), `awn.hub.topic.area` (область), `awn.hub.topic` (тема со слотами), `awn.hub.topic.section` (служебные разделы); legacy `awn.page.*` → alias.

**Тело `manifest.md` темы — бриф:** назначение и границы темы, инструкции, договорённости, что класть в слоты. Это **не** память: записи — в слотах, события — в журнале, разговор — в дискуссии темы.

**MCP (канон):** `get_topic` / `update_topic` (карточка, как channel), `create_topic`, `list_topics`, `read_topic_*` (schema/config/env), `read_topic_index_toc`, … Контент: **`placement.kind: topic`** (legacy `page` на входе → topic в ответах).

**Параметры без схемы в MCP** (передавай так):

- `create_topic`: `type`* (`area` / `topic` или полный `awn.hub.*`), `parentPath` (обычно внутри `awn-container/`, default — корень), `displayName` или `title` → `awn-name`, `slug` или `name` → папка (нужно хотя бы одно из четырёх), `awnType` — нестандартный подтип.
- `rename_topic`: `path`*, `displayName` или `title`* → `awn-name`, `slug` → папка.
- `generate_workspace_slug`: `text` (или `title` / `displayName` / `name`), `preset` (`topic` · `page` · `content` · `store` · `database` · `repository` · `catalog` · `filename`), или `slug` — только очистить.

**Схемы:** свойства (`*_properties`) — значения frontmatter; схема (`schema.yml`) — описание полей формы; `config.yml` — UI, не поля; тип (`get_type`) — база, `schema.yml` — локальный override. `read_topic_schema` — без `mode=full` без нужды.

---

## 5. Слоты и контент

### Слоты

`list_slots({ placement: { kind: "topic", path } })` (или channel/media/database/repository) → `driver`: `external` (папка, нужен `ref`) или `internal` (один файл, **без `ref`**). Содержимое слота: `list_content`.

| Слот | Зачем |
|------|-------|
| `main` | Основная память |
| `inbox` | Входящие (`status: new`, разбор — `triage_inbox_item`) |
| `notes`, `references`, `artefacts` | Заметки, источники, черновики |
| `media` | Медиатека темы — самостоятельные файлы |
| `assets` | Ресурсы **записей**: `preview/`, `pasted/`, `attachments/`, `materials/` |
| `repository`, `scripts` | Код и скрипты темы |
| `comments`, `discussion` | Только через свои tools (раздел 7) |
| `main-single`, `main-single-csv`, `todo-single` | Однофайловые: страница памяти, таблица, TODO |

Системный `history` руками не трогать.

**`media` ≠ `assets`.** Картинка в текст, превью темы (поле `awn-preview`), вложение записи (поле `awn-attachments`) — всё в `assets`. В `media` — только самостоятельные файлы темы.

Загрузка в `assets`: `write_content({ placement: { kind: "topic", path, slot: "assets", ref: "pasted/shot.png" }, data })` (подпапки `pasted/`, `preview/`, `attachments/`). В markdown картинка ссылается как `awn-storage/assets/pasted/{файл}`.

### Медиатеки workspace (`awn-media/{slug}/`)

Не слот темы. Карточка: `list_media_libraries`, `get_media_library`, `register_media_library`, … Контент в слотах: `placement.kind: media`, `read_content` / `write_content` / `list_content` (`slot`: `files` \| `assets` \| …).

### Гибкий слот

Признак: `slotsFlexible: true` в `read_content_index_toc` / `read_topic_index_toc` (свойство manifest `awn-slots-flexible: true`). Тема без типовых слотов — произвольные папки. Писать **только** `create_content({ slot: "main", parent? })`; другие внешние слоты вернут ошибку.

### Доп. материалы записи — `assets/materials/{awn-id}/`

Личная папка **одной** записи (черновики, схемы, приложения). Связь по `awn-id`, не по slug — переименование записи папку не переносит. Одна запись — не больше одной папки. Legacy `awn-materials-{slug}` / `awn-parts-{slug}` читаются, новые не создавать.

Найти: в legacy `get_content_map` (deprecated) или `list_content` — у записи `hasRecordMaterials`, `recordMaterialsFolderRef`; у файлов папки — `parentRecordRef`.

### Sidecar и свободная память

- **Sidecar** — мета к одному файлу: `photo.png` → `photo.sidecar.md` рядом. Не создаётся автоматически; только `create_sidecar`.
- **Свободная память** — папки без `manifest.md` (см. `list_folder`, legacy `get_topic_map` kind:folder). Работа через `list_folder` и `read_content` / `write_content` с `kind: root`, не `read_topic_*`. Описание папки — `{folder}/sidecar.md` так же через `kind: root`. Превратить в тему — `create_topic`.

---

## 6. Инфоблоки (awn-databases)

Два слоя: **каркас store** (`list_databases`, `get_database`, `register_database`, `update_database`, …) — group / collection / single; **записи в `data/`** — `*_content_*` с `placement.kind: database`, `slot: data`. Устаревшие имена tools (`create_database`, `database_frame_*`) — только aliases на сервере, не в policy/docs.

### Hub-семьи MCP (параллель)

```
Topics          Channels / Media / Repo       Databases
get/update_topic  get + register/update/delete/rename   list/get/register/update
read_topic_*      read_*_index_toc                    read/write_*_schema
list_topics       list_*                              delete/rename_database
list_slots + *_content_* (kind: topic | channel | media | repository | database)
```

| `collectionType` | Тип записи | Когда |
|------------------|------------|-------|
| `md` | `awn.content.record` | Сущности с полями |
| `md-lite` | `…record-lite` | Простые списки (тексты, слоганы) |
| `csv` | `…record-csv` | Табличный реестр в одной таблице |
| `csv-files` | `…record-csv` | Отдельная таблица на запись |
| `files` | `…record` | Загрузка файлов |

**CSV (`recordStorage: csv`) — как править агенту:** одна таблица = один файл (`main.csv`). Читай и пиши **целиком**: `read_content` / `write_content` с `placement: { kind: "database", path: "<store>", slot: "data", ref: "main.csv" }`. В **`get_database`** смотри `recordEditMode: whole-file-csv` и `agentRecordHint`.

**Табличная память темы (`slot: main-single-csv`):** то же правило — `read_content` / `write_content` с `part=body` (или legacy body-tools): **весь** `main.csv` узла, не frontmatter и не построчные properties.

**Имена полей:** `awn-*` — только системные поля платформы. Пользовательские поля — **без** префикса (`amount`, `label`, `status`). Не дублируй системные ключи в `schema.yml`.

`write_database_schema` — передавай **полный** набор полей: сначала `read_database_schema`, иначе потеряешь поля.

---

## 7. Память и общение

### Куда что класть

| Что | Куда |
|-----|------|
| Решение, предпочтение, сущность (1–2 фразы) | `create_workspace_fact` |
| Термин и определение | `create_glossary_term` |
| Справочная статья (разделы) | `create_reference_entry` |
| Событие (жизнь, действие, UI, система) | `append_journal_entry` |
| Обсуждение одной темы | `append_discussion` |
| Комментарий к manifest / записи | `append_comment` |
| Входящие | `create_content({ slot: "inbox", status: "new" })` |
| Заметка на сессию / задача с человеком | `write_workspace_note` / `write_workspace_todo` (не слоты `notes/` / `todo-single`) |
| Инструкции агента | `AGENTS.md` / `SKILL.md` через `write_root_file` |
| Уведомление в 🔔 | `notify_user` или журнал с `notify: true` |

Комментарии, дискуссии и факты — только через их tools, не через `create_content` / `write_content`.

### Банк фактов — когда писать

- принято **решение** («делаем так»);
- выявлено **предпочтение** пользователя;
- зафиксирована **сущность** (URL API, имя проекта, контакт);
- важный итог чата во внешнем клиенте.

**Не писать:** каждую реплику, черновики, то, что уже есть в manifest темы. Норма: 0 фактов за обычный чат, 1–3 за полезную сессию. Решение изменилось — новый факт с `supersedes` на старый, а не дубль. Пользователь может сказать «сохрани как факт».

### Комментарии — привязка

`path` — manifest темы. Комментарий к записи: `mode` (`description` — manifest, `external` — запись в слоте, `media`…) + `file` — путь записи (напр. `memory/razdel/zapis.md`). Ответ — `replyTo` с id родительского комментария.

---

## 8. Файлы и выполнение

| Что | Чем |
|-----|-----|
| `.md` в слотах | `create_content` (новый) / `write_content` (правка) |
| Бинарник в слот | `write_content` + `data`, по URL — `import_content_from_url`; никогда не `create_content` |
| Тело / свойства manifest | `write_page_body` / `write_page_properties` |
| Файлы корня (`AGENTS.md`, `SKILL.md`…) | `list_root_files` → `read_root_file` / `write_root_file` (с history) |
| `NOTE.md` / `TODO.md` | `read_workspace_*` / `write_workspace_*` |
| Любой файл по пути (код, HTML, свободная память) | `read_content` / `write_content` с `kind: root`; точечная правка — `write_content` `mode: patch` (legacy `patch_file`); обход папки — `list_folder` |
| Загрузка по полному пути | `upload_file` / `upload_file_from_url` |

**Картинки в чате (показ пользователю):** в теле заметки ссылка часто **относительная** (`awn-storage/assets/pasted/shot.png`) — для чтения нужен **полный** workspace-path: `awn-container/<тема>/awn-storage/assets/pasted/shot.png` (путь темы из `resolve_workspace_path` / `read_topic_index_toc`, не угадывай). Читать: `read_content` с `placement: { kind: "root", path: "<полный path>" }`, `format: "base64"`. Для `image/*` MCP возвращает блок `image` (клиент может показать в чате); без `format: "base64"` — только метаданные и `previewUrl` (UI). Лимит чтения base64 — см. `maxBytes` в tool. **`read_root_file` — только basename в корне workspace** (`AGENTS.md`, `SKILL.md`…), **не** для `assets/pasted` и не для имён без папки темы.

**Служебные папки корня:**

- `awn-temp/` — все временные файлы (`incoming/`, `scratch/`, `exports/`…). Не создавай `temp/` в темах.
- `awn-scripts/` — общие скрипты workspace; слот `scripts/` — только для своей темы.

**`batch_invoke`** — N вызовов **одного** tool за раз. Лимиты: read/list/search — до 20, write/create/delete — до 10. Частичный успех возможен — проверяй каждый item.

**Подтверждения:** при `confirm-exec` / `confirm-delete` в platform settings передавай `confirm: true` **только после явного согласия человека**.

**Медиа в облако:** в `sync_media_cloud_file` / `get_media_cloud_file_status` `path` — manifest темы, `file` — **полный** workspace-path. Загрузка на Google/Яндекс не реализована — только локальная выгрузка.

**Веб:** найденную картинку в тему — `import_content_from_url({ slot: "media" })`, не `curl`.

---

## 8.1 DQL-lite (storage-index)

Каталог frontmatter workspace (`.agent-cms/cache/indexes/storage/`). Запросы — **не raw SQL**, а строка **DQL** или legacy JSON.

| Канал | Вызов |
|-------|--------|
| MCP | `query_workspace_storage({ agentId, dql: "..." })` |
| REST | `POST /api/storage-index/query` body `{ "dql": "..." }` |
| Пресет | `registry-queries.yml` → `source: dql`, поле `dql:` → `run_workspace_registry_query` |
| Preview | fenced `` ```awn-query `` `` / `` ```dataview `` `` → `dql-table.js` |

**Синтаксис (v1):** `FROM path/prefix` · `WHERE` (AND/OR/скобки, `=`, `!=`, `CONTAINS`, сравнения, `field LAST N DAYS`) · `FLATTEN field` · `GROUP BY field COUNT|SUM|MIN|MAX` · `SORT f DESC, g ASC` · `LIMIT n` · `SELECT a, b` · **`WITH TEXT "…"`** (hybrid semantic+fulltext только по path из DQL).

**Поля:** frontmatter + виртуальные `file.name`, `file.folder`, `file.mtime`, `file.size`, `file.inlink-count`, `file.outlinks` / `file.inlinks` (link-index, memory). Ответ: `dql-query` | `dql-group` | **`dql-hybrid`**, `engine: sqlite|memory`. **Raw SQL запрещён** (`sql` / `rawSql` → 500).

**UI:** кнопка **DQL** → модалка **Текст / Конструктор / Views**; views в `.agent-cms/settings/dql-views.yml` (`GET|POST|DELETE /api/storage-index/dql-views`). Конструктор → `POST /api/storage-index/dql-build`. Preview: `@transform {"pick":["path","awn-name"]}` (без JS eval). Грамматика: `lib/indexes/storage-index/dql/GRAMMAR.md`.

Пересборка: `rebuild_workspace_storage_index`. SQLite: `index-storage-sqlite-enabled` (default on).

---

## 9. Настройки и типы

### Настройки — 4 независимых scope (не merge)

| Scope | Что там |
|-------|---------|
| `platform` | MCP policy (`mcp-mode`, `batch-*`, `confirm-*`), индексы, always-context — общее для всех workspace |
| `workspace` | `awn-id-*`, Voice (`voice-*`), колонки зависимостей |
| `integrations` | skills / MCP / плагины (stub) |
| `user` | дерево меню, сайдбар |

MCP policy задаётся только в `platform`. Секреты в settings не хранятся. Схема и конфиг тем и инфоблоков — не settings: для них `read_topic_*` / `list_databases` …

### Типы

`list_types({ filter })` → `get_type({ id })`. Всегда по `id`, не по пути.

| filter | Пример id |
|--------|-----------|
| `create-page` | `awn.hub.topic` |
| `slot-content` | `awn.content.record`, `awn.content.record-csv` |
| `data-containers` | `awn.hub.database.collection` |
| `data-elements` | `awn.content.record`, `awn.content.record-lite`, `awn.content.record-csv`, `awn.content.category` |

---

## 10. Правила поведения

### Антипаттерны

1. Файлы в корень темы не класть — только в слот (кроме гибкого слота).
2. Не путать page tools (`*_page_*`) и content tools (`*_content_*`).
3. Типы и пути не угадывать — `get_type`, `resolve_workspace_path`, `get_user_active_context_now`.
4. Табличный реестр — в инфоблок, не в `main/`; заметку без общей схемы — не в инфоблок.

### Неясно, куда положить материал

Спроси человека или предложи вариант с обоснованием (таблица в разделе 7). Лучше одна реплика с вопросом, чем файл не в том месте.

### Контекст переполняется

1. Предложи человеку перезагрузить контекст (раздел 1) и кратко резюмируй сделанное.
2. Перед этим зафиксируй итоги в `NOTE.md`, нужной записи или `append_discussion`.
3. Не выдумывай правила и пути, которых уже не видишь, — перечитай `get_session_context` / нужный файл или уточни у человека.
