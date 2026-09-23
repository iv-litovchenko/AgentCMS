const TTS_PLAYBACK_HINTS = {
  dialog: "Диалог 💬 — озвучка по мере печати, только до маркера [tts-break].",
  reading: "Чтение 📖 — ждёт полный ответ, затем озвучивает только до [tts-break]."
};

export function updateVoiceModeHint(
  mode = "hold",
  hintEl = document.getElementById("shell-voice-control"),
  { resolvedSource = "browser", sttCapture = "microphone" } = {}
) {
  if (!hintEl) return;
  if (mode === "disabled") {
    hintEl.dataset.hint = "Голосовой ввод выключен";
    return;
  }
  const modeHints = {
    live: "Живой диалог — фраза по паузе",
    meeting: "Встреча — 🎤 старт / стоп записи",
    hold: "Голосовое — удерживать 🎤",
    fn_button: "Shift — удерживать клавишу или 🎤"
  };
  let hint = modeHints[mode] || modeHints.hold;
  void resolvedSource;
  void sttCapture;
  const hints = {
    live: hint,
    meeting: hint,
    hold: hint,
    fn_button: hint
  };
  const next = hints[mode] ? mode : "hold";
  hintEl.dataset.hint = hints[next];
}

export function bindTtsPlaybackOptionHints() {
  document.querySelectorAll("[data-tts-playback]").forEach((el) => {
    const mode = el.dataset.ttsPlayback;
    if (TTS_PLAYBACK_HINTS[mode]) el.dataset.hint = TTS_PLAYBACK_HINTS[mode];
  });
}

const PROACTIVE_MODE_HINTS = {
  off: "Никаких фоновых проверок и вызовов агента.",
  natural:
    "Естественная проактивность — по звукам, действиям пользователя и контексту, без пингов по таймеру. Скоро.",
  ping:
    "После бездействия Shell ждёт случайный интервал в диапазоне «от–до» и отправляет промпт ниже агенту. В чате пинг виден как свёрнутый блок [proactive]; агенту уходит текст без тегов. Быстрое переключение — кнопка ✨ Проактив внизу (выкл ↔ по пингу). Плейсхолдеры: {{agent-cms-voice:idle_seconds}}, {{agent-cms-voice:idle_minutes}}. Отдельно от системного промпта (вкладка «Маршрут»)."
};

export function bindProactiveModeOptionHints() {
  document.querySelectorAll("[data-proactive-mode]").forEach((el) => {
    const mode = el.dataset.proactiveMode;
    if (PROACTIVE_MODE_HINTS[mode]) el.dataset.hint = PROACTIVE_MODE_HINTS[mode];
  });
}

export function updateTtsPlaybackHint() {
  /* подсказки на каждой кнопке — см. bindTtsPlaybackOptionHints */
}

export function initShellHints() {
  let node = document.getElementById("shell-floating-hint");
  if (!node) {
    node = document.createElement("div");
    node.id = "shell-floating-hint";
    node.className = "shell-floating-hint hidden";
    node.setAttribute("role", "tooltip");
    document.body.appendChild(node);
  }

  let active = null;

  function hide() {
    active = null;
    node.classList.add("hidden");
  }

  function positionHint(anchor) {
    const rect = anchor.getBoundingClientRect();
    node.classList.remove("hidden");
    const margin = 8;
    const tipW = node.offsetWidth;
    const tipH = node.offsetHeight;
    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tipW - margin));
    let top = rect.top - tipH - margin;
    if (top < margin) top = rect.bottom + margin;
    node.style.left = `${Math.round(left)}px`;
    node.style.top = `${Math.round(top)}px`;
  }

  function show(anchor) {
    const text = String(anchor?.dataset?.hint || anchor?.getAttribute("title") || "").trim();
    if (!text) return;
    active = anchor;
    node.textContent = text;
    positionHint(anchor);
  }

  bindTtsPlaybackOptionHints();
  bindProactiveModeOptionHints();

  document.querySelectorAll("[data-hint]").forEach((el) => {
    if (el.dataset.hintBound === "1") return;
    el.dataset.hintBound = "1";
    el.addEventListener("mouseenter", () => show(el));
    el.addEventListener("mouseleave", hide);
    el.addEventListener("focusin", () => show(el));
    el.addEventListener("focusout", hide);
  });

  window.addEventListener(
    "scroll",
    () => {
      if (active) positionHint(active);
    },
    true
  );
  window.addEventListener("resize", () => {
    if (active) positionHint(active);
  });

  updateVoiceModeHint(document.getElementById("shell-voice-mode")?.value || "hold");
}
