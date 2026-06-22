---
awn-preview: ""
awn-emoji: 📦
awn-name: packages-layout
awn-status: 🟡 Черновик
awn-type: awn.topic
awn-create: "2026-06-22T14:00"
awn-update: 2026-06-22T14:00:00.000Z
awn-description: Где хранятся исходники обработки — packages/awn-core
awn-main: false
awn-category: runtime
awn-tags: [packages, architecture]
awn-color: ""
awn-version: 1
awn-sort: ""
---

# packages/awn-core — исходники обработки

## Разделение

| | Где | Пример |
|---|-----|--------|
| **Спека (what)** | workspace `agent-cms-core` | `types-of-components/fields/.../schema.yml` |
| **Обработка (how)** | `packages/awn-core/` | loaders, manifest, handlers |
| **Приложение** | корень репо | `server.js`, `public/`, `electron/` |

Workspace **не содержит** `.js` платформы (кроме пользовательских `scripts/` в агентах).

---

## Дерево пакета

```
packages/awn-core/
├── manifest/          manifest-paths.js
├── yaml/              awn-yaml-utils.js
├── loaders/
│   ├── types/         awn-types-loader.js
│   ├── fields/        awn-fields-loader, field-registry
│   └── blocks/        awn-blocks-loader.js
├── catalog/           catalog-*.js
├── agents/            agent-registry.js
├── markdown/          link-rewriter
└── handlers/          (план) widgets из main.js
```

Полная таблица переноса: [`packages/awn-core/MIGRATION.md`](../../../../packages/awn-core/MIGRATION.md)

---

## Фазы

| # | Что |
|---|-----|
| 0 | Каркас + `index.js` re-export ✅ |
| 1 | Физический move manifest, yaml, loaders |
| 2 | Loader ← `**/configuration/schema.yml` из core |
| 3 | `handlers/fields` ← extract из main.js |
| 4 | (опц.) `packages/awn-server` ← server.js |

---

## Цепочка string (где код)

```
schema.yml (widget: input)
    → loaders/fields     fieldRegistry["awn.string"]
    → server.js          GET /api/awn-types
    → handlers/fields    resolvePropsFieldWidget  (план)
    → public/main.js     createPropsFormTextValueControl (сейчас)
```

---

## Проверка после миграции

Агент **Platform core** → **examples** → **string-field-full** → **sample-record** → вкладка **Свойства**.
