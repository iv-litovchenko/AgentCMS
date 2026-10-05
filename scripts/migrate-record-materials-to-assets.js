#!/usr/bin/env node
/**
 * Migrate legacy awn-materials-{slug} → awn-storage/assets/materials/{awn-id}/
 */
const fs = require("fs/promises");
const path = require("path");
const {
  getRecordSlugFromPartsFolderName,
  isRecordPartsPackageFolderName,
  buildRecordMaterialsAssetsRelPath
} = require("../lib/record-materials");
const { parseAwnId } = require("../lib/workspace-id/service");
const { allocateNextId } = require("../lib/workspace-id/store");

function splitNodeFrontmatter(raw = "") {
  const text = String(raw || "");
  if (!text.startsWith("---")) return { frontmatter: "", body: text };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { frontmatter: "", body: text };
  return {
    frontmatter: text.slice(3, end).replace(/^\n/, ""),
    body: text.slice(end + 4).replace(/^\n/, "")
  };
}

function getYamlScalar(frontmatter, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const match = String(frontmatter || "").match(re);
  if (!match) return "";
  let raw = match[1].trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1);
  }
  return raw.trim();
}

function upsertFrontmatterScalar(frontmatter, key, value) {
  const lines = String(frontmatter || "").split(/\r?\n/);
  const scalar = String(value ?? "");
  const formatted = /[\s:#[\]{}|>&*!?,@`"']/.test(scalar) ? `"${scalar.replace(/"/g, '\\"')}"` : scalar;
  const re = new RegExp(`^${key}:\\s*`);
  let replaced = false;
  const next = lines.map((line) => {
    if (re.test(line)) {
      replaced = true;
      return `${key}: ${formatted}`;
    }
    return line;
  });
  if (!replaced) next.push(`${key}: ${formatted}`);
  return next.join("\n").replace(/\n+$/, "");
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, onDir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await onDir(absolute, entry.name);
      await walk(absolute, onDir);
    }
  }
}

function resolveOwnerRecordPath(materialsDirAbsolute) {
  const folderName = path.basename(materialsDirAbsolute);
  const slug = getRecordSlugFromPartsFolderName(folderName);
  if (!slug) return null;
  return path.join(path.dirname(materialsDirAbsolute), `${slug}.md`);
}

async function readAwnIdFromRecord(recordAbsolute) {
  try {
    const raw = await fs.readFile(recordAbsolute, "utf-8");
    const { frontmatter } = splitNodeFrontmatter(raw);
    return parseAwnId(getYamlScalar(frontmatter, "awn-id"));
  } catch {
    return null;
  }
}

async function assignAwnIdToRecord(recordAbsolute, agentRoot) {
  const raw = await fs.readFile(recordAbsolute, "utf-8");
  const { frontmatter, body } = splitNodeFrontmatter(raw);
  const existing = parseAwnId(getYamlScalar(frontmatter, "awn-id"));
  if (existing) return existing;
  const id = allocateNextId(agentRoot);
  const next = upsertFrontmatterScalar(frontmatter, "awn-id", String(id));
  const content = `---\n${next}\n---\n${body ? `\n${body}` : ""}`;
  await fs.writeFile(recordAbsolute, content, "utf-8");
  return id;
}

async function replaceInFile(fileAbsolute, replacements) {
  let raw = await fs.readFile(fileAbsolute, "utf-8");
  let changed = false;
  for (const [from, to] of replacements) {
    if (raw.includes(from)) {
      raw = raw.split(from).join(to);
      changed = true;
    }
  }
  if (changed) await fs.writeFile(fileAbsolute, raw, "utf-8");
}

async function migrateLegacyFolder(materialsDirAbsolute, agentRoot) {
  const folderName = path.basename(materialsDirAbsolute);
  if (!isRecordPartsPackageFolderName(folderName)) return { skipped: true };

  const recordAbsolute = resolveOwnerRecordPath(materialsDirAbsolute);
  if (!recordAbsolute || !(await pathExists(recordAbsolute))) {
    console.warn("Skip (no owner record):", materialsDirAbsolute);
    return { skipped: true };
  }

  const awnId =
    (await readAwnIdFromRecord(recordAbsolute)) || (await assignAwnIdToRecord(recordAbsolute, agentRoot));

  const parts = materialsDirAbsolute.split(`${path.sep}awn-storage${path.sep}`);
  if (parts.length < 2) {
    console.warn("Skip (not under awn-storage):", materialsDirAbsolute);
    return { skipped: true };
  }
  const bundleAbsolute = path.join(parts[0], "awn-storage");
  const oldRelSuffix = parts[1].replace(/\\/g, "/");
  const materialsRel = buildRecordMaterialsAssetsRelPath(awnId);
  const destAbsolute = path.join(bundleAbsolute, ...materialsRel.split("/"));

  await fs.mkdir(destAbsolute, { recursive: true });

  const topicPrefix = path.relative(agentRoot, bundleAbsolute).replace(/\\/g, "/").replace(/\/awn-storage$/, "");

  const entries = await fs.readdir(materialsDirAbsolute, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(materialsDirAbsolute, entry.name);
    const to = path.join(destAbsolute, entry.name);
    if (await pathExists(to)) {
      console.warn("Skip existing:", to);
      continue;
    }
    await fs.rename(from, to);
    if (entry.name.endsWith(".md")) {
      const oldPath = `awn-storage/${oldRelSuffix}/${entry.name}`;
      const newPath = `awn-storage/${materialsRel}/${entry.name}`;
      const replacements = [[oldPath, newPath]];
      if (topicPrefix) {
        replacements.push([`${topicPrefix}/${oldPath}`, `${topicPrefix}/${newPath}`]);
      }
      await replaceInFile(to, replacements);
    }
  }

  const remaining = await fs.readdir(materialsDirAbsolute);
  if (remaining.length === 0) {
    await fs.rmdir(materialsDirAbsolute);
  }

  console.log(`Migrated → ${destAbsolute} (awn-id ${awnId})`);
  return { migrated: true, awnId, destAbsolute };
}

async function main() {
  const roots = process.argv.slice(2);
  const defaultRoots = [
    path.join(__dirname, "../workspaces/agent-cms-core"),
    path.join(__dirname, "../workspaces/agent-cms-test")
  ];
  const targets = roots.length ? roots.map((r) => path.resolve(r)) : defaultRoots;

  for (const workspaceRoot of targets) {
    if (!(await pathExists(workspaceRoot))) {
      console.warn("Missing workspace root:", workspaceRoot);
      continue;
    }
    console.log("Scanning", workspaceRoot);
    const legacyDirs = [];
    await walk(workspaceRoot, async (absolute, name) => {
      if (isRecordPartsPackageFolderName(name)) legacyDirs.push(absolute);
    });

    for (const dir of legacyDirs) {
      await migrateLegacyFolder(dir, workspaceRoot);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
