const { extractFrontmatterParsed } = require("../storage-index/frontmatter");

const ENTITY_TYPES = ["person", "org", "project", "date", "url", "email", "money", "tag", "topic"];

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function isIndexableFile(basename) {
  const name = String(basename || "").toLowerCase();
  return name.endsWith(".md") || name.endsWith(".sidecar.md");
}

function splitBody(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (!match) return { body: text, bodyOffset: 0 };
  return { body: text.slice(match[0].length), bodyOffset: match[0].length };
}

function lineColAt(text, index) {
  const slice = text.slice(0, Math.max(0, index));
  const lines = slice.split("\n");
  const line = lines.length;
  const col = (lines[lines.length - 1] || "").length;
  return { line, col };
}

function pushMatch(out, seen, { type, label, path, fullText, index, length, source, snippetMax = 80 }) {
  const clean = String(label || "").trim();
  if (!clean || clean.length < 2) return;
  if (clean.length > 200) return;
  const key = `${type}\0${clean.toLowerCase()}\0${path}\0${index}`;
  if (seen.has(key)) return;
  seen.add(key);

  const { line, col } = lineColAt(fullText, index);
  const snippetStart = Math.max(0, index - 24);
  const snippetEnd = Math.min(fullText.length, index + length + 24);
  const snippet = fullText
    .slice(snippetStart, snippetEnd)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, snippetMax);

  out.push({
    type,
    label: clean,
    path,
    line,
    col_start: col,
    col_end: col + length,
    snippet,
    source
  });
}

function extractFromFrontmatter(fm, relPath, out, seen) {
  if (!fm || typeof fm !== "object") return;

  const tags = fm.tags ?? fm.tag;
  const tagList = Array.isArray(tags) ? tags : typeof tags === "string" ? tags.split(/[,;]+/) : [];
  for (const raw of tagList) {
    const label = String(raw || "").trim().replace(/^#+/, "");
    if (!label) continue;
    pushMatch(out, seen, {
      type: "tag",
      label,
      path: relPath,
      fullText: "",
      index: 0,
      length: label.length,
      source: "frontmatter"
    });
  }

  for (const key of ["author", "person", "contact", "client"]) {
    const val = fm[key];
    if (!val || typeof val === "object") continue;
    const label = String(val).trim();
    if (label) {
      pushMatch(out, seen, {
        type: "person",
        label,
        path: relPath,
        fullText: "",
        index: 0,
        length: label.length,
        source: "frontmatter"
      });
    }
  }

  for (const key of ["project", "topic", "awn-topic", "product"]) {
    const val = fm[key];
    if (!val || typeof val === "object") continue;
    const label = String(val).trim();
    if (label) {
      pushMatch(out, seen, {
        type: key === "project" ? "project" : "topic",
        label,
        path: relPath,
        fullText: "",
        index: 0,
        length: label.length,
        source: "frontmatter"
      });
    }
  }
}

function extractFromBody(body, bodyOffset, fullContent, relPath, out, seen) {
  const fullText = fullContent;

  const patterns = [
    {
      type: "date",
      source: "regex-date",
      re: /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}[./]\d{2,4})\b/g
    },
    {
      type: "url",
      source: "regex-url",
      re: /\bhttps?:\/\/[^\s<>)\]"']+/gi
    },
    {
      type: "email",
      source: "regex-email",
      re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
    },
    {
      type: "money",
      source: "regex-money",
      re: /(?:^|[\s(])(\d[\d\s]{0,12}(?:[.,]\d{1,2})?\s*(?:₽|руб\.?|RUB|rub))(?=$|[\s.,)!?])/gim
    },
    {
      type: "tag",
      source: "hashtag",
      re: /(?:^|[\s(])#([a-zA-Z\u0400-\u04FF0-9_\-/]+)/g
    },
    {
      type: "topic",
      source: "wikilink",
      re: /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g
    },
    {
      type: "person",
      source: "regex-person-ru",
      re: /\b[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?\s+[А-ЯЁ][а-яё]+(?:-[А-ЯЁ][а-яё]+)?\b/g
    },
    {
      type: "org",
      source: "regex-org-ru",
      re: /\b(?:ООО|ИП|АО|ПАО|ЗАО)\s+[«""]?[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9\s.\-«»""]{1,60}/g
    }
  ];

  for (const { type, source, re } of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(body))) {
      const label = m[1] != null ? m[1] : m[0];
      const index = bodyOffset + m.index + (m[1] != null ? m[0].indexOf(m[1]) : 0);
      const length = String(label).length;
      pushMatch(out, seen, {
        type,
        label,
        path: relPath,
        fullText,
        index,
        length,
        source
      });
    }
  }
}

function extractMentionsFromContent(content, relPath, options = {}) {
  const path = normalizePath(relPath);
  const out = [];
  const seen = new Set();

  const fm = extractFrontmatterParsed(content, {
    agentRoot: options.agentRoot || "",
    projectRoot: options.projectRoot || process.cwd()
  });
  extractFromFrontmatter(fm, path, out, seen);

  const { body, bodyOffset } = splitBody(content);
  extractFromBody(body, bodyOffset, content, path, out, seen);

  return out;
}

module.exports = {
  ENTITY_TYPES,
  normalizePath,
  isIndexableFile,
  extractMentionsFromContent
};
