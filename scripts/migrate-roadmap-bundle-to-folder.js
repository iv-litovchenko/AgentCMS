#!/usr/bin/env node
/**
 * Move legacy single-file roadmap.md (awn-storage/roadmap.md) into roadmap/ folder.
 * Usage: node scripts/migrate-roadmap-bundle-to-folder.js [--dry-run] [workspaceRoot...]
 */
const fs = require("fs/promises");
const path = require("path");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const roots = args.filter((a) => a !== "--dry-run");

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".git") continue;
      await walk(full, out);
    } else if (ent.isFile() && ent.name === "roadmap.md") {
      const parent = path.basename(path.dirname(full));
      const gparent = path.basename(path.dirname(path.dirname(full)));
      if (parent === "awn-storage" || gparent === "awn-storage") {
        out.push(full);
      }
    }
  }
  return out;
}

async function migrateFile(legacyAbs) {
  const dir = path.dirname(legacyAbs);
  const targetDir = path.join(dir, "roadmap");
  const targetFile = path.join(targetDir, "roadmap.md");
  try {
    await fs.access(targetFile);
    console.log(`skip (target exists): ${targetFile}`);
    return;
  } catch {
    /* ok */
  }
  console.log(`${dryRun ? "[dry-run] " : ""}${legacyAbs} -> ${targetFile}`);
  if (dryRun) return;
  await fs.mkdir(targetDir, { recursive: true });
  await fs.rename(legacyAbs, targetFile);
}

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const scanRoots = roots.length
    ? roots.map((r) => path.resolve(r))
    : [path.join(projectRoot, "workspaces")];
  let files = [];
  for (const root of scanRoots) {
    files = files.concat(await walk(root));
  }
  files = [...new Set(files)].filter((f) => !f.includes(`${path.sep}roadmap${path.sep}roadmap.md`));
  if (!files.length) {
    console.log("No legacy awn-storage/roadmap.md files found.");
    return;
  }
  for (const file of files) await migrateFile(file);
  console.log(`Done. ${files.length} file(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
