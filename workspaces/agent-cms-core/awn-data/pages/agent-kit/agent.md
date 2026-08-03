---
awn-id: agent
awn-created: "2026-08-03T20:03:50.510Z"
awn-updated: "2026-08-03T20:03:50.510Z"
awn-typeId: awn.page.topic.agent-kit.agent
awn-title: Агент
awn-kind: type
awn-domain: pages
awn-status: active
awn-extends: awn.page.topic
---
description: "Описание агента — персона, роль, цели, ограничения"
storage-slots:
  - main
create-node-group: agent
create-node-label: Агент
create-node-slug: agent
create-node-order: 1
fields:
  awn-agent-role:
    type: awn.field.text
    title: Роль агента
  awn-agent-language:
    type: awn.field.string
    title: Язык общения
