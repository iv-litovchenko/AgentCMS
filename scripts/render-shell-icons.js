#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const repoRoot = path.join(__dirname, "..");
const svgPath = path.join(repoRoot, "public/shell/favicon.svg");
const svg = fs.readFileSync(svgPath);

const targets = [
  [32, path.join(repoRoot, "public/shell/favicon.png")],
  [180, path.join(repoRoot, "public/shell/apple-touch-icon.png")],
  [1024, path.join(repoRoot, "desktop/agent-shell/assets/icon.png")]
];

(async () => {
  for (const [size, outPath] of targets) {
    await sharp(svg).resize(size, size).png().toFile(outPath);
    console.log("icon", size, "→", path.relative(repoRoot, outPath));
  }
})();
