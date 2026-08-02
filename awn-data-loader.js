const fs = require("fs");
const path = require("path");
const { parseTypeYaml } = require("./awn-yaml-utils");

const AWN_DATA_DIR = "awn-data";
const SCHEMA_FILE = "configuration-schema.yml";
const COLLECTION_MANIFEST = "manifest.md";
const SINGLETON_RECORD = "main.md";
const SKIP_DIRS = new Set(["_base", ".awn-cache", "history"]);

const STORE_KINDS = new Set(["collection", "singleton"]);

function splitFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: text.trim() };
  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon <= 0) continue;
    const key = trimmed.slice(0, colon).trim();
    frontmatter[key] = trimmed.slice(colon + 1).trim().replace(/^["']|["']$/g, "");
  }
  return { frontmatter, body: match[2].trim() };
}

function resolveAgentRootAbsolute(agentRoot, projectRoot = process.cwd()) {
  const raw = String(agentRoot || "").trim();
  if (!raw) return "";
  return path.isAbsolute(raw) ? raw : path.join(projectRoot, raw);
}

function getAwnDataRoot(agentRoot, projectRoot = process.cwd()) {
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot, projectRoot);
  if (!agentRootAbs) return "";
  return path.join(agentRootAbs, AWN_DATA_DIR);
}

function readSchemaFile(schemaPath) {
  if (!fs.existsSync(schemaPath)) return null;
  try {
    return parseTypeYaml(fs.readFileSync(schemaPath, "utf-8"));
  } catch {
    return null;
  }
}

function readSortJson(dirPath) {
  const sortPath = path.join(dirPath, "sort.json");
  if (!fs.existsSync(sortPath)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
    return Array.isArray(parsed) ? parsed.map(String) : null;
  } catch {
    return null;
  }
}

function isRecordFile(name, kind) {
  const lower = name.toLowerCase();
  if (!lower.endsWith(".md")) return false;
  if (lower === COLLECTION_MANIFEST) return false;
  if (kind === "singleton" && lower !== SINGLETON_RECORD) return false;
  if (kind === "collection" && lower === SINGLETON_RECORD) return false;
  return true;
}

function listRecordFiles(dirPath, kind, relPrefix = "", acc = []) {
  if (!fs.existsSync(dirPath)) return acc;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      listRecordFiles(fullPath, kind, path.posix.join(relPrefix, entry.name), acc);
      continue;
    }
    if (!isRecordFile(entry.name, kind)) continue;
    acc.push({
      absPath: fullPath,
      fileName: entry.name,
      relPath: path.posix.join(relPrefix, entry.name).replace(/\\/g, "/")
    });
  }
  return acc;
}

function parseRecordFile(fileEntry, storeRel) {
  const raw = fs.readFileSync(fileEntry.absPath, "utf-8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const id =
    String(frontmatter.id || "").trim() ||
    path.basename(fileEntry.fileName, path.extname(fileEntry.fileName));
  const parent = String(frontmatter.parent || "").trim();
  const pathParent = path.dirname(fileEntry.relPath);
  const inferredParent =
    pathParent && pathParent !== "." ? path.basename(pathParent) : "";

  return {
    id,
    parent: parent || inferredParent || null,
    relPath: `${storeRel}/${fileEntry.relPath}`.replace(/\\/g, "/"),
    fileName: fileEntry.fileName,
    frontmatter,
    body,
    title: String(frontmatter.title || frontmatter.label || frontmatter.name || id).trim()
  };
}

function buildRecordTree(records) {
  const byId = new Map(records.map((r) => [r.id, { ...r, children: [] }]));
  const roots = [];
  for (const record of byId.values()) {
    const parentId = record.parent;
    if (parentId && byId.has(parentId) && parentId !== record.id) {
      byId.get(parentId).children.push(record);
    } else {
      roots.push(record);
    }
  }
  const strip = (node) => ({
    id: node.id,
    parent: node.parent,
    relPath: node.relPath,
    title: node.title,
    frontmatter: node.frontmatter,
    children: node.children.map(strip)
  });
  return roots.map(strip);
}

function discoverStoreDirs(dataRoot, acc = [], rel = "") {
  if (!dataRoot || !fs.existsSync(dataRoot)) return acc;
  const schemaPath = path.join(dataRoot, SCHEMA_FILE);
  if (fs.existsSync(schemaPath)) {
    acc.push({ absPath: dataRoot, relPath: rel.replace(/\\/g, "/") || path.basename(dataRoot) });
  }
  for (const entry of fs.readdirSync(dataRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
    const childRel = rel ? path.posix.join(rel, entry.name) : entry.name;
    discoverStoreDirs(path.join(dataRoot, entry.name), acc, childRel);
  }
  return acc;
}

function loadStore(dataRoot, storeEntry) {
  const storeAbs = storeEntry.absPath;
  const storeRel = storeEntry.relPath;
  const schema = readSchemaFile(path.join(storeAbs, SCHEMA_FILE));
  if (!schema) return null;

  const kind = String(schema.kind || "collection").trim();
  if (!STORE_KINDS.has(kind)) return null;

  const id = String(schema.id || storeRel).trim();
  const name = String(schema.name || id).trim();
  const sortOrder = readSortJson(storeAbs);

  let manifestDescription = "";
  let manifestMarkdown = "";
  const manifestPath = path.join(storeAbs, COLLECTION_MANIFEST);
  if (fs.existsSync(manifestPath)) {
    const { body } = splitFrontmatter(fs.readFileSync(manifestPath, "utf-8"));
    manifestMarkdown = String(body || "").trim();
    manifestDescription = manifestMarkdown.split("\n")[0]?.replace(/^#\s*/, "").trim() || "";
  }

  const recordFiles = listRecordFiles(storeAbs, kind);
  const records = recordFiles.map((f) => parseRecordFile(f, storeRel));

  const payload = {
    id,
    relPath: storeRel,
    kind,
    name,
    description: String(schema.description || manifestDescription || "").trim(),
    manifestMarkdown,
    manifestRelPath: `${storeRel}/${COLLECTION_MANIFEST}`.replace(/\\/g, "/"),
    schema,
    sortOrder,
    recordCount: records.length,
    recordFile: kind === "singleton" ? SINGLETON_RECORD : null
  };

  if (kind === "singleton") {
    const main = records.find((r) => r.fileName === SINGLETON_RECORD) || records[0] || null;
    payload.record = main;
    payload.records = main ? [main] : [];
  } else {
    payload.records = records;
    payload.tree = buildRecordTree(records);
  }

  return payload;
}

function loadAwnDataStores(agentRoot, projectRoot = process.cwd()) {
  const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
  if (!dataRoot || !fs.existsSync(dataRoot)) {
    return { root: dataRoot, stores: [] };
  }

  const discovered = discoverStoreDirs(dataRoot);
  const stores = discovered
    .map((entry) => loadStore(dataRoot, entry))
    .filter(Boolean)
    .sort((a, b) => a.relPath.localeCompare(b.relPath, "ru"));

  return {
    specVersion: "0.2",
    model: "awn-data",
    root: dataRoot.replace(/\\/g, "/"),
    storeCount: stores.length,
    stores
  };
}

function getAwnDataPayload(agentRoot, projectRoot = process.cwd(), storeId = "") {
  const payload = loadAwnDataStores(agentRoot, projectRoot);
  const filter = String(storeId || "").trim();
  if (!filter) return payload;

  const store = payload.stores.find(
    (s) => s.id === filter || s.relPath === filter || s.relPath.endsWith(`/${filter}`)
  );
  if (!store) {
    return { ...payload, store: null, error: "store not found" };
  }
  return { ...payload, store };
}

const BASE_SCHEMA_TEMPLATE = `version: 1
layer: awn-data-base
description: Базовые поля каждой записи в awn-data

fields:
  id:
    type: awn.string
    title: ID
    locked: true
  created:
    type: awn.datetime
    title: Создано
  updated:
    type: awn.datetime
    title: Обновлено
`;

function nowIsoMinute() {
  return new Date().toISOString().slice(0, 16);
}

function normalizeStoreSlug(slug) {
  const raw = String(slug || "")
    .trim()
    .toLowerCase()
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
  if (!raw || raw.includes("..")) return "";
  const segments = raw.split("/").filter(Boolean);
  if (!segments.length) return "";
  for (const seg of segments) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(seg)) return "";
  }
  return segments.join("/");
}

function slugifyStoreName(name) {
  const map = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i",
    й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t",
    у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "",
    э: "e", ю: "yu", я: "ya"
  };
  const text = String(name || "")
    .trim()
    .toLowerCase()
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  return text || "store";
}

function ensureAwnDataBase(agentRoot, projectRoot = process.cwd()) {
  const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
  if (!dataRoot) throw new Error("Agent root not set");
  fs.mkdirSync(dataRoot, { recursive: true });
  const baseDir = path.join(dataRoot, "_base");
  fs.mkdirSync(baseDir, { recursive: true });
  const baseSchemaPath = path.join(baseDir, SCHEMA_FILE);
  if (!fs.existsSync(baseSchemaPath)) {
    fs.writeFileSync(baseSchemaPath, BASE_SCHEMA_TEMPLATE, "utf-8");
  }
  return dataRoot;
}

function getStoreAbsolutePath(dataRoot, storeRel) {
  const normalized = normalizeStoreSlug(storeRel);
  if (!normalized) return null;
  const abs = path.join(dataRoot, normalized);
  if (!abs.startsWith(dataRoot)) return null;
  return abs;
}

function storeSchemaExists(dataRoot, storeRel) {
  const abs = getStoreAbsolutePath(dataRoot, storeRel);
  return Boolean(abs && fs.existsSync(path.join(abs, SCHEMA_FILE)));
}

function appendRootSortEntry(dataRoot, storeRel) {
  const sortPath = path.join(dataRoot, "sort.json");
  let order = [];
  if (fs.existsSync(sortPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
      if (Array.isArray(parsed)) order = parsed.map(String);
    } catch {
      order = [];
    }
  }
  const top = storeRel.split("/")[0];
  if (!order.includes(top)) order.push(top);
  fs.writeFileSync(sortPath, `${JSON.stringify(order, null, 2)}\n`, "utf-8");
}

function buildCollectionSchemaContent({ slug, name, description, hierarchy = true }) {
  const extendsPath =
    slug.includes("/") ? "../".repeat(slug.split("/").length) + "_base/configuration-schema.yml" : "../_base/configuration-schema.yml";
  const desc = String(description || name || slug).trim();
  return `version: 1
kind: collection
id: ${slug.replace(/\//g, ".")}
name: ${name || slug}
extends: ${extendsPath}
description: ${desc}

record:
  id-mode: numeric
  file: "{id}.md"
  hierarchy: ${hierarchy ? "true" : "false"}

fields:
  title:
    type: awn.string
    title: Название
    required: true
  parent:
    type: awn.string
    title: Родитель
    description: id родительской записи
  status:
    type: awn.enum
    title: Статус
    enum: [open, done]
    default: open
`;
}

function buildSingletonSchemaContent({ slug, name, description }) {
  const extendsPath =
    slug.includes("/") ? "../".repeat(slug.split("/").length) + "_base/configuration-schema.yml" : "../_base/configuration-schema.yml";
  return `version: 1
kind: singleton
id: ${slug.replace(/\//g, ".")}
name: ${name || slug}
extends: ${extendsPath}
description: ${String(description || name || slug).trim()}

record:
  file: main.md

fields:
  note:
    type: awn.string
    title: Заметка
`;
}

function buildRecordMarkdown({ id, title, parent, extra = {} }) {
  const lines = ["---", `id: "${id}"`];
  if (parent) lines.push(`parent: "${parent}"`);
  const ts = nowIsoMinute();
  lines.push(`created: "${ts}"`, `updated: "${ts}"`);
  if (title) lines.push(`title: ${title}`);
  for (const [key, value] of Object.entries(extra)) {
    if (["id", "parent", "created", "updated", "title"].includes(key)) continue;
    lines.push(`${key}: ${value}`);
  }
  lines.push("---", "", title ? `${title}.` : "");
  return `${lines.join("\n")}\n`;
}

function createAwnDataStore(agentRoot, projectRoot, options = {}) {
  const kind = String(options.kind || "collection").trim();
  if (!STORE_KINDS.has(kind)) throw new Error("kind must be collection or singleton");

  const slug = normalizeStoreSlug(options.slug || slugifyStoreName(options.name));
  if (!slug) throw new Error("Invalid store slug (use kebab-case, optional subfolder: taxonomies/tags)");

  const dataRoot = ensureAwnDataBase(agentRoot, projectRoot);
  if (storeSchemaExists(dataRoot, slug)) {
    throw new Error(`Store already exists: ${slug}`);
  }

  const storeAbs = getStoreAbsolutePath(dataRoot, slug);
  fs.mkdirSync(storeAbs, { recursive: true });

  const name = String(options.name || slug).trim();
  const description = String(options.description || "").trim();

  if (kind === "collection") {
    const manifestText = description.trim() || `Коллекция \`${slug}\`.`;
    fs.writeFileSync(path.join(storeAbs, COLLECTION_MANIFEST), `# ${name}\n\n${manifestText}\n`, "utf-8");
    fs.writeFileSync(
      path.join(storeAbs, SCHEMA_FILE),
      buildCollectionSchemaContent({ slug, name, description, hierarchy: options.hierarchy !== false }),
      "utf-8"
    );
    fs.writeFileSync(path.join(storeAbs, "sort.json"), "[]\n", "utf-8");
    if (options.withSampleRecord !== false) {
      const recordContent = buildRecordMarkdown({ id: "1", title: "Первая запись" });
      fs.writeFileSync(path.join(storeAbs, "1.md"), recordContent, "utf-8");
      fs.writeFileSync(path.join(storeAbs, "sort.json"), `${JSON.stringify(["1"], null, 2)}\n`, "utf-8");
    }
  } else {
    const manifestText = description.trim() || `Одиночка \`${slug}\` — одна запись в \`main.md\`.`;
    fs.writeFileSync(path.join(storeAbs, COLLECTION_MANIFEST), `# ${name}\n\n${manifestText}\n`, "utf-8");
    fs.writeFileSync(
      path.join(storeAbs, SCHEMA_FILE),
      buildSingletonSchemaContent({ slug, name, description }),
      "utf-8"
    );
    const recordContent = buildRecordMarkdown({
      id: slug.replace(/\//g, "."),
      title: name,
      extra: { note: "" }
    });
    fs.writeFileSync(path.join(storeAbs, SINGLETON_RECORD), recordContent, "utf-8");
  }

  if (!slug.includes("/")) {
    appendRootSortEntry(dataRoot, slug);
  }

  const payload = getAwnDataPayload(agentRoot, projectRoot, slug);
  return payload.store || { id: slug, relPath: slug, kind };
}

function resolveNextNumericRecordId(records) {
  let max = 0;
  for (const record of records) {
    const n = Number(record.id);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}

function createAwnDataRecord(agentRoot, projectRoot, options = {}) {
  const storeRel = normalizeStoreSlug(options.store || options.storeRel || "");
  if (!storeRel) throw new Error("store is required");

  const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
  const storeAbs = getStoreAbsolutePath(dataRoot, storeRel);
  if (!storeAbs || !fs.existsSync(path.join(storeAbs, SCHEMA_FILE))) {
    throw new Error("Store not found");
  }

  const schema = readSchemaFile(path.join(storeAbs, SCHEMA_FILE));
  const kind = String(schema?.kind || "collection").trim();
  if (kind === "singleton") throw new Error("Cannot add records to singleton (edit main.md)");

  const payload = getAwnDataPayload(agentRoot, projectRoot, storeRel);
  const store = payload.store;
  if (!store) throw new Error("Store not found");

  const idMode = String(schema?.record?.["id-mode"] || schema?.record?.idMode || "numeric").trim();
  let id = String(options.id || "").trim();
  if (!id) {
    id = idMode === "numeric" ? resolveNextNumericRecordId(store.records || []) : slugifyStoreName(options.title || "record");
  }

  const parent = String(options.parent || "").trim();
  const title = String(options.title || id).trim();
  const hierarchy = schema?.record?.hierarchy !== false;

  let relFile = `${id}.md`;
  let absFile = path.join(storeAbs, relFile);
  if (parent && hierarchy) {
    relFile = path.posix.join(parent, `${id}.md`);
    absFile = path.join(storeAbs, parent, `${id}.md`);
    fs.mkdirSync(path.dirname(absFile), { recursive: true });
  }

  if (fs.existsSync(absFile)) throw new Error(`Record already exists: ${id}`);

  const content = buildRecordMarkdown({ id, title, parent: parent || null });
  fs.writeFileSync(absFile, content, "utf-8");

  const sortPath = path.join(storeAbs, "sort.json");
  if (fs.existsSync(sortPath) && !parent) {
    try {
      const order = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
      if (Array.isArray(order) && !order.includes(id)) {
        order.push(id);
        fs.writeFileSync(sortPath, `${JSON.stringify(order, null, 2)}\n`, "utf-8");
      }
    } catch {
      // ignore sort errors
    }
  }

  return getAwnDataPayload(agentRoot, projectRoot, storeRel).store;
}

module.exports = {
  AWN_DATA_DIR,
  SCHEMA_FILE,
  SINGLETON_RECORD,
  getAwnDataRoot,
  loadAwnDataStores,
  getAwnDataPayload,
  buildRecordTree,
  normalizeStoreSlug,
  slugifyStoreName,
  ensureAwnDataBase,
  createAwnDataStore,
  createAwnDataRecord
};
