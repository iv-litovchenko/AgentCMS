#!/usr/bin/env node
/**
 * Rename workspace folder awn-data → awn-databases and update path references in text files.
 *
 * Usage:
 *   node scripts/migrate-awn-data-to-awn-databases.js
 *   node scripts/migrate-awn-data-to-awn-databases.js workspaces/agent-cms-test
 */
const fs = require("fs/promises");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const LEGACY = "awn-data";
const TARGET = "awn-databases";
const TEXT_EXT = new Set([
  ".md",
  ".yml",
  ".yaml",
  ".json",
  ".js",
  ".csv",
  ".txt",
  ".html",
  ".mdback"
]);

const REPLACEMENTS = [
  ["awn-data/", "awn-databases/"],
  ["layer: awn-data-store", "layer: awn-databases-store"],
  ["/api/awn-data", "/api/awn-databases"],
  ["/api/agent/awn-data-index", "/api/agent/awn-databases-index"],
  ["(awn-data)", "(awn-databases)"],
  ["# Оглавление инфоблоков (awn-data)", "# Оглавление инфоблоков (awn-databases)"]
];

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function listWorkspaceRoots(argv) {
  if (argv.length) {
    return argv.map((item) => path.resolve(ROOT, item));
  }
  const workspacesDir = path.join(ROOT, "workspaces");
  const entries = await fs.readdir(workspacesDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(workspacesDir, entry.name));
}

async function renameDataFolder(workspaceRoot) {
  const legacyPath = path.join(workspaceRoot, LEGACY);
  const targetPath = path.join(workspaceRoot, TARGET);
  if (!(await exists(legacyPath))) {
    if (await exists(targetPath)) return { renamed: false, reason: "already migrated" };
    return { renamed: false, reason: "no awn-data folder" };
  }
  if (await exists(targetPath)) {
    throw new Error(`Both ${LEGACY} and ${TARGET} exist in ${workspaceRoot}`);
  }
  await fs.rename(legacyPath, targetPath);
  return { renamed: true, from: legacyPath, to: targetPath };
}

function shouldPatchFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return TEXT_EXT.has(ext);
}

async function patchFileContent(filePath) {
  if (!shouldPatchFile(filePath)) return 0;
  const raw = await fs.readFile(filePath, "utf8");
  let next = raw;
  for (const [from, to] of REPLACEMENTS) {
    next = next.split(from).join(to);
  }
  if (next === raw) return 0;
  await fs.writeFile(filePath, next, "utf8");
  return 1;
}

async function walkAndPatch(dir, stats) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkAndPatch(abs, stats);
      continue;
    }
    stats.filesPatched += await patchFileContent(abs);
  }
}

async function main() {
  const workspaceRoots = await listWorkspaceRoots(process.argv.slice(2));
  const summary = [];

  for (const workspaceRoot of workspaceRoots) {
    const item = { workspace: path.relative(ROOT, workspaceRoot), renamed: false, filesPatched: 0 };
    const renameResult = await renameDataFolder(workspaceRoot);
    item.rename = renameResult;
    const stats = { filesPatched: 0 };
    await walkAndPatch(workspaceRoot, stats);
    item.filesPatched = stats.filesPatched;
    item.renamed = Boolean(renameResult.renamed);
    summary.push(item);
  }

  const repoStats = { filesPatched: 0 };
  await walkAndPatch(path.join(ROOT, "workspaces"), repoStats);

  console.log(JSON.stringify({ summary, workspaceTextPatches: repoStats.filesPatched }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
