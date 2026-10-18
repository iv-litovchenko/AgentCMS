import { getFrontmatterScalar, upsertYamlScalarLine } from "./yaml-frontmatter.js";

const H1_LINE_RE = /^ {0,3}#(?!#)\s+(.+?)\s*$/;
const TITLE_ORDINAL_SUFFIX_RE = /\s*\(\d+\)\s*$/;

export function stripTitleOrdinalSuffix(title) {
  const text = String(title || "").trim();
  if (!text) return "";
  return text.replace(TITLE_ORDINAL_SUFFIX_RE, "").trim();
}

export function splitMarkdownBodyByH1(body) {
  const text = String(body ?? "");
  const lines = text.split(/\r?\n/);
  const h1Indices = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (H1_LINE_RE.test(lines[i])) h1Indices.push(i);
  }
  if (h1Indices.length === 0) {
    throw new Error("split_content: no H1 headings found (use lines starting with '# ' — one # only)");
  }
  const preambleLines = lines.slice(0, h1Indices[0]);
  const preamble = preambleLines.join("\n").trim();
  const sections = h1Indices.map((startIdx, i) => {
    const endIdx = i + 1 < h1Indices.length ? h1Indices[i + 1] : lines.length;
    return {
      heading: lines[startIdx].replace(H1_LINE_RE, "$1").trim(),
      body: lines.slice(startIdx, endIdx).join("\n").trimEnd()
    };
  });
  return { preamble, sections };
}

function parseTagsList(raw) {
  const value = String(raw || "").trim();
  if (!value) return [];
  if (value.startsWith("[")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner
      .split(",")
      .map((part) => part.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatTagsList(tags) {
  const unique = [...new Set(tags.map((t) => String(t).trim()).filter(Boolean))];
  if (unique.length === 0) return "";
  if (unique.every((t) => /^[a-zA-Z0-9_\-]+$/.test(t))) {
    return `[${unique.join(", ")}]`;
  }
  return `[${unique.map((t) => JSON.stringify(t)).join(", ")}]`;
}

function upsertTagsLine(frontmatter, tags) {
  const lineValue = formatTagsList(tags);
  const trimmed = String(frontmatter || "").trim();
  if (!lineValue) return trimmed;
  const line = `tags: ${lineValue}`;
  const pattern = /^tags:.*$/im;
  if (pattern.test(trimmed)) return trimmed.replace(pattern, line);
  return trimmed ? `${trimmed}\n${line}` : line;
}

export function mergeTagFrontmatter(baseProperties, overlayPropertiesList) {
  let tags = parseTagsList(getFrontmatterScalar(baseProperties, "tags").value);
  for (const overlay of overlayPropertiesList) {
    tags = tags.concat(parseTagsList(getFrontmatterScalar(overlay, "tags").value));
  }
  return upsertTagsLine(baseProperties, tags);
}

export function resolveBaseTitle(properties, ref) {
  const fromTitle = getFrontmatterScalar(properties, "title").value.trim();
  if (fromTitle) return stripTitleOrdinalSuffix(fromTitle);
  const baseName = String(ref || "")
    .replace(/\\/g, "/")
    .split("/")
    .pop();
  const stem = baseName.toLowerCase().endsWith(".md") ? baseName.slice(0, -3) : baseName;
  return stem.replace(/[-_]+/g, " ").trim() || "Note";
}

function splitRefStemDir(sourceRef) {
  const normalized = String(sourceRef || "").replace(/\\/g, "/");
  const slash = normalized.lastIndexOf("/");
  const dir = slash === -1 ? "" : `${normalized.slice(0, slash + 1)}`;
  const file = slash === -1 ? normalized : normalized.slice(slash + 1);
  const stem = file.toLowerCase().endsWith(".md") ? file.slice(0, -3) : file;
  return { dir, stem };
}

export function planSplitFiles({ properties, sourceRef, body, includePreamble = true }) {
  const { preamble, sections } = splitMarkdownBodyByH1(body);
  const baseTitle = resolveBaseTitle(properties, sourceRef);
  const { dir, stem } = splitRefStemDir(sourceRef);
  const parts = [];
  if (includePreamble && preamble) {
    parts.push({ suffix: 0, title: `${baseTitle} (0)`, body: preamble });
  }
  sections.forEach((section, idx) => {
    parts.push({
      suffix: idx + 1,
      title: `${baseTitle} (${idx + 1})`,
      body: section.body
    });
  });
  return parts.map((part) => {
    const ref = `${dir}${stem}-${part.suffix}.md`;
    let props = String(properties || "").trim();
    props = upsertYamlScalarLine(props, "title", part.title);
    const idStem = ref.replace(/\.md$/i, "").replace(/\//g, "-");
    props = upsertYamlScalarLine(props, "id", idStem);
    return {
      ref,
      title: part.title,
      fullMarkdown: props ? `---\n${props}\n---\n${part.body}\n` : `${part.body}\n`
    };
  });
}

export function mergeMarkdownBodies(bodies) {
  return bodies
    .map((b) => String(b ?? "").trim())
    .filter(Boolean)
    .join("\n\n---\n\n");
}

export function planMergeFile({ targetProperties, bodies, mergeTags, otherPropertiesList }) {
  let properties = String(targetProperties || "").trim();
  if (mergeTags && otherPropertiesList?.length) {
    properties = mergeTagFrontmatter(properties, otherPropertiesList);
  }
  const body = mergeMarkdownBodies(bodies);
  const fullMarkdown = properties ? `---\n${properties}\n---\n${body}\n` : `${body}\n`;
  return { properties, body, fullMarkdown };
}
