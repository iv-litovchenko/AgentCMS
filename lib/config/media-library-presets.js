/** Заготовки медиатек workspace — всегда сверху каталога в UI. */
const MEDIA_LIBRARY_BUILTIN_PRESETS = [
  { slug: "documents", name: "Документы" },
  { slug: "market", name: "Барахолка" },
  { slug: "scripts", name: "Скрипты" },
  { slug: "slider", name: "Слайдер" }
];

const MEDIA_LIBRARY_BUILTIN_SLUGS = new Set(
  MEDIA_LIBRARY_BUILTIN_PRESETS.map((entry) => entry.slug)
);

function isMediaLibraryBuiltinSlug(slug) {
  return MEDIA_LIBRARY_BUILTIN_SLUGS.has(String(slug || "").trim());
}

module.exports = {
  MEDIA_LIBRARY_BUILTIN_PRESETS,
  MEDIA_LIBRARY_BUILTIN_SLUGS,
  isMediaLibraryBuiltinSlug
};
