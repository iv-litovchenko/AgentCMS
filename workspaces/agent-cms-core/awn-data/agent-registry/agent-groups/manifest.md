---
awn-type: awn.data.collection
awn-id: agent-registry.groups
awn-name: Группы агентов
awn-record-id-mode: slug
awn-record-file: "{id}.md"
---
# Группы агентов

UI-группировка на landing: «Работа», «Хобби», «Образование» и т.д.

- **agentIds** — список id агентов через запятую
- **background** — путь к PNG/JPG в `awn-storage/assets/attachments/` этого накопителя
- **appearance** — `light` или `dark`

Системная запись `_ungrouped.md` — настройки для агентов без группы.

Legacy fallback: `awn-agents.json`.
