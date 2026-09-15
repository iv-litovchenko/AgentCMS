#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const repoRoot = path.join(__dirname, "..");

const brands = [
  {
    name: "Agent CMS",
    svgPath: path.join(repoRoot, "public/favicon.svg"),
    targets: [
      [32, path.join(repoRoot, "public/favicon.png")],
      [180, path.join(repoRoot, "public/apple-touch-icon.png")],
      [1024, path.join(repoRoot, "desktop/agent-cms/assets/icon.png")]
    ]
  },
  {
    name: "Agent Shell",
    svgPath: path.join(repoRoot, "public/shell/favicon.svg"),
    targets: [
      [32, path.join(repoRoot, "public/shell/favicon.png")],
      [180, path.join(repoRoot, "public/shell/apple-touch-icon.png")],
      [1024, path.join(repoRoot, "desktop/agent-shell/assets/icon.png")]
    ]
  },
  {
    name: "Agent Control",
    svgPath: path.join(repoRoot, "desktop/agent-control/assets/favicon.svg"),
    targets: [[1024, path.join(repoRoot, "desktop/agent-control/assets/icon.png")]]
  }
];

(async () => {
  for (const brand of brands) {
    const svg = fs.readFileSync(brand.svgPath);
    for (const [size, outPath] of brand.targets) {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      await sharp(svg).resize(size, size).png().toFile(outPath);
      console.log(`${brand.name}`, size, "→", path.relative(repoRoot, outPath));
    }
  }

  try {
    await require("./patch-dist-icons.js").patchDistIcons();
  } catch (error) {
    console.warn("patch-dist-icons:", error.message || error);
  }

  await require("./build-control-root-app.js").buildRootApp();
})();
