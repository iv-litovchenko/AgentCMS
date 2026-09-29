const fs = require("fs/promises");
const path = require("path");

const { createWorkspaceImportanceResolver } = require("../workspace/workspace-importance");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function normalizeRelPath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function daysSince(isoOrMs) {
  if (!isoOrMs) return null;
  const ms = typeof isoOrMs === "number" ? isoOrMs : new Date(isoOrMs).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.floor((Date.now() - ms) / MS_PER_DAY);
}

function parseFrontmatterScalar(raw, key) {
  const text = String(raw || "");
  const match = text.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
  if (!match) return "";
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function hasCurrentStateSection(content) {
  return /^##\s+Current State\b/im.test(String(content || ""));
}

function hasEventLogSection(content) {
  return /^##\s+Log\b/im.test(String(content || ""));
}

function extractStateLines(content) {
  const text = String(content || "");
  const match = text.match(/^##\s+Current State\b[^\n]*\n([\s\S]*?)(?=^##\s|\Z)/im);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") || line.startsWith("*"))
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean);
}

function findDuplicateStateKeys(items) {
  const keyMap = new Map();
  for (const item of items) {
    for (const line of item.stateLines || []) {
      const key = line.split(":")[0]?.trim().toLowerCase();
      if (!key) continue;
      if (!keyMap.has(key)) keyMap.set(key, []);
      keyMap.get(key).push({ path: item.path, line });
    }
  }
  return [...keyMap.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => ({ key, rows }));
}

function normalizeQueryTokens(query) {
  return String(query || "")
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function scoreAlwaysContextMatch(content, tokens) {
  if (!tokens.length) return 0;
  const haystack = String(content || "").toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) score += 1;
  }
  return score;
}

function normalizeFulltextMatchScore(matchCount) {
  const n = Number(matchCount) || 1;
  return Math.min(1, Math.log1p(n) / Math.log1p(8));
}

function mergeAskHits(existing, next) {
  const key = normalizeRelPath(next.path);
  if (!key) return;
  const prev = existing.get(key);
  if (!prev || (next.score || 0) > (prev.score || 0)) {
    existing.set(key, { ...prev, ...next, path: key, sources: [...new Set([...(prev?.sources || []), ...(next.sources || [])])] });
    return;
  }
  prev.sources = [...new Set([...(prev.sources || []), ...(next.sources || [])])];
}

function matchesPathPrefix(relPath, pathPrefix) {
  const prefix = normalizeRelPath(pathPrefix);
  if (!prefix) return true;
  const normalized = normalizeRelPath(relPath);
  return normalized === prefix || normalized.startsWith(`${prefix}/`);
}

function createWorkspaceBrainService(deps) {
  const {
    resolveAlwaysContextItemRel,
    resolvePathAbsolute,
    buildAgentAlwaysContextRegistry,
    collectAgentTopicManifestPaths,
    buildIntakeBatchSummary,
    listWorkspaceActivityEvents,
    getWorkspaceIndexMonitorPayload,
    searchWorkspaceSemantic,
    searchWorkspaceContent,
    enrichSearchResults,
    queryStorageIndex
  } = deps;

  const importanceResolver = createWorkspaceImportanceResolver({
    resolvePathAbsolute: resolvePathAbsolute
  });

  async function finalizeSearchHits(merged, { limit, includeSnippets }) {
    const ranked = [...merged.values()].sort(
      (a, b) => (b.score || 0) - (a.score || 0) || String(a.path).localeCompare(String(b.path), "ru")
    );
    const boosted = await importanceResolver.applyImportanceBoostToHits(ranked);
    return boosted
      .sort(
        (a, b) => (b.score || 0) - (a.score || 0) || String(a.path).localeCompare(String(b.path), "ru")
      )
      .slice(0, limit)
      .map((hit) => ({
        path: hit.path,
        title: hit.title || hit.path,
        score: hit.score || 0,
        baseScore: hit.baseScore ?? hit.score ?? 0,
        importance: hit.importance || 0,
        sources: hit.sources || [],
        locationHint: hit.locationHint || null,
        snippet: includeSnippets ? hit.snippet || "" : undefined
      }));
  }

  async function statWorkspaceFile(relPath) {
    const normalized = normalizeRelPath(relPath);
    if (!normalized) return null;
    const absolute = resolvePathAbsolute(normalized);
    if (!absolute) return null;
    try {
      const stat = await fs.stat(absolute);
      return {
        path: normalized,
        exists: true,
        mtime: stat.mtime.toISOString(),
        sizeBytes: stat.size
      };
    } catch {
      return { path: normalized, exists: false, mtime: null, sizeBytes: 0 };
    }
  }

  async function auditWorkspaceMemory(options = {}) {
    const staleDays = Math.max(1, Number(options.staleDays) || 90);
    const includeContentChecks = options.includeContentChecks !== false;

    const [alwaysRegistry, indexMonitor] = await Promise.all([
      buildAgentAlwaysContextRegistry(),
      getWorkspaceIndexMonitorPayload().catch(() => null)
    ]);

    const alwaysItems = [];
    const stateAuditRows = [];

    for (const item of alwaysRegistry.items || []) {
      const relPath = resolveAlwaysContextItemRel(item);
      const stat = relPath ? await statWorkspaceFile(relPath) : null;
      const content = String(item.content || "");
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const frontmatter = frontmatterMatch ? frontmatterMatch[1] : "";
      const awnUpdated = parseFrontmatterScalar(frontmatter, "awn-update") || parseFrontmatterScalar(frontmatter, "awn-updated");
      const ageDays = stat?.mtime ? daysSince(stat.mtime) : daysSince(awnUpdated);
      const stale = ageDays != null && ageDays >= staleDays;
      const stateLines = includeContentChecks ? extractStateLines(content) : [];

      const row = {
        entityKind: item.entityKind,
        label: item.label,
        path: relPath,
        displayPath: item.displayPath,
        exists: Boolean(item.exists && stat?.exists !== false),
        mtime: stat?.mtime || null,
        awnUpdated: awnUpdated || null,
        ageDays,
        stale,
        hasCurrentState: hasCurrentStateSection(content),
        hasEventLog: hasEventLogSection(content),
        stateLineCount: stateLines.length
      };

      alwaysItems.push(row);

      if (includeContentChecks && item.entityKind !== "system" && content.trim()) {
        stateAuditRows.push({ path: relPath, stateLines });
      }
    }

    const duplicateStateKeys = findDuplicateStateKeys(stateAuditRows);
    const staleItems = alwaysItems.filter((item) => item.stale);
    const missingStateSection = alwaysItems.filter(
      (item) => item.entityKind !== "system" && item.exists && !item.hasCurrentState
    );

    const findings = [];

    for (const item of staleItems) {
      findings.push({
        kind: "stale-always-context",
        severity: "warn",
        path: item.path,
        label: item.label,
        message: `Always-context не обновлялся ${item.ageDays} дн. (порог ${staleDays})`
      });
    }

    for (const item of missingStateSection.slice(0, 20)) {
      findings.push({
        kind: "missing-current-state",
        severity: "info",
        path: item.path,
        label: item.label,
        message: "Нет секции ## Current State — возможен memory rot при append-only записи"
      });
    }

    for (const dup of duplicateStateKeys.slice(0, 20)) {
      findings.push({
        kind: "duplicate-state-key",
        severity: "warn",
        key: dup.key,
        message: `Ключ state «${dup.key}» встречается в нескольких always-context файлах`,
        rows: dup.rows
      });
    }

    const indexHealth = indexMonitor?.health || indexMonitor?.summary?.health || null;

    if (indexHealth && indexHealth !== "ok") {
      findings.push({
        kind: "index-health",
        severity: indexHealth === "empty" ? "info" : "warn",
        message: `Workspace indexes: ${indexHealth}`,
        monitor: {
          health: indexHealth,
          semantic: indexMonitor?.semantic?.health || null,
          storage: indexMonitor?.storage?.health || null
        }
      });
    }

    return {
      version: 1,
      model: "workspace-memory-audit",
      hint: "Read-only audit: stale always-context, missing ## Current State, duplicate state keys, index health. Does not modify files.",
      generatedAt: new Date().toISOString(),
      staleDays,
      totals: {
        alwaysContextCount: alwaysItems.length,
        staleCount: staleItems.length,
        missingCurrentStateCount: missingStateSection.length,
        duplicateStateKeyCount: duplicateStateKeys.length,
        findingCount: findings.length
      },
      alwaysContext: alwaysItems,
      findings,
      indexMonitor: indexMonitor
        ? {
            health: indexHealth,
            semantic: indexMonitor.semantic || null,
            storage: indexMonitor.storage || null
          }
        : null
    };
  }

  async function listWorkspaceFeed(options = {}) {
    const activityLimit = Math.max(1, Math.min(100, Number(options.activityLimit) || 30));
    const includeIntake = options.includeIntake !== false;
    const includeAuditSummary = options.includeAuditSummary !== false;
    const topicPaths = includeIntake ? await collectAgentTopicManifestPaths() : [];

    const [activityPayload, intakeBatch, indexMonitor, auditSummary] = await Promise.all([
      listWorkspaceActivityEvents({ limit: activityLimit }),
      includeIntake ? buildIntakeBatchSummary(topicPaths) : Promise.resolve(null),
      getWorkspaceIndexMonitorPayload().catch(() => null),
      includeAuditSummary
        ? auditWorkspaceMemory({ staleDays: options.staleDays || 90, includeContentChecks: false })
        : Promise.resolve(null)
    ]);

    const intakeSummaries = intakeBatch?.summaries || {};
    const topicsWithPendingInbox = Object.entries(intakeSummaries)
      .filter(([, summary]) => Number(summary?.inbox?.pending) > 0)
      .map(([manifestPath, summary]) => ({
        path: manifestPath,
        pending: Number(summary.inbox.pending) || 0,
        inboxTotal: Number(summary.inbox.total) || 0,
        discussionCount: Number(summary.discussion?.count || summary.thread?.count) || 0,
        lastMessageAt: summary.discussion?.lastMessageAt || summary.thread?.lastMessageAt || null
      }))
      .sort((a, b) => b.pending - a.pending || b.discussionCount - a.discussionCount);

    const topicsWithRecentThread = Object.entries(intakeSummaries)
      .filter(([, summary]) => summary.discussion?.lastMessageAt || summary.thread?.lastMessageAt)
      .map(([manifestPath, summary]) => ({
        path: manifestPath,
        lastMessageAt: summary.discussion?.lastMessageAt || summary.thread?.lastMessageAt,
        lastMessageId: summary.discussion?.lastMessageId || summary.thread?.lastMessageId || null,
        discussionCount: Number(summary.discussion?.count || summary.thread?.count) || 0
      }))
      .sort((a, b) => String(b.lastMessageAt).localeCompare(String(a.lastMessageAt)))
      .slice(0, 20);

    return {
      version: 1,
      model: "workspace-feed",
      hint: "Unified workspace feed: recent activity, intake totals, topics needing attention, optional memory audit summary.",
      generatedAt: new Date().toISOString(),
      activity: {
        events: activityPayload?.events || [],
        latestId: activityPayload?.latestId || 0,
        total: activityPayload?.total || 0
      },
      intake: intakeBatch
        ? {
            totals: intakeBatch.totals || {},
            topicsWithPendingInbox,
            topicsWithRecentThread
          }
        : null,
      index: indexMonitor
        ? {
            health: indexMonitor.health || indexMonitor.summary?.health || null,
            semantic: indexMonitor.semantic || null,
            storage: indexMonitor.storage || null
          }
        : null,
      memoryAudit: auditSummary
        ? {
            staleDays: auditSummary.staleDays,
            staleCount: auditSummary.totals?.staleCount || 0,
            findingCount: auditSummary.totals?.findingCount || 0,
            topFindings: (auditSummary.findings || []).slice(0, 8)
          }
        : null
    };
  }

  async function askWorkspace(options = {}) {
    const query = String(options.query || options.q || "").trim();
    if (query.length < 2) {
      throw new Error("query must be at least 2 characters");
    }

    const limit = Math.max(1, Math.min(20, Number(options.limit) || 8));
    const scopes = Array.isArray(options.scopes) && options.scopes.length
      ? options.scopes.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean)
      : ["semantic", "fulltext", "always"];
    const includeSnippets = options.includeSnippets !== false;
    const tokens = normalizeQueryTokens(query);
    const merged = new Map();

    const tasks = [];

    if (scopes.includes("semantic")) {
      tasks.push(
        searchWorkspaceSemantic(query, Math.max(limit, 12)).then((data) => {
          for (const row of data?.results || []) {
            mergeAskHits(merged, {
              path: row.path || row.filePath,
              score: Number(row.score) || 0,
              snippet: row.preview || row.snippet || "",
              title: row.displayName || path.basename(row.path || row.filePath || ""),
              locationHint: row.locationHint || null,
              sources: ["semantic"]
            });
          }
        })
      );
    }

    if (scopes.includes("fulltext")) {
      tasks.push(
        searchWorkspaceContent(query, Math.max(limit, 12), "all", "all", "relaxed").then(async (data) => {
          const enriched = await enrichSearchResults(data?.results || []);
          for (const row of enriched) {
            mergeAskHits(merged, {
              path: row.filePath || row.canonicalPath,
              score: Number(row.matchCount) || 1,
              snippet: row.snippet || "",
              title: row.displayName || row.topicName || path.basename(row.filePath || ""),
              locationHint: row.locationHint || null,
              sources: ["fulltext"]
            });
          }
        })
      );
    }

    if (scopes.includes("always")) {
      tasks.push(
        buildAgentAlwaysContextRegistry().then((registry) => {
          for (const item of registry.items || []) {
            const relPath = resolveAlwaysContextItemRel(item);
            const score = scoreAlwaysContextMatch(item.content, tokens);
            if (score <= 0) continue;
            mergeAskHits(merged, {
              path: relPath,
              score: score * 100,
              snippet: String(item.content || "")
                .replace(/^---[\s\S]*?---\s*/m, "")
                .replace(/\s+/g, " ")
                .trim()
                .slice(0, 240),
              title: item.label || item.displayPath,
              locationHint: "always-context",
              sources: ["always"]
            });
          }
        })
      );
    }

    await Promise.all(tasks);

    const hits = await finalizeSearchHits(merged, { limit, includeSnippets });

    return {
      version: 1,
      model: "workspace-ask",
      hint:
        "Composite Q&A retrieval across semantic index, full-text search, and always-context. " +
        "Hits are re-ranked by awn-importance (topic/record, inherited from ancestor manifests). " +
        "Returns cited hits — agent synthesizes the answer.",
      query,
      scopes,
      hitCount: hits.length,
      hits
    };
  }

  async function searchAndGetContext(options = {}) {
    const payload = await askWorkspace(options);
    return {
      ...payload,
      model: "search-and-get-context",
      hint:
        "Retrieval-only context for questions about past workspace data (archives, old notes, messages, documents, decisions). " +
        "Returns cited snippets — synthesize the answer yourself. Same engine as ask_workspace.",
      whenToUse:
        "User refers to earlier data, history, archives, or asks what was said/decided/found — call this before answering."
    };
  }

  async function resolveHybridScopes(options = {}) {
    const requested = Array.isArray(options.scopes) && options.scopes.length
      ? options.scopes.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean)
      : null;
    if (typeof deps.getSearchDefaultScopes === "function") {
      const scopes = await deps.getSearchDefaultScopes(requested);
      if (scopes.length) return scopes;
      throw new Error("all requested search scopes are disabled in platform settings");
    }
    return requested && requested.length ? requested : ["semantic", "fulltext"];
  }

  async function searchWorkspaceHybrid(options = {}) {
    const query = String(options.query || options.q || "").trim();
    if (query.length < 2) {
      throw new Error("query must be at least 2 characters");
    }

    const limit = Math.max(1, Math.min(50, Number(options.limit) || 20));
    const scopes = await resolveHybridScopes(options);
    const tuning =
      typeof deps.getPlatformSearchTuning === "function"
        ? await deps.getPlatformSearchTuning()
        : { hybridSemanticWeight: 0.6, hybridFulltextWeight: 0.4 };
    const includeSnippets = options.includeSnippets !== false;
    const pathPrefix = normalizeRelPath(options.pathPrefix || "");
    const where = Array.isArray(options.where) ? options.where : [];

    let allowedPaths = null;
    let filterPathCount = 0;
    if (where.length && queryStorageIndex) {
      const storageResult = await queryStorageIndex({
        pathPrefix: pathPrefix || undefined,
        where,
        limit: 5000
      });
      allowedPaths = new Set(
        (storageResult?.results || [])
          .map((row) => normalizeRelPath(row.path))
          .filter(Boolean)
      );
      filterPathCount = allowedPaths.size;
      if (!filterPathCount) {
        return {
          version: 1,
          model: "workspace-search-hybrid",
          hint:
            "Hybrid search: semantic + fulltext after storage-index field filters. No files matched the where clause.",
          query,
          pathPrefix: pathPrefix || null,
          where,
          scopes,
          filterPathCount: 0,
          hitCount: 0,
          hits: []
        };
      }
    }

    const pathAllowed = (relPath) => {
      const key = normalizeRelPath(relPath);
      if (!key) return false;
      if (!matchesPathPrefix(key, pathPrefix)) return false;
      if (allowedPaths && !allowedPaths.has(key)) return false;
      return true;
    };

    const merged = new Map();
    const tasks = [];

    if (scopes.includes("semantic")) {
      tasks.push(
        searchWorkspaceSemantic(query, Math.max(limit, 24), pathPrefix).then((data) => {
          for (const row of data?.results || []) {
            const hitPath = row.path || row.filePath;
            if (!pathAllowed(hitPath)) continue;
            mergeAskHits(merged, {
              path: hitPath,
              score: (Number(row.score) || 0) * (tuning.hybridSemanticWeight || 0.6),
              snippet: row.preview || row.snippet || "",
              title: row.displayName || path.basename(hitPath || ""),
              locationHint: row.locationHint || null,
              sources: ["semantic"]
            });
          }
        })
      );
    }

    if (scopes.includes("fulltext")) {
      tasks.push(
        searchWorkspaceContent(query, Math.max(limit, 24), "content", "all", "relaxed", pathPrefix).then(
          async (data) => {
            const enriched = enrichSearchResults ? await enrichSearchResults(data?.results || []) : data?.results || [];
            for (const row of enriched) {
              const hitPath = row.filePath || row.canonicalPath || row.path;
              if (!pathAllowed(hitPath)) continue;
              mergeAskHits(merged, {
                path: hitPath,
                score:
                  normalizeFulltextMatchScore(row.matchCount) * (tuning.hybridFulltextWeight || 0.4),
                snippet: row.snippet || "",
                title: row.displayName || row.topicName || path.basename(hitPath || ""),
                locationHint: row.locationHint || null,
                sources: ["fulltext"]
              });
            }
          }
        )
      );
    }

    await Promise.all(tasks);

    const hits = await finalizeSearchHits(merged, { limit, includeSnippets });

    return {
      version: 1,
      model: "workspace-search-hybrid",
      hint:
        "Hybrid search: semantic + fulltext in one call, optional storage-index where filters on frontmatter fields (awn-date, tags, author…). " +
        "Hits are re-ranked by awn-importance (topic/record, inherited from ancestor manifests).",
      query,
      pathPrefix: pathPrefix || null,
      where,
      scopes,
      filterPathCount: allowedPaths ? filterPathCount : null,
      hitCount: hits.length,
      hits
    };
  }

  async function searchWorkspaceBatch(options = {}) {
    const rawQueries = Array.isArray(options.queries)
      ? options.queries
      : Array.isArray(options.questions)
        ? options.questions
        : [];

    const queries = rawQueries
      .map((item) => String(item || "").trim())
      .filter((item) => item.length >= 2);

    if (!queries.length) {
      throw new Error("queries must be a non-empty array of strings (min 2 characters each)");
    }
    if (queries.length > 20) {
      throw new Error("queries supports at most 20 items per call");
    }

    const limitPerQuery = Math.max(1, Math.min(20, Number(options.limitPerQuery) || Number(options.limit) || 8));
    const shared = {
      pathPrefix: options.pathPrefix || "",
      where: options.where,
      scopes: options.scopes,
      includeSnippets: options.includeSnippets
    };

    const settled = await Promise.all(
      queries.map(async (query) => {
        try {
          const payload = await searchWorkspaceHybrid({
            ...shared,
            query,
            limit: limitPerQuery
          });
          return {
            query,
            ok: true,
            hitCount: payload.hitCount || 0,
            filterPathCount: payload.filterPathCount ?? null,
            hits: payload.hits || []
          };
        } catch (error) {
          return {
            query,
            ok: false,
            hitCount: 0,
            hits: [],
            error: String(error.message || error)
          };
        }
      })
    );

    const totalHits = settled.reduce((sum, row) => sum + (row.hitCount || 0), 0);
    const failedCount = settled.filter((row) => !row.ok).length;

    return {
      version: 1,
      model: "workspace-search-batch",
      hint:
        "Batch hybrid search: multiple questions in one MCP call. Each query runs semantic + fulltext (same as search_workspace_hybrid). Agent maps answers from per-query hits.",
      pathPrefix: normalizeRelPath(shared.pathPrefix) || null,
      where: Array.isArray(shared.where) ? shared.where : [],
      scopes: await resolveHybridScopes(shared),
      limitPerQuery,
      queryCount: queries.length,
      totalHits,
      failedCount,
      results: settled
    };
  }

  return {
    auditWorkspaceMemory,
    listWorkspaceFeed,
    askWorkspace,
    searchAndGetContext,
    searchWorkspaceHybrid,
    searchWorkspaceBatch
  };
}

module.exports = {
  createWorkspaceBrainService
};
