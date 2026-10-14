# DQL-lite / storage-index

**Статус:** MVP + фазы 0–5 и CSV (6a–6c-lite) **сделаны**. Док: `GLOBAL-DOC-MCP.md` § DQL-lite, грамматика `lib/indexes/storage-index/dql/GRAMMAR.md`.

## Сейчас (as-is)

| Компонент | Где |
|-----------|-----|
| Каталог | `.agent-cms/cache/indexes/storage/index.json` (+ CSV rows, `source_kind`) |
| SQLite | `catalog.sqlite` — EAV, link counts, DQL compile |
| Запросы | Legacy JSON **или** строка **`dql`** |
| API | `POST /api/storage-index/query` (`format: csv\|json`, `scopePrefix`, `transform`) |
| MCP | `query_workspace_storage` + `dql` |
| Views | `.agent-cms/settings/dql-views.yml` — `$from`, `$limit` |
| UI | Шапка **DQL** (Текст / Конструктор / Views), fence `dataview` / `awn-query`, дашборд `dql` / `dql-chart` |
| Тесты | `node --test lib/indexes/storage-index/dql/*.test.js` |

Код: `lib/indexes/storage-index/service.js`, `dql/*`, `dql-views.js`, рендер `workspaces/agent-cms-core/awn-system/renderers/dql-table.js`.

---

## Не реализовано (кратко)

| # | Что | Почему / как потом | Решение / комментарий |
|---|-----|---------------------|------------------------|
| 1 | **DataviewJS** / произвольный JS в блоках | Отдельный sandbox `awn-query-js`, не DQL | **Не нужно** |
| 2 | **Raw SQL** из MCP/API | Только AST → compiled SQL | **Оставить как сейчас** — безопасно, без произвольного SQL |
| 3 | **`file.inlinks` / `file.outlinks`** (списки ссылок) в SQLite | Сейчас counts в SQLite; списки — memory + link-index | **Пока не нужно** (counts достаточно) |
| 4 | **Materialized views** | Cron → кэш тяжёлых DQL в `.agent-cms/cache/dql-views/` | **Пока рано** |
| 5 | **Глобальный ACL** для DQL | Авто-ограничение всех DQL/MCP запросов списком разрешённых путей workspace (как у hybrid search), не только ручной scope chip | **Не понял** → *смысл:* чтобы агент/MCP не мог DQL-ом прочитать метаданные из «закрытых» папок, даже без чипа папки в UI |
| 6 | **Inline DQL** в preview (`= this.field`) | Выражения DQL прямо в тексте абзаца, как в Obsidian inline | **Не понял** → *смысл:* в теле заметки текст «всего: …» считается запросом по текущему файлу, не отдельным блоком |
| 7 | **Полный 6c** (union источников) | Явно `FROM md:…` и `FROM csv:…` в одном запросе; сейчас — несколько префиксов через запятую (= OR путей) | **Не понял** → *смысл:* один синтаксис «склеить md-каталог и csv-строки»; comma-OR уже покрывает «несколько папок», но не явные типы источника |
| 8 | **Fulltext/semantic по ячейкам CSV** | Сейчас hybrid `WITH TEXT` по ячейкам (csv-cell), не отдельный индекс | **Нужно** (приоритет) |
| 9 | **Obsidian import / подсказки синтаксиса** | Маппинг vault + lint «этот оператор не поддерживается» | **Пока не нужно** |
| 10 | **PostgreSQL / внешняя БД** | Центральная БД вместо локального `catalog.sqlite` | **Пока не нужно** |
| 11 | **Замена CRUD / `read_content`** | DQL только read-каталог, не редактирование | — |

---

## Backlog (приоритет)

1. **Fulltext/semantic индекс по ячейкам CSV** (см. п. 8) — по решению: нужно.
2. Chart/дашборд — больше пресетов поверх `dql-chart`.
3. Глобальный ACL для DQL — уточнить необходимость (п. 5).
4. Materialized views — отложено (п. 4).
5. ~~Link lists / DataviewJS / Obsidian import / PostgreSQL~~ — не в приоритете по комментариям выше.

---

## Сравнение с Obsidian (итог)

| | Dataview | DQL-lite |
|--|----------|----------|
| FROM folder / csv | ✓ | ✓ |
| OR, GROUP, file.*, WITH TEXT | ✓ | ✓ |
| Inline / JS | ✓ | ✗ backlog |
| MCP | — | ✓ |
