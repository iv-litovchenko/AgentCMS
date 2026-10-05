---
awn-name: Что то у нас не доработано по связям я
awn-preview: ""
awn-web-url: ""
awn-status: open
awn-quality: 4
awn-importance: 0
awn-note-todo-sticker: ""
awn-emoji: ""
awn-runtime-load-always: false
awn-runtime-heartbeat: ""
awn-runtime-cron: ""
awn-runtime-cron-schedule: ""
awn-runtime-commands: false
awn-viz-graph: ""
awn-viz-mindmap: ""
awn-viz-roadmap: ""
awn-auto-toc: false
awn-summary: ""
awn-tags: []
awn-taxonomy: ""
awn-type: awn.content.record
awn-create: 2026-10-02T17:57:11.974Z
awn-owner: ""
awn-main: false
awn-focus: false
awn-location-label: ""
awn-location-coordinates: ""
awn-is-real-world-object: false
awn-is-real-world-event: false
awn-index-exclude-record: false
awn-attachments: []
awn-materials: ""
awn-description: "Я так и не понял про что ресь и что пыталвся мне сказать курсор"
awn-id: 20
awn-update: 2026-10-02T17:57:13.305Z
awn-version: 2
---

# Что то у нас не доработано по связям я

## Номер чата (Cursor)

`19b8e0d3-2e31-42d8-b3d8-956c92e3cceb`

---

## Сообщение пользователя (запрос записать в файл)

@workspaces/agent-cms-core/obsuzhdeniya/awn-storage/chto-to-u-nas-ne-dorabotano-po-svyazyam-ya.md запиши вот это все что ты мне рассказал дословно в этот файл предыдущее сообщение и это сообщение а также номер чата

---

## Ответ ассистента (предыдущее сообщение, дословно)

**Пробел в одном предложении:** связи в схеме и в YAML есть, но **граф связей их почти не видит**; комментарии ещё и **разными способами** хранят target.

---

**Что плохо / что доработать:**

1. **Link-index не смотрит на тип поля** — только на имя ключа (`parent`, `relation`, …). **`awn-target`**, **`awn-reply-to`** и многие другие relation-поля **в граф не попадают**.

2. **Схема (`awn.field.relation.one`) и граф не связаны** — в форме «связь», в `search_workspace_links` — **нет**, пока не wikilink и не «удачное» имя поля.

3. **Hybrid-поиск не использует граф** — backlinks/соседи только через **`search_workspace_links`**, отдельно от semantic/fulltext.

4. **Два вида комментариев** — слотовые с `awn-target` vs file-comments с target **только в пути папки**; одна модель для агента и индексов **не выровнена**.

5. **В `comment.yml` нет `awn-reply-to`** — в API родитель пишется, в типе **не описан** (форма/валидация/каталог полей хуже).

6. **File-comments при создании не пишут `awn-target`** — storage/граф **не могут** одинаково ответить «все комментарии к X», только путь папки (граф путь **не разбирает**).

7. **Storage в порядке для полей в YAML** — это не главная дыра; дыра именно в **🕸️ графе** и **единообразии данных** (п. 1, 4, 6).

---

**Приоритет правок:** сначала **1 + 6 + разбор пути `…/comments/<target>/…`** → потом **4–5** (схема и один способ хранения) → опционально **3** (links в hybrid).
