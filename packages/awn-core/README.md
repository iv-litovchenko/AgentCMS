# @agent-cms/core

Исходники **обработки** платформы Agent CMS (loaders, manifest, handlers).

> **Статус:** 🟡 каркас + карта переноса. Код пока в корне репо; re-export через `index.js`.

## Связь слоёв

```
workspaces/agent-cms-core/types-of-components/**/schema.yml   ← ЧТО (спека)
packages/awn-core/                                            ← КАК (обработка)
server.js + public/main.js                                    ← приложение (тонкий слой)
```

## Структура

```
packages/awn-core/
├── README.md
├── MIGRATION.md              ← таблица «откуда → куда»
├── package.json
├── index.js                  ← re-export (фаза 0)
│
├── manifest/                 ← manifest-paths.js
├── loaders/
│   ├── types/                ← awn-types-loader.js
│   ├── fields/               ← awn-fields-loader.js, awn-field-registry.js
│   └── blocks/               ← awn-blocks-loader.js
├── yaml/                     ← awn-yaml-utils.js
├── catalog/                  ← catalog-*.js, platform-agent.js
├── agents/                   ← agent-registry.js
├── markdown/                 ← markdown-link-rewriter.js
└── handlers/                 ← (план) widget/block render registry
    ├── fields/
    └── blocks/
```

## Фазы переноса

| Фаза | Действие |
|------|----------|
| **0** (сейчас) | Каркас + `index.js` re-export из корня репо |
| **1** | Физический move `manifest/`, `yaml/`, `loaders/*` |
| **2** | Loader читает `**/configuration/schema.yml` из `agent-cms-core` |
| **3** | `handlers/fields` — registry widget из `main.js` |
| **4** | `server.js` → тонкий shell, routes в `packages/awn-server/` (опционально) |

Подробно — [MIGRATION.md](./MIGRATION.md).

## Использование (целевое)

```js
const core = require("@agent-cms/core");
// или по subpath:
const { getAwnTypesPayload } = require("@agent-cms/core/loaders/types");
const { AREA_MANIFEST_FILE } = require("@agent-cms/core/manifest");
```

Сейчас в `package.json` приложения путь: `"@agent-cms/core": "file:packages/awn-core"` (добавить на фазе 1).
