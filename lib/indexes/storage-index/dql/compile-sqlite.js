const { compileFromPrefixSql } = require("./path-prefix");

const RECORD_COLUMNS = new Set([
  "path",
  "schema_context",
  "schema_target",
  "manifest_rel",
  "content_hash",
  "file_mtime_ms",
  "file_size",
  "line_count_total",
  "line_count_body",
  "source_kind",
  "inlink_count",
  "outlink_count"
]);

const RECORD_FIELD_ALIASES = {
  path: "path",
  "file.mtime": "file_mtime_ms",
  "file.size": "file_size",
  source_kind: "source_kind",
  "file.type": "source_kind",
  "file.inlink-count": "inlink_count",
  "file.outlink-count": "outlink_count",
  inlinkCount: "inlink_count",
  outlinkCount: "outlink_count",
  lineCountTotal: "line_count_total",
  lineCountBody: "line_count_body"
};

function recordColumn(field) {
  const key = RECORD_FIELD_ALIASES[field] || field;
  if (RECORD_COLUMNS.has(key)) return key;
  if (key === "file_mtime_ms" || key === "file_size" || key === "line_count_total" || key === "line_count_body") {
    return key;
  }
  return null;
}

function compileCompare(node, ctx) {
  const col = recordColumn(node.field);
  const param = () => {
    ctx.params.push(node.value == null ? null : String(node.value));
    return "?";
  };

  if (col === "path" && node.op === "contains") {
    const p = param();
    return `(r.path LIKE '%' || ${p} || '%' ESCAPE '\\')`;
  }
  if (col) {
    const p = param();
    switch (node.op) {
      case "eq":
        return node.value == null ? `r.${col} IS NULL` : `r.${col} = ${p}`;
      case "ne":
        return node.value == null ? `r.${col} IS NOT NULL` : `(r.${col} IS NULL OR r.${col} != ${p})`;
      case "contains":
        return `(r.${col} LIKE '%' || ${p} || '%' ESCAPE '\\' COLLATE NOCASE)`;
      case "gt":
        return `(r.${col} > ${p})`;
      case "gte":
        return `(r.${col} >= ${p})`;
      case "lt":
        return `(r.${col} < ${p})`;
      case "lte":
        return `(r.${col} <= ${p})`;
      default:
        return "1=0";
    }
  }

  ctx.params.push(node.field);
  const fk = "?";
  const existsBase = `EXISTS (SELECT 1 FROM field_values fv WHERE fv.path = r.path AND fv.field_key = ${fk}`;

  switch (node.op) {
    case "eq":
      if (node.value == null) {
        return `NOT EXISTS (SELECT 1 FROM field_values fv WHERE fv.path = r.path AND fv.field_key = ?)`;
      }
      return `${existsBase} AND fv.value_text = ${param()})`;
    case "ne":
      if (node.value == null) {
        return `${existsBase})`;
      }
      return `NOT (${existsBase} AND fv.value_text = ${param()}))`;
    case "contains":
      return `${existsBase} AND fv.value_text LIKE '%' || ${param()} || '%' ESCAPE '\\' COLLATE NOCASE)`;
    case "gt":
      return `${existsBase} AND fv.value_text > ${param()})`;
    case "gte":
      return `${existsBase} AND fv.value_text >= ${param()})`;
    case "lt":
      return `${existsBase} AND fv.value_text < ${param()})`;
    case "lte":
      return `${existsBase} AND fv.value_text <= ${param()})`;
    default:
      return "1=0";
  }
}

function compileExpr(node, ctx) {
  if (!node) return "1=1";
  switch (node.type) {
    case "compare":
      return compileCompare(node, ctx);
    case "and":
      return `(${compileExpr(node.left, ctx)} AND ${compileExpr(node.right, ctx)})`;
    case "or":
      return `(${compileExpr(node.left, ctx)} OR ${compileExpr(node.right, ctx)})`;
    case "not":
      return `(NOT ${compileExpr(node.expr, ctx)})`;
    case "group":
      return compileExpr(node.expr, ctx);
    default:
      return "1=0";
  }
}

function compileWhereClause(plan, ctx) {
  const whereParts = [];

  if (plan.from) {
    const compiled = compileFromPrefixSql(plan.from);
    whereParts.push(compiled.sql);
    ctx.params.push(...compiled.params);
  }

  if (plan.where) {
    whereParts.push(compileExpr(plan.where, ctx));
  }

  return whereParts.length ? whereParts.join(" AND ") : "1=1";
}

function compileDqlSqlite(plan) {
  const whereCtx = { params: [] };
  const whereSql = compileWhereClause(plan, whereCtx);
  const countSql = `SELECT COUNT(*) AS total FROM records r WHERE ${whereSql}`;
  const countParams = [...whereCtx.params];

  const sqlParams = [...whereCtx.params];
  let orderSql = "";
  const sorts = Array.isArray(plan.sort) ? plan.sort : plan.sort?.field ? [plan.sort] : [];
  if (sorts.length) {
    const parts = [];
    for (const item of sorts) {
      const sortCol = recordColumn(item.field);
      const dir = item.dir === "desc" ? "DESC" : "ASC";
      if (sortCol) {
        parts.push(`r.${sortCol} ${dir}`);
      } else {
        sqlParams.push(item.field);
        parts.push(
          `(SELECT fv.value_text FROM field_values fv WHERE fv.path = r.path AND fv.field_key = ? LIMIT 1) ${dir}`
        );
      }
    }
    orderSql = ` ORDER BY ${parts.join(", ")}`;
  }

  sqlParams.push(plan.limit ?? 50);

  const sql = `
    SELECT r.path AS path
    FROM records r
    WHERE ${whereSql}
    ${orderSql}
    LIMIT ?
  `.trim();

  return { sql, countSql, params: sqlParams, countParams };
}

module.exports = { compileDqlSqlite, recordColumn };
