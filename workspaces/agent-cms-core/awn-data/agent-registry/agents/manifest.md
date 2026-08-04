---
awn-type: awn.data.collection
awn-id: agent-registry.agents
awn-name: Агенты
awn-extends: awn-data/cms-base/entities/row.base.md
awn-record:
  id-mode: slug
  file: "{id}.md"
awn-fields:
  awn-title:
    type: awn.string
    title: Название
  awn-path:
    type: awn.string
    title: Путь workspace
    required: true
  awn-environment:
    type: awn.enum
    title: Окружение
    enum:
      - local
      - staging
      - production
    default: local
  awn-default:
    type: awn.boolean
    title: Агент по умолчанию
    default: false
  awn-orchestrator:
    type: awn.boolean
    title: Оркестратор
    default: false
---
# Агенты

Коллекция workspace-агентов платформы. Каждая запись — один агент.

- **path** — путь к папке workspace (относительный или абсолютный)
- **environment** — окружение (`local`, `staging`, `production`)
- **default** — агент по умолчанию при старте
- **orchestrator** — флаг оркестратора

Display-метаданные (имя, emoji, preview) — в `manifest.md` workspace.

Legacy fallback: `awn-agents.json` в корне проекта.
