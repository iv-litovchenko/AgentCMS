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

## Шаг 1 — `awn-container` → `awn-topics` ✅

| Сделано | Детали |
| ------- | ------ |
| ✅ | Default **`awn-topics`**: `agent-registry`, `manifest-paths`, `index-policy`, UI `CONTAINER_FOLDER_DEFAULT` |
| ✅ | Read-алиас **`awn-container/`** → **`awn-topics/`**: `rewriteLegacyTopicsRootInRelPath` (+ `normalizeWorkspacePath`, `normalizePageManifestPath`) |
| ✅ | Workspace **`agent-cms-test`**: папка переименована, живые пути в md/json обновлены |
| ✅ | Примеры MCP/UI/docs: **`GLOBAL-DOC-MCP`**, **`SKILL.md`**, mcp-server, `public/index.html` |

После деплоя: **rebuild indexes** для workspace с миграцией.

---

## Шаг 2 — `awn-agent-kit` → `awn-topics/agent-kit` ✅

| Сделано | Детали |
| ------- | ------ |
| ✅ | Default **`awn-topics/agent-kit`**: `agent-registry`, UI, identity/voice defaults |
| ✅ | Read-алиас **`awn-agent-kit/`** и корневой **`agent-kit/`** → **`awn-topics/agent-kit/`** (`rewriteLegacyAgentKitInRelPath`) |
| ✅ | **`agent-cms-test`**: папка перенесена; пути в живых файлах обновлены |
| ✅ | Container tree: секция **`agent-kit`** скрыта из **`containerTree`** (остаётся **`serviceTree`**) |

---

## Шаг 3 — `awn-shared` → `awn-topics/shared` ✅

| Сделано | Детали |
| ------- | ------ |
| ✅ | Default **`awn-topics/shared`**: `agent-registry`, UI, `always-context-ws-folder`, index-policy |
| ✅ | Read-алиас **`awn-shared/`** → **`awn-topics/shared/`** (`rewriteLegacySharedInRelPath`) |
| ✅ | **`agent-cms-test`**: папка перенесена; пути в живых файлах обновлены |
| ✅ | Container tree: секция **`shared`** скрыта из **`containerTree`** (остаётся **`sharedTree`**) |

После деплоя: **rebuild indexes**.

---

## План работ (остальное)

| Статус | Шаг |
| ------ | --- |
| ✅ | **Шаги 1–3:** единый корень **`awn-topics/`** (+ секции **`agent-kit`**, **`shared`**) |
| ✅ | Тип **`awn.hub.topic.section`** — manifest секций **`0-agent-kit`**, **`0-shared`** + infer/create |
| ❌ | **`list_topics` / INDEX**: pinned секции **`shared`**, **`agent-kit`** |
| ✅ | Документация: **`TODO-REFACTOR-4`** § «Дерево hub workspace» |

---

## Чат (Cursor)

`<!-- uuid при старте работы -->`
