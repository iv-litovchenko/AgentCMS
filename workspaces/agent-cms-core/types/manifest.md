---
awn-name: Types
awn-type: awn.page.area
awn-status: "🟢 Открыта"
awn-description: Каталог типов платформы — pages, content, slots, fields
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

**Поля** (`awn.field.*`) — накопитель [`awn-data/editing-fields/`](../awn-data/editing-fields/manifest.md). (`awn.block.*`) — накопители `awn-data/markdown-blocks/`, не YAML в `types/`.

Runtime: `type-catalog-loader.js` → `GET /api/type-catalog`
