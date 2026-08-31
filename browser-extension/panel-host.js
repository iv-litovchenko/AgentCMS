(function initPanelHost() {
  "use strict";

  const frame = document.getElementById("voice-frame");
  if (!frame) return;

  let target = "";
  try {
    target = String(new URLSearchParams(window.location.search).get("url") || "").trim();
  } catch {
    target = "";
  }

  if (!target) {
    document.body.innerHTML =
      '<div class="host-error">Не передан URL Agent CMS Voice. Откройте Side Panel заново или нажмите «Обновить».</div>';
    return;
  }

  frame.addEventListener("load", () => {
    try {
      window.parent.postMessage({ type: "agent-shell-companion:voice-loaded", url: target }, "*");
    } catch {
      // ignore
    }
  });

  frame.src = target;
})();
