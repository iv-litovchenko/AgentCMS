(function initCompanionPomodoroOverlay() {
  if (window.__ascPomodoroOverlayMounted) return;
  if (document.querySelector('meta[name="agent-cms-voice-app"]')?.content === "1") return;
  window.__ascPomodoroOverlayMounted = true;

  const EMOJIS = ["🚴", "💧", "🏊", "🍎", "🚶", "🍵", "🏃", "😴", "🧘", "👀", "☀️", "💪"];
  const POLL_MS = 2000;

  const root = document.createElement("div");
  root.id = "asc-pomodoro-break";
  root.className = "asc-pomodoro-break";
  root.hidden = true;
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-labelledby", "asc-pomodoro-break-title");
  root.innerHTML =
    '<div class="asc-pomodoro-break-bg" aria-hidden="true"></div>' +
    '<div class="asc-pomodoro-break-panel">' +
    '<p class="asc-pomodoro-break-eyebrow" aria-hidden="true">🍅 Помидор</p>' +
    '<p id="asc-pomodoro-break-clock" class="asc-pomodoro-break-clock" aria-live="polite">5:00</p>' +
    '<h2 id="asc-pomodoro-break-title" class="asc-pomodoro-break-title">Время отдохнуть</h2>' +
    '<p class="asc-pomodoro-break-lead">Короткая пауза после фокуса: встаньте, разомнитесь, отведите взгляд от экрана. Когда будете готовы — нажмите «Отдохнули».</p>' +
    '<div class="asc-pomodoro-break-emoji" aria-hidden="true"><span id="asc-pomodoro-break-emoji">🚴</span></div>' +
    '<button type="button" id="asc-pomodoro-break-done" class="asc-pomodoro-break-done">Отдохнули</button>' +
    '<p class="asc-pomodoro-break-breaks" aria-live="polite">' +
    '<span>Перерывы сегодня</span> <span id="asc-pomodoro-break-count" class="asc-pomodoro-break-breaks-badge">0</span></p>' +
    "</div>";

  const clockEl = root.querySelector("#asc-pomodoro-break-clock");
  const countEl = root.querySelector("#asc-pomodoro-break-count");
  const emojiEl = root.querySelector("#asc-pomodoro-break-emoji");
  const doneBtn = root.querySelector("#asc-pomodoro-break-done");

  let emojiTimer = null;
  let emojiIndex = 0;
  let lastPhase = "idle";
  let breakEndsAt = 0;
  let breakTickTimer = null;
  let pollTimer = null;

  function formatMmSs(ms) {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function mountRoot() {
    if (root.isConnected) return;
    const parent = document.body || document.documentElement;
    parent.appendChild(root);
  }

  function startEmoji() {
    stopEmoji();
    if (!emojiEl) return;
    emojiIndex = 0;
    emojiEl.textContent = EMOJIS[0];
    emojiTimer = window.setInterval(() => {
      emojiIndex = (emojiIndex + 1) % EMOJIS.length;
      emojiEl.textContent = EMOJIS[emojiIndex];
    }, 3000);
  }

  function stopEmoji() {
    if (emojiTimer) {
      clearInterval(emojiTimer);
      emojiTimer = null;
    }
  }

  function playChime() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const t0 = now + i * 0.14;
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.18, t0 + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t0);
        osc.stop(t0 + 0.55);
      });
      void ctx.close();
    } catch {
      // ignore
    }
  }

  function stopBreakTick() {
    if (breakTickTimer) {
      clearInterval(breakTickTimer);
      breakTickTimer = null;
    }
  }

  function startBreakTick() {
    stopBreakTick();
    breakTickTimer = window.setInterval(() => {
      if (!clockEl) return;
      const rem = Math.max(0, breakEndsAt - Date.now());
      clockEl.textContent = formatMmSs(rem);
    }, 1000);
  }

  function setVisible(show) {
    mountRoot();
    root.hidden = !show;
    root.setAttribute("aria-hidden", show ? "false" : "true");
    document.documentElement.classList.toggle("asc-pomodoro-break-active", show);
    if (document.body) {
      document.body.classList.toggle("asc-pomodoro-break-active", show);
    }
    if (show) {
      startEmoji();
      startBreakTick();
    } else {
      stopEmoji();
      stopBreakTick();
    }
  }

  function applyState(state) {
    if (!state) return;
    const phase = String(state.phase || "idle");
    const remainingMs = Number(state.remainingMs);
    const endsAt = Number(state.phaseEndsAt) || 0;
    const rem =
      Number.isFinite(remainingMs) && remainingMs >= 0
        ? remainingMs
        : Math.max(0, endsAt - Date.now());

    if (countEl) countEl.textContent = String(state.breaksToday ?? 0);

    if (phase === "break") {
      breakEndsAt = endsAt || Date.now() + rem;
      if (lastPhase !== "break" && document.visibilityState === "visible") playChime();
      if (clockEl) clockEl.textContent = formatMmSs(rem);
      setVisible(true);
    } else {
      setVisible(false);
    }
    lastPhase = phase;
  }

  function pullState() {
    if (!chrome.runtime?.sendMessage) return;
    chrome.runtime.sendMessage({ type: "COMPANION_POMODORO_GET_STATE" }, (response) => {
      if (chrome.runtime.lastError) return;
      if (response?.state) applyState(response.state);
    });
  }

  function startPolling() {
    if (pollTimer) return;
    pollTimer = window.setInterval(() => {
      if (document.visibilityState === "visible") pullState();
    }, POLL_MS);
  }

  doneBtn?.addEventListener("click", () => {
    chrome.runtime?.sendMessage?.({ type: "COMPANION_POMODORO_BREAK_DONE" });
  });

  mountRoot();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountRoot, { once: true });
  }

  chrome.runtime?.onMessage?.addListener((message) => {
    if (message?.type === "COMPANION_POMODORO_SYNC") {
      applyState(message.state);
    }
  });

  pullState();
  startPolling();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") pullState();
  });

  window.__ascPomodoroOverlay = { applyState, pullState, root };
})();
