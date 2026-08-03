---
id: voice-sst
created: "2026-08-03T20:03:50.522Z"
updated: "2026-08-03T20:03:50.522Z"
typeId: awn.page.topic.agent-kit.voice-sst
title: "Голос STT"
kind: type
domain: pages
status: active
extends: awn.page.topic
---
description: Настройки распознавания речи (Speech-to-Text)
storage-slots: []
create-node-group: agent
create-node-label: Голос STT
create-node-slug: voice-sst
create-node-order: 4
fields:
  awn-stt-provider:
    type: awn.field.string
    title: Провайдер STT
  awn-stt-language:
    type: awn.field.string
    title: Язык распознавания
