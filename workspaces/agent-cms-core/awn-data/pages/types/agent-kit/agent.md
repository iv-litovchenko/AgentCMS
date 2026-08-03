---
id: agent
created: "2026-08-03T20:03:50.510Z"
updated: "2026-08-03T20:03:50.510Z"
typeId: awn.page.topic.agent-kit.agent
title: "Агент"
kind: type
domain: pages
status: active
extends: awn.page.topic
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
