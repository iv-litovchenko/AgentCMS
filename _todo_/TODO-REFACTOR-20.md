# Рефакторинг — часть 20 (Оптимизация главной и внутренней страницы Agent CMS Editor)

😊😊😊😊 Пиши туда в самом начале

**Статус:** 🟡 код boot/docs в основном готов; замеры, prod bundle и регрессии — нет (2026-10-28)

**Связь:** продолжение по смыслу [REFACTOR-14](TODO-REFACTOR-14.md) (boot, lazy, slices `main.js`), но **фокус на двух маршрутах UI** — landing `/` и **внутренние** экраны workspace (дерево, редактор записи, слоты, панели). Общий пункт в [_todo_/TODO.md](TODO.md): «Оптимизация … JS, главная и страницы редактирования».

**Чат Cursor:** `<!-- uuid при старте работы -->`

---

## ✅ Готово

- **A** — `/api/health`, docs-meta только в app-docs + кэш; app-docs (`public/docs/`, `/app-docs`); модалки/docs JS/CSS вырезаны из editor; профиль → справочник
- **C** — landing chunk + modulepreload только на `/`; workspace F5 без eager `landing-chunk-boot`; graph/map lazy по view
- **D (boot)** — `loadLandingAgentsGroups` только на landing; workspace: defer postMain/secondary/comfort; menu panels по demand (`REFACTOR-20-phase-d.md`)
- **B (auto)** — `docs/REFACTOR-20-baseline.md`, `check:refactor-20`, devtools-steps, status

## Network — долгие запросы (DevTools, F5 `/`, 2026-10-28)

> **Time** в колонке — время в **очереди waterfall** (страница ждёт другие запросы/сервер), не только «чистый» backend. Много дублей — отдельная тема. Initiator часто показывает `connection-status.js` из‑за патча `fetch`, реальный вызов — в `main.js` / boot.

| Запрос | ~Size | ~Time (скрин) | Зачем | Направление REFACTOR-20/14 |
|--------|-------|---------------|-------|----------------------------|
| ~~bulk `GET /api/agents/menus?maxDepth=3`~~ | — | — | Hub twigs (landing) | [x] Hub: `GET /api/menu?agent=…&maxDepth=3` по workspace (до 4 паралл., idle); Orbit без bulk; кэш `landingHubTopicsByAgent` |
| `GET /api/health?ts=…` | 0.2 kB | 9–42 s, timeout | Ping сервера | Уже лёгкий endpoint; долгий time = очередь/сервер |
| `GET /api/agents` | — | cancel ~12 s | Список workspace boot | Critical path landing/workspace |
| `GET …/text?agent=main` | 0.5 kB | ~6 s | Context buffer | Lazy до открытия панели |
| ~~`GET …/ui-rotators`~~ | — | — | **Убрано:** статика в `index.html`, `0-ui` скрыт в меню | — |
| `GET …/recent-updates?limit=80` | 60 kB | 44 s – 1.7 min | Лента обновлений | [x] только Flow, 1× + dedupe, idle |
| `GET …/settings-global` | 6 kB | 45–51 s | Глобальные UI settings | С boot, но не блокировать splash |
| `GET …/main` (fetch, не main.js) | 16 kB | 34 s – 1.6 min | Focus/landing «main» items | [x] Orbit/Grid 1× + dedupe, idle |
| `GET …/monitor?agent=…` | 2.7 kB | **2.4–3.8 min** | Индексы в меню workspace | [x] не на landing; только workspace + popover индексов |
| `GET /api/.../workspace-preview?path=…` | webp ~30–40 kB | 43–47 s | Превью карточек агентов | [x] stable `t=` (agent id), lazy img, coalesce landing shell render; следить Network |
| `GET /api/agents/git-summaries` | JSON | долго | Git под пузырями Orbit | [x] client cache 90s + idle; server cache 60s, max 4 parallel git |
| `main.js?v=…` | **~5 MB** | ~46 s | Editor bundle dev | `build:editor`, slices REFACTOR-14 |
| `context-buffer-panel.js` | 14 kB | ~53 s | Панель context buffer | Уже premain; проверить нужность на `/` |
| `GET …/status` (app-lock) | 0.5 kB | ~37 s | App lock scanner | Sync в index по дизайну |

---

## ⏳ Доделать (кратко)

1. **B** — DevTools Performance + Coverage на F5 `/` и workspace; таблицы в baseline
2. **A хвост** — [x] preview картинок в app-docs guides (`user-docs-markdown-preview-runtime.js`); `build:editor` → `main.built.js`; `APP_LOCK_APPS` для docs при необходимости
3. **D хвост** — [x] slices: `editor-mode-groups-runtime.js`, `editor-save-api-runtime.js` (revisions); [x] hub rail: async placeholder + только `filled` слоты + блок «оглавление + слоты»; дальше — полный вынос `saveContent` (REFACTOR-14)
4. **Prod** — smoke `?editorBuilt=1` на `/` и workspace; gzip main/core после slices
5. **Регрессии** — `check:editor-boot`; ручной smoke (save, режимы, preview, file-hub)
6. **Критерии** — цифры baseline + подтверждение меньше unused JS + smoke dev/prod без регрессий

---

## Цель

- **Главная (`/`):** быстрый первый экран — минимум parse/execute до интерактивности; тяжёлая анимация/карты только по demand.
- **Внутренняя страница** (workspace shell, CHPU `/…`, режимы просмотра/редактирования): не тянуть landing/graph/dashboard, пока пользователь их не открыл; стабильный TTI при F5 на типичном workspace.

**Не цель:** переписать редактор целиком; сначала замеры → узкие места → lazy/route split → нарезка `main.js` там, где это бьёт по внутренним экранам.

---

## 1. Под вопросом: `GET /api/docs-meta?ts=…`

**Что видишь в Network:** периодический запрос с `ts=<Date.now()>` — это **не** «метаданные страницы», а **ping «жив ли сервер»**.

| | |
|--|--|
| **Кто дергает** | `public/editor/js/app/connection-status.js` — `HEALTH_URL = "/api/docs-meta"`, poll **30 с** (live) / **4 с** (lost), плюс при старте и «Повторить». |
| **Зачем `ts=`** | cache-bust, чтобы ответ не брался из кэша браузера. |
| **Что endpoint по задумке** | Мета **версий справки API/MCP** для select в UI: `{ defaultVersion, versions: [{ id, label, apiEndpointCount, mcpToolCount, … }] }` — см. `lib/docs/docs-registry.js` → `getDocsMeta()`, `server.js` route. |
| **Почему это странно** | Health-check **привязан к «тяжёлому» API**: на каждый вызов для **каждой** версии доков (`0.0.0`…`0.0.2`) грузятся `docs/api-*.js` + `docs/mcp-*.js` и **пересчитываются** все endpoint/tool counts — даже если пользователь **никогда** не открывал панель документации. |
| **Где ещё** | `connection-status` в prod-entry (`editor-entry.js`) и lazy loader — баннер «сервер не отвечает», патч `window.fetch` на `/api/*`. |

**Решение:**

- [x] **`GET /api/health`**; `connection-status.js` переключён.
- [x] **`/api/docs-meta`** — только app-docs; кэш counts в `getDocsMeta()`.

---

## 2. Предложение: приложение **`app-docs`** (справочник вне editor)

**Идея:** вынести из editor три пункта профиля — **Руководства**, **HTTP API**, **MCP Server** — в отдельное UI-приложение (как `app-chat` / `app-commander`), единый справочник с табами или маршрутами.

**Почему это бьёт в perf (факты по коду):**

| Проблема | Где |
|----------|-----|
| **`/api/docs-meta` на каждый F5 editor** | `main.js` ~137622: `void fetchDocsMeta().then(syncApiMcpDocVersionSelects…)` — даже если модалки не открывали |
| **Poll docs-meta каждые 30 с** | `connection-status.js` — см. п.1 |
| **Толстый DOM** | `index.html`: `#user-docs-modal`, `#api-docs-modal`, `#mcp-docs-modal` + MCP help static HTML |
| **Толстый JS** | ~400+ строк рендера API/MCP/user-docs **внутри `main.js`** (~135532+) + CSS `.api-docs-*` в `styles.css` |
| **Запросы по клику** | `/api/docs`, `/api/mcp-docs`, `/api/user-docs-index`, `/api/user-docs?path=…` — ок **только** в справочнике |

**Целевая схема (черновик):**

```
/app-docs/                    → PLATFORM_APP_CATALOG + rewrite (статика public/docs/)
  ?view=guides|api|mcp        → или hash / subpath
Editor profile menu           → ссылки «Открыть справочник» (новая вкладка или navigate)
GET /api/health               → connection-status в editor (без docs-meta)
```

**Одно vs два приложения:** одного **`app-docs`** достаточно (три раздела). Второе — только если разделить аудитории (guides vs dev API) или разный app-lock.

**Чеклист (когда пойдём в код):**

- [x] `public/docs/` — shell, CSS, search, версии
- [x] `platform-apps.js` — `docs` / `/app-docs`
- [x] Modals + ~17 KB JS + CSS api-docs вырезаны из editor; кнопки → app-docs
- [x] Удалены `api-docs-ui.js`, `mcp-docs-primitives-help.js`
- [ ] `APP_LOCK_APPS` — при необходимости `docs`
- [x] app-docs: prose (alerts, ==mark==, task lists, hljs), стили guides как preview editor
- [ ] `npm run build:editor` — обновить `main.built.js` для prod

---

## Два «двери» (smoke-матрица)

| Маршрут | Пример | Что должно грузиться сразу | Что отложить |
|---------|--------|----------------------------|--------------|
| Landing | `https://localhost:3000/` | shell, выбор workspace, лёгкий UI | orbit/flow/platform map, graph, RMM brain |
| Внутренний | `/0-ws-test/…`, `/0-ws-core/…` | menu, routing, save, props base, connection | landing chunks, тяжёлый preview, mermaid, wysiwyg |

---

## Workspace F5 (`/ws-focus`, …) — «1 запрос · async · по demand»

> **Чеклист реализации (✅/⬜):** [_todo_/TODO-REFACTOR-21.md](TODO-REFACTOR-21.md)

**Принцип:** на boot workspace — только **critical path** (agents, **одно** дерево меню если нужно открыть CHPU, routing). Остальное: **один** fetch на блок, **после** первого кадра / **idle** / **при раскрытии** band или popover. Повторы — dedupe + кэш сессии. **Свернутые** band’ы и закрытые popover’ы — **0** запросов.

### Header (toolbar)

| UI | Целевой API | Когда грузить | Сейчас | Статус |
|----|-------------|---------------|--------|--------|
| **◎ Фокус** `#header-focus-toggle` | `GET /api/agents/focus?agent=…` | 1× при **первом** открытии popover (или idle после меню); badge count из кэша | часто с boot / дубли с sidebar focus | ⏳ |
| **Индекс** `#header-index-toggle` | `GET /api/workspace-index/monitor` (+ policy/id по необходимости) | 1× при **открытии** popover; event `header-index-popover-open` | [x] не на landing; на workspace — только по popover | 🟡 проверить dedupe |
| Git / share / прочие header tools | по фиче | только по клику | см. baseline | ⏳ |

### Sidebar — верх (агент)

| UI | Целевой API | Когда грузить | Сейчас | Статус |
|----|-------------|---------------|--------|--------|
| **`#agent-preview-thumb`** | 1 URL: `media/file` или `workspace-preview` (stable `t=`) | 1× после `agents`; не блокировать меню | [x] registry URL + lazy; слайдер — отдельно | 🟡 |
| **NOTE / todo band** `#agent-todo-preview` | `GET /api/file` или system-files slice для `NOTE.md` | 1× если band **expanded** (или idle, если пользователь всегда открывает) | часто с boot | ⏳ |
| **Темы (дерево)** `#menu-tree-band` | `GET /api/menu?agent=…` | 1× на вход в workspace (**critical** для навигации); refresh только по ⟲ | boot + refreshMenu цепочки | 🟡 coalesce |
| **Мультиканальность** `#menu-awn-channels-band` | intake/summary API band’а | 0 на boot; 1× при **expand** или ⟲ | может тянуться с меню | ⏳ |

### Sidebar — низ (bands)

| UI | Целевой API | Когда грузить | Сейчас | Статус |
|----|-------------|---------------|--------|--------|
| **Статистика** `#menu-agent-stats` (63 тем · GB…) | storage/workspace summary | 1× **idle** или по `#menu-agent-stats-reload-btn`; не блокировать дерево | refresh при boot / несколько источников | ⏳ |
| **О системе** env popover | env/manifest/meta (1 endpoint или bundle) | 1× при **открытии** popover | «Загрузка…» + возможные дубли | ⏳ |
| **Накопители** `#menu-awn-databases-band` | catalog/summary DB band | 0 если свёрнут; 1× expand / ⟲ | refresh на boot | ⏳ |
| **Медиатеки** `#menu-media-library-band` | media libraries catalog | 0 если свёрнут; 1× expand / ⟲ | refresh на boot | ⏳ |
| **Репозитории** `#menu-repositories-band` | repos list API | 0 если свёрнут; 1× expand / ⟲ | skeleton «Загрузка…» на boot | ⏳ |
| **Системные секции** `#menu-static-footer` | LanguageTool, index monitor, dashboards… | **0 на boot**; каждая секция — 1× при **expand** секции / footer | [x] index monitor не на landing; footer init тянет panels | 🟡 |

### Voice / Shell (согласовано с Editor)

| UI | Целевой API | Когда | Статус |
|----|-------------|-------|--------|
| Shell hero avatar | тот же registry preview URL | 1× при смене agent | [x] `agent-registry-preview-url.js` |

### Что ещё легко забыть (workspace boot)

| Область | Риск |
|---------|------|
| `loadSystemFiles` / `_registration` / buffer | лишние file API до открытия записи |
| `loadAwnTypes`, taxonomies, field catalog | тяжёлые каталоги на boot |
| `loadAgentFocusItems` + `refreshAllFocusPanels` | дубли focus/main с landing-логикой |
| Agent **slider** catalog / playback | отдельно от одного avatar URL |
| **Notifications** / channel **SSE** / intake poll | long-poll только в workspace session |
| `settings-global`, **context-buffer** text | idle или по открытию панели |
| **Git** toolbar (status/fetch) | по открытию git view или lazy |
| **WorkspaceIndexPanel** / **AwnDashboards** | только expand / `ensureEditorMenuPanelsUi` при необходимости |
| **Preview** записей (node, search, graph) | не путать с avatar; грузить при открытии темы |
| Повтор **`/api/agents`** | после registry save — invalidate, не storm |

Замеры и чеклисты наследуем из REFACTOR-14:

- `npm run measure:editor`
- `npm run check:editor-boot`
- `docs/REFACTOR-14-baseline.md`, `docs/REFACTOR-14-smoke.md`, `docs/REFACTOR-14-status.md`

---

## 🌳 План (черновик)

```
REFACTOR-20
│
├── Фаза B — baseline по двум URL
│   ├── [x] `docs/REFACTOR-20-baseline.md` + `check:refactor-20` + devtools-steps
│   ├── [ ] Performance trace: F5 `/` и workspace (Scripting / Parse / LCP) — вручную
│   └── [ ] Coverage: % unused JS — вручную
│
├── Фаза C — главная `/`
│   ├── [x] `editor-boot-route.js` — landing-chunk boot + modulepreload только на `/`
│   ├── [x] workspace F5 (`/0-ws-*`) — main.js без eager `landing-chunk-boot`
│   └── [x] graph/map — уже `renderWorkspaceGraphViewLazy` по view (map/graph/…)
│
├── Фаза D — внутренняя страница
│   ├── [x] Route guard: `loadLandingAgentsGroups` только на landing route
│   ├── [x] Workspace boot: defer postMain + secondary; comfort + menu panels lazy/async
│   ├── [x] `docs/REFACTOR-20-phase-d.md`
│   ├── [ ] Дальнейшие slices из main (MODE_GROUPS, save/API, folder constants) — REFACTOR-14 P1
│   └── [ ] Правая панель слотов: async + только заполненные (TODO.md)
│
├── Фаза 3 — prod
│   ├── Smoke `?editorBuilt=1` на обоих маршрутах
│   └── Сравнение gzip main/core после каждого slice
│
└── Фаза 4 — регрессии
    ├── `check:editor-boot`
    └── Ручной smoke: сохранение, переключение режимов, preview, file-hub
```

---

## ✅ Критерии «готово» (черновик)

- [x] F5 `/`: landing не тянет workspace-only модули в boot (фаза C).
- [x] F5 workspace: landing/graph не в critical path boot (фазы C + D).
- [ ] F5 `/` и workspace: **цифры** Scripting/Parse/LCP в baseline.
- [ ] Coverage: снижение unused JS на обоих URL (целевые % — после замеров).
- [ ] Smoke UI dev + prod built — без регрессий на главной и на редактировании записи.
- [x] `docs/REFACTOR-20-baseline.md`, `docs/REFACTOR-20-status.md`, `npm run check:refactor-20`
- [ ] Таблицы Performance/Coverage в baseline заполнены (DevTools)

---

## 🔗 Связано

- [_todo_/TODO-REFACTOR-14.md](TODO-REFACTOR-14.md) — boot, lazy chunks, сборка, slices.
- `public/editor/js/boot/editor-script-loader.js` — точки lazy load.
- `scripts/refactor-14-boot-check.js`, `package.json` → `check:editor-boot`.

---

## Прогресс

| Дата | Что сделано |
|------|-------------|
| 2026-10-28 | Создан файл REFACTOR-20, scope: главная + внутренние страницы editor |
| 2026-10-28 | Фаза A: app-docs, health, modals/JS/CSS docs убраны из editor |
| 2026-10-28 | Фаза B: baseline doc, check:refactor-20, devtools-steps, REFACTOR-20-status |
| 2026-10-28 | Фаза C: editor-boot-route, условный landing boot в index.html |
| 2026-10-28 | Фаза D: workspace boot defer postMain/secondary/comfort; landing groups guard |
| 2026-10-29 | REFACTOR-21: demand-load sidebar в `main.js`; чеклист ниже |

---

## Workspace F5 — сводный чеклист (долгосрочно)

> Реализация: [TODO-REFACTOR-21.md](TODO-REFACTOR-21.md). Легенда: **[x]** сделано · **[~]** частично · **[ ]** не сделано.

### Кратко по блокам

| Блок | Идея | Готово |
|------|------|:------:|
| Фокус (header) | 1× `focus?agent=` — async, первое открытие popover; dedupe кэш | [x] |
| Avatar | 1× preview URL, не блокирует menu | [~] |
| NOTE band | 1× file/system — только если band открыт | [x] |
| Каналы / DB / медиа / repos | 0 на boot; 1× при expand или ⟲ | [x] |
| Дерево тем | 1× `menu?agent=` — critical path; без лишних refresh | [~] |
| Stats строка | 1× summary — idle или по reload | [~] |
| Static footer | никаких LT/index/dashboard на boot | [x] |
| Индекс (header) | 1× monitor bundle при popover | [x] |
| О системе | 1× env/meta при открытии popover | [x] |
| Shell hero avatar | тот же registry preview URL | [x] |

### 1. Header

| UI / API | Когда | Готово |
|----------|-------|:------:|
| **◎ Фокус** — `GET /api/agents/focus?agent=…` | первое открытие popover | [x] |
| **Индекс** — `GET /api/workspace-index/monitor` (+ policy/id) | открытие popover | [x] |
| Git / share / прочие header tools | по клику | [ ] |

### 2. Sidebar — верх

| UI / API | Когда | Готово |
|----------|-------|:------:|
| `#agent-preview-thumb` — 1 URL preview | после agents, lazy | [~] |
| NOTE `#agent-todo-preview` — file / system-files | band expanded | [x] |
| **Темы** `#menu-tree-band` — `GET /api/menu?agent=…` | 1× вход workspace; ⟲ без дублей | [~] |
| **Каналы** `#menu-awn-channels-band` — intake/summary | 0 boot; expand / ⟲ | [x] |

### 3. Sidebar — низ

| UI / API | Когда | Готово |
|----------|-------|:------:|
| **Stats** `#menu-agent-stats` — workspace/storage summary | idle или reload btn | [~] |
| **О системе** env popover — env/meta | открытие popover | [x] |
| **DB** `#menu-awn-databases-band` — catalog | 0 если свёрнут; expand / ⟲ | [x] |
| **Медиатеки** `#menu-media-library-band` — catalog | 0 если свёрнут; expand / ⟲ | [x] |
| **Репозитории** `#menu-repositories-band` — list | 0 если свёрнут; expand / ⟲ | [x] |
| **Static footer** `#menu-static-footer` — LT, index, dashboards | 0 boot; expand footer / секции | [x] |

### 4. Voice / Shell

| UI | Когда | Готово |
|----|-------|:------:|
| Shell hero avatar — `agent-registry-preview-url.js` | смена agent | [x] |

### 5. Риски (легко забыть на workspace boot)

| Область | Не на boot | Готово |
|---------|------------|:------:|
| `loadSystemFiles` / registration / context-buffer | file API до открытия записи | [~] |
| `loadAwnTypes`, field/taxonomy каталоги | тяжёлые справочники | [~] |
| Дубли focus — `loadAgentFocusItems` + panels | общий кэш / dedupe | [x] |
| Agent slider catalog / playback | отдельно от thumb URL | [ ] |
| Notifications / SSE / intake poll | только workspace session | [~] |
| `settings-global`, pomodoro/screensaver | idle или по UI | [ ] |
| Git toolbar status/fetch | не critical path | [ ] |
| `ensureEditorMenuPanelsUi` | не при setup footer на boot | [x] |
| Preview записей (search/graph/node) | при открытии темы | [ ] |
| Повтор `/api/agents` после save registry | invalidate, не storm | [ ] |

### Следующий шаг (из REFACTOR-21)

| Задача | Готово |
|--------|:------:|
| Defer bands + focus кэш (channels/DB/media/repos/footer) | [x] |
| Smoke F5 workspace — Network, свёрнутые bands = 0 запросов | [ ] |
| Coalesce `refreshMenu` / дожать stats + system-files | [~] |
