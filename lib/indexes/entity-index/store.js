const fs = require("fs");
const crypto = require("crypto");
const Database = require("better-sqlite3");
const { rel, indexDir } = require("../../paths/agent-cms");

const INDEX_FILE = "entities.sqlite";
const MODEL = "workspace-entity-index-v1-prototype";

function getIndexPaths(agentRoot) {
  const dir = indexDir(agentRoot, "entity");
  return { dir, file: `${dir}/${INDEX_FILE}` };
}

function normalizeLabel(label) {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function buildEntityId(type, label) {
  const norm = normalizeLabel(label);
  const digest = crypto.createHash("sha1").update(`${type}\0${norm}`).digest("hex").slice(0, 16);
  const slug = norm
    .replace(/[^a-z0-9\u0400-\u04ff\-_.]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `${type}:${slug || digest}:${digest}`;
}

function openDatabase(agentRoot) {
  const { dir, file } = getIndexPaths(agentRoot);
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      label_norm TEXT NOT NULL,
      mention_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);
    CREATE INDEX IF NOT EXISTS idx_entities_label_norm ON entities(label_norm);
    CREATE TABLE IF NOT EXISTS mentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_id TEXT NOT NULL,
      path TEXT NOT NULL,
      line INTEGER NOT NULL DEFAULT 1,
      col_start INTEGER NOT NULL DEFAULT 0,
      col_end INTEGER NOT NULL DEFAULT 0,
      snippet TEXT,
      source TEXT NOT NULL DEFAULT 'regex',
      FOREIGN KEY(entity_id) REFERENCES entities(id) ON DELETE CASCADE,
      UNIQUE(entity_id, path, line, col_start, source)
    );
    CREATE INDEX IF NOT EXISTS idx_mentions_entity ON mentions(entity_id);
    CREATE INDEX IF NOT EXISTS idx_mentions_path ON mentions(path);
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

function getStatusFromDb(agentRoot) {
  const db = openDatabase(agentRoot);
  try {
    const meta = {};
    for (const row of db.prepare("SELECT key, value FROM meta").all()) {
      meta[row.key] = row.value;
    }
    const entityCount = db.prepare("SELECT COUNT(*) AS c FROM entities").get()?.c || 0;
    const mentionCount = db.prepare("SELECT COUNT(*) AS c FROM mentions").get()?.c || 0;
    const fileCount = db.prepare("SELECT COUNT(DISTINCT path) AS c FROM mentions").get()?.c || 0;
    const typeRows = db.prepare("SELECT type, COUNT(*) AS c FROM entities GROUP BY type ORDER BY c DESC").all();
    const builtAt = meta.builtAt || null;
    const lastRebuildMs = meta.lastRebuildMs != null ? Number(meta.lastRebuildMs) : null;
    const ready = Boolean(builtAt) || entityCount > 0 || mentionCount > 0;
    return {
      ready,
      model: meta.model || MODEL,
      builtAt,
      lastRebuildMs: Number.isFinite(lastRebuildMs) ? lastRebuildMs : null,
      entityCount,
      mentionCount,
      fileCount,
      typeCounts: Object.fromEntries(typeRows.map((r) => [r.type, r.c])),
      hint: ready ? null : "Реестр сущностей не построен — нажмите «Пересобрать»"
    };
  } finally {
    db.close();
  }
}

function replaceAllMentions(agentRoot, mentions, meta = {}, seeds = []) {
  const db = openDatabase(agentRoot);
  const insEntity = db.prepare(
    "INSERT INTO entities (id, type, label, label_norm, mention_count) VALUES (@id, @type, @label, @label_norm, @mention_count)"
  );
  const insMention = db.prepare(
    `INSERT OR REPLACE INTO mentions (entity_id, path, line, col_start, col_end, snippet, source)
     VALUES (@entity_id, @path, @line, @col_start, @col_end, @snippet, @source)`
  );
  const delMeta = db.prepare("DELETE FROM meta");
  const insMeta = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");

  const entityCounts = new Map();
  const entityRows = new Map();

  for (const row of mentions) {
    const id = buildEntityId(row.type, row.label);
    entityCounts.set(id, (entityCounts.get(id) || 0) + 1);
    if (!entityRows.has(id)) {
      entityRows.set(id, {
        id,
        type: row.type,
        label: row.label,
        label_norm: normalizeLabel(row.label)
      });
    }
  }
  for (const seed of seeds || []) {
    const id = buildEntityId(seed.type, seed.label);
    if (!entityRows.has(id)) {
      entityRows.set(id, {
        id,
        type: seed.type,
        label: seed.label,
        label_norm: normalizeLabel(seed.label)
      });
      if (!entityCounts.has(id)) entityCounts.set(id, 0);
    }
  }

  const tx = db.transaction(() => {
    db.exec("DELETE FROM mentions");
    db.exec("DELETE FROM entities");
    for (const entity of entityRows.values()) {
      insEntity.run({
        ...entity,
        mention_count: entityCounts.get(entity.id) || 0
      });
    }
    for (const row of mentions) {
      const entity_id = buildEntityId(row.type, row.label);
      insMention.run({
        entity_id,
        path: row.path,
        line: row.line != null ? Number(row.line) : 1,
        col_start: row.col_start != null ? Number(row.col_start) : 0,
        col_end: row.col_end != null ? Number(row.col_end) : 0,
        snippet: row.snippet || "",
        source: row.source || "regex"
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

function replaceMentionsForPath(agentRoot, relPath, mentions) {
  const db = openDatabase(agentRoot);
  const path = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const del = db.prepare("DELETE FROM mentions WHERE path = ?");
  const insMention = db.prepare(
    `INSERT OR REPLACE INTO mentions (entity_id, path, line, col_start, col_end, snippet, source)
     VALUES (@entity_id, @path, @line, @col_start, @col_end, @snippet, @source)`
  );
  const upsertEntity = db.prepare(`
    INSERT INTO entities (id, type, label, label_norm, mention_count)
    VALUES (@id, @type, @label, @label_norm, @mention_count)
    ON CONFLICT(id) DO UPDATE SET
      mention_count = (SELECT COUNT(*) FROM mentions m WHERE m.entity_id = excluded.id)
  `);
  const refreshEntityCount = db.prepare(
    "UPDATE entities SET mention_count = (SELECT COUNT(*) FROM mentions m WHERE m.entity_id = ?) WHERE id = ?"
  );
  const deleteOrphanEntities = db.prepare(
    "DELETE FROM entities WHERE id NOT IN (SELECT DISTINCT entity_id FROM mentions)"
  );

  const tx = db.transaction(() => {
    del.run(path);
    const touched = new Set();
    for (const row of mentions) {
      const entity_id = buildEntityId(row.type, row.label);
      touched.add(entity_id);
      insMention.run({
        entity_id,
        path,
        line: row.line != null ? Number(row.line) : 1,
        col_start: row.col_start != null ? Number(row.col_start) : 0,
        col_end: row.col_end != null ? Number(row.col_end) : 0,
        snippet: row.snippet || "",
        source: row.source || "regex"
      });
      upsertEntity.run({
        id: entity_id,
        type: row.type,
        label: row.label,
        label_norm: normalizeLabel(row.label),
        mention_count: 0
      });
    }
    for (const id of touched) refreshEntityCount.run(id, id);
    deleteOrphanEntities.run();
  });
  tx();
  db.close();
}

function queryDb(agentRoot, sql, params = []) {
  const db = openDatabase(agentRoot);
  try {
    return db.prepare(sql).all(...params);
  } finally {
    db.close();
  }
}

module.exports = {
  INDEX_FILE,
  MODEL,
  getIndexPaths,
  getStatusFromDb,
  replaceAllMentions,
  replaceMentionsForPath,
  queryDb,
  buildEntityId,
  normalizeLabel
};
