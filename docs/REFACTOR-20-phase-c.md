# Refactor 20 — фаза C (главная `/`)

## Сделано

1. **`public/editor/js/boot/editor-boot-route.js`**
   - `needsLandingChunkAtBoot()` — true только для `/` и `/index.html`.
   - `isWorkspaceBootRoute()` — CHPU workspace без landing preload.

2. **`public/editor/index.html`**
   - `modulepreload` landing **не** в статическом `<head>` — только если `needsLandingChunkAtBoot()`.
   - `startEditorMain`: `landing-chunk-boot.js` **перед** main только на `/`; на `/0-ws-core/…` сразу main + premain chain.

3. **Graph / agent-map**
   - Без изменений: chunk грузится через `renderWorkspaceGraphViewLazy("map"|"map2"|"map3"|"graph")` при выборе вида workspace.

## Проверка

```bash
npm run check:refactor-20:offline
# после restart сервера:
# F5 /0-ws-core → Network: нет landing-runtime.js / landing-chunk-boot до main (до клика «домой»)
# F5 / → landing-runtime подгружается
```

## Переход «Домой» из workspace

`showAppLandingView()` → `ensureLandingChunkLoaded()` → dynamic `import()` landing-runtime (если boot пропустил chunk).
