const PRESENCE_TTL_MS = 30_000;

/** @type {Map<string, Map<string, object>>} */
const clientsByAgent = new Map();

function nowIso() {
  return new Date().toISOString();
}

function parseTime(value) {
  const ts = Date.parse(String(value || ""));
  return Number.isFinite(ts) ? ts : 0;
}

function normalizeClientId(payload = {}) {
  return String(payload.shellClientId || payload.clientId || "").trim();
}

function normalizeRecord(agentId, clientId, payload = {}, previous = null) {
  const ts = nowIso();
  const interact = Boolean(payload.interact);
  const lastInteractAt = interact
    ? ts
    : String(payload.lastInteractAt || previous?.lastInteractAt || "").trim() || null;

  return {
    clientId,
    agentId: String(agentId || "").trim(),
    surfaceHost: String(payload.surfaceHost || previous?.surfaceHost || "").trim(),
    surfaceHint: String(payload.surfaceHint || previous?.surfaceHint || "").trim(),
    surfaceEmbedded: Boolean(
      payload.surfaceEmbedded ?? previous?.surfaceEmbedded ?? false
    ),
    surfaceBackend: String(payload.surfaceBackend || previous?.surfaceBackend || "local").trim(),
    hostUrl: String(payload.hostUrl || previous?.hostUrl || "").trim(),
    visibility: String(payload.visibility || previous?.visibility || "visible").trim(),
    hasFocus: Boolean(payload.hasFocus ?? previous?.hasFocus ?? false),
    micActive: Boolean(payload.micActive ?? previous?.micActive ?? false),
    pttHeld: Boolean(payload.pttHeld ?? previous?.pttHeld ?? false),
    lastSeenAt: ts,
    lastInteractAt
  };
}

function pruneAgentClients(agentId, nowMs = Date.now()) {
  const bucket = clientsByAgent.get(agentId);
  if (!bucket) return;
  for (const [clientId, record] of bucket.entries()) {
    if (nowMs - parseTime(record.lastSeenAt) > PRESENCE_TTL_MS) {
      bucket.delete(clientId);
    }
  }
  if (!bucket.size) clientsByAgent.delete(agentId);
}

function listAliveClients(agentId) {
  pruneAgentClients(agentId);
  const bucket = clientsByAgent.get(agentId);
  if (!bucket) return [];
  return [...bucket.values()].sort((left, right) => {
    const interactDiff = parseTime(right.lastInteractAt) - parseTime(left.lastInteractAt);
    if (interactDiff) return interactDiff;
    const focusScore = Number(right.hasFocus && right.visibility === "visible")
      - Number(left.hasFocus && left.visibility === "visible");
    if (focusScore) return focusScore;
    return parseTime(right.lastSeenAt) - parseTime(left.lastSeenAt);
  });
}

function resolvePrimaryClientId(agentId, state = {}) {
  const clients = listAliveClients(agentId);
  if (!clients.length) {
    return String(state.primaryClientId || state.lastTtsClientId || "").trim();
  }

  const focused = clients.find((client) => client.visibility === "visible" && client.hasFocus);
  if (focused) return focused.clientId;

  const withInteract = clients
    .filter((client) => client.lastInteractAt)
    .sort((left, right) => parseTime(right.lastInteractAt) - parseTime(left.lastInteractAt));
  if (withInteract.length) return withInteract[0].clientId;

  const fromState = String(state.primaryClientId || state.lastTtsClientId || "").trim();
  if (fromState && clients.some((client) => client.clientId === fromState)) {
    return fromState;
  }
  if (fromState && !fromState.includes(":")) {
    const legacyTab = clients.find((client) => client.clientId.startsWith(`${fromState}:`));
    if (legacyTab) return legacyTab.clientId;
  }
  return clients[0]?.clientId || fromState || "";
}

function upsertPresence(agentId, payload = {}) {
  const id = String(agentId || "").trim();
  const clientId = normalizeClientId(payload);
  if (!id || !clientId) {
    throw new Error("agentId and shellClientId are required");
  }

  if (!clientsByAgent.has(id)) clientsByAgent.set(id, new Map());
  const bucket = clientsByAgent.get(id);
  const previous = bucket.get(clientId) || null;
  const record = normalizeRecord(id, clientId, payload, previous);
  bucket.set(clientId, record);
  pruneAgentClients(id);
  return record;
}

function buildPresencePayload(agentId, state = {}) {
  const clients = listAliveClients(agentId);
  const primaryClientId = resolvePrimaryClientId(agentId, state);
  const primaryClient = clients.find((client) => client.clientId === primaryClientId) || null;
  return {
    agentId: String(agentId || "").trim(),
    primaryClientId,
    primarySurfaceHost: primaryClient?.surfaceHost || String(state.shellSurfaceHost || "").trim(),
    primarySurfaceHint: primaryClient?.surfaceHint || String(state.shellSurfaceHint || "").trim(),
    clientCount: clients.length,
    clients,
    updatedAt: nowIso()
  };
}

function resetPresenceForTests() {
  clientsByAgent.clear();
}

module.exports = {
  PRESENCE_TTL_MS,
  upsertPresence,
  listAliveClients,
  resolvePrimaryClientId,
  buildPresencePayload,
  resetPresenceForTests
};
