# Refactor 14 — этапы 1–4 (2026-10-18)

| Этап | Статус | Что сделано |
|------|--------|-------------|
| 1 🏠 Главная | ✅ dev | Орбита: 5 пузырей, без alert; chunk host fix (`collectTopicsFromNode`) |
| 2 🔧 Boot landing | ✅ | `landing-chunk-boot.js` до `main.js`, `__agentCmsLandingChunkModule`, v **0.5.1029** |
| 3 ✂️ Slice main | ✅ slice | `editor-storage-path-runtime.js` + premain / entry / loader |
| 4 🏭 Prod | ✅ static | `npm run build:editor` → `main.29fdf6a2.built.js`; boot check **PASS** (HTTPS :3002) |

## Проверка у себя

1. **Cmd+Shift+R** → `main.js?v=0.5.1029`, `landing-chunk-boot.js?v=2`
2. **Карта / Форумы / Список / Лента** — клик по табам
3. **Prod:** `/?editorBuilt=1` → один `main.*.built.js` в Network
4. **CI-local:** `NODE_TLS_REJECT_UNAUTHORIZED=0 node scripts/refactor-14-boot-check.js https://127.0.0.1:3002`

Ручной prod UI smoke: `docs/REFACTOR-14-prod-smoke.md`.
