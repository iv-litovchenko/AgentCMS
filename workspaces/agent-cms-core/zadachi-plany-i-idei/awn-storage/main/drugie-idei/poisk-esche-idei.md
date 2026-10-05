---
awn-materials: ""
awn-status: open
awn-quality: 4
awn-emoji: ""
awn-note-todo-sticker: ""
awn-focus: false
awn-main: false
awn-runtime-load-always: false
awn-runtime-heartbeat: false
awn-runtime-cron: false
awn-runtime-cron-schedule: ""
awn-runtime-commands: false
awn-category: ""
awn-owner: ""
awn-priority: ""
awn-color: ""
awn-tags: []
awn-type: awn.content.record
awn-create: "2026-09-17T22:32:29.896Z"
awn-location-label: ""
awn-location-coordinates: ""
awn-is-real-world-object: false
awn-is-real-world-event: false
awn-mindmap-enabled: true
awn-mindmap-type: optional
awn-mindmap-color: slate
awn-mindmap-size: auto
awn-mindmap-layout-independent: false
awn-mindmap-direction: auto
awn-attachments: []
awn-description: ""
awn-name: Поиск еще идеи
awn-preview: ""
awn-sort: 
awn-web-url: ""
awn-update: 2026-09-17T22:32:46.232Z
awn-version: 2
---

**Что уже есть (5 слоёв + обёртки)**

| Слой | Зачем |
| ---- | ----- |
| Fulltext | слова в `.md/.yml/.json/…` |
| Semantic | смысл (offline TF-IDF) |
| Storage | поля frontmatter, фильтры |
| Links | wikilink / markdown / relation |
| OCR | текст из PDF/картинок |
| + hybrid, batch, facts, web |  |

**Про код и репозитории — да, частично уже можно**

Код в workspace (`repository/`, `scripts/`, клон) агент **читает** (`read_file`, `list_folder`, `exec_*`, `run_script`) и **может отвечать по проекту**, если сам откроет нужные файлы.

Но **в индексы код почти не попадает**: fulltext/semantic сейчас на `.md/.yml/.json/.txt/.csv`, link-index — только `.md`. **`.py/.js/.ts/.go` в поиске не индексируются.**

***

**Чего не хватает (если «всё открутили» для CMS-памяти)**

1. **Code search** — fulltext/semantic по `.py/.js/.ts/…`
2. **Symbol index** — функции, классы, import graph (не markdown-links)
3. **Git search** — история, blame, «когда меняли X»
4. **Link в hybrid** — граф отдельно, не в одном запросе
5. **Настоящие embeddings** — сейчас hash-TF-IDF, не LLM-vectors
6. **Поиск по тегам как граф** — опционально (storage уже фильтрует `awn-tags`)

***

**Итог**

Для **заметок/CMS/архива** — стек закрыт.Для **«спроси агента про код в репо»** — работает через чтение файлов, но **нет быстрого «найди `authenticateUser` во всём проекте»** — это следующий логичный слой: **code index + symbol/import graph**.