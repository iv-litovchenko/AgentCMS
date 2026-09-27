/**
 * Мета в блоках [marker:*] и в [мое мета].
 *
 * Канон (все необязательные): awn-create, awn-update, awn-status, awn-repeat.
 * Любые другие ключи — произвольные поля автора.
 */

const MARKER_AWN_CANONICAL = ["awn-create", "awn-update", "awn-status", "awn-repeat"];

const MARKER_META_FIELD_MAP = {
  "awn-create": "added",
  "awn-update": "updated",
  "awn-status": "status",
  "awn-repeat": "review",
  "awn-review": "review",
  создано: "created",
  добавлено: "added",
  обновлено: "updated",
  повторить: "review",
  статус: "status",
  тема: "topic",
};

function normalizeMarkerMetaKey(rawKey) {
  const key = String(rawKey || "").trim().toLowerCase();
  if (MARKER_META_FIELD_MAP[key]) return MARKER_META_FIELD_MAP[key];
  return key.replace(/\s+/g, "_");
}

function parseMarkerMetaLine(line, meta = {}) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return meta;
  const kv = trimmed.match(/^([\wа-яё.-]+):\s*(.+)$/i);
  if (!kv) return meta;
  const field = normalizeMarkerMetaKey(kv[1]);
  meta[field] = kv[2].trim();
  return meta;
}

function parseMarkerMetaLines(lines) {
  const meta = {};
  for (const raw of lines || []) {
    parseMarkerMetaLine(raw, meta);
  }
  return meta;
}

const api = {
  MARKER_AWN_CANONICAL,
  MARKER_META_FIELD_MAP,
  normalizeMarkerMetaKey,
  parseMarkerMetaLine,
  parseMarkerMetaLines,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.MarkerMetaFields = api;
}
