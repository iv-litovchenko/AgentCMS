/**
 * Поля с data-sensitive: глобальный режим (privacy-mode.js) маскирует все;
 * «глазик» на поле — только при включённом глобальном режиме, временно показать это поле.
 */
(function initAgentSensitiveInputs() {
  const REVEAL_CLASS = "is-revealed";

  function isPrivacyEnabled() {
    return Boolean(window.AgentCmsPrivacyMode?.isEnabled?.()) ||
      document.documentElement.classList.contains("is-privacy-mode");
  }

  function rememberInputType(input) {
    if (input.dataset.sensitiveTypeRestore) return;
    const type = String(input.getAttribute("type") || "text").trim() || "text";
    input.dataset.sensitiveTypeRestore = type;
    input.setAttribute("data-sensitive-input-type", type);
  }

  function syncToggleVisibility(wrap, btn, privacy) {
    if (!btn) return;
    const showFieldToggle = Boolean(privacy);
    btn.hidden = !showFieldToggle;
    btn.tabIndex = showFieldToggle ? 0 : -1;
    wrap.classList.toggle("is-field-reveal-available", showFieldToggle);
  }

  function syncWrap(wrap) {
    const input = wrap.querySelector("input[data-sensitive], input");
    const btn = wrap.querySelector(".agent-sensitive-toggle");
    if (!input) return;

    rememberInputType(input);
    const restoreType = input.dataset.sensitiveTypeRestore || "text";
    const privacy = isPrivacyEnabled();

    if (!privacy) {
      wrap.classList.remove(REVEAL_CLASS);
      input.type = restoreType;
      input.classList.remove("is-sensitive-masked");
      input.removeAttribute("readonly");
      btn?.setAttribute("aria-pressed", "false");
      syncToggleVisibility(wrap, btn, false);
      return;
    }

    syncToggleVisibility(wrap, btn, true);

    const revealed = wrap.classList.contains(REVEAL_CLASS);
    if (!revealed) {
      if (restoreType === "password") {
        input.type = "password";
        input.classList.remove("is-sensitive-masked");
      } else {
        input.type = restoreType;
        input.classList.add("is-sensitive-masked");
      }
      btn?.setAttribute("aria-pressed", "false");
      return;
    }

    input.type = restoreType === "password" ? "text" : restoreType;
    input.classList.remove("is-sensitive-masked");
    btn?.setAttribute("aria-pressed", "true");
  }

  function bindWrap(wrap) {
    if (!wrap || wrap.dataset.sensitiveBound === "1") return;
    wrap.dataset.sensitiveBound = "1";
    const input = wrap.querySelector("input");
    const btn = wrap.querySelector(".agent-sensitive-toggle");
    if (!input || !btn) return;

    const showLabel = btn.getAttribute("aria-label") || "Показать значение";
    const hideLabel = showLabel.startsWith("Показать")
      ? showLabel.replace(/^Показать/, "Скрыть")
      : `Скрыть ${showLabel}`;
    btn.dataset.showLabel = showLabel;

    btn.setAttribute("aria-pressed", "false");
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!isPrivacyEnabled()) return;

      const willReveal = !wrap.classList.contains(REVEAL_CLASS);
      wrap.classList.toggle(REVEAL_CLASS, willReveal);
      btn.setAttribute("aria-pressed", willReveal ? "true" : "false");
      btn.title = willReveal ? "Скрыть" : "Показать";
      btn.setAttribute("aria-label", willReveal ? hideLabel : showLabel);
      syncWrap(wrap);
      if (willReveal) input.focus();
    });

    syncWrap(wrap);
  }

  function bindAll(root = document) {
    for (const wrap of root.querySelectorAll("[data-agent-sensitive]")) {
      bindWrap(wrap);
    }
  }

  function resetAllForPrivacyChange() {
    for (const wrap of document.querySelectorAll("[data-agent-sensitive]")) {
      wrap.classList.remove(REVEAL_CLASS);
      const btn = wrap.querySelector(".agent-sensitive-toggle");
      if (btn) {
        btn.setAttribute("aria-pressed", "false");
        const showLabel = btn.dataset.showLabel || "Показать значение";
        btn.title = "Показать";
        btn.setAttribute("aria-label", showLabel);
      }
      syncWrap(wrap);
    }
  }

  window.addEventListener("agent-cms:privacy-mode-change", resetAllForPrivacyChange);

  window.AgentCmsSensitiveInput = {
    bindAll,
    syncAll: () => {
      for (const wrap of document.querySelectorAll("[data-agent-sensitive]")) syncWrap(wrap);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => bindAll());
  } else {
    bindAll();
  }
})();
