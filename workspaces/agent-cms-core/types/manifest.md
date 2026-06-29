---
awn-name: Types
awn-type: awn.page.area
awn-status: "🟢 Открыта"
awn-description: Каталог типов платформы — pages, content, slots, fields, md-blocks
awn-color: "#6366f1"
---

# types

Единый каталог типов Agent CMS. Каждый домен — **топик** с yaml в `awn-storage/configuration/types/`.

| Домен | id-префикс | Назначение |
|-------|------------|------------|
| [base/](base/manifest.md) | `awn.entity` | корень наследования |
| [pages/](pages/manifest.md) | `awn.page.*` | узлы дерева workspace |
| [content/](content/manifest.md) | `awn.content.*` | записи в слотах |
| [slots/](slots/manifest.md) | `awn.slot.*` | слои памяти топика |
| [fields/](fields/manifest.md) | `awn.string` … | поля frontmatter |
| [md-blocks/](md-blocks/manifest.md) | `awn.block.*` | блоки редактора |

Runtime: `type-catalog-loader.js` → `GET /api/type-catalog`
