---
awn-id: user
awn-created: "2026-08-03T20:03:50.520Z"
awn-updated: "2026-08-03T20:03:50.520Z"
awn-typeId: awn.page.topic.agent-kit.user
awn-title: Пользователь
awn-kind: type
awn-domain: pages
awn-status: active
awn-extends: awn.page.topic
---
description: "Профиль пользователя — имя, предпочтения, контакты"
storage-slots:
  - main
create-node-group: agent
create-node-label: Пользователь
create-node-slug: user
create-node-order: 5
fields:
  awn-user-role:
    type: awn.field.string
    title: Роль
  awn-user-timezone:
    type: awn.field.string
    title: Часовой пояс
