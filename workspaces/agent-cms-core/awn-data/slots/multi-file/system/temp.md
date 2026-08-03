---
id: temp
created: "2026-08-03T20:03:50.555Z"
updated: "2026-08-03T20:03:50.555Z"
typeId: awn.slot.temp
title: "Временные файлы"
kind: slot
domain: slots
status: active
extends: awn.slot
slot-category: records
storage-driver: external
slot-order: 92
path: temp/
---
description: Черновики и временные файлы — temp/
slot-tier: system
allowed-content:
  - awn.content.record
  - awn.content.category
  - awn.content.sidecar
accept-files:
  - "*"
