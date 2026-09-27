const MARKER_TYPES = [
  { type: "мое повторить", slug: "moe-povtorit", icon: "↻", short: "Повторить", block: "repeat" },
  { type: "мое вопрос", slug: "moe-vopros", icon: "?", short: "Вопрос", block: "question" },
  { type: "мое заметка", slug: "moe-zametka", icon: "✎", short: "Заметка", block: "note" },
  { type: "мое важно", slug: "moe-vazhno", icon: "!", short: "Важно", block: "important" },
  { type: "мое ошибка", slug: "moe-oshibka", icon: "✕", short: "Ошибка", block: "mistake" },
  { type: "мое идея", slug: "moe-ideya", icon: "★", short: "Идея", block: "idea" },
  { type: "мое todo", slug: "moe-todo", icon: "☐", short: "Задачи", block: "todo" },
];

const BLOCK_SLUG_TO_TYPE = Object.fromEntries(
  MARKER_TYPES.filter((t) => t.block).map((t) => [t.block, t.type])
);

function typeFromBlockSlug(slug) {
  const key = String(slug || "").trim().toLowerCase();
  return BLOCK_SLUG_TO_TYPE[key] || null;
}

const KNOWN_TYPES = new Set(MARKER_TYPES.map((t) => t.type));
const TYPE_ORDER = MARKER_TYPES.map((t) => t.type);

function metaFor(type) {
  return MARKER_TYPES.find((t) => t.type === type) || { type, slug: "other", icon: "•", short: type };
}

function sortGrouped(grouped) {
  return [...grouped.entries()].sort(([a], [b]) => {
    const ia = TYPE_ORDER.indexOf(a);
    const ib = TYPE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

function serializeGrouped(groupedMap) {
  return sortGrouped(groupedMap).map(([type, byFile]) => [
    type,
    [...byFile.entries()],
  ]);
}

function groupFromMarkers(markers) {
  const byType = new Map();
  for (const m of markers) {
    if (!byType.has(m.type)) byType.set(m.type, new Map());
    const byFile = byType.get(m.type);
    if (!byFile.has(m.fileName)) byFile.set(m.fileName, []);
    byFile.get(m.fileName).push(m);
  }
  return serializeGrouped(byType);
}

function normalizeGrouped(grouped, markers) {
  if (!grouped?.length) return groupFromMarkers(markers);
  const broken = grouped.every(([, byFile]) =>
    byFile && typeof byFile === "object" && !Array.isArray(byFile) && Object.keys(byFile).length === 0
  );
  if (broken) return groupFromMarkers(markers);
  return grouped.map(([type, byFile]) => [
    type,
    Array.isArray(byFile) ? byFile : Object.entries(byFile || {}),
  ]);
}

const api = {
  MARKER_TYPES,
  KNOWN_TYPES,
  TYPE_ORDER,
  BLOCK_SLUG_TO_TYPE,
  typeFromBlockSlug,
  metaFor,
  sortGrouped,
  serializeGrouped,
  groupFromMarkers,
  normalizeGrouped,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.MarkerTypes = api;
}
