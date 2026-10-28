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

## ⏳ Доделать (кратко)

1. **B** — DevTools Performance + Coverage на F5 `/` и workspace; таблицы в baseline
2. **A хвост** — preview картинок в app-docs guides; `build:editor` → `main.built.js`; `APP_LOCK_APPS` для docs при необходимости
3. **D хвост** — slices `main.js` (REFACTOR-14 P1); правая панель слотов async (TODO.md)
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
- [ ] app-docs: preview картинок в guides как в editor (A6)
- [ ] `npm run build:editor` — обновить `main.built.js` для prod

---

## Два «двери» (smoke-матрица)

| Маршрут | Пример | Что должно грузиться сразу | Что отложить |
|---------|--------|----------------------------|--------------|
| Landing | `https://localhost:3000/` | shell, выбор workspace, лёгкий UI | orbit/flow/platform map, graph, RMM brain |
| Внутренний | `/0-ws-test/…`, `/0-ws-core/…` | menu, routing, save, props base, connection | landing chunks, тяжёлый preview, mermaid, wysiwyg |

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
