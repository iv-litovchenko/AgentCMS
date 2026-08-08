# GLOBAL_MCP_DOC — краткая карта Agent CMS

Глобальный документ платформы (`workspaces/agent-cms-core/GLOBAL_MCP_DOC.md`): попадает в always-context **всех** агентов.

## Зачем это

Это **общее хранилище** человека и агента: одно дерево страниц, слотов и записей, один язык модели (Page · Slot · Content · типы · MCP).  
Мы ведём его вместе: ты пишешь и правишь через MCP, человек — через UI; оба видят одно и то же.  
**1 + 1 = синергия** — не два разных «файловых мира», а одна CMS-память на общем словаре.

**Правило:** работать с CMS **только через MCP tools**. Запрещены сторонние tools, shell/`curl` к API, прямое чтение/запись файлов workspace и любые вызовы в обход MCP.  
Этот файл — шпаргалка (**44 tools**, slim). Карта: `temp2/examples/mcp-optimiz.md`.

Перед работой: `get_session_context` → `get_user_active_context_now`.  
Поиск: `search_workspace` (как шапка UI; scope=all|content|filename…).

**«Перезагрузи контекст»** → снова `get_session_context` (отдельного `reload_*` нет).  
Уточнения: always → `list_workspace_always_context`; карта страниц → `get_page_map`; контент страницы → `get_content_map(path)`; фокус UI → `get_user_active_context_now`.

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

### Фокус UI — `get_user_active_context_now`

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
- список допустимых: `list_types({ filter: "create-page" })`

---

## Реестры

Индексы workspace — **без** полного обхода дерева вручную. Старт: `get_session_context` уже отдаёт `topicRegistry` + `alwaysContext`.

| Tool | Что внутри | Тела файлов? |
|------|------------|--------------|
| `get_page_map` | Все страницы: path, title, description, properties, parentPath, slots summary | нет |
| `get_content_map(path)` | Контент одной страницы по слотам (meta, без body) | нет |
| `list_workspace_always_context` | `awn-runtime-load-always` + system MD + GLOBAL_MCP_DOC | **да** |
| `list_workspace_cron` | Темы/записи с `awn-runtime-cron` (+ schedule) | нет |
| `list_workspace_heartbeat` | Темы/записи с `awn-runtime-heartbeat` | нет |

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

- карта страниц: `get_page_map` → контент темы: `get_content_map(path)`
- фокус UI: `get_user_active_context_now`
- тело / свойства: `read_page_body` / `write_page_body`, `read_page_properties` / `write_page_properties`
- схема / конфиг: `read_page_schema` / `write_page_schema`, `read_page_config` / `write_page_config`
- создать / переименовать / сдвинуть: `create_page`, `rename_page`, `move_page`, `delete_page`
- типы: `list_types({ filter: "create-page" })` → `get_type({ id: "awn.page.topic" })`

### Запись свойств — patch (одно поле ок)

`write_page_properties` / `write_content_properties` — **merge**: шли только изменённые ключи, остальное остаётся с диска. Auto-поля (`awn-update`, `awn-version`, `awn-create`) дописывает сервер.

| Метод | Что шлёшь | Исключение |
|-------|----------|------------|
| `write_page_properties` | patch YAML (`awn-status: closed`) | — |
| `write_content_properties` | patch YAML | — |
| `write_data_store_schema` | **полный** YAML/`fields` накопителя | без полного read потеряешь поля |

Тело (`write_page_body` / `write_content_body`) frontmatter **не трогает**.

---

## Схемы

Схема = какие поля у сущности (не путать с телом markdown и значениями).

| Что | Файл | Tools | Когда |
|-----|------|-------|-------|
| Поля страницы / слотов | `schema-mod.yml` (`awn_schema`) | `read_page_schema` / `write_page_schema` | Добавить/менять поля формы |
| UI/настройки страницы | `configuration.yml` (`awn_ui`, `awn_settings`) | `read_page_config` / `write_page_config` | UI, mask — **не** поля |
| Поля записей накопителя | `schema-mod.yml` в awn-data | `read_data_store_schema` / `write_data_store_schema` | Схема awn-data |
| Канон типа | awn-system | `get_type(id)` | Смотреть базовые fields |

- свойства (`*_properties`) — **значения** frontmatter; **patch**: шли только изменённые ключи, остальное merge с диском  
- схема (`*_schema`) — **описание** полей формы  
- тип (`get_type`) — база из awn-system; `schema-mod.yml` — локальный override поверх типа  

**Схема для агента:** базовые поля типа — один раз `get_type(id)`. Локальные дополнения — `read_page_schema` (**`mode=layers`**, default): три слоя `workspace` / `area` / `topic`, только непустые блоки (нет 44× пустых, нет baseTypes/merged/fieldRegistry). **Запись:** YAML только с нужным блоком; ответ — те же layers. Legacy UI dump: `mode=full`. `write_data_store_schema` — полный актуальный YAML/`fields`.

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

- список слотов страницы: `list_page_slots` (+ `get_type` для allowedContent типов)

### Куда грузить файлы (`upload_file` по workspace path)

| Цель | Path (пример) | Зачем |
|------|---------------|-------|
| Превью темы | `…/awn-storage/assets/preview/shot.png` | поле `awn-preview` |
| Картинка в тексте | `…/awn-storage/assets/pasted/shot.png` | markdown `![…](awn-storage/assets/pasted/…)` |
| Вложение записи | `…/awn-storage/assets/attachments/doc.pdf` | поле `awn-attachments` |
| Медиатека темы | `…/awn-storage/media/photo.png` | самостоятельный media-файл |

Пример: `upload_file({ path: "awn-container/tema/awn-storage/assets/pasted/shot.png", data: "<base64>" })`

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

- тело / свойства: `read_content_body` / `write_content_body`, `read_content_properties` / `write_content_properties`
- создать: `create_content` (md/record; inbox: `slot: inbox`, `status: new`)
- бинарники: `upload_file` по полному path в `awn-storage/…`
- типы: `list_types({ filter: "slot-content" })` → `get_type({ id: "awn.content.record" })`

`write_content_properties` — patch frontmatter (одно поле ок); тело сохраняется.

---

## Файловая система workspace

**Path-based слой** — работа с файлами по пути в workspace, без `path` + `slot` + `ref`.

| Tool | Зачем |
|------|-------|
| `read_file` | Прочитать файл (текст → content; бинарник → previewUrl) |
| `write_file` | Записать/перезаписать текстовый файл (.py, .html, .json, …) |
| `upload_file` | Загрузить файл (base64) по полному пути |
| `list_folder` | Содержимое папки (`depth=1` или рекурсивно) |

**Путь** — относительно корня workspace агента, например:
- `awn-container/tema/awn-storage/media/photo.png`
- `awn-container/Materials/readme.md`
- `AGENTS.md`

**Когда path-based, когда slot-based:**

| Задача | Tool |
|--------|------|
| `.md` запись в main/inbox/notes | `create_content` / `write_content_body` |
| Frontmatter записи | `write_content_properties` |
| `manifest.md` страницы | `write_page_body` |
| Диалог темы | `append_thread` / `read_thread` | Не писать в `thread/` через `create_content` |
| Код, HTML, бинарники, media | `read_file` / `write_file` / `upload_file` |
| Системные файлы корня (`AGENTS.md`, …) | `list_system_files` → `read_file` / `write_file` (history) |
| Обход папки | `list_folder` |

Для обхода слотов и media — **path-based** tools (`read_file`, `upload_file`, `list_folder`).

---

## Накопители (awn-data)

**Терминология:** `awn-data` — это **хранилище структурированных данных** платформы (таблицы, коллекции записей со схемой полей). В документации и UI те же сущности могут называться **инфоблоки** или **информационные накопители** — это одно и то же, не путать со слотами темы.

Папка `awn-data/` в workspace: **структурированные данные** вне дерева Page · Slot · Content — справочники (`taxonomies/`), задачи, агенты, группы полей и т.п. Записи — строки CSV или `{id}.md`, не файлы в `awn-storage/` темы.

Отдельно от страниц/слотов.

- типы контейнеров: `list_types({ filter: "data-containers" })` → `get_type({ id: "awn.data.collection" })`
- схемы записей store: `list_types({ filter: "data-elements" })` → `get_type({ id: "awn.data.record" })`
- список store: `list_data_stores` → `get_data_store`
- схема полей store (read): `read_data_store_schema`
- запись: `create_data_record`
- правка schema-mod store: `write_file` на `awn-data/{store}/schema-mod.yml` (полный YAML)

---

---

## Свободная память

Два разных случая:

1. **Папка без `manifest.md`** → `list_folder` / `read_file` / `upload_file`
2. **Тема lite:** `awn-slots-disabled: true` — файлы рядом с `manifest.md`, без `awn-storage/` (не adopt-папка)

Не путать с `create_content` (обычная тема **со слотами**).

---

## Системные файлы агента

Корень **конкретного** workspace: `AGENTS.md`, `SKILL.md`, `README.md`, `NOTE.md`, `TODO.md`…

- список: `list_system_files` → какие служебные файлы есть / scaffold
- читать / писать: `read_file("AGENTS.md")` / `write_file("AGENTS.md", …)` — **с history** при записи

В always-context агента (если есть): `AGENTS.md`, `SKILL.md`, `README.md`.  
Плюс всегда глобально: `GLOBAL_MCP_DOC.md` из корня `agent-cms-core` (для всех агентов).

`read_system_file` / `write_system_file` — **удалены из MCP**; UI по-прежнему использует HTTP `/api/system-file`.

---

## Inbox / thread

| Задача | Tools | Не делать |
|--------|-------|-----------|
| Intake / входящие | `list_inbox`, `triage_inbox_item`, `create_content` (`slot: inbox`, `status: new`) | Не писать в `inbox/` в обход triage |
| Диалог темы | `read_thread`, `append_thread` | Не писать в `thread/` через `create_content` |

Новая intake-заметка — `create_content` в `slot: inbox` с `status: new`.

---

## Типы (awn-system)

**Канон — два метода:**

| | MCP | HTTP |
|--|-----|------|
| Список | **`list_types`** | `GET /api/agent-system/types` |
| Детали | **`get_type(id)`** | `GET /api/agent-system/type?id=` |

Параметры `list_types`:
- `domain` — `pages` \| `content` \| `data` \| `fields` \| `md-blocks` \| …
- `kind` — `type` \| `field` \| `data-container` \| `data-element` \| `block` \| …
- `filter` — preset: `create-page` \| `slot-content` \| `data-containers` \| `data-elements`

Примеры:
- create_page → `list_types({ filter: "create-page" })` → `get_type({ id: "awn.page.topic" })`
- контент в слоте → `list_types({ filter: "slot-content" })` → `get_type({ id: "awn.content.record" })`
- store → `list_types({ filter: "data-containers" })` → `get_type({ id: "awn.data.collection" })`
- поля записи store → `list_types({ filter: "data-elements" })` → `get_type({ id: "awn.data.record" })`

**Не типы** (экземпляр / override): `read_page_schema`, `read_data_store_schema` — локальные schema-mod, не справочник.

- всегда **`id`**, не path: `{ "id": "awn.data.collection" }` ✅
- алиасы legacy: `awn-data/cms-base/data-containers/collection.md` → `awn.data.collection`

---

## Антипаттерны

1. Не писать файлы «в корень темы» — через slot (`create_content`) или `upload_file`, **если нет** `awn-slots-disabled: true`.
2. Не путать page tools (`*_page_*`) и content tools (`*_content_*`).
3. Типы искать по `id`, не угадывать path.
4. `awn-data` (инфоблок / информационный накопитель) ≠ слот страницы.
5. Уведомление в 🔔 CMS → `notify_user`.
6. В `slot` — канонические ключи: `notes`, `scripts`, `dialogs` (не устаревшие `note` / `script` / `thread`).
7. Комментарии / thread — свои tools; inbox создавать через `create_content` (`slot: inbox`), triage — `triage_inbox_item`.
8. `read_page_schema` — default `mode=layers`; не `mode=full` без нужды.
9. `media` ≠ `assets`: медиатека темы vs ресурсы записей (preview / pasted / attachments).
