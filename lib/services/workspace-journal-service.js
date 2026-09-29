const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const { rel } = require("../../paths/agent-cms");

const JOURNAL_DIR = rel.journal.dir;
const JOURNAL_TYPES = new Set(["life", "action", "ui", "system", "external"]);
const JOURNAL_AUTHORS = new Set(["user", "agent", "system"]);

function normalizeRelPath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\/+/, "").trim();
}

function formatYamlScalar(value) {
  const text = String(value ?? "");
  if (!text || /[:#\[\]{}&,*?"']|^\s|\s$/.test(text)) {
    return `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return text;
}

function getIsoWeekId(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function buildEntryId(createdAt = new Date()) {
  const stamp = createdAt.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const suffix = crypto.randomBytes(2).toString("hex");
  return `${stamp}-${suffix}`;
}

function parseFrontmatterBlock(text) {
  const frontmatter = {};
  for (const line of String(text || "").split("\n")) {
    const row = line.match(/^([a-z0-9-]+):\s*(.+)$/i);
    if (!row) continue;
    const key = row[1];
    let value = row[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (value === "true") value = true;
    if (value === "false") value = false;
    frontmatter[key] = value;
  }
  return frontmatter;
}

function parseJournalFileContent(content, fileRelPath) {
  const text = String(content || "");
  const entries = [];
  const re = /---\n([\s\S]*?)\n---\n([\s\S]*?)(?=(?:\r?\n---\r?\n)|$)/g;
  let match = re.exec(text);
  while (match) {
    const meta = parseFrontmatterBlock(match[1]);
    if (meta["awn-journal-entry"]) {
      entries.push({
        id: String(meta["awn-entry-id"] || ""),
        at: String(meta["awn-journal-at"] || ""),
        type: String(meta["awn-journal-type"] || "action"),
        author: String(meta["awn-journal-author"] || "agent"),
        path: normalizeRelPath(meta["awn-journal-path"] || ""),
        topic: normalizeRelPath(meta["awn-journal-topic"] || ""),
        notify: Boolean(meta["awn-journal-notify"]),
        body: String(match[2] || "").trim(),
        file: fileRelPath
      });
    }
    match = re.exec(text);
  }
  return entries;
}

function journalEntryToNotificationId(entry) {
  const ms = Date.parse(entry.at || "") || 0;
  let hash = 0;
  for (const c of String(entry.id || "")) {
    hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  }
  return ms * 1000 + (hash % 1000);
}

function resolveJournalNotificationSource(entry) {
  const type = String(entry.type || "action").toLowerCase();
  const author = String(entry.author || "agent").toLowerCase();
  if (type === "external") return "external";
  if (type === "ui") return "ui";
  if (author === "agent") return "mcp";
  if (entry.notify) return "journal";
  return "system";
}

function resolveJournalNotificationAction(entry) {
  if (entry.notify) return "notify";
  const firstLine = String(entry.body || "").split("\n")[0] || "";
  if (/^создано/i.test(firstLine)) return "create";
  if (/^удалено/i.test(firstLine)) return "delete";
  if (/^перемещено/i.test(firstLine)) return "move";
  return "update";
}

function mapJournalEntryToNotificationEvent(entry) {
  const notify = Boolean(entry.notify);
  const body = String(entry.body || "").trim();
  const firstLine = body.split("\n")[0] || "";
  const pathValue = entry.path || entry.topic || JOURNAL_DIR;
  const manifestPath = entry.topic || null;

  return {
    id: journalEntryToNotificationId(entry),
    journalId: entry.id,
    action: resolveJournalNotificationAction(entry),
    path: pathValue,
    manifestPath,
    label: firstLine || "Журнал",
    message: notify ? body : null,
    fileKind: notify ? "notification" : "other",
    source: resolveJournalNotificationSource(entry),
    journalType: entry.type || "action",
    notify,
    at: entry.at,
    file: entry.file || null
  };
}

function buildEntryMarkdown({
  id,
  at,
  type,
  author,
  relPath,
  topic,
  notify,
  body
}) {
  const lines = [
    "---",
    "awn-journal-entry: true",
    `awn-entry-id: ${formatYamlScalar(id)}`,
    `awn-journal-at: ${formatYamlScalar(at)}`,
    `awn-journal-type: ${formatYamlScalar(type)}`,
    `awn-journal-author: ${formatYamlScalar(author)}`
  ];
  if (relPath) lines.push(`awn-journal-path: ${formatYamlScalar(relPath)}`);
  if (topic) lines.push(`awn-journal-topic: ${formatYamlScalar(topic)}`);
  if (notify) lines.push("awn-journal-notify: true");
  lines.push("---", "", String(body || "").trim(), "");
  return lines.join("\n");
}

function weekFileRel(weekId) {
  return `${JOURNAL_DIR}/${weekId}.md`;
}

async function listWeekFilesFromRoot(agentRoot, limitWeeks = 8) {
  const dir = path.join(agentRoot, JOURNAL_DIR);
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isFile() && /^\d{4}-W\d{2}\.md$/i.test(entry.name))
    .map((entry) => entry.name.replace(/\.md$/i, ""))
    .sort((a, b) => b.localeCompare(a))
    .slice(0, limitWeeks);
}

async function collectEntriesFromRoot(agentRoot, options = {}) {
  if (!agentRoot) return [];
  const topic = normalizeRelPath(options.topic || "");
  const notifyOnly =
    options.notifyOnly === true || String(options.notifyOnly || "").toLowerCase() === "true";
  const limit = Math.max(1, Math.min(500, Number(options.limit) || 100));
  const weeks = await listWeekFilesFromRoot(agentRoot, options.weeks || 12);
  const items = [];

  for (const weekId of weeks) {
    const absolute = path.join(agentRoot, JOURNAL_DIR, `${weekId}.md`);
    let content = "";
    try {
      content = await fs.readFile(absolute, "utf-8");
    } catch {
      continue;
    }
    const fileRel = weekFileRel(weekId);
    for (const entry of parseJournalFileContent(content, fileRel)) {
      if (topic && normalizeRelPath(entry.topic) !== topic) continue;
      if (notifyOnly && !entry.notify) continue;
      items.push({ ...entry, weekId });
    }
  }

  items.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  return items.slice(0, limit);
}

function createWorkspaceJournalService(deps) {
  const { getAgentRoot, resolveTopicFromPath, onJournalWritten, onNotify } = deps;

  function journalDirAbsolute() {
    const root = getAgentRoot();
    if (!root) throw new Error("Agent not selected");
    return path.join(root, JOURNAL_DIR);
  }

  async function ensureWeekFile(weekId, createdAt = new Date()) {
    const dir = journalDirAbsolute();
    await fs.mkdir(dir, { recursive: true });
    const relPath = weekFileRel(weekId);
    const absolute = path.join(dir, `${weekId}.md`);
    try {
      await fs.access(absolute);
    } catch {
      const header = `# Журнал workspace · ${weekId}\n\n_Создан: ${createdAt.toISOString()}_\n\n`;
      await fs.writeFile(absolute, header, "utf-8");
    }
    return { absolute, relPath };
  }

  async function listWeekFiles(limitWeeks = 8) {
    const root = getAgentRoot();
    if (!root) return [];
    return listWeekFilesFromRoot(root, limitWeeks);
  }

  async function collectEntries(options = {}) {
    const root = getAgentRoot();
    if (!root) return [];
    return collectEntriesFromRoot(root, options);
  }

  async function appendJournalEntry(options = {}) {
    const body = String(options.body || "").trim();
    if (!body) throw new Error("body is required");

    const typeRaw = String(options.type || "action").trim().toLowerCase();
    const type = JOURNAL_TYPES.has(typeRaw) ? typeRaw : "action";

    const authorRaw = String(options.author || "agent").trim().toLowerCase();
    const author = JOURNAL_AUTHORS.has(authorRaw) ? authorRaw : "agent";

    const relPath = normalizeRelPath(options.path || options.file || "");
    let topic = normalizeRelPath(options.topic || "");
    if (!topic && relPath && typeof resolveTopicFromPath === "function") {
      topic = normalizeRelPath(resolveTopicFromPath(relPath) || "");
    }

    const notify = options.notify === true || String(options.notify || "").toLowerCase() === "true";
    const createdAt = options.at ? new Date(options.at) : new Date();
    if (Number.isNaN(createdAt.getTime())) throw new Error("Invalid at timestamp");

    const weekId = getIsoWeekId(createdAt);
    const id = buildEntryId(createdAt);
    const at = createdAt.toISOString();
    const { absolute, relPath: fileRel } = await ensureWeekFile(weekId, createdAt);
    const block = buildEntryMarkdown({
      id,
      at,
      type,
      author,
      relPath,
      topic,
      notify,
      body
    });

    let existing = "";
    try {
      existing = await fs.readFile(absolute, "utf-8");
    } catch {
      existing = "";
    }
    const next = existing.endsWith("\n") ? `${existing}\n${block}` : `${existing}\n\n${block}`;
    await fs.writeFile(absolute, next, "utf-8");

    if (typeof onJournalWritten === "function") {
      onJournalWritten(fileRel);
    }

    const entry = {
      id,
      at,
      type,
      author,
      path: relPath || null,
      topic: topic || null,
      notify,
      body,
      weekId,
      file: fileRel
    };

    const emitActivityNotify = options.emitActivityNotify === true;
    if (notify && emitActivityNotify && typeof onNotify === "function") {
      await onNotify(entry);
    }

    return {
      ok: true,
      entry,
      file: fileRel,
      hint: "Journal entry appended. Indexed via workspace search after sync."
    };
  }

  async function getJournalStats(options = {}) {
    const topic = normalizeRelPath(options.topic || "");
    const entries = await collectEntries({ topic, limit: 500, weeks: 4 });
    const currentWeek = getIsoWeekId();
    const thisWeek = entries.filter((entry) => entry.weekId === currentWeek);
    const latest = entries[0] || null;
    return {
      version: 1,
      folder: JOURNAL_DIR,
      exists: entries.length > 0,
      totalCount: entries.length,
      weekCount: thisWeek.length,
      currentWeek,
      latestAt: latest?.at || null,
      latestType: latest?.type || null
    };
  }

  async function listJournalEntries(options = {}) {
    const entries = await collectEntries(options);
    const notifyOnly =
      options.notifyOnly === true || String(options.notifyOnly || "").toLowerCase() === "true";
    return {
      version: 1,
      folder: JOURNAL_DIR,
      topic: normalizeRelPath(options.topic || "") || null,
      notifyOnly,
      count: entries.length,
      entries
    };
  }

  async function listNotificationEvents(options = {}) {
    const sinceId = Number(options.since) || 0;
    const cappedLimit = Math.max(1, Math.min(100, Number(options.limit) || 50));
    const scanLimit = sinceId > 0 ? Math.max(cappedLimit * 4, 200) : cappedLimit;
    const entries = await collectEntries({
      limit: scanLimit,
      weeks: options.weeks || 24,
      topic: options.topic || "",
      notifyOnly: options.notifyOnly
    });

    let events = entries.map(mapJournalEntryToNotificationEvent);
    if (sinceId > 0) {
      events = events.filter((event) => event.id > sinceId);
    }
    events.sort((a, b) => b.id - a.id);
    const sliced = events.slice(0, cappedLimit);
    const latestId = events.length ? Math.max(...events.map((event) => event.id)) : sinceId;

    return {
      version: 1,
      source: "journal",
      folder: JOURNAL_DIR,
      events: sliced,
      latestId,
      latestAt: sliced[0]?.at || null,
      total: entries.length,
      truncated: entries.length >= scanLimit
    };
  }

  return {
    JOURNAL_DIR,
    appendJournalEntry,
    listJournalEntries,
    listNotificationEvents,
    getJournalStats
  };
}

function resolveJournalFlowItemName(entry) {
  const body = String(entry?.body || "").trim();
  const colonMatch = body.match(/^[^:]+:\s*(.+)$/);
  if (colonMatch) return colonMatch[1].trim();
  const firstLine = body.split("\n").find((line) => line.trim());
  return firstLine || "";
}

function mapJournalEntryToFlowItem(agent, entry) {
  const nodePath = normalizeRelPath(entry?.path || entry?.topic || "");
  const parsedName = resolveJournalFlowItemName(entry);
  const fallbackName = nodePath ? path.basename(nodePath).replace(/\.md$/i, "") : "";
  return {
    agentId: agent.id,
    agentName: agent.name || agent.id,
    agentPath: agent.path,
    agentActive: agent.active !== false,
    nodePath,
    name: parsedName || fallbackName || agent.name || agent.id,
    awnType: "",
    awnProps: {},
    updatedAt: entry?.at || "",
    journalId: entry?.id || null,
    journalType: entry?.type || null
  };
}

module.exports = {
  JOURNAL_DIR,
  createWorkspaceJournalService,
  getIsoWeekId,
  parseJournalFileContent,
  journalEntryToNotificationId,
  mapJournalEntryToNotificationEvent,
  mapJournalEntryToFlowItem,
  resolveJournalFlowItemName,
  collectEntriesFromRoot
};
