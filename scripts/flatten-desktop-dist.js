#!/usr/bin/env node
/**
 * electron-builder кладёт .app в <output>/mac/.
 * Поднимаем содержимое mac/ на уровень dist/<product>/.
 */
const fs = require("fs");
const path = require("path");

const product = process.argv[2];
if (!product) {
  console.error("Usage: node scripts/flatten-desktop-dist.js <agent-cms|agent-shell>");
  process.exit(1);
}

const root = path.join(__dirname, "..", "dist", product);
const macDir = path.join(root, "mac");

if (!fs.existsSync(macDir)) {
  console.log(`flatten-desktop-dist: no ${macDir}, skip`);
  process.exit(0);
}

for (const name of fs.readdirSync(macDir)) {
  const src = path.join(macDir, name);
  const dest = path.join(root, name);
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  fs.renameSync(src, dest);
}

fs.rmSync(macDir, { recursive: true, force: true });

for (const extra of [".icon-icns"]) {
  const p = path.join(root, extra);
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

console.log(`flatten-desktop-dist: ${root}`);
