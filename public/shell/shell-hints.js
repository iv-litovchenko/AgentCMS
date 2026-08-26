const TTS_PLAYBACK_HINTS = {
  dialog: "Диалог — озвучка по мере печати ответа (как живой разговор).",
  reading: "Чтение — ждёт полный текст на экране и маркер ::: VOICE-END :::, затем читает целиком."
};

export function updateVoiceModeHint(
  mode = "hold",
  hintEl = document.getElementById("shell-voice-control")
) {
  if (!hintEl) return;
  if (mode === "disabled") {
    hintEl.dataset.hint = "Голосовой ввод выключен — включите «Голосовой ввод (STT)» в панели выше.";
    return;
  }
  const hints = {
    live:
      "Sidecar постоянно слушает. Фраза по паузе → агенту. Ваш голос останавливает TTS. Нужен npm run shell:sidecar.",
    wake_name:
      "Sidecar слушает всегда, но шлёт агенту только если в речи есть wake-имя (поле в ⚙️ STT). Нужен sidecar.",
    meeting:
      "🎤 — старт/стоп длинной записи. Аудио → awn-dialogs/records/, текст → агенту. Нужен sidecar.",
    hold:
      "Зажмите 🎤 — говорите — отпустите. Без «Глобально» — Web Speech в Shell. С «Глобально» — sidecar.",
    fn_button:
      "Удерживайте Shift. Без «Глобально» — когда Shell в фокусе (не в поле ввода). С «Глобально» + sidecar — в любом приложении."
  };
  const next = hints[mode] ? mode : "hold";
  hintEl.dataset.hint = hints[next];
}

export function updateTtsPlaybackHint(mode = "dialog", hintEl = document.getElementById("shell-tts-playback-hint")) {
  if (!hintEl) return;
  const next = mode === "reading" ? "reading" : "dialog";
  hintEl.dataset.hint = TTS_PLAYBACK_HINTS[next];
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

  updateTtsPlaybackHint(
    document.querySelector('#shell-tts-playback-mode input[name="shell-tts-playback-mode"]:checked')?.value ||
      "dialog"
  );
  updateVoiceModeHint(document.getElementById("shell-voice-mode")?.value || "hold");
}
