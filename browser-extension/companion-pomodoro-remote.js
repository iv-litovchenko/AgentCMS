(function initCompanionPomodoroRemote(global) {
  const SETTING_WORK = "workspace-pomodoro-work-minutes";
  const SETTING_BREAK = "workspace-pomodoro-break-minutes";

  const ALLOWED_WORK = new Set([1, 5, 25, 45, 60]);
  const ALLOWED_BREAK = new Set([5, 10, 15, 60]);

  function parseWorkMinutes(value) {
    const minutes = parseInt(String(value ?? "25").trim(), 10);
    return ALLOWED_WORK.has(minutes) ? minutes : 25;
  }

  function parseBreakMinutes(value) {
    const minutes = parseInt(String(value ?? "5").trim(), 10);
    return ALLOWED_BREAK.has(minutes) ? minutes : 5;
  }

  function cmsBase(config) {
    return String(config?.cmsBaseUrl || "").replace(/\/$/, "");
  }

  function agentId(config) {
    return String(config?.agentId || "main").trim() || "main";
  }

  function stateUrl(config) {
    const base = cmsBase(config);
    if (!base) return "";
    return `${base}/api/workspace/pomodoro/state?agent=${encodeURIComponent(agentId(config))}`;
  }

  function settingsUrl(config) {
    const base = cmsBase(config);
    if (!base) return "";
    return `${base}/api/workspace/settings?agent=${encodeURIComponent(agentId(config))}`;
  }

  async function fetchRemoteSnapshot(config) {
    const url = stateUrl(config);
    if (!url) return { ok: false, offline: true, snapshot: null };
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) return { ok: false, offline: false, snapshot: null };
      const data = await response.json();
      const P = global.CompanionPomodoro;
      return {
        ok: true,
        offline: false,
        snapshot: P?.snapshotFromApiResponse?.(data) ?? null
      };
    } catch {
      return { ok: false, offline: true, snapshot: null };
    }
  }

  async function writeRemoteSnapshot(config, body) {
    const url = stateUrl(config);
    if (!url) return false;
    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function fetchWorkspacePomodoroSettings(config) {
    const url = settingsUrl(config);
    if (!url) return null;
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) return null;
      const data = await response.json();
      const settings = data?.settings || {};
      return {
        workMinutes: parseWorkMinutes(settings[SETTING_WORK]),
        breakMinutes: parseBreakMinutes(settings[SETTING_BREAK])
      };
    } catch {
      return null;
    }
  }

  global.CompanionPomodoroRemote = {
    fetchRemoteSnapshot,
    writeRemoteSnapshot,
    fetchWorkspacePomodoroSettings
  };
})(globalThis);
