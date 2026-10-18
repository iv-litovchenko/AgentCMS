/**
 * Media library builtin presets (refactor 14 — slice from main.js).
 * Sync: lib/config/media-library-presets.js
 */
(function initMediaLibraryPresetsRuntime(global) {
/** Заготовки медиатек — порядок и slug синхронны с lib/config/media-library-presets.js */
const MEDIA_LIBRARY_BUILTIN_PRESETS = [
  { slug: "0-documents", name: "Документы" },
  { slug: "0-artefacts", name: "Артефакты" },
  { slug: "0-market", name: "Барахолка" },
  { slug: "0-scripts", name: "Скрипты" },
  { slug: "0-slider", name: "Слайдер" }
];
const MEDIA_LIBRARY_LEGACY_SLUG_TO_CANON = {
  documents: "0-documents",
  artefacts: "0-artefacts",
  market: "0-market",
  scripts: "0-scripts",
  slider: "0-slider"
};
const MEDIA_LIBRARY_BUILTIN_SLUGS = new Set(MEDIA_LIBRARY_BUILTIN_PRESETS.map((entry) => entry.slug));

function resolveMediaLibraryCanonicalSlug(slug) {
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized) return "";
  if (MEDIA_LIBRARY_BUILTIN_SLUGS.has(normalized)) return normalized;
  return MEDIA_LIBRARY_LEGACY_SLUG_TO_CANON[normalized] || normalized;
}

function isMediaLibraryBuiltinSlug(slug) {
  return MEDIA_LIBRARY_BUILTIN_SLUGS.has(resolveMediaLibraryCanonicalSlug(slug));
}

  global.MEDIA_LIBRARY_BUILTIN_PRESETS = MEDIA_LIBRARY_BUILTIN_PRESETS;
  global.MEDIA_LIBRARY_LEGACY_SLUG_TO_CANON = MEDIA_LIBRARY_LEGACY_SLUG_TO_CANON;
  global.MEDIA_LIBRARY_BUILTIN_SLUGS = MEDIA_LIBRARY_BUILTIN_SLUGS;
  global.resolveMediaLibraryCanonicalSlug = resolveMediaLibraryCanonicalSlug;
  global.isMediaLibraryBuiltinSlug = isMediaLibraryBuiltinSlug;
})(typeof globalThis !== "undefined" ? globalThis : window);
