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

**Устаревшие tools не используй:** `iblock_*` → `database_*`; `retain_workspace_fact` / `recall_workspace_facts` → `create_workspace_fact` / `search_workspace_facts`; `read_dialogs` / `append_dialog` → `read_discussion` / `append_discussion`; `*_zzz` — заглушки.

**«Перезагрузи контекст»** = снова `get_session_context` + при необходимости `list_workspace_always_context`, `get_page_map`, `get_content_index` по активной теме.

---

## 2. Модель данных

### Page · Slot · Content

| Сущность | Что это | Ключ MCP |
|----------|---------|----------|
| **Page** | Узел дерева меню (`manifest.md`) | `path` → `…/manifest.md` |
| **Slot** | Место хранения на странице (= имя папки) | `slot` → `main`, `inbox`, `media`… |
| **Content** | Файл внутри слота | `path` + `slot` + `ref` (путь внутри слота) |

Ключи слотов только канонические: `notes`, `scripts`, `discussion` (не `note`, `script`, `thread`, `dialogs`). Пути не собирай руками — бери из `get_page_map`, `get_content_index`, `resolve_workspace_path`.

### Разделы дерева (для `parentPath` в `create_page`)

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

У каждой новой записи (manifest, content, sidecar, comment) в frontmatter есть `awn-id` — число из глобального счётчика workspace. Один id у нескольких записей допустим. Старым записям — `assign_workspace_id`.

---

## 3. Навигация и поиск

- Пользователь не назвал путь → `get_user_active_context_now`: в ответе готовые `path` / `slot` / `ref`, не угадывай.
- Дали только путь к файлу → `resolve_workspace_path`: тема, область, слот и готовые MCP-аргументы.
- Обзор — сначала реестры (`get_page_map`, `get_workspace_page_index`, `get_content_index`), потом точечно `read_*`.
- `get_content_index` — лёгкий (без properties), `get_content_map` — тяжелее, для планирования правок.

**Поиск:** по умолчанию `search_workspace_hybrid`; несколько вопросов — `search_workspace_batch`. Связи между файлами (backlinks / outbound) ищет **только** `search_workspace_links` — hybrid их не видит. Факты и термины — `search_workspace_facts` / `search_glossary_terms`.

**Строки в результатах:** у semantic / fulltext / hybrid hits — `startLine`, `endLine`, `locationHint` (`L12` или `L12-18`); открой фрагмент через `read_file` с `startLine` + `limitLines`. У `search_workspace_links` в каждом item — `line` (номер строки ссылки в исходном файле). Каталог файлов: `query_workspace_storage` — `lineCountTotal`, `lineCountBody` на записи.

**Поиск в теме:** `resolve_workspace_path` → `topic.folderPath` → передай как `pathPrefix`.

После правки одного файла — `sync_workspace_index_file`, а не полный `rebuild_workspace_indexes`.

---

## 4. Страницы

Типы: `awn.page.ws` (корень), `awn.page.area` (область), `awn.page.topic` (тема со слотами), `awn.page.section.*` (служебные разделы).

**Тело `manifest.md` темы — бриф:** назначение и границы темы, инструкции, договорённости, что класть в слоты. Это **не** память: записи — в слотах, события — в журнале, разговор — в дискуссии темы.

**Параметры без схемы в MCP** (передавай так):

- `create_page`: `parentPath` (обычно внутри `awn-container/`), `type` (`area` / `topic` или полный `awn.page.*`), `displayName` или `title` → `awn-name`, `slug` или `name` → папка, `awnType` — нестандартный подтип.
- `rename_page`: `path`, `displayName` → `awn-name`, `slug` → папка.
- `generate_workspace_slug`: `text`, `preset` (`page` · `content` · `store` · `database` · `repository` · `catalog` · `filename`), или `slug` — только очистить.

**Схемы:** свойства (`*_properties`) — значения frontmatter; схема (`schema.yml`) — описание полей формы; `config.yml` — UI, не поля; тип (`get_type`) — база, `schema.yml` — локальный override. `read_page_schema` — без `mode=full` без нужды.

---

## 5. Слоты и контент

### Слоты

`list_page_slots` → `driver`: `external` (папка, много файлов, нужен `ref`) или `internal` (один файл, **без `ref`**).

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

`upload_file` принимает только полный путь: `{папка темы}/awn-storage/assets/pasted|preview|attachments/{файл}`. В markdown картинка ссылается как `awn-storage/assets/pasted/{файл}`.

### Медиатеки workspace (`awn-media/{slug}/`)

Не слот темы. Карточка: `list_media_libraries`, `get_media_library`, `register_media_library`, `update_media_library`, `refresh_media_library_index`. Файлы внутри: `list_media_library_items` (`path` = manifest, `folder` = `files` | `assets`), `read_media_library_file`, `upload_media_library_file`. Разделы — `…/files/{раздел}/manifest.md` (как у многофайловой памяти).

### Гибкий слот

Признак: `slotsFlexible: true` в `get_page_map` / `get_content_index` (свойство manifest `awn-slots-flexible: true`). Тема без типовых слотов — произвольные папки. Писать **только** `create_content({ slot: "main", parent? })`; другие внешние слоты вернут ошибку.

### Доп. материалы записи — `assets/materials/{awn-id}/`

Личная папка **одной** записи (черновики, схемы, приложения). Связь по `awn-id`, не по slug — переименование записи папку не переносит. Одна запись — не больше одной папки. Legacy `awn-materials-{slug}` / `awn-parts-{slug}` читаются, новые не создавать.

Найти: в `get_content_map` у записи `hasRecordMaterials: true` и `recordMaterialsFolderRef`; у файлов папки — `parentRecordRef`.

### Sidecar и свободная память

- **Sidecar** — мета к одному файлу: `photo.png` → `photo.sidecar.md` рядом. Не создаётся автоматически; только `create_sidecar`.
- **Свободная память** — папки без `manifest.md` (`kind: "folder"` в `get_page_map`). Работа через `list_folder` / `read_file`, не `read_page_*`. Описание папки — `{folder}/sidecar.md` через `write_file`. Превратить в тему — `create_page`.

---

## 6. Инфоблоки (awn-databases)

Два слоя: **frame** (`database_frame_*`) — каркас group / collection / single; **element** (`database_element_*`) — записи и разделы внутри. В `database_frame_list` и меню — только frames.

| `collectionType` | Тип записи | Когда |
|------------------|------------|-------|
| `md` | `awn.database.element.record` | Сущности с полями |
| `md-lite` | `…record-lite` | Простые списки (тексты, слоганы) |
| `csv` | `…record-csv` | Табличный реестр в одной таблице |
| `csv-files` | `…record-csv` | Отдельная таблица на запись |
| `files` | `…record` | Загрузка файлов |

**Имена полей:** `awn-*` — только системные поля платформы. Пользовательские поля — **без** префикса (`amount`, `label`, `status`). Не дублируй системные ключи в `schema.yml`.

`database_frame_write_schema` — передавай **полный** набор полей: сначала `database_frame_read_schema`, иначе потеряешь поля.

---

## 7. Память и общение

### Куда что класть

| Что | Куда |
|-----|------|
| Решение, предпочтение, сущность (1–2 фразы) | `create_workspace_fact` |
| Термин и определение | `create_glossary_term` |
| Событие (жизнь, действие, UI, система) | `append_journal_entry` |
| Обсуждение одной темы | `append_discussion` |
| Комментарий к manifest / записи | `append_comment` |
| Входящие | `create_content({ slot: "inbox", status: "new" })` |
| Заметка на сессию / задача с человеком | `write_workspace_note` / `write_workspace_todo` (не слоты `notes/` / `todo-single`) |
| Инструкции агента | `AGENTS.md` / `SKILL.md` через `write_file` |
| Уведомление в 🔔 | `notify_user` или журнал с `notify: true` |

Комментарии, дискуссии и факты — только через их tools, не через `create_content` / `write_file`.

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

**Path-based** (`read_file`, `write_file`, `patch_file`, `upload_file`, `list_folder`) — для кода, HTML, бинарников, свободной памяти, системных файлов. Для `.md` в слотах — `create_content` / `write_content_body`; для manifest — `write_page_body`. Бинарники — никогда через `create_content`.

**Служебные папки корня:**

- `awn-temp/` — все временные файлы (`incoming/`, `scratch/`, `exports/`…). Не создавай `temp/` в темах.
- `awn-scripts/` — общие скрипты workspace; слот `scripts/` — только для своей темы.

**`batch_invoke`** — N вызовов **одного** tool за раз. Лимиты: read/list/search — до 20, write/create/delete — до 10. Частичный успех возможен — проверяй каждый item.

**Подтверждения:** при `confirm-exec` / `confirm-delete` в platform settings передавай `confirm: true` **только после явного согласия человека**.

**Медиа в облако:** в `sync_media_cloud_file` / `get_media_cloud_file_status` `path` — manifest темы, `file` — **полный** workspace-path. Загрузка на Google/Яндекс не реализована — только локальная выгрузка.

**Веб:** найденную картинку в тему — `import_content_from_url({ slot: "media" })`, не `curl`.

---

## 9. Настройки и типы

### Настройки — 4 независимых scope (не merge)

| Scope | Что там |
|-------|---------|
| `platform` | MCP policy (`mcp-mode`, `batch-*`, `confirm-*`), индексы, always-context — общее для всех workspace |
| `workspace` | `awn-id-*`, Voice (`voice-*`), колонки зависимостей |
| `integrations` | skills / MCP / плагины (stub) |
| `user` | дерево меню, сайдбар |

MCP policy задаётся только в `platform`. Секреты в settings не хранятся. Схема и конфиг тем и инфоблоков — не settings: для них `*_page_*` / `database_frame_*`.

### Типы

`list_types({ filter })` → `get_type({ id })`. Всегда по `id`, не по пути.

| filter | Пример id |
|--------|-----------|
| `create-page` | `awn.page.topic` |
| `slot-content` | `awn.content.record`, `awn.content.record-csv` |
| `data-containers` | `awn.database.frame.collection` |
| `data-elements` | `awn.database.element.record`, `…record-lite`, `…record-csv` |

---

## 10. Правила поведения

### Антипаттерны

1. Файлы в корень темы — только через слот или `upload_file` (кроме гибкого слота).
2. Не путать page tools (`*_page_*`) и content tools (`*_content_*`).
3. Типы и пути не угадывать — `get_type`, `resolve_workspace_path`, `get_user_active_context_now`.
4. Табличный реестр — в инфоблок, не в `main/`; заметку без общей схемы — не в инфоблок.

### Неясно, куда положить материал

Спроси человека или предложи вариант с обоснованием (таблица в разделе 7). Лучше одна реплика с вопросом, чем файл не в том месте.

### Контекст переполняется

1. Предложи человеку перезагрузить контекст (раздел 1) и кратко резюмируй сделанное.
2. Перед этим зафиксируй итоги в `NOTE.md`, нужной записи или `append_discussion`.
3. Не выдумывай правила и пути, которых уже не видишь, — перечитай `get_session_context` / нужный файл или уточни у человека.
