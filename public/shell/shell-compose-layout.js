/** Mobile compose dock: visualViewport, keyboard dismiss (#40–41). */

export function initShellComposeLayout({ nodes, getSessionUiLocked = () => false } = {}) {
  const input = nodes.message;
  const dock = nodes.composeDock;
  const composePanel = nodes.composePanel;
  if (!input || !dock) return {};

  const mobileMq = window.matchMedia("(max-width: 480px)");

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
    const keyboardOpen = overlap > 40 || document.activeElement === input;

    document.documentElement.style.setProperty("--vv-keyboard", keyboardOpen ? `${overlap}px` : "0px");
    document.body.classList.toggle("shell-keyboard-open", keyboardOpen);

    if (keyboardOpen) measureDockHeight();
  }

  function resetViewport() {
    if (document.activeElement === input) return;
    document.documentElement.style.setProperty("--vv-keyboard", "0px");
    document.body.classList.remove("shell-keyboard-open");
    const snap = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    snap();
    requestAnimationFrame(snap);
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

  input.addEventListener("focus", () => {
    measureDockHeight();
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
        measureDockHeight();
        syncKeyboardViewport();
      }, 120);
    },
    { passive: true }
  );

  mobileMq.addEventListener("change", () => {
    syncMobileLayoutClass();
    measureDockHeight();
  });

  window.addEventListener("resize", measureDockHeight, { passive: true });

  syncMobileLayoutClass();
  measureDockHeight();

  return { resetViewport, measureDockHeight, syncKeyboardViewport };
}
