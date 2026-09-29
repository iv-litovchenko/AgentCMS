/**
 * Режим скрытия чувствительных данных (заглушка): toggle в шапке + класс на документе.
 */
(function initPrivacyMode() {
  const STORAGE_KEY = "agent-cms-privacy-mode";
  const toggleBtn = document.getElementById("privacy-mode-toggle-btn");
  const discussShellIframeNode = document.getElementById("discuss-shell-iframe");

  if (!toggleBtn) return;

  let enabled = readState();
  let hintNode = null;
  let hintAnchor = null;

  function readState() {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function saveState(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    } catch {
      // ignore
    }
  }

  function tooltipText(active) {
    return active
      ? "Идея: показать чувствительные данные"
      : "Идея: скрыть чувствительные данные (пока демо — размывает пароли и секреты)";
  }

  function ariaLabel(active) {
    return active ? "Идея: показать чувствительные данные" : "Идея: скрыть чувствительные данные";
  }

  function getVoicePostMessageOrigin() {
    const src = discussShellIframeNode?.getAttribute("src") || discussShellIframeNode?.src || "";
    if (!src) return "*";
    try {
      return new URL(src, window.location.href).origin;
    } catch {
      return "*";
    }
  }

  function notifyShellIframe() {
    if (!discussShellIframeNode?.contentWindow) return;
    try {
      discussShellIframeNode.contentWindow.postMessage(
        { type: "agent-cms-voice:privacy-mode", enabled },
        getVoicePostMessageOrigin()
      );
    } catch {
      // ignore
    }
  }

  function ensureHintNode() {
    if (hintNode) return hintNode;
    hintNode = document.getElementById("app-floating-hint");
    if (!hintNode) {
      hintNode = document.createElement("div");
      hintNode.id = "app-floating-hint";
      hintNode.className = "app-floating-hint hidden";
      hintNode.setAttribute("role", "tooltip");
      document.body.appendChild(hintNode);
    }
    return hintNode;
  }

  function hideHint() {
    hintAnchor = null;
    ensureHintNode().classList.add("hidden");
  }

  function positionHint(anchor) {
    const node = ensureHintNode();
    const rect = anchor.getBoundingClientRect();
    const margin = 8;
    node.classList.remove("hidden");
    const tipW = node.offsetWidth;
    const tipH = node.offsetHeight;
    let left = rect.left + rect.width / 2 - tipW / 2;
    left = Math.max(margin, Math.min(left, window.innerWidth - tipW - margin));
    let top = rect.bottom + margin;
    if (top + tipH > window.innerHeight - margin) {
      top = rect.top - tipH - margin;
    }
    node.style.left = `${Math.round(left)}px`;
    node.style.top = `${Math.round(top)}px`;
  }

  function showHint(anchor) {
    const text = String(anchor?.dataset?.hint || anchor?.getAttribute("title") || "").trim();
    if (!text) return;
    hintAnchor = anchor;
    const node = ensureHintNode();
    node.textContent = text;
    positionHint(anchor);
  }

  function bindFloatingHint(anchor) {
    if (!anchor || anchor.dataset.hintBound === "1") return;
    anchor.dataset.hintBound = "1";
    anchor.addEventListener("mouseenter", () => showHint(anchor));
    anchor.addEventListener("mouseleave", hideHint);
    anchor.addEventListener("focusin", () => showHint(anchor));
    anchor.addEventListener("focusout", hideHint);
  }

  function apply() {
    const hint = tooltipText(enabled);
    document.documentElement.classList.toggle("is-privacy-mode", enabled);
    toggleBtn.classList.toggle("is-active", enabled);
    toggleBtn.setAttribute("aria-pressed", enabled ? "true" : "false");
    toggleBtn.dataset.hint = hint;
    toggleBtn.title = hint;
    toggleBtn.setAttribute("aria-label", ariaLabel(enabled));
    if (hintAnchor === toggleBtn) {
      showHint(toggleBtn);
    }
    notifyShellIframe();
  }

  function setEnabled(next) {
    enabled = Boolean(next);
    saveState(enabled);
    apply();
    try {
      window.dispatchEvent(
        new CustomEvent("agent-cms:privacy-mode-change", { detail: { enabled } })
      );
    } catch {
      // ignore
    }
  }

  if (toggleBtn.dataset.bound !== "1") {
    toggleBtn.dataset.bound = "1";
    toggleBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setEnabled(!enabled);
    });
  }

  if (discussShellIframeNode && discussShellIframeNode.dataset.privacyBound !== "1") {
    discussShellIframeNode.dataset.privacyBound = "1";
    discussShellIframeNode.addEventListener("load", () => notifyShellIframe());
  }

  bindFloatingHint(toggleBtn);
  window.addEventListener(
    "scroll",
    () => {
      if (hintAnchor) positionHint(hintAnchor);
    },
    true
  );
  window.addEventListener("resize", () => {
    if (hintAnchor) positionHint(hintAnchor);
  });

  apply();

  window.AgentCmsPrivacyMode = {
    isEnabled: () => enabled,
    setEnabled,
    toggle: () => setEnabled(!enabled)
  };
})();
