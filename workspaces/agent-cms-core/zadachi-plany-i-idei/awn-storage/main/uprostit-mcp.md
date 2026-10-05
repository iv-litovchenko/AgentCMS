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
awn-id: 17
awn-type: awn.content.record
awn-create: "2026-09-28T20:22"
awn-owner: ""
awn-location-label: ""
awn-location-coordinates: ""
awn-is-real-world-object: false
awn-is-real-world-event: false
awn-attachments: []
awn-description: ""
awn-index-exclude-subtree: false
awn-name: Упростить MCP
awn-preview: ""
awn-runtime-commands: false
awn-runtime-cron: false
awn-runtime-cron-schedule: ""
awn-runtime-heartbeat: false
awn-runtime-load-always: false
awn-sort: 
awn-web-url: ""
awn-update: 2026-09-28T17:23:41.573Z
awn-version: 3
---

По идее если упростить MCP то и меньше документации нужно будет загружать в контекст агенту

```
Notion MCP
├── Поиск и получение контента
│   ├── notion-ai-search — умный поиск (нужен Business-план)
│   ├── notion-search — обычный поиск
│   └── notion-fetch — получить страницу/базу/данные по ссылке
│
├── Страницы
│   ├── notion-create-pages — создать страницы
│   ├── notion-update-page — обновить страницу
│   ├── notion-duplicate-page — дублировать
│   ├── notion-move-pages — переместить
│   ├── notion-create-folder / notion-update-folder — папки
│   └── notion-convert-page-to-skill — сделать страницу «навыком»
│
├── Базы данных
│   ├── notion-create-database — создать базу
│   ├── notion-update-data-source — изменить схему/поля
│   ├── notion-query-data-sources — запрос строк (SQL-подобный)
│   ├── notion-query-multiple-data-sources — запрос сразу по нескольким базам
│   └── notion-create-view / notion-update-view — представления (виды таблицы)
│
├── Комментарии и обсуждения
│   ├── notion-create-comment
│   └── notion-get-comments
│
├── Файлы
│   ├── notion-create-file-upload
│   ├── notion-create-attachment
│   └── notion-download-attachment
│
├── Навигация по рабочему пространству
│   ├── notion-list-recent-pages
│   ├── notion-list-favorite-pages
│   ├── notion-list-private-pages
│   ├── notion-list-shared-pages
│   ├── notion-get-teams
│   └── notion-get-users
│
├── Заметки со встреч
│   └── notion-query-meeting-notes
│
├── Навыки (Skills)
│   ├── notion-search-skills
│   ├── notion-upload-skill
│   └── notion-download-skill
│
├── Кастомные агенты (Custom Agents)
│   ├── notion-search-agents
│   ├── notion-spawn-session — запустить сессию агента
│   ├── notion-send-message-to-session
│   ├── notion-get-session-status / notion-wait-session
│   ├── notion-stop-session
│   ├── notion-query-sessions / notion-search-sessions
│   ├── notion-list-session-events / notion-read-session-event
│   └── notion-show-advanced-analysis-next-steps
│
└── Служебные
    ├── notion-get-tool-access — какие права доступны
    └── notion-check-mcp-next-steps
```