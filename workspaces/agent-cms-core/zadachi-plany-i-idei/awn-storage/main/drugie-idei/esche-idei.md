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
awn-create: "2026-09-14T21:57"
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
awn-name: Еще идеи
awn-preview: ""
awn-sort: 
awn-web-url: ""
awn-update: 2026-09-14T18:57:33.076Z
awn-version: 2
---

Кратко одной фразойRuntime hooks превращают тему из пассивного хранилища в активную сущность, которая может:

* постоянно держать что-то в контексте агента,
* запускать задачи по расписанию,
* регулярно себя проверять,
* предоставлять собственные команды.Хочешь, я могу показать, как это обычно выглядит в manifest.md / schema-mod.yml на примерах, или разобрать конкретный runtime из какого-то workspace.

В структуре Agent CMS учтено почти всё для работы с памятью и контентом, но для масштабирования до полноценной AI-OS могут всплыть 4 слепые зоны:

1. State & Execution (Состояние и процессы): Нет явной сущности для хранения длительных асинхронных тасок и их промежуточных состояний (step-by-step checkpoint / state machine), если процесс упал или прерван mid-way.
2. Access & Security (Права и области видимости): Все данные видны агенту одинаково. Не хватает слоя ACL / Scope Policy (публичные данные vs приватные токены/секреты в awn-data), чтобы случайный промпт не утек в веб-поиск или external MCP.
3. Graph & Cross-References (Явные ребра связей): Есть фильтры по полям и семантика, но нет онтологического графа связей (Explicit Graph / Backlinks index) — например, для быстрого каскадного удаления/обновления («что сломается, если удалить эту тему?»).
4. Garbage Collection & Archiving (Жизненный цикл): Отсутствует стратегия старения данных — механизмы автоматически сжимать/архивировать старые awn.slot.history, dialogs или temp, чтобы они не раздували семантический индекс и дисковое пространство.

Главное, чего не хватает — это **версионирования и коллаборации**.

Сейчас у тебя есть `history/` слот, но это скорее архив, чем настоящий git-like diff. Если два агента или человек и агент одновременно правят одну запись — кто победит? Нет блокировок, нет merge, нет понятия «чья версия актуальна».

Второе — **права доступа**. Workspace один, агентов может быть много, но нет модели «кто что может». Агент A видит всё, что видит агент B. Для личных тем это ок, для командных — дыра.

Третье — **зависимости между темами**. Topic A ссылается на запись в Topic B. Удалил B — A молча сломался. Нет графа связей, нет проверки целостности.

И четвёртое, более тонкое — **жизненный цикл записи**. Статус есть, но нет переходов: из «черновик» можно сразу в «опубликовано», минуя ревью. Нет workflow как такового.

Это не критика — это то, что обычно всплывает, когда система вырастает из одного человека в команду.