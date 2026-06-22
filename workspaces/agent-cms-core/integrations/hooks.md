---
awn-preview: ""
awn-emoji: ""
awn-name: hooks
awn-status: 🟡 Черновик
awn-type: awn.topic
awn-create: "2026-06-21T18:00"
awn-update: 2026-06-21T18:00:00.000Z
awn-description: Cursor hooks — автоматизация вокруг агента (план)
awn-main: false
awn-category: ""
awn-tags: [integrations]
awn-color: ""
awn-version: 1
awn-sort: ""
---

# Hooks (план)

| | |
|---|---|
| **Код** | `.cursor/hooks.json` (план) |
| **Skill** | create-hook |

## Идеи

- После save `.md` → bump `awn-version`, validate frontmatter
- Перед commit → lint paths / orphan awn-storage
- On agent switch → refresh types cache

## Статус

🟡 Только спека. Реализация — по мере стабилизации `runtime/loaders`.
