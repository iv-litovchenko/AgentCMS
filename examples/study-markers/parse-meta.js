/**
 * Парсинг блоков метаданных в конспектах.
 *
 * [запись]           — мета всего файла
 * создано: 2026-01-05
 * обновлено: 2026-09-20
 * [/запись]
 *
 * [мое мета]         — мета конкретной пометки [мое *]
 * awn-create: 2026-03-10
 * awn-update: 2026-09-18
 * awn-status: открыто
 * повторить: 2026-09-25
 * [/мое мета]
 */

const RECORD_START = /^\[запись\]\s*$/i;
const RECORD_END = /^\[\/запись\]\s*$/i;
const MARKER_META_START = /^\[мое мета\]\s*$/i;
const MARKER_META_END = /^\[\/мое мета\]\s*$/i;
const { parseMarkerMetaLines, parseMarkerMetaLine, MARKER_META_FIELD_MAP } = require("./marker-meta-fields");

function parseMetaBlock(lines, startIndex) {
  const meta = {};
  let i = startIndex;
  while (i < lines.length) {
    parseMarkerMetaLine(lines[i], meta);
    i++;
  }
  return meta;
}

function parseFileRecord(lines) {
  for (let i = 0; i < lines.length; i++) {
    if (!RECORD_START.test(lines[i].trim())) continue;
    const block = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (RECORD_END.test(lines[j].trim())) break;
      block.push(lines[j]);
    }
    return parseMetaBlock(block, 0);
  }
  return null;
}

function parseMarkerMetaAfter(lines, markerLineIndex) {
  let i = markerLineIndex + 1;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i >= lines.length || !MARKER_META_START.test(lines[i].trim())) return null;

  const block = [];
  for (let j = i + 1; j < lines.length; j++) {
    if (MARKER_META_END.test(lines[j].trim())) break;
    block.push(lines[j]);
  }
  return parseMetaBlock(block, 0);
}

function formatMetaDates(meta) {
  if (!meta) return "";
  const parts = [];
  if (meta.added) parts.push(`добавлено ${meta.added}`);
  if (meta.updated) parts.push(`обновлено ${meta.updated}`);
  if (meta.review) parts.push(`повторить ${meta.review}`);
  return parts.join(" · ");
}

const api = {
  parseFileRecord,
  parseMarkerMetaAfter,
  formatMetaDates,
  MARKER_META_FIELD_MAP,
  parseMarkerMetaLines,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.ParseMeta = api;
}
