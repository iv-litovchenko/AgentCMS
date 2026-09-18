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
| [GLOBAL_MCP_DOC.md](../GLOBAL_MCP_DOC.md) | карта MCP для агента (START HERE) |
| [types/slots/](types/slots/) | слоты: path, allowed-content, accept-files |
| [types/](types/) | все типы (pages, content, slots, fields…) |

Контент пользователя — в `awn-container/`, не здесь.
