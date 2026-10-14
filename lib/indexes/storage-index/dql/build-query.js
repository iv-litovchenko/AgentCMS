/**
 * Simple visual builder → DQL string (AND-only conditions).
 */
function quoteValue(value) {
  if (value == null || value === "") return '""';
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  const text = String(value);
  return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function buildDqlFromBuilder(spec = {}) {
  const lines = [];
  const from = String(spec.from || spec.pathPrefix || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (from) lines.push(`FROM ${from.includes("/") ? from : quoteValue(from)}`);

  const conditions = Array.isArray(spec.conditions) ? spec.conditions : [];
  const whereParts = [];
  const sourceKind = String(spec.sourceKind || spec.source_kind || "").trim();
  if (sourceKind) whereParts.push(`source_kind = ${quoteValue(sourceKind)}`);
  const fileType = String(spec.fileType || spec.file_type || "").trim();
  if (fileType) whereParts.push(`file.type = ${quoteValue(fileType)}`);
  for (const row of conditions) {
    const field = String(row?.field || "").trim();
    if (!field) continue;
    const op = String(row?.op || "eq").toLowerCase();
    const value = row?.value;
    if (op === "contains") {
      whereParts.push(`${field} CONTAINS ${quoteValue(value)}`);
    } else if (op === "lastDays") {
      const days = Number(value);
      if (Number.isFinite(days) && days > 0) whereParts.push(`${field} LAST ${days} DAYS`);
    } else if (op === "gte" || op === "lte" || op === "gt" || op === "lt") {
      const sym = { gte: ">=", lte: "<=", gt: ">", lt: "<" }[op];
      whereParts.push(`${field} ${sym} ${quoteValue(value)}`);
    } else if (op === "ne") {
      whereParts.push(`${field} != ${quoteValue(value)}`);
    } else {
      whereParts.push(`${field} = ${quoteValue(value)}`);
    }
  }
  if (whereParts.length) lines.push(`WHERE ${whereParts.join(" AND ")}`);

  const withText = String(spec.withText || "").trim();
  if (withText) lines.push(`WITH TEXT ${quoteValue(withText)}`);

  if (spec.sort?.field) {
    const dir = spec.sort.dir === "desc" ? "DESC" : "ASC";
    lines.push(`SORT ${spec.sort.field} ${dir}`);
  }

  const limit = Number(spec.limit);
  if (Number.isFinite(limit) && limit > 0) lines.push(`LIMIT ${Math.min(500, Math.max(1, Math.floor(limit)))}`);

  if (Array.isArray(spec.select) && spec.select.length) {
    lines.push(`SELECT ${spec.select.join(", ")}`);
  }

  return lines.join("\n").trim();
}

module.exports = { buildDqlFromBuilder, quoteValue };
