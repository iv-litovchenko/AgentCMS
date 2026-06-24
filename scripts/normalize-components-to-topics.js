#!/usr/bin/env node
/**
 * Приводит components/* к модели CMS: awn.topic + storage/configuration/schema.yml
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const componentsRoot = path.join(repoRoot, "workspaces/agent-cms-core/components");

const STATUS_TO_AWN = {
  active: "🟢 Открыта",
  deprecated: "🟢 Открыта",
  draft: "🟡 Черновик",
  disabled: "🔴 Закрыта"
};

const SKIP_DIRS = new Set(["types"]);

function splitFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: text };
  return { frontmatter: match[1], body: match[2] };
}

function getYamlScalar(frontmatter, key) {
  const match = String(frontmatter || "").match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  if (!match) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function joinFrontmatter(frontmatter, body) {
  return `---\n${frontmatter.trim()}\n---\n\n${body.replace(/^\n+/, "")}`;
}

function listManifests(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listManifests(full, acc);
    else if (entry.name === "manifest.md") acc.push(full);
  }
  return acc;
}

function moveSchemaToStorage(topicDir) {
  const flat = path.join(topicDir, "schema.yml");
  const nested = path.join(topicDir, "storage", "configuration", "schema.yml");
  if (!fs.existsSync(flat)) return;
  fs.mkdirSync(path.dirname(nested), { recursive: true });
  if (!fs.existsSync(nested)) {
    fs.copyFileSync(flat, nested);
  }
  fs.unlinkSync(flat);
}

function convertManifest(manifestPath) {
  const raw = fs.readFileSync(manifestPath, "utf-8");
  const { frontmatter, body } = splitFrontmatter(raw);

  const legacyComponent = getYamlScalar(frontmatter, "type") === "component";
  const awnType = getYamlScalar(frontmatter, "awn-type");
  if (!legacyComponent && awnType !== "awn.topic") return false;

  const name =
    getYamlScalar(frontmatter, "awn-name") ||
    getYamlScalar(frontmatter, "name") ||
    path.basename(path.dirname(manifestPath));
  const description =
    getYamlScalar(frontmatter, "awn-description") ||
    getYamlScalar(frontmatter, "description") ||
    "";
  const legacyStatus = getYamlScalar(frontmatter, "status");
  const awnStatus =
    getYamlScalar(frontmatter, "awn-status") ||
    STATUS_TO_AWN[legacyStatus] ||
    "🟡 Черновик";

  const now = new Date().toISOString();
  const newFrontmatter = [
    'awn-preview: ""',
    'awn-emoji: ""',
    `awn-name: ${name}`,
    `awn-status: ${awnStatus.includes(" ") ? `"${awnStatus}"` : awnStatus}`,
    "awn-type: awn.topic",
    `awn-create: "${now.slice(0, 16)}"`,
    `awn-update: ${now}`,
    `awn-description: ${description || name}`,
    "awn-main: false",
    'awn-category: ""',
    "awn-tags: []",
    'awn-color: ""',
    "awn-version: 1",
    'awn-sort: ""'
  ].join("\n");

  fs.writeFileSync(manifestPath, joinFrontmatter(newFrontmatter, body), "utf-8");
  moveSchemaToStorage(path.dirname(manifestPath));
  return true;
}

function main() {
  let converted = 0;
  for (const manifestPath of listManifests(componentsRoot)) {
    if (convertManifest(manifestPath)) converted += 1;
  }
  const typesDir = path.join(componentsRoot, "types");
  if (fs.existsSync(typesDir)) {
    fs.rmSync(typesDir, { recursive: true, force: true });
  }
  console.log(`Converted ${converted} topic manifests under components/`);
}

main();
