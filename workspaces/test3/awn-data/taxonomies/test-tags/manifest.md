---
awn-supertype: awn-data/cms-base/data-containers/collection.md
awn-name: Test Tags
awn-record-id-mode: slug
awn-record-file: main.csv
awn-record-hierarchy: false
awn-data-elements-schema-extends: awn-data/cms-base/entities/table.base.md
awn-data-elements-schema-mixins: []
awn-data-elements-schema:
  fields:
    awn-code:
      type: awn.string
      title: Код
      required: true
    awn-label:
      type: awn.string
      title: Подпись
      required: true
    awn-emoji:
      type: awn.string
      title: Эмодзи
    awn-color:
      type: awn.color
      title: Цвет
    awn-sort:
      type: awn.integer
      title: Порядок
      default: 0
---
# Test Tags

Test Tags
