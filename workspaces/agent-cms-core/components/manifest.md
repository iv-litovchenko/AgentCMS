---
awn-preview: ""
awn-emoji: 🧩
awn-name: Компоненты
awn-status: 🟡 Черновик
awn-type: awn.area
awn-description: Реестр типов платформы — каждый тип это awn.topic (поле, блок, frame)
awn-main: true
awn-tags: [architecture, registry]
awn-version: 2
---

# components

Каждый тип системы — **топик** в этой области. Активность — `awn-status: "🟢 Открыта"`.

| Область | Что описывает |
|---------|---------------|
| [fields/](fields/_registration.md) | типы полей (`awn.string`, …) |
| [markdown-blocks/](markdown-blocks/_registration.md) | блоки редактора (`awn.block.h2`, …) |
| [frames/](frames/_registration.md) | frame-типы (`awn.topic`, `awn.area`, …) |

См. [README.md](./README.md). Loader: `components-loader.js` → `/api/components`.
