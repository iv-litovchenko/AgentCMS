export const STREAM_RENDER_MS = 16;
const MAX_REPLY_IDS = 24;
const EVENT_SOURCE_OPEN = 1;

function waitForEventSourceOpen(getEventSource, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const es = typeof getEventSource === "function" ? getEventSource() : getEventSource;
    if (!es) {
      resolve(false);
      return;
    }
    if (es.readyState === EVENT_SOURCE_OPEN) {
      resolve(true);
      return;
    }
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      es.removeEventListener("open", onOpen);
      es.removeEventListener("error", onError);
      resolve(ok);
    };
    const onOpen = () => finish(true);
    const onError = () => {
      if (es.readyState === EVENT_SOURCE_OPEN) finish(true);
    };
    es.addEventListener("open", onOpen);
    es.addEventListener("error", onError);
    const timer = setTimeout(() => finish(es.readyState === EVENT_SOURCE_OPEN), timeoutMs);
  });
}

export function createShellSession(state, deps = {}) {
  const displayedReplyIds = new Set();
  const spokenReplyIds = new Set();
  let pendingStreamText = "";
  let streamRenderTimer = 0;
  let lastRenderedStreamKey = "";
  let reconnectBusy = false;
  let lastPhaseKey = "waiting";

  function trimReplyIdSet(set) {
    while (set.size > MAX_REPLY_IDS) {
      const first = set.values().next().value;
      set.delete(first);
    }
  }

  function collectReplyIds(message = {}) {
    return [message.id, message.streamId, message.messageId]
      .map((value) => String(value || "").trim())
      .filter(Boolean);
  }

  function isReplyAlreadyDisplayed(message = {}) {
    const ids = collectReplyIds(message);
    return ids.some((id) => displayedReplyIds.has(id));
  }

  function isReplyAlreadySpoken(message = {}) {
    const ids = collectReplyIds(message);
    return ids.some((id) => spokenReplyIds.has(id));
  }

  function markReplyDisplayed(message = {}) {
    for (const id of collectReplyIds(message)) {
      displayedReplyIds.add(id);
      trimReplyIdSet(displayedReplyIds);
    }
  }

  function markReplySpoken(message = {}) {
    for (const id of collectReplyIds(message)) {
      spokenReplyIds.add(id);
      trimReplyIdSet(spokenReplyIds);
    }
  }

  function setSessionUiLocked(locked) {
    state.sessionUiLocked = Boolean(locked);
    document.body.classList.toggle("shell-session-active", state.sessionUiLocked);
    deps.nodes?.shellApp?.classList.toggle("shell-session-active", state.sessionUiLocked);
  }

  function releaseSessionUiLock() {
    if (state.messagePipelineBusy || state.processingMessage) return;
    if (state.speaking || state.streamTtsActive || state.streamTtsQueue?.length) return;
    if (state.assistantStream && !state.assistantStream.finalized) return;
    setSessionUiLocked(false);
  }

  function shouldBlockPhaseUpdate(phase = "waiting") {
    if (!state.sessionUiLocked) return false;
    const key = phase || "waiting";
    return key !== "thinking" && key !== "speaking" && key !== "listening";
  }

  function rememberPhase(phase = "waiting") {
    lastPhaseKey = phase || "waiting";
  }

  function shouldSkipDuplicatePhase(phase = "waiting") {
    if (!state.sessionUiLocked) return false;
    return (phase || "waiting") === lastPhaseKey;
  }

  function resetStreamRenderState() {
    pendingStreamText = "";
    lastRenderedStreamKey = "";
    if (streamRenderTimer) {
      clearTimeout(streamRenderTimer);
      streamRenderTimer = 0;
    }
  }

  function queueStreamingRender(text, renderFn) {
    const value = String(text || "");
    pendingStreamText = value;
    const renderKey = `s:${value.length}:${value.slice(-120)}`;
    if (!value || renderKey === lastRenderedStreamKey) return;

    // First paint immediately — TTFT matters more than batching the opening tokens.
    if (!lastRenderedStreamKey) {
      lastRenderedStreamKey = renderKey;
      renderFn(value);
      return;
    }

    if (streamRenderTimer) return;
    streamRenderTimer = window.setTimeout(() => {
      streamRenderTimer = 0;
      const next = pendingStreamText;
      const nextKey = `s:${next.length}:${next.slice(-120)}`;
      if (!next || nextKey === lastRenderedStreamKey) return;
      lastRenderedStreamKey = nextKey;
      renderFn(next);
    }, STREAM_RENDER_MS);
  }

  function flushStreamingRender(renderFn) {
    if (streamRenderTimer) {
      clearTimeout(streamRenderTimer);
      streamRenderTimer = 0;
    }
    const value = pendingStreamText;
    pendingStreamText = "";
    if (!value) return;
    lastRenderedStreamKey = `f:${value.length}:${value.slice(-120)}`;
    renderFn(value);
  }

  async function reconnect({ soft = false } = {}) {
    if (!state.agentId || reconnectBusy) return;
    reconnectBusy = true;
    try {
      deps.syncConnectionState?.(soft ? "connecting" : "offline");
      if (soft && !state.sessionUiLocked) {
        deps.renderReconnectPhrase?.();
      }
      deps.shellDialog?.clearError?.();
      deps.closeStream?.();
      deps.connectStream?.();
      const opened = await waitForEventSourceOpen(() => state.eventSource, soft ? 5000 : 8000);
      try {
        await deps.refreshStatus?.({ timeoutMs: soft ? 8000 : 12000 });
      } catch (statusError) {
        if (!opened) throw statusError;
      }
      deps.syncConnectionState?.();
    } catch (error) {
      deps.shellDialog?.setError?.("Не удалось переподключиться", {
        hint: deps.shellDialog?.connectionHint?.(error) || ""
      });
      deps.syncConnectionState?.("error");
    } finally {
      reconnectBusy = false;
    }
  }

  return {
    collectReplyIds,
    isReplyAlreadyDisplayed,
    isReplyAlreadySpoken,
    markReplyDisplayed,
    markReplySpoken,
    setSessionUiLocked,
    releaseSessionUiLock,
    shouldBlockPhaseUpdate,
    shouldSkipDuplicatePhase,
    rememberPhase,
    resetStreamRenderState,
    queueStreamingRender,
    flushStreamingRender,
    reconnect
  };
}
