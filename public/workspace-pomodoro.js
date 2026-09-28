(function () {
  "use strict";

  const BREAK_MS = 5 * 60_000;
  const TICK_MS = 1000;
  const STORAGE_KEY = "workspace-pomodoro.v1";
  const SETTING_ENABLED_KEY = "workspace-pomodoro-enabled";
  const SETTING_WORK_KEY = "workspace-pomodoro-work-minutes";
  const ALLOWED_WORK_MINUTES = [1, 5, 25, 45, 60];

  const btn = document.getElementById("app-footer-pomodoro-btn");
  const btnLabel = document.getElementById("app-footer-pomodoro-btn-label");
  const popover = document.getElementById("app-footer-pomodoro-popover");
  const popoverClose = document.getElementById("app-footer-pomodoro-popover-close");
  const statusNode = document.getElementById("app-footer-pomodoro-status");
  const startBtn = document.getElementById("app-footer-pomodoro-start");
  const stopBtn = document.getElementById("app-footer-pomodoro-stop");
  const popoverLead = document.getElementById("app-footer-pomodoro-popover-lead");
  const breakRoot = document.getElementById("workspace-pomodoro-break");
  const breakClock = document.getElementById("workspace-pomodoro-break-clock");
  const breakDoneBtn = document.getElementById("workspace-pomodoro-break-done");
  const breakBreaksRow = document.getElementById("workspace-pomodoro-break-breaks");
  const breakBreaksCount = document.getElementById("workspace-pomodoro-break-breaks-count");

  const breaksCounter =
    globalThis.IdleScreensaverBreaksClient?.createCounter?.({
      getAgentId: () => getAgentId(),
      countNode: breakBreaksCount,
      rowNode: breakBreaksRow
    }) || null;

  let isEligible = () => false;
  let getAgentId = () => "main";
  let phase = "idle";
  let phaseEndsAt = 0;
  let tickTimer = null;
  let popoverOpen = false;
  let audioCtx = null;
  let featureEnabled = true;
  let workMinutes = 25;
  let workMs = 25 * 60_000;
  let workspacePersistTimer = null;
  let workspacePersistInFlight = false;

  function pomodoroStateApi() {
    return window.PomodoroStateApi;
  }

  function parseWorkMinutes(value) {
    if (value != null && typeof value === "object" && "key" in value) {
      value = value.key;
    }
    const minutes = parseInt(String(value ?? "25").trim(), 10);
    if (!Number.isFinite(minutes) || !ALLOWED_WORK_MINUTES.includes(minutes)) return 25;
    return minutes;
  }

  function workMinutesLabel(minutes = workMinutes) {
    const m = Number(minutes) || 25;
    const mod10 = m % 10;
    const mod100 = m % 100;
    let word = "минут";
    if (mod10 === 1 && mod100 !== 11) word = "минута";
    else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = "минуты";
    return `${m} ${word}`;
  }

  function parseEnabled(value) {
    if (typeof value === "boolean") return value;
    if (value == null) return true;
    const text = String(value).trim().toLowerCase();
    if (["false", "0", "no", "off"].includes(text)) return false;
    if (["true", "1", "yes", "on"].includes(text)) return true;
    return true;
  }

  function buildSettingsUrl(agentId) {
    const id = String(agentId || getAgentId() || "main").trim() || "main";
    return `/api/workspace/settings?agent=${encodeURIComponent(id)}`;
  }

  async function fetchWorkspacePomodoroSettings(agentId) {
    try {
      const response = await fetch(buildSettingsUrl(agentId), { credentials: "same-origin" });
      if (!response.ok) return { enabled: true, workMinutes: 25 };
      const data = await response.json();
      const settings = data?.settings || {};
      return {
        enabled: parseEnabled(settings[SETTING_ENABLED_KEY]),
        workMinutes: parseWorkMinutes(settings[SETTING_WORK_KEY])
      };
    } catch {
      return { enabled: true, workMinutes: 25 };
    }
  }

  function applyWorkMinutes(rawValue) {
    workMinutes = parseWorkMinutes(rawValue);
    workMs = workMinutes * 60_000;
    if (popoverLead) {
      popoverLead.innerHTML =
        `Метод помидора: <strong>${workMinutesLabel(workMinutes)}</strong> сосредоточенной работы, затем короткий отдых и звуковой сигнал. ` +
        "Отдельно от заставки при бездействии.";
    }
    updatePopoverUi();
    updateFooterBtn();
  }

  function applyEnabled(rawValue) {
    featureEnabled = parseEnabled(rawValue);
    if (!featureEnabled) stopSession();
    syncVisibility();
  }

  function applyWorkspaceSettings(raw) {
    if (raw?.enabled != null) applyEnabled(raw.enabled);
    if (raw?.workMinutes != null) applyWorkMinutes(raw.workMinutes);
  }

  function storageKey() {
    const id = String(getAgentId() || "main").trim() || "main";
    return `${STORAGE_KEY}:${id}`;
  }

  function loadLocalSnapshot() {
    try {
      const raw = sessionStorage.getItem(storageKey());
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return null;
      const p = String(data.phase || "").trim();
      const endsAt = Number(data.phaseEndsAt);
      if (!endsAt || !Number.isFinite(endsAt)) return null;
      if (p !== "work" && p !== "break") return null;
      return {
        phase: p,
        phaseEndsAt: endsAt,
        workMinutes: data.workMinutes != null ? data.workMinutes : null,
        updatedAt: Number(data.updatedAt) || 0
      };
    } catch {
      return null;
    }
  }

  function stopWorkspacePersistInterval() {
    if (!workspacePersistTimer) return;
    clearInterval(workspacePersistTimer);
    workspacePersistTimer = null;
  }

  function startWorkspacePersistInterval() {
    const api = pomodoroStateApi();
    if (!api || workspacePersistTimer) return;
    workspacePersistTimer = window.setInterval(() => {
      if (phase === "idle") {
        stopWorkspacePersistInterval();
        return;
      }
      void flushWorkspaceState();
    }, api.POMODORO_WORKSPACE_PERSIST_MS || 15_000);
  }

  async function flushWorkspaceState(optionalSnap) {
    const api = pomodoroStateApi();
    if (!api) return;
    if (workspacePersistInFlight) return;
    const snap =
      optionalSnap ||
      (phase === "idle"
        ? null
        : { phase, phaseEndsAt, workMinutes, updatedAt: Date.now() });
    workspacePersistInFlight = true;
    try {
      await api.writePomodoroWorkspaceState(getAgentId(), snap);
    } finally {
      workspacePersistInFlight = false;
    }
  }

  function persistState() {
    const now = Date.now();
    try {
      if (phase === "idle") {
        sessionStorage.removeItem(storageKey());
        stopWorkspacePersistInterval();
        void flushWorkspaceState(null);
        return;
      }
      const snap = { phase, phaseEndsAt, workMinutes, updatedAt: now };
      sessionStorage.setItem(storageKey(), JSON.stringify(snap));
      startWorkspacePersistInterval();
      void flushWorkspaceState(snap);
    } catch {
      // ignore quota / private mode
    }
  }

  function formatMmSs(remainingMs) {
    const sec = Math.max(0, Math.ceil(remainingMs / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function ensureAudioContext() {
    if (audioCtx) return audioCtx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
    return audioCtx;
  }

  async function unlockAudio() {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // ignore
      }
    }
  }

  function playBreakChime() {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t0 = now + i * 0.14;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.6);
    });
  }

  function updatePopoverUi() {
    if (!statusNode || !startBtn || !stopBtn) return;
    const remaining = Math.max(0, phaseEndsAt - Date.now());
    if (phase === "work") {
      statusNode.textContent = `Фокус: осталось ${formatMmSs(remaining)} из ${workMinutesLabel(workMinutes)}.`;
      startBtn.classList.add("hidden");
      stopBtn.classList.remove("hidden");
      return;
    }
    if (phase === "break") {
      statusNode.textContent = `Перерыв: ${formatMmSs(remaining)} — закройте окно отдыха кнопкой «Отдохнули».`;
      startBtn.classList.add("hidden");
      stopBtn.classList.remove("hidden");
      return;
    }
    statusNode.textContent = `Готовы к фокусу на ${workMinutesLabel(workMinutes)}?`;
    startBtn.textContent = `Начать ${workMinutesLabel(workMinutes)}`;
    startBtn.classList.remove("hidden");
    stopBtn.classList.add("hidden");
  }

  function updateFooterBtn() {
    if (!btn || !btnLabel) return;
    if (phase === "work") {
      const remaining = Math.max(0, phaseEndsAt - Date.now());
      btnLabel.textContent = formatMmSs(remaining);
      btn.title = `Помидор: фокус · осталось ${formatMmSs(remaining)}`;
      btn.classList.add("is-work");
      btn.classList.remove("is-break");
      return;
    }
    if (phase === "break") {
      btnLabel.textContent = "☕";
      btn.title = "Помидор: перерыв";
      btn.classList.add("is-break");
      btn.classList.remove("is-work");
      return;
    }
    btnLabel.textContent = "🍅";
    btn.title = `Помидор — фокус ${workMinutesLabel(workMinutes)}`;
    btn.classList.remove("is-work", "is-break");
  }

  function showBreakModal() {
    if (!breakRoot) return;
    breakRoot.classList.remove("hidden");
    breakRoot.setAttribute("aria-hidden", "false");
    document.body.classList.add("workspace-pomodoro-break-active");
    void breaksCounter?.load?.(getAgentId());
    breakDoneBtn?.focus({ preventScroll: true });
  }

  function hideBreakModal() {
    if (!breakRoot) return;
    breakRoot.classList.add("hidden");
    breakRoot.setAttribute("aria-hidden", "true");
    document.body.classList.remove("workspace-pomodoro-break-active");
  }

  function stopTick() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function ensureTick() {
    if (tickTimer) return;
    tickTimer = window.setInterval(onTick, TICK_MS);
  }

  function enterIdle() {
    phase = "idle";
    phaseEndsAt = 0;
    hideBreakModal();
    persistState();
    updateFooterBtn();
    updatePopoverUi();
    stopTick();
    broadcastShellPomodoroState();
  }

  function enterWork() {
    phase = "work";
    phaseEndsAt = Date.now() + workMs;
    hideBreakModal();
    persistState();
    updateFooterBtn();
    updatePopoverUi();
    ensureTick();
    broadcastShellPomodoroState();
  }

  function enterBreak() {
    phase = "break";
    phaseEndsAt = Date.now() + BREAK_MS;
    persistState();
    playBreakChime();
    showBreakModal();
    updateFooterBtn();
    updatePopoverUi();
    ensureTick();
    broadcastShellPomodoroState();
  }

  function onTick() {
    if (phase === "idle") {
      stopTick();
      return;
    }
    const remaining = phaseEndsAt - Date.now();
    if (phase === "work" && remaining <= 0) {
      enterBreak();
      return;
    }
    if (breakClock && phase === "break") {
      breakClock.textContent = remaining > 0 ? formatMmSs(remaining) : "0:00";
    }
    updateFooterBtn();
    updatePopoverUi();
    broadcastShellPomodoroState();
  }

  function applyPersistedSnapshot(saved) {
    if (!saved) {
      phase = "idle";
      phaseEndsAt = 0;
      hideBreakModal();
      stopTick();
      stopWorkspacePersistInterval();
      updateFooterBtn();
      updatePopoverUi();
      return;
    }
    phase = saved.phase;
    phaseEndsAt = saved.phaseEndsAt;
    if (saved.workMinutes != null) {
      applyWorkMinutes(saved.workMinutes);
    }
    if (phaseEndsAt <= Date.now()) {
      if (phase === "work") {
        enterBreak();
        return;
      }
      enterIdle();
      return;
    }
    if (phase === "break") showBreakModal();
    updateFooterBtn();
    updatePopoverUi();
    ensureTick();
    onTick();
  }

  async function restoreCombinedState() {
    const api = pomodoroStateApi();
    const remote = api ? await api.readPomodoroWorkspaceState(getAgentId()) : null;
    const local = loadLocalSnapshot();
    const saved = api ? api.pickNewestPomodoroSnapshot(local, remote) : local;
    applyPersistedSnapshot(saved);
  }

  function syncVisibility() {
    if (!btn) return;
    const show = isEligible() && featureEnabled;
    btn.classList.toggle("hidden", !show);
    btn.setAttribute("aria-hidden", show ? "false" : "true");
    if (!show) closePopover();
  }

  function positionPopover() {
    if (!popoverOpen || !popover || !btn) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.min(360, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    popover.style.width = `${width}px`;
    popover.style.left = `${left}px`;
    const height = popover.getBoundingClientRect().height || 280;
    const top = Math.max(12, rect.top - height - 8);
    popover.style.top = `${top}px`;
    popover.style.maxHeight = `${Math.max(200, rect.top - 16)}px`;
  }

  function closePopover() {
    if (!popoverOpen) return;
    popoverOpen = false;
    popover?.classList.add("hidden");
    popover?.setAttribute("aria-hidden", "true");
    btn?.setAttribute("aria-expanded", "false");
  }

  function openPopover() {
    if (typeof window.AppFooterVoiceCmdPopover?.close === "function") {
      window.AppFooterVoiceCmdPopover.close();
    }
    if (typeof closeAppFooterIdeasPopover === "function") closeAppFooterIdeasPopover();
    if (typeof closeAppFooterJournalPopover === "function") closeAppFooterJournalPopover();
    popoverOpen = true;
    popover?.classList.remove("hidden");
    popover?.setAttribute("aria-hidden", "false");
    btn?.setAttribute("aria-expanded", "true");
    updatePopoverUi();
    positionPopover();
    requestAnimationFrame(positionPopover);
  }

  function togglePopover() {
    if (popoverOpen) closePopover();
    else openPopover();
  }

  async function startWorkSession() {
    if (!featureEnabled) return;
    await unlockAudio();
    closePopover();
    enterWork();
  }

  function stopSession() {
    closePopover();
    enterIdle();
  }

  function completeBreak() {
    breaksCounter?.recordDismissed?.();
    void unlockAudio();
    closePopover();
    enterWork();
    broadcastShellPomodoroState();
  }

  function broadcastShellPomodoroState() {
    try {
      const iframe = document.getElementById("discuss-shell-iframe");
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage(
        {
          type: "agent-cms-voice:cms-pomodoro-state",
          phase,
          phaseEndsAt,
          enabled: featureEnabled,
          workMinutes
        },
        "*"
      );
    } catch {
      // ignore
    }
  }

  function handleRemoteAction(action) {
    const a = String(action || "").trim().toLowerCase();
    if (a === "sync") {
      broadcastShellPomodoroState();
      return true;
    }
    if (a === "toggle") {
      if (popoverOpen) closePopover();
      else openPopover();
      broadcastShellPomodoroState();
      return true;
    }
    if (a === "start") {
      void startWorkSession();
      broadcastShellPomodoroState();
      return true;
    }
    if (a === "stop") {
      stopSession();
      broadcastShellPomodoroState();
      return true;
    }
    if (a === "break-done") {
      completeBreak();
      return true;
    }
    if (a === "break-open" || a === "break_open") {
      if (phase === "break") showBreakModal();
      broadcastShellPomodoroState();
      return true;
    }
    return false;
  }

  function init(options = {}) {
    if (typeof options.isEligible === "function") isEligible = options.isEligible;
    if (typeof options.getAgentId === "function") getAgentId = options.getAgentId;
    if (!btn) return;

    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      if (phase === "break") {
        showBreakModal();
        return;
      }
      togglePopover();
    });

    popoverClose?.addEventListener("click", (event) => {
      event.stopPropagation();
      closePopover();
    });

    startBtn?.addEventListener("click", () => {
      void startWorkSession();
    });

    stopBtn?.addEventListener("click", () => stopSession());

    breakDoneBtn?.addEventListener("click", () => completeBreak());

    document.addEventListener("click", (event) => {
      if (!popoverOpen) return;
      const target = event.target;
      if (target instanceof Node && popover?.contains(target)) return;
      if (target instanceof Node && btn?.contains(target)) return;
      closePopover();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (document.body.classList.contains("workspace-pomodoro-break-active")) return;
        closePopover();
      }
    });

    window.addEventListener("resize", positionPopover);

    window.addEventListener("pagehide", () => {
      if (phase !== "idle") void flushWorkspaceState();
    });

    window.addEventListener("message", (event) => {
      const data = event?.data;
      if (!data || data.type !== "agent-cms-voice:cms-pomodoro") return;
      const action = String(data.action || "").trim().toLowerCase();
      const ok = handleRemoteAction(action);
      if (data.requestId && event.source && typeof event.source.postMessage === "function") {
        event.source.postMessage(
          {
            type: "agent-cms-voice:cms-pomodoro-done",
            requestId: data.requestId,
            action,
            ok
          },
          event.origin || "*"
        );
      }
    });

    applyWorkMinutes(workMinutes);
    syncVisibility();
    void breaksCounter?.load?.(getAgentId());
    void restoreCombinedState().then(() => broadcastShellPomodoroState());
  }

  function reloadForAgent(agentId) {
    const nextAgent = String(agentId || getAgentId() || "main").trim() || "main";
    void fetchWorkspacePomodoroSettings(nextAgent).then((settings) => {
      applyWorkspaceSettings(settings);
    });
    stopTick();
    stopWorkspacePersistInterval();
    hideBreakModal();
    phase = "idle";
    phaseEndsAt = 0;
    void breaksCounter?.load?.(nextAgent);
    void restoreCombinedState().then(() => {
      syncVisibility();
      broadcastShellPomodoroState();
    });
  }

  function syncEligibility() {
    syncVisibility();
  }

  function isFocusActive() {
    return phase === "work";
  }

  window.WorkspacePomodoro = {
    init,
    reloadForAgent,
    syncEligibility,
    isFocusActive,
    applyEnabled,
    parseEnabled,
    applyWorkMinutes,
    parseWorkMinutes,
    handleRemoteAction,
    broadcastShellPomodoroState
  };
})();
