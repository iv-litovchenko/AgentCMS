---
id: mermaid-class
created: "2026-08-03T00:00:00.000Z"
updated: "2026-08-03T00:00:00.000Z"
title: Диаграмма классов
blockId: awn.block.mermaid-class
group: visualization
sort: 5
icon: 🏗️
status: active
render: template
extends: awn.block.base
---

```mermaid
classDiagram
  class Animal {
    +String name
    +makeSound()
  }
  class Dog {
    +bark()
  }
  Animal <|-- Dog
```
