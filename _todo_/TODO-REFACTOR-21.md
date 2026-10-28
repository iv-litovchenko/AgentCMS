# REFACTOR-21 — Workspace F5: меньше запросов при загрузке

😊😊😊😊 Пиши туда в самом начале

**Зачем:** после F5 на workspace (`/ws-focus`, …) sidebar и header не должны **штормить** API. Каждый блок — **один** запрос, и только когда он реально нужен (открыли band, popover, или idle после меню).

**Где код:** `public/editor/main.js`, `public/_resources/agent-registry-preview-url.js`, `server.js` (thumb для `/api/media/file`).

**Связь:** [TODO-REFACTOR-20.md](TODO-REFACTOR-20.md).

**Легенда:** ✅ сделано · 🟡 частично · ⬜ не сделано

---

## Одна таблица

| № | Что | | Комментарий |
|---|-----|:-:|-------------|
| | **Header** | | |
| 1 | **Фокус** — `GET /api/agents/focus` idle на «Главной» (как `/api/agents/main` на landing); popover — из кэша или 1× если открыта тема | ✅ | `scheduleWorkspaceAgentFocusLoadIfNeeded` |
| 2 | **Индекс** — monitor только при popover «Индекс» | ✅ | REFACTOR-20 + `header-index-popover-open` |
| 3 | Git / share в header — только по клику | ⬜ | не трогали |
| | **Sidebar верх** | | |
| 4 | **Avatar** — один URL, lazy, **thumb** webp, не полный PNG | 🟡 | `thumb=1&max=720`; слайдер catalog отдельно (п.15) |
| 5 | **NOTE.md** — fetch только если band раскрыт | ✅ | `refreshNotePreview` по expanded |
| 6 | **Дерево тем** — 1× `menu?agent=` на F5 | 🟡 | coalesce лишних `refreshMenu` — нет |
| 7 | **Каналы** — 0 boot; load при expand | ✅ | catalog при expand; **intake/batch** отдельно от stats |
| 7b | **`POST /api/intake/batch`** — бейджи дерева | ✅ | **после** idle-каталогов bands (~1.5s); видимые темы; кэш; не сразу после `/api/menu` |
| 7c | **`POST /api/node/read/batch`** — «!» прочитано в меню | ✅ | вместо N× GET `/api/node/read`; idle; записи темы — в `paths[]` одного manifest |
| | **Sidebar низ** | | |
| 8 | **DB / медиа / repos / каналы** — не с tree | ✅ | не в `refreshMenu`; idle **1.5s** + только **раскрытые** bands **по очереди**; DB `summary=1`; repos без README/ensureAwnId |
| 9 | **Static footer** — без LT/index на boot | ✅ | panels при expand footer |
| 10 | **Stats** — idle, без env на boot | ✅ | **`workspace-stats` 1×** на agent; ⟲ reload; counts из menu без повтора |
| 11 | **О системе** — env только popover | ✅ | нет boot `syncMenuSystemEnvironment()` |
| | **Прочее boot** | | |
| 12 | **`/api/system-files`** — не без нужды на boot | ⬜ | всё ещё в `init()` |
| 13 | **`loadAwnTypes`** — не блокировать menu | 🟡 | после `refreshMenu` |
| 14 | **Focus** — без дублей | ✅ | inflight + кэш; не на F5 при открытой теме |
| 15 | **Agent slider** — catalog не в boot storm | ⬜ | при смене agent как раньше |
| 16 | **Git remote** — только `#sidebar-git-btn` / git view | ✅ | маркеры в дереве/repos — **`hasGitSelf` из menu**; без `fetchRemote` на `renderMenu` |
| 17 | settings-global, pomodoro, context-buffer | ⬜ | вне scope |
| 18 | Notifications / SSE | 🟡 | poll после session; **`/api/shell/stream`** — отдельно Voice/Shell (не REFACTOR-21 editor) |
| 19 | Preview записей (graph/search) | ⬜ | при открытии темы |
| 20 | `/api/agents` после save registry | ⬜ | invalidate |
| | **Проверка** | | |
| 21 | Smoke F5 — свёрнутые bands = 0 лишних запросов | ⬜ | DevTools вручную |
| 22 | `npm run build:editor` → `main.built.js` | ⬜ | нужен esbuild |

---

### Итого

| ✅ | 🟡 | ⬜ |
|--:|--:|--:|
| 10 | 4 | 8 |

**Дальше:** ⬜ smoke → ⬜ system-files → 🟡 stats (workspace-stats реже) → ⬜ git prefetch → 🟡 menu coalesce.

---

## Прогресс

| Дата | Запись |
|------|--------|
| 2026-10-28 | Demand-load bands, focus, NOTE, env, footer — `main.js` |
| 2026-10-29 | Таблица со статусами ✅/🟡/⬜ |
| 2026-10-29 | Avatar: `thumb=1` для media/file + workspace-preview; thumb cache на server |
| 2026-10-29 | `workspace-stats` 1× + reload; git remote только sidebar/git view; menu markers — `hasGitSelf` |
| 2026-10-29 | Bands: каталоги после `refreshMenu` idle; фокус workspace — как landing main (`scheduleWorkspaceAgentFocusLoadIfNeeded`) |
| 2026-10-29 | Bands perf: `summary=1` для sidebar DB; repos list без README body; bands rAF не idle 2.5s; каналы без force intake |

## 🔗 Связано

- [TODO-REFACTOR-20.md](TODO-REFACTOR-20.md)
- `public/editor/js/panels/semantic-index-panel.js`
- `public/_resources/agent-registry-preview-url.js`
