const BREAK_MS = 5 * 60_000;
const TICK_MS = 1000;
const STORAGE_KEY = "shell-pomodoro.v1";
const SETTING_ENABLED_KEY = "workspace-pomodoro-enabled";
const SETTING_WORK_KEY = "workspace-pomodoro-work-minutes";
const ALLOWED_WORK_MINUTES = [5, 25, 45, 60];

let getAgentId = () => "main";
let isEligible = () => true;
let audioCtx = null;
let localController = null;
let shellPomodoroReady = false;

function $(id) {
  return document.getElementById(id);
}

function parseEnabled(value) {
  if (typeof value === "boolean") return value;
  if (value == null) return true;
  const text = String(value).trim().toLowerCase();
  if (["false", "0", "no", "off"].includes(text)) return false;
  return true;
}

function parseWorkMinutes(value) {
  if (value != null && typeof value === "object" && "key" in value) value = value.key;
  const minutes = parseInt(String(value ?? "25").trim(), 10);
  if (!Number.isFinite(minutes) || !ALLOWED_WORK_MINUTES.includes(minutes)) return 25;
  return minutes;
}

function workMinutesLabel(minutes) {
  const m = Number(minutes) || 25;
  const mod10 = m % 10;
  const mod100 = m % 100;
  let word = "минут";
  if (mod10 === 1 && mod100 !== 11) word = "минута";
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) word = "минуты";
  return `${m} ${word}`;
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

function formatMmSs(remainingMs) {
  const sec = Math.max(0, Math.ceil(remainingMs / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function syncPomodoroLaunchBtn(btn, label, ico, { phase, phaseEndsAt, workMinutes }) {
  if (!btn || !label) return;
  if (phase === "work") {
    const remaining = Math.max(0, phaseEndsAt - Date.now());
    if (ico) ico.hidden = true;
    if (label) {
      label.textContent = formatMmSs(remaining);
      label.setAttribute("aria-hidden", "false");
    }
    btn.title = `Помидор: фокус · ${formatMmSs(remaining)}`;
    btn.classList.add("is-work");
    btn.classList.remove("is-break");
    return;
  }
  if (phase === "break") {
    if (ico) {
      ico.hidden = false;
      ico.textContent = "☕";
    }
    if (label) {
      label.textContent = "";
      label.setAttribute("aria-hidden", "true");
    }
    btn.title = "Помидор: перерыв";
    btn.classList.add("is-break");
    btn.classList.remove("is-work");
    return;
  }
  if (ico) {
    ico.hidden = false;
    ico.textContent = "🍅";
  }
  if (label) {
    label.textContent = "";
    label.setAttribute("aria-hidden", "true");
  }
  btn.title = `Помидор — ${workMinutesLabel(workMinutes)}`;
  btn.classList.remove("is-work", "is-break");
}

function createLocalController() {
  const btn = $("shell-pomodoro-btn");
  const btnLabel = $("shell-pomodoro-btn-label");
  const popover = $("shell-pomodoro-popover");
  const popoverClose = $("shell-pomodoro-popover-close");
  const statusNode = $("shell-pomodoro-status");
  const startBtn = $("shell-pomodoro-start");
  const stopBtn = $("shell-pomodoro-stop");
  const popoverLead = $("shell-pomodoro-popover-lead");
  const breakRoot = $("shell-pomodoro-break");
  const breakClock = $("shell-pomodoro-break-clock");
  const breakDoneBtn = $("shell-pomodoro-break-done");

  if (!btn) return null;

  let phase = "idle";
  let phaseEndsAt = 0;
  let tickTimer = null;
  let popoverOpen = false;
  let featureEnabled = true;
  let workMinutes = 25;
  let workMs = 25 * 60_000;

  function storageKey() {
    const id = String(getAgentId() || "main").trim() || "main";
    return `${STORAGE_KEY}:${id}`;
  }

  function persistState() {
    try {
      if (phase === "idle") {
        sessionStorage.removeItem(storageKey());
        return;
      }
      sessionStorage.setItem(
        storageKey(),
        JSON.stringify({ phase, phaseEndsAt, updatedAt: Date.now() })
      );
    } catch {
      // ignore
    }
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
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
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
      statusNode.textContent = `Перерыв: ${formatMmSs(remaining)} — «Отдохнули».`;
      startBtn.classList.add("hidden");
      stopBtn.classList.remove("hidden");
      return;
    }
    statusNode.textContent = `Готовы к фокусу на ${workMinutesLabel(workMinutes)}?`;
    startBtn.textContent = `Начать ${workMinutesLabel(workMinutes)}`;
    startBtn.classList.remove("hidden");
    stopBtn.classList.add("hidden");
  }

  function updateLaunchBtn() {
    const ico = btn.querySelector(".shell-pomodoro-launch-ico");
    syncPomodoroLaunchBtn(btn, btnLabel, ico, { phase, phaseEndsAt, workMinutes });
  }

  function showBreakModal() {
    if (!breakRoot) return;
    breakRoot.classList.remove("hidden");
    breakRoot.setAttribute("aria-hidden", "false");
    document.body.classList.add("shell-pomodoro-break-active");
    breakDoneBtn?.focus({ preventScroll: true });
  }

  function hideBreakModal() {
    if (!breakRoot) return;
    breakRoot.classList.add("hidden");
    breakRoot.setAttribute("aria-hidden", "true");
    document.body.classList.remove("shell-pomodoro-break-active");
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
    updateLaunchBtn();
    updatePopoverUi();
    stopTick();
  }

  function enterWork() {
    phase = "work";
    phaseEndsAt = Date.now() + workMs;
    hideBreakModal();
    persistState();
    updateLaunchBtn();
    updatePopoverUi();
    ensureTick();
  }

  function enterBreak() {
    phase = "break";
    phaseEndsAt = Date.now() + BREAK_MS;
    persistState();
    playBreakChime();
    showBreakModal();
    updateLaunchBtn();
    updatePopoverUi();
    ensureTick();
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
    updateLaunchBtn();
    updatePopoverUi();
  }

  function restoreFromStorage() {
    try {
      const raw = sessionStorage.getItem(storageKey());
      if (!raw) {
        enterIdle();
        return;
      }
      const data = JSON.parse(raw);
      phase = data.phase;
      phaseEndsAt = data.phaseEndsAt;
      if (phaseEndsAt <= Date.now()) {
        if (phase === "work") enterBreak();
        else enterIdle();
        return;
      }
      if (phase === "break") showBreakModal();
      updateLaunchBtn();
      updatePopoverUi();
      ensureTick();
      onTick();
    } catch {
      enterIdle();
    }
  }

  function syncVisibility() {
    const show = isEligible() && featureEnabled;
    btn.classList.toggle("hidden", !show);
    btn.toggleAttribute("hidden", !show);
    if (!show) closePopover();
  }

  function positionPopover() {
    if (!popoverOpen || !popover) return;
    const rect = btn.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    popover.style.width = `${width}px`;
    popover.style.left = `${left}px`;
    const height = popover.getBoundingClientRect().height || 260;
    const top = Math.max(12, rect.top - height - 8);
    popover.style.top = `${top}px`;
  }

  function closePopover() {
    if (!popoverOpen) return;
    popoverOpen = false;
    popover?.classList.add("hidden");
    popover?.setAttribute("aria-hidden", "true");
    btn.setAttribute("aria-expanded", "false");
  }

  function openPopover() {
    popoverOpen = true;
    popover?.classList.remove("hidden");
    popover?.setAttribute("aria-hidden", "false");
    btn.setAttribute("aria-expanded", "true");
    updatePopoverUi();
    positionPopover();
    requestAnimationFrame(positionPopover);
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
    enterIdle();
    closePopover();
  }

  function applyWorkspaceSettings(settings) {
    if (settings?.enabled != null) {
      featureEnabled = parseEnabled(settings.enabled);
      if (!featureEnabled) stopSession();
    }
    if (settings?.workMinutes != null) {
      workMinutes = parseWorkMinutes(settings.workMinutes);
      workMs = workMinutes * 60_000;
      if (popoverLead) {
        popoverLead.innerHTML =
          `Метод помидора: <strong>${workMinutesLabel(workMinutes)}</strong> фокуса в Voice, затем отдых и звук.`;
      }
    }
    syncVisibility();
    updatePopoverUi();
    updateLaunchBtn();
  }

  btn.addEventListener("click", (event) => {
    event.stopPropagation();
    if (phase === "break") {
      showBreakModal();
      return;
    }
    if (popoverOpen) closePopover();
    else openPopover();
  });
  popoverClose?.addEventListener("click", (event) => {
    event.stopPropagation();
    closePopover();
  });
  startBtn?.addEventListener("click", () => void startWorkSession());
  stopBtn?.addEventListener("click", () => stopSession());
  breakDoneBtn?.addEventListener("click", () => completeBreak());

  document.addEventListener("click", (event) => {
    if (!popoverOpen) return;
    const target = event.target;
    if (target instanceof Node && popover?.contains(target)) return;
    if (target instanceof Node && btn.contains(target)) return;
    closePopover();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && document.body.classList.contains("shell-pomodoro-break-active")) return;
    if (event.key === "Escape" && popoverOpen) closePopover();
  });

  window.addEventListener("resize", positionPopover);

  return {
    applyWorkspaceSettings,
    reloadForAgent(agentId) {
      void fetchWorkspacePomodoroSettings(agentId).then(applyWorkspaceSettings);
      stopTick();
      hideBreakModal();
      phase = "idle";
      phaseEndsAt = 0;
      restoreFromStorage();
      syncVisibility();
    },
    handleRemoteAction(action) {
      const a = String(action || "").trim().toLowerCase();
      if (a === "toggle") {
        if (popoverOpen) closePopover();
        else openPopover();
        return true;
      }
      if (a === "start") {
        void startWorkSession();
        return true;
      }
      if (a === "stop") {
        stopSession();
        return true;
      }
      if (a === "break-done") {
        completeBreak();
        return true;
      }
      if ((a === "break-open" || a === "break_open") && phase === "break") {
        showBreakModal();
        return true;
      }
      return false;
    },
    syncVisibility,
    bootstrap() {
      if (popoverLead) {
        popoverLead.innerHTML =
          `Метод помидора: <strong>${workMinutesLabel(workMinutes)}</strong> фокуса в Voice, затем отдых и звук.`;
      }
      syncVisibility();
      restoreFromStorage();
      updatePopoverUi();
    }
  };
}

export function initShellPomodoro(options = {}) {
  if (shellPomodoroReady) return;
  if (typeof options.getAgentId === "function") getAgentId = options.getAgentId;
  if (typeof options.isEligible === "function") isEligible = options.isEligible;

  localController = createLocalController();
  if (!localController) return;

  shellPomodoroReady = true;
  localController.bootstrap();
  void fetchWorkspacePomodoroSettings(getAgentId()).then((settings) => {
    localController?.applyWorkspaceSettings(settings);
  });
}

export function reloadShellPomodoroForAgent(agentId) {
  if (!localController) return;
  localController.reloadForAgent(agentId);
}

export function handleShellPomodoroVoiceAction(action) {
  return localController?.handleRemoteAction(action) || false;
}

export function syncShellPomodoroVisibility() {
  localController?.syncVisibility();
}
