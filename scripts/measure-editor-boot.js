#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const repoRoot = path.join(__dirname, "..");

function fileSize(relPath) {
  const abs = path.join(repoRoot, relPath);
  if (!fs.existsSync(abs)) return null;
  const buf = fs.readFileSync(abs);
  const gzip = zlib.gzipSync(buf);
  return { bytes: buf.length, gzipBytes: gzip.length, path: relPath };
}

function fmtMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function fmtKb(bytes) {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const manifestRel = "public/editor/editor-build-manifest.json";
let manifest = null;
try {
  manifest = JSON.parse(
    fs.readFileSync(path.join(repoRoot, manifestRel), "utf8")
  );
} catch {
  /* no manifest until build:editor */
}

const mainPaths = ["public/editor/main.js", "public/editor/main.built.js"];
if (manifest?.main) {
  mainPaths.push(`public/editor/${manifest.main}`);
}

const lazyChunks = [
  "public/editor/js/landing/landing-runtime.js",
  "public/editor/js/landing/landing-system-map.js",
  "public/editor/js/landing/landing-flow.js",
  "public/editor/js/landing/landing-hub.js",
  "public/editor/js/landing/landing-orbit.js",
  "public/editor/js/workspace/workspace-graph-chunk.js"
];

/** Vendor removed from index.html boot (refactor 14 lazy) */
const deferredVendor = [
  "public/_resources/vendor/mermaid.min.js",
  "public/_resources/vendor/toastui-editor-all.min.js",
  "public/_resources/vendor/toastui-editor.css",
  "public/_resources/vendor/mammoth.browser.min.js",
  "public/_resources/vendor/xlsx.full.min.js",
  "public/_resources/vendor/fancybox/fancybox.umd.js",
  "public/_resources/vendor/fancybox/fancybox.css",
  "public/_resources/vendor/d3.min.js",
  "public/editor/js/panels/agent-rmm-live-brain.js"
];

/** Editor panels removed from index.html boot (lazy after main init) */
const deferredEditorPanels = [
  "public/editor/js/panels/semantic-index-panel.js",
  "public/editor/js/panels/entity-registry-editor.js",
  "public/editor/js/cms/awn-dashboards.js"
];

const deferredComfort = [
  "public/editor/js/pomodoro/idle-screensaver-breaks-client.js",
  "public/editor/js/pomodoro/workspace-idle-screensaver.js",
  "public/editor/js/pomodoro/pomodoro-state-bootstrap.js",
  "public/editor/js/pomodoro/workspace-pomodoro.js",
  "public/editor/js/editor/document-viewer.js"
];

console.log("Editor boot metrics (refactor 14)\n");
if (manifest?.hash) {
  console.log(`Prod manifest (${manifestRel}): hash ${manifest.hash} → ${manifest.mainUrl || manifest.main}\n`);
}

for (const rel of mainPaths) {
  const s = fileSize(rel);
  if (!s) continue;
  console.log(`${rel}`);
  console.log(`  raw:  ${fmtMb(s.bytes)} (${s.bytes} B)`);
  console.log(`  gzip: ${fmtMb(s.gzipBytes)} (orientir)\n`);
}

let chunkRaw = 0;
let chunkGzip = 0;
console.log("Lazy chunks (import on demand, not on /0-ws-core F5):");
for (const rel of lazyChunks) {
  const s = fileSize(rel);
  if (!s) continue;
  chunkRaw += s.bytes;
  chunkGzip += s.gzipBytes;
  console.log(`  ${fmtKb(s.bytes).padStart(10)}  ${rel}`);
}
console.log(`  ${"—".repeat(10)}`);
console.log(`  ${fmtKb(chunkRaw).padStart(10)}  total chunks (raw ${fmtMb(chunkRaw)})\n`);

let vendorRaw = 0;
let vendorGzip = 0;
console.log("Deferred vendor (not in index.html script boot):");
for (const rel of deferredVendor) {
  const s = fileSize(rel);
  if (!s) continue;
  vendorRaw += s.bytes;
  vendorGzip += s.gzipBytes;
  console.log(`  ${fmtKb(s.bytes).padStart(10)}  ${rel}`);
}
console.log(`  ${"—".repeat(10)}`);
console.log(`  ${fmtKb(vendorRaw).padStart(10)}  total deferred vendor (raw ${fmtMb(vendorRaw)})\n`);

let panelRaw = 0;
console.log("Deferred editor panels (lazy via loadEditorMenuPanels, not in index.html):");
for (const rel of deferredEditorPanels) {
  const s = fileSize(rel);
  if (!s) continue;
  panelRaw += s.bytes;
  console.log(`  ${fmtKb(s.bytes).padStart(10)}  ${rel}`);
}
console.log(`  ${"—".repeat(10)}`);
console.log(`  ${fmtKb(panelRaw).padStart(10)}  total panels (raw ${fmtMb(panelRaw)})\n`);

let comfortRaw = 0;
console.log("Deferred comfort / document viewer (lazy, not in index.html):");
for (const rel of deferredComfort) {
  const s = fileSize(rel);
  if (!s) continue;
  comfortRaw += s.bytes;
  console.log(`  ${fmtKb(s.bytes).padStart(10)}  ${rel}`);
}
console.log(`  ${"—".repeat(10)}`);
console.log(`  ${fmtKb(comfortRaw).padStart(10)}  total comfort (raw ${fmtMb(comfortRaw)})\n`);

console.log("Оценка выигрыша на F5 workspace (без preview/WYSIWYG/landing/map):");
console.log(`  ~${fmtMb(vendorRaw)} vendor JS не parse/compile на cold boot`);
console.log(`  ~${fmtMb(panelRaw)} menu panels после init main (не блокируют загрузку main)`);
console.log(`  ~${fmtMb(comfortRaw)} pomodoro/screensaver/document-viewer после init main`);
console.log(`  ~${fmtMb(chunkRaw)} editor chunks подгружаются только при нужном экране`);
console.log("");
console.log("DevTools: Performance → reload на /0-ws-core → Scripting + Parse/compile.");
console.log("Сравнить с веткой до refactor 14 или сохранить trace в docs/traces/.");
