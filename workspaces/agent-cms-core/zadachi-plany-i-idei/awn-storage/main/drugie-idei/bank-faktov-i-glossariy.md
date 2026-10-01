---
awn-materials: ""
awn-status: open
awn-quality: 4
awn-importance: 0
awn-emoji: ""
awn-note-todo-sticker: ""
awn-main: false
awn-focus: false
awn-index-exclude-record: false
awn-auto-toc: false
awn-summary: ""
awn-tags: []
awn-taxonomy: {}
awn-viz-graph:
  enabled: true
  pin: false
  weight: 0
awn-viz-mindmap:
  type: optional
  color: slate
  size: auto
  layout-independent: false
  direction: auto
awn-viz-roadmap:
  order: 0
awn-id: 19
awn-type: awn.content.record
awn-create: "2026-10-01T10:55"
awn-owner: ""
awn-location-label: ""
awn-location-coordinates: ""
awn-is-real-world-object: false
awn-is-real-world-event: false
awn-attachments: []
awn-description: ""
awn-index-exclude-subtree: false
awn-name: Банк фактов и глоссарий
awn-preview: ""
awn-runtime-commands: false
awn-runtime-cron: false
awn-runtime-cron-schedule: ""
awn-runtime-heartbeat: false
awn-runtime-load-always: false
awn-sort: 
awn-web-url: ""
awn-update: 2026-10-01T07:55:47.156Z
awn-version: 3
---

# Идея
У Claude есть отдельная система памяти — файлы про пользователя и его проекты, не связанная с Agent CMS.
# Как это работает
## 1. Оглавление в начале разговора
В начале каждого разговора Claude получает короткий список всех файлов памяти: только названия и краткое описание каждого файла (не содержимое). Это похоже на оглавление книги.
## 2. Целевое чтение по теме
Когда в разговоре всплывает тема, которая, судя по описанию файла, может там раскрываться, Claude отдельным действием открывает именно этот файл и читает его целиком. Чтение происходит не заранее, а по мере необходимости — то есть по запросу темы, а не всей базы разом.
## 3. Фильтр перед использованием
Не всё прочитанное вставляется в ответ. Используется только то, что реально меняет суть ответа на конкретный вопрос. Если факт ничего не меняет и служит просто демонстрацией того, что что-то помнится — он не используется, чтобы не превращать ответ в слежку за пользователем.
# Идея для Agent CMS
При больших объёмах (тысячи фактов за месяц) прямой перебор нереален. Возможное решение — тот же принцип: группировка фактов не по одному факту на запись, а по темам/area/topic с коротким описанием каждой темы в общем списке. Первый уровень фильтрации — по теме разговора (открывается нужный topic), а не по перебору всех фактов. Внутри одной темы может копиться сколько угодно данных, потому что туда заглядывают только когда тема реально всплыла в разговоре.