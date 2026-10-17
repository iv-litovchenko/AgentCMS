const fs = require("fs");
const path = require("path");
const {
  parseCsvText,
  resolveCsvAbsPath,
  getCsvFileName,
  formatCsvRecordRelPath
} = require("../../../awn/awn-data-csv");
const { resolveAwnDataStoreContext, loadMergedStoreSchema } = require("../../../awn/awn-data-loader");
const { buildCsvRowRecords, readCsvFileRecords } = require("../csv-index");

function splitFromPlan(plan) {
  const raw = String(plan?.from || "").trim();
  const m = raw.match(/^(csv|collection):(.+)$/i);
  if (!m) {
    return {
      sourceKind: "md",
      fromPrefix: raw.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "")
    };
  }
  return {
    sourceKind: m[1].toLowerCase(),
    fromPrefix: m[2].replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "")
  };
}

function isCsvSourceKind(sourceKind) {
  return sourceKind === "csv" || sourceKind === "collection";
}

function normalizeStoreRel(fromPrefix) {
  let rel = String(fromPrefix || "").trim().replace(/\\/g, "/");
  if (!rel.startsWith("awn-databases/")) {
    rel = `awn-databases/${rel.replace(/^\/+/, "")}`;
  }
  return rel;
}

function loadCsvFromStore(agentRoot, fromPrefix) {
  const storeRel = normalizeStoreRel(fromPrefix);
  const ctx = resolveAwnDataStoreContext(agentRoot, process.cwd(), storeRel);
  const schema = loadMergedStoreSchema(ctx.storeAbs, ctx.dataRoot);
  const csvPath = resolveCsvAbsPath(ctx.storeAbs, schema);
  const csvFile = getCsvFileName(schema);
  const csvRelPath = formatCsvRecordRelPath(ctx.storeRel, csvFile, ctx.storeAbs);
  if (!fs.existsSync(csvPath)) return [];
  const { columns, rows } = parseCsvText(fs.readFileSync(csvPath, "utf-8"));
  if (!columns.length) return [];
  return buildCsvRowRecords(csvRelPath, columns, rows);
}

function loadCsvFromFile(agentRoot, fromPrefix) {
  let rel = String(fromPrefix || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
  if (!rel.toLowerCase().endsWith(".csv")) {
    rel = `${rel.replace(/\/+$/, "")}/main.csv`;
  }
  const rows = readCsvFileRecords(agentRoot, rel);
  if (!rows.length && !fs.existsSync(path.join(String(agentRoot || "").trim(), rel))) {
    throw new Error(`CSV not found: ${rel}`);
  }
  return rows;
}

function resolveIndexedFromPlan(plan) {
  const { sourceKind, fromPrefix } = splitFromPlan(plan);
  if (sourceKind === "collection") {
    return normalizeStoreRel(fromPrefix);
  }
  if (sourceKind === "csv") {
    let rel = String(fromPrefix || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
    if (!rel.toLowerCase().endsWith(".csv")) {
      rel = `${rel.replace(/\/+$/, "")}/main.csv`;
    }
    return `csv:${rel}`;
  }
  return fromPrefix;
}

function indexHasFromPrefix(records, prefix) {
  if (!prefix || !Array.isArray(records)) return false;
  const { pathMatchesFromPrefix } = require("./path-prefix");
  return records.some((r) => pathMatchesFromPrefix(r.path, prefix));
}

function loadCsvDqlRecords(agentRoot, fromPrefix, { sourceKind = "csv" } = {}) {
  if (sourceKind === "collection") {
    return loadCsvFromStore(agentRoot, fromPrefix);
  }
  const rel = String(fromPrefix || "").trim();
  if (rel.includes("/") && !rel.toLowerCase().endsWith(".csv") && !rel.includes(".")) {
    try {
      return loadCsvFromStore(agentRoot, rel);
    } catch {
      // fall through to file path
    }
  }
  return loadCsvFromFile(agentRoot, rel);
}

module.exports = {
  splitFromPlan,
  isCsvSourceKind,
  loadCsvDqlRecords,
  normalizeStoreRel,
  resolveIndexedFromPlan,
  indexHasFromPrefix
};
