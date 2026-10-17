---
awn-name: Из корня
awn-emoji: ""
awn-status: new
awn-description: ""
awn-tags: []
awn-type: awn.content.record
awn-create: "2026-08-02T00:41"
awn-update: "2026-08-02T00:41"
awn-version: 1
awn-preview: ""
awn-web-url: ""
awn-attachments: []
awn-source: mcp
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
├── dokumentatsii/                      topic · документация (main slot)
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
| `awn-system/types/{base,pages,content,slots,fields,md-blocks,data}/` | `type-catalog-loader.js` → `/api/type-catalog` |
| `components/` | legacy topic mirror |
| `runtime/` | `server.js`, `*-loader.js`, `manifest-paths.js` |
| `integrations/` | `mcp-server/`, hooks |
| `catalog/` | глобальные справочники платформы |
| `agents-groups/` | группы на landing-экране |

Подробное дерево — [platform-map.md](platform-map.md).
