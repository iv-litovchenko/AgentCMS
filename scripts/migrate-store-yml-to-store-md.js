#!/usr/bin/env node
/**
 * Migrate awn-data store.yml (+ manifest.md body) → _store.md
 */
const fs = require("fs");
const path = require("path");
const { parseTypeYaml } = require("../lib/awn/awn-yaml-utils");
const {
  buildStoreMdContent,
  normalizeExtendsRef,
  STORE_MD_FILE,
  STORE_FILE
} = require("../lib/awn/awn-data-loader");

const ROOT = path.join(__dirname, "..", "workspaces", "agent-cms-core", "awn-data");
const MANIFEST = "manifest.md";

function splitFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: text.trim() };
  return { body: match[2].trim() };
}

function readManifestBody(dir) {
  const manifestPath = path.join(dir, MANIFEST);
  if (!fs.existsSync(manifestPath)) return "";
  return splitFrontmatter(fs.readFileSync(manifestPath, "utf-8")).body.trim();
}

function convertStoreDir(dir, rel = "") {
  const storeYml = path.join(dir, STORE_FILE);
  const storeMd = path.join(dir, STORE_MD_FILE);
  if (fs.existsSync(storeMd)) {
    if (fs.existsSync(storeYml)) {
      fs.unlinkSync(storeYml);
      console.log(`removed legacy ${rel}/${STORE_FILE}`);
    }
    return;
  }
  if (!fs.existsSync(storeYml)) return;

  const schema = parseTypeYaml(fs.readFileSync(storeYml, "utf-8"));
  if (!schema || typeof schema !== "object") {
    console.warn(`skip invalid schema: ${rel}/${STORE_FILE}`);
    return;
  }

  const manifestBody = readManifestBody(dir);
  const body =
    manifestBody ||
    (schema.description ? `# ${schema.name || schema.id || rel}\n\n${schema.description}` : "");

  const normalized = {
    version: schema.version || 1,
    kind: String(schema.kind || "collection").trim(),
    id: String(schema.id || path.basename(dir)).trim(),
    name: String(schema.name || schema.id || path.basename(dir)).trim(),
    description: String(schema.description || "").trim(),
    extends: normalizeExtendsRef(schema.extends || ""),
    layer: schema.layer || "",
    record: schema.record && typeof schema.record === "object" ? schema.record : {},
    fields: schema.fields && typeof schema.fields === "object" ? schema.fields : {}
  };

  fs.writeFileSync(storeMd, buildStoreMdContent(normalized, body), "utf-8");
  fs.unlinkSync(storeYml);
  console.log(`migrated ${rel}/${STORE_FILE} → ${STORE_MD_FILE}`);

  if (manifestBody && fs.existsSync(path.join(dir, MANIFEST))) {
    fs.unlinkSync(path.join(dir, MANIFEST));
    console.log(`removed merged ${rel}/${MANIFEST}`);
  }
}

function walk(dir, rel = "") {
  convertStoreDir(dir, rel || path.basename(dir));
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    walk(path.join(dir, entry.name), childRel);
  }
}

if (!fs.existsSync(ROOT)) {
  console.error("awn-data root not found:", ROOT);
  process.exit(1);
}

walk(ROOT);
console.log("done");
