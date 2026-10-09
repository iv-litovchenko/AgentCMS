const {
  resolveMarkdownHrefToWorkspaceRel,
  getWikilinkTargetFromRel
} = require("../../tools/markdown-link-rewriter");

const WIKILINK_RE = /\[\[([^\]|#]+)(#[^\]|]+)?(?:\|([^\]]+))?\]\]/g;
const MARKDOWN_LINK_RE = /(!?\[(?:\\.|[^\]])*\])\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

const RELATION_KEY_RE = /(?:parent|relation|ref|link|extends|supertype|topic|record)/i;
const PATH_LIKE_RE = /^(?:\.\.?\/|awn-|awn-databases\/|awn-container\/|awn-storage\/|.*\/.*)/i;
const FILE_EXT_RE = /\.(md|yml|yaml|csv|json|png|jpe?g|gif|webp|pdf)$/i;

function normalizePath(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function normalizeNewlines(text) {
  return String(text || "").replace(/\r\n/g, "\n");
}

function splitFrontmatter(raw = "") {
  const text = normalizeNewlines(raw);
  if (!text.startsWith("---")) {
    return { frontmatter: "", body: text, frontmatterStartLine: null, bodyStartLine: 1 };
  }
  const end = text.indexOf("\n---", 3);
  if (end === -1) {
    return { frontmatter: "", body: text, frontmatterStartLine: null, bodyStartLine: 1 };
  }
  let bodyStart = end + 4;
  if (text[bodyStart] === "\n") bodyStart += 1;
  const frontmatter = text.slice(3, end).replace(/^\n/, "");
  const body = text.slice(bodyStart);
  const frontmatterStartLine = 2;
  const bodyStartLine = text.slice(0, bodyStart).split("\n").length;
  return { frontmatter, body, frontmatterStartLine, bodyStartLine };
}

function lineAtIndex(text, index, baseLine = 1) {
  return baseLine + text.slice(0, index).split("\n").length - 1;
}

function unwrapScalar(value) {
  let raw = String(value || "").trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1);
  }
  return raw.trim();
}

function looksLikePathValue(value) {
  const raw = unwrapScalar(value);
  if (!raw || /^https?:\/\//i.test(raw) || raw.startsWith("mailto:")) return false;
  if (PATH_LIKE_RE.test(raw)) return true;
  return FILE_EXT_RE.test(raw);
}

function buildWikilinkIndex(mdFiles) {
  const index = new Map();
  for (const relPath of mdFiles) {
    const target = getWikilinkTargetFromRel(relPath);
    if (!target) continue;
    for (const key of [target, target.toLowerCase()]) {
      const bucket = index.get(key) || [];
      bucket.push(relPath);
      index.set(key, bucket);
    }
  }
  return index;
}

function resolveWikilinkTarget(target, wikiIndex) {
  const raw = String(target || "").trim();
  if (!raw) return null;
  const bucket = wikiIndex.get(raw) || wikiIndex.get(raw.toLowerCase());
  if (!Array.isArray(bucket) || !bucket.length) return null;
  return bucket[0];
}

function pushEdge(edges, seen, fromPath, toTarget, kind, toResolved = null, line = null) {
  const target = String(toTarget || "").trim();
  if (!target) return;
  const lineNum = line != null && Number.isFinite(Number(line)) ? Number(line) : 0;
  const key = `${fromPath}\0${target}\0${kind}\0${lineNum}`;
  if (seen.has(key)) return;
  seen.add(key);
  edges.push({
    from_path: fromPath,
    to_target: target,
    to_resolved: toResolved ? normalizePath(toResolved) : null,
    kind,
    line: lineNum
  });
}

function extractYamlRelationEdges(frontmatter, fromPath, edges, seen, frontmatterStartLine = 2) {
  const lines = String(frontmatter || "").split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const kv = trimmed.match(/^([A-Za-z0-9_.-]+):\s*(.+)$/);
    if (!kv) continue;
    const key = kv[1].trim();
    const value = kv[2].trim();
    if (!RELATION_KEY_RE.test(key)) continue;
    if (!looksLikePathValue(value)) continue;
    const lineNo = frontmatterStartLine + i;
    pushEdge(edges, seen, fromPath, unwrapScalar(value), "relation", unwrapScalar(value), lineNo);
  }
}

function extractBodyLinkEdges(body, fromPath, wikiIndex, edges, seen, bodyStartLine = 1) {
  let match;
  WIKILINK_RE.lastIndex = 0;
  while ((match = WIKILINK_RE.exec(body))) {
    const target = String(match[1] || "").trim();
    const resolved = resolveWikilinkTarget(target, wikiIndex);
    const lineNo = lineAtIndex(body, match.index, bodyStartLine);
    pushEdge(edges, seen, fromPath, target, "wikilink", resolved, lineNo);
  }

  MARKDOWN_LINK_RE.lastIndex = 0;
  while ((match = MARKDOWN_LINK_RE.exec(body))) {
    const href = String(match[2] || "").trim();
    if (!href || /^https?:\/\//i.test(href) || href.startsWith("mailto:") || href.startsWith("#")) continue;
    const resolved = resolveMarkdownHrefToWorkspaceRel(href, fromPath);
    const lineNo = lineAtIndex(body, match.index, bodyStartLine);
    pushEdge(edges, seen, fromPath, href, "markdown", resolved, lineNo);
  }
}

function extractEdgesFromContent(content, fromPath, wikiIndex) {
  const edges = [];
  const seen = new Set();
  const normalizedFrom = normalizePath(fromPath);
  const { frontmatter, body, frontmatterStartLine, bodyStartLine } = splitFrontmatter(content);
  extractYamlRelationEdges(frontmatter, normalizedFrom, edges, seen, frontmatterStartLine);
  extractBodyLinkEdges(body, normalizedFrom, wikiIndex, edges, seen, bodyStartLine);
  return edges;
}

function isIndexableFile(name) {
  const lower = String(name || "").toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".sidecar.md");
}

module.exports = {
  normalizePath,
  buildWikilinkIndex,
  extractEdgesFromContent,
  isIndexableFile
};
