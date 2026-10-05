#!/usr/bin/env node
/**
 * Merge manifest.store.md (+ optional manifest.md body) → single manifest.md with awn-* keys.
 * Removes manifest.store.md after merge.
 */
const fs = require("fs");
const path = require("path");
const { parseTypeYaml } = require("../lib/awn/awn-yaml-utils");

const ROOT = path.join(__dirname, "../workspaces/agent-cms-core/awn-data");

const PROP_MAP = {
  "awn-prop-type": "awn-type",
  "awn-prop-id": "awn-id",
  "awn-prop-name": "awn-name",
  "awn-prop-extends": "awn-extends",
  "awn-prop-record": "awn-record",
  "awn-prop-layer": "awn-layer",
  "awn-prop-description": null
};

function readMdParts(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: raw.trim() };
  return { frontmatter: parseTypeYaml(match[1]) || {}, body: String(match[2] || "").trim() };
}

function convertFrontmatter(fm) {
  const out = {};
  for (const [key, value] of Object.entries(fm || {})) {
    if (key === "awn-prop-description" || key === "awn-description") continue;
    const mapped = Object.prototype.hasOwnProperty.call(PROP_MAP, key) ? PROP_MAP[key] : key;
    if (mapped === null) continue;
    if (mapped === "awn-extends" && typeof value === "string") {
      out[mapped] = value
        .replace(/manifest\.store\.md/gi, "manifest.md")
        .replace(/\/store\.yml/gi, "/manifest.md")
        .replace(/_store\.md/gi, "manifest.md");
      continue;
    }
    if (mapped === "awn-record" || mapped === "awn-fields") {
      out[mapped] = value;
      continue;
    }
    out[mapped] = value;
  }
  if (fm["awn-fields"] && !out["awn-fields"]) out["awn-fields"] = fm["awn-fields"];
  if (fm.fields && !out["awn-fields"]) out["awn-fields"] = fm.fields;
  return out;
}

function dumpYaml(obj, indent = 0) {
  const pad = "  ".repeat(indent);
  const lines = [];
  for (const [key, value] of Object.entries(obj || {})) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      lines.push(`${pad}${key}:`);
      lines.push(...dumpYaml(value, indent + 1));
      continue;
    }
    if (Array.isArray(value)) {
      lines.push(`${pad}${key}:`);
      for (const item of value) {
        if (item && typeof item === "object") {
          lines.push(`${pad}  -`);
          lines.push(...dumpYaml(item, indent + 2));
        } else {
          lines.push(`${pad}  - ${JSON.stringify(String(item))}`);
        }
      }
      continue;
    }
    const text = String(value ?? "");
    const quoted = /[:#\n[\]{}&,*>!|@`"]/.test(text) ? JSON.stringify(text) : text;
    lines.push(`${pad}${key}: ${quoted}`);
  }
  return lines;
}

function buildManifestContent(fm, body) {
  const lines = ["---", ...dumpYaml(fm), "---", ""];
  if (body) lines.push(body, "");
  return `${lines.join("\n")}\n`;
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (entry.name === "manifest.store.md") acc.push(full);
  }
  return acc;
}

function main() {
  const files = walk(ROOT);
  let merged = 0;
  for (const storePath of files) {
    const dir = path.dirname(storePath);
    const storeParts = readMdParts(storePath);
    if (!storeParts) continue;
    const manifestPath = path.join(dir, "manifest.md");
    const existingManifest = readMdParts(manifestPath);
    const fm = convertFrontmatter(storeParts.frontmatter);
    let body = existingManifest?.body || storeParts.body || "";
    if (!body && storeParts.frontmatter["awn-prop-description"]) {
      const name = fm["awn-name"] || fm["awn-id"] || "Накопитель";
      body = `# ${name}\n\n${storeParts.frontmatter["awn-prop-description"]}`;
    }
    if (!body && fm["awn-name"]) {
      body = `# ${fm["awn-name"]}\n\n${fm["awn-name"]}.`;
    }
    fs.writeFileSync(manifestPath, buildManifestContent(fm, body), "utf-8");
    fs.unlinkSync(storePath);
    merged += 1;
    console.log("merged", path.relative(ROOT, manifestPath));
  }
  console.log(`Done: ${merged} stores → manifest.md`);
}

main();
