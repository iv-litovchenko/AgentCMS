---
awn-prop-type: awn.data.collection
awn-prop-id: agent-registry.agents
awn-prop-name: Агенты
awn-prop-description: "Workspace-агенты платформы — пути, окружение, default/orchestrator"
awn-prop-extends: ../../cms-base/record-base/manifest.store.md
awn-prop-record:
  id-mode: slug
  file: "{id}.md"
awn-fields:
  awn-id:
    type: awn.string
    title: ID
    description: Идентификатор записи (= имя файла без .md)
    locked: true
  awn-created:
    type: awn.datetime
    title: Создано
  awn-updated:
    type: awn.datetime
    title: Обновлено
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

