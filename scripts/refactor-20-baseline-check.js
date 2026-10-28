#!/usr/bin/env node
"use strict";

/**
 * Refactor 20 — фаза B: автоматические baseline-проверки (не заменяет DevTools Performance/Coverage).
 *
 * Usage:
 *   node scripts/refactor-20-baseline-check.js [baseUrl]
 * Default: http://127.0.0.1:3000
 *
 * Static (без сервера): node scripts/refactor-20-baseline-check.js --offline
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const repoRoot = path.join(__dirname, "..");
const offline = process.argv.includes("--offline");
const cliArgs = process.argv.slice(2).filter((a) => a !== "--offline");
const baseUrl = (cliArgs[0] || "http://127.0.0.1:3000").replace(/\/$/, "");

if (!offline && process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0" && /^https:/i.test(baseUrl)) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

function readRepo(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function gzipBytes(rel) {
  const buf = fs.readFileSync(path.join(repoRoot, rel));
  return zlib.gzipSync(buf).length;
}

function fmtKb(n) {
  return `${(n / 1024).toFixed(1)} KB`;
}

async function fetchText(urlPath) {
  const res = await fetch(`${baseUrl}${urlPath}`);
  if (!res.ok) throw new Error(`${urlPath} → HTTP ${res.status}`);
  return res.text();
}

async function fetchJson(urlPath) {
  const res = await fetch(`${baseUrl}${urlPath}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${urlPath} → HTTP ${res.status}`);
  return res.json();
}

function extractScriptSrcs(html) {
  const srcs = [];
  const re = /<script[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html))) srcs.push(m[1]);
  return srcs;
}

async function main() {
  const report = [];
  let ok = true;

  const push = (name, pass, detail = "") => {
    report.push({ name, pass, detail });
    if (!pass) ok = false;
  };

  // —— Static: phase A (docs вне editor) ——
  const indexHtml = readRepo("public/editor/index.html");
  const mainJs = readRepo("public/editor/main.js");
  const connStatus = readRepo("public/editor/js/app/connection-status.js");

  for (const id of ["user-docs-modal", "api-docs-modal", "mcp-docs-modal"]) {
    push(`index.html без #${id}`, !indexHtml.includes(`id="${id}"`));
  }

  for (const needle of ["api-docs-ui.js", "mcp-docs-primitives-help.js", "fetchDocsMeta(", "void fetchDocsMeta"]) {
    push(`main.js без ${needle}`, !mainJs.includes(needle));
  }

  push("connection-status → /api/health", connStatus.includes('HEALTH_URL = "/api/health"'));
  push(
    "connection-status без docs-meta",
    !connStatus.includes("/api/docs-meta")
  );

  for (const rel of ["public/editor/js/panels/api-docs-ui.js", "public/editor/js/panels/mcp-docs-primitives-help.js"]) {
    push(`удалён ${path.basename(rel)}`, !fs.existsSync(path.join(repoRoot, rel)));
  }

  push("app-docs index.html", fs.existsSync(path.join(repoRoot, "public/docs/index.html")));
  push(
    "editor-boot-route.js",
    fs.existsSync(path.join(repoRoot, "public/editor/js/boot/editor-boot-route.js"))
  );
  push(
    "index: landing modulepreload только через needsLandingChunkAtBoot",
    indexHtml.includes("maybePreloadLandingChunk") &&
      indexHtml.includes("needsLandingChunkAtBoot") &&
      !indexHtml.includes('<link rel="modulepreload" href="/editor/js/landing/landing-runtime.js')
  );
  push(
    "index: startEditorMain условный landing boot",
    indexHtml.includes("needsLanding") && indexHtml.includes("loadLandingChunkBoot")
  );

  push(
    "main.js: workspace boot defer (REFACTOR-20 D)",
    mainJs.includes("isEditorWorkspaceBootRoute") &&
      mainJs.includes("startDeferredWorkspaceHeavyScripts") &&
      mainJs.includes("if (isAppLandingRoute)") &&
      mainJs.includes("await loadLandingAgentsGroups")
  );

  push(
    "REFACTOR-20 slices: mode-groups + save-api + user-docs preview",
    fs.existsSync(path.join(repoRoot, "public/editor/js/core/editor-mode-groups-runtime.js")) &&
      fs.existsSync(path.join(repoRoot, "public/editor/js/core/editor-save-api-runtime.js")) &&
      fs.existsSync(path.join(repoRoot, "public/editor/js/core/user-docs-markdown-preview-runtime.js")) &&
      mainJs.includes("filterNavigationHubRailFilledSlots")
  );

  const indexBytes = fs.statSync(path.join(repoRoot, "public/editor/index.html")).size;
  const mainBytes = fs.statSync(path.join(repoRoot, "public/editor/main.js")).size;
  const mainGzip = gzipBytes("public/editor/main.js");

  console.log("REFACTOR-20 baseline check\n");
  console.log("Static sizes (2026-10-28, после фазы A):");
  console.log(`  index.html     ${fmtKb(indexBytes)} (${indexBytes} B)`);
  console.log(`  main.js raw    ${fmtKb(mainBytes)} (${mainBytes} B)`);
  console.log(`  main.js gzip   ${fmtKb(mainGzip)} (orientir)\n`);

  if (!offline) {
    console.log(`HTTP checks — ${baseUrl}\n`);
    try {
      const health = await fetchJson("/api/health");
      push("/api/health { ok: true }", health && health.ok === true);
    } catch (e) {
      push("/api/health", false, String(e.message));
    }

    try {
      const meta = await fetchJson("/api/docs-meta");
      push("/api/docs-meta доступен (только app-docs)", Boolean(meta?.defaultVersion && meta?.versions?.length));
    } catch (e) {
      push("/api/docs-meta", false, String(e.message));
    }

    try {
      const docsApp = await fetchText("/app-docs/?view=guides");
      push(
        "/app-docs/ → public/docs SPA",
        docsApp.includes("/docs/docs.css") && docsApp.includes("docs-app.js")
      );
    } catch (e) {
      push("/app-docs/", false, String(e.message));
    }

    for (const route of ["/", "/0-ws-core"]) {
      try {
        const html = await fetchText(route);
        const scripts = extractScriptSrcs(html);
        push(`${route} HTML без api-docs-ui в boot`, !scripts.some((s) => s.includes("api-docs-ui")));
        push(`${route} HTML без docs modals`, !html.includes("api-docs-modal"));
      } catch (e) {
        push(`${route} HTML`, false, String(e.message));
      }
    }
  } else {
    console.log("HTTP checks skipped (--offline)\n");
  }

  for (const row of report) {
    console.log(`${row.pass ? "✓" : "✗"} ${row.name}${row.detail ? ` — ${row.detail}` : ""}`);
  }

  console.log("");
  console.log(
    ok
      ? "REFACTOR-20 automated baseline: PASS (DevTools Performance/Coverage — см. docs/REFACTOR-20-baseline.md)"
      : "REFACTOR-20 automated baseline: FAIL"
  );
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
