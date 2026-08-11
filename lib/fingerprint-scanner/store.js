const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

function getDbAbsolutePath(projectRoot) {
  return path.join(projectRoot, ".agent-cms", "fingerprint-scanner.sqlite");
}

function openDatabase(projectRoot) {
  const dbPath = getDbAbsolutePath(projectRoot);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS fingerprint_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT NOT NULL,
      finger_label TEXT NOT NULL DEFAULT 'primary',
      template_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_fingerprint_login_finger
      ON fingerprint_templates(login, finger_label);
  `);
  return { db, dbPath };
}

function parseTemplateRow(row) {
  if (!row) return null;
  let template = null;
  try {
    template = JSON.parse(row.template_json);
  } catch {
    template = null;
  }
  return {
    id: row.id,
    login: row.login,
    fingerLabel: row.finger_label,
    template,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function createFingerprintStore(projectRoot) {
  const { db, dbPath } = openDatabase(projectRoot);

  const selectAllStmt = db.prepare(`
    SELECT id, login, finger_label, template_json, created_at, updated_at
    FROM fingerprint_templates
    ORDER BY updated_at DESC
  `);

  const selectByLoginStmt = db.prepare(`
    SELECT id, login, finger_label, template_json, created_at, updated_at
    FROM fingerprint_templates
    WHERE login = ?
    ORDER BY updated_at DESC
  `);

  const upsertStmt = db.prepare(`
    INSERT INTO fingerprint_templates (login, finger_label, template_json, created_at, updated_at)
    VALUES (@login, @finger_label, @template_json, @created_at, @updated_at)
    ON CONFLICT(login, finger_label) DO UPDATE SET
      template_json = excluded.template_json,
      updated_at = excluded.updated_at
  `);

  const deleteByLoginStmt = db.prepare(`
    DELETE FROM fingerprint_templates WHERE login = ?
  `);

  return {
    dbPath,
    listTemplates(login = null) {
      const rows = login ? selectByLoginStmt.all(login) : selectAllStmt.all();
      return rows.map(parseTemplateRow).filter(Boolean);
    },
    saveTemplate({ login, fingerLabel = "primary", template }) {
      const now = new Date().toISOString();
      upsertStmt.run({
        login: String(login),
        finger_label: String(fingerLabel || "primary"),
        template_json: JSON.stringify(template),
        created_at: now,
        updated_at: now
      });
      return this.listTemplates(login)[0] || null;
    },
    deleteTemplatesForLogin(login) {
      const result = deleteByLoginStmt.run(String(login));
      return result.changes;
    },
    close() {
      db.close();
    }
  };
}

module.exports = {
  getDbAbsolutePath,
  createFingerprintStore
};
