const {
  AWN_DATABASE_DIR,
  REFERENCE_STORE_REL,
  ensureContentsGroupScaffold,
  createAwnDataRecord,
  getAwnDataPayload,
  writeAwnDataRecordBody,
  writeAwnDataRecordProperties
} = require("../awn/awn-data-loader");

const REFERENCE_DIR = `${AWN_DATABASE_DIR}/${REFERENCE_STORE_REL}`;

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

function buildReferencePropertiesPatch(options = {}) {
  const title = String(options.title || options.name || "").trim();
  const tags = parseTagsParam(options.tags);
  const lines = [];
  lines.push(`awn-name: ${formatYamlScalar(title || "Запись")}`);
  if (title) lines.push(`awn-reference-title: ${formatYamlScalar(title)}`);
  if (tags.length) {
    lines.push(`awn-tags: [${tags.map((tag) => formatYamlScalar(tag)).join(", ")}]`);
  }
  if (options.sourceRef) lines.push(`awn-source-ref: ${formatYamlScalar(options.sourceRef)}`);
  return lines.join("\n");
}

function mapStoreRecordToReference(record) {
  const fm = record.frontmatter || {};
  const relPath = workspaceRelFromStoreRecord(record.relPath);
  const awnId = String(fm["awn-id"] || "").trim();
  return {
    path: relPath,
    record: String(record.id || "").trim(),
    awnId: awnId || null,
    title: fm["awn-reference-title"] || fm["awn-name"] || record.title || record.id,
    parent: fm["awn-parent-id"] || fm.parent || "",
    tags: parseTagsParam(fm["awn-tags"]),
    sourceRef: fm["awn-source-ref"] || "",
    created: fm["awn-create"] || "",
    updated: fm["awn-update"] || "",
    body: String(record.body || "").trim(),
    isSection: Boolean(record.isSection)
  };
}

function createWorkspaceReferenceService(deps) {
  const { getAgentRoot, getProjectRoot, searchWorkspaceHybrid, onReferenceWritten } = deps;

  function agentContext() {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    const projectRoot = typeof getProjectRoot === "function" ? getProjectRoot() : process.cwd();
    return { agentRoot, projectRoot };
  }

  function ensureReferenceStore() {
    const { agentRoot, projectRoot } = agentContext();
    ensureContentsGroupScaffold(agentRoot, projectRoot, { preset: "reference" });
  }

  async function collectReferenceItems() {
    ensureReferenceStore();
    const { agentRoot, projectRoot } = agentContext();
    const payload = getAwnDataPayload(agentRoot, projectRoot, REFERENCE_STORE_REL);
    const records = (payload.store?.records || []).filter((item) => !item.isSection);
    const items = records.map(mapStoreRecordToReference);
    items.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "ru"));
    return items;
  }

  async function createReferenceEntry(options = {}) {
    const title = String(options.title || options.name || "").trim();
    const body = String(options.body || options.content || "").trim();
    if (!title) throw new Error("title is required");
    if (!body) throw new Error("body is required");

    ensureReferenceStore();
    const { agentRoot, projectRoot } = agentContext();

    const parent = String(options.parent || options.section || "").trim();

    const store = createAwnDataRecord(agentRoot, projectRoot, {
      store: REFERENCE_STORE_REL,
      name: title,
      title,
      body,
      ...(parent ? { parent } : {})
    });

    const createdMeta = store?.__awnLastCreatedRecord;
    const records = (store?.records || []).filter((r) => !r.isSection);
    const created = createdMeta?.id ? records.find((r) => r.id === createdMeta.id) : null;
    if (!created?.id) throw new Error("Failed to create reference record");

    writeAwnDataRecordProperties(
      agentRoot,
      projectRoot,
      REFERENCE_STORE_REL,
      created.id,
      buildReferencePropertiesPatch(options)
    );

    const relPath = workspaceRelFromStoreRecord(created.relPath);
    if (typeof onReferenceWritten === "function") {
      onReferenceWritten(relPath);
    }

    const awnId = String(createdMeta?.awnId || created.frontmatter?.["awn-id"] || "").trim();

    return {
      ok: true,
      path: relPath,
      record: created.id,
      awnId: awnId || null,
      title,
      body,
      parent: parent || null,
      store: REFERENCE_STORE_REL,
      hint: `Reference entry created in ${REFERENCE_DIR}/.`
    };
  }

  async function updateReferenceEntry(options = {}) {
    const recordRef = String(options.record || options.id || options.path || "").trim();
    if (!recordRef) throw new Error("record is required");

    ensureReferenceStore();
    const { agentRoot, projectRoot } = agentContext();
    const payload = getAwnDataPayload(agentRoot, projectRoot, REFERENCE_STORE_REL);
    const records = payload.store?.records || [];
    const hit =
      records.find((r) => r.id === recordRef) ||
      records.find((r) => workspaceRelFromStoreRecord(r.relPath) === normalizeRelPath(recordRef)) ||
      records.find((r) => String(r.relPath || "").endsWith(`/${recordRef}.md`));

    if (!hit?.id) throw new Error("Reference record not found");
    if (hit.isSection) throw new Error("Cannot update section via reference entry API");

    if (options.body !== undefined || options.content !== undefined) {
      writeAwnDataRecordBody(
        agentRoot,
        projectRoot,
        REFERENCE_STORE_REL,
        hit.id,
        String(options.body ?? options.content ?? "")
      );
    }

    const patchParts = [];
    if (options.title !== undefined || options.name !== undefined) {
      patchParts.push(
        ...buildReferencePropertiesPatch({ ...options, title: options.title || options.name }).split("\n")
      );
    }
    if (options.tags !== undefined) {
      const tags = parseTagsParam(options.tags);
      patchParts.push(
        tags.length ? `awn-tags: [${tags.map((tag) => formatYamlScalar(tag)).join(", ")}]` : "awn-tags: []"
      );
    }
    if (options.sourceRef !== undefined) {
      patchParts.push(`awn-source-ref: ${formatYamlScalar(options.sourceRef)}`);
    }

    if (patchParts.length) {
      writeAwnDataRecordProperties(agentRoot, projectRoot, REFERENCE_STORE_REL, hit.id, patchParts.join("\n"));
    }

    const relPath = workspaceRelFromStoreRecord(hit.relPath);
    if (typeof onReferenceWritten === "function") {
      onReferenceWritten(relPath);
    }

    return {
      ok: true,
      path: relPath,
      record: hit.id,
      hint: "Reference entry updated."
    };
  }

  async function listReferenceEntries(options = {}) {
    const limit = Math.max(1, Math.min(200, Number(options.limit) || 50));
    const prefix = String(options.prefix || "").trim().toLowerCase();
    const tags = parseTagsParam(options.tags);

    let items = await collectReferenceItems();
    if (prefix) {
      items = items.filter((item) => String(item.title || "").toLowerCase().startsWith(prefix));
    }
    if (tags.length) {
      items = items.filter((item) => {
        const haystack = new Set((item.tags || []).map((t) => String(t).toLowerCase()));
        return tags.every((tag) => haystack.has(String(tag).toLowerCase()));
      });
    }

    const totalCount = items.length;
    items = items.slice(0, limit);

    return {
      version: 1,
      folder: REFERENCE_DIR,
      store: REFERENCE_STORE_REL,
      exists: totalCount > 0,
      totalCount,
      limit,
      prefix: prefix || null,
      tags,
      entries: items
    };
  }

  async function searchReferenceEntries(options = {}) {
    const query = String(options.query || options.q || "").trim();
    if (query.length < 2) throw new Error("query must be at least 2 characters");

    await collectReferenceItems();

    const limit = Math.max(1, Math.min(50, Number(options.limit) || 12));
    const hybrid = await searchWorkspaceHybrid({
      query,
      pathPrefix: REFERENCE_DIR,
      limit,
      includeSnippets: options.includeSnippets !== false
    });

    const entries = (hybrid.hits || []).map((hit) => ({
      path: hit.path,
      title: hit.title,
      score: hit.score,
      sources: hit.sources,
      snippet: hit.snippet
    }));

    return {
      version: 1,
      model: "workspace-reference-search",
      hint: `Semantic + fulltext search scoped to ${REFERENCE_DIR}/.`,
      query,
      hitCount: entries.length,
      entries
    };
  }

  return {
    REFERENCE_DIR,
    REFERENCE_STORE_REL,
    createReferenceEntry,
    updateReferenceEntry,
    listReferenceEntries,
    searchReferenceEntries
  };
}

module.exports = {
  REFERENCE_DIR,
  REFERENCE_STORE_REL,
  createWorkspaceReferenceService
};
