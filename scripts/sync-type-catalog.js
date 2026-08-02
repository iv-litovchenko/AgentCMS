#!/usr/bin/env node
/**
 * Синхронизация components schemas в domains/awn-storage/configuration/types/
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const coreRoot = path.join(repoRoot, "workspaces/agent-cms-core");
const componentsRoot = path.join(coreRoot, "components");

const MAP = {
  "components/fields": "fields",
  "components/frames": "pages"
};

function yamlStringifyValue(v, indent = 0) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "string") {
    if (v.includes("\n") || v.includes(":") || v.includes("#")) {
      return `|\n${v
        .split("\n")
        .map((line) => "  ".repeat(indent + 1) + line)
        .join("\n")}\n`;
    }
    return v.includes(" ") ? `"${v.replace(/"/g, '\\"')}"` : v;
  }
  return JSON.stringify(v);
}

function copyYaml(src, dest, extra = {}) {
  const raw = fs.readFileSync(src, "utf-8");
  const merged = raw.trimEnd();
  const extras = Object.entries(extra)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${typeof v === "string" && !v.includes("\n") ? v : yamlStringifyValue(v)}`)
    .join("\n");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, extras ? `${merged}\n${extras}\n` : `${merged}\n`, "utf-8");
}

function syncGroup(sourceDir, domain, rename = (n) => n) {
  if (!fs.existsSync(sourceDir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const schemaPath = path.join(sourceDir, entry.name, "awn-storage", "configuration", "schema.yml");
    if (!fs.existsSync(schemaPath)) continue;
    const outName = rename(entry.name);
    if (!outName || outName.startsWith("_")) {
      const baseDest = path.join(coreRoot, domain, "awn-storage", "configuration", "types", `${outName || entry.name}.yml`);
      copyYaml(schemaPath, baseDest, { status: "active" });
    } else {
      const dest = path.join(coreRoot, domain, "awn-storage", "configuration", "types", `${outName}.yml`);
      copyYaml(schemaPath, dest, { status: "active" });
    }
    count += 1;
  }
  return count;
}

function main() {
  let total = 0;

  const fieldsBase = path.join(componentsRoot, "fields/_base/awn-storage/configuration/schema.yml");
  if (fs.existsSync(fieldsBase)) {
    copyYaml(fieldsBase, path.join(coreRoot, "fields/awn-storage/configuration/types/_base.yml"), {
      status: "active",
      domain: "fields"
    });
    total += 1;
  }

  total += syncGroup(path.join(componentsRoot, "fields"), "fields", (n) => (n === "_base" ? null : n));

  const framesBase = path.join(componentsRoot, "frames/_base/awn-storage/configuration/schema.yml");
  if (fs.existsSync(framesBase)) {
    copyYaml(framesBase, path.join(coreRoot, "pages/awn-storage/configuration/types/_base.yml"), {
      id: "awn.base",
      extends: "awn.page",
      status: "active",
      domain: "pages",
      kind: "base"
    });
    total += 1;
  }

  for (const name of ["topic", "area", "workspace", "sidecar", "record"]) {
    const schemaPath = path.join(componentsRoot, "frames", name, "awn-storage", "configuration", "schema.yml");
    if (!fs.existsSync(schemaPath)) continue;
    const dest = path.join(coreRoot, "pages/awn-storage/configuration/types", `${name}.yml`);
    copyYaml(schemaPath, dest, { status: "active", domain: "pages" });
    total += 1;
  }

  console.log(`Synced ${total} type files into type catalog domains`);
}

main();
