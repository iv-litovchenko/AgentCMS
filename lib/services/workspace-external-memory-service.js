const fs = require("fs/promises");
const path = require("path");
const {
  AWN_DATABASE_DIR,
  ensureExternalMemoryGroupScaffold,
  createAwnDataRecord,
  getAwnDataPayload,
  writeAwnDataRecordBody,
  writeAwnDataRecordProperties,
  getAwnDataRoot,
  getStoreAbsolutePath,
  SINGLETON_RECORD
} = require("../awn/awn-data-loader");
const {
  EXTERNAL_MEMORY_GROUP_REL,
  EXTERNAL_MEMORY_SYNC_STORE_REL,
  EXTERNAL_MEMORY_PROVIDER_SLUGS,
  normalizeExternalMemoryProvider,
  resolveExternalMemoryProviderStoreRel
} = require("../config/database-platform-paths");

const EXTERNAL_MEMORY_PROVIDERS = new Set(Object.keys(EXTERNAL_MEMORY_PROVIDER_SLUGS));

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
    let value = row[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    frontmatter[row[1]] = value;
  }
  return { frontmatter, body: match[2].trim() };
}

function mapStoreRecordToMemoryItem(record, provider) {
  const fm = record.frontmatter || record.properties || {};
  return {
    id: String(record.id || ""),
    path: workspaceRelFromStoreRecord(record.relPath),
    provider,
    name: fm["awn-name"] || record.name || "",
    externalId: fm["awn-external-id"] || "",
    created: fm["awn-create"] || "",
    updated: fm["awn-update"] || "",
    body: String(record.body || "").trim()
  };
}

function buildMemoryPropertiesPatch(options = {}) {
  const lines = [];
  if (options.externalId) lines.push(`awn-external-id: ${formatYamlScalar(options.externalId)}`);
  if (options.provider) lines.push(`awn-external-memory-provider: ${formatYamlScalar(options.provider)}`);
  return lines.join("\n");
}

function parseSyncStateBody(body) {
  const text = String(body || "").trim();
  if (!text) return { providers: {} };
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    /* fall through */
  }
  return { providers: {}, note: text.slice(0, 500) };
}

function formatSyncStateBody(state) {
  return `${JSON.stringify(state, null, 2)}\n`;
}

function createWorkspaceExternalMemoryService(deps) {
  const { getAgentRoot, getProjectRoot, onMemoryWritten } = deps;

  function agentContext() {
    const agentRoot = getAgentRoot();
    if (!agentRoot) throw new Error("Agent not selected");
    const projectRoot = typeof getProjectRoot === "function" ? getProjectRoot() : process.cwd();
    return { agentRoot, projectRoot };
  }

  function ensureStore() {
    const { agentRoot, projectRoot } = agentContext();
    ensureExternalMemoryGroupScaffold(agentRoot, projectRoot);
  }

  function resolveProviderStore(provider) {
    ensureStore();
    const key = normalizeExternalMemoryProvider(provider);
    if (!EXTERNAL_MEMORY_PROVIDERS.has(key)) {
      throw new Error(`provider must be one of: ${[...EXTERNAL_MEMORY_PROVIDERS].join(", ")}`);
    }
    return { provider: key, storeRel: resolveExternalMemoryProviderStoreRel(key) };
  }

  async function readSyncSingleton() {
    ensureStore();
    const { agentRoot, projectRoot } = agentContext();
    const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
    const storeAbs = getStoreAbsolutePath(dataRoot, EXTERNAL_MEMORY_SYNC_STORE_REL);
    if (!storeAbs) throw new Error("Sync store not found");
    const mainPath = path.join(storeAbs, SINGLETON_RECORD);
    let raw = "";
    try {
      raw = await fs.readFile(mainPath, "utf-8");
    } catch (error) {
      if (error && error.code !== "ENOENT") throw error;
    }
    const { body } = parseFrontmatter(raw);
    return { state: parseSyncStateBody(body), mainPath };
  }

  async function writeSyncSingleton(state) {
    const { agentRoot, projectRoot } = agentContext();
    const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
    const storeAbs = getStoreAbsolutePath(dataRoot, EXTERNAL_MEMORY_SYNC_STORE_REL);
    const mainPath = path.join(storeAbs, SINGLETON_RECORD);
    const body = formatSyncStateBody(state);
    let header = "---\nawn-type: awn.hub.database.single\n---\n";
    try {
      const existing = await fs.readFile(mainPath, "utf-8");
      const match = existing.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
      if (match) header = match[0].trimEnd() + "\n";
    } catch {
      /* new file */
    }
    await fs.writeFile(mainPath, `${header}\n${body}`, "utf-8");
    const rel = `${AWN_DATABASE_DIR}/${EXTERNAL_MEMORY_SYNC_STORE_REL}/${SINGLETON_RECORD}`;
    if (typeof onMemoryWritten === "function") onMemoryWritten(rel);
  }

  async function listProviderItems(provider, options = {}) {
    const { provider: key, storeRel } = resolveProviderStore(provider);
    const { agentRoot, projectRoot } = agentContext();
    const payload = getAwnDataPayload(agentRoot, projectRoot, storeRel);
    const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
    const records = (payload.store?.records || []).filter((item) => !item.isSection);
    const items = records.map((r) => mapStoreRecordToMemoryItem(r, key));
    items.sort((a, b) => String(b.updated || b.created || b.path).localeCompare(String(a.updated || a.created || a.path), "en"));
    return { provider: key, storeRel, items: items.slice(0, limit), total: items.length };
  }

  async function upsertMemoryEntry(options = {}) {
    const body = String(options.body || options.text || "").trim();
    if (!body) throw new Error("body is required");
    const { provider: key, storeRel } = resolveProviderStore(options.provider || "other");
    const { agentRoot, projectRoot } = agentContext();
    const externalId = String(options.externalId || options.external_id || "").trim();

    let recordId = String(options.record || options.id || "").trim();
    if (!recordId && externalId) {
      const existing = await listProviderItems(key, { limit: 200 });
      const hit = existing.items.find((item) => item.externalId === externalId);
      if (hit?.id) recordId = hit.id;
    }

    if (recordId) {
      writeAwnDataRecordBody(agentRoot, projectRoot, storeRel, recordId, body);
      const patch = buildMemoryPropertiesPatch({ externalId, provider: key });
      if (patch) writeAwnDataRecordProperties(agentRoot, projectRoot, storeRel, recordId, patch);
      const payload = getAwnDataPayload(agentRoot, projectRoot, storeRel);
      const record = (payload.store?.records || []).find((r) => String(r.id) === recordId);
      const rel = record ? workspaceRelFromStoreRecord(record.relPath) : "";
      if (rel && typeof onMemoryWritten === "function") onMemoryWritten(rel);
      return { ok: true, updated: true, provider: key, id: recordId, path: rel };
    }

    const store = createAwnDataRecord(agentRoot, projectRoot, {
      store: storeRel,
      name: options.name || body.slice(0, 120),
      body
    });
    const createdMeta = store?.__awnLastCreatedRecord;
    const records = (store?.records || []).filter((r) => !r.isSection);
    const created = createdMeta?.id
      ? records.find((r) => r.id === createdMeta.id)
      : records[records.length - 1];
    if (created?.id) {
      const patch = buildMemoryPropertiesPatch({ externalId, provider: key });
      if (patch) writeAwnDataRecordProperties(agentRoot, projectRoot, storeRel, created.id, patch);
      const rel = workspaceRelFromStoreRecord(created.relPath);
      if (typeof onMemoryWritten === "function") onMemoryWritten(rel);
      return { ok: true, created: true, provider: key, id: created.id, path: rel };
    }
    throw new Error("Failed to create memory entry");
  }

  function buildExportMarkdown(provider, items) {
    const lines = [`# External memory export — ${provider}`, "", `Generated: ${new Date().toISOString()}`, ""];
    for (const item of items) {
      lines.push(`- ${item.body.replace(/\n+/g, " ").trim()}`);
    }
    lines.push("");
    return lines.join("\n");
  }

  async function syncExternalMemory(options = {}) {
    const direction = String(options.direction || "both").trim().toLowerCase();
    if (!["pull", "push", "both"].includes(direction)) {
      throw new Error("direction must be pull, push, or both");
    }
    const { provider: key } = resolveProviderStore(options.provider || "other");
    const { state } = await readSyncSingleton();
    if (!state.providers || typeof state.providers !== "object") state.providers = {};

    const result = { provider: key, direction, pulled: 0, pushed: 0, exportPath: "", exportText: "" };

    if (direction === "pull" || direction === "both") {
      const entries = Array.isArray(options.entries) ? options.entries : [];
      for (const entry of entries) {
        const text =
          typeof entry === "string"
            ? entry
            : String(entry?.body || entry?.text || "").trim();
        if (!text) continue;
        await upsertMemoryEntry({
          provider: key,
          body: text,
          externalId: entry?.externalId || entry?.external_id || "",
          name: entry?.name || ""
        });
        result.pulled += 1;
      }
    }

    if (direction === "push" || direction === "both") {
      const listed = await listProviderItems(key, { limit: 200 });
      result.exportText = buildExportMarkdown(key, listed.items);
      result.pushed = listed.items.length;
      const { agentRoot, projectRoot } = agentContext();
      const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
      const groupAbs = getStoreAbsolutePath(dataRoot, EXTERNAL_MEMORY_GROUP_REL);
      if (groupAbs) {
        const exportDir = path.join(groupAbs, "exports");
        await fs.mkdir(exportDir, { recursive: true });
        const exportFile = path.join(exportDir, `${key}.md`);
        await fs.writeFile(exportFile, result.exportText, "utf-8");
        result.exportPath = `${AWN_DATABASE_DIR}/${EXTERNAL_MEMORY_GROUP_REL}/exports/${key}.md`;
        if (typeof onMemoryWritten === "function") onMemoryWritten(result.exportPath);
      }
    }

    state.providers[key] = {
      lastSync: new Date().toISOString(),
      direction,
      recordCount: (await listProviderItems(key, { limit: 200 })).total,
      lastExportPath: result.exportPath || state.providers[key]?.lastExportPath || ""
    };
    await writeSyncSingleton(state);
    return result;
  }

  async function syncStatus() {
    ensureStore();
    const { state } = await readSyncSingleton();
    return { groupRel: EXTERNAL_MEMORY_GROUP_REL, sync: state };
  }

  return {
    listProviderItems,
    upsertMemoryEntry,
    syncExternalMemory,
    syncStatus,
    EXTERNAL_MEMORY_GROUP_REL
  };
}

module.exports = {
  createWorkspaceExternalMemoryService,
  EXTERNAL_MEMORY_PROVIDERS
};
