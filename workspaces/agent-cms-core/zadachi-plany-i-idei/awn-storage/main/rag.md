---
awn-materials: ""
awn-status: open
awn-emoji: ""
awn-category: ""
awn-owner: ""
awn-priority: ""
awn-color: ""
awn-tags: []
awn-type: awn.content.record
awn-create: "2026-08-10T19:47"
awn-attachments: []
awn-description: ""
awn-main: false
awn-name: RAG
awn-preview: ""
awn-runtime-commands: false
awn-runtime-cron: false
awn-runtime-cron-schedule: ""
awn-runtime-heartbeat: false
awn-runtime-load-always: false
awn-sort: 
awn-web-url: ""
awn-update: 2026-08-10T16:51:13.568Z
awn-version: 2
---

Что ещё делают с RAG + полями

1. **Гибридный поиск** (текст + смысл)
    Что: один запрос → два списка результатов, потом общий топ.

Запрос: "расходы на обед"→ полнотекст: файлы со словом "обед"→ semantic: файлы про траты/рестораны без слова "обед"→ merge + rerank → топ-10Как выглядит: в шапке один input, в результатах badge текст / смысл / оба, score 0.92.

2. **RAG для агента**
    Что: поиск не для человека, а контекст для LLM — нашли 5 фрагментов → автоматически в prompt.

User: "что мы решили про cron?"Agent: search_workspace_semantic → 3 snippet → read_file → ответ с цитатамиКак выглядит: MCP-tool search_and_get_context или автоматически перед ответом агента. В UI — блок «Контекст для агента» с найденными кусками.

3. **Фильтры / фасеты**
    Что: сузить поиск до подмножества до или после query.

pathPrefix: finansy/where: awn-date >= 2026-03-01tags: expense

* semantic: "командировка"Как выглядит: sidebar или панель: чекбоксы тегов, date picker, dropdown типа. У вас поля — через query_workspace_storage; смысл + фильтр вместе — пока нет (нужен hybrid API).

4. **Граф связей**
    Что: не «найти по словам», а «что связано с чем» — [[ссылки]], manifest → topic → record.

note-A.md ──links──► note-B.mdmanifest.md ──topic──► main/readme.mdКак выглядит: отдельная вкладка «Карта» (у вас есть graph/mindmap зачатки), клик по узлу → файл. Поиск: «покажи соседей этой заметки».

**Кросс-agent (per-agent индексы)** — краткоagent-cms-test/ agent-cms-core/.agent-cms/ .agent-cms/semantic-index/ semantic-index/ ← разные файлыstorage-index/ storage-index/awn-storage/... awn-storage/...Каждый agent = отдельный workspace = свой индекс.Переключил agent в UI → другой индекс, другие результаты.MCP: AGENT_CMS_AGENT=agent-cms-test → ищет только в test.Нельзя одним запросом «найди во всех агентах» через semantic/storage (есть только search/global для полнотекста по нескольким agents).


## Что уже есть (база)

| Слой | Статус |
|------|--------|
| Полнотекст | `search_workspace_content` (скан) |
| Смысл | `semantic-index` (hash-TF-IDF, не нейросеть) |
| Поля | `storage-index` (SQL-like по frontmatter) |
| Оглавления | `INDEX.md` / `index.md` |
| Структурные store | `awn-data` (коллекции, схемы) |

---

## Что логично внедрить дальше

### Быстрые wins (на текущей архитектуре)

1. **Гибридный поиск** — один запрос: полнотекст + semantic + merge. Сейчас два отдельных инструмента.
2. **Semantic + фильтры** — «командировка» *и* `awn-date >= 2026-03-01`. Сначала `storage-index`, потом semantic по отфильтрованным path.
3. **RAG для агента** — MCP `search_and_get_context`: нашёл 5 chunk'ов → сразу snippets в prompt, без ручного `read_file`.
4. **Авто-sync индексов** — после save уже есть `sync-file`; можно включить по умолчанию, чтобы не жать «Переиндексировать».
5. **Фасеты в UI** — теги, тип, дата из `fieldCatalog` storage-index (чекбоксы в sidebar).

---

### Средний уровень (сильнее, но файлы остаются truth)

6. **Настоящие embeddings** — заменить hash-TF-IDF на ONNX / Ollama / `transformers.js`. Качество «по смыслу» заметно вырастет.
7. **Typed stores + query** — для финансов/задач: схема в `awn-data`, записи в `.md`, индекс как сейчас, но API `query_finance({ month, type })` с фиксированными полями, а не все 95 колонок workspace.
8. **SQLite materialized view** — тот же storage-index, но в SQLite для JOIN, GROUP BY, SUM по `amount`. Файлы → sync → `.agent-cms/catalog.sqlite`.
9. **Link graph index** — `[[wiki-links]]`, manifest→topic→record; «соседи заметки», карта связей (зачатки graph/mindmap уже есть).

---

### Крупнее (если нужна «настоящая БД»)

10. **4 таблицы памяти агента** — `facts`, `episodes`, `procedures`, `content_records` (из ваших RAG-заметок). Markdown для человека, SQL для аналитики.
11. **Cross-agent search** — один запрос по всем workspace (сейчас semantic/storage только per-agent).
12. **Incremental full-text index** — inverted index вместо полного скана при каждом `search_workspace_content`.

---

## Что **не** стоит тащить сразу

- Полный MySQL вместо файлов — ломает «вижу в Obsidian = вижу в CMS».
- Elasticsearch / Qdrant — overkill, пока не упёрлись в масштаб.
- Ещё один тип индекса «на всякий случай» — лучше **склеить** semantic + storage + fulltext в один UX/API.

---

## Практичная очередь (если выбирать 3)

```
1. Гибридный API (текст + смысл + where)
2. RAG-контекст для агента (автоматически в prompt)
3. Typed query для одной темы (финансы) поверх storage-index
```

Это закрывает главную боль из прошлого разговора: *«расходы за март»* — без обхода 200 файлов и без отдельной MySQL.

Если скажешь приоритет (агент / UI / финансы / память) — можно сузить до одного конкретного MVP.