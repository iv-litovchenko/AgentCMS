const fs = require("fs/promises");
const path = require("path");
const agentRegistry = require("./agent-registry");
const {
  loadGlobalCatalogPreset
} = require("./catalog-loader");
const { resolveDiscoveredCatalogItem } = require("./catalog-normalize");
const {
  AWN_DATA_TAXONOMY_PRESETS,
  getTaxonomyStoreRel
} = require("./awn-data-taxonomies-bridge");
const { getAgentCmsCoreAbsolute } = require("./platform-sources");
const { writeCsvFromRecords } = require("./awn-data-csv");
const { parseTypeYaml } = require("./awn-yaml-utils");

const MIGRATABLE_PRESETS = ["tags", "categories", "statuses", "users", "priorities"];

const PRESET_CONFIG = {
  tags: { field: "awn-tags", kind: "array" },
  categories: { field: "awn-category", kind: "scalar" },
  statuses: { field: "awn-status", kind: "scalar" },
  users: { field: "awn-owner", kind: "scalar" },
  priorities: { field: "awn-priority", kind: "scalar" }
};

function getYamlScalar(frontmatter, key) {
  const match = String(frontmatter || "").match(new RegExp(`^${key}:\\s*(.+)$`, "im"));
  if (!match) return "";
  return match[1].trim().replace(/^['"]|['"]$/g, "");
}

function splitFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: "", body: text };
  return { frontmatter: match[1], body: match[2] };
}

function extractTagsFromFrontmatter(frontmatter) {
  const tags = new Set();
  const collectFromBlock = (field) => {
    const arrayMatch = String(frontmatter || "").match(
      new RegExp(`^${field}:\\s*\\n((?:\\s*-\\s*.+\\n?)+)`, "im")
    );
    if (arrayMatch) {
      for (const line of arrayMatch[1].split("\n")) {
        const item = line.replace(/^\s*-\s*/, "").trim().replace(/^#+/, "").replace(/^['"]|['"]$/g, "");
        if (item) tags.add(item);
      }
    }
    const inline = getYamlScalar(frontmatter, field);
    if (inline && inline !== "[]") {
      inline
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((item) => item.trim().replace(/^#+/, "").replace(/^['"]|['"]$/g, ""))
        .filter(Boolean)
        .forEach((item) => tags.add(item));
    }
  };
  collectFromBlock("awn-tags");
  collectFromBlock("tags");
  return tags;
}

function extractScalarFromFrontmatter(frontmatter, field) {
  return String(getYamlScalar(frontmatter, field) || "").trim();
}

function shouldSkipWalkDir(name) {
  const lower = String(name || "").toLowerCase();
  return lower === "node_modules" || lower === "git" || lower === "history" || lower.startsWith(".");
}

async function walkMdFiles(dirAbsolute, prefix, acc) {
  let entries = [];
  try {
    entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dirAbsolute, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}`.replace(/\\/g, "/") : entry.name;
    if (entry.isDirectory()) {
      if (shouldSkipWalkDir(entry.name)) continue;
      await walkMdFiles(fullPath, rel, acc);
      continue;
    }
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
    if (entry.name.toLowerCase().endsWith(".mdback")) continue;
    acc.push(rel);
  }
}

async function collectValuesFromAgent(agent, preset) {
  const config = PRESET_CONFIG[preset];
  if (!config) return new Set();
  const values = new Set();
  const relFiles = [];
  await walkMdFiles(agent.rootAbsolute, "", relFiles);
  for (const rel of relFiles) {
    try {
      const raw = await fs.readFile(path.join(agent.rootAbsolute, rel), "utf-8");
      const { frontmatter } = splitFrontmatter(raw);
      if (config.kind === "array") {
        for (const value of extractTagsFromFrontmatter(frontmatter)) values.add(value);
      } else {
        const value = extractScalarFromFrontmatter(frontmatter, config.field);
        if (value) values.add(value);
      }
    } catch {
      // skip unreadable
    }
  }
  return values;
}

async function writeAwnDataTaxonomyItems(projectRoot, preset, items) {
  const storeRel = getTaxonomyStoreRel(preset);
  if (!storeRel) throw new Error(`Unsupported preset: ${preset}`);
  const coreRoot = getAgentCmsCoreAbsolute(projectRoot);
  const storeAbs = path.join(coreRoot, "awn-data", ...storeRel.split("/"));
  const schemaPath = path.join(storeAbs, "store.yml");
  const schemaRaw = await fs.readFile(schemaPath, "utf-8");
  const schema = parseTypeYaml(schemaRaw);
  const records = items.map((item, index) => ({
    id: item.id,
    frontmatter: {
      code: item.id,
      label: item.label || item.id,
      color: item.color || "",
      email: item.email || "",
      sort: (index + 1) * 10
    }
  }));
  writeCsvFromRecords(storeAbs, schema, records);
}

async function migrateDiscoveredPresetToGlobal(projectRoot, preset) {
  if (!MIGRATABLE_PRESETS.includes(preset)) {
    throw new Error(`Unsupported preset: ${preset}`);
  }
  if (!AWN_DATA_TAXONOMY_PRESETS.has(preset)) {
    throw new Error(`Preset not in awn-data: ${preset}`);
  }

  agentRegistry.init(projectRoot);
  const agents = agentRegistry.getAgentsPublicList().filter((agent) => !agent.virtual);
  const payload = await loadGlobalCatalogPreset(projectRoot, preset);
  const byId = new Map((payload.items || []).map((item) => [item.id, item]));
  const added = [];

  for (const agentMeta of agents) {
    const agent = agentRegistry.resolveAgent(agentMeta.id);
    if (!agent?.rootAbsolute || agent.folderExists === false) continue;
    const agentValues = await collectValuesFromAgent(agent, preset);
    const existingItems = [...byId.values()];

    for (const rawValue of agentValues) {
      const resolved = resolveDiscoveredCatalogItem(preset, rawValue, existingItems);
      if (!resolved || byId.has(resolved.id)) continue;
      byId.set(resolved.id, resolved);
      existingItems.push(resolved);
      added.push({ value: rawValue, id: resolved.id, source: agentMeta.id });
    }
  }

  if (added.length) {
    const items = [...byId.values()].sort((a, b) =>
      String(a.label || a.id).localeCompare(String(b.label || b.id), "ru")
    );
    await writeAwnDataTaxonomyItems(projectRoot, preset, items);
  }

  return {
    preset,
    total: byId.size,
    addedCount: added.length,
    added,
    source: "awn-data"
  };
}

async function migrateDiscoveredTagsToGlobal(projectRoot) {
  return migrateDiscoveredPresetToGlobal(projectRoot, "tags");
}

async function migrateDiscoveredCatalogsToGlobal(projectRoot, presets = MIGRATABLE_PRESETS) {
  const results = {};
  for (const preset of presets) {
    results[preset] = await migrateDiscoveredPresetToGlobal(projectRoot, preset);
  }
  return results;
}

module.exports = {
  MIGRATABLE_PRESETS,
  migrateDiscoveredTagsToGlobal,
  migrateDiscoveredPresetToGlobal,
  migrateDiscoveredCatalogsToGlobal,
  collectValuesFromAgent
};
