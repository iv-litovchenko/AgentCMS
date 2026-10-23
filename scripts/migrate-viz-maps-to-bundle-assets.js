#!/usr/bin/env node
/**
 * Move *.viz.md from workspace-root assets/viz/{awn-id}/ to
 * {host}/awn-storage/assets/viz/{awn-id}/ using viz-about in frontmatter.
 *
 * Usage: node scripts/migrate-viz-maps-to-bundle-assets.js [workspaceAbsolutePath]
 */
const fs = require("fs/promises");
const path = require("path");
const {
  buildVizMapWorkspaceRelPath,
  buildVizMapWorkspaceRootLegacyRelPath
} = require("../lib/viz/viz-map-paths");
const { parseAwnId } = require("../lib/workspace-id/service");

const VIZ_FILE_RE = /\.viz\.md$/i;

function splitFrontmatter(raw = "") {
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

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function walkVizFiles(dir, baseRel, acc) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules" || entry.name === "history") continue;
    const abs = path.join(dir, entry.name);
    const rel = baseRel ? `${baseRel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await walkVizFiles(abs, rel, acc);
    } else if (entry.isFile() && VIZ_FILE_RE.test(entry.name)) {
      acc.push({ abs, rel: rel.replace(/\\/g, "/") });
    }
  }
}

async function main() {
  const workspaceRoot = path.resolve(process.argv[2] || path.join(process.cwd(), "workspaces", "0-ws-test"));
  const legacyRoot = path.join(workspaceRoot, "assets", "viz");
  if (!(await pathExists(legacyRoot))) {
    console.log("No workspace-root assets/viz — nothing to migrate.");
    return;
  }

  const files = [];
  await walkVizFiles(legacyRoot, "assets/viz", files);
  let moved = 0;
  let skipped = 0;

  for (const file of files) {
    const raw = await fs.readFile(file.abs, "utf-8");
    const { frontmatter } = splitFrontmatter(raw);
    const about = getYamlScalar(frontmatter, "viz-about");
    const kind = getYamlScalar(frontmatter, "viz-kind").toLowerCase();
    const awnId = parseAwnId(getYamlScalar(frontmatter, "awn-id"));
    const idFromPath = parseAwnId(path.basename(path.dirname(file.rel)));
    const recordId = awnId || idFromPath;
    if (!about || !kind || !recordId) {
      console.warn("skip (missing viz-about/kind/id):", file.rel);
      skipped += 1;
      continue;
    }

    const targetRel =
      buildVizMapWorkspaceRelPath(about, recordId, kind) ||
      buildVizMapWorkspaceRootLegacyRelPath(recordId, kind);
    if (!targetRel || targetRel === file.rel.replace(/\\/g, "/")) {
      skipped += 1;
      continue;
    }

    const targetAbs = path.join(workspaceRoot, targetRel);
    if (await pathExists(targetAbs)) {
      console.warn("skip (target exists):", targetRel);
      skipped += 1;
      continue;
    }

    await fs.mkdir(path.dirname(targetAbs), { recursive: true });
    await fs.rename(file.abs, targetAbs);
    console.log("moved:", file.rel, "→", targetRel);
    moved += 1;
  }

  console.log(`Done. moved=${moved} skipped=${skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
