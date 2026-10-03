(function initCompanionPomodoroServiceWorker(global) {
  const P = global.CompanionPomodoro;
  if (!P) return;

  let cachedState = P.defaultState();

  function storageLocal() {
    return global.chrome?.storage?.local;
  }

  async function loadState() {
    const stored = await storageLocal().get(P.STORAGE_KEY);
    cachedState = P.normalizeState(stored[P.STORAGE_KEY]);
    if (cachedState.phase !== "idle" && cachedState.phaseEndsAt <= Date.now()) {
      if (cachedState.phase === "work") {
        cachedState = await enterBreakInternal(cachedState, true);
      } else {
        cachedState = P.normalizeState({ ...cachedState, phase: "idle", phaseEndsAt: 0 });
        await persistState(cachedState);
      }
    }
    return cachedState;
  }

  async function persistState(state) {
    cachedState = P.normalizeState(state);
    await storageLocal().set({ [P.STORAGE_KEY]: cachedState });
    await schedulePhaseAlarm(cachedState);
    await broadcastState();
    return cachedState;
  }

  async function clearPhaseAlarm() {
    try {
      await chrome.alarms.clear(P.ALARM_PHASE);
    } catch {
      // ignore
    }
  }

  async function schedulePhaseAlarm(state) {
    await clearPhaseAlarm();
    if (state.phase !== "work" && state.phase !== "break") return;
    const when = Number(state.phaseEndsAt);
    if (!when || when <= Date.now()) return;
    try {
      await chrome.alarms.create(P.ALARM_PHASE, { when });
    } catch {
      // ignore
    }
  }

  async function broadcastState() {
    const snap = P.snapshotForClients(cachedState);
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url || tab.url.startsWith("chrome://")) continue;
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "COMPANION_POMODORO_SYNC",
          state: snap
        });
      } catch {
        // no content script
      }
    }
  }

  async function enterBreakInternal(state, fromWorkEnd) {
    const next = P.normalizeState(state);
    if (fromWorkEnd) {
      const day = P.todayKey();
      let breaksToday = next.breaksToday;
      if (next.breaksTodayDate !== day) breaksToday = 0;
      breaksToday += 1;
      next.breaksToday = breaksToday;
      next.breaksTodayDate = day;
    }
    next.phase = "break";
    next.phaseEndsAt = Date.now() + P.breakMs(next);
    await persistState(next);
    return next;
  }

  async function startWork() {
    const state = await loadState();
    if (state.phase === "work") return state;
    const next = {
      ...state,
      phase: "work",
      phaseEndsAt: Date.now() + P.workMs(state)
    };
    return persistState(next);
  }

  async function stopSession() {
    const next = P.defaultState();
    next.workMinutes = cachedState.workMinutes;
    next.breakMinutes = cachedState.breakMinutes;
    next.breaksToday = cachedState.breaksToday;
    next.breaksTodayDate = cachedState.breaksTodayDate;
    await persistState(next);
    return next;
  }

  async function breakDone() {
    const state = await loadState();
    if (state.phase !== "break") return state;
    const next = {
      ...state,
      phase: "idle",
      phaseEndsAt: 0
    };
    return persistState(next);
  }

  async function onPhaseAlarm() {
    const state = await loadState();
    if (state.phase === "work" && state.phaseEndsAt <= Date.now()) {
      await enterBreakInternal(state, true);
      return;
    }
    if (state.phase === "break" && state.phaseEndsAt <= Date.now()) {
      await broadcastState();
    }
  }

  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm?.name === P.ALARM_PHASE) {
      void onPhaseAlarm();
    }
  });

  global.CompanionPomodoroService = {
    loadState,
    persistState,
    startWork,
    stopSession,
    breakDone,
    onPhaseAlarm,
    getCachedState: () => P.snapshotForClients(cachedState),
    async init() {
      await loadState();
      await broadcastState();
    }
  };

  void global.CompanionPomodoroService.init();
})(globalThis);
