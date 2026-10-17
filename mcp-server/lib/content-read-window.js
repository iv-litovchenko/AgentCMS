import { createHash } from "node:crypto";

export const READ_WINDOW_DEFAULT_LINES = 300;
export const READ_WINDOW_MAX_LINES = 500;
const CODE_FENCE_EXPAND_MAX = 100;

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;

export function hashText(text) {
  return `md5:${createHash("md5").update(String(text ?? ""), "utf8").digest("hex")}`;
}

/** 1-based file line where the markdown body starts (same numbering as search hits). */
export function markdownBodyStartLine(text) {
  const match = String(text || "").match(FRONTMATTER_RE);
  if (!match) return 1;
  return (match[1] || "").split(/\r?\n/).length + 3;
}

function fenceToggle(line, open) {
  const match = line.match(FENCE_RE);
  if (!match) return open;
  const marker = match[1];
  if (!open) return { char: marker[0], len: marker.length };
  const rest = line.trim();
  const closes =
    marker[0] === open.char && marker.length >= open.len && rest.replace(/[`~]/g, "") === "";
  return closes ? null : open;
}

/** Fence state before each line index in [from, to): openAt[i] is the open fence before line i. */
function scanFences(lines, from, to) {
  const openAt = new Array(to - from + 1);
  let open = null;
  for (let i = from; i < to; i += 1) {
    openAt[i - from] = open;
    open = fenceToggle(lines[i], open);
  }
  openAt[to - from] = open;
  return openAt;
}

/**
 * Cut a line window from raw file text. Line numbers are 1-based over the whole file
 * (frontmatter included), matching search_workspace_* startLine/endLine.
 */
export function readTextWindow(text, { startLine, limitLines, full = false, markdownBody = false } = {}) {
  const raw = String(text ?? "");
  const lines = raw.split(/\r?\n/);
  const totalLines = lines.length;
  const bodyStartLine = markdownBody ? markdownBodyStartLine(raw) : 1;

  const requestedStart = startLine != null ? Number(startLine) : bodyStartLine;
  let startIdx = Math.min(Math.max(requestedStart, bodyStartLine) - 1, totalLines);
  const limit = full
    ? totalLines
    : Math.min(Math.max(Number(limitLines) || READ_WINDOW_DEFAULT_LINES, 1), READ_WINDOW_MAX_LINES);
  let endIdx = Math.min(startIdx + limit, totalLines);

  const codeFence = {};
  if (!full) {
    const bodyIdx = bodyStartLine - 1;
    const openAt = scanFences(lines, bodyIdx, totalLines);
    const openBefore = (idx) => openAt[idx - bodyIdx];

    if (openBefore(startIdx) && startIdx > bodyIdx) {
      let idx = startIdx;
      while (idx > bodyIdx && openBefore(idx) && startIdx - idx < CODE_FENCE_EXPAND_MAX) idx -= 1;
      if (!openBefore(idx)) {
        codeFence.expandedBefore = startIdx - idx;
        startIdx = idx;
      } else {
        codeFence.startsInside = true;
      }
    }

    if (endIdx < totalLines && openBefore(endIdx)) {
      let idx = endIdx;
      while (idx < totalLines && openBefore(idx) && idx - endIdx < CODE_FENCE_EXPAND_MAX) idx += 1;
      if (!openBefore(idx)) {
        codeFence.expandedAfter = idx - endIdx;
        endIdx = idx;
      } else {
        codeFence.endsInside = true;
      }
    }
  }

  const hasMore = endIdx < totalLines;
  return {
    content: lines.slice(startIdx, endIdx).join("\n"),
    startLine: startIdx + 1,
    endLine: endIdx,
    totalLines,
    ...(markdownBody ? { bodyStartLine } : {}),
    hasMore,
    truncated: hasMore || startIdx > bodyStartLine - 1,
    nextStartLine: hasMore ? endIdx + 1 : null,
    ...(Object.keys(codeFence).length ? { codeFence } : {}),
    hash: hashText(raw)
  };
}
