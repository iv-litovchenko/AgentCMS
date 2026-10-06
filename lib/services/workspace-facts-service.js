const fs = require("fs/promises");
const path = require("path");
const {
  AWN_DATABASE_DIR,
  FACTS_STORE_REL,
  GLOSSARY_STORE_REL,
  LEGACY_FACTS_DIR,
  ensureContentsGroupScaffold,
  createAwnDataRecord,
  getAwnDataPayload,
  writeAwnDataRecordBody,
  writeAwnDataRecordProperties
} = require("../awn/awn-data-loader");

const FACTS_DIR = `${AWN_DATABASE_DIR}/${FACTS_STORE_REL}`;

const FACT_KINDS = new Set(["decision", "preference", "entity", "procedure", "open-question", "note", "fact"]);
const FACT_SOURCES = new Set([
  "claude-desktop",
  "cursor",
  "voice",
  "shell",
  "codex",
  "manual",
  "other"
]);

function normalizeRelPath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function workspaceRelFromStoreRecord(storeRecordRelPath) {
  const p = normalizeRelPath(storeRecordRelPath);
  if (!p) return "";
  if (p.startsWith(`${AWN_DATABASE_DIR}/`)) return p;
  return `${AWN_DATABASE_DIR}/${p}`;
}

function formatYamlScalar(value) {
  const text = String(value ?? "");
  if (!text || /[:#\[\]{}&,*?"']|^\s|\s$/.test(text)) {
    return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return text;
}

function parseFrontmatter(content) {
  const text = String(content || "");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: text.trim() };
  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    const row = line.match(/^([a-z0-9-]+):\s*(.+)$/i);
    if (!row) continue;
    const key = row[1];
    let value = row[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key === "awn-tags") {
      if (value.startsWith("[") && value.endsWith("]")) {
        frontmatter[key] = value
          .slice(1, -1)
          .split(",")
          .map((item) => item.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      } else {
        frontmatter[key] = value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }
      continue;
    }
    frontmatter[key] = value;
  }
  return { frontmatter, body: match[2].trim() };
}

function parseTagsParam(raw) {
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item || "").trim()).filter(Boolean);
  }
  const text = String(raw || "").trim();
  if (!text) return [];
  return text
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function matchesTags(itemTags, filterTags) {
  if (!filterTags.length) return true;
  const haystack = new Set((Array.isArray(itemTags) ? itemTags : []).map((tag) => String(tag).toLowerCase()));
  return filterTags.every((tag) => haystack.has(String(tag).toLowerCase()));
}

function buildFactPropertiesPatch(options = {}) {
  const lines = [];
  const kind = String(options.kind || "fact").trim().toLowerCase();
  const source = String(options.source || "manual").trim().toLowerCase();
  const tags = parseTagsParam(options.tags);
  const title = String(options.name || options.body || "Факт").trim().slice(0, 120);
  lines.push(`awn-name: ${formatYamlScalar(title)}`);
  lines.push(`awn-fact-kind: ${formatYamlScalar(kind)}`);
  lines.push(`awn-source: ${formatYamlScalar(source)}`);
  if (tags.length) {
    lines.push(`awn-tags: [${tags.map((tag) => formatYamlScalar(tag)).join(", ")}]`);
  }
  if (options.sourceRef) lines.push(`awn-source-ref: ${formatYamlScalar(options.sourceRef)}`);
  if (options.supersedes) lines.push(`awn-supersedes: ${formatYamlScalar(options.supersedes)}`);
  return lines.join("\n");
}

function mapStoreRecordToFact(record) {
  const fm = record.frontmatter || {};
  const relPath = workspaceRelFromStoreRecord(record.relPath);
  const awnId = String(fm["awn-id"] || "").trim();
  return {
    path: relPath,
    record: String(record.id || "").trim(),
    awnId: awnId || null,
    fileName: record.fileName,
    name: fm["awn-name"] || record.title || record.id,
    kind: fm["awn-fact-kind"] || "fact",
    source: fm["awn-source"] || "manual",
    tags: Array.isArray(fm["awn-tags"]) ? fm["awn-tags"] : parseTagsParam(fm["awn-tags"]),
    sourceRef: fm["awn-source-ref"] || "",
    supersedes: fm["awn-supersedes"] || "",
    created: fm["awn-create"] || "",
    updated: fm["awn-update"] || "",
    body: String(record.body || "").trim()
  };
}

function createWorkspaceFactsService(deps) {
  const { getAgentRoot, getProjectRoot, searchWorkspaceHybrid, onFactWritten } = deps;

  function agentContext() {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    const projectRoot = typeof getProjectRoot === "function" ? getProjectRoot() : process.cwd();
    return { agentRoot, projectRoot };
  }

  function ensureFactsStore() {
    const { agentRoot, projectRoot } = agentContext();
    ensureContentsGroupScaffold(agentRoot, projectRoot, { preset: "facts" });
  }

  let legacyFactsMigrated = false;

  async function migrateLegacyFactsIfNeeded() {
    if (legacyFactsMigrated) return { migrated: 0 };
    const { agentRoot, projectRoot } = agentContext();
    const legacyDir = path.join(agentRoot, LEGACY_FACTS_DIR);
    let entries = [];
    try {
      entries = await fs.readdir(legacyDir, { withFileTypes: true });
    } catch (error) {
      if (error && error.code === "ENOENT") {
        legacyFactsMigrated = true;
        return { migrated: 0 };
      }
      throw error;
    }
    const files = entries.filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".md")).map((e) => e.name);
    if (!files.length) {
      legacyFactsMigrated = true;
      return { migrated: 0 };
    }

    let migrated = 0;
    for (const fileName of files) {
      const absolute = path.join(legacyDir, fileName);
      const raw = await fs.readFile(absolute, "utf-8");
      const { frontmatter, body } = parseFrontmatter(raw);
      if (!String(body || "").trim() && !frontmatter["awn-name"]) continue;
      const store = createAwnDataRecord(agentRoot, projectRoot, {
        store: FACTS_STORE_REL,
        name: frontmatter["awn-name"] || fileName,
        body: body || String(frontmatter["awn-name"] || "")
      });
      const createdMeta = store?.__awnLastCreatedRecord;
      const records = (store?.records || []).filter((r) => !r.isSection);
      const created = createdMeta?.id
        ? records.find((r) => r.id === createdMeta.id)
        : records[records.length - 1];
      if (created?.id) {
        const patch = [
          buildFactPropertiesPatch({
            body,
            kind: frontmatter["awn-fact-kind"],
            source: frontmatter["awn-source"],
            tags: frontmatter["awn-tags"],
            name: frontmatter["awn-name"],
            sourceRef: frontmatter["awn-source-ref"],
            supersedes: frontmatter["awn-supersedes"]
          }),
          frontmatter["awn-create"] ? `awn-create: ${formatYamlScalar(frontmatter["awn-create"])}` : ""
        ]
          .filter(Boolean)
          .join("\n");
        writeAwnDataRecordProperties(agentRoot, projectRoot, FACTS_STORE_REL, created.id, patch);
        const rel = workspaceRelFromStoreRecord(created.relPath);
        if (typeof onFactWritten === "function") onFactWritten(rel);
      }
      await fs.unlink(absolute);
      migrated += 1;
    }
    legacyFactsMigrated = true;
    return { migrated };
  }

  async function collectFactItems() {
    ensureFactsStore();
    await migrateLegacyFactsIfNeeded();
    const { agentRoot, projectRoot } = agentContext();
    const payload = getAwnDataPayload(agentRoot, projectRoot, FACTS_STORE_REL);
    const records = (payload.store?.records || []).filter((item) => !item.isSection);
    const items = records.map(mapStoreRecordToFact);
    items.sort((a, b) => String(b.created || b.path).localeCompare(String(a.created || a.path), "en"));
    return items;
  }

  async function createWorkspaceFact(options = {}) {
    const body = String(options.body || "").trim();
    if (!body) throw new Error("body is required");

    const kind = String(options.kind || "fact").trim().toLowerCase();
    if (!FACT_KINDS.has(kind)) {
      throw new Error(`kind must be one of: ${[...FACT_KINDS].join(", ")}`);
    }

    const source = String(options.source || "manual").trim().toLowerCase();
    if (!FACT_SOURCES.has(source)) {
      throw new Error(`source must be one of: ${[...FACT_SOURCES].join(", ")}`);
    }

    const tags = parseTagsParam(options.tags);
    ensureFactsStore();
    const { agentRoot, projectRoot } = agentContext();

    const store = createAwnDataRecord(agentRoot, projectRoot, {
      store: FACTS_STORE_REL,
      name: options.name || body.slice(0, 120),
      body
    });

    const createdMeta = store?.__awnLastCreatedRecord;
    const records = (store?.records || []).filter((r) => !r.isSection);
    const created = createdMeta?.id ? records.find((r) => r.id === createdMeta.id) : null;
    if (!created?.id) throw new Error("Failed to create fact record");

    writeAwnDataRecordProperties(
      agentRoot,
      projectRoot,
      FACTS_STORE_REL,
      created.id,
      buildFactPropertiesPatch({ ...options, body, kind, source, tags })
    );

    const relPath = workspaceRelFromStoreRecord(created.relPath);
    if (typeof onFactWritten === "function") {
      onFactWritten(relPath);
    }

    const awnId = String(createdMeta?.awnId || created.frontmatter?.["awn-id"] || "").trim();

    return {
      ok: true,
      path: relPath,
      record: created.id,
      awnId: awnId || null,
      kind,
      source,
      tags,
      body,
      store: FACTS_STORE_REL,
      hint: `Fact created in ${FACTS_DIR}/. Indexed via workspace search after sync.`
    };
  }

  async function updateWorkspaceFact(options = {}) {
    const recordRef = String(options.record || options.id || options.path || "").trim();
    if (!recordRef) throw new Error("record is required");

    ensureFactsStore();
    const { agentRoot, projectRoot } = agentContext();
    const payload = getAwnDataPayload(agentRoot, projectRoot, FACTS_STORE_REL);
    const records = payload.store?.records || [];
    const hit =
      records.find((r) => r.id === recordRef) ||
      records.find((r) => workspaceRelFromStoreRecord(r.relPath) === normalizeRelPath(recordRef)) ||
      records.find((r) => String(r.relPath || "").endsWith(`/${recordRef}.md`));

    if (!hit?.id) throw new Error("Fact record not found");

    if (options.body !== undefined) {
      writeAwnDataRecordBody(agentRoot, projectRoot, FACTS_STORE_REL, hit.id, String(options.body ?? ""));
    }

    const patchParts = [];
    if (options.name !== undefined) patchParts.push(`awn-name: ${formatYamlScalar(options.name)}`);
    if (options.kind !== undefined) {
      const kind = String(options.kind || "fact").trim().toLowerCase();
      if (!FACT_KINDS.has(kind)) {
        throw new Error(`kind must be one of: ${[...FACT_KINDS].join(", ")}`);
      }
      patchParts.push(`awn-fact-kind: ${formatYamlScalar(kind)}`);
    }
    if (options.source !== undefined) {
      const source = String(options.source || "manual").trim().toLowerCase();
      if (!FACT_SOURCES.has(source)) {
        throw new Error(`source must be one of: ${[...FACT_SOURCES].join(", ")}`);
      }
      patchParts.push(`awn-source: ${formatYamlScalar(source)}`);
    }
    if (options.tags !== undefined) {
      const tags = parseTagsParam(options.tags);
      patchParts.push(
        tags.length
          ? `awn-tags: [${tags.map((tag) => formatYamlScalar(tag)).join(", ")}]`
          : "awn-tags: []"
      );
    }
    if (options.sourceRef !== undefined) {
      patchParts.push(`awn-source-ref: ${formatYamlScalar(options.sourceRef)}`);
    }
    if (options.supersedes !== undefined) {
      patchParts.push(`awn-supersedes: ${formatYamlScalar(options.supersedes)}`);
    }

    if (patchParts.length) {
      writeAwnDataRecordProperties(agentRoot, projectRoot, FACTS_STORE_REL, hit.id, patchParts.join("\n"));
    }

    const relPath = workspaceRelFromStoreRecord(hit.relPath);
    if (typeof onFactWritten === "function") {
      onFactWritten(relPath);
    }

    const items = await collectFactItems();
    const updated = items.find((item) => item.record === hit.id) || items.find((item) => item.path === relPath);

    return {
      ok: true,
      path: relPath,
      record: hit.id,
      fact: updated || null,
      hint: "Fact updated."
    };
  }

  async function listWorkspaceFacts(options = {}) {
    const limit = Math.max(1, Math.min(200, Number(options.limit) || 30));
    const kind = String(options.kind || "").trim().toLowerCase();
    const tags = parseTagsParam(options.tags);

    let items = await collectFactItems();
    if (kind) items = items.filter((item) => String(item.kind || "").toLowerCase() === kind);
    if (tags.length) items = items.filter((item) => matchesTags(item.tags, tags));

    const totalCount = items.length;
    items = items.slice(0, limit);

    return {
      version: 1,
      folder: FACTS_DIR,
      store: FACTS_STORE_REL,
      exists: totalCount > 0,
      totalCount,
      limit,
      kind: kind || null,
      tags,
      facts: items.map((item) => ({
        path: item.path,
        record: item.record,
        awnId: item.awnId || null,
        name: item.name,
        kind: item.kind,
        source: item.source,
        tags: item.tags,
        created: item.created,
        body: item.body
      }))
    };
  }

  async function searchWorkspaceFacts(options = {}) {
    const query = String(options.query || options.q || "").trim();
    if (query.length < 2) throw new Error("query must be at least 2 characters");

    await collectFactItems();

    const kind = String(options.kind || "").trim().toLowerCase();
    const tags = parseTagsParam(options.tags);
    const limit = Math.max(1, Math.min(50, Number(options.limit) || 12));
    const where = [];

    if (kind) {
      where.push({ field: "awn-fact-kind", eq: kind });
    }
    if (tags.length === 1) {
      where.push({ field: "awn-tags", contains: tags[0] });
    }

    const hybrid = await searchWorkspaceHybrid({
      query,
      pathPrefix: FACTS_DIR,
      where,
      limit,
      includeSnippets: options.includeSnippets !== false
    });

    let facts = (hybrid.hits || []).map((hit) => ({
      path: hit.path,
      title: hit.title,
      score: hit.score,
      sources: hit.sources,
      snippet: hit.snippet
    }));

    if (tags.length > 1) {
      const listed = await collectFactItems();
      const allowed = new Set(listed.filter((item) => matchesTags(item.tags, tags)).map((item) => item.path));
      facts = facts.filter((item) => allowed.has(item.path));
    }

    return {
      version: 1,
      model: "workspace-facts-search",
      hint: `Semantic + fulltext search scoped to ${FACTS_DIR}/.`,
      query,
      kind: kind || null,
      tags,
      hitCount: facts.length,
      facts
    };
  }

  async function getWorkspaceFactsStats() {
    const items = await collectFactItems();
    const kinds = {};
    for (const item of items) {
      const key = String(item.kind || "fact").toLowerCase();
      kinds[key] = (kinds[key] || 0) + 1;
    }
    return {
      folder: FACTS_DIR,
      store: FACTS_STORE_REL,
      exists: items.length > 0,
      totalCount: items.length,
      kinds
    };
  }

  return {
    FACTS_DIR,
    FACTS_STORE_REL,
    LEGACY_FACTS_DIR,
    createWorkspaceFact,
    updateWorkspaceFact,
    retainWorkspaceFact: createWorkspaceFact,
    listWorkspaceFacts,
    searchWorkspaceFacts,
    recallWorkspaceFacts: searchWorkspaceFacts,
    getWorkspaceFactsStats
  };
}

module.exports = {
  FACTS_DIR,
  FACTS_STORE_REL,
  GLOSSARY_STORE_REL,
  LEGACY_FACTS_DIR,
  FACT_KINDS,
  FACT_SOURCES,
  createWorkspaceFactsService
};
