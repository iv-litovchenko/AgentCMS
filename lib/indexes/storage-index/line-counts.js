function countTextLines(text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n");
  if (!normalized) return 0;
  return normalized.split("\n").length;
}

function splitMarkdownFrontmatter(raw = "") {
  const text = String(raw || "");
  if (!text.startsWith("---")) return { hasFrontmatter: false, body: text };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { hasFrontmatter: false, body: text };
  return {
    hasFrontmatter: true,
    body: text.slice(end + 4).replace(/^\n/, "")
  };
}

function isYamlPath(relPath) {
  const lower = String(relPath || "").toLowerCase();
  return lower.endsWith(".yml") || lower.endsWith(".yaml");
}

function isMarkdownPath(relPath) {
  const lower = String(relPath || "").toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".sidecar.md");
}

/**
 * @returns {{ lineCountTotal: number, lineCountBody: number | null }}
 */
function computeLineCounts(content, relPath = "") {
  const lineCountTotal = countTextLines(content);
  if (isYamlPath(relPath)) {
    return { lineCountTotal, lineCountBody: null };
  }
  if (isMarkdownPath(relPath)) {
    const { body } = splitMarkdownFrontmatter(content);
    return { lineCountTotal, lineCountBody: countTextLines(body) };
  }
  return { lineCountTotal, lineCountBody: null };
}

module.exports = {
  countTextLines,
  computeLineCounts,
  splitMarkdownFrontmatter
};
