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