#!/usr/bin/env node
/**
 * Sync mirror: awn-system/types/md-blocks/ → awn-data/markdown-blocks/.
 * Primary source of truth: awn-system/types/md-blocks/ (YAML типов, палитра редактора).
 * awn-data/markdown-blocks/ — зеркало для legacy tools и UI, не редактировать вручную.
 *
 *   node scripts/migrate-md-blocks-to-awn-data.js
 */
const fs = require("fs");
const path = require("path");
const { parseTypeYaml } = require("../awn-yaml-utils");
const { getAgentCmsCoreAbsolute } = require("../platform-sources");

const CORE = getAgentCmsCoreAbsolute(process.cwd());
const AWN_DATA = path.join(CORE, "awn-data");
const GROUP_ROOT = path.join(AWN_DATA, "markdown-blocks");
const GROUPS_DIR = path.join(GROUP_ROOT, "groups");
const BLOCKS_DIR = path.join(GROUP_ROOT, "blocks");
const TYPES_DIR = path.join(CORE, "awn-system", "types", "md-blocks");
const COMPONENTS_DIR = path.join(CORE, "components", "markdown-blocks");

const COMPONENT_SLUG = {
  desc: "awn-desc",
  code: "codeblock"
};

const NOW = "2026-08-03T00:00:00.000Z";

function slugFromTypeFile(name) {
  return name.replace(/\.ya?ml$/i, "");
}

function componentPathForSlug(slug, blockId) {
  const tail = blockId?.replace(/^awn\.block\./, "") || slug;
  const folder = COMPONENT_SLUG[tail] || COMPONENT_SLUG[slug] || slug;
  const abs = path.join(COMPONENTS_DIR, folder);
  if (fs.existsSync(abs)) return `components/markdown-blocks/${folder}`;
  return "";
}

function unescapeTemplate(value) {
  if (value && typeof value === "object") return "";
  return String(value || "")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .trim();
}

function extractTemplateFromYaml(raw, parsed) {
  const fromParsed = unescapeTemplate(parsed?.template || parsed?.text || "");
  if (fromParsed) return fromParsed;

  const pipeStart = raw.match(/^template:\s*\|\s*\r?\n/m);
  if (pipeStart) {
    const startIndex = pipeStart.index + pipeStart[0].length;
    const tail = raw.slice(startIndex);
    const body = [];
    for (const line of tail.split(/\r?\n/)) {
      if (/^[A-Za-z][\w-]*:\s/.test(line)) break;
      body.push(line.replace(/^[ \t]{2}/, ""));
    }
    const text = body.join("\n").trimEnd();
    if (text) return text;
  }

  const quoted = raw.match(/template:\s*"((?:\\.|[^"\\])*)"/);
  if (quoted) return unescapeTemplate(quoted[1]);

  const single = raw.match(/template:\s*'((?:\\.|[^'\\])*)'/);
  if (single) return unescapeTemplate(single[1]);

  return "";
}

function readTypeYamlWithFallback(slug) {
  const typePath = path.join(TYPES_DIR, `${slug}.yml`);
  const componentFolder = COMPONENT_SLUG[slug] || slug;
  const componentPath = path.join(COMPONENTS_DIR, componentFolder, "awn-storage", "configuration", "schema.yml");
  const abs = fs.existsSync(typePath) ? typePath : fs.existsSync(componentPath) ? componentPath : null;
  if (!abs) return null;
  const raw = fs.readFileSync(abs, "utf-8");
  return { raw, schema: parseTypeYaml(raw), source: abs };
}

function yamlScalar(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  const text = String(value);
  if (/[:#\[\]{}|>&*!%@`",]/.test(text) || /^\s/.test(text) || text.includes("\n")) {
    return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return text;
}

function writeMd(filePath, frontmatter, body = "") {
  const lines = ["---"];
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === "" || value === null || value === undefined) continue;
    lines.push(`${key}: ${yamlScalar(value)}`);
  }
  lines.push("---", "");
  if (body) lines.push(body.trim(), "");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
}

function ensureGroupScaffold() {
  fs.mkdirSync(GROUP_ROOT, { recursive: true });
  fs.writeFileSync(
    path.join(GROUP_ROOT, "store.yml"),
    `version: 1
kind: group
id: markdown-blocks
name: Markdown-блоки
description: Группа накопителей палитры блоков редактора
`,
    "utf-8"
  );
  fs.writeFileSync(
    path.join(GROUP_ROOT, "manifest.md"),
    [
      "# Markdown-блоки",
      "",
      "Группа накопителей палитры редактора.",
      "",
      "| Накопитель | Назначение |",
      "|------------|------------|",
      "| [groups/](./groups/manifest.md) | MD-группы блоков (Структура, Текст, …) |",
      "| [blocks/](./blocks/manifest.md) | MD-блоки (awn.block.*) — шаблоны вставки |",
      ""
    ].join("\n"),
    "utf-8"
  );
  fs.writeFileSync(path.join(GROUP_ROOT, "sort.json"), JSON.stringify(["groups", "blocks"], null, 2) + "\n", "utf-8");
}

function ensureGroupsStoreSchema() {
  fs.mkdirSync(GROUPS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(GROUPS_DIR, "store.yml"),
    `version: 1
kind: collection
id: markdown-blocks.groups
name: MD-Группы блоков
extends: ../../_base/store.yml
description: Группы палитры блоков редактора (structure, text, lists…)

record:
  id-mode: slug
  file: "{id}.md"

fields:
  title:
    type: awn.string
    title: Название
    required: true
  sort:
    type: awn.integer
    title: Порядок в палитре
    default: 0
  status:
    type: awn.enum
    title: Статус
    enum: [active, inactive]
    default: active
`,
    "utf-8"
  );
  fs.writeFileSync(
    path.join(GROUPS_DIR, "manifest.md"),
    `# MD-Группы блоков

Записи групп палитры: **Структура**, **Текст**, **Списки**, **Код и таблицы**, **AWN**.

Поле \`sort\` задаёт порядок секций в палитре редактора.
`,
    "utf-8"
  );
}

function ensureBlocksStoreSchema() {
  fs.mkdirSync(BLOCKS_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(BLOCKS_DIR, "store.yml"),
    `version: 1
kind: collection
id: markdown-blocks.blocks
name: MD-Блоки
extends: ../../_base/store.yml
description: Блоки палитры редактора — awn.block.* с шаблоном в теле записи

record:
  id-mode: slug
  file: "{id}.md"

fields:
  title:
    type: awn.string
    title: Название
    required: true
  blockId:
    type: awn.string
    title: ID типа
    description: awn.block.h2, awn.block.quote…
    required: true
  group:
    type: awn.string
    title: Группа палитры
    description: id из markdown-blocks/groups
  sort:
    type: awn.integer
    title: Порядок в группе
    default: 0
  icon:
    type: awn.string
    title: Иконка
  status:
    type: awn.enum
    title: Статус
    enum: [active, draft, inactive]
    default: active
  render:
    type: awn.enum
    title: Рендер
    enum: [template, fence]
    default: template
  fenceTag:
    type: awn.string
    title: Fence-тег
  renderer:
    type: awn.string
    title: JS-рендер
  componentPath:
    type: awn.string
    title: Компонент
    description: components/markdown-blocks/…
  extends:
    type: awn.string
    title: Extends
    default: awn.block.base
`,
    "utf-8"
  );
  fs.writeFileSync(
    path.join(BLOCKS_DIR, "manifest.md"),
    [
      "# MD-Блоки",
      "",
      "Каждая запись — один блок палитры редактора.",
      "",
      "- **blockId** — стабильный awn.block.*",
      "- **group** — секция палитры (structure, text, …)",
      "- **template** — текст вставки в теле .md (после frontmatter)",
      "- **status: active** — блок показывается в палитре",
      ""
    ].join("\n"),
    "utf-8"
  );
}

function migrateGroups() {
  const groupsPath = path.join(TYPES_DIR, "groups.yml");
  const parsed = parseTypeYaml(fs.readFileSync(groupsPath, "utf-8"));
  const order = Array.isArray(parsed.groupOrder) ? parsed.groupOrder : [];
  const names = parsed.groupNames && typeof parsed.groupNames === "object" ? parsed.groupNames : {};
  const sortIds = [];

  order.forEach((groupId, index) => {
    const id = String(groupId).trim();
    if (!id) return;
    sortIds.push(id);
    writeMd(
      path.join(GROUPS_DIR, `${id}.md`),
      {
        id,
        created: NOW,
        updated: NOW,
        title: names[id] || id,
        sort: index + 1,
        status: "active"
      },
      `Группа палитры **${names[id] || id}**.`
    );
  });

  fs.writeFileSync(path.join(GROUPS_DIR, "sort.json"), JSON.stringify(sortIds, null, 2) + "\n", "utf-8");
  return sortIds.length;
}

function migrateBlocks() {
  const skip = new Set(["_base", "groups"]);
  const sortIds = [];
  const entries = fs
    .readdirSync(TYPES_DIR)
    .filter((name) => name.endsWith(".yml"))
    .map((name) => {
      const slug = slugFromTypeFile(name);
      const loaded = readTypeYamlWithFallback(slug);
      if (!loaded) return null;
      return { slug, schema: loaded.schema, name, raw: loaded.raw };
    })
    .filter(Boolean)
    .filter((entry) => !skip.has(entry.slug))
    .sort((a, b) => {
      const ga = String(a.schema.group || "");
      const gb = String(b.schema.group || "");
      if (ga !== gb) return ga.localeCompare(gb, "ru");
      const sa = Number(a.schema.sort) || 0;
      const sb = Number(b.schema.sort) || 0;
      if (sa !== sb) return sa - sb;
      return String(a.schema.name || a.slug).localeCompare(String(b.schema.name || b.slug), "ru");
    });

  for (const { slug, schema, raw } of entries) {
    const blockId = String(schema.id || `awn.block.${slug}`).trim();
    const template = extractTemplateFromYaml(raw, schema);
    if (!template) continue;
    sortIds.push(slug);
    writeMd(
      path.join(BLOCKS_DIR, `${slug}.md`),
      {
        id: slug,
        created: NOW,
        updated: NOW,
        title: schema.name || slug,
        blockId,
        group: schema.group || "misc",
        sort: Number(schema.sort) || 0,
        icon: schema.icon || schema.emoji || "",
        status: schema.status || "active",
        render: schema.render || "template",
        fenceTag: schema["fence-tag"] || schema.fenceTag || "",
        renderer: schema.renderer || "",
        componentPath: componentPathForSlug(slug, blockId),
        extends: schema.extends || "awn.block.base"
      },
      template
    );
  }

  fs.writeFileSync(path.join(BLOCKS_DIR, "sort.json"), JSON.stringify(sortIds, null, 2) + "\n", "utf-8");
  return sortIds.length;
}

function updateRootSort() {
  const sortPath = path.join(AWN_DATA, "sort.json");
  let order = ["agent-registry", "taxonomies"];
  if (fs.existsSync(sortPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
      if (Array.isArray(parsed)) order = parsed.map(String);
    } catch {
      // keep default
    }
  }
  if (!order.includes("markdown-blocks")) {
    order.push("markdown-blocks");
  }
  fs.writeFileSync(sortPath, JSON.stringify(order, null, 2) + "\n", "utf-8");
}

function main() {
  ensureGroupScaffold();
  ensureGroupsStoreSchema();
  ensureBlocksStoreSchema();
  const groupCount = migrateGroups();
  const blockCount = migrateBlocks();
  updateRootSort();
  console.log(`markdown-blocks: ${groupCount} groups, ${blockCount} blocks → ${GROUP_ROOT}`);
}

main();
