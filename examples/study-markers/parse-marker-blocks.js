/**
 * Блоки пометок в тексте конспекта:
 *
 * [marker:question]
 * awn-status: открыто
 * awn-create: 2026-09-20
 * повторить: 2026-10-01
 * ---
 * Текст (несколько абзацев).
 * [/marker]
 */

const MARKER_OPEN_RE = /^\[marker:([a-z0-9-]+)\]\s*$/i;
const MARKER_CLOSE_RE = /^\[\/marker\]\s*$/i;
const META_SEP = /^---\s*$/;

const { parseMarkerMetaLines, MARKER_META_FIELD_MAP } = require("./marker-meta-fields");

function parseMetaLines(lines) {
  return parseMarkerMetaLines(lines);
}

function buildFencedLineMask(lines) {
  const inside = new Array(lines.length).fill(false);
  let fence = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s*)(`{3,}|~{3,})(.*)$/);
    if (!m) {
      if (fence) inside[i] = true;
      continue;
    }
    const marker = m[2];
    const ch = marker[0];
    const len = marker.length;
    const after = m[3].trim();

    if (!fence) {
      fence = { ch, len, openLine: i };
      inside[i] = true;
      continue;
    }

    const isClose = after === "" && ch === fence.ch && len >= fence.len;
    if (isClose) {
      inside[i] = true;
      fence = null;
      continue;
    }

    inside[i] = true;
  }

  if (fence) {
    for (let i = fence.openLine + 1; i < lines.length; i++) inside[i] = true;
  }

  return inside;
}

function parseMarkerBlocks(lines) {
  const blocks = [];
  const fenced = buildFencedLineMask(lines);

  for (let i = 0; i < lines.length; i++) {
    if (fenced[i]) continue;
    const open = lines[i].trim().match(MARKER_OPEN_RE);
    if (!open) continue;

    const blockSlug = open[1].toLowerCase();
    const metaLines = [];
    const bodyLines = [];
    let mode = "meta";
    let j = i + 1;

    while (j < lines.length) {
      if (fenced[j]) break;
      const trimmed = lines[j].trim();
      if (MARKER_CLOSE_RE.test(trimmed)) break;
      if (mode === "meta" && META_SEP.test(trimmed)) {
        mode = "body";
        j++;
        continue;
      }
      if (mode === "meta") metaLines.push(lines[j]);
      else bodyLines.push(lines[j]);
      j++;
    }

    if (j >= lines.length || !MARKER_CLOSE_RE.test(lines[j].trim())) {
      continue;
    }

    const text = bodyLines.join("\n").trim();
    if (!text) continue;

    blocks.push({
      blockSlug,
      meta: parseMetaLines(metaLines),
      text,
      lineStart: i + 1,
      lineEnd: j + 1,
    });

    i = j;
  }

  return blocks;
}

function lineInBlockRanges(lineNo, blocks) {
  return blocks.some((b) => lineNo >= b.lineStart && lineNo <= b.lineEnd);
}

const api = {
  parseMarkerBlocks,
  buildFencedLineMask,
  lineInBlockRanges,
  MARKER_META_FIELD_MAP,
  MARKER_OPEN_RE,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.ParseMarkerBlocks = api;
}
