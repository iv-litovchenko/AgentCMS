#!/usr/bin/env node
/**
 * Rename memory bundle paths to main:
 *   memory.md   -> main.md
 *   memory.csv  -> main.csv
 *   memory/     -> main/
 * Also rewrites text references in workspace/docs files.
 */
const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".cursor"]);

const TEXT_REPLACEMENTS = [
  [/awn-storage\/memory\//g, "awn-storage/main/"],
  [/storage\/memory\//g, "storage/main/"],
  [/awn-storage\/memory\.md/g, "awn-storage/main.md"],
  [/awn-storage\/memory\.csv/g, "awn-storage/main.csv"],
  [/\/memory\.md\b/g, "/main.md"],
  [/\/memory\.csv\b/g, "/main.csv"],
  [/`memory\.md`/g, "`main.md`"],
  [/`memory\.csv`/g, "`main.csv`"],
  [/\bmemory\.md\b/g, "main.md"],
  [/\bmemory\.csv\b/g, "main.csv"],
  [/\.memory\.md\b/g, ".main.md"],
  [/\.memory\.csv\b/g, ".main.csv"],
  [/_.node\.memory\.md/g, "_.node.main.md"],
  [/_.node\.memory\.csv/g, "_.node.main.csv"],
  [/_.x\.memory\.md/g, "_.x.main.md"],
  [/_.x\.memory\.csv/g, "_.x.main.csv"],
  [/\(memory\/\)/g, "(main/)"],
  [/ memory\//g, " main/"]
];

function shouldSkipDir(name) {
  return SKIP_DIRS.has(name);
}

async function walk(dir, visitor) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (shouldSkipDir(entry.name)) continue;
      await visitor(full, entry);
      await walk(full, visitor);
    } else {
      await visitor(full, entry);
    }
  }
}

function renameTargetName(name) {
  if (name === "memory.md") return "main.md";
  if (name === "memory.csv") return "main.csv";
  if (name === "memory") return "main";
  return null;
}

async function collectRenameTargets() {
  const targets = [];
  await walk(ROOT, async (full, entry) => {
    const next = renameTargetName(entry.name);
    if (!next) return;
    const parent = path.dirname(full);
    const dest = path.join(parent, next);
    targets.push({ from: full, to: dest, depth: full.split(path.sep).length });
  });
  targets.sort((a, b) => b.depth - a.depth);
  return targets;
}

async function renamePaths(targets, { dryRun }) {
  for (const { from, to } of targets) {
    try {
      await fs.access(to);
      console.warn(`skip (exists): ${path.relative(ROOT, to)}`);
      continue;
    } catch {
      // ok
    }
    const relFrom = path.relative(ROOT, from);
    const relTo = path.relative(ROOT, to);
    console.log(`${dryRun ? "[dry] " : ""}${relFrom} -> ${relTo}`);
    if (!dryRun) await fs.rename(from, to);
  }
}

async function rewriteTextFiles({ dryRun }) {
  const exts = new Set([".md", ".yml", ".yaml", ".js", ".json", ".csv", ".txt"]);
  await walk(ROOT, async (full, entry) => {
    if (!entry.isFile()) return;
    if (!exts.has(path.extname(entry.name).toLowerCase())) return;
    if (entry.name === "migrate-memory-to-main.js" || entry.name === "manifest-paths.js") return;
    const original = await fs.readFile(full, "utf8");
    let next = original;
    for (const [pattern, replacement] of TEXT_REPLACEMENTS) {
      next = next.replace(pattern, replacement);
    }
    if (next === original) return;
    console.log(`${dryRun ? "[dry] rewrite " : "rewrite "}${path.relative(ROOT, full)}`);
    if (!dryRun) await fs.writeFile(full, next, "utf8");
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const targets = await collectRenameTargets();
  console.log(`Found ${targets.length} rename target(s).`);
  await renamePaths(targets, { dryRun });
  await rewriteTextFiles({ dryRun });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
