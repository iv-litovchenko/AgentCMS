---
viz-kind: architecture
viz-about: awn-topics/testim-atlas-vizualiztsiyu/awn-storage/main/test-karty-1.md
awn-type: awn.content.record
awn-name: "Тест карты 1"
---

Пример карты **architecture** для записи «Тест карты 1»: как устроен слой `*.viz.md` в Agent CMS (канон `assets/viz/{awn-id}/`).

```mermaid
flowchart TB
  subgraph User["Человек и агент"]
    ED[Редактор / обзор записи]
    AT[Атлас RMM]
    MCP[MCP viz_map_*]
  end

  subgraph App["YamlCMS"]
    API["/api/viz/*"]
    SVC[viz-maps-service]
    KINDS["awn-system/types/viz/*.yml"]
  end

  subgraph Record["Запись темы"]
    MD["test-karty-1.md\nawn-id: 9036"]
  end

  subgraph Maps["Карты визуализации"]
    CAN["assets/viz/9036/*.viz.md"]
    LEG["legacy: *.kind.viz.md\n(только чтение)"]
  end

  ED -->|создать / список| API
  AT -->|просмотр Mermaid| API
  MCP --> API
  API --> SVC
  SVC --> KINDS
  SVC -->|viz-about| MD
  SVC -->|write/read| CAN
  SVC -.->|migrate/read| LEG
  MD -->|awn-id| CAN
```

| Узел | Роль |
|------|------|
| **viz-about** | Полный путь записи-«хозяина» карты |
| **viz-kind** | Вид из реестра (здесь `architecture`) |
| **Атлас** | Список всех `*.viz.md` workspace + превью диаграммы |
