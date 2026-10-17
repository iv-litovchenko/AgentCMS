const { searchCsvRowIndexForAgent } = require("../csv-fulltext-index");

function fieldText(entry) {
  if (entry == null) return "";
  if (typeof entry === "object" && "value" in entry) return String(entry.value ?? "");
  return String(entry ?? "");
}

function buildCsvHybridHits(results, query, limit = 30) {
  const needle = String(query || "").trim().toLowerCase();
  if (!needle) return [];
  const max = Math.min(500, Math.max(1, Number(limit) || 30));
  const hits = [];

  for (const row of Array.isArray(results) ? results : []) {
    const path = String(row?.path || "");
    if (!path.startsWith("csv:")) continue;
    let snippet = "";
    for (const [key, entry] of Object.entries(row.fields || {})) {
      const text = fieldText(entry);
      if (!text.toLowerCase().includes(needle)) continue;
      snippet = `${key}: ${text.slice(0, 160)}`;
      break;
    }
    if (!snippet) continue;
    hits.push({
      path,
      snippet,
      sources: ["csv-cell"],
      matchKind: "csv-cell"
    });
    if (hits.length >= max) break;
  }

  return hits;
}

async function buildCsvHybridHitsIndexed(agentRoot, query, options = {}) {
  const indexed = await searchCsvRowIndexForAgent(agentRoot, query, options);
  if (!indexed.ready || !indexed.hits?.length) return [];
  return indexed.hits.map((hit) => ({
    path: hit.path,
    snippet: hit.snippet,
    score: hit.score,
    sources: hit.sources || ["csv-row-index"],
    matchKind: hit.matchKind || "csv-row-index"
  }));
}

async function resolveCsvHybridHits(agentRoot, results, query, limit, scope = {}) {
  const opts = {
    limit,
    pathPrefix: scope.pathPrefix || "",
    allowedPaths: scope.allowedPaths || null
  };
  const indexed = await buildCsvHybridHitsIndexed(agentRoot, query, opts);
  if (indexed.length) return indexed;
  return buildCsvHybridHits(results, query, limit);
}

function mergeDqlHybridResults(hybrid, csvHits, filterTotal) {
  const baseHits = Array.isArray(hybrid?.hits) ? hybrid.hits : [];
  const seen = new Set(baseHits.map((h) => h.path));
  const merged = baseHits.slice();
  for (const hit of csvHits) {
    if (seen.has(hit.path)) continue;
    seen.add(hit.path);
    merged.push(hit);
  }
  return {
    hits: merged,
    hitCount: merged.length,
    filterTotal: filterTotal ?? merged.length,
    sources: [...new Set(merged.flatMap((h) => h.sources || []))]
  };
}

module.exports = {
  buildCsvHybridHits,
  buildCsvHybridHitsIndexed,
  resolveCsvHybridHits,
  mergeDqlHybridResults
};
