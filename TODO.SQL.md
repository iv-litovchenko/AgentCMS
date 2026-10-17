# DQL-lite / storage-index

**Статус:** MVP + фазы 0–5, CSV (6a–6c-lite), **csv-fulltext-index**, **dql-chart presets** — сделаны. Док: `lib/indexes/storage-index/dql/GRAMMAR.md`, для агента — `workspaces/0-md/GLOBAL-SKILL-1-BASE.md` (раздел 14).

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

---

# Реестр сущностей (entity-index) — гибридный поиск по людям, темам, проектам

**О чём:** экспериментальный слой индекса сущностей в заметках (regex, frontmatter, wikilinks, теги, опционально GLiNER) + правила в `entity-registry.yml` + SQLite + UI-редактор и фильтры в `search/hybrid` / MCP.

**Статус чата:** MVP (индекс, API, MCP, модалка редактора, seeds/aliases/reject, установка GLiNER в deps). Ниже — **не довели до конца**.

## Не реализовано (entity-index)

| # | Что | Зачем / как потом |
|---|-----|-------------------|
| 1 | **Фильтр шума wikilinks для «Темы»** | Переключатель «скрыть редкие (≤1)» или отдельный подтип, чтобы список из 80+ wikilinks не забивал UI |
| 2 | **Полный отказ от `prompt()`** | Тип/объект уже inline-формы; остальные сценарии (если появятся) — тоже в модалке |
| 3 | **GLiNER-метки из типов реестра** | Передавать `types[].label` / id в Python-экстрактор, чтобы NER совпадал с вашими типами («Еда», «Люди»), а не только builtin |
| 4 | **Документация GLiNER** | Явный блок в platform docs / requirements: venv `.venv-entity`, флаг `index-entity-gliner-enabled`, время пересборки |
| 5 | ~~**MCP reject / seed / registry / catalog / explain**~~ | ✅ `map-tools.js` (reject, seed, get/put registry, upsert type, catalog, explain) |
| 6 | **Canvas-мок редактора** | `entity-registry-editor-mock.canvas.tsx` — черновик, не прод-UI |
| 7 | **Проверка «entity ВЫКЛ» и настройки UI** | Убедиться после рестарта: слой entity в мониторе, поля `index-entities-enabled` / `index-entity-gliner-enabled` в схеме и форме настроек |
| 8 | **Commit / PR** | Изменения в ветке не зафиксированы в этом чате |
| 9 | **Полный YAML-редактор реестра** | Aliases, reject, types, seeds в одном экране (сейчас — модалка + открытие `entity-registry.yml` отдельной кнопкой) |
| 10 | **Тесты UI / e2e редактора** | Только unit-тесты экстракции; браузерные сценарии «+ объект», hybrid search — нет |
| 11 | **Автонаполнение «пустых» типов без тегов** | Кроме GLiNER и ручных seeds — нет отдельной магии; нужны теги, wikilinks или пересборка после правил |

## Backlog (entity-index)

- [ ] Фильтр / сортировка списка объектов в редакторе (шум topic).
- [ ] GLiNER ↔ `entity-registry.types`.
- [ ] MCP reject + документация установки.
- [ ] E2E или smoke-тест API редактора.
- [ ] Единый экран правил реестра (aliases/reject).

**Код:** `lib/indexes/entity-index/*`, `public/js/panels/entity-registry-editor.js`, `server.js` (`/api/entity-index/*`), hybrid — `lib/services/workspace-brain-service.js`, MCP — `mcp-server/lib/map-tools.js`.
