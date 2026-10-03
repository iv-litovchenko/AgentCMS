/**
 * Жёлтая кнопка внизу по центру: открыть src видимого iframe в новой вкладке.
 * Нужна, когда курсор уже внутри cross-origin iframe и hover-панель страницы не срабатывает.
 */
(function initCompanionIframeOpen() {
  "use strict";

  if (document.querySelector('meta[name="agent-cms-voice-app"]')?.content === "1") return;
  if (window.__companionIframeOpen) return;
  window.__companionIframeOpen = true;

  const HOST_ID = "agent-companion-iframe-open";
  const MIN_IFRAME_PX = 64;
  const TOOLBAR_CLEARANCE_PX = 68;

  let hostEl = null;
  let btnEl = null;
  let activeIframe = null;
  let boundIframes = new WeakSet();
  let scanTimer = 0;

  function isBlockedContext() {
    const html = document.documentElement;
    if (html.classList.contains("asc-capturing-viewport")) return true;
    if (html.classList.contains("asc-capturing-fullpage")) return true;
    if (html.classList.contains("asc-screenshot-element-active")) return true;
    if (html.classList.contains("asc-screenshot-region-active")) return true;
    if (html.classList.contains("is-cms-page-picker-active")) return true;
    if (document.body?.classList.contains("is-cms-page-picker-active")) return true;
    return false;
  }

  function resolveAbsoluteUrl(raw) {
    const value = String(raw || "").trim();
    if (!value || value === "about:blank") return "";
    try {
      return new URL(value, location.href).href;
    } catch {
      return "";
    }
  }

  function resolveIframeUrl(iframe) {
    if (!iframe) return "";
    const candidates = [
      iframe.getAttribute("src"),
      iframe.src,
      iframe.getAttribute("data-src"),
      iframe.getAttribute("data-lazy-src")
    ];
    for (const raw of candidates) {
      const url = resolveAbsoluteUrl(raw);
      if (url && !/^about:/i.test(url)) return url;
    }
    return "";
  }

  function isIgnoredIframe(iframe) {
    if (!iframe || iframe.tagName !== "IFRAME") return true;
    if (iframe.closest(`#${HOST_ID}, #agent-companion-media-save, #agent-shell-companion-toolbar`)) return true;
    if (iframe.id === "shell-frame" || iframe.id === "voice-frame") return true;
    return false;
  }

  function getVisualViewportBox() {
    const vv = window.visualViewport;
    if (!vv) {
      return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
    }
    return {
      left: vv.offsetLeft,
      top: vv.offsetTop,
      right: vv.offsetLeft + vv.width,
      bottom: vv.offsetTop + vv.height
    };
  }

  function visibleViewportArea(iframe) {
    if (!iframe?.getBoundingClientRect) return 0;
    const rect = iframe.getBoundingClientRect();
    if (rect.width < MIN_IFRAME_PX || rect.height < MIN_IFRAME_PX) return 0;
    const vp = getVisualViewportBox();
    const left = Math.max(rect.left, vp.left);
    const top = Math.max(rect.top, vp.top);
    const right = Math.min(rect.right, vp.right);
    const bottom = Math.min(rect.bottom, vp.bottom);
    const w = right - left;
    const h = bottom - top;
    if (w < MIN_IFRAME_PX || h < MIN_IFRAME_PX) return 0;
    try {
      const style = getComputedStyle(iframe);
      if (style.display === "none" || style.visibility === "hidden") return 0;
      if (Number.parseFloat(style.opacity) === 0) return 0;
    } catch {
      // ignore
    }
    if (!resolveIframeUrl(iframe)) return 0;
    return w * h;
  }

  function listVisibleIframes() {
    const list = [];
    for (const iframe of document.querySelectorAll("iframe")) {
      if (isIgnoredIframe(iframe)) continue;
      const area = visibleViewportArea(iframe);
      if (area > 0) list.push({ iframe, area });
    }
    list.sort((a, b) => b.area - a.area);
    return list;
  }

  function pickTargetIframe() {
    if (activeIframe?.isConnected && !isIgnoredIframe(activeIframe)) {
      const area = visibleViewportArea(activeIframe);
      if (area > 0) return activeIframe;
      activeIframe = null;
    }
    const visible = listVisibleIframes();
    if (!visible.length) return null;
    return visible[0].iframe;
  }

  function bindIframeHover(iframe) {
    if (!iframe || boundIframes.has(iframe)) return;
    boundIframes.add(iframe);
    iframe.addEventListener(
      "mouseenter",
      () => {
        if (isIgnoredIframe(iframe)) return;
        activeIframe = iframe;
        refreshUi();
      },
      { passive: true }
    );
  }

  function scanIframes() {
    for (const iframe of document.querySelectorAll("iframe")) bindIframeHover(iframe);
    refreshUi();
  }

  function scheduleScan() {
    window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(scanIframes, 120);
  }

  function setVisible(show) {
    if (!hostEl) return;
    if (show) {
      hostEl.dataset.visible = "1";
      hostEl.hidden = false;
    } else {
      delete hostEl.dataset.visible;
      hostEl.hidden = true;
    }
  }

  function refreshUi() {
    if (!hostEl || !btnEl) return;
    if (isBlockedContext()) {
      setVisible(false);
      return;
    }
    const iframe = pickTargetIframe();
    const url = iframe ? resolveIframeUrl(iframe) : "";
    if (!iframe || !url) {
      setVisible(false);
      return;
    }
    btnEl.dataset.url = url;
    btnEl.title = url;
    setVisible(true);
  }

  function openTargetUrl() {
    const url = String(btnEl?.dataset?.url || "").trim();
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function ensureUi() {
    if (hostEl) return;
    hostEl = document.createElement("div");
    hostEl.id = HOST_ID;
    hostEl.hidden = true;

    const shadow = hostEl.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host {
        all: initial;
        position: fixed;
        left: 50%;
        bottom: ${TOOLBAR_CLEARANCE_PX}px;
        transform: translateX(-50%);
        z-index: 2147483645;
        pointer-events: none;
        font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      }
      .btn {
        pointer-events: auto;
        appearance: none;
        -webkit-appearance: none;
        box-sizing: border-box;
        margin: 0;
        border: 1px solid rgba(180, 83, 9, 0.65);
        border-radius: 999px;
        padding: 8px 14px 8px 12px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        font: inherit;
        font-size: 12px;
        font-weight: 600;
        line-height: 1.2;
        letter-spacing: 0.01em;
        color: #422006;
        background: linear-gradient(180deg, #fde047 0%, #facc15 48%, #eab308 100%);
        box-shadow:
          0 10px 28px rgba(120, 53, 15, 0.28),
          inset 0 1px 0 rgba(255, 255, 255, 0.45);
      }
      .btn:hover {
        filter: brightness(1.04);
        border-color: rgba(146, 64, 14, 0.75);
      }
      .btn:focus-visible {
        outline: 2px solid #ca8a04;
        outline-offset: 2px;
      }
      .btn svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
        stroke: currentColor;
        fill: none;
        stroke-width: 1.75;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
    `;

    btnEl = document.createElement("button");
    btnEl.type = "button";
    btnEl.className = "btn";
    btnEl.setAttribute("aria-label", "Открыть iframe в новом окне");
    btnEl.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>' +
      "<span>Открыть iframe в новом окне</span>";

    btnEl.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openTargetUrl();
    });

    shadow.append(style, btnEl);
    (document.body || document.documentElement).append(hostEl);
  }

  function start() {
    ensureUi();
    scanIframes();

    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener("scroll", refreshUi, { passive: true, capture: true });
    window.addEventListener("resize", refreshUi, { passive: true });
    try {
      window.visualViewport?.addEventListener("scroll", refreshUi, { passive: true });
      window.visualViewport?.addEventListener("resize", refreshUi, { passive: true });
    } catch {
      // ignore
    }

    const captureObserver = new MutationObserver(() => {
      if (isBlockedContext()) setVisible(false);
      else refreshUi();
    });
    captureObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    if (document.body) {
      captureObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    }

    document.addEventListener(
      "pointermove",
      (event) => {
        const stack = document.elementsFromPoint(event.clientX, event.clientY);
        for (const node of stack) {
          if (node.tagName === "IFRAME" && !isIgnoredIframe(node)) {
            activeIframe = node;
            break;
          }
        }
        refreshUi();
      },
      { passive: true, capture: true }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
