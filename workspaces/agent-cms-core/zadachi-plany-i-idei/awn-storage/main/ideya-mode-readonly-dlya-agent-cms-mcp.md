---
awn-materials: ""
awn-status: open
awn-quality: 4
awn-emoji: ""
awn-note-todo-sticker: ""
awn-category: ""
awn-owner: ""
awn-priority: ""
awn-color: ""
awn-tags: []
awn-location-label: ""
awn-location-coordinates: ""
awn-is-real-world-object: false
awn-is-real-world-event: false
awn-type: awn.content.record
awn-create: "2026-08-28T00:07"
awn-mindmap-enabled: true
awn-mindmap-type: optional
awn-mindmap-color: slate
awn-mindmap-size: auto
awn-mindmap-layout-independent: false
awn-mindmap-direction: auto
awn-attachments: []
awn-description: ""
awn-main: false
awn-name: "Идея: mode: readonly для agent-cms MCP"
awn-preview: ""
awn-runtime-commands: false
awn-runtime-cron: false
awn-runtime-cron-schedule: ""
awn-runtime-heartbeat: false
awn-runtime-load-always: false
awn-sort: 
awn-web-url: ""
awn-update: 2026-08-27T21:08:08.131Z
awn-version: 2
---

Вот кратко, для записи в идею:

***

**Идея: `mode: readonly` для agent-cms MCP**

Добавить в конфиг воркспейса (или в параметры MCP-сессии/подключения) флаг `mode: readonly`, который сервер проверяет **на своей стороне** перед выполнением любого write/create/delete/move/rename вызова — независимо от того, что просит LLM-агент.

Ключевой принцип: ограничение должно быть enforced на сервере, а не быть просто инструкцией агенту в диалоге ("не пиши") — потому что инструкция в чате не является барьером безопасности, это просто договорённость, которую агент может нарушить при путанице контекста или явной просьбе пользователя.

Варианты реализации:

* флаг в config.yml воркспейса/страницы
* scoped read-only vs read-write токены/ключи API для подключения
* прокси-слой перед MCP с allowlist методов по read/write

Особенно важно на будущее — когда к workspace смогут подключаться несколько агентов/людей, "мягкая" договорённость вообще не масштабируется.