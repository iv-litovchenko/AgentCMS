(function initCompanionPomodoroToolbar(global) {
  const P = global.CompanionPomodoro;

  function formatMmSs(ms) {
    if (P?.formatMmSs) return P.formatMmSs(ms);
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }

  function workLabel(minutes) {
    const m = Number(minutes) || 25;
    return `${m} мин`;
  }

  function send(type) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type }, (response) => {
          resolve(response);
        });
      } catch {
        resolve(null);
      }
    });
  }

  function createCompanionPomodoroDock() {
    const wrap = document.createElement("div");
    wrap.className = "asc-brand-pomodoro";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "asc-btn asc-btn--pomodoro asc-btn--icon-only";
    btn.title = "Помидор — фокус 25 мин";
    btn.setAttribute("aria-label", "Помидор");
    btn.setAttribute("aria-haspopup", "dialog");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<span class="asc-pomodoro-btn-label" aria-hidden="true">🍅</span>';

    const pop = document.createElement("div");
    pop.className = "asc-brand-pomodoro-pop";
    pop.hidden = true;
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-label", "Помидор");

    const status = document.createElement("p");
    status.className = "asc-brand-pomodoro-status";

    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.className = "asc-brand-pomodoro-start";
    startBtn.textContent = "Начать фокус";

    const stopBtn = document.createElement("button");
    stopBtn.type = "button";
    stopBtn.className = "asc-brand-pomodoro-stop";
    stopBtn.textContent = "Остановить";
    stopBtn.hidden = true;

    pop.append(status, startBtn, stopBtn);
    wrap.append(btn, pop);

    let open = false;
    let clientState = null;
    let tickTimer = null;

    function setPopOpen(next) {
      open = Boolean(next);
      pop.hidden = !open;
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.classList.toggle("is-open", open);
    }

    function remainingMs(state) {
      if (!state || state.phase === "idle") return 0;
      const ends = Number(state.phaseEndsAt) || 0;
      return Math.max(0, ends - Date.now());
    }

    function updateUi(state) {
      clientState = state;
      if (!state) return;
      const phase = state.phase || "idle";
      const rem = remainingMs(state);
      const wm = state.workMinutes || P?.DEFAULT_WORK_MINUTES || 25;

      if (phase === "work") {
        btn.querySelector(".asc-pomodoro-btn-label").textContent = formatMmSs(rem);
        btn.title = `Помидор: фокус · ${formatMmSs(rem)}`;
        btn.classList.add("is-work");
        btn.classList.remove("is-break");
        status.textContent = `Фокус: осталось ${formatMmSs(rem)} из ${workLabel(wm)}.`;
        startBtn.hidden = true;
        stopBtn.hidden = false;
        return;
      }
      if (phase === "break") {
        btn.querySelector(".asc-pomodoro-btn-label").textContent = "☕";
        btn.title = "Помидор: перерыв";
        btn.classList.add("is-break");
        btn.classList.remove("is-work");
        status.textContent = `Перерыв: ${formatMmSs(rem)} — закройте заставку кнопкой «Отдохнули».`;
        startBtn.hidden = true;
        stopBtn.hidden = false;
        return;
      }

      btn.querySelector(".asc-pomodoro-btn-label").textContent = "🍅";
      btn.title = `Помидор — фокус ${workLabel(wm)}`;
      btn.classList.remove("is-work", "is-break");
      status.textContent = `Готовы к фокусу на ${workLabel(wm)}?`;
      startBtn.textContent = `Начать ${workLabel(wm)}`;
      startBtn.hidden = false;
      stopBtn.hidden = true;
    }

    function ensureTick() {
      if (tickTimer) return;
      tickTimer = window.setInterval(() => {
        if (!clientState || clientState.phase === "idle") {
          clearInterval(tickTimer);
          tickTimer = null;
          return;
        }
        updateUi(clientState);
      }, 1000);
    }

    function applyState(state) {
      updateUi(state);
      if (state?.phase === "work" || state?.phase === "break") ensureTick();
    }

    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      setPopOpen(!open);
    });

    for (const eventName of ["pointerdown", "mousedown", "click", "dblclick"]) {
      pop.addEventListener(eventName, (event) => event.stopPropagation());
    }

    startBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      const res = await send("COMPANION_POMODORO_START");
      if (res?.state) applyState(res.state);
      setPopOpen(false);
    });

    stopBtn.addEventListener("click", async (event) => {
      event.stopPropagation();
      const res = await send("COMPANION_POMODORO_STOP");
      if (res?.state) applyState(res.state);
      setPopOpen(false);
    });

    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === "COMPANION_POMODORO_SYNC") {
        applyState(message.state);
      }
    });

    void send("COMPANION_POMODORO_GET_STATE").then((res) => {
      if (res?.state) applyState(res.state);
    });

    return {
      wrap,
      applyState,
      closePop: () => setPopOpen(false)
    };
  }

  global.createCompanionPomodoroDock = createCompanionPomodoroDock;
})(globalThis);
