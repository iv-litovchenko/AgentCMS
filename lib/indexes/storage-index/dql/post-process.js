const { getFieldValue, getFieldValuesForFlatten } = require("./field-resolver");
const { projectRecord } = require("./eval-memory");

function flattenRecords(records, field, linkStatsMap) {
  if (!field) return records;
  const out = [];
  for (const record of records) {
    const stats = linkStatsMap?.get(record.path) || null;
    const items = getFieldValuesForFlatten(record, field);
    if (!items.length) {
      out.push({ ...record, _flattenKey: "", _flattenValue: "" });
      continue;
    }
    for (const item of items) {
      out.push({
        ...record,
        _flattenField: field,
        _flattenValue: item,
        fields: {
          ...(record.fields || {}),
          [field]: { value: item }
        }
      });
    }
  }
  return out;
}

function groupRecords(records, plan, linkStatsMap) {
  const groupField = plan.groupBy;
  if (!groupField) return null;

  const buckets = new Map();
  for (const record of records) {
    const stats = linkStatsMap?.get(record.path) || null;
    const key = String(getFieldValue(record, groupField, stats) ?? "");
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(record);
  }

  const agg = String(plan.aggregate?.fn || "count").toLowerCase();
  const aggField = plan.aggregate?.field || null;
  const rows = [];

  for (const [key, items] of buckets.entries()) {
    let value = items.length;
    if (agg === "sum" && aggField) {
      value = items.reduce((sum, record) => {
        const stats = linkStatsMap?.get(record.path) || null;
        const n = Number(getFieldValue(record, aggField, stats));
        return sum + (Number.isFinite(n) ? n : 0);
      }, 0);
    } else if (agg === "min" && aggField) {
      value = items.reduce((min, record) => {
        const stats = linkStatsMap?.get(record.path) || null;
        const n = Number(getFieldValue(record, aggField, stats));
        if (!Number.isFinite(n)) return min;
        return min == null ? n : Math.min(min, n);
      }, null);
    } else if (agg === "max" && aggField) {
      value = items.reduce((max, record) => {
        const stats = linkStatsMap?.get(record.path) || null;
        const n = Number(getFieldValue(record, aggField, stats));
        if (!Number.isFinite(n)) return max;
        return max == null ? n : Math.max(max, n);
      }, null);
    }

    rows.push({
      path: null,
      groupKey: key,
      groupField,
      aggregate: agg,
      value,
      count: items.length,
      samplePath: items[0]?.path || null
    });
  }

  rows.sort((a, b) => String(a.groupKey).localeCompare(String(b.groupKey), "ru"));
  const limit = plan.limit ?? 50;
  return { rows: rows.slice(0, limit), total: rows.length, mode: "group" };
}

function applyRelativeDays(plan) {
  if (!Array.isArray(plan.relativeDaysFilters) || !plan.relativeDaysFilters.length) return plan;
  const filters = plan.relativeDaysFilters;
  let where = plan.where;
  for (const item of filters) {
    const days = Number(item.days);
    const field = item.field;
    if (!Number.isFinite(days) || days <= 0 || !field) continue;
    const since = new Date(Date.now() - days * 86400000).toISOString();
    const node = { type: "compare", field, op: "gte", value: since };
    where = where ? { type: "and", left: where, right: node } : node;
  }
  return { ...plan, where, relativeDaysFilters: undefined };
}

module.exports = {
  flattenRecords,
  groupRecords,
  applyRelativeDays,
  projectRecord
};
