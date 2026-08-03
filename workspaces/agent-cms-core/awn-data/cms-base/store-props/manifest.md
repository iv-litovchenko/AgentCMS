---
awn-type: awn.data.collection
awn-id: cms-base.store-props
awn-name: Store props
awn-extends: ../record-base/manifest.md
awn-record:
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

# Store props

Справочник ключей `awn-*` в frontmatter `manifest.md` накопителя.

