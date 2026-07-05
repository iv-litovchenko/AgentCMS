---
awn-name: CMS-модель агента
awn-type: awn.page.area
awn-status: "🟢 Открыта"
awn-description: Встроенная type system этого агента — не контент, а схема CMS
awn-color: "#6366f1"
---

# awn-system

Это **модель CMS агента** `[Agent CMS] Test`. Runtime читает YAML из `awn-system/types/`.

| Файл | Назначение |
|------|------------|
| [registry.yml](registry.yml) | реестр доменов, mode: agent-owned |
| [MAP.md](MAP.md) | карта системы для агента (START HERE) |
| [slots-bindings.yml](slots-bindings.yml) | слот → content-type |
| [types/](types/) | все типы (pages, content, slots, fields…) |

Контент пользователя — в `awn-container/`, не здесь.
