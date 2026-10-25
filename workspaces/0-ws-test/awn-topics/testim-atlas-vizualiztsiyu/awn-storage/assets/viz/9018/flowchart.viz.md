---
viz-kind: flowchart
viz-about: awn-topics/testim-atlas-vizualiztsiyu/manifest.md
awn-type: awn.content.record
awn-name: "Тестим Атлас Визуализцию"
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