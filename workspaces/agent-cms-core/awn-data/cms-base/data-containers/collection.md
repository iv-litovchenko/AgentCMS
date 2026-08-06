---
awn-super-type: awn-data/cms-base/data-containers/manifest.md
awn-name: Инфobлок-коллекция
awn-description: manifest + N записей (*.md или main.csv)

# шаблон manifest collection-store
awn-data-elements-schema:
  awn-supertype:
    description: путь → awn-data/cms-base/data-containers/collection.md
  awn-name:
    description: название store
  awn-record-id-mode:
    description: slug | numeric
  awn-record-file:
    description: "{id}.md"
  awn-record-hierarchy:
    description: true | false
  awn-data-elements-schema-extends:
    description: путь → awn-data/cms-base/data-elements/default.md
  awn-data-elements-schema-mixins:
    description: примеси
  awn-data-elements-schema:
    description: fields + tabs для записей store

# когда collection = каталог типов (pages, content)
awn-fields:
  awn-title:
    type: awn.field.string
    title: Название
    required: true
  awn-typeId:
    type: awn.field.string
    title: ID типа
    required: true
  awn-kind:
    type: awn.field.string
    title: Kind
  awn-domain:
    type: awn.field.string
    title: Domain
  awn-status:
    type: awn.field.enum
    title: Статус
    enum: [active, draft, deprecated, inactive]
    default: active
---
# data-containers.collection

Type id = **`awn-data/cms-base/data-containers/collection.md`**

Item в store `data-containers/` — описывает базовый тип «коллекция».
