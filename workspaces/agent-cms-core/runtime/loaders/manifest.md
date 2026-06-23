---
awn-preview: ""
awn-emoji: ""
awn-name: loaders
awn-status: 🟡 Черновик
awn-type: awn.topic
awn-create: "2026-06-21T18:00"
awn-update: 2026-06-21T18:00:00.000Z
awn-description: Загрузчики типов, полей и блоков
awn-main: false
awn-category: ""
awn-tags: [runtime]
awn-color: ""
awn-version: 1
awn-sort: ""
---

# Loaders

| | |
|---|---|
| **Код** | `awn-types-loader.js`, `awn-fields-loader.js`, `awn-blocks-loader.js`, `awn-field-registry.js` |
| **Источник сейчас** | `awn-types/` в корне репозитория |
| **Целевой источник** | `agent-cms-core/types-of-components/**/configuration/schema.yml` |

## Что загружают

| Loader | Содержимое |
|--------|------------|
| types | component types: workspace, area, topic, record… |
| fields | `awn.string`, `awn.boolean`, `awn.array`… |
| blocks | `awn.block.h2`, groups, templates |

## Миграция

1. Скан `**/configuration/schema.yml` в `types-of-components/`
2. Merge с override из `agentRoot/awn-types/` (если есть)
3. `awn-types/` в корне — deprecated alias или build output

## Каталог эталонных схем

[types-of-components/](../types-of-components/_registration.md)
