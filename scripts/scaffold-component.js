#!/usr/bin/env node
/**
 * Новый топик-компонент в agent-cms-core/components
 *
 *   node scripts/scaffold-component.js block callout
 *   node scripts/scaffold-component.js field url
 *   node scripts/scaffold-component.js frame my-frame
 *
 * После создания: awn-status: "🟢 Открыта" → появится в runtime
 */
const fs = require("fs");
const path = require("path");

const [, , kind, slug] = process.argv;

const KIND_FOLDER = {
  block: "markdown-blocks",
  field: "fields",
  frame: "frames",
  mixin: "frames/mixins",
  agent: "agents",
  taxonomy: "taxonomies"
};

if (!kind || !slug || !KIND_FOLDER[kind]) {
  console.error(`Usage: node scripts/scaffold-component.js <kind> <slug>

Kinds: ${Object.keys(KIND_FOLDER).join(", ")}
Example: node scripts/scaffold-component.js block callout`);
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

const runtimeId =
  kind === "block"
    ? `awn.block.${slug}`
    : kind === "field"
      ? `awn.${slug}`
      : kind === "frame"
        ? `awn.${slug}`
        : relPath;

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
} else if (kind === "field") {
  schema = `id: ${runtimeId}
kind: field
extends: awn.field-def
widget: input
storage: string
mdbase: string
description: ${title}
settings: [description, hint, required, default]
`;
} else if (kind === "frame") {
  schema = `id: ${runtimeId}
kind: type
extends: awn.base
description: ${title}
fields: {}
`;
}

fs.mkdirSync(schemaDir, { recursive: true });
fs.writeFileSync(path.join(targetDir, "manifest.md"), manifest, "utf-8");
fs.writeFileSync(path.join(schemaDir, "schema.yml"), schema, "utf-8");

console.log(`Created topic: ${targetDir}`);
console.log('Set awn-status: "🟢 Открыта" in manifest.md to activate');
