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
awn-runtime-cron-schedule: "0 9 * * *"
awn-runtime-commands: false
awn-category: ""
awn-owner: ""
awn-priority: ""
awn-color: ""
awn-tags: []
awn-type: awn.content.record
awn-create: "2026-09-14T21:44"
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
awn-name: Поиск идеи иснтурменты
awn-preview: ""
awn-sort: 
awn-web-url: ""
awn-update: 2026-09-14T18:44:35.054Z
awn-version: 2
---

Хороший вопрос, тут вообще-то классическая проблема поиска — и есть несколько стандартных подходов:

**1. Искать не по названию, а по описанию/сути**Вместо «как называлась эта штука» — описываешь, *что это делает* или *в каком контексте встречал*. Semantic-поиск (эмбеддинги) как раз для этого и создан: он ищет по смыслу, а не по точным буквам. Например, вместо «qwenpaw» — «агентный фреймворк на базе Qwen, который мы тестировали как альтернативу Claude Code». Именно это и работало у нас в примерах — «paw» нашёл и QwenPaw, и CoPaw, потому что смысловой слой уловил контекст.

**2. Fuzzy-matching / нечёткий поиск по буквам (Levenshtein, n-граммы)**Это то, чего у agent-cms сейчас **нет** — учитывает опечатки, переставленные буквы, похожие написания («qwenpaw» vs «qwenpawe» или «квенпав» нашлись бы). Обычно это отдельный слой: PostgreSQL `pg_trgm`, Elasticsearch fuzzy query, или библиотеки типа `Fuse.js` для клиентского fuzzy-search. В твоём случае это можно было бы добавить как ещё один сервис в agent-cms — я упоминал `search_workspace_hybrid` и `search_workspace_semantic`, но настоящего fuzzy там нет.

**3. Спросить у самого workspace через reasoning-слой (`ask_workspace`)**Вместо точного текстового запроса — задать вопрос человеческим языком: *«у нас было что-то похожее на клешню/лапу, связанное с Qwen, не помню точное название»*. Это композитный инструмент (semantic + fulltext + always-context), он может сработать лучше одиночного запроса, потому что использует больше контекста сразу.

**4. Браузинг по структуре, а не поиск**Если вспоминаешь хотя бы тему или раздел («это было где-то в исследованиях агентов») — идти через `get_content_map` / оглавление темы, а не через поиск. У тебя, например, есть тема «[Исследуем] Claw-агенты» — там как раз лежал `copaw-qwenpaw.md`.

**5. Банк фактов, если раньше сохранял решение**Если это была важная штука, которую ты фиксировал как решение/сущность — `recall_workspace_facts` ищет только в выжимках-фактах, там меньше шума, чем по всему workspace.

Практический совет для твоего случая: если добавлять полноценный fuzzy-поиск как фичу в agent-cms — это отдельный кусок работы (индекс триграмм или что-то вроде Typesense/Meilisearch, у которых fuzzy "из коробки"). Хочешь, накидаю, как это может выглядеть архитектурно?