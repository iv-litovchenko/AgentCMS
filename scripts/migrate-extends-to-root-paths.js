#!/usr/bin/env node
/**
 * Normalize awn-extends in store manifest.md to root-relative paths (from awn-data/).
 */
const fs = require("fs");
const path = require("path");
const { parseTypeYaml } = require("../awn-yaml-utils");
const { normalizeExtendsRef } = require("../awn-data-loader");

const ROOT = path.join(__dirname, "../workspaces/agent-cms-core/awn-data");
const RECORD_BASE = "cms-base/record-base/manifest.md";

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name === "manifest.md") acc.push(full);
  }
  return acc;
}

function normalizeExtendsValue(value) {
  const ref = normalizeExtendsRef(String(value || "").trim());
  if (!ref) return ref;
  if (ref.endsWith("record-base/manifest.md") || ref === "record-base/manifest.md") {
    return RECORD_BASE;
  }
  return ref;
}

function patchManifest(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return false;
  const fm = parseTypeYaml(match[1]) || {};
  const extendsKey = fm["awn-extends"] !== undefined ? "awn-extends" : fm.extends !== undefined ? "extends" : null;
  if (!extendsKey || typeof fm[extendsKey] !== "string") return false;
  const next = normalizeExtendsValue(fm[extendsKey]);
  if (next === fm[extendsKey]) return false;

  const lines = match[1].split(/\r?\n/);
  const outLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith("awn-extends:") || trimmed.startsWith("extends:")) {
      const key = trimmed.split(":")[0];
      return `${key}: ${next}`;
    }
    return line;
  });
  const body = match[2];
  fs.writeFileSync(filePath, `---\n${outLines.join("\n")}\n---\n${body}`, "utf-8");
  return true;
}

function main() {
  let updated = 0;
  for (const filePath of walk(ROOT)) {
    if (patchManifest(filePath)) {
      updated += 1;
      console.log("updated", path.relative(ROOT, filePath), "→", normalizeExtendsValue(parseTypeYaml(fs.readFileSync(filePath, "utf-8").match(/^---\r?\n([\s\S]*?)\r?\n---/)[1])["awn-extends"]));
    }
  }
  console.log(`Done: ${updated} manifests`);
}

main();
