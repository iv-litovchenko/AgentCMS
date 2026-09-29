#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { FIELD_DEMOS } from "./shared-schema.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

for (const demo of FIELD_DEMOS) {
  const dir = path.join(ROOT, demo.id);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(
    path.join(dir, "index.html"),
    `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${demo.num} — ${demo.title}</title>
    <link rel="stylesheet" href="../shared-base.css" />
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <span class="demo-badge">${demo.num} · ${demo.title}</span>
    <a class="demo-back" href="../index.html">← Все типы</a>
    <div id="app"></div>
    <script type="module" src="app.js"></script>
  </body>
</html>`
  );

  fs.writeFileSync(path.join(dir, "style.css"), `/* ${demo.id} */\n`);

  fs.writeFileSync(
    path.join(dir, "app.js"),
    `import { mountFieldDemoPage, getFieldDemo } from "../shared-props.js";

const demo = getFieldDemo("${demo.id}");
const root = document.getElementById("app");
if (demo) mountFieldDemoPage(root, demo);
`
  );
}

const cards = FIELD_DEMOS.map(
  (d) => `
      <article class="card${d.id === "14-full-node" ? " focus-card" : ""}">
        <span class="tag">${d.num}</span>
        <h2>${d.title}</h2>
        <p>${d.desc}</p>
        <div class="card-meta">
          <span class="meta meta--${d.status}">${d.status === "now" ? "в CMS" : "план"}</span>
          <span class="meta meta--kind">${d.storageKind}</span>
        </div>
        <a class="demo" href="./${d.id}/index.html">Открыть</a>
      </article>`
).join("");

fs.writeFileSync(
  path.join(ROOT, "index.html"),
  `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Example6 — типы свойств ноды</title>
    <style>
      :root { --bg: #f0f4f8; --panel: #fff; --border: #dbe3ef; --text: #1e293b; --muted: #64748b; --accent: #2563eb; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 32px 24px 48px; }
      h1 { margin: 0 0 8px; font-size: 28px; }
      .lead { color: var(--muted); max-width: 820px; line-height: 1.55; margin: 0 0 8px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; margin-top: 20px; }
      .card { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
      .card h2 { margin: 0; font-size: 15px; font-family: ui-monospace, monospace; }
      .card p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.45; flex: 1; }
      .tag { font-size: 11px; padding: 2px 8px; border-radius: 999px; background: #f5f3ff; color: #5b21b6; width: fit-content; }
      .card-meta { display: flex; gap: 6px; flex-wrap: wrap; }
      .meta { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; }
      .meta--now { background: #ecfdf5; color: #059669; }
      .meta--planned { background: #f5f3ff; color: #7c3aed; }
      .meta--kind { background: #eff6ff; color: #2563eb; }
      a.demo { display: inline-flex; padding: 8px 14px; border-radius: 8px; background: var(--accent); color: #fff; text-decoration: none; font-size: 13px; font-weight: 600; margin-top: 4px; }
      .focus-card { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(37,99,235,0.12); }
      .links { margin-top: 16px; font-size: 13px; }
      .links a { color: var(--accent); }
      code { font-size: 12px; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
    </style>
  </head>
  <body>
    <h1>Example6 — типы свойств ноды</h1>
    <p class="lead">
      Поля frontmatter <code>_.node.md</code>, описанные через YAML-схему
      (<a href="./node-props.schema.yaml">node-props.schema.yaml</a>).
      В каждом примере: фрагмент схемы, YAML и макет контрола формы.
    </p>
    <p class="lead" style="font-size:13px;">
      <code>node generate.mjs</code> ·
      <code>python3 -m http.server 8768</code> →
      <a href="http://localhost:8768">localhost:8768</a>
    </p>
    <p class="links">
      <a href="./SCHEMA.md">SCHEMA.md</a> ·
      <a href="./15-catalog/index.html">Каталог всех виджетов</a> ·
      <a href="./14-full-node/index.html">Полный frontmatter</a>
    </p>
    <div class="grid">${cards}</div>
  </body>
</html>`
);

console.log(`Generated ${FIELD_DEMOS.length} field demos in examples/ui-variant-6/`);
