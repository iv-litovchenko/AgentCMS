# GLOBAL-DOC-MCP — краткая карта Agent CMS

Глобальный документ платформы (`GLOBAL-DOC-MCP.md`): **`get_session_documentation`** (не в `get_session_context` по умолчанию).

Стиль ответов (префиксы 🗄️ / 🌐 / 💭) — **`GLOBAL-RESPONSE-STYLE.md`**. Общие правила — **`GLOBAL-RULES.md`**. Справочник markdown preview — **`GLOBAL-DOC-MARKDOWN.md`** (opt-in).

## Зачем это

Это **общее хранилище** человека и агента: одно дерево страниц, слотов и записей, один язык модели (Page · Slot · Content · типы · MCP).  
Мы ведём его вместе: ты пишешь и правишь через MCP, человек — через UI; оба видят одно и то же.  
**1 + 1 = синергия** — не два разных «файловых мира», а одна CMS-память на общем словаре.

### Словарь: инфоблок ↔ `database`

| В разговоре / UI | В репозитории | В MCP |
|------------------|---------------|--------|
| **инфоблок**, «Накопители информации» | каталог `awn-databases/`, типы `awn.database.*` | `database_frame_*`, `database_element_*` |
| каркас store (group / collection / single) | `awn.database.frame.*` | `database_frame_*` |
| запись / раздел внутри store | `awn.database.element.*` | `database_element_*` |

Устаревшие синонимы: домен `infoblock` / id `awn.infoblock.*` / MCP `iblock_*` — алиасы на канон выше.

**Правило:** работать с CMS **только через MCP tools**. Запрещены сторонние tools, прямой `curl` к API, прямое чтение/запись файлов workspace и любые вызовы в обход MCP. Shell и команды — через `run_script` / `exec_command` / `exec_shell`.  
Этот файл — шпаргалка (**87 tools**, slim). Карта: `temp2/examples/mcp-optimiz.md`.

### Новый чат — выбор хранилища (`agentId`)

**Синонимы одного поля:** workspace · agent · vault · хранилище · рабочее пространство → **`agentId`**.

MCP подключается **без** фиксированного хранилища в конфиге. Каждый чат начинай так:

1. `list_workspaces` (alias `list_vaults`) — список id и имён  
2. `get_session_context({ agentId: "…" })` — контекст выбранного workspace  
3. **Все** workspace-tools с тем же `agentId` в параметрах

Пример фразы: *«Работай с хранилищем MedCenter. Сначала list_workspaces, потом get_session_context с нужным agentId, дальше всегда передавай этот agentId во все MCP tools.»*

Селектор «Хранилище (агент)» в Shell UI **не** меняет MCP в Claude Desktop — только tools с явным `agentId`.

Перед работой внутри выбранного workspace: `get_session_context({ agentId })` → при необходимости `get_session_documentation({ agentId })` → `get_user_active_context_now({ agentId })`.  
Поиск по содержимому workspace: `search_workspace_content` (fulltext-index); `search_workspace_semantic` (смысл); **`pathPrefix`** — как шапка UI. **Один вопрос:** `search_workspace_hybrid`. **Несколько вопросов:** `search_workspace_batch`. **Навигация по связям** (wikilinks, markdown, relation): **`search_workspace_links`** — backlinks / outbound / neighbors; не входит в hybrid. **Индексы (цепочка):** `run_workspace_ocr_index` → fulltext → semantic → поля → связи; всё разом: `rebuild_workspace_indexes` (= pipeline). Пересборка графа отдельно: `rebuild_workspace_link_index`. UI: sidebar → «Индексирование workspace». Вопросы про архив: `search_and_get_context`. **Банк фактов:** `create_workspace_fact` / `search_workspace_facts` → `awn-databases/contents/facts` (`retain_*` / `recall_*` — deprecated). **Глоссарий:** `create_glossary_term` / `search_glossary_terms` → `awn-databases/contents/glossary`.  
Произвольный путь → тема/область: `resolve_workspace_path({ path })` → `topic.folderPath` для ограничения поиска.  
Поиск в интернете: `search_web`, `search_web_images`, `read_web_page`, `get_link_preview`, `extract_document_text`.  
Идентичность: `get_agent_identity`, `get_user_identity`. Активность: `list_recent_activity`.

**«Перезагрузи контекст»** → снова `get_session_context`; доки платформы → `get_session_documentation`.  
Уточнения: always → `list_workspace_always_context`; карта страниц → `get_page_map`; оглавление страниц workspace → `get_workspace_page_index` / `refresh_workspace_page_index`; контент страницы → `get_content_map(path)` или быстрое оглавление → `get_content_index(path)` / обновить → `refresh_content_index(path)`; фокус UI → `get_user_active_context_now`.

## Модель (3 сущности)

| Сущность | Что это | Ключ MCP |
|----------|---------|----------|
| **Page** | Узел дерева меню (`manifest.md`) | `path` → `…/manifest.md` |
| **Slot** | Место хранения на странице | `slot` → `main`, `inbox`, `media`… |
| **Content** | Файл внутри слота | `path` + `slot` + `ref` |

**Page ≠ Content.** Слот — не файл; контент живёт *в* слоте. У **темы** тело `manifest.md` — бриф, контекст, инструкция и договорённости с агентом (см. раздел «Страницы»).

**Page · Slot · Content ≠ awn-databases.** Дерево страниц — для **неструктурированной** и **полуструктурированной** памяти (текст, заметки, медиа). Инфоблоки — для **структурированных** данных со схемой. Выбор — см. раздел «Страницы и контент vs awn-databases».

### Ключи (обязательно)

| Ключ | Значение | Пример |
|------|----------|--------|
| `path` | Путь к **manifest.md** страницы | `awn-container/finansy/manifest.md` |
| `slot` | MCP-ключ слота | `notes`, `scripts`, `discussion` — совпадает с именем папки |
| `ref` | Путь файла **внутри** слота | `vstrecha.md` или `subdir/vstrecha.md` |

Устаревшие алиасы (ещё работают, но не используй): `note` → `notes`, `script` → `scripts`, `thread` / `dialogs` → `discussion`.

### Фокус UI — `get_user_active_context_now`

Что открыто у пользователя. Смотри `focus.entity`: `page` | `slot` | `content` | `system` | `browse` | …  
В ответе уже есть готовые MCP-args: `path` / `slot` / `ref` — подставляй в `read_*` / `write_*`, не угадывай пути.

### Как разобрать произвольный путь — `resolve_workspace_path`

Дали только путь к файлу или папке — **не угадывай** topic/area. Вызови:

```json
resolve_workspace_path({ "path": "aja-test-oblasti-2049/aja-test-temy-2049-2/awn-storage/main/zametka.md" })
```

Сервер поднимается вверх по папкам, находит все `manifest.md` и собирает **хлебные крошки** до файла.

**Пример ответа** (файл в слоте main):

```json
{
  "breadcrumbsLabel": "[Agent CMS] … › Ая тест области 2049 › Ая тест темы 2049-2 › Память › read.json",
  "breadcrumbs": [
    { "kind": "ws", "label": "…", "path": ".", "manifestPath": "manifest.md" },
    { "kind": "area", "label": "…", "path": "aja-test-oblasti-2049", "manifestPath": "…/manifest.md" },
    { "kind": "topic", "label": "…", "path": "…/aja-test-temy-2049-2", "manifestPath": "…/manifest.md" },
    { "kind": "slot", "label": "Память", "path": "…/awn-storage/main", "slot": "main" },
    { "kind": "file", "label": "read.json", "path": "…/read.json", "current": true }
  ]
}
```

Каждая крошка: `kind`, `label`, `path` (workspace-relative). У страниц ещё `manifestPath`; у слота — `slot`; у файла — `ref`. Последняя крошка: `"current": true`.

| Поле | Зачем |
|------|-------|
| `breadcrumbs[]` | **Хлебные крошки** сверху вниз: workspace → area → topic → slot → папки → файл |
| `breadcrumbsLabel` | Одна строка: `WS › Area › Topic › Память › file.md` |
| `ancestors[]` | Только manifest-страницы, **снизу вверх** (ближайшая тема первой) |
| `ancestorsTopDown[]` | Те же manifest, сверху вниз (как в breadcrumbs, без slot/файла) |
| `topic` / `area` / `workspace` | Быстрые ссылки с `manifestPath` и `title` |
| `slot` | Если путь под `awn-storage/`: `mcpKey` (main, media…), `ref` |
| `mcp` | Готовые `{ path, slot?, ref? }` для `read_content_*` |

**Конвенция пути:**

```
{область}/{тема}/awn-storage/{слот}/{файл}
```

Примеры:

| Путь | topic | area | slot |
|------|-------|------|------|
| `…/tema/awn-storage/main/readme.md` | `…/tema/manifest.md` | родительская область | `main`, ref=`readme.md` |
| `…/oblast/manifest.md` | — | `…/oblast/manifest.md` | — |
| `awn-databases/tasks/…` | — (это инфоблоки, не Page) | — | — |
| папка без manifest | `ancestors` пуст или только ws | свободная память | — |

Альтернативы: `get_page_map` / `get_site_map` (полная карта), `search_workspace_content` (поиск по тексту, опц. `pathPrefix`), `get_user_active_context_now` (фокус UI).

### Поиск с ограничением по теме — `pathPrefix`

В шапке UI: иконка **◎** справа от поля поиска — drag-and-drop темы из меню ограничивает область. В MCP — тот же параметр.

| Tool | `pathPrefix` |
|------|--------------|
| `search_workspace_content` | поддерево workspace (тема, область, папка) |
| `search_workspace_semantic` | то же для offline semantic index |
| `query_workspace_storage` | фильтр по пути (как раньше) |

Пустой или без параметра = **весь workspace**.

**Как получить prefix:**

```json
resolve_workspace_path({ "path": "aja-test-oblasti-2031/aja-test-temy-2031/main.md" })
→ topic.folderPath   // "aja-test-oblasti-2031/aja-test-temy-2031"
```

**Пример — «найди RAG в теме»:**

```json
search_workspace_content({
  "query": "RAG",
  "pathPrefix": "aja-test-oblasti-2031/aja-test-temy-2031",
  "scope": "all",
  "limit": 20
})
```

Сценарий: пользователь назвал тему → `resolve_workspace_path` по manifest или пути → `pathPrefix: topic.folderPath` → поиск.

### Навигация по связям — `search_workspace_links`

Для **графа ссылок** между файлами — отдельный tool, **не** `search_workspace_hybrid` (тот ищет по тексту/смыслу). Сначала индекс: `rebuild_workspace_link_index` или полная цепочка `rebuild_workspace_indexes`.

| mode | Когда |
|------|-------|
| `backlinks` / `inbound` | Кто ссылается на этот файл |
| `outbound` | Куда ведут ссылки из файла |
| `neighbors` | Соседи в графе (`depth` 1–3) |

```json
search_workspace_links({
  "path": "GLOBAL-DOC-MCP.md",
  "mode": "backlinks",
  "limit": 20
})
```

Опционально `pathPrefix` — ограничить результаты поддеревом темы. Типичный сценарий: нашли файл через hybrid → `search_workspace_links` для backlinks и связанных manifest/записей.

### Глобальный ID записи — `awn-id`

У каждой **новой** записи (manifest, content, sidecar…) в frontmatter появляется **`awn-id`** — целое число из глобального счётчика в **`.agent-cms/settings/workspace.yml`** (группа **«Автоинкремент»**: `awn-id-next`, `awn-id-issued`, …). Старые записи без id: UI «Присвоить id» или MCP **`assign_workspace_id({ path })`**. **Один id у нескольких записей допустим** — при необходимости меняют вручную в свойствах.

| Tool | Когда |
|------|-------|
| `resolve_workspace_id({ id })` | Путь файла по числу, напр. `1847` |
| `assign_workspace_id({ path })` | Выдать id существующей записи без `awn-id` |
| `query_workspace_storage` | Фильтр `where: [{ field: "awn-id", eq: 1847 }]` (каталог полей) |

**Slug (имя папки/файла):** `generate_workspace_slug({ text, preset? })` — те же правила, что при `create_page` / `create_content` (без записи на диск). `preset`: `page` | `content` | `store` | `database` | `repository` | `catalog` | `filename`.

```json
resolve_workspace_id({ "id": 1847 })
assign_workspace_id({ "path": "awn-container/tema-x/manifest.md" })
generate_workspace_slug({ "text": "Моя тема", "preset": "page" })
```

---

## Дерево агента

| Папка | Зачем |
|-------|-------|
| `awn-agent-kit/` | Служебные темы агента (persona, rules, voice…) |
| `awn-shared/` | Общие ресурсы между темами (inbox, media…) |
| `awn-container/` | Пользовательский контент — обычные области/темы |
| корень | `manifest.md` (ws) + системные MD (`AGENTS.md`, `SKILL.md`…) |

`create_page`: обычно `parentPath` внутри `awn-container/` (или kit/shared по назначению).

- `type: "awn.page.area"` или `"area"` / `"folder"` — раздел (область)
- `type: "awn.page.topic"` или `"topic"` / `"file"` — тема
- `awnType` — опционально, если нужен нестандартный подтип (иначе выводится из `type`)
- `displayName` / `title` → `awn-name`; `slug` / `name` → папка на диске
- список допустимых: `list_types({ filter: "create-page" })`

---

## Реестры

Индексы workspace — **без** полного обхода дерева вручную. Старт: `get_session_context` уже отдаёт `topicRegistry` + `alwaysContext`.

| Tool | Что внутри | Тела файлов? |
|------|------------|--------------|
| `get_page_map` | Все узлы workspace: manifest (hasManifest:true) + папки без manifest (kind:folder). Meta, без body | нет |
| `get_workspace_page_index` | **Оглавление страниц** workspace: path, **type**, title, description. Файл `INDEX.md` в **корне** workspace | нет |
| `refresh_workspace_page_index` | **Обновить** `INDEX.md` в корне workspace (пересобрать из `get_page_map`) | да (INDEX.md) |
| `get_content_map(path)` | Контент одной страницы по слотам: title, description, **properties**, tags, status. Включая папки `awn-materials-*` (доп. материалы записи) | нет |
| `get_content_index(path)` | **Оглавление контента** темы (только **внешние слоты**: memory, inbox, media…; без bundle-памяти) или одного слота с `slot=…`. Колонки: path, **type**, title, description | нет |
| `refresh_content_index(path)` | **Обновить** оглавление контента → `index.md` **рядом с manifest.md** темы (внешние слоты) или index слота | да (index.md) |
| `resolve_workspace_path({ path })` | Произвольный путь → цепочка manifest (topic/area/ws), slot/ref, mcp hints | нет |
| `search_workspace_content` | Полнотекстовый поиск: пути, frontmatter, тела; опц. **`pathPrefix`** | meta + snippet |
| `search_workspace_semantic` | Семантический поиск (offline hash-TF-IDF); опц. **`pathPrefix`** | snippet + score |
| `search_workspace_links` | Граф связей: backlinks / outbound / neighbors вокруг **path**; индекс `.agent-cms/link-index/` | список path + kind |
| `resolve_workspace_id` | Путь записи по глобальному **awn-id** (счётчик в `.agent-cms/settings/workspace.yml`) | path |
| `assign_workspace_id` | Присвоить **awn-id** старой записи без id | id + path |
| `list_workspace_always_context` | workspace always + GLOBAL-RULES + GLOBAL-RESPONSE-STYLE + ws/ | **да** (в session) |
| `get_session_documentation` | GLOBAL-DOC-MCP, README, GLOBAL-DOC-MARKDOWN (настройки platform) | **по вызову** |
| `list_workspace_cron` | Темы/записи с `awn-runtime-cron` (+ schedule) | нет |
| `list_workspace_heartbeat` | Темы/записи с `awn-runtime-heartbeat` | нет |

Флаги на теме/записи (frontmatter):

- `awn-runtime-load-always` — полный текст в always-context  
- `awn-runtime-cron` / `awn-runtime-cron-schedule` — расписание  
- `awn-runtime-heartbeat` — периодическая проверка  

Сначала реестр → потом точечно `read_page_*` / `read_content_*` по path.

### Быстрый обзор vs полная карта

| Задача | Tool |
|--------|------|
| «Какие страницы есть в workspace» | `get_page_map` или `get_workspace_page_index` (компактнее) |
| «Обновить оглавление страниц workspace» | `refresh_workspace_page_index` → `INDEX.md` в корне |
| «Что есть в теме, не читая тексты» | `get_content_index(path)` — оглавление **внешних слотов** (без bundle-памяти) |
| «Оглавление одного слота (inbox, media…)» | `get_content_index(path, slot=inbox\|media\|…)` |
| «Обновить оглавление контента в index.md» | `refresh_content_index(path)` (тема → внешние слоты, файл `{topic}/index.md`) или `refresh_content_index(path, slot=…)` |
| «Найти текст только в одной теме/области» | `resolve_workspace_path` → `search_workspace_content({ pathPrefix: topic.folderPath })` |
| «Найти по смыслу в теме» | `search_workspace_semantic({ query, pathPrefix })` |
| «Кто ссылается на этот файл / куда ведут ссылки» | `search_workspace_links({ path, mode: "backlinks" \| "outbound" \| "neighbors" })` |
| «Найти запись по числовому id» | `resolve_workspace_id({ id })` или `query_workspace_storage({ where: [{ field: "awn-id", eq: N }] })` |
| «Выдать id старой записи» | `assign_workspace_id({ path })` — как кнопка «Присвоить id» в hero |
| «Нужны properties/tags/status перед правкой» | `get_content_map(path)` |
| «Читать/писать текст записи» | `read_content_body` / `write_content_body` |
| «Доп. файлы **конкретной** записи (не раздел темы)» | `get_content_map` → `hasRecordMaterials` / `parentRecordRef` / `recordMaterialsFolderRef`; папка `awn-materials-{slug}` |

**Два уровня оглавления:**

| Файл | Уровень | GET (preview) | POST (обновить) |
|------|---------|---------------|-----------------|
| `INDEX.md` | Страницы workspace (area/topic/folder) | `get_workspace_page_index` | `refresh_workspace_page_index` |
| `index.md` | Контент одной темы/слота | `get_content_index(path[, slot])` | `refresh_content_index(path[, slot])` |

Колонка **type**: для страниц — `awn.page.*` / `folder`; для контента — `awn-type` из frontmatter или kind (`awn.content.record`, `awn.media.asset`, …).

`indexFile.exists` в ответе `get_content_index` / `get_workspace_page_index` — есть ли файл на диске. Тема: `{topic}/index.md` рядом с `manifest.md` (**внешние слоты**). Слот: `…/main/index.md`, `…/inbox/index.md` и т.п. Workspace: `INDEX.md` в корне. Если `exists: false`, оглавление **сгенерировано** из текущих файлов (как кнопка ⟲ в UI).

---

## Страницы

Узел дерева меню (`manifest.md`).

| id | Имя | Зачем |
|----|-----|-------|
| `awn.page.ws` | Workspace | Корень агента — `manifest.md` в корне workspace |
| `awn.page.area` | Область | Папка-раздел в меню (legacy; новые — `awn.page.section.*`) |
| `awn.page.topic` | Тема | Рабочая страница со слотами (main, inbox, media…) |
| `awn.page.section.*` | Секция | Служебные разделы: `agent-kit`, `shared`, `container` |

### Тема — бриф в `manifest.md`

Тело страницы (`read_page_body` → markdown **после** frontmatter в `{topic}/manifest.md`) — **бриф, контекст, инструкция и договорённости** с агентом. Сюда относится всё, что задаёт *как работать с этой темой*:

- **назначение, описание**, границы темы;
- **инструкции, правила, документация**, промпт, роль;
- **договорённости** и соглашения по workflow;
- **как работать с темой** — что класть в слоты, приоритеты, ограничения.

Это **не** контент памяти: записи и материалы — в слотах (`main/`, `inbox/`, `media/`…), события — в workspace-журнале (`.agent-cms/journal/`), разговор — в `discussion/`. Manifest — «шапка» темы и on-boarding для человека и агента.  
Frontmatter (`awn-name`, `awn-description`, …) — краткие метаданные для меню и реестров; развёрнутый бриф — в **теле** manifest. Пустое тело допустимо (тема работает только через слоты), но для «живых» тем его стоит заполнять.

- карта страниц: `get_page_map` → оглавление страниц: `get_workspace_page_index` / `refresh_workspace_page_index`
- оглавление контента: `get_content_index(path)` → обновить: `refresh_content_index(path)` → полная meta-карта: `get_content_map(path)`
- фокус UI: `get_user_active_context_now`
- тело / свойства: `read_page_body` / `write_page_body`, `read_page_properties` / `write_page_properties`
- схема / конфиг: `read_page_schema` / `write_page_schema`, `read_page_config` / `write_page_config` (`config.yml`)
- проверки / мета: `page_exists`, `get_page_meta`; env: `read_page_env` / `write_page_env`
- создать / переименовать / сдвинуть: `create_page`, `rename_page`, `move_page`, `delete_page`
- типы: `list_types({ filter: "create-page" })` → `get_type({ id: "awn.page.topic" })`

### Запись свойств — patch (одно поле ок)

`write_page_properties` / `write_content_properties` — **merge**: шли только изменённые ключи, остальное остаётся с диска. Auto-поля (`awn-update`, `awn-version`, `awn-create`) дописывает сервер.

| Сущность | Полный frontmatter | Одно свойство |
|----------|-------------------|---------------|
| Страница | `read_page_properties` / `write_page_properties` | `read_page_property` / `write_page_property` |
| Контент | `read_content_properties` / `write_content_properties` | `read_content_property` / `write_content_property` |
| Frame инфоблока (manifest) | `database_frame_read_properties` / `database_frame_write_properties` | `database_frame_read_property` / `database_frame_write_property` |
| Элемент инфоблока | `database_element_read_properties` / `database_element_write_properties` | `database_element_read_property` / `database_element_write_property` |

`write_*_properties` — **merge**: шли только изменённые ключи. Для записей `awn-updated` дописывается автоматически.

Полный frontmatter: `read_*_properties` / `write_*_properties` с YAML patch в `content`.

| Метод | Что шлёшь | Исключение |
|-------|----------|------------|
| `write_page_properties` | patch YAML (`awn-status: closed`) | — |
| `write_content_properties` | patch YAML | — |
| `database_frame_write_schema` | **полный** YAML/`fields` накопителя | без полного read потеряешь поля |

Тело (`write_page_body` / `write_content_body`) frontmatter **не трогает**.

---

## Настройки (4 scope) — как агенту через MCP

**Три приложения, одно хранилище:** Agent CMS (редактор) · **Voice** (голос) · **Control** (пульт). Настройки Voice — в **workspace** scope; Control — вне MCP workspace-tools.

Четыре **независимые** области — **не merge**, у каждой свой yaml и тип в `awn-system/types/settings/`.

| Область | В UI | MCP `scope` | Файл значений | Кто потребляет |
|---------|------|-------------|---------------|----------------|
| **Platform** | Глобальные | `platform` (alias `global`) | **корень репо** `.agent-cms/settings/platform.yml` | MCP policy, сервер, индексы, автоконтекст |
| **Workspace** | Локальные (хранилище) | `workspace` (alias `local`) | **workspace** `.agent-cms/settings/workspace.yml` | awn-id, Voice, **Зависимости** (`dependencies-columns`), параметры хранилища |
| **Integrations** | Интеграции | `integrations` (alias `plugins`) | **workspace** `.agent-cms/settings/integrations.yml` | skills, MCP, плагины (пока stub) |
| **User** | Пользовательские | `user` | **workspace** `.agent-cms/settings/user.yml` | дерево меню, сайдбар, UI |

**Секреты** — корневой `.env` репо (platform), не в yaml. **Runtime** workspace — `.agent-cms/` (`settings/`, `cache/indexes/`, `cache/`, `state/`, `journal/`).

**Не agent settings:** `schema.yml` / `config.yml` / `.env` у **тем и инфоблоков** — у тем: `read_page_config` / `read_page_schema`; у инфоблоков (`awn-databases`, каркас frame): `database_frame_*`, не через `write_setting`.

### MCP — три tool

| Tool | Зачем |
|------|-------|
| **`list_settings`** | Все ключи + значения + meta. `scope`: `all` (default), `platform`, `workspace`, `integrations`, `user` |
| **`read_setting`** | Одна настройка: `scope` + `key` |
| **`write_setting`** | Запись: `scope` + `key` + `value`. Блок при `mcp-mode=readonly` |

**Быстрый старт:**

```json
list_settings({ "agentId": "…", "scope": "all" })

read_setting({ "agentId": "…", "scope": "platform", "key": "mcp-mode" })

write_setting({ "agentId": "…", "scope": "workspace", "key": "voice-proactive-mode", "value": "ping" })
```

**Правила:**

- **MCP policy** (режим, batch, confirm, лимиты read) — только **platform**. Workspace/user/integrations на denylist не влияют.
- **`readonly`** (`sys-*`, `awn-id-*`) — `read_setting` ✅, `write_setting` ❌.
- **`{NOT WORK}`** — сохраняются, но `runtimeEffect: false` (заглушки, в т.ч. integrations).
- Снимок при старте: **`get_session_context`** → `platformSettings`, `workspaceSettings` (без user/integrations).
- Одно поле — **`write_setting`**; целый yaml — UI или `write_file` (если policy разрешает).

### Что где (кратко)

**Platform** — `maintenance-mode`, `default-locale`, `default-workspace-id`, `mcp-mode`, `batch-*`, `confirm-*`, `index-*-enabled`, `always-context-*` (README, GLOBAL-DOC-MCP, AGENTS.md, папка ws).

**Workspace** — `awn-id-*`, группа **«Голосовой клиент»** (`voice-*`: маршрут, TTS/STT, окно, проактивность).

**User** — `tree-*`, `sidebar-width`, `pinned-branch-path` (`.agent-cms/settings/user.yml`, локальный UX).

**Integrations** — контейнеры skill/MCP/plugin (схема есть, runtime stub).

Полный реестр полей: **`SETTINGS_CHECK.md`**. Схемы типов в `awn-system/types/` — справочник, не форма настроек.

---

## Схемы

Схема = какие поля у сущности (не путать с телом markdown и значениями).

| Что | Файл | Tools | Когда |
|-----|------|-------|-------|
| Поля страницы / слотов | `schema.yml` (`awn_schema`) | `read_page_schema` / `write_page_schema` | Добавить/менять поля формы |
| UI/настройки страницы | `config.yml` (`awn_ui`, `awn_settings`) | `read_page_config` / `write_page_config` | UI, mask — **не** поля |
| Поля записей накопителя | `schema.yml` в awn-databases | `database_frame_read_schema` / `database_frame_write_schema` | Схема awn-databases |
| Канон типа | awn-system | `get_type(id)` | Смотреть базовые fields |

- свойства (`*_properties`) — **значения** frontmatter; **patch**: шли только изменённые ключи, остальное merge с диском  
- схема (`*_schema`) — **описание** полей формы  
- тип (`get_type`) — база из awn-system; `schema.yml` — локальный override поверх типа  

**Схема для агента:** базовые поля типа — один раз `get_type(id)`. Локальные дополнения — `read_page_schema` (**`mode=layers`**, default): три слоя `workspace` / `area` / `topic`, только непустые блоки (нет 44× пустых, нет baseTypes/merged/fieldRegistry). **Запись:** YAML только с нужным блоком; ответ — те же layers. Legacy UI dump: `mode=full`. `database_frame_write_schema` — полный актуальный YAML/`fields` для store.

---

## Слоты

Место хранения на странице. MCP-ключ: `slot`.  
`list_page_slots` отдаёт `driver`: **`external`** (папка, много файлов) или **`internal`** (один файл).

**Каталог типов слотов** (для `get_type(id)`): YAML в `awn-system/types/slots/` — **`multi-file/`** (много файлов, `storage-driver: external`), **`single-file/`** (один файл, `internal`; CSV — `tabular`), служебные runtime — **`multi-file/system/`**. Runtime и MCP резолвят слот по **`id`** (`awn.slot.main`…), не по пути к файлу.

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
| `comments` | `awn.slot.comments` | `comments/` | Discuss-комментарии (`list_comments` / `append_comment`, не `create_content`) |
| `discussion` | `awn.slot.discussion` | `discussion/` | Дискуссия темы (`read_discussion` / `append_discussion`, не `create_content`) |

### Гибкий слот (`awn-slots-flexible: true`)

Тема **без типовых внешних слотов** (inbox, media, references…). Вся многофайловая память — **произвольная FS-структура** внутри `awn-storage/` (папки и файлы задаёт пользователь и агент).

| Проверка | Где |
|----------|-----|
| `slotsFlexible: true` | `get_page_map` → узел темы |
| то же | `get_content_index` / `get_content_map` → поле `slotsFlexible` (алиас legacy: `slotsDisabled`) |

**Алгоритм записи:**

1. `get_page_map` или `get_content_index(path)` → если `slotsFlexible: true`:
2. **Только** `create_content({ path: "<manifest темы>", slot: "main", … })` — файлы попадают в `awn-storage/` (опционально `parent: "подпапка"`).
3. **Не** использовать `slot: inbox|media|references|…` — API вернёт ошибку.
4. Однофайловые internal-слоты (`main-single`, `todo-single`, …) и bundle-память работают как обычно.
5. Оглавление: `get_content_index(path)` — колонка **Слот** = `гибкий` для файлов в `awn-storage/`; workspace INDEX — колонка **Слоты** = `гибкий` / `типовые`.

**UI:** переключатель «Гибкий слот» в hero темы; свойство manifest: `awn-slots-flexible: true` (legacy read: `awn-slots-disabled: true`).

### Однофайловая память (internal)

Один файл на слот (`main.md`, `todo.md`…). Нужны `path` + `slot`; **`ref` не указывай** — `read_content_body` / `write_content_body`.

| slot | id | Файл | Зачем |
|------|-----|------|-------|
| `main-single` | `awn.slot.main-single` | `main.md` | Одна страница памяти |
| `main-single-csv` | `awn.slot.main-single-csv` | `main.csv` | Табличная память |
| `todo-single` | `awn.slot.todo-single` | `todo.md` | TODO |

Системные (обычно не трогать вручную): `history`. Временные файлы workspace — `awn-temp/`; журнал — `.agent-cms/journal/`.

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

---

## Аннотации (привязки хранилища)

| id | Имя | Зачем |
|----|-----|-------|
| `awn.annotation.comment` | Комментарий | Файлы в `comments/`; для UI Discuss — `append_comment`, не `create_content` |
| `awn.annotation.sidecar` | Sidecar | Мета к файлу (`{stem}.sidecar.md` рядом с исходником) — **только через `create_sidecar`** |

Legacy alias: `awn.content.comment`, `awn.content.sidecar` → те же канонические id.

Sidecar **не создаётся автоматически** при upload/import/create_content. Явный запрос: `create_sidecar` → правки: `write_sidecar`.

| Tool | Зачем |
|------|-------|
| `resolve_sidecar_path` | Куда ляжет sidecar: `sourcePath` **или** `path`+`slot`+`file` |
| `read_sidecar` | Прочитать sidecar (`exists:false` если ещё не создан) |
| `create_sidecar` | **Создать** sidecar с шаблоном `awn.annotation.sidecar` (409 если уже есть) |
| `write_sidecar` | **Обновить** существующий sidecar (404 если нет — сначала `create_sidecar`) |
| `delete_sidecar` | **Удалить** sidecar (исходный файл не трогает; 404 если sidecar не был создан) |

**Именование:** `photo.png` → `photo.sidecar.md` (та же папка). Работает **в любом месте workspace** через `sourcePath`.

```json
create_sidecar({ "sourcePath": "awn-container/tema/awn-storage/scripts/deploy.py", "title": "Deploy", "body": "…" })
write_sidecar({ "path": "…/manifest.md", "slot": "repository", "file": "spec.pdf", "body": "…" })
```

Не путать с **`{folder}/sidecar.md`** у adopt-папок (описание папки) — это `read_file` / `write_file`.

- проверки / мета: `content_exists`, `get_content_meta`
- тело / свойства записи: `read_content_body` / `write_content_body`, `read_content_properties` / `write_content_properties`
- создать: `create_content` (md/record; inbox: `slot: inbox`, `status: new`)
- бинарники: `upload_file` / `upload_file_from_url` по полному path; в слот — `import_content_from_url({ path, slot, url })`
- типы: `list_types({ filter: "slot-content" })` → `get_type({ id: "awn.content.record" })`

`write_content_properties` — patch frontmatter (одно поле ок); тело сохраняется.

### Доп. материалы записи (`assets/materials/{awn-id}`)

**Суть:** это **не** обычный раздел каталога и **не** общая папка темы. Это **личная папка одной конкретной записи** — все файлы внутри относятся только к ней (черновики, приложения, схемы, картинки, доп. `.md`).

**Связь по `awn-id` (1:1):**

```
awn-storage/
  main/razdel-1/igra-dalnoboyschik-2.md   ← запись-владелец (awn-id в frontmatter)
  assets/materials/42/                    ← её доп. материалы (42 = awn-id)
    manifest.md                           ← опционально
    черновик.md
    схема.png
```

- Канонический путь: **`awn-storage/assets/materials/{awn-id}/`** (нужен `awn-id` у записи).
- Legacy (читаются, новые не создавать): `main/…/awn-materials-{slug}/`, `awn-parts-{slug}`, `parts-{slug}` рядом с записью.
- Одна запись → **не больше одной** папки материалов.
- Переименование `.md` **не** переносит папку (якорь — `awn-id`, не slug).

**Для агента — как понять «чья это папка»:**

| Где смотреть | Поле / правило |
|--------------|----------------|
| `get_content_map` | `parentRecordRef` → ref записи-владельца, напр. `razdel-1/igra-dalnoboyschik-2.md` |
| `get_content_map` (запись) | `hasRecordMaterials: true`, `recordMaterialsFolderRef` → ref папки |
| По пути на диске | `…/assets/materials/{awn-id}/…` ⇒ владелец с тем же `awn-id` (legacy: `…/awn-materials-{slug}/…` ⇒ `…/{slug}.md`) |
| UI человека | блок «Доп материалы» на обзоре записи; в TOC папки **скрыты** |

**Не путать с:**

- **`awn-attachments`** (поле) — ссылки на файлы в `assets/attachments/`, не эта папка.
- **`awn.content.category`** — раздел для **многих** записей (manifest + группа `.md`).
- **`assets` / `media`** — общие слоты темы, не привязаны к одной записи.
- **`{file}.sidecar.md`** — мета **одного** файла, не папка материалов.

**В карте и оглавлении** (`get_content_map`, `get_content_index`) папки включены как обычные узлы — с `manifest.md` или без — чтобы агент находил их без ручного обхода диска:

| kind (map) | Что это |
|------------|---------|
| `record-materials-folder` | Папка `awn-materials-*` (раздел доп. материалов одной записи) |
| `record-materials` | `.md` внутри такой папки |
| `record-materials-file` | Не-markdown (png, pdf…) внутри |

Поля связи: `parentRecordRef`, `recordMaterialsFolderRef`, `recordMaterials: true`.

**Типичный сценарий агента:**

1. `get_content_index(path)` или `get_content_map(path)` → найти запись с `hasRecordMaterials: true`.
2. По `recordMaterialsFolderRef` или `parentRecordRef` понять пару «запись ↔ папка».
3. Текст доп. `.md` → `read_content_body(path, slot, ref=…/awn-materials-…/file.md)`.
4. Бинарник → `read_file` по `workspacePath` из map.
5. Новый файл к записи → класть в `awn-materials-{slug}/`, **не** в корень раздела.

---

## Файловая система workspace

**Path-based слой** — работа с файлами по пути в workspace, без `path` + `slot` + `ref`.

| Tool | Зачем |
|------|-------|
| `read_file` | Прочитать файл (текст → content; бинарник → previewUrl) |
| `write_file` | Записать/перезаписать текстовый файл (.py, .html, .json, …) |
| `upload_file` | Загрузить файл (base64) по полному пути |
| `upload_file_from_url` | Скачать http(s) URL → workspace path |
| `list_folder` | Содержимое папки (`depth=1` или рекурсивно) |
| `batch_invoke` | Пакетный вызов **одного** tool на массив `items` (read/create/write/delete — см. лимиты) |

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
| Дискуссия темы | `read_discussion` / `append_discussion` | Не писать в `discussion/` через `create_content` |
| Discuss-комментарий | `list_comments` / `append_comment` | Не писать в `comments/` через `create_content` / `write_file` |
| Код, HTML, бинарники, media | `read_file` / `write_file` / `upload_file` / `upload_file_from_url` |
| Файл в слот темы по URL | `import_content_from_url` |
| Системные файлы корня (`AGENTS.md`, …) | `list_system_files` → `read_file` / `write_file` (history) |
| Зависимости workspace (`dependencies.csv`) | `read_dependencies` / `write_dependencies` — колонки из settings «Зависимости» |
| Обход папки | `list_folder` |
| Поиск по содержимому workspace | `search_workspace_content` (опц. `pathPrefix`) |
| Поиск по смыслу в workspace | `search_workspace_semantic` (опц. `pathPrefix`) |
| Разбор произвольного пути | `resolve_workspace_path` |
| Поиск в интернете | `search_web`, `search_web_images`, `read_web_page`, `get_link_preview` |
| Документ → текст | `extract_document_text` |
| Профиль агента | `get_agent_identity` |
| Профиль пользователя | `get_user_identity` |
| Лента изменений | `list_recent_activity` |
| Единая лента workspace | `list_workspace_feed` |
| Аудит памяти (memory rot) | `audit_workspace_memory` |
| Записать факт | `create_workspace_fact` — выжимка в `contents/facts` |
| Найти факты | `search_workspace_facts` / `list_workspace_facts` |
| Q&A по workspace | `ask_workspace` |
| Контекст из прошлых данных (архив, история, «что мы решили») | `search_and_get_context` — тот же поиск, что `ask_workspace`, но с подсказкой «сначала найди в workspace» |
| Гибридный поиск (смысл + слова + фильтры полей) | `search_workspace_hybrid` — один вызов вместо semantic + fulltext + `query_workspace_storage` |
| Навигация по графу ссылок workspace | `search_workspace_links` — backlinks / outbound / neighbors; **не** hybrid |
| Несколько вопросов к архиву за раз | `search_workspace_batch` — массив `queries` (до 20), hybrid на каждый, один round-trip |
| Запуск скрипта `.py`/`.js`/`.sh` | `run_script` |
| Команда с args (git, npm, …) | `exec_command` |
| Shell-строка (pipes, `&&`) | `exec_shell` |

Для обхода слотов и media — **path-based** tools (`read_file`, `upload_file`, `list_folder`).

### Медиа в облако (`awn-media-cloud`)

Локальная **выгрузка** тяжёлых файлов: оригинальный путь в теме остаётся **симлинком с человеческим именем**, байты — в `awn-media-cloud/_blobs/mc-{id}-{originname}` (legacy `gd_*`; в git не коммитятся). В `awn-media-cloud/{provider}/` — симлинк с **тем же именем blob** (`mc-…`). Реестр — `awn-media-cloud/registry.json` (поле `providers[]`: google-drive, yandex-disk…). Sidecar остаётся **локально** рядом с симлинком. Справочник облаков — platform settings группа **media-cloud** (`list_settings` / `read_setting` или `list_media_cloud_providers`).

| Tool | Зачем |
|------|-------|
| `list_media_cloud_providers` | `defaultProvider` + список ключей из platform |
| `get_media_cloud_file_status` | Синхронизирован ли файл; `providers[]`; `scope`: `file` \| `topic` |
| `sync_media_cloud_file` | Включить/выключить выгрузку (как UI «Выгрузка в облако»); опц. `provider` |
| `repair_media_cloud_links` | Починить симлинки по registry |
| `upload_media_cloud_to_provider_zzz` | **Заглушка** — будущий upload на API провайдера |
| `get_remote_url_zzz` | **Заглушка** — будущий `remoteUrl` после upload |

**Аргументы** (как в UI): `path` = manifest темы; `file` = **полный** workspace-path к файлу (напр. `awn-container/tema/awn-storage/media/photo.png`), не только `media/photo.png`.

```json
list_media_cloud_providers({ "agentId": "agent-cms-test" })
get_media_cloud_file_status({
  "agentId": "agent-cms-test",
  "path": "awn-container/tema/manifest.md",
  "file": "awn-container/tema/awn-storage/media/photo.png",
  "provider": "google-drive"
})
sync_media_cloud_file({ "agentId": "…", "path": "…/manifest.md", "file": "…/media/photo.png", "provider": "yandex-disk" })
```

Удалённая выгрузка на Google/Яндекс пока **не** реализована — только локальный offload + метки провайдеров в registry.

`awn-media-cloud/` и `awn-google-drive/` (в т.ч. `_blobs/`) **не индексируются** (platform `index-exclude-patterns`) и **не попадают** в «Крупные файлы» — рабочая копия остаётся по пути симлинка в теме; blobs — дубликат байтов для git/облака.

### Пакетные вызовы — `batch_invoke`

Один round-trip вместо N одиночных вызовов **одного и того же** MCP-tool.

**Когда использовать:** нужно прочитать/создать/обновить/удалить несколько однотипных объектов за раз — например 10 файлов, 5 записей, 3 свойства.

**Когда не использовать:**
- разные tools в одном запросе (сначала `read_file`, потом `write_file` — два отдельных вызова);
- один объект — вызывай обычный tool;
- `exec_command` / `exec_shell` / `run_script` — только по одному.

**Схема:**

```json
{
  "agentId": "agent-cms-test",
  "tool": "read_file",
  "items": [
    { "path": "awn-container/tema/awn-storage/main/a.md" },
    { "path": "awn-container/tema/awn-storage/main/b.md" }
  ],
  "parallel": true
}
```

| Поле | Значение |
|------|----------|
| `tool` | Имя MCP-tool (один тип на весь batch) |
| `items[]` | Массив аргументов — как для одиночного вызова, **без** `agentId` (он общий) |
| `parallel` | `true` — параллельно (по умолчанию для read/list/search); `false` — строго по порядку (create/write с зависимостями) |

**Ответ:** массив результатов по каждому `item` — `ok`, `result` или `error`. Частичный успех допустим: смотри каждый элемент, не только общий статус.

**Лимиты (policy):**

| Категория | Примеры tools | batch |
|-----------|---------------|-------|
| read / list / search | `read_file`, `list_folder`, `read_content_body`, `search_workspace_content` | да, до 20 |
| write / create | `write_file`, `create_content`, `write_content_body` | да, до 10 |
| move / rename / delete | `delete_content`, `delete_page`, `move_content` | да, до 10 |
| exec | `exec_command`, `exec_shell`, `run_script` | **нет** (если `batch-deny-exec: true` в `.agent-cms/settings/platform.yml`) |

**Platform settings** (`.agent-cms/settings/platform.yml` → группа MCP):

| Ключ | Эффект |
|------|--------|
| `batch-deny-exec: true` | exec-tools нельзя в `batch_invoke` (по умолчанию) |
| `confirm-exec: true` | `exec_command`, `exec_shell`, `run_script` требуют `confirm: true` в args |
| `confirm-delete: true` | `delete_page`, `delete_content`, … требуют `confirm: true` в args |

Ограничения проверяются **на сервере**: центральный denylist → `awn-system/mcp-policy.yml`; лимиты per-workspace → `config.yml` (`batch-read-limit`, `batch-write-limit`). В `mode: readonly` — только read/list/search. Политика: **`list_settings` / workspace MCP policy** (не прямой HTTP).

**Примеры:**

```json
// Прочитать 5 файлов
{ "tool": "read_file", "items": [{ "path": "a.md" }, { "path": "b.md" }] }

// Создать 3 записи в main (по порядку)
{ "tool": "create_content", "parallel": false, "items": [
  { "path": "…/manifest.md", "slot": "main", "ref": "zametka-1.md", "body": "…" },
  { "path": "…/manifest.md", "slot": "main", "ref": "zametka-2.md", "body": "…" }
]}
```

Аналог для поиска уже есть отдельно: `search_workspace_batch` (массив `queries`). `batch_invoke` — универсальная обёртка для любого batchable tool.

### Выполнение команд

| Tool | Зачем |
|------|-------|
| `run_script` | Запустить файл из workspace: `script`, опц. `args`, `cwd`, `topicPath`, `interpreter` |
| `exec_command` | `command` + `args[]` без shell |
| `exec_shell` | Произвольная shell-строка |

`cwd` по умолчанию — папка темы из `topicPath` (dirname manifest) или корень workspace. Ответ: `exitCode`, `stdout`, `stderr`, `durationMs` (лимит вывода ~256KB, timeout до 10 мин).

При `confirm-exec: true` в platform settings передай **`confirm: true`** после явного одобрения пользователя.

### Поиск в интернете и чтение страниц

По умолчанию: **прямой запрос к Google** (`WEB_SEARCH_MODE=direct`) — без API-ключей. Google часто отдаёт JS-оболочку без результатов; тогда автоматически используется **DuckDuckGo** (поле ответа `fallbackFrom: "google-direct"`). При captcha — ошибка 429.

Альтернатива: **Google Custom Search JSON API** — `WEB_SEARCH_MODE=api` + ключи на CMS-сервере (`.env`).

| Переменная | Зачем |
|------------|-------|
| `WEB_SEARCH_MODE` | `direct` (по умолчанию) или `api` |
| `GOOGLE_SEARCH_API_KEY` | API key (только для `api`) |
| `GOOGLE_SEARCH_ENGINE_ID` | `cx` — ID поисковой системы (только для `api`) |

Опционально: `GOOGLE_SEARCH_LANG=ru`, `GOOGLE_SEARCH_COUNTRY=RU`, `GOOGLE_SEARCH_GL=ru`, `GOOGLE_SEARCH_SAFE=active`.

| Tool | Зачем |
|------|-------|
| `search_web` | Текстовый поиск: `{ query, limit?, lang?, country?, gl?, safe? }` |
| `search_web_images` | Картинки: `{ query, limit?, size?, type?, lang?, country?, gl?, safe? }` |
| `read_web_page` | Прочитать внешнюю страницу как текст: `{ url, maxChars?, maxBytes? }` — HTML→plain text, JSON pretty-print; локальные/private URL блокируются (SSRF) |
| `get_link_preview` | Карточка ссылки: `{ url }` → title, description, imageUrl, siteName (OpenGraph/meta) |
| `extract_document_text` | Текст из документа: `{ url? | path?, maxChars?, maxBytes? }` — pdf, docx, xlsx, html, txt, md, json |

### Идентичность и активность

| Tool | Зачем |
|------|-------|
| `get_agent_identity` | Персона и права агента из `awn-agent-kit/agent/` — manifest.md + main.md |
| `get_user_identity` | Профиль пользователя из `awn-agent-kit/user/` — manifest.md + main.md |
| `list_recent_activity` | Лента изменений workspace: `{ since?, limit? }` — MCP + live-sync (activity.jsonl). Колокольчик 🔔 — журнал |

Ответ identity: `profile` (awn-name, role, …), `main.body`, `text` (сводка для контекста).

`size` / `type` для картинок — только в режиме `api`.  
Найденную картинку в тему — `import_content_from_url({ path, slot: "media", url })` или `upload_file_from_url`.

**Не путать:** `search_workspace_content` / `search_workspace_semantic` — текст workspace агента (опц. **`pathPrefix`** для темы); **`search_workspace_links`** — навигация по **связям** между файлами (граф, не текст); `resolve_workspace_path` — один path → topic/area/ws + `folderPath`; **`resolve_workspace_id`** — число **awn-id** → path записи; `query_workspace_storage` — SQL-like по полям frontmatter (в т.ч. `awn-id`); `search_web` — публичный интернет; `read_web_page` — содержимое одного URL (не поиск).

---

## Страницы и контент vs awn-databases — когда что

Два слоя памяти workspace. **Не смешивать** без причины: не класть табличный реестр в `main/` темы и не делать «заметку» отдельной записью инфоблока, если ей не нужна общая схема полей.

| | **Page · Slot · Content** | **awn-databases (инфоблоки)** |
|---|---------------------------|---------------------------|
| **Тип информации** | Неструктурированная и полуструктурированная | Структурированная |
| **Где живёт** | Дерево меню WS → Area → Topic; файлы в слотах (`main`, `inbox`, `media`…) или path-based FS в `awn-storage/` | Папка `awn-databases/` **вне** дерева Page · Slot · Content |
| **Форма** | Markdown, медиа, код, произвольные папки; frontmatter по желанию | Коллекции `{id}.md`, CSV-таблицы, **единая схема** (`schema.yml`) на все записи |
| **Когда выбирать** | Документы, заметки, планы, обсуждения, статьи, черновики, контекст темы, wikilinks | Справочники, реестры, задачи с полями, enum/taxonomies, финансы по строкам, любые **однотипные сущности** с фильтрацией и CRUD |
| **MCP (обзор)** | `get_page_map`, `create_content`, `read_content_body`, `get_content_index` | `database_frame_list`, `database_frame_get`, `database_element_create`, `database_frame_read_schema` |
| **UI** | Темы, слоты, overview темы | «Накопители информации (инфоблоки)» |

**Примеры → Page · Slot · Content:** протокол встречи, README темы, inbox-заметка, медиафайл, гибкая папка в `awn-storage/` без жёстких колонок.

**Примеры → awn-databases:** `taxonomies/` (enum-значения), список агентов с полями, коллекция расходов (дата, сумма, категория), одиночка `main.md` с фиксированной схемой.

**Правило выбора:** если у всех элементов **одинаковый набор полей** и нужны запросы «по колонке» / валидация схемы → **awn-databases**. Если важнее **свободный текст**, навигация по теме и связи между файлами → **Page · Slot · Content**.

---

## Накопители информации / инфоблоки (awn-databases)

**Терминология:** `awn-databases` — **структурированные данные** (таблицы, коллекции со схемой). В UI: **«Накопители информации (инфоблоки)»**. Не путать со слотами темы. См. также раздел «Страницы и контент vs awn-databases» выше.

**MCP — два слоя инфоблока (frame / element):**

| Слой | Префикс MCP | Типы | Про что |
|------|-------------|------|---------|
| Каркас инфоблока (frame) | `database_frame_*` | `awn.database.frame.*` | group/collection/single в `awn-databases/{slug}/` |
| Элементы инфоблока | `database_element_*` | `awn.database.element.*` | записи и разделы в `awn-storage/data/` |

`database_*` — канонические имена MCP для **инфоблоков** (`awn-databases`). `iblock_frame_*`, `iblock_content_*` и короткие `iblock_*` — deprecated-алиасы.

Папка `awn-databases/` — вне дерева Page · Slot · Content: справочники (`taxonomies/`), задачи, агенты и т.п. **В меню и `database_frame_list` только frames** — не путать с element-записями внутри store.

**Типовой flow (3 шага):**
1. `database_frame_list` → `database_frame_get({ store })`
2. поля записи: `database_element_read_properties` / `database_element_write_properties`
3. базовые поля типа: `get_type({ id: "awn.database.element.record" })`; для **md-lite** → `…record-lite`; для **csv** / **csv-files** → `…record-csv` (category/sidecar — свои id)

**Тип коллекции (`awn-collection-type` в manifest frame):**

| Значение | Хранение | Схема записи | Когда |
|----------|----------|--------------|-------|
| `md` | `{id}.md` | `awn.database.element.record` (полная) | Задачи, документы, сущности с полями |
| `md-lite` | `{id}.md` | `awn.database.element.record-lite` (минимум) | Простые списки: тексты, слоганы, UI-строки |
| `csv` | `main.csv` | `awn.database.element.record-csv` | Табличный реестр |
| `csv-files` | `{id}.csv` | `awn.database.element.record-csv` | Отдельная таблица на запись |
| `files` | файлы в `data/` | `awn.database.element.record` | Загрузка файлов |

`md-lite` = тот же формат файлов, что `md`, но **лёгкий frontmatter**. В `schema.yml`: `awn_schema.record.extends: awn.database.element.record-lite`.

`csv` / `csv-files` = **лёгкие системные колонки** (`awn-id`, `awn-name`, `awn-description`, `awn-code`, `awn-sort`) + пользовательские колонки в `schema.yml`. База: `awn_schema.record.extends: awn.database.element.record-csv`. Слот темы `main-single-csv` → `awn.content.record-csv` (вкладка «Запись csv» в schema темы).

**Имена полей в `schema.yml` и CSV:**
- **`awn-*`** — только **системные** поля платформы (из типа `record` / `record-lite` / `record-csv`).
- **Пользовательские** колонки и поля instance — **без префикса** `awn-` (`amount`, `label`, `color`, `status`…). Не дублируйте системные ключи в `schema.yml`.

- типы каркаса: `list_types({ filter: "data-containers" })` → `get_type({ id: "awn.database.frame.collection" })`
- типы элементов: `list_types({ filter: "data-elements" })` → `get_type({ id: "awn.database.element.record" })`, `…record-lite`, `…record-csv`
- оглавление frames: `database_frame_read_index` / `database_frame_refresh_index` → `awn-databases/index.md`
- **бриф frame** — тело `manifest.md` (после frontmatter); в `database_frame_get` → `manifestMarkdown`
- **кастомные поля instance** (не весь тип): `database_frame_read_schema` / `database_frame_write_schema` — только доп. поля в `schema.yml`
- свойства frame: `database_frame_read_properties` / `database_frame_write_properties`
- список элементов (лёгкий): `database_element_list({ store })`
- новый элемент: `database_element_create({ store, name, slug, isSection? })` — как в UI
- раздел = папка с `manifest.md` под `awn-storage/data/{section}/`, тип `awn.database.element.category`
- тело записи: `database_element_read_body` / `database_element_write_body`
- удаление: `database_frame_delete`, `database_element_delete`; rename: `database_frame_rename`, `database_element_rename`

---

---

## Свободная память

**Не отдельный API** — папки без `manifest.md` уже в `get_page_map` как `kind: "folder"`, `hasManifest: false`, `adoptable: true`.

| Поле | Значение |
|------|----------|
| `hasManifest: false` | Свободная память — `list_folder` / `read_file` / `upload_file`, не `read_page_*` |
| `sidecarPath` | Описание папки: `{path}/sidecar.md` с `awn-name`, `awn-description` |
| `hasManifest: true` + `slotsFlexible: true` | Гибкий слот: manifest есть, типовых слотов нет — path-based FS в `awn-storage/` |
| `adoptable: true` | Можно превратить в тему через `create_page` |

Legacy adopt folder: **`resolve_workspace_path`** / page-map `kind:folder` (HTTP adopt — deprecated).

**Описание adopt-папки** — необязательный `sidecar.md` в корне:

```yaml
---
awn-name: Материалы
awn-description: Черновики и ресурсы для разбора
---
```

Читать/писать: `read_file` / `write_file` на `{folderPath}/sidecar.md`. В `get_page_map` → `title`, `description`, `sidecarPath`.

---

## Workspace pads (общение человек ↔ агент)

Корень workspace — **общая доска**, не слот темы и не инструкции агента:

| Файл | UI | MCP |
|------|-----|-----|
| `NOTE.md` | sidebar «NOTE.md (заметки)» | `read_workspace_note` / `write_workspace_note` |
| `TODO.md` | footer «TODO.MD» | `read_workspace_todo` / `write_workspace_todo` |

- **write** по умолчанию `mode=append` — дописать; `mode=replace` — полная замена
- запись с **history** (как system files)
- не путать: слот `notes/` / `todo-single` в теме — другие tools

Для `AGENTS.md`, `SKILL.md` — `list_system_files` → `read_file` / `write_file`.

---

## Системные файлы агента

Корень **конкретного** workspace: `AGENTS.md`, `SKILL.md`, `README.md`…

- список: `list_system_files` → какие служебные файлы есть / scaffold
- читать / писать: `read_file("AGENTS.md")` / `write_file("AGENTS.md", …)` — **с history** при записи

`NOTE.md` / `TODO.md` — предпочтительно **`read_workspace_*` / `write_workspace_*`** (см. выше).

В always-context агента (если есть): `AGENTS.md`, `SKILL.md`, `README.md`.  
Плюс всегда глобально: `GLOBAL-DOC-MCP.md` из корня репозитория (для всех агентов).

`read_system_file` / `write_system_file` — **удалены из MCP**; UI по-прежнему использует HTTP `/api/system-file`.

---

## Inbox / диалоги / комментарии

| Задача | Tools | Не делать |
|--------|-------|-----------|
| Intake / входящие | `list_inbox`, `triage_inbox_item`, `create_content` (`slot: inbox`, `status: new`) | Не писать в `inbox/` в обход triage |
| Дискуссия темы | `read_discussion`, `append_discussion` | Не писать в `discussion/` через `create_content` |
| Discuss-комментарии | `list_comments`, `read_comment`, `append_comment`, `update_comment`, `delete_comment`, `toggle_comment_reaction` | Не писать в `comments/` через `create_content` / `write_file` |

Новая intake-заметка — `create_content` в `slot: inbox` с `status: new`.

### Комментарии (Discuss)

Привязка к **manifest** или к **записи в слоте** — те же параметры контекста, что у диалогов:

| Поле | Когда | Пример |
|------|-------|--------|
| `path` | всегда | `awn-container/tema/manifest.md` |
| `mode` | комментарий к записи | `description` (manifest), `external`, `media`, … |
| `file` | комментарий к записи | `memory/razdel/zapis.md` |
| `name` | системный файл | редко |

**Примеры:**

```json
// комментарий к теме (manifest)
append_comment({ "path": "…/manifest.md", "body": "Готово", "author": "agent" })

// комментарий к записи в main/
append_comment({
  "path": "…/manifest.md",
  "mode": "external",
  "file": "memory/razdel/zapis.md",
  "body": "Уточнить формулировку",
  "replyTo": "2026-08-08_14-00-00-123.md"
})

list_comments({ "path": "…/manifest.md", "mode": "external", "file": "memory/razdel/zapis.md" })
read_comment({ "path": "…/manifest.md", "commentId": "2026-08-08_14-00-00-123.md" })
update_comment({ "path": "…/manifest.md", "commentId": "2026-08-08_14-00-00-123.md", "body": "…" })
delete_comment({ "path": "…/manifest.md", "commentId": "2026-08-08_14-00-00-123.md", "confirm": true })
```

Файлы: `awn-storage/comments/{target}/{timestamp}.md` (не slug-имена записей). Новые комментарии: `awn-type: awn.annotation.comment` + **`awn-id`** (глобальный счётчик workspace).

---

## Банк фактов (`awn-databases/contents/facts`)

**Зачем:** короткие **выжимки** — решения, предпочтения, сущности — из любых чатов (Cursor, Claude Desktop, Voice).  
Хранение: md-lite коллекция в группе `awn-databases/contents/`. UI: «Новая группа» → **Банк фактов** / **Глоссарий**.  
Legacy `awn-facts/` переносится в коллекцию при первом MCP-обращении.

| Слой | Где | Когда |
|------|-----|-------|
| `awn-databases/contents/facts/` | infoblock | «что решили / что запомнить» — 1–2 фразы |
| `awn-databases/contents/glossary/` | infoblock | термины и определения |
| `awn-facts/` | legacy | миграция → `contents/facts` |
| `awn-dialogs/` | корень workspace | полный Q/A Shell/Voice (не в semantic index) |
| `awn-temp/` | корень workspace | любые **временные** файлы (staging, scratch, экспорты) — не слот темы |
| `awn-scripts/` | корень workspace | **общие** исполняемые скрипты workspace (обслуживание, cron, миграции) — не слот `scripts/` темы |
| `awn-recycle/` | корень workspace | **корзина** (мягкое удаление, скоро) |
| `discussion/` темы | слот discussion | дискуссия **одной** темы CMS |
| `comments/` | слот comments | комментарий к manifest/записи |

UI: дерево **awn-databases** → `contents/facts`. Папка индексируется (semantic + fulltext + storage-index).

### Журнал workspace (`.agent-cms/journal/`)

Единый журнал событий workspace — жизнь, действия, UI, системные изменения. **Не** `log.md` в теме (слот отключён).

| Tool | Зачем |
|------|-------|
| `append_journal_entry` | **Добавить** запись (type: life/action/ui/system) |
| `list_journal_entries` | Список по теме (`topic=manifest.md`) |
| `list_workspace_notifications` | Лента 🔔 — те же записи журнала в формате уведомлений (`since`, `limit`, `notifyOnly`) |

Хранение: один файл на ISO-неделю (`2026-W38.md`). Индексируется (fulltext + semantic).  
`notify: true` → запись попадает в 🔔 (колокольчик и `list_workspace_notifications` читают тот же журнал).  
UI: раздел **Журнал** в теме; иконка 📓 в sidebar stats.

### Временные файлы (`awn-temp/`) и корзина (`awn-recycle/`)

- **`awn-temp/`** — единая папка workspace для временных файлов агента и человека. Не используй `awn-storage/temp/` в темах.
- Подпапки по смыслу: `incoming/`, `scratch/`, `exports/` или по дате/задаче.
- MCP: `write_file` / `upload_file` с путём `awn-temp/…`; просмотр — `list_folder`, `read_file`.
- UI: sidebar static → **Временные файлы** (после «Настройки»).
- **`awn-scripts/`** — постоянные **общие** скрипты (`.py`, `.js`, `.sh`…), не привязанные к одной теме. Слот темы `scripts/` — только для этой темы. Запуск — `run_script` (политика `confirm-exec` / `mcp-mode`). UI: sidebar → **Скрипты workspace** (`awn-scripts/`).
- **`awn-recycle/`** — корзина (static, восстановление позже). Пока — просто папка в корне.

### Tools

| Tool | Зачем |
|------|-------|
| `create_workspace_fact` | **Создать** факт |
| `update_workspace_fact` | **Обновить** факт по `record` |
| `list_workspace_facts` | Список последних (без semantic) |
| `search_workspace_facts` | **Найти** по вопросу (semantic + fulltext только в `contents/facts`) |
| `retain_workspace_fact` | deprecated → `create_workspace_fact` |
| `recall_workspace_facts` | deprecated → `search_workspace_facts` |

### Глоссарий (`contents/glossary`)

| Tool | Зачем |
|------|-------|
| `create_glossary_term` | **Создать** термин |
| `update_glossary_term` | **Обновить** термин |
| `list_glossary_terms` | Список терминов |
| `search_glossary_terms` | **Поиск** по фразе/маркеру |

### Когда писать (`create_workspace_fact`)

- принято **решение** (архитектура, процесс, «делаем так»)
- выявлено **предпочтение** пользователя
- зафиксирована **сущность** (URL API, имя проекта, контакт)
- важный итог чата **во внешнем клиенте** (Claude Desktop без MCP) — единственный способ сохранить в CMS

**Не писать:** каждую реплику, черновики, то что уже в `manifest.md` / `## Current State` темы.

**Норма:** 0 фактов за обычный чат; 1–3 за полезную сессию.

### Параметры `create_workspace_fact`

| Параметр | Обязательный | Значения |
|----------|--------------|----------|
| `body` | да | Текст факта (1–2 предложения) |
| `kind` | нет | `decision` · `preference` · `entity` · `procedure` · `open-question` · `note` · `fact` (default) |
| `source` | нет | `claude-desktop` · `cursor` · `voice` · `shell` · `codex` · `manual` · `other` |
| `tags` | нет | Массив или строка через запятую |
| `name` | нет | Короткий заголовок (default — из body) |
| `sourceRef` | нет | Путь к evidence: `awn-dialogs/claude/…/2026-09-09.md` |
| `supersedes` | нет | Путь старого факта, который этот заменяет |

**Примеры:**

```json
// решение после обсуждения
retain_workspace_fact({
  "agentId": "agent-cms-core",
  "body": "Cron только через awn-runtime-heartbeat, не в always-context.",
  "kind": "decision",
  "source": "cursor",
  "tags": ["runtime", "cron"]
})

// итог чата в Claude Desktop (нет полного лога в CMS)
retain_workspace_fact({
  "agentId": "agent-cms-core",
  "body": "API base MedCenter: https://api.example.com/v2",
  "kind": "entity",
  "source": "claude-desktop",
  "tags": ["api", "medcenter"]
})
```

Файл: `awn-facts/2026-09-13T18-00-00-cron-only-via-heartbeat.md`, тип `awn.content.fact`.

### Когда читать

| Задача | Tool |
|--------|------|
| «Что мы решили про X?» | `recall_workspace_facts({ query: "X" })` |
| Последние N фактов | `list_workspace_facts({ limit: 20 })` |
| Факты по типу | `list_workspace_facts({ kind: "decision" })` или `recall` + `kind` |
| Широкий поиск по всему workspace | `ask_workspace` / `search_workspace_hybrid` (не только facts) |

```json
recall_workspace_facts({
  "agentId": "agent-cms-core",
  "query": "cron heartbeat",
  "kind": "decision",
  "limit": 8
})
```

Ответ — **cited hits** (path + snippet); ответ пользователю формирует агент.

### Workflow (внешний чат → память CMS)

```
Чат в Claude Desktop / Cursor
  → в конце сессии или по просьбе пользователя:
     retain_workspace_fact × 1–3
  → позже в новом чате:
     recall_workspace_facts("что решили про …")
```

Пользователь может попросить: *«Сохрани это как факт»* или *«Запиши в банк фактов»*.

---

## Типы (awn-system)

**Канон — два метода:**

| | MCP |
|--|-----|
| Список | **`list_types`** |
| Детали | **`get_type(id)`** |

Параметры `list_types`:
- `domain` — `pages` \| `content` \| `data` \| `fields` \| `md-blocks` \| …
- `kind` — `type` \| `field` \| `data-container` \| `data-element` \| `block` \| …
- `filter` — preset: `create-page` \| `slot-content` \| `data-containers` \| `data-elements`

Примеры:
- create_page → `list_types({ filter: "create-page" })` → `get_type({ id: "awn.page.topic" })`
- контент в слоте → `list_types({ filter: "slot-content" })` → `get_type({ id: "awn.content.record" })`
- store → `list_types({ filter: "data-containers" })` → `get_type({ id: "awn.database.frame.collection" })`
- поля записи store → `list_types({ filter: "data-elements" })` → `get_type({ id: "awn.database.element.record" })` (или `…record-lite` / `…record-csv`)
- CSV в теме (`main-single-csv`) → `get_type({ id: "awn.content.record-csv" })`

**Не типы** (экземпляр / override): `read_page_schema`, `database_frame_read_schema` — локальные schema.yml, не справочник.

- всегда **`id`**, не path: `{ "id": "awn.database.frame.collection" }` ✅
- алиасы legacy: `awn.data.*` → `awn.database.*`; `awn.database.collection` → `awn.database.frame.collection`

---

## Антипаттерны

1. Не писать файлы «в корень темы» — через slot (`create_content`) или `upload_file`, **если нет** `awn-slots-flexible: true` (тогда — произвольная структура в `awn-storage/`).
2. Не путать page tools (`*_page_*`) и content tools (`*_content_*`).
3. Типы искать по `id`, не угадывать path.
4. `awn-databases` (инфоблок / информационный накопитель) ≠ слот страницы; структурированный реестр → `database_frame_*` + `database_element_*`, свободный текст → Page · Slot · Content (см. «Страницы и контент vs awn-databases»).
5. Уведомление в 🔔 CMS → `notify_user`.
6. В `slot` — канонические ключи: `notes`, `scripts`, `discussion` (не устаревшие `note` / `script` / `thread` / `dialogs`).
7. Комментарии / дискуссия — свои tools (`list_comments`, `append_comment`, `read_discussion`, …); inbox — `create_content` (`slot: inbox`), triage — `triage_inbox_item` (`to-content`, `mark-done`, `set-status`).
8. `read_page_schema` — default `mode=layers`; не `mode=full` без нужды.
9. `media` ≠ `assets`: медиатека темы vs ресурсы записей (preview / pasted / attachments).
10. Бинарные файлы → только upload_file, create_content для данных файлов не используется.
11. Полный чат → `awn-dialogs` / `append_discussion`; **выжимка** → `retain_workspace_fact`, не `write_file` в `awn-facts/` в обход tool.
12. Не дублировать факты: при обновлении решения — новый `retain` с `supersedes` на старый path, не плодить почти одинаковые файлы.

---

## Куда писать и переполнение контекста

### Неясно, куда положить материал

Если не уверен, **в какую тему, слот или файл** записать ответ, черновик или вывод:

1. **Спроси человека** — куда сохранить (тема, слот, новая запись или `NOTE.md` / `TODO.md`).
2. **Предложи вариант** с обоснованием, например:
   - инструкция агента → `AGENTS.md` / `SKILL.md` в корне workspace;
   - заметка на сессию → `NOTE.md` (`write_workspace_note`);
   - задача → `TODO.md` (`write_workspace_todo`);
   - материал по теме → `create_content` в подходящий `slot` (`main`, `notes`, `inbox`…);
   - обсуждение темы → `append_discussion` / `append_comment`, не произвольный файл в дереве.
3. **Не пиши «куда попало»** только чтобы закрыть задачу — лучше одна короткая реплика с вопросом, чем файл не в том месте.

Карта для выбора: `get_page_map` → тема; `get_content_map(path)` → слоты и записи на странице; `list_workspace_always_context` → что уже в always-context.

### Контекст переполняется

Если диалог длинный, в памяти много веток, или ты **теряешь детали** из документации / ранее согласованных правил:

1. **Предложи человеку обновить контекст** — коротко и по делу, без паники:
   - *«Контекст чата большой; чтобы не потерять опору по CMS, обнови always-context: `get_session_context` + `list_workspace_always_context`, при необходимости `get_page_map` / `get_content_index` по активной теме. Могу кратко резюмировать, что уже сделали, перед перезагрузкой.»*
2. **Перед «свежим» контекстом** — по запросу или при риске потери: зафиксируй итог в `NOTE.md`, в нужной записи темы или в `append_discussion`, чтобы факты не остались только в истории чата.
3. **Не выдумывай** правила и пути, которые уже не видишь в контексте — снова вызови `get_session_context`, `read_file` по нужному `AGENTS.md` / `manifest.md` или уточни у человека.

Отдельного MCP-tool «перезагрузить всё» нет: **«перезагрузи контекст»** = снова `get_session_context({ agentId })` и при необходимости точечное чтение карт / always-файлов (см. блок «Новый чат» выше).
