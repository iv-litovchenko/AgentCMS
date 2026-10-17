const LEADER_STORAGE_KEY = "agentcms.shellTtsLeader.v1";
const LEADER_STALE_MS = 5000;

function readStoredLeader() {
  try {
    const raw = localStorage.getItem(LEADER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.tabId || !parsed?.ts) return null;
    if (Date.now() - Number(parsed.ts) > LEADER_STALE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredLeader(tabId) {
  try {
    localStorage.setItem(
      LEADER_STORAGE_KEY,
      JSON.stringify({ tabId, ts: Date.now() })
    );
  } catch {
    // ignore quota / private mode
  }
}

function clearStoredLeader(tabId) {
  try {
    const current = readStoredLeader();
    if (current?.tabId === tabId) localStorage.removeItem(LEADER_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function createShellTtsTabCoordinator({ onYieldSpeech } = {}) {
  const tabId =
    sessionStorage.getItem("agentcms.shellTabId") ||
    (() => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `tab-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem("agentcms.shellTabId", id);
      return id;
    })();

  let isLeader = false;
  let leaderTabId = readStoredLeader()?.tabId || null;
  const channel =
    typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("agentcms-shell-tts") : null;

  function syncLeaderFromStorage() {
    const stored = readStoredLeader();
    leaderTabId = stored?.tabId || null;
    isLeader = leaderTabId === tabId;
  }

  function broadcast(message) {
    channel?.postMessage({ ...message, tabId, ts: Date.now() });
  }

  function applyForeignLeader(nextTabId) {
    if (!nextTabId || nextTabId === tabId) return;
    leaderTabId = nextTabId;
    if (isLeader) {
      isLeader = false;
      onYieldSpeech?.("leader-lost");
    }
  }

  function claimLeader({ force = false } = {}) {
    if (document.visibilityState === "hidden" && !force) return false;

    const stored = readStoredLeader();
    if (stored?.tabId && stored.tabId !== tabId && Date.now() - Number(stored.ts) <= LEADER_STALE_MS) {
      if (document.hasFocus?.() === false && !force) {
        syncLeaderFromStorage();
        return isLeader;
      }
    }

    isLeader = true;
    leaderTabId = tabId;
    writeStoredLeader(tabId);
    broadcast({ type: "leader-claim" });
    return true;
  }

  function releaseLeader() {
    if (!isLeader) return;
    isLeader = false;
    clearStoredLeader(tabId);
    broadcast({ type: "leader-release" });
  }

  function requestGlobalStop() {
    broadcast({ type: "stop-tts" });
  }

  function onChannelMessage(event) {
    const data = event?.data || {};
    if (data.tabId === tabId) return;

    if (data.type === "leader-claim") {
      applyForeignLeader(data.tabId);
      writeStoredLeader(data.tabId);
      return;
    }

    if (data.type === "leader-release") {
      if (leaderTabId === data.tabId) {
        leaderTabId = null;
        if (document.visibilityState === "visible") claimLeader();
      }
      return;
    }

    if (data.type === "stop-tts") {
      onYieldSpeech?.("remote-stop");
    }
  }

  channel?.addEventListener("message", onChannelMessage);
  window.addEventListener("storage", (event) => {
    if (event.key !== LEADER_STORAGE_KEY) return;
    const stored = readStoredLeader();
    if (stored?.tabId && stored.tabId !== tabId) applyForeignLeader(stored.tabId);
  });

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") {
      releaseLeader();
      return;
    }
    claimLeader();
  }

  function onWindowFocus() {
    claimLeader();
  }

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("focus", onWindowFocus);

  syncLeaderFromStorage();
  if (document.visibilityState === "visible") claimLeader();

  return {
    tabId,
    isLeader: () => {
      syncLeaderFromStorage();
      return isLeader;
    },
    claimLeader,
    releaseLeader,
    requestGlobalStop,
    destroy() {
      releaseLeader();
      channel?.removeEventListener("message", onChannelMessage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
      channel?.close();
    }
  };
}
