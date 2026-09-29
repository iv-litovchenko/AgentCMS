/**
 * Блоки пометок в конспекте:
 *
 * ```awn-marker-question
 * awn-status: открыто
 * ---
 * Текст.
 * ```
 *
 * Legacy (чтение): [marker:question] … [/marker]
 */

const MARKER_OPEN_RE = /^\[marker:([a-z0-9-]+)\]\s*$/i;
const MARKER_CLOSE_RE = /^\[\/marker\]\s*$/i;
const AWN_MARKER_FENCE_OPEN_RE = /^(\s{0,3})(`{3,}|~{3,})awn-marker-([a-z0-9-]+)\s*$/i;
const META_SEP = /^---\s*$/;

const { parseMarkerMetaLines, MARKER_META_FIELD_MAP } = require("./marker-meta-fields");

function parseMetaLines(lines) {
  return parseMarkerMetaLines(lines);
}

function parseInnerMetaBody(lines) {
  const metaLines = [];
  const bodyLines = [];
  let mode = "meta";
  for (const raw of lines || []) {
    const trimmed = String(raw || "").trim();
    if (mode === "meta" && META_SEP.test(trimmed)) {
      mode = "body";
      continue;
    }
    if (mode === "meta") metaLines.push(raw);
    else bodyLines.push(raw);
  }
  const text = bodyLines.join("\n").trim();
  return { meta: parseMetaLines(metaLines), text };
}

function findAllFenceRegions(lines) {
  const regions = [];
  let open = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(\s{0,3})(`{3,}|~{3,})(.*)$/);
    if (!m) continue;

    const marker = m[2];
    const ch = marker[0];
    const len = marker.length;
    const after = m[3].trim();

    if (!open) {
      open = { start: i, ch, len };
      continue;
    }

    const isClose = after === "" && ch === open.ch && len >= open.len;
    if (isClose) {
      regions.push({ start: open.start, end: i });
      open = null;
    }
  }

  return regions;
}

function isEnclosedByOtherFence(openIdx, closeIdx, regions, selfStart) {
  return regions.some(
    (r) => r.start < openIdx && r.end >= closeIdx && r.start !== selfStart
  );
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

function parseAwnMarkerFenceBlocks(lines) {
  const blocks = [];
  const regions = findAllFenceRegions(lines);

  for (let i = 0; i < lines.length; i++) {
    const openM = lines[i].match(AWN_MARKER_FENCE_OPEN_RE);
    if (!openM) continue;

    const openChar = openM[2][0];
    const openLen = openM[2].length;
    const blockSlug = openM[3].toLowerCase();
    let j = i + 1;

    while (j < lines.length) {
      const closeM = lines[j].match(/^(\s{0,3})(`{3,}|~{3,})\s*$/);
      if (closeM && closeM[2][0] === openChar && closeM[2].length >= openLen) break;
      j++;
    }

    if (j >= lines.length) continue;
    if (isEnclosedByOtherFence(i, j, regions, i)) continue;

    const inner = lines.slice(i + 1, j);
    const { meta, text } = parseInnerMetaBody(inner);
    if (!text) continue;

    blocks.push({
      blockSlug,
      meta,
      text,
      lineStart: i + 1,
      lineEnd: j + 1,
      syntax: "fence",
    });

    i = j;
  }

  return blocks;
}

function parseLegacyBracketMarkerBlocks(lines) {
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

    if (j >= lines.length || !MARKER_CLOSE_RE.test(lines[j].trim())) continue;

    const text = bodyLines.join("\n").trim();
    if (!text) continue;

    blocks.push({
      blockSlug,
      meta: parseMetaLines(metaLines),
      text,
      lineStart: i + 1,
      lineEnd: j + 1,
      syntax: "bracket",
    });

    i = j;
  }

  return blocks;
}

function parseMarkerBlocks(lines) {
  const fenceBlocks = parseAwnMarkerFenceBlocks(lines);
  const legacyBlocks = parseLegacyBracketMarkerBlocks(lines);
  return [...fenceBlocks, ...legacyBlocks].sort((a, b) => a.lineStart - b.lineStart);
}

function lineInBlockRanges(lineNo, blocks) {
  return blocks.some((b) => lineNo >= b.lineStart && lineNo <= b.lineEnd);
}

const api = {
  parseMarkerBlocks,
  parseAwnMarkerFenceBlocks,
  parseLegacyBracketMarkerBlocks,
  findAllFenceRegions,
  buildFencedLineMask,
  lineInBlockRanges,
  MARKER_META_FIELD_MAP,
  MARKER_OPEN_RE,
  AWN_MARKER_FENCE_OPEN_RE,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.ParseMarkerBlocks = api;
}
