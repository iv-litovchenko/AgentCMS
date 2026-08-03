const fs = require("fs");
const path = require("path");
const { parseTypeYaml } = require("./awn-yaml-utils");
const { getAgentCmsCoreAbsolute } = require("./platform-sources");
const {
  getRecordStorage,
  getCsvFileName,
  getCsvColumnsFromSchema,
  loadCsvRecords,
  appendCsvRecord,
  serializeCsv
} = require("./awn-data-csv");

const AWN_DATA_DIR = "awn-data";
const STORE_FILE = "store.yml";
/** @deprecated use STORE_FILE */
const SCHEMA_FILE = STORE_FILE;
const LEGACY_STORE_FILE = "configuration-schema.yml";
const COLLECTION_MANIFEST = "manifest.md";
const SINGLETON_RECORD = "main.md";
const SKIP_DIRS = new Set(["_base", ".awn-cache", "history"]);

const STORE_KINDS = new Set(["collection", "singleton", "group"]);

/** Порядок в sidebar «Накопители»: группы → коллекции → одиночки. */
const AWN_DATA_STORE_KIND_ORDER = { group: 0, collection: 1, singleton: 2 };

function awnDataStoreKindRank(kind) {
  return Object.prototype.hasOwnProperty.call(AWN_DATA_STORE_KIND_ORDER, kind)
    ? AWN_DATA_STORE_KIND_ORDER[kind]
    : 1;
}

function compareAwnDataStoresTopLevel(a, b, rootSort = null) {
  const kindDiff = awnDataStoreKindRank(a.kind) - awnDataStoreKindRank(b.kind);
  if (kindDiff !== 0) return kindDiff;

  if (rootSort?.length) {
    const aKey = a.relPath.split("/")[0];
    const bKey = b.relPath.split("/")[0];
    const ai = rootSort.indexOf(aKey);
    const bi = rootSort.indexOf(bKey);
    if (ai !== -1 || bi !== -1) {
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      if (ai !== bi) return ai - bi;
    }
  }

  const aName = String(a.name || a.relPath);
  const bName = String(b.name || b.relPath);
  return aName.localeCompare(bName, "ru", { sensitivity: "base" });
}

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

function mergeRecordBodyFields(frontmatter, body) {
  const merged = { ...(frontmatter || {}) };
  const text = String(body || "").trim();
  if (!text) return merged;
  let bodyData = {};
  try {
    bodyData = parseTypeYaml(text) || {};
  } catch {
    return merged;
  }
  for (const [key, value] of Object.entries(bodyData)) {
    if (key === "properties") continue;
    const existing = merged[key];
    if (existing !== undefined && existing !== null && String(existing).trim() !== "") continue;
    merged[key] = value;
  }
  return merged;
}

function parseRecordFile(fileEntry, storeRel) {
  const raw = fs.readFileSync(fileEntry.absPath, "utf-8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const mergedFrontmatter = mergeRecordBodyFields(frontmatter, body);
  const id =
    String(mergedFrontmatter.id || frontmatter.id || "").trim() ||
    path.basename(fileEntry.fileName, path.extname(fileEntry.fileName));
  const parent = String(mergedFrontmatter.parent || frontmatter.parent || "").trim();
  const pathParent = path.dirname(fileEntry.relPath);
  const inferredParent =
    pathParent && pathParent !== "." ? path.basename(pathParent) : "";

  return {
    id,
    parent: parent || inferredParent || null,
    relPath: `${storeRel}/${fileEntry.relPath}`.replace(/\\/g, "/"),
    fileName: fileEntry.fileName,
    frontmatter: mergedFrontmatter,
    body,
    title: String(
      mergedFrontmatter.title || mergedFrontmatter.label || mergedFrontmatter.name || id
    ).trim()
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

function resolveStoreSchemaPath(storeAbs) {
  const storePath = path.join(storeAbs, STORE_FILE);
  if (fs.existsSync(storePath)) return storePath;
  const legacyPath = path.join(storeAbs, LEGACY_STORE_FILE);
  if (fs.existsSync(legacyPath)) return legacyPath;
  return storePath;
}

function discoverStoreDirs(dataRoot, acc = [], rel = "") {
  if (!dataRoot || !fs.existsSync(dataRoot)) return acc;
  const schemaPath = resolveStoreSchemaPath(dataRoot);
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
  const schema = readSchemaFile(resolveStoreSchemaPath(storeAbs));
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

  const recordStorage = kind === "collection" ? getRecordStorage(schema) : "md";
  let records = [];
  if (kind !== "group") {
    if (kind === "collection" && recordStorage === "csv") {
      records = loadCsvRecords(storeAbs, storeRel, schema);
    } else {
      const recordFiles = listRecordFiles(storeAbs, kind);
      records = recordFiles.map((f) => parseRecordFile(f, storeRel));
    }
  }

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
    recordStorage,
    recordCount: kind === "group" ? 0 : records.length,
    recordFile:
      kind === "singleton"
        ? SINGLETON_RECORD
        : kind === "collection" && recordStorage === "csv"
          ? getCsvFileName(schema)
          : null
  };

  if (kind === "group") {
    payload.children = [];
    payload.childCount = 0;
    return payload;
  }

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

function organizeAwnDataStores(stores, dataRoot) {
  if (!stores.length) return [];

  const byRel = new Map(stores.map((s) => [s.relPath, s]));
  const groupRels = new Set(stores.filter((s) => s.kind === "group").map((s) => s.relPath));
  const topLevel = [];

  for (const store of stores) {
    if (store.kind === "group") {
      store.children = [];
      continue;
    }
    const slash = store.relPath.indexOf("/");
    if (slash > 0) {
      const parentRel = store.relPath.slice(0, slash);
      if (groupRels.has(parentRel)) {
        const group = byRel.get(parentRel);
        if (group) {
          group.children.push(store);
          continue;
        }
      }
    }
    topLevel.push(store);
  }

  for (const group of stores.filter((s) => s.kind === "group")) {
    const groupSort = readSortJson(path.join(dataRoot, group.relPath));
    if (groupSort?.length && group.children.length) {
      group.children.sort((a, b) => {
        const aSlug = a.relPath.split("/").pop();
        const bSlug = b.relPath.split("/").pop();
        const ai = groupSort.indexOf(aSlug);
        const bi = groupSort.indexOf(bSlug);
        if (ai === -1 && bi === -1) return String(a.name).localeCompare(String(b.name), "ru");
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    } else {
      group.children.sort((a, b) => String(a.name).localeCompare(String(b.name), "ru"));
    }
    group.childCount = group.children.length;
    group.recordCount = group.children.reduce((sum, child) => sum + (Number(child.recordCount) || 0), 0);
    topLevel.push(group);
  }

  const rootSort = readSortJson(dataRoot);
  topLevel.sort((a, b) => compareAwnDataStoresTopLevel(a, b, rootSort));

  return topLevel;
}

function loadAwnDataStores(agentRoot, projectRoot = process.cwd()) {
  const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
  if (!dataRoot || !fs.existsSync(dataRoot)) {
    return { root: dataRoot, stores: [] };
  }

  const discovered = discoverStoreDirs(dataRoot);
  const flatStores = discovered.map((entry) => loadStore(dataRoot, entry)).filter(Boolean);
  const stores = organizeAwnDataStores(flatStores, dataRoot);

  return {
    specVersion: "0.2",
    model: "awn-data",
    root: dataRoot.replace(/\\/g, "/"),
    storeCount: stores.length,
    stores
  };
}

function findAwnDataStore(stores, filter) {
  const needle = String(filter || "").trim();
  if (!needle) return null;

  function walk(list) {
    for (const store of list || []) {
      if (store.id === needle || store.relPath === needle || store.relPath.endsWith(`/${needle}`)) {
        return store;
      }
      if (store.kind === "group" && store.children?.length) {
        const nested = walk(store.children);
        if (nested) return nested;
      }
    }
    return null;
  }

  return walk(stores);
}

function resolveAwnDataReadRoot(agentRoot, projectRoot = process.cwd()) {
  const agentRootAbs = resolveAgentRootAbsolute(agentRoot, projectRoot);
  if (!agentRootAbs) {
    return { readRoot: "", source: "agent", sourceAgentId: "", payload: { stores: [], storeCount: 0 } };
  }

  const agentPayload = loadAwnDataStores(agentRootAbs, projectRoot);
  if (agentPayload.storeCount > 0) {
    return {
      readRoot: agentRootAbs,
      source: "agent",
      sourceAgentId: path.basename(agentRootAbs),
      payload: agentPayload
    };
  }

  const coreRoot = getAgentCmsCoreAbsolute(projectRoot);
  if (coreRoot && path.resolve(coreRoot) !== path.resolve(agentRootAbs)) {
    const corePayload = loadAwnDataStores(coreRoot, projectRoot);
    if (corePayload.storeCount > 0) {
      return {
        readRoot: coreRoot,
        source: "platform",
        sourceAgentId: path.basename(coreRoot),
        payload: corePayload
      };
    }
  }

  return {
    readRoot: agentRootAbs,
    source: "agent",
    sourceAgentId: path.basename(agentRootAbs),
    payload: agentPayload
  };
}

function getAwnDataPayload(agentRoot, projectRoot = process.cwd(), storeId = "") {
  const resolved = resolveAwnDataReadRoot(agentRoot, projectRoot);
  const payload = resolved.payload || loadAwnDataStores(resolved.readRoot || agentRoot, projectRoot);
  const filter = String(storeId || "").trim();

  const enriched = {
    ...payload,
    source: resolved.source,
    sourceAgentId: resolved.sourceAgentId,
    readRoot: String(resolved.readRoot || "").replace(/\\/g, "/")
  };

  if (!filter) return enriched;

  const store = findAwnDataStore(enriched.stores, filter);
  if (!store) {
    return { ...enriched, store: null, error: "store not found" };
  }
  return { ...enriched, store };
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
  const baseSchemaPath = path.join(baseDir, STORE_FILE);
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
  return Boolean(abs && fs.existsSync(resolveStoreSchemaPath(abs)));
}

function appendGroupSortEntry(dataRoot, groupRel, childSlug) {
  const groupAbs = getStoreAbsolutePath(dataRoot, groupRel);
  if (!groupAbs) return;
  const sortPath = path.join(groupAbs, "sort.json");
  let order = [];
  if (fs.existsSync(sortPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
      if (Array.isArray(parsed)) order = parsed.map(String);
    } catch {
      order = [];
    }
  }
  const slug = String(childSlug || "").trim();
  if (slug && !order.includes(slug)) {
    order.push(slug);
    fs.writeFileSync(sortPath, `${JSON.stringify(order, null, 2)}\n`, "utf-8");
  }
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
    slug.includes("/") ? "../".repeat(slug.split("/").length) + "_base/store.yml" : "../_base/store.yml";
  const desc = String(description || name || slug).trim();
  return `version: 1
kind: collection
id: ${slug.replace(/\//g, ".")}
name: ${name || slug}
extends: ${extendsPath}
description: ${desc}

record:
  storage: md
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

function buildTaxonomyCollectionSchemaContent({ slug, name, description }) {
  const depth = slug.split("/").length;
  const extendsPath = `${ "../".repeat(depth) }_base/store.yml`;
  const id = slug.replace(/\//g, ".");
  const shortName = name || slug.split("/").pop();
  const desc = String(description || shortName).trim();
  return `version: 1
kind: collection
id: ${id}
name: ${shortName}
extends: ${extendsPath}
description: ${desc}

record:
  storage: csv
  file: main.csv
  id-mode: slug
  hierarchy: false

fields:
  code:
    type: awn.string
    title: Код
    required: true
  label:
    type: awn.string
    title: Подпись
    required: true
  emoji:
    type: awn.string
    title: Эмодзи
  color:
    type: awn.color
    title: Цвет
  sort:
    type: awn.integer
    title: Порядок
    default: 0
`;
}

function buildSingletonSchemaContent({ slug, name, description }) {
  const extendsPath =
    slug.includes("/") ? "../".repeat(slug.split("/").length) + "_base/store.yml" : "../_base/store.yml";
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
  const isTaxonomy = slug.startsWith("taxonomies/");
  const withSample =
    kind === "collection" && !isTaxonomy ? options.withSampleRecord !== false : false;

  if (kind === "collection") {
    const manifestText = description.trim() || `Коллекция \`${slug}\`.`;
    fs.writeFileSync(path.join(storeAbs, COLLECTION_MANIFEST), `# ${name}\n\n${manifestText}\n`, "utf-8");
    fs.writeFileSync(
      path.join(storeAbs, STORE_FILE),
      isTaxonomy
        ? buildTaxonomyCollectionSchemaContent({ slug, name, description })
        : buildCollectionSchemaContent({ slug, name, description, hierarchy: options.hierarchy !== false }),
      "utf-8"
    );
    fs.writeFileSync(path.join(storeAbs, "sort.json"), "[]\n", "utf-8");
    if (isTaxonomy) {
      const columns = getCsvColumnsFromSchema(
        parseTypeYaml(buildTaxonomyCollectionSchemaContent({ slug, name, description }))
      );
      fs.writeFileSync(path.join(storeAbs, "main.csv"), serializeCsv(columns, []), "utf-8");
    } else if (withSample) {
      const recordContent = buildRecordMarkdown({ id: "1", title: "Первая запись" });
      fs.writeFileSync(path.join(storeAbs, "1.md"), recordContent, "utf-8");
      fs.writeFileSync(path.join(storeAbs, "sort.json"), `${JSON.stringify(["1"], null, 2)}\n`, "utf-8");
    }
  } else {
    const manifestText = description.trim() || `Одиночка \`${slug}\` — одна запись в \`main.md\`.`;
    fs.writeFileSync(path.join(storeAbs, COLLECTION_MANIFEST), `# ${name}\n\n${manifestText}\n`, "utf-8");
    fs.writeFileSync(
      path.join(storeAbs, STORE_FILE),
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

  if (slug.includes("/")) {
    const [groupRel, childSlug] = slug.split("/", 2);
    appendGroupSortEntry(dataRoot, groupRel, childSlug);
  } else {
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
  if (!storeAbs || !fs.existsSync(resolveStoreSchemaPath(storeAbs))) {
    throw new Error("Store not found");
  }

  const schema = readSchemaFile(resolveStoreSchemaPath(storeAbs));
  const kind = String(schema?.kind || "collection").trim();
  if (kind === "singleton") throw new Error("Cannot add records to singleton (edit main.md)");

  const payload = getAwnDataPayload(agentRoot, projectRoot, storeRel);
  const store = payload.store;
  if (!store) throw new Error("Store not found");

  const recordStorage = getRecordStorage(schema);
  const idMode = String(schema?.record?.["id-mode"] || schema?.record?.idMode || "numeric").trim();
  let id = String(options.id || "").trim();
  if (!id) {
    id = idMode === "numeric" ? resolveNextNumericRecordId(store.records || []) : slugifyStoreName(options.title || "record");
  }

  const parent = String(options.parent || "").trim();
  const title = String(options.title || id).trim();
  const hierarchy = schema?.record?.hierarchy !== false;

  if (recordStorage === "csv") {
    if (parent) throw new Error("CSV store does not support hierarchy");
    const fields = schema?.fields || {};
    const row = { code: id, label: title };
    for (const key of Object.keys(fields)) {
      if (options[key] !== undefined) row[key] = options[key];
    }
    appendCsvRecord(storeAbs, schema, row);
    return getAwnDataPayload(agentRoot, projectRoot, storeRel).store;
  }

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
  STORE_FILE,
  SCHEMA_FILE,
  SINGLETON_RECORD,
  getAwnDataRoot,
  loadAwnDataStores,
  getAwnDataPayload,
  resolveAwnDataReadRoot,
  buildRecordTree,
  normalizeStoreSlug,
  slugifyStoreName,
  ensureAwnDataBase,
  createAwnDataStore,
  createAwnDataRecord
};
