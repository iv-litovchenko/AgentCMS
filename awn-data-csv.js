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
  const entries = Object.entries(fields).filter(([key]) => !RESERVED_FIELD_KEYS.has(key));
  if (!entries.length) {
    return ["awn-code", "awn-name", "awn-sort"];
  }
  entries.sort((a, b) => {
    const sortA = Number(a[1]?.sort);
    const sortB = Number(b[1]?.sort);
    const safeA = Number.isFinite(sortA) ? sortA : 999;
    const safeB = Number.isFinite(sortB) ? sortB : 999;
    if (safeA !== safeB) return safeA - safeB;
    return String(a[0]).localeCompare(String(b[0]), "ru");
  });
  return entries.map(([key]) => key);
}

function rowObjectFromCells(columns, cells) {
  const obj = {};
  for (let i = 0; i < columns.length; i += 1) {
    const key = String(columns[i] || "").trim();
    if (!key) continue;
    obj[key] = String(cells[i] ?? "").trim();
  }
  return obj;
}

function buildCsvRowObject(recordData, schemaColumns, schema) {
  const idMode = String(schema?.record?.["id-mode"] || schema?.record?.idMode || "slug").trim();
  const row = {};
  const code = String(
    recordData["awn-id"] || recordData["awn-code"] || recordData.code || recordData.id || ""
  ).trim();
  const label = String(
    recordData["awn-name"] ||
      recordData["awn-label"] ||
      recordData.label ||
      recordData["awn-title"] ||
      recordData.title ||
      recordData.name ||
      code
  ).trim();

  for (const col of schemaColumns) {
    if (col === "awn-id" || col === "awn-code" || col === "code") {
      row[col] = code;
      continue;
    }
    if (col === "awn-parent" || col === "awn-pid") {
      row[col] = String(
        recordData["awn-parent"] || recordData["awn-pid"] || recordData.parent || ""
      ).trim();
      continue;
    }
    if (recordData[col] !== undefined) {
      row[col] = String(recordData[col] ?? "").trim();
      continue;
    }
    if (col === "awn-name" || col === "awn-label" || col === "label") {
      row[col] = label;
      continue;
    }
    row[col] = "";
  }

  if (!row["awn-id"] && code) row["awn-id"] = code;
  if (!row["awn-code"] && !row.code && code) row["awn-code"] = code;
  if (idMode === "slug" && !row["awn-code"] && label) row["awn-code"] = label;
  return row;
}

function normalizeCsvRowToSchemaColumns(rowObj, schemaColumns, schema, fileColumns) {
  const idMode = String(schema?.record?.["id-mode"] || schema?.record?.idMode || "slug").trim();
  const id = resolveCsvId(rowObj, fileColumns, idMode);
  if (!id) return null;

  const normalized = {};
  for (const col of schemaColumns) {
    normalized[col] = String(rowObj[col] ?? "").trim();
  }

  if (!normalized["awn-id"]) normalized["awn-id"] = id;
  if (!normalized["awn-code"] && !normalized.code) normalized["awn-code"] = id;
  if (!normalized["awn-name"] && !normalized["awn-label"] && !normalized.label) {
    normalized["awn-name"] = String(
      rowObj["awn-name"] || rowObj["awn-label"] || rowObj.label || rowObj["awn-title"] || rowObj.title || id
    ).trim();
  }
  if (schemaColumns.includes("awn-label") && !normalized["awn-label"]) {
    normalized["awn-label"] = normalized["awn-name"] || id;
  }
  return normalized;
}

function resolveCsvId(rowObj, columns, idMode) {
  const code = String(
    rowObj["awn-id"] || rowObj["awn-code"] || rowObj.code || rowObj.id || rowObj.tag || ""
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
      let id = String(frontmatter["awn-id"] || "").trim();
      if (!id) id = resolveCsvId(frontmatter, normalizedCols, idMode);
      if (!id) return null;
      frontmatter["awn-id"] = id;
      frontmatter["awn-code"] = frontmatter["awn-code"] || frontmatter.code || id;
      frontmatter.code = frontmatter.code || id;
      const parent =
        String(frontmatter["awn-parent"] || frontmatter["awn-pid"] || "").trim() || null;
      const title = String(
        frontmatter["awn-name"] ||
          frontmatter["awn-label"] ||
          frontmatter.label ||
          frontmatter["awn-title"] ||
          frontmatter.title ||
          frontmatter.name ||
          id
      ).trim();
      return {
        id,
        parent,
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
  const csvPath = resolveCsvAbsPath(storeAbs, schema);
  const schemaColumns = getCsvColumnsFromSchema(schema);

  let delimiter = DEFAULT_CSV_DELIMITER;
  const objects = [];
  if (fs.existsSync(csvPath)) {
    const existing = parseCsvText(fs.readFileSync(csvPath, "utf-8"));
    delimiter = existing.delimiter || DEFAULT_CSV_DELIMITER;
    const fileColumns = (existing.columns || []).map((col) => String(col).trim()).filter(Boolean);
    for (const cells of existing.rows || []) {
      const raw = rowObjectFromCells(fileColumns, cells);
      const normalized = normalizeCsvRowToSchemaColumns(raw, schemaColumns, schema, fileColumns);
      if (normalized) objects.push(normalized);
    }
  }

  const newRow = buildCsvRowObject(recordData, schemaColumns, schema);
  const rowRecordId = (row) =>
    String(row["awn-id"] || row["awn-code"] || row.code || "").trim();
  const newCode = rowRecordId(newRow);
  if (newCode && !objects.some((row) => rowRecordId(row) === newCode)) {
    objects.push(newRow);
  }

  const rows = objects.map((obj) => schemaColumns.map((col) => String(obj[col] ?? "").trim()));
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  fs.writeFileSync(csvPath, serializeCsv(schemaColumns, rows, delimiter), "utf-8");
  return newRow;
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
