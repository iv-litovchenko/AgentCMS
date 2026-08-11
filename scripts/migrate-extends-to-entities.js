#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const ROOT = path.join(process.cwd(), "workspaces/agent-cms-core/awn-data");
const TABLE = "awn-data/cms-base/entities/table.base.md";
const ROW = "awn-data/cms-base/entities/row.base.md";
const BASE = "awn-data/cms-base/entities/base.md";
const OLD = "awn-data/cms-base/entities/table-base/manifest.md";

const TYPE_STORES = new Set([
  "cms-base/entities/manifest.md",
  "settings/manifest.md"
]);

const DATA_STORES = new Set([
  "tasks/manifest.md",
  "templates/manifest.md",
  "settings-global/manifest.md",
  "agent-registry/agents/manifest.md",
  "agent-registry/agent-groups/manifest.md",
  "taxonomies/categories/manifest.md",
  "taxonomies/colors/manifest.md",
  "taxonomies/priorities/manifest.md",
  "taxonomies/slot-categories/manifest.md",
  "taxonomies/statuses/manifest.md",
  "taxonomies/tags/manifest.md",
  "taxonomies/users/manifest.md"
]);

const STRIP_FIELDS = new Set([
  "awn-title",
  "awn-typeId",
  "awn-kind",
  "awn-domain",
  "awn-status",
  "awn-extends"
]);

function splitMd(raw) {
  const m = String(raw).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  return { front: m[1], body: m[2] };
}

function parseSimpleYamlBlock(block) {
  const lines = String(block || "").split("\n");
  const fields = {};
  let current = null;
  for (const line of lines) {
    const keyMatch = line.match(/^  ([a-zA-Z0-9_-]+):\s*$/);
    if (keyMatch) {
      current = keyMatch[1];
      fields[current] = {};
      continue;
    }
    if (!current) continue;
    const prop = line.match(/^    ([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (prop) fields[current][prop[1]] = prop[2].replace(/^["']|["']$/g, "");
  }
  return fields;
}

function dumpFields(fields, indent = "") {
  const lines = [`${indent}awn-fields:`];
  for (const [key, def] of Object.entries(fields)) {
    lines.push(`${indent}  ${key}:`);
    for (const [pk, pv] of Object.entries(def)) {
      if (Array.isArray(pv)) {
        lines.push(`${indent}    ${pk}:`);
        for (const item of pv) lines.push(`${indent}      - ${item}`);
      } else {
        lines.push(`${indent}    ${pk}: ${typeof pv === "string" && /[:#]/.test(pv) ? JSON.stringify(pv) : pv}`);
      }
    }
  }
  return lines.join("\n");
}

function updateManifest(rel, targetExtends, stripCommon = false) {
  const abs = path.join(ROOT, rel);
  let raw = fs.readFileSync(abs, "utf8");
  raw = raw.split(OLD).join(targetExtends).split(TABLE).join(targetExtends);
  const parts = splitMd(raw);
  if (!parts) return;
  let front = parts.front.replace(/^awn-extends:.*$/m, `awn-extends: ${targetExtends}`);
  if (stripCommon && front.includes("awn-fields:")) {
    const fm = front.split("awn-fields:")[0];
    const block = front.split("awn-fields:")[1] || "";
    const local = parseSimpleYamlBlock(block);
    for (const key of STRIP_FIELDS) delete local[key];
    if (Object.keys(local).length) front = `${fm.trimEnd()}\n${dumpFields(local)}\n`;
    else front = `${fm.trimEnd()}\n`;
  }
  fs.writeFileSync(abs, `---\n${front.trimEnd()}\n---\n${parts.body}`, "utf8");
  console.log(rel, "→", targetExtends.split("/").pop());
}

for (const rel of TYPE_STORES) updateManifest(rel, TABLE, rel !== "cms-base/entities/manifest.md");
for (const rel of DATA_STORES) updateManifest(rel, ROW);
updateManifest("cms-base/mixins/manifest.md", BASE);

for (const f of ["scripts/cleanup-awn-data-manifests.js", "scripts/migrate-extends-to-root-paths.js"]) {
  let t = fs.readFileSync(f, "utf8");
  t = t.replace(/awn-data\/cms-base\/entities\/table-base\/manifest\.md/g, TABLE);
  fs.writeFileSync(f, t);
}

console.log("done");
