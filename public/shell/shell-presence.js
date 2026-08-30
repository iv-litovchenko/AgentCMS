import { getShellClientId } from "@shell/client-id";
import { getShellSurfacePayload } from "@shell/surface";

/** Авто-ping (heartbeat / focus / visibility). Выключено — только ручной ping({ interact: true }). */
const PRESENCE_AUTOPING_ENABLED = false;

const HEARTBEAT_MS = 8000;

function buildPresenceBody(options = {}) {
  return {
    shellClientId: getShellClientId(),
    ...getShellSurfacePayload(),
    hostUrl: typeof window !== "undefined" ? window.location.href : "",
    visibility: typeof document !== "undefined" ? document.visibilityState : "visible",
    hasFocus: typeof document !== "undefined" ? Boolean(document.hasFocus?.()) : false,
    micActive: Boolean(options.getMicActive?.()),
    pttHeld: Boolean(options.getPttHeld?.()),
    interact: Boolean(options.interact)
  };
}

/**
 * @param {{
 *   agentId: string,
 *   apiFetch?: (path: string, options?: object) => Promise<any>,
 *   getMicActive?: () => boolean,
 *   getPttHeld?: () => boolean,
 *   heartbeatMs?: number,
 * }} options
 */
export function initShellPresence(options = {}) {
  let agentId = String(options.agentId || "").trim();
  let timer = null;
  let stopped = false;

  async function ping(pingOptions = {}) {
    if (stopped || !agentId) return null;
    const body = buildPresenceBody({
      getMicActive: options.getMicActive,
      getPttHeld: options.getPttHeld,
      interact: pingOptions.interact
    });
    try {
      if (typeof options.apiFetch === "function") {
        return await options.apiFetch("/api/shell/presence", {
          method: "POST",
          body: JSON.stringify(body)
        });
      }
      const url = new URL("/api/shell/presence", window.location.origin);
      url.searchParams.set("agent", agentId);
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.details || data.error || `HTTP ${response.status}`);
      }
      return data;
    } catch {
      return null;
    }
  }

  function scheduleHeartbeat() {
    if (timer) window.clearInterval(timer);
    timer = window.setInterval(() => {
      void ping();
    }, Math.max(3000, Number(options.heartbeatMs) || HEARTBEAT_MS));
  }

  function onVisibilityChange() {
    void ping();
  }

  function onWindowFocus() {
    void ping({ interact: true });
  }

  function setAgentId(nextAgentId) {
    agentId = String(nextAgentId || "").trim();
    if (PRESENCE_AUTOPING_ENABLED) void ping();
  }

  function start() {
    stopped = false;
    if (!PRESENCE_AUTOPING_ENABLED) return;
    void ping();
    scheduleHeartbeat();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);
  }

  function stop() {
    stopped = true;
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", onWindowFocus);
  }

  start();

  return {
    ping,
    setAgentId,
    stop
  };
}
