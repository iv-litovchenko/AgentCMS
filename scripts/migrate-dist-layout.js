#!/usr/bin/env node
/**
 * Одноразовая миграция legacy dist/ → dist/agent-cms + dist/agent-shell.
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const dist = path.join(__dirname, "..", "dist");
if (!fs.existsSync(dist)) {
  console.log("migrate-dist-layout: no dist/, nothing to do");
  process.exit(0);
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function moveEntry(src, destDir) {
  if (!fs.existsSync(src)) return;
  ensureDir(destDir);
  const base = path.basename(src);
  const dest = path.join(destDir, base);
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.renameSync(src, dest);
}

function moveMatching(dir, destDir, pattern) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (pattern.test(name)) {
      moveEntry(path.join(dir, name), destDir);
    }
  }
}

const cmsDir = path.join(dist, "agent-cms");
const shellDir = path.join(dist, "agent-shell");
ensureDir(cmsDir);
ensureDir(shellDir);

// legacy CMS: dist/mac/
if (fs.existsSync(path.join(dist, "mac"))) {
  for (const name of fs.readdirSync(path.join(dist, "mac"))) {
    moveEntry(path.join(dist, "mac", name), cmsDir);
  }
  fs.rmSync(path.join(dist, "mac"), { recursive: true, force: true });
}

// legacy Shell: dist/shell/
if (fs.existsSync(path.join(dist, "shell"))) {
  for (const name of fs.readdirSync(path.join(dist, "shell"))) {
    moveEntry(path.join(dist, "shell", name), shellDir);
  }
  fs.rmSync(path.join(dist, "shell"), { recursive: true, force: true });
}

// CMS installers at dist root
moveMatching(dist, cmsDir, /^Agent CMS-/);
if (fs.existsSync(path.join(dist, "latest-mac.yml"))) {
  moveEntry(path.join(dist, "latest-mac.yml"), cmsDir);
}
for (const name of ["builder-debug.yml", "builder-effective-config.yaml"]) {
  const p = path.join(dist, name);
  if (fs.existsSync(p)) moveEntry(p, cmsDir);
}

if (fs.existsSync(path.join(dist, ".icon-icns"))) {
  fs.rmSync(path.join(dist, ".icon-icns"), { recursive: true, force: true });
}

const flatten = path.join(__dirname, "flatten-desktop-dist.js");
for (const product of ["agent-cms", "agent-shell"]) {
  execFileSync(process.execPath, [flatten, product], { stdio: "inherit" });
}

console.log("migrate-dist-layout: done");
