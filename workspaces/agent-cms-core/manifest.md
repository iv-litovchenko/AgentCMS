---
awn-name: "[Agent CMS] Platform core"
awn-emoji: ""
awn-status: 🟢 Открыта
awn-description: "Ядро платформы — спеки, доки, runtime, интеграции; описано на языке CMS"
awn-tags: []
awn-type: awn.page.ws
awn-create: "2026-06-17T11:52"
awn-update: 2026-07-29T22:19:37.122Z
awn-version: 6
awn-preview: awn-storage/assets/preview/20260729221936.png
awn-web-url: ""
awn-main: false
awn-category: ""
awn-owner: ""
awn-priority: ""
awn-color: "#000000"
awn-sort: 
awn-runtime-load-always: false
awn-runtime-cron: false
awn-runtime-cron-schedule: ""
awn-runtime-heartbeat: false
awn-runtime-commands: false
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
