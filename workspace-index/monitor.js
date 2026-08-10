const fs = require("fs/promises");
const path = require("path");
const { getIndexPaths: getSemanticIndexPaths } = require("../semantic-search/store");
const { getIndexPaths: getStorageIndexPaths } = require("../storage-index/store");

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(ms) {
  const n = Number(ms) || 0;
  if (n < 1000) return `${Math.round(n)} ms`;
  return `${(n / 1000).toFixed(1)} s`;
}

function formatAge(builtAt) {
  if (!builtAt) return "—";
  const ms = Date.now() - new Date(builtAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hours = Math.floor(min / 60);
  if (hours < 48) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} д назад`;
}

function healthFromCounts({ ready, staleCount, missingCount, newFilesCount }) {
  if (!ready) return "empty";
  if ((staleCount || 0) + (missingCount || 0) + (newFilesCount || 0) > 0) return "stale";
  return "ok";
}

async function statIndexFile(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return { sizeBytes: stat.size, mtime: stat.mtime.toISOString() };
  } catch {
    return { sizeBytes: 0, mtime: null };
  }
}

async function inspectIndexedPaths(paths, builtAt, resolvePathAbsolute) {
  const builtMs = builtAt ? new Date(builtAt).getTime() : 0;
  let staleCount = 0;
  let missingCount = 0;
  const staleSamples = [];

  for (const relPath of paths) {
    const absolute = resolvePathAbsolute(relPath);
    if (!absolute) continue;
    try {
      const stat = await fs.stat(absolute);
      if (builtMs && stat.mtimeMs > builtMs + 750) {
        staleCount += 1;
        if (staleSamples.length < 6) staleSamples.push(relPath);
      }
    } catch {
      missingCount += 1;
      if (staleSamples.length < 6) staleSamples.push(relPath);
    }
  }

  return { staleCount, missingCount, staleSamples };
}

async function countNewEligibleFiles(allPaths, indexedSet, builtAt, isEligible, resolvePathAbsolute) {
  const builtMs = builtAt ? new Date(builtAt).getTime() : 0;
  if (!builtMs) return 0;
  let newFilesCount = 0;
  for (const relPath of allPaths) {
    if (indexedSet.has(relPath)) continue;
    if (!isEligible(relPath)) continue;
    const absolute = resolvePathAbsolute(relPath);
    if (!absolute) continue;
    try {
      const stat = await fs.stat(absolute);
      if (stat.mtimeMs > builtMs - 750) newFilesCount += 1;
    } catch {
      // skip
    }
  }
  return newFilesCount;
}

function isSemanticEligible(relPath) {
  const base = path.basename(String(relPath || ""));
  const lower = base.toLowerCase();
  return (
    lower.endsWith(".md") ||
    lower.endsWith(".sidecar.md") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".json") ||
    lower.endsWith(".yml") ||
    lower.endsWith(".yaml") ||
    base === ".env" ||
    base === ".gitignore"
  );
}

function isStorageEligible(relPath) {
  const lower = String(relPath || "").toLowerCase();
  return (
    lower.endsWith(".md") ||
    lower.endsWith(".sidecar.md") ||
    lower.endsWith(".yml") ||
    lower.endsWith(".yaml")
  );
}

async function buildLayerMonitor({
  layer,
  index,
  indexFilePath,
  indexedPaths,
  allPaths,
  isEligible,
  resolvePathAbsolute,
  readyCheck
}) {
  const fileStat = await statIndexFile(indexFilePath);
  const ready = Boolean(index && readyCheck(index));

  if (!ready) {
    return {
      layer,
      ready: false,
      health: "empty",
      indexPath: path.basename(path.dirname(indexFilePath)) + "/" + path.basename(indexFilePath),
      indexSizeBytes: fileStat.sizeBytes,
      indexSizeLabel: formatBytes(fileStat.sizeBytes),
      hint: layer === "semantic" ? "Индекс не построен" : "Каталог полей не построен"
    };
  }

  const builtAt = index.builtAt || null;
  const pathSet = new Set(indexedPaths);
  const [{ staleCount, missingCount, staleSamples }, newFilesCount] = await Promise.all([
    inspectIndexedPaths(indexedPaths, builtAt, resolvePathAbsolute),
    countNewEligibleFiles(allPaths, pathSet, builtAt, isEligible, resolvePathAbsolute)
  ]);

  const health = healthFromCounts({ ready: true, staleCount, missingCount, newFilesCount });

  return {
    layer,
    ready: true,
    health,
    model: index.model,
    builtAt,
    builtAge: formatAge(builtAt),
    lastRebuildMs: index.lastRebuildMs ?? null,
    lastRebuildLabel: index.lastRebuildMs != null ? formatDuration(index.lastRebuildMs) : null,
    indexSizeBytes: fileStat.sizeBytes,
    indexSizeLabel: formatBytes(fileStat.sizeBytes),
    staleCount,
    missingCount,
    newFilesCount,
    staleSamples,
    ...(layer === "semantic"
      ? { fileCount: index.fileCount || 0, chunkCount: index.chunkCount || 0 }
      : { recordCount: index.recordCount || 0, fieldCount: index.fieldCount || 0 })
  };
}

async function getWorkspaceIndexMonitor(deps) {
  const {
    getAgentRoot,
    collectSearchableFiles,
    resolvePathAbsolute,
    loadSemanticIndex,
    loadStorageIndex
  } = deps;

  const agentRoot = getAgentRoot();
  if (!agentRoot) {
    return { ready: false, reason: "Agent not selected" };
  }

  const [allPaths, semanticIndex, storageIndex] = await Promise.all([
    collectSearchableFiles(agentRoot),
    loadSemanticIndex(agentRoot),
    loadStorageIndex(agentRoot)
  ]);

  const semanticPaths = semanticIndex?.chunks
    ? [...new Set(semanticIndex.chunks.map((row) => row.path))]
    : [];
  const storagePaths = storageIndex?.records ? storageIndex.records.map((row) => row.path) : [];

  const semantic = await buildLayerMonitor({
    layer: "semantic",
    index: semanticIndex,
    indexFilePath: getSemanticIndexPaths(agentRoot).file,
    indexedPaths: semanticPaths,
    allPaths,
    isEligible: isSemanticEligible,
    resolvePathAbsolute,
    readyCheck: (index) => (index.chunkCount || 0) > 0
  });

  const storage = await buildLayerMonitor({
    layer: "storage",
    index: storageIndex,
    indexFilePath: getStorageIndexPaths(agentRoot).file,
    indexedPaths: storagePaths,
    allPaths,
    isEligible: isStorageEligible,
    resolvePathAbsolute,
    readyCheck: (index) => (index.recordCount || 0) > 0
  });

  const summaryHealth = (() => {
    if (!semantic.ready && !storage.ready) return "empty";
    if (!semantic.ready || !storage.ready) return "partial";
    if (semantic.health === "stale" || storage.health === "stale") return "stale";
    return "ok";
  })();

  const staleTotal = (semantic.staleCount || 0) + (storage.staleCount || 0);
  const newTotal = (semantic.newFilesCount || 0) + (storage.newFilesCount || 0);
  const missingTotal = (semantic.missingCount || 0) + (storage.missingCount || 0);

  let message = "Индексы актуальны";
  if (summaryHealth === "empty") message = "Индексы не построены";
  else if (summaryHealth === "partial") message = "Построен только один слой";
  else if (staleTotal > 0) message = `${staleTotal} файл(ов) изменены после индексации`;
  else if (newTotal > 0) message = `${newTotal} новых файлов не в индексе`;
  else if (missingTotal > 0) message = `${missingTotal} файлов в индексе уже удалены`;

  return {
    mode: "workspace-index-monitor",
    agentRoot: path.basename(agentRoot),
    summary: {
      health: summaryHealth,
      message,
      staleTotal,
      newTotal,
      missingTotal
    },
    semantic,
    storage
  };
}

module.exports = {
  getWorkspaceIndexMonitor,
  formatBytes,
  formatDuration,
  formatAge
};
