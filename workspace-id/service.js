const fs = require("fs/promises");
const path = require("path");
const { readCounter, allocateNextId, bumpCounterFloor, COUNTER_FILE } = require("./store");

const MODEL = "workspace-id-registry-v1";

function normalizeRelPath(relPath) {
  return String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
}

function isIndexablePath(relPath) {
  const lower = relPath.toLowerCase();
  return (
    lower.endsWith(".md") ||
    lower.endsWith(".sidecar.md") ||
    lower.endsWith(".yml") ||
    lower.endsWith(".yaml")
  );
}

function splitFrontmatter(raw = "") {
  const text = String(raw || "");
  if (!text.startsWith("---")) return { frontmatter: "", body: text };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { frontmatter: "", body: text };
  return {
    frontmatter: text.slice(3, end).replace(/^\n/, ""),
    body: text.slice(end + 4).replace(/^\n/, "")
  };
}

function joinFrontmatter(frontmatter, body) {
  const fm = String(frontmatter || "").trimEnd();
  const content = String(body ?? "");
  if (!fm) return content;
  return `---\n${fm}\n---\n${content ? `\n${content}` : ""}`;
}

function getYamlScalar(frontmatter, key) {
  const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
  const match = String(frontmatter || "").match(re);
  if (!match) return "";
  let raw = match[1].trim();
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    raw = raw.slice(1, -1);
  }
  return raw.trim();
}

function upsertYamlScalar(frontmatter, key, value) {
  const lines = String(frontmatter || "").split(/\r?\n/);
  const scalar = String(value ?? "");
  const formatted = /[\s:#[\]{}|>&*!?,@`"']/.test(scalar) ? `"${scalar.replace(/"/g, '\\"')}"` : scalar;
  const re = new RegExp(`^${key}:\\s*`);
  let replaced = false;
  const next = lines.map((line) => {
    if (re.test(line)) {
      replaced = true;
      return `${key}: ${formatted}`;
    }
    return line;
  });
  if (!replaced) next.push(`${key}: ${formatted}`);
  return next.join("\n").replace(/\n+$/, "");
}

function parseAwnId(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0 || !Number.isInteger(num)) return null;
  return num;
}

function createWorkspaceIdService(deps) {
  const { getAgentRoot, collectSearchableFiles, resolvePathAbsolute } = deps;

  async function scanIdMap(agentRoot) {
    const relFiles = await collectSearchableFiles(agentRoot);
    const byId = new Map();

    for (const relPath of relFiles) {
      if (!isIndexablePath(relPath)) continue;
      const absolute = resolvePathAbsolute(relPath);
      if (!absolute) continue;
      let content = "";
      try {
        content = await fs.readFile(absolute, "utf-8");
      } catch {
        continue;
      }
      const { frontmatter } = splitFrontmatter(content);
      const id = parseAwnId(getYamlScalar(frontmatter, "awn-id"));
      if (!id) continue;
      const normalized = normalizeRelPath(relPath);
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(normalized);
    }

    const map = new Map();
    const duplicates = [];
    let assignedCount = 0;

    for (const [id, paths] of byId) {
      assignedCount += paths.length;
      map.set(id, paths[0]);
      if (paths.length > 1) {
        duplicates.push({ id, paths: [...paths], count: paths.length });
      }
    }

    return {
      map,
      byId,
      duplicates,
      assignedCount,
      uniqueIdCount: byId.size,
      fileCount: relFiles.length
    };
  }

  async function getStatus() {
    const agentRoot = getAgentRoot();
    if (!agentRoot) return { ready: false, reason: "Agent not selected" };
    const counter = readCounter(agentRoot);
    const { map, duplicates, assignedCount, uniqueIdCount } = await scanIdMap(agentRoot);
    return {
      ready: true,
      model: MODEL,
      counterFile: COUNTER_FILE,
      nextId: counter.next,
      issued: counter.issued,
      assignedCount,
      uniqueIdCount,
      duplicateCount: duplicates.length,
      duplicateRecordCount: Math.max(assignedCount - uniqueIdCount, 0),
      duplicates: duplicates.slice(0, 20),
      allIdsUnique: duplicates.length === 0,
      updatedAt: counter.updatedAt
    };
  }

  async function assignIdToPath(relPath, { force = false, absolutePath = null } = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    const normalized = normalizeRelPath(relPath);
    if (!normalized) throw new Error("path is required");

    const absolute = absolutePath || resolvePathAbsolute(normalized);
    if (!absolute) throw new Error("Path not found");

    try {
      const stat = await fs.stat(absolute);
      if (!stat.isFile()) throw new Error("Path not found");
    } catch (error) {
      if (error?.code === "ENOENT" || error?.message === "Path not found") {
        throw new Error("Path not found");
      }
      throw error;
    }

    let content = await fs.readFile(absolute, "utf-8");
    const { frontmatter, body } = splitFrontmatter(content);
    const existing = parseAwnId(getYamlScalar(frontmatter, "awn-id"));
    if (existing && !force) {
      return { ok: true, assigned: false, id: existing, path: normalized, hint: "awn-id already set" };
    }

    const id = allocateNextId(agentRoot);
    const nextFrontmatter = upsertYamlScalar(frontmatter, "awn-id", String(id));
    content = joinFrontmatter(nextFrontmatter, body);
    await fs.writeFile(absolute, content, "utf-8");

    return { ok: true, assigned: true, id, path: normalized };
  }

  async function assignIdOnCreateIfNeeded(relPath, frontmatter) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) return frontmatter;
    if (parseAwnId(getYamlScalar(frontmatter, "awn-id"))) return frontmatter;
    const id = allocateNextId(agentRoot);
    return upsertYamlScalar(frontmatter, "awn-id", String(id));
  }

  async function resolveId(idValue) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    const id = parseAwnId(idValue);
    if (!id) throw new Error("id must be a positive integer");

    const { map, byId, duplicates } = await scanIdMap(agentRoot);
    const paths = byId.get(id) || [];
    const pathValue = map.get(id) || null;
    return {
      ok: Boolean(pathValue),
      id,
      path: pathValue,
      paths,
      duplicate: paths.length > 1,
      duplicates: duplicates.filter((row) => row.id === id)
    };
  }

  async function catalog({ limit = 40, offset = 0, q = "" } = {}) {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    const counter = readCounter(agentRoot);
    const { map } = await scanIdMap(agentRoot);
    const needle = String(q || "").trim().toLowerCase();

    let rows = [...map.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([id, pathValue]) => ({
        id,
        path: pathValue,
        title: path.posix.basename(pathValue)
      }));

    if (needle) {
      rows = rows.filter(
        (row) =>
          String(row.id).includes(needle) ||
          row.path.toLowerCase().includes(needle) ||
          row.title.toLowerCase().includes(needle)
      );
    }

    const total = rows.length;
    const start = Math.max(Number(offset) || 0, 0);
    const take = Math.min(Math.max(Number(limit) || 40, 1), 200);

    return {
      mode: "workspace-id-catalog",
      ready: true,
      model: MODEL,
      counterFile: COUNTER_FILE,
      nextId: counter.next,
      total,
      offset: start,
      limit: take,
      items: rows.slice(start, start + take)
    };
  }

  async function syncCounterWithAssigned() {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    const { map } = await scanIdMap(agentRoot);
    let maxId = 0;
    for (const id of map.keys()) {
      if (id > maxId) maxId = id;
    }
    if (maxId > 0) {
      bumpCounterFloor(agentRoot, maxId + 1);
    }
    return getStatus();
  }

  return {
    getStatus,
    assignIdToPath,
    assignIdOnCreateIfNeeded,
    resolveId,
    catalog,
    syncCounterWithAssigned,
    parseAwnId
  };
}

module.exports = { createWorkspaceIdService, MODEL, parseAwnId };
