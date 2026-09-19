---
awn-materials: ""
awn-status: open
awn-quality: 4
awn-emoji: ""
awn-note-todo-sticker: ""
awn-main: false
awn-focus: false
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
awn-id: 4
awn-type: awn.content.record
awn-create: "2026-09-19T16:09"
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
awn-name: Дискуссия - суммаризация
awn-preview: ""
awn-sort: 
awn-web-url: ""
awn-update: 2026-09-19T13:10:26.785Z
awn-version: 3
---

**Кратко:** всю базу «целиком в контекст» не запихнуть — 10k заметок ≠ один prompt. Но можно сделать **слой обзора + автодобычу**, чтобы тебе не говорить «найди финансы» каждый раз.

### Что уже близко у вас

* **Semantic / hybrid** — не нужны точные слова, достаточно смысла фразы
* **`get_page_map` / `get_content_index`** — карта всего workspace (структура, не содержимое)
* **`search_and_get_context` / `ask_workspace`** — агент сам ищет и тащит snippets
* **Link graph** — обход от любой точки, не только keyword
* **Storage-index** — фильтр по полям без знания пути

### Что можно придумать (практично)

**1. Workspace Digest (лучший вариант)**Периодически генерировать **сжатый обзор**:

* по каждой теме: 1–3 строки «что там есть»
* топ-теги, активные области, «горячие» файлы→ агент **всегда** держит это в always-context (~50–200 KB, не 10k файлов).

**2. Auto-retrieval по диалогу**Не ты формулируешь запрос — система берёт **последние 2–3 реплики** → hybrid search → top-5–10 chunks в контекст **автоматически** перед ответом.

**3. Иерархическая память (3 уровня)**

| Уровень | Что | Размер |
| ------- | --- | ------ |
| L0 | Карта WS (темы, слоты) | всегда |
| L1 | Digest / summaries | always или по agent |
| L2 | Полные файлы | только по retrieval |

**4. Topic fingerprints**На каждую тему не full text, а **«отпечаток»**: ключевые слова, entities, 5 главных файлов, schema-поля. Агент смотрит отпечатки → решает куда нырнуть.

**5. «Lazy whole-base» через индексы**Не суммаризация, а **retrieval как память**: embedding всего WS уже есть (semantic-index) → любая твоя реплика = неявный запрос ко всей базе. Тебе не нужно знать *где* — только *о чём* говоришь.

### Что **не** работает

* Сжать 10k заметок в один doc без потерь — **нет**
* Держать всё в prompt — **нет** (лимит контекста)
* «Возьми что хочешь» без ни одного сигнала — **нет** (нужен хотя бы контекст разговора или digest)

### Мой совет для Agent CMS

```
always-context: page_map + workspace_digest.md (auto-rebuild раз в N часов)  
+ auto hybrid search на каждый user message  
+ retain_workspace_fact для важного из сессий  
```

**Итог:** не «вся база в агента», а **карта + digest + автопоиск по смыслу беседы**. Тогда ты говоришь абстрактно («что там по командировкам?»), а система сама: digest → semantic → файлы.

Если захочешь — в Agent mode могу набросать `workspace_digest` job + auto-retrieval hook в MCP/чат.

**Кратко — два слоя:**

### 1. Куда пишется (файл)

Логичнее всего — **сгенерированный артеfact в индексном слое**, как semantic/storage:

```
.agent-cms/workspace-digest.md  
```

или разбивка по частям:

```
.agent-cms/digest/  
topics.md      — 1–2 строки на тему  
recent.md      — недавнее  
meta.json      — машинные метаданные (builtAt, counts)  
```

Не в `awn-facts/` (там атомарные факты) и не в заметки тем.

### 2. Как агент это «видит»

Digest **подключается в always-context** — как `GLOBAL_MCP_DOC.md` или файлы с `awn-runtime-load-always: true`:

* попадает в `get_session_context` / `list_workspace_always_context`
* агент получает сжатую карту **без** явного «найди финансы»

### Итог

| Что | Где |
| --- | --- |
| **Пишет job** | `.agent-cms/workspace-digest.md` |
| **Читает агент** | always-context (авто в каждой сессии) |
| **Обновление** | cron / после `rebuild_workspace_indexes` / по save |

Ручная правка — опционально через `read_workspace_note`-подобный sidecar, но **source of truth = автоген**.