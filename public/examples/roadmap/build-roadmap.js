#!/usr/bin/env node
/**
 * Строит дорожную карту из markdown-файла.
 *
 *   node build-roadmap.js --input sample-roadmap/java-learning.md
 *   node build-roadmap.js -i sample-roadmap/java-learning.md -o roadmap.html
 */

const fs = require("fs");
const path = require("path");

const H1_RE = /^#\s+(.+)$/;
const H2_RE = /^##\s+(.+)$/;
const STATUS_RE = /^статус:\s*(.+)$/i;
const PARALLEL_START = /^\[параллельная группа\]\s*$/i;
const PARALLEL_END = /^\[\/параллельная группа\]\s*$/i;

const STATUS_MAP = {
  "не начато": "todo",
  "в процессе": "progress",
  "завершено": "done",
};

function parseArgs(argv) {
  const args = { input: null, output: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input" || a === "-i") args.input = argv[++i];
    else if (a === "--output" || a === "-o") args.output = argv[++i];
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function normalizeStatus(raw) {
  const key = raw.trim().toLowerCase();
  return STATUS_MAP[key] || "todo";
}

function parseRoadmap(content) {
  const lines = content.split(/\r?\n/);
  let title = "Дорожная карта";
  const stages = [];
  let current = null;
  let inParallel = false;
  let parallelBuffer = [];

  function flushStage() {
    if (!current) return;
    const stage = {
      id: `stage-${stages.length + parallelBuffer.length + 1}`,
      title: current.title,
      status: current.status,
      description: current.description.join(" ").trim(),
    };
    if (inParallel) parallelBuffer.push(stage);
    else stages.push({ type: "single", stage });
    current = null;
  }

  function flushParallel() {
    if (parallelBuffer.length) {
      stages.push({ type: "parallel", stages: parallelBuffer });
      parallelBuffer = [];
    }
    inParallel = false;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (current) current.description.push("");
      continue;
    }

    const h1 = trimmed.match(H1_RE);
    if (h1) {
      flushStage();
      if (inParallel) flushParallel();
      title = h1[1].trim();
      continue;
    }

    if (PARALLEL_START.test(trimmed)) {
      flushStage();
      inParallel = true;
      continue;
    }
    if (PARALLEL_END.test(trimmed)) {
      flushStage();
      flushParallel();
      continue;
    }

    const h2 = trimmed.match(H2_RE);
    if (h2) {
      flushStage();
      current = { title: h2[1].trim(), status: "todo", description: [] };
      continue;
    }

    const status = trimmed.match(STATUS_RE);
    if (status && current) {
      current.status = normalizeStatus(status[1]);
      continue;
    }

    if (current) current.description.push(trimmed);
  }

  flushStage();
  if (inParallel) flushParallel();

  return { title, columns: stages };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderStageBlock(stage) {
  const labels = { todo: "не начато", progress: "в процессе", done: "завершено" };
  return `
    <div class="stage status-${stage.status}" data-status="${stage.status}">
      <div class="stage-header">
        <h3>${escapeHtml(stage.title)}</h3>
        <span class="stage-badge">${labels[stage.status] || stage.status}</span>
      </div>
      <p class="stage-desc">${escapeHtml(stage.description)}</p>
    </div>`;
}

function renderRoadmapHtml(data) {
  let columnsHtml = "";
  for (let i = 0; i < data.columns.length; i++) {
    const col = data.columns[i];
    if (i > 0) columnsHtml += `<div class="arrow" aria-hidden="true">→</div>`;

    if (col.type === "single") {
      columnsHtml += `<div class="column single">${renderStageBlock(col.stage)}</div>`;
    } else {
      const blocks = col.stages.map(renderStageBlock).join("");
      columnsHtml += `<div class="column parallel">${blocks}</div>`;
    }
  }

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(data.title)}</title>
  <link rel="stylesheet" href="roadmap.css">
</head>
<body>
  <div class="page">
    <header><h1>${escapeHtml(data.title)}</h1></header>
    <div class="roadmap">${columnsHtml}</div>
  </div>
</body>
</html>`;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.input) {
    console.log(`Использование:
  node build-roadmap.js --input <файл.md> [--output roadmap.html]

Синтаксис markdown:
  # Название карты
  ## Этап 1
  статус: завершено | в процессе | не начато
  Описание этапа…

  [параллельная группа]
  ## Этап A
  статус: в процессе
  …
  ## Этап B
  статус: не начато
  …`);
    process.exit(args.help ? 0 : 1);
  }

  const inputPath = path.resolve(args.input);
  const content = fs.readFileSync(inputPath, "utf8");
  const data = parseRoadmap(content);

  if (args.output) {
    fs.writeFileSync(args.output, renderRoadmapHtml(data));
    console.log(`Сохранено: ${args.output}`);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

if (require.main === module) main();

module.exports = { parseRoadmap, normalizeStatus };
