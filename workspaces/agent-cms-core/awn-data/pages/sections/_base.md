---
id: _base
created: "2026-08-03T20:03:50.525Z"
updated: "2026-08-03T20:03:50.525Z"
typeId: awn.page.section
title: "Секция"
kind: type
domain: pages
status: active
extends: awn.page.base
---
description: "Секция workspace — прямой потомок ws; контейнер для тем (agent-kit, shared, container, …)"
manifest-pattern: "{slug}/manifest.md"
storage-slots: []
fields:
  awn-section-role:
    type: awn.field.string
    title: Роль секции
    description: "agent-kit, shared, container или произвольная"
    group: nav
