import {
  SHELL_API,
  SHELL_SSE,
  pickShellReply,
  unwrapAssistantMessage,
  unwrapShellState
} from "/shell/shell-contract.js?v=1";
import { getShellClientId } from "/shell/shell-client-id.js?v=1";
import { getShellSurfacePayload } from "/shell/shell-surface.js?v=2";

export class ShellClient {
  constructor({
    agentId = "",
    origin = typeof window !== "undefined" ? window.location.origin : "",
    onStreamEvent = () => {},
    onConnectionChange = () => {}
  } = {}) {
    this.agentId = agentId;
    this.origin = origin;
    this.onStreamEvent = onStreamEvent;
    this.onConnectionChange = onConnectionChange;
    this.eventSource = null;
    this.reconnectTimer = null;
    this.reconnectAttempt = 0;
    this.closed = false;
  }

  setAgentId(agentId) {
    this.agentId = String(agentId || "").trim();
  }

  apiUrl(path, params = {}) {
    const url = new URL(path, this.origin);
    if (this.agentId) url.searchParams.set("agent", this.agentId);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, value);
      }
    }
    return url.toString();
  }

  async apiFetch(path, options = {}) {
    const response = await fetch(this.apiUrl(path), {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.details || data.error || `HTTP ${response.status}`);
    }
    return data;
  }

  fetchStatus() {
    return this.apiFetch(SHELL_API.status);
  }

  sendMessage(body, { voice = false, author = "shell", signal, extra = {} } = {}) {
    return this.apiFetch(SHELL_API.message, {
      method: "POST",
      body: JSON.stringify({
        body: String(body || "").trim(),
        author,
        voice: Boolean(voice),
        shellClientId: getShellClientId(),
        ...getShellSurfacePayload(),
        ...extra
      }),
      signal
    });
  }

  synthesizeTts(text, { signal } = {}) {
    return this.apiFetch(SHELL_API.ttsSynthesize, {
      method: "POST",
      body: JSON.stringify({ text: String(text || "").trim() }),
      signal
    });
  }

  stopTts() {
    return this.apiFetch(SHELL_API.stopTts, { method: "POST", body: JSON.stringify({}) });
  }

  connectStream() {
    this.closed = false;
    this.disconnectStream({ keepClosed: false });
    if (!this.agentId || typeof EventSource === "undefined") return;

    const source = new EventSource(this.apiUrl(SHELL_API.stream));
    this.eventSource = source;

    source.onopen = () => {
      this.reconnectAttempt = 0;
      this.onConnectionChange({ state: "live" });
    };

    source.onerror = () => {
      this.onConnectionChange({ state: "error" });
      this.scheduleReconnect();
    };

    for (const eventName of Object.values(SHELL_SSE)) {
      source.addEventListener(eventName, (event) => {
        try {
          this.dispatchStreamEvent(eventName, JSON.parse(event.data));
        } catch {
          // ignore malformed SSE payload
        }
      });
    }
  }

  dispatchStreamEvent(type, data) {
    if (type === SHELL_SSE.status) {
      this.onStreamEvent({ type: "status", status: data });
      return;
    }
    if (type === SHELL_SSE.state) {
      this.onStreamEvent({ type: "state", state: unwrapShellState(data) });
      return;
    }
    if (type === SHELL_SSE.assistantMessage) {
      this.onStreamEvent({ type: "assistant_message", message: unwrapAssistantMessage(data) });
      return;
    }
    if (type === SHELL_SSE.assistantDelta) {
      this.onStreamEvent({ type: "assistant_delta", delta: data });
      return;
    }
    if (type === SHELL_SSE.settings) {
      this.onStreamEvent({ type: "settings", settings: data?.payload || data });
      return;
    }
    this.onStreamEvent({ type, data });
  }

  scheduleReconnect() {
    if (this.closed || this.reconnectTimer) return;
    this.eventSource?.close();
    this.eventSource = null;
    const delay = Math.min(30_000, 1000 * 2 ** this.reconnectAttempt);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.closed) this.connectStream();
    }, delay);
  }

  disconnectStream({ keepClosed = true } = {}) {
    if (keepClosed) this.closed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.eventSource?.close();
    this.eventSource = null;
    this.onConnectionChange({ state: "offline" });
  }

  static applyStatus(status) {
    const state = unwrapShellState(status?.state || {});
    return {
      phase: state.phase || "waiting",
      phrase: state.phrase || "",
      reply: pickShellReply(status),
      messageTarget: status?.settings?.messageTarget || "",
      qwenpawOk: Boolean(status?.qwenpaw?.ok)
    };
  }
}
