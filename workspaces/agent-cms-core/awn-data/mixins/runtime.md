---
id: runtime
created: "2026-08-03T20:03:50.566Z"
updated: "2026-08-03T20:03:50.566Z"
typeId: awn.mixin.runtime
title: "Runtime"
kind: mixin
domain: mixins
status: active
---
description: "Загрузка в контекст агента, cron, heartbeat, команды"
fields:
  awn-runtime-load-always:
    type: awn.field.boolean
    name: Всегда в контексте
    group: runtime
    description: Тема всегда в контексте агента; иначе — только по запросу (по умолчанию)
    default: false
  awn-runtime-cron:
    type: awn.field.boolean
    name: Выполнение по расписанию
    group: runtime
  awn-runtime-cron-schedule:
    type: awn.field.string
    name: ""
    group: runtime
    description: "День и время, шаблон или своё cron-выражение"
  awn-runtime-heartbeat:
    type: awn.field.boolean
    name: Heartbeat
    group: runtime
  awn-runtime-commands:
    type: awn.field.boolean
    name: Выполнение команд
    group: runtime
    description: В инструкции темы есть команды для выполнения (визуальный маркер)
    default: false
