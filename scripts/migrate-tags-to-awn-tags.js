#!/usr/bin/env node
/**
 * Merge legacy frontmatter `tags` into `awn-tags` and remove bare `tags:` key.
 */
const fs = require("fs/promises");
const path = require("path");

const WORKSPACES_ROOT = path.join(__dirname, "..", "workspaces");

function splitFrontmatter(raw = "") {
  const text = String(raw).replace(/^\uFEFF/, "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: text };
  return { frontmatter: match[1], body: match[2] };
}

function joinFrontmatter(frontmatter, body) {
  if (!String(frontmatter || "").trim()) return String(body || "");
  return `---\n${frontmatter}\n---\n${body}`;
}

function parseScalarList(raw) {
  const text = String(raw || "").trim();
  if (!text || text === "[]") return [];
  if (text.startsWith("[") && text.endsWith("]")) {
    return text
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
      .filter(Boolean);
  }
  return text
    .split(",")
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function parseFrontmatterEntries(frontmatter) {
  const lines = String(frontmatter || "").split("\n");
  const entries = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || line.trim().startsWith("#")) {
      index += 1;
      continue;
    }

    const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
    if (!match || match[1].length > 0) {
      index += 1;
      continue;
    }

    const key = match[2].trim();
    const rest = match[3];

    if (rest === "" || rest === "|" || rest === ">") {
      const items = [];
      index += 1;
      while (index < lines.length && /^\s+-\s?/.test(lines[index])) {
        items.push(lines[index].replace(/^\s+-\s?/, "").trim().replace(/^['"]|['"]$/g, ""));
        index += 1;
      }
      entries.push({ key, kind: items.length ? "array" : "string", value: items, lineStart: entries.length });
      continue;
    }

    if (rest.startsWith("[") && rest.endsWith("]")) {
      entries.push({ key, kind: "array", value: parseScalarList(rest), lineStart: entries.length });
      index += 1;
      continue;
    }

    entries.push({
      key,
      kind: "string",
      value: rest.trim().replace(/^['"]|['"]$/g, ""),
      lineStart: entries.length
    });
    index += 1;
  }

  return { lines, entries };
}

function migrateFrontmatter(frontmatter) {
  const { lines, entries } = parseFrontmatterEntries(frontmatter);
  const awnTags = entries.find((entry) => /^awn-tags$/i.test(entry.key));
  const legacyTags = entries.filter((entry) => /^tags?$/i.test(entry.key) && !/^awn-tags$/i.test(entry.key));

  if (!legacyTags.length) return null;

  const merged = new Set();
  const collect = (entry) => {
    if (!entry) return;
    if (entry.kind === "array" && Array.isArray(entry.value)) {
      entry.value.forEach((item) => {
        const text = String(item || "").trim();
        if (text) merged.add(text);
      });
      return;
    }
    parseScalarList(entry.value).forEach((item) => merged.add(item));
  };

  collect(awnTags);
  legacyTags.forEach(collect);

  const removeKeys = new Set(legacyTags.map((entry) => entry.key.toLowerCase()));
  const keptLines = [];
  let skipBlock = false;

  for (const line of lines) {
    const topLevel = line.match(/^([^:]+):\s*(.*)$/);
    if (topLevel && !line.startsWith(" ")) {
      const key = topLevel[1].trim().toLowerCase();
      if (removeKeys.has(key)) {
        skipBlock = topLevel[2].trim() === "";
        continue;
      }
      skipBlock = false;
      keptLines.push(line);
      continue;
    }

    if (skipBlock && /^\s+-\s?/.test(line)) continue;
    if (skipBlock && line.trim() && !/^\s/.test(line)) skipBlock = false;
    if (skipBlock) continue;
    keptLines.push(line);
  }

  const mergedList = [...merged];
  let nextLines = [...keptLines];
  const awnTagsLineIndex = nextLines.findIndex((line) => /^awn-tags:/i.test(line));

  if (awnTagsLineIndex >= 0) {
    if (mergedList.length) {
      nextLines.splice(
        awnTagsLineIndex,
        1,
        "awn-tags:",
        ...mergedList.map((item) => `  - ${item}`)
      );
    } else {
      nextLines[awnTagsLineIndex] = "awn-tags: []";
    }
  } else if (mergedList.length) {
    nextLines.push("awn-tags:", ...mergedList.map((item) => `  - ${item}`));
  } else {
    nextLines.push("awn-tags: []");
  }

  return nextLines.join("\n");
}

function migrateFileContent(content) {
  const { frontmatter, body } = splitFrontmatter(content);
  if (!frontmatter) return null;
  const migratedFrontmatter = migrateFrontmatter(frontmatter);
  if (!migratedFrontmatter || migratedFrontmatter === frontmatter) return null;
  return joinFrontmatter(migratedFrontmatter, body);
}

async function walk(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      await walk(absolute, files);
      continue;
    }
    if (!/\.(?:md|mdback|yml|yaml)$/i.test(entry.name)) continue;
    files.push(absolute);
  }
  return files;
}

async function main() {
  const files = await walk(WORKSPACES_ROOT);
  let updated = 0;

  for (const filePath of files) {
    const original = await fs.readFile(filePath, "utf8");
    const migrated = migrateFileContent(original);
    if (!migrated || migrated === original) continue;
    await fs.writeFile(filePath, migrated, "utf8");
    updated += 1;
    console.log(path.relative(WORKSPACES_ROOT, filePath));
  }

  console.log(`\nUpdated ${updated} file(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
