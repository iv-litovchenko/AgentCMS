#!/usr/bin/env node
/**
 * Migrate awn-data stores off cms-base MD supertypes → awn-type + schema.yml
 */
const fs = require("fs");
const path = require("path");
const { parseTypeYaml } = require("../awn-yaml-utils");
const {
  composeAwnDataStoreSchemeModYaml,
  buildStoreManifestContent,
  DEFAULT_ELEMENT_SCHEMA_TYPE,
  KIND_TO_AWN_PROP_TYPE,
  CONTAINER_TYPE_ID
} = require("../awn-data-loader");

const LEGACY_CONTAINER = {
  collection: CONTAINER_TYPE_ID.collection,
  group: CONTAINER_TYPE_ID.group,
  single: CONTAINER_TYPE_ID.single,
  singleton: CONTAINER_TYPE_ID.single
};

const LEGACY_EXTENDS = {
  "awn-data/cms-base/data-elements/default.md": DEFAULT_ELEMENT_SCHEMA_TYPE,
  "awn-data/cms-base/entities/row.base.md": DEFAULT_ELEMENT_SCHEMA_TYPE,
  "awn-data/cms-base/entities/table.base.md": DEFAULT_ELEMENT_SCHEMA_TYPE,
  "awn-data/cms-base/data-containers/collection.md": CONTAINER_TYPE_ID.collection,
  "awn-data/cms-base/data-containers/group.md": CONTAINER_TYPE_ID.group,
  "awn-data/cms-base/data-containers/single.md": CONTAINER_TYPE_ID.single
};

function splitFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: text.trim() };
  return { frontmatter: parseTypeYaml(match[1]) || {}, body: match[2].trim() };
}

function resolveContainerType(fm) {
  const awnType = String(fm["awn-type"] || fm["awn-prop-type"] || "").trim();
  if (awnType.startsWith("awn.data.")) return awnType;
  const supertype = String(fm["awn-supertype"] || fm["awn-super-type"] || "").trim();
  for (const [suffix, typeId] of Object.entries(LEGACY_CONTAINER)) {
    if (supertype.includes(`data-containers/${suffix}.md`)) return typeId;
  }
  if (supertype.includes("group.md")) return CONTAINER_TYPE_ID.group;
  if (supertype.includes("collection.md")) return CONTAINER_TYPE_ID.collection;
  if (supertype.includes("single.md")) return CONTAINER_TYPE_ID.single;
  return awnType || CONTAINER_TYPE_ID.collection;
}

function resolveKindFromType(typeId) {
  if (typeId === CONTAINER_TYPE_ID.group) return "group";
  if (typeId === CONTAINER_TYPE_ID.single) return "single";
  return "collection";
}

function extractRecord(fm) {
  const record = fm["awn-record"] && typeof fm["awn-record"] === "object" ? { ...fm["awn-record"] } : {};
  const idMode = fm["awn-record-id-mode"];
  const file = fm["awn-record-file"];
  const hierarchy = fm["awn-record-hierarchy"];
  const storage = fm["awn-record-storage"];
  if (idMode) record["id-mode"] = idMode;
  if (file) record.file = String(file).replace(/^["']|["']$/g, "");
  if (storage) record.storage = storage;
  if (hierarchy !== undefined && hierarchy !== null && String(hierarchy).trim() !== "") {
    record.hierarchy = hierarchy === true || String(hierarchy).trim().toLowerCase() === "true";
  }
  return record;
}

function extractFields(fm) {
  const block = fm["awn-data-elements-schema"];
  if (block?.fields && typeof block.fields === "object") {
    return { fields: block.fields, tabs: block.tabs || {} };
  }
  if (fm["awn-fields"] && typeof fm["awn-fields"] === "object") {
    return { fields: fm["awn-fields"], tabs: {} };
  }
  return { fields: {}, tabs: {} };
}

function resolveElementExtends(fm) {
  const raw =
    fm["awn-data-elements-schema-extends"] ||
    fm["awn-extends"] ||
    fm.extends ||
    DEFAULT_ELEMENT_SCHEMA_TYPE;
  let normalized = String(raw).trim().replace(/^["']|["']$/g, "");
  if (LEGACY_EXTENDS[normalized]) return LEGACY_EXTENDS[normalized];
  if (/^awn-data\/awn\./.test(normalized)) normalized = normalized.slice("awn-data/".length);
  return normalized;
}

function migrateManifest(manifestPath) {
  const raw = fs.readFileSync(manifestPath, "utf-8");
  const { frontmatter, body } = splitFrontmatter(raw);
  if (!frontmatter || typeof frontmatter !== "object") return { changed: false };

  const containerType = resolveContainerType(frontmatter);
  const kind = resolveKindFromType(containerType);
  const { fields, tabs } = extractFields(frontmatter);
  const extendsRef = resolveElementExtends(frontmatter);
  const hasInlineFields = Object.keys(fields).length > 0 || Object.keys(tabs).length > 0;

  const schema = {
    kind,
    id: frontmatter["awn-id"] || frontmatter.id || "",
    layer: frontmatter["awn-layer"] || frontmatter.layer || "",
    name: frontmatter["awn-name"] || frontmatter.name || "",
    record: extractRecord(frontmatter),
    extends: extendsRef
  };

  const storeDir = path.dirname(manifestPath);
  const schemeModPath = path.join(storeDir, "schema.yml");

  if (kind !== "group" && (hasInlineFields || !fs.existsSync(schemeModPath))) {
    fs.writeFileSync(
      schemeModPath,
      composeAwnDataStoreSchemeModYaml({
        extends: extendsRef,
        fields,
        elementSchemaTabs: tabs
      }),
      "utf-8"
    );
  }

  fs.writeFileSync(manifestPath, buildStoreManifestContent(schema, body), "utf-8");
  return { changed: true, storeDir, containerType, schemeModPath };
}

function walkStores(dataRoot, skipDir = "cms-base") {
  const results = [];
  function walk(dir, rel = "") {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (relPath === skipDir || relPath.startsWith(`${skipDir}/`)) continue;
        const manifest = path.join(full, "manifest.md");
        if (fs.existsSync(manifest)) results.push(manifest);
        walk(full, relPath);
      }
    }
  }
  walk(dataRoot);
  return results;
}

function updateSortJson(dataRoot) {
  const sortPath = path.join(dataRoot, "sort.json");
  if (!fs.existsSync(sortPath)) return;
  try {
    const order = JSON.parse(fs.readFileSync(sortPath, "utf-8"));
    if (!Array.isArray(order)) return;
    const next = order.filter((item) => String(item).trim() !== "cms-base");
    if (next.length !== order.length) {
      fs.writeFileSync(sortPath, `${JSON.stringify(next, null, 2)}\n`, "utf-8");
    }
  } catch {
    // ignore
  }
}

function main() {
  const agentRoot = process.argv[2] || path.join(process.cwd(), "workspaces/agent-cms-core");
  const dataRoot = path.join(agentRoot, "awn-data");
  if (!fs.existsSync(dataRoot)) {
    console.error("awn-data not found:", dataRoot);
    process.exit(1);
  }

  const manifests = walkStores(dataRoot);
  let changed = 0;
  for (const manifestPath of manifests) {
    const result = migrateManifest(manifestPath);
    if (result.changed) {
      changed += 1;
      console.log("migrated", path.relative(agentRoot, manifestPath), "→", result.containerType);
    }
  }

  updateSortJson(dataRoot);

  const cmsBase = path.join(dataRoot, "cms-base");
  if (fs.existsSync(cmsBase)) {
    fs.rmSync(cmsBase, { recursive: true, force: true });
    console.log("removed", path.relative(agentRoot, cmsBase));
  }

  console.log(`Done: ${changed} store manifest(s) migrated.`);
}

main();
