---
awn-preview: awn-storage/assets/preview/4d93b664-29a3-4953-b71f-e3dad2d25368.png
awn-emoji: ""
awn-name: "[Agent CMS] Platform core"
awn-status: 🟢 Открыта
awn-type: awn.workspace
awn-create: "2026-06-17T11:52"
awn-update: 2026-06-21T18:00:00.000Z
awn-description: "Ядро платформы — спеки, доки, runtime, интеграции; описано на языке CMS"
awn-main: false
awn-category: ""
awn-tags: []
awn-color: "#000000"
awn-version: 5
awn-sort: ""
---





# Platform core

Workspace **agent-cms-core** — эталонная модель платформы Agent CMS.  
Всё разложено на **области** (`awn.area`) и **топики** (`awn.topic`), как у обычного агента.

## Карта workspace

```
agent-cms-core/                         awn.page.ws
│
├── types/                              area · каталог типов (источник правды)
│   ├── base/      → awn.entity
│   ├── pages/     → awn.page.*
│   ├── content/   → awn.content.*
│   ├── slots/     → awn.slot.*
│   ├── fields/    → awn.string …
│   └── md-blocks/ → awn.block.*
├── documentations/                     area · документация
├── runtime/                            area · loaders, API
├── catalog/                            area · глобальные справочники
├── examples/                           area · демо
│
├── platform-map.md                     topic
├── agent-groups.md                     topic
└── ideasmd.md                          topic · backlog
```

Legacy (постепенно убираем): `components/`, `types-of-components/`.

## Паттерн на каждом уровне

| Слой | Файл | Назначение |
|------|------|------------|
| Human | `{name}.md` | манифест топика, frontmatter |
| Machine | `awn-storage/{name}/configuration/schema.yml` | схема типа / конфиг |
| Data | `awn-storage/{name}/main/` | записи, черновики, CSV |

## Связь с кодом

| Workspace | Код в репозитории |
|-----------|-------------------|
| `types/{base,pages,content,slots,fields,md-blocks}/` | `type-catalog-loader.js` → `/api/type-catalog` |
| `components/` | legacy topic mirror |
| `runtime/` | `server.js`, `*-loader.js`, `manifest-paths.js` |
| `integrations/` | `mcp-server/`, hooks |
| `catalog/` | глобальные справочники платформы |
| `agents-groups/` | группы на landing-экране |

Подробное дерево — [platform-map.md](platform-map.md).
