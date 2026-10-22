const fs = require("fs/promises");
const path = require("path");
const {
  AWN_DATABASE_DIR,
  ensureExternalMemoryStoreScaffold,
  ensureExternalMemoryProviderSection,
  createAwnDataRecord,
  getAwnDataPayload,
  writeAwnDataRecordBody,
  writeAwnDataRecordProperties,
  getAwnDataRoot,
  getStoreAbsolutePath
} = require("../awn/awn-data-loader");
const {
  EXTERNAL_MEMORY_STORE_REL,
  EXTERNAL_MEMORY_SYNC_STATE_FILE,
  slugifyExternalMemoryPlatform,
  resolveExternalMemoryPlatformSection
} = require("../config/database-platform-paths");
const {
  EXTERNAL_MEMORY_PLATFORM_REQUIRED,
  externalMemoryPlatformDisplayName
} = require("../config/external-memory-platform-infer");

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

function platformFromRecordFrontmatter(fm) {
  return (
    slugifyExternalMemoryPlatform(fm["awn-external-memory-platform"]) ||
    slugifyExternalMemoryPlatform(fm["awn-external-memory-provider"])
  );
}

function recordPlatformSection(record) {
  const parent = String(record?.parent || "").trim();
  if (parent) return parent;
  const fm = record?.frontmatter || record?.properties || {};
  const fromFm = platformFromRecordFrontmatter(fm);
  if (fromFm) return fromFm;
  const rel = normalizeRelPath(record?.relPath || "");
  const marker = "/awn-storage/data/";
  const dataIdx = rel.indexOf(marker);
  if (dataIdx >= 0) {
    const tail = rel.slice(dataIdx + marker.length);
    const first = tail.split("/").filter(Boolean)[0];
    if (first) return first;
  }
  return "";
}

function mapStoreRecordToMemoryItem(record) {
  const fm = record.frontmatter || record.properties || {};
  const platform = recordPlatformSection(record) || platformFromRecordFrontmatter(fm);
  return {
    id: String(record.id || ""),
    path: workspaceRelFromStoreRecord(record.relPath),
    platform,
    provider: platform,
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
  const platform = options.platform || options.provider;
  if (platform) lines.push(`awn-external-memory-platform: ${formatYamlScalar(platform)}`);
  return lines.join("\n");
}

function normalizeSyncState(state) {
  const next = state && typeof state === "object" ? { ...state } : {};
  if (!next.platforms || typeof next.platforms !== "object") {
    next.platforms =
      next.providers && typeof next.providers === "object" ? { ...next.providers } : {};
  }
  return next;
}

function pickPlatformFromOptions(options = {}) {
  return (
    options.platform ??
    options.app ??
    options.source ??
    options.provider ??
    options.providerSlug ??
    ""
  );
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
    ensureExternalMemoryStoreScaffold(agentRoot, projectRoot);
  }

  async function resolvePlatformInput(options = {}) {
    const raw = pickPlatformFromOptions(options);
    if (String(raw).trim()) {
      return resolveExternalMemoryPlatformSection(raw);
    }
    throw new Error(EXTERNAL_MEMORY_PLATFORM_REQUIRED);
  }

  function platformSectionLabel(sectionSlug, options = {}) {
    const fromOpts = String(
      options.platformLabel || options.platformName || options.providerName || ""
    ).trim();
    if (fromOpts) return fromOpts;
    return externalMemoryPlatformDisplayName(sectionSlug);
  }

  function ensurePlatformSection(sectionSlug, displayName = "") {
    ensureStore();
    const { agentRoot, projectRoot } = agentContext();
    return ensureExternalMemoryProviderSection(
      agentRoot,
      projectRoot,
      EXTERNAL_MEMORY_STORE_REL,
      sectionSlug,
      displayName || sectionSlug
    );
  }

  async function readSyncState() {
    ensureStore();
    const { agentRoot, projectRoot } = agentContext();
    const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
    const storeAbs = getStoreAbsolutePath(dataRoot, EXTERNAL_MEMORY_STORE_REL);
    const syncPath = path.join(storeAbs, EXTERNAL_MEMORY_SYNC_STATE_FILE);
    let raw = "{}";
    try {
      raw = await fs.readFile(syncPath, "utf-8");
    } catch (error) {
      if (error && error.code !== "ENOENT") throw error;
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return { state: normalizeSyncState(parsed), syncPath };
      }
    } catch {
      /* fall through */
    }
    return { state: normalizeSyncState({}), syncPath };
  }

  async function writeSyncState(state) {
    const normalized = normalizeSyncState(state);
    delete normalized.providers;
    const { syncPath } = await readSyncState();
    await fs.writeFile(syncPath, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
    const rel = `${AWN_DATABASE_DIR}/${EXTERNAL_MEMORY_STORE_REL}/${EXTERNAL_MEMORY_SYNC_STATE_FILE}`;
    if (typeof onMemoryWritten === "function") onMemoryWritten(rel);
  }

  async function listByPlatform(platform, options = {}) {
    ensureStore();
    const key = platform ? resolveExternalMemoryPlatformSection(platform) : "";
    const { agentRoot, projectRoot } = agentContext();
    const payload = getAwnDataPayload(agentRoot, projectRoot, EXTERNAL_MEMORY_STORE_REL);
    const limit = Math.min(Math.max(Number(options.limit) || 50, 1), 200);
    let records = (payload.store?.records || []).filter((item) => !item.isSection);
    if (key) {
      records = records.filter((record) => recordPlatformSection(record) === key);
    }
    const items = records.map((r) => mapStoreRecordToMemoryItem(r));
    items.sort((a, b) => String(b.updated || b.created || b.path).localeCompare(String(a.updated || a.created || a.path), "en"));
    return {
      platform: key || null,
      provider: key || null,
      storeRel: EXTERNAL_MEMORY_STORE_REL,
      items: items.slice(0, limit),
      total: items.length
    };
  }

  async function upsertMemoryEntry(options = {}) {
    const body = String(options.body || options.text || "").trim();
    if (!body) throw new Error("body is required");
    const section = await resolvePlatformInput(options);
    ensurePlatformSection(section, platformSectionLabel(section, options));
    const { agentRoot, projectRoot } = agentContext();
    const externalId = String(options.externalId || options.external_id || "").trim();

    let recordId = String(options.record || options.id || "").trim();
    if (!recordId && externalId) {
      const existing = await listByPlatform(section, { limit: 200 });
      const hit = existing.items.find((item) => item.externalId === externalId);
      if (hit?.id) recordId = hit.id;
    }

    if (recordId) {
      writeAwnDataRecordBody(agentRoot, projectRoot, EXTERNAL_MEMORY_STORE_REL, recordId, body);
      const patch = buildMemoryPropertiesPatch({ externalId, platform: section });
      if (patch) {
        writeAwnDataRecordProperties(agentRoot, projectRoot, EXTERNAL_MEMORY_STORE_REL, recordId, patch);
      }
      const payload = getAwnDataPayload(agentRoot, projectRoot, EXTERNAL_MEMORY_STORE_REL);
      const record = (payload.store?.records || []).find((r) => String(r.id) === recordId);
      const rel = record ? workspaceRelFromStoreRecord(record.relPath) : "";
      if (rel && typeof onMemoryWritten === "function") onMemoryWritten(rel);
      return { ok: true, updated: true, platform: section, provider: section, id: recordId, path: rel };
    }

    const store = createAwnDataRecord(agentRoot, projectRoot, {
      store: EXTERNAL_MEMORY_STORE_REL,
      name: options.name || body.slice(0, 120),
      body,
      parent: section
    });
    const createdMeta = store?.__awnLastCreatedRecord;
    const records = (store?.records || []).filter((r) => !r.isSection);
    const created = createdMeta?.id
      ? records.find((r) => r.id === createdMeta.id)
      : records[records.length - 1];
    if (created?.id) {
      const patch = buildMemoryPropertiesPatch({ externalId, platform: section });
      if (patch) {
        writeAwnDataRecordProperties(agentRoot, projectRoot, EXTERNAL_MEMORY_STORE_REL, created.id, patch);
      }
      const rel = workspaceRelFromStoreRecord(created.relPath);
      if (typeof onMemoryWritten === "function") onMemoryWritten(rel);
      return {
        ok: true,
        created: true,
        platform: section,
        provider: section,
        id: created.id,
        path: rel
      };
    }
    throw new Error("Failed to create memory entry");
  }

  function buildExportMarkdown(platform, items) {
    const lines = [`# External memory export — ${platform}`, "", `Generated: ${new Date().toISOString()}`, ""];
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
    const section = await resolvePlatformInput(options);
    ensurePlatformSection(section, platformSectionLabel(section, options));
    const { state } = await readSyncState();
    const result = { platform: section, provider: section, direction, pulled: 0, pushed: 0, exportPath: "", exportText: "" };

    if (direction === "pull" || direction === "both") {
      const entries = Array.isArray(options.entries) ? options.entries : [];
      for (const entry of entries) {
        const text =
          typeof entry === "string" ? entry : String(entry?.body || entry?.text || "").trim();
        if (!text) continue;
        await upsertMemoryEntry({
          ...options,
          platform: section,
          body: text,
          externalId: entry?.externalId || entry?.external_id || "",
          name: entry?.name || ""
        });
        result.pulled += 1;
      }
    }

    if (direction === "push" || direction === "both") {
      const listed = await listByPlatform(section, { limit: 200 });
      result.exportText = buildExportMarkdown(section, listed.items);
      result.pushed = listed.items.length;
      const { agentRoot, projectRoot } = agentContext();
      const dataRoot = getAwnDataRoot(agentRoot, projectRoot);
      const storeAbs = getStoreAbsolutePath(dataRoot, EXTERNAL_MEMORY_STORE_REL);
      if (storeAbs) {
        const exportDir = path.join(storeAbs, "exports");
        await fs.mkdir(exportDir, { recursive: true });
        const exportFile = path.join(exportDir, `${section}.md`);
        await fs.writeFile(exportFile, result.exportText, "utf-8");
        result.exportPath = `${AWN_DATABASE_DIR}/${EXTERNAL_MEMORY_STORE_REL}/exports/${section}.md`;
        if (typeof onMemoryWritten === "function") onMemoryWritten(result.exportPath);
      }
    }

    state.platforms[section] = {
      lastSync: new Date().toISOString(),
      direction,
      recordCount: (await listByPlatform(section, { limit: 200 })).total,
      lastExportPath: result.exportPath || state.platforms[section]?.lastExportPath || ""
    };
    await writeSyncState(state);
    return result;
  }

  async function syncStatus() {
    ensureStore();
    const { state } = await readSyncState();
    return { storeRel: EXTERNAL_MEMORY_STORE_REL, sync: state };
  }

  return {
    listByPlatform,
    /** @deprecated use listByPlatform */
    listProviderItems: listByPlatform,
    upsertMemoryEntry,
    syncExternalMemory,
    syncStatus,
    EXTERNAL_MEMORY_STORE_REL
  };
}

module.exports = {
  createWorkspaceExternalMemoryService
};
