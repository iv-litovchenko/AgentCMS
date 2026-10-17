const fs = require("fs/promises");
const path = require("path");
const { tokenize } = require("../semantic-search/tokenize");
const { buildIdf, embedText, cosineSimilarity } = require("../semantic-search/embedder");
const { indexDir } = require("../../paths/agent-cms");

const INDEX_FILE = "csv-fulltext-index.json";
const MAX_ROW_TEXT = 4000;
const SEMANTIC_CANDIDATES = 120;

function getCsvFulltextIndexPath(agentRoot) {
  const dir = indexDir(agentRoot, "storage");
  return path.join(dir, INDEX_FILE);
}

async function loadCsvFulltextIndex(agentRoot) {
  const file = getCsvFulltextIndexPath(agentRoot);
  try {
    const raw = await fs.readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (error && error.code === "ENOENT") return null;
    throw error;
  }
}

async function saveCsvFulltextIndex(agentRoot, index) {
  const file = getCsvFulltextIndexPath(agentRoot);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(index)}\n`, "utf-8");
}

function fieldText(entry) {
  if (entry == null) return "";
  if (typeof entry === "object" && "value" in entry) return String(entry.value ?? "");
  return String(entry ?? "");
}

function buildCsvRowSearchText(record) {
  const parts = [];
  for (const [key, entry] of Object.entries(record?.fields || {})) {
    if (!key || key === "source_kind" || key === "awn-type") continue;
    const text = fieldText(entry).trim();
    if (!text) continue;
    parts.push(`${key}: ${text}`);
  }
  return parts.join(" · ").slice(0, MAX_ROW_TEXT);
}

function buildTermCounts(text) {
  const counts = new Map();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return counts;
}

function removePathFromIndex(index, rowPath) {
  const terms = index.rowTerms?.[rowPath];
  if (!terms?.length) return;
  for (const term of terms) {
    const bucket = index.postings?.[term];
    if (!bucket) continue;
    delete bucket[rowPath];
    if (!Object.keys(bucket).length) delete index.postings[term];
  }
  delete index.rowTerms[rowPath];
  delete index.rowTexts[rowPath];
  delete index.csvSourceByPath[rowPath];
}

function addRowToIndex(index, rowPath, rowText, termCounts, csvSourcePath) {
  const terms = [];
  for (const [term, count] of termCounts.entries()) {
    if (!term) continue;
    terms.push(term);
    if (!index.postings[term]) index.postings[term] = {};
    index.postings[term][rowPath] = count;
  }
  index.rowTerms[rowPath] = terms;
  index.rowTexts[rowPath] = rowText;
  if (csvSourcePath) index.csvSourceByPath[rowPath] = csvSourcePath;
}

function rebuildCsvFulltextFromRecords(records) {
  const csvRows = (Array.isArray(records) ? records : []).filter((r) =>
    String(r?.path || "").startsWith("csv:")
  );
  const postings = {};
  const rowTerms = {};
  const rowTexts = {};
  const csvSourceByPath = {};
  const documents = [];

  for (const record of csvRows) {
    const rowPath = String(record.path);
    const rowText = buildCsvRowSearchText(record);
    if (!rowText.trim()) continue;
    documents.push(rowText);
    const termCounts = buildTermCounts(rowText);
    addRowToIndex(
      { postings, rowTerms, rowTexts, csvSourceByPath },
      rowPath,
      rowText,
      termCounts,
      record.csvSourcePath || null
    );
  }

  const idf = documents.length ? buildIdf(documents) : {};

  return {
    version: 1,
    model: "csv-row-fulltext-semantic-v1",
    builtAt: new Date().toISOString(),
    rowCount: Object.keys(rowTexts).length,
    termCount: Object.keys(postings).length,
    postings,
    rowTerms,
    rowTexts,
    csvSourceByPath,
    idf
  };
}

async function rebuildCsvFulltextIndex(agentRoot, records) {
  const index = rebuildCsvFulltextFromRecords(records);
  await saveCsvFulltextIndex(agentRoot, index);
  return {
    ok: true,
    rowCount: index.rowCount,
    termCount: index.termCount,
    builtAt: index.builtAt
  };
}

function normalizeScopePrefix(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

function rowMatchesScope(rowPath, csvSourcePath, { pathPrefix, allowedPaths }) {
  const prefix = normalizeScopePrefix(pathPrefix);
  const src = String(csvSourcePath || "").replace(/^\/+/, "");
  const pseudo = String(rowPath || "");

  if (allowedPaths && allowedPaths.size) {
    return allowedPaths.has(pseudo) || allowedPaths.has(src);
  }
  if (!prefix) return true;
  if (src && (src === prefix || src.startsWith(`${prefix}/`))) return true;
  return false;
}

function rankCsvFulltextPaths(index, query, limit, scope) {
  const tokens = tokenize(String(query || "").trim());
  if (!tokens.length) return [];

  const scores = new Map();
  for (const token of tokens) {
    const bucket = index?.postings?.[token];
    if (!bucket) continue;
    for (const [rowPath, count] of Object.entries(bucket)) {
      const csvSource = index.csvSourceByPath?.[rowPath] || "";
      if (!rowMatchesScope(rowPath, csvSource, scope)) continue;
      scores.set(rowPath, (scores.get(rowPath) || 0) + Number(count) || 1);
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
    .slice(0, Math.max(limit, 1))
    .map(([rowPath, score]) => ({ path: rowPath, fulltextScore: score }));
}

function buildSnippet(rowText, query) {
  const needle = String(query || "").trim().toLowerCase();
  const text = String(rowText || "");
  if (!needle) return text.slice(0, 160);
  const lower = text.toLowerCase();
  const idx = lower.indexOf(needle);
  if (idx < 0) return text.slice(0, 160);
  const start = Math.max(0, idx - 40);
  return text.slice(start, start + 160);
}

function searchCsvRowIndex(index, query, options = {}) {
  if (!index?.postings || !index.rowTexts) {
    return { ready: false, hits: [], mode: "csv-row-index" };
  }

  const limit = Math.min(500, Math.max(1, Number(options.limit) || 30));
  const allowedPaths = options.allowedPaths
    ? new Set(
        (Array.isArray(options.allowedPaths) ? options.allowedPaths : []).map((p) => String(p))
      )
    : null;
  const scope = {
    pathPrefix: options.pathPrefix || "",
    allowedPaths: allowedPaths?.size ? allowedPaths : null
  };

  const ranked = rankCsvFulltextPaths(index, query, Math.max(limit, SEMANTIC_CANDIDATES), scope);
  if (!ranked.length) {
    return { ready: true, hits: [], mode: "csv-row-index", rowCount: index.rowCount };
  }

  const idf = index.idf || {};
  const queryVec = embedText(String(query || ""), idf);
  const semanticWeight = 0.55;
  const fulltextWeight = 0.45;

  const merged = ranked.map((row) => {
    const rowText = index.rowTexts[row.path] || "";
    const sem = cosineSimilarity(queryVec, embedText(rowText, idf));
    const ft = row.fulltextScore;
    const score = semanticWeight * sem + fulltextWeight * Math.min(ft / 3, 1);
    return {
      path: row.path,
      score,
      snippet: buildSnippet(rowText, query),
      sources: sem > 0.12 ? ["csv-row-index", "csv-row-semantic"] : ["csv-row-index"],
      matchKind: "csv-row-index"
    };
  });

  merged.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path, "ru"));
  const hits = merged.slice(0, limit);

  return {
    ready: true,
    mode: "csv-row-index",
    builtAt: index.builtAt,
    rowCount: index.rowCount,
    hits
  };
}

async function searchCsvRowIndexForAgent(agentRoot, query, options = {}) {
  const index = await loadCsvFulltextIndex(agentRoot);
  if (!index) return { ready: false, hits: [], mode: "csv-row-index" };
  return searchCsvRowIndex(index, query, options);
}

function patchCsvFulltextForFile(index, recordsForFile, csvRelPath) {
  if (!index?.postings) return rebuildCsvFulltextFromRecords(recordsForFile);
  const normalized = String(csvRelPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  for (const rowPath of Object.keys(index.rowTerms || {})) {
    const src = index.csvSourceByPath?.[rowPath] || "";
    if (src === normalized || rowPath.includes(normalized)) removePathFromIndex(index, rowPath);
  }
  const newRows = (Array.isArray(recordsForFile) ? recordsForFile : []).filter(
    (r) => String(r.path || "").startsWith("csv:") && csvRecordBelongsToPath(r, normalized)
  );
  for (const record of newRows) {
    const rowText = buildCsvRowSearchText(record);
    if (!rowText.trim()) continue;
    addRowToIndex(
      index,
      record.path,
      rowText,
      buildTermCounts(rowText),
      record.csvSourcePath || normalized
    );
  }
  const documents = Object.values(index.rowTexts || {});
  index.idf = documents.length ? buildIdf(documents) : {};
  index.rowCount = Object.keys(index.rowTexts || {}).length;
  index.termCount = Object.keys(index.postings || {}).length;
  index.builtAt = new Date().toISOString();
  return index;
}

function csvRecordBelongsToPath(record, csvRelPath) {
  const src = String(record?.csvSourcePath || "").replace(/\\/g, "/");
  return src === csvRelPath || src.endsWith(`/${csvRelPath}`);
}

module.exports = {
  getCsvFulltextIndexPath,
  loadCsvFulltextIndex,
  saveCsvFulltextIndex,
  rebuildCsvFulltextFromRecords,
  rebuildCsvFulltextIndex,
  patchCsvFulltextForFile,
  searchCsvRowIndex,
  searchCsvRowIndexForAgent,
  buildCsvRowSearchText
};
