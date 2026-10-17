# Рефакторинг — часть 5

**Задача:** смена **Agent CMS** → новое имя (slug, UI, MCP, пути state). Кандидаты A–D — выбрать один перед массовым rename.

**✅** сделано · **❌** не сделано.

## Варианты названия

| # | Отображение | Slug (план) | Зачем |
| - | ----------- | ----------- | ----- |
| A | **a-memory cms** | `a-memory-cms` / `0-a-memory-cms` | префикс `a-` / `0-` — сортировка списков **сверху** (как `0-agent` в части 3) |
| B | **memory cms** | `memory-cms` | прямой slug без префикса сортировки |
| C | **1memory cms** | `1memory-cms` | цифра в начале — сортировка **сверху** |
| D | **memory1 cms** | `memory1-cms` | цифра в slug; порядок в списках зависит от локали сортировки |

После выбора: `.agent-cms/` → `.{slug-state}/`, `agent-cms-core` → `{slug}-core`, MCP `user-agent-cms` → `user-{slug}`, модули `lib/.../agent-cms*` — по таблице ниже.

## Agent CMS → выбранный вариант (общее)

| Статус | Сейчас | План (после выбора A–D) |
| ------ | ------ | ----------------------- |
| ❌ | Agent CMS | a-memory / memory / 1memory / memory1 cms |
| ❌ | `agent-cms` | slug из таблицы выше |
| ❌ | `.agent-cms/` | `.a-memory-cms/` · `.memory-cms/` · `.1memory-cms/` · `.memory1-cms/` |

| Статус | Область |
| ------ | ------- |
| ❌ | `lib/paths/agent-cms`, migrate, ports |
| ❌ | `workspaces/agent-cms-core` |
| ❌ | MCP namespace `user-agent-cms` |
| ❌ | UI `__AGENT_CMS_*__`, `a-cms-*` (см. TODO-REFACTOR-3) |

Миграция layout при старте — по аналогии с `migrateProjectAgentCmsLayout`; legacy `.agent-cms` — ⚠️ срок поддержки.

## Чат (Cursor)

`<!-- uuid при старте работы -->`

## Именованием AWN-свойств в что то более примелмемое acms- am-* вместо awn-*
Черновик **свойств** (не slug папок): `a-cms-*`, `a-topic`, `a-area` — отдельно от REFACTOR-3.