---
awn-materials: ""
awn-status: open
awn-quality: 4
awn-importance: 0
awn-emoji: ""
awn-note-todo-sticker: ""
awn-main: false
awn-focus: false
awn-index-exclude-record: false
awn-auto-toc: false
awn-summary: ""
awn-tags: []
awn-taxonomy: {}
awn-viz-graph:
  enabled: true
  pin: false
  weight: 0
awn-viz-mindmap:
  type: optional
  color: slate
  size: auto
  layout-independent: false
  direction: auto
awn-viz-roadmap:
  order: 0
awn-id: 48
awn-type: awn.content.record
awn-create: "2026-10-01T16:03"
awn-owner: ""
awn-location-label: ""
awn-location-coordinates: ""
awn-is-real-world-object: false
awn-is-real-world-event: false
awn-attachments: []
awn-description: ""
awn-index-exclude-subtree: false
awn-name: Все диаграммы
awn-preview: ""
awn-runtime-commands: false
awn-runtime-cron: false
awn-runtime-cron-schedule: ""
awn-runtime-heartbeat: false
awn-runtime-load-always: false
awn-sort: 
awn-web-url: ""
awn-update: 2026-10-01T13:04:07.058Z
awn-version: 3
---

```mermaid
flowchart LR
  A[Начало] --> B{Условие?}
  B -->|да| C[Действие]
  B -->|нет| D[Другое]
  C --> E[Конец]
  D --> E
```

```mermaid
sequenceDiagram
  participant A as Клиент
  participant B as Сервер
  A->>B: Запрос
  B-->>A: Ответ
```

```mermaid
gantt
  title Пример roadmap
  dateFormat YYYY-MM-DD
  section Этап 1
  Задача A     :done, a1, 2026-05-01, 7d
  Задача B     :active, a2, 2026-05-20, 5d
  Задача C     :a3, after a2, 7d
```

```mermaid
pie title Распределение
  "Категория A" : 45
  "Категория B" : 30
  "Категория C" : 25
```

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

```mermaid
stateDiagram-v2
  [*] --> Черновик
  Черновик --> На_ревью : отправить
  На_ревью --> Опубликовано : одобрить
  На_ревью --> Черновик : вернуть
  Опубликовано --> [*]
```

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

```mermaid
mindmap
  root((Тема))
    Раздел A
      Подпункт 1
      Подпункт 2
    Раздел B
      Подпункт 3
```

