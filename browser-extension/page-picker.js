/**
 * Select Element on ordinary websites — relays picked text to Agent Shell Companion / Voice.
 */
(function initCompanionPagePicker() {
  if (window.__agentShellCompanionPagePicker) return;
  window.__agentShellCompanionPagePicker = true;

  const MESSAGE_SET = "COMPANION_PAGE_PICKER_SET";
  const MESSAGE_PING = "COMPANION_PAGE_PICKER_PING";
  const MESSAGE_STATE = "COMPANION_PAGE_PICKER_STATE";
  const MESSAGE_INSERT = "COMPANION_COMPOSE_INSERT";
  const MESSAGE_SNAPSHOT_REQUEST = "COMPANION_PAGE_SNAPSHOT_REQUEST";
  const VOICE_MESSAGE_SET = "agent-cms-voice:page-picker-set";
  const VOICE_MESSAGE_INSERT = "agent-cms-voice:compose-insert";
  const MAX_TEXT_LENGTH = 12000;

  let active = false;
  let rootNode = null;
  let highlightNode = null;
  let hintNode = null;
  let hoveredTarget = null;

  function notifyPickerState() {
    try {
      chrome.runtime.sendMessage({ type: MESSAGE_STATE, active }).catch(() => {});
    } catch {
      // ignore
    }
  }

  function insertIntoVoiceCompose(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return false;
    const payload = { type: VOICE_MESSAGE_INSERT, text: trimmed, join: "newline" };
    try {
      window.postMessage(payload, "*");
    } catch {
      // ignore
    }
    try {
      chrome.runtime.sendMessage({ type: MESSAGE_INSERT, text: trimmed, join: "newline" }).catch(() => {});
    } catch {
      // ignore
    }
    return true;
  }

  function syncPickerState(nextActive) {
    active = Boolean(nextActive);
    document.body.classList.toggle("is-cms-page-picker-active", active);
    rootNode?.classList.toggle("is-active", active);
    if (!active) {
      hoveredTarget = null;
      hideHighlight();
    }
    notifyPickerState();
  }

  function isPickerExcluded(el) {
    if (!el) return true;
    if (
      el.closest(
        "#agent-shell-companion-toolbar, .cms-page-picker-root, script, style, noscript, iframe"
      )
    ) {
      return true;
    }
    const host = el.getRootNode?.()?.host;
    if (host?.id === "agent-shell-companion-toolbar") return true;
    if (host?.closest?.("#agent-shell-companion-toolbar, .cms-page-picker-root")) return true;
    return false;
  }

  function normalizePickerTextPreservingLines(text) {
    return String(text || "")
      .replace(/\u00a0/g, " ")
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function extractPickerText(el) {
    if (!el) return "";
    let text = "";
    try {
      text = el.innerText || el.textContent || "";
    } catch {
      text = el.textContent || "";
    }
    text = normalizePickerTextPreservingLines(text);
    if (!text) return "";
    if (text.length > MAX_TEXT_LENGTH) {
      return `${text.slice(0, MAX_TEXT_LENGTH).trimEnd()}…`;
    }
    return text;
  }

  function elementAtPoint(x, y) {
    return (
      window.PagePickerExtract?.deepElementFromPoint?.(x, y) ||
      document.elementFromPoint(x, y)
    );
  }

  function resolvePickerTarget(raw) {
    return (
      window.PagePickerExtract?.resolveTextBlockTarget?.(raw, {
        isExcluded: isPickerExcluded,
        extractText: extractPickerText,
        isFormField: (el) => window.PagePickerExtract?.isFormField?.(el)
      }) || null
    );
  }

  function extractPickerPayload(el) {
    const special = window.PagePickerExtract?.extractPickerInsertValue?.(el);
    if (special) return special;
    return extractPickerText(el);
  }

  function hideHighlight() {
    if (!highlightNode) return;
    highlightNode.style.display = "none";
  }

  function showHighlight(target) {
    if (!highlightNode || !target) return;
    const rect = target.getBoundingClientRect();
    if (rect.width <= 0 && rect.height <= 0) {
      hideHighlight();
      return;
    }
    highlightNode.style.display = "block";
    highlightNode.style.top = `${Math.max(0, rect.top)}px`;
    highlightNode.style.left = `${Math.max(0, rect.left)}px`;
    highlightNode.style.width = `${Math.max(0, rect.width)}px`;
    highlightNode.style.height = `${Math.max(0, rect.height)}px`;
  }

  function onPointerMove(event) {
    if (!active) return;
    const raw = elementAtPoint(event.clientX, event.clientY);
    const target = resolvePickerTarget(raw);
    if (target === hoveredTarget) return;
    hoveredTarget = target;
    if (target) showHighlight(target);
    else hideHighlight();
  }

  function onPointerDown(event) {
    if (!active) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function onClick(event) {
    if (!active) return;
    event.preventDefault();
    event.stopPropagation();

    const raw = elementAtPoint(event.clientX, event.clientY);
    const target = resolvePickerTarget(raw);
    const text = extractPickerPayload(target);
    if (text) insertIntoVoiceCompose(text);
  }

  function onKeyDown(event) {
    if (!active) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      syncPickerState(false);
    }
  }

  function ensureDom() {
    if (rootNode) return;
    rootNode = document.createElement("div");
    rootNode.className = "cms-page-picker-root";
    rootNode.setAttribute("aria-hidden", "true");

    hintNode = document.createElement("div");
    hintNode.className = "cms-page-picker-hint";
    hintNode.textContent = "Наведите на текст, ссылку или картинку · Esc — выключить";

    highlightNode = document.createElement("div");
    highlightNode.className = "cms-page-picker-highlight";

    rootNode.append(hintNode, highlightNode);
    document.body.appendChild(rootNode);
  }

  function relayTopLevelVoicePageSnapshotRequest(event) {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.type !== "agent-cms-voice:page-snapshot-request") return;
    if (window.parent !== window) return;

    const requestId = String(data.requestId || "").trim();
    if (!requestId) return;

    try {
      chrome.runtime.sendMessage({ type: "COMPANION_PAGE_SNAPSHOT_REQUEST" }, (response) => {
        const lastError = chrome.runtime.lastError;
        window.postMessage(
          {
            type: "agent-cms-voice:page-snapshot-response",
            requestId,
            ok: Boolean(!lastError && response?.ok && response?.snapshot),
            snapshot: response?.snapshot || null,
            error: lastError?.message || response?.error || ""
          },
          "*"
        );
      });
    } catch {
      // ignore
    }
  }

  function bindPicker() {
    ensureDom();
    document.addEventListener("mousemove", onPointerMove, true);
    document.addEventListener("pointermove", onPointerMove, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);

    try {
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message?.type === MESSAGE_PING) {
          sendResponse({ ok: true });
          return true;
        }
        if (message?.type === MESSAGE_SNAPSHOT_REQUEST) {
          const snapshot = window.PageSnapshot?.collect?.() || null;
          sendResponse({ ok: Boolean(snapshot), snapshot });
          return true;
        }
        if (message?.type !== MESSAGE_SET) return;
        syncPickerState(Boolean(message.active));
        sendResponse({ ok: true });
        return true;
      });
    } catch {
      // ignore
    }

    window.addEventListener("message", (event) => {
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type !== VOICE_MESSAGE_SET) return;
      if (event.source !== window && event.source !== window.parent) return;
      syncPickerState(Boolean(data.active));
    });
  }

  bindPicker();
  window.addEventListener("message", relayTopLevelVoicePageSnapshotRequest);

  window.AgentCompanionPagePicker = {
    setActive: syncPickerState,
    isActive: () => active
  };
})();
