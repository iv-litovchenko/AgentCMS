#!/usr/bin/env node
/**
 * Migrate awn-data/taxonomies/* from {id}.md records to main.csv
 *
 *   node scripts/migrate-taxonomies-md-to-csv.js
 */
const fs = require("fs");
const path = require("path");
const { getAgentCmsCoreAbsolute } = require("../platform-sources");
const { parseTypeYaml } = require("../awn-yaml-utils");
const { serializeCsv, getCsvColumnsFromSchema, writeCsvFromRecords } = require("../awn-data-csv");

const CORE = getAgentCmsCoreAbsolute(process.cwd());
const TAXONOMIES = path.join(CORE, "awn-data", "taxonomies");
const SCHEMA_FILE = "store.yml";

function splitFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return {};
  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const key = trimmed.slice(0, colon).trim();
    frontmatter[key] = trimmed.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
  }
  return frontmatter;
}

function loadMdRecords(storeDir) {
  const records = [];
  for (const name of fs.readdirSync(storeDir)) {
    if (!name.endsWith(".md") || name === "manifest.md") continue;
    const fm = splitFrontmatter(fs.readFileSync(path.join(storeDir, name), "utf-8"));
    const id = fm.id || name.replace(/\.md$/i, "");
    records.push({ id, frontmatter: { ...fm, code: fm.code || id } });
  }
  return records;
}

function updateSchemaToCsv(schemaPath) {
  let raw = fs.readFileSync(schemaPath, "utf-8");
  if (/^\s*storage:\s*csv/m.test(raw.split("record:")[1] || "")) return false;
  raw = raw.replace(
    /record:\s*\n(?:  .+\n)*?(?=fields:|\Z)/m,
    `record:
  storage: csv
  file: main.csv
  id-mode: slug
  hierarchy: false

`
  );
  raw = raw.replace(/\n  file: "\{id\}\.md"\n/, "\n");
  fs.writeFileSync(schemaPath, raw, "utf-8");
  return true;
}

const presets = fs
  .readdirSync(TAXONOMIES, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .filter((name) => fs.existsSync(path.join(TAXONOMIES, name, SCHEMA_FILE)));

for (const preset of presets) {
  const storeDir = path.join(TAXONOMIES, preset);
  const schemaPath = path.join(storeDir, SCHEMA_FILE);
  const schema = parseTypeYaml(fs.readFileSync(schemaPath, "utf-8"));
  const records = loadMdRecords(storeDir);

  if (records.length) {
    writeCsvFromRecords(storeDir, schema, records);
  } else if (!fs.existsSync(path.join(storeDir, "main.csv"))) {
    const columns = getCsvColumnsFromSchema(schema);
    fs.writeFileSync(path.join(storeDir, "main.csv"), serializeCsv(columns, []), "utf-8");
  }

  updateSchemaToCsv(schemaPath);

  for (const name of fs.readdirSync(storeDir)) {
    if (name.endsWith(".md") && name !== "manifest.md") {
      fs.unlinkSync(path.join(storeDir, name));
    }
  }

  const sortPath = path.join(storeDir, "sort.json");
  if (fs.existsSync(sortPath)) fs.unlinkSync(sortPath);

  const csvLines = fs.existsSync(path.join(storeDir, "main.csv"))
    ? fs.readFileSync(path.join(storeDir, "main.csv"), "utf-8").trim().split("\n").length - 1
    : 0;
  console.log(`${preset}: ${csvLines} rows in main.csv`);
}
