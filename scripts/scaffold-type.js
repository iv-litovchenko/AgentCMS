#!/usr/bin/env node
/**
 * Новый тип в каталоге platform core
 *
 *   node scripts/scaffold-type.js field my-field
 *   node scripts/scaffold-type.js slot inbox-custom
 */
const fs = require("fs");
const path = require("path");

const [, , domain, slug] = process.argv;

const DOMAIN_META = {
  field: {
    folder: "fields",
    id: (s) => `awn.${s}`,
    extends: "awn.field.base",
    kind: "field",
    body: (id, title) => `id: ${id}
name: ${title}
kind: field
domain: fields
status: draft
extends: awn.field.base
widget: input
storage: string
mdbase: string
description: ${title}
settings: [description, hint, required, default]
`
  },
  block: {
    destRel: "awn-system/types/md-blocks",
    id: (s) => `awn.block.${s}`,
    extends: "awn.block.base",
    kind: "block",
    body: (id, title) => `id: ${id}
name: ${title}
kind: block
domain: md-blocks
status: draft
extends: awn.block.base
group: misc
sort: 99
icon: "📦"
description: ${title}
template: |
  ${title}

  Текст блока.
`
  },
  slot: {
    folder: "content",
    id: (s) => `awn.slot.${s}`,
    extends: "awn.slot",
    kind: "slot",
    body: (id, title) => `id: ${id}
name: ${title}
kind: slot
domain: content
status: draft
extends: awn.slot
description: ${title}
`
  },
  page: {
    folder: "pages",
    id: (s) => `awn.${s}`,
    extends: "awn.base",
    kind: "type",
    body: (id, title) => `id: ${id}
name: ${title}
kind: type
domain: pages
status: draft
extends: awn.base
description: ${title}
fields: {}
`
  }
};

const kind = domain;
const meta = DOMAIN_META[kind];
if (!slug || !meta) {
  console.error(`Usage: node scripts/scaffold-type.js <field|block|slot|page> <slug>`);
  process.exit(1);
}

if (meta.error) {
  console.error(meta.error);
  process.exit(1);
}

const repoRoot = path.join(__dirname, "..");
const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const runtimeId = meta.id(slug);
const dest = path.join(
  repoRoot,
  "workspaces/agent-cms-core",
  meta.destRel || path.join(meta.folder, "awn-storage/configuration/types"),
  `${slug}.yml`
);

if (fs.existsSync(dest)) {
  console.error(`Exists: ${dest}`);
  process.exit(1);
}

fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, meta.body(runtimeId, title), "utf-8");
console.log(`Created ${dest}`);
console.log("Set status: active to enable in runtime");
