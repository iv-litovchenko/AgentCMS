#!/usr/bin/env node
/**
 * Новый топик-компонент в agent-cms-core/components
 *
 *   node scripts/scaffold-component.js agent my-agent
 *
 * Поля — awn-data/editing-fields/fields/; страницы — awn-data/pages/; блоки — awn-data/markdown-blocks/.
 * После создания: awn-status: "🟢 Открыта" → появится в runtime
 */
const fs = require("fs");
const path = require("path");

const [, , kind, slug] = process.argv;

const KIND_FOLDER = {
  block: "markdown-blocks",
  agent: "agents",
  taxonomy: "taxonomies"
};

if (!kind || !slug || !KIND_FOLDER[kind]) {
  console.error(`Usage: node scripts/scaffold-component.js <kind> <slug>

Kinds: ${Object.keys(KIND_FOLDER).join(", ")}
Example: node scripts/scaffold-component.js agent my-agent

Fields: awn-data/editing-fields/fields/<slug>.md`);
  process.exit(1);
}

if (kind === "block") {
  console.error(
    "Markdown-блоки — в awn-data/markdown-blocks/blocks/{slug}.md (MCP create_data_record или вручную)."
  );
  process.exit(1);
}

if (kind === "field") {
  console.error(
    "Поля — awn-data/editing-fields/fields/{slug}.md (MCP create_data_record или вручную)."
  );
  process.exit(1);
}

const repoRoot = path.join(__dirname, "..");
const folder = KIND_FOLDER[kind];
const relPath = `${folder}/${slug}`;
const targetDir = path.join(repoRoot, "workspaces/agent-cms-core/components", folder, slug);
const schemaDir = path.join(targetDir, "storage", "configuration");

if (fs.existsSync(targetDir)) {
  console.error(`Already exists: ${targetDir}`);
  process.exit(1);
}

const runtimeId = kind === "block" ? `awn.block.${slug}` : relPath;

const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const now = new Date().toISOString();

const manifest = `---
awn-preview: ""
awn-emoji: ""
awn-name: ${title}
awn-status: "🟡 Черновик"
awn-type: awn.topic
awn-create: "${now.slice(0, 16)}"
awn-update: ${now}
awn-description: TODO — ${title}
awn-main: false
awn-category: ""
awn-tags: []
awn-color: ""
awn-version: 1
awn-sort: ""
---

# ${slug}

Топик-комponent \`${relPath}\`. Схема: \`storage/configuration/schema.yml\`.

Чтобы появился в runtime — поставьте \`awn-status: "🟢 Открыта"\`.
`;

let schema = "";
if (kind === "block") {
  schema = `id: ${runtimeId}
kind: block
group: misc
sort: 99
icon: "📌"
description: ${title}
template: |
  ## ${title}

  Текст блока.
`;
}

fs.mkdirSync(schemaDir, { recursive: true });
fs.writeFileSync(path.join(targetDir, "manifest.md"), manifest, "utf-8");
fs.writeFileSync(path.join(schemaDir, "schema.yml"), schema, "utf-8");

console.log(`Created topic: ${targetDir}`);
console.log('Set awn-status: "🟢 Открыта" in manifest.md to activate');
