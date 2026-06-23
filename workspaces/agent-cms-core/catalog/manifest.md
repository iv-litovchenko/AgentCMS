---
awn-preview: ""
awn-emoji: 📚
awn-name: Catalog
awn-status: 🟡 Черновик
awn-type: awn.area
awn-create: "2026-06-21T18:00"
awn-update: 2026-06-21T18:00:00.000Z
awn-description: Связь с глобальными справочниками платформы (data/catalog)
awn-main: false
awn-category: ""
awn-tags: []
awn-color: "#059669"
awn-version: 1
awn-sort: ""
---

# Catalog

Глобальные enum-справочники **не живут** в `agent-cms-core` — отдельный workspace:

```
data/catalog/
├── _registration.md          awn.workspace «Платформа»
└── catalog/
    ├── tags.md
    ├── categories.md
    ├── statuses.md
    └── storage/{topic}/content.csv
```

Подробнее — [overview.md](overview.md).
