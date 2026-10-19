import { initShellCharacter } from "@shell/character";
import { loadStoredCharacterId } from "@shell/character-models";

const stage = document.getElementById("shell-pet-stage");
const closeBtn = document.getElementById("shell-pet-close");
const waves = document.getElementById("shell-pet-waves");
const actionButtons = Array.from(document.querySelectorAll(".shell-pet-action"));

let remotePhase = "waiting";
let hoverPhase = "";
let hoverTimer = null;
let soundApiPromise = null;

function getSoundApi() {
  if (!soundApiPromise) {
    soundApiPromise = import("@shell/ui-sounds");
  }
  return soundApiPromise;
}

function loadPetCharacterId() {
  const stored = loadStoredCharacterId();
  if (stored === "cloud") return "robot";
  return stored;
}

function applyPetPhase(phase) {
  const next = String(phase || "waiting").trim() || "waiting";
  if (stage) stage.dataset.phase = next;
}

function setHoverPreview(active, phase = "") {
  hoverPhase = active ? String(phase || "").trim() : "";
  stage?.classList.toggle("is-action-hover", Boolean(active));
  waves?.classList.toggle("is-active", Boolean(active));
  if (active && phase) {
    applyPetPhase(phase);
    return;
  }
  applyPetPhase(remotePhase);
}

function clearHoverPreview() {
  if (hoverTimer) {
    window.clearTimeout(hoverTimer);
    hoverTimer = null;
  }
  void getSoundApi()
    .then((sound) => sound.stopShellProcessingAmbient())
    .catch(() => {});
  setHoverPreview(false);
}

function previewActionFeedback(phase) {
  void getSoundApi()
    .then(async (sound) => {
      sound.primeShellProcessingAudio();
      if (phase === "listening") {
        sound.playShellMicSound("press");
        return;
      }
      if (phase === "thinking") {
        await sound.previewShellProcessingAmbient(sound.readProcessingSound(), 4200);
        return;
      }
      if (phase === "speaking") {
        sound.playShellMicSound("release");
      }
    })
    .catch(() => {});
}

function showPetBootError(message) {
  const viewport = stage?.querySelector(".shell-character-viewport");
  if (!viewport || viewport.querySelector(".shell-character-status")) return;
  viewport.insertAdjacentHTML(
    "beforeend",
    `<div class="shell-character-status">${message}</div>`
  );
}

function setupPetWindowDrag() {
  const viewport = stage?.querySelector(".shell-character-viewport");
  const moveBy = window.shellApp?.movePetWindowBy;
  if (!viewport || typeof moveBy !== "function") return;

  document.body.classList.add("shell-pet-electron");
  viewport.querySelector(".shell-pet-drag-layer")?.remove();

  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  viewport.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    if (event.target.closest("#shell-pet-close, .shell-pet-action")) return;
    dragging = true;
    lastX = event.screenX;
    lastY = event.screenY;
    viewport.classList.add("is-dragging");
    event.preventDefault();
  });

  window.addEventListener("mousemove", (event) => {
    if (!dragging) return;
    const dx = event.screenX - lastX;
    const dy = event.screenY - lastY;
    if (!dx && !dy) return;
    lastX = event.screenX;
    lastY = event.screenY;
    void moveBy(dx, dy);
  });

  const stopDrag = () => {
    dragging = false;
    viewport.classList.remove("is-dragging");
  };
  window.addEventListener("mouseup", stopDrag);
  window.addEventListener("blur", stopDrag);
}

function refreshPetCharacter() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      stage?.shellCharacterApi?.refresh?.();
    });
  });
}

async function bootPetCharacter() {
  try {
    setupPetWindowDrag();
    await initShellCharacter(stage, null);
    stage?.shellCharacterApi?.setModel?.(loadPetCharacterId());
    applyPetPhase("waiting");
    refreshPetCharacter();
    window.setTimeout(refreshPetCharacter, 250);
    window.setTimeout(refreshPetCharacter, 900);
  } catch (error) {
    console.error("[shell-pet] character init failed", error);
    showPetBootError("Не удалось загрузить персонажа");
  }
}

void bootPetCharacter();

for (const btn of actionButtons) {
  btn.addEventListener("mouseenter", () => {
    const phase = btn.dataset.petPhase || "waiting";
    setHoverPreview(true, phase);
    previewActionFeedback(phase);
  });
  btn.addEventListener("mouseleave", () => {
    hoverTimer = window.setTimeout(clearHoverPreview, 80);
  });
  btn.addEventListener("focus", () => {
    const phase = btn.dataset.petPhase || "waiting";
    setHoverPreview(true, phase);
    previewActionFeedback(phase);
  });
  btn.addEventListener("blur", clearHoverPreview);
}

window.shellApp?.onPetPhase?.((payload) => {
  if (payload?.characterModel) {
    const next = String(payload.characterModel).trim();
    stage?.shellCharacterApi?.setModel?.(next === "cloud" ? "robot" : next);
    refreshPetCharacter();
  }
  if (hoverPhase) return;
  remotePhase = String(payload?.phase || "waiting").trim() || "waiting";
  applyPetPhase(remotePhase);
});

function hidePetOverlay() {
  clearHoverPreview();
  if (window.shellApp?.setPetOverlay) {
    void window.shellApp.setPetOverlay(false);
    return;
  }
  window.close();
}

function bindPetCloseButton() {
  if (!closeBtn) return;
  let closing = false;
  const onClose = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (closing) return;
    closing = true;
    hidePetOverlay();
  };
  closeBtn.addEventListener("click", onClose, true);
}

bindPetCloseButton();

stage?.addEventListener("dblclick", (event) => {
  if (event.target.closest("#shell-pet-close, .shell-pet-action")) return;
  if (window.shellApp?.showMainWindow) {
    void window.shellApp.showMainWindow();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") hidePetOverlay();
});

window.addEventListener("beforeunload", clearHoverPreview);
