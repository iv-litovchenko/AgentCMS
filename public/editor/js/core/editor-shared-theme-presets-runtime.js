/**
 * Shared theme preset labels (refactor 14 — slice from main.js).
 */
(function initEditorSharedThemePresetsRuntime(global) {
const SHARED_THEME_PRESETS = [
  { slug: "inbox", label: "Входящие" },
  { slug: "notes", label: "Заметки" },
  { slug: "references", label: "Источники" },
  { slug: "artefacts", label: "Артефакты" },
  { slug: "scripts", label: "Скрипты" },
  { slug: "media", label: "Медиа" },
  { slug: "context", label: "Автозагружаемый контекст" }
];
const SHARED_THEME_PRESET_LABELS = Object.fromEntries(
  SHARED_THEME_PRESETS.map((item) => [item.slug, item.label])
);

  global.SHARED_THEME_PRESETS = SHARED_THEME_PRESETS;
  global.SHARED_THEME_PRESET_LABELS = SHARED_THEME_PRESET_LABELS;
})(typeof globalThis !== "undefined" ? globalThis : window);
