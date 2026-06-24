const fs = require("fs/promises");
const path = require("path");
const {
  findCatalogScaffold,
  WORKSPACE_TAXONOMY_FOLDER,
  LEGACY_WORKSPACE_TAXONOMY_FOLDER,
  PLATFORM_GLOBAL_TAXONOMY_FOLDER
} = require("./agent-registry");
const {
  AREA_MANIFEST_FILE,
  BUNDLE_CONTENT_FILE,
  BUNDLE_TABULAR_FILE,
  STORAGE_SUBFOLDER_CONTENT,
  getNamedStorageBundleDirRel,
  resolveNodeDisplayName,
  toTopicFileName
} = require("./manifest-paths");

const { AGENT_CMS_CORE_REL } = require("./platform-sources");

const GLOBAL_CATALOG_DIR = AGENT_CMS_CORE_REL;
const CATALOG_GROUP_LABELS = {
  global: "Общие",
  agent: "Агент"
};
const MERGE_CATALOG_PRESETS = ["categories", "tags", "statuses", "users", "priorities", "colors"];
const CATEGORY_LIKE_PRESETS = new Set(["categories", "statuses", "users", "priorities", "colors"]);

function splitNodeFrontmatter(raw = "") {
  const text = String(raw).replace(/^\uFEFF/, "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: text };
  return {
    frontmatter: match[1],
    body: match[2].replace(/^\r?\n?/, "")
  };
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCsvText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (!lines.length) return { columns: [], rows: [] };
  const parsed = lines.map(parseCsvLine);
  const columns = parsed[0] || [];
  const rows = parsed.slice(1);
  return { columns, rows };
}

function getYamlScalar(frontmatter, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const match = String(frontmatter || "").match(re);
  if (!match) return "";
  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

function getCatalogManifestRel(preset, taxonomyFolder = WORKSPACE_TAXONOMY_FOLDER) {
  const scaffold = findCatalogScaffold(preset);
  if (!scaffold) return null;
  return path.posix.join(taxonomyFolder, toTopicFileName(scaffold.fileName));
}

function isGlobalCatalogAbsolute(catalogAbsolute, projectRoot) {
  if (!projectRoot || !catalogAbsolute) return false;
  const globalRoot = path.join(projectRoot, GLOBAL_CATALOG_DIR);
  return path.resolve(catalogAbsolute) === path.resolve(globalRoot);
}

function getTaxonomyFolderCandidates(catalogAbsolute, projectRoot) {
  if (isGlobalCatalogAbsolute(catalogAbsolute, projectRoot)) {
    return [PLATFORM_GLOBAL_TAXONOMY_FOLDER];
  }
  return [WORKSPACE_TAXONOMY_FOLDER, LEGACY_WORKSPACE_TAXONOMY_FOLDER];
}

function getDefaultTaxonomyFolder(catalogAbsolute, projectRoot) {
  return isGlobalCatalogAbsolute(catalogAbsolute, projectRoot)
    ? PLATFORM_GLOBAL_TAXONOMY_FOLDER
    : WORKSPACE_TAXONOMY_FOLDER;
}

async function resolveCatalogManifestRel(catalogAbsolute, preset, projectRoot = null) {
  for (const folder of getTaxonomyFolderCandidates(catalogAbsolute, projectRoot)) {
    const rel = getCatalogManifestRel(preset, folder);
    if (!rel) continue;
    try {
      await fs.access(path.join(catalogAbsolute, rel));
      return rel;
    } catch {
      // try next folder name
    }
  }
  return getCatalogManifestRel(preset, getDefaultTaxonomyFolder(catalogAbsolute, projectRoot));
}

function parseMarkdownTableBody(body) {
  const lines = String(body || "").split("\n");
  let headers = null;
  const rows = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    const cells = trimmed
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell, index, all) => index > 0 && index < all.length - 1);
    if (!cells.length) continue;
    const isSeparator = cells.every((cell) => /^:?-{3,}:?$/.test(cell));
    if (isSeparator) continue;
    if (!headers) {
      headers = cells.map((cell) => cell.toLowerCase());
      continue;
    }
    rows.push(cells);
  }
  return { headers, rows };
}

function parseCategoryCsvItems(csv) {
  const columns = (csv?.columns || []).map((cell) => String(cell).trim().toLowerCase());
  const rows = Array.isArray(csv?.rows) ? csv.rows : [];
  if (!columns.length) return [];
  const idIdx = columns.findIndex((h) => ["id", "slug", "код", "code"].includes(h));
  const labelIdx = columns.findIndex((h) => ["label", "name", "title", "название"].includes(h));
  const colorIdx = columns.findIndex((h) => h === "color" || h === "цвет");
  return rows
    .map((cells) => {
      const id = String(cells[idIdx >= 0 ? idIdx : 0] || "").trim();
      const label = String(cells[labelIdx >= 0 ? labelIdx : 1] || id).trim();
      const color = colorIdx >= 0 ? String(cells[colorIdx] || "").trim() : "";
      if (!id) return null;
      return { id, label, color: color || null };
    })
    .filter(Boolean);
}

function parseTagsCsvItems(csv) {
  const columns = (csv?.columns || []).map((cell) => String(cell).trim().toLowerCase());
  const rows = Array.isArray(csv?.rows) ? csv.rows : [];
  if (!columns.length) return [];
  const tagIdx = columns.findIndex((h) => ["tag", "id", "name", "тег"].includes(h));
  const colIdx = tagIdx >= 0 ? tagIdx : 0;
  const tags = new Set();
  for (const cells of rows) {
    const raw = String(cells[colIdx] || "").trim().replace(/^#+/, "");
    if (raw) tags.add(raw);
  }
  return [...tags]
    .sort((a, b) => a.localeCompare(b, "ru"))
    .map((id) => ({ id, label: `#${id}` }));
}

function parseTagsBodyItems(body) {
  const tags = new Set();
  for (const line of String(body || "").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("# ")) continue;
    if (trimmed.startsWith("#")) {
      trimmed
        .split(/\s+/)
        .map((part) => part.trim())
        .filter((part) => part.startsWith("#") && part.length > 1)
        .forEach((part) => tags.add(part.replace(/^#+/, "")));
      continue;
    }
    const bullet = trimmed.match(/^[-*]\s+#?([^\s#]+)/);
    if (bullet) tags.add(bullet[1].trim());
  }
  return [...tags]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ru"))
    .map((id) => ({ id, label: `#${id}` }));
}

function parseCategoryTableItems(body) {
  const { headers, rows } = parseMarkdownTableBody(body);
  if (!headers?.length) return [];
  const idIdx = headers.findIndex((h) => ["id", "slug", "код", "code"].includes(h));
  const labelIdx = headers.findIndex((h) => ["label", "name", "title", "название"].includes(h));
  const colorIdx = headers.findIndex((h) => h === "color" || h === "цвет");
  return rows
    .map((cells) => {
      const id = String(cells[idIdx >= 0 ? idIdx : 0] || "").trim();
      const label = String(cells[labelIdx >= 0 ? labelIdx : 1] || id).trim();
      const color = colorIdx >= 0 ? String(cells[colorIdx] || "").trim() : "";
      if (!id) return null;
      return { id, label, color: color || null };
    })
    .filter(Boolean);
}

function namedStorageBundleDirRel(manifestRel) {
  return getNamedStorageBundleDirRel(manifestRel);
}

async function readServiceCatalogFileBody(catalogAbsolute, manifestRel, bundleFileName = BUNDLE_CONTENT_FILE) {
  const contentRel = path.posix.join(namedStorageBundleDirRel(manifestRel), bundleFileName);
  const contentAbs = path.join(catalogAbsolute, contentRel);
  try {
    const raw = await fs.readFile(contentAbs, "utf-8");
    if (bundleFileName === BUNDLE_TABULAR_FILE) return raw;
    const { body } = splitNodeFrontmatter(raw);
    return body;
  } catch {
    return "";
  }
}

async function readServiceCatalogCsv(catalogAbsolute, manifestRel) {
  const raw = await readServiceCatalogFileBody(catalogAbsolute, manifestRel, BUNDLE_TABULAR_FILE);
  if (!String(raw || "").trim()) return { columns: [], rows: [] };
  return parseCsvText(raw);
}

async function listCategoryCatalogItems(catalogAbsolute, manifestRel) {
  const contentDirRel = path.posix.join(namedStorageBundleDirRel(manifestRel), STORAGE_SUBFOLDER_CONTENT);
  const contentDirAbs = path.join(catalogAbsolute, contentDirRel);
  const items = [];

  try {
    const entries = await fs.readdir(contentDirAbs, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
      if (entry.name.toLowerCase() === AREA_MANIFEST_FILE.toLowerCase()) continue;
      const fileRel = path.posix.join(contentDirRel, entry.name);
      const fileAbs = path.join(catalogAbsolute, fileRel);
      const raw = await fs.readFile(fileAbs, "utf-8");
      const { frontmatter } = splitNodeFrontmatter(raw);
      const baseName = entry.name.replace(/\.md$/i, "");
      const id = getYamlScalar(frontmatter, "awn-slug") || baseName;
      const label = resolveNodeDisplayName(
        getYamlScalar(frontmatter, "awn-name") || "",
        baseName
      );
      const color = getYamlScalar(frontmatter, "awn-color") || null;
      if (!id) continue;
      items.push({ id, label, color, path: fileRel });
    }
  } catch {
    // fall back to csv / table
  }

  if (items.length) {
    return items.sort((a, b) => a.label.localeCompare(b.label, "ru"));
  }

  const csv = await readServiceCatalogCsv(catalogAbsolute, manifestRel);
  const fromCsv = parseCategoryCsvItems(csv);
  if (fromCsv.length) return fromCsv;

  const body = await readServiceCatalogFileBody(catalogAbsolute, manifestRel, BUNDLE_CONTENT_FILE);
  return parseCategoryTableItems(body);
}

async function listTagsCatalogItems(catalogAbsolute, manifestRel) {
  const csv = await readServiceCatalogCsv(catalogAbsolute, manifestRel);
  const fromCsv = parseTagsCsvItems(csv);
  if (fromCsv.length) return fromCsv;

  const body = await readServiceCatalogFileBody(catalogAbsolute, manifestRel, BUNDLE_CONTENT_FILE);
  const fromBody = parseTagsBodyItems(body);
  if (fromBody.length) return fromBody;

  const contentDirRel = path.posix.join(namedStorageBundleDirRel(manifestRel), STORAGE_SUBFOLDER_CONTENT);
  const contentDirAbs = path.join(catalogAbsolute, contentDirRel);
  const tags = new Set();
  try {
    const entries = await fs.readdir(contentDirAbs, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
      const baseName = entry.name.replace(/\.md$/i, "");
      if (baseName) tags.add(baseName);
    }
  } catch {
    return [];
  }
  return [...tags]
    .sort((a, b) => a.localeCompare(b, "ru"))
    .map((id) => ({ id, label: `#${id}` }));
}

async function listStatusesCatalogItems(catalogAbsolute, manifestRel) {
  return listCategoryCatalogItems(catalogAbsolute, manifestRel);
}

async function loadSchemasCatalogPreset(catalogAbsolute, projectRoot = null) {
  const scaffold = findCatalogScaffold("schemas");
  const manifestRel = await resolveCatalogManifestRel(catalogAbsolute, "schemas", projectRoot);
  if (!scaffold || !manifestRel || !catalogAbsolute) {
    return { preset: "schemas", exists: false, title: "Схемы", items: [], content: null };
  }
  const manifestAbs = path.join(catalogAbsolute, manifestRel);
  try {
    await fs.access(manifestAbs);
  } catch {
    return { preset: "schemas", exists: false, title: scaffold.title, manifestRel, items: [], content: null };
  }
  const content = await readServiceCatalogFileBody(catalogAbsolute, manifestRel, BUNDLE_CONTENT_FILE);
  return {
    preset: "schemas",
    exists: true,
    title: scaffold.title,
    manifestRel,
    items: [],
    content: content || "",
    kind: "document"
  };
}

async function loadCatalogPreset(catalogAbsolute, preset, options = {}) {
  const scaffold = findCatalogScaffold(preset);
  if (!scaffold) {
    return { preset, exists: false, title: preset, items: [] };
  }
  const manifestRel =
    options.manifestRel ||
    (await resolveCatalogManifestRel(catalogAbsolute, preset, options.projectRoot));
  if (!manifestRel || !catalogAbsolute) {
    return { preset, exists: false, title: scaffold.title, items: [] };
  }
  const manifestAbs = path.join(catalogAbsolute, manifestRel);
  try {
    await fs.access(manifestAbs);
  } catch {
    return { preset, exists: false, title: scaffold.title, manifestRel, items: [] };
  }

  const items = CATEGORY_LIKE_PRESETS.has(preset)
    ? await listCategoryCatalogItems(catalogAbsolute, manifestRel)
    : preset === "tags"
      ? await listTagsCatalogItems(catalogAbsolute, manifestRel)
      : [];

  return {
    preset,
    exists: true,
    title: scaffold.title,
    manifestRel,
    items
  };
}

function mergeCatalogItems(globalItems, agentItems) {
  const byId = new Map();
  for (const item of globalItems || []) {
    if (!item?.id) continue;
    byId.set(item.id, { ...item, scope: "global" });
  }
  for (const item of agentItems || []) {
    if (!item?.id) continue;
    byId.set(item.id, { ...item, scope: "agent" });
  }
  return [...byId.values()].sort((a, b) =>
    String(a.label || a.id).localeCompare(String(b.label || b.id), "ru")
  );
}

function buildCatalogGroups(items) {
  const globalItems = (items || []).filter((item) => item.scope !== "agent");
  const agentItems = (items || []).filter((item) => item.scope === "agent");
  return {
    global: { title: CATALOG_GROUP_LABELS.global, items: globalItems },
    agent: { title: CATALOG_GROUP_LABELS.agent, items: agentItems }
  };
}

async function loadMergedCatalogPreset(projectRoot, agentCatalogAbsolute, preset, options = {}) {
  const scaffold = findCatalogScaffold(preset);
  const globalAbsolute = getGlobalCatalogAbsolute(projectRoot);

  if (options.globalOnly) {
    const globalPayload = await loadCatalogPreset(globalAbsolute, preset, { projectRoot });
    const items = (globalPayload?.items || []).map((item) => ({ ...item, scope: "global" }));
    return {
      preset,
      exists: Boolean(globalPayload?.exists || items.length),
      title: scaffold?.title || preset,
      manifestRel: globalPayload?.exists ? globalPayload.manifestRel : null,
      globalManifestRel: globalPayload?.exists ? globalPayload.manifestRel : null,
      items,
      groups: buildCatalogGroups(items)
    };
  }

  const [globalPayload, agentPayload] = await Promise.all([
    loadCatalogPreset(globalAbsolute, preset, { projectRoot }),
    agentCatalogAbsolute
      ? loadCatalogPreset(agentCatalogAbsolute, preset, { projectRoot })
      : Promise.resolve(null)
  ]);

  const items = mergeCatalogItems(globalPayload?.items, agentPayload?.items);
  const exists = Boolean(globalPayload?.exists || agentPayload?.exists || items.length);

  return {
    preset,
    exists,
    title: scaffold?.title || preset,
    manifestRel: agentPayload?.exists ? agentPayload.manifestRel : null,
    globalManifestRel: globalPayload?.exists ? globalPayload.manifestRel : null,
    items,
    groups: buildCatalogGroups(items)
  };
}

function getGlobalCatalogAbsolute(projectRoot) {
  return path.join(projectRoot, GLOBAL_CATALOG_DIR);
}

async function getMergedCatalogsPayload(projectRoot, agentCatalogAbsolute, options = {}) {
  const loadOptions = options.globalOnly ? { globalOnly: true } : {};
  const entries = await Promise.all(
    MERGE_CATALOG_PRESETS.map(async (preset) => [
      preset,
      await loadMergedCatalogPreset(projectRoot, agentCatalogAbsolute, preset, loadOptions)
    ])
  );
  const payload = Object.fromEntries(entries);
  const globalAbsolute = getGlobalCatalogAbsolute(projectRoot);
  payload.schemas = await loadSchemasCatalogPreset(globalAbsolute, projectRoot);
  return payload;
}

function buildCatalogLookupMaps(payload) {
  const toMap = (items) => {
    const map = new Map();
    for (const item of items || []) {
      if (!item?.id) continue;
      map.set(item.id, item.label || item.id);
      if (item.label) map.set(String(item.label).trim(), item.label);
    }
    return map;
  };
  return {
    categories: toMap(payload?.categories?.items),
    tags: toMap(payload?.tags?.items),
    statuses: toMap(payload?.statuses?.items),
    users: toMap(payload?.users?.items),
    priorities: toMap(payload?.priorities?.items),
    colors: payload?.colors?.items || []
  };
}

async function getCatalogLookupMaps(projectRoot, agentCatalogAbsolute = null, options = {}) {
  const payload = await getMergedCatalogsPayload(projectRoot, agentCatalogAbsolute, options);
  return buildCatalogLookupMaps(payload);
}

function resolveCatalogPropValue(map, raw) {
  const text = String(raw ?? "").trim();
  if (!text) return text;
  return map?.get(text) || text;
}

function resolveCatalogTagsList(map, rawTags) {
  const tags = Array.isArray(rawTags)
    ? rawTags
    : String(rawTags || "")
        .split(",")
        .map((item) => item.trim().replace(/^#+/, ""))
        .filter(Boolean);
  return tags.map((tag) => {
    const label = map?.get(tag);
    return label && label !== tag ? `${label} (#${tag})` : `#${tag}`;
  });
}

module.exports = {
  GLOBAL_CATALOG_DIR,
  CATALOG_GROUP_LABELS,
  MERGE_CATALOG_PRESETS,
  getGlobalCatalogAbsolute,
  getCatalogManifestRel,
  resolveCatalogManifestRel,
  loadCatalogPreset,
  loadSchemasCatalogPreset,
  loadMergedCatalogPreset,
  getMergedCatalogsPayload,
  mergeCatalogItems,
  buildCatalogGroups,
  buildCatalogLookupMaps,
  getCatalogLookupMaps,
  resolveCatalogPropValue,
  resolveCatalogTagsList
};
