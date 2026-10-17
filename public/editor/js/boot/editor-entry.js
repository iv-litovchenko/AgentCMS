/**
 * Refactor 14 — phase 2 entry (future esbuild bundle root).
 *
 * Target pipeline:
 *   editor-entry.js → esbuild (bundle: true) → public/editor/main.js
 *
 * Migration order (import side-effects or explicit exports):
 *   1. core: slug-translit, external-file-mask, platform-status  (now lazy via loadEditorCoreHelpers)
 *   2. cms: awn-enum-options, node-config-bundle, topic-schema-slot-specs  (lazy: loadEditorCmsCore)
 *   3. monolith slices from public/editor/main.js
 *
 * Dev today: index loads main.js source directly; prod uses main.built.js minify.
 */

export {};
