/** Mobile compose dock: visualViewport, keyboard dismiss (#40–41). */

export function initShellComposeLayout({ nodes, getSessionUiLocked = () => false } = {}) {
  const input = nodes.message;
  const dock = nodes.composeDock;
  const composePanel = nodes.composePanel;
  if (!input || !dock) return {};

  const mobileMq = window.matchMedia("(max-width: 480px)");

  function isComposeFullscreen() {
    return dock.classList.contains("is-expanded");
  }

  function syncComposeInputHeight() {
    if (isComposeFullscreen()) {
      input.style.height = "";
      input.style.overflowY = "";
      measureDockHeight();
      return;
    }

    const preserveSelection = document.activeElement === input;
    const selectionStart = preserveSelection ? input.selectionStart : null;
    const selectionEnd = preserveSelection ? input.selectionEnd : null;

    input.style.height = "0px";
    const styles = getComputedStyle(input);
    const minHeight = Number.parseFloat(styles.minHeight) || 0;
    const maxHeight = Number.parseFloat(styles.maxHeight);
    const contentHeight = input.scrollHeight;
    const cappedMax = Number.isFinite(maxHeight) && maxHeight > 0 ? maxHeight : contentHeight;
    const next = Math.min(cappedMax, Math.max(minHeight, contentHeight));
    input.style.height = `${next}px`;
    input.style.overflowY = contentHeight > next + 1 ? "auto" : "hidden";

    if (preserveSelection && selectionStart != null && selectionEnd != null) {
      try {
        input.setSelectionRange(selectionStart, selectionEnd);
      } catch {
        // ignore
      }
    }

    measureDockHeight();
  }

  function syncMobileLayoutClass() {
    document.body.classList.toggle("shell-layout-mobile", mobileMq.matches);
  }

  function measureDockHeight() {
    document.documentElement.style.setProperty("--shell-compose-dock-height", `${dock.offsetHeight}px`);
  }

  function syncKeyboardViewport() {
    if (getSessionUiLocked() && document.activeElement !== input) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const overlap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    const keyboardOpen = overlap > 80;

    document.documentElement.style.setProperty("--vv-keyboard", keyboardOpen ? `${overlap}px` : "0px");
    document.body.classList.toggle("shell-keyboard-open", keyboardOpen);

    if (keyboardOpen) measureDockHeight();
  }

  function resetViewport() {
    document.documentElement.style.setProperty("--vv-keyboard", "0px");
    document.body.classList.remove("shell-keyboard-open");
  }

  function keepsInputFocus(target) {
    if (!(target instanceof Element)) return false;
    return target === input || composePanel?.contains(target) || dock.contains(target);
  }

  document.addEventListener(
    "pointerdown",
    (event) => {
      if (keepsInputFocus(event.target)) return;
      if (document.activeElement === input) input.blur();
    },
    { passive: true }
  );

  input.addEventListener("input", syncComposeInputHeight);

  input.addEventListener("focus", () => {
    syncComposeInputHeight();
    syncKeyboardViewport();
    window.setTimeout(syncKeyboardViewport, 60);
    window.setTimeout(syncKeyboardViewport, 280);
  });

  input.addEventListener("blur", resetViewport);

  window.visualViewport?.addEventListener("resize", syncKeyboardViewport);
  window.visualViewport?.addEventListener("scroll", syncKeyboardViewport);
  window.addEventListener(
    "orientationchange",
    () => {
      window.setTimeout(() => {
        syncComposeInputHeight();
        syncKeyboardViewport();
      }, 120);
    },
    { passive: true }
  );

  mobileMq.addEventListener("change", () => {
    syncMobileLayoutClass();
    syncComposeInputHeight();
  });

  window.addEventListener("resize", syncComposeInputHeight, { passive: true });

  syncMobileLayoutClass();
  syncComposeInputHeight();

  return { resetViewport, measureDockHeight, syncKeyboardViewport, syncComposeInputHeight };
}
