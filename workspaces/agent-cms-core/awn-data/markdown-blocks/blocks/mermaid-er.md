---
id: mermaid-er
created: "2026-08-03T00:00:00.000Z"
updated: "2026-08-03T00:00:00.000Z"
title: ER-диаграмма
blockId: awn.block.mermaid-er
group: visualization
sort: 7
icon: 🗄️
status: active
render: template
extends: awn.block.base
---

```mermaid
erDiagram
  USER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  USER {
    int id
    string email
  }
  ORDER {
    int id
    date created
  }
```
