# DQL-lite / storage-index

**Статус:** MVP + фазы 0–5, CSV (6a–6c-lite), **csv-fulltext-index**, **dql-chart presets** — сделаны. Док: `GLOBAL-DOC-MCP.md` § DQL-lite, `lib/indexes/storage-index/dql/GRAMMAR.md`.

## Сейчас (as-is)

| Компонент | Где |
|-----------|-----|
| Каталог | `.agent-cms/cache/indexes/storage/index.json` (+ CSV rows, `source_kind`) |
| SQLite | `catalog.sqlite` — EAV, link counts, DQL compile |
| CSV fulltext/semantic | `.agent-cms/cache/indexes/storage/csv-fulltext-index.json` (пересборка с storage-index) |
| Запросы | Legacy JSON **или** строка **`dql`** |
| API | `POST /api/storage-index/query` (`format: csv\|json`, `scopePrefix`, `transform`) |
| MCP | `query_workspace_storage` + `dql` |
| Views | `.agent-cms/settings/dql-views.yml` — `$from`, `$limit` |
| UI | Шапка **DQL**, fence `dataview` / `awn-query`, дашборд `dql` / `dql-chart` (+ presets `awn-dashboard-chart-preset`, типы bar/line/pie/donut/hbar) |
| Тесты | `node --test lib/indexes/storage-index/dql/*.test.js lib/indexes/storage-index/csv-fulltext-index.test.js` |

Код: `lib/indexes/storage-index/service.js`, `dql/*`, `csv-fulltext-index.js`, `dql-views.js`, `public/js/cms/awn-dashboards.js`.

---

## Не реализовано (кратко)

| # | Что | Почему / как потом | Решение / комментарий |
|---|-----|---------------------|------------------------|
| 1 | **DataviewJS** / произвольный JS в блоках | Отдельный sandbox `awn-query-js`, не DQL | **Не нужно** |
| 2 | **Raw SQL** из MCP/API | Только AST → compiled SQL | **Оставить как сейчас** |
| 3 | **`file.inlinks` / `file.outlinks`** (списки) | counts в SQLite; списки — memory + link-index | **Пока не нужно** |
| 4 | **Materialized views** | Cron → кэш тяжёлых DQL | **Пока рано** |
| 5 | **Глобальный ACL** для DQL | Авто-ограничение DQL/MCP по allowedPaths | **Не понял** → scope chip сейчас |
| 6 | **Inline DQL** | Выражения в тексте абзаца | **Не понял** → только блоки/модалка |
| 7 | **Полный 6c** (union) | `FROM md:` + `FROM csv:` явно | **Не понял** → comma-OR префиксов хватает |
| 8 | ~~**Fulltext/semantic по ячейкам CSV**~~ | ✅ `csv-fulltext-index.json` + `WITH TEXT` | **✅ сделано** |
| 9 | **Obsidian import / подсказки** | lint несовместимого синтаксиса | **Пока не нужно** |
| 10 | **PostgreSQL / внешняя БД** | — | **Пока не нужно** |
| 11 | **Замена CRUD / `read_content`** | DQL только read-каталог | — |

---

## Backlog (приоритет)

- [x] **Fulltext/semantic индекс по ячейкам CSV** — `csv-fulltext-index.js`, rebuild с storage-index.
- [x] **Chart presets на дашборде** — `awn-dashboard-chart-preset`, pie/donut/hbar, демо в `agent-cms-test`.
- [ ] Глобальный ACL для DQL — уточнить необходимость (п. 5).
- [ ] Materialized views — отложено (п. 4).
- [ ] ~~Link lists / DataviewJS / Obsidian / PostgreSQL~~ — не в приоритете.

---

## Сравнение с Obsidian (итог)

| | Dataview | DQL-lite |
|--|----------|----------|
| FROM folder / csv | ✓ | ✓ |
| OR, GROUP, file.*, WITH TEXT | ✓ | ✓ |
| CSV cell search (indexed) | — | ✓ |
| Inline / JS | ✓ | ✗ backlog |
| MCP | — | ✓ |
