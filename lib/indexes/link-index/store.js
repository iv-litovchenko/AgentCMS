const fs = require("fs");
const Database = require("better-sqlite3");
const { rel, indexDir } = require("../../paths/agent-cms");

const INDEX_DIR = rel.indexes.link;
const INDEX_FILE = "edges.sqlite";
const MODEL = "workspace-link-graph-v1";

function getIndexPaths(agentRoot) {
  const dir = indexDir(agentRoot, "link");
  return { dir, file: `${dir}/${INDEX_FILE}` };
}

function ensureEdgesLineColumn(db) {
  const cols = db.prepare("PRAGMA table_info(edges)").all();
  const names = new Set(cols.map((row) => row.name));
  if (names.has("line")) return;

  db.exec(`
    CREATE TABLE edges_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_path TEXT NOT NULL,
      to_target TEXT NOT NULL,
      to_resolved TEXT,
      kind TEXT NOT NULL,
      line INTEGER NOT NULL DEFAULT 0,
      UNIQUE(from_path, to_target, kind, line)
    );
    INSERT INTO edges_new (id, from_path, to_target, to_resolved, kind, line)
      SELECT id, from_path, to_target, to_resolved, kind, 0 FROM edges;
    DROP TABLE edges;
    ALTER TABLE edges_new RENAME TO edges;
    CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_path);
    CREATE INDEX IF NOT EXISTS idx_edges_to_resolved ON edges(to_resolved);
    CREATE INDEX IF NOT EXISTS idx_edges_to_target ON edges(to_target);
  `);
}

function openDatabase(agentRoot) {
  const { dir, file } = getIndexPaths(agentRoot);
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS edges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_path TEXT NOT NULL,
      to_target TEXT NOT NULL,
      to_resolved TEXT,
      kind TEXT NOT NULL,
      line INTEGER NOT NULL DEFAULT 0,
      UNIQUE(from_path, to_target, kind, line)
    );
    CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_path);
    CREATE INDEX IF NOT EXISTS idx_edges_to_resolved ON edges(to_resolved);
    CREATE INDEX IF NOT EXISTS idx_edges_to_target ON edges(to_target);
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  ensureEdgesLineColumn(db);
  return db;
}

function loadMeta(agentRoot) {
  const db = openDatabase(agentRoot);
  try {
    const rows = db.prepare("SELECT key, value FROM meta").all();
    const meta = {};
    for (const row of rows) meta[row.key] = row.value;
    return meta;
  } finally {
    db.close();
  }
}

function getStatusFromDb(agentRoot) {
  const db = openDatabase(agentRoot);
  try {
    const meta = {};
    for (const row of db.prepare("SELECT key, value FROM meta").all()) {
      meta[row.key] = row.value;
    }
    const edgeCount = db.prepare("SELECT COUNT(*) AS c FROM edges").get()?.c || 0;
    const nodeCount =
      db
        .prepare(
          `SELECT COUNT(DISTINCT path) AS c FROM (
            SELECT from_path AS path FROM edges
            UNION
            SELECT COALESCE(to_resolved, to_target) AS path FROM edges
          )`
        )
        .get()?.c || 0;
    const builtAt = meta.builtAt || null;
    const lastRebuildMs = meta.lastRebuildMs != null ? Number(meta.lastRebuildMs) : null;
    return {
      ready: edgeCount > 0,
      model: meta.model || MODEL,
      builtAt,
      lastRebuildMs: Number.isFinite(lastRebuildMs) ? lastRebuildMs : null,
      edgeCount,
      nodeCount,
      fileCount: meta.fileCount != null ? Number(meta.fileCount) : null,
      hint: edgeCount > 0 ? null : "Граф связей не построен"
    };
  } finally {
    db.close();
  }
}

function replaceAllEdges(agentRoot, edges, meta = {}) {
  const db = openDatabase(agentRoot);
  const insert = db.prepare(
    "INSERT OR REPLACE INTO edges (from_path, to_target, to_resolved, kind, line) VALUES (@from_path, @to_target, @to_resolved, @kind, @line)"
  );
  const delMeta = db.prepare("DELETE FROM meta");
  const insMeta = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");

  const tx = db.transaction(() => {
    db.exec("DELETE FROM edges");
    for (const edge of edges) {
      insert.run({
        from_path: edge.from_path,
        to_target: edge.to_target,
        to_resolved: edge.to_resolved,
        kind: edge.kind,
        line: edge.line != null ? Number(edge.line) : 0
      });
    }
    delMeta.run();
    const merged = { model: MODEL, ...meta };
    for (const [key, value] of Object.entries(merged)) {
      if (value == null) continue;
      insMeta.run(key, String(value));
    }
  });
  tx();
  db.close();
}

function replaceEdgesForPath(agentRoot, fromPath, edges) {
  const db = openDatabase(agentRoot);
  const del = db.prepare("DELETE FROM edges WHERE from_path = ?");
  const insert = db.prepare(
    "INSERT OR REPLACE INTO edges (from_path, to_target, to_resolved, kind, line) VALUES (@from_path, @to_target, @to_resolved, @kind, @line)"
  );
  const tx = db.transaction(() => {
    del.run(fromPath);
    for (const edge of edges) {
      insert.run({
        from_path: edge.from_path,
        to_target: edge.to_target,
        to_resolved: edge.to_resolved,
        kind: edge.kind,
        line: edge.line != null ? Number(edge.line) : 0
      });
    }
  });
  tx();
  db.close();
}

function queryEdges(agentRoot, sql, params = []) {
  const db = openDatabase(agentRoot);
  try {
    return db.prepare(sql).all(...params);
  } finally {
    db.close();
  }
}

function listIndexedFromPaths(agentRoot) {
  const db = openDatabase(agentRoot);
  try {
    return db.prepare("SELECT DISTINCT from_path AS path FROM edges ORDER BY from_path").all().map((r) => r.path);
  } finally {
    db.close();
  }
}

module.exports = {
  INDEX_DIR,
  INDEX_FILE,
  MODEL,
  getIndexPaths,
  getStatusFromDb,
  replaceAllEdges,
  replaceEdgesForPath,
  queryEdges,
  listIndexedFromPaths,
  loadMeta
};
