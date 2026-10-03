(function initCompanionPomodoroServiceWorker(global) {
  const P = global.CompanionPomodoro;
  const R = global.CompanionPomodoroRemote;
  if (!P || !R) return;

  let cachedState = P.defaultState();
  let getCompanionConfig = async () => ({ cmsBaseUrl: "", agentId: "main" });
  let syncInFlight = false;

  function storageLocal() {
    return global.chrome?.storage?.local;
  }

  async function readLocalCached() {
    const stored = await storageLocal().get(P.STORAGE_KEY);
    return P.normalizeState(stored[P.STORAGE_KEY]);
  }

  async function writeLocalCached(state) {
    cachedState = P.normalizeState(state);
    await storageLocal().set({ [P.STORAGE_KEY]: cachedState });
    return cachedState;
  }

  function applySettingsMinutes(state, settings) {
    const next = P.normalizeState(state);
    if (!settings) return next;
    next.workMinutes = settings.workMinutes ?? next.workMinutes;
    next.breakMinutes = settings.breakMinutes ?? next.breakMinutes;
    return next;
  }

  async function applyPhaseExpiry(state) {
    const next = P.normalizeState(state);
    if (next.phase === "idle") return next;
    if (next.phaseEndsAt > Date.now()) return next;
    if (next.phase === "work") {
      return enterBreakInternal(next, true, false);
    }
    return P.normalizeState({ ...next, phase: "idle", phaseEndsAt: 0, updatedAt: Date.now() });
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

  async function scheduleSyncAlarm(state) {
    try {
      await chrome.alarms.clear(P.ALARM_SYNC);
    } catch {
      // ignore
    }
    if (state.phase === "idle") return;
    try {
      await chrome.alarms.create(P.ALARM_SYNC, {
        periodInMinutes: P.SYNC_INTERVAL_MINUTES
      });
    } catch {
      // ignore
    }
  }

  async function broadcastState() {
    const snap = P.snapshotForClients(cachedState);
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (!tab.id || !tab.url) continue;
      if (/^(chrome|chrome-extension|edge):/i.test(tab.url)) continue;
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: "COMPANION_POMODORO_SYNC",
          state: snap
        });
      } catch {
        // no content script on this tab yet
      }
    }
  }

  async function pushToWorkspace(state) {
    const config = await getCompanionConfig();
    if (!cmsBaseUrl(config)) return false;
    return R.writeRemoteSnapshot(config, P.toApiBody(state));
  }

  function cmsBaseUrl(config) {
    return String(config?.cmsBaseUrl || "").replace(/\/$/, "");
  }

  async function commitState(state, options = {}) {
    const next = P.normalizeState(state);
    if (options.pushRemote) {
      await pushToWorkspace(next);
    }
    await writeLocalCached(next);
    await schedulePhaseAlarm(next);
    await scheduleSyncAlarm(next);
    await broadcastState();
    return next;
  }

  async function reconcileFromSources() {
    if (syncInFlight) return cachedState;
    syncInFlight = true;
    try {
      const config = await getCompanionConfig();
      const local = await readLocalCached();
      const settings = cmsBaseUrl(config)
        ? await R.fetchWorkspacePomodoroSettings(config)
        : null;
      let base = applySettingsMinutes(local, settings);

      const remoteResult = cmsBaseUrl(config)
        ? await R.fetchRemoteSnapshot(config)
        : { ok: false, offline: true, snapshot: null };

      const localSnap = P.toActiveSnapshot(base);
      const picked = P.pickNewestSnapshot(localSnap, remoteResult.snapshot);
      let next = P.stateFromSnapshot(picked, base);
      next = applySettingsMinutes(next, settings);
      const phaseBeforeExpiry = next.phase;
      next = await applyPhaseExpiry(next);
      const enteredBreak = phaseBeforeExpiry === "work" && next.phase === "break";
      await commitState(next, { pushRemote: enteredBreak });
      return cachedState;
    } finally {
      syncInFlight = false;
    }
  }

  async function loadState() {
    return reconcileFromSources();
  }

  async function enterBreakInternal(state, fromWorkEnd, doCommit = true) {
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
    next.updatedAt = Date.now();
    if (!doCommit) return next;
    return commitState(next, { pushRemote: true });
  }

  async function startWork() {
    await loadState();
    const config = await getCompanionConfig();
    const settings = cmsBaseUrl(config)
      ? await R.fetchWorkspacePomodoroSettings(config)
      : null;
    let base = applySettingsMinutes(cachedState, settings);
    if (base.phase === "work") return cachedState;
    const next = {
      ...base,
      phase: "work",
      phaseEndsAt: Date.now() + P.workMs(base),
      updatedAt: Date.now()
    };
    return commitState(next, { pushRemote: true });
  }

  async function stopSession() {
    const next = P.normalizeState({
      ...cachedState,
      phase: "idle",
      phaseEndsAt: 0,
      updatedAt: Date.now()
    });
    return commitState(next, { pushRemote: true });
  }

  async function breakDone() {
    await loadState();
    if (cachedState.phase !== "break") return cachedState;
    const config = await getCompanionConfig();
    const settings = cmsBaseUrl(config)
      ? await R.fetchWorkspacePomodoroSettings(config)
      : null;
    let base = applySettingsMinutes(cachedState, settings);
    const next = {
      ...base,
      phase: "work",
      phaseEndsAt: Date.now() + P.workMs(base),
      updatedAt: Date.now()
    };
    return commitState(next, { pushRemote: true });
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
    if (alarm?.name === P.ALARM_SYNC) {
      void reconcileFromSources();
    }
  });

  global.CompanionPomodoroService = {
    setConfigProvider(fn) {
      if (typeof fn === "function") getCompanionConfig = fn;
    },
    loadState,
    reconcileFromSources,
    startWork,
    stopSession,
    breakDone,
    onPhaseAlarm,
    getCachedState: () => P.snapshotForClients(cachedState),
    async init() {
      await reconcileFromSources();
    }
  };
})(globalThis);
