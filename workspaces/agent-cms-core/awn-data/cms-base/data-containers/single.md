---
awn-supertype: awn-data/cms-base/data-elements/default.md
awn-name: Одиночка
awn-description: manifest + ровно один main.md

awn-record-file: main.md

awn-data-elements-schema-extends: awn-data/cms-base/data-elements/default.md
awn-data-elements-schema-mixins: []
awn-data-elements-schema:
  fields:
    awn-title:
      type: awn.field.string
      title: Название
      required: true
      tab: main
    awn-name:
      type: awn.field.string
      title: Имя
      tab: main
    awn-description:
      type: awn.field.text
      title: Описание
      tab: main
  tabs:
    main: Основное
    system: Системное
---
# data-containers.single

Type id = **`awn-data/cms-base/data-containers/single.md`**

Пример store: `settings-global/`.
