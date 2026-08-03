const fs = require("fs");
const path = require("path");

const DEFAULT_CSV_FILE = "main.csv";

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCsvText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (!lines.length) return { columns: [], rows: [] };
  const parsed = lines.map(parseCsvLine);
  return { columns: parsed[0] || [], rows: parsed.slice(1) };
}

function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function serializeCsv(columns, rows) {
  const header = columns.map(escapeCsvCell).join(",");
  const body = rows.map((cells) => cells.map(escapeCsvCell).join(",")).join("\n");
  return body ? `${header}\n${body}\n` : `${header}\n`;
}

function getRecordStorage(schema) {
  const storage = String(schema?.record?.storage || "md").trim().toLowerCase();
  return storage === "csv" ? "csv" : "md";
}

function getCsvFileName(schema) {
  return String(schema?.record?.file || DEFAULT_CSV_FILE).trim() || DEFAULT_CSV_FILE;
}

const RESERVED_FIELD_KEYS = new Set([
  "id",
  "created",
  "updated",
  "awn-id",
  "awn-created",
  "awn-updated"
]);

function getCsvColumnsFromSchema(schema) {
  const fields = schema?.fields || {};
  const columns = [];
  for (const key of Object.keys(fields)) {
    if (RESERVED_FIELD_KEYS.has(key)) continue;
    columns.push(key);
  }
  if (!columns.length) return ["awn-code", "awn-label"];
  return columns;
}

function resolveCsvId(rowObj, columns, idMode) {
  const code = String(
    rowObj["awn-code"] || rowObj.code || rowObj["awn-id"] || rowObj.id || rowObj.tag || ""
  ).trim();
  if (code) return code;
  const firstCol = columns[0];
  if (firstCol && rowObj[firstCol]) return String(rowObj[firstCol]).trim();
  if (idMode === "numeric") return String(rowObj[columns[0]] || "").trim();
  return "";
}

function loadCsvRecords(storeAbs, storeRel, schema) {
  const csvFile = getCsvFileName(schema);
  const csvPath = path.join(storeAbs, csvFile);
  if (!fs.existsSync(csvPath)) return [];

  const { columns, rows } = parseCsvText(fs.readFileSync(csvPath, "utf-8"));
  if (!columns.length) return [];

  const normalizedCols = columns.map((c) => String(c).trim());
  const idMode = String(schema?.record?.["id-mode"] || schema?.record?.idMode || "slug").trim();
  const relPath = `${storeRel}/${csvFile}`.replace(/\\/g, "/");

  return rows
    .map((cells, rowIndex) => {
      const frontmatter = {};
      for (let i = 0; i < normalizedCols.length; i += 1) {
        frontmatter[normalizedCols[i]] = String(cells[i] ?? "").trim();
      }
      const id = resolveCsvId(frontmatter, normalizedCols, idMode);
      if (!id) return null;
      frontmatter["awn-code"] = frontmatter["awn-code"] || frontmatter.code || id;
      frontmatter.code = frontmatter.code || id;
      const title = String(
        frontmatter["awn-label"] ||
          frontmatter.label ||
          frontmatter["awn-title"] ||
          frontmatter.title ||
          frontmatter.name ||
          id
      ).trim();
      return {
        id,
        parent: null,
        relPath,
        fileName: csvFile,
        rowIndex: rowIndex + 1,
        frontmatter,
        body: "",
        title
      };
    })
    .filter(Boolean);
}

function appendCsvRecord(storeAbs, schema, recordData) {
  const csvFile = getCsvFileName(schema);
  const csvPath = path.join(storeAbs, csvFile);
  const columns = getCsvColumnsFromSchema(schema);

  let existing = { columns: [], rows: [] };
  if (fs.existsSync(csvPath)) {
    existing = parseCsvText(fs.readFileSync(csvPath, "utf-8"));
  }

  const header =
    existing.columns.length > 0
      ? existing.columns.map(String)
      : columns;

  const row = header.map((col) => {
    const key = String(col).trim();
    if (key === "awn-code" || key === "code") {
      return String(recordData["awn-code"] || recordData.code || recordData["awn-id"] || recordData.id || "").trim();
    }
    if (recordData[key] !== undefined) return String(recordData[key] ?? "").trim();
    if (key === "awn-label" || key === "label") {
      return String(
        recordData["awn-label"] || recordData.label || recordData["awn-title"] || recordData.title || recordData.id || ""
      ).trim();
    }
    return "";
  });

  const rows = [...(existing.rows || []), row];
  fs.writeFileSync(csvPath, serializeCsv(header, rows), "utf-8");
  return row;
}

function writeCsvFromRecords(storeAbs, schema, records) {
  const csvFile = getCsvFileName(schema);
  const csvPath = path.join(storeAbs, csvFile);
  const columns = getCsvColumnsFromSchema(schema);
  const rows = records.map((record) => {
    const fm = record.frontmatter || record;
    return columns.map((col) => String(fm[col] ?? "").trim());
  });
  fs.writeFileSync(csvPath, serializeCsv(columns, rows), "utf-8");
}

module.exports = {
  DEFAULT_CSV_FILE,
  parseCsvText,
  serializeCsv,
  getRecordStorage,
  getCsvFileName,
  getCsvColumnsFromSchema,
  loadCsvRecords,
  appendCsvRecord,
  writeCsvFromRecords
};
