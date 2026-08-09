# awn-system/types/

YAML-типы CMS platform core и агента. Loader: `type-catalog-loader.js`.

| Папка | Префикс id | Пример |
|-------|------------|--------|
| base/ | `awn.entity` | `_base.yml` |
| pages/ | `awn.page.*` | ws, section, topic, agent-kit topics |
| content/ | `awn.content.*` | record, category, sidecar, dialog, comment |
| slots/ | `awn.slot.*` | `single-file/`, `multi-file/`, `multi-file/system/`; категории — `slot-categories.yml` |
| fields/ | `awn.field.*` | `groups.yml` + group/sort на каждом типе; legacy — `awn-data/editing-fields/` |
| mixins/ | `awn.mixin.*` | preview, runtime, attachments |
| data/ | `awn.data.*` | group, collection, single — контейнеры awn-data |
| data/elements/ | `awn.data.element.*`, `awn.data.record` … | default, record, category, sidecar |

**Markdown-блоки** — `awn-system/types/md-blocks/` (палитра редактора).  
**Справочники** — `awn-data/taxonomies/*/main.csv`

Файлы agent-специфичные (не из platform bootstrap):  
`content/dialog.yml`, `content/comment.yml`,  
`slots/multi-file/comments.yml`, `slots/multi-file/assets.yml`,  
`mixins/*`.
