#!/usr/bin/env node
/**
 * _store.md → manifest.store.md (contract) + manifest.md (plain text)
 */
const fs = require("fs");
const path = require("path");
const { parseTypeYaml } = require("../lib/awn/awn-yaml-utils");
const {
  buildStoreMdContent,
  buildPlainManifestContent,
  normalizeExtendsRef,
  STORE_CONTRACT_FILE,
  STORE_MD_FILE,
  COLLECTION_MANIFEST
} = require("../lib/awn/awn-data-loader");

const ROOT = path.join(__dirname, "..", "workspaces", "agent-cms-core", "awn-data");

function readParts(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return null;
  return { frontmatter: parseTypeYaml(match[1]), body: String(match[2] || "").trim() };
}

function normalizeFrontmatter(fm) {
  const out = { ...(fm || {}) };
  if (out["awn-prop-extends"]) out["awn-prop-extends"] = normalizeExtendsRef(out["awn-prop-extends"]);
  if (out["awn-extends"]) out["awn-extends"] = normalizeExtendsRef(out["awn-extends"]);
  return out;
}

function schemaFromFrontmatter(fm) {
  const raw = normalizeFrontmatter(fm);
  return {
    kind:
      raw.kind ||
      (String(raw["awn-prop-type"] || "").includes("group")
        ? "group"
        : String(raw["awn-prop-type"] || "").includes("single")
          ? "single"
          : "collection"),
    id: raw["awn-prop-id"] || raw.id || "",
    layer: raw["awn-prop-layer"] || raw.layer || "",
    name: raw["awn-prop-name"] || raw["awn-name"] || raw.name || "",
    description: raw["awn-prop-description"] || raw["awn-description"] || raw.description || "",
    extends: raw["awn-prop-extends"] || raw["awn-extends"] || raw.extends || "",
    record: raw["awn-prop-record"] || raw["awn-record"] || raw.record || {},
    fields: raw["awn-fields"] || raw.fields || {}
  };
}

function migrateDir(dir, rel = "") {
  const legacyPath = path.join(dir, STORE_MD_FILE);
  const contractPath = path.join(dir, STORE_CONTRACT_FILE);
  const manifestPath = path.join(dir, COLLECTION_MANIFEST);

  if (fs.existsSync(contractPath) && !fs.existsSync(legacyPath)) {
    return;
  }

  if (!fs.existsSync(legacyPath)) return;

  const parts = readParts(legacyPath);
  if (!parts) return;

  const schema = schemaFromFrontmatter(parts.frontmatter);
  let manifestBody = parts.body;
  if (fs.existsSync(manifestPath)) {
    const existing = fs.readFileSync(manifestPath, "utf-8").trim();
    const existingBody = existing.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)([\s\S]*)$/);
    manifestBody = existingBody ? existingBody[1].trim() : existing;
  }
  if (!manifestBody) {
    manifestBody = schema.description || schema.name || rel || path.basename(dir);
  }

  fs.writeFileSync(contractPath, buildStoreMdContent(schema), "utf-8");
  fs.writeFileSync(manifestPath, buildPlainManifestContent(schema.name, manifestBody), "utf-8");
  fs.unlinkSync(legacyPath);
  console.log(`migrated ${rel || path.basename(dir)} → manifest.store.md + manifest.md`);
}

function walk(dir, rel = "") {
  migrateDir(dir, rel || path.basename(dir));
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    walk(path.join(dir, entry.name), rel ? `${rel}/${entry.name}` : entry.name);
  }
}

if (!fs.existsSync(ROOT)) {
  console.error("awn-data root not found:", ROOT);
  process.exit(1);
}

walk(ROOT);
console.log("done");
