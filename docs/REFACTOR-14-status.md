# Refactor 14 — статус (2026-10-18)

Краткий отчёт «что осталось». Полный чеклист: `_todo_/TODO-REFACTOR-14.md`.

| Приоритет | Задача | Статус | Комментарий |
|-----------|--------|--------|-------------|
| 🔴 P0 | DevTools Performance (Scripting/Parse) | ⏳ | → `REFACTOR-14-baseline.md` |
| 🔴 P0 | Coverage % unused JS | ⏳ | 3 URL в baseline |
| 🔴 P0 | Smoke UI (dev) | ⏳ | `REFACTOR-14-smoke.md` |
| 🟠 P1 | **Фаза 4 — нарезка `main.js`** | ⏳ | Slices 1–3: channel, media, chpu, system-files, shared-theme (~−20 KB+) |
| 🟠 P1 | Core ≪ 1 MB gzip | ❌ | После многих slices / route split |
| 🟡 P2 | Prod smoke `?editorBuilt=1` | ⏳ | `REFACTOR-14-prod-smoke.md` |
| 🟡 P2 | Prod bundle (entry) | ✅ | Панели, comfort, deferred modules |
| 🟢 P3 | file-hub в entry | 📌 | On-demand — можно не bundling |
| 🟢 P3 | app-lock sync | 🔒 | Намеренно |
| ✅ | Lazy boot (фаза 3) | ✅ | |
| ✅ | Hash/manifest/cache (фаза 5) | ✅ | |
| ✅ | `check:editor-boot` | ✅ | После правок boot |

**Легенда:** ✅ · ⏳ · ❌ · 🔒 · 📌

**Следующие slices (P1):** folder/path constants (agent-kit/container), `MODE_GROUPS` / navigation, save/API helpers.

**Размеры:** `npm run measure:editor` — смотреть `main.js` raw после каждого slice.
