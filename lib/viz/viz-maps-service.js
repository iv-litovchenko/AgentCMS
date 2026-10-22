const fs = require("fs/promises");
const path = require("path");
const { loadYamlFileSync } = require("../awn/awn-yaml-utils");
const { parseAwnId } = require("../workspace-id/service");
const {
  buildVizMapCanonicalRelPath,
  buildVizMapLegacyColocatedRelPath
} = require("./viz-map-paths");

function splitFrontmatter(raw = "") {
  const text = String(raw || "");
  if (!text.startsWith("---")) return { frontmatter: "", body: text };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { frontmatter: "", body: text };
  return {
    frontmatter: text.slice(3, end).replace(/^\n/, ""),
    body: text.slice(end + 4).replace(/^\n/, "")
  };
}

function joinFrontmatter(frontmatter, body) {
  const fm = String(frontmatter || "").trimEnd();
  const content = String(body ?? "");
  if (!fm) return content;
  return `---\n${fm}\n---\n${content ? `\n${content}` : ""}`;
}

function getYamlScalar(frontmatter, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const match = String(frontmatter || "").match(re);
  if (!match) return "";
  let raw = match[1].trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1);
  }
  return raw.trim();
}

function upsertYamlScalar(frontmatter, key, value) {
  const lines = String(frontmatter || "").split(/\r?\n/);
  const scalar = String(value ?? "");
  const formatted = /[\s:#[\]{}|>&*!?,@`"']/.test(scalar) ? `"${scalar.replace(/"/g, '\\"')}"` : scalar;
  const re = new RegExp(`^${key}:\\s*`);
  let replaced = false;
  const next = lines.map((line) => {
    if (re.test(line)) {
      replaced = true;
      return `${key}: ${formatted}`;
    }
    return line;
  });
  if (!replaced) next.push(`${key}: ${formatted}`);
  return next.join("\n").replace(/\n+$/, "");
}

const VIZ_FILE_RE = /\.viz\.md$/i;
const VIZ_WALK_SKIP = new Set(["node_modules", ".git", "history", "awn-temp"]);
/** Fixed type for *.viz.md — not copied from the parent record. */
const VIZ_MAP_AWN_TYPE = "awn.content.record";

function shouldSkipVizWalkDir(name) {
  const lower = String(name || "").toLowerCase();
  if (!lower || VIZ_WALK_SKIP.has(lower)) return true;
  if (lower === ".agent-cms") return true;
  return false;
}

function normalizeRel(rel) {
  return String(rel || "").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function resolveVizKindsDir(agentRoot, projectRoot) {
  const roots = [];
  if (agentRoot) roots.push(path.join(agentRoot, "awn-system", "types", "viz"));
  if (projectRoot) {
    const core = path.join(projectRoot, "workspaces", "0-ws-core", "awn-system", "types", "viz");
    if (!roots.includes(core)) roots.push(core);
  }
  return roots;
}

function loadVizKindRegistry(agentRoot, projectRoot) {
  const dirs = resolveVizKindsDir(agentRoot, projectRoot);
  const byId = new Map();
  let sections = [];

  for (const dir of dirs) {
    let registry = {};
    try {
      registry = loadYamlFileSync(path.join(dir, "registry.yml"), {});
    } catch {
      registry = {};
    }
    if (Array.isArray(registry.sections) && !sections.length) {
      sections = registry.sections.map((s) => ({
        id: String(s.id || "").trim(),
        label: String(s.label || s.id || "").trim(),
        icon: String(s.icon || "").trim()
      }));
    }
    let names = [];
    try {
      names = require("fs").readdirSync(dir).filter((n) => n.endsWith(".yml") && n !== "registry.yml");
    } catch {
      continue;
    }
    for (const name of names) {
      try {
        const doc = loadYamlFileSync(path.join(dir, name), {});
        const id = String(doc.id || name.replace(/\.ya?ml$/i, "")).trim();
        if (!id || byId.has(id)) continue;
        byId.set(id, {
          id,
          label: String(doc.label || id).trim(),
          section: String(doc.section || "knowledge").trim(),
          icon: String(doc.icon || "").trim(),
          description: String(doc.description || "").trim(),
          bodyFormat: String(doc.bodyFormat || "").trim(),
          defaultTemplate: String(doc.defaultTemplate || "").trim()
        });
      } catch {
        /* skip broken type */
      }
    }
  }

  const kinds = [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, "ru"));
  return { sections, kinds };
}

async function walkVizMapFiles(dirAbsolute, dirRel, acc) {
  let entries = [];
  try {
    entries = await fs.readdir(dirAbsolute, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (shouldSkipVizWalkDir(entry.name)) continue;
    const abs = path.join(dirAbsolute, entry.name);
    const rel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await walkVizMapFiles(abs, rel, acc);
      continue;
    }
    if (entry.isFile() && VIZ_FILE_RE.test(entry.name)) {
      acc.push(rel.replace(/\\/g, "/"));
    }
  }
}

function parseVizMapBasename(name) {
  const base = String(name || "");
  const canonical = base.match(/^([a-z0-9-]+)\.viz\.md$/i);
  if (canonical) return { stem: "", kindFromName: canonical[1].toLowerCase() };
  const legacy = base.match(/^(.+)\.([a-z0-9-]+)\.viz\.md$/i);
  if (legacy) return { stem: legacy[1], kindFromName: legacy[2].toLowerCase() };
  if (/\.viz\.md$/i.test(base)) return { stem: base.replace(/\.viz\.md$/i, ""), kindFromName: "" };
  return { stem: base, kindFromName: "" };
}

/** Expected path for UI when awn-id unknown (legacy colocated). Prefer buildVizMapRelPathForRecord. */
function buildVizMapRelPath(aboutRel, kind) {
  return buildVizMapLegacyColocatedRelPath(aboutRel, kind);
}

async function readRecordFrontmatterScalars(agentRoot, aboutRel) {
  const about = normalizeRel(aboutRel);
  if (!about) return null;
  const abs = path.join(agentRoot, about);
  try {
    const raw = await fs.readFile(abs, "utf-8");
    const { frontmatter } = splitFrontmatter(raw);
    return {
      awnId: parseAwnId(getYamlScalar(frontmatter, "awn-id")),
      awnName: String(getYamlScalar(frontmatter, "awn-name") || "").trim()
    };
  } catch {
    return null;
  }
}

async function readAwnIdFromRecord(agentRoot, aboutRel) {
  const meta = await readRecordFrontmatterScalars(agentRoot, aboutRel);
  return meta?.awnId ?? null;
}

async function resolveExistingVizMapRel(agentRoot, aboutRel, kind) {
  const kindId = String(kind || "").trim().toLowerCase();
  const about = normalizeRel(aboutRel);
  if (!about || !kindId) return "";

  const awnId = await readAwnIdFromRecord(agentRoot, about);
  if (awnId) {
    const canonical = buildVizMapCanonicalRelPath(awnId, kindId);
    if (canonical) {
      try {
        await fs.access(path.join(agentRoot, canonical));
        return canonical;
      } catch {
        /* try legacy */
      }
    }
  }

  const legacy = buildVizMapLegacyColocatedRelPath(about, kindId);
  if (legacy) {
    try {
      await fs.access(path.join(agentRoot, legacy));
      return legacy;
    } catch {
      /* not found */
    }
  }

  return awnId ? buildVizMapCanonicalRelPath(awnId, kindId) : legacy;
}

async function buildVizMapRelPathForRecord(agentRoot, aboutRel, kind) {
  const about = normalizeRel(aboutRel);
  const kindId = String(kind || "").trim().toLowerCase();
  if (!about || !kindId) return "";
  const awnId = await readAwnIdFromRecord(agentRoot, about);
  if (awnId) return buildVizMapCanonicalRelPath(awnId, kindId);
  return buildVizMapLegacyColocatedRelPath(about, kindId);
}

function composeDefaultVizMapContent(aboutRel, kindDef, { awnName = "" } = {}) {
  let fm = [`viz-kind: ${kindDef.id}`, `viz-about: ${aboutRel}`, `awn-type: ${VIZ_MAP_AWN_TYPE}`].join("\n");
  const name = String(awnName || "").trim();
  if (name) fm = upsertYamlScalar(fm, "awn-name", name);
  const body = kindDef.defaultTemplate || "";
  return joinFrontmatter(fm, body);
}

async function readVizMapEntry(agentRoot, workspaceRel, kindsById) {
  const abs = path.join(agentRoot, workspaceRel);
  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    return null;
  }
  if (!stat.isFile()) return null;
  const raw = await fs.readFile(abs, "utf-8");
  const { frontmatter, body } = splitFrontmatter(raw);
  const kind =
    getYamlScalar(frontmatter, "viz-kind").toLowerCase() ||
    parseVizMapBasename(path.posix.basename(workspaceRel)).kindFromName;
  const kindDef = kindsById.get(kind) || null;
  return {
    path: workspaceRel,
    kind,
    kindLabel: kindDef?.label || kind,
    section: kindDef?.section || "",
    about: getYamlScalar(frontmatter, "viz-about"),
    title:
      getYamlScalar(frontmatter, "viz-title") ||
      getYamlScalar(frontmatter, "awn-name") ||
      parseVizMapBasename(path.posix.basename(workspaceRel)).stem,
    updated: stat.mtime.toISOString(),
    bodyPreview: String(body || "").trim().slice(0, 120)
  };
}

async function collectVizAtlas(agentRoot, projectRoot, filters = {}) {
  const { kinds } = loadVizKindRegistry(agentRoot, projectRoot);
  const kindsById = new Map(kinds.map((k) => [k.id, k]));
  const rels = [];
  await walkVizMapFiles(agentRoot, "", rels);
  const aboutFilter = normalizeRel(filters.about);
  const kindFilter = String(filters.kind || "").trim().toLowerCase();
  const sectionFilter = String(filters.section || "").trim().toLowerCase();

  const items = [];
  for (const rel of rels) {
    const entry = await readVizMapEntry(agentRoot, rel, kindsById);
    if (!entry) continue;
    if (kindFilter && entry.kind !== kindFilter) continue;
    if (sectionFilter && String(entry.section || "").toLowerCase() !== sectionFilter) continue;
    if (aboutFilter) {
      const about = normalizeRel(entry.about);
      if (about !== aboutFilter && !about.startsWith(`${aboutFilter}/`)) continue;
    }
    items.push(entry);
  }
  items.sort((a, b) => {
    const ta = a.title || a.path;
    const tb = b.title || b.path;
    return ta.localeCompare(tb, "ru", { sensitivity: "base" });
  });
  return { items, kindCount: kinds.length };
}

async function readVizMapBody(agentRoot, projectRoot, mapRel) {
  const normalized = normalizeRel(mapRel);
  if (!normalized || !VIZ_FILE_RE.test(normalized)) {
    return { error: "Invalid viz map path", status: 400 };
  }
  const abs = path.join(agentRoot, normalized);
  try {
    const content = await fs.readFile(abs, "utf-8");
    const { kinds } = loadVizKindRegistry(agentRoot, projectRoot);
    const kindsById = new Map(kinds.map((k) => [k.id, k]));
    const meta = await readVizMapEntry(agentRoot, normalized, kindsById);
    return { path: normalized, content, meta, exists: true };
  } catch (error) {
    if (error?.code === "ENOENT") return { path: normalized, exists: false, content: "", meta: null };
    return { error: "Failed to read viz map", status: 500, details: String(error.message || error) };
  }
}

function createVizMapsService(deps) {
  const {
    getAgentRoot,
    getProjectRoot,
    normalizeWorkspacePath,
    writeWorkspaceTextFileWithHistory,
    resolveManifestRelForHistory
  } = deps;

  async function listKinds() {
    const agentRoot = getAgentRoot();
    const projectRoot = getProjectRoot();
    return loadVizKindRegistry(agentRoot, projectRoot);
  }

  async function readAtlas(filters) {
    const agentRoot = getAgentRoot();
    return collectVizAtlas(agentRoot, getProjectRoot(), filters);
  }

  async function readMap(mapRel) {
    const agentRoot = getAgentRoot();
    return readVizMapBody(agentRoot, getProjectRoot(), mapRel);
  }

  function resolveRecordPath(payload) {
    return normalizeRel(payload.recordPath || payload.about || "");
  }

  async function writeMap(payload) {
    const about = resolveRecordPath(payload);
    const kind = String(payload.kind || "").trim().toLowerCase();
    let mapRel = normalizeRel(payload.path);
    const contentOverride = typeof payload.content === "string" ? payload.content : null;

    const { kinds } = await listKinds();
    const kindDef = kinds.find((k) => k.id === kind);
    if (!kindDef && !mapRel) {
      return { error: "Unknown viz kind", status: 400 };
    }

    const agentRoot = getAgentRoot();

    if (!mapRel && about && kind) {
      const awnId = await readAwnIdFromRecord(agentRoot, about);
      if (!awnId) {
        return {
          error: "Host has no awn-id",
          status: 400,
          hint: "Assign awn-id to the record, topic, or section manifest (viz-about), then create the map again."
        };
      }
      mapRel = buildVizMapCanonicalRelPath(awnId, kind);
    }
    if (!mapRel) return { error: "path or (about + kind) required", status: 400 };

    const abs = path.join(agentRoot, mapRel);
    let content = contentOverride;
    if (content === null) {
      const exists = await fs.stat(abs).catch(() => null);
      if (exists) {
        content = await fs.readFile(abs, "utf-8");
      } else {
        const recordMeta = await readRecordFrontmatterScalars(agentRoot, about);
        content = composeDefaultVizMapContent(about, kindDef, {
          awnName: recordMeta?.awnName || ""
        });
      }
    } else if (about && kind) {
      const { frontmatter, body } = splitFrontmatter(content);
      let fm = frontmatter;
      fm = upsertYamlScalar(fm, "viz-kind", kind);
      fm = upsertYamlScalar(fm, "viz-about", about);
      content = joinFrontmatter(fm, body);
    }

    const manifestRel = resolveManifestRelForHistory(about || mapRel);
    const targetAbs = normalizeWorkspacePath(mapRel);
    if (!targetAbs) return { error: "Invalid map path", status: 400 };

    await fs.mkdir(path.dirname(targetAbs), { recursive: true });

    const savedRel = await writeWorkspaceTextFileWithHistory(manifestRel, mapRel, content);
    const readBack = await readVizMapBody(agentRoot, getProjectRoot(), savedRel);
    return { path: savedRel, content: readBack.content, meta: readBack.meta, exists: true };
  }

  async function deleteMap(payload) {
    let mapRel = normalizeRel(payload.path || payload.mapPath || "");
    const about = resolveRecordPath(payload);
    const kind = String(payload.kind || payload.type || "").trim().toLowerCase();
    const agentRoot = getAgentRoot();
    if (!mapRel && about && kind) {
      mapRel = await resolveExistingVizMapRel(agentRoot, about, kind);
    }
    if (!mapRel || !VIZ_FILE_RE.test(mapRel)) {
      return { error: "path or (recordPath + kind) required", status: 400 };
    }
    const targetAbs = normalizeWorkspacePath(mapRel);
    if (!targetAbs) return { error: "Invalid map path", status: 400 };
    try {
      await fs.unlink(targetAbs);
      return { deleted: true, path: mapRel };
    } catch (error) {
      if (error?.code === "ENOENT") {
        return { deleted: false, path: mapRel, exists: false, error: "Map not found", status: 404 };
      }
      return { error: "Failed to delete viz map", status: 500, details: String(error.message || error) };
    }
  }

  async function mapsForAbout(aboutRel) {
    const about = normalizeRel(aboutRel);
    if (!about) return { about: "", kinds: [], maps: [] };
    const agentRoot = getAgentRoot();
    const awnId = await readAwnIdFromRecord(agentRoot, about);
    const { kinds } = await listKinds();
    const atlas = await readAtlas({ about });
    const byKind = new Map(atlas.items.map((item) => [item.kind, item]));
    const rows = await Promise.all(
      kinds.map(async (kind) => ({
        kind: kind.id,
        label: kind.label,
        icon: kind.icon,
        section: kind.section,
        expectedPath: await buildVizMapRelPathForRecord(agentRoot, about, kind.id),
        map: byKind.get(kind.id) || null,
        storageLayout: awnId ? "assets-viz" : "legacy-colocated"
      }))
    );
    return { about, awnId: awnId || null, kinds, maps: rows };
  }

  async function resolveMapPathForQuery(aboutRel, kind, explicitPath) {
    const mapRel = normalizeRel(explicitPath);
    if (mapRel) return mapRel;
    return resolveExistingVizMapRel(getAgentRoot(), aboutRel, kind);
  }

  return {
    listKinds,
    readAtlas,
    readMap,
    writeMap,
    deleteMap,
    mapsForAbout,
    buildVizMapRelPathForRecord,
    resolveMapPathForQuery,
    readAwnIdFromRecord
  };
}

module.exports = {
  createVizMapsService,
  buildVizMapRelPath,
  buildVizMapRelPathForRecord,
  buildVizMapCanonicalRelPath,
  buildVizMapLegacyColocatedRelPath,
  loadVizKindRegistry,
  VIZ_FILE_RE
};
