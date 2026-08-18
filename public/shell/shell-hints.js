const TTS_PLAYBACK_HINTS = {
  dialog: "Диалог — озвучка по мере печати ответа (как живой разговор).",
  reading: "Чтение — ждёт полный текст на экране и маркер ::: VOICE-END :::, затем читает целиком."
};

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

  updateTtsPlaybackHint(document.getElementById("shell-tts-playback-mode")?.value || "dialog");
}
