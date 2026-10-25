#!/usr/bin/env node
/**
 * Rename awn-storage/roadmap/ -> atlas/ and legacy roadmap.md -> atlas/roadmap.md
 * Usage: node scripts/migrate-roadmap-folder-to-atlas.js [--dry-run] [workspaceRoot...]
 */
const fs = require("fs/promises");
const path = require("path");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const roots = args.filter((a) => a !== "--dry-run");

async function walkStorageRoots(dir, out = []) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "awn-storage") out.push(full);
      else if (ent.name !== "node_modules" && ent.name !== ".git") await walkStorageRoots(full, out);
    }
  }
  return out;
}

async function migrateStorageRoot(storageRoot) {
  const legacyDir = path.join(storageRoot, "roadmap");
  const targetDir = path.join(storageRoot, "atlas");
  const legacyFile = path.join(storageRoot, "roadmap.md");

  try {
    await fs.access(legacyDir);
    try {
      await fs.access(targetDir);
      console.log(`skip folder (atlas exists): ${targetDir}`);
    } catch {
      console.log(`${dryRun ? "[dry-run] " : ""}rename ${legacyDir} -> ${targetDir}`);
      if (!dryRun) await fs.rename(legacyDir, targetDir);
    }
  } catch {
    /* no roadmap dir */
  }

  try {
    await fs.access(legacyFile);
    await fs.mkdir(targetDir, { recursive: true });
    const dest = path.join(targetDir, "roadmap.md");
    try {
      await fs.access(dest);
      console.log(`skip file (exists): ${dest}`);
    } catch {
      console.log(`${dryRun ? "[dry-run] " : ""}${legacyFile} -> ${dest}`);
      if (!dryRun) await fs.rename(legacyFile, dest);
    }
  } catch {
    /* no legacy bundle */
  }
}

async function main() {
  const projectRoot = path.resolve(__dirname, "..");
  const scanRoots = roots.length
    ? roots.map((r) => path.resolve(r))
    : [path.join(projectRoot, "workspaces")];
  const storageRoots = [];
  for (const root of scanRoots) {
    storageRoots.push(...(await walkStorageRoots(root)));
  }
  const unique = [...new Set(storageRoots)];
  if (!unique.length) {
    console.log("No awn-storage folders found.");
    return;
  }
  for (const sr of unique) await migrateStorageRoot(sr);
  console.log(`Done. ${unique.length} storage root(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
