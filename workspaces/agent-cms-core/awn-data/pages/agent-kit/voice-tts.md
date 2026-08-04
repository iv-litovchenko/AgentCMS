---
awn-id: voice-tts
awn-created: "2026-08-03T20:03:50.522Z"
awn-updated: "2026-08-03T20:03:50.522Z"
awn-typeId: awn.page.topic.agent-kit.voice-tts
awn-title: Голос TTS
awn-kind: type
awn-domain: pages
awn-status: active
awn-extends: awn.page.topic
---
description: Настройки синтеза речи (Text-to-Speech)
storage-slots: []
create-node-group: agent
create-node-label: Голос TTS
create-node-slug: voice-tts
create-node-order: 3
awn-fields:
  awn-tts-provider:
    type: awn.field.string
    title: Провайдер TTS
  awn-tts-voice:
    type: awn.field.string
    title: Голос
  awn-tts-speed:
    type: awn.field.number
    title: Скорость (0.5–2.0)
