#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const editorDir = path.join(repoRoot, "public/editor");
const mainSource = path.join(editorDir, "main.js");
const outBuilt = path.join(editorDir, "main.built.js");
const outMap = `${outBuilt}.map`;
const manifestPath = path.join(editorDir, "editor-build-manifest.json");

const HASHED_MAIN_RE = /^main\.[a-f0-9]{8}\.built\.js$/i;
const HASHED_MAP_RE = /^main\.[a-f0-9]{8}\.built\.js\.map$/i;

function pruneOldHashedBundles(keepBasenames) {
  const keep = new Set(keepBasenames);
  for (const name of fs.readdirSync(editorDir)) {
    if (!HASHED_MAIN_RE.test(name) && !HASHED_MAP_RE.test(name)) continue;
    if (keep.has(name)) continue;
    fs.unlinkSync(path.join(editorDir, name));
  }
}

async function main() {
  let esbuild;
  try {
    esbuild = require("esbuild");
  } catch {
    console.error("esbuild not installed. Run: npm install --save-dev esbuild");
    process.exit(1);
  }

  if (!fs.existsSync(mainSource)) {
    console.error("Missing", mainSource);
    process.exit(1);
  }

  const before = fs.statSync(mainSource).size;
  const t0 = Date.now();

  await esbuild.build({
    entryPoints: [mainSource],
    outfile: outBuilt,
    bundle: false,
    minify: true,
    legalComments: "none",
    sourcemap: true,
    target: ["es2020"]
  });

  const builtBuf = fs.readFileSync(outBuilt);
  const hash = crypto.createHash("sha256").update(builtBuf).digest("hex").slice(0, 8);
  const hashedMain = `main.${hash}.built.js`;
  const hashedMap = `${hashedMain}.map`;
  const hashedMainPath = path.join(editorDir, hashedMain);
  const hashedMapPath = path.join(editorDir, hashedMap);

  fs.copyFileSync(outBuilt, hashedMainPath);
  if (fs.existsSync(outMap)) {
    fs.copyFileSync(outMap, hashedMapPath);
  }

  const after = builtBuf.length;
  const ms = Date.now() - t0;
  const pct = before ? Math.round((1 - after / before) * 100) : 0;

  const manifest = {
    generatedAt: new Date().toISOString(),
    hash,
    main: hashedMain,
    mainUrl: `/editor/${hashedMain}`,
    sourcemap: hashedMap,
    fallbackMain: "main.built.js",
    fallbackMainUrl: "/editor/main.built.js",
    bytes: after
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  pruneOldHashedBundles([hashedMain, hashedMap]);

  console.log(`build-editor: ${path.relative(repoRoot, outBuilt)} (+ ${hashedMain})`);
  console.log(`  size: ${(before / 1024 / 1024).toFixed(2)} MB → ${(after / 1024 / 1024).toFixed(2)} MB (${pct}% smaller)`);
  console.log(`  hash: ${hash}`);
  console.log(`  manifest: ${path.relative(repoRoot, manifestPath)}`);
  console.log(`  map:  ${path.relative(repoRoot, outMap)}`);
  console.log(`  time: ${ms} ms`);
  console.log("");
  console.log("Dev: index.html keeps /editor/main.js (source).");
  console.log("Prod: ?editorBuilt=1 loads editor-build-manifest.json → hashed main (long cache).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
