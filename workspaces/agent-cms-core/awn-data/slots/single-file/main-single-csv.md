---
id: main-single-csv
created: "2026-08-03T20:03:50.557Z"
updated: "2026-08-03T20:03:50.557Z"
typeId: awn.slot.main-single-csv
title: "Память (табличная)"
kind: slot
domain: slots
status: active
extends: awn.slot
slot-category: single-file
storage-driver: tabular
slot-order: 3
path: main.csv
---
description: Табличная память топика — main.csv
allowed-content:
  - awn.content.record
  - awn.content.category
  - awn.content.sidecar
accept-files:
  - .csv
