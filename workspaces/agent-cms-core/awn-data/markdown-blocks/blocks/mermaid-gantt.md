---
id: mermaid-gantt
created: "2026-08-03T00:00:00.000Z"
updated: "2026-08-03T00:00:00.000Z"
title: Диаграмма Ганта
blockId: awn.block.mermaid-gantt
group: visualization
sort: 3
icon: 📅
status: active
render: template
extends: awn.block.base
---

```mermaid
gantt
  title Пример roadmap
  dateFormat YYYY-MM-DD
  section Этап 1
  Задача A     :done, a1, 2026-05-01, 7d
  Задача B     :active, a2, 2026-05-20, 5d
  Задача C     :a3, after a2, 7d
```
