---
id: mermaid-sequence
created: "2026-08-03T00:00:00.000Z"
updated: "2026-08-03T00:00:00.000Z"
title: Диаграмма последовательности
blockId: awn.block.mermaid-sequence
group: visualization
sort: 2
icon: ↔️
status: active
render: template
extends: awn.block.base
---

```mermaid
sequenceDiagram
  participant A as Клиент
  participant B as Сервер
  A->>B: Запрос
  B-->>A: Ответ
```
