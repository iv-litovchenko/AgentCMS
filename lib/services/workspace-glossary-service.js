const {
  AWN_DATABASE_DIR,
  GLOSSARY_STORE_REL,
  ensureContentsGroupScaffold,
  createAwnDataRecord,
  getAwnDataPayload,
  writeAwnDataRecordBody,
  writeAwnDataRecordProperties
} = require("../awn/awn-data-loader");

const GLOSSARY_DIR = `${AWN_DATABASE_DIR}/${GLOSSARY_STORE_REL}`;

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

function buildTermPropertiesPatch(options = {}) {
  const term = String(options.term || options.name || "").trim();
  const aliases = parseTagsParam(options.aliases);
  const tags = parseTagsParam(options.tags);
  const lines = [];
  lines.push(`awn-name: ${formatYamlScalar(term || "Термин")}`);
  if (term) lines.push(`awn-glossary-term: ${formatYamlScalar(term)}`);
  if (aliases.length) {
    lines.push(`awn-glossary-aliases: [${aliases.map((a) => formatYamlScalar(a)).join(", ")}]`);
  }
  if (tags.length) {
    lines.push(`awn-tags: [${tags.map((tag) => formatYamlScalar(tag)).join(", ")}]`);
  }
  if (options.sourceRef) lines.push(`awn-source-ref: ${formatYamlScalar(options.sourceRef)}`);
  if (options.marker) lines.push(`awn-glossary-marker: ${formatYamlScalar(options.marker)}`);
  return lines.join("\n");
}

function mapStoreRecordToTerm(record) {
  const fm = record.frontmatter || {};
  const relPath = workspaceRelFromStoreRecord(record.relPath);
  return {
    path: relPath,
    record: String(record.id || "").trim(),
    term: fm["awn-glossary-term"] || fm["awn-name"] || record.title || record.id,
    aliases: parseTagsParam(fm["awn-glossary-aliases"]),
    tags: parseTagsParam(fm["awn-tags"]),
    marker: fm["awn-glossary-marker"] || "",
    sourceRef: fm["awn-source-ref"] || "",
    created: fm["awn-create"] || "",
    updated: fm["awn-update"] || "",
    body: String(record.body || "").trim()
  };
}

function createWorkspaceGlossaryService(deps) {
  const { getAgentRoot, getProjectRoot, searchWorkspaceHybrid, onTermWritten } = deps;

  function agentContext() {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    const projectRoot = typeof getProjectRoot === "function" ? getProjectRoot() : process.cwd();
    return { agentRoot, projectRoot };
  }

  function ensureGlossaryStore() {
    const { agentRoot, projectRoot } = agentContext();
    ensureContentsGroupScaffold(agentRoot, projectRoot, { preset: "glossary" });
  }

  async function collectTermItems() {
    ensureGlossaryStore();
    const { agentRoot, projectRoot } = agentContext();
    const payload = getAwnDataPayload(agentRoot, projectRoot, GLOSSARY_STORE_REL);
    const records = (payload.store?.records || []).filter((item) => !item.isSection);
    const items = records.map(mapStoreRecordToTerm);
    items.sort((a, b) => String(a.term || "").localeCompare(String(b.term || ""), "ru"));
    return items;
  }

  async function createGlossaryTerm(options = {}) {
    const term = String(options.term || options.name || "").trim();
    const definition = String(options.definition || options.body || "").trim();
    if (!term) throw new Error("term is required");
    if (!definition) throw new Error("definition is required");

    ensureGlossaryStore();
    const { agentRoot, projectRoot } = agentContext();

    const store = createAwnDataRecord(agentRoot, projectRoot, {
      store: GLOSSARY_STORE_REL,
      name: term,
      body: definition
    });

    const records = (store?.records || []).filter((r) => !r.isSection);
    const created = records[records.length - 1];
    if (!created?.id) throw new Error("Failed to create glossary record");

    writeAwnDataRecordProperties(
      agentRoot,
      projectRoot,
      GLOSSARY_STORE_REL,
      created.id,
      buildTermPropertiesPatch(options)
    );

    const relPath = workspaceRelFromStoreRecord(created.relPath);
    if (typeof onTermWritten === "function") {
      onTermWritten(relPath);
    }

    return {
      ok: true,
      path: relPath,
      record: created.id,
      term,
      body: definition,
      store: GLOSSARY_STORE_REL,
      hint: `Term created in ${GLOSSARY_DIR}/.`
    };
  }

  async function updateGlossaryTerm(options = {}) {
    const recordRef = String(options.record || options.id || options.path || "").trim();
    if (!recordRef) throw new Error("record is required");

    ensureGlossaryStore();
    const { agentRoot, projectRoot } = agentContext();
    const payload = getAwnDataPayload(agentRoot, projectRoot, GLOSSARY_STORE_REL);
    const records = payload.store?.records || [];
    const hit =
      records.find((r) => r.id === recordRef) ||
      records.find((r) => workspaceRelFromStoreRecord(r.relPath) === normalizeRelPath(recordRef)) ||
      records.find((r) => String(r.relPath || "").endsWith(`/${recordRef}.md`));

    if (!hit?.id) throw new Error("Glossary record not found");

    if (options.definition !== undefined || options.body !== undefined) {
      writeAwnDataRecordBody(
        agentRoot,
        projectRoot,
        GLOSSARY_STORE_REL,
        hit.id,
        String(options.definition ?? options.body ?? "")
      );
    }

    const patchParts = [];
    if (options.term !== undefined || options.name !== undefined) {
      patchParts.push(...buildTermPropertiesPatch({ ...options, term: options.term || options.name }).split("\n"));
    }
    if (options.aliases !== undefined) {
      const aliases = parseTagsParam(options.aliases);
      patchParts.push(
        aliases.length
          ? `awn-glossary-aliases: [${aliases.map((a) => formatYamlScalar(a)).join(", ")}]`
          : "awn-glossary-aliases: []"
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
    if (options.marker !== undefined) {
      patchParts.push(`awn-glossary-marker: ${formatYamlScalar(options.marker)}`);
    }

    if (patchParts.length) {
      writeAwnDataRecordProperties(agentRoot, projectRoot, GLOSSARY_STORE_REL, hit.id, patchParts.join("\n"));
    }

    const relPath = workspaceRelFromStoreRecord(hit.relPath);
    if (typeof onTermWritten === "function") {
      onTermWritten(relPath);
    }

    return {
      ok: true,
      path: relPath,
      record: hit.id,
      hint: "Glossary term updated."
    };
  }

  async function listGlossaryTerms(options = {}) {
    const limit = Math.max(1, Math.min(200, Number(options.limit) || 50));
    const prefix = String(options.prefix || options.letter || "").trim().toLowerCase();
    const tags = parseTagsParam(options.tags);

    let items = await collectTermItems();
    if (prefix) {
      items = items.filter((item) => String(item.term || "").toLowerCase().startsWith(prefix));
    }
    if (tags.length) {
      items = items.filter((item) => {
        const haystack = new Set([...(item.tags || []), ...(item.aliases || [])].map((t) => String(t).toLowerCase()));
        return tags.every((tag) => haystack.has(String(tag).toLowerCase()));
      });
    }

    const totalCount = items.length;
    items = items.slice(0, limit);

    return {
      version: 1,
      folder: GLOSSARY_DIR,
      store: GLOSSARY_STORE_REL,
      exists: totalCount > 0,
      totalCount,
      limit,
      prefix: prefix || null,
      tags,
      terms: items
    };
  }

  async function searchGlossaryTerms(options = {}) {
    const query = String(options.query || options.q || "").trim();
    if (query.length < 2) throw new Error("query must be at least 2 characters");

    await collectTermItems();

    const limit = Math.max(1, Math.min(50, Number(options.limit) || 12));
    const hybrid = await searchWorkspaceHybrid({
      query,
      pathPrefix: GLOSSARY_DIR,
      limit,
      includeSnippets: options.includeSnippets !== false
    });

    const terms = (hybrid.hits || []).map((hit) => ({
      path: hit.path,
      title: hit.title,
      score: hit.score,
      sources: hit.sources,
      snippet: hit.snippet
    }));

    return {
      version: 1,
      model: "workspace-glossary-search",
      hint: `Semantic + fulltext search scoped to ${GLOSSARY_DIR}/.`,
      query,
      hitCount: terms.length,
      terms
    };
  }

  return {
    GLOSSARY_DIR,
    GLOSSARY_STORE_REL,
    createGlossaryTerm,
    updateGlossaryTerm,
    listGlossaryTerms,
    searchGlossaryTerms
  };
}

module.exports = {
  GLOSSARY_DIR,
  GLOSSARY_STORE_REL,
  createWorkspaceGlossaryService
};
