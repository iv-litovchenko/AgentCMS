#!/usr/bin/env node
"use strict";

/**
 * Refactor 14 — автопроверка boot (Network-эмуляция через fetch HEAD).
 * Полный smoke (preview, map, WYSIWYG) — вручную / browser.
 *
 * Usage: node scripts/refactor-14-boot-check.js [baseUrl]
 * Default baseUrl: http://127.0.0.1:3001
 */

const baseUrl = (process.argv[2] || "http://127.0.0.1:3001").replace(/\/$/, "");

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0" && /^https:/i.test(baseUrl)) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

const FORBIDDEN_ON_WORKSPACE_BOOT = [
  "mermaid.min.js",
  "toastui-editor",
  "mammoth.browser",
  "xlsx.full",
  "fancybox.umd",
  "d3.min.js",
  "agent-rmm-live-brain",
  "landing-runtime.js",
  "workspace-graph-chunk.js"
];

const DEFERRED_PANELS = [
  "semantic-index-panel.js",
  "entity-registry-editor.js",
  "awn-dashboards.js"
];

async function fetchText(path) {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return res.text();
}

function extractScriptSrcs(html) {
  const srcs = [];
  const re = /<script[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) srcs.push(m[1]);
  return srcs;
}

function hasInlineBuiltLoader(html) {
  return html.includes("agentCmsLoadEditorMain") && html.includes("editor-build-manifest.json");
}

async function headOk(path) {
  const res = await fetch(`${baseUrl}${path}`, { method: "HEAD" });
  return res.ok;
}

async function main() {
  console.log(`Refactor 14 boot check — ${baseUrl}\n`);

  const indexHtml = await fetchText("/0-ws-core");
  const bootScripts = extractScriptSrcs(indexHtml);

  let ok = true;
  const report = [];

  for (const needle of FORBIDDEN_ON_WORKSPACE_BOOT) {
    const hit = bootScripts.some((s) => s.includes(needle));
    report.push({ check: `index boot без ${needle}`, pass: !hit });
    if (hit) ok = false;
  }

  for (const needle of DEFERRED_PANELS) {
    const hit = bootScripts.some((s) => s.includes(needle));
    report.push({ check: `index boot без ${needle} (lazy)`, pass: !hit });
    if (hit) ok = false;
  }

  report.push({
    check: "loader main + manifest (index.html)",
    pass: hasInlineBuiltLoader(indexHtml)
  });
  if (!hasInlineBuiltLoader(indexHtml)) ok = false;

  const manifestOk = await headOk("/editor/editor-build-manifest.json");
  report.push({ check: "editor-build-manifest.json доступен", pass: manifestOk });
  if (!manifestOk) ok = false;

  let manifest;
  try {
    manifest = JSON.parse(await fetchText("/editor/editor-build-manifest.json"));
  } catch (e) {
    report.push({ check: "manifest JSON", pass: false, detail: String(e.message) });
    ok = false;
  }

  if (manifest?.mainUrl) {
    const hashedOk = await headOk(manifest.mainUrl);
    report.push({
      check: `hashed main ${manifest.mainUrl}`,
      pass: hashedOk
    });
    if (!hashedOk) ok = false;
  }

  for (const row of report) {
    console.log(`${row.pass ? "✓" : "✗"} ${row.check}${row.detail ? ` — ${row.detail}` : ""}`);
  }

  console.log("");
  console.log(ok ? "Boot static checks: PASS" : "Boot static checks: FAIL");
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
