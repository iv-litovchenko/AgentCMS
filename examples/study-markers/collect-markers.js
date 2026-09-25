#!/usr/bin/env node
/**
 * Сканирует markdown-конспекты и собирает пометки [повторить]: и [вопрос]:
 *
 *   node collect-markers.js --input sample-notes/
 *   node collect-markers.js --input sample-notes/oop.md --type вопрос
 *   node collect-markers.js --input sample-notes/ --output report.html
 */

const fs = require("fs");
const path = require("path");

const MARKER_RE = /^\[([^\]]+)\]:\s*(.+)$/;
const HEADING_RE = /^(#{1,6})\s+(.+)$/;

const KNOWN_TYPES = new Set(["повторить", "вопрос"]);

function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function parseArgs(argv) {
  const args = { input: null, type: null, output: null, format: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input" || a === "-i") args.input = argv[++i];
    else if (a === "--type" || a === "-t") args.type = argv[++i]?.toLowerCase();
    else if (a === "--output" || a === "-o") args.output = argv[++i];
    else if (a === "--format" || a === "-f") args.format = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function collectFiles(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) return [target];
  return fs
    .readdirSync(target)
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join(target, f))
    .sort();
}

function parseFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const headings = [];
  const markers = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    const hm = line.match(HEADING_RE);
    if (hm) {
      const level = hm[1].length;
      const title = hm[2].trim();
      while (headings.length && headings[headings.length - 1].level >= level) {
        headings.pop();
      }
      headings.push({ level, title, slug: slugify(title), line: lineNo });
      continue;
    }

    const mm = line.match(MARKER_RE);
    if (!mm) continue;

    const type = mm[1].trim().toLowerCase();
    const text = mm[2].trim();
    const section = headings.length ? headings[headings.length - 1] : null;
    const anchor = section ? `#${section.slug}` : `#L${lineNo}`;

    markers.push({
      type,
      text,
      file: filePath,
      fileName: path.basename(filePath),
      line: lineNo,
      section: section
        ? headings.map((h) => h.title).join(" → ")
        : "(начало файла)",
      sectionTitle: section?.title ?? null,
      anchor,
      href: `${path.basename(filePath)}${anchor}`,
    });
  }

  return markers;
}

function filterByType(markers, type) {
  if (!type) return markers;
  return markers.filter((m) => m.type === type);
}

function groupMarkers(markers) {
  const byType = new Map();
  for (const m of markers) {
    if (!byType.has(m.type)) byType.set(m.type, new Map());
    const byFile = byType.get(m.type);
    if (!byFile.has(m.fileName)) byFile.set(m.fileName, []);
    byFile.get(m.fileName).push(m);
  }
  return byType;
}

function renderMarkdown(grouped) {
  const lines = ["# Сводка пометок", ""];
  for (const [type, byFile] of grouped) {
    lines.push(`## [${type}]`, "");
    for (const [fileName, items] of byFile) {
      lines.push(`### ${fileName}`, "");
      for (const m of items) {
        lines.push(`- **${m.section}** (стр. ${m.line}): ${m.text}`);
        lines.push(`  → [перейти](${m.href})`);
      }
      lines.push("");
    }
  }
  return lines.join("\n");
}

function renderHtml(grouped, filterType) {
  const title = filterType
    ? `Пометки: [${filterType}]`
    : "Сводка пометок";

  let body = "";
  for (const [type, byFile] of grouped) {
    const icon = type === "повторить" ? "↻" : type === "вопрос" ? "?" : "•";
    body += `<section class="type-group" data-type="${escapeHtml(type)}">`;
    body += `<h2><span class="type-icon type-${escapeHtml(type)}">${icon}</span> [${escapeHtml(type)}]</h2>`;
    for (const [fileName, items] of byFile) {
      body += `<div class="file-group">`;
      body += `<h3>${escapeHtml(fileName)}</h3><ul>`;
      for (const m of items) {
        body += `<li class="marker-item">`;
        body += `<div class="marker-meta"><span class="section">${escapeHtml(m.section)}</span>`;
        body += `<span class="line">стр. ${m.line}</span></div>`;
        body += `<p class="marker-text">${escapeHtml(m.text)}</p>`;
        body += `<a class="marker-link" href="${escapeHtml(m.href)}">перейти к месту →</a>`;
        body += `</li>`;
      }
      body += `</ul></div>`;
    }
    body += `</section>`;
  }

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="markers.css">
</head>
<body>
  <div class="page">
    <header><h1>${escapeHtml(title)}</h1></header>
    <main>${body || "<p class='empty'>Пометок не найдено.</p>"}</main>
  </div>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function printConsole(grouped) {
  for (const [type, byFile] of grouped) {
    console.log(`\n══ [${type}] ══`);
    for (const [fileName, items] of byFile) {
      console.log(`\n  📄 ${fileName}`);
      for (const m of items) {
        console.log(`    • ${m.section} (стр. ${m.line})`);
        console.log(`      ${m.text}`);
        console.log(`      → ${m.href}`);
      }
    }
  }
  console.log("");
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.input) {
    console.log(`Использование:
  node collect-markers.js --input <файл|папка> [--type повторить|вопрос] [--output report.html] [--format md|html|json]

Примеры:
  node collect-markers.js -i sample-notes/
  node collect-markers.js -i sample-notes/ -t вопрос
  node collect-markers.js -i sample-notes/ -o report.html`);
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = path.resolve(args.input);
  const files = collectFiles(inputPath);
  let markers = files.flatMap(parseFile);
  markers = filterByType(markers, args.type);

  const unknown = markers.filter((m) => !KNOWN_TYPES.has(m.type));
  for (const m of unknown) {
    console.warn(`⚠ неизвестный тип маркера [${m.type}] в ${m.fileName}:${m.line}`);
  }

  const grouped = groupMarkers(markers);
  const format = args.format || (args.output?.endsWith(".html") ? "html" : args.output?.endsWith(".md") ? "md" : args.output ? "json" : "console");

  if (format === "json") {
    const out = JSON.stringify(markers, null, 2);
    if (args.output) fs.writeFileSync(args.output, out);
    else console.log(out);
  } else if (format === "md") {
    const out = renderMarkdown(grouped);
    if (args.output) fs.writeFileSync(args.output, out);
    else console.log(out);
  } else if (format === "html") {
    const out = renderHtml(grouped, args.type);
    if (args.output) fs.writeFileSync(args.output, out);
    else console.log(out);
  } else {
    if (markers.length === 0) console.log("Пометок не найдено.");
    else printConsole(grouped);
  }
}

if (require.main === module) main();

module.exports = { parseFile, collectFiles, filterByType, groupMarkers, slugify };
