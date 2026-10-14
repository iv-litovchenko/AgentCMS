function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function flattenRow(row) {
  if (row.groupKey != null) {
    return {
      path: row.samplePath || "",
      groupKey: row.groupKey,
      value: row.value,
      count: row.count
    };
  }
  const out = { path: row.path || "" };
  if (row.fields && typeof row.fields === "object") {
    for (const [key, entry] of Object.entries(row.fields)) {
      const val = entry != null && typeof entry === "object" && "value" in entry ? entry.value : entry;
      out[key] = val;
    }
  }
  return out;
}

function serializeDqlResultsCsv(results = [], { mode = "rows" } = {}) {
  const rows = Array.isArray(results) ? results.map(flattenRow) : [];
  if (!rows.length) return "path\n";

  const columns = [];
  const seen = new Set();
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  if (mode === "group" && !columns.includes("count")) {
    columns.push("count");
  }

  const lines = [columns.map(escapeCsvCell).join(",")];
  for (const row of rows) {
    lines.push(columns.map((col) => escapeCsvCell(row[col])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function serializeDqlResultsJson(results = []) {
  return JSON.stringify(Array.isArray(results) ? results.map(flattenRow) : [], null, 2);
}

module.exports = { serializeDqlResultsCsv, serializeDqlResultsJson, flattenRow };
