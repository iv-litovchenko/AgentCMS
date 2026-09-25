const fs = require("fs");
const path = require("path");

const DEFAULT_CSV_FILE = "main.csv";
const DEFAULT_CSV_DELIMITER = ",";
const STORE_STORAGE_ROOT = "awn-storage";
const STORE_DATA_DIR = "data";

function resolveCsvAbsPath(storeAbs, schema) {
  const csvFile = getCsvFileName(schema);
  const flat = path.join(storeAbs, csvFile);
  if (fs.existsSync(flat)) return flat;
  const nested = path.join(storeAbs, STORE_STORAGE_ROOT, STORE_DATA_DIR, csvFile);
  if (fs.existsSync(nested)) return nested;
  return flat;
}

function formatCsvRecordRelPath(storeRel, csvFile, storeAbs) {
  const flat = path.join(storeAbs, csvFile);
  if (fs.existsSync(flat)) {
    return `${storeRel}/${csvFile}`.replace(/\\/g, "/");
  }
  const nested = path.join(storeAbs, STORE_STORAGE_ROOT, STORE_DATA_DIR, csvFile);
  if (fs.existsSync(nested)) {
    return `${storeRel}/${STORE_STORAGE_ROOT}/${STORE_DATA_DIR}/${csvFile}`.replace(/\\/g, "/");
  }
  return `${storeRel}/${csvFile}`.replace(/\\/g, "/");
}

function countDelimitersOutsideQuotes(line, delimiter) {
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      count += 1;
    }
  }
  return count;
}

function detectCsvDelimiter(firstLine) {
  const line = String(firstLine || "");
  if (!line) return DEFAULT_CSV_DELIMITER;

  const candidates = [
    [",", countDelimitersOutsideQuotes(line, ",")],
    [";", countDelimitersOutsideQuotes(line, ";")],
    ["\t", countDelimitersOutsideQuotes(line, "\t")]
  ];

  let best = DEFAULT_CSV_DELIMITER;
  let bestCount = 0;
  for (const [delimiter, count] of candidates) {
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

function parseCsvLine(line, delimiter = DEFAULT_CSV_DELIMITER) {
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
    } else if (ch === delimiter) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseCsvText(text, options = {}) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (!lines.length) {
    return { columns: [], rows: [], delimiter: options.delimiter || DEFAULT_CSV_DELIMITER };
  }

  const delimiter = options.delimiter || detectCsvDelimiter(lines[0]);
  const parsed = lines.map((line) => parseCsvLine(line, delimiter));
  return { columns: parsed[0] || [], rows: parsed.slice(1), delimiter };
}

function escapeCsvCell(value, delimiter = DEFAULT_CSV_DELIMITER) {
  const text = String(value ?? "");
  const needsQuotes = text.includes('"') || text.includes("\n") || text.includes("\r") || text.includes(delimiter);
  if (needsQuotes) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function serializeCsv(columns, rows, delimiter = DEFAULT_CSV_DELIMITER) {
  const header = columns.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter);
  const body = rows.map((cells) => cells.map((cell) => escapeCsvCell(cell, delimiter)).join(delimiter)).join("\n");
  return body ? `${header}\n${body}\n` : `${header}\n`;
}

function getRecordStorage(schema) {
  const storage = String(schema?.record?.storage || "md").trim().toLowerCase();
  if (storage === "csv") return "csv";
  if (storage === "csv-files" || storage === "csv_files") return "csv-files";
  return "md";
}

function getCsvFileName(schema) {
  return String(schema?.record?.file || DEFAULT_CSV_FILE).trim() || DEFAULT_CSV_FILE;
}

const RESERVED_FIELD_KEYS = new Set([
  "id",
  "created",
  "updated",
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
  if (!columns.length) {
    return ["awn-id", "awn-pid", "awn-type", "awn-name", "awn-description", "awn-code", "awn-sort"];
  }
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
  const csvPath = resolveCsvAbsPath(storeAbs, schema);
  if (!fs.existsSync(csvPath)) return [];

  const { columns, rows } = parseCsvText(fs.readFileSync(csvPath, "utf-8"));
  if (!columns.length) return [];

  const normalizedCols = columns.map((c) => String(c).trim());
  const idMode = String(schema?.record?.["id-mode"] || schema?.record?.idMode || "slug").trim();
  const relPath = formatCsvRecordRelPath(storeRel, csvFile, storeAbs);

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
  const csvPath = resolveCsvAbsPath(storeAbs, schema);
  const columns = getCsvColumnsFromSchema(schema);

  let existing = { columns: [], rows: [], delimiter: DEFAULT_CSV_DELIMITER };
  if (fs.existsSync(csvPath)) {
    existing = parseCsvText(fs.readFileSync(csvPath, "utf-8"));
  }

  const delimiter = existing.delimiter || DEFAULT_CSV_DELIMITER;
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
  fs.writeFileSync(csvPath, serializeCsv(header, rows, delimiter), "utf-8");
  return row;
}

function writeCsvFromRecords(storeAbs, schema, records) {
  const csvFile = getCsvFileName(schema);
  const csvPath = resolveCsvAbsPath(storeAbs, schema);
  const columns = getCsvColumnsFromSchema(schema);
  const rows = records.map((record) => {
    const fm = record.frontmatter || record;
    return columns.map((col) => String(fm[col] ?? "").trim());
  });

  let delimiter = DEFAULT_CSV_DELIMITER;
  if (fs.existsSync(csvPath)) {
    delimiter = parseCsvText(fs.readFileSync(csvPath, "utf-8")).delimiter || DEFAULT_CSV_DELIMITER;
  }
  fs.writeFileSync(csvPath, serializeCsv(columns, rows, delimiter), "utf-8");
}

module.exports = {
  DEFAULT_CSV_FILE,
  DEFAULT_CSV_DELIMITER,
  STORE_STORAGE_ROOT,
  STORE_DATA_DIR,
  resolveCsvAbsPath,
  formatCsvRecordRelPath,
  detectCsvDelimiter,
  parseCsvText,
  serializeCsv,
  getRecordStorage,
  getCsvFileName,
  getCsvColumnsFromSchema,
  loadCsvRecords,
  appendCsvRecord,
  writeCsvFromRecords
};
