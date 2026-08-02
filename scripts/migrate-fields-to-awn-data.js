#!/usr/bin/env node
/**
 * Refresh awn-data/editing-fields from awn-system/types/fields/*.yml
 * Primary source of truth: awn-data/editing-fields/ (edit records directly).
 */
const fs = require("fs");
const path = require("path");
const { loadYamlFileSync } = require("../awn-yaml-utils");

const CORE = path.join(__dirname, "../workspaces/agent-cms-core");
const SRC = path.join(CORE, "awn-system/types/fields");
const ROOT = path.join(CORE, "awn-data/editing-fields");
const now = new Date().toISOString();

const groups = [
  { id: "text", title: "Текст", sort: 1 },
  { id: "numbers", title: "Числа", sort: 2 },
  { id: "choice", title: "Выбор", sort: 3 },
  { id: "datetime", title: "Дата и время", sort: 4 },
  { id: "media", title: "Медиа", sort: 5 },
  { id: "structure", title: "Структура", sort: 6 }
];

const groupMap = {
  string: "text", text: "text", markdown: "text", slug: "text", email: "text",
  integer: "numbers", number: "numbers",
  boolean: "choice", enum: "choice", array: "choice", tags: "choice",
  date: "datetime", datetime: "datetime",
  file: "media", image: "media", color: "media",
  json: "structure", relation: "structure", link: "structure", url: "structure"
};

const sortInGroup = {};
function nextSort(group) {
  sortInGroup[group] = (sortInGroup[group] || 0) + 1;
  return sortInGroup[group];
}

for (const g of groups) {
  const content = `---\nid: ${g.id}\ncreated: "${now}"\nupdated: "${now}"\ntitle: ${g.title}\nsort: ${g.sort}\nstatus: active\n---\n\nГруппа типов полей **${g.title}**.\n`;
  fs.writeFileSync(path.join(ROOT, "groups", `${g.id}.md`), content);
}

const fieldIds = [];
for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith(".yml") && f !== "_base.yml").sort()) {
  const slug = file.replace(/\.ya?ml$/i, "");
  const parsed = loadYamlFileSync(path.join(SRC, file), {});
  const group = groupMap[slug] || "structure";
  const settings = Array.isArray(parsed.settings) ? parsed.settings.join(", ") : "";
  const lines = [
    "---",
    `id: ${slug}`,
    `created: "${now}"`,
    `updated: "${now}"`,
    `title: ${parsed.name || slug}`,
    `fieldId: ${parsed.id}`,
    `group: ${group}`,
    `sort: ${nextSort(group)}`,
    `widget: ${parsed.widget || "input"}`,
    `storage: ${parsed.storage || "string"}`,
    `mdbase: ${parsed.mdbase || "string"}`
  ];
  if (parsed.format) lines.push(`format: ${parsed.format}`);
  lines.push(`extends: ${parsed.extends || "awn.field.base"}`);
  if (settings) lines.push(`settings: ${settings}`);
  lines.push("status: active", "---", "", String(parsed.description || "").trim(), "");
  fs.writeFileSync(path.join(ROOT, "fields", `${slug}.md`), lines.join("\n"));
  fieldIds.push(slug);
}

fs.writeFileSync(path.join(ROOT, "fields", "sort.json"), `${JSON.stringify(fieldIds, null, 2)}\n`);

const base = loadYamlFileSync(path.join(SRC, "_base.yml"), {});
const propsYaml = `properties:\n${Object.entries(base.properties || {})
  .map(([k, v]) => {
    const inner = Object.entries(v)
      .map(([pk, pv]) => {
        if (pv === true || pv === false) return `    ${pk}: ${pv}`;
        if (typeof pv === "number") return `    ${pk}: ${pv}`;
        return `    ${pk}: ${JSON.stringify(String(pv))}`;
      })
      .join("\n");
    return `  ${k}:\n${inner}`;
  })
  .join("\n")}\n`;

const fieldDef = `---\nid: field-def\ncreated: "${now}"\nupdated: "${now}"\ntitle: ${base.name || "База поля"}\nfieldId: ${base.id}\nextends: ${base.extends || "awn.entity"}\nstatus: active\n---\n\n${base.description || ""}\n\n${propsYaml}`;
fs.writeFileSync(path.join(ROOT, "field-def", "main.md"), fieldDef);

console.log(`editing-fields: ${groups.length} groups, ${fieldIds.length} fields → ${ROOT}`);
