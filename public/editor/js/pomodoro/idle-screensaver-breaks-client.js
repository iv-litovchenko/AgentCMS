(function initIdleScreensaverBreaksClient(global) {
  "use strict";

  const BREAKS_API_PATH = "/api/workspace/idle-screensaver/breaks";

  function localDateKey(now = new Date()) {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseBreaksRecord(record) {
    const today = localDateKey();
    if (!record || typeof record !== "object") {
      return { date: today, count: 0 };
    }
    const date = String(record.date || "").trim();
    const count = Number(record.count);
    if (date === today && Number.isFinite(count) && count >= 0) {
      return { date, count: Math.floor(count) };
    }
    return { date: today, count: 0 };
  }

  function buildBreaksApiUrl(agentId, getAgentId) {
    const id = String(agentId || (typeof getAgentId === "function" ? getAgentId() : "") || "main").trim() || "main";
    return `${BREAKS_API_PATH}?agent=${encodeURIComponent(id)}`;
  }

  /**
   * @param {{ getAgentId?: () => string, countNode?: HTMLElement | null, rowNode?: HTMLElement | null }} options
   */
  function createCounter(options = {}) {
    const getAgentId = typeof options.getAgentId === "function" ? options.getAgentId : () => "main";
    const countNode = options.countNode || null;
    const rowNode = options.rowNode || null;

    let breaksCountToday = 0;
    let persistPromise = null;

    function render() {
      if (!countNode) return;
      const label = String(breaksCountToday);
      countNode.textContent = label;
      if (rowNode) {
        rowNode.setAttribute("aria-label", `Перерывов сегодня: ${label}`);
      }
    }

    async function load(agentId) {
      const today = localDateKey();
      try {
        const response = await fetch(buildBreaksApiUrl(agentId, getAgentId), { credentials: "same-origin" });
        if (!response.ok) {
          breaksCountToday = 0;
          render();
          return breaksCountToday;
        }
        const data = await response.json();
        const parsed = parseBreaksRecord(data?.breaks);
        breaksCountToday = parsed.date === today ? parsed.count : 0;
      } catch {
        breaksCountToday = 0;
      }
      render();
      return breaksCountToday;
    }

    async function persistBreaksCount(agentId, count) {
      const response = await fetch(buildBreaksApiUrl(agentId, getAgentId), {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: localDateKey(),
          count: Math.max(0, Math.floor(count))
        })
      });
      if (!response.ok) return false;
      const data = await response.json();
      return !data?.error;
    }

    function recordDismissed() {
      breaksCountToday += 1;
      render();
      const agentId = getAgentId();
      const nextCount = breaksCountToday;
      persistPromise = Promise.resolve(persistPromise)
        .catch(() => {})
        .then(() => persistBreaksCount(agentId, nextCount))
        .catch(() => false);
      return persistPromise;
    }

    return {
      load,
      recordDismissed,
      render,
      getCount: () => breaksCountToday
    };
  }

  global.IdleScreensaverBreaksClient = {
    createCounter,
    localDateKey,
    parseBreaksRecord,
    BREAKS_API_PATH
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
