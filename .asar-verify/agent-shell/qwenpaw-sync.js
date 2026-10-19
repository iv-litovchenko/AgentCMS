const {
  checkQwenPawHealth,
  findQwenPawChatBySessionId,
  fetchQwenPawChat,
  findLatestAssistantMessage
} = require("./qwenpaw-client");

const ACTIVE_PHASES = new Set(["listening", "thinking", "speaking"]);

function shouldSyncQwenPawReply(state) {
  const phase = String(state?.phase || "").toLowerCase();
  return !ACTIVE_PHASES.has(phase);
}

async function syncLatestReplyFromQwenPaw({
  settings,
  agentId,
  state,
  buildSessionId,
  patchState,
  emitShellEvent,
  emitLiveUpdate = false
}) {
  if (!settings || typeof buildSessionId !== "function") {
    return { state, changed: false, latest: null };
  }

  const sessionId = String(buildSessionId(settings, agentId) || "").trim();
  if (!sessionId || !shouldSyncQwenPawReply(state)) {
    return { state, changed: false, latest: null };
  }

  const health = await checkQwenPawHealth(settings.qwenpawBaseUrl).catch(() => ({ ok: false }));
  if (!health.ok) {
    return { state, changed: false, latest: null };
  }

  const chat = await findQwenPawChatBySessionId({
    baseUrl: settings.qwenpawBaseUrl,
    agentId: settings.qwenpawAgentId,
    userId: settings.qwenpawUserId,
    channel: "console",
    sessionId
  }).catch(() => null);

  if (!chat?.id) {
    return { state, changed: false, latest: null };
  }

  const remoteUpdatedAt = String(chat.updated_at || "");
  if (remoteUpdatedAt && remoteUpdatedAt === String(state.qwenpawChatUpdatedAt || "")) {
    return { state, changed: false, latest: null };
  }

  const detail = await fetchQwenPawChat({
    baseUrl: settings.qwenpawBaseUrl,
    agentId: settings.qwenpawAgentId,
    chatId: chat.id
  }).catch(() => null);

  const latest = findLatestAssistantMessage(detail?.messages);
  const nextStatePatch = { qwenpawChatUpdatedAt: remoteUpdatedAt || state.qwenpawChatUpdatedAt || "" };

  if (!latest?.body) {
    const nextState = await patchState(nextStatePatch);
    return { state: nextState, changed: false, latest: null };
  }

  const cachedBody = String(state.lastShellReply || "").trim();
  const remoteBody = String(latest.body || "").trim();
  const sameBody = cachedBody === remoteBody;
  const sameId = String(state.lastAgentMessageId || "") === String(latest.id || "");

  if (sameBody && sameId) {
    const nextState = await patchState(nextStatePatch);
    return { state: nextState, changed: false, latest };
  }

  const nextState = await patchState({
    ...nextStatePatch,
    lastShellReply: remoteBody,
    lastAgentMessageId: latest.id,
    phase: "waiting",
    phrase: sameBody ? state.phrase || "" : ""
  });

  if (emitLiveUpdate && !sameBody && typeof emitShellEvent === "function") {
    emitShellEvent(agentId, "assistant_message", latest);
  }

  return { state: nextState, changed: !sameBody, latest };
}

module.exports = {
  shouldSyncQwenPawReply,
  syncLatestReplyFromQwenPaw
};
