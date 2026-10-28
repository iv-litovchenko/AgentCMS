# Рефакторинг — часть 20 (Оптимизация главной и внутренней страницы Agent CMS Editor)

😊😊😊😊 Пиши туда в самом начале

**Статус:** 🟡 идея (2026-10-28) — не начато

**Связь:** продолжение по смыслу [REFACTOR-14](TODO-REFACTOR-14.md) (boot, lazy, slices `main.js`), но **фокус на двух маршрутах UI** — landing `/` и **внутренние** экраны workspace (дерево, редактор записи, слоты, панели). Общий пункт в [_todo_/TODO.md](TODO.md): «Оптимизация … JS, главная и страницы редактирования».

**Чат Cursor:** `<!-- uuid при старте работы -->`

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

**Решение (обсудить, не сделано):**

- [ ] Вынести лёгкий **`GET /api/health`** или **`/api/ping`** → `{ ok: true }` (или reuse существующий минимальный route, если есть).
- [ ] Переключить `connection-status.js` на него; **`/api/docs-meta`** оставить только для UI справки (по открытию панели docs).
- [ ] Опционально: кэшировать counts в `getDocsMeta()` / не считать на каждый GET.

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

- [ ] `public/docs/` — лёгкий shell, свой CSS, search, версии
- [ ] `lib/platform/platform-apps.js` — `appId: "docs"`, `publicPath: "/app-docs"`, `showInEditorDropdown: true`
- [ ] Убрать modals + handlers из editor; кнопки → `/app-docs/?view=…`
- [ ] Вынести `api-docs-ui.js`, `mcp-docs-primitives-help.js`, логику из `main.js`
- [ ] Убрать `fetchDocsMeta()` с boot editor; health — п.1
- [ ] `APP_LOCK_APPS` — при необходимости `docs`

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
├── Фаза 0 — baseline по двум URL
│   ├── Performance trace: F5 `/` и F5 типичный workspace (Scripting / Parse / LCP)
│   ├── Coverage: % unused JS на landing vs внутренней
│   └── Таблица «до» в docs/REFACTOR-20-baseline.md (создать при старте)
│
├── Фаза 1 — главная
│   ├── Проверить, что landing-* только на `/` (import() / loader guards)
│   ├── Отложить graph/agent-map до явного режима
│   └── Убрать лишние sync-скрипты из index для landing-only пути (если останутся)
│
├── Фаза 2 — внутренняя страница
│   ├── Route guard: не инициализировать landing при workspace route
│   ├── Lazy: menu panels, comfort, document-viewer — только при открытии панели/файла
│   ├── Дальнейшие slices из main (MODE_GROUPS, save/API, folder constants) — см. REFACTOR-14 P1
│   └── Правая панель слотов: async + только заполненные (пересечение с TODO.md)
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

- [ ] F5 `/`: зафиксирован baseline Scripting/Parse; landing не тянет workspace-only модули.
- [ ] F5 workspace: зафиксирован baseline; landing/graph не в critical path.
- [ ] Coverage: снижение unused JS на обоих URL (целевые % — после фазы 0).
- [ ] Smoke UI dev + prod built — без регрессий на главной и на редактировании записи.
- [ ] Документ `docs/REFACTOR-20-baseline.md` + строка в `docs/REFACTOR-14-status.md` или отдельный `docs/REFACTOR-20-status.md`.

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
