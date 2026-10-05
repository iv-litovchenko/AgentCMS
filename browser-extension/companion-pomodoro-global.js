(function initCompanionPomodoroGlobal(global) {
  const STORAGE_KEY = "asc-companion-pomodoro.v1";
  const ALARM_PHASE = "asc-companion-pomodoro-phase";
  const ALARM_SYNC = "asc-companion-pomodoro-sync";
  const SYNC_INTERVAL_MINUTES = 1;
  const PERSIST_MS = 15_000;
  const DEFAULT_WORK_MINUTES = 25;
  const DEFAULT_BREAK_MINUTES = 5;

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function defaultState() {
    return {
      phase: "idle",
      phaseEndsAt: 0,
      workMinutes: DEFAULT_WORK_MINUTES,
      breakMinutes: DEFAULT_BREAK_MINUTES,
      breaksToday: 0,
      breaksTodayDate: todayKey(),
      updatedAt: 0
    };
  }

  function normalizeState(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;
    const phase = String(raw.phase || "idle");
    const phaseEndsAt = Number(raw.phaseEndsAt) || 0;
    const workMinutes = Number(raw.workMinutes) || DEFAULT_WORK_MINUTES;
    const breakMinutes = Number(raw.breakMinutes) || DEFAULT_BREAK_MINUTES;
    const updatedAt = Number(raw.updatedAt) || 0;
    let breaksToday = Number(raw.breaksToday) || 0;
    const breaksTodayDate = String(raw.breaksTodayDate || todayKey());
    if (breaksTodayDate !== todayKey()) {
      breaksToday = 0;
    }
    if (phase !== "work" && phase !== "break") {
      return {
        ...base,
        workMinutes,
        breakMinutes,
        breaksToday,
        breaksTodayDate: todayKey(),
        updatedAt
      };
    }
    return {
      phase,
      phaseEndsAt,
      workMinutes,
      breakMinutes,
      breaksToday,
      breaksTodayDate: todayKey(),
      updatedAt
    };
  }

  function snapshotFromApiResponse(data) {
    const state = data?.state;
    if (!state || typeof state !== "object") return null;
    const phase = String(state.phase || "").trim();
    const phaseEndsAt = Number(state.phaseEndsAt);
    if (phase !== "work" && phase !== "break") return null;
    if (!Number.isFinite(phaseEndsAt) || phaseEndsAt <= 0) return null;
    const updatedMs = Date.parse(state.updatedAt);
    return {
      phase,
      phaseEndsAt,
      workMinutes: state.workMinutes != null ? Number(state.workMinutes) : null,
      breakMinutes: state.breakMinutes != null ? Number(state.breakMinutes) : null,
      updatedAt: Number.isFinite(updatedMs) ? updatedMs : Date.now()
    };
  }

  function pickNewestSnapshot(local, remote) {
    if (!local && !remote) return null;
    if (!local) return remote;
    if (!remote) return local;
    const localAt = Number(local.updatedAt) || 0;
    const remoteAt = Number(remote.updatedAt) || 0;
    return remoteAt >= localAt ? remote : local;
  }

  function toActiveSnapshot(state) {
    const s = normalizeState(state);
    if (s.phase === "idle") return null;
    return {
      phase: s.phase,
      phaseEndsAt: s.phaseEndsAt,
      workMinutes: s.workMinutes,
      breakMinutes: s.breakMinutes,
      updatedAt: s.updatedAt || Date.now()
    };
  }

  function stateFromSnapshot(snapshot, base) {
    const next = normalizeState(base);
    if (!snapshot) {
      return normalizeState({
        ...next,
        phase: "idle",
        phaseEndsAt: 0,
        updatedAt: next.updatedAt || 0
      });
    }
    return normalizeState({
      ...next,
      phase: snapshot.phase,
      phaseEndsAt: snapshot.phaseEndsAt,
      workMinutes: snapshot.workMinutes ?? next.workMinutes,
      breakMinutes: snapshot.breakMinutes ?? next.breakMinutes,
      updatedAt: snapshot.updatedAt
    });
  }

  function toApiBody(state) {
    const s = normalizeState(state);
    const now = Date.now();
    if (s.phase === "idle") {
      return { phase: "idle", phaseEndsAt: 0, updatedAt: now };
    }
    return {
      phase: s.phase,
      phaseEndsAt: s.phaseEndsAt,
      workMinutes: s.workMinutes,
      breakMinutes: s.breakMinutes,
      updatedAt: s.updatedAt || now
    };
  }

  function formatMmSs(remainingMs) {
    const sec = Math.max(0, Math.ceil(remainingMs / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function workMs(state) {
    return (Number(state?.workMinutes) || DEFAULT_WORK_MINUTES) * 60_000;
  }

  function breakMs(state) {
    return (Number(state?.breakMinutes) || DEFAULT_BREAK_MINUTES) * 60_000;
  }

  function snapshotForClients(state) {
    const s = normalizeState(state);
    const now = Date.now();
    const remainingMs =
      s.phase === "idle" ? 0 : Math.max(0, s.phaseEndsAt - now);
    return {
      ...s,
      remainingMs,
      serverNow: now
    };
  }

  global.CompanionPomodoro = {
    STORAGE_KEY,
    ALARM_PHASE,
    DEFAULT_WORK_MINUTES,
    DEFAULT_BREAK_MINUTES,
    defaultState,
    normalizeState,
    formatMmSs,
    workMs,
    breakMs,
    snapshotForClients,
    snapshotFromApiResponse,
    pickNewestSnapshot,
    toActiveSnapshot,
    stateFromSnapshot,
    toApiBody,
    todayKey,
    ALARM_SYNC,
    SYNC_INTERVAL_MINUTES,
    PERSIST_MS
  };
})(globalThis);
