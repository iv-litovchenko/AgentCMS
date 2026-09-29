const fs = require("fs/promises");
const path = require("path");

const FACTS_DIR = "awn-facts";

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

function slugify(text, maxLen = 48) {
  const slug = String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0400-\u04ff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLen);
  return slug || "fact";
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

function buildFactFileName(body, createdAt = new Date()) {
  const stamp = createdAt.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${stamp}-${slugify(body)}.md`;
}

function buildFactMarkdown({
  body,
  kind = "fact",
  source = "manual",
  tags = [],
  name = "",
  sourceRef = "",
  supersedes = "",
  createdAt = new Date()
}) {
  const createdIso = createdAt.toISOString();
  const title = String(name || body || "Факт").trim().slice(0, 120);
  const lines = [
    "---",
    "awn-type: awn.content.fact",
    `awn-name: ${formatYamlScalar(title)}`,
    `awn-fact-kind: ${formatYamlScalar(kind)}`,
    `awn-source: ${formatYamlScalar(source)}`,
    `awn-create: ${createdIso}`,
    `awn-update: ${createdIso}`,
    "awn-version: 1"
  ];
  if (tags.length) {
    lines.push(`awn-tags: [${tags.map((tag) => formatYamlScalar(tag)).join(", ")}]`);
  }
  if (sourceRef) lines.push(`awn-source-ref: ${formatYamlScalar(sourceRef)}`);
  if (supersedes) lines.push(`awn-supersedes: ${formatYamlScalar(supersedes)}`);
  lines.push("---", "", String(body || "").trim(), "");
  return lines.join("\n");
}

function createWorkspaceFactsService(deps) {
  const { getAgentRoot, searchWorkspaceHybrid, onFactWritten } = deps;

  function factsDirAbsolute() {
    const root = getAgentRoot();
    if (!root) throw new Error("Agent not selected");
    return path.join(root, FACTS_DIR);
  }

  async function ensureFactsDir() {
    const dir = factsDirAbsolute();
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  async function collectFactFiles() {
    const dir = factsDirAbsolute();
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      if (error && error.code === "ENOENT") return [];
      throw error;
    }

    const files = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md"))
      .map((entry) => entry.name)
      .sort((a, b) => b.localeCompare(a, "en"));

    const items = [];
    for (const name of files) {
      const relPath = `${FACTS_DIR}/${name}`;
      const absolute = path.join(dir, name);
      let content = "";
      try {
        content = await fs.readFile(absolute, "utf-8");
      } catch {
        continue;
      }
      const { frontmatter, body } = parseFrontmatter(content);
      items.push({
        path: relPath,
        fileName: name,
        name: frontmatter["awn-name"] || name,
        kind: frontmatter["awn-fact-kind"] || "fact",
        source: frontmatter["awn-source"] || "manual",
        tags: Array.isArray(frontmatter["awn-tags"]) ? frontmatter["awn-tags"] : [],
        sourceRef: frontmatter["awn-source-ref"] || "",
        supersedes: frontmatter["awn-supersedes"] || "",
        created: frontmatter["awn-create"] || "",
        updated: frontmatter["awn-update"] || "",
        body
      });
    }
    return items;
  }

  async function retainWorkspaceFact(options = {}) {
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
    const dir = await ensureFactsDir();
    const createdAt = new Date();
    const fileName = buildFactFileName(body, createdAt);
    const relPath = `${FACTS_DIR}/${fileName}`;
    const absolute = path.join(dir, fileName);
    const content = buildFactMarkdown({
      body,
      kind,
      source,
      tags,
      name: options.name,
      sourceRef: options.sourceRef,
      supersedes: options.supersedes,
      createdAt
    });

    await fs.writeFile(absolute, content, "utf-8");
    if (typeof onFactWritten === "function") {
      onFactWritten(relPath);
    }

    return {
      ok: true,
      path: relPath,
      fileName,
      kind,
      source,
      tags,
      body,
      hint: "Fact retained in awn-facts/. Indexed via workspace search after sync."
    };
  }

  async function listWorkspaceFacts(options = {}) {
    const limit = Math.max(1, Math.min(200, Number(options.limit) || 30));
    const kind = String(options.kind || "").trim().toLowerCase();
    const tags = parseTagsParam(options.tags);

    let items = await collectFactFiles();
    if (kind) items = items.filter((item) => String(item.kind || "").toLowerCase() === kind);
    if (tags.length) items = items.filter((item) => matchesTags(item.tags, tags));

    const totalCount = items.length;
    items = items.slice(0, limit);

    return {
      version: 1,
      folder: FACTS_DIR,
      exists: totalCount > 0,
      totalCount,
      limit,
      kind: kind || null,
      tags,
      facts: items.map((item) => ({
        path: item.path,
        name: item.name,
        kind: item.kind,
        source: item.source,
        tags: item.tags,
        created: item.created,
        body: item.body
      }))
    };
  }

  async function recallWorkspaceFacts(options = {}) {
    const query = String(options.query || options.q || "").trim();
    if (query.length < 2) throw new Error("query must be at least 2 characters");

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
      const listed = await collectFactFiles();
      const allowed = new Set(
        listed.filter((item) => matchesTags(item.tags, tags)).map((item) => item.path)
      );
      facts = facts.filter((item) => allowed.has(item.path));
    }

    return {
      version: 1,
      model: "workspace-facts-recall",
      hint: "Semantic + fulltext recall scoped to awn-facts/. Agent synthesizes answer from hits.",
      query,
      kind: kind || null,
      tags,
      hitCount: facts.length,
      facts
    };
  }

  async function getWorkspaceFactsStats() {
    const items = await collectFactFiles();
    const kinds = {};
    for (const item of items) {
      const key = String(item.kind || "fact").toLowerCase();
      kinds[key] = (kinds[key] || 0) + 1;
    }
    let exists = false;
    try {
      await fs.access(factsDirAbsolute());
      exists = true;
    } catch {
      exists = false;
    }
    return {
      folder: FACTS_DIR,
      exists,
      totalCount: items.length,
      kinds
    };
  }

  return {
    FACTS_DIR,
    retainWorkspaceFact,
    listWorkspaceFacts,
    recallWorkspaceFacts,
    getWorkspaceFactsStats
  };
}

module.exports = {
  FACTS_DIR,
  FACT_KINDS,
  FACT_SOURCES,
  createWorkspaceFactsService
};
