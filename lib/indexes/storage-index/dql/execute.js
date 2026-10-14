const fs = require("fs");
const Database = require("better-sqlite3");
const { parseDql } = require("./parse");
const { createMemoryEvaluator } = require("./eval-memory");
const { compileDqlSqlite, recordColumn } = require("./compile-sqlite");
const { getSqlitePath, syncStorageIndexSqlite } = require("../sqlite-store");
const { loadLinkStatsMap } = require("./link-stats");
const { flattenRecords, groupRecords, applyRelativeDays } = require("./post-process");
const {
  validateDqlInput,
  normalizePlanLimits,
  createDeadline,
  DQL_EXEC_TIMEOUT_MS,
  DQL_CHECK_EVERY_N_RECORDS
} = require("./limits");
const { exprUsesLinkFields, walkExpr } = require("./walk");

const NON_SQLITE_FIELDS = new Set([
  "file.name",
  "file.folder",
  "file.ext",
  "file.inlink-count",
  "file.outlink-count",
  "file.inlinks",
  "file.outlinks"
]);

function exprUsesNonSqliteFields(node) {
  let found = false;
  walkExpr(node, (n) => {
    if (n.type === "compare" || n.type === "relative-days") {
      const field = n.field;
      if (NON_SQLITE_FIELDS.has(field)) found = true;
      if (field && field.startsWith("file.") && !recordColumn(field)) found = true;
    }
  });
  return found;
}

function planRequiresMemory(plan) {
  if (plan.flatten || plan.groupBy) return true;
  if (plan.where && (exprUsesLinkFields(plan.where) || exprUsesNonSqliteFields(plan.where))) return true;
  const sorts = Array.isArray(plan.sort) ? plan.sort : plan.sort?.field ? [plan.sort] : [];
  for (const item of sorts) {
    if (NON_SQLITE_FIELDS.has(item.field) || (item.field?.startsWith("file.") && !recordColumn(item.field))) {
      return true;
    }
  }
  return false;
}

function sqliteFileReady(agentRoot) {
  const file = getSqlitePath(agentRoot);
  if (!fs.existsSync(file)) return false;
  try {
    const db = new Database(file, { readonly: true });
    const row = db.prepare("SELECT COUNT(*) AS c FROM records").get();
    db.close();
    return Number(row?.c) > 0;
  } catch {
    return false;
  }
}

function queryPathsSqlite(agentRoot, plan) {
  const file = getSqlitePath(agentRoot);
  const db = new Database(file, { readonly: true });
  const { sql, countSql, params, countParams } = compileDqlSqlite(plan);
  const totalRow = db.prepare(countSql).get(...countParams);
  const rows = db.prepare(sql).all(...params);
  db.close();
  return {
    paths: rows.map((r) => r.path),
    total: Number(totalRow?.total) || 0,
    engine: "sqlite"
  };
}

function runMemoryPipeline(agentRoot, index, plan, execOptions = {}) {
  const deadline = execOptions.deadline || createDeadline(DQL_EXEC_TIMEOUT_MS);
  const linkStatsMap = loadLinkStatsMap(agentRoot);
  const memory = createMemoryEvaluator(agentRoot, linkStatsMap);
  let rows = memory.filterRecords(index.records || [], plan, {
    deadline,
    checkEvery: DQL_CHECK_EVERY_N_RECORDS
  });
  const totalBeforeSlice = rows.length;

  if (plan.flatten) {
    rows = flattenRecords(rows, plan.flatten, linkStatsMap);
  }

  if (plan.groupBy) {
    const grouped = groupRecords(rows, plan, linkStatsMap);
    return {
      engine: "memory",
      total: grouped.total,
      results: grouped.rows,
      mode: "group"
    };
  }

  rows = memory.sortRecords(rows, plan.sort);
  rows = rows.slice(0, plan.limit).map((record) => memory.projectRecord(record, plan.select));

  return {
    engine: "memory",
    total: totalBeforeSlice,
    results: rows,
    mode: "rows"
  };
}

function hydrateResults(index, paths, select, agentRoot) {
  const linkStatsMap = loadLinkStatsMap(agentRoot);
  const memory = createMemoryEvaluator(agentRoot, linkStatsMap);
  const byPath = new Map((index.records || []).map((r) => [r.path, r]));
  const results = [];
  for (const path of paths) {
    const record = byPath.get(path);
    if (!record) continue;
    results.push(memory.projectRecord(record, select));
  }
  return results;
}

function parseAndNormalize(dqlString, payload = {}) {
  validateDqlInput(dqlString);
  let plan = parseDql(dqlString);
  if (payload.pathPrefix) {
    plan.from = String(payload.pathPrefix)
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/\/+$/, "");
  }
  if (payload.limit != null) {
    const n = Number(payload.limit);
    if (Number.isFinite(n)) plan.limit = Math.min(500, Math.max(1, n));
  }
  if (Array.isArray(payload.fields) && payload.fields.length) {
    plan.select = payload.fields;
  }
  if (payload.sort && typeof payload.sort === "object" && payload.sort.field) {
    plan.sort = {
      field: payload.sort.field,
      dir: payload.sort.dir === "desc" ? "desc" : "asc"
    };
  }
  const days = Number(payload.relativeDays);
  const relativeField = String(payload.relativeDaysField || "awn-update").trim();
  if (Number.isFinite(days) && days > 0 && relativeField) {
    plan.relativeDaysFilters = [{ field: relativeField, days }];
  }
  plan = applyRelativeDays(plan);
  return normalizePlanLimits(plan);
}

function executeDqlQuery(agentRoot, index, dqlString, payload = {}, options = {}) {
  const plan = parseAndNormalize(dqlString, payload);
  const select = plan.select;
  const execOptions = {
    deadline: options.deadline || createDeadline(Number(options.timeoutMs) || DQL_EXEC_TIMEOUT_MS)
  };

  if (plan.groupBy || plan.flatten || planRequiresMemory(plan)) {
    const mem = runMemoryPipeline(agentRoot, index, plan, execOptions);
    return { plan, ...mem };
  }

  const trySqlite = () => {
    if (!sqliteFileReady(agentRoot)) return null;
    const { paths, total, engine } = queryPathsSqlite(agentRoot, plan);
    return {
      plan,
      engine,
      total,
      results: hydrateResults(index, paths, select, agentRoot),
      mode: "rows"
    };
  };

  let result = trySqlite();
  if (result) return result;

  if (options.sqliteEnabled && index?.records?.length) {
    try {
      syncStorageIndexSqlite(agentRoot, index, options.batchSize);
      result = trySqlite();
      if (result) return result;
    } catch {
      // fallback memory
    }
  }

  const mem = runMemoryPipeline(agentRoot, index, plan, execOptions);
  return { plan, ...mem };
}

module.exports = {
  parseDql,
  parseAndNormalize,
  executeDqlQuery,
  sqliteFileReady,
  planRequiresMemory
};
