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
- [ ] **`WITH TEXT "..."`** + hybrid search — не сделано
- [x] **registry-queries:** `source: dql` + `dql:` / `query.dql`

### Фаза 4 — UI и markdown (опционально)

- [x] Fence `` ```awn-query `` `` / `` ```dataview `` `` → `awn-system/renderers/dql-table.js`
- [ ] Панель дашборда: редактор DQL + saved views
- [ ] Autocomplete полей в shell

### Фаза 5 — безопасность и perf

- [x] Только compiled SQL из AST (клиент не шлёт raw SQL)
- [x] Лимиты: длина DQL, depth AST, `limit` ≤ 500 — `dql/limits.js`
- [ ] Query timeout; инкрементальный sync SQLite

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

**Новые модули (предложение):**

- `lib/indexes/storage-index/dql/parse.js`
- `lib/indexes/storage-index/dql/compile-sqlite.js`
- `lib/indexes/storage-index/dql/execute.js`

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
