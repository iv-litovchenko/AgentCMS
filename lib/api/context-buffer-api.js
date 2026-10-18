const fs = require("fs/promises");
const crypto = require("crypto");
const { rel, abs } = require("../paths/agent-cms");

const CONTEXT_BUFFER_REL_PATH = rel.state.contextBuffer;

const BUFFER_ITEM_TYPES = new Set(["page", "content", "file", "slot", "link", "text"]);

function normalizeRef(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .trim();
}

function normalizeBufferDocument(raw) {
  const items = Array.isArray(raw?.items) ? raw.items : [];
  const normalized = [];
  const seen = new Set();
  for (const row of items) {
    const typeRaw = String(row?.type || "link").trim().toLowerCase();
    const type = BUFFER_ITEM_TYPES.has(typeRaw) ? typeRaw : "link";
    const ref = normalizeRef(row?.ref || row?.path || "");
    if (!ref) continue;
    const dedupeKey = `${type}:${ref}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    const id = String(row?.id || "").trim() || crypto.randomUUID();
    const title = String(row?.title || row?.name || row?.label || "").trim() || ref;
    const icon = String(row?.icon || "").trim() || null;
    const meta = row?.meta && typeof row.meta === "object" ? row.meta : {};
    const addedAt = String(row?.addedAt || "").trim() || new Date().toISOString();
    normalized.push({ id, type, ref, title, icon, meta, addedAt });
  }
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    items: normalized
  };
}

async function readContextBuffer(agentRoot) {
  if (!agentRoot) {
    return {
      exists: false,
      buffer: { version: 1, updatedAt: null, items: [] },
      path: CONTEXT_BUFFER_REL_PATH
    };
  }
  const absolute = abs(agentRoot, CONTEXT_BUFFER_REL_PATH);
  try {
    const raw = await fs.readFile(absolute, "utf-8");
    const parsed = JSON.parse(raw);
    const buffer = normalizeBufferDocument(parsed);
    return { exists: true, buffer, path: CONTEXT_BUFFER_REL_PATH };
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {
        exists: false,
        buffer: { version: 1, updatedAt: null, items: [] },
        path: CONTEXT_BUFFER_REL_PATH
      };
    }
    throw error;
  }
}

async function writeContextBuffer(agentRoot, buffer) {
  if (!agentRoot) throw new Error("Agent root is required");
  const normalized = normalizeBufferDocument(buffer);
  await fs.mkdir(abs(agentRoot, rel.state.dir), { recursive: true });
  const absolute = abs(agentRoot, CONTEXT_BUFFER_REL_PATH);
  await fs.writeFile(absolute, `${JSON.stringify(normalized, null, 2)}\n`, "utf-8");
  return { path: CONTEXT_BUFFER_REL_PATH, buffer: normalized };
}

async function appendContextBuffer(agentRoot, payload = {}) {
  const typeRaw = String(payload.type || "link").trim().toLowerCase();
  const type = BUFFER_ITEM_TYPES.has(typeRaw) ? typeRaw : "link";
  const ref = normalizeRef(payload.ref || payload.path || "");
  if (!ref) {
    return { error: "ref or path is required", status: 400 };
  }
  const current = await readContextBuffer(agentRoot);
  const buffer = normalizeBufferDocument(current.buffer);
  const existing = buffer.items.find((item) => item.type === type && item.ref === ref);
  if (existing) {
    return { path: CONTEXT_BUFFER_REL_PATH, buffer, item: existing, alreadyBuffered: true };
  }
  const item = {
    id: crypto.randomUUID(),
    type,
    ref,
    title: String(payload.title || payload.name || payload.label || "").trim() || ref,
    icon: String(payload.icon || "").trim() || null,
    meta: payload.meta && typeof payload.meta === "object" ? payload.meta : {},
    addedAt: new Date().toISOString()
  };
  buffer.items.unshift(item);
  const written = await writeContextBuffer(agentRoot, buffer);
  return { ...written, item, alreadyBuffered: false };
}

async function removeContextBufferItem(agentRoot, payload = {}) {
  const id = String(payload.id || "").trim();
  const ref = normalizeRef(payload.ref || payload.path || "");
  if (!id && !ref) {
    return { error: "id or ref is required", status: 400 };
  }
  const current = await readContextBuffer(agentRoot);
  const buffer = normalizeBufferDocument(current.buffer);
  const before = buffer.items.length;
  buffer.items = buffer.items.filter((item) => {
    if (id && item.id === id) return false;
    if (ref && item.ref === ref) return false;
    return true;
  });
  if (buffer.items.length === before) {
    return { error: "Item not found in context buffer", status: 404 };
  }
  const written = await writeContextBuffer(agentRoot, buffer);
  return { ...written, removed: true };
}

async function clearContextBuffer(agentRoot) {
  if (!agentRoot) throw new Error("Agent root is required");
  const current = await readContextBuffer(agentRoot);
  const removedCount = Array.isArray(current.buffer?.items) ? current.buffer.items.length : 0;
  const written = await writeContextBuffer(agentRoot, { version: 1, items: [] });
  return { ...written, cleared: true, removedCount };
}

module.exports = {
  CONTEXT_BUFFER_REL_PATH,
  BUFFER_ITEM_TYPES,
  readContextBuffer,
  writeContextBuffer,
  appendContextBuffer,
  removeContextBufferItem,
  clearContextBuffer
};
