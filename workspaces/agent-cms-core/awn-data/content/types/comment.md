---
id: comment
created: "2026-08-03T20:03:50.536Z"
updated: "2026-08-03T20:03:50.536Z"
typeId: awn.content.comment
title: "Комментарий"
kind: type
domain: content
status: active
extends: awn.base
---
description: Комментарий к узлу — слот comments/
slot: comments
fields:
  awn-target:
    type: awn.field.link
    name: К чему привязан
    description: manifest.md или запись в awn-storage
