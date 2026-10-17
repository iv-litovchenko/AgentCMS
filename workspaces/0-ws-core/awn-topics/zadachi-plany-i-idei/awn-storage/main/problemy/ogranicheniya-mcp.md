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
awn-create: "2026-09-13T17:29"
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
awn-name: Ограничения MCP
awn-preview: ""
awn-sort: 
awn-web-url: ""
awn-update: 2026-09-13T14:29:47.737Z
awn-version: 2
---

Смотри, конкретные примеры именно из того, что мы видели в карте MCP этого CMS:

**1. Прямая работа с базой данных / внутренностями сервера**Если у Agent CMS под капотом, скажем, PostgreSQL или SQLite для хранения индексов — через MCP я не могу выполнить произвольный SQL-запрос к этой базе напрямую. Есть только `query_workspace_storage` (SQL-like фильтр, но по заранее определённой схеме полей), а не реальный SQL к реальной БД.

**2. Управление самим сервером/процессом**Перезапустить сервер Agent CMS, посмотреть его логи, изменить конфигурацию Node.js-приложения, поставить npm-пакет в сам движок CMS (не в workspace, а в код платформы) — этого просто нет в списке из 73 tools. Через прямой CLI в папке `agent-cms-core` я бы это сделал через `npm install`, `pm2 restart` и т.п.

**3. Массовые/batch операции без готового инструмента**Например, "переименовать все файлы, у которых в frontmatter есть поле `demo_priority: low`, у которых 300+ штук в разных темах" — если нет специально написанного batch-tool под это, мне придётся делать это по одному файлу через `write_page_properties`/`rename_page`, вызывая инструмент десятки раз, а не одной shell-командой с find+sed.

**4. Git-операции над самим репозиторием workspace**Если весь workspace — это git-репозиторий, через MCP я не могу сделать `git log`, `git diff`, откатить коммит — только через `exec_shell`, если он это разрешает и если у меня есть доступ к `.git` в этой папке. У прямого CLI это штатная операция.

**5. Доступ к переменным окружения / секретам сервера**`read_page_env`/`write_page_env` дают доступ к `.env` конкретной **страницы** внутри workspace — но не к `.env` самого сервера Agent CMS (где, например, ключи от Google Custom Search API). Это архитектурно скрыто от MCP-слоя.

**6. Прямой доступ к файлам вне workspace**Если на том же сервере рядом лежит другой workspace другого агента, или системные файлы ОС — я вообще их не увижу через MCP: скоуп жёстко ограничен `agentId`. Прямой CLI, если у него есть права, может выйти за эти границы.

Суть в одном: MCP — это API с конечным списком методов. Если для операции нет метода — я не могу её сделать, даже понимая, что нужно сделать и как. Прямой CLI такой список не имеет, я ограничен только правами ОС и разрешёнными доменами/командами.