---
awn-supertype: awn-data/cms-base/data-elements/default.md
awn-name: Коллекция
awn-description: manifest + N записей (*.md или main.csv)

awn-record-id-mode: slug
awn-record-file: "{id}.md"
awn-record-hierarchy: false

awn-data-elements-schema-extends: awn-data/cms-base/data-elements/default.md
awn-data-elements-schema-mixins: []
awn-data-elements-schema:
  fields:
    awn-title:
      type: awn.field.string
      title: Название
      required: true
      tab: main
    awn-typeId:
      type: awn.field.string
      title: ID типа
      required: true
      tab: main
    awn-kind:
      type: awn.field.string
      title: Kind
      tab: main
    awn-domain:
      type: awn.field.string
      title: Domain
      tab: main
    awn-status:
      type: awn.field.enum
      title: Статус
      enum: [active, draft, deprecated, inactive]
      default: active
      tab: main
  tabs:
    main: Основное
---
# data-containers.collection

Type id = **`awn-data/cms-base/data-containers/collection.md`**

При создании коллекции новый `manifest.md` получает `awn-supertype` → этот файл.
