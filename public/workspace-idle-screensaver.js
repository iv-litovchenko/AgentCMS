(function () {
  "use strict";

  const SETTING_KEY = "workspace-idle-screensaver-minutes";
  const ACTIVITY_THROTTLE_MS = 1200;
  const FOOTER_TICK_MS = 10_000;
  const FOOTER_DISPLAY_STEP_SEC = 10;
  const ALLOWED_IDLE_MINUTES = [3, 5, 10, 30];

  const rootNode = document.getElementById("workspace-idle-screensaver");
  const footerHintNode = document.getElementById("app-footer-idle-screensaver-hint");
  const footerHintLabelNode = document.getElementById("app-footer-idle-screensaver-hint-label");
  const continueBtn = document.getElementById("workspace-idle-screensaver-continue");
  const clockNode = document.getElementById("workspace-idle-screensaver-clock");
  const titleNode = document.getElementById("workspace-idle-screensaver-title");

  let isEligible = () => false;
  let getAgentId = () => "main";
  let idleMs = 0;
  let armed = false;
  let visible = false;
  let wakeTimer = null;
  let wakeDeadlineAt = 0;
  let clockTimer = null;
  let footerTickTimer = null;
  let lastActivityBump = 0;
  let settingsAgentId = null;
  let settingsLoadPromise = null;

  function parseIdleMinutes(value) {
    if (value != null && typeof value === "object" && "key" in value) {
      value = value.key;
    }
    const key = String(value ?? "off").trim().toLowerCase();
    if (!key || key === "off" || key === "0" || key === "false") return 0;
    const minutes = parseInt(key, 10);
    if (!Number.isFinite(minutes) || minutes <= 0) return 0;
    if (!ALLOWED_IDLE_MINUTES.includes(minutes)) return 0;
    return minutes;
  }

  function getIdleDurationMs(value) {
    return parseIdleMinutes(value) * 60_000;
  }

  function buildSettingsUrl(agentId) {
    const id = String(agentId || "main").trim() || "main";
    return `/api/workspace/settings?agent=${encodeURIComponent(id)}`;
  }

  async function fetchIdleMinutesForAgent(agentId) {
    try {
      const response = await fetch(buildSettingsUrl(agentId), { credentials: "same-origin" });
      if (!response.ok) return 0;
      const data = await response.json();
      return parseIdleMinutes(data?.settings?.[SETTING_KEY]);
    } catch {
      return 0;
    }
  }

  function clearWakeTimer() {
    if (wakeTimer) {
      clearTimeout(wakeTimer);
      wakeTimer = null;
    }
    wakeDeadlineAt = 0;
  }

  function formatRemainingLabel(remainingMs) {
    const totalSec = Math.max(0, Math.round(idleMs / 1000));
    let sec = Math.max(0, Math.ceil(remainingMs / 1000));
    if (totalSec > 0 && sec > totalSec) sec = totalSec;
    if (sec > 0) {
      sec = Math.ceil(sec / FOOTER_DISPLAY_STEP_SEC) * FOOTER_DISPLAY_STEP_SEC;
      if (totalSec > 0 && sec > totalSec) sec = totalSec;
    }
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    if (minutes <= 0) return `${seconds}с`;
    if (seconds === 0) return `${minutes}м`;
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function updateFooterIdleHint() {
    if (!footerHintNode) return;
    const show =
      armed &&
      idleMs > 0 &&
      !visible &&
      isEligible() &&
      !document.hidden &&
      wakeDeadlineAt > Date.now();
    if (!show) {
      footerHintNode.classList.add("hidden");
      footerHintNode.setAttribute("aria-hidden", "true");
      return;
    }
    const remaining = wakeDeadlineAt - Date.now();
    if (remaining <= 0) {
      footerHintNode.classList.add("hidden");
      footerHintNode.setAttribute("aria-hidden", "true");
      return;
    }
    const label = formatRemainingLabel(remaining);
    footerHintNode.classList.remove("hidden");
    footerHintNode.setAttribute("aria-hidden", "false");
    if (footerHintLabelNode) footerHintLabelNode.textContent = label;
    footerHintNode.setAttribute("aria-label", `Показать заставку. Осталось ${label}`);
    footerHintNode.title = `Показать заставку · осталось ${label}`;
  }

  function triggerScreensaverNow() {
    if (visible) return;
    if (!armed || idleMs <= 0 || !isEligible()) return;
    if (document.body.classList.contains("app-locked")) return;
    clearWakeTimer();
    showScreensaver();
  }

  function ensureFooterTick() {
    if (footerTickTimer) return;
    footerTickTimer = window.setInterval(updateFooterIdleHint, FOOTER_TICK_MS);
  }

  function stopClock() {
    if (clockTimer) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  }

  function formatClock(now = new Date()) {
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  function startClock() {
    stopClock();
    if (!clockNode) return;
    clockNode.textContent = formatClock();
    clockTimer = window.setInterval(() => {
      clockNode.textContent = formatClock();
    }, 30_000);
  }

  function hideScreensaver() {
    if (!rootNode) return;
    visible = false;
    rootNode.classList.add("hidden");
    rootNode.setAttribute("aria-hidden", "true");
    document.body.classList.remove("workspace-idle-screensaver-active");
    stopClock();
    updateFooterIdleHint();
  }

  function showScreensaver() {
    if (!rootNode || visible) return;
    if (!isEligible()) return;
    if (document.body.classList.contains("app-locked")) return;
    visible = true;
    rootNode.classList.remove("hidden");
    rootNode.setAttribute("aria-hidden", "false");
    document.body.classList.add("workspace-idle-screensaver-active");
    if (titleNode) {
      titleNode.textContent = "Хранилище ждёт вас";
    }
    startClock();
    updateFooterIdleHint();
    continueBtn?.focus({ preventScroll: true });
  }

  function disarm() {
    armed = false;
    clearWakeTimer();
    hideScreensaver();
    updateFooterIdleHint();
  }

  function scheduleWake() {
    clearWakeTimer();
    if (!armed || idleMs <= 0 || visible) return;
    if (!isEligible()) {
      disarm();
      return;
    }
    if (document.hidden) return;
    const durationMs = idleMs;
    const startedAt = Date.now();
    wakeDeadlineAt = startedAt + durationMs;
    updateFooterIdleHint();
    wakeTimer = window.setTimeout(() => {
      wakeTimer = null;
      wakeDeadlineAt = 0;
      if (!armed || !isEligible() || document.hidden) {
        disarm();
        return;
      }
      showScreensaver();
    }, durationMs);
  }

  function armIfNeeded() {
    if (idleMs <= 0 || !isEligible() || document.hidden) {
      disarm();
      return;
    }
    armed = true;
    if (!visible && !wakeTimer) scheduleWake();
  }

  function bumpActivity() {
    const now = Date.now();
    if (now - lastActivityBump < ACTIVITY_THROTTLE_MS) return;
    lastActivityBump = now;
    if (visible) return;
    if (!armed) armIfNeeded();
    else scheduleWake();
  }

  function onActivityEvent(event) {
    if (visible) return;
    if (event?.type === "keydown" && event.repeat) return;
    const target = event?.target;
    if (footerHintNode && target instanceof Node && footerHintNode.contains(target)) return;
    bumpActivity();
  }

  function dismissScreensaver() {
    hideScreensaver();
    bumpActivity();
    scheduleWake();
  }

  async function reloadForAgent(agentId) {
    const nextAgent = String(agentId || getAgentId() || "main").trim() || "main";
    settingsAgentId = nextAgent;
    settingsLoadPromise = fetchIdleMinutesForAgent(nextAgent).then((minutes) => {
      idleMs = getIdleDurationMs(minutes);
      disarm();
      armIfNeeded();
      return idleMs;
    });
    return settingsLoadPromise;
  }

  function applyMinutes(rawValue) {
    idleMs = getIdleDurationMs(rawValue);
    disarm();
    armIfNeeded();
  }

  function init(options = {}) {
    if (typeof options.isEligible === "function") {
      isEligible = options.isEligible;
    }
    if (typeof options.getAgentId === "function") {
      getAgentId = options.getAgentId;
    }

    const activityOptions = { capture: true, passive: true };
    for (const type of ["pointerdown", "keydown", "wheel", "touchstart", "scroll"]) {
      document.addEventListener(type, onActivityEvent, activityOptions);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        clearWakeTimer();
        updateFooterIdleHint();
        return;
      }
      if (visible) hideScreensaver();
      armIfNeeded();
      scheduleWake();
    });

    ensureFooterTick();

    footerHintNode?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      triggerScreensaverNow();
    });

    continueBtn?.addEventListener("click", () => dismissScreensaver());
    rootNode?.addEventListener("click", (event) => {
      if (event.target === rootNode) dismissScreensaver();
    });
    document.addEventListener("keydown", (event) => {
      if (!visible) return;
      if (event.key === "Enter" || event.key === " " || event.key === "Escape") {
        event.preventDefault();
        dismissScreensaver();
      }
    });

    window.addEventListener("pagehide", () => clearWakeTimer());
  }

  function syncEligibility() {
    if (!idleMs || !isEligible()) {
      disarm();
      return;
    }
    if (!armed) {
      armIfNeeded();
    } else if (!visible && !wakeTimer && !document.hidden) {
      scheduleWake();
    }
    updateFooterIdleHint();
  }

  window.WorkspaceIdleScreensaver = {
    init,
    reloadForAgent,
    applyMinutes,
    syncEligibility,
    parseIdleMinutes
  };
})();
