# CLI sandbox (Agent CMS Shell)

Общая рабочая папка для **Claude Code** и **Codex CLI**, когда Shell отправляет сообщения.

- Shell запускает `claude` / `codex` с `cwd` здесь — **не** в корне workspace агента.
- Локальные Read/Write/Bash CLI видят только эту папку (и вложенные `scratch/`).
- Доступ к хранилищу CMS (`awn-container/`, темы, слоты) — через **MCP Agent CMS**, не напрямую с диска.

Временные файлы агента кладите в `scratch/`.
