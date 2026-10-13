function normalizeNewlines(text) {
  return String(text || "").replace(/\r\n/g, "\n");
}

function indexRangeToLines(text, startIdx, endIdx) {
  const normalized = normalizeNewlines(text);
  const safeStart = Math.max(0, Math.min(startIdx, normalized.length));
  const safeEnd = Math.max(safeStart, Math.min(endIdx, normalized.length));
  const startLine = normalized.slice(0, safeStart).split("\n").length;
  const endLine = normalized.slice(0, safeEnd).split("\n").length;
  return { startLine, endLine };
}

function findSearchMatchIndex(text, parsed) {
  const p = parsed || { mode: "relaxed", terms: [] };
  const normalized = normalizeNewlines(text);
  const lower = normalized.toLowerCase();
  let idx = -1;
  let highlightLen = 0;

  if (p.mode === "strict") {
    idx = lower.indexOf(String(p.literal || "").toLowerCase());
    highlightLen = String(p.literal || "").length;
  } else if (p.mode === "wildcard" && p.regex) {
    const match = normalized.match(p.regex);
    if (match && match.index != null) {
      idx = match.index;
      highlightLen = match[0].length;
    }
  } else {
    for (const term of p.terms || []) {
      const token = String(term || "").toLowerCase();
      if (!token) continue;
      idx = lower.indexOf(token);
      if (idx !== -1) {
        highlightLen = term.length;
        break;
      }
    }
  }

  if (idx === -1) return null;
  return { startIdx: idx, endIdx: idx + highlightLen };
}

function buildSearchSnippet(content, query, radius = 64, parsed = null, parseSearchQuery = null) {
  const p = parsed || (typeof parseSearchQuery === "function" ? parseSearchQuery(query) : null);
  const match = findSearchMatchIndex(content, p);
  if (!match) return "";

  const text = normalizeNewlines(content);
  const { startIdx, endIdx } = match;
  const start = Math.max(0, startIdx - radius);
  const end = Math.min(text.length, endIdx + radius);
  let snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  if (start > 0) snippet = `…${snippet}`;
  if (end < text.length) snippet = `${snippet}…`;
  return snippet;
}

function buildSearchMatchLines(content, query, parsed = null, parseSearchQuery = null) {
  const p = parsed || (typeof parseSearchQuery === "function" ? parseSearchQuery(query) : null);
  const match = findSearchMatchIndex(content, p);
  if (!match) return { startLine: null, endLine: null };
  return indexRangeToLines(content, match.startIdx, match.endIdx);
}

module.exports = {
  normalizeNewlines,
  findSearchMatchIndex,
  indexRangeToLines,
  buildSearchSnippet,
  buildSearchMatchLines
};
