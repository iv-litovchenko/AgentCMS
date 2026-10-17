#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const mainSource = path.join(repoRoot, "public/editor/main.js");
const outBuilt = path.join(repoRoot, "public/editor/main.built.js");
const outMap = `${outBuilt}.map`;

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

  const after = fs.statSync(outBuilt).size;
  const ms = Date.now() - t0;
  const pct = before ? Math.round((1 - after / before) * 100) : 0;

  console.log(`build-editor: ${path.relative(repoRoot, outBuilt)}`);
  console.log(`  size: ${(before / 1024 / 1024).toFixed(2)} MB → ${(after / 1024 / 1024).toFixed(2)} MB (${pct}% smaller)`);
  console.log(`  map:  ${path.relative(repoRoot, outMap)}`);
  console.log(`  time: ${ms} ms`);
  console.log("");
  console.log("Dev: index.html keeps /editor/main.js (source).");
  console.log("Prod/electron: optional swap to /editor/main.built.js");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
