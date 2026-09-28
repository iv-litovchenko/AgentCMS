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

  const VOICE_MESSAGE_PREFIX = "agent-cms-voice:";

  function isVoiceRelayMessage(data) {
    const type = data?.type;
    return typeof type === "string" && type.startsWith(VOICE_MESSAGE_PREFIX);
  }

  frame.addEventListener("load", () => {
    try {
      window.parent.postMessage({ type: "agent-shell-companion:voice-loaded", url: target }, "*");
    } catch {
      // ignore
    }
  });

  window.addEventListener("message", (event) => {
    if (event.source === frame.contentWindow) {
      if (isVoiceRelayMessage(event.data)) {
        window.parent.postMessage(event.data, "*");
      }
      return;
    }
    if (event.source === window.parent && isVoiceRelayMessage(event.data)) {
      frame.contentWindow?.postMessage(event.data, "*");
      return;
    }
    if (event.source === frame.contentWindow && event.data?.type === "agent-cms-voice:refresh-dialog-done") {
      window.parent.postMessage(event.data, "*");
    }
  });

  frame.src = target;
})();
