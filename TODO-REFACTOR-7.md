# Рефакторинг — часть 7

**Задача:** один корень **тем** на диске и в модели hub — **`awn-topics/`** вместо разрозненных **`awn-container`**, **`awn-shared`**, **`awn-agent-kit`**.

**✅** сделано · **❌** не сделано.

**Связано:** часть 6 (G6 — placement **`topic`**), часть 4 (дерево MCP), `lib/config/manifest-paths.js` (`containerFolder`, default **`awn-container`**), `lib/config/index-policy.js`, `always-context-ws-folder` и прочие пути с **`awn-shared/`**.

---

## Идея (решение)

| # | Сейчас | Целевое |
| - | ------ | ------- |
| 1 | **`awn-container/`** | **`awn-topics/`** — корень hub тем |
| 2 | **`awn-shared/`** (соседний корень) | **`awn-topics/shared/`** — секция, тип **`awn.hub.topic.section`** |
| 3 | **`awn-agent-kit/`** (соседний корень) | **`awn-topics/agent-kit/`** — секция, тип **`awn.hub.topic.section`** |

**Зачем:** имя **`topics`** совпадает с MCP **`placement.kind: topic`** и семьёй hub; **`container`** — устаревший термин. **`shared`** и **`agent-kit`** — не отдельные «леса», а **секции** одного topic-hub (INDEX, онбординг, pinned в каталоге).

---

## Целевое дерево (концепт)

```
awn-topics/                          ← бывш. awn-container
├── manifest.md                      ← корень hub (тип: зафиксировать — awn.hub.topic / area-root)
├── shared/                          ← бывш. awn-shared
│   ├── manifest.md                  ← awn.hub.topic.section
│   └── …/                           ← обычные topic внутри секции
├── agent-kit/                       ← бывш. awn-agent-kit
│   ├── manifest.md                  ← awn.hub.topic.section
│   └── agent/ user/ …
└── finansy/ php/ …                  ← пользовательские темы (как сейчас под container)
```

---

## Плюсы

- Смысл: **`awn-topics`** ≈ **`placement.kind: topic`** + hub.
- Один корень вместо трёх соседних папок.
- **`shared`** / **`agent-kit`** как секции — проще **`read_topic_index_toc`**, **`list_topics`** (scope + pinned).

---

## Риски и условия

| Область | Что учесть |
| ------- | ---------- |
| Миграция данных | Все workspace: пути, wikilinks, entity/link index, history paths |
| Конфиг / код | **`containerFolder`** (default **`awn-container`**) → **`awn-topics`** + переходный алиас или symlink |
| Настройки | **`always-context-ws-folder`**: сейчас **`awn-shared/context/awn-storage/`** → **`awn-topics/shared/context/…`** |
| MCP / UI | Legacy **`path`** с префиксом **`awn-container/`** — алиас на чтение на переходный период |
| Каталог | **`list_topics`**: секции pinned; flat-списки не смешивать kit с личными темами без **`scope`** |
| Типы | **`awn.hub.topic.section`** — новый (или переименование **`awn.page.area`**); не путать с legacy INDEX **`awn.page.area`** |

**Вердикт:** делать **отдельным шагом после G6–G9** (часть 6): rename hub-папки + тип секции + **один migration script** + rebuild indexes.

---

## План работ (черновик)

| Статус | Шаг |
| ------ | --- |
| ❌ | Тип **`awn.hub.topic.section`** в **`types/hubs/`** (manifest, slots, extends) |
| ❌ | Константа корня: **`awn-topics`**, **`containerFolder`** / index-policy / manifest-paths |
| ❌ | Скрипт миграции: move **`awn-container` → `awn-topics`**, **`awn-shared` → `awn-topics/shared`**, **`awn-agent-kit` → `awn-topics/agent-kit`** |
| ❌ | Обновить hardcoded пути (agent settings, docs, sandbox hints, examples) |
| ❌ | Алиас **`awn-container/**` → **`awn-topics/**`** (read path, опционально write warn) |
| ❌ | **`list_topics` / INDEX**: правила для секций **`shared`**, **`agent-kit`** |
| ❌ | Документация: **`GLOBAL-DOC-MCP`**, **`SKILL.md`**, **`TODO-REFACTOR-4`** |

---

## Чат (Cursor)

`<!-- uuid при старте работы -->`
