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
awn-create: "2026-09-17T10:04"
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
awn-name: Инструменты и пакеты памяти
awn-preview: ""
awn-sort: 
awn-web-url: ""
awn-update: 2026-09-17T07:09:55.020Z
awn-version: 4
---

## Сравнение: что взять из каждого проекта и как это ляжет в YamlCMS

| Проект | Кратко что это | Что взять | Зачем это нужно | Как это будет выглядеть у вас |
| ------ | -------------- | --------- | --------------- | ----------------------------- |
| [mem0](https://github.com/mem0ai/mem0) | Слой памяти для агентов: LLM вытаскивает факты из чата, потом hybrid-поиск | • Auto-extract фактов из диалога

• Entity linking (связь сущностей)
• Temporal recall («сейчас» vs «раньше») | Сейчас `retain_workspace_fact` ручной. Автоизвлечение снимет рутину. Entity/temporal помогут не путать «живу в Москве» и «переехал в Питер» | Не отдельный сервис, а:

• tool `extract_facts_from_dialog`
• поле `awn-entities: [город, проект]`
• в `recall_workspace_facts` — фильтр `as_of` / `current_only` |
| [context-llemur](https://github.com/jerpint/context-llemur) | Git-репозиторий контекста + MCP, без embeddings | • Workflow `explore` → `integrate` (ветка для эксперимента с контекстом) | У вас уже есть git + markdown + MCP. Не хватает явного «поиграл с идеей → влил в main» | Не новый продукт, а паттерн:

• `create_context_branch` / `merge_context_branch`
или через inbox/topic как «черновик контекста» |
| [LongMemory](https://github.com/CaviraOSS/LongMemory) | Cognitive memory: время, конфликты, decay, token-budget | • Decay (вес старых фактов падает)

• Recall modes (`current` / `historical`)
• Token-budget packing
• Contradiction gates | Закрывает 3 главных дыры: старые факты мешают, конфликты не решаются, контекст не упакован под лимит окна | Расширение brain/facts, не отдельный движок:

• `pack_workspace_context({ query, max_tokens })`
• `recall_workspace_facts({ mode: "current" })`
• score: `relevance × recency × access_count` |
| [GibsonAI/memori](https://github.com/GibsonAI/memori) | Память из действий агента (tool calls, outcomes), не только из текста | • Execution trace → facts

• Уровни: entity / process / session
• Auto-capture после сессии | Сейчас сохраняются решения, но теряется «пробовали X → упало → сделали Y» | Новый kind + tool:

• `retain_workspace_fact({ kind: "trace", body: "..." })`
• или слот `awn-traces/`
• hook после MCP-сессии: `capture_session_outcomes` |
| [SimpleMem](https://github.com/aiming-lab/SimpleMem) | Сжатие и атомизация памяти: меньше токенов, тот же смысл | • Semantic compression фактов

• Атомизация (1 факт = 1 утверждение)
• EvolveMem — позже | Длинные `awn-dialogs/` и раздутые facts жрут контекст. Сжатие даст тот же recall при меньшем размере | Sidecar-слой, не замена файлов:

• `awn-facts/foo.md` + `foo.compressed.md`
• или поле `awn-compressed-body`
• в recall — сначала compressed, full по запросу |
| [OpenViking](https://github.com/volcengine/OpenViking) | Context DB как filesystem с уровнями L0/L1/L2 | • L0 abstract (1 строка)

• L1 overview (кратко)
• L2 full (полный файл)
• Directory-first search
• Session → memory extraction | Самый практичный паттерн под token budget: не тащить весь файл, а грузить по уровням | Sidecar-файлы + retrieval:

• `topic/.abstract.md`, `topic/.overview.md`
• `read_page_body({ level: "L0" })`
• в `ask_workspace` — сначала L0/L1, L2 только если score высокий |

***





***

## Что из этого — отдельные tools, а что — внутренняя логика

| Что добавить | Тип | Пример API |
| ------------ | --- | ---------- |
| Упаковка контекста под лимит | новый tool | `pack_workspace_context({ query, max_tokens: 4000 })` |
| Recall только актуальных фактов | параметр существующего tool | `recall_workspace_facts({ mode: "current" })` |
| L0/L1/L2 уровни | sidecar-файлы + параметр read | `read_page_body({ level: "L0" })` |
| Decay | внутренний scoring | без нового tool, меняется ранжирование в recall |
| Auto-extract из диалога | новый tool / cron | `extract_facts_from_dialog({ path })` |
| Execution trace | новый kind + tool | `retain_workspace_fact({ kind: "trace" })` |
| Explore/integrate контекста | workflow tools | `create_context_branch` / `merge_context_branch` |
| Compression | фоновый процесс | rebuild index / sidecar, не отдельный MCP tool |

***

## Приоритет внедрения

| # | Откуда | Что | Эффект | Сложность |
| --- | ------ | --- | ------ | --------- |
| 1 | LongMemory + OpenViking | `pack_workspace_context` + L0/L1/L2 | Сразу меньше переполнение контекста | средняя |
| 2 | LongMemory | `recall mode: current` (фильтр `supersedes`) | Не путаются старые и новые факты | низкая |
| 3 | LongMemory | decay в scoring | Старые неиспользуемые факты уходят вниз | средняя |
| 4 | mem0 | auto-extract из `awn-dialogs/` | Меньше ручного `retain` | средняя |
| 5 | memori | trace facts | Память «что реально делали», не только «что сказали» | выше |
| 6 | SimpleMem | compression | Экономия токенов на длинной истории | высокая |

***

## Короткий вывод

| Проект | Брать целиком? | Главная ценность |
| ------ | -------------- | ---------------- |
| mem0 | нет | автоизвлечение + entity/temporal |
| context-llemur | нет | вы уже это делаете |
| LongMemory | нет, но главный источник идей | decay, modes, token budget |
| memori | нет | память из tool calls |
| SimpleMem | нет | сжатие (позже) |
| OpenViking | нет, но главный UI-паттерн | L0/L1/L2 loading |

Ни один проект не нужен как отдельный инструмент в стеке. Берёте паттерны и встраиваете в существующие `ask_workspace`, `recall_workspace_facts`, `always-context` и `awn-facts/`.
Если нужно — могу следующим шагом сделать таблицу только по конкретным MCP tools (имя, параметры, пример ответа) для топ-3 приоритетов.