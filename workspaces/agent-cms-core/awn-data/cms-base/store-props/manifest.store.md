---
awn-prop-type: awn.data.collection
awn-prop-id: cms-base.store-props
awn-prop-name: Store props
awn-prop-description: "Определения ключей awn-prop-* в manifest.store.md"
awn-prop-extends: ../record-base/manifest.store.md
awn-prop-record:
  id-mode: slug
  file: "{id}.md"
awn-fields:
  awn-title:
    type: awn.string
    title: Название
    required: true
  awn-key:
    type: awn.string
    title: Ключ
    required: true
  awn-description:
    type: awn.string
    title: Описание
---
