# REFACTOR-21 — Workspace F5: меньше запросов при загрузке

😊😊😊😊 Пиши туда в самом начале

**Зачем:** после F5 на workspace (`/ws-focus`, …) sidebar и header не должны **штормить** API. Каждый блок — **один** запрос, и только когда он реально нужен (открыли band, popover, или idle после меню).

**Где код:** `public/editor/main.js`, `public/_resources/agent-registry-preview-url.js`, `server.js` (thumb для `/api/media/file`).

**Связь:** [TODO-REFACTOR-20.md](TODO-REFACTOR-20.md).

**Легенда:** **[x]** сделано · **[~]** частично · **[ ]** не сделано

---

## Одна таблица

| № | Что | ✓ | Комментарий |
|---|-----|:-:|-------------|
| | **Header** | | |
| 1 | **Фокус** — `GET /api/agents/focus` только при открытии popover, не на F5 | [x] | dedupe/inflight `loadAgentFocusItems` |
| 2 | **Индекс** — monitor только при popover «Индекс» | [x] | REFACTOR-20 + `header-index-popover-open` |
| 3 | Git / share в header — только по клику | [ ] | не трогали |
| | **Sidebar верх** | | |
| 4 | **Avatar** — один URL, lazy, **thumb** webp, не полный PNG | [~] | `thumb=1&max=720`; слайдер catalog отдельно (п.15) |
| 5 | **NOTE.md** — fetch только если band раскрыт | [x] | `refreshNotePreview` по expanded |
| 6 | **Дерево тем** — 1× `menu?agent=` на F5 | [~] | coalesce лишних `refreshMenu` — нет |
| 7 | **Каналы** — 0 boot; load при expand | [x] | visible-only summaries + intake при expand |
| | **Sidebar низ** | | |
| 8 | **DB / медиа / repos** — 0 boot; expand / ⟲ | [x] | default collapsed |
| 9 | **Static footer** — без LT/index на boot | [x] | panels при expand footer |
| 10 | **Stats** — idle, без env на boot | [~] | `workspace-stats` на idle; intake если каналы закрыты — ок |
| 11 | **О системе** — env только popover | [x] | нет boot `syncMenuSystemEnvironment()` |
| | **Прочее boot** | | |
| 12 | **`/api/system-files`** — не без нужды на boot | [ ] | всё ещё в `init()` |
| 13 | **`loadAwnTypes`** — не блокировать menu | [~] | после `refreshMenu` |
| 14 | **Focus** — без дублей | [x] | кэш + только popover на boot |
| 15 | **Agent slider** — catalog не в boot storm | [ ] | при смене agent как раньше |
| 16 | **Git toolbar** prefetch — не в critical path | [ ] | в `renderMenu` |
| 17 | settings-global, pomodoro, context-buffer | [ ] | вне scope |
| 18 | Notifications / SSE | [~] | poll после session |
| 19 | Preview записей (graph/search) | [ ] | при открытии темы |
| 20 | `/api/agents` после save registry | [ ] | invalidate |
| | **Проверка** | | |
| 21 | Smoke F5 — свёрнутые bands = 0 лишних запросов | [ ] | DevTools вручную |
| 22 | `npm run build:editor` → `main.built.js` | [ ] | нужен esbuild |

---

### Итого

| | |
|--|--:|
| [x] | 8 |
| [~] | 5 |
| [ ] | 9 |

**Дальше:** [ ] 21 smoke → [ ] 12 system-files → [~] 10 stats → [~] 6 menu coalesce.

---

## Прогресс

| Дата | Запись |
|------|--------|
| 2026-10-28 | Demand-load bands, focus, NOTE, env, footer — `main.js` |
| 2026-10-29 | Одна таблица; галочки [x]/[~]/[ ] |
| 2026-10-29 | Avatar: `thumb=1` для media/file + workspace-preview; thumb cache на server |

## 🔗 Связано

- [TODO-REFACTOR-20.md](TODO-REFACTOR-20.md)
- `public/editor/js/panels/semantic-index-panel.js`
- `public/_resources/agent-registry-preview-url.js`
