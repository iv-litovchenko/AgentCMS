#!/usr/bin/env node
/**
 * Migrate awn-system/presets/*.yml → awn-data/system-presets/{slug}.md
 *
 *   node scripts/migrate-presets-to-awn-data.js
 */
const fs = require("fs");
const path = require("path");
const { loadYamlFileSync } = require("../lib/awn/awn-yaml-utils");
const { getAgentCmsCoreAbsolute } = require("../lib/platform/platform-sources");

const CORE = getAgentCmsCoreAbsolute(process.cwd());
const LEGACY_DIR = path.join(CORE, "awn-system", "presets");
const STORE_DIR = path.join(CORE, "awn-data", "system-presets");
const AWN_DATA_SORT = path.join(CORE, "awn-data", "sort.json");

function yamlQuote(value) {
  const text = String(value ?? "").trim();
  if (!text) return '""';
  if (/[:#\[\]{}&*!|>'"%@`]/.test(text) || text.includes("\n")) {
    return JSON.stringify(text);
  }
  return JSON.stringify(text);
}

function readLegacyPresets() {
  const sortPath = path.join(LEGACY_DIR, "sort.yml");
  let sortOrder = [];
  if (fs.existsSync(sortPath)) {
    try {
      const parsed = loadYamlFileSync(sortPath);
      sortOrder = Array.isArray(parsed?.sortOrder)
        ? parsed.sortOrder.map((item) => String(item).trim()).filter(Boolean)
        : [];
    } catch {
      sortOrder = [];
    }
  }

  const files = fs
    .readdirSync(LEGACY_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.ya?ml$/i.test(entry.name) && entry.name !== "sort.yml")
    .map((entry) => path.join(LEGACY_DIR, entry.name));

  const bySlug = new Map();
  for (const filePath of files) {
    const parsed = loadYamlFileSync(filePath);
    if (!parsed) continue;
    const slug = path.basename(filePath).replace(/\.ya?ml$/i, "");
    const body = String(parsed.body || "").trim();
    const targetFile = String(parsed["target-file"] || parsed.targetFile || "").trim();
    if (!body || !targetFile) continue;
    bySlug.set(slug, { slug, parsed, body });
  }

  const ordered = [];
  const seen = new Set();
  for (const slug of sortOrder) {
    if (!bySlug.has(slug)) continue;
    ordered.push(bySlug.get(slug));
    seen.add(slug);
  }
  for (const item of bySlug.values()) {
    if (!seen.has(item.slug)) ordered.push(item);
  }
  return ordered;
}

function buildManifest() {
  return [
    "---",
    "awn-supertype: awn-data/cms-base/data-containers/collection.md",
    "awn-name: Пресеты",
    "",
    "awn-record-id-mode: slug",
    'awn-record-file: "{id}.md"',
    "awn-record-hierarchy: false",
    "",
    "awn-data-elements-schema-extends: awn-data/cms-base/data-elements/default.md",
    "awn-data-elements-schema-mixins: []",
    "awn-data-elements-schema:",
    "  fields:",
    "    awn-title:",
    "      type: awn.string",
    "      title: Название",
    "      required: true",
    "      tab: main",
    "    awn-preset-id:",
    "      type: awn.string",
    "      title: ID пресета",
    "      required: true",
    "      tab: main",
    "    awn-target-file:",
    "      type: awn.string",
    "      title: Целевой файл",
    "      required: true",
    "      tab: main",
    "    awn-hint-title:",
    "      type: awn.string",
    "      title: Подсказка — заголовок",
    "      tab: main",
    "    awn-hint-text:",
    "      type: awn.string",
    "      title: Подсказка — текст",
    "      tab: main",
    "    awn-status:",
    "      type: awn.field.choice.one",
    "      title: Статус",
    "      enum: [active, draft, deprecated, inactive]",
    "      default: active",
    "      tab: main",
    "    awn-sort:",
    "      type: awn.number",
    "      title: Порядок",
    "      default: 0",
    "      tab: main",
    "  tabs:",
    "    main: Пресет",
    "---",
    "# Пресеты",
    "",
    "Store id = **awn-data/system-presets**.",
    "",
    "Заготовки содержимого системных файлов workspace (.env, SKILL.md, AGENTS.md, промпты Shell).",
    "",
    "Используются UI «Вставить шаблон» и API GET /api/system-file-templates.",
    ""
  ].join("\n");
}

function buildRecord({ slug, parsed, body }) {
  const id = String(parsed.id || `awn.preset.${slug}`).trim();
  const title = String(parsed.name || parsed.title || slug).trim();
  const targetFile = String(parsed["target-file"] || parsed.targetFile || "").trim();
  const hintTitle = String(parsed["hint-title"] || parsed.hintTitle || title).trim();
  const hintText = String(parsed["hint-text"] || parsed.hintText || "").trim();
  const status = String(parsed.status || "active").trim();
  const sort = Number(parsed.sort) || 0;

  const fm = [
    "---",
    "awn-supertype: awn-data/system-presets/manifest.md",
    `awn-title: ${yamlQuote(title)}`,
    `awn-preset-id: ${yamlQuote(id)}`,
    `awn-target-file: ${yamlQuote(targetFile)}`,
    `awn-hint-title: ${yamlQuote(hintTitle)}`,
    `awn-hint-text: ${yamlQuote(hintText)}`,
    `awn-status: ${status}`,
    `awn-sort: ${sort}`,
    "---",
    ""
  ].join("\n");

  return `${fm}${body}\n`;
}

function ensureRootSort() {
  if (!fs.existsSync(AWN_DATA_SORT)) return;
  const sort = JSON.parse(fs.readFileSync(AWN_DATA_SORT, "utf-8"));
  if (!Array.isArray(sort) || sort.includes("system-presets")) return;
  const settingsIdx = sort.indexOf("settings");
  if (settingsIdx >= 0) sort.splice(settingsIdx + 1, 0, "system-presets");
  else sort.unshift("system-presets");
  fs.writeFileSync(AWN_DATA_SORT, `${JSON.stringify(sort, null, 2)}\n`, "utf-8");
}

function main() {
  const presets = readLegacyPresets();
  if (!presets.length) {
    console.error("No legacy presets found in", LEGACY_DIR);
    process.exit(1);
  }

  fs.mkdirSync(STORE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STORE_DIR, "manifest.md"), buildManifest(), "utf-8");
  fs.writeFileSync(
    path.join(STORE_DIR, "sort.json"),
    `${JSON.stringify(presets.map((item) => item.slug), null, 2)}\n`,
    "utf-8"
  );

  for (const item of presets) {
    fs.writeFileSync(path.join(STORE_DIR, `${item.slug}.md`), buildRecord(item), "utf-8");
    console.log(`  ${item.slug}.md`);
  }

  ensureRootSort();
  console.log(`Migrated ${presets.length} presets → awn-data/system-presets/`);
}

main();
