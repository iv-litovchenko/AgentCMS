---
id: mermaid-state
created: "2026-08-03T00:00:00.000Z"
updated: "2026-08-03T00:00:00.000Z"
title: Диаграмма состояний
blockId: awn.block.mermaid-state
group: visualization
sort: 6
icon: 🔁
status: active
render: template
extends: awn.block.base
---

```mermaid
stateDiagram-v2
  [*] --> Черновик
  Черновик --> На_ревью : отправить
  На_ревью --> Опубликовано : одобрить
  На_ревью --> Черновик : вернуть
  Опубликовано --> [*]
```
