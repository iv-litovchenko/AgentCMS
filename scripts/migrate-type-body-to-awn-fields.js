#!/usr/bin/env node
/**
 * Migrate type-definition body schemas: fields/properties → awn-fields
 * Skips field-def/main.md (meta properties) and entities/table.base.md (store meta doc)
 */
const fs = require("fs");
const path = require("path");

const AWN_DATA = path.join(process.cwd(), "workspaces/agent-cms-core/awn-data");

const SKIP = new Set([
  "cms-base/entities/table.base.md"
]);

function splitMd(raw) {
  const m = String(raw).match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return null;
  return { front: m[1], body: m[2] };
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name.startsWith(".") || name.name === "history") continue;
    const abs = path.join(dir, name.name);
    if (name.isDirectory()) walk(abs, out);
    else if (name.name.endsWith(".md") && name.name !== "manifest.md") out.push(abs);
  }
  return out;
}

function renameFieldLabels(block) {
  return block.replace(/^(\s+)name:/gm, "$1title:");
}

function migrateBody(body) {
  let text = String(body || "");
  let changed = false;

  if (/^fields:\s*$/m.test(text) || /^fields:\r?\n/m.test(text)) {
    text = text.replace(/^fields:\s*$/m, "awn-fields:");
    text = text.replace(/^fields:\r?\n/m, "awn-fields:\n");
    changed = true;
  }

  if (/^properties:\s*$/m.test(text) || /^properties:\r?\n/m.test(text)) {
    text = text.replace(/^properties:\s*$/m, "awn-fields:");
    text = text.replace(/^properties:\r?\n/m, "awn-fields:\n");
    changed = true;
  }

  if (text.includes("awn-fields:")) {
    const parts = text.split(/^(awn-fields:\s*\n)/m);
    if (parts.length >= 3) {
      const head = parts[0];
      const key = parts[1];
      const block = parts.slice(2).join("");
      const nextBlock = renameFieldLabels(block);
      if (nextBlock !== block) {
        text = head + key + nextBlock;
        changed = true;
      }
    }
  }

  return { text, changed };
}

function migrateSlotsBase(body) {
  // Normalize keys to awn-* and awn.field.* types
  return `description: Базовый тип слоя памяти у топика
awn-fields:
  awn-storage-driver:
    type: awn.field.choice.one
    title: Драйвер памяти
    description: internal — однофайловая; external — многофайловая; tabular — таблица
    enum:
      - internal
      - external
      - tabular
    default: external
  awn-path:
    type: awn.field.string
    title: Путь
    description: "Подпапка узла (например inbox/)"
    required: true
  awn-allowed-content:
    type: awn.field.array
    title: Разрешённый контент
    description: Какие content-типы можно класть в слот
    items: awn.field.string
  awn-accept-files:
    type: awn.field.array
    title: Принимаемые файлы
    description: "Расширения (.md, .png…)"
    items: awn.field.string
  awn-slot-category:
    type: awn.field.choice.one
    title: Категория
    enum:
      - memory
      - files
      - single-file
      - records
      - communication
  awn-slot-order:
    type: awn.field.integer
    title: Порядок
  awn-slot-tier:
    type: awn.field.choice.one
    title: Уровень
    enum:
      - user
      - system
`;
}

function migrateSettingsBase(body) {
  return `description: Базовый тип настройки
awn-fields:
  awn-scope:
    type: awn.field.choice.one
    title: Область
    description: К чему относится настройка
    enum:
      - agent
      - workspace
      - ui
    default: agent
  awn-value:
    type: awn.field.string
    title: Значение
  awn-enabled:
    type: awn.field.boolean
    title: Включено
    default: true
`;
}

function main() {
  let count = 0;
  for (const abs of walk(AWN_DATA)) {
    const rel = path.relative(AWN_DATA, abs).replace(/\\/g, "/");
    if (SKIP.has(rel)) continue;

    const parts = splitMd(fs.readFileSync(abs, "utf8"));
    if (!parts) continue;

    let body = parts.body;
    if (rel === "slots/base.md") {
      body = migrateSlotsBase(body);
      count += 1;
    } else if (rel === "settings/base.md") {
      body = migrateSettingsBase(body);
      count += 1;
    } else {
      const { text, changed } = migrateBody(body);
      if (!changed) continue;
      body = text;
      count += 1;
    }

    fs.writeFileSync(abs, `---\n${parts.front}\n---\n${body}`, "utf8");
    console.log("updated:", rel);
  }
  console.log(`Done. ${count} file(s).`);
}

main();
