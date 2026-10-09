function normalizeNewlines(text) {
  return String(text || "").replace(/\r\n/g, "\n");
}

function stripFrontmatter(content) {
  return normalizeNewlines(content).replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function resolveChunkBody(content) {
  const text = normalizeNewlines(content);
  if (!text.startsWith("---")) {
    return { body: text, startLine: 1 };
  }
  const end = text.indexOf("\n---", 3);
  if (end === -1) {
    return { body: text, startLine: 1 };
  }
  let bodyStart = end + 4;
  if (text[bodyStart] === "\n") bodyStart += 1;
  const body = text.slice(bodyStart);
  const startLine = text.slice(0, bodyStart).split("\n").length;
  return { body, startLine };
}

function lineRangeForSlice(fullText, sliceStart, sliceEnd, baseStartLine) {
  const before = fullText.slice(0, sliceStart);
  const chunk = fullText.slice(sliceStart, sliceEnd);
  const startLocal = before.split("\n").length;
  const endLocal = startLocal + chunk.split("\n").length - 1;
  return {
    startLine: baseStartLine + startLocal - 1,
    endLine: baseStartLine + endLocal - 1
  };
}

function bodyParagraphs(body, bodyStartLine) {
  const lines = body.split("\n");
  const paragraphs = [];
  let buf = [];
  let bufStart = null;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fileLine = bodyStartLine + i;
    if (!line.trim()) {
      if (buf.length) {
        paragraphs.push({
          text: buf.join("\n"),
          startLine: bufStart,
          endLine: bodyStartLine + i - 1
        });
        buf = [];
        bufStart = null;
      }
      continue;
    }
    if (!buf.length) bufStart = fileLine;
    buf.push(line);
  }

  if (buf.length) {
    paragraphs.push({
      text: buf.join("\n"),
      startLine: bufStart,
      endLine: bodyStartLine + lines.length - 1
    });
  }

  return paragraphs;
}

function pushChunk(chunks, text, startLine, endLine) {
  const trimmed = String(text || "").trim();
  if (trimmed.length < 40) return;
  chunks.push({
    text: trimmed,
    startLine,
    endLine
  });
}

function splitLongParagraph(part, { maxLen, overlap }) {
  const { text, startLine } = part;
  const out = [];
  let i = 0;
  while (i < text.length) {
    const slice = text.slice(i, i + maxLen);
    const trimmed = slice.trim();
    if (trimmed.length >= 40) {
      const trimStart = slice.indexOf(trimmed);
      const absStart = i + trimStart;
      const absEnd = absStart + trimmed.length;
      const range = lineRangeForSlice(text, absStart, absEnd, startLine);
      out.push({ text: trimmed, ...range });
    }
    if (i + maxLen >= text.length) break;
    i += maxLen - overlap;
  }
  return out;
}

function chunkMarkdown(content, { maxLen = 900, overlap = 100 } = {}) {
  const { body, startLine: bodyStartLine } = resolveChunkBody(content);
  if (!body.trim()) return [];

  const paragraphs = bodyParagraphs(body, bodyStartLine);
  if (!paragraphs.length) return [];

  const chunks = [];
  let buf = "";
  let bufStartLine = null;
  let bufEndLine = null;

  const flush = () => {
    if (!buf) return;
    pushChunk(chunks, buf, bufStartLine, bufEndLine);
    buf = "";
    bufStartLine = null;
    bufEndLine = null;
  };

  for (const part of paragraphs) {
    const partText = part.text.trim();
    if (!partText) continue;

    if (!buf) {
      if (partText.length <= maxLen) {
        buf = partText;
        bufStartLine = part.startLine;
        bufEndLine = part.endLine;
        if (buf.length >= maxLen) flush();
      } else {
        chunks.push(...splitLongParagraph(part, { maxLen, overlap }));
      }
      continue;
    }

    const merged = `${buf}\n\n${partText}`;
    if (merged.length <= maxLen) {
      buf = merged;
      bufEndLine = part.endLine;
      continue;
    }

    flush();
    if (partText.length > maxLen) {
      chunks.push(...splitLongParagraph(part, { maxLen, overlap }));
    } else {
      buf = partText;
      bufStartLine = part.startLine;
      bufEndLine = part.endLine;
    }
  }

  flush();
  return chunks;
}

module.exports = { stripFrontmatter, chunkMarkdown, resolveChunkBody };
