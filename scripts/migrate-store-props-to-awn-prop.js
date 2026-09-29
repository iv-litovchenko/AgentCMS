#!/usr/bin/env node
/**
 * Migrate _store.md to awn-prop-* props and awn-* field keys; update records + CSV.
 */
const fs = require("fs");
const path = require("path");
const { parseTypeYaml } = require("../lib/awn/awn-yaml-utils");
const {
  buildStoreMdContent,
  loadMergedStoreSchema,
  toAwnFieldKey,
  STORE_MD_FILE
} = require("../lib/awn/awn-data-loader");
const { parseCsvText, serializeCsv } = require("../lib/awn/awn-data-csv");

const ROOT = path.join(__dirname, "..", "workspaces", "agent-cms-core", "awn-data");
const SKIP_FILES = new Set(["_store.md", "manifest.md", "main.md"].map((s) => s.toLowerCase()));

function readStoreParts(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return null;
  return { frontmatter: parseTypeYaml(match[1]), body: String(match[2] || "").trim() };
}

function migrateStoreMd(dir, rel) {
  const storePath = path.join(dir, STORE_MD_FILE);
  if (!fs.existsSync(storePath)) return null;

  const merged = loadMergedStoreSchema(dir);
  if (!merged) return null;

  const parts = readStoreParts(storePath);
  const body = parts?.body || merged._storeBody || "";
  const next = buildStoreMdContent(
    {
      kind: merged.kind,
      id: merged.id,
      layer: merged.layer,
      name: merged.name,
      description: merged.description,
      extends: merged.extends,
      record: merged.record,
      fields: merged.fields
    },
    body
  );
  fs.writeFileSync(storePath, next, "utf-8");
  console.log(`store ${rel || path.basename(dir)}`);
  return merged;
}

function renameFrontmatterKeys(frontmatter, fieldMap) {
  const out = {};
  for (const [key, value] of Object.entries(frontmatter || {})) {
    const nextKey = fieldMap.get(key) || toAwnFieldKey(key);
    if (out[nextKey] === undefined || out[nextKey] === "") out[nextKey] = value;
  }
  return out;
}

function serializeFrontmatter(fm) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(fm)) {
    if (value === undefined || value === null) continue;
    const text = String(value);
    if (/[:#\n[\]{}]|^\s/.test(text) || text === "") {
      lines.push(`${key}: ${JSON.stringify(text)}`);
    } else {
      lines.push(`${key}: ${text}`);
    }
  }
  lines.push("---");
  return lines.join("\n");
}

function migrateRecordFile(filePath, fieldMap) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return false;

  let frontmatter;
  try {
    frontmatter = parseTypeYaml(match[1]);
  } catch {
    return false;
  }

  const body = match[2];
  const nextFm = renameFrontmatterKeys(frontmatter, fieldMap);
  const changed = JSON.stringify(frontmatter) !== JSON.stringify(nextFm);
  if (!changed) return false;

  fs.writeFileSync(filePath, `${serializeFrontmatter(nextFm)}\n${body}`, "utf-8");
  return true;
}

function buildFieldRenameMap(schema) {
  const map = new Map();
  for (const key of Object.keys(schema?.fields || {})) {
    const plain = key.startsWith("awn-") ? key.slice(4) : key;
    map.set(plain, toAwnFieldKey(key));
    map.set(key, toAwnFieldKey(key));
  }
  map.set("id", "awn-id");
  map.set("created", "awn-created");
  map.set("updated", "awn-updated");
  map.set("title", "awn-title");
  map.set("parent", "awn-parent");
  map.set("name", "awn-name");
  map.set("label", "awn-label");
  map.set("code", "awn-code");
  return map;
}

function migrateCsvFile(csvPath, fieldMap) {
  if (!fs.existsSync(csvPath)) return;
  const { columns, rows } = parseCsvText(fs.readFileSync(csvPath, "utf-8"));
  if (!columns.length) return;
  const nextCols = columns.map((col) => fieldMap.get(String(col).trim()) || toAwnFieldKey(col));
  if (nextCols.join(",") === columns.join(",")) return;
  fs.writeFileSync(csvPath, serializeCsv(nextCols, rows), "utf-8");
  console.log(`  csv ${path.basename(csvPath)}`);
}

function migrateRecordsInDir(dir, schema, rel) {
  if (!schema || schema.kind === "group") return;
  const fieldMap = buildFieldRenameMap(schema);
  let count = 0;

  if (schema.record?.storage === "csv" || String(schema.record?.file || "").endsWith(".csv")) {
    const csvFile = String(schema.record?.file || "main.csv");
    migrateCsvFile(path.join(dir, csvFile), fieldMap);
    return;
  }

  const walk = (currentDir) => {
    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith(".md")) continue;
      if (SKIP_FILES.has(entry.name.toLowerCase())) continue;
      if (migrateRecordFile(full, fieldMap)) count += 1;
    }
  };

  walk(dir);
  if (count) console.log(`  records ${rel}: ${count}`);
}

function walkStores(dir, rel = "") {
  const schema = migrateStoreMd(dir, rel || path.basename(dir));
  if (schema) migrateRecordsInDir(dir, schema, rel || path.basename(dir));

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const childRel = rel ? `${rel}/${entry.name}` : entry.name;
    walkStores(path.join(dir, entry.name), childRel);
  }
}

if (!fs.existsSync(ROOT)) {
  console.error("awn-data root not found:", ROOT);
  process.exit(1);
}

walkStores(ROOT);
console.log("done");
