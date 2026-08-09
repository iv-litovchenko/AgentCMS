---
id: mermaid-flowchart
created: "2026-08-03T00:00:00.000Z"
updated: "2026-08-03T00:00:00.000Z"
title: Блок-схема
blockId: awn.block.mermaid-flowchart
group: visualization
sort: 1
icon: 🔀
status: active
render: template
extends: awn.block.base
---

```mermaid
flowchart LR
  A[Начало] --> B{Условие?}
  B -->|да| C[Действие]
  B -->|нет| D[Другое]
  C --> E[Конец]
  D --> E
```
