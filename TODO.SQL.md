# TODO: SQL / DQL-слой над storage-index

Цель: развить текущий **storage-index** (`query_workspace_storage`, `index.json`, опционально `catalog.sqlite`) до **DQL-подобного** языка запросов — как Obsidian Dataview, но на стороне Agent CMS (API, MCP, дашборды, опционально блоки в `.md`).

---

## Сейчас (as-is)

| Компонент | Где |
|-----------|-----|
| Каталог полей | `.agent-cms/cache/indexes/storage/index.json` |
| Зеркало SQLite | `.agent-cms/cache/indexes/storage/catalog.sqlite` (если `storageSqliteEnabled`) |
| Запросы | JSON: `pathPrefix`, `where[]` (AND), `sort`, `fields`, `limit` (1–500) |
| Операторы | `eq`, `contains`, `gte`, `lte`, `gt`, `lt` |
| Исполнение | фильтрация `records` в памяти (`lib/indexes/storage-index/service.js`) |
| Пресеты | `.agent-cms/settings/registry-queries.yml` → `run_workspace_registry_query` |
| MCP / REST | `query_workspace_storage`, `POST /api/storage-index/query` |

**Не входит в storage-query:** текст тела, semantic, граф ссылок, OR/группировки, агрегации, raw SQL в MCP.

---

## Целевое состояние (DQL-lite)

Строка запроса (или JSON + строка для UI) → **AST** → исполнение на SQLite и/или in-memory fallback.

Пример целевого синтаксиса (черновик, не финальный):

```dataview
FROM "awn-container/finansy/awn-storage/main/rashody"
WHERE awn-type = "awn.content.record" AND (awn-tags CONTAINS "расход" OR awn-category = "rashody")
SORT awn-create DESC
LIMIT 50
```

---

## Фазы работ

### Фаза 0 — документ и контракт

- [x] Краткая спека DQL-lite — `GLOBAL-DOC-MCP.md` § DQL-lite, этот файл
- [x] Версионирование: `dqlVersion: 1`, обратная совместимость JSON `where[]`
- [x] Единый endpoint: `POST /api/storage-index/query` — `{ dql }` или legacy JSON

### Фаза 1 — MVP (ощущение «как DQL»)

- [x] **Парсер** строки → AST (`FROM`, `WHERE`, `SORT`, `LIMIT`, `SELECT`/`fields`) — `lib/indexes/storage-index/dql/parse.js`
- [x] **WHERE:** AND + **OR** + скобки; `=`, `!=`, `CONTAINS`, сравнения; `NOT`
- [x] **FROM** = `pathPrefix` (префикс пути; путь `a/b/c` без кавычек или в `"..."`)
- [x] **Исполнение на SQLite** (`catalog.sqlite`) + fallback in-memory — `dql/compile-sqlite.js`, `dql/eval-memory.js`, `dql/execute.js`
- [x] `index-storage-sqlite-enabled` default **true** (platform.yml + workspace defaults); on-demand sync при DQL
- [x] MCP + API: параметр `dql` в `query_workspace_storage` / `POST /api/storage-index/query`
- [x] Тесты: `node --test lib/indexes/storage-index/dql/parse.test.js`

### Фаза 2 — ближе к Dataview

- [x] **Виртуальные поля `file.*`:** `file.mtime`, `file.size`, `file.folder`, `file.name`, `file.ext`, in/out link counts — `dql/field-resolver.js` (SQLite: mtime/size/lineCount; остальное — memory)
- [x] **Массивы:** индекс как `", "` строка; **FLATTEN field** — `dql/post-process.js`
- [x] **SORT** несколько полей: `SORT a DESC, b ASC`
- [x] **GROUP BY field** + `COUNT` | `SUM field` | `MIN` | `MAX`
- [x] **`field LAST N DAYS`** в WHERE; registry `relativeDays` → payload для `dql`

### Фаза 3 — связи и гибрид

- [x] **link-index:** `file.inlinks` / `file.outlinks` (eq/contains) — `dql/link-stats.js` (memory)
- [x] **`WITH TEXT "..."`** + hybrid search (`dql-hybrid`, `allowedPaths` в hybrid API)
- [x] **registry-queries:** `source: dql` + `dql:` / `query.dql`

### Фаза 4 — UI и markdown (опционально)

- [x] Fence `` ```awn-query `` `` / `` ```dataview `` `` → `awn-system/renderers/dql-table.js`
- [x] Редактор DQL в шапке (модалка: **Текст / Конструктор / Views**)
- [x] Saved views → `.agent-cms/settings/dql-views.yml` + API `/api/storage-index/dql-views`
- [x] Full-page dashboard widget — `awn-dashboard-present: dql` в `awn-dashboards/widgets/*.md`, экран «Мой дашборд»

### Фаза 5 — безопасность и perf

- [x] Только compiled SQL из AST (клиент не шлёт raw SQL)
- [x] Лимиты: длина DQL, depth AST, `limit` ≤ 500 — `dql/limits.js`
- [x] Timeout hybrid + **in-memory DQL** (deadline 15s, check every 500 records)
- [x] **Batch incremental SQLite** `updateFilesBatch` + queue drain; `saveIndex` skip full sqlite when incremental

---

## Сравнение с Obsidian (ориентир)

| Возможность | Dataview | Bases | Цель DQL-lite |
|-------------|----------|-------|----------------|
| FROM folder | ✓ | ✓ (view) | ✓ pathPrefix |
| OR / скобки | ✓ | ✓ (UI) | ✓ фаза 1 |
| file.inlinks | ✓ | через links | ✓ фаза 3 |
| GROUP / sum | ✓ | formulas | ✓ фаза 2 |
| DataviewJS | ✓ | — | ✗ или отдельный sandbox позже |
| Inline в .md | ✓ | — | ✓ фаза 4 |
| Agent MCP | — | — | ✓ уже есть, расширить |

---

## Технические точки в коде

- `lib/indexes/storage-index/service.js` — `query()`, `recordMatchesFilters`
- `lib/indexes/storage-index/sqlite-store.js` — схема EAV, sync
- `lib/indexes/storage-index/store.js` — save + sqlite sync
- `server.js` — `/api/storage-index/query`
- `mcp-server/lib/map-tools.js` — `query_workspace_storage`
- `workspaces/*/.agent-cms/settings/registry-queries.yml` — пресеты

**Модули:**

- `lib/indexes/storage-index/dql/*` — parse, execute, compile-sqlite, build-query, GRAMMAR.md
- `lib/workspace/dql-views.js` — saved views catalog
- Tests: `node --test lib/indexes/storage-index/dql/*.test.js`

---

## Критерии готовности MVP (фаза 1)

1. Запрос «все записи расходов в finansy» одной строкой DQL совпадает с эквивалентным JSON `where` + `pathPrefix`.
2. Тесты: parser + compile + golden SQL snapshots.
3. Документация в `GLOBAL-DOC-MCP.md` (один раздел «DQL-lite»).
4. SQLite path используется при `storageSqliteEnabled`; иначе — текущий in-memory путь без регрессий.

---

## Не в scope (пока)

- Произвольный `SELECT * FROM ...` raw SQL из MCP.
- Полный клон DataviewJS.
- Замена `read_content` / CRUD placement.
- PostgreSQL / внешняя БД вместо файлов workspace.

---

## CSV в тот же «SQL-слой» — мнение (фаза 6, черновик)

**Сейчас:** DQL-lite видит только **storage-index** = каталог **frontmatter `.md`** (path + поля YAML). CSV-коллекции (`csv`, `csv-files`) живут в **awn-databases**, UI и CRUD знают их отдельно; в `catalog.sqlite` строк CSV **нет**.

**Зачем тащить CSV в слой:** один язык запросов для дашбордов, MCP и блоков — «расходы из finansy» и «строки main.csv» в одном DQL; GROUP BY / SORT без ручного парсинга в виджетах.

**Не делать:** не превращать DQL в «SELECT по произвольному CSV на диске» без схемы; не дублировать Excel в SQLite целиком без инвалидации.

**Рекомендуемая модель (по шагам):**

| Шаг | Что | Смысл |
|-----|-----|--------|
| **6a** | **Виртуальный источник в DQL** | `FROM csv:awn-databases/finansy/rashody/main.csv` или `FROM collection:finansy/rashody` — строки = pseudo-records `path` вида `csv:…#row:12`, поля = колонки schema + системные (`awn-id`, …) |
| **6b** | **Индексатор CSV → storage-index** (опционально) | При sync workspace: N строк → те же `records` + EAV в `catalog.sqlite`; инвалидация по mtime файла + hash |
| **6c** | **UNION в одном запросе** | `FROM md:awn-container/…` + `FROM csv:…` или один `FROM` с auto-discover коллекций по manifest — позже |

**Мнение:** начать с **6a (on-demand или lazy cache на запрос)** — меньше риска рассинхрона с редактором CSV; **6b** — когда нужны быстрые GROUP BY на больших таблицах и hybrid с `WITH TEXT` по ячейкам (отдельно). Парсер AST уже есть; добавить **источник (source)** в `FROM`, не ломая legacy `pathPrefix`.

**Критерий готовности 6a:** DQL `FROM csv:…` возвращает те же shape `{ path, fields }`, что md; fence/дашборд без изменений рендера.

- [x] **6a MVP** — `FROM csv:…/file.csv`, `FROM collection:…` (on-demand fallback) — `dql/csv-source.js`
- [x] **6b** — CSV-строки в общем `index.json` + `catalog.sqlite` (`source_kind`, `csv_source_path`); `source_kind` / `file.type`; `FROM awn-databases/…` находит md **и** csv; пересборка storage-index
- [x] **6c-lite** — `FROM a, b` (префиксы через запятую → OR)
- [x] **csv-files** — индекс всех `{id}.csv` в csv-files коллекциях
- [x] **Экспорт** — `POST query` + `format: csv|json`; кнопка **CSV ↓** в модалке DQL
- [x] **Конструктор** — фильтр `source_kind` (md / csv-row)
- [x] **Link counts в SQLite** — `inlink_count` / `outlink_count`; WHERE/SORT по `file.inlink-count` без full memory
- [x] **Views `$from`** — `applyDqlParams` + поле в UI Views
- [x] **Hybrid CSV** — `WITH TEXT` ищет по ячейкам csv-row (`csv-cell`)
- [x] **dql-chart** — виджет `awn-dashboard-present: dql-chart` + GROUP BY
- [x] **@transform** в API (строка `@transform` или `payload.transform`)
- [x] **Scope поиска** — `scopePrefix` / scope chip в шапке + `enforceScope`
- [x] **Views `$limit`** + **JSON ↓** в модалке DQL

---

## Ещё идеи (кратко, backlog)

| Идея | Зачем |
|------|--------|
| **`@transform` в DQL API** (server-side pick/limit) | Меньше трафика; сейчас только в fence/дашборде |
| **Экспорт результата DQL → CSV/JSON** | Отчёты, выгрузка в каналы |
| **Виджет chart из DQL GROUP BY** | `present: dql` + `awn-dashboard-present: chart` с `source: dql:` |
| **Inline DQL** в preview (`= this.file`) | Как Dataview inline — отдельный парсер, не приоритет |
| **Параметры view** `{ $from }` в saved views | Переиспользование views на разных папках |
| **Link-index в SQLite** | `file.inlinks` без memory-only |
| **Materialized view** | Cron пересчитывает тяжёлый DQL → `.agent-cms/cache/dql-views/…json` |
| **Sandbox JS-блок** | Не DataviewJS; отдельный `awn-query-js` с whitelist API |
| **Obsidian import** | Маппинг ```` ```dataview ```` → наш DQL + подсказки несовместимого синтаксиса |
| **ACL / scope** | DQL только внутри `allowedPaths` workspace (как hybrid) |

Приоритет после CSV-источника: **chart из GROUP BY**, **экспорт**, **link stats в SQLite**.
