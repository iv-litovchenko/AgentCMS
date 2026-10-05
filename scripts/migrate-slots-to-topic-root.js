#!/usr/bin/env node
/**
 * Move topic content from {topic}/awn-storage/ to {topic}/ root.
 * Keeps in awn-storage/ only:
 *   assets/, history/, configuration/
 * Bundle files (main.md, main.csv, todo.md, config.yml, .env) live next to manifest.md.
 */
const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const WORKSPACES = [
  path.join(ROOT, "workspaces/agent-cms-core"),
  path.join(ROOT, "workspaces/agent-cms-test")
];

const STORAGE_ROOT = "awn-storage";

const KEEP_IN_SERVICE = new Set([
  "assets",
  "history",
  "configuration",
  ".ds_store"
]);

function shouldKeepInService(name) {
  return KEEP_IN_SERVICE.has(String(name || "").toLowerCase());
}

async function walkManifests(dir, acc = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkManifests(full, acc);
      continue;
    }
    if (entry.isFile() && entry.name === "manifest.md") {
      acc.push(full);
    }
  }
  return acc;
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function mergeDirectoryContents(fromDir, toDir) {
  const entries = await fs.readdir(fromDir, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(fromDir, entry.name);
    const to = path.join(toDir, entry.name);
    if (entry.isDirectory()) {
      if (!(await pathExists(to))) {
        await fs.rename(from, to);
        continue;
      }
      await mergeDirectoryContents(from, to);
      await fs.rmdir(from).catch(() => {});
      continue;
    }
    if (!(await pathExists(to))) {
      await fs.rename(from, to);
    }
  }
}

async function moveEntry(from, to) {
  if (!(await pathExists(from))) return false;

  if (await pathExists(to)) {
    const fromStat = await fs.stat(from);
    const toStat = await fs.stat(to);
    if (fromStat.isDirectory() && toStat.isDirectory()) {
      await mergeDirectoryContents(from, to);
      await fs.rmdir(from).catch(async () => {
        await fs.rm(from, { recursive: true, force: true });
      });
      console.log(`merged ${from} -> ${to}`);
      return true;
    }
    console.warn(`skip (exists): ${to}`);
    return false;
  }

  await fs.rename(from, to);
  console.log(`moved ${from} -> ${to}`);
  return true;
}

async function migrateTopic(manifestAbsolute) {
  const topicDir = path.dirname(manifestAbsolute);
  const serviceDir = path.join(topicDir, STORAGE_ROOT);
  if (!(await pathExists(serviceDir))) return 0;

  let moved = 0;
  const entries = await fs.readdir(serviceDir, { withFileTypes: true });
  for (const entry of entries) {
    if (shouldKeepInService(entry.name)) continue;
    const from = path.join(serviceDir, entry.name);
    const to = path.join(topicDir, entry.name);
    if (await moveEntry(from, to)) moved += 1;
  }
  return moved;
}

async function main() {
  let total = 0;
  for (const workspace of WORKSPACES) {
    console.log(`\n=== ${path.basename(workspace)} ===`);
    const manifests = await walkManifests(workspace, []);
    for (const manifest of manifests) {
      total += await migrateTopic(manifest);
    }
  }
  console.log(`\nDone: ${total} path(s) moved/merged.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
