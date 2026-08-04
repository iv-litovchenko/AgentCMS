---
awn-type: awn.data.collection
awn-id: slots
awn-name: Слоты
awn-extends: awn-data/cms-base/entities/table.base.md
awn-record:
  id-mode: slug
  file: "{id}.md"
awn-fields:
  awn-slot-category:
    type: awn.enum
    title: Категория
    enum:
      - memory
      - files
      - single-file
      - records
      - communication
    default: memory
  awn-storage-driver:
    type: awn.enum
    title: Драйвер памяти
    enum:
      - internal
      - external
      - tabular
    default: external
  awn-path:
    type: awn.string
    title: Путь
    description: Подпапка в topic/awn-storage/ (например inbox/)
    required: true
  awn-allowed-content:
    type: awn.string
    title: Разрешённый контент
    description: "Список awn.content.* — в frontmatter или в теле записи"
  awn-accept-files:
    type: awn.string
    title: Принимаемые файлы
    description: "Шаблоны расширений (*, .md, .png) — в frontmatter или в теле"
  awn-slot-order:
    type: awn.integer
    title: Порядок
    description: Сортировка внутри категории
  awn-slot-tier:
    type: awn.enum
    title: Уровень
    enum:
      - user
      - system
    default: user
---
# Слоты

Слоты хранения топика — `awn.slot.*`.
