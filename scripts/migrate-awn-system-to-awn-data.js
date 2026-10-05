#!/usr/bin/env node
/**
 * Migrate awn-system/types/*.yml → awn-data/{domain}/*.md
 * and awn-system root config → awn-data/cms-config/
 *
 *   node scripts/migrate-awn-system-to-awn-data.js
 */
const fs = require("fs");
const path = require("path");
const { loadYamlFileSync } = require("../lib/awn/awn-yaml-utils");
const { getAgentCmsCoreAbsolute } = require("../lib/platform/platform-sources");
const { DOMAIN_TYPE_STORES, CMS_CONFIG_STORE } = require("../lib/awn/awn-data-types-bridge");

const SKIP_DOMAINS = new Set(["fields", "md-blocks", "taxonomies"]);
const FM_KEYS = new Set([
  "id",
  "name",
  "kind",
  "domain",
  "status",
  "extends",
  "slot-category",
  "storage-driver",
  "slot-order",
  "path",
  "allow-children"
]);

const STORE_META = {
  base: { name: "Базовые", description: "Базовые сущности CMS (awn.entity, awn.page.base)" },
  pages: { name: "Страницы", description: "Типы узлов дерева (awn.page.*)" },
  content: { name: "Контент", description: "Типы записей в слотах (awn.content.*)" },
  slots: { name: "Слоты", description: "Слоты хранения топика (awn.slot.*)" },
  mixins: { name: "Mixins", description: "Примеси для страниц и контента (awn.mixin.*)" },
  settings: { name: "Настройки", description: "Типы настроек (settings/*)" }
};

function listYamlFiles(dir, acc = [], relPrefix = "") {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      listYamlFiles(full, acc, rel);
      continue;
    }
    if (/\.ya?ml$/i.test(entry.name)) acc.push({ abs: full, rel });
  }
  return acc;
}

function yamlObjectToBody(obj, skipKeys) {
  const lines = [];
  for (const [key, value] of Object.entries(obj || {})) {
    if (skipKeys.has(key)) continue;
    lines.push(...serializeYamlKey(key, value, 0));
  }
  return lines.join("\n").trim();
}

function serializeYamlKey(key, value, indent) {
  const pad = " ".repeat(indent);
  if (value === null || value === undefined) return [`${pad}${key}: null`];
  if (Array.isArray(value)) {
    if (!value.length) return [`${pad}${key}: []`];
    const lines = [`${pad}${key}:`];
    for (const item of value) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        lines.push(`${pad}  -`);
        for (const [k, v] of Object.entries(item)) {
          lines.push(...serializeYamlKey(k, v, indent + 4).map((l) => l.replace(/^ {4}/, "    ")));
        }
      } else {
        lines.push(`${pad}  - ${formatScalar(item)}`);
      }
    }
    return lines;
  }
  if (typeof value === "object") {
    const lines = [`${pad}${key}:`];
    for (const [k, v] of Object.entries(value)) {
      lines.push(...serializeYamlKey(k, v, indent + 2));
    }
    return lines;
  }
  return [`${pad}${key}: ${formatScalar(value)}`];
}

function formatScalar(value) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  const text = String(value);
  if (!text) return '""';
  if (/[:#\[\]{}&,*!|>'"%@`]/.test(text) || text.includes("\n")) {
    return JSON.stringify(text);
  }
  return text;
}

function convertYamlToMd(yamlRel, yamlAbs) {
  const parsed = loadYamlFileSync(yamlAbs, { idKey: "id", nameKey: "name" });
  if (!parsed?.id) return null;

  const relParts = yamlRel.replace(/\.ya?ml$/i, "").split("/");
  const base = relParts.pop();
  let slug = base;
  if (base === "main" && relParts.length) slug = `${relParts[relParts.length - 1]}-${base}`;
  const now = new Date().toISOString();
  const fm = [
    "---",
    `id: ${slug}`,
    `created: ${JSON.stringify(now)}`,
    `updated: ${JSON.stringify(now)}`,
    `typeId: ${parsed.id}`,
    `title: ${JSON.stringify(String(parsed.name || slug))}`,
    `kind: ${parsed.kind || "type"}`,
    `domain: ${parsed.domain || ""}`,
    `status: ${parsed.status || "active"}`
  ];
  if (parsed.extends) fm.push(`extends: ${parsed.extends}`);
  for (const key of ["slot-category", "storage-driver", "slot-order", "path", "allow-children"]) {
    if (parsed[key] !== undefined) fm.push(`${key}: ${formatScalar(parsed[key])}`);
  }
  fm.push("---", "");

  const body = yamlObjectToBody(parsed, FM_KEYS);
  const mdRel = yamlRel.replace(/\.ya?ml$/i, ".md");
  return { mdRel, content: `${fm.join("\n")}${body ? `${body}\n` : ""}` };
}

function ensureStoreScaffold(awnDataRoot, storeId, meta) {
  const storeRoot = path.join(awnDataRoot, storeId);
  fs.mkdirSync(storeRoot, { recursive: true });

  const storeSchema = path.join(storeRoot, "store.yml");
  if (!fs.existsSync(storeSchema)) {
    fs.writeFileSync(
      storeSchema,
      `version: 1\nkind: collection\nid: ${storeId}\nname: ${meta.name}\ndescription: ${meta.description}\nextends: ../_base/store.yml\n\nrecord:\n  id-mode: slug\n  file: "{id}.md"\n\nfields:\n  title:\n    type: awn.string\n    title: Название\n    required: true\n  typeId:\n    type: awn.string\n    title: ID типа\n    required: true\n  kind:\n    type: awn.string\n    title: Kind\n  domain:\n    type: awn.string\n    title: Domain\n  status:\n    type: awn.enum\n    title: Статус\n    enum: [active, draft, deprecated, inactive]\n    default: active\n  extends:\n    type: awn.string\n    title: Extends\n`,
      "utf-8"
    );
  }

  const storeManifest = path.join(storeRoot, "manifest.md");
  if (!fs.existsSync(storeManifest)) {
    fs.writeFileSync(storeManifest, `# ${meta.name}\n\n${meta.description}\n`, "utf-8");
  }

  return storeRoot;
}

function migrateTypesDomain(awnDataRoot, domain, sourceDir) {
  const storeId = DOMAIN_TYPE_STORES[domain];
  if (!storeId || !fs.existsSync(sourceDir)) return 0;
  const typesRoot = ensureStoreScaffold(awnDataRoot, storeId, STORE_META[storeId]);
  let count = 0;

  for (const { abs, rel } of listYamlFiles(sourceDir)) {
    const converted = convertYamlToMd(rel, abs);
    if (!converted) continue;
    const outAbs = path.join(typesRoot, converted.mdRel);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, converted.content, "utf-8");
    count += 1;
  }
  return count;
}

function migrateCmsConfig(awnDataRoot, systemRoot) {
  const configRoot = path.join(awnDataRoot, CMS_CONFIG_STORE);
  fs.mkdirSync(configRoot, { recursive: true });

  const configSchema = path.join(configRoot, "store.yml");
  if (!fs.existsSync(configSchema)) {
    fs.writeFileSync(
      configSchema,
      `version: 1\nkind: group\nid: cms-config\nname: CMS-модель\ndescription: Registry, bindings слотов, категории слотов\n`,
      "utf-8"
    );
  }

  const copyNames = [
    "registry.yml",
    "store.yml",
    "manifest.md",
    "read.json"
  ];

  let copied = 0;
  for (const name of copyNames) {
    const src = path.join(systemRoot, name);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(configRoot, name);
    if (name === "store.yml" && fs.existsSync(dest)) continue;
    fs.copyFileSync(src, dest);
    copied += 1;
  }

  const manifestPath = path.join(configRoot, "manifest.md");
  if (!fs.existsSync(manifestPath)) {
    fs.writeFileSync(
      manifestPath,
      "# CMS-модель\n\nКонфигурация типов, слотов и registry.\n",
      "utf-8"
    );
  }

  return copied;
}

function updateAwnDataSort(awnDataRoot) {
  const sortPath = path.join(awnDataRoot, "sort.json");
  let sort = [];
  if (fs.existsSync(sortPath)) {
    try {
      sort = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
    } catch {
      sort = [];
    }
  }
  const prepend = ["cms-config", ...Object.values(DOMAIN_TYPE_STORES)];
  const next = [...prepend];
  for (const item of sort) {
    if (!next.includes(item)) next.push(item);
  }
  fs.writeFileSync(sortPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
}

function main() {
  const projectRoot = path.join(__dirname, "..");
  const coreRoot = getAgentCmsCoreAbsolute(projectRoot);
  const systemRoot = path.join(coreRoot, "awn-system");
  const typesRoot = path.join(systemRoot, "types");
  const awnDataRoot = path.join(coreRoot, "awn-data");

  if (!fs.existsSync(typesRoot)) {
    console.error("Source not found:", typesRoot);
    process.exit(1);
  }

  let totalTypes = 0;
  for (const domain of Object.keys(DOMAIN_TYPE_STORES)) {
    const sourceDir = path.join(typesRoot, domain);
    const count = migrateTypesDomain(awnDataRoot, domain, sourceDir);
    if (count) console.log(`${domain}: ${count} types → awn-data/${DOMAIN_TYPE_STORES[domain]}/`);
    totalTypes += count;
  }

  const configCount = migrateCmsConfig(awnDataRoot, systemRoot);
  updateAwnDataSort(awnDataRoot);

  console.log(`\nMigrated ${totalTypes} type records, ${configCount} config files → awn-data/`);
}

main();
