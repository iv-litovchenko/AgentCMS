(function initCompanionPomodoroGlobal(global) {
  const STORAGE_KEY = "asc-companion-pomodoro.v1";
  const ALARM_PHASE = "asc-companion-pomodoro-phase";
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
      breaksTodayDate: todayKey()
    };
  }

  function normalizeState(raw) {
    const base = defaultState();
    if (!raw || typeof raw !== "object") return base;
    const phase = String(raw.phase || "idle");
    const phaseEndsAt = Number(raw.phaseEndsAt) || 0;
    const workMinutes = Number(raw.workMinutes) || DEFAULT_WORK_MINUTES;
    const breakMinutes = Number(raw.breakMinutes) || DEFAULT_BREAK_MINUTES;
    let breaksToday = Number(raw.breaksToday) || 0;
    const breaksTodayDate = String(raw.breaksTodayDate || todayKey());
    if (breaksTodayDate !== todayKey()) {
      breaksToday = 0;
    }
    if (phase !== "work" && phase !== "break") {
      return { ...base, workMinutes, breakMinutes, breaksToday, breaksTodayDate: todayKey() };
    }
    return {
      phase,
      phaseEndsAt,
      workMinutes,
      breakMinutes,
      breaksToday,
      breaksTodayDate: todayKey()
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
    todayKey
  };
})(globalThis);
