const fs = require("fs/promises");
const path = require("path");
const { tokenize } = require("../semantic-search/tokenize");
const { loadIndex, saveIndex } = require("./store");

function normalizeSearchPathPrefix(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

function matchesSearchPathPrefix(relPath, pathPrefix) {
  const prefix = normalizeSearchPathPrefix(pathPrefix);
  if (!prefix) return true;
  const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
  return normalized === prefix || normalized.startsWith(`${prefix}/`);
}

function isTextFile(name) {
  const lower = String(name || "").toLowerCase();
  return (
    lower.endsWith(".md") ||
    lower.endsWith(".sidecar.md") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".json") ||
    lower.endsWith(".jsonl") ||
    lower.endsWith(".csv") ||
    lower.endsWith(".yml") ||
    lower.endsWith(".yaml") ||
    name === ".env" ||
    name === ".gitignore"
  );
}

function buildFileTermCounts(content) {
  const counts = new Map();
  for (const token of tokenize(content)) {
    counts.set(token, (counts.get(token) || 0) + 1);
  }
  return counts;
}

function removePathFromIndex(index, relPath) {
  const terms = index.fileTerms?.[relPath];
  if (!terms?.length) return;
  for (const term of terms) {
    const bucket = index.postings?.[term];
    if (!bucket) continue;
    delete bucket[relPath];
    if (!Object.keys(bucket).length) delete index.postings[term];
  }
  delete index.fileTerms[relPath];
}

function addPathToIndex(index, relPath, termCounts) {
  const terms = [];
  for (const [term, count] of termCounts.entries()) {
    if (!term) continue;
    terms.push(term);
    if (!index.postings[term]) index.postings[term] = {};
    index.postings[term][relPath] = count;
  }
  index.fileTerms[relPath] = terms;
}

function createFulltextSearchService(deps) {
  const { getAgentRoot, collectSearchableFiles, resolvePathAbsolute, isTextSearchableFileName } = deps;
  const rebuildLocks = new Map();

  async function readFileContent(relPath) {
    const absolute = resolvePathAbsolute(relPath);
    if (!absolute) return "";
    try {
      return await fs.readFile(absolute, "utf-8");
    } catch {
      return "";
    }
  }

  async function collectSources(agentRoot) {
    const relFiles = await collectSearchableFiles(agentRoot);
    const sources = [];
    for (const relPath of relFiles) {
      const base = path.basename(relPath);
      if (isTextSearchableFileName && !isTextSearchableFileName(base)) continue;
      if (!isTextFile(base)) continue;
      const content = await readFileContent(relPath);
      if (!String(content).trim()) continue;
      sources.push({
        path: relPath.replace(/\\/g, "/"),
        termCounts: buildFileTermCounts(content)
      });
    }
    return sources;
  }

  async function rebuildIndex({ agentId = "" } = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");

    const lockKey = agentRoot;
    if (rebuildLocks.get(lockKey)) return rebuildLocks.get(lockKey);

    const job = (async () => {
      const started = Date.now();
      const sources = await collectSources(agentRoot);
      const postings = {};
      const fileTerms = {};

      for (const source of sources) {
        const terms = [];
        for (const [term, count] of source.termCounts.entries()) {
          terms.push(term);
          if (!postings[term]) postings[term] = {};
          postings[term][source.path] = count;
        }
        fileTerms[source.path] = terms;
      }

      const index = {
        version: 1,
        model: "inverted-token-index",
        offline: true,
        builtAt: new Date().toISOString(),
        lastRebuildMs: Date.now() - started,
        agentId: agentId || null,
        fileCount: sources.length,
        termCount: Object.keys(postings).length,
        postings,
        fileTerms
      };

      await saveIndex(agentRoot, index);
      return {
        ok: true,
        builtAt: index.builtAt,
        fileCount: index.fileCount,
        termCount: index.termCount,
        model: index.model,
        lastRebuildMs: index.lastRebuildMs
      };
    })();

    rebuildLocks.set(lockKey, job);
    try {
      return await job;
    } finally {
      rebuildLocks.delete(lockKey);
    }
  }

  async function updateFile(relPath) {
    const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    if (!normalized) throw new Error("Path is required");

    const index = await loadIndex(agentRoot);
    if (!index?.postings) {
      return { ok: false, skipped: true, reason: "no_index", path: normalized };
    }

    removePathFromIndex(index, normalized);

    const base = path.basename(normalized);
    if (isTextSearchableFileName && !isTextSearchableFileName(base)) {
      index.fileCount = Object.keys(index.fileTerms || {}).length;
      index.termCount = Object.keys(index.postings || {}).length;
      index.builtAt = new Date().toISOString();
      await saveIndex(agentRoot, index);
      return { ok: true, mode: "incremental", path: normalized, removed: true };
    }

    if (isTextFile(base)) {
      const content = await readFileContent(normalized);
      if (String(content).trim()) {
        addPathToIndex(index, normalized, buildFileTermCounts(content));
      }
    }

    index.fileCount = Object.keys(index.fileTerms || {}).length;
    index.termCount = Object.keys(index.postings || {}).length;
    index.builtAt = new Date().toISOString();
    await saveIndex(agentRoot, index);

    return {
      ok: true,
      mode: "incremental",
      path: normalized,
      fileCount: index.fileCount,
      termCount: index.termCount
    };
  }

  async function getStatus() {
    const agentRoot = getAgentRoot();
    if (!agentRoot) return { ready: false, reason: "Agent not selected" };

    const index = await loadIndex(agentRoot);
    if (!index) {
      return {
        ready: false,
        model: "inverted-token-index",
        offline: true,
        fileCount: 0,
        termCount: 0,
        hint: "Индекс не построен — rebuild_workspace_fulltext_index"
      };
    }

    return {
      ready: (index.fileCount || 0) > 0,
      model: index.model,
      offline: true,
      builtAt: index.builtAt,
      lastRebuildMs: index.lastRebuildMs ?? null,
      fileCount: index.fileCount || 0,
      termCount: index.termCount || 0
    };
  }

  function rankIndexedPaths(index, query, limit = 30, pathPrefix = "") {
    const trimmed = String(query || "").trim();
    const tokens = tokenize(trimmed);
    if (!tokens.length) return [];

    const scores = new Map();
    for (const token of tokens) {
      const bucket = index?.postings?.[token];
      if (!bucket) continue;
      for (const [relPath, count] of Object.entries(bucket)) {
        if (!matchesSearchPathPrefix(relPath, pathPrefix)) continue;
        scores.set(relPath, (scores.get(relPath) || 0) + Number(count) || 1);
      }
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ru"))
      .slice(0, Math.max(limit, 1))
      .map(([relPath, score]) => ({ path: relPath, score }));
  }

  async function search(query, limit = 30, pathPrefix = "") {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");

    const index = await loadIndex(agentRoot);
    if (!index?.postings) {
      return {
        query,
        mode: "fulltext-index",
        ready: false,
        results: [],
        total: 0
      };
    }

    const hits = rankIndexedPaths(index, query, limit, pathPrefix);

    return {
      query,
      mode: "fulltext-index",
      ready: true,
      builtAt: index.builtAt,
      fileCount: index.fileCount,
      termCount: index.termCount,
      results: hits,
      total: hits.length
    };
  }

  return {
    rebuildIndex,
    updateFile,
    getStatus,
    search,
    rankIndexedPaths,
    loadIndex
  };
}

module.exports = { createFulltextSearchService };
