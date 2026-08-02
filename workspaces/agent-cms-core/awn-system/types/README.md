# types/

YAML-типы CMS этого агента. Loader: `type-catalog-loader.js` (agent override поверх platform).

| Папка | Префикс id | Пример |
|-------|------------|--------|
| base/ | `awn.entity` | `_base.yml` |
| pages/ | `awn.page.*` | ws, area, topic, service-doc, catalog |
| content/ | `awn.content.*` | record, sidecar, dialog, comment |
| slots/ | `awn.slot.*` | main, inbox, thread, media |
| fields/ | `awn.field.*` | `awn-data/editing-fields/` |
| mixins/ | `awn.mixin.*` | preview, runtime, attachments |

**Markdown-блоки** — `awn-data/markdown-blocks/blocks/*.md`  
**Справочники** — `awn-data/taxonomies/*/main.csv`

Файлы agent-специфичные (не из platform bootstrap):  
`content/dialog.yml`, `content/comment.yml`, `content/media-category.yml`,  
`slots/comments.yml`, `slots/quick-notes.yml`, `slots/assets.yml`,  
`mixins/*`.
