---
id: volume
created: "2026-08-03T20:03:50.555Z"
updated: "2026-08-03T20:03:50.555Z"
typeId: awn.slot.volume
title: "Итоги"
kind: slot
domain: slots
status: active
extends: awn.slot
slot-category: records
storage-driver: external
slot-order: 95
path: volume/
---
description: "Итоги сессий и решений — volume/ (сводки, договорённости)"
slot-tier: system
allowed-content:
  - awn.content.record
  - awn.content.category
  - awn.content.sidecar
accept-files:
  - .md
