#!/usr/bin/env node
/**
 * Миграция workspace: _registration.md → manifest.md, awn-storage → storage,
 * topic.md → topic/manifest.md, awn-agent-kit → agent-kit, awn-container → container.
 * Frontmatter awn-* не меняется.
 */
const fs = require("fs");
const path = require("path");

const SKIP_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  "history",
  "comments",
  ".obsidian",
  "storage",
  "awn-storage"
]);

const SKIP_FILE_NAMES = new Set([
  "content.md",
  "todo.md",
  "body.md",
  "configuration.yml",
  "content.csv",
  "AGENTS.md",
  "README.md",
  "STRUCTURE.md",
  "TODO.md"
]);

function splitFrontmatter(raw) {
  const text = String(raw || "").replace(/^\uFEFF/, "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: text };
  return { frontmatter: match[1], body: match[2] };
}

function getYamlScalar(frontmatter, key) {
  const match = String(frontmatter || "").match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  if (!match) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function isTreeTopicFile(fileName, frontmatter) {
  const base = String(fileName || "");
  if (!/\.md$/i.test(base)) return false;
  if (base.toLowerCase() === "_registration.md" || base.toLowerCase() === "_reg-info.md") return false;
  if (base.toLowerCase() === "manifest.md") return false;
  if (SKIP_FILE_NAMES.has(base)) return false;
  if (base.toLowerCase().endsWith(".sidecar.md")) return false;
  const type = getYamlScalar(frontmatter, "awn-type");
  return type === "awn.topic" || type === "awn.area" || type === "awn.workspace";
}

function updateStoragePathsInText(text) {
  return String(text || "")
    .replace(/awn-storage/g, "storage")
    .replace(/awn-agent-kit/g, "agent-kit")
    .replace(/awn-container/g, "container");
}

function writeFileWithUpdatedPaths(filePath, content) {
  fs.writeFileSync(filePath, updateStoragePathsInText(content), "utf8");
}

function renameIfExists(from, to) {
  if (!fs.existsSync(from)) return false;
  if (fs.existsSync(to)) return false;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  return true;
}

function migrateTopicFile(dir, fileName) {
  const filePath = path.join(dir, fileName);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  const { frontmatter, body } = splitFrontmatter(raw);
  if (!isTreeTopicFile(fileName, frontmatter)) return;

  const slug = fileName.replace(/\.md$/i, "");
  const topicDir = path.join(dir, slug);
  const manifestPath = path.join(topicDir, "manifest.md");
  if (fs.existsSync(manifestPath)) return;

  fs.mkdirSync(topicDir, { recursive: true });
  writeFileWithUpdatedPaths(manifestPath, raw);

  const oldStorage = path.join(dir, "awn-storage", slug);
  const newStorage = path.join(topicDir, "storage");
  if (fs.existsSync(oldStorage)) {
    renameIfExists(oldStorage, newStorage);
  }

  fs.unlinkSync(filePath);
}

function migrateDirectory(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (/\.md$/i.test(entry.name) && entry.name !== "manifest.md") {
      migrateTopicFile(dir, entry.name);
    }
  }

  entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR_NAMES.has(entry.name)) continue;
      migrateDirectory(full);
    }
  }

  renameIfExists(path.join(dir, "_registration.md"), path.join(dir, "manifest.md"));
  renameIfExists(path.join(dir, "_reg-info.md"), path.join(dir, "manifest.md"));

  if (fs.existsSync(path.join(dir, "manifest.md"))) {
    const manifestPath = path.join(dir, "manifest.md");
    writeFileWithUpdatedPaths(manifestPath, fs.readFileSync(manifestPath, "utf8"));
  }

  renameIfExists(path.join(dir, "awn-storage"), path.join(dir, "storage"));
  renameIfExists(path.join(dir, "awn-sort.json"), path.join(dir, "sort.json"));
  renameIfExists(path.join(dir, "awn-agent-kit"), path.join(dir, "agent-kit"));
  renameIfExists(path.join(dir, "awn-container"), path.join(dir, "container"));
}

function migrateWorkspace(root) {
  const abs = path.resolve(root);
  if (!fs.existsSync(abs)) {
    throw new Error(`Workspace not found: ${abs}`);
  }
  console.log("Migrating", abs);
  migrateDirectory(abs);
  console.log("Done", abs);
}

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/migrate-workspace-manifest-awn.js <workspace-path>");
  process.exit(1);
}

migrateWorkspace(target);
