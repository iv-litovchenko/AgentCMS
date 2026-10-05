/**
 * Voice в Side Panel открыт top-level (не iframe) — мост runtime ↔ postMessage.
 */
(function initCompanionVoiceRelay() {
  "use strict";

  try {
    if (!/[?&]companion=1/.test(String(location.search || ""))) return;
  } catch {
    return;
  }

  if (window.__agentShellCompanionVoiceRelay) return;
  window.__agentShellCompanionVoiceRelay = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || typeof message !== "object") return;

    if (message.type === "COMPANION_COMPOSE_INSERT_TO_SHELL") {
      const text = String(message.text || "").trim();
      if (!text) {
        sendResponse({ ok: false, error: "empty" });
        return true;
      }
      window.postMessage(
        { type: "agent-cms-voice:compose-insert", text, join: message.join || "newline" },
        "*"
      );
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === "COMPANION_VOICE_RELAY" && message.payload && typeof message.payload === "object") {
      window.postMessage(message.payload, "*");
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== "agent-cms-voice:page-picker-set") return;
    chrome.runtime
      .sendMessage({
        type: "COMPANION_PAGE_PICKER_SET",
        active: Boolean(data.active),
        useSenderTab: true
      })
      .catch(() => {});
  });
})();
