const fs = require("fs");
const Database = require("better-sqlite3");
const { getIndexPaths } = require("../../link-index/store");

function loadLinkStatsMap(agentRoot) {
  const { file } = getIndexPaths(agentRoot);
  if (!fs.existsSync(file)) return new Map();

  const db = new Database(file, { readonly: true });
  try {
    const inRows = db
      .prepare(
        `SELECT to_resolved AS path, COUNT(*) AS c FROM edges
         WHERE to_resolved IS NOT NULL AND TRIM(to_resolved) != ''
         GROUP BY to_resolved`
      )
      .all();
    const outRows = db.prepare(`SELECT from_path AS path, COUNT(*) AS c FROM edges GROUP BY from_path`).all();
    const map = new Map();
    for (const row of inRows) {
      const p = String(row.path || "");
      if (!map.has(p)) map.set(p, { inlinkCount: 0, outlinkCount: 0 });
      map.get(p).inlinkCount = Number(row.c) || 0;
    }
    for (const row of outRows) {
      const p = String(row.path || "");
      if (!map.has(p)) map.set(p, { inlinkCount: 0, outlinkCount: 0 });
      map.get(p).outlinkCount = Number(row.c) || 0;
    }
    return map;
  } finally {
    db.close();
  }
}

function pathMatchesLinkFilter(agentRoot, recordPath, field, op, value) {
  const { file } = getIndexPaths(agentRoot);
  if (!fs.existsSync(file)) return op === "eq" && value == null;

  const db = new Database(file, { readonly: true });
  const needle = value == null ? "" : String(value);
  try {
    if (field === "file.outlinks") {
      if (op === "contains") {
        const row = db
          .prepare(
            `SELECT 1 FROM edges WHERE from_path = ? AND (
              COALESCE(to_resolved,'') LIKE '%' || ? || '%' OR COALESCE(to_target,'') LIKE '%' || ? || '%'
            ) LIMIT 1`
          )
          .get(recordPath, needle, needle);
        return Boolean(row);
      }
      if (op === "eq") {
        const row = db
          .prepare(
            `SELECT 1 FROM edges WHERE from_path = ? AND (to_resolved = ? OR to_target = ?) LIMIT 1`
          )
          .get(recordPath, needle, needle);
        return Boolean(row);
      }
    }
    if (field === "file.inlinks") {
      if (op === "contains") {
        const row = db
          .prepare(`SELECT 1 FROM edges WHERE to_resolved = ? AND from_path LIKE '%' || ? || '%' LIMIT 1`)
          .get(recordPath, needle);
        return Boolean(row);
      }
      if (op === "eq") {
        const row = db.prepare(`SELECT 1 FROM edges WHERE to_resolved = ? AND from_path = ? LIMIT 1`).get(recordPath, needle);
        return Boolean(row);
      }
    }
    return false;
  } finally {
    db.close();
  }
}

module.exports = { loadLinkStatsMap, pathMatchesLinkFilter };
