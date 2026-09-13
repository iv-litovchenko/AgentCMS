# awn-system/types/

YAML-типы CMS platform core и агента. Loader: `type-catalog-loader.js`.

| Папка | Префикс id | Пример |
|-------|------------|--------|
| base/ | `awn.entity` | `_base.yml` |
| pages/ | `awn.page.*` | ws, section, **area**, topic |
| content/ | `awn.content.*` | `_base`, record, category, sidecar, dialog, comment |
| slots/ | `awn.slot.*` | `single-file/`, `multi-file/`, `multi-file/system/`; категории — `slot-categories.yml` |
| fields/ | `awn.field.*` | `groups.yml` + group/sort на каждом типе |
| mixins/ | `awn.mixin.*` | runtime (active); preview/web-url/attachments — deprecated |

## Наследование pages / content (schema-first UI)

```
awn.entity
  └── awn.base                         ← form, preview, web-url, status, tags…
        ├── awn.page.base              ← nav + mixin runtime
        │     ├── awn.page.ws
        │     ├── awn.page.section
        │     ├── awn.page.area        ← активный тип областей в awn-container
        │     ├── awn.page.section     ← draft (секции — позже)
        │     └── awn.page.topic
        └── awn.content.base           ← attachments (materials)
              ├── awn.content.record
              ├── awn.content.category
              ├── awn.content.discussion
              ├── awn.content.comment
              └── awn.content.sidecar
```

Поля формы: `placement` (title-bar | aside-hero | aside-body | hidden), `widget`, `catalog`, `form.panel-title`.
| data/ | `awn.data.*` | group, collection, single — контейнеры awn-data |
| data/elements/ | `awn.data.element.*`, `awn.data.record` … | default, record, category, sidecar |

**Markdown-блоки** — `awn-system/types/md-blocks/` (палитра редактора).  
**Справочники** — `awn-data/taxonomies/*/main.csv`

Файлы agent-специфичные (не из platform bootstrap):  
`content/dialog.yml`, `content/comment.yml`,  
`slots/multi-file/comments.yml`, `slots/multi-file/assets.yml`,  
`mixins/*`.
