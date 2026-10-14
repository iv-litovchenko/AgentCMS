const fs = require("fs");
const path = require("path");
const {
  parseCsvText,
  resolveCsvAbsPath,
  getCsvFileName,
  formatCsvRecordRelPath
} = require("../../awn/awn-data-csv");
const {
  getAwnDataPayload,
  resolveAwnDataStoreContext,
  loadMergedStoreSchema,
  normalizeRecordStorage,
  listCsvRecordFiles,
  formatStoreRecordRelPath
} = require("../../awn/awn-data-loader");

const SOURCE_KIND_MD = "md";
const SOURCE_KIND_CSV_ROW = "csv-row";

function fieldEntry(value) {
  return { value: value == null ? "" : String(value) };
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

function buildCsvRowRecords(csvRelPath, columns, rows, meta = {}) {
  const records = [];
  const normalizedCsvRel = String(csvRelPath || "").replace(/\\/g, "/");
  for (let i = 0; i < rows.length; i += 1) {
    const obj = rowObjectFromCells(columns, rows[i]);
    const fields = {};
    for (const [key, val] of Object.entries(obj)) {
      if (!key) continue;
      fields[key] = fieldEntry(val);
    }
    fields["awn-type"] = fieldEntry("awn.content.record-csv");
    fields.source_kind = fieldEntry(SOURCE_KIND_CSV_ROW);
    fields["file.type"] = fieldEntry("csv");
    const rowNum = i + 2;
    records.push({
      path: `csv:${normalizedCsvRel}#row:${rowNum}`,
      sourceKind: SOURCE_KIND_CSV_ROW,
      csvSourcePath: normalizedCsvRel,
      schemaContext: meta.schemaContext || null,
      schemaTarget: meta.schemaTarget || null,
      manifestRel: meta.manifestRel || null,
      fileMtimeMs: meta.fileMtimeMs ?? null,
      fileSize: meta.fileSize ?? null,
      fields
    });
  }
  return records;
}

function readCsvFileRecords(agentRoot, csvRelPath, meta = {}) {
  const rel = String(csvRelPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const abs = path.join(String(agentRoot || "").trim(), rel);
  if (!fs.existsSync(abs)) return [];
  const stat = fs.statSync(abs);
  const { columns, rows } = parseCsvText(fs.readFileSync(abs, "utf-8"));
  if (!columns.length) return [];
  return buildCsvRowRecords(rel, columns, rows, {
    ...meta,
    fileMtimeMs: stat.mtimeMs,
    fileSize: stat.size
  });
}

function collectCsvIndexRecords(agentRoot, projectRoot = process.cwd()) {
  const records = [];
  let payload;
  try {
    payload = getAwnDataPayload(agentRoot, projectRoot);
  } catch {
    return records;
  }
  const stores = Array.isArray(payload?.stores) ? payload.stores : [];
  for (const store of stores) {
    const storage = normalizeRecordStorage(store?.recordStorage || store?.kind);
    if (storage !== "csv" && storage !== "csv-files") continue;
    try {
      const ctx = resolveAwnDataStoreContext(agentRoot, projectRoot, store.relPath);
      const schema = loadMergedStoreSchema(ctx.storeAbs, ctx.dataRoot);
      const manifestRel = `${ctx.storeRel}/manifest.md`;

      if (storage === "csv-files") {
        const recordFiles = listCsvRecordFiles(ctx.storeAbs);
        for (const fileEntry of recordFiles) {
          const csvRelPath = formatStoreRecordRelPath(ctx.storeRel, fileEntry.relPath, ctx.storeAbs);
          if (!fs.existsSync(fileEntry.absPath)) continue;
          const stat = fs.statSync(fileEntry.absPath);
          const { columns, rows } = parseCsvText(fs.readFileSync(fileEntry.absPath, "utf-8"));
          if (!columns.length) continue;
          records.push(
            ...buildCsvRowRecords(csvRelPath, columns, rows, {
              manifestRel,
              fileMtimeMs: stat.mtimeMs,
              fileSize: stat.size
            })
          );
        }
        continue;
      }

      const csvPath = resolveCsvAbsPath(ctx.storeAbs, schema);
      const csvFile = getCsvFileName(schema);
      const csvRelPath = formatCsvRecordRelPath(ctx.storeRel, csvFile, ctx.storeAbs);
      if (!fs.existsSync(csvPath)) continue;
      const stat = fs.statSync(csvPath);
      const { columns, rows } = parseCsvText(fs.readFileSync(csvPath, "utf-8"));
      if (!columns.length) continue;
      records.push(
        ...buildCsvRowRecords(csvRelPath, columns, rows, {
          manifestRel,
          fileMtimeMs: stat.mtimeMs,
          fileSize: stat.size
        })
      );
    } catch {
      // skip broken store
    }
  }
  return records;
}

function csvRecordBelongsToFile(record, csvRelPath) {
  const rel = String(csvRelPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  if (record?.csvSourcePath === rel) return true;
  const p = String(record?.path || "");
  return p.startsWith(`csv:${rel}#row:`);
}

function reindexCsvFileInRecords(records, agentRoot, csvRelPath, projectRoot = process.cwd()) {
  const rel = String(csvRelPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const kept = (Array.isArray(records) ? records : []).filter((r) => !csvRecordBelongsToFile(r, rel));
  let meta = {};
  try {
    if (rel.startsWith("awn-databases/")) {
      const storeRel = path.posix.dirname(rel);
      const ctx = resolveAwnDataStoreContext(agentRoot, projectRoot, storeRel);
      meta = { manifestRel: `${ctx.storeRel}/manifest.md` };
    }
  } catch {
    meta = {};
  }
  const fresh = readCsvFileRecords(agentRoot, rel, meta);
  return [...kept, ...fresh];
}

function stampMdSourceKind(record) {
  if (!record || record.sourceKind) return record;
  const fields = { ...(record.fields || {}) };
  if (!fields.source_kind) fields.source_kind = fieldEntry(SOURCE_KIND_MD);
  if (!fields["file.type"]) fields["file.type"] = fieldEntry("md");
  return { ...record, sourceKind: SOURCE_KIND_MD, fields };
}

module.exports = {
  SOURCE_KIND_MD,
  SOURCE_KIND_CSV_ROW,
  buildCsvRowRecords,
  readCsvFileRecords,
  collectCsvIndexRecords,
  csvRecordBelongsToFile,
  reindexCsvFileInRecords,
  stampMdSourceKind
};
