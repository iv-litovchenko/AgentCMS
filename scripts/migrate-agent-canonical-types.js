#!/usr/bin/env node
/**
 * Migrate legacy awn-type values to canonical ids in an agent workspace.
 *
 *   node scripts/migrate-agent-canonical-types.js agent-cms-test
 *   node scripts/migrate-agent-canonical-types.js agent-cms-test --dry-run
 */
const fs = require("fs");
const path = require("path");

const TEXT_EXTENSIONS = new Set([
  ".md",
  ".mdback",
  ".txt",
  ".yml",
  ".yaml",
  ".csv",
  ".json"
]);

/** Longest match first */
const AWN_TYPE_REPLACEMENTS = [
  ["awn-type: awn.record.category", "awn-type: awn.content.record.category"],
  ["awn-type: awn.media.category", "awn-type: awn.content.media.category"],
  ["awn-type: awn.workspace", "awn-type: awn.page.ws"],
  ["awn-type: awn.record", "awn-type: awn.content.record"],
  ["awn-type: awn.sidecar", "awn-type: awn.content.sidecar"],
  ["awn-type: awn.area", "awn-type: awn.page.area"],
  ["awn-type: awn.topic", "awn-type: awn.page.topic"],
  ["awn-type: service-doc", "awn-type: awn.page.service-doc"],
  ["awn-type: catalog", "awn-type: awn.page.catalog"]
];

const DOC_REPLACEMENTS = [
  ["| `awn.record.category` |", "| `awn.content.record.category` |"],
  ["| `awn.media.category` |", "| `awn.content.media.category` |"],
  ["| `awn.workspace` |", "| `awn.page.ws` |"],
  ["| `awn.area` |", "| `awn.page.area` |"],
  ["| `awn.topic` |", "| `awn.page.topic` |"],
  ["| `awn.record` |", "| `awn.content.record` |"],
  ["| `awn.sidecar` |", "| `awn.content.sidecar` |"],
  ["→ `awn.page.ws` → `awn.page.area` → `awn.page.topic`", "→ `awn.page.ws` → `awn.page.area` → `awn.page.topic`"],
  ["`awn-type: awn.topic`", "`awn-type: awn.page.topic`"],
  ["`awn-type: awn.area`", "`awn-type: awn.page.area`"],
  ["`awn-type: awn.record`", "`awn-type: awn.content.record`"],
  ["`awn-type: awn.sidecar`", "`awn-type: awn.content.sidecar`"],
  ["`awn-type: awn.workspace`", "`awn-type: awn.page.ws`"],
  ["`awn.content.record`", "`awn.content.record`"],
  ["awn.page.topic` + `awn.page.area` + `awn.page.topic`", "awn.page.ws` + `awn.page.area` + `awn.page.topic`"]
];

function shouldScanFile(filePath) {
  const base = path.basename(filePath);
  if (base.startsWith(".")) return false;
  const ext = path.extname(base).toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
    else if (shouldScanFile(full)) acc.push(full);
  }
  return acc;
}

function migrateContent(content) {
  let next = content;
  let changed = false;
  for (const [from, to] of AWN_TYPE_REPLACEMENTS) {
    if (next.includes(from)) {
      next = next.split(from).join(to);
      changed = true;
    }
  }
  return { content: next, changed };
}

function migrateDocContent(content) {
  let next = content;
  let changed = false;
  for (const [from, to] of DOC_REPLACEMENTS) {
    if (from === to) continue;
    if (next.includes(from)) {
      next = next.split(from).join(to);
      changed = true;
    }
  }
  return { content: next, changed };
}

function main() {
  const agentId = process.argv[2] || "agent-cms-test";
  const dryRun = process.argv.includes("--dry-run");
  const repoRoot = path.join(__dirname, "..");
  const agentRoot = path.join(repoRoot, "workspaces", agentId);

  if (!fs.existsSync(agentRoot)) {
    console.error(`Agent not found: ${agentRoot}`);
    process.exit(1);
  }

  const files = walkFiles(agentRoot);
  const stats = { scanned: files.length, updated: 0, byType: {} };

  for (const filePath of files) {
    const rel = path.relative(agentRoot, filePath).replace(/\\/g, "/");
    const raw = fs.readFileSync(filePath, "utf-8");
    let result = migrateContent(raw);
    if (rel.startsWith("AGENTS.md") || rel.startsWith("awn-system/")) {
      const docResult = migrateDocContent(result.content);
      if (docResult.changed) result = { content: docResult.content, changed: true };
    }
    if (!result.changed) continue;

    for (const [from] of AWN_TYPE_REPLACEMENTS) {
      if (raw.includes(from)) {
        const key = from.replace("awn-type: ", "");
        stats.byType[key] = (stats.byType[key] || 0) + 1;
      }
    }

    if (!dryRun) fs.writeFileSync(filePath, result.content, "utf-8");
    stats.updated += 1;
  }

  const registryPath = path.join(agentRoot, "awn-system", "registry.yml");
  if (fs.existsSync(registryPath) && !dryRun) {
    let reg = fs.readFileSync(registryPath, "utf-8");
    if (!reg.includes("canonical-types:")) {
      reg += `\ncanonical-types: migrated\nmigration-date: "2026-07-05"\n`;
      fs.writeFileSync(registryPath, reg, "utf-8");
    }
  }

  console.log(dryRun ? "[dry-run]" : "[done]", JSON.stringify(stats, null, 2));
}

main();
