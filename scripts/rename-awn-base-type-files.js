#!/usr/bin/env node
/**
 * Rename foundation type records: _base.md → base.md (or entity.md when base.md exists).
 * Updates awn-id in frontmatter accordingly.
 */
const fs = require("fs");
const path = require("path");

const AWN_DATA = path.join(process.cwd(), "workspaces/agent-cms-core/awn-data");

/** @type {{ from: string, to: string, newId: string }[]} */
const RENAMES = [
  { from: "pages/_base.md", to: "pages/base.md", newId: "base" },
  { from: "pages/sections/_base.md", to: "pages/sections/base.md", newId: "base" },
  { from: "slots/_base.md", to: "slots/base.md", newId: "base" },
  { from: "settings/_base.md", to: "settings/base.md", newId: "base" },
  // entities/base.md already exists (awn.base) — root entity goes to entity.md
  { from: "cms-base/entities/_base.md", to: "cms-base/entities/entity.md", newId: "entity" }
];

function replaceRecordId(raw, newId) {
  return String(raw).replace(/^awn-id:\s*_base\s*$/m, `awn-id: ${newId}`);
}

function main() {
  for (const { from, to, newId } of RENAMES) {
    const src = path.join(AWN_DATA, from);
    const dest = path.join(AWN_DATA, to);
    if (!fs.existsSync(src)) {
      console.warn("missing:", from);
      continue;
    }
    if (fs.existsSync(dest)) {
      console.error("target exists, skip:", to);
      continue;
    }
    const raw = fs.readFileSync(src, "utf8");
    fs.writeFileSync(dest, replaceRecordId(raw, newId), "utf8");
    fs.unlinkSync(src);
    console.log(`${from} → ${to} (awn-id: ${newId})`);
  }

  const recordBaseManifest = path.join(AWN_DATA, "cms-base/record-base/manifest.md");
  if (fs.existsSync(recordBaseManifest)) {
    let text = fs.readFileSync(recordBaseManifest, "utf8");
    if (text.includes("# _base")) {
      text = text.replace("# _base", "# base");
      fs.writeFileSync(recordBaseManifest, text, "utf8");
      console.log("record-base/manifest.md: title _base → base");
    }
  }
}

main();
