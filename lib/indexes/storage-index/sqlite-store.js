const fs = require("fs");
const Database = require("better-sqlite3");
const { indexDir } = require("../../paths/agent-cms");

const SQLITE_FILE = "catalog.sqlite";
const MODEL = "workspace-field-catalog-sqlite-v1";

function getSqlitePath(agentRoot) {
  return `${indexDir(agentRoot, "storage")}/${SQLITE_FILE}`;
}

function ensureRecordsLineCountColumns(db) {
  const cols = db.prepare("PRAGMA table_info(records)").all();
  const names = new Set(cols.map((row) => row.name));
  if (!names.has("line_count_total")) {
    db.exec("ALTER TABLE records ADD COLUMN line_count_total INTEGER");
  }
  if (!names.has("line_count_body")) {
    db.exec("ALTER TABLE records ADD COLUMN line_count_body INTEGER");
  }
  if (!names.has("source_kind")) {
    db.exec("ALTER TABLE records ADD COLUMN source_kind TEXT DEFAULT 'md'");
  }
  if (!names.has("csv_source_path")) {
    db.exec("ALTER TABLE records ADD COLUMN csv_source_path TEXT");
  }
  if (!names.has("inlink_count")) {
    db.exec("ALTER TABLE records ADD COLUMN inlink_count INTEGER DEFAULT 0");
  }
  if (!names.has("outlink_count")) {
    db.exec("ALTER TABLE records ADD COLUMN outlink_count INTEGER DEFAULT 0");
  }
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
      file_size INTEGER,
      line_count_total INTEGER,
      line_count_body INTEGER,
      source_kind TEXT DEFAULT 'md',
      csv_source_path TEXT,
      inlink_count INTEGER DEFAULT 0,
      outlink_count INTEGER DEFAULT 0
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
  ensureRecordsLineCountColumns(db);
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
      path, schema_context, schema_target, manifest_rel, content_hash, file_mtime_ms, file_size,
      line_count_total, line_count_body, source_kind, csv_source_path, inlink_count, outlink_count
    ) VALUES (
      @path, @schema_context, @schema_target, @manifest_rel, @content_hash, @file_mtime_ms, @file_size,
      @line_count_total, @line_count_body, @source_kind, @csv_source_path, @inlink_count, @outlink_count
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
        writeRecordRow(insertRecord, insertField, record);
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

function recordSourceKind(record) {
  const kind = String(record?.sourceKind || "").trim();
  if (kind) return kind;
  const fromField = record?.fields?.source_kind;
  if (fromField != null && typeof fromField === "object" && "value" in fromField) {
    return String(fromField.value || "md");
  }
  return String(record?.path || "").startsWith("csv:") ? "csv-row" : "md";
}

function writeRecordRow(insertRecord, insertField, record) {
  const path = String(record.path || "").trim();
  if (!path) return;
  insertRecord.run({
    path,
    schema_context: record.schemaContext || null,
    schema_target: record.schemaTarget || null,
    manifest_rel: record.manifestRel || null,
    content_hash: record.contentHash || null,
    file_mtime_ms: Number(record.fileMtimeMs) || null,
    file_size: Number(record.fileSize) || null,
    line_count_total:
      record.lineCountTotal != null && Number.isFinite(Number(record.lineCountTotal))
        ? Number(record.lineCountTotal)
        : null,
    line_count_body:
      record.lineCountBody != null && Number.isFinite(Number(record.lineCountBody))
        ? Number(record.lineCountBody)
        : null,
    source_kind: recordSourceKind(record),
    csv_source_path: record.csvSourcePath || null,
    inlink_count: Number(record.inlinkCount) || 0,
    outlink_count: Number(record.outlinkCount) || 0
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

function writeRecordToDb(db, record, insertRecord, insertField, delFields) {
  const path = String(record.path || "").trim();
  if (!path) return;
  delFields.run(path);
  writeRecordRow(insertRecord, insertField, record);
}

function upsertStorageIndexRecordSqlite(agentRoot, record) {
  if (!agentRoot || !record?.path) return { ok: false, reason: "no_record" };
  const db = openDatabase(agentRoot);
  const insertRecord = db.prepare(`
    INSERT OR REPLACE INTO records (
      path, schema_context, schema_target, manifest_rel, content_hash, file_mtime_ms, file_size,
      line_count_total, line_count_body, source_kind, csv_source_path, inlink_count, outlink_count
    ) VALUES (
      @path, @schema_context, @schema_target, @manifest_rel, @content_hash, @file_mtime_ms, @file_size,
      @line_count_total, @line_count_body, @source_kind, @csv_source_path, @inlink_count, @outlink_count
    )
  `);
  const insertField = db.prepare(`
    INSERT OR REPLACE INTO field_values (path, field_key, value_text, value_type, value_title)
    VALUES (@path, @field_key, @value_text, @value_type, @value_title)
  `);
  const delFields = db.prepare("DELETE FROM field_values WHERE path = ?");
  const tx = db.transaction(() => {
    writeRecordToDb(db, record, insertRecord, insertField, delFields);
  });
  tx();
  db.close();
  return { ok: true, path: record.path };
}

function upsertStorageIndexRecordsBatch(agentRoot, records = []) {
  const list = Array.isArray(records) ? records.filter((r) => r?.path) : [];
  if (!agentRoot || !list.length) return { ok: false, reason: "no_records", count: 0 };
  const db = openDatabase(agentRoot);
  const insertRecord = db.prepare(`
    INSERT OR REPLACE INTO records (
      path, schema_context, schema_target, manifest_rel, content_hash, file_mtime_ms, file_size,
      line_count_total, line_count_body, source_kind, csv_source_path, inlink_count, outlink_count
    ) VALUES (
      @path, @schema_context, @schema_target, @manifest_rel, @content_hash, @file_mtime_ms, @file_size,
      @line_count_total, @line_count_body, @source_kind, @csv_source_path, @inlink_count, @outlink_count
    )
  `);
  const insertField = db.prepare(`
    INSERT OR REPLACE INTO field_values (path, field_key, value_text, value_type, value_title)
    VALUES (@path, @field_key, @value_text, @value_type, @value_title)
  `);
  const delFields = db.prepare("DELETE FROM field_values WHERE path = ?");
  const tx = db.transaction(() => {
    for (const record of list) {
      writeRecordToDb(db, record, insertRecord, insertField, delFields);
    }
  });
  tx();
  db.close();
  return { ok: true, count: list.length };
}

function deleteStorageIndexRecordSqlite(agentRoot, relPath) {
  const path = String(relPath || "").trim();
  if (!agentRoot || !path) return { ok: false, reason: "no_path" };
  const db = openDatabase(agentRoot);
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM field_values WHERE path = ?").run(path);
    db.prepare("DELETE FROM records WHERE path = ?").run(path);
  });
  tx();
  db.close();
  return { ok: true, path };
}

function deleteStorageIndexCsvSourceSqlite(agentRoot, csvRelPath) {
  const rel = String(csvRelPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (!agentRoot || !rel) return { ok: false, reason: "no_path" };
  const db = openDatabase(agentRoot);
  const like = `csv:${rel}#row:%`;
  const tx = db.transaction(() => {
    db.prepare(
      "DELETE FROM field_values WHERE path IN (SELECT path FROM records WHERE csv_source_path = ? OR path LIKE ? ESCAPE '\\')"
    ).run(rel, like);
    db.prepare("DELETE FROM records WHERE csv_source_path = ? OR path LIKE ? ESCAPE '\\'").run(rel, like);
  });
  tx();
  db.close();
  return { ok: true, csvSourcePath: rel };
}

module.exports = {
  SQLITE_FILE,
  getSqlitePath,
  syncStorageIndexSqlite,
  upsertStorageIndexRecordSqlite,
  upsertStorageIndexRecordsBatch,
  deleteStorageIndexRecordSqlite,
  deleteStorageIndexCsvSourceSqlite,
  normalizeBatchSize
};
