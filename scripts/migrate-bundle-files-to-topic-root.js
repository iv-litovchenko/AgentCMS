#!/usr/bin/env node
/**
 * Move bundle files from {topic}/awn-storage/ to {topic}/ (next to manifest.md):
 * main.md, main.csv, todo.md, config.yml, .env (+ legacy memory/content names)
 */
const fs = require("fs/promises");
const path = require("path");
const { listBundleFileNameCandidates, BUNDLE_MAIN_FILE, BUNDLE_TABULAR_FILE, BUNDLE_TODO_FILE, BUNDLE_CONFIG_FILE, ROOT_SYSTEM_TODO_FILE } = require("../manifest-paths");

const ROOT = path.resolve(__dirname, "..");
const WORKSPACES = [
  path.join(ROOT, "workspaces/agent-cms-core"),
  path.join(ROOT, "workspaces/agent-cms-test")
];

const STORAGE_ROOT = "awn-storage";

const BUNDLE_BASENAMES = new Set(
  [
    ...listBundleFileNameCandidates(BUNDLE_MAIN_FILE),
    ...listBundleFileNameCandidates(BUNDLE_TABULAR_FILE),
    ...listBundleFileNameCandidates(BUNDLE_TODO_FILE),
    ...listBundleFileNameCandidates(BUNDLE_CONFIG_FILE),
    ...listBundleFileNameCandidates(ROOT_SYSTEM_TODO_FILE),
    "body.md",
    ".env"
  ].map((name) => name.toLowerCase())
);

function isBundleBasename(name) {
  return BUNDLE_BASENAMES.has(String(name || "").toLowerCase());
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

async function moveBundleFile(from, to) {
  if (!(await pathExists(from))) return false;
  if (await pathExists(to)) {
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
    if (!entry.isFile()) continue;
    if (!isBundleBasename(entry.name)) continue;
    const from = path.join(serviceDir, entry.name);
    let targetName = entry.name;
    if (targetName.toLowerCase() === "configuration.yml") {
      targetName = "config.yml";
    }
    const to = path.join(topicDir, targetName);
    if (await moveBundleFile(from, to)) moved += 1;
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
  console.log(`\nDone: ${total} file(s) moved.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
