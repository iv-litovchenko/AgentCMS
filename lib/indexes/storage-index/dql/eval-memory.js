const { getFieldValue: resolveFieldValue } = require("./field-resolver");
const { pathMatchesLinkFilter } = require("./link-stats");

function compareValues(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return String(a || "").localeCompare(String(b || ""), "ru");
}

function createMemoryEvaluator(agentRoot, linkStatsMap) {
  function getFieldValue(record, field) {
    const stats = linkStatsMap?.get(record.path) || null;
    return resolveFieldValue(record, field, stats);
  }

  function evalCompare(record, node) {
    if (node.type === "relative-days") {
      const days = Number(node.days);
      if (!Number.isFinite(days) || days <= 0) return false;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      return evalCompare(record, { type: "compare", field: node.field, op: "gte", value: since });
    }

    if (node.field === "file.inlinks" || node.field === "file.outlinks") {
      return pathMatchesLinkFilter(agentRoot, record.path, node.field, node.op, node.value);
    }

    const value = getFieldValue(record, node.field);
    const empty = value == null || value === "";
    const target = node.value;

    switch (node.op) {
      case "eq":
        if (target == null) return empty;
        return String(value) === String(target);
      case "ne":
        if (target == null) return !empty;
        return String(value) !== String(target);
      case "contains":
        if (empty) return false;
        return String(value).toLowerCase().includes(String(target).toLowerCase());
      case "gte":
        return !empty && compareValues(value, target) >= 0;
      case "lte":
        return !empty && compareValues(value, target) <= 0;
      case "gt":
        return !empty && compareValues(value, target) > 0;
      case "lt":
        return !empty && compareValues(value, target) < 0;
      default:
        return false;
    }
  }

  function evalExpr(record, node) {
    if (!node) return true;
    switch (node.type) {
      case "compare":
      case "relative-days":
        return evalCompare(record, node);
      case "and":
        return evalExpr(record, node.left) && evalExpr(record, node.right);
      case "or":
        return evalExpr(record, node.left) || evalExpr(record, node.right);
      case "not":
        return !evalExpr(record, node.expr);
      case "group":
        return evalExpr(record, node.expr);
      default:
        return false;
    }
  }

  function filterRecords(records, plan, options = {}) {
    const prefix = plan.from || "";
    const checkEvery = Number(options.checkEvery) || 500;
    const deadline = options.deadline;
    const out = [];
    for (let i = 0; i < records.length; i += 1) {
      if (deadline && i > 0 && i % checkEvery === 0) deadline.check();
      const record = records[i];
      if (prefix && !String(record.path || "").startsWith(prefix)) continue;
      if (plan.where && !evalExpr(record, plan.where)) continue;
      out.push(record);
    }
    return out;
  }

  function sortRecords(rows, sort) {
    const sorts = Array.isArray(sort) ? sort : sort?.field ? [sort] : [];
    if (!sorts.length) return rows;
    return rows.slice().sort((a, b) => {
      for (const item of sorts) {
        const dir = item.dir === "desc" ? -1 : 1;
        const cmp = compareValues(getFieldValue(a, item.field), getFieldValue(b, item.field));
        if (cmp !== 0) return dir * cmp;
      }
      return 0;
    });
  }

  function projectRecord(record, select) {
    if (!select?.length) return record;
    const fields = {};
    for (const key of select) {
      if (key === "path") continue;
      const value = getFieldValue(record, key);
      if (value == null) continue;
      const entry = record.fields?.[key];
      fields[key] =
        entry != null && typeof entry === "object" && "value" in entry ? { ...entry, value } : value;
    }
    return { path: record.path, schemaContext: record.schemaContext || null, fields };
  }

  return { filterRecords, sortRecords, projectRecord, evalExpr, getFieldValue };
}

module.exports = {
  createMemoryEvaluator,
  compareValues
};
