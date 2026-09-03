import { getShellPresenceClientId } from "@shell/client-id";
import { getShellSurfacePayload } from "@shell/surface";

/** Временно выключено — heartbeat /api/shell/presence каждые ~2.5 с. */
export const SHELL_PRESENCE_ENABLED = false;

const HEARTBEAT_MS = 2500;

const disabledPresenceController = {
  ping: async () => null,
  setAgentId: () => {},
  stop: () => {}
};
const PRESENCE_CHANNEL = "agentcms-shell-presence";

function buildPresenceBody(options = {}) {
  return {
    shellClientId: getShellPresenceClientId(),
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
 *   onPresenceChange?: (payload: object) => void,
 * }} options
 */
export function initShellPresence(options = {}) {
  if (!SHELL_PRESENCE_ENABLED) return disabledPresenceController;

  let agentId = String(options.agentId || "").trim();
  let timer = null;
  let stopped = false;
  const channel =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(PRESENCE_CHANNEL) : null;

  function notifyPresenceChange(data) {
    if (data && typeof options.onPresenceChange === "function") {
      options.onPresenceChange(data);
    }
  }

  function broadcastPresence(data) {
    channel?.postMessage({ type: "presence-update", payload: data, tabId: getShellPresenceClientId() });
  }

  async function ping(pingOptions = {}) {
    if (stopped || !agentId) return null;
    const body = buildPresenceBody({
      getMicActive: options.getMicActive,
      getPttHeld: options.getPttHeld,
      interact: pingOptions.interact
    });
    try {
      let data = null;
      if (typeof options.apiFetch === "function") {
        data = await options.apiFetch("/api/shell/presence", {
          method: "POST",
          body: JSON.stringify(body)
        });
      } else {
        const url = new URL("/api/shell/presence", window.location.origin);
        url.searchParams.set("agent", agentId);
        const response = await fetch(url.toString(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        });
        data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.details || data.error || `HTTP ${response.status}`);
        }
      }
      notifyPresenceChange(data);
      broadcastPresence(data);
      return data;
    } catch {
      return null;
    }
  }

  function scheduleHeartbeat() {
    if (timer) window.clearInterval(timer);
    timer = window.setInterval(() => {
      void ping();
    }, Math.max(1500, Number(options.heartbeatMs) || HEARTBEAT_MS));
  }

  function onVisibilityChange() {
    const interact = document.visibilityState === "visible" && document.hasFocus?.();
    void ping({ interact: Boolean(interact) });
  }

  function onWindowFocus() {
    void ping({ interact: true });
  }

  function onWindowBlur() {
    void ping();
  }

  function onChannelMessage(event) {
    const data = event?.data || {};
    if (data.tabId === getShellPresenceClientId()) return;
    if (data.type === "presence-update" && data.payload) {
      notifyPresenceChange(data.payload);
      return;
    }
    if (data.type === "presence-refresh") {
      void ping();
    }
  }

  function setAgentId(nextAgentId) {
    agentId = String(nextAgentId || "").trim();
    void ping({ interact: true });
  }

  function start() {
    stopped = false;
    void ping({ interact: true });
    scheduleHeartbeat();
    channel?.addEventListener("message", onChannelMessage);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("focusin", onWindowFocus);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("pageshow", onWindowFocus);
  }

  function stop() {
    stopped = true;
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
    channel?.removeEventListener("message", onChannelMessage);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("focus", onWindowFocus);
    window.removeEventListener("focusin", onWindowFocus);
    window.removeEventListener("blur", onWindowBlur);
    window.removeEventListener("pageshow", onWindowFocus);
  }

  start();

  return {
    ping,
    setAgentId,
    stop
  };
}
