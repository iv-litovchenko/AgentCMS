#!/usr/bin/env node
/**
 * One-time migration: legacy catalog/{preset}/main.csv → awn-data/taxonomies/{preset}/main.csv
 * (catalog/ folder removed; reads from git history if needed)
 *
 *   node scripts/migrate-catalog-to-awn-data-taxonomies.js
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { getAgentCmsCoreAbsolute } = require("../platform-sources");
const { parseTypeYaml } = require("../awn-yaml-utils");
const { parseCsvText, writeCsvFromRecords } = require("../awn-data-csv");

const CORE = getAgentCmsCoreAbsolute(process.cwd());
const CATALOG = path.join(CORE, "catalog");
const AWN_DATA = path.join(CORE, "awn-data");
const TAXONOMIES = path.join(AWN_DATA, "taxonomies");
const SCHEMA_FILE = "store.yml";

const STATUS_COLORS = {
  open: "#22c55e",
  draft: "#eab308",
  closed: "#ef4444",
  none: "#94a3b8",
  archived: "#64748b",
  active: "#22c55e",
  new: "#3b82f6",
  "in-progress": "#f59e0b",
  planned: "#8b5cf6",
  done: "#059669",
  disabled: "#78716c",
  archive: "#64748b"
};

const TAGS_SCHEMA = `version: 1
kind: collection
id: taxonomies.tags
name: Теги
extends: ../../_base/store.yml
description: Справочник тегов для awn-tags

record:
  storage: csv
  file: main.csv
  id-mode: slug
  hierarchy: false

fields:
  code:
    type: awn.string
    title: Код (slug)
    required: true
  label:
    type: awn.string
    title: Подпись
    required: true
  sort:
    type: awn.integer
    title: Порядок
    default: 0
`;

function buildCollectionSchema({ id, name, description }) {
  return `version: 1
kind: collection
id: taxonomies.${id}
name: ${name}
extends: ../../_base/store.yml
description: ${description}

record:
  storage: csv
  file: main.csv
  id-mode: slug
  hierarchy: false

fields:
  code:
    type: awn.string
    title: Код
    required: true
  label:
    type: awn.string
    title: Подпись
    required: true
  emoji:
    type: awn.string
    title: Эмодзи
  color:
    type: awn.color
    title: Цвет
  sort:
    type: awn.integer
    title: Порядок
    default: 0
`;
}

function ensureCatalogCsv(preset) {
  const csvPath = path.join(CATALOG, preset, "main.csv");
  if (fs.existsSync(csvPath)) return csvPath;

  const gitPath = `workspaces/agent-cms-core/catalog/${preset}/main.csv`;
  try {
    const text = execSync(`git show HEAD:${gitPath}`, {
      cwd: path.dirname(CORE),
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"]
    });
    fs.mkdirSync(path.dirname(csvPath), { recursive: true });
    fs.writeFileSync(csvPath, text, "utf-8");
    return csvPath;
  } catch {
    throw new Error(`Catalog CSV not found: ${csvPath} (git HEAD:${gitPath} also missing)`);
  }
}

function loadCatalogCsv(preset) {
  const csvPath = ensureCatalogCsv(preset);
  return parseCsvText(fs.readFileSync(csvPath, "utf-8"));
}

function splitEmojiLabel(label) {
  const text = String(label || "").trim();
  const match = text.match(/^(\p{Extended_Pictographic}(?:\uFE0F)?)\s*(.*)$/u);
  if (!match) return { emoji: "", label: text };
  return { emoji: match[1], label: match[2].trim() || text };
}

function isSlugId(id) {
  return /^[a-z0-9][a-z0-9._-]*$/i.test(String(id || "").trim());
}

function writeSchema(storeDir, content) {
  fs.writeFileSync(path.join(storeDir, SCHEMA_FILE), content, "utf-8");
}

function writeManifest(storeDir, title, body) {
  fs.writeFileSync(path.join(storeDir, "manifest.md"), `# ${title}\n\n${body}\n`, "utf-8");
}

function writeCsvStore(storeDir, schemaYaml, records) {
  fs.mkdirSync(storeDir, { recursive: true });
  writeSchema(storeDir, schemaYaml);
  const schema = parseTypeYaml(schemaYaml);
  writeCsvFromRecords(storeDir, schema, records);

  for (const name of fs.readdirSync(storeDir)) {
    if (name.endsWith(".md") && name !== "manifest.md") {
      fs.unlinkSync(path.join(storeDir, name));
    }
  }
  const sortPath = path.join(storeDir, "sort.json");
  if (fs.existsSync(sortPath)) fs.unlinkSync(sortPath);
}

function migrateColors() {
  const storeDir = path.join(TAXONOMIES, "colors");
  const csv = loadCatalogCsv("colors");
  const records = [];
  csv.rows.forEach((cells, index) => {
    const id = String(cells[0] || "").trim();
    const label = String(cells[1] || id).trim();
    const color = String(cells[2] || "").trim();
    if (!id) return;
    records.push({
      id,
      frontmatter: { code: id, label, color, sort: (index + 1) * 10 }
    });
  });
  const schema = buildCollectionSchema({
    id: "colors",
    name: "Палитра",
    description: "Brand-цвета для awn-color"
  });
  writeCsvStore(storeDir, schema, records);
  writeManifest(storeDir, "Палитра", "Справочник цветов для `awn-color`. Данные — `main.csv`.");
  return records.length;
}

function migratePriorities() {
  const storeDir = path.join(TAXONOMIES, "priorities");
  const csv = loadCatalogCsv("priorities");
  const records = [];
  csv.rows.forEach((cells, index) => {
    const id = String(cells[0] || "").trim();
    const label = String(cells[1] || id).trim();
    if (!id) return;
    records.push({
      id,
      frontmatter: { code: id, label, sort: (index + 1) * 10 }
    });
  });
  const schema = buildCollectionSchema({
    id: "priorities",
    name: "Приоритеты",
    description: "Справочник приоритетов для awn-priority"
  });
  writeCsvStore(storeDir, schema, records);
  writeManifest(storeDir, "Приоритеты", "Справочник для `awn-priority`. Данные — `main.csv`.");
  return records.length;
}

function migrateCategories() {
  const storeDir = path.join(TAXONOMIES, "categories");
  const csv = loadCatalogCsv("categories");
  const records = [];
  csv.rows.forEach((cells, index) => {
    const id = String(cells[0] || "").trim();
    const rawLabel = String(cells[1] || id).trim();
    if (!id) return;
    const { emoji, label } = splitEmojiLabel(rawLabel);
    const fm = { code: id, label: label || rawLabel, sort: (index + 1) * 10 };
    if (emoji) fm.emoji = emoji;
    records.push({ id, frontmatter: fm });
  });
  const schema = buildCollectionSchema({
    id: "categories",
    name: "Категории",
    description: "Справочник категорий для awn-category"
  });
  writeCsvStore(storeDir, schema, records);
  writeManifest(storeDir, "Категории", "Справочник категорий для `awn-category`. Данные — `main.csv`.");
  return records.length;
}

function migrateStatuses() {
  const storeDir = path.join(TAXONOMIES, "statuses");
  const csv = loadCatalogCsv("statuses");
  const seen = new Set();
  const records = [];
  let sort = 10;

  for (const cells of csv.rows) {
    const id = String(cells[0] || "").trim();
    const rawLabel = String(cells[1] || id).trim();
    if (!id || seen.has(id)) continue;
    if (!isSlugId(id)) continue;
    seen.add(id);
    const { emoji, label } = splitEmojiLabel(rawLabel);
    const fm = {
      code: id,
      label: label || rawLabel,
      sort,
      color: STATUS_COLORS[id] || ""
    };
    if (emoji) fm.emoji = emoji;
    records.push({ id, frontmatter: fm });
    sort += 10;
  }

  const schema = buildCollectionSchema({
    id: "statuses",
    name: "Статусы",
    description: "Справочник статусов для awn-status"
  });
  writeCsvStore(storeDir, schema, records);
  writeManifest(storeDir, "Статусы", "Справочник статусов для `awn-status`. Данные — `main.csv`.");
  return records.length;
}

function migrateTags() {
  const storeDir = path.join(TAXONOMIES, "tags");
  const csv = loadCatalogCsv("tags");
  const tags = new Set();
  for (const cells of csv.rows) {
    const raw = String(cells[0] || "").trim().replace(/^#+/, "");
    if (raw) tags.add(raw);
  }
  const ids = [...tags].sort((a, b) => a.localeCompare(b, "ru"));
  const records = ids.map((id, index) => ({
    id,
    frontmatter: { code: id, label: `#${id}`, sort: (index + 1) * 10 }
  }));
  writeCsvStore(storeDir, TAGS_SCHEMA, records);
  writeManifest(
    storeDir,
    "Теги",
    "Список тегов workspace — как `#tag` в Obsidian. Поле темы: `awn-tags`. Данные — `main.csv`."
  );
  return records.length;
}

function updateRootSort() {
  const sortPath = path.join(AWN_DATA, "sort.json");
  let order = [];
  if (fs.existsSync(sortPath)) {
    try {
      order = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
    } catch {
      order = [];
    }
  }
  if (!order.includes("taxonomies")) order.push("taxonomies");
  fs.writeFileSync(sortPath, `${JSON.stringify(order, null, 2)}\n`, "utf-8");
}

function updateTaxonomiesManifest(counts) {
  const lines = [
    "# Таксономии",
    "",
    "Группировка enum-справочников платформы. Каждый **поднакопитель** — отдельная коллекция на `main.csv`.",
    "",
    "| Справочник | Записей | Поле |",
    "|------------|---------|------|"
  ];
  const rows = [
    ["tags", counts.tags, "`awn-tags`"],
    ["categories", counts.categories, "`awn-category`"],
    ["statuses", counts.statuses, "`awn-status`"],
    ["priorities", counts.priorities, "`awn-priority`"],
    ["colors", counts.colors, "`awn-color`"]
  ];
  for (const [name, count, field] of rows) {
    lines.push(`| [${name}/](./${name}/manifest.md) | ${count} | ${field} |`);
  }
  lines.push("", "Источник: `catalog/*/main.csv` → `awn-data/taxonomies/*/main.csv`.");
  fs.writeFileSync(path.join(TAXONOMIES, "manifest.md"), `${lines.join("\n")}\n`, "utf-8");
}

const counts = {
  colors: migrateColors(),
  priorities: migratePriorities(),
  categories: migrateCategories(),
  statuses: migrateStatuses(),
  tags: migrateTags()
};

updateRootSort();
updateTaxonomiesManifest(counts);

console.log("Migrated taxonomies to awn-data (main.csv):");
for (const [preset, count] of Object.entries(counts)) {
  console.log(`  ${preset}: ${count} rows`);
}
