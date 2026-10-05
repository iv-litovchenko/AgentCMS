(function initCompanionCrosshair(global) {
  const STORAGE_KEY = "crosshairRulerEnabled";
  const ROOT_ID = "agent-companion-crosshair";

  let enabled = false;
  let root = null;
  let lineV = null;
  let lineH = null;
  let label = null;
  let rafId = 0;
  let pendingX = 0;
  let pendingY = 0;

  function isBlocked() {
    const html = document.documentElement;
    return (
      html.classList.contains("asc-screenshot-region-active") ||
      html.classList.contains("asc-screenshot-element-active") ||
      html.classList.contains("asc-capturing-viewport") ||
      html.classList.contains("asc-capturing-fullpage")
    );
  }

  function readEnabledSetting() {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([STORAGE_KEY], (stored) => {
          resolve(stored[STORAGE_KEY] === true);
        });
      } catch {
        resolve(false);
      }
    });
  }

  function writeEnabledSetting(on) {
    try {
      chrome.storage.local.set({ [STORAGE_KEY]: Boolean(on) });
    } catch {
      // ignore
    }
  }

  function ensureRoot() {
    if (root) return root;
    root = document.createElement("div");
    root.id = ROOT_ID;
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");

    lineV = document.createElement("div");
    lineV.className = "asc-crosshair-line asc-crosshair-line--v";

    lineH = document.createElement("div");
    lineH.className = "asc-crosshair-line asc-crosshair-line--h";

    label = document.createElement("div");
    label.className = "asc-crosshair-label";

    root.append(lineV, lineH, label);
    document.documentElement.appendChild(root);
    return root;
  }

  function placeLabel(clientX, clientY, pageX, pageY) {
    const pad = 14;
    const w = label.offsetWidth || 88;
    const h = label.offsetHeight || 22;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = clientX + pad;
    let top = clientY + pad;
    if (left + w > vw - 8) left = clientX - w - pad;
    if (top + h > vh - 8) top = clientY - h - pad;
    if (left < 8) left = 8;
    if (top < 8) top = 8;
    label.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    label.textContent = `${Math.round(pageX)}, ${Math.round(pageY)}`;
  }

  function applyPointer(clientX, clientY) {
    if (!lineV || !lineH || !label) return;
    lineV.style.left = `${clientX}px`;
    lineH.style.top = `${clientY}px`;
    const pageX = clientX + (window.scrollX || 0);
    const pageY = clientY + (window.scrollY || 0);
    placeLabel(clientX, clientY, pageX, pageY);
  }

  function flushPointer() {
    rafId = 0;
    if (!enabled || isBlocked()) return;
    ensureRoot();
    root.hidden = false;
    applyPointer(pendingX, pendingY);
  }

  function onPointerMove(event) {
    if (!enabled) return;
    pendingX = event.clientX;
    pendingY = event.clientY;
    if (!rafId) rafId = requestAnimationFrame(flushPointer);
  }

  function syncDom() {
    const on = enabled && !isBlocked();
    document.documentElement.classList.toggle("asc-crosshair-active", on);
    if (!on) {
      if (root) root.hidden = true;
      return;
    }
    ensureRoot();
    root.hidden = false;
    applyPointer(pendingX, pendingY);
  }

  function setEnabled(next) {
    enabled = Boolean(next);
    writeEnabledSetting(enabled);
    syncDom();
  }

  document.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("scroll", () => {
    if (!enabled || isBlocked()) return;
    if (!rafId) rafId = requestAnimationFrame(flushPointer);
  }, { passive: true });
  window.addEventListener("resize", () => {
    if (!enabled || isBlocked()) return;
    flushPointer();
  }, { passive: true });

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[STORAGE_KEY]) return;
      enabled = changes[STORAGE_KEY].newValue === true;
      syncDom();
    });
  } catch {
    // ignore
  }

  const blockObserver = new MutationObserver(() => syncDom());
  blockObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"]
  });

  void readEnabledSetting().then((on) => {
    enabled = on;
    syncDom();
  });

  function createCompanionCrosshairDock() {
    const wrap = document.createElement("div");
    wrap.className = "asc-media-dock-toggle-wrap asc-crosshair-toggle-wrap";
    wrap.title = "Перекрёстие с координатами курсора";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "asc-media-dock-toggle asc-crosshair-toggle";
    btn.setAttribute("role", "switch");
    btn.setAttribute("aria-checked", "false");
    btn.setAttribute("aria-label", "Перекрёстие и координаты — включить или выключить");

    const track = document.createElement("span");
    track.className = "asc-media-dock-toggle-track";
    track.setAttribute("aria-hidden", "true");

    const icon = document.createElement("span");
    icon.className = "asc-media-dock-toggle-icon asc-crosshair-toggle-icon";
    icon.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>';

    const thumb = document.createElement("span");
    thumb.className = "asc-media-dock-toggle-thumb";
    thumb.append(icon);

    track.append(thumb);
    btn.append(track);
    wrap.append(btn);

    function setToggleOn(on) {
      const isOn = Boolean(on);
      btn.classList.toggle("is-on", isOn);
      btn.setAttribute("aria-checked", isOn ? "true" : "false");
      btn.title = isOn
        ? "Перекрёстие: вкл. — нажмите, чтобы выключить"
        : "Перекрёстие: выкл. — нажмите, чтобы включить";
      wrap.title = btn.title;
    }

    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const next = !btn.classList.contains("is-on");
      setToggleOn(next);
      setEnabled(next);
    });

    for (const eventName of ["pointerdown", "mousedown", "dblclick"]) {
      wrap.addEventListener(eventName, (event) => event.stopPropagation());
    }

    void readEnabledSetting().then(setToggleOn);

    return { wrap };
  }

  global.createCompanionCrosshairDock = createCompanionCrosshairDock;
})(globalThis);
