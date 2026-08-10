const fs = require("fs/promises");
const path = require("path");
const { chunkMarkdown } = require("./chunker");
const { MODEL_ID, DIMS, buildIdf, embedText, cosineSimilarity } = require("./embedder");
const { loadIndex, saveIndex } = require("./store");

function isTextFile(name) {
  const lower = String(name || "").toLowerCase();
  return (
    lower.endsWith(".md") ||
    lower.endsWith(".sidecar.md") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".json") ||
    lower.endsWith(".yml") ||
    lower.endsWith(".yaml") ||
    name === ".env" ||
    name === ".gitignore"
  );
}

function createSemanticSearchService(deps) {
  const { getAgentRoot, collectSearchableFiles, resolvePathAbsolute } = deps;
  const rebuildLocks = new Map();

  async function collectSources(agentRoot) {
    const relFiles = await collectSearchableFiles(agentRoot);
    const sources = [];
    for (const relPath of relFiles) {
      if (!isTextFile(path.basename(relPath))) continue;
      const absolute = resolvePathAbsolute(relPath);
      if (!absolute) continue;
      let content = "";
      try {
        content = await fs.readFile(absolute, "utf-8");
      } catch {
        continue;
      }
      if (!String(content).trim()) continue;
      const chunks = chunkMarkdown(content);
      if (!chunks.length) continue;
      sources.push({ path: relPath.replace(/\\/g, "/"), chunks });
    }
    return sources;
  }

  function buildChunksForPath(relPath, texts, idf) {
    return texts.map((text, index) => ({
      id: `${relPath}#${index}`,
      path: relPath,
      chunkIndex: index,
      preview: text.slice(0, 220).replace(/\s+/g, " ").trim(),
      vector: embedText(text, idf)
    }));
  }

  async function updateFile(relPath) {
    const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    if (!normalized) throw new Error("Path is required");

    const index = await loadIndex(agentRoot);
    if (!index?.chunks) {
      return { ok: false, skipped: true, reason: "no_index", path: normalized };
    }

    index.chunks = index.chunks.filter((chunk) => chunk.path !== normalized);

    if (isTextFile(path.basename(normalized))) {
      const absolute = resolvePathAbsolute(normalized);
      if (absolute) {
        let content = "";
        try {
          content = await fs.readFile(absolute, "utf-8");
        } catch {
          content = "";
        }
        if (String(content).trim()) {
          const texts = chunkMarkdown(content);
          if (texts.length) {
            index.chunks.push(...buildChunksForPath(normalized, texts, index.idf || {}));
          }
        }
      }
    }

    index.fileCount = new Set(index.chunks.map((chunk) => chunk.path)).size;
    index.chunkCount = index.chunks.length;
    index.builtAt = new Date().toISOString();
    await saveIndex(agentRoot, index);

    return {
      ok: true,
      mode: "incremental",
      path: normalized,
      fileCount: index.fileCount,
      chunkCount: index.chunkCount,
      chunksForFile: index.chunks.filter((chunk) => chunk.path === normalized).length
    };
  }

  async function rebuildIndex({ agentId = "" } = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");

    const lockKey = agentRoot;
    if (rebuildLocks.get(lockKey)) return rebuildLocks.get(lockKey);

    const job = (async () => {
      const sources = await collectSources(agentRoot);
      const allTexts = sources.flatMap((s) => s.chunks);
      const idf = buildIdf(allTexts);

      const chunks = [];
      for (const source of sources) {
        source.chunks.forEach((text, index) => {
          chunks.push({
            id: `${source.path}#${index}`,
            path: source.path,
            chunkIndex: index,
            preview: text.slice(0, 220).replace(/\s+/g, " ").trim(),
            vector: embedText(text, idf)
          });
        });
      }

      const index = {
        version: 1,
        model: MODEL_ID,
        dims: DIMS,
        offline: true,
        builtAt: new Date().toISOString(),
        agentId: agentId || null,
        fileCount: sources.length,
        chunkCount: chunks.length,
        idf,
        chunks
      };

      await saveIndex(agentRoot, index);
      return {
        ok: true,
        builtAt: index.builtAt,
        fileCount: index.fileCount,
        chunkCount: index.chunkCount,
        model: index.model
      };
    })();

    rebuildLocks.set(lockKey, job);
    try {
      return await job;
    } finally {
      rebuildLocks.delete(lockKey);
    }
  }

  async function getStatus() {
    const agentRoot = getAgentRoot();
    if (!agentRoot) return { ready: false, reason: "Agent not selected" };

    const index = await loadIndex(agentRoot);
    if (!index) {
      return {
        ready: false,
        model: MODEL_ID,
        offline: true,
        fileCount: 0,
        chunkCount: 0,
        hint: "Индекс не построен — нажмите «Переиндексировать»"
      };
    }

    return {
      ready: index.chunkCount > 0,
      model: index.model,
      offline: true,
      builtAt: index.builtAt,
      fileCount: index.fileCount,
      chunkCount: index.chunkCount
    };
  }

  function vectorPreview(vector, head = 8) {
    const arr = Array.isArray(vector) ? vector : [];
    let sum = 0;
    for (let i = 0; i < arr.length; i++) sum += arr[i] * arr[i];
    const norm = Math.sqrt(sum);
    return {
      dims: arr.length,
      norm: Math.round(norm * 1000) / 1000,
      head: arr.slice(0, head).map((v) => Math.round(v * 10000) / 10000)
    };
  }

  async function catalog({ limit = 40, offset = 0, pathPrefix = "", q = "" } = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");

    const index = await loadIndex(agentRoot);
    if (!index?.chunks?.length) {
      return {
        mode: "semantic-catalog",
        model: MODEL_ID,
        ready: false,
        total: 0,
        offset: 0,
        limit,
        items: [],
        hint: "Индекс не построен"
      };
    }

    const prefix = String(pathPrefix || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const needle = String(q || "").trim().toLowerCase();
    let rows = index.chunks;
    if (prefix) rows = rows.filter((row) => row.path.startsWith(prefix));
    if (needle) {
      rows = rows.filter(
        (row) =>
          row.path.toLowerCase().includes(needle) ||
          String(row.preview || "").toLowerCase().includes(needle) ||
          String(row.id || "").toLowerCase().includes(needle)
      );
    }

    const total = rows.length;
    const start = Math.max(Number(offset) || 0, 0);
    const take = Math.min(Math.max(Number(limit) || 40, 1), 200);
    const items = rows.slice(start, start + take).map((row) => ({
      id: row.id,
      path: row.path,
      chunkIndex: row.chunkIndex,
      preview: row.preview,
      vector: vectorPreview(row.vector)
    }));

    return {
      mode: "semantic-catalog",
      model: index.model || MODEL_ID,
      ready: true,
      builtAt: index.builtAt,
      fileCount: index.fileCount,
      chunkCount: index.chunkCount,
      total,
      offset: start,
      limit: take,
      pathPrefix: prefix || null,
      query: needle || null,
      items
    };
  }

  async function search(query, limit = 20) {
    const trimmed = String(query || "").trim();
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    if (trimmed.length < 2) {
      return { query: trimmed, mode: "semantic", model: MODEL_ID, results: [], total: 0 };
    }

    let index = await loadIndex(agentRoot);
    if (!index || !index.chunks?.length) {
      await rebuildIndex();
      index = await loadIndex(agentRoot);
    }
    if (!index?.chunks?.length) {
      return {
        query: trimmed,
        mode: "semantic",
        model: MODEL_ID,
        results: [],
        total: 0,
        hint: "Нет текстов для индексации"
      };
    }

    const qVec = embedText(trimmed, index.idf || {});
    const scored = index.chunks
      .map((chunk) => ({
        path: chunk.path,
        chunkId: chunk.id,
        score: cosineSimilarity(qVec, chunk.vector),
        snippet: chunk.preview
      }))
      .filter((row) => row.score > 0.05)
      .sort((a, b) => b.score - a.score);

    const byPath = new Map();
    for (const row of scored) {
      const prev = byPath.get(row.path);
      if (!prev || row.score > prev.score) byPath.set(row.path, row);
    }

    const results = Array.from(byPath.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(Math.max(limit, 1), 50))
      .map((row) => ({
        ...row,
        score: Math.round(row.score * 1000) / 1000
      }));

    return {
      query: trimmed,
      mode: "semantic",
      model: index.model || MODEL_ID,
      offline: true,
      builtAt: index.builtAt,
      results,
      total: results.length
    };
  }

  return { rebuildIndex, getStatus, search, catalog, updateFile };
}

module.exports = { createSemanticSearchService };
