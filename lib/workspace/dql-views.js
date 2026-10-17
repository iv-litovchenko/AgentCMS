const fs = require("fs/promises");
const path = require("path");
const yaml = require("js-yaml");
const { rel } = require("../paths/agent-cms");

const DQL_VIEWS_MODEL = "workspace-dql-views-v1";
const DQL_VIEWS_REL = `${rel.settings.dir}/dql-views.yml`;

function slugId(name) {
  const base = String(name || "view")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `view-${Date.now()}`;
}

function normalizeView(entry) {
  const id = String(entry?.id || "").trim() || slugId(entry?.name);
  const dql = String(entry?.dql || "").trim();
  if (!dql) return null;
  return {
    id,
    name: String(entry?.name || id).trim() || id,
    comment: String(entry?.comment || "").trim(),
    dql,
    updatedAt: entry?.updatedAt || new Date().toISOString()
  };
}

function buildDefaultCatalog() {
  return {
    version: 1,
    model: DQL_VIEWS_MODEL,
    description: "Saved DQL-lite views for dashboard and search UI",
    views: []
  };
}

async function readDqlViewsFile(agentRoot) {
  const file = path.join(agentRoot, DQL_VIEWS_REL);
  try {
    const raw = await fs.readFile(file, "utf-8");
    const doc = yaml.load(raw);
    if (!doc || typeof doc !== "object") return buildDefaultCatalog();
    return {
      ...buildDefaultCatalog(),
      ...doc,
      views: Array.isArray(doc.views) ? doc.views.map(normalizeView).filter(Boolean) : []
    };
  } catch (error) {
    if (error && error.code === "ENOENT") return buildDefaultCatalog();
    throw error;
  }
}

async function writeDqlViewsFile(agentRoot, catalog) {
  const file = path.join(agentRoot, DQL_VIEWS_REL);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const payload = {
    version: 1,
    model: DQL_VIEWS_MODEL,
    description: catalog.description || buildDefaultCatalog().description,
    views: (catalog.views || []).map(normalizeView).filter(Boolean)
  };
  await fs.writeFile(file, `${yaml.dump(payload, { lineWidth: 120 })}`, "utf-8");
  return payload;
}

async function listDqlViews(agentRoot) {
  const catalog = await readDqlViewsFile(agentRoot);
  return { ok: true, catalog, views: catalog.views };
}

async function upsertDqlView(agentRoot, payload = {}) {
  const catalog = await readDqlViewsFile(agentRoot);
  const view = normalizeView({
    id: payload.id || slugId(payload.name),
    name: payload.name,
    comment: payload.comment,
    dql: payload.dql,
    updatedAt: new Date().toISOString()
  });
  if (!view) throw new Error("dql is required");
  const idx = catalog.views.findIndex((v) => v.id === view.id);
  if (idx >= 0) catalog.views[idx] = view;
  else catalog.views.push(view);
  catalog.views.sort((a, b) => a.name.localeCompare(b.name, "ru"));
  await writeDqlViewsFile(agentRoot, catalog);
  return { ok: true, view, views: catalog.views };
}

async function deleteDqlView(agentRoot, id) {
  const catalog = await readDqlViewsFile(agentRoot);
  const key = String(id || "").trim();
  if (!key) throw new Error("id is required");
  const before = catalog.views.length;
  catalog.views = catalog.views.filter((v) => v.id !== key);
  if (catalog.views.length === before) throw new Error(`Unknown dql view id "${key}"`);
  await writeDqlViewsFile(agentRoot, catalog);
  return { ok: true, views: catalog.views };
}

module.exports = {
  DQL_VIEWS_REL,
  DQL_VIEWS_MODEL,
  listDqlViews,
  upsertDqlView,
  deleteDqlView,
  readDqlViewsFile
};
