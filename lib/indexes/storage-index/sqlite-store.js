const fs = require("fs");
const Database = require("better-sqlite3");
const { indexDir } = require("../../paths/agent-cms");

const SQLITE_FILE = "catalog.sqlite";
const MODEL = "workspace-field-catalog-sqlite-v1";

function getSqlitePath(agentRoot) {
  return `${indexDir(agentRoot, "storage")}/${SQLITE_FILE}`;
}

function openDatabase(agentRoot) {
  const file = getSqlitePath(agentRoot);
  fs.mkdirSync(indexDir(agentRoot, "storage"), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS records (
      path TEXT PRIMARY KEY,
      schema_context TEXT,
      schema_target TEXT,
      manifest_rel TEXT,
      content_hash TEXT,
      file_mtime_ms INTEGER,
      file_size INTEGER
    );
    CREATE TABLE IF NOT EXISTS field_values (
      path TEXT NOT NULL,
      field_key TEXT NOT NULL,
      value_text TEXT,
      value_type TEXT,
      value_title TEXT,
      PRIMARY KEY (path, field_key)
    );
    CREATE INDEX IF NOT EXISTS idx_field_values_key ON field_values(field_key);
    CREATE INDEX IF NOT EXISTS idx_field_values_key_value ON field_values(field_key, value_text);
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

function fieldEntryParts(entry) {
  if (entry != null && typeof entry === "object" && !Array.isArray(entry) && "value" in entry) {
    return {
      value: entry.value == null ? "" : String(entry.value),
      type: entry.type != null ? String(entry.type) : null,
      title: entry.title != null ? String(entry.title) : null
    };
  }
  return {
    value: entry == null ? "" : String(entry),
    type: null,
    title: null
  };
}

function normalizeBatchSize(batchSize) {
  const n = Number(batchSize);
  if (!Number.isFinite(n)) return 30;
  return Math.min(500, Math.max(1, Math.floor(n)));
}

function syncStorageIndexSqlite(agentRoot, index, batchSize = 30) {
  if (!agentRoot || !index?.records) return { ok: false, reason: "no_index" };
  const batch = normalizeBatchSize(batchSize);
  const db = openDatabase(agentRoot);
  const insertRecord = db.prepare(`
    INSERT OR REPLACE INTO records (
      path, schema_context, schema_target, manifest_rel, content_hash, file_mtime_ms, file_size
    ) VALUES (
      @path, @schema_context, @schema_target, @manifest_rel, @content_hash, @file_mtime_ms, @file_size
    )
  `);
  const insertField = db.prepare(`
    INSERT OR REPLACE INTO field_values (path, field_key, value_text, value_type, value_title)
    VALUES (@path, @field_key, @value_text, @value_type, @value_title)
  `);
  const delMeta = db.prepare("DELETE FROM meta");
  const insMeta = db.prepare("INSERT INTO meta (key, value) VALUES (?, ?)");

  const records = Array.isArray(index.records) ? index.records : [];
  const writeAll = db.transaction(() => {
    db.exec("DELETE FROM field_values");
    db.exec("DELETE FROM records");
    for (let offset = 0; offset < records.length; offset += batch) {
      const chunk = records.slice(offset, offset + batch);
      for (const record of chunk) {
        const path = String(record.path || "").trim();
        if (!path) continue;
        insertRecord.run({
          path,
          schema_context: record.schemaContext || null,
          schema_target: record.schemaTarget || null,
          manifest_rel: record.manifestRel || null,
          content_hash: record.contentHash || null,
          file_mtime_ms: Number(record.fileMtimeMs) || null,
          file_size: Number(record.fileSize) || null
        });
        for (const [fieldKey, rawEntry] of Object.entries(record.fields || {})) {
          const parts = fieldEntryParts(rawEntry);
          insertField.run({
            path,
            field_key: fieldKey,
            value_text: parts.value,
            value_type: parts.type,
            value_title: parts.title
          });
        }
      }
    }
    delMeta.run();
    const merged = {
      model: index.model || MODEL,
      builtAt: index.builtAt || "",
      enrichmentMode: index.enrichmentMode || "",
      recordCount: String(index.recordCount ?? records.length),
      fieldCount: String(index.fieldCount ?? 0),
      schemaFingerprint: index.schemaFingerprint || "",
      contentHashAlgo: index.contentHashAlgo || "",
      sqliteBatchSize: String(batch)
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value == null || value === "") continue;
      insMeta.run(key, String(value));
    }
  });
  writeAll();
  db.close();
  return { ok: true, sqlitePath: SQLITE_FILE, batchSize: batch, recordCount: records.length };
}

module.exports = {
  SQLITE_FILE,
  getSqlitePath,
  syncStorageIndexSqlite,
  normalizeBatchSize
};
