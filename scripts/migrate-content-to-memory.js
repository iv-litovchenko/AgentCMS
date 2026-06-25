#!/usr/bin/env node
/**
 * Rename legacy memory storage paths in workspaces:
 *   content/     -> memory/
 *   content.md   -> memory.md
 *   content.csv  -> memory.csv
 *   history/content* version dirs likewise
 */
const fs = require("fs/promises");
const path = require("path");

const WORKSPACES = [
  path.join(__dirname, "../workspaces/agent-cms-core"),
  path.join(__dirname, "../workspaces/agent-cms-test")
];

const SKIP_DIRS = new Set([".git", "node_modules"]);

function shouldRenameDirName(name, parentName) {
  if (name === "content") {
    return parentName === "awn-storage" || parentName === "storage" || parentName === "history";
  }
  if (name === "content.md" || name === "content.csv") {
    return parentName === "history" || parentName.endsWith("-storage") || parentName === "storage";
  }
  return false;
}

function targetDirName(name) {
  if (name === "content") return "memory";
  if (name === "content.md") return "memory.md";
  if (name === "content.csv") return "memory.csv";
  return name;
}

function targetFileName(name) {
  if (name === "content.md") return "memory.md";
  if (name === "content.csv") return "memory.csv";
  return name;
}

async function collectRenames(root) {
  const renames = [];

  async function walk(current, parentName = "") {
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (shouldRenameDirName(entry.name, parentName)) {
          renames.push({
            from: full,
            to: path.join(path.dirname(full), targetDirName(entry.name))
          });
        }
        await walk(full, entry.name);
      } else if (entry.isFile()) {
        const nextName = targetFileName(entry.name);
        if (nextName !== entry.name) {
          renames.push({
            from: full,
            to: path.join(path.dirname(full), nextName)
          });
        }
      }
    }
  }

  await walk(root);
  renames.sort((a, b) => b.from.split(path.sep).length - a.from.split(path.sep).length);
  return renames;
}

async function applyRenames(renames) {
  let applied = 0;
  for (const { from, to } of renames) {
    try {
      await fs.access(from);
    } catch {
      continue;
    }
    try {
      await fs.access(to);
      console.warn(`SKIP (target exists): ${to}`);
      continue;
    } catch {
      // target missing — ok
    }
    await fs.rename(from, to);
    console.log(`RENAMED ${from} -> ${to}`);
    applied += 1;
  }
  return applied;
}

async function patchTextFiles(root) {
  const replacements = [
    [/awn-storage\/content\//g, "awn-storage/memory/"],
    [/storage\/content\//g, "storage/memory/"],
    [/\/content\.md\b/g, "/memory.md"],
    [/\/content\.csv\b/g, "/memory.csv"],
    [/`content\.md`/g, "`memory.md`"],
    [/`content\.csv`/g, "`memory.csv`"],
    [/\bcontent\.md\b/g, "memory.md"],
    [/\bcontent\.csv\b/g, "memory.csv"]
  ];
  let filesPatched = 0;

  async function walk(current) {
    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
        continue;
      }
      if (!/\.(md|yml|yaml|json|txt|csv)$/i.test(entry.name)) continue;
      let raw = "";
      try {
        raw = await fs.readFile(full, "utf-8");
      } catch {
        continue;
      }
      let next = raw;
      for (const [pattern, replacement] of replacements) {
        next = next.replace(pattern, replacement);
      }
      if (next !== raw) {
        await fs.writeFile(full, next, "utf-8");
        console.log(`PATCHED ${full}`);
        filesPatched += 1;
      }
    }
  }

  await walk(root);
  return filesPatched;
}

async function main() {
  let totalRenames = 0;
  let totalPatches = 0;
  for (const workspace of WORKSPACES) {
    console.log(`\n=== ${workspace} ===`);
    const renames = await collectRenames(workspace);
    totalRenames += await applyRenames(renames);
    totalPatches += await patchTextFiles(workspace);
  }
  console.log(`\nDone: ${totalRenames} renames, ${totalPatches} text files patched.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
