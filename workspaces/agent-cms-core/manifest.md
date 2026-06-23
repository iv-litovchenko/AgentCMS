---
awn-preview: storage/assets/preview/4d93b664-29a3-4953-b71f-e3dad2d25368.png
awn-emoji: ""
awn-name: "[Agent CMS] Platform core"
awn-status: 🟢 Открыта
awn-type: awn.workspace
awn-create: "2026-06-17T11:52"
awn-update: 2026-06-21T18:00:00.000Z
awn-description: Ядро платформы — спеки, доки, runtime, интеграции; описано на языке CMS
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
agent-cms-core/                         awn.workspace
│
├── documentations/                     area · документация для людей
├── types-of-components/                area · онтология (типы, поля, блоки…)
├── runtime/                            area · исполнение (loaders, API, пути)
├── integrations/                       area · MCP, hooks, SDK
├── catalog/                       area · связь с глобальными справочниками
├── examples/                      area · живые демо (string-field-full)
│
├── platform-map.md                topic · эта карта (подробнее)
├── agent-groups.md                     topic · слои storage
└── ideasmd.md                          topic · backlog продукта
```

## Паттерн на каждом уровне

| Слой | Файл | Назначение |
|------|------|------------|
| Human | `{name}.md` | манифест топика, frontmatter |
| Machine | `storage/{name}/configuration/schema.yml` | схема типа / конфиг |
| Data | `storage/{name}/content/` | записи, черновики, CSV |

## Связь с кодом

| Workspace | Код в репозитории |
|-----------|-------------------|
| `types-of-components/` | `awn-types/` (пока runtime читает отсюда) |
| `runtime/` | `server.js`, `*-loader.js`, `manifest-paths.js` |
| `integrations/` | `mcp-server/`, hooks |
| `catalog/` | `data/catalog/` (отдельный workspace) |

Подробное дерево — [platform-map.md](platform-map.md).
