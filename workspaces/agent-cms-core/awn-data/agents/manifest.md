# Реестр агентов

Коллекция workspace-агентов платформы. Каждая запись — один агент.

- **path** — путь к папке workspace (относительный или абсолютный)
- **environment** — окружение (`local`, `staging`, `production`)
- **default** — агент по умолчанию при старте
- **orchestrator** — флаг оркестратора

Display-метаданные (имя, emoji, preview) — в `manifest.md` workspace.

Legacy fallback: `awn-agents.json` в корне проекта.
