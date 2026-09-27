#!/usr/bin/env node
/**
 * Сканирует markdown-конспекты и собирает личные пометки:
 * [мое повторить], … и блоки [marker:question] … [/marker]
 *
 *   node collect-markers.js --input sample-notes/
 *   node collect-markers.js --input sample-notes/oop.md --type "мое вопрос"
 *   node collect-markers.js --input sample-notes/ --output report.html
 */

const fs = require("fs");
const path = require("path");
const {
  KNOWN_TYPES,
  metaFor,
  serializeGrouped,
  sortGrouped,
  TYPE_ORDER,
  typeFromBlockSlug,
} = require("./marker-types");
const { parseFileRecord, parseMarkerMetaAfter } = require("./parse-meta");
const { parseMarkerBlocks, lineInBlockRanges } = require("./parse-marker-blocks");

const MARKER_RE = /^\[([^\]]+)\]:\s*(.+)$/;
const HEADING_RE = /^(#{1,6})\s+(.+)$/;

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
    else if (a === "--export-browser" || a === "-e") args.exportBrowser = argv[++i];
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

function listHeadings(lines) {
  const all = [];
  for (let i = 0; i < lines.length; i++) {
    const hm = lines[i].match(HEADING_RE);
    if (!hm) continue;
    all.push({
      level: hm[1].length,
      title: hm[2].trim(),
      slug: slugify(hm[2].trim()),
      line: i + 1,
    });
  }
  return all;
}

function sectionAtLine(allHeadings, lineNo) {
  const active = [];
  for (const h of allHeadings) {
    if (h.line > lineNo) break;
    while (active.length && active[active.length - 1].level >= h.level) active.pop();
    active.push(h);
  }
  if (!active.length) {
    return {
      section: "(начало файла)",
      sectionTitle: null,
      anchor: `#L${lineNo}`,
    };
  }
  const last = active[active.length - 1];
  return {
    section: active.map((h) => h.title).join(" → "),
    sectionTitle: last.title,
    anchor: `#${last.slug}`,
  };
}

function hrefFor(filePath, anchor) {
  return `sample-notes/${path.basename(filePath)}${anchor}`;
}

function pushMarker(markers, filePath, fileRecord, allHeadings, lineNo, type, text, meta, source, blockSlug) {
  const ctx = sectionAtLine(allHeadings, lineNo);
  markers.push({
    type,
    text,
    file: filePath,
    fileName: path.basename(filePath),
    line: lineNo,
    section: ctx.section,
    sectionTitle: ctx.sectionTitle,
    anchor: ctx.anchor,
    href: hrefFor(filePath, ctx.anchor),
    meta: meta && Object.keys(meta).length ? meta : null,
    fileRecord: fileRecord || null,
    source: source || "line",
    blockSlug: blockSlug || null,
  });
}

function parseFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const markers = [];
  const fileRecord = parseFileRecord(lines);
  const allHeadings = listHeadings(lines);
  const markerBlocks = parseMarkerBlocks(lines);

  for (const block of markerBlocks) {
    const type = typeFromBlockSlug(block.blockSlug);
    if (!type) {
      console.warn(`⚠ неизвестный [marker:${block.blockSlug}] в ${path.basename(filePath)}:${block.lineStart}`);
      continue;
    }
    pushMarker(
      markers,
      filePath,
      fileRecord,
      allHeadings,
      block.lineStart,
      type,
      block.text,
      block.meta,
      "block",
      block.blockSlug
    );
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (lineInBlockRanges(lineNo, markerBlocks)) continue;

    const mm = line.match(MARKER_RE);
    if (!mm) continue;

    const type = mm[1].trim().toLowerCase();
    const text = mm[2].trim();
    const markerMeta = parseMarkerMetaAfter(lines, i);

    pushMarker(markers, filePath, fileRecord, allHeadings, lineNo, type, text, markerMeta, "line");
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
  return new Map(sortGrouped(byType));
}

function formatMarkerMetaLine(meta) {
  if (!meta) return "";
  const parts = [];
  if (meta.added) parts.push(`добавлено ${meta.added}`);
  if (meta.updated) parts.push(`обновлено ${meta.updated}`);
  if (meta.review) parts.push(`повторить ${meta.review}`);
  if (meta.status) parts.push(`статус: ${meta.status}`);
  return parts.length ? ` _(${parts.join(" · ")})_` : "";
}

function formatFileRecordLine(record) {
  if (!record) return "";
  const parts = [];
  if (record.created) parts.push(`созд. ${record.created}`);
  if (record.updated) parts.push(`обн. ${record.updated}`);
  if (record.topic) parts.push(record.topic);
  return parts.length ? ` — ${parts.join(" · ")}` : "";
}

function renderMarkdown(grouped) {
  const lines = ["# Сводка пометок", ""];
  for (const [type, byFile] of grouped) {
    lines.push(`## [${type}]`, "");
    for (const [fileName, items] of byFile) {
      const record = items[0]?.fileRecord;
      lines.push(`### ${fileName}${formatFileRecordLine(record)}`, "");
      for (const m of items) {
        lines.push(`- **${m.section}** (стр. ${m.line}): ${m.text}${formatMarkerMetaLine(m.meta)}`);
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
    const meta = metaFor(type);
    body += `<section class="type-group" data-type="${escapeHtml(type)}">`;
    body += `<h2><span class="type-icon type-${meta.slug}">${meta.icon}</span> [${escapeHtml(type)}]</h2>`;
    for (const [fileName, items] of byFile) {
      const record = items[0]?.fileRecord;
      const fileDates = formatFileRecordLine(record);
      body += `<div class="file-group">`;
      body += `<h3>${escapeHtml(fileName)}${fileDates ? `<span class="file-dates">${escapeHtml(fileDates.replace(/^ — /, ""))}</span>` : ""}</h3><ul class="marker-list">`;
      for (const m of items) {
        const metaLine = formatMarkerMetaLine(m.meta);
        body += `<li class="marker-item">`;
        body += `<div class="marker-meta"><span class="section">${escapeHtml(m.section)}</span>`;
        body += `<span class="line">стр. ${m.line}</span></div>`;
        if (metaLine) body += `<div class="marker-dates">${escapeHtml(metaLine.replace(/^ _\(|\)_$/g, ""))}</div>`;
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
    const meta = metaFor(type);
    console.log(`\n══ [${type}] ${meta.icon} ══`);
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

function exportBrowserData(markers, outputPath) {
  const grouped = serializeGrouped(groupMarkers(markers));
  const payload = JSON.stringify({ markers, grouped }, null, 2);
  const out = `window.MARKERS_DATA = ${payload};\n`;
  fs.writeFileSync(outputPath, out);
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.input) {
    const types = TYPE_ORDER.map((t) => `[${t}]`).join(", ");
    console.log(`Использование:
  node collect-markers.js --input <файл|папка> [--type "<тип>"] [--output report.html] [--format md|html|json] [--export-browser data.js]

Типы пометок: ${types}

Примеры:
  node collect-markers.js -i sample-notes/
  node collect-markers.js -i sample-notes/ -t "мое вопрос"
  node collect-markers.js -i sample-notes/ -o report.html
  node collect-markers.js -i sample-notes/ -e 03-study-markers-data.js`);
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = path.resolve(args.input);
  const files = collectFiles(inputPath);
  let markers = files.flatMap(parseFile);
  markers = filterByType(markers, args.type);

  if (args.exportBrowser) {
    exportBrowserData(markers, path.resolve(args.exportBrowser));
    console.log(`✓ ${args.exportBrowser} (${markers.length} пометок)`);
    return;
  }

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

module.exports = { parseFile, collectFiles, filterByType, groupMarkers, exportBrowserData, slugify };
