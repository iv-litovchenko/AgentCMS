/** Slug встроенной медиатеки «Слайдер вдохновения» (каталог кадров агента). */
const MEDIA_LIBRARY_SLIDER_SLUG = "0-slider";

/** Legacy builtin slugs → canonical 0-* (REFACTOR-3) */
const MEDIA_LIBRARY_LEGACY_SLUG_TO_CANON = {
  documents: "0-documents",
  artefacts: "0-artefacts",
  market: "0-market",
  scripts: "0-scripts",
  slider: "0-slider"
};

/** Заготовки медиатек workspace — всегда сверху каталога в UI. */
const MEDIA_LIBRARY_BUILTIN_PRESETS = [
  { slug: "0-documents", name: "Документы" },
  { slug: "0-artefacts", name: "Артефакты" },
  { slug: "0-market", name: "Барахолка" },
  { slug: "0-scripts", name: "Скрипты" },
  { slug: MEDIA_LIBRARY_SLIDER_SLUG, name: "Слайдер" }
];

const MEDIA_LIBRARY_BUILTIN_SLUGS = new Set(
  MEDIA_LIBRARY_BUILTIN_PRESETS.map((entry) => entry.slug)
);

function resolveMediaLibraryCanonicalSlug(slug) {
  const normalized = String(slug || "").trim().toLowerCase();
  if (!normalized) return "";
  if (MEDIA_LIBRARY_BUILTIN_SLUGS.has(normalized)) return normalized;
  return MEDIA_LIBRARY_LEGACY_SLUG_TO_CANON[normalized] || normalized;
}

function isMediaLibraryBuiltinSlug(slug) {
  return MEDIA_LIBRARY_BUILTIN_SLUGS.has(resolveMediaLibraryCanonicalSlug(slug));
}

module.exports = {
  MEDIA_LIBRARY_SLIDER_SLUG,
  MEDIA_LIBRARY_BUILTIN_PRESETS,
  MEDIA_LIBRARY_BUILTIN_SLUGS,
  MEDIA_LIBRARY_LEGACY_SLUG_TO_CANON,
  resolveMediaLibraryCanonicalSlug,
  isMediaLibraryBuiltinSlug
};
