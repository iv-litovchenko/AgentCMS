---
viz-kind: flowchart
viz-about: awn-topics/testim-atlas-vizualiztsiyu/awn-storage/main/test-karty-1.md
awn-type: awn.content.record
awn-name: "Тест карты 1"
---

```mermaid
flowchart TD
  START([Начало]) --> STEP[Шаг]
  STEP --> CHECK{Условие?}
  CHECK -->|да| OK[Действие]
  CHECK -->|нет| ALT[Альтернатива]
  OK --> END([Конец])
  ALT --> END
```