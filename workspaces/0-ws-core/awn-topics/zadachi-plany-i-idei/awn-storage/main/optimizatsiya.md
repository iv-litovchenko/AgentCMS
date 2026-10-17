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
awn-id: 5
awn-type: awn.content.record
awn-create: "2026-09-20T00:05"
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
awn-name: Оптимизация
awn-preview: ""
awn-sort: 
awn-web-url: ""
awn-update: 2026-09-19T21:05:59.928Z
awn-version: 3
---

## Задача: оптимизация журнала и колокольчика

### Цель

Убрать лишний парсинг `.md` при росте числа записей. **Markdown в git остаётся источником правды.**

### Проблема

* Колокольчик опрашивает API каждые ~3 с
* Сервер сканирует до 24 недель журнала и парсит markdown
* При тысячах записей — лишняя нагрузка на CPU и диск

### Этап 1 — быстрые фиксы (без SQLite)

1. **Инкрементальный poll**

* При `since > 0` читать только новые записи, не пересканировать все недели
* Ограничить поиск: текущая неделя + 1–2 предыдущие, не 24

2. **Серверный кэш**

* В памяти (или sidecar `.agent-cms/journal-index.json`): `latestId`, `latestAt`, хвост последних N=100–200 событий
* Обновлять при `append_journal_entry`, не при каждом GET

3. **API колокольчика**

* `GET /workspace-notifications?since=N` → ответ из кэша, без полного парсинга
* Fallback на парсинг md только при cold start / рассинхроне

4. **UI**

* Не дергать full refresh без нужды; увеличить интервал poll, если вкладка неактивна (`document.hidden`)

5. **Журнал (список)**

* Пагинация / `limit` + `offset` или `beforeAt`
* Рендер только видимой порции, не весь список

### Этап 2 — опционально, если записей >5–10k

**Гибрид SQLite** (`.agent-cms/journal.db`, в `.gitignore`):

* `append` → md + sqlite
* Списки, фильтры, колокольчик → sqlite
* md — архив для git и ручного чтения
* Скрипт `rebuild_journal_index` из существующих `*.md`

### Не в scope сейчас

* Редактирование/удаление записей
* Замена markdown на sqlite как единственное хранилище

### Критерии готовности (этап 1)

* [ ] Poll с `since` не читает старые недели
* [ ] Cold start < 200 ms на workspace с ~1000 записей
* [ ] Append не замедляется
* [ ] Колокольчик и `list_workspace_notifications` дают тот же результат, что сейчас

### Оценка

Этап 1: **1–2 дня**. Этап 2: отдельная задача после замеров.