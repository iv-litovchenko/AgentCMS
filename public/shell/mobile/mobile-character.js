import { initShellCharacter } from "/shell/shell-character.js?v=18";

let stageEl = null;
let pickerOpen = false;

function buildStageHtml() {
  return `
    <section class="mobile-character-stage shell-character-stage" data-phase="waiting" aria-label="Персонаж">
      <div class="shell-character-viewport mobile-character-viewport"></div>
      <button type="button" class="mobile-character-toggle" id="mobile-character-toggle" aria-expanded="false" aria-label="Выбор модели">🎭</button>
      <div class="shell-character-picker-wrap mobile-character-picker-wrap hidden" id="mobile-character-picker-wrap">
        <div class="shell-character-picker mobile-character-picker" id="mobile-character-picker"></div>
      </div>
    </section>
  `;
}

function setPickerOpen(open) {
  pickerOpen = open;
  const wrap = stageEl?.querySelector("#mobile-character-picker-wrap");
  const btn = stageEl?.querySelector("#mobile-character-toggle");
  wrap?.classList.toggle("hidden", !open);
  if (btn) {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  }
}

export async function initMobileCharacter(mountEl) {
  if (!mountEl) return null;
  mountEl.innerHTML = buildStageHtml();
  mountEl.classList.add("mobile-character-mount");
  stageEl = mountEl.querySelector(".mobile-character-stage");

  const toggle = mountEl.querySelector("#mobile-character-toggle");
  toggle?.addEventListener("click", () => setPickerOpen(!pickerOpen));

  try {
    await initShellCharacter(stageEl, null);
  } catch {
    // shell-character falls back to CSS cloud internally
  }

  stageEl.querySelector(".shell-character-picker")?.addEventListener("click", (event) => {
    if (event.target.closest(".shell-character-option")) setPickerOpen(false);
  });

  return stageEl;
}

export function setMobileCharacterPhase(phase) {
  if (!stageEl) return;
  stageEl.dataset.phase = phase || "waiting";
}

export function closeMobileCharacterPicker() {
  setPickerOpen(false);
}
