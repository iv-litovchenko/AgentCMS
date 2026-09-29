(function () {
  "use strict";

  const HEALTH_URL = "/api/docs-meta";
  const LIVE_POLL_MS = 30000;
  const LOST_POLL_MS = 4000;
  const FETCH_NETWORK_RE = /Failed to fetch|NetworkError|Load failed|Network request failed/i;

  const bannerNode = document.getElementById("app-connection-lost");
  const detailNode = document.getElementById("app-connection-lost-detail");
  const retryBtn = document.getElementById("app-connection-lost-retry");
  const dismissBtn = document.getElementById("app-connection-lost-dismiss");

  let state = "unknown";
  let pollTimer = null;
  let dismissed = false;
  let hadSuccessfulPing = false;
  let checkSeq = 0;
  let checking = false;

  function isApiUrl(input) {
    const url = typeof input === "string" ? input : String(input?.url || "");
    return url.includes("/api/");
  }

  function isNetworkFailure(error) {
    const message = String(error?.message || error || "");
    return FETCH_NETWORK_RE.test(message) || error?.name === "TypeError";
  }

  function defaultDetail(nextState) {
    if (nextState === "offline") {
      return "Нет доступа к сети. Дождитесь восстановления интернета.";
    }
    return "Сервер не отвечает. Проверьте, что npm start запущен, и нажмите «Повторить».";
  }

  function syncBannerVisibility() {
    const show = (state === "lost" || state === "offline") && !dismissed;
    bannerNode?.classList.toggle("hidden", !show);
  }

  function setState(nextState, detail = "") {
    if (nextState === "live") {
      dismissed = false;
      hadSuccessfulPing = true;
    }
    if (nextState === state && !detail) {
      syncBannerVisibility();
      return;
    }

    state = nextState;
    if (bannerNode) bannerNode.dataset.state = nextState;
    if (detailNode) detailNode.textContent = detail || defaultDetail(nextState);
    syncBannerVisibility();
    schedulePoll();
  }

  async function pingServer({ force = false } = {}) {
    if (checking && !force) return hadSuccessfulPing;
    checking = true;
    if (retryBtn) retryBtn.disabled = true;

    const requestId = ++checkSeq;
    try {
      const response = await fetch(`${HEALTH_URL}?ts=${Date.now()}`, {
        cache: "no-store",
        headers: { Accept: "application/json" }
      });
      if (requestId !== checkSeq) return hadSuccessfulPing;
      if (!response.ok) {
        if (state === "lost" || state === "offline") setState("live");
        return true;
      }
      setState("live");
      return true;
    } catch (error) {
      if (requestId !== checkSeq) return hadSuccessfulPing;
      if (navigator.onLine === false) {
        setState("offline");
      } else if (hadSuccessfulPing || state === "lost" || state === "offline" || state === "unknown") {
        setState("lost");
      }
      return false;
    } finally {
      checking = false;
      if (retryBtn) retryBtn.disabled = false;
    }
  }

  function schedulePoll() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (document.hidden) return;
    const interval = state === "live" ? LIVE_POLL_MS : LOST_POLL_MS;
    pollTimer = setInterval(() => {
      void pingServer();
    }, interval);
  }

  function reportFailure(detail = "") {
    if (navigator.onLine === false) {
      setState("offline", detail);
      return;
    }
    if (hadSuccessfulPing || state === "live" || state === "lost" || state === "offline") {
      setState("lost", detail);
    }
  }

  function reportSuccess() {
    if (state !== "live") setState("live");
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async function patchedFetch(input, init) {
    try {
      const response = await nativeFetch(input, init);
      if (isApiUrl(input) && response.ok) reportSuccess();
      return response;
    } catch (error) {
      if (isApiUrl(input) && isNetworkFailure(error)) reportFailure();
      throw error;
    }
  };

  window.addEventListener("online", () => {
    dismissed = false;
    void pingServer({ force: true });
  });
  window.addEventListener("offline", () => setState("offline"));
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void pingServer({ force: true });
    schedulePoll();
  });

  retryBtn?.addEventListener("click", () => {
    dismissed = false;
    if (detailNode) detailNode.textContent = "Проверяем соединение…";
    void pingServer({ force: true });
  });

  dismissBtn?.addEventListener("click", () => {
    dismissed = true;
    syncBannerVisibility();
  });

  void pingServer({ force: true }).then((ok) => {
    if (!ok && navigator.onLine !== false) setState("lost");
  });
  schedulePoll();

  window.agentCmsConnectionStatus = {
    reportFailure,
    reportSuccess,
    ping: pingServer,
    getState: () => state
  };
})();
