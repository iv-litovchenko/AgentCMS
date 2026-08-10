function stripFrontmatter(content) {
  return String(content || "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
}

function chunkMarkdown(content, { maxLen = 900, overlap = 100 } = {}) {
  const body = stripFrontmatter(content).trim();
  if (!body) return [];

  const parts = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks = [];
  let buf = "";

  const flush = () => {
    const text = buf.trim();
    if (text.length >= 40) chunks.push(text);
    buf = "";
  };

  for (const part of parts) {
    if (!buf) {
      buf = part;
      if (buf.length >= maxLen) flush();
      continue;
    }
    if (`${buf}\n\n${part}`.length <= maxLen) {
      buf = `${buf}\n\n${part}`;
      continue;
    }
    flush();
    if (part.length > maxLen) {
      for (let i = 0; i < part.length; i += maxLen - overlap) {
        const slice = part.slice(i, i + maxLen).trim();
        if (slice.length >= 40) chunks.push(slice);
      }
    } else {
      buf = part;
    }
  }
  flush();
  return chunks;
}

module.exports = { stripFrontmatter, chunkMarkdown };
