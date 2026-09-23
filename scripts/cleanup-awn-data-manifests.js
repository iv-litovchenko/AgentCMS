#!/usr/bin/env node
/**
 * Cleanup awn-data store manifests:
 * 1. Remove inherited record-base fields from awn-fields (awn-id, awn-created, awn-updated)
 * 2. Fix YAML corruption where store awn-extends leaked into awn-fields / orphaned type+title
 * 3. Restore awn-extends field definition for type stores when missing
 */
const fs = require("fs");
const path = require("path");
const { parseTypeYaml } = require("../awn-yaml-utils");
const { buildStoreManifestContent } = require("../awn-data-loader");

const AGENT_ROOT = path.join(process.cwd(), "workspaces/agent-cms-core");
const AWN_DATA = path.join(AGENT_ROOT, "awn-data");
const TABLE_BASE_EXTENDS = "awn-data/cms-base/entities/table.base.md";
/** @deprecated */
const RECORD_BASE_EXTENDS = TABLE_BASE_EXTENDS;
/** @deprecated */
const ROW_BASE_EXTENDS = TABLE_BASE_EXTENDS;
const BASE_FIELD_KEYS = new Set(["awn-id", "awn-created", "awn-updated"]);

/** Stores whose records carry type-inheritance field awn-extends (type id string). */
const EXTENDS_FIELD_DEFAULTS = {
  pages: null,
  content: null,
  settings: null,
  slots: null,
  "cms-base.entities": null,
  "cms-base.mixins": null,
  "editing-fields.fields": "awn.field.base",
  "editing-fields.field-def": "awn.table.base"
};

function walkManifests(dir, out = []) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    if (name.name.startsWith(".")) continue;
    const abs = path.join(dir, name.name);
    if (name.isDirectory()) {
      walkManifests(abs, out);
      continue;
    }
    if (name.name === "manifest.md") out.push(abs);
  }
  return out;
}

function splitManifest(raw) {
  const text = String(raw || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  return { front: match[1], body: match[2] };
}

function frontmatterToSchema(fm) {
  const kindMap = {
    "awn.infoblock.collection": "collection",
    "awn.infoblock.single": "single",
    "awn.infoblock.singleton": "single",
    "awn.infoblock.group": "group",
    "awn.data.collection": "collection",
    "awn.data.single": "single",
    "awn.data.singleton": "single",
    "awn.data.group": "group"
  };
  const kind = kindMap[String(fm["awn-type"] || "").trim()] || "collection";
  return {
    kind,
    id: fm["awn-id"] || "",
    layer: fm["awn-layer"] || "",
    name: fm["awn-name"] || "",
    extends: fm["awn-extends"] || "",
    record: fm["awn-record"] || {},
    fields: fm["awn-fields"] || {}
  };
}

function cleanupFields(storeId, fields, fm) {
  const out = { ...(fields && typeof fields === "object" ? fields : {}) };

  for (const key of BASE_FIELD_KEYS) {
    delete out[key];
  }

  for (const [key, value] of Object.entries({ ...out })) {
    if (key === "awn-extends" && typeof value === "string" && value.startsWith("awn-data/")) {
      delete out[key];
    }
  }

  if (Object.prototype.hasOwnProperty.call(EXTENDS_FIELD_DEFAULTS, storeId)) {
    const existing = out["awn-extends"];
    const needsRestore =
      !existing ||
      typeof existing === "string" ||
      (typeof existing === "object" && existing.type === undefined);
    if (needsRestore) {
      const field = { type: "awn.string", title: "Extends" };
      const def = EXTENDS_FIELD_DEFAULTS[storeId];
      if (def) field.default = def;
      out["awn-extends"] = field;
    }
  }

  return out;
}

function cleanupFrontmatter(fm) {
  const storeId = String(fm["awn-id"] || "").trim();
  const extendsRef = String(fm["awn-extends"] || "").trim();

  if (fm.title === "Extends" && fm.type === "awn.string") {
    delete fm.title;
    delete fm.type;
  }

  if (extendsRef === RECORD_BASE_EXTENDS || extendsRef.endsWith("/record-base/manifest.md")) {
    fm["awn-fields"] = cleanupFields(storeId, fm["awn-fields"], fm);
  }

  delete fm.title;
  delete fm.type;

  return fm;
}

function processManifest(absPath) {
  const raw = fs.readFileSync(absPath, "utf8");
  const parts = splitManifest(raw);
  if (!parts) {
    console.warn("skip (no frontmatter):", path.relative(AWN_DATA, absPath));
    return false;
  }

  let fm;
  try {
    fm = parseTypeYaml(parts.front);
  } catch (err) {
    console.error("parse error:", path.relative(AWN_DATA, absPath), err.message);
    return false;
  }

  const before = JSON.stringify(fm);
  fm = cleanupFrontmatter(fm);
  if (JSON.stringify(fm) === before) return false;

  const schema = frontmatterToSchema(fm);
  const next = buildStoreManifestContent(schema, parts.body.trim());
  fs.writeFileSync(absPath, next, "utf8");
  console.log("updated:", path.relative(AWN_DATA, absPath));
  return true;
}

function main() {
  const manifests = walkManifests(AWN_DATA);
  let count = 0;
  for (const abs of manifests) {
    if (processManifest(abs)) count += 1;
  }
  console.log(`Done. Updated ${count} manifest(s).`);
}

main();
