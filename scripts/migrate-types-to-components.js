#!/usr/bin/env node
/**
 * Одноразовая миграция: components/types/*.yml → components/{group}/{name}/schema.yml + manifest.md
 * Frame-типы удалены — источник правды: types/ и awn-system/types/
 */
const fs = require("fs");
const path = require("path");

const repoRoot = path.join(__dirname, "..");
const componentsRoot = path.join(repoRoot, "workspaces/agent-cms-core/components");
const typesRoot = path.join(componentsRoot, "types");

const BLOCK_GROUP = "markdown-blocks";
const FIELD_GROUP = "fields";
const FRAME_MAP = {
  "field-def.yml": "fields/_base"
};

const KIND_BY_GROUP = {
  [BLOCK_GROUP]: "markdown-block",
  [FIELD_GROUP]: "field",
  frames: "frame"
};

function readYaml(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  return raw;
}

function parseSimpleYamlId(raw) {
  const idMatch = raw.match(/^id:\s*(.+)$/m);
  return idMatch ? idMatch[1].trim().replace(/^["']|["']$/g, "") : "";
}

function parseSimpleYamlName(raw) {
  const nameMatch = raw.match(/^name:\s*(.+)$/m);
  return nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, "") : "";
}

function slugFromFile(fileName) {
  return fileName.replace(/\.ya?ml$/i, "");
}

function runtimeIdToComponentId(runtimeId, group) {
  const raw = String(runtimeId || "").trim();
  if (!raw) return null;
  if (raw.startsWith("awn.block.")) return `${BLOCK_GROUP}/${raw.replace(/^awn\.block\./, "")}`;
  if (raw.startsWith("awn.")) return `${FIELD_GROUP}/${raw.replace(/^awn\./, "")}`;
  return `${group}/${slugFromFile(raw)}`;
}

function writeManifest(targetDir, { kind, id, runtimeId, name, description, extendsId, status = "active" }) {
  const manifestPath = path.join(targetDir, "manifest.md");
  if (fs.existsSync(manifestPath)) return;

  const extendsLine = extendsId ? `extends: ${extendsId}` : "extends: null";
  const body = `# ${path.basename(targetDir)}\n\nКомпонент \`${id}\`.\n`;
  const content = `---
type: component
kind: ${kind}
id: ${id}
runtime-id: ${runtimeId}
status: ${status}
${extendsLine}
name: ${name}
description: ${description || name}
---

${body}`;
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(manifestPath, content, "utf-8");
}

function writeSchema(targetDir, yamlContent) {
  const schemaPath = path.join(targetDir, "schema.yml");
  if (fs.existsSync(schemaPath)) return;
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(schemaPath, yamlContent, "utf-8");
}

function migrateBlocks() {
  const blocksDir = path.join(typesRoot, "blocks");
  if (!fs.existsSync(blocksDir)) return;

  for (const fileName of fs.readdirSync(blocksDir)) {
    if (fileName === "groups.yml") {
      const dest = path.join(componentsRoot, BLOCK_GROUP, "groups.yml");
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path.join(blocksDir, fileName), dest);
      }
      continue;
    }
    if (!/\.ya?ml$/i.test(fileName)) continue;

    const slug = slugFromFile(fileName);
    const targetDir = path.join(componentsRoot, BLOCK_GROUP, slug);
    const raw = readYaml(path.join(blocksDir, fileName));
    const runtimeId = parseSimpleYamlId(raw) || `awn.block.${slug}`;
    const name = parseSimpleYamlName(raw) || slug;
    const id = `${BLOCK_GROUP}/${slug}`;

    writeSchema(targetDir, raw);
    writeManifest(targetDir, {
      kind: KIND_BY_GROUP[BLOCK_GROUP],
      id,
      runtimeId,
      name,
      description: "",
      extendsId: slug === "_base" ? null : `${BLOCK_GROUP}/_base`
    });
  }
}

function migrateFields() {
  const fieldsDir = path.join(typesRoot, "fields");
  if (!fs.existsSync(fieldsDir)) return;

  for (const fileName of fs.readdirSync(fieldsDir)) {
    if (!/\.ya?ml$/i.test(fileName)) continue;
    const slug = slugFromFile(fileName);
    const targetDir = path.join(componentsRoot, FIELD_GROUP, slug);
    const raw = readYaml(path.join(fieldsDir, fileName));
    const runtimeId = parseSimpleYamlId(raw) || `awn.${slug}`;
    const name = parseSimpleYamlName(raw) || slug;
    const id = `${FIELD_GROUP}/${slug}`;

    writeSchema(targetDir, raw);
    writeManifest(targetDir, {
      kind: KIND_BY_GROUP[FIELD_GROUP],
      id,
      runtimeId,
      name,
      description: "",
      extendsId: slug === "_base" ? null : `${FIELD_GROUP}/_base`
    });
  }
}

function migrateFrames() {
  const compDir = path.join(typesRoot, "components");
  if (!fs.existsSync(compDir)) return;

  for (const [fileName, relTarget] of Object.entries(FRAME_MAP)) {
    const sourcePath = path.join(compDir, fileName);
    if (!fs.existsSync(sourcePath)) continue;
    const targetDir = path.join(componentsRoot, relTarget);
    const raw = readYaml(sourcePath);

    if (fileName === "field-def.yml") {
      const schemaPath = path.join(targetDir, "schema.yml");
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(schemaPath, raw, "utf-8");
    }
  }
}

function main() {
  if (!fs.existsSync(typesRoot)) {
    console.log("components/types/ not found — nothing to migrate");
    return;
  }
  migrateBlocks();
  migrateFields();
  migrateFrames();
  console.log("Migration complete. Review workspaces/agent-cms-core/components/ then remove components/types/");
}

main();
