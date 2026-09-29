#!/usr/bin/env node
/**
 * Миграция awn-tags / awn-category / awn-color → awn-taxonomy
 *
 * Usage:
 *   node scripts/migrate-to-awn-taxonomy.js [workspacePath]
 */

const fs = require("fs");
const path = require("path");
const { parseTypeYaml, formatFrontmatterEntry, mergeFrontmatterOverrides } = require("../lib/awn/awn-yaml-utils");
const {
  migrateLegacyTaxonomyFields,
  listWorkspaceTaxonomies,
  projectTaxonomyIndexFields
} = require("../lib/awn/awn-taxonomy-service");

const LEGACY_KEYS = ["awn-tags", "awn-category", "awn-color"];

function splitFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: text };
  return { frontmatter: parseTypeYaml(match[1]), body: match[2] };
}

function stringifyTaxonomyYaml(value) {
  const lines = ["awn-taxonomy:"];
  for (const [key, raw] of Object.entries(value || {})) {
    if (Array.isArray(raw)) {
      const items = raw.map((item) => String(item).trim()).filter(Boolean);
      if (!items.length) continue;
      if (items.length === 1) {
        lines.push(`  ${key}: ${JSON.stringify(items[0])}`);
      } else {
        lines.push(`  ${key}:`);
        for (const item of items) {
          lines.push(`    - ${JSON.stringify(item)}`);
        }
      }
      continue;
    }
    const scalar = String(raw ?? "").trim();
    if (scalar) lines.push(`  ${key}: ${JSON.stringify(scalar)}`);
  }
  return lines.join("\n");
}

function migrateFileContent(content, definitions) {
  const { frontmatter, body } = splitFrontmatter(content);
  const hasLegacy = LEGACY_KEYS.some((key) => frontmatter[key] !== undefined && frontmatter[key] !== "");
  const hasTaxonomy = frontmatter["awn-taxonomy"] && typeof frontmatter["awn-taxonomy"] === "object";
  if (!hasLegacy && hasTaxonomy) return null;

  const taxonomy = migrateLegacyTaxonomyFields(frontmatter, definitions);
  if (!Object.keys(taxonomy).length && !hasLegacy) return null;

  const next = { ...frontmatter, "awn-taxonomy": taxonomy };
  for (const key of LEGACY_KEYS) delete next[key];
  for (const [key, value] of Object.entries(projectTaxonomyIndexFields(taxonomy))) {
    next[key] = value;
  }

  const headerLines = [];
  for (const [key, value] of Object.entries(next)) {
    if (key === "awn-taxonomy") {
      headerLines.push(stringifyTaxonomyYaml(value));
      continue;
    }
    headerLines.push(formatFrontmatterEntry(key, value));
  }
  return `---\n${headerLines.join("\n")}\n---\n\n${body}`;
}

function walkMarkdownFiles(rootDir) {
  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(abs);
        continue;
      }
      if (!entry.name.endsWith(".md")) continue;
      files.push(abs);
    }
  }
  walk(rootDir);
  return files;
}

function main() {
  const workspacePath = path.resolve(process.argv[2] || process.cwd());
  const definitions = listWorkspaceTaxonomies(workspacePath, process.cwd());
  const files = walkMarkdownFiles(workspacePath);
  let changed = 0;

  for (const filePath of files) {
    const original = fs.readFileSync(filePath, "utf-8");
    const migrated = migrateFileContent(original, definitions);
    if (!migrated || migrated === original) continue;
    fs.writeFileSync(filePath, migrated, "utf-8");
    changed += 1;
    console.log("migrated:", path.relative(workspacePath, filePath));
  }

  console.log(`Done. Updated ${changed} file(s).`);
}

main();
